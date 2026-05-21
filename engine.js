/**
 * ═══════════════════════════════════════════════
 * ABYS TENEBRAE V.2.0 — ENGINE.JS
 * El Cerebro: Motor Central de Navegación e Inyección
 * ═══════════════════════════════════════════════
 */

const AT = (() => {

  // ─── Estado Global ───────────────────────────────────────────────
  const state = {
    manifest: null,
    vista: 'home',           // 'home' | 'pilar' | 'lectura'
    pilarActivo: null,
    subgeneroActivo: null,
    historiaActiva: null,
    autoScroll: false,
    autoScrollId: null,
    scrollVelocidad: 0.6,    // px por frame
    likes: JSON.parse(localStorage.getItem('at_likes') || '{}'),
  };

  // ─── Referencias DOM ─────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  // ─── Init ─────────────────────────────────────────────────────────
  async function init() {
    await cargarManifest();
    renderHome();
    initProgressBar();
    initAutoScroll();
    initBtnRetornoTop();
    initToast();
    bindLogotype();
  }

  // ─── Carga del Manifest ───────────────────────────────────────────
  async function cargarManifest() {
    try {
      const res = await fetch('./manifest.json');
      state.manifest = await res.json();
    } catch (e) {
      console.error('[AT] Error cargando manifest.json:', e);
      state.manifest = { pilares: [], historias: [] };
    }
  }

  // ─── Render: Pantalla Principal ───────────────────────────────────
  function renderHome() {
    setVista('home');
    const { pilares, historias } = state.manifest;

    // Pilares
    const grid = $('#pilares-grid');
    if (grid) {
      grid.innerHTML = pilares.map(p => {
        const count = historias.filter(h => h.pilar === p.id).length;
        return `
          <button class="pilar-btn" data-pilar="${p.id}">
            <span class="pilar-count">${String(count).padStart(2, '0')}</span>
            <span class="pilar-icono">${p.icono}</span>
            <span class="pilar-nombre">${p.nombre}</span>
            <span class="pilar-desc">${p.descripcion}</span>
          </button>
        `;
      }).join('');
      grid.querySelectorAll('.pilar-btn').forEach(btn => {
        btn.addEventListener('click', () => renderPilar(btn.dataset.pilar));
      });
    }

    // Últimas Transmisiones (cronológico)
    const flujo = $('#zona-flujo');
    if (flujo) {
      const recientes = [...historias]
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        .slice(0, 5);
      flujo.innerHTML = `
        <div class="seccion-label">Últimas Transmisiones</div>
        ${renderListaHistorias(recientes)}
        <div class="deco-rule"><span>Tendencias</span></div>
        ${renderListaHistorias(
          [...historias].sort((a, b) => (b.likes + b.lecturas * 0.1) - (a.likes + a.lecturas * 0.1)).slice(0, 5)
        )}
      `;
      bindCardsHistorias(flujo);
    }

    // Pulso (Comentarios en tendencia)
    const pulso = $('#zona-pulso');
    if (pulso) {
      const comentarios = obtenerComentariosTendencia(historias);
      if (comentarios.length) {
        pulso.innerHTML = `
          <div class="seccion-label">El Pulso — Comentarios</div>
          ${comentarios.map(c => renderComentarioTendencia(c)).join('')}
        `;
        pulso.querySelectorAll('.comentario-tendencia').forEach(el => {
          el.addEventListener('click', () => {
            abrirHistoria(el.dataset.historiaId, el.dataset.fragmentoId);
          });
        });
      } else {
        pulso.innerHTML = `<div class="estado-vacio">Aún no hay voces en el abismo.</div>`;
      }
    }
  }

  // ─── Render: Comentarios en Tendencia ─────────────────────────────
  function obtenerComentariosTendencia(historias) {
    const todos = [];
    historias.forEach(h => {
      if (!h.comentarios) return;
      h.comentarios.forEach(c => {
        const pilar = state.manifest.pilares.find(p => p.id === h.pilar);
        const sub = pilar?.subgeneros?.find(s => s.id === h.subgenero);
        todos.push({
          ...c,
          historiaId: h.id,
          historiaTitulo: h.titulo,
          pilarNombre: pilar?.nombre || h.pilar,
          subgeneroNombre: sub?.nombre || h.subgenero,
          pilarId: h.pilar,
        });
      });
    });
    return todos.sort((a, b) => b.likes - a.likes).slice(0, 6);
  }

  function renderComentarioTendencia(c) {
    return `
      <div class="comentario-tendencia" data-historia-id="${c.historiaId}" data-fragmento-id="${c.fragmento_id || ''}">
        <div class="comentario-ruta">
          <span>${c.pilarNombre}</span>
          <span class="sep">›</span>
          <span>${c.subgeneroNombre}</span>
          <span class="sep">›</span>
          <span class="ruta-activa">${c.historiaTitulo}</span>
        </div>
        <div class="comentario-texto">"${c.texto}"</div>
        <div class="comentario-footer">
          <span class="comentario-autor">— ${c.autor}</span>
          <span class="comentario-likes">◆ ${c.likes}</span>
        </div>
      </div>
    `;
  }

  // ─── Render: Lista de Historias ───────────────────────────────────
  function renderListaHistorias(historias) {
    if (!historias.length) return `<div class="estado-vacio">No hay relatos aquí todavía.</div>`;
    return historias.map((h, i) => {
      const pilar = state.manifest.pilares.find(p => p.id === h.pilar);
      const sub = pilar?.subgeneros?.find(s => s.id === h.subgenero);
      return `
        <div class="historia-card anim-bruma anim-delay-${Math.min(i + 1, 3)}" data-id="${h.id}">
          <span class="card-num">${String(i + 1).padStart(2, '0')}</span>
          <div class="card-body">
            <div class="card-titulo">${h.titulo}</div>
            <div class="card-desc">${h.descripcion}</div>
            <div class="card-meta">
              ${sub ? `<span class="card-tag">${sub.nombre}</span>` : ''}
              <span class="card-stats">
                <span>◆ ${h.likes}</span>
                <span>◈ ${h.lecturas}</span>
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function bindCardsHistorias(contenedor) {
    contenedor.querySelectorAll('.historia-card').forEach(card => {
      card.addEventListener('click', () => abrirHistoria(card.dataset.id));
    });
  }

  // ─── Render: Vista de Pilar ───────────────────────────────────────
  function renderPilar(pilarId, subgeneroId = null) {
    setVista('pilar');
    state.pilarActivo = pilarId;
    state.subgeneroActivo = subgeneroId;

    const pilar = state.manifest.pilares.find(p => p.id === pilarId);
    if (!pilar) return;

    const historiasPilar = state.manifest.historias
      .filter(h => h.pilar === pilarId && (subgeneroId ? h.subgenero === subgeneroId : true));

    const vista = $('#vista-pilar');
    if (!vista) return;

    vista.innerHTML = `
      <button class="btn-volver" id="btn-volver-pilar">Inicio</button>

      <div class="pilar-header-vista anim-bruma">
        <div class="pilar-header-icono">${pilar.icono}</div>
        <div class="pilar-header-nombre">${pilar.nombre}</div>
        <div class="pilar-header-desc">${pilar.descripcion}</div>
      </div>

      <div class="subgeneros-lista anim-bruma anim-delay-1">
        <button class="subgenero-chip ${!subgeneroId ? 'active' : ''}" data-sub="">Todo</button>
        ${pilar.subgeneros.map(s => `
          <button class="subgenero-chip ${subgeneroId === s.id ? 'active' : ''}" data-sub="${s.id}">${s.nombre}</button>
        `).join('')}
      </div>

      <div class="seccion-label anim-bruma anim-delay-2">Últimas transmisiones</div>
      <div id="lista-pilar">
        ${renderListaHistorias(
          [...historiasPilar].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        )}
      </div>

      ${historiasPilar.length > 1 ? `
        <div class="deco-rule"><span>Más valoradas</span></div>
        <div id="lista-pilar-popular">
          ${renderListaHistorias(
            [...historiasPilar].sort((a, b) => b.likes - a.likes)
          )}
        </div>
      ` : ''}
    `;

    // Bind volver
    $('#btn-volver-pilar').addEventListener('click', () => renderHome());

    // Bind subgéneros
    vista.querySelectorAll('.subgenero-chip').forEach(chip => {
      chip.addEventListener('click', () => renderPilar(pilarId, chip.dataset.sub || null));
    });

    // Bind cards
    bindCardsHistorias($('#lista-pilar'));
    if ($('#lista-pilar-popular')) bindCardsHistorias($('#lista-pilar-popular'));
  }

  // ─── Abrir Historia ───────────────────────────────────────────────
  async function abrirHistoria(historiaId, fragmentoId = null) {
    const historia = state.manifest.historias.find(h => h.id === historiaId);
    if (!historia) return;

    setVista('lectura');
    state.historiaActiva = historia;

    // Registrar lectura (conteo local)
    historia.lecturas = (historia.lecturas || 0) + 1;

    // Cargar HTML de la historia
    const contenedor = $('#lectura-contenido');
    if (!contenedor) return;

    try {
      const res = await fetch(historia.archivo);
      const html = await res.text();
      // Extraer solo el body si existe, o el contenido completo
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const body = doc.body ? doc.body.innerHTML : html;

      contenedor.innerHTML = `
        <button class="btn-volver" id="btn-volver-historia">
          ${state.pilarActivo ? 'Colección' : 'Inicio'}
        </button>
        <div id="fragmento-top" class="anim-bruma">
          ${body}
        </div>
      `;
    } catch (e) {
      // Demo: renderizar placeholder si el archivo no existe
      contenedor.innerHTML = `
        <button class="btn-volver" id="btn-volver-historia">
          ${state.pilarActivo ? 'Colección' : 'Inicio'}
        </button>
        <div class="anim-bruma" id="fragmento-top">
          <h1>${historia.titulo}</h1>
          <p><em>${historia.descripcion}</em></p>
          <hr>
          <p>El contenido de esta historia se cargará desde <code>${historia.archivo}</code>.</p>
          <p>Coloca un archivo <code>.html</code> con la narrativa en la carpeta <code>/historias/</code> y el motor lo inyectará aquí automáticamente.</p>
        </div>
      `;
    }

    // Bind volver
    $('#btn-volver-historia')?.addEventListener('click', () => {
      detenerAutoScroll();
      if (state.pilarActivo) renderPilar(state.pilarActivo, state.subgeneroActivo);
      else renderHome();
    });

    // Ir a fragmento si viene de comentario
    if (fragmentoId) {
      setTimeout(() => {
        const el = document.getElementById(fragmentoId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
    }

    // Activar barra de progreso
    activarProgressBar();

    // Mostrar capa de interacción
    mostrarCapaInteraccion(historia);

    // Mostrar botón de retorno top
    $('#btn-retorno-top').classList.add('visible');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ─── Capa de Interacción ──────────────────────────────────────────
  function mostrarCapaInteraccion(historia) {
    const capa = $('#capa-interaccion');
    if (!capa) return;

    const yaLiked = state.likes[historia.id];

    capa.innerHTML = `
      <button class="btn-interaccion ${yaLiked ? 'liked' : ''}" id="btn-like">
        ${yaLiked ? '◆ Marcado' : '◇ Me gusta'} ${historia.likes}
      </button>
      <button class="btn-interaccion" id="btn-compartir">↗ Compartir</button>
      <button class="btn-interaccion primary" id="btn-volver-capa">← Volver</button>
    `;

    capa.classList.add('visible');

    $('#btn-like').addEventListener('click', () => toggleLike(historia));
    $('#btn-compartir').addEventListener('click', () => compartir(historia));
    $('#btn-volver-capa').addEventListener('click', () => {
      detenerAutoScroll();
      if (state.pilarActivo) renderPilar(state.pilarActivo, state.subgeneroActivo);
      else renderHome();
    });
  }

  function ocultarCapaInteraccion() {
    const capa = $('#capa-interaccion');
    if (capa) {
      capa.classList.remove('visible');
      capa.innerHTML = '';
    }
  }

  // ─── Like ─────────────────────────────────────────────────────────
  function toggleLike(historia) {
    if (state.likes[historia.id]) {
      delete state.likes[historia.id];
      historia.likes = Math.max(0, historia.likes - 1);
    } else {
      state.likes[historia.id] = true;
      historia.likes++;
    }
    localStorage.setItem('at_likes', JSON.stringify(state.likes));
    mostrarCapaInteraccion(historia);
    mostrarToast(state.likes[historia.id] ? '◆ Marcado como favorito' : '◇ Desmarcado');
  }

  // ─── Compartir ────────────────────────────────────────────────────
  function compartir(historia) {
    const url = `${window.location.origin}${window.location.pathname}#${historia.id}`;
    if (navigator.share) {
      navigator.share({ title: historia.titulo, text: historia.descripcion, url });
    } else {
      navigator.clipboard.writeText(url).then(() => mostrarToast('↗ Enlace copiado al portapapeles'));
    }
  }

  // ─── Gestión de Vistas ────────────────────────────────────────────
  function setVista(vista) {
    state.vista = vista;

    // Ocultar todo
    $('#vista-home')?.classList.remove('visible');
    $('#vista-pilar')?.classList.remove('visible');
    $('#vista-lectura')?.classList.remove('visible');
    ocultarCapaInteraccion();
    desactivarProgressBar();
    $('#btn-retorno-top')?.classList.remove('visible');
    detenerAutoScroll();

    if (vista === 'home') {
      $('#vista-home')?.classList.add('visible');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (vista === 'pilar') {
      $('#vista-pilar')?.classList.add('visible');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (vista === 'lectura') {
      $('#vista-lectura')?.classList.add('visible');
    }
  }

  // ─── Barra de Progreso ────────────────────────────────────────────
  function initProgressBar() {
    window.addEventListener('scroll', actualizarProgress, { passive: true });
  }

  function actualizarProgress() {
    if (state.vista !== 'lectura') return;
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    const bar = $('#progress-bar');
    if (bar) bar.style.width = `${Math.min(pct, 100)}%`;
  }

  function activarProgressBar() {
    const bar = $('#progress-bar');
    if (bar) bar.classList.add('visible');
  }
  function desactivarProgressBar() {
    const bar = $('#progress-bar');
    if (bar) { bar.classList.remove('visible'); bar.style.width = '0%'; }
  }

  // ─── Auto Scroll ──────────────────────────────────────────────────
  function initAutoScroll() {
    // Activar/Desactivar con clic en el área de lectura
    document.addEventListener('click', (e) => {
      if (state.vista !== 'lectura') return;
      // Ignorar clics en botones
      if (e.target.closest('button') || e.target.closest('a')) return;
      toggleAutoScroll();
    });

    // Prioridad táctil: si el usuario desliza manualmente, pausar
    let touchStartY = 0;
    document.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!state.autoScroll) return;
      const delta = Math.abs(e.touches[0].clientY - touchStartY);
      if (delta > 10) {
        pausarAutoScroll();
      }
    }, { passive: true });

    // Reactivar al dejar de tocar (después de 1.5s)
    let reactivarTimer = null;
    document.addEventListener('touchend', () => {
      if (!state.autoScroll) return;
      clearTimeout(reactivarTimer);
      reactivarTimer = setTimeout(() => {
        if (state.autoScroll) ejecutarAutoScroll();
      }, 1500);
    }, { passive: true });

    // Detectar scroll manual con rueda (sin apagar el estado)
    let wheelTimer = null;
    document.addEventListener('wheel', () => {
      if (!state.autoScroll) return;
      pausarAutoScroll();
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        if (state.autoScroll) ejecutarAutoScroll();
      }, 2000);
    }, { passive: true });
  }

  function toggleAutoScroll() {
    state.autoScroll = !state.autoScroll;
    const ind = $('#autoscroll-indicator');
    if (state.autoScroll) {
      if (ind) ind.classList.add('active');
      ejecutarAutoScroll();
      mostrarToast('↓ Desplazamiento automático activado');
    } else {
      detenerAutoScroll();
      mostrarToast('■ Desplazamiento pausado');
    }
  }

  function ejecutarAutoScroll() {
    cancelAnimationFrame(state.autoScrollId);
    function frame() {
      if (!state.autoScroll) return;
      window.scrollBy(0, state.scrollVelocidad);
      // Detener si llegó al final
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 10) {
        detenerAutoScroll();
        mostrarToast('◉ Fin del relato');
        return;
      }
      state.autoScrollId = requestAnimationFrame(frame);
    }
    state.autoScrollId = requestAnimationFrame(frame);
  }

  function pausarAutoScroll() {
    cancelAnimationFrame(state.autoScrollId);
  }

  function detenerAutoScroll() {
    state.autoScroll = false;
    cancelAnimationFrame(state.autoScrollId);
    const ind = $('#autoscroll-indicator');
    if (ind) ind.classList.remove('active');
  }

  // ─── Botón Retorno Top ────────────────────────────────────────────
  function initBtnRetornoTop() {
    const btn = $('#btn-retorno-top');
    if (!btn) return;
    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ─── Toast ────────────────────────────────────────────────────────
  let toastTimer = null;
  function initToast() { /* pre-existente en DOM */ }
  function mostrarToast(msg) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  // ─── Logotype (volver al inicio) ─────────────────────────────────
  function bindLogotype() {
    $('#logotype')?.addEventListener('click', () => renderHome());
  }

  // ─── Hash routing (compartir enlace directo) ──────────────────────
  function checkHash() {
    const hash = window.location.hash.slice(1);
    if (!hash || !state.manifest) return;
    const historia = state.manifest.historias.find(h => h.id === hash);
    if (historia) abrirHistoria(hash);
  }

  // ─── API pública ──────────────────────────────────────────────────
  return { init, checkHash, renderHome, renderPilar, abrirHistoria };

})();

// ─── Arranque ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await AT.init();
  AT.checkHash();
});
