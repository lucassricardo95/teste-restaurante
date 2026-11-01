/* ---------- ACOMPANHAMENTO PÚBLICO DO PEDIDO (ITEM 2.4) ----------
   Não depende mais de parâmetro na URL (isso travava o sistema interno
   quando ?pedido= ficava preso num atalho/aba fixa do caixa). O histórico
   de pedidos do cliente fica salvo no localStorage do próprio aparelho
   e é lido quando ele toca em "Acompanhe seu pedido" no rodapé. */
const HISTORICO_PEDIDOS_CLIENTE_KEY = 'txb_historico_pedidos_cliente';
const ETAPAS_PEDIDO = ['Recebido','Aceito/Em preparo','Pronto/Saiu pra entrega','Entregue/Retirado'];
let acompanhamentoIntervalId = null;

function salvarPedidoNoHistoricoCliente(codigo, nomeCliente, numero){
  if(!codigo) return;
  try{
    const historico = lerHistoricoPedidosCliente();
    if(!historico.some(p=>p.codigo===codigo)){
      historico.unshift({ codigo, nome: nomeCliente || '', numero: numero || 0, timestamp: Date.now() });
      localStorage.setItem(HISTORICO_PEDIDOS_CLIENTE_KEY, JSON.stringify(historico.slice(0,20)));
    }
  } catch(e){ /* localStorage indisponível — o cliente só não verá o histórico depois */ }
}
function lerHistoricoPedidosCliente(){
  try{
    const raw = localStorage.getItem(HISTORICO_PEDIDOS_CLIENTE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e){ return []; }
}
function etapaAtualPedido(r){
  if(r.status==='Cancelada') return -1;
  if(r.statusPedido==='Recebido') return 0;
  if(r.statusPedido==='Em preparo' || r.statusPedido==='Suspenso') return 1;
  if(r.statusPedido==='Pronta' || r.statusPedido==='Saiu para entrega') return 2;
  if(r.statusPedido==='Entregue' || r.statusPedido==='Retirada' || r.statusPedido==='Servida') return 3;
  return 0;
}
function abrirAcompanhamentoPedido(){
  const historico = lerHistoricoPedidosCliente();
  document.getElementById('acompanhamentoConteudo').innerHTML = '<p class="sub">Carregando...</p>';
  document.getElementById('acompanhamentoPedido').classList.add('open');
  if(!historico.length){
    document.getElementById('acompanhamentoConteudo').innerHTML = '<p class="sub">Nenhum pedido encontrado neste aparelho. O acompanhamento funciona no mesmo navegador usado pra fazer o pedido.</p>';
    return;
  }
  if(historico.length === 1){ abrirStatusPedido(historico[0].codigo); return; }
  mostrarListaPedidosCliente(historico);
}
function mostrarListaPedidosCliente(historico){
  if(acompanhamentoIntervalId){ clearInterval(acompanhamentoIntervalId); acompanhamentoIntervalId = null; }
  const linhas = historico.map(p=>{
    const data = new Date(p.timestamp).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
    return `<button class="ghost" style="display:block;width:100%;text-align:left;margin-bottom:8px;" onclick="abrirStatusPedido('${p.codigo}')">Pedido ${p.numero?('nº '+p.numero):('#'+p.codigo)} — ${data}</button>`;
  }).join('');
  document.getElementById('acompanhamentoConteudo').innerHTML = `<h2>Seus pedidos</h2><p class="sub">Toque num pedido pra ver o status.</p>${linhas}`;
}
function abrirStatusPedido(codigo){
  if(acompanhamentoIntervalId){ clearInterval(acompanhamentoIntervalId); acompanhamentoIntervalId = null; }
  carregarStatusPedido(codigo);
  acompanhamentoIntervalId = setInterval(()=>{ if(!document.hidden) carregarStatusPedido(codigo); }, 20000);
}
/* ITEM 12 — botão de voltar à lista (só quando há mais de um pedido neste aparelho) */
function acompanhamentoVoltarHtml_(){
  return lerHistoricoPedidosCliente().length > 1
    ? '<button type="button" class="ac-voltar" onclick="voltarParaListaPedidos()">← Todos os pedidos</button>'
    : '';
}
function voltarParaListaPedidos(){
  mostrarListaPedidosCliente(lerHistoricoPedidosCliente()); // já para a atualização automática
}
async function carregarStatusPedido(codigo){
  const box = document.getElementById('acompanhamentoConteudo');
  const voltar = acompanhamentoVoltarHtml_();
  try{
    const r = await apiCall('getStatusPedidoPublico', { codigo });
    if(!r.ok){ if(acompanhamentoIntervalId){ clearInterval(acompanhamentoIntervalId); acompanhamentoIntervalId = null; } box.innerHTML = voltar + '<p class="sub">'+escH(r.message||'Pedido não encontrado.')+'</p>'; return; }
    if(r.status==='Cancelada'){
      box.innerHTML = voltar + `<h2>Pedido cancelado</h2><p class="sub">${escH(r.motivoCancelamento || 'Esse pedido foi cancelado.')}</p>`;
      return;
    }
    const etapa = etapaAtualPedido(r);
    const linhasEtapas = ETAPAS_PEDIDO.map((nome,i)=>`<div class="obs-line" style="color:${i<=etapa?'var(--gold)':'var(--muted)'};font-weight:${i===etapa?'700':'400'};">${i<=etapa?'✅':'⬜'} ${nome}</div>`).join('');
    const aReceber = r.statusPagamento==='A Receber' ? '<p class="sub mt-2">💰 Pagamento a combinar na entrega/retirada.</p>' : '<p class="sub mt-2">✅ Pagamento confirmado.</p>';
    box.innerHTML = voltar + `<h2>Pedido${r.numero?' nº '+r.numero:''} de ${escH(r.clienteNome||'você')}</h2>
      <p class="sub">${escH(r.itens.join(', '))}</p>
      <p class="sub">Total: <b class="txt-ouro">${formatarMoeda(r.valorTotal)}</b></p>
      <div class="mt-3">${linhasEtapas}</div>
      ${aReceber}
      <div id="acLocal"></div>
      ${window.chatPublicoLigado_===true ? `<div class="mt-3"><button type="button" class="ghost" onclick="abrirAjudaPedidoDoAcompanhamento_('${codigo}','${String(r.numero||'').replace(/\D/g,'')}')">🆘 Preciso de ajuda</button></div>` : ''}
      ${r.podeCancelar ? `<div class="mt-3"><button type="button" class="ghost" id="acCancelarBtn" onclick="cancelarPedidoPeloCliente('${codigo}')">✖ Cancelar pedido (<span id="acCancelarSeg">${r.segundosParaCancelar}</span>s)</button><p class="sub mt-2">Você pode cancelar nos primeiros 3 minutos, enquanto o restaurante ainda não aceitou.</p><div id="acCancelarMsg" class="msg"></div></div>` : ''}`;
    iniciarContagemCancelar_(r.podeCancelar ? r.segundosParaCancelar : 0);
    if(window.acLocalAtualizar_) acLocalAtualizar_(codigo, r);
  } catch(e){ box.innerHTML = voltar + '<p class="sub">Não foi possível atualizar agora. Tentando de novo em instantes...</p>'; }
}
/* ITEM 3.4 — cliente cancela o próprio pedido (cardápio comum). O servidor é quem decide (status, 3 min, limite por telefone). */
let _acCancelarTimer_ = null;
function iniciarContagemCancelar_(seg){
  if(_acCancelarTimer_){ clearInterval(_acCancelarTimer_); _acCancelarTimer_ = null; }
  if(!seg) return;
  let resta = seg;
  _acCancelarTimer_ = setInterval(()=>{
    resta--;
    const el = document.getElementById('acCancelarSeg');
    if(!el || resta <= 0){ clearInterval(_acCancelarTimer_); _acCancelarTimer_ = null; const b = document.getElementById('acCancelarBtn'); if(b) b.parentElement.remove(); return; }
    el.textContent = resta;
  }, 1000);
}
let _acCancelando_ = false;
async function cancelarPedidoPeloCliente(codigo){
  if(_acCancelando_) return;
  if(!await confirmarTxt_('Cancelar este pedido?')) return;
  _acCancelando_ = true;
  const btn = document.getElementById('acCancelarBtn'); if(btn) btn.disabled = true;
  try{
    const r = await apiCall('cancelarPedidoCardapioPublico', { codigo });
    if(r && r.ok){ iniciarContagemCancelar_(0); await carregarStatusPedido(codigo); }
    else { showMsg('acCancelarMsg', (r && r.message) || 'Não foi possível cancelar. Ligue para o restaurante.', 'warn'); if(btn) btn.disabled = false; }
  } catch(e){ showMsg('acCancelarMsg', 'Sem conexão agora. Tente de novo ou ligue para o restaurante.', 'warn'); if(btn) btn.disabled = false; }
  finally{ _acCancelando_ = false; }
}
function voltarParaCardapio(){
  iniciarContagemCancelar_(0);
  if(acompanhamentoIntervalId){ clearInterval(acompanhamentoIntervalId); acompanhamentoIntervalId = null; }
  document.getElementById('acompanhamentoPedido').classList.remove('open');
}
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape' && document.getElementById('acompanhamentoPedido').classList.contains('open')) voltarParaCardapio();
});
function mostrarLinkAcompanhamento(vendaId, nomeCliente, numero){
  if(!vendaId) return;
  const codigo = vendaId.slice(-8);
  salvarPedidoNoHistoricoCliente(codigo, nomeCliente, numero);
}
/* ---------- CACHE DO CARDÁPIO NO CELULAR (Etapa 2) ----------
   Abre na hora com o último cardápio salvo e atualiza em segundo plano. Preço e disponibilidade são
   sempre conferidos pelo servidor quando o pedido é enviado, então um cache velho nunca vende errado. */
const CD_CACHE_KEY_ = 'cdCache_v1';
function cdLerCache_(){ try{ const r = JSON.parse(localStorage.getItem(CD_CACHE_KEY_)||'null'); return (r && r.dados && r.dados.produtos) ? r : null; }catch(e){ return null; } }
function cdSalvarCache_(dados){ try{ localStorage.setItem(CD_CACHE_KEY_, JSON.stringify({ t: Date.now(), dados })); }catch(e){} }
/* Busca o cardápio no Supabase (o caminho antigo, pela planilha, foi retirado). */
async function cdBuscarGet_(versaoAtual){
  const d = await sbCardapioPublico_(); if(d && d.manutencao){ mostrarManutencao_(d.message); throw new Error('manutencao'); } if(!d || !d.produtos) throw new Error('Resposta inválida'); return d;
}
/* Estado mostrado ao cliente: cardápio fechado pelo restaurante (mensagem dele) > caixa fechado > aberto. */
function cdStatusTexto_(){
  if(cdDados && cdDados.cardapioBloqueio && !mesaQr) return '🔴 ' + cdDados.cardapioBloqueio;
  return cdDados && cdDados.caixaAberto ? '🟢 Estamos abertos' : '🔴 Estamos fechados no momento';
}
function cdPintar_(deCache){
  document.getElementById('cdStatusCaixa').textContent = modoContingenciaAtivo ? '🟠 Estamos com instabilidade — seu pedido pode demorar um pouco mais pra ser confirmado' : (deCache ? '⏳ Atualizando…' : cdStatusTexto_());
  if(cdDados.config){
    document.getElementById('cdKicker').textContent = cdDados.config.kicker;
    document.getElementById('cdFrase').textContent = cdDados.config.frase;
    try{ cdRenderFaixaPromo_(); }catch(e){}
    const infoEl = document.getElementById('cdInfoRestaurante'), infoH = cdInfoRestauranteHtml_(cdDados.config.restaurante);
    if(infoEl){ infoEl.innerHTML = infoH; infoEl.style.display = infoH ? '' : 'none'; }
  }
  renderCdCategorias();
  renderCdSecoes();
  if(!deCache) { try{ cdOferecerCarrinhoSalvo_(); }catch(e){} }
  const selForma = document.getElementById('cdFormaPagamento');
  const formaAtual = selForma.value;
  selForma.innerHTML = (cdDados.formasPagamento||[]).map(f=>`<option value="${f.id}">${escH(f.nome)}</option>`).join('');
  if(formaAtual && Array.from(selForma.options).some(o=>o.value===formaAtual)) selForma.value = formaAtual;
  onMudarFormaPagamentoCd(); cdRenderFormas_();
  if(mesaQr && !_modoMesaIniciado){ _modoMesaIniciado = true; iniciarModoMesa_(); }
}
/* Visitas ao cardápio: 1 por aparelho por dia. Aparelho que já entrou no sistema interno (equipe) nunca conta. */
function cdContarVisita_(){
  setTimeout(async ()=>{
    try{
      if(typeof currentUser !== 'undefined' && currentUser) return;
      if(localStorage.getItem('cdAparelhoEquipe') === '1' || localStorage.getItem(SESSAO_KEY)) return;
      const hoje = dataLocalISO(new Date());
      if(localStorage.getItem('cdVisitaDia') === hoje) return;
      let ap = localStorage.getItem('cdAparelhoId');
      if(!ap || !/^[a-z0-9]{16,40}$/.test(ap)){ ap = Array.from(crypto.getRandomValues(new Uint8Array(12)), b=>b.toString(16).padStart(2,'0')).join(''); localStorage.setItem('cdAparelhoId', ap); }
      const r = await sbRpcPublico_('api_registrar_visita_cardapio', { p:{ aparelho: ap } });
      if(r && r.ok) localStorage.setItem('cdVisitaDia', hoje);
    }catch(e){}
  }, 3000);
}
async function carregarCardapioPublico(){
  cdMpConfigPublica_().then(()=>{ try{ cdRenderFormas_(); onMudarFormaPagamentoCd(); }catch(e){} });
  if(!window._cdVisitaChamada_){ window._cdVisitaChamada_ = true; cdContarVisita_(); }
  try{ if(!mesaQr && window.cdCapturarLocalSilenciosa_) window.cdCapturarLocalSilenciosa_(); }catch(e){}
  if(!window._cdAvisosChamado_){ window._cdAvisosChamado_ = true; setTimeout(()=>{ if(window.cdAvisosIniciar_) window.cdAvisosIniciar_(); }, 1200); }
  const cache = cdLerCache_();
  if(cache){ cdDados = cache.dados; modoContingenciaAtivo = false; cdPintar_(true); }
  try{
    const fresco = await cdBuscarGet_(cache && cache.dados ? cache.dados.versao : '');
    if(fresco.igual){ // ITEM 18: nada mudou no servidor — não redesenha (evita "pulo" na rolagem), só confirma aberto/fechado
      modoContingenciaAtivo = false;
      document.getElementById('cdStatusCaixa').textContent = cdStatusTexto_();
      return;
    }
    cdDados = fresco; modoContingenciaAtivo = false;
    cdSalvarCache_(fresco);
    cdPintar_(false);
    return;
  } catch(e){ /* principal fora do ar: tenta a contingência abaixo */ }
  const semCardapio = ()=>{ if(!cache) document.getElementById('cdListaProdutos').innerHTML = '<p class="sub">Não foi possível carregar o cardápio agora. Tente novamente em instantes.</p>'; };
  try{
    const rEspelho = await fetchContingencia_({
      method: 'post', body: JSON.stringify({ action: 'getEspelhoPublico', chave: CONTINGENCIA_CHAVE_PUBLICA })
    }, TIMEOUT_CONT_LEITURA_MS_, 0);
    if(!rEspelho.ok || !rEspelho.espelho || !rEspelho.espelho.produtos){ semCardapio(); return; }
    cdDados = adaptarEspelhoParaCardapio(rEspelho.espelho);
    modoContingenciaAtivo = true;
    setConexaoStatus('contingencia');
  } catch(e2){ semCardapio(); return; }
  cdPintar_(false);
}
/* Transforma o espelho (dados brutos das tabelas) no mesmo formato que
   getCardapioPublico() devolveria — pra reaproveitar toda a renderização
   do cardápio sem precisar de uma versão paralela dela. */
function adaptarEspelhoParaCardapio(espelho){
  const categorias = (espelho.categorias||[]).filter(c=>c.ativa);
  const usaReserva = x => Object.assign({}, x, { fotoUrl: x.fotoReservaId ? ('https://drive.google.com/uc?export=view&id=' + x.fotoReservaId) : (x.fotoUrl || '') });
  const produtos = (espelho.produtos||[]).filter(p=>p.ativo).sort((a,b)=>(a.ordemCardapio||0)-(b.ordemCardapio||0)).map(usaReserva);
  const combos = (espelho.combos||[]).filter(c=>c.ativo).sort((a,b)=>(a.ordemCardapio||0)-(b.ordemCardapio||0)).map(usaReserva);
  const formasPagamento = (espelho.formasPagamento||[]).filter(f=>f.ativa && f.visivelCardapio);
  return {
    categorias, produtos, combos, formasPagamento,
    produtoPrecos: espelho.produtoPrecos||[], comboPrecos: espelho.comboPrecos||[],
    adicionais: (espelho.adicionais||[]).filter(a=>a.ativo), produtoAdicionais: espelho.produtoAdicionais||[], comboItens: espelho.comboItens||[],
    maisPedidos: [], esgotados: { produtos: [], combos: [] }, config: espelho.configCardapio || { kicker:'', frase:'' },
    caixaAberto: true,
    cardapioBloqueio: cdBloqueioDoEspelho_((espelho.configCardapio||{}).fechamento)
  };
}
/* Contingência: o espelho leva as regras de fechamento; a data é conferida no aparelho (o servidor não está disponível). */
function cdBloqueioDoEspelho_(f){
  try{
    if(!f) return '';
    if(f.manual && String(f.manual.ativo)==='true') return String(f.manual.mensagem||'').trim() || 'Estamos fechados no momento. Voltamos em breve!';
    const hoje = new Date(Date.now()-3*3600000).toISOString().slice(0,10);
    const p = (f.periodos||[]).find(x=>String(x.inicio).slice(0,10) <= hoje && hoje <= String(x.fim).slice(0,10));
    return p ? (String(p.mensagem||'').trim() || 'Estamos fechados neste período. Voltamos em breve!') : '';
  }catch(e){ return ''; }
}

function renderCdCategorias(){
  const cont = document.getElementById('cdCategorias');
  const cats = cdDados.categorias || [];
  cont.innerHTML = '<button class="'+(cdCategoriaAtiva==='todas'?'active':'')+'" onclick="selecionarCdCategoria(\'todas\')">Todas</button>' +
    cats.map(c=>`<button class="${cdCategoriaAtiva===c.id?'active':''}" onclick="selecionarCdCategoria('${c.id}')">${escH(c.nome)}</button>`).join('');
  if(!cont._bordasOk){
    cont._bordasOk = true;
    cont.addEventListener('scroll', cdAtualizarBordasCategorias_, { passive:true });
    window.addEventListener('resize', cdAtualizarBordasCategorias_);
  }
  // centraliza a categoria escolhida (só na própria barra, sem rolar a página)
  const ativo = cont.querySelector('button.active');
  if(ativo){ cont.scrollTo({ left: Math.max(0, ativo.offsetLeft - (cont.clientWidth - ativo.offsetWidth)/2), behavior:'smooth' }); }
  cdAtualizarBordasCategorias_();
  setTimeout(cdAtualizarBordasCategorias_, 300); // depois que a fonte carrega e o layout assenta
}
function cdAtualizarBordasCategorias_(){
  const c = document.getElementById('cdCategorias'); if(!c) return;
  const max = c.scrollWidth - c.clientWidth;
  c.style.setProperty('--fade-esq', c.scrollLeft > 4 ? '30px' : '0px');
  c.style.setProperty('--fade-dir', (max > 4 && c.scrollLeft < max - 4) ? '30px' : '0px');
}
function selecionarCdCategoria(id){ cdCategoriaAtiva = id; renderCdCategorias(); renderCdSecoes(); }

/* ===================================================================================================
   MERCADO PAGO — pagamento pelo site (Pix e cartão). Visual igual ao da Prévia_Mercado_Pago.html (estilo-16-pagamento.css).
   Com o Mercado Pago desligado nada disto aparece: a tela de pagamento fica como era.
   =================================================================================================== */
let cdMpConfig_ = null;
let cdMpReservaAtiva_ = '';
let cdMpUltimaReserva_ = '';
let cdMpUltimoMetodo_ = '';
let cdMpTimer_ = null;          // próxima consulta do status
let cdMpCron_ = null;           // relógio de 15:00 do Pix
let cdMpPollId_ = 0;            // cada consulta confere se ainda é a "vez" dela (fechar a janela invalida a consulta em andamento)
let cdMpBrickController_ = null;
let cdMpPagamentoEmAndamento_ = false;
const cdMpR_ = v => formatarMoeda(Number(v) || 0);
async function cdMpConfigPublica_(){
  if(cdMpConfig_ && cdMpConfig_.ligado) return cdMpConfig_;
  try { cdMpConfig_ = await sbRpcPublico_('api_mp_config_publica', { p:{} }); }
  catch(e){ cdMpConfig_ = { ok:false, ligado:false }; }
  return cdMpConfig_ || { ligado:false };
}
function cdMpTipoForma_(id){
  if(!cdMpConfig_ || !cdMpConfig_.ligado) return '';
  const fs = Array.isArray(cdMpConfig_.formas) ? cdMpConfig_.formas : [];
  const f = fs.find(x=>String(x.id)===String(id)); return f ? String(f.tipo||'') : '';
}
/* v1.15: quem recebe a forma online (Mercado Pago ou InfinitePay) */
function cdPagProvedor_(id){
  const fs = (cdMpConfig_ && cdMpConfig_.ligado && Array.isArray(cdMpConfig_.formas)) ? cdMpConfig_.formas : [];
  const f = fs.find(x=>String(x.id)===String(id)); return f ? String(f.provedor||'mercadopago') : '';
}
function cdMpAtivo_(){ return !!(cdMpConfig_ && cdMpConfig_.ligado && cdDados && (cdDados.formasPagamento||[]).some(f=>cdMpTipoForma_(f.id))); }

/* ---------- escolha da forma de pagamento (botões agrupados, como na prévia) ---------- */
function cdFormaIcone_(f, online){
  const n = String(f.nome||'').toLowerCase();
  if(/pix/.test(n)) return '◈'; if(/dinheiro/.test(n)) return '$'; if(/alelo|vale|refei/.test(n)) return '▥';
  if(/cart|déb|deb|créd|cred|maquin/.test(n)) return online ? '▭' : '▤'; return '●';
}
function cdRenderFormas_(){
  const box = document.getElementById('cdFormasBox'), sel = document.getElementById('cdFormaPagamento'); if(!box || !sel) return;
  /* v1.24: os botões valem SEMPRE (não só com pagamento pelo site): a lista nativa (select) falhava em alguns celulares,
     principalmente no navegador do Instagram no iPhone, e o cliente não conseguia trocar a forma depois de aplicar o cupom. */
  const usar = !(typeof mesaQr !== 'undefined' && mesaQr);
  sel.classList.toggle('mp-oculto', !!usar);
  box.style.display = usar ? '' : 'none';
  if(!usar){ box.innerHTML = ''; return; }
  const fs = cdDados.formasPagamento || [], atual = sel.value;
  const online = fs.filter(f=>cdMpTipoForma_(f.id)), entrega = fs.filter(f=>!cdMpTipoForma_(f.id));
  const cupF = cdCupomFormas_();   // cupom que vale só em algumas formas: marca onde ele vale
  const tagCupom = f => cupF.length ? (cupF.indexOf(String(f.id)) !== -1 ? '<span class="mp-tag mp-tag-cupom">🎟️ cupom vale</span>' : '<span class="mp-tag off mp-tag-semcupom">sem cupom</span>') : '';
  const btn = (f, on)=>`<button type="button" class="mp-forma" data-id="${escH(f.id)}" aria-pressed="${String(f.id)===String(atual)}" onclick="cdEscolherForma_(this.dataset.id)"><span class="mp-ico" aria-hidden="true">${cdFormaIcone_(f,on)}</span><span class="mp-txt">${escH(f.nome)}<small>${on ? (cdPagProvedor_(f.id)==='infinitepay' ? 'Pague no site da InfinitePay' : cdMpTipoForma_(f.id)==='pix' ? 'Pague agora pelo site' : 'Digite o cartão aqui no site') : 'Pague ao receber'}</small></span>${tagCupom(f) || `<span class="mp-tag${on?'':' off'}">${on?'Online':'Na entrega'}</span>`}</button>`;
  const cupNomes = (cdCupomAplicado && cdCupomAplicado.formasNomes) || (_cdCupomFormasPend_ && _cdCupomFormasPend_.formasNomes) || '';
  const avisoCupom = (cupF.length && cupF.indexOf(String(atual)) === -1 && cupNomes)
    ? '<div class="msg warn" role="alert" style="display:block;margin:6px 0 4px;">⚠️ Seu cupom vale só pagando em <b>' + escH(cupNomes) + '</b>. Escolha uma dessas formas para ganhar o desconto.</div>' : '';
  box.innerHTML = avisoCupom + (online.length ? '<p class="mp-grupo">Pagar agora, pelo site</p>' + online.map(f=>btn(f,true)).join('') : '')
    + (entrega.length ? '<p class="mp-grupo">Pagar na entrega</p>' + entrega.map(f=>btn(f,false)).join('') : '');
}
function cdEscolherForma_(id){
  const sel = document.getElementById('cdFormaPagamento'); if(!sel) return;
  sel.value = id; onMudarFormaPagamentoCd(); cdRenderFormas_();
}
/* Resumo do pedido (itens, entrega, total) logo acima das formas — só quando o pagamento pelo site existe */
function cdRenderResumoPag_(){
  const el = document.getElementById('cdResumoPag'); if(!el) return;
  if(!cdMpAtivo_() || !cdCarrinho.length || (typeof mesaQr !== 'undefined' && mesaQr)){ el.style.display = 'none'; el.innerHTML = ''; return; }
  const n = cdCarrinho.reduce((s,it)=>s+it.qtd,0), taxa = taxaEntregaCdAtual(), desc = Number(cdCupomAplicado && cdCupomAplicado.desconto || 0), acr = acrescimoCdAtual_();
  const entrega = document.getElementById('cdTipoEntrega') && document.getElementById('cdTipoEntrega').value === 'Entrega';
  const linhas = [`<div><span>${n} ${n===1?'item':'itens'}</span><span>${cdMpR_(subtotalCarrinhoCd())}</span></div>`];
  if(entrega) linhas.push(`<div><span>Entrega</span><span>${taxa>0 ? cdMpR_(taxa) : 'Grátis'}</span></div>`);
  if(desc>0) linhas.push(`<div><span>Cupom</span><span>− ${cdMpR_(desc)}</span></div>`);
  if(acr>0) linhas.push(`<div><span>Acréscimo da forma</span><span>${cdMpR_(acr)}</span></div>`);
  linhas.push(`<div class="mp-tot"><span>Total</span><span>${cdMpR_(Math.max(0.01,totalCarrinhoCd()))}</span></div>`);
  const precisaLogin = cdMpTipoForma_(cdFormaAtualId_()) && !(window.contaSessaoAtiva_ && window.contaSessaoAtiva_());
  el.innerHTML = '<div class="mp-resumo mp-num">' + linhas.join('') + '</div>'
    + (precisaLogin ? '<p class="mp-aviso">Para pagar pelo site, entre com a sua conta. Na entrega não precisa.</p>' : '');
  el.style.display = '';
}
function cdRotuloEnviar_(){
  if((typeof mesaQr !== 'undefined' && mesaQr) || !cdMpAtivo_()) return 'Enviar pedido';
  const t = cdMpTipoForma_(cdFormaAtualId_()), tot = cdMpR_(Math.max(0.01, totalCarrinhoCd()));
  return t==='pix' ? 'Pagar com Pix · ' + tot : (t==='credito' || t==='debito') ? 'Pagar com cartão · ' + tot : 'Enviar pedido (pagar na entrega)';
}
function cdAtualizarBotaoEnviar_(){ const b = document.getElementById('cdEnviarPedidoBtn'); if(b && !b.disabled) b.textContent = cdRotuloEnviar_(); }

/* ---------- janela do pagamento ---------- */
function cdMpParar_(){
  cdMpPollId_++;
  if(cdMpTimer_){ clearTimeout(cdMpTimer_); cdMpTimer_ = null; }
  if(cdMpCron_){ clearInterval(cdMpCron_); cdMpCron_ = null; }
}
function cdMpMostrarModal_(html, aoFechar){
  let m = document.getElementById('cdMpPagamentoModal');
  if(!m){ m = document.createElement('div'); m.id = 'cdMpPagamentoModal'; m.className = 'modal-overlay mp-overlay'; m.style.zIndex = '100100'; m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true'); document.body.appendChild(m); }
  m.innerHTML = '<div class="modal-box mp-box"><button type="button" class="mp-fechar" aria-label="Fechar" onclick="' + (aoFechar || 'cdMpFecharPagamento_(true)') + '">✕</button><section class="mp-tela" id="cdMpPagamentoConteudo">' + html + '</section></div>';
  m.classList.add('open');
}
function cdMpFecharPagamento_(cancelar){
  const m = document.getElementById('cdMpPagamentoModal'); if(m) m.classList.remove('open');
  cdMpParar_();
  if(cdMpBrickController_){ try{ cdMpBrickController_.unmount(); }catch(e){} cdMpBrickController_ = null; }
  if(cancelar && cdMpReservaAtiva_ && !cdMpPagamentoEmAndamento_) cdMpCancelarReserva_(cdMpReservaAtiva_);
}
/* fecha tudo depois de um pedido já registrado (aprovado ou em conferência): o carrinho é limpo ao fechar o carrinho */
function cdMpFinalizar_(){ cdMpFecharPagamento_(false); fecharCarrinhoPublico(); }
async function cdMpRpcCliente_(fn, payload){
  const tok = window.contaTokenOuNull_ ? await window.contaTokenOuNull_() : null;
  if(!tok) throw new Error('Entre na sua conta para pagar pelo site.');
  const r = await sbJson_(SUPABASE_URL_+'/rest/v1/rpc/'+fn,{method:'POST',headers:{'apikey':SUPABASE_CHAVE_,'Authorization':'Bearer '+tok,'Content-Type':'application/json'},body:JSON.stringify({p:payload||{}})},30000);
  const j = await r.json().catch(()=>null);
  if(!r.ok) throw new Error((j&&j.message)||'Não foi possível iniciar o pagamento.');
  return j||{};
}
async function cdMpCancelarReserva_(id){
  try{ await cdMpRpcCliente_('api_mp_cancelar_reserva',{reservaId:id}); }catch(e){}
  if(cdMpReservaAtiva_===id) cdMpReservaAtiva_='';
}
function cdMpPayloadPedido_(nome,telefone,tipoEntrega,dadosEntrega,trocoParaObs){
  const itens=cdCarrinho.map(it=>({produtoId:it.tipo==='produto'?it.id:undefined,comboId:it.tipo==='combo'?it.id:undefined,quantidade:it.qtd,adicionaisIds:it.adicionais.map(a=>a.id),escolhas:cdEscolhasPayload_(it),observacao:it.obs||''}));
  const brindes=cdBrindes_().map(b=>({tipo:b.tipo,id:b.id,produtoId:b.produtoId}));
  return {requisicaoId:reqIdPersist_('mp_pedido_cardapio',{itens,telefone,forma:cdFormaAtualId_(),tipoEntrega}),itens,clienteNome:nome,clienteTelefone:telefone,tipoEntrega,dadosEntrega,formaPagamentoId:cdFormaAtualId_(),observacaoTroco:trocoParaObs||'',codigoCupom:cdCupomAplicado?cdCupomAplicado.codigo:'',beneficios:brindes,observacoes:(document.getElementById('cdObservacoes')||{}).value.trim()};
}

/* ---------- telas (iguais às da prévia) ---------- */
const CD_MP_SVG_OK_ = '<svg viewBox="0 0 24 24" fill="none" stroke="#6dbb2e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const CD_MP_SVG_RELOGIO_ = '<svg viewBox="0 0 24 24" fill="none" stroke="#e0b53a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';
function cdMpTelaPix_(pag, expiraEm){
  const b64 = String(pag.pix.qrBase64 || ''), qr = /^[A-Za-z0-9+\/=]+$/.test(b64) && b64 ? '<div class="mp-qr"><img alt="QR Code do Pix" src="data:image/png;base64,' + b64 + '"></div>' : '';
  cdMpMostrarModal_('<h2 class="mp-topo">Pague com Pix</h2><p class="mp-sub">Abra o app do seu banco, escolha Pix e leia o código ou cole o copia-e-cola.</p>' + qr
    + '<div class="mp-timer" id="cdMpTimerBox">Este código vale por<b class="mp-num" id="cdMpCron">--:--</b></div>'
    + '<div class="mp-copia" id="cdMpCopiaCola">' + escH(pag.pix.copiaCola) + '</div>'
    + '<button type="button" class="mp-btn" id="cdMpCopiarBtn" onclick="cdMpCopiar_()">Copiar código Pix</button><div class="msg" id="cdMpMsg"></div>'
    + '<div class="mp-status" role="status"><span class="mp-dot" id="cdMpDot"></span><span id="cdMpStatusTxt">Aguardando o pagamento…</span></div>'
    + '<p class="mp-nota">Assim que você pagar, esta tela muda sozinha. Seu pedido só vai para a cozinha depois da confirmação.</p>'
    + '<button type="button" class="mp-btn mp-sec" onclick="cdMpFecharPagamento_(true)">Cancelar pagamento</button>');
}
function cdMpCopiar_(){
  const el = document.getElementById('cdMpCopiaCola'), b = document.getElementById('cdMpCopiarBtn'); if(!el) return;
  copiarTextoComFallback(el.textContent, 'cdMpMsg');
  if(b){ b.textContent = 'Código copiado'; setTimeout(()=>{ const x = document.getElementById('cdMpCopiarBtn'); if(x) x.textContent = 'Copiar código Pix'; }, 1600); }
}
function cdMpCronometro_(fim){
  if(cdMpCron_){ clearInterval(cdMpCron_); cdMpCron_ = null; }
  const cron = document.getElementById('cdMpCron'), caixa = document.getElementById('cdMpTimerBox');
  if(!cron || !(fim > 0)){ if(caixa) caixa.style.display = 'none'; return; }
  const pintar = ()=>{
    const e = document.getElementById('cdMpCron'); if(!e){ clearInterval(cdMpCron_); cdMpCron_ = null; return; }
    const s = Math.max(0, Math.ceil((fim - Date.now())/1000));
    e.textContent = String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0');
    if(s === 0){ clearInterval(cdMpCron_); cdMpCron_ = null; const t = document.getElementById('cdMpStatusTxt'); if(t) t.textContent = 'Este código venceu. Se você acabou de pagar, aguarde alguns segundos.'; const d = document.getElementById('cdMpDot'); if(d) d.style.display = 'none'; }
  };
  pintar(); cdMpCron_ = setInterval(pintar, 1000);
}
function cdMpTelaConferindo_(){
  cdMpParar_(); cdMpReservaAtiva_ = ''; cdMpPagamentoEmAndamento_ = false; cdPedidoConcluido = true;
  cdMpMostrarModal_('<div class="mp-ok mp-relogio">' + CD_MP_SVG_RELOGIO_ + '</div><h2 class="mp-topo mp-centro">Pagamento recebido</h2><p class="mp-sub mp-centro">O restaurante está conferindo o seu pedido (por exemplo, o estoque ou o horário). Você não precisa pagar de novo. Se demorar, fale com o restaurante pelo WhatsApp.</p><button type="button" class="mp-btn" onclick="cdMpFinalizar_()">Fechar</button>', 'cdMpFinalizar_()');
}
function cdMpTelaFalha_(texto){
  cdMpParar_(); cdMpPagamentoEmAndamento_ = false;
  cdMpMostrarModal_('<h2 class="mp-topo">Pagamento não concluído</h2><p class="mp-sub">' + escH(texto) + '</p><button type="button" class="mp-btn" onclick="cdMpFecharPagamento_(true)">Escolher outra forma de pagamento</button>');
}
function cdMpTelaAguardando_(desafioUrl){
  cdMpMostrarModal_('<h2 class="mp-topo">Confirmando o pagamento</h2>'
    + (desafioUrl ? '<p class="mp-sub">O seu banco pede uma confirmação. Toque no botão, confirme no app ou site do banco e volte aqui.</p><a class="mp-btn" href="' + escH(desafioUrl) + '" target="_blank" rel="noopener">Confirmar com o meu banco</a>' : '<p class="mp-sub">Estamos confirmando o pagamento com o Mercado Pago. Não faça outro pagamento enquanto verificamos.</p>')
    + '<div class="mp-status" role="status"><span class="mp-dot"></span><span id="cdMpStatusTxt">Aguardando a confirmação…</span></div>'
    + '<button type="button" class="mp-btn mp-sec" onclick="cdMpFecharPagamento_(false)">Fechar (o pedido segue em Minha conta)</button>', 'cdMpFecharPagamento_(false)');
}

/* ---------- acompanhar o pagamento: pergunta à função mp-status (que também consulta o Mercado Pago) e, se ela falhar, ao banco ---------- */
async function cdMpConsultar_(reservaId){
  const tok = window.contaTokenOuNull_ ? await window.contaTokenOuNull_() : null;
  if(!tok) throw new Error('sessão');
  try{
    const rr = await sbJson_(SUPABASE_URL_+'/functions/v1/mp-status',{method:'POST',headers:{'apikey':SUPABASE_CHAVE_,'Authorization':'Bearer '+tok,'Content-Type':'application/json'},body:JSON.stringify({reservaId})},20000);
    const j = await rr.json().catch(()=>null);
    if(rr.ok && j && j.ok && j.estado) return j;
  }catch(e){}
  return await cdMpRpcCliente_('api_mp_status_pagamento',{reservaId});
}
function cdMpAcompanhar_(reservaId, expiraEm){
  const meu = ++cdMpPollId_; if(cdMpTimer_){ clearTimeout(cdMpTimer_); cdMpTimer_ = null; }
  const fim = Date.parse(expiraEm || '') || 0;
  const passo = async ()=>{
    if(meu !== cdMpPollId_) return;
    let r = null; try{ r = await cdMpConsultar_(reservaId); passo.falhas = 0; }catch(e){ passo.falhas = (passo.falhas || 0) + 1; }
    if(meu !== cdMpPollId_) return;      // a janela foi fechada enquanto esperávamos a resposta
    if(passo.falhas >= 3){ const t = document.getElementById('cdMpStatusTxt'); if(t) t.textContent = '📡 Sem conexão para conferir o pagamento agora. Continuamos tentando — não pague de novo.'; }
    if(r){
      if(r.estado === 'aprovado'){ await cdMpAprovar_(r); return; }
      if(r.estado === 'conferindo'){ cdMpTelaConferindo_(); return; }
      if(r.estado === 'reembolso'){ cdMpTelaFalha_('Este pagamento foi devolvido. Escolha outra forma de pagamento.'); return; }
      if(['expirado','cancelado'].includes(r.estado)){ cdMpTelaFalha_('O tempo para pagar terminou e o pedido foi cancelado. Se você chegou a pagar, o restaurante entra em contato. Escolha uma forma de pagamento para refazer o pedido.'); return; }
      if(['recusado','erro'].includes(r.estado)){ cdMpTelaFalha_('O pagamento não foi concluído. Escolha outra forma de pagamento.'); return; }
    }
    if(fim && Date.now() > fim + 30000){ cdMpTelaFalha_('O prazo do pagamento terminou. Escolha uma forma de pagamento para refazer o pedido.'); return; }
    cdMpTimer_ = setTimeout(passo, 4000);
  };
  cdMpTimer_ = setTimeout(passo, 2500);
}

/* ---------- pagamento aprovado: tela da prévia + mensagem do WhatsApp ---------- */
async function cdMpAprovar_(st){
  cdMpParar_(); cdMpPagamentoEmAndamento_ = false;
  const reservaId = cdMpUltimaReserva_; cdMpReservaAtiva_ = ''; cdPedidoConcluido = true;
  if(!st.vendaId && reservaId){ try{ st = Object.assign({}, st, await cdMpConsultar_(reservaId)); }catch(e){} }
  const metodo = st.metodo || cdMpUltimoMetodo_ || 'pix', vendaId = st.vendaId || '';
  const numero = st.numero || (vendaId ? String(vendaId).slice(-8).toUpperCase() : '');
  const total = Number(st.valorTotal || st.valor || totalCarrinhoCd() || 0);
  const tipoEntrega = (document.getElementById('cdTipoEntrega')||{}).value, nome = (document.getElementById('cdNome')||{}).value || '';
  let wa = null;
  try{ wa = cdWaPedido_({ id: vendaId || reservaId, numero, valorTotal: total, pagamentoOnline: metodo, taxaEntrega: taxaEntregaCdAtual(), cupom: cdCupomAplicado ? cdCupomAplicado.codigo : '', valorDesconto: Number(cdCupomAplicado && cdCupomAplicado.desconto || 0), freteGratis: !!(cdCupomAplicado && cdCupomAplicado.freteGratis) }); }catch(e){}
  if(vendaId){   // o mesmo que o pedido pago na entrega faz: link de acompanhamento, avisos e local da entrega
    cdUltimaVendaId = vendaId;
    try{ mostrarLinkAcompanhamento(vendaId, nome, numero); }catch(e){}
    try{ if(window.cdAvisosPosPedido_) window.cdAvisosPosPedido_(String(vendaId).slice(-8)); }catch(e){}
    try{ if(tipoEntrega==='Entrega' && window.cdEnviarLocalDoPedido_) window.cdEnviarLocalDoPedido_(vendaId); }catch(e){}
  }
  const tempo = tipoEntrega==='Entrega' ? (cdDados.config && cdDados.config.tempoEntrega) : (cdDados.config && cdDados.config.tempoRetirada);
  const msgHtml = wa ? escH(wa.msg).replace(/(PAGO via[^\n]*\nNão cobrar na entrega)/, '<b>✅ $1</b>').replace(/\n/g, '<br>') : '';
  cdMpMostrarModal_('<div class="mp-ok">' + CD_MP_SVG_OK_ + '</div><h2 class="mp-topo mp-centro">Pagamento aprovado</h2>'
    + '<p class="mp-sub mp-centro">' + (numero ? 'Pedido #' + escH(numero) + ' registrado. ' : 'Pedido registrado. ') + 'Agora é só enviar para o WhatsApp do restaurante.</p>'
    + '<div class="mp-resumo mp-num"><div><span>Forma</span><span>' + (metodo==='pix' ? 'Pix' : metodo==='debito' ? 'Cartão de débito' : 'Cartão de crédito') + ' · ' + (cdPagProvedor_(cdFormaAtualId_())==='infinitepay' ? 'InfinitePay' : 'Mercado Pago') + '</span></div><div><span>Pago</span><span>' + cdMpR_(total) + '</span></div>' + (tempo ? '<div><span>Previsão</span><span>' + escH(tempo) + '</span></div>' : '') + '</div>'
    + (wa ? '<p class="mp-grupo">Mensagem que vai para o WhatsApp</p><div class="mp-zap">' + msgHtml + '</div><a class="mp-btn mp-zapbtn" href="' + escH(wa.url) + '" target="_blank" rel="noopener">Enviar pedido no WhatsApp</a>' : '')
    + '<p class="mp-rod">Você pode acompanhar o pedido em "Acompanhe seu pedido".</p><button type="button" class="mp-btn mp-sec" onclick="cdMpFinalizar_()">Fechar</button>', 'cdMpFinalizar_()');
}

/* ---------- começar o pagamento (Pix ou cartão) ---------- */
async function cdMpIniciarPagamento_(dados, tipoOnline){
  if(!window.contaSessaoAtiva_ || !window.contaSessaoAtiva_()){
    showMsg('cdCheckoutMsg','Para pagar pelo site, entre ou crie sua conta. O pagamento na entrega continua disponível.','warn');
    if(window.abrirContaEntrar) window.abrirContaEntrar(); else if(window.contaBotao_) window.contaBotao_();
    return;
  }
  if(modoContingenciaAtivo) return showMsg('cdCheckoutMsg','Pagamento online indisponível durante a instabilidade. Escolha pagar na entrega.','warn');
  if(cdPagProvedor_(cdFormaAtualId_())==='infinitepay'){   // v1.15: esta forma é paga no checkout da InfinitePay (app-51)
    if(typeof window.cdIpIniciar_ === 'function') return window.cdIpIniciar_(dados, tipoOnline);
    return showMsg('cdCheckoutMsg','O pagamento pela InfinitePay não carregou. Atualize a página ou escolha pagar na entrega.','warn');
  }
  const btn = document.getElementById('cdEnviarPedidoBtn'); btn.disabled = true; btn.textContent = 'Preparando pagamento…';
  try{
    const cfg = await cdMpConfigPublica_();
    if(!cfg || !cfg.ligado) throw new Error('O pagamento pelo site está indisponível agora. Escolha pagar na entrega.');
    if((tipoOnline==='credito' || tipoOnline==='debito') && !cfg.publicKey) throw new Error('O pagamento por cartão está sem chave pública configurada. Escolha pagar na entrega.');
    const reserva = await cdMpRpcCliente_('api_mp_reservar', dados);
    if(!reserva || !reserva.ok || !reserva.reservaId) throw new Error((reserva&&reserva.message)||'Não foi possível reservar o pedido.');
    cdMpReservaAtiva_ = reserva.reservaId; cdMpUltimaReserva_ = reserva.reservaId; cdMpUltimoMetodo_ = tipoOnline==='credito' ? 'credito' : tipoOnline==='debito' ? 'debito' : 'pix';
    if(tipoOnline==='credito' || tipoOnline==='debito'){ await cdMpAbrirCartao_(reserva, cfg, tipoOnline); return; }
    const tok = await window.contaTokenOuNull_();
    const rr = await sbJson_(SUPABASE_URL_+'/functions/v1/mp-criar',{method:'POST',headers:{'apikey':SUPABASE_CHAVE_,'Authorization':'Bearer '+tok,'Content-Type':'application/json'},body:JSON.stringify({reservaId:reserva.reservaId})},45000);
    const pag = await rr.json().catch(()=>null);
    if(!rr.ok || !pag || !pag.ok) throw new Error((pag&&pag.message)||'Não foi possível criar o Pix. Você pode pagar na entrega.');
    if(pag.estado==='aprovado'){ await cdMpAprovar_({ estado:'aprovado', metodo:'pix', vendaId:pag.vendaId, numero:pag.numero, valorTotal:pag.valor }); return; }
    if(pag.estado==='conferindo'){ cdMpTelaConferindo_(); return; }
    if(pag.estado!=='aguardando' || !pag.pix || !pag.pix.copiaCola) throw new Error(pag.mensagem||'Não foi possível gerar o Pix. Escolha pagar na entrega.');
    const expira = pag.reservaExpiraEm || reserva.expiraEm || pag.pix.expiraEm || '';
    cdMpTelaPix_(pag, expira);
    cdMpCronometro_(Date.parse(expira || '') || 0);
    cdMpAcompanhar_(reserva.reservaId, expira);
  }catch(e){
    showMsg('cdCheckoutMsg', e.message||'Não foi possível iniciar o pagamento. Escolha pagar na entrega.','warn');
    if(cdMpReservaAtiva_) await cdMpCancelarReserva_(cdMpReservaAtiva_);
  }finally{ btn.disabled = false; btn.textContent = cdRotuloEnviar_(); }
}

/* ---------- cartão de crédito ou débito: formulário seguro do Mercado Pago (Brick) com as cores do cardápio ---------- */
async function cdMpCarregarSdk_(){
  if(window.MercadoPago) return;
  let tag = document.querySelector('script[data-mp-sdk="1"]');
  if(!tag){ tag = document.createElement('script'); tag.src = 'https://sdk.mercadopago.com/js/v2'; tag.async = true; tag.dataset.mpSdk = '1'; document.head.appendChild(tag); }
  await new Promise((resolve,reject)=>{
    if(window.MercadoPago) return resolve();
    const timer = setTimeout(()=>reject(new Error('Não foi possível carregar o formulário seguro do cartão. Confira sua conexão ou pague na entrega.')),15000);
    tag.addEventListener('load',()=>{ clearTimeout(timer); window.MercadoPago ? resolve() : reject(new Error('O formulário seguro do cartão não ficou disponível.')); },{once:true});
    tag.addEventListener('error',()=>{ clearTimeout(timer); reject(new Error('Não foi possível carregar o formulário seguro do cartão. Pague na entrega ou tente novamente.')); },{once:true});
  });
}
function cdMpCpfOk_(v){
  const c = String(v||'').replace(/\D/g,''); if(c.length!==11 || /^(\d)\1{10}$/.test(c)) return false;
  for(let t=9;t<11;t++){ let s=0; for(let i=0;i<t;i++) s += Number(c[i])*(t+1-i); if(((s*10)%11)%10 !== Number(c[t])) return false; }
  return true;
}
function cdMpMascaraCpf_(el){ const d = el.value.replace(/\D/g,'').slice(0,11); el.value = d.replace(/^(\d{3})(\d)/,'$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1-$2'); }
function cdMpCpfDoCartao_(fd){
  const meu = ((document.getElementById('cdMpCpf')||{}).value||'').replace(/\D/g,'');
  const doBrick = String(fd && fd.payer && fd.payer.identification && fd.payer.identification.number || '').replace(/\D/g,'');
  return cdMpCpfOk_(meu) ? meu : (cdMpCpfOk_(doBrick) ? doBrick : meu);
}
async function cdMpAbrirCartao_(reserva, cfg, tipo){
  tipo = tipo === 'debito' ? 'debito' : 'credito';
  const rotCartao = tipo === 'debito' ? 'Cartão de débito' : 'Cartão de crédito';
  await cdMpCarregarSdk_();
  const valor = Number(reserva.valorTotal ?? reserva.valor ?? 0);
  if(!(valor>0)) throw new Error('Não foi possível confirmar o valor do pedido. Atualize o cardápio e tente novamente.');
  cdMpMostrarModal_('<h2 class="mp-topo">' + rotCartao + '</h2><div class="mp-resumo mp-num"><div class="mp-tot mp-so"><span>Total</span><span>' + cdMpR_(valor) + '</span></div></div>'
    + '<label class="mp-c" id="cdMpCpfBox" for="cdMpCpf">CPF do titular<input class="mp-inp" id="cdMpCpf" type="text" inputmode="numeric" autocomplete="off" maxlength="14" placeholder="000.000.000-00" oninput="cdMpMascaraCpf_(this)"></label>'
    + '<div id="cdMpCardBrick" class="mp-brick"></div>'
    + '<p class="mp-seguro">🔒 Os dados do cartão são digitados numa tela segura do Mercado Pago. O restaurante nunca vê o número.</p>'
    + '<p class="mp-status" id="cdMpCardStatus" role="status">Carregando formulário seguro…</p>'
    + '<button type="button" class="mp-btn mp-sec" onclick="cdMpFecharPagamento_(true)">Cancelar pagamento</button>');
  const mp = new window.MercadoPago(cfg.publicKey, { locale:'pt-BR' });
  cdMpBrickController_ = await mp.bricks().create('cardPayment', 'cdMpCardBrick', {
    initialization: { amount: Math.round(valor*100)/100 },
    customization: {
      paymentMethods: { creditCard: tipo==='credito' ? 'all' : 'none', debitCard: tipo==='debito' ? 'all' : 'none', prepaidCard:'none', maxInstallments:1 },
      visual: { hideFormTitle:true,
        style: { theme:'dark', customVariables:{ baseColor:'#d20807', baseColorFirstVariant:'#a50606', baseColorSecondVariant:'#d20807', buttonTextColor:'#ffffff', formBackgroundColor:'#17100a', inputBackgroundColor:'#ffffff', textPrimaryColor:'#fff3d6', textSecondaryColor:'#bfae8f', outlinePrimaryColor:'#e0b53a', outlineSecondaryColor:'#3d2a12', errorColor:'#ff8a80', successColor:'#6dbb2e', borderRadiusMedium:'8px', borderRadiusLarge:'10px' } },
        texts: { formSubmit:'Pagar ' + cdMpR_(valor), cardNumber:{label:'Número do cartão'}, cardholderName:{label:'Nome como está no cartão'}, expirationDate:{label:'Validade'}, securityCode:{label:'Código'}, cardholderIdentification:{label:'CPF do titular'} } }
    },
    callbacks: {
      onReady: ()=>{
        const e = document.getElementById('cdMpCardStatus'); if(e) e.textContent = rotCartao + ' · pagamento à vista';
        setTimeout(()=>{ const b = document.getElementById('cdMpCardBrick'), c = document.getElementById('cdMpCpfBox');   // se o formulário do Mercado Pago já pede o CPF, não pedimos duas vezes
          if(b && c && /CPF|documento/i.test(b.innerText||'')) c.style.display = 'none'; }, 800);
      },
      onSubmit: (fd)=>cdMpEnviarCartao_(reserva, fd, tipo),
      onError: ()=>{ const e = document.getElementById('cdMpCardStatus'); if(e) e.textContent = 'O formulário do cartão encontrou um problema. Confira os dados ou tente novamente.'; }
    }
  });
}
async function cdMpEnviarCartao_(reserva, fd, tipo){
  const dizer = t=>{ const e = document.getElementById('cdMpCardStatus'); if(e) e.textContent = t; };
  const cpf = cdMpCpfDoCartao_(fd);
  if(!cdMpCpfOk_(cpf)){ dizer('Informe um CPF válido para o titular do cartão.'); throw new Error('CPF inválido'); }
  const tok = await window.contaTokenOuNull_();
  if(!tok){ dizer('Sua sessão expirou. Entre novamente para continuar.'); throw new Error('Sessão expirada'); }
  dizer('Enviando pagamento com segurança…'); cdMpPagamentoEmAndamento_ = true;
  try{
    const rr = await sbJson_(SUPABASE_URL_+'/functions/v1/mp-criar',{method:'POST',headers:{'apikey':SUPABASE_CHAVE_,'Authorization':'Bearer '+tok,'Content-Type':'application/json'},body:JSON.stringify({reservaId:reserva.reservaId,token:fd.token,paymentMethodId:fd.payment_method_id||fd.paymentMethodId,paymentTypeId:(tipo==='debito'?'debit_card':'credit_card'),payerCpf:cpf})},45000);
    const pag = await rr.json().catch(()=>null);
    if(!rr.ok || !pag || !pag.ok) throw new Error((pag&&pag.message)||'Não foi possível processar o cartão. Tente novamente ou pague na entrega.');
    if(pag.estado==='aprovado'){ await cdMpAprovar_({ estado:'aprovado', metodo:(tipo==='debito'?'debito':'credito'), vendaId:pag.vendaId, numero:pag.numero, valorTotal:pag.valor }); return pag; }
    if(pag.estado==='conferindo'){ cdMpTelaConferindo_(); return pag; }
    if(pag.estado==='aguardando'){ cdMpTelaAguardando_(pag.desafio && pag.desafio.url); cdMpAcompanhar_(reserva.reservaId, reserva.expiraEm || ''); return pag; }
    if(pag.estado==='erro'){ cdMpReservaAtiva_ = ''; cdMpTelaFalha_(pag.mensagem || 'O pagamento não pôde ser concluído. Escolha pagar na entrega.'); return pag; }   // o banco já soltou a reserva
    throw new Error(pag.mensagem || 'O cartão não foi aprovado. Tente outro cartão ou pague na entrega.');   // recusado: a reserva continua para outra tentativa
  }catch(e){ cdMpPagamentoEmAndamento_ = false; dizer(e.message || 'Falha no pagamento. Confira os dados e tente novamente.'); throw e; }
}

/* Forma de pagamento escolhida no carrinho (ou a primeira do cardápio). */
function cdFormaAtualId_(){
  const s = document.getElementById('cdFormaPagamento');
  if(s && s.value) return s.value;
  const f = (cdDados && cdDados.formasPagamento || [])[0];
  return f ? f.id : '';
}
function cdFormaAtual_(){ const id = cdFormaAtualId_(); return ((cdDados && cdDados.formasPagamento) || []).find(f=>f.id===id) || null; }
/* Preço único: o item custa o mesmo em qualquer forma; o que muda é o acréscimo da forma de pagamento. */
function cdPrecoDe(tipo, id){
  const lista = tipo==='produto' ? (cdDados.produtoPrecos||[]) : (cdDados.comboPrecos||[]);
  const chave = tipo==='produto' ? 'produtoId' : 'comboId';
  const ref = (cdDados.formasPagamento||[])[0];
  const preco = (ref && lista.find(p=>p[chave]===id && p.formaPagamentoId===ref.id)) || lista.find(p=>p[chave]===id);
  return preco ? Number(preco.preco) : null;
}
function cdAcrescimoDe_(forma, base){
  if(!forma || !(base > 0)) return 0;
  return Math.round((base * (forma.acrescimoPct||0) / 100 + (forma.acrescimoFixo||0)) * 100) / 100;
}
/* Aviso ao cliente: a forma escolhida tem acréscimo. */
function cdAtualizarAvisoForma_(){
  const el = document.getElementById('cdAvisoForma'); if(!el) return;
  const acr = acrescimoCdAtual_();
  if(!(acr > 0)){ el.style.display = 'none'; return; }
  const f = cdFormaAtual_();
  const semAcr = ((cdDados && cdDados.formasPagamento) || []).filter(x=>!(x.acrescimoPct>0) && !(x.acrescimoFixo>0));
  el.style.display = 'block';
  el.innerHTML = '⚠️ <b>Atenção:</b> pagando em <b>' + escH(f.nome) + '</b> você paga <b>' + cdFormatarPreco(acr) + ' a mais</b> (acréscimo da forma de pagamento). Total com acréscimo: <b>' + cdFormatarPreco(totalCarrinhoCd()) + '</b>.'
    + (semAcr.length ? ' Em ' + semAcr.map(x=>escH(x.nome)).join(' ou ') + ' não há acréscimo.' : '');
}
function cdFormatarPreco(v){ return v==null ? 'Consulte' : formatarMoeda(v); }

function cdEsgotado_(tipo, id){ const e = (cdDados && cdDados.esgotados) || {}; return ((tipo==='produto' ? e.produtos : e.combos) || []).indexOf(id) !== -1; }
function cdCardHTML(tipo, item){
  const preco = cdPrecoDe(tipo, item.id);
  const foto = item.fotoUrl || '';
  const esg = cdEsgotado_(tipo, item.id);
  return `<div class="cd-card${esg?' esgotado':''}">
    ${foto?`<img src="${fotoSrc_(foto, 500)}" onerror="fotoFalhou_(this)" loading="lazy" decoding="async" alt="" onclick="cdAmpliarFoto_('${tipo}','${item.id}')" style="cursor:zoom-in;">`:''}
    <div class="cd-info"${esg?'':` onclick="abrirCdItemModal('${tipo}','${item.id}')" style="cursor:pointer;"`}>
      <div class="cd-nome">${escH(item.nome)}</div>
      ${item.descricao?`<div class="cd-desc">${escH(item.descricao)}</div>`:''}
      <div class="cd-linha"><div class="cd-preco">${cdFormatarPreco(preco)}</div>
      ${esg?'<button class="cd-add esg" disabled>Esgotado</button>':`<button class="cd-add" aria-label="Adicionar ${escH(item.nome)}" onclick="event.stopPropagation();abrirCdItemModal('${tipo}','${item.id}')">+</button>`}</div>
    </div>
  </div>`;
}

/* v1.24 — faixa de promoção (texto opcional do Admin logo abaixo do banner) */
function cdRenderFaixaPromo_(){
  const el = document.getElementById('cdFaixaPromo'); if(!el) return;
  const t = String((cdDados && cdDados.config && cdDados.config.faixaPromo) || '').trim();
  if(!t || mesaQr){ el.style.display = 'none'; el.textContent = ''; return; }
  el.textContent = t; el.style.display = '';
}
function renderCdSecoes(){
  const visaoTodas = cdCategoriaAtiva==='todas';

  // item completo do cadastro (maisPedidos vem sem descrição)
  const completo = (m)=> ((m.tipo==='produto' ? cdDados.produtos : cdDados.combos)||[]).find(x=>x.id===m.id) || m;

  const maisPedidos = visaoTodas ? (cdDados.maisPedidos||[]) : [];
  const idsMais = new Set(maisPedidos.map(m=>m.tipo+':'+m.id));

  // Destaques: não repete o que já está em "Mais pedidos"
  const destaques = [
    ...(cdDados.produtos||[]).filter(p=>p.destaque).map(p=>({ tipo:'produto', item:p })),
    ...(cdDados.combos||[]).filter(c=>c.destaque).map(c=>({ tipo:'combo', item:c }))
  ].filter(d=> !idsMais.has(d.tipo+':'+d.item.id));

  // ITEM 4: o que já aparece em cima não se repete em Produtos/Combos (só na visão "Todas")
  const jaMostrados = new Set(idsMais);
  if(visaoTodas) destaques.forEach(d=>jaMostrados.add(d.tipo+':'+d.item.id));

  const produtos = (cdDados.produtos||[]).filter(p=> (visaoTodas || p.categoria===cdCategoriaAtiva) && !jaMostrados.has('produto:'+p.id));
  const combos   = (cdDados.combos||[]).filter(c=> (visaoTodas || c.categoria===cdCategoriaAtiva) && !jaMostrados.has('combo:'+c.id));

  const maisPedidosEl = document.getElementById('cdMaisPedidos');
  const destaquesEl = document.getElementById('cdDestaques');
  const maisMostrar = maisPedidos;
  const destMostrar = destaques;
  if(maisMostrar.length){
    maisPedidosEl.innerHTML = '<div class="cd-secao-titulo">⭐ Mais pedidos</div><div class="cd-grid cd-cat-lista">' +
      maisMostrar.map(m=>cdCardHTML(m.tipo, completo(m))).join('') + '</div>';
  } else maisPedidosEl.innerHTML = '';

  if(visaoTodas && destMostrar.length){
    destaquesEl.innerHTML = '<div class="cd-secao-titulo">📌 Destaques</div><div class="cd-grid cd-cat-lista">' +
      destMostrar.map(d=>cdCardHTML(d.tipo, d.item)).join('') + '</div>';
  } else destaquesEl.innerHTML = '';

  const listaEl = document.getElementById('cdListaProdutos');

  if(!visaoTodas){
    let html = '';
    if(produtos.length) html += '<div class="cd-secao-titulo">Produtos</div><div class="cd-grid">' + produtos.map(p=>cdCardHTML('produto',p)).join('') + '</div>';
    if(combos.length)   html += '<div class="cd-secao-titulo">Combos</div><div class="cd-grid">'   + combos.map(c=>cdCardHTML('combo',c)).join('')   + '</div>';
    // só diz "nada disponível" se realmente não há nada (nem em cima, nem embaixo)
    if(!produtos.length && !combos.length && !jaMostrados.size) html = '<p class="sub">Nada disponível nessa categoria no momento.</p>';
    listaEl.innerHTML = html;
    return;
  }

  // "Todas": cada categoria com seu título; no celular o bloco rola para o lado, no PC é grade
  let html = '';
  let total = jaMostrados.size;
  (cdDados.categorias||[]).forEach(cat => {
    const prods = (cdDados.produtos||[]).filter(p => p.categoria===cat.id && !jaMostrados.has('produto:'+p.id));
    const cbos  = (cdDados.combos||[]).filter(c => c.categoria===cat.id && !jaMostrados.has('combo:'+c.id));
    if(!prods.length && !cbos.length) return;
    total += prods.length + cbos.length;
    html += `<section class="cd-cat-bloco"><div class="cd-secao-titulo">${escH(cat.nome)}</div>`
          + `<div class="cd-grid cd-cat-lista">`
          + prods.map(p=>cdCardHTML('produto',p)).join('')
          + cbos.map(c=>cdCardHTML('combo',c)).join('')
          + `</div></section>`;
  });
  const orfP = (cdDados.produtos||[]).filter(p => !p.categoria && !jaMostrados.has('produto:'+p.id));
  const orfC = (cdDados.combos||[]).filter(c => !c.categoria && !jaMostrados.has('combo:'+c.id));
  if(orfP.length || orfC.length){
    total += orfP.length + orfC.length;
    html += `<section class="cd-cat-bloco"><div class="cd-secao-titulo">Outros</div><div class="cd-grid cd-cat-lista">`
          + orfP.map(p=>cdCardHTML('produto',p)).join('')
          + orfC.map(c=>cdCardHTML('combo',c)).join('')
          + `</div></section>`;
  }
  if(!total) html = '<p class="sub">Nada disponível no momento.</p>';
  listaEl.innerHTML = html;
}

/* ---------- MODAL DE ITEM (quantidade + adicionais) ITEM 20 ---------- */
function cdAmpliarFoto_(tipo, id){
  const item = ((tipo==='produto' ? cdDados.produtos : cdDados.combos)||[]).find(x=>x.id===id); if(!item || !item.fotoUrl) return;
  let ov = document.getElementById('cdFotoOv'); if(ov) ov.remove();
  ov = document.createElement('div'); ov.id = 'cdFotoOv';
  const esg = cdEsgotado_(tipo, id), preco = cdFormatarPreco(cdPrecoDe(tipo, id));
  const fechar = () => { const o = document.getElementById('cdFotoOv'); if(o) o.remove(); };
  const box = document.createElement('div'); box.className = 'cdfo-box';
  const img = document.createElement('img'); img.src = fotoSrc_(item.fotoUrl, 1000); img.alt = '';
  const info = document.createElement('div'); info.className = 'cdfo-info';
  const nome = document.createElement('div'); nome.className = 'cdfo-nome'; nome.textContent = item.nome;
  info.appendChild(nome);
  if(item.descricao){ const d = document.createElement('div'); d.className = 'cdfo-desc'; d.textContent = item.descricao; info.appendChild(d); }
  const pr = document.createElement('div'); pr.className = 'cdfo-preco'; pr.textContent = preco; info.appendChild(pr);
  const b = document.createElement('button'); b.type = 'button'; b.className = 'cdfo-add'; b.textContent = esg ? 'Esgotado' : 'Adicionar'; b.disabled = esg;
  if(!esg) b.onclick = () => { fechar(); abrirCdItemModal(tipo, id); };
  const x = document.createElement('button'); x.type = 'button'; x.className = 'cdfo-x'; x.textContent = '✕'; x.setAttribute('aria-label', 'Fechar'); x.onclick = fechar;
  info.appendChild(b); box.appendChild(x); box.appendChild(img); box.appendChild(info); ov.appendChild(box);
  ov.addEventListener('click', e => { if(e.target === ov) fechar(); });
  document.body.appendChild(ov);
}
function abrirCdItemModal(tipo, id){
  const lista = tipo==='produto' ? cdDados.produtos : cdDados.combos;
  const item = lista.find(x=>x.id===id);
  if(!item) return;
  if(cdEsgotado_(tipo, id) || mesaBloqueada_) return;
  const preco = cdPrecoDe(tipo, id) || 0;
  let adicionaisDoItem = [];
  {
    // produto: os adicionais vinculados a ele; combo: os adicionais dos produtos que o compõem
    const produtoIds = tipo==='produto' ? [id] : (cdDados.comboItens||[]).filter(ci=>ci.comboId===id).map(ci=>ci.produtoId);
    const ids = (cdDados.produtoAdicionais||[]).filter(pa=>produtoIds.includes(pa.produtoId)).map(pa=>pa.adicionalId);
    adicionaisDoItem = (cdDados.adicionais||[]).filter(a=>ids.includes(a.id));
  }
  cdItemAtual = { tipo, id, nome: item.nome, precoBase: preco, qtd: 1, adicionaisDisponiveis: adicionaisDoItem, adicionaisEscolhidos: [], escolhaCfg: cdEscolhaCfg_(tipo, id), escolhas: {} };
  cdRenderEscolhas_();
  document.getElementById('cdItemNome').textContent = item.nome;
  document.getElementById('cdItemDesc').textContent = (item.descricao || '') + (item.semDesconto ? (item.descricao ? ' ' : '') + '🏷️ Preço promocional: não aceita cupom.' : '');
  document.getElementById('cdItemQtd').textContent = '1';
  { const av = document.getElementById('cdItemAvisoAdic'); if(av) av.style.display = 'none'; const ob = document.getElementById('cdItemObs'); if(ob) ob.value = ''; }
  const cont = document.getElementById('cdItemAdicionais');
  cont.innerHTML = adicionaisDoItem.length ? ('<div class="cd-secao-titulo mt-2">Adicionais</div>' +
    adicionaisDoItem.map(a=>`<label class="cd-adicional-linha"><span><input type="checkbox" data-adid="${a.id}" onchange="toggleCdAdicional('${a.id}')"> ${escH(a.nome)}</span><span>+ ${cdFormatarPreco(a.preco)}</span></label>`).join('')) : '';
  atualizarCdItemTotal();
  /* computador: foto grande à esquerda (no celular a foto nem é carregada) */
  try{
    const im = document.getElementById('cdItemFoto'), bx = im && im.parentElement;
    if(im && bx){
      const ok = !!(item.fotoUrl && window.matchMedia && window.matchMedia('(min-width:900px)').matches);
      if(ok){ im.onerror = function(){ this.removeAttribute('src'); bx.classList.add('sem-foto'); }; im.src = fotoSrc_(item.fotoUrl, 800); }
      else im.removeAttribute('src');
      bx.classList.toggle('sem-foto', !ok);
    }
  }catch(e){}
  document.getElementById('cdItemModal').classList.add('open');
}
/* Combo com escolha (ex.: "3 Smash"): o cliente escolhe N itens entre as opções, podendo repetir */
function cdEscolhaCfg_(tipo, id){
  if(tipo !== 'combo') return null;
  const c = (cdDados.combos||[]).find(x=>x.id===id); const n = Number(c && c.escolhaQtd) || 0; if(n <= 0) return null;
  const ops = (cdDados.comboItens||[]).filter(ci=>ci.comboId===id && ci.escolha).map(ci=>{ const p = (cdDados.produtos||[]).find(x=>x.id===ci.produtoId); return p ? { produtoId: p.id, nome: p.nome } : null; }).filter(Boolean);
  return ops.length >= 2 ? { qtd: n, opcoes: ops } : null;
}
function cdEscolhasLista_(esc, cfg){ return cfg.opcoes.filter(o=>(esc[o.produtoId]||0) > 0).map(o=>({ produtoId: o.produtoId, quantidade: esc[o.produtoId], nome: o.nome })); }
function cdEscolhasTotal_(esc){ return Object.keys(esc||{}).reduce((s,k)=>s+(esc[k]||0),0); }
function cdRenderEscolhas_(){
  let box = document.getElementById('cdItemEscolhas');
  if(!box){ const ad = document.getElementById('cdItemAdicionais'); box = document.createElement('div'); box.id = 'cdItemEscolhas'; ad.parentNode.insertBefore(box, ad); }
  const ctrl = document.querySelector('#cdItemModal .cd-qtd-row > .cd-qtd-ctrl'); const btn = document.querySelector('#cdItemModal button.primary');
  const cfg = cdItemAtual && cdItemAtual.escolhaCfg;
  if(ctrl) ctrl.style.display = cfg ? 'none' : '';
  if(!cfg){ box.innerHTML = ''; if(btn) btn.disabled = false; return; }
  const esc = cdItemAtual.escolhas, tot = cdEscolhasTotal_(esc);
  box.innerHTML = '<div class="cd-secao-titulo mt-2">Escolha seus ' + cfg.qtd + ' sabores <small class="txt-muted">(pode repetir)</small></div>' +
    cfg.opcoes.map(o=>`<div class="cd-adicional-linha"><span>${escH(o.nome)}</span><span class="cd-qtd-ctrl"><button type="button" onclick="cdAlterarEscolha_('${o.produtoId}',-1)">−</button><span>${esc[o.produtoId]||0}</span><button type="button" ${tot>=cfg.qtd?'disabled':''} onclick="cdAlterarEscolha_('${o.produtoId}',1)">+</button></span></div>`).join('') +
    `<div class="obs-line" style="margin-top:6px;color:${tot===cfg.qtd?'var(--gold)':'#e74c3c'};">${tot} de ${cfg.qtd} escolhidos${tot===cfg.qtd?' ✓':''}</div>`;
  if(btn){ btn.disabled = tot !== cfg.qtd; }
}
function cdAlterarEscolha_(pid, d){
  if(!cdItemAtual || !cdItemAtual.escolhaCfg) return;
  const e = cdItemAtual.escolhas, tot = cdEscolhasTotal_(e);
  if(d > 0 && tot >= cdItemAtual.escolhaCfg.qtd) return;
  e[pid] = Math.max(0, (e[pid]||0) + d); cdRenderEscolhas_();
}
function cdEscolhasTexto_(it){ return (it.escolhas && it.escolhas.length) ? it.escolhas.map(x=>x.quantidade+'x '+x.nome).join(', ') : ''; }
function cdEscolhasPayload_(it){ return (it.escolhas && it.escolhas.length) ? it.escolhas.map(x=>({ produtoId: x.produtoId, quantidade: x.quantidade })) : undefined; }
function fecharCdItemModal(){ document.getElementById('cdItemModal').classList.remove('open'); cdItemAtual = null; }
function toggleCdAdicional(adId){
  if(!cdItemAtual) return;
  const ad = cdItemAtual.adicionaisDisponiveis.find(a=>a.id===adId);
  const idx = cdItemAtual.adicionaisEscolhidos.findIndex(a=>a.id===adId);
  if(idx>=0) cdItemAtual.adicionaisEscolhidos.splice(idx,1); else cdItemAtual.adicionaisEscolhidos.push(ad);
  atualizarAvisoAdicionaisCd_();
  atualizarCdItemTotal();
}
function cdAvisoQtdMax_(){ avisar('O máximo é ' + QTD_MAX_ITEM_ + ' unidades por item. Para uma quantidade maior, fale com o restaurante.'); }
function alterarQtdCdItem(delta){
  if(!cdItemAtual || cdItemAtual.escolhaCfg) return;
  if(cdItemAtual.qtd + delta > QTD_MAX_ITEM_){ const q = document.getElementById('cdItemQtd'); if(q){ q.style.color = '#e74c3c'; setTimeout(()=>{ q.style.color = ''; }, 1200); } try{ cdAvisoQtdMax_(); }catch(e){} return; }
  cdItemAtual.qtd = Math.max(1, cdItemAtual.qtd + delta);
  document.getElementById('cdItemQtd').textContent = cdItemAtual.qtd;
  atualizarAvisoAdicionaisCd_();
  atualizarCdItemTotal();
}
/* Aviso: com mais de 1 unidade e adicionais marcados, eles valem para todas as unidades. */
function atualizarAvisoAdicionaisCd_(){
  const el = document.getElementById('cdItemAvisoAdic'); if(!el) return;
  el.style.display = (cdItemAtual && cdItemAtual.qtd > 1 && cdItemAtual.adicionaisDisponiveis.length) ? 'block' : 'none';
}
function atualizarCdItemTotal(){
  if(!cdItemAtual) return;
  const extra = cdItemAtual.adicionaisEscolhidos.reduce((s,a)=>s+a.preco,0);
  const total = (cdItemAtual.precoBase + extra) * cdItemAtual.qtd;
  document.getElementById('cdItemPrecoTotal').textContent = cdFormatarPreco(total);
}
function confirmarAddCarrinho(){
  if(!cdItemAtual) return;
  const _cfg = cdItemAtual.escolhaCfg;
  if(_cfg && cdEscolhasTotal_(cdItemAtual.escolhas) !== _cfg.qtd){ avisar('Escolha exatamente ' + _cfg.qtd + ' sabores.'); return; }
  cdCarrinho.push({ escolhas: _cfg ? cdEscolhasLista_(cdItemAtual.escolhas, _cfg) : undefined, tipo: cdItemAtual.tipo, id: cdItemAtual.id, nome: cdItemAtual.nome, precoBase: cdItemAtual.precoBase, qtd: cdItemAtual.qtd, adicionais: cdItemAtual.adicionaisEscolhidos.slice(), obs: ((document.getElementById('cdItemObs')||{}).value||'').trim().slice(0,100) });
  fecharCdItemModal();
  atualizarFabCarrinho();
}
/* Brindes da conta do cliente (cartão fidelidade / indicação): vão no pedido a R$ 0,00; a entrega continua sendo cobrada */
function cdBrindes_(){ try{ return (!mesaQr && window.contaBrindesEscolhidos_) ? window.contaBrindesEscolhidos_() : []; }catch(e){ return []; } }
function cdPrecoItemCarrinho(it){ return (it.precoBase + it.adicionais.reduce((s,a)=>s+a.preco,0)) * it.qtd; }
/* Itens de preço promocional (marcados no cadastro) não entram em cupom: o desconto vale só sobre o resto do carrinho */
function cdSemDesc_(tipo, id){ const l = tipo==='produto' ? cdDados.produtos : cdDados.combos; const x = (l||[]).find(y=>y.id===id); return !!(x && x.semDesconto); }
function subtotalElegivelCd_(){ return Math.round(cdCarrinho.reduce((s,it)=>s+(cdSemDesc_(it.tipo,it.id) ? 0 : cdPrecoItemCarrinho(it)),0)*100)/100; }
function subtotalCarrinhoCd(){ return Math.round(cdCarrinho.reduce((s,it)=>s+cdPrecoItemCarrinho(it),0)*100)/100; }
function taxaEntregaCdAtual(){ const tipo=(document.getElementById('cdTipoEntrega')||{}).value; const taxa=Number(cdDados.config&&cdDados.config.taxaEntrega)||0; return tipo==='Entrega' && !(cdCupomAplicado&&cdCupomAplicado.freteGratis) ? taxa : 0; }
function totalSemAcrescimoCd_(){ return Math.round((subtotalCarrinhoCd()+taxaEntregaCdAtual()-Number(cdCupomAplicado&&cdCupomAplicado.desconto||0))*100)/100; }
function acrescimoCdAtual_(){
  if((typeof mesaQr !== 'undefined' && mesaQr) || !cdCarrinho.length) return 0;   // mesa: o acréscimo entra no fechamento da conta
  return cdAcrescimoDe_(cdFormaAtual_(), Math.max(0.01, totalSemAcrescimoCd_() - taxaEntregaCdAtual()));   // o % não incide sobre a taxa de entrega
}
function totalCarrinhoCd(){ return Math.round((totalSemAcrescimoCd_() + acrescimoCdAtual_())*100)/100; }
function cdAtualizarTotal_(){
  const el = document.getElementById('cdCarrinhoTotal');
  if(el) el.textContent = cdFormatarPreco(cdCarrinho.length ? Math.max(0.01, totalCarrinhoCd()) : (cdBrindes_().length ? Math.max(0, totalCarrinhoCd()) : 0));
  cdAtualizarAvisoForma_();
  cdRenderResumoPag_(); cdAtualizarBotaoEnviar_();
}
/* Carrinho guardado só neste aparelho (não vai para o servidor). Vale 24 horas. */
var CD_CARRINHO_KEY_ = 'tb_carrinho_v1', _cdCarrinhoOferecido_ = false;
function cdSalvarCarrinho_(){
  try{
    if(typeof mesaQr !== 'undefined' && mesaQr) return;
    if(!cdCarrinho.length){ if(_cdCarrinhoOferecido_ || !localStorage.getItem(CD_CARRINHO_KEY_)) { localStorage.removeItem(CD_CARRINHO_KEY_); } return; }
    localStorage.setItem(CD_CARRINHO_KEY_, JSON.stringify({ em: Date.now(), itens: cdCarrinho.map(it=>({ tipo:it.tipo, id:it.id, qtd:it.qtd, obs:it.obs||'', adicionais:(it.adicionais||[]).map(a=>a.id), escolhas:cdEscolhasPayload_(it) })) }));
  }catch(e){}
}
function cdLerCarrinhoSalvo_(){
  try{
    const j = JSON.parse(localStorage.getItem(CD_CARRINHO_KEY_) || 'null');
    if(!j || !Array.isArray(j.itens) || !j.itens.length || Date.now() - j.em > 24*3600*1000) { if(j) localStorage.removeItem(CD_CARRINHO_KEY_); return null; }
    return j;
  }catch(e){ return null; }
}
function cdOferecerCarrinhoSalvo_(){
  if(_cdCarrinhoOferecido_ || (typeof mesaQr !== 'undefined' && mesaQr) || cdCarrinho.length) return;
  const j = cdLerCarrinhoSalvo_(); if(!j) { _cdCarrinhoOferecido_ = true; return; }
  _cdCarrinhoOferecido_ = true;
  const n = j.itens.reduce((s,i)=>s+(Number(i.qtd)||0),0);
  document.getElementById('cdCarrinhoSalvoTxt').textContent = '🛒 Você deixou ' + n + (n===1?' item':' itens') + ' no carrinho. Quer continuar de onde parou?';
  document.getElementById('cdCarrinhoSalvo').style.display = 'block';
}
function cdDescartarCarrinhoSalvo_(){ try{ localStorage.removeItem(CD_CARRINHO_KEY_); }catch(e){} document.getElementById('cdCarrinhoSalvo').style.display = 'none'; }
function cdContinuarCarrinhoSalvo_(){
  const j = cdLerCarrinhoSalvo_(); document.getElementById('cdCarrinhoSalvo').style.display = 'none';
  if(!j) return;
  let perdidos = 0; const novo = [];
  j.itens.forEach(i=>{
    const lista = i.tipo==='produto' ? cdDados.produtos : cdDados.combos;
    const item = (lista||[]).find(x=>x.id===i.id);
    if(!item || cdEsgotado_(i.tipo, i.id)){ perdidos++; return; }
    const adicionais = (i.adicionais||[]).map(id=>(cdDados.adicionais||[]).find(a=>a.id===id)).filter(Boolean).map(a=>({ id:a.id, nome:a.nome, preco:Number(a.preco)||0 }));
    const _cfgS = cdEscolhaCfg_(i.tipo, i.id); let escS;
    if(_cfgS){ const e = {}; (Array.isArray(i.escolhas)?i.escolhas:[]).forEach(x=>{ if(_cfgS.opcoes.some(o=>o.produtoId===x.produtoId)) e[x.produtoId] = Math.max(0, Number(x.quantidade)||0); }); if(cdEscolhasTotal_(e) !== _cfgS.qtd){ perdidos++; return; } escS = cdEscolhasLista_(e, _cfgS); }
    novo.push({ escolhas: escS, tipo:i.tipo, id:i.id, nome:item.nome, precoBase:cdPrecoDe(i.tipo, i.id)||0, qtd:Math.max(1, Math.min(99, Number(i.qtd)||1)), adicionais, obs:String(i.obs||'').slice(0,100) });
  });
  cdCarrinho = novo; atualizarFabCarrinho();
  if(perdidos) avisar(perdidos + (perdidos===1?' item não está':' itens não estão') + ' mais disponível' + (perdidos===1?'':'is') + ' e ficou de fora. Os preços foram atualizados.');
  if(novo.length && typeof abrirCarrinhoPublico === 'function') { try{ abrirCarrinhoPublico(); }catch(e){} }
}
/* Computador (>= 1100 px): o carrinho vira um painel fixo à direita. Abre sozinho no 1º item e se atualiza a cada item novo;
   se o cliente fechar no X, só volta pelo botão de baixo (ou quando o carrinho esvaziar e encher de novo). */
var _cdLateralFechado_ = false;
function cdLateralPc_(){ return !!(window.matchMedia && window.matchMedia('(min-width:1100px)').matches); }
function cdLateralAuto_(){
  if(!cdLateralPc_()) return;
  const m = document.getElementById('cdCarrinhoModal'); if(!m) return;
  if(m.classList.contains('open')){ renderCdCarrinho(); return; }
  if(_cdLateralFechado_ || (typeof mesaQr !== 'undefined' && mesaQr)) return;
  abrirCarrinhoPublico();
}
function atualizarFabCarrinho(){
  cdSalvarCarrinho_();
  const fab = document.getElementById('cdFabCarrinho');
  const nBr = cdBrindes_().length;
  if(!cdCarrinho.length && !nBr){
    fab.classList.remove('show'); _cdLateralFechado_ = false;
    try{ const m = document.getElementById('cdCarrinhoModal'); if(m && m.classList.contains('open') && !cdPedidoConcluido && cdLateralPc_()) m.classList.remove('open'); }catch(e){}
    return;
  }
  const totalQtd = cdCarrinho.reduce((s,it)=>s+it.qtd,0) + nBr;
  const totalValor = cdCarrinho.reduce((s,it)=>s+cdPrecoItemCarrinho(it),0);
  document.getElementById('cdFabQtd').textContent = totalQtd + (totalQtd===1?' item':' itens');
  document.getElementById('cdFabTotal').textContent = cdFormatarPreco(totalValor);
  fab.classList.add('show');
  try{ cdLateralAuto_(); }catch(e){}
}

/* ---------- CARRINHO / CHECKOUT ---------- */
/* Nome e telefone do cliente ficam só no aparelho dele (silenciosamente) e voltam preenchidos no próximo pedido. O endereço NÃO é guardado: vem sempre pela localização. */
function cdPreencherContato_(){
  try{
    const nm = document.getElementById('cdNome'), tl = document.getElementById('cdTelefone');
    if(nm && !nm.value) nm.value = localStorage.getItem('cdClienteNome') || '';
    if(tl && !tl.value) tl.value = localStorage.getItem('cdClienteTel') || '';
  }catch(e){}
}
function cdGuardarContato_(nome, tel){ try{ if(nome) localStorage.setItem('cdClienteNome', String(nome).slice(0,80)); if(tel) localStorage.setItem('cdClienteTel', String(tel).slice(0,20)); }catch(e){} }
function abrirCarrinhoPublico(){
  if(mesaQr){
    const t = document.getElementById('cdTipoEntrega'); if(t) t.value = 'Retirada';
    const av = document.getElementById('cdAvisoMesa'); if(av){ av.textContent = '🍽️ Pedido da Mesa '+mesaQr.numero+'. O restaurante confirma antes de preparar e você paga no caixa, no final.'; av.style.display = ''; }
    const nm = document.getElementById('cdNome'); if(nm && !nm.value){ try{ nm.value = localStorage.getItem('cdNomeMesa')||''; }catch(e){} }
  }else{ cdPreencherContato_(); }
  cdCupomAplicado=null; try{ _cdCupomFormasPend_=null; }catch(e){} if(document.getElementById('cdCupom'))document.getElementById('cdCupom').value=''; if(document.getElementById('cdCupomMsg'))document.getElementById('cdCupomMsg').textContent=''; if(document.getElementById('cdCupomResumo'))document.getElementById('cdCupomResumo').textContent='';
  renderCdCarrinho();
  onMudarTipoCdEntrega();
  _cdLateralFechado_ = false;
  document.getElementById('cdCarrinhoModal').classList.add('open');
  if(!mesaQr && window.contaPreencherCheckout_) window.contaPreencherCheckout_();   // conta do cliente: dados, endereços e cupons
}
let cdPedidoConcluido = false; // true depois que o pedido foi enviado: ao fechar a janela, o carrinho é esvaziado
function cdLimparAposPedido_(){
  cdPararContagemWa_();
  cdCarrinho = []; cdCupomAplicado = null; cdPedidoConcluido = false; try{ if(window.contaAposPedido_) window.contaAposPedido_(); }catch(e){} try{ localStorage.removeItem(CD_CARRINHO_KEY_); }catch(e){}
  const v = (id, val)=>{ const el=document.getElementById(id); if(el) el.value = val; };
  v('cdCupom',''); v('cdObservacoes',''); v('cdTrocoPara','');
  const pt = document.getElementById('cdPrecisaTroco'); if(pt) pt.checked = false;
  const tb = document.getElementById('cdTrocoParaBox'); if(tb) tb.style.display = 'none';
  const cm = document.getElementById('cdCupomMsg'); if(cm) cm.textContent = '';
  const cr = document.getElementById('cdCupomResumo'); if(cr) cr.textContent = '';
  const ck = document.getElementById('cdCheckoutMsg'); if(ck){ ck.textContent = ''; ck.className = 'msg'; }
  const cf = document.getElementById('cdConfirmacaoPedido'); if(cf) cf.innerHTML = '';
  const btn = document.getElementById('cdEnviarPedidoBtn'); if(btn){ btn.disabled = false; btn.textContent = cdRotuloEnviar_(); }
  renderCdCarrinho(); atualizarFabCarrinho();
}
function fecharCarrinhoPublico(){
  document.getElementById('cdCarrinhoModal').classList.remove('open');
  if(cdPedidoConcluido) cdLimparAposPedido_(); else _cdLateralFechado_ = true;
}
function renderCdCarrinho(){
  const cont = document.getElementById('cdCarrinhoItens');
  const brs = cdBrindes_();
  const htmlBr = brs.map(b=>`<div class="cd-adicional-linha"><span>🎁 1x ${escH(b.nome)} <small class="txt-muted">(${b.tipo==='Fidelidade'?'cartão fidelidade':'indicação'})</small></span><span>${cdFormatarPreco(0)} <button class="link-btn" onclick="contaRemoverBrinde_('${escH(b.chave)}')">remover</button></span></div>`).join('');
  if(!cdCarrinho.length && !brs.length){ cont.innerHTML = '<p class="sub">Seu carrinho está vazio.</p>'; }
  else cont.innerHTML = cdCarrinho.map((it,i)=>`<div class="cd-adicional-linha">
      <span>${it.qtd}x ${escH(it.nome)}${cdEscolhasTexto_(it)?' <small class="txt-muted">('+escH(cdEscolhasTexto_(it))+')</small>':''}${it.adicionais.length?' ('+it.adicionais.map(a=>escH(a.nome)).join(', ')+')':''}${it.obs?'<br><small class="txt-muted">📝 '+escH(it.obs)+'</small>':''}${cdSemDesc_(it.tipo,it.id)?'<br><small class="txt-muted">🏷️ preço promocional · não aceita cupom</small>':''}</span>
      <span>${cdFormatarPreco(cdPrecoItemCarrinho(it))} <button class="link-btn" onclick="removerDoCarrinho(${i})">remover</button></span>
    </div>`).join('') + htmlBr;
  cdAtualizarTotal_();
}
function removerDoCarrinho(i){ cdCarrinho.splice(i,1); renderCdCarrinho(); atualizarFabCarrinho(); }
/* CEP → rua e bairro (ViaCEP). Só preenche se o campo de endereço estiver vazio ou já tiver vindo de um CEP; o número é sempre do cliente. */
var _cepUltimo_ = {};
async function onDigitarCep_(inp, idEnd, idAviso){
  let d = String(inp.value).replace(/\D/g,'').slice(0,8);
  inp.value = d.length > 5 ? d.slice(0,5) + '-' + d.slice(5) : d;
  const aviso = document.getElementById(idAviso), campo = document.getElementById(idEnd);
  if(aviso) aviso.style.display = 'none';
  if(d.length !== 8 || !campo) return;
  try{
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch('https://viacep.com.br/ws/' + d + '/json/', { signal: ctl.signal });
    clearTimeout(t);
    const j = r.ok ? await r.json() : null;
    if(!j || j.erro){ if(aviso){ aviso.style.display = 'block'; aviso.textContent = 'CEP não encontrado. Digite o endereço normalmente.'; } return; }
    const txt = [j.logradouro, j.bairro].filter(Boolean).join(', ').replace(/[<>]/g,'').slice(0,120);
    const atual = campo.value.trim();
    if(txt && (!atual || atual === _cepUltimo_[idEnd] || (typeof cdEndAuto_ !== 'undefined' && cdEndAuto_ && idEnd==='cdEndereco'))){
      campo.value = (idEnd==='cdEndereco') ? txt : txt + ', '; _cepUltimo_[idEnd] = campo.value.trim(); if(idEnd==='cdEndereco') cdEndAuto_ = false;
      try{ campo.dispatchEvent(new Event('input', {bubbles:true})); }catch(e){}
    }
    if(idEnd==='cdEndereco' && j.localidade){ const cc = document.getElementById('cdCidade'); if(cc) cc.value = [j.localidade, j.uf].filter(Boolean).join(' - '); }
    if(aviso){ aviso.style.display = 'block'; aviso.textContent = '📍 ' + [j.localidade, j.uf].filter(Boolean).join(' - ') + (txt ? ' — confira e digite o número da casa.' : ' — este CEP não tem rua; digite o endereço.'); }
  }catch(e){ /* sem internet ou ViaCEP fora do ar: avisa e o cliente digita normalmente */
    try{ if(aviso){ aviso.style.display = 'block'; aviso.textContent = '⚠️ Não conseguimos consultar o CEP agora. Digite a rua, o bairro e a cidade.'; } }catch(_){}
  }
}
var cdEndAuto_ = false, cdEndTentou_ = false;

/* Endereço pré-preenchido pela localização (OpenStreetMap). Só rua e bairro: o número é sempre do cliente. */
async function cdPreencherEnderecoPorLocal_(){
  const campo = document.getElementById('cdEndereco'), aviso = document.getElementById('cdEnderecoAviso');
  if(!campo || cdEndTentou_ || campo.value.trim()) return;
  cdEndTentou_ = true;
  let pos = null;
  for(let i = 0; i < 8 && !pos; i++){
    if(window.__posCd_) pos = window.__posCd_();
    if(!pos) await new Promise(r => setTimeout(r, 700));
  }
  if(!pos){ cdEndTentou_ = false; return; }   /* sem localização: segue como antes e tenta de novo na próxima troca */
  try{
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch('https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&addressdetails=1&accept-language=pt-BR&lat=' + encodeURIComponent(pos.lat) + '&lon=' + encodeURIComponent(pos.lng), { signal: ctl.signal });
    clearTimeout(t);
    if(!r.ok){ cdAvisoEndLocal_(); return; }
    const j = await r.json(); const a = (j && j.address) || {};
    const rua = a.road || a.pedestrian || a.residential || '';
    const bairro = a.suburb || a.neighbourhood || a.quarter || a.city_district || '';
    const cidade = String(a.city || a.town || a.village || a.municipality || '').replace(/[<>]/g, '').slice(0, 60);
    const uf = String(a['ISO3166-2-lvl4'] || '').replace(/^BR-/, '');
    if(cidade){ const cc = document.getElementById('cdCidade'); if(cc && !cc.value.trim()) cc.value = cidade + (uf ? ' - ' + uf : ''); }
    const txt = [rua, bairro].filter(Boolean).join(', ').replace(/[<>]/g, '').slice(0, 120);
    if(!txt || campo.value.trim()) return;   /* não sobrescreve o que o cliente já digitou */
    campo.value = txt; cdEndAuto_ = true; window.__cdEndAutoTxt_ = txt;
    if(aviso){ aviso.style.display = 'block'; aviso.textContent = '📍 Preenchemos rua, bairro e cidade pela sua localização. Confira e digite o NÚMERO da casa.'; }
    try{ const n = document.getElementById('cdNumero'); if(n && !n.value.trim()) n.focus({ preventScroll:true }); }catch(e){}
  }catch(e){ cdAvisoEndLocal_(); }
}
/* a busca do endereço pela localização falhou: diz ao cliente para digitar (antes ficava calado) */
function cdAvisoEndLocal_(){
  try{ const aviso = document.getElementById('cdEnderecoAviso'), campo = document.getElementById('cdEndereco');
    if(aviso && campo && !campo.value.trim()){ aviso.style.display = 'block'; aviso.textContent = '📍 Não conseguimos achar o seu endereço pela localização agora. Digite a rua, o bairro, o número e a cidade.'; } }catch(e){}
}
function onMudarTipoCdEntrega(){
  try{ return onMudarTipoCdEntregaBase_(); }
  catch(e){
    /* nunca deixa a troca de Retirada/Entrega "não ir" calada: mostra o endereço e avisa */
    try{ const t = document.getElementById('cdTipoEntrega'), b = document.getElementById('cdEnderecoBox'); if(t && b) b.style.display = t.value==='Entrega' ? 'block' : 'none'; }catch(_){}
    try{ mostrarErro_(msgErroPrograma_(e && e.message), { origem:'onMudarTipoCdEntrega' }); }catch(_){}
  }
}
function onMudarTipoCdEntregaBase_(){
  const tipo = document.getElementById('cdTipoEntrega').value;
  if(tipo==='Entrega'){ try{ cdPreencherEnderecoPorLocal_(); }catch(e){} }
  document.getElementById('cdEnderecoBox').style.display = tipo==='Entrega' ? 'block':'none';
  const tempo = tipo==='Entrega' ? (cdDados.config&&cdDados.config.tempoEntrega) : (cdDados.config&&cdDados.config.tempoRetirada);
  const taxaCd = Number(cdDados.config && cdDados.config.taxaEntrega) || 0;
  const freteGratis=!!(cdCupomAplicado&&cdCupomAplicado.freteGratis); document.getElementById('cdTempoEstimado').textContent = (tempo ? ('⏱️ Tempo estimado: '+tempo) : '') + ((tipo==='Entrega' && taxaCd>0) ? ((tempo?' · ':'') + (freteGratis?'🛵 Frete grátis':'🛵 Taxa de entrega: R$ '+taxaCd.toFixed(2).replace('.',',')+' incluída no total')) : '');
  cdAtualizarTotal_();
}
function onMudarFormaPagamentoCd(){
  const sel = document.getElementById('cdFormaPagamento');
  try{ cdAtualizarTotal_(); }catch(e){}
  try{ cdCupomReconferir_(); }catch(e){}
  const forma = (cdDados.formasPagamento||[]).find(f=>f.id===sel.value);
  const ehDinheiro = forma && forma.nome.toLowerCase()==='dinheiro';
  document.getElementById('cdTrocoBox').style.display = ehDinheiro ? 'block' : 'none';
  if(!ehDinheiro){ document.getElementById('cdPrecisaTroco').checked = false; document.getElementById('cdTrocoParaBox').style.display = 'none'; }
}
function onTogglePrecisaTroco(){
  document.getElementById('cdTrocoParaBox').style.display = document.getElementById('cdPrecisaTroco').checked ? 'block' : 'none';
}
/* Campo obrigatório faltando: deixa o campo vermelho, escreve o motivo logo abaixo dele, rola até ele e repete a mensagem perto do botão.
   (Antes a mensagem aparecia só embaixo do botão e sumia em 6 s: no celular, o cliente não via o que faltava.) */
function cdErroCampo_(id, msg){
  try{ showMsg('cdCheckoutMsg', msg, 'warn'); }catch(e){}
  const el = document.getElementById(id);
  if(!el){ try{ mostrarErro_(msg, { registrar:false }); }catch(e){} return false; }
  try{
    el.classList.add('campo-erro'); el.setAttribute('aria-invalid', 'true');
    let d = document.getElementById(id + 'Erro');
    if(!d){ d = document.createElement('div'); d.id = id + 'Erro'; d.className = 'campo-erro-msg'; d.setAttribute('role', 'alert'); el.insertAdjacentElement('afterend', d); }
    d.textContent = '⚠️ ' + msg;
    const limpar = ()=>{ el.classList.remove('campo-erro'); el.removeAttribute('aria-invalid'); try{ d.remove(); }catch(e){} el.removeEventListener('input', limpar); el.removeEventListener('change', limpar); };
    el.addEventListener('input', limpar); el.addEventListener('change', limpar);
    setTimeout(()=>{ try{ el.scrollIntoView({ block:'center', behavior:'smooth' }); }catch(e){} }, 60);
    setTimeout(()=>{ try{ el.focus({ preventScroll:true }); }catch(e){} }, 450);
  }catch(e){}
  return false;
}
async function finalizarPedidoPublico(){
  if(mesaQr) return finalizarPedidoMesa_();
  if(cdDados && cdDados.cardapioBloqueio) return showMsg('cdCheckoutMsg', cdDados.cardapioBloqueio, 'warn'); // cardápio fechado pelo restaurante
  const nome = document.getElementById('cdNome').value.trim();
  const telefone = document.getElementById('cdTelefone').value.trim();
  const tipoEntrega = document.getElementById('cdTipoEntrega').value;
  const formaPagamentoId = document.getElementById('cdFormaPagamento').value;
  if(!nome) return cdErroCampo_('cdNome', 'Informe o seu nome para enviar o pedido.');
  if(!telefone && !mesaQr) return cdErroCampo_('cdTelefone', 'Informe o seu telefone (WhatsApp) para enviar o pedido.');
  if(!telefone) return showMsg('cdCheckoutMsg','Informe nome e telefone.','warn');
  const brindes = cdBrindes_();
  if(!cdCarrinho.length && !brindes.length) return showMsg('cdCheckoutMsg','Seu carrinho está vazio.','warn');
  cdGuardarContato_(nome, telefone);
  const dadosEntrega = tipoEntrega==='Entrega' ? {
    endereco: document.getElementById('cdEndereco').value.trim().replace(/[,\s]+$/,''),
    numero: (document.getElementById('cdNumero')||{value:''}).value.trim(),
    cidade: (document.getElementById('cdCidade')||{value:''}).value.trim(),
    complemento: document.getElementById('cdComplemento').value.trim(),
    referencia: document.getElementById('cdReferencia').value.trim(), observacoes: (document.getElementById('cdObservacoes')||{}).value.trim()
  } : null;
  if(tipoEntrega==='Entrega' && !dadosEntrega.endereco) return cdErroCampo_('cdEndereco', 'Informe a rua e o bairro da entrega.');
  if(tipoEntrega==='Entrega' && !dadosEntrega.numero) return cdErroCampo_('cdNumero', 'Informe o NÚMERO da casa (ou "s/n" se não tiver). Sem o número o pedido não é enviado.');
  if(tipoEntrega==='Entrega' && !dadosEntrega.cidade) return cdErroCampo_('cdCidade', 'Informe a cidade da entrega.');
  const formaEscolhida = (cdDados.formasPagamento||[]).find(f=>f.id===formaPagamentoId);
  const precisaTrocoBox = document.getElementById('cdPrecisaTroco');
  const ehDinheiro = formaEscolhida && formaEscolhida.nome.toLowerCase()==='dinheiro';
  if(ehDinheiro && precisaTrocoBox && precisaTrocoBox.checked){
    const trocoPara = Number(document.getElementById('cdTrocoPara').value)||0;
    if(trocoPara <= totalCarrinhoCd()) return cdErroCampo_('cdTrocoPara', 'O valor pro troco precisa ser maior que o total do pedido.');
  }
  const trocoParaObs = (ehDinheiro && precisaTrocoBox && precisaTrocoBox.checked) ? ('Troco para R$ '+Number(document.getElementById('cdTrocoPara').value).toFixed(2)) : '';

  await cdMpConfigPublica_();
  const tipoOnline = cdMpTipoForma_(formaPagamentoId);
  if(tipoOnline==='pix' || tipoOnline==='credito' || tipoOnline==='debito'){
    const dadosMp=cdMpPayloadPedido_(nome,telefone,tipoEntrega,dadosEntrega,trocoParaObs);
    return cdMpIniciarPagamento_(dadosMp,tipoOnline);
  }

  const btn = document.getElementById('cdEnviarPedidoBtn');
  btn.disabled = true; btn.textContent = 'Enviando...';

  const _preventivoPublico = !brindes.length && !modoContingenciaAtivo && servidorLento_() && !cdCupomAplicado && !!CONTINGENCIA_CHAVE_PUBLICA; // BLOCO 1.2 (com cupom não: a contingência não aplica desconto)
  let _contFalhou = false;
  if(brindes.length && modoContingenciaAtivo){ btn.disabled=false; btn.textContent = cdRotuloEnviar_(); return showMsg('cdCheckoutMsg','Com brinde da sua conta o pedido precisa do sistema principal, que está instável agora. Tente de novo em instantes ou tire o brinde do carrinho.','warn'); }
  if(modoContingenciaAtivo || _preventivoPublico){
    try{
      const idFila = (_idFilaContingencia = _idFilaContingencia || ('cd-' + Date.now() + '-' + Math.random().toString(36).slice(2,8))); // mesmo id em toda nova tentativa: a fila da contingência não duplica
      const itens = cdCarrinho.map(it=>{
        const extra = it.adicionais.reduce((s,a)=>s+a.preco,0);
        const nomeComAdicionais = it.nome + (cdEscolhasTexto_(it) ? ' ('+cdEscolhasTexto_(it)+')' : '') + (it.adicionais.length ? ' + '+it.adicionais.map(a=>a.nome).join(', ') : '') + (it.obs ? ' — Obs: '+it.obs : '');
        const base = { descricao: nomeComAdicionais, quantidade: it.qtd, valorUnitario: it.precoBase + extra, custoUnitario: 0, adicionaisIds: it.adicionais.map(a=>a.id), escolhas: cdEscolhasPayload_(it) };
        return it.tipo==='produto' ? Object.assign({produtoId: it.id}, base) : Object.assign({comboId: it.id}, base);
      });
      const total = itens.reduce((s,it)=>s+it.valorUnitario*it.quantidade, 0);
      const forma = (cdDados.formasPagamento||[]).find(f=>f.id===formaPagamentoId);
      const dados = {
        itens, clienteNome: nome, clienteTelefone: telefone,
        pagamentos: [{ forma: forma?forma.nome:'', valor: total }],
        tipoEntrega, statusPagamento: 'A Receber', desconto: null, senhaAdminConfirmacao: '', origem: 'Cardápio',
        /* na contingência o endereço vai completo num campo só (número e cidade junto) */
        dadosEntrega: dadosEntrega ? Object.assign({}, dadosEntrega, { endereco: [dadosEntrega.endereco + (dadosEntrega.numero ? ', nº ' + dadosEntrega.numero : ''), dadosEntrega.cidade].filter(Boolean).join(' — ') }) : null
      };
      const r = await fetchContingencia_({
        method: 'post', body: JSON.stringify({ action: 'enfileirar', chave: CONTINGENCIA_CHAVE_PUBLICA, id: idFila, tipo: 'venda', dados })
      }, TIMEOUT_CONT_ENVIO_MS_, TIMEOUT_CONT_REPETICOES_);
      if(r.ok){
        showMsg('cdCheckoutMsg', 'Pedido recebido! Estamos com uma instabilidade — seu pedido foi guardado e vai ser confirmado assim que normalizar. Guarde este código: ' + idFila.slice(-6).toUpperCase(), 'ok');
        cdUltimaVendaId = null; mostrarBotaoWhatsappContingencia({id:idFila,numero:idFila.slice(-6).toUpperCase(),valorTotal:Math.round((total+acrescimoCdAtual_())*100)/100}); _idFilaContingencia = null;
        cdPedidoConcluido = true;
        btn.disabled=true; btn.textContent='Pedido guardado';
      } else { _contFalhou = true; showMsg('cdCheckoutMsg', 'Não foi possível registrar o pedido agora. Tente novamente em instantes.', 'warn'); btn.disabled=false; btn.textContent = cdRotuloEnviar_(); }
    } catch(e){
      if(!(e && e.timeout)) _contFalhou = true; // erro de rede (não chegou a guardar): no modo preventivo tenta a planilha; timeout não, para não duplicar
      showMsg('cdCheckoutMsg', (e && e.timeout) ? 'Não conseguimos confirmar o envio a tempo. Toque em Enviar pedido de novo — o pedido não será duplicado.' : 'Não foi possível enviar o pedido. Tente novamente.','warn');
      btn.disabled=false; btn.textContent = cdRotuloEnviar_();
    }
    if(!(_preventivoPublico && _contFalhou)) return;
    btn.disabled=true; btn.textContent='Enviando...'; // contingência recusou/ficou fora: segue para a planilha principal
  }

  const itens = cdCarrinho.map(it=>({
    produtoId: it.tipo==='produto' ? it.id : undefined,
    comboId: it.tipo==='combo' ? it.id : undefined,
    quantidade: it.qtd,
    adicionaisIds: it.adicionais.map(a=>a.id),
    escolhas: cdEscolhasPayload_(it),
    observacao: it.obs || ''
  }));
  const beneficios = brindes.map(b=>({ tipo:b.tipo, id:b.id, produtoId:b.produtoId }));
  const _reqCont = { itens, clienteTelefone: telefone, tipoEntrega, formaPagamentoId, beneficios };
  try{
    const r = await apiCall('criarPedidoCardapio', { requisicaoId: reqIdPersist_('pedido_cardapio', _reqCont), itens, clienteNome: nome, clienteTelefone: telefone, tipoEntrega, dadosEntrega, formaPagamentoId, observacaoTroco: trocoParaObs, codigoCupom: cdCupomAplicado ? cdCupomAplicado.codigo : '', beneficios, observacoes: (document.getElementById('cdObservacoes')||{}).value.trim() });
    if(r.ok){
      reqIdConfirmado_('pedido_cardapio', _reqCont);
      showMsg('cdCheckoutMsg', r.message, 'ok');
      cdUltimaVendaId = r.id;
      mostrarBotaoWhatsappPedido(r);
      mostrarLinkAcompanhamento(r.id, nome, r.numero);
      if(window.cdAvisosPosPedido_) window.cdAvisosPosPedido_(String(r.id).slice(-8));
      if(tipoEntrega==='Entrega' && window.cdEnviarLocalDoPedido_) window.cdEnviarLocalDoPedido_(r.id);
      cdPedidoConcluido = true;
      btn.disabled=true; btn.textContent='Pedido enviado';
    } else { showMsg('cdCheckoutMsg', '⚠️ ' + ((r && r.message) || 'O pedido NÃO foi enviado. Tente de novo.'), 'warn'); btn.disabled=false; btn.textContent = cdRotuloEnviar_(); }
  } catch(e){ showMsg('cdCheckoutMsg','⚠️ O pedido NÃO foi enviado (sem conexão ou o sistema demorou para responder). Confira a internet e toque em "Enviar pedido" de novo. Se continuar, peça pelo WhatsApp (17) 98832-3473.','warn'); btn.disabled=false; btn.textContent = cdRotuloEnviar_(); }
}


let cdCupomAplicado = null;
/* v1.24 — cupom: guarda em quais formas ele vale; ao trocar a forma de pagamento, o cupom é conferido de novo sozinho
   (sai se a forma nova não vale, volta sozinho se a pessoa escolher uma forma que vale) e a mensagem diz claramente o porquê. */
let _cdCupomFormasPend_ = null, _cdCupomConferindo_ = false, _cdCupomUltForma_ = '';
function cdCupomFormas_(){ const f = (cdCupomAplicado && cdCupomAplicado.formasIds) || (_cdCupomFormasPend_ && _cdCupomFormasPend_.formasIds) || []; return Array.isArray(f) ? f.map(String) : []; }
function cdCupomReconferir_(){
  const forma = (document.getElementById('cdFormaPagamento')||{}).value || '';
  if(forma === _cdCupomUltForma_) return;
  const cod = ((document.getElementById('cdCupom')||{}).value || '').trim();
  if(!cod || !(cdCupomAplicado || _cdCupomFormasPend_)) { _cdCupomUltForma_ = forma; return; }
  aplicarCupomPublicoUI(true);
}
function cdCupomResumoTxt_(r){ return [r.desconto>0 ? 'Desconto: -R$ '+Number(r.desconto).toFixed(2).replace('.',',') : '', r.freteGratis ? 'Frete grátis' : ''].filter(Boolean).join(' · '); }
async function aplicarCupomPublicoUI(automatico){
  const codigo=document.getElementById('cdCupom').value.trim(); const msg=document.getElementById('cdCupomMsg');
  const resumo=document.getElementById('cdCupomResumo');
  const formaId=(document.getElementById('cdFormaPagamento')||{}).value||'';
  const limpar=()=>{ cdCupomAplicado=null; if(resumo) resumo.textContent=''; try{ document.getElementById('cdCarrinhoTotal').textContent=cdFormatarPreco(Math.max(0.01,totalCarrinhoCd())); onMudarTipoCdEntrega(); }catch(e){} };
  if(!codigo){ if(automatico===true) return; msg.textContent='Digite o código do cupom.'; msg.className='msg warn'; return; }
  if(modoContingenciaAtivo){msg.textContent='Cupons ficam indisponíveis durante a contingência. Envie o pedido sem cupom ou tente novamente quando normalizar.';msg.className='msg warn';return;}
  if(_cdCupomConferindo_) return; _cdCupomConferindo_ = true; _cdCupomUltForma_ = formaId;
  const telefone=document.getElementById('cdTelefone').value.trim(); const subtotal=subtotalElegivelCd_(); const tipo=document.getElementById('cdTipoEntrega').value;
  const tinha=!!cdCupomAplicado;
  try{
    const r=await apiCall('validarCupomCardapio',{codigo,telefone,subtotal,tipoEntrega:tipo,formaPagamentoId:formaId,itens:cdCarrinho.map(it=>({tipo:it.tipo,id:it.id,qtd:it.qtd,precoBase:it.precoBase}))});
    if(r.ok && !(Number(r.desconto)>0) && !r.freteGratis && subtotal<=0){
      _cdCupomFormasPend_=null; limpar(); msg.textContent='Os itens do carrinho têm preço promocional e não aceitam cupom.'; msg.className='msg warn';
    } else if(r.ok){
      _cdCupomFormasPend_=null; cdCupomAplicado=r;
      const so = (r.formasNomes ? ' · vale só para pagamento em '+r.formasNomes : '');
      msg.textContent=(automatico===true && !tinha ? '✅ Cupom de volta: ' : 'Cupom aplicado: ')+r.codigo+so+(subtotal<subtotalCarrinhoCd()?' (vale só para os itens sem preço promocional)':''); msg.className='msg ok';
      if(resumo) resumo.textContent=cdCupomResumoTxt_(r);
      document.getElementById('cdCarrinhoTotal').textContent=cdFormatarPreco(Math.max(0.01,totalCarrinhoCd())); onMudarTipoCdEntrega();
    } else {
      limpar();
      if(r.motivo==='forma'){
        _cdCupomFormasPend_ = { formasIds: r.formasIds || [], formasNomes: r.formasNomes || '' };
        const botoes = (r.formasIds||[]).map(id=>{ const f=(cdDados.formasPagamento||[]).find(x=>String(x.id)===String(id)); return f ? `<button type="button" class="small-gold" style="width:auto;margin:6px 6px 0 0;padding:6px 12px;" onclick="cdEscolherForma_('${escH(f.id)}')">Pagar com ${escH(f.nome)}</button>` : ''; }).join('');
        msg.innerHTML='⚠️ '+escH(r.message)+(tinha?' O desconto foi tirado do total.':'')+(botoes?'<div>'+botoes+'</div>':'');
        msg.className='msg warn';
      } else { _cdCupomFormasPend_=null; msg.textContent=r.message; msg.className='msg warn'; }
    }
  }catch(e){ msg.textContent='Não foi possível conferir o cupom agora. Confira a internet e toque em "Aplicar cupom" de novo.'; msg.className='msg warn'; }
  finally{ _cdCupomConferindo_ = false; try{ cdRenderFormas_(); }catch(e){} }
}
function cdEnderecoTexto_(){
  const v = id => ((document.getElementById(id)||{}).value||'').trim();
  return [v('cdEndereco').replace(/[,\s]+$/,'') + (v('cdNumero') ? ', nº ' + v('cdNumero') : ''), v('cdCidade'), v('cdComplemento'), v('cdReferencia') ? 'Ref.: ' + v('cdReferencia') : ''].filter(Boolean).join(' — ');
}
function cdWaPedido_(r){
  const numero=r.numero||String(r.id).slice(-8).toUpperCase(); const itens=cdCarrinho.map(it=>`${it.qtd}x ${it.nome}${it.adicionais.length?' + '+it.adicionais.map(a=>a.nome).join(', '):''}`).join('\n');
  const nome=document.getElementById('cdNome').value.trim(); const tel=document.getElementById('cdTelefone').value.trim(); const tipo=document.getElementById('cdTipoEntrega').value; const total=Number(r.valorTotal||0);
  const endereco=tipo==='Entrega' ? cdEnderecoTexto_() : 'Retirada no balcão';
  const obs=(document.getElementById('cdObservacoes')||{}).value || '';
  const forma=(document.getElementById('cdFormaPagamento')||{}).selectedOptions ? ((document.getElementById('cdFormaPagamento').selectedOptions[0]||{}).textContent||'') : '';
  const cup=r.cupom?`\nCupom: ${r.cupom} (-R$ ${Number(r.valorDesconto||0).toFixed(2).replace('.',',')})`:'';
  const frete=r.freteGratis?'\nFrete: GRÁTIS':'';
  const taxaVal=(r.taxaEntrega!=null)?Number(r.taxaEntrega):(Number(total)-Number(r.valorOriginal||0)+Number(r.valorDesconto||0));   // pedido pago pelo site manda a taxa pronta
  const taxa=(tipo==='Entrega' && !r.freteGratis && taxaVal>0)?`\nTaxa de entrega: R$ ${taxaVal.toFixed(2).replace('.',',')}`:'';
  const linhaPagamento=r.pagamentoOnline ? `PAGO via ${String(r.pagamentoOnline)==='pix'?'Pix':'Cartão'} (${cdPagProvedor_(cdFormaAtualId_())==='infinitepay'?'InfinitePay':'Mercado Pago'}).\nNão cobrar na entrega` : `Pagamento: ${forma||'Não informado'}`;
  const msg=`🍔 ${NOME_UP_()}\nPedido #${numero}\nCliente: ${nome}\nWhatsApp: ${tel}\n${linhaPagamento}\n\n${itens}\n\nModalidade: ${tipo}\n${endereco}${obs?'\nObservações: '+obs:''}\nTotal: R$ ${total.toFixed(2).replace('.',',')}${taxa}${cup}${frete}`;
  return { msg, url:'https://wa.me/5517988323473?text='+encodeURIComponent(msg), numero };
}
function mostrarBotaoWhatsappPedido(r){
  const box=document.getElementById('cdCheckoutMsg'); if(!box||!r||!r.id)return;
  const w=cdWaPedido_(r);
  cdMostrarConfirmacaoPedido_(w.url, w.numero, false, r.id);
}


/* ---------- CONFIRMAÇÃO FIXA DO PEDIDO + WHATSAPP (abre sozinho em 3 s, com opção de cancelar) ----------
   O botão antes ficava dentro da caixa de mensagem, que se apaga em 6 s. Agora fica num cartão que não some. */
let _cdWaTimer = null;
function cdPararContagemWa_(){ if(_cdWaTimer){ clearInterval(_cdWaTimer); _cdWaTimer = null; } }
document.addEventListener('visibilitychange', ()=>{ if(document.hidden) cdPararContagemWa_(); });
window.addEventListener('pagehide', cdPararContagemWa_);
/* ITEM 11 — o app já está instalado neste aparelho? (mesmo critério do Item 7) */
function cdAppJaInstalado_(){
  try{
    if(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) return true;
    return localStorage.getItem('txAppInstalado') === '1';
  }catch(e){ return false; }
}
/* ITEM 11 — abre o pop-up de acompanhamento (Item 9) direto no pedido recém-feito */
function cdAbrirAcompanhamentoDoPedido_(vendaId){
  const codigo = String(vendaId || '').slice(-8); // mesmo código salvo por mostrarLinkAcompanhamento
  if(!codigo) return;
  document.getElementById('acompanhamentoConteudo').innerHTML = '<p class="sub">Carregando...</p>';
  document.getElementById('acompanhamentoPedido').classList.add('open');
  abrirStatusPedido(codigo);
}
window.addEventListener('appinstalled', function(){
  document.querySelectorAll('.cd-conf-instalar').forEach(function(e){ e.style.display = 'none'; });
});
function cdMostrarConfirmacaoPedido_(url, numero, contingencia, vendaId){
  const host = document.getElementById('cdConfirmacaoPedido'); if(!host) return;
  cdPararContagemWa_();
  host.innerHTML = '';
  const card = document.createElement('div'); card.className = 'cd-conf-card';
  const t = document.createElement('div'); t.className = 'cd-conf-titulo';
  t.textContent = contingencia ? '✅ Pedido guardado! Código ' + numero : '✅ Pedido enviado! Nº ' + numero;
  card.appendChild(t);
  const p = document.createElement('div'); p.className = 'cd-conf-texto';
  p.textContent = 'Toque no botão verde para enviar os detalhes do pedido pelo WhatsApp da loja.';
  card.appendChild(p);
  const a = document.createElement('a'); a.className = 'cd-conf-wa'; a.href = url; a.target = '_blank'; a.rel = 'noopener';
  a.textContent = '📲 Enviar pedido pelo WhatsApp';
  card.appendChild(a);
  const cont = document.createElement('div'); cont.className = 'cd-conf-cont';
  const txt = document.createElement('span'); cont.appendChild(txt);
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'cd-conf-cancel'; cancel.textContent = 'Cancelar';
  cont.appendChild(cancel);
  card.appendChild(cont);

  /* ===== ITEM 11 — Acompanhar agora (só pedido normal) ===== */
  if(!contingencia && vendaId){
    const ac = document.createElement('div'); ac.className = 'cd-conf-acoes';
    const bAc = document.createElement('button'); bAc.type = 'button'; bAc.className = 'cd-conf-sec';
    bAc.textContent = '📦 Acompanhar agora';
    bAc.onclick = function(){ cdPararContagemWa_(); cont.style.display = 'none'; cdAbrirAcompanhamentoDoPedido_(vendaId); };
    ac.appendChild(bAc);
    card.appendChild(ac);
  }
  /* ===== ITEM 11 — Convite para instalar o app (some se já instalado) ===== */
  if(!cdAppJaInstalado_()){
    const inst = document.createElement('div'); inst.className = 'cd-conf-instalar';
    const itx = document.createElement('div'); itx.className = 'cd-conf-inst-txt';
    itx.innerHTML = '<b>Peça mais rápido da próxima vez</b>Instale o app ' + NOME_H_() + ' na tela inicial do seu celular.';
    inst.appendChild(itx);
    const bIn = document.createElement('button'); bIn.type = 'button'; bIn.className = 'cd-conf-sec';
    bIn.textContent = '📲 Instalar app';
    bIn.onclick = function(){ cdPararContagemWa_(); cont.style.display = 'none'; if(window.instalarApp) window.instalarApp(); };
    inst.appendChild(bIn);
    card.appendChild(inst);
  }

  const dica = document.createElement('div'); dica.className = 'cd-conf-dica';
  dica.textContent = contingencia ? 'Guarde este código: ele identifica o seu pedido.' : 'Para ver o status a qualquer momento, toque em "Acompanhe seu pedido", no rodapé.';
  card.appendChild(dica);
  try{ if(!contingencia && window.contaConvitePosPedido_){ const cv = window.contaConvitePosPedido_(); if(cv) card.appendChild(cv); } }catch(e){}   // v1.24: convite para entrar com o Google
  host.appendChild(card);
  try{ card.scrollIntoView({ behavior:'smooth', block:'center' }); }catch(e){}
  let resta = 3;
  const mostrar = ()=>{ txt.textContent = 'Abrindo o WhatsApp em ' + resta + 's…'; };
  mostrar();
  _cdWaTimer = setInterval(()=>{
    resta--;
    if(resta <= 0){ cdPararContagemWa_(); cont.style.display = 'none'; window.location.href = url; return; }
    mostrar();
  }, 1000);
  cancel.onclick = ()=>{ cdPararContagemWa_(); txt.textContent = 'Abertura automática cancelada.'; cancel.style.display = 'none'; };
  a.addEventListener('click', ()=>{ cdPararContagemWa_(); cont.style.display = 'none'; });
}

function mostrarBotaoWhatsappContingencia(r){
  const box=document.getElementById('cdCheckoutMsg'); if(!box||!r||!r.id)return;
  const itens=cdCarrinho.map(it=>`${it.qtd}x ${it.nome}${it.adicionais.length?' + '+it.adicionais.map(a=>a.nome).join(', '):''}`).join('\n');
  const nome=document.getElementById('cdNome').value.trim(); const tel=document.getElementById('cdTelefone').value.trim(); const tipo=document.getElementById('cdTipoEntrega').value; const total=Number(r.valorTotal||0);
  const endereco=tipo==='Entrega' ? cdEnderecoTexto_() : 'Retirada no balcão';
  const obs=(document.getElementById('cdObservacoes')||{}).value || '';
  const msg=`🍔 ${NOME_UP_()}\nPEDIDO EM CONTINGÊNCIA\nCódigo: ${r.numero||String(r.id).slice(-6).toUpperCase()}\nCliente: ${nome}\nWhatsApp: ${tel}\n\n${itens}\n\nModalidade: ${tipo}\n${endereco}${obs?'\nObservações: '+obs:''}\nTotal informado: R$ ${total.toFixed(2).replace('.',',')}`;
  cdMostrarConfirmacaoPedido_('https://wa.me/5517988323473?text='+encodeURIComponent(msg), r.numero||String(r.id).slice(-6).toUpperCase(), true);
}
/* ---------- FEEDBACK (ITEM 34) — sempre disponível, com ou sem pedido ---------- */
let cdUltimaVendaId = null;
let cdNotaEscolhida = 0;
let cdFeedbackCodigo_ = '', cdFeedbackOrigem_ = 'formulario';   // pedido (8 últimos do id) e de onde veio: formulario | aviso | chat
function abrirFeedbackPublico(){
  cdNotaEscolhida = 0; cdFeedbackCodigo_ = ''; cdFeedbackOrigem_ = 'formulario';
  document.querySelectorAll('#cdEstrelas span').forEach(s=>s.classList.remove('on'));
  document.getElementById('cdFeedbackComentario').value = '';
  document.getElementById('cdFeedbackMsg').innerHTML = '';
  const titulo = document.getElementById('cdFeedbackTitulo');
  if(cdUltimaVendaId){
    titulo.textContent = 'Como foi seu pedido?';
    document.getElementById('cdFeedbackNome').value = document.getElementById('cdNome') ? document.getElementById('cdNome').value : '';
    document.getElementById('cdFeedbackTelefone').value = document.getElementById('cdTelefone') ? document.getElementById('cdTelefone').value : '';
  } else {
    titulo.textContent = 'Fale com a gente';
    document.getElementById('cdFeedbackNome').value = '';
    document.getElementById('cdFeedbackTelefone').value = '';
  }
  document.getElementById('cdFeedbackModal').classList.add('open');
}
function fecharFeedbackPublico(){ document.getElementById('cdFeedbackModal').classList.remove('open'); }
/* feedback aberto pelo aviso "Como foi seu pedido?" (origem aviso) ou pelo atendente do chat (origem chat, já com o texto do cliente) */
function cdAbrirFeedbackEspecial_(o){
  abrirFeedbackPublico();
  cdFeedbackOrigem_ = o.origem === 'chat' ? 'chat' : 'aviso';
  cdFeedbackCodigo_ = /^[0-9a-f]{8}$/.test(String(o.codigo || '')) ? String(o.codigo) : '';
  if(o.titulo) document.getElementById('cdFeedbackTitulo').textContent = o.titulo;
  if(o.comentario) document.getElementById('cdFeedbackComentario').value = String(o.comentario).slice(0, 500);
  const m = document.getElementById('cdFeedbackModal'); if(m) m.style.zIndex = '10050';   // por cima do chat
}
document.addEventListener('click', (e)=>{
  const estrela = e.target.closest('#cdEstrelas span');
  if(estrela){
    cdNotaEscolhida = Number(estrela.dataset.n);
    document.querySelectorAll('#cdEstrelas span').forEach(s=> s.classList.toggle('on', Number(s.dataset.n) <= cdNotaEscolhida));
  }
});
async function enviarFeedbackPublico(){
  if(!cdNotaEscolhida) return showMsg('cdFeedbackMsg','Toque nas estrelas para dar uma nota.','warn');
  try{
    const r = await apiCallFila('addFeedback', {
      vendaId: cdFeedbackCodigo_ ? undefined : cdUltimaVendaId,
      codigo: cdFeedbackCodigo_ || undefined,
      origem: cdFeedbackOrigem_,
      telefone: document.getElementById('cdFeedbackTelefone').value.trim(),
      nome: document.getElementById('cdFeedbackNome').value.trim(),
      nota: cdNotaEscolhida,
      comentario: document.getElementById('cdFeedbackComentario').value.trim()
    });
    showMsg('cdFeedbackMsg', r.message || 'Obrigado!', 'ok');
    setTimeout(fecharFeedbackPublico, 1000);
  } catch(e){ showMsg('cdFeedbackMsg','Não foi possível enviar agora.','warn'); }
}

/* ---------- Busca no cardápio (computador): filtra os produtos já mostrados, sem mexer nos dados ---------- */
(function(){
  function norm_(s){ return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim(); }
  function aplicar_(){
    const inp = document.getElementById('cdBuscaProduto'); if(!inp) return;
    const q = norm_(inp.value), lista = document.getElementById('cdListaProdutos'), vazio = document.getElementById('cdBuscaVazio');
    ['cdMaisPedidos','cdDestaques'].forEach(function(id){ const e = document.getElementById(id); if(e) e.style.display = q ? 'none' : ''; });
    if(!lista) return;
    let achou = 0;
    lista.querySelectorAll('.cd-card').forEach(function(c){
      const t = norm_((c.querySelector('.cd-nome') || {}).textContent) + ' ' + norm_((c.querySelector('.cd-desc') || {}).textContent);
      const ok = !q || t.indexOf(q) !== -1;
      c.style.display = ok ? '' : 'none'; if(ok) achou++;
    });
    lista.querySelectorAll('.cd-cat-bloco').forEach(function(b){
      b.style.display = (!q || b.querySelector('.cd-card:not([style*="display: none"])')) ? '' : 'none';
    });
    if(vazio) vazio.style.display = (q && !achou) ? 'block' : 'none';
  }
  function ligar_(){
    const inp = document.getElementById('cdBuscaProduto'), lista = document.getElementById('cdListaProdutos');
    if(!inp || inp._ligado) return; inp._ligado = true;
    inp.addEventListener('input', function(){
      if(norm_(inp.value) && typeof cdCategoriaAtiva !== 'undefined' && cdCategoriaAtiva !== 'todas'){ try{ selecionarCdCategoria('todas'); }catch(e){} }
      aplicar_();
    });
    inp.addEventListener('keydown', function(e){ if(e.key === 'Escape' && inp.value){ inp.value = ''; aplicar_(); e.stopPropagation(); } });
    if(lista && window.MutationObserver) new MutationObserver(function(){ if(norm_(inp.value)) aplicar_(); }).observe(lista, { childList:true, subtree:true });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar_); else ligar_();
})();
