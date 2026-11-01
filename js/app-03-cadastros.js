/* ---------- FOTOS: compressão no celular antes de enviar ---------- */
function comprimirImagem(file, maxDim, qualidade){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onerror = ()=>reject(new Error('Não foi possível ler o arquivo.'));
    reader.onload = ()=>{
      const img = new Image();
      img.onerror = ()=>reject(new Error('Arquivo de imagem inválido.'));
      img.onload = ()=>{
        let w = img.width, h = img.height;
        const max = maxDim || 900;
        if(w > max || h > max){
          if(w > h){ h = Math.round(h * max / w); w = max; } else { w = Math.round(w * max / h); h = max; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve({ base64: canvas.toDataURL('image/jpeg', qualidade || 0.75), mimeType: 'image/jpeg' });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function previewFoto(inputId, previewId){
  const input = document.getElementById(inputId);
  const box = document.getElementById(previewId);
  if(!input.files || !input.files[0]){ box.innerHTML=''; return; }
  const reader = new FileReader();
  reader.onload = ()=>{ box.innerHTML = `<img src="${reader.result}" style="max-width:120px;border-radius:8px;border:1px solid var(--gold);">`; };
  reader.readAsDataURL(input.files[0]);
}
function atualizarMargemPreview(){
  if(typeof cfAtualizarMargem === 'function') return cfAtualizarMargem('p');
  const preco = Number(document.getElementById('pPreco').value) || 0;
  const custo = Number(document.getElementById('pCusto').value) || 0;
  const margem = preco - custo;
  const pct = preco>0 ? (margem/preco*100) : 0;
  document.getElementById('pMargemPreview').textContent = formatarMoeda(margem) + ' (' + pct.toFixed(0) + '%)';
}
/* ---------- PREÇO ÚNICO (produto/combo) ----------
   Um preço só vale para todas as formas de pagamento. O que muda por forma é o "Acréscimo"
   cadastrado na própria forma de pagamento (Administrador → Vendas e cardápio → Formas de pagamento). */
let excecoesPreco = { p: [], ko: [], pp: [], kk: [] };   // legado: sem uso
function formaReferenciaPreco_(){ const l = (formasPagamento||[]).slice().sort((a,b)=>(a.ordem||0)-(b.ordem||0)); return l.find(f=>!f.precoProprio) || l[0] || null; }
function linhaPrecoRef_(lista, chaveId, id){
  const ref = formaReferenciaPreco_();
  const linhas = (lista||[]).filter(x=>x[chaveId]===id);
  return (ref && linhas.find(x=>x.formaPagamentoId===ref.id)) || linhas[0] || null;
}
/* PREÇO PRÓPRIO POR FORMA (ex.: iFood): formas marcadas em Pagamentos ganham um campo no produto/combo. Em branco = preço base. */
function renderPrecosExcecoes(prefix, valores){
  const box = document.getElementById((prefix||'') + 'PrecosProprios'); if(!box) return;
  const atuais = {}; box.querySelectorAll('input[data-forma]').forEach(i=>{ atuais[i.dataset.forma] = i.value; });
  const vals = valores || atuais;
  const formas = (formasPagamento||[]).filter(f=>f.precoProprio && f.ativa !== false);
  box.innerHTML = formas.map(f=>`<label for="${prefix}PP_${f.id}">Preço no ${escH(f.nome)} (R$) <span style="opacity:.75;">— em branco = preço base</span></label><input type="number" step="0.01" min="0" id="${prefix}PP_${f.id}" data-forma="${f.id}" placeholder="Igual ao preço base" value="${vals[f.id] != null ? escH(String(vals[f.id])) : ''}">`).join('');
}
function carregarExcecoesExistentes(prefix, precosDoItem, precoBase){
  const vals = {};
  (precosDoItem||[]).forEach(r=>{ const f = (formasPagamento||[]).find(x=>x.id===r.formaPagamentoId); if(f && f.precoProprio && Math.abs(Number(r.preco) - Number(precoBase)) > 0.004) vals[f.id] = Number(r.preco); });
  renderPrecosExcecoes(prefix, vals);
}
function montarPrecosComExcecoes(prefix, precoBase, custoBase){
  return formasPagamento.map(f=>{
    const el = f.precoProprio ? document.getElementById((prefix||'') + 'PP_' + f.id) : null;
    const v = el && String(el.value).trim() !== '' ? Number(String(el.value).replace(',', '.')) : NaN;
    return { formaPagamentoId: f.id, preco: (v > 0 ? Math.round(v*100)/100 : precoBase), custo: custoBase };
  });
}

/* ---------- SEÇÃO "OPÇÕES AVANÇADAS" (fecha por padrão em todo formulário) ---------- */
function toggleAvancado(prefix){
  const box = document.getElementById(prefix+'AvancadoBox');
  const seta = document.getElementById(prefix+'AvancadoSeta');
  const aberto = box.style.display !== 'none';
  box.style.display = aberto ? 'none' : 'block';
  seta.textContent = aberto ? '▸' : '▾';
}

/* ---------- "ESTE ITEM TEM ESTOQUE PRÓPRIO" (ITEM 27 sem burocracia) ---------- */
function toggleEstoqueProprioUI(prefix){
  const box = document.getElementById(prefix+'EstoqueProprioBox');
  box.style.display = document.getElementById(prefix+'EstoqueProprioAtivo').checked ? 'block' : 'none';
}
function coletarEstoqueProprio(prefix){
  if(!document.getElementById(prefix+'EstoqueProprioAtivo').checked) return null;
  const obj = { ativo: true, unidade: document.getElementById(prefix+'EstoqueUnidade').value, minimo: Number(document.getElementById(prefix+'EstoqueMin').value)||0 };
  if(typeof cfCustoEstoqueProprio === 'function') obj.custo = cfCustoEstoqueProprio(prefix); // custo do item pronto
  const campoQtd = document.getElementById(prefix+'EstoqueQtd');
  if(campoQtd) obj.quantidade = Number(campoQtd.value)||0; // só existe no cadastro novo; na edição a quantidade não é mexida
  return obj;
}

/* ---------- LABEL DE UNIDADE NA FICHA TÉCNICA (evita achar que só existe "unidade") ---------- */
function atualizarLabelQtdIngrediente(prefix){
  const sel = document.getElementById(prefix+'IngredienteSelect');
  const label = document.getElementById(prefix+'IngredienteUnidadeLabel');
  if(!sel || !label) return;
  const opt = sel.selectedOptions[0];
  label.textContent = opt && opt.dataset.unidade ? ('Quantidade em ' + opt.dataset.unidade + ' consumida por unidade vendida') : '';
}
function precoDisplayProduto(produtoId){
  const r = linhaPrecoRef_(produtoPrecos, 'produtoId', produtoId);
  return r ? { preco: Number(r.preco)||0, custo: Number(r.custo)||0 } : { preco: 0, custo: 0 };
}
function precoDisplayCombo(comboId){
  const r = linhaPrecoRef_(comboPrecos, 'comboId', comboId);
  return r ? { preco: Number(r.preco)||0, custo: Number(r.custo)||0 } : { preco: 0, custo: 0 };
}
/* ---------- CATEGORIAS ---------- */
function renderCategorias(){
  const tbodyCadastro = document.getElementById('catCadastroTable');
  if(tbodyCadastro){
    tbodyCadastro.innerHTML = categorias.length ? categorias.map(c=>`<tr>
      <td>${escH(c.nome)}${c.ativa?'':' <span class="badge">não aparece no cardápio</span>'}</td>
      <td><button class="ghost" onclick="editarCategoriaUI('${c.id}')">editar</button><button class="ghost" onclick="excluirCategoriaConfirm('${c.id}')">excluir</button></td>
    </tr>`).join('') : '<tr class="empty-row"><td colspan="2">Nenhuma categoria cadastrada.</td></tr>';
  }
  const tbodyCuradoria = document.getElementById('catCuradoriaTable');
  if(tbodyCuradoria){
    tbodyCuradoria.innerHTML = categorias.length ? categorias.map((c,idx)=>`<tr>
      <td>${escH(c.nome)}</td>
      <td><button class="ghost" ${idx===0?'disabled':''} onclick="moverCategoria('${c.id}',-1)">▲</button> <button class="ghost" ${idx===categorias.length-1?'disabled':''} onclick="moverCategoria('${c.id}',1)">▼</button></td>
      <td><label class="d-flex ai-centro gap-2 jc-centro"><input type="checkbox" class="largura-auto" ${c.ativa?'checked':''} onchange="toggleCategoriaAtiva('${c.id}', this.checked)"></label></td>
    </tr>`).join('') : '<tr class="empty-row"><td colspan="3">Nenhuma categoria cadastrada.</td></tr>';
  }
}
async function moverCategoria(id, direcao){
  const idx = categorias.findIndex(c=>c.id===id);
  const vizinho = categorias[idx+direcao];
  if(!vizinho) return;
  const alvo = categorias[idx];
  try{
    await apiCall('editarCategoria', { id: alvo.id, novaOrdem: vizinho.ordem });
    const r = await apiCall('editarCategoria', { id: vizinho.id, novaOrdem: alvo.ordem });
    categorias = r.categorias || categorias; salvarCache(); renderCategorias(); popularCategoriaSelects();
  } catch(e){ showMsg('catMsg','Não foi possível reordenar.','warn'); }
}

/* ---------- ADICIONAIS (ITEM 20) ---------- */
/* ---------- EDITAR CATEGORIA E ADICIONAL ---------- */
let _catEditId = null, _adEditId = null, _catEditOcupado = false, _adEditOcupado = false;
function editarCategoriaUI(id){
  const c = categorias.find(x=>x.id===id); if(!c) return;
  _catEditId = id; _catEditOcupado = false;
  document.getElementById('ceNome').value = c.nome;
  document.getElementById('ceAtiva').checked = !!c.ativa;
  document.getElementById('ceMsg').textContent = ''; document.getElementById('ceBtn').disabled = false;
  document.getElementById('catEditModal').classList.add('open');
}
function fecharCatEdit_(){ document.getElementById('catEditModal').classList.remove('open'); _catEditId = null; }
async function salvarCatEdit_(){
  if(_catEditOcupado || !_catEditId) return;
  const nome = document.getElementById('ceNome').value.trim();
  if(!nome){ showMsg('ceMsg','Informe o nome da categoria.','warn'); return; }
  if(categorias.some(c=>c.id!==_catEditId && String(c.nome).trim().toLowerCase()===nome.toLowerCase())){ showMsg('ceMsg','Já existe uma categoria com esse nome.','warn'); return; }
  _catEditOcupado = true; document.getElementById('ceBtn').disabled = true;
  try{
    const r = await apiCall('editarCategoria', { id: _catEditId, novoNome: nome, novoAtivo: document.getElementById('ceAtiva').checked });
    if(r && r.ok){ categorias = r.categorias || categorias; salvarCache(); renderCategorias(); popularCategoriaSelects(); fecharCatEdit_(); showMsg('catMsg','Categoria atualizada.','ok'); }
    else showMsg('ceMsg', (r && r.message) || 'Não foi possível salvar.', 'warn');
  }catch(e){ showMsg('ceMsg','Não foi possível salvar agora. Confira a conexão.','warn'); }
  _catEditOcupado = false; document.getElementById('ceBtn').disabled = false;
}
function atualizarQtdAdEdit_(){
  const sel = document.getElementById('aeIngrediente'), box = document.getElementById('aeQtdBox');
  if(!sel || !box) return;
  box.style.display = sel.value !== '' ? 'block' : 'none';
  if(typeof cfUsoAtualizar_ === 'function') cfUsoAtualizar_('ae');
}
function editarAdicionalUI(id){
  const a = adicionais.find(x=>x.id===id); if(!a) return;
  _adEditId = id; _adEditOcupado = false;
  const sel = document.getElementById('aeIngrediente');
  sel.innerHTML = '<option value="">Sem vínculo com estoque</option>' + (estoque||[]).map(e=>`<option value="${escH(e.id)}" data-unidade="${escH(e.unidade||'un')}">${escH(e.nome)} (${escH(e.unidade||'un')})</option>`).join('');
  sel.value = a.ingredienteId || '';
  if(sel.value !== (a.ingredienteId||'')) sel.value = '';
  document.getElementById('aeNome').value = a.nome;
  document.getElementById('aePreco').value = Number(a.preco)||0;
  { const ing = a.ingredienteId ? (estoque||[]).find(e=>e.id===a.ingredienteId) : null, q = Number(a.quantidadeDesconto)||1;
    document.getElementById('aeQtd').value = (ing && typeof cfUsoDeEst_ === 'function') ? cfUsoDeEst_(ing.unidade, q) : q; }
  document.getElementById('aeAtivo').checked = !!a.ativo;
  document.getElementById('aeMsg').textContent = ''; document.getElementById('aeBtn').disabled = false;
  if(typeof cfAdIngSincronizar_ === 'function') cfAdIngSincronizar_('ae');
  atualizarQtdAdEdit_();
  document.getElementById('adEditModal').classList.add('open');
}
function fecharAdEdit_(){ document.getElementById('adEditModal').classList.remove('open'); _adEditId = null; }
async function salvarAdEdit_(){
  if(_adEditOcupado || !_adEditId) return;
  const nome = document.getElementById('aeNome').value.trim();
  const preco = Number(document.getElementById('aePreco').value);
  if(!nome){ showMsg('aeMsg','Informe o nome do adicional.','warn'); return; }
  if(!(preco>=0)){ showMsg('aeMsg','Informe um preço válido (pode ser 0).','warn'); return; }
  if(adicionais.some(a=>a.id!==_adEditId && String(a.nome).trim().toLowerCase()===nome.toLowerCase())){ showMsg('aeMsg','Já existe um adicional com esse nome.','warn'); return; }
  const ingredienteId = document.getElementById('aeIngrediente').value;
  if(typeof cfAdIngPendente_ === 'function' && cfAdIngPendente_('ae')){ showMsg('aeMsg', CF_ADING_PENDENTE_MSG_, 'warn'); return; }
  let quantidadeDesconto = 1;
  if(ingredienteId){
    const lido = cfUsoLer_('ae');
    if(!lido.ok){ showMsg('aeMsg', lido.msg, 'warn'); return; }
    quantidadeDesconto = lido.qtd;
    if(typeof cfConfirmarPrejuizoAd_ === 'function' && !await cfConfirmarPrejuizoAd_(nome, preco, ingredienteId, quantidadeDesconto)) return;
  }
  _adEditOcupado = true; document.getElementById('aeBtn').disabled = true;
  try{
    const r = await apiCall('editarAdicional', { id: _adEditId, nome, preco, ativo: document.getElementById('aeAtivo').checked, ingredienteId, quantidadeDesconto });
    if(r && r.ok){ adicionais = r.adicionais || adicionais; salvarCache(); renderAdicionais(); try{ renderAdicionaisChecklist('pAdicionaisLista', []); }catch(e){ if(window.erroTela_) erroTela_(e); } fecharAdEdit_(); showMsg('adMsg','Adicional atualizado.','ok'); }
    else showMsg('aeMsg', (r && r.message) || 'Não foi possível salvar.', 'warn');
  }catch(e){ showMsg('aeMsg','Não foi possível salvar agora. Confira a conexão.','warn'); }
  _adEditOcupado = false; document.getElementById('aeBtn').disabled = false;
}
function popularSelectAdicionalIngrediente(){
  const sel = document.getElementById('adIngredienteSelect');
  if(!sel) return;
  const atual = sel.value;
  sel.innerHTML = '<option value="">Sem vínculo com estoque</option>' + estoque.map(e=>`<option value="${e.id}" data-unidade="${e.unidade||'un'}">${escH(e.nome)} (${e.unidade||'un'})</option>`).join('');
  if(atual) sel.value = atual;
  atualizarLabelQtdAdicional();
}
function atualizarLabelQtdAdicional(){
  const sel = document.getElementById('adIngredienteSelect');
  const box = document.getElementById('adQtdBox');
  if(!sel || !box) return;
  box.style.display = sel.value !== '' ? 'block' : 'none';
  if(typeof cfUsoAtualizar_ === 'function') cfUsoAtualizar_('ad');
}
function renderAdicionais(){
  renderAdVincCategorias();
  const tbodyCadastro = document.getElementById('adCadastroTable');
  if(tbodyCadastro){
    tbodyCadastro.innerHTML = adicionais.length ? adicionais.map(a=>`<tr>
      <td>${escH(a.nome)}${a.ativo?'':' <span class="badge">não aparece no cardápio</span>'}<div class="sub cf-uso-linha">${a.ingredienteId && typeof cfUsoTexto_ === 'function' && cfUsoTexto_(a.ingredienteId, a.quantidadeDesconto) ? 'baixa ' + escH(cfUsoTexto_(a.ingredienteId, a.quantidadeDesconto)) : 'sem baixa no estoque'}</div>${typeof cfUsoPerdaAd_ === 'function' ? cfUsoPerdaAd_(a) : ''}</td>
      <td>${formatarMoeda(a.preco)}</td>
      <td><button class="ghost" onclick="editarAdicionalUI('${a.id}')">editar</button><button class="ghost" onclick="excluirAdicionalConfirm('${a.id}')">excluir</button></td>
    </tr>`).join('') : '<tr class="empty-row"><td colspan="3">Nenhum adicional cadastrado.</td></tr>';
  }
  const tbodyCuradoria = document.getElementById('adCuradoriaTable');
  if(tbodyCuradoria){
    tbodyCuradoria.innerHTML = adicionais.length ? adicionais.map(a=>`<tr>
      <td>${escH(a.nome)}</td>
      <td><label class="d-flex ai-centro gap-2 jc-centro"><input type="checkbox" class="largura-auto" ${a.ativo?'checked':''} onchange="toggleAdicionalAtivo('${a.id}', this.checked)"></label></td>
    </tr>`).join('') : '<tr class="empty-row"><td colspan="2">Nenhum adicional cadastrado.</td></tr>';
  }
}
function estadoAdVincCategoria_(catId){
  const ativos = adicionais.filter(a=>a.ativo).map(a=>a.id);
  const prods = produtos.filter(p=>p.categoria===catId);
  if(!prods.length) return { estado:'vazia', total:0, ok:0 };
  let ok = 0, algum = false;
  prods.forEach(p=>{
    const lig = produtoAdicionais.filter(x=>x.produtoId===p.id).map(x=>x.adicionalId);
    if(lig.length) algum = true;
    if(ativos.length && ativos.every(id=>lig.includes(id))) ok++;
  });
  const estado = (ativos.length && ok===prods.length) ? 'cheia' : (algum ? 'parcial' : 'nenhuma');
  return { estado, total:prods.length, ok };
}
function renderAdVincCategorias(){
  const cont = document.getElementById('adVincCategorias'); if(!cont) return;
  const pend = {};
  Array.from(cont.querySelectorAll('input[type=checkbox]')).forEach(i=>{ if(i.dataset.mexeu==='1') pend[i.value] = { checked:i.checked, indeterminate:i.indeterminate }; });
  cont.innerHTML = categorias.length ? categorias.map(c=>{
    const st = estadoAdVincCategoria_(c.id);
    const txt = st.estado==='vazia' ? 'sem produtos' : st.estado==='cheia' ? 'liberado' : st.estado==='parcial' ? 'parcial ('+st.ok+' de '+st.total+' produtos)' : 'sem adicionais';
    return `<label class="cd-adicional-linha" style="cursor:pointer;"><span><input type="checkbox" class="largura-auto" value="${c.id}" data-orig="${st.estado}" ${st.estado==='vazia'?'disabled':''}> ${escH(c.nome)}</span><span class="sub">${txt}</span></label>`;
  }).join('') : '<p class="sub">Cadastre as categorias primeiro.</p>';
  cont.querySelectorAll('input[type=checkbox]').forEach(i=>{
    const o = i.dataset.orig, pd = pend[i.value];
    if(pd){ i.checked = pd.checked; i.indeterminate = pd.indeterminate; i.dataset.mexeu = '1'; }
    else { i.checked = (o==='cheia'); i.indeterminate = (o==='parcial'); }
    i.addEventListener('change', ()=>{ i.dataset.mexeu = '1'; });
  });
}
async function vincularAdicionaisCategorias(){
  const caixas = Array.from(document.querySelectorAll('#adVincCategorias input[type=checkbox]'));
  const liberar = caixas.filter(i=>i.checked && !i.indeterminate && i.dataset.orig!=='cheia').map(i=>i.value);
  const tirar = caixas.filter(i=>!i.checked && !i.indeterminate && (i.dataset.orig==='cheia' || i.dataset.orig==='parcial')).map(i=>i.value);
  const adIds = adicionais.filter(a=>a.ativo).map(a=>a.id);
  if(!liberar.length && !tirar.length) return showMsg('adVincMsg','Nada para alterar. Marque para liberar ou desmarque para tirar os adicionais.','warn');
  if(liberar.length && !adIds.length) return showMsg('adVincMsg','Não há adicionais ativos para liberar.','warn');
  if(tirar.length && !await confirmarTxt_('Tirar todos os adicionais dos produtos das categorias desmarcadas?')) return;
  try{
    const msgs = []; let ok = true;
    if(liberar.length){
      const r = await apiCall('vincularAdicionaisEmLote', { categorias: liberar, adicionaisIds: adIds });
      if(r.ok){ produtoAdicionais = r.produtoAdicionais || produtoAdicionais; } else ok = false;
      msgs.push(r.message);
    }
    if(tirar.length && ok){
      const r = await apiCall('desvincularAdicionaisEmLote', { categorias: tirar });
      if(r.ok){ produtoAdicionais = r.produtoAdicionais || produtoAdicionais; } else ok = false;
      msgs.push(r.message);
    }
    salvarCache();
    setTimeout(()=>{ document.querySelectorAll('#adVincCategorias input[type=checkbox]').forEach(i=>{ delete i.dataset.mexeu; }); renderAdVincCategorias(); }, 1200);
    showMsg('adVincMsg', msgs.filter(Boolean).join(' '), ok?'ok':'warn');
  }catch(e){ showMsg('adVincMsg','Não foi possível salvar agora. Tente novamente.','warn'); }
}
async function registrarAdicional(){
  const nome = document.getElementById('adNome').value.trim();
  const preco = Number(document.getElementById('adPreco').value) || 0;
  const ingredienteId = document.getElementById('adIngredienteSelect').value;
  if(!nome){ showMsg('adMsg','Informe o nome do adicional.','warn'); return; }
  if(typeof cfAdIngPendente_ === 'function' && cfAdIngPendente_('ad')){ showMsg('adMsg', CF_ADING_PENDENTE_MSG_, 'warn'); return; }
  let quantidadeDesconto = 1;
  if(ingredienteId){
    const lido = cfUsoLer_('ad');
    if(!lido.ok){ showMsg('adMsg', lido.msg, 'warn'); return; }
    quantidadeDesconto = lido.qtd;
    if(typeof cfConfirmarPrejuizoAd_ === 'function' && !await cfConfirmarPrejuizoAd_(nome, preco, ingredienteId, quantidadeDesconto)) return;
  }
  try{
    const r = await apiCall('addAdicional', { nome, preco, ingredienteId, quantidadeDesconto });
    if(r.ok){
      adicionais = r.adicionais || adicionais; salvarCache();
      document.getElementById('adNome').value=''; document.getElementById('adPreco').value=''; document.getElementById('adQtdDesconto').value=''; document.getElementById('adIngredienteSelect').value=''; try{ cfAdIngSincronizar_('ad'); atualizarLabelQtdAdicional(); }catch(e){}
      renderAdicionais(); renderAdicionaisChecklist('pAdicionaisLista', []); showMsg('adMsg', r.message, 'ok');
    } else showMsg('adMsg', r.message, 'warn');
  } catch(e){ showMsg('adMsg','Não foi possível cadastrar.','warn'); }
}
async function toggleAdicionalAtivo(id, novoAtivo){
  const a = adicionais.find(x=>x.id===id); if(!a) return;
  try{ const r = await apiCall('editarAdicional', { id, nome: a.nome, preco: a.preco, ativo: novoAtivo, ingredienteId: a.ingredienteId||'', quantidadeDesconto: a.quantidadeDesconto||1 }); if(r.ok){ adicionais = r.adicionais || adicionais; salvarCache(); renderAdicionais(); } }
  catch(e){ showMsg('adMsg','Não foi possível atualizar.','warn'); }
}
async function excluirAdicionalConfirm(id){
  if(!await confirmarTxt_('Excluir este adicional? Ele será removido de todos os produtos vinculados.')) return;
  const senhaAdminConfirmacao = await pedirSenha_(); if(!senhaAdminConfirmacao) return;
  try{ const r = await apiCall('excluirAdicional', { id, senhaAdminConfirmacao }); if(!r || !r.ok){ showMsg('adMsg', (r && r.message) || 'Não foi possível excluir.', 'warn'); return; } adicionais = r.adicionais || adicionais; produtoAdicionais = r.produtoAdicionais || produtoAdicionais; salvarCache(); renderAdicionais(); }
  catch(e){ showMsg('adMsg','Não foi possível excluir.','warn'); }
}
function popularCategoriaSelects(){
  const opcoes = '<option value="">Sem categoria</option>' + categorias.map(c=>`<option value="${c.id}">${escH(c.nome)}${c.ativa?'':' (inativa)'}</option>`).join('');
  ['pCategoria','ppCategoria','koCategoria','kkCategoria'].forEach(id=>{
    const sel = document.getElementById(id);
    if(sel){ const atual = sel.value; sel.innerHTML = opcoes; if(atual) sel.value = atual; }
  });
}
async function registrarCategoria(){
  const nome = document.getElementById('catNome').value.trim();
  if(!nome){ showMsg('catMsg','Informe o nome da categoria.','warn'); return; }
  try{
    const r = await apiCall('addCategoria', { nome });
    if(r.ok){ categorias = r.categorias || categorias; document.getElementById('catNome').value=''; renderCategorias(); popularCategoriaSelects(); salvarCache(); showMsg('catMsg', r.message, 'ok'); }
    else showMsg('catMsg', r.message, 'warn');
  } catch(e){ showMsg('catMsg','Não foi possível cadastrar.','warn'); }
}
async function toggleCategoriaAtiva(id, novoAtivo){
  try{ const r = await apiCall('editarCategoria', { id, novoAtivo }); if(r.ok){ categorias = r.categorias || categorias; renderCategorias(); popularCategoriaSelects(); salvarCache(); } }
  catch(e){}
}
async function excluirCategoriaConfirm(id){
  if(!await confirmarTxt_('Excluir esta categoria?')) return;
  const senhaAdminConfirmacao = await pedirSenha_(); if(!senhaAdminConfirmacao) return;
  try{
    const r = await apiCall('excluirCategoria', { id, senhaAdminConfirmacao });
    if(r.ok){ categorias = r.categorias || categorias; renderCategorias(); popularCategoriaSelects(); salvarCache(); }
    else showMsg('catMsg', r.message, 'warn');
  } catch(e){ showMsg('catMsg','Não foi possível excluir.','warn'); }
}
function nomeCategoria(id){ const c = categorias.find(x=>x.id===id); return c ? c.nome : ''; }

/* ---------- ITENS DO COMBO (produto + quantidade) ---------- */
function popularSelectProdutosParaCombo(selectId){
  const sel = document.getElementById(selectId);
  if(!sel) return;
  sel.innerHTML = produtos.filter(p=>p.ativo).map(p=>`<option value="${p.id}" data-nome="${escH(p.nome)}">${escH(p.nome)}</option>`).join('') || '<option value="">Cadastre um produto primeiro</option>';
}
let escolhaQtdNovo = 0, escolhaQtdEdicao = 0;
function adicionarItemAoComboNovo(){
  const sel = document.getElementById('koProdutoSelect');
  const opt = sel.options[sel.selectedIndex];
  const qtd = Number(document.getElementById('koProdutoQtd').value) || 0;
  if(!opt || !opt.value || qtd<=0) return;
  itensComboNovo.push({ produtoId: opt.value, produtoNome: opt.dataset.nome, quantidade: qtd });
  document.getElementById('koProdutoQtd').value = '1';
  renderItensComboNovo();
}
function renderItensComboNovo(){
  const box = document.getElementById('koItensLista');
  box.innerHTML = itensComboNovo.map((it,idx)=>`<div class="ingrediente-row"><span>${it.quantidade}x ${it.produtoNome}<label class="fs-xs" style="display:block;font-weight:400;"><input type="checkbox" ${it.escolha?'checked':''} onchange="itensComboNovo[${idx}].escolha=this.checked;renderItensComboNovo();"> opção de escolha do cliente</label></span><button class="rm-row" onclick="itensComboNovo.splice(${idx},1);renderItensComboNovo();">✕</button></div>`).join('') || '<div class="notif-empty">Nenhum produto adicionado ainda.</div>';
  if(itensComboNovo.some(it=>it.escolha)) box.innerHTML += `<div class="ingrediente-row" style="gap:8px;"><span>O cliente escolhe <input type="number" min="1" max="20" step="1" value="${escolhaQtdNovo||''}" oninput="escolhaQtdNovo=Number(this.value)||0;if(typeof cfCustoCombo==='function')cfCustoCombo('ko');" style="width:64px;display:inline-block;"> itens entre as opções marcadas (pode repetir). O preço do combo continua fixo.</span></div>`;
  if(typeof cfCustoCombo === 'function') cfCustoCombo('ko');
}
function adicionarItemAoComboEdicao(){
  const sel = document.getElementById('kkProdutoSelect');
  const opt = sel.options[sel.selectedIndex];
  const qtd = Number(document.getElementById('kkProdutoQtd').value) || 0;
  if(!opt || !opt.value || qtd<=0) return;
  itensComboEdicao.push({ produtoId: opt.value, produtoNome: opt.dataset.nome, quantidade: qtd });
  document.getElementById('kkProdutoQtd').value = '1';
  renderItensComboEdicao();
}
function renderItensComboEdicao(){
  const box = document.getElementById('kkItensLista');
  box.innerHTML = itensComboEdicao.map((it,idx)=>`<div class="ingrediente-row"><span>${it.quantidade}x ${it.produtoNome}<label class="fs-xs" style="display:block;font-weight:400;"><input type="checkbox" ${it.escolha?'checked':''} onchange="itensComboEdicao[${idx}].escolha=this.checked;renderItensComboEdicao();"> opção de escolha do cliente</label></span><button class="rm-row" onclick="itensComboEdicao.splice(${idx},1);renderItensComboEdicao();">✕</button></div>`).join('') || '<div class="notif-empty">Nenhum produto vinculado.</div>';
  if(itensComboEdicao.some(it=>it.escolha)) box.innerHTML += `<div class="ingrediente-row" style="gap:8px;"><span>O cliente escolhe <input type="number" min="1" max="20" step="1" value="${escolhaQtdEdicao||''}" oninput="escolhaQtdEdicao=Number(this.value)||0;if(typeof cfCustoCombo==='function')cfCustoCombo('kk');" style="width:64px;display:inline-block;"> itens entre as opções marcadas (pode repetir). O preço do combo continua fixo.</span></div>`;
  if(typeof cfCustoCombo === 'function') cfCustoCombo('kk');
}
function descricaoItensCombo(comboId){
  return comboItens.filter(it=>it.comboId===comboId).map(it=>{
    const p = produtos.find(x=>x.id===it.produtoId);
    return (it.escolha?'':it.quantidade+'x ')+(p?p.nome:'(produto removido)')+(it.escolha?' (opção)':'');
  }).join(', ');
}
function popularSelectIngredientes(selectId){
  const sel = document.getElementById(selectId);
  sel.innerHTML = estoque.map(e=>`<option value="${e.id}" data-nome="${escH(e.nome)}" data-unidade="${e.unidade||'un'}">${escH(e.nome)} (${e.unidade||'un'})</option>`).join('') || '<option value="">Cadastre um ingrediente primeiro</option>';
}
function renderIngredientesProdutoNovo(){
  if(typeof cfRwRender === 'function') return cfRwRender('p');
  const box = document.getElementById('pIngredientesLista');
  box.innerHTML = ingredientesProdutoNovo.map((ing,idx)=>`<div class="ingrediente-row"><span>${ing.quantidadePorUnidade} ${ing.unidade||'un'} de ${ing.ingredienteNome}</span><button class="rm-row" onclick="ingredientesProdutoNovo.splice(${idx},1);renderIngredientesProdutoNovo();">✕</button></div>`).join('');
}
function renderAdicionaisChecklist(containerId, selecionados){
  const cont = document.getElementById(containerId);
  if(!cont) return;
  const ativos = adicionais.filter(a=>a.ativo);
  if(!ativos.length){ cont.innerHTML = '<span class="txt-muted fs-xs">Nenhum adicional cadastrado ainda (cadastre em Administrador → Produtos → Produtos, combos e adicionais → Adicionais).</span>'; return; }
  cont.innerHTML = ativos.map(a=>`<label class="d-flex ai-centro gap-2 fs-sm"><input type="checkbox" value="${a.id}" ${selecionados.includes(a.id)?'checked':''} class="largura-auto"> ${escH(a.nome)} (+ ${formatarMoeda(a.preco)})</label>`).join('');
}
function coletarAdicionaisChecklist(containerId){
  return Array.from(document.querySelectorAll('#'+containerId+' input[type=checkbox]:checked')).map(el=>el.value);
}
async function registrarProduto(){
  const nome = document.getElementById('pNome').value.trim();
  const descricao = document.getElementById('pDescricao').value.trim();
  const categoria = document.getElementById('pCategoria').value;
  const precoBase = Number(document.getElementById('pPreco').value) || 0;
  const custoBase = Number(document.getElementById('pCusto').value) || 0;
  const precos = montarPrecosComExcecoes('p', precoBase, custoBase);
  if(!nome){ showMsg('pMsg','Informe o nome do produto.','warn'); return; }
  if(typeof cfConfirmarPrejuizo_ === 'function' && !await cfConfirmarPrejuizo_(nome, precos)) return;
  setBotoesOcupados(true);
  try{
    const r = await apiCall('addProduto', { nome, descricao, categoria, precoBase, custoBase, precos, ingredientes: (typeof cfIngredientesParaSalvar === 'function' ? cfIngredientesParaSalvar('p') : ingredientesProdutoNovo), destaque: document.getElementById('pDestaque').checked, adicionaisIds: coletarAdicionaisChecklist('pAdicionaisLista'), estoqueProprio: coletarEstoqueProprio('p') });
    produtos = r.produtos || produtos; produtoPrecos = r.produtoPrecos || produtoPrecos; produtoIngredientes = r.produtoIngredientes || produtoIngredientes; produtoAdicionais = r.produtoAdicionais || produtoAdicionais; estoque = r.estoque || estoque; if(r.comboPrecos) comboPrecos = r.comboPrecos; salvarCache();
    if(r.ok){
      showMsg('pMsg', r.message, 'ok'); try{ cfRascunhoLimpar_(); }catch(e){}
      const arquivoFoto = document.getElementById('pFoto').files[0];
      if(arquivoFoto){
        try{
          const { base64, mimeType } = await comprimirImagem(arquivoFoto, 900, 0.75);
          const rf = await apiCall('uploadFotoProduto', { produtoId: r.id, nomeBase: nome, base64Data: base64, mimeType });
          if(rf.ok){ produtos = rf.produtos || produtos; salvarCache(); }
          else mostrarErro_('⚠️ Produto salvo, mas a FOTO não foi enviada: ' + (rf.message || 'erro no envio') + '. Abra o produto em Editar e envie a foto de novo.', { forcar:true });
        } catch(e){ mostrarErro_('⚠️ Produto salvo, mas a FOTO não foi enviada (sem conexão ou arquivo inválido). Abra o produto em Editar e envie a foto de novo.', { forcar:true }); }
      }
      fecharFormModal('produtoNovoModal'); showMsg('pMsgLista', r.message, 'ok');
      ['pNome','pDescricao','pPreco','pCusto','pEstoqueQtd','pEstoqueMin','pPrValor','pPrQtd'].forEach(id=>{ const el = document.getElementById(id); if(el) el.value=''; });
      document.getElementById('pDestaque').checked = false;
      document.getElementById('pEstoqueProprioAtivo').checked = false; toggleEstoqueProprioUI('p');
      renderAdicionaisChecklist('pAdicionaisLista', []);
      document.getElementById('pCategoria').value = '';
      document.getElementById('pFoto').value = ''; document.getElementById('pFotoPreview').innerHTML = '';
      excecoesPreco.p = []; renderPrecosExcecoes('p', {});
      ingredientesProdutoNovo = []; renderIngredientesProdutoNovo();
      if(typeof cfIniciarProduto === 'function') cfIniciarProduto('p', null);
      atualizarMargemPreview(); renderProdutos(); renderProdutoCuradoria(); renderEstoque(); popularSelectIngredientes('pIngredienteSelect'); popularSelectIngredientes('ppIngredienteSelect'); popularSelectAdicionalIngrediente(); popularSelectProdutos(); popularSelectProdutosParaCombo('koProdutoSelect'); popularSelectProdutosParaCombo('kkProdutoSelect');
    } else { showMsg('pMsg', r.message, 'warn'); }
  } catch(e){ showMsg('pMsg','Não foi possível cadastrar.','warn'); }
  finally { setBotoesOcupados(false); }
}
function abrirEditarProduto(id){
  const p = produtos.find(x=>x.id===id);
  if(!p) return;
  produtoEditandoId = id;
  document.getElementById('ppNome').value = p.nome;
  document.getElementById('ppDescricao').value = p.descricao||'';
  document.getElementById('ppCategoria').value = p.categoria||'';
  const precosDoProduto = produtoPrecos.filter(pp=>pp.produtoId===id);
  const refBase = linhaPrecoRef_(produtoPrecos, 'produtoId', id);
  const precoBaseAtual = refBase ? Number(refBase.preco) : 0;
  document.getElementById('ppPreco').value = refBase ? refBase.preco : '';
  document.getElementById('ppCusto').value = refBase ? refBase.custo : '';
  carregarExcecoesExistentes('pp', precosDoProduto, precoBaseAtual);
  document.getElementById('ppAtivo').checked = p.ativo;
  document.getElementById('ppDestaque').checked = !!p.destaque;
  document.getElementById('ppPremioFid').checked = !!p.premioFidelidade;
  document.getElementById('ppSemDesc').checked = !!p.semDesconto;
  document.getElementById('ppPremioInd').checked = !!p.premioIndicacao;
  const ingredienteProprio = p.estoqueProprioIngredienteId ? estoque.find(e=>e.id===p.estoqueProprioIngredienteId) : null;
  document.getElementById('ppEstoqueProprioAtivo').checked = !!ingredienteProprio;
  document.getElementById('ppEstoqueMin').value = ingredienteProprio ? ingredienteProprio.minimo : '';
  document.getElementById('ppEstoqueUnidade').value = ingredienteProprio ? (ingredienteProprio.unidade||'un') : 'un';
  document.getElementById('ppEstoqueProprioAviso').textContent = ingredienteProprio ? ('Quantidade atual em estoque: '+ingredienteProprio.quantidade+' '+(ingredienteProprio.unidade||'un')+' — ajuste em Movimentações de estoque.') : '';
  toggleEstoqueProprioUI('pp');
  document.getElementById('ppAvancadoBox').style.display = 'none'; document.getElementById('ppAvancadoSeta').textContent = '▸';
  const adicionaisDoProduto = produtoAdicionais.filter(pa=>pa.produtoId===id).map(pa=>pa.adicionalId);
  renderAdicionaisChecklist('ppAdicionaisLista', adicionaisDoProduto);
  document.getElementById('ppFotoAtual').innerHTML = p.fotoUrl ? `<img src="${fotoSrc_(p.fotoUrl, 400)}" onerror="fotoFalhou_(this)" style="max-width:140px;border-radius:8px;border:1px solid var(--gold);">` : '<span class="txt-muted fs-xs">Nenhuma foto cadastrada.</span>';
  document.getElementById('ppFoto').value = ''; document.getElementById('ppFotoMsg').innerHTML = '';
  popularSelectIngredientes('ppIngredienteSelect'); atualizarLabelQtdIngrediente('pp');
  ingredientesProdutoEdicao = produtoIngredientes.filter(v=>v.produtoId===id && v.ingredienteId!==p.estoqueProprioIngredienteId).map(v=>({ingredienteId:v.ingredienteId, ingredienteNome:v.ingredienteNome, quantidadePorUnidade:v.quantidadePorUnidade, unidade:(estoque.find(e=>e.id===v.ingredienteId)||{}).unidade||'un'}));
  renderIngredientesProdutoEdicao();
  if(typeof cfIniciarProduto === 'function') cfIniciarProduto('pp', p);
  document.getElementById('produtoModal').classList.add('open');
}
function fecharModalProduto(){ document.getElementById('produtoModal').classList.remove('open'); }
async function trocarFotoProdutoEdicao(){
  const arquivo = document.getElementById('ppFoto').files[0];
  if(!arquivo) return;
  showMsg('ppFotoMsg','Enviando foto...','ok');
  try{
    const { base64, mimeType } = await comprimirImagem(arquivo, 900, 0.75);
    const r = await apiCall('uploadFotoProduto', { produtoId: produtoEditandoId, nomeBase: document.getElementById('ppNome').value.trim(), base64Data: base64, mimeType });
    if(r.ok){
      produtos = r.produtos || produtos; salvarCache(); renderProdutos();
      const p = produtos.find(x=>x.id===produtoEditandoId);
      document.getElementById('ppFotoAtual').innerHTML = p && p.fotoUrl ? `<img src="${fotoSrc_(p.fotoUrl, 400)}" onerror="fotoFalhou_(this)" style="max-width:140px;border-radius:8px;border:1px solid var(--gold);">` : '';
      showMsg('ppFotoMsg','Foto atualizada.','ok');
    } else showMsg('ppFotoMsg', r.message, 'warn');
  } catch(e){ showMsg('ppFotoMsg','Não foi possível enviar a foto.','warn'); }
}
async function removerFotoProdutoEdicao(){
  if(!await confirmarTxt_('Remover a foto deste produto?')) return;
  try{
    const r = await apiCall('excluirFotoProduto', { produtoId: produtoEditandoId });
    if(r.ok){ produtos = r.produtos || produtos; salvarCache(); renderProdutos(); document.getElementById('ppFotoAtual').innerHTML = '<span class="txt-muted fs-xs">Nenhuma foto cadastrada.</span>'; }
  } catch(e){ showMsg('ppFotoMsg','Não foi possível remover a foto.','warn'); }
}
function renderIngredientesProdutoEdicao(){
  if(typeof cfRwRender === 'function') return cfRwRender('pp');
  const box = document.getElementById('ppIngredientesLista');
  box.innerHTML = ingredientesProdutoEdicao.map((ing,idx)=>`<div class="ingrediente-row"><span>${ing.quantidadePorUnidade} ${ing.unidade||'un'} de ${ing.ingredienteNome}</span><button class="rm-row" onclick="ingredientesProdutoEdicao.splice(${idx},1);renderIngredientesProdutoEdicao();">✕</button></div>`).join('') || '<div class="notif-empty">Nenhum ingrediente vinculado.</div>';
}
async function salvarEdicaoProduto(){
  const nome = document.getElementById('ppNome').value.trim();
  if(!nome){ showMsg('ppMsg','Informe o nome.','warn'); return; }
  const precoBase = Number(document.getElementById('ppPreco').value) || 0;
  const custoBase = Number(document.getElementById('ppCusto').value) || 0;
  const premioFid = document.getElementById('ppPremioFid').checked, premioInd = document.getElementById('ppPremioInd').checked;
  const pAntes = produtos.find(x=>x.id===produtoEditandoId) || {};
  const premioMudou = premioFid !== !!pAntes.premioFidelidade || premioInd !== !!pAntes.premioIndicacao;
  if(typeof cfConfirmarPrejuizo_ === 'function' && !await cfConfirmarPrejuizo_(nome, montarPrecosComExcecoes('pp', precoBase, custoBase))) return;
  try{
    const r = await apiCall('editarProduto', {
      id: produtoEditandoId, nome, descricao: document.getElementById('ppDescricao').value.trim(),
      categoria: document.getElementById('ppCategoria').value,
      precos: montarPrecosComExcecoes('pp', precoBase, custoBase),
      ativo: document.getElementById('ppAtivo').checked, ingredientes: (typeof cfIngredientesParaSalvar === 'function' ? cfIngredientesParaSalvar('pp') : ingredientesProdutoEdicao), destaque: document.getElementById('ppDestaque').checked,
      adicionaisIds: coletarAdicionaisChecklist('ppAdicionaisLista'), estoqueProprio: coletarEstoqueProprio('pp')
    });
    produtos = r.produtos || produtos; produtoPrecos = r.produtoPrecos || produtoPrecos; produtoIngredientes = r.produtoIngredientes || produtoIngredientes; produtoAdicionais = r.produtoAdicionais || produtoAdicionais; estoque = r.estoque || estoque; if(r.comboPrecos) comboPrecos = r.comboPrecos; salvarCache();
    if(r.ok && premioMudou){
      const rp = await apiCall('editarPremioProduto', { produtoId: produtoEditandoId, premioFidelidade: premioFid, premioIndicacao: premioInd });
      if(rp && rp.ok){ produtos = rp.produtos || produtos; salvarCache(); }
      else { showMsg('ppMsg', 'Produto salvo, mas o prêmio não foi atualizado: ' + ((rp && rp.message) || 'tente de novo.'), 'warn'); renderProdutos(); return; }
    }
    if(r.ok && !!document.getElementById('ppSemDesc').checked !== !!pAntes.semDesconto){
      const rs = await apiCall('editarSemDesconto', { produtoId: produtoEditandoId, semDesconto: document.getElementById('ppSemDesc').checked });
      if(rs && rs.ok){ produtos = rs.produtos || produtos; if(rs.combos) combos = rs.combos; salvarCache(); }
      else { showMsg('ppMsg', 'Produto salvo, mas a marca "sem desconto" não foi atualizada: ' + ((rs && rs.message) || 'tente de novo.'), 'warn'); renderProdutos(); return; }
    }
    if(r.ok){ showMsg('ppMsg', r.message, 'ok'); renderProdutos(); renderProdutoCuradoria(); renderEstoque(); popularSelectProdutos(); try{ renderCombos(); }catch(e){ if(window.erroTela_) erroTela_(e); } setTimeout(fecharModalProduto, 700); }
    else showMsg('ppMsg', r.message, 'warn');
  } catch(e){ showMsg('ppMsg','Não foi possível salvar.','warn'); }
}
async function excluirProdutoConfirm(id){
  if(!await confirmarTxt_('Excluir este produto?')) return;
  const senhaAdminConfirmacao = await pedirSenha_(); if(!senhaAdminConfirmacao) return;
  try{ const r = await apiCall('excluirProduto', { id, senhaAdminConfirmacao }); if(!r || !r.ok){ showMsg('pMsg', (r && r.message) || 'Não foi possível excluir.', 'warn'); return; } produtos = r.produtos || produtos; produtoPrecos = r.produtoPrecos || produtoPrecos; produtoIngredientes = r.produtoIngredientes || produtoIngredientes; salvarCache(); renderProdutos(); renderProdutoCuradoria(); popularSelectProdutos(); }
  catch(e){ showMsg('pMsg','Não foi possível excluir.','warn'); }
}
function renderProdutos(){
  const filtro = document.getElementById('pSearch').value.toLowerCase();
  const tbody = document.getElementById('pTable');
  const lista = produtos.filter(p=>!filtro||p.nome.toLowerCase().includes(filtro));
  if(typeof cfAvisos === 'function') cfAvisos();
  if(lista.length===0){ tbody.innerHTML = '<tr class="empty-row"><td colspan="4">' + (filtro ? estadoVazio_('Nenhum produto encontrado.') : estadoVazio_('Nenhum produto cadastrado ainda.', '+ Novo produto', "abrirFormModal('produtoNovoModal');cfIniciarProduto('p',null)")) + '</td></tr>'; return; }
  tbody.innerHTML = lista.map(p=>{
    const { preco, custo } = precoDisplayProduto(p.id);
    const margem = preco - custo;
    const pct = preco>0 ? (margem/preco*100) : 0;
    const ingredientesDoProduto = produtoIngredientes.filter(v=>v.produtoId===p.id);
    const ingredientesTxt = ingredientesDoProduto.filter(v=>v.ingredienteId!==p.estoqueProprioIngredienteId).map(v=>{ const e = estoque.find(x=>x.id===v.ingredienteId)||{}; const u = e.unidade||'un'; const f = (u==='kg'||u==='l')?1000:1; return (Math.round(Number(v.quantidadePorUnidade)*f*1000)/1000).toLocaleString('pt-BR')+' '+(u==='kg'?'g':(u==='l'?'ml':u))+' '+v.ingredienteNome; }).join(', ');
    const thumb = p.fotoUrl ? `<img src="${fotoSrc_(p.fotoUrl, 100)}" onerror="fotoFalhou_(this)" style="width:34px;height:34px;border-radius:6px;object-fit:cover;vertical-align:middle;margin-right:6px;">` : '';
    return `<tr class="vs-linha" onclick="abrirEditarProduto('${p.id}')"><td>${thumb}${escH(p.nome)}${p.preCadastro?' <span class="badge neutro" title="Criado a partir de um item do iFood. Complete e ative.">📝 pré-cadastro iFood</span>':''}<span class="obs-line">${nomeCategoria(p.categoria)}${p.semDesconto?' · 🏷️ sem desconto/cupom':''}${ingredientesTxt?' · '+ingredientesTxt:''}</span></td><td>${formatarMoeda(preco)}</td><td>${custo>0 ? (margem<0 ? '<span class="cf-perda">PREJUÍZO '+formatarMoeda(-margem)+'</span>' : formatarMoeda(margem))+'<span class="obs-line">'+pct.toFixed(0)+'%</span>' : '<span class="cf-sem">custo não informado</span>'}</td>
      <td><button type="button" class="ghost vs-mais" aria-label="Ações de ${escH(p.nome)}" onclick="event.stopPropagation();vsAcoesProduto('${p.id}')">⋯</button></td></tr>${(typeof precoSugLinha_==='function' && custo>0) ? '<tr class="sug-linha vs-linha" onclick="abrirEditarProduto(\''+p.id+'\')"><td colspan="4">'+precoSugLinha_(preco, custo, tipoPrecoProduto_(p))+'</td></tr>' : ''}`;
  }).join('');
}
function renderProdutoCuradoria(){
  const tbody = document.getElementById('produtoCuradoriaTable');
  if(!tbody) return;
  if(!produtos.length){ tbody.innerHTML = '<tr class="empty-row"><td colspan="4">Nenhum produto cadastrado ainda.</td></tr>'; return; }
  const porCategoria = {};
  produtos.forEach(p=>{ const cat = nomeCategoria(p.categoria) || 'Sem categoria'; (porCategoria[cat] = porCategoria[cat]||[]).push(p); });
  let html = '';
  Object.keys(porCategoria).sort().forEach(cat=>{
    html += `<tr><td colspan="4" style="background:var(--panel-2);font-weight:700;font-size:12px;color:var(--gold);">${cat}</td></tr>`;
    porCategoria[cat].sort((a,b)=>a.ordemCardapio-b.ordemCardapio).forEach(p=>{
      html += `<tr>
        <td>${escH(p.nome)}</td>
        <td><label class="d-flex ai-centro gap-2 jc-centro"><input type="checkbox" class="largura-auto" ${p.ativo?'checked':''} onchange="toggleProdutoVisivelCardapio('${p.id}', this.checked)"></label></td>
        <td><label class="d-flex ai-centro gap-2 jc-centro"><input type="checkbox" class="largura-auto" ${p.destaque?'checked':''} onchange="toggleProdutoDestaqueCuradoria('${p.id}', this.checked)"></label></td>
        <td><input type="number" value="${p.ordemCardapio}" style="width:60px;text-align:center;" onchange="salvarOrdemCardapioProduto('${p.id}', this.value)"></td>
      </tr>`;
    });
  });
  tbody.innerHTML = html;
}
async function toggleProdutoVisivelCardapio(id, novoAtivo){
  try{ const r = await apiCall('editarVisibilidadeCardapioProduto', { id, ativo: novoAtivo }); if(r.ok){ produtos = r.produtos || produtos; salvarCache(); renderProdutos(); renderProdutoCuradoria(); } }
  catch(e){}
}
async function toggleProdutoDestaqueCuradoria(id, novoDestaque){
  try{ const r = await apiCall('editarVisibilidadeCardapioProduto', { id, destaque: novoDestaque }); if(r.ok){ produtos = r.produtos || produtos; salvarCache(); renderProdutoCuradoria(); } }
  catch(e){}
}
async function salvarOrdemCardapioProduto(id, ordem){
  try{ const r = await apiCall('editarOrdemCardapioProduto', { id, ordem }); if(r.ok){ produtos = r.produtos || produtos; salvarCache(); renderProdutoCuradoria(); } }
  catch(e){}
}

/* ---------- COMBOS ---------- */
function atualizarMargemPreviewCombo(){
  const preco = Number(document.getElementById('koPreco').value) || 0;
  const custo = Number(document.getElementById('koCusto').value) || 0;
  const pctImp = (typeof impostoPctHoje_ === 'function') ? impostoPctHoje_() : 0;   // imposto sobre a venda sai da margem
  const el = document.getElementById('koMargemPreview');
  if(typeof cfMargemHtml_ === 'function') el.innerHTML = cfMargemHtml_(preco, custo, pctImp, 'ko');
  else { const margem = preco - custo - preco * pctImp / 100; el.textContent = formatarMoeda(margem) + ' (' + (preco>0 ? (margem/preco*100) : 0).toFixed(0) + '%)'; }
}
async function registrarCombo(){
  const nome = document.getElementById('koNome').value.trim();
  const categoria = document.getElementById('koCategoria').value;
  const precoBase = Number(document.getElementById('koPreco').value) || 0;
  const custoBase = Number(document.getElementById('koCusto').value) || 0;
  const precos = montarPrecosComExcecoes('ko', precoBase, custoBase);
  if(!nome){ showMsg('koMsg','Informe o nome do combo.','warn'); return; }
  if(itensComboNovo.length===0){ showMsg('koMsg','Adicione pelo menos um produto ao combo.','warn'); return; }
  if(typeof cfConfirmarPrejuizo_ === 'function' && !await cfConfirmarPrejuizo_(nome, precos)) return;
  setBotoesOcupados(true);
  try{
    const r = await apiCall('addCombo', { nome, categoria, precoBase, custoBase, precos, itens: itensComboNovo, escolhaQtd: itensComboNovo.some(i=>i.escolha) ? escolhaQtdNovo : 0, destaque: document.getElementById('koDestaque').checked });
    combos = r.combos || combos; comboPrecos = r.comboPrecos || comboPrecos; comboItens = r.comboItens || comboItens; salvarCache();
    if(r.ok){
      showMsg('koMsg', r.message, 'ok');
      const arquivoFoto = document.getElementById('koFoto').files[0];
      if(arquivoFoto){
        try{
          const { base64, mimeType } = await comprimirImagem(arquivoFoto, 900, 0.75);
          const rf = await apiCall('uploadFotoCombo', { comboId: r.id, nomeBase: nome, base64Data: base64, mimeType });
          if(rf.ok){ combos = rf.combos || combos; salvarCache(); }
          else mostrarErro_('⚠️ Combo salvo, mas a FOTO não foi enviada: ' + (rf.message || 'erro no envio') + '. Abra o combo em Editar e envie a foto de novo.', { forcar:true });
        } catch(e){ mostrarErro_('⚠️ Combo salvo, mas a FOTO não foi enviada (sem conexão ou arquivo inválido). Abra o combo em Editar e envie a foto de novo.', { forcar:true }); }
      }
      fecharFormModal('comboNovoModal'); showMsg('koMsgLista', r.message, 'ok');
      ['koNome','koPreco','koCusto'].forEach(id=>document.getElementById(id).value='');
      document.getElementById('koDestaque').checked = false;
      document.getElementById('koCategoria').value = '';
      document.getElementById('koFoto').value = ''; document.getElementById('koFotoPreview').innerHTML = '';
      renderPrecosExcecoes('ko', {}); excecoesPreco.ko = [];
      document.getElementById('koAvancadoBox').style.display = 'none'; document.getElementById('koAvancadoSeta').textContent = '▸';
      itensComboNovo = []; escolhaQtdNovo = 0; renderItensComboNovo(); atualizarMargemPreviewCombo();
      renderCombos(); renderComboCuradoria(); popularSelectCombos();
    } else { showMsg('koMsg', r.message, 'warn'); }
  } catch(e){ showMsg('koMsg','Não foi possível cadastrar.','warn'); }
  finally { setBotoesOcupados(false); }
}
function abrirEditarCombo(id){
  const c = combos.find(x=>x.id===id);
  if(!c) return;
  comboEditandoId = id;
  document.getElementById('kkNome').value = c.nome;
  document.getElementById('kkCategoria').value = c.categoria||'';
  const precosDoCombo = comboPrecos.filter(cp=>cp.comboId===id);
  const refBase = linhaPrecoRef_(comboPrecos, 'comboId', id);
  const precoBaseAtual = refBase ? Number(refBase.preco) : 0;
  document.getElementById('kkPreco').value = refBase ? refBase.preco : '';
  document.getElementById('kkCusto').value = refBase ? refBase.custo : '';
  carregarExcecoesExistentes('kk', precosDoCombo, precoBaseAtual);
  document.getElementById('kkAtivo').checked = c.ativo;
  document.getElementById('kkDestaque').checked = !!c.destaque;
  document.getElementById('kkSemDesc').checked = !!c.semDesconto;
  document.getElementById('kkAvancadoBox').style.display = 'none'; document.getElementById('kkAvancadoSeta').textContent = '▸';
  document.getElementById('kkFotoAtual').innerHTML = c.fotoUrl ? `<img src="${fotoSrc_(c.fotoUrl, 400)}" onerror="fotoFalhou_(this)" style="max-width:140px;border-radius:8px;border:1px solid var(--gold);">` : '<span class="txt-muted fs-xs">Nenhuma foto cadastrada.</span>';
  document.getElementById('kkFoto').value = ''; document.getElementById('kkFotoMsg').innerHTML = '';
  popularSelectProdutosParaCombo('kkProdutoSelect');
  itensComboEdicao = comboItens.filter(v=>v.comboId===id).map(v=>({produtoId:v.produtoId, produtoNome:(produtos.find(p=>p.id===v.produtoId)||{}).nome||'(produto removido)', quantidade:v.quantidade, escolha:!!v.escolha}));
  escolhaQtdEdicao = Number((combos.find(x=>x.id===id)||{}).escolhaQtd)||0;
  renderItensComboEdicao();
  document.getElementById('comboModal').classList.add('open');
}
function fecharModalCombo(){ document.getElementById('comboModal').classList.remove('open'); }
async function trocarFotoComboEdicao(){
  const arquivo = document.getElementById('kkFoto').files[0];
  if(!arquivo) return;
  showMsg('kkFotoMsg','Enviando foto...','ok');
  try{
    const { base64, mimeType } = await comprimirImagem(arquivo, 900, 0.75);
    const r = await apiCall('uploadFotoCombo', { comboId: comboEditandoId, nomeBase: document.getElementById('kkNome').value.trim(), base64Data: base64, mimeType });
    if(r.ok){
      combos = r.combos || combos; salvarCache(); renderCombos();
      const c = combos.find(x=>x.id===comboEditandoId);
      document.getElementById('kkFotoAtual').innerHTML = c && c.fotoUrl ? `<img src="${fotoSrc_(c.fotoUrl, 400)}" onerror="fotoFalhou_(this)" style="max-width:140px;border-radius:8px;border:1px solid var(--gold);">` : '';
      showMsg('kkFotoMsg','Foto atualizada.','ok');
    } else showMsg('kkFotoMsg', r.message, 'warn');
  } catch(e){ showMsg('kkFotoMsg','Não foi possível enviar a foto.','warn'); }
}
async function removerFotoComboEdicao(){
  if(!await confirmarTxt_('Remover a foto deste combo?')) return;
  try{
    const r = await apiCall('excluirFotoCombo', { comboId: comboEditandoId });
    if(r.ok){ combos = r.combos || combos; salvarCache(); renderCombos(); document.getElementById('kkFotoAtual').innerHTML = '<span class="txt-muted fs-xs">Nenhuma foto cadastrada.</span>'; }
  } catch(e){ showMsg('kkFotoMsg','Não foi possível remover a foto.','warn'); }
}
async function salvarEdicaoCombo(){
  const nome = document.getElementById('kkNome').value.trim();
  if(!nome){ showMsg('kkMsg','Informe o nome.','warn'); return; }
  if(itensComboEdicao.length===0){ showMsg('kkMsg','Adicione pelo menos um produto ao combo.','warn'); return; }
  const precoBase = Number(document.getElementById('kkPreco').value) || 0;
  const custoBase = Number(document.getElementById('kkCusto').value) || 0;
  if(typeof cfConfirmarPrejuizo_ === 'function' && !await cfConfirmarPrejuizo_(nome, montarPrecosComExcecoes('kk', precoBase, custoBase))) return;
  try{
    const r = await apiCall('editarCombo', {
      id: comboEditandoId, nome, categoria: document.getElementById('kkCategoria').value,
      precos: montarPrecosComExcecoes('kk', precoBase, custoBase), itens: itensComboEdicao, escolhaQtd: itensComboEdicao.some(i=>i.escolha) ? escolhaQtdEdicao : 0,
      ativo: document.getElementById('kkAtivo').checked, destaque: document.getElementById('kkDestaque').checked
    });
    combos = r.combos || combos; comboPrecos = r.comboPrecos || comboPrecos; comboItens = r.comboItens || comboItens; salvarCache();
    if(r.ok && !!document.getElementById('kkSemDesc').checked !== !!((combos.find(x=>x.id===comboEditandoId)||{}).semDesconto)){
      const rs = await apiCall('editarSemDesconto', { comboId: comboEditandoId, semDesconto: document.getElementById('kkSemDesc').checked });
      if(rs && rs.ok){ combos = rs.combos || combos; if(rs.produtos) produtos = rs.produtos; salvarCache(); }
      else { showMsg('kkMsg', 'Combo salvo, mas a marca "sem desconto" não foi atualizada: ' + ((rs && rs.message) || 'tente de novo.'), 'warn'); renderCombos(); return; }
    }
    if(r.ok){ showMsg('kkMsg', r.message, 'ok'); renderCombos(); renderComboCuradoria(); popularSelectCombos(); setTimeout(fecharModalCombo, 700); }
    else showMsg('kkMsg', r.message, 'warn');
  } catch(e){ showMsg('kkMsg','Não foi possível salvar.','warn'); }
}
async function excluirComboConfirm(id){
  if(!await confirmarTxt_('Excluir este combo?')) return;
  const senhaAdminConfirmacao = await pedirSenha_(); if(!senhaAdminConfirmacao) return;
  try{ const r = await apiCall('excluirCombo', { id, senhaAdminConfirmacao }); if(!r || !r.ok){ showMsg('koMsg', (r && r.message) || 'Não foi possível excluir.', 'warn'); return; } combos = r.combos || combos; comboPrecos = r.comboPrecos || comboPrecos; comboItens = r.comboItens || comboItens; salvarCache(); renderCombos(); renderComboCuradoria(); popularSelectCombos(); }
  catch(e){ showMsg('koMsg','Não foi possível excluir.','warn'); }
}
function renderCombos(){
  const tbody = document.getElementById('koTable');
  if(combos.length===0){ tbody.innerHTML = '<tr class="empty-row"><td colspan="3">Nenhum combo cadastrado ainda.</td></tr>'; return; }
  tbody.innerHTML = combos.map(c=>{
    const { preco, custo: custoC } = precoDisplayCombo(c.id);
    const itensTxt = descricaoItensCombo(c.id);
    const perdaC = (Number(custoC) > 0 && Number(preco) < Number(custoC)) ? '<span class="obs-line cf-perda">PREJUÍZO de '+formatarMoeda(Number(custoC)-Number(preco))+' por venda: o preço está abaixo do custo</span>' : '';
    const thumb = c.fotoUrl ? `<img src="${fotoSrc_(c.fotoUrl, 100)}" onerror="fotoFalhou_(this)" style="width:34px;height:34px;border-radius:6px;object-fit:cover;vertical-align:middle;margin-right:6px;">` : '';
    return `<tr class="vs-linha" onclick="abrirEditarCombo('${c.id}')"><td>${thumb}${escH(c.nome)}<span class="obs-line">${nomeCategoria(c.categoria)}${c.semDesconto?' · 🏷️ sem desconto/cupom':''}${itensTxt?' · '+itensTxt:''}</span>${perdaC}</td><td>${formatarMoeda(preco)}</td><td><button type="button" class="ghost vs-mais" aria-label="Ações de ${escH(c.nome)}" onclick="event.stopPropagation();vsAcoesCombo('${c.id}')">⋯</button></td></tr>${(typeof precoSugLinha_==='function' && Number(custoC)>0) ? '<tr class="sug-linha vs-linha" onclick="abrirEditarCombo(\''+c.id+'\')"><td colspan="3">'+precoSugLinha_(preco, custoC, 'combo')+'</td></tr>' : ''}`;
  }).join('');
}
function renderComboCuradoria(){
  const tbody = document.getElementById('comboCuradoriaTable');
  if(!tbody) return;
  if(!combos.length){ tbody.innerHTML = '<tr class="empty-row"><td colspan="4">Nenhum combo cadastrado ainda.</td></tr>'; return; }
  const porCategoria = {};
  combos.forEach(c=>{ const cat = nomeCategoria(c.categoria) || 'Sem categoria'; (porCategoria[cat] = porCategoria[cat]||[]).push(c); });
  let html = '';
  Object.keys(porCategoria).sort().forEach(cat=>{
    html += `<tr><td colspan="4" style="background:var(--panel-2);font-weight:700;font-size:12px;color:var(--gold);">${cat}</td></tr>`;
    porCategoria[cat].sort((a,b)=>a.ordemCardapio-b.ordemCardapio).forEach(c=>{
      html += `<tr>
        <td>${escH(c.nome)}</td>
        <td><label class="d-flex ai-centro gap-2 jc-centro"><input type="checkbox" class="largura-auto" ${c.ativo?'checked':''} onchange="toggleComboVisivelCardapio('${c.id}', this.checked)"></label></td>
        <td><label class="d-flex ai-centro gap-2 jc-centro"><input type="checkbox" class="largura-auto" ${c.destaque?'checked':''} onchange="toggleComboDestaqueCuradoria('${c.id}', this.checked)"></label></td>
        <td><input type="number" value="${c.ordemCardapio}" style="width:60px;text-align:center;" onchange="salvarOrdemCardapioCombo('${c.id}', this.value)"></td>
      </tr>`;
    });
  });
  tbody.innerHTML = html;
}
async function toggleComboVisivelCardapio(id, novoAtivo){
  try{ const r = await apiCall('editarVisibilidadeCardapioCombo', { id, ativo: novoAtivo }); if(r.ok){ combos = r.combos || combos; salvarCache(); renderCombos(); renderComboCuradoria(); } }
  catch(e){}
}
async function toggleComboDestaqueCuradoria(id, novoDestaque){
  try{ const r = await apiCall('editarVisibilidadeCardapioCombo', { id, destaque: novoDestaque }); if(r.ok){ combos = r.combos || combos; salvarCache(); renderComboCuradoria(); } }
  catch(e){}
}
async function salvarOrdemCardapioCombo(id, ordem){
  try{ const r = await apiCall('editarOrdemCardapioCombo', { id, ordem }); if(r.ok){ combos = r.combos || combos; salvarCache(); renderComboCuradoria(); } }
  catch(e){}
}

/* ---------- ESTOQUE (INGREDIENTES) ---------- */
async function registrarIngrediente(){
  const nome = document.getElementById('eNome').value.trim();
  const quantidade = Number(document.getElementById('eQtd').value) || 0;
  const minimo = Number(document.getElementById('eMin').value) || 0;
  const unidade = document.getElementById('eUnidade').value;
  const custo = Number(document.getElementById('eCusto').value) || 0;
  if(!nome){ showMsg('eMsg','Informe o nome do ingrediente.','warn'); return; }
  if(!(custo > 0) && !await confirmarTxt_('Cadastrar "'+nome+'" sem preço? Os produtos que usam este ingrediente ficam sem custo até você informar quanto pagou.')) return;
  setBotoesOcupados(true);
  try{
    const r = await apiCall('addIngrediente', { nome, quantidade, minimo, unidade, custo });
    estoque = r.estoque || estoque; movimentacoesEstoque = r.movimentacoesEstoque || movimentacoesEstoque; salvarCache();
    if(r.ok){
      showMsg('eMsg', r.message, 'ok');
      fecharFormModal('ingredienteNovoModal'); showMsg('eMsgLista', r.message, 'ok');
      ['eNome','eQtd','eMin','eCusto','eCompraValor','eCompraQtd'].forEach(id=>{ const el = document.getElementById(id); if(el) el.value=''; });
      document.getElementById('eUnidade').value = 'un'; if(typeof cfIngAtualizar === 'function') cfIngAtualizar('e');
      renderEstoque(); renderMovimentacoesEstoque(); popularSelectIngredientes('pIngredienteSelect'); popularSelectIngredientes('ppIngredienteSelect'); popularSelectAdicionalIngrediente();
    } else { showMsg('eMsg', r.message, 'warn'); }
  } catch(e){ showMsg('eMsg','Não foi possível cadastrar.','warn'); }
  finally { setBotoesOcupados(false); }
}
function editarEstoquePrompt(id){
  const i = estoque.find(x=>x.id===id); if(!i) return;
  document.getElementById('eeId').value = i.id;
  document.getElementById('eeNome').value = i.nome || '';
  document.getElementById('eeQtd').value = i.quantidade;
  document.getElementById('eeMin').value = i.minimo;
  document.getElementById('eeUnidade').value = ['un','g','kg','ml','l'].includes(i.unidade) ? i.unidade : 'un';
  document.getElementById('eeCusto').value = i.custo || 0;
  document.getElementById('eeAtivo').checked = i.ativo !== false;
  if(typeof cfEeAbrir === 'function') cfEeAbrir(i);
  showMsg('eeMsg','','');
  abrirFormModal('ingredienteEditModal');
}
async function salvarEdicaoIngrediente(){
  const id = document.getElementById('eeId').value;
  const nome = document.getElementById('eeNome').value.trim();
  if(!nome){ showMsg('eeMsg','Informe o nome do ingrediente.','warn'); return; }
  if(estoque.some(x=>x.id!==id && String(x.nome).trim().toLowerCase()===nome.toLowerCase())){ showMsg('eeMsg','Já existe um ingrediente com esse nome.','warn'); return; }
  const unidade = document.getElementById('eeUnidade').value;
  setBotoesOcupados(true);
  try{
    if(typeof cfEeAntesDeSalvar === 'function' && !(await cfEeAntesDeSalvar())) return;
    const r = await apiCall('editarIngrediente', { id, nome, quantidade:Number(document.getElementById('eeQtd').value)||0, minimo:Number(document.getElementById('eeMin').value)||0, unidade, custo:Number(document.getElementById('eeCusto').value)||0, ativo: document.getElementById('eeAtivo').checked });
    estoque = r.estoque || estoque; movimentacoesEstoque = r.movimentacoesEstoque || movimentacoesEstoque; if(r.produtoPrecos) produtoPrecos = r.produtoPrecos; if(r.comboPrecos) comboPrecos = r.comboPrecos; if(r.produtoIngredientes) produtoIngredientes = r.produtoIngredientes; salvarCache();
    if(r.ok){
      fecharFormModal('ingredienteEditModal'); showMsg('eMsgLista', r.message || 'Ingrediente atualizado.', 'ok');
      renderEstoque(); renderMovimentacoesEstoque(); renderNotificacoes(); try{ renderProdutos(); renderCombos(); }catch(e){ if(window.erroTela_) erroTela_(e); } popularSelectIngredientes('pIngredienteSelect'); popularSelectIngredientes('ppIngredienteSelect'); popularSelectAdicionalIngrediente();
    } else { showMsg('eeMsg', r.message || 'Não foi possível salvar.', 'warn'); }
  }catch(e){ showMsg('eeMsg','Não foi possível salvar.','warn'); }
  finally{ setBotoesOcupados(false); }
}
async function excluirEstoqueConfirm(id){
  if(!await confirmarTxt_('Excluir este ingrediente do estoque?')) return;
  const senhaAdminConfirmacao = await pedirSenha_(); if(!senhaAdminConfirmacao) return;
  try{ const r = await apiCall('excluirIngrediente', { id, senhaAdminConfirmacao }); if(!r || !r.ok){ showMsg('eMsg', (r && r.message ? r.message : 'Não foi possível excluir.') + ' Se ele já foi usado, deixe-o inativo em vez de excluir.', 'warn'); return; } estoque = r.estoque || estoque; salvarCache(); renderEstoque(); popularSelectIngredientes('pIngredienteSelect'); popularSelectIngredientes('ppIngredienteSelect'); }
  catch(e){ showMsg('eMsg','Não foi possível excluir.','warn'); }
}
async function salvarBloqueioEstoque(ligado){
  const msg = document.getElementById('cfgBloquearEstoqueMsg'), chk = document.getElementById('cfgBloquearEstoque');
  try{
    const r = await apiCall('salvarConfigEstoque', { bloquear: !!ligado });
    if(r.ok){ configEstoque = r.configEstoque || { bloquear: !!ligado }; salvarCache(); if(msg) msg.textContent = ligado ? 'Ligado: venda sem estoque suficiente é recusada.' : 'Desligado: a venda passa e o estoque pode ficar negativo (fica registrado).'; }
    else { if(chk) chk.checked = !ligado; if(msg) msg.textContent = r.message || 'Não foi possível salvar.'; }
  } catch(e){ if(chk) chk.checked = !ligado; if(msg) msg.textContent = 'Sem conexão — não foi salvo.'; }
}
function renderEstoque(){
  const chkBE = document.getElementById('cfgBloquearEstoque'); if(chkBE && document.activeElement!==chkBE) chkBE.checked = !!(configEstoque && configEstoque.bloquear);
  const tbody = document.getElementById('eTable');
  if(typeof cfAvisos === 'function') cfAvisos();
  const listaEst = typeof cfEstoqueFiltro === 'function' ? estoque.filter(cfEstoqueFiltro) : estoque;
  if(listaEst.length===0){ tbody.innerHTML = '<tr class="empty-row"><td colspan="4">' + ((typeof _cfEstAba_ !== 'undefined' && _cfEstAba_==='beb') ? 'Nenhuma bebida ou item pronto com estoque. Cadastre em Produtos → + Novo produto → "Comprado pronto".' : 'Nenhum ingrediente cadastrado ainda.') + '</td></tr>'; return; }
  tbody.innerHTML = listaEst.map(i=>{
    const baixo = Number(i.minimo)>0 && i.quantidade <= i.minimo;
    return `<tr class="vs-linha" onclick="vsAcoesEstoque('${i.id}')">
      <td>${escH(i.nome)}${i.ativo===false?' <span class="badge">inativo</span>':''}${i.soCusto?' <span class="badge" title="Entra no custo dos produtos, mas não desconta estoque">só custo</span>':''}${typeof cfCustoLinhaEstoque === 'function' ? '<span class="obs-line">'+cfCustoLinhaEstoque(i)+'</span>' : ''}</td>
      <td>${i.quantidade} ${i.unidade||'un'}</td>
      <td>${baixo?'<span class="badge baixo">baixo</span>':'<span class="badge done">ok</span>'}</td>
      <td><button type="button" class="ghost vs-mais" aria-label="Ações de ${escH(i.nome)}" onclick="event.stopPropagation();vsAcoesEstoque('${i.id}')">⋯</button></td>
    </tr>`;
  }).join('');
}
function renderMovimentacoesEstoque(){
  const box = document.getElementById('movEstoqueLista');
  if(!box) return;
  if(!movimentacoesEstoque.length){ box.innerHTML = '<p class="sub">Nenhuma movimentação registrada ainda.</p>'; return; }
  box.innerHTML = movimentacoesEstoque.slice(0,30).map(m=>{
    const sinal = m.quantidade>0 ? '+' : '';
    return `<div class="log-item"><div class="quando">${formatarDataHoraISO(m.data)} · ${escH(m.usuario||'—')}</div><div><b>${m.tipo}</b> — ${m.ingredienteNome}: ${sinal}${m.quantidade} (${m.qtdAntes} → ${m.qtdDepois})${escH(m.motivo?' — '+m.motivo:'')}</div></div>`;
  }).join('');
}
async function entradaEstoquePrompt(id){
  const i = estoque.find(x=>x.id===id); if(!i) return;
  const f = await vsForm({ titulo:'➕ Entrada · ' + i.nome, texto:'Hoje tem ' + i.quantidade + ' ' + (i.unidade||'un') + '. Compra lançada em Compras já dá entrada sozinha.', ok:'Registrar entrada',
    campos:[ { id:'qtd', rotulo:'Quantidade que entrou', sufixo:i.unidade||'un', tipo:'numero', obrigatorio:true, maiorQueZero:true },
             { id:'motivo', rotulo:'Motivo', tipo:'texto', valor:'Reposição de estoque', sugestoes:['Reposição de estoque','Compra','Devolução'] } ] });
  if(!f) return; const qtd = f.qtd, motivo = f.motivo || 'Reposição de estoque';
  try{ const r = await apiCall('registrarEntradaEstoque', { ingredienteId:id, quantidade:Number(qtd), motivo }); estoque = r.estoque||estoque; movimentacoesEstoque = r.movimentacoesEstoque||movimentacoesEstoque; salvarCache(); renderEstoque(); renderMovimentacoesEstoque(); showMsg('eMsg', r.message, r.ok?'ok':'warn'); }
  catch(e){ showMsg('eMsg','Não foi possível registrar a entrada.','warn'); }
}
async function perdaEstoquePrompt(id){
  const i = estoque.find(x=>x.id===id); if(!i) return;
  const f = await vsForm({ titulo:'➖ Perda · ' + i.nome, texto:'Hoje tem ' + i.quantidade + ' ' + (i.unidade||'un') + '.', ok:'Registrar perda', perigo:true,
    campos:[ { id:'qtd', rotulo:'Quantidade perdida', sufixo:i.unidade||'un', tipo:'numero', obrigatorio:true, maiorQueZero:true },
             { id:'motivo', rotulo:'Motivo da perda', tipo:'texto', obrigatorio:true, sugestoes:['Estragou','Venceu','Caiu / derramou','Erro no preparo'] } ] });
  if(!f) return; const qtd = f.qtd, motivo = f.motivo;
  try{ const r = await apiCall('registrarPerdaEstoque', { ingredienteId:id, quantidade:Number(qtd), motivo }); estoque = r.estoque||estoque; movimentacoesEstoque = r.movimentacoesEstoque||movimentacoesEstoque; salvarCache(); renderEstoque(); renderMovimentacoesEstoque(); showMsg('eMsg', r.message, r.ok?'ok':'warn'); }
  catch(e){ showMsg('eMsg','Não foi possível registrar a perda.','warn'); }
}
async function inventarioEstoquePrompt(id){
  const i = estoque.find(x=>x.id===id); if(!i) return;
  const f = await vsForm({ titulo:'📋 Inventário · ' + i.nome, texto:'O sistema diz ' + i.quantidade + ' ' + (i.unidade||'un') + '. Informe quanto você contou: o estoque passa a ser esse número.', ok:'Corrigir estoque',
    campos:[ { id:'nova', rotulo:'Quantidade contada', sufixo:i.unidade||'un', tipo:'numero', obrigatorio:true, minimo:0, valor:String(i.quantidade).replace('.',',') },
             { id:'motivo', rotulo:'Observação (opcional)', tipo:'texto', valor:'Contagem de inventário' } ] });
  if(!f) return; const motivo = f.motivo || 'Contagem de inventário';
  try{ const r = await apiCall('registrarInventarioEstoque', { ingredienteId:id, novaQuantidade:Number(f.nova), motivo }); estoque = r.estoque||estoque; movimentacoesEstoque = r.movimentacoesEstoque||movimentacoesEstoque; salvarCache(); renderEstoque(); renderMovimentacoesEstoque(); showMsg('eMsg', r.message, r.ok?'ok':'warn'); }
  catch(e){ showMsg('eMsg','Não foi possível registrar o inventário.','warn'); }
}

/* ============================================================
   CAIXA — STATUS ABERTURA/FECHAMENTO
   ============================================================ */
function totaisPorFormaNaSessao(idsVendas){
  const pagsSessao = pagamentosVenda.filter(p=>idsVendas.has(p.vendaId));
  const porForma = {};
  pagsSessao.forEach(p=>{ porForma[p.forma] = (porForma[p.forma]||0) + Number(p.valor); });
  const totalDinheiro = Object.keys(porForma).filter(formaPermiteTroco).reduce((s,f)=>s+porForma[f],0);
  const totalGeral = pagsSessao.reduce((s,p)=>s+Number(p.valor),0);
  return { totalDinheiro, totalOutras: totalGeral - totalDinheiro, porForma };
}
/* ============================================================
   PEDIDOS (Retirada / Entrega)
   ============================================================ */
function ultimos5(id){ return id ? id.slice(-5).toUpperCase() : ''; }
/* número amigável do pedido (venda antiga sem número cai nos 5 últimos caracteres do ID) */
/* Selo discreto do iFood: pedido que veio do iFood (canal 'iFood'). */
function ehIfood_(v){ return !!v && v.canal==='iFood'; }
/* Entrega feita pelo próprio iFood: não precisa de entregador nem entra no acerto da loja. */
function entregaPeloIfood_(v){ return ehIfood_(v) && /ENTREGA PELO iFOOD/i.test(String(v.observacoesEntrega||'')); }
function seloIfood_(v){ return ehIfood_(v) ? ' <span class="selo-ifood" title="Pedido do iFood">iFood</span>' : ''; }
function rotuloPedido(v){ return (v && v.numero) ? String(v.numero) : ultimos5(v && v.id); }
function rotuloPedidoId(id){
  const v = (vendas||[]).find(x=>x.id===id); if(v) return rotuloPedido(v);
  /* pedido já arquivado na planilha: usa o número guardado no resumo ou no mês que já foi buscado */
  try{
    for(const t in (typeof _arqCli_ !== 'undefined' ? _arqCli_ : {})){ const p = (_arqCli_[t].pedidos||[]).find(x=>x.id===id); if(p && p.numero) return String(p.numero); }
    for(const m in (typeof _relArqCache_ !== 'undefined' ? _relArqCache_ : {})){ const p = (_relArqCache_[m].vendas||[]).find(x=>x.id===id); if(p && p.numero) return String(p.numero); }
  }catch(e){}
  return ultimos5(id);
}
function itensDoPedido(vendaId){
  return itensVenda.filter(it=>it.vendaId===vendaId).map(it=>`${it.quantidade}x ${escH(it.descricao)}`).join(', ');
}
function nomeMesa(mesaId){
  const m = mesas.find(x=>x.id===mesaId); if(m) return m.numero;
  /* Cozinha/Entregador não leem a lista de mesas: o número vem junto do pedido (v_vendas.mesa_numero) */
  const v = (vendas||[]).find(x=>x.mesaId===mesaId && x.mesaNumero);
  return v ? v.mesaNumero : '?';
}
function proximoStatusPedido(v){
  if(v.tipoEntrega==='Retirada'){
    if(v.statusPedido==='Em preparo') return 'Pronta';
    if(v.statusPedido==='Pronta') return 'Retirada';
  } else if(v.tipoEntrega==='Mesa'){
    if(v.statusPedido==='Em preparo') return 'Pronta';
    if(v.statusPedido==='Pronta') return 'Servida';
  } else {
    if(v.statusPedido==='Em preparo') return 'Pronta';
    if(v.statusPedido==='Pronta') return 'Saiu para entrega';
    if(v.statusPedido==='Saiu para entrega') return 'Entregue';
  }
  return null;
}
function tempoDecorridoDesde(ts){
  const min = Math.floor((Date.now()-ts)/60000);
  if(min<1) return 'agora mesmo';
  if(min<60) return min+' min';
  const h = Math.floor(min/60), m = min%60;
  return h+'h'+(m?m+'min':'');
}
async function avancarPedido(vendaId, novoStatus){
  const chave = 'avancar-'+vendaId;
  if(!iniciarOperacaoUnica(chave)) return;
  try{
    const atual = vendas.find(x=>x.id===vendaId);
    const r = await apiCall('avancarStatusPedido', { vendaId, novoStatus, statusEsperado: atual ? atual.statusPedido : '' });
    if(r.ok){ vendas = r.vendas || vendas; salvarCache(); renderPedidos(); renderEntregas(); renderVendas(); }
    else {
      if(r.conflito && r.vendas){ vendas = r.vendas; salvarCache(); renderPedidos(); renderEntregas(); renderVendas(); avisar(r.message); }
      else { showMsg('vMsg', r.message||'Não foi possível atualizar.', 'warn'); avisar(r.message||'Não foi possível atualizar.'); }
    }
  } catch(e){}
  finally { finalizarOperacaoUnica(chave); }
}
/* Fase 5 (F5-1): ao receber, pergunta em que forma o cliente pagou de verdade (o pedido pode ter vindo como "Dinheiro"
   e ser pago no Pix): assim o caixa espera na gaveta só o que entrou em dinheiro. Dá para dividir em duas formas. */
async function confirmarRecebimento(vendaId){
  const v = (vendas||[]).find(x=>x.id===vendaId);
  const total = v ? Math.round(((Number(v.valorTotal)||0) - (Number(v.acrescimoForma)||0))*100)/100 : 0;
  const formas = (formasPagamento||[]).filter(f=>f.ativa && f.nome !== 'A Receber (Mesa)' && !/ifood/i.test(f.nome)).map(f=>({ v:f.nome, t:f.nome }));
  let corpo = { vendaId };
  if(v && total > 0 && formas.length){
    const atual = formas.find(o=>o.v===v.formaPagamento) ? v.formaPagamento : (formas.find(o=>o.v==='Dinheiro') ? 'Dinheiro' : formas[0].v);   // ex.: "iFood (pagar na entrega)" pago em dinheiro
    const f = await vsForm({ titulo:'💰 Receber pedido #' + (v.numero||''), texto:'Total: ' + formatarMoeda(total) + '. Em que forma o cliente pagou?', ok:'Confirmar recebimento',
      campos:[ { id:'forma', tipo:'escolha', rotulo:'Forma', valor: atual, opcoes: formas },
               { id:'dividir', tipo:'escolha', rotulo:'Pagou parte em outra forma?', valor:'nao', opcoes:[ { v:'nao', t:'Não' }, { v:'sim', t:'Sim, dividir' } ] },
               { id:'forma2', tipo:'escolha', rotulo:'Segunda forma', valor: formas[0].v, opcoes: formas, mostrarSe:{ campo:'dividir', valor:'sim' } },
               { id:'valor2', tipo:'numero', rotulo:'Valor pago na segunda forma', sufixo:'R$', maiorQueZero:true, obrigatorio:true, mostrarSe:{ campo:'dividir', valor:'sim' } } ] });
    if(!f) return;
    if(f.dividir === 'sim'){
      const v2 = Math.round(Number(f.valor2)*100)/100;
      if(!(v2 > 0 && v2 < total)){ avisar('O valor da segunda forma precisa ser maior que zero e menor que ' + formatarMoeda(total) + '.'); return; }
      if(f.forma2 === f.forma){ avisar('Escolha duas formas diferentes.'); return; }
      corpo.pagamentos = [ { forma:f.forma, valor: Math.round((total - v2)*100)/100 }, { forma:f.forma2, valor: v2 } ];
    } else corpo.pagamentos = [ { forma:f.forma, valor: total } ];
  }
  const chave = 'receber-'+vendaId;
  if(!iniciarOperacaoUnica(chave)) return;
  try{
    const r = await apiCall('confirmarRecebimentoPedido', corpo);
    if(r.ok){ vendas = r.vendas || vendas; salvarCache(); renderPedidos(); renderEntregas(); renderStatusCaixa(); }
    else avisar(r.message || 'Não foi possível confirmar o recebimento.');
  } catch(e){}
  finally { finalizarOperacaoUnica(chave); }
}
function botoesSuspensao(v){
  if(!currentUser || ['Admin','Operador'].indexOf(currentUser.nivel)===-1 || v.status!=='Confirmada') return '';
  const btnCancelar = (!v.fechamentoEntregaId && v.statusPedido!=='Recebido') ? `<button class="ghost" onclick="abrirModalCancelar('venda','${v.id}')">✖ Cancelar pedido</button>` : '';
  if(v.statusPedido==='Suspenso') return `<div class="btnrow mt-2"><button class="small-gold" onclick="retomarPedidoUI('${v.id}')">▶️ Retomar pedido</button>${btnCancelar}</div>`;
  if(['Recebido','Em preparo','Pronta'].indexOf(v.statusPedido)!==-1 && !v.fechamentoEntregaId) return `<div class="btnrow mt-2"><button class="ghost" onclick="suspenderPedidoUI('${v.id}')">⏸ Suspender</button>${btnCancelar}</div>`;
  return '';
}
async function suspenderPedidoUI(vendaId){
  const f = await vsForm({ titulo:'⏸ Suspender pedido', texto:'O pedido fica parado até você tocar em "Retomar pedido".', ok:'Suspender',
    campos:[ { id:'motivo', rotulo:'Motivo', tipo:'texto', obrigatorio:true, sugestoes:['Cliente não atende','Falta de ingrediente','Aguardando o cliente confirmar'] } ] });
  if(!f) return; const motivo = f.motivo;
  const chave = 'suspender-'+vendaId; if(!iniciarOperacaoUnica(chave)) return;
  try{
    const r = await apiCall('suspenderPedido', { vendaId, motivo: motivo.trim() });
    if(r.vendas){ vendas = r.vendas; salvarCache(); renderPedidos(); renderEntregas(); }
    if(!r.ok) avisar(r.message);
  } catch(e){ avisar('Não foi possível suspender agora.'); }
  finally { finalizarOperacaoUnica(chave); }
}
async function retomarPedidoUI(vendaId){
  const chave = 'retomar-'+vendaId; if(!iniciarOperacaoUnica(chave)) return;
  try{
    const r = await apiCall('retomarPedido', { vendaId });
    if(r.vendas){ vendas = r.vendas; salvarCache(); renderPedidos(); renderEntregas(); }
    if(!r.ok) avisar(r.message);
  } catch(e){ avisar('Não foi possível retomar agora.'); }
  finally { finalizarOperacaoUnica(chave); }
}
/* ITEM 2.2 — quem pode editar pedido ainda "Recebido" (mesma regra do backend: editarVenda = Admin e Operador). */
function podeEditarPedidoRecebido_(){ return !!(currentUser && (currentUser.nivel === 'Admin' || currentUser.nivel === 'Operador')); }
async function aceitarPedidoUI(vendaId){
  const chave = 'aceitar-'+vendaId;
  if(!iniciarOperacaoUnica(chave)) return;
  try{
    const r = await apiCall('aceitarPedido', { vendaId });
    if(r.ok){ vendas = r.vendas || vendas; salvarCache(); renderPedidos(); renderEntregas(); }
    else avisar(r.message);
  } catch(e){ avisar('Não foi possível aceitar agora.'); }
  finally { finalizarOperacaoUnica(chave); }
}
async function rejeitarPedidoUI(vendaId){
  const f = await vsForm({ titulo:'Recusar pedido', ok:'Recusar pedido', perigo:true,
    campos:[ { id:'motivo', rotulo:'Motivo da recusa', tipo:'texto', obrigatorio:true, sugestoes:['Sem estoque','Fora do horário','Fora da área de entrega','Pedido repetido'] } ] });
  if(!f) return; const motivo = f.motivo;
  const executar = async (senha)=>{
    try{
      const r = await apiCall('rejeitarPedido', { vendaId, motivo, senhaAdminConfirmacao: senha||'' });
      if(r.ok){ vendas = r.vendas || vendas; produtoPrecos = r.produtoPrecos||produtoPrecos; estoque = r.estoque||estoque; salvarCache(); renderPedidos(); renderEntregas(); }
      else avisar(r.message);
    } catch(e){ avisar('Não foi possível rejeitar agora.'); }
  };
  if(precisaConfirmarAdmin()) abrirModalSenhaAdmin(executar); else executar('');
}
async function salvarEntregador(vendaId, valor){
  try{
    const r = await apiCall('atribuirEntregador', { vendaId, entregador: valor, entregadorVisto: ((vendas.find(x=>x.id===vendaId)||{}).entregador||'') });
    if(r.ok){ vendas = r.vendas || vendas; salvarCache(); renderEntregas(); }
    else { avisar(r.message || 'Não foi possível atribuir o entregador.'); renderEntregas(); }
  } catch(e){ avisar('Sem conexão — o entregador não foi atribuído.'); renderEntregas(); }
}
function tempoEntre(ts1, ts2){
  if(!ts1 || !ts2) return null;
  const min = Math.max(0, Math.round((ts2-ts1)/60000));
  if(min<60) return min+' min';
  const h = Math.floor(min/60), m = min%60;
  return h+'h'+(m?m+'min':'');
}
/* avisar o cliente do andamento do pedido pelo WhatsApp (wa.me, mensagem pronta). Não é envio automático: a API oficial do
   WhatsApp Business exige conta Meta, modelos aprovados e custo. Quem avisa é o Admin/Caixa, que toca no botão e confirma no WhatsApp. */
const AVISOS_CLIENTE_KEY_ = 'txbAvisosCliente';
function telefoneWhatsApp_(tel){
  const d = normTel(tel);
  if(/^\d{10,11}$/.test(d)) return '55'+d;          // DDD + número
  if(/^55\d{10,11}$/.test(d)) return d;             // já vem com o 55
  return null;
}
function lerAvisosCliente_(){ try{ return JSON.parse(localStorage.getItem(AVISOS_CLIENTE_KEY_)||'{}'); }catch(e){ return {}; } }
function mensagemStatusCliente_(v){
  const nome = String(v.clienteNome||'').trim().split(/\s+/)[0];
  const ola = 'Olá'+(nome ? ', '+nome : '')+'! ';
  const n = rotuloPedido(v);
  if(v.statusPedido==='Pronta' && v.tipoEntrega==='Retirada') return ola+'Seu pedido #'+n+' na '+nomeRestaurante_()+' está pronto para retirada. 🍔 Pode vir buscar!';
  if(v.statusPedido==='Pronta' && v.tipoEntrega==='Entrega') return ola+'Seu pedido #'+n+' na '+nomeRestaurante_()+' está pronto e já vai sair para entrega. 🛵';
  if(v.statusPedido==='Saiu para entrega') return ola+'Seu pedido #'+n+' da '+nomeRestaurante_()+' saiu para entrega. 🛵 Logo chega até você!';
  return null;
}
function podeAvisarCliente_(){ return !!(currentUser && (currentUser.nivel==='Admin' || currentUser.nivel==='Operador')); }
function botaoAvisarCliente_(v){
  if(!podeAvisarCliente_() || v.status!=='Confirmada' || v.tipoEntrega==='Mesa') return '';
  if(!mensagemStatusCliente_(v) || !telefoneWhatsApp_(v.clienteTelefone)) return '';
  const feito = lerAvisosCliente_()[v.id+'|'+v.statusPedido];
  const hora = feito ? new Date(feito).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : '';
  return `<div class="btnrow mt-2 ai-centro"><button type="button" class="ghost" onclick="avisarClienteWhatsApp('${v.id}')">📲 ${feito?'Avisar de novo':'Avisar cliente'}</button>${feito?`<span class="obs-line sem-margem">✔ avisado às ${hora}</span>`:''}</div>`;
}
function avisarClienteWhatsApp(vendaId){
  const v = vendas.find(x=>x.id===vendaId); if(!v || !podeAvisarCliente_()) return;
  const msg = mensagemStatusCliente_(v), fone = telefoneWhatsApp_(v.clienteTelefone);
  if(!msg || !fone){ avisar('Este pedido não tem telefone válido ou não está em um status que se avisa ao cliente.'); return; }
  try{ const a = lerAvisosCliente_(); a[v.id+'|'+v.statusPedido] = Date.now();
    const chaves = Object.keys(a); if(chaves.length>200) chaves.sort((x,y)=>a[x]-a[y]).slice(0,chaves.length-200).forEach(k=>delete a[k]);
    localStorage.setItem(AVISOS_CLIENTE_KEY_, JSON.stringify(a)); }catch(e){}
  window.open('https://wa.me/'+fone+'?text='+encodeURIComponent(msg), '_blank');
  renderPedidos(); renderEntregas();
}
/* quem fez o pedido. Garçom/Admin/Operador: nome da pessoa (e o perfil, quando a lista de usuários está disponível).
   Pedido feito sozinho pelo cliente (cardápio): "Cliente" + o nome que ele informou. */
function quemFezPedido_(v){
  if(!v) return '';
  if(ehIfood_(v)) return '🛵 Pedido do iFood' + (v.clienteNome && v.clienteNome!=='Cliente iFood' ? ' ('+v.clienteNome+')' : '');
  const ehCliente = v.origem==='Cardápio' || /^Cardápio/i.test(String(v.registradoPor||''));
  if(ehCliente) return '📱 Cliente' + (v.clienteNome ? ' ('+v.clienteNome+')' : '');
  const login = String(v.registradoPor||'').trim();
  if(!login) return v.origem==='Cardápio' ? '📱 Cliente' + (v.clienteNome ? ' ('+v.clienteNome+')' : '') : '';
  const u = (usuarios||[]).find(x=>String(x.login||'').toLowerCase()===login.toLowerCase());
  const nome = (u && (u.nome||u.login)) || login;
  const perfil = (u && u.nivel) || (v.origem==='Garçom' ? 'Garçom' : '');
  return '👤 ' + nome + (perfil ? ' · ' + perfil : '');
}
