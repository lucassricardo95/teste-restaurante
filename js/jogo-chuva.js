/* v1.15 (P-07) — Chuva de Ingredientes: arraste a bandeja para pegar o que cai.
   Ingrediente = +1; lanche do cardápio (foto) = +3; bomba = perde uma vida; ingrediente que cai no chão = perde uma vida. 3 vidas. */
(function(){
  'use strict';
  const BONS = ['🥬', '🍅', '🧀', '🥓', '🧅', '🥩', '🍞'];
  let o, raf = 0, pausado = false, ultimo = 0, st;
  function novo_(){
    st = { x:o.w / 2, larg:Math.max(70, o.w * 0.22), itens:[], pts:0, vidas:3, prox:0, t:0, fim:false, efeitos:[], teclas:{} };
    o.pontos(0);
  }
  function soltar_(){
    const fotos = o.J.fotosProntas(), dif = Math.min(1, st.t / 90000);
    const bomba = Math.random() < 0.18 + dif * 0.14;
    const foto = !bomba && fotos.length && Math.random() < 0.3 ? fotos[Math.floor(Math.random() * fotos.length)] : null;
    st.itens.push({ x:20 + Math.random() * (o.w - 40), y:-24, r:foto ? 20 : 17, vy:(1.6 + dif * 3 + Math.random() * 0.8),
      bomba, foto, emoji: bomba ? '💣' : BONS[Math.floor(Math.random() * BONS.length)], giro:(Math.random() - 0.5) * 0.06, ang:0 });
    st.prox = Math.max(320, 950 - dif * 600 - Math.random() * 200);
  }
  function efeito_(x, y, txt, cor){ st.efeitos.push({ x, y, txt, cor, vida:1 }); }
  function perder_(x, y, txt){
    st.vidas--; efeito_(x, y, txt, '#e5534b'); o.J.bip(160, 180, 'sawtooth'); o.J.vibrar(80);
    if(st.vidas <= 0 && !st.fim){ st.fim = true; setTimeout(() => o.fim(st.pts, false, 'Você fez ' + st.pts + ' pontos!'), 500); }
  }
  function passo_(t){
    raf = requestAnimationFrame(passo_);
    const ms = Math.min(40, t - (ultimo || t)), dt = ms / 16.7; ultimo = t;
    if(pausado || st.fim){ desenhar_(); return; }
    st.t += ms; st.prox -= ms; if(st.prox <= 0) soltar_();
    if(st.teclas.e) st.x -= 7 * dt; if(st.teclas.d) st.x += 7 * dt;
    st.x = Math.max(st.larg / 2, Math.min(o.w - st.larg / 2, st.x));
    const yb = o.h - 34;
    st.itens.forEach(i => {
      i.y += i.vy * dt; i.ang += i.giro * dt;
      if(!i.fora && i.y + i.r >= yb && i.y - i.r <= yb + 14 && Math.abs(i.x - st.x) < st.larg / 2 + i.r * 0.4){
        i.fora = true;
        if(i.bomba) perder_(i.x, yb - 20, '💥');
        else { const p = i.foto ? 3 : 1; st.pts += p; o.pontos(st.pts); efeito_(i.x, yb - 20, '+' + p, '#d9a21b'); o.J.bip(i.foto ? 988 : 660, 50); }
      } else if(!i.fora && i.y - i.r > o.h){ i.fora = true; if(!i.bomba) perder_(i.x, o.h - 50, 'caiu!'); }
    });
    st.itens = st.itens.filter(i => !i.fora);
    st.efeitos.forEach(e => { e.y -= 0.8 * dt; e.vida -= 0.025 * dt; });
    st.efeitos = st.efeitos.filter(e => e.vida > 0);
    desenhar_();
  }
  function desenhar_(){
    const c = o.ctx;
    const g = c.createLinearGradient(0, 0, 0, o.h); g.addColorStop(0, '#16202a'); g.addColorStop(1, '#2c1e10');
    c.fillStyle = g; c.fillRect(0, 0, o.w, o.h);
    st.itens.forEach(i => { c.save(); c.translate(i.x, i.y); c.rotate(i.ang); o.J.desenharItem(c, 0, 0, i.r, i.foto, i.emoji); c.restore(); });
    // bandeja
    const yb = o.h - 34;
    c.fillStyle = '#8a5a2b'; c.strokeStyle = '#d9a21b'; c.lineWidth = 2;
    c.beginPath(); if(c.roundRect) c.roundRect(st.x - st.larg / 2, yb, st.larg, 14, 6); else c.rect(st.x - st.larg / 2, yb, st.larg, 14); c.fill(); c.stroke();
    c.fillStyle = '#3b2a17'; c.fillRect(0, o.h - 8, o.w, 8);
    st.efeitos.forEach(e => { c.globalAlpha = Math.max(0, e.vida); c.fillStyle = e.cor; c.font = 'bold 18px sans-serif'; c.textAlign = 'center'; c.fillText(e.txt, e.x, e.y); c.globalAlpha = 1; });
    c.font = '18px serif'; c.textAlign = 'left'; c.fillText('❤️'.repeat(Math.max(0, st.vidas)) + '🤍'.repeat(Math.max(0, 3 - st.vidas)), 8, 24);
    if(st.t < 2500 && !st.fim){ c.fillStyle = '#d9a21b'; c.font = 'bold 15px sans-serif'; c.textAlign = 'center'; c.fillText('Arraste a bandeja · fuja das 💣', o.w / 2, o.h / 2); }
  }
  function xDo_(e){ const r = o.canvas.getBoundingClientRect(); return (e.clientX - r.left) * (o.w / r.width); }
  let arrastando = false;
  const baixo = e => { e.preventDefault(); arrastando = true; try{ o.canvas.setPointerCapture(e.pointerId); }catch(x){} st.x = xDo_(e); };
  const move = e => { if(arrastando || e.pointerType === 'mouse'){ st.x = xDo_(e); } };
  const cima = () => { arrastando = false; };
  const kd = e => { if(e.key === 'ArrowLeft' || e.key === 'a'){ st.teclas.e = true; e.preventDefault(); } if(e.key === 'ArrowRight' || e.key === 'd'){ st.teclas.d = true; e.preventDefault(); } };
  const ku = e => { if(e.key === 'ArrowLeft' || e.key === 'a') st.teclas.e = false; if(e.key === 'ArrowRight' || e.key === 'd') st.teclas.d = false; };
  window.Jogos.registrar('chuva', {
    iniciar(op){ o = op; pausado = false; o.J.aoComecar_(); novo_(); o.canvas.style.touchAction = 'none';
      o.canvas.addEventListener('pointerdown', baixo); o.canvas.addEventListener('pointermove', move); o.canvas.addEventListener('pointerup', cima); o.canvas.addEventListener('pointercancel', cima);
      o.canvas.addEventListener('keydown', kd); o.canvas.addEventListener('keyup', ku); ultimo = 0; raf = requestAnimationFrame(passo_); },
    pausar(){ pausado = true; st.teclas = {}; }, continuar(){ pausado = false; ultimo = 0; },
    parar(){ cancelAnimationFrame(raf); if(o){ ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'keydown', 'keyup'].forEach((ev, i) => o.canvas.removeEventListener(ev, [baixo, move, cima, cima, kd, ku][i])); } }
  });
})();
