/* =====================================================================
   v1.15 (Fase 7 — seção 10 do plano) — InfinitePay
   CARDÁPIO: a forma paga pela InfinitePay leva o cliente ao checkout seguro da InfinitePay (Pix ou crédito) e o traz de volta.
     • Tela "aguardando pagamento" com "Abrir o pagamento", "Já paguei" e relógio; atualiza sozinha (ip-status).
     • Na volta do checkout (?ipRetorno=…), confere o pagamento com os dados da volta. Se a página recarregar, retoma.
     • SIMULAÇÃO: sem InfinitePay; botões Pagar / Recusar / Expirar (só para os e-mails liberados).
     • O pedido só vai para a cozinha depois de o servidor CONFERIR o pagamento com a InfinitePay.
   ADMIN: cartão "InfinitePay" (mesmo desenho do Mercado Pago): estado, checklist, chaves, quem recebe cada forma,
     ajustes, ligar (senha), guia passo a passo, teste guiado, pagamentos recentes e REGISTRAR REEMBOLSO (senha).
   ===================================================================== */
(function(){
  'use strict';
  const CH = 'tb_ip_pendente';
  const lerPend = () => { try{ const o = JSON.parse(localStorage.getItem(CH) || 'null'); return o && Date.now() - o.em < 3 * 3600e3 ? o : null; }catch(e){ return null; } };
  const gravarPend = o => { try{ localStorage.setItem(CH, JSON.stringify(Object.assign({ em: Date.now() }, o))); }catch(e){} };
  const limparPend = () => { try{ localStorage.removeItem(CH); }catch(e){} };
  const R = v => formatarMoeda(Number(v) || 0);

  async function token_(){ return window.contaTokenOuNull_ ? await window.contaTokenOuNull_() : null; }
  async function edge_(nome, corpo, ms){
    const tok = await token_(); if(!tok) throw new Error('Entre na sua conta para pagar pelo site.');
    const rr = await sbJson_(SUPABASE_URL_ + '/functions/v1/' + nome, { method:'POST', headers:{ 'apikey':SUPABASE_CHAVE_, 'Authorization':'Bearer ' + tok, 'Content-Type':'application/json' }, body: JSON.stringify(corpo || {}) }, ms || 30000);
    const j = await rr.json().catch(() => null);
    if(!rr.ok && !(j && j.message)) throw new Error('O servidor de pagamento não respondeu (' + rr.status + ').');
    return j || {};
  }

  /* ---------- telas ---------- */
  function tela_(pag){
    const sim = !!pag.simulacao;
    const metodo = pag.metodo === 'credito' ? 'cartão de crédito' : 'Pix';
    let h = '<h2 class="mp-topo">' + (sim ? '🧪 Pagamento SIMULADO' : 'Pague na InfinitePay') + '</h2>';
    if(sim){
      h += '<p class="mp-sub">Modo SIMULAÇÃO da InfinitePay: nenhum dinheiro é cobrado. Escolha o que acontece com este pagamento de ' + escH(R(pag.valor)) + ':</p>'
        + '<div class="btnrow"><button type="button" class="mp-btn" onclick="cdIpSimular_(\'pagar\')">✅ Pagar</button><button type="button" class="mp-btn mp-sec" onclick="cdIpSimular_(\'recusar\')">❌ Recusar</button><button type="button" class="mp-btn mp-sec" onclick="cdIpSimular_(\'expirar\')">⌛ Expirar</button></div>';
    } else if(pag.link){
      h += '<p class="mp-sub">Toque no botão para abrir a página segura da InfinitePay e pagar com ' + metodo + ' (' + escH(R(pag.valor)) + '). Depois de pagar, volte para esta tela: ela muda sozinha.</p>'
        + '<a class="mp-btn" id="cdIpAbrir" href="' + escH(pag.link) + '" target="_blank" rel="noopener" onclick="cdIpAbriu_()">Abrir o pagamento da InfinitePay</a>'
        + '<button type="button" class="mp-btn mp-sec" onclick="cdIpJaPaguei_()">Já paguei</button>';
    }
    h += '<div class="mp-timer" id="cdMpTimerBox">O pagamento vale por<b class="mp-num" id="cdMpCron">--:--</b></div>'
      + '<div class="mp-status" role="status"><span class="mp-dot" id="cdMpDot"></span><span id="cdMpStatusTxt">Aguardando o pagamento…</span></div><div class="msg" id="cdMpMsg"></div>'
      + '<p class="mp-nota">O pedido só vai para a cozinha depois que a InfinitePay confirmar o pagamento. Não pague duas vezes.</p>'
      + '<button type="button" class="mp-btn mp-sec" onclick="cdMpFecharPagamento_(true)">Cancelar pagamento</button>';
    cdMpMostrarModal_(h);
  }
  function telaConferindo_(){
    cdMpMostrarModal_('<h2 class="mp-topo">Conferindo o seu pagamento</h2><p class="mp-sub">Estamos confirmando com a InfinitePay. Não pague de novo.</p>'
      + '<div class="mp-status" role="status"><span class="mp-dot"></span><span id="cdMpStatusTxt">Conferindo…</span></div><div class="msg" id="cdMpMsg"></div>'
      + '<button type="button" class="mp-btn mp-sec" onclick="cdMpFecharPagamento_(false)">Fechar (o pedido segue em Minha conta)</button>', 'cdMpFecharPagamento_(false)');
  }
  const status_ = t => { const e = document.getElementById('cdMpStatusTxt'); if(e) e.textContent = t; };

  /* ---------- acompanhar: pergunta ao ip-status (que confere com a InfinitePay) ---------- */
  let extra_ = null;   // dados da volta do checkout (slug, transação…), enviados na primeira consulta
  async function consultar_(reservaId){
    const corpo = Object.assign({ reservaId }, extra_ || {});
    const r = await edge_('ip-status', corpo, 20000);
    if(r && r.ok) extra_ = null;
    return r;
  }
  function tratar_(r){
    if(!r || !r.ok) return false;
    if(r.estado === 'aprovado'){ limparPend(); cdMpAprovar_(r); return true; }
    if(r.estado === 'conferindo'){ limparPend(); cdMpTelaConferindo_(); return true; }
    if(r.estado === 'reembolso'){ limparPend(); cdMpTelaFalha_('Este pagamento foi devolvido. Escolha outra forma de pagamento.'); return true; }
    if(['expirado','cancelado'].includes(r.estado)){ limparPend(); cdMpTelaFalha_('O tempo para pagar terminou e o pedido foi cancelado. Se você chegou a pagar, o restaurante entra em contato. Escolha uma forma de pagamento para refazer o pedido.'); return true; }
    if(['recusado','erro'].includes(r.estado)){ limparPend(); cdMpTelaFalha_('O pagamento não foi concluído. Escolha outra forma de pagamento.'); return true; }
    return false;
  }
  function acompanhar_(reservaId, expiraEm){
    const meu = ++cdMpPollId_; if(cdMpTimer_){ clearTimeout(cdMpTimer_); cdMpTimer_ = null; }
    const fim = Date.parse(expiraEm || '') || 0;
    const passo = async () => {
      if(meu !== cdMpPollId_) return;
      let r = null; try{ r = await consultar_(reservaId); passo.f = 0; }catch(e){ passo.f = (passo.f || 0) + 1; }
      if(meu !== cdMpPollId_) return;
      if(passo.f >= 3) status_('📡 Sem conexão para conferir o pagamento agora. Continuamos tentando — não pague de novo.');
      if(r && !r.ok && r.message && passo.f === 0) status_('⚠️ ' + r.message);
      if(tratar_(r)) return;
      if(fim && Date.now() > fim + 60000){ limparPend(); cdMpTelaFalha_('O prazo do pagamento terminou. Se você pagou, o restaurante confere e entra em contato. Escolha uma forma de pagamento para refazer o pedido.'); return; }
      cdMpTimer_ = setTimeout(passo, 5000);
    };
    cdMpTimer_ = setTimeout(passo, 2500);
  }
  window.cdIpAbriu_ = () => status_('Pague na janela da InfinitePay e volte aqui. Esta tela confere sozinha.');
  window.cdIpJaPaguei_ = async () => {
    const id = cdMpUltimaReserva_; if(!id) return;
    status_('Conferindo com a InfinitePay…');
    try{ const r = await consultar_(id); if(!tratar_(r)) status_('Ainda não recebemos a confirmação. Se você acabou de pagar, aguarde alguns segundos (a tela confere sozinha).'); }
    catch(e){ status_('📡 Sem conexão para conferir agora. Tente de novo em instantes.'); }
  };
  window.cdIpSimular_ = async (acao) => {
    const id = cdMpUltimaReserva_; if(!id) return;
    status_('Simulando…');
    try{
      const r = await cdMpRpcCliente_('api_ip_simular', { reservaId: id, acao });
      if(!r || !r.ok){ showMsg('cdMpMsg', (r && r.message) || 'A simulação não funcionou.', 'warn'); return; }
      if(acao === 'pagar') cdMpPagamentoEmAndamento_ = true;   // pago: fechar a janela não pode cancelar a reserva
      const st = await consultar_(id); if(!tratar_(st)) status_('Aguardando…');
    }catch(e){ showMsg('cdMpMsg', 'Sem conexão para simular agora.', 'warn'); }
  };

  /* ---------- começar ---------- */
  window.cdIpIniciar_ = async function(dados, tipoOnline){
    const btn = document.getElementById('cdEnviarPedidoBtn'); if(btn){ btn.disabled = true; btn.textContent = 'Preparando pagamento…'; }
    try{
      const cfg = await cdMpConfigPublica_();
      if(!cfg || !cfg.ligado) throw new Error('O pagamento pelo site está indisponível agora. Escolha pagar na entrega.');
      const reserva = await cdMpRpcCliente_('api_mp_reservar', dados);
      if(!reserva || !reserva.ok || !reserva.reservaId) throw new Error((reserva && reserva.message) || 'Não foi possível reservar o pedido.');
      cdMpReservaAtiva_ = reserva.reservaId; cdMpUltimaReserva_ = reserva.reservaId; cdMpUltimoMetodo_ = tipoOnline === 'credito' ? 'credito' : 'pix';
      const pag = await edge_('ip-criar', { reservaId: reserva.reservaId, retorno: location.origin + location.pathname }, 45000);
      if(!pag || !pag.ok) throw new Error((pag && pag.message) || 'Não foi possível criar o pagamento. Você pode pagar na entrega.');
      if(pag.estado !== 'aguardando') throw new Error(pag.mensagem || 'Não foi possível criar o pagamento na InfinitePay. Escolha pagar na entrega.');
      if(!pag.simulacao && !pag.link) throw new Error('A InfinitePay não devolveu o link de pagamento. Escolha pagar na entrega.');
      gravarPend({ reservaId: reserva.reservaId, metodo: cdMpUltimoMetodo_ });
      const expira = pag.expiraEm || reserva.expiraEm || '';
      tela_(pag);
      cdMpCronometro_(Date.parse(expira || '') || 0);
      acompanhar_(reserva.reservaId, expira);
    }catch(e){
      showMsg('cdCheckoutMsg', e.message || 'Não foi possível iniciar o pagamento. Escolha pagar na entrega.', 'warn');
      if(cdMpReservaAtiva_) await cdMpCancelarReserva_(cdMpReservaAtiva_);
    }finally{ if(btn){ btn.disabled = false; btn.textContent = cdRotuloEnviar_(); } }
  };

  /* ---------- volta do checkout (ou página recarregada no meio do pagamento) ---------- */
  async function retomar_(){
    const q = new URLSearchParams(location.search);
    let reservaId = q.get('ipRetorno') || '';
    if(reservaId){
      extra_ = { slug: q.get('slug') || q.get('invoice_slug') || '', transacao: q.get('transaction_nsu') || '', nsu: q.get('order_nsu') || '', recibo: q.get('receipt_url') || '', metodo: q.get('capture_method') || '' };
      try{ ['ipRetorno','slug','invoice_slug','transaction_nsu','order_nsu','receipt_url','capture_method'].forEach(k => q.delete(k)); history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); }catch(e){}
    } else { const p = lerPend(); if(!p) return; reservaId = p.reservaId; }
    if(!/^[0-9a-f-]{36}$/i.test(reservaId)) return;
    for(let i = 0; i < 20 && !(await token_()); i++) await new Promise(r => setTimeout(r, 500));   // espera a conta do cliente entrar
    if(!(await token_())){ if(extra_) avisar('Entre na sua conta para conferirmos o pagamento da InfinitePay.', 'erro', 12000); return; }
    cdMpUltimaReserva_ = reservaId; cdMpReservaAtiva_ = reservaId;
    telaConferindo_();
    try{ const r = await consultar_(reservaId); if(tratar_(r)) return; if(r && r.ok && r.estado === 'aguardando'){ tela_({ link: r.link, simulacao: r.simulacao, valor: r.valorTotal, metodo: r.metodo }); cdMpCronometro_(Date.parse(r.expiraEm || '') || 0); } }
    catch(e){ status_('📡 Sem conexão para conferir agora. Continuamos tentando.'); }
    acompanhar_(reservaId, '');
  }
  if(typeof window.cdMpMostrarModal_ === 'function' || typeof cdMpMostrarModal_ === 'function'){
    if(document.readyState === 'complete') setTimeout(retomar_, 800); else window.addEventListener('load', () => setTimeout(retomar_, 800));
  }

  /* =====================================================================
     ADMIN — cartão InfinitePay
     ===================================================================== */
  if(typeof INTEG_INFO_ !== 'undefined'){
    INTEG_INFO_.infinitepay = { nome:'InfinitePay (Pix e crédito no checkout)', icone:'💠',
      segredos:[['ip_handle','InfiniteTag (sem o $)'],['ip_chave_checkout','Chave do Checkout (inchk_…, só se a sua conta mostrar)'],['ip_webhook_segredo','Segredo do aviso (gerado pelo sistema)']],
      guia:[
        'Quem faz: o DONO do restaurante (a conta da InfinitePay é dele). Os nomes das telas da InfinitePay podem mudar um pouco; siga o sentido de cada passo.',
        '1) Conta InfinitePay: tenha uma conta com o cadastro (e o da empresa, se for CNPJ) concluído. Sem isso, o dinheiro do Pix e do cartão não é liberado. Marque o passo no checklist.',
        '2) Checkout Integrado: no app ou no site da InfinitePay, procure a área de Checkout / Integrações e ative o Checkout Integrado. É ele que gera o link de pagamento pelo sistema.',
        '3) Dados da conta: copie a sua InfiniteTag (o nome de usuário, SEM o $ do começo) e, se a tela mostrar, a chave do Checkout (começa com inchk_). Digite aqui nos botões "Digitar". NUNCA mande por mensagem.',
        '4) Aviso de pagamento: não há nada para configurar no painel da InfinitePay. Toque em "Gerar" no Segredo do aviso: o sistema manda o endereço do aviso junto de cada cobrança. Mesmo assim, o sistema CONFERE cada pagamento direto com a InfinitePay antes de aprovar o pedido.',
        '5) Formas online: em "Quem recebe cada forma", escolha para Pix e/ou Cartão de crédito: InfinitePay, Mercado Pago ou só na entrega. Débito não existe na InfinitePay.',
        '6) Simulação: ligue em SIMULAÇÃO, digite o e-mail da conta Google que você usa no cardápio, abra o cardápio e faça um pedido. Use os botões Pagar, Recusar e Expirar. Quando os três funcionarem, o passo se marca sozinho.',
        '7) Teste real de valor pequeno: em PRODUÇÃO, faça um pedido barato pagando com Pix e outro com crédito. Confira no app da InfinitePay. ATENÇÃO: vira pedido de verdade na cozinha e no caixa; avise a equipe. Depois devolva pelo app da InfinitePay e use "Registrar reembolso" aqui.',
        '8) Produção: com tudo marcado, ligue em PRODUÇÃO (pede a senha do Admin). Dá para desligar a qualquer hora: o cardápio volta a usar só o pagamento na entrega ou o Mercado Pago.',
        '⚠️ Esta parte ainda não foi testada com a InfinitePay de verdade: os detalhes podem pedir ajuste na primeira ligação real.'],
      opcoes:[] };
  }
  let ipModoVisto_ = '';
  const ipModo_ = it => (it.ligado && it.modo) ? it.modo : (ipModoVisto_ || 'homologacao');
  window.ipEscolherModo_ = m => { ipModoVisto_ = m; renderIntegracoes_(); };
  window.ipGuiaAlternar_ = () => { const g = document.getElementById('ipGuia'); if(g) g.hidden = !g.hidden; };
  window.ipAlternarLigado_ = () => {
    const it = (integStatus_ || []).find(x => x.provedor === 'infinitepay'); if(!it) return;
    if(it.ligado) return desligarInteg_('infinitepay');
    ligarInteg_('infinitepay', ipModo_(it));
  };
  let ipUltimaLista_ = null;
  window.ipCardHtml_ = function(it, inf){
    const seg = it.segredos || {}, modo = ipModo_(it), prod = modo === 'producao', cfg = it.config || {};
    const pode = prod ? it.podeLigarProducao : it.podeLigarTeste;
    const bt = 'class="ghost" style="width:auto;padding:4px 10px;min-height:32px;margin:0;"';
    const camp = (k, rot, extra) => `<div class="mp-camp">${escH(rot)}<span class="v">${seg[k] ? `<span id="isVer_${k}">••••${escH(seg[k].final||'')}</span><button ${bt} onclick="verIntegSegredo_('${k}')">Ver</button>` : '<span class="txt-muted">ainda não digitada</span>'}${extra || `<button ${bt} onclick="abrirIntegSegredo_('${k}','${escH(rot)}')">${seg[k]?'Trocar':'Digitar'}</button>`}</span></div>`;
    const ul = ipUltimaLista_ || {};
    const lista = (it.checklist || []).map(c => {
      // passos que só podem ser feitos DEPOIS de ligar em produção: o servidor não os cobra antes, então o ✓ vem do que aconteceu de fato
      if(c.id === 'ip_real') c = Object.assign({}, c, { feito: !!(ul.realPix && ul.realCredito) });
      if(c.id === 'reembolso') c = Object.assign({}, c, { feito: !!(ul.itens || []).some(x => x.modo === 'producao' && (x.reembolsos || []).length) || !!(it.checklistBruto || {}).reembolso });
      const ic = `<span class="mp-i ${c.feito?'v':'p'}" aria-hidden="true">${c.feito?'✓':'!'}</span>`;
      return c.auto ? `<li>${ic}<span>${escH(c.titulo)}</span></li>`
        : `<li><label style="display:flex;gap:8px;align-items:flex-start;cursor:pointer;"><input type="checkbox" ${c.feito?'checked':''} onchange="marcarIntegPasso_('infinitepay','${c.id}',this.checked)" style="position:absolute;opacity:0;width:1px;height:1px;">${ic}<span>${escH(c.titulo)} <small class="txt-muted">(toque para marcar)</small></span></label></li>`;
    }).join('');
    const estado = it.ligado ? 'LIGADO · ' + (it.modo === 'producao' ? 'PRODUÇÃO' : 'SIMULAÇÃO') : 'DESLIGADO';
    const pend = (prod ? it.pendenciasProducao : it.pendenciasTeste) || [];
    const formas = (it.formas || []).map(f => {
      const tp = f.aceitaOnline ? (f.tipoOnline || mpTipoDoNome_(f.nome)) : mpTipoDoNome_(f.nome);
      if(!tp) return `<div class="obs-line d-flex gap-2 ai-centro fx-wrap"><span style="min-width:120px;">${escH(f.nome)}</span><span style="opacity:.75;">Só na entrega</span></div>`;
      return `<div class="obs-line d-flex gap-2 ai-centro fx-wrap"><span style="min-width:120px;">${escH(f.nome)}</span>${pagFormaSelect_(f, tp)}</div>`;
    }).join('') || '<div class="obs-line">Nenhuma forma de pagamento ativa no cardápio.</div>';
    const formasIp = (it.formas || []).filter(f => f.aceitaOnline && f.provedorOnline === 'infinitepay').map(f => mpRotuloTipo_(f.tipoOnline));
    const url = (typeof SUPABASE_URL_ !== 'undefined' ? SUPABASE_URL_ : '') + '/functions/v1/ip-webhook';
    const emails = Array.isArray(cfg.emailsTeste) ? cfg.emailsTeste.join(', ') : '';
    const real = ipUltimaLista_ && ipUltimaLista_.realPix && ipUltimaLista_.realCredito;
    return `<div class="mp-adm ${it.ligado?'on':''}">
      <h3>${inf.icone} InfinitePay <span class="mp-estado ${it.ligado?'on':''}">${estado}</span></h3>
      <p class="mp-sub">Pagamento no checkout da InfinitePay (o cliente sai do cardápio e volta). Desligado, o cardápio funciona como sempre.</p>
      ${real ? '' : '<div class="msg warn" style="display:block;">⚠️ Integração ainda não validada com conta real. Faça a simulação e o teste real de valor pequeno antes de usar no dia a dia.</div>'}
      <div class="ig-res ${it.ligado || !pend.length ? 'ok' : 'falta'}"><div class="ig-prox">${it.ligado ? '✅ Funcionando em ' + (it.modo==='producao'?'PRODUÇÃO':'SIMULAÇÃO') + '.' : pend.length ? '👉 Para ligar em ' + (prod?'PRODUÇÃO':'SIMULAÇÃO') + ' falta: ' + escH(pend.join('; ')) : '🎉 Tudo pronto para ligar em ' + (prod?'PRODUÇÃO':'SIMULAÇÃO') + '.'}</div></div>
      <ul class="mp-lista">${lista}</ul>
      <div class="mp-camp">Modo<div class="mp-modo"><button type="button" aria-pressed="${!prod}" ${it.ligado?'disabled':''} onclick="ipEscolherModo_('homologacao')">Simulação</button><button type="button" aria-pressed="${prod}" ${it.ligado?'disabled':''} onclick="ipEscolherModo_('producao')">Produção</button></div></div>
      ${camp('ip_handle', 'InfiniteTag (sem o $)')}
      ${camp('ip_chave_checkout', 'Chave do Checkout (opcional)')}
      ${camp('ip_webhook_segredo', 'Segredo do aviso', `<button ${bt} onclick="ipGerarSegredo_()">${seg.ip_webhook_segredo?'Gerar novo':'Gerar'}</button>`)}
      <div class="mp-camp">Formas pela InfinitePay<span class="v">${formasIp.length ? escH(formasIp.join(' · ')) : '<span class="txt-muted">nenhuma escolhida</span>'}</span></div>
      <button type="button" class="mp-sw" role="switch" aria-checked="${!!it.ligado}" ${(!it.ligado && !pode)?'disabled':''} onclick="ipAlternarLigado_()"><i></i><span>Ligar InfinitePay <small>(pede a senha do Admin)</small></span></button>
      ${it.ligado ? (it.modo==='producao' ? `<button class="mp-admbtn" onclick="ligarInteg_('infinitepay','homologacao')">Voltar para SIMULAÇÃO</button>` : `<button class="mp-admbtn" ${it.podeLigarProducao?'':'disabled'} onclick="ligarInteg_('infinitepay','producao')">Passar para PRODUÇÃO</button>`) : ''}
      <button type="button" class="mp-admbtn" onclick="ipGuiaAlternar_()">Ver guia passo a passo</button>
      <div id="ipGuia" class="mp-guia" hidden>${inf.guia.map(g => `<div class="obs-line">${escH(g)}</div>`).join('')}</div>
      <div class="mt-3"><b>💳 Quem recebe cada forma paga pelo site</b>
        <div class="obs-line">A mesma escolha aparece no cartão do Mercado Pago. A InfinitePay faz Pix e crédito (débito, não).</div>${formas}</div>
      <div class="mt-3"><b>⚙️ Ajustes</b>
        <label class="obs-line" for="ipLinkMin">Validade do link de pagamento (minutos, de 10 a 120; combinado: 30)</label>
        <input type="number" id="ipLinkMin" min="10" max="120" value="${Number(cfg.linkValidadeMin)||30}" style="width:90px;" onchange="ipSalvarConfig_({ linkValidadeMin: Number(this.value) })">
        <label class="obs-line" for="ipEmails">E-mails que veem a InfinitePay em SIMULAÇÃO (até 5, separados por vírgula)</label>
        <input type="text" id="ipEmails" value="${escH(emails)}" maxlength="300" placeholder="voce@gmail.com" onchange="ipSalvarEmails_(this.value)">
        <label class="obs-line" style="display:flex;gap:8px;align-items:flex-start;cursor:pointer;"><input type="checkbox" ${cfg.testeNoCardapio?'checked':''} onchange="ipSalvarConfig_({ testeNoCardapio: this.checked })" style="width:auto;margin-top:3px;"> <span>Em SIMULAÇÃO, mostrar a TODOS os clientes (só aparece; "Pagar" simulado continua só para os e-mails acima)</span></label>
        <label class="obs-line" style="display:flex;gap:8px;align-items:flex-start;cursor:pointer;"><input type="checkbox" ${cfg.producaoSoTeste?'checked':''} onchange="ipSalvarConfig_({ producaoSoTeste: this.checked })" style="width:auto;margin-top:3px;"> <span>Em PRODUÇÃO, mostrar SÓ para os e-mails acima (use no teste real de valor pequeno; desmarque para liberar a todos)</span></label></div>
      <div class="mt-3"><b>🔔 Endereço do aviso (só para o suporte)</b>
        <div class="obs-line" style="overflow-wrap:anywhere;font-family:monospace;">${escH(url)}?s=…</div>
        <div class="obs-line">A InfinitePay recebe este endereço junto de cada cobrança: não há nada para colar no painel dela.</div></div>
      <div class="mt-3"><b>🧪 Teste guiado e pagamentos</b>
        <div class="btnrow mt-1"><button class="ghost" onclick="mpAbrirCardapioIp_()">Abrir o cardápio</button><button class="ghost" onclick="ipCarregarPagamentos_()">Atualizar lista</button><button class="ghost" onclick="verLogInteg_('infinitepay')">Ver registro</button></div>
        <div id="integLog_infinitepay"></div>
        <div id="ipPagamentos"><div class="obs-line">Carregando…</div></div></div>
    </div>`;
  };
  window.mpAbrirCardapioIp_ = () => {
    const it = (integStatus_ || []).find(x => x.provedor === 'infinitepay');
    if(!it || !it.ligado){ showMsg(integMsgId_(), 'Ligue a InfinitePay (SIMULAÇÃO) antes de testar.', 'warn'); return; }
    window.open((typeof QR_BASE_URL_ !== 'undefined' ? QR_BASE_URL_ : location.href), '_blank', 'noopener');
  };
  window.ipSalvarConfig_ = async (config) => {
    try{ const r = await apiCall('integracoesConfig', { provedor:'infinitepay', config }); if(r && r.ok){ integStatus_ = r.integracoes || integStatus_; showMsg(integMsgId_(), r.message || 'Ajustes salvos.', 'ok'); } else showMsg(integMsgId_(), (r && r.message) || 'Não foi possível salvar.', 'warn'); }
    catch(e){ showMsg(integMsgId_(), 'Sem conexão.', 'warn'); }
    renderIntegracoes_();
  };
  window.ipSalvarEmails_ = (txt) => {
    const lista = String(txt || '').split(/[,;\s]+/).map(x => x.trim().toLowerCase()).filter(Boolean);
    if(lista.length > 5){ showMsg(integMsgId_(), 'No máximo 5 e-mails.', 'warn'); return; }
    ipSalvarConfig_({ emailsTeste: lista });
  };
  window.ipGerarSegredo_ = async () => {
    const it = (integStatus_ || []).find(x => x.provedor === 'infinitepay') || {};
    if((it.segredos || {}).ip_webhook_segredo && !await confirmarTxt_('Gerar um segredo NOVO? Os links de pagamento que já foram enviados deixam de avisar o sistema sozinhos (eles ainda são conferidos quando o cliente volta ou pelo "Já paguei"). Faça isso fora do horário de pedidos.')) return;
    abrirModalSenhaAdmin(async (senha) => {
      try{ const r = await apiCall('ipGerarSegredo', { senha }); if(r && r.ok){ integStatus_ = r.integracoes || integStatus_; renderIntegracoes_(); showMsg(integMsgId_(), r.message || 'Gerado.', 'ok'); } else showMsg(integMsgId_(), (r && r.message) || 'Não foi possível gerar.', 'warn'); }
      catch(e){ showMsg(integMsgId_(), 'Sem conexão.', 'warn'); }
    });
  };
  const ROT_ST = { aguardando:'aguardando', aprovado:'aprovado', recusado:'recusado', expirado:'vencido', cancelado:'cancelado', reembolso_parcial:'reembolso parcial', reembolsado:'reembolsado', erro:'erro' };
  window.ipCarregarPagamentos_ = async () => {
    const box = document.getElementById('ipPagamentos'); if(!box) return;
    try{
      const r = await apiCall('ipPagamentos', {});
      if(!r || !r.ok){ box.innerHTML = '<div class="msg warn" style="display:block;">⚠️ ' + escH((r && r.message) || 'Não foi possível carregar.') + '</div>'; return; }
      const novoReal = r.realPix && r.realCredito, mudou = !ipUltimaLista_ || (ipUltimaLista_.realPix && ipUltimaLista_.realCredito) !== novoReal;
      ipUltimaLista_ = r;
      const ok = (b, t) => (b ? '✅ ' : '⬜ ') + t;
      const it = r.itens || [];
      box.innerHTML = '<div class="obs-line">' + [ok(r.simAprovado, 'Simulação: aprovado'), ok(r.simRecusado, 'recusado'), ok(r.simExpirado, 'expirado'), ok(r.realPix, 'Real: Pix'), ok(r.realCredito, 'Real: crédito')].join(' · ') + '</div>'
        + (it.length ? '<div style="max-height:260px;overflow:auto;margin-top:6px;">' + it.map(x => `<div class="obs-line">${escH(x.em)} · ${x.modo==='producao'?'produção':'simulação'} · ${x.metodo==='pix'?'Pix':'Crédito'}${x.pagoCom && x.pagoCom !== (x.metodo==='pix'?'pix':'credit_card') ? ' (pago com ' + escH(x.pagoCom==='pix'?'Pix':x.pagoCom==='credit_card'?'crédito':x.pagoCom) + ')' : ''} · ${R(x.valor)} · ${escH(ROT_ST[x.status]||x.status)}${x.reembolsado > 0 ? ' · devolvido ' + R(x.reembolsado) : ''}${x.aDecidir?' · A DECIDIR':''}${x.detalhe?' · '+escH(x.detalhe):''}${x.recibo?` · <a href="${escH(x.recibo)}" target="_blank" rel="noopener">recibo</a>`:''}
            ${['aprovado','reembolso_parcial'].includes(x.status) ? `<button class="ghost" style="width:auto;padding:2px 8px;min-height:28px;margin-left:6px;" onclick="ipReembolsoForm_('${x.id}', ${Number(x.valor) - Number(x.reembolsado || 0)})">Registrar reembolso</button>` : ''}
            ${(x.reembolsos || []).map(m => `<div class="fs-xs txt-muted" style="margin-left:12px;">↩ ${R(m.valor)} em ${escH(m.em)} por ${escH(m.por || '?')}: ${escH(m.motivo)}</div>`).join('')}</div>`).join('') + '</div>'
          : '<div class="obs-line">Nenhum pagamento pela InfinitePay ainda.</div>');
      if(mudou) renderIntegracoes_();   // o aviso "ainda não validada" depende do teste real
    }catch(e){ box.innerHTML = '<div class="msg warn" style="display:block;">⚠️ Sem conexão para carregar os pagamentos.</div>'; }
  };
  window.ipReembolsoForm_ = async (pagamentoId, maximo) => {
    let f = null;
    try{
      f = await vsForm({ titulo:'Registrar reembolso (InfinitePay)', texto:'Primeiro devolva o dinheiro no app da InfinitePay. Depois registre aqui o valor devolvido. A venda continua ativa: decida depois se cancela.', ok:'Registrar',
        campos:[ { id:'valor', rotulo:'Valor devolvido (até ' + R(maximo) + ')', tipo:'numero', obrigatorio:true, maiorQueZero:true, valor: String(Number(maximo || 0).toFixed(2)).replace('.', ',') }, { id:'motivo', rotulo:'Motivo', tipo:'texto', obrigatorio:true, minLetras:3, sugestoes:['Cliente desistiu','Item em falta','Pedido duplicado','Teste'] } ] });
    }catch(e){ f = null; }
    if(!f) return;
    const valor = Number(f.valor);
    if(!(valor > 0)){ showMsg(integMsgId_(), 'Valor inválido.', 'warn'); return; }
    abrirModalSenhaAdmin(async (senha) => {
      try{
        const r = await apiCall('ipReembolso', { pagamentoId, valor, motivo: f.motivo || '', senha });
        if(r && r.ok){ showMsg(integMsgId_(), r.message || 'Reembolso registrado.', 'ok'); ipCarregarPagamentos_(); try{ mpCarregarPendenciasDecisao_(); }catch(e){} }
        else showMsg(integMsgId_(), (r && r.message) || 'Não foi possível registrar.', 'warn');
      }catch(e){ showMsg(integMsgId_(), 'Sem conexão. Confira antes de repetir.', 'warn'); }
    });
  };
})();
