/* =====================================================================
   CARDÁPIO MAIS FÁCIL PARA O CLIENTE (P-04, v1.15) — só tela; regras iguais
   - Busca também no celular (a rolagem para o lado continua igual).
   - "+" do cartão: item simples (sem adicionais e sem escolha) entra direto no carrinho
     ("Adicionado ✓"); os demais abrem a janela como antes.
   - Carrinho com − / + na quantidade e resumo: subtotal, entrega, cupom e total.
   - "Como quer receber?" com dois botões grandes (Retirada / Entrega, com taxa e tempo)
     e botão "📍 Usar minha localização" no endereço.
   - Foto do item no topo da janela também no celular.
   - Faixa com taxa e tempo no topo do cardápio.
   - Restaurante fechado pelo Admin: o "+" avisa antes de montar o carrinho.
   ===================================================================== */
(function(){
  'use strict';
  function fechadoMsg_(){
    try{
      if(typeof mesaQr !== 'undefined' && mesaQr) return '';
      if(cdDados && cdDados.cardapioBloqueio) return cdDados.cardapioBloqueio;
    }catch(e){}
    return '';
  }
  function itemSimples_(tipo, id){
    try{
      if(cdEscolhaCfg_(tipo, id)) return false;
      const produtoIds = tipo === 'produto' ? [id] : (cdDados.comboItens || []).filter(ci=>ci.comboId === id).map(ci=>ci.produtoId);
      return !(cdDados.produtoAdicionais || []).some(pa=>produtoIds.indexOf(pa.produtoId) !== -1 && (cdDados.adicionais || []).some(a=>a.id === pa.adicionalId));
    }catch(e){ return false; }
  }
  /* "+" do cartão */
  window.cdAddRapido_ = function(tipo, id){
    try{
      const f = fechadoMsg_(); if(f){ mostrarErro_('🔴 ' + f, { forcar:true, registrar:false }); return; }
      if(typeof mesaBloqueada_ !== 'undefined' && mesaBloqueada_) return abrirCdItemModal(tipo, id);
      if(cdEsgotado_(tipo, id) || !itemSimples_(tipo, id)) return abrirCdItemModal(tipo, id);
      const lista = tipo === 'produto' ? cdDados.produtos : cdDados.combos, item = (lista || []).find(x=>x.id === id);
      if(!item) return abrirCdItemModal(tipo, id);
      const ex = cdCarrinho.find(c=>c.tipo === tipo && c.id === id && !(c.adicionais || []).length && !c.obs && !c.escolhas);
      if(ex) ex.qtd = Math.min(50, ex.qtd + 1);
      else cdCarrinho.push({ tipo: tipo, id: id, nome: item.nome, precoBase: cdPrecoDe(tipo, id) || 0, qtd: 1, adicionais: [], obs: '' });
      atualizarFabCarrinho();
      try{ if(window.cdFunil_){ window.cdFunil_('item'); window.cdFunil_('carrinho'); } }catch(e){}
      avisar('Adicionado ao carrinho: ' + item.nome, 'ok', 1800);
    }catch(e){ try{ abrirCdItemModal(tipo, id); }catch(_){} }
  };
  /* o cartão passa a chamar o "+" rápido (a janela continua abrindo pela foto e para itens com opções) */
  (function(){
    const o = window.cdCardHTML; if(typeof o !== 'function' || o.__facil) return;
    const n = function(tipo, item){
      return String(o.apply(this, arguments)).replace("onclick=\"abrirCdItemModal('" + tipo + "','" + item.id + "')\">+</button>", "onclick=\"cdAddRapido_('" + tipo + "','" + item.id + "')\">+</button>");
    };
    n.__facil = true; window.cdCardHTML = n;
  })();

  /* ---------- carrinho: − / + e resumo ---------- */
  window.alterarQtdCarrinhoCd_ = function(i, d){
    const it = cdCarrinho[i]; if(!it) return;
    const q = Math.max(1, Math.min(50, (Number(it.qtd) || 1) + d));
    if(q === it.qtd) return;
    it.qtd = q; renderCdCarrinho(); atualizarFabCarrinho();
  };
  (function(){
    const o = window.renderCdCarrinho; if(typeof o !== 'function' || o.__facil) return;
    const n = function(){
      const r = o.apply(this, arguments);
      try{
        const cont = document.getElementById('cdCarrinhoItens'); if(!cont) return r;
        const linhas = cont.querySelectorAll(':scope > .cd-adicional-linha');
        let k = 0;
        linhas.forEach(function(l){
          const btn = l.querySelector('button.link-btn[onclick^="removerDoCarrinho("]'); if(!btn) return;
          const i = Number((btn.getAttribute('onclick').match(/removerDoCarrinho\((\d+)\)/) || [])[1]);
          const it = cdCarrinho[i]; if(!it) return;
          const ctrl = document.createElement('span'); ctrl.className = 'cd-qtd-ctrl cd-qtd-carrinho';
          ctrl.innerHTML = '<button type="button" aria-label="Menos um" onclick="alterarQtdCarrinhoCd_(' + i + ',-1)"' + (it.qtd <= 1 ? ' disabled' : '') + '>−</button><span aria-live="polite">' + it.qtd + '</span><button type="button" aria-label="Mais um" onclick="alterarQtdCarrinhoCd_(' + i + ',1)">+</button>';
          btn.parentNode.insertBefore(ctrl, btn); k++;
        });
        resumo_();
      }catch(e){ if(window.erroTela_) erroTela_(e, 'carrinho'); }
      return r;
    };
    n.__facil = true; window.renderCdCarrinho = n;
  })();
  function resumo_(){
    try{
      const tot = document.getElementById('cdCarrinhoTotal'); if(!tot) return;
      const linhaTot = tot.closest('.cd-qtd-row'); if(!linhaTot) return;
      let box = document.getElementById('cdResumoLinhas');
      if(!box){ box = document.createElement('div'); box.id = 'cdResumoLinhas'; box.className = 'cd-resumo-linhas'; linhaTot.parentNode.insertBefore(box, linhaTot); }
      if(!cdCarrinho.length){ box.innerHTML = ''; return; }
      const sub = subtotalCarrinhoCd(), taxa = taxaEntregaCdAtual(), desc = Number(cdCupomAplicado && cdCupomAplicado.desconto || 0), acr = acrescimoCdAtual_();
      const entrega = (document.getElementById('cdTipoEntrega') || {}).value === 'Entrega';
      const L = ['<div><span>Subtotal</span><span>' + cdFormatarPreco(sub) + '</span></div>'];
      if(entrega) L.push('<div><span>Entrega</span><span>' + (taxa > 0 ? cdFormatarPreco(taxa) : (cdCupomAplicado && cdCupomAplicado.freteGratis ? 'Grátis (cupom)' : 'Grátis')) + '</span></div>');
      if(desc > 0) L.push('<div><span>Cupom</span><span>− ' + cdFormatarPreco(desc) + '</span></div>');
      if(acr > 0) L.push('<div><span>Acréscimo da forma de pagamento</span><span>' + cdFormatarPreco(acr) + '</span></div>');
      box.innerHTML = L.join('');
    }catch(e){}
  }
  (function(){
    const o = window.cdAtualizarTotal_; if(typeof o !== 'function' || o.__facil) return;
    const n = function(){ const r = o.apply(this, arguments); resumo_(); botoesReceber_(); return r; };
    n.__facil = true; window.cdAtualizarTotal_ = n;
  })();

  /* ---------- "Como quer receber?" em dois botões grandes ---------- */
  function botoesReceber_(){
    try{
      const sel = document.getElementById('cdTipoEntrega'); if(!sel) return;
      const lab = sel.previousElementSibling;
      if(lab && lab.tagName === 'LABEL' && /retirar/i.test(lab.textContent)) lab.textContent = 'Como quer receber?';
      let box = document.getElementById('cdReceberBtns');
      if(!box){
        box = document.createElement('div'); box.id = 'cdReceberBtns'; box.className = 'cd-receber'; box.setAttribute('role', 'radiogroup'); box.setAttribute('aria-label', 'Como quer receber?');
        sel.parentNode.insertBefore(box, sel); sel.classList.add('cd-receber-sel');
      }
      const cfg = (cdDados && cdDados.config) || {}, taxa = Number(cfg.taxaEntrega) || 0;
      const opc = [['Retirada', '🥡 Retirar no balcão', cfg.tempoRetirada || ''], ['Entrega', '🛵 Entrega', [taxa > 0 ? cdFormatarPreco(taxa) : 'Entrega grátis', cfg.tempoEntrega || ''].filter(Boolean).join(' · ')]];
      box.innerHTML = opc.map(function(o){ const on = sel.value === o[0];
        return '<button type="button" role="radio" aria-checked="' + on + '" class="cd-receber-btn' + (on ? ' on' : '') + '" onclick="cdEscolherReceber_(\'' + o[0] + '\')"><b>' + o[1] + '</b>' + (o[2] ? '<small>' + escH(o[2]) + '</small>' : '') + '</button>'; }).join('');
      const end = document.getElementById('cdEnderecoBox');
      if(end && !document.getElementById('cdUsarLocalBtn')){
        const b = document.createElement('button'); b.type = 'button'; b.id = 'cdUsarLocalBtn'; b.className = 'ghost cd-usar-local';
        b.textContent = '📍 Usar minha localização'; b.onclick = window.cdUsarMinhaLocal_;
        end.insertBefore(b, end.firstChild);
        permissaoLocal_();
      }
    }catch(e){}
  }
  /* Localização já permitida: pega sozinha e o botão some. Não permitida (ou celular que não informa): o botão fica aparecendo. */
  let permLocal_ = null;
  function permissaoLocal_(){
    const b = document.getElementById('cdUsarLocalBtn'); if(!b) return;
    const aplicar = function(estado){
      const ok = estado === 'granted';
      b.style.display = ok ? 'none' : '';
      if(ok){ try{ if(window.cdCapturarLocalSilenciosa_) window.cdCapturarLocalSilenciosa_(); }catch(e){} try{ cdPreencherEnderecoPorLocal_(); }catch(e){} }
    };
    try{
      if(!navigator.geolocation){ b.style.display = 'none'; return; }
      if(!navigator.permissions || !navigator.permissions.query){ aplicar('prompt'); return; }
      navigator.permissions.query({ name:'geolocation' }).then(function(st){
        aplicar(st.state);
        if(!permLocal_){ permLocal_ = st; st.onchange = function(){ aplicar(st.state); }; }
      }, function(){ aplicar('prompt'); });
    }catch(e){ aplicar('prompt'); }
  }
  window.cdEscolherReceber_ = function(v){
    const sel = document.getElementById('cdTipoEntrega'); if(!sel || sel.value === v) return;
    sel.value = v; try{ onMudarTipoCdEntrega(); }catch(e){ try{ mostrarErro_(msgErroPrograma_(e.message)); }catch(_){} }
    botoesReceber_();
  };
  window.cdUsarMinhaLocal_ = function(){
    const aviso = document.getElementById('cdEnderecoAviso');
    if(!navigator.geolocation){ if(aviso){ aviso.style.display = 'block'; aviso.textContent = '⚠️ Este aparelho não oferece localização. Digite o endereço.'; } return; }
    if(aviso){ aviso.style.display = 'block'; aviso.textContent = '⏳ Buscando sua localização…'; }
    navigator.geolocation.getCurrentPosition(function(){
      try{ const bt = document.getElementById('cdUsarLocalBtn'); if(bt) bt.style.display = 'none'; }catch(e){}
      try{ if(window.cdCapturarLocalSilenciosa_) window.cdCapturarLocalSilenciosa_(); }catch(e){}
      const campo = document.getElementById('cdEndereco');
      if(campo && typeof cdEndAuto_ !== 'undefined' && cdEndAuto_) campo.value = '';
      try{ cdEndTentou_ = false; }catch(e){}
      setTimeout(function(){ try{ cdPreencherEnderecoPorLocal_(); }catch(e){} }, 400);
    }, function(){
      if(aviso){ aviso.style.display = 'block'; aviso.textContent = '⚠️ Não conseguimos pegar sua localização (permissão negada ou sem sinal). Se negou, libere a localização nas configurações do navegador para este site. Ou digite a rua, o bairro, o número e a cidade.'; }
    }, { enableHighAccuracy:true, timeout:15000, maximumAge:60000 });
  };

  /* ---------- foto do item no topo também no celular ---------- */
  (function(){
    const o = window.abrirCdItemModal; if(typeof o !== 'function' || o.__facil) return;
    const n = function(tipo, id){
      const f = fechadoMsg_(); if(f){ mostrarErro_('🔴 ' + f, { forcar:true, registrar:false }); return; }
      const r = o.apply(this, arguments);
      try{
        const im = document.getElementById('cdItemFoto'); if(!im) return r;
        const pc = window.matchMedia && window.matchMedia('(min-width:900px)').matches;
        if(pc){ im.classList.remove('cd-foto-cel'); return r; }
        const lista = tipo === 'produto' ? cdDados.produtos : cdDados.combos, item = (lista || []).find(x=>x.id === id);
        if(item && item.fotoUrl){ im.onerror = function(){ this.removeAttribute('src'); this.classList.remove('cd-foto-cel'); }; im.src = fotoSrc_(item.fotoUrl, 600); im.classList.add('cd-foto-cel'); }
        else { im.removeAttribute('src'); im.classList.remove('cd-foto-cel'); }
      }catch(e){}
      return r;
    };
    n.__facil = true; n.__fun = o.__fun; window.abrirCdItemModal = n;
  })();

  /* ---------- taxa e tempo à vista no topo ---------- */
  (function(){
    const o = window.cdPintar_; if(typeof o !== 'function' || o.__facil) return;
    const n = function(){
      const r = o.apply(this, arguments);
      try{
        const cfg = (cdDados && cdDados.config) || {}, st = document.getElementById('cdStatusCaixa'); if(!st) return r;
        let el = document.getElementById('cdInfoEntrega');
        if(!el){ el = document.createElement('div'); el.id = 'cdInfoEntrega'; el.className = 'cd-info-entrega'; st.parentNode.insertBefore(el, st.nextSibling); }
        if(typeof mesaQr !== 'undefined' && mesaQr){ el.textContent = ''; return r; }
        const taxa = Number(cfg.taxaEntrega) || 0, p = [];
        p.push('🛵 Entrega ' + (taxa > 0 ? cdFormatarPreco(taxa) : 'grátis') + (cfg.tempoEntrega ? ' · ' + cfg.tempoEntrega : ''));
        if(cfg.tempoRetirada) p.push('🥡 Retirada ' + cfg.tempoRetirada);
        el.textContent = ''; p.forEach(function(t){ const sp = document.createElement('span'); sp.textContent = t; el.appendChild(sp); });
      }catch(e){}
      return r;
    };
    n.__facil = true; window.cdPintar_ = n;
  })();
})();
