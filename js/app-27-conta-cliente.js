/* ===================================================================================================
   CONTA DO CLIENTE (login opcional com Google) — Minha conta, Aviso de Privacidade (LGPD), cupons da conta,
   endereços, repetir pedido, indique e ganhe. Quem não entra continua pedindo normalmente (nada muda).
   - A sessão do cliente é SEPARADA da sessão da equipe (chave própria no aparelho).
   - Todas as regras (cupom, histórico, anonimização) ficam no banco: funções api_conta_* (só o cliente logado) e api_aviso_privacidade (pública).
   - Funções deste arquivo usam o sufixo _ ou o prefixo conta; só as chamadas por onclick/ganchos ficam globais.
   =================================================================================================== */
(function(){
'use strict';
var KEY = 'txbContaSb_v1', IND_KEY = 'txbIndicacao', VOLTA_KEY = 'txbContaVolta';
var FID_META = 10;                                   // carimbos para completar o cartão (o prêmio é entregue pelo restaurante)
var estado = { brindes:null, escolhas:[], conta:null, cupons:null, enderecos:null, pedidos:null, aba:'pedidos', cupomPendente:'', iniciando:false };
var refreshP = null;

function $(id){ return document.getElementById(id); }
function esc(s){ return (typeof escH === 'function') ? escH(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function dinheiro(v){ return (typeof formatarMoeda === 'function') ? formatarMoeda(v) : 'R$ ' + (Number(v) || 0).toFixed(2).replace('.', ','); }
function dataBr(iso){ try{ var d = new Date(iso); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }); }catch(e){ return ''; } }
function dataCurta(iso){ try{ var p = String(iso || '').slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : ''; }catch(e){ return ''; } }
function primeiroNome(n){ return String(n || '').trim().split(/\s+/)[0] || ''; }
function foneBonito(d){ d = String(d || '').replace(/\D/g, ''); if(d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7); if(d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6); return d; }
function toast(msg){ try{ avisar(msg); }catch(e){} }

/* ---------- sessão do cliente (separada da equipe) ---------- */
function lerSessao(){ try{ return JSON.parse(localStorage.getItem(KEY) || 'null'); }catch(e){ return null; } }
function gravarSessao(s){ try{ if(s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); }catch(e){} }
function guardarTokens(c){
  gravarSessao({ access_token:c.access_token, refresh_token:c.refresh_token, expira: Date.now() + Math.max(60, (Number(c.expires_in) || 3600) - 60) * 1000 });
}
async function renovar(){
  if(refreshP) return refreshP;
  refreshP = (async function(){
    var s = lerSessao(); if(!s || !s.refresh_token) return false;
    try{
      var r = await sbJson_(SUPABASE_URL_ + '/auth/v1/token?grant_type=refresh_token', { method:'POST', headers:{ 'apikey': SUPABASE_CHAVE_, 'Content-Type':'application/json' }, body: JSON.stringify({ refresh_token: s.refresh_token }) }, 20000);
      if(r.status === 400 || r.status === 401 || r.status === 403 || r.status === 422){ gravarSessao(null); return false; }
      if(!r.ok) return false;
      var c = await r.json(); if(!c || !c.access_token) return false;
      guardarTokens(c); return true;
    }catch(e){ return false; }
  })();
  try{ return await refreshP; }finally{ refreshP = null; }
}
/* devolve um token válido do cliente (renovando se preciso) ou null */
async function tokenOuNull(){
  var s = lerSessao(); if(!s) return null;
  if(Date.now() < s.expira) return s.access_token;
  if(await renovar()){ s = lerSessao(); return s ? s.access_token : null; }
  return null;
}
window.contaTokenOuNull_ = tokenOuNull;
window.contaSessaoAtiva_ = function(){ return !!lerSessao(); };
window.contaDesativarSessao_ = function(){ gravarSessao(null); estado.conta = null; atualizarBotao(); };

async function rpc(fn, corpo){
  var tok = await tokenOuNull();
  if(!tok) return { ok:false, semSessao:true, message:'Entre com a sua conta para continuar.' };
  try{
    var r = await sbJson_(SUPABASE_URL_ + '/rest/v1/rpc/' + fn, { method:'POST', headers:{ 'apikey': SUPABASE_CHAVE_, 'Authorization': 'Bearer ' + tok, 'Content-Type':'application/json' }, body: JSON.stringify(corpo || {}) }, 30000);
    if(r.status === 401){ sair(true); return { ok:false, semSessao:true, message:'Sua sessão expirou. Entre de novo.' }; }
    var j = await r.json().catch(function(){ return null; });
    if(!r.ok) return { ok:false, message:'Não foi possível concluir agora (erro ' + r.status + '). Tente novamente em instantes.' };
    return (j && typeof j === 'object') ? j : { ok:false, message:'Resposta inesperada do servidor.' };
  }catch(e){ return { ok:false, message:'Sem conexão agora. Confira a internet e tente de novo.' }; }
}
function rpcPublico(fn, corpo){ return sbRpcPublico_(fn, corpo || {}).catch(function(){ return { ok:false, message:'Sem conexão agora. Confira a internet e tente de novo.' }; }); }

/* ---------- entrar / sair ---------- */
function guardarVolta(abrir){
  try{ if(typeof cdSalvarCarrinho_ === 'function' && typeof cdCarrinho !== 'undefined' && cdCarrinho.length) cdSalvarCarrinho_(); }catch(e){}
  try{ sessionStorage.setItem(VOLTA_KEY, JSON.stringify({ abrir: abrir || '' })); }catch(e){}
}
function entrarGoogle(abrir){
  guardarVolta(abrir);
  var volta = location.origin + location.pathname;
  location.href = SUPABASE_URL_ + '/auth/v1/authorize?provider=google&redirect_to=' + encodeURIComponent(volta);
}
function sair(silencioso){
  var s = lerSessao();
  gravarSessao(null);
  if(s && s.access_token){ try{ sbJson_(SUPABASE_URL_ + '/auth/v1/logout', { method:'POST', headers:{ 'apikey': SUPABASE_CHAVE_, 'Authorization': 'Bearer ' + s.access_token } }, 8000).catch(function(){}); }catch(e){} }
  estado.conta = null; estado.cupons = null; estado.enderecos = null; estado.pedidos = null; estado.brindes = null; estado.escolhas = [];
  fecharTodos();
  atualizaCarrinho();
  atualizarBotao();
  limparCheckout();
  if(!silencioso) toast('Você saiu da sua conta.');
}

/* ---------- janelas (criadas sob demanda) ---------- */
function janela(id, html, fechavel){
  var m = $(id);
  if(!m){ m = document.createElement('div'); m.className = 'modal-overlay ct-modal'; m.id = id; document.body.appendChild(m); }
  m.innerHTML = '<div class="modal-box ct-box">' + html + '</div>';
  m.classList.add('open');
  if(fechavel !== false) m.onclick = function(ev){ if(ev.target === m) fechar(id); }; else m.onclick = null;
  var b = m.querySelector('.modal-box'); if(b) b.scrollTop = 0;
  return m;
}
function fechar(id){ var m = $(id); if(m) m.classList.remove('open'); }
function fecharTodos(){ ['contaEntrarModal', 'contaAceiteModal', 'contaModal', 'contaAvisoModal', 'contaConfirmModal', 'contaFeedbackModal'].forEach(fechar); }
function cab(titulo, idFechar, aoFechar){
  return '<div class="modal-header"><h2>' + titulo + '</h2><button class="close-btn" type="button" onclick="' + (aoFechar || ('contaFechar_(\'' + idFechar + '\')')) + '">✕</button></div>';
}
window.contaFechar_ = fechar;

function confirmar(titulo, texto, okTxt, perigo, extraHtml){
  return new Promise(function(res){
    var h = cab(esc(titulo), 'contaConfirmModal', 'contaConfirmNao_()') + '<p class="sub fs-sm">' + texto + '</p>' + (extraHtml || '') +
      '<div class="ct-linha"><button type="button" class="ghost" onclick="contaConfirmNao_()">Cancelar</button><button type="button" class="' + (perigo ? 'ct-perigo' : 'small-gold') + '" onclick="contaConfirmSim_()">' + esc(okTxt || 'Confirmar') + '</button></div>';
    janela('contaConfirmModal', h, false);
    window.contaConfirmSim_ = function(){ fechar('contaConfirmModal'); res(true); };
    window.contaConfirmNao_ = function(){ fechar('contaConfirmModal'); res(false); };
  });
}

/* ---------- botão do cardápio ---------- */
function qtdBrindes(){
  var b = estado.brindes; if(!b || !b.ok) return 0;
  return (b.fidelidadeDisponivel && (b.produtosFid || []).length ? 1 : 0) + ((b.produtosInd || []).length ? (b.indicacao || []).length : 0);
}
/* v1.24 — incentivo para entrar com o Google: mostra só vantagens que estão LIGADAS no sistema (cupom de boas-vindas, fidelidade). */
var _incentivo = null;
function carregarIncentivo_(){
  if(_incentivo) return;
  _incentivo = {};
  rpcPublico('api_conta_incentivo', { p:{} }).then(function(r){ if(r && r.ok){ _incentivo = r; atualizarBotao(); } });
}
function textoBoasVindas_(){
  var b = _incentivo && _incentivo.boasVindas; if(!b) return '';
  return (b.tipo === 'percentual' ? Number(b.valor) + '% de desconto' : b.tipo === 'fixo' ? dinheiro(b.valor) + ' de desconto' : b.tipo === 'frete' ? 'frete grátis' : 'um desconto') + ' no 1º pedido';
}
function textoConvite_(curto){
  var bv = textoBoasVindas_();
  if(curto) return bv ? '🎁 Entre com o Google e ganhe <b>' + esc(bv) + '</b>' : '⭐ Entre com o Google: <b>cupons</b>, seus <b>carimbos</b> e pedido em 1 toque';
  return (bv ? '🎁 <b>Ganhe ' + esc(bv) + '</b> entrando com o Google.<br>' : '👤 <b>Peça mais rápido com a sua conta Google:</b><br>')
    + 'nome e telefone já preenchidos, endereços salvos, repetir pedido em 1 toque, <b>cupons exclusivos</b>'
    + (_incentivo && _incentivo.fidelidade ? ' e o seu <b>cartão fidelidade</b> (' + esc(_incentivo.fidelidade) + ')' : '') + '.';
}
window.contaConvitePosPedido_ = function(){
  if(estado.conta || lerSessao()) return null;
  var d = document.createElement('div'); d.className = 'ct-chamada'; d.style.marginTop = '10px';
  d.innerHTML = '<span>⭐ <b>Guarde este pedido na sua conta:</b> repita com 1 toque da próxima vez' + (_incentivo && _incentivo.fidelidade ? ' e acompanhe os carimbos do cartão fidelidade' : '') + '.</span><button type="button" class="small-gold" onclick="contaGoogle_(\'conta\')">Entrar com Google</button>';
  return d;
};
function atualizarBotao(){
  var b = $('cdContaBtn'); if(!b) return;
  if(!estado.conta && !lerSessao()) carregarIncentivo_();
  var bar = $('cdContaBar'), t = $('cdContaTxt'), logada = !!(estado.conta || lerSessao());
  if(estado.conta) b.textContent = 'Minha conta';
  else if(logada) b.textContent = 'Minha conta';
  else b.textContent = '👤 Entrar';
  if(bar) bar.classList.toggle('logada', logada);
  if(t){
    if(estado.conta){
      var n = qtdBrindes();
      t.innerHTML = '👤 Olá, <b>' + esc(primeiroNome(estado.conta.nome) || 'cliente') + '</b>' + (n ? ' · <b>🎁 ' + n + (n === 1 ? ' brinde' : ' brindes') + ' para você</b>' : '');
    }else if(logada) t.textContent = '👤 Sua conta';
    else t.innerHTML = textoConvite_(true);
  }
}
async function carregarBrindes(){
  var r = await rpc('api_conta_beneficios', {});
  estado.brindes = r.ok ? r : null;
  /* tira escolhas que não valem mais */
  estado.escolhas = estado.escolhas.filter(function(e){
    if(!estado.brindes) return false;
    if(e.tipo === 'Fidelidade') return !!estado.brindes.fidelidadeDisponivel;
    return (estado.brindes.indicacao || []).some(function(x){ return x.id === e.id; });
  });
  atualizarBotao();
  return r;
}
/* brindes escolhidos para o pedido (lidos pelo carrinho) */
window.contaBrindesEscolhidos_ = function(){ return estado.conta ? estado.escolhas : []; };
function atualizaCarrinho(){
  try{ if(typeof renderCdCarrinho === 'function') renderCdCarrinho(); if(typeof atualizarFabCarrinho === 'function') atualizarFabCarrinho(); }catch(e){}
}
function nomeProd(lista, id){ var p = (lista || []).filter(function(x){ return x.id === id; })[0]; return p ? p.nome : ''; }
function definirEscolha(tipo, id, produtoId){
  estado.escolhas = estado.escolhas.filter(function(e){ return e.chave !== (tipo + ':' + (id || '')); });
  if(produtoId){
    var b = estado.brindes || {}, nome = nomeProd(tipo === 'Fidelidade' ? b.produtosFid : b.produtosInd, produtoId);
    if(nome) estado.escolhas.push({ chave: tipo + ':' + (id || ''), tipo: tipo, id: id || null, produtoId: produtoId, nome: nome });
  }
}
window.contaEscolherBrinde_ = function(tipo, id, produtoId){
  definirEscolha(tipo, id, produtoId);
  fechar('contaModal');
  atualizaCarrinho();
  if(typeof abrirCarrinhoPublico === 'function') abrirCarrinhoPublico();
};
window.contaSelBrinde_ = function(tipo, id, produtoId){ definirEscolha(tipo, id, produtoId); atualizaCarrinho(); };
window.contaRemoverBrinde_ = function(chave){
  estado.escolhas = estado.escolhas.filter(function(e){ return e.chave !== chave; });
  var sel = document.querySelectorAll('#cdContaBrindes select'); for(var i = 0; i < sel.length; i++) if(sel[i].getAttribute('data-chave') === chave) sel[i].value = '';
  atualizaCarrinho();
};
window.contaAposPedido_ = function(){
  estado.escolhas = []; estado.brindes = null; estado.cupons = null; atualizarBotao();
  if(estado.conta) carregarBrindes();
};
function linhasProdutos(tipo, id, lista){
  return (lista || []).map(function(p){
    return '<div class="ct-prod"><span>🎁 ' + esc(p.nome) + (p.descricao ? '<br><small class="txt-muted">' + esc(p.descricao) + '</small>' : '') + '</span><button type="button" class="small-gold" onclick="contaEscolherBrinde_(\'' + tipo + '\',\'' + esc(id || '') + '\',\'' + esc(p.id) + '\')">Escolher</button></div>';
  }).join('');
}
window.contaBotao_ = function(){
  if(!lerSessao()) return abrirEntrar();
  if(estado.conta) return abrirConta();
  iniciar(true);
};

function abrirEntrar(){
  var h = cab('Entre na sua conta', 'contaEntrarModal') +
    '<p class="sub fs-sm">Com a conta você pode:</p>' +
    '<ul class="ct-lista"><li>📦 ver seus pedidos e <b>repetir</b> com um toque</li><li>🎟️ receber <b>cupons</b> exclusivos</li><li>⭐ acompanhar seu <b>cartão fidelidade</b></li><li>📍 guardar seus endereços</li><li>🎁 indicar amigos e ganhar</li></ul>' +
    '<button type="button" class="ct-google" onclick="contaGoogle_(\'conta\')"><span class="ct-g">G</span> Continuar com o Google</button>' +
    '<p class="sub mt-3 fs-xs">É opcional: você continua podendo pedir <b>sem conta</b>. Ao continuar, você lê e aceita o <a href="#" onclick="abrirAvisoPrivacidade();return false;" class="txt-ouro">Aviso de Privacidade</a>.</p>';
  janela('contaEntrarModal', h);
}
window.contaGoogle_ = function(abrir){ entrarGoogle(typeof abrir === 'string' ? abrir : ''); };
window.abrirContaEntrar = abrirEntrar;

/* ---------- início: reconhece o cliente, cria a conta no banco e pede o aceite ---------- */
async function iniciar(manual){
  if(estado.iniciando) return; estado.iniciando = true;
  try{
    var ind = ''; try{ ind = localStorage.getItem(IND_KEY) || ''; }catch(e){}
    var r = await rpc('api_conta_iniciar', { p:{ indicacao: ind } });
    if(r.semSessao) return;
    if(!r.ok){
      if(/equipe/i.test(r.message || '')){ toast(r.message); sair(true); return; }
      if(manual) toast(r.message || 'Não foi possível abrir sua conta agora.');
      return;
    }
    try{ localStorage.removeItem(IND_KEY); }catch(e){}
    estado.conta = r.conta; atualizarBotao();
    if(r.precisaAceite){ abrirAceite(r); return; }
    carregarBrindes();
    var volta = null; try{ volta = JSON.parse(sessionStorage.getItem(VOLTA_KEY) || 'null'); sessionStorage.removeItem(VOLTA_KEY); }catch(e){}
    if(volta && volta.abrir === 'carrinho'){ setTimeout(function(){ if(typeof abrirCarrinhoPublico === 'function') abrirCarrinhoPublico(); }, 400); }
    else if(volta && volta.abrir === 'conta'){ abrirConta(); }
    else if(manual) abrirConta();
    sincronizarHistorico();
  }finally{ estado.iniciando = false; }
}

/* pedidos da conta entram no "Acompanhe seu pedido" deste aparelho */
async function sincronizarHistorico(){
  try{
    var r = await rpc('api_conta_pedidos', {}); if(!r.ok) return;
    estado.pedidos = r.pedidos || [];
    (r.pedidos || []).slice(0, 6).reverse().forEach(function(p){ if(typeof salvarPedidoNoHistoricoCliente === 'function') salvarPedidoNoHistoricoCliente(String(p.id).slice(-8), (estado.conta && estado.conta.nome) || '', p.numero); });
  }catch(e){}
}

/* ---------- aceite do Aviso de Privacidade (criação da conta) ---------- */
function abrirAceite(r){
  var c = r.conta || {};
  var h = cab('Criar minha conta', 'contaAceiteModal', 'contaAceiteCancelar_()') +
    '<p class="sub fs-sm">Falta só confirmar alguns dados. Seu e-mail: <b>' + esc(c.email || '') + '</b></p>' +
    '<label for="ctNome">Como podemos te chamar? *</label><input type="text" id="ctNome" maxlength="80" value="' + esc(c.nome || '') + '" autocomplete="name">' +
    '<label for="ctNasc">Data de nascimento (opcional)</label><input type="date" id="ctNasc" value="' + esc(c.nascimento || '') + '">' +
    '<p class="sub" style="font-size:12px;margin:4px 0 10px;">Usamos só para te dar um presente no aniversário, se o restaurante tiver essa promoção.</p>' +
    '<label class="ct-check"><input type="checkbox" id="ctAceito"> <span>Li e aceito o <a href="#" onclick="abrirAvisoPrivacidade();return false;" class="txt-ouro">Aviso de Privacidade</a>. *</span></label>' +
    '<label class="ct-check"><input type="checkbox" id="ctPromo"> <span>Quero receber novidades e promoções do restaurante (opcional — você pode mudar quando quiser).</span></label>' +
    '<div id="ctAceiteMsg" class="msg"></div>' +
    '<button type="button" class="primary" id="ctAceiteBtn" onclick="contaAceitar_()">Criar minha conta</button>' +
    '<button type="button" class="ghost" style="width:100%;margin-top:8px;" onclick="contaAceiteCancelar_()">Agora não</button>';
  janela('contaAceiteModal', h, false);
}
window.contaAceiteCancelar_ = function(){ sair(true); };
window.contaAceitar_ = async function(){
  var msg = $('ctAceiteMsg'), btn = $('ctAceiteBtn');
  var nome = ($('ctNome').value || '').trim();
  if(!nome){ msg.textContent = 'Informe como podemos te chamar.'; msg.className = 'msg warn'; return; }
  if(!$('ctAceito').checked){ msg.textContent = 'Para criar a conta é preciso aceitar o Aviso de Privacidade.'; msg.className = 'msg warn'; return; }
  btn.disabled = true; btn.textContent = 'Criando...';
  var r = await rpc('api_conta_aceitar', { p:{ aceito:true, nome: nome, nascimento: $('ctNasc').value || '', promo: $('ctPromo').checked } });
  btn.disabled = false; btn.textContent = 'Criar minha conta';
  if(!r.ok){ msg.textContent = r.message || 'Não foi possível criar a conta agora.'; msg.className = 'msg warn'; return; }
  fechar('contaAceiteModal');
  await iniciar(false);
  var c = await rpc('api_conta_cupons', {}); if(c.ok) estado.cupons = c;
  toast('Conta criada! ' + (c.ok && c.boasVindas ? 'Você ganhou um cupom de boas-vindas — veja em Minha conta → Cupons.' : 'Bem-vindo(a)!'));
};

/* ---------- Aviso de Privacidade (público: também abre sem conta) ---------- */
function textoAviso(d){
  var nome = esc(d.nome || 'o restaurante');
  var ident = '<b>' + nome + '</b>' + (d.razaoSocial ? ' (' + esc(d.razaoSocial) + ')' : '') + (d.cnpj ? ', CNPJ ' + esc(d.cnpj) : '') + (d.endereco ? ', ' + esc(d.endereco) : '');
  var contato = d.telefone ? 'WhatsApp <b>' + esc(d.telefone) + '</b>' : 'os canais de contato do restaurante';
  var anos = Number(d.anos) || 3;
  return '<div class="ct-aviso">' +
    '<p class="sub">Versão ' + esc(d.versao || 1) + '. Este aviso explica, de forma simples, como cuidamos dos seus dados (Lei Geral de Proteção de Dados — LGPD, Lei 13.709/2018).</p>' +
    '<h3>1. Quem cuida dos seus dados</h3><p>O controlador dos dados é ' + ident + '. Para falar sobre privacidade, use ' + contato + '.</p>' +
    '<h3>2. Quais dados usamos</h3><ul><li><b>Da sua conta Google:</b> nome e e-mail (não recebemos a sua senha do Google).</li><li><b>Que você informa:</b> telefone, endereços de entrega e data de nascimento (opcional).</li><li><b>Do uso do app:</b> pedidos, itens, valores, forma de pagamento, cupons usados e carimbos do cartão fidelidade.</li><li><b>Técnicos:</b> endereço de IP e tipo de aparelho, para segurança e para evitar fraudes.</li></ul><p>Quem pede sem conta informa nome, telefone e endereço, que são tratados do mesmo jeito para entregar o pedido.</p>' +
    '<h3>3. Para que usamos (e em que base legal)</h3><ul><li>Receber, preparar, entregar e cobrar seu pedido — <i>execução do contrato</i>.</li><li>Manter sua conta, histórico, endereços e repetir pedidos — <i>execução do contrato / seu consentimento</i>.</li><li>Cartão fidelidade, cupons de boas-vindas, de aniversário e “indique e ganhe” — <i>seu consentimento ao criar a conta</i>.</li><li>Enviar novidades e promoções — <i>somente se você marcar essa opção</i>, e pode desmarcar quando quiser.</li><li>Guardar registros de vendas exigidos por lei (fiscais e contábeis) — <i>obrigação legal</i>.</li><li>Segurança do sistema e prevenção a fraudes — <i>legítimo interesse</i>.</li></ul>' +
    '<h3>4. Com quem compartilhamos</h3><p>Não vendemos seus dados. Eles ficam com provedores de tecnologia que o restaurante usa para funcionar (hospedagem do banco de dados e login — Supabase e Google) e, no que for necessário para a entrega, com o entregador (nome, endereço e telefone). Também usamos o Mercado Pago como operador de pagamento: quando você escolhe pagar pelo site, o e-mail da conta e, no caso de cartão, o CPF informado na tela de pagamento são enviados ao Mercado Pago somente para processar e verificar a transação. O ' + NOME_H_() + ' não recebe nem armazena o número completo do cartão. Também podemos informar autoridades quando a lei exigir.</p>' +
    '<h3>5. Por quanto tempo guardamos</h3><p>Enquanto você tiver a conta. Se ficar <b>' + anos + ' ' + (anos === 1 ? 'ano' : 'anos') + '</b> sem fazer pedidos, seus dados pessoais são <b>anonimizados</b>. Registros de venda exigidos por lei podem ser mantidos sem identificar você.</p>' +
    '<h3>6. Seus direitos</h3><p>Você pode, a qualquer momento: confirmar que tratamos seus dados, acessar, corrigir, <b>baixar uma cópia</b> (Minha conta → Meus dados), pedir anonimização ou eliminação (<b>apagar a conta</b>, no mesmo lugar), saber com quem compartilhamos, retirar consentimentos (como o das promoções) e se opor a um tratamento. Se preferir, peça por ' + contato + '.</p>' +
    '<h3>7. Segurança</h3><p>Usamos conexão protegida, acesso restrito e regras no banco de dados para que cada cliente veja somente os próprios dados. Nenhum sistema é 100% imune, mas trabalhamos para reduzir riscos.</p>' +
    '<h3>8. Dados guardados no seu aparelho</h3><p>Guardamos no aparelho o necessário para manter você conectado(a) e lembrar suas preferências (como nome, telefone e carrinho). Você pode limpar isso nos ajustes do navegador.</p>' +
    '<h3>9. Crianças e adolescentes</h3><p>A conta é para maiores de 18 anos. Menores devem pedir com o acompanhamento de um responsável.</p>' +
    '<h3>10. Mudanças neste aviso</h3><p>Se algo importante mudar, você verá a nova versão e será convidado(a) a aceitar de novo.</p></div>';
}
/* v1.15 — funil e mapa do cardápio: aviso só aqui, dentro de "Privacidade" (decisão do dono) */
var AVISO_LOCAL_ = '<div class="ct-chamada" style="margin-top:10px;"><span>📍 <b>Localização:</b> Usamos sua localização aproximada só para saber de onde vêm os pedidos. Ela é apagada ao fim do turno; fica guardada apenas a contagem de acessos por região (cerca de 500 m), sem identificar você nem o seu aparelho.</span></div>';
window.abrirAvisoPrivacidade = async function(){
  janela('contaAvisoModal', cab('Aviso de Privacidade', 'contaAvisoModal') + '<p class="sub">Carregando...</p>');
  var d = await rpcPublico('api_aviso_privacidade', {});
  if(!d || !d.ok){ janela('contaAvisoModal', cab('Aviso de Privacidade', 'contaAvisoModal') + '<p class="sub" role="alert">⚠️ Não foi possível carregar o aviso completo agora. Tente novamente em instantes.</p>' + AVISO_LOCAL_); return; }
  janela('contaAvisoModal', cab('Aviso de Privacidade', 'contaAvisoModal') + textoAviso(d) + AVISO_LOCAL_ + '<button type="button" class="ghost" style="width:100%;margin-top:10px;" onclick="contaFechar_(\'contaAvisoModal\')">Fechar</button>');
};

/* ---------- Minha conta ---------- */
var ABAS = [['pedidos', '📦 Pedidos'], ['cupons', '🎟️ Cupons'], ['fidelidade', '⭐ Fidelidade'], ['enderecos', '📍 Endereços'], ['indique', '🎁 Indique'], ['jogos', '🎮 Jogos'], ['dados', '🔒 Meus dados']];
function abrirConta(aba){
  if(!estado.conta) return;
  if(aba) estado.aba = aba;
  var h = cab('Minha conta', 'contaModal') +
    '<p class="sub mb-2">Olá, <b>' + esc(primeiroNome(estado.conta.nome) || 'cliente') + '</b> · ' + esc(estado.conta.email || '') + '</p>' +
    '<div id="ctAniv"></div>' +
    '<div class="ct-abas" id="ctAbas">' + ABAS.map(function(a){ return '<button type="button" data-aba="' + a[0] + '" class="' + (a[0] === estado.aba ? 'on' : '') + '" onclick="contaAba_(\'' + a[0] + '\')">' + a[1] + '</button>'; }).join('') + '</div>' +
    '<div id="ctCorpo" class="ct-corpo"></div>';
  janela('contaModal', h);
  desenharAba();
  chamadaAniversario_();
}
/* v1.25: conta sem data de nascimento e presente de aniversário ligado → convite para informar */
function chamadaAniversario_(){
  var box = $('ctAniv'); if(!box) return;
  if(!estado.conta || estado.conta.nascimento){ box.innerHTML = ''; return; }
  var mostrar = function(r){
    var a = r && r.aniversario, b = $('ctAniv'); if(!a || !b) return;
    var pres = a.tipo === 'percentual' ? Number(a.valor) + '% de desconto' : a.tipo === 'fixo' ? dinheiro(a.valor) + ' de desconto' : a.tipo === 'frete' ? 'frete grátis' : 'um presente';
    b.innerHTML = '<div class="ct-chamada" style="margin:0 0 10px;"><span>🎂 <b>Ganhe ' + esc(pres) + ' no seu aniversário.</b> Informe a data em Meus dados.</span><button type="button" class="small-gold" onclick="contaAba_(\'dados\')">Informar</button></div>';
  };
  if(_incentivo && _incentivo.ok) mostrar(_incentivo);
  else rpcPublico('api_conta_incentivo', { p:{} }).then(function(r){ if(r && r.ok){ _incentivo = r; mostrar(r); } }).catch(function(){});
}
window.abrirMinhaConta = function(aba){ if(!lerSessao()) return abrirEntrar(); if(!estado.conta) return iniciar(true); abrirConta(aba); };
window.contaAba_ = function(a){
  estado.aba = a;
  var bs = document.querySelectorAll('#ctAbas button'); for(var i = 0; i < bs.length; i++) bs[i].classList.toggle('on', bs[i].getAttribute('data-aba') === a);
  desenharAba();
};
function corpo(html){ var c = $('ctCorpo'); if(c) c.innerHTML = html; }
async function desenharAba(){
  var a = estado.aba, ab = a;
  corpo('<p class="sub">Carregando...</p>');
  var html = '';
  if(a === 'pedidos') html = await abaPedidos();
  else if(a === 'cupons') html = await abaCupons();
  else if(a === 'fidelidade') html = await abaFidelidade();
  else if(a === 'enderecos') html = await abaEnderecos();
  else if(a === 'indique') html = await abaIndique();
  else if(a === 'jogos') html = (window.Jogos && Jogos.abaHtml) ? Jogos.abaHtml() : '<p class="sub">Os jogos não estão disponíveis agora. Feche e abra o app de novo.</p>';
  else { var pr = await rpc('api_conta_preferencias', { p:{} }); estado.pref = pr.ok ? (pr.preferencias || '') : null; html = abaDados(); }
  if(estado.aba === ab) corpo(html);
}
function erroAba(r){ return '<p class="sub">' + esc((r && r.message) || 'Não foi possível carregar agora.') + '</p><button type="button" class="ghost" onclick="contaAba_(\'' + estado.aba + '\')">Tentar de novo</button>'; }

/* Pedidos */
function rotuloStatus(s){ return ({ 'Recebido':'🕒 Recebido', 'Em preparo':'👨‍🍳 Em preparo', 'Pronta':'✅ Pronto', 'Saiu para entrega':'🛵 Saiu para entrega', 'Entregue':'✔️ Entregue', 'Retirada':'✔️ Retirado', 'Servida':'✔️ Servido', 'Suspenso':'⏸️ Em análise', 'Cancelado':'✖️ Cancelado' })[s] || s; }
async function abaPedidos(){
  var r = await rpc('api_conta_pedidos', {}); if(!r.ok) return erroAba(r);
  estado.pedidos = r.pedidos || [];
  if(!estado.pedidos.length) return '<p class="sub">Você ainda não fez pedidos com esta conta. Quando fizer, eles aparecem aqui — e dá para repetir com um toque.</p>';
  var aviso = estado.conta.vinculada ? '' : '<p class="sub fs-2xs">Pedidos de antes da conta aparecem aqui depois do seu primeiro pedido concluído com ela.</p>';
  return aviso + estado.pedidos.map(function(p, i){
    var itens = (p.itens || []).map(function(x){ return esc(x.quantidade) + '× ' + esc(x.descricao); }).join('<br>');
    var ativo = ['Recebido', 'Em preparo', 'Pronta', 'Saiu para entrega', 'Suspenso'].indexOf(p.status) !== -1;
    return '<div class="ct-card"><div class="ct-cab"><b>Pedido nº ' + esc(p.numero) + '</b><span>' + esc(rotuloStatus(p.status)) + '</span></div>' +
      '<div class="sub" style="margin:2px 0 6px;font-size:12px;">' + esc(dataBr(p.data)) + ' · ' + esc(p.tipo) + ' · <b>' + dinheiro(p.total) + '</b></div>' +
      '<div class="ct-itens">' + itens + '</div>' + blocoFeedback(p, i) +
      '<div class="ct-linha">' + (!p.feedback && p.status !== 'Cancelado' ? '<button type="button" class="ghost" onclick="contaFeedback_(' + i + ')">⭐ Feedback</button>' : '') + (ativo ? '<button type="button" class="ghost" onclick="contaAcompanhar_(' + i + ')">Acompanhar</button>' : '') + '<button type="button" class="small-gold" onclick="contaRepetir_(' + i + ')">🔁 Repetir pedido</button></div></div>';
  }).join('');
}
function estrelas(n){ n = Math.max(0, Math.min(5, Number(n) || 0)); return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); }
function blocoFeedback(p, i){
  var f = p.feedback;
  if(f){
    return '<div class="ct-fb"><div><b>Seu feedback</b> <span class="ct-estrelas">' + estrelas(f.nota) + '</span></div>' +
      (f.comentario ? '<div class="sub" style="font-size:12.5px;margin-top:2px;">' + esc(f.comentario) + '</div>' : '') +
      (f.resposta ? '<div class="ct-resp"><b>💬 Resposta do restaurante</b><br>' + esc(f.resposta) + '</div>' : '<div class="sub" style="font-size:12px;margin-top:2px;">Obrigado! O restaurante já recebeu.</div>') + '</div>';
  }
  return '';
}
var fbNota = 0;
window.contaFeedback_ = function(i){
  var p = (estado.pedidos || [])[i]; if(!p) return;
  fbNota = 0;
  janela('contaFeedbackModal', cab('Como foi o pedido nº ' + esc(p.numero) + '?', 'contaFeedbackModal') +
    '<div class="ct-estrelas-sel" id="ctEstrelasSel">' + [1, 2, 3, 4, 5].map(function(n){ return '<button type="button" data-n="' + n + '" aria-label="' + n + ' estrela' + (n > 1 ? 's' : '') + '" onclick="contaNota_(' + n + ')">★</button>'; }).join('') + '</div>' +
    '<label for="ctFbTxt">Comentário (opcional)</label><textarea id="ctFbTxt" rows="4" maxlength="500" placeholder="Conte como foi: elogio, sugestão ou problema"></textarea>' +
    '<div class="msg" id="ctFbMsg"></div>' +
    '<div class="ct-linha"><button type="button" class="ghost" onclick="contaFechar_(\'contaFeedbackModal\')">Voltar</button><button type="button" class="small-gold" id="ctFbOk" onclick="contaEnviarFeedback_(' + i + ')">Enviar</button></div>');
};
window.contaNota_ = function(n){
  fbNota = n;
  var bs = document.querySelectorAll('#ctEstrelasSel button'); for(var k = 0; k < bs.length; k++) bs[k].classList.toggle('on', Number(bs[k].getAttribute('data-n')) <= n);
};
window.contaEnviarFeedback_ = async function(i){
  var p = (estado.pedidos || [])[i], msg = $('ctFbMsg'), ok = $('ctFbOk'); if(!p) return;
  if(!fbNota){ if(msg){ msg.className = 'msg warn'; msg.textContent = 'Toque nas estrelas para dar uma nota.'; } return; }
  if(ok){ ok.disabled = true; ok.textContent = 'Enviando...'; }
  var r = await rpc('api_add_feedback', { p:{ vendaId: p.id, nota: fbNota, comentario: ($('ctFbTxt') || {}).value || '', origem: 'formulario' } });
  if(r && r.ok){ fechar('contaFeedbackModal'); toast('Obrigado pelo feedback!'); if(estado.aba === 'pedidos') desenharAba(); return; }
  if(msg){ msg.className = 'msg warn'; msg.textContent = (r && r.message) || 'Não foi possível enviar agora.'; }
  if(ok){ ok.disabled = false; ok.textContent = 'Enviar'; }
};
window.contaAcompanhar_ = function(i){
  var p = (estado.pedidos || [])[i]; if(!p) return;
  fechar('contaModal');
  if(typeof salvarPedidoNoHistoricoCliente === 'function') salvarPedidoNoHistoricoCliente(String(p.id).slice(-8), (estado.conta && estado.conta.nome) || '', p.numero);
  if(typeof abrirAcompanhamentoPedido === 'function') abrirAcompanhamentoPedido();
  if(typeof abrirStatusPedido === 'function') abrirStatusPedido(String(p.id).slice(-8));
};
window.contaRepetir_ = function(i){
  var p = (estado.pedidos || [])[i]; if(!p || typeof cdDados === 'undefined' || !cdDados || !cdDados.produtos){ toast('O cardápio ainda está carregando. Tente de novo em instantes.'); return; }
  var ok = 0, falta = 0;
  (p.itens || []).forEach(function(x){
    var tipo = x.comboId ? 'combo' : 'produto', id = x.comboId || x.produtoId; if(!id){ falta++; return; }
    var lista = tipo === 'produto' ? cdDados.produtos : (cdDados.combos || []);
    var item = lista.find(function(z){ return z.id === id; });
    var preco = item ? cdPrecoDe(tipo, id) : null;
    if(!item || preco == null || (typeof cdEsgotado_ === 'function' && cdEsgotado_(tipo, id))){ falta++; return; }
    var ads = (x.adicionaisIds || []).map(function(aid){ return (cdDados.adicionais || []).find(function(a){ return a.id === aid; }); }).filter(Boolean).map(function(a){ return { id:a.id, nome:a.nome, preco:a.preco }; });
    var qtd = Math.max(1, Math.min(Number(x.quantidade) || 1, (typeof QTD_MAX_ITEM_ !== 'undefined' ? QTD_MAX_ITEM_ : 50)));
    cdCarrinho.push({ tipo: tipo, id: id, nome: item.nome, precoBase: preco, qtd: qtd, adicionais: ads, obs: '' });
    ok++;
  });
  if(!ok){ toast('Os itens deste pedido não estão disponíveis agora.'); return; }
  fechar('contaModal');
  if(typeof atualizarFabCarrinho === 'function') atualizarFabCarrinho();
  if(falta) toast(falta + ' item(ns) deste pedido não estão mais disponíveis e ficaram de fora. Confira o carrinho.');
  if(typeof abrirCarrinhoPublico === 'function') abrirCarrinhoPublico();
};

/* Cupons */
function textoBeneficio(c){
  var t = c.tipo === 'percentual' ? (Number(c.valor) + '% de desconto') : c.tipo === 'fixo' ? (dinheiro(c.valor) + ' de desconto') : c.tipo === 'frete' ? 'Frete grátis' : c.tipo === 'combo' ? ('Combo por ' + dinheiro(c.valor)) : 'Desconto progressivo';
  if(Number(c.minimo) > 0) t += ' · pedido a partir de ' + dinheiro(c.minimo);
  if(c.formasNomes) t += ' · só pagando em ' + c.formasNomes;
  return t;
}
async function carregarCupons(){ var r = await rpc('api_conta_cupons', {}); if(r.ok) estado.cupons = r; return r; }
async function abaCupons(){
  var r = await carregarCupons(); if(!r.ok) return erroAba(r);
  function card(c, rec){
    return '<div class="ct-card"><div class="ct-cab"><b>' + esc(c.nome) + '</b><span class="ct-cod">' + esc(c.codigo) + '</span></div><div class="sub" style="margin:2px 0 4px;font-size:12.5px;">' + esc(textoBeneficio(c)) + '</div>' +
      (c.mensagem ? '<div class="ct-msg">' + esc(c.mensagem) + '</div>' : '') +
      (c.validoAte ? '<div class="sub fs-2xs">' + (rec ? 'Vale até ' : 'Até ') + esc(dataCurta(c.validoAte)) + '</div>' : '') +
      '<div class="ct-linha"><button type="button" class="small-gold" onclick="contaUsarCupom_(\'' + esc(c.codigo) + '\')">Usar no pedido</button></div></div>';
  }
  var h = '<h3 class="ct-h3">Cupons que você recebeu</h3>' + (r.recebidos.length ? r.recebidos.map(function(c){ return card(c, true); }).join('') : '<p class="sub">Nenhum por enquanto.</p>');
  if(r.disponiveis.length) h += '<h3 class="ct-h3">Promoções para você</h3>' + r.disponiveis.map(function(c){ return card(c, false); }).join('');
  return h;
}
window.contaUsarCupom_ = function(cod){
  fechar('contaModal'); estado.cupomPendente = cod;
  if(typeof cdCarrinho !== 'undefined' && cdCarrinho.length){ if(typeof abrirCarrinhoPublico === 'function') abrirCarrinhoPublico(); }
  else toast('Escolha seus itens no cardápio. Quando abrir o carrinho, o cupom ' + cod + ' será aplicado para você.');
};

/* Fidelidade */
async function abaFidelidade(){
  var r = await rpc('api_conta_fidelidade', {}); if(!r.ok) return erroAba(r);
  if(!r.vinculada) return '<p class="sub">Seu cartão fidelidade aparece aqui depois do seu <b>primeiro pedido concluído</b> com esta conta (entregue ou retirado).</p>';
  var n = Math.max(0, Math.min(Number(r.carimbos) || 0, FID_META)), bolas = '';
  for(var i = 1; i <= FID_META; i++) bolas += '<div class="hole' + (i <= n ? ' filled' : '') + '" role="img" aria-label="' + (i <= n ? 'Marca ' + i + ' carimbada' : 'Marca ' + i + ' vazia') + '"></div>';
  var b = await carregarBrindes(), prem = '';
  if(n >= FID_META){
    if(b.ok && (b.produtosFid || []).length){
      prem = '<div class="ct-brinde"><b>🎉 Cartão completo! Escolha o seu prêmio:</b><p class="sub" style="font-size:12px;margin:4px 0 6px;">Vai junto com um pedido ou sozinho. O prêmio sai grátis; a entrega, se for entrega, é cobrada.</p>' + linhasProdutos('Fidelidade', '', b.produtosFid) + '</div>';
    }else prem = '<p class="sub" style="margin:8px 0 0;">🎉 Cartão completo! Peça seu prêmio ao restaurante no próximo pedido.</p>';
  }
  return '<div class="ct-fid"><div class="ct-cab"><b>Cartão fidelidade</b><span>' + n + ' de ' + FID_META + ' marcas</span></div><div class="punch">' + bolas + '</div>' +
    (n < FID_META ? '<p class="sub" style="margin:2px 0 0;font-size:12.5px;">Faltam <b>' + (FID_META - n) + '</b> para o seu prêmio.</p>' : '') + prem +
    (Number(r.premios) > 0 ? '<p class="sub fs-xs">Prêmios já resgatados: ' + esc(r.premios) + '</p>' : '') + '</div>';
}

/* Endereços */
async function abaEnderecos(){
  var r = await rpc('api_conta_enderecos', {}); if(!r.ok) return erroAba(r);
  estado.enderecos = r.enderecos || [];
  var h = estado.enderecos.length ? estado.enderecos.map(function(e, i){
    return '<div class="ct-card"><div class="ct-cab"><b>' + esc(e.apelido || 'Endereço') + '</b></div><div class="sub" style="margin:2px 0 6px;font-size:12.5px;">' + esc([e.endereco + (e.numero ? ', nº ' + e.numero : ''), e.cidade, e.complemento, e.referencia ? 'Ref.: ' + e.referencia : ''].filter(Boolean).join(' — ')) + '</div>' +
      '<div class="ct-linha"><button type="button" class="ghost" onclick="contaEditarEnd_(' + i + ')">Editar</button><button type="button" class="ghost" onclick="contaExcluirEnd_(' + i + ')">Excluir</button></div></div>';
  }).join('') : '<p class="sub">Nenhum endereço guardado.</p>';
  if(estado.enderecos.length < 5) h += '<button type="button" class="small-gold mt-2" onclick="contaEditarEnd_(-1)">+ Novo endereço</button>';
  return h;
}
window.contaEditarEnd_ = function(i){
  var e = i >= 0 ? (estado.enderecos || [])[i] : null; e = e || {};
  function campo(id, rot, val, ph, ml){ return '<label for="' + id + '">' + rot + '</label><input type="text" id="' + id + '" value="' + esc(val || '') + '" placeholder="' + esc(ph || '') + '" maxlength="' + (ml || 100) + '">'; }
  corpo('<h3 class="ct-h3">' + (i >= 0 ? 'Editar endereço' : 'Novo endereço') + '</h3>' + campo('ctEApelido', 'Nome (ex.: Casa, Trabalho)', e.apelido, 'Casa', 30) + campo('ctEEnd', 'Rua e bairro *', e.endereco, 'Rua e bairro', 200) +
    '<div class="row2"><div>' + campo('ctENum', 'Número *', e.numero, '123 ou s/n', 20) + '</div><div>' + campo('ctECid', 'Cidade *', e.cidade, 'Cidade', 80) + '</div></div>' + campo('ctECompl', 'Complemento', e.complemento, 'Apto, bloco...', 100) + campo('ctERef', 'Ponto de referência', e.referencia, 'Referência', 150) +
    '<div id="ctEMsg" class="msg"></div><div class="ct-linha"><button type="button" class="ghost" onclick="contaAba_(\'enderecos\')">Cancelar</button><button type="button" class="small-gold" onclick="contaSalvarEnd_(' + (e.id ? '\'' + esc(e.id) + '\'' : '\'\'') + ')">Salvar</button></div>');
};
window.contaSalvarEnd_ = async function(id){
  var msg = $('ctEMsg'), v = function(x){ return ($(x).value || '').trim(); };
  if(!v('ctEEnd')){ msg.textContent = 'Informe a rua e o bairro.'; msg.className = 'msg warn'; return; }
  if(!v('ctENum')){ msg.textContent = 'Informe o número (ou "s/n").'; msg.className = 'msg warn'; return; }
  if(!v('ctECid')){ msg.textContent = 'Informe a cidade.'; msg.className = 'msg warn'; return; }
  var r = await rpc('api_conta_salvar_endereco', { p:{ id: id || null, apelido: v('ctEApelido'), endereco: v('ctEEnd'), numero: v('ctENum'), cidade: v('ctECid'), complemento: v('ctECompl'), referencia: v('ctERef') } });
  if(!r.ok){ msg.textContent = r.message || 'Não foi possível salvar.'; msg.className = 'msg warn'; return; }
  estado.enderecos = null; contaAba_('enderecos');
};
window.contaExcluirEnd_ = async function(i){
  var e = (estado.enderecos || [])[i]; if(!e) return;
  if(!(await confirmar('Excluir endereço', 'Excluir o endereço “' + esc(e.apelido || e.endereco) + '”?', 'Excluir', true))) return;
  var r = await rpc('api_conta_excluir_endereco', { p:{ id: e.id } });
  if(!r.ok) toast(r.message || 'Não foi possível excluir agora.');
  estado.enderecos = null; contaAba_('enderecos');
};

/* Indique e ganhe */
function linkIndicacao(){ return location.origin + location.pathname + '?ind=' + encodeURIComponent((estado.conta && estado.conta.codigoIndicacao) || ''); }
function textoRecompensa(c){ if(!c) return ''; return textoBeneficio({ tipo:c.tipo, valor:c.valor, minimo:c.minimo }); }
async function abaIndique(){
  var r = estado.cupons && estado.cupons.ok ? estado.cupons : await carregarCupons(); if(!r.ok) return erroAba(r);
  var b = await carregarBrindes();
  var ind = r.indicacao || {}, temPremio = b.ok && (b.produtosInd || []).length > 0;
  if(!temPremio && !ind.indicador && !ind.indicado) return '<p class="sub">O programa “Indique e ganhe” não está ativo agora. Fique de olho — quando começar, seu link aparece aqui.</p>';
  var l = linkIndicacao(), h = '';
  h += '<div class="ct-card"><div class="ct-cab"><b>Indique e ganhe</b></div><p class="sub" style="font-size:13px;margin:4px 0 8px;">Mande seu link para um amigo. Quando ele fizer o <b>primeiro pedido</b> com a conta dele e o pedido for concluído, ' +
    ((ind.indicador || temPremio) ? 'você ganha ' : '') + (ind.indicador ? '<b>' + esc(textoRecompensa(ind.indicador)) + '</b>' + (temPremio ? ' e ' : '') : '') + (temPremio ? '<b>1 brinde à sua escolha</b>' : '') + (ind.indicado ? ((ind.indicador || temPremio) ? ' e ' : '') + 'ele ganha <b>' + esc(textoRecompensa(ind.indicado)) + '</b>' : '') + '.</p>' +
    '<input type="text" readonly id="ctLinkInd" value="' + esc(l) + '" onclick="this.select()">' +
    '<div class="ct-linha"><button type="button" class="ghost" onclick="contaCopiarLink_()">Copiar link</button><button type="button" class="small-gold" onclick="contaZapLink_()">Enviar no WhatsApp</button></div></div>';
  if(temPremio && (b.indicacao || []).length){
    h += '<h3 class="ct-h3">Seus brindes de indicação</h3>' + b.indicacao.map(function(x, k){
      return '<div class="ct-brinde"><b>🎁 Brinde ' + (k + 1) + '</b> <span class="sub fs-2xs">desde ' + esc(dataCurta(x.desde)) + '</span><p class="sub" style="font-size:12px;margin:4px 0 6px;">Vai junto com um pedido ou sozinho. Sai grátis; a entrega, se houver, é cobrada.</p>' + linhasProdutos('Indicação', x.id, b.produtosInd) + '</div>';
    }).join('');
  }
  return h;
}
window.contaCopiarLink_ = function(){
  var l = linkIndicacao();
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(l).then(function(){ toast('Link copiado!'); }, function(){ var i = $('ctLinkInd'); if(i){ i.select(); } });
  else { var i = $('ctLinkInd'); if(i){ i.select(); try{ document.execCommand('copy'); toast('Link copiado!'); }catch(e){} } }
};
window.contaZapLink_ = function(){
  var nome = ''; try{ nome = (document.querySelector('#cdInfoRestaurante b') || {}).textContent || ''; }catch(e){}
  var t = 'Pede no ' + NOME_RESTAURANTE_ + ' por este link e a gente se ajuda: ' + linkIndicacao();
  window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener');
};

/* Meus dados / privacidade */
function abaDados(){
  var c = estado.conta || {};
  return '<label for="ctDNome">Nome</label><input type="text" id="ctDNome" maxlength="80" value="' + esc(c.nome || '') + '">' +
    '<label for="ctDNasc">Data de nascimento</label><input type="date" id="ctDNasc" value="' + esc(c.nascimento || '') + '"' + (c.nascimentoEditavel || !c.nascimento ? '' : ' disabled') + '>' +
    (c.nascimento && !c.nascimentoEditavel ? '<p class="sub" style="font-size:12px;margin:2px 0 6px;">Só pode ser alterada uma vez a cada 6 meses.</p>' : '') +
    '<label>Telefone</label><input type="text" value="' + esc(c.telefone ? foneBonito(c.telefone) : 'Aparece depois do seu primeiro pedido concluído') + '" disabled>' +
    '<label class="ct-check"><input type="checkbox" id="ctDPromo"' + (c.promoOk ? ' checked' : '') + '> <span>Quero receber novidades e promoções</span></label>' +
    '<div id="ctDMsg" class="msg"></div><button type="button" class="primary" onclick="contaSalvarDados_()">Salvar</button>' +
    (estado.pref === null ? '' : '<h3 class="ct-h3 mt-4">Minhas preferências</h3><p class="sub" style="font-size:12.5px;margin:2px 0 6px;">Vão na comanda de todo pedido seu (ex.: sem cebola, alergia a amendoim).</p>' +
      '<input type="text" id="ctDPref" maxlength="300" value="' + esc(estado.pref || '') + '" placeholder="Ex.: sem cebola, alérgico a amendoim">' +
      '<div id="ctPMsg" class="msg"></div><button type="button" class="small-gold" onclick="contaSalvarPref_()">Salvar preferências</button>') +
    '<h3 class="ct-h3 mt-4">Privacidade</h3>' +
    '<div class="ct-linha ct-col"><button type="button" class="ghost" onclick="abrirAvisoPrivacidade()">📄 Ler o Aviso de Privacidade</button>' +
    '<button type="button" class="ghost" onclick="contaBaixarDados_()">⬇️ Baixar uma cópia dos meus dados</button>' +
    '<button type="button" class="ghost" onclick="contaApagar_()">🗑️ Apagar minha conta</button>' +
    '<button type="button" class="ghost" onclick="contaSairBotao_()">↪️ Sair da conta</button></div>';
}
window.contaSalvarDados_ = async function(){
  var msg = $('ctDMsg'), nasc = $('ctDNasc');
  var r = await rpc('api_conta_salvar', { p:{ nome: ($('ctDNome').value || '').trim(), nascimento: nasc && !nasc.disabled ? (nasc.value || '') : (estado.conta.nascimento || ''), promo: $('ctDPromo').checked } });
  if(!r.ok){ msg.textContent = r.message || 'Não foi possível salvar.'; msg.className = 'msg warn'; return; }
  msg.textContent = 'Dados salvos.'; msg.className = 'msg ok';
  var ini = await rpc('api_conta_iniciar', { p:{} }); if(ini.ok){ estado.conta = ini.conta; atualizarBotao(); }
};
window.contaSalvarPref_ = async function(){
  var msg = $('ctPMsg');
  var r = await rpc('api_conta_preferencias', { p:{ texto: ($('ctDPref').value || '').trim() } });
  if(!r.ok){ msg.textContent = r.message || 'Não foi possível salvar.'; msg.className = 'msg warn'; return; }
  estado.pref = r.preferencias || ''; msg.textContent = 'Preferências salvas.'; msg.className = 'msg ok';
};
window.contaSairBotao_ = function(){ sair(false); };
window.contaBaixarDados_ = async function(){
  var r = await rpc('api_conta_exportar', {}); if(!r.ok){ toast(r.message || 'Não foi possível gerar agora.'); return; }
  try{
    var blob = new Blob([JSON.stringify(r, null, 2)], { type:'application/json' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'meus-dados.json'; document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }catch(e){ toast('Não foi possível baixar neste aparelho.'); }
};
window.contaApagar_ = async function(){
  var ok = await confirmar('Apagar minha conta', 'Isso apaga a sua conta, seus endereços e seus cupons <b>para sempre</b>. Não dá para desfazer.',
    'Apagar tudo', true, '<label class="ct-check"><input type="checkbox" id="ctApagarHist" checked> <span>Também tornar anônimo o meu histórico de pedidos e o meu cadastro no restaurante (recomendado).</span></label>');
  if(!ok) return;
  var anon = true; try{ anon = !!($('ctApagarHist') || { checked:true }).checked; }catch(e){}
  var r = await rpc('api_conta_apagar', { p:{ anonimizar: anon } });
  if(!r.ok){ toast(r.message || 'Não foi possível apagar agora. Tente de novo ou fale com o restaurante.'); return; }
  gravarSessao(null); estado.conta = null; fecharTodos(); atualizarBotao(); limparCheckout();
  toast('Sua conta foi apagada.');
};

/* ---------- ganchos do carrinho (checkout) ---------- */
function montarBrindesCheckout(){
  var f = $('cdCheckoutForm'), b = estado.brindes; if(!f || !b || !b.ok || $('cdContaBrindes')) return;
  var linhas = [];
  function opcoes(tipo, id, lista){ var chave = tipo + ':' + (id || ''), at = estado.escolhas.filter(function(e){ return e.chave === chave; })[0]; return '<select data-chave="' + esc(chave) + '" onchange="contaSelBrinde_(\'' + tipo + '\',\'' + esc(id || '') + '\',this.value)"><option value="">Não usar agora</option>' + lista.map(function(p){ return '<option value="' + esc(p.id) + '"' + (at && at.produtoId === p.id ? ' selected' : '') + '>' + esc(p.nome) + '</option>'; }).join('') + '</select>'; }
  if(b.fidelidadeDisponivel && (b.produtosFid || []).length) linhas.push('<label>🎁 Cartão fidelidade completo — escolha seu prêmio</label>' + opcoes('Fidelidade', '', b.produtosFid));
  if((b.produtosInd || []).length) (b.indicacao || []).forEach(function(x, k){ linhas.push('<label>🎁 Brinde de indicação' + ((b.indicacao || []).length > 1 ? ' ' + (k + 1) : '') + ' — escolha seu prêmio</label>' + opcoes('Indicação', x.id, b.produtosInd)); });
  if(!linhas.length) return;
  var d = document.createElement('div'); d.id = 'cdContaBrindes'; d.className = 'cd-hide-mesa';
  d.innerHTML = linhas.join('') + '<p class="sub" style="font-size:12px;margin:6px 0 0;">O brinde sai grátis e a entrega continua sendo cobrada.</p>';
  f.insertBefore(d, f.firstChild);
}
function limparCheckout(){ var z = $('cdContaBrindes'); if(z) z.remove(); var a = $('cdContaChamada'); if(a) a.remove(); var b = $('cdContaCupons'); if(b) b.remove(); var c = $('cdContaEndBox'); if(c) c.remove(); var d = $('cdContaPref'); if(d) d.remove(); }
window.contaPreencherCheckout_ = async function(){
  limparCheckout();
  var form = $('cdCheckoutForm'); if(!form) return;
  if(!estado.conta){
    if(lerSessao()) return;
    var d = document.createElement('div'); d.id = 'cdContaChamada'; d.className = 'ct-chamada cd-hide-mesa';
    d.innerHTML = '<span>' + textoConvite_(false) + '<small style="display:block;color:var(--muted);margin-top:2px;">Leva 5 segundos e o seu carrinho fica guardado. Pedir sem conta continua valendo.</small></span><button type="button" class="small-gold" onclick="contaGoogle_(\'carrinho\')">Entrar com Google</button>';
    form.insertBefore(d, form.firstChild);
    return;
  }
  var nm = $('cdNome'), tl = $('cdTelefone');
  if(nm && !nm.value) nm.value = estado.conta.nome || '';
  if(tl && !tl.value && estado.conta.telefone) tl.value = foneBonito(estado.conta.telefone);
  var cupomPend = estado.cupomPendente; estado.cupomPendente = '';
  var [rc, re] = await Promise.all([carregarCupons(), rpc('api_conta_enderecos', {})]);
  if(re.ok) estado.enderecos = re.enderecos || [];
  var box = $('cdEnderecoBox');
  if(box && estado.enderecos && estado.enderecos.length && !$('cdContaEndBox')){
    var s = document.createElement('div'); s.id = 'cdContaEndBox';
    s.innerHTML = '<label for="cdContaEndSel">📍 Meus endereços</label><select id="cdContaEndSel" onchange="contaUsarEndereco_(this.value)"><option value="">Escolher um endereço salvo…</option>' +
      estado.enderecos.map(function(e, i){ return '<option value="' + i + '">' + esc((e.apelido ? e.apelido + ' — ' : '') + e.endereco + (e.numero ? ', ' + e.numero : '')) + '</option>'; }).join('') + '</select>';
    box.insertBefore(s, box.firstChild);
  }
  var pr = await rpc('api_conta_preferencias', { p:{} });
  estado.pref = pr.ok ? (pr.preferencias || '') : null;
  var ob = $('cdObservacoes');
  if(ob && estado.pref !== null && !$('cdContaPref')){
    var pf = document.createElement('div'); pf.id = 'cdContaPref'; pf.className = 'ct-chamada cd-hide-mesa';
    pf.innerHTML = estado.pref
      ? '<span>⚠️ Suas preferências vão junto no pedido: <b>' + esc(estado.pref) + '</b></span><button type="button" class="small-gold" onclick="abrirMinhaConta(\'dados\')">Editar</button>'
      : '<span>Quer guardar preferências, como <b>sem cebola</b> ou alergias, para todo pedido?</span><button type="button" class="small-gold" onclick="abrirMinhaConta(\'dados\')">Guardar</button>';
    ob.parentNode.insertBefore(pf, ob.previousElementSibling && ob.previousElementSibling.tagName === 'LABEL' ? ob.previousElementSibling : ob);
  }
  await carregarBrindes();
  montarBrindesCheckout();
  var cup = rc.ok ? (rc.recebidos || []) : [];
  var linhaCupom = document.querySelector('#cdCarrinhoModal .row2.cd-hide-mesa');
  if(cup.length && linhaCupom && !$('cdContaCupons')){
    var w = document.createElement('div'); w.id = 'cdContaCupons'; w.className = 'ct-chips cd-hide-mesa';
    w.innerHTML = '<span class="sub fs-2xs">Seus cupons:</span> ' + cup.map(function(c){ return '<button type="button" class="ct-chip" onclick="contaAplicarCupom_(\'' + esc(c.codigo) + '\')">🎟️ ' + esc(c.codigo) + '</button>'; }).join('');
    linhaCupom.parentNode.insertBefore(w, linhaCupom);
  }
  if(cupomPend) window.contaAplicarCupom_(cupomPend);
};
window.contaUsarEndereco_ = function(i){
  var e = (estado.enderecos || [])[Number(i)]; if(!e) return;
  var set = function(id, v){ var el = $(id); if(el) el.value = v || ''; };
  set('cdEndereco', e.endereco); set('cdNumero', e.numero); set('cdCidade', e.cidade); set('cdComplemento', e.complemento); set('cdReferencia', e.referencia);
};
window.contaAplicarCupom_ = function(cod){
  var inp = $('cdCupom'); if(!inp) return;
  inp.value = cod;
  if(typeof aplicarCupomPublicoUI === 'function') aplicarCupomPublicoUI();
};

/* ---------- ?ind=CODIGO (indicação) e ?privacidade (abre o aviso) ---------- */
function lerLinks(){
  try{
    var q = new URLSearchParams(location.search), mudou = false;
    var ind = (q.get('ind') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    if(ind){ try{ localStorage.setItem(IND_KEY, ind); }catch(e){} q.delete('ind'); mudou = true; }
    var priv = q.has('privacidade'); if(priv){ q.delete('privacidade'); mudou = true; }
    if(mudou){ var s = q.toString(); try{ history.replaceState(null, '', location.pathname + (s ? '?' + s : '') + location.hash); }catch(e){} }
    if(priv) setTimeout(function(){ window.abrirAvisoPrivacidade(); }, 700);
    if(ind && !lerSessao()) setTimeout(function(){ if(!$('cardapioPublico').classList.contains('hidden')) abrirEntrar(); }, 1500);
  }catch(e){}
}

/* ---------- retorno do Google (token no endereço) ---------- */
var voltouDoGoogle = false;
(function(){
  try{
    var h = location.hash || '';
    if(h.indexOf('access_token=') === -1 && h.indexOf('error_description=') === -1) return;
    var p = new URLSearchParams(h.replace(/^#/, ''));
    if(p.get('access_token') && p.get('refresh_token')){ guardarTokens({ access_token:p.get('access_token'), refresh_token:p.get('refresh_token'), expires_in:p.get('expires_in') }); voltouDoGoogle = true; }
    else if(p.get('error_description')){ setTimeout(function(){ toast('Não foi possível entrar com o Google: ' + p.get('error_description').replace(/\+/g, ' ')); }, 800); }
    try{ history.replaceState(null, '', location.pathname + location.search); }catch(e){}
  }catch(e){}
})();

function aoCarregar(){
  lerLinks();
  atualizarBotao();
  if(lerSessao()){
    var equipe = false; try{ equipe = !!localStorage.getItem(SESSAO_KEY); }catch(e){}
    if(!equipe) setTimeout(function(){ iniciar(false); }, voltouDoGoogle ? 300 : 1200);
  }
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aoCarregar); else aoCarregar();
})();
