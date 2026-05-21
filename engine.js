/**
 * ═══════════════════════════════════════════════════════
 * ABYS TENEBRAE V.2.0 — ENGINE.JS
 * El Cerebro: Motor Central Definitivo
 *
 * Funciones:
 * - Navegación SPA sin recarga
 * - Pilares + subgéneros filtrables con color por pilar
 * - Algoritmo de tendencias (likes×3 + lecturas×1 + comentarios×2)
 * - Tiempo estimado de lectura
 * - Scroll automático inteligente (prioridad táctil)
 * - Barra de progreso de lectura
 * - Botón de encendido (retorno top lateral)
 * - Capa de interacción: likes, compartir, volver
 * - Modal de compartir con miniatura CSS
 * - Historia aleatoria
 * - Búsqueda en tiempo real
 * - SEO dinámico por historia
 * - Comentarios con etiqueta [Pilar › Subgénero › Historia]
 * - Contador de lecturas visible
 * - Estado elegante para secciones vacías
 * - Hash routing para enlaces directos
 * ═══════════════════════════════════════════════════════
 */

const AT = (() => {

  // ─── Estado Global ──────────────────────────────────────────────
  const S = {
    manifest:        null,
    vista:           'home',
    pilarActivo:     null,
    subgeneroActivo: null,
    historiaActiva:  null,
    autoScroll:      false,
    autoScrollId:    null,
    scrollVel:       0.7,
    likes:           JSON.parse(localStorage.getItem('at_likes') || '{}'),
    lecturas:        JSON.parse(localStorage.getItem('at_lecturas') || '{}'),
    busquedaAbierta: false,
  };

  // ─── Helpers DOM ────────────────────────────────────────────────
  const $  = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);

  // ─── Colores por pilar ──────────────────────────────────────────
  const COLORES = {
    'ecos-del-vacio':      '#7ecfc0',
    'fronteras-alteradas': '#9b8ec4',
    'legado-de-sombras':   '#c4a882',
    'el-fugitivo':         '#8aab8a',
  };

  // ─── INIT ───────────────────────────────────────────────────────
  async function init() {
    await cargarManifest();
    renderHome();
    initProgressBar();
    initAutoScroll();
    initBtnRetornoTop();
    initBuscador();
    initBtnAleatorio();
    initShareModal();
    bindLogotype();
    checkHash();
  }

  // ─── Manifest ───────────────────────────────────────────────────
  async function cargarManifest() {
    try {
      const r = await fetch('./manifest.json?' + Date.now());
      S.manifest = await r.json();
    } catch(e) {
      console.error('[AT] manifest.json no encontrado:', e);
      S.manifest = { meta:{}, pilares:[], historias:[] };
    }
  }

  // ─── Algoritmo de tendencias ────────────────────────────────────
  function puntuacion(h) {
    const comentarios = (h.comentarios || []).length;
    return (h.likes || 0) * 3 + (h.lecturas || 0) * 1 + comentarios * 2;
  }

  // ─── Tiempo estimado de lectura ─────────────────────────────────
  // Se calcula al cargar el .html de la historia (700 palabras/min)
  function tiempoLectura(texto) {
    const palabras = texto.trim().split(/\s+/).length;
    const min = Math.ceil(palabras / 700);
    if (min < 5)  return `Relato corto · ~${min} min`;
    if (min < 15) return `Relato medio · ~${min} min`;
    return `Relato largo · ~${min} min`;
  }

  // Estimación rápida desde descripción (para cards sin cargar html)
  function tiempoEstimado(h) {
    // Marcador opcional en manifest: "tiempo": "~8 min"
    return h.tiempo || null;
  }

  // ─── Color activo CSS ───────────────────────────────────────────
  function setColor(pilarId) {
    const color = COLORES[pilarId] || COLORES['ecos-del-vacio'];
    document.documentElement.style.setProperty('--pilar-activo', color);
    // Actualizar orbe y barra de progreso
    const orb = $('.encendido-orb');
    const line = $('.encendido-line');
    if (orb)  { orb.style.background  = color; orb.style.boxShadow = `0 0 8px ${color}`; }
    if (line) { line.style.background = `linear-gradient(to bottom, ${color}, transparent)`; }
    const bar = $('#progress-bar');
    if (bar)  bar.style.background = `linear-gradient(90deg, ${color}, ${color}88)`;
  }

  // ─── SEO Dinámico ───────────────────────────────────────────────
  function setSEO({ titulo, descripcion, pilar } = {}) {
    const base = 'Abys Tenebrae';
    document.title = titulo ? `${titulo} · ${base}` : base;
    let meta = $('meta[name="description"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'description'; document.head.appendChild(meta); }
    meta.content = descripcion || 'Portal de narrativa oscura y literatura de penumbra';
    // OG
    setOG('og:title',       titulo ? `${titulo} · ${base}` : base);
    setOG('og:description', descripcion || '');
  }
  function setOG(prop, content) {
    let el = $(`meta[property="${prop}"]`);
    if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el); }
    el.setAttribute('content', content);
  }

  // ─── RENDER HOME ────────────────────────────────────────────────
  function renderHome() {
    setVista('home');
    setSEO({});
    setColor('ecos-del-vacio');
    S.pilarActivo    = null;
    S.subgeneroActivo = null;

    const { pilares, historias, meta } = S.manifest;

    // Stats globales del hero
    const totalHistorias   = historias.length;
    const totalLecturas    = historias.reduce((a, h) => a + (h.lecturas || 0), 0);
    const totalComentarios = historias.reduce((a, h) => a + (h.comentarios || []).length, 0);

    const statsEl = $('#hero-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="hero-stat"><span class="num">${totalHistorias}</span><span class="lbl">Relatos</span></div>
        <div class="hero-stat"><span class="num">${formatNum(totalLecturas)}</span><span class="lbl">Lecturas</span></div>
        <div class="hero-stat"><span class="num">${totalComentarios}</span><span class="lbl">Voces</span></div>
      `;
    }

    // Pilares
    const grid = $('#pilares-grid');
    if (grid) {
      grid.innerHTML = pilares.map(p => {
        const count = historias.filter(h => h.pilar === p.id).length;
        return `
          <button class="pilar-btn" data-pilar="${p.id}" style="--pilar-color:${p.color || COLORES[p.id]}">
            <span class="pilar-count">${String(count).padStart(2,'0')}</span>
            <span class="pilar-icono" style="color:${p.color || COLORES[p.id]}">${p.icono}</span>
            <span class="pilar-nombre">${p.nombre}</span>
            <span class="pilar-desc">${p.descripcion}</span>
          </button>
        `;
      }).join('');
      grid.querySelectorAll('.pilar-btn').forEach(btn =>
        btn.addEventListener('click', () => renderPilar(btn.dataset.pilar))
      );
    }

    // Últimas transmisiones (cronológico)
    const recientes = [...historias]
      .sort((a,b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 6);

    // Tendencias (algoritmo)
    const tendencias = [...historias]
      .sort((a,b) => puntuacion(b) - puntuacion(a))
      .slice(0, 6);

    const flujo = $('#zona-flujo');
    if (flujo) {
      flujo.innerHTML = `
        <div class="seccion-label">Últimas Transmisiones</div>
        <div id="lista-recientes">${renderListaHistorias(recientes)}</div>
        <div style="margin:3.5rem 0 2rem">
          <div class="seccion-label">Tendencias</div>
          <div id="lista-tendencias">${renderListaHistorias(tendencias)}</div>
        </div>
      `;
      bindCards($('#lista-recientes'));
      bindCards($('#lista-tendencias'));
    }

    // Pulso: comentarios en tendencia
    const pulso = $('#zona-pulso');
    if (pulso) {
      const coms = obtenerComentariosTendencia(historias);
      pulso.innerHTML = coms.length
        ? `<div class="seccion-label">El Pulso — Comentarios</div>${coms.map(renderComentario).join('')}`
        : `<div class="estado-vacio">Aún no hay voces en el abismo.<br><span style="font-size:0.8rem">Sé el primero en dejar una marca.</span></div>`;
      pulso.querySelectorAll('.comentario-card').forEach(el =>
        el.addEventListener('click', () => abrirHistoria(el.dataset.id, el.dataset.frag))
      );
    }
  }

  // ─── RENDER PILAR ───────────────────────────────────────────────
  function renderPilar(pilarId, subgeneroId = null) {
    setVista('pilar');
    S.pilarActivo     = pilarId;
    S.subgeneroActivo = subgeneroId;

    const pilar = S.manifest.pilares.find(p => p.id === pilarId);
    if (!pilar) return;

    const color = pilar.color || COLORES[pilarId];
    setColor(pilarId);
    setSEO({ titulo: pilar.nombre, descripcion: pilar.descripcion });

    const todasDelPilar = S.manifest.historias.filter(h => h.pilar === pilarId);
    const filtradas = subgeneroId
      ? todasDelPilar.filter(h => h.subgenero === subgeneroId)
      : todasDelPilar;

    const recientes   = [...filtradas].sort((a,b) => new Date(b.fecha) - new Date(a.fecha));
    const tendencias  = [...filtradas].sort((a,b) => puntuacion(b) - puntuacion(a));

    // Comentarios del pilar/subgénero
    const todasParaComs = subgeneroId ? filtradas : todasDelPilar;
    const coms = obtenerComentariosTendencia(todasParaComs);

    const vista = $('#vista-pilar');
    if (!vista) return;

    vista.innerHTML = `
      <button class="btn-volver" id="btn-volver-pilar">Inicio</button>

      <div class="pilar-vista-header anim-bruma">
        <span class="pilar-vista-icono" style="color:${color}">${pilar.icono}</span>
        <div class="pilar-vista-nombre" style="color:${color}">${pilar.nombre}</div>
        <div class="pilar-vista-desc">${pilar.descripcion}</div>
      </div>

      <div class="subgeneros-chips anim-bruma anim-d1">
        <button class="chip ${!subgeneroId ? 'active' : ''}" data-sub=""
          style="${!subgeneroId ? `border-color:${color};color:${color}` : ''}">
          Todos (${todasDelPilar.length})
        </button>
        ${pilar.subgeneros.map(s => {
          const n = todasDelPilar.filter(h => h.subgenero === s.id).length;
          const activo = subgeneroId === s.id;
          return `<button class="chip ${activo ? 'active' : ''}" data-sub="${s.id}"
            style="${activo ? `border-color:${color};color:${color}` : ''}">${s.nombre} (${n})</button>`;
        }).join('')}
      </div>

      <div class="seccion-label anim-bruma anim-d2">
        ${subgeneroId ? (pilar.subgeneros.find(s=>s.id===subgeneroId)?.nombre || '') : 'Todas las historias'} — Recientes
      </div>
      <div id="lista-pilar-recientes">${renderListaHistorias(recientes, color)}</div>

      ${tendencias.length > 1 ? `
        <div style="margin-top:2.5rem">
          <div class="seccion-label">Más valoradas</div>
          <div id="lista-pilar-tendencias">${renderListaHistorias(tendencias, color)}</div>
        </div>
      ` : ''}

      ${coms.length ? `
        <div style="margin-top:2.5rem">
          <div class="seccion-label">Voces de esta colección</div>
          ${coms.map(renderComentario).join('')}
        </div>
      ` : ''}
    `;

    // Bind volver
    $('#btn-volver-pilar').addEventListener('click', () => renderHome());

    // Bind chips
    vista.querySelectorAll('.chip').forEach(chip =>
      chip.addEventListener('click', () => renderPilar(pilarId, chip.dataset.sub || null))
    );

    // Bind cards
    [$('#lista-pilar-recientes'), $('#lista-pilar-tendencias')].forEach(el => {
      if (el) bindCards(el);
    });

    // Bind comentarios
    vista.querySelectorAll('.comentario-card').forEach(el =>
      el.addEventListener('click', () => abrirHistoria(el.dataset.id, el.dataset.frag))
    );
  }

  // ─── RENDER LISTA DE HISTORIAS ──────────────────────────────────
  function renderListaHistorias(historias, color) {
    if (!historias.length) {
      return `<div class="estado-vacio">
        Este rincón del abismo aún espera su primera voz.<br>
        <span style="font-size:0.8rem;opacity:0.6">Las sombras permanecen en silencio por ahora.</span>
      </div>`;
    }
    return historias.map((h, i) => {
      const pilar = S.manifest.pilares.find(p => p.id === h.pilar);
      const sub   = pilar?.subgeneros?.find(s => s.id === h.subgenero);
      const c     = color || pilar?.color || COLORES[h.pilar] || '#7ecfc0';
      const tiempo = tiempoEstimado(h);
      const coms  = (h.comentarios || []).length;
      return `
        <div class="historia-card anim-bruma anim-d${Math.min(i+1,4)}" data-id="${h.id}"
             style="--pilar-activo:${c}">
          <span class="card-num">${String(i+1).padStart(2,'0')}</span>
          <div class="card-body">
            <div class="card-titulo">${h.titulo}</div>
            <div class="card-desc">${h.descripcion}</div>
            <div class="card-meta">
              ${sub ? `<span class="card-tag" style="color:${c};border-color:${c}44">${sub.nombre}</span>` : ''}
              <span class="card-stats">
                <span title="Likes">◆ ${h.likes || 0}</span>
                <span title="Lecturas">◈ ${formatNum(h.lecturas || 0)}</span>
                ${coms ? `<span title="Comentarios">◇ ${coms}</span>` : ''}
              </span>
              ${tiempo ? `<span class="card-tiempo">${tiempo}</span>` : ''}
            </div>
          </div>
          <div class="card-share">
            <button class="btn-share-card" data-id="${h.id}" title="Compartir" onclick="event.stopPropagation()">↗</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function bindCards(contenedor) {
    if (!contenedor) return;
    contenedor.querySelectorAll('.historia-card').forEach(card =>
      card.addEventListener('click', () => abrirHistoria(card.dataset.id))
    );
    contenedor.querySelectorAll('.btn-share-card').forEach(btn =>
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        abrirShareModal(btn.dataset.id);
      })
    );
  }

  // ─── ABRIR HISTORIA ─────────────────────────────────────────────
  async function abrirHistoria(historiaId, fragmentoId = null) {
    const h = S.manifest.historias.find(x => x.id === historiaId);
    if (!h) return;

    setVista('lectura');
    S.historiaActiva = h;

    const pilar = S.manifest.pilares.find(p => p.id === h.pilar);
    const sub   = pilar?.subgeneros?.find(s => s.id === h.subgenero);
    const color = pilar?.color || COLORES[h.pilar] || '#7ecfc0';

    setColor(h.pilar);
    setSEO({ titulo: h.titulo, descripcion: h.descripcion, pilar: h.pilar });

    // Actualizar hash para compartir
    history.replaceState(null, '', `#${h.id}`);

    // Registrar lectura
    if (!S.lecturas[h.id]) {
      S.lecturas[h.id] = 0;
      h.lecturas = (h.lecturas || 0) + 1;
      S.lecturas[h.id] = h.lecturas;
      localStorage.setItem('at_lecturas', JSON.stringify(S.lecturas));
    }

    const contenedor = $('#lectura-contenido');
    if (!contenedor) return;

    // Loader
    contenedor.innerHTML = `
      <div style="text-align:center;padding:6rem 2rem;color:var(--text-faint);font-family:var(--font-mono);font-size:0.6rem;letter-spacing:0.2em">
        CARGANDO...
      </div>
    `;

    let cuerpoHTML = '';
    let tiempo = '';

    try {
      const res = await fetch(h.archivo + '?' + Date.now());
      const html = await res.text();
      const doc  = new DOMParser().parseFromString(html, 'text/html');
      cuerpoHTML = doc.body ? doc.body.innerHTML : html;
      tiempo = tiempoLectura(doc.body?.innerText || doc.body?.textContent || html);
    } catch(e) {
      cuerpoHTML = `
        <p><em>${h.descripcion}</em></p>
        <hr>
        <p style="color:var(--text-muted);font-size:0.85rem">
          El relato se cargará desde <code>${h.archivo}</code>.<br>
          Asegúrate de que el archivo existe en la carpeta <code>/historias/</code>.
        </p>
      `;
      tiempo = '';
    }

    contenedor.innerHTML = `
      <button class="btn-volver" id="btn-volver-historia">
        ${S.pilarActivo ? pilar?.nombre || 'Colección' : 'Inicio'}
      </button>

      <div id="lectura-meta">
        ${pilar ? `<span style="color:${color}">${pilar.icono} ${pilar.nombre}</span>` : ''}
        ${sub ? `<span class="sep">›</span><span>${sub.nombre}</span>` : ''}
        ${tiempo ? `<span class="sep">·</span><span>${tiempo}</span>` : ''}
        <span class="sep">·</span>
        <span>◈ ${formatNum(h.lecturas || 0)} lecturas</span>
      </div>

      <div id="fragmento-top" class="anim-bruma" style="--pilar-activo:${color}">
        ${cuerpoHTML}
      </div>
    `;

    $('#btn-volver-historia')?.addEventListener('click', () => {
      detenerAutoScroll();
      history.replaceState(null, '', window.location.pathname);
      if (S.pilarActivo) renderPilar(S.pilarActivo, S.subgeneroActivo);
      else renderHome();
    });

    // Ir a fragmento si viene de comentario
    if (fragmentoId) {
      setTimeout(() => {
        const el = document.getElementById(fragmentoId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 500);
    }

    activarProgressBar();
    mostrarCapaInteraccion(h, color);
    $('#btn-retorno-top')?.classList.add('visible');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ─── CAPA DE INTERACCIÓN ────────────────────────────────────────
  function mostrarCapaInteraccion(h, color) {
    const capa = $('#capa-interaccion');
    if (!capa) return;

    const liked = S.likes[h.id];
    capa.innerHTML = `
      <button class="btn-accion ${liked ? 'liked' : ''}" id="btn-like"
        style="${liked ? `color:${color};border-color:${color}44` : ''}">
        ${liked ? '◆' : '◇'} Me gusta ${h.likes || 0}
      </button>
      <button class="btn-accion" id="btn-compartir-lectura">↗ Compartir</button>
      <button class="btn-accion primary" id="btn-volver-capa">← Volver</button>
    `;
    capa.classList.add('visible');

    $('#btn-like').addEventListener('click', () => toggleLike(h, color));
    $('#btn-compartir-lectura').addEventListener('click', () => abrirShareModal(h.id));
    $('#btn-volver-capa').addEventListener('click', () => {
      detenerAutoScroll();
      history.replaceState(null, '', window.location.pathname);
      if (S.pilarActivo) renderPilar(S.pilarActivo, S.subgeneroActivo);
      else renderHome();
    });
  }

  function ocultarCapaInteraccion() {
    const capa = $('#capa-interaccion');
    if (capa) { capa.classList.remove('visible'); capa.innerHTML = ''; }
  }

  // ─── LIKE ───────────────────────────────────────────────────────
  function toggleLike(h, color) {
    if (S.likes[h.id]) {
      delete S.likes[h.id];
      h.likes = Math.max(0, (h.likes || 1) - 1);
      mostrarToast('◇ Desmarcado');
    } else {
      S.likes[h.id] = true;
      h.likes = (h.likes || 0) + 1;
      mostrarToast('◆ Marcado como favorito');
    }
    localStorage.setItem('at_likes', JSON.stringify(S.likes));
    mostrarCapaInteraccion(h, color);
  }

  // ─── COMPARTIR MODAL ────────────────────────────────────────────
  function initShareModal() {
    const modal = $('#share-modal');
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) cerrarShareModal();
    });
  }

  function abrirShareModal(historiaId) {
    const h = S.manifest.historias.find(x => x.id === historiaId);
    if (!h) return;
    const pilar = S.manifest.pilares.find(p => p.id === h.pilar);
    const color = pilar?.color || COLORES[h.pilar] || '#7ecfc0';
    const url   = `${location.origin}${location.pathname}#${h.id}`;

    const card = $('#share-card');
    if (!card) return;

    card.innerHTML = `
      <div class="share-thumbnail" style="background: radial-gradient(ellipse at center, ${color}18 0%, var(--card) 70%)">
        <div class="share-thumb-icono" style="color:${color}">${pilar?.icono || '◈'}</div>
        <div class="share-thumb-titulo">${h.titulo}</div>
        <div class="share-thumb-sitio">Abys Tenebrae</div>
      </div>
      <div class="share-body">
        <div class="share-url">${url}</div>
        <div class="share-btns">
          <button class="btn-accion" id="btn-copiar-url">⧉ Copiar enlace</button>
          ${navigator.share ? `<button class="btn-accion primary" id="btn-nativo-share">↗ Compartir</button>` : ''}
        </div>
        <button class="btn-cerrar-modal" id="btn-cerrar-modal">Cerrar</button>
      </div>
    `;

    $('#share-modal').classList.add('visible');

    $('#btn-copiar-url').addEventListener('click', () => {
      navigator.clipboard.writeText(url).then(() => {
        mostrarToast('↗ Enlace copiado');
        cerrarShareModal();
      });
    });
    $('#btn-nativo-share')?.addEventListener('click', () => {
      navigator.share({ title: h.titulo, text: h.descripcion, url });
    });
    $('#btn-cerrar-modal').addEventListener('click', cerrarShareModal);
  }

  function cerrarShareModal() {
    $('#share-modal')?.classList.remove('visible');
  }

  // ─── COMENTARIOS TENDENCIA ──────────────────────────────────────
  function obtenerComentariosTendencia(historias) {
    const todos = [];
    historias.forEach(h => {
      (h.comentarios || []).forEach(c => {
        const pilar = S.manifest.pilares.find(p => p.id === h.pilar);
        const sub   = pilar?.subgeneros?.find(s => s.id === h.subgenero);
        todos.push({
          ...c,
          historiaId:      h.id,
          historiaTitulo:  h.titulo,
          pilarNombre:     pilar?.nombre || '',
          pilarColor:      pilar?.color  || COLORES[h.pilar] || '#7ecfc0',
          subgeneroNombre: sub?.nombre   || '',
        });
      });
    });
    return todos.sort((a,b) => b.likes - a.likes).slice(0, 6);
  }

  function renderComentario(c) {
    return `
      <div class="comentario-card" data-id="${c.historiaId}" data-frag="${c.fragmento_id || ''}"
           style="--pilar-activo:${c.pilarColor}">
        <div class="com-ruta" style="--pilar-activo:${c.pilarColor}">
          <span style="color:${c.pilarColor}">${c.pilarNombre}</span>
          <span class="sep">›</span>
          <span>${c.subgeneroNombre}</span>
          <span class="sep">›</span>
          <span class="activo">${c.historiaTitulo}</span>
        </div>
        <div class="com-texto">"${c.texto}"</div>
        <div class="com-footer">
          <span class="com-autor">— ${c.autor}</span>
          <span class="com-likes">◆ ${c.likes}</span>
        </div>
      </div>
    `;
  }

  // ─── GESTIÓN DE VISTAS ──────────────────────────────────────────
  function setVista(vista) {
    S.vista = vista;
    ['#vista-home','#vista-pilar','#vista-lectura'].forEach(sel => {
      $(sel)?.classList.remove('visible');
    });
    ocultarCapaInteraccion();
    desactivarProgressBar();
    $('#btn-retorno-top')?.classList.remove('visible');
    detenerAutoScroll();
    window.scrollTo({ top: 0 });

    const mapa = { home: '#vista-home', pilar: '#vista-pilar', lectura: '#vista-lectura' };
    $(mapa[vista])?.classList.add('visible');
  }

  // ─── BARRA DE PROGRESO ──────────────────────────────────────────
  function initProgressBar() {
    window.addEventListener('scroll', () => {
      if (S.vista !== 'lectura') return;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? (window.scrollY / h) * 100 : 0;
      const bar = $('#progress-bar');
      if (bar) bar.style.width = Math.min(p, 100) + '%';
    }, { passive: true });
  }
  function activarProgressBar()   { $('#progress-bar')?.classList.add('visible'); }
  function desactivarProgressBar() {
    const bar = $('#progress-bar');
    if (bar) { bar.classList.remove('visible'); bar.style.width = '0%'; }
  }

  // ─── AUTO SCROLL ────────────────────────────────────────────────
  function initAutoScroll() {
    // Clic en el área de lectura activa/pausa
    document.addEventListener('click', e => {
      if (S.vista !== 'lectura') return;
      if (e.target.closest('button') || e.target.closest('a') || e.target.closest('#capa-interaccion')) return;
      toggleAutoScroll();
    });

    // Prioridad táctil: al deslizar manualmente, pausar y retomar
    let ty = 0;
    let reanudarTimer = null;
    document.addEventListener('touchstart', e => { ty = e.touches[0].clientY; }, { passive: true });
    document.addEventListener('touchmove',  e => {
      if (!S.autoScroll) return;
      if (Math.abs(e.touches[0].clientY - ty) > 8) pausarAutoScroll();
    }, { passive: true });
    document.addEventListener('touchend', () => {
      if (!S.autoScroll) return;
      clearTimeout(reanudarTimer);
      reanudarTimer = setTimeout(() => { if (S.autoScroll) ejecutarAutoScroll(); }, 1800);
    }, { passive: true });

    // Rueda: pausar y retomar
    let wheelTimer = null;
    document.addEventListener('wheel', () => {
      if (!S.autoScroll) return;
      pausarAutoScroll();
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => { if (S.autoScroll) ejecutarAutoScroll(); }, 2200);
    }, { passive: true });

    // Indicador clic
    $('#autoscroll-indicator')?.addEventListener('click', () => toggleAutoScroll());
  }

  function toggleAutoScroll() {
    S.autoScroll = !S.autoScroll;
    const ind = $('#autoscroll-indicator');
    if (S.autoScroll) {
      ind?.classList.add('active');
      ejecutarAutoScroll();
      mostrarToast('↓ Desplazamiento automático');
    } else {
      ind?.classList.remove('active');
      cancelAnimationFrame(S.autoScrollId);
      mostrarToast('■ Pausado');
    }
  }

  function ejecutarAutoScroll() {
    cancelAnimationFrame(S.autoScrollId);
    const frame = () => {
      if (!S.autoScroll) return;
      window.scrollBy(0, S.scrollVel);
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 5) {
        detenerAutoScroll();
        mostrarToast('◉ Fin del relato');
        return;
      }
      S.autoScrollId = requestAnimationFrame(frame);
    };
    S.autoScrollId = requestAnimationFrame(frame);
  }

  function pausarAutoScroll()  { cancelAnimationFrame(S.autoScrollId); }
  function detenerAutoScroll() {
    S.autoScroll = false;
    cancelAnimationFrame(S.autoScrollId);
    $('#autoscroll-indicator')?.classList.remove('active');
  }

  // ─── BOTÓN RETORNO TOP ──────────────────────────────────────────
  function initBtnRetornoTop() {
    $('#btn-retorno-top')?.addEventListener('click', () =>
      window.scrollTo({ top: 0, behavior: 'smooth' })
    );
  }

  // ─── BUSCADOR EN TIEMPO REAL ────────────────────────────────────
  function initBuscador() {
    const btnB = $('#btn-buscar');
    const wrap = $('#buscador-wrap');
    const input = $('#buscador-input');
    if (!btnB || !wrap || !input) return;

    btnB.addEventListener('click', () => {
      S.busquedaAbierta = !S.busquedaAbierta;
      wrap.classList.toggle('visible', S.busquedaAbierta);
      if (S.busquedaAbierta) input.focus();
      else { input.value = ''; renderHome(); }
    });

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { renderHome(); return; }
      buscar(q);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && S.busquedaAbierta) {
        S.busquedaAbierta = false;
        wrap.classList.remove('visible');
        input.value = '';
        renderHome();
      }
    });
  }

  function buscar(q) {
    const resultados = S.manifest.historias.filter(h =>
      h.titulo.toLowerCase().includes(q) ||
      h.descripcion.toLowerCase().includes(q) ||
      h.subgenero.toLowerCase().includes(q) ||
      h.pilar.toLowerCase().includes(q)
    );

    // Mostrar resultados en la zona flujo sin cambiar de vista
    setVista('home');
    const flujo = $('#zona-flujo');
    if (!flujo) return;

    flujo.innerHTML = `
      <div class="seccion-label">Resultados para "${q}" — ${resultados.length} encontrado${resultados.length !== 1 ? 's' : ''}</div>
      <div id="lista-busqueda">
        ${renderListaHistorias(resultados.map(h => ({
          ...h,
          titulo: h.titulo.replace(new RegExp(q,'gi'), m => `<mark class="highlight">${m}</mark>`),
        })))}
      </div>
    `;
    $('#zona-pulso').innerHTML = '';
    bindCards($('#lista-busqueda'));
  }

  // ─── HISTORIA ALEATORIA ─────────────────────────────────────────
  function initBtnAleatorio() {
    $('#btn-aleatorio')?.addEventListener('click', () => {
      const hs = S.manifest.historias;
      if (!hs.length) return;
      const h = hs[Math.floor(Math.random() * hs.length)];
      mostrarToast('◌ Adentrándose en el abismo...');
      setTimeout(() => abrirHistoria(h.id), 400);
    });
  }

  // ─── LOGOTYPE ───────────────────────────────────────────────────
  function bindLogotype() {
    $('#logotype')?.addEventListener('click', () => {
      history.replaceState(null, '', window.location.pathname);
      renderHome();
    });
  }

  // ─── HASH ROUTING ───────────────────────────────────────────────
  function checkHash() {
    const id = location.hash.slice(1);
    if (!id || !S.manifest) return;
    const h = S.manifest.historias.find(x => x.id === id);
    if (h) abrirHistoria(id);
  }

  // ─── TOAST ──────────────────────────────────────────────────────
  let toastTimer = null;
  function mostrarToast(msg) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }

  // ─── FORMATO DE NÚMEROS ─────────────────────────────────────────
  function formatNum(n) {
    if (n >= 1000) return (n/1000).toFixed(1).replace('.0','') + 'k';
    return String(n);
  }

  // ─── API PÚBLICA ────────────────────────────────────────────────
  return { init };

})();

document.addEventListener('DOMContentLoaded', () => AT.init());
