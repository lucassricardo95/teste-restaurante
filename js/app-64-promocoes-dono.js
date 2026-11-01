/* =====================================================================
   PROMOÇÕES DO DONO (v1.26) — tudo configurável em Administrador → Vendas e cardápio → Promoções e cupons
   1) 🏷️ PREÇO POR DIA DA SEMANA: produto ou combo, dias, horário opcional, preço fixo ou % de desconto, se aceita cupom.
      O preço vale no cardápio online (entrega e retirada). Quem calcula é o banco (_criar_pedido_publico); o celular só mostra
      o preço riscado e a etiqueta. Pedido entre 0h e 5h59 conta na noite do dia anterior.
   2) 🎁 COMPRE E GANHE: a partir de R$ X em produtos (sem taxa de entrega, antes do cupom), ganha o brinde escolhido.
      O carrinho mostra "faltam R$ X para ganhar…"; o brinde entra no pedido a R$ 0, com custo e baixa no estoque.
   3) 🧾 BILHETE NA SACOLA: junto da comanda dos pedidos do iFood (ou de todas as entregas), sai um bilhete com título,
      texto, QR Code do cardápio e o cupom escolhido. Ligado/desligado pelo dono.
   Excluir uma promoção pede a senha (regra das ações sensíveis).
   ===================================================================== */
(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const e_ = s => (typeof escH === 'function' ? escH(s) : String(s == null ? '' : s));
  const R$ = v => (typeof formatarMoeda === 'function' ? formatarMoeda(v) : 'R$ ' + (Number(v) || 0).toFixed(2));
  const DIAS_ = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const DIAS_LONGO_ = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const ORDEM_ = [1, 2, 3, 4, 5, 6, 0];
  const ehMesa_ = () => (typeof mesaQr !== 'undefined' && !!mesaQr);
  const erroBox_ = m => '<div class="msg warn" role="alert" style="display:block;">⚠️ ' + e_(m) + '</div>';
  const diasTxt_ = d => { const s = (d || []).map(Number); return s.length === 7 ? 'todos os dias' : ORDEM_.filter(x => s.indexOf(x) !== -1).map(x => DIAS_[x]).join(', '); };

  /* ======================= CARDÁPIO DO CLIENTE ======================= */
  let promos = { precos: [], compreGanhe: [] };
  window.cdPromos_ = () => promos;
  function promoDe_(tipo, id){
    if(ehMesa_()) return null;
    const base = typeof cdPrecoCheioDe_ === 'function' ? cdPrecoCheioDe_(tipo, id) : null;
    if(base == null) return null;
    let melhor = null;
    (promos.precos || []).forEach(p => {
      if(p.tipo !== tipo || p.id !== id) return;
      const pr = Math.round((p.modo === 'preco' ? Number(p.valor) : base * (1 - Number(p.valor) / 100)) * 100) / 100;
      if(pr > 0 && pr < base && (!melhor || pr < melhor.preco)) melhor = { preco: pr, nome: p.nome, acumula: !!p.acumula, ate: p.ate, de: base };
    });
    return melhor;
  }
  window.cdPromoDe_ = promoDe_;
  function instalarCardapio_(){
    if(typeof window.cdPrecoDe !== 'function' || window.cdPrecoDe.__promo) return false;
    const cheio = window.cdPrecoDe;
    window.cdPrecoCheioDe_ = cheio;
    const novo = function(tipo, id){ const p = promoDe_(tipo, id); return p ? p.preco : cheio(tipo, id); };
    novo.__promo = true; window.cdPrecoDe = novo;
    /* item em promoção que não acumula: fica fora do cupom (igual aos itens "sem desconto") */
    if(typeof window.cdSemDesc_ === 'function'){
      const sd = window.cdSemDesc_;
      window.cdSemDesc_ = function(tipo, id){ if(sd(tipo, id)) return true; const p = promoDe_(tipo, id); return !!(p && !p.acumula); };
    }
    /* cartão do produto: preço cheio riscado + etiqueta da promoção */
    if(typeof window.cdCardHTML === 'function'){
      const card = window.cdCardHTML;
      window.cdCardHTML = function(tipo, item){
        let h = card(tipo, item);
        const p = item && promoDe_(tipo, item.id);
        if(!p) return h;
        const alvo = '<div class="cd-preco">' + cdFormatarPreco(p.preco) + '</div>';
        if(h.indexOf(alvo) === -1) return h;
        h = h.replace(alvo, '<div class="cd-preco"><s class="cd-preco-de">' + cdFormatarPreco(p.de) + '</s> ' + cdFormatarPreco(p.preco) + '</div>');
        return h.replace('<div class="cd-linha">', '<div class="cd-promo-tag">🏷️ ' + e_(p.nome) + (p.ate ? ' · até ' + e_(p.ate) : '') + '</div><div class="cd-linha">');
      };
    }
    /* carrinho: quanto falta para o brinde */
    if(typeof window.cdAtualizarTotal_ === 'function'){
      const tot = window.cdAtualizarTotal_;
      window.cdAtualizarTotal_ = function(){ const r = tot.apply(this, arguments); try{ compreGanheCarrinho_(); }catch(e){} return r; };
    }
    return true;
  }
  function compreGanheCarrinho_(){
    const box = $('cdCompreGanhe'); if(!box) return;
    const regras = (promos.compreGanhe || []).slice().sort((a, b) => a.minimo - b.minimo);
    if(ehMesa_() || !regras.length || typeof cdCarrinho === 'undefined' || !cdCarrinho.length){ box.innerHTML = ''; box.style.display = 'none'; return; }
    const sub = typeof subtotalCarrinhoCd === 'function' ? subtotalCarrinhoCd() : 0;
    const ganhou = regras.filter(r => sub >= r.minimo).pop(), prox = regras.find(r => sub < r.minimo);
    const nomeBr = r => (r.quantidade > 1 ? r.quantidade + '× ' : '') + r.produto;
    let h = '';
    if(ganhou) h += '<div class="cd-cg-ok">🎁 <b>Você ganhou ' + e_(nomeBr(ganhou)) + '!</b> Vai junto no pedido, de graça.</div>';
    if(prox){
      const falta = Math.max(0.01, Math.round((prox.minimo - sub) * 100) / 100), pct = Math.min(100, Math.round(sub / prox.minimo * 100));
      h += '<div class="cd-cg-falta"><div>🎁 Faltam <b>' + cdFormatarPreco(falta) + '</b> em produtos para ganhar <b>' + e_(nomeBr(prox)) + '</b>' + (prox.nome ? ' <span class="txt-muted">(' + e_(prox.nome) + ')</span>' : '') + '</div>'
        + '<div class="rx-trilho" style="margin-top:6px;"><div style="width:' + pct + '%;"></div></div></div>';
    }
    box.innerHTML = h; box.style.display = h ? '' : 'none';
  }
  let ultimaCarga = 0;
  async function carregarPromosPublicas_(){
    if(ehMesa_()) return;
    try{
      const r = await sbRpcPublico_('api_cardapio_promos', { p:{} });
      if(!r || r.ok !== true) return;   // sem promoções carregadas o cardápio funciona normal, com o preço cheio (o servidor decide o preço)
      const antes = JSON.stringify(promos);
      promos = { precos: r.precos || [], compreGanhe: r.compreGanhe || [] }; ultimaCarga = Date.now();
      if(JSON.stringify(promos) !== antes && typeof cdDados !== 'undefined' && cdDados && cdDados.produtos){
        try{ if(typeof renderCdSecoes === 'function') renderCdSecoes(); }catch(e){}
        try{ if(typeof cdCarrinho !== 'undefined' && cdCarrinho.length){ cdCarrinho.forEach(it => { const v = window.cdPrecoDe(it.tipo, it.id); if(v != null) it.precoBase = v; }); if(typeof renderCdCarrinho === 'function') renderCdCarrinho(); } }catch(e){}
      }
      try{ compreGanheCarrinho_(); }catch(e){}
    }catch(e){}
  }
  function iniciarCardapio_(){
    if(!instalarCardapio_()) setTimeout(iniciarCardapio_, 500);
    carregarPromosPublicas_();
    setInterval(() => { if(!document.hidden && Date.now() - ultimaCarga > 9 * 60000) carregarPromosPublicas_(); }, 60000);
    document.addEventListener('visibilitychange', () => { if(!document.hidden && Date.now() - ultimaCarga > 5 * 60000) carregarPromosPublicas_(); });
  }

  /* ======================= ADMIN: LISTAS ======================= */
  let adm = null;
  function itensCatalogo_(){
    const ps = (typeof produtos !== 'undefined' && Array.isArray(produtos) ? produtos : []).filter(p => p && p.nome).map(p => ({ tipo:'produto', id:p.id, nome:p.nome, ativo:p.ativo !== false }));
    const cs = (typeof combos !== 'undefined' && Array.isArray(combos) ? combos : []).filter(c => c && c.nome).map(c => ({ tipo:'combo', id:c.id, nome:c.nome + ' (combo)', ativo:c.ativo !== false }));
    return ps.concat(cs).filter(x => x.ativo).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }
  function precoTxt_(p){ return p.tipo === 'percentual' ? String(p.valor).replace('.', ',') + '% de desconto' : 'por ' + R$(p.valor); }
  function horaTxt_(p){ return p.horaInicio && p.horaFim ? ' · das ' + p.horaInicio + ' às ' + p.horaFim : ''; }
  function desenharAdm_(){
    const a = $('pdPrecosLista'), b = $('pdGanheLista'); if(!a || !b || !adm) return;
    const hoje = DIAS_LONGO_[adm.hoje] || '';
    a.innerHTML = (adm.precos || []).length ? adm.precos.map(p => {
        const final = p.tipo === 'percentual' && p.precoNormal ? Math.round(p.precoNormal * (1 - p.valor / 100) * 100) / 100 : p.valor;
        return '<div class="notif-card"><b>' + e_(p.nome) + '</b> · ' + (p.ativa ? (p.agora ? '<b style="color:#7bd88f;">VALENDO AGORA</b>' : 'ligada') : 'desligada')
          + '<div class="obs-line">' + e_(p.item || '?') + ': ' + (p.precoNormal ? '<s>' + R$(p.precoNormal) + '</s> → <b>' + R$(final) + '</b>' : precoTxt_(p)) + (p.tipo === 'percentual' ? ' (' + e_(precoTxt_(p)) + ')' : '') + '</div>'
          + '<div class="obs-line">' + e_(diasTxt_(p.dias)) + e_(horaTxt_(p)) + ' · ' + (p.acumula ? 'aceita cupom' : 'não soma com cupom') + '</div>'
          + '<button type="button" class="small-gold" onclick="promoDiaAbrir_(\'' + p.id + '\')">Editar</button> '
          + '<button type="button" class="ghost" onclick="promoAlternar_(\'dia\',\'' + p.id + '\',' + !p.ativa + ')">' + (p.ativa ? 'Desligar' : 'Ligar') + '</button> '
          + '<button type="button" class="ghost" onclick="promoExcluir_(\'dia\',\'' + p.id + '\')">🗑️ Excluir</button></div>'; }).join('')
      : '<div class="notif-empty">Nenhuma promoção de dia cadastrada. Ex.: "Terça do X Bacon" por R$ 24,90 toda terça.</div>';
    b.innerHTML = (adm.compreGanhe || []).length ? adm.compreGanhe.map(r => '<div class="notif-card"><b>A partir de ' + R$(r.minimo) + '</b> ganha <b>' + (r.quantidade > 1 ? r.quantidade + '× ' : '') + e_(r.produto) + '</b> · ' + (r.ativa ? 'ligada' : 'desligada')
          + (r.produtoAtivo ? '' : ' <span class="rx-tag">o brinde está fora do cardápio</span>')
          + '<div class="obs-line">' + (r.nome ? e_(r.nome) + ' · ' : '') + e_(diasTxt_(r.dias)) + ' · ' + r.usos30 + ' brinde(s) dado(s) nos últimos 30 dias</div>'
          + '<button type="button" class="small-gold" onclick="promoGanheAbrir_(\'' + r.id + '\')">Editar</button> '
          + '<button type="button" class="ghost" onclick="promoAlternar_(\'ganhe\',\'' + r.id + '\',' + !r.ativa + ')">' + (r.ativa ? 'Desligar' : 'Ligar') + '</button> '
          + '<button type="button" class="ghost" onclick="promoExcluir_(\'ganhe\',\'' + r.id + '\')">🗑️ Excluir</button></div>').join('')
      : '<div class="notif-empty">Nenhuma regra cadastrada. Ex.: pedido a partir de R$ 70 ganha uma Coca lata.</div>';
    const h = $('pdHoje'); if(h) h.textContent = 'Hoje conta como ' + hoje + ' (pedidos até 5h59 contam na noite anterior).';
  }
  window.carregarPromosDono_ = async function(){
    const a = $('pdPrecosLista'), b = $('pdGanheLista'); if(!a) return;
    a.innerHTML = b.innerHTML = '<div class="obs-line">⏳ Carregando…</div>';
    try{
      const r = await sbRpc_('api_promos_listar', { p:{} });
      if(!r || r.ok !== true){ a.innerHTML = b.innerHTML = erroBox_((r && r.message) || 'Não foi possível carregar as promoções.'); return; }
      adm = r; desenharAdm_();
    }catch(e){ a.innerHTML = b.innerHTML = erroBox_('Sem conexão para carregar as promoções. Confira a internet e abra a tela de novo.'); }
    carregarBilheteAdm_();
  };

  /* ---------- formulário (janela própria: lista de produtos, dias marcáveis) ---------- */
  let form = null;
  function diasHtml_(sel){
    return '<div class="vs-escolha" role="group" aria-label="Dias da semana">' + ORDEM_.map(d => '<button type="button" class="vs-op" data-dia="' + d + '" aria-pressed="' + (sel.indexOf(d) !== -1) + '" onclick="promoDiaToggle_(' + d + ')">' + DIAS_[d] + '</button>').join('')
      + '<button type="button" class="vs-op" aria-pressed="false" onclick="promoDiaTodos_()">Todos</button></div>';
  }
  window.promoDiaToggle_ = function(d){ const i = form.dias.indexOf(d); if(i === -1) form.dias.push(d); else form.dias.splice(i, 1); document.querySelectorAll('#pdModal [data-dia]').forEach(b => b.setAttribute('aria-pressed', form.dias.indexOf(Number(b.dataset.dia)) !== -1)); };
  window.promoDiaTodos_ = function(){ form.dias = form.dias.length === 7 ? [] : [0, 1, 2, 3, 4, 5, 6]; document.querySelectorAll('#pdModal [data-dia]').forEach(b => b.setAttribute('aria-pressed', form.dias.indexOf(Number(b.dataset.dia)) !== -1)); };
  function listaItens_(){
    const box = $('pdItens'); if(!box || !form) return;
    const q = (typeof adminNorm_ === 'function' ? adminNorm_ : (t => String(t || '').toLowerCase()))(($('pdBusca') || {}).value || '');
    const so = form.soProduto;
    const lista = itensCatalogo_().filter(x => (!so || x.tipo === 'produto') && (!q || (typeof adminNorm_ === 'function' ? adminNorm_(x.nome) : x.nome.toLowerCase()).indexOf(q) !== -1)).slice(0, 40);
    box.innerHTML = lista.length ? lista.map(x => '<button type="button" class="vs-op" aria-pressed="' + (form.item && form.item.id === x.id ? 'true' : 'false') + '" onclick="promoEscolherItem_(\'' + x.tipo + '\',\'' + x.id + '\')">' + e_(x.nome) + '</button>').join('') : '<div class="obs-line">Nenhum item com esse nome.</div>';
    const s = $('pdEscolhido'); if(s) s.textContent = form.item ? 'Escolhido: ' + form.item.nome : 'Nenhum escolhido ainda.';
  }
  window.promoBuscarItem_ = listaItens_;
  window.promoEscolherItem_ = function(tipo, id){ const x = itensCatalogo_().find(i => i.id === id) || { tipo, id, nome:'?' }; form.item = x; listaItens_(); promoPrevia_(); };
  function modal_(titulo, corpo){
    let m = $('pdModal');
    if(!m){ m = document.createElement('div'); m.className = 'modal-overlay'; m.id = 'pdModal'; document.body.appendChild(m); }
    m.innerHTML = '<div class="modal-box vs-form" role="dialog" aria-modal="true" aria-labelledby="pdTit" style="max-width:520px;"><div class="modal-header"><h2 id="pdTit">' + titulo + '</h2><button class="close-btn" type="button" aria-label="Fechar" onclick="fecharFormModal(\'pdModal\')">✕</button></div>' + corpo
      + '<div class="msg" id="pdMsg"></div><div class="vs-form-botoes"><button type="button" class="primary" id="pdOk" onclick="promoSalvar_()">Salvar</button><button type="button" class="ghost" onclick="fecharFormModal(\'pdModal\')">Voltar</button></div></div>';
    try{ abrirFormModal('pdModal'); }catch(e){ m.classList.add('open'); }
  }
  window.promoPrevia_ = function(){
    const el = $('pdPrevia'); if(!el || !form || form.tipoForm !== 'dia') return;
    const it = form.item, modo = (document.querySelector('#pdModal [data-modo][aria-pressed="true"]') || {}).dataset || {}, val = Number(String(($('pdValor') || {}).value || '').replace(',', '.'));
    if(!it || !(val > 0)){ el.textContent = ''; return; }
    const base = it.tipo === 'produto' ? precoNormal_('produto', it.id) : precoNormal_('combo', it.id);
    if(base == null){ el.textContent = ''; return; }
    const fim = modo.modo === 'percentual' ? Math.round(base * (1 - val / 100) * 100) / 100 : val;
    el.innerHTML = fim < base ? 'No cardápio: <s>' + R$(base) + '</s> → <b>' + R$(fim) + '</b> (' + Math.round((1 - fim / base) * 100) + '% a menos)' : '<span style="color:#ff9d96;">⚠️ O preço promocional precisa ser menor que ' + R$(base) + '.</span>';
  };
  function precoNormal_(tipo, id){
    const l = tipo === 'produto' ? (typeof produtoPrecos !== 'undefined' ? produtoPrecos : []) : (typeof comboPrecos !== 'undefined' ? comboPrecos : []);
    const k = tipo === 'produto' ? 'produtoId' : 'comboId';
    const v = (l || []).filter(x => x[k] === id).map(x => Number(x.preco)).filter(n => n > 0);
    return v.length ? Math.min.apply(null, v) : null;
  }
  window.promoModo_ = function(m){ document.querySelectorAll('#pdModal [data-modo]').forEach(b => b.setAttribute('aria-pressed', b.dataset.modo === m)); const r = $('pdValorRot'); if(r) r.textContent = m === 'percentual' ? 'Desconto (%)' : 'Preço promocional (R$)'; promoPrevia_(); };
  window.promoDiaAbrir_ = function(id){
    const p = id ? (adm.precos || []).find(x => x.id === id) : null;
    form = { tipoForm:'dia', id: p ? p.id : null, dias: p ? p.dias.map(Number) : [], soProduto:false,
      item: p ? { tipo: p.produtoId ? 'produto' : 'combo', id: p.produtoId || p.comboId, nome: p.item } : null };
    const modo = p ? p.tipo : 'preco';
    modal_(p ? '🏷️ Editar preço do dia' : '🏷️ Novo preço por dia da semana',
      '<p class="sub vs-form-texto">Vale no cardápio online (entrega e retirada). Mesa, balcão e iFood continuam com o preço normal.</p>'
      + '<label for="pdNome">Nome que o cliente vê</label><input type="text" id="pdNome" maxlength="40" placeholder="Ex.: Terça do X Bacon" value="' + e_(p ? p.nome : '') + '">'
      + '<label for="pdBusca">Produto ou combo</label><input type="text" id="pdBusca" placeholder="Digite parte do nome" autocomplete="off" oninput="promoBuscarItem_()">'
      + '<div class="vs-escolha" id="pdItens" style="max-height:200px;overflow:auto;margin:6px 0;"></div><div class="sub fs-xs" id="pdEscolhido" aria-live="polite"></div>'
      + '<div class="vs-rot" style="margin-top:8px;">Dias da semana</div>' + diasHtml_(form.dias)
      + '<div class="row2"><div><label for="pdHi">Das (opcional)</label><input type="time" id="pdHi" value="' + e_(p && p.horaInicio || '') + '"></div><div><label for="pdHf">Até (opcional)</label><input type="time" id="pdHf" value="' + e_(p && p.horaFim || '') + '"></div></div>'
      + '<p class="sub fs-xs" style="margin:2px 0 6px;">Em branco = o dia todo.</p>'
      + '<div class="vs-rot">Tipo</div><div class="vs-escolha" role="group" aria-label="Tipo de promoção"><button type="button" class="vs-op" data-modo="preco" aria-pressed="' + (modo === 'preco') + '" onclick="promoModo_(\'preco\')">Preço fixo</button><button type="button" class="vs-op" data-modo="percentual" aria-pressed="' + (modo === 'percentual') + '" onclick="promoModo_(\'percentual\')">% de desconto</button></div>'
      + '<label for="pdValor" id="pdValorRot">' + (modo === 'percentual' ? 'Desconto (%)' : 'Preço promocional (R$)') + '</label><input type="text" inputmode="decimal" id="pdValor" value="' + (p ? String(p.valor).replace('.', ',') : '') + '" oninput="promoPrevia_()">'
      + '<div class="sub" id="pdPrevia" aria-live="polite" style="margin:4px 0 8px;"></div>'
      + '<label class="d-flex gap-2 ai-centro"><input type="checkbox" id="pdAcumula" class="largura-auto"' + (p && p.acumula ? ' checked' : '') + '> Aceita cupom junto (desmarcado: o item em promoção fica fora do cupom)</label>'
      + '<label class="d-flex gap-2 ai-centro"><input type="checkbox" id="pdAtiva" class="largura-auto"' + (!p || p.ativa ? ' checked' : '') + '> Ligada</label>');
    listaItens_(); promoPrevia_();
  };
  window.promoGanheAbrir_ = function(id){
    const r = id ? (adm.compreGanhe || []).find(x => x.id === id) : null;
    form = { tipoForm:'ganhe', id: r ? r.id : null, dias: r ? r.dias.map(Number) : [0, 1, 2, 3, 4, 5, 6], soProduto:true, item: r ? { tipo:'produto', id:r.produtoId, nome:r.produto } : null };
    modal_(r ? '🎁 Editar compre e ganhe' : '🎁 Novo compre e ganhe',
      '<p class="sub vs-form-texto">No cardápio online, quando os produtos do carrinho passam do valor mínimo, o brinde entra no pedido de graça. Conta o valor dos produtos, sem a taxa de entrega e antes do cupom. Se houver mais de uma regra, vale a maior que o cliente alcançou.</p>'
      + '<label for="pdMin">A partir de (R$ em produtos)</label><input type="text" inputmode="decimal" id="pdMin" value="' + (r ? String(r.minimo).replace('.', ',') : '') + '" placeholder="Ex.: 70">'
      + '<label for="pdBusca">Brinde</label><input type="text" id="pdBusca" placeholder="Digite parte do nome do produto" autocomplete="off" oninput="promoBuscarItem_()">'
      + '<div class="vs-escolha" id="pdItens" style="max-height:200px;overflow:auto;margin:6px 0;"></div><div class="sub fs-xs" id="pdEscolhido" aria-live="polite"></div>'
      + '<label for="pdQtd">Quantidade do brinde</label><input type="text" inputmode="numeric" id="pdQtd" value="' + (r ? r.quantidade : 1) + '">'
      + '<div class="vs-rot" style="margin-top:8px;">Dias da semana</div>' + diasHtml_(form.dias)
      + '<label for="pdNome">Apelido (opcional)</label><input type="text" id="pdNome" maxlength="40" placeholder="Ex.: Coca de presente" value="' + e_(r ? r.nome : '') + '">'
      + '<label class="d-flex gap-2 ai-centro"><input type="checkbox" id="pdAtiva" class="largura-auto"' + (!r || r.ativa ? ' checked' : '') + '> Ligada</label>');
    listaItens_();
  };
  window.promoSalvar_ = async function(){
    if(!form) return;
    const num = id => Number(String(($(id) || {}).value || '').replace(/\./g, '').replace(',', '.'));
    let fn, p;
    if(form.tipoForm === 'dia'){
      const modo = ((document.querySelector('#pdModal [data-modo][aria-pressed="true"]') || {}).dataset || {}).modo || 'preco';
      if(!form.item) return showMsg('pdMsg', 'Escolha o produto ou combo na lista.', 'warn');
      if(!form.dias.length) return showMsg('pdMsg', 'Marque pelo menos um dia da semana.', 'warn');
      p = { id: form.id, nome: ($('pdNome').value || '').trim(), produtoId: form.item.tipo === 'produto' ? form.item.id : null, comboId: form.item.tipo === 'combo' ? form.item.id : null,
        dias: form.dias, horaInicio: $('pdHi').value || '', horaFim: $('pdHf').value || '', tipo: modo, valor: num('pdValor'), acumula: $('pdAcumula').checked, ativa: $('pdAtiva').checked };
      fn = 'api_promo_dia_salvar';
    } else {
      if(!form.item) return showMsg('pdMsg', 'Escolha o produto do brinde na lista.', 'warn');
      if(!form.dias.length) return showMsg('pdMsg', 'Marque pelo menos um dia da semana.', 'warn');
      p = { id: form.id, minimo: num('pdMin'), produtoId: form.item.id, quantidade: parseInt($('pdQtd').value, 10) || 1, dias: form.dias, nome: ($('pdNome').value || '').trim(), ativa: $('pdAtiva').checked };
      fn = 'api_compre_ganhe_salvar';
    }
    const bt = $('pdOk'); if(bt) bt.disabled = true;
    try{
      const r = await sbRpc_(fn, { p });
      if(!r || r.ok !== true){ showMsg('pdMsg', (r && r.message) || 'Não foi possível salvar. Nada foi gravado.', 'warn'); if(bt) bt.disabled = false; return; }
      fecharFormModal('pdModal'); try{ avisar(r.message || 'Salvo.', 'ok'); }catch(e){}
      window.carregarPromosDono_();
    }catch(e){ showMsg('pdMsg', '📡 Sem conexão. Nada foi gravado; tente de novo.', 'warn'); if(bt) bt.disabled = false; }
  };
  window.promoAlternar_ = async function(tipo, id, ligar){
    const x = tipo === 'dia' ? (adm.precos || []).find(p => p.id === id) : (adm.compreGanhe || []).find(p => p.id === id); if(!x) return;
    const p = tipo === 'dia'
      ? { id: x.id, nome: x.nome, produtoId: x.produtoId, comboId: x.comboId, dias: x.dias, horaInicio: x.horaInicio || '', horaFim: x.horaFim || '', tipo: x.tipo, valor: x.valor, acumula: x.acumula, ativa: ligar }
      : { id: x.id, minimo: x.minimo, produtoId: x.produtoId, quantidade: x.quantidade, dias: x.dias, nome: x.nome, ativa: ligar };
    try{
      const r = await sbRpc_(tipo === 'dia' ? 'api_promo_dia_salvar' : 'api_compre_ganhe_salvar', { p });
      if(!r || r.ok !== true){ mostrarErro_('⚠️ ' + ((r && r.message) || 'Não foi possível mudar.'), { forcar:true }); return; }
      avisar(ligar ? 'Ligada.' : 'Desligada.', 'ok'); window.carregarPromosDono_();
    }catch(e){ mostrarErro_('📡 Sem conexão: nada foi mudado.', { forcar:true }); }
  };
  window.promoExcluir_ = async function(tipo, id){
    if(typeof confirmarTxt_ === 'function' && !await confirmarTxt_('Excluir esta promoção? Não dá para desfazer. Se quiser só pausar, use "Desligar".', 'Excluir', true)) return;
    const senha = typeof pedirSenha_ === 'function' ? await pedirSenha_() : null; if(!senha) return;
    try{
      const r = await sbRpc_('api_promo_excluir', { p:{ tipo, id, senha } });
      if(!r || r.ok !== true){ mostrarErro_('⚠️ ' + ((r && r.message) || 'Não foi possível excluir.'), { forcar:true }); return; }
      avisar(r.message || 'Excluída.', 'ok'); window.carregarPromosDono_();
    }catch(e){ mostrarErro_('📡 Sem conexão: nada foi excluído.', { forcar:true }); }
  };

  /* ======================= 🧾 BILHETE NA SACOLA ======================= */
  const K_BIL = 'txBilheteSacola';
  let bil = null; try{ bil = JSON.parse(localStorage.getItem(K_BIL) || 'null'); }catch(e){}
  async function carregarBilhete_(){
    try{
      if(typeof sbSessaoLer_ === 'function' && !sbSessaoLer_()) return null;
      const r = await sbRpc_('api_bilhete_sacola', { p:{} });
      if(r && r.ok === true){ bil = r; try{ localStorage.setItem(K_BIL, JSON.stringify(r)); }catch(e){} }
      return r;
    }catch(e){ return null; }
  }
  function linkCardapio_(){ try{ return typeof QR_BASE_URL_ !== 'undefined' ? QR_BASE_URL_ : new URL('./', location.href).href; }catch(e){ return location.origin + '/'; } }
  function qrDataUrl_(texto){
    try{
      const mat = QR_.encode(texto), q = 2, n = mat.length + q * 2, esc = 5, t = n * esc;
      const cv = document.createElement('canvas'); cv.width = cv.height = t;
      const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, t, t); cx.fillStyle = '#000';
      mat.forEach((lin, y) => lin.forEach((v, x) => { if(v) cx.fillRect((x + q) * esc, (y + q) * esc, esc, esc); }));
      return cv.toDataURL('image/png');
    }catch(e){ return ''; }
  }
  const semEmoji_ = s => String(s == null ? '' : s).replace(/[\u{1F000}-\u{1FFFF}☀-➿️]/gu, '').trim();
  function bilheteHtml_(c){
    const qr = qrDataUrl_(linkCardapio_()), esc = s => (typeof escR === 'function' ? escR(semEmoji_(s)) : e_(semEmoji_(s)));
    return '<div class="cmd" style="text-align:center;">'
      + '<div class="num" style="font-size:1.45em;">' + esc(c.titulo || 'Peça direto com a gente!') + '</div>'
      + (c.texto ? '<div style="margin:6px 0 8px;font-size:1.05em;">' + esc(c.texto) + '</div>' : '')
      + (qr ? '<div><img src="' + qr + '" alt="" style="width:44mm;height:44mm;image-rendering:pixelated;"></div>' : '')
      + (c.cupom ? '<div class="box" style="margin-top:8px;">USE O CUPOM<br><span class="big" style="font-size:1.6em;letter-spacing:.06em;">' + esc(c.cupom) + '</span>' + (c.cupomDesc ? '<br>' + esc(c.cupomDesc) : '') + '</div>' : '')
      + '<div class="rod" style="margin-top:6px;">' + esc(linkCardapio_().replace(/^https?:\/\//, '')) + '</div></div>';
  }
  window.bilheteSacolaHtml_ = bilheteHtml_;
  function bilheteVale_(v){
    if(!bil || !bil.ligado || !v || v.status === 'Cancelada') return false;
    if(bil.quando === 'entregas') return v.tipoEntrega === 'Entrega';
    return typeof ehIfood_ === 'function' ? ehIfood_(v) : v.canal === 'iFood';
  }
  function instalarImpressao_(){
    if(typeof window.imprimirComandas_ !== 'function' || window.imprimirComandas_.__bil) return false;
    const orig = window.imprimirComandas_;
    const novo = function(lista){
      const imp = window.imprimirDocumento;
      if(typeof imp === 'function' && Array.isArray(lista) && lista.some(bilheteVale_)){
        window.imprimirDocumento = function(corpo, titulo, formato){
          window.imprimirDocumento = imp;
          const docs = Array.isArray(corpo) ? corpo : [corpo], out = [];
          docs.forEach((d, i) => { out.push(d); if(bilheteVale_(lista[i])) out.push(bilheteHtml_(bil)); });
          return imp(out, titulo, formato);
        };
      }
      try{ return orig.apply(this, arguments); } finally { window.imprimirDocumento = imp; }
    };
    novo.__bil = true; window.imprimirComandas_ = novo; return true;
  }
  /* admin: cartão de configuração */
  async function carregarBilheteAdm_(){
    const c = $('bsCorpo'); if(!c) return;
    c.innerHTML = '<div class="obs-line">⏳ Carregando…</div>';
    const r = await carregarBilhete_();
    if(!r || r.ok !== true){ c.innerHTML = erroBox_((r && r.message) || 'Sem conexão para carregar o bilhete. Abra a tela de novo.'); return; }
    c.innerHTML = '<label class="d-flex gap-2 ai-centro"><input type="checkbox" id="bsLigado" class="largura-auto"' + (r.ligado ? ' checked' : '') + '> Imprimir o bilhete junto da comanda</label>'
      + '<div class="vs-rot" style="margin-top:6px;">Em quais pedidos</div><div class="vs-escolha" role="group" aria-label="Em quais pedidos">'
      + '<button type="button" class="vs-op" data-bsq="ifood" aria-pressed="' + (r.quando !== 'entregas') + '" onclick="bilheteQuando_(\'ifood\')">Só iFood</button>'
      + '<button type="button" class="vs-op" data-bsq="entregas" aria-pressed="' + (r.quando === 'entregas') + '" onclick="bilheteQuando_(\'entregas\')">Todas as entregas</button></div>'
      + '<label for="bsTitulo">Título <small class="txt-muted">(até 50)</small></label><input type="text" id="bsTitulo" maxlength="50" value="' + e_(r.titulo) + '" oninput="bilhetePrevia_()">'
      + '<label for="bsTexto">Texto <small class="txt-muted">(até 220)</small></label><textarea id="bsTexto" rows="3" maxlength="220" oninput="bilhetePrevia_()">' + e_(r.texto) + '</textarea>'
      + '<label for="bsCupom">Código do cupom (opcional)</label><input type="text" id="bsCupom" maxlength="30" value="' + e_(r.cupom) + '" placeholder="Ex.: VOLTA10" oninput="bilhetePrevia_()" style="text-transform:uppercase;">'
      + (r.cupom && !r.cupomOk ? '<div class="msg warn" role="alert" style="display:block;">⚠️ O cupom ' + e_(r.cupom) + ' está desativado ou vencido: o cliente não vai conseguir usar. Ative em Cupons ou troque o código.</div>' : '')
      + '<p class="sub fs-xs" style="margin:2px 0 8px;">Dica: crie em Cupons um cupom de primeira compra (por exemplo, 1 uso por cliente) e escreva o código aqui. Emojis não saem na impressora térmica.</p>'
      + '<div class="sub fs-xs">Prévia do bilhete:</div><div id="bsPrevia" class="bs-previa"></div>'
      + '<div class="msg" id="bsMsg"></div><button type="button" class="primary" id="bsSalvar" onclick="salvarBilhete_()">Salvar bilhete</button> '
      + '<button type="button" class="ghost" onclick="testarBilhete_()">🖨️ Imprimir um de teste</button>';
    bilhetePrevia_();
  }
  window.bilheteQuando_ = function(q){ document.querySelectorAll('#bsCorpo [data-bsq]').forEach(b => b.setAttribute('aria-pressed', b.dataset.bsq === q)); };
  function bilheteDoForm_(){
    return { ligado: $('bsLigado').checked, quando: ((document.querySelector('#bsCorpo [data-bsq][aria-pressed="true"]') || {}).dataset || {}).bsq || 'ifood',
      titulo: ($('bsTitulo').value || '').trim(), texto: ($('bsTexto').value || '').trim(), cupom: ($('bsCupom').value || '').trim().toUpperCase().replace(/\s+/g, ''),
      cupomDesc: bil && bil.cupom === ($('bsCupom').value || '').trim().toUpperCase() ? bil.cupomDesc : '' };
  }
  window.bilhetePrevia_ = function(){ const pv = $('bsPrevia'); if(pv) pv.innerHTML = bilheteHtml_(bilheteDoForm_()); };
  window.salvarBilhete_ = async function(){
    const p = bilheteDoForm_(); delete p.cupomDesc;
    const bt = $('bsSalvar'); if(bt) bt.disabled = true;
    try{
      const r = await sbRpc_('api_bilhete_sacola_salvar', { p });
      if(bt) bt.disabled = false;
      if(!r || r.ok !== true){ showMsg('bsMsg', (r && r.message) || 'Não foi possível salvar. Nada foi gravado.', 'warn'); return; }
      await carregarBilheteAdm_(); showMsg('bsMsg', '✅ ' + (r.message || 'Salvo.') + (p.ligado ? ' Vai sair junto da próxima comanda.' : ''), 'ok');
    }catch(e){ if(bt) bt.disabled = false; showMsg('bsMsg', '📡 Sem conexão. Nada foi gravado; tente de novo.', 'warn'); }
  };
  window.testarBilhete_ = function(){
    try{ imprimirDocumento([bilheteHtml_(bilheteDoForm_())], 'Bilhete de teste', typeof lerFormato === 'function' ? lerFormato('comanda', '80mm') : '80mm'); }
    catch(e){ showMsg('bsMsg', '⚠️ Não consegui abrir a impressão neste aparelho.', 'warn'); }
  };

  function iniciar_(){
    iniciarCardapio_();
    if(!instalarImpressao_()) setTimeout(instalarImpressao_, 1000);
    /* aparelho da equipe: mantém a configuração do bilhete atualizada (a comanda imprime sem esperar a internet) */
    setTimeout(carregarBilhete_, 4000);
    setInterval(() => { if(!document.hidden) carregarBilhete_(); }, 15 * 60000);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar_); else iniciar_();
})();
