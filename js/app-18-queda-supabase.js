
/* ===================== QUEDA DO SUPABASE (modo reserva) ===================== */
const SB5_FALHAS_PARA_AVISAR_ = 3;   // espelha contingencia_config.falhas_para_planilha (padrão 3)
let _sb5FaixaT_ = null, _sb5Falhas_ = 0, _sb5Queda_ = false, _sb5Reserva_ = false, _sb5Sonda_ = null, _sb5AvisoTimer_ = null;
const SB5_SONDA_MS_ = 20000;   // com o Supabase fora, testa a volta a cada 20 s
function sb5Faixa_(){
  let d = document.getElementById('sb5Faixa');
  if(!d){
    d = document.createElement('div'); d.id = 'sb5Faixa';
    d.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;z-index:9998;background:#b45309;color:#fff;padding:8px 12px;text-align:center;font:700 13px/1.3 system-ui,sans-serif;';
    document.body.appendChild(d);
  }
  return d;
}
/* Modo reserva é só da equipe: o cliente do cardápio (sem login) nunca vê a faixa nem é recarregado. */
function sb5Logado_(){ try{ return !!(typeof currentUser !== 'undefined' && currentUser); }catch(e){ return false; } }
function sb5Atualizar_(){
  const d = sb5Faixa_();
  if(!_sb5Queda_ || !sb5Logado_()){ d.style.display = 'none'; return; }
  const n = (typeof _fila !== 'undefined') ? _fila.filter(i => i.estado !== 'erro').length : 0;
  d.textContent = '🟠 Modo reserva — Supabase fora do ar. FUNCIONA: venda do Caixa (retirada/entrega, sem desconto, sem cupom) e pedido do cardápio, pela contingência; consulta dos pedidos em Pedidos. Cadastro de cliente, fidelidade, feedback e ocorrência ficam na fila' + (n ? ' (' + n + ' agora)' : '') + ' e seguem sozinhos na volta. FICA PARA A VOLTA: mudar status, estoque, compras, relatórios, avisos e IA.'
    + ((window.INTEG_ && INTEG_.ifood) ? ' ⚠️ iFOOD: os pedidos do iFood NÃO entram no sistema enquanto durar a queda — fique de olho no tablet/portal do iFood e aceite lá. Na volta o sistema varre e avisa o que chegou.' : '');
  d.style.display = 'block';
}
/* MODO RESERVA: com o Supabase fora (3 falhas seguidas) o app (a) para o tempo real e volta às atualizações de 3 e 15 minutos,
   (b) marca "sem conexão" para o Caixa lançar a venda na contingência (com confirmação), (c) testa a volta a cada 20 s.
   Na volta: reenvia a fila do aparelho, o Admin lança as vendas da contingência no Supabase, atualiza os dados e religa o tempo real. */
function sb5Sondar_(){
  if(window._sb5Simulado_) return Promise.resolve(false);
  return new Promise(res=>{
    const c = (typeof AbortController !== 'undefined') ? new AbortController() : null, t = setTimeout(()=>{ try{ if(c) c.abort(); }catch(e){} res(false); }, 6000);
    fetch(SUPABASE_URL_ + '/rest/v1/', { headers:{ apikey: SUPABASE_CHAVE_ }, signal: c ? c.signal : undefined, cache:'no-store' })
      .then(r=>{ clearTimeout(t); res(r.status < 500); }).catch(()=>{ clearTimeout(t); res(false); });
  });
}
const LEITURA_CHAVE_KEY_ = 'txb_cont_leitura';
function garantirChaveLeitura_(renovar){
  try{
    if(!currentUser || currentUser.emergencia) return;
    if(!renovar && localStorage.getItem(LEITURA_CHAVE_KEY_)) return;
    sb410Edge_('planilha-admin', { acao:'chaveLeitura', renovar: !!renovar }, 30000).then(r=>{ if(r && r.ok && r.chave) localStorage.setItem(LEITURA_CHAVE_KEY_, r.chave); }).catch(()=>{});
  }catch(e){}
}
/* RESERVA DE LEITURA: com o Supabase fora, mostra os pedidos que estavam em andamento (espelho de até ~10 min) e os que entraram na fila da contingência.
   Só consulta: o status do pedido NÃO muda por aqui. Nunca mostra telefone, endereço nem pagamento. */
let _sb5PainelTimer_ = null;
function sb5PainelReservaLigar_(on){
  const c = document.getElementById('reservaPedidosCard'); if(!c) return;
  c.style.display = on ? '' : 'none';
  clearInterval(_sb5PainelTimer_); _sb5PainelTimer_ = null;
  if(on){ sb5PainelReservaAtualizar_(); _sb5PainelTimer_ = setInterval(sb5PainelReservaAtualizar_, 180000); }   // a cada 3 minutos
}
async function sb5PainelReservaAtualizar_(){
  const box = document.getElementById('reservaPedidosBox'), info = document.getElementById('reservaPedidosInfo'); if(!box) return;
  const chave = localStorage.getItem(LEITURA_CHAVE_KEY_) || localStorage.getItem(CONTINGENCIA_CHAVE_KEY);
  if(!chave){ box.innerHTML = '<div class="notif-empty">Este aparelho ainda não tem acesso à reserva. Entre no app com o Supabase no ar para liberar.</div>'; return; }
  if(!box.innerHTML) box.innerHTML = '<div class="notif-empty">Buscando…</div>';
  const post = acao => fetchContingencia_({ method:'post', body: JSON.stringify({ action: acao, chave }) }, TIMEOUT_CONT_LEITURA_MS_, 1);
  try{
    const [esp, fila] = await Promise.all([post('getEspelhoReserva'), post('listarFilaInterna')]);
    if((esp && /chave/i.test(esp.message||'')) || (fila && /chave/i.test(fila.message||''))){ localStorage.removeItem(LEITURA_CHAVE_KEY_); box.innerHTML = '<div class="notif-empty">A chave deste aparelho foi trocada. Entre de novo com o Supabase no ar.</div>'; return; }
    const hora = iso => { const t = Date.parse(iso); return t ? new Date(t).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }) : ''; };
    const itensTxt = its => (its||[]).map(i=>escH(String(i.quantidade) + '× ' + i.descricao)).join(' · ');
    const novos = (fila && fila.ok ? fila.fila : []) || [];
    const r = esp && esp.ok ? esp.reserva : null, ativos = (r && r.pedidos) || [];
    const cartao = (tit, corpo) => '<div style="border:1px solid #3a2c1c;border-radius:10px;padding:8px;margin:6px 0;"><b>' + tit + '</b><div style="margin-top:3px;">' + corpo + '</div></div>';
    let html = '<h3 style="margin:8px 0 2px;">🆕 Entraram na contingência (' + novos.length + ')</h3>';
    html += novos.length ? novos.slice().reverse().map(n=>cartao((n.origem === 'Cardápio' ? '🌐 Cardápio' : '🧾 Caixa') + ' · ' + hora(n.recebidoEm) + (n.cliente ? ' · ' + escH(n.cliente) : ''),
      itensTxt(n.itens) + '<div class="obs-line">' + escH(n.tipoEntrega || '') + (n.total ? ' · R$ ' + Number(n.total).toFixed(2).replace('.', ',') : '') + (n.obs ? ' · ' + escH(n.obs) : '') + '</div>')).join('')
      : '<div class="obs-line">Nenhum pedido novo na fila.</div>';
    html += '<h3 style="margin:12px 0 2px;">👨‍🍳 Já estavam em andamento (' + ativos.length + ')</h3>';
    html += ativos.length ? ativos.map(a=>cartao('#' + a.numero + ' · ' + escH(a.statusPedido || '') + ' · ' + hora(a.em) + (a.cliente ? ' · ' + escH(a.cliente) : ''),
      itensTxt(a.itens) + '<div class="obs-line">' + escH(a.tipo || '') + (a.obs ? ' · ' + escH(a.obs) : '') + '</div>')).join('')
      : '<div class="obs-line">Nenhum pedido em andamento no último espelho.</div>';
    box.innerHTML = html;
    if(info) info.textContent = 'Fila da contingência atualizada às ' + new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }) + (r ? ' · pedidos em andamento conforme o espelho das ' + hora(r.geradoEm) + ' (o status pode ter mudado depois).' : ' · sem espelho de pedidos ainda.');
  }catch(e){ box.innerHTML = '<div class="notif-empty">Não foi possível falar com a contingência agora. Tente de novo.</div>'; }
}
function sb5EntrarReserva_(){
  if(_sb5Reserva_) return; _sb5Reserva_ = true;
  try{ sb5PainelReservaLigar_(true); }catch(e){}
  try{ rtParar_(); }catch(e){}
  try{ setConexaoStatus('offline', 'Supabase fora do ar — modo reserva'); }catch(e){}
  clearInterval(_sb5FaixaT_); _sb5FaixaT_ = setInterval(()=>{ if(_sb5Queda_ && !document.hidden) sb5Atualizar_(); }, 5000);
  clearInterval(_sb5Sonda_);
  _sb5Sonda_ = setInterval(async ()=>{ if(_sb5Reserva_ && await sb5Sondar_()) sb5SairReserva_(); }, SB5_SONDA_MS_);
  sb5Atualizar_();
}
/* Treino do Desenvolvedor: finge que o Supabase caiu (só neste aparelho). Nada é apagado; encerrar roda o mesmo caminho da volta real. */
async function sb5Simulacao_(){
  if(!currentUser || currentUser.nivel !== 'Desenvolvedor') return;
  if(window._sb5Simulado_){
    window._sb5Simulado_ = false;
    await sb5SairReserva_();
    try{ carregarSaude_(); }catch(e){}
    return;
  }
  if(!await confirmarTxt_('Simular queda do Supabase neste aparelho? Aparece a faixa laranja e as funções bloqueadas ficam indisponíveis. Para voltar, toque em "Encerrar simulação". Não afeta outros aparelhos.')) return;
  window._sb5Simulado_ = true; _sb5Queda_ = true; sb5EntrarReserva_();
  try{ carregarSaude_(); }catch(e){}
}
function sb5Aviso_(texto, cor){
  const d = sb5Faixa_(); d.style.background = cor || '#166534'; d.textContent = texto; d.style.display = 'block';
  clearTimeout(_sb5AvisoTimer_); _sb5AvisoTimer_ = setTimeout(()=>{ d.style.background = '#b45309'; sb5Atualizar_(); }, 15000);
}
async function sb5SairReserva_(){
  if(!_sb5Reserva_ && !_sb5Queda_) return;
  _sb5Reserva_ = false; _sb5Queda_ = false; _sb5Falhas_ = 0; clearInterval(_sb5Sonda_); _sb5Sonda_ = null; clearInterval(_sb5FaixaT_); _sb5FaixaT_ = null;
  try{ sb5PainelReservaLigar_(false); }catch(e){}
  try{ sbNivelMarcar_(true); }catch(e){}
  sb5Atualizar_();
  try{ setTimeout(()=>ifLacunaVerificar_(), 45000); setTimeout(()=>ifLacunaVerificar_(), 120000); }catch(e){}
  if(!sb5Logado_()) return;
  try{ setConexaoStatus('syncing'); }catch(e){}
  try{ await filaProcessar(); }catch(e){}
  let lancadas = 0, problemas = 0;
  if(currentUser && currentUser.nivel === 'Admin' && !currentUser.emergencia){
    try{ const r = await apiCall('reconciliarContingenciaAgora', {}); if(r && r.ok){ lancadas = r.reaplicadas || 0; problemas = (r.falhas || []).length; } }catch(e){}
  }
  try{ if(seguroParaSincronizar()) await atualizarAposDuplicado_(); }catch(e){}
  try{ if(typeof rtIniciar_ === 'function' && currentUser && !currentUser.emergencia) rtIniciar_(); }catch(e){}
  try{ setConexaoStatus('online'); }catch(e){}
  if(lancadas || problemas) sb5Aviso_('🟢 Supabase voltou. ' + lancadas + ' venda(s) da contingência lançada(s)' + (problemas ? ' · ' + problemas + ' com problema (veja Armazenamento → Contingência)' : '') + '.', problemas ? '#b45309' : '#166534');
  else sb5Aviso_('🟢 Supabase voltou. Tudo sincronizado.');
}
(function(){
  const orig = window.sbNivelMarcar_;
  if(typeof orig !== 'function') return;
  window.sbNivelMarcar_ = function(ok){
    if(ok){
      _sb5Falhas_ = 0;
      if((_sb5Queda_ || _sb5Reserva_) && !window._sb5Saindo_ && !window._sb5Simulado_){ window._sb5Saindo_ = true; sb5SairReserva_().finally(()=>{ window._sb5Saindo_ = false; }); }
    } else {
      _sb5Falhas_++;
      if(!_sb5Queda_ && _sb5Falhas_ >= SB5_FALHAS_PARA_AVISAR_ && sb5Logado_()){ _sb5Queda_ = true; sb5EntrarReserva_(); }
    }
    return orig.apply(this, arguments);
  };
  // o contador da faixa só roda durante a queda (ligado em sb5EntrarReserva_, desligado em sb5SairReserva_)
  window.addEventListener('online', ()=>{ if(_sb5Reserva_) sb5Sondar_().then(ok=>{ if(ok) sb5SairReserva_(); }); });   // o celular voltou da rede: testa já
})();


/* ===================== iFOOD: VARREDURA NA VOLTA DA QUEDA ===================== */
/* Enquanto o Supabase está fora, o iFood não consegue entregar pedidos (a consulta roda no Supabase). Na volta o servidor
   registra a "lacuna", varre os pedidos do iFood criados nela e avisa; aqui a equipe vê a faixa e confirma que viu. */
let _ifLacunaEm_ = 0;
function ifLacunaFaixa_(){
  let d = document.getElementById('ifLacunaFaixa');
  if(!d){
    d = document.createElement('div'); d.id = 'ifLacunaFaixa';
    d.style.cssText = 'display:none;position:fixed;left:8px;right:8px;bottom:8px;z-index:9997;background:#7c2d12;color:#fff;padding:10px 12px;border-radius:10px;font:600 13px/1.35 system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.35);';
    document.body.appendChild(d);
  }
  return d;
}
function ifLacunaHora_(v){ try{ return new Date(v).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }); }catch(e){ return ''; } }
async function ifLacunaVerificar_(visto){
  try{
    const nivel = currentUser && currentUser.nivel;
    if(!(window.INTEG_ && INTEG_.ifood) || !(nivel === 'Admin' || nivel === 'Operador') || currentUser.emergencia){ ifLacunaFaixa_().style.display = 'none'; return; }
    if(_sb5Queda_) return;
    _ifLacunaEm_ = Date.now();
    const r = await apiCall('ifoodLacunas', visto ? { marcarVisto:true } : {});
    const d = ifLacunaFaixa_();
    const l = (r && r.ok && r.lacunas) ? r.lacunas : [];
    if(!l.length){ d.style.display = 'none'; return; }
    const tot = l.reduce((a,x)=>a+(Number(x.pedidos)||0),0), canc = l.reduce((a,x)=>a+(Number(x.cancelados)||0),0);
    const per = l.map(x=>ifLacunaHora_(x.inicio) + '–' + ifLacunaHora_(x.fim)).join(', ');
    let h = '<div>🟠 <b>iFood: o sistema ficou fora do ar (' + escH(per) + ').</b> ';
    h += tot ? ('Nesse período chegaram <b>' + tot + '</b> pedido(s) do iFood' + (canc ? ', <b>' + canc + '</b> já cancelado(s) pelo iFood por falta de confirmação' : '') + '. Eles já estão nos Pedidos — confira os que ainda estão abertos e confirme no iFood o que faltar.') : 'Nenhum pedido do iFood foi criado nesse período. Por garantia, confira o portal do iFood.';
    h += '</div><div style="margin-top:8px;text-align:right"><button class="primary" onclick="ifLacunaVerificar_(true)">Entendi</button></div>';
    d.innerHTML = h; d.style.display = 'block';
  }catch(e){}
}
setInterval(()=>{ if(!document.hidden && Date.now() - _ifLacunaEm_ > 300000) ifLacunaVerificar_(); }, 60000);
