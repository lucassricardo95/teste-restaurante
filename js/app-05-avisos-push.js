/* ---------- Avisos com o app FECHADO (Web Push; Admin/Operador e, desde 18/10/2026, Cozinha e Garçom para os alertas de pedido parado). O servidor manda "Novo pedido" e "Cliente aguardando" mesmo com o app fechado. ---------- */
const PUSH_CHAVE_PUBLICA_ = (window.RESTAURANTE && window.RESTAURANTE.pushChave) || '';   // chave pública dos avisos (config-restaurante.js)
function pushSuportado_(){ try{ return location.protocol==='https:' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }catch(e){ return false; } }
function pushChaveBytes_(b64){ const pad = '='.repeat((4 - b64.length % 4) % 4), raw = atob((b64 + pad).replace(/-/g,'+').replace(/_/g,'/')); const a = new Uint8Array(raw.length); for(let i=0;i<raw.length;i++) a[i] = raw.charCodeAt(i); return a; }
async function pushInscricaoAtual_(){ try{ const reg = await navigator.serviceWorker.getRegistration(); return reg ? await reg.pushManager.getSubscription() : null; }catch(e){ return null; } }
async function atualizarPush_(){
  const box = document.getElementById('pushBox'); if(!box) return;
  const nivel = currentUser && currentUser.nivel;
  const pode = pushSuportado_() && ['Admin','Operador','Desenvolvedor','Cozinha','Garçom'].indexOf(nivel) !== -1;   // Cozinha e Garçom: alertas de pedido parado (18/10/2026)
  box.style.display = pode ? '' : 'none'; if(!pode) return;
  const sub = await pushInscricaoAtual_(), btn = document.getElementById('pushBtn'), txt = document.getElementById('pushTexto');
  const bloqueado = Notification.permission==='denied';
  if(sub && Notification.permission==='granted'){ txt.textContent = 'Ligado neste aparelho: você recebe os avisos (pedido novo, cliente aguardando, pedido parado) mesmo com o app fechado.'; btn.textContent = 'Desligar avisos com o app fechado'; btn.className = 'ghost'; }
  else if(bloqueado){ txt.textContent = 'As notificações estão bloqueadas neste aparelho. Libere em configurações do navegador → permissões do site → Notificações.'; btn.textContent = 'Bloqueado'; btn.className = 'ghost'; btn.disabled = true; return; }
  else { txt.textContent = 'Receba o aviso de pedido novo e de cliente aguardando mesmo com o app fechado. No iPhone, instale o app na tela inicial primeiro (Compartilhar → Adicionar à Tela de Início).'; btn.textContent = 'Ligar avisos com o app fechado'; btn.className = 'primary'; }
  btn.disabled = false;
}
async function alternarPush_(){
  const btn = document.getElementById('pushBtn'); if(!btn || btn.disabled) return; btn.disabled = true;
  try{
    const sub = await pushInscricaoAtual_();
    if(sub && Notification.permission==='granted'){
      const ep = sub.endpoint; await sub.unsubscribe();
      try{ await apiCall('pushCancelar', { endpoint: ep }); }catch(e){}
      showMsg('avisosMsg', 'Avisos com o app fechado desligados neste aparelho.', 'ok');
    }else{
      const perm = await Notification.requestPermission();
      if(perm !== 'granted'){ showMsg('avisosMsg', 'Sem a permissão do navegador não dá para ligar. Permita as notificações e tente de novo.', 'warn'); return; }
      const reg = await navigator.serviceWorker.ready;
      if(!PUSH_CHAVE_PUBLICA_) throw new Error('Os avisos no celular ainda não foram configurados neste restaurante.');
      const novo = sub || await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: pushChaveBytes_(PUSH_CHAVE_PUBLICA_) });
      const r = await apiCall('pushInscrever', novo.toJSON());
      if(!r || !r.ok){ try{ await novo.unsubscribe(); }catch(e){} showMsg('avisosMsg', (r && r.message) || 'Não foi possível ligar agora.', 'warn'); return; }
      showMsg('avisosMsg', 'Ligado. Para testar, peça um pedido pelo cardápio com o app fechado.', 'ok');
    }
  }catch(e){ showMsg('avisosMsg', 'Não foi possível concluir agora. Tente de novo.', 'warn'); }
  finally{ btn.disabled = false; atualizarPush_(); atualizarCardAvisos_(); }
}
/* ao entrar: se este aparelho já tem a inscrição, passa para o usuário que entrou (e mantém a inscrição viva) */
async function pushReinscreverSilencioso_(){
  try{
    if(!pushSuportado_() || Notification.permission!=='granted') return;
    const sub = await pushInscricaoAtual_(); if(!sub) return;
    await sbRpc_('api_push_inscrever', { p: sub.toJSON() });
  }catch(e){}
}
/* ao sair: este aparelho deixa de receber os avisos do usuário que saiu */
async function pushSairLocal_(s){
  try{
    const sub = await pushInscricaoAtual_(); if(!sub) return;
    const ep = sub.endpoint; await sub.unsubscribe();
    if(s && s.access_token) await sbJson_(SUPABASE_URL_ + '/rest/v1/rpc/api_push_cancelar', { method:'POST', headers:{ 'apikey': SUPABASE_CHAVE_, 'Authorization': 'Bearer ' + s.access_token, 'Content-Type':'application/json' }, body: JSON.stringify({ p:{ endpoint: ep } }) }, 8000);
  }catch(e){}
}
function abrirModalAvisos_(){ atualizarPush_(); atualizarCardAvisos_(); const m = document.getElementById('avisosModal'); if(m) m.classList.add('open'); }
function fecharModalAvisos_(){ const m = document.getElementById('avisosModal'); if(m) m.classList.remove('open'); }
function atualizarCardAvisos_(){
  const botao = document.getElementById('avisosBtnTopo'); if(!botao) return;
  const nivel = currentUser && currentUser.nivel;
  botao.style.display = '';   // Garçom também (alerta de mesa pronta sem servir)
  botao.classList.toggle('pendente', avisosSuportado_() && Notification.permission==='default'); // ainda não ativou: chama atenção
  const txt = document.getElementById('avisosTexto'), btn = document.getElementById('avisosAtivarBtn');
  let t, mostrar = false;
  if(!avisosSuportado_()) t = 'Este navegador não mostra notificações. O som e a vibração funcionam com o app aberto e a tela ligada.';
  else if(Notification.permission==='granted') t = 'Notificações ativadas neste aparelho. Deixe o app aberto e a tela ligada para receber os avisos.';
  else if(Notification.permission==='denied') t = 'As notificações estão bloqueadas neste aparelho. Para liberar: configurações do navegador → permissões do site → Notificações.';
  else { t = 'Toque em “Ativar avisos” e permita as notificações para ser avisado quando chegar pedido novo.'; mostrar = true; }
  if(txt) txt.textContent = t;
  if(btn) btn.style.display = mostrar ? '' : 'none';
}
try{ if('serviceWorker' in navigator && location.protocol==='https:') navigator.serviceWorker.register('sw.js').catch(()=>{}); }catch(e){}
/* ITEM 20 — o service worker avisa quando a página guardada ficou velha; o usuário atualiza quando quiser (nunca no meio de uma venda). */
try{ if('serviceWorker' in navigator){ navigator.serviceWorker.addEventListener('message', ev=>{ if(ev.data && ev.data.tipo === 'nova-versao') mostrarAvisoNovaVersao_(); }); } }catch(e){}
function mostrarAvisoNovaVersao_(){
  if(document.getElementById('avisoNovaVersao')) return;
  /* v1.15 — cliente no cardápio (sem login), sem janela aberta e sem pedido em andamento: atualiza sozinho (uma vez),
     para não ficar com a versão velha guardada no celular. O carrinho fica guardado no aparelho. */
  try{
    const semLogin = (typeof currentUser === 'undefined' || !currentUser) && !localStorage.getItem(SESSAO_KEY);
    const janela = document.querySelector('.modal-overlay.open');
    const pedindo = (typeof cdPedidoConcluido !== 'undefined' && cdPedidoConcluido) || (typeof _idFilaContingencia !== 'undefined' && _idFilaContingencia);
    if(semLogin && !janela && !pedindo && !sessionStorage.getItem('txbAtualizouSozinho')){
      sessionStorage.setItem('txbAtualizouSozinho', '1');
      try{ if(typeof cdSalvarCarrinho_ === 'function') cdSalvarCarrinho_(); }catch(e){}
      location.reload(); return;
    }
  }catch(e){}
  const b = document.createElement('div');
  b.id = 'avisoNovaVersao'; b.setAttribute('role','status');
  b.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:99999;background:#1b1b1b;color:#fff;border:1px solid var(--gold,#d9a21b);border-radius:12px;padding:12px 14px;font:600 14px system-ui,sans-serif;display:flex;gap:10px;align-items:center;justify-content:space-between;box-shadow:0 6px 24px rgba(0,0,0,.45)';
  b.innerHTML = '<span>🍔 Nova versão disponível' + ((typeof currentUser === 'undefined' || !currentUser) ? ' — toque em Atualizar (seu carrinho fica guardado)' : '') + '</span><button type="button" style="background:var(--gold,#d9a21b);color:#111;border:0;border-radius:8px;padding:8px 12px;font-weight:700;cursor:pointer">Atualizar</button>';
  b.querySelector('button').onclick = ()=> location.reload();
  document.body.appendChild(b);
}

function alternarSomCozinha(){
  cozinhaSomLigado = !cozinhaSomLigado;
  localStorage.setItem('cozinhaSom', cozinhaSomLigado ? '1' : '0');
  if(cozinhaSomLigado) beepCozinha_(); // o toque também libera o áudio do navegador
  atualizarStatusDetector_();
}
function alertaVisualCozinha_(qtd){
  const b = document.getElementById('cozinhaBoard'); if(b){ b.classList.remove('cz-flash'); void b.offsetWidth; b.classList.add('cz-flash'); }
  const tituloOriginal = document.title.replace(/^🔔 \(\d+\) Novo pedido — /,'');
  document.title = '🔔 ('+qtd+') Novo pedido — '+tituloOriginal;
  setTimeout(()=>{ document.title = tituloOriginal; }, 10000);
}
let caixaVistos = null, leveVistos = null;
async function detectarNovosCozinha_(manual){
  if(!apiConfigurada() || !souDetector_()) return;
  if(document.hidden && !manual && !souDetectorLeve_()) return; // entregador/garçom também checam com a aba em segundo plano
  try{
    const r = await apiCall('detectarNovosPedidos', {});
    if(!r || !r.ok) return;
    if(souDetectorLeve_()){
      const ehEntregador = currentUser.nivel==='Entregador';
      const lista = (ehEntregador ? r.entregas : r.prontas) || [];
      let novosL = [];
      if(leveVistos === null) leveVistos = new Set(lista);
      else { novosL = lista.filter(id=>!leveVistos.has(id)); lista.forEach(id=>leveVistos.add(id)); }
      cozinhaUltimaChecagem = new Date();
      if(novosL.length){
        if(ehEntregador) avisarEventoLeve_('🛵 Nova entrega!', novosL.length>1 ? novosL.length+' entregas novas para você.' : 'Você recebeu uma entrega nova.', 'Nova entrega');
        else avisarEventoLeve_('🍽️ Pedido pronto!', novosL.length>1 ? novosL.length+' pedidos prontos nas suas mesas.' : 'Um pedido da sua mesa está pronto.', 'Pedido pronto');
        if(seguroParaSincronizar()) await sincronizarEmSegundoPlano(); else cozinhaSyncPendente = true;
      } else if(cozinhaSyncPendente && seguroParaSincronizar()){ cozinhaSyncPendente = false; await sincronizarEmSegundoPlano(); }
      return;
    }
    const atuais = r.ids || [];
    let novos = [];
    if(cozinhaVistos === null){ cozinhaVistos = new Set(atuais); }
    else { novos = atuais.filter(id=>!cozinhaVistos.has(id)); atuais.forEach(id=>cozinhaVistos.add(id)); }
    /* Caixa/Admin: só avisa de pedido que espera aceite (status "Recebido", ex.: Cardápio Digital), nunca das vendas do próprio balcão. */
    let novosCaixa = [];
    if(!souCozinha_() && Array.isArray(r.recebidos)){
      if(caixaVistos === null){ caixaVistos = new Set(r.recebidos); }
      else { novosCaixa = r.recebidos.filter(id=>!caixaVistos.has(id)); r.recebidos.forEach(id=>caixaVistos.add(id)); }
    }
    cozinhaUltimaChecagem = new Date(); _czLacuna = null;
    if(souCozinha_()){ const naTela_ = new Set((vendas || []).map(v=>v.id)); if(atuais.some(id=>!naTela_.has(id))) cozinhaSyncPendente = true; }   /* pedido existe no servidor mas não na tela: baixa agora */
    /* v1.15 — pedido do iFood toca a vinheta do iFood (app-44); os outros seguem com o aviso de sempre */
    const ifoodSet_ = new Set(Array.isArray(r.ifood) ? r.ifood : []);
    const avisarSeparado_ = lista => {
      const ifd = lista.filter(id=>ifoodSet_.has(id)), outros = lista.filter(id=>!ifoodSet_.has(id));
      if(outros.length) avisarNovoPedido_(outros.length);
      if(ifd.length){ if(typeof avisarNovoPedidoIfood_ === 'function') avisarNovoPedidoIfood_(ifd.length); else avisarNovoPedido_(ifd.length); }
    };
    if(souCozinha_()){ if(novos.length){ avisarSeparado_(novos); cozinhaSyncPendente = true; } }
    else if(novosCaixa.length){ avisarSeparado_(novosCaixa); cozinhaSyncPendente = true; }
    if(cozinhaSyncPendente || (manual && souCozinha_())){
      if(seguroParaSincronizar()){ cozinhaSyncPendente = false; await sincronizarEmSegundoPlano(); }
    }
    if(souCozinha_() && comandaAuto_()) imprimirNovosCozinha(true);
    atualizarStatusDetector_();
  } catch(e){ atualizarStatusDetector_(true); }
}
function chipAtivarAvisosLeve_(){
  if(document.getElementById('chipAvisosLeve')) return;
  const semNotif = !avisosSuportado_() || Notification.permission==='granted';
  if(semNotif && cozinhaSomLigado && localStorage.getItem('avisosLeveOk')==='1') return;
  const b = document.createElement('button'); b.id = 'chipAvisosLeve'; b.type = 'button';
  b.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:9998;background:var(--gold,#d9a21b);color:#111;border:0;border-radius:20px;padding:10px 14px;font:700 13px system-ui,sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.4);';
  b.textContent = '🔔 Ativar avisos e som';
  b.onclick = async ()=>{
    try{ if(avisosSuportado_() && Notification.permission==='default') await Notification.requestPermission(); }catch(e){}
    cozinhaSomLigado = true; try{ localStorage.setItem('cozinhaSom','1'); localStorage.setItem('avisosLeveOk','1'); }catch(e){}
    beepCozinha_(); b.remove();
  };
  document.body.appendChild(b);
}
function iniciarDetectorCozinha(){
  if(!souDetector_() || cozinhaTimer) return;
  atualizarStatusDetector_();
  if(souDetectorLeve_()){
    chipAtivarAvisosLeve_();
    cozinhaTimer = setInterval(()=>{ if(!_rt_.ativo) detectarNovosCozinha_(false); }, SYNC_INTERVALO_MS);
    document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) detectarNovosCozinha_(false); });
    detectarNovosCozinha_(true);
    return; // sem "manter tela ligada": no celular do entregador/garçom isso gastaria bateria à toa
  }
  manterTelaLigada_();
  /* Cozinha: o tempo real pode cair sem avisar (celular, rede) e o pedido some da tela. Por isso a consulta leve (só ids) roda a cada 20 s
     mesmo com o tempo real ligado, e a tela é sincronizada por inteiro a cada 60 s enquanto está visível. Demais perfis seguem em 3 min. */
  cozinhaTimer = setInterval(()=>{ if(souCozinha_() || !_rt_.ativo) detectarNovosCozinha_(false); }, souCozinha_() ? 20000 : SYNC_INTERVALO_MS);
  if(souCozinha_()) setInterval(()=>{ if(!document.hidden && seguroParaSincronizar()) sincronizarEmSegundoPlano(); }, 60000);
  setInterval(manterTelaLigada_, 30000); // só local (bloqueio de tela), não chama a planilha
  setInterval(()=>{ if(!document.hidden) atualizarTelaLigadaUI_(); }, 15000); // recalcula o aviso de "sem verificação há N min"
  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden){ _czOcultoDesde = Date.now(); return; }
    const min = _czOcultoDesde ? Math.round((Date.now()-_czOcultoDesde)/60000) : 0;
    _czOcultoDesde = 0; if(min >= 1) _czLacuna = min;
    detectarNovosCozinha_(false); manterTelaLigada_(); atualizarTelaLigadaUI_();
  });
  detectarNovosCozinha_(true);
}

/* ---- Garçom: abrir mesa, lançar itens (enviar à cozinha) e pedir fechamento ---- */
function mesaSelecionadaGarcom_(){
  const sel = document.getElementById('vMesaSelect'); const id = sel ? sel.value : '';
  return id ? (mesas.find(m=>m.id===id) || null) : null;
}
function atualizarGarcomMesaInfo(){
  const el = document.getElementById('garcomMesaInfo');
  const resumo = document.getElementById('mesaAtualResumo');
  const m = mesaSelecionadaGarcom_();
  if(clienteMesaCarregadoDe_ && (!m || m.id!==clienteMesaCarregadoDe_ || m.status==='Livre')) limparClienteVenda(); // cliente mantido só enquanto for a mesma mesa e ela estiver aberta
  if(!m){
    if(el) el.textContent = 'Escolha uma mesa.';
    if(resumo) resumo.textContent = 'Escolha a mesa no passo 1.';
    return;
  }
  const contas = vendas.filter(v=>v.mesaId===m.id && v.status==='Confirmada' && v.statusPagamento==='A Receber');
  const total = Math.round(contas.reduce((s,v)=>s+Number(v.valorTotal),0)*100)/100;
  const txt = `Mesa ${escOc_(m.numero)}: <b>${escOc_(m.status)}</b>${contas.length?` · ${contas.length} pedido(s) lançado(s) — ${formatarMoeda(total)}`:''}`;
  if(el) el.innerHTML = txt;
  if(resumo) resumo.innerHTML = '🍽️ Lançando na ' + txt + ((modoCliente==='com' && clienteVendaSelecionado) ? ' · Cliente: <b>' + escOc_(clienteVendaSelecionado.nome) + '</b>' : '');
}
async function garcomAbrirMesa(){
  const m = mesaSelecionadaGarcom_();
  if(!m){ showMsg('vMsg','Escolha a mesa.','warn'); return; }
  if(m.status!=='Livre'){ showMsg('vMsg','A mesa '+m.numero+' já está "'+m.status+'".','warn'); return; }
  try{
    const r = await apiCall('editarStatusMesa', { id: m.id, novoStatus: 'Ocupada' });
    if(r.ok){ mesas = r.mesas || mesas; salvarCache(); renderMesasPickerCaixa(); renderMesas(); showMsg('vMsg','Mesa '+m.numero+' aberta.','ok'); }
    else showMsg('vMsg', r.message || 'Não foi possível abrir a mesa.', 'warn');
  } catch(e){ showMsg('vMsg','Sem conexão — a mesa não foi aberta.','warn'); }
}
async function garcomPedirFechamento(){
  const m = mesaSelecionadaGarcom_();
  if(!m){ showMsg('vMsg','Escolha a mesa.','warn'); return; }
  if(m.status!=='Ocupada'){ showMsg('vMsg','Só dá para pedir o fechamento de uma mesa ocupada.','warn'); return; }
  if(!await confirmarTxt_('Pedir o fechamento da mesa '+m.numero+'? O caixa vai receber a conta.')) return;
  try{
    const r = await apiCall('editarStatusMesa', { id: m.id, novoStatus: 'Aguardando fechamento' });
    if(r.ok){ mesas = r.mesas || mesas; salvarCache(); renderMesasPickerCaixa(); renderMesas(); showMsg('vMsg','Fechamento da mesa '+m.numero+' solicitado ao caixa.','ok'); }
    else showMsg('vMsg', r.message || 'Não foi possível pedir o fechamento.', 'warn');
  } catch(e){ showMsg('vMsg','Sem conexão — o fechamento não foi solicitado.','warn'); }
}
async function garcomEnviarPedido(){
  if(!carrinhoAtual.length){ showMsg('vMsg','Adicione ao menos um item.','warn'); return; }
  if(!sessaoCaixa){ showMsg('vMsg','O caixa está fechado — peça ao caixa para abrir.','warn'); return; }
  if(tipoEntregaAtual==='Mesa'){
    if(!mesaSelecionadaGarcom_()){ showMsg('vMsg','Escolha a mesa no passo 1.','warn'); mudarPainelCaixa('cliente'); return; }
    setMesaModoPagamento('sair');
  } else {
    if(!(modoCliente==='com' && clienteVendaSelecionado)){ showMsg('vMsg','Escolha ou cadastre o cliente no passo 1.','warn'); mudarPainelCaixa('cliente'); return; }
    if(tipoEntregaAtual==='Entrega' && !document.getElementById('vEndereco').value.trim()){ showMsg('vMsg','Informe o endereço de entrega no passo 1.','warn'); mudarPainelCaixa('cliente'); return; }
    const forma = (document.getElementById('garcomFormaPag')||{}).value;
    if(!forma){ showMsg('vMsg','Escolha a forma de pagamento.','warn'); return; }
    pagamentosAtuais = [{ forma, valor: totalCarrinho() }];
    statusPagamentoAtual = 'A Receber';
  }
  await finalizarVendaConfirmada(totalCarrinho(), null, '');
  if(!carrinhoAtual.length){ setTipoEntrega('Mesa'); setModoCliente('sem'); }
}
let _autoEntBusy_ = false;
function entregadorUnico_(){ const a = (usuarios||[]).filter(u=>u.nivel==='Entregador' && u.ativo); return a.length===1 ? a[0] : null; }
async function autoAtribuirEntregador_(){
  if(_autoEntBusy_ || !podeEnviarEntregador_()) return;
  const e = entregadorUnico_(); if(!e) return;
  const sem = vendas.filter(v=>v.status==='Confirmada' && v.tipoEntrega==='Entrega' && v.statusPedido && v.statusPedido!=='Entregue' && !v.entregador && !entregaPeloIfood_(v));
  if(!sem.length) return;
  _autoEntBusy_ = true;
  try{
    for(const v of sem){ const r = await apiCall('atribuirEntregador', { vendaId:v.id, entregador:e.login, entregadorVisto:'' }); if(r && r.ok){ vendas = r.vendas || vendas; } else break; }
    salvarCache(); renderEntregas();
  }catch(err){} finally{ _autoEntBusy_ = false; }
}
function renderEntregas(){
  try{ setTimeout(autoAtribuirEntregador_, 0); }catch(e){}
  const souEntregador = currentUser && currentUser.nivel === 'Entregador';
  const _ef = document.getElementById('entFmt'); if(_ef) _ef.value = lerFormato('entrega','80mm');
  let pendentes = vendas.filter(v=>v.status==='Confirmada' && v.tipoEntrega==='Entrega' && v.statusPedido && !(v.statusPedido==='Entregue' && v.statusPagamento!=='A Receber')).sort((a,b)=>a.timestamp-b.timestamp);
  if(souEntregador) pendentes = pendentes.filter(v=>v.entregador===loginVisao_() && !entregaPeloIfood_(v));

  if(souEntregador){
    const idsAtuais = pendentes.map(v=>v.id);
    const novas = idsAtuais.filter(id=>!entregasAlertadas.includes(id));
    if(novas.length){ tocarAlertaNovaEntrega(); entregasAlertadas = [...entregasAlertadas, ...novas]; localStorage.setItem('entregasAlertadasEntregador', JSON.stringify(entregasAlertadas)); }
  }

  const box = document.getElementById('entregasLista');
  if(box){
    box.innerHTML = pendentes.length ? pendentes.map(v=>{
      const prox = proximoStatusPedido(v);
      const endereco = `<div class="obs-line">${escH(v.endereco||'')}${escH(v.complemento?', '+v.complemento:'')}${escH(v.referencia?' — ref: '+v.referencia:'')}</div>`;
      const obs = v.observacoesEntrega ? `<div class="obs-line">Obs: ${escH(v.observacoesEntrega)}</div>` : '';
      const aReceber = v.statusPagamento==='A Receber' ? `<div class="obs-line" style="color:#f0d78c;">💰 A receber (${v.formaPagamento}) — ${(souEntregador||souGarcom_())?'':`<button class="ghost" style="padding:2px 8px;font-size:12px;" onclick="confirmarRecebimento('${v.id}')">marcar como recebido</button>`}</div>` : `<div class="obs-line">Pago (${v.formaPagamento})</div>`;
      const linkMaps = v.endereco ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.endereco+' '+(v.complemento||''))}" target="_blank" class="obs-line txt-ouro">📍 Ver no Maps</a>` : '';
      const ic_ = ifoodContato_(v);
      const telefoneCliente = ic_ ? `<div class="obs-line">📞 iFood ${escH(ic_.telefone||'0800')}${ic_.codigo ? ' · código <b>'+escH(ic_.codigo)+'</b>'+(ic_.vencido?' (vencido)':'') : ''}</div>` : (v.clienteTelefone ? `<div class="obs-line">📞 ${escH(v.clienteTelefone)}</div>` : '');
      const entregadorBox = (souEntregador || entregaPeloIfood_(v))
        ? (entregaPeloIfood_(v) ? '<div class="obs-line">🛵 Entrega feita pelo iFood — não precisa de entregador.</div><span data-rast="'+v.id+'"></span>' : '')
        : `<div class="mt-2"><label class="fs-2xs">Entregador</label>${popularSelectEntregadoresHtml(v.id, v.entregador)}</div>`;
      const labelBotao = prox==='Entregue' ? '✅ Já entreguei' : `Marcar como "${prox}"`;
      const aguardandoAceite = v.statusPedido==='Recebido';
      const botoesAceite = (aguardandoAceite && !souEntregador && !souGarcom_()) ? `<div class="btnrow mt-2">
          <button class="small-gold" onclick="aceitarPedidoUI('${v.id}')">✅ Aceitar</button>
          <button class="ghost" onclick="rejeitarPedidoUI('${v.id}')">❌ Rejeitar</button>
      ${podeEditarPedidoRecebido_() ? `<button class="ghost" onclick="abrirModalEditarVenda('${v.id}')">✏️ Editar</button>` : ''}
        </div>` : '';
      return `<div class="notif-card">
        <div><b>#${rotuloPedido(v)}</b>${seloIfood_(v)} — 🛵 ${escH(v.clienteNome||'Sem cadastro')}${aguardandoAceite?' <span class="badge baixo">novo — aguardando aceite</span>':''}</div>
        ${pedidoDetalheHtml_(v)}
        ${botaoOcorrenciaPedido(v)}
        <div class="obs-line">Status: <b>${v.statusPedido}</b> — há ${tempoDecorridoDesde(v.timestamp)}</div>
        ${botaoAvisarCliente_(v)}
        ${aReceber}
        ${botoesAceite}
        ${(!souEntregador && !souGarcom_()) ? botoesSuspensao(v) : ''}
        ${(!souEntregador && !souGarcom_()) ? entregadorBox : ''}
        ${!souEntregador ? botaoEnviarEntregador_(v) : ''}
        ${window.botaoVerLocalizacao_ ? botaoVerLocalizacao_(v) : ''}
        ${!souEntregador ? botaoImprimirEntrega_(v) : ''}
        ${(!aguardandoAceite && prox && !(souEntregador && v.statusPedido==='Em preparo')) ? `<button class="small-gold mt-2" onclick="avancarPedido('${v.id}','${prox}')">${labelBotao}</button>` : ''}
${(souEntregador && v.statusPedido==='Em preparo') ? `<div class="obs-line mt-2">👨‍🍳 Aguardando a cozinha deixar o pedido pronto.</div>` : ''}
      </div>`;
    }).join('') : `<div class="notif-empty">${souEntregador?'Nenhuma entrega atribuída a você agora.':'Nenhuma entrega em andamento.'}</div>`;
  }
  try{ if(window.rotaRender_) rotaRender_(pendentes); }catch(e){ if(window.erroTela_) erroTela_(e); }
  const hoje = dataLocalISO(new Date());
  let concluidas = vendas.filter(v=>v.status==='Confirmada' && v.tipoEntrega==='Entrega' && v.statusPedido==='Entregue' && v.statusPagamento!=='A Receber' && noTurnoCaixa_(v.timestamp,v)).sort((a,b)=>b.timestamp-a.timestamp);
  if(souEntregador) concluidas = concluidas.filter(v=>v.entregador===loginVisao_());
  const box2 = document.getElementById('entregasConcluidasLista');
  if(box2){
    box2.innerHTML = concluidas.length ? concluidas.map(v=>{
      const tPreparo = tempoEntre(v.timestamp, v.timestampPronta);
      const tEntrega = tempoEntre(v.timestampSaiu, v.timestampConcluida);
      return `<div class="notif-card"><b>#${rotuloPedido(v)}</b>${seloIfood_(v)} — 🛵 ${escH(v.clienteNome||'Sem cadastro')}${escH(v.entregador?' · '+v.entregador:'')}${v.taxaEntrega>0?' · taxa '+formatarMoeda(v.taxaEntrega):''}${v.fechamentoEntregaId?' · ✔ fechada':''}${tPreparo?' · preparo: '+tPreparo:''}${tEntrega?' · entrega: '+tEntrega:''}<details class="pd-det"><summary>ver pedido completo</summary>${pedidoDetalheHtml_(v)}</details></div>`;
    }).join('') : '<div class="notif-empty">Nenhuma entrega concluída ainda neste turno do caixa.</div>';
  }
  _alertaPed_.entregas = pendentes.length>0; _atualizarAlertaPedidos_();
  renderEntregasFinanceiro();
}

/* ============================================================
   FASE 7 — ENTREGAS: taxa, fechamento, desempenho, alertas
   ============================================================ */
let fechamentoRequisicaoId = null;
function arred2(n){ return Math.round((Number(n)||0)*100)/100; }
function alertasDeEntregas(){
  const ehStaff = currentUser && (currentUser.nivel==='Admin' || currentUser.nivel==='Operador');
  if(!ehStaff) return [];
  const out = [];
  const ativas = vendas.filter(v=>v.status==='Confirmada' && v.tipoEntrega==='Entrega' && v.statusPedido && v.statusPedido!=='Entregue' && !entregaPeloIfood_(v));
  const semEntregador = ativas.filter(v=>!v.entregador && v.statusPedido!=='Recebido');
  if(semEntregador.length) out.push(`<b>${semEntregador.length}</b> entrega(s) sem entregador atribuído: ` + semEntregador.map(v=>'#'+rotuloPedido(v)).join(', '));
  const paradas = ativas.filter(v=>v.statusPedido==='Pronta' && v.timestampPronta && (Date.now()-v.timestampPronta)>10*60000);
  if(paradas.length) out.push(`<b>${paradas.length}</b> entrega(s) pronta(s) há mais de 10 min sem sair: ` + paradas.map(v=>'#'+rotuloPedido(v)).join(', '));
  if(currentUser.nivel==='Admin'){
    const abertas = vendas.filter(v=>v.status==='Confirmada' && v.tipoEntrega==='Entrega' && v.statusPedido==='Entregue' && v.entregador && !v.fechamentoEntregaId && v.timestampConcluida);
    const hoje = diaTurnoAtual_();
    const dias = {};
    abertas.forEach(v=>{ const d = diaDoTurno_(v.timestampConcluida); if(d<hoje) dias[v.entregador+'|'+d] = 1; });
    const n = Object.keys(dias).length;
    if(n) out.push(`<b>${n}</b> fechamento(s) de entregador de dias anteriores pendente(s) (Administrador → Loja e equipe → Entregadores e taxas).`);
  }
  return out;
}
function renderMeusGanhos(){
  const hojeBox = document.getElementById('ganhosHoje'), lista = document.getElementById('ganhosLista'), resumo = document.getElementById('ganhosResumo');
  if(!hojeBox || !lista) return;
  const eu = String(loginVisao_()).toLowerCase();
  const hoje = diaTurnoAtual_();
  const minhasVendas = vendas.filter(v=>v.status==='Confirmada' && v.tipoEntrega==='Entrega' && v.statusPedido==='Entregue' && v.timestampConcluida && String(v.entregador||'').toLowerCase()===eu);
  const porDia = {};
  minhasVendas.forEach(v=>{ const d = diaDoTurno_(v.timestampConcluida); const x = porDia[d] || (porDia[d] = { qtd:0, taxas:0 }); x.qtd++; x.taxas = arred2(x.taxas + (Number(v.taxaEntrega)||0)); });
  const fech = {};
  fechamentosEntrega.filter(f=>String(f.entregador||'').toLowerCase()===eu).forEach(f=>{ fech[f.dataRef] = f; });
  const fmtData = d=>d.split('-').reverse().join('/');
  // hoje
  const h = porDia[hoje] || { qtd:0, taxas:0 }, fh = fech[hoje];
  const ajudaHoje = fh ? fh.ajudaDiaria : (h.qtd ? (Number(configEntrega.ajudaDiaria)||0) : 0);
  hojeBox.innerHTML = `<div class="obs-line">No turno: <b>${h.qtd}</b> entrega(s) concluída(s) · Taxas: <b>${formatarMoeda(h.taxas)}</b>${ajudaHoje?` · Ajuda diária: <b>${formatarMoeda(ajudaHoje)}</b>`:''}</div>`
    + `<div style="font-size:20px;font-weight:800;margin:6px 0;color:var(--gold);">${formatarMoeda(arred2(h.taxas + ajudaHoje))}</div>`
    + `<div class="obs-line">${fh ? '✅ Dia já acertado com o administrador.' : 'Valor previsto. O acerto oficial é feito pelo administrador no fechamento.'}</div>`;
  // dias anteriores
  const dias = Number(document.getElementById('ganhosPeriodo').value) || 30;
  const corte = new Date(); corte.setHours(0,0,0,0); corte.setDate(corte.getDate() - dias);
  const corteIso = dataLocalISO(corte);
  const datas = Object.keys(Object.assign({}, porDia, fech)).filter(d=>d < hoje && d >= corteIso).sort().reverse();
  let totalDevido = 0, totalPago = 0, totalAberto = 0, totalEntregas = 0;
  const linhas = datas.map(d=>{
    const f = fech[d], p = porDia[d] || { qtd:0, taxas:0 };
    if(f){
      totalDevido += f.totalDevido; totalPago += f.valorPago; totalEntregas += f.qtd;
      return `<div class="notif-card"><b>${fmtData(d)}</b> — ${f.qtd} entrega(s)<div class="obs-line">Taxas ${formatarMoeda(f.totalTaxas)} + ajuda ${formatarMoeda(f.ajudaDiaria)} = <b>${formatarMoeda(f.totalDevido)}</b></div><div class="obs-line">✅ Pago <b>${formatarMoeda(f.valorPago)}</b>${f.formaPagamento?' · '+escH(f.formaPagamento):''}${f.diferenca!==0?' · diferença '+formatarMoeda(f.diferenca):''}</div></div>`;
    }
    const previsto = arred2(p.taxas + (p.qtd ? (Number(configEntrega.ajudaDiaria)||0) : 0));
    totalAberto += previsto; totalEntregas += p.qtd;
    return `<div class="notif-card"><b>${fmtData(d)}</b> — ${p.qtd} entrega(s)<div class="obs-line">Taxas ${formatarMoeda(p.taxas)} · previsto <b>${formatarMoeda(previsto)}</b></div><div class="obs-line">⏳ Aguardando acerto do administrador</div></div>`;
  });
  resumo.innerHTML = datas.length
    ? `<div class="obs-line">No período: <b>${totalEntregas}</b> entrega(s) · acertado <b>${formatarMoeda(arred2(totalDevido))}</b> · pago <b>${formatarMoeda(arred2(totalPago))}</b>${totalAberto?` · aguardando acerto <b>${formatarMoeda(arred2(totalAberto))}</b>`:''}</div>`
    : '';
  lista.innerHTML = linhas.length ? linhas.join('') : '<div class="notif-empty">Nenhum dia anterior neste período.</div>';
}
function renderEntregasFinanceiro(){
  const nivel = currentUser && currentUser.nivel;
  const admin = nivel==='Admin';
  const cfg = document.getElementById('entregasConfigCard'), fech = document.getElementById('entregasFechamentoCard'), meu = document.getElementById('entregasMeuDiaCard');
  if(cfg) cfg.style.display = admin ? 'block':'none';
  if(fech) fech.style.display = admin ? 'block':'none';
  if(meu) meu.style.display = 'none'; /* agora está na aba Meus ganhos */
  if(admin){
    const ci = document.getElementById('cfgTaxaEntrega'), ca = document.getElementById('cfgAjudaDiaria');
    if(ci && document.activeElement!==ci && document.activeElement!==ca){ ci.value = configEntrega.taxaPadrao; ca.value = configEntrega.ajudaDiaria; }
    const sel = document.getElementById('entFechEntregador');
    if(sel && sel.options.length===0 || (sel && sel.dataset.n!==String(usuarios.length))){
      const atual = sel.value;
      sel.innerHTML = usuarios.filter(u=>u.nivel==='Entregador').map(u=>`<option value="${escH(u.login)}">${escH(u.nome||u.login)}${u.ativo?'':' (inativo)'}</option>`).join('') || '<option value="">Nenhum entregador cadastrado</option>';
      sel.dataset.n = String(usuarios.length); if(atual) sel.value = atual;
    }
    const dt = document.getElementById('entFechData'); if(dt && !dt.value) dt.value = diaTurnoAtual_();
    const h = document.getElementById('entFechHistorico');
    if(h){
      const lista = fechamentosEntrega.slice().reverse().slice(0,15);
      h.innerHTML = lista.length ? lista.map(f=>`<div class="notif-card"><b>${f.dataRef.split('-').reverse().join('/')}</b> — ${escH(f.entregador)} · ${f.qtd} entrega(s)<div class="obs-line">Taxas ${formatarMoeda(f.totalTaxas)} + ajuda ${formatarMoeda(f.ajudaDiaria)} = devido <b>${formatarMoeda(f.totalDevido)}</b> · pago <b>${formatarMoeda(f.valorPago)}</b>${f.diferenca!==0?' · diferença '+formatarMoeda(f.diferenca):''}</div>${f.observacao?`<div class="obs-line">Obs: ${escH(f.observacao)}</div>`:''}</div>`).join('') : '<div class="notif-empty">Nenhum fechamento ainda.</div>';
    }
  }
  if(nivel==='Entregador'){
    const box = document.getElementById('entregasMeuDia');
    const hoje = diaTurnoAtual_();
    const minhas = vendas.filter(v=>v.status==='Confirmada' && v.tipoEntrega==='Entrega' && v.statusPedido==='Entregue' && v.timestampConcluida && noTurnoCaixa_(v.timestampConcluida,v));
    const taxas = arred2(minhas.reduce((s,v)=>s+(Number(v.taxaEntrega)||0),0));
    const jaFechouHoje = fechamentosEntrega.some(f=>f.dataRef===hoje);
    const ajuda = (minhas.length && !jaFechouHoje) ? configEntrega.ajudaDiaria : 0;
    const ult = fechamentosEntrega.slice().reverse().slice(0,5);
    if(box) box.innerHTML = `<div class="obs-line">Entregas no turno: <b>${minhas.length}</b> · Taxas: <b>${formatarMoeda(taxas)}</b>${ajuda?` · Ajuda diária: <b>${formatarMoeda(ajuda)}</b>`:''}</div><div class="obs-line">Previsto hoje: <b>${formatarMoeda(taxas+ajuda)}</b> (o acerto oficial é feito pelo administrador no fechamento)</div>` +
      (ult.length ? '<h3 class="mt-3">Últimos acertos</h3>' + ult.map(f=>`<div class="obs-line">${f.dataRef.split('-').reverse().join('/')} — ${f.qtd} entrega(s) · devido ${formatarMoeda(f.totalDevido)} · pago ${formatarMoeda(f.valorPago)}</div>`).join('') : '');
  }
}
async function salvarConfigEntregaUI(){
  try{
    const r = await apiCall('salvarConfigEntrega', { taxaPadrao: document.getElementById('cfgTaxaEntrega').value, ajudaDiaria: document.getElementById('cfgAjudaDiaria').value });
    if(r.ok){ configEntrega = r.configEntrega; salvarCache(); showMsg('cfgEntregaMsg', r.message, 'ok'); }
    else showMsg('cfgEntregaMsg', r.message, 'warn');
  } catch(e){ showMsg('cfgEntregaMsg', 'Sem conexão — não foi salvo.', 'warn'); }
}
function limparPreviewFechamento(){
  fechamentoRequisicaoId = null;
  const p = document.getElementById('entFechPreview'); if(p) p.style.display = 'none';
}
async function calcularPreviewFechamentoUI(){
  const entregador = document.getElementById('entFechEntregador').value, dataRef = document.getElementById('entFechData').value;
  try{
    const r = await apiCall('previewFechamentoEntrega', { entregador, dataRef });
    if(!r.ok){ showMsg('entFechMsg', r.message, 'warn'); return; }
    if(!r.qtd){ limparPreviewFechamento(); showMsg('entFechMsg', 'Nenhuma entrega concluída em aberto para esse entregador nesse dia.', 'warn'); return; }
    fechamentoRequisicaoId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('fech-'+Date.now()+'-'+Math.random().toString(36).slice(2,10));
    document.getElementById('entFechResumo').innerHTML = `${r.qtd} entrega(s) · taxas <b>${formatarMoeda(r.totalTaxas)}</b> + ajuda diária <b>${formatarMoeda(r.ajudaDiaria)}</b> = devido <b>${formatarMoeda(r.totalDevido)}</b>`;
    document.getElementById('entFechPago').value = r.totalDevido.toFixed(2);
    document.getElementById('entFechObs').value = '';
    document.getElementById('entFechPreview').style.display = 'block';
  } catch(e){ showMsg('entFechMsg', 'Sem conexão — não foi possível calcular.', 'warn'); }
}
async function fecharPeriodoUI(){
  if(!fechamentoRequisicaoId) return;
  if(!iniciarOperacaoUnica('fechar-entregas')) return;
  const btn = document.getElementById('entFechBtn'); btn.disabled = true;
  try{
    const r = await apiCall('fecharPeriodoEntregador', { entregador: document.getElementById('entFechEntregador').value, dataRef: document.getElementById('entFechData').value, valorPago: document.getElementById('entFechPago').value, forma: document.getElementById('entFechForma').value, observacao: document.getElementById('entFechObs').value.trim(), requisicaoId: fechamentoRequisicaoId });
    if(r.ok){
      vendas = r.vendas || vendas; fechamentosEntrega = r.fechamentosEntrega || fechamentosEntrega; entregasFechadas = r.entregasFechadas || entregasFechadas;
      salvarCache(); limparPreviewFechamento(); showMsg('entFechMsg', r.message, 'ok'); renderEntregas(); renderNotificacoes();
    } else showMsg('entFechMsg', r.message, 'warn');
  } catch(e){ showMsg('entFechMsg', 'Sem conexão — confira o histórico antes de tentar de novo.', 'warn'); }
  finally { btn.disabled = false; finalizarOperacaoUnica('fechar-entregas'); }
}
function renderDesempenhoEntregas(){
  const box = document.getElementById('relEntTabela'); if(!box) return;
  const dias = Number(document.getElementById('relEntPeriodo').value)||0;
  const ini = new Date(); ini.setHours(0,0,0,0); ini.setDate(ini.getDate()-dias);
  const lista = vendas.filter(v=>v.status==='Confirmada' && v.tipoEntrega==='Entrega' && v.statusPedido==='Entregue' && v.timestampConcluida && v.timestampConcluida>=ini.getTime());
  const por = {};
  lista.forEach(v=>{
    const k = v.entregador || '(sem entregador)';
    const o = por[k] = por[k] || { n:0, taxas:0, somaSaida:0, nSaida:0, somaTotal:0 };
    o.n++; o.taxas += Number(v.taxaEntrega)||0; o.somaTotal += (v.timestampConcluida - v.timestamp)/60000;
    if(v.timestampSaiu){ o.somaSaida += (v.timestampConcluida - v.timestampSaiu)/60000; o.nSaida++; }
  });
  const linhas = Object.keys(por).sort((a,b)=>por[b].n-por[a].n).map(k=>{
    const o = por[k]; const nome = (usuarios.find(u=>u.login===k)||{}).nome || k;
    return `<tr><td>${escH(nome)}</td><td>${o.n}</td><td>${formatarMoeda(o.taxas)}</td><td>${o.nSaida?Math.round(o.somaSaida/o.nSaida)+' min':'—'}</td><td>${Math.round(o.somaTotal/o.n)} min</td></tr>`;
  }).join('');
  box.innerHTML = linhas ? `<div style="overflow-x:auto;"><table style="width:100%;font-size:12.5px;"><thead><tr><th align="left">Entregador</th><th align="left">Entregas</th><th align="left">Taxas</th><th align="left">Tempo na rua</th><th align="left">Pedido→entrega</th></tr></thead><tbody>${linhas}</tbody></table></div>` : '<div class="notif-empty">Nenhuma entrega concluída no período.</div>';
}

function abrirCaixaStatus_(){ document.getElementById('caixaStatusModal').classList.add('open'); }
function fecharCaixaStatus_(){ document.getElementById('caixaStatusModal').classList.remove('open'); }
function abrirLancamentos_(){
  if(currentUser && currentUser.nivel === 'Garçom') return;
  document.getElementById('lancamentosModal').classList.add('open');
}
function fecharLancamentos_(){ document.getElementById('lancamentosModal').classList.remove('open'); }
function _rotuloBotaoCaixa_(){
  const b = document.getElementById('caixaStatusBtn'); if(!b) return;
  b.textContent = sessaoCaixa ? '🟢 Caixa aberto' : '🔒 Caixa fechado';
  b.classList.toggle('caixa-fechado', !sessaoCaixa);
}
/* ---- Início: resumo do que está acontecendo no restaurante (muda conforme o perfil) ---- */
/* atalhos do Início mostram o que precisa de ação agora (contagem e estado do caixa), em vez de só repetir as abas */
function atualizarAtalhosInicio_(d){
  const staff = d.nivel==='Admin' || d.nivel==='Operador';
  const caixaBtn = document.querySelector('#tab-inicio .atalho-btn[onclick*="data-tab=caixa"]');
  if(caixaBtn){
    if(d.nivel==='Garçom') caixaBtn.textContent = '🧾 Atendimento';
    else caixaBtn.textContent = (staff && !sessaoCaixa) ? '🔒 Abrir o caixa' : '🧾 Ir para o Caixa';
  }
  const ped = document.querySelector('#tab-inicio .atalho-pedidos');
  if(ped){
    const n = staff ? d.retNovos : d.retProntos; // só retiradas: as entregas têm o próprio botão
    ped.textContent = n>0 ? ('📋 Retiradas — '+n+(staff?' para aceitar':' pronto(s)')) : '📋 Retiradas';
    ped.style.borderColor = n>0 ? 'var(--gold)' : '';
  }
  const ent = document.querySelector('#tab-inicio .atalho-btn[onclick*="entregas"]');
  if(ent) ent.textContent = d.entregasAtivas>0 ? ('🛵 Entregas — '+d.entregasAtivas+' em andamento') : '🛵 Entregas';
}
function renderInicio(){
  const box = document.getElementById('inicioResumo'); if(!box || !currentUser) return;
  try{ caixaFaixaAtualizar_(); }catch(e){}
  const nivel = currentUser.nivel;
  const staff = nivel==='Admin' || nivel==='Operador';
  const agora = new Date();
  const inicioDia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
  const fmt = (n)=>formatarMoeda(n);
  const sd = document.getElementById('inicioSaudacao');
  if(sd) sd.textContent = 'Olá, '+loginVisao_()+' · '+agora.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit'});

  const ativos = vendas.filter(v=>v.status==='Confirmada' && v.statusPedido && !['Retirada','Entregue','Servida'].includes(v.statusPedido));
  const meusAtivos = nivel==='Entregador' ? ativos.filter(v=>v.tipoEntrega==='Entrega' && v.entregador===loginVisao_()) : ativos;
  const conta = (st)=>meusAtivos.filter(v=>v.statusPedido===st).length;
  const novos = conta('Recebido'), preparo = conta('Em preparo'), prontos = conta('Pronta'), naRua = conta('Saiu para entrega');
  const blocos = [];
  atualizarAtalhosInicio_({ retNovos: ativos.filter(v=>v.tipoEntrega==='Retirada' && v.statusPedido==='Recebido').length, retProntos: ativos.filter(v=>v.tipoEntrega==='Retirada' && v.statusPedido==='Pronta').length, nivel, entregasAtivas: ativos.filter(v=>v.tipoEntrega==='Entrega').length });
  const clique = (js)=>`onclick="${js}"`;

  // 1) Alertas: faixa fina no topo, só quando houver (toque abre o detalhe)
  if(staff){
    const alertas = [];
    const baixos = estoque.filter(e=>Number(e.minimo)>0 && e.quantidade<=e.minimo).length; if(baixos) alertas.push(`📦 ${baixos} item(ns) de estoque no mínimo`);
    const ocs = ocorrenciasAbertas_().length; if(ocs) alertas.push(`⚠️ ${ocs} ocorrência(s) aberta(s)`);
    const hojeISO = dataLocalISO(new Date());
    const venc = despesas.filter(d=>d.status!=='Cancelada' && d.situacao==='A pagar' && d.vencimento && d.vencimento<hojeISO).length; if(venc) alertas.push(`💸 ${venc} conta(s) vencida(s)`);
    alertasDeEntregas().forEach(a=>alertas.push('🛵 '+a.replace(/<[^>]+>/g,'')));
    const errosFila = (typeof _fila!=='undefined' ? _fila : []).filter(i=>i.estado==='erro').length; if(errosFila) alertas.push(`📡 ${errosFila} envio(s) com erro na fila`);
    if(alertas.length) blocos.push(`<button type="button" class="resumo-faixa" ${clique("(window.balaoIaPode_&&balaoIaPode_())?balaoIaAbrir_('avisos'):document.querySelector('[data-tab=notificacoes]').click()")}><span>${escH(alertas[0])}</span>${alertas.length>1?`<small>+${alertas.length-1}</small>`:''}<i>›</i></button>`);
  }
  // 2) Pedidos em andamento
  if(nivel!=='Entregador'){
    blocos.push(`<div class="resumo-box largo"><span class="rot">Pedidos em andamento</span>
      <div class="resumo-etapas">
        <div ${clique("abrirPedidosPainel_('pedidos')")}><b>${novos}</b><small>Novos</small></div>
        <div ${clique("abrirPedidosPainel_('pedidos')")}><b>${preparo}</b><small>Preparo</small></div>
        <div ${clique("abrirPedidosPainel_('pedidos')")}><b>${prontos}</b><small>Prontos</small></div>
        <div ${clique("abrirPedidosPainel_('entregas')")}><b>${naRua}</b><small>Na rua</small></div>
      </div></div>`);
  } else {
    blocos.push(`<button type="button" class="resumo-box largo" ${clique("abrirPedidosPainel_('entregas')")}><span class="rot">Minhas entregas</span><b>${meusAtivos.length}</b><small>${prontos} pronta(s) para sair · ${naRua} na rua</small></button>`);
  }
  // 3) Caixa | Vendas hoje
  if(staff){
    const caixaTxt = sessaoCaixa ? '🟢 Aberto' : '🔒 Fechado';
    const caixaSub = sessaoCaixa ? ('desde '+String(sessaoCaixa.abertura||'').split(' ').pop()) : 'toque para abrir';
    blocos.push(`<button type="button" class="resumo-box ${sessaoCaixa?'':'atencao'}" ${clique("document.querySelector('[data-tab=caixa]').click();abrirCaixaStatus_()")}><span class="rot">Caixa</span><b>${caixaTxt}</b><small>${escH(caixaSub)}</small></button>`);
    const hoje = vendas.filter(v=>v.status==='Confirmada' && noTurnoCaixa_(v.timestamp,v));
    const faturado = hoje.filter(v=>v.statusPagamento!=='A Receber').reduce((t,v)=>t+(Number(v.valorTotal)||0),0);
    const aReceber = hoje.filter(v=>v.statusPagamento==='A Receber').reduce((t,v)=>t+(Number(v.valorTotal)||0),0);
    blocos.push(`<div class="resumo-box" ${nivel==='Admin' ? clique("abrirAdministrador('visaogeral')") : ''}><span class="rot">${turnoCaixa_().calendario?'Vendas hoje':'Vendas do turno'}</span><b>${fmt(faturado)}</b><small>${hoje.length} pedido(s)${aReceber>0?' · '+fmt(aReceber)+' a receber':''}</small></div>`);
  }
  // 4) Cardápio hoje (visitas) | Mesas (com a conta das mesas junto)
  if(staff){
    const vh = window._visitasCd_;
    blocos.push(`<div class="resumo-box" ${clique("abrirCardapioHoje_()")} title="Ver funil e mapa do cardápio"><span class="rot">Cardápio hoje</span><b>${vh && vh.n != null ? vh.n : '—'}</b><small>visita(s) no turno · toque para ver o funil e o mapa</small></div>`);
    if(!currentUser.emergencia && (!vh || Date.now() - vh.t > 60000)) inicioCarregarVisitas_();
  }
  if(nivel==='Admin' || nivel==='Operador' || nivel==='Garçom'){
    const ocup = (mesas||[]).filter(m=>m.status==='Ocupada').length;
    const aguard = (mesas||[]).filter(m=>m.status==='Aguardando fechamento').length;
    const contaMesas = vendas.filter(v=>v.status==='Confirmada' && v.tipoEntrega==='Mesa' && v.statusPagamento==='A Receber').reduce((t,v)=>t+(Number(v.valorTotal)||0),0);
    const sub = `${ocup} ocupada(s)${aguard?' · '+aguard+' pedindo a conta':''}${staff?' · '+fmt(contaMesas)+' a receber':''}`;
    blocos.push(`<button type="button" class="resumo-box ${aguard?'atencao':''}${staff?'':' largo'}" ${clique("abrirMesasPopup_()")}><span class="rot">Mesas</span><b>${ocup+aguard} de ${(mesas||[]).length}</b><small>${sub}</small></button>`);
  }
  box.innerHTML = '<div class="resumo-grid">'+blocos.join('')+'</div>';
}
/* visitas ao cardápio hoje (Admin e Operador): busca no máximo 1 vez por minuto e redesenha o Início */
let _visitasCdBuscando_ = false;
async function inicioCarregarVisitas_(){
  if(_visitasCdBuscando_) return; _visitasCdBuscando_ = true;
  try{ const r = await apiCall('visitasCardapioHoje', {}); window._visitasCd_ = { n: (r && r.ok) ? (Number(r.hoje)||0) : null, t: Date.now() }; if(r && r.ok) renderInicio(); }
  catch(e){ window._visitasCd_ = { n:null, t: Date.now() }; }
  finally{ _visitasCdBuscando_ = false; }
}
function renderStatusCaixa(){
  _rotuloBotaoCaixa_(); try{ caixaFaixaAtualizar_(); }catch(e){}
  const card = document.getElementById('caixaStatusCard');
  const box = document.getElementById('caixaStatusConteudo');
  if(!sessaoCaixa){
    card.className = 'card caixa-status-fechado';
    box.innerHTML = `<div class="caixa-status-titulo">🔒 Caixa fechado</div><p class="sub">Abra o caixa informando o fundo (dinheiro para troco) antes de registrar vendas ou despesas.</p><button class="primary" onclick="abrirModalAbrirCaixa()">Abrir caixa</button>`;
    document.getElementById('lancamentosSessao').innerHTML = '<div class="notif-empty">Caixa fechado.</div>';
    return;
  }
  card.className = 'card caixa-status-aberto';
  const abertura = sessaoCaixa.aberturaTimestamp;
  const vendasSessao = vendas.filter(v=>v.status==='Confirmada' && v.timestamp>=abertura);
  const despesasSessao = despesas.filter(d=>despesaEfetiva(d) && d.saiuDoCaixa!==false && d.timestamp>=abertura);
  const sangriasSessao = sangrias.filter(s=>s.timestamp>=abertura);
  const idsVendasSessao = new Set(vendasSessao.filter(v=>v.statusPagamento!=='A Receber').map(v=>v.id));
  const { totalDinheiro, porForma } = totaisPorFormaNaSessao(idsVendasSessao);
  const totalDespesas = despesasSessao.reduce((s,d)=>s+Number(d.valor),0);
  const totalSangrias = sangriasSessao.reduce((s,sg)=>s+Number(sg.valor),0);
  const saldoEsperado = sessaoCaixa.fundoCaixa + totalDinheiro - totalDespesas - totalSangrias;
  const totalAcertosPrev = arred2(acertosAutoEntregadores_().reduce((a,x)=>a+x.total, 0));

  const boxesFormas = Object.keys(porForma).sort((a,b)=> formaPermiteTroco(a)?-1:(formaPermiteTroco(b)?1:0)).map(forma=>
    `<div class="stat-box entrada"><b>${formatarMoeda(porForma[forma])}</b><span>${forma.toUpperCase()}</span></div>`
  ).join('');

  box.innerHTML = `<div class="caixa-status-titulo">🟢 Caixa aberto<small>desde ${sessaoCaixa.abertura}${escH(sessaoCaixa.usuarioAbertura?(' · por '+sessaoCaixa.usuarioAbertura):'')}</small></div>
    ${caixaFaixaHtml_('caixa')}
    <div class="stat-row">
      <div class="stat-box"><b class="txt-ouro">${formatarMoeda(sessaoCaixa.fundoCaixa)}</b><span>FUNDO</span></div>
      ${boxesFormas || '<div class="stat-box entrada"><b>R$ 0,00</b><span>VENDAS</span></div>'}
      <div class="stat-box saida"><b>${formatarMoeda(totalDespesas)}</b><span>DESPESAS</span></div>
      <div class="stat-box saida"><b>${formatarMoeda(totalSangrias)}</b><span>SANGRIAS</span></div>
    </div>
    <div class="fs-md mb-3">Saldo esperado em caixa (dinheiro): <b style="color:var(--gold);font-size:17px;">${formatarMoeda(saldoEsperado)}</b></div>
    ${totalAcertosPrev>0 ? `<div style="font-size:13px;margin:-4px 0 10px;opacity:.9;">🛵 A pagar aos entregadores ao fechar: <b>${formatarMoeda(totalAcertosPrev)}</b> · ficam na gaveta ${formatarMoeda(arred2(saldoEsperado-totalAcertosPrev))}</div>` : ''}
    <button class="primary" onclick="fecharCaixaAgora()">${(caixaEstado_()||{}).passou ? 'Fechar caixa vencido' : 'Fechar caixa'}</button>
    ${(currentUser && (currentUser.nivel==='Admin' || currentUser.nivel==='Desenvolvedor')) ? '<button type="button" class="ghost mt-3" onclick="caixaRegraAbrir_()">Regra do caixa vencido</button>' : ''}`;

  const lista = [
    ...vendasSessao.map(v=>({tipo:'venda', ts:v.timestamp, label:(v.clienteNome||'Sem cadastro'), valor:v.valorTotal, extra:v.formaPagamento, id:v.id, aReceber:v.statusPagamento==='A Receber'})),
    ...despesasSessao.map(d=>({tipo:'despesa', ts:d.timestamp, label:d.descricao, valor:-d.valor, extra:'', id:d.id})),
    ...sangriasSessao.map(sg=>({tipo:'sangria', ts:sg.timestamp, label:sg.motivo, valor:-sg.valor, extra:'', id:sg.id}))
  ].sort((a,b)=>b.ts-a.ts);
  const lBox = document.getElementById('lancamentosSessao');
  lBox.innerHTML = lista.length ? lista.map(l=>`
    <div class="lancamento-item">
      <span><span class="tag ${l.tipo}">${l.tipo}</span>${l.label}${l.extra?' · '+l.extra:''}${l.aReceber?' · 💰 a receber':''}</span>
      <span class="d-flex ai-centro gap-2">
        <b style="color:${l.valor<0?'#ffb3ab':'#bfe0ae'};">${formatarMoeda(Math.abs(l.valor))}</b>
        ${l.tipo==='venda' ? `<button class="ghost" style="padding:2px 8px;font-size:12px;" onclick="abrirModalEditarVenda('${l.id}')">editar</button>` : (l.tipo==='despesa' ? `<button class="ghost" style="padding:2px 8px;font-size:12px;" onclick="abrirModalEditarDespesa('${l.id}')">editar</button>` : '')}
        ${l.tipo!=='sangria' ? `<button class="ghost" style="padding:2px 8px;font-size:12px;" onclick="abrirModalCancelar('${l.tipo}','${l.id}')">excluir</button>` : ''}
      </span>
    </div>`).join('') : '<div class="notif-empty">Nenhum lançamento ainda nesta sessão.</div>';
}
function abrirModalAbrirCaixa(){ document.getElementById('fundoCaixaInput').value=''; document.getElementById('abrirCaixaModal').classList.add('open'); }
function fecharModalAbrirCaixa(){ document.getElementById('abrirCaixaModal').classList.remove('open'); }
const operacoesEmAndamento = new Set();
function iniciarOperacaoUnica(chave){ if(operacoesEmAndamento.has(chave)) return false; operacoesEmAndamento.add(chave); return true; }
function finalizarOperacaoUnica(chave){ operacoesEmAndamento.delete(chave); }
async function confirmarAbrirCaixa(){
  if(!iniciarOperacaoUnica('abrirCaixa')) return;
  const fundoCaixa = Number(document.getElementById('fundoCaixaInput').value) || 0;
  try{
    const r = await apiCall('abrirCaixa', { fundoCaixa });
    if(r.ok){ sessaoCaixa = r.sessaoCaixa; salvarCache(); renderStatusCaixa(); fecharModalAbrirCaixa(); }
    else if(/já existe um caixa aberto/i.test(r.message||'')){
      /* o servidor já tem um caixa aberto que a tela não conhecia: sincroniza e mostra o caixa aberto em vez de só dar erro */
      await recarregarHistoricoCaixa();
      if(sessaoCaixa){ fecharModalAbrirCaixa(); try{ renderStatusCaixa(); }catch(e2){} }
      else showMsg('abrirCaixaMsg', r.message, 'warn');
    }
    else showMsg('abrirCaixaMsg', r.message, 'warn');
  } catch(e){ showMsg('abrirCaixaMsg','Não foi possível abrir o caixa.','warn'); }
  finally { finalizarOperacaoUnica('abrirCaixa'); }
}
/* Fechar o caixa: pede o dinheiro contado e a SENHA de quem está logado (Operador: a dele; Admin operando o caixa: a dele).
   A senha é conferida no servidor. */
function pendenciasCaixaLocal_(){
  const FIN = ['Entregue','Retirada','Servida'];
  const ativas = vendas.filter(v=>v.status==='Confirmada');
  const rot = v => '#'+(v.numero||String(v.id).slice(-4))+(v.clienteNome?' '+String(v.clienteNome).split(/\s+/)[0]:'');
  const ls = a => a.slice(0,6).join(', ')+(a.length>6?' e mais '+(a.length-6):'');
  const ms = (mesas||[]).filter(m=>m.status==='Ocupada'||m.status==='Aguardando fechamento').map(m=>'Mesa '+m.numero);
  const pe = ativas.filter(v=>v.statusPedido && FIN.indexOf(v.statusPedido)===-1).map(v=>rot(v)+' ('+v.statusPedido+')');
  const nr = ativas.filter(v=>v.statusPagamento==='A Receber').map(rot);
  const t = [];
  if(ms.length) t.push('Mesas abertas: '+ls(ms));
  if(pe.length) t.push('Pedidos pendentes: '+ls(pe));
  if(nr.length) t.push('Pedidos não recebidos: '+ls(nr));
  return t.length ? t.join('\n') : '';
}
let _fcEsperado_ = 0;
let _fcAcertoTotal_ = 0;
/* Entregas concluídas e ainda sem acerto: o fechamento do caixa as acerta em dinheiro, da gaveta (igual ao servidor). */
function acertosAutoEntregadores_(){
  if(!sessaoCaixa) return [];
  const abertura = sessaoCaixa.aberturaTimestamp;
  const grupos = {};
  vendas.filter(v=>v.status==='Confirmada' && v.tipoEntrega==='Entrega' && v.statusPedido==='Entregue' && !v.fechamentoEntregaId && v.entregador && v.timestampConcluida && v.timestampConcluida>=abertura).forEach(v=>{
    const dia = diaDoTurno_(v.timestampConcluida), k = String(v.entregador).toLowerCase()+'|'+dia;
    const g = grupos[k] || (grupos[k] = { entregador:v.entregador, dia, taxas:0, qtd:0 });
    g.qtd++; g.taxas = arred2(g.taxas + (Number(v.taxaEntrega)||0));
  });
  return Object.values(grupos).map(g=>{
    const jaTeve = fechamentosEntrega.some(f=>String(f.entregador||'').toLowerCase()===String(g.entregador).toLowerCase() && f.dataRef===g.dia);
    const ajuda = jaTeve ? 0 : (Number(configEntrega.ajudaDiaria)||0);
    return Object.assign(g, { ajuda, total: arred2(g.taxas + ajuda) });
  });
}
function diferencaGaveta_(){
  const bruto = String(document.getElementById('fcContado').value).replace(',','.');
  if(bruto === '' || isNaN(Number(bruto)) || Number(bruto) < 0) return null;
  return Math.round((Number(bruto) - _fcEsperado_) * 100) / 100;
}
function atualizarResultadoGaveta_(){
  const el = document.getElementById('fcResultado'); if(!el) return;
  const d = diferencaGaveta_();
  if(d === null){ el.textContent = ''; el.style.color = ''; return; }
  const esp = ' (esperado ' + formatarMoeda(_fcEsperado_) + ')';
  if(Math.abs(d) < 0.01){
    el.textContent = '✅ Caixa batido' + esp + (_fcAcertoTotal_ > 0 ? ' — agora pague ' + formatarMoeda(_fcAcertoTotal_) + ' aos entregadores; ficam ' + formatarMoeda(arred2(_fcEsperado_ - _fcAcertoTotal_)) + ' na gaveta.' : '');
    el.style.color = '#4caf50';
  }
  else if(d > 0){ el.textContent = '⬆️ Sobra de ' + formatarMoeda(d) + esp; el.style.color = '#e0b53a'; }
  else { el.textContent = '⬇️ Falta de ' + formatarMoeda(-d) + esp; el.style.color = '#ff6b5b'; }
}
function fecharCaixaAgora(){
  if(!sessaoCaixa) return;
  const pend = pendenciasCaixaLocal_();
  if(pend){ avisar('Não é possível fechar o caixa enquanto houver pendências:\n\n'+pend+'\n\nFinalize, receba ou cancele e tente de novo.'); return; }
  const acertos = acertosAutoEntregadores_();
  const totalAcertos = arred2(acertos.reduce((a,x)=>a+x.total, 0));
  const esperado = saldoEsperadoGaveta(); // NÃO subtrai o acerto: igual à tela do Caixa e ao servidor
  _fcAcertoTotal_ = totalAcertos;
  const boxAc = document.getElementById('fcAcertosEntregadores');
  if(boxAc){
    boxAc.style.display = acertos.length ? 'block' : 'none';
    boxAc.innerHTML = acertos.length ? '🛵 <b>Depois de conferir a gaveta, pague os entregadores (em dinheiro):</b><br>' + acertos.map(x=>escH(x.entregador)+' ('+x.dia.split('-').reverse().join('/')+'): '+formatarMoeda(x.total)).join('<br>') + '<br><b>Total a pagar: ' + formatarMoeda(totalAcertos) + '</b> · ficam na gaveta ' + formatarMoeda(arred2(esperado - totalAcertos)) + '<br><span style="opacity:.8;">Conte a gaveta ANTES de pagar. Se algum foi pago no Pix, feche o acerto dele antes em Administrador → Entregadores e taxas.</span>' : '';
  }
  document.getElementById('fcEsperado').textContent = formatarMoeda(esperado);
  document.getElementById('fcContado').value = ''; _fcEsperado_ = esperado; atualizarResultadoGaveta_();
  document.getElementById('fcSenha').value = '';
  const _ce = caixaEstado_(), _atr = !!(_ce && _ce.passou);
  const _mb = document.getElementById('fcMotivoBox'); if(_mb){ _mb.hidden = !_atr; document.getElementById('fcMotivo').value = ''; }
  const _ft = document.getElementById('fcTitulo'); if(_ft) _ft.textContent = _atr ? 'Fechar caixa vencido' : 'Fechar o caixa';
  const m = document.getElementById('cxConfirmarMsg'); m.textContent = ''; m.className = 'msg';
  document.getElementById('fcBtn').disabled = false;
  document.getElementById('cxConfirmarModal').classList.add('open');
}
function fecharModalConfirmarCaixa_(){ document.getElementById('cxConfirmarModal').classList.remove('open'); document.getElementById('fcSenha').value = ''; }
async function confirmarFecharCaixa_(){
  const contado = Number(String(document.getElementById('fcContado').value).replace(',','.'));
  const senha = document.getElementById('fcSenha').value;
  if(document.getElementById('fcContado').value==='' || isNaN(contado) || contado<0) return showMsg('cxConfirmarMsg','Digite quanto dinheiro há na gaveta (pode ser zero).','warn');
  if(!senha) return showMsg('cxConfirmarMsg','Digite a sua senha para confirmar.','warn');
  const dif = diferencaGaveta_();
  if(dif !== null && Math.abs(dif) >= 0.01 && !await confirmarTxt_((dif > 0 ? 'Sobra de ' : 'Falta de ') + formatarMoeda(Math.abs(dif)) + ' na gaveta. Fechar o caixa mesmo assim?', 'Fechar mesmo assim', false, 'Diferença na gaveta')) return;
  if(!iniciarOperacaoUnica('fecharCaixa')) return;
  const btn = document.getElementById('fcBtn'); btn.disabled = true;
  try{
    const r = await apiCall('fecharCaixa', { id: sessaoCaixa.id, valorContado: contado, senhaConfirmacao: senha, motivo: (document.getElementById('fcMotivo')||{}).value || '' });
    if(r.ok){
      fecharModalConfirmarCaixa_(); fecharCaixaStatus_(); fecharLancamentos_();
      sessaoCaixa = null;
      if(r.vendas){ vendas = r.vendas; fechamentosEntrega = r.fechamentosEntrega || fechamentosEntrega; entregasFechadas = r.entregasFechadas || entregasFechadas; }
      salvarCache(); renderStatusCaixa(); await recarregarHistoricoCaixa();
      try{ renderEntregas(); renderNotificacoes(); }catch(e){ if(window.erroTela_) erroTela_(e); }
      mostrarRelatorioFechamento(r.relatorio, r.relatorio.valorContado, r.entregasAuto);
    } else { document.getElementById('fcSenha').value = ''; showMsg('cxConfirmarMsg', r.message, 'warn'); btn.disabled = false; }
  } catch(e){ showMsg('cxConfirmarMsg','Não foi possível fechar o caixa. Tente de novo.','warn'); btn.disabled = false; }
  finally { finalizarOperacaoUnica('fecharCaixa'); }
}
async function recarregarHistoricoCaixa(){
  try{
    const r = await apiCall('getAll', {});
    aplicarDadosRecebidos(r);          // preenche vendas, itens, pagamentos, fechamentosEntrega, entregasFechadas etc.
    historicoCaixa = r.historicoCaixa || historicoCaixa;
    salvarCache();
    renderHistoricoCaixa();
    try{ renderizarTudo(); }catch(e){ if(window.erroTela_) erroTela_(e); } // redesenha tudo (Entregas, Pedidos, Início) com os dados frescos
  }catch(e){ /* se falhar, mantém o que já estava na tela */ }
}
function mostrarRelatorioFechamento(r, contado, entregasAuto){
  const linhasFormas = Object.keys(r.porForma||{}).map(f=>`${f}: ${formatarMoeda(r.porForma[f])}`).join('\n');
  let reconciliacao = '';
  if(contado !== null && contado !== undefined){
    const diferenca = contado - r.saldoFinal;
    const sinal = diferenca > 0.005 ? 'SOBRA' : (diferenca < -0.005 ? 'FALTA' : 'confere certinho');
    reconciliacao = `

📋 CONFERÊNCIA DE CAIXA
Esperado: ${formatarMoeda(r.saldoFinal)}
Contado na gaveta: ${formatarMoeda(contado)}
Diferença: ${formatarMoeda(Math.abs(diferenca))} (${sinal})`;
  }
  let blocoCont = '';
  if(r.reconciliadasNaSessao && r.reconciliadasNaSessao.quantidade>0) blocoCont += `\n\n🟠 VENDAS VINDAS DA CONTINGÊNCIA (já incluídas)\n${r.reconciliadasNaSessao.quantidade} venda(s) — ${formatarMoeda(r.reconciliadasNaSessao.valor)}, registradas com a hora original da venda.`;
  if(r.pendentesContingencia>0) blocoCont += `\n\n⚠️ VENDAS AINDA NA FILA DA CONTINGÊNCIA\n${r.pendentesContingencia} venda(s) não entraram neste fechamento. Quando forem reconciliadas, entram nesta sessão como "reconciliadas após o fechamento" e o saldo e a diferença são ajustados.`;
  const acertoTxt = (r.acertoEntregadores > 0) ? `\n\n🛵 Acerto dos entregadores (pago em dinheiro, depois da conferência): ${formatarMoeda(r.acertoEntregadores)}\n💵 Fica na gaveta após o acerto: ${formatarMoeda(r.saldoAposAcertos)}` : '';
  const texto = `🧾 FECHAMENTO DE CAIXA — ${NOME_UP_()}
Abertura: ${r.abertura}
Fechamento: ${r.fechamento}

Fundo de caixa: ${formatarMoeda(r.fundoCaixa)}

Vendas por forma de pagamento:
${linhasFormas || '(nenhuma)'}

Total de vendas: ${formatarMoeda(r.totalVendas)} (${r.quantidadeVendas} venda(s))
${r.totalPendente>0 ? 'A receber (ainda não pago): '+formatarMoeda(r.totalPendente)+'\n' : ''}Despesas: ${formatarMoeda(r.totalDespesas)} (${r.quantidadeDespesas} despesa(s))
Sangrias: ${formatarMoeda(r.totalSangrias)} (${r.quantidadeSangrias} sangria(s))

💰 Saldo final em caixa: ${formatarMoeda(r.saldoFinal)}${reconciliacao}${acertoTxt}${blocoCont}${entregasAuto && entregasAuto.feitos && entregasAuto.feitos.length ? '\n\n🛵 ENTREGAS FECHADAS AUTOMATICAMENTE\n'+entregasAuto.feitos.join('\n') : ''}${entregasAuto && entregasAuto.falhas && entregasAuto.falhas.length ? '\n\n⚠ Não foi possível fechar: '+entregasAuto.falhas.join(' | ')+' (feche manualmente em Entregas)' : ''}`;
  ultimoRelatorioTexto = texto;
  document.getElementById('relatorioTexto').textContent = texto;
  document.getElementById('fecharCaixaModal').classList.add('open');
}
function fecharModalFecharCaixa(){ document.getElementById('fecharCaixaModal').classList.remove('open'); }
function copiarRelatorio(){ copiarTextoComFallback(ultimoRelatorioTexto, 'fecharCaixaMsg'); }
function enviarRelatorioWhatsapp(){ window.open('https://wa.me/?text=' + encodeURIComponent(ultimoRelatorioTexto), '_blank'); }

/* ============================================================
   CAIXA — VENDA (CARRINHO + PAGAMENTO DIVIDIDO)
   ============================================================ */


/* ---------- CAIXA VENCIDO (regra no banco: caixa_config, _caixa_vencido, api_caixa_liberar) ----------
   A tela só mostra o estado. Quem decide é o servidor: venda nova de balcão/mesa, sangria e resgate de prêmio param quando o caixa vence;
   pedido do iFood e do cardápio continuam entrando e sendo aceitos. */
function caixaHora_(ts){ try{ return new Date(ts).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit', timeZone:'America/Sao_Paulo' }); }catch(e){ return ''; } }
function caixaEstado_(){
  const s = sessaoCaixa; if(!s || !s.venceEm) return null;
  const agora = Date.now(), passou = agora >= s.venceEm, liberado = passou && s.liberadoAte > agora;
  return { passou, liberado, vencido: passou && !liberado, aviso: !passou && (s.venceEm - agora) <= (s.avisoHoras || 2) * 3600000 };
}
/* ctx 'caixa' = dentro da tela do Caixa (o botão de fechar fica no fim da tela, só ali);
   ctx 'inicio' = faixa do topo do Início (leva ao Caixa, sem repetir o botão de fechar). */
function caixaIrParaTela_(){ const b = document.querySelector('.tab-btn[data-tab="caixa"]'); if(b) b.click(); }
function caixaFaixaHtml_(ctx){
  const e = caixaEstado_(); if(!e || !currentUser) return '';
  const noCaixa = ctx === 'caixa';
  const nivel = currentUser.nivel, fecha = (nivel === 'Admin' || nivel === 'Operador' || nivel === 'Desenvolvedor'), admin = (nivel === 'Admin' || nivel === 'Desenvolvedor');
  const quando = sessaoCaixa.abertura || '';
  const ext = (vendas||[]).filter(v=>v.status==='Confirmada' && v.statusPedido==='Recebido' && ((v.origem && v.origem!=='Balcão' && v.origem!=='Garçom') || ehIfood_(v))).length;
  const extTxt = ext ? ' <b>' + ext + ' pedido(s) do iFood/cardápio aguardando aceite: aceite normalmente, não trava.</b>' : '';
  const irCaixa = (!noCaixa && fecha) ? '<div class="caixa-faixa-btns"><button type="button" class="small-gold" onclick="caixaIrParaTela_()">Ir ao Caixa</button></div>' : '';
  if(e.vencido){
    if(!fecha) return '<div class="caixa-faixa erro" role="alert">' + icSvg_('sino') + ' Caixa vencido — chame o responsável.</div>';
    return '<div class="caixa-faixa erro" role="alert"><div>' + icSvg_('sino') + ' <b>Caixa vencido</b> (aberto em ' + escH(quando) + '). Venda nova de balcão e de mesa está bloqueada. Pedidos do iFood e do cardápio continuam entrando.' + extTxt + (noCaixa ? ' Para voltar a vender, feche o caixa no botão no fim desta tela e abra um novo.' : '') + '</div>'
      + (noCaixa ? (admin ? '<div class="caixa-faixa-btns"><button type="button" class="ghost" onclick="caixaLiberarAbrir_()">Liberar por algumas horas</button></div>' : '') : irCaixa) + '</div>';
  }
  if(e.liberado) return '<div class="caixa-faixa aviso"><div>' + icSvg_('sino') + ' Caixa vencido liberado por ' + escH(sessaoCaixa.liberadoPor || 'Admin') + ' até ' + caixaHora_(sessaoCaixa.liberadoAte) + (sessaoCaixa.liberadoMotivo ? ' — ' + escH(sessaoCaixa.liberadoMotivo) : '') + '.</div>' + irCaixa + '</div>';
  if(e.aviso) return '<div class="caixa-faixa aviso"><div>' + icSvg_('sino') + ' O caixa vence às ' + caixaHora_(sessaoCaixa.venceEm) + '. Feche e abra um novo antes disso.</div>' + irCaixa + '</div>';
  return '';
}
/* faixa no topo do Início (todos os perfis); no Caixa ela vem dentro do cartão de status */
async function caixaRegraAbrir_(){
  const c = await apiCall('caixaConfig', {});
  if(!c || !c.ok){ avisar((c && c.message) || 'Não foi possível ler a regra do caixa.', 'erro'); return; }
  const v = await vsForm({ titulo:'Regra do caixa vencido', texto:'O caixa vence no primeiro horário de corte depois da abertura, desde que tenha a vida mínima. Nunca passa do teto.', ok:'Salvar', campos:[
    { id:'corteHora', tipo:'texto', rotulo:'Horário de corte (HH:MM, Brasília)', valor:c.corteHora, obrigatorio:true, max:5 },
    { id:'vidaMinimaHoras', tipo:'numero', rotulo:'Vida mínima do caixa', sufixo:'horas', valor:c.vidaMinimaHoras, obrigatorio:true, minimo:0 },
    { id:'tetoHoras', tipo:'numero', rotulo:'Teto absoluto', sufixo:'horas', valor:c.tetoHoras, obrigatorio:true, maiorQueZero:true },
    { id:'avisoHoras', tipo:'numero', rotulo:'Avisar antes do corte', sufixo:'horas', valor:c.avisoHoras, obrigatorio:true, minimo:0 },
    { id:'liberacaoPadraoHoras', tipo:'numero', rotulo:'Liberação de emergência: padrão', sufixo:'horas', valor:c.liberacaoPadraoHoras, obrigatorio:true, maiorQueZero:true },
    { id:'liberacaoMaxHoras', tipo:'numero', rotulo:'Liberação de emergência: máximo', sufixo:'horas', valor:c.liberacaoMaxHoras, obrigatorio:true, maiorQueZero:true } ] });
  if(!v) return;
  if(!/^([01]?\d|2[0-3]):[0-5]\d$/.test(v.corteHora)){ avisar('Horário de corte inválido. Use HH:MM, por exemplo 06:00.', 'aviso'); return; }
  Object.keys(v).forEach(k=>{ if(typeof v[k] === 'number') v[k] = Math.round(v[k]); });
  const r = await apiCall('caixaSalvarConfig', v);
  avisar((r && r.message) || 'Não foi possível salvar.', r && r.ok ? 'ok' : 'erro');
  if(r && r.ok){ await recarregarHistoricoCaixa(); try{ renderStatusCaixa(); renderInicio(); }catch(e){ if(window.erroTela_) erroTela_(e); } }
}
function caixaFaixaAtualizar_(){
  const alvo = document.getElementById('inicioResumo'); if(!alvo || !alvo.parentNode) return;
  let f = document.getElementById('caixaFaixaInicio');
  if(!f){ f = document.createElement('div'); f.id = 'caixaFaixaInicio'; alvo.parentNode.insertBefore(f, alvo); }
  f.innerHTML = caixaFaixaHtml_('inicio');
}
async function caixaLiberarAbrir_(){
  const e = caixaEstado_(); if(!e || !e.vencido) return;
  const v = await vsForm({ titulo:'Liberar caixa vencido', texto:'Use só em emergência. Fica registrado na auditoria, expira sozinho e avisa os Administradores. Depois feche o caixa e abra um novo.', ok:'Liberar',
    campos:[ { id:'horas', tipo:'numero', rotulo:'Liberar por quantas horas', valor:4, obrigatorio:true, maiorQueZero:true }, { id:'motivo', tipo:'texto', rotulo:'Motivo', obrigatorio:true, minLetras:3 } ] });
  if(!v) return;
  const r = await apiCall('caixaLiberar', { horas: Math.round(v.horas), motivo: v.motivo });
  if(r && r.ok){ avisar(r.message || 'Caixa liberado.', 'ok'); await recarregarHistoricoCaixa(); try{ renderStatusCaixa(); renderInicio(); }catch(e2){} }
  else avisar((r && r.message) || 'Não foi possível liberar o caixa.', 'erro');
}
setInterval(()=>{ try{ if(sessaoCaixa && currentUser && !document.hidden){ caixaFaixaAtualizar_(); } }catch(e){} }, 60000);
