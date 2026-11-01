/* Gestão (18/10/2026): margem baixa, histórico de preços, compra sugerida, rendimento por hora dos eventos,
   fechamento do mês em PDF e contrato do evento. Tudo só para quem tem permissão (Admin; compra sugerida também Operador). */

function gModal_(id, titulo, corpo){
  let m = document.getElementById(id);
  if(!m){
    m = document.createElement('div'); m.className = 'modal-overlay'; m.id = id;
    m.innerHTML = '<div class="modal-box"><div class="modal-header"><h2></h2><button class="close-btn" onclick="fecharFormModal(\'' + id + '\')" aria-label="Fechar">✕</button></div><div class="g-corpo"></div></div>';
    document.body.appendChild(m);
  }
  m.querySelector('h2').textContent = titulo;
  if(corpo != null) m.querySelector('.g-corpo').innerHTML = corpo;
  abrirFormModal(id);
  return m.querySelector('.g-corpo');
}
function gMoeda_(n){ return formatarMoeda(Number(n) || 0); }
function gFmtNum_(n){ return String(Math.round((Number(n) || 0) * 100) / 100).replace('.', ','); }

/* ---------- margem baixa ---------- */
let gMargemCats_ = [];
async function gMargemAbrir(){
  const c = gModal_('margemModal', 'Margem baixa', '<p class="hint">Carregando…</p>');
  try{
    const r = await apiCall('margemAlerta', {});
    if(!r || !r.ok){ c.innerHTML = '<p class="hint">' + escH((r && r.message) || 'Não foi possível carregar.') + '</p>'; return; }
    const it = r.itens || [], ig = r.ignorados || []; gMargemCats_ = r.categorias || [];
    c.innerHTML = '<p class="hint">Mostra os produtos cuja margem (preço menos custo, sobre o preço) ficou abaixo do mínimo. O celular do dono só recebe aviso quando entra um produto NOVO abaixo do mínimo, sem repetir.</p>' +
      '<label for="gMargemMin">Margem mínima geral (%)</label><input type="number" id="gMargemMin" step="1" min="1" max="95" value="' + escH(String(r.margemMin)) + '" style="max-width:120px;">' +
      '<details style="margin:10px 0;"><summary style="cursor:pointer;color:var(--gold);">Mínimo por categoria (opcional)</summary><p class="hint">Categorias que naturalmente têm margem menor, como bebidas, podem ter um mínimo próprio. Em branco usa o geral. Os valores vêm preenchidos pelos seus preços de hoje (5 pontos abaixo da pior margem de cada categoria); o botão abaixo refaz esse cálculo.</p><div class="btn-row"><button type="button" class="ghost" onclick="gMargemPreencher()">Preencher pelos meus preços atuais</button></div>' +
      gMargemCats_.map(x => '<div style="display:flex;align-items:center;gap:8px;margin:6px 0;"><span style="flex:1;">' + escH(x.nome) + '</span><input type="number" step="1" min="1" max="95" data-cat="' + escH(x.id) + '" value="' + (x.minimo == null ? '' : escH(String(x.minimo))) + '" placeholder="geral" style="max-width:90px;"><span>%</span></div>').join('') + '</details>' +
      '<div class="btn-row"><button type="button" class="small-gold" onclick="gMargemSalvar()">Salvar</button></div><div class="msg" id="gMargemMsg"></div>' +
      (it.length ? '<div class="obs-line" style="margin:8px 0;">' + it.length + ' produto(s) abaixo do mínimo:</div>' + it.map(x => '<div class="notif-card"><div style="display:flex;justify-content:space-between;gap:8px;"><b>' + escH(x.nome) + '</b><b style="color:var(--red-hi);">' + gFmtNum_(x.margem) + '%</b></div><div class="obs-line">' + (x.categoria ? escH(x.categoria) + ' · ' : '') + (x.forma ? escH(x.forma) + ' · ' : '') + 'preço ' + gMoeda_(x.preco) + ' · custo ' + gMoeda_(x.custo) + '</div><div class="obs-line">Para chegar a ' + gFmtNum_(x.minimo) + '%: <b>' + gMoeda_(x.sugerido) + '</b></div><div class="btn-row"><button type="button" class="ghost" onclick="gMargemIgnorar(\'' + x.produtoId + '\', true)">Ignorar este produto</button></div></div>').join('') +
        '<p class="hint">Para mudar o preço, edite o produto ou use "% Ajustar preços". "Ignorar" tira o produto da lista e dos avisos (você pode desfazer abaixo).</p>' : '<div class="notif-empty">Nenhum produto abaixo da margem mínima. 👍</div>') +
      (ig.length ? '<h3 style="margin:14px 0 4px;">Ignorados</h3>' + ig.map(x => '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:4px 0;"><span>' + escH(x.nome) + '</span><button type="button" class="ghost" onclick="gMargemIgnorar(\'' + x.produtoId + '\', false)">Voltar a vigiar</button></div>').join('') : '');
  }catch(e){ c.innerHTML = '<p class="hint">Não foi possível carregar agora.</p>'; }
}
async function gMargemPreencher(){
  try{
    const r = await apiCall('margemSugestao', {}); if(!r || !r.ok) return avisar((r && r.message) || 'Não foi possível calcular.');
    (r.categorias || []).forEach(x => { const i = document.querySelector('#margemModal input[data-cat="' + x.id + '"]'); if(i) i.value = x.sugerido; });
    avisar('Preenchido. Confira e toque em Salvar.');
  }catch(e){ avisar('Não foi possível calcular agora.'); }
}
async function gMargemSalvar(){
  const cats = {}; document.querySelectorAll('#margemModal input[data-cat]').forEach(i => { cats[i.getAttribute('data-cat')] = i.value === '' ? null : Number(i.value); });
  try{ const r = await apiCall('margemConfigSalvar', { margemMin: document.getElementById('gMargemMin').value, categorias: cats }); if(r && r.ok){ avisar(r.message); gMargemAbrir(); gMargemBadge_(); } else showMsg('gMargemMsg', (r && r.message) || 'Não foi possível salvar.', 'warn'); }
  catch(e){ showMsg('gMargemMsg', 'Não foi possível salvar agora.', 'warn'); }
}
async function gMargemIgnorar(id, ignorar){
  try{ const r = await apiCall('margemIgnorar', { produtoId: id, ignorar }); avisar((r && r.message) || 'Feito.'); if(r && r.ok){ gMargemAbrir(); gMargemBadge_(); } }
  catch(e){ avisar('Não foi possível agora. Tente de novo.'); }
}
let gMargemTimer_ = null;
function gMargemBadge_(){
  clearTimeout(gMargemTimer_);
  gMargemTimer_ = setTimeout(async () => {
    const b = document.getElementById('gMargemBtn'); if(!b || !currentUser || currentUser.nivel !== 'Admin' || !apiConfigurada()) return;
    try{ const r = await apiCall('margemAlerta', {}); if(r && r.ok){ const n = (r.itens || []).length; b.textContent = '📉 Margem baixa' + (n ? ' (' + n + ')' : ''); b.style.color = n ? 'var(--red-hi)' : ''; } }catch(e){}
  }, 800);
}
(function(){ if(typeof renderProdutos === 'function'){ const o = renderProdutos; renderProdutos = function(){ const r = o.apply(this, arguments); try{ gMargemBadge_(); }catch(e){} return r; }; } })();

/* ---------- histórico de preços ---------- */
let gHistTimer_ = null;
function gHistPrecoAbrir(){
  gModal_('histPrecoModal', 'Histórico de preços',
    '<p class="hint">Todo preço que mudou (edição do produto, ajuste em lote, importação) fica registrado aqui, com quem mudou e quando.</p>' +
    '<input type="search" id="gHistBusca" placeholder="Buscar produto…" oninput="gHistPrecoBuscar()"><div id="gHistLista" style="margin-top:8px;"></div>');
  document.getElementById('gHistBusca').value = ''; gHistPrecoCarregar_();
}
function gHistPrecoBuscar(){ clearTimeout(gHistTimer_); gHistTimer_ = setTimeout(gHistPrecoCarregar_, 350); }
async function gHistPrecoCarregar_(){
  const box = document.getElementById('gHistLista'); if(!box) return; box.innerHTML = '<span class="obs-line">Carregando…</span>';
  try{
    const r = await apiCall('precoHistorico', { busca: document.getElementById('gHistBusca').value, limite: 100 });
    const it = (r && r.itens) || [];
    box.innerHTML = it.length ? it.map(x => { const pc = x.percentual == null ? '' : ' (' + (x.percentual > 0 ? '+' : '') + gFmtNum_(x.percentual) + '%)', d = new Date(x.quando);
      return '<div class="notif-card"><b>' + escH(x.produto) + '</b>' + (x.forma ? ' <span class="obs-line" style="display:inline;">· ' + escH(x.forma) + '</span>' : '') + '<div>' + gMoeda_(x.precoAntigo) + ' → <b>' + gMoeda_(x.precoNovo) + '</b><span style="color:' + (x.percentual > 0 ? 'var(--gold)' : 'var(--red-hi)') + ';">' + pc + '</span></div><div class="obs-line">' + escH(d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })) + ' · ' + escH(x.usuario || '') + '</div></div>'; }).join('')
      : '<div class="notif-empty">Nenhuma mudança de preço registrada ainda. As próximas aparecem aqui.</div>';
  }catch(e){ box.innerHTML = '<span class="obs-line">Não foi possível carregar agora.</span>'; }
}

/* ---------- compra sugerida ---------- */
let gCompraDados_ = [];
async function gCompraAbrir(){
  const c = gModal_('compraSugModal', 'Compra sugerida', '<p class="hint">Carregando…</p>');
  try{
    const r = await apiCall('estoqueSugestao', {});
    if(!r || !r.ok){ c.innerHTML = '<p class="hint">' + escH((r && r.message) || 'Não foi possível carregar.') + '</p>'; return; }
    gCompraDados_ = r.itens || [];
    if(!gCompraDados_.length){ c.innerHTML = '<div class="notif-empty">Nenhum ingrediente no mínimo ou abaixo. 👍</div>'; return; }
    const grupos = {}; gCompraDados_.forEach((x, i) => { const k = x.fornecedor || ''; (grupos[k] = grupos[k] || []).push(i); });
    const total = gCompraDados_.reduce((s, x) => s + (Number(x.custoEstimado) || 0), 0);
    c.innerHTML = '<p class="hint">Ingredientes que chegaram no mínimo (ou abaixo). A quantidade sugerida leva o estoque a duas vezes o mínimo. O fornecedor é o da última compra recebida.</p><div class="obs-line">Custo estimado de tudo: <b>' + gMoeda_(total) + '</b></div>' +
      Object.keys(grupos).sort((a, b) => (a || '￿').localeCompare(b || '￿')).map(k => { const idx = grupos[k], fone = (gCompraDados_[idx[0]].telefone || '').replace(/\D/g, '');
        return '<div class="notif-card"><b>' + (k ? escH(k) : 'Sem fornecedor definido') + '</b>' + idx.map(i => { const x = gCompraDados_[i]; return '<div class="obs-line" style="display:flex;justify-content:space-between;gap:8px;"><span>' + escH(x.nome) + ' <span style="opacity:.7;">(tem ' + gFmtNum_(x.atual) + ', mín. ' + gFmtNum_(x.minimo) + ')</span></span><b>' + gFmtNum_(x.sugerido) + ' ' + escH(x.unidade || '') + '</b></div>'; }).join('') +
          '<div class="btn-row"><button type="button" class="small-gold" onclick="gCompraWhats(\'' + encodeURIComponent(k) + '\')">' + (fone ? 'Mandar no WhatsApp' : 'WhatsApp (escolher contato)') + '</button><button type="button" class="ghost" onclick="gCompraCopiar(\'' + encodeURIComponent(k) + '\')">Copiar lista</button></div></div>'; }).join('');
  }catch(e){ c.innerHTML = '<p class="hint">Não foi possível carregar agora.</p>'; }
}
function gCompraTexto_(forn){
  const l = gCompraDados_.filter(x => (x.fornecedor || '') === forn);
  return 'Olá' + (forn ? ', ' + forn : '') + '! Preciso fazer um pedido:\n' + l.map(x => '• ' + gFmtNum_(x.sugerido) + ' ' + (x.unidade || '') + ' de ' + x.nome).join('\n') + '\nPode me passar o valor e o prazo de entrega? Obrigado!';
}
function gCompraWhats(f){ const forn = decodeURIComponent(f), l = gCompraDados_.find(x => (x.fornecedor || '') === forn), fone = ((l && l.telefone) || '').replace(/\D/g, '');
  window.open('https://wa.me/' + (fone ? (fone.length <= 11 ? '55' + fone : fone) : '') + '?text=' + encodeURIComponent(gCompraTexto_(forn)), '_blank'); }
async function gCompraCopiar(f){ const t = gCompraTexto_(decodeURIComponent(f)); try{ await navigator.clipboard.writeText(t); avisar('Lista copiada.'); }catch(e){ avisar('Não consegui copiar. Use o botão do WhatsApp.'); } }

/* ---------- rendimento por hora dos eventos ---------- */
async function gRendimentoAbrir(){
  const c = gModal_('rendEventoModal', 'Rendimento por hora dos eventos', '<p class="hint">Carregando…</p>');
  try{
    const r = await apiCall('eventoRendimento', {});
    if(!r || !r.ok){ c.innerHTML = '<p class="hint">' + escH((r && r.message) || 'Não foi possível carregar.') + '</p>'; return; }
    const ev = r.eventos || [], base = r.faturamentoHoraNormal;
    c.innerHTML = '<p class="hint">Quanto cada evento rendeu por hora de equipe. As horas vêm do Ponto no dia do evento; se ninguém bateu ponto, informe as horas na mão. Eventos confirmados, em andamento ou concluídos dos últimos 12 meses.</p>' +
      '<div class="obs-line" style="margin-bottom:8px;">Referência de um dia normal (últimos 60 dias, sem evento): ' + (base != null ? '<b>' + gMoeda_(base) + ' de vendas por hora de equipe</b>' : 'ainda sem dados (precisa de vendas em dias com ponto batido).') + '</div>' +
      (ev.length ? ev.map(x => { const h = x.horas == null ? null : Number(x.horas), cmp = (base != null && x.contratadoHora != null) ? (x.contratadoHora >= base ? '<span style="color:var(--gold);">acima</span>' : '<span style="color:var(--red-hi);">abaixo</span>') + ' do dia normal' : '';
        return '<div class="notif-card"><div style="display:flex;justify-content:space-between;gap:8px;"><b>' + escH(x.nome) + '</b><span class="obs-line">' + escH(fmtDataBR(String(x.data).slice(0, 10))) + '</span></div>' +
          '<div class="obs-line">Contratado ' + gMoeda_(x.contratado) + ' · resultado ' + gMoeda_(x.resultado) + '</div>' +
          (h ? '<div>Equipe: <b>' + gFmtNum_(h) + ' h</b> (' + (x.fonte === 'manual' ? 'informado' : 'do ponto') + ') · resultado <b>' + gMoeda_(x.resultadoHora) + '/h</b> · contratado ' + gMoeda_(x.contratadoHora) + '/h ' + cmp + '</div>' : '<div class="obs-line">Sem horas registradas.</div>') +
          '<div class="btn-row"><button type="button" class="ghost" onclick="gRendimentoHoras(\'' + x.id + '\',' + (x.fonte === 'manual' ? gFmtNum_(h).replace(',', '.') : '\'\'') + ')">' + (h ? 'Mudar horas' : 'Informar horas') + '</button></div></div>'; }).join('') : '<div class="notif-empty">Nenhum evento realizado ainda.</div>') +
      '<p class="hint">Comparação: o contratado por hora do evento contra as vendas por hora de um dia normal (as duas são faturamento, não lucro).</p>';
  }catch(e){ c.innerHTML = '<p class="hint">Não foi possível carregar agora.</p>'; }
}
async function gRendimentoHoras(id, atual){
  const f = await vsForm({ titulo: 'Horas da equipe no evento', texto: 'Some as horas de todas as pessoas que trabalharam. Deixe em branco para voltar a usar as horas do Ponto.', ok: 'Salvar', campos: [{ id: 'h', rotulo: 'Horas de equipe', tipo: 'numero', valor: atual === '' ? '' : atual, sufixo: 'h' }] });
  if(!f) return;
  try{ const r = await apiCall('eventoHorasSalvar', { id, horas: f.h }); avisar((r && r.message) || 'Salvo.'); if(r && r.ok) gRendimentoAbrir(); }catch(e){ avisar('Não foi possível salvar agora.'); }
}

/* ---------- fechamento do mês (PDF) ---------- */
async function gFechamentoMes(){
  const v = (document.getElementById('rMes') || {}).value || ''; if(!/^\d{4}-\d{2}$/.test(v)) return avisar('Escolha o mês primeiro.');
  const ano = Number(v.slice(0, 4)), mes = Number(v.slice(5, 7)), d = calcularDRE(ano, mes);
  let folha = null; try{ const r = await apiCall('equipePesoMaoObra', { mes: v }); const m = r && r.ok && (r.meses || []).find(x => x.mes === v); if(m) folha = m; }catch(e){}
  const nomes = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const L = (t, val, o) => { o = o || {}; return '<tr style="' + (o.forte ? 'font-weight:bold;border-top:1px solid #999;' : '') + '"><td style="padding:3px 0;' + (o.recuo ? 'padding-left:16px;color:#555;' : '') + '">' + escH(t) + '</td><td style="text-align:right;">' + (o.neg ? '− ' : '') + formatarMoeda(val) + '</td></tr>'; };
  const cats = Object.entries(d.despPorCat || {}).sort((a, b) => b[1] - a[1]).map(([c, x]) => L(c, x, { recuo: true, neg: true })).join('');
  const evs = (eventos || []).filter(e => { const t = new Date(e.data); return !isNaN(t) && t.getFullYear() === ano && t.getMonth() + 1 === mes && !['Orçamento', 'Cancelado'].includes(e.status); });
  const h = '<div style="font-family:Arial,sans-serif;font-size:13px;padding:18px;max-width:720px;"><h1 style="margin:0;">' + NOME_UP_H_() + '</h1><div style="color:#555;margin-bottom:12px;">Fechamento de ' + nomes[mes - 1] + ' de ' + ano + '</div>' +
    '<table style="border-collapse:collapse;width:100%;">' +
    L('Vendas (antes do desconto)', d.receitaBruta) + L('Descontos', d.descontos, { recuo: true, neg: true }) + L('Receita líquida de vendas', d.receitaLiquida, { forte: true }) +
    L('Faturamento de eventos', d.receitaEventos || 0) + L('Custos de eventos', d.custosEventos || 0, { neg: true }) +
    L('Taxas de pagamento e comissões', d.taxasPag, { neg: true }) + L('Custo dos produtos vendidos', d.cmv, { neg: true }) + L('Lucro bruto', d.lucroBruto, { forte: true }) +
    (d.impostoPct > 0 ? L('Imposto estimado (' + String(d.impostoPct).replace('.', ',') + '%)', d.impostos, { neg: true }) : '') +
    L('Perdas de estoque', d.perdas, { neg: true }) + L('Despesas pagas', d.despesasTotal, { neg: true }) + cats + L('Ajustes pós-venda', d.ajustesTotal || 0, { neg: true }) +
    L('RESULTADO DO MÊS', d.resultado, { forte: true }) + '</table>' +
    '<h3 style="margin:16px 0 4px;">Números do mês</h3><table style="border-collapse:collapse;width:100%;">' +
    '<tr><td>Vendas confirmadas</td><td style="text-align:right;">' + d.vendasMes.length + '</td></tr><tr><td>Ticket médio</td><td style="text-align:right;">' + formatarMoeda(d.ticket) + '</td></tr>' +
    '<tr><td>Margem bruta</td><td style="text-align:right;">' + fmtPct(d.margemBruta) + '</td></tr><tr><td>Margem líquida</td><td style="text-align:right;">' + fmtPct(d.margemLiquida) + '</td></tr>' +
    (folha ? '<tr><td>Folha paga (salários + encargos)</td><td style="text-align:right;">' + formatarMoeda((Number(folha.folha) || 0) + (Number(folha.encargos) || 0)) + (folha.percentual != null ? ' (' + String(folha.percentual).replace('.', ',') + '% do faturamento)' : '') + '</td></tr>' : '') +
    (d.aReceber > 0 ? '<tr><td>Ainda a receber</td><td style="text-align:right;">' + formatarMoeda(d.aReceber) + '</td></tr>' : '') + '</table>' +
    (evs.length ? '<h3 style="margin:16px 0 4px;">Eventos do mês</h3><table style="border-collapse:collapse;width:100%;"><tr style="text-align:left;"><th>Evento</th><th style="text-align:right;">Contratado</th><th style="text-align:right;">Custos</th><th style="text-align:right;">Resultado</th></tr>' +
      evs.map(e => '<tr><td>' + escH(e.nome) + ' (' + escH(fmtDataBR(String(e.data).slice(0, 10))) + ')</td><td style="text-align:right;">' + formatarMoeda(e.valorContratado) + '</td><td style="text-align:right;">' + formatarMoeda(e.custoTotal) + '</td><td style="text-align:right;">' + formatarMoeda(e.resultado) + '</td></tr>').join('') + '</table>' : '') +
    '<p style="margin-top:16px;color:#666;font-size:11px;">Vendas contam pela data da venda; despesas e perdas, pelo mês em que saíram. Imposto é estimado pela alíquota informada. Gerado em ' + escH(new Date().toLocaleDateString('pt-BR')) + '.</p></div>';
  imprimirDocumento(h, 'Fechamento ' + v, 'A4');
}

/* ---------- contrato do evento ---------- */
async function evContrato(){
  const e = (typeof evAtual_ === 'function') ? evAtual_() : null; if(!e) return avisar('Salve o evento antes de gerar o contrato.');
  const padrao = 'O valor total do evento é pago em duas partes: sinal de 30% para reservar a data e o saldo até o dia do evento.\nCancelamento pelo CONTRATANTE com mais de 15 dias da data: o sinal é devolvido. Com menos de 15 dias: o sinal não é devolvido.\nRemarcação: permitida uma vez, com aviso de pelo menos 15 dias e sujeita à disponibilidade da data.\nO CONTRATADO se compromete a entregar o que está descrito neste contrato, na data e no local combinados.\nAlterações na quantidade de convidados devem ser avisadas com 7 dias de antecedência e podem mudar o valor.';
  const f = await vsForm({ titulo: 'Contrato do evento', texto: 'Modelo simples, com as combinações básicas. Revise as cláusulas; para valores altos, vale conferir com um advogado.', ok: 'Gerar contrato', campos: [
    { id: 'doc', rotulo: 'CPF ou CNPJ do contratante', tipo: 'texto', valor: '' },
    { id: 'end', rotulo: 'Endereço do contratante (opcional)', tipo: 'texto', valor: '' },
    { id: 'obj', rotulo: 'O que está incluso (um item por linha)', tipo: 'longo', valor: e.observacoes || '' },
    { id: 'cl', rotulo: 'Cláusulas', tipo: 'longo', valor: padrao },
    { id: 'cidade', rotulo: 'Cidade do contrato', tipo: 'texto', valor: '' } ] });
  if(!f) return;
  const itens = String(f.obj || '').split('\n').map(x => x.trim()).filter(Boolean), cls = String(f.cl || '').split('\n').map(x => x.trim()).filter(Boolean);
  const hoje = new Date();
  const h = '<div style="font-family:Arial,sans-serif;font-size:13px;line-height:1.5;padding:20px;max-width:720px;"><h2 style="text-align:center;margin:0 0 14px;">CONTRATO DE PRESTAÇÃO DE SERVIÇOS PARA EVENTO</h2>' +
    '<p><b>CONTRATADO:</b> ' + NOME_H_() + '.</p><p><b>CONTRATANTE:</b> ' + escH(e.contratante || '________________') + (f.doc ? ', CPF/CNPJ ' + escH(f.doc) : '') + (e.telefone ? ', telefone ' + escH(e.telefone) : '') + (f.end ? ', ' + escH(f.end) : '') + '.</p>' +
    '<p><b>Evento:</b> ' + escH(e.nome) + (e.tipo ? ' (' + escH(e.tipo) + ')' : '') + '<br><b>Data:</b> ' + escH(fmtDataBR(String(e.data).slice(0, 10))) + (typeof evHora_ === 'function' && evHora_(e) ? ', ' + escH(evHora_(e)) : '') + (e.local ? '<br><b>Local:</b> ' + escH(e.local) : '') + '</p>' +
    (itens.length ? '<p><b>O que está incluso:</b></p><ul style="margin:0 0 10px;padding-left:20px;">' + itens.map(x => '<li>' + escH(x) + '</li>').join('') + '</ul>' : '') +
    '<p><b>Valor total:</b> ' + formatarMoeda(e.valorContratado) + '.</p>' +
    (cls.length ? '<p><b>Cláusulas:</b></p><ol style="margin:0 0 10px;padding-left:20px;">' + cls.map(x => '<li>' + escH(x) + '</li>').join('') + '</ol>' : '') +
    '<p>' + (f.cidade ? escH(f.cidade) + ', ' : '') + escH(hoje.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })) + '.</p>' +
    '<div style="margin-top:50px;display:flex;gap:40px;"><div style="flex:1;border-top:1px solid #000;padding-top:4px;text-align:center;">' + NOME_H_() + '<br>CONTRATADO</div><div style="flex:1;border-top:1px solid #000;padding-top:4px;text-align:center;">' + escH(e.contratante || 'Contratante') + '<br>CONTRATANTE</div></div></div>';
  imprimirDocumento(h, 'Contrato — ' + e.nome, 'A4');
}
