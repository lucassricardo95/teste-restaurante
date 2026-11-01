/* ---------- INDICADOR DE CONEXÃO (🟢 Online / 🟡 Sincronizando / 🔴 Sem conexão) ---------- */
let conexaoAtual = 'offline'; // 'online' | 'syncing' | 'offline'
function setConexaoStatus(estado, textoExtra){
  if(currentUser && currentUser.emergencia){ // BLOCO 1.3: no modo emergência o status é sempre este (e o botão de venda fica liberado: a venda vai à contingência)
    conexaoAtual = 'contingencia';
    const elE = document.getElementById('connStatus');
    elE.textContent = '🟠 MODO EMERGÊNCIA — só vendas (contingência)'; elE.className = 'status contingencia';
    atualizarConnDot_();
    atualizarBloqueioVendaOffline();
    return;
  }
  conexaoAtual = estado;
  const el = document.getElementById('connStatus');
  const textos = {
    online: '🟢 Online — Sincronizado',
    syncing: '🟡 Sincronizando...',
    offline: '🔴 Sem conexão' + (textoExtra ? ' — ' + textoExtra : ''),
    contingencia: '🟠 Online — Contingência' + (textoExtra ? ' — ' + textoExtra : '')
  };
  el.textContent = textos[estado] || textos.offline;
  el.className = 'status ' + (estado==='online' ? 'online' : (estado==='syncing' ? 'syncing' : (estado==='contingencia' ? 'contingencia' : 'offline')));
  atualizarConnDot_();
  atualizarBloqueioVendaOffline();
}
/* ---------- BOLINHA E POPUP DE CONEXÃO: Supabase / planilha principal / contingência ---------- */
const SINCRONIZACAO_PLANILHAS_ATIVA_ = !!(typeof API_URL === 'string' && API_URL); // a fila_sync envia tudo para a planilha principal
let _connResultado_ = null;
function atualizarConnDot_(){
  const d = document.getElementById('connDot'); if(!d) return;
  const el = document.getElementById('connStatus');
  const est = (currentUser && currentUser.emergencia) ? 'contingencia' : conexaoAtual;
  d.className = 'conn-dot ' + (['online','syncing','contingencia','offline'].indexOf(est) >= 0 ? est : 'offline');
  /* Saúde do sistema (só Admin/Desenvolvedor): com a conexão normal, a bolinha amarela/rosa avisa que algo pede atenção */
  if(est === 'online' && (window._saudeGeral_ === 'atencao' || window._saudeGeral_ === 'problema')) d.classList.add('saude-' + window._saudeGeral_);
  const txt = el ? el.textContent : '';
  d.title = txt + ' — toque para ver os detalhes'; d.setAttribute('aria-label', 'Status da conexão: ' + txt);
}
/* A contingência só mostra pendentes/espelho a quem tem chave (quem está logado). Sem chave, só testa se está no ar. */
function _connOptsContingencia_(){
  let k = ''; try{ k = localStorage.getItem(CONTINGENCIA_CHAVE_KEY) || ''; }catch(e){}
  return k ? { method:'POST', headers:{ 'Content-Type':'text/plain' }, body: JSON.stringify({ action:'status', chave:k }) } : {};
}
async function _connPing_(url, opts, ms){
  const t0 = Date.now();
  try{
    /* fetch direto: o teste de uma planilha não pode marcar o Supabase como fora do ar (sbJson_ faz isso) */
    const ctl = new AbortController(); const to = setTimeout(()=>ctl.abort(), ms || 12000);
    let r; try{ r = await fetch(url, Object.assign({}, opts || {}, { signal: ctl.signal })); } finally { clearTimeout(to); }
    const j = await r.json().catch(()=>null);
    return { ok: r.ok, status: r.status, ms: Date.now()-t0, json: j };
  }catch(e){
    return { ok:false, ms: Date.now()-t0, erro: (e && (e.timeout || e.name === 'AbortError')) ? ('sem resposta em ' + Math.round(ms/1000) + 's') : 'sem conexão' };
  }
}
function _connHora_(t){ const d = new Date(t), p = n=>String(n).padStart(2,'0'); return p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds()); }
function _connLinha_(rotulo, papel, cls, texto, detalhe){
  return '<div class="cx-linha"><span class="conn-bolha ' + cls + '"></span><b>' + escH(rotulo) + '</b> <small>' + escH(papel) + '</small>'
    + '<span class="cx-dir">' + escH(texto) + '</span>' + (detalhe ? '<div class="cx-sub">' + escH(detalhe) + '</div>' : '') + '</div>';
}
function renderConexaoModal_(){
  const box = document.getElementById('conexaoLista'); if(!box) return;
  const r = _connResultado_;
  if(!r){
    box.innerHTML = _connLinha_('Supabase','principal','wait','Verificando...') + _connLinha_('Planilha principal','reserva','wait','Verificando...') + _connLinha_('Planilha de contingência','último recurso','wait','Verificando...');
  } else {
    const ms = x => x.ms + ' ms';
    const sb = r.sb, pl = r.pl, ct = r.ct;
    const sbL = sb.ok ? _connLinha_('Supabase','principal','ok','Online · ' + ms(sb)) : _connLinha_('Supabase','principal','bad','Fora do ar', sb.erro || ('erro ' + sb.status));
    let plL;
    if(pl.naoUsa) plL = _connLinha_('Planilha principal','reserva','wait','Não usada neste restaurante');
    else if(!pl.ok) plL = _connLinha_('Planilha principal','reserva','bad','Fora do ar', pl.erro || ('erro ' + pl.status));
    else if(pl.json && pl.json.manutencao) plL = _connLinha_('Planilha principal','reserva','warn','Online, em manutenção', ms(pl));
    else plL = _connLinha_('Planilha principal','reserva','ok','Online · ' + ms(pl));
    let ctL;
    if(ct.naoUsa) ctL = _connLinha_('Planilha de contingência','último recurso','wait','Não usada neste restaurante');
    else if(!ct.ok || (ct.json && ct.json.ok === false)) ctL = _connLinha_('Planilha de contingência','último recurso','bad','Fora do ar', ct.erro || (ct.json && ct.json.message) || ('erro ' + ct.status));
    else {
      const j = ct.json || {}; const det = [];
      if(typeof j.pendentes === 'number') det.push(j.pendentes + ' venda(s) pendente(s) de trazer');
      if(j.espelhoAtualizadoEm) det.push('espelho atualizado em ' + fmtDiaHoraBr_(j.espelhoAtualizadoEm));
      ctL = _connLinha_('Planilha de contingência','último recurso','ok','Online · ' + ms(ct), det.join(' · '));
    }
    box.innerHTML = sbL + plL + ctL;
  }
  const info = [];
  const u = currentUser || {};
  info.push('<b>Usuário:</b> ' + escH((u.login || '—') + (u.nivel ? ' · ' + u.nivel : '')));
  info.push('<b>Servidor em uso:</b> ' + (conexaoAtual==='contingencia' ? 'contingência' : (USAR_SUPABASE_ ? 'Supabase' : 'planilha (servidor antigo)')));
  const el = document.getElementById('connStatus'); if(el) info.push('<b>Estado do app:</b> ' + escH(el.textContent));
  info.push('<b>Internet do aparelho:</b> ' + (navigator.onLine ? 'conectada' : 'sem conexão'));
  info.push('<b>Dados atualizados às:</b> ' + (ultimaSyncMs ? _connHora_(ultimaSyncMs) : '—'));
  const nf = (typeof _fila !== 'undefined') ? _fila.length : 0, ne = (typeof _fila !== 'undefined') ? _fila.filter(i=>i.estado==='erro').length : 0;
  info.push('<b>Fila de envio neste aparelho:</b> ' + (nf ? (nf + ' item(ns)' + (ne ? ', ' + ne + ' com erro' : '')) : 'vazia'));
  info.push('<b>Servidor de reserva:</b> ' + (SINCRONIZACAO_PLANILHAS_ATIVA_ ? 'planilhas sincronizadas com o Supabase e prontas para assumir' : 'planilhas ainda não sincronizadas'));
  if(r) info.push('<b>Verificado às:</b> ' + _connHora_(r.quando));
  document.getElementById('conexaoInfo').innerHTML = info.join('<br>');
}
async function verificarConexaoServidores_(){
  const btn = document.getElementById('conexaoVerificarBtn'); if(btn){ btn.disabled = true; btn.textContent = 'Verificando...'; }
  _connResultado_ = null; renderConexaoModal_();
  const [sb, pl, ct] = await Promise.all([
    _connPing_(SUPABASE_URL_ + '/rest/v1/v_cardapio_status?select=*&limit=1', { headers:{ apikey: SUPABASE_CHAVE_ } }, 8000),
    API_URL ? _connPing_(API_URL + '?ping=1', {}, 12000) : Promise.resolve({ ok:true, ms:0, naoUsa:true }),
    CONTINGENCIA_API_URL ? _connPing_(CONTINGENCIA_API_URL, _connOptsContingencia_(), 12000) : Promise.resolve({ ok:true, ms:0, naoUsa:true })
  ]);
  _connResultado_ = { sb, pl, ct, quando: Date.now() };
  renderConexaoModal_();
  try{ carregarSaude_(); }catch(e){}
  if(btn){ btn.disabled = false; btn.textContent = '🔄 Verificar agora'; }
}
function abrirModalConexao_(){ renderConexaoModal_(); abrirFormModal('conexaoModal'); verificarConexaoServidores_(); }
function atualizarBloqueioVendaOffline(){
  const btn = document.getElementById('vBtn');
  if(!btn) return;
  const aviso = document.getElementById('vOfflineAviso');
  if(conexaoAtual==='offline'){
    btn.disabled = true; btn.title = 'Sem conexão — não é possível finalizar vendas agora.';
    if(aviso) aviso.style.display = 'block';
  } else {
    btn.disabled = false; btn.title = '';
    if(aviso) aviso.style.display = 'none';
  }
}
window.addEventListener('online', ()=>{ sincronizarEmSegundoPlano(); });
window.addEventListener('offline', ()=>{ setConexaoStatus('offline', 'conexão do celular caiu'); });

function aplicarDadosRecebidos(dados){
  normalizarNumerosDados_(dados); // campos numéricos sempre como número (servidor antigo ou texto na planilha)
  if(!dados._parcial){ _dadosBrutos = dados; _versoesLocais = dados.versoes || null; _ultimoFullMs = Date.now(); } // ITEM 19: toda carga completa vira a base
  _cacheUltVendaTel = null; // os dados mudaram: refaz a tabela de última venda por telefone
  configNotificacoes = dados.configNotificacoes || configNotificacoes;
  clientes = dados.clientes || []; promocoes = dados.promocoes || []; cupons = dados.cupons || []; eventos = dados.eventos || [];
  indicacoes = dados.indicacoes || [];
  fidelidadeClientes = dados.fidelidade || []; formasPagamento = dados.formasPagamento || []; categorias = dados.categorias || [];
  produtos = dados.produtos || []; produtoPrecos = dados.produtoPrecos || [];
  produtoIngredientes = dados.produtoIngredientes || []; estoque = dados.estoque || [];
  combos = dados.combos || []; comboPrecos = dados.comboPrecos || []; comboItens = dados.comboItens || [];
  adicionais = dados.adicionais || []; produtoAdicionais = dados.produtoAdicionais || []; feedbacks = dados.feedbacks || []; ocorrencias = dados.ocorrencias || [];
  configCardapio = dados.configCardapio || configCardapio;
  maisPedidos = dados.maisPedidos || maisPedidos;
  mesas = dados.mesas || mesas;
  movimentacoesEstoque = dados.movimentacoesEstoque || movimentacoesEstoque;
  vendas = dados.vendas || []; itensVenda = dados.itensVenda || []; pagamentosVenda = dados.pagamentosVenda || [];
  despesas = dados.despesas || []; categoriasDespesa = dados.categoriasDespesa || []; despesasRecorrentes = dados.despesasRecorrentes || []; ajustesPosVenda = dados.ajustesPosVenda || []; sangrias = dados.sangrias || []; metas = dados.metas || { mensal:0, diaria:0 };
  sessaoCaixa = dados.sessaoCaixa || null; historicoCaixa = dados.historicoCaixa || [];
  usuarios = dados.usuarios || []; logRecentes = dados.logRecentes || [];
  configEntrega = dados.configEntrega || configEntrega; fechamentosEntrega = dados.fechamentosEntrega || []; entregasFechadas = dados.entregasFechadas || [];
  configEstoque = dados.configEstoque || configEstoque;
  if(!formaPrecoAtual && formasPagamento.length) formaPrecoAtual = (formasPagamento.find(f=>f.ativa) || formasPagamento[0]).id;
}
async function init(){
  const hoje = dataLocalISO(new Date());
  document.getElementById('vHistData').value = hoje;
  document.getElementById('despHistData').value = hoje;
  document.getElementById('rMes').value = hoje.slice(0,7);
  iniciarFormatosImpressao();
  if(currentUser && currentUser.emergencia){ // BLOCO 1.3: sem planilha — usa a cópia do catálogo e não chama a planilha
    emergenciaAplicarCatalogo_();
    renderPagamentos();
    setConexaoStatus('contingencia');
    renderizarTudo();
    emergenciaVigiar_();
    return;
  }
  renderPagamentos();

  const temCache = carregarCache();
  if(temCache) renderizarTudo();

  if(!apiConfigurada()){
    document.getElementById('setupWarning').style.display='block';
    setConexaoStatus('offline', 'servidor não conectado');
    if(!temCache) renderizarTudo();
    return;
  }
  setConexaoStatus('syncing');
  try{
    const dados = await apiCall('getAll', {});
    aplicarDadosRecebidos(dados);
    salvarCache();
    setConexaoStatus('online');
  } catch(e){
    setConexaoStatus('offline', temCache ? 'exibindo dados salvos' : 'verifique a internet');
  }
  renderizarTudo();
  configurarSincronizacaoAutomatica();
  /* A contingência (Apps Script) demora para acordar e só interessa a Admin/Operador: consulta depois da abertura, sem atrapalhar. */
  if(currentUser && (currentUser.nivel==='Admin' || currentUser.nivel==='Operador')) setTimeout(carregarStatusContingencia, 8000);
}

/* ---------- SINCRONIZAÇÃO AUTOMÁTICA EM SEGUNDO PLANO ----------
   A cada 60s, busca dados atualizados da planilha e atualiza a tela sozinho —
   mas nunca enquanto o usuário estiver no meio de um formulário, de um modal
   aberto ou de uma venda em andamento no caixa, pra não perder o que ele
   estava digitando nem trocar preços no meio de uma venda. */
let usuarioNoMeioDeFormulario = false;
let sincronizacaoEmAndamento = false;
/* ============================================================
   TEMPO REAL (Supabase Realtime) — pedidos aparecem na hora para Cozinha, Entregador, Garçom, Caixa e Administrador.
   O Realtime respeita as regras de acesso de cada perfil. Se a conexão cair, os temporizadores antigos voltam a
   funcionar como reserva e, ao reconectar, a tela busca tudo de novo (nada se perde).
   ============================================================ */
const _rt_ = { ws:null, hb:null, deb:null, rec:null, tentativas:0, ref:1, ativo:false, ultimaMsg:0, parado:true };
const RT_TOPICO_ = 'realtime:texas-pedidos';
function rtEnviar_(obj){ try{ if(_rt_.ws && _rt_.ws.readyState === 1){ _rt_.ws.send(JSON.stringify(obj)); return true; } }catch(e){} return false; }
function rtIniciar_(){
  _rt_.parado = false;
  if(!currentUser || currentUser.emergencia || _rt_.ws || typeof WebSocket === 'undefined') return;
  const sessao = sbSessaoLer_(); if(!sessao || !sessao.access_token) return;
  let ws;
  try{ ws = new WebSocket(SUPABASE_URL_.replace('https://','wss://') + '/realtime/v1/websocket?apikey=' + encodeURIComponent(SUPABASE_CHAVE_) + '&vsn=1.0.0'); }
  catch(e){ rtReagendar_(); return; }
  _rt_.ws = ws;
  ws.onopen = ()=>{
    _rt_.ultimaMsg = Date.now();
    const atual = sbSessaoLer_() || sessao;
    rtEnviar_({ topic: RT_TOPICO_, event:'phx_join', ref:String(_rt_.ref++), payload:{ config:{ broadcast:{ ack:false, self:false }, presence:{ key:'' }, postgres_changes:[{ event:'*', schema:'public', table:'vendas' }, { event:'*', schema:'public', table:'mesas' }], private:false }, access_token: atual.access_token } });
    clearInterval(_rt_.hb);
    _rt_.hb = setInterval(()=>{
      if(Date.now() - _rt_.ultimaMsg > 70000){ try{ ws.close(); }catch(e){} return; } /* sem resposta: conexão morta */
      rtEnviar_({ topic:'phoenix', event:'heartbeat', payload:{}, ref:String(_rt_.ref++) });
    }, 25000);
  };
  ws.onmessage = (ev)=>{
    let m; try{ m = JSON.parse(ev.data); }catch(e){ return; }
    _rt_.ultimaMsg = Date.now();
    if(m.event === 'postgres_changes'){ rtAvisoPedido_(); return; }
    if(m.event === 'phx_reply' && m.topic === RT_TOPICO_){
      if(m.payload && m.payload.status === 'ok'){ _rt_.tentativas = 0; if(!_rt_.ativo){ _rt_.ativo = true; atualizarStatusDetector_(); } rtAtualizarTela_(0); /* recupera o que passou enquanto estava desconectado */ }
      else { try{ ws.close(); }catch(e){} }
      return;
    }
    if(m.event === 'phx_error' || m.event === 'phx_close'){ try{ ws.close(); }catch(e){} }
  };
  ws.onclose = ()=>{ clearInterval(_rt_.hb); _rt_.ws = null; if(_rt_.ativo){ _rt_.ativo = false; atualizarStatusDetector_(); } if(!_rt_.parado && currentUser) rtReagendar_(); };
  ws.onerror = ()=>{ try{ ws.close(); }catch(e){} };
}
function rtReagendar_(){
  clearTimeout(_rt_.rec);
  const esperas = [1000, 2000, 4000, 8000, 15000, 30000];
  const ms = esperas[Math.min(_rt_.tentativas++, esperas.length - 1)];
  _rt_.rec = setTimeout(async ()=>{
    if(_rt_.parado || !currentUser) return;
    const s = sbSessaoLer_(); if(s && Date.now() > s.expira){ try{ await sbRenovar_(); }catch(e){} }
    rtIniciar_();
  }, ms);
}
function rtParar_(){ _rt_.parado = true; clearTimeout(_rt_.rec); clearTimeout(_rt_.deb); clearInterval(_rt_.hb); _rt_.ativo = false; try{ if(_rt_.ws) _rt_.ws.close(); }catch(e){} _rt_.ws = null; }
function rtEnviarToken_(token){ if(_rt_.ws) rtEnviar_({ topic: RT_TOPICO_, event:'access_token', payload:{ access_token: token }, ref:String(_rt_.ref++) }); }
function rtAvisoPedido_(){ clearTimeout(_rt_.deb); _rt_.deb = setTimeout(()=>rtAtualizarTela_(0), 300); }
async function rtAtualizarTela_(tent){
  if(!currentUser || currentUser.emergencia) return;
  /* 1) avisos (som, vibração, notificação) de pedido novo; 2) atualiza os dados de qualquer mudança (status, cancelamento...) */
  if(souDetector_()){ try{ await detectarNovosCozinha_(false); }catch(e){} }
  if(Date.now() - ultimaSyncMs < 1500) return; /* o detector já atualizou agora */
  if(sincronizacaoEmAndamento || !seguroParaSincronizar()){ /* ocupado agora (venda em andamento, janela aberta...): tenta de novo logo em seguida */
    if((tent||0) < 20){ clearTimeout(_rt_.deb); _rt_.deb = setTimeout(()=>rtAtualizarTela_((tent||0) + 1), 3000); }
    return;
  }
  sincronizarEmSegundoPlano();
}
document.addEventListener('visibilitychange', ()=>{
  if(document.hidden || !currentUser || _rt_.parado) return;
  if(!_rt_.ws || (Date.now() - _rt_.ultimaMsg > 45000)){ try{ if(_rt_.ws) _rt_.ws.close(); else rtIniciar_(); }catch(e){} }
});
function configurarSincronizacaoAutomatica(){
  const seletorCampos = 'input, select, textarea';
  document.addEventListener('focusin', (e)=>{
    if(e.target.matches && e.target.matches(seletorCampos) && !e.target.classList.contains('search')) usuarioNoMeioDeFormulario = true;
  });
  document.addEventListener('focusout', (e)=>{
    if(e.target.matches && e.target.matches(seletorCampos)){
      setTimeout(()=>{
        const ativo = document.activeElement;
        const aindaEditando = ativo && ativo.matches && ativo.matches(seletorCampos) && !ativo.classList.contains('search');
        if(!aindaEditando) usuarioNoMeioDeFormulario = false;
      }, 200);
    }
  });
  /* sem atualização periódica. Os dados são atualizados ao entrar em Pedidos/Entregas/Visão Geral/Relatórios,
     ao voltar para o app (mais de 1 min fora), no botão "🔄 Atualizar" e no timer de 3 min. A Cozinha continua com o detector próprio. */
  document.addEventListener('visibilitychange', ()=>{ if(!document.hidden && Date.now()-ultimaSyncMs > 60000 && currentUser) sincronizarEmSegundoPlano(); });
  /* Timer de 3 min: só atualiza com o app visível, logado e quando nada está sendo feito (venda, formulário, janela aberta).
     Se não for seguro agora, simplesmente pula e tenta na próxima rodada. A Cozinha usa o detector próprio. */
  setInterval(()=>{
    if(!currentUser || document.hidden || currentUser.nivel==='Cozinha' || _rt_.ativo) return;
    if(Date.now()-ultimaSyncMs < SYNC_INTERVALO_MS - 10000) return; // já atualizou há pouco (botão, volta ao app, detector)
    sincronizarEmSegundoPlano(); // já confere apiConfigurada() e seguroParaSincronizar()
  }, SYNC_INTERVALO_MS);
}
/* Pedidos e Entregas agora são uma aba só: dois painéis dentro de Pedidos (Entregador vê só Entregas; Cozinha e Garçom só Pedidos). */
let _painelPedidosAtual = 'pedidos';
function pedidosPainel_(qual){
  if(qual==='mesas' && souGarcom_()){ abrirMesasPopup_(); return; }
  _painelPedidosAtual = qual;
  const ped = document.getElementById('pedidosPainelPedidos'), ent = document.getElementById('pedidosPainelEntregas'), mes = document.getElementById('pedidosPainelMesas');
  if(ped) ped.style.display = qual==='pedidos' ? '' : 'none';
  if(ent) ent.style.display = qual==='entregas' ? '' : 'none';
  if(mes) mes.style.display = qual==='mesas' ? '' : 'none';
  const bp = document.getElementById('pedSubPedidos'), be = document.getElementById('pedSubEntregas'), bm = document.getElementById('pedSubMesas');
  if(bp) bp.classList.toggle('active', qual==='pedidos');
  if(be) be.classList.toggle('active', qual==='entregas');
  if(bm) bm.classList.toggle('active', qual==='mesas');
  if(qual==='mesas') renderMesasPainel_();
}
function abrirPedidosPainel_(qual){ const b = document.querySelector('[data-tab=pedidos]'); if(b) b.click(); pedidosPainel_(qual); }
const _alertaPed_ = { pedidos:false, entregas:false, mesas:false };
function _atualizarAlertaPedidos_(){
  const t = document.querySelector('[data-tab=pedidos]'); if(t) t.classList.toggle('has-alert', _alertaPed_.pedidos || _alertaPed_.entregas || _alertaPed_.mesas);
  const bp = document.getElementById('pedSubPedidos'), be = document.getElementById('pedSubEntregas'), bm = document.getElementById('pedSubMesas');
  if(bp) bp.classList.toggle('has-alert', _alertaPed_.pedidos);
  if(be) be.classList.toggle('has-alert', _alertaPed_.entregas);
  if(bm) bm.classList.toggle('has-alert', _alertaPed_.mesas);
}
function seguroParaSincronizar(){
  if(souCozinha_()) return !document.querySelector('.modal-overlay.open'); // Cozinha: sem formulário/carrinho, só espera se houver janela aberta
  if(usuarioNoMeioDeFormulario) return false;
  if(carrinhoAtual.length>0) return false; // venda em andamento no caixa
  if(document.querySelector('.modal-overlay.open')) return false; // algum cadastro/edição aberto
  if(window.POP_SEL_ && document.querySelector(window.POP_SEL_.split(',').map(function(x){return x+':not(:empty)';}).join(','))) return false; // janela de Integrações aberta
  return true;
}
/* ITEM 19 — Admin/Operador: pergunta "mudou algo?" (sem ler planilha) e baixa só a parte que mudou.
   Os outros perfis, a primeira carga e a cada 15 min continuam baixando tudo (rede de segurança). */
const FULL_SYNC_MS_ = 15*60*1000;
function ehGestor_(){ return !!(currentUser && (currentUser.nivel === 'Admin' || currentUser.nivel === 'Operador')); }
async function sincronizarEmSegundoPlano(){
  if(currentUser && currentUser.emergencia) return; // BLOCO 1.3
  if(sincronizacaoEmAndamento || !apiConfigurada() || !seguroParaSincronizar()) return;
  sincronizacaoEmAndamento = true;
  setConexaoStatus('syncing');
  try{
    const completo = !ehGestor_() || !_dadosBrutos || !_versoesLocais || (Date.now() - _ultimoFullMs > FULL_SYNC_MS_);
    let mudou = true;
    if(completo){
      const dados = await apiCall('getAll', {});
      if(!seguroParaSincronizar()){ setConexaoStatus('online'); return; }
      aplicarDadosRecebidos(dados);
    } else {
      const v = await apiCall('getVersoes', {});
      if(!v || v.ok === false) throw new Error('versoes');
      const grupos = [];
      if(v.cad !== _versoesLocais.cad) grupos.push('cad');
      if(v.din !== _versoesLocais.din) grupos.push('din');
      mudou = grupos.length > 0;
      if(mudou){
        let junto = Object.assign({}, _dadosBrutos); const novas = Object.assign({}, _versoesLocais);
        for(const g of grupos){
          const parte = await apiCall('getDadosGrupo', { grupo: g });
          if(!parte || parte.ok === false || !parte.versoes) throw new Error('grupo');
          junto = Object.assign(junto, parte); novas[g] = parte.versoes[g]; // guarda a versão lida ANTES dos dados
        }
        if(!seguroParaSincronizar()){ setConexaoStatus('online'); return; }
        junto.versoes = novas; junto._parcial = true;
        aplicarDadosRecebidos(junto);
        _dadosBrutos = junto; _versoesLocais = novas;
      }
    }
    if(mudou){ salvarCache(); renderizarTudo(); }
    ultimaSyncMs = Date.now(); mostrarUltimaSync_();
    setConexaoStatus('online');
  } catch(e){ setConexaoStatus('offline', 'não foi possível atualizar — toque em Atualizar'); }
  finally { sincronizacaoEmAndamento = false; }
}
