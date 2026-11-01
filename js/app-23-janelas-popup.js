
(function(){
  var T={"nfceLista": "Notas fiscais", "nfceConf": "Conferência", "nfcePac": "Pacote do contador", "fiscalEmpresa": "Dados fiscais da empresa", "fiscalPerfis": "Perfis fiscais", "fiscalSem": "Itens sem perfil", "ifoodLoja": "Loja no iFood", "ifoodNeg": "Negociações", "ifoodPedidos": "Pedidos do iFood", "ifoodItens": "Itens do iFood", "ifoodPrecos": "Preços", "ifoodFin": "Financeiro", "ifoodAval": "Avaliações", "ifoodRel": "Relatório por canal"};
  var SEL=Object.keys(T).map(function(k){return '#'+k;}).join(',');
  window.POP_SEL_=SEL;
  function fechar(b){ b.innerHTML=''; }
  function decorar(){
    document.querySelectorAll(SEL).forEach(function(b){
      if(!b.firstElementChild || b.firstElementChild.classList.contains('pop-cab')) return;
      var cab=document.createElement('div'); cab.className='pop-cab';
      var h=document.createElement('h2'); h.textContent=T[b.id]||'';
      var x=document.createElement('button'); x.type='button'; x.className='close-btn'; x.setAttribute('aria-label','Fechar'); x.textContent='\u2715';
      x.addEventListener('click',function(){fechar(b);});
      cab.appendChild(h); cab.appendChild(x); b.insertBefore(cab,b.firstChild);
      var rod=document.createElement('div'); rod.className='pop-rod';
      var f=document.createElement('button'); f.type='button'; f.className='ghost'; f.textContent='Fechar';
      f.addEventListener('click',function(){fechar(b);}); rod.appendChild(f); b.appendChild(rod);
    });
  }
  var agenda=false;
  new MutationObserver(function(){ if(agenda) return; agenda=true; requestAnimationFrame(function(){ agenda=false; try{decorar();}catch(e){} }); }).observe(document.body,{childList:true,subtree:true});
})();
