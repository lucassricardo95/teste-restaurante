/* v1.15 (P-07) — Monte o Burger: a camada anda de um lado para o outro; toque para soltar em cima da pilha.
   O que passar da borda cai fora e a próxima camada fica menor. Soltou certinho = camada perfeita (+2). */
(function(){
  'use strict';
  const CAMADAS = [
    { n:'Carne',   c:'#6b3a1e', b:'#4a2410', h:16 },
    { n:'Queijo',  c:'#f2c230', b:'#c9981a', h:8 },
    { n:'Alface',  c:'#58a83a', b:'#3d7a26', h:9 },
    { n:'Tomate',  c:'#d8432f', b:'#a52d1f', h:10 },
    { n:'Bacon',   c:'#b8513a', b:'#7e2f20', h:8 },
    { n:'Cebola',  c:'#e8d9c4', b:'#b8a68c', h:7 },
    { n:'Picles',  c:'#7aa33a', b:'#56782a', h:7 }
  ];
  let o, raf = 0, pausado = false, ultimo = 0, st;
  function novo_(){
    const larg0 = Math.round(o.w * 0.62);
    st = { pilha:[{ x:(o.w - larg0) / 2, w:larg0, y:o.h - 40, h:22, c:'#d79a3c', b:'#a8701f', pao:true }],
      atual:null, dir:1, vel:1.6, pts:0, perfeitas:0, cam:0, caindo:[], fim:false, brilho:0 };
    proxima_();
    o.pontos(0);
  }
  function topo_(){ return st.pilha[st.pilha.length - 1]; }
  function proxima_(){
    const t = topo_(), k = CAMADAS[(st.pilha.length - 1) % CAMADAS.length];
    st.atual = { x: st.dir > 0 ? -t.w * 0.2 : o.w - t.w * 0.8, w:t.w, y:t.y - k.h, h:k.h, c:k.c, b:k.b, n:k.n };
    st.vel = Math.min(6, 1.6 + st.pilha.length * 0.12);
  }
  function soltar_(){
    if(pausado || st.fim || !st.atual) return;
    const a = st.atual, t = topo_();
    const ini = Math.max(a.x, t.x), fim = Math.min(a.x + a.w, t.x + t.w), sobra = fim - ini;
    if(sobra <= 0){ st.caindo.push(Object.assign({ vy:0 }, a)); st.atual = null; st.fim = true; o.J.bip(150, 300, 'sawtooth');
      setTimeout(() => o.fim(st.pts, false, 'Você empilhou ' + (st.pilha.length - 1) + ' camada(s)!'), 700); return; }
    if(Math.abs(a.x - t.x) <= 4){   // perfeita
      a.x = t.x; a.w = t.w; st.pts += 3; st.perfeitas++; st.brilho = 1; o.J.bip(1046, 90, 'sine'); o.J.vibrar(20);
    } else {
      const corte = a.x < t.x ? { x:a.x, w:t.x - a.x } : { x:fim, w:a.x + a.w - fim };
      st.caindo.push(Object.assign({ vy:0 }, a, corte));
      a.x = ini; a.w = sobra; st.pts += 1; o.J.bip(523, 60);
    }
    st.pilha.push(a);
    st.dir = -st.dir;
    o.pontos(st.pts);
    proxima_();
  }
  function passo_(t){
    raf = requestAnimationFrame(passo_);
    const dt = Math.min(40, t - (ultimo || t)) / 16.7; ultimo = t;
    if(pausado) return;
    if(st.atual){
      st.atual.x += st.dir * st.vel * dt;
      if(st.atual.x + st.atual.w > o.w + 30){ st.dir = -1; } else if(st.atual.x < -30){ st.dir = 1; }
    }
    st.caindo.forEach(p => { p.vy += 0.5 * dt; p.y += p.vy * dt; });
    st.caindo = st.caindo.filter(p => p.y < o.h - st.cam + 400);
    const alvo = Math.max(0, (o.h * 0.45) - (st.atual ? st.atual.y : topo_().y));
    st.cam += (alvo - st.cam) * 0.08 * dt;
    st.brilho = Math.max(0, st.brilho - 0.04 * dt);
    desenhar_();
  }
  function camada_(c, p){
    c.fillStyle = p.c; c.strokeStyle = p.b; c.lineWidth = 2;
    const y = p.y + st.cam, r = p.pao ? 10 : Math.min(5, p.h / 2);
    c.beginPath();
    if(c.roundRect) c.roundRect(p.x, y, p.w, p.h, r); else c.rect(p.x, y, p.w, p.h);
    c.fill(); c.stroke();
    if(p.n === 'Alface'){ c.fillStyle = 'rgba(255,255,255,.15)'; for(let x = p.x + 6; x < p.x + p.w - 4; x += 12) c.fillRect(x, y + 2, 5, 2); }
  }
  function desenhar_(){
    const c = o.ctx;
    const g = c.createLinearGradient(0, 0, 0, o.h); g.addColorStop(0, '#1d140c'); g.addColorStop(1, '#2c1e10');
    c.fillStyle = g; c.fillRect(0, 0, o.w, o.h);
    c.fillStyle = '#3b2a17'; c.fillRect(0, o.h - 18 + st.cam, o.w, 400);   // tábua
    st.pilha.forEach(p => camada_(c, p));
    if(st.atual) camada_(c, st.atual);
    st.caindo.forEach(p => { c.globalAlpha = 0.8; camada_(c, p); c.globalAlpha = 1; });
    if(st.brilho > 0){ c.fillStyle = 'rgba(217,162,27,' + (st.brilho * 0.5) + ')'; c.font = 'bold 22px sans-serif'; c.textAlign = 'center'; c.fillText('PERFEITA! +3', o.w / 2, 60); }
    c.fillStyle = 'rgba(255,255,255,.7)'; c.font = '13px sans-serif'; c.textAlign = 'left';
    c.fillText('Camadas: ' + (st.pilha.length - 1) + (st.atual ? '  ·  agora: ' + st.atual.n : ''), 10, 22);
    if(st.pilha.length === 1 && !st.fim){ c.textAlign = 'center'; c.fillStyle = '#d9a21b'; c.font = 'bold 16px sans-serif'; c.fillText('Toque na tela para soltar', o.w / 2, o.h / 2); }
  }
  const toque = e => { e.preventDefault(); soltar_(); };
  const tecla = e => { if(e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown'){ e.preventDefault(); soltar_(); } };
  window.Jogos.registrar('burger', {
    iniciar(op){ o = op; pausado = false; o.J.aoComecar_(); novo_(); o.canvas.addEventListener('pointerdown', toque); o.canvas.addEventListener('keydown', tecla); ultimo = 0; raf = requestAnimationFrame(passo_); },
    pausar(){ pausado = true; }, continuar(){ pausado = false; ultimo = 0; },
    parar(){ cancelAnimationFrame(raf); if(o){ o.canvas.removeEventListener('pointerdown', toque); o.canvas.removeEventListener('keydown', tecla); } }
  });
})();
