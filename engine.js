/**
 * ═══════════════════════════════════════════════════════
 * ABYS TENEBRAE V.2.0 — ENGINE.JS  (Definitivo)
 * ═══════════════════════════════════════════════════════
 */

const AT = (() => {

  // ── Estado ────────────────────────────────────────────
  const S = {
    manifest:        null,
    vista:           'home',
    pilarActivo:     null,
    subgeneroActivo: null,
    historiaActiva:  null,
    autoScroll:      false,
    autoScrollId:    null,
    scrollVel:       0.7,
    likes:    JSON.parse(localStorage.getItem('at_likes')    || '{}'),
    lecturas: JSON.parse(localStorage.getItem('at_lecturas') || '{}'),
    busquedaAbierta: false,
  };

  const $  = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  // ── Colores por pilar ─────────────────────────────────
  const COLORES = {
    'identidad':           '#c4a882',
    'ecos-del-vacio':      '#8b7aa8',
    'fronteras-alteradas': '#a86060',
    'legado-de-sombras':   '#c4a882',
    'el-fugitivo':         '#8aab8a',
  };

  // ── INIT ──────────────────────────────────────────────
  async function init() {
    await cargarManifest();
    renderHome();
    initProgressBar();
    initAutoScroll();
    initBtnRetornoTop();
    initBuscador();
    initBtnAleatorio();
    initShareModal();
    initCompartirPagina();
    initDisqus();
    bindLogotype();
    checkHash();
  }

  // ── Manifest ──────────────────────────────────────────
  async function cargarManifest() {
    try {
      const r = await fetch('./manifest.json?' + Date.now());
      S.manifest = await r.json();
    } catch(e) {
      S.manifest = { meta:{}, pilares:[], historias:[] };
    }
  }

  // ── Algoritmo tendencias ──────────────────────────────
  function puntuacion(h) {
    return (h.likes||0)*3 + (h.lecturas||0)*1 + ((h.comentarios||[]).length)*2;
  }

  // ── Tiempo de lectura ─────────────────────────────────
  function tiempoLectura(texto) {
    const min = Math.ceil(texto.trim().split(/\s+/).length / 700);
    if (min < 5)  return `~${min} min`;
    if (min < 15) return `~${min} min`;
    return `~${min} min`;
  }

  // ── Fecha legible ─────────────────────────────────────
  function fechaLegible(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${parseInt(d)} ${meses[parseInt(m)-1]} ${y}`;
  }

  // ── Color activo ──────────────────────────────────────
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

  // ── SEO dinámico ──────────────────────────────────────
  function setSEO({ titulo, descripcion } = {}) {
    const base = 'Abys Tenebrae';
    document.title = titulo ? `${titulo} · ${base}` : base;
    const setMeta = (sel, attr, val) => {
      let el = $(sel); if (!el) { el = document.createElement('meta'); document.head.appendChild(el); }
      el.setAttribute(attr, val);
    };
    setMeta('meta[name="description"]',    'content', descripcion || 'Portal de narrativa oscura y literatura de penumbra');
    setMeta('meta[property="og:title"]',   'content', titulo ? `${titulo} · ${base}` : base);
    setMeta('meta[property="og:description"]', 'content', descripcion || '');
    // og:url dinámico
    let ogUrl = $('meta[property="og:url"]');
    if (!ogUrl) { ogUrl = document.createElement('meta'); ogUrl.setAttribute('property','og:url'); document.head.appendChild(ogUrl); }
    ogUrl.setAttribute('content', location.href);
  }

  // ── RENDER HOME ───────────────────────────────────────
  function renderHome() {
    setVista('home');
    setSEO({});
    setColor('identidad');
    S.pilarActivo = null; S.subgeneroActivo = null;

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
          </button>
        `;
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
        <div id="lista-recientes">${listaHistorias(recientes)}</div>
        <div style="margin-top:3rem">
          <div class="seccion-label">Tendencias</div>
          <div id="lista-tendencias">${listaHistorias(tendencias)}</div>
        </div>
      `;
      bindCards($('#lista-recientes'));
      bindCards($('#lista-tendencias'));
    }

    // Pulso
    const pulso = $('#zona-pulso');
    if (pulso) {
      const coms = comentariosTendencia(historias);
      pulso.innerHTML = coms.length
        ? `<div class="seccion-label">El Pulso — Comentarios</div>${coms.map(renderCom).join('')}`
        : `<div class="estado-vacio">
            El abismo aún no tiene voces.<br>
            <span style="font-size:0.8rem;opacity:0.5">Las primeras palabras están por llegar.</span>
           </div>`;
      pulso.querySelectorAll('.comentario-card').forEach(el =>
        el.addEventListener('click', () => abrirHistoria(el.dataset.id, el.dataset.frag))
      );
    }
  }

  // ── RENDER PILAR ──────────────────────────────────────
  function renderPilar(pilarId, subgeneroId=null) {
    setVista('pilar');
    S.pilarActivo = pilarId; S.subgeneroActivo = subgeneroId;

    const pilar = S.manifest.pilares.find(p=>p.id===pilarId);
    if (!pilar) return;
    const color = pilar.color || COLORES[pilarId];
    setColor(pilarId);
    setSEO({ titulo: pilar.nombre, descripcion: pilar.descripcion });

    const todasPilar = S.manifest.historias.filter(h=>h.pilar===pilarId);
    const filtradas  = subgeneroId ? todasPilar.filter(h=>h.subgenero===subgeneroId) : todasPilar;
    const recientes  = [...filtradas].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
    const tendencias = [...filtradas].sort((a,b)=>puntuacion(b)-puntuacion(a));
    const coms       = comentariosTendencia(filtradas);

    const vista = $('#vista-pilar');
    if (!vista) return;

    vista.innerHTML = `
      <button class="btn-volver" id="btn-volver-pilar">Inicio</button>

      <div class="pilar-vista-header anim-bruma">
        <span class="pilar-vista-icono" style="color:${color}">${pilar.icono}</span>
        <div class="pilar-vista-nombre">${pilar.nombre}</div>
        <div class="pilar-vista-desc">${pilar.descripcion}</div>
      </div>

      <div class="subgeneros-chips anim-bruma anim-d1">
        <button class="chip ${!subgeneroId?'active':''}" data-sub=""
          style="${!subgeneroId?`border-color:${color};color:${color}`:''}">
          Todos (${todasPilar.length})
        </button>
        ${pilar.subgeneros.map(s=>{
          const n = todasPilar.filter(h=>h.subgenero===s.id).length;
          const a = subgeneroId===s.id;
          return `<button class="chip ${a?'active':''}" data-sub="${s.id}"
            style="${a?`border-color:${color};color:${color}`:''}">
            ${s.nombre} (${n})</button>`;
        }).join('')}
      </div>

      <div class="seccion-label anim-bruma anim-d2">
        ${subgeneroId ? (pilar.subgeneros.find(s=>s.id===subgeneroId)?.nombre||'') : 'Todas'} — Recientes
      </div>
      <div id="lista-pilar-rec">${listaHistorias(recientes, color)}</div>

      ${tendencias.length > 1 ? `
        <div style="margin-top:2.5rem">
          <div class="seccion-label">Más valoradas</div>
          <div id="lista-pilar-tend">${listaHistorias(tendencias, color)}</div>
        </div>` : ''}

      ${coms.length ? `
        <div style="margin-top:2.5rem">
          <div class="seccion-label">Voces de esta colección</div>
          ${coms.map(renderCom).join('')}
        </div>` : ''}
    `;

    $('#btn-volver-pilar').addEventListener('click', () => renderHome());
    vista.querySelectorAll('.chip').forEach(c =>
      c.addEventListener('click', () => renderPilar(pilarId, c.dataset.sub||null))
    );
    [$('#lista-pilar-rec'), $('#lista-pilar-tend')].forEach(el => el && bindCards(el));
    vista.querySelectorAll('.comentario-card').forEach(el =>
      el.addEventListener('click', () => abrirHistoria(el.dataset.id, el.dataset.frag))
    );
  }

  // ── Lista de historias ────────────────────────────────
  function listaHistorias(historias, color) {
    if (!historias.length) return `
      <div class="estado-vacio">
        Este rincón del abismo aún espera su primera voz.<br>
        <span style="font-size:0.8rem;opacity:0.55">Las sombras permanecen en silencio por ahora.</span>
      </div>`;
    return historias.map((h,i) => {
      const pilar = S.manifest.pilares.find(p=>p.id===h.pilar);
      const sub   = pilar?.subgeneros?.find(s=>s.id===h.subgenero);
      const c     = color || pilar?.color || COLORES[h.pilar] || '#c4a882';
      const coms  = (h.comentarios||[]).length;
      return `
        <div class="historia-card anim-bruma anim-d${Math.min(i+1,4)}" data-id="${h.id}"
             style="--pilar-activo:${c}">
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

        </div>
      `;
    }).join('');
  }

  function bindCards(contenedor) {
    if (!contenedor) return;
    contenedor.querySelectorAll('.historia-card').forEach(c =>
      c.addEventListener('click', () => abrirHistoria(c.dataset.id))
    );

  }

  // ── ABRIR HISTORIA ────────────────────────────────────
  async function abrirHistoria(historiaId, fragmentoId=null) {
    const h = S.manifest.historias.find(x=>x.id===historiaId);
    if (!h) return;

    setVista('lectura');
    S.historiaActiva = h;

    const pilar = S.manifest.pilares.find(p=>p.id===h.pilar);
    const sub   = pilar?.subgeneros?.find(s=>s.id===h.subgenero);
    const color = pilar?.color || COLORES[h.pilar] || '#7ecfc0';

    setColor(h.pilar);
    setSEO({ titulo: h.titulo, descripcion: h.descripcion });
    history.replaceState(null,'',`#${h.id}`);

    // Contar lectura una sola vez por sesión
    if (!S.lecturas[h.id]) {
      h.lecturas = (h.lecturas||0) + 1;
      S.lecturas[h.id] = true;
      localStorage.setItem('at_lecturas', JSON.stringify(S.lecturas));
    }

    const cont = $('#lectura-contenido');
    if (!cont) return;

    // Loader
    cont.innerHTML = `<div style="text-align:center;padding:8rem 2rem;color:var(--text-faint);
      font-family:var(--font-mono);font-size:0.56rem;letter-spacing:0.22em">CARGANDO</div>`;

    let cuerpo = '', tiempo = '';
    try {
      const res = await fetch(h.archivo+'?'+Date.now());
      const html = await res.text();
      const doc  = new DOMParser().parseFromString(html,'text/html');
      cuerpo = doc.body ? doc.body.innerHTML : html;
      tiempo = tiempoLectura(doc.body?.textContent || html);
    } catch(e) {
      cuerpo = `<p><em>${h.descripcion}</em></p><hr>
        <p style="color:var(--text-muted);font-size:0.85rem">
          Archivo no encontrado: <code>${h.archivo}</code><br>
          Asegúrate de que el <code>.html</code> existe en <code>/historias/</code>.
        </p>`;
    }

    cont.innerHTML = `
      <button class="btn-volver" id="btn-volver-historia">
        ${S.pilarActivo ? (pilar?.nombre||'Colección') : 'Inicio'}
      </button>
      <div id="lectura-meta">
        ${pilar?`<span style="color:${color}">${pilar.icono} ${pilar.nombre}</span>`:''}
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
    `;

    $('#btn-volver-historia')?.addEventListener('click', () => {
      detenerAutoScroll();
      history.replaceState(null,'',location.pathname);
      if (S.pilarActivo) renderPilar(S.pilarActivo, S.subgeneroActivo);
      else renderHome();
    });

    if (fragmentoId) {
      setTimeout(()=>{
        const el = document.getElementById(fragmentoId);
        if (el) el.scrollIntoView({ behavior:'smooth', block:'center' });
      }, 500);
    }

    activarProgressBar();
    cargarDisqus(h);
    mostrarCapaInteraccion(h, color);
    $('#btn-retorno-top')?.classList.add('visible');
    window.scrollTo({ top:0, behavior:'smooth' });
  }

  // ── Capa de interacción ───────────────────────────────
  function mostrarCapaInteraccion(h, color) {
    const capa = $('#capa-interaccion');
    if (!capa) return;
    const liked = S.likes[h.id];
    capa.innerHTML = `
      <button class="btn-accion ${liked?'liked':''}" id="btn-like"
        style="${liked?`color:${color};border-color:${color}44`:''}">
        ${liked?'◆':'◇'} Me gusta ${h.likes||0}
      </button>
      <button class="btn-accion" id="btn-comp-lect">↗ Compartir</button>
      <button class="btn-accion primary" id="btn-volver-capa">← Volver</button>
    `;
    capa.classList.add('visible');
    $('#btn-like').addEventListener('click', () => toggleLike(h, color));
    $('#btn-comp-lect').addEventListener('click', () => abrirShareModal(h.id));
    $('#btn-volver-capa').addEventListener('click', () => {
      detenerAutoScroll();
      history.replaceState(null,'',location.pathname);
      if (S.pilarActivo) renderPilar(S.pilarActivo, S.subgeneroActivo);
      else renderHome();
    });
  }

  function ocultarCapaInteraccion() {
    const c = $('#capa-interaccion');
    if (c) { c.classList.remove('visible'); c.innerHTML=''; }
  }

  // ── Like ──────────────────────────────────────────────
  function toggleLike(h, color) {
    if (S.likes[h.id]) {
      delete S.likes[h.id];
      h.likes = Math.max(0,(h.likes||1)-1);
      mostrarToast('◇ Desmarcado');
    } else {
      S.likes[h.id] = true;
      h.likes = (h.likes||0)+1;
      mostrarToast('◆ Marcado como favorito');
    }
    localStorage.setItem('at_likes', JSON.stringify(S.likes));
    mostrarCapaInteraccion(h, color);
  }

  // ── Compartir página principal ────────────────────────
  function initCompartirPagina() {
    const url  = location.origin + location.pathname;
    const desc = 'Abys Tenebrae — Donde los límites de la realidad se disuelven en el umbral de lo innombrable.';

    const handler = () => {
      if (navigator.share) {
        navigator.share({ title:'Abys Tenebrae', text: desc, url });
      } else {
        navigator.clipboard.writeText(url).then(()=> mostrarToast('↗ Enlace copiado'));
      }
    };

    // Header: existe desde el inicio
    $('#btn-compartir-pagina')?.addEventListener('click', handler);

    // Footer: se renderiza dinámicamente con renderHome(),
    // usamos event delegation en document para capturarlo siempre
    document.addEventListener('click', e => {
      if (e.target.closest('#btn-compartir-footer')) handler();
    });
  }

  // ── Modal compartir historia ──────────────────────────
  function initShareModal() {
    $('#share-modal')?.addEventListener('click', e => {
      if (e.target === $('#share-modal')) cerrarShareModal();
    });
  }

  function abrirShareModal(historiaId) {
    const h = S.manifest.historias.find(x=>x.id===historiaId);
    if (!h) return;
    const pilar = S.manifest.pilares.find(p=>p.id===h.pilar);
    const color = pilar?.color || COLORES[h.pilar] || '#7ecfc0';
    const url   = `${location.origin}${location.pathname}#${h.id}`;

    const card = $('#share-card');
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
          ${navigator.share?`<button class="btn-accion primary" id="btn-share-nativo">↗ Compartir</button>`:''}
        </div>
        <button class="btn-cerrar-modal">Cerrar</button>
      </div>
    `;

    $('#share-modal').classList.add('visible');

    $('#btn-copiar').addEventListener('click',()=>{
      navigator.clipboard.writeText(url).then(()=>{ mostrarToast('↗ Enlace copiado'); cerrarShareModal(); });
    });
    $('#btn-share-nativo')?.addEventListener('click',()=>{
      navigator.share({ title:h.titulo, text:h.descripcion, url });
    });
    card.querySelector('.btn-cerrar-modal').addEventListener('click', cerrarShareModal);
  }

  function cerrarShareModal() {
    $('#share-modal')?.classList.remove('visible');
  }

  // ── Comentarios tendencia ─────────────────────────────
  function comentariosTendencia(historias) {
    const todos=[];
    historias.forEach(h=>{
      (h.comentarios||[]).forEach(c=>{
        const p = S.manifest.pilares.find(x=>x.id===h.pilar);
        const s = p?.subgeneros?.find(x=>x.id===h.subgenero);
        todos.push({...c,
          historiaId:h.id, historiaTitulo:h.titulo,
          pilarNombre:p?.nombre||'', pilarColor:p?.color||COLORES[h.pilar]||'#c4a882',
          subgeneroNombre:s?.nombre||''
        });
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
      </div>
    `;
  }

  // ── Gestión de vistas ─────────────────────────────────
  function setVista(vista) {
    S.vista = vista;
    ['#vista-home','#vista-pilar','#vista-lectura'].forEach(s=>$(s)?.classList.remove('visible'));
    ocultarCapaInteraccion();
    limpiarDisqus();
    desactivarProgressBar();
    $('#btn-retorno-top')?.classList.remove('visible');
    detenerAutoScroll();
    window.scrollTo({top:0});
    const map = {home:'#vista-home',pilar:'#vista-pilar',lectura:'#vista-lectura'};
    $(map[vista])?.classList.add('visible');
  }

  // ── Progreso ──────────────────────────────────────────
  function initProgressBar() {
    window.addEventListener('scroll', ()=>{
      if (S.vista!=='lectura') return;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h>0 ? (window.scrollY/h)*100 : 0;
      const bar=$('#progress-bar');
      if (bar) bar.style.width = Math.min(p,100)+'%';
    },{ passive:true });
  }
  function activarProgressBar()    { $('#progress-bar')?.classList.add('visible'); }
  function desactivarProgressBar() {
    const b=$('#progress-bar'); if(b){b.classList.remove('visible');b.style.width='0%';}
  }

  // ── Auto Scroll ───────────────────────────────────────
  function initAutoScroll() {
    document.addEventListener('click', e=>{
      if (S.vista!=='lectura') return;
      if (e.target.closest('button,a,#capa-interaccion')) return;
      toggleAutoScroll();
    });

    let ty=0, timer=null;
    document.addEventListener('touchstart', e=>{ty=e.touches[0].clientY;},{passive:true});
    document.addEventListener('touchmove', e=>{
      if (!S.autoScroll) return;
      if (Math.abs(e.touches[0].clientY-ty)>8) pausarScroll();
    },{passive:true});
    document.addEventListener('touchend', ()=>{
      if (!S.autoScroll) return;
      clearTimeout(timer);
      timer=setTimeout(()=>{ if(S.autoScroll) ejecutarScroll(); },1800);
    },{passive:true});

    let wt=null;
    document.addEventListener('wheel', ()=>{
      if (!S.autoScroll) return;
      pausarScroll();
      clearTimeout(wt);
      wt=setTimeout(()=>{ if(S.autoScroll) ejecutarScroll(); },2200);
    },{passive:true});

    $('#autoscroll-indicator')?.addEventListener('click', toggleAutoScroll);
  }

  function toggleAutoScroll() {
    S.autoScroll=!S.autoScroll;
    const ind=$('#autoscroll-indicator');
    if (S.autoScroll) {
      ind?.classList.add('active');
      ejecutarScroll();
      mostrarToast('↓ Auto scroll activado · Toca para pausar');
    } else {
      ind?.classList.remove('active');
      cancelAnimationFrame(S.autoScrollId);
      mostrarToast('■ Pausado');
    }
  }

  function ejecutarScroll() {
    cancelAnimationFrame(S.autoScrollId);
    const frame=()=>{
      if (!S.autoScroll) return;
      window.scrollBy(0,S.scrollVel);
      if (window.innerHeight+window.scrollY>=document.body.offsetHeight-5) {
        detenerAutoScroll(); mostrarToast('◉ Fin del relato'); return;
      }
      S.autoScrollId=requestAnimationFrame(frame);
    };
    S.autoScrollId=requestAnimationFrame(frame);
  }

  function pausarScroll()  { cancelAnimationFrame(S.autoScrollId); }
  function detenerAutoScroll() {
    S.autoScroll=false; cancelAnimationFrame(S.autoScrollId);
    $('#autoscroll-indicator')?.classList.remove('active');
  }

  // ── Retorno Top ───────────────────────────────────────
  function initBtnRetornoTop() {
    $('#btn-retorno-top')?.addEventListener('click',()=>
      window.scrollTo({top:0,behavior:'smooth'})
    );
  }

  // ── Buscador ──────────────────────────────────────────
  function initBuscador() {
    const btnB=$('#btn-buscar'), wrap=$('#buscador-wrap'), input=$('#buscador-input');
    if (!btnB||!wrap||!input) return;

    btnB.addEventListener('click',()=>{
      S.busquedaAbierta=!S.busquedaAbierta;
      wrap.classList.toggle('visible',S.busquedaAbierta);
      if (S.busquedaAbierta) input.focus();
      else { input.value=''; if(S.vista==='home') renderHome(); }
    });

    input.addEventListener('input',()=>{
      const q=input.value.trim().toLowerCase();
      if (!q) { renderHome(); return; }
      buscar(q);
    });

    document.addEventListener('keydown',e=>{
      if (e.key==='Escape'&&S.busquedaAbierta) {
        S.busquedaAbierta=false;
        wrap.classList.remove('visible');
        input.value='';
        if (S.vista==='home') renderHome();
      }
    });
  }

  function buscar(q) {
    const res = S.manifest.historias.filter(h=>
      h.titulo.toLowerCase().includes(q)||
      h.descripcion.toLowerCase().includes(q)||
      h.subgenero.toLowerCase().includes(q)||
      h.pilar.toLowerCase().includes(q)
    );
    if (S.vista!=='home') setVista('home');
    const flujo=$('#zona-flujo');
    if (!flujo) return;
    const hl = h => h.replace(new RegExp(q,'gi'),m=>`<mark class="highlight">${m}</mark>`);
    flujo.innerHTML=`
      <div class="seccion-label">
        Resultados — ${res.length} encontrado${res.length!==1?'s':''}
      </div>
      <div id="lista-busqueda">${listaHistorias(res.map(h=>({...h,titulo:hl(h.titulo)})))}</div>
    `;
    const pulso=$('#zona-pulso'); if(pulso) pulso.innerHTML='';
    bindCards($('#lista-busqueda'));
  }

  // ── Aleatorio ─────────────────────────────────────────
  function initBtnAleatorio() {
    $('#btn-aleatorio')?.addEventListener('click',()=>{
      const hs=S.manifest.historias;
      if (!hs.length) return;
      mostrarToast('◌ Adentrándose en el abismo...');
      setTimeout(()=>abrirHistoria(hs[Math.floor(Math.random()*hs.length)].id),380);
    });
  }

  // ── Logotype ──────────────────────────────────────────
  function bindLogotype() {
    $('#logotype')?.addEventListener('click',()=>{
      history.replaceState(null,'',location.pathname);
      renderHome();
    });
  }

  // ── Hash routing ──────────────────────────────────────
  function checkHash() {
    const id=location.hash.slice(1);
    if (!id||!S.manifest) return;
    const h=S.manifest.historias.find(x=>x.id===id);
    if (h) abrirHistoria(id);
  }

  // ── Toast ─────────────────────────────────────────────
  let toastTimer=null;
  function mostrarToast(msg) {
    const t=$('#toast'); if(!t) return;
    t.textContent=msg; t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(()=>t.classList.remove('show'),2400);
  }

  // ── Formato números ───────────────────────────────────
  function fmt(n) {
    if (n>=1000) return (n/1000).toFixed(1).replace('.0','')+'k';
    return String(n);
  }


  // ── DISQUS ────────────────────────────────────────────
  // Shortname: abys-tenebrae
  const DISQUS_SHORTNAME = 'abys-tenebrae';

  function initDisqus() {
    // Inyectar el script de Disqus una sola vez al cargar la app
    if (document.getElementById('disqus-script')) return;
    window.disqus_config = function() {};
    const s = document.createElement('script');
    s.id  = 'disqus-script';
    s.src = 'https://' + DISQUS_SHORTNAME + '.disqus.com/embed.js';
    s.setAttribute('data-timestamp', Date.now());
    s.async = true;
    document.head.appendChild(s);
  }

  function cargarDisqus(h) {
    // Crear contenedor Disqus al final del relato si no existe
    let wrap = document.getElementById('disqus-section');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'disqus-section';
      wrap.innerHTML = `
        <div id=disqus-divider></div>
        <div id=disqus_thread></div>
      `;
      // Insertar después del contenido narrativo
      const cont = $('#lectura-contenido');
      if (cont) cont.appendChild(wrap);
    }

    // Configurar Disqus para esta historia específica
    const url        = location.origin + location.pathname + '#' + h.id;
    const identifier = 'historia-' + h.id;

    if (window.DISQUS) {
      // Disqus ya cargado: resetear con nueva config
      window.DISQUS.reset({
        reload: true,
        config: function() {
          this.page.url        = url;
          this.page.identifier = identifier;
          this.page.title      = h.titulo;
        }
      });
    } else {
      // Primera carga: setear config global que Disqus leerá al iniciar
      window.disqus_config = function() {
        this.page.url        = url;
        this.page.identifier = identifier;
        this.page.title      = h.titulo;
      };
    }
  }

  function limpiarDisqus() {
    // Eliminar el contenedor de Disqus al salir de la lectura
    const wrap = document.getElementById('disqus-section');
    if (wrap) wrap.remove();
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', ()=> AT.init());
