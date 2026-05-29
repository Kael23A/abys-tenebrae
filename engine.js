/**
 * ═══════════════════════════════════════════════════════
 * ABYS TENEBRAE V.2.0 — ENGINE.JS (Final Completo)
 *
 * Incluye:
 * - Navegación SPA sin recarga
 * - Pilares + subgéneros con color por pilar
 * - Algoritmo tendencias (likes×3 + lecturas×1 + comentarios×2)
 * - Tiempo estimado de lectura · Fecha legible
 * - Scroll automático inteligente (prioridad táctil)
 * - Barra de progreso (inicio→fin de historia, antes de comentarios)
 * - Botón encendido lateral
 * - Navegación Anterior/Siguiente (dentro del subgénero, sin repetir)
 * - Modo Luna/Sol (dark/light, variables CSS)
 * - Corazón animado (localStorage, animación fuego)
 * - Biblioteca personal (localStorage, panel Fixed)
 * - Compartir página + historia con modal
 * - Búsqueda en tiempo real
 * - Historia aleatoria
 * - SEO dinámico por historia
 * - Hash routing para enlaces directos
 * - Disqus integrado (abys-tenebrae)
 * ═══════════════════════════════════════════════════════
 */

const AT = (() => {

  // ── Estado ──────────────────────────────────────────
  const S = {
    manifest:        null,
    vista:           'home',
    pilarActivo:     null,
    subgeneroActivo: null,
    historiaActiva:  null,
    historialSub:    [],   // orden de lectura en subgénero actual
    historialIdx:    -1,
    autoScroll:      false,
    autoScrollId:    null,
    scrollVel:       0.7,
    likes:    JSON.parse(localStorage.getItem('at_likes')    || '{}'),
    lecturas: JSON.parse(localStorage.getItem('at_lecturas') || '{}'),
    biblioteca: JSON.parse(localStorage.getItem('at_bib')   || '[]'),
    tema:     localStorage.getItem('at_tema') || 'dark',
    historialVistas: [],  // historial de navegación de páginas
    historialIdx:    -1,  // posición actual en historial de vistas
    _navegandoPorHistorial: false,
    busquedaAbierta: false,
  };

  const $  = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  const COLORES = {
    'identidad':           '#c4a882',
    'ecos-del-vacio':      '#a86060',
    'fronteras-alteradas': '#6a8fa8',
    'legado-de-sombras':   '#c4a882',
    'el-fugitivo':         '#8aab8a',
  };

  // ── INIT ────────────────────────────────────────────
  async function init() {
    aplicarTema(S.tema, false);
    await cargarManifest();
    renderHome();
    initProgressBar();
    initAutoScroll();
    initBtnRetornoTop();
    initNavFlechas();
    initBuscador();
    initBtnAleatorio();
    initShareModal();
    initCompartirPagina();
    initTema();
    initBtnVolverFlotante();
    initPopState();
    initBiblioteca();
    initDisqus();
    bindLogotype();
    checkHash();
  }

  // ── Manifest ────────────────────────────────────────
  async function cargarManifest() {
    try {
      const r = await fetch('./manifest.json?' + Date.now());
      S.manifest = await r.json();
    } catch(e) {
      S.manifest = { meta:{}, pilares:[], historias:[] };
    }
  }

  // ── Helpers ─────────────────────────────────────────
  function puntuacion(h) {
    return (h.likes||0)*3 + (h.lecturas||0) + ((h.comentarios||[]).length)*2;
  }

  function tiempoLectura(texto) {
    const min = Math.ceil(texto.trim().split(/\s+/).length / 700);
    return `~${min} min`;
  }

  function fechaLegible(iso) {
    if (!iso) return '';
    const [y,m,d] = iso.split('-');
    const M = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${parseInt(d)} ${M[parseInt(m)-1]} ${y}`;
  }

  function fmt(n) {
    return n >= 1000 ? (n/1000).toFixed(1).replace('.0','')+'k' : String(n);
  }

  // ── Color activo ────────────────────────────────────
  function setColor(pilarId) {
    const c = COLORES[pilarId] || '#c4a882';
    document.documentElement.style.setProperty('--pilar-activo', c);
    const orb  = $('.encendido-orb');
    const line = $('.encendido-line');
    if (orb)  { orb.style.background  = c; orb.style.boxShadow = `0 0 8px ${c}`; }
    if (line) { line.style.background = `linear-gradient(to bottom, ${c}, transparent)`; }
    const bar = $('#progress-bar');
    if (bar)  bar.style.background = `linear-gradient(90deg, ${c}, ${c}55)`;
  }

  // ── SEO ─────────────────────────────────────────────
  function setSEO({ titulo, descripcion } = {}) {
    const base = 'Abys Tenebrae';
    document.title = titulo ? `${titulo} · ${base}` : base;
    const sm = (sel,attr,val) => {
      let el=$(sel); if(!el){el=document.createElement('meta');document.head.appendChild(el);}
      el.setAttribute(attr,val);
    };
    sm('meta[name="description"]','content', descripcion || 'Donde los límites de la realidad se disuelven en el umbral de lo innombrable.');
    sm('meta[property="og:title"]','content', titulo ? `${titulo} · ${base}` : base);
    sm('meta[property="og:description"]','content', descripcion || '');
    let ogUrl=$('meta[property="og:url"]');
    if(!ogUrl){ogUrl=document.createElement('meta');ogUrl.setAttribute('property','og:url');document.head.appendChild(ogUrl);}
    ogUrl.setAttribute('content',location.href);
  }

  // ── MODO TEMA LUNA/SOL ───────────────────────────────
  function initTema() {
    const btn = $('#btn-tema');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const nuevo = S.tema === 'dark' ? 'light' : 'dark';
      S.tema = nuevo;
      localStorage.setItem('at_tema', nuevo);
      aplicarTema(nuevo, true);
    });
  }

  function aplicarTema(tema, animado) {
    document.documentElement.setAttribute('data-theme', tema);
    // Recargar Disqus con el tema correcto si está activo
    if (animado && window.DISQUS && S.historiaActiva) {
      setTimeout(() => cargarDisqus(S.historiaActiva), 300);
    }
    const icon = $('#tema-icon');
    if (icon) {
      // Usar SVG que respeta el color CSS (no emojis del sistema)
      icon.innerHTML = tema === 'dark'
        ? '<svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M11 9A5 5 0 1 1 5 3a3.5 3.5 0 0 0 6 6z"/></svg>'
        : '<svg viewBox="0 0 14 14" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="7" cy="7" r="2.5"/><line x1="7" y1="1" x2="7" y2="2.5"/><line x1="7" y1="11.5" x2="7" y2="13"/><line x1="1" y1="7" x2="2.5" y2="7"/><line x1="11.5" y1="7" x2="13" y2="7"/><line x1="2.9" y1="2.9" x2="4" y2="4"/><line x1="10" y1="10" x2="11.1" y2="11.1"/><line x1="11.1" y1="2.9" x2="10" y2="4"/><line x1="4" y1="10" x2="2.9" y2="11.1"/></svg>';
    }
    if (animado) mostrarToast(tema === 'dark' ? '◑ Modo noche' : '◐ Modo día');
  }

  // ── RENDER HOME ─────────────────────────────────────
  function renderHome() {
    setVista('home');
    setSEO({});
    setColor('identidad');
    S.pilarActivo = null; S.subgeneroActivo = null;
    ocultarNavFlechas();

    const { pilares, historias } = S.manifest;

    // Stats
    const statsEl = $('#hero-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="hero-stat"><span class="num">${historias.length}</span><span class="lbl">Relatos</span></div>
        <div class="hero-stat"><span class="num">${fmt(historias.reduce((a,h)=>a+(h.lecturas||0),0))}</span><span class="lbl">Lecturas</span></div>
        <div class="hero-stat"><span class="num">${historias.reduce((a,h)=>a+(h.comentarios||[]).length,0)}</span><span class="lbl">Voces</span></div>
      `;
    }

    // Pilares
    const grid = $('#pilares-grid');
    if (grid) {
      grid.innerHTML = pilares.map(p => {
        const n = historias.filter(h=>h.pilar===p.id).length;
        const c = p.color || COLORES[p.id];
        return `
          <button class="pilar-btn" data-pilar="${p.id}">
            <span class="pilar-count">${String(n).padStart(2,'0')}</span>
            <span class="pilar-icono" style="color:${c}">${p.icono}</span>
            <span class="pilar-nombre">${p.nombre}</span>
            <span class="pilar-desc">${p.descripcion}</span>
          </button>`;
      }).join('');
      grid.querySelectorAll('.pilar-btn').forEach(b =>
        b.addEventListener('click', () => renderPilar(b.dataset.pilar))
      );
    }

    // Flujo
    const recientes  = [...historias].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)).slice(0,6);
    const tendencias = [...historias].sort((a,b)=>puntuacion(b)-puntuacion(a)).slice(0,6);
    const flujo = $('#zona-flujo');
    if (flujo) {
      flujo.innerHTML = `
        <div class="seccion-label">Últimas Transmisiones</div>
        <div id="lista-rec">${listaHistorias(recientes)}</div>
        <div style="margin-top:3rem">
          <div class="seccion-label">Tendencias</div>
          <div id="lista-tend">${listaHistorias(tendencias)}</div>
        </div>`;
      bindCards($('#lista-rec'));
      bindCards($('#lista-tend'));
    }

    // Pulso
    const pulso = $('#zona-pulso');
    if (pulso) {
      const coms = comentariosTendencia(historias);
      pulso.innerHTML = coms.length
        ? `<div class="seccion-label">El Pulso — Comentarios</div>${coms.map(renderCom).join('')}`
        : `<div class="estado-vacio">El abismo aún no tiene voces.<br><span style="font-size:0.8rem;opacity:0.5">Las primeras palabras están por llegar.</span></div>`;
      pulso.querySelectorAll('.comentario-card').forEach(el =>
        el.addEventListener('click', () => abrirHistoria(el.dataset.id, el.dataset.frag))
      );
    }
  }

  // ── RENDER PILAR ────────────────────────────────────
  function renderPilar(pilarId, subgeneroId=null) {
    setVista('pilar');
    S.pilarActivo = pilarId; S.subgeneroActivo = subgeneroId;
    ocultarNavFlechas();

    const pilar = S.manifest.pilares.find(p=>p.id===pilarId);
    if (!pilar) return;
    const color = pilar.color || COLORES[pilarId];
    setColor(pilarId);
    setSEO({ titulo:pilar.nombre, descripcion:pilar.descripcion });

    const todasPilar = S.manifest.historias.filter(h=>h.pilar===pilarId);
    const filtradas  = subgeneroId ? todasPilar.filter(h=>h.subgenero===subgeneroId) : todasPilar;
    const recientes  = [...filtradas].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
    const tendencias = [...filtradas].sort((a,b)=>puntuacion(b)-puntuacion(a));
    const coms       = comentariosTendencia(filtradas);

    const vista = $('#vista-pilar');
    if (!vista) return;

    vista.innerHTML = `
      <div class="pilar-meta">
        <button class="meta-inicio" id="btn-inicio-pilar">Inicio</button>
      </div>
      <div class="pilar-vista-header anim-bruma">
        <span class="pilar-vista-icono" style="color:${color}">${pilar.icono}</span>
        <div class="pilar-vista-nombre">${pilar.nombre}</div>
        <div class="pilar-vista-desc">${pilar.descripcion}</div>
      </div>
      <div class="subgeneros-chips anim-bruma anim-d1">
        <button class="chip ${!subgeneroId?'active':''}" data-sub=""
          style="${!subgeneroId?`border-color:${color};color:${color}`:''}">
          Todos (${todasPilar.length})</button>
        ${pilar.subgeneros.map(s=>{
          const n=todasPilar.filter(h=>h.subgenero===s.id).length;
          const a=subgeneroId===s.id;
          return `<button class="chip ${a?'active':''}" data-sub="${s.id}"
            style="${a?`border-color:${color};color:${color}`:''}">
            ${s.nombre} (${n})</button>`;
        }).join('')}
      </div>
      <div class="seccion-label anim-bruma anim-d2">
        ${subgeneroId?(pilar.subgeneros.find(s=>s.id===subgeneroId)?.nombre||''):'Todas'} — Recientes
      </div>
      <div id="lista-pilar-rec">${listaHistorias(recientes, color)}</div>
      ${tendencias.length>1?`
        <div style="margin-top:2.5rem">
          <div class="seccion-label">Más valoradas</div>
          <div id="lista-pilar-tend">${listaHistorias(tendencias, color)}</div>
        </div>`:''}
      ${coms.length?`
        <div style="margin-top:2.5rem">
          <div class="seccion-label">Voces de esta colección</div>
          ${coms.map(renderCom).join('')}
        </div>`:''}
    `;


    vista.querySelectorAll('.chip').forEach(c =>
      c.addEventListener('click', () => renderPilar(pilarId, c.dataset.sub||null))
    );
    $('#btn-inicio-pilar')?.addEventListener('click', () => {
      history.replaceState(null,'',location.pathname);
      renderHome();
    });
    [$('#lista-pilar-rec'),$('#lista-pilar-tend')].forEach(el => el && bindCards(el));
    vista.querySelectorAll('.comentario-card').forEach(el =>
      el.addEventListener('click', () => abrirHistoria(el.dataset.id, el.dataset.frag))
    );
  }

  // ── Lista historias ──────────────────────────────────
  function listaHistorias(historias, color) {
    if (!historias.length) return `
      <div class="estado-vacio">Este rincón del abismo aún espera su primera voz.<br>
      <span style="font-size:0.8rem;opacity:0.55">Las sombras permanecen en silencio.</span></div>`;
    return historias.map((h,i) => {
      const pilar = S.manifest.pilares.find(p=>p.id===h.pilar);
      const sub   = pilar?.subgeneros?.find(s=>s.id===h.subgenero);
      const c     = color || pilar?.color || COLORES[h.pilar] || '#c4a882';
      const coms  = (h.comentarios||[]).length;
      return `
        <div class="historia-card anim-bruma anim-d${Math.min(i+1,4)}"
             data-id="${h.id}" style="--pilar-activo:${c}">
          <span class="card-num">${String(i+1).padStart(2,'0')}</span>
          <div class="card-body">
            <div class="card-titulo">${h.titulo}</div>
            <div class="card-desc">${h.descripcion}</div>
            <div class="card-meta">
              ${sub?`<span class="card-tag" style="color:${c};border-color:${c}44">${sub.nombre}</span>`:''}
              <span class="card-stats">
                <span title="Me gusta">◆ ${h.likes||0}</span>
                <span title="Lecturas">◈ ${fmt(h.lecturas||0)}</span>
                ${coms?`<span title="Comentarios">◇ ${coms}</span>`:''}
              </span>
              ${h.tiempo?`<span class="card-tiempo">${h.tiempo}</span>`:''}
              <span class="card-fecha">${fechaLegible(h.fecha)}</span>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  function bindCards(cont) {
    if (!cont) return;
    cont.querySelectorAll('.historia-card').forEach(c =>
      c.addEventListener('click', () => abrirHistoria(c.dataset.id))
    );
  }

  // ── ABRIR HISTORIA ───────────────────────────────────
  async function abrirHistoria(historiaId, fragmentoId=null) {
    const h = S.manifest.historias.find(x=>x.id===historiaId);
    if (!h) return;

    setVista('lectura');
    S.historiaActiva = h;

    const pilar = S.manifest.pilares.find(p=>p.id===h.pilar);
    const sub   = pilar?.subgeneros?.find(s=>s.id===h.subgenero);
    const color = pilar?.color || COLORES[h.pilar] || '#c4a882';

    setColor(h.pilar);
    setSEO({ titulo:h.titulo, descripcion:h.descripcion });
    history.replaceState(null,'',`#${h.id}`);

    // Contar lectura una vez por sesión
    if (!S.lecturas[h.id]) {
      h.lecturas = (h.lecturas||0) + 1;
      S.lecturas[h.id] = true;
      localStorage.setItem('at_lecturas', JSON.stringify(S.lecturas));
    }

    // Preparar historial de navegación (subgénero o pilar completo)
    const grupo = sub
      ? S.manifest.historias.filter(x=>x.pilar===h.pilar&&x.subgenero===h.subgenero)
      : S.manifest.historias.filter(x=>x.pilar===h.pilar);

    // Si no hay historial activo o cambió de grupo, iniciar nuevo shuffle
    const grupoIds = grupo.map(x=>x.id).sort().join(',');
    if (!S.historialSub.length || S.historialSub._grupo !== grupoIds) {
      S.historialSub = shuffleSinRepetir(grupo.map(x=>x.id));
      S.historialSub._grupo = grupoIds;
    }
    S.historialIdx = S.historialSub.indexOf(historiaId);
    if (S.historialIdx === -1) {
      S.historialSub.unshift(historiaId);
      S.historialIdx = 0;
    }

    const cont = $('#lectura-contenido');
    if (!cont) return;

    cont.innerHTML = `<div style="text-align:center;padding:8rem 2rem;color:var(--text-faint);
      font-family:var(--font-mono);font-size:0.56rem;letter-spacing:0.22em">CARGANDO</div>`;

    let cuerpo='', tiempo='';
    try {
      const res = await fetch(h.archivo+'?'+Date.now());
      const html = await res.text();
      const doc  = new DOMParser().parseFromString(html,'text/html');
      cuerpo = doc.body ? doc.body.innerHTML : html;
      tiempo = tiempoLectura(doc.body?.textContent||html);
    } catch(e) {
      cuerpo = `<p><em>${h.descripcion}</em></p><hr>
        <p style="color:var(--text-muted);font-size:0.85rem">
          Archivo no encontrado: <code>${h.archivo}</code>
        </p>`;
    }

    cont.innerHTML = `
      <div id="lectura-meta">
        <button id="btn-inicio-lectura" class="meta-inicio">Inicio</button>
        ${pilar?`<span class="sep">·</span><span style="color:${color}">${pilar.icono} ${pilar.nombre}</span>`:''}
        ${sub?`<span class="sep">›</span><span>${sub.nombre}</span>`:''}
        ${tiempo?`<span class="sep">·</span><span>${tiempo}</span>`:''}
        <span class="sep">·</span>
        <span>◈ ${fmt(h.lecturas||0)} lecturas</span>
        <span class="sep">·</span>
        <span>${fechaLegible(h.fecha)}</span>
      </div>
      <div id="fragmento-top" class="anim-bruma" style="--pilar-activo:${color}">
        ${cuerpo}
      </div>
      <div id="lectura-fin-marcador"></div>
    `;



    if (fragmentoId) {
      setTimeout(()=>{
        const el = document.getElementById(fragmentoId);
        if (el) el.scrollIntoView({behavior:'smooth',block:'center'});
      },500);
    }

    // Bind botón inicio en lectura-meta
    document.addEventListener('click', function _inicioLect(e) {
      if (e.target.closest('#btn-inicio-lectura')) {
        document.removeEventListener('click', _inicioLect);
        detenerAutoScroll(); ocultarNavFlechas();
        history.replaceState(null,'',location.pathname);
        renderHome();
      }
    });
    activarProgressBar();
    cargarDisqus(h);
    mostrarCapaInteraccion(h, color);
    actualizarNavFlechas();
    $('#btn-retorno-top')?.classList.add('visible');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  // ── Shuffle sin repetir ──────────────────────────────
  function shuffleSinRepetir(arr) {
    const a = [...arr];
    for (let i=a.length-1; i>0; i--) {
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  // ── Capa de interacción ──────────────────────────────
  function mostrarCapaInteraccion(h, color) {
    const capa = $('#capa-interaccion');
    if (!capa) return;
    const liked = S.likes[h.id];
    const enBib = S.biblioteca.some(x=>x.id===h.id);
    capa.innerHTML = `
      <button class="btn-accion btn-corazon ${liked?'encendido':''}" id="btn-like"
        style="${liked?`color:var(--pilar-ecos);border-color:rgba(168,96,96,0.35)`:''}" title="Me gusta">
        <span class="heart-icon">${liked?'♥':'♡'}</span> ${h.likes||0}
      </button>
      <button class="btn-accion ${enBib?'liked':''}" id="btn-guardar-bib" title="Guardar en biblioteca">
        ${enBib?'◫ Guardado':'◫ Guardar'}
      </button>
      <button class="btn-accion share-3pts" id="btn-comp-lect"><span class="share-3pts-icon"></span>Compartir</button>
      <div id="nav-historial">
        <button id="btn-volver-flotante" title="Página anterior">Volver</button>
        <button id="btn-avanzar-flotante" title="Página siguiente">Adelante</button>
      </div>
    `;
    capa.classList.add('visible');

    $('#btn-like').addEventListener('click', () => toggleLike(h, color));
    $('#btn-guardar-bib').addEventListener('click', () => toggleBiblioteca(h));
    $('#btn-comp-lect').addEventListener('click', () => abrirShareModal(h.id));

  }

  function ocultarCapaInteraccion() {
    const c=$('#capa-interaccion');
    if(c){c.classList.remove('visible');c.innerHTML='';}
  }

  // ── Like / Corazón ───────────────────────────────────
  function toggleLike(h, color) {
    if (S.likes[h.id]) {
      delete S.likes[h.id];
      h.likes = Math.max(0,(h.likes||1)-1);
      mostrarToast('♡ Desmarcado');
    } else {
      S.likes[h.id] = true;
      h.likes = (h.likes||0)+1;
      mostrarToast('♥ Marcado como favorito');
    }
    localStorage.setItem('at_likes', JSON.stringify(S.likes));
    mostrarCapaInteraccion(h, color);
  }


  // ── Navegación Lineal de Historial ──────────────────
  //    ← va atrás en el historial de vistas visitadas
  //    → va adelante (si hay páginas siguientes)
  //    No buclea entre 2 páginas

  function actualizarBtnVolverFlotante() {
    const btnAtras     = $('#btn-volver-flotante');
    const btnAdelante  = $('#btn-avanzar-flotante');
    if (!btnAtras || !btnAdelante) return;

    // Mostrar en cualquier vista excepto home cuando hay historial
    const tieneAtras    = S.historialIdx > 0;
    const tieneAdelante = S.historialIdx < S.historialVistas.length - 1;
    const noEsHome      = S.vista !== 'home';

    btnAtras.classList.toggle('visible',    noEsHome && tieneAtras);
    btnAdelante.classList.toggle('visible', noEsHome && tieneAdelante);
  }

  function initBtnVolverFlotante() {
    const btnAtras    = $('#btn-volver-flotante');
    const btnAdelante = $('#btn-avanzar-flotante');
    if (!btnAtras) return;

    btnAtras.addEventListener('click', () => {
      if (S.historialIdx <= 0) return;
      S.historialIdx--;
      navegarAEntrada(S.historialVistas[S.historialIdx]);
    });

    btnAdelante?.addEventListener('click', () => {
      if (S.historialIdx >= S.historialVistas.length - 1) return;
      S.historialIdx++;
      navegarAEntrada(S.historialVistas[S.historialIdx]);
    });
  }

  function navegarAEntrada(entrada) {
    if (!entrada) return;
    detenerAutoScroll(); ocultarNavFlechas();
    history.replaceState(null,'',location.pathname);
    S._navegandoPorHistorial = true; // flag para no guardar esta navegación
    if (entrada.vista === 'home') {
      S.pilarActivo = null; S.subgeneroActivo = null;
      renderHome();
    } else if (entrada.vista === 'pilar') {
      renderPilar(entrada.pilar, entrada.sub);
    } else if (entrada.vista === 'lectura' && entrada.historia) {
      abrirHistoria(entrada.historia);
    } else {
      renderHome();
    }
    S._navegandoPorHistorial = false;
  }


  // ── Botón atrás del navegador ──────────────────────
  function initPopState() {
    window.addEventListener('popstate', (e) => {
      // Navegar atrás en el historial interno de la SPA
      if (S.historialVistas.length > 0 && S.historialIdx > 0) {
        S.historialIdx--;
        const prev = S.historialVistas[S.historialIdx];
        S._navegandoPorHistorial = true;
        if (prev.vista === 'home') {
          S.pilarActivo = null; S.subgeneroActivo = null;
          renderHome();
        } else if (prev.vista === 'pilar') {
          renderPilar(prev.pilar, prev.sub);
        } else if (prev.vista === 'lectura' && prev.historia) {
          abrirHistoria(prev.historia);
        }
        S._navegandoPorHistorial = false;
        actualizarBtnVolverFlotante();
      } else {
        // Si no hay historial, ir al home sin salir
        history.pushState(null, '');
        renderHome();
      }
    });
  }

  // ── Biblioteca ───────────────────────────────────────
  function initBiblioteca() {
    actualizarBadgeBib();
    $('#btn-biblioteca')?.addEventListener('click', togglePanelBib);
    $('#btn-cerrar-bib')?.addEventListener('click', () => {
      $('#panel-biblioteca')?.classList.remove('visible');
    });
    document.addEventListener('click', e => {
      const panel = $('#panel-biblioteca');
      const btn   = $('#btn-biblioteca');
      if (!panel?.contains(e.target) && !btn?.contains(e.target)) {
        panel?.classList.remove('visible');
      }
    });
  }

  function toggleBiblioteca(h) {
    const idx = S.biblioteca.findIndex(x=>x.id===h.id);
    if (idx !== -1) {
      S.biblioteca.splice(idx,1);
      mostrarToast('◫ Eliminado de tu biblioteca');
    } else {
      S.biblioteca.push({ id:h.id, titulo:h.titulo, pilar:h.pilar, subgenero:h.subgenero });
      mostrarToast('◫ Guardado en tu biblioteca');
    }
    localStorage.setItem('at_bib', JSON.stringify(S.biblioteca));
    actualizarBadgeBib();
    mostrarCapaInteraccion(h, COLORES[h.pilar]||'#c4a882');
  }

  function actualizarBadgeBib() {
    const badge = $('#bib-badge');
    if (!badge) return;
    const n = S.biblioteca.length;
    badge.textContent = n;
    badge.classList.toggle('visible', n > 0);
  }

  function togglePanelBib() {
    const panel = $('#panel-biblioteca');
    if (!panel) return;
    const visible = panel.classList.toggle('visible');
    if (visible) renderPanelBib();
  }

  function renderPanelBib() {
    const lista = $('#bib-lista');
    if (!lista) return;
    if (!S.biblioteca.length) {
      lista.innerHTML = `<div class="bib-vacio">Tu biblioteca está vacía.<br>
        <span style="font-size:0.78rem">Guarda historias con el botón ◫ mientras lees.</span></div>`;
      return;
    }
    lista.innerHTML = S.biblioteca.map(item => {
      const pilar = S.manifest?.pilares.find(p=>p.id===item.pilar);
      const sub   = pilar?.subgeneros?.find(s=>s.id===item.subgenero);
      const color = pilar?.color || COLORES[item.pilar] || '#c4a882';
      return `
        <div class="bib-item" data-id="${item.id}">
          <button class="bib-item-remove" data-id="${item.id}" title="Eliminar">✕</button>
          <span class="bib-item-titulo">${item.titulo}</span>
          <span class="bib-item-sub" style="color:${color}">
            ${pilar?.icono||'◈'} ${sub?.nombre||pilar?.nombre||''}
          </span>
        </div>`;
    }).join('');

    lista.querySelectorAll('.bib-item').forEach(el => {
      el.addEventListener('click', e => {
        if (e.target.closest('.bib-item-remove')) return;
        $('#panel-biblioteca').classList.remove('visible');
        abrirHistoria(el.dataset.id);
      });
    });
    lista.querySelectorAll('.bib-item-remove').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const idx = S.biblioteca.findIndex(x=>x.id===id);
        if (idx !== -1) { S.biblioteca.splice(idx,1); }
        localStorage.setItem('at_bib', JSON.stringify(S.biblioteca));
        actualizarBadgeBib();
        renderPanelBib();
      });
    });
  }

  // ── Navegación Anterior/Siguiente ────────────────────
  function initNavFlechas() {
    $('#nav-anterior')?.addEventListener('click', () => navegarHistoria(-1));
    $('#nav-siguiente')?.addEventListener('click', () => navegarHistoria(1));
  }

  function navegarHistoria(dir) {
    if (!S.historialSub.length) return;
    let nuevoIdx = S.historialIdx + dir;
    // Si llegó al final, reinicia shuffle
    if (nuevoIdx >= S.historialSub.length) {
      S.historialSub = shuffleSinRepetir(S.historialSub);
      nuevoIdx = 0;
    }
    if (nuevoIdx < 0) nuevoIdx = S.historialSub.length - 1;
    S.historialIdx = nuevoIdx;
    const id = S.historialSub[nuevoIdx];
    if (id) abrirHistoria(id);
  }

  function actualizarNavFlechas() {
    const prev = $('#nav-anterior');
    const next = $('#nav-siguiente');
    const mostrar = S.historialSub.length > 1;
    prev?.classList.toggle('visible', mostrar);
    next?.classList.toggle('visible', mostrar);
  }

  function ocultarNavFlechas() {
    $('#nav-anterior')?.classList.remove('visible');
    $('#nav-siguiente')?.classList.remove('visible');
  }

  // ── Compartir página ─────────────────────────────────
  function initCompartirPagina() {
    const url  = location.origin + location.pathname;
    const desc = 'Abys Tenebrae — Donde los límites de la realidad se disuelven en el umbral de lo innombrable.';
    const handler = () => {
      if (navigator.share) {
        navigator.share({title:'Abys Tenebrae', text:desc, url});
      } else {
        navigator.clipboard.writeText(url).then(()=>mostrarToast('↗ Enlace copiado'));
      }
    };
    $('#btn-compartir-pagina')?.addEventListener('click', handler);
    document.addEventListener('click', e => {
      if (e.target.closest('#btn-compartir-footer')) handler();
    });
  }

  // ── Modal compartir historia ─────────────────────────
  function initShareModal() {
    $('#share-modal')?.addEventListener('click', e => {
      if (e.target === $('#share-modal')) cerrarShareModal();
    });
  }

  function abrirShareModal(historiaId) {
    const h = S.manifest.historias.find(x=>x.id===historiaId);
    if (!h) return;
    const pilar = S.manifest.pilares.find(p=>p.id===h.pilar);
    const color = pilar?.color || COLORES[h.pilar] || '#c4a882';
    const url   = `${location.origin}${location.pathname}#${h.id}`;
    const card  = $('#share-card');
    if (!card) return;
    card.innerHTML = `
      <div class="share-thumbnail"
        style="background:radial-gradient(ellipse at center,${color}18 0%,var(--card) 70%)">
        <div class="share-thumb-icono" style="color:${color}">${pilar?.icono||'◈'}</div>
        <div class="share-thumb-titulo">${h.titulo}</div>
        <div class="share-thumb-sitio">Abys Tenebrae</div>
      </div>
      <div class="share-body">
        <div class="share-url">${url}</div>
        <div class="share-btns">
          <button class="btn-accion" id="btn-copiar">⧉ Copiar enlace</button>
          ${navigator.share?`<button class="btn-accion primary" id="btn-share-nat">↗ Compartir</button>`:''}
        </div>
        <button class="btn-cerrar-modal">Cerrar</button>
      </div>`;
    $('#share-modal').classList.add('visible');
    $('#btn-copiar').addEventListener('click',()=>{
      navigator.clipboard.writeText(url).then(()=>{mostrarToast('↗ Enlace copiado');cerrarShareModal();});
    });
    $('#btn-share-nat')?.addEventListener('click',()=>{
      navigator.share({title:h.titulo,text:h.descripcion,url});
    });
    card.querySelector('.btn-cerrar-modal').addEventListener('click',cerrarShareModal);
  }

  function cerrarShareModal() { $('#share-modal')?.classList.remove('visible'); }

  // ── Comentarios tendencia ────────────────────────────
  function comentariosTendencia(historias) {
    const todos=[];
    historias.forEach(h=>{
      (h.comentarios||[]).forEach(c=>{
        const p=S.manifest.pilares.find(x=>x.id===h.pilar);
        const s=p?.subgeneros?.find(x=>x.id===h.subgenero);
        todos.push({...c, historiaId:h.id, historiaTitulo:h.titulo,
          pilarNombre:p?.nombre||'', pilarColor:p?.color||COLORES[h.pilar]||'#c4a882',
          subgeneroNombre:s?.nombre||''});
      });
    });
    return todos.sort((a,b)=>b.likes-a.likes).slice(0,6);
  }

  function renderCom(c) {
    return `
      <div class="comentario-card" data-id="${c.historiaId}" data-frag="${c.fragmento_id||''}"
           style="--pilar-activo:${c.pilarColor}">
        <div class="com-ruta">
          <span style="color:${c.pilarColor}">${c.pilarNombre}</span>
          <span class="sep">›</span><span>${c.subgeneroNombre}</span>
          <span class="sep">›</span><span class="activo">${c.historiaTitulo}</span>
        </div>
        <div class="com-texto">"${c.texto}"</div>
        <div class="com-footer">
          <span class="com-autor">— ${c.autor}</span>
          <span class="com-likes">◆ ${c.likes}</span>
        </div>
      </div>`;
  }

  // ── Gestión de vistas ────────────────────────────────
  function setVista(vista) {
    // Guardar vista en historial lineal (no guardar si estamos navegando por historial)
    if (S.vista && S.vista !== vista && !S._navegandoPorHistorial) {
      // Truncar historial futuro al navegar hacia nueva página
      S.historialVistas = S.historialVistas.slice(0, S.historialIdx + 1);
      S.historialVistas.push({ vista: S.vista, pilar: S.pilarActivo, sub: S.subgeneroActivo, historia: S.historiaActiva?.id });
      if (S.historialVistas.length > 20) S.historialVistas.shift();
      S.historialIdx = S.historialVistas.length - 1;
      // pushState para que el botón atrás del navegador funcione dentro de la SPA
      if (vista !== 'home') {
        history.pushState({ vista, pilar: S.pilarActivo, sub: S.subgeneroActivo }, '');
      }
    }
    S.vista = vista;
    actualizarBtnVolverFlotante();
    ['#vista-home','#vista-pilar','#vista-lectura'].forEach(s=>$(s)?.classList.remove('visible'));
    ocultarCapaInteraccion();
    limpiarDisqus();
    desactivarProgressBar();
    $('#btn-retorno-top')?.classList.remove('visible');
    detenerAutoScroll();
    window.scrollTo({top:0});
    const map={home:'#vista-home',pilar:'#vista-pilar',lectura:'#vista-lectura'};
    $(map[vista])?.classList.add('visible');
  }

  // ── Barra de progreso ────────────────────────────────
  function initProgressBar() {
    window.addEventListener('scroll', () => {
      if (S.vista !== 'lectura') return;
      const fin = document.getElementById('lectura-fin-marcador');
      if (!fin) return;
      const top    = window.scrollY;
      const inicio = document.getElementById('fragmento-top')?.offsetTop || 0;
      const finY   = fin.offsetTop;
      const rango  = finY - inicio;
      const avance = Math.max(0, top - inicio);
      const pct    = rango > 0 ? Math.min((avance/rango)*100, 100) : 0;
      const bar = $('#progress-bar');
      if (bar) bar.style.width = pct + '%';
    }, {passive:true});
  }
  function activarProgressBar()    { $('#progress-bar')?.classList.add('visible'); }
  function desactivarProgressBar() {
    const b=$('#progress-bar'); if(b){b.classList.remove('visible');b.style.width='0%';}
  }

  // ── Auto Scroll ──────────────────────────────────────
  function initAutoScroll() {
    document.addEventListener('click', e => {
      if (S.vista !== 'lectura') return;
      if (e.target.closest('button,a,#capa-interaccion,.nav-flecha,#btn-biblioteca,#panel-biblioteca,#btn-volver-flotante,#btn-avanzar-flotante,#btn-retorno-top,.bib-item,.bib-item-remove,#btn-tema,#btn-buscar,#btn-aleatorio,#btn-compartir-pagina,#autoscroll-indicator,#nav-historial')) return;
      toggleAutoScroll();
    });
    let ty=0, timer=null;
    document.addEventListener('touchstart',e=>{ty=e.touches[0].clientY;},{passive:true});
    document.addEventListener('touchmove',e=>{
      if(!S.autoScroll)return;
      if(Math.abs(e.touches[0].clientY-ty)>8) pausarScroll();
    },{passive:true});
    document.addEventListener('touchend',()=>{
      if(!S.autoScroll)return;
      clearTimeout(timer);
      timer=setTimeout(()=>{if(S.autoScroll)ejecutarScroll();},1800);
    },{passive:true});
    let wt=null;
    document.addEventListener('wheel',()=>{
      if(!S.autoScroll)return;
      pausarScroll();
      clearTimeout(wt);
      wt=setTimeout(()=>{if(S.autoScroll)ejecutarScroll();},2200);
    },{passive:true});
    $('#autoscroll-indicator')?.addEventListener('click',toggleAutoScroll);
  }

  function toggleAutoScroll() {
    S.autoScroll = !S.autoScroll;
    const ind = $('#autoscroll-indicator');
    if (S.autoScroll) {
      ind?.classList.add('active');
      ejecutarScroll();
      mostrarToast('↓ Auto scroll · Toca para pausar');
    } else {
      ind?.classList.remove('active');
      cancelAnimationFrame(S.autoScrollId);
      mostrarToast('■ Pausado');
    }
  }

  function ejecutarScroll() {
    cancelAnimationFrame(S.autoScrollId);
    const frame = () => {
      if (!S.autoScroll) return;
      window.scrollBy(0, S.scrollVel);
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 5) {
        detenerAutoScroll(); mostrarToast('◉ Fin del relato'); return;
      }
      S.autoScrollId = requestAnimationFrame(frame);
    };
    S.autoScrollId = requestAnimationFrame(frame);
  }

  function pausarScroll()  { cancelAnimationFrame(S.autoScrollId); }
  function detenerAutoScroll() {
    S.autoScroll = false; cancelAnimationFrame(S.autoScrollId);
    $('#autoscroll-indicator')?.classList.remove('active');
  }

  // ── Retorno Top ──────────────────────────────────────
  function initBtnRetornoTop() {
    $('#btn-retorno-top')?.addEventListener('click',()=>
      window.scrollTo({top:0,behavior:'smooth'})
    );
  }

  // ── Buscador ─────────────────────────────────────────
  function initBuscador() {
    const btnB=$('#btn-buscar'), wrap=$('#buscador-wrap'), input=$('#buscador-input');
    if (!btnB||!wrap||!input) return;
    btnB.addEventListener('click',()=>{
      S.busquedaAbierta=!S.busquedaAbierta;
      wrap.classList.toggle('visible',S.busquedaAbierta);
      if(S.busquedaAbierta)input.focus();
      else{input.value='';if(S.vista==='home')renderHome();}
    });
    input.addEventListener('input',()=>{
      const q=input.value.trim().toLowerCase();
      if(!q){renderHome();return;}
      buscar(q);
    });
    document.addEventListener('keydown',e=>{
      if(e.key==='Escape'&&S.busquedaAbierta){
        S.busquedaAbierta=false;
        wrap.classList.remove('visible');
        input.value='';
        if(S.vista==='home')renderHome();
      }
    });
  }

  function buscar(q) {
    const res = S.manifest.historias.filter(h=>
      h.titulo.toLowerCase().includes(q)||h.descripcion.toLowerCase().includes(q)||
      h.subgenero.toLowerCase().includes(q)||h.pilar.toLowerCase().includes(q)
    );
    if(S.vista!=='home')setVista('home');
    const flujo=$('#zona-flujo');
    if(!flujo)return;
    const hl=t=>t.replace(new RegExp(q,'gi'),m=>`<mark class="highlight">${m}</mark>`);
    flujo.innerHTML=`
      <div class="seccion-label">Resultados — ${res.length} encontrado${res.length!==1?'s':''}</div>
      <div id="lista-busq">${listaHistorias(res.map(h=>({...h,titulo:hl(h.titulo)})))}</div>`;
    const pulso=$('#zona-pulso');if(pulso)pulso.innerHTML='';
    bindCards($('#lista-busq'));
  }

  // ── Aleatorio ────────────────────────────────────────
  function initBtnAleatorio() {
    $('#btn-aleatorio')?.addEventListener('click',()=>{
      const hs=S.manifest.historias;
      if(!hs.length)return;
      mostrarToast('◌ Adentrándose en el abismo...');
      setTimeout(()=>abrirHistoria(hs[Math.floor(Math.random()*hs.length)].id),380);
    });
  }

  // ── Logotype ─────────────────────────────────────────
  function bindLogotype() {
    $('#logotype')?.addEventListener('click',()=>{
      history.replaceState(null,'',location.pathname);
      renderHome();
    });

  }

  // ── Hash routing ─────────────────────────────────────
  function checkHash() {
    const id=location.hash.slice(1);
    if(!id||!S.manifest)return;
    const h=S.manifest.historias.find(x=>x.id===id);
    if(h)abrirHistoria(id);
  }

  // ── Disqus ───────────────────────────────────────────
  const DISQUS_SHORTNAME = 'abys-tenebrae';
  function initDisqus() {
    if(document.getElementById('disqus-script'))return;
    window.disqus_config=function(){};
    const s=document.createElement('script');
    s.id='disqus-script';
    s.src='https://'+DISQUS_SHORTNAME+'.disqus.com/embed.js';
    s.setAttribute('data-timestamp',Date.now());
    s.async=true;
    document.head.appendChild(s);
  }
  function cargarDisqus(h) {
    let wrap=document.getElementById('disqus-section');
    if(!wrap){
      wrap=document.createElement('div');
      wrap.id='disqus-section';
      wrap.innerHTML='<div id="disqus-divider"></div><div id="disqus_thread"></div>';
      const cont=$('#lectura-contenido');
      if(cont)cont.appendChild(wrap);
    }
    const url=location.origin+location.pathname+'#'+h.id;
    if(window.DISQUS){
      window.DISQUS.reset({reload:true,config:function(){
        this.page.url=url;
        this.page.identifier='historia-'+h.id;
        this.page.title=h.titulo;
      }});
    } else {
      window.disqus_config=function(){
        this.page.url=url;
        this.page.identifier='historia-'+h.id;
        this.page.title=h.titulo;
      };
    }
  }
  function limpiarDisqus() {
    document.getElementById('disqus-section')?.remove();
  }

  // ── Toast ────────────────────────────────────────────
  let toastTimer=null;
  function mostrarToast(msg) {
    const t=$('#toast');if(!t)return;
    t.textContent=msg;t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>t.classList.remove('show'),2400);
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', ()=> AT.init());
