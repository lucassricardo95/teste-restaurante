/* Acessibilidade sem mudar o visual: liga cada <label> ao campo ao lado (toque no texto foca o campo e o leitor de tela anuncia),
   e dá nome aos botões que ficam sem texto. Roda ao abrir e quando a tela muda. */
(function(){
  'use strict';
  var seq = 0, agendado = false;
  var CAMPO = /^(INPUT|SELECT|TEXTAREA)$/;
  function proximoCampo(lb){
    var e = lb.nextElementSibling;
    while(e && e.tagName === 'BR') e = e.nextElementSibling;
    if(e && CAMPO.test(e.tagName)) return e;
    if(e && e.children && e.children.length === 1 && CAMPO.test(e.children[0].tagName)) return e.children[0];
    return null;
  }
  function ajustar(){
    agendado = false;
    try{
      var labels = document.querySelectorAll('label:not([for])');
      for(var i = 0; i < labels.length; i++){
        var lb = labels[i];
        if(lb.querySelector('input,select,textarea')) continue;
        var c = proximoCampo(lb);
        if(!c || c.type === 'hidden') continue;
        if(!c.id) c.id = 'acs_' + (++seq);
        lb.setAttribute('for', c.id);
      }
      var bts = document.querySelectorAll('button:not([aria-label])');
      for(var j = 0; j < bts.length; j++){
        var b = bts[j];
        if(!(b.textContent || '').trim() && !b.title) b.setAttribute('aria-label', b.id === 'pushBtn' ? 'Ativar ou desativar avisos neste aparelho' : 'Botão');
      }
    }catch(e){}
  }
  function agendar(){ if(agendado) return; agendado = true; setTimeout(ajustar, 250); }
  function iniciar(){
    ajustar();
    try{ new MutationObserver(agendar).observe(document.body, { childList:true, subtree:true }); }catch(e){ setInterval(ajustar, 3000); }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
