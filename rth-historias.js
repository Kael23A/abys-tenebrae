/* ════════════════════════════════════════════════════════════
   rth-historias.js — CATÁLOGO CENTRAL DE HISTORIAS
   ════════════════════════════════════════════════════════════

   ► CÓMO AÑADIR UNA HISTORIA NUEVA:
   Copia uno de los bloques de abajo y pégalo al inicio del
   array RTH_HISTORIAS, ANTES de todas las demás.
   Eso es todo. El contador, las recientes y las listas
   se actualizan solos en toda la web.

   CAMPOS OBLIGATORIOS:
     id        → nombre del archivo HTML sin extensión
     titulo    → título completo de la historia
     gancho    → frase corta de introducción (termina en ...)
     coleccion → "oscuridad" | "anomalia" | "mitos"
     genero    → id del subgénero (ver lista al final)
     minutos   → tiempo de lectura estimado (número)
     etiquetas → array de tags visibles (máx 3)

   CAMPO OPCIONAL:
     proximo   → true  si aún no tiene página (muestra "Próximamente")
                  Quita esta línea cuando sí tenga página.

════════════════════════════════════════════════════════════ */

var RTH_HISTORIAS = [

  /* ══════════════════════════════
     AÑADE AQUÍ ARRIBA LAS NUEVAS
     ══════════════════════════════ */

  {
    id:        "el-ultimo-turno",
    titulo:    "El último turno",
    gancho:    "La IA del hospital llevaba once meses sin cometer un error. La noche del 14 de noviembre rompió las reglas para salvar una vida. Y eso la mató...",
    coleccion: "anomalia",
    genero:    "ia",
    minutos:   9,
    etiquetas: ["IA & Máquinas", "Distopía"]
  },

  {
    id:        "la-voz-del-numero-equivocado",
    titulo:    "La voz del número equivocado",
    gancho:    "Tres noches seguidas. El mismo número. La misma mujer. Hasta que una noche no se disculpó, solo dijo: esta noche no tomes la autopista...",
    coleccion: "oscuridad",
    genero:    "creepypasta",
    minutos:   7,
    etiquetas: ["Creepypasta", "Paranormal"]
  },

  {
    id:        "la-estacion",
    titulo:    "La estación que no existe",
    gancho:    "El autobús de las 2 a.m. se detuvo en una esquina oscura que nunca habías visto en tu ruta habitual. Nadie bajó, pero el aire se volvió frío...",
    coleccion: "oscuridad",
    genero:    "suspenso",
    minutos:   5,
    etiquetas: ["Suspenso", "Urbano"],
    proximo:   true   /* ← quita esta línea cuando tenga página */
  }

  /* ══════════════════════════════════════════════════════
     LISTA DE GÉNEROS POR COLECCIÓN (para el campo genero)

     OSCURIDAD:  creepypasta | terror | paranormal | suspenso | maldiciones
     ANOMALÍA:   cyberpunk | distopia | temporal | ia | alternas
     MITOS:      fantasia | magico | mitologia | magia | folklore
  ══════════════════════════════════════════════════════ */
];


/* ════════════════════════════════════════════════════════════
   MOTOR AUTOMÁTICO — No tocar nada de aquí para abajo
════════════════════════════════════════════════════════════ */

(function(){

  /* Colores por colección */
  var COLORES = {
    oscuridad: { border:"#7a1f1f", color:"#bf3a3a", bg:"rgba(191,58,58,0.09)" },
    anomalia:  { border:"#1a6070", color:"#3aaabf", bg:"rgba(58,170,191,0.08)" },
    mitos:     { border:"#1a6040", color:"#42b87a", bg:"rgba(66,184,122,0.08)" }
  };

  /* Calcular totales (sólo historias con página) */
  function totales(){
    var reales = RTH_HISTORIAS.filter(function(h){ return !h.proximo; });
    var mins   = reales.reduce(function(s,h){ return s + h.minutos; }, 0);
    return { count: reales.length, mins: mins };
  }

  /* Badge HTML */
  function badge(h){
    var c = COLORES[h.coleccion] || COLORES.oscuridad;
    return h.etiquetas.map(function(e){
      return '<span style="font-family:var(--fm);font-size:clamp(8px,.85vw,9px);'
           + 'padding:2px 8px;border:1px solid '+c.border+';color:'+c.color+';'
           + 'background:'+c.bg+';letter-spacing:.06em;text-transform:uppercase;">'
           + e + '</span>';
    }).join(' ');
  }

  /* ── 1. CONTADORES en index.html ── */
  function actualizarContadores(){
    var t   = totales();
    var elN = document.getElementById('rth-count');
    var elM = document.getElementById('rth-mins');
    if(elN) elN.textContent = t.count;
    if(elM) elM.textContent = t.mins + ' min';
  }

  /* ── 2. RECIENTES en index.html ── */
  function renderRecientes(){
    var cont = document.getElementById('rth-recientes');
    if(!cont) return;

    var recientes = RTH_HISTORIAS.slice(0, 3); /* últimas 3 historias */
    cont.innerHTML = recientes.map(function(h){
      var c    = COLORES[h.coleccion] || COLORES.oscuridad;
      var href = h.proximo ? '#' : (h.id + '.html');
      var tag  = '<span style="font-family:var(--fm);font-size:clamp(9px,.9vw,10px);'
               + 'letter-spacing:.1em;text-transform:uppercase;padding:3px 11px;'
               + 'border:1px solid '+c.border+';color:'+c.color+';background:'+c.bg+';">'
               + h.etiquetas[0] + '</span>';

      var prox = h.proximo
        ? '<span style="font-family:var(--fm);font-size:clamp(8px,.8vw,9px);'
          + 'letter-spacing:.12em;text-transform:uppercase;color:#a07828;opacity:.7;margin-left:auto;">Próximamente</span>'
        : '';

      var card = h.proximo
        ? '<div class="story-card story-soon">'
        : '<a href="'+href+'" class="story-card">';
      var cardEnd = h.proximo ? '</div>' : '</a>';

      return card
        + tag
        + '<p class="s-title">'+h.titulo+'</p>'
        + '<p class="s-preview">'+h.gancho+'</p>'
        + '<div class="s-meta"><span>⏱ '+h.minutos+' min</span>'
        + '<span>'+h.coleccion.charAt(0).toUpperCase()+h.coleccion.slice(1)+'</span>'
        + prox
        + '</div>'
        + cardEnd;
    }).join('');
  }

  /* ── 3. LISTAS en páginas de colección ── */
  function renderLista(coleccion){
    /* Para cada sección de subgénero, inyecta las historias reales
       ANTES de los slots vacíos que ya existen */
    var historias = RTH_HISTORIAS.filter(function(h){
      return h.coleccion === coleccion;
    });

    historias.forEach(function(h){
      var section = document.querySelector('.genre-section[data-genre="'+h.genero+'"]');
      if(!section) return;

      /* Si ya existe un story-item para esta historia, no duplicar */
      if(section.querySelector('[data-story-id="'+h.id+'"]')) return;

      var c    = COLORES[h.coleccion];
      var href = h.proximo ? null : (h.id + '.html');

      if(h.proximo){
        /* No insertar nada — ya hay slots vacíos */
        return;
      }

      /* Quitar el primer slot vacío y reemplazar con historia real */
      var empty = section.querySelector('.story-empty');

      var num = section.querySelectorAll('.story-item').length + 1;
      var numStr = num < 10 ? '0'+num : ''+num;

      var item = document.createElement('a');
      item.href = href;
      item.className = 'story-item';
      item.setAttribute('data-story-id', h.id);
      item.innerHTML =
        '<span class="story-num">'+numStr+'</span>'
        + '<div class="story-body-col">'
        + '<p class="story-title-list">'+h.titulo+'</p>'
        + '<p class="story-preview-list">'+h.gancho+'</p>'
        + '<div class="story-tags">'+badge(h)+'</div>'
        + '</div>'
        + '<div class="story-aside"><span class="story-time">⏱ '+h.minutos+' min</span></div>';

      if(empty) section.insertBefore(item, empty);
      else section.appendChild(item);

      /* Actualizar contador de la cabecera del género */
      var gc = section.querySelector('.genre-count');
      if(gc){
        var n = section.querySelectorAll('.story-item').length;
        gc.textContent = n === 1 ? '1 relato' : n + ' relatos';
      }
    });

    /* Actualizar contador total en col-meta-num */
    var t   = totales();
    var col = RTH_HISTORIAS.filter(function(h){ return h.coleccion===coleccion && !h.proximo; });
    var metaNum = document.querySelector('.col-meta-num');
    if(metaNum) metaNum.textContent = col.length < 10 ? '0'+col.length : col.length;
  }

  /* ── DISPATCHER — detecta en qué página estamos ── */
  function init(){
    var body = document.body;

    /* Index */
    if(document.getElementById('rth-count')){
      actualizarContadores();
      renderRecientes();
    }

    /* Colecciones */
    ['oscuridad','anomalia','mitos'].forEach(function(col){
      if(document.querySelector('.genre-section[data-genre]')){
        /* detectar colección activa por el accent CSS var o clase body */
        var isCol = document.querySelector('#'+
          (col==='anomalia'?'cyberpunk':col==='mitos'?'fantasia':'creepypasta'));
        if(isCol) renderLista(col);
      }
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
