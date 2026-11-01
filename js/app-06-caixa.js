/* ---------- PAINÉIS DO CAIXA (sem rolar a tela: Cliente → Itens → Pagamento) ----------
   Celular e telas estreitas: um passo por vez (como sempre foi).
   Computador largo (>= 1280 px, Fase 3 do Plano PC): os 3 passos aparecem juntos, lado a lado (body.cx-tudo).
   Mesa e Garçom continuam sem o passo de pagamento (o CSS de modo-mesa/perfil-garcom já o esconde). */
let painelCaixaAtual = 'cliente';
const _mqCaixaTudo = (window.matchMedia ? window.matchMedia('(min-width:1280px)') : null);
function caixaTudoJunto_(){ return !!(_mqCaixaTudo && _mqCaixaTudo.matches); }
function aplicarPainelCaixa_(painel){
  painelCaixaAtual = painel;
  const tudo = caixaTudoJunto_();
  document.body.classList.toggle('cx-tudo', tudo);
  ['cliente','forma','itens','finalizar'].forEach(p=>{
    const id = 'painel'+p.charAt(0).toUpperCase()+p.slice(1);
    const el = document.getElementById(id), btn = document.getElementById(id+'Btn');
    if(el) el.style.display = (p===painel || (tudo && p!=='forma')) ? 'block' : 'none';
    if(btn) btn.classList.toggle('active', p===painel);
  });
  if(painel==='itens' || tudo) atualizarGarcomMesaInfo();
}
function mudarPainelCaixa(painel){ aplicarPainelCaixa_(painel); }
/* a janela mudou de tamanho (ou o monitor): reaplica o modo certo sem mexer no passo atual */
(function(){
  const r = function(){ try{ aplicarPainelCaixa_(painelCaixaAtual); }catch(e){} };
  if(_mqCaixaTudo){
    if(_mqCaixaTudo.addEventListener) _mqCaixaTudo.addEventListener('change', r);
    else if(_mqCaixaTudo.addListener) _mqCaixaTudo.addListener(r);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', r); else r();
})();
function atualizarContagemPainelItens(){
  const el = document.getElementById('painelItensContagem');
  if(el) el.textContent = carrinhoAtual.length ? '('+carrinhoAtual.length+')' : '';
}
let tipoDescontoAtual = 'percentual';
function setTipoDesconto(tipo){
  tipoDescontoAtual = tipo;
  document.getElementById('descTipoPercentualBtn').classList.toggle('active', tipo==='percentual');
  document.getElementById('descTipoFixoBtn').classList.toggle('active', tipo==='fixo');
  atualizarPreviewDesconto();
}
function valorDescontoAtualNumero(){ const el = document.getElementById('descValor'); return el ? (Number(el.value) || 0) : 0; }
/* Itens marcados como "preço promocional" no cadastro não aceitam desconto: ele vale só sobre o resto do carrinho (o servidor confere de novo). */
function itemSemDesconto_(it){ const l = it && it.comboId ? combos : produtos; const id = it && (it.comboId || it.produtoId); const x = (l||[]).find(y=>y.id===id); return !!(x && x.semDesconto); }
function baseDescontoCaixa_(){ return Math.round(carrinhoAtual.reduce((s,it)=>s+(itemSemDesconto_(it) ? 0 : it.quantidade*it.valorUnitario),0)*100)/100; }
function valorDescontoCalculado(){
  const bruto = baseDescontoCaixa_();
  const v = valorDescontoAtualNumero();
  if(v<=0) return 0;
  return tipoDescontoAtual==='percentual' ? Math.round(bruto*(v/100)*100)/100 : Math.round(v*100)/100;
}
/* Taxa de entrega desta venda: só existe quando o tipo é Entrega. Campo vazio = taxa padrão cadastrada; campo preenchido (0 a 500) = valor digitado.
   Mesma regra do servidor (valor fora de 0–500 ou inválido volta para a padrão), para o total da tela bater com o total gravado. */
function taxaEntregaVenda(){
  if(tipoEntregaAtual!=='Entrega') return 0;
  const padrao = Math.round((Number(configEntrega && configEntrega.taxaPadrao)||0)*100)/100;
  const el = document.getElementById('vTaxaEntrega');
  const txt = el ? String(el.value||'').trim().replace(',','.') : '';
  if(txt==='') return padrao;
  const n = Number(txt);
  return (isFinite(n) && n>=0 && n<=500) ? Math.round(n*100)/100 : padrao;
}
/* ---------- ACRÉSCIMO DA FORMA DE PAGAMENTO ----------
   Os valores de cada pagamento são a PARTE DO PEDIDO paga naquela forma (sem acréscimo); o servidor soma o acréscimo da forma.
   Aqui o acréscimo só é calculado para mostrar ao operador quanto cobrar. */
/* O % do acréscimo não incide sobre a taxa de entrega: 'fator' = parte do valor que NÃO é taxa de entrega (1 = sem taxa). */
function fatorBaseAcrescimo_(){
  const t = taxaEntregaVenda(); if(!(t>0)) return 1;
  const tot = totalComDesconto(); return tot>0 ? Math.max(0, (tot-t)/tot) : 1;
}
function acrescimoForma_(nome, valor, fator){
  const v = Number(valor)||0; if(v<=0) return 0;
  const f = (formasPagamento||[]).find(x=>x.nome===nome); if(!f) return 0;
  if(fator===undefined) fator = fatorBaseAcrescimo_();
  return Math.round((v*fator*(f.acrescimoPct||0)/100 + (f.acrescimoFixo||0))*100)/100;
}
function acrescimoTotalVenda_(){
  if(tipoEntregaAtual==='Mesa' && !mesaPagaAgora_()) return 0;
  return Math.round(pagamentosAtuais.reduce((s,p)=>s+acrescimoForma_(p.forma, p.valor),0)*100)/100;
}
function totalComDesconto(){
  const bruto = totalCarrinho();
  const desc = valorDescontoCalculado();
  const total = bruto - desc;
  const base = total>0 ? Math.round(total*100)/100 : bruto;
  return Math.round((base + taxaEntregaVenda())*100)/100;
}
function atualizarPreviewDesconto(){
  const bruto = totalCarrinho();
  const desc = valorDescontoCalculado();
  const total = totalComDesconto();
  document.getElementById('descSubtotal').textContent = formatarMoeda(bruto);
  document.getElementById('descValorCalc').textContent = formatarMoeda(desc);
  const taxaPrev = taxaEntregaVenda(), elTaxaPrev = document.getElementById('descTaxaLinha');
  if(elTaxaPrev){ elTaxaPrev.style.display = taxaPrev>0 ? '' : 'none'; document.getElementById('descTaxa').textContent = formatarMoeda(taxaPrev); }
  document.getElementById('descTotalFinal').textContent = formatarMoeda(total);
  const msgEl = document.getElementById('descMsg');
  const elig = baseDescontoCaixa_(), vSol = valorDescontoAtualNumero();
  let avisoSd = '';
  if(vSol>0 && elig<=0) avisoSd = '<span class="warn">Os itens do carrinho têm preço promocional e não aceitam desconto.</span>';
  else if(vSol>0 && tipoDescontoAtual==='fixo' && vSol>elig+0.005) avisoSd = '<span class="warn">O desconto fixo não pode passar de ' + formatarMoeda(elig) + ' (só vale para itens sem preço promocional).</span>';
  else if(vSol>0 && elig<bruto-0.005) avisoSd = '<span class="sub">🏷️ O desconto vale só para os itens sem preço promocional (' + formatarMoeda(elig) + ').</span>';
  msgEl.innerHTML = (desc>0 && desc>=bruto) ? '<span class="warn">O desconto não pode zerar ou deixar negativo o total.</span>' : avisoSd;
  renderPagamentos();
}
/* no Caixa, pedido de mesa de Admin/Operador pode ficar na conta ("sair") ou ser pago na hora ("agora"). O Garçom é sempre "sair". */
let mesaModoPagamento = 'sair';
function setMesaModoPagamento(modo){
  mesaModoPagamento = (modo==='agora') ? 'agora' : 'sair';
  const a = document.getElementById('mesaPagarSairBtn'), b = document.getElementById('mesaPagarAgoraBtn');
  if(a) a.classList.toggle('active', mesaModoPagamento==='sair');
  if(b) b.classList.toggle('active', mesaModoPagamento==='agora');
}
function mesaPagaAgora_(){ return tipoEntregaAtual==='Mesa' && !souGarcom_() && mesaModoPagamento==='agora'; }
let statusPagamentoAtual = 'Pago';
function setStatusPagamento(status){
  statusPagamentoAtual = status;
  document.getElementById('statusPagoBtn').classList.toggle('active', status==='Pago');
  document.getElementById('statusAReceberBtn').classList.toggle('active', status==='A Receber');
}
function setModoCliente(modo){
  modoCliente = modo;
  document.getElementById('modoClienteBtn').classList.toggle('active', modo==='com');
  document.getElementById('modoSemClienteBtn').classList.toggle('active', modo==='sem');
  document.getElementById('vendaClienteBox').style.display = modo==='com' ? 'block' : 'none';
  if(modo==='sem') limparClienteVenda();
}
function setModoItem(modo){
  modoItem = modo;
  document.getElementById('modoItemProdutoBtn').classList.toggle('active', modo==='produto');
  document.getElementById('modoItemComboBtn').classList.toggle('active', modo==='combo');
  document.getElementById('modoItemManualBtn').classList.toggle('active', modo==='manual');
  document.getElementById('itemProdutoBox').style.display = modo==='produto' ? 'block' : 'none';
  document.getElementById('itemComboBox').style.display = modo==='combo' ? 'block' : 'none';
  document.getElementById('itemManualBox').style.display = modo==='manual' ? 'block' : 'none';
}
function formaPrecoSelect_(){ return document.getElementById('formaPrecoSelect'); }
function popularSelectFormaPreco(){
  const sel = formaPrecoSelect_();
  if(!sel) return;
  const ativas = formasPagamento.filter(f=>f.ativa);
  sel.innerHTML = ativas.map(f=>`<option value="${f.id}" ${f.id===formaPrecoAtual?'selected':''}>${escH(f.nome)}</option>`).join('');
  if(ativas.length && !ativas.find(f=>f.id===formaPrecoAtual)) formaPrecoAtual = ativas[0].id;
}
function mudarFormaPreco(formaId){
  formaPrecoAtual = formaId;
  popularSelectProdutos(); popularSelectCombos();
  garantirPagamentoInicial();
  pagamentosAtuais[0].forma = nomeFormaAtual();
  if(pagamentoDividido){
    if(document.getElementById('formaSecundariaSelect')) popularSelectFormaSecundaria();
    recalcularCarrinhoPorFormasSelecionadas();
  } else {
    // Itens podem ter sido adicionados com a forma padrão antes do usuário escolher a forma de verdade — reprecifica.
    carrinhoAtual.forEach(item=>{
      const extraAdicionais = (item.adicionaisIds||[]).reduce((s,id)=>{ const a = adicionais.find(x=>x.id===id); return s + (a?a.preco:0); },0);
      if(item.produtoId){ const p = precoProdutoPorForma(item.produtoId, formaId); item.valorUnitario = p.preco + extraAdicionais; item.custoUnitario = p.custo; }
      else if(item.comboId){ const p = precoComboPorForma(item.comboId, formaId); item.valorUnitario = p.preco + extraAdicionais; item.custoUnitario = custoComboComEscolha_(item.comboId, item.escolhas, p.custo); }
    });
    renderCarrinho();
  }
  renderPagamentos();
}
/* Preço único: a forma escolhida NÃO muda o preço do item (muda só o acréscimo da forma). */
function precoProprioDe_(lista, chave, id, formaId){
  const f = (formasPagamento||[]).find(x=>x.id===formaId);
  if(!f || !f.precoProprio) return null;
  const r = (lista||[]).find(x=>x[chave]===id && x.formaPagamentoId===formaId);
  return r ? { preco: Number(r.preco)||0, custo: Number(r.custo)||0 } : null;
}
function precoProdutoPorForma(produtoId, formaId){ return precoProprioDe_(produtoPrecos, 'produtoId', produtoId, formaId) || precoDisplayProduto(produtoId); }
function precoComboPorForma(comboId, formaId){ return precoProprioDe_(comboPrecos, 'comboId', comboId, formaId) || precoDisplayCombo(comboId); }
function buscarClienteVenda(){
  const termo = document.getElementById('vClienteBusca').value.toLowerCase();
  const box = document.getElementById('vClienteResultados');
  if(!termo){ box.innerHTML=''; return; }
  const achados = clientes.filter(c=>clienteCombinaBusca_(c, termo)).slice(0,5);
  box.innerHTML = achados.map(c=>`<div class="ghost" style="padding:8px;margin-bottom:4px;cursor:pointer;border-radius:4px;" data-cliente-nome="${escH(c.nome)}" data-cliente-tel="${escH(c.telefone)}">${escH(c.nome)} — ${escH(c.telefone)}</div>`).join('') || '<div class="notif-empty">Nenhum cliente encontrado.</div>';
}
function selecionarClienteVenda(nome, telefone){
  clienteVendaSelecionado = {nome, telefone};
  document.getElementById('vClienteNomeSel').textContent = nome;
  document.getElementById('vClienteTelSel').textContent = telefone;
  document.getElementById('vClienteSelecionado').style.display = 'block';
  document.getElementById('vClienteBusca').value = '';
  document.getElementById('vClienteResultados').innerHTML = '';
  if(tipoEntregaAtual==='Entrega'){
    const cad = clientes.find(c=>normTel(c.telefone)===normTel(telefone));
    if(cad && cad.endereco) document.getElementById('vEndereco').value = cad.endereco;
  }
}
function limparClienteVenda(){ clienteVendaSelecionado = null; clienteMesaCarregadoDe_ = null; document.getElementById('vClienteSelecionado').style.display = 'none'; }
function setTipoEntrega(tipo){
  tipoEntregaAtual = tipo;
  document.body.classList.toggle('modo-mesa', tipo==='Mesa');
  if(tipo!=='Mesa' && clienteMesaCarregadoDe_) limparClienteVenda(); // cliente da mesa não vai parar numa venda de balcão/entrega
  if(tipo==='Mesa' && (painelCaixaAtual==='forma' || painelCaixaAtual==='finalizar')) mudarPainelCaixa('itens');
  document.getElementById('tipoRetiradaBtn').classList.toggle('active', tipo==='Retirada');
  document.getElementById('tipoEntregaBtn').classList.toggle('active', tipo==='Entrega');
  document.getElementById('tipoMesaBtn').classList.toggle('active', tipo==='Mesa');
  document.getElementById('enderecoEntregaBox').style.display = tipo==='Entrega' ? 'block' : 'none';
  document.getElementById('mesaEscolhaBox').style.display = tipo==='Mesa' ? 'block' : 'none';
  document.getElementById('vTaxaEntrega').placeholder = 'Padrão: ' + formatarMoeda(configEntrega.taxaPadrao);
  try{ atualizarPreviewDesconto(); }catch(e){} // o total a pagar passa a incluir (ou deixa de incluir) a taxa de entrega
  if(tipo==='Entrega' && clienteVendaSelecionado){
    const cad = clientes.find(c=>normTel(c.telefone)===normTel(clienteVendaSelecionado.telefone));
    if(cad && cad.endereco && !document.getElementById('vEndereco').value) document.getElementById('vEndereco').value = cad.endereco;
  }
  if(tipo==='Mesa') setMesaModoPagamento('sair'); // pagamento só no fechamento da conta
  if(souGarcom_()){
    const gfb = document.getElementById('garcomFormaBox');
    if(gfb){ gfb.style.display = tipo!=='Mesa' ? 'block' : 'none'; if(tipo!=='Mesa') popularFormaGarcom_(); }
    const be = document.getElementById('btnEnviarCozinha');
    if(be) be.textContent = tipo==='Mesa' ? '🍳 Lançar na mesa (enviar à cozinha)' : '🍳 Enviar pedido à cozinha';
    if(tipo!=='Mesa' && modoCliente!=='com') setModoCliente('com');
  }
}
function popularFormaGarcom_(){
  const sel = document.getElementById('garcomFormaPag'); if(!sel) return;
  const atual = sel.value;
  sel.innerHTML = (formasPagamento||[]).filter(f=>f.ativa).map(f=>`<option value="${escH(f.nome)}">${escH(f.nome)}</option>`).join('');
  if(atual) sel.value = atual;
}
/* ---------- MESA NO CAIXA (ITEM 55, 56) ---------- */
function renderMesasPickerCaixa(){
  const sel = document.getElementById('vMesaSelect');
  if(!sel) return;
  const anterior = sel.value;
  const aceitos = souGarcom_() ? ['Livre','Ocupada'] : ['Livre','Ocupada','Aguardando fechamento'];
  const disponiveis = mesas.filter(m=>aceitos.indexOf(m.status)!==-1);
  const rotulo = m => m.status==='Ocupada' ? ' (ocupada)' : (m.status==='Aguardando fechamento' ? ' (aguardando fechamento)' : '');
  sel.innerHTML = disponiveis.length ? disponiveis.map(m=>`<option value="${m.id}">Mesa ${m.numero}${rotulo(m)}</option>`).join('') : '<option value="">Nenhuma mesa disponível — cadastre em Administrador → Mesas</option>';
  if(anterior && disponiveis.some(m=>m.id===anterior)) sel.value = anterior;
  atualizarGarcomMesaInfo();
}
let fcmTotal = 0, fcmMesaId = '', fcmOcupado = false;
function fcmOpcoesForma_(excluirId){
  return formasPagamento.filter(f=>f.ativa && f.id!==excluirId).map(f=>`<option value="${f.id}">${escH(f.nome)}</option>`).join('');
}
async function fecharContaMesaUI(mesaIdParam, msgIdParam){
  const msgId = msgIdParam || 'vMsg';
  const mesaId = mesaIdParam || document.getElementById('vMesaSelect').value;
  if(!mesaId){ showMsg(msgId,'Escolha a mesa primeiro.','warn'); return; }
  const mesa = mesas.find(m=>m.id===mesaId);
  const vendasDaMesa = vendas.filter(v=>v.mesaId===mesaId && v.status==='Confirmada' && v.statusPagamento==='A Receber');
  if(!vendasDaMesa.length){ if(await confirmarTxt_('Essa mesa não tem conta pendente. Liberar a mesa mesmo assim?', 'Liberar mesa', false, 'Mesa sem conta')){ liberarMesaSemConta_(mesaId, msgId); } return; }
  if(!sessaoCaixa){ showMsg(msgId, souGarcom_() ? 'O caixa está fechado — peça ao caixa para abrir.' : 'Abra o caixa antes de fechar a conta da mesa.','warn'); return; }
  if(!formasPagamento.some(f=>f.ativa)){ showMsg(msgId,'Não há forma de pagamento ativa. Cadastre uma em Administrador → Vendas e cardápio → Formas de pagamento.','warn'); return; }
  fcmMesaId = mesaId;
  fcmTotal = Math.round(vendasDaMesa.reduce((s,v)=>s+v.valorTotal,0)*100)/100;
  document.getElementById('fcmTitulo').textContent = 'Fechar conta — Mesa '+(mesa?mesa.numero:'');
  document.getElementById('fcmTotal').textContent = formatarMoeda(fcmTotal);
  document.getElementById('fcmForma1').innerHTML = fcmOpcoesForma_('');
  document.getElementById('fcmDividir').checked = false;
  document.getElementById('fcmDivisao').style.display = 'none';
  document.getElementById('fcmMsg').textContent = '';
  document.getElementById('fcmBtn').disabled = false; fcmOcupado = false;
  fcmAtualizarAcrescimo_();
  document.getElementById('fcmModal').classList.add('open');
}
/* liberar mesa sem conta passa pelo servidor (fecharContaMesa com lista vazia), porque o garçom não pode usar editarStatusMesa('Livre'). */
async function liberarMesaSemConta_(mesaId, msgId){
  try{
    const r = await apiCall('fecharContaMesa', { mesaId, pagamentos: [] });
    if(r && r.ok){ vendas = r.vendas||vendas; mesas = r.mesas||mesas; salvarCache(); renderMesasPickerCaixa(); renderMesas(); renderMesasPopup_(); atualizarAlertaMesas_(); showMsg(msgId, r.message, 'ok'); }
    else showMsg(msgId, (r && r.message) || 'Não foi possível liberar a mesa.', 'warn');
  }catch(e){ showMsg(msgId,'Sem conexão — a mesa não foi liberada.','warn'); }
}
function fecharModalFecharConta(){ document.getElementById('fcmModal').classList.remove('open'); }
function fcmAlternarDivisao(){
  const dividir = document.getElementById('fcmDividir').checked;
  document.getElementById('fcmDivisao').style.display = dividir ? '' : 'none';
  if(dividir){ fcmAtualizarForma2(); document.getElementById('fcmValor1').value = (fcmTotal/2).toFixed(2); fcmAtualizarRestante(); }
  fcmAtualizarAcrescimo_();
}
function fcmAtualizarForma2(){
  const id1 = document.getElementById('fcmForma1').value;
  const sel2 = document.getElementById('fcmForma2');
  const atual = sel2.value;
  sel2.innerHTML = fcmOpcoesForma_(id1);
  if(atual && Array.from(sel2.options).some(o=>o.value===atual)) sel2.value = atual;
}
function fcmAoMudarForma1(){ if(document.getElementById('fcmDividir').checked) fcmAtualizarForma2(); fcmAtualizarAcrescimo_(); }
function fcmAtualizarRestante(){
  const v1 = Number(document.getElementById('fcmValor1').value)||0;
  const resto = Math.round((fcmTotal-v1)*100)/100;
  document.getElementById('fcmRestante').textContent = formatarMoeda(resto>0?resto:0);
  fcmAtualizarAcrescimo_();
}
/* Os valores enviados são a parte da conta paga em cada forma; o servidor soma o acréscimo da forma. Aqui só se mostra quanto cobrar. */
function fcmAtualizarAcrescimo_(){
  const el = document.getElementById('fcmAcrescimo'); if(!el) return;
  const f1 = formasPagamento.find(f=>f.id===document.getElementById('fcmForma1').value);
  if(!f1){ el.style.display = 'none'; return; }
  let acr;
  if(document.getElementById('fcmDividir').checked){
    const f2 = formasPagamento.find(f=>f.id===document.getElementById('fcmForma2').value);
    const v1 = Math.round((Number(document.getElementById('fcmValor1').value)||0)*100)/100;
    const v2 = Math.round((fcmTotal-v1)*100)/100;
    acr = acrescimoForma_(f1.nome, v1, 1) + (f2 ? acrescimoForma_(f2.nome, v2, 1) : 0);
  } else acr = acrescimoForma_(f1.nome, fcmTotal, 1);
  acr = Math.round(acr*100)/100;
  if(acr>0){ el.style.display = 'block'; el.innerHTML = '⚠️ Acréscimo da forma de pagamento: <b>+'+formatarMoeda(acr)+'</b> — <b>total a cobrar: '+formatarMoeda(Math.round((fcmTotal+acr)*100)/100)+'</b>'; }
  else el.style.display = 'none';
}
async function confirmarFecharConta(){
  if(fcmOcupado) return;
  const msg = document.getElementById('fcmMsg');
  const f1 = formasPagamento.find(f=>f.id===document.getElementById('fcmForma1').value);
  if(!f1){ msg.textContent = 'Escolha a forma de pagamento.'; return; }
  let pagamentos;
  if(document.getElementById('fcmDividir').checked){
    const f2 = formasPagamento.find(f=>f.id===document.getElementById('fcmForma2').value);
    const valor1 = Math.round((Number(document.getElementById('fcmValor1').value)||0)*100)/100;
    const valor2 = Math.round((fcmTotal-valor1)*100)/100;
    if(!f2){ msg.textContent = 'Escolha a segunda forma de pagamento (precisa ser diferente da primeira).'; return; }
    if(valor1<=0 || valor2<=0){ msg.textContent = 'Divisão inválida: cada parte precisa ser maior que zero e a soma igual ao total.'; return; }
    pagamentos = [{forma:f1.nome, valor:valor1}, {forma:f2.nome, valor:valor2}];
  } else {
    pagamentos = [{forma:f1.nome, valor:fcmTotal}];
  }
  fcmOcupado = true; document.getElementById('fcmBtn').disabled = true; msg.textContent = 'Fechando a conta...';
  try{
    const r = await apiCall('fecharContaMesa', { mesaId: fcmMesaId, pagamentos });
    if(r && r.ok){ vendas = r.vendas||vendas; mesas = r.mesas||mesas; salvarCache(); renderMesasPickerCaixa(); renderMesas(); renderVendas(); fecharModalFecharConta(); showMsg('vMsg', r.message, 'ok'); showMsg('mesasMsg', r.message, 'ok'); renderMesasPopup_(); atualizarAlertaMesas_(); }
    else { msg.textContent = (r && r.message) || 'Não foi possível fechar a conta.'; fcmOcupado = false; document.getElementById('fcmBtn').disabled = false; }
  } catch(e){ msg.textContent = 'Não foi possível fechar a conta agora. Confira a conexão e tente de novo.'; fcmOcupado = false; document.getElementById('fcmBtn').disabled = false; }
}
/* Gerador de QR Code próprio (modo byte, correção M, versões 1–10). Sem biblioteca externa. */
const QR_ = (function(){
  const ECC_BLK = [-1,10,16,26,18,24,16,18,22,22,26], NUM_BLK = [-1,1,1,1,2,2,4,4,4,5,5];
  function rawModules(v){ let r=(16*v+128)*v+64; if(v>=2){ const n=Math.floor(v/7)+2; r-=(25*n-10)*n-55; if(v>=7) r-=36; } return r; }
  function dataCw(v){ return Math.floor(rawModules(v)/8) - ECC_BLK[v]*NUM_BLK[v]; }
  function gfMul(x,y){ let z=0; for(let i=7;i>=0;i--){ z=(z<<1)^((z>>>7)*0x11D); z^=((y>>>i)&1)*x; } return z; }
  function rsDiv(deg){ const r=new Array(deg).fill(0); r[deg-1]=1; let root=1; for(let i=0;i<deg;i++){ for(let j=0;j<deg;j++){ r[j]=gfMul(r[j],root); if(j+1<deg) r[j]^=r[j+1]; } root=gfMul(root,2); } return r; }
  function rsRem(data,div){ const r=div.map(()=>0); for(const b of data){ const f=b^r.shift(); r.push(0); div.forEach((c,i)=>{ r[i]^=gfMul(c,f); }); } return r; }
  function bit(x,i){ return ((x>>>i)&1)!==0; }
  function encode(text){
    const bytes = Array.from(new TextEncoder().encode(text));
    let ver=1; for(; ver<=10; ver++){ if(4+(ver<10?8:16)+bytes.length*8 <= dataCw(ver)*8) break; }
    if(ver>10) throw new Error('Texto longo demais para o QR');
    const bits=[]; const put=(v,n)=>{ for(let i=n-1;i>=0;i--) bits.push((v>>>i)&1); };
    put(4,4); put(bytes.length, ver<10?8:16); bytes.forEach(b=>put(b,8));
    const cap=dataCw(ver)*8; put(0,Math.min(4,cap-bits.length)); while(bits.length%8) bits.push(0);
    for(let pad=0xEC; bits.length<cap; pad^=0xEC^0x11) put(pad,8);
    const data=[]; for(let i=0;i<bits.length;i+=8){ let b=0; for(let j=0;j<8;j++) b=(b<<1)|bits[i+j]; data.push(b); }
    // ECC + intercalação
    const nb=NUM_BLK[ver], eb=ECC_BLK[ver], raw=Math.floor(rawModules(ver)/8), shortN=nb-raw%nb, shortLen=Math.floor(raw/nb);
    const div=rsDiv(eb), blocks=[]; for(let i=0,k=0;i<nb;i++){ const len=shortLen-eb+(i<shortN?0:1); const dat=data.slice(k,k+len); k+=len; const ecc=rsRem(dat,div); if(i<shortN) dat.push(0); blocks.push(dat.concat(ecc)); }
    const all=[]; for(let i=0;i<blocks[0].length;i++) blocks.forEach((bl,j)=>{ if(i!==shortLen-eb||j>=shortN) all.push(bl[i]); });
    // matriz
    const size=ver*4+17, mod=[], fn=[]; for(let y=0;y<size;y++){ mod.push(new Array(size).fill(false)); fn.push(new Array(size).fill(false)); }
    const setFn=(x,y,v)=>{ mod[y][x]=v; fn[y][x]=true; };
    for(let i=0;i<size;i++){ setFn(6,i,i%2===0); setFn(i,6,i%2===0); }
    [[3,3],[size-4,3],[3,size-4]].forEach(([cx,cy])=>{ for(let dy=-4;dy<=4;dy++) for(let dx=-4;dx<=4;dx++){ const d=Math.max(Math.abs(dx),Math.abs(dy)), x=cx+dx, y=cy+dy; if(x>=0&&x<size&&y>=0&&y<size) setFn(x,y,d!==2&&d!==4); } });
    if(ver>1){ const n=Math.floor(ver/7)+2, step=Math.ceil((ver*4+4)/(n*2-2))*2, pos=[6]; for(let p=size-7;pos.length<n;p-=step) pos.splice(1,0,p);
      for(let i=0;i<n;i++) for(let j=0;j<n;j++){ if((i===0&&j===0)||(i===0&&j===n-1)||(i===n-1&&j===0)) continue; for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++) setFn(pos[i]+dx,pos[j]+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1); } }
    function formatBits(mask){ const d=(0<<3)|mask; let r=d; for(let i=0;i<10;i++) r=(r<<1)^((r>>>9)*0x537); const b=((d<<10)|r)^0x5412;
      for(let i=0;i<=5;i++) setFn(8,i,bit(b,i)); setFn(8,7,bit(b,6)); setFn(8,8,bit(b,7)); setFn(7,8,bit(b,8)); for(let i=9;i<15;i++) setFn(14-i,8,bit(b,i));
      for(let i=0;i<8;i++) setFn(size-1-i,8,bit(b,i)); for(let i=8;i<15;i++) setFn(8,size-15+i,bit(b,i)); setFn(8,size-8,true); }
    formatBits(0);
    if(ver>=7){ let r=ver; for(let i=0;i<12;i++) r=(r<<1)^((r>>>11)*0x1F25); const b=(ver<<12)|r; for(let i=0;i<18;i++){ const c=bit(b,i), a=size-11+i%3, d=Math.floor(i/3); setFn(a,d,c); setFn(d,a,c); } }
    // dados em zigue-zague
    let k=0; for(let right=size-1;right>=1;right-=2){ if(right===6) right=5; for(let vert=0;vert<size;vert++) for(let j=0;j<2;j++){ const x=right-j, up=((right+1)&2)===0, y=up?size-1-vert:vert; if(!fn[y][x]&&k<all.length*8){ mod[y][x]=bit(all[k>>>3],7-(k&7)); k++; } } }
    const mask=(m)=>{ for(let y=0;y<size;y++) for(let x=0;x<size;x++){ let inv; switch(m){ case 0:inv=(x+y)%2===0;break; case 1:inv=y%2===0;break; case 2:inv=x%3===0;break; case 3:inv=(x+y)%3===0;break; case 4:inv=(Math.floor(x/3)+Math.floor(y/2))%2===0;break; case 5:inv=x*y%2+x*y%3===0;break; case 6:inv=(x*y%2+x*y%3)%2===0;break; default:inv=((x+y)%2+x*y%3)%2===0; } if(!fn[y][x]&&inv) mod[y][x]=!mod[y][x]; } };
    function penalty(){ let s=0; const pat=[1,0,1,1,1,0,1,0,0,0,0], rev=pat.slice().reverse();
      const line=(get)=>{ for(let a=0;a<size;a++){ let run=1; for(let b=1;b<size;b++){ if(get(a,b)===get(a,b-1)){ run++; if(run===5) s+=3; else if(run>5) s++; } else run=1; }
        for(let b=0;b+11<=size;b++){ let m1=true,m2=true; for(let t=0;t<11;t++){ const v=get(a,b+t)?1:0; if(v!==pat[t]) m1=false; if(v!==rev[t]) m2=false; } if(m1||m2) s+=40; } } };
      line((a,b)=>mod[a][b]); line((a,b)=>mod[b][a]);
      for(let y=0;y<size-1;y++) for(let x=0;x<size-1;x++){ const c=mod[y][x]; if(c===mod[y][x+1]&&c===mod[y+1][x]&&c===mod[y+1][x+1]) s+=3; }
      let dark=0; mod.forEach(r=>r.forEach(v=>{ if(v) dark++; })); s+=Math.floor(Math.abs(dark*20-size*size*10)/(size*size))*10; return s; }
    let best=0, bestS=Infinity; for(let m=0;m<8;m++){ mask(m); formatBits(m); const sc=penalty(); if(sc<bestS){ bestS=sc; best=m; } mask(m); }
    mask(best); formatBits(best);
    return mod;
  }
  function svg(text, quiet){ const m=encode(text), q=(quiet==null?4:quiet), n=m.length+q*2; let d='';
    for(let y=0;y<m.length;y++) for(let x=0;x<m.length;x++) if(m[y][x]) d+='M'+(x+q)+','+(y+q)+'h1v1h-1z';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+n+' '+n+'" shape-rendering="crispEdges"><rect width="'+n+'" height="'+n+'" fill="#fff"/><path d="'+d+'" fill="#000"/></svg>'; }
  return { encode, svg };
})();


/* ============================================================
   QR CODE DAS MESAS + CLIENTE PEDE PELA MESA
   O pedido do cliente SEMPRE passa por aceite (Admin/Operador) antes de ir ao preparo.
   ============================================================ */
const QR_BASE_URL_ = (window.RESTAURANTE && window.RESTAURANTE.siteUrl) || (location.origin + location.pathname.replace(/[^/]*$/, ''));
let _qrMesas = [];
function qrLinkMesa_(m){ return QR_BASE_URL_ + '?m=' + encodeURIComponent(m.numero) + '&k=' + encodeURIComponent(m.codigo); }
function qrMesaSelecionada_(){ const id = (document.getElementById('qrMesaSel')||{}).value; return _qrMesas.find(m=>m.id===id) || _qrMesas[0]; }
async function abrirQrMesas(){
  showMsg('qrMsg','','');
  document.getElementById('qrMesasModal').classList.add('open');
  document.getElementById('qrPreview').innerHTML = '<p class="sub" style="color:#333;">Carregando…</p>';
  try{
    const r = await apiCall('getQrMesas', {});
    if(!r.ok){ showMsg('qrMsg', r.message || 'Não foi possível carregar os QR Codes.', 'warn'); return; }
    _qrMesas = r.mesas || [];
    const sel = document.getElementById('qrMesaSel');
    sel.innerHTML = _qrMesas.map(m=>`<option value="${m.id}">Mesa ${escH(m.numero)}</option>`).join('');
    if(!_qrMesas.length){ document.getElementById('qrPreview').innerHTML = '<p class="sub" style="color:#333;">Cadastre as mesas primeiro.</p>'; return; }
    renderQrPreview_();
  }catch(e){ showMsg('qrMsg','Sem conexão — não foi possível carregar.','warn'); }
}
function fecharQrMesas(){ document.getElementById('qrMesasModal').classList.remove('open'); }
function renderQrPreview_(){
  const m = qrMesaSelecionada_(); if(!m) return;
  document.getElementById('qrPreview').innerHTML = QR_.svg(qrLinkMesa_(m), 2);
  document.getElementById('qrLinkTxt').textContent = qrLinkMesa_(m);
}
function placaQrHtml_(m){
  return `<div class="placa">${logoImpUrl_() ? `<img class="logo" src="${logoImpUrl_()}" alt="${NOME_H_()}">` : `<div class="logo" style="font-weight:800;font-size:26px">${NOME_UP_H_()}</div>`}
    <div class="mesa">MESA ${escR(m.numero)}</div>
    <div class="qr">${QR_.svg(qrLinkMesa_(m), 2)}</div>
    <div class="passos"><b>1.</b> Aponte a câmera do celular para o QR Code<br><b>2.</b> Escolha seus itens e envie o pedido<br><b>3.</b> Aguarde a confirmação — o pagamento é feito no caixa</div>
    <div class="peq">Precisando de ajuda, chame o garçom 🙂</div></div>`;
}
function imprimirPlacasQr_(todas){
  const lista = todas ? _qrMesas : [qrMesaSelecionada_()].filter(Boolean);
  if(!lista.length) return;
  const css = '@page{size:A4;margin:10mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#000}.placa{page-break-after:always;border:3px solid #000;border-radius:18px;padding:12mm 10mm;text-align:center;min-height:270mm}.placa:last-child{page-break-after:auto}.logo{width:70mm}.mesa{font-size:44pt;font-weight:900;margin:6mm 0 2mm}.qr{width:110mm;margin:0 auto 6mm}.qr svg{width:100%;height:auto;display:block}.passos{font-size:16pt;line-height:1.7;text-align:left;display:inline-block;margin-top:4mm}.peq{font-size:13pt;margin-top:8mm;color:#444}';
  const ifr = document.createElement('iframe');
  ifr.style.cssText = 'position:fixed;left:-10000px;top:0;border:0;width:794px;height:1200px;';
  document.body.appendChild(ifr);
  const d = ifr.contentWindow.document;
  d.open(); d.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>QR das mesas</title><style>'+css+'</style></head><body>'+lista.map(placaQrHtml_).join('')+'</body></html>'); d.close();
  const imgsQr = Array.from(d.images || []);
  const prontasQr = Promise.all(imgsQr.map(im => im.complete ? null : new Promise(r => { im.onload = im.onerror = r; })));
  Promise.race([prontasQr, new Promise(r => setTimeout(r, 2500))]).then(()=>setTimeout(()=>{ try{ ifr.contentWindow.focus(); ifr.contentWindow.print(); }catch(e){ avisar('Este aparelho não abriu a impressão. Use "Baixar PNG" e imprima a imagem.'); } setTimeout(()=>ifr.remove(), 60000); }, 200));
}
function baixarQrPng_(){
  const m = qrMesaSelecionada_(); if(!m) return;
  const mat = QR_.encode(qrLinkMesa_(m)), q = 4, n = mat.length + q*2, esc = Math.max(4, Math.floor(1000/n)), tam = n*esc;
  const c = document.createElement('canvas'); c.width = c.height = tam;
  const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0,0,tam,tam); x.fillStyle = '#000';
  mat.forEach((lin,y)=>lin.forEach((v,xx)=>{ if(v) x.fillRect((xx+q)*esc,(y+q)*esc,esc,esc); }));
  c.toBlob(b=>{ const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'qr-mesa-'+m.numero+'.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href), 5000); }, 'image/png');
}
async function gerarNovoCodigoQr_(){
  const m = qrMesaSelecionada_(); if(!m) return;
  if(!await confirmarTxt_('Gerar um novo código para a Mesa '+m.numero+'? O QR atual deixa de funcionar e você precisa imprimir o novo.', 'Gerar código', false, 'Novo código da mesa')) return;
  try{
    const r = await apiCall('gerarNovoCodigoMesa', { mesaId: m.id });
    if(r.ok){ _qrMesas = r.mesas || _qrMesas; renderQrPreview_(); showMsg('qrMsg', r.message, 'ok'); } else showMsg('qrMsg', r.message || 'Não foi possível gerar.', 'warn');
  }catch(e){ showMsg('qrMsg','Sem conexão — nada foi alterado.','warn'); }
}

/* ---------- CLIENTE NA MESA (cardápio aberto pelo QR: ?m=NÚMERO&k=CÓDIGO) ---------- */
const mesaQr = (function(){ try{ const q = new URLSearchParams(location.search); const m = q.get('m'), k = q.get('k'); return (m && k) ? { numero: m, codigo: k } : null; }catch(e){ return null; } })();
let mesaQrInfo = null, _modoMesaIniciado = false, _mesaPollId = null, mesaBloqueada_ = false;
function iniciarModoMesa_(){
  if(!mesaQr) return;
  document.getElementById('cdCarrinhoModal').classList.add('modo-mesa');
  document.getElementById('cdMesaPainel').style.display = '';
  atualizarMesaPublica_(true);
  clearInterval(_mesaPollId);
  _mesaPollId = setInterval(()=>{ if(document.visibilityState==='visible' && !document.getElementById('cardapioPublico').classList.contains('hidden')) atualizarMesaPublica_(false); }, 25000);
}
async function atualizarMesaPublica_(primeira){
  if(!mesaQr) return;
  try{
    const r = await apiCall('getMesaPublica', { mesa: mesaQr.numero, codigo: mesaQr.codigo });
    mesaQrInfo = (r && r.ok) ? r : { invalido: true, message: (r && r.message) || 'QR Code inválido. Chame o garçom.' };
  }catch(e){ if(!mesaQrInfo) mesaQrInfo = { semConexao: true }; }
  renderMesaPainel_();
}
function renderMesaPainel_(){
  const box = document.getElementById('cdMesaTopo'); if(!box || !mesaQr) return;
  const info = mesaQrInfo || {};
  const fab = document.getElementById('cdFabCarrinho');
  if(info.invalido){
    mesaBloqueada_ = true; if(fab) fab.style.display = 'none';
    box.innerHTML = `<div class="mesa-titulo"><b>🍽️ Mesa ${escH(mesaQr.numero)}</b></div><p class="sub" style="color:#ff9d92;">${escH(info.message)}</p>`;
    return;
  }
  if(info.semConexao){ box.innerHTML = `<div class="mesa-titulo"><b>🍽️ Mesa ${escH(mesaQr.numero)}</b></div><p class="sub">Sem conexão agora. Tentando de novo…</p>`; return; }
  mesaBloqueada_ = false; if(fab) fab.style.display = '';
  const ped = info.pedidos || [];
  const contaPedida = info.mesa && info.mesa.status === 'Aguardando fechamento';
  const pedHtml = ped.map(v=>`<div class="cd-mesa-ped"><div><b>#${escH(String(v.numero||''))}</b> · ${escH(v.hora)} · <span class="st${v.cancelado?' cancel':''}">${escH(v.status)}</span> · ${formatarMoeda(v.valor)}</div>
      <small>${(v.itens||[]).map(i=>escH(i.quantidade+'x '+i.descricao)).join('<br>')}</small>
      ${v.podeCancelar?`<div class="mt-1"><button class="ghost" style="width:auto;padding:5px 10px;font-size:12px;" onclick="mesaCancelarPedido_('${v.id}')">Cancelar pedido</button></div>`:''}</div>`).join('');
  box.innerHTML = `<div class="mesa-titulo"><b>🍽️ Você está na Mesa ${escH(info.mesa.numero)}</b>${contaPedida?'<span class="mesa-badge b-aguard">Conta pedida</span>':''}</div>
    ${info.caixaAberto===false?'<p class="sub" style="color:#ffcf6b;margin:6px 0 0;">No momento não estamos recebendo pedidos pelo celular. Chame o garçom.</p>':''}
    <div class="mesa-acoes"><button class="ghost" onclick="mesaChamarGarcom_()">🔔 Chamar garçom</button>${contaPedida?'':'<button class="ghost" onclick="mesaPedirConta_()">🧾 Pedir a conta</button>'}</div>
    ${ped.length ? pedHtml+`<div class="cd-qtd-row mt-2"><b>Total da mesa</b><b>${formatarMoeda(info.total||0)}</b></div><small class="obs-line">Os pedidos só começam a ser preparados depois que o restaurante confirmar.</small>` : '<p class="sub" style="margin:4px 0 0;">Escolha seus itens abaixo e envie o pedido.</p>'}`;
}
function _mesaRespTexto_(r){ return (r && r.message) || 'Não foi possível concluir agora. Chame o garçom.'; }
async function mesaChamarGarcom_(){
  try{ const r = await apiCall('chamarGarcomMesa', { mesa: mesaQr.numero, codigo: mesaQr.codigo }); showMsg('cdMesaMsg', _mesaRespTexto_(r), r&&r.ok?'ok':'warn'); }
  catch(e){ showMsg('cdMesaMsg','Sem conexão. Chame o garçom na mesa.','warn'); }
}
async function mesaPedirConta_(){
  if(!await confirmarTxt_('Pedir a conta da Mesa '+mesaQr.numero+'? Depois disso não dá para fazer novos pedidos pelo celular.')) return;
  try{ const r = await apiCall('pedirContaMesa', { mesa: mesaQr.numero, codigo: mesaQr.codigo }); showMsg('cdMesaMsg', _mesaRespTexto_(r), r&&r.ok?'ok':'warn'); atualizarMesaPublica_(false); }
  catch(e){ showMsg('cdMesaMsg','Sem conexão. Chame o garçom na mesa.','warn'); }
}
async function mesaCancelarPedido_(vendaId){
  if(!await confirmarTxt_('Cancelar este pedido?')) return;
  try{ const r = await apiCall('cancelarPedidoMesa', { mesa: mesaQr.numero, codigo: mesaQr.codigo, vendaId }); showMsg('cdMesaMsg', _mesaRespTexto_(r), r&&r.ok?'ok':'warn'); atualizarMesaPublica_(false); }
  catch(e){ showMsg('cdMesaMsg','Sem conexão. Chame o garçom na mesa.','warn'); }
}
async function finalizarPedidoMesa_(){
  const nome = document.getElementById('cdNome').value.trim();
  if(!nome) return showMsg('cdCheckoutMsg','Informe o seu nome.','warn');
  if(!cdCarrinho.length) return showMsg('cdCheckoutMsg','Seu carrinho está vazio.','warn');
  if(mesaBloqueada_ || modoContingenciaAtivo) return showMsg('cdCheckoutMsg','Não dá para pedir pelo celular agora. Chame o garçom.','warn');
  const qtdTotal = cdCarrinho.reduce((s,it)=>s+it.qtd,0);
  if(!await confirmarTxt_('Enviar o pedido da Mesa '+mesaQr.numero+'?\n'+qtdTotal+' item(ns) · '+formatarMoeda(totalCarrinhoCd())+'\nO restaurante vai confirmar antes de preparar.')) return;
  const btn = document.getElementById('cdEnviarPedidoBtn'); btn.disabled = true; btn.textContent = 'Enviando...';
  const itens = cdCarrinho.map(it=>({ produtoId: it.tipo==='produto' ? it.id : undefined, comboId: it.tipo==='combo' ? it.id : undefined, quantidade: it.qtd, adicionaisIds: it.adicionais.map(a=>a.id), observacao: it.obs || '' }));
  const _reqCont = { mesa: mesaQr.numero, itens, clienteNome: nome };
  try{
    const r = await apiCall('criarPedidoMesa', { mesa: mesaQr.numero, codigo: mesaQr.codigo, itens, clienteNome: nome, requisicaoId: reqIdPersist_('pedido_mesa', _reqCont) });
    if(r.ok){
      reqIdConfirmado_('pedido_mesa', _reqCont); try{ localStorage.setItem('cdNomeMesa', nome); }catch(e){}
      cdPedidoConcluido = true; fecharCarrinhoPublico();
      showMsg('cdMesaMsg','Pedido enviado! Aguarde a confirmação do restaurante.','ok');
      atualizarMesaPublica_(false);
    } else { showMsg('cdCheckoutMsg', _mesaRespTexto_(r), 'warn'); btn.disabled = false; btn.textContent = 'Enviar pedido'; }
  }catch(e){ showMsg('cdCheckoutMsg','Não foi possível enviar o pedido. Tente novamente.','warn'); btn.disabled = false; btn.textContent = 'Enviar pedido'; }
}
async function atenderChamadoUI_(mesaId){
  try{
    const r = await apiCall('atenderChamadoMesa', { mesaId });
    if(r.ok){ mesas = r.mesas || mesas; salvarCache(); renderMesasPopup_(); atualizarAlertaMesas_(); showMsg('mesasMsg','Chamado atendido.','ok'); }
    else showMsg('mesasMsg', r.message || 'Não foi possível marcar como atendido.', 'warn');
  }catch(e){ showMsg('mesasMsg','Sem conexão.','warn'); }
}

/* ---------- POP-UP "MESAS" (Etapa 3) ----------
   Visão das mesas para quem cobra: quem pediu a conta aparece primeiro e em destaque, com total em tempo real.
   Operador/Admin fecham a conta (mesma janela de pagamento de sempre); o garçom vê só as dele e pode pedir o fechamento. */
let _mesasPopupTimer = null, _mesasAguardandoVistas = null, _mesasDetAbertos = new Set(), _mesasAtualizando = false;
function souStaffCaixa_(){ return !!(currentUser && (currentUser.nivel==='Admin' || currentUser.nivel==='Operador')); }
function podeVerMesas_(){ return !!(currentUser && ['Admin','Operador','Garçom'].indexOf(currentUser.nivel)!==-1); }
function mesasVisiveis_(){
  const todas = mesas || [];
  if(souGarcom_()) return todas.filter(m=>m.status!=='Livre' && String(m.garcomResponsavel||'').toLowerCase()===String(loginVisao_()).toLowerCase());
  return todas;
}
function contaDaMesa_(mesaId){
  const pedidos = (vendas||[]).filter(v=>v.mesaId===mesaId && v.status==='Confirmada' && v.statusPagamento==='A Receber');
  return { pedidos, total: arred2(pedidos.reduce((s,v)=>s+Number(v.valorTotal||0),0)), desde: pedidos.length ? Math.min.apply(null, pedidos.map(v=>v.timestamp||Date.now())) : 0 };
}
function renderMesasPopup_(){
  try{ renderMesasPainel_(); }catch(e){ if(window.erroTela_) erroTela_(e); }
  const box = document.getElementById('mesasLista'); if(!box || !podeVerMesas_()) return;
  const staff = souStaffCaixa_();
  const vis = mesasVisiveis_();
  const prio = m => m.status==='Aguardando fechamento' ? 0 : (m.chamadoEm ? 1 : (m.status==='Ocupada' ? 2 : 9));
  const ativas = vis.filter(m=>prio(m)<9).map(m=>({ m, c: contaDaMesa_(m.id) }))
    .sort((a,b)=> (prio(a.m)-prio(b.m)) || ((a.c.desde||Infinity)-(b.c.desde||Infinity)));
  const livres = vis.filter(m=>m.status==='Livre' && !m.chamadoEm);
  const aguard = ativas.filter(x=>x.m.status==='Aguardando fechamento').length;
  const totalReceber = arred2(ativas.reduce((s,x)=>s+x.c.total,0));
  const resumo = document.getElementById('mesasResumo');
  if(resumo) resumo.textContent = (aguard ? aguard+' pedindo a conta · ' : '') + (ativas.length-aguard) + ' ocupada(s) · a receber ' + formatarMoeda(totalReceber);
  let html = '';
  ativas.forEach(({m,c})=>{
    const ag = m.status==='Aguardando fechamento';
    const aberto = _mesasDetAbertos.has(m.id);
    const botoes = [];
    if(c.pedidos.length) botoes.push(`<button class="ghost" style="width:auto;padding:8px 12px;" onclick="alternarDetalheMesa_('${m.id}')">${aberto?'Ocultar pedidos':'Ver pedidos'}</button>`);
    if(m.chamadoEm) botoes.unshift(`<button class="small-gold" style="width:auto;padding:8px 12px;" onclick="atenderChamadoUI_('${m.id}')">✔ Atendido</button>`);
    if(staff && m.status==='Livre'){ /* mesa livre só chamando: nada a cobrar */ } else if(staff) botoes.push(c.pedidos.length ? `<button class="small-gold" style="width:auto;padding:8px 14px;" onclick="fecharContaMesaUI('${m.id}','mesasMsg')">💳 Fechar conta</button>` : `<button class="ghost" style="width:auto;padding:8px 12px;" onclick="fecharContaMesaUI('${m.id}','mesasMsg')">Liberar mesa</button>`);
    else if(souGarcom_()){
      // o garçom recebe a conta das SUAS mesas (mesasVisiveis_ já filtra) ou pede ao caixa.
      botoes.push(c.pedidos.length ? `<button class="small-gold" style="width:auto;padding:8px 14px;" onclick="fecharContaMesaUI('${m.id}','mesasMsg')">💳 Receber conta</button>` : `<button class="ghost" style="width:auto;padding:8px 12px;" onclick="fecharContaMesaUI('${m.id}','mesasMsg')">Liberar mesa</button>`);
      if(m.status==='Ocupada' && c.pedidos.length) botoes.push(`<button class="ghost" style="width:auto;padding:8px 12px;" onclick="garcomPedirFechamentoMesa_('${m.id}')">Pedir fechamento</button>`);
    }
    const det = aberto ? `<div class="mesa-det">${c.pedidos.slice().sort((a,b)=>(a.timestamp||0)-(b.timestamp||0)).map(v=>`<div>#${escH(rotuloPedido(v))} · ${new Date(v.timestamp).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} · ${itensDoPedido(v.id)} · <b>${formatarMoeda(v.valorTotal)}</b>${v.statusPedido?' · '+escH(v.statusPedido):''}</div>`).join('')}</div>` : '';
    html += `<div class="mesa-card${ag?' aguardando':''}">
      <div class="mesa-cab"><b>Mesa ${escH(m.numero)}</b><span class="mesa-badge ${(ag||m.chamadoEm)?'b-aguard':'b-ocup'}">${ag?'Pediu a conta':(m.chamadoEm?'🔔 Chamando':'Ocupada')}${(ag&&m.chamadoEm)?' · 🔔':''}</span></div>
      <div class="obs-line">${m.garcomResponsavel?'👤 '+escH(m.garcomResponsavel)+' · ':''}${c.desde?'⏱ '+tempoDecorridoDesde(c.desde)+' · ':''}${c.pedidos.length} pedido(s)</div>
      <div class="mesa-total">${formatarMoeda(c.total)}</div>
      <div class="btnrow sem-margem fx-wrap">${botoes.join('')}</div>${det}
    </div>`;
  });
  if(!ativas.length) html = '<div class="notif-empty">Nenhuma mesa ocupada agora.</div>';
  if(livres.length) html += `<div class="obs-line mt-3">Livres:</div><div class="mesa-chips">${livres.map(m=>`<span>${escH(m.numero)}</span>`).join('')}</div>`;
  box.innerHTML = html;
}
function alternarDetalheMesa_(id){ if(_mesasDetAbertos.has(id)) _mesasDetAbertos.delete(id); else _mesasDetAbertos.add(id); renderMesasPopup_(); }
/* Atualiza SÓ mesas, pedidos e caixa — não mexe em preços/produtos, então é seguro mesmo com uma venda em andamento. */
async function atualizarMesasPopup_(manual){
  if(_mesasAtualizando || !apiConfigurada()) return;
  _mesasAtualizando = true;
  try{
    const d = await apiCall('getAll', {});
    if(d && d.mesas){ mesas = d.mesas; vendas = d.vendas || vendas; itensVenda = d.itensVenda || itensVenda; pagamentosVenda = d.pagamentosVenda || pagamentosVenda; sessaoCaixa = d.sessaoCaixa || null; }
    renderMesasPopup_(); atualizarAlertaMesas_();
    if(manual) showMsg('mesasMsg','Atualizado.','ok');
  }catch(e){ if(manual) showMsg('mesasMsg','Sem conexão — mostrando os últimos dados.','warn'); }
  finally{ _mesasAtualizando = false; }
}
function abrirMesasPopup_(){
  if(!podeVerMesas_()) return;
  showMsg('mesasMsg','','');
  renderMesasPopup_();
  document.getElementById('mesasModal').classList.add('open');
  atualizarMesasPopup_(false);
  clearInterval(_mesasPopupTimer);
  _mesasPopupTimer = setInterval(()=>{ if(document.visibilityState==='visible') atualizarMesasPopup_(false); }, 30000);
}
function fecharMesasPopup_(){ document.getElementById('mesasModal').classList.remove('open'); clearInterval(_mesasPopupTimer); _mesasPopupTimer = null; }
async function garcomPedirFechamentoMesa_(id){
  const m = (mesas||[]).find(x=>x.id===id);
  if(!m || m.status!=='Ocupada'){ showMsg('mesasMsg','Só dá para pedir o fechamento de uma mesa ocupada.','warn'); return; }
  if(!await confirmarTxt_('Pedir o fechamento da mesa '+m.numero+'? O caixa vai receber a conta.')) return;
  try{
    const r = await apiCall('editarStatusMesa', { id: m.id, novoStatus: 'Aguardando fechamento' });
    if(r.ok){ mesas = r.mesas || mesas; salvarCache(); renderMesasPickerCaixa(); renderMesas(); renderMesasPopup_(); showMsg('mesasMsg','Fechamento da mesa '+m.numero+' solicitado ao caixa.','ok'); }
    else showMsg('mesasMsg', r.message || 'Não foi possível pedir o fechamento.', 'warn');
  } catch(e){ showMsg('mesasMsg','Sem conexão — o fechamento não foi solicitado.','warn'); }
}
/* Ponto de aviso (aba Caixa, botão Mesas) + som/notificação quando uma mesa NOVA pede a conta. */
function atualizarAlertaMesas_(){
  const visivel = podeVerMesas_(), staff = souStaffCaixa_();
  ['btnMesasCaixa','atalhoMesas'].forEach(id=>{ const el = document.getElementById(id); if(el) el.style.display = visivel ? '' : 'none'; });
  const minhas = staff ? (mesas||[]) : mesasVisiveis_();
  const contas = staff ? (mesas||[]).filter(m=>m.status==='Aguardando fechamento') : [];
  const chamando = minhas.filter(m=>m.chamadoEm);
  const temAlerta = contas.length>0 || chamando.length>0;
  const tab = document.querySelector('[data-tab=caixa]'); if(tab) tab.classList.toggle('has-alert', temAlerta);
  ['btnMesasCaixa','atalhoMesas'].forEach(id=>{ const el = document.getElementById(id); if(el) el.classList.toggle('has-alert', temAlerta); });
  const ids = contas.map(m=>'c:'+m.id).concat(chamando.map(m=>'h:'+m.id+':'+m.chamadoEm));
  if(_mesasAguardandoVistas===null){ _mesasAguardandoVistas = new Set(ids); return; } // primeira leitura: só registra, não apita
  const novasContas = contas.filter(m=>!_mesasAguardandoVistas.has('c:'+m.id));
  const novosChamados = chamando.filter(m=>!_mesasAguardandoVistas.has('h:'+m.id+':'+m.chamadoEm));
  _mesasAguardandoVistas = new Set(ids);
  const partes = [];
  if(novasContas.length) partes.push('Mesa '+novasContas.map(m=>m.numero).join(', ')+' pediu a conta');
  if(novosChamados.length) partes.push('Mesa '+novosChamados.map(m=>m.numero).join(', ')+' chamando o garçom');
  if(partes.length){ try{ somAlerta_(); mostrarNotificacao_('🍽️ Mesas', partes.join(' · ')+'.'); }catch(e){} }
}

function limparCamposEntrega(){
  tipoEntregaAtual = 'Retirada';
  setTipoEntrega('Retirada');
  ['vEndereco','vComplemento','vReferencia','vObsEntrega','vTaxaEntrega'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
}

function popularSelectProdutos(){
  const sel = document.getElementById('vProduto');
  const ativos = produtos.filter(p=>p.ativo);
  sel.innerHTML = ativos.map(p=>{
    const { preco, custo } = precoProdutoPorForma(p.id, formaPrecoAtual);
    return `<option value="${p.id}" data-preco="${preco}" data-custo="${custo}" data-nome="${escH(p.nome)}">${escH(p.nome)} — ${formatarMoeda(preco)}</option>`;
  }).join('') || '<option value="">Cadastre um produto primeiro</option>';
  renderAtalhosProdutos();
}
function popularSelectCombos(){
  const sel = document.getElementById('vCombo');
  const ativos = combos.filter(c=>c.ativo);
  sel.innerHTML = ativos.map(c=>{
    const { preco, custo } = precoComboPorForma(c.id, formaPrecoAtual);
    return `<option value="${c.id}" data-preco="${preco}" data-custo="${custo}" data-nome="${escH(c.nome)}">${escH(c.nome)} — ${formatarMoeda(preco)}</option>`;
  }).join('') || '<option value="">Cadastre um combo primeiro</option>';
}

/* ---------- ATALHOS RÁPIDOS DE PRODUTOS (ITEM 37) ---------- */
function renderAtalhosProdutos(){
  const box = document.getElementById('atalhosProdutos');
  if(!box) return;
  let itens = (maisPedidos||[]).filter(m=>m.tipo==='produto').map(m=>produtos.find(p=>p.id===m.id)).filter(p=>p && p.ativo);
  if(!itens.length) itens = produtos.filter(p=>p.ativo).slice(0,8); // loja nova, ainda sem histórico de vendas
  if(itens.length===0){ box.innerHTML=''; return; }
  box.innerHTML = itens.map(p=>{
    const { preco } = precoProdutoPorForma(p.id, formaPrecoAtual);
    return `<button type="button" class="atalho-btn" onclick="adicionarAtalhoProduto('${p.id}')">${escH(p.nome)} · ${formatarMoeda(preco)}</button>`;
  }).join('');
}
function adicionarAtalhoProduto(produtoId){
  const p = produtos.find(x=>x.id===produtoId);
  if(!p) return;
  const { preco, custo } = precoProdutoPorForma(p.id, formaPrecoAtual);
  const adicionaisDoProduto = produtoAdicionais.filter(pa=>pa.produtoId===p.id)
    .map(pa=>adicionais.find(a=>a.id===pa.adicionalId)).filter(a=>a && a.ativo);
  if(adicionaisDoProduto.length){
    abrirCaixaAdicionaisModal({ produtoId: p.id, nome: p.nome, preco: Number(preco), custo: Number(custo), qtd: 1 }, adicionaisDoProduto);
    return;
  }
  carrinhoAtual.push({ produtoId: p.id, comboId: null, descricao: p.nome, quantidade: 1, valorUnitario: preco, custoUnitario: custo, adicionaisIds: [] });
  renderCarrinho();
}

let caixaItemPendente = null; // {produtoId, nome, preco, custo, qtd}
let caixaAdicionaisEscolhidos = [];
/* ITEM 3.3: o servidor recusa mais de 50 unidades por item; aqui o campo já não deixa passar, com aviso visual. */
const QTD_MAX_ITEM_ = 50;
function avisoQtdMax_(msgId){ try{ showMsg(msgId || 'vMsg', 'O máximo é ' + QTD_MAX_ITEM_ + ' unidades por item. Para mais, lance em dois itens ou fale com o restaurante.', 'warn'); }catch(e){} }
function limitarQtd50_(el, msgId){
  let n = Math.floor(Number(el.value));
  if(el.value !== '' && Number.isFinite(n) && n > QTD_MAX_ITEM_){ el.value = QTD_MAX_ITEM_; el.style.outline = '2px solid var(--red, #c0392b)'; setTimeout(()=>{ el.style.outline = ''; }, 1500); avisoQtdMax_(msgId); }
}
/* Combo com escolha (ex.: "3 Smash"): pergunta os sabores de cada unidade antes de entrar na venda */
function comboEscolhaCfgCaixa_(comboId){
  const c = combos.find(x=>x.id===comboId); const n = Number(c && c.escolhaQtd) || 0; if(n <= 0) return null;
  const ops = comboItens.filter(ci=>ci.comboId===comboId && ci.escolha).map(ci=>{ const p = produtos.find(x=>x.id===ci.produtoId); return p && p.ativo ? { produtoId:p.id, nome:p.nome } : null; }).filter(Boolean);
  return ops.length >= 2 ? { qtd:n, opcoes:ops } : null;
}
function custoProdutoMax_(pid){ return Math.max(0, ...produtoPrecos.filter(x=>x.produtoId===pid).map(x=>Number(x.custo)||0)); }
function custoComboComEscolha_(comboId, escolhas, custoPadrao){
  if(!escolhas || !escolhas.length) return custoPadrao;
  const fixo = comboItens.filter(ci=>ci.comboId===comboId && !ci.escolha).reduce((s,ci)=>s+ci.quantidade*custoProdutoMax_(ci.produtoId),0);
  const esc = escolhas.reduce((s,e)=>s+e.quantidade*custoProdutoMax_(e.produtoId),0);
  return Math.round((fixo+esc)*100)/100;
}
function caixaEscolherSabores_(cfg, titulo){
  return new Promise(resolve=>{
    const ov = document.createElement('div'); ov.className = 'modal-overlay open'; ov.style.zIndex = 99999;
    const box = document.createElement('div'); box.className = 'modal-box'; box.style.maxWidth = '420px'; ov.appendChild(box);
    const q = {}; const fechar = v => { ov.remove(); resolve(v); };
    const tot = () => Object.keys(q).reduce((s,k)=>s+q[k],0);
    const pintar = () => {
      box.innerHTML = '<h3 style="margin-top:0;">' + escH(titulo) + '</h3><p class="sub">Escolha ' + cfg.qtd + ' itens (pode repetir)</p>' +
        cfg.opcoes.map(o=>`<div class="carrinho-item"><span>${escH(o.nome)}</span><div class="qtd-controle"><button type="button" data-p="${o.produtoId}" data-d="-1">−</button><span>${q[o.produtoId]||0}</span><button type="button" data-p="${o.produtoId}" data-d="1" ${tot()>=cfg.qtd?'disabled':''}>+</button></div></div>`).join('') +
        `<p class="sub" style="color:${tot()===cfg.qtd?'var(--gold)':'#e74c3c'};">${tot()} de ${cfg.qtd} escolhidos</p>` +
        `<div class="row2"><button type="button" class="secondary" data-ac="x">Cancelar</button><button type="button" class="primary" data-ac="ok" ${tot()===cfg.qtd?'':'disabled'}>Confirmar</button></div>`;
      box.querySelectorAll('button[data-p]').forEach(b=>b.onclick=()=>{ const id=b.dataset.p, d=Number(b.dataset.d); if(d>0 && tot()>=cfg.qtd) return; q[id]=Math.max(0,(q[id]||0)+d); pintar(); });
      box.querySelector('[data-ac="x"]').onclick = ()=>fechar(null);
      box.querySelector('[data-ac="ok"]').onclick = ()=>{ if(tot()===cfg.qtd) fechar(cfg.opcoes.filter(o=>q[o.produtoId]>0).map(o=>({ produtoId:o.produtoId, quantidade:q[o.produtoId], nome:o.nome }))); };
    };
    document.body.appendChild(ov); pintar();
  });
}
async function adicionarComboComEscolha_(comboId, nome, qtd, preco, custo){
  const cfg = comboEscolhaCfgCaixa_(comboId);
  if(!cfg){ carrinhoAtual.push({ produtoId: null, comboId, descricao: nome, quantidade: qtd, valorUnitario: preco, custoUnitario: custo, adicionaisIds: [] }); return true; }
  const novos = [];
  for(let i=0;i<qtd;i++){
    const esc = await caixaEscolherSabores_(cfg, nome + (qtd>1 ? ' — ' + (i+1) + ' de ' + qtd : ''));
    if(!esc) return false;
    novos.push({ produtoId: null, comboId, descricao: nome + ' (' + esc.map(e=>e.quantidade+'x '+e.nome).join(', ') + ')', quantidade: 1, valorUnitario: preco, custoUnitario: custoComboComEscolha_(comboId, esc, custo), adicionaisIds: [], escolhas: esc });
  }
  novos.forEach(n=>carrinhoAtual.push(n));
  return true;
}
async function adicionarItemCarrinho(){
  const qtd = Math.min(QTD_MAX_ITEM_, Math.max(1, Math.floor(Number(document.getElementById('vQtd').value)) || 1));
  if(modoItem === 'produto'){
    const sel = document.getElementById('vProduto');
    const opt = sel.options[sel.selectedIndex];
    if(!opt || !opt.value){ showMsg('vMsg','Cadastre um produto primeiro na aba Produtos.','warn'); return; }
    const adicionaisDoProduto = produtoAdicionais.filter(pa=>pa.produtoId===opt.value)
      .map(pa=>adicionais.find(a=>a.id===pa.adicionalId)).filter(a=>a && a.ativo);
    if(adicionaisDoProduto.length){
      abrirCaixaAdicionaisModal({ produtoId: opt.value, nome: opt.dataset.nome, preco: Number(opt.dataset.preco), custo: Number(opt.dataset.custo), qtd }, adicionaisDoProduto);
      return;
    }
    carrinhoAtual.push({ produtoId: opt.value, comboId: null, descricao: opt.dataset.nome, quantidade: qtd, valorUnitario: Number(opt.dataset.preco), custoUnitario: Number(opt.dataset.custo), adicionaisIds: [] });
  } else if(modoItem === 'combo'){
    const sel = document.getElementById('vCombo');
    const opt = sel.options[sel.selectedIndex];
    if(!opt || !opt.value){ showMsg('vMsg','Cadastre um combo primeiro.','warn'); return; }
    if(!await adicionarComboComEscolha_(opt.value, opt.dataset.nome, qtd, Number(opt.dataset.preco), Number(opt.dataset.custo))) return;
  } else {
    const descricao = document.getElementById('vDescManual').value.trim();
    const valorUnitario = Number(document.getElementById('vValorManual').value) || 0;
    if(!descricao){ showMsg('vMsg','Informe a descrição do item manual.','warn'); return; }
    carrinhoAtual.push({ produtoId: null, comboId: null, descricao, quantidade: qtd, valorUnitario, custoUnitario: 0, adicionaisIds: [] });
    document.getElementById('vDescManual').value=''; document.getElementById('vValorManual').value='';
  }
  document.getElementById('vQtd').value = 1;
  renderCarrinho();
}
function abrirCaixaAdicionaisModal(itemPendente, adicionaisDisponiveis){
  caixaItemPendente = itemPendente;
  caixaItemPendente.adicionaisDisponiveis = adicionaisDisponiveis;
  caixaAdicionaisEscolhidos = [];
  document.getElementById('caixaAdicionaisTitulo').textContent = 'Adicionais — ' + itemPendente.nome;
  document.getElementById('caixaAdicionaisLista').innerHTML = adicionaisDisponiveis.map(a=>`<label class="cd-adicional-linha">
      <span><input type="checkbox" value="${a.id}" onchange="toggleCaixaAdicional('${a.id}')" class="largura-auto"> ${escH(a.nome)}</span>
      <span>+ ${formatarMoeda(a.preco)}</span>
    </label>`).join('');
  document.getElementById('caixaAdicionaisModal').classList.add('open');
}
function fecharCaixaAdicionaisModal(){ document.getElementById('caixaAdicionaisModal').classList.remove('open'); caixaItemPendente = null; }
function toggleCaixaAdicional(adId){
  const idx = caixaAdicionaisEscolhidos.indexOf(adId);
  if(idx>=0) caixaAdicionaisEscolhidos.splice(idx,1); else caixaAdicionaisEscolhidos.push(adId);
}
function confirmarAdicionaisCaixa(){
  if(!caixaItemPendente) return;
  const extra = caixaAdicionaisEscolhidos.reduce((s,id)=>{ const a = adicionais.find(x=>x.id===id); return s + (a?a.preco:0); },0);
  const nomesEscolhidos = caixaAdicionaisEscolhidos.map(id=>{ const a = adicionais.find(x=>x.id===id); return a?a.nome:''; }).filter(Boolean);
  carrinhoAtual.push({
    produtoId: caixaItemPendente.produtoId, comboId: null,
    descricao: caixaItemPendente.nome + (nomesEscolhidos.length?(' + '+nomesEscolhidos.join(', ')):''),
    quantidade: caixaItemPendente.qtd,
    valorUnitario: caixaItemPendente.preco + extra, custoUnitario: caixaItemPendente.custo,
    adicionaisIds: caixaAdicionaisEscolhidos.slice()
  });
  fecharCaixaAdicionaisModal();
  document.getElementById('vQtd').value = 1;
  renderCarrinho();
}
function removerItemCarrinho(idx){ carrinhoAtual.splice(idx,1); renderCarrinho(); }
function alterarQtdCarrinho(idx, delta){
  const novaQtd = (carrinhoAtual[idx].quantidade||1) + delta;
  if(novaQtd < 1) return;
  if(novaQtd > QTD_MAX_ITEM_){ avisoQtdMax_(); return; }
  carrinhoAtual[idx].quantidade = novaQtd;
  renderCarrinho();
}
function totalCarrinho(){ return carrinhoAtual.reduce((s,it)=>s+it.quantidade*it.valorUnitario,0); }

function verificarEstoqueCarrinho(){
  const el = document.getElementById('itemEstoqueAviso');
  if(!el) return;
  const consumo = {}; // ingredienteId -> quantidade total consumida no carrinho
  carrinhoAtual.forEach(item=>{
    if(item.produtoId){
      produtoIngredientes.filter(v=>v.produtoId===item.produtoId).forEach(v=>{
        consumo[v.ingredienteId] = (consumo[v.ingredienteId]||0) + v.quantidadePorUnidade*item.quantidade;
      });
    }
    if(item.comboId){
      comboItens.filter(ci=>ci.comboId===item.comboId).forEach(ci=>{
        produtoIngredientes.filter(v=>v.produtoId===ci.produtoId).forEach(v=>{
          consumo[v.ingredienteId] = (consumo[v.ingredienteId]||0) + v.quantidadePorUnidade*ci.quantidade*item.quantidade;
        });
      });
    }
  });
  const avisos = [];
  Object.keys(consumo).forEach(ingId=>{
    const ing = estoque.find(e=>e.id===ingId);
    if(!ing) return;
    const restante = ing.quantidade - consumo[ingId];
    if(Number(ing.minimo)>0 && restante <= ing.minimo) avisos.push(ing.nome + ' ficaria com ' + restante + ' ' + (ing.unidade||'un'));
  });
  if(avisos.length){ el.textContent = '⚠ Estoque baixo depois desta venda: ' + avisos.join(', ') + '.'; el.className = 'msg warn'; }
  else { el.className = 'msg'; }
}

/* ITEM 2.7 — rascunho do carrinho. Fica no sessionStorage (some ao fechar a aba) e só guarda itens + forma de preço + quem montou.
   Não guarda cliente, telefone nem endereço. Só começa a gravar DEPOIS de oferecer a recuperação, senão o carrinho vazio do
   início apagaria o rascunho antes de o operador ver a pergunta. */
const CARRINHO_RASCUNHO_KEY = 'tb_carrinho_rascunho_v1';
let _carrinhoRascunhoPronto_ = false;
function carrinhoRascunhoSalvar_(){
  if(!_carrinhoRascunhoPronto_) return;
  try{
    if(!carrinhoAtual.length){ sessionStorage.removeItem(CARRINHO_RASCUNHO_KEY); return; }
    sessionStorage.setItem(CARRINHO_RASCUNHO_KEY, JSON.stringify({ login: currentUser ? currentUser.login : '', forma: formaPrecoAtual || '', ts: Date.now(), itens: carrinhoAtual }));
  }catch(e){}
}
async function oferecerRecuperarCarrinho_(){
  try{
    if(!currentUser || ['Admin','Operador','Garçom'].indexOf(currentUser.nivel) === -1){ _carrinhoRascunhoPronto_ = true; return; }
    let rascunho = null;
    try{ rascunho = JSON.parse(sessionStorage.getItem(CARRINHO_RASCUNHO_KEY) || 'null'); }catch(e){}
    if(!rascunho || !Array.isArray(rascunho.itens) || !rascunho.itens.length || carrinhoAtual.length){ _carrinhoRascunhoPronto_ = true; return; }
    // aceita só itens com formato esperado (nunca confia cegamente no que está guardado)
    const itens = rascunho.itens.filter(it=>it && typeof it.descricao === 'string' && isFinite(Number(it.quantidade)) && isFinite(Number(it.valorUnitario)))
      .map(it=>Object.assign({}, it, { quantidade: Math.min(50, Math.max(1, Math.floor(Number(it.quantidade)) || 1)), valorUnitario: Number(it.valorUnitario) }));
    if(!itens.length || Date.now() - (rascunho.ts || 0) > 12*3600*1000){ sessionStorage.removeItem(CARRINHO_RASCUNHO_KEY); _carrinhoRascunhoPronto_ = true; return; }
    const outroLogin = rascunho.login && rascunho.login !== currentUser.login;
    const msg = 'Há um carrinho não finalizado' + (outroLogin ? ' montado por "' + rascunho.login + '"' : '') + ' (' + itens.length + ' item' + (itens.length>1?'s':'') + ').\n\nRecuperar?' + (outroLogin ? '\n\nAtenção: foi montado por outro login.' : '') + '\nOs preços serão conferidos com a tabela atual.';
    if(await confirmarTxt_(msg, 'Recuperar carrinho', false, 'Carrinho não finalizado', 'Descartar')){
      carrinhoAtual = itens;
      try{
        const formaOk = rascunho.forma && formasPagamento.find(x=>x.id===rascunho.forma && x.ativa);
        if(formaOk){ mudarFormaPreco(rascunho.forma); popularSelectFormaPreco(); }  // reprecifica os itens com a tabela de preços atual
      }catch(e){}
      renderCarrinho();
    } else { sessionStorage.removeItem(CARRINHO_RASCUNHO_KEY); }
  }catch(e){}
  _carrinhoRascunhoPronto_ = true;
}
function renderCarrinho(){
  carrinhoRascunhoSalvar_();
  atualizarContagemPainelItens();
  const box = document.getElementById('carrinhoLista');
  if(carrinhoAtual.length===0){ box.innerHTML = '<div class="notif-empty">Nenhum item ainda.</div>'; document.getElementById('carrinhoTotal').textContent = formatarMoeda(0); verificarEstoqueCarrinho(); atualizarPreviewDesconto(); return; }
  let total = 0;
  box.innerHTML = carrinhoAtual.map((it,idx)=>{
    const subtotal = it.quantidade*it.valorUnitario;
    total += subtotal;
    return `<div class="carrinho-item">
      <span>${escH(it.descricao)}${itemSemDesconto_(it)?' 🏷️':''} — ${formatarMoeda(subtotal)}</span>
      <div class="qtd-controle">
        <button onclick="alterarQtdCarrinho(${idx},-1)">−</button>
        <span>${it.quantidade}</span>
        <button onclick="alterarQtdCarrinho(${idx},1)">+</button>
        <button class="rm" onclick="removerItemCarrinho(${idx})">✕</button>
      </div>
    </div>`;
  }).join('');
  document.getElementById('carrinhoTotal').textContent = formatarMoeda(total);
  verificarEstoqueCarrinho();
  atualizarPreviewDesconto();
}

/* ---------- PAGAMENTO (forma escolhida em cima; toggle "dividir" opcional) ---------- */
let pagamentoDividido = false;
function nomeFormaAtual(){ const f = formasPagamento.find(x=>x.id===formaPrecoAtual); return f ? f.nome : 'Dinheiro'; }
function garantirPagamentoInicial(){
  if(pagamentosAtuais.length===0) pagamentosAtuais.push({ forma: nomeFormaAtual(), valor: 0, valorRecebido: 0 });
}
function popularSelectFormaSecundaria(){
  const sel = document.getElementById('formaSecundariaSelect');
  const ativas = formasPagamento.filter(f=>f.ativa);
  sel.innerHTML = ativas.map(f=>`<option value="${f.id}">${escH(f.nome)}</option>`).join('');
  const diferente = ativas.find(f=>f.id!==formaPrecoAtual);
  if(diferente) sel.value = diferente.id;
}
function onTogglePagamentoDividido(){
  pagamentoDividido = document.getElementById('pagamentoDivididoToggle').checked;
  document.getElementById('formaSecundariaBox').style.display = pagamentoDividido ? 'block' : 'none';
  garantirPagamentoInicial();
  if(pagamentoDividido){
    popularSelectFormaSecundaria();
    const idSecundaria = document.getElementById('formaSecundariaSelect').value;
    const f = formasPagamento.find(x=>x.id===idSecundaria);
    if(pagamentosAtuais.length<2) pagamentosAtuais.push({ forma: f ? f.nome : 'Pix', valor: 0, valorRecebido: 0 });
    recalcularCarrinhoPorFormasSelecionadas();
  } else {
    pagamentosAtuais = [pagamentosAtuais[0]];
    pagamentosAtuais[0].valor = totalComDesconto();
  }
  renderPagamentos();
}
function mudarFormaSecundaria(formaId){
  const f = formasPagamento.find(x=>x.id===formaId);
  garantirPagamentoInicial();
  if(pagamentosAtuais.length<2) pagamentosAtuais.push({ forma: f ? f.nome : 'Pix', valor: 0, valorRecebido: 0 });
  else pagamentosAtuais[1].forma = f ? f.nome : pagamentosAtuais[1].forma;
  recalcularCarrinhoPorFormasSelecionadas();
  renderPagamentos();
}
function mudarValorPagamento(idx, valor){ pagamentosAtuais[idx].valor = Number(valor)||0; atualizarResumoPagamento(); }
function mudarValorRecebido(idx, valor){ pagamentosAtuais[idx].valorRecebido = Number(valor)||0; atualizarTrocoDestaque(); atualizarResumoPagamento(); }
function preencherValorComTotal(idx){ pagamentosAtuais[idx].valor = totalComDesconto(); renderPagamentos(); }
/* Pagamento dividido em 2 formas diferentes: por regra do sistema, prevalece o valor maior entre as formas usadas. */
function recalcularCarrinhoPorFormasSelecionadas(){
  if(!pagamentoDividido) return;
  const nomesUsados = [...new Set(pagamentosAtuais.map(p=>p.forma))];
  if(nomesUsados.length<2) return;
  const idsFormas = nomesUsados.map(nome => (formasPagamento.find(f=>f.nome===nome)||{}).id).filter(Boolean);
  if(idsFormas.length<2) return;
  carrinhoAtual.forEach(item=>{
    if(!item.produtoId && !item.comboId) return;
    let maiorPreco = item.valorUnitario, maiorCusto = item.custoUnitario;
    idsFormas.forEach(fid=>{
      const p = item.produtoId ? precoProdutoPorForma(item.produtoId, fid) : precoComboPorForma(item.comboId, fid);
      if(p.preco > maiorPreco){ maiorPreco = p.preco; maiorCusto = item.comboId ? custoComboComEscolha_(item.comboId, item.escolhas, p.custo) : p.custo; }
    });
    item.valorUnitario = maiorPreco; item.custoUnitario = maiorCusto;
  });
  renderCarrinho();
}
function renderPagamentos(){
  garantirPagamentoInicial();
  pagamentosAtuais[0].forma = nomeFormaAtual();
  if(!pagamentoDividido){
    pagamentosAtuais = [pagamentosAtuais[0]];
    pagamentosAtuais[0].valor = totalComDesconto();
  }
  const box = document.getElementById('pagamentosLista');
  box.innerHTML = pagamentosAtuais.map((p,idx)=>{
    let html = `<div class="pagamento-row">
      <span style="align-self:center;font-size:13px;color:var(--gold);min-width:100px;">${p.forma}</span>`;
    if(pagamentoDividido){
      html += `<input type="number" placeholder="Valor" step="0.01" value="${p.valor||''}" oninput="mudarValorPagamento(${idx}, this.value)">
      <button class="ghost" style="padding:6px 8px;font-size:12px;" onclick="preencherValorComTotal(${idx})">total</button>`;
    } else {
      html += `<span style="align-self:center;font-size:13px;color:var(--gold);white-space:nowrap;">${formatarMoeda(p.valor)}</span>`;
    }
    html += `</div>`;
    const acrP = acrescimoForma_(p.forma, p.valor);
    if(acrP>0) html += `<div style="margin:-2px 0 8px 0;font-size:12px;color:#ffd27a;">⚠️ Acréscimo ${escH(p.forma)}: +${formatarMoeda(acrP)} → cobrar <b>${formatarMoeda((Number(p.valor)||0)+acrP)}</b></div>`;
    if(formaPermiteTroco(p.forma)){
      html += `<div style="margin:-2px 0 10px 0;font-size:12px;color:var(--muted);display:flex;gap:8px;align-items:center;">
        <span>Recebido:</span><input type="number" style="max-width:110px;" placeholder="0.00" step="0.01" value="${p.valorRecebido||''}" oninput="mudarValorRecebido(${idx}, this.value)">
      </div>`;
    }
    return html;
  }).join('');
  atualizarTrocoDestaque();
  atualizarResumoPagamento();
}
function formaPermiteTroco(nome){ const f = formasPagamento.find(x=>x.nome===nome); return f ? !!f.permiteTroco : nome==='Dinheiro'; }
function atualizarTrocoDestaque(){
  const box = document.getElementById('trocoDestaque');
  const dinheiro = pagamentosAtuais.filter(p=>formaPermiteTroco(p.forma) && p.valorRecebido>0);
  if(!dinheiro.length){ box.style.display='none'; return; }
  const troco = dinheiro.reduce((s,p)=>s+(p.valorRecebido-(p.valor+acrescimoForma_(p.forma,p.valor))),0);
  box.style.display = 'block';
  document.getElementById('trocoDestaqueValor').textContent = formatarMoeda(troco);
  document.getElementById('trocoDestaqueValor').style.color = troco<0 ? '#ffb3ab' : 'var(--gold)';
}
function atualizarResumoPagamento(){
  const total = totalComDesconto();
  const alocado = pagamentosAtuais.reduce((s,p)=>s+(Number(p.valor)||0),0);
  const bate = Math.abs(total-alocado) < 0.02;
  const acr = acrescimoTotalVenda_();
  document.getElementById('pagamentoResumo').innerHTML = `Total do pedido: <b>${formatarMoeda(total)}</b> — Alocado: <b style="color:${bate?'#bfe0ae':'#ffb3ab'};">${formatarMoeda(alocado)}</b>`
    + (acr>0 ? `<br>Acréscimo da forma de pagamento: <b style="color:#ffd27a;">+${formatarMoeda(acr)}</b> — <b>Total a cobrar: ${formatarMoeda(Math.round((total+acr)*100)/100)}</b>` : '');
}

/* ---------- REPETIR ÚLTIMA VENDA ---------- */
let ultimaVendaItens = null;
let ultimaVendaCliente = null;
let ultimaVendaId = null;
function repetirUltimaVenda(){
  if(!ultimaVendaItens || !ultimaVendaItens.length){ showMsg('vMsg','Nenhuma venda anterior nesta sessão do navegador.','warn'); return; }
  carrinhoAtual = ultimaVendaItens.map(it=>({...it}));
  if(ultimaVendaCliente && ultimaVendaCliente.telefone){
    modoCliente = 'com'; setModoCliente('com');
    selecionarClienteVenda(ultimaVendaCliente.nome, ultimaVendaCliente.telefone);
  }
  renderCarrinho();
  showMsg('vMsg','Carrinho da última venda recarregado. Confira antes de finalizar.','ok');
}

async function finalizarVenda(){
  if(conexaoAtual==='offline' && !podeVenderContingencia_()){ showMsg('vMsg','🔴 Sem conexão — não é possível finalizar vendas agora.','warn'); return; }
  if(!sessaoCaixa){ showMsg('vMsg','Abra o caixa antes de registrar uma venda.','warn'); return; }
  if(carrinhoAtual.length===0){ showMsg('vMsg','Adicione ao menos um item ao carrinho.','warn'); return; }
  const valorDesc = valorDescontoCalculado();
  if(valorDesc>0 && valorDesc>=totalCarrinho()){ showMsg('vMsg','O desconto não pode deixar a venda com valor zero ou negativo.','warn'); return; }
  if(valorDescontoAtualNumero()>0){
    const eligF = baseDescontoCaixa_();
    if(eligF<=0){ showMsg('vMsg','Os itens do carrinho têm preço promocional e não aceitam desconto.','warn'); return; }
    if(tipoDescontoAtual==='fixo' && valorDescontoAtualNumero()>eligF+0.005){ showMsg('vMsg','O desconto fixo não pode passar de ' + formatarMoeda(eligF) + ' (só vale para itens sem preço promocional).','warn'); return; }
  }
  const total = totalComDesconto();
  const alocado = pagamentosAtuais.reduce((s,p)=>s+(Number(p.valor)||0),0);
  // Mesa "pagar ao sair" não usa o painel de pagamento; todos os outros casos (inclusive mesa "pagar agora") conferem a soma.
  if(!(tipoEntregaAtual==='Mesa' && !mesaPagaAgora_()) && Math.abs(total-alocado) > 0.02){ showMsg('vMsg','A soma dos pagamentos precisa bater com o total a pagar.','warn'); return; }

  const desconto = valorDesc>0 ? { tipo: tipoDescontoAtual, valor: valorDescontoAtualNumero() } : null;
  const executarFinalizacao = async (senhaAdminConfirmacao)=>{
    await finalizarVendaConfirmada(total, desconto, senhaAdminConfirmacao||'');
  };
  if(desconto && precisaConfirmarAdmin()) abrirModalSenhaAdmin(executarFinalizacao);
  else executarFinalizacao('');
}
/* FASE 9 — idempotência: o mesmo id acompanha a venda em qualquer nova tentativa (duplo toque, retry, internet caindo)
   e só é descartado quando o backend confirma. */
let _idFilaContingencia = null;
function novaRequisicao_(){ return 'r-' + Date.now() + '-' + Math.random().toString(36).slice(2,10); }
/* MELHORIA 3.2 — o id da venda/pedido sobrevive a um recarregar da página (sessionStorage) e só muda quando o CONTEÚDO muda.
   Mesma venda reenviada = mesmo id (o servidor não duplica). Carrinho alterado = id novo. Apagado só quando o servidor confirma. */
function reqIdPersist_(escopo, conteudo){ try{ return idemId_(idemChave_('req_'+escopo, conteudo)); }catch(e){ return novaRequisicao_(); } }
function reqIdConfirmado_(escopo, conteudo){ try{ idemLimpar_(idemChave_('req_'+escopo, conteudo)); }catch(e){} }
async function finalizarVendaConfirmada(total, desconto, senhaAdminConfirmacao){
  const valorDescontoReal = desconto ? valorDescontoCalculado() : 0;
  const cpfNota_ = ((document.getElementById('vCpfNota')||{}).value || '').replace(/\D/g,'');
  const clienteNome = modoCliente==='com' && clienteVendaSelecionado ? clienteVendaSelecionado.nome : '';
  const clienteTelefone = modoCliente==='com' && clienteVendaSelecionado ? clienteVendaSelecionado.telefone : '';
  const mesaEscolhidaId = tipoEntregaAtual==='Mesa' ? document.getElementById('vMesaSelect').value : null;
  const eraMesa = tipoEntregaAtual==='Mesa'; // limparCamposEntrega() devolve o tipo para Retirada mais abaixo
  const clienteMesaAntes = (eraMesa && modoCliente==='com' && clienteVendaSelecionado) ? { nome: clienteVendaSelecionado.nome, telefone: clienteVendaSelecionado.telefone } : null;
  if(tipoEntregaAtual==='Mesa' && !mesaEscolhidaId){ showMsg('vMsg','Escolha a mesa.','warn'); return; }
  const mesaAgora = mesaPagaAgora_();
  const pagamentosParaEnviar = (tipoEntregaAtual==='Mesa' && !mesaAgora) ? [{ forma: 'A Receber (Mesa)', valor: total }] : pagamentosAtuais.map(p=>({forma:p.forma, valor:p.valor}));
  const statusPagamentoParaEnviar = tipoEntregaAtual==='Mesa' ? (mesaAgora ? 'Pago' : 'A Receber') : statusPagamentoAtual;
  const carrinhoParaComprovante = carrinhoAtual.slice();
  const dadosEntrega = tipoEntregaAtual==='Entrega' ? {
    endereco: document.getElementById('vEndereco').value.trim(),
    complemento: document.getElementById('vComplemento').value.trim(),
    referencia: document.getElementById('vReferencia').value.trim(),
    observacoes: document.getElementById('vObsEntrega').value.trim(),
    taxa: document.getElementById('vTaxaEntrega').value
  } : null;
  if(tipoEntregaAtual==='Entrega' && !dadosEntrega.endereco){ showMsg('vMsg','Informe o endereço de entrega.','warn'); return; }

  /* planilha principal fora do ar -> o Caixa pode registrar a venda na CONTINGÊNCIA (com confirmação dela). */
  const ctxCont = { carrinho: carrinhoAtual.slice(), clienteNome, clienteTelefone, pagamentos: pagamentosParaEnviar, tipoEntrega: tipoEntregaAtual, dadosEntrega, statusPagamento: statusPagamentoParaEnviar, total, valorDescontoReal, subtotal: totalCarrinho(), timestampOriginal: Date.now() };
  const _reqVendaCont = { itens: carrinhoAtual.map(i=>[i.produtoId||i.comboId||i.descricao, i.quantidade, i.valorUnitario]), clienteTelefone, tipoEntrega: tipoEntregaAtual, mesaId: mesaEscolhidaId||'', pagamentos: pagamentosParaEnviar };
  ctxCont.reqConteudo = _reqVendaCont; ctxCont.fatorAcr = fatorBaseAcrescimo_(); ctxCont.acrescimo = (tipoEntregaAtual==='Mesa') ? 0 : acrescimoTotalVenda_();
  const _contPrev = !eraMesa && servidorLento_() && podeVenderContingencia_() && valorDescontoReal===0; // BLOCO 1.2
  if(conexaoAtual==='offline' || _contPrev){
    if(eraMesa){ showMsg('vMsg','Sem conexão — o pedido da mesa não foi lançado.','warn'); return; }
    ctxCont.preventivo = _contPrev && conexaoAtual!=='offline';
    const _res = await venderEmContingencia_(ctxCont);
    if(_res !== 'recusou' || conexaoAtual==='offline') return; // recusou no modo preventivo: tenta a planilha mesmo assim
  }
  const acrVenda_ = acrescimoTotalVenda_();
  setBotoesOcupados(true);
  try{
    const payloadVenda_ = { requisicaoId: reqIdPersist_('venda', _reqVendaCont), itens: carrinhoAtual, clienteNome, clienteTelefone, pagamentos: pagamentosParaEnviar, tipoEntrega: tipoEntregaAtual, dadosEntrega, statusPagamento: statusPagamentoParaEnviar, desconto, senhaAdminConfirmacao, origem: (currentUser && currentUser.nivel==='Garçom') ? 'Garçom' : 'Balcão', mesaId: mesaEscolhidaId };
    let r = await apiCall('iniciarVenda', payloadVenda_);
    // o custo do produto mudou enquanto a tela estava aberta (preço de ingrediente/compra): atualiza o custo e tenta de novo, uma vez
    if(r && !r.ok && typeof cfCustoMudou === 'function' && cfCustoMudou(r) && await cfAtualizarCustosItens(carrinhoAtual)) r = await apiCall('iniciarVenda', payloadVenda_);
    if(r.ok){
      reqIdConfirmado_('venda', _reqVendaCont);
      vendas = r.vendas || vendas; itensVenda = r.itensVenda || itensVenda; pagamentosVenda = r.pagamentosVenda || pagamentosVenda;
      if(r.mesas) mesas = r.mesas;
      if(r.fidelidade) fidelidadeClientes = r.fidelidade;
      if(r.clientes) clientes = r.clientes;
      if(r.estoque) estoque = r.estoque;
      salvarCache();
      showMsg('vMsg', eraMesa ? 'Pedido lançado na mesa e enviado à cozinha.' : r.message, 'ok');
      ultimaVendaItens = carrinhoParaComprovante.map(it=>({...it}));
      ultimaVendaCliente = clienteTelefone ? { nome: clienteNome, telefone: clienteTelefone } : null;
      ultimaVendaId = r.id || null;
      if(cpfNota_ && r.id && window.INTEG_ && INTEG_.nfce){ try{ document.getElementById('vCpfNota').value = ''; apiCall('nfceCpf', { vendaId:r.id, cpf:cpfNota_ }).then(x=>{ if(x && !x.ok) showMsg('vMsg', 'Venda registrada, mas o CPF não entrou na nota: ' + (x.message||''), 'warn'); }).catch(()=>{}); }catch(e){} }
      if(!souGarcom_() && !eraMesa) mostrarComprovante(carrinhoParaComprovante, (Number(r.valorTotal)||(total+acrVenda_)), pagamentosParaEnviar.map(p=>({forma:p.forma, valor:(Number(p.valor)||0)+acrescimoForma_(p.forma,p.valor)})), clienteNome, clienteTelefone, totalCarrinho(), valorDescontoReal, null, acrVenda_);
      carrinhoAtual = []; pagamentosAtuais = []; renderCarrinho(); limparClienteVenda();
      limparCamposEntrega();
      setStatusPagamento('Pago');
      setMesaModoPagamento('sair');
      document.getElementById('descValor').value = '';
      setTipoDesconto('percentual');
      atualizarPreviewDesconto();
      pagamentoDividido = false;
      const chkDividido = document.getElementById('pagamentoDivididoToggle');
      if(chkDividido) chkDividido.checked = false;
      const boxSecundaria = document.getElementById('formaSecundariaBox');
      if(boxSecundaria) boxSecundaria.style.display = 'none';
      popularSelectProdutos(); popularSelectCombos();
      renderVendas(); renderStatusCaixa(); renderEstoque(); renderMovimentacoesEstoque(); renderNotificacoes(); renderPedidos(); renderEntregas();
      if(eraMesa){
        setTipoEntrega('Mesa');            // limparCamposEntrega() tinha voltado para Retirada
        if(clienteMesaAntes){ selecionarClienteVenda(clienteMesaAntes.nome, clienteMesaAntes.telefone); clienteMesaCarregadoDe_ = mesaEscolhidaId; }
        renderMesasPickerCaixa();
        const selM = document.getElementById('vMesaSelect');
        if(selM && mesaEscolhidaId) selM.value = mesaEscolhidaId;
        atualizarGarcomMesaInfo();
        mudarPainelCaixa('itens');         // pronto para a próxima rodada da mesma mesa
      } else {
        mudarPainelCaixa('cliente');
      }
    } else { showMsg('vMsg', r.message, 'warn'); }
  } catch(e){
    setBotoesOcupados(false);
    if(podeVenderContingencia_() && valorDescontoReal===0 && tipoEntregaAtual!=='Mesa') await venderEmContingencia_(ctxCont);
    else showMsg('vMsg','Não foi possível registrar a venda.','warn');
  }
  finally { setBotoesOcupados(false); }
}
/* Venda do Caixa em contingência: só Admin/Operador que já fizeram login neste aparelho (têm a chave interna), só retirada/entrega,
   SEM desconto. Vai para a fila da contingência com o mesmo id da tentativa original; a planilha principal confere preço e não duplica. */
function podeVenderContingencia_(){
  try{ return !!(currentUser && ['Admin','Operador'].indexOf(currentUser.nivel)!==-1 && localStorage.getItem(CONTINGENCIA_CHAVE_KEY) && tipoEntregaAtual!=='Mesa' && valorDescontoCalculado()===0); }
  catch(e){ return false; }
}
async function venderEmContingencia_(ctx){
  if(!podeVenderContingencia_()){ showMsg('vMsg','🔴 Sem conexão com o servidor e sem contingência disponível para esta venda (desconto e mesa não são aceitos).','warn'); return; }
  if(!await confirmarTxt_((ctx.preventivo ? 'O servidor está muito lento (2 falhas seguidas).' : 'O servidor não respondeu.') + '\n\nRegistrar esta venda na CONTINGÊNCIA?\n• Ela fica guardada e entra no sistema quando o servidor voltar (o Admin recebe sozinho ao reabrir o app).\n• Estoque, fidelidade e o total do caixa só atualizam depois disso.\n• Não confirme se a venda já apareceu em Vendas.', 'Registrar na contingência', false, 'Servidor sem resposta', 'Não registrar')) return 'recusou';
  const idRequisicao = ctx.reqConteudo ? reqIdPersist_('venda', ctx.reqConteudo) : novaRequisicao_(); // o MESMO id da tentativa ao servidor: se a venda já tinha entrado, a reconciliação não duplica
  const idFila = 'cx-' + idRequisicao.replace(/[^A-Za-z0-9_-]/g,'');
  const itens = ctx.carrinho.map(it=>({ produtoId: it.produtoId||undefined, comboId: it.comboId||undefined, descricao: it.descricao, quantidade: it.quantidade, valorUnitario: it.valorUnitario, custoUnitario: it.custoUnitario||0, adicionaisIds: it.adicionaisIds||[], escolhas: it.escolhas }));
  const dados = { itens, clienteNome: ctx.clienteNome||'', clienteTelefone: ctx.clienteTelefone||'', pagamentos: ctx.pagamentos, tipoEntrega: ctx.tipoEntrega, dadosEntrega: ctx.dadosEntrega, statusPagamento: ctx.statusPagamento, desconto: null, origem: 'Caixa', requisicaoOriginal: idRequisicao, timestampOriginal: ctx.timestampOriginal || Date.now(), emergenciaOperador: (currentUser && currentUser.emergencia) ? currentUser.login : undefined };
  setBotoesOcupados(true);
  try{
    const r = await fetchContingencia_({ method:'post', body: JSON.stringify({ action:'enfileirar', chave: localStorage.getItem(CONTINGENCIA_CHAVE_KEY), id: idFila, tipo:'venda', dados }) }, TIMEOUT_CONT_ENVIO_MS_, TIMEOUT_CONT_REPETICOES_);
    if(!r.ok){
      if(/chave/i.test(r.message||'')) localStorage.removeItem(CONTINGENCIA_CHAVE_KEY); // chave trocada: será buscada de novo no próximo login
      showMsg('vMsg', 'A contingência não aceitou a venda: ' + (r.message||'erro') + ' — nada foi registrado.', 'warn'); return;
    }
    if(ctx.reqConteudo) reqIdConfirmado_('venda', ctx.reqConteudo);
    showMsg('vMsg', '🟠 Venda guardada na CONTINGÊNCIA (código ' + idFila.slice(-6).toUpperCase() + '). Entra no sistema sozinha quando o servidor voltar; confira depois em Vendas.', 'ok');
    if(!souGarcom_()) mostrarComprovante(ctx.carrinho, ctx.total + (ctx.acrescimo||0), ctx.pagamentos.map(p=>({forma:p.forma, valor:(Number(p.valor)||0)+acrescimoForma_(p.forma,p.valor,ctx.fatorAcr)})), ctx.clienteNome, ctx.clienteTelefone, ctx.subtotal, ctx.valorDescontoReal, null, ctx.acrescimo||0);
    carrinhoAtual = []; pagamentosAtuais = []; renderCarrinho(); limparClienteVenda(); limparCamposEntrega();
    setStatusPagamento('Pago'); document.getElementById('descValor').value = ''; setTipoDesconto('percentual'); atualizarPreviewDesconto();
    mudarPainelCaixa('cliente');
  } catch(e){
    if(e && e.timeout) showMsg('vMsg','A contingência não respondeu a tempo. A venda PODE ter sido guardada (código ' + idFila.slice(-6).toUpperCase() + '). Toque em registrar de novo: o mesmo código evita duplicar. Se continuar, anote a venda e lance depois.','warn');
    else showMsg('vMsg','Não foi possível falar nem com a contingência. Nada foi registrado — anote a venda e lance depois.','warn');
  }
  finally { setBotoesOcupados(false); }
}

