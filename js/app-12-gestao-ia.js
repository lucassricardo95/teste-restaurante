/* ---------- FEEDBACKS (ADMIN) — ITEM 34 ---------- */
let filtroFeedbacksAtual = 'todos';
function setFiltroFeedbacks(modo){
  filtroFeedbacksAtual = modo;
  document.getElementById('fbFiltroTodosBtn').classList.toggle('active', modo==='todos');
  document.getElementById('fbFiltroNovosBtn').classList.toggle('active', modo==='Novo');
  renderFeedbacks();
}
function dataBrNum_(t){ const m = String(t||'').match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/); return m ? Number(m[3]+m[2]+m[1]+(m[4]||'00')+(m[5]||'00')) : 0; }
function renderFeedbacks(){
  const box = document.getElementById('fbLista');
  if(!box) return;
  const lista = (filtroFeedbacksAtual==='todos' ? feedbacks : feedbacks.filter(f=>f.status===filtroFeedbacksAtual))
    .slice().sort((a,b)=> dataBrNum_(b.data) - dataBrNum_(a.data));
  box.innerHTML = lista.length ? lista.map(f=>`<div class="notif-card">
      <div>${f.origem==='iFood'?'<span class="selo-ifood" style="margin:0 6px 0 0;">iFood</span>':''}${'★'.repeat(Math.max(0,Math.min(5,f.nota||0)))}${'☆'.repeat(5-Math.max(0,Math.min(5,f.nota||0)))} <span class="obs-line">${f.data}${escH(f.telefone?' · '+f.telefone:'')}${f.vendaId?' · pedido #'+rotuloPedidoId(f.vendaId):''}${f.origem==='iFood'?' · 🛵 veio do iFood':''}${f.origem==='chat'?' · 💬 veio pelo chat':(f.origem==='aviso'?' · 🔔 veio pelo aviso do pedido':'')}${f.userId?' · 👤 com conta':' · sem conta'}</span></div>
      ${f.comentario?`<div class="mt-1">${escH(f.comentario)}</div>`:''}
      ${f.resposta?`<div class="obs-line" style="margin-top:6px;padding:6px 8px;border-left:3px solid var(--gold);"><b>Sua resposta</b> (${escH(f.respondidoEm||'')}${f.respondidoPor?' · '+escH(f.respondidoPor):''})<br>${escH(f.resposta)}</div>`:''}
      <div class="btnrow mt-2">
        <button class="ghost ${f.status==='Visto'?'small-gold':''}" onclick="alterarStatusFeedback('${f.id}','${f.status==='Novo'?'Visto':(f.status==='Visto'?'Novo':'Visto')}')">${f.status==='Novo'?'Marcar como visto':(f.status==='Visto'?'✓ Visto (tocar volta a Novo)':'Voltar para visto')}</button>
        <button class="small-gold" onclick="responderFeedback('${f.id}')">${f.resposta?'✏️ Editar resposta':'💬 Responder'}</button>
        ${(!f.userId && f.telefone)?`<button class="ghost" onclick="responderFeedbackZap_('${f.id}')">WhatsApp</button>`:''}
        <button class="ghost ${f.status==='Respondido'?'small-gold':''}" onclick="alterarStatusFeedback('${f.id}','Respondido')">Respondido</button>
      </div>
    </div>`).join('') : '<div class="notif-empty">Nenhum feedback recebido ainda.</div>';
  const dot = document.getElementById('adminDot');
  if(dot) dot.parentElement.classList.toggle('has-alert', feedbacks.some(f=>f.status==='Novo'));
}
/* Resposta ao feedback: quem tem conta vê a resposta em Minha conta › Pedidos. Sem conta, use o WhatsApp. */
async function responderFeedback(id){
  const f = feedbacks.find(x=>x.id===id); if(!f) return;
  const v = await vsForm({ titulo: f.resposta ? 'Editar resposta' : 'Responder feedback',
    texto: (f.origem==='iFood' ? 'Avaliação do iFood: a resposta é enviada ao iFood (só o Administrador envia; de 10 a 300 letras; o iFood ainda valida e pode recusar, e então você é avisado) e fica registrada aqui.' : f.userId ? 'O cliente vai ver a resposta em Minha conta › Pedidos.' : 'Este cliente não tem conta, então não vê a resposta no app. A resposta fica registrada aqui; para falar com ele use o botão WhatsApp.') + (f.comentario ? ' Ele escreveu: “' + f.comentario + '”' : ''),
    ok:'Salvar resposta', campos:[{ id:'resposta', rotulo:'Sua resposta', tipo:'longo', max:(f.origem==='iFood'?300:1000), valor:f.resposta||'', obrigatorio:true }] });
  if(!v) return;
  try{
    const r = await apiCall('responderFeedback', { id, resposta: v.resposta });
    if(r && r.ok){ feedbacks = r.feedbacks || feedbacks; salvarCache(); renderFeedbacks(); avisar(r.ifood==='enviada' ? 'Resposta enviada ao iFood.' : r.ifood==='so_admin' ? 'Resposta registrada aqui. Só o Administrador envia ao iFood.' : r.ifood==='desligado' ? 'Resposta registrada aqui. A integração do iFood está desligada, então não foi ao iFood.' : r.ifood==='prazo' ? 'Resposta registrada aqui, mas o prazo de 5 dias do iFood já passou: não foi enviada.' : r.ifood==='aguardando' ? 'Resposta registrada aqui. A resposta anterior ainda está em validação no iFood: esta não foi enviada.' : r.ifood==='tamanho' ? 'Resposta registrada aqui, mas o iFood aceita de 10 a 300 letras: NÃO foi enviada ao iFood.' : (r.comConta ? 'Resposta enviada. O cliente vê em Minha conta.' : 'Resposta registrada (cliente sem conta).')); }
    else avisar((r && r.message) || 'Não foi possível salvar a resposta.');
  }catch(e){ avisar('Não foi possível salvar a resposta agora. Tente de novo.'); }
}
function responderFeedbackZap_(id){
  const f = feedbacks.find(x=>x.id===id); if(!f || !f.telefone) return;
  let d = String(f.telefone).replace(/\D/g,''); if(d.length<=11) d = '55' + d;
  const txt = f.resposta || '';
  window.open('https://wa.me/' + d + (txt ? '?text=' + encodeURIComponent(txt) : ''), '_blank', 'noopener');
}
async function alterarStatusFeedback(id, novoStatus){
  try{ const r = await apiCallFila('editarStatusFeedback', { id, novoStatus }, 'Status de feedback'); if(r.ok){ feedbacks = r.feedbacks || feedbacks; salvarCache(); renderFeedbacks(); } }
  catch(e){ /* tenta de novo na próxima sincronização */ }
}


/* ---------- OCORRÊNCIAS ---------- */
let filtroOcorrencias = 'abertas', ocGerenciandoId = null, ocVendaIdAtual = '';
function escOc_(s){ return escH(s); }
function podeTratarOcorrencia_(){ return !!(currentUser && (currentUser.nivel==='Admin' || currentUser.nivel==='Operador')); }
function ocorrenciasAbertas_(){ return (ocorrencias||[]).filter(o=>o.status!=='Resolvida'); }
function ocorrenciasAbertasDoPedido_(vendaId){ return ocorrenciasAbertas_().filter(o=>o.vendaId===vendaId); }
function botaoOcorrenciaPedido(v){
  const abertas = ocorrenciasAbertasDoPedido_(v.id);
  const aviso = abertas.length ? `<div class="obs-line txt-ouro">⚠️ ${abertas.length} ocorrência(s) aberta(s): ${escOc_(abertas[0].tipo)} — ${escOc_(abertas[0].descricao.slice(0,60))}</div>` : '';
  return aviso + `<button class="ghost mt-2" onclick="abrirModalOcorrencia('${v.id}')">⚠️ Ocorrência</button>`;
}
function abrirModalOcorrencia(vendaId){
  ocVendaIdAtual = vendaId || '';
  const v = vendaId ? vendas.find(x=>x.id===vendaId) : null;
  document.getElementById('ocRegPedido').textContent = v ? ('Pedido #'+rotuloPedido(v)+(v.clienteNome?(' — '+v.clienteNome):'')) : 'Sem pedido vinculado';
  const perfil = currentUser && currentUser.nivel;
  document.getElementById('ocRegTipo').value = perfil==='Cozinha' ? 'Produção' : perfil==='Entregador' ? 'Entrega' : 'Atendimento';
  document.getElementById('ocRegDescricao').value = '';
  document.getElementById('ocRegMsg').textContent = '';
  document.getElementById('ocRegBtn').disabled = false;
  document.getElementById('ocRegModal').classList.add('open');
}
function fecharModalOcorrencia(){ document.getElementById('ocRegModal').classList.remove('open'); }
async function confirmarOcorrencia(){
  const tipo = document.getElementById('ocRegTipo').value, descricao = document.getElementById('ocRegDescricao').value.trim();
  const msg = document.getElementById('ocRegMsg'), btn = document.getElementById('ocRegBtn');
  if(descricao.length < 3){ msg.textContent = 'Descreva o que aconteceu.'; return; }
  btn.disabled = true; msg.textContent = 'Registrando...';
  try{
    const r = await apiCallFila('registrarOcorrencia', { tipo, vendaId: ocVendaIdAtual, descricao }, 'Ocorrência');
    if(r && r.ok){
      if(r.ocorrencias){ ocorrencias = r.ocorrencias; salvarCache(); }
      msg.textContent = r.message || 'Registrada.';
      renderOcorrencias(); renderNotificacoes();
      if(typeof renderPedidos === 'function') try{ renderPedidos(); }catch(e){ if(window.erroTela_) erroTela_(e); }
      if(typeof renderEntregas === 'function') try{ renderEntregas(); }catch(e){ if(window.erroTela_) erroTela_(e); }
      setTimeout(fecharModalOcorrencia, 700);
    } else { msg.textContent = (r && r.message) || 'Não foi possível registrar.'; btn.disabled = false; }
  }catch(e){ msg.textContent = 'Erro ao registrar. Tente de novo.'; btn.disabled = false; }
}
function filtrarOcorrencias(f){
  filtroOcorrencias = f;
  document.getElementById('ocFiltroAbertas').classList.toggle('small-gold', f==='abertas');
  document.getElementById('ocFiltroTodas').classList.toggle('small-gold', f==='todas');
  renderOcorrencias();
}
function renderOcorrencias(){
  const box = document.getElementById('ocLista');
  if(!box) return;
  const lista = (filtroOcorrencias==='abertas' ? ocorrenciasAbertas_() : (ocorrencias||[])).slice().sort((a,b)=>b.numero-a.numero);
  const podeTratar = podeTratarOcorrencia_();
  box.innerHTML = lista.length ? lista.map(o=>{
    const v = o.vendaId ? vendas.find(x=>x.id===o.vendaId) : null;
    const cor = o.status==='Resolvida' ? 'var(--muted)' : 'var(--gold)';
    return `<div class="notif-card">
      <div><b>#${o.numero}</b> — ${escOc_(o.tipo)} <span class="obs-line" style="color:${cor};">· ${escOc_(o.status)}</span></div>
      <div class="obs-line">${escOc_(o.data)} · ${escOc_(o.setor)} · por ${escOc_(o.registradoPor)}${v?(' · pedido #'+rotuloPedido(v)+(ehIfood_(v)?' (🛵 iFood)':'')):''}${o.clienteNome?(' · '+escOc_(o.clienteNome)):''}</div>
      <div class="mt-1">${escOc_(o.descricao)}</div>
      ${o.responsavel?`<div class="obs-line">Responsável: ${escOc_(o.responsavel)}</div>`:''}
      ${o.solucao?`<div class="obs-line">Solução: ${escOc_(o.solucao)}</div>`:''}
      ${podeTratar?`<button class="ghost mt-2" onclick="abrirGerirOcorrencia('${o.id}')">Tratar</button>`:''}
    </div>`;
  }).join('') : '<div class="notif-empty">'+(filtroOcorrencias==='abertas'?'Nenhuma ocorrência aberta.':'Nenhuma ocorrência registrada ainda.')+'</div>';
}
function abrirGerirOcorrencia(id){
  const o = (ocorrencias||[]).find(x=>x.id===id); if(!o) return;
  ocGerenciandoId = id;
  document.getElementById('ocGerTitulo').textContent = 'Ocorrência #'+o.numero;
  document.getElementById('ocGerResumo').textContent = o.tipo+' · '+o.descricao;
  document.getElementById('ocGerStatus').value = o.status;
  document.getElementById('ocGerResp').value = o.responsavel || '';
  document.getElementById('ocGerSolucao').value = o.solucao || '';
  document.getElementById('ocGerHistorico').textContent = o.historico || '';
  document.getElementById('ocGerMsg').textContent = '';
  document.getElementById('ocGerModal').dataset.statusEsperado = o.status;
  document.getElementById('ocGerModal').classList.add('open');
}
function fecharModalGerirOcorrencia(){ document.getElementById('ocGerModal').classList.remove('open'); ocGerenciandoId = null; }
async function confirmarGerirOcorrencia(){
  const modal = document.getElementById('ocGerModal'), msg = document.getElementById('ocGerMsg');
  const status = document.getElementById('ocGerStatus').value, responsavel = document.getElementById('ocGerResp').value.trim(), solucao = document.getElementById('ocGerSolucao').value.trim();
  if(status==='Resolvida' && solucao.length<3){ msg.textContent = 'Descreva a solução para resolver.'; return; }
  msg.textContent = 'Salvando...';
  try{
    const r = await apiCall('atualizarOcorrencia', { id: ocGerenciandoId, status, responsavel, solucao, statusEsperado: modal.dataset.statusEsperado });
    if(r && r.ocorrencias){ ocorrencias = r.ocorrencias; salvarCache(); }
    if(r && r.ok){ renderOcorrencias(); renderNotificacoes(); fecharModalGerirOcorrencia(); }
    else { msg.textContent = (r && r.message) || 'Não foi possível salvar.'; if(r && r.conflito) renderOcorrencias(); }
  }catch(e){ msg.textContent = 'Sem conexão. Tente de novo.'; }
}

/* ---------- CONFIGURAÇÃO DO CARDÁPIO DIGITAL (ADMIN) — ITEM 93 ---------- */
function renderConfigCardapio(){
  const k = document.getElementById('cfgKicker'), f = document.getElementById('cfgFrase');
  if(!k) return;
  k.value = configCardapio.kicker || '';
  f.value = configCardapio.frase || '';
  document.getElementById('cfgTempoEntrega').value = configCardapio.tempoEntrega || '';
  document.getElementById('cfgTempoRetirada').value = configCardapio.tempoRetirada || '';
  document.getElementById('cfgTempoMesa').value = configCardapio.tempoMesa || '';
  const fp = document.getElementById('cfgFaixaPromo'); if(fp) fp.value = configCardapio.faixaPromo || '';
  renderDadosRestaurante_();
}
/* ---------- COMPRAS E FORNECEDORES (só Admin / Desenvolvedor) ----------
   Fase 3.1 (auditoria 18/10/2026): entrada de NOTA de compra. Custo = ÚLTIMO custo pela data da nota (por unidade base),
   nº da nota, comprovante opcional (foto/PDF, guardado em local privado), frete e desconto rateados, vários pagamentos
   com a origem do dinheiro (caixa, conta, cartão, dinheiro do dono ou a pagar), item sem estoque na categoria certa,
   embalagem lembrada por fornecedor, estorno completo e correção (estorna + relança), histórico de custos. */
var _compras_ = { fornecedores:[], compras:[], vinculos:[], custos:[] }, cpItens_ = [], cpPags_ = [], cpPagsMexeu_ = false, cpEditandoDe_ = '', cpAnexo_ = null;
const CP_UNIDADES_ = ['un','kg','g','l','ml'];
const CP_ORIGENS_ = [ { v:'caixa', t:'Caixa (gaveta)' }, { v:'conta', t:'Conta bancária / Pix' }, { v:'cartao', t:'Cartão' }, { v:'dono', t:'Dinheiro do dono' }, { v:'apagar', t:'Vou pagar depois' } ];
function cpOrigemTxt_(o){ const x = CP_ORIGENS_.find(z=>z.v===o); return x ? x.t : (o||''); }
function cpHoje_(){ return new Date(Date.now()-3*3600000).toISOString().slice(0,10); }
function cpChave_(t){ return String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').slice(0,80); }
async function carregarCompras_(){
  const box = document.getElementById('cpLista'); if(!box) return;
  if(!document.getElementById('cpData').value) document.getElementById('cpData').value = cpHoje_();
  if(!cpItens_.length) cpAddItem_();
  if(!cpPags_.length) cpPagsPadrao_();
  try{
    const r = await apiCall('listarCompras', {});
    if(!r || !r.ok){ box.innerHTML = '<div class="notif-empty">' + escH((r && r.message) || 'Não foi possível carregar agora.') + '</div>'; return; }
    _compras_ = { fornecedores: r.fornecedores||[], compras: r.compras||[], vinculos: r.vinculos||[], custos: r.custos||[] };
    renderCompras_();
    if(_cpPend_) cpAplicarPend_();
  }catch(e){ box.innerHTML = '<div class="notif-empty">Não foi possível carregar agora.</div>'; }
}
function cpItemVazio_(){ return { ingredienteId:'', descricao:'', descNota:'', quantidade:'', unidade:'un', valorTotal:'', emb:'', porEmb:'', categoria:'Insumos' }; }
function cpAddItem_(){ cpItens_.push(cpItemVazio_()); cpRenderItens_(); }
function cpRemoverItem_(i){ cpItens_.splice(i,1); if(!cpItens_.length) cpItens_.push(cpItemVazio_()); cpRenderItens_(); }
function cpNorm_(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim(); }
function cpEhBebida_(id){ return (produtos||[]).some(p=>p.estoqueProprioIngredienteId===id); }
function cpEditarItem_(i, campo, v){
  cpItens_[i][campo] = v;
  if(campo==='ingredienteId'){ const e = (estoque||[]).find(x=>x.id===v); if(e){ cpItens_[i].unidade = e.unidade || 'un'; if(!cpItens_[i].descNota) cpItens_[i].descNota = cpItens_[i].descricao; cpItens_[i].descricao = ''; } cpRenderItens_(); return; }
  if(campo==='unidade'){ cpRenderItens_(); return; }
  cpInfoItem_(i); cpAtualizarTotal_();
}
/* vínculo lembrado: "como este fornecedor escreve na nota" -> ingrediente, unidade e embalagem */
function cpVinculo_(txt){
  const f = document.getElementById('cpFornecedor').value, k = cpChave_(txt).trim(); if(!f || !k) return null;
  return (_compras_.vinculos||[]).find(v=>v.fornecedorId===f && String(v.chave).trim()===k) || null;
}
/* busca por digitação: escolher um ingrediente dá entrada no estoque; texto livre vira só despesa (com aviso) */
function cpBuscar_(i, txt){
  const it = cpItens_[i]; if(!it) return;
  it.descricao = txt; it.descNota = txt; it.ingredienteId = '';
  const q = cpNorm_(txt), box = document.getElementById('cpSug_'+i);
  if(box){
    if(!q){ box.innerHTML = ''; }
    else {
      const vin = cpVinculo_(txt), ev = vin ? (estoque||[]).find(e=>e.id===vin.ingredienteId) : null;
      const ativos = (estoque||[]).filter(e=>e.ativo!==false && cpNorm_(e.nome).indexOf(q)!==-1)
        .sort((a,b)=>((cpNorm_(a.nome).indexOf(q)===0?0:1)-(cpNorm_(b.nome).indexOf(q)===0?0:1)) || a.nome.localeCompare(b.nome)).slice(0,8);
      const ing = ativos.filter(e=>!cpEhBebida_(e.id)), beb = ativos.filter(e=>cpEhBebida_(e.id));
      const bt = e=>`<button type="button" class="cf-sug-item" onclick="cpEscolher_(${i},'${e.id}')">${escH(e.nome)} <span>${escH(e.unidade||'un')}</span></button>`;
      box.innerHTML = (ev ? `<div class="cf-sug-grupo">Como na última nota deste fornecedor</div><button type="button" class="cf-sug-item" onclick="cpUsarVinculo_(${i})">↺ ${escH(ev.nome)} <span>${escH(vin.unidade)}${vin.fator ? ' · embalagem de ' + escH(String(vin.fator).replace('.',',')) : ''}</span></button>` : '')
        + (ing.length ? '<div class="cf-sug-grupo">Ingredientes</div>' + ing.map(bt).join('') : '')
        + (beb.length ? '<div class="cf-sug-grupo">Bebidas e itens prontos</div>' + beb.map(bt).join('') : '');
    }
  }
  cpInfoItem_(i);
}
function cpUsarVinculo_(i){
  const it = cpItens_[i]; if(!it) return; const v = cpVinculo_(it.descNota || it.descricao); if(!v) return;
  const box = document.getElementById('cpSug_'+i); if(box) box.innerHTML = '';
  it.ingredienteId = v.ingredienteId; it.unidade = v.unidade || 'un'; it.descricao = '';
  if(v.fator){ it.porEmb = String(v.fator); if(!it.emb) it.emb = ''; }
  cpRenderItens_();
}
function cpEscolher_(i, id){ const box = document.getElementById('cpSug_'+i); if(box) box.innerHTML = ''; cpEditarItem_(i, 'ingredienteId', id); }
/* "Comprei N embalagens de M (unidade)" -> quantidade = N x M (vale para un, kg, g, l e ml) */
function cpEmb_(i, campo, v){
  const it = cpItens_[i]; if(!it) return;
  it[campo] = v;
  const n = Number(String(it.emb).replace(',','.'))||0, m = Number(String(it.porEmb).replace(',','.'))||0;
  if(n>0 && m>0){ it.quantidade = String(Math.round(n*m*1000)/1000); const q = document.getElementById('cpQtd_'+i); if(q) q.value = it.quantidade; }
  cpInfoItem_(i); cpAtualizarTotal_();
}
function cpInfoItem_(i){
  const it = cpItens_[i], el = document.getElementById('cpInfo_'+i); if(!it || !el) return;
  const e = it.ingredienteId ? (estoque||[]).find(x=>x.id===it.ingredienteId) : null;
  const q = Number(it.quantidade)||0, v = Number(it.valorTotal)||0;
  let html = '';
  if(e){
    html = `<div class="cf-ok">✓ Entra no estoque de <b>${escH(e.nome)}</b>${cpEhBebida_(e.id)?' (bebida/item pronto)':''}</div>`;
    if(q>0 && v>0){
      const f = typeof cfFator_ === 'function' ? cfFator_(it.unidade||'un', e.unidade||'un') : (it.unidade===e.unidade?1:null);
      const novo = f ? v/(q*f) : null, ant = Number(e.custo)||0;
      html += `<div class="sub">= R$ ${(v/q).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:4})} por ${escH(it.unidade||'un')}${f && f!==1 ? ' (R$ ' + novo.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:6}) + ' por ' + escH(e.unidade) + ')' : ''}${ant>0 && novo ? ' · custo atual R$ ' + ant.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:6}) : ''}</div>`;
      if(!f) html += `<div class="cf-alerta">⚠️ A unidade "${escH(it.unidade)}" não combina com a do estoque de ${escH(e.nome)} (${escH(e.unidade)}). Troque a unidade.</div>`;
      else if(ant>0 && Math.abs(novo-ant)/ant > 0.30) html += `<div class="cf-alerta">⚠️ Custo ${novo>ant?'maior':'menor'} que o atual em ${Math.round(Math.abs(novo-ant)/ant*100)}%. Confira se não houve erro de digitação (ex.: 40 virou 400).</div>`;
    }
  } else if(String(it.descricao||'').trim()){
    const q2 = cpNorm_(it.descricao), parecido = (estoque||[]).filter(x=>x.ativo!==false && (cpNorm_(x.nome).indexOf(q2)!==-1 || q2.indexOf(cpNorm_(x.nome))!==-1)).slice(0,3);
    html = `<div class="cf-alerta">⚠️ Este item <b>não vai dar entrada no estoque</b> (entra só como despesa, na categoria abaixo).${parecido.length ? ' É algum destes? ' + parecido.map(x=>`<button type="button" class="link-btn" onclick="cpEscolher_(${i},'${x.id}')">${escH(x.nome)}</button>`).join(' ') : ' Se for ingrediente, cadastre em Produtos → Estoque.'}</div>`;
  }
  el.innerHTML = html;
}
function cpRenderItens_(){
  const box = document.getElementById('cpItens'); if(!box) return;
  const cats = typeof CATEGORIAS_DESPESA_PADRAO !== 'undefined' ? CATEGORIAS_DESPESA_PADRAO : ['Insumos','Embalagens','Gás','Manutenção','Outros'];
  box.innerHTML = cpItens_.map((it,i)=>{
    const e = it.ingredienteId ? (estoque||[]).find(x=>x.id===it.ingredienteId) : null;
    const nome = e ? e.nome : (it.descricao||'');
    const un = it.unidade||'un';
    return `<div class="notif-card" style="padding:10px;">
    <label for="cpBusca_${i}">O que você comprou?</label>
    <div class="cf-busca"><input type="text" id="cpBusca_${i}" maxlength="80" autocomplete="off" placeholder="Digite como está na nota: carne, queijo, coca, gás…" value="${escH(nome)}" oninput="cpBuscar_(${i},this.value)"><div class="cf-sug" id="cpSug_${i}"></div></div>
    <div id="cpInfo_${i}"></div>
    ${e ? '' : `<label for="cpCat_${i}">Categoria da despesa</label><select id="cpCat_${i}" onchange="cpEditarItem_(${i},'categoria',this.value)">${cats.map(c=>`<option${c===(it.categoria||'Insumos')?' selected':''}>${escH(c)}</option>`).join('')}</select>`}
    <div class="row2">
      <div><label for="cpQtd_${i}">Quantidade</label><input type="number" id="cpQtd_${i}" inputmode="decimal" min="0" step="0.001" value="${escH(it.quantidade)}" oninput="cpEditarItem_(${i},'quantidade',this.value)"></div>
      <div><label for="cpUn_${i}">Unidade</label><select id="cpUn_${i}" onchange="cpEditarItem_(${i},'unidade',this.value)">${CP_UNIDADES_.map(u=>`<option${u===un?' selected':''}>${u}</option>`).join('')}</select></div>
    </div>
    <div class="row2 cf-emb">
      <div><label for="cpEmb_${i}">Embalagens (opcional)</label><input type="number" id="cpEmb_${i}" inputmode="decimal" min="0" step="1" placeholder="Ex: 2 caixas" value="${escH(it.emb||'')}" oninput="cpEmb_(${i},'emb',this.value)"></div>
      <div><label for="cpPorEmb_${i}">Quanto vem em cada (${escH(un)})</label><input type="number" id="cpPorEmb_${i}" inputmode="decimal" min="0" step="0.001" placeholder="Ex: 12" value="${escH(it.porEmb||'')}" oninput="cpEmb_(${i},'porEmb',this.value)"></div>
    </div>
    <label for="cpValor_${i}">Valor total pago por este item (R$)</label><input type="number" id="cpValor_${i}" inputmode="decimal" min="0" step="0.01" value="${escH(it.valorTotal)}" oninput="cpEditarItem_(${i},'valorTotal',this.value)">
    ${cpItens_.length>1 ? `<button type="button" class="link-btn" onclick="cpRemoverItem_(${i})">remover item</button>` : ''}
  </div>`;
  }).join('');
  cpItens_.forEach((it,i)=>cpInfoItem_(i));
  cpAtualizarTotal_();
}
function cpNumCampo_(id){ const el = document.getElementById(id); return el ? (Number(String(el.value||'').replace(',','.'))||0) : 0; }
function cpTotais_(){
  const soma = Math.round(cpItens_.reduce((s,it)=>s+(Number(it.valorTotal)||0),0)*100)/100;
  const frete = cpNumCampo_('cpFrete'), desc = cpNumCampo_('cpDesconto');
  return { soma, frete, desc, total: Math.round((soma + frete - desc)*100)/100 };
}
function cpAtualizarTotal_(){
  const t = cpTotais_();
  const el = document.getElementById('cpTotal'); if(el) el.textContent = formatarMoeda(t.total);
  const conf = document.getElementById('cpConferencia');
  if(conf){
    const imp = cpNumCampo_('cpTotalNota');
    conf.innerHTML = 'Itens ' + formatarMoeda(t.soma) + (t.frete ? ' + frete ' + formatarMoeda(t.frete) : '') + (t.desc ? ' − desconto ' + formatarMoeda(t.desc) : '') + ' = <b>' + formatarMoeda(t.total) + '</b>'
      + (imp ? (Math.abs(imp - t.total) < 0.005 ? ' · ✓ bate com o total da nota' : ' · <span class="cf-alerta">⚠️ não bate com o total da nota (' + formatarMoeda(imp) + ')</span>') : '');
  }
  if(!cpPagsMexeu_ && cpPags_.length === 1){ cpPags_[0].valor = t.total ? String(t.total) : ''; cpRenderPags_(); }
  else cpPagsResumo_();
}
/* ---------- pagamento: uma ou mais linhas (parte agora, parte depois) ---------- */
function cpPagsPadrao_(){ cpPags_ = [ { valor:'', origem:'caixa', vencimento:'' } ]; cpPagsMexeu_ = false; cpRenderPags_(); }
function cpAddPag_(){ cpPagsMexeu_ = true; const t = cpTotais_().total, ja = cpPags_.reduce((s,p)=>s+(Number(p.valor)||0),0); cpPags_.push({ valor: t-ja > 0 ? String(Math.round((t-ja)*100)/100) : '', origem:'apagar', vencimento:'' }); cpRenderPags_(); }
function cpRemPag_(i){ cpPags_.splice(i,1); if(!cpPags_.length) cpPagsPadrao_(); else cpRenderPags_(); }
function cpEditarPag_(i, campo, v){
  cpPagsMexeu_ = true; cpPags_[i][campo] = v;
  if(campo==='valor' && cpPags_.length===2){   // duas linhas: a outra completa o total sozinha
    const j = 1-i, t = cpTotais_().total, resto = Math.round(Math.max(0, t - (Number(v)||0))*100)/100;
    cpPags_[j].valor = resto ? String(resto) : ''; const el = document.getElementById('cpPgV_'+j); if(el) el.value = cpPags_[j].valor;
  }
  if(campo==='origem') cpRenderPags_(); else cpPagsResumo_();
}
function cpRenderPags_(){
  const box = document.getElementById('cpPags'); if(!box) return;
  box.innerHTML = cpPags_.map((p,i)=>`<div class="notif-card" style="padding:10px;">
    <div class="row2">
      <div><label for="cpPgV_${i}">Valor (R$)</label><input type="number" id="cpPgV_${i}" inputmode="decimal" min="0" step="0.01" value="${escH(p.valor)}" oninput="cpEditarPag_(${i},'valor',this.value)"></div>
      <div><label for="cpPgO_${i}">De onde saiu o dinheiro</label><select id="cpPgO_${i}" onchange="cpEditarPag_(${i},'origem',this.value)">${CP_ORIGENS_.map(o=>`<option value="${o.v}"${o.v===p.origem?' selected':''}>${escH(o.t)}</option>`).join('')}</select></div>
    </div>
    ${p.origem==='apagar' ? `<label for="cpPgD_${i}">Vencimento</label><input type="date" id="cpPgD_${i}" value="${escH(p.vencimento||'')}" oninput="cpEditarPag_(${i},'vencimento',this.value)">` : ''}
    ${p.origem==='caixa' ? '<div class="sub">Sai do caixa aberto agora (entra no fechamento de hoje).</div>' : ''}
    ${p.origem==='dono' ? '<div class="sub">Fica registrado que o dono pagou do próprio bolso (só informação).</div>' : ''}
    ${cpPags_.length>1 ? `<button type="button" class="link-btn" onclick="cpRemPag_(${i})">remover pagamento</button>` : ''}
  </div>`).join('');
  cpPagsResumo_();
}
function cpPagsResumo_(){
  const el = document.getElementById('cpPagsResumo'); if(!el) return;
  const t = cpTotais_().total, s = Math.round(cpPags_.reduce((a,p)=>a+(Number(p.valor)||0),0)*100)/100;
  el.innerHTML = Math.abs(s - t) < 0.005 ? '' : '<span class="cf-alerta">⚠️ Os pagamentos somam ' + formatarMoeda(s) + ' e a nota dá ' + formatarMoeda(t) + '.</span>';
}
function cpMudouStatus_(){ const b = document.getElementById('cpPagBox'); if(b) b.style.display = document.getElementById('cpStatus').value==='Pedido' ? 'none' : ''; }
/* ---------- comprovante (opcional): foto vira WebP leve no próprio aparelho; PDF vai como está. Guardado em local privado (só Admin abre). ---------- */
function cpAnexoEscolhido_(inp){
  const f = inp.files && inp.files[0], info = document.getElementById('cpAnexoInfo');
  cpAnexo_ = null; if(!f){ if(info) info.textContent = ''; return; }
  if(!/^image\//.test(f.type) && f.type !== 'application/pdf'){ if(info) info.textContent = '⚠️ Use foto ou PDF.'; inp.value=''; return; }
  if(f.size > 15*1024*1024){ if(info) info.textContent = '⚠️ Arquivo grande demais (máx. 15 MB).'; inp.value=''; return; }
  cpAnexo_ = f; if(info) info.textContent = '📎 ' + f.name + ' (será enviado ao salvar)';
}
function cpComprimir_(file){
  return new Promise((ok, falha)=>{
    if(file.type === 'application/pdf'){ if(file.size > 3*1024*1024) return falha(new Error('PDF maior que 3 MB.')); return ok({ blob:file, ext:'pdf', tipo:'application/pdf' }); }
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = ()=>{
      try{
        const max = 1600, esc = Math.min(1, max/Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width*esc); c.height = Math.round(img.height*esc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
        c.toBlob(b=>{ if(!b) return falha(new Error('Não consegui preparar a foto.')); ok({ blob:b, ext: b.type==='image/webp' ? 'webp' : 'jpg', tipo:b.type }); }, 'image/webp', 0.72);
      }catch(e){ falha(e); }
    };
    img.onerror = ()=>{ URL.revokeObjectURL(url); falha(new Error('Não consegui abrir a foto.')); };
    img.src = url;
  });
}
/* Comprovante no Google Drive (18/10/2026): mesmo caminho das fotos dos produtos (Edge Function -> planilha -> Drive),
   escolhendo o Drive principal, o da contingência ou os dois. O arquivo fica privado: só o Admin abre, pelo app. */
function cpDestinoAnexo_(){ let v = ''; try{ v = localStorage.getItem('cpAnexoDestino') || ''; }catch(e){} return ['ambos','principal','contingencia'].indexOf(v) >= 0 ? v : 'ambos'; }
function cpGuardarDestino_(v){ try{ localStorage.setItem('cpAnexoDestino', v); }catch(e){} }
function cpBlobBase64_(blob){ return new Promise((ok, falha)=>{ const fr = new FileReader(); fr.onload = ()=>ok(String(fr.result).split(',').pop()); fr.onerror = ()=>falha(new Error('Não consegui ler o arquivo.')); fr.readAsDataURL(blob); }); }
async function cpEnviarAnexo_(file, destino){
  const prep = await cpComprimir_(file);
  if(prep.blob.size > 3*1024*1024) throw new Error('Arquivo maior que 3 MB.');
  destino = destino || ((document.getElementById('cpAnexoDestino')||{}).value) || cpDestinoAnexo_();
  const base64Data = await cpBlobBase64_(prep.blob);
  const j = await sb410Edge_('nota-anexo', { acao:'enviar', base64Data, nomeBase: 'nota-' + cpHoje_(), destino }, 90000);
  if(!j || !j.ok || !j.path) throw new Error((j && j.message) || 'Envio do comprovante falhou.');
  return { path: j.path, nome: String(file.name||'comprovante').slice(0,120), aviso: j.aviso || '' };
}
async function cpVerAnexo_(id){
  const c = (_compras_.compras||[]).find(x=>x.id===id); if(!c || !c.anexoPath) return;
  const w = window.open('', '_blank'); // abre já no toque (o celular bloqueia janela aberta depois da espera)
  try{
    if(w) w.document.write('<p style="font-family:sans-serif;padding:20px">Abrindo o comprovante…</p>');
    const j = await sb410Edge_('nota-anexo', { acao:'ver', compraId: id }, 60000);
    if(!j || !j.ok || !j.base64) throw new Error((j && j.message) || 'Não consegui abrir o comprovante.');
    const bin = atob(j.base64), u8 = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([u8], { type: j.tipo || 'application/octet-stream' }));
    if(w) w.location.href = url; else window.open(url, '_blank');
    setTimeout(()=>URL.revokeObjectURL(url), 120000);
  }catch(e){ if(w) try{ w.close(); }catch(_){} showMsg('cpListaMsg', e.message || 'Não consegui abrir o comprovante.', 'warn'); }
}
/* ---------- lista ---------- */
function renderCompras_(){
  const fs = _compras_.fornecedores, sel = document.getElementById('cpFornecedor'), atual = sel.value;
  sel.innerHTML = '<option value="">Escolha o fornecedor</option>' + fs.filter(f=>f.ativo).map(f=>`<option value="${f.id}">${escH(f.nome)}</option>`).join('');
  if(atual) sel.value = atual;
  document.getElementById('cpFornLista').innerHTML = fs.length ? fs.map(f=>`<div class="notif-card"><b>${escH(f.nome)}</b>${f.ativo?'':' · inativo'}${f.telefone?' · '+escH(f.telefone):''}${f.observacao?`<div class="obs-line">${escH(f.observacao)}</div>`:''}<button class="small-gold" onclick="cfEditar_('${f.id}')">editar</button> <button class="ghost" onclick="cfAlternar_('${f.id}')">${f.ativo?'Desativar':'Ativar'}</button></div>`).join('') : '<div class="notif-empty">Nenhum fornecedor cadastrado ainda.</div>';
  const cs = _compras_.compras;
  document.getElementById('cpLista').innerHTML = cs.length ? cs.map(c=>{
    const d = String(c.data||'').split('-').reverse().join('/');
    const itens = (c.itens||[]).map(i=>`${Number(i.quantidade)} ${escH(i.unidade)} ${escH(i.descricao)} (${formatarMoeda(i.valorTotal)})${!i.ingredienteId && i.categoria ? ' · ' + escH(i.categoria) : ''}`).join(' · ');
    const pags = (c.pagamentos||[]).map(p=>formatarMoeda(p.valor) + ' ' + escH(cpOrigemTxt_(p.origem)) + (p.origem==='apagar' && p.vencimento ? ' (vence ' + String(p.vencimento).split('-').reverse().join('/') + ')' : '')).join(' + ');
    let acoes = '';
    if(c.status==='Pedido') acoes = `<button class="small-gold" onclick="receberCompraUI('${c.id}')">Marcar como recebida</button> <button class="ghost" onclick="cancelarCompraUI('${c.id}')">Cancelar pedido</button>`;
    else if(c.status==='Recebida') acoes = `<button class="ghost" onclick="cpEditarInfoUI_('${c.id}')">Editar dados da nota</button> <button class="ghost" onclick="cpCorrigirUI_('${c.id}')">Corrigir nota</button> <button class="ghost" onclick="estornarCompraUI('${c.id}')">Estornar nota</button>`;
    if(c.anexoPath) acoes = `<button class="ghost" onclick="cpVerAnexo_('${c.id}')">📎 Ver comprovante</button> ` + acoes;
    const tags = [c.numeroNota ? 'nota ' + escH(c.numeroNota) : '', c.status==='Recebida' ? escH(c.pagamento) : '', c.origem==='ia' ? '✨ via IA' : '', c.editadaDe ? '✏️ corrigida' : '',
      c.semComprovante && c.status!=='Pedido' ? '<span class="txt-muted">sem comprovante</span>' : ''].filter(Boolean).join(' · ');
    return `<div class="notif-card"><b>${escH(c.fornecedor)}</b> — ${formatarMoeda(c.total)} · ${d} · ${escH(c.status)}${tags ? ' · ' + tags : ''}<div class="obs-line">${itens}</div>`
      + ((Number(c.frete)||Number(c.desconto)) ? `<div class="obs-line">Frete ${formatarMoeda(c.frete)} · desconto ${formatarMoeda(c.desconto)}</div>` : '')
      + (pags ? `<div class="obs-line">Pagamento: ${pags}</div>` : '')
      + (c.observacao ? `<div class="obs-line">${escH(c.observacao)}</div>` : '')
      + (c.motivoCancelamento ? `<div class="obs-line">Motivo: ${escH(c.motivoCancelamento)}</div>` : '')
      + (c.estornoMotivo ? `<div class="obs-line">Estornada: ${escH(c.estornoMotivo)}</div>` : '')
      + (acoes ? `<div class="btnrow">${acoes}</div>` : '') + '</div>';
  }).join('') : '<div class="notif-empty">Nenhuma compra registrada.</div>';
  cpRenderCustos_();
}
/* histórico de custos: cada custo com a data e a nota de origem */
function cpRenderCustos_(){
  const sel = document.getElementById('cpCustoIng'), box = document.getElementById('cpCustos'); if(!sel || !box) return;
  const lista = _compras_.custos || [], ings = [...new Map(lista.map(h=>[h.ingredienteId, h.ingrediente])).entries()].sort((a,b)=>String(a[1]).localeCompare(String(b[1])));
  const atual = sel.value;
  sel.innerHTML = '<option value="">Todos os ingredientes</option>' + ings.map(([id,n])=>`<option value="${id}">${escH(n)}</option>`).join('');
  if(atual) sel.value = atual;
  const ver = lista.filter(h=>!sel.value || h.ingredienteId===sel.value).slice(0,60);
  box.innerHTML = ver.length ? ver.map(h=>`<div class="notif-card"><b>${escH(h.ingrediente)}</b> — R$ ${Number(h.custo).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:6})} por ${escH(h.unidade)} · nota de ${String(h.data||'').split('-').reverse().join('/')}${h.nota ? ' nº ' + escH(h.nota) : ''} · ${escH(h.fornecedor||'')}`
    + `${!h.ativo ? ' · <span class="txt-muted">estornada</span>' : (h.aplicado ? '' : ' · <span class="txt-muted">só no histórico (já havia nota mais nova)</span>')}${h.anterior!=null ? `<div class="obs-line">Antes: R$ ${Number(h.anterior).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:6})}</div>` : ''}</div>`).join('')
    : '<div class="notif-empty">Nenhum custo de nota ainda.</div>';
}
function cfLimpar_(){ ['cfId','cfNome','cfTel','cfObs'].forEach(id=>{ document.getElementById(id).value=''; }); document.getElementById('cpFornTitulo').textContent = 'Novo fornecedor'; }
function cfEditar_(id){ const f = _compras_.fornecedores.find(x=>x.id===id); if(!f) return; document.getElementById('cfId').value = f.id; document.getElementById('cfNome').value = f.nome; document.getElementById('cfTel').value = f.telefone||''; document.getElementById('cfObs').value = f.observacao||''; document.getElementById('cpFornTitulo').textContent = 'Editar fornecedor'; document.getElementById('cfNome').focus(); }
async function salvarFornecedorUI(){
  const p = { id: document.getElementById('cfId').value, nome: document.getElementById('cfNome').value, telefone: document.getElementById('cfTel').value, observacao: document.getElementById('cfObs').value };
  try{ const r = await apiCall('salvarFornecedor', p); showMsg('cfMsg', r.message, r.ok?'ok':'warn'); if(r.ok){ cfLimpar_(); await carregarCompras_(); } }
  catch(e){ showMsg('cfMsg','Não foi possível salvar agora.','warn'); }
}
async function cfAlternar_(id){ const f = _compras_.fornecedores.find(x=>x.id===id); if(!f) return; try{ const r = await apiCall('salvarFornecedor', { id:f.id, nome:f.nome, telefone:f.telefone, observacao:f.observacao, ativo:!f.ativo }); if(r.ok) await carregarCompras_(); else showMsg('cfMsg', r.message, 'warn'); }catch(e){ showMsg('cfMsg','Não foi possível alterar agora.','warn'); } }
function cpMontarPayload_(){
  const t = cpTotais_(), st = document.getElementById('cpStatus').value;
  return { fornecedorId: document.getElementById('cpFornecedor').value, data: document.getElementById('cpData').value, status: st,
    numeroNota: document.getElementById('cpNumNota').value, frete: t.frete, desconto: t.desc, totalNota: cpNumCampo_('cpTotalNota') || undefined,
    observacao: document.getElementById('cpObs').value, editadaDe: cpEditandoDe_ || undefined,
    pagamentos: st==='Pedido' ? undefined : cpPags_.map(p=>({ valor: Number(p.valor)||0, origem: p.origem, vencimento: p.origem==='apagar' ? p.vencimento : undefined })),
    itens: cpItens_.filter(it=>it.ingredienteId || it.descricao || it.quantidade || it.valorTotal).map(it=>{ let ing = it.ingredienteId; if(!ing && it.descricao){ const x = (estoque||[]).find(e=>e.ativo!==false && cpNorm_(e.nome)===cpNorm_(it.descricao)); if(x) ing = x.id; }
      const n = Number(String(it.porEmb||'').replace(',','.'))||0;
      return { ingredienteId: ing || undefined, descricao: ing ? '' : it.descricao, descricaoNota: it.descNota || it.descricao || '', categoria: ing ? undefined : (it.categoria||'Insumos'), quantidade: Number(it.quantidade)||0, unidade: it.unidade, valorTotal: Number(it.valorTotal)||0,
        fator: n>0 ? n : undefined, embalagem: n>0 ? 'embalagem de ' + String(n).replace('.',',') + ' ' + (it.unidade||'un') : undefined }; }) };
}
function cpDepoisDeGravar_(r){
  if(r.estoque) estoque = r.estoque; if(r.movimentacoesEstoque) movimentacoesEstoque = r.movimentacoesEstoque; if(r.despesas) despesas = r.despesas; if(r.produtoPrecos) produtoPrecos = r.produtoPrecos; if(r.comboPrecos) comboPrecos = r.comboPrecos;
  salvarCache(); try{ renderEstoque(); renderProdutos(); renderCombos(); renderDespesas(); }catch(e){ if(window.erroTela_) erroTela_(e); }
  if(r.prejuizo && r.prejuizo.length) setTimeout(()=>avisar('Atenção: com o custo novo, estes itens passaram a dar PREJUÍZO (preço abaixo do custo):\n' + r.prejuizo.map(x=>'• ' + x.produto + ' (' + x.forma + '): preço ' + formatarMoeda(x.preco) + ', custo ' + formatarMoeda(x.custo)).join('\n') + '\n\nAjuste o preço em Produtos.'), 300);
}
function cpLimparForm_(){
  cpItens_ = []; cpAddItem_(); cpPagsPadrao_(); cpEditandoDe_ = ''; cpAnexo_ = null;
  ['cpObs','cpNumNota','cpFrete','cpDesconto','cpTotalNota'].forEach(id=>{ const el = document.getElementById(id); if(el) el.value=''; });
  const a = document.getElementById('cpAnexo'); if(a) a.value = ''; const ai = document.getElementById('cpAnexoInfo'); if(ai) ai.textContent = ''; const ad = document.getElementById('cpAnexoDestino'); if(ad) ad.value = cpDestinoAnexo_();
  const tt = document.getElementById('cpTituloNota'); if(tt) tt.textContent = 'Registrar nota de compra';
  cpAtualizarTotal_();
}
async function registrarCompraUI(){
  const p = cpMontarPayload_();
  if(!p.fornecedorId){ showMsg('cpMsg','Escolha o fornecedor (cadastre abaixo, se for novo).','warn'); return; }
  if(!p.itens.length){ showMsg('cpMsg','Informe ao menos um item.','warn'); return; }
  if(!cpAnexo_ && !String(p.numeroNota||'').trim() && !String(p.observacao||'').trim()){ showMsg('cpMsg','Sem foto da nota: informe o número da nota ou uma observação (para ficar o rastro).','warn'); return; }
  const t = cpTotais_();
  if(p.status !== 'Pedido'){
    const s = Math.round(p.pagamentos.reduce((a,x)=>a+x.valor,0)*100)/100;
    if(Math.abs(s - t.total) >= 0.005){ showMsg('cpMsg','Os pagamentos (' + formatarMoeda(s) + ') precisam somar o total da nota (' + formatarMoeda(t.total) + ').','warn'); return; }
    if(p.pagamentos.some(x=>x.origem==='apagar' && !x.vencimento)){ showMsg('cpMsg','Informe o vencimento do que vai ser pago depois.','warn'); return; }
  }
  const semEstoque = p.itens.filter(i=>!i.ingredienteId).map(i=>(i.descricao||'item') + ' → ' + i.categoria);
  if(!await confirmarTxt_('Registrar nota de ' + formatarMoeda(t.total) + ' (' + p.itens.length + ' item(ns))?' + (p.status==='Recebida' ? '\nO estoque e o custo (último custo pago) serão atualizados agora.' : '') + (semEstoque.length ? '\n\nSem entrada no estoque (só despesa): ' + semEstoque.join(', ') : '') + (cpAnexo_ ? '' : '\n\nSem comprovante anexado.'), 'Registrar', false, 'Nota de compra')) return;
  const btn = document.getElementById('cpBtnSalvar'); if(btn) btn.disabled = true;
  try{
    let avisoAnexo = '';
    if(cpAnexo_){ try{ const a = await cpEnviarAnexo_(cpAnexo_); p.anexoPath = a.path; p.anexoNome = a.nome; if(a.aviso) avisoAnexo = ' ' + a.aviso; } catch(e){ avisoAnexo = ' O comprovante não foi enviado (' + (e.message||'erro') + '): anexe depois em "Editar dados da nota".'; } }
    let r = await apiCall('registrarCompra', p);
    if(r && r.precisaConfirmar){
      const det = [];
      if(r.duplicada) det.push('• Nota repetida: ' + r.message.split(' Há custo')[0]);
      (r.variacoes||[]).forEach(v=>det.push('• ' + v.ingrediente + ': de R$ ' + Number(v.anterior).toLocaleString('pt-BR',{maximumFractionDigits:4}) + ' para R$ ' + Number(v.novo).toLocaleString('pt-BR',{maximumFractionDigits:4}) + ' por ' + v.unidade + ' (' + (v.pct>0?'+':'') + v.pct + '%)'));
      if(!await confirmarTxt_('Confira antes de gravar:\n\n' + det.join('\n') + '\n\nGravar mesmo assim?', 'Gravar mesmo assim', true, 'Conferência')){ showMsg('cpMsg','Nada foi gravado. Confira os valores.','warn'); return; }
      r = await apiCall('registrarCompra', Object.assign({}, p, { confirmar:true }));
    }
    showMsg('cpMsg', (r.message || '') + (r.ok ? avisoAnexo : ''), r.ok?'ok':'warn');
    if(r.ok){ cpDepoisDeGravar_(r); cpLimparForm_(); await carregarCompras_(); }
  }catch(e){ showMsg('cpMsg','Não foi possível registrar agora. Confira em "Compras recentes" antes de tentar de novo.','warn'); }
  finally{ if(btn) btn.disabled = false; }
}
/* pergunta de onde saiu o dinheiro (receber pedido e propostas da IA). Devolve as linhas de pagamento ou null. */
async function cpPerguntarPagamento_(total, sugestao, venc){
  const f = await vsForm({ titulo:'Pagamento da compra', texto:'Total: ' + formatarMoeda(total) + '. Para dividir (parte agora, parte depois), registre pela tela de Compras.', ok:'Continuar',
    campos:[ { id:'origem', tipo:'escolha', rotulo:'De onde saiu o dinheiro', valor: sugestao==='A pagar' ? 'apagar' : 'conta', opcoes: CP_ORIGENS_.map(o=>({ v:o.v, t:o.t })) },
             { id:'venc', rotulo:'Vencimento', tipo:'data', obrigatorio:true, valor: venc || cpHoje_(), mostrarSe:{ campo:'origem', valor:'apagar' } } ] });
  if(!f) return null;
  return [ { valor: Math.round(Number(total)*100)/100, origem: f.origem, vencimento: f.origem==='apagar' ? f.venc : undefined } ];
}
async function receberCompraUI(id){
  const c = (_compras_.compras||[]).find(x=>x.id===id); if(!c) return;
  const pags = await cpPerguntarPagamento_(c.total, c.pagamento, c.vencimento); if(!pags) return;
  try{
    const r = await apiCall('receberCompra', { id, pagamentos: pags });
    showMsg('cpListaMsg', r.message, r.ok?'ok':'warn');
    if(r.ok){ cpDepoisDeGravar_(r); await carregarCompras_(); }
  }catch(e){ showMsg('cpListaMsg','Não foi possível receber agora.','warn'); }
}
async function cancelarCompraUI(id){
  const f = await vsForm({ titulo:'Cancelar pedido de compra', ok:'Cancelar pedido', perigo:true,
    campos:[ { id:'motivo', rotulo:'Motivo do cancelamento', tipo:'texto', obrigatorio:true, sugestoes:['Fornecedor não entregou','Pedido feito errado'] } ] });
  if(!f) return; const motivo = f.motivo;
  const senhaAdminConfirmacao = await pedirSenha_(); if(!senhaAdminConfirmacao) return;
  try{ const r = await apiCall('cancelarCompra', { id, motivo, senhaAdminConfirmacao }); showMsg('cpListaMsg', r.message, r.ok?'ok':'warn'); if(r.ok) await carregarCompras_(); }
  catch(e){ showMsg('cpListaMsg','Não foi possível cancelar agora.','warn'); }
}
/* estorno: devolve o estoque, cancela as despesas (o que saiu do caixa aberto volta para a gaveta) e volta o custo se esta nota era a fonte */
async function cpEstornar_(id, motivo){
  const senhaAdminConfirmacao = await pedirSenha_(); if(!senhaAdminConfirmacao) return { ok:false, message:'Estorno não feito: a senha é pedida sempre.' };
  let r = await apiCall('estornarCompra', { id, motivo, senhaAdminConfirmacao });
  if(r && r.precisaConfirmar){
    const det = (r.negativos||[]).map(n=>'• ' + n.ingrediente + ': tem ' + n.atual + ' ' + n.unidade + ', o estorno tira ' + n.tirar + ' → fica ' + n.fica).join('\n');
    if(!await confirmarTxt_(r.message + '\n\n' + det, 'Estornar mesmo assim', true, 'Estoque já usado')) return { ok:false, message:'Estorno não feito.' };
    r = await apiCall('estornarCompra', { id, motivo, confirmarNegativo:true, senhaAdminConfirmacao });
  }
  return r;
}
async function estornarCompraUI(id){
  const f = await vsForm({ titulo:'Estornar nota de compra', texto:'Desfaz tudo o que a nota fez: estoque, custo e despesas. A nota fica no histórico como estornada.', ok:'Estornar', perigo:true,
    campos:[ { id:'motivo', rotulo:'Motivo', tipo:'texto', obrigatorio:true, sugestoes:['Lançada errada','Mercadoria devolvida','Nota duplicada'] } ] });
  if(!f) return;
  try{ const r = await cpEstornar_(id, f.motivo); showMsg('cpListaMsg', r.message, r.ok?'ok':'warn'); if(r.ok){ cpDepoisDeGravar_(r); await carregarCompras_(); } }
  catch(e){ showMsg('cpListaMsg','Não foi possível estornar agora.','warn'); }
}
/* corrigir: estorna e abre a nota no formulário para relançar já com os dados (o histórico guarda as duas versões) */
async function cpCorrigirUI_(id){
  const c = (_compras_.compras||[]).find(x=>x.id===id); if(!c) return;
  if(!await confirmarTxt_('Para corrigir itens, valores ou pagamento, a nota é ESTORNADA e reaberta no formulário para você ajustar e registrar de novo.\n\nContinuar?', 'Estornar e corrigir', true, 'Corrigir nota')) return;
  try{
    const r = await cpEstornar_(id, 'Correção da nota');
    if(!r.ok){ showMsg('cpListaMsg', r.message, 'warn'); return; }
    cpDepoisDeGravar_(r);
    cpEditandoDe_ = c.id;
    document.getElementById('cpFornecedor').value = c.fornecedorId; document.getElementById('cpData').value = c.data; document.getElementById('cpStatus').value = 'Recebida'; cpMudouStatus_();
    document.getElementById('cpNumNota').value = c.numeroNota||''; document.getElementById('cpObs').value = c.observacao||'';
    document.getElementById('cpFrete').value = Number(c.frete)||''; document.getElementById('cpDesconto').value = Number(c.desconto)||''; document.getElementById('cpTotalNota').value = '';
    cpItens_ = (c.itens||[]).map(i=>({ ingredienteId: i.ingredienteId||'', descricao: i.ingredienteId ? '' : i.descricao, descNota: i.descricaoNota||'', quantidade: String(i.quantidade), unidade: i.unidade||'un', valorTotal: String(i.valorTotal), emb:'', porEmb: i.fator ? String(i.fator) : '', categoria: i.categoria||'Insumos' }));
    if(!cpItens_.length) cpItens_.push(cpItemVazio_());
    cpPags_ = (c.pagamentos||[]).map(p=>({ valor:String(p.valor), origem:p.origem, vencimento:p.vencimento||'' })); cpPagsMexeu_ = true; if(!cpPags_.length) cpPagsPadrao_();
    cpRenderItens_(); cpRenderPags_();
    const tt = document.getElementById('cpTituloNota'); if(tt) tt.textContent = 'Corrigir nota (relançar)';
    await carregarCompras_();
    const card = document.getElementById('cardCompraNova'); if(card) card.scrollIntoView({ behavior:'smooth', block:'start' });
    showMsg('cpMsg', 'Nota estornada e carregada aqui. Ajuste e toque em Registrar. O comprovante antigo continua na nota estornada.', 'ok');
  }catch(e){ showMsg('cpListaMsg','Não foi possível corrigir agora.','warn'); }
}
/* campos sem efeito: nº da nota, observação e comprovante (editam livres) */
async function cpEditarInfoUI_(id){
  const c = (_compras_.compras||[]).find(x=>x.id===id); if(!c) return;
  const f = await vsForm({ titulo:'Dados da nota', texto:'Para mudar itens, valores ou pagamento, use "Corrigir nota".', ok:'Salvar',
    campos:[ { id:'numero', rotulo:'Nº da nota', tipo:'texto', valor:c.numeroNota||'', max:60 }, { id:'obs', rotulo:'Observação', tipo:'texto', valor:c.observacao||'', max:300 },
             { id:'anexo', tipo:'escolha', rotulo:'Comprovante', valor:'manter', opcoes:[ { v:'manter', t: c.anexoPath ? 'Manter o atual' : 'Continuar sem' }, { v:'novo', t:'Anexar foto/PDF agora' } ].concat(c.anexoPath ? [ { v:'tirar', t:'Remover' } ] : []) },
             { id:'destino', tipo:'escolha', rotulo:'Guardar o novo comprovante em', valor: cpDestinoAnexo_(), opcoes:[ { v:'ambos', t:'Os dois Drives' }, { v:'principal', t:'Só no principal' }, { v:'contingencia', t:'Só na contingência' } ] } ] });
  if(!f) return;
  const p = { id, numeroNota: f.numero, observacao: f.obs };
  try{
    if(f.anexo === 'tirar'){ p.anexoPath = ''; p.anexoNome = ''; }
    if(f.anexo === 'novo'){
      const arq = await new Promise(ok=>{ const inp = document.createElement('input'); inp.type='file'; inp.accept='image/*,application/pdf'; inp.onchange = ()=>ok(inp.files && inp.files[0]); inp.click(); });
      if(!arq){ showMsg('cpListaMsg','Nenhum arquivo escolhido.','warn'); return; }
      cpGuardarDestino_(f.destino); const a = await cpEnviarAnexo_(arq, f.destino); p.anexoPath = a.path; p.anexoNome = a.nome; if(a.aviso) showMsg('cpListaMsg', a.aviso, 'warn');
    }
    const r = await apiCall('editarCompraInfo', p); showMsg('cpListaMsg', r.message, r.ok?'ok':'warn'); if(r.ok) await carregarCompras_();
  }catch(e){ showMsg('cpListaMsg', (e && e.message) || 'Não foi possível salvar agora.','warn'); }
}

/* ---------- PROPOSTAS DA IA (só Admin/Dev): a IA propõe; só grava quando o administrador toca em Confirmar ---------- */
var _iaProps_ = {}, _iaPropSeq_ = 0, _cpPend_ = null;
function iaNorm_(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/\s+/g,' ').trim(); }
function iaAchar_(lista, nome, campo){
  const n = iaNorm_(nome); if(!n) return null;
  let m = lista.filter(x=>iaNorm_(x[campo])===n); if(m.length===1) return m[0]; if(m.length>1) return null;
  m = lista.filter(x=>{ const k = iaNorm_(x[campo]); return k && (k.includes(n) || n.includes(k)); });
  return m.length===1 ? m[0] : null;
}
function iaUnidOk_(a, b){ const g = { kg:'m', g:'m', l:'v', ml:'v', un:'u' }; return !!g[a] && g[a]===g[b]; }
async function iaPropPreparar_(p){
  if(p && IA_ACOES_[p.tipo]) return iaAcaoPreparar_(p);
  if(!p || (p.tipo!=='registrar_compra' && p.tipo!=='cadastrar_fornecedor')) return null;
  try{ if(!_compras_.fornecedores.length){ const r = await apiCall('listarCompras', {}); if(r && r.ok) _compras_ = { fornecedores:r.fornecedores||[], compras:r.compras||[] }; } }catch(e){}
  const id = 'p' + (++_iaPropSeq_), pend = [];
  const o = { id, tipo:p.tipo, bruto:p, pend, feito:false };
  if(p.tipo==='cadastrar_fornecedor'){
    const ja = iaAchar_(_compras_.fornecedores, p.nome, 'nome');
    if(ja) pend.push('Já existe um fornecedor parecido: ' + ja.nome + '.');
  }else{
    const f = iaAchar_(_compras_.fornecedores.filter(x=>x.ativo), p.fornecedor, 'nome');
    o.fornecedor = f; if(!f) pend.push('Fornecedor "' + p.fornecedor + '" não encontrado (cadastre antes).');
    const ing = (estoque||[]).filter(e=>e.ativo!==false);
    o.itens = p.itens.map(it=>{
      const e = iaAchar_(ing, it.ingrediente, 'nome');
      if(!e) pend.push('Item "' + it.ingrediente + '" não está no estoque.');
      else if(!iaUnidOk_(it.unidade, e.unidade)) pend.push('"' + e.nome + '": unidade ' + it.unidade + ' não combina com ' + e.unidade + '.');
      return Object.assign({}, it, { est:e });
    });
    if(p.pagamento==='A pagar' && !p.vencimento) pend.push('Falta a data de vencimento.');
  }
  _iaProps_[id] = o; return o;
}
function iaPropHtml_(o){
  if(!o) return '';
  if(o.generico) return iaAcaoHtml_(o);
  const p = o.bruto, L = [];
  if(o.tipo==='cadastrar_fornecedor'){
    L.push('<b>Cadastrar fornecedor</b>: ' + escH(p.nome) + (p.telefone ? ' · ' + escH(p.telefone) : '') + (p.observacao ? '<br>' + escH(p.observacao) : ''));
  }else{
    L.push('<b>Registrar compra</b> · ' + (o.fornecedor ? '✅ ' + escH(o.fornecedor.nome) : '⚠️ ' + escH(p.fornecedor)));
    o.itens.forEach(it=>L.push((it.est ? '✅ ' : '⚠️ ') + escH(it.est ? it.est.nome : it.ingrediente) + ': ' + it.quantidade + ' ' + escH(it.unidade) + ' por ' + formatarMoeda(it.valorTotal)));
    L.push('Total: <b>' + formatarMoeda(o.itens.reduce((s,i)=>s+i.valorTotal,0)) + '</b> · ' + escH(p.pagamento) + (p.vencimento ? ' (vence ' + escH(p.vencimento.split('-').reverse().join('/')) + ')' : '') + ' · entra no estoque agora');
  }
  if(o.pend.length) L.push('<span style="color:#b45309;">' + o.pend.map(escH).join('<br>') + '</span>');
  const bloqueia = o.pend.length && o.tipo==='registrar_compra';
  return '<div class="notif-card mt-2" data-prop="' + o.id + '">' + L.join('<br>') +
    '<div class="btnrow mt-2"><button type="button" class="small-gold" data-prop-ac="ok"' + (bloqueia ? ' disabled' : '') + '>Confirmar e gravar</button>' +
    (o.tipo==='registrar_compra' ? ' <button type="button" class="ghost" data-prop-ac="rev">Revisar na tela</button>' : '') +
    ' <button type="button" class="ghost" data-prop-ac="no">Descartar</button></div><div class="obs-line" data-prop-msg></div></div>';
}
async function iaPropAgir_(btn){
  const card = btn.closest('[data-prop]'); if(!card) return;
  const o = _iaProps_[card.getAttribute('data-prop')]; if(!o || o.feito) return;
  const ac = btn.getAttribute('data-prop-ac'), msg = card.querySelector('[data-prop-msg]');
  if(o.generico){
    if(ac==='no'){ msg.textContent = 'Descartado. Nada foi gravado.'; card.querySelectorAll('button').forEach(b=>{ b.disabled = true; }); o.feito = true; return; }
    return iaAcaoAgir_(card, o, msg);
  }
  const fim = (t, ok) => { msg.textContent = t; card.querySelectorAll('button').forEach(b=>{ b.disabled = true; }); o.feito = true; };
  if(ac==='no'){ fim('Descartado. Nada foi gravado.'); return; }
  if(ac==='rev'){
    _cpPend_ = o; o.feito = true; card.querySelectorAll('button').forEach(b=>{ b.disabled = true; });
    const m = document.getElementById('chatPublicoModal'); if(m) m.classList.remove('open'); window.__avisosAberto_ = false;
    abrirAdministrador('compras'); msg.textContent = 'Aberto na tela de compras para revisão.'; return;
  }
  card.querySelectorAll('button').forEach(b=>{ b.disabled = true; }); msg.textContent = 'Gravando…';
  try{
    let r;
    if(o.tipo==='cadastrar_fornecedor') r = await apiCall('salvarFornecedor', { nome:o.bruto.nome, telefone:o.bruto.telefone, observacao:o.bruto.observacao });
    else {
      const tot = Math.round(o.itens.reduce((a,i)=>a+(Number(i.valorTotal)||0),0)*100)/100;
      const pags = await cpPerguntarPagamento_(tot, o.bruto.pagamento, o.bruto.vencimento);   // auditoria 18/10: antes ia sempre "não saiu do caixa"
      if(!pags){ msg.textContent = 'Nada foi gravado (pagamento não informado).'; card.querySelectorAll('button').forEach(b=>{ b.disabled = false; }); return; }
      r = await apiCall('registrarCompra', { fornecedorId:o.fornecedor.id, data:cpHoje_(), status:'Recebida', pagamentos:pags, observacao:o.bruto.observacao, origem:'ia', confirmar:true,
        itens:o.itens.map(it=>({ ingredienteId:it.est.id, quantidade:it.quantidade, unidade:it.unidade, valorTotal:it.valorTotal })) });
    }
    if(r && r.ok){
      if(r.estoque) estoque = r.estoque; if(r.movimentacoesEstoque) movimentacoesEstoque = r.movimentacoesEstoque; if(r.despesas) despesas = r.despesas;
      _compras_ = { fornecedores:[], compras:[] };
      fim('✅ ' + (r.message || 'Gravado.'));
    }else{ msg.textContent = '⚠️ ' + ((r && r.message) || 'Não foi possível gravar.'); card.querySelectorAll('button').forEach(b=>{ b.disabled = false; }); }
  }catch(e){ msg.textContent = '⚠️ Não foi possível gravar agora. Confira em Compras recentes antes de tentar de novo.'; card.querySelectorAll('button').forEach(b=>{ b.disabled = false; }); }
}
document.addEventListener('click', ev=>{ const b = ev.target && ev.target.closest && ev.target.closest('[data-prop-ac]'); if(b) iaPropAgir_(b); });
function cpAplicarPend_(){
  const o = _cpPend_; _cpPend_ = null; if(!o || o.tipo!=='registrar_compra') return;
  const p = o.bruto;
  cpItens_ = o.itens.map(it=>({ ingredienteId: it.est ? it.est.id : '', descricao: it.est ? '' : it.ingrediente, quantidade: it.quantidade, unidade: it.unidade, valorTotal: it.valorTotal }));
  cpRenderItens_();
  if(o.fornecedor) document.getElementById('cpFornecedor').value = o.fornecedor.id;
  const tot = Math.round(cpItens_.reduce((a,i)=>a+(Number(i.valorTotal)||0),0)*100)/100;
  cpPags_ = [ { valor: String(tot), origem: p.pagamento==='A pagar' ? 'apagar' : 'conta', vencimento: p.vencimento || '' } ]; cpPagsMexeu_ = true; cpRenderPags_();
  document.getElementById('cpObs').value = p.observacao || 'Proposta da assistente';
  showMsg('cpMsg', 'Sugestão da IA carregada. Confira e toque em registrar.' + (o.pend.length ? ' ' + o.pend.join(' ') : ''), o.pend.length ? 'warn' : 'ok');
}
/* ---------- OUTRAS AÇÕES DA IA (só Admin/Dev): sempre cartão + Confirmar; quem grava é o app, pelas mesmas funções das telas ---------- */
const IA_FATOR_UN_ = { kg:{kg:1,g:1000}, g:{g:1,kg:0.001}, l:{l:1,ml:1000}, ml:{ml:1,l:0.001}, un:{un:1} };
function iaConvQtd_(qtd, de, para){ de = String(de||'').toLowerCase(); para = String(para||'').toLowerCase(); if(!de || de===para) return qtd; const f = IA_FATOR_UN_[de] && IA_FATOR_UN_[de][para]; return f ? Math.round(qtd*f*1000)/1000 : null; }
function iaNum_(n){ return String(Math.round(Number(n)*1000)/1000).replace('.', ','); }
function iaDataBR_(d){ return String(d||'').split('-').reverse().join('/'); }
function iaAchar2_(lista, nome, campo, nomeLista){
  /* devolve {item} ou {erro}. Mais de um parecido = erro (nunca escolhe no chute). */
  const n = iaNorm_(nome); if(!n) return { erro:'Informe o nome.' };
  let m = lista.filter(x=>iaNorm_(x[campo])===n);
  if(!m.length) m = lista.filter(x=>{ const k = iaNorm_(x[campo]); return k && (k.includes(n) || n.includes(k)); });
  if(m.length===1) return { item:m[0] };
  if(!m.length) return { erro:'Não encontrei "' + nome + '"' + (nomeLista ? ' em ' + nomeLista : '') + '.' };
  return { erro:'Mais de um combina com "' + nome + '": ' + m.slice(0,4).map(x=>x[campo]).join(', ') + '. Diga qual.' };
}
const IA_ACOES_ = {
  receber_compra: { titulo:'Receber pedido de compra', admin:true,
    async prep(p, o){ await iaCarregarCompras_();
      const r = iaAchar2_(_compras_.compras.filter(c=>c.status==='Pedido'), p.fornecedor, 'fornecedor', 'pedidos de compra pendentes'); if(r.erro){ o.pend.push(r.erro); return; }
      o.compra = r.item; o.linhas.push('Pedido de ' + escH(r.item.fornecedor) + ' · ' + formatarMoeda(r.item.total) + ' · ' + escH(iaDataBR_(r.item.data)));
      o.linhas.push('Pagamento: ' + escH(p.pagamento) + (p.vencimento ? ' (vence ' + escH(iaDataBR_(p.vencimento)) + ')' : '') + ' · entra no estoque agora');
      if(p.pagamento==='A pagar' && !p.vencimento) o.pend.push('Falta a data de vencimento.'); },
    async exec(p, o){ const pags = await cpPerguntarPagamento_(o.compra.total, p.pagamento, p.vencimento); if(!pags) return { ok:false, message:'Nada foi gravado (pagamento não informado).' }; return apiCall('receberCompra', { id:o.compra.id, pagamentos:pags }); } },
  cancelar_compra: { titulo:'Cancelar pedido de compra', admin:true, senha:true,
    async prep(p, o){ await iaCarregarCompras_();
      const r = iaAchar2_(_compras_.compras.filter(c=>c.status==='Pedido'), p.fornecedor, 'fornecedor', 'pedidos de compra pendentes'); if(r.erro){ o.pend.push(r.erro); return; }
      o.compra = r.item; o.linhas.push('Pedido de ' + escH(r.item.fornecedor) + ' · ' + formatarMoeda(r.item.total) + ' · ' + escH(iaDataBR_(r.item.data))); o.linhas.push('Motivo: ' + escH(p.motivo)); },
    exec(p, o, senha){ return apiCall('cancelarCompra', { id:o.compra.id, motivo:p.motivo, senhaAdminConfirmacao:senha }); } },
  lancar_despesa: { titulo:'Lançar despesa',
    async prep(p, o){
      const cats = (typeof CATEGORIAS_DESPESA_PADRAO!=='undefined' ? CATEGORIAS_DESPESA_PADRAO : []);
      const c = cats.find(x=>iaNorm_(x)===iaNorm_(p.categoria)); o.categoria = c || 'Outros';
      o.linhas.push(escH(p.descricao) + ' · <b>' + formatarMoeda(p.valor) + '</b> · ' + escH(o.categoria) + (c ? '' : ' (categoria não reconhecida: vai como Outros)'));
      o.linhas.push(escH(p.situacao) + (p.situacao==='A pagar' ? ' · vence ' + escH(iaDataBR_(p.vencimento)) : '') + (p.situacao==='Paga' ? (p.saiuDoCaixa ? ' · sai do caixa' : ' · fora do caixa') : ''));
      if(p.situacao==='A pagar' && !p.vencimento) o.pend.push('Falta a data de vencimento.');
      if(p.situacao==='Paga' && p.saiuDoCaixa && !sessaoCaixa) o.pend.push('Abra o caixa para lançar uma despesa que sai do caixa.'); },
    exec(p, o){ return apiCall('addDespesa', { descricao:p.descricao, valor:p.valor, observacao:p.observacao, categoria:o.categoria, situacao:p.situacao, vencimento:p.vencimento, saiuDoCaixa:p.situacao==='Paga' ? p.saiuDoCaixa : false }); } },
  pagar_despesa: { titulo:'Pagar despesa',
    async prep(p, o){ const r = iaAchar2_((despesas||[]).filter(d=>d.status==='Confirmada' && d.situacao==='A pagar'), p.busca, 'descricao', 'contas a pagar'); if(r.erro){ o.pend.push(r.erro); return; }
      o.desp = r.item; o.valorPago = p.valorPago || Number(r.item.valor);
      o.linhas.push(escH(r.item.descricao) + ' · vence ' + escH(iaDataBR_(r.item.vencimento)) + ' · valor ' + formatarMoeda(r.item.valor));
      o.linhas.push('Pagar <b>' + formatarMoeda(o.valorPago) + '</b>' + (p.saiuDoCaixa ? ' · sai do caixa' : ' · fora do caixa'));
      if(p.saiuDoCaixa && !sessaoCaixa) o.pend.push('Abra o caixa para pagar com dinheiro do caixa.'); },
    exec(p, o){ return apiCall('pagarDespesa', { id:o.desp.id, saiuDoCaixa:p.saiuDoCaixa, valorPago:o.valorPago }); } },
  cancelar_despesa: { titulo:'Cancelar despesa', senha:true,
    async prep(p, o){ const r = iaAchar2_((despesas||[]).filter(d=>d.status==='Confirmada'), p.busca, 'descricao', 'despesas'); if(r.erro){ o.pend.push(r.erro); return; }
      o.desp = r.item; o.linhas.push(escH(r.item.descricao) + ' · ' + formatarMoeda(r.item.valor) + ' · ' + escH(r.item.situacao||'')); o.linhas.push('Motivo: ' + escH(p.motivo)); },
    exec(p, o, senha){ return apiCall('cancelarDespesa', { id:o.desp.id, motivo:p.motivo, senhaAdminConfirmacao:senha }); } },
  estoque_entrada: { titulo:'Entrada de estoque', async prep(p, o){ return iaPrepEstoque_(p, o, 'entrada'); },
    exec(p, o){ return apiCall('registrarEntradaEstoque', { ingredienteId:o.ing.id, quantidade:o.qtd, motivo:p.motivo || 'Entrada pelo Assistente' }); } },
  estoque_perda: { titulo:'Perda de estoque', async prep(p, o){ return iaPrepEstoque_(p, o, 'perda'); },
    exec(p, o){ return apiCall('registrarPerdaEstoque', { ingredienteId:o.ing.id, quantidade:o.qtd, motivo:p.motivo || 'Perda registrada pelo Assistente' }); } },
  estoque_inventario: { titulo:'Inventário de estoque (contagem)', async prep(p, o){ return iaPrepEstoque_(p, o, 'inventario'); },
    exec(p, o){ return apiCall('registrarInventarioEstoque', { ingredienteId:o.ing.id, novaQuantidade:o.qtd, motivo:p.motivo || 'Contagem pelo Assistente' }); } },
  cadastrar_ingrediente: { titulo:'Cadastrar ingrediente',
    async prep(p, o){ const ja = iaAchar_((estoque||[]), p.nome, 'nome'); if(ja) o.pend.push('Já existe um ingrediente parecido: ' + ja.nome + '.');
      o.linhas.push('<b>' + escH(p.nome) + '</b> · unidade ' + escH(p.unidade) + ' · em estoque ' + iaNum_(p.quantidade) + ' · mínimo ' + iaNum_(p.minimo) + ' · custo ' + formatarMoeda(p.custo) + ' por ' + escH(p.unidade)); },
    exec(p){ return apiCall('addIngrediente', { nome:p.nome, quantidade:p.quantidade, minimo:p.minimo, unidade:p.unidade, custo:p.custo }); } },
  editar_ingrediente: { titulo:'Editar ingrediente',
    async prep(p, o){ const r = iaAchar2_((estoque||[]), p.ingrediente, 'nome', 'estoque'); if(r.erro){ o.pend.push(r.erro); return; }
      const e = r.item; o.ing = e; o.novo = { nome:p.nome!=null ? p.nome : e.nome, minimo:p.minimo!=null ? p.minimo : Number(e.minimo)||0, custo:p.custo!=null ? p.custo : Number(e.custo)||0, unidade:p.unidade || e.unidade, ativo:typeof p.ativo==='boolean' ? p.ativo : e.ativo!==false };
      if(p.unidade && p.unidade!==e.unidade) o.pend.push('Trocar a unidade de ' + e.unidade + ' para ' + p.unidade + ' muda o significado da quantidade em estoque. Faça pela tela de Estoque.');
      const mud = []; if(p.nome!=null) mud.push('nome: ' + escH(e.nome) + ' → ' + escH(p.nome)); if(p.minimo!=null) mud.push('mínimo: ' + iaNum_(e.minimo) + ' → ' + iaNum_(p.minimo)); if(p.custo!=null) mud.push('custo: ' + formatarMoeda(e.custo) + ' → ' + formatarMoeda(p.custo)); if(typeof p.ativo==='boolean') mud.push(p.ativo ? 'reativar' : 'desativar');
      o.linhas.push('<b>' + escH(e.nome) + '</b>: ' + (mud.join(' · ') || 'sem mudanças')); if(!mud.length) o.pend.push('Nada para mudar.'); },
    exec(p, o){ const e = o.ing, n = o.novo; return apiCall('editarIngrediente', { id:e.id, nome:n.nome, quantidade:Number(e.quantidade)||0, minimo:n.minimo, unidade:n.unidade, custo:n.custo, ativo:n.ativo }); } },
  salvar_cliente: { titulo:'Cadastrar ou atualizar cliente',
    async prep(p, o){ const dig = normTel(p.telefone); const ja = (clientes||[]).find(c=>normTel(c.telefone)===dig); o.cliExistente = ja || null;
      o.linhas.push('<b>' + escH(p.nome) + '</b> · ' + escH(p.telefone) + (p.dataNascimento ? ' · nasc. ' + escH(iaDataBR_(p.dataNascimento)) : '') + (p.endereco ? '<br>' + escH(p.endereco) : '') + (p.observacao ? '<br>' + escH(p.observacao) : ''));
      o.linhas.push(ja ? 'Já existe o cliente <b>' + escH(ja.nome || '(sem nome)') + '</b> com esse telefone: os dados serão atualizados.' : 'Cliente novo.'); },
    exec(p, o){ const ja = o.cliExistente; return apiCallFila('salvarCliente', { id: ja ? ja.id : '', nome:p.nome, telefone:p.telefone, dataNascimento:p.dataNascimento || (ja && ja.dataNascimento) || '', endereco:p.endereco || (ja && ja.endereco) || '', comoConheceu:(ja && ja.comoConheceu) || '', observacao:p.observacao || (ja && ja.observacao) || '' }); } },
  registrar_ocorrencia: { titulo:'Registrar ocorrência',
    async prep(p, o){ let vid = null;
      if(p.pedido){ const v = (vendas||[]).find(x=>String(rotuloPedido(x))===String(p.pedido).replace(/^#/,'')); if(v) vid = v.id; else o.pend.push('Pedido ' + p.pedido + ' não encontrado.'); }
      o.vendaId = vid; o.linhas.push('Tipo: ' + escH(p.tipoOcorrencia) + (p.pedido ? ' · pedido ' + escH(p.pedido) : '')); o.linhas.push(escH(p.descricao)); },
    exec(p, o){ return apiCallFila('registrarOcorrencia', { tipo:p.tipoOcorrencia, vendaId:o.vendaId, descricao:p.descricao }, 'Ocorrência'); } },
  registrar_sangria: { titulo:'Sangria do caixa',
    async prep(p, o){ o.linhas.push('Retirar <b>' + formatarMoeda(p.valor) + '</b> do caixa · ' + escH(p.motivo)); if(!sessaoCaixa) o.pend.push('O caixa está fechado. Abra o caixa primeiro.'); },
    exec(p){ return apiCall('addSangria', { valor:p.valor, motivo:p.motivo }); } },
  ajuste_pos_venda: { titulo:'Ajuste pós-venda', senha:true,
    async prep(p, o){ const v = (vendas||[]).find(x=>String(rotuloPedido(x))===String(p.pedido).replace(/^#/,'')); if(!v){ o.pend.push('Pedido ' + p.pedido + ' não encontrado.'); return; }
      o.venda = v; o.linhas.push('Pedido ' + escH(rotuloPedido(v)) + ' · ' + escH(v.clienteNome||'') + ' · total ' + formatarMoeda(v.valorTotal));
      o.linhas.push(escH(p.tipoAjuste) + ' de <b>' + formatarMoeda(p.valor) + '</b> · motivo: ' + escH(p.motivo) + (p.detalhe ? ' — ' + escH(p.detalhe) : '') + (AJ_TIPOS_COM_SAIDA_.indexOf(p.tipoAjuste)!==-1 ? ' · sai ' + escH(p.saida.toLowerCase()) : ''));
      if(p.valor > Number(v.valorTotal) + 0.001) o.pend.push('O ajuste não pode ser maior que o valor da venda (' + formatarMoeda(v.valorTotal) + ').');
      if(p.motivo==='Outro' && !p.detalhe) o.pend.push('Descreva o motivo (detalhe).');
      if(AJ_TIPOS_COM_SAIDA_.indexOf(p.tipoAjuste)!==-1 && p.saida==='Do caixa' && !sessaoCaixa) o.pend.push('Abra o caixa para uma saída do caixa.'); },
    exec(p, o, senha){ return apiCall('registrarAjustePosVenda', { vendaId:o.venda.id, tipo:p.tipoAjuste, valor:p.valor, motivo:p.motivo, detalhe:p.detalhe, saida:p.saida, senhaAdminConfirmacao:senha }); } },
  registrar_brinde: { titulo:'Brinde (prêmio) do cliente',
    async prep(p, o){ const r = iaAchar2_((produtos||[]).filter(x=>x.ativo!==false), p.produto, 'nome', 'produtos'); if(r.erro) o.pend.push(r.erro); else o.prod = r.item;
      const dig = normTel(p.telefone); const cli = (clientes||[]).find(c=>normTel(c.telefone)===dig);
      o.linhas.push('Brinde ' + escH(p.tipoBrinde) + ': <b>' + escH(o.prod ? o.prod.nome : p.produto) + '</b> para ' + escH(cli ? (cli.nome||p.telefone) : p.telefone) + ' · zera o cartão (ou marca a indicação) e baixa o estoque');
      if(!cli) o.pend.push('Cliente com esse telefone não encontrado.');
      if(!sessaoCaixa) o.pend.push('Abra o caixa antes de lançar o brinde.');
      if(p.tipoBrinde==='Indicação'){ const ind = (indicacoes||[]).find(i=>normTel(i.telIndicador)===dig && !i.resgatado); if(!ind) o.pend.push('Indicação pendente não encontrada.'); else o.telIndicado = ind.telIndicado; } },
    exec(p, o){ return apiCall('registrarBrinde', { tipo:p.tipoBrinde, produtoId:o.prod.id, telefone:p.telefone, telIndicado:o.telIndicado || null }); } }
};
async function iaCarregarCompras_(){ try{ if(!_compras_.compras.length){ const r = await apiCall('listarCompras', {}); if(r && r.ok) _compras_ = { fornecedores:r.fornecedores||[], compras:r.compras||[] }; } }catch(e){} }
async function iaPrepEstoque_(p, o, modo){
  const r = iaAchar2_((estoque||[]).filter(e=>e.ativo!==false), p.ingrediente, 'nome', 'estoque'); if(r.erro){ o.pend.push(r.erro); return; }
  const e = r.item; o.ing = e; const bruto = modo==='inventario' ? p.novaQuantidade : p.quantidade;
  const q = iaConvQtd_(bruto, p.unidade || e.unidade, e.unidade);
  if(q===null){ o.pend.push('A unidade ' + p.unidade + ' não combina com ' + e.unidade + ' (unidade do estoque).'); return; }
  o.qtd = q; const atual = Number(e.quantidade) || 0;
  if(modo==='entrada') o.linhas.push('Entrada de <b>' + iaNum_(q) + ' ' + escH(e.unidade) + '</b> em ' + escH(e.nome) + ' (hoje ' + iaNum_(atual) + ' → ' + iaNum_(atual+q) + ')');
  else if(modo==='perda'){ o.linhas.push('Perda de <b>' + iaNum_(q) + ' ' + escH(e.unidade) + '</b> de ' + escH(e.nome) + ' (hoje ' + iaNum_(atual) + ' → ' + iaNum_(Math.max(0, atual-q)) + ')'); if(q>atual+0.0001) o.pend.push('A perda é maior que o estoque atual (' + iaNum_(atual) + ' ' + e.unidade + ').'); }
  else o.linhas.push('Contagem de <b>' + escH(e.nome) + '</b>: de ' + iaNum_(atual) + ' para <b>' + iaNum_(q) + ' ' + escH(e.unidade) + '</b>');
  if(p.motivo) o.linhas.push('Motivo: ' + escH(p.motivo));
}
async function iaAcaoPreparar_(p){
  const def = IA_ACOES_[p.tipo], id = 'p' + (++_iaPropSeq_), o = { id, tipo:p.tipo, bruto:p, pend:[], linhas:[], feito:false, generico:true, def };
  try{ await def.prep(p, o); }catch(e){ o.pend.push('Não consegui conferir os dados agora. Use a tela correspondente.'); }
  _iaProps_[id] = o; return o;
}
function iaAcaoHtml_(o){
  const def = o.def; let h = '<b>' + escH(def.titulo) + '</b><br>' + o.linhas.join('<br>');
  if(o.pend.length) h += '<br><span style="color:#b45309;">' + o.pend.map(escH).join('<br>') + '</span>';
  if(def.senha) h += '<label style="display:block;margin-top:8px;font-size:13px;">Sua senha de Administrador, para confirmar</label><input type="password" data-prop-senha autocomplete="current-password" style="width:100%;">';
  return '<div class="notif-card mt-2" data-prop="' + o.id + '">' + h +
    '<div class="btnrow mt-2"><button type="button" class="small-gold" data-prop-ac="ok"' + (o.pend.length ? ' disabled' : '') + '>Confirmar e gravar</button> <button type="button" class="ghost" data-prop-ac="no">Descartar</button></div><div class="obs-line" data-prop-msg></div></div>';
}
async function iaAcaoAgir_(card, o, msg){
  const def = o.def; let senha = '';
  if(def.senha){ const inp = card.querySelector('[data-prop-senha]'); senha = inp ? inp.value : ''; if(!senha){ msg.textContent = 'Digite a sua senha de Administrador para confirmar.'; return; } }
  card.querySelectorAll('button').forEach(b=>{ b.disabled = true; }); msg.textContent = 'Gravando…';
  try{
    const r = await def.exec(o.bruto, o, senha);
    if(r && r.ok){
      iaAplicarResposta_(r); o.feito = true;
      const inp = card.querySelector('[data-prop-senha]'); if(inp) inp.value = '';
      msg.textContent = '✅ ' + (r.message || 'Gravado.');
    }else{ msg.textContent = '⚠️ ' + ((r && r.message) || 'Não foi possível gravar.'); card.querySelectorAll('button').forEach(b=>{ b.disabled = false; }); }
  }catch(e){ msg.textContent = '⚠️ Não foi possível gravar agora. Confira na tela antes de tentar de novo.'; card.querySelectorAll('button').forEach(b=>{ b.disabled = false; }); }
}
/* atualiza as listas em memória com o que o servidor devolveu (igual às telas) e redesenha o que existir */
function iaAplicarResposta_(r){
  try{
    if(r.estoque) estoque = r.estoque; if(r.movimentacoesEstoque) movimentacoesEstoque = r.movimentacoesEstoque; if(r.despesas) despesas = r.despesas;
    if(r.clientes) clientes = r.clientes; if(r.ocorrencias) ocorrencias = r.ocorrencias; if(r.ajustesPosVenda) ajustesPosVenda = r.ajustesPosVenda;
    if(r.fidelidade) fidelidadeClientes = r.fidelidade; if(r.indicacoes) indicacoes = r.indicacoes; if(r.sangrias) sangrias = r.sangrias;
    _compras_ = { fornecedores:[], compras:[] };
    if(typeof salvarCache==='function') salvarCache();
    ['renderEstoque','renderMovimentacoesEstoque','renderDespesas','renderContasPagar','renderClientes','renderStatusCaixa','atualizarResumoHoje'].forEach(f=>{ try{ if(typeof window[f]==='function') window[f](); }catch(e){} });
  }catch(e){}
}
/* ---------- BUSCA GLOBAL (clientes, pedidos, produtos) ---------- */
function bgNivel_(){ return currentUser ? currentUser.nivel : ''; }
function bgPodeBuscar_(){ return ['Admin','Operador','Garçom','Cozinha'].indexOf(bgNivel_())!==-1; }
function bgVeFinanceiro_(){ return ['Admin','Operador'].indexOf(bgNivel_())!==-1; }
function abrirBuscaGlobal(){
  if(!bgPodeBuscar_()) return;
  document.getElementById('buscaGlobalModal').classList.add('open');
  const i = document.getElementById('bgTermo'); i.value = ''; renderBuscaGlobal_(); setTimeout(()=>i.focus(), 50);
}
function fecharBuscaGlobal(){ document.getElementById('buscaGlobalModal').classList.remove('open'); }
function bgAbrirCliente_(id){ fecharBuscaGlobal(); abrirPerfilCliente(id); }
function bgAbrirProduto_(tipo, id){ fecharBuscaGlobal(); try{ if(tipo==='Combo') abrirEditarCombo(id); else abrirEditarProduto(id); }catch(e){ try{ avisar('Não consegui abrir o cadastro agora.'); }catch(_){} } }
function bgPodeEditarProduto_(){ const n = bgNivel_(); return n==='Admin' || (currentUser && currentUser.nivelReal==='Desenvolvedor'); }
function renderBuscaGlobal_(){
  const box = document.getElementById('bgResultado'); if(!box) return;
  const termo = document.getElementById('bgTermo').value.trim();
  if(termo.length < 2){ box.innerHTML = '<div class="notif-empty">Digite pelo menos 2 letras ou números.</div>'; return; }
  const t = semAcento_(termo), dig = normTel(termo), fin = bgVeFinanceiro_(), nivel = bgNivel_();
  const MAX = 8; let h = '';
  /* Clientes: Admin, Operador e Garçom (a aba Clientes deles) */
  if(nivel!=='Cozinha'){
    const cl = (clientes||[]).filter(c=>clienteCombinaBusca_(c, termo));
    if(cl.length) h += '<h3>Clientes ('+cl.length+')</h3>' + cl.slice(0,MAX).map(c=>`<div class="notif-card"><b>${c.nome?escH(c.nome):'(sem nome)'}</b> · ${escH(c.telefone||'')} <button class="small-gold" style="float:right;" onclick="bgAbrirCliente_('${c.id}')">abrir</button></div>`).join('');
  }
  /* Pedidos: número, nome do cliente e (só Admin/Operador) telefone */
  const ped = (vendas||[]).filter(v=>{
    if(String(rotuloPedido(v)).toLowerCase().indexOf(termo.toLowerCase().replace(/^#/,''))!==-1) return true;
    if(v.clienteNome && semAcento_(v.clienteNome).indexOf(t)!==-1) return true;
    return fin && dig.length>=4 && normTel(v.clienteTelefone).indexOf(dig)!==-1;
  }).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));
  if(ped.length) h += '<h3>Pedidos ('+ped.length+')</h3>' + ped.slice(0,MAX).map(v=>{
    const linha = `<b>#${escH(rotuloPedido(v))}</b>${seloIfood_(v)} — ${escH(v.clienteNome||'Sem cadastro')} · ${escH(v.tipoEntrega||'')} · ${escH(v.statusPedido||v.status||'')}${fin?' · '+formatarMoeda(v.valorTotal):''}`;
    const quando = v.timestamp ? '<div class="obs-line">'+escH(new Date(v.timestamp).toLocaleString('pt-BR'))+'</div>' : '';
    const itens = '<div class="obs-line">'+itensDoPedido(v.id)+'</div>';
    return `<div class="notif-card">${linha}${quando}${itens}${fin?`<details class="pd-det"><summary>ver pedido completo</summary>${pedidoDetalheHtml_(v)}</details>`:''}</div>`;
  }).join('');
  /* Produtos e combos */
  const pr = (produtos||[]).filter(p=>semAcento_(p.nome||'').indexOf(t)!==-1).map(p=>({id:p.id,n:p.nome,tipo:'Produto',ativo:p.ativo}))
    .concat((combos||[]).filter(c=>semAcento_(c.nome||'').indexOf(t)!==-1).map(c=>({id:c.id,n:c.nome,tipo:'Combo',ativo:c.ativo})));
  const podeEd = bgPodeEditarProduto_();
  if(pr.length) h += '<h3>Produtos ('+pr.length+')</h3>' + pr.slice(0,MAX).map(x=>`<div class="notif-card" style="display:flex;align-items:center;justify-content:space-between;gap:10px;"><span><b>${escH(x.n)}</b> · ${x.tipo}${x.ativo===false?' · inativo':''}</span>${podeEd?`<button class="small-gold" style="flex:none;" onclick="bgAbrirProduto_('${x.tipo}','${x.id}')">abrir cadastro</button>`:''}</div>`).join('');
  box.innerHTML = h || '<div class="notif-empty">Nada encontrado para "'+escH(termo)+'".</div>';
}
/* ---------- DADOS DO RESTAURANTE (texto livre) ---------- */
function dadosRestaurante_(){
  const r = (configCardapio && configCardapio.restaurante) || {};
  return { nome: r.nome||'', endereco: r.endereco||'', telefone: r.telefone||'', horario: r.horario||'', redes: r.redes||'' };
}
function nomeRestaurante_(){ return dadosRestaurante_().nome || '${NOME_H_()}'; }
function renderDadosRestaurante_(){
  if(!document.getElementById('drNome')) return;
  const r = dadosRestaurante_();
  ['Nome','Endereco','Telefone','Horario','Redes'].forEach(k=>{ document.getElementById('dr'+k).value = r[k.toLowerCase()]; });
}
async function salvarDadosRestauranteUI(){
  const o = {}; ['Nome','Endereco','Telefone','Horario','Redes'].forEach(k=>{ o[k.toLowerCase()] = document.getElementById('dr'+k).value.trim(); });
  try{
    const r = await apiCall('salvarDadosRestaurante', o);
    if(r.ok){
      configCardapio = r.config || configCardapio; salvarCache(); renderDadosRestaurante_();
      /* Razão social e CNPJ (Aviso de Privacidade): salvos junto, só pelo Administrador e só depois de carregados (para nunca apagar sem querer). */
      let aviso = '';
      const rz = document.getElementById('lgpdRazao'), cj = document.getElementById('lgpdCnpj');
      if(rz && cj && currentUser && currentUser.nivel === 'Admin'){
        if(typeof _lgpdOk_ !== 'undefined' && _lgpdOk_){
          try{ const l = await apiCall('lgpdConfig', { razaoSocial: rz.value.trim(), cnpj: cj.value.trim() }); if(l && l.ok){ if(typeof lgpdPintar_ === 'function') lgpdPintar_(l); } else aviso = ' Razão social e CNPJ não foram salvos: ' + ((l && l.message) || 'tente de novo.'); }
          catch(e){ aviso = ' Razão social e CNPJ não foram salvos agora. Tente de novo.'; }
        } else aviso = ' Razão social e CNPJ ainda não carregaram; abra a tela de novo e tente salvar.';
      }
      showMsg('drMsg', r.message + aviso, aviso ? 'warn' : 'ok');
    }
    else showMsg('drMsg', r.message, 'warn');
  } catch(e){ showMsg('drMsg','Não foi possível salvar agora.','warn'); }
}
function cdInfoRestauranteHtml_(r){
  if(!r) return '';
  const lin = [];
  if(r.endereco) lin.push('📍 ' + escH(r.endereco));
  if(r.telefone) lin.push('📞 ' + escH(r.telefone));
  if(r.horario) lin.push('🕒 ' + escH(r.horario).replace(/\n/g,'<br>'));
  if(r.redes) lin.push('📱 ' + escH(r.redes).replace(/\n/g,'<br>'));
  return lin.length ? '<b>' + escH(r.nome || '${NOME_H_()}') + '</b><br>' + lin.join('<br>') : '';
}
/* ---------- FECHAR O CARDÁPIO: só pelo botão discreto (Início e Caixa). Os períodos já gravados são preservados ao alternar. ---------- */
/* Botão discreto (Início e Caixa): fecha ou reabre o cardápio dos clientes. Usa o mesmo fechamento manual de Cardápio Digital. */
function cdChipAtualizar_(){
  const btns = document.querySelectorAll('.cdChipBtn'); if(!btns.length) return;
  const n = currentUser && currentUser.nivel, ok = (n === 'Admin' || n === 'Operador' || n === 'Desenvolvedor') && !(currentUser && currentUser.emergencia);
  const f = (typeof configCardapio !== 'undefined' && configCardapio && configCardapio.fechamento) || null;
  const fechado = !!(f && f.ativo);
  btns.forEach(b=>{ b.style.display = ok ? '' : 'none'; b.textContent = fechado ? '🌐 Cardápio fechado' : '🌐 Cardápio aberto'; b.classList.toggle('caixa-fechado', fechado); b.title = fechado ? 'Toque para reabrir o cardápio dos clientes' : 'Toque para fechar o cardápio dos clientes'; });
}
async function cdChipAlternar_(){
  const f = (configCardapio && configCardapio.fechamento) || { ativo:false, mensagem:'', periodos:[] };
  const fechar = !f.ativo; let msg = '';
  if(fechar){ const r = await vsForm({ titulo:'Fechar o cardápio dos clientes', texto:'Os clientes não conseguem pedir até você reabrir.', ok:'Fechar cardápio', perigo:true,
    campos:[ { id:'msg', rotulo:'Mensagem para o cliente (opcional)', tipo:'texto', max:160 } ] }); if(!r) return; msg = String(r.msg || '').trim(); }
  else if(!await confirmarTxt_('Reabrir o cardápio dos clientes?')) return;
  if(!iniciarOperacaoUnica('fechaCardapio')) return;
  try{
    const r = await apiCall('salvarCardapioFechamento', { manualAtivo: fechar, manualMensagem: msg, periodos: (f.periodos||[]).map(p=>({ inicio:String(p.inicio||'').slice(0,10), fim:String(p.fim||'').slice(0,10), mensagem:p.mensagem||'' })) });
    if(r && r.ok){ if(r.config) configCardapio = r.config; try{ salvarCache(); }catch(e){} cdChipAtualizar_();
      avisar(fechar ? 'Cardápio fechado. Os clientes não conseguem pedir.' : ('Cardápio reaberto.' + (typeof sessaoCaixa !== 'undefined' && !sessaoCaixa ? ' Atenção: ele só recebe pedidos com o caixa aberto.' : ''))); }
    else avisar((r && r.message) || 'Não foi possível salvar agora.');
  }catch(e){ avisar('Não foi possível salvar agora.'); }
  finally{ finalizarOperacaoUnica('fechaCardapio'); }
}
/* BATERIA: atualiza o botão quando os dados chegam, ao tocar na tela e ao voltar ao app (antes: a cada 3 s, até para o cliente) */
(function(){
  const at = ()=>{ try{ cdChipAtualizar_(); }catch(e){} };
  document.addEventListener('click', ()=>setTimeout(at, 300), true);
  document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) at(); });
  setInterval(()=>{ if(!document.hidden && typeof currentUser !== 'undefined' && currentUser) at(); }, 30000);
  setTimeout(at, 1500);
})();
async function salvarConfigCardapioUI(){
  const kicker = document.getElementById('cfgKicker').value.trim();
  const frase = document.getElementById('cfgFrase').value.trim();
  const tempoEntrega = document.getElementById('cfgTempoEntrega').value.trim();
  const tempoRetirada = document.getElementById('cfgTempoRetirada').value.trim();
  const tempoMesa = document.getElementById('cfgTempoMesa').value.trim();
  const faixaPromo = ((document.getElementById('cfgFaixaPromo')||{}).value||'').trim();
  try{
    const r = await apiCall('salvarConfigCardapio', { kicker, frase, tempoEntrega, tempoRetirada, tempoMesa, faixaPromo });
    if(r.ok){ configCardapio = r.config || configCardapio; salvarCache(); showMsg('cfgCardapioMsg', r.message, 'ok'); }
    else showMsg('cfgCardapioMsg', r.message, 'warn');
  } catch(e){ showMsg('cfgCardapioMsg','Não foi possível salvar agora.','warn'); }
}

/* ============================================================
   INIT
   ============================================================ */
