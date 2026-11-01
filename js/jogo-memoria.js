/* v1.15 (P-07) — Memória Texas: 12 cartas (6 pares) com as fotos dos lanches do cardápio. Menos jogadas = melhor recorde. */
(function(){
  'use strict';
  const EMOJIS = ['🍔', '🍟', '🌭', '🥤', '🧀', '🥓', '🍕', '🍦'];
  let o, raf = 0, pausado = false, st;
  function embaralhar_(a){ for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function novo_(){
    const fotos = embaralhar_(o.J.fotosProntas().slice());
    const faces = [];
    for(let k = 0; k < 6; k++) faces.push(fotos[k] ? { foto:fotos[k], id:'f' + k } : { emoji:EMOJIS[k], id:'e' + k });
    const cartas = embaralhar_(faces.concat(faces).map(f => ({ face:f, aberta:false, achada:false, giro:0 })));
    const cols = 3, lins = 4, gap = 10;
    const cw = Math.min(110, (o.w - gap * (cols + 1)) / cols), chh = Math.min(cw * 1.25, (o.h - 30 - gap * (lins + 1)) / lins);
    const x0 = (o.w - (cw * cols + gap * (cols - 1))) / 2, y0 = 30 + ((o.h - 30) - (chh * lins + gap * (lins - 1))) / 2;
    cartas.forEach((c, i) => { c.x = x0 + (i % cols) * (cw + gap); c.y = y0 + Math.floor(i / cols) * (chh + gap); c.w = cw; c.h = chh; });
    st = { cartas, abertas:[], jogadas:0, pares:0, trava:false, fim:false, t0:Date.now() };
    o.pontos('0 jogadas');
  }
  function clicar_(x, y){
    if(pausado || st.trava || st.fim) return;
    const c = st.cartas.find(k => x >= k.x && x <= k.x + k.w && y >= k.y && y <= k.y + k.h);
    if(!c || c.aberta || c.achada) return;
    c.aberta = true; st.abertas.push(c); o.J.bip(520, 40);
    if(st.abertas.length < 2) return;
    st.jogadas++; o.pontos(st.jogadas + ' jogada' + (st.jogadas > 1 ? 's' : ''));
    const [a, b] = st.abertas;
    if(a.face.id === b.face.id){
      a.achada = b.achada = true; st.abertas = []; st.pares++; o.J.bip(880, 90, 'sine'); o.J.vibrar(20);
      if(st.pares === 6){ st.fim = true; const seg = Math.round((Date.now() - st.t0) / 1000);
        setTimeout(() => o.fim(st.jogadas, true, 'Achou os 6 pares em ' + st.jogadas + ' jogadas (' + seg + ' s)!'), 500); }
    } else {
      st.trava = true;
      setTimeout(() => { a.aberta = b.aberta = false; st.abertas = []; st.trava = false; }, 750);
    }
  }
  function carta_(c, k){
    const alvo = (k.aberta || k.achada) ? 1 : 0; k.giro += (alvo - k.giro) * 0.25;
    const esc = Math.abs(k.giro * 2 - 1), frente = k.giro > 0.5;
    c.save(); c.translate(k.x + k.w / 2, k.y + k.h / 2); c.scale(Math.max(0.02, esc), 1);
    c.fillStyle = frente ? (k.achada ? '#2f2416' : '#f6ead2') : '#8a1f17'; c.strokeStyle = '#d9a21b'; c.lineWidth = 2;
    c.beginPath(); if(c.roundRect) c.roundRect(-k.w / 2, -k.h / 2, k.w, k.h, 10); else c.rect(-k.w / 2, -k.h / 2, k.w, k.h); c.fill(); c.stroke();
    if(frente){ c.globalAlpha = k.achada ? 0.75 : 1; o.J.desenharItem(c, 0, 0, Math.min(k.w, k.h) * 0.38, k.face.foto, k.face.emoji); c.globalAlpha = 1; }
    else { c.fillStyle = '#d9a21b'; c.font = 'bold ' + Math.round(k.w * 0.22) + 'px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('TB', 0, 1); }
    c.restore();
  }
  function passo_(){
    raf = requestAnimationFrame(passo_);
    const c = o.ctx; c.fillStyle = '#1d140c'; c.fillRect(0, 0, o.w, o.h);
    c.fillStyle = 'rgba(255,255,255,.7)'; c.font = '13px sans-serif'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillText('Pares: ' + st.pares + ' de 6', 10, 20);
    st.cartas.forEach(k => carta_(c, k));
  }
  const toque = e => { e.preventDefault(); const r = o.canvas.getBoundingClientRect(); clicar_((e.clientX - r.left) * (o.w / r.width), (e.clientY - r.top) * (o.h / r.height)); };
  window.Jogos.registrar('memoria', {
    iniciar(op){ o = op; pausado = false; o.J.aoComecar_(); novo_(); o.canvas.addEventListener('pointerdown', toque); raf = requestAnimationFrame(passo_); },
    pausar(){ pausado = true; }, continuar(){ pausado = false; },
    parar(){ cancelAnimationFrame(raf); if(o) o.canvas.removeEventListener('pointerdown', toque); }
  });
})();
