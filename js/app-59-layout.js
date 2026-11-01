/* =====================================================================
   v1.23 — Layout da área da equipe (revisão visual de 29/10/2026)
   • body.eq quando alguém entrou no sistema (o estilo novo, css/estilo-sistema.css, só vale aí);
   • no computador o menu principal vai para dentro da barra do topo (uma linha só: marca | menu | ferramentas);
   • o mascote Tex sai da frente quando a pessoa rola a página para baixo e volta ao rolar para cima;
   • títulos com emoji ganham o ícone de linha do sistema (mesmo conjunto dos botões).
   ===================================================================== */
(function(){
  'use strict';
  var wrap = null;
  function logado_(){ return !!(wrap && wrap.classList.contains('unlocked')); }

  /* ---------- body.eq e menu dentro da barra do topo ---------- */
  function ajustar_(){
    wrap = wrap || document.getElementById('mainWrap');
    document.body.classList.toggle('eq', logado_());
    var head = document.querySelector('#mainWrap > header.brand'), nav = document.querySelector('nav.tabs');
    if(head && nav && nav.parentNode !== head){
      var ub = head.querySelector('.userbar');
      head.insertBefore(nav, ub || null);
    }
  }

  /* ---------- Tex some ao rolar para baixo ---------- */
  var ultimoY = 0, pend = false;
  function rolagem_(){
    if(pend) return; pend = true;
    requestAnimationFrame(function(){
      pend = false;
      var b = document.getElementById('balaoIa'); if(!b || !document.body.classList.contains('eq')) return;
      var y = window.scrollY || 0;
      if(y > ultimoY + 6 && y > 160) b.classList.add('escondido-rolagem');
      else if(y < ultimoY - 6 || y < 160) b.classList.remove('escondido-rolagem');
      ultimoY = y;
    });
  }

  /* ---------- ícone de linha no lugar do emoji, nos títulos ---------- */
  var MAPA = {
    '📦':'estoque', '☁':'nuvem', '💾':'salvar', '🗓':'calendario', '📅':'calendario', '🧹':'vassoura', '🔒':'cadeado', '🔐':'cadeado',
    '📋':'lista', '🍽':'talheres', '🌐':'globo', '🛟':'boia', '📗':'planilha', '📊':'painel', '📈':'painel', '📉':'painel',
    '⏱':'inativo', '🕒':'inativo', '⏰':'inativo', '⌛':'inativo', '🕘':'inativo', '📷':'camera', '🔊':'som', '🔗':'link', '📎':'link',
    '👁':'olho', '🛒':'carrinho', '🗂':'pasta', '📁':'pasta', '🎮':'jogo', '🧭':'mapa', '🗺':'mapa', '🎟':'campanhas', '🏷':'campanhas',
    '🧮':'calculadora', '🩺':'saude', '👤':'pessoa', '👥':'pessoa', '💬':'atendimento', '📝':'documento', '📜':'documento', '📄':'documento',
    '❓':'ajuda', '🗄':'banco', '🍔':'catalogo', '💰':'dinheiro', '💵':'dinheiro', '💲':'dinheiro', '💳':'cartao', '🏁':'bandeira', '📱':'celular',
    '📲':'celular', '⚙':'engrenagem', '🛠':'engrenagem', '🔧':'engrenagem', '🔎':'busca', '🔍':'busca', '🛵':'entrega', '🚚':'entrega',
    '🎁':'presente', '⭐':'fidelidade', '🔔':'sino', '🧾':'pedido', '🖨':'imprimir', '⚠':'alerta', '🚨':'alerta', '📍':'pin', '🔄':'atualizar',
    '🔁':'repetir', '✏':'editar', '🗑':'lixeira', '🧪':'teste', '📖':'livro', '📚':'livro', '🏪':'operacao', '🏠':'operacao', '💼':'financeiro',
    '🍟':'catalogo', '🥤':'catalogo', '🤖':'atendimento', '🧑':'pessoa', '👨':'pessoa', '🕐':'inativo', '📆':'calendario', '✅':'check', '📤':'upload', '📥':'download', '⬇':'download', '⬆':'upload', '↩':'repetir', '↻':'atualizar', '♻':'atualizar', '⌨':'teclado'
  };
  var RX = /^[\s‍️]*((?:[\uD800-\uDBFF][\uDC00-\uDFFF])|[☀-➿⭐⌚-⏿])[️‍]*\s*/;
  function iconizarTitulo_(el){
    if(!el || el.nodeType !== 1 || el.dataset.icTit) return;
    var n = el.firstChild;
    while(n && n.nodeType === 3 && !n.nodeValue.trim()) n = n.nextSibling;
    if(!n || n.nodeType !== 3) return;
    var m = RX.exec(n.nodeValue); if(!m) return;
    var chave = MAPA[m[1]]; el.dataset.icTit = '1';
    if(!chave || typeof window.icSvg_ !== 'function'){ return; }
    n.nodeValue = n.nodeValue.slice(m[0].length);
    var tmp = document.createElement('span'); tmp.innerHTML = window.icSvg_(chave);
    el.insertBefore(tmp.firstChild, n);
  }
  var SEL = 'h2, h3, h4, summary > h2, .modal-header h2, .admin-grupo, .al-grupo, button, b, .bk-txt > b';
  function varrer_(raiz){
    if(!raiz || raiz.nodeType !== 1 || !document.body.classList.contains('eq')) return;
    if(raiz.closest && raiz.closest('#cardapioPublico, #acompanhamentoPedido, .ct-modal, #cdCarrinhoModal')) return;
    if(raiz.matches && raiz.matches(SEL)) iconizarTitulo_(raiz);
    var l = raiz.querySelectorAll ? raiz.querySelectorAll(SEL) : [];
    for(var i = 0; i < l.length; i++){ if(!l[i].closest('#cardapioPublico, #acompanhamentoPedido, .ct-modal, #cdCarrinhoModal')) iconizarTitulo_(l[i]); }
  }

  function iniciar_(){
    wrap = document.getElementById('mainWrap');
    ajustar_();
    if(wrap) new MutationObserver(function(){ ajustar_(); varrer_(document.body); }).observe(wrap, { attributes:true, attributeFilter:['class'] });
    window.addEventListener('scroll', rolagem_, { passive:true });
    var t = null, fila = [];
    new MutationObserver(function(muts){
      if(!document.body.classList.contains('eq')) return;
      for(var i = 0; i < muts.length; i++){
        var m = muts[i];
        if(m.type === 'characterData'){ var p = m.target.parentNode; if(p && p.dataset){ delete p.dataset.icTit; fila.push(p); } continue; }
        for(var j = 0; j < m.addedNodes.length; j++) if(m.addedNodes[j].nodeType === 1) fila.push(m.addedNodes[j]);
        if(m.target && m.target.nodeType === 1 && m.target.matches && m.target.matches(SEL)){ delete m.target.dataset.icTit; fila.push(m.target); }
      }
      if(!t) t = setTimeout(function(){ var f = fila; fila = []; t = null; for(var k = 0; k < f.length; k++) varrer_(f[k]); }, 30);
    }).observe(document.body, { childList:true, subtree:true, characterData:true });
    varrer_(document.body);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar_); else iniciar_();
})();
