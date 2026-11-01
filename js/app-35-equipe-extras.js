/* ============================================================
   EQUIPE: EXTRAS (18/10/2026)
   • Escala: "Avisar a equipe" (celular), trocas de turno (pedido → colega aceita → dono aprova), "Pedir troca" e "Bater ponto" em Início → Minha escala.
   • Ponto (Administrador → Loja e equipe → Ponto): horas feitas x escaladas, horas extras (acima de 44 h/semana), lançar e corrigir registros.
   • Equipe e pagamentos: peso da mão de obra nas vendas (6 meses) e reserva estimada de 13º e férias.
   Tudo roda no banco (api_escala_avisar, api_troca_*, api_trocas_lista, api_ponto_*, api_equipe_peso_mao_obra, api_equipe_reserva).
   ============================================================ */

/* ---------- Escala (Admin): avisar equipe + trocas pendentes ---------- */
async function escAvisar(){
  if(!await confirmarTxt_('Mandar agora, no celular, o resumo da semana ' + escDM_(escSemana_) + ' a ' + escDM_(escSomar_(escSemana_, 6)) + ' para cada pessoa que tem acesso ao sistema?', 'Avisar a equipe', false, 'Avisar a equipe')) return;
  try{ const r = await apiCall('escalaAvisar', { inicio: escSemana_ }); showMsg('escMsg', (r && r.message) || 'Não foi possível avisar agora.', r && r.ok ? 'ok' : 'warn'); }
  catch(e){ showMsg('escMsg', 'Não foi possível avisar agora.', 'warn'); }
}
async function escTrocasCarregar_(){
  const box = document.getElementById('escTrocas'); if(!box) return;
  try{
    const r = await apiCall('trocasLista', {}); if(!r || !r.ok){ box.innerHTML = ''; return; }
    const abertas = (r.trocas || []).filter(t => String(t.status).startsWith('Aguardando')), recentes = (r.trocas || []).filter(t => !String(t.status).startsWith('Aguardando')).slice(0, 5);
    if(!abertas.length && !recentes.length){ box.innerHTML = ''; return; }
    const linha = t => escH(t.de) + ' → ' + escH(t.para) + ' · ' + escDM_(t.data) + ' ' + escH(t.inicio + '–' + t.fim) + (t.motivo ? ' · “' + escH(t.motivo) + '”' : '');
    box.innerHTML = '<div class="card" style="margin-top:10px;"><h3 style="margin-top:0;">Trocas de turno</h3>' +
      (abertas.length ? abertas.map(t => '<div class="notif-card"><b>' + (t.status === 'Aguardando colega' ? 'Esperando o colega responder' : 'Esperando a sua aprovação') + '</b><div class="obs-line">' + linha(t) + '</div><div class="btn-row" style="margin-top:6px;"><button type="button" class="small-gold" onclick="escTrocaDecidir(\'' + t.id + '\',true)">Aprovar</button><button type="button" class="ghost small" onclick="escTrocaDecidir(\'' + t.id + '\',false)">Recusar</button></div></div>').join('') : '<div class="notif-empty">Nenhuma troca esperando.</div>') +
      (recentes.length ? '<div class="obs-line" style="margin-top:8px;">Últimos dias: ' + recentes.map(t => escH(t.status) + ' (' + linha(t) + ')').join(' · ') + '</div>' : '') + '</div>';
  }catch(e){ box.innerHTML = ''; }
}
async function escTrocaDecidir(id, aprovar){
  let motivo = '';
  if(!aprovar){ const f = await vsForm({ titulo:'Recusar troca', ok:'Recusar', perigo:true, campos:[{ id:'motivo', rotulo:'Motivo (opcional)', tipo:'texto' }] }); if(!f) return; motivo = f.motivo || ''; }
  try{ const r = await apiCall('trocaDecidir', { id, aprovar, motivo }); showMsg('escMsg', (r && r.message) || 'Não foi possível.', r && r.ok ? 'ok' : 'warn'); if(r && r.ok){ carregarEscala_(); } }
  catch(e){ showMsg('escMsg', 'Não foi possível agora.', 'warn'); }
}
(function(){
  if(typeof carregarEscala_ === 'function'){ const orig = carregarEscala_; carregarEscala_ = async function(){ const r = await orig.apply(this, arguments); try{ escTrocasCarregar_(); }catch(e){} return r; }; }
})();

/* ---------- Início → Minha escala: ponto + trocas ---------- */
var minhaTurnos_ = [];
async function minhaExtrasHtml_(){
  const [e, m, t] = await Promise.all([apiCall('pontoEstado', {}), apiCall('minhaEscala', {}), apiCall('trocasLista', {})]);
    minhaTurnos_ = (m && m.turnos) || [];
    let h = '';
    if(e && e.ok && e.vinculado){
      h += '<div style="margin-top:10px;padding:10px;border:1px solid var(--line);border-radius:10px;"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;"><div><b>Ponto</b><div class="obs-line">' +
        (e.aberto ? 'Entrada às ' + new Date(e.entrada).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }) + ' · trabalhando' : 'Fora do turno') + ' · semana: ' + (Number(e.horasSemana) || 0).toFixed(1).replace('.', ',') + ' h</div></div>' +
        '<button type="button" class="' + (e.aberto ? 'ghost' : 'small-gold') + '" onclick="pontoBater()">' + (e.aberto ? 'Bater saída' : 'Bater entrada') + '</button></div></div>';
    }
    const pend = (t && t.trocas || []).filter(x => String(x.status).startsWith('Aguardando'));
    pend.forEach(x => {
      if(x.euSouColega && x.status === 'Aguardando colega') h += '<div class="notif-card" style="margin-top:8px;"><b>🔁 ' + escH(x.de) + ' pede para você assumir o turno</b><div class="obs-line">' + escDM_(x.data) + ' · ' + escH(x.inicio + '–' + x.fim) + (x.motivo ? ' · “' + escH(x.motivo) + '”' : '') + '</div><div class="btn-row" style="margin-top:6px;"><button type="button" class="small-gold" onclick="trocaResponder(\'' + x.id + '\',\'aceitar\')">Aceitar</button><button type="button" class="ghost small" onclick="trocaResponder(\'' + x.id + '\',\'recusar\')">Recusar</button></div></div>';
      else if(x.euSolicitei) h += '<div class="obs-line" style="margin-top:8px;">🔁 Seu pedido de troca de ' + escDM_(x.data) + ' (' + escH(x.inicio + '–' + x.fim) + ') com ' + escH(x.para) + ': ' + (x.status === 'Aguardando colega' ? 'esperando o colega' : 'esperando o dono aprovar') + ' <button type="button" class="ghost small" onclick="trocaResponder(\'' + x.id + '\',\'cancelar\')">Cancelar pedido</button></div>';
    });
    if(minhaTurnos_.some(x => x.tipo === 'Trabalho' && x.id)) h += '<button type="button" class="ghost small mt-3" onclick="trocaPedir()">Pedir troca de turno</button>';
  return { h, m, e };
}
async function minhaExtrasCarregar_(){
  const ex = document.getElementById('minhaEscalaExtra'), card = document.getElementById('minhaEscalaCard');
  try{ if(typeof prAtualizar_ === 'function') prAtualizar_(); }catch(err){}
  if(!ex || !card || card.style.display === 'none') return;
  try{ const r = await minhaExtrasHtml_(); ex.innerHTML = r.h; }catch(err){ ex.innerHTML = ''; }
}
function pontoPosicao_(){
  return new Promise(res => {
    if(!navigator.geolocation) return res(null);
    let fim = false; const ok = v => { if(!fim){ fim = true; res(v); } };
    setTimeout(() => ok(null), 20000);   // se o celular nunca responder (permissão parada), segue sem localização
    navigator.geolocation.getCurrentPosition(
      pos => ok({ lat: pos.coords.latitude, lng: pos.coords.longitude, precisao: Math.round(pos.coords.accuracy || 0) }),
      () => ok(null), { enableHighAccuracy:true, timeout:15000, maximumAge:0 });
  });
}
async function pontoBater(){
  try{
    avisar('Conferindo sua localização…');
    const pos = await pontoPosicao_();
    const r = await apiCall('pontoBater', pos || {}); avisar((r && r.message) || 'Não foi possível registrar.'); minhaExtrasCarregar_();
  }
  catch(e){ avisar('Não foi possível registrar o ponto agora. Tente de novo.'); }
}
async function pontoLocalDefinir(){
  const f = await vsForm({ titulo:'Local do restaurante', texto:'Faça isto com o celular DENTRO do restaurante e com a localização ligada. O ponto da equipe só será aceito a até esta distância daqui.', ok:'Usar minha posição atual', campos:[{ id:'raio', rotulo:'Distância permitida (metros)', tipo:'texto', valor:'150', sugestoes:['100','150','200','300'] }] });
  if(!f) return;
  const raio = parseInt(f.raio, 10); if(!(raio >= 30 && raio <= 2000)) return avisar('Use um valor entre 30 e 2000 metros.');
  avisar('Pegando a posição…');
  const pos = await pontoPosicao_(); if(!pos) return avisar('Não consegui pegar a localização. Ligue o GPS do celular e permita o acesso do navegador.');
  if(pos.precisao > 150 && !await confirmarTxt_('A precisão do GPS está baixa (cerca de ' + pos.precisao + ' m). Salvar assim mesmo? Melhor ir para perto de uma janela e tentar de novo.', 'Precisão baixa', false, 'Salvar mesmo assim')) return;
  try{ const r = await apiCall('pontoLocal', { lat:pos.lat, lng:pos.lng, raio }); showMsg('pontoMsg', (r && r.message) || 'Não foi possível salvar.', r && r.ok ? 'ok' : 'warn'); carregarPonto_(); }
  catch(e){ showMsg('pontoMsg', 'Não foi possível salvar agora.', 'warn'); }
}
async function pontoLocalDesligar(){
  if(!await confirmarTxt_('Desligar a trava? Qualquer funcionário poderá bater o ponto de qualquer lugar.', 'Desligar trava', true, 'Desligar')) return;
  try{ const r = await apiCall('pontoLocal', { desligar:true }); showMsg('pontoMsg', (r && r.message) || 'Não foi possível.', r && r.ok ? 'ok' : 'warn'); carregarPonto_(); }
  catch(e){ showMsg('pontoMsg', 'Não foi possível agora.', 'warn'); }
}
function pontoDist_(d){ return d == null ? '' : d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : d + ' m'; }
async function trocaPedir(){
  const meus = minhaTurnos_.filter(x => x.tipo === 'Trabalho' && x.id); if(!meus.length) return avisar('Você não tem turno de trabalho nos próximos dias.');
  let colegas = [];
  try{ const r = await apiCall('escalaSemana', {}); colegas = ((r && r.funcionarios) || []).filter(f => f.ativo); }catch(e){}
  if(!colegas.length) return avisar('Não consegui buscar os colegas agora.');
  const f = await vsForm({ titulo:'Pedir troca de turno', texto:'O colega precisa aceitar e o dono aprova. Só então a escala muda.', ok:'Pedir troca', campos:[
    { id:'turno', rotulo:'Qual turno seu', tipo:'escolha', valor:meus[0].id, opcoes: meus.map(x => ({ v:x.id, t: escDM_(x.data) + ' · ' + x.inicio + '–' + x.fim })) },
    { id:'colega', rotulo:'Quem vai assumir', tipo:'escolha', valor:colegas[0].id, opcoes: colegas.map(c => ({ v:c.id, t:c.nome })) },
    { id:'motivo', rotulo:'Motivo (opcional)', tipo:'texto' } ] });
  if(!f) return;
  try{ const r = await apiCall('trocaSolicitar', { turnoId:f.turno, paraFuncionarioId:f.colega, motivo:f.motivo || '' }); avisar((r && r.message) || 'Não foi possível pedir.'); minhaExtrasCarregar_(); }
  catch(e){ avisar('Não foi possível pedir agora.'); }
}
async function trocaResponder(id, acao){
  try{ const r = await apiCall('trocaResponder', { id, acao }); avisar((r && r.message) || 'Não foi possível.'); minhaExtrasCarregar_(); }
  catch(e){ avisar('Não foi possível agora.'); }
}
(function(){
  if(typeof carregarMinhaEscala_ === 'function'){ const orig = carregarMinhaEscala_; carregarMinhaEscala_ = async function(){ const r = await orig.apply(this, arguments); try{ minhaExtrasCarregar_(); }catch(e){} return r; }; }
})();

/* ---------- Ponto (Admin) ---------- */
var pontoIni_ = '', pontoDados_ = null;
function pontoSemana_(){ if(!pontoIni_) pontoIni_ = escISO_(escSegunda_(new Date())); return pontoIni_; }
async function carregarPonto_(){
  const box = document.getElementById('pontoCorpo'); if(!box) return;
  const ini = pontoSemana_(); document.getElementById('pontoNav').innerHTML = '<div class="btn-row" style="align-items:center;"><button type="button" class="ghost small" onclick="pontoIr(-1)" aria-label="Semana anterior">‹</button><b style="flex:1;text-align:center;">' + escDM_(ini) + ' a ' + escDM_(escSomar_(ini, 6)) + '</b><button type="button" class="ghost small" onclick="pontoIr(1)" aria-label="Próxima semana">›</button><button type="button" class="ghost small" onclick="pontoIr(0)">Hoje</button></div>';
  try{
    const r = await apiCall('pontoRelatorio', { inicio: ini, fim: escSomar_(ini, 6) });
    if(!r || !r.ok){ showMsg('pontoMsg', (r && r.message) || 'Não foi possível carregar o ponto.', 'warn'); return; }
    pontoDados_ = r; renderPonto_();
  }catch(e){ showMsg('pontoMsg', 'Não foi possível carregar o ponto agora.', 'warn'); }
}
function pontoIr(n){ pontoIni_ = n === 0 ? escISO_(escSegunda_(new Date())) : escSomar_(pontoSemana_(), 7 * n); carregarPonto_(); }
function pontoH_(n){ return (Number(n) || 0).toFixed(1).replace('.', ',') + ' h'; }
function renderPonto_(){
  const box = document.getElementById('pontoCorpo'), ps = (pontoDados_ && pontoDados_.pessoas) || [];
  if(!ps.length){ box.innerHTML = '<p class="sub">Nenhum funcionário ainda.</p>'; return; }
  const loc = (pontoDados_ && pontoDados_.local) || {};
  const locCard = '<div class="notif-card"><b>📍 Local do ponto</b><div class="obs-line" style="margin-top:4px;">' + (loc.definido ? 'Ligado: o funcionário só bate o ponto a até ' + loc.raio + ' m do restaurante.' : 'Desligado: o ponto pode ser batido de qualquer lugar. Fique no restaurante e toque em "Definir local" para ligar a trava.') + '</div><div class="btn-row" style="margin-top:6px;"><button type="button" class="small-gold" onclick="pontoLocalDefinir()">' + (loc.definido ? 'Redefinir local aqui' : 'Definir local aqui') + '</button>' + (loc.definido ? '<button type="button" class="ghost small" onclick="pontoLocalDesligar()">Desligar trava</button>' : '') + '</div></div>';
  box.innerHTML = locCard + (typeof pontoRostoCard_ === 'function' ? pontoRostoCard_() : '') + ps.map(p => {
    const dif = Number(p.diferenca) || 0, regs = p.registros || [];
    return '<div class="notif-card"><div style="display:flex;justify-content:space-between;gap:8px;"><b>' + escH(p.nome) + '</b><span class="obs-line">' + escH(p.cargo || '') + '</span></div>' +
      '<div style="display:flex;gap:10px;margin-top:6px;flex-wrap:wrap;"><div><div class="obs-line">Feitas</div><b>' + pontoH_(p.horasFeitas) + '</b></div><div><div class="obs-line">Escaladas</div><b>' + pontoH_(p.horasEscaladas) + '</b></div>' +
      '<div><div class="obs-line">Diferença</div><b style="color:' + (dif < -0.5 ? 'var(--red-hi)' : dif > 0.5 ? 'var(--gold)' : 'inherit') + ';">' + (dif > 0 ? '+' : '') + pontoH_(dif) + '</b></div>' +
      '<div><div class="obs-line">Extras (&gt;44 h)</div><b style="color:' + (p.horasExtras > 0 ? 'var(--red-hi)' : 'inherit') + ';">' + pontoH_(p.horasExtras) + '</b></div></div>' +
      (p.aberto ? '<div style="color:var(--red-hi);font-size:var(--fs-xs);margin-top:4px;">⚠ Entrada sem saída registrada</div>' : '') +
      (regs.length ? '<div style="margin-top:6px;">' + regs.map(x => '<div style="padding:4px 0;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:6px;align-items:center;"><span>' + escDM_(x.dia) + ' · ' + escH(x.entrada) + '–' + escH(x.saida || '?') + ' <span class="obs-line">(' + pontoH_(x.horas) + (x.origem === 'dono' ? ' · lançado pelo dono' : '') + ')</span>' + (x.distEntrada != null ? ' <span class="obs-line">📍 ' + pontoDist_(x.distEntrada) + (x.distSaida != null ? ' / ' + pontoDist_(x.distSaida) : '') + '</span>' : '') + (typeof pontoRostoTag_ === 'function' ? pontoRostoTag_(x) : '') + '</span><span>' + (typeof pontoRostoBotoes_ === 'function' ? pontoRostoBotoes_(x) : '') + '<button type="button" class="ghost small" onclick="pontoEditar(\'' + x.id + '\',\'' + p.funcionarioId + '\')">Corrigir</button></span></div>').join('') + '</div>' : '<div class="obs-line" style="margin-top:6px;">Sem registros nessa semana.</div>') +
      '<button type="button" class="ghost small" style="margin-top:6px;" onclick="pontoEditar(null,\'' + p.funcionarioId + '\')">+ Lançar registro</button>' + (p.temRosto ? ' <button type="button" class="ghost small" style="margin-top:6px;" onclick="pontoRostoApagar(\'' + p.funcionarioId + '\')">Apagar rosto</button>' : '') + '</div>';
  }).join('');
}
async function pontoEditar(id, fid){
  const p = ((pontoDados_ && pontoDados_.pessoas) || []).find(x => x.funcionarioId === fid), x = p && (p.registros || []).find(r => r.id === id);
  const f = await vsForm({ titulo: id ? 'Corrigir registro' : 'Lançar registro', texto: p ? p.nome : '', ok:'Salvar', campos:[
    { id:'dia', rotulo:'Dia da entrada', tipo:'data', valor: x ? String(x.dia).slice(0, 10) : escISO_(new Date()), obrigatorio:true },
    { id:'ent', rotulo:'Entrada (HH:MM)', tipo:'texto', valor: x ? x.entrada : '', obrigatorio:true, sugestoes:['08:00','12:00','17:00','18:00'] },
    { id:'sai', rotulo:'Saída (HH:MM, deixe vazio se ainda está trabalhando)', tipo:'texto', valor: x && x.saida ? x.saida : '', sugestoes:['17:00','22:00','23:00','00:00'] },
    { id:'obs', rotulo:'Observação (opcional)', tipo:'texto' } ].concat(id ? [{ id:'cancelar', rotulo:'Cancelar este registro?', tipo:'escolha', valor:'nao', opcoes:[{ v:'nao', t:'Não, só corrigir' }, { v:'sim', t:'Sim, cancelar o registro' }] }] : []) });
  if(!f) return;
  const hh = s => /^([01]?\d|2[0-3]):[0-5]\d$/.test(String(s || '').trim());
  if(f.cancelar !== 'sim'){
    if(!hh(f.ent) || (f.sai && !hh(f.sai))) return avisar('Use o horário no formato HH:MM, por exemplo 18:30.');
  }
  const pad = s => String(s).trim().padStart(5, '0');
  let saida = '';
  if(f.sai){ saida = f.dia + 'T' + pad(f.sai); if(pad(f.sai) <= pad(f.ent)){ const d = escData_(f.dia); d.setDate(d.getDate() + 1); saida = escISO_(d) + 'T' + pad(f.sai); } }
  try{
    const r = await apiCall('pontoAjustar', f.cancelar === 'sim' ? { id, cancelar:true, observacao:f.obs || '' } : { id: id || '', funcionarioId: fid, entrada: f.dia + 'T' + pad(f.ent), saida, observacao: f.obs || '' });
    showMsg('pontoMsg', (r && r.message) || 'Não foi possível salvar.', r && r.ok ? 'ok' : 'warn'); if(r && r.ok) carregarPonto_();
  }catch(e){ showMsg('pontoMsg', 'Não foi possível salvar agora.', 'warn'); }
}

/* ---------- Equipe e pagamentos: peso da mão de obra e reserva de 13º/férias ---------- */
async function eqExtrasCarregar_(){
  const box = document.getElementById('eqExtras'); if(!box || !apiConfigurada()) return;
  try{
    const [p, r] = await Promise.all([apiCall('equipePesoMaoObra', { mes: eqMes_() }), apiCall('equipeReserva', {})]);
    let h = '';
    if(p && p.ok){
      const ms = p.meses || [], max = Math.max(1, ...ms.map(m => Number(m.percentual) || 0));
      h += '<div class="card"><h2>Peso da mão de obra nas vendas</h2><p class="sub">Folha paga (salários e encargos) dividida pelo faturamento do mês (vendas confirmadas e eventos). Referência comum para restaurante: entre 25% e 35%.</p>' +
        ms.map(m => { const pc = m.percentual == null ? null : Number(m.percentual); return '<div style="display:flex;align-items:center;gap:8px;margin:4px 0;"><span style="width:62px;color:var(--muted);">' + escH(String(m.mes).split('-').reverse().join('/')) + '</span><div style="flex:1;height:14px;background:#3a2c1c;border-radius:7px;overflow:hidden;"><div style="width:' + (pc == null ? 0 : Math.max(2, pc / max * 100)) + '%;height:100%;background:' + (pc != null && pc > 35 ? 'var(--red-hi)' : pc != null && pc > 30 ? '#f5902e' : 'var(--ok)') + ';"></div></div><b style="width:54px;text-align:right;">' + (pc == null ? '—' : pc.toFixed(1).replace('.', ',') + '%') + '</b></div><div class="obs-line" style="margin:-2px 0 4px 70px;">Folha ' + formatarMoeda((Number(m.folha) || 0) + (Number(m.encargos) || 0)) + ' · faturamento ' + formatarMoeda(m.faturamento) + '</div>'; }).join('') + '</div>';
    }
    if(r && r.ok){
      h += '<div class="card"><h2>Reserva de 13º e férias</h2><p class="sub">Quanto já deveria estar guardado, por pessoa (estimativa: 13º = salário ÷ 12 por mês trabalhado no ano; férias = salário ÷ 12 × 4/3 por mês desde a admissão, dentro do período de 12 meses). Não lança nada no financeiro. Confirme com seu contador.</p>' +
        '<div class="stat-row"><div class="stat-box"><b>' + formatarMoeda(r.total13) + '</b><span>13º ACUMULADO</span></div><div class="stat-box"><b>' + formatarMoeda(r.totalFerias) + '</b><span>FÉRIAS ACUMULADAS</span></div><div class="stat-box saida"><b>' + formatarMoeda(r.total) + '</b><span>RESERVAR</span></div></div>' +
        ((r.pessoas || []).length ? '<table class="mt-3"><tbody>' + r.pessoas.map(x => '<tr><td><b>' + escH(x.nome) + '</b><div class="obs-line">' + (x.admissao ? 'Admissão ' + escH(fmtDataBR(String(x.admissao).slice(0, 10))) + (x.periodosCompletos >= 1 ? ' · ' + x.periodosCompletos + ' período(s) de 12 meses completo(s): confira férias vencidas' : '') : 'Sem data de admissão (férias não calculadas)') + '</div></td><td style="text-align:right;white-space:nowrap;">13º ' + formatarMoeda(x.decimoTerceiro) + '<br>Férias ' + (x.ferias == null ? '—' : formatarMoeda(x.ferias)) + '</td></tr>').join('') + '</tbody></table>' : '') + '</div>';
    }
    box.innerHTML = h;
  }catch(e){ box.innerHTML = ''; }
}
(function(){
  if(typeof carregarEquipe_ === 'function'){ const orig = carregarEquipe_; carregarEquipe_ = async function(){ const r = await orig.apply(this, arguments); try{ eqExtrasCarregar_(); }catch(e){} return r; }; }
})();
