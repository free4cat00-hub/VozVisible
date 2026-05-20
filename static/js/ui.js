// UI helpers for VozVisible (showLoading, showSuccess, alerts, clock, etc.)
(function(){
  window.apiKey = localStorage.getItem("groq_api_key") || "";

  const SUBTITLES = {
    "cercanias_1": "🚉 Destino: Atocha",
    "cercanias_2": "🚉 Destino: Alcalá de Henares  ▸  Parada: Méndez Álvaro",
    "cercanias_3": "",
    "ave_1": "🚄 Destino: Barcelona  ▸  Vía 2",
    "ave_2": "",
    "ave_3": "🚄 Vía 1",
    "metro_1": "Ⓜ️ Estación: Sol  ▸  Líneas 1 y 3",
    "metro_2": "",
    "metro_3": "",
  };

  async function saveApiKey(){
    const key = document.getElementById('apiKeyInput').value;
    window.apiKey = key;
    localStorage.setItem('groq_api_key', key);
    try{
      const res = await fetch('/api/save-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: key })
      });
      const data = await res.json();
      if (res.ok){ showSuccess('Clave API guardada'); }
      else { showError(data.error || 'Error al guardar la clave'); }
    } catch(err){ showError(err.message); }
    document.getElementById('apiModal').classList.add('hidden');
  }

  function toggleFullscreen(){
    const monitor = document.getElementById('monitorSection');
    if (!document.fullscreenElement){ monitor.requestFullscreen().catch(err=>alert(`Error al intentar pantalla completa: ${err.message}`)); }
    else document.exitFullscreen();
  }

  document.addEventListener('fullscreenchange', ()=>{
    const isFs = !!document.fullscreenElement;
    const fsIcon = document.getElementById('fsIcon'); if (fsIcon) fsIcon.innerText = isFs ? 'fullscreen_exit' : 'fullscreen';
    const monitor = document.getElementById('monitorSection');
    const container = document.getElementById('monitorContainer');
    if (isFs){
      monitor.classList.remove('rounded-xl','border','border-primary/20','max-h-[600px]','p-2','aspect-video');
      monitor.classList.add('h-screen','w-screen','p-0');
      if (container) container.classList.remove('rounded-lg');
    } else {
      monitor.classList.add('rounded-xl','border','border-primary/20','max-h-[600px]','p-2','aspect-video');
      monitor.classList.remove('h-screen','w-screen','p-0');
      if (container) container.classList.add('rounded-lg');
    }
  });

  function switchTab(tab){
    window.activeTab = tab;
    ['cercanias','ave','metro'].forEach(t=>{
      const panel = document.getElementById('panel-'+t);
      if (panel) panel.classList.toggle('hidden', t!==tab);
      const tabBtn = document.getElementById('tab-'+t);
      if (tabBtn) tabBtn.className = (t===tab) ? "tab-active flex items-center gap-3 px-4 py-3 rounded-xl font-headline-md text-sm transition-all w-full text-left" : "tab-inactive flex items-center gap-3 px-4 py-3 rounded-xl font-headline-md text-sm transition-all w-full text-left";
    });
  }

  function showLoading(){
    const ls = document.getElementById('loadingSpinner'); if (ls) ls.classList.remove('hidden');
    const statusDot = document.getElementById('statusDot'); if (statusDot) statusDot.className = 'w-2 h-2 rounded-full bg-tertiary-fixed-dim pulse-dot';
    const statusLabel = document.getElementById('statusLabel'); if (statusLabel){ statusLabel.textContent='PROCESANDO AVISO...'; statusLabel.className='font-label-caps text-label-caps text-tertiary-fixed-dim'; }
    const live = document.getElementById('liveBadge'); if (live) live.classList.add('hidden');
    const subtitle = document.getElementById('subtitleBar'); if (subtitle) subtitle.classList.remove('visible');
    const placeholder = document.getElementById('videoPlaceholder'); if (placeholder) placeholder.classList.remove('hidden');
    const player = document.getElementById('videoPlayer'); if (player) player.classList.add('hidden');
    const phText = document.querySelector('#videoPlaceholder span:last-child'); if (phText) phText.textContent = 'GLOSANDO TEXTO LSE...';
  }

  function showSuccess(texto, videoUrl){
    const ls = document.getElementById('loadingSpinner'); if (ls) ls.classList.add('hidden');
    const monitorText = document.getElementById('monitor-text'); if (monitorText){ monitorText.textContent = (texto||'').toUpperCase(); monitorText.style.color = '#ffba27'; monitorText.style.textShadow = '0 0 10px rgba(255,186,39,0.5)'; }
    const statusDot = document.getElementById('statusDot'); if (statusDot) statusDot.className = 'w-2 h-2 rounded-full bg-error pulse-dot';
    const statusLabel = document.getElementById('statusLabel'); if (statusLabel){ statusLabel.textContent='EMITIENDO EN PANTALLAS'; statusLabel.className='font-label-caps text-label-caps text-error'; }
    const live = document.getElementById('liveBadge'); if (live) live.classList.remove('hidden');
    const fb = document.getElementById('customFeedback'); if (fb) fb.classList.add('hidden');
    const player = document.getElementById('videoPlayer'); if (player){ player.src = (videoUrl||'') + '?t=' + Date.now(); player.classList.remove('hidden'); player.play(); player.playbackRate = 1.4; }
    const placeholder = document.getElementById('videoPlaceholder'); if (placeholder) placeholder.classList.add('hidden');
    const sub = SUBTITLES[window.currentTipo] || '';
    if (sub){ const st = document.getElementById('subtitleText'); if (st) st.textContent = sub; triggerSubtitle(); const playerEl = document.getElementById('videoPlayer'); if (playerEl){ playerEl.removeEventListener('seeked', triggerSubtitle); playerEl.addEventListener('seeked', triggerSubtitle); } }
    else { const subBar = document.getElementById('subtitleBar'); if (subBar) subBar.classList.remove('visible'); const playerEl = document.getElementById('videoPlayer'); if (playerEl) playerEl.removeEventListener('seeked', triggerSubtitle); }
    addToLog(texto);
  }

  let subtitleTimeout=null, subtitleTimeout2=null;
  function triggerSubtitle(){
    const subBar = document.getElementById('subtitleBar'); if (!subBar) return; subBar.classList.remove('visible'); if (subtitleTimeout) clearTimeout(subtitleTimeout); if (subtitleTimeout2) clearTimeout(subtitleTimeout2);
    subtitleTimeout = setTimeout(()=>{ subBar.classList.add('visible'); }, 1500);
    subtitleTimeout2 = setTimeout(()=>{ subBar.classList.remove('visible'); }, 4500);
  }

  function showError(msg){
    const ls = document.getElementById('loadingSpinner'); if (ls) ls.classList.add('hidden');
    const fb = document.getElementById('customFeedback'); if (fb) fb.classList.add('hidden');
    const ph = document.querySelector('#videoPlaceholder span:last-child'); if (ph) ph.textContent = 'SISTEMA LSE EN ESPERA';
    const monitorText = document.getElementById('monitor-text'); if (monitorText){ monitorText.textContent = '⚠ ' + (msg||'').toUpperCase(); monitorText.style.color = '#ffb4ab'; monitorText.style.textShadow = '0 0 10px rgba(255,180,171,0.3)'; }
    const statusDot = document.getElementById('statusDot'); if (statusDot) statusDot.className='w-2 h-2 rounded-full bg-error';
    const statusLabel = document.getElementById('statusLabel'); if (statusLabel){ statusLabel.textContent='ERROR EN SISTEMA'; statusLabel.className='font-label-caps text-label-caps text-error'; }
  }

  function detenerMegafonia(){
    const player = document.getElementById('videoPlayer'); if (player){ player.pause(); player.classList.add('hidden'); }
    const placeholder = document.getElementById('videoPlaceholder'); if (placeholder) placeholder.classList.remove('hidden');
    const phText = document.querySelector('#videoPlaceholder span:last-child'); if (phText) phText.textContent = 'SISTEMA LSE EN ESPERA';
    const live = document.getElementById('liveBadge'); if (live) live.classList.add('hidden');
    const subBar = document.getElementById('subtitleBar'); if (subBar) subBar.classList.remove('visible');
    const monitorText = document.getElementById('monitor-text'); if (monitorText) { monitorText.textContent = 'MEGAFONÍA DETENIDA. SELECCIONE UN AVISO.'; monitorText.style.color=''; monitorText.style.textShadow=''; }
    const statusDot = document.getElementById('statusDot'); if (statusDot) statusDot.className='w-2 h-2 rounded-full bg-outline';
    const statusLabel = document.getElementById('statusLabel'); if (statusLabel) { statusLabel.textContent='SISTEMA EN ESPERA'; statusLabel.className='font-label-caps text-label-caps text-outline'; }
    document.querySelectorAll('.action-card').forEach(c=>c.classList.remove('card-active'));
  }

  function addToLog(texto){
    const log = document.getElementById('emissionLog'); if (!log) return; const now = new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    const entry = document.createElement('div'); entry.className='flex items-center gap-3 text-xs bg-surface-container-lowest/50 rounded-lg px-3 py-2';
    entry.innerHTML = `<span class="w-2 h-2 rounded-full bg-primary-container flex-shrink-0"></span><span class="font-data-point text-xs text-primary-container flex-shrink-0">${now}</span><span class="text-on-surface truncate flex-1">${texto}</span><span class="font-label-caps text-label-caps text-primary-container/60 flex-shrink-0">EMITIDO</span>`;
    if (log.children.length === 1 && log.children[0].textContent.includes('Sin emisiones')) log.innerHTML='';
    log.prepend(entry); while (log.children.length>5) log.removeChild(log.lastChild);
  }

  async function loadAlerts(){
    try{
      const res = await fetch('/api/alerts'); const data = await res.json(); const list = document.getElementById('alertsList');
      const madridAlerts = (data.alerts||[]).filter(a=>a.es_madrid);
      const badge = document.getElementById('alertBadge'); if (badge) badge.textContent = madridAlerts.length;
      const pulse = document.getElementById('alertPulse'); if (pulse) pulse.className = 'w-2 h-2 rounded-full bg-error pulse-dot';
      const ts = data.timestamp ? new Date(parseInt(data.timestamp)*1000) : new Date(); const at = document.getElementById('alertTime'); if (at) at.textContent = ts.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'}) + ' · LIVE';
      if (!madridAlerts || madridAlerts.length===0){ if (list) list.innerHTML = '<div class="text-primary-container/60 text-xs text-center py-3">✅ Sin incidencias activas en Madrid</div>'; return; }
      if (list) list.innerHTML = madridAlerts.slice(0,8).map(a=>`<div class="bg-surface-container-lowest/50 border border-outline-variant/20 rounded-lg px-3 py-2.5 flex gap-3 items-start group hover:border-error/30 transition"><div class="flex-1 min-w-0"><div class="flex items-center gap-1.5 mb-1">${a.lineas.map(l=>`<span class="bg-error/20 text-error text-[10px] font-bold px-1.5 py-0.5 rounded">${l}</span>`).join('')}</div><p class="text-on-surface text-xs font-medium leading-relaxed line-clamp-2 uppercase tracking-wide">${a.texto.slice(0,180)}${a.texto.length>180?'...':''}</p></div><button onclick="emitirAlerta('${(a.texto.replace(/'/g, "\\'")).slice(0,200)}')" class="flex-shrink-0 bg-primary-container/10 hover:bg-primary-container/30 text-primary-container p-1.5 rounded-lg transition opacity-60 group-hover:opacity-100" title="Emitir en LSE"><span class="material-symbols-outlined text-base">sign_language</span></button></div>` ).join('');
    } catch(err){ const list = document.getElementById('alertsList'); if (list) list.innerHTML = '<div class="text-error/60 text-xs text-center py-3">Error de conexión</div>'; }
  }

  // Init
  document.addEventListener('DOMContentLoaded', ()=>{
    const apiEl = document.getElementById('apiKeyInput'); if (apiEl && window.apiKey) apiEl.value = window.apiKey;
    loadAlerts(); setInterval(loadAlerts, 60000);
    function updateTime(){ const now = new Date(); const timeEl = document.getElementById('currentTime'); const dateEl = document.getElementById('currentDate'); if (timeEl) timeEl.textContent = now.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit',second:'2-digit'}); if (dateEl) dateEl.textContent = now.toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'}); }
    updateTime(); setInterval(updateTime, 1000);
    // attach modal buttons directly to ensure clicks always invoke handlers
    const saveBtn = document.getElementById('apiSaveBtn'); if (saveBtn) saveBtn.addEventListener('click', (e)=>{ e.stopPropagation(); saveApiKey(); });
    const closeBtn = document.getElementById('apiCloseBtn'); if (closeBtn) closeBtn.addEventListener('click', (e)=>{ e.stopPropagation(); document.getElementById('apiModal').classList.add('hidden'); });

    // expose saveApiKey and switchTab and toggleFullscreen globally
    window.saveApiKey = saveApiKey; window.switchTab = switchTab; window.toggleFullscreen = toggleFullscreen; window.showLoading = showLoading; window.showSuccess = showSuccess; window.showError = showError; window.addToLog = addToLog; window.detenerMegafonia = detenerMegafonia; window.triggerSubtitle = triggerSubtitle;
  });

  // Also expose immediately to ensure handlers bound via onclick attributes work
  window.saveApiKey = saveApiKey; window.switchTab = switchTab; window.toggleFullscreen = toggleFullscreen; window.showLoading = showLoading; window.showSuccess = showSuccess; window.showError = showError; window.addToLog = addToLog; window.detenerMegafonia = detenerMegafonia; window.triggerSubtitle = triggerSubtitle; window.loadAlerts = loadAlerts;

})();
