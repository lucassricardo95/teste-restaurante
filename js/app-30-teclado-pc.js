/* ============================================================
   TECLADO E FOCO NO COMPUTADOR (Plano PC, Fase 1).
   Só funciona em tela larga com mouse (>= 900 px e hover); no celular este arquivo não faz nada.
   1) Ao abrir uma janela, o cursor vai para o primeiro campo; ao fechar, volta para o botão que abriu.
   2) O Tab fica dentro da janela aberta (não escapa para a tela de trás).
   3) Enter: no Caixa (buscar cliente, adicionar item) e nas janelas com um único botão principal.
   4) Ao trocar o passo do Caixa (Cliente / Itens), o cursor vai para o primeiro campo do passo.
   6) Atalhos (Fase 2): Alt+1…9 abas, F2 nova venda, F4 pagamento, Ctrl+Enter finalizar (com confirmação), / ou Ctrl+K buscar, ? lista de atalhos.
   7) Dicas (Fase 8): botões só com ícone mostram o nome ao passar o mouse.
   5) Mede a altura das abas fixas do topo (variável --tabs-h) para o cabeçalho das tabelas grudar logo abaixo delas.
   Não troca nenhuma função do sistema: só chama as que os botões já chamam.
   ============================================================ */
(function(){
  'use strict';
  var mq = null;
  try{ mq = window.matchMedia('(min-width:900px) and (hover:hover)'); }catch(e){}
  function pc_(){ return !!(mq && mq.matches); }

  var VISIVEL = function(el){
    if(!el || el.disabled || el.hidden) return false;
    if(el.type === 'hidden') return false;
    var r = el.getClientRects(); if(!r || !r.length) return false;
    var cs = window.getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none';
  };
  var FOCAVEIS = 'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])';
  function focaveis_(raiz){
    var l = raiz.querySelectorAll(FOCAVEIS), out = [];
    for(var i = 0; i < l.length; i++){ if(VISIVEL(l[i]) && l[i].tabIndex >= 0) out.push(l[i]); }
    return out;
  }
  function aberta_(ov){
    if(!ov || !ov.classList) return false;
    if(ov.classList.contains('open')) return true;
    try{ return window.getComputedStyle(ov).display !== 'none'; }catch(e){ return false; }
  }

  /* ---------- pilha de janelas abertas (a última aberta é a de cima) ---------- */
  var pilha = [];   /* [{ov, volta}] */
  function topo_(){
    for(var i = pilha.length - 1; i >= 0; i--){
      if(aberta_(pilha[i].ov) && document.body.contains(pilha[i].ov)) return pilha[i];
    }
    return null;
  }
  function primeiroCampo_(box){
    var cs = focaveis_(box), i, c;
    for(i = 0; i < cs.length; i++){
      c = cs[i];
      if(c.classList.contains('close-btn')) continue;
      if((c.tagName === 'INPUT' && !/^(button|submit|reset|checkbox|radio|file|color|range)$/i.test(c.type) && !c.readOnly) ||
         c.tagName === 'SELECT' || c.tagName === 'TEXTAREA') return c;
    }
    for(i = 0; i < cs.length; i++){ if(cs[i].classList.contains('primary')) return cs[i]; }
    for(i = 0; i < cs.length; i++){ if(!cs[i].classList.contains('close-btn')) return cs[i]; }
    return cs[0] || null;
  }
  function aoAbrir_(ov){
    if(ov.id === 'dlgConfirmar') return;           /* a janela de confirmação já cuida do próprio foco */
    for(var i = 0; i < pilha.length; i++){ if(pilha[i].ov === ov) return; }
    var volta = document.activeElement;
    if(volta && (volta === document.body || ov.contains(volta))) volta = null;
    pilha.push({ ov: ov, volta: volta });
    setTimeout(function(){
      try{
        if(!aberta_(ov) || ov.contains(document.activeElement)) return;
        var box = ov.querySelector('.modal-box') || ov;
        var c = primeiroCampo_(box);
        if(c) c.focus({ preventScroll: true });
      }catch(e){}
    }, 60);
  }
  function aoFechar_(ov){
    for(var i = pilha.length - 1; i >= 0; i--){
      if(pilha[i].ov !== ov) continue;
      var volta = pilha[i].volta; pilha.splice(i, 1);
      setTimeout(function(){
        try{
          var a = document.activeElement;
          if(volta && document.body.contains(volta) && VISIVEL(volta) && (!a || a === document.body || !document.body.contains(a) || ov.contains(a))) volta.focus({ preventScroll: true });
        }catch(e){}
      }, 30);
      return;
    }
  }
  function conferir_(ov){
    if(!pc_() || !ov || !ov.classList || !ov.classList.contains('modal-overlay')) return;
    /* o carrinho do cardápio, em tela larga, é um painel fixo ao lado (não uma janela): não prende o Tab nem rouba o cursor */
    if(ov.id === 'cdCarrinhoModal' && window.matchMedia && window.matchMedia('(min-width:1100px)').matches) return;
    if(aberta_(ov)) aoAbrir_(ov); else aoFechar_(ov);
  }
  function ligarObservador_(){
    try{
      new MutationObserver(function(muts){
        if(!pc_()) return;
        for(var i = 0; i < muts.length; i++){
          var m = muts[i];
          if(m.type === 'attributes') conferir_(m.target);
          else if(m.type === 'childList'){
            for(var j = 0; j < m.addedNodes.length; j++){
              var n = m.addedNodes[j];
              if(n.nodeType === 1 && n.classList && n.classList.contains('modal-overlay')) conferir_(n);
            }
            for(var k = 0; k < m.removedNodes.length; k++){
              var r = m.removedNodes[k];
              if(r.nodeType === 1 && r.classList && r.classList.contains('modal-overlay')) aoFechar_(r);
            }
          }
        }
      }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style'] });
    }catch(e){}
  }

  /* ---------- Tab preso dentro da janela de cima ---------- */
  document.addEventListener('keydown', function(e){
    if(e.key !== 'Tab' || e.ctrlKey || e.altKey || e.metaKey || !pc_()) return;
    var ov = null, t = topo_();
    var conf = document.getElementById('dlgConfirmar');
    if(conf && aberta_(conf)) ov = conf; else if(t) ov = t.ov;
    if(!ov) return;
    var box = ov.querySelector('.modal-box') || ov;
    var cs = focaveis_(box); if(!cs.length) return;
    var a = document.activeElement, ini = cs[0], fim = cs[cs.length - 1];
    if(!box.contains(a)){ e.preventDefault(); ini.focus(); return; }
    if(e.shiftKey && a === ini){ e.preventDefault(); fim.focus(); }
    else if(!e.shiftKey && a === fim){ e.preventDefault(); ini.focus(); }
  }, true);

  /* ---------- Enter ---------- */
  var PERIGOSO = /^\s*(excluir|apagar|remover|cancelar|recusar|encerrar|restaurar|desligar|descartar|sair|zerar|limpar|desativar|substituir|fechar caixa|devolver|reembolsar|estornar)/i;
  var TIPOS_TEXTO = /^(text|number|tel|email|password|date|time|datetime-local|url)$/i;
  var SEM_ENTER = /(busca|search|chat|texto|msg|mensagem|obs)/i, SEM_ENTER_IA = /^ia[A-Z]/;   /* campos que têm Enter próprio ou textos longos */

  function porId_(id){ return document.getElementById(id); }
  function foco_(id){ var el = porId_(id); if(el && VISIVEL(el)){ try{ el.focus(); if(el.select && el.tagName === 'INPUT') el.select(); }catch(e){} } }
  function modoItemCampo_(){
    var ids = ['vProduto', 'vCombo', 'vDescManual'];
    for(var i = 0; i < ids.length; i++){ var el = porId_(ids[i]); if(el && VISIVEL(el)) return el.id; }
    return 'vQtd';
  }

  function enterCaixa_(e){
    var id = e.target.id;
    if(id === 'vClienteBusca'){
      var box = porId_('vClienteResultados'), p = box && box.querySelector('[data-cliente-nome]');
      if(p){ e.preventDefault(); p.click(); setTimeout(function(){ foco_('vClienteBusca'); }, 0); return true; }
      return false;
    }
    if(id === 'vProduto' || id === 'vCombo'){ e.preventDefault(); foco_('vQtd'); return true; }
    if(id === 'vDescManual'){ e.preventDefault(); foco_('vValorManual'); return true; }
    if(id === 'vValorManual'){ e.preventDefault(); foco_('vQtd'); return true; }
    if(id === 'vQtd'){
      e.preventDefault();
      if(typeof window.adicionarItemCarrinho === 'function') window.adicionarItemCarrinho();
      setTimeout(function(){ foco_(modoItemCampo_()); }, 0);
      return true;
    }
    return false;
  }

  function enterJanela_(e){
    var t = topo_(); if(!t) return false;
    var el = e.target;
    if(!el || el.tagName !== 'INPUT' || !TIPOS_TEXTO.test(el.type) || !t.ov.contains(el)) return false;
    if(el.getAttribute('inputmode') === 'search' || SEM_ENTER.test(el.id || '') || SEM_ENTER_IA.test(el.id || '') || /busca|buscar|pesquis/i.test(el.placeholder || '')) return false;
    var box = t.ov.querySelector('.modal-box') || t.ov;
    var bs = box.querySelectorAll('button.primary, button.small-gold'), unico = null, n = 0;
    for(var i = 0; i < bs.length; i++){
      if(!VISIVEL(bs[i])) continue;
      n++; unico = bs[i];
    }
    if(n !== 1 || unico.disabled || unico.classList.contains('vs-perigo') || PERIGOSO.test(unico.textContent || '')) return false;
    e.preventDefault(); unico.click();
    return true;
  }

  document.addEventListener('keydown', function(e){
    if(e.key !== 'Enter' || e.defaultPrevented || e.isComposing || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey || !pc_()) return;
    var el = e.target; if(!el || !el.tagName) return;
    if(el.tagName === 'TEXTAREA' || el.tagName === 'BUTTON' || el.tagName === 'A') return;
    var conf = porId_('dlgConfirmar'); if(conf && aberta_(conf)) return;
    try{
      if(enterCaixa_(e)) return;
      enterJanela_(e);
    }catch(err){}
  });

  /* ---------- Caixa: ao trocar o passo, o cursor vai para o primeiro campo ---------- */
  function ligarCaixa_(){
    var orig = window.mudarPainelCaixa;
    if(typeof orig !== 'function' || orig._tecPc) return;
    var novo = function(painel){
      var r = orig.apply(this, arguments);
      try{
        if(pc_() && !topo_()){
          var a = document.activeElement, aba = porId_('tab-caixa');
          if(aba && aba.classList.contains('active') && (!a || a === document.body || aba.contains(a))){
            setTimeout(function(){
              if(painel === 'cliente') foco_('vClienteBusca');
              else if(painel === 'itens') foco_(modoItemCampo_());
              else if(painel === 'finalizar' && document.body.classList.contains('cx-tudo')) foco_('formaPrecoSelect');
            }, 30);
          }
        }
      }catch(e){}
      return r;
    };
    novo._tecPc = true;
    window.mudarPainelCaixa = novo;
  }

  /* ---------- altura das abas fixas do topo (usada pelo cabeçalho grudado das tabelas) ---------- */
  function medirAbas_(){
    try{
      // v1.23: no computador o menu fica dentro da barra do topo (que é a parte que gruda ao rolar)
      var nav = document.querySelector('header.brand nav.tabs') ? document.querySelector('header.brand') : document.querySelector('nav.tabs'), r = document.documentElement;
      if(!nav || !pc_()){ r.style.removeProperty('--tabs-h'); return; }
      var h = Math.round(nav.getBoundingClientRect().height);
      if(h > 20 && h < 260) r.style.setProperty('--tabs-h', h + 'px');
    }catch(e){}
  }
  function ligarAbas_(){
    medirAbas_();
    try{
      var nav = document.querySelector('nav.tabs');
      if(nav && window.ResizeObserver) new ResizeObserver(medirAbas_).observe(nav);
    }catch(e){}
    window.addEventListener('resize', medirAbas_);
  }


  /* ---------- Atalhos de teclado (Fase 2) ---------- */
  function esc_(t){ return String(t == null ? '' : t).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
  function digitando_(el){
    if(!el || !el.tagName) return false;
    var t = el.tagName; return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || !!el.isContentEditable;
  }
  function logado_(){ var w = porId_('mainWrap'); return !!(w && w.classList.contains('unlocked')); }
  function algumaJanela_(){
    var c = porId_('dlgConfirmar');
    return !!(topo_() || (c && aberta_(c)));
  }
  function abasVisiveis_(){
    var l = document.querySelectorAll('nav.tabs .tab-btn'), o = [];
    for(var i = 0; i < l.length; i++){ if(VISIVEL(l[i])) o.push(l[i]); }
    return o;
  }
  function nomeAba_(b){
    var n = b.firstChild;
    return String((n && n.nodeType === 3) ? n.nodeValue : b.textContent).trim();
  }
  function abaCaixaAtiva_(){ var a = porId_('tab-caixa'); return !!(a && a.classList.contains('active')); }

  /* abre o Caixa (como se clicasse na aba) e vai para o passo pedido */
  function irCaixa_(painel){
    var abas = abasVisiveis_(), btn = null;
    for(var i = 0; i < abas.length; i++){ if(abas[i].getAttribute('data-tab') === 'caixa') btn = abas[i]; }
    if(!btn) return false;
    if(!abaCaixaAtiva_()) btn.click();
    if(abaCaixaAtiva_() && typeof window.mudarPainelCaixa === 'function') window.mudarPainelCaixa(painel);
    return true;
  }

  /* Ctrl+Enter: sempre pergunta antes de registrar a venda */
  function finalizarAtalho_(){
    if(!abaCaixaAtiva_()) return false;
    var btn = porId_('vBtn');
    if(!btn || !VISIVEL(btn)){ return irCaixa_('finalizar'); }
    if(btn.disabled) return true;
    if(typeof window.confirmar !== 'function') return true;
    var txt = 'Registrar esta venda agora?';
    try{
      if(typeof window.totalComDesconto === 'function' && typeof window.formatarMoeda === 'function')
        txt = 'Registrar a venda de ' + window.formatarMoeda(window.totalComDesconto()) + '?';
    }catch(e){}
    window.confirmar({ titulo:'Finalizar venda', texto:txt, ok:'Finalizar venda', voltar:'Voltar', perigo:false }).then(function(ok){
      if(ok && VISIVEL(btn) && !btn.disabled) btn.click();
    });
    return true;
  }

  /* / ou Ctrl+K: no Administrador foca o "Ir para…"; nas outras telas abre a busca geral */
  function buscaAtalho_(){
    var i = document.querySelector('.admin-busca input');
    if(i && VISIVEL(i)){ i.focus(); try{ i.select(); }catch(e){} return true; }
    var b = porId_('buscaGlobalBtn');
    if(b && VISIVEL(b) && typeof window.abrirBuscaGlobal === 'function'){ window.abrirBuscaGlobal(); return true; }
    return false;
  }

  /* lista de atalhos (a parte das abas muda conforme o perfil de quem está logado) */
  function fecharAtalhos_(){ var ov = porId_('atalhosPcModal'); if(ov) ov.classList.remove('open'); }
  function teclas_(txt){
    return String(txt).split(' ou ').map(function(alt){
      return alt.split(' + ').map(function(k){ return '<kbd>' + esc_(k) + '</kbd>'; }).join(' + ');
    }).join(' &nbsp;ou&nbsp; ');
  }
  function abrirAtalhos_(){
    if(!logado_()) return;
    var ov = porId_('atalhosPcModal');
    if(!ov){
      ov = document.createElement('div'); ov.className = 'modal-overlay'; ov.id = 'atalhosPcModal';
      ov.innerHTML = '<div class="modal-box"><div class="modal-header"><h2>Atalhos do teclado</h2>' +
        '<button type="button" class="close-btn" aria-label="Fechar" id="atalhosX">\u2715</button></div><div id="atalhosCorpo"></div></div>';
      ov.addEventListener('click', function(e){ if(e.target === ov) fecharAtalhos_(); });
      document.body.appendChild(ov);
      ov.querySelector('#atalhosX').addEventListener('click', fecharAtalhos_);
    }
    var linhas = [], abas = abasVisiveis_().slice(0, 9);
    abas.forEach(function(b, i){ linhas.push(['Alt + ' + (i + 1), 'Ir para ' + nomeAba_(b)]); });
    linhas.push(['F2', 'Nova venda (Caixa, passo Cliente)']);
    linhas.push(['F4', 'Pagamento e finalizar (Caixa)']);
    linhas.push(['Ctrl + Enter', 'Finalizar a venda (sempre pede confirmação)']);
    linhas.push(['/ ou Ctrl + K', 'Buscar (no Administrador, o campo \u201cIr para\u2026\u201d)']);
    linhas.push(['Enter', 'Nos campos do Caixa e das janelas: avança ou confirma']);
    linhas.push(['Esc', 'Fechar a janela aberta']);
    linhas.push(['?', 'Abrir esta lista']);
    porId_('atalhosCorpo').innerHTML = '<table class="atalhos-tab"><tbody>' + linhas.map(function(l){
      return '<tr><td class="atalhos-k">' + teclas_(l[0]) + '</td><td>' + esc_(l[1]) + '</td></tr>';
    }).join('') + '</tbody></table><div class="obs-line mt-3">Os atalhos de letra (/ e ?) só funcionam fora dos campos de digitação.</div>';
    ov.classList.add('open');
  }
  window.abrirAtalhosPc_ = abrirAtalhos_;

  function ligarAtalhos_(){
    /* botão "Atalhos" no topo (só aparece no computador, por CSS) */
    try{
      var bar = document.querySelector('header.brand .userbar');
      if(bar && !porId_('atalhosDica')){
        var b = document.createElement('button');
        b.type = 'button'; b.id = 'atalhosDica'; b.title = 'Atalhos do teclado (?)'; b.setAttribute('aria-label', 'Atalhos do teclado');
        b.innerHTML = '<span aria-hidden="true">\u2328</span><span class="rot"> Atalhos</span>';
        b.addEventListener('click', abrirAtalhos_);
        var ref = null, bs = bar.querySelectorAll('button');
        for(var i = 0; i < bs.length; i++){ if(bs[i].getAttribute('title') === 'Ajuda') ref = bs[i]; }
        if(ref) bar.insertBefore(b, ref); else bar.appendChild(b);
      }
    }catch(e){}

    document.addEventListener('keydown', function(e){
      if(!pc_() || e.isComposing || !logado_()) return;
      var painel = porId_('atalhosPcModal');
      if(painel && aberta_(painel)) return;
      if(algumaJanela_()) return;
      var k = e.key, semMod = !e.ctrlKey && !e.altKey && !e.metaKey;
      try{
        if(e.altKey && !e.ctrlKey && !e.metaKey && /^Digit[1-9]$/.test(e.code || '')){
          var abas = abasVisiveis_(), a = abas[Number(e.code.slice(5)) - 1];
          if(a){ e.preventDefault(); a.click(); }
          return;
        }
        if(semMod && !e.shiftKey && k === 'F2'){ if(irCaixa_('cliente')) e.preventDefault(); return; }
        if(semMod && !e.shiftKey && k === 'F4'){ if(irCaixa_('finalizar')) e.preventDefault(); return; }
        if((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && k === 'Enter'){ if(finalizarAtalho_()) e.preventDefault(); return; }
        if((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && String(k).toLowerCase() === 'k'){ if(buscaAtalho_()) e.preventDefault(); return; }
        if(semMod && !digitando_(e.target)){
          if(k === '/'){ if(buscaAtalho_()) e.preventDefault(); return; }
          if(k === '?'){ e.preventDefault(); abrirAtalhos_(); return; }
        }
      }catch(err){}
    });
  }

  /* ---------- Dicas (Fase 8): botão só com ícone ganha "title" ao passar o mouse, usando o nome que o app-29 já deu (aria-label) ---------- */
  function ligarDicas_(){
    document.addEventListener('mouseover', function(e){
      if(!pc_()) return;
      var b = e.target && e.target.closest ? e.target.closest('button') : null;
      if(!b || b.title) return;
      var nome = b.getAttribute('aria-label');
      if(nome && !String(b.textContent || '').replace(/[\s\u2715\u2716\u00d7]/g, '')) b.title = nome;
    }, true);
  }

  function iniciar_(){ ligarObservador_(); ligarCaixa_(); ligarAbas_(); ligarAtalhos_(); ligarDicas_(); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar_); else iniciar_();
})();
