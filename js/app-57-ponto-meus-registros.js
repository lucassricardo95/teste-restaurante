/* ============================================================
   PONTO — MEUS REGISTROS, CORREÇÃO E ATESTADO (26/10/2026)
   Funcionário: vê as batidas por período (fechamento definido pelo Admin), pede correção e envia atestado.
   Admin: aprova/recusa em Equipe → Ponto (com senha) e muda o dia de fechamento.
   ============================================================ */
var mrRef_ = '', mrDados_ = null;
const MR_SEM_ = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
function mrHM_(min){ min = Math.max(0, Math.round(Number(min) || 0)); const h = Math.floor(min / 60), m = min % 60; return h + 'h ' + String(m).padStart(2, '0') + 'min'; }
function mrDia_(iso){ const d = escData_(iso); return MR_SEM_[d.getDay()] + ', ' + escDM_(iso); }
function mrHoras_(txt){
  const a = String(txt || '').match(/\d{1,2}:\d{2}/g) || [];
  return a.map(x => x.padStart(5, '0'));
}
function mrValidaHoras_(a){ return a.every(x => /^([01]\d|2[0-3]):[0-5]\d$/.test(x)); }

/* ---------- Funcionário ---------- */
async function mrAbrir(){
  let m = document.getElementById('mrModal');
  if(!m){
    m = document.createElement('div'); m.className = 'modal-overlay'; m.id = 'mrModal';
    m.innerHTML = '<div class="modal-box" style="max-width:560px;"><div class="modal-header"><h2>Meus registros</h2><button class="close-btn" onclick="fecharFormModal(\'mrModal\')" aria-label="Fechar">✕</button></div>' +
      '<div class="msg" id="mrMsg"></div><div id="mrCorpo"><p class="sub">Carregando…</p></div></div>';
    document.body.appendChild(m);
  }
  abrirFormModal('mrModal'); mrRef_ = ''; await mrCarregar_();
}
async function mrCarregar_(){
  const box = document.getElementById('mrCorpo'); if(!box) return;
  try{
    const r = await apiCall('pontoMeusRegistros', { ref: mrRef_ });
    if(!r || !r.ok){ box.innerHTML = '<p class="sub">' + escH((r && r.message) || 'Não foi possível carregar seus registros.') + '</p>'; return; }
    if(!r.vinculado){ box.innerHTML = '<p class="sub">Seu usuário não está ligado a um funcionário.</p>'; return; }
    mrDados_ = r; mrRef_ = r.ref; mrRender_();
  }catch(e){ box.innerHTML = '<p class="sub">Não foi possível carregar agora. Tente de novo.</p>'; }
}
function mrIrCompetencia_(ref){ mrRef_ = ref; mrCarregar_(); }
function mrCartaoDia_(d){
  const marcas = d.marcas || [], n = marcas.length, hoje = String(mrDados_.hoje).slice(0, 10), ehHoje = String(d.data).slice(0, 10) === hoje;
  let cor = 'var(--line)', rot = 'Sem batidas';
  if(d.atestado){ cor = '#e0b030'; rot = 'ATESTADO'; }
  else if(n && (n % 2 === 1 || d.aberto)){ if(ehHoje){ cor = 'var(--gold)'; rot = 'Em andamento'; } else { cor = 'var(--red-hi)'; rot = 'Incompleto'; } }
  else if(n){ cor = 'var(--ok)'; rot = ''; }
  const total = n && Number(d.min) > 0 ? mrHM_(d.min) : '';
  return '<div style="display:flex;border:1px solid var(--line);border-radius:10px;margin-top:8px;overflow:hidden;background:var(--card, transparent);">' +
    '<div style="width:5px;background:' + cor + ';flex:none;"></div><div style="padding:9px 11px;flex:1;min-width:0;">' +
    '<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline;"><b>' + escH(mrDia_(d.data)) + '</b>' +
    '<span class="obs-line" style="white-space:nowrap;">' + (d.atestado ? '<b style="color:#e0b030;">ATESTADO</b>' : escH(rot ? rot : total)) + (rot && total && !d.atestado ? ' · ' + escH(total) : '') + '</span></div>' +
    (n ? '<div style="margin-top:3px;font-variant-numeric:tabular-nums;">' + marcas.map(escH).join(' - ') + (d.aberto && !ehHoje ? ' - ?' : '') + '</div>' : '') +
    '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:4px;">' +
    (d.pedido ? '<span class="obs-line">⏳ Pedido em análise</span>' : '<span></span>') +
    (d.atestado ? '' : '<button type="button" class="ghost small" onclick="mrCorrecao(\'' + String(d.data).slice(0, 10) + '\')">Corrigir</button>') + '</div></div></div>';
}
function mrRender_(){
  const r = mrDados_, box = document.getElementById('mrCorpo');
  const sel = '<select id="mrComp" onchange="mrIrCompetencia_(this.value)" style="width:100%;">' + (r.competencias || []).map(c => '<option value="' + c.ref + '"' + (c.ref === r.ref ? ' selected' : '') + '>' + escH(c.nome) + '</option>').join('') + '</select>';
  const peds = (r.pedidos || []);
  const pedHtml = peds.length ? '<h3 style="margin:16px 0 4px;">Meus pedidos</h3>' + peds.slice(0, 10).map(x => {
    const st = x.status === 'aprovado' ? '<span style="color:var(--ok);">✅ Aprovado</span>' : x.status === 'recusado' ? '<span style="color:var(--red-hi);">❌ Recusado</span>' : '<span class="obs-line">⏳ Em análise</span>';
    return '<div style="padding:6px 0;border-top:1px solid var(--line);"><div style="display:flex;justify-content:space-between;gap:8px;"><span>' + (x.tipo === 'atestado' ? '🩺 Atestado' : '🕒 Correção') + ' · ' + escDM_(x.ini) + (String(x.fim) !== String(x.ini) ? ' a ' + escDM_(x.fim) : '') + '</span>' + st + '</div>' +
      (x.resposta ? '<div class="obs-line">' + escH(x.resposta) + '</div>' : '') + '</div>';
  }).join('') : '';
  box.innerHTML = sel + '<div class="obs-line" style="margin-top:6px;">De ' + escDM_(r.ini) + ' a ' + escDM_(r.fim) + ' · fechamento dia ' + r.fechamento + '</div>' +
    '<div class="notif-card" style="margin-top:10px;"><div class="obs-line">Total trabalhado no período</div><b style="font-size:1.25em;">' + mrHM_(r.totalMin) + '</b></div>' +
    '<div class="btn-row" style="margin-top:10px;"><button type="button" class="ghost small" onclick="mrCorrecao()">🕒 Pedir correção</button><button type="button" class="ghost small" onclick="mrAtestado()">🩺 Enviar atestado</button></div>' +
    ((r.dias || []).length ? r.dias.map(mrCartaoDia_).join('') : '<p class="sub" style="margin-top:12px;">Nenhum dia neste período ainda.</p>') + pedHtml;
}
async function mrCorrecao(dia){
  const hoje = String((mrDados_ && mrDados_.hoje) || escISO_(new Date())).slice(0, 10);
  dia = dia || hoje;
  const d = mrDados_ && (mrDados_.dias || []).find(x => String(x.data).slice(0, 10) === dia);
  const f = await vsForm({ titulo:'Pedir correção de ponto', texto:'Informe TODOS os horários certos do dia, na ordem: entrada, saída, entrada, saída… O administrador analisa e aprova.', ok:'Enviar pedido', campos:[
    { id:'data', rotulo:'Dia', tipo:'data', valor: dia },
    { id:'horas', rotulo:'Horários corretos (ex.: 07:53 12:31 13:28 17:08)', tipo:'texto', valor: d && d.marcas ? d.marcas.join(' ') : '', max:80 },
    { id:'motivo', rotulo:'Motivo', tipo:'texto', sugestoes:['Esqueci de bater','Celular sem sinal','Bati errado'] } ] });
  if(!f) return;
  const hs = mrHoras_(f.horas);
  if(!f.data) return avisar('Escolha o dia.');
  if(!hs.length || !mrValidaHoras_(hs)) return avisar('Informe os horários no formato 07:30 (separe por espaço).');
  if(!String(f.motivo || '').trim()) return avisar('Conte o motivo da correção.');
  try{
    const r = await apiCall('pontoPedidoCriar', { tipo:'correcao', data:f.data, batidas:hs, motivo:f.motivo });
    avisar((r && r.message) || 'Não foi possível enviar o pedido.'); if(r && r.ok) mrCarregar_();
  }catch(e){ avisar('Não foi possível enviar o pedido agora. Tente de novo.'); }
}
var mrFoto_ = '';
function mrAtestado(){
  let m = document.getElementById('mrAtModal');
  if(!m){
    m = document.createElement('div'); m.className = 'modal-overlay'; m.id = 'mrAtModal';
    m.innerHTML = '<div class="modal-box" style="max-width:480px;"><div class="modal-header"><h2>Enviar atestado</h2><button class="close-btn" onclick="fecharFormModal(\'mrAtModal\')" aria-label="Fechar">✕</button></div>' +
      '<p class="sub">Informe os dias de afastamento e tire (ou escolha) uma foto do atestado. O administrador analisa; a foto fica guardada no Google Drive e é apagada sozinha após 90 dias.</p>' +
      '<label for="mrAtIni">Primeiro dia</label><input type="date" id="mrAtIni">' +
      '<label for="mrAtFim">Último dia</label><input type="date" id="mrAtFim">' +
      '<label for="mrAtFoto">Foto do atestado</label><input type="file" id="mrAtFoto" accept="image/*" onchange="mrAtFotoLida_(this)">' +
      '<img id="mrAtPrev" alt="" style="display:none;max-width:100%;max-height:220px;margin-top:8px;border-radius:8px;">' +
      '<label for="mrAtObs">Observação (opcional)</label><input type="text" id="mrAtObs" maxlength="200">' +
      '<div class="msg" id="mrAtMsg"></div>' +
      '<div class="btn-row" style="margin-top:12px;"><button type="button" class="primary" id="mrAtEnviar" onclick="mrAtestadoEnviar_()">Enviar atestado</button><button type="button" class="ghost" onclick="fecharFormModal(\'mrAtModal\')">Voltar</button></div></div>';
    document.body.appendChild(m);
  }
  const h = escISO_(new Date());
  document.getElementById('mrAtIni').value = h; document.getElementById('mrAtFim').value = h; document.getElementById('mrAtObs').value = '';
  document.getElementById('mrAtFoto').value = ''; document.getElementById('mrAtPrev').style.display = 'none'; mrFoto_ = '';
  document.getElementById('mrAtMsg').className = 'msg';
  abrirFormModal('mrAtModal');
}
async function mrAtFotoLida_(inp){
  mrFoto_ = ''; const f = inp.files && inp.files[0]; if(!f) return;
  try{
    const c = await comprimirImagem(f, 1400, 0.72);
    mrFoto_ = String(c.base64).split(',').pop();
    const pv = document.getElementById('mrAtPrev'); pv.src = c.base64; pv.style.display = '';
  }catch(e){ showMsg('mrAtMsg', 'Não foi possível ler essa foto. Tente outra.', 'warn'); }
}
async function mrAtestadoEnviar_(){
  const ini = document.getElementById('mrAtIni').value, fim = document.getElementById('mrAtFim').value || ini;
  if(!ini) return showMsg('mrAtMsg', 'Informe o primeiro dia.', 'warn');
  if(fim < ini) return showMsg('mrAtMsg', 'O último dia precisa ser igual ou depois do primeiro.', 'warn');
  if(!mrFoto_) return showMsg('mrAtMsg', 'Tire ou escolha a foto do atestado.', 'warn');
  const bt = document.getElementById('mrAtEnviar'); bt.disabled = true;
  try{
    const r = await sb410Edge_('ponto-foto', { acao:'atestado', dataIni:ini, dataFim:fim, base64Data:mrFoto_, motivo:document.getElementById('mrAtObs').value }, 90000);
    showMsg('mrAtMsg', (r && r.message) || 'Não foi possível enviar o atestado.', r && r.ok ? 'ok' : 'warn');
    if(r && r.ok){ setTimeout(() => { fecharFormModal('mrAtModal'); mrCarregar_(); }, 900); }
  }catch(e){ showMsg('mrAtMsg', 'Não foi possível enviar agora. Confira a internet e tente de novo.', 'warn'); }
  bt.disabled = false;
}

/* ---------- Admin (Equipe → Ponto) ---------- */
var mrAdm_ = null;
async function mrAdminCarregar_(){
  const box = document.getElementById('mrAdminBox'); if(!box) return;
  try{
    const [l, f] = await Promise.all([apiCall('pontoPedidosLista', {}), apiCall('pontoFechamento', {})]);
    if(!l || !l.ok){ box.innerHTML = '<div class="notif-card"><b>🕒 Pedidos dos funcionários</b><div class="obs-line">' + escH((l && l.message) || 'Não foi possível carregar os pedidos.') + '</div></div>'; return; }
    mrAdm_ = l;
    const ps = l.pedidos || [], pend = ps.filter(x => x.status === 'pendente'), dec = ps.filter(x => x.status !== 'pendente').slice(0, 6);
    const dia = f && f.ok ? f.dia : '?';
    box.innerHTML = '<div class="notif-card"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;"><div><b>📅 Fechamento do ponto</b><div class="obs-line">Todo dia ' + escH(dia) + ' o período fecha. Cada mês vai do dia seguinte ao fechamento até o fechamento do mês seguinte.</div></div>' +
      '<button type="button" class="ghost small" onclick="mrFechamentoAlterar(' + (Number(dia) || 20) + ')">Alterar</button></div></div>' +
      '<div class="notif-card"><b>🕒 Pedidos dos funcionários' + (pend.length ? ' (' + pend.length + ')' : '') + '</b>' +
      (pend.length ? pend.map(mrPedidoAdminHtml_).join('') : '<div class="obs-line" style="margin-top:4px;">Nenhum pedido aguardando.</div>') +
      (dec.length ? '<div class="obs-line" style="margin-top:10px;">Últimos respondidos</div>' + dec.map(x => '<div style="padding:4px 0;border-top:1px solid var(--line);font-size:var(--fs-xs);">' + (x.status === 'aprovado' ? '✅' : '❌') + ' ' + escH(x.funcionario) + ' · ' + (x.tipo === 'atestado' ? 'atestado' : 'correção') + ' ' + escDM_(x.ini) + (String(x.fim) !== String(x.ini) ? ' a ' + escDM_(x.fim) : '') + '</div>').join('') : '') + '</div>';
  }catch(e){ box.innerHTML = '<div class="notif-card"><b>🕒 Pedidos dos funcionários</b><div class="obs-line">Não foi possível carregar agora.</div></div>'; }
}
function mrPedidoAdminHtml_(x){
  const per = escDM_(x.ini) + (String(x.fim) !== String(x.ini) ? ' a ' + escDM_(x.fim) : '');
  let det = '';
  if(x.tipo === 'correcao'){
    det = '<div class="obs-line">Hoje no sistema: <b>' + ((x.atuais || []).length ? x.atuais.map(escH).join(' - ') : 'sem batidas') + '</b></div><div class="obs-line">Pedido: <b>' + (x.batidas || []).map(escH).join(' - ') + '</b></div>';
  } else if(x.temFoto){
    det = '<button type="button" class="ghost small" style="margin-top:4px;" onclick="mrVerFoto(\'' + x.id + '\')">📷 Ver foto do atestado</button>';
  } else det = '<div class="obs-line">Foto não disponível.</div>';
  return '<div style="padding:8px 0;border-top:1px solid var(--line);margin-top:6px;"><div><b>' + escH(x.funcionario) + '</b> · ' + (x.tipo === 'atestado' ? '🩺 Atestado' : '🕒 Correção') + ' · ' + per + '</div>' + det +
    (x.motivo ? '<div class="obs-line">Motivo: ' + escH(x.motivo) + '</div>' : '') +
    '<div class="btn-row" style="margin-top:6px;"><button type="button" class="small-gold" onclick="mrDecidir(\'' + x.id + '\',true)">Aprovar</button><button type="button" class="ghost small" onclick="mrDecidir(\'' + x.id + '\',false)">Recusar</button></div></div>';
}
async function mrVerFoto(id){
  try{
    const r = await sb410Edge_('ponto-foto', { acao:'verAtestado', id }, 60000);
    if(!r || !r.ok) return avisar((r && r.message) || 'Não foi possível abrir a foto.');
    let m = document.getElementById('mrFotoModal');
    if(!m){
      m = document.createElement('div'); m.className = 'modal-overlay'; m.id = 'mrFotoModal';
      m.innerHTML = '<div class="modal-box" style="max-width:640px;"><div class="modal-header"><h2>Atestado</h2><button class="close-btn" onclick="fecharFormModal(\'mrFotoModal\')" aria-label="Fechar">✕</button></div><img id="mrFotoImg" alt="Foto do atestado" style="width:100%;border-radius:8px;"></div>';
      document.body.appendChild(m);
    }
    document.getElementById('mrFotoImg').src = 'data:' + (r.tipo || 'image/jpeg') + ';base64,' + r.base64; abrirFormModal('mrFotoModal');
  }catch(e){ avisar('Não foi possível abrir a foto agora.'); }
}
async function mrDecidir(id, aprovar){
  let resposta = '';
  if(!aprovar){
    const f = await vsForm({ titulo:'Recusar pedido', texto:'O funcionário recebe um aviso. Se quiser, conte o motivo.', ok:'Continuar', campos:[{ id:'resposta', rotulo:'Motivo (opcional)', tipo:'texto' }] });
    if(!f) return; resposta = f.resposta || '';
  }
  const senha = await pedirSenha_(); if(!senha) return;
  try{
    const r = await apiCall('pontoPedidoDecidir', { id, aprovar, senha, resposta });
    avisar((r && r.message) || 'Não foi possível salvar a decisão.'); if(r && r.ok){ mrAdminCarregar_(); try{ carregarPonto_(); }catch(e){} }
  }catch(e){ avisar('Não foi possível salvar agora. Tente de novo.'); }
}
async function mrFechamentoAlterar(atual){
  const f = await vsForm({ titulo:'Dia de fechamento do ponto', texto:'Se o dia for 20, o mês de Outubro vai de 21/10 a 20/11. Use um dia de 1 a 28.', ok:'Continuar', campos:[{ id:'dia', rotulo:'Dia do fechamento', tipo:'numero', valor: atual }] });
  if(!f) return;
  const dia = parseInt(f.dia, 10); if(!(dia >= 1 && dia <= 28)) return avisar('Use um dia de 1 a 28.');
  const senha = await pedirSenha_(); if(!senha) return;
  try{
    const r = await apiCall('pontoFechamentoSalvar', { dia, senha });
    avisar((r && r.message) || 'Não foi possível salvar.'); if(r && r.ok) mrAdminCarregar_();
  }catch(e){ avisar('Não foi possível salvar agora. Tente de novo.'); }
}
(function(){
  if(typeof renderPonto_ === 'function'){
    const orig = renderPonto_;
    renderPonto_ = function(){
      const r = orig.apply(this, arguments);
      try{ const box = document.getElementById('pontoCorpo'); if(box){ box.insertAdjacentHTML('afterbegin', '<div id="mrAdminBox"></div>'); mrAdminCarregar_(); } }catch(e){}
      return r;
    };
  }
})();
