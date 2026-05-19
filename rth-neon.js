/* rth-neon.js v5 — Organic neon sides with scroll reactivity
   - Soft/dim when static
   - Brightens smoothly when user scrolls or touches
   - Gentle slow breathing when idle
   - Small corner accent at top — also reacts to interaction */
(function(){
  var IDLE_OP  = 0.32;   // opacity when completely still
  var ACTIVE_OP= 0.88;   // opacity when scrolling/touching
  var FADE_MS  = 1800;   // ms to fade back to idle after interaction stops

  var currentOp = IDLE_OP;
  var targetOp  = IDLE_OP;
  var lastActive= 0;
  var animating = false;

  // Mark active on scroll / touch
  function onInteract(){
    targetOp  = ACTIVE_OP;
    lastActive= Date.now();
    if(!animating) animate();
  }
  window.addEventListener('scroll',   onInteract, {passive:true});
  window.addEventListener('touchmove',onInteract, {passive:true});
  window.addEventListener('mousemove',onInteract, {passive:true});

  function rng(seed){ return function(){ seed=(seed*9301+49297)%233280; return seed/233280; }; }

  function buildPath(h, side){
    var rand = rng(side==='left' ? 53 : 149);
    var W = 28, cx = W*0.5, steps = 30, seg = h/steps;
    var d = 'M '+cx+' 0 ';
    for(var i=1;i<=steps;i++){
      var mid = Math.sin(Math.PI*i/steps);
      var wob = 1.5 + mid*5;
      var rx1 = (rand()-.5)*wob*2;   var ry1 = (i-.72)*seg;
      var rx2 = (rand()-.5)*wob*2;   var ry2 = (i-.28)*seg;
      var ex  = cx+(rand()-.5)*wob*1.3;
      d += 'C '+(cx+rx1)+' '+ry1+', '+(cx+rx2)+' '+ry2+', '+ex+' '+(i*seg)+' ';
    }
    return {d:d, W:W, h:h};
  }

  var svgs = [];

  function buildSide(side){
    var vh = Math.max(document.documentElement.scrollHeight, window.innerHeight)*1.15;
    var ns = 'http://www.w3.org/2000/svg';
    var p  = buildPath(vh, side);

    var svg = document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 '+p.W+' '+p.h);
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    svg.style.cssText = 'width:100%;height:'+p.h+'px;overflow:visible;display:block;';

    var defs = document.createElementNS(ns,'defs');

    // Gradient: gold-olive → lime → yellow-green
    var gId = 'ng'+side;
    var gr  = document.createElementNS(ns,'linearGradient');
    gr.setAttribute('id',gId); gr.setAttribute('x1','0'); gr.setAttribute('y1','0');
    gr.setAttribute('x2','0'); gr.setAttribute('y2','1');
    [['0%','rgba(180,210,60,0)'],['8%','#a0c835'],
     ['28%','#b8d820'],['50%','#cce810'],
     ['72%','#b8d820'],['92%','#a0c835'],
     ['100%','rgba(180,210,60,0)']].forEach(function(s){
      var st=document.createElementNS(ns,'stop');
      st.setAttribute('offset',s[0]);st.setAttribute('stop-color',s[1]);gr.appendChild(st);
    });
    defs.appendChild(gr);

    // Glow filter
    var fId='nf'+side;
    var f=document.createElementNS(ns,'filter');
    f.setAttribute('id',fId); f.setAttribute('x','-300%'); f.setAttribute('y','-5%');
    f.setAttribute('width','700%'); f.setAttribute('height','110%');
    var bl=document.createElementNS(ns,'feGaussianBlur');
    bl.setAttribute('in','SourceGraphic'); bl.setAttribute('stdDeviation','2.2');
    f.appendChild(bl); defs.appendChild(f);
    svg.appendChild(defs);

    function mkPath(sw,op,filt){
      var path=document.createElementNS(ns,'path');
      path.setAttribute('d',p.d); path.setAttribute('fill','none');
      path.setAttribute('stroke','url(#'+gId+')');
      path.setAttribute('stroke-width',sw); path.setAttribute('stroke-linecap','round');
      path.setAttribute('stroke-linejoin','round'); path.setAttribute('opacity',op);
      if(filt) path.setAttribute('filter','url(#'+fId+')');
      return path;
    }
    svg.appendChild(mkPath('8','0.09',true));
    svg.appendChild(mkPath('3','0.22',true));
    svg.appendChild(mkPath('1.0','1',false));

    // Accent dots
    var dr=rng(side==='left'?91:233);
    [0.16,0.40,0.63,0.84].forEach(function(pos){
      var dot=document.createElementNS(ns,'circle');
      dot.setAttribute('cx',(p.W*.5+(dr()-.5)*6).toFixed(2));
      dot.setAttribute('cy',(p.h*pos).toFixed(2));
      dot.setAttribute('r',(0.6+dr()*.8).toFixed(2));
      dot.setAttribute('fill','#cce810'); dot.setAttribute('opacity','0.6');
      svg.appendChild(dot);
    });

    // ── CORNER ACCENT at top ──
    // Small L-bracket ornament at the very top of each side
    var cornerSize = 14;
    var corner = document.createElementNS(ns,'path');
    var cx2 = p.W * 0.5;
    if(side==='left'){
      corner.setAttribute('d','M '+(cx2+cornerSize)+' 2 L '+cx2+' 2 L '+cx2+' '+(2+cornerSize));
    } else {
      corner.setAttribute('d','M '+(cx2-cornerSize)+' 2 L '+cx2+' 2 L '+cx2+' '+(2+cornerSize));
    }
    corner.setAttribute('fill','none');
    corner.setAttribute('stroke','url(#'+gId+')');
    corner.setAttribute('stroke-width','1.2');
    corner.setAttribute('stroke-linecap','round');
    corner.setAttribute('opacity','0.75');
    svg.appendChild(corner);

    // Wrap
    var wrap = document.createElement('div');
    wrap.style.cssText = [
      'position:fixed','top:0',
      side+':clamp(2px,0.6vw,6px)',
      'width:clamp(16px,2vw,28px)',
      'height:100vh',
      'pointer-events:none',
      'z-index:20',
      'overflow:visible'
    ].join(';');
    wrap.appendChild(svg);
    svgs.push(svg);
    return wrap;
  }

  // Slow idle breathing + smooth active transition
  var breathT = 0;
  function animate(){
    animating = true;
    var now = Date.now();

    // Fade back to idle after FADE_MS with no interaction
    if(now - lastActive > FADE_MS){
      targetOp = IDLE_OP;
    }

    // Smooth lerp toward target
    currentOp += (targetOp - currentOp) * 0.04;

    // Add gentle breathing on top when idle
    breathT += 0.004;
    var breath = currentOp + Math.sin(breathT) * 0.06;
    breath = Math.max(0.1, Math.min(1.0, breath));

    svgs.forEach(function(s){ s.style.opacity = breath.toFixed(3); });

    if(Math.abs(currentOp - targetOp) > 0.001 || targetOp === ACTIVE_OP){
      requestAnimationFrame(animate);
    } else {
      // Just breathe
      requestAnimationFrame(function breathOnly(){
        breathT += 0.004;
        var b = IDLE_OP + Math.sin(breathT) * 0.06;
        svgs.forEach(function(s){ s.style.opacity = b.toFixed(3); });
        requestAnimationFrame(breathOnly);
      });
      animating = false;
    }
  }

  function init(){
    document.body.appendChild(buildSide('left'));
    document.body.appendChild(buildSide('right'));
    // Start breathing loop immediately
    requestAnimationFrame(function breathLoop(){
      breathT += 0.004;
      var b = currentOp + Math.sin(breathT) * 0.06;
      svgs.forEach(function(s){ s.style.opacity = b.toFixed(3); });
      requestAnimationFrame(breathLoop);
    });
  }

  document.readyState==='loading'
    ? document.addEventListener('DOMContentLoaded',init)
    : init();
})();
