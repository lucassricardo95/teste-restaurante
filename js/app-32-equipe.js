/* ============================================================
   EQUIPE E PAGAMENTOS (18/10/2026) — Administrador → Loja e equipe → Equipe e pagamentos
   Ficha do funcionário, botão Pagar (lança a despesa em "Salários"), encargos como conta a pagar, recibo e cancelamento.
   Tudo roda no banco (api_equipe_folha, api_salvar_funcionario, api_pagar_funcionario, api_cancelar_pagamento_funcionario).
   ============================================================ */
var equipeDados_ = { mes:'', funcionarios:[], pagamentos:[], previsto:0, pago:0 };
var EQ_TIPOS_ = ['Salário','Adiantamento','Vale','Hora extra / diária','Comissão','13º salário','Férias','Outro'];

function eqMes_(){ const i = document.getElementById('eqMes'); if(i && !i.value) i.value = dataLocalISO(new Date()).slice(0, 7); return (i && i.value) || dataLocalISO(new Date()).slice(0, 7); }
function eqMesTxt_(m){ return String(m || '').slice(5, 7) + '/' + String(m || '').slice(0, 4); }
function eqNum_(v){ return Math.round((Number(v) || 0) * 100) / 100; }

async function carregarEquipe_(){
  const lista = document.getElementById('eqLista'); if(!lista) return;
  if(!apiConfigurada()){ lista.innerHTML = '<tr class="empty-row"><td>Conecte-se para ver a equipe.</td></tr>'; return; }
  try{
    const r = await apiCall('equipeFolha', { mes: eqMes_() });
    if(!r || !r.ok){ showMsg('eqMsg', (r && r.message) || 'Não foi possível carregar a equipe.', 'warn'); return; }
    equipeDados_ = r; renderEquipe_();
  }catch(e){ showMsg('eqMsg', 'Não foi possível carregar a equipe agora.', 'warn'); }
}

function renderEquipe_(){
  const d = equipeDados_, mes = eqMes_();
  const ativos = (d.funcionarios || []).filter(f => f.ativo), inativos = (d.funcionarios || []).filter(f => !f.ativo);
  const falta = ativos.reduce((s, f) => s + eqNum_(f.saldo), 0);
  const custo = ativos.reduce((s, f) => s + eqNum_(f.custoMensal), 0);
  const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  set('eqPrevisto', formatarMoeda(d.previsto)); set('eqPago', formatarMoeda(d.pago)); set('eqFalta', formatarMoeda(falta)); set('eqCusto', formatarMoeda(custo));
  const lista = document.getElementById('eqLista');
  lista.innerHTML = ativos.length ? ativos.map(f => {
    const quitado = eqNum_(f.salario) > 0 && eqNum_(f.saldo) <= 0.009;
    const sit = eqNum_(f.salario) <= 0 ? 'sem salário fixo' : (quitado ? '✅ pago em ' + eqMesTxt_(mes) : 'falta ' + formatarMoeda(f.saldo));
    const venc = 'dia ' + f.diaPagamento + (f.encargosPct > 0 ? ' · encargos ' + f.encargosPct + '%' : '');
    return '<tr><td>' + escH(f.nome) + '<span class="obs-line">' + escH(f.cargo || 'Sem cargo') + ' · ' + formatarMoeda(f.salario) + ' · ' + venc + ' · ' + sit + '</span></td>' +
      '<td style="white-space:nowrap;text-align:right;"><button type="button" class="small-gold" onclick="eqPagar(\'' + f.id + '\')">Pagar</button> <button type="button" class="ghost small" onclick="eqEditar(\'' + f.id + '\')">Editar</button></td></tr>';
  }).join('') : '<tr class="empty-row"><td>' + estadoVazio_('Nenhum funcionário cadastrado ainda.', '+ Novo funcionário', 'eqEditar(null)') + '</td></tr>';
  const inat = document.getElementById('eqInativos');
  if(inat) inat.innerHTML = inativos.length ? '<h3 class="mt-3">Desligados</h3><table><tbody>' + inativos.map(f => '<tr><td>' + escH(f.nome) + '<span class="obs-line">' + escH(f.cargo || '') + (f.desligadoEm ? ' · desligado em ' + fmtDataBR(f.desligadoEm) : '') + '</span></td><td style="text-align:right;"><button type="button" class="ghost small" onclick="eqEditar(\'' + f.id + '\')">Editar</button></td></tr>').join('') + '</tbody></table>' : '';
  const pg = document.getElementById('eqPagamentos');
  pg.innerHTML = (d.pagamentos || []).length ? d.pagamentos.map(x => {
    const cancel = x.status === 'Cancelada';
    return '<tr><td' + (cancel ? ' style="opacity:.55;text-decoration:line-through;"' : '') + '>' + escH(x.nome) + ' — ' + escH(x.tipo) + '<span class="obs-line">' + fmtDataBR(String(x.pagoEm || '').slice(0, 10)) + (x.observacao ? ' · ' + escH(x.observacao) : '') + (x.encargos > 0 ? ' · encargos ' + formatarMoeda(x.encargos) + ' a pagar' : '') + (cancel ? ' · cancelado: ' + escH(x.motivo || '') : '') + '</span></td>' +
      '<td style="text-align:right;white-space:nowrap;">' + formatarMoeda(x.valor) + '<br>' + (cancel ? '' : '<button type="button" class="ghost small" onclick="eqRecibo(\'' + x.id + '\')">Recibo</button> <button type="button" class="ghost small" onclick="eqCancelar(\'' + x.id + '\')">Cancelar</button>') + '</td></tr>';
  }).join('') : '<tr class="empty-row"><td>Nenhum pagamento em ' + eqMesTxt_(mes) + '.</td></tr>';
}

/* ---------- cadastro / edição ---------- */
async function eqEditar(id){
  const f = id ? (equipeDados_.funcionarios || []).find(x => x.id === id) : null;
  const campos = [
    { id:'nome', rotulo:'Nome', tipo:'texto', valor: f ? f.nome : '', obrigatorio:true, max:80 },
    { id:'cargo', rotulo:'Cargo', tipo:'texto', valor: f ? (f.cargo || '') : '', max:60, sugestoes:['Chapeiro','Atendente','Entregador','Cozinheiro','Auxiliar','Gerente'] },
    { id:'telefone', rotulo:'Telefone (opcional)', tipo:'texto', valor: f ? (f.telefone || '') : '', max:30 },
    { id:'admissao', rotulo:'Data de admissão (opcional)', tipo:'data', valor: f && f.admissao ? f.admissao : '' },
    { id:'salario', rotulo:'Salário mensal', sufixo:'R$', tipo:'numero', valor: f ? f.salario : '', obrigatorio:true, minimo:0 },
    { id:'diaPagamento', rotulo:'Dia do pagamento (1 a 31)', tipo:'numero', valor: f ? f.diaPagamento : 5, obrigatorio:true, minimo:1 },
    { id:'encargosPct', rotulo:'Encargos (%) — peça ao contador; 0 se não houver', tipo:'numero', valor: f ? f.encargosPct : 0, minimo:0 },
    { id:'provisao', rotulo:'Contar 13º e férias no custo mensal?', tipo:'escolha', valor: f && f.provisao ? 'true' : 'false', opcoes:[{ v:'false', t:'Não' }, { v:'true', t:'Sim (estimativa)' }] },
    { id:'observacao', rotulo:'Observação (opcional)', tipo:'texto', valor: f ? (f.observacao || '') : '', max:300 }
  ];
  { const us = (typeof usuarios !== 'undefined' ? usuarios : []).filter(u => u.ativo && u.nivel !== 'Desenvolvedor' && (!(equipeDados_.funcionarios || []).some(x => x.usuarioId === u.id && (!f || x.id !== f.id))));
    if(us.length) campos.splice(2, 0, { id:'usuarioId', rotulo:'Acesso ao sistema (para ver a própria escala)', tipo:'escolha', valor: f && f.usuarioId ? f.usuarioId : '', opcoes:[{ v:'', t:'Sem acesso' }].concat(us.map(u => ({ v:u.id, t:(u.nome || u.login) + ' (' + u.nivel + ')' }))) }); }
  if(f) campos.push({ id:'ativo', rotulo:'Situação', tipo:'escolha', valor: f.ativo ? 'true' : 'false', opcoes:[{ v:'true', t:'Trabalhando' }, { v:'false', t:'Desligado' }] });
  const r = await vsForm({ titulo: f ? 'Editar funcionário' : 'Novo funcionário', ok:'Salvar', campos });
  if(!r) return;
  if(!(r.diaPagamento >= 1 && r.diaPagamento <= 31)){ avisar('O dia do pagamento precisa ficar entre 1 e 31.'); return; }
  try{
    const res = await apiCall('salvarFuncionario', { id: f ? f.id : '', nome:r.nome, cargo:r.cargo, telefone:r.telefone, admissao:r.admissao, usuarioId:r.usuarioId || '', salario:r.salario, diaPagamento:Math.round(r.diaPagamento), encargosPct:r.encargosPct || 0, provisao: r.provisao === 'true', observacao:r.observacao, ativo: f ? r.ativo !== 'false' : true });
    if(res && res.ok){ showMsg('eqMsg', res.message, 'ok'); carregarEquipe_(); } else avisar((res && res.message) || 'Não foi possível salvar.');
  }catch(e){ avisar('Não foi possível salvar agora.'); }
}

/* ---------- pagar ---------- */
async function eqPagar(id, confirmado, anterior){
  const f = (equipeDados_.funcionarios || []).find(x => x.id === id); if(!f) return;
  const mes = eqMes_();
  let r = anterior;
  if(!r){
    const campos = [
      { id:'tipo', rotulo:'O que é este pagamento?', tipo:'escolha', valor:'Salário', opcoes: EQ_TIPOS_.map(t => ({ v:t, t })) },
      { id:'valor', rotulo:'Valor', sufixo:'R$', tipo:'numero', valor: eqNum_(f.saldo) > 0 ? eqNum_(f.saldo) : (eqNum_(f.salario) || ''), obrigatorio:true, maiorQueZero:true },
      { id:'saiuDoCaixa', rotulo:'De onde saiu o dinheiro?', tipo:'escolha', valor:'false', opcoes:[{ v:'false', t:'Fora do caixa (Pix, banco)' }, { v:'true', t:'Do caixa (dinheiro)' }] },
      { id:'observacao', rotulo:'Observação (opcional)', tipo:'texto', max:300 }
    ];
    if(f.encargosPct > 0) campos.splice(3, 0, { id:'lancarEncargos', rotulo:'Lançar os encargos (' + f.encargosPct + '%) em Contas a pagar?', tipo:'escolha', valor:'true', opcoes:[{ v:'true', t:'Sim' }, { v:'false', t:'Não' }], mostrarSe:{ campo:'tipo', valor:'Salário' } });
    r = await vsForm({ titulo:'Pagar ' + f.nome + ' — ' + eqMesTxt_(mes), texto:'Mês de referência: ' + eqMesTxt_(mes) + ' (mude o mês no topo da tela para pagar outro). O valor entra em Despesas, categoria Salários.', ok:'Registrar pagamento', campos });
    if(!r) return;
  }
  if(!iniciarOperacaoUnica('pagarFuncionario')) return;
  try{
    const res = await apiCall('pagarFuncionario', { funcionarioId:id, competencia:mes, tipo:r.tipo, valor:r.valor, saiuDoCaixa: r.saiuDoCaixa === 'true', lancarEncargos: r.lancarEncargos === 'true', observacao:r.observacao || '', confirmado: confirmado ? 'true' : '' });
    if(res && res.confirmar){ finalizarOperacaoUnica('pagarFuncionario'); if(await confirmarTxt_(res.message, 'Confirmar pagamento', false)) return eqPagar(id, true, r); return; }
    if(res && res.ok){
      if(res.despesas){ despesas = res.despesas; salvarCache(); try{ renderContasPagar(); renderDespesas(); }catch(e){ if(window.erroTela_) erroTela_(e); } }
      showMsg('eqMsg', res.message, 'ok'); await carregarEquipe_();
    } else avisar((res && res.message) || 'Não foi possível registrar o pagamento.');
  }catch(e){ avisar('Não foi possível registrar o pagamento agora.'); }
  finally { finalizarOperacaoUnica('pagarFuncionario'); }
}

/* ---------- cancelar ---------- */
async function eqCancelar(id){
  const x = (equipeDados_.pagamentos || []).find(p => p.id === id); if(!x) return;
  const f = await vsForm({ titulo:'Cancelar pagamento', texto: x.tipo + ' de ' + x.nome + ' — ' + formatarMoeda(x.valor) + '. A despesa lançada também é cancelada.', ok:'Cancelar pagamento', perigo:true,
    campos:[{ id:'motivo', rotulo:'Motivo', tipo:'texto', obrigatorio:true, sugestoes:['Valor errado','Lançado no mês errado','Lançado em duplicidade'] }] });
  if(!f) return;
  const executar = async (senha) => {
    try{
      const r = await apiCall('cancelarPagamentoFuncionario', { id, motivo:f.motivo, senhaAdminConfirmacao: senha || '' });
      if(r && r.ok){
        if(r.despesas){ despesas = r.despesas; salvarCache(); try{ renderContasPagar(); renderDespesas(); }catch(e){ if(window.erroTela_) erroTela_(e); } }
        showMsg('eqMsg', r.message, 'ok'); carregarEquipe_();
      } else avisar((r && r.message) || 'Não foi possível cancelar.');
    }catch(e){ avisar('Não foi possível cancelar agora.'); }
  };
  if(precisaConfirmarAdmin()) abrirModalSenhaAdmin(executar); else executar('');
}

/* ---------- recibo (imprime em A4; no celular, "Salvar como PDF" na janela de impressão) ---------- */
var EQ_UN_ = ['zero','um','dois','três','quatro','cinco','seis','sete','oito','nove','dez','onze','doze','treze','catorze','quinze','dezesseis','dezessete','dezoito','dezenove'];
var EQ_DEZ_ = ['','','vinte','trinta','quarenta','cinquenta','sessenta','setenta','oitenta','noventa'];
var EQ_CEN_ = ['','cento','duzentos','trezentos','quatrocentos','quinhentos','seiscentos','setecentos','oitocentos','novecentos'];
function eqExtenso999_(n){
  if(n === 0) return '';
  if(n === 100) return 'cem';
  const c = Math.floor(n / 100), r = n % 100, p = [];
  if(c) p.push(EQ_CEN_[c]);
  if(r) p.push(r < 20 ? EQ_UN_[r] : EQ_DEZ_[Math.floor(r / 10)] + (r % 10 ? ' e ' + EQ_UN_[r % 10] : ''));
  return p.join(' e ');
}
function eqExtenso_(v){
  const cent = Math.round((Number(v) || 0) * 100), reais = Math.floor(cent / 100), cts = cent % 100, partes = [];
  const mil = Math.floor(reais / 1000), resto = reais % 1000;
  if(mil) partes.push(mil === 1 ? 'mil' : eqExtenso999_(mil) + ' mil');
  if(resto) partes.push(eqExtenso999_(resto));
  let t = '';
  if(reais === 0) t = '';
  else {
    t = partes.join(resto && resto < 100 || (resto % 100 === 0 && resto) ? ' e ' : ' ') + (reais === 1 ? ' real' : ' reais');
  }
  if(cts) t += (t ? ' e ' : '') + eqExtenso999_(cts) + (cts === 1 ? ' centavo' : ' centavos');
  return t || 'zero real';
}
function eqRecibo(id){
  const x = (equipeDados_.pagamentos || []).find(p => p.id === id); if(!x) return;
  const f = (equipeDados_.funcionarios || []).find(p => p.id === x.funcionarioId) || {};
  const e = t => escH(t == null ? '' : t);
  const dia = fmtDataBR(String(x.pagoEm || '').slice(0, 10));
  const h = '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;padding:24px 32px;">' +
    '<h2 style="text-align:center;margin:0 0 4px;">RECIBO DE PAGAMENTO</h2><div style="text-align:center;margin-bottom:24px;">' + NOME_UP_H_() + '</div>' +
    '<p>Recebi de <b>' + NOME_UP_H_() + '</b> a importância de <b>' + e(formatarMoeda(x.valor)) + '</b> (' + e(eqExtenso_(x.valor)) + '), referente a <b>' + e(String(x.tipo).toLowerCase()) + '</b> do mês <b>' + e(eqMesTxt_(x.competencia)) + '</b>.</p>' +
    '<p>Funcionário: <b>' + e(x.nome) + '</b>' + (f.cargo ? ' — ' + e(f.cargo) : '') + '</p>' +
    (x.observacao ? '<p>Observação: ' + e(x.observacao) + '</p>' : '') +
    '<p>Para maior clareza, firmo o presente recibo.</p><p style="margin-top:12px;">Data do pagamento: ' + e(dia) + '</p>' +
    '<div style="margin-top:56px;display:flex;gap:40px;"><div style="flex:1;border-top:1px solid #000;text-align:center;padding-top:4px;">' + e(x.nome) + '<br><small>Funcionário</small></div>' +
    '<div style="flex:1;border-top:1px solid #000;text-align:center;padding-top:4px;">' + NOME_UP_H_() + '<br><small>Empregador</small></div></div></div>';
  imprimirDocumento(h, 'Recibo ' + x.nome, 'A4');
}
