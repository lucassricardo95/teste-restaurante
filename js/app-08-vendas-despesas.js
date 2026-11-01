/* ---------- EDITAR VENDA ---------- */
let versaoEdicaoVenda_ = '', totalOrigEdicao_ = 0;
function abrirModalEditarVenda(vendaId){
  vendaEditandoId = vendaId;
  { const vv = vendas.find(x=>x.id===vendaId); versaoEdicaoVenda_ = (vv && vv._v) || ''; }  // ITEM 2.3: versão que o operador está vendo
  itensEdicaoVenda = itensVenda.filter(it=>it.vendaId===vendaId).map(it=>({produtoId:it.produtoId||null, comboId:it.comboId||null, descricao:it.descricao, quantidade:it.quantidade, valorUnitario:it.valorUnitario, custoUnitario:it.custoUnitario||0}));
  totalOrigEdicao_ = itensEdicaoVenda.reduce((t,it)=>t+it.quantidade*it.valorUnitario,0);
  document.getElementById('evMotivo').value = '';
  document.getElementById('evSenhaAdmin').value = '';
  document.getElementById('evSenhaAdminBox').style.display = precisaConfirmarAdmin() ? 'block' : 'none';
  try{ const lb = document.querySelector('label[for="evSenhaAdmin"]'); if(lb) lb.textContent = (currentUser && currentUser.nivel === 'Admin') ? 'Sua senha (confirma a edição) *' : 'Senha do administrador *'; }catch(e){}
  renderItensEdicaoVenda();
  document.getElementById('editarVendaModal').classList.add('open');
}
function fecharModalEditarVenda(){ document.getElementById('editarVendaModal').classList.remove('open'); }
function adicionarItemEdicaoVenda(){
  const descricao = document.getElementById('evNovaDescricao').value.trim();
  const qtd = Number(document.getElementById('evNovaQtd').value) || 1;
  const valor = Number(document.getElementById('evNovoValor').value) || 0;
  if(!descricao){ return; }
  itensEdicaoVenda.push({ produtoId: null, comboId: null, descricao, quantidade: qtd, valorUnitario: valor, custoUnitario: 0 });
  document.getElementById('evNovaDescricao').value=''; document.getElementById('evNovaQtd').value=1; document.getElementById('evNovoValor').value='';
  renderItensEdicaoVenda();
}
function removerItemEdicaoVenda(idx){ itensEdicaoVenda.splice(idx,1); renderItensEdicaoVenda(); }
function mudarQtdEdicaoVenda(idx, val){ let q = Math.floor(Number(val)) || 1; if(q > QTD_MAX_ITEM_){ q = QTD_MAX_ITEM_; avisoQtdMax_('evMsg'); } itensEdicaoVenda[idx].quantidade = Math.max(1, q); renderItensEdicaoVenda(); }
function mudarValorEdicaoVenda(idx, val){ itensEdicaoVenda[idx].valorUnitario = Number(val)||0; renderItensEdicaoVenda(); }
function renderItensEdicaoVenda(){
  const box = document.getElementById('evItensLista');
  let total = 0;
  box.innerHTML = itensEdicaoVenda.map((it,idx)=>{
    total += it.quantidade*it.valorUnitario;
    return `<div class="pagamento-row">
      <span style="flex:1.5;font-size:12.5px;align-self:center;">${escH(it.descricao)}</span>
      <input type="number" style="max-width:55px;" value="${it.quantidade}" min="1" max="50" oninput="mudarQtdEdicaoVenda(${idx}, this.value)">
      <input type="number" style="max-width:80px;" value="${it.valorUnitario}" step="0.01" oninput="mudarValorEdicaoVenda(${idx}, this.value)">
      <button class="rm-row" onclick="removerItemEdicaoVenda(${idx})">✕</button>
    </div>`;
  }).join('') || '<div class="notif-empty">Nenhum item.</div>';
  document.getElementById('evNovoTotal').textContent = formatarMoeda(total);
  evAtualizarFormaDif_(total);
}
/* Aumento no pedido: pergunta em que forma a diferença será paga (só aparece quando o valor sobe e o pedido tem um único pagamento). */
function evAtualizarFormaDif_(total){
  const box = document.getElementById('evDifBox'), sel = document.getElementById('evFormaDif'); if(!box || !sel) return;
  const pags = pagamentosVenda.filter(x=>x.vendaId===vendaEditandoId);
  const mostrar = pags.length === 1 && total > totalOrigEdicao_ + 0.009;
  box.style.display = mostrar ? 'block' : 'none';
  if(!mostrar){ sel.innerHTML = ''; return; }
  const atual = sel.value;
  sel.innerHTML = '<option value="">Mesma forma do pedido (' + escH(pags[0].forma||'') + ')</option>' + formasPagamento.filter(f=>f.ativa).map(f=>'<option value="' + escH(f.nome) + '">' + escH(f.nome) + '</option>').join('');
  if(atual) sel.value = atual;
}
async function salvarEdicaoVenda(){
  const motivo = document.getElementById('evMotivo').value.trim();
  const senhaAdminConfirmacao = document.getElementById('evSenhaAdmin').value;
  if(!motivo){ showMsg('evMsg','Informe o motivo da edição.','warn'); return; }
  if(precisaConfirmarAdmin() && !senhaAdminConfirmacao){ showMsg('evMsg','Digite a sua senha para confirmar a edição.','warn'); return; }
  if(itensEdicaoVenda.length===0){ showMsg('evMsg','A venda precisa ter ao menos um item.','warn'); return; }
  try{
    const formaDif_ = (document.getElementById('evDifBox').style.display !== 'none' && document.getElementById('evFormaDif').value) || undefined;
    const payloadEd_ = { id: vendaEditandoId, itens: itensEdicaoVenda, motivo, senhaAdminConfirmacao, versaoEsperada: versaoEdicaoVenda_ || undefined, formaDiferenca: formaDif_ };
    let r = await apiCall('editarVenda', payloadEd_);
    if(r && !r.ok && typeof cfCustoMudou === 'function' && cfCustoMudou(r) && await cfAtualizarCustosItens(itensEdicaoVenda)) r = await apiCall('editarVenda', payloadEd_);
    if(r.ok){
      vendas = r.vendas || vendas; itensVenda = r.itensVenda || itensVenda; salvarCache();
      showMsg('evMsg', r.message, r.aviso ? 'warn' : 'ok');
      renderVendas();
      try{ renderPedidos(); renderEntregas(); }catch(e){ if(window.erroTela_) erroTela_(e); }
      setTimeout(fecharModalEditarVenda, r.aviso ? 6500 : 1200);
    } else {
      showMsg('evMsg', r.message, 'warn');
      if(r.conflito){ try{ renderVendas(); renderPedidos(); renderEntregas(); }catch(e){ if(window.erroTela_) erroTela_(e); } setTimeout(fecharModalEditarVenda, 3500); } // ITEM 2.3: outra pessoa mexeu — reabra para ver os dados atuais
    }
  } catch(e){ showMsg('evMsg','Não foi possível salvar a edição.','warn'); }
}

/* ============================================================
   CAIXA — DESPESAS
   ============================================================ */
let despesaEditandoId = null;
function abrirModalDespesa(){
  if(!sessaoCaixa){ showMsg('vMsg','Abra o caixa antes de lançar uma despesa.','warn'); return; }
  despesaEditandoId = null;
  document.getElementById('despesaModalTitulo').textContent = 'Lançar despesa';
  document.getElementById('despBtn').textContent = 'Lançar despesa';
  ['despDescricao','despValor','despObs'].forEach(id=>document.getElementById(id).value='');
  popularCategoriasDespesa('despCategoria','Outros'); prepararCamposAdminDespesa(false);
  document.getElementById('despMsg').innerHTML = '';
  document.getElementById('despesaModal').classList.add('open');
}
function abrirModalEditarDespesa(id){
  const d = despesas.find(x=>x.id===id);
  if(!d) return;
  despesaEditandoId = id;
  document.getElementById('despesaModalTitulo').textContent = 'Editar despesa';
  document.getElementById('despBtn').textContent = 'Salvar alterações';
  document.getElementById('despDescricao').value = d.descricao;
  document.getElementById('despValor').value = d.valor;
  document.getElementById('despObs').value = d.observacao||'';
  popularCategoriasDespesa('despCategoria', d.categoria); prepararCamposAdminDespesa(true, d);
  document.getElementById('despMsg').innerHTML = '';
  document.getElementById('despesaModal').classList.add('open');
}
function fecharModalDespesa(){ document.getElementById('despesaModal').classList.remove('open'); }
function abrirModalSangria(){
  if(!sessaoCaixa){ showMsg('vMsg','Abra o caixa antes de registrar uma sangria.','warn'); return; }
  document.getElementById('sangValor').value = '';
  document.getElementById('sangMotivo').value = '';
  document.getElementById('sangMsg').innerHTML = '';
  document.getElementById('sangriaModal').classList.add('open');
}
function fecharModalSangria(){ document.getElementById('sangriaModal').classList.remove('open'); }
async function salvarSangriaModal(){
  const valor = Number(document.getElementById('sangValor').value) || 0;
  const motivo = document.getElementById('sangMotivo').value.trim();
  if(valor<=0){ showMsg('sangMsg','Informe um valor maior que zero.','warn'); return; }
  if(!motivo){ showMsg('sangMsg','Informe o motivo da sangria.','warn'); return; }
  if(!iniciarOperacaoUnica('sangria')) return;
  try{
    const r = await apiCall('addSangria', { valor, motivo });
    sangrias = r.sangrias || sangrias; salvarCache();
    if(r.ok){ renderStatusCaixa(); fecharModalSangria(); }
    else showMsg('sangMsg', r.message, 'warn');
  } catch(e){ showMsg('sangMsg','Não foi possível registrar.','warn'); }
  finally { finalizarOperacaoUnica('sangria'); }
}
async function salvarDespesaModal(){
  const descricao = document.getElementById('despDescricao').value.trim();
  const valor = Number(document.getElementById('despValor').value) || 0;
  const observacao = document.getElementById('despObs').value.trim();
  const categoria = document.getElementById('despCategoria').value;
  const admin = ehAdminAtual();
  const situacao = admin ? document.getElementById('despSituacao').value : 'Paga';
  const vencimento = admin ? document.getElementById('despVencimento').value : '';
  const saiuDoCaixa = admin ? document.getElementById('despSaiuCaixa').checked : true;
  if(!descricao){ showMsg('despMsg','Informe a descrição da despesa.','warn'); return; }
  if(valor<=0){ showMsg('despMsg','Informe um valor maior que zero.','warn'); return; }
  if(!despesaEditandoId && situacao==='A pagar' && !vencimento){ showMsg('despMsg','Informe o vencimento.','warn'); return; }
  setBotoesOcupados(true);
  try{
    const acao = despesaEditandoId ? 'editarDespesa' : 'addDespesa';
    const payload = despesaEditandoId ? { id: despesaEditandoId, descricao, valor, observacao, categoria, vencimento } : { descricao, valor, observacao, categoria, situacao, vencimento, saiuDoCaixa };
    const r = await apiCall(acao, payload);
    despesas = r.despesas || despesas; salvarCache();
    if(r.ok){
      renderDespesas(); renderContasPagar(); renderResumoPrevisto(); atualizarResumoHoje(); renderStatusCaixa();
      fecharModalDespesa();
    } else { showMsg('despMsg', r.message, 'warn'); }
  } catch(e){ showMsg('despMsg','Não foi possível salvar.','warn'); }
  finally { setBotoesOcupados(false); }
}
/* ---------- FASE 8B — CONTAS A PAGAR E DESPESAS MENSAIS ---------- */
const CATEGORIAS_DESPESA_PADRAO = ['Insumos','Aluguel','Energia','Água','Gás','Internet/Telefone','Salários','Impostos','Imposto das vendas (DAS)','Manutenção','Marketing','Embalagens','Entregadores','Brindes','Outros'];
function listaCategoriasDespesa(){ return (categoriasDespesa && categoriasDespesa.length) ? categoriasDespesa : CATEGORIAS_DESPESA_PADRAO; }
function ehAdminAtual(){ return !!currentUser && currentUser.nivel === 'Admin'; }
function despesaEfetiva(d){ return d.status==='Confirmada' && d.situacao!=='A pagar'; }
function mesReferenciaDespesa(d){ return d.competencia || (d.vencimento ? String(d.vencimento).slice(0,7) : dataLocalISO(new Date(d.timestamp)).slice(0,7)); }
function fmtDataBR(iso){ return iso ? String(iso).split('-').reverse().join('/') : '—'; }
function popularCategoriasDespesa(selectId, valor){
  const el = document.getElementById(selectId); if(!el) return;
  el.innerHTML = listaCategoriasDespesa().map(c=>`<option value="${c}">${c}</option>`).join('');
  el.value = valor && listaCategoriasDespesa().includes(valor) ? valor : 'Outros';
}
function aoMudarSituacaoDespesa(){
  const aPagar = document.getElementById('despSituacao').value === 'A pagar';
  document.getElementById('despVencBox').style.display = aPagar ? 'block' : 'none';
  document.getElementById('despCaixaBox').style.display = aPagar ? 'none' : 'block';
}
function prepararCamposAdminDespesa(editando, d){
  const admin = ehAdminAtual();
  document.getElementById('despAdminBox').style.display = admin ? 'block' : 'none';
  document.getElementById('despSituacao').disabled = !!editando;
  document.getElementById('despSituacao').value = editando ? d.situacao : 'Paga';
  document.getElementById('despVencimento').value = editando ? (d.vencimento||'') : '';
  document.getElementById('despSaiuCaixa').checked = editando ? d.saiuDoCaixa : true;
  if(admin) aoMudarSituacaoDespesa();
  if(editando && d.situacao!=='A pagar'){ document.getElementById('despVencBox').style.display = d.vencimento ? 'block':'none'; document.getElementById('despCaixaBox').style.display='none'; }
}
function abrirModalContaPagar(){
  despesaEditandoId = null;
  document.getElementById('despesaModalTitulo').textContent = 'Nova conta a pagar';
  document.getElementById('despBtn').textContent = 'Registrar conta';
  ['despDescricao','despValor','despObs'].forEach(id=>document.getElementById(id).value='');
  popularCategoriasDespesa('despCategoria','Outros');
  prepararCamposAdminDespesa(false);
  document.getElementById('despSituacao').value = 'A pagar'; aoMudarSituacaoDespesa();
  document.getElementById('despMsg').innerHTML = '';
  document.getElementById('despesaModal').classList.add('open');
}
function renderContasPagar(){
  const box = document.getElementById('contasPagarLista'); if(!box) return;
  const hoje = dataLocalISO(new Date());
  const lista = despesas.filter(d=>d.status==='Confirmada' && d.situacao==='A pagar').sort((a,b)=>String(a.vencimento).localeCompare(String(b.vencimento)));
  const total = lista.reduce((s,d)=>s+Number(d.valor),0);
  const vencidas = lista.filter(d=>d.vencimento && d.vencimento < hoje);
  document.getElementById('contasPagarTotal').textContent = formatarMoeda(total);
  document.getElementById('contasPagarVencidas').textContent = vencidas.length ? `${vencidas.length} vencida(s): ${formatarMoeda(vencidas.reduce((s,d)=>s+Number(d.valor),0))}` : 'Nenhuma vencida';
  box.innerHTML = lista.length ? lista.map(d=>{
    const venc = d.vencimento < hoje ? '<span class="badge" style="background:#7c1a15;">vencida</span>' : (d.vencimento===hoje ? '<span class="badge">vence hoje</span>' : '');
    return `<tr>
      <td>${escH(d.descricao)} ${venc}<span class="obs-line">${d.categoria} • vence ${fmtDataBR(d.vencimento)}${d.recorrenteId?' • mensal':''}</span></td>
      <td>${formatarMoeda(d.valor)}</td>
      <td><button class="small-gold" onclick="abrirModalPagarDespesa('${d.id}')">Pagar</button><button class="ghost" onclick="abrirModalEditarDespesa('${d.id}')">editar</button><button class="ghost" onclick="abrirModalCancelar('despesa','${d.id}')">cancelar</button></td>
    </tr>`; }).join('') : '<tr class="empty-row"><td colspan="3">Nenhuma conta a pagar.</td></tr>';
}
function abrirModalPagarDespesa(id){
  const d = despesas.find(x=>x.id===id); if(!d) return;
  document.getElementById('pgId').value = id;
  document.getElementById('pgDescricao').textContent = d.descricao + ' — previsto ' + formatarMoeda(d.valor);
  document.getElementById('pgValor').value = d.valor;
  document.getElementById('pgSaiuCaixa').checked = false;
  document.getElementById('pgMsg').innerHTML = '';
  document.getElementById('pagarModal').classList.add('open');
}
function fecharModalPagar(){ document.getElementById('pagarModal').classList.remove('open'); }
async function confirmarPagamentoDespesa(){
  const id = document.getElementById('pgId').value;
  const valorPago = Number(document.getElementById('pgValor').value)||0;
  const saiuDoCaixa = document.getElementById('pgSaiuCaixa').checked;
  if(valorPago<=0){ showMsg('pgMsg','Informe o valor pago.','warn'); return; }
  if(saiuDoCaixa && !sessaoCaixa){ showMsg('pgMsg','Abra o caixa para pagar com dinheiro do caixa.','warn'); return; }
  if(!iniciarOperacaoUnica('pagarDespesa')) return;
  try{
    const r = await apiCall('pagarDespesa', { id, saiuDoCaixa, valorPago });
    if(r.ok){ despesas = r.despesas || despesas; salvarCache(); renderContasPagar(); renderDespesas(); renderResumoPrevisto(); renderFluxoPrevisto(); atualizarResumoHoje(); gerarRelatorio(); renderStatusCaixa(); fecharModalPagar(); }
    else showMsg('pgMsg', r.message, 'warn');
  } catch(e){ showMsg('pgMsg','Não foi possível registrar o pagamento.','warn'); }
  finally { finalizarOperacaoUnica('pagarDespesa'); }
}
function renderResumoPrevisto(){
  const inp = document.getElementById('prevMes'); if(!inp) return;
  if(!inp.value) inp.value = dataLocalISO(new Date()).slice(0,7);
  const mes = inp.value;
  const doMes = despesas.filter(d=>d.status==='Confirmada' && mesReferenciaDespesa(d)===mes);
  const previsto = doMes.reduce((s,d)=>s+Number(d.valor),0);
  const pago = doMes.filter(d=>d.situacao!=='A pagar').reduce((s,d)=>s+Number(d.valor),0);
  document.getElementById('prevPrevisto').textContent = formatarMoeda(previsto);
  document.getElementById('prevPago').textContent = formatarMoeda(pago);
  document.getElementById('prevAPagar').textContent = formatarMoeda(previsto-pago);
  const porCat = {};
  doMes.forEach(d=>{ porCat[d.categoria] = (porCat[d.categoria]||0) + Number(d.valor); });
  const linhas = Object.entries(porCat).sort((a,b)=>b[1]-a[1]);
  document.getElementById('prevCategorias').innerHTML = linhas.length ? linhas.map(([c,v])=>`<div class="info-line">${c}: <b>${formatarMoeda(v)}</b></div>`).join('') : '<div class="notif-empty">Sem despesas neste mês.</div>';
}
/* ----- despesas mensais ----- */
let recEditandoId = null;
function renderDespesasRecorrentes(){
  const tbody = document.getElementById('recTable'); if(!tbody) return;
  tbody.innerHTML = despesasRecorrentes.length ? despesasRecorrentes.map(r=>`<tr>
    <td>${escH(r.descricao)}${r.ativa?'':' <span class="badge">inativa</span>'}<span class="obs-line">${r.categoria} • ${r.periodicidade} • dia ${r.diaVencimento} • desde ${r.inicio.split('-').reverse().join('/')}${r.termino?' até '+r.termino.split('-').reverse().join('/'):''}</span></td>
    <td>${formatarMoeda(r.valor)}</td>
    <td><button class="small-gold" onclick="abrirModalRecorrente('${r.id}')">Editar</button></td>
  </tr>`).join('') : '<tr class="empty-row"><td colspan="3">Nenhuma despesa mensal cadastrada.</td></tr>';
}
function abrirModalRecorrente(id){
  const r = id ? despesasRecorrentes.find(x=>x.id===id) : null;
  recEditandoId = r ? r.id : null;
  document.getElementById('recTitulo').textContent = r ? 'Editar despesa mensal' : 'Nova despesa mensal';
  document.getElementById('recDescricao').value = r ? r.descricao : '';
  popularCategoriasDespesa('recCategoria', r ? r.categoria : 'Outros');
  document.getElementById('recValor').value = r ? r.valor : '';
  document.getElementById('recDia').value = r ? r.diaVencimento : '';
  document.getElementById('recPeriodicidade').value = r ? r.periodicidade : 'Mensal';
  document.getElementById('recInicio').value = r ? r.inicio : dataLocalISO(new Date()).slice(0,7);
  document.getElementById('recTermino').value = r ? r.termino : '';
  document.getElementById('recObs').value = r ? r.observacao : '';
  document.getElementById('recAtivaBox').style.display = r ? 'flex' : 'none';
  document.getElementById('recAtiva').checked = r ? r.ativa : true;
  document.getElementById('recAviso').style.display = r ? 'block' : 'none';
  document.getElementById('recMsg').innerHTML = '';
  document.getElementById('recModal').classList.add('open');
}
function fecharModalRecorrente(){ document.getElementById('recModal').classList.remove('open'); }
async function salvarRecorrente(){
  const descricao = document.getElementById('recDescricao').value.trim();
  const valor = Number(document.getElementById('recValor').value)||0;
  const diaVencimento = Number(document.getElementById('recDia').value)||0;
  const inicio = document.getElementById('recInicio').value;
  const termino = document.getElementById('recTermino').value;
  if(!descricao){ showMsg('recMsg','Informe a descrição.','warn'); return; }
  if(valor<=0){ showMsg('recMsg','Informe um valor maior que zero.','warn'); return; }
  if(!(diaVencimento>=1 && diaVencimento<=31)){ showMsg('recMsg','O dia do vencimento deve ser de 1 a 31.','warn'); return; }
  if(!inicio){ showMsg('recMsg','Informe o mês de início.','warn'); return; }
  if(termino && termino<inicio){ showMsg('recMsg','O término deve ser igual ou depois do início.','warn'); return; }
  const payload = { descricao, categoria: document.getElementById('recCategoria').value, valor, diaVencimento,
    periodicidade: document.getElementById('recPeriodicidade').value, observacao: document.getElementById('recObs').value.trim(), inicio, termino };
  if(!iniciarOperacaoUnica('recorrente')) return;
  try{
    let r;
    if(recEditandoId){ payload.id = recEditandoId; payload.ativa = document.getElementById('recAtiva').checked; r = await apiCall('editarDespesaRecorrente', payload); }
    else r = await apiCall('addDespesaRecorrente', payload);
    if(r.ok){
      despesasRecorrentes = r.despesasRecorrentes || despesasRecorrentes; despesas = r.despesas || despesas; salvarCache();
      renderDespesasRecorrentes(); renderContasPagar(); renderResumoPrevisto(); fecharModalRecorrente();
      showMsg('recListaMsg', r.message, 'ok');
    } else showMsg('recMsg', r.message, 'warn');
  } catch(e){ showMsg('recMsg','Não foi possível salvar.','warn'); }
  finally { finalizarOperacaoUnica('recorrente'); }
}
async function gerarContasDoMes(){
  if(!iniciarOperacaoUnica('gerarMes')) return;
  try{
    const r = await apiCall('gerarDespesasMes', {});
    if(r.ok){ despesas = r.despesas || despesas; salvarCache(); renderContasPagar(); renderResumoPrevisto(); }
    showMsg('recListaMsg', r.message, r.ok?'ok':'warn');
  } catch(e){ showMsg('recListaMsg','Não foi possível gerar.','warn'); }
  finally { finalizarOperacaoUnica('gerarMes'); }
}

function renderDespesas(){
  const dataFiltro = document.getElementById('despHistData').value;
  const tbody = document.getElementById('despTable');
  if(!tbody) return;
  const lista = despesas.filter(d => dataLocalISO(new Date(d.timestamp)) === dataFiltro && !(d.situacao==='A pagar' && d.status==='Confirmada')).sort((a,b)=>b.timestamp-a.timestamp);
  const total = lista.filter(despesaEfetiva).reduce((s,d)=>s+Number(d.valor),0);
  document.getElementById('despTotalDia').textContent = formatarMoeda(total);
  if(lista.length===0){ tbody.innerHTML = '<tr class="empty-row"><td colspan="3">Nenhuma despesa nesse dia.</td></tr>'; return; }
  tbody.innerHTML = lista.map(d=>`
    <tr class="${d.status==='Cancelada'?'cancelada':''}">
      <td>${escH(d.descricao)}<span class="obs-line">${d.categoria||'Outros'}${d.saiuDoCaixa===false?' • fora do caixa':''}${escH(d.observacao?' • '+d.observacao:'')}</span></td><td>${formatarMoeda(d.valor)}</td>
      <td>${d.status==='Confirmada'?(d.categoria==='Ajuste pós-venda'?`<span class="obs-line">veja em Reembolsos e ajustes</span>`:`<button class="ghost" onclick="abrirModalEditarDespesa('${d.id}')">editar</button><button class="ghost" onclick="abrirModalCancelar('despesa','${d.id}')">cancelar</button>`):`<span class="obs-line">${escH(d.motivoCancelamento)}</span>`}</td>
    </tr>`).join('');
}


/* ---------- ITEM 2.6 — AJUSTES PÓS-VENDA ----------
   A venda não muda. O servidor cria o ajuste (e, quando sai dinheiro, uma despesa "Ajuste pós-venda" ligada à venda). */
const AJ_TIPOS_COM_SAIDA_ = ['Reembolso em dinheiro','Desconto retroativo'];
const AJ_AJUDA_ = {
  'Reembolso em dinheiro': 'Devolve dinheiro ao cliente. Só para venda já paga. Entra no DRE como ajuste e, se sair do caixa, o fechamento já considera.',
  'Crédito para próxima compra': 'Fica registrado como crédito do cliente. Não mexe no resultado agora: quando ele usar, aplique como desconto no caixa.',
  'Cortesia (item grátis)': 'Item oferecido de graça. Informe o valor do que foi oferecido; entra no DRE como ajuste. Não mexe no caixa.',
  'Desconto retroativo': 'Devolve parte do valor depois da nota emitida. Só para venda já paga. Entra no DRE como ajuste.'
};
let _ajOcupado_ = false;
function ajVendasElegiveis_(){
  const q = (document.getElementById('ajVendaBusca')?.value || '').trim().toLowerCase();
  const fin = ['Entregue','Retirada','Servida'];
  return vendas.filter(v=>v.status==='Confirmada' && (!v.statusPedido || fin.indexOf(v.statusPedido)!==-1))
    .filter(v=>!q || String(v.numero||'').indexOf(q)!==-1 || String(v.clienteNome||'').toLowerCase().indexOf(q)!==-1 || String(v.clienteTelefone||'').indexOf(q)!==-1)
    .sort((a,b)=>b.timestamp-a.timestamp).slice(0,60);
}
function ajRenderVendas(){
  const sel = document.getElementById('ajVenda'); if(!sel) return;
  const atual = sel.value;
  const lista = ajVendasElegiveis_();
  sel.innerHTML = lista.length ? lista.map(v=>`<option value="${escH(v.id)}">${v.numero?('nº '+escH(v.numero)+' · '):''}${escH(String(v.data||'').slice(0,10))} · ${escH(v.clienteNome||'Sem nome')} · ${formatarMoeda(v.valorTotal)}${v.statusPagamento!=='Pago'?' (a receber)':''}</option>`).join('') : '<option value="">Nenhuma venda encontrada</option>';
  if(atual && lista.some(v=>v.id===atual)) sel.value = atual;
  ajAtualizarForm();
}
function ajAtualizarForm(){
  const tipo = document.getElementById('ajTipo'); if(!tipo) return;
  document.getElementById('ajTipoAjuda').textContent = AJ_AJUDA_[tipo.value] || '';
  document.getElementById('ajSaidaBox').style.display = AJ_TIPOS_COM_SAIDA_.indexOf(tipo.value)!==-1 ? 'block' : 'none';
}
function renderAjustes(){
  const tb = document.getElementById('ajLista'); if(!tb) return;
  ajRenderVendas();
  try{ rbCarregar(); }catch(e){}
  const lista = (ajustesPosVenda||[]).slice().sort((a,b)=>b.timestamp-a.timestamp).slice(0,25);
  tb.innerHTML = lista.length ? lista.map(a=>`<tr class="${a.status==='Cancelado'?'cancelada':''}">
    <td>${escH(a.tipo)}<span class="obs-line">${escH(a.data)} · pedido ${a.numero?('nº '+escH(a.numero)):escH(String(a.vendaId).slice(-8))} · ${escH(a.clienteNome||'')} · ${escH(a.motivo)}${a.detalhe?' — '+escH(a.detalhe):''} · ${escH(a.saida)}</span></td>
    <td>${formatarMoeda(a.valor)}</td>
    <td>${a.status==='Ativo' ? `<button class="ghost" onclick="cancelarAjusteUI('${a.id}')">cancelar</button>` : `<span class="obs-line">cancelado${a.motivoCancelamento?': '+escH(a.motivoCancelamento):''}</span>`}</td></tr>`).join('')
    : '<tr class="empty-row"><td colspan="3">Nenhum ajuste registrado ainda.</td></tr>';
}
async function registrarAjusteUI(){
  if(_ajOcupado_) return;
  const vendaId = document.getElementById('ajVenda').value;
  const tipo = document.getElementById('ajTipo').value;
  const valor = Number(document.getElementById('ajValor').value);
  const motivo = document.getElementById('ajMotivo').value;
  const detalhe = document.getElementById('ajDetalhe').value.trim();
  const saida = document.getElementById('ajSaida').value;
  if(!vendaId){ showMsg('ajMsg','Escolha a venda.','warn'); return; }
  if(!(valor>0)){ showMsg('ajMsg','Informe um valor maior que zero.','warn'); return; }
  if(motivo==='Outro' && !detalhe){ showMsg('ajMsg','Descreva o motivo no campo Detalhe.','warn'); return; }
  const v = vendas.find(x=>x.id===vendaId);
  if(v && valor > Number(v.valorTotal) + 0.001){ showMsg('ajMsg','O ajuste não pode ser maior que o valor da venda ('+formatarMoeda(v.valorTotal)+').','warn'); return; }
  if(!await confirmarTxt_('Registrar '+tipo+' de '+formatarMoeda(valor)+'?'+(AJ_TIPOS_COM_SAIDA_.indexOf(tipo)!==-1?'\n\nSaída: '+saida+'.':''))) return;
  const senhaAdminConfirmacao = await pedirSenha_(); if(!senhaAdminConfirmacao){ showMsg('ajMsg','Ajuste não registrado: a senha é pedida sempre.','warn'); return; }
  _ajOcupado_ = true; const btn = document.getElementById('ajBtn'); btn.disabled = true;
  try{
    const r = await apiCall('registrarAjustePosVenda', { vendaId, tipo, valor, motivo, detalhe, saida, senhaAdminConfirmacao });
    if(r && r.ok){
      ajustesPosVenda = r.ajustesPosVenda || ajustesPosVenda; despesas = r.despesas || despesas; salvarCache();
      document.getElementById('ajValor').value = ''; document.getElementById('ajDetalhe').value = '';
      renderAjustes(); renderDespesas(); renderContasPagar(); atualizarResumoHoje(); renderStatusCaixa(); if(((document.querySelector('section.tab.active')||{}).id||'')==='tab-relatorios') gerarRelatorio();
      showMsg('ajMsg', r.message, 'ok');
    } else showMsg('ajMsg', (r && r.message) || 'Não foi possível registrar o ajuste.', 'warn');
  } catch(e){ showMsg('ajMsg','Sem conexão com o servidor. Confira se o ajuste entrou antes de tentar de novo.','warn'); }
  finally{ _ajOcupado_ = false; btn.disabled = false; }
}
async function cancelarAjusteUI(id){
  const f = await vsForm({ titulo:'Cancelar ajuste', ok:'Cancelar ajuste', perigo:true,
    campos:[ { id:'motivo', rotulo:'Motivo do cancelamento', tipo:'texto', obrigatorio:true, sugestoes:['Lançado errado','Lançado em dobro'] } ] });
  if(!f) return; const motivo = f.motivo;
  const senhaAdminConfirmacao = await pedirSenha_(); if(!senhaAdminConfirmacao) return;
  try{
    const r = await apiCall('cancelarAjustePosVenda', { id, motivo, senhaAdminConfirmacao });
    if(r && r.ok){ ajustesPosVenda = r.ajustesPosVenda || ajustesPosVenda; despesas = r.despesas || despesas; salvarCache(); renderAjustes(); renderDespesas(); atualizarResumoHoje(); renderStatusCaixa(); if(((document.querySelector('section.tab.active')||{}).id||'')==='tab-relatorios') gerarRelatorio(); showMsg('ajMsg', r.message, 'ok'); }
    else showMsg('ajMsg', (r && r.message) || 'Não foi possível cancelar.', 'warn');
  } catch(e){ showMsg('ajMsg','Sem conexão com o servidor.','warn'); }
}

/* ---------- REEMBOLSOS DE VENDAS CANCELADAS ----------
   O banco cria o reembolso sozinho quando uma venda JÁ PAGA é cancelada. Aqui só se lista e se dá baixa (Admin). */
let _rbItens_ = [], _rbUltima_ = 0, _rbOcupado_ = false;
async function rbCarregar(forcar){
  if(!document.getElementById('rbLista')) return;
  if(!forcar && Date.now() - _rbUltima_ < 15000) return;
  _rbUltima_ = Date.now();
  try{
    const r = await apiCall('listarReembolsos', {});
    if(r && r.ok){ _rbItens_ = r.itens || []; rbRender(); }
  }catch(e){ /* sem conexão: mantém o que já estava na tela */ }
}
function rbRender(){
  const tb = document.getElementById('rbLista'); if(!tb) return;
  const pend = _rbItens_.filter(x=>x.status==='Pendente');
  document.getElementById('rbPendenteTotal').textContent = formatarMoeda(pend.reduce((s,x)=>s+Number(x.valor||0),0));
  document.getElementById('rbPendenteQtd').textContent = String(pend.length);
  const admin = currentUser && currentUser.nivel === 'Admin';
  tb.innerHTML = _rbItens_.length ? _rbItens_.slice(0,40).map(x=>`<tr class="${x.status==='Devolvido'?'cancelada':''}">
    <td>Pedido ${x.numero?('nº '+escH(x.numero)):''} · ${escH(x.cliente||'Sem nome')}<span class="obs-line">${escH(String(x.criadoEm||'').slice(0,10).split('-').reverse().join('/'))} · pago em ${escH(x.forma||'—')} · ${escH(x.motivo||'sem motivo')}${x.observacao?' — '+escH(x.observacao):''}</span></td>
    <td>${formatarMoeda(x.valor)}</td>
    <td>${x.status==='Pendente' ? (admin ? `<button class="ghost" onclick="confirmarReembolsoUI('${escH(x.id)}')">marcar devolvido</button>` : '<span class="obs-line">pendente</span>') : '<span class="obs-line">devolvido</span>'}</td></tr>`).join('')
    : '<tr class="empty-row"><td colspan="3">Nenhum reembolso registrado.</td></tr>';
}
async function confirmarReembolsoUI(id){
  if(_rbOcupado_) return;
  const x = _rbItens_.find(i=>i.id===id); if(!x) return;
  const f = await vsForm({ titulo:'Devolução ao cliente', texto:x.pagamentoOnlineId ? ('Solicitar ao Mercado Pago a devolução de ' + formatarMoeda(x.valor) + '. A lista só será baixada quando o servidor confirmar o reembolso.') : ('Marcar que ' + formatarMoeda(x.valor) + ' foi devolvido ao cliente.'), ok:x.pagamentoOnlineId ? 'Solicitar reembolso' : 'Marcar devolvido',
    campos:[ { id:'obs', rotulo:x.pagamentoOnlineId ? 'Observação (opcional)' : 'Como foi devolvido (opcional)', tipo:'texto', sugestoes:['Pix','Dinheiro','Estorno no cartão'] } ] });
  if(!f) return; const obs = f.obs;
  _rbOcupado_ = true;
  try{
    let r;
    if(x.pagamentoOnlineId){
      r = await sb410Edge_('mp-reembolsar', { pagamentoId:x.pagamentoOnlineId });
      if(r && r.ok){ showMsg('rbMsg', r.message || 'Reembolso confirmado pelo Mercado Pago.', 'ok'); await rbCarregar(true); }
      else showMsg('rbMsg', (r && r.message) || 'Não foi possível confirmar a devolução. Confira o painel do Mercado Pago antes de repetir.', 'warn');
    }else{
      r = await apiCall('confirmarReembolso', { id, observacao: obs });
      if(r && r.ok){ showMsg('rbMsg', r.message || 'Devolução registrada.', 'ok'); await rbCarregar(true); }
      else showMsg('rbMsg', (r && r.message) || 'Não foi possível registrar.', 'warn');
    }
  }catch(e){ showMsg('rbMsg','Sem conexão com o servidor. Confira se a devolução foi registrada antes de tentar de novo.','warn'); }
  finally{ _rbOcupado_ = false; }
}

/* ---------- CANCELAMENTO ---------- */
let mercadoriaPerdidaAtual = null;
function setMercadoriaPerdida(valor){
  mercadoriaPerdidaAtual = valor;
  document.getElementById('cancelPerdidaSimBtn').classList.toggle('active', valor===true);
  document.getElementById('cancelPerdidaNaoBtn').classList.toggle('active', valor===false);
}
function onMudarMotivoCancelamento(){
  const ehOutro = document.getElementById('cancelMotivoSelect').value === 'Outro';
  document.getElementById('cancelMotivoOutroBox').style.display = ehOutro ? 'block' : 'none';
}
function abrirModalCancelar(tipo, id){
  cancelarContexto = { tipo, id };
  document.getElementById('cancelMotivoSelect').value = 'Cliente desistiu';
  document.getElementById('cancelMotivoOutro').value='';
  document.getElementById('cancelMotivoOutroBox').style.display = 'none';
  document.getElementById('cancelSenhaAdmin').value='';
  document.getElementById('cancelSenhaAdminBox').style.display = 'block';   /* senha sempre, também para o Admin */
  const box = document.getElementById('cancelMercadoriaBox');
  if(tipo==='venda'){
    const v = vendas.find(x=>x.id===id);
    const jaEstavaPronta = v && v.statusPedido && v.statusPedido!=='Em preparo';
    box.style.display = jaEstavaPronta ? 'block' : 'none';
    setMercadoriaPerdida(jaEstavaPronta ? true : null);
  } else { box.style.display = 'none'; mercadoriaPerdidaAtual = null; }
  document.getElementById('cancelModal').classList.add('open');
}
function fecharModalCancelar(){ document.getElementById('cancelModal').classList.remove('open'); }
async function confirmarCancelamento(){
  const motivoSelecionado = document.getElementById('cancelMotivoSelect').value;
  const motivoOutro = document.getElementById('cancelMotivoOutro').value.trim();
  if(motivoSelecionado==='Outro' && !motivoOutro){ showMsg('cancelMsg','Descreva o motivo do cancelamento.','warn'); return; }
  const motivo = motivoSelecionado==='Outro' ? motivoOutro : motivoSelecionado;
  const senhaAdminConfirmacao = document.getElementById('cancelSenhaAdmin').value;
  if(!senhaAdminConfirmacao){ showMsg('cancelMsg','Digite a sua senha para confirmar o cancelamento.','warn'); return; }
  if(document.getElementById('cancelMercadoriaBox').style.display==='block' && mercadoriaPerdidaAtual===null){ showMsg('cancelMsg','Informe se a mercadoria foi perdida.','warn'); return; }
  if(!iniciarOperacaoUnica('cancelamento')) return;
  try{
    if(cancelarContexto.tipo === 'venda'){
      const r = await apiCall('cancelarVenda', { id: cancelarContexto.id, motivo, senhaAdminConfirmacao, mercadoriaPerdida: mercadoriaPerdidaAtual });
      if(!r.ok){ showMsg('cancelMsg', r.message, 'warn'); return; }
      vendas = r.vendas || vendas; if(r.estoque) estoque = r.estoque;
      renderVendas(); renderEstoque(); renderMovimentacoesEstoque(); renderPedidos(); renderEntregas(); renderStatusCaixa();
    }
    else { const r = await apiCall('cancelarDespesa', { id: cancelarContexto.id, motivo, senhaAdminConfirmacao }); if(!r.ok){ showMsg('cancelMsg', r.message, 'warn'); return; } despesas = r.despesas || despesas; renderDespesas(); }
    salvarCache();
    renderStatusCaixa(); renderNotificacoes();
    fecharModalCancelar();
  } catch(e){ showMsg('cancelMsg','Não foi possível cancelar.','warn'); }
  finally { finalizarOperacaoUnica('cancelamento'); }
}

/* ============================================================
   CALCULADORA
   ============================================================ */
