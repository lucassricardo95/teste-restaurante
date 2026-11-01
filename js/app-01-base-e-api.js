try{ document.addEventListener('gesturestart', function(e){ e.preventDefault(); }); }catch(e){}

/* =========================================================
   PLANILHAS (opcionais): os endereços vêm de config-restaurante.js
   ========================================================= */
const API_URL = (window.RESTAURANTE && window.RESTAURANTE.apiUrl) || "";   // planilha principal (opcional): vem de config-restaurante.js
const CONTINGENCIA_API_URL = (window.RESTAURANTE && window.RESTAURANTE.contingenciaUrl) || "";   // planilha de contingência (opcional)

/* ===================== VERSÃO DO APP ===================== */
const APP_VERSAO = '1.27';
const APP_ATUALIZADO_EM = '01/11/2026';
window.APP_VERSAO = APP_VERSAO;

/* ===================== NOVIDADES POR PERFIL =====================
   Rotina de cada publicação:
     1. Trocar APP_VERSAO e APP_ATUALIZADO_EM acima.
     2. Adicionar UMA entrada nova no TOPO de cada perfil afetado (mesmo 'v' e 'em').
     3. Não mexer nas entradas antigas — viram "Versões anteriores" sozinhas.
   A seção "🆕 O que mudou" do manual é gerada daqui. */
const APP_NOVIDADES = {
 "Admin": [
  {
   "v": "1.27",
   "em": "01/11/2026",
   "itens": [
    "Sistema \u2192 Aparência: troque o nome, o slogan, o nome do assistente, as cores (paleta, sem códigos) e as logos do seu restaurante. A mudança vale para todos os aparelhos e pede a sua senha.",
    "Telas de módulos que o seu restaurante não usa (iFood, ponto, eventos, mesas) ficam escondidas do Administrador."
   ]
  },
  {
   "v": "1.26",
   "em": "01/11/2026",
   "itens": [
    "Promoções e cupons · Cartão novo \"🏷️ Preço por dia da semana\": escolha um produto ou combo, os dias, o horário (opcional) e o preço fixo ou % de desconto; marque se aceita cupom. No cardápio aparece o preço antigo riscado e a etiqueta. Vale só no cardápio online (entrega e retirada), não em mesa, balcão nem iFood. Pedido entre 0h e 5h59 conta na noite anterior.",
    "Promoções e cupons · Cartão novo \"🎁 Compre e ganhe\": a partir de R$ X em produtos (sem a taxa de entrega), o cliente ganha o brinde que você escolher. O carrinho mostra \"Faltam R$ X para ganhar…\" e o brinde entra no pedido a R$ 0, com custo e baixa no estoque.",
    "Promoções e cupons · Cartão novo \"🧾 Bilhete na sacola\": sai impresso junto da comanda dos pedidos do iFood (ou de todas as entregas) com título, texto, QR Code do cardápio e um cupom. Você escreve tudo, vê a prévia, testa a impressão e liga ou desliga.",
    "Tudo isso é configurado por você; excluir uma promoção pede a senha."
   ]
  }
 ],
 "Operador": [
  {
   "v": "1.24",
   "em": "01/11/2026",
   "itens": [
    "Cardápio hoje · Parte nova \"🧾 No finalizar\": mostra quantos clientes tocaram em \"Enviar pedido\" e o que segurou o pedido (campo faltando, troco, login, cardápio fechado ou erro).",
    "Cardápio do cliente · Tocar em qualquer parte do cartão do produto já abre o item."
   ]
  }
 ],
 "Garçom": [
  {
   "v": "1.15",
   "em": "25/10/2026",
   "itens": [
    "Quando algo dá errado (sem internet, servidor com problema, botão que travou), aparece um aviso vermelho dizendo o que aconteceu e o que fazer. Nada falha calado."
   ]
  }
 ],
 "Cozinha": [
  {
   "v": "1.15",
   "em": "25/10/2026",
   "itens": [
    "Pedido do iFood esperando aceite toca a vinheta do iFood a cada 30 s até ser aceito, com botão \"🔇 Silenciar\" neste aparelho. Os outros pedidos continuam com o som de sempre.",
    "Quando algo dá errado (sem internet, servidor com problema, botão que travou), aparece um aviso vermelho dizendo o que aconteceu e o que fazer. Nada falha calado."
   ]
  }
 ],
 "Entregador": [
  {
   "v": "1.15",
   "em": "25/10/2026",
   "itens": [
    "iFood: quando o iFood pedir o código de entrega, aparece \"🔐 O iFood precisa de um código\" no topo de Entregas. Peça o código ao cliente, digite e toque em Enviar.",
    "Na entrega do iFood, a mensagem e a comanda trazem o telefone 0800 do iFood com o CÓDIGO LOCALIZADOR do cliente, para você ligar se precisar.",
    "Quando algo dá errado (sem internet, servidor com problema, botão que travou), aparece um aviso vermelho dizendo o que aconteceu e o que fazer. Nada falha calado."
   ]
  }
 ],
 "Cliente": [
  {
   "v": "1.26",
   "em": "01/11/2026",
   "itens": [
    "Alguns lanches têm preço especial em certos dias: o preço antigo aparece riscado e a etiqueta mostra a promoção.",
    "Em algumas compras, ao chegar a um valor você ganha um brinde. O carrinho mostra quanto falta."
   ]
  }
 ]
};
const CONTINGENCIA_CHAVE_PUBLICA = "txbpub-7be6640269f54d5db1bff1a474d76a417758957a"; // so permite enviar pedido validado e ler o catalogo publico (sem custos/clientes)
const CONTINGENCIA_CHAVE_KEY = 'txbContChaveInterna'; // chave interna (clientes): guardada so depois do login, apagada ao sair
let modoContingenciaAtivo = false;

const CACHE_KEY = 'texasBurgerCache_v2';
/* SEGURANÇA: escape único para todo texto vindo de cliente/planilha antes de entrar em innerHTML */
function escH(s){ return String(s==null?'':s).replace(/[&<>"'`]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c])); }
const SESSAO_KEY = 'texasBurgerSessao_v2';

let currentUser = null; // {login, nivel}
let clientes = [], promocoes = [], cupons = [], eventos = [], indicacoes = [], fidelidadeClientes = [];
let formasPagamento = [], categorias = [];
let produtos = [], produtoPrecos = [], produtoIngredientes = [], estoque = [], combos = [], comboPrecos = [], comboItens = [];
let adicionais = [], produtoAdicionais = [], feedbacks = [], ocorrencias = [], configCardapio = { kicker:'', frase:'' }, movimentacoesEstoque = [], maisPedidos = [], mesas = [];
let vendas = [], itensVenda = [], pagamentosVenda = [], despesas = [], sangrias = [];
let categoriasDespesa = [], despesasRecorrentes = [], ajustesPosVenda = [];
let configEstoque = { bloquear:false };
let configEntrega = { taxaPadrao:0, ajudaDiaria:0 }, fechamentosEntrega = [], entregasFechadas = [];
let configNotificacoes = null; // ITENS 64/65: {evento:{ativo, perfis[]}} vindo do backend (null = usa o padrão)
let sistemaAlertas_ = { backup:'', drive:'', driveCont:'', copiaBackup:'' }; // preenchido quando o Admin abre Armazenamento
let metas = { mensal: 0, diaria: 0 }, sessaoCaixa = null, historicoCaixa = [];
let usuarios = [], logRecentes = [];

let modalClienteId = null;
let modoCliente = 'com';
let tipoEntregaAtual = 'Retirada';
let modoItem = 'produto';
let formaPrecoAtual = null; // ID da forma de pagamento usada pra precificar os itens do carrinho
let clienteVendaSelecionado = null;
let clienteMesaCarregadoDe_ = null; // id da mesa de onde o cliente foi mantido após lançar (null = cliente escolhido na mão)
let carrinhoAtual = [];
let pagamentosAtuais = [];
let cancelarContexto = null;
let calcExpr = '';
let ultimoRelatorioTexto = '';
let ingredientesProdutoNovo = [];
let ingredientesProdutoEdicao = [];
let itensComboNovo = [];
let itensComboEdicao = [];
let produtoEditandoId = null;
let comboEditandoId = null;
let vendaEditandoId = null;
let itensEdicaoVenda = [];
let senhaAdminCallback = null;

function normTel(t){ return (t===undefined||t===null?'':t).toString().replace(/\D/g,''); }
/* v1.15 — chave do cliente. Cliente do iFood não tem telefone (o iFood manda um 0800 igual para todos):
   ele é identificado pelo cadastro ("ifood:<id do cliente>"). Os demais continuam pelo telefone. */
function chaveCliente_(c){ return c && c.ifoodId && !normTel(c.telefone) ? 'ifood:' + c.id : normTel(c && c.telefone); }
function chaveVendaCliente_(v){
  if(v && v.canal === 'iFood') return v.clienteId ? 'ifood:' + v.clienteId : '';
  return normTel(v && v.clienteTelefone);
}
function chaveNorm_(k){ k = String(k == null ? '' : k); return /^ifood:/.test(k) ? k : normTel(k); }
/* telefone para ligar num pedido do iFood: 0800 + código localizador (com validade) */
function ifoodContato_(v){
  if(!v || v.canal !== 'iFood') return null;
  const vencido = !!(v.ifoodLocalizadorAte && Date.now() > v.ifoodLocalizadorAte);
  const ate = v.ifoodLocalizadorAte ? new Date(v.ifoodLocalizadorAte).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }) : '';
  return { telefone: v.clienteTelefone || '', codigo: v.ifoodLocalizador || '', vencido, ate };
}
/* Busca de cliente por nome (sem diferenciar maiúscula/acento) OU por telefone. O telefone só entra na comparação quando o termo tem dígitos:
   antes, um nome digitado virava texto vazio no telefone e "casava" com todos os clientes. */
function semAcento_(t){ return (t===undefined||t===null?'':t).toString().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
function clienteCombinaBusca_(c, termo){
  const t = semAcento_(termo); if(!t) return true;
  if(semAcento_(c.nome).includes(t)) return true;
  const d = normTel(termo);
  return d.length > 0 && normTel(c.telefone).includes(d);
}
function formatarMoeda(v){ const n = Math.round((Number(v)||0)*100)/100, p = Math.abs(n).toFixed(2).split('.'); return (n < 0 ? '−R$ ' : 'R$ ') + p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + p[1]; }
/* Converte o que vier da planilha em número: aceita número, "51", "51,5", "R$ 51,50", "1.234,56", "1,234.56", "(51,5)" e "-51,5".
   Vazio, texto que não é número, data e booleano viram 0. Ponto sozinho: "1.234" / "1.234.567" = milhar; "0.250" e "51.5" = decimal.
   Vírgula sozinha é decimal ("51,5"), a não ser que se repita ("1,234,567" = milhar). Mesma regra do backend (numPlanilha_). */
function numPlanilha_(v, padrao){
  const pad = (padrao === undefined) ? 0 : padrao;
  if(typeof v === 'number') return isFinite(v) ? v : pad;
  if(typeof v !== 'string') return pad;
  let s = v.replace(/[\s\u00a0]/g, '').replace(/%$/, '');
  let neg = false;
  if(/^\(.*\)$/.test(s)){ neg = true; s = s.slice(1, -1); }
  if(s.charAt(0) === '-'){ neg = true; s = s.slice(1); }
  s = s.replace(/^R\$/i, '');
  if(!/^[\d.,]+$/.test(s) || !/\d/.test(s)) return pad;
  const temV = s.indexOf(',') !== -1, temP = s.indexOf('.') !== -1;
  if(temV && temP){
    if(s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if(temV){
    s = ((s.match(/,/g) || []).length > 1) ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if(temP){
    if(/^[1-9]\d{0,2}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  }
  const n = Number(s);
  if(!isFinite(n)) return pad;
  return neg ? -n : n;
}
/* Garante que os campos numéricos dos dados recebidos (servidor ou cache antigo) sejam número de verdade, para as somas não virarem texto/NaN. */
const NUM_CAMPOS_DADOS_ = {
  vendas:['valorTotal','custoTotal','valorOriginal','valorDesconto','taxaEntrega'],
  itensVenda:['quantidade','valorUnitario','custoUnitario','valorTotalItem'],
  pagamentosVenda:['valor','taxa'],
  produtoPrecos:['preco','custo'], comboPrecos:['preco','custo'],
  estoque:['quantidade','minimo','custo'],
  movimentacoesEstoque:['quantidade','qtdAntes','qtdDepois'],
  comboItens:['quantidade'],
  sangrias:['valor'],
  fidelidade:['carimbos','premios'],
  historicoCaixa:['fundoCaixa','totalVendas','totalDespesas','saldoFinal'],
  despesas:['valor'], despesasRecorrentes:['valor'], ajustesPosVenda:['valor'],
  formasPagamento:['taxaPct','taxaFixa','prazoDias'],
  adicionais:['preco']
};
function normalizarNumerosDados_(d){
  if(!d || typeof d !== 'object') return d;
  Object.keys(NUM_CAMPOS_DADOS_).forEach(function(chave){
    const lista = d[chave]; if(!Array.isArray(lista)) return;
    const campos = NUM_CAMPOS_DADOS_[chave];
    lista.forEach(function(o){
      if(!o || typeof o !== 'object') return;
      campos.forEach(function(k){ if(k in o && typeof o[k] !== 'number') o[k] = numPlanilha_(o[k]); });
    });
  });
  if(d.sessaoCaixa && typeof d.sessaoCaixa === 'object' && 'fundoCaixa' in d.sessaoCaixa && typeof d.sessaoCaixa.fundoCaixa !== 'number') d.sessaoCaixa.fundoCaixa = numPlanilha_(d.sessaoCaixa.fundoCaixa);
  return d;
}
function apiConfigurada(){ return typeof SUPABASE_URL_ === 'string' && SUPABASE_URL_.indexOf('http') === 0; }   // o servidor principal é o Supabase; as planilhas são reserva opcional
/* TURNO DO CAIXA: o "hoje" das listas de pedidos segue o caixa (abre num dia, fecha no outro), não a data do calendário.
   Caixa aberto → do momento da abertura até agora. Sem caixa aberto → o último turno (abertura até fechamento). Sem nenhum registro → o dia do calendário. */
function turnoCaixa_(){
  try{
    if(typeof sessaoCaixa !== 'undefined' && sessaoCaixa && sessaoCaixa.aberturaTimestamp) return { ini: sessaoCaixa.aberturaTimestamp, fim: Infinity, aberto: true };
    const h = (typeof historicoCaixa !== 'undefined' && historicoCaixa || []).filter(c=>c && c.aberturaTimestamp);
    if(h.length){ const u = h.reduce((a,b)=> b.aberturaTimestamp > a.aberturaTimestamp ? b : a); return { ini: u.aberturaTimestamp, fim: u.fechamentoTimestamp || Infinity, aberto: false }; }
  }catch(e){}
  const d = new Date(); const ini = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return { ini, fim: ini + 864e5 - 1, aberto: false, calendario: true };
}
function noTurnoCaixa_(ts, v){ const t = turnoCaixa_(); /* venda ligada ao caixa aberto (ex.: pedido do iFood que chegou antes da abertura) conta no turno, mesmo com horário anterior */ try{ if(v && v.caixaId && t.aberto && typeof sessaoCaixa!=='undefined' && sessaoCaixa && v.caixaId===sessaoCaixa.id) return true; }catch(e){} ts = Number(ts) || 0; return ts >= t.ini && ts <= t.fim; }
/* Dia (AAAA-MM-DD) do TURNO a que um horário pertence = dia em que aquele caixa abriu. Sem caixa que o contenha, vale o dia do calendário.
   Usado no acerto do entregador e em "Vendas por dia" (o turno atravessa a meia-noite e continua sendo o mesmo dia). Mesma regra do banco (_calc_fechamento_entrega). */
function diaDoTurno_(ts){ ts = Number(ts) || 0; try{ const lista = (historicoCaixa||[]).slice(); if(typeof sessaoCaixa!=='undefined' && sessaoCaixa && sessaoCaixa.aberturaTimestamp) lista.push({aberturaTimestamp:sessaoCaixa.aberturaTimestamp, fechamentoTimestamp:0});
  let ach = null; lista.forEach(c=>{ if(!c || !c.aberturaTimestamp) return; const fim = c.fechamentoTimestamp || Infinity; if(ts >= c.aberturaTimestamp && ts <= fim && (!ach || c.aberturaTimestamp > ach.aberturaTimestamp)) ach = c; });
  if(ach) return dataLocalISO(new Date(ach.aberturaTimestamp)); }catch(e){} return dataLocalISO(new Date(ts)); }
function diaTurnoAtual_(){ const t = turnoCaixa_(); return dataLocalISO(new Date(t.calendario ? Date.now() : t.ini)); }
function dataLocalISO(date){ const y=date.getFullYear(), m=String(date.getMonth()+1).padStart(2,'0'), d=String(date.getDate()).padStart(2,'0'); return `${y}-${m}-${d}`; }
function parseDataBR(str){
  if(!str) return null;
  const [datePart, timePart] = str.split(' ');
  if(!datePart) return null;
  const [d,m,y] = datePart.split('/').map(Number);
  const [hh,mm] = (timePart||'00:00').split(':').map(Number);
  if(!d||!m||!y) return null;
  return new Date(y, m-1, d, hh||0, mm||0).getTime();
}
/* FASE 11 (ITEM 79) — toda operação que não pode se repetir ganha um requisicaoId automático (lista SB_IDEM_NOVAS_).
   O id é ligado à "intenção" (ação + dados, via hash — nenhuma senha é guardada): se a internet cair no
   meio e o usuário tocar de novo, o id é o mesmo e o backend ignora a repetição. Some após qualquer
   resposta definitiva do servidor. Guardado na sessionStorage para sobreviver a um recarregar da página. */
const IDEM_KEY = 'texasBurgerIdem_v1';
let _idemMapa = {};
try{ _idemMapa = JSON.parse(sessionStorage.getItem(IDEM_KEY) || '{}') || {}; }catch(e){ _idemMapa = {}; }
function idemPersistir_(){ try{ sessionStorage.setItem(IDEM_KEY, JSON.stringify(_idemMapa)); }catch(e){} }
function idemHash_(s){ let x = 5381; for(let i=0;i<s.length;i++) x = ((x<<5)+x+s.charCodeAt(i))|0; return (x>>>0).toString(36); }
function idemChave_(action, payload){ return action + '|' + idemHash_(JSON.stringify(payload||{})); }
function idemId_(chave){
  if(!_idemMapa[chave]){
    const chaves = Object.keys(_idemMapa); if(chaves.length > 60) delete _idemMapa[chaves[0]];
    _idemMapa[chave] = novaRequisicao_(); idemPersistir_();
  }
  return _idemMapa[chave];
}
function idemLimpar_(chave){ if(chave && _idemMapa[chave]){ delete _idemMapa[chave]; idemPersistir_(); } }
/* controle de versão: toda edição leva a versão (_v) do registro que a pessoa estava vendo.
   Se outra pessoa alterou o mesmo registro no meio tempo, o servidor recusa (conflito) e o app puxa o estado real. */
const VERSAO_FRONT_ = { editarProduto:()=>produtos, editarCombo:()=>combos, editarAdicional:()=>adicionais, editarFormaPagamento:()=>formasPagamento,
  editarCategoria:()=>categorias, editarDespesa:()=>despesas, editarDespesaRecorrente:()=>despesasRecorrentes, salvarCliente:()=>clientes,
  editarVenda:()=>vendas, editarUsuario:()=>usuarios, salvarEvento:()=>eventos };
/* ---- Aviso de carregamento (#15) ----
   Toda ação que fala com a planilha mostra um aviso se demorar mais de ~0,4 s. Ações de gravação importantes (venda, pedido, caixa,
   conta da mesa, pagamento...) também travam a tela por trás, para evitar toque duplo. Atualizações em segundo plano ficam de fora. */
/* ITEM 19 — estado da sincronização por versão (var: precisa existir antes de qualquer chamada) */
var _dadosBrutos = null, _versoesLocais = null, _ultimoFullMs = 0;
const API_SILENCIOSAS_ = new Set(['getVersoes','getDadosGrupo','getAll','detectarNovosPedidos','getCardapio','getStatusPedidoPublico','autenticar','verificarSenhaAdmin','getMesaPublica','obterArmazenamentoContingencia','obterChaveContingencia','listarSessoes']);
const API_ROTULOS_ = {
  iniciarVenda:'Registrando a venda…', criarPedidoCardapio:'Enviando seu pedido…', fecharCaixa:'Fechando o caixa…', caixaLiberar:'Liberando o caixa…', abrirCaixa:'Abrindo o caixa…',
  pontoPedidoCriar:'Enviando o pedido…', pontoPedidoDecidir:'Salvando a decisão…', pontoFechamentoSalvar:'Salvando…',
  fecharContaMesa:'Fechando a conta da mesa…', cancelarVenda:'Cancelando a venda…', editarVenda:'Salvando a venda…', pagarDespesa:'Registrando o pagamento…', pagarFuncionario:'Registrando o pagamento…', cancelarMovimentoEvento:'Cancelando o lançamento…', trocaDecidir:'Salvando a decisão…', pontoAjustar:'Salvando o registro…',
  avancarStatusPedido:'Atualizando o pedido…', aceitarPedido:'Aceitando o pedido…', rejeitarPedido:'Recusando o pedido…', fazerBackupAgora:'Fazendo o backup…',
  restaurarBackup:'Restaurando o backup…', fecharPeriodoEntregador:'Fechando o período…', atribuirEntregador:'Atribuindo o entregador…',
  uploadFotoProduto:'Enviando a foto…', uploadFotoCombo:'Enviando a foto…', sincronizarContingenciaAgora:'Sincronizando…', reconciliarContingenciaAgora:'Reconciliando…'
};
const API_TRAVAM_TELA_ = new Set(['iniciarVenda','criarPedidoCardapio','fecharCaixa','abrirCaixa','fecharContaMesa','cancelarVenda','editarVenda','pagarDespesa','pagarFuncionario',
  'avancarStatusPedido','aceitarPedido','rejeitarPedido','fazerBackupAgora','restaurarBackup','fecharPeriodoEntregador','addSangria','resgatarPremioFidelidade','registrarBrinde']);
let _apiAtivas = 0, _apiTravaTela = 0, _apiRotulo = '', _apiTimerAviso = null;
function _carregandoAtualizar_(){
  let el = document.getElementById('apiCarregando');
  if(!el){
    el = document.createElement('div'); el.id = 'apiCarregando';
    el.innerHTML = '<div class="api-car-caixa" role="status" aria-live="polite"><span class="api-car-spin"></span><span id="apiCarregandoTxt">Salvando…</span></div>';
    document.body.appendChild(el);
  }
  const txt = document.getElementById('apiCarregandoTxt'); if(txt) txt.textContent = _apiRotulo || 'Salvando…';
  el.classList.toggle('trava', _apiTravaTela > 0);
  el.classList.toggle('show', _apiAtivas > 0);
}
function _carregandoInicio_(action){
  _apiAtivas++; if(API_TRAVAM_TELA_.has(action)) _apiTravaTela++;
  { const _novoRot = API_ROTULOS_[action] || 'Salvando…'; _apiRotulo = (_apiAtivas > 1 && _apiRotulo && _apiRotulo !== _novoRot) ? 'Salvando…' : _novoRot; } // MELHORIA 6: várias chamadas ao mesmo tempo mostram um rótulo genérico
  if(_apiAtivas === 1){ clearTimeout(_apiTimerAviso); _apiTimerAviso = setTimeout(_carregandoAtualizar_, 400); } else _carregandoAtualizar_();
}
function _carregandoFim_(action){
  _apiAtivas = Math.max(0,_apiAtivas-1); if(API_TRAVAM_TELA_.has(action)) _apiTravaTela = Math.max(0,_apiTravaTela-1);
  if(_apiAtivas === 0){ clearTimeout(_apiTimerAviso); const el = document.getElementById('apiCarregando'); if(el) el.classList.remove('show','trava'); }
  else _carregandoAtualizar_();
}
/* BLOCO 1.2 — "servidor lento" (preventivo). Contava os atrasos da planilha antiga; com o Supabase ele fica desligado
   (servidorLento_ responde sempre "não") e a queda do servidor é tratada pelo modo reserva (app-18). Mantido porque o Caixa e o
   cardápio ainda consultam servidorLento_. */
let _timeoutsApi_ = [], _contPreventivoAte_ = 0, _statusPreventivo_ = false;
function _desligarPreventivo_(){ _contPreventivoAte_ = 0; _timeoutsApi_ = []; if(_statusPreventivo_){ _statusPreventivo_ = false; if(conexaoAtual==='contingencia') setConexaoStatus('online'); } }
function servidorLento_(){ if(_contPreventivoAte_ && Date.now() > _contPreventivoAte_) _desligarPreventivo_(); return Date.now() < _contPreventivoAte_; }
/* Contingência com limite de tempo. O servidor da contingência já descarta id repetido ("Já estava na fila"), então o envio da venda/pedido
   pode ser repetido com o mesmo id. A leitura do espelho e o status não repetem: se falharem, o chamador usa o cache ou avisa. */
const TIMEOUT_CONT_ENVIO_MS_ = 20000, TIMEOUT_CONT_LEITURA_MS_ = 15000, TIMEOUT_CONT_REPETICOES_ = 2;
async function fetchContingencia_(opts, ms, repeticoes){
  if(!CONTINGENCIA_API_URL) throw new Error('A planilha de contingência não está configurada neste restaurante.');
  for(let t = 0; ; t++){
    const ctl = new AbortController(); const to = setTimeout(()=>ctl.abort(), ms);
    try{
      const resp = await fetch(CONTINGENCIA_API_URL, Object.assign({}, opts, { signal: ctl.signal }));
      return await resp.json();
    }catch(e){
      if(e && e.name === 'AbortError'){
        if(t < (repeticoes||0)){ await new Promise(r=>setTimeout(r, 1000)); continue; }
        const te = new Error('A contingência demorou para responder'); te.timeout = true; throw te;
      }
      throw e;
    }finally{ clearTimeout(to); }
  }
}
/* ===================================================================================================
   SERVIDOR PRINCIPAL (Supabase): login, leituras, gravações, pedido público do cardápio, mesa (QR), feedback,
   cupons, eventos, fidelidade, ocorrências e precificação. As regras e os limites ficam no banco (funções api_*).
   Reserva: planilha principal (Apps Script). Último recurso: planilha de contingência.
   =================================================================================================== */
const USAR_SUPABASE_ = true;
const SUPABASE_URL_ = (window.RESTAURANTE && window.RESTAURANTE.supabaseUrl) || '';
const SUPABASE_CHAVE_ = (window.RESTAURANTE && window.RESTAURANTE.supabaseChave) || ''; // chave PÚBLICA por desenho (a segurança está nas regras do banco)
const SB_SESSAO_KEY_ = 'texasBurgerSb_v1';
const SB_DOMINIO_ = '@usuarios.restaurante.app';
const SB_DRIVE_FOTO_ = 'https://drive.google.com/uc?export=view&id=';
function sbEmail_(login){ return String(login||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim() + SB_DOMINIO_; }
function sbSessaoLer_(){ try{ return JSON.parse(localStorage.getItem(SB_SESSAO_KEY_)||'null'); }catch(e){ return null; } }
function sbSessaoGravar_(s){ try{ if(s) localStorage.setItem(SB_SESSAO_KEY_, JSON.stringify(s)); else localStorage.removeItem(SB_SESSAO_KEY_); }catch(e){} }
function sbFotoUrl_(id){ return id ? (SB_DRIVE_FOTO_ + id) : ''; }
/* Estado do servidor principal: _sbNivelOk_ fica falso quando o Supabase para de responder (faixa vermelha/laranja). */
let _sbNivelOk_ = true, _sbFaixaBase_ = '';
function sbNivelMarcar_(ok){
  if(_sbNivelOk_ === ok) return; _sbNivelOk_ = ok; sbFaixaTexto_();
}
function sbFaixaTexto_(){
  const d = document.getElementById('sbFaixa'); if(!d) return;
  if(_sbNivelOk_){ d.style.display = 'none'; d.textContent = ''; return; }   // tudo normal: sem faixa
  d.style.background = '#991b1b';
  d.textContent = '⚠️ Sem conexão com o servidor principal' + (_sbFaixaBase_ ? ' · ' + _sbFaixaBase_ : '');
  d.style.display = 'block';
}
/* repetir = nº de novas tentativas em falha de rede/timeout/erro 5xx. Só é usado em LEITURAS (repetir uma gravação poderia duplicar). */
async function sbJson_(url, opts, ms, repetir){
  for(let t = 0; ; t++){
    const ctl = new AbortController(); const to = setTimeout(()=>ctl.abort(), ms || 30000);
    try{
      const r = await fetch(url, Object.assign({}, opts, { signal: ctl.signal }));
      if(r.status >= 500 && t < (repetir||0)){ await new Promise(x=>setTimeout(x, 800 * (t+1))); continue; }
      sbNivelMarcar_(r.status < 500); return r;
    }catch(e){
      if(t < (repetir||0)){ await new Promise(x=>setTimeout(x, 800 * (t+1))); continue; }
      sbNivelMarcar_(false);
      if(e && e.name === 'AbortError'){ const te = new Error('O servidor demorou para responder'); te.timeout = true; throw te; }
      throw e;
    }finally{ clearTimeout(to); }
  }
}
async function sbTokenPassword_(email, senha){
  const r = await sbJson_(SUPABASE_URL_ + '/auth/v1/token?grant_type=password', { method:'POST', headers:{ 'apikey': SUPABASE_CHAVE_, 'Content-Type':'application/json' }, body: JSON.stringify({ email, password: senha }) }, 20000);
  return { status: r.status, corpo: await r.json().catch(()=>({})) };
}
function sbGuardarTokens_(c){ sbSessaoGravar_({ access_token: c.access_token, refresh_token: c.refresh_token, expira: Date.now() + ((c.expires_in||3600) - 60) * 1000 }); try{ if(typeof rtEnviarToken_ === 'function') rtEnviarToken_(c.access_token); }catch(e){} }
let _sbRenovando_ = null;
async function sbRenovar_(){
  if(_sbRenovando_) return _sbRenovando_;
  _sbRenovando_ = (async ()=>{
    const s = sbSessaoLer_(); if(!s || !s.refresh_token) return false;
    try{
      const r = await sbJson_(SUPABASE_URL_ + '/auth/v1/token?grant_type=refresh_token', { method:'POST', headers:{ 'apikey': SUPABASE_CHAVE_, 'Content-Type':'application/json' }, body: JSON.stringify({ refresh_token: s.refresh_token }) }, 20000);
      if(!r.ok) return false;
      sbGuardarTokens_(await r.json()); return true;
    }catch(e){ return false; }
  })().finally(()=>{ _sbRenovando_ = null; });
  return _sbRenovando_;
}
class SbSessaoExpirada_ extends Error {}
/* diagnóstico: registra de onde veio uma "sessão expirada" (no console: diagSessaoLog()). Não altera o comportamento. */
function sbDiagSessao_(origem, action){
  try{
    const log = JSON.parse(sessionStorage.getItem('diagSessaoLog')||'[]');
    log.push({ t:new Date().toISOString(), origem:origem, action:action||'', temSessao:!!sbSessaoLer_() });
    sessionStorage.setItem('diagSessaoLog', JSON.stringify(log.slice(-50)));
    console.warn('[DIAG sessão expirada]', origem, action||'');
  }catch(e){}
}
window.diagSessaoLog = function(){ try{ console.table(JSON.parse(sessionStorage.getItem('diagSessaoLog')||'[]')); }catch(e){} };
/* GET no banco. Com sessao=true usa o login do funcionário; senão, a chave pública (visitante). Páginas de 1000 linhas. */
async function sbSelecionar_(tabela, consulta, sessao){
  const itens = []; let de = 0; const TAM = 1000;
  for(;;){
    let s = sessao ? sbSessaoLer_() : null;
    if(sessao){
      if(!s) throw new SbSessaoExpirada_();
      if(Date.now() > s.expira){ if(!(await sbRenovar_())) throw new SbSessaoExpirada_(); s = sbSessaoLer_(); }
    }
    const url = SUPABASE_URL_ + '/rest/v1/' + tabela + '?' + (consulta ? consulta + '&' : '') + 'select=*' ;
    const cab = { 'apikey': SUPABASE_CHAVE_, 'Authorization': 'Bearer ' + (s ? s.access_token : SUPABASE_CHAVE_), 'Range-Unit': 'items', 'Range': de + '-' + (de + TAM - 1) };
    let r = await sbJson_(url, { headers: cab }, 30000, 2);
    if(r.status === 401 && sessao){ if(!(await sbRenovar_())) throw new SbSessaoExpirada_(); s = sbSessaoLer_(); cab.Authorization = 'Bearer ' + s.access_token; r = await sbJson_(url, { headers: cab }, 30000, 2); if(r.status === 401) throw new SbSessaoExpirada_(); }
    if(!r.ok && r.status !== 206) throw new Error('Falha ao ler ' + tabela + ' (' + r.status + ')');
    const pag = await r.json();
    if(!Array.isArray(pag)) throw new Error('Resposta inesperada do servidor ao ler ' + tabela + '.');   // v1.15: antes, uma resposta que não fosse lista repetia a leitura sem parar
    itens.push.apply(itens, pag);
    if(pag.length < TAM) break; de += TAM;
  }
  return itens;
}
const SB_NOTIF_PADRAO_ = { pedido:['Admin','Operador'], entrega:['Admin','Operador'], estoque:['Admin','Operador','Cozinha'], financeiro:['Admin'], ocorrencia:['Admin','Operador'], sistema:['Admin'], fidelidade:['Admin','Operador'], indicacao:['Admin','Operador'], aniversario:['Admin','Operador'], inativos:['Admin','Operador'] };
const SB_CATEGORIAS_DESPESA_ = ['Insumos','Aluguel','Energia','Água','Gás','Internet/Telefone','Salários','Impostos','Imposto das vendas (DAS)','Manutenção','Marketing','Embalagens','Entregadores','Brindes','Outros'];
function sbDataBr_(iso){ if(!iso) return ''; const d = new Date(iso); if(isNaN(d)) return ''; const p = n=>String(n).padStart(2,'0'); return p(d.getDate())+'/'+p(d.getMonth()+1)+'/'+d.getFullYear()+' '+p(d.getHours())+':'+p(d.getMinutes()); }
function sbCfg_(sistema, chave, padrao){ const x = sistema.find(i=>i.chave===chave); if(!x || x.valor===null || x.valor==='' || x.valor===undefined) return padrao; return x.valor; }
/* Lê tudo que o perfil pode ver (as regras do banco já filtram por perfil) e devolve no MESMO formato que a planilha devolvia. */
async function sbMontarDados_(nivel, chaves){
  const DEPS = { formasPagamento:['formas_pagamento','v_formas_operacional'], categorias:['categorias'], produtos:['produtos'], produtoPrecos:['produto_precos'], produtoIngredientes:['produto_ingredientes','estoque'],
    combos:['combos'], comboPrecos:['combo_precos'], comboItens:['combo_itens'], adicionais:['adicionais'], produtoAdicionais:['produto_adicionais'],
    configCardapio:['sistema'], categoriasDespesa:[], configEntrega:['sistema'], configEstoque:['sistema'], configNotificacoes:['sistema'], metas:['sistema'],
    usuarios:['usuarios'], clientes:['clientes'], promocoes:['promocoes'], estoque:['estoque'], movimentacoesEstoque:['movimentacoes_estoque','estoque','usuarios'], mesas:['v_mesas'],
    sangrias:['sangrias','usuarios'], vendas:['v_vendas'], itensVenda:['v_itens_venda'], pagamentosVenda:['pagamentos_venda'], fidelidade:['v_fidelidade'],
    sessaoCaixa:['v_sessao_aberta'], historicoCaixa:['caixa_sessoes','usuarios'], fechamentosEntrega:['fechamentos_entrega','usuarios'], entregasFechadas:['entregas_fechadas','usuarios'],
    despesas:['despesas'], despesasRecorrentes:['despesas_recorrentes'], ajustesPosVenda:['ajustes_pos_venda','despesas'],
    cupons:['cupons'], eventos:['eventos'], indicacoes:['v_indicacoes'], feedbacks:['feedbacks'], ocorrencias:['v_ocorrencias'], maisPedidos:['v_cardapio_mais_pedidos'] };
  const quer = chaves ? new Set([].concat.apply([], chaves.map(k=>DEPS[k]||[]))) : null;
  const ORDEM = { v_vendas:'order=data_hora,id', v_fidelidade:'order=cliente_id', sistema:'order=chave', movimentacoes_estoque:'order=id', sangrias:'order=id', despesas:'order=data_hora,id', despesas_recorrentes:'order=criada_em,id', ajustes_pos_venda:'order=data_hora,id', cupons:'order=criado_em,id', eventos:'order=data,id', v_indicacoes:'order=data,id', feedbacks:'order=data,id', v_ocorrencias:'order=numero,id', v_cardapio_mais_pedidos:'order=posicao' };
  let _lote = null; // resposta única do banco (api_ler_tabelas); se faltar ou falhar, cai na leitura antiga, tabela por tabela
  const L = (t, q)=> (!quer || quer.has(t) || t === 'usuarios')
    ? ((_lote && _lote[t] !== undefined) ? Promise.resolve(_lote[t]) : sbSelecionar_(t, q || ORDEM[t] || 'order=id', true))
    : Promise.resolve([]);
  // versões dos registros lidas ANTES dos dados: se algo mudar no meio, a versão fica mais antiga que o dado e o pior caso é um aviso de conflito (nunca uma edição perdida)
  let verReg = {};
  if(nivel === 'Admin' || nivel === 'Operador' || nivel === 'Garçom'){
    const todas = SB_CHAVES_VERSAO_.cad.concat(SB_CHAVES_VERSAO_.din), pedir = chaves ? todas.filter(k=>chaves.indexOf(k) !== -1) : todas;
    if(pedir.length){ try{ const rv = await sbRpc_('api_versoes_registros', { p:{ chaves: pedir } }); if(rv && rv.ok === true && rv.versoes) verReg = rv.versoes; }catch(e){ if(e instanceof SbSessaoExpirada_) throw e; } }
  }
  const gestor = (nivel === 'Admin' || nivel === 'Operador'), admin = nivel === 'Admin', operacional = (nivel === 'Garçom' || nivel === 'Cozinha' || nivel === 'Entregador');
  try{ // UMA chamada traz todas as tabelas que este perfil precisa (antes: ~36 requisições)
    const _todas = ['formas_pagamento','v_formas_operacional','categorias','produtos','produto_precos','produto_ingredientes','combos','combo_precos','combo_itens','adicionais','produto_adicionais','sistema','usuarios','promocoes','estoque','v_mesas','clientes','movimentacoes_estoque','sangrias','v_vendas','v_itens_venda','pagamentos_venda','v_fidelidade','v_sessao_aberta','caixa_sessoes','fechamentos_entrega','entregas_fechadas','despesas','despesas_recorrentes','ajustes_pos_venda','cupons','eventos','v_indicacoes','feedbacks','v_ocorrencias','v_cardapio_mais_pedidos'];
    const _lista = _todas.filter(t => (!quer || quer.has(t) || t === 'usuarios') && !(t === 'formas_pagamento' && !gestor) && !(t === 'v_formas_operacional' && gestor));
    const rl = await sbRpc_('api_ler_tabelas', { p:{ tabelas:_lista } });
    if(rl && rl.ok === true && rl.dados) _lote = rl.dados;
  }catch(e){ if(e instanceof SbSessaoExpirada_) throw e; }
  const [formas, formasOp, cats, prods, pprec, ping, combos, cprec, citens, adic, padic, sistema, usuarios, promos, estoque, mesas, clientes, movs, sangrias, vendasDb, itensDb, pagDb, fidDb, sessAb, caixaDb, fechDb, entFechDb, despDb, recDb, ajDb, cupDb, evDb, indDb, fbDb, ocDb, maisEqDb] = await Promise.all([
    (gestor ? L('formas_pagamento') : Promise.resolve([])), (gestor ? Promise.resolve([]) : L('v_formas_operacional','order=ordem')), L('categorias'), L('produtos'), L('produto_precos'), L('produto_ingredientes'), L('combos'), L('combo_precos'),
    L('combo_itens'), L('adicionais'), L('produto_adicionais'), L('sistema'), L('usuarios'), L('promocoes'), L('estoque'), L('v_mesas'), L('clientes'), L('movimentacoes_estoque'), L('sangrias'),
    L('v_vendas'), L('v_itens_venda'), L('pagamentos_venda'), L('v_fidelidade'), L('v_sessao_aberta'), L('caixa_sessoes','order=abertura.desc,id'), L('fechamentos_entrega','order=fechado_em,id'), L('entregas_fechadas','order=id'),
    L('despesas'), L('despesas_recorrentes'), L('ajustes_pos_venda'),
    L('cupons'), L('eventos'), L('v_indicacoes'), L('feedbacks'), L('v_ocorrencias'), L('v_cardapio_mais_pedidos')
  ]);
  if(!usuarios.length){ // quem está logado sempre enxerga ao menos a si mesmo; lista vazia só encerra a sessão se o banco também recusar o token
    let vivo = false;
    try{
      const sv = sbSessaoLer_();
      if(sv){
        const rv = await sbJson_(SUPABASE_URL_ + '/rest/v1/usuarios?select=login&limit=1', { headers:{ apikey:SUPABASE_CHAVE_, Authorization:'Bearer ' + sv.access_token } }, 8000);
        vivo = rv.ok;
      }
    }catch(e){ vivo = false; }
    if(!vivo){ sbDiagSessao_('sbMontarDados_:usuarios-vazio'); throw new SbSessaoExpirada_(); }
  }
  const nomeIng = {}; estoque.forEach(e=>{ nomeIng[e.id] = e.ingrediente; });
  const loginDe = {}; usuarios.forEach(u=>{ loginDe[u.id] = u.login; });
  const semCusto = x=>{ if(!gestor) delete x.custo; return x; };
  const cad = {
    formasPagamento: (formas.length ? formas : formasOp).map((f,i)=>({ id:f.id, nome:f.nome, ativa:f.ativa !== false, visivelCardapio:f.visivel_cardapio !== false, taxaPct:Number(f.taxa_percentual)||0, taxaFixa:Number(f.taxa_fixa)||0, prazoDias:Number(f.prazo_dias)||0, permiteTroco:f.permite_troco, acrescimoPct:Number(f.acrescimo_percentual)||0, acrescimoFixo:Number(f.acrescimo_fixo)||0, precoProprio:f.preco_proprio===true, ordem:Number(f.ordem)||(i+1) })).sort((a,b)=>a.ordem-b.ordem)
      .map(f=> operacional ? { id:f.id, nome:f.nome, ativa:f.ativa, permiteTroco:f.permiteTroco, acrescimoPct:f.acrescimoPct, acrescimoFixo:f.acrescimoFixo, ordem:f.ordem } : f),
    categorias: cats.map(c=>({ id:c.id, nome:c.nome, ativa:c.ativa, ordem:Number(c.ordem)||0 })).sort((a,b)=>a.ordem-b.ordem),
    produtos: prods.map(p=>({ id:p.id, nome:p.nome, descricao:p.descricao||'', categoria:p.categoria_id||'', ativo:p.ativo, fotoId:p.foto_id_principal||'', fotoUrl:sbFotoUrl_(p.foto_id_principal), destaque:p.destaque, premioFidelidade:!!p.premio_fidelidade, premioIndicacao:!!p.premio_indicacao, semDesconto:!!p.sem_desconto, estoqueProprioIngredienteId:p.estoque_proprio_ingrediente_id||'', ordemCardapio:Number(p.ordem_cardapio)||0, preCadastro:!!p.pre_cadastro, origemCadastro:p.origem||'' })),
    produtoPrecos: pprec.map(x=>semCusto({ id:x.id, produtoId:x.produto_id, formaPagamentoId:x.forma_pagamento_id, preco:Number(x.preco), custo:Number(x.custo) })),
    produtoIngredientes: ping.map(x=>({ id:x.id, produtoId:x.produto_id, ingredienteId:x.ingrediente_id, ingredienteNome:nomeIng[x.ingrediente_id]||'', quantidadePorUnidade:Number(x.quantidade_por_unidade) })),
    combos: combos.map(c=>({ id:c.id, nome:c.nome, categoria:c.categoria_id||'', ativo:c.ativo, fotoId:c.foto_id_principal||'', fotoUrl:sbFotoUrl_(c.foto_id_principal), destaque:c.destaque, semDesconto:!!c.sem_desconto, escolhaQtd:Number(c.escolha_qtd)||0, ordemCardapio:Number(c.ordem_cardapio)||0 })),
    comboPrecos: cprec.map(x=>semCusto({ id:x.id, comboId:x.combo_id, formaPagamentoId:x.forma_pagamento_id, preco:Number(x.preco), custo:Number(x.custo) })),
    comboItens: citens.map(x=>({ id:x.id, comboId:x.combo_id, produtoId:x.produto_id, quantidade:Number(x.quantidade), escolha:!!x.escolha })),
    adicionais: adic.map(a=>({ id:a.id, nome:a.nome, preco:Number(a.preco)||0, ativo:a.ativo, ingredienteId:a.ingrediente_id||'', quantidadeDesconto:Number(a.quantidade_descontar)||1 })),
    produtoAdicionais: padic.map(x=>({ id:x.id, produtoId:x.produto_id, adicionalId:x.adicional_id })),
    configCardapio: { kicker: sbCfg_(sistema,'CardapioKicker',kickerPadrao_()), frase: sbCfg_(sistema,'CardapioFrase','Peça pelo cardápio — rápido, sem complicação.'), tempoEntrega: sbCfg_(sistema,'CardapioTempoEntrega','40-60 min'), tempoRetirada: sbCfg_(sistema,'CardapioTempoRetirada','20-30 min'), tempoMesa: sbCfg_(sistema,'CardapioTempoMesa','20-30 min'), faixaPromo: sbCfg_(sistema,'CardapioFaixaPromo',''), precoSugerido: sbCfg_(sistema,'PrecoSugeridoCfg',null),
      fechamento: { ativo: !!(sbCfg_(sistema,'CardapioFechadoManual',{})||{}).ativo, mensagem: (sbCfg_(sistema,'CardapioFechadoManual',{})||{}).mensagem || '', periodos: Array.isArray(sbCfg_(sistema,'CardapioPeriodosFechado',[])) ? sbCfg_(sistema,'CardapioPeriodosFechado',[]) : [] },
      restaurante: { nome: sbCfg_(sistema,'RestauranteNome',''), endereco: sbCfg_(sistema,'RestauranteEndereco',''), telefone: sbCfg_(sistema,'RestauranteTelefone',''), horario: sbCfg_(sistema,'RestauranteHorario',''), redes: sbCfg_(sistema,'RestauranteRedes','') } },
    categoriasDespesa: SB_CATEGORIAS_DESPESA_,
    configEntrega: { taxaPadrao: Number(sbCfg_(sistema,'TaxaEntregaPadrao',0))||0, ajudaDiaria: Number(sbCfg_(sistema,'AjudaDiariaEntregador',0))||0 },
    configEstoque: { bloquear: sbCfg_(sistema,'BLOQUEAR_ESTOQUE_NEGATIVO',false) === true },
    configNotificacoes: (()=>{ const salvo = sbCfg_(sistema,'NotificacoesConfig',null) || {}, o = {}; Object.keys(SB_NOTIF_PADRAO_).forEach(id=>{ const s = salvo[id]; o[id] = { ativo: s ? s.ativo !== false : true, perfis: (s && Array.isArray(s.perfis)) ? s.perfis.filter(p=>['Admin','Operador','Cozinha'].indexOf(p)!==-1) : SB_NOTIF_PADRAO_[id].slice() }; }); return o; })()
  };
  const din = {
    usuarios: usuarios.map(u=>({ login:u.login, nivel:u.nivel, ativo:u.ativo, criadoEm:sbDataBr_(u.criado_em), nome:u.nome||'', telefone:u.telefone||'', id:u.id })),
    logRecentes: [], clientes: clientes.filter(x=>!x.unido_com).map(x=>{ const y = { id:x.id, nome:x.nome, telefone:x.telefone||'', dataNascimento:x.data_nascimento||'', endereco:x.endereco||'', comoConheceu:x.como_conheceu||'', primeiroContato:sbDataBr_(x.primeiro_contato), observacao:x.observacoes||'', preferencias:x.preferencias||'', ifoodId:x.ifood_id||'', origemCadastro:x.origem||'' }; if(nivel==='Garçom') delete y.observacao; return y; }), promocoes: nivel==='Garçom' ? [] : promos.map(p=>({ nome:p.nome, tipo:p.tipo, regra:p.regra_duplicidade, beneficio:p.beneficio, ativa:p.ativa })),
    cupons: cupDb.map(c=>({ id:c.id, codigo:String(c.codigo||'').toUpperCase(), nome:c.nome||'', tipo:c.tipo||'percentual', valor:Number(c.valor)||0, faixas:Array.isArray(c.faixas)?c.faixas:[], regra:(c.regra&&typeof c.regra==='object')?c.regra:null, freteGratis:!!c.frete_gratis, dataInicio:c.data_inicio||'', dataFim:c.data_fim||'', horaInicio:String(c.hora_inicio||'').slice(0,5), horaFim:String(c.hora_fim||'').slice(0,5), limiteTotal:Number(c.limite_total)||0, limitePorCliente:Number(c.limite_por_cliente)||0, valorMinimo:Number(c.valor_minimo)||0, ativa:c.ativa!==false, acumula:!!c.acumula, somenteConta:!!c.somente_conta, clienteId:c.cliente_id||'', mensagem:c.mensagem||'', visivelConta:!!c.visivel_conta, automatico:c.automatico||'', validadeDias:Number(c.validade_dias)||30, criadoEm:sbDataBr_(c.criado_em), excluido:!!c.excluido_em, codigoOriginal:c.codigo_original||'', formasIds:Array.isArray(c.formas_ids)?c.formas_ids.map(String):[] })),
    eventos: evDb.map(e=>({ id:e.id, nome:e.nome||'', tipo:e.tipo||'', data:e.data||'', horaInicio:String(e.hora_inicio||'').slice(0,5), horaFim:String(e.hora_fim||'').slice(0,5), local:e.local||'', contratante:e.contratante||'', telefone:e.telefone||'', status:e.status||'Orçamento', valorContratado:Number(e.valor_contratado)||0, valorRecebido:Number(e.valor_recebido)||0, valorAReceber:Number(e.valor_a_receber)||0, custoTotal:Number(e.custo_total)||0, resultado:Number(e.resultado)||0, observacoes:e.observacoes||'' })),
    indicacoes: indDb.map(i=>({ nomeIndicador:i.nome_indicador||'', telIndicador:i.telefone_indicador||'', nomeIndicado:i.nome_indicado||'', telIndicado:i.telefone_indicado||'', data:sbDataBr_(i.data), resgatado:i.status==='Resgatado', observacao:i.observacoes||'', idIndicador:i.indicador_id||'', idIndicado:i.indicado_id||'' })),
    fidelidade: fidDb.map(f=>({ nome:f.nome||'', telefone:f.telefone||'', carimbos:Number(f.carimbos)||0, premios:Number(f.premios)||0, atualizado:f.atualizado||'', observacao:f.observacao||'', clienteId:f.cliente_id||'' })),
    estoque: estoque.map(e=>{ const y = { id:e.id, nome:e.ingrediente, quantidade:Number(e.quantidade), minimo:Number(e.quantidade_minima), unidade:e.unidade||'un', custo:Number(e.custo_unitario)||0, ativo:e.status!=='Inativo', soCusto:!!e.so_custo }; if(!gestor) delete y.custo; return y; }),
    movimentacoesEstoque: movs.map(m=>({ id:m.id, ingredienteNome:nomeIng[m.ingrediente_id]||'', tipo:m.tipo, quantidade:Number(m.quantidade), qtdAntes:Number(m.qtd_antes), qtdDepois:Number(m.qtd_depois), motivo:m.motivo_referencia||'', usuario:loginDe[m.usuario_id]||'', data:m.data })).sort((a,b)=>new Date(b.data)-new Date(a.data)),
    mesas: mesas.map(m=>({ id:m.id, numero:m.numero, status:m.status||'Livre', capacidade:m.capacidade||'', observacao:m.observacao||'', garcomResponsavel:m.garcom_responsavel||'', chamadoEm: m.chamado_em ? (Date.parse(m.chamado_em)||0) : 0 })).sort((a,b)=>Number(a.numero)-Number(b.numero)),
    feedbacks: fbDb.map(f=>({ id:f.id, vendaId:f.venda_id||'', telefone:f.telefone_cliente||'', nota:Number(f.nota)||0, comentario:f.comentario||'', data:sbDataBr_(f.data), status:f.status||'Novo', clienteId:f.cliente_id||'', origem:f.origem||'formulario', userId:f.user_id||'', resposta:f.resposta||'', respondidoEm:f.respondido_em?sbDataBr_(f.respondido_em):'', respondidoPor:f.respondido_por||'' })),
    ocorrencias: ocDb.map(o=>({ id:o.id, numero:Number(o.numero)||0, data:sbDataBr_(o.data_hora), tipo:o.tipo||'', setor:o.setor||'', vendaId:o.venda_id||'', clienteNome:o.cliente||'', clienteTelefone:o.telefone||'', registradoPor:o.registrado_por||'', responsavel:o.responsavel||'', descricao:o.descricao||'', solucao:o.solucao||'', status:o.status||'Aberta', atualizada:sbDataBr_(o.atualizada_em), historico:Array.isArray(o.historico)?o.historico.join('\n'):String(o.historico||'') })),
    maisPedidos: maisEqDb.map(m=>({ tipo:m.tipo, id:m.id })),
    vendas: vendasDb.map(v=>({ id:v.id, data:sbDataBr_(v.data_hora), timestamp:Date.parse(v.data_hora)||0, clienteNome:v.cliente_nome||'', clienteTelefone:v.cliente_telefone||'', formaPagamento:v.forma_pagamento||'',
      valorTotal:Number(v.valor_total)||0, custoTotal:Number(v.custo_total)||0, status:v.status, motivoCancelamento:v.motivo_cancelamento||'', tipoEntrega:v.tipo_entrega||'Retirada', statusPedido:v.status_pedido||'',
      endereco:v.endereco||'', complemento:v.complemento||'', referencia:v.referencia||'', observacoesEntrega:v.observacoes_entrega||'', preferenciasCliente:v.preferencias_cliente||'',
      timestampPronta:v.pronta_em?Date.parse(v.pronta_em):null, timestampConcluida:v.concluida_em?Date.parse(v.concluida_em):null,
      statusPagamento:v.status_pagamento||'Pago', timestampRecebimento:v.recebido_em?Date.parse(v.recebido_em):null,
      valorOriginal:Number(v.valor_original)||Number(v.valor_total)||0, valorDesconto:Number(v.valor_desconto)||0, acrescimoForma:Number(v.acrescimo_forma)||0, descontoDetalhe:v.desconto_detalhe||'', entregador:v.entregador||'',
      timestampSaiu:v.saiu_em?Date.parse(v.saiu_em):null, origem:v.origem||'Balcão', canal:v.canal||'', mesaId:v.mesa_id||'', mesaNumero:(v.mesa_numero!=null?String(v.mesa_numero):''), taxaEntrega:Number(v.taxa_entrega)||0, fechamentoEntregaId:v.fechamento_entrega_id||'', caixaId:v.caixa_id||'',
      registradoPor:v.registrado_por||'', numero:Number(v.numero)||0, timestampInicioPreparo:v.inicio_preparo_em?Date.parse(v.inicio_preparo_em):null,
      clienteId:v.cliente_id||'', ifoodLocalizador:v.ifood_localizador||'', ifoodLocalizadorAte:v.ifood_localizador_ate?Date.parse(v.ifood_localizador_ate):null }))
      .map(v=>{ if(nivel==='Entregador'||nivel==='Garçom'||nivel==='Cozinha') delete v.custoTotal; if(nivel==='Cozinha'){ delete v.clienteTelefone; delete v.endereco; delete v.complemento; delete v.referencia; } return v; }),
    itensVenda: itensDb.map(i=>{ const y = { id:i.id, vendaId:i.venda_id, produtoId:i.produto_id||'', comboId:i.combo_id||'', descricao:i.descricao||'', quantidade:Number(i.quantidade), valorUnitario:Number(i.valor_unitario), custoUnitario:Number(i.custo_unitario)||0, valorTotalItem:Number(i.valor_total_item), adicionaisIds:i.adicionais_ids||[] }; if(!gestor) delete y.custoUnitario; return y; }),
    pagamentosVenda: pagDb.map(p=>({ id:p.id, vendaId:p.venda_id, forma:p.forma_pagamento, valor:Number(p.valor), taxa:Number(p.taxa_aplicada)||0 })),
    despesas: despDb.map(d=>({ id:d.id, data:sbDataBr_(d.data_hora), timestamp:Date.parse(d.data_hora)||0, descricao:d.descricao||'', valor:Number(d.valor)||0, observacao:d.observacao||'',
      status: d.status==='Cancelada' ? 'Cancelada' : 'Confirmada', motivoCancelamento:d.motivo_cancelamento||'', categoria:d.categoria||'Outros', vencimento:d.vencimento?String(d.vencimento):'',
      situacao: (d.status==='A pagar' || d.situacao==='A pagar') ? 'A pagar' : 'Paga', recorrenteId:d.recorrente_id||'', competencia:d.competencia||'', saiuDoCaixa:d.saiu_do_caixa!==false })),
    despesasRecorrentes: recDb.map(r=>({ id:r.id, descricao:r.descricao||'', categoria:r.categoria||'Outros', valor:Number(r.valor)||0, diaVencimento:Number(r.dia_vencimento)||1, periodicidade:r.periodicidade||'Mensal',
      ativa:r.ativa!==false, observacao:r.observacao||'', inicio:r.inicio?String(r.inicio).slice(0,7):'', termino:r.termino?String(r.termino).slice(0,7):'' })),
    ajustesPosVenda: ajDb.map(a=>{ const dp = despDb.find(x=>x.id===a.despesa_id); return { id:a.id, data:sbDataBr_(a.data_hora), timestamp:Date.parse(a.data_hora)||0, vendaId:a.venda_id, numero:Number(a.pedido_numero)||0,
      clienteNome:a.cliente||'', clienteTelefone:a.telefone||'', tipo:a.tipo, valor:Number(a.valor)||0, motivo:a.motivo||'', detalhe:a.detalhe||'',
      saida: !a.saida ? 'Sem saída de dinheiro' : ((dp && dp.saiu_do_caixa===false) ? 'Fora do caixa' : 'Do caixa'), despesaId:a.despesa_id||'', status:a.status==='Cancelado'?'Cancelado':'Ativo',
      autorizadoPor:loginDe[a.autorizado_por]||'', registradoPor:loginDe[a.registrado_por]||'', motivoCancelamento:a.motivo_cancelamento||'' }; }),
    sangrias: sangrias.map(s=>({ id:s.id, data:sbDataBr_(s.data_hora), timestamp:Date.parse(s.data_hora)||0, valor:Number(s.valor), motivo:s.motivo||'', usuario:loginDe[s.usuario_id]||'' })),
    metas: admin || nivel==='Operador' ? { mensal: Number(sbCfg_(sistema,'MetaMensal',0))||0, diaria: Number(sbCfg_(sistema,'MetaDiaria',0))||0 } : { mensal:0, diaria:0 },
    sessaoCaixa: sessAb.length ? { id:sessAb[0].id, abertura:sbDataBr_(sessAb[0].abertura), aberturaTimestamp:Date.parse(sessAb[0].abertura)||0, fundoCaixa:Number(sessAb[0].fundo_caixa)||0, status:'Aberto', usuarioAbertura:sessAb[0].usuario_abertura||'',
      venceEm:Date.parse(sessAb[0].vence_em)||0, avisoHoras:Number(sessAb[0].aviso_horas)||2, liberadoAte:Date.parse(sessAb[0].liberado_ate)||0, liberadoPor:sessAb[0].liberado_por||'', liberadoMotivo:sessAb[0].liberado_motivo||'' } : null,
    historicoCaixa: caixaDb.map(r=>({ id:r.id, abertura:sbDataBr_(r.abertura), aberturaTimestamp:Date.parse(r.abertura)||0, fundoCaixa:Number(r.fundo_caixa)||0, fechamento:r.fechamento?sbDataBr_(r.fechamento):'', fechamentoTimestamp:r.fechamento?Date.parse(r.fechamento):null,
      totalVendas:Number(r.total_vendas)||0, totalDespesas:Number(r.total_despesas)||0, saldoFinal:Number(r.saldo_final)||0, status:r.status, usuarioAbertura:loginDe[r.usuario_abertura]||'', usuarioFechamento:loginDe[r.usuario_fechamento]||'',
      valorContado:r.valor_contado===null||r.valor_contado===undefined?null:Number(r.valor_contado), diferenca:r.diferenca===null||r.diferenca===undefined?null:Number(r.diferenca), reconciliadasQtd:0, reconciliadoDinheiro:0, fechamentoAtrasado:r.fechamento_atrasado===true, fechamentoMotivo:r.fechamento_motivo||'' })), fechamentosEntrega: fechDb.map(f=>({ id:f.id, dataRef:String(f.data_ref), entregador:loginDe[f.entregador_id]||'', qtd:Number(f.qtd_entregas)||0, totalTaxas:Number(f.total_taxas)||0, ajudaDiaria:Number(f.ajuda_diaria)||0, totalDevido:Number(f.total_devido)||0, valorPago:Number(f.valor_pago)||0, diferenca:Number(f.diferenca)||0, fechadoEm:sbDataBr_(f.fechado_em), fechadoPor:loginDe[f.fechado_por]||'', observacao:f.observacao||'', requisicaoId:f.requisicao_id||'', formaPagamento:f.forma_pagamento||'' })), entregasFechadas: entFechDb.map(f=>({ id:f.id, fechamentoId:f.fechamento_id, vendaId:f.venda_id, dataRef:String(f.data_ref), entregador:loginDe[f.entregador_id]||'', taxa:Number(f.taxa)||0 }))
  };
  [['cad', cad], ['din', din]].forEach(([g, obj])=>{ SB_CHAVES_VERSAO_[g].forEach(k=>{ const m = verReg[k]; if(m && Array.isArray(obj[k])) obj[k].forEach(x=>{ if(x && m[x.id]) x._v = m[x.id]; }); }); });
  return { cad, din };
}
/* FASE 3 / itens 4 e 5 do plano de correção — VERSÕES
   1) O banco mantém 2 carimbos (cad = cadastros, din = movimento) que sobem a cada gravação confirmada; a sincronização em segundo plano só baixa quando eles mudam.
   2) Cada registro editável recebe _v (carimbo do conteúdo); toda edição devolve a _v que a pessoa estava vendo e o banco recusa se outra pessoa mexeu antes. */
async function sbVersoes_(){
  try{ const r = await sbRpc_('api_versoes', {}); if(r && r.ok === true && r.cad !== undefined && r.din !== undefined) return { cad:String(r.cad), din:String(r.din) }; }
  catch(e){ if(e instanceof SbSessaoExpirada_) throw e; }
  return null;
}
function sbVersoesDesconhecidas_(){ const x = 'x' + Date.now(); return { cad:x, din:x }; } // banco não respondeu: valor sempre diferente, força baixar tudo (seguro)
const SB_CHAVES_VERSAO_ = { cad:['produtos','combos','adicionais','formasPagamento','categorias'], din:['clientes','cupons','eventos','despesas','despesasRecorrentes','usuarios','vendas'] };
/* ações que mudam dados "filhos" (preços, adicionais) e, por isso, a versão de um registro que a resposta não devolve: a tela se atualiza sozinha logo depois */
const SB_REFRESH_APOS_ = new Set(['addFormaPagamento','vincularAdicionaisEmLote','desvincularAdicionaisEmLote','excluirAdicional','aplicarPrecoCalculadora']);
function sbAnexarVersao_(action, payload){ // como a planilha fazia: a edição leva a versão (_v) que a pessoa estava vendo
  try{
    if(!VERSAO_FRONT_[action] || !payload || payload.versaoEsperada !== undefined) return payload;
    const chave = payload.id || (action === 'editarUsuario' ? payload.loginAlvo : '');
    if(!chave) return payload;
    const atual = (VERSAO_FRONT_[action]() || []).find(x=>(payload.id ? x.id === payload.id : String(x.login).toLowerCase() === String(chave).toLowerCase()));
    if(atual && atual._v) return Object.assign({}, payload, { versaoEsperada: atual._v });
  }catch(e){}
  return payload;
}
async function sbCardapioPublico_(){
  const P = (t, ordem)=>sbSelecionar_(t, 'order=' + ordem, false); // ordem fixa: a leitura em páginas não pode repetir nem pular linhas
  const [cats, prods, combos, formas, citens, precos, adic, cfg, st, maisDb, esgDb] = await Promise.all([
    P('v_cardapio_categorias','id'), P('v_cardapio_produtos','id'), P('v_cardapio_combos','id'), P('v_cardapio_formas','id'), P('v_cardapio_combo_itens','combo_id,produto_id'),
    P('v_cardapio_precos','tipo,item_id,forma_pagamento_id'), P('v_cardapio_adicionais','produto_id,adicional_id'), P('v_cardapio_config','chave'),
    P('v_cardapio_status','caixa_aberto').catch(()=>sbSelecionar_('v_cardapio_status','order=caixa_aberto',false)).catch(()=>[{ caixa_aberto:true }]),   // se a leitura do status falhar, não finge "fechado": o servidor confere o caixa quando o pedido é enviado
   
    P('v_cardapio_mais_pedidos','posicao').catch(()=>[]), P('v_cardapio_esgotados','tipo,id').catch(()=>[])
  ]);
  const cfgv = {}; cfg.forEach(c=>{ cfgv[c.chave] = c.valor; });
  if(cfgv.MANUTENCAO) return { ok:false, manutencao:true, message: String(cfgv.MANUTENCAO.mensagem || cfgv.MANUTENCAO) };
  const vistos = {}, adicionais = [], produtoAdicionais = [];
  adic.forEach(a=>{ if(!vistos[a.adicional_id]){ vistos[a.adicional_id] = 1; adicionais.push({ id:a.adicional_id, nome:a.nome, preco:Number(a.preco) }); } produtoAdicionais.push({ produtoId:a.produto_id, adicionalId:a.adicional_id }); });
  return {
    ok: true,
    categorias: cats.map(c=>({ id:c.id, nome:c.nome, ativa:true, ordem:Number(c.ordem)||0 })).sort((a,b)=>a.ordem-b.ordem),
    produtos: prods.sort((a,b)=>(a.ordem_cardapio||0)-(b.ordem_cardapio||0)).map(p=>({ id:p.id, nome:p.nome, descricao:p.descricao||'', categoria:p.categoria_id||'', fotoUrl:sbFotoUrl_(p.foto_id_principal), destaque:p.destaque, semDesconto:!!p.sem_desconto })),
    combos: combos.sort((a,b)=>(a.ordem_cardapio||0)-(b.ordem_cardapio||0)).map(c=>({ id:c.id, nome:c.nome, categoria:c.categoria_id||'', fotoUrl:sbFotoUrl_(c.foto_id_principal), destaque:c.destaque, semDesconto:!!c.sem_desconto, escolhaQtd:Number(c.escolha_qtd)||0 })),
    formasPagamento: formas.sort((a,b)=>(a.ordem||0)-(b.ordem||0)).map(f=>({ id:f.id, nome:f.nome, ativa:true, visivelCardapio:true, acrescimoPct:Number(f.acrescimo_percentual)||0, acrescimoFixo:Number(f.acrescimo_fixo)||0 })),
    produtoPrecos: precos.filter(x=>x.tipo==='produto').map(x=>({ produtoId:x.item_id, formaPagamentoId:x.forma_pagamento_id, preco:Number(x.preco) })),
    comboPrecos: precos.filter(x=>x.tipo==='combo').map(x=>({ comboId:x.item_id, formaPagamentoId:x.forma_pagamento_id, preco:Number(x.preco) })),
    adicionais, produtoAdicionais,
    comboItens: citens.map(x=>({ comboId:x.combo_id, produtoId:x.produto_id, quantidade:Number(x.quantidade)||1, escolha:!!x.escolha })),
    config: { kicker: cfgv.CardapioKicker || kickerPadrao_(), frase: cfgv.CardapioFrase || 'Peça pelo cardápio — rápido, sem complicação.', tempoEntrega: cfgv.CardapioTempoEntrega || '40-60 min', tempoRetirada: cfgv.CardapioTempoRetirada || '20-30 min', tempoMesa: cfgv.CardapioTempoMesa || '20-30 min', faixaPromo: cfgv.CardapioFaixaPromo || '', taxaEntrega: Number(cfgv.TaxaEntregaPadrao)||0, restaurante: { nome: cfgv.RestauranteNome||'', endereco: cfgv.RestauranteEndereco||'', telefone: cfgv.RestauranteTelefone||'', horario: cfgv.RestauranteHorario||'', redes: cfgv.RestauranteRedes||'' } },
    maisPedidos: maisDb.map(m=>({ tipo:m.tipo, id:m.id })), caixaAberto: !!(st[0] && st[0].caixa_aberto), cardapioBloqueio: (st[0] && st[0].cardapio_bloqueio) || '',
    esgotados: { produtos: esgDb.filter(x=>x.tipo==='produto').map(x=>x.id), combos: esgDb.filter(x=>x.tipo==='combo').map(x=>x.id) }
  };
}

/* ---------- GRAVAÇÕES (3b): chamam as funções api_* do banco e devolvem as listas atualizadas, como a planilha fazia ---------- */
const SB_ESCRITAS_ = {
  addFormaPagamento:['formasPagamento','produtoPrecos','comboPrecos'], editarFormaPagamento:['formasPagamento'],
  addCategoria:['categorias'], editarCategoria:['categorias'], excluirCategoria:['categorias'],
  addIngrediente:['estoque','movimentacoesEstoque'], editarIngrediente:['estoque','movimentacoesEstoque','produtoPrecos','comboPrecos','produtoIngredientes'], excluirIngrediente:['estoque'],
  pagarFuncionario:['despesas'], cancelarPagamentoFuncionario:['despesas'], ajustarPrecosProdutosLote:['produtos','produtoPrecos','comboPrecos'], visibilidadeLoteProdutos:['produtos'],
  salvarPrecosLote:['estoque','produtoPrecos','comboPrecos','produtoIngredientes','adicionais'],
  addAdicional:['adicionais'], editarAdicional:['adicionais'], excluirAdicional:['adicionais','produtoAdicionais'], vincularAdicionaisEmLote:['produtoAdicionais'], desvincularAdicionaisEmLote:['produtoAdicionais'],
  registrarBrinde:['fidelidade','indicacoes','estoque','movimentacoesEstoque'], editarPremioProduto:['produtos'], editarSemDesconto:['produtos','combos'],
  addProduto:['produtos','produtoPrecos','produtoIngredientes','produtoAdicionais','estoque','comboPrecos'], editarProduto:['produtos','produtoPrecos','produtoIngredientes','produtoAdicionais','estoque','comboPrecos'],
  excluirProduto:['produtos','produtoPrecos','produtoIngredientes'], editarVisibilidadeCardapioProduto:['produtos'], editarOrdemCardapioProduto:['produtos'],
  addCombo:['combos','comboPrecos','comboItens'], editarCombo:['combos','comboPrecos','comboItens'], excluirCombo:['combos','comboPrecos','comboItens'],
  editarVisibilidadeCardapioCombo:['combos'], editarOrdemCardapioCombo:['combos'],
  addMesa:['mesas'], editarStatusMesa:['mesas'], excluirMesa:['mesas'], atenderChamadoMesa:['mesas'],
  salvarConfigNotificacoes:{ config:'configNotificacoes' }, salvarConfigEstoque:{ configEstoque:'configEstoque' }, salvarConfigCardapio:{ config:'configCardapio' }, salvarCardapioFechamento:{ config:'configCardapio' }, salvarDadosRestaurante:{ config:'configCardapio' },
  salvarConfigEntrega:{ configEntrega:'configEntrega' }, salvarMeta:{ metas:'metas' }, salvarCliente:['clientes'],
  criarUsuario:['usuarios'], editarUsuario:['usuarios'], excluirUsuario:['usuarios'], excluirCliente:['clientes'], unirClientes:['clientes','fidelidade','vendas','indicacoes'], desunirCliente:['clientes','fidelidade','vendas','indicacoes'],
  registrarEntradaEstoque:['estoque','movimentacoesEstoque','produtoPrecos','comboPrecos'], registrarPerdaEstoque:['estoque','movimentacoesEstoque'], registrarPerdaProduto:['estoque','movimentacoesEstoque'], registrarInventarioEstoque:['estoque','movimentacoesEstoque'],
  addSangria:['sangrias'],
  fecharContaMesa:['vendas','itensVenda','pagamentosVenda','mesas','fidelidade','clientes'], fecharPeriodoEntregador:['vendas','fechamentosEntrega','entregasFechadas','despesas'],
  abrirCaixa:['sessaoCaixa'], cancelarVenda:['vendas','estoque'], editarVenda:['vendas','itensVenda','pagamentosVenda'],
  iniciarVenda:['vendas','itensVenda','pagamentosVenda','fidelidade','clientes','estoque','mesas'],
  aceitarPedido:['vendas','itensVenda','pagamentosVenda'], iniciarPreparoPedido:['vendas','itensVenda','pagamentosVenda'], avancarStatusPedido:['vendas','itensVenda','pagamentosVenda'], suspenderPedido:['vendas','itensVenda','pagamentosVenda'], retomarPedido:['vendas','itensVenda','pagamentosVenda'],
  atribuirEntregador:['vendas','itensVenda','pagamentosVenda'], confirmarRecebimentoPedido:['vendas','itensVenda','pagamentosVenda','fidelidade','clientes'], rejeitarPedido:['vendas','itensVenda','pagamentosVenda','estoque'],
  addDespesa:['despesas'], editarDespesa:['despesas'], pagarDespesa:['despesas'], cancelarDespesa:['despesas'], gerarDespesasMes:['despesas'],
  addDespesaRecorrente:['despesasRecorrentes','despesas'], editarDespesaRecorrente:['despesasRecorrentes','despesas'],
  registrarAjustePosVenda:['ajustesPosVenda','despesas'], cancelarAjustePosVenda:['ajustesPosVenda','despesas'],
  salvarCupom:['cupons'], editarCupom:['cupons'], alternarCupom:['cupons'],
  registrarCompra:['estoque','movimentacoesEstoque','despesas','produtoPrecos','comboPrecos'], receberCompra:['estoque','movimentacoesEstoque','despesas','produtoPrecos','comboPrecos'], estornarCompra:['estoque','movimentacoesEstoque','despesas','produtoPrecos','comboPrecos'],
  salvarEvento:['eventos'], cancelarEvento:['eventos'], adicionarCustoEvento:['eventos'], adicionarRecebimentoEvento:['eventos'],
  addOrStampFidelidade:['fidelidade'], resgatarPremioFidelidade:['fidelidade'], indicarNovoCliente:['clientes','indicacoes','fidelidade'], toggleResgateIndicacao:['indicacoes'],
  registrarOcorrencia:['ocorrencias'], atualizarOcorrencia:['ocorrencias'], editarStatusFeedback:['feedbacks'], responderFeedback:['feedbacks'],
  aplicarPrecoCalculadora:['produtoPrecos']
};
/* chamadas que só pedem ao banco e devolvem a resposta dele como está (sem reler as listas) */
const SB_RPC_DIRETO_ = ['pontoMeusRegistros','pontoPedidoCriar','pontoPedidosLista','pontoPedidoFoto','pontoPedidoDecidir','pontoFechamento','pontoFechamentoSalvar','rotaEntrega','ifoodFinDados','ifoodFinAcao','ipPagamentos','ipReembolso','ipGerarSegredo','pagFormaProvedor','ifoodModulos','ifoodMotivos','ifoodMotivoEscolher','ifoodCodigosPendentes','ifoodCodigo','armazenamentoPainel','cardapioHoje','excluirCupom','errosSistema','ifoodItensExcluir','ifoodMarcarTeste','ifoodPreCadastro','ifoodTestar','ifoodConferencia','ifoodRastreios','marcarAparelhoEquipe','margemSugestao','margemIgnorar','precoHistorico','margemAlerta','margemConfigSalvar','estoqueSugestao','eventoHorasSalvar','eventoRendimento','escalaAvisar','trocaSolicitar','trocaResponder','trocaDecidir','trocasLista','pontoEstado','pontoLocal','pontoRostoConfig','pontoRostoApagar','pontoAprovar','evidenciasLista','etiquetasLista','etiquetaSalvar','etiquetaImportarEstoque','etiquetaRegistrar','pontoBater','pontoRelatorio','pontoAjustar','equipePesoMaoObra','equipeReserva','espacoHistorico','eventoMovimentos','cancelarMovimentoEvento','escalaSemana','salvarTurno','escalaPadraoSalvar','escalaAplicarPadrao','escalaCopiarSemana','equipeImportarAcessos','minhaEscala','equipeFolha','salvarFuncionario','editarCompraInfo','lgpdConfig','listarReembolsos','confirmarReembolso','listarChavesIa','verChaveIa','salvarChaveIa','salvarIaExtras','integracoesFlags','integracoesStatus','integracoesMarcar','integracoesConfig','integracoesSalvarSegredo','integracoesVerSegredo','integracoesLigar','integracoesDesligar','integracoesLog','mpFormaOnline','mpPagamentosRecentes','mpPendenciasDecisao','mpResumoOperacional','mpDecidirPagamento','fiscalEmpresaLer','fiscalEmpresaSalvar','fiscalPerfis','fiscalPerfilSalvar','fiscalPerfilExcluir','fiscalAtribuir','fiscalSemPerfil','fiscalExportar','fiscalImportar','nfceLista','nfceReemitir','nfceEmitirVenda','nfceCpf','nfceSimular','nfceConferencia','nfceInutilizar','nfcePacote','ifoodPedidos','ifoodItens','ifoodPrecos','ifoodPrecosPedirCatalogo','ifoodPrecosAplicar','ifoodPrecosEnviar','ifoodPrecosDesfazer','ifoodFinanceiro','ifoodAvaliacoes','ifoodAvaliacaoResponder','ifoodRelatorio','ifoodLoja','ifoodLojaAcao','ifoodNegociacoes','ifoodNegociacaoResponder','ifoodAvisos','ifoodAvisoVisto','ifoodCatDiag','ifoodCatDiagPedir','ifoodShipConfig','ifoodShipLista','ifoodShipCotar','ifoodShipChamar','ifoodShipMotivos','ifoodShipCancelar','ifoodShipEndereco','ifoodShipSafe','ifoodBiLer','ifoodBiBuscar','ifoodLigarItem','clienteIfoodInfo','geoEnderecoSalvar','ifoodHorario','ifoodHorarioSalvar','ifoodHorarioLer','ifoodCat','ifoodCatSalvar','ifoodCatExcluir','ifoodCatEnviar','ifoodCatLote','ifoodLacunas','ifoodReprocessar','ifoodSimular','listarContas','salvarConta','excluirConta','verSenhaConta','saudeSistema','pushInscrever','pushCancelar','listarAuditoria','listarCompras','salvarFornecedor','cancelarCompra','listarSessoes','encerrarSessaoRemota','verificarSenhaAdmin','trocarMinhaSenha','fecharCaixa','caixaLiberar','caixaSalvarConfig','caixaConfig','previewFechamentoEntrega','getQrMesas','gerarNovoCodigoMesa','detectarNovosPedidos','simularPrecificacao','salvarAliquotaMes','visitasCardapioHoje'];
function sbNomeFuncao_(action){ return 'api_' + action.replace(/[A-Z]/g, m=>'_' + m.toLowerCase()); }
async function sbRpc_(fn, corpo){
  let s = sbSessaoLer_(); if(!s) throw new SbSessaoExpirada_();
  if(Date.now() > s.expira){ if(!(await sbRenovar_())) throw new SbSessaoExpirada_(); s = sbSessaoLer_(); }
  const chamar = ()=>sbJson_(SUPABASE_URL_ + '/rest/v1/rpc/' + fn, { method:'POST', headers:{ 'apikey': SUPABASE_CHAVE_, 'Authorization': 'Bearer ' + s.access_token, 'Content-Type':'application/json' }, body: JSON.stringify(corpo) }, 30000);
  let r = await chamar();
  if(r.status === 401){ if(!(await sbRenovar_())) throw new SbSessaoExpirada_(); s = sbSessaoLer_(); r = await chamar(); if(r.status === 401) throw new SbSessaoExpirada_(); }
  const j = await r.json().catch(()=>null);
  if(!r.ok) return { ok:false, message:'Não foi possível salvar' + (j && j.message ? ' (' + j.message + ')' : ' (erro ' + r.status + ')') + '. Nada foi gravado.' };
  return j && typeof j === 'object' ? j : { ok:false, message:'Resposta inesperada do servidor.' };
}
const SB_IDEM_NOVAS_ = ['pagarFuncionario','registrarCompra','addDespesa','pagarDespesa','registrarAjustePosVenda','cancelarAjustePosVenda','registrarBrinde','addSangria','registrarEntradaEstoque','registrarPerdaEstoque','registrarPerdaProduto','registrarInventarioEstoque','resgatarPremioFidelidade','toggleResgateIndicacao']; // o banco já devolve a resposta guardada se o mesmo pedido chegar duas vezes
async function sbEscrever_(action, payload){
  const mapa = SB_ESCRITAS_[action];
  let chaveIdem = '';
  if(SB_IDEM_NOVAS_.indexOf(action) !== -1 && !(payload && payload.requisicaoId)){ try{ chaveIdem = idemChave_(action, payload); payload = Object.assign({}, payload, { requisicaoId: idemId_(chaveIdem) }); }catch(e){ chaveIdem = ''; } }
  payload = sbAnexarVersao_(action, payload);
  const r = await sbRpc_(sbNomeFuncao_(action), { p: payload || {} });
  if(chaveIdem && r && (r.ok === true || r.ok === false)) idemLimpar_(chaveIdem);
  if(!r || (r.ok !== true && !r.conflito)) return r; // no conflito também devolve o estado atual (como a planilha fazia)
  const { cad, din } = await sbMontarDados_(currentUser ? currentUser.nivel : '', Array.isArray(mapa) ? mapa : Object.keys(mapa).map(k=>mapa[k]));
  const todos = Object.assign({}, cad, din);
  if(Array.isArray(mapa)) mapa.forEach(k=>{ r[k] = todos[k]; });
  else Object.keys(mapa).forEach(k=>{ r[k] = todos[mapa[k]]; });
  return r;
}
/* 4a — AÇÕES PÚBLICAS DO CARDÁPIO (sem login): o cliente fala com o banco só pela chave pública; preços, total, cupom e limites são decididos no servidor. */
const SB_PUBLICAS_ = { criarPedidoCardapio:'api_criar_pedido_cardapio', getStatusPedidoPublico:'api_get_status_pedido_publico', cancelarPedidoCardapioPublico:'api_cancelar_pedido_cardapio_publico', validarCupomCardapio:'api_validar_cupom_cardapio',
  getMesaPublica:'api_get_mesa_publica', criarPedidoMesa:'api_criar_pedido_mesa', cancelarPedidoMesa:'api_cancelar_pedido_mesa', pedirContaMesa:'api_pedir_conta_mesa', chamarGarcomMesa:'api_chamar_garcom_mesa', addFeedback:'api_add_feedback' };
/* chat público: falha de rede vira resposta de erro (antes travava todos os botões do chat) */
function chatRpcSeguro_(fn, corpo){ return sbRpcPublico_(fn, corpo).catch(()=>({ ok:false, message:'Sem conexão agora. Confira a internet e tente de novo.' })); }
async function sbRpcPublico_(fn, corpo){
  /* as RPCs chat_* do banco recebem um único parâmetro jsonb chamado "p": sem esse envelope o PostgREST responde 404 */
  if(/^chat_/.test(fn) && corpo && typeof corpo === 'object' && !Array.isArray(corpo) && !('p' in corpo)) corpo = { p: corpo };
  /* cliente com conta: o pedido e o cupom vão com a sessão dele (o banco sabe quem é). Se a sessão não valer mais, repete como visitante. */
  let bearer = SUPABASE_CHAVE_, comConta = false;
  if((fn === 'api_criar_pedido_cardapio' || fn === 'api_validar_cupom_cardapio' || fn === 'api_add_feedback') && window.contaTokenOuNull_){ try{ const t = await window.contaTokenOuNull_(); if(t){ bearer = t; comConta = true; } }catch(e){} }
  const enviar = ()=>sbJson_(SUPABASE_URL_ + '/rest/v1/rpc/' + fn, { method:'POST', headers:{ 'apikey': SUPABASE_CHAVE_, 'Authorization': 'Bearer ' + bearer, 'Content-Type':'application/json' }, body: JSON.stringify(corpo) }, 30000);
  let r = await enviar();
  if(r.status === 401 && comConta){ try{ window.contaDesativarSessao_(); }catch(e){} bearer = SUPABASE_CHAVE_; comConta = false; r = await enviar(); }
  const j = await r.json().catch(()=>null);
  if(!r.ok) return { ok:false, message:'Não foi possível concluir agora (erro ' + r.status + '). Tente novamente em instantes.' };
  return j && typeof j === 'object' ? j : { ok:false, message:'Resposta inesperada do servidor.' };
}
const SB_NAO_MIGRADA_ = 'Esta ação não está disponível. Nada foi gravado.';
/* Roteador: devolve a resposta no formato antigo, ou undefined se a ação não for tratada aqui (não acontece com o Supabase ligado). */
let _sbDespMes_ = '';
async function sbGarantirDespesasMes_(){ // faz o papel do gatilho diário da planilha: o banco só gera 1x por mês, então a chamada é barata
  const mes = new Date().toISOString().slice(0,7); if(_sbDespMes_ === mes) return;
  const r = await sbRpc_('api_garantir_despesas_do_mes', { p:{} }); if(r && r.ok === true) _sbDespMes_ = mes;
}
async function sbRotear_(action, payload){
  try{
    if(action === 'autenticar'){
      const login = String(payload.login||'').trim();
      const t = await sbTokenPassword_(sbEmail_(login), payload.senha);
      if(t.status === 400 || t.status === 401 || t.status === 422){ sbRpcPublico_('api_registrar_falha_login', { p:{ login } }).catch(()=>{}); }   // registra a tentativa (com o IP, no servidor)
      if(t.status !== 200 || !t.corpo.access_token) return { ok:false, message: (t.status===429 ? 'Muitas tentativas erradas. Aguarde alguns minutos e tente de novo.' : 'Login ou senha incorretos.') };
      sbGuardarTokens_(t.corpo);
      const r = await sbJson_(SUPABASE_URL_ + '/rest/v1/usuarios?select=login,nivel,ativo&id=eq.' + encodeURIComponent(t.corpo.user.id), { headers:{ 'apikey': SUPABASE_CHAVE_, 'Authorization': 'Bearer ' + t.corpo.access_token } }, 20000);
      const linhas = r.ok ? await r.json() : [];
      if(!linhas.length){ sbSessaoGravar_(null); return { ok:false, message:'Login ou senha incorretos.' }; }
      if(!linhas[0].ativo){ sbSessaoGravar_(null); return { ok:false, message:'Este acesso está desativado.' }; }
      sbRpc_('api_registrar_acesso', { p:{} }).catch(()=>{}); pushReinscreverSilencioso_();   // registra o acesso (IP e aparelho são lidos no servidor)
      return { ok:true, login: linhas[0].login, nivel: linhas[0].nivel, token: t.corpo.access_token };
    }
    if(action === 'encerrarSessao'){
      const s = sbSessaoLer_(); if(s) pushSairLocal_(s); sbSessaoGravar_(null);
      if(s) sbJson_(SUPABASE_URL_ + '/auth/v1/logout', { method:'POST', headers:{ 'apikey': SUPABASE_CHAVE_, 'Authorization': 'Bearer ' + s.access_token } }, 8000).catch(()=>{});
      return { ok:true };
    }
    if(SB_PUBLICAS_[action]) return await sbRpcPublico_(SB_PUBLICAS_[action], { p: payload || {} });
    if(action === 'getCardapio') return await sbCardapioPublico_();
    if(action === 'getVersoes') return Object.assign({ ok:true }, (await sbVersoes_()) || sbVersoesDesconhecidas_());
    if(action === 'getAll' || action === 'getDadosGrupo'){
      const nivel = currentUser ? currentUser.nivel : '';
      { const s0 = sbSessaoLer_(); if(s0 && Date.now() > s0.expira){ await sbRenovar_(); } } // renova antes, para as duas chamadas abaixo não renovarem ao mesmo tempo
      const [, verAntesBruto] = await Promise.all([
        (nivel === 'Admin' || nivel === 'Operador') ? sbGarantirDespesasMes_().catch(e=>{ if(e instanceof SbSessaoExpirada_) throw e; }) : Promise.resolve(),
        sbVersoes_()
      ]);
      const verAntes = verAntesBruto || sbVersoesDesconhecidas_(); // carimbo lido ANTES dos dados: se algo mudar no meio, a próxima checagem baixa de novo
      const { cad, din } = await sbMontarDados_(nivel);
      const gestor = (nivel === 'Admin' || nivel === 'Operador');
      const grupo = (gestor && action === 'getDadosGrupo') ? (payload.grupo === 'cad' ? 'cad' : 'din') : '';
      const dados = Object.assign({ ok:true }, grupo === 'din' ? {} : cad, grupo === 'cad' ? {} : din);
      dados.versoes = Object.assign({}, verAntes); if(grupo) dados.grupo = grupo;
      return dados;
    }
    if(SB_ESCRITAS_[action]) return await sbEscrever_(action, payload);
    if(SB_RPC_DIRETO_.indexOf(action) !== -1){
      const r = await sbRpc_(sbNomeFuncao_(action), { p: payload || {} });
      if(action === 'trocarMinhaSenha' && r && r.ok){ const s = sbSessaoLer_(); if(s) r.token = s.access_token; }
      return r;
    }
    if(action === 'uploadFotoProduto' || action === 'uploadFotoCombo') return await sbUploadFoto_(action, payload);   // (Edge Function → Drive)
    if(action === 'excluirFotoProduto' || action === 'excluirFotoCombo') return await sbRemoverFoto_(action, payload);   // Edge Function remover-foto
    // Contingência e Drive: Edge Function planilha-admin (Admin/Operador logado) → Apps Script da planilha principal
    if(action === 'obterArmazenamento') return await sb410Edge_('planilha-admin', { acao:'armazenamento' }, 90000);
    if(action === 'obterArmazenamentoContingencia') return await sb410Edge_('planilha-admin', { acao:'armazenamentoContingencia' }, 90000);
    if(action === 'sincronizarContingenciaAgora') return await sb410Edge_('planilha-admin', { acao:'sincronizarContingencia' }, 150000);
    if(action === 'reconciliarContingenciaAgora') return await sb410Edge_('planilha-admin', { acao:'reconciliarContingencia' }, 150000);
    if(action === 'obterChaveContingencia') return await sb410Edge_('planilha-admin', { acao:'chaveContingencia' }, 30000);
    return { ok:false, naoMigrada:true, message: SB_NAO_MIGRADA_ };
  }catch(e){
    if(e instanceof SbSessaoExpirada_){ sbDiagSessao_('sbRotear_', action); sbSessaoGravar_(null); return { ok:false, sessaoExpirada:true, message:'Sessão expirada.' }; }
    throw e;
  }
}
function sbFaixa_(){
  if(!USAR_SUPABASE_ || document.getElementById('sbFaixa')) return;
  const d = document.createElement('div'); d.id = 'sbFaixa';
  d.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#b45309;color:#fff;font:600 12px/1.3 system-ui,sans-serif;text-align:center;padding:4px 8px;pointer-events:none;';
  _sbFaixaBase_ = '';
  document.body.appendChild(d); sbFaixaTexto_();
}

async function apiCall(action, payload, _tentativa, _idemChave){
  if(_tentativa !== undefined || API_SILENCIOSAS_.has(action)) return _apiCallRaw(action, payload, _tentativa, _idemChave);
  _carregandoInicio_(action);
  try{ return await _apiCallRaw(action, payload, _tentativa, _idemChave); }
  finally{ _carregandoFim_(action); }
}
/* ITEM 2.8 — tela de manutenção (restauração de backup). O servidor responde { manutencao:true } a todos menos o Admin;
   aqui bloqueamos a tela e perguntamos de tempos em tempos se já voltou. Quando volta, recarrega para pegar os dados restaurados. */
let _manutTimer_ = null;
function mostrarManutencao_(msg){
  if(currentUser && currentUser.nivel === 'Admin') return;
  let ov = document.getElementById('manutencaoOverlay');
  if(!ov){
    ov = document.createElement('div'); ov.id = 'manutencaoOverlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(11,7,5,.97);display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;';
    ov.innerHTML = '<div style="max-width:360px;"><div style="font-size:48px;">🛠️</div><h2 style="margin:10px 0 6px;color:var(--gold);">Sistema em manutenção</h2><p style="color:var(--cream);margin:0 0 8px;">Estamos restaurando os dados. Aguarde alguns minutos.</p><p class="txt-muted fs-sm sem-margem">Nada foi perdido. Esta tela some sozinha quando terminar.</p></div>';
    document.body.appendChild(ov);
  }
  ov.style.display = 'flex';
  if(!_manutTimer_){
    _manutTimer_ = setInterval(async ()=>{
      try{
        const r = await apiCall(currentUser ? 'getVersoes' : 'getCardapio', {});
        if(r && !r.manutencao){ clearInterval(_manutTimer_); _manutTimer_ = null; location.reload(); }
      }catch(e){ /* sem internet: continua tentando */ }
    }, 12000);
  }
}
/* MODO RESERVA: funções que só existem no Supabase (sem equivalente na planilha). Com o Supabase fora, respondem NA HORA, sem esperar tempo esgotar. */
const RESERVA_INDISPONIVEL_ = { ifoodFinDados:'iFood: vendas e repasses', ifoodFinAcao:'iFood: vendas e repasses', ipPagamentos:'InfinitePay', ipReembolso:'InfinitePay', ipGerarSegredo:'InfinitePay', pagFormaProvedor:'Pagamentos online', ifoodModulos:'Integrações', ifoodMotivos:'Cancelar pedido do iFood', ifoodMotivoEscolher:'Cancelar pedido do iFood', ifoodCodigosPendentes:'Códigos do iFood', ifoodCodigo:'Códigos do iFood', armazenamentoPainel:'Armazenamento', cardapioHoje:'Cardápio hoje', excluirCupom:'Cupons', errosSistema:'Erros do sistema', ifoodItensExcluir:'Integrações', ifoodMarcarTeste:'Integrações', ifoodPreCadastro:'Integrações', editarSemDesconto:'Marcar item sem desconto', salvarIaExtras:'Integrações e contas', visitasCardapioHoje:'Visitas ao cardápio', salvarAliquotaMes:'Imposto sobre vendas', integracoesFlags:'Integrações', integracoesStatus:'Integrações', integracoesMarcar:'Integrações', integracoesConfig:'Integrações', integracoesSalvarSegredo:'Integrações', integracoesVerSegredo:'Integrações', integracoesLigar:'Integrações', integracoesDesligar:'Integrações', integracoesLog:'Integrações', mpFormaOnline:'Integrações', mpPagamentosRecentes:'Integrações', mpPendenciasDecisao:'Caixa e pagamentos online', mpResumoOperacional:'Relatórios de pagamentos online', mpDecidirPagamento:'Caixa e pagamentos online', fiscalEmpresaLer:'Integrações', fiscalEmpresaSalvar:'Integrações', fiscalPerfis:'Integrações', fiscalPerfilSalvar:'Integrações', fiscalPerfilExcluir:'Integrações', fiscalAtribuir:'Integrações', fiscalSemPerfil:'Integrações', fiscalExportar:'Integrações', fiscalImportar:'Integrações', nfceLista:'Integrações', nfceReemitir:'Integrações', nfceEmitirVenda:'Integrações', nfceCpf:'Integrações', nfceSimular:'Integrações', nfceConferencia:'Integrações', nfceInutilizar:'Integrações', nfcePacote:'Integrações', ifoodPedidos:'Integrações', ifoodPrecos:'Integrações', ifoodPrecosPedirCatalogo:'Integrações', ifoodPrecosAplicar:'Integrações', ifoodPrecosEnviar:'Integrações', ifoodPrecosDesfazer:'Integrações', ifoodFinanceiro:'Integrações', ifoodAvaliacoes:'Integrações', ifoodAvaliacaoResponder:'Integrações', ifoodRelatorio:'Integrações', ifoodLoja:'Integrações', ifoodLojaAcao:'Integrações', ifoodNegociacoes:'Integrações', ifoodAvisos:'Integrações', ifoodCatDiag:'Integrações', ifoodCatDiagPedir:'Integrações',ifoodShipConfig:'Integrações',ifoodShipLista:'Integrações',ifoodShipCotar:'Integrações',ifoodShipChamar:'Integrações',ifoodShipMotivos:'Integrações',ifoodShipCancelar:'Integrações',ifoodShipEndereco:'Integrações',ifoodShipSafe:'Integrações',ifoodBiLer:'Integrações',ifoodBiBuscar:'Integrações', ifoodAvisoVisto:'Integrações', ifoodNegociacaoResponder:'Integrações', ifoodItens:'Integrações', ifoodLigarItem:'Integrações', ifoodHorario:'Integrações', ifoodHorarioSalvar:'Integrações', ifoodHorarioLer:'Integrações', ifoodCat:'Integrações', ifoodCatSalvar:'Integrações', ifoodCatExcluir:'Integrações', ifoodCatEnviar:'Integrações', ifoodCatLote:'Integrações', ifoodLacunas:'Aviso de queda do iFood', ifoodReprocessar:'Integrações', ifoodSimular:'Integrações', listarChavesIa:'Contas e acessos', verChaveIa:'Contas e acessos', salvarChaveIa:'Contas e acessos', listarContas:'Contas e acessos', salvarConta:'Contas e acessos', excluirConta:'Contas e acessos', verSenhaConta:'Contas e acessos', saudeSistema:'Saúde do sistema', salvarCardapioFechamento:'Abrir ou fechar o cardápio', listarCompras:'Compras e fornecedores', registrarCompra:'Compras e fornecedores', receberCompra:'Compras e fornecedores', cancelarCompra:'Compras e fornecedores', estornarCompra:'Compras e fornecedores', editarCompraInfo:'Compras e fornecedores', salvarFornecedor:'Compras e fornecedores',
  pontoMeusRegistros:'Meus registros de ponto', pontoPedidoCriar:'Pedido de ponto', pontoPedidosLista:'Pedidos de ponto', pontoPedidoFoto:'Foto do atestado', pontoPedidoDecidir:'Decisão do pedido de ponto', pontoFechamento:'Fechamento do ponto', pontoFechamentoSalvar:'Fechamento do ponto',
  ifoodTestar:'Teste de conexão do iFood', ifoodConferencia:'Conferência dos repasses do iFood', ifoodRastreios:'Entregador do iFood', marcarAparelhoEquipe:'Aparelho da equipe', listarReembolsos:'Reembolsos', confirmarReembolso:'Reembolsos', salvarPrecosLote:'Preços em lote', ajustarPrecosProdutosLote:'Ajuste de preços em lote', precoHistorico:'Histórico de preços', margemAlerta:'Margem baixa', margemConfigSalvar:'Margem baixa', margemIgnorar:'Margem baixa', margemSugestao:'Margem baixa', estoqueSugestao:'Compra sugerida', eventoHorasSalvar:'Eventos', eventoRendimento:'Eventos', equipeFolha:'Equipe e pagamentos', escalaSemana:'Escala', salvarTurno:'Escala', escalaPadraoSalvar:'Escala', escalaAplicarPadrao:'Escala', escalaCopiarSemana:'Escala', equipeImportarAcessos:'Equipe e pagamentos', minhaEscala:'Escala', salvarFuncionario:'Equipe e pagamentos', pagarFuncionario:'Equipe e pagamentos', eventoMovimentos:'Central de Eventos', cancelarMovimentoEvento:'Central de Eventos', escalaAvisar:'Escala da equipe', trocaSolicitar:'Escala da equipe', trocaResponder:'Escala da equipe', trocaDecidir:'Escala da equipe', trocasLista:'Escala da equipe', pontoEstado:'Ponto', pontoBater:'Ponto', pontoLocal:'Ponto', pontoRostoConfig:'Ponto', pontoRostoApagar:'Ponto', pontoAprovar:'Ponto', evidenciasLista:'Fotos dos lançamentos', etiquetasLista:'Etiquetas', etiquetaSalvar:'Etiquetas', etiquetaImportarEstoque:'Etiquetas', etiquetaRegistrar:'Etiquetas', pontoRelatorio:'Ponto', pontoAjustar:'Ponto', equipePesoMaoObra:'Equipe e pagamentos', equipeReserva:'Equipe e pagamentos', espacoHistorico:'Backup e espaço', armazenamentoPainel:'Armazenamento', cancelarPagamentoFuncionario:'Equipe e pagamentos', visibilidadeLoteProdutos:'Cardápio em lote', pushInscrever:'Avisos com o app fechado', pushCancelar:'Avisos com o app fechado', listarAuditoria:'Auditoria', listarSessoes:'Sessões abertas', encerrarSessaoRemota:'Sessões abertas', simularPrecificacao:'Calculadora de preço', salvarCupom:'Cupons', salvarEvento:'Eventos' };
async function _apiCallRaw(action, payload, _tentativa, _idemChave){
  if(RESERVA_INDISPONIVEL_[action] && typeof _sb5Reserva_ !== 'undefined' && _sb5Reserva_) return { ok:false, reserva:true, message:'Modo reserva: "' + RESERVA_INDISPONIVEL_[action] + '" fica indisponível até o Supabase voltar. Nada foi gravado.' };
  if(currentUser && currentUser.emergencia) throw new Error('Modo emergência: este aparelho não fala com a planilha principal'); // BLOCO 1.3 (age como falha de rede: nada é gravado nem apagado)
  payload = payload || {};
  if(USAR_SUPABASE_){ const _rsb = await sbRotear_(action, payload); if(_rsb !== undefined){ if(_rsb && _rsb.sessaoExpirada){ try{ _fila.forEach(i=>{ if(i.estado==='pendente' || i.estado==='retry' || i.estado==='enviando'){ i.estado='erro'; i.erro='Sessão expirada — entre de novo e toque em "Tentar de novo"'; } }); filaSalvar_(); }catch(e){} localStorage.removeItem(SESSAO_KEY); localStorage.removeItem(CONTINGENCIA_CHAVE_KEY); localStorage.removeItem(CACHE_KEY); currentUser = null; avisar('Sua sessão expirou. Faça login novamente.'); location.reload(); } if(_rsb && (_rsb.conflito || _rsb.duplicado)) atualizarAposDuplicado_(); else if(_rsb && _rsb.ok === true && SB_REFRESH_APOS_.has(action)) setTimeout(atualizarAposDuplicado_, 400); return _rsb; } }
  // O caminho antigo (envio direto para a planilha) foi retirado: com o Supabase ligado, sbRotear_ sempre responde.
  return { ok:false, naoMigrada:true, message: SB_NAO_MIGRADA_ };
}
/* O servidor recusou uma repetição: o dado local pode estar defasado, então puxa o estado real. */
async function atualizarAposDuplicado_(){
  try{
    const d = await apiCall('getAll', {});
    aplicarDadosRecebidos(d); salvarCache();
    if(seguroParaSincronizar()) renderizarTudo();
  }catch(e){ /* sem problema: a sincronização automática pega depois */ }
}
/* POP-UPS DE CADASTRO: abrir/fechar. Fechar pelo ✕ guarda o que foi digitado (rascunho), exceto senhas, que sempre são apagadas.
   Enquanto um pop-up está aberto a tela não é atualizada em segundo plano (ver regra de ".modal-overlay.open"). */
function abrirFormModal(id){ const m = document.getElementById(id); if(m){ m.classList.add('open'); const box = m.querySelector('.modal-box'); if(box) box.scrollTop = 0; m.scrollTop = 0; } }
function fecharFormModal(id){ const m = document.getElementById(id); if(!m) return; m.classList.remove('open'); m.querySelectorAll('input[type=password]').forEach(i=>{ i.value=''; }); }
function showMsg(id, text, type){
  const el = document.getElementById(id);
  el.textContent = text; el.className = 'msg ' + type;
  clearTimeout(el._t); el._t = setTimeout(()=>{ el.className='msg'; }, 6000);
}
function setBotoesOcupados(ocupado){
  ['pBtn','vBtn','despBtn','koBtn','eBtn'].forEach(id=>{ const el=document.getElementById(id); if(el) el.disabled = ocupado; });
  if(!ocupado) atualizarBloqueioVendaOffline(); // vBtn continua travado se estiver sem conexão
}
function ativarMascaraTelefone(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.addEventListener('input', ()=>{
    const d = el.value.replace(/\D/g,'').slice(0,11);
    let f = d;
    if(d.length<=2) f = d.replace(/^(\d*)/, '($1');
    else if(d.length<=6) f = d.replace(/^(\d{2})(\d*)/, '($1) $2');
    else if(d.length<=10) f = d.replace(/^(\d{2})(\d{4})(\d*)/, '($1) $2-$3');
    else f = d.replace(/^(\d{2})(\d{5})(\d*)/, '($1) $2-$3');
    el.value = f;
  });
}
['mTelefone','ndTelefone'].forEach(ativarMascaraTelefone);

/* ---------- CÓPIA COM FALLBACK (2 métodos) ---------- */
function copiarTextoComFallback(texto, msgElId){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(texto).then(()=>{ showMsg(msgElId, 'Copiado!', 'ok'); }).catch(()=>{ copiarViaTextarea(texto, msgElId); });
  } else { copiarViaTextarea(texto, msgElId); }
}
function copiarViaTextarea(texto, msgElId){
  try{
    const ta = document.getElementById('copyHelperTextarea');
    ta.value = texto; ta.style.top = '0'; ta.style.left = '0'; ta.focus(); ta.select();
    const ok = document.execCommand('copy');
    ta.style.top = '-1000px'; ta.style.left = '-1000px';
    showMsg(msgElId, ok ? 'Copiado!' : 'Não foi possível copiar automaticamente — selecione o texto acima e copie manualmente.', ok ? 'ok' : 'warn');
  } catch(e){ showMsg(msgElId, 'Não foi possível copiar automaticamente — selecione o texto acima e copie manualmente.', 'warn'); }
}

/* ============================================================
   LOGIN / SESSÃO / PERMISSÕES
   ============================================================ */
/* ITEM 2.1 — identificação do aparelho. O deviceId fica no localStorage (sobrevive a logout) e vai junto no login;
   o servidor guarda na sessão para o Admin ver "quem está logado onde". Não é segurança forte (o usuário pode limpar o
   armazenamento) — é rastro e visibilidade. */
function deviceId_(){
  try{
    let d = localStorage.getItem('tb_device_id');
    if(!d || !/^[A-Za-z0-9-]{8,40}$/.test(d)){
      d = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('d' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
      localStorage.setItem('tb_device_id', d);
    }
    return d;
  }catch(e){ return ''; }
}
function resumoNavegador_(){
  const u = navigator.userAgent || '';
  const so = /Android/i.test(u) ? 'Android' : /iPhone|iPad|iPod/i.test(u) ? 'iOS' : /Windows/i.test(u) ? 'Windows' : /Mac OS X/i.test(u) ? 'macOS' : /Linux/i.test(u) ? 'Linux' : 'SO?';
  const nav = /Edg\//.test(u) ? 'Edge' : /OPR\/|Opera/.test(u) ? 'Opera' : /Firefox\//.test(u) ? 'Firefox' : /Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : 'Navegador?';
  return nav + ' · ' + so;
}
/* ============================================================
   BLOCO 1.3 — ACESSO DE EMERGÊNCIA (planilha principal fora do ar)
   Quem entrou com sucesso (Admin/Operador) deixa neste aparelho, por 30 dias, uma "credencial de emergência":
   só uma verificação da senha (PBKDF2, nunca a senha), a chave interna da contingência e uma cópia do catálogo
   (produtos, preços, formas de pagamento) — SEM clientes, vendas ou financeiro. Ela sobrevive ao "Sair".
   Se a planilha estiver fora do ar na hora do login, a senha é conferida aqui mesmo e o aparelho entra em MODO EMERGÊNCIA:
   só a venda do Caixa pela contingência (sem desconto, sem mesa), nenhuma chamada à planilha. Assim que a planilha responde,
   a sessão de emergência é encerrada e o login normal é exigido. Cada login normal renova o prazo; um login recusado
   ("desativado" / senha incorreta) apaga a credencial. */
const EMERGENCIA_KEY_ = 'txbEmergencia_v1', EMERGENCIA_FALHAS_KEY_ = 'txbEmergenciaFalhas_v1';
const EMERGENCIA_TTL_MS_ = 30*24*3600*1000, EMERGENCIA_PBKDF2_ = 150000, EMERGENCIA_CATALOGO_MS_ = 10*60*1000;
function emergenciaSuportada_(){ return !!(window.crypto && crypto.subtle && crypto.getRandomValues && window.TextEncoder); }
function emergenciaLer_(){
  let o = null;
  try{ o = JSON.parse(localStorage.getItem(EMERGENCIA_KEY_) || 'null'); }catch(e){}
  if(!o || o.v !== 1 || !o.usuarios || typeof o.usuarios !== 'object') o = { v:1, usuarios:{}, chave:'', catalogo:null, catalogoEm:0 };
  Object.keys(o.usuarios).forEach(k=>{ if(!o.usuarios[k] || Number(o.usuarios[k].expira) < Date.now()) delete o.usuarios[k]; }); // vencidas somem
  return o;
}
function emergenciaGravar_(o){ try{ localStorage.setItem(EMERGENCIA_KEY_, JSON.stringify(o)); return true; }catch(e){ return false; } }
function emergenciaB64_(buf){ let t = ''; new Uint8Array(buf).forEach(b=>{ t += String.fromCharCode(b); }); return btoa(t); }
function emergenciaB64Bytes_(t){ return Uint8Array.from(atob(t), c=>c.charCodeAt(0)); }
async function emergenciaHash_(senha, saltB64){
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(senha)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name:'PBKDF2', hash:'SHA-256', salt: emergenciaB64Bytes_(saltB64), iterations: EMERGENCIA_PBKDF2_ }, km, 256);
  return emergenciaB64_(bits);
}
/* chamada depois de um login NORMAL bem-sucedido (e depois de trocar a própria senha): cria/renova a credencial deste usuário */
async function emergenciaRegistrar_(login, senha, nivel){
  if(!emergenciaSuportada_() || ['Admin','Operador'].indexOf(nivel) === -1) return;
  try{
    const salt = emergenciaB64_(crypto.getRandomValues(new Uint8Array(16)));
    const hash = await emergenciaHash_(senha, salt);
    const o = emergenciaLer_();
    o.usuarios[String(login).toLowerCase()] = { login: String(login), nivel: nivel, salt: salt, hash: hash, expira: Date.now() + EMERGENCIA_TTL_MS_ };
    const k = localStorage.getItem(CONTINGENCIA_CHAVE_KEY); if(k) o.chave = k;
    emergenciaGravar_(o);
  }catch(e){}
}
function emergenciaGuardarChave_(chave){
  try{ const o = emergenciaLer_(); if(chave && o.chave !== chave){ o.chave = chave; emergenciaGravar_(o); } }catch(e){}
}
function emergenciaRemover_(login){
  try{ const o = emergenciaLer_(); delete o.usuarios[String(login).toLowerCase()]; emergenciaGravar_(o); }catch(e){}
}
/* cópia do catálogo para o modo emergência; chamada pelo salvarCache() de quem tem credencial registrada, no máximo a cada 10 min */
function emergenciaSalvarCatalogo_(){
  if(!currentUser || currentUser.emergencia || !currentUser.login || ['Admin','Operador'].indexOf(currentUser.nivel) === -1) return;
  try{
    const o = emergenciaLer_();
    if(!o.usuarios[String(currentUser.login).toLowerCase()]) return;
    const k = localStorage.getItem(CONTINGENCIA_CHAVE_KEY); if(k) o.chave = k;
    if(Date.now() - (o.catalogoEm || 0) < EMERGENCIA_CATALOGO_MS_ && o.catalogo){ emergenciaGravar_(o); return; }
    if(!produtos.length && !combos.length) return; // nada útil para guardar (ex.: dados ainda não chegaram)
    o.catalogo = { produtos, produtoPrecos, combos, comboPrecos, comboItens, adicionais, produtoAdicionais, formasPagamento, categorias, configCardapio, configEntrega, sessaoCaixa };
    o.catalogoEm = Date.now();
    emergenciaGravar_(o);
  }catch(e){}
}
function emergenciaAplicarCatalogo_(){
  const c = emergenciaLer_().catalogo; if(!c) return false;
  normalizarNumerosDados_(c);
  produtos = c.produtos||[]; produtoPrecos = c.produtoPrecos||[]; combos = c.combos||[]; comboPrecos = c.comboPrecos||[]; comboItens = c.comboItens||[];
  adicionais = c.adicionais||[]; produtoAdicionais = c.produtoAdicionais||[]; formasPagamento = c.formasPagamento||[]; categorias = c.categorias||[];
  if(c.configCardapio) configCardapio = c.configCardapio;
  if(c.configEntrega) configEntrega = c.configEntrega;
  sessaoCaixa = c.sessaoCaixa || null; // o último estado conhecido do caixa; sem caixa aberto, o próprio Caixa recusa a venda
  if(!formaPrecoAtual && formasPagamento.length) formaPrecoAtual = (formasPagamento.find(f=>f.ativa) || formasPagamento[0]).id;
  return true;
}
function emergenciaFalhas_(){ try{ return JSON.parse(localStorage.getItem(EMERGENCIA_FALHAS_KEY_) || '{}') || {}; }catch(e){ return {}; } }
/* Devolve 'ok' (entrou), 'cancelou', 'senha' (não confere), 'bloqueado' (5 erros = 5 min) ou 'indisponivel' (não há credencial/chave/catálogo) */
async function emergenciaTentarEntrar_(login, senha){
  if(!emergenciaSuportada_()) return 'indisponivel';
  const o = emergenciaLer_(), rec = o.usuarios[String(login).toLowerCase()];
  if(!rec || !o.chave || !o.catalogo) return 'indisponivel';
  const fa = emergenciaFalhas_();
  if(fa.ate && fa.ate > Date.now()) return 'bloqueado';
  let h = '';
  try{ h = await emergenciaHash_(senha, rec.salt); }catch(e){ return 'indisponivel'; }
  if(h !== rec.hash){
    const n = (fa.ate && fa.ate <= Date.now() ? 0 : (fa.n || 0)) + 1;
    try{ localStorage.setItem(EMERGENCIA_FALHAS_KEY_, JSON.stringify(n >= 5 ? { n:0, ate: Date.now() + 300000 } : { n:n, ate:0 })); }catch(e){}
    return 'senha';
  }
  try{ localStorage.removeItem(EMERGENCIA_FALHAS_KEY_); }catch(e){}
  if(!await confirmarTxt_('O servidor (Supabase) está fora do ar.\n\nEntrar em MODO EMERGÊNCIA como ' + rec.login + '?\n\n• Só dá para registrar vendas do Caixa (retirada/entrega, sem desconto), pela contingência.\n• Preços e produtos são os da última vez que este aparelho falou com o servidor.\n• Quando o servidor voltar, o app pede seu login de novo.', 'Entrar em emergência', false, 'Servidor fora do ar')) return 'cancelou';
  localStorage.setItem(CONTINGENCIA_CHAVE_KEY, o.chave);
  currentUser = { login: rec.login, nivel: rec.nivel, token: '', emergencia: true }; // nunca vai para o SESSAO_KEY: recarregar a página exige entrar de novo
  entrarNoApp();
  return 'ok';
}
function emergenciaBanner_(txt){
  let b = document.getElementById('emergenciaBanner');
  if(!b){
    b = document.createElement('div'); b.id = 'emergenciaBanner';
    b.style.cssText = 'position:sticky;top:0;z-index:9000;background:#b45309;color:#fff;font-weight:700;font-size:13px;text-align:center;padding:8px 10px;';
    document.body.insertBefore(b, document.body.firstChild);
  }
  b.textContent = txt;
}
function emergenciaEncerrar_(){
  try{ localStorage.removeItem(CONTINGENCIA_CHAVE_KEY); }catch(e){}
  currentUser = null;
  confirmar({ titulo:'O servidor voltou', texto:'Por segurança, entre de novo com seu login e senha.', ok:'Entrar de novo', somenteOk:true }).then(()=>location.reload());
}
/* a cada 30 s pergunta à planilha (ação pública, sem sessão) se ela voltou; com carrinho em andamento só avisa e espera a venda terminar */
let _emergVigiaTimer_ = null;
function emergenciaVigiar_(){
  if(_emergVigiaTimer_) return;
  _emergVigiaTimer_ = setInterval(async ()=>{
    if(!currentUser || !currentUser.emergencia) return;
    /* o modo emergência abre quando o SUPABASE cai — então é ele que precisa ter voltado (antes conferia a planilha) */
    try{ if(typeof sb5Sondar_ === 'function' && !(await sb5Sondar_())) return; }catch(e){ return; }
    if(carrinhoAtual.length){ emergenciaBanner_('🟢 O servidor voltou — termine esta venda; depois o app pedirá seu login de novo'); return; }
    emergenciaEncerrar_();
  }, 30000);
}
/* "Lembrar neste aparelho": com a caixinha marcada o navegador/celular passa a oferecer salvar o login e a senha no gerenciador de senhas
   do próprio aparelho (cofre com digital/PIN). O sistema NÃO guarda a senha. Desmarcada (padrão) = como sempre foi. */
function loginLembrarAlternar_(){
  const cb = document.getElementById('loginLembrar'), u = document.getElementById('loginUsuario'), s = document.getElementById('loginSenha'), f = document.getElementById('formLogin');
  if(!cb || !u || !s) return;
  const on = !!cb.checked;
  u.setAttribute('autocomplete', on ? 'username' : 'off'); s.setAttribute('autocomplete', on ? 'current-password' : 'off');
  if(f) f.setAttribute('autocomplete', on ? 'on' : 'off');
  try{ localStorage.setItem('txbLembrarLogin', on ? '1' : '0'); }catch(e){}
}
(function(){ try{ const cb = document.getElementById('loginLembrar'); if(cb && localStorage.getItem('txbLembrarLogin') === '1'){ cb.checked = true; loginLembrarAlternar_(); } }catch(e){} })();
async function tentarLogin(){
  try{ desbloquearAudio_(); if('Notification' in window && Notification.permission==='default') Notification.requestPermission(); }catch(e){}
  const login = document.getElementById('loginUsuario').value.trim();
  const senha = document.getElementById('loginSenha').value;
  if(!login || !senha){ document.getElementById('lockErro').textContent='Preencha login e senha.'; document.getElementById('lockErro').style.display='block'; return; }
  if(!apiConfigurada()){ document.getElementById('lockErro').textContent='Página ainda não conectada ao servidor.'; document.getElementById('lockErro').style.display='block'; return; }
  const erroLogin_ = (t)=>{ const el = document.getElementById('lockErro'); el.textContent = t; el.style.display = 'block'; };
  let r = null, semPlanilha = false;
  try{
    r = await apiCall('autenticar', { login, senha, deviceId: deviceId_(), ua: resumoNavegador_() });
    if(r && r.timeout) semPlanilha = true;
  } catch(e){ semPlanilha = true; }
  if(semPlanilha){ // BLOCO 1.3: planilha fora do ar -> tenta a credencial de emergência guardada neste aparelho
    const res = await emergenciaTentarEntrar_(login, senha);
    if(res === 'ok' || res === 'cancelou') return;
    erroLogin_(res === 'senha' ? 'Servidor fora do ar e a senha não confere com a guardada neste aparelho.'
      : res === 'bloqueado' ? 'Muitas tentativas erradas. Aguarde 5 minutos.'
      : 'Não foi possível conectar ao servidor.');
    return;
  }
  if(r.ok){
    currentUser = { login: r.login, nivel: (r.nivel === 'Desenvolvedor' ? 'Admin' : r.nivel), nivelReal: r.nivel, token: r.token };
    localStorage.setItem(SESSAO_KEY, JSON.stringify(currentUser));
    emergenciaRegistrar_(r.login, senha, r.nivel); // BLOCO 1.3: cria/renova o acesso de emergência por 30 dias
    entrarNoApp();
  } else {
    if(/desativado|Login ou senha incorretos/i.test(r.message || '')) emergenciaRemover_(login); // acesso recusado pela planilha: apaga a credencial de emergência
    erroLogin_(r.message);
  }
}
function entrarNoApp(){
  try{ localStorage.setItem('cdAparelhoEquipe', '1'); }catch(e){}   // aparelho da equipe: não conta visita ao cardápio
  try{ const ap_ = localStorage.getItem('cdAparelhoId'); if(ap_) setTimeout(()=>{ try{ apiCall('marcarAparelhoEquipe',{aparelho:ap_}); }catch(e){} }, 2500); }catch(e){}   // avisa o banco: visitas deste aparelho não contam
  garantirChaveContingencia_();
  garantirChaveLeitura_();
  document.getElementById('lockScreen').classList.add('hidden');
  document.getElementById('cardapioPublico').classList.add('hidden');
  document.getElementById('cdFabCarrinho').classList.remove('show');
  document.getElementById('mainWrap').classList.add('unlocked');
  document.getElementById('userbarTexto').textContent = rotuloBarraUsuario_();
  aplicarPermissoesNivel();
  try{ rtIniciar_(); }catch(e){}
  if(currentUser.emergencia){ // BLOCO 1.3: modo emergência = só o Caixa
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('hidden-tab', b.dataset.tab !== 'caixa'));
    document.querySelectorAll('.atalho-btn').forEach(b=>{ b.style.display = 'none'; });
    const bc = document.querySelector('.tab-btn[data-tab="caixa"]'); if(bc) bc.click();
    emergenciaBanner_('🟠 MODO EMERGÊNCIA — servidor fora do ar. Só vendas do Caixa, pela contingência.');
  }
  sbFaixa_();
  init();
  try{ if(!currentUser.emergencia && typeof carregarIntegFlags_==='function') carregarIntegFlags_(); }catch(e){}
  try{ if(typeof sb410IniciarAlertaBackup_==='function') sb410IniciarAlertaBackup_(); }catch(e){}
  setTimeout(oferecerRecuperarCarrinho_, 800);  // ITEM 2.7
  try{ requestAnimationFrame(()=>requestAnimationFrame(()=>{ if(window.txbSplashFim_) window.txbSplashFim_(); })); }catch(e){ if(window.txbSplashFim_) window.txbSplashFim_(); }   // tira a tela de abertura (logo) só depois do sistema desenhado
}
/* abas visíveis por perfil (a barra continua sendo a mesma de 7 abas; o backend valida cada ação de qualquer forma) */
const NAV_POR_PERFIL_ = { 'Cozinha':['inicio','pedidos','notificacoes'], 'Garçom':['inicio','caixa','pedidos','clientes'], 'Entregador':['inicio','pedidos','meusganhos'] };
function aplicarPermissoesNivel(){
  const ehDesenvolvedor = !!(currentUser && currentUser.nivelReal === 'Desenvolvedor');
  const admin = currentUser && currentUser.nivel === 'Admin';
  const entregador = currentUser && currentUser.nivel === 'Entregador';
  let primeiroVisivel = null;
  const nivelAtual = currentUser ? currentUser.nivel : '';
  const abasDoPerfil = NAV_POR_PERFIL_[nivelAtual];
  document.body.classList.toggle('perfil-cozinha', nivelAtual==='Cozinha');
  document.body.classList.toggle('perfil-garcom', nivelAtual==='Garçom');
  document.body.classList.toggle('perfil-entregador', nivelAtual==='Entregador');
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    let visivel;
    if(abasDoPerfil) visivel = abasDoPerfil.indexOf(btn.dataset.tab) !== -1;
    else if(entregador) visivel = btn.dataset.entregadorOk === '1';
    else { const restrito = btn.dataset.admin === '1'; visivel = !restrito || admin || (nivelAtual==='Operador' && btn.dataset.tab==='administrador'); }
    if(btn.dataset.tab === 'meusganhos') visivel = (nivelAtual === 'Entregador');
    if(btn.dataset.tab === 'notificacoes') visivel = (nivelAtual === 'Cozinha');   /* Admin/Operador/Dev: os avisos ficam dentro do Assistente (aba "🔔 Avisos") */
    btn.classList.toggle('hidden-tab', !visivel);
    if(visivel && !primeiroVisivel) primeiroVisivel = btn;
  });
  const ativoAtual = document.querySelector('.tab-btn.active');
  if((!ativoAtual || ativoAtual.classList.contains('hidden-tab')) && primeiroVisivel) primeiroVisivel.click();
  document.querySelectorAll('.atalho-btn').forEach(b=>{
    const m = (b.getAttribute('onclick')||'').match(/data-tab=(\w+)/);
    if(m){ const t = document.querySelector('[data-tab='+m[1]+']'); b.style.display = (t && t.classList.contains('hidden-tab')) ? 'none' : ''; }
  });
  const ROT_ = { 'Garçom':{caixa:'Atendimento'}, 'Cozinha':{pedidos:'Cozinha'}, 'Entregador':{pedidos:'Minhas entregas'}, 'Operador':{administrador:'Operação'} };
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    const tn = btn.firstChild && btn.firstChild.nodeType===3 ? btn.firstChild : null; if(!tn) return;
    if(btn.dataset.rotOrig===undefined) btn.dataset.rotOrig = tn.textContent;
    tn.textContent = (ROT_[nivelAtual]||{})[btn.dataset.tab] || btn.dataset.rotOrig;
  });
  if(nivelAtual==='Cozinha' || nivelAtual==='Entregador'){ const bp = document.querySelector('.tab-btn[data-tab="pedidos"]'); if(bp && !bp.classList.contains('hidden-tab')) bp.click(); }
  if(nivelAtual==='Garçom'){ setTipoEntrega('Mesa'); setModoCliente('sem'); mudarPainelCaixa('cliente'); }
  if(['Cozinha','Admin','Operador','Garçom','Entregador'].indexOf(nivelAtual)!==-1 && !currentUser.emergencia) iniciarDetectorCozinha();
  const bgb = document.getElementById('buscaGlobalBtn'); if(bgb) bgb.style.display = bgPodeBuscar_() ? '' : 'none';
  pedidosPainel_(nivelAtual==='Entregador' ? 'entregas' : 'pedidos');
  atualizarCardAvisos_();
  const barra = document.getElementById('devBar');
  if(barra){
    barra.style.display = ehDesenvolvedor ? 'block' : 'none';
    const sel = document.getElementById('devVerComo');
    if(sel && ehDesenvolvedor) devPopularVisoes_();
    if(ehDesenvolvedor){
      const trocado = currentUser.nivel !== 'Admin';
      barra.style.borderColor = trocado ? '#e0b53a' : '#4caf50';
      barra.style.background = trocado ? '#241d0d' : '#122213';
    }
  }
}
function loginVisao_(){ return currentUser ? (currentUser.verComo || currentUser.login) : ''; }
function rotuloBarraUsuario_(){
  if(!currentUser) return '';
  if(currentUser.nivelReal !== 'Desenvolvedor') return currentUser.login + ' · ' + currentUser.nivel;
  if(!currentUser.verComo) return currentUser.login + ' · Desenvolvedor';
  const u = (typeof usuarios !== 'undefined' ? usuarios : []).find(x=>String(x.login).toLowerCase()===String(currentUser.verComo).toLowerCase());
  return currentUser.login + ' · Desenvolvedor (vendo como ' + currentUser.nivel + ' — ' + ((u && u.nome) || currentUser.verComo) + ')';
}
/* Seletor do modo Desenvolvedor: lista as PESSOAS (ex.: Entregador — João), não só os perfis. */
function devPopularVisoes_(){
  const sel = document.getElementById('devVerComo'); if(!sel || !currentUser || currentUser.nivelReal !== 'Desenvolvedor') return;
  const ordem = ['Operador','Garçom','Cozinha','Entregador'], rot = { 'Operador':'Operador de caixa', 'Garçom':'Garçom', 'Cozinha':'Cozinha', 'Entregador':'Entregador' };
  const lista = (typeof usuarios !== 'undefined' ? usuarios : []).filter(u=>u.ativo && ordem.indexOf(u.nivel)!==-1)
    .sort((a,b)=>ordem.indexOf(a.nivel)-ordem.indexOf(b.nivel) || String(a.login).localeCompare(String(b.login)));
  const html = '<option value="Admin">Admin (visão normal)</option>' + lista.map(u=>'<option value="'+escH(u.login)+'">'+rot[u.nivel]+' — '+escH(u.nome||u.login)+'</option>').join('');
  if(sel.dataset.sig !== html){ sel.innerHTML = html; sel.dataset.sig = html; }
  sel.value = currentUser.verComo || 'Admin';
}
function devMudarVisao(valor){
  if(!currentUser || currentUser.nivelReal !== 'Desenvolvedor') return;
  let nivel = 'Admin', quem = '';
  if(valor && valor !== 'Admin'){
    const u = (typeof usuarios !== 'undefined' ? usuarios : []).find(x=>String(x.login).toLowerCase()===String(valor).toLowerCase());
    if(!u || ['Operador','Garçom','Cozinha','Entregador'].indexOf(u.nivel) === -1) return;
    nivel = u.nivel; quem = u.login;
  }
  currentUser.nivel = nivel; currentUser.verComo = quem;
  document.getElementById('userbarTexto').textContent = rotuloBarraUsuario_();
  aplicarPermissoesNivel();
  try{ renderizarTudo(); }catch(e){ if(window.erroTela_) erroTela_(e); }
  const primeiro = document.querySelector('.tab-btn:not(.hidden-tab)');
  if(primeiro) primeiro.click();
}
/* quem fez login (Admin, Operador, Garçom) recebe da planilha principal a chave INTERNA da contingência
   e a guarda neste aparelho, para conseguir ler a parte interna do espelho (clientes) se a principal cair.
   Cozinha e Entregador não recebem. A chave é apagada ao sair ou quando a sessão expira. */
function garantirChaveContingencia_(){
  try{
    if(!currentUser || currentUser.emergencia || ['Admin','Operador'].indexOf(currentUser.nivel)===-1) return;
    if(localStorage.getItem(CONTINGENCIA_CHAVE_KEY)) return;
    apiCall('obterChaveContingencia', {}).then(r=>{ if(r && r.ok && r.chave){ localStorage.setItem(CONTINGENCIA_CHAVE_KEY, r.chave); emergenciaGuardarChave_(r.chave); } }).catch(()=>{});
  } catch(e){}
}
/* troca da própria senha (qualquer perfil). O servidor devolve um token novo; sem ele este aparelho cairia no login. */
let spOcupado = false;
function abrirModalTrocarSenha(){
  ['spAtual','spNova','spConfirma'].forEach(id=>{ const el=document.getElementById(id); el.value=''; el.type='password'; });
  document.getElementById('spMostrar').checked = false;
  const msg = document.getElementById('spMsg'); msg.textContent = ''; msg.className = 'msg';
  document.getElementById('spBtn').disabled = false; spOcupado = false;
  document.getElementById('senhaPropriaModal').classList.add('open');
}
function fecharModalTrocarSenha(){
  ['spAtual','spNova','spConfirma'].forEach(id=>{ document.getElementById(id).value=''; });
  document.getElementById('senhaPropriaModal').classList.remove('open');
}
function spAlternarVisivel(){
  const t = document.getElementById('spMostrar').checked ? 'text' : 'password';
  ['spAtual','spNova','spConfirma'].forEach(id=>{ document.getElementById(id).type = t; });
}
async function confirmarTrocarSenha(){
  if(spOcupado) return;
  const atual = document.getElementById('spAtual').value, nova = document.getElementById('spNova').value, conf = document.getElementById('spConfirma').value;
  const msg = document.getElementById('spMsg'), btn = document.getElementById('spBtn');
  const erro = (t)=>{ msg.textContent = t; msg.className = 'msg warn'; };
  if(!atual || !nova || !conf){ erro('Preencha os três campos.'); return; }
  if(nova.length < 8){ erro('A nova senha precisa ter ao menos 8 caracteres.'); return; }
  if(nova !== conf){ erro('A confirmação não é igual à nova senha.'); return; }
  if(nova === atual){ erro('A nova senha precisa ser diferente da atual.'); return; }
  spOcupado = true; btn.disabled = true; msg.textContent = 'Salvando...'; msg.className = 'msg';
  try{
    const r = await apiCall('trocarMinhaSenha', { senhaAtual: atual, novaSenha: nova });
    if(r && r.ok && r.token){
      currentUser.token = r.token;
      localStorage.setItem(SESSAO_KEY, JSON.stringify(currentUser));
      emergenciaRegistrar_(currentUser.login, nova, currentUser.nivel); // BLOCO 1.3: a senha de emergência acompanha a nova senha
      msg.textContent = r.message; msg.className = 'msg ok';
      ['spAtual','spNova','spConfirma'].forEach(id=>{ document.getElementById(id).value=''; });
      setTimeout(fecharModalTrocarSenha, 1500);
    } else { erro((r && r.message) || 'Não foi possível trocar a senha.'); spOcupado = false; btn.disabled = false; }
  } catch(e){ erro('Sem conexão com o servidor. Tente de novo.'); spOcupado = false; btn.disabled = false; }
}
async function sair(){
  if(sessaoCaixa){
    if(!await confirmarTxt_('O caixa ainda está aberto. Tem certeza que quer sair?', 'Sair mesmo assim', true, 'Caixa aberto')) return;
  }
  /* A fila offline fica neste aparelho (cadastro de cliente, fidelidade, feedback e ocorrência que ainda não chegaram à planilha).
     Antes de sair, oferece enviar; se não der, deixa o funcionário escolher entre sair mesmo assim ou ficar. */
  if(typeof _fila !== 'undefined' && _fila.length){
    if(await confirmarTxt_('Há ' + _fila.length + ' item(ns) salvo(s) neste aparelho que ainda não chegaram ao servidor.\n\nTentar enviar agora antes de sair?', 'Enviar agora', false, 'Itens sem enviar', 'Não enviar')){
      try{ await filaProcessar(); }catch(e){}
      filaRenderLista_();
    }
    if(_fila.length && !await confirmarTxt_('Ainda há ' + _fila.length + ' item(ns) sem enviar.\n\nSe sair agora, eles ficam guardados neste aparelho e só serão enviados quando alguém entrar nele de novo (aparecem no botão "na fila").\n\nSair mesmo assim?', 'Sair mesmo assim', true, 'Itens ainda na fila')) return;
  }
  rtParar_();
  if(currentUser && currentUser.token) apiCall('encerrarSessao', {}).catch(()=>{});
  try{ sessionStorage.removeItem(CARRINHO_RASCUNHO_KEY); }catch(e){}  // ITEM 2.7: saiu de propósito = não oferecer o carrinho de volta
  localStorage.removeItem(SESSAO_KEY); localStorage.removeItem(CONTINGENCIA_CHAVE_KEY); localStorage.removeItem(CACHE_KEY); // SEGURANÇA: não deixa clientes/vendas/financeiro guardados no aparelho depois de sair
  currentUser = null;
  location.reload();
}

/* ---------- CONFIRMAÇÃO DE SENHA DE ADMIN (para operador) ---------- */
/* Desde 20/10/2026 TODA ação sensível (recusar pedido, excluir cliente, cancelar pagamento/movimento, desconto, editar venda) pede a senha, inclusive para o Admin. */
function precisaConfirmarAdmin(){ return true; }
function abrirModalSenhaAdmin(callback){
  senhaAdminCallback = callback;
  try{ const ehAdmin = currentUser && currentUser.nivel === 'Admin'; const sub = document.querySelector('#senhaAdminModal .sub'), lb = document.querySelector('label[for="senhaAdminInput"]'); if(sub) sub.textContent = ehAdmin ? 'Digite a sua senha para confirmar esta ação.' : 'Essa ação exige a senha de um administrador.'; if(lb) lb.textContent = ehAdmin ? 'Sua senha' : 'Senha do administrador'; }catch(e){}
  document.getElementById('senhaAdminInput').value = '';
  document.getElementById('senhaAdminMsg').className = 'msg';
  document.getElementById('senhaAdminModal').classList.add('open');
}
/* Pede a senha (confere no servidor pelo próprio modal) e devolve a senha, ou null se a pessoa fechou. Senha SEMPRE, inclusive do Admin. */
function pedirSenha_(){
  return new Promise(res => {
    let feito = false; const fim = v => { if(!feito){ feito = true; res(v); } };
    abrirModalSenhaAdmin(s => fim(s));
    const m = document.getElementById('senhaAdminModal');
    if(!m){ fim(null); return; }
    const obs = new MutationObserver(() => { if(!m.classList.contains('open')){ obs.disconnect(); setTimeout(() => fim(null), 50); } });
    obs.observe(m, { attributes:true, attributeFilter:['class'] });
  });
}
function fecharModalSenhaAdmin(){ document.getElementById('senhaAdminModal').classList.remove('open'); senhaAdminCallback = null; }
async function confirmarSenhaAdminGenerica(){
  const senha = document.getElementById('senhaAdminInput').value;
  if(!senha){ showMsg('senhaAdminMsg','Informe a senha.','warn'); return; }
  try{
    const r = await apiCall('verificarSenhaAdmin', { senha });
    if(r.ok){ const cb = senhaAdminCallback; fecharModalSenhaAdmin(); if(cb) cb(senha); }
    else showMsg('senhaAdminMsg','Senha de administrador incorreta.','warn');
  } catch(e){ showMsg('senhaAdminMsg','Não foi possível verificar.','warn'); }
}

