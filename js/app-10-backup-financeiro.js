/* ---------- FASE 10 — ARMAZENAMENTO, BACKUP E RECUPERAÇÃO ---------- */
function escBk_(s){ return escH(s); }
function formatarBytes_(b){ b=Number(b)||0; if(b<=0) return '—'; const u=['B','KB','MB','GB','TB']; let i=0; while(b>=1024&&i<u.length-1){ b/=1024; i++; } return b.toFixed(i?1:0)+' '+u[i]; }
function marcarAlertaAdmin_(ativo){ if(!ativo) return; const b=document.querySelector('[data-tab="administrador"]'); if(b) b.classList.add('has-alert'); }
/* Barra de um Drive na tela Backup e espaço (mesmo desenho do banco, Storage e planilha). Erro sempre aparece. */
function bkDriveBarra_(boxId, titulo, d, alerta, cats){
  const box = document.getElementById(boxId); if(!box) return;
  const total = (Number(d.usado)||0) + (Number(d.livre)||0);
  // composição: o que ocupa o espaço (só categorias com algo dentro), em uma linha
  const comp = cats ? Object.keys(cats).filter(k => (cats[k].bytes||0) > 0).map(k => escBk_(k) + ' ' + formatarBytes_(cats[k].bytes)).join(' · ') : '';
  const extra = (comp ? '<div class="fs-xs mt-1" style="color:var(--muted);">' + comp + '</div>' : '') + (alerta ? '<div class="obs-line fs-xs mt-1" style="color:#ffb3ab;">' + alerta + '</div>' : '');
  const html = (typeof armBarra_ === 'function')
    ? armBarra_(titulo, formatarBytes_(d.usado), d.livre===null ? '—' : formatarBytes_(total), d.percentual===null ? 0 : d.percentual, extra)
    : '<b>' + titulo + '</b> ' + formatarBytes_(d.usado) + ' · ' + (d.percentual===null?'—':d.percentual+'%');
  box.innerHTML = html;
}
function bkDriveErro_(boxId, titulo, txt){
  const box = document.getElementById(boxId); if(!box) return;
  box.innerHTML = '<div class="arm-bloco" style="margin:10px 0 14px;"><b>' + titulo + '</b><div class="msg warn" role="alert" style="display:block;margin-top:4px;">⚠️ ' + escBk_(txt) + '</div></div>';
}
async function carregarArmazenamento(){
  if(!document.getElementById('armDrivePrin')) return;
  try{
    const r = await apiCall('obterArmazenamento', {});
    if(!r || r.ok===false){ bkDriveErro_('armDrivePrin', '☁️ Drive principal', 'Não foi possível medir: ' + ((r&&r.message)||'sem resposta') + '.'); return; }
    const d = r.drive;
    bkDriveBarra_('armDrivePrin', '☁️ Drive principal', d, d.nivel==='Crítico' ? '⚠️ Drive quase cheio: novos backups e fotos podem falhar. Libere espaço.' : '', r.categorias);
    sistemaAlertas_.drive = d.nivel==='Crítico' ? ('Google Drive quase cheio ('+d.percentual+'% usado). Libere espaço (Administrador → Sistema → Backup e espaço → Google Drive → Opções → Limpar fotos sem uso).') : '';
    marcarAlertaAdmin_(d.nivel==='Crítico'); renderNotificacoes();
  } catch(e){ bkDriveErro_('armDrivePrin', '☁️ Drive principal', 'Sem conexão para medir o Drive agora. Toque em Atualizar.'); }
}
/* Botão Atualizar do cartão "Uso do espaço": mede tudo de novo (banco, Storage, planilha e os dois Drives). */
function bkAtualizarEspaco_(){
  try{ if(typeof carregarArmazenamentoArquivo_ === 'function') carregarArmazenamentoArquivo_(); }catch(e){}
  carregarArmazenamento(); carregarArmazenamentoContingencia();
}


/* ============================================================
   FASE 11 — FILA DE ENVIO (ITEM 78) e CONTINGÊNCIA (ITEM 81)
   Estados de cada item: pendente → enviando → confirmado | retry (sem internet) | erro (recusado / esgotou tentativas).
   SÓ entram na fila operações NÃO críticas. Operações financeiras (venda, pagamento, sangria,
   cancelamento, estoque, caixa) exigem confirmação do backend e nunca ficam "guardadas".
   ============================================================ */
const FILA_KEY = 'texasBurgerFila_v1';
const FILA_MAX_TENTATIVAS = 8;
let _fila = [];
try{ _fila = JSON.parse(localStorage.getItem(FILA_KEY) || '[]') || []; }catch(e){ _fila = []; }
_fila.forEach(i=>{ if(i.estado === 'enviando') i.estado = 'retry'; }); // recarregou no meio do envio
const _filaEmVoo = new Set();
function filaSalvar_(){ try{ localStorage.setItem(FILA_KEY, JSON.stringify(_fila)); }catch(e){} filaAtualizarBadge_(); }
async function apiCallFila(action, payload, rotulo){
  // Idempotência: mesmo conteúdo = mesmo id. 3 cliques seguidos no botão viram 1 envio.
  const chave = idemChave_(action, payload);
  const id = idemId_(chave);
  if(_fila.some(x => x.id === id)) return { ok: true, enfileirado: true, message: '📡 Este lançamento já está na fila — será enviado quando a internet voltar.' };
  const item = { id, action, payload: Object.assign({}, payload), rotulo: rotulo || action, estado: 'pendente', tentativas: 0, criadoEm: Date.now(), erro: '', idemChave: chave };
  item.payload.requisicaoId = item.id;
  _fila.push(item); filaSalvar_();
  const r = await filaEnviarItem_(item, true);
  if(r) { idemLimpar_(chave); return r; }
  return { ok: true, enfileirado: true, message: '📡 Sem conexão — salvo neste aparelho e será enviado sozinho quando a internet voltar.' };
}
/* Retorna: resposta do servidor | null (falha de rede) | undefined (já em envio, ignorado). */
async function filaEnviarItem_(item, imediato){
  if(_filaEmVoo.has(item.id)) return undefined;
  _filaEmVoo.add(item.id);
  item.estado = 'enviando'; item.tentativas++; filaSalvar_();
  try{
    const r = await apiCall(item.action, item.payload);
    if(r && r.manutencao){ item.estado = 'retry'; item.tentativas = Math.max(0, item.tentativas - 1); item.erro = 'Sistema em manutenção'; filaSalvar_(); return null; }  // ITEM 2.8
    if(r && r.ok !== false){ _fila = _fila.filter(x=>x.id !== item.id); if(item.idemChave) idemLimpar_(item.idemChave); filaSalvar_(); return r; }
    if(imediato){ _fila = _fila.filter(x=>x.id !== item.id); filaSalvar_(); return r; } // quem chamou já mostra o erro
    item.estado = 'erro'; item.erro = (r && r.message) || 'Recusado pelo servidor'; filaSalvar_();
    return r;
  }catch(e){
    item.estado = item.tentativas >= FILA_MAX_TENTATIVAS ? 'erro' : 'retry';
    item.erro = item.estado === 'erro' ? 'Não foi possível enviar após várias tentativas' : 'Sem conexão';
    filaSalvar_();
    return null;
  }finally{ _filaEmVoo.delete(item.id); }
}
let _filaProcessando = false;
async function filaProcessar(){
  if(_filaProcessando || !apiConfigurada()) return;
  const alvo = _fila.filter(i=>i.estado === 'pendente' || i.estado === 'retry').sort((a,b)=>a.criadoEm - b.criadoEm);
  if(!alvo.length) return;
  _filaProcessando = true;
  try{ for(const it of alvo){ const r = await filaEnviarItem_(it, false); if(r === null) break; } }
  finally{ _filaProcessando = false; }
}
setInterval(filaProcessar, 30000);            // sem itens na fila não faz nenhuma chamada
window.addEventListener('online', ()=>{ setTimeout(filaProcessar, 800); });
const FILA_ROTULO_ESTADO = { pendente:'⏳ Aguardando', enviando:'📤 Enviando', retry:'🔁 Vai tentar de novo', erro:'⚠️ Com erro', confirmado:'✅ Enviado' };
function filaAtualizarBadge_(){
  let b = document.getElementById('filaBadge');
  if(!b){
    const st = document.getElementById('connDot') || document.getElementById('connStatus'); if(!st) return;
    b = document.createElement('button'); b.id = 'filaBadge'; b.className = 'ghost';
    b.style.cssText = 'margin-left:6px;padding:2px 8px;font-size:12px;display:none;'; b.onclick = abrirFila;
    st.insertAdjacentElement('afterend', b);
  }
  const n = _fila.length, erros = _fila.filter(i=>i.estado === 'erro').length;
  b.style.display = n ? 'inline-block' : 'none';
  b.textContent = (erros ? '⚠️ ' : '⏳ ') + n + ' na fila';
  if(erros){ const nb = document.querySelector('[data-tab="notificacoes"]'); if(nb) nb.classList.add('has-alert'); }
}
function abrirFila(){
  let ov = document.getElementById('filaModal');
  if(!ov){
    ov = document.createElement('div'); ov.className = 'modal-overlay'; ov.id = 'filaModal';
    ov.innerHTML = '<div class="modal-box" style="max-width:520px;"><div class="modal-header"><h2>Fila de envio</h2><button class="close-btn" onclick="document.getElementById(\'filaModal\').classList.remove(\'open\')">✕</button></div><div id="filaLista" class="fs-sm"></div></div>';
    document.body.appendChild(ov);
  }
  filaRenderLista_(); ov.classList.add('open');
}
function filaRenderLista_(){
  const box = document.getElementById('filaLista'); if(!box) return;
  if(!_fila.length){ box.innerHTML = '<p class="sub">Nada aguardando envio. ✅</p>'; return; }
  box.innerHTML = '<p class="sub">Itens salvos neste aparelho que ainda não chegaram ao servidor. Vendas e pagamentos nunca ficam aqui.</p>' +
    _fila.map(i=>`<div class="notif-card"><b>${escBk_(i.rotulo)}</b> · ${FILA_ROTULO_ESTADO[i.estado]||i.estado}
      <div class="obs-line">${new Date(i.criadoEm).toLocaleString('pt-BR')} · ${i.tentativas} tentativa(s)${i.erro?' · '+escBk_(i.erro):''}</div>
      <div class="mt-2 d-flex gap-2">
        ${i.estado==='erro'?`<button class="ghost" style="padding:4px 10px;" onclick="filaReenviar_('${i.id}')">Tentar de novo</button>`:''}
        <button class="ghost" style="padding:4px 10px;" onclick="filaDescartar_('${i.id}')">Descartar</button></div></div>`).join('') +
    '<button class="small-gold" style="width:100%;padding:10px;margin-top:8px;" onclick="filaProcessar().then(filaRenderLista_)">Enviar agora</button>';
}
function filaReenviar_(id){ const i = _fila.find(x=>x.id === id); if(!i) return; i.estado = 'retry'; i.tentativas = 0; i.erro = ''; filaSalvar_(); filaProcessar().then(filaRenderLista_); filaRenderLista_(); }
async function filaDescartar_(id){
  if(!await confirmarTxt_('Descartar este item? Ele NÃO será enviado ao servidor.')) return;
  _fila = _fila.filter(x=>x.id !== id); filaSalvar_(); filaRenderLista_();
}
document.addEventListener('DOMContentLoaded', filaAtualizarBadge_);
setTimeout(filaAtualizarBadge_, 500);

/* ---------- CONTINGÊNCIA (ADMIN) — Item 81 ---------- */
/* Contingência: status e armazenamento carregam sempre que a tela abre.
   O espelho é atualizado pelo Supabase (a cada 10 min e completo às 3h); não há mais interruptor na tela. */
function contAbrirTela_(){ try{ carregarStatusContingencia(); }catch(e){} }
async function carregarStatusContingencia(){
  const box = document.getElementById('contingenciaStatus');
  if(!box) return;
  try{
    const r = await fetchContingencia_(_connOptsContingencia_(), TIMEOUT_CONT_LEITURA_MS_, 0);
    if(r.ok){
      if(r.pendentes === undefined && r.espelhoAtualizadoEm === undefined){
        box.innerHTML = '🟢 No ar · para ver o espelho e as vendas pendentes, saia e entre de novo como Administrador (a chave da contingência carrega no login).';
      } else {
        const idade = r.espelhoAtualizadoEm ? fmtDiaHoraBr_(r.espelhoAtualizadoEm) : 'nunca sincronizado';
        const pend = (typeof r.pendentes === 'number') ? r.pendentes : (Array.isArray(r.pendentes) ? r.pendentes.length : 0);
        box.innerHTML = (pend > 0 ? '<span style="color:#ffb3ab;">⚠️ ' : '🟢 ') + `No ar · espelho ${idade} · ${pend} venda(s) pendente(s)` + (pend > 0 ? ': toque em Trazer vendas</span>' : '');
      }
      carregarArmazenamentoContingencia();
    } else { box.innerHTML = '<span style="color:#ffb3ab;">🔴 A contingência respondeu com erro.</span>'; bkDriveErro_('armDriveCont', '☁️ Drive da contingência', 'A contingência respondeu com erro; não deu para medir o espaço.'); }
  } catch(e){ box.innerHTML = '<span style="color:#ffb3ab;">🔴 A contingência não respondeu agora.</span>'; bkDriveErro_('armDriveCont', '☁️ Drive da contingência', 'A contingência não respondeu; não deu para medir o espaço.'); }
}
async function carregarArmazenamentoContingencia(){
  const T = '☁️ Drive da contingência';
  if(!document.getElementById('armDriveCont')) return;
  try{
    const r = await apiCall('obterArmazenamentoContingencia', {});
    if(!r || r.ok===false){ bkDriveErro_('armDriveCont', T, 'Não foi possível medir: ' + ((r&&r.message)||'sem resposta') + '.'); sistemaAlertas_.driveCont=''; return; }
    const d = r.drive;
    bkDriveBarra_('armDriveCont', T, d, d.nivel==='Crítico' ? '⚠️ Drive da contingência quase cheio: novas cópias de backup e fotos podem ser recusadas. Libere espaço nessa conta.' : '', r.categorias);
    sistemaAlertas_.driveCont = d.nivel==='Crítico' ? ('Drive da conta da contingência quase cheio ('+d.percentual+'% usado). Libere espaço nessa conta.') : '';
    marcarAlertaAdmin_(d.nivel==='Crítico'); renderNotificacoes();
  } catch(e){ bkDriveErro_('armDriveCont', T, 'Sem conexão para medir o Drive da contingência agora. Toque em Atualizar.'); }
}
async function sincronizarContingenciaUI(){
  showMsg('contingenciaMsg','Sincronizando espelho (produtos, preços, clientes)... pode levar alguns segundos.','ok');
  try{
    const r = await apiCall('sincronizarContingenciaAgora', {});
    showMsg('contingenciaMsg', r.message || (r.ok?'Sincronizado.':'Falhou.'), r.ok?'ok':'warn');
    carregarStatusContingencia();
  } catch(e){ showMsg('contingenciaMsg','Não foi possível sincronizar agora.','warn'); }
}
async function reconciliarContingenciaUI(){
  if(!await confirmarTxt_('Isso vai buscar as vendas feitas na contingência (enquanto o servidor esteve fora do ar) e lançar aqui. Continuar?', 'Buscar vendas', false, 'Vendas da contingência')) return;
  showMsg('contingenciaMsg','Buscando e reaplicando vendas pendentes...','ok');
  try{
    const r = await apiCall('reconciliarContingenciaAgora', {});
    showMsg('contingenciaMsg', r.message || (r.ok?'Concluído.':'Falhou.'), r.ok?'ok':'warn');
    carregarStatusContingencia();
    if(r.ok) init();
  } catch(e){ showMsg('contingenciaMsg','Não foi possível reconciliar agora.','warn'); }
}
function resumoTaxaForma(f){
  const partes = [];
  if(f.taxaPct>0) partes.push(String(f.taxaPct).replace('.',',')+'%');
  if(f.taxaFixa>0) partes.push(formatarMoeda(f.taxaFixa));
  return partes.length ? partes.join(' + ') : 'sem taxa';
}
function resumoAcrescimoForma(f){
  const partes = [];
  if(f.acrescimoPct>0) partes.push('+'+String(f.acrescimoPct).replace('.',',')+'%');
  if(f.acrescimoFixo>0) partes.push('+'+formatarMoeda(f.acrescimoFixo));
  return partes.length ? partes.join(' ') : '—';
}
function renderFormasPagamento(){
  const tbody = document.getElementById('fpTable');
  if(!tbody) return;
  if(formasPagamento.length===0){ tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Nenhuma forma cadastrada.</td></tr>'; return; }
  tbody.innerHTML = formasPagamento.map(f=>`<tr>
    <td>${escH(f.nome)}${f.permiteTroco?' <span class="badge">troco</span>':''}${f.ativa?'':' <span class="badge">inativa</span>'}</td>
    <td>${resumoTaxaForma(f)}</td>
    <td>${resumoAcrescimoForma(f)}</td>
    <td>${f.prazoDias>0 ? f.prazoDias+'d' : 'na hora'}</td>
    <td><button class="small-gold" onclick="abrirModalForma('${f.id}')">Editar</button></td>
  </tr>`).join('');
}
async function registrarFormaPagamento(){
  const nome = document.getElementById('fpNome').value.trim();
  if(!nome){ showMsg('fpMsg','Informe o nome da forma de pagamento.','warn'); return; }
  const taxaPct = Number(document.getElementById('fpTaxaPct').value)||0;
  const taxaFixa = Number(document.getElementById('fpTaxaFixa').value)||0;
  const prazoDias = Number(document.getElementById('fpPrazo').value)||0;
  const permiteTroco = document.getElementById('fpTroco').checked;
  const acrescimoPct = Number(document.getElementById('fpAcrPct').value)||0;
  const acrescimoFixo = Number(document.getElementById('fpAcrFixo').value)||0;
  if(acrescimoPct<0||acrescimoPct>100){ showMsg('fpMsg','O acréscimo % deve ficar entre 0 e 100.','warn'); return; }
  if(acrescimoFixo<0||acrescimoFixo>1000){ showMsg('fpMsg','O acréscimo fixo deve ficar entre R$ 0,00 e R$ 1.000,00.','warn'); return; }
  if(taxaPct<0||taxaPct>100){ showMsg('fpMsg','A taxa % deve ficar entre 0 e 100.','warn'); return; }
  if(taxaFixa<0){ showMsg('fpMsg','A taxa fixa não pode ser negativa.','warn'); return; }
  if(prazoDias<0||!Number.isInteger(prazoDias)){ showMsg('fpMsg','O prazo deve ser um número inteiro de dias.','warn'); return; }
  if(!iniciarOperacaoUnica('addForma')) return;
  try{
    const r = await apiCall('addFormaPagamento', { nome, taxaPct, taxaFixa, prazoDias, permiteTroco, acrescimoPct, acrescimoFixo, precoProprio: !!(document.getElementById('fpPrecoProprio')||{}).checked });
    if(r.ok){
      formasPagamento = r.formasPagamento || formasPagamento;
      produtoPrecos = r.produtoPrecos || produtoPrecos;
      comboPrecos = r.comboPrecos || comboPrecos;
      ['fpNome','fpTaxaPct','fpTaxaFixa','fpPrazo','fpAcrPct','fpAcrFixo'].forEach(id=>document.getElementById(id).value='');
      document.getElementById('fpTroco').checked = false;
      renderFormasPagamento(); renderFormaCuradoria(); salvarCache();
      showMsg('fpMsg', r.message, 'ok');
    } else showMsg('fpMsg', r.message, 'warn');
  } catch(e){ showMsg('fpMsg','Não foi possível cadastrar.','warn'); }
  finally { finalizarOperacaoUnica('addForma'); }
}
function abrirModalForma(id){
  const f = formasPagamento.find(x=>x.id===id); if(!f) return;
  document.getElementById('fmId').value = f.id;
  document.getElementById('fmNome').value = f.nome;
  document.getElementById('fmTaxaPct').value = f.taxaPct;
  document.getElementById('fmTaxaFixa').value = f.taxaFixa;
  document.getElementById('fmPrazo').value = f.prazoDias;
  document.getElementById('fmOrdem').value = f.ordem;
  document.getElementById('fmAcrPct').value = f.acrescimoPct||0;
  document.getElementById('fmAcrFixo').value = f.acrescimoFixo||0;
  document.getElementById('fmTroco').checked = !!f.permiteTroco;
  const fpp = document.getElementById('fmPrecoProprio'); if(fpp) fpp.checked = !!f.precoProprio;
  document.getElementById('fmAtiva').checked = !!f.ativa;
  const usada = pagamentosVenda.some(p=>p.forma===f.nome);
  document.getElementById('fmNome').disabled = usada;
  const aviso = document.getElementById('fmAviso');
  aviso.style.display = usada ? 'block' : 'none';
  aviso.textContent = usada ? '• Já usada em vendas: o nome fica travado. Mudanças de taxa e de acréscimo valem só para vendas novas.' : '';
  document.getElementById('fmMsg').innerHTML = '';
  document.getElementById('formaModal').classList.add('open');
}
function fecharModalForma(){ document.getElementById('formaModal').classList.remove('open'); }
async function salvarFormaModal(){
  const id = document.getElementById('fmId').value;
  const novoNome = document.getElementById('fmNome').value.trim();
  const novaTaxaPct = Number(document.getElementById('fmTaxaPct').value)||0;
  const novaTaxaFixa = Number(document.getElementById('fmTaxaFixa').value)||0;
  const novoPrazoDias = Number(document.getElementById('fmPrazo').value)||0;
  const novaOrdem = Number(document.getElementById('fmOrdem').value)||0;
  const novoAcrescimoPct = Number(document.getElementById('fmAcrPct').value)||0;
  const novoAcrescimoFixo = Number(document.getElementById('fmAcrFixo').value)||0;
  if(novoAcrescimoPct<0||novoAcrescimoPct>100){ showMsg('fmMsg','O acréscimo % deve ficar entre 0 e 100.','warn'); return; }
  if(novoAcrescimoFixo<0||novoAcrescimoFixo>1000){ showMsg('fmMsg','O acréscimo fixo deve ficar entre R$ 0,00 e R$ 1.000,00.','warn'); return; }
  if(!novoNome){ showMsg('fmMsg','Informe o nome.','warn'); return; }
  if(novaTaxaPct<0||novaTaxaPct>100){ showMsg('fmMsg','A taxa % deve ficar entre 0 e 100.','warn'); return; }
  if(novaTaxaFixa<0){ showMsg('fmMsg','A taxa fixa não pode ser negativa.','warn'); return; }
  if(novoPrazoDias<0||!Number.isInteger(novoPrazoDias)){ showMsg('fmMsg','O prazo deve ser um número inteiro de dias.','warn'); return; }
  if(!iniciarOperacaoUnica('editForma')) return;
  try{
    const r = await apiCall('editarFormaPagamento', {
      id, novoNome, novoAtivo: document.getElementById('fmAtiva').checked,
      novaTaxaPct, novaTaxaFixa, novoPrazoDias, novaOrdem, novoAcrescimoPct, novoAcrescimoFixo,
      novoPermiteTroco: document.getElementById('fmTroco').checked,
      novoPrecoProprio: !!(document.getElementById('fmPrecoProprio')||{}).checked
    });
    if(r.ok){
      formasPagamento = r.formasPagamento || formasPagamento;
      renderFormasPagamento(); renderFormaCuradoria(); salvarCache();
      if(formaPrecoSelect_()) popularSelectFormaPreco();
      fecharModalForma();
    } else showMsg('fmMsg', r.message, 'warn');
  } catch(e){ showMsg('fmMsg','Não foi possível salvar.','warn'); }
  finally { finalizarOperacaoUnica('editForma'); }
}
function renderFormaCuradoria(){
  const tbody = document.getElementById('formaCuradoriaTable');
  if(!tbody) return;
  tbody.innerHTML = formasPagamento.length ? formasPagamento.map(f=>`<tr>
    <td>${escH(f.nome)}${f.ativa?'':' <span class="badge">inativa</span>'}</td>
    <td><label class="d-flex ai-centro gap-2 jc-centro"><input type="checkbox" class="largura-auto" ${f.visivelCardapio?'checked':''} onchange="toggleFormaVisivelCardapio('${f.id}', this.checked)"></label></td>
  </tr>`).join('') : '<tr class="empty-row"><td colspan="2">Nenhuma forma cadastrada.</td></tr>';
}
async function toggleFormaVisivelCardapio(id, novoValor){
  try{
    const r = await apiCall('editarFormaPagamento', { id, novoVisivelCardapio: novoValor });
    if(r.ok){ formasPagamento = r.formasPagamento || formasPagamento; salvarCache(); renderFormaCuradoria(); }
  } catch(e){}
}
async function editarMeta(tipo){
  const atual = tipo==='MetaMensal' ? metas.mensal : metas.diaria;
  const f = await vsForm({ titulo: tipo==='MetaMensal' ? 'Meta mensal de vendas' : 'Meta diária de vendas', ok:'Salvar meta',
    campos:[ { id:'valor', rotulo:'Valor da meta', sufixo:'R$', tipo:'numero', obrigatorio:true, maiorQueZero:true, valor: atual ? String(atual).replace('.',',') : '' } ] });
  if(!f) return; const valorMeta = Number(f.valor);
  try{ const r = await apiCall('salvarMeta', { tipo, valor: valorMeta }); if(!r || !r.ok){ avisar((r && r.message) || 'Não foi possível salvar a meta.'); return; } metas = r.metas || metas; salvarCache(); atualizarMetaUI(); } catch(e){ avisar('Não foi possível salvar a meta agora.'); }
}
function atualizarMetaUI(){
  document.getElementById('metaMensalTexto').textContent = formatarMoeda(metas.mensal);
  document.getElementById('metaDiariaTexto').textContent = formatarMoeda(metas.diaria);
  const hoje = new Date();
  const vendasMesAtual = vendas.filter(v=>{ const d = new Date(v.timestamp); return v.status==='Confirmada' && d.getFullYear()===hoje.getFullYear() && d.getMonth()===hoje.getMonth(); });
  const totalMes = vendasMesAtual.reduce((s,v)=>s+Number(v.valorTotal),0);
  const pctMes = metas.mensal>0 ? Math.min(100, (totalMes/metas.mensal*100)) : 0;
  document.getElementById('metaMensalBar').style.width = pctMes+'%';
  document.getElementById('metaMensalTextoProgresso').textContent = formatarMoeda(totalMes) + ' / ' + formatarMoeda(metas.mensal) + ' (' + pctMes.toFixed(0) + '%)';

  const hojeISO = dataLocalISO(hoje);
  const vendasHoje = vendas.filter(v=>v.status==='Confirmada' && noTurnoCaixa_(v.timestamp,v));
  const totalHoje = vendasHoje.reduce((s,v)=>s+Number(v.valorTotal),0);
  const pctDia = metas.diaria>0 ? Math.min(100, (totalHoje/metas.diaria*100)) : 0;
  document.getElementById('metaDiariaBar').style.width = pctDia+'%';
  document.getElementById('metaDiariaTextoProgresso').textContent = formatarMoeda(totalHoje) + ' / ' + formatarMoeda(metas.diaria) + ' (' + pctDia.toFixed(0) + '%)';
}
function atualizarResumoHoje(){
  const hoje = dataLocalISO(new Date());
  const vendasHoje = vendas.filter(v=>noTurnoCaixa_(v.timestamp,v) && v.status==='Confirmada');
  const despesasHoje = despesas.filter(d=>noTurnoCaixa_(d.timestamp) && despesaEfetiva(d));
  const totalV = vendasHoje.reduce((s,v)=>s+Number(v.valorTotal),0);
  const totalD = despesasHoje.reduce((s,d)=>s+Number(d.valor),0);
  document.getElementById('fHojeEntradas').textContent = formatarMoeda(totalV);
  document.getElementById('fHojeSaidas').textContent = formatarMoeda(totalD);
  document.getElementById('fHojeSaldo').textContent = formatarMoeda(totalV-totalD);
}
/* D17 — caixas fechados e sangrias arquivados: leitura sob demanda, um mês por vez, com cache na sessão. */
const _hcArqCache_ = {};
async function hcCarregarArquivo_(){
  const box = document.getElementById('hcArqBox'), ym = (document.getElementById('hcMesArq')||{}).value; if(!box) return;
  if(!ym){ box.innerHTML = '<div class="notif-empty">Escolha o mês.</div>'; return; }
  let c = _hcArqCache_[ym];
  if(!c){
    box.innerHTML = '<div class="notif-empty">Buscando o mês na planilha…</div>';
    try{ const j = await sb410Edge_('planilha-admin', { acao:'arquivoCaixa', mes: ym }, 120000); if(!j || !j.ok) throw new Error('arquivo'); c = _hcArqCache_[ym] = j; }
    catch(e){ box.innerHTML = '<div class="notif-empty">Não foi possível ler este mês arquivado agora. Os dados continuam salvos na planilha.<br><button type="button" class="ghost" onclick="hcCarregarArquivo_()">Tentar de novo</button></div>'; return; }
  }
  const d = x => x ? sbDataBr_(x) : '', n = x => formatarMoeda(Number(x)||0), vz = x => (x===''||x==null) ? '—' : n(x), lg = c.logins || {};
  const cx = c.caixas || [], sg = c.sangrias || [], totS = sg.reduce((s,x)=>s+(Number(x.valor)||0),0);
  const quem = id => lg[id] ? '<span class="obs-line">' + escR(lg[id]) + '</span>' : '';
  const atras = h => (h.fechamento_atrasado === true || String(h.fechamento_atrasado).toLowerCase() === 'true') ? '<span class="badge ouro" title="' + escH(h.fechamento_motivo||'') + '">fechamento atrasado</span>' : '';
  box.innerHTML = (cx.length ? '<div style="overflow-x:auto;"><table style="width:100%;font-size:12.5px;"><thead><tr><th>Abertura</th><th>Fechamento</th><th>Fundo</th><th>Vendas</th><th>Despesas</th><th>Saldo</th><th>Contado</th><th>Dif.</th></tr></thead><tbody>' +
    cx.map(h=>'<tr><td>'+escR(d(h.abertura))+quem(h.usuario_abertura)+'</td><td>'+escR(d(h.fechamento))+quem(h.usuario_fechamento)+atras(h)+'</td><td>'+vz(h.fundo_caixa)+'</td><td>'+vz(h.total_vendas)+'</td><td>'+vz(h.total_despesas)+'</td><td>'+n(h.saldo_final)+'</td><td>'+vz(h.valor_contado)+'</td><td>'+(h.diferenca===''||h.diferenca==null?'—':n(h.diferenca))+'</td></tr>').join('') + '</tbody></table></div>'
    : '<div class="notif-empty">Nenhuma sessão arquivada neste mês.</div>') +
    '<div class="info-line">• Sangrias arquivadas no mês: ' + sg.length + ' · total ' + n(totS) + '</div>' +
    (sg.length ? '<details class="mt-2"><summary>Ver as sangrias do mês</summary><div style="overflow-x:auto;"><table style="width:100%;font-size:12.5px;"><thead><tr><th>Data</th><th>Valor</th><th>Motivo</th><th>Quem</th></tr></thead><tbody>' +
      sg.map(x=>'<tr><td>'+escR(d(x.data_hora))+'</td><td>'+n(x.valor)+'</td><td>'+escR(x.motivo||'')+'</td><td>'+escR(lg[x.usuario_id]||'')+'</td></tr>').join('') + '</tbody></table></div></details>' : '');
}
function renderHistoricoCaixa(){
  const tbody = document.getElementById('hcTable');
  if(!historicoCaixa.length){ tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Nenhuma sessão registrada ainda.</td></tr>'; return; }
  const difCell = h => {
    if(h.diferenca===null || h.diferenca===undefined) return '<span class="obs-line">—</span>';
    if(Math.abs(h.diferenca)<0.005) return '<span style="color:#bfe0ae;">confere</span>';
    return `<span style="color:${h.diferenca>0?'var(--gold)':'#ffb3ab'};">${h.diferenca>0?'+':'−'}${formatarMoeda(Math.abs(h.diferenca))}</span><span class="obs-line">${h.diferenca>0?'sobra':'falta'}</span>`;
  };
  tbody.innerHTML = historicoCaixa.map(h=>`<tr><td>${h.abertura}</td><td>${h.fechamento||'<span class="badge pend">Aberto</span>'}${h.fechamentoAtrasado?`<span class="badge ouro" title="${escH(h.fechamentoMotivo||'')}">fechamento atrasado</span>${h.fechamentoMotivo?`<span class="obs-line">${escH(String(h.fechamentoMotivo).replace(/^Fechamento atrasado: o caixa passou do vencimento( — )?/,''))}</span>`:''}`:''}</td><td>${formatarMoeda(h.saldoFinal)}${h.valorContado!==null&&h.valorContado!==undefined?`<span class="obs-line">contado ${formatarMoeda(h.valorContado)}</span>`:''}${h.reconciliadasQtd>0?`<span class="obs-line">inclui ${h.reconciliadasQtd} venda(s) reconciliada(s) após o fechamento${h.reconciliadoDinheiro?' ('+formatarMoeda(h.reconciliadoDinheiro)+' em dinheiro)':''}</span>`:''}</td><td>${difCell(h)}</td><td>${h.usuarioFechamento||h.usuarioAbertura||''}</td></tr>`).join('');
}
/* ---------- FASE 8C — DRE, FLUXO PREVISTO E CONFERÊNCIA DE CAIXA ---------- */
function arred2c(n){ return Math.round((Number(n)||0)*100)/100; }
function pctDe(parte, total){ return total>0 ? (parte/total*100) : 0; }
function fmtPct(n){ return n.toFixed(1).replace('.',',')+'%'; }
function noMes(ts, ano, mes){ const d=new Date(ts); return d.getFullYear()===ano && (d.getMonth()+1)===mes; }
/* ---------- IMPOSTO SOBRE AS VENDAS (estimado) ----------
   Alíquota do mês (Relatórios → DRE) ou, sem ela, a do mês anterior mais próximo; sem nenhuma, a dos dados fiscais da empresa.
   Vale com ou sem nota fiscal ligada. Não muda o custo do produto: entra no resultado e nas margens. */
function ymDe_(ts){ const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0'); }
function impostoPctYm_(ym){
  const I = window.INTEG_ || {}, m = I.impostoMeses || {};
  const ks = Object.keys(m).filter(k=>k<=ym).sort();
  if(ks.length) return Number(m[ks[ks.length-1]])||0;
  return Number(I.impostoPadrao)||0;
}
function impostoPctMes_(ano, mes){ return impostoPctYm_(ano + '-' + String(mes).padStart(2,'0')); }
function impostoPctHoje_(){ return impostoPctYm_(ymDe_(Date.now())); }
/* Soma o imposto de uma lista, cada item pela alíquota do mês dele. */
function impostoDoPeriodo_(lista, fTs, fValor){
  return arred2c((lista||[]).reduce((s,x)=>{ const t = fTs(x); if(!t || isNaN(t)) return s; const pct = impostoPctYm_(ymDe_(t)); return s + (pct>0 ? (Number(fValor(x))||0)*pct/100 : 0); }, 0));
}
/* DAS pago: refere-se ao mês anterior ao pagamento (ou à competência, se informada). Se aquele mês tem alíquota, o imposto
   já está estimado na linha de imposto — o DAS não entra de novo como despesa (senão o imposto contaria duas vezes). */
function despesaEhDas_(d){ return !!d && d.categoria === 'Imposto das vendas (DAS)'; }
function dasJaEstimado_(d){
  if(!despesaEhDas_(d)) return false;
  let ym = /^\d{4}-\d{2}/.test(d.competencia||'') ? String(d.competencia).slice(0,7) : '';
  if(!ym){ const t = new Date(d.timestamp); t.setDate(1); t.setMonth(t.getMonth()-1); ym = ymDe_(t.getTime()); }
  return impostoPctYm_(ym) > 0;
}
/* Vendas por competência (data da venda). Despesas e perdas pelo que efetivamente saiu no mês. */
function calcularDRE(ano, mes){
  const ini = new Date(ano, mes - 1, 1).getTime();   // mes vem de 1 a 12
  const fim = new Date(ano, mes, 1).getTime();
  const vendasMes = vendas.filter(v=>v.status==='Confirmada' && noMes(v.timestamp, ano, mes));
  const ids = new Set(vendasMes.map(v=>v.id));
  const receitaBruta = arred2c(vendasMes.reduce((s,v)=>s+(Number(v.valorOriginal)||Number(v.valorTotal)||0),0));
  const descontos = arred2c(vendasMes.reduce((s,v)=>s+(Number(v.valorDesconto)||0),0));
  const receitaLiquida = arred2c(vendasMes.reduce((s,v)=>s+(Number(v.valorTotal)||0),0));
  const entregaAcresc = arred2c(receitaLiquida - receitaBruta + descontos);   // taxa de entrega e acréscimo da forma cobrados do cliente
  const aReceber = arred2c(vendasMes.filter(v=>v.statusPagamento==='A Receber').reduce((s,v)=>s+(Number(v.valorTotal)||0),0));
  const taxasPag = arred2c(pagamentosVenda.filter(p=>ids.has(p.vendaId)).reduce((s,p)=>s+(Number(p.taxa)||0),0));
  const cmv = arred2c(vendasMes.reduce((s,v)=>s+(Number(v.custoTotal)||0),0));
  const custoPorNome = {}; estoque.forEach(e=>{ custoPorNome[e.nome] = Number(e.custo)||0; });
  const perdas = arred2c(movimentacoesEstoque.filter(m=>m.tipo==='Perda' && noMes(m.data, ano, mes)).reduce((s,m)=>s+Math.abs(Number(m.quantidade)||0)*(custoPorNome[m.ingredienteNome]||0),0));
  /* ITEM 2.6: despesas geradas por Ajuste pós-venda ficam FORA daqui — a fonte única é a lista de ajustes (evita contar duas vezes). */
  const despTodas = despesas.filter(d=>despesaEfetiva(d) && d.categoria!=='Ajuste pós-venda' && noMes(d.timestamp, ano, mes));
  const dasPago = arred2c(despTodas.filter(dasJaEstimado_).reduce((s,d)=>s+Number(d.valor),0));
  const despMes = despTodas.filter(d=>!dasJaEstimado_(d));
  const ajMes = (ajustesPosVenda||[]).filter(a=>a.status==='Ativo' && noMes(a.timestamp, ano, mes));
  const ajustesTotal = arred2c(ajMes.filter(a=>a.tipo!=='Crédito para próxima compra').reduce((s,a)=>s+Number(a.valor),0));
  const creditosConcedidos = arred2c(ajMes.filter(a=>a.tipo==='Crédito para próxima compra').reduce((s,a)=>s+Number(a.valor),0));
  const despPorCat = {}; despMes.forEach(d=>{ const c=d.categoria||'Outros'; despPorCat[c]=(despPorCat[c]||0)+Number(d.valor); });
  const despesasTotal = arred2c(despMes.reduce((s,d)=>s+Number(d.valor),0));
  const evs = (eventos||[]).filter(e=>{ const t=new Date(e.data).getTime(); return !isNaN(t) && t>=ini && t<fim && e.status!=='Orçamento' && e.status!=='Cancelado'; });
  const receitaEventos = somaR(evs,e=>e.valorContratado), custosEventos = somaR(evs,e=>e.custoTotal);
  const aReceberEventos = somaR(evs,e=>e.valorAReceber);
  const lucroBrutoComEventos = arred2c(receitaLiquida - taxasPag - cmv + receitaEventos - custosEventos);
  /* imposto ESTIMADO sobre tudo o que foi faturado no mês (vendas + eventos), pela alíquota do mês — com ou sem nota fiscal */
  const impostoPct = impostoPctMes_(ano, mes);
  const impostos = impostoPct > 0 ? arred2c((receitaLiquida + receitaEventos) * impostoPct / 100) : 0;
  const resultadoComEventos = arred2c(lucroBrutoComEventos - impostos - perdas - despesasTotal - ajustesTotal);
  return { vendasMes, impostos, impostoPct, dasPago, entregaAcresc, ajustesTotal, creditosConcedidos, receitaBruta, descontos, receitaLiquida, aReceber:aReceber+aReceberEventos, taxasPag, cmv, perdas, despPorCat, despesasTotal, lucroBruto:lucroBrutoComEventos, resultado:resultadoComEventos, receitaEventos, custosEventos,
    margemBruta: pctDe(lucroBrutoComEventos, receitaLiquida+receitaEventos), margemLiquida: pctDe(resultadoComEventos, receitaLiquida+receitaEventos), taxasPct: pctDe(taxasPag, receitaLiquida+receitaEventos),
    ticket: vendasMes.length ? receitaLiquida/vendasMes.length : 0 };
}
function renderDRE(dre, deltaTxt){
  const L = (rotulo, valor, o={})=>`<tr${o.forte?' class="fw-7"':''}><td style="${o.recuo?'padding-left:16px;color:var(--muted);':''}">${rotulo}</td><td style="text-align:right;${o.cor?'color:'+o.cor+';':''}">${o.neg?'− ':''}${o.pos?'+ ':''}${formatarMoeda(valor)}</td><td class="txt-dir txt-muted fs-2xs">${o.pct!==undefined?fmtPct(o.pct):''}</td></tr>`;
  const cats = Object.entries(dre.despPorCat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>L(c, v, {recuo:true, neg:true, pct:pctDe(v, dre.receitaLiquida)})).join('');
  const corRes = dre.resultado>=0 ? '#bfe0ae' : '#ffb3ab';
  const pctTxt = n => String(Number(n)||0).replace('.',',');
  document.getElementById('rDRE').innerHTML = `<table><tbody>
    ${L('Vendas (antes do desconto)', dre.receitaBruta)}
    ${L('Descontos', dre.descontos, {recuo:true, neg:true})}
    ${Math.abs(dre.entregaAcresc||0)>0.009 ? L('Taxa de entrega e acréscimos cobrados', dre.entregaAcresc, {recuo:true, pos:true}) : ''}
    ${L('Receita líquida', dre.receitaLiquida, {forte:true, pct:100})}
    ${L('Faturamento de eventos', dre.receitaEventos||0, {forte:true})}
    ${L('Custos de eventos', dre.custosEventos||0, {neg:true})}
    ${L('Taxas de pagamento e comissões', dre.taxasPag, {neg:true, pct:dre.taxasPct})}
    ${L('Custo dos produtos vendidos', dre.cmv, {neg:true, pct:pctDe(dre.cmv, dre.receitaLiquida)})}
    ${L('Lucro bruto', dre.lucroBruto, {forte:true, pct:dre.margemBruta})}
    ${dre.impostoPct>0 ? L('Imposto sobre vendas (estimado, ' + pctTxt(dre.impostoPct) + '%)', dre.impostos, {neg:true, pct:pctDe(dre.impostos, dre.receitaLiquida)}) : ''}
    ${L('Perdas de estoque', dre.perdas, {neg:true, pct:pctDe(dre.perdas, dre.receitaLiquida)})}
    ${L('Despesas pagas', dre.despesasTotal, {neg:true, pct:pctDe(dre.despesasTotal, dre.receitaLiquida)})}
    ${cats}
    ${L('Ajustes pós-venda', dre.ajustesTotal||0, {neg:true, pct:pctDe(dre.ajustesTotal||0, dre.receitaLiquida)})}
    ${L('Resultado do mês', dre.resultado, {forte:true, cor:corRes, pct:dre.margemLiquida})}
  </tbody></table>
  <div class="stat-row mt-3">
    <div class="stat-box"><b class="txt-ouro">${fmtPct(dre.margemLiquida)}</b><span>MARGEM LÍQUIDA</span></div>
    <div class="stat-box"><b class="txt-ouro">${formatarMoeda(dre.ticket)}</b><span>TICKET MÉDIO</span></div>
    <div class="stat-box"><b class="txt-ouro">${fmtPct(dre.taxasPct)}</b><span>TAXAS / RECEITA</span></div>
  </div>
  ${deltaTxt?`<div class="info-line">${deltaTxt}</div>`:''}
  ${dre.creditosConcedidos>0?`<div class="info-line">• Créditos concedidos no mês (ainda a usar, não descontados do resultado): ${formatarMoeda(dre.creditosConcedidos)}.</div>`:''}
  ${dre.aReceber>0?`<div class="info-line">• Desta receita, ${formatarMoeda(dre.aReceber)} ainda está a receber (não pago).</div>`:''}
  ${dre.dasPago>0?`<div class="info-line">• DAS pago neste mês: ${formatarMoeda(dre.dasPago)}. Ele não entra de novo nas despesas, porque o imposto já é estimado mês a mês pela alíquota (o DAS pago agora é o do mês anterior — compare com a linha de imposto daquele mês). Se ficar muito diferente, confira a alíquota com o contador.</div>`:''}
  ${dre.impostoPct>0?'':'<div class="info-line">• Imposto sobre vendas: sem alíquota cadastrada. Informe abaixo a alíquota que o contador passar; enquanto isso, o DAS que você paga entra como despesa comum.</div>'}
  <div class="info-line">• Vendas contam pela data da venda; despesas e perdas, pelo mês em que saíram. A taxa de entrega cobrada do cliente entra na receita; o repasse ao entregador entra nas despesas (Entregadores) quando o fechamento das entregas é pago. Perdas usam o custo atual do ingrediente. Vendas antigas, de antes das taxas, aparecem sem taxa.</div>`;
}
/* Caixa "Imposto sobre vendas deste mês" (só Admin): mostra a alíquota própria do mês ou de qual mês ela está vindo. */
function aliqBoxAtualizar_(ano, mes){
  const box = document.getElementById('rAliqBox'); if(!box) return;
  const admin = !!(currentUser && currentUser.nivel === 'Admin');
  box.style.display = admin ? '' : 'none'; if(!admin) return;
  const ym = ano + '-' + String(mes).padStart(2,'0'), m = (window.INTEG_ && INTEG_.impostoMeses) || {};
  const inp = document.getElementById('rAliquota'), nota = document.getElementById('rAliqNota');
  const proprio = Object.prototype.hasOwnProperty.call(m, ym);
  if(inp && document.activeElement !== inp) inp.value = proprio ? String(m[ym]).replace('.',',') : '';
  if(nota){
    const pct = impostoPctYm_(ym), ks = Object.keys(m).filter(k=>k<ym).sort(), de = ks.length ? ks[ks.length-1] : '';
    nota.textContent = proprio ? 'Alíquota própria deste mês. Apague e salve para voltar a usar a do mês anterior.'
      : (pct > 0 ? 'Sem alíquota própria: usando ' + String(pct).replace('.',',') + '% ' + (de ? '(de ' + de.slice(5) + '/' + de.slice(0,4) + ')' : '(dos dados fiscais da empresa)') + '. Vale também para os meses seguintes até você mudar.'
                 : 'Nenhuma alíquota cadastrada: o imposto não é estimado. O contador informa a alíquota efetiva do Simples (ex.: 6).');
  }
}
async function salvarAliquotaMes_(){
  const ym = (document.getElementById('rMes')||{}).value, v = String((document.getElementById('rAliquota')||{}).value||'').trim();
  if(!ym) return showMsg('rAliqMsg','Escolha o mês primeiro.','warn');
  if(v && !/^\d{1,2}([.,]\d{1,2})?$/.test(v)) return showMsg('rAliqMsg','Use só o número, por exemplo 6 ou 6,5.','warn');
  if(!iniciarOperacaoUnica('aliquotaMes')) return;
  try{
    const r = await apiCall('salvarAliquotaMes', { competencia: ym, aliquota: v });
    if(r && r.ok){
      window.INTEG_ = Object.assign({}, window.INTEG_ || {}, { impostoPct:Number(r.impostoPct)||0, impostoPadrao:Number(r.impostoPadrao)||0, impostoMeses:r.impostoMeses||{} });
      showMsg('rAliqMsg', r.message || 'Salvo.', 'ok');
      try{ document.getElementById('rAliquota').blur(); }catch(e){}
      gerarRelatorio();
    } else showMsg('rAliqMsg', (r && r.message) || 'Não foi possível salvar.', 'warn');
  }catch(e){ showMsg('rAliqMsg','Sem conexão. Tente de novo.','warn'); }
  finally{ finalizarOperacaoUnica('aliquotaMes'); }
}
/* Fluxo dos próximos 30 dias: recebimentos de cartão/app com prazo (líquidos de taxa) × contas a pagar. */
function renderFluxoPrevisto(){
  const tb = document.getElementById('fluxoTable'); if(!tb) return;
  const agoraMs = Date.now(), DIA = 86400000;
  const faixas = [{n:'Vencidas / hoje',ent:0,sai:0},{n:'1 a 7 dias',ent:0,sai:0},{n:'8 a 14 dias',ent:0,sai:0},{n:'15 a 30 dias',ent:0,sai:0}];
  const idxFaixa = dias => dias<=0 ? 0 : dias<=7 ? 1 : dias<=14 ? 2 : dias<=30 ? 3 : -1;
  const prazoPorForma = {}; formasPagamento.forEach(f=>{ prazoPorForma[f.nome] = Number(f.prazoDias)||0; });
  const vendasPagas = new Map(vendas.filter(v=>v.status==='Confirmada' && v.statusPagamento!=='A Receber').map(v=>[v.id, v]));
  pagamentosVenda.forEach(p=>{
    const v = vendasPagas.get(p.vendaId); if(!v) return;
    const prazo = prazoPorForma[p.forma]||0; if(prazo<=0) return;
    const quando = (v.timestampRecebimento||v.timestamp) + prazo*DIA;
    if(quando <= agoraMs) return;
    const i = idxFaixa(Math.ceil((quando-agoraMs)/DIA)); if(i<0) return;
    faixas[i].ent += Math.max(0, Number(p.valor) - (Number(p.taxa)||0));
  });
  const hojeISO = dataLocalISO(new Date());
  despesas.filter(d=>d.status==='Confirmada' && d.situacao==='A pagar' && d.vencimento).forEach(d=>{
    const dias = Math.round((new Date(d.vencimento+'T12:00:00') - new Date(hojeISO+'T12:00:00'))/DIA);
    const i = idxFaixa(dias); if(i<0) return;
    faixas[i].sai += Number(d.valor);
  });
  let acum = 0, totE = 0, totS = 0;
  tb.innerHTML = faixas.map(f=>{
    const saldo = f.ent - f.sai; acum += saldo; totE += f.ent; totS += f.sai;
    return `<tr><td>${f.n}</td><td class="txt-dir">${formatarMoeda(f.ent)}</td><td class="txt-dir">${formatarMoeda(f.sai)}</td><td style="text-align:right;color:${acum>=0?'#bfe0ae':'#ffb3ab'};">${formatarMoeda(acum)}</td></tr>`;
  }).join('') + `<tr class="fw-7"><td>Total 30 dias</td><td class="txt-dir">${formatarMoeda(totE)}</td><td class="txt-dir">${formatarMoeda(totS)}</td><td class="txt-dir">${formatarMoeda(totE-totS)}</td></tr>`;
  const fiado = arred2c(vendas.filter(v=>v.status==='Confirmada' && v.statusPagamento==='A Receber').reduce((s,v)=>s+(Number(v.valorTotal)||0),0));
  document.getElementById('fluxoFiado').textContent = fiado>0 ? `• Vendas a receber sem data (fiado/conta): ${formatarMoeda(fiado)} — não entram na projeção.` : '';
}
/* Saldo de dinheiro físico esperado na gaveta agora (mesma conta do backend). */
function saldoEsperadoGaveta(){
  if(!sessaoCaixa) return 0;
  const abertura = sessaoCaixa.aberturaTimestamp;
  // Alinhado ao servidor (api_fechar_caixa): dinheiro conta na sessão em que ENTROU (recebido_em), não na em que a venda foi criada.
  const idsVendas = new Set(vendas.filter(v=>{
    if(v.status !== 'Confirmada' || v.statusPagamento === 'A Receber') return false;
    const quando = v.timestampRecebimento || v.timestamp;
    return quando >= abertura;
  }).map(v=>v.id));
  const { totalDinheiro } = totaisPorFormaNaSessao(idsVendas);
  const desp = despesas.filter(d=>despesaEfetiva(d) && d.saiuDoCaixa!==false && d.timestamp>=abertura).reduce((s,d)=>s+Number(d.valor),0);
  const sang = sangrias.filter(s=>s.timestamp>=abertura).reduce((s,sg)=>s+Number(sg.valor),0);
  return arred2c(sessaoCaixa.fundoCaixa + totalDinheiro - desp - sang);
}

function gerarRelatorio(){
  const mesInput = document.getElementById('rMes').value;
  if(!mesInput) return;
  const [ano, mes] = mesInput.split('-').map(Number);
  const dre = calcularDRE(ano, mes);
  const vendasMes = dre.vendasMes;
  let anoAnt = ano, mesAnt = mes-1; if(mesAnt===0){ mesAnt=12; anoAnt=ano-1; }
  const totalAnterior = calcularDRE(anoAnt, mesAnt).receitaLiquida;
  let deltaTxt = '';
  if(totalAnterior>0){
    const pct = ((dre.receitaLiquida-totalAnterior)/totalAnterior*100);
    deltaTxt = (pct>=0?'▲ ':'▼ ') + Math.abs(pct).toFixed(0) + '% de receita vs mês anterior';
  }
  renderDRE(dre, deltaTxt);
  try{ aliqBoxAtualizar_(ano, mes); }catch(e){}
  document.getElementById('rContagem').textContent = vendasMes.length+' venda(s) confirmada(s) no período.';

  const idsVendasMes = new Set(vendasMes.map(v=>v.id));
  const pagamentosMes = pagamentosVenda.filter(p=>idsVendasMes.has(p.vendaId));
  const porPagamento = {};
  const taxaPorForma = {};
  pagamentosMes.forEach(p=>{ porPagamento[p.forma] = (porPagamento[p.forma]||0) + Number(p.valor); taxaPorForma[p.forma] = (taxaPorForma[p.forma]||0) + (Number(p.taxa)||0); });
  document.getElementById('rPagamentos').innerHTML = Object.keys(porPagamento).length ? Object.entries(porPagamento).map(([forma,val])=>`<div class="info-line">${forma}: <b>${formatarMoeda(val)}</b>${taxaPorForma[forma]>0?` <span class="txt-muted">(taxa ${formatarMoeda(taxaPorForma[forma])})</span>`:''}</div>`).join('') : '<div class="notif-empty">Sem vendas no período.</div>';

  const itensDoMes = itensVenda.filter(it=>idsVendasMes.has(it.vendaId));
  const ranking = {};
  itensDoMes.forEach(it=>{ ranking[it.descricao] = (ranking[it.descricao]||0) + Number(it.quantidade); });
  const rankingOrdenado = Object.entries(ranking).sort((a,b)=>b[1]-a[1]).slice(0,5);
  document.getElementById('rRanking').innerHTML = rankingOrdenado.length ? rankingOrdenado.map(([nome,qtd],idx)=>`<tr><td>${idx+1}º ${escH(nome)}</td><td class="txt-dir">${qtd}x</td></tr>`).join('') : '<tr class="empty-row"><td>Sem vendas no período.</td></tr>';

  renderizarGrafico(vendasMes, ano, mes);
}
function renderizarGrafico(vendasMes, ano, mes){
  const diasNoMes = new Date(ano, mes, 0).getDate();
  if(!Number.isFinite(diasNoMes) || diasNoMes < 28 || diasNoMes > 31){
    document.getElementById('rGrafico').innerHTML = '<div class="notif-empty">Período inválido para o gráfico.</div>';
    return;
  }
  const totalPorDia = new Array(diasNoMes+1).fill(0);
  vendasMes.forEach(v=>{ const d = new Date(v.timestamp).getDate(); totalPorDia[d] += Number(v.valorTotal); });
  const max = Math.max(...totalPorDia, 1);
  const caixa = document.getElementById('rGrafico'), larg = caixa ? Math.round(caixa.clientWidth) : 0;
  const largura = larg >= 200 ? larg : 300, altura = larg >= 200 ? 110 : 90, barW = largura/diasNoMes, fonte = larg >= 200 ? 10 : 7;
  let svg = larg >= 200 ? `<svg viewBox="0 0 ${largura} ${altura+16}" width="${largura}" height="${altura+16}" style="display:block;max-width:100%;">` : `<svg viewBox="0 0 ${largura} ${altura+16}" style="width:100%;height:auto;">`;
  for(let d=1; d<=diasNoMes; d++){
    const h = (totalPorDia[d]/max) * altura;
    svg += `<rect x="${(d-1)*barW+1}" y="${altura-h}" width="${barW-1.5}" height="${h}" fill="#e0b53a" rx="1"></rect>`;
    if((d % 5 === 0 && diasNoMes - d >= 2) || d === 1 || d === diasNoMes) svg += `<text x="${(d-1)*barW+barW/2}" y="${altura+13}" font-size="${fonte}" fill="#bfae8f" text-anchor="middle">${d}</text>`;
  }
  svg += `</svg>`;
  document.getElementById('rGrafico').innerHTML = svg;
}

/* ============================================================
   NOTIFICAÇÕES
   ============================================================ */
function renderNotificacoes(){
  const fidBox = document.getElementById('notifFidelidade');
  const quase = fidelidadeClientes.filter(f=>f.carimbos===9);
  fidBox.innerHTML = quase.length ? quase.map(f=>`<div class="notif-card"><b>${escH(f.nome)}</b> — ${escH(f.telefone)} — está com 9/10 marcas. No próximo pedido ganha o prêmio!</div>`).join('') : '<div class="notif-empty">Nenhum cliente perto de completar.</div>';

  const indBox = document.getElementById('notifIndicacoes');
  const pendentes = indicacoes.filter(i=>!i.resgatado);
  indBox.innerHTML = pendentes.length ? pendentes.map(i=>`<div class="notif-card"><b>${escH(i.nomeIndicador)}</b> — ${i.telIndicador} — indicou ${escH(i.nomeIndicado)} e ainda não recebeu o prêmio.<br><button class="ghost mt-2" onclick="abrirPerfilClientePorTelefone('${i.telIndicador}')">abrir cadastro do cliente</button></div>`).join('') : '<div class="notif-empty">Nenhuma indicação pendente.</div>';

  const estBox = document.getElementById('notifEstoque');
  const baixos = estoque.filter(e=>e.ativo!==false && Number(e.minimo)>0 && e.quantidade<=e.minimo);
  estBox.innerHTML = baixos.length ? baixos.map(e=>`<div class="notif-card"><b>${escH(e.nome)}</b> — restam ${e.quantidade} ${e.unidade||'un'} (mínimo ${e.minimo} ${e.unidade||'un'})</div>`).join('') : '<div class="notif-empty">Estoque em dia.</div>';

  /* MELHORIA 4.4 — estes dois cartões percorrem todos os clientes e NÃO entram na contagem do alerta: só são montados com a aba aberta. */
  const _notifAtiva = ((document.querySelector('section.tab.active')||{}).id === 'tab-notificacoes') || window.__avisosAberto_ === true;
  const agora = Date.now();
  if(_notifAtiva){
  const aniBox = document.getElementById('notifAniversario');
  const mesAtual = new Date().getMonth()+1;
  const aniversariantes = clientes.filter(c=>{ if(!c.dataNascimento) return false; const partes = String(c.dataNascimento).split('-'); if(partes.length<2) return false; return Number(partes[1]) === mesAtual; });
  aniBox.innerHTML = aniversariantes.length ? aniversariantes.map(c=>`<div class="notif-card"><b>${escH(c.nome)}</b> — ${escH(c.telefone)} — aniversário em ${c.dataNascimento.split('-').reverse().join('/')}</div>`).join('') : '<div class="notif-empty">Nenhum aniversariante este mês.</div>';

  const inatBox = document.getElementById('notifInativos');
  const inativos = clientes.filter(c=>{ const u = ultimaAtividadeCliente(c); return !u || (agora-u)/86400000 > 30; });
  inatBox.innerHTML = inativos.length ? inativos.slice(0,10).map(c=>`<div class="notif-card"><b>${escH(c.nome)}</b> — ${escH(c.telefone)}</div>`).join('') + (inativos.length>10?`<div class="notif-empty">+ ${inativos.length-10} outro(s).</div>`:'') : '<div class="notif-empty">Nenhum cliente inativo.</div>';
  }

  const alertasEntrega = alertasDeEntregas();
  const entBox = document.getElementById('notifEntregas');
  if(entBox) entBox.innerHTML = alertasEntrega.length ? alertasEntrega.map(a=>`<div class="notif-card">${a}</div>`).join('') : '<div class="notif-empty">Entregas em dia.</div>';
  const ocBox = document.getElementById('notifOcorrencias');
  const ocAbertas = ocorrenciasAbertas_();
  if(ocBox) ocBox.innerHTML = ocAbertas.length ? ocAbertas.slice().sort((a,b)=>b.numero-a.numero).map(o=>`<div class="notif-card"><b>#${o.numero}</b> — ${escOc_(o.tipo)} · ${escOc_(o.status)}<div class="obs-line">${escOc_(o.descricao)}</div>${podeTratarOcorrencia_()?`<button class="ghost mt-2" onclick="abrirGerirOcorrencia('${o.id}')">Tratar</button>`:''}</div>`).join('') : '<div class="notif-empty">Nenhuma ocorrência aberta.</div>';
  /* ITENS 64/65: novos avisos (pedidos, financeiro, sistema) + filtro por evento/perfil configurado pelo Admin */
  const pedBox = document.getElementById('notifPedidos');
  const pedidosNovos = vendas.filter(v=>v.status==='Confirmada' && v.statusPedido==='Recebido');
  if(pedBox) pedBox.innerHTML = pedidosNovos.length ? pedidosNovos.map(v=>`<div class="notif-card"><b>#${rotuloPedido(v)}</b> — ${escOc_(v.cliente||'Sem nome')} · ${escOc_(v.tipoEntrega||'')}</div>`).join('') : '<div class="notif-empty">Nenhum pedido esperando.</div>';
  const finBox = document.getElementById('notifFinanceiro');
  const hojeISO = dataLocalISO(new Date());
  const vencidas = despesas.filter(d=>d.status!=='Cancelada' && d.situacao==='A pagar' && d.vencimento && d.vencimento<hojeISO);
  if(finBox) finBox.innerHTML = vencidas.length ? vencidas.slice(0,10).map(d=>`<div class="notif-card"><b>${escOc_(d.descricao)}</b> — R$ ${Number(d.valor).toFixed(2).replace('.',',')} · venceu em ${String(d.vencimento).split('-').reverse().join('/')}</div>`).join('') + (vencidas.length>10?`<div class="notif-empty">+ ${vencidas.length-10} outra(s).</div>`:'') : '<div class="notif-empty">Nenhuma despesa vencida.</div>';
  const sisBox = document.getElementById('notifSistema');
  const sisItens = [];
  const errosFila = (typeof _fila!=='undefined' ? _fila : []).filter(i=>i.estado==='erro').length;
  if(errosFila) sisItens.push(`<b>${errosFila}</b> item(ns) da fila de envio com erro. Toque em "na fila" no topo para tentar de novo.`);
  if(sistemaAlertas_.backup) sisItens.push(escOc_(sistemaAlertas_.backup));
  if(sistemaAlertas_.drive) sisItens.push(escOc_(sistemaAlertas_.drive));
  if(sistemaAlertas_.driveCont) sisItens.push(escOc_(sistemaAlertas_.driveCont));
  if(sistemaAlertas_.copiaBackup) sisItens.push(escOc_(sistemaAlertas_.copiaBackup));
  if(sisBox) sisBox.innerHTML = sisItens.length ? sisItens.map(t=>`<div class="notif-card">${t}</div>`).join('') : '<div class="notif-empty">Sistema em ordem.</div>';
  const contagem = { pedido:pedidosNovos.length, entrega:alertasEntrega.length, estoque:baixos.length, financeiro:vencidas.length, ocorrencia:ocAbertas.length, sistema:sisItens.length, fidelidade:quase.length, indicacao:pendentes.length, aniversario:0, inativos:0 };
  let totalAlertas = 0;
  Object.keys(NOTIF_CARDS_).forEach(ev=>{
    const box = document.getElementById(NOTIF_CARDS_[ev]); if(!box || !box.parentElement) return;
    const visivel = notifAtivoParaMim_(ev);
    box.parentElement.style.display = visivel ? '' : 'none';
    if(visivel) totalAlertas += contagem[ev] || 0;
  });
  document.getElementById('notifDot').parentElement.classList.toggle('has-alert', totalAlertas>0);
  try{ if(window.balaoAvisosRender_) window.balaoAvisosRender_(totalAlertas); }catch(e){}
}
/* ---------- NOTIFICAÇÕES ADMINISTRATIVAS: catálogo, filtro por perfil e tela de configuração (ITENS 64/65) ---------- */
const NOTIF_CARDS_ = { pedido:'notifPedidos', entrega:'notifEntregas', estoque:'notifEstoque', financeiro:'notifFinanceiro', ocorrencia:'notifOcorrencias', sistema:'notifSistema', fidelidade:'notifFidelidade', indicacao:'notifIndicacoes', aniversario:'notifAniversario', inativos:'notifInativos' };
const NOTIF_EVENTOS_UI_ = [
  { id:'pedido', grupo:'Pedidos', rotulo:'Pedidos novos aguardando aceite', padrao:['Admin','Operador'] },
  { id:'entrega', grupo:'Entregas', rotulo:'Entregas sem entregador, paradas ou fechamento pendente', padrao:['Admin','Operador'] },
  { id:'estoque', grupo:'Estoque', rotulo:'Estoque baixo', padrao:['Admin','Operador','Cozinha'] },
  { id:'financeiro', grupo:'Financeiro', rotulo:'Despesas vencidas a pagar', padrao:['Admin'] },
  { id:'ocorrencia', grupo:'Ocorrências', rotulo:'Ocorrências abertas', padrao:['Admin','Operador'] },
  { id:'sistema', grupo:'Sistema', rotulo:'Falha de backup, Drive crítico e fila de envio com erro', padrao:['Admin'] },
  { id:'fidelidade', grupo:'Clientes', rotulo:'Cliente prestes a completar o cartão fidelidade', padrao:['Admin','Operador'] },
  { id:'indicacao', grupo:'Clientes', rotulo:'Indicações pendentes de resgate', padrao:['Admin','Operador'] },
  { id:'aniversario', grupo:'Clientes', rotulo:'Aniversariantes do mês', padrao:['Admin','Operador'] },
  { id:'inativos', grupo:'Clientes', rotulo:'Clientes inativos (30+ dias)', padrao:['Admin','Operador'] }
];
const NOTIF_PERFIS_UI_ = ['Admin','Operador','Cozinha'];
function notifConfigDe_(ev){
  const c = configNotificacoes && configNotificacoes[ev.id];
  return c ? { ativo:c.ativo!==false, perfis:(c.perfis||[]) } : { ativo:true, perfis:ev.padrao };
}
function notifAtivoParaMim_(evId){
  let nivel = currentUser && currentUser.nivel; if(!nivel) return false;
  if(nivel === 'Desenvolvedor') nivel = 'Admin';
  const ev = NOTIF_EVENTOS_UI_.find(e=>e.id===evId); if(!ev) return false;
  const c = notifConfigDe_(ev);
  return c.ativo && c.perfis.indexOf(nivel) !== -1;
}
function renderConfigNotificacoes(){
  const box = document.getElementById('notifCfgLista'); if(!box) return;
  let grupo = '', linhas = '';
  NOTIF_EVENTOS_UI_.forEach(ev=>{
    const c = notifConfigDe_(ev);
    if(ev.grupo !== grupo){ grupo = ev.grupo; linhas += `<tr><td colspan="5" style="padding-top:10px;font-weight:700;color:var(--gold);">${grupo}</td></tr>`; }
    linhas += `<tr><td style="white-space:normal;min-width:170px;">${ev.rotulo}</td>
      <td align="center"><input type="checkbox" data-nev="${ev.id}" data-ncampo="ativo" ${c.ativo?'checked':''}></td>` +
      NOTIF_PERFIS_UI_.map(p=>`<td align="center"><input type="checkbox" data-nev="${ev.id}" data-ncampo="${p}" ${c.perfis.indexOf(p)!==-1?'checked':''}></td>`).join('') + '</tr>';
  });
  box.innerHTML = `<table><thead><tr><th align="left">Aviso</th><th>Ligado</th>${NOTIF_PERFIS_UI_.map(p=>`<th>${p}</th>`).join('')}</tr></thead><tbody>${linhas}</tbody></table>`;
}
async function salvarConfigNotificacoesUI(){
  const eventos = {};
  NOTIF_EVENTOS_UI_.forEach(ev=>{
    const q = campo => document.querySelector(`[data-nev="${ev.id}"][data-ncampo="${campo}"]`);
    eventos[ev.id] = { ativo: !!(q('ativo')&&q('ativo').checked), perfis: NOTIF_PERFIS_UI_.filter(p=>q(p)&&q(p).checked) };
  });
  try{
    const r = await apiCall('salvarConfigNotificacoes', { eventos });
    if(r.ok){ configNotificacoes = r.config || configNotificacoes; salvarCache(); renderConfigNotificacoes(); renderNotificacoes(); showMsg('notifCfgMsg', r.message, 'ok'); }
    else showMsg('notifCfgMsg', r.message || 'Não foi possível salvar.', 'warn');
  } catch(e){ showMsg('notifCfgMsg', 'Sem conexão com o servidor. Tente novamente.', 'warn'); }
}
function abrirPerfilClientePorTelefone(tel){
  const c = clientes.find(x=>normTel(x.telefone)===normTel(tel));
  if(!c){ avisar('Cliente não encontrado no cadastro.'); return; }
  abrirPerfilCliente(c.id);
}

/* ============================================================
   USUÁRIOS (ADMIN)
   ============================================================ */
async function criarUsuarioApp(){
  const novoLogin = document.getElementById('uNovoLogin').value.trim();
  const novaSenha = document.getElementById('uNovaSenha').value;
  const nivel = document.getElementById('uNovoNivel').value;
  const senhaAdminConfirmacao = document.getElementById('uSenhaAdminNovo').value;
  if(!novoLogin || !novaSenha){ showMsg('uMsg','Preencha login e senha.','warn'); return; }
  if(nivel==='Entregador' && !telefoneWhatsApp_(document.getElementById('uNovoTelefone').value)){
    showMsg('uMsg','Para entregador, informe o telefone com DDD. É para esse número que as entregas são enviadas pelo WhatsApp.','warn'); return;
  }
  try{
    const nome = document.getElementById('uNovoNome').value.trim(), telefone = document.getElementById('uNovoTelefone').value.trim();
    const r = await apiCall('criarUsuario', { novoLogin, novaSenha, nivel, senhaAdminConfirmacao, nome, telefone });
    usuarios = r.usuarios || usuarios; salvarCache();
    if(r.ok){ fecharFormModal('usuarioNovoModal'); showMsg('uMsgLista', r.message, 'ok'); ['uNovoLogin','uNovoNome','uNovoTelefone','uNovaSenha','uSenhaAdminNovo'].forEach(id=>document.getElementById(id).value=''); renderUsuarios(); }
    else showMsg('uMsg', r.message, 'warn');
  } catch(e){ showMsg('uMsg','Não foi possível criar.','warn'); }
}
/* formulário de edição de usuário (substitui os três prompt() soltos). Sobre si mesmo, o Admin não muda o próprio perfil,
   não se desativa e troca a senha pelo botão "🔑 Senha" (trocar a senha por aqui derrubaria a própria sessão). */
let uEditLogin = '', uEditOriginal = null, uEditOcupado = false;
const PERFIS_USUARIO_ = [['Admin','Admin'],['Operador','Operador de caixa'],['Garçom','Garçom'],['Cozinha','Cozinha'],['Entregador','Entregador']];
function ehMeuLogin_(login){ return !!(currentUser && String(currentUser.login).toLowerCase()===String(login).toLowerCase()); }
function editarUsuarioPrompt(login){
  const u = usuarios.find(x=>x.login===login); if(!u) return;
  if(u.nivel === 'Desenvolvedor' && !(currentUser && currentUser.nivelReal === 'Desenvolvedor')){
    avisar('Este acesso é protegido: só o próprio Desenvolvedor pode editá-lo. Nada foi alterado.');
    return;
  }
  uEditLogin = u.login; uEditOriginal = { nome:u.nome||'', telefone:u.telefone||'', nivel:u.nivel, ativo:!!u.ativo };
  const eu = ehMeuLogin_(u.login);
  document.getElementById('ueTitulo').textContent = 'Editar usuário — '+u.login;
  document.getElementById('ueNome').value = uEditOriginal.nome;
  document.getElementById('ueTelefone').value = uEditOriginal.telefone;
  const selN = document.getElementById('ueNivel');
  selN.innerHTML = PERFIS_USUARIO_.concat(u.nivel === 'Desenvolvedor' ? [['Desenvolvedor','Desenvolvedor (acesso total)']] : []).map(p=>`<option value="${p[0]}">${p[1]}</option>`).join('');
  selN.value = u.nivel; selN.disabled = eu;
  const selA = document.getElementById('ueAtivo');
  selA.value = u.ativo ? 'Sim' : 'Não'; selA.disabled = eu;
  document.getElementById('ueSenha').value = '';
  document.getElementById('ueSenhaBox').style.display = eu ? 'none' : '';
  document.getElementById('ueAviso').style.display = eu ? '' : 'none';
  const msg = document.getElementById('ueMsg'); msg.textContent = ''; msg.className = 'msg';
  document.getElementById('ueBtn').disabled = false; uEditOcupado = false;
  document.getElementById('ueModal').classList.add('open');
}
function fecharModalEditarUsuario(){ document.getElementById('ueSenha').value = ''; document.getElementById('ueModal').classList.remove('open'); }
async function confirmarEditarUsuario(){
  if(uEditOcupado || !uEditOriginal) return;
  const msg = document.getElementById('ueMsg'), btn = document.getElementById('ueBtn');
  const erro = (t)=>{ msg.textContent = t; msg.className = 'msg warn'; };
  const nome = document.getElementById('ueNome').value.trim(), telefone = document.getElementById('ueTelefone').value.trim();
  const nivel = document.getElementById('ueNivel').value, ativo = document.getElementById('ueAtivo').value==='Sim';
  const senha = document.getElementById('ueSenha').value;
  if(senha && senha.length<8){ erro('A nova senha precisa ter ao menos 8 caracteres.'); return; }
  if(nivel==='Entregador' && !telefoneWhatsApp_(telefone)){ erro('Para entregador, informe o telefone com DDD (as entregas são enviadas pelo WhatsApp).'); return; }
  const payload = { loginAlvo: uEditLogin };
  if(nome !== uEditOriginal.nome) payload.nome = nome;
  if(telefone !== uEditOriginal.telefone) payload.telefone = telefone;
  if(nivel !== uEditOriginal.nivel) payload.novoNivel = nivel;
  if(ativo !== uEditOriginal.ativo) payload.novoAtivo = ativo;
  if(senha) payload.novaSenha = senha;
  if(Object.keys(payload).length===1){ erro('Nada foi alterado.'); return; }
  if(payload.novoNivel==='Admin' && !await confirmarTxt_('Dar acesso de ADMINISTRADOR a "'+uEditLogin+'"? Essa pessoa poderá ver e alterar tudo, inclusive o financeiro.', 'Dar acesso de Admin', true, 'Acesso de administrador')) return;
  const sensivel = ('novaSenha' in payload) || ('novoNivel' in payload) || ('novoAtivo' in payload);
  if(sensivel){
    abrirModalSenhaAdmin(function(senhaAdm){ payload.senhaAdminConfirmacao = senhaAdm; enviarEdicaoUsuario_(payload, msg, btn, erro); });
    return;
  }
  enviarEdicaoUsuario_(payload, msg, btn, erro);
}
async function enviarEdicaoUsuario_(payload, msg, btn, erro){
  uEditOcupado = true; btn.disabled = true; msg.textContent = 'Salvando...'; msg.className = 'msg';
  try{
    const r = await apiCall('editarUsuario', payload);
    if(r && r.usuarios){ usuarios = r.usuarios; salvarCache(); }
    if(r && r.ok){ renderUsuarios(); fecharModalEditarUsuario(); showMsg('uMsg', r.message || 'Usuário atualizado.', 'ok'); }
    else { erro((r && r.message) || 'Não foi possível salvar.'); uEditOcupado = false; btn.disabled = false; }
  } catch(e){ erro('Sem conexão com o servidor. Tente de novo.'); uEditOcupado = false; btn.disabled = false; }
}
function toggleAtivoUsuario(login, ativoAtual){
  abrirModalSenhaAdmin(function(senha){
    apiCall('editarUsuario', { loginAlvo: login, novoAtivo: !ativoAtual, senhaAdminConfirmacao: senha }).then(r=>{
      usuarios = r.usuarios || usuarios; salvarCache();
      if(r.ok) renderUsuarios(); else avisar(r.message);
    }).catch(()=>avisar('Não foi possível atualizar.'));
  });
}
async function excluirUsuarioPrompt(login){
  const alvo = usuarios.find(x=>x.login===login);
  if(alvo && alvo.nivel === 'Desenvolvedor'){
    avisar('O acesso de Desenvolvedor não pode ser excluído por aqui. Nada foi alterado.');
    return;
  }
  if(!await confirmarTxt_('Excluir o usuário "'+login+'"?')) return;
  abrirModalSenhaAdmin(function(senha){
    apiCall('excluirUsuario', { loginAlvo: login, senhaAdminConfirmacao: senha }).then(r=>{
      usuarios = r.usuarios || usuarios; salvarCache();
      if(r.ok) renderUsuarios(); else avisar(r.message);
    }).catch(()=>avisar('Não foi possível excluir.'));
  });
}

/* ---------- P-12 (v1.15): fotos sem uso no Drive principal e no da contingência ---------- */
let _fotosSemUso_ = null, _fotosSoEsse_ = '';
async function analisarFotosSemUso_(soEsse){
  _fotosSoEsse_ = soEsse || '';
  const box = document.getElementById('fotosSemUsoBox'); if(!box) return;
  box.innerHTML = '<div class="obs-line">⏳ Analisando os dois Drives… pode levar até 2 minutos. Nada é apagado nesta etapa.</div>';
  try{
    const r = await sb410Edge_('planilha-admin', { acao:'fotosAnalisar' }, 150000);
    if(!r || !r.ok){ box.innerHTML = '<div class="msg warn" role="alert" style="display:block;">⚠️ ' + escBk_((r && r.message) || 'Não foi possível analisar agora.') + '</div>'; return; }
    _fotosSemUso_ = r; renderFotosSemUso_();
  }catch(e){ box.innerHTML = '<div class="msg warn" role="alert" style="display:block;">📡 Sem conexão com o servidor: análise não feita. Nada foi apagado.</div>'; }
}
function renderFotosSemUso_(){
  const box = document.getElementById('fotosSemUsoBox'), r = _fotosSemUso_; if(!box || !r) return;
  const bloco = (titulo, d, chave)=>{
    if(!d || d.ok === false) return `<div class="notif-card" style="border-left:4px solid #e5534b;"><b>${titulo}</b><div class="obs-line" role="alert">⚠️ ${escBk_((d && d.message) || 'Não respondeu.')} (este Drive não será limpo)</div></div>`;
    const lista = d.semUso || [];
    if(!lista.length) return `<div class="notif-card" style="border-left:4px solid #7cc46a;"><b>${titulo}</b><div class="obs-line">✅ Nenhuma foto sem uso (${d.total || 0} arquivo(s) conferido(s)${d.recentesIgnoradas ? ', ' + d.recentesIgnoradas + ' recente(s) ignorada(s)' : ''}).</div></div>`;
    return `<div class="notif-card" style="border-left:4px solid #e0b53a;"><b>${titulo}</b>
      <div class="obs-line">${d.qtdSemUso} foto(s) sem uso · libera ${formatarBytes_(d.bytesSemUso)} (de ${d.total} arquivo(s))${d.qtdSemUso > lista.length ? ' · mostrando ' + lista.length : ''}</div>
      <label class="d-flex ai-centro gap-2 mt-1"><input type="checkbox" class="largura-auto" checked onchange="document.querySelectorAll('[data-fsu=${chave}]').forEach(c=>c.checked=this.checked)"> Marcar / desmarcar todas</label>
      <div style="max-height:220px;overflow:auto;margin-top:4px;">${lista.map(x=>`<label class="d-flex ai-centro gap-2 fs-xs" style="margin:3px 0;"><input type="checkbox" class="largura-auto" data-fsu="${chave}" value="${escBk_(x.id)}" checked> <span>${escBk_(x.nome || x.id)} · ${formatarBytes_(x.tamanho)} · <i>${escBk_(x.motivo || '')}</i></span></label>`).join('')}</div></div>`;
  };
  const nada = (_fotosSoEsse_ === 'c' || !(r.principal && (r.principal.semUso||[]).length)) && (_fotosSoEsse_ === 'p' || !(r.contingencia && r.contingencia.ok !== false && (r.contingencia.semUso||[]).length));
  box.innerHTML = (_fotosSoEsse_ === 'c' ? '' : bloco('Drive principal', r.principal, 'p')) + (_fotosSoEsse_ === 'p' ? '' : bloco('Drive da contingência', r.contingencia, 'c'))
    + (nada ? '' : `<div class="btnrow mt-2"><button class="primary" onclick="limparFotosSemUso_()">🗑️ Mandar as marcadas para a lixeira do Drive</button></div>
       <p class="obs-line">Vão para a LIXEIRA do Google Drive: dá para desfazer por cerca de 30 dias ("Desfazer a última limpeza"). O espaço só volta de verdade quando você esvaziar a lixeira no próprio Google Drive (drive.google.com → Lixeira).</p>`);
}
async function limparFotosSemUso_(){
  const ids = Array.from(document.querySelectorAll('[data-fsu=p]:checked')).map(c=>c.value);
  const idsCont = Array.from(document.querySelectorAll('[data-fsu=c]:checked')).map(c=>c.value);
  if(!ids.length && !idsCont.length) return mostrarErro_('Marque ao menos uma foto para limpar.', { forcar:true, registrar:false });
  if(!await confirmarTxt_('Mandar para a lixeira do Drive ' + ids.length + ' foto(s) do principal e ' + idsCont.length + ' da contingência?\n\nO sistema confere de novo, na hora, que nenhuma delas está em uso. Dá para desfazer.', 'Mandar para a lixeira', true)) return;
  abrirModalSenhaAdmin(async (senha)=>{
    const box = document.getElementById('fotosSemUsoBox');
    if(box) box.insertAdjacentHTML('afterbegin', '<div class="obs-line" id="fsuAndamento">⏳ Limpando… não feche o app.</div>');
    try{
      const r = await sb410Edge_('planilha-admin', { acao:'fotosLimpar', senha, ids, idsCont }, 150000);
      const and = document.getElementById('fsuAndamento'); if(and) and.remove();
      if(!r || !r.ok){ mostrarErro_('⚠️ ' + ((r && r.message) || 'Não foi possível limpar.'), { forcar:true }); return; }
      const p = r.principal || {}, c = r.contingencia || {};
      avisar('Limpeza feita: ' + (p.removidas||0) + ' foto(s) do principal (' + formatarBytes_(p.bytes) + ') e ' + (c.removidas||0) + ' da contingência (' + formatarBytes_(c.bytes) + ') foram para a lixeira do Drive.', 'ok', 9000);
      if(c.erro) mostrarErro_('⚠️ Contingência: ' + c.erro, { forcar:true });
      _fotosSemUso_ = null; analisarFotosSemUso_(_fotosSoEsse_); bkAtualizarEspaco_(); try{ window.driveDiretoCarregar_ && window.driveDiretoCarregar_(); }catch(e){}
    }catch(e){ const and = document.getElementById('fsuAndamento'); if(and) and.remove(); mostrarErro_('📡 Sem conexão durante a limpeza. Toque em "Analisar" de novo para ver o que ficou.', { forcar:true }); }
  });
}
async function restaurarFotosLimpeza_(){
  if(!await confirmarTxt_('Tirar da lixeira do Drive todas as fotos da última limpeza?', 'Desfazer limpeza', false)) return;
  abrirModalSenhaAdmin(async (senha)=>{
    try{
      const r = await sb410Edge_('planilha-admin', { acao:'fotosRestaurar', senha }, 150000);
      if(r && r.ok){ avisar(r.message || 'Restaurado.', 'ok', 8000); bkAtualizarEspaco_(); }
      else mostrarErro_('⚠️ ' + ((r && r.message) || 'Não foi possível desfazer.'), { forcar:true });
    }catch(e){ mostrarErro_('📡 Sem conexão: nada foi desfeito.', { forcar:true }); }
  });
}
