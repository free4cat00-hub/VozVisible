import os
import sys
import subprocess
import sqlite3
import time
import glob
from celery import Celery

celery_app = Celery(
    'vozvisible_tasks',
    broker='redis://localhost:6379/1',
    backend='redis://localhost:6379/1'
)

# Celery CLI expects a variable named `celery` or `app` by default — provide alias
celery = celery_app

# Schedule: run cleanup every 12 hours
celery_app.conf.beat_schedule = {
    'cleanup-old-outputs-every-12-hours': {
        'task': 'tasks.cleanup_old_outputs',
        'schedule': 12 * 3600,
    },
}
celery_app.conf.timezone = 'UTC'

def log_emission(texto, output_path):
    conn = sqlite3.connect('logs.db')
    c = conn.cursor()
    c.execute("INSERT INTO emissions (text, output_path) VALUES (?, ?)", (texto, output_path))
    conn.commit()
    conn.close()


@celery_app.task
def cleanup_old_outputs():
    """Delete mp4 files older than 24 hours from assets/output."""
    deleted = 0
    try:
        os.makedirs('assets/output', exist_ok=True)
        files = glob.glob('assets/output/*.mp4')
        now = time.time()
        for f in files:
            try:
                if os.path.getmtime(f) < now - (24 * 3600):
                    os.remove(f)
                    deleted += 1
            except Exception:
                continue
    except Exception:
        pass
    return {'deleted': deleted}

@celery_app.task(bind=True)
def async_generate_video(self, texto, slug, env):
    output_path = f"assets/output/{slug}.mp4"
    os.makedirs("assets/output", exist_ok=True)
    
    if os.path.exists(output_path):
        log_emission(texto, output_path)
        return {"status": "completed", "video_url": f"/{output_path}", "texto": texto, "cached": True}

    # Disable fingerspelling fallback so missing words are skipped but shown in subtitles
    cmd = [sys.executable, "generate_video.py", "--text", texto, "--output", output_path, "--disable-fingerspelling"]

    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True, env=env, timeout=120)
        if os.path.exists(output_path):
            log_emission(texto, output_path)
            return {"status": "completed", "video_url": f"/{output_path}", "texto": texto}
        else:
            return {"status": "failed", "error": "No se pudo generar el video."}
    except subprocess.CalledProcessError as e:
        error_msg = f"Error en generación: {e.stderr}"
        if "not found" in e.stderr or "Exception: No poses" in e.stderr:
            error_msg = "Vocabulario insuficiente: algunas palabras no están en la base de datos LSE."
        return {"status": "failed", "error": error_msg}
    except subprocess.TimeoutExpired:
        return {"status": "failed", "error": "Tiempo de generación excedido."}
