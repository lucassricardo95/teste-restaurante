/* Fase 6 (usabilidade): estados "carregando / vazio / erro" e tabelas em cartões no celular.
   Funções globais; não dependem de outros arquivos para carregar. */
(function(){
  'use strict';
  var esc = function(t){ return String(t == null ? '' : t).replace(/[&<>"]/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]; }); };

  /* Carregando: n barras animadas (mesmo pulso do cardápio). */
  window.esqueletoLista_ = function(n){
    n = Math.max(1, Math.min(8, n || 3));
    return '<div class="esqueleto" role="status" aria-label="Carregando">' + new Array(n + 1).join('<i></i>') + '</div>';
  };
  /* Vazio: texto + (opcional) botão de ação. acaoJs é o texto do onclick, ex.: "abrirFormModal('produtoNovoModal')". */
  window.estadoVazio_ = function(texto, botaoTxt, acaoJs){
    return '<div class="estado-vazio">' + esc(texto) +
      (botaoTxt && acaoJs ? '<br><button type="button" class="small-gold" onclick="' + esc(acaoJs) + '">' + esc(botaoTxt) + '</button>' : '') + '</div>';
  };


  /* Ícones nos botões montados por JS: se o texto do botão COMEÇA com um emoji conhecido, troca pelo SVG do sistema
     (mesmo traço do menu). Roda ao abrir e quando um botão novo ou com texto novo aparece. Texto de aviso/conversa não é tocado.
     Para um botão novo basta escrever o emoji no começo do texto; o ícone certo entra sozinho. */
  var ICONES = {
    '\uD83C\uDF81':['presente','Presente'], '\uD83D\uDD52':['inativo','Histórico'], '\uD83D\uDDA8':['imprimir','Imprimir'],
    '\u2705':['check','Confirmar'], '\u274C':['x','Fechar'], '\u2716':['x','Fechar'], '\u2714':['check','Confirmar'],
    '\uD83D\uDC4D':['check','Ciente'], '\u270F':['editar','Editar'], '\uD83D\uDCB3':['cartao','Conta'],
    '\uD83D\uDCF2':['celular','Celular'], '\uD83D\uDD01':['repetir','Repetir'], '\uD83D\uDD14':['sino','Avisos'],
    '\uD83E\uDDFE':['pedido','Conta'], '\uD83E\uDDEA':['teste','Teste'], '\uD83D\uDCD6':['livro','Como fazer'],
    '\u26A0':['alerta','Atenção'], '\uD83D\uDCCD':['pin','Localização'], '\uD83D\uDCB2':['dinheiro','Preço'],
    '\u2B50':['fidelidade','Feedback'], '\uD83D\uDCC4':['pedido','Documento'], '\uD83D\uDCE5':['download','Baixar'],
    '\uD83D\uDDD1':['lixeira','Apagar'], '\uD83D\uDEF5':['entrega','Entrega'], '\uD83D\uDCE6':['estoque','Pedido'],
    '\uD83D\uDD0D':['busca','Buscar']
  };
  function iconizar(btn){
    if(!btn || btn.nodeType !== 1 || btn.tagName !== 'BUTTON') return;
    var n = btn.firstChild; if(!n || n.nodeType !== 3) return;
    var t = n.nodeValue, i = 0;
    while(i < t.length && /\s/.test(t.charAt(i))) i++;
    var par = t.substr(i, 2), um = t.charAt(i), ch = ICONES[par] ? par : (ICONES[um] ? um : null);
    if(!ch) return;
    var resto = t.slice(i + ch.length).replace(/^[\uFE0F\u200D]+/, '').replace(/^\s+/, '');
    var def = ICONES[ch];
    if(typeof window.icSvg_ !== 'function') return;
    var tmp = document.createElement('span'); tmp.innerHTML = window.icSvg_(def[0]);
    n.nodeValue = resto;
    btn.insertBefore(tmp.firstChild, n);
    if(!resto.trim() && !btn.getAttribute('aria-label') && !btn.title) btn.setAttribute('aria-label', def[1]);
  }
  function iconizarTudo(raiz){
    if(!raiz || raiz.nodeType !== 1) return;
    if(raiz.tagName === 'BUTTON') iconizar(raiz);
    var bs = raiz.querySelectorAll ? raiz.querySelectorAll('button') : [];
    for(var i = 0; i < bs.length; i++) iconizar(bs[i]);
  }
  window.iconizarBotoes_ = iconizarTudo;
  function ligarIcones(){
    iconizarTudo(document.body);
    try{
      new MutationObserver(function(muts){
        for(var i = 0; i < muts.length; i++){
          var m = muts[i];
          if(m.type !== 'childList') continue;
          if(m.target && m.target.tagName === 'BUTTON') iconizar(m.target);
          for(var j = 0; j < m.addedNodes.length; j++){
            var a = m.addedNodes[j];
            if(a.nodeType === 1) iconizarTudo(a);
          }
        }
      }).observe(document.body, { childList: true, subtree: true });
    }catch(e){}
  }

  /* Tabelas em cartões (celular): copia o título de cada coluna para o data-label das células.
     O CSS (estilo-base.css, "tab-cartoes") faz o resto; no computador continuam tabelas. */
  var TABELAS = ['vTable', 'despTable', 'hcTable'];
  function rotular(tbody, rotulos){
    Array.prototype.forEach.call(tbody.rows, function(tr){
      if(tr.classList.contains('empty-row')) return;
      Array.prototype.forEach.call(tr.cells, function(td, i){ td.setAttribute('data-label', rotulos[i] || ''); });
    });
  }
  function ligar(id){
    var tbody = document.getElementById(id); if(!tbody) return;
    var tabela = tbody.closest('table'); if(!tabela) return;
    tabela.classList.add('tab-cartoes');
    var rotulos = Array.prototype.map.call(tabela.querySelectorAll('thead th'), function(th){ return String(th.textContent || '').trim(); });
    rotular(tbody, rotulos);
    try{
      var t; new MutationObserver(function(){ clearTimeout(t); t = setTimeout(function(){ rotular(tbody, rotulos); }, 20); }).observe(tbody, { childList: true });
    }catch(e){}
  }
  function iniciar(){ TABELAS.forEach(ligar); ligarIcones(); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
