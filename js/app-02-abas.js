/* ---------- TABS ---------- */
/* "Administrador" (ITEM 4, 50, 66) não é uma seção única — é um hub que agrupa as telas em 6 grupos
   (Hoje, Dinheiro, Produtos, Vendas e cardápio, Loja e equipe, Sistema). Os ids das telas (visaogeral, contas, ...) NÃO mudam:
   só o grupo e o nome mostrado. Cada id aparece em um único grupo. A IA não tem tela no Administrador: só o balão do Tex. */
/* Ícones em SVG (um só conjunto, no mesmo traço do menu de baixo). Use icSvg_('nome') em HTML novo; emoji só em textos de aviso/conversa. */
const IC_SVG_ = {
  painel:'M4 20V10M10 20V4M16 20v-7M22 20H2',
  financeiro:'M12 3v18M16 7h-6a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H8',
  catalogo:'M4 11h16a8 8 0 0 0-16 0zM4 15h16M5 19h14a1 1 0 0 0 1-1v-1H4v1a1 1 0 0 0 1 1z',
  campanhas:'M3 12V4h8l10 10-8 8L3 12zM7.5 8.5h.01',
  operacao:'M3 9l2-5h14l2 5M3 9h18M5 9v11h14V9M10 20v-6h4v6',
  sistema:'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.5-2.3 1a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.6a7 7 0 0 0-2 1.2l-2.3-1-2 3.5 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.5 2.3-1a7 7 0 0 0 2 1.2L10 21h4l.6-2.6a7 7 0 0 0 2-1.2l2.3 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2z',
  atendimento:'M4 5h16v11H9l-5 4V5z',
  fidelidade:'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7L12 3z',
  presente:'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-2 0-4-1-4-2.5S10 2 12 7zM12 7c2 0 4-1 4-2.5S14 2 12 7z',
  estoque:'M3 7l9-4 9 4v10l-9 4-9-4V7zM3 7l9 4 9-4M12 11v10',
  alerta:'M12 4l9 16H3L12 4zM12 10v4M12 17h.01',
  entrega:'M3 16h2a2 2 0 0 0 4 0h6a2 2 0 0 0 4 0h2v-4l-3-4h-5v8M3 16V8h8M7 18h.01M17 18h.01',
  pedido:'M6 3h12v18H6zM9 8h6M9 12h6M9 16h4',
  dinheiro:'M12 3v18M16 7h-6a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H8',
  engrenagem:'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 3v3M12 18v3M3 12h3M18 12h3',
  aniversario:'M5 20h14v-6H5zM12 14V9M12 9a2 2 0 0 0 0-4 2 2 0 0 0 0 4zM5 17h14',
  inativo:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  imprimir:'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  check:'M5 12.5l4.5 4.5L19 7.5',
  x:'M6 6l12 12M18 6L6 18',
  editar:'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  cartao:'M3 6h18v12H3zM3 10h18M7 15h3',
  celular:'M8 3h8v18H8zM11 18h2',
  repetir:'M21 12a9 9 0 1 1-3-6.7M21 4v5h-5',
  sino:'M6 17v-6a6 6 0 0 1 12 0v6l2 2H4l2-2zM10 21h4',
  teste:'M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3',
  livro:'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5zM8 7h8',
  pin:'M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  download:'M12 4v11M7 11l5 5 5-5M5 20h14',
  lixeira:'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6',
  busca:'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  /* v1.23: ícones dos títulos (troca dos emojis da área da equipe) */
  atualizar:'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  nuvem:'M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6.2 9.5 4.3 4.3 0 0 0 7 18z',
  salvar:'M5 3h11l3 3v15H5zM8 3v6h7V3M8 21v-7h8v7',
  calendario:'M4 6h16v15H4zM4 10h16M8 3v5M16 3v5',
  vassoura:'M14 3l-3 9M6 13h10l2 8H4l2-8zM9 17v4M13 17v4',
  cadeado:'M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3',
  lista:'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
  talheres:'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 1-3 4-3 7h3v11',
  globo:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  boia:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6',
  planilha:'M5 3h14v18H5zM5 9h14M5 15h14M11 3v18',
  camera:'M4 7h4l2-3h4l2 3h4v13H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  som:'M4 9h4l5-4v14l-5-4H4zM17 9a4 4 0 0 1 0 6',
  link:'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1',
  olho:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  carrinho:'M3 4h2l2.4 11h11l2-8H6M9 20h.01M17 20h.01',
  pasta:'M3 6h6l2 2h10v12H3z',
  jogo:'M6 9h12a4 4 0 0 1 0 8H6a4 4 0 0 1 0-8zM8 11v4M6 13h4M15 12h.01M17 14h.01',
  mapa:'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14',
  calculadora:'M6 3h12v18H6zM9 7h6M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01',
  saude:'M3 12h4l2-5 4 10 2-5h6',
  pessoa:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  documento:'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6',
  ajuda:'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01',
  banco:'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  bandeira:'M5 21V4h12l-2 4 2 4H5',
  upload:'M12 20V9M7 13l5-5 5 5M5 4h14',
  teclado:'M3 6h18v12H3zM7 10h.01M11 10h.01M15 10h.01M7 14h10'
};
function icSvg_(k){ return '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="' + (IC_SVG_[k] || IC_SVG_.sistema) + '"/></svg>'; }
const ADMIN_GRUPOS = [
  { nome:'Hoje',               ico:'painel',     subs:['visaogeral', 'ocorrencias', 'feedbacks'] },
  { nome:'Dinheiro',           ico:'financeiro', subs:['historico', 'financeiro', 'ajustes', 'ifoodfin', 'relatorios', 'analise'] },
  { nome:'Produtos',           ico:'catalogo',   subs:['produtos', 'estoque', 'compras', 'custosprecificacao'] },
  { nome:'Vendas e cardápio',  ico:'campanhas',  subs:['raiox', 'cardapiodigital', 'cardapioperiodo', 'pagamentos', 'promocoes', 'eventos'] },
  { nome:'Loja e equipe',      ico:'operacao',   subs:['ponto', 'escala', 'equipe', 'taxasentregas', 'restaurante', 'usuarios', 'notifadmin'] },
  { nome:'Sistema',            ico:'sistema',    subs:['aparencia', 'contas', 'auditoria', 'integridade'] }
];
const ADMIN_SUBABAS = ADMIN_GRUPOS.reduce((a,g)=>a.concat(g.subs), []);
/* a barra do Administrador existia copiada em 13 telas. Agora há UMA definição, desenhada em todas. */
const ADMIN_SUBABAS_ROTULOS = {
  visaogeral:'Visão Geral', ocorrencias:'Ocorrências', feedbacks:'Feedbacks',
  financeiro:'Contas a pagar e despesas', historico:'Histórico', ajustes:'Reembolsos e ajustes', analise:'Previsto e metas', relatorios:'Relatórios e DRE', ifoodfin:'iFood: vendas e repasses',
  produtos:'Produtos, combos e adicionais', estoque:'Estoque', compras:'Compras e fornecedores', custosprecificacao:'Custos e precificação',
  raiox:'Raio-X do negócio', cardapiodigital:'Cardápio Digital', cardapioperiodo:'Cardápio: funil e mapa', pagamentos:'Formas de pagamento', promocoes:'Promoções e cupons', eventos:'Eventos',
  restaurante:'Mesas e QR Codes', taxasentregas:'Entregadores e taxas', equipe:'Equipe e pagamentos', escala:'Escala da equipe', ponto:'Ponto', usuarios:'Usuários e permissões', notifadmin:'Configurar avisos',
  aparencia:'Aparência', contas:'Integrações e contas', integridade:'Backup e espaço', auditoria:'Auditoria'
};
const ADMIN_GRUPOS_OPERADOR_ = [ { nome:'Atendimento', ico:'atendimento', subs:['ocorrencias', 'feedbacks'] } ];
function gruposAdmin_(){ return (currentUser && currentUser.nivel==='Operador') ? ADMIN_GRUPOS_OPERADOR_ : ADMIN_GRUPOS; }
/* Uma linha explicando cada tela, mostrada embaixo do nome no menu (celular e PC). Ao criar tela nova, acrescentar aqui. */
const ADMIN_SUBABAS_DESCRICOES = {
  visaogeral:'Resumo do dia e saúde do sistema', ocorrencias:'Problemas registrados e como tratar', feedbacks:'O que os clientes escreveram; responder',
  financeiro:'Boletos, aluguel e despesas fixas', historico:'Vendas, despesas e caixas já feitos', ajustes:'Devolver dinheiro, dar crédito ou cortesia', analise:'Quanto entra e sai nos próximos 30 dias, e metas', relatorios:'DRE, imposto, mais vendidos e Excel', ifoodfin:'Comissões, taxas, repasses, antecipações e arquivo mensal do iFood',
  produtos:'Cadastro de produtos, combos e adicionais', estoque:'Ingredientes, bebidas e movimentações', compras:'Registrar compras e fornecedores', custosprecificacao:'Simular custo e preço de venda',
  raiox:'Quando vende mais, iFood × seu cardápio, tempos, cancelamentos, custos e perdas', cardapiodigital:'O que o cliente vê no cardápio: dados, visual, ordem e destaques', cardapioperiodo:'Acessos, onde o cliente desiste e mapa das entregas por período', pagamentos:'Taxas, prazos, troco e o que aparece no cardápio', promocoes:'Cupons, preço por dia, compre e ganhe, bilhete na sacola e avisos', eventos:'Custos e recebimentos por evento',
  restaurante:'Mesas do salão e QR Codes', taxasentregas:'Taxa, ajuda diária e fechamento dos entregadores', equipe:'Funcionários, salários, pagamentos, encargos e recibos', escala:'Quem trabalha em cada dia e horário', ponto:'Entradas e saídas, horas feitas e horas extras', usuarios:'Quem acessa o sistema, o que pode fazer e a privacidade (LGPD) das contas', notifadmin:'Quais avisos ligam, para quem, e os alertas automáticos',
  aparencia:'Nome, cores e logos do restaurante', contas:'iFood, Nota fiscal, Mercado Pago, chaves das IAs e contas do sistema', integridade:'Uso do espaço, backup, cópia na planilha e contingência', auditoria:'Ações sensíveis registradas'
};
function adminBtnTxt_(id){
  const d = ADMIN_SUBABAS_DESCRICOES[id];
  return '<span class="adm-t">' + ADMIN_SUBABAS_ROTULOS[id] + '</span>' + (d ? '<small class="adm-d">' + d + '</small>' : '');
}
/* Campo "Ir para…": filtra as telas pelo nome, pelo grupo e por palavras parecidas (ADMIN_BUSCA_PALAVRAS_). Não redesenha o menu enquanto se digita. */
const ADMIN_BUSCA_PALAVRAS_ = {
  aparencia:'cor cores logo logotipo marca nome slogan tema paleta visual icone identidade assistente',
  visaogeral:'resumo painel inicio hoje vendas dia saude', ocorrencias:'problema reclamacao erro incidente', feedbacks:'avaliacao opiniao elogio cliente responder',
  financeiro:'despesa conta pagar boleto aluguel mensal gasto', historico:'vendas passadas caixa sessoes arquivo', ajustes:'reembolso estorno devolucao credito cortesia desconto pos venda',
  analise:'meta previsto fluxo categoria', ifoodfin:'ifood financeiro repasse liquidacao antecipacao comissao taxa conciliacao arquivo csv boleto recebiveis lancamento venda', relatorios:'dre imposto lucro excel mercado pago resumo mensal produtos mais vendidos',
  produtos:'combo categoria adicional receita foto preco cardapio item lanche', estoque:'ingrediente bebida inventario entrada perda minimo', compras:'fornecedor nota compra comprei',
  custosprecificacao:'calculadora margem custo preco simulador', cardapiodigital:'cardapio online cliente qr logo banner horario fechamento dados do restaurante razao social cnpj', pagamentos:'pix cartao credito debito dinheiro taxa troco prazo online ifood',
  raiox:'raio x analise dia hora horario pico semana movimento calor ifood comissao fiel fieis voltaram tempo preparo demora entregador turno cancelamento cancelado motivo parado gargalo custo fornecedor subiu inflacao perda desperdicio', promocoes:'cupom desconto indicacao fidelidade brinde promocao aviso push campanha notificacao preco dia semana terca compre ganhe bilhete sacola qr', cardapioperiodo:'funil mapa visitas acessos entregas regiao bairro conversao desistencia finalizar periodo historico', eventos:'evento festa',
  restaurante:'mesa qr code salao', taxasentregas:'entregador motoboy frete taxa ajuda diaria fechamento', ponto:'ponto bater entrada saida horas extras banco de horas atraso esqueceu', escala:'troca de turno trocar escala turno horario folga ferias falta atestado quem trabalha semana padrao escalar', equipe:'funcionario funcionarios salario pagamento folha pagar recibo encargos fgts inss ferias decimo terceiro adiantamento vale diaria comissao equipe', usuarios:'usuario login senha acesso perfil garcom cozinha operador permissao lgpd privacidade anonimizar aviso', notifadmin:'aviso notificacao alerta push pedido parado vencimento repetir',
  contas:'ifood nota fiscal nfce mercado pago ia chave gemini groq senha conta email supabase github integracao', integridade:'backup restaurar sincronizar sincronizacao contingencia planilha espelho integridade conferir copia drive foto fotos espaco storage arquivo arquivar arquivamento banco celulas compactacao vacuum previsao plano limite uso',
  auditoria:'log registro historico acao'
};
function adminNorm_(t){ return String(t==null?'':t).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
function adminBuscaHtml_(){
  return '<div class="admin-busca"><input type="text" inputmode="search" enterkeyhint="search" autocomplete="off" placeholder="Ir para… (ex.: cupom, estoque, iFood)" aria-label="Ir para uma tela do Administrador" oninput="adminBuscar_(this)" onkeydown="adminBuscarTecla_(event,this)"><div class="admin-busca-res" hidden></div></div>';
}
function adminBuscar_(inp){
  const box = inp.parentNode.querySelector('.admin-busca-res'); if(!box) return;
  const termos = adminNorm_(inp.value).split(/\s+/).filter(Boolean);
  if(!termos.length){ box.hidden = true; box.innerHTML = ''; return; }
  const grupos = gruposAdmin_(), ach = [];
  grupos.forEach(g=>g.subs.forEach(id=>{
    const rot = ADMIN_SUBABAS_ROTULOS[id]; if(!rot) return;
    const palheiro = adminNorm_(rot + ' ' + g.nome + ' ' + (ADMIN_BUSCA_PALAVRAS_[id]||''));
    if(termos.every(t=>palheiro.indexOf(t) !== -1)) ach.push({id, rot, grupo:g.nome, ini: adminNorm_(rot).indexOf(termos[0]) === 0 ? 0 : 1});
  }));
  ach.sort((a,b)=>a.ini-b.ini);
  box.innerHTML = ach.length
    ? ach.slice(0,8).map(a=>`<button type="button" onclick="abrirAdministrador('${a.id}')"><span>${a.rot}</span><small>${a.grupo}</small></button>`).join('')
    : '<div class="admin-busca-vazio">Nenhuma tela com esse nome. Tente outra palavra.</div>';
  box.hidden = false;
}
function adminBuscarTecla_(ev, inp){
  if(ev.key === 'Escape'){ inp.value = ''; adminBuscar_(inp); return; }
  if(ev.key !== 'Enter') return;
  const b = inp.parentNode.querySelector('.admin-busca-res button'); if(b){ ev.preventDefault(); b.click(); }
}
function montarBarrasAdmin_(alvo, grupoIdx){
  /* alvo = tela aberta; sem alvo, mostra só os grupos (ou as telas do grupo escolhido), nada aberto até tocar */
  const grupos = gruposAdmin_();
  const ativo = alvo ? (grupos.find(g=>g.subs.includes(alvo)) || grupos[0]) : (grupoIdx != null ? grupos[grupoIdx] : (grupos.length === 1 ? grupos[0] : null));
  const abas = grupos.length>1 ? grupos.map((g,i)=>`<button class="admin-gbtn${g===ativo?' active':''}" onclick="abrirAdminGrupo_(${i})">${icSvg_(g.ico)}<span>${g.nome}</span></button>`).join('') : '';
  const subs = ativo ? (`<div class="admin-grupo">${icSvg_(ativo.ico)}${grupos.length>1 ? ativo.nome : (ativo.nome+' — o que você pode tratar aqui')}</div>` + ativo.subs.map(id=>`<button data-sub="${id}" class="${id===alvo?'active':''}" onclick="abrirAdministrador('${id}')">${adminBtnTxt_(id)}</button>`).join('')) : '';
  const busca = grupos.length>1 ? adminBuscaHtml_() : '';
  document.querySelectorAll('.admin-subnav[data-admin-nav]').forEach(nav=>{ nav.innerHTML = busca + abas + subs; });
  _adminGrupoAtivo_ = ativo ? grupos.indexOf(ativo) : null;
  /* Computador: menu lateral com todos os grupos e telas à vista (um clique). No celular ele fica escondido (CSS). */
  const lat = document.getElementById('adminLateral');
  if(lat) lat.innerHTML = busca + grupos.map(g=>`<div class="al-grupo">${icSvg_(g.ico)}${g.nome}</div>` + g.subs.map(id=>`<button type="button" data-sub="${id}" class="${id===alvo?'active':''}" onclick="abrirAdministrador('${id}')">${adminBtnTxt_(id)}</button>`).join('')).join('');
}
let _adminGrupoAtivo_ = null;
/* Entrar no Admin: só os grupos, nenhuma tela aberta. Tocar num grupo mostra as telas dele; a tela abre só quando você toca nela. */
function abrirAdminGrupo_(i){
  if(i != null && i === _adminGrupoAtivo_ && gruposAdmin_().length > 1) i = null;   // tocar de novo no grupo aberto fecha o menu dele
  montarBarrasAdmin_(null, i);
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  const bt = document.querySelector('[data-tab="administrador"]'); if(bt) bt.classList.add('active');
  ativarApenasSecao_('tab-admininicio');
  try{ renderAdminInicio_(); }catch(e){ if(window.erroTela_) erroTela_(e); }
}
function abrirAdminInicio_(){ abrirAdminGrupo_(null); }
montarBarrasAdmin_('visaogeral');
(function(){ const inicial=document.querySelector('section.tab.active'); if(inicial) ativarApenasSecao_(inicial.id); })();
function ativarApenasSecao_(id){
  /* telas do Administrador: no computador ganham o menu lateral (estilo-14-computador.css) */
  try{ document.body.classList.toggle('adm-ativo', id === 'tab-admininicio' || (typeof ADMIN_SUBABAS !== 'undefined' && ADMIN_SUBABAS.indexOf(String(id).replace(/^tab-/,'')) !== -1)); }catch(e){}
  document.querySelectorAll('section.tab').forEach(sec=>{
    const ativa = sec.id === id;
    sec.classList.toggle('active', ativa);
    // Blindagem visual: mesmo que alguma regra CSS externa/antiga esteja interferindo,
    // somente a seção escolhida pode ocupar a tela.
    sec.hidden = !ativa;
    sec.style.setProperty('display', ativa ? 'block' : 'none', 'important');
    sec.setAttribute('aria-hidden', ativa ? 'false' : 'true');
  });
  /* MELHORIA 4.4 — telas pesadas só são desenhadas a cada sincronização quando estão na tela; ao entrar nelas, desenham na hora. */
  try{ if(id==='tab-notificacoes') renderNotificacoes(); else if(id==='tab-relatorios') gerarRelatorio(); }catch(e){}
}
/* Abas internas: mostra só os cards marcados com data-painel="nome" (um card pode ter mais de um nome, separados por espaço).
   Cards sem data-painel ficam sempre visíveis. Lembra a última aba escolhida em cada tela. */
const _abaInterna_ = { 'tab-produtos':'produtos', 'tab-cardapiodigital':'categorias', 'tab-historico':'vendas', 'tab-contas':'contas', 'tab-pagamentos':'taxas' };
function abaInterna_(tabId, q){
  const sec = document.getElementById(tabId); if(!sec) return;
  _abaInterna_[tabId] = q;
  sec.querySelectorAll('[data-painel]').forEach(p=>{ p.style.display = (p.dataset.painel.split(' ').indexOf(q) !== -1) ? '' : 'none'; });
  sec.querySelectorAll('.seg-abas button').forEach(b=>b.classList.toggle('active', b.dataset.aba === q));
}
/* Do Cardápio Digital (o que aparece) para o cadastro em Produtos → Produtos, combos e adicionais, já na aba certa. */
function abrirCadastro_(aba){ _abaInterna_['tab-produtos'] = aba; abrirAdministrador('produtos'); }
function abrirAdministrador(sub){
  if(['ias','ifood','nfce','mercadopago','infinitepay'].includes(sub)){ _abaInterna_['tab-contas'] = sub; sub = 'contas'; }   // atalho direto para o sub-menu
  // v1.16: "Espaço e arquivamento" (e suas abas Uso/Arquivamento/Drive e fotos) entrou na tela "Backup e espaço"
  let _bkAbrirAvancado = false;
  if(sub === 'drive' || sub === 'armazenamento' || sub === 'arquivo'){ _bkAbrirAvancado = (sub === 'drive'); sub = 'integridade'; }
  const permitidos = gruposAdmin_().reduce((a,g)=>a.concat(g.subs), []);
  const alvo = (ADMIN_SUBABAS.includes(sub) && permitidos.includes(sub)) ? sub : permitidos[0];
  montarBarrasAdmin_(alvo);
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector('[data-tab="administrador"]').classList.add('active');
  ativarApenasSecao_('tab-'+alvo);
  if(alvo==='integridade'){ const av = document.getElementById('bkAvancado'); if(av && _bkAbrirAvancado) av.open = true; if(apiConfigurada()){ carregarArmazenamento(); if(typeof carregarArmazenamentoArquivo_ === 'function') carregarArmazenamentoArquivo_(); } }
  if(alvo==='ifoodfin' && apiConfigurada() && typeof carregarIfoodFin_ === 'function') carregarIfoodFin_();   // v1.15: financeiro do iFood   // v1.15: tela Armazenamento
  if(_abaInterna_['tab-'+alvo]) abaInterna_('tab-'+alvo, _abaInterna_['tab-'+alvo]);
  if((alvo==='visaogeral' || alvo==='relatorios') && apiConfigurada()) sincronizarEmSegundoPlano(); // ITEM 92: atualiza ao entrar, sem refresh periódico
  if(alvo==='taxasentregas'){ renderEntregasFinanceiro(); if(apiConfigurada()) atualizarAoEntrar_(); }
  if(alvo==='promocoes'){ renderCuponsUI(); if(typeof carregarPromoAviso_ === 'function') carregarPromoAviso_(); if(typeof carregarPromosDono_ === 'function') carregarPromosDono_(); }
  if(alvo==='aparencia' && typeof carregarAparencia_ === 'function') carregarAparencia_();
  if(alvo==='raiox' && typeof abrirRaioX_ === 'function') abrirRaioX_();
  if(alvo==='cardapioperiodo' && typeof abrirCardapioPeriodo_ === 'function') abrirCardapioPeriodo_();
  if(alvo==='usuarios' || alvo==='cardapiodigital'){ lgpdCarregarUI_(); }
  if(alvo==='eventos'){ renderEventosUI(); }
  if(alvo==='custosprecificacao'){ prepararCalculadoraUI(); if(typeof carregarCustosGerais_ === 'function') carregarCustosGerais_(); }
  if(alvo==='compras') carregarCompras_();
  if(alvo==='contas'){ carregarContas_(); carregarChavesIa_(); carregarIntegracoes_(); }
  if(alvo==='auditoria') carregarAuditoria_();
  if(alvo==='visaogeral') carregarSaude_();
  if(alvo==='ocorrencias') renderOcorrencias();
  if(alvo==='notifadmin') renderConfigNotificacoes();
  if(alvo==='equipe') carregarEquipe_();
  if(alvo==='escala') carregarEscala_();
  if(alvo==='ponto') carregarPonto_();
  if(alvo==='visaogeral') renderVisaoGeral(); if(alvo==='relatorios') renderRelatorio();
  if(alvo==='feedbacks') renderFeedbacks();
}
document.querySelectorAll('.tab-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    if(btn.classList.contains('hidden-tab')) return;
    if(btn.dataset.tab==='administrador'){ abrirAdminInicio_(); return; }
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    ativarApenasSecao_('tab-'+btn.dataset.tab);
    if(btn.dataset.tab==='inicio') { try{ renderInicio(); }catch(e){ if(window.erroTela_) erroTela_(e); } }
    if(btn.dataset.tab==='meusganhos') { try{ renderMeusGanhos(); }catch(e){ if(window.erroTela_) erroTela_(e); } }
    if(btn.dataset.tab==='caixa') { try{ mpFaixaAtualizar_(); }catch(e){} }
  });
});
/* Pedidos e Entregas NÃO atualizam mais ao abrir a aba. A atualização é: botão "Atualizar" (na hora) ou o timer de 3 minutos
   (só quando seguroParaSincronizar() permite, para não mexer em venda ou formulário em andamento). */
const SYNC_INTERVALO_MS = 3*60*1000; // 3 minutos: usado pelo timer geral e pelo detector da Cozinha (menos chamadas ao Apps Script)
let ultimaSyncMs = 0;
function atualizarAoEntrar_(){
  if(!apiConfigurada() || Date.now()-ultimaSyncMs < 15000) return;
  sincronizarEmSegundoPlano();
}
/* Botão "Atualizar": puxa agora, sem a espera de 15s (o servidor já serializa as chamadas). */
async function atualizarAgora_(){
  if(!apiConfigurada()) return;
  if(!seguroParaSincronizar()){ avisar('Termine ou feche o que está aberto (venda, formulário ou janela) e toque em Atualizar de novo.'); return; }
  _versoesLocais = null; // o botão Atualizar sempre baixa tudo
  await sincronizarEmSegundoPlano();
}
function mostrarUltimaSync_(){
  const t = new Date(ultimaSyncMs), pad = n=>String(n).padStart(2,'0');
  const txt = ultimaSyncMs ? 'Atualizado às '+pad(t.getHours())+':'+pad(t.getMinutes()) : 'Atualiza sozinho a cada 3 min.';
  document.querySelectorAll('[data-ultima-sync]').forEach(el=>{ el.textContent = txt; });
}

/* ============================================================
   CACHE LOCAL
   ============================================================ */
function salvarCache(){
  try{
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      _dono: currentUser ? String(currentUser.login).toLowerCase() : '',
      clientes, promocoes, indicacoes, fidelidade: fidelidadeClientes,
      formasPagamento, categorias, produtos, produtoPrecos, produtoIngredientes, estoque, combos, comboPrecos, comboItens,
      adicionais, produtoAdicionais, feedbacks, ocorrencias, configCardapio, movimentacoesEstoque, maisPedidos, mesas,
      vendas, itensVenda, pagamentosVenda, despesas, categoriasDespesa, despesasRecorrentes, ajustesPosVenda, sangrias, metas, sessaoCaixa, historicoCaixa, usuarios, logRecentes,
      configEntrega, fechamentosEntrega, entregasFechadas, configNotificacoes
    }));
  } catch(e){ /* armazenamento indisponível, sem problema */ }
  emergenciaSalvarCatalogo_(); // BLOCO 1.3
}
function carregarCache(){
  try{
    const raw = localStorage.getItem(CACHE_KEY);
    if(!raw) return false;
    const d = JSON.parse(raw);
    normalizarNumerosDados_(d); // cache antigo pode ter números como texto
    /* SEGURANÇA: o cache só vale para o usuário que o gerou. Outro funcionário (ex.: entregador) no mesmo aparelho nunca vê os dados do Admin. */
    if(!currentUser || d._dono !== String(currentUser.login).toLowerCase()){ localStorage.removeItem(CACHE_KEY); return false; }
    clientes = d.clientes||[]; promocoes = d.promocoes||[]; cupons = d.cupons||[]; eventos = d.eventos||[]; indicacoes = d.indicacoes||[];
    fidelidadeClientes = d.fidelidade||[]; formasPagamento = d.formasPagamento||[]; categorias = d.categorias||[];
    produtos = d.produtos||[]; produtoPrecos = d.produtoPrecos||[]; produtoIngredientes = d.produtoIngredientes||[];
    estoque = d.estoque||[]; combos = d.combos||[]; comboPrecos = d.comboPrecos||[]; comboItens = d.comboItens||[];
    adicionais = d.adicionais||[]; produtoAdicionais = d.produtoAdicionais||[]; feedbacks = d.feedbacks||[]; ocorrencias = d.ocorrencias||[];
    configCardapio = d.configCardapio || configCardapio;
    maisPedidos = d.maisPedidos || maisPedidos;
    mesas = d.mesas || mesas;
    movimentacoesEstoque = d.movimentacoesEstoque || movimentacoesEstoque;
    vendas = d.vendas||[]; itensVenda = d.itensVenda||[]; pagamentosVenda = d.pagamentosVenda||[]; despesas = d.despesas||[]; categoriasDespesa = d.categoriasDespesa||[]; despesasRecorrentes = d.despesasRecorrentes||[]; ajustesPosVenda = d.ajustesPosVenda||[]; sangrias = d.sangrias||[];
    metas = d.metas||{mensal:0,diaria:0}; sessaoCaixa = d.sessaoCaixa||null; historicoCaixa = d.historicoCaixa||[];
    usuarios = d.usuarios||[]; logRecentes = d.logRecentes||[];
    configEntrega = d.configEntrega || configEntrega; fechamentosEntrega = d.fechamentosEntrega||[]; entregasFechadas = d.entregasFechadas||[];
    configEstoque = d.configEstoque || configEstoque;
    configNotificacoes = d.configNotificacoes || null;
    return true;
  } catch(e){ return false; }
}

/* ============================================================
   CLIENTES
   ============================================================ */
const FILTROS_CLIENTES_ = { todos:'filtroTodosBtn', inativos:'filtroInativosBtn', risco:'filtroRiscoBtn', vip:'filtroVipBtn', fiel:'filtroFielBtn', novo:'filtroNovoBtn', ifood:'filtroIfoodBtn' };
const FILTRO_SEGMENTO_ = { risco:'Em risco', vip:'VIP', fiel:'Fiel', novo:'Novo' };
function filtroClientesAtual_(){
  for(const k in FILTROS_CLIENTES_){ const b = document.getElementById(FILTROS_CLIENTES_[k]); if(b && b.classList.contains('active')) return k; }
  return 'todos';
}
function setFiltroClientes(modo){
  Object.keys(FILTROS_CLIENTES_).forEach(k=>{ const b = document.getElementById(FILTROS_CLIENTES_[k]); if(b) b.classList.toggle('active', k===modo); });
  document.getElementById('diasInativoBox').style.display = modo==='inativos' ? 'block' : 'none';
  renderClientes();
}
/* Última venda de cada telefone, montada uma única vez (antes, cada cliente varria todas as vendas: 300 clientes x 3000 vendas).
   Refaz sozinha se a lista de vendas mudar. */
let _cacheUltVendaTel = null, _cacheUltVendaChave = '';
function ultimaVendaPorTel_(){
  const chave = vendas.length+'|'+(vendas.length? (vendas[0].id||'')+(vendas[vendas.length-1].id||'') : '');
  if(_cacheUltVendaTel && _cacheUltVendaChave===chave) return _cacheUltVendaTel;
  const m = {};
  vendas.forEach(v=>{ const t = chaveVendaCliente_(v); if(!t || !v.timestamp) return; if(!m[t] || v.timestamp>m[t]) m[t] = v.timestamp; });
  _cacheUltVendaTel = m; _cacheUltVendaChave = chave;
  return m;
}
function ultimaAtividadeCliente(cliente){
  const tel = chaveCliente_(cliente);
  const candidatos = [];
  if(cliente.primeiroContato) candidatos.push(parseDataBR(cliente.primeiroContato));
  const fid = fidelidadeClientes.find(f=>normTel(f.telefone)===tel);
  if(fid && fid.atualizado) candidatos.push(parseDataBR(fid.atualizado));
  const ultVenda = ultimaVendaPorTel_()[tel];
  if(ultVenda) candidatos.push(ultVenda);
  const arq = _arqResumoTel_ && _arqResumoTel_[tel];
  if(arq && arq.ultimo) candidatos.push(arq.ultimo);   // última compra já arquivada (o telefone é a chave do cliente)
  const validos = candidatos.filter(Boolean);
  return validos.length ? Math.max(...validos) : null;
}

function onMudarTipoCupom_(){
  const t = document.getElementById('cupTipo').value;
  document.getElementById('cupFaixasBox').style.display = t==='progressivo' ? '' : 'none';
  document.getElementById('cupValorBox').style.display = (t==='progressivo' || t==='frete') ? 'none' : '';
  document.getElementById('cupRegraBox').style.display = t==='combo' ? '' : 'none';
  document.getElementById('cupValorRotulo').textContent = t==='combo' ? 'Preço final do combo (R$)' : 'Valor';
}
function regraResumo_(c){ const g=(c.regra&&c.regra.grupos)||[]; return g.map(x=>x.qtd+' x '+(x.produtos||[]).map(y=>y.nome).join(' ou ')).join(' + '); }
function regraTexto_(c){ const g=(c&&c.regra&&c.regra.grupos)||[]; return g.map(x=>x.qtd+' x '+(x.produtos||[]).map(y=>y.nome).join(', ')).join('\n'); }
function faixasDoTexto_(txt){
  return String(txt||'').split(/\n/).map(l=>l.trim()).filter(Boolean).map(l=>{ const n = l.replace(/R\$/gi,'').replace(/,/g,'.').match(/\d+(?:\.\d+)?/g)||[]; return { minimo:Number(n[0])||0, desconto:Number(n[1])||0 }; });
}
function faixasResumo_(c){ return (c.faixas||[]).map(f=>'R$ '+Number(f.desconto).toFixed(2).replace('.',',')+' acima de R$ '+Number(f.minimo).toFixed(2).replace('.',',')).join(' · '); }
const CUP_AUTO_ = {
  boas_vindas:{ t:'🎉 Boas-vindas', d:'Quem cria a conta recebe este cupom.' },
  aniversario:{ t:'🎂 Aniversário', d:'No dia do aniversário (conta com data de nascimento e criada há mais de 30 dias).' },
  indicacao_indicador:{ t:'🎁 Indique e ganhe — quem indicou', d:'Quando o amigo indicado conclui o primeiro pedido. Pode valer junto com o produto-prêmio de indicação (Editar produto › Mais opções): quem indicou ganha o cupom e o brinde.' },
  indicacao_indicado:{ t:'🎁 Indique e ganhe — quem foi indicado', d:'Quando o indicado conclui o primeiro pedido com a conta.' },
  em_risco:{ t:'💌 Sentimos sua falta (cliente em risco)', d:'Todo dia de manhã: quem tem conta, aceitou promoções e está há mais de 45 dias sem pedir recebe este cupom (no máximo 1 a cada 60 dias).' },
  vip:{ t:'⭐ Cliente VIP', d:'Todo dia de manhã: cliente VIP (10 ou mais pedidos, ou R$ 800 ou mais gastos) com conta e promoções aceitas recebe este cupom (no máximo 1 por trimestre).' }
};
function cupBeneficio_(c){ return c.tipo==='percentual'?c.valor+'%':c.tipo==='fixo'?'R$ '+Number(c.valor).toFixed(2).replace('.',','):c.tipo==='progressivo'?faixasResumo_(c):c.tipo==='combo'?'Combo R$ '+Number(c.valor).toFixed(2).replace('.',',')+' ('+regraResumo_(c)+')':'Frete grátis'; }
function cupClienteNome_(id){ const c=(clientes||[]).find(x=>x.id===id); return c ? (c.nome||'Sem nome') : 'cliente'; }
function renderCuponsUI(){
  const box=document.getElementById('cupLista'); if(!box) return;
  const arr=(cupons||[]).filter(c=>!c.excluido), excluidos=(cupons||[]).filter(c=>c.excluido), comuns=arr.filter(c=>!c.automatico), autos=arr.filter(c=>c.automatico);
  const ab=document.getElementById('cupAutoLista');
  if(ab) ab.innerHTML=Object.keys(CUP_AUTO_).map(k=>{ const c=autos.find(x=>x.automatico===k); if(!c) return `<div class="notif-card"><b>${CUP_AUTO_[k].t}</b><div class="obs-line">Ainda não configurado no banco.</div></div>`;
    return `<div class="notif-card"><b>${CUP_AUTO_[k].t}</b> · ${c.ativa?'<b>LIGADO</b>':'desligado'}<div class="obs-line">${escH(CUP_AUTO_[k].d)}</div><div class="obs-line">Benefício: ${escH(cupBeneficio_(c))}${c.valorMinimo?' · pedido mínimo R$ '+Number(c.valorMinimo).toFixed(2).replace('.',','):''} · vale ${c.validadeDias} dias${c.mensagem?' · “'+escH(c.mensagem)+'”':''}</div><button class="small-gold" onclick="abrirCupomUI('${c.id}')">Editar</button> <button class="ghost" onclick="alternarCupomUI('${c.id}',${!c.ativa})">${c.ativa?'Desligar':'Ligar'}</button></div>`; }).join('');
  box.innerHTML=comuns.length?comuns.map(c=>{
    const tags=[(c.formasIds||[]).length?'💳 só '+escH(cupFormasNomes_(c.formasIds)):'',c.somenteConta?'🔐 só com conta':'',c.clienteId?'👤 só para '+escH(cupClienteNome_(c.clienteId)):'',c.visivelConta?'👁 visível na conta':''].filter(Boolean).join(' · ');
    return `<div class="notif-card"><b>${escH(c.codigo)}</b> — ${escH(c.nome)} · ${escH(cupBeneficio_(c))} · ${c.ativa?'ATIVO':'INATIVO'}<div class="obs-line">Uso: ${c.limiteTotal?c.limiteTotal:'ilimitado'} · por cliente: ${c.limitePorCliente?c.limitePorCliente:'ilimitado'} · mínimo: R$ ${Number(c.valorMinimo).toFixed(2)}${tags?' · '+tags:''}</div><button class="small-gold" onclick="abrirCupomUI('${c.id}')">Editar</button> <button class="ghost" onclick="alternarCupomUI('${c.id}',${!c.ativa})">${c.ativa?'Desativar':'Ativar'}</button> <button class="ghost" onclick="excluirCupomUI('${c.id}')">🗑️ Excluir</button></div>`; }).join(''):'<div class="notif-empty">Nenhum cupom cadastrado.</div>';
  if(excluidos.length) box.insertAdjacentHTML('beforeend', '<details class="mt-2"><summary class="fs-sm">🗑️ Cupons excluídos ('+excluidos.length+') — arquivados porque já tinham sido usados</summary>'
    + excluidos.map(c=>'<div class="obs-line"><b>'+escH(c.codigoOriginal||c.codigo)+'</b> — '+escH(c.nome)+' <button class="ghost" style="width:auto;padding:2px 8px;min-height:28px;" onclick="restaurarCupomUI(\''+c.id+'\')">Restaurar</button></div>').join('') + '</details>');
}
function cupFormasNomes_(ids){ const n=(formasPagamento||[]).filter(f=>(ids||[]).indexOf(String(f.id))!==-1).map(f=>f.nome); return n.length>1 ? n.slice(0,-1).join(', ')+' ou '+n[n.length-1] : (n[0]||''); }
function cupRenderFormas_(sel){
  const box=document.getElementById('cupFormasBox'); if(!box) return;
  const fs=(formasPagamento||[]).filter(f=>f.ativa!==false && f.visivelCardapio!==false);
  box.innerHTML=fs.length?fs.map(f=>`<label class="d-flex gap-2 ai-centro" style="width:auto;margin:0;"><input type="checkbox" class="largura-auto cup-forma" value="${escH(f.id)}" ${(sel||[]).indexOf(String(f.id))!==-1?'checked':''}> ${escH(f.nome)}</label>`).join(''):'<span class="obs-line">Nenhuma forma de pagamento ativa no cardápio.</span>';
}
function cupClienteLabel_(c){ return (c.nome||'Sem nome')+' — '+(c.telefone||'sem telefone'); }
function abrirCupomUI(id){
  const c=id?(cupons||[]).find(x=>x.id===id):null, v=(i,val)=>{ document.getElementById(i).value=val==null?'':val; };
  const dl=document.getElementById('cupClienteLista'); if(dl) dl.innerHTML=(clientes||[]).slice(0,3000).map(x=>`<option value="${escH(cupClienteLabel_(x))}"></option>`).join('');
  v('cupId',c?c.id:''); v('cupAuto',c?c.automatico:''); v('cupCodigo',c?c.codigo:''); v('cupNome',c?c.nome:''); v('cupTipo',c?c.tipo:'percentual'); v('cupValor',c?c.valor:'');
  v('cupRegra',c&&c.tipo==='combo'?regraTexto_(c):'');
  v('cupFaixas',c&&c.tipo==='progressivo'?(c.faixas||[]).map(f=>f.minimo+' '+f.desconto).join('\n'):''); v('cupInicio',c?c.dataInicio:''); v('cupFim',c?c.dataFim:'');
  v('cupLimite',c?c.limiteTotal:'0'); v('cupLimiteCliente',c?c.limitePorCliente:'1'); v('cupMinimo',c?c.valorMinimo:'0'); v('cupValidadeDias',c?c.validadeDias:'30'); v('cupMensagem',c?c.mensagem:'');
  document.getElementById('cupFrete').checked=!!(c&&c.freteGratis); document.getElementById('cupAtiva').checked=c?c.ativa:true;
  document.getElementById('cupSomenteConta').checked=!!(c&&c.somenteConta); document.getElementById('cupVisivelConta').checked=!!(c&&c.visivelConta);
  v('cupCliente',c&&c.clienteId?cupClienteLabel_((clientes||[]).find(x=>x.id===c.clienteId)||{nome:'(cliente)',telefone:''}):'');
  const auto=!!(c&&c.automatico);
  document.getElementById('cupValidadeBox').style.display=auto?'':'none'; document.getElementById('cupContaBox').style.display=auto?'none':'';
  const av=document.getElementById('cupAutoAviso'); av.style.display=auto?'':'none'; av.textContent=auto?(CUP_AUTO_[c.automatico].t+' — '+CUP_AUTO_[c.automatico].d):'';
  document.getElementById('cupTitulo').textContent=c?(auto?'Cupom automático':'Editar cupom'):'Novo cupom'; document.getElementById('cupSalvarBtn').textContent=c?'Salvar alterações':'Criar cupom';
  document.getElementById('cupMsg').className='msg'; document.getElementById('cupMsg').textContent='';
  cupRenderFormas_(c?c.formasIds:[]);
  onMudarTipoCupom_(); abrirFormModal('cupomNovoModal');
}
async function salvarCupomUI(){
  const id=cupId.value; let clienteId='';
  const txt=cupCliente.value.trim();
  if(txt){ const f=(clientes||[]).find(x=>cupClienteLabel_(x)===txt); if(!f) return showMsg('cupMsg','Escolha o cliente na lista que aparece ao digitar.','warn'); clienteId=f.id; }
  const p={id,codigo:cupCodigo.value,nome:cupNome.value,tipo:cupTipo.value,valor:cupValor.value,faixas:cupTipo.value==='progressivo'?faixasDoTexto_(cupFaixas.value):[],regraTexto:cupTipo.value==='combo'?cupRegra.value:'',freteGratis:cupFrete.checked,dataInicio:cupInicio.value,dataFim:cupFim.value,horaInicio:'',horaFim:'',limiteTotal:cupLimite.value,limitePorCliente:cupLimiteCliente.value,valorMinimo:cupMinimo.value,ativa:cupAtiva.checked,acumula:false,
    automatico:cupAuto.value,validadeDias:cupValidadeDias.value,mensagem:cupMensagem.value,somenteConta:cupSomenteConta.checked,visivelConta:cupVisivelConta.checked,clienteId,formasIds:Array.from(document.querySelectorAll('#cupFormasBox .cup-forma:checked')).map(x=>x.value)};
  try{const r=await apiCall(id?'editarCupom':'salvarCupom',p);showMsg('cupMsg',r.message,r.ok?'ok':'warn');if(r.ok){cupons=r.cupons||[];renderCuponsUI();fecharFormModal('cupomNovoModal');showMsg('cupMsgLista',r.message,'ok');}}catch(e){showMsg('cupMsg','Erro ao salvar cupom.','warn');}
}
/* ---- Privacidade (LGPD) das contas — só Administrador ---- */
let _lgpdT=0;
let _lgpdOk_=false;
function lgpdPintar_(r){
  _lgpdOk_=true;
  const cartao=document.getElementById('lgpdCard'); if(cartao) cartao.style.display='';
  document.getElementById('lgpdResumo').textContent='Contas de clientes: '+r.contas+' · aceitaram promoções: '+r.contasPromo+' · cadastros anonimizados: '+r.anonimizados+' · versão do Aviso: '+r.versao;
  document.getElementById('lgpdAnos').value=r.anos; document.getElementById('lgpdRazao').value=r.razaoSocial||''; document.getElementById('lgpdCnpj').value=r.cnpj||'';
  document.getElementById('lgpdLink').textContent='Endereço do Aviso para colocar no Google: '+location.origin+location.pathname+'?privacidade=1';
}
async function lgpdCarregarUI_(){
  if(!currentUser||currentUser.nivel!=='Admin'||!apiConfigurada()||Date.now()-_lgpdT<30000) return; _lgpdT=Date.now();
  try{ const r=await apiCall('lgpdConfig',{}); if(r&&r.ok) lgpdPintar_(r); else _lgpdT=0; }catch(e){ _lgpdT=0; }
}
async function lgpdEnviar_(p){ try{ const r=await apiCall('lgpdConfig',p); showMsg('lgpdMsg',r.message||'Pronto.',r.ok?'ok':'warn'); if(r.ok) lgpdPintar_(r); }catch(e){ showMsg('lgpdMsg','Não foi possível salvar agora.','warn'); } }
function lgpdSalvarAnos_(){ lgpdEnviar_({anos:document.getElementById('lgpdAnos').value}); }
async function lgpdNovaVersao_(){ if(!await confirmarTxt_('Todos os clientes com conta vão precisar aceitar o Aviso de novo. Publicar nova versão?', 'Publicar nova versão', false, 'Nova versão do Aviso')) return; lgpdEnviar_({novaVersaoAviso:true}); }
/* P-05 — excluir cupom (pede a senha). Nunca usado: apaga. Já usado: arquiva (histórico fica certo). */
async function excluirCupomUI(id){
  const c=(cupons||[]).find(x=>x.id===id); if(!c) return;
  const extra = c.tipo==='combo' ? '\n\nAtenção: é um cupom de COMBO (preço especial para um conjunto de produtos).' : '';
  if(!await confirmarTxt_('Excluir o cupom '+c.codigo+'? Essa ação não pode ser desfeita.\n\nSe ele já foi usado em pedidos, ele é arquivado (some da lista, da conta dos clientes e do cardápio) e os pedidos antigos continuam certos.'+extra,'Excluir cupom',true)) return;
  abrirModalSenhaAdmin(async (senha)=>{
    try{
      const r=await apiCall('excluirCupom',{id,senha});
      if(r && r.ok){ avisar(r.message||'Cupom excluído.','ok'); try{ await sincronizarEmSegundoPlano(); }catch(e){} cupons=(cupons||[]).filter(x=>x.id!==id || r.arquivado); if(r.arquivado){ const k=cupons.find(x=>x.id===id); if(k){ k.excluido=true; k.codigoOriginal=k.codigoOriginal||k.codigo; k.ativa=false; } } renderCuponsUI(); }
      else mostrarErro_('⚠️ '+((r&&r.message)||'Não foi possível excluir o cupom.'),{forcar:true});
    }catch(e){ mostrarErro_('📡 Sem conexão: o cupom não foi excluído.',{forcar:true}); }
  });
}
async function restaurarCupomUI(id){
  if(!await confirmarTxt_('Restaurar este cupom? Ele volta DESATIVADO.','Restaurar',false)) return;
  abrirModalSenhaAdmin(async (senha)=>{
    try{
      const r=await apiCall('excluirCupom',{id,senha,restaurar:true});
      if(r && r.ok){ avisar(r.message||'Restaurado.','ok'); const k=(cupons||[]).find(x=>x.id===id); if(k){ k.excluido=false; k.codigo=k.codigoOriginal||k.codigo; } try{ await sincronizarEmSegundoPlano(); }catch(e){} renderCuponsUI(); }
      else mostrarErro_('⚠️ '+((r&&r.message)||'Não foi possível restaurar.'),{forcar:true});
    }catch(e){ mostrarErro_('📡 Sem conexão: nada foi restaurado.',{forcar:true}); }
  });
}
async function alternarCupomUI(id,ativo){try{const r=await apiCall('alternarCupom',{id,ativo});if(r.ok){cupons=r.cupons||[];renderCuponsUI();}else avisar(r.message);}catch(e){avisar('Não foi possível alterar o cupom.');}}
function evPreencherFormas_(){ const sel=document.getElementById('evRecForma'); if(!sel) return; const atual=sel.value; sel.innerHTML=(formasPagamento||[]).filter(f=>f.ativa!==false).map(f=>`<option value="${escH(f.nome)}">${escH(f.nome)}</option>`).join(''); if(atual) sel.value=atual; }
function calcTrocarProduto_(){ const e=document.getElementById('calcPrecoSimulado'); if(e) e.value=''; calcularCustoUI(); }
async function calcularCustoUI(){const p=document.getElementById('calcProduto').value,f=document.getElementById('calcForma').value;if(!p||!f)return;const prec=(produtoPrecos||[]).find(x=>x.produtoId===p&&x.formaPagamentoId===f);document.getElementById('calcCusto').textContent=formatarMoeda(prec?prec.custo:0);document.getElementById('calcPrecoAtual').textContent=formatarMoeda(prec?prec.preco:0);if(!document.getElementById('calcPrecoSimulado').value)document.getElementById('calcPrecoSimulado').value=prec?prec.preco:'';if(!apiConfigurada())return;try{const r=await apiCall('simularPrecificacao',{produtoId:p,formaPagamentoId:f,precoSimulado:document.getElementById('calcPrecoSimulado').value,embalagem:document.getElementById('calcEmbalagem').value,outrosCustos:document.getElementById('calcOutros').value,taxaMarketplace:document.getElementById('calcMarketplace').value});if(r.ok){document.getElementById('calcCusto').textContent=formatarMoeda(r.custoTecnico);document.getElementById('calcResultado').textContent='Custo total: '+formatarMoeda(r.custoTotal)+' · taxa pagamento: '+formatarMoeda(r.taxaPagamento)+(Number(r.impostos)>0?' · imposto ('+String(r.impostosPct).replace('.',',')+'%): '+formatarMoeda(r.impostos):'')+' · resultado: '+formatarMoeda(r.resultado)+' · margem: '+r.margem.toFixed(2).replace('.',',')+'% · markup: '+r.markup.toFixed(2)+'x'+(Number(r.resultado)<0?' · ⚠️ PREJUÍZO: com esse preço você perde '+formatarMoeda(-Number(r.resultado))+' a cada venda':(Number(r.resultado)===0?' · sem lucro':''));}else document.getElementById('calcResultado').textContent=r.message;}catch(e){document.getElementById('calcResultado').textContent='Não foi possível simular agora.';}}
function prepararCalculadoraUI(){const sp=document.getElementById('calcProduto'),sf=document.getElementById('calcForma');if(!sp||!sf)return;sp.innerHTML=(produtos||[]).filter(p=>p.ativo).map(p=>`<option value="${p.id}">${escH(p.nome)}</option>`).join('');sf.innerHTML=(formasPagamento||[]).filter(f=>f.ativa).map(f=>`<option value="${f.id}">${escH(f.nome)}</option>`).join('');calcularCustoUI();}
async function aplicarPrecoCalculadoraUI(){const p=document.getElementById('calcProduto').value,f=document.getElementById('calcForma').value,v=document.getElementById('calcPrecoSimulado').value;try{if(!(Number(v)>0)){showMsg('calcMsg','Informe o preço base simulado.','warn');return;}if(!await confirmarTxt_('Aplicar R$ '+Number(v).toFixed(2).replace('.',',')+' como preço base deste produto? Vale para todas as formas de pagamento (o acréscimo de cada forma é somado na venda).'))return;const r=await apiCall('aplicarPrecoCalculadora',{produtoId:p,formaPagamentoId:f,novoPreco:v});showMsg('calcMsg',r.message,r.ok?'ok':'warn');if(r.ok){produtoPrecos=r.produtoPrecos||produtoPrecos;document.getElementById('calcPrecoSimulado').value='';calcularCustoUI();}}catch(e){showMsg('calcMsg','Erro ao aplicar preço.','warn');}}
/* ---------- PEDIDOS ARQUIVADOS: o TELEFONE é a chave do cliente (nem todo cliente tem conta Google) ----------
   Os pedidos que saíram do banco ficam num resumo leve no Supabase (vendas_resumo_arquivo); o detalhe completo continua na planilha. */
let _arqResumoTel_ = null, _arqResumoQuando_ = 0, _arqResumoCarregando_ = false;
const _arqCli_ = {};   // telefone -> { estado:'carregando'|'ok'|'erro', pedidos:[] }
async function rpcArq_(fn, args){
  const t = await sb410Token_();
  const r = await sbJson_(SUPABASE_URL_+'/rest/v1/rpc/'+fn, { method:'POST', headers:{ apikey:SUPABASE_CHAVE_, Authorization:'Bearer '+t, 'Content-Type':'application/json' }, body: JSON.stringify(args||{}) }, 30000, 1);
  return await r.json();
}
function arqPodeLer_(){ return typeof USAR_SUPABASE_!=='undefined' && USAR_SUPABASE_ && typeof sb410Gestor_==='function' && sb410Gestor_(); }
function arqLinhaParaVenda_(r){
  return { id:r.venda_id, arquivado:true, data:sbDataBr_(r.data_hora), timestamp:Date.parse(r.data_hora)||0, valorTotal:Number(r.valor_total)||0,
    tipoEntrega:r.tipo||'Retirada', formaPagamento:r.forma_pagamento||'', statusPagamento:r.status_pagamento||'Pago', statusPedido:r.status_pedido||'', status:r.status||'Confirmada',
    endereco:r.endereco||'', complemento:r.complemento||'', clienteTelefone:r.telefone||'', clienteNome:r.cliente_nome||'', numero:Number(r.numero_pedido)||0, itensTexto:r.itens_texto||'' };
}
async function carregarArquivoCliente_(tel, clienteId, forcar){
  if(!tel || !arqPodeLer_()) return;
  const atual = _arqCli_[tel];
  if(atual && !forcar && (atual.estado==='carregando' || atual.estado==='ok')) return;
  _arqCli_[tel] = { estado:'carregando', pedidos: atual ? atual.pedidos : [] };
  try{
    const j = await rpcArq_('api_historico_cliente_arquivo', { p_telefone: /^ifood:/.test(tel) ? '' : tel, p_cliente_id: clienteId || null });
    if(!j || !j.ok) throw new Error((j && j.message) || 'falha');
    _arqCli_[tel] = { estado:'ok', pedidos:(j.pedidos||[]).map(arqLinhaParaVenda_) };
  }catch(e){ _arqCli_[tel] = { estado:'erro', pedidos: [] }; }
  if(_histFiltro_ && _histFiltro_.tel===tel && document.getElementById('mHistoricoSection') && document.getElementById('clienteModal').classList.contains('open')) renderHistoricoCliente(tel, true);
}
async function carregarResumoArquivoClientes_(){
  if(!arqPodeLer_() || _arqResumoCarregando_ || (_arqResumoTel_ && Date.now()-_arqResumoQuando_ < 300000)) return;
  _arqResumoCarregando_ = true;
  try{
    const j = await rpcArq_('api_clientes_arquivo_resumo', {});
    if(j && j.ok){
      const m = {}; (j.clientes||[]).forEach(c=>{ m[normTel(c.telefone)] = { pedidos:Number(c.pedidos)||0, total:Number(c.total)||0, ultimo: Date.parse(c.ultimo)||0 }; });
      const era = _arqResumoTel_; _arqResumoTel_ = m; _arqResumoQuando_ = Date.now();
      if(!era && Object.keys(m).length && document.getElementById('cTable')) renderClientes();
    }
  }catch(e){ /* sem o arquivo, a lista segue só com o que está no sistema */ }
  finally{ _arqResumoCarregando_ = false; }
}
/* ---------- SEGMENTOS (Fase 4): Novo, Fiel, VIP, Em risco — calculados no Supabase pelo TELEFONE, juntando pedidos ativos + arquivados ---------- */
const SEG_DIAS_RISCO_ = 45;
const SEG_REGRAS_ = { 'Novo':'1 a 3 pedidos', 'Fiel':'4 ou mais pedidos', 'VIP':'10 ou mais pedidos, ou R$ 800 ou mais gastos', 'Em risco':'sem pedir há mais de '+SEG_DIAS_RISCO_+' dias' };
const SEG_CLASSE_ = { 'Novo':'neutro', 'Fiel':'ok', 'VIP':'ouro', 'Em risco':'erro' };
let _segTel_ = null, _segQuando_ = 0, _segCarregando_ = false;
async function carregarSegmentosClientes_(forcar){
  if(!arqPodeLer_() || _segCarregando_ || (!forcar && _segTel_ && Date.now()-_segQuando_ < 300000)) return;
  _segCarregando_ = true;
  try{
    const j = await rpcArq_('api_clientes_segmentos', { p_dias_risco: SEG_DIAS_RISCO_ });
    if(j && j.ok){
      const m = {}; (j.clientes||[]).forEach(c=>{ m[chaveNorm_(c.telefone)] = c; });
      const era = _segTel_; _segTel_ = m; _segQuando_ = Date.now();
      if(!era && document.getElementById('cTable')) renderClientes();
    }
  }catch(e){ /* sem o Supabase, a lista segue sem os selos */ }
  finally{ _segCarregando_ = false; }
}
function seloSegmento_(tel){
  const s = _segTel_ && _segTel_[chaveNorm_(tel)];
  if(!s || !SEG_CLASSE_[s.segmento]) return '';
  return ` <span class="badge ${SEG_CLASSE_[s.segmento]}">${escH(s.segmento)}</span>`;
}
function renderClientes(){
  carregarResumoArquivoClientes_();
  carregarSegmentosClientes_();
  const filtro = document.getElementById('cSearch').value.toLowerCase();
  const modo = filtroClientesAtual_();
  const modoInativos = modo==='inativos';
  const segAlvo = FILTRO_SEGMENTO_[modo] || '';
  const dias = Number(document.getElementById('diasInativo').value) || 30;
  const tbody = document.getElementById('cTable');
  let lista = clientes.filter(c => clienteCombinaBusca_(c, filtro));
  if(modoInativos){
    const agora = Date.now();
    lista = lista.filter(c=>{ const ult = ultimaAtividadeCliente(c); return !ult || (agora - ult) / 86400000 > dias; });
  }
  if(modo==='ifood') lista = lista.filter(c=>!!c.ifoodId);   // v1.24: só quem pediu pelo iFood
  if(segAlvo){
    if(!arqPodeLer_()){ tbody.innerHTML = '<tr class="empty-row"><td colspan="3">' + estadoVazio_('Os segmentos precisam do servidor principal (Supabase) e de um perfil de gestão. Agora ele não está disponível.') + '</td></tr>'; return; }
    if(!_segTel_){ tbody.innerHTML = '<tr class="empty-row"><td colspan="3">' + estadoVazio_('⏳ Calculando os segmentos…') + '</td></tr>'; return; }
    lista = lista.filter(c=>{ const s = _segTel_[chaveCliente_(c)]; return s && s.segmento===segAlvo; });
  }
  lista = lista.slice().reverse();
  if(lista.length===0){ tbody.innerHTML = '<tr class="empty-row"><td colspan="3">' + ((filtro || modo!=='todos') ? estadoVazio_(segAlvo ? 'Nenhum cliente '+segAlvo+' agora ('+SEG_REGRAS_[segAlvo]+').' : modo==='ifood' ? 'Nenhum cliente do iFood encontrado.' : 'Nenhum cliente encontrado.') : estadoVazio_('Nenhum cliente ainda. Eles entram na lista quando fazem um pedido.')) + '</td></tr>'; return; }
  tbody.innerHTML = lista.map(c=>`<tr><td>${c.nome?escH(c.nome):'<em class="txt-muted">(sem nome)</em>'}${seloSegmento_(chaveCliente_(c))}${c.ifoodId?' <span class="selo-ifood" title="Cliente que pediu pelo iFood">iFood</span>':''}</td><td>${c.ifoodId && !c.telefone ? '<span class="txt-muted">iFood (sem telefone)</span>' : escH(c.telefone)}</td><td><button class="small-gold" onclick="abrirPerfilCliente('${c.id}')">abrir</button></td></tr>`).join('');
}
/* ---------- PERFIL 360 (Fase 4): ficha do cliente no topo do perfil ---------- */
const _p360_ = {};   // telefone -> { quando, dados }
function p360Data_(iso){ const t = Date.parse(iso||''); return t ? new Date(t).toLocaleDateString('pt-BR') : '—'; }
function p360Dias_(n){ return n===null||n===undefined ? '' : (n===0 ? 'hoje' : n===1 ? 'ontem' : 'há '+n+' dias'); }
function htmlPerfil360_(d){
  const seg = d.segmento || 'Sem pedido';
  const selo = SEG_CLASSE_[seg] ? `<span class="badge ${SEG_CLASSE_[seg]}">${escH(seg)}</span>` : '<span class="badge neutro">Sem pedido</span>';
  const conta = d.conta || {};
  const linhaConta = conta.temConta
    ? `✅ Tem conta Google · ${conta.aceitaPromocoes ? 'aceita receber promoções' : 'não aceitou promoções'}${conta.ultimoAcesso ? ' · último acesso '+p360Data_(conta.ultimoAcesso) : ''}`
    : 'Sem conta Google (cadastro só pelo telefone)';
  let h = `<div class="modal-section"><h3>Perfil 360 ${selo}</h3>`;
  if(!d.pedidos){
    h += `<div class="obs-line">Ainda sem pedidos confirmados. ${escH(linhaConta)}</div></div>`;
    return h;
  }
  if(SEG_REGRAS_[seg]) h += `<div class="obs-line mb-2">${escH(seg)}: ${escH(SEG_REGRAS_[seg])}.${seg==='Em risco' ? ' Último pedido '+p360Dias_(d.diasDesdeUltimo)+'.' : ''}</div>`;
  h += `<div class="info-line">Pedidos: <b>${d.pedidos}</b>${d.pedidosArquivados ? ' <span class="txt-muted">('+d.pedidosArquivados+' arquivado'+(d.pedidosArquivados>1?'s':'')+')</span>' : ''} · Gasto total: <b class="txt-ouro">${formatarMoeda(d.totalGasto)}</b></div>`;
  h += `<div class="info-line">Ticket médio: <b>${formatarMoeda(d.ticketMedio)}</b> · Últimos 90 dias: ${d.pedidos90d} pedido(s), ${formatarMoeda(d.gasto90d)}</div>`;
  h += `<div class="info-line">Primeiro pedido: ${p360Data_(d.primeiroPedido)} · Último: ${p360Data_(d.ultimoPedido)} (${p360Dias_(d.diasDesdeUltimo)})</div>`;
  if(d.frequenciaDias!==null && d.frequenciaDias!==undefined) h += `<div class="info-line">Frequência: um pedido a cada ~${String(d.frequenciaDias).replace('.',',')} dia(s)</div>`;
  if((d.itensFavoritos||[]).length) h += `<div class="info-line">Favoritos: ${d.itensFavoritos.map(f=>escH(f.item)+' <span class="txt-muted">('+f.qtd+'x)</span>').join(' · ')}</div>`;
  const costuma = [d.tipoPreferido, d.formaPreferida].filter(Boolean).map(escH).join(' · ');
  if(costuma) h += `<div class="info-line">Costuma pedir: ${costuma}</div>`;
  h += `<div class="info-line">${escH(linhaConta)}</div></div>`;
  return h;
}
async function renderPerfil360_(cliente, forcar){
  const box = document.getElementById('mPerfil360Section');
  if(!box) return;
  if(!cliente || !arqPodeLer_()){ box.innerHTML = ''; return; }
  const tel = chaveCliente_(cliente), id = cliente.id;
  const cache = _p360_[tel];
  if(cache && !forcar && Date.now()-cache.quando < 60000){ box.innerHTML = htmlPerfil360_(cache.dados); return; }
  box.innerHTML = '<div class="modal-section"><h3>Perfil 360</h3><div class="obs-line">⏳ Calculando…</div></div>';
  try{
    const j = await rpcArq_('api_cliente_360', { p_telefone: /^ifood:/.test(tel) ? '' : tel, p_cliente_id: id || null, p_dias_risco: SEG_DIAS_RISCO_ });
    if(!j || !j.ok) throw new Error((j && j.message) || 'falha');
    _p360_[tel] = { quando: Date.now(), dados: j };
    if(modalClienteId===id) box.innerHTML = htmlPerfil360_(j);
  }catch(e){
    if(modalClienteId===id) box.innerHTML = '<div class="modal-section"><h3>Perfil 360</h3><div class="obs-line">⚠️ Não consegui calcular agora. <button type="button" class="small-gold" onclick="renderPerfil360_(clientes.find(c=>c.id===modalClienteId), true)">Tentar de novo</button></div></div>';
  }
}
var _histFiltro_ = { tel:'', per:'todos', tipo:'todos', pag:'todos' };
function histFiltroMudou_(){
  _histFiltro_.per = document.getElementById('hfPer').value; _histFiltro_.tipo = document.getElementById('hfTipo').value; _histFiltro_.pag = document.getElementById('hfPag').value;
  renderHistoricoCliente(_histFiltro_.tel, true);
}
function renderHistoricoCliente(telefone, manterFiltro){
  const box = document.getElementById('mHistoricoSection');
  if(!box) return;
  const tel = chaveNorm_(telefone);
  if(!manterFiltro || _histFiltro_.tel !== tel) _histFiltro_ = { tel: tel, per:'todos', tipo:'todos', pag:'todos' };
  const cadastro = clientes.find(c=>chaveCliente_(c)===tel);
  carregarArquivoCliente_(tel, cadastro ? cadastro.id : null);
  const arq = _arqCli_[tel] || { estado:'carregando', pedidos:[] };
  const idsAtivos = new Set(vendas.map(v=>v.id));
  const todos = vendas.filter(v=>chaveVendaCliente_(v)===tel && v.status==='Confirmada')
    .concat(arq.pedidos.filter(v=>v.status==='Confirmada' && !idsAtivos.has(v.id))).sort((a,b)=>b.timestamp-a.timestamp);
  const F = _histFiltro_, limite = F.per==='todos' ? 0 : Date.now() - Number(F.per)*86400000;
  const pedidos = todos.filter(v=> (!limite || v.timestamp >= limite) && (F.tipo==='todos' || v.tipoEntrega===F.tipo) && (F.pag==='todos' || (F.pag==='receber' ? v.statusPagamento==='A Receber' : v.statusPagamento!=='A Receber')));
  const sel = (id, atual, ops) => `<select id="${id}" onchange="histFiltroMudou_()" style="width:auto;display:inline-block;margin:0 6px 6px 0;">${ops.map(o=>`<option value="${o[0]}"${String(atual)===String(o[0])?' selected':''}>${o[1]}</option>`).join('')}</select>`;
  const barraFiltros = todos.length < 2 ? '' : `<div class="mb-2">`
    + sel('hfPer', F.per, [['todos','Todo o período'],['7','Últimos 7 dias'],['30','Últimos 30 dias'],['90','Últimos 90 dias']])
    + sel('hfTipo', F.tipo, [['todos','Entrega e retirada'],['Entrega','Só entrega'],['Retirada','Só retirada'],['Mesa','Só mesa']])
    + sel('hfPag', F.pag, [['todos','Pago ou a receber'],['pago','Só pagos'],['receber','Só a receber']]) + `</div>`;
  if(todos.length && pedidos.length===0){ box.innerHTML = '<div class="modal-section"><h3>Histórico de pedidos</h3>'+barraFiltros+'<div class="notif-empty">Nenhum pedido com esses filtros.</div></div>'; return; }
  if(pedidos.length===0){ box.innerHTML = '<div class="modal-section"><h3>Histórico de pedidos</h3><div class="notif-empty">Nenhum pedido ainda.</div></div>'; return; }
  const totalGasto = pedidos.reduce((s,v)=>s+Number(v.valorTotal),0);
  const ticketMedio = totalGasto / pedidos.length;
  let html = `<div class="modal-section"><h3>Histórico de pedidos</h3>
    ${barraFiltros}
    <div class="fs-xs txt-muted mb-3">
      ${pedidos.length} pedido(s) · Total gasto: <b class="txt-ouro">${formatarMoeda(totalGasto)}</b> · Ticket médio: <b class="txt-ouro">${formatarMoeda(ticketMedio)}</b>
    </div>
    ${arq.estado==='carregando' ? '<div class="obs-line mb-2">⏳ Buscando pedidos antigos (arquivados)… os totais acima serão atualizados.</div>'
      : arq.estado==='erro' ? '<div class="obs-line mb-2">⚠️ Não consegui buscar os pedidos antigos agora; os totais podem estar incompletos. <button type="button" class="small-gold" onclick="carregarArquivoCliente_(\''+tel+'\', '+(cadastro?'\''+cadastro.id+'\'':'null')+', true)">Tentar de novo</button></div>'
      : '<div class="obs-line mb-2">Inclui os pedidos antigos arquivados (' + arq.pedidos.length + ' arquivado(s)). Telefone é a chave do cliente.</div>'}
    <div style="max-height:220px;overflow-y:auto;">`;
  html += pedidos.map(v=>{
    const tipoIcone = v.tipoEntrega==='Entrega' ? '🛵 Entrega' : '🥡 Retirada';
    const endereco = v.tipoEntrega==='Entrega' && v.endereco ? `<div class="obs-line">${escH(v.endereco)}${escH(v.complemento?', '+v.complemento:'')}</div>` : '';
    return `<div class="notif-card">
      <div>${v.data} — <b>${formatarMoeda(v.valorTotal)}</b></div>
      <div class="obs-line">${v.arquivado ? escH(String(v.itensTexto||'').replace(/ \| /g, ', ')) + ' <span class="txt-muted">(arquivado)</span>' : itensDoPedido(v.id)}</div>
      <div class="obs-line">${tipoIcone} · ${escH(v.formaPagamento)}${v.statusPagamento==='A Receber'?' · 💰 a receber':''} · ${v.statusPedido||''}</div>
      ${endereco}
    </div>`;
  }).join('');
  html += `</div></div>`;
  box.innerHTML = html;
}
async function salvarPreferenciasCliente_(){
  const msg = document.getElementById('mPrefMsg'), id = modalClienteId;
  if(!id) return;
  const txt = document.getElementById('mPreferencias').value.trim();
  msg.textContent = 'Salvando…';
  try{
    const j = await rpcArq_('api_cliente_preferencias', { p_cliente: id, p_texto: txt });
    if(!j || !j.ok) throw new Error((j && j.message) || 'falha');
    const c = clientes.find(x=>x.id===id); if(c) c.preferencias = j.preferencias || '';
    msg.textContent = '✅ Salvo. Vale para os próximos pedidos dele.';
  }catch(e){ msg.textContent = '⚠️ Não consegui salvar: ' + (e.message||'erro'); }
}
function abrirPerfilCliente(clienteId){
  modalClienteId = clienteId;
  const cliente = clienteId ? clientes.find(c=>c.id===clienteId) : null;
  document.getElementById('mTitulo').textContent = cliente ? 'Perfil do cliente' : 'Novo cliente';
  document.getElementById('mNome').value = cliente ? cliente.nome : '';
  document.getElementById('mTelefone').value = cliente ? cliente.telefone : '';
  document.getElementById('mNascimento').value = cliente ? (cliente.dataNascimento||'') : '';
  document.getElementById('mComoConheceu').value = cliente ? (cliente.comoConheceu||'') : '';
  document.getElementById('mEndereco').value = cliente ? (cliente.endereco||'') : '';
  document.getElementById('mObs').value = cliente ? (cliente.observacao||'') : '';
  { const pb = document.getElementById('mPrefBox'); if(pb){ pb.style.display = (cliente && arqPodeLer_()) ? 'block' : 'none'; document.getElementById('mPreferencias').value = cliente ? (cliente.preferencias||'') : ''; document.getElementById('mPrefMsg').textContent = ''; } }
  document.getElementById('mExcluirBtn').style.display = cliente ? 'block' : 'none';
  document.getElementById('mMsg').className = 'msg';
  renderPerfil360_(cliente);
  if(cliente) renderHistoricoCliente(chaveCliente_(cliente)); else document.getElementById('mHistoricoSection').innerHTML = '';
  const box = document.getElementById('mPromoSections');
  const soIfood_ = !!(cliente && cliente.ifoodId && !normTel(cliente.telefone));
  if(!cliente){ box.innerHTML = ''; }
  else if(soIfood_){
    box.innerHTML = '<div class="modal-section"><h3>🛵 Cliente do iFood</h3><div class="obs-line">Cadastrado sozinho por um pedido do iFood. O iFood não envia o telefone do cliente (manda um 0800 com código localizador, que aparece no pedido), por isso cartão fidelidade e indicação não se aplicam. Os pedidos dele aparecem no histórico abaixo.</div></div><div id="mIfoodUniao"></div>';
    ifoodUniaoCarregar_(cliente);
  }
  else {
    const tel = normTel(cliente.telefone);
    const fid = fidelidadeClientes.find(f=>normTel(f.telefone)===tel);
    const indicou = indicacoes.filter(i=>normTel(i.telIndicador)===tel);
    const foiIndicadoPor = indicacoes.find(i=>normTel(i.telIndicado)===tel);
    let html = `<div class="modal-section"><h3>Indicações</h3>`;
    html += indicou.length ? `<div class="info-line">Indicou: ${escH(indicou.map(i=>i.nomeIndicado).join(', '))}</div>` : `<div class="info-line">Ainda não indicou ninguém.</div>`;
    html += foiIndicadoPor ? `<div class="info-line">Foi indicado por: ${escH(foiIndicadoPor.nomeIndicador)}</div>` : '';
    const premiosInd = (produtos||[]).filter(p=>p.ativo && p.premioIndicacao);
    if(indicou.some(i=>!i.resgatado)){
      html += premiosInd.length
        ? `<div class="mt-2"><label>Prêmio da indicação:</label><select id="mPremioIndSel">${premiosInd.map(p=>`<option value="${p.id}">${escH(p.nome)}</option>`).join('')}</select><button class="small-gold" style="width:100%;margin-top:6px;" onclick="resgatarBrindeCliente_('Indicação')">🎁 Resgatar indicação</button></div>`
        : `<div class="obs-line">Nenhum prêmio cadastrado. Fale com o gerente.</div>`;
    }
    html += `<button class="small-gold" onclick="abrirModalIndicado()">Indicou alguém</button></div>`;
    const carimbos = fid ? fid.carimbos : 0;
    html += `<div class="modal-section"><h3>Cartão Fidelidade</h3><div class="punch">`;
    for(let i=1;i<=10;i++) html += `<div class="hole ${i<=carimbos?'filled':''}" role="img" aria-label="${i<=carimbos?'Marca '+i+' carimbada':'Marca '+i+' vazia'}"></div>`;
    const premiosFid = (produtos||[]).filter(p=>p.ativo && p.premioFidelidade);
    html += `</div><div class="info-line">${carimbos} de 10 marcas${fid&&fid.premios?(' · '+fid.premios+' prêmio(s) resgatado(s)'):''}</div>`;
    if(carimbos >= 10){
      html += premiosFid.length
        ? `<div class="mt-2"><label>Prêmio:</label><select id="mPremioFidSel">${premiosFid.map(p=>`<option value="${p.id}">${escH(p.nome)}</option>`).join('')}</select><button class="small-gold" style="width:100%;margin-top:6px;" onclick="resgatarBrindeCliente_('Fidelidade')">🎁 Resgatar prêmio</button></div>`
        : `<div class="obs-line">Nenhum prêmio cadastrado. Fale com o gerente.</div><button class="small-gold" style="width:100%;margin-top:6px;" onclick="showMsg('mMsg','Nenhum prêmio cadastrado. Fale com o gerente.','warn')">Resgatar prêmio</button>`;
    }
    html += `<div class="btnrow"><button class="small-gold" style="flex:1;" onclick="adicionarMarcaModal()">+1 marca</button></div></div>`;
    box.innerHTML = html;
    if(cliente.ifoodId){ box.insertAdjacentHTML('afterbegin','<div id="mIfoodUniao"></div>'); ifoodUniaoCarregar_(cliente); }
  }
  const boxFeedback = document.getElementById('mFeedbackSection');
  if(boxFeedback){
    if(!cliente || soIfood_){ boxFeedback.innerHTML = ''; }
    else {
      const tel = normTel(cliente.telefone);
      const feedbacksDoCliente = feedbacks.filter(f=>normTel(f.telefone)===tel).sort((a,b)=>(b.data||'').localeCompare(a.data||''));
      let htmlFb = '<div class="modal-section"><h3>Feedbacks enviados</h3>';
      htmlFb += feedbacksDoCliente.length ? feedbacksDoCliente.map(f=>`<div class="notif-card">
          <div>${'★'.repeat(Math.max(0,Math.min(5,f.nota||0)))}${'☆'.repeat(5-Math.max(0,Math.min(5,f.nota||0)))} <span class="obs-line">${f.data}</span></div>
          ${f.comentario?`<div class="mt-1">${escH(f.comentario)}</div>`:''}
        </div>`).join('') : '<div class="notif-empty">Nenhum feedback enviado ainda.</div>';
      htmlFb += '</div>';
      boxFeedback.innerHTML = htmlFb;
    }
  }
  document.getElementById('clienteModal').classList.add('open');
}
function fecharModalCliente(){ document.getElementById('clienteModal').classList.remove('open'); }
async function salvarModalCliente(){
  const nome = document.getElementById('mNome').value.trim();
  const telefone = document.getElementById('mTelefone').value.trim();
  const dataNascimento = document.getElementById('mNascimento').value;
  const comoConheceu = document.getElementById('mComoConheceu').value;
  const endereco = document.getElementById('mEndereco').value.trim();
  const observacao = document.getElementById('mObs').value.trim();
  if(!nome || !telefone){ showMsg('mMsg','Nome e telefone são obrigatórios.','warn'); return; }
  try{
    const r = await apiCallFila('salvarCliente', { id: modalClienteId, nome, telefone, dataNascimento, endereco, comoConheceu, observacao });
    if(r.ok){
      clientes = r.clientes || clientes; renderClientes(); salvarCache();
      showMsg('mMsg', r.message, 'ok');
      if(r.enfileirado) return;
      const salvo = clientes.find(c=>normTel(c.telefone)===normTel(telefone));
      modalClienteId = salvo ? salvo.id : modalClienteId;
      document.getElementById('mExcluirBtn').style.display = 'block';
    } else { showMsg('mMsg', r.message, 'warn'); }
  } catch(e){ showMsg('mMsg','Não foi possível salvar.','warn'); }
}
async function excluirModalCliente(){
  if(!modalClienteId) return;
  if(!await confirmarTxt_('Excluir este cliente do cadastro? O histórico de promoções dele permanece registrado.')) return;
  const executar = async (senha)=>{
    try{
      const r = await apiCall('excluirCliente', { id: modalClienteId, senhaAdminConfirmacao: senha||'' });
      if(r.ok){ clientes = r.clientes || clientes; renderClientes(); salvarCache(); fecharModalCliente(); }
      else showMsg('mMsg', r.message, 'warn');
    } catch(e){ showMsg('mMsg','Não foi possível excluir.','warn'); }
  };
  if(precisaConfirmarAdmin()) abrirModalSenhaAdmin(executar); else executar();
}
/* recarrega o perfil aberto (mesmo cliente, pelo id) e mantém o modal aberto com a mensagem de sucesso */
function reabrirPerfilAtual_(telefone, msg){
  let id = modalClienteId;
  if(!id){ const t = normTel(telefone); const c = clientes.find(x => normTel(x.telefone) === t); id = c ? c.id : null; }
  const modal = document.getElementById('clienteModal') || document.querySelector('#mTitulo') && document.querySelector('#mTitulo').closest('.modal-overlay');
  const rolagem = modal ? (modal.querySelector('.modal-box') || modal).scrollTop : 0;
  abrirPerfilCliente(id);
  if(modal){ modal.classList.add('open'); const box = modal.querySelector('.modal-box') || modal; box.scrollTop = rolagem; }
  if(msg) showMsg('mMsg', msg, 'ok');
}
async function adicionarMarcaModal(){
  const nome = document.getElementById('mNome').value.trim();
  const telefone = document.getElementById('mTelefone').value.trim();
  try{ const r = await apiCallFila('addOrStampFidelidade', { telefone, nome, observacao: '' }, 'Carimbo de fidelidade'); if(r.fidelidade) fidelidadeClientes = r.fidelidade; salvarCache(); showMsg('mMsg', r.message, r.ok?'ok':'warn'); if(r.ok) reabrirPerfilAtual_(telefone, r.message); }
  catch(e){ showMsg('mMsg','Não foi possível registrar.','warn'); }
}
async function resgatarBrindeCliente_(tipo){
  if(!sessaoCaixa){ showMsg('mMsg','Abra o caixa antes de lançar o brinde.','warn'); return; }
  const selId = tipo==='Fidelidade' ? 'mPremioFidSel' : 'mPremioIndSel';
  const produtoId = (document.getElementById(selId)||{}).value;
  if(!produtoId){ showMsg('mMsg','Nenhum prêmio disponível.','warn'); return; }
  const p = produtos.find(x=>x.id===produtoId);
  if(!await confirmarTxt_('Lançar "'+(p?p.nome:'brinde')+'" como prêmio?\n\nZera o cartão (ou marca a indicação) e baixa o estoque.', 'Lançar prêmio', false, 'Lançar prêmio')) return;
  const telefone = document.getElementById('mTelefone').value.trim();
  const ind = tipo==='Indicação' ? indicacoes.find(i=>normTel(i.telIndicador)===normTel(telefone) && !i.resgatado) : null;
  const telIndicado = ind ? ind.telIndicado : null;
  if(tipo==='Indicação' && !telIndicado){ showMsg('mMsg','Indicação pendente não encontrada.','warn'); return; }
  try{
    const r = await apiCall('registrarBrinde', { tipo, produtoId, telefone, telIndicado });
    if(r.fidelidade) fidelidadeClientes = r.fidelidade;
    if(r.indicacoes) indicacoes = r.indicacoes;
    if(r.estoque) estoque = r.estoque;
    if(r.movimentacoesEstoque) movimentacoesEstoque = r.movimentacoesEstoque;
    salvarCache();
    showMsg('mMsg', r.message, r.ok?'ok':'warn');
    if(r.ok) reabrirPerfilAtual_(telefone, r.message);
  }catch(e){ showMsg('mMsg','Não foi possível resgatar.','warn'); }
}
function abrirModalIndicado(){
  const nome = document.getElementById('mNome').value.trim();
  const telefone = document.getElementById('mTelefone').value.trim();
  document.getElementById('indicadoDe').textContent = 'Indicado por: ' + nome + ' (' + telefone + ')';
  document.getElementById('ndNome').value=''; document.getElementById('ndTelefone').value='';
  document.getElementById('ndNascimento').value=''; document.getElementById('ndEndereco').value='';
  document.getElementById('indicadoModal').dataset.telIndicador = telefone;
  document.getElementById('indicadoModal').dataset.nomeIndicador = nome;
  document.getElementById('indicadoModal').classList.add('open');
}
function fecharModalIndicado(){ document.getElementById('indicadoModal').classList.remove('open'); }
async function salvarNovoIndicado(){
  const modal = document.getElementById('indicadoModal');
  const telIndicador = modal.dataset.telIndicador, nomeIndicador = modal.dataset.nomeIndicador;
  const nome = document.getElementById('ndNome').value.trim();
  const telefone = document.getElementById('ndTelefone').value.trim();
  const dataNascimento = document.getElementById('ndNascimento').value;
  const endereco = document.getElementById('ndEndereco').value.trim();
  if(!nome || !telefone){ showMsg('ndMsg','Nome e telefone são obrigatórios.','warn'); return; }
  try{
    const r = await apiCall('indicarNovoCliente', { telIndicador, nomeIndicador, nome, telefone, dataNascimento, endereco, comoConheceu: 'Indicação', observacao: '' });
    if(r.ok){
      clientes = r.clientes || clientes; indicacoes = r.indicacoes || indicacoes; salvarCache();
      showMsg('ndMsg', r.message, 'ok'); renderClientes();
      setTimeout(()=>{ fecharModalIndicado(); abrirPerfilCliente(telIndicador); }, 900);
    } else { showMsg('ndMsg', r.message, 'warn'); }
  } catch(e){ showMsg('ndMsg','Não foi possível registrar.','warn'); }
}

/* ============================================================
   PRODUTOS
   ============================================================ */
/* ITEM 14 — foto do Drive que carrega de verdade dentro de <img> */
function fotoIdDrive_(u){
  const s = String(u || '');
  const m = s.match(/[?&]id=([\w-]{10,})/) || s.match(/\/d\/([\w-]{10,})/);
  return m ? m[1] : '';
}
function fotoSrc_(u, largura){
  const id = fotoIdDrive_(u);
  if(!id) return u || '';
  return 'https://drive.google.com/thumbnail?id=' + id + '&sz=w' + (largura || 800);
}
function fotoFalhou_(img){
  if(!img) return;
  const id = fotoIdDrive_(img.currentSrc || img.src);
  const tentativa = Number(img.dataset.ft || 0);
  const alternativas = [
    'https://lh3.googleusercontent.com/d/' + id,
    'https://drive.google.com/uc?export=view&id=' + id
  ];
  if(!id || tentativa >= alternativas.length){ img.onerror = null; img.style.display = 'none'; return; }
  img.dataset.ft = String(tentativa + 1);
  img.src = alternativas[tentativa];
}



/* ---------- ENTRADA DO ADMINISTRADOR: só o menu; a tela abre quando você toca nela ---------- */
function renderAdminInicio_(){
  const box = document.getElementById('adminInicioConteudo'); if(!box) return;
  box.innerHTML = '<p class="obs-line mt-3">Escolha uma tela no menu' + (gruposAdmin_().length > 1 ? ' ou use o campo “Ir para…”.' : '.') + '</p>';
}


/* ===== Cliente do iFood × cliente do sistema: unir pelo nome + endereço (telefone o iFood não manda) ===== */
async function ifoodUniaoCarregar_(cliente){
  const el = document.getElementById('mIfoodUniao'); if(!el || !cliente) return;
  el.innerHTML = '<div class="obs-line">Procurando ligação com o iFood…</div>';
  let r; try{ r = await apiCall('clienteIfoodInfo', { id: cliente.id }); }catch(e){ r = null; }
  if(modalClienteId !== cliente.id) return;
  if(!r || !r.ok){ el.innerHTML = '<div class="obs-line" style="color:#c0392b;">Não consegui consultar a ligação com o iFood: ' + escH((r && r.message) || 'sem resposta') + '</div>'; return; }
  let h = '';
  const un = r.unioes || [];
  if(un.length){
    h += '<div class="modal-section"><h3>🛵 Também é cliente do iFood</h3>' + un.map(u=>
      '<div class="info-line"><b>Nome no iFood:</b> ' + escH(u.nomeIfood || '(sem nome)') + (u.igual ? '' : ' <span style="color:#b9770e;">· nome diferente do cadastro</span>') + '<br><span class="txt-muted">' + (u.auto ? '🤖 ligado sozinho pelo nome e endereço' : 'ligado por você') + ' · ' + escH(dataBr_(u.quando)) + '</span></div>').join('')
      + '<button class="small-gold" style="width:100%;margin-top:6px;" onclick="ifoodUniaoDesfazer_(\'' + cliente.id + '\')">Desfazer a ligação</button></div>';
  }
  const sug = r.sugestoes || [];
  if(sug.length){
    h += '<div class="modal-section"><h3>🔗 Unir com cliente do sistema</h3><div class="obs-line">Este cliente do iFood não tem telefone. Estes cadastros do sistema se parecem com ele (confira os nomes antes de unir):</div>' + sug.map(x=>
      '<div class="notif-card" style="margin-top:6px;"><b>' + escH(x.nome) + '</b> · ' + escH(x.telefone) + '<br><span class="txt-muted">' + escH(x.endereco || 'sem endereço') + '</span><br><span class="txt-muted">' + escH(x.motivo) + '</span>'
      + '<button class="small-gold" style="width:100%;margin-top:6px;" onclick="ifoodUniaoUnir_(\'' + cliente.id + '\',\'' + x.id + '\')">Unir com este</button></div>').join('') + '</div>';
  }
  el.innerHTML = h;
}
function dataBr_(d){ try{ return new Date(d).toLocaleDateString('pt-BR'); }catch(e){ return ''; } }
async function ifoodUniaoUnir_(fId, sId){
  const f = clientes.find(c=>c.id===fId); const sug = null;
  const alvo = (document.querySelector('#mIfoodUniao .notif-card button[onclick*="' + sId + '"]') || {}).parentNode;
  const nomeS = alvo ? (alvo.querySelector('b') || {}).textContent : '';
  if(!await confirmarTxt_('Unir "' + ((f && f.nome) || 'cliente do iFood') + '" (iFood) com "' + (nomeS || 'o cadastro escolhido') + '"? O telefone, a fidelidade e os pedidos passam a ser de um cliente só. O nome do iFood continua visível no perfil e dá para desfazer.')) return;
  const senha = await pedirSenha_(); if(!senha) return;
  try{
    const r = await apiCall('unirClientes', { ifoodClienteId: fId, sistemaClienteId: sId, senhaAdminConfirmacao: senha });
    if(!r || !r.ok){ showMsg('mMsg', (r && r.message) || 'Não foi possível unir.', 'warn'); return; }
    clientes = r.clientes || clientes; if(r.fidelidade) fidelidadeClientes = r.fidelidade; if(r.vendas) vendas = r.vendas; if(r.indicacoes) indicacoes = r.indicacoes;
    salvarCache(); renderClientes(); abrirPerfilCliente(sId); showMsg('mMsg', r.message, 'ok');
  }catch(e){ showMsg('mMsg', 'Não foi possível unir agora. Nada foi alterado.', 'warn'); }
}
async function ifoodUniaoDesfazer_(sId){
  if(!await confirmarTxt_('Desfazer a ligação? O cliente do iFood volta a ser um cadastro separado, com os pedidos dele.')) return;
  const senha = await pedirSenha_(); if(!senha) return;
  try{
    const r = await apiCall('desunirCliente', { id: sId, senhaAdminConfirmacao: senha });
    if(!r || !r.ok){ showMsg('mMsg', (r && r.message) || 'Não foi possível desfazer.', 'warn'); return; }
    clientes = r.clientes || clientes; if(r.fidelidade) fidelidadeClientes = r.fidelidade; if(r.vendas) vendas = r.vendas; if(r.indicacoes) indicacoes = r.indicacoes;
    salvarCache(); renderClientes(); abrirPerfilCliente(sId); showMsg('mMsg', r.message, 'ok');
  }catch(e){ showMsg('mMsg', 'Não foi possível desfazer agora. Nada foi alterado.', 'warn'); }
}
