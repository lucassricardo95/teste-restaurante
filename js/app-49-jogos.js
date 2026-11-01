/* =====================================================================
   v1.15 (P-07) — Mini jogos enquanto o cliente espera o pedido
   - Botão "🎮 Jogar enquanto espera" no acompanhamento do pedido (só enquanto o pedido não foi entregue).
   - Tela própria, por cima do acompanhamento, com a BARRA DO PEDIDO no topo (nº e etapa). O acompanhamento
     continua atualizando por baixo; quando a etapa muda, o jogo PAUSA e aparece o aviso grande.
   - 4 jogos, cada um num arquivo, carregado só quando o cliente escolhe (não pesa o cardápio):
     Monte o Burger · Chuva de Ingredientes · Memória Texas · Cobra Smash.
   - Usam as fotos reais do cardápio (miniaturas). Sem foto, usam desenhos.
   - Recorde pessoal guardado só neste aparelho. Som começa DESLIGADO.
   - Se um jogo não carregar, aparece o aviso na tela (nada falha calado).
   ===================================================================== */
(function(){
  'use strict';
  const ARQ = {   // carimbados pelo empacotamento (?v=)
    burger:  'js/jogo-burger.js?v=d67a1a42',
    chuva:   'js/jogo-chuva.js?v=c0a88274',
    memoria: 'js/jogo-memoria.js?v=5246b144',
    cobra:   'js/jogo-cobra.js?v=651a89f6'
  };
  const LISTA = [
    { id:'burger',  ico:'🍔', nome:'Monte o Burger',        dica:'Toque para soltar cada camada em cima da outra.' },
    { id:'chuva',   ico:'🧺', nome:'Chuva de Ingredientes', dica:'Arraste a bandeja: pegue os ingredientes, fuja das bombas.' },
    { id:'memoria', ico:'🃏', nome:'Jogo da Memória',         dica:'Ache os pares de lanches com o menor número de jogadas.' },
    { id:'cobra',   ico:'🐍', nome:'Cobra Smash',           dica:'Deslize o dedo (ou use as setas) para comer os lanches.' }
  ];
  const J = window.Jogos = window.Jogos || {};
  J.registrados = J.registrados || {};
  J.registrar = function(id, jogo){ J.registrados[id] = jogo; };

  /* ---------- recorde (só neste aparelho) e som ---------- */
  const CH = 'tb_jogos_v1';
  function ler_(){ try{ return JSON.parse(localStorage.getItem(CH) || '{}') || {}; }catch(e){ return {}; } }
  function gravar_(o){ try{ localStorage.setItem(CH, JSON.stringify(o)); }catch(e){} }
  J.recorde = id => Number((ler_().rec || {})[id]) || 0;
  J.novoRecorde = function(id, pts, menorMelhor){
    const o = ler_(); o.rec = o.rec || {}; const ant = Number(o.rec[id]) || 0;
    const melhor = !ant || (menorMelhor ? pts < ant : pts > ant);
    if(melhor && pts > 0){ o.rec[id] = pts; gravar_(o); }
    return melhor && pts > 0;
  };
  J.somLigado = () => ler_().som === true;
  let actx = null;
  J.bip = function(freq, ms, tipo){
    if(!J.somLigado()) return;
    try{
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = tipo || 'square'; o.frequency.value = freq || 440; g.gain.value = 0.05;
      o.connect(g); g.connect(actx.destination); o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + (ms || 90) / 1000); o.stop(actx.currentTime + (ms || 90) / 1000 + 0.02);
    }catch(e){}
  };
  J.vibrar = ms => { try{ if(navigator.vibrate) navigator.vibrate(ms || 30); }catch(e){} };

  /* ---------- fotos reais do cardápio (miniaturas) ---------- */
  let fotos = null;
  J.fotos = function(){
    if(fotos) return fotos;
    fotos = [];
    try{
      const d = window.cdDados || {};
      const itens = [].concat(d.produtos || [], d.combos || []).filter(x => x && x.fotoUrl && !(d.esgotados || {})[x.id]);
      itens.slice(0, 16).forEach(x => {
        const img = new Image(); img.decoding = 'async'; img.referrerPolicy = 'no-referrer';
        img.onload = () => { img._ok = true; };
        img.onerror = () => { img._erro = true; };
        img.src = typeof fotoSrc_ === 'function' ? fotoSrc_(x.fotoUrl, 160) : x.fotoUrl;
        img._nome = x.nome || '';
        fotos.push(img);
      });
    }catch(e){}
    return fotos;
  };
  J.fotosProntas = () => (J.fotos() || []).filter(i => i._ok && i.naturalWidth);
  // desenha uma foto recortada em círculo (ou o emoji, se não houver foto)
  J.desenharItem = function(ctx, x, y, r, img, emoji){
    if(img && img._ok){
      ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
      const s = Math.min(img.naturalWidth, img.naturalHeight);
      ctx.drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, x - r, y - r, r * 2, r * 2);
      ctx.restore(); ctx.lineWidth = 2; ctx.strokeStyle = '#d9a21b'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.font = Math.round(r * 1.7) + 'px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(emoji || '🍔', x, y + 1);
    }
  };

  function etapas_(){ try{ return ETAPAS_PEDIDO; }catch(e){ return ['Recebido', 'Em preparo', 'Pronto / saiu', 'Entregue']; } }

  /* ---------- tela dos jogos ---------- */
  let livre = false;   // true = aberto por Minha conta → Jogos (sem pedido sendo acompanhado)
  let atual = null, atualId = '', pedido = { codigo:'', etapa:-1, nome:'', numero:'' };
  function tela_(){
    let m = document.getElementById('jogosTela');
    if(m) return m;
    m = document.createElement('div'); m.id = 'jogosTela'; m.className = 'jogos-tela'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-label', 'Jogos');
    m.innerHTML = '<div class="jg-barra" id="jgBarra" aria-live="polite"></div>'
      + '<div class="jg-topo"><button type="button" class="ghost jg-mini" id="jgVoltarMenu" onclick="Jogos.menu()">← Jogos</button>'
      + '<b id="jgTitulo">🎮 Jogue enquanto espera</b>'
      + '<span><button type="button" class="ghost jg-mini" id="jgSom" onclick="Jogos.alternarSom()" aria-label="Som"></button>'
      + '<button type="button" class="ghost jg-mini" onclick="Jogos.fechar()" aria-label="Fechar jogos">✕</button></span></div>'
      + '<div class="jg-corpo" id="jgCorpo"></div>';
    document.body.appendChild(m);
    return m;
  }
  function somBtn_(){ const b = document.getElementById('jgSom'); if(b) b.textContent = J.somLigado() ? '🔊' : '🔇'; }
  J.alternarSom = function(){ const o = ler_(); o.som = !o.som; gravar_(o); somBtn_(); J.bip(660, 80); };

  function barra_(aviso){
    const b = document.getElementById('jgBarra'); if(!b) return;
    if(livre){ b.innerHTML = ''; b.style.display = 'none'; return; }
    b.style.display = '';
    const nomes = etapas_();
    const et = pedido.etapa;
    const passos = nomes.map((n, i) => '<span class="jg-passo' + (i <= et ? ' ok' : '') + (i === et ? ' agora' : '') + '">' + (i <= et ? '●' : '○') + '</span>').join('');
    b.innerHTML = '<div class="jg-barra-l"><span>📦 Pedido' + (pedido.numero ? ' nº ' + escH(String(pedido.numero)) : '') + '</span><b>' + escH(et === -2 ? 'Cancelado' : (nomes[et] || 'Atualizando…')) + '</b></div><div class="jg-passos">' + passos + '</div>'
      + (aviso ? '<div class="jg-aviso" role="alert">' + aviso + '</div>' : '');
  }

  J.abrir = function(){
    livre = false;
    tela_(); somBtn_(); barra_();
    document.getElementById('jogosTela').classList.add('open');
    try{ document.body.classList.add('jg-aberto'); }catch(e){}
    J.fotos(); J.menu();
  };
  // Minha conta → Jogos: abre direto no jogo escolhido (ou na lista), sem a barra do pedido
  J.abrirLivre = function(id){
    livre = true;
    tela_(); somBtn_(); barra_();
    document.getElementById('jogosTela').classList.add('open');
    try{ document.body.classList.add('jg-aberto'); }catch(e){}
    J.fotos();
    if(id && LISTA.some(g => g.id === id)) J.jogar(id); else J.menu();
  };
  // conteúdo da aba "🎮 Jogos" de Minha conta: o sub menu com os jogos
  J.abaHtml = function(){
    return '<h3 class="ct-h3">Jogos</h3><p class="sub" style="margin:0 0 10px;">Escolha um joguinho para se distrair enquanto o pedido não chega. O recorde fica guardado neste aparelho.</p>'
      + '<div class="jg-lista">' + LISTA.map(g => '<button type="button" class="jg-card" onclick="Jogos.abrirLivre(\'' + g.id + '\')"><span class="jg-ico">' + g.ico + '</span><b>' + g.nome + '</b><small>' + g.dica + '</small>'
        + (J.recorde(g.id) ? '<small class="jg-rec">🏆 Seu recorde: ' + J.recorde(g.id) + (g.id === 'memoria' ? ' jogadas' : ' pts') + '</small>' : '') + '</button>').join('') + '</div>';
  };
  J.fechar = function(){
    parar_();
    const m = document.getElementById('jogosTela'); if(m) m.classList.remove('open');
    try{ document.body.classList.remove('jg-aberto'); }catch(e){}
  };
  function parar_(){ try{ if(atual && atual.parar) atual.parar(); }catch(e){} atual = null; atualId = ''; }

  J.menu = function(){
    parar_();
    const c = document.getElementById('jgCorpo'); if(!c) return;
    document.getElementById('jgTitulo').textContent = '🎮 Jogue enquanto espera';
    document.getElementById('jgVoltarMenu').style.visibility = 'hidden';
    c.innerHTML = '<p class="sub" style="margin:4px 0 10px;text-align:center;">' + (livre ? 'Escolha um joguinho e divirta-se enquanto espera.' : 'Seu pedido continua sendo acompanhado aqui em cima. Quando ele mudar de etapa, o jogo pausa e avisa.') + '</p>'
      + '<div class="jg-lista">' + LISTA.map(g => '<button type="button" class="jg-card" onclick="Jogos.jogar(\'' + g.id + '\')"><span class="jg-ico">' + g.ico + '</span><b>' + g.nome + '</b><small>' + g.dica + '</small>'
        + (J.recorde(g.id) ? '<small class="jg-rec">🏆 Seu recorde: ' + J.recorde(g.id) + (g.id === 'memoria' ? ' jogadas' : ' pts') + '</small>' : '') + '</button>').join('') + '</div>';
  };

  function carregar_(id){
    return new Promise((res, rej) => {
      if(J.registrados[id]) return res(J.registrados[id]);
      const s = document.createElement('script'); s.src = ARQ[id]; s.async = true; s.charset = 'utf-8';
      const t = setTimeout(() => rej(new Error('tempo')), 15000);
      s.onload = () => { clearTimeout(t); J.registrados[id] ? res(J.registrados[id]) : rej(new Error('vazio')); };
      s.onerror = () => { clearTimeout(t); s.remove(); rej(new Error('rede')); };
      document.head.appendChild(s);
    });
  }

  J.jogar = async function(id){
    const g = LISTA.find(x => x.id === id); if(!g) return;
    parar_();
    const c = document.getElementById('jgCorpo');
    document.getElementById('jgTitulo').textContent = g.ico + ' ' + g.nome;
    document.getElementById('jgVoltarMenu').style.visibility = 'visible';
    c.innerHTML = '<div class="obs-line" style="text-align:center;padding:30px 0;">⏳ Carregando o jogo…</div>';
    let jogo;
    try{ jogo = await carregar_(id); }
    catch(e){
      c.innerHTML = '<div class="msg warn" role="alert" style="display:block;">⚠️ Não foi possível carregar este jogo (' + (e.message === 'rede' ? 'sem internet' : 'demorou demais') + '). Confira a conexão e toque em tentar de novo.</div>'
        + '<div class="btnrow mt-2"><button type="button" class="ghost" onclick="Jogos.jogar(\'' + id + '\')">🔄 Tentar de novo</button><button type="button" class="ghost" onclick="Jogos.menu()">← Outros jogos</button></div>';
      try{ if(window.ErrosCliente && ErrosCliente.aviso) ErrosCliente.aviso('Jogo não carregou: ' + id + ' (' + e.message + ')', 'jogos'); }catch(e2){}
      return;
    }
    const larg = Math.min(420, Math.max(260, (c.clientWidth || window.innerWidth) - 4));
    const alt = Math.min(560, Math.max(320, window.innerHeight - 190));
    c.innerHTML = '<div class="jg-placar"><span id="jgPts">0</span><span class="txt-muted" id="jgRec">🏆 ' + (J.recorde(id) || '—') + '</span>'
      + '<button type="button" class="ghost jg-mini" id="jgPausa" onclick="Jogos.pausarOuSeguir()">⏸ Pausar</button></div>'
      + '<div class="jg-palco"><canvas id="jgCanvas" width="' + larg + '" height="' + alt + '" style="width:' + larg + 'px;height:' + alt + 'px;" tabindex="0" aria-label="' + g.nome + '"></canvas><div id="jgSobre" class="jg-sobre" style="display:none;"></div></div>';
    const cv = document.getElementById('jgCanvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(larg * dpr); cv.height = Math.round(alt * dpr);
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    atualId = id;
    atual = jogo;
    try{
      jogo.iniciar({ canvas: cv, ctx, w: larg, h: alt, J,
        pontos: n => { const p = document.getElementById('jgPts'); if(p) p.textContent = String(n); },
        fim: (pts, menorMelhor, texto) => fim_(id, pts, menorMelhor, texto) });
      setTimeout(() => { try{ cv.focus({ preventScroll:true }); }catch(e){} }, 50);
    }catch(e){
      c.innerHTML = '<div class="msg warn" role="alert" style="display:block;">⚠️ O jogo travou ao começar. Tente outro jogo.</div><div class="btnrow mt-2"><button type="button" class="ghost" onclick="Jogos.menu()">← Outros jogos</button></div>';
      try{ if(window.ErrosCliente && ErrosCliente.aviso) ErrosCliente.aviso('Jogo travou: ' + id + ' (' + String(e && e.message || e).slice(0, 120) + ')', 'jogos'); }catch(e2){}
    }
  };
  function sobre_(html){ const s = document.getElementById('jgSobre'); if(!s) return; s.innerHTML = html; s.style.display = html ? 'flex' : 'none'; }
  function fim_(id, pts, menorMelhor, texto){
    const rec = J.novoRecorde(id, pts, menorMelhor);
    J.bip(rec ? 880 : 220, 220, 'triangle'); J.vibrar(rec ? [40, 40, 40] : 60);
    const r = document.getElementById('jgRec'); if(r) r.textContent = '🏆 ' + (J.recorde(id) || '—');
    sobre_('<div class="jg-sobre-box"><div style="font-size:34px;">' + (rec ? '🏆' : '🍔') + '</div><b>' + escH(texto || ('Fim de jogo: ' + pts + ' pts')) + '</b>'
      + (rec ? '<div class="txt-ouro">Novo recorde!</div>' : (J.recorde(id) ? '<div class="txt-muted">Recorde: ' + J.recorde(id) + '</div>' : ''))
      + '<div class="btnrow mt-2"><button type="button" class="primary" onclick="Jogos.jogar(\'' + id + '\')">▶ Jogar de novo</button><button type="button" class="ghost" onclick="Jogos.menu()">Outros jogos</button></div></div>');
  }
  let pausado = false;
  J.pausarOuSeguir = function(forcar){
    if(!atual) return;
    const pausar = forcar === true ? true : forcar === false ? false : !pausado;
    if(pausar === pausado) return;
    pausado = pausar;
    try{ pausar ? (atual.pausar && atual.pausar()) : (atual.continuar && atual.continuar()); }catch(e){}
    const b = document.getElementById('jgPausa'); if(b) b.textContent = pausado ? '▶ Continuar' : '⏸ Pausar';
    if(!pausado) sobre_('');
  };
  J.estaPausado = () => pausado;
  J.aoComecar_ = () => { pausado = false; };   // cada jogo chama ao (re)começar
  document.addEventListener('visibilitychange', () => { if(document.hidden && atual) J.pausarOuSeguir(true); });

  /* ---------- liga no acompanhamento do pedido ---------- */
  function etapaDe_(r){
    if(!r || !r.ok) return null;
    if(r.status === 'Cancelada') return -2;
    try{ return typeof etapaAtualPedido === 'function' ? etapaAtualPedido(r) : 0; }catch(e){ return 0; }
  }
  function mudou_(r, codigo){
    const et = etapaDe_(r); if(et == null) return;
    const antes = pedido.etapa, mesmo = pedido.codigo === codigo;
    pedido = { codigo, etapa: et, numero: r.numero || '', nome: r.clienteNome || '' };
    const aberta = (document.getElementById('jogosTela') || {}).classList && document.getElementById('jogosTela').classList.contains('open');
    if(!aberta || livre) return;
    if(mesmo && antes !== -1 && antes !== et){
      const nomes = etapas_();
      const txt = et === -2 ? '❌ Seu pedido foi cancelado. Veja o motivo no acompanhamento.' : '🔔 Seu pedido agora está: <b>' + escH(nomes[et] || '') + '</b>' + (et >= 3 ? ' — bom apetite!' : '');
      J.pausarOuSeguir(true);
      barra_(txt + '<div class="btnrow mt-1"><button type="button" class="primary jg-mini" onclick="Jogos.fechar()">Ver o pedido</button>' + (atual ? '<button type="button" class="ghost jg-mini" onclick="Jogos.seguirDoAviso()">▶ Continuar jogando</button>' : '') + '</div>');
      J.bip(988, 160, 'sine'); setTimeout(() => J.bip(1318, 220, 'sine'), 170); J.vibrar([120, 60, 120]);
    } else barra_();
  }
  J.seguirDoAviso = function(){ barra_(); J.pausarOuSeguir(false); };

  // observa as respostas do acompanhamento (que já atualiza a cada 20 s) — não faz chamada a mais
  const apiOrig = window.apiCall;
  if(typeof apiOrig === 'function' && !apiOrig.__jogos){
    const novo = async function(a, p){
      const r = await apiOrig.apply(this, arguments);
      if(a === 'getStatusPedidoPublico'){ try{ mudou_(r, String((p && p.codigo) || '')); }catch(e){} }
      return r;
    };
    Object.keys(apiOrig).forEach(k => { try{ novo[k] = apiOrig[k]; }catch(e){} });   // mantém as marcas dos outros embrulhos (__vis, __vin…)
    novo.__jogos = true;
    window.apiCall = novo;
  }
  // depois de desenhar o acompanhamento: botão de jogar (só enquanto o pedido está em andamento)
  const desenharOrig = window.carregarStatusPedido;
  if(typeof desenharOrig === 'function' && !desenharOrig.__jogos){
    const novo = async function(codigo){
      const r = await desenharOrig.apply(this, arguments);
      try{
        const box = document.getElementById('acompanhamentoConteudo');
        if(box && pedido.codigo === String(codigo) && pedido.etapa >= 0 && pedido.etapa < 3 && !document.getElementById('jgAbrirBtn')){
          const d = document.createElement('div'); d.className = 'mt-3';
          d.innerHTML = '<button type="button" class="primary" id="jgAbrirBtn" style="width:100%;" onclick="Jogos.abrir()">🎮 Jogar enquanto espera</button><p class="sub fs-xs mt-1" style="text-align:center;">4 joguinhos rápidos. O pedido continua sendo acompanhado.</p>';
          const ref = document.getElementById('acLocal');
          ref && ref.parentNode === box ? box.insertBefore(d, ref) : box.appendChild(d);
        }
      }catch(e){}
      return r;
    };
    Object.keys(desenharOrig).forEach(k => { try{ novo[k] = desenharOrig[k]; }catch(e){} });
    novo.__jogos = true;
    window.carregarStatusPedido = novo;
  }
  // fechou o acompanhamento: fecha os jogos também
  const voltarOrig = window.voltarParaCardapio;
  if(typeof voltarOrig === 'function' && !voltarOrig.__jogos){
    const novo = function(){ J.fechar(); return voltarOrig.apply(this, arguments); };
    novo.__jogos = true; window.voltarParaCardapio = novo;
  }
  document.addEventListener('keydown', e => {
    const tela = document.getElementById('jogosTela');
    if(!tela || !tela.classList.contains('open')) return;
    if(e.key === 'Escape'){ e.stopImmediatePropagation(); J.fechar(); return; }
    // no computador: as setas e o espaço vão para o jogo mesmo sem clicar no tabuleiro
    const cv = document.getElementById('jgCanvas');
    if(cv && e.target !== cv && /^(Arrow|Enter$| $|[wasd]$)/.test(e.key) && !/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test((e.target && e.target.tagName) || '')){
      e.preventDefault(); cv.dispatchEvent(new KeyboardEvent(e.type, { key:e.key, bubbles:false, cancelable:true }));
    }
  }, true);
  document.addEventListener('keyup', e => {
    const cv = document.getElementById('jgCanvas'), tela = document.getElementById('jogosTela');
    if(cv && tela && tela.classList.contains('open') && e.target !== cv && /^(Arrow|[wasd]$)/.test(e.key)) cv.dispatchEvent(new KeyboardEvent('keyup', { key:e.key }));
  }, true);
})();
