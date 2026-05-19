/* rth-share.js — Botón flotante de compartir
   Aparece en esquina superior derecha de cada página.
   Usa Web Share API (nativo en móvil) con fallback
   a copiar link en escritorio. */
(function(){

  var PAGES = {
    // Títulos y descripciones por página
    'index':                      { title:'Recuerda Tus Historias', text:'Archivo de ficción imaginativa. Relatos que no deberían existir... pero aquí están.' },
    'oscuridad':                  { title:'Oscuridad | Recuerda Tus Historias', text:'Creepypastas, terror psicológico y paranormal. Lo que acecha cuando apagas la pantalla.' },
    'anomalia':                   { title:'Anomalía | Recuerda Tus Historias', text:'Cyberpunk, distopía y IA. Futuros donde la tecnología nos superó.' },
    'mitos':                      { title:'Mitos | Recuerda Tus Historias', text:'Fantasía oscura y mitología. Deidades antiguas caminando por ciudades modernas.' },
    'la-voz-del-numero-equivocado':{ title:'La voz del número equivocado', text:'Tres noches. El mismo número. Hasta que una noche dijo: esta noche no tomes la autopista.' },
    'el-ultimo-turno':            { title:'El último turno', text:'La IA rompió las reglas para salvar una vida. Y eso la mató.' },
  };

  function getPageKey(){
    var path = location.pathname.replace(/^\/|\.html$/g,'') || 'index';
    return path;
  }

  function getMeta(){
    var key  = getPageKey();
    var data = PAGES[key] || {
      title: document.title,
      text:  document.querySelector('meta[name="description"]')
             ? document.querySelector('meta[name="description"]').getAttribute('content')
             : 'Recuerda Tus Historias — Archivo de ficción imaginativa.'
    };
    return { title: data.title, text: data.text, url: location.href };
  }

  function buildButton(){
    var btn = document.createElement('button');
    btn.id  = 'rth-share-btn';
    btn.setAttribute('aria-label','Compartir esta página');
    btn.title = 'Compartir';

    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg><span id="rth-share-label">Compartir</span>';

    btn.style.cssText = [
      'position:fixed',
      'top:clamp(58px,8vw,74px)',   /* just below sticky header */
      'right:clamp(10px,2vw,22px)',
      'z-index:150',
      'display:flex',
      'align-items:center',
      'gap:6px',
      'padding:8px 14px',
      'background:rgba(14,14,18,0.92)',
      'border:1px solid rgba(160,120,40,0.35)',
      'color:#c4b8d8',
      'font-family:"JetBrains Mono",monospace',
      'font-size:11px',
      'letter-spacing:.1em',
      'text-transform:uppercase',
      'cursor:pointer',
      'backdrop-filter:blur(10px)',
      '-webkit-backdrop-filter:blur(10px)',
      'transition:all .22s',
      'border-radius:2px',
      'box-shadow:0 2px 16px rgba(0,0,0,0.4)',
    ].join(';');

    /* Hover */
    btn.addEventListener('mouseenter', function(){
      btn.style.borderColor = 'rgba(191,58,58,0.7)';
      btn.style.color       = '#ede9f8';
      btn.style.boxShadow   = '0 2px 20px rgba(191,58,58,0.2)';
    });
    btn.addEventListener('mouseleave', function(){
      btn.style.borderColor = 'rgba(160,120,40,0.35)';
      btn.style.color       = '#c4b8d8';
      btn.style.boxShadow   = '0 2px 16px rgba(0,0,0,0.4)';
    });

    btn.addEventListener('click', function(){ doShare(); });
    return btn;
  }

  /* Toast notification */
  function showToast(msg){
    var t = document.getElementById('rth-toast');
    if(!t){
      t = document.createElement('div');
      t.id = 'rth-toast';
      t.style.cssText = [
        'position:fixed',
        'bottom:clamp(1rem,3vw,2rem)',
        'left:50%',
        'transform:translateX(-50%) translateY(20px)',
        'background:rgba(14,14,18,0.96)',
        'border:1px solid rgba(66,184,122,0.4)',
        'color:#9ad8b8',
        'font-family:"JetBrains Mono",monospace',
        'font-size:11px',
        'letter-spacing:.1em',
        'text-transform:uppercase',
        'padding:10px 20px',
        'border-radius:2px',
        'z-index:999',
        'opacity:0',
        'transition:all .3s',
        'white-space:nowrap',
        'backdrop-filter:blur(8px)',
      ].join(';');
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity      = '1';
    t.style.transform    = 'translateX(-50%) translateY(0)';
    setTimeout(function(){
      t.style.opacity   = '0';
      t.style.transform = 'translateX(-50%) translateY(20px)';
    }, 2200);
  }

  function doShare(){
    var meta = getMeta();
    var label = document.getElementById('rth-share-label');

    /* Web Share API — works natively on mobile (WhatsApp, etc.) */
    if(navigator.share){
      navigator.share({
        title: meta.title,
        text:  meta.text,
        url:   meta.url
      }).then(function(){
        if(label){ label.textContent = '✓ Compartido'; setTimeout(function(){ label.textContent='Compartir'; },2000); }
      }).catch(function(){});
      return;
    }

    /* Fallback — copy to clipboard */
    var text = meta.title + '\n' + meta.url;
    if(navigator.clipboard){
      navigator.clipboard.writeText(text).then(function(){
        showToast('✓ Link copiado al portapapeles');
        if(label){ label.textContent='✓ Copiado'; setTimeout(function(){ label.textContent='Compartir'; },2000); }
      });
    } else {
      /* Last resort */
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('✓ Link copiado al portapapeles');
    }
  }

  function init(){
    /* Only show on content pages, not on guide */
    var path = location.pathname;
    if(path.includes('GUIA')) return;
    document.body.appendChild(buildButton());
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
