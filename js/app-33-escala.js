/* ============================================================
   ESCALA DA EQUIPE (18/10/2026) — Administrador → Loja e equipe → Escala; "Minha escala" no Início de cada pessoa.
   Turnos (Trabalho, Folga, Férias, Falta, Atestado), padrão semanal por pessoa, copiar semana, aplicar o padrão em várias semanas.
   Tudo roda no banco (api_escala_semana, api_salvar_turno, api_escala_padrao_salvar, api_escala_aplicar_padrao, api_escala_copiar_semana,
   api_equipe_importar_acessos, api_minha_escala). Admin vê tudo; os demais veem só horários (falta e atestado aparecem como "Ausente").
   ============================================================ */
var escDados_ = { inicio:'', fim:'', funcionarios:[], turnos:[], padrao:[], admin:false };
var escSemana_ = '';          // segunda-feira exibida (AAAA-MM-DD)
var escModo_ = '';            // 'grade' | 'dia'
var ESC_DIAS_ = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
var ESC_TIPOS_ = ['Trabalho','Folga','Férias','Falta','Atestado'];

function escISO_(d){ return dataLocalISO(d); }
function escData_(iso){ const p = String(iso).slice(0, 10).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
function escSegunda_(d){ const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
function escSomar_(iso, n){ const d = escData_(iso); d.setDate(d.getDate() + n); return escISO_(d); }
function escDM_(iso){ const p = String(iso).slice(0, 10).split('-'); return p[2] + '/' + p[1]; }
function escDias_(){ const out = []; for(let i = 0; i < 7; i++) out.push(escSomar_(escSemana_, i)); return out; }
function escHoras_(t){ if(t.tipo !== 'Trabalho' || !t.inicio || !t.fim) return 0; const m = s => +s.slice(0, 2) * 60 + +s.slice(3, 5); let d = m(t.fim) - m(t.inicio); if(d <= 0) d += 1440; return d / 60; }
function escHoraTxt_(h){ const hh = Math.floor(h), mm = Math.round((h - hh) * 60); return hh + 'h' + (mm ? String(mm).padStart(2, '0') : ''); }
function escHora_(txt){            // "18", "18h", "18h30", "18:30", "1830" -> "18:30" (ou '')
  const s = String(txt || '').trim().toLowerCase().replace('h', ':').replace(/:$/, '');
  let m = s.match(/^(\d{1,2})(?::?(\d{2}))?$/); if(!m) return '';
  const h = +m[1], mi = m[2] ? +m[2] : 0; if(h > 23 || mi > 59) return '';
  return String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0');
}
function escFaixa_(txt){           // "18:00-23:00" / "18-23" / "18h às 23h" -> { inicio, fim } ou null
  const s = String(txt || '').toLowerCase().replace(/\s+/g, '').replace(/às|as|a/g, '-');
  const p = s.split('-'); if(p.length !== 2) return null;
  const a = escHora_(p[0]), b = escHora_(p[1]); return a && b && a !== b ? { inicio:a, fim:b } : null;
}
function escNome_(id){ const f = (escDados_.funcionarios || []).find(x => x.id === id); return f ? f.nome : '—'; }
function escCor_(t){ return t === 'Trabalho' ? 'var(--gold)' : (t === 'Folga' ? 'var(--muted)' : (t === 'Férias' ? '#7ec8ff' : '#ff8d82')); }
function escChip_(t, editavel){
  const txt = t.tipo === 'Trabalho' ? t.inicio + '–' + t.fim + (t.funcao ? ' · ' + escH(t.funcao) : '') : t.tipo;
  const st = 'display:inline-block;margin:2px 2px 2px 0;padding:3px 8px;border:1px solid ' + escCor_(t.tipo) + ';border-radius:12px;font-size:12px;color:' + escCor_(t.tipo) + ';background:transparent;';
  return editavel ? '<button type="button" style="' + st + 'cursor:pointer;" onclick="escEditar(\'' + t.id + '\')">' + escH(txt) + '</button>' : '<span style="' + st + '">' + escH(txt) + '</span>';
}
function escTurnosDe_(fid, iso){ return (escDados_.turnos || []).filter(t => t.funcionarioId === fid && String(t.data).slice(0, 10) === iso); }

async function carregarEscala_(){
  if(!escSemana_) escSemana_ = escISO_(escSegunda_(new Date()));
  if(!escModo_) escModo_ = window.innerWidth < 700 ? 'dia' : 'grade';
  try{
    const r = await apiCall('escalaSemana', { inicio: escSemana_ });
    if(!r || !r.ok){ showMsg('escMsg', (r && r.message) || 'Não foi possível carregar a escala.', 'warn'); return; }
    escDados_ = r; renderEscala_();
  }catch(e){ showMsg('escMsg', 'Não foi possível carregar a escala agora.', 'warn'); }
}
function escIr(n){ escSemana_ = n === 0 ? escISO_(escSegunda_(new Date())) : escSomar_(escSemana_, 7 * n); carregarEscala_(); }
function escModo(m){ escModo_ = m; renderEscala_(); }

/* corpo da escala (usado na aba do Admin e na janela "Escala da equipe" dos demais perfis) */
function escCorpoHtml_(editavel){
  const dias = escDias_(), fs = (escDados_.funcionarios || []).filter(f => f.ativo || (escDados_.turnos || []).some(t => t.funcionarioId === f.id));
  if(!fs.length) return '<p class="sub">' + (editavel ? 'Nenhum funcionário ainda. Toque em "Importar acessos" para trazer quem já usa o sistema, ou cadastre em Equipe e pagamentos.' : 'A escala ainda não foi preenchida.') + '</p>';
  const horasPessoa = f => (escDados_.turnos || []).filter(t => t.funcionarioId === f.id).reduce((s, t) => s + escHoras_(t), 0);
  const contaDia = iso => new Set((escDados_.turnos || []).filter(t => String(t.data).slice(0, 10) === iso && t.tipo === 'Trabalho').map(t => t.funcionarioId)).size;
  const hoje = escISO_(new Date());
  if(escModo_ === 'dia'){
    return dias.map((iso, i) => {
      const n = contaDia(iso), linhas = fs.map(f => ({ f, ts: escTurnosDe_(f.id, iso) })).filter(x => x.ts.length);
      return '<div class="mesa-card" style="' + (iso === hoje ? 'border-color:var(--gold);' : '') + '"><b>' + ESC_DIAS_[i] + ' ' + escDM_(iso) + '</b> <span class="obs-line" style="display:inline;color:' + (n ? 'var(--muted)' : '#ff8d82') + ';">· ' + (n ? n + ' escalado(s)' : 'ninguém escalado') + '</span>' +
        linhas.map(x => '<div style="margin-top:6px;"><span style="color:var(--text);">' + escH(x.f.nome) + '</span><br>' + x.ts.map(t => escChip_(t, editavel)).join('') + '</div>').join('') +
        (editavel ? '<div style="margin-top:8px;"><button type="button" class="ghost small" onclick="escNovoDia(\'' + iso + '\')">+ Escalar alguém</button></div>' : '') + '</div>';
    }).join('');
  }
  let h = '<div style="overflow-x:auto;"><table style="min-width:760px;"><thead><tr><th style="text-align:left;">Pessoa</th>' + dias.map((iso, i) => '<th style="' + (iso === hoje ? 'color:var(--gold);' : '') + '">' + ESC_DIAS_[i] + '<br><span class="obs-line">' + escDM_(iso) + '</span></th>').join('') + '<th>Horas</th></tr></thead><tbody>';
  fs.forEach(f => {
    const hs = horasPessoa(f);
    h += '<tr><td style="position:sticky;left:0;background:var(--panel);white-space:nowrap;">' + escH(f.nome) + '<span class="obs-line">' + escH(f.cargo || '') + '</span>' + (editavel ? '<button type="button" class="ghost small" style="margin-top:4px;" onclick="escPadrao(\'' + f.id + '\')">Padrão</button>' : '') + '</td>';
    dias.forEach(iso => { h += '<td style="vertical-align:top;">' + escTurnosDe_(f.id, iso).map(t => escChip_(t, editavel)).join('') + (editavel ? '<button type="button" class="ghost small" style="padding:1px 8px;" aria-label="Adicionar turno" onclick="escNovo(\'' + f.id + '\',\'' + iso + '\')">+</button>' : '') + '</td>'; });
    h += '<td style="white-space:nowrap;' + (hs > 44 ? 'color:#ff8d82;' : '') + '">' + (hs ? escHoraTxt_(hs) : '—') + (hs > 44 ? '<br><span class="obs-line">acima de 44h</span>' : '') + '</td></tr>';
  });
  h += '<tr><td style="position:sticky;left:0;background:var(--panel);"><b>Escalados</b></td>' + dias.map(iso => { const n = contaDia(iso); return '<td style="' + (n ? '' : 'color:#ff8d82;') + '"><b>' + n + '</b></td>'; }).join('') + '<td></td></tr></tbody></table></div>';
  return h;
}
function escNavHtml_(){
  const fim = escSomar_(escSemana_, 6);
  return '<div class="btn-row" style="align-items:center;"><button type="button" class="ghost small" onclick="escIr(-1)" aria-label="Semana anterior">‹</button><b style="flex:1;text-align:center;">' + escDM_(escSemana_) + ' a ' + escDM_(fim) + '</b><button type="button" class="ghost small" onclick="escIr(1)" aria-label="Próxima semana">›</button><button type="button" class="ghost small" onclick="escIr(0)">Hoje</button></div>' +
    '<div class="btn-row" style="margin-top:6px;"><button type="button" class="ghost small" style="' + (escModo_ === 'dia' ? 'border-color:var(--gold);color:var(--gold);' : '') + '" onclick="escModo(\'dia\')">Por dia</button><button type="button" class="ghost small" style="' + (escModo_ === 'grade' ? 'border-color:var(--gold);color:var(--gold);' : '') + '" onclick="escModo(\'grade\')">Por pessoa</button></div>';
}
function renderEscala_(){
  const nav = document.getElementById('escNav'), corpo = document.getElementById('escCorpo'); if(!corpo) return;
  nav.innerHTML = escNavHtml_(); corpo.innerHTML = escCorpoHtml_(true);
  const j = document.getElementById('escEquipeCorpo'); if(j){ document.getElementById('escEquipeNav').innerHTML = escNavHtml_(); j.innerHTML = escCorpoHtml_(false); }
}

/* ---------- turnos ---------- */
function escNovoDia(iso){
  const fs = (escDados_.funcionarios || []).filter(f => f.ativo); if(!fs.length){ avisar('Cadastre ou importe funcionários primeiro.'); return; }
  vsForm({ titulo:'Escalar quem?', ok:'Continuar', campos:[{ id:'f', rotulo:'Pessoa', tipo:'escolha', valor:fs[0].id, opcoes: fs.map(f => ({ v:f.id, t:f.nome })) }] }).then(r => { if(r) escNovo(r.f, iso); });
}
function escNovo(fid, iso){ return escForm_(null, fid, iso); }
function escEditar(id){ const t = (escDados_.turnos || []).find(x => x.id === id); if(t) escForm_(t, t.funcionarioId, String(t.data).slice(0, 10)); }
async function escForm_(t, fid, iso, anterior, confirmado){
  let r = anterior;
  if(!r){
    const campos = [
      { id:'tipo', rotulo:'Tipo', tipo:'escolha', valor: t ? t.tipo : 'Trabalho', opcoes: ESC_TIPOS_.map(x => ({ v:x, t:x })) },
      { id:'inicio', rotulo:'Entrada (ex.: 18:00)', tipo:'texto', valor: t && t.inicio ? t.inicio : '18:00', max:5, mostrarSe:{ campo:'tipo', valor:'Trabalho' } },
      { id:'fim', rotulo:'Saída (ex.: 23:00; depois da meia-noite vale o dia seguinte)', tipo:'texto', valor: t && t.fim ? t.fim : '23:00', max:5, mostrarSe:{ campo:'tipo', valor:'Trabalho' } },
      { id:'funcao', rotulo:'Função no turno (opcional)', tipo:'texto', valor: t ? (t.funcao || '') : '', max:40, sugestoes:['Chapa','Atendimento','Caixa','Entrega','Cozinha','Salão'], mostrarSe:{ campo:'tipo', valor:'Trabalho' } },
      { id:'observacao', rotulo:'Observação (opcional, só você vê)', tipo:'texto', valor: t ? (t.observacao || '') : '', max:200 }
    ];
    if(t) campos.push({ id:'acao', rotulo:'O que fazer', tipo:'escolha', valor:'salvar', opcoes:[{ v:'salvar', t:'Salvar' }, { v:'remover', t:'Remover este turno' }] });
    r = await vsForm({ titulo: escNome_(fid) + ' — ' + escDM_(iso), ok:'Salvar', campos });
    if(!r) return;
  }
  const remover = r.acao === 'remover';
  let inicio = '', fim = '';
  if(!remover && r.tipo === 'Trabalho'){
    inicio = escHora_(r.inicio); fim = escHora_(r.fim);
    if(!inicio || !fim){ avisar('Use horários como 18:00 ou 18h30.'); return escForm_(t, fid, iso); }
    if(inicio === fim){ avisar('Entrada e saída precisam ser diferentes.'); return escForm_(t, fid, iso); }
  }
  try{
    const res = await apiCall('salvarTurno', { id: t ? t.id : '', funcionarioId:fid, data:iso, tipo:r.tipo, inicio, fim, funcao:r.funcao || '', observacao:r.observacao || '', cancelar: remover ? 'true' : '', confirmado: confirmado ? 'true' : '' });
    if(res && res.confirmar){ if(await confirmarTxt_(res.message, 'Escalar mesmo assim', false)) return escForm_(t, fid, iso, r, true); return; }
    if(res && res.ok){ showMsg('escMsg', res.message, 'ok'); carregarEscala_(); } else avisar((res && res.message) || 'Não foi possível salvar.');
  }catch(e){ avisar('Não foi possível salvar agora.'); }
}

/* ---------- padrão semanal ---------- */
async function escPadrao(fid){
  const f = (escDados_.funcionarios || []).find(x => x.id === fid); if(!f) return;
  const atual = {}; (escDados_.padrao || []).forEach(p => { if(p.funcionarioId === fid) atual[p.dia] = p; });
  const ordem = [1, 2, 3, 4, 5, 6, 0], nomes = { 1:'Segunda', 2:'Terça', 3:'Quarta', 4:'Quinta', 5:'Sexta', 6:'Sábado', 0:'Domingo' };
  const campos = ordem.map(d => ({ id:'d' + d, rotulo:nomes[d], tipo:'texto', max:20, valor: atual[d] && atual[d].tipo === 'Trabalho' ? atual[d].inicio + '-' + atual[d].fim : '' }));
  const r = await vsForm({ titulo:'Padrão semanal — ' + f.nome, texto:'Escreva o horário de cada dia, como 18:00-23:00. Deixe em branco para folga. Depois use "Aplicar padrão" para preencher várias semanas de uma vez.', ok:'Salvar padrão', campos });
  if(!r) return;
  const dias = [];
  for(const d of ordem){
    const txt = String(r['d' + d] || '').trim();
    if(!txt){ dias.push({ dia:d, tipo:'Folga' }); continue; }
    const fx = escFaixa_(txt); if(!fx){ avisar('Horário inválido em ' + nomes[d] + ': use 18:00-23:00.'); return escPadrao(fid); }
    dias.push({ dia:d, tipo:'Trabalho', inicio:fx.inicio, fim:fx.fim });
  }
  try{
    const res = await apiCall('escalaPadraoSalvar', { funcionarioId:fid, dias });
    if(res && res.ok){ showMsg('escMsg', res.message, 'ok'); carregarEscala_(); } else avisar((res && res.message) || 'Não foi possível salvar o padrão.');
  }catch(e){ avisar('Não foi possível salvar agora.'); }
}
async function escAplicarPadrao(){
  const r = await vsForm({ titulo:'Aplicar padrão semanal', texto:'Preenche, a partir da semana mostrada, os dias que ainda estão vazios usando o padrão de cada pessoa. Nada que já está escalado é alterado.', ok:'Aplicar',
    campos:[{ id:'semanas', rotulo:'Quantas semanas', tipo:'numero', valor:4, obrigatorio:true, minimo:1, maiorQueZero:true }] });
  if(!r) return;
  try{
    const res = await apiCall('escalaAplicarPadrao', { inicio: escSemana_, semanas: Math.min(12, Math.round(r.semanas)) });
    if(res && res.ok){ showMsg('escMsg', res.message, 'ok'); carregarEscala_(); } else avisar((res && res.message) || 'Não foi possível aplicar.');
  }catch(e){ avisar('Não foi possível aplicar agora.'); }
}
async function escCopiarAnterior(){
  if(!await confirmarTxt_('Copiar a escala da semana anterior para esta semana? Só os dias vazios são preenchidos.', 'Copiar', false)) return;
  try{
    const res = await apiCall('escalaCopiarSemana', { de: escSomar_(escSemana_, -7), para: escSemana_ });
    if(res && res.ok){ showMsg('escMsg', res.message, 'ok'); carregarEscala_(); } else avisar((res && res.message) || 'Não foi possível copiar.');
  }catch(e){ avisar('Não foi possível copiar agora.'); }
}
async function escImportar(){
  try{
    const res = await apiCall('equipeImportarAcessos', {});
    if(res && res.ok){ showMsg('escMsg', res.message, 'ok'); carregarEscala_(); } else avisar((res && res.message) || 'Não foi possível importar.');
  }catch(e){ avisar('Não foi possível importar agora.'); }
}

/* ---------- imprimir e WhatsApp ---------- */
function escTextoSemana_(){
  const dias = escDias_(), fs = (escDados_.funcionarios || []);
  let t = '*Escala da semana ' + escDM_(escSemana_) + ' a ' + escDM_(escSomar_(escSemana_, 6)) + '*\n';
  dias.forEach((iso, i) => {
    const linhas = [];
    fs.forEach(f => { const ts = escTurnosDe_(f.id, iso).filter(x => x.tipo === 'Trabalho'); if(ts.length) linhas.push(f.nome + ': ' + ts.map(x => x.inicio + '–' + x.fim + (x.funcao ? ' (' + x.funcao + ')' : '')).join(' e ')); });
    t += '\n*' + ESC_DIAS_[i] + ' ' + escDM_(iso) + '*\n' + (linhas.length ? linhas.join('\n') : 'ninguém escalado') + '\n';
  });
  return t;
}
function escWhatsapp(){ window.open('https://wa.me/?text=' + encodeURIComponent(escTextoSemana_()), '_blank'); }
function escImprimir(){
  const dias = escDias_(), fs = (escDados_.funcionarios || []).filter(f => f.ativo);
  const cel = (f, iso) => escTurnosDe_(f.id, iso).filter(t => ['Trabalho', 'Folga', 'Férias'].includes(t.tipo)).map(t => t.tipo === 'Trabalho' ? escH(t.inicio + '–' + t.fim) : escH(t.tipo)).join('<br>') || '—';
  const h = '<div style="font-family:Arial,sans-serif;font-size:13px;padding:16px;"><h2 style="margin:0 0 4px;">Escala da equipe — ' + NOME_UP_H_() + '</h2><div style="margin-bottom:12px;">Semana de ' + escDM_(escSemana_) + ' a ' + escDM_(escSomar_(escSemana_, 6)) + '</div>' +
    '<table style="border-collapse:collapse;width:100%;"><tr><th style="border:1px solid #000;padding:4px;text-align:left;">Pessoa</th>' + dias.map((iso, i) => '<th style="border:1px solid #000;padding:4px;">' + ESC_DIAS_[i] + '<br>' + escDM_(iso) + '</th>').join('') + '</tr>' +
    fs.map(f => '<tr><td style="border:1px solid #000;padding:4px;"><b>' + escH(f.nome) + '</b><br>' + escH(f.cargo || '') + '</td>' + dias.map(iso => '<td style="border:1px solid #000;padding:4px;text-align:center;">' + cel(f, iso) + '</td>').join('') + '</tr>').join('') + '</table></div>';
  imprimirDocumento(h, 'Escala da equipe', 'A4');
}

/* ---------- Início: "Minha escala" e janela "Escala da equipe" (todos os perfis) ---------- */
async function carregarMinhaEscala_(){
  /* o cartão "Minha escala" saiu do Início (18/10/2026): a escala e o ponto ficam só no botão do relógio, no topo */
  return;
  const card = document.getElementById('minhaEscalaCard'); if(!card || typeof currentUser === 'undefined' || !currentUser || !apiConfigurada()) return;
  try{
    const r = await apiCall('minhaEscala', {});
    if(!r || !r.ok || !r.vinculado){ card.style.display = 'none'; return; }
    const hoje = escISO_(new Date()), porDia = {};
    (r.turnos || []).forEach(t => { const k = String(t.data).slice(0, 10); (porDia[k] = porDia[k] || []).push(t); });
    let h = '';
    for(let i = 0; i < 7; i++){
      const iso = escSomar_(hoje, i), d = escData_(iso), ts = porDia[iso] || [];
      h += '<div style="padding:5px 0;border-bottom:1px solid var(--line);' + (i === 0 ? 'font-weight:700;' : '') + '"><span style="display:inline-block;width:92px;color:var(--muted);">' + (i === 0 ? 'Hoje' : ESC_DIAS_[(d.getDay() + 6) % 7] + ' ' + escDM_(iso)) + '</span>' +
        (ts.length ? ts.map(t => escChip_(t, false)).join('') : '<span style="color:var(--muted);">sem escala</span>') + '</div>';
    }
    document.getElementById('minhaEscalaLista').innerHTML = h; card.style.display = '';
  }catch(e){ card.style.display = 'none'; }
}
async function escEquipeAbrir(){
  let m = document.getElementById('escEquipeModal');
  if(!m){
    m = document.createElement('div'); m.className = 'modal-overlay'; m.id = 'escEquipeModal';
    m.innerHTML = '<div class="modal-box" style="max-width:900px;"><div class="modal-header"><h2>Escala da equipe</h2><button class="close-btn" onclick="fecharFormModal(\'escEquipeModal\')" aria-label="Fechar">✕</button></div><div id="escEquipeNav"></div><div id="escEquipeCorpo" style="margin-top:8px;"></div></div>';
    document.body.appendChild(m);
  }
  abrirFormModal('escEquipeModal'); await carregarEscala_();
}
(function(){
  if(typeof renderInicio === 'function'){ const orig = renderInicio; renderInicio = function(){ const r = orig.apply(this, arguments); try{ carregarMinhaEscala_(); }catch(e){} return r; }; }
})();
