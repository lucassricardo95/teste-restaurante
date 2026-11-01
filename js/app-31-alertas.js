/* ===================== ALERTAS (auditoria 18/10/2026 · Fases 7.1 e 7.2) =====================
   Só AVISAM: nada aqui muda status, pagamento, estoque ou caixa.
   • App aberto (Admin, Operador, Cozinha, Garçom): a cada 60 s pergunta ao servidor quais pedidos estão parados
     (a conta usa a hora do SERVIDOR, não a do aparelho). Pedido novo na lista, ou aviso repetido: toca o som e mostra a faixa.
   • App fechado: o servidor manda o push sozinho (agendamento de 1 em 1 minuto), para o perfil certo.
   • Admin: cartão "⏰ Alertas automáticos" em Loja e equipe → Configurar avisos (tempos, liga/desliga, vencimentos, teste). */
const AL_REGRAS_ = [
  ['recebido', 'Pedido novo sem ninguém aceitar', 'Cozinha e Caixa'],
  ['preparo', 'Em preparo há muito tempo', 'Cozinha e Caixa'],
  ['pronta_retirada', 'Pronta (retirada) sem marcar "Retirada"', 'Caixa e Admin'],
  ['pronta_entrega', 'Pronta (entrega) sem sair para entrega', 'Caixa e Admin'],
  ['pronta_mesa', 'Pronta (mesa) sem marcar "Servida"', 'Caixa e Garçom'],
  ['saiu', 'Saiu para entrega e não foi concluído', 'Caixa e Admin'],
  ['a_receber', 'Pagamento "a receber" com o pedido pronto', 'Caixa e Admin']
];
let _alVistos_ = {}, _alTimer_ = null, _alLista_ = [], _alSis_ = [], _alEscondido_ = false;
function alPode_(){
  try{ return USAR_SUPABASE_ && currentUser && !currentUser.emergencia && ['Admin','Operador','Cozinha','Garçom'].indexOf(currentUser.nivel) !== -1 && !(typeof _sb5Queda_ !== 'undefined' && _sb5Queda_); }
  catch(e){ return false; }
}
function alFaixa_(){
  let d = document.getElementById('alFaixa');
  if(!d){
    d = document.createElement('div'); d.id = 'alFaixa'; d.setAttribute('role', 'status'); d.setAttribute('aria-live', 'polite');
    d.style.cssText = 'display:none;position:fixed;left:8px;right:8px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:9997;max-width:560px;max-height:40vh;overflow-y:auto;margin:0 auto;background:#3a1d08;border:2px solid var(--orange,#fd9f00);border-radius:12px;padding:8px 10px;box-shadow:0 6px 24px rgba(0,0,0,.5);color:var(--cream,#fff);font-size:14px;max-height:45vh;overflow:auto;';
    document.body.appendChild(d);
  }
  return d;
}
function alRender_(){
  const d = alFaixa_();
  if(!_alLista_.length && !_alSis_.length){ d.style.display = 'none'; d.innerHTML = ''; return; }
  if(_alEscondido_){ d.style.display = 'none'; return; }
  const sisHtml = _alSis_.length ? '<div style="margin-bottom:4px;"><b>⚠️ Avisos do sistema</b></div>' + _alSis_.map(a => `<div style="border-top:1px solid rgba(255,255,255,.12);padding:6px 0;"><div><b>${escH(a.titulo)}</b>${a.vezes > 1 ? ' · ' + escH(a.vezes) + 'º aviso' : ''}</div><div class="sub">${escH(a.texto)}</div></div>`).join('') + '<div class="sub" style="margin:2px 0 6px;">Estes avisos se repetem até o problema ser resolvido.</div>' : '';
  d.innerHTML = sisHtml + (_alLista_.length ? '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px;"><b>⏰ Pedidos parados</b><button class="ghost" type="button" style="padding:2px 8px;" onclick="alFecharFaixa_()" aria-label="Esconder até o próximo aviso">✕</button></div>' : '<div style="text-align:right;"><button class="ghost" type="button" style="padding:2px 8px;" onclick="alFecharFaixa_()" aria-label="Esconder até o próximo aviso">✕</button></div>') +
    _alLista_.map(a => `<div style="border-top:1px solid rgba(255,255,255,.12);padding:6px 0;">
      <div><b>#${escH(a.numero)}</b> · ${escH(a.rotulo)} · <b>há ${escH(a.minutos)} min</b>${a.vezes > 1 ? ' · ' + escH(a.vezes) + 'º aviso' : ''}</div>
      <div class="btnrow" style="margin-top:4px;gap:6px;display:flex;flex-wrap:wrap;">
        <button class="small-gold" type="button" onclick="alAbrirPedido_('${escH(a.vendaId)}')">Ver pedido</button>
        <button class="ghost" type="button" onclick="alAdiar_('${escH(a.vendaId)}','adiar')">Adiar 10 min</button>
        <button class="ghost" type="button" onclick="alAdiar_('${escH(a.vendaId)}','silenciar')">Silenciar este pedido</button>
      </div></div>`).join('');
  d.style.display = '';
}
function alFecharFaixa_(){ _alEscondido_ = true; const d = document.getElementById('alFaixa'); if(d) d.style.display = 'none'; }
function alAbrirPedido_(vendaId){
  const a = _alLista_.find(x => x.vendaId === vendaId) || {};
  const sub = (a.regra === 'pronta_entrega' || a.regra === 'saiu') ? 'entregas' : a.regra === 'pronta_mesa' ? 'mesas' : 'pedidos';
  try{
    if(typeof abrirPedidosPainel_ === 'function') abrirPedidosPainel_(sub);
  }catch(e){}
}
async function alAdiar_(vendaId, acao){
  let motivo = '';
  if(acao === 'silenciar'){
    const f = await vsForm({ titulo:'Silenciar o aviso deste pedido', texto:'O pedido não muda. Só para de avisar. Fica registrado no histórico.', ok:'Silenciar',
      campos:[ { id:'motivo', rotulo:'Motivo', tipo:'texto', sugestoes:['Cliente avisou que vai atrasar','Pedido agendado','Já resolvido no balcão'] } ] });
    if(!f) return; motivo = f.motivo || '';
  }
  try{
    const r = await sbRpc_('api_alertas_pedido_adiar', { p:{ vendaId, acao, motivo } });
    if(r && r.message) avisar(r.message);
    _alLista_ = _alLista_.filter(a => a.vendaId !== vendaId); alRender_();
  }catch(e){ avisar('Não foi possível agora. Tente de novo.'); }
}
async function alVerificar_(){
  if(!alPode_()){ _alLista_ = []; _alSis_ = []; alRender_(); return; }
  if(document.hidden) return;                                     // com a tela apagada quem avisa é o push do servidor
  try{
    const r = await sbRpc_('api_alertas_pedidos', { p:{} });
    if(!r || r.ok !== true) return;
    const lista = Array.isArray(r.alertas) ? r.alertas : [];
    const sis = Array.isArray(r.sistema) ? r.sistema : [];
    let tocar = false, tocarSis = false; const novos = {};
    sis.forEach(a => { const k = 'sis:' + a.chave; novos[k] = a.vezes; if(!(k in _alVistos_) || (a.vezes || 0) > (_alVistos_[k] || 0)) tocarSis = true; });
    lista.forEach(a => { const k = a.vendaId + ':' + a.regra; novos[k] = a.vezes; if(!(k in _alVistos_) || (a.vezes || 0) > (_alVistos_[k] || 0)) tocar = true; });
    if(tocar || tocarSis) _alEscondido_ = false;
    _alVistos_ = novos; _alLista_ = lista; _alSis_ = sis; alRender_();
    try{ if(typeof _alertaPed_ !== 'undefined' && lista.length){ lista.forEach(a => { const s = (a.regra === 'pronta_entrega' || a.regra === 'saiu') ? 'entregas' : a.regra === 'pronta_mesa' ? 'mesas' : 'pedidos'; _alertaPed_[s] = true; }); _atualizarAlertaPedidos_(); } }catch(e){}
    if(tocar && lista.length){
      const a = lista[0];
      try{ mostrarNotificacao_('⏰ Pedido #' + a.numero + ' parado', a.rotulo + ' há ' + a.minutos + ' min'); }catch(e){}
      try{ somAlerta_(); }catch(e){}
    } else if(tocarSis && sis.length){
      try{ mostrarNotificacao_('⚠️ ' + sis[0].titulo, sis[0].texto); }catch(e){}
      try{ somAlerta_(); }catch(e){}
    }
  }catch(e){ /* sem conexão: tenta no próximo minuto */ }
}
function alLigar_(){
  if(_alTimer_) return;
  _alTimer_ = setInterval(()=>{ alVerificar_(); alMontarCartaoAdmin_(); }, 60000);
  setTimeout(()=>{ alVerificar_(); alMontarCartaoAdmin_(); }, 8000);
  document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) alVerificar_(); });
}

/* ---------- cartão do Admin ---------- */
function alMontarCartaoAdmin_(){
  try{
    const aba = document.getElementById('tab-notifadmin');
    if(!aba || !currentUser || currentUser.nivel !== 'Admin' || !USAR_SUPABASE_ || document.getElementById('alCard')) return;
    aba.insertAdjacentHTML('beforeend', `<div class="card" id="alCard"><h2>⏰ Alertas automáticos</h2>
      <p class="sub">Só avisam (som e notificação). Nunca mudam pedido, pagamento ou caixa. Pedido parado: avisa quem precisa agir. Falha do sistema e vencimentos: avisam o Admin (notificação e e-mail). Todos se repetem até o problema ser resolvido.</p>
      <div id="alCfgBox">Carregando…</div>
      <div class="msg" id="alCfgMsg"></div>
      <div class="btnrow" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
        <button class="small-gold" type="button" onclick="alSalvarCfg_()">Salvar</button>
        <button class="ghost" type="button" onclick="alPadrao_()">Voltar ao padrão</button>
        <button class="ghost" type="button" onclick="alTeste_()">Enviar aviso de teste</button>
      </div></div>`);
    alCarregarCfg_();
    rtMontar_();
  }catch(e){}
}

/* ---------- v1.24 · Resumo do turno (ao fechar o caixa, os Admins recebem no celular) ---------- */
function rtMontar_(){
  const aba = document.getElementById('tab-notifadmin');
  if(!aba || document.getElementById('rtCard')) return;
  aba.insertAdjacentHTML('beforeend', `<div class="card" id="rtCard"><h2>📊 Resumo do turno</h2>
    <p class="sub">Ao fechar o caixa, todos os Admins recebem no celular: faturamento do turno (sem a taxa de entrega), número de pedidos, ticket médio, pedidos do iFood, cancelados e se o caixa bateu.</p>
    <label style="display:flex;gap:6px;align-items:center;"><input type="checkbox" id="rtLigado" onchange="rtSalvar_()"> Mandar o resumo ao fechar o caixa</label>
    <div class="obs-line" id="rtExemplo" style="margin-top:6px;">Carregando…</div>
    <div class="msg" id="rtMsg"></div>
    <div class="btnrow" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;"><button class="ghost" type="button" onclick="rtTeste_()">Enviar teste com o último turno</button></div></div>`);
  rtCarregar_();
}
function rtMostrar_(r){
  const cb = document.getElementById('rtLigado'), ex = document.getElementById('rtExemplo'); if(!cb || !ex) return;
  cb.checked = r.ligado !== false;
  ex.innerHTML = r.exemplo ? 'Último turno: <b>' + escH(r.exemplo.titulo || '') + '</b> — ' + escH(r.exemplo.texto || '') : 'Ainda não há turno fechado para mostrar de exemplo.';
}
async function rtCarregar_(){
  try{
    const r = await sbRpc_('api_resumo_turno_config', { p:{} });
    if(!r || r.ok !== true){ showMsg('rtMsg', '⚠️ ' + ((r && r.message) || 'Não consegui carregar o resumo do turno.'), 'warn'); return; }
    rtMostrar_(r);
  }catch(e){ showMsg('rtMsg', '📡 Sem conexão para carregar o resumo do turno.', 'warn'); }
}
async function rtSalvar_(){
  const cb = document.getElementById('rtLigado'); if(!cb) return;
  try{
    const r = await sbRpc_('api_resumo_turno_config', { p:{ ligado: !!cb.checked } });
    if(r && r.ok){ rtMostrar_(r); showMsg('rtMsg', cb.checked ? 'Ligado: o resumo chega ao fechar o caixa.' : 'Desligado.', 'ok'); }
    else { cb.checked = !cb.checked; showMsg('rtMsg', '⚠️ ' + ((r && r.message) || 'Não foi possível salvar.'), 'warn'); }
  }catch(e){ cb.checked = !cb.checked; showMsg('rtMsg', '⚠️ Não foi possível salvar agora. Confira a internet e tente de novo.', 'warn'); }
}
async function rtTeste_(){
  try{
    const r = await sbRpc_('api_resumo_turno_config', { p:{ testar:true } });
    showMsg('rtMsg', (r && r.ok ? '' : '⚠️ ') + ((r && r.message) || 'Não foi possível testar.'), r && r.ok ? 'ok' : 'warn');
    if(r && r.ok) rtMostrar_(r);
  }catch(e){ showMsg('rtMsg', '⚠️ Não foi possível testar agora.', 'warn'); }
}
let _alCfg_ = null;
async function alCarregarCfg_(){
  const box = document.getElementById('alCfgBox'); if(!box) return;
  try{
    const r = await sbRpc_('api_alertas_config', { p:{} });
    if(!r || r.ok !== true){ box.textContent = (r && r.message) || 'Não consegui carregar.'; return; }
    _alCfg_ = r; alDesenharCfg_(r.regras, r.repetirMin, r.escalarApos, r.vencimentos, r.emailAtivo, r.ativos, r.sistemaRepetirMin);
  }catch(e){ box.textContent = 'Não consegui carregar agora.'; }
}
function alDesenharCfg_(regras, rep, esc, venc, email, ativos, sisRep){
  const box = document.getElementById('alCfgBox'); if(!box) return;
  const linhas = AL_REGRAS_.map(([k, nome, quem]) => { const g = (regras || {})[k] || {}; return `<tr>
      <td style="padding:4px 6px;"><label style="display:flex;gap:6px;align-items:center;"><input type="checkbox" id="alL_${k}" ${g.ligado !== false ? 'checked' : ''}> ${escH(nome)}</label><div class="sub">${escH(quem)}</div></td>
      <td style="padding:4px 6px;white-space:nowrap;"><input type="number" inputmode="numeric" min="1" max="240" id="alM_${k}" value="${escH(g.min ?? '')}" style="width:70px;"> min</td></tr>`; }).join('');
  const vs = (venc || []).concat([{ item:'', vence:'' }, { item:'', vence:'' }]);
  const vl = vs.map((v, i) => `<div class="row2" style="gap:6px;"><div><input type="text" maxlength="60" id="alVi_${i}" placeholder="Ex.: Certificado digital A1" value="${escH(v.item || '')}"></div><div><input type="date" id="alVd_${i}" value="${escH(v.vence || '')}"></div></div>`).join('');
  const at = (ativos || []).length ? '<div class="obs-line" style="color:#ffb3ab;margin:6px 0;">Agora: ' + ativos.map(a => '⚠️ ' + escH(a.titulo)).join(' · ') + '</div>' : '<div class="obs-line" style="margin:6px 0;">Nenhuma falha do sistema agora.</div>';
  box.innerHTML = at + `<h3 class="mt-2">Pedido parado</h3><div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;">${linhas}</table></div>
    <div class="row2 mt-2"><div><label for="alRep">Repetir o aviso a cada (min)</label><input type="number" inputmode="numeric" min="1" max="60" id="alRep" value="${escH(rep)}"></div>
    <div><label for="alEsc">Avisar também o Admin depois de (avisos)</label><input type="number" inputmode="numeric" min="1" max="20" id="alEsc" value="${escH(esc)}"></div></div>
    <div class="row2 mt-2"><div><label for="alSisRep">Repetir avisos do sistema a cada (min)</label><input type="number" inputmode="numeric" min="10" max="240" id="alSisRep" value="${escH(sisRep || 30)}"></div><div class="sub" style="align-self:end;">Falha do sistema (planilha parada, backup, caixa vencido…) avisa de novo nesse intervalo até ser resolvida. O e-mail vai no máximo a cada 6 horas.</div></div>
    <h3 class="mt-3">Vencimentos (avisa 30, 15, 7 e 1 dia antes)</h3><p class="sub">Certificado digital da nota fiscal, domínio, plano pago, cartão da conta do Supabase… O que tiver data para vencer.</p>${vl}
    <label style="display:flex;gap:6px;align-items:center;margin-top:8px;"><input type="checkbox" id="alEmail" ${email !== false ? 'checked' : ''}> Mandar também por e-mail (para a conta dona da planilha principal)</label>`;
}
function alLerForm_(){
  const regras = {}; AL_REGRAS_.forEach(([k]) => { regras[k] = { ligado: !!(document.getElementById('alL_' + k) || {}).checked, min: Number((document.getElementById('alM_' + k) || {}).value) || 0 }; });
  const venc = []; for(let i = 0; document.getElementById('alVi_' + i); i++){ const it = document.getElementById('alVi_' + i).value.trim(), dt = document.getElementById('alVd_' + i).value; if(it || dt) venc.push({ item: it, vence: dt }); }
  return { regras, repetirMin: Number(document.getElementById('alRep').value) || 5, escalarApos: Number(document.getElementById('alEsc').value) || 3, sistemaRepetirMin: Number(document.getElementById('alSisRep').value) || 30, vencimentos: venc, emailAtivo: !!document.getElementById('alEmail').checked };
}
async function alSalvarCfg_(){
  const p = alLerForm_();
  if(p.vencimentos.some(v => !v.item || !v.vence)){ showMsg('alCfgMsg', 'Em cada vencimento, preencha o nome e a data.', 'warn'); return; }
  try{ const r = await sbRpc_('api_alertas_salvar', { p }); showMsg('alCfgMsg', (r && r.message) || 'Não foi possível salvar.', r && r.ok ? 'ok' : 'warn'); if(r && r.ok) alCarregarCfg_(); }
  catch(e){ showMsg('alCfgMsg', 'Não foi possível salvar agora.', 'warn'); }
}
function alPadrao_(){ if(!_alCfg_) return; const p = alLerForm_(); alDesenharCfg_(_alCfg_.padrao, 5, 3, p.vencimentos, p.emailAtivo, _alCfg_.ativos, 30); showMsg('alCfgMsg', 'Tempos padrão na tela. Toque em Salvar para valer.', 'ok'); }
async function alTeste_(){
  try{ somAlerta_(); }catch(e){}
  try{ const r = await sbRpc_('api_alertas_teste', { p:{} }); showMsg('alCfgMsg', (r && r.message) || 'Não foi possível testar.', r && r.ok ? 'ok' : 'warn'); }
  catch(e){ showMsg('alCfgMsg', 'Não foi possível testar agora.', 'warn'); }
}
alLigar_();
