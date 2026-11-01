/* =====================================================================
   VER O CARDÁPIO SEM SAIR (P-13, v1.15)
   Área de funcionários → "🛒 Cardápio" mostra o cardápio digital por cima,
   SEM apagar a sessão e SEM recarregar. Faixa fixa no topo: "Voltar à área de
   funcionários" (sem senha), com aviso de pedido novo. Por trás, o detector de
   pedidos, o som (inclusive a vinheta do iFood) e o rastreio continuam rodando.
   Atualizar a página dentro do cardápio volta para a área de funcionários, já logado.
   Funciona também com a sessão de emergência (contingência), que fica só na memória.
   ===================================================================== */
(function(){
  'use strict';
  var estado = null, novos = 0;

  function faixa_(){
    var f = document.getElementById('vcFaixa');
    if(!f){
      f = document.createElement('div'); f.id = 'vcFaixa'; f.setAttribute('role', 'region'); f.setAttribute('aria-label', 'Vendo como cliente');
      document.body.appendChild(f);
    }
    f.innerHTML = '<span>👀 Você está vendo como cliente' + (novos ? ' · <b class="vc-novo">🔔 ' + novos + ' pedido' + (novos > 1 ? 's' : '') + ' novo' + (novos > 1 ? 's' : '') + '!</b>' : '') + '</span>'
      + '<button type="button" onclick="voltarAreaEquipe_()">↩ Voltar à área de funcionários</button>';
  }
  window.verCardapioComoCliente_ = function(){
    try{
      if(typeof currentUser === 'undefined' || !currentUser) return;
      var abaAtiva = document.querySelector('.tab-btn.active');
      estado = { y: window.scrollY || 0, aba: abaAtiva ? abaAtiva.dataset.tab : '',
                 modais: Array.prototype.map.call(document.querySelectorAll('.modal-overlay.open'), function(m){ return m.id; }).filter(Boolean) };
      estado.modais.forEach(function(id){ var m = document.getElementById(id); if(m) m.classList.remove('open'); });
      novos = 0;
      document.body.classList.add('vendo-cardapio');
      document.getElementById('cardapioPublico').classList.remove('hidden');
      faixa_();
      window.scrollTo(0, 0);
      try{ carregarCardapioPublico(); }catch(e){ if(window.erroTela_) erroTela_(e, 'verCardapio'); }
      try{ if(typeof atualizarFabCarrinho === 'function') atualizarFabCarrinho(); }catch(e){}
    }catch(e){
      try{ mostrarErro_('⚠️ Não foi possível abrir o cardápio agora. Você continua na área de funcionários.', { forcar:true }); }catch(_){}
      window.voltarAreaEquipe_();
    }
  };
  window.voltarAreaEquipe_ = function(){
    try{
      document.querySelectorAll('.modal-overlay.open[id^="cd"], .modal-overlay.open.ct-modal').forEach(function(m){ m.classList.remove('open'); });
      document.getElementById('cardapioPublico').classList.add('hidden');
      var fab = document.getElementById('cdFabCarrinho'); if(fab) fab.classList.remove('show');
      document.body.classList.remove('vendo-cardapio');
      var f = document.getElementById('vcFaixa'); if(f) f.remove();
      var e = estado; estado = null;
      if(e){
        if(e.aba){ var b = document.querySelector('.tab-btn[data-tab="' + e.aba + '"]'); if(b && !b.classList.contains('active')) b.click(); }
        (e.modais || []).forEach(function(id){ var m = document.getElementById(id); if(m) m.classList.add('open'); });
        setTimeout(function(){ window.scrollTo(0, e.y || 0); }, 30);
      }
      if(novos){ novos = 0; try{ if(typeof seguroParaSincronizar === 'function' && seguroParaSincronizar()) sincronizarEmSegundoPlano(); }catch(e2){} }
    }catch(e){ try{ mostrarErro_('⚠️ Algo deu errado ao voltar. Atualize a página: você continua logado.', { forcar:true }); }catch(_){} }
  };
  window.vendoCardapio_ = function(){ return document.body.classList.contains('vendo-cardapio'); };
  /* pedido novo com o cardápio aberto: conta na faixa (o som toca normalmente) */
  function envolver_(nome){
    var o = window[nome]; if(typeof o !== 'function' || o.__vc) return;
    var n = function(qtd){ var r = o.apply(this, arguments); try{ if(window.vendoCardapio_()){ novos += Number(qtd) || 1; faixa_(); } }catch(e){} return r; };
    n.__vc = true; window[nome] = n;
  }
  envolver_('avisarNovoPedido_'); envolver_('avisarNovoPedidoIfood_');
})();
