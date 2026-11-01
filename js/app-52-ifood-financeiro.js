/* =====================================================================
   v1.15 — Tela "💰 iFood: vendas e repasses" (Administrador → Dinheiro)
   O módulo Financeiro do iFood (pedido na homologação): vendas com comissão e taxas, lançamentos (créditos e débitos),
   repasses (títulos, status, banco), antecipações D+1/D+7 e o arquivo mensal de conciliação (CSV) para baixar.
   A conferência da semana compara: lançamentos COM impacto no repasse × repasse do iFood (regra oficial, tolerância 0,01%).
   Só leitura: nada aqui muda vendas, caixa ou o iFood. Erros sempre aparecem na tela.
   ===================================================================== */
(function(){
  'use strict';
  const R$ = v => v == null ? '—' : formatarMoeda(v);
  const sinal = v => v == null ? '—' : '<b style="color:' + (Number(v) < 0 ? '#e5534b' : '#3fb950') + ';">' + (Number(v) > 0 ? '+' : '') + formatarMoeda(v) + '</b>';
  const dBR = s => { if(!s) return '—'; const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1].slice(2) : s; };
  const dhBR = iso => iso ? new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : '—';
  const ha = iso => { if(!iso) return 'nunca'; const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); return m < 1 ? 'agora' : m < 60 ? 'há ' + m + ' min' : m < 1440 ? 'há ' + Math.round(m / 60) + ' h' : 'há ' + Math.round(m / 1440) + ' dia(s)'; };
  const mesTxt = ym => { const a = String(ym || '').split('-'); const n = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'][Number(a[1]) - 1]; return n ? n + ' de ' + a[0] : ym; };
  const erroBox = t => '<div class="msg warn" role="alert" style="display:block;">⚠️ ' + escH(t) + '</div>';
  const iso = d => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); };

  const NOMES = { ORDER_PAYMENT:'Pagamento do pedido', ORDER_COMMISSION:'Comissão do iFood', SERVICE_FEE:'Taxa de serviço', DELIVERY_FEE_IFOOD:'Entrega feita pelo iFood',
    DELIVERY_FEE:'Taxa de entrega', IFOOD_SUBSIDY:'Promoção paga pelo iFood', STORE_SUBSIDY:'Promoção paga pela loja', CHAIN_SUBSIDY:'Promoção paga pela rede',
    MERCHANT_SUBSIDY:'Promoção paga pela loja', ANTICIPATION_FEE:'Taxa de antecipação', STORE_REFUND:'Reembolso (cancelamento)', COMMISSION_EXEMPTION:'Isenção de comissão',
    PAYMENT_FEE:'Taxa de transação', TRANSACTION_FEE:'Taxa de transação', PAYMENT_TRANSACTION_FEE:'Taxa de transação', SALE_CANCELLED:'Venda cancelada', SALE_CONCLUDED:'Venda concluída',
    ORDER_CANCELLATION:'Cancelamento do pedido', IFOOD_REFUND:'Ressarcimento do iFood', MONTHLY_FEE:'Mensalidade', ADJUSTMENT:'Ajuste' };
  const nome = n => NOMES[String(n || '').toUpperCase()] || String(n || '—').replace(/_/g, ' ').toLowerCase();
  const STATUS_VENDA = { CONCLUDED:'Concluído', CANCELLED:'Cancelado', PLACED:'Feito', CREATED:'Criado', CONFIRMED:'Confirmado', DISPATCHED:'Saiu para entrega', DISPATCH:'Saiu para entrega',
    DELIVERED:'Entregue', READY:'Pronto', ARRIVED:'Chegou', SEPARATION_STARTED:'Em separação', SEPARATION_ENDED:'Separado' };
  const METODO = { CREDIT:'Crédito', DEBIT:'Débito', PIX:'Pix', CASH:'Dinheiro', MEAL_VOUCHER:'Vale-refeição', FOOD_VOUCHER:'Vale-alimentação', DIGITAL_WALLET:'Carteira digital', GIFT_CARD:'Vale-presente' };
  const QUEM = { IFOOD:'quem recebe: iFood (entra no repasse)', MERCHANT:'quem recebe: a loja (fora do repasse)', STORE:'quem recebe: a loja (fora do repasse)' };
  const TITULO = { REPASSE:'Repasse (você recebe)', BOLETO:'Boleto (você deve ao iFood)', REGISTRO_RECEBIVEIS:'Retido para banco (registro de recebíveis)', RENEGOCIADA:'Renegociado' };
  const ST_TIT = { PENDING:'⏳ Previsto', SUCCEED:'✅ Pago', FAILED:'🔴 Falhou', TRANSFER_RENEGOTIATED:'↪️ Renegociado' };
  const ANT = { REPASSE_ANTECIPADO_SEMANAL:'Antecipação semanal (D+7)', REPASSE_ANTECIPADO_DIARIO:'Antecipação diária (D+1)' };
  const API_TXT = { vendas:'Vendas', eventos:'Lançamentos', repasses:'Repasses', antecipacoes:'Antecipações', conciliacao:'Arquivo mensal' };

  const hoje = new Date();
  let aba = 'semana', ini = iso(new Date(hoje.getTime() - 30 * 86400000)), fim = iso(hoje), filtroImp = '', busca = '';
  let painel = null, dados = {}, loteAtivo = null, timerLote = null, timerArq = null, msgTopo = '';

  function corpo_(){ return document.getElementById('ifinCorpo'); }

  window.carregarIfoodFin_ = async function(){
    const c = corpo_(); if(!c) return;
    c.innerHTML = '<div class="obs-line">⏳ Carregando o financeiro do iFood…</div>';
    try{
      const r = await apiCall('ifoodFinDados', { aba:'painel', ini, fim });
      if(!r || !r.ok){ c.innerHTML = erroBox((r && r.message) || 'Não foi possível carregar o financeiro do iFood.'); return; }
      painel = r;
    }catch(e){ c.innerHTML = erroBox('Sem conexão. Confira a internet e toque em Atualizar.'); return; }
    await carregarAba_();
  };

  async function carregarAba_(){
    const nomeApi = { vendas:'vendas', lancamentos:'eventos', repasses:'repasses', antecipacoes:'antecipacoes', arquivo:'conciliacao' }[aba];
    dados[aba] = { carregando:true };
    desenhar_();
    if(!nomeApi){ dados[aba] = {}; desenhar_(); return; }
    try{
      const r = await apiCall('ifoodFinDados', { aba:nomeApi, ini, fim, busca, impacto:filtroImp });
      dados[aba] = (r && r.ok) ? r : { erro:(r && r.message) || 'Não foi possível carregar.' };
    }catch(e){ dados[aba] = { erro:'Sem conexão. Tente de novo.' }; }
    desenhar_();
    if(aba === 'arquivo') vigiarArquivo_();
  }

  function cabecalho_(){
    const p = painel || {}; let h = '';
    if(!p.ligado) h += erroBox('A integração do iFood está DESLIGADA: nada novo é buscado. Ligue em Sistema → Integrações e contas → iFood.');
    const mod = p.modulo || {};
    if(mod.status === 403 && (!mod.ultimoOk || new Date(mod.ultimoErroEm) > new Date(mod.ultimoOk)))
      h += '<div class="msg warn" role="alert" style="display:block;">🔒 <b>O iFood ainda não liberou o módulo Financeiro para este app (403).</b> Ele é liberado na homologação do Financeiro, que é um chamado separado no Portal do Desenvolvedor (Suporte → Chamados → Homologação). Até lá estas telas ficam vazias; o restante do iFood funciona normalmente.</div>';
    else if(mod.status === 401) h += erroBox('O iFood recusou as credenciais (401). Confira Client ID e Client Secret em Integrações e contas → iFood.');
    if(p.homologacao) h += '<div class="obs-line">🧪 <b>Modo homologação ligado</b>: as buscas vão com o aviso de teste do iFood (x-request-homologation). Desligue depois de homologar.</div>';
    const cs = p.consultas || {};
    h += '<div class="obs-line fs-xs" style="display:flex;flex-wrap:wrap;gap:4px 12px;">' + Object.keys(API_TXT).map(k => {
      const c = cs[k]; if(!c) return '<span>' + API_TXT[k] + ': ainda não buscado</span>';
      return '<span title="' + escH(c.msg || '') + '">' + API_TXT[k] + ': ' + (c.ok ? '✅ ' + ha(c.okEm) : '🔴 ' + escH(c.status ? String(c.status) : 'erro') + ' ' + ha(c.em)) + '</span>';
    }).join('') + (p.pendentes ? '<span>⏳ ' + p.pendentes + ' busca(s) na fila</span>' : '') + '</div>';
    const erros = Object.keys(cs).filter(k => cs[k] && !cs[k].ok && cs[k].status !== 403);
    if(erros.length) h += erroBox('Última busca com problema — ' + erros.map(k => API_TXT[k] + ': ' + (cs[k].msg || cs[k].status)).join(' · '));
    // período + ações
    h += '<div class="d-flex gap-2 ai-centro fx-wrap" style="margin:8px 0;">'
      + '<label class="fs-sm">De <input type="date" id="ifinIni" value="' + ini + '" style="width:auto;"></label>'
      + '<label class="fs-sm">até <input type="date" id="ifinFim" value="' + fim + '" style="width:auto;"></label>'
      + '<button type="button" class="ghost" onclick="ifinPeriodo_()">Ver período</button>'
      + '<button type="button" class="small-gold" onclick="ifinBuscar_()" ' + (loteAtivo ? 'disabled' : '') + '>🔄 Buscar no iFood</button></div>';
    if(loteAtivo) h += '<div class="obs-line" role="status">⏳ <b>Atualizando com o iFood:</b> ' + (loteAtivo.feitas || 0) + ' de ' + (loteAtivo.total || '…') + ' consultas feitas. Pode continuar usando o sistema.</div>';
    if(msgTopo) h += msgTopo;
    h += '<div class="seg-abas">' + [['semana','Semana'],['vendas','Vendas'],['lancamentos','Lançamentos'],['repasses','Repasses'],['antecipacoes','Antecipações'],['arquivo','Arquivo mensal']]
      .map(([k, t]) => '<button type="button" class="' + (aba === k ? 'active' : '') + '" onclick="ifinAba_(\'' + k + '\')">' + t + '</button>').join('') + '</div>';
    return h;
  }

  function desenhar_(){
    const c = corpo_(); if(!c) return;
    let h = cabecalho_();
    const d = dados[aba] || {};
    if(d.carregando) h += '<div class="obs-line">⏳ Carregando…</div>';
    else if(d.erro) h += erroBox(d.erro);
    else if(aba === 'semana') h += semana_();
    else if(aba === 'vendas') h += vendas_(d);
    else if(aba === 'lancamentos') h += lancamentos_(d);
    else if(aba === 'repasses') h += repasses_(d);
    else if(aba === 'antecipacoes') h += antecipacoes_(d);
    else if(aba === 'arquivo') h += arquivo_(d);
    c.innerHTML = h;
  }

  // ---------- Semana: a conferência oficial ----------
  function semana_(){
    const ss = (painel && painel.semanas) || [];
    let h = '<p class="fs-sm" style="margin:6px 0;">O iFood fecha cada semana (segunda a domingo) na segunda-feira seguinte e paga conforme o seu plano. '
      + 'Aqui conferimos: <b>soma dos lançamentos COM impacto no repasse = repasse do iFood</b> (regra oficial; diferença aceita: 0,01%). '
      + 'Toque numa semana para ver os lançamentos dela.</p>';
    if(!ss.some(s => s.qtdVendas || s.qtdLancamentos || s.qtdTitulos)) h += '<div class="obs-line">Ainda não há dados do iFood. Toque em <b>🔄 Buscar no iFood</b> (precisa do módulo Financeiro liberado).</div>';
    const SIT = { confere:'✅ Confere', diferenca:'⚠️ Diferença', aberta:'⏳ Semana aberta', sem_dados:'— Sem dados', sem_repasse:'⏳ Sem repasse ainda' };
    h += '<div style="overflow-x:auto;"><table class="tbl fs-sm" style="width:100%;"><thead><tr><th>Semana</th><th>Vendas (líquido)</th><th>Lançamentos com impacto</th><th>Repasse do iFood</th><th>Situação</th></tr></thead><tbody>'
      + ss.map(s => '<tr style="cursor:pointer;" onclick="ifinSemana_(\'' + s.ini + '\',\'' + s.fim + '\')">'
        + '<td>' + dBR(s.ini).slice(0, 5) + ' a ' + dBR(s.fim).slice(0, 5) + '</td>'
        + '<td>' + R$(s.vendas) + (s.qtdVendas ? ' <span class="fs-xs txt-muted">(' + s.qtdVendas + ')</span>' : '') + '</td>'
        + '<td>' + R$(s.lancamentos) + (s.semImpacto ? '<div class="fs-xs txt-muted">sem impacto (só informativo): ' + R$(s.semImpacto) + '</div>' : '') + '</td>'
        + '<td>' + R$(s.repasse) + (s.qtdTitulos ? ' <span class="fs-xs txt-muted">(' + s.qtdTitulos + ' título' + (s.qtdTitulos > 1 ? 's' : '') + ')</span>' : '') + '</td>'
        + '<td>' + (SIT[s.situacao] || s.situacao) + (s.diferenca != null && s.situacao !== 'confere' ? '<div class="fs-xs">' + sinal(s.diferenca) + '</div>' : '') + '</td></tr>').join('')
      + '</tbody></table></div>';
    if(ss.some(s => s.situacao === 'diferenca')) h += '<div class="obs-line fs-xs">⚠️ Diferença costuma ser: lançamento que caiu em outra semana (um cancelamento depois da venda), lançamento ainda pendente no iFood, ou dados de só parte do período. Toque em <b>🔄 Buscar no iFood</b> com o período da semana e confira de novo. Se continuar, baixe o Arquivo mensal (é o registro oficial).</div>';
    h += '<div class="obs-line fs-xs">"Vendas (líquido)" soma o que cada venda deixa para a loja (saleBalance). Pode diferir dos lançamentos da semana porque um mesmo pedido gera lançamentos em semanas diferentes (ex.: venda numa semana, cancelamento na outra).</div>';
    return h;
  }

  // ---------- Vendas ----------
  function pagamentos_(l){
    return (l || []).map(m => (METODO[m.metodo] || m.metodo || '—') + (m.bandeira ? ' ' + escH(m.bandeira) : '') + (m.carteira ? ' (' + escH(m.carteira) + ')' : '')
      + ' · ' + (m.tipo === 'ONLINE' ? 'pago no app' : m.tipo === 'OFFLINE' ? 'pago na entrega' : escH(m.tipo || '')) + ' · ' + R$(m.valor)
      + (m.parcelas > 1 ? ' em ' + m.parcelas + 'x' : '') + (m.responsavel ? ' · ' + (QUEM[m.responsavel] || 'quem recebe: ' + escH(m.responsavel)) : '')).join('<br>') || '—';
  }
  function vendas_(d){
    const s = d.soma || {}, l = d.itens || [];
    let h = '<div class="d-flex gap-2 ai-centro fx-wrap" style="margin:6px 0;"><input type="search" id="ifinBusca" placeholder="Nº do pedido no iFood" value="' + escH(busca) + '" style="max-width:220px;" onkeydown="if(event.key===\'Enter\')ifinBuscar2_()"><button type="button" class="ghost" onclick="ifinBuscar2_()">Procurar</button></div>';
    h += '<div class="obs-line"><b>' + (s.qtd || 0) + ' venda(s)</b> · Bruto ' + R$(s.bruto) + ' · Comissão ' + sinal(-(s.comissao || 0)) + ' · Taxas ' + sinal(-(s.taxas || 0))
      + ' · Promoções pagas por iFood/rede ' + sinal(s.subsidios || 0) + ' · <b>Líquido ' + R$(s.liquido) + '</b></div>';
    if(!l.length) return h + '<div class="obs-line">Nenhuma venda do iFood no período. Toque em <b>🔄 Buscar no iFood</b> para trazer.</div>';
    h += l.map(v => '<details class="card" style="padding:8px 10px;margin:6px 0;"><summary style="cursor:pointer;">'
      + '<b>#' + escH(v.numero || v.id.slice(0, 8)) + '</b> · ' + dhBR(v.em) + ' · ' + escH(STATUS_VENDA[v.status] || v.status || '—')
      + (v.pedidoLocal ? ' · <span class="fs-xs">pedido ' + escH(v.pedidoLocal) + ' no sistema</span>' : '')
      + '<div class="fs-sm">Bruto ' + R$(v.bruto) + ' · Comissão ' + sinal(-(v.comissao || 0)) + ' · Taxas ' + sinal(-(v.taxas || 0)) + (v.subsidios ? ' · Promoções ' + sinal(v.subsidios) : '')
      + ' → <b>Líquido ' + R$(v.liquido) + '</b>' + (v.confere === false ? ' <span style="color:#e5534b;">⚠️ não bate com os lançamentos</span>' : '') + '</div></summary>'
      + '<div class="fs-sm" style="margin-top:6px;"><b>Pagamento:</b> ' + pagamentos_(v.pagamentos) + '</div>'
      + '<div class="fs-sm">Itens ' + R$(v.itens) + ' · Entrega ' + R$(v.entrega) + ' · Taxa de serviço ' + R$(v.servico)
      + (v.entregaInfo && v.entregaInfo.logistica ? ' · entrega: ' + escH(v.entregaInfo.logistica === 'IFOOD_LOGISTICS' ? 'iFood' : v.entregaInfo.logistica) : '') + '</div>'
      + '<table class="tbl fs-xs" style="margin-top:4px;"><thead><tr><th>Lançamento</th><th>Valor</th></tr></thead><tbody>'
      + (v.lancamentos || []).map(e => '<tr><td>' + escH(nome(e.name)) + '</td><td>' + sinal(e.value) + '</td></tr>').join('')
      + '<tr><td><b>Líquido da venda</b></td><td><b>' + R$(v.liquido) + '</b></td></tr></tbody></table>'
      + (v.confere === false ? '<div class="msg warn fs-xs" style="display:block;">A soma dos lançamentos desta venda não é igual ao líquido informado pelo iFood. Confira no Arquivo mensal ou com o suporte do iFood.</div>' : '')
      + '</details>').join('');
    if(l.length >= 400) h += '<div class="obs-line fs-xs">Mostrando as 400 mais recentes: diminua o período para ver as outras.</div>';
    return h;
  }

  // ---------- Lançamentos ----------
  function lancamentos_(d){
    const s = d.soma || {}, l = d.itens || [];
    let h = '<div class="d-flex gap-2 ai-centro fx-wrap" style="margin:6px 0;"><select id="ifinImp" onchange="ifinFiltroImp_(this.value)" style="width:auto;">'
      + [['', 'Todos'], ['true', 'Só COM impacto no repasse'], ['false', 'Só SEM impacto (informativos)']].map(([v, t]) => '<option value="' + v + '"' + (filtroImp === v ? ' selected' : '') + '>' + t + '</option>').join('') + '</select>'
      + '<input type="search" id="ifinBusca" placeholder="Procurar (nome, pedido)" value="' + escH(busca) + '" style="max-width:220px;" onkeydown="if(event.key===\'Enter\')ifinBuscar2_()"><button type="button" class="ghost" onclick="ifinBuscar2_()">Procurar</button></div>';
    h += '<div class="obs-line">Créditos ' + sinal(s.creditos || 0) + ' · Débitos ' + sinal(s.debitos || 0) + ' · <b>Com impacto no repasse: ' + R$(s.comImpacto) + '</b> · Sem impacto (só informativo): ' + R$(s.semImpacto) + '</div>';
    h += '<div class="obs-line fs-xs">Só os lançamentos <b>com impacto</b> mudam o que você recebe. Os sem impacto aparecem para você saber que existiram (ex.: pedido pago em dinheiro ou vale direto para a loja, promoção da própria loja).</div>';
    if(!l.length) return h + '<div class="obs-line">Nenhum lançamento no período.</div>';
    h += '<div style="overflow-x:auto;"><table class="tbl fs-xs" style="width:100%;"><thead><tr><th>Data</th><th>Lançamento</th><th>Pedido</th><th>Valor</th><th>Repasse</th><th>Previsto para</th></tr></thead><tbody>'
      + l.map(e => '<tr><td>' + dhBR(e.em || e.dia) + '</td><td>' + escH(nome(e.nome)) + (e.gatilho ? '<div class="txt-muted">por: ' + escH(nome(e.gatilho)) + '</div>' : '')
        + (e.percentual != null && e.base != null ? '<div class="txt-muted">' + Number(e.percentual).toLocaleString('pt-BR') + '% de ' + R$(e.base) + '</div>' : '')
        + (e.parcela ? '<div class="txt-muted">parcela ' + escH(e.parcela) + '</div>' : '') + (e.responsavel ? '<div class="txt-muted">' + escH(QUEM[e.responsavel] || e.responsavel) + '</div>' : '') + '</td>'
        + '<td>' + escH(e.pedido ? '#' + e.pedido : (e.refId ? String(e.refId).slice(0, 8) : '—')) + '</td><td>' + sinal(e.valor) + '</td>'
        + '<td>' + (e.impacto ? '✅ entra' : '<span class="txt-muted">não entra</span>') + '</td><td>' + dBR(e.repasseEsperado) + '</td></tr>').join('')
      + '</tbody></table></div>';
    return h;
  }

  // ---------- Repasses ----------
  function banco_(b, status){
    if(!b) return '';
    if(status !== 'SUCCEED') return '';
    return '<div class="fs-xs">' + escH(b.nome || 'Banco') + ' (' + escH(b.numero || '?') + ') · ag. ' + escH(b.agencia || '?') + ' · conta ' + escH(b.conta || '?')
      + (b.ok ? ' ✅' : ' <span style="color:#e5534b;">⚠️ dados bancários incompletos: ' + escH((b.problemas || []).join(', ')) + '</span>') + '</div>';
  }
  function repasses_(d){
    const l = d.itens || []; let h = '';
    h += '<p class="fs-sm" style="margin:6px 0;">Cada semana vira um ou mais <b>títulos</b>: Repasse (você recebe), Boleto (quando a loja deve ao iFood), Retido para banco (empréstimo com registro de recebíveis) ou Renegociado.</p>';
    if(d.saldoUltimaConsulta != null) h += '<div class="obs-line">Saldo líquido da última busca: <b>' + R$(d.saldoUltimaConsulta) + '</b> (o que efetivamente vai para a sua conta, já descontadas retenções).</div>';
    if(!l.length) return h + '<div class="obs-line">Nenhum repasse no período.</div>';
    const grupos = {}; l.forEach(x => { const k = (x.periodoIni || '') + '|' + (x.periodoFim || ''); (grupos[k] = grupos[k] || []).push(x); });
    Object.keys(grupos).forEach(k => {
      const [a, b] = k.split('|'), it = grupos[k];
      const tot = it.reduce((s, x) => s + (String(x.tipo).toUpperCase() === 'BOLETO' ? -Math.abs(Number(x.valor) || 0) : Number(x.valor) || 0), 0);
      h += '<div class="card" style="padding:8px 10px;margin:6px 0;"><b>Semana ' + dBR(a).slice(0, 5) + ' a ' + dBR(b) + '</b> · total ' + R$(tot)
        + it.map(x => '<div style="border-top:1px solid var(--line,#3a2d1d);margin-top:6px;padding-top:6px;"><div class="fs-sm"><b>' + escH(TITULO[x.tipo] || x.tipo || '—') + '</b>'
          + (x.produto && x.produto !== 'IFOOD' ? ' · ' + escH(x.produto) : '') + ' · ' + R$(x.valor) + ' · ' + (ST_TIT[x.status] || escH(x.status || '—'))
          + ' · pagamento ' + (x.status === 'SUCCEED' ? 'em ' : 'previsto para ') + dBR(x.pagamento) + '</div>' + banco_(x.banco, x.status)
          + (x.status === 'FAILED' ? '<div class="msg warn fs-xs" style="display:block;">Este título falhou no iFood. Confira os dados bancários no Portal do Parceiro e fale com o suporte do iFood.</div>' : '')
          + '<div class="fs-xs txt-muted">título ' + escH(x.id) + (x.transacao ? ' · transferência ' + escH(String(x.transacao).slice(0, 13)) : '') + '</div></div>').join('') + '</div>';
    });
    return h;
  }

  // ---------- Antecipações ----------
  function antecipacoes_(d){
    const l = d.itens || []; let h = '<p class="fs-sm" style="margin:6px 0;">Antecipação (iFood Pago, Conta Digital iFood): você recebe antes, pagando uma taxa. D+1 = no dia útil seguinte; D+7 = na quarta da semana seguinte. Sem antecipação o repasse segue o plano normal (ex.: D+30).</p>';
    if(d.semPlano && !l.length) return h + '<div class="obs-line">ℹ️ A loja não tem plano de antecipação contratado no iFood (resposta 404 do iFood). Nada a mostrar.</div>';
    if(!l.length) return h + '<div class="obs-line">Nenhuma antecipação no período.</div>';
    const tot = l.reduce((a, x) => ({ o:a.o + (Number(x.original) || 0), t:a.t + (Number(x.taxa) || 0), r:a.r + (Number(x.antecipado) || 0) }), { o:0, t:0, r:0 });
    h += '<div class="obs-line">Original ' + R$(tot.o) + ' · Taxas ' + sinal(-tot.t) + ' · <b>Recebido ' + R$(tot.r) + '</b></div>';
    h += l.map(x => '<div class="card" style="padding:8px 10px;margin:6px 0;"><div class="fs-sm"><b>' + escH(ANT[x.tipo] || x.tipo || 'Antecipação') + '</b> · ' + (x.status === 'SUCCEED' ? '✅ Paga' : x.status === 'FAILED' ? '🔴 Falhou' : '⏳ ' + escH(x.status || '')) + '</div>'
      + '<div class="fs-sm">Valor original ' + R$(x.original) + ' → recebido <b>' + R$(x.antecipado) + '</b> · taxa ' + R$(x.taxa) + ' (' + (Number(x.taxaPct) || 0).toLocaleString('pt-BR') + '%)</div>'
      + '<div class="fs-sm">Data original ' + dBR(x.dataOriginal) + ' → recebido em ' + dBR(x.dataAntecipada) + (x.diasAntes > 0 ? ' · <b>' + x.diasAntes + ' dia(s) antes</b>' : '') + '</div>'
      + '<div class="fs-xs txt-muted">Semana de apuração ' + dBR(x.periodoIni).slice(0, 5) + ' a ' + dBR(x.periodoFim) + '</div>' + (x.status === 'SUCCEED' ? banco_(x.banco, 'SUCCEED') : '')
      + (x.status === 'FAILED' ? '<div class="msg warn fs-xs" style="display:block;">Esta antecipação falhou no iFood: o valor volta para a data original. Confira na Conta Digital iFood.</div>' : '') + '</div>').join('');
    return h;
  }

  // ---------- Arquivo mensal (conciliação) ----------
  function arquivo_(d){
    const l = d.itens || [], por = {}; l.forEach(x => por[x.competencia] = x);
    let h = '<p class="fs-sm" style="margin:6px 0;">O arquivo de conciliação é o <b>registro oficial</b> do iFood do mês (todos os lançamentos). O iFood gera em alguns minutos (até 30). '
      + 'O mesmo mês só pode ser pedido de novo depois de 6 horas. O valor a receber considera só as linhas com <b>impacto no repasse = SIM</b>.</p>';
    const ESTADO = { solicitado:'⏳ Pedido', processando:'⏳ O iFood está gerando…', pronto:'✅ Pronto', erro:'🔴 Erro' };
    h += (d.meses || []).map(m => {
      const x = por[m] || {}; const r = x.resumo || {};
      const bloqueado = x.podePedirEm && new Date(x.podePedirEm) > new Date();
      let b = '<div class="card" style="padding:8px 10px;margin:6px 0;"><div class="d-flex gap-2 ai-centro fx-wrap" style="justify-content:space-between;"><b>' + escH(mesTxt(m)) + '</b><span class="fs-sm">'
        + (x.estado ? ESTADO[x.estado] || x.estado : 'Não pedido') + (x.concluidoEm && x.estado === 'pronto' ? ' em ' + dhBR(x.concluidoEm) : '') + '</span></div>';
      if(x.estado === 'erro' && x.erro) b += erroBox(x.erro);
      b += '<div class="d-flex gap-2 fx-wrap" style="margin-top:6px;">'
        + '<button type="button" class="ghost" ' + (bloqueado || x.estado === 'processando' || x.estado === 'solicitado' ? 'disabled' : '') + ' onclick="ifinPedirArquivo_(\'' + m + '\')">' + (x.estado ? '↻ Gerar de novo' : '📄 Gerar arquivo') + '</button>'
        + (x.temArquivo ? '<button type="button" class="small-gold" onclick="ifinBaixarArquivo_(\'' + m + '\')">⬇️ Baixar CSV</button>' : '') + '</div>';
      if(bloqueado && x.estado === 'pronto') b += '<div class="fs-xs txt-muted">Pode gerar de novo depois de ' + dhBR(x.podePedirEm) + '.</div>';
      if(x.estado === 'pronto' && r.linhas != null){
        b += '<div class="fs-sm" style="margin-top:6px;"><b>A receber (com impacto): ' + R$(r.comImpacto) + '</b> · sem impacto (informativo): ' + R$(r.semImpacto)
          + ' · ' + r.linhas + ' linha(s), ' + (r.pedidos || 0) + ' pedido(s)' + (r.ilegiveis ? ' · <span style="color:#e5534b;">' + r.ilegiveis + ' valor(es) ilegível(is)</span>' : '') + '</div>';
        if(r.periodoAberto) b += '<div class="fs-xs txt-muted">' + r.periodoAberto + ' linha(s) de semana ainda aberta: o valor da transferência só aparece depois do fechamento.</div>';
        if(x.eventosComImpacto != null){
          const dif = Math.round(((Number(r.comImpacto) || 0) - (Number(x.eventosComImpacto) || 0)) * 100) / 100;
          b += '<div class="fs-xs">Conferência com os Lançamentos do mês: ' + R$(x.eventosComImpacto) + ' · ' + (Math.abs(dif) <= Math.max(0.01, Math.abs(Number(r.comImpacto) || 0) * 0.0001) ? '✅ confere' : '⚠️ diferença ' + sinal(dif) + ' (busque os Lançamentos do mês inteiro e confira de novo)') + '</div>';
        }
        if((r.porTipo || []).length) b += '<details class="fs-xs" style="margin-top:4px;"><summary>Por tipo de lançamento e data de repasse</summary><table class="tbl fs-xs"><tbody>'
          + r.porTipo.map(t => '<tr><td>' + escH(t.nome) + '</td><td>' + sinal(t.valor) + '</td></tr>').join('') + '</tbody></table>'
          + ((r.porDataRepasse || []).length ? '<div style="margin-top:4px;"><b>Repasses previstos:</b> ' + r.porDataRepasse.map(p => dBR(p.data) + ' ' + R$(p.valor)).join(' · ') + '</div>' : '') + '</details>';
        if((r.faltando || []).length) b += erroBox('O arquivo veio sem as colunas: ' + r.faltando.join(', ') + '. O resumo pode estar incompleto; o arquivo para baixar está inteiro.');
      }
      return b + '</div>';
    }).join('');
    return h;
  }
  function vigiarArquivo_(){
    clearTimeout(timerArq);
    const l = (dados.arquivo && dados.arquivo.itens) || [];
    if(aba === 'arquivo' && l.some(x => x.estado === 'solicitado' || x.estado === 'processando') && document.getElementById('ifinCorpo'))
      timerArq = setTimeout(() => { if(aba === 'arquivo' && (document.querySelector('section.tab.active') || {}).id === 'tab-ifoodfin') carregarAba_(); }, 15000);
  }

  // ---------- ações ----------
  window.ifinAba_ = function(a){ aba = a; busca = ''; if(a === 'semana'){ desenhar_(); recarregarPainel_(); } else carregarAba_(); };
  window.ifinPeriodo_ = function(){
    const a = (document.getElementById('ifinIni') || {}).value, b = (document.getElementById('ifinFim') || {}).value;
    if(!a || !b){ msgTopo = erroBox('Escolha as duas datas.'); desenhar_(); return; }
    if(b < a){ msgTopo = erroBox('A data final precisa ser depois da inicial.'); desenhar_(); return; }
    ini = a; fim = b; msgTopo = ''; carregarAba_();
  };
  window.ifinSemana_ = function(a, b){ ini = a; fim = b; aba = 'lancamentos'; filtroImp = ''; carregarAba_(); };
  window.ifinFiltroImp_ = function(v){ filtroImp = v; carregarAba_(); };
  window.ifinBuscar2_ = function(){ busca = ((document.getElementById('ifinBusca') || {}).value || '').trim(); carregarAba_(); };
  async function recarregarPainel_(){
    try{ const r = await apiCall('ifoodFinDados', { aba:'painel', ini, fim }); if(r && r.ok){ painel = r; desenhar_(); } }catch(e){ msgTopo = erroBox('Sem conexão para atualizar o painel.'); desenhar_(); }
  }
  window.ifinBuscar_ = async function(){
    const a = (document.getElementById('ifinIni') || {}).value || ini, b = (document.getElementById('ifinFim') || {}).value || fim;
    try{
      const r = await apiCall('ifoodFinAcao', { acao:'atualizar', ini:a, fim:b });
      if(!r || !r.ok){ msgTopo = erroBox((r && r.message) || 'Não foi possível pedir a busca.'); desenhar_(); return; }
      ini = a; fim = b; msgTopo = '<div class="msg ok" style="display:block;">' + escH(r.message) + '</div>';
      loteAtivo = { id:r.lote, total:r.tarefas, feitas:0 }; desenhar_(); acompanharLote_();
    }catch(e){ msgTopo = erroBox('Sem conexão. A busca não foi pedida.'); desenhar_(); }
  };
  async function acompanharLote_(){
    clearTimeout(timerLote);
    if(!loteAtivo) return;
    try{
      const r = await apiCall('ifoodFinAcao', { acao:'lote', lote:loteAtivo.id });
      if(r && r.ok){
        loteAtivo.total = r.total; loteAtivo.feitas = r.feitas;
        if(r.total > 0 && r.feitas >= r.total){
          const erros = r.erros || [];
          msgTopo = erros.length ? erroBox('Busca terminada com ' + erros.length + ' problema(s): ' + erros.slice(0, 3).map(x => (API_TXT[x.api] || x.api) + ' ' + dBR(x.ini) + ': ' + (x.erro || x.status)).join(' · '))
                                 : '<div class="msg ok" style="display:block;">✅ Busca no iFood terminada.</div>';
          loteAtivo = null; await recarregarPainel_(); if(aba !== 'semana') await carregarAba_(); return;
        }
      }
    }catch(e){ /* sem internet: tenta de novo */ }
    if((document.querySelector('section.tab.active') || {}).id === 'tab-ifoodfin') { desenhar_(); timerLote = setTimeout(acompanharLote_, 6000); }
    else timerLote = setTimeout(acompanharLote_, 20000);
  }
  window.ifinPedirArquivo_ = async function(m){
    try{
      const r = await apiCall('ifoodFinAcao', { acao:'conciliacao', competencia:m });
      msgTopo = (r && r.ok) ? '<div class="msg ok" style="display:block;">' + escH(r.message) + '</div>' : erroBox((r && r.message) || 'Não foi possível pedir o arquivo.');
    }catch(e){ msgTopo = erroBox('Sem conexão. O arquivo não foi pedido.'); }
    carregarAba_();
  };
  window.ifinBaixarArquivo_ = async function(m){
    try{
      const r = await apiCall('ifoodFinAcao', { acao:'arquivo', competencia:m });
      if(!r || !r.ok){ msgTopo = erroBox((r && r.message) || 'Não foi possível baixar.'); desenhar_(); return; }
      const bin = atob(r.gz), u = new Uint8Array(bin.length); for(let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      let blob, nomeArq = 'ifood-conciliacao-' + m + '.csv';
      if(typeof DecompressionStream === 'function'){
        try{ const s = new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip')); blob = new Blob([await new Response(s).arrayBuffer()], { type:'text/csv;charset=utf-8' }); }
        catch(e){ blob = null; }
      }
      if(!blob){ blob = new Blob([u], { type:'application/gzip' }); nomeArq += '.gz'; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nomeArq; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
      msgTopo = '<div class="msg ok" style="display:block;">⬇️ ' + escH(nomeArq) + ' (' + (r.linhas || 0) + ' linhas). Abre no Excel (separado por ponto e vírgula).</div>'; desenhar_();
    }catch(e){ msgTopo = erroBox('Não foi possível montar o arquivo neste aparelho: ' + (e && e.message || e)); desenhar_(); }
  };
})();
