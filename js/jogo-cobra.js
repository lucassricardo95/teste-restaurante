/* v1.15 (P-07) — Cobra Smash: deslize o dedo (ou use as setas) para a cobra comer os lanches do cardápio.
   Cada lanche = +1 e a cobra cresce e acelera. Bateu na parede ou nela mesma, acabou. */
(function(){
  'use strict';
  let o, raf = 0, pausado = false, ultimo = 0, st;
  function novo_(){
    const tam = Math.max(18, Math.floor(Math.min(o.w, o.h - 26) / 16));
    const cols = Math.floor(o.w / tam), lins = Math.floor((o.h - 26) / tam);
    const cx = Math.floor(cols / 2), cy = Math.floor(lins / 2);
    st = { tam, cols, lins, ox:(o.w - cols * tam) / 2, oy:26 + ((o.h - 26) - lins * tam) / 2,
      corpo:[{ x:cx, y:cy }, { x:cx - 1, y:cy }, { x:cx - 2, y:cy }], dir:{ x:1, y:0 }, fila:[], acc:0, intervalo:170, pts:0, fim:false, comida:null, comeco:true };
    comida_(); o.pontos(0);
  }
  function comida_(){
    const fotos = o.J.fotosProntas();
    let p, n = 0;
    do { p = { x:Math.floor(Math.random() * st.cols), y:Math.floor(Math.random() * st.lins) }; n++; } while(n < 200 && st.corpo.some(c => c.x === p.x && c.y === p.y));
    p.foto = fotos.length ? fotos[Math.floor(Math.random() * fotos.length)] : null;
    st.comida = p;
  }
  function virar_(dx, dy){
    if(pausado || st.fim) return;
    st.comeco = false;
    const ult = st.fila.length ? st.fila[st.fila.length - 1] : st.dir;
    if(ult.x === -dx && ult.y === -dy) return;   // não volta para trás
    if(ult.x === dx && ult.y === dy) return;
    if(st.fila.length < 3) st.fila.push({ x:dx, y:dy });
  }
  function andar_(){
    if(st.fila.length) st.dir = st.fila.shift();
    const c = st.corpo[0], n = { x:c.x + st.dir.x, y:c.y + st.dir.y };
    if(n.x < 0 || n.y < 0 || n.x >= st.cols || n.y >= st.lins || st.corpo.slice(0, -1).some(k => k.x === n.x && k.y === n.y)){
      st.fim = true; o.J.bip(140, 300, 'sawtooth'); o.J.vibrar(90);
      setTimeout(() => o.fim(st.pts, false, 'A cobra comeu ' + st.pts + ' lanche(s)!'), 500); return;
    }
    st.corpo.unshift(n);
    if(n.x === st.comida.x && n.y === st.comida.y){ st.pts++; o.pontos(st.pts); o.J.bip(784, 60, 'sine'); o.J.vibrar(15); st.intervalo = Math.max(75, st.intervalo - 5); comida_(); }
    else st.corpo.pop();
  }
  function passo_(t){
    raf = requestAnimationFrame(passo_);
    const ms = Math.min(60, t - (ultimo || t)); ultimo = t;
    if(!pausado && !st.fim && !st.comeco){ st.acc += ms; while(st.acc >= st.intervalo && !st.fim){ st.acc -= st.intervalo; andar_(); } }
    desenhar_();
  }
  function desenhar_(){
    const c = o.ctx, T = st.tam;
    c.fillStyle = '#1d140c'; c.fillRect(0, 0, o.w, o.h);
    c.fillStyle = '#251a0f';
    for(let y = 0; y < st.lins; y++) for(let x = 0; x < st.cols; x++) if((x + y) % 2) c.fillRect(st.ox + x * T, st.oy + y * T, T, T);
    c.strokeStyle = '#d9a21b'; c.lineWidth = 2; c.strokeRect(st.ox - 1, st.oy - 1, st.cols * T + 2, st.lins * T + 2);
    const f = st.comida; o.J.desenharItem(c, st.ox + f.x * T + T / 2, st.oy + f.y * T + T / 2, T * 0.6, f.foto, '🍔');
    st.corpo.forEach((k, i) => {
      c.fillStyle = i === 0 ? '#f2c230' : (i % 2 ? '#c9981a' : '#d9a21b');
      c.beginPath(); if(c.roundRect) c.roundRect(st.ox + k.x * T + 1, st.oy + k.y * T + 1, T - 2, T - 2, i === 0 ? 7 : 4); else c.rect(st.ox + k.x * T + 1, st.oy + k.y * T + 1, T - 2, T - 2); c.fill();
    });
    const h = st.corpo[0]; c.fillStyle = '#111';
    c.beginPath(); c.arc(st.ox + h.x * T + T / 2 + st.dir.x * 3 - st.dir.y * 4, st.oy + h.y * T + T / 2 + st.dir.y * 3 + st.dir.x * -4, 2.2, 0, 7); c.fill();
    c.beginPath(); c.arc(st.ox + h.x * T + T / 2 + st.dir.x * 3 + st.dir.y * 4, st.oy + h.y * T + T / 2 + st.dir.y * 3 + st.dir.x * 4, 2.2, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,.7)'; c.font = '13px sans-serif'; c.textAlign = 'left'; c.fillText('Tamanho: ' + st.corpo.length, 10, 18);
    if(st.comeco){ c.fillStyle = '#d9a21b'; c.font = 'bold 15px sans-serif'; c.textAlign = 'center'; c.fillText('Deslize o dedo para começar', o.w / 2, o.h / 2 - 30); }
  }
  let ini = null;
  const baixo = e => { e.preventDefault(); ini = { x:e.clientX, y:e.clientY }; };
  const cima = e => {
    if(!ini) return; const dx = e.clientX - ini.x, dy = e.clientY - ini.y; ini = null;
    if(Math.max(Math.abs(dx), Math.abs(dy)) < 18){   // toque curto: vira para o lado tocado em relação à cabeça
      const r = o.canvas.getBoundingClientRect(), h = st.corpo[0];
      const tx = (e.clientX - r.left) * (o.w / r.width) - (st.ox + h.x * st.tam + st.tam / 2), ty = (e.clientY - r.top) * (o.h / r.height) - (st.oy + h.y * st.tam + st.tam / 2);
      if(st.dir.x) virar_(0, ty > 0 ? 1 : -1); else virar_(tx > 0 ? 1 : -1, 0);
      return;
    }
    Math.abs(dx) > Math.abs(dy) ? virar_(dx > 0 ? 1 : -1, 0) : virar_(0, dy > 0 ? 1 : -1);
  };
  const tecla = e => {
    const m = { ArrowUp:[0, -1], ArrowDown:[0, 1], ArrowLeft:[-1, 0], ArrowRight:[1, 0], w:[0, -1], s:[0, 1], a:[-1, 0], d:[1, 0] }[e.key];
    if(m){ e.preventDefault(); virar_(m[0], m[1]); }
  };
  window.Jogos.registrar('cobra', {
    iniciar(op){ o = op; pausado = false; o.J.aoComecar_(); novo_(); o.canvas.style.touchAction = 'none';
      o.canvas.addEventListener('pointerdown', baixo); o.canvas.addEventListener('pointerup', cima); o.canvas.addEventListener('keydown', tecla); ultimo = 0; raf = requestAnimationFrame(passo_); },
    pausar(){ pausado = true; }, continuar(){ pausado = false; ultimo = 0; },
    parar(){ cancelAnimationFrame(raf); if(o){ o.canvas.removeEventListener('pointerdown', baixo); o.canvas.removeEventListener('pointerup', cima); o.canvas.removeEventListener('keydown', tecla); } }
  });
})();
