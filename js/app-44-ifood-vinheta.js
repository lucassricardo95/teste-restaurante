/* =====================================================================
   VINHETA DO iFOOD (P-06, v1.15)
   - Pedido do iFood esperando aceite toca a vinheta do iFood (sons/ifood-novo-pedido.mp3),
     com o app aberto na tela, mesmo com as notificações ligadas (a notificação fica sem som).
   - Repete a cada 30 s até o pedido ser aceito/recusado/cancelado, por no máximo 10 min por pedido.
   - Botão "Silenciar" para este aparelho. Respeita o "Som: ligado/desligado".
   - Toca para quem vê o pedido do iFood esperando aceite: Admin, Operador e Cozinha
     (Garçom e Entregador não veem esses pedidos).
   - Se o som não carregar ou o celular bloquear, toca o bipe de sempre.
   - Com o app em segundo plano/tela apagada vale o som padrão da notificação (limite do navegador).
   ===================================================================== */
(function(){
  'use strict';
  var URL_ = 'sons/ifood-novo-pedido.mp3', INTERVALO_ = 30000, LIMITE_ = 600000;
  var buf = null, carregando = null, pend = {}, silenciados = {}, timer = null, ultimaAtualizacao = 0, tocandoAte = 0;

  function ctx_(){ try{ return typeof audioCtx_ === 'function' ? audioCtx_() : null; }catch(e){ return null; } }
  function carregar_(){
    if(buf || carregando) return carregando;
    var c = ctx_(); if(!c) return null;
    carregando = fetch(URL_).then(function(r){ if(!r.ok) throw new Error('som ' + r.status); return r.arrayBuffer(); })
      .then(function(ab){ return new Promise(function(ok, falha){ try{ var p = c.decodeAudioData(ab, ok, falha); if(p && p.then) p.then(ok, falha); }catch(e){ falha(e); } }); })
      .then(function(b){ buf = b; return b; })
      .catch(function(){ carregando = null; return null; });
    return carregando;
  }
  function bipe_(){
    /* o bipe de 4 notas, mesmo com notificação ligada (o som do iFood não pode ficar mudo) */
    try{
      var c = ctx_(); if(!c) return;
      if(c.state === 'suspended') c.resume();
      [0, 0.35, 0.7, 1.05].forEach(function(t, i){
        var o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.value = i % 2 ? 740 : 988;
        o.connect(g); g.connect(c.destination); var ini = c.currentTime + t;
        g.gain.setValueAtTime(0.0001, ini); g.gain.exponentialRampToValueAtTime(0.5, ini + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ini + 0.27);
        o.start(ini); o.stop(ini + 0.3);
      });
    }catch(e){}
  }
  function tocar_(forcar){
    if(!forcar && typeof cozinhaSomLigado !== 'undefined' && !cozinhaSomLigado) return;
    if(Date.now() < tocandoAte) return;                      /* sem sobrepor vinhetas */
    tocandoAte = Date.now() + 1500;
    try{ if(navigator.vibrate) navigator.vibrate([200, 100, 200]); }catch(e){}
    var c = ctx_();
    var tocarBuf = function(b){
      try{
        if(!b || !c) throw 0;
        if(c.state === 'suspended') c.resume();
        if(c.state !== 'running') throw 0;
        var s = c.createBufferSource(), g = c.createGain(); g.gain.value = 1;
        s.buffer = b; s.connect(g); g.connect(c.destination); s.start(0); return true;
      }catch(e){ return false; }
    };
    if(buf){ if(!tocarBuf(buf)) tentarElemento_(); return; }
    var pr = carregar_();
    if(pr) pr.then(function(b){ if(!tocarBuf(b)) tentarElemento_(); });
    else tentarElemento_();
  }
  function tentarElemento_(){
    try{
      var a = new Audio(URL_); a.volume = 1;
      var p = a.play(); if(p && p.catch) p.catch(function(){ bipe_(); });
    }catch(e){ bipe_(); }
  }

  /* ---------- faixa "pedido do iFood esperando" com Silenciar ---------- */
  function faixa_(ativos){
    var f = document.getElementById('ifoodVinhetaFaixa');
    if(!ativos.length){ if(f) f.remove(); return; }
    if(!f){
      f = document.createElement('div'); f.id = 'ifoodVinhetaFaixa'; f.setAttribute('role', 'alert');
      f.style.cssText = 'position:fixed;left:10px;right:10px;bottom:72px;z-index:9997;background:#ea1d2c;color:#fff;border-radius:12px;padding:10px 12px;font:700 14px system-ui,sans-serif;display:flex;gap:8px;align-items:center;justify-content:space-between;box-shadow:0 6px 22px rgba(0,0,0,.45);';
      document.body.appendChild(f);
    }
    var silenciado = ativos.every(function(id){ return silenciados[id]; });
    f.innerHTML = '<span>🛵 ' + ativos.length + ' pedido' + (ativos.length > 1 ? 's' : '') + ' do iFood esperando aceite' + (silenciado ? ' (som silenciado)' : '') + '</span>'
      + '<span style="display:flex;gap:6px;flex:0 0 auto;"><button type="button" id="ifoodVinVer" style="background:#fff;color:#ea1d2c;border:0;border-radius:8px;padding:7px 10px;font-weight:800;">Ver</button>'
      + (silenciado ? '' : '<button type="button" id="ifoodVinSil" style="background:rgba(0,0,0,.25);color:#fff;border:1px solid rgba(255,255,255,.6);border-radius:8px;padding:7px 10px;font-weight:700;">🔇 Silenciar</button>') + '</span>';
    var v = document.getElementById('ifoodVinVer');
    if(v) v.onclick = function(){ try{ if(typeof abrirPedidosPainel_ === 'function') abrirPedidosPainel_('pedidos'); else { var b = document.querySelector('.tab-btn[data-tab="pedidos"]'); if(b) b.click(); } }catch(e){} };
    var s = document.getElementById('ifoodVinSil');
    if(s) s.onclick = function(){ ativos.forEach(function(id){ silenciados[id] = true; }); faixa_(ativos); };
  }
  function ativos_(){
    var agora = Date.now();
    return Object.keys(pend).filter(function(id){ return agora - pend[id] < LIMITE_; });
  }
  function ciclo_(){
    clearTimeout(timer); timer = null;
    var at = ativos_();
    faixa_(Object.keys(pend));
    if(!at.length) return;
    var tocaveis = at.filter(function(id){ return !silenciados[id]; });
    if(tocaveis.length) tocar_(false);
    /* confere de novo no servidor se o pedido ainda espera (outro aparelho pode ter aceitado) */
    if(Date.now() - ultimaAtualizacao > 45000){ try{ if(typeof detectarNovosCozinha_ === 'function') detectarNovosCozinha_(false); }catch(e){} }
    timer = setTimeout(ciclo_, INTERVALO_);
  }
  function podeOuvir_(){ try{ return !!(currentUser && ['Admin', 'Operador', 'Cozinha', 'Desenvolvedor'].indexOf(currentUser.nivel) !== -1); }catch(e){ return false; } }

  /* o detector devolve a lista de pedidos do iFood esperando aceite (53-ifood-dia-a-dia.sql) */
  window.ifoodVinhetaAtualizar_ = function(lista){
    if(!podeOuvir_()) return;
    ultimaAtualizacao = Date.now();
    var novos = {}, agora = Date.now(), houveNovo = false;
    (lista || []).forEach(function(id){ novos[id] = pend[id] || agora; if(!pend[id]) houveNovo = true; });
    pend = novos;
    Object.keys(silenciados).forEach(function(id){ if(!pend[id]) delete silenciados[id]; });
    if(!Object.keys(pend).length){ clearTimeout(timer); timer = null; faixa_([]); return; }
    if(!timer) timer = setTimeout(ciclo_, INTERVALO_);
    faixa_(Object.keys(pend));
    if(houveNovo) carregar_();
  };
  window.avisarNovoPedidoIfood_ = function(qtd){
    try{ if(typeof alertaVisualCozinha_ === 'function') alertaVisualCozinha_(qtd); }catch(e){}
    tocar_(false);
    try{ mostrarNotificacao_('🛵 Pedido do iFood!', qtd > 1 ? qtd + ' pedidos do iFood esperando aceite.' : 'Chegou um pedido do iFood. Aceite em Pedidos.', { tag:'texas-ifood', silencioso: !document.hidden }); }catch(e){}
  };
  window.testarVinhetaIfood_ = function(){
    try{ if(typeof desbloquearAudio_ === 'function') desbloquearAudio_(); }catch(e){}
    tocandoAte = 0; tocar_(true);
    try{ showMsg('avisosMsg', 'Você deve ouvir a vinheta do iFood. Se ouvir um bipe, o celular bloqueou o arquivo de som: toque na tela e teste de novo. Se não ouvir nada, aumente o volume de mídia.', 'ok'); }catch(e){}
  };
  /* pega a resposta do detector sem mudar o detector */
  (function(){
    var o = window.apiCall; if(typeof o !== 'function' || o.__vin) return;
    var n = async function(action){
      var r = await o.apply(this, arguments);
      try{ if(action === 'detectarNovosPedidos' && r && r.ok && Array.isArray(r.ifood)) window.ifoodVinhetaAtualizar_(r.ifood); }catch(e){}
      return r;
    };
    n.__vin = true; n.__vis = o.__vis; window.apiCall = n;
  })();
  /* carrega o som no primeiro toque (o celular só libera áudio depois de um toque) */
  document.addEventListener('pointerdown', function(){ if(podeOuvir_()) carregar_(); }, { once:true, passive:true });
})();
