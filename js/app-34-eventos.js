/* ============================================================
   CENTRAL DE EVENTOS — versão simplificada (18/10/2026)
   Lista agrupada (Próximos / Em andamento / Concluídos e cancelados), cartão com 3 números (A receber, Recebido, Resultado),
   tela do evento com abas Dados / Custos / Recebimentos, atalhos (WhatsApp, duplicar, imprimir resumo) e cancelamento de lançamentos.
   Troca as funções antigas do app-02-abas.js (mesmos nomes onde fazia sentido). Totais continuam vindo do banco.
   ============================================================ */
var evAba_ = 'dados';
var evMov_ = { id:'', custos:[], recebimentos:[], carregado:false };

function evHojeISO_(){ return dataLocalISO(new Date()); }
function evData_(d){ const s = String(d || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''; }
function evAtrasado_(e){ const d = evData_(e.data); return !!d && d < evHojeISO_() && (Number(e.valorAReceber) || 0) > 0.004 && ['Confirmado','Em andamento','Concluído'].includes(e.status); }
function evCorStatus_(s){ return s === 'Confirmado' ? 'var(--ok)' : s === 'Em andamento' ? 'var(--gold)' : s === 'Cancelado' ? 'var(--muted)' : s === 'Concluído' ? 'var(--ok)' : 'var(--muted)'; }
function evBadge_(e){ return '<span style="display:inline-block;border:1px solid ' + evCorStatus_(e.status) + ';color:' + evCorStatus_(e.status) + ';border-radius:20px;padding:1px 9px;font-size:var(--fs-2xs);font-weight:700;">' + escH(e.status || 'Orçamento') + '</span>'; }
function evHora_(e){ return e.horaInicio ? e.horaInicio + (e.horaFim ? '–' + e.horaFim : '') : ''; }
function evTel_(t){ let d = String(t || '').replace(/\D/g, ''); if(d.length >= 10 && d.length <= 11) d = '55' + d; return d; }

function evCartao_(e){
  const res = Number(e.resultado) || 0, atras = evAtrasado_(e);
  const num = (rot, val, cor) => '<div style="flex:1;min-width:0;"><div style="font-size:var(--fs-2xs);color:var(--muted);">' + rot + '</div><div style="font-size:1.05rem;font-weight:700;' + (cor ? 'color:' + cor + ';' : '') + '">' + formatarMoeda(val) + '</div></div>';
  return '<div class="notif-card" style="cursor:pointer;" onclick="evAbrir(\'' + e.id + '\')">' +
    '<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;"><b>' + escH(e.nome) + '</b>' + evBadge_(e) + '</div>' +
    '<div class="obs-line">' + escH(fmtDataBR(evData_(e.data)) + (evHora_(e) ? ' · ' + evHora_(e) : '') + (e.local ? ' · ' + e.local : '')) + '</div>' +
    (e.contratante ? '<div class="obs-line">Contratante: ' + escH(e.contratante) + '</div>' : '') +
    (atras ? '<div style="color:var(--red-hi);font-weight:700;font-size:var(--fs-xs);margin-top:4px;">⚠ Evento já passou e ainda tem valor a receber</div>' : '') +
    '<div style="display:flex;gap:10px;margin-top:8px;">' + num('A receber', e.valorAReceber, atras ? 'var(--red-hi)' : '') + num('Recebido', e.valorRecebido, '') + num('Resultado', res, res < 0 ? 'var(--red-hi)' : 'var(--ok)') + '</div></div>';
}

var evView_ = 'lista', evMesCal_ = '';
function evVista(v){ evView_ = v; renderEventosUI(); }
function evMesIr(n){ const [y, m] = (evMesCal_ || evHojeISO_().slice(0, 7)).split('-').map(Number); const d = new Date(y, m - 1 + n, 1); evMesCal_ = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); renderEventosUI(); }
function evCalendarioHtml_(todos){
  if(!evMesCal_) evMesCal_ = evHojeISO_().slice(0, 7);
  const [y, m] = evMesCal_.split('-').map(Number), primeiro = new Date(y, m - 1, 1), diasMes = new Date(y, m, 0).getDate(), desl = (primeiro.getDay() + 6) % 7, hoje = evHojeISO_();
  const nomes = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  let h = '<div class="btn-row" style="align-items:center;"><button type="button" class="ghost small" onclick="evMesIr(-1)" aria-label="Mês anterior">‹</button><b style="flex:1;text-align:center;">' + nomes[m - 1] + ' de ' + y + '</b><button type="button" class="ghost small" onclick="evMesIr(1)" aria-label="Próximo mês">›</button></div>' +
    '<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px;margin-top:8px;font-size:11px;">' + ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d => '<div style="text-align:center;color:var(--muted);">' + d + '</div>').join('');
  for(let i = 0; i < desl; i++) h += '<div></div>';
  for(let d = 1; d <= diasMes; d++){
    const iso = evMesCal_ + '-' + String(d).padStart(2, '0'), evs = todos.filter(e => evData_(e.data) === iso && e.status !== 'Cancelado');
    h += '<div style="min-height:58px;border:1px solid ' + (iso === hoje ? 'var(--gold)' : 'var(--line)') + ';border-radius:6px;padding:2px;overflow:hidden;"><div style="color:var(--muted);">' + d + '</div>' +
      evs.map(e => '<div onclick="evAbrir(\'' + e.id + '\')" style="cursor:pointer;margin-top:2px;padding:1px 3px;border-radius:4px;font-size:10px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border:1px solid ' + evCorStatus_(e.status) + ';color:' + evCorStatus_(e.status) + ';" title="' + escH(e.nome) + '">' + escH(e.nome) + '</div>').join('') + '</div>';
  }
  return h + '</div>';
}
function renderEventosUI(){
  evPreencherFormas_();
  const box = document.getElementById('evLista'); if(!box) return;
  const todos = (eventos || []).slice();
  const ordA = (a, b) => (evData_(a.data) || '9').localeCompare(evData_(b.data) || '9');
  const grupos = [
    ['Próximos', todos.filter(e => ['Orçamento','Confirmado'].includes(e.status || 'Orçamento')).sort(ordA)],
    ['Em andamento', todos.filter(e => e.status === 'Em andamento').sort(ordA)],
    ['Concluídos e cancelados', todos.filter(e => ['Concluído','Cancelado'].includes(e.status)).sort((a, b) => ordA(b, a))]
  ];
  if(!todos.length){ box.innerHTML = '<div class="notif-empty">Nenhum evento ainda. Toque em “+ Novo evento”.</div>'; return; }
  const aberto = todos.filter(e => e.status !== 'Cancelado');
  const aRec = aberto.reduce((s, e) => s + (Number(e.valorAReceber) || 0), 0), atras = todos.filter(evAtrasado_).length;
  const bt = (v, t) => '<button type="button" class="ghost small" style="' + (evView_ === v ? 'border-color:var(--gold);color:var(--gold);' : '') + '" onclick="evVista(\'' + v + '\')">' + t + '</button>';
  box.innerHTML = '<div class="btn-row" style="margin-bottom:8px;">' + bt('lista', 'Lista') + bt('calendario', 'Calendário') + '</div>' +
    '<div class="obs-line" style="margin-bottom:8px;">A receber de todos os eventos: <b>' + formatarMoeda(aRec) + '</b>' + (atras ? ' · <span style="color:var(--red-hi);font-weight:700;">' + atras + ' atrasado(s)</span>' : '') + '</div>' +
    (evView_ === 'calendario' ? evCalendarioHtml_(todos) : grupos.filter(g => g[1].length).map(g => '<h3 style="margin:14px 0 6px;">' + g[0] + ' (' + g[1].length + ')</h3>' + g[1].map(evCartao_).join('')).join(''));
}
/* Contas a pagar: cartão "Eventos a receber" (só leitura; o dinheiro só entra quando o recebimento é lançado no evento) */
function evAReceberRender_(){
  const card = document.getElementById('evAReceberCard'), box = document.getElementById('evAReceberLista'); if(!card || !box) return;
  const lista = (eventos || []).filter(e => ['Confirmado','Em andamento','Concluído'].includes(e.status) && (Number(e.valorAReceber) || 0) > 0.004).sort((a, b) => (evData_(a.data) || '9').localeCompare(evData_(b.data) || '9'));
  if(!lista.length){ card.style.display = 'none'; return; }
  card.style.display = '';
  box.innerHTML = '<div class="stat-row"><div class="stat-box"><b>' + formatarMoeda(lista.reduce((s, e) => s + (Number(e.valorAReceber) || 0), 0)) + '</b><span>A RECEBER</span></div></div>' +
    lista.map(e => '<div class="notif-card" style="cursor:pointer;" onclick="abrirAdministrador(\'eventos\');setTimeout(function(){evAbrir(\'' + e.id + '\')},400)"><div style="display:flex;justify-content:space-between;gap:8px;"><b>' + escH(e.nome) + '</b><b style="color:' + (evAtrasado_(e) ? 'var(--red-hi)' : 'inherit') + ';">' + formatarMoeda(e.valorAReceber) + '</b></div><div class="obs-line">' + escH(fmtDataBR(evData_(e.data))) + ' · ' + escH(e.contratante || '') + (evAtrasado_(e) ? ' · <span style="color:var(--red-hi);">já passou</span>' : '') + '</div></div>').join('');
}
(function(){
  if(typeof renderContasPagar === 'function'){ const orig = renderContasPagar; renderContasPagar = function(){ const r = orig.apply(this, arguments); try{ evAReceberRender_(); }catch(e){} return r; }; }
})();
/* Orçamento para o contratante (imprimir ou salvar em PDF) */
async function evOrcamento(){
  const e = evAtual_(); if(!e) return avisar('Salve o evento antes de gerar o orçamento.');
  const f = await vsForm({ titulo:'Orçamento do evento', texto:'Escreva o que está incluso (uma linha por item) e as condições. Isso sai no papel; não fica guardado.', ok:'Gerar orçamento', campos:[
    { id:'incluso', rotulo:'O que está incluso (um item por linha)', tipo:'longo', valor: e.observacoes || '' },
    { id:'cond', rotulo:'Forma de pagamento', tipo:'texto', valor:'Sinal de 30% para reservar a data e o saldo até o dia do evento.' },
    { id:'validade', rotulo:'Validade do orçamento (dias)', tipo:'numero', valor:7, minimo:1 } ] });
  if(!f) return;
  const val = new Date(); val.setDate(val.getDate() + (Number(f.validade) || 7));
  const itens = String(f.incluso || '').split('\n').map(x => x.trim()).filter(Boolean);
  const h = '<div style="font-family:Arial,sans-serif;font-size:14px;padding:20px;max-width:720px;"><h1 style="margin:0;">' + NOME_UP_H_() + '</h1><div style="color:#555;margin-bottom:14px;">Orçamento para evento</div>' +
    '<h2 style="margin:0 0 4px;">' + escH(e.nome) + '</h2>' +
    '<table style="border-collapse:collapse;width:100%;margin:8px 0 14px;"><tr><td style="padding:3px 0;width:150px;"><b>Contratante</b></td><td>' + escH(e.contratante || '—') + (e.telefone ? ' · ' + escH(e.telefone) : '') + '</td></tr>' +
    '<tr><td style="padding:3px 0;"><b>Data</b></td><td>' + escH(fmtDataBR(evData_(e.data))) + (evHora_(e) ? ' · ' + escH(evHora_(e)) : '') + '</td></tr>' +
    (e.local ? '<tr><td style="padding:3px 0;"><b>Local</b></td><td>' + escH(e.local) + '</td></tr>' : '') +
    (e.tipo ? '<tr><td style="padding:3px 0;"><b>Tipo</b></td><td>' + escH(e.tipo) + '</td></tr>' : '') + '</table>' +
    (itens.length ? '<h3 style="margin:0 0 4px;">O que está incluso</h3><ul style="margin:0 0 14px;padding-left:20px;">' + itens.map(x => '<li>' + escH(x) + '</li>').join('') + '</ul>' : '') +
    '<div style="border:2px solid #000;padding:10px;margin-bottom:14px;"><div style="font-size:12px;color:#555;">VALOR TOTAL</div><div style="font-size:24px;font-weight:bold;">' + formatarMoeda(e.valorContratado) + '</div></div>' +
    '<div><b>Forma de pagamento:</b> ' + escH(f.cond || '') + '</div><div style="margin-top:4px;"><b>Validade:</b> até ' + escH(fmtDataBR(dataLocalISO(val))) + '.</div>' +
    '<div style="margin-top:46px;display:flex;gap:40px;"><div style="flex:1;border-top:1px solid #000;padding-top:4px;text-align:center;">' + NOME_H_() + '</div><div style="flex:1;border-top:1px solid #000;padding-top:4px;text-align:center;">' + escH(e.contratante || 'Contratante') + '</div></div></div>';
  imprimirDocumento(h, 'Orçamento — ' + e.nome, 'A4');
}

function limparEventoUI(){
  ['evId','evNome','evTipo','evData','evHoraInicio','evHoraFim','evLocal','evContratante','evTelefone','evValor','evObs','evMovId'].forEach(id => { const e = document.getElementById(id); if(e) e.value = ''; });
  document.getElementById('evStatus').value = 'Orçamento';
  evMov_ = { id:'', custos:[], recebimentos:[], carregado:false };
  showMsg('evMsg', '', 'ok');
}
function evNovo(){ limparEventoUI(); evAbaIr('dados'); abrirFormModal('eventoModal'); }

function evAbrir(id){
  const e = (eventos || []).find(x => x.id === id); if(!e) return;
  limparEventoUI();
  const set = (k, v) => { document.getElementById(k).value = v == null ? '' : v; };
  set('evId', e.id); set('evNome', e.nome); set('evTipo', e.tipo); set('evData', evData_(e.data)); set('evHoraInicio', e.horaInicio); set('evHoraFim', e.horaFim);
  set('evLocal', e.local); set('evContratante', e.contratante); set('evTelefone', e.telefone); set('evStatus', e.status || 'Orçamento'); set('evValor', e.valorContratado || 0); set('evObs', e.observacoes); set('evMovId', e.id);
  evAbaIr('dados'); abrirFormModal('eventoModal'); evCarregarMov_(id);
}

function evAtual_(){ const id = document.getElementById('evMovId').value; return id ? (eventos || []).find(x => x.id === id) : null; }

function evAbaIr(aba){
  const e = evAtual_();
  if(aba !== 'dados' && !e){ showMsg('evMsg', 'Salve os dados do evento primeiro para lançar custos e recebimentos.', 'warn'); aba = 'dados'; }
  evAba_ = aba;
  ['dados','custos','receb'].forEach(a => {
    const p = document.getElementById('evPane_' + a); if(p) p.style.display = a === aba ? '' : 'none';
    const b = document.getElementById('evTab_' + a); if(b) b.style.cssText = 'flex:1;' + (a === aba ? 'border-color:var(--gold);color:var(--gold);font-weight:700;' : '');
  });
  const t = document.getElementById('evTitulo'); if(t) t.innerHTML = e ? escH(e.nome) + ' ' + evBadge_(e) : 'Novo evento';
  if(aba !== 'dados') evRenderMov_();
}

async function evCarregarMov_(id){
  try{
    const r = await apiCall('eventoMovimentos', { eventoId:id });
    if(r && r.ok && document.getElementById('evMovId').value === id){ evMov_ = { id, custos:r.custos || [], recebimentos:r.recebimentos || [], carregado:true }; if(evAba_ !== 'dados') evRenderMov_(); }
  }catch(err){}
}

function evLinha_(titulo, sub, valor, tipo, id){
  return '<div class="notif-card" style="display:flex;justify-content:space-between;gap:8px;align-items:center;"><div style="min-width:0;"><b>' + escH(titulo) + '</b><div class="obs-line">' + escH(sub) + '</div></div>' +
    '<div style="text-align:right;white-space:nowrap;"><b>' + formatarMoeda(valor) + '</b><br><button type="button" class="ghost small" onclick="evCancelarMov(\'' + tipo + '\',\'' + id + '\')">Cancelar</button></div></div>';
}
function evRenderMov_(){
  const e = evAtual_(); if(!e) return;
  const c = document.getElementById('evPane_custos'), r = document.getElementById('evPane_receb');
  const carregando = '<div class="notif-empty">Carregando…</div>';
  const res = Number(e.resultado) || 0;
  if(c) c.innerHTML = '<div class="obs-line">Contratado: <b>' + formatarMoeda(e.valorContratado) + '</b> · Custos: <b>' + formatarMoeda(e.custoTotal) + '</b> · Resultado: <b style="color:' + (res < 0 ? 'var(--red-hi)' : 'var(--ok)') + ';">' + formatarMoeda(res) + '</b></div>' +
    '<button type="button" class="small-gold" style="margin:8px 0;" onclick="evNovoCusto()">+ Custo</button>' +
    (!evMov_.carregado ? carregando : evMov_.custos.length ? evMov_.custos.map(x => evLinha_(x.descricao, [fmtDataBR(x.data), x.categoria].filter(Boolean).join(' · '), x.valor, 'custo', x.id)).join('') : '<div class="notif-empty">Nenhum custo lançado.</div>');
  if(r) r.innerHTML = '<div class="obs-line">Contratado: <b>' + formatarMoeda(e.valorContratado) + '</b> · Recebido: <b>' + formatarMoeda(e.valorRecebido) + '</b> · A receber: <b' + (evAtrasado_(e) ? ' style="color:var(--red-hi);"' : '') + '>' + formatarMoeda(e.valorAReceber) + '</b></div>' +
    '<button type="button" class="small-gold" style="margin:8px 0;" onclick="evNovoRecebimento()">+ Recebimento</button>' +
    (!evMov_.carregado ? carregando : evMov_.recebimentos.length ? evMov_.recebimentos.map(x => evLinha_(x.forma || 'Recebimento', [fmtDataBR(x.data), x.observacao].filter(Boolean).join(' · '), x.valor, 'recebimento', x.id)).join('') : '<div class="notif-empty">Nenhum recebimento lançado.</div>');
}

function evAplicarEvento_(ev){ if(!ev) return; const i = (eventos || []).findIndex(x => x.id === ev.id); if(i >= 0) eventos[i] = ev; else eventos.push(ev); try{ salvarCache(); }catch(err){} renderEventosUI(); }

async function evNovoCusto(){
  const e = evAtual_(); if(!e) return;
  const f = await vsForm({ titulo:'Novo custo', texto:e.nome, ok:'Lançar custo', campos:[
    { id:'descricao', rotulo:'O que foi', tipo:'texto', obrigatorio:true, sugestoes:['Equipe extra','Ingredientes','Transporte','Aluguel de equipamento','Descartáveis'] },
    { id:'categoria', rotulo:'Categoria (opcional)', tipo:'texto', sugestoes:['Equipe','Insumos','Transporte','Equipamento','Outros'] },
    { id:'valor', rotulo:'Valor', tipo:'numero', obrigatorio:true, maiorQueZero:true, sufixo:'R$' },
    { id:'data', rotulo:'Data', tipo:'data', valor:evHojeISO_() } ] });
  if(!f) return;
  try{
    const r = await apiCall('adicionarCustoEvento', { eventoId:e.id, descricao:f.descricao, categoria:f.categoria || '', valor:f.valor, data:f.data || '', observacao:'', requisicaoId:novaRequisicao_() });
    if(r && r.ok){ evAplicarEvento_(r.evento); await evCarregarMov_(e.id); evAbaIr('custos'); avisar(r.message || 'Custo lançado.'); } else avisar((r && r.message) || 'Não foi possível lançar.');
  }catch(err){ avisar('Não foi possível lançar o custo agora.'); }
}
async function evNovoRecebimento(){
  const e = evAtual_(); if(!e) return;
  const formas = (formasPagamento || []).filter(x => x.ativa !== false).map(x => ({ v:x.nome, t:x.nome }));
  const f = await vsForm({ titulo:'Novo recebimento', texto:e.nome + ' · falta receber ' + formatarMoeda(e.valorAReceber), ok:'Lançar recebimento', campos:[
    { id:'valor', rotulo:'Valor recebido', tipo:'numero', obrigatorio:true, maiorQueZero:true, sufixo:'R$', valor:e.valorAReceber > 0 ? e.valorAReceber : '' },
    { id:'forma', rotulo:'Forma de pagamento', tipo:'escolha', opcoes:formas, valor:formas[0] ? formas[0].v : '' },
    { id:'data', rotulo:'Data', tipo:'data', valor:evHojeISO_() },
    { id:'obs', rotulo:'Observação (opcional)', tipo:'texto', sugestoes:['Sinal','Entrada','Saldo final'] } ] });
  if(!f) return;
  try{
    const r = await apiCall('adicionarRecebimentoEvento', { eventoId:e.id, valor:f.valor, forma:f.forma || '', data:f.data || '', observacao:f.obs || '', requisicaoId:novaRequisicao_() });
    if(r && r.ok){ evAplicarEvento_(r.evento); await evCarregarMov_(e.id); evAbaIr('receb'); avisar(r.message || 'Recebimento lançado.'); } else avisar((r && r.message) || 'Não foi possível lançar.');
  }catch(err){ avisar('Não foi possível lançar o recebimento agora.'); }
}
async function evCancelarMov(tipo, id){
  const e = evAtual_(); if(!e) return;
  const f = await vsForm({ titulo:'Cancelar lançamento', texto:'O lançamento deixa de contar nos totais do evento. Fica registrado na auditoria.', ok:'Cancelar lançamento', perigo:true,
    campos:[{ id:'motivo', rotulo:'Motivo', tipo:'texto', obrigatorio:true, sugestoes:['Valor errado','Lançado em duplicidade','Lançado no evento errado'] }] });
  if(!f) return;
  const executar = async (senha) => {
    try{
      const r = await apiCall('cancelarMovimentoEvento', { tipo, id, motivo:f.motivo, senhaAdminConfirmacao:senha || '' });
      if(r && r.ok){ evAplicarEvento_(r.evento); await evCarregarMov_(e.id); evAbaIr(evAba_); avisar(r.message || 'Cancelado.'); } else avisar((r && r.message) || 'Não foi possível cancelar.');
    }catch(err){ avisar('Não foi possível cancelar agora.'); }
  };
  if(precisaConfirmarAdmin()) abrirModalSenhaAdmin(executar); else executar('');
}

async function salvarEventoUI(){
  const novo = !document.getElementById('evId').value;
  const p = { id:evId.value, nome:evNome.value, tipo:evTipo.value, data:evData.value, horaInicio:evHoraInicio.value, horaFim:evHoraFim.value, local:evLocal.value, contratante:evContratante.value, telefone:evTelefone.value, status:evStatus.value, valorContratado:evValor.value, observacoes:evObs.value };
  try{
    const r = await apiCall('salvarEvento', p);
    showMsg('evMsg', r.message, r.ok ? 'ok' : 'warn');
    if(r.ok){
      eventos = r.eventos || eventos;
      const id = r.evento.id; document.getElementById('evId').value = id; document.getElementById('evMovId').value = id;
      renderEventosUI(); evAbaIr('dados');
      if(novo){ evMov_ = { id, custos:[], recebimentos:[], carregado:true }; showMsg('evMsg', 'Evento salvo. Agora você já pode lançar custos e recebimentos nas abas acima.', 'ok'); }
    }
  }catch(err){ showMsg('evMsg', 'Erro ao salvar evento.', 'warn'); }
}
async function cancelarEventoUI(id){
  id = id || document.getElementById('evId').value; if(!id) return;
  const f = await vsForm({ titulo:'Cancelar evento', texto:'O evento fica na lista como Cancelado (nada é apagado).', campos:[{ id:'motivo', rotulo:'Motivo do cancelamento (opcional)', tipo:'texto' }], ok:'Cancelar evento', perigo:true });
  if(!f) return;
  const senhaAdminConfirmacao = await pedirSenha_(); if(!senhaAdminConfirmacao) return;
  try{
    const r = await apiCall('cancelarEvento', { id, motivo:f.motivo, senhaAdminConfirmacao });
    if(r.ok){ eventos = r.eventos || eventos; renderEventosUI(); fecharFormModal('eventoModal'); avisar('Evento cancelado.'); } else avisar(r.message);
  }catch(err){ avisar('Erro ao cancelar.'); }
}
function evWhatsapp(){
  const e = evAtual_(); const tel = evTel_(e ? e.telefone : document.getElementById('evTelefone').value);
  if(!tel) return avisar('Informe o telefone do contratante na aba Dados e salve.');
  const txt = 'Olá' + (e && e.contratante ? ', ' + e.contratante : '') + '! Aqui é do ' + NOME_RESTAURANTE_ + ' sobre o evento "' + (e ? e.nome : '') + '"' + (e && evData_(e.data) ? ' do dia ' + fmtDataBR(evData_(e.data)) : '') + '.' +
    (e && e.valorAReceber > 0 ? ' Valor combinado: ' + formatarMoeda(e.valorContratado) + ' · já recebido: ' + formatarMoeda(e.valorRecebido) + ' · falta: ' + formatarMoeda(e.valorAReceber) + '.' : '');
  window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(txt), '_blank');
}
async function evDuplicar(){
  const e = evAtual_(); if(!e) return avisar('Salve o evento antes de duplicar.');
  const f = await vsForm({ titulo:'Duplicar evento', texto:'Cria um novo evento com os mesmos dados (sem custos nem recebimentos), como Orçamento.', ok:'Duplicar', campos:[
    { id:'nome', rotulo:'Nome do novo evento', tipo:'texto', obrigatorio:true, valor:e.nome + ' (cópia)' },
    { id:'data', rotulo:'Data', tipo:'data', valor:evData_(e.data) } ] });
  if(!f) return;
  try{
    const r = await apiCall('salvarEvento', { id:'', nome:f.nome, tipo:e.tipo, data:f.data || '', horaInicio:e.horaInicio, horaFim:e.horaFim, local:e.local, contratante:e.contratante, telefone:e.telefone, status:'Orçamento', valorContratado:e.valorContratado, observacoes:e.observacoes });
    if(r.ok){ eventos = r.eventos || eventos; renderEventosUI(); evAbrir(r.evento.id); avisar('Evento duplicado.'); } else avisar(r.message);
  }catch(err){ avisar('Não foi possível duplicar agora.'); }
}
async function evImprimir(){
  const e = evAtual_(); if(!e) return avisar('Salve o evento antes de imprimir.');
  await evCarregarMov_(e.id);
  const th = 'border:1px solid #000;padding:4px;text-align:left;', td = 'border:1px solid #000;padding:4px;';
  const tab = (tit, cab, linhas) => '<h3 style="margin:14px 0 4px;">' + tit + '</h3><table style="border-collapse:collapse;width:100%;"><tr>' + cab.map(c => '<th style="' + th + '">' + c + '</th>').join('') + '</tr>' + (linhas.length ? linhas.join('') : '<tr><td style="' + td + '" colspan="' + cab.length + '">Nenhum lançamento.</td></tr>') + '</table>';
  const h = '<div style="font-family:Arial,sans-serif;font-size:13px;padding:16px;"><h2 style="margin:0 0 4px;">Resumo do evento — ' + NOME_UP_H_() + '</h2>' +
    '<div><b>' + escH(e.nome) + '</b> (' + escH(e.status) + ')</div><div>' + escH(fmtDataBR(evData_(e.data))) + (evHora_(e) ? ' · ' + evHora_(e) : '') + (e.local ? ' · ' + escH(e.local) : '') + '</div>' +
    '<div>Contratante: ' + escH(e.contratante || '—') + (e.telefone ? ' · ' + escH(e.telefone) : '') + '</div>' +
    '<div style="margin-top:8px;"><b>Valor contratado:</b> ' + formatarMoeda(e.valorContratado) + ' · <b>Recebido:</b> ' + formatarMoeda(e.valorRecebido) + ' · <b>A receber:</b> ' + formatarMoeda(e.valorAReceber) + '</div>' +
    tab('Recebimentos', ['Data', 'Forma', 'Obs.', 'Valor'], evMov_.recebimentos.map(x => '<tr><td style="' + td + '">' + fmtDataBR(x.data) + '</td><td style="' + td + '">' + escH(x.forma) + '</td><td style="' + td + '">' + escH(x.observacao) + '</td><td style="' + td + '">' + formatarMoeda(x.valor) + '</td></tr>')) +
    tab('Custos', ['Data', 'Descrição', 'Categoria', 'Valor'], evMov_.custos.map(x => '<tr><td style="' + td + '">' + fmtDataBR(x.data) + '</td><td style="' + td + '">' + escH(x.descricao) + '</td><td style="' + td + '">' + escH(x.categoria) + '</td><td style="' + td + '">' + formatarMoeda(x.valor) + '</td></tr>')) +
    '<div style="margin-top:10px;"><b>Custos:</b> ' + formatarMoeda(e.custoTotal) + ' · <b>Resultado (contratado − custos):</b> ' + formatarMoeda(e.resultado) + '</div></div>';
  imprimirDocumento(h, 'Resumo do evento', 'A4');
}
