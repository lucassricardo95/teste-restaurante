
/* ---------- base ---------- */
async function sb410Token_(){
  let s = sbSessaoLer_(); if(!s) throw new SbSessaoExpirada_();
  if(Date.now() > s.expira){ if(!(await sbRenovar_())) throw new SbSessaoExpirada_(); s = sbSessaoLer_(); }
  return s.access_token;
}
async function sb410Rpc_(fn){
  const t = await sb410Token_();
  const r = await sbJson_(SUPABASE_URL_+'/rest/v1/rpc/'+fn, { method:'POST', headers:{ apikey:SUPABASE_CHAVE_, Authorization:'Bearer '+t, 'Content-Type':'application/json' }, body:'{}' }, 20000, 1);
  return await r.json();
}
async function sb410Edge_(nome, corpo, ms){
  const t = await sb410Token_();
  const r = await sbJson_(SUPABASE_URL_+'/functions/v1/'+nome, { method:'POST', headers:{ Authorization:'Bearer '+t, 'Content-Type':'application/json' }, body: JSON.stringify(corpo||{}) }, ms||60000);
  return await r.json().catch(()=>({ ok:false, message:'Resposta inválida do servidor.' }));
}
const sb410Fmt_ = iso => iso ? new Date(iso).toLocaleString('pt-BR') : '—';
const sb410Admin_ = () => !!currentUser && currentUser.nivel === 'Admin';
const sb410Gestor_ = () => !!currentUser && (currentUser.nivel === 'Admin' || currentUser.nivel === 'Operador');

/* ---------- cartões (criados uma vez; ficam na tela única Backup e espaço) ---------- */
function sb410Montar_(){
  const aba = document.getElementById('tab-integridade');
  if(!aba || !USAR_SUPABASE_ || document.getElementById('sb410Bk')) return;
  aba.insertAdjacentHTML('beforeend', `
  <div class="card" id="sb410Bk"><h2>💾 Backup do Supabase</h2>
    <div id="sb410BkResumo" class="fs-sm">Carregando…</div>
    <div class="btnrow mt-2"><button class="small-gold" style="flex:1 1 45%;" onclick="sb410BkAgora()">Fazer backup agora</button><button class="ghost" style="flex:1 1 45%;" id="sb410BkMaisBtn" onclick="sb410BkMais_()">Ver backups e configurar</button></div>
    <div id="sb410BkMais" style="display:none;margin-top:10px;">
      <div style="border:1px solid #3a2c1c;border-radius:10px;padding:10px;margin-bottom:10px;">
        <label style="display:flex;gap:8px;align-items:center;font-weight:600;"><input type="checkbox" id="sb410BkAuto" class="largura-auto"> Backup automático diário</label>
        <div class="obs-line" id="sb410BkAutoSt" style="margin:4px 0 8px;"></div>
        <div class="row2"><div><label for="sb410BkHora">Horário (Brasília)</label><select id="sb410BkHora" style="width:100%;"></select></div>
        <div><label for="sb410BkRet">Guardar por</label><select id="sb410BkRet" style="width:100%;"><option value="3">3 dias</option><option value="7">7 dias</option><option value="14">14 dias</option><option value="30">30 dias</option></select></div></div>
        <button class="small-gold" style="width:100%;padding:10px;margin-top:8px;" onclick="sb410BkCfgSalvar()">Salvar configuração</button>
        <div class="msg" id="sb410BkCfgMsg"></div>
        <div class="obs-line">Backups manuais e os de antes de uma restauração nunca são apagados sozinhos.</div>
      </div>
      <div id="sb410BkBox">Carregando…</div>
    </div></div>
  <div id="sb410Esp"><h3 style="font-size:16px;margin:10px 0 4px;">🗄️ Plano do Supabase e arquivamento</h3><div id="sb410EspBox">Carregando…</div></div>`);
  // Ordem: Uso do espaço, Backup, Cópias de segurança e, por último, Avançado (recolhido)
  const cop = document.getElementById('bkCopias'), bk = document.getElementById('sb410Bk');
  if(bk && cop && cop.parentNode === aba) aba.insertBefore(bk, cop);
  { const e = document.getElementById('sb410Esp'), d = document.getElementById('bkAvancadoEsp'); if(e && d) d.appendChild(e); }
}
function sb410BkMais_(){
  const m = document.getElementById('sb410BkMais'), b = document.getElementById('sb410BkMaisBtn'); if(!m) return;
  const abrir = m.style.display === 'none'; m.style.display = abrir ? '' : 'none';
  if(b) b.textContent = abrir ? 'Fechar backups' : 'Ver backups e configurar';
}
/* Uma linha: último backup (e se falhou) + como está o automático. Erro sempre em vermelho. */
let _sb410BkUlt_ = null;
function sb410BkResumo_(){
  const r = document.getElementById('sb410BkResumo'); if(!r) return;
  const l = _sb410BkUlt_; if(!l){ return; }
  const ok = l.find(b=>b.status==='Sucesso'), ult = l[0];
  const a = document.getElementById('sb410BkAuto'), h = document.getElementById('sb410BkHora'), rt = document.getElementById('sb410BkRet');
  const auto = a && a.checked ? 'automático às ' + String(Number(h && h.value)||0).padStart(2,'0') + ':00, guarda ' + ((rt && rt.value) || '7') + ' dias' : '⚠️ automático DESLIGADO';
  let t;
  if(!ult) t = '<span style="color:#ffb3ab;">⚠️ Nenhum backup ainda. Toque em "Fazer backup agora".</span>';
  else if(ult.status === 'Erro') t = '<span style="color:#ffb3ab;">⚠️ O último backup falhou (' + sb410Fmt_(ult.data_hora) + ')' + (ult.erro ? ': ' + escH(String(ult.erro).slice(0,120)) : '') + '.</span>' + (ok ? ' Último que deu certo: ' + sb410Fmt_(ok.data_hora) + '.' : '');
  else if(ult.status === 'Em andamento') t = '⏳ Backup em andamento (' + sb410Fmt_(ult.data_hora) + ').';
  else t = '✅ Último backup: <b>' + sb410Fmt_(ult.data_hora) + '</b> (' + escH(String(ult.tipo||'').toLowerCase()) + ')' + (ult.copia_drive_em ? ' · ☁️ cópia no Drive' : ' · <span style="color:#ffb3ab;">⚠️ sem cópia no Drive</span>');
  r.innerHTML = t + '<div class="obs-line fs-xs">' + auto + '</div>';
}
function sb410Carregar_(){
  sb410Montar_();
  try{ if(typeof window.driveDiretoCarregar_ === 'function') window.driveDiretoCarregar_(); }catch(e){}
  try{ const s = document.getElementById('tab-integridade'); if(s && s.classList.contains('active')) contAbrirTela_(); }catch(e){}
  try{ // no servidor novo os cartões antigos (planilha) não têm dados: ficam escondidos, os sb410* fazem o papel deles
    const velhos = ['Backup','Histórico e restauração','Conferência de integridade'];
    document.querySelectorAll('#tab-integridade > .card').forEach(c=>{
      if(c.id && c.id.indexOf('sb410') === 0) return;
      const h = c.querySelector('h2'); if(h && velhos.indexOf(h.textContent.trim()) !== -1) c.style.display = 'none';
    });
  }catch(e){}
  if(!sb410Gestor_()) return;
  sb410SyncStatus();
  const adm = sb410Admin_();
  ['sb410Bk','sb410Esp','bkSituacao','bkAvancado'].forEach(id=>{ const e=document.getElementById(id); if(e) e.style.display = adm ? '' : 'none'; });
  if(adm){ sb410VerificarAlertaBackup_(); sb410BkLista(); sb410BkCfgCarregar(); sb410Espaco(); }
}

/* ---------- Etapa 4: sincronização ---------- */
async function sb410SyncStatus(){
  const box = document.getElementById('sb410SyncBox'); if(!box) return;
  try{
    const j = await sb410Rpc_('api_sync_status');
    if(!j || !j.ok){ box.textContent = 'Sem dados.'; return; }
    const horas = j.principal_ultimo_ok ? Math.round((Date.now()-new Date(j.principal_ultimo_ok).getTime())/3600000) : null;
    const travada = j.pendentes_principal > (j.alerta_itens||500) || (j.pendentes_principal>0 && (horas===null || horas > (j.alerta_horas||6)));
    const erroAgora = j.principal_ultimo_erro && (!j.principal_ultimo_ok || new Date(j.principal_ultimo_erro) > new Date(j.principal_ultimo_ok));
    box.innerHTML = (j.erros_principal > 0 || erroAgora || travada ? '<span style="color:#ffb3ab;">⚠️ ' : '🟢 ')
      + j.pendentes_principal + ' pendente(s) · ' + j.erros_principal + ' com erro · último envio ' + sb410Fmt_(j.principal_ultimo_ok)
      + (erroAgora ? ' · com erro agora: ' + escH(j.principal_ultimo_erro_msg||'sem detalhe') : '')
      + (travada ? ' · fila parada: confira o acesso às planilhas e a cota do Apps Script' : '')
      + (j.erros_principal > 0 || erroAgora || travada ? '</span>' : '');
  }catch(e){ box.textContent = 'Não foi possível carregar.'; }
}
async function sb410SyncAgora(){
  const box = document.getElementById('sb410SyncBox'); if(box) box.textContent = 'Sincronizando…';
  try{ const j = await sb410Edge_('sync-fila', {}, 90000); if(!j.ok) avisar('Falha: '+(j.message||'erro')); }catch(e){ avisar('Sem conexão.'); }
  sb410SyncStatus();
}

/* ---------- Etapa 7: backup e espaço ---------- */
async function sb410BkLista(){
  const box = document.getElementById('sb410BkBox'); if(!box) return;
  try{
    const l = await sbSelecionar_('backups','order=data_hora.desc&limit=10',true);
    _sb410BkUlt_ = l; sb410BkResumo_();
    box.innerHTML = l.length ? l.map(b=>`<div style="margin:6px 0;"><b>${sb410Fmt_(b.data_hora)}</b> · ${escH(b.tipo)} · <span class="badge ${b.status==='Sucesso'?'done':(b.status==='Erro'?'baixo':'pend')}">${escH(b.status)}</span>
      ${b.tamanho_bytes?`<span class="obs-line">${Math.round(b.tamanho_bytes/1024)} KB${b.erro?' · '+escH(b.erro):''}${b.status==='Sucesso'?(b.copia_drive_em?' · ☁️ cópia no Drive':(b.copia_drive_erro?' · ⚠️ sem cópia no Drive: '+escH(b.copia_drive_erro):' · sem cópia no Drive')):''}</span>`:(b.erro?`<span class="obs-line">${escH(b.erro)}</span>`:'')}
      ${b.status==='Sucesso'?`<button class="ghost" style="margin-top:4px;padding:4px 10px;font-size:12px;" onclick="sb410BkRestaurar('${escH(b.id)}')">Restaurar</button>`:''}
      ${b.status==='Sucesso'&&!b.copia_drive_em?`<button class="ghost" style="margin-top:4px;padding:4px 10px;font-size:12px;" onclick="sb410BkReenviarDrive('${escH(b.id)}')">Enviar ao Drive</button>`:''}
      ${b.status!=='Em andamento'?`<button class="ghost" style="margin-top:4px;padding:4px 10px;font-size:12px;color:#e0443a;border-color:#e0443a;" onclick="sb410BkExcluir('${escH(b.id)}')">Excluir</button>`:''}</div>`).join('')
      : '<span class="obs-line">Nenhum backup ainda.</span>';
  }catch(e){ box.textContent = 'Não foi possível carregar.'; const rs = document.getElementById('sb410BkResumo'); if(rs) rs.innerHTML = '<span style="color:#ffb3ab;">⚠️ Não foi possível ler os backups agora (sem conexão?).</span>'; }
}
/* ALERTA DE BACKUP (só Admin). Substitui o alerta antigo, que dependia do módulo removido.
   Avisa em Notificações → Sistema quando: o último backup deu erro; ou não há backup com sucesso dentro do prazo
   (30 h com o automático ligado — ele é diário —, 72 h com ele desligado). Também marca a aba Administrador. */
let _bkAlertaTimer_ = null;
async function sb410VerificarAlertaBackup_(){
  try{
    if(!currentUser || currentUser.nivel !== 'Admin' || currentUser.emergencia) return;
    const l = await sbSelecionar_('backups','select=data_hora,tipo,status,erro&order=data_hora.desc&limit=10',true);
    let auto = true;
    try{ const c = await sbSelecionar_('sistema','chave=eq.BACKUP_AUTO_ATIVO',true); auto = !c.length || c[0].valor === true; }catch(e){}
    const ok = l.find(b=>b.status==='Sucesso'), ult = l[0];
    const limiteH = auto ? 30 : 72;
    let msg = '';
    if(!ok) msg = 'Nenhum backup com sucesso foi encontrado. Faça um em Administrador → Sistema → Backup e espaço.';
    else if(ult && ult.status === 'Erro') msg = 'O último backup falhou em ' + sb410Fmt_(ult.data_hora) + (ult.erro ? ' (' + String(ult.erro).slice(0,120) + ')' : '') + '. Último com sucesso: ' + sb410Fmt_(ok.data_hora) + '.';
    else if(Date.now() - Date.parse(ok.data_hora) > limiteH*3600*1000) msg = 'Faz mais de ' + limiteH + ' horas sem backup com sucesso (último: ' + sb410Fmt_(ok.data_hora) + '). Confira em Administrador → Sistema → Backup e espaço.';
    sistemaAlertas_.backup = msg;
    if(msg) marcarAlertaAdmin_(true);
    renderNotificacoes();
  }catch(e){ /* sem conexão: não alarma, tenta de novo na próxima */ }
}
function sb410IniciarAlertaBackup_(){
  if(_bkAlertaTimer_) return;
  setTimeout(sb410VerificarAlertaBackup_, 6000);
  _bkAlertaTimer_ = setInterval(sb410VerificarAlertaBackup_, 30*60*1000);
}
async function sb410BkCfgCarregar(){
  const h = document.getElementById('sb410BkHora');
  if(h && !h.options.length) for(let i=0;i<24;i++) h.insertAdjacentHTML('beforeend','<option value="'+i+'">'+String(i).padStart(2,'0')+':00</option>');
  try{
    const c = await sbSelecionar_('sistema','chave=in.(BACKUP_AUTO_ATIVO,BACKUP_HORA)',true);
    const v = k => (c.find(x=>x.chave===k)||{}).valor;
    const bc = await sbSelecionar_('backup_config','id=eq.true',true);
    const on = v('BACKUP_AUTO_ATIVO') === true;
    const a = document.getElementById('sb410BkAuto'), r = document.getElementById('sb410BkRet'), st = document.getElementById('sb410BkAutoSt');
    if(a) a.checked = on;
    if(h) h.value = String(v('BACKUP_HORA') ?? 4);
    if(r && bc[0]){ const d = String(bc[0].auto_retencao_dias); if(!Array.from(r.options).some(o => o.value === d)){ const o = document.createElement('option'); o.value = d; o.textContent = d + ' dias'; r.appendChild(o); } r.value = d; }
    if(st) st.textContent = on ? 'Ligado: um backup por dia no horário escolhido.' : '⚠️ Desligado: nenhum backup é feito sozinho. Só os manuais.';
    sb410BkResumo_();
  }catch(e){}
}
async function sb410BkCfgSalvar(){
  const on = !!document.getElementById('sb410BkAuto').checked, hora = Number(document.getElementById('sb410BkHora').value), ret = Number(document.getElementById('sb410BkRet').value);
  const m = document.getElementById('sb410BkCfgMsg'); if(m) m.textContent = 'Salvando…';
  try{
    const t = await sb410Token_();
    const H = { apikey:SUPABASE_CHAVE_, Authorization:'Bearer '+t, 'Content-Type':'application/json', Prefer:'return=minimal' };
    const pat = (url, corpo) => sbJson_(SUPABASE_URL_+'/rest/v1/'+url, { method:'PATCH', headers:H, body:JSON.stringify(corpo) });
    await pat('sistema?chave=eq.BACKUP_AUTO_ATIVO', { valor:on });
    await pat('sistema?chave=eq.BACKUP_HORA', { valor:hora });
    await pat('sistema?chave=eq.BACKUP_FREQ', { valor:'diario' });
    await pat('backup_config?id=eq.true', { auto_retencao_dias:ret });
    if(m) m.textContent = 'Configuração salva.';
    sb410BkCfgCarregar();
  }catch(e){ if(m) m.textContent = 'Não foi possível salvar agora.'; }
}
let _sb410BkOcupado_ = false;
async function sb410BkAgora(){
  if(_sb410BkOcupado_) return; _sb410BkOcupado_ = true;
  const box = document.getElementById('sb410BkBox'); if(box) box.insertAdjacentHTML('afterbegin', '<div class="obs-line" id="sb410BkFazendo">Fazendo backup… pode levar alguns segundos.</div>');
  const rs = document.getElementById('sb410BkResumo'); if(rs) rs.innerHTML = '⏳ Fazendo backup… pode levar alguns segundos.';
  try{ const j = await sb410Edge_('criar-backup', { tipo:'Manual' }, 120000);
    avisar(j.ok ? 'Backup feito ('+Math.round((j.tamanho||0)/1024)+' KB).' + (j.drive ? ' Cópia no Drive: ok.' : ' ATENÇÃO: a cópia no Drive não foi feita' + (j.driveErro ? ' ('+j.driveErro+')' : '') + '.') : 'Erro: '+(j.message||'falha')); }catch(e){ avisar('Sem conexão.'); }
  _sb410BkOcupado_ = false; sb410BkLista(); setTimeout(sb410VerificarAlertaBackup_, 1500);
}
/* Restaurar e excluir backup: pedem a senha do Administrador no pop-up (confere na hora) e o servidor confere de novo. */
async function sb410BkRestaurar(id){
  if(!await confirmarTxt_('Restaurar este backup? Os dados atuais serão substituídos (usuários, auditoria e backups são preservados). Um backup de segurança é feito antes.')) return;
  abrirModalSenhaAdmin(async function(senha){
    try{ const j = await sb410Edge_('restaurar-backup', { backupId:id, senhaAdmin:senha }, 240000);
      await confirmar({ titulo: j.ok ? 'Backup restaurado' : 'Não foi possível restaurar', texto: j.message || (j.ok?'Restaurado.':'Erro.'), ok: j.ok ? 'Recarregar o sistema' : 'Entendi', somenteOk:true, perigo:false }); if(j.ok) location.reload(); }catch(e){ avisar('Sem conexão. Confira o estado antes de repetir.'); }
  });
}
async function sb410BkExcluir(id){
  if(!await confirmarTxt_('Excluir este backup? O arquivo no Supabase será apagado e não dá para desfazer. A cópia que já está no Google Drive não é apagada.')) return;
  abrirModalSenhaAdmin(async function(senha){
    try{ const j = await sb410Edge_('excluir-backup', { backupId:id, senhaAdmin:senha }, 60000);
      avisar(j.message || (j.ok?'Backup excluído.':'Erro.')); }catch(e){ avisar('Sem conexão. Tente de novo.'); }
    sb410BkLista(); setTimeout(sb410VerificarAlertaBackup_, 1500);
  });
}
async function sb410BkReenviarDrive(id){
  const box = document.getElementById('sb410BkBox'); if(box) box.insertAdjacentHTML('afterbegin', '<div class="obs-line">Enviando ao Drive… pode levar até 2 minutos.</div>');
  try{ const j = await sb410Edge_('criar-backup', { reenviarDrive:id }, 170000);
    avisar(j.ok ? 'Cópia enviada ao Drive.' : 'Não foi possível enviar ao Drive: ' + (j.message || 'falha')); }catch(e){ avisar('Sem conexão. Tente de novo.'); }
  sb410BkLista();
}
async function sb410Espaco(){
  const box = document.getElementById('sb410EspBox'); if(!box) return;
  try{
    const j = await sb410Rpc_('api_espaco_uso');
    if(!j || !j.ok){ box.textContent = '—'; return; }
    const cor = j.percentual > 90 ? '#e0443a' : j.percentual > 70 ? '#f5902e' : '#4cc35f';
    box.innerHTML = `<span class="obs-line" id="sb410ArqTexto">Vendas com mais de 90 dias vão para a planilha (abas Arquivo_*) e saem do Supabase, todo dia de madrugada. Eles continuam acessíveis no sistema (histórico do cliente, relatórios e Histórico de vendas). Pedidos com chat, ocorrência ou nota fiscal ficam no sistema.</span>
      <div style="margin-top:10px;border-top:1px solid #3a2c1c;padding-top:10px;">
        <label for="sb410Plano">Tamanho do banco do seu plano do Supabase (o sistema calcula a porcentagem e a proteção em cima disso)</label>
        <select id="sb410Plano" onchange="sb410PlanoMudou()" style="width:100%;margin:6px 0;"><option value="500">Grátis (500 MB)</option><option value="8192">Pro (8 GB)</option><option value="outro">Outro tamanho…</option></select>
        <div id="sb410PlanoOutro" style="display:none;"><input type="number" id="sb410PlanoMb" min="100" step="1" placeholder="Tamanho em MB (ex.: 16384 para 16 GB)" style="width:100%;margin-bottom:6px;"></div>
        <button class="ghost" style="width:100%;padding:10px;margin-bottom:4px;" onclick="sb410PlanoSalvar()">Salvar tamanho do plano</button>
        <span class="obs-line">Se você pagar o Supabase ou aumentar o disco, atualize aqui (confira o número no painel do Supabase, em Settings → Compute and Disk). Se esquecer, o sistema só fica mais cauteloso: avisa e arquiva mais cedo do que precisava.</span>
        <div class="msg" id="sb410PlanoMsg"></div>
      </div>
      <div style="margin-top:10px;border-top:1px solid #3a2c1c;padding-top:10px;">
        <label for="sb410ArqModo">Arquivamento por idade</label>
        <select id="sb410ArqModo" onchange="sb410ArqModoSalvar(this.value)" style="width:100%;margin:6px 0;"><option value="auto">Automático: todo dia de madrugada</option><option value="manual">Só manual: o sistema não arquiva sozinho (eu mando pela planilha quando quiser)</option></select>
        <label for="sb410ArqDias">Mandar para a planilha o que tem mais de (dias; mínimo 30)</label>
        <input type="number" id="sb410ArqDias" min="30" step="1" value="90" onchange="sb410ArqSalvarRegra(this.value)" style="width:100%;margin:6px 0;">
        <button class="ghost" style="width:100%;padding:10px;margin-bottom:6px;" onclick="sb410SimularArquivo()">Simular (só mostra quantos sairiam, não move nada)</button>
        <button class="small-gold" style="width:100%;padding:10px;" onclick="sb410ArquivarAgora()">Mandar para a planilha agora</button>
        <div class="msg" id="sb410ArqMsg"></div>
      </div>
      <div style="margin-top:10px;border-top:1px solid #3a2c1c;padding-top:10px;">
        <b>Proteção de espaço (sempre ligada)</b>
        <span class="obs-line">Mesmo com o arquivamento por idade em "Só manual", quando o banco chegar a 95% do tamanho do plano o sistema manda para a planilha, aos poucos (até 1.000 vendas por hora), as vendas e caixas já encerrados, do mais antigo para o mais novo, e devolve o espaço ao Supabase minutos depois. Só apaga do Supabase o que a planilha confirmou. Pedido em andamento e caixa aberto nunca saem. Isso não pode ser desligado: é o que impede o sistema de parar por falta de espaço. Aos 70% e aos 85% você recebe aviso.</span>
      </div>`;
    sb410ArqCarregarRegra_(); sb410PlanoCarregar_(j.limite_mb);
  }catch(e){ box.textContent = '—'; }
}
function sb410ArqTexto_(d, auto){ const t = document.getElementById('sb410ArqTexto'); if(t) t.textContent = 'Vendas com mais de ' + d + ' dias ' + (auto === false ? 'só vão para a planilha quando você mandar (modo manual)' : 'vão para a planilha (abas Arquivo_*) e saem do Supabase, todo dia de madrugada') + '. Elas continuam acessíveis no sistema (histórico do cliente, relatórios e Histórico de vendas). Pedidos com chat, ocorrência ou nota fiscal ficam no sistema.'; }
async function sb410ArqCarregarRegra_(){
  try{ const c = await sbSelecionar_('backup_config','id=eq.true',true); const r = c && c[0]; if(!r) return;
    const d = Number(r.arquivar_dias), inp = document.getElementById('sb410ArqDias'), md = document.getElementById('sb410ArqModo');
    if(inp && d) inp.value = String(d); if(md) md.value = r.arquivar_ativo === false ? 'manual' : 'auto';
    sb410ArqTexto_(d || 90, r.arquivar_ativo !== false); }catch(e){}
}
async function sb410ArqModoSalvar(v){
  const m = document.getElementById('sb410ArqMsg'), auto = v !== 'manual';
  try{ const t = await sb410Token_();
    const r = await sbJson_(SUPABASE_URL_+'/rest/v1/backup_config?id=eq.true', { method:'PATCH', headers:{ apikey:SUPABASE_CHAVE_, Authorization:'Bearer '+t, 'Content-Type':'application/json', Prefer:'return=minimal' }, body: JSON.stringify({ arquivar_ativo: auto, atualizado_em:new Date().toISOString() }) }, 15000);
    if(!r.ok) throw new Error('falha');
    sb410ArqTexto_(Number((document.getElementById('sb410ArqDias')||{}).value) || 90, auto);
    if(m) m.textContent = auto ? 'Salvo: arquivamento automático todo dia de madrugada.' : 'Salvo: o sistema não arquiva mais sozinho por idade. A proteção dos 95% continua ligada.';
  }catch(e){ if(m) m.textContent = 'Não foi possível salvar agora.'; }
}
function sb410PlanoCarregar_(mb){
  const sel = document.getElementById('sb410Plano'), inp = document.getElementById('sb410PlanoMb'); if(!sel) return;
  mb = Math.round(Number(mb) || 500);
  if(mb === 500 || mb === 8192) sel.value = String(mb); else { sel.value = 'outro'; if(inp) inp.value = String(mb); }
  sb410PlanoMudou();
}
function sb410PlanoMudou(){ const sel = document.getElementById('sb410Plano'), o = document.getElementById('sb410PlanoOutro'); if(o && sel) o.style.display = sel.value === 'outro' ? '' : 'none'; }
async function sb410PlanoSalvar(){
  const sel = document.getElementById('sb410Plano'), m = document.getElementById('sb410PlanoMsg');
  const mb = sel.value === 'outro' ? Number((document.getElementById('sb410PlanoMb')||{}).value) : Number(sel.value);
  if(!(mb >= 100)){ if(m) m.textContent = 'Informe o tamanho em MB (mínimo 100).'; return; }
  if(mb > 500 && !await confirmarTxt_('Você confirmou no painel do Supabase que o seu banco tem mesmo ' + mb + ' MB? Se informar mais do que o plano realmente tem, a proteção só age quando já for tarde.', 'Sim, confirmei', false, 'Tamanho do banco')) return;
  try{ const j = await rpcArq_('api_espaco_plano_salvar', { p: { limiteMb: mb } });
    if(m) m.textContent = (j && j.message) || 'Não foi possível salvar.'; if(j && j.ok) sb410Espaco();
  }catch(e){ if(m) m.textContent = 'Não foi possível salvar agora.'; }
}
async function sb410ArqSalvarRegra(v){
  const dias = Math.max(30, Number(v) || 90), m = document.getElementById('sb410ArqMsg');
  const _in = document.getElementById('sb410ArqDias'); if(_in) _in.value = String(dias);
  try{ const t = await sb410Token_();
    const r = await sbJson_(SUPABASE_URL_+'/rest/v1/backup_config?id=eq.true', { method:'PATCH', headers:{ apikey:SUPABASE_CHAVE_, Authorization:'Bearer '+t, 'Content-Type':'application/json', Prefer:'return=minimal' }, body: JSON.stringify({ arquivar_dias:dias, atualizado_em:new Date().toISOString() }) }, 15000);
    if(!r.ok) throw new Error('falha');
    sb410ArqTexto_(dias, (document.getElementById('sb410ArqModo')||{}).value !== 'manual'); if(m) m.textContent = 'Regra salva: arquivar o que tem mais de ' + dias + ' dias' + ((document.getElementById('sb410ArqModo')||{}).value === 'manual' ? ' (quando você mandar).' : ' (a partir da próxima madrugada).');
  }catch(e){ if(m) m.textContent = 'Não foi possível salvar a regra agora.'; }
}

async function sb410SimularArquivo(){
  const dias = Number((document.getElementById('sb410ArqDias')||{}).value) || 90, m = document.getElementById('sb410ArqMsg');
  if(m) m.textContent = 'Simulando… (nada é movido)';
  try{
    const j = await rpcArq_('api_simular_arquivamento', { p_dias: dias });
    if(!j || !j.ok) throw new Error((j && j.message) || 'falha');
    const d = iso => { const t = Date.parse(iso||''); return t ? new Date(t).toLocaleDateString('pt-BR') : ''; };
    let t = 'Simulação (mais de ' + j.dias + ' dias): ' + j.vendasAntigas + ' venda(s) antiga(s); ' + j.vendasArquivaveis + ' sairiam agora' + (j.vendasArquivaveis && j.maisAntiga ? ' (de ' + d(j.maisAntiga) + ' a ' + d(j.maisNova) + ')' : '') + ' e ' + j.vendasBloqueadas + ' ficam' + (j.vendasBloqueadas ? ' (' + (j.bloqReembolso||0) + ' com reembolso; as demais têm pedido em andamento, ocorrência aberta ou ajuste pendente)' : '') + '. ' + j.caixasArquivaveis + ' caixa(s) fechado(s) sairiam.';
    t += ' Resumo guardado no Supabase: ' + j.resumoGuardado + ' pedido(s)' + (Number(j.resumoGuardado) !== Number(j.historicoArquivadas) ? ' — ⚠️ o histórico de arquivados tem ' + j.historicoArquivadas + '; confira antes de arquivar.' : ' (confere com o histórico).');
    try{
      const pl = await sb410Edge_('planilha-admin', { acao:'arquivoContagem' }, 60000);
      if(pl && pl.ok) t += ' Planilha: ' + pl.pedidos + ' pedido(s) arquivado(s)' + (Number(pl.pedidos) !== Number(j.resumoGuardado) ? ' — ⚠️ o resumo do Supabase tem ' + j.resumoGuardado + '; pedidos arquivados antes do resumo existir explicam a diferença, senão confira antes de arquivar.' : ' (confere com o resumo).');
      else t += ' Não consegui contar os pedidos da planilha agora.';
    }catch(e2){ t += ' Não consegui contar os pedidos da planilha agora.'; }
    if(Number(j.filaAnonimizacao) > 0) t += ' Anonimização pendente na planilha: ' + j.filaAnonimizacao + ' cliente(s) (roda sozinha de madrugada).';
    if(m) m.textContent = t;
  }catch(e){ if(m) m.textContent = 'Não consegui simular agora. Tente de novo.'; }
}
async function sb410ArquivarAgora(){
  const dias = Number((document.getElementById('sb410ArqDias')||{}).value) || 90;
  if(!await confirmarTxt_('Arquivar as vendas e caixas fechados com mais de ' + dias + ' dias? Eles vão para o Storage (arquivo comprimido; se o Storage falhar, para a planilha) e só saem do banco depois de conferidos. Os relatórios de meses antigos continuam mostrando tudo. Pode levar alguns minutos; não feche a página.')) return;
  const senha = await new Promise(res => abrirModalSenhaAdmin(s => res(s)));   // v1.15: senha sempre
  if(!senha) return;
  const m = document.getElementById('sb410ArqMsg'); if(m) m.textContent = 'Arquivando…';
  try{
    const j = await sb410Edge_('arquivar-antigos', { dias: dias, manual: true, senha }, 280000);
    if(m) m.textContent = j.ok ? ('Pronto: ' + (j.vendas||0) + ' venda(s) e ' + (j.caixas||0) + ' caixa(s) arquivados' + (j.destino ? ' (' + (j.destino === 'storage' ? 'no Storage' : 'na planilha') + ')' : '') + '. O espaço do banco volta depois da compactação das 05:30.' + (j.avisoStorage ? ' ⚠️ Storage: ' + j.avisoStorage : '')) : ('Parou: ' + (j.message || j.erro || 'falha') + ' (' + (j.vendas||0) + ' venda(s) e ' + (j.caixas||0) + ' caixa(s) já arquivados).');
  }catch(e){ if(m) m.textContent = 'Sem conexão. Confira o resultado antes de repetir.'; }
  sb410Espaco();
}


/* Chamada pelo roteador (sbRotear_) no lugar do "ainda não migrada" — ver LEIA-ME */
/* Fotos: sempre no Drive principal, com cópia no Drive da contingência (o espelho de 10 min também copia as que faltarem). */
async function sbUploadFoto_(action, p){
  const destino = 'ambos';
  const corpo = { nomeBase:p.nomeBase, base64Data:p.base64Data, mimeType:p.mimeType, destino };
  if(action === 'uploadFotoCombo') corpo.comboId = p.comboId; else corpo.produtoId = p.produtoId;
  const j = await sb410Edge_('upload-foto', corpo, 90000);
  if(j && j.ok){
    j.fotoId = j.id_principal || j.id_contingencia; j.fotoUrl = sbFotoUrl_(j.fotoId);
    // quem chama espera as listas atualizadas (r.produtos / r.combos)
    const lista = action === 'uploadFotoCombo' ? combos : produtos, alvo = action === 'uploadFotoCombo' ? p.comboId : p.produtoId;
    const it = (lista || []).find(x => x.id === alvo);
    if(it && j.id_principal){ it.fotoId = j.id_principal; it.fotoUrl = j.fotoUrl; }
    j.produtos = produtos; j.combos = combos;
  }
  return j;
}

async function sbRemoverFoto_(action, p){
  const corpo = action === 'excluirFotoCombo' ? { comboId: p.comboId } : { produtoId: p.produtoId };
  const j = await sb410Edge_('remover-foto', corpo, 60000);
  if(j && j.ok){
    const lista = action === 'excluirFotoCombo' ? combos : produtos, alvo = action === 'excluirFotoCombo' ? p.comboId : p.produtoId;
    const it = (lista || []).find(x => x.id === alvo);
    if(it){ it.fotoId = ''; it.fotoUrl = ''; }
    j.produtos = produtos; j.combos = combos;
  }
  return j;
}

/* ---------- Etapa 9: integridade ---------- */
async function sb410Integ(){
  const m = document.getElementById('sb410IntegMsg'); if(m) m.textContent = 'Conferindo…';
  try{ const j = await sb410Edge_('conferir-integridade', {}, 60000);
    if(!m) return;
    if(j.ok){
      const fila = Number(j.pendentes_fila)||0, dif = Number(j.dif)||0, bate = Math.abs(dif) <= Math.max(1, fila);
      const dia = j.dia ? j.dia.split('-').reverse().join('/') : 'hoje';
      m.className = 'msg ' + (bate ? 'ok' : 'warn');
      m.textContent = (bate ? '✅ Tudo certo. ' : '⚠️ Diferença encontrada. ') + 'Dia ' + dia + ': ' + j.supabase + ' venda(s) no Supabase e ' + j.planilha + ' na planilha' + (dif ? ' (diferença de ' + dif + (fila ? ', ' + fila + ' ainda na fila de envio' : '') + ')' : '') + '.';
    } else { m.className = 'msg warn'; m.textContent = 'Erro: '+(j.message||'falha'); } }
  catch(e){ if(m){ m.className = 'msg warn'; m.textContent = 'Sem conexão.'; } }
}

/* ---------- gancho: ao abrir Administrador → Sistema → Backup e espaço ---------- */
(function(){
  const orig = window.abrirAdministrador;
  if(typeof orig !== 'function') return;
  window.abrirAdministrador = function(sub){
    const r = orig.apply(this, arguments);
    try{ if(['armazenamento','integridade'].some(id=>{ const s = document.getElementById('tab-'+id); return s && s.classList.contains('active'); })) sb410Carregar_(); }catch(e){}
    return r;
  };
})();
