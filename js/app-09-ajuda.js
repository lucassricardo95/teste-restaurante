/* ---------- AJUDA POR PERFIL: cada usuário abre só o manual do seu perfil ---------- */
const _aj = {
  entrar: (abas)=>({ t:'Entrar, sair e status', passos:[
    'Digite Login e Senha e toque em “Entrar”.',
    'Olhe o status no topo: 🟢 Online = tudo certo · 🟡 Sincronizando = aguarde · 🔴 Sem conexão = veja “E se der errado?” · 🟠 Contingência = o servidor está lento ou fora do ar e o app usa a reserva. Toque na bolinha colorida do topo para ver o estado do Supabase, da planilha principal e da contingência.',
    'Para sair, toque em “Sair” no topo. Para trocar a sua senha, toque em “🔑 Senha” (precisa da senha atual e de ao menos 8 caracteres).' ],
    itens:['Suas abas: '+abas+'. Um ponto dourado numa aba avisa que há algo novo.'],
    comuns:['“Login ou senha incorretos”: confira os dados. Se esqueceu a senha, só o Administrador pode redefinir.','“Sua sessão expirou”: entre de novo; o que você estava digitando pode se perder.','“Muitas tentativas erradas”: depois de 5 erros o login fica bloqueado por 10 minutos, contados a partir do primeiro erro. Espere e tente de novo, sem insistir.'] }),
  ocorr: (quem)=>({ t:'Registrar um problema (Ocorrência)', passos:[
    'No cartão do pedido, toque em “⚠️ Ocorrência”.',
    'Escolha o tipo, descreva o que aconteceu e confirme.',
    quem ]})
};
/* Rodapé de versão que aparece no fim de TODO manual de Ajuda. */
function ajudaRodapeVersao_(){
  const idade = (function(){
    try{
      const [d, m, a] = String(APP_ATUALIZADO_EM).split('/').map(Number);
      if(!d || !m || !a) return '';
      const dif = Math.floor((Date.now() - new Date(a, m - 1, d).getTime()) / 86400000);
      if(!isFinite(dif) || dif < 0) return '';
      if(dif === 0) return 'atualizada hoje';
      if(dif === 1) return 'atualizada ontem';
      if(dif < 30)  return 'atualizada há ' + dif + ' dias';
      const meses = Math.round(dif / 30);
      return 'atualizada há ' + (meses === 1 ? '1 mês' : meses + ' meses');
    }catch(e){ return ''; }
  })();
  return '<div style="text-align:center;font-size:12px;color:var(--muted);margin-top:16px;padding-top:10px;border-top:1px solid var(--line);">' +
    '' + NOME_H_() + ' · <b>' + escH(APP_VERSAO) + '</b> · ' + escH(APP_ATUALIZADO_EM) +
    (idade ? ' <span style="opacity:.8;">(' + escH(idade) + ')</span>' : '') +
    '</div>';
}

/* Monta a seção "🆕 O que mudou" a partir de APP_NOVIDADES[perfil]. */
function novidadesHtml_(perfil){
  const lista = (APP_NOVIDADES[perfil] || []).filter(r => r && Array.isArray(r.itens) && r.itens.length);
  if(!lista.length) return '';
  let ultimaVista = '';
  try{ ultimaVista = localStorage.getItem('txbAjudaVista_' + perfil) || ''; }catch(e){}
  const atual = lista[0].v;
  const temNova = !!ultimaVista && ultimaVista !== atual;
  try{ localStorage.setItem('txbAjudaVista_' + perfil, atual); }catch(e){}

  const bloco = (r, idx) => {
    const ehAtual = idx === 0;
    const selo = ehAtual && temNova
      ? ' <span class="badge" style="background:var(--red-hi,#d20807);color:#fff;border:0;font-size:12px;padding:1px 6px;">NOVO</span>'
      : '';
    const itens = r.itens.map(x => '<li>'+escH(x)+'</li>').join('');
    return '<div class="mt-2">' +
      '<div style="font-size:12px;color:var(--muted);letter-spacing:.03em;">' +
      escH(r.v) + (r.em ? ' · ' + escH(r.em) : '') + selo +
      '</div><ul class="ia-lista" style="margin-top:2px;">' + itens + '</ul></div>';
  };

  const atualHtml = bloco(lista[0], 0);
  const antigas = lista.slice(1);
  const antigasHtml = antigas.length
    ? '<details class="ajuda-det mt-2"><summary>Versões anteriores ('+antigas.length+')</summary>' +
      antigas.map((r, i) => bloco(r, i + 1)).join('') + '</details>'
    : '';

  return '<details class="ajuda-det"><summary>🆕 O que mudou</summary>' +
    '<p class="sub" style="margin:0 0 6px;font-size:12px;">Só aparece o que este perfil usa. A versão em uso está no rodapé.</p>' +
    atualHtml + antigasHtml + '</details>';
}

const MANUAL_AJUDA_ = {
Admin:{ nome:'Administrador', secoes:[
  _aj.entrar('Início, Caixa, Pedidos (com Retiradas, Entregas e Mesas), Clientes e Administrador. Os avisos ficam no botão redondo do ' + ASSISTENTE_ + ' (canto de baixo), na aba 🔔 Avisos'),
  { t:'Buscar (🔍 no topo)', itens:[
    'Toque na lupa 🔍 no topo, digite pelo menos 2 letras ou números e veja clientes (nome ou telefone, sem precisar de acento), pedidos (número, nome ou telefone do cliente) e produtos/combos.',
    'No cliente, toque em "abrir" para ver o perfil. No pedido, toque em "ver pedido completo": aparece também a 🕒 Linha do tempo (feito, aceito, pronto, saiu, entregue e quanto tempo levou cada etapa).' ]},

  { t:'Onde fica cada coisa', itens:[
    'Ao tocar em Admin, nada abre sozinho: aparecem só os 6 grupos; toque num grupo para ver as telas dele e depois na tela que quer abrir.',
    'A aba Administrador tem uma barra dividida em 6 grupos: Hoje (Visão Geral, Ocorrências, Feedbacks); Dinheiro (Contas a pagar e despesas, Histórico, Reembolsos e ajustes, Previsto e metas, Relatórios e DRE); Produtos (Produtos, combos e adicionais, Estoque, Compras e fornecedores, Custos e precificação); Vendas e cardápio (Raio-X do negócio, Cardápio Digital, Cardápio: funil e mapa, Formas de pagamento, Promoções e cupons, Eventos); Loja e equipe (Ponto, Escala da equipe, Equipe e pagamentos, Entregadores e taxas, Mesas e QR Codes, Usuários e permissões, Configurar avisos); Sistema (Integrações e contas, Auditoria, Backup e espaço). A Saúde do sistema abre pela bolinha colorida do topo.',
    'O campo “Ir para…”, no topo do menu, acha uma tela pelo nome ou por uma palavra (ex.: cupom, estoque, iFood, reembolso). Toque na tela que aparecer.',
    'Cada tela do menu traz embaixo do nome uma linha explicando o que ela faz.',
    'Caixa, Pedidos, Entregas e Clientes funcionam como nos outros perfis, e você pode tudo.' ],
    prints:[{id:'admin-menu',alt:'Menu do Administrador com o campo Ir para',leg:'Administrador: o campo "Ir para…" (1) acha qualquer tela pelo nome.'}]},

  { t:'Equipe e pagamentos (salários)', prints:[{id:'adm-equipe',alt:'Administrador, Loja e equipe, Equipe e pagamentos',leg:'O botão + Novo funcionário (1) abre a ficha; salário, dia do pagamento e encargos ficam nela.'},{id:'adm-equipe-pagar',alt:'Equipe e pagamentos: lista de funcionários e pagamentos do mês',leg:'O botão Pagar (1) registra o pagamento do mês; mais abaixo, cada pagamento tem Recibo e Cancelar.'}], passos:[
    'Administrador → Loja e equipe → Equipe e pagamentos.',
    'Toque em "+ Novo funcionário" e preencha nome, cargo, salário mensal e o dia do pagamento. Em "Encargos (%)" coloque o percentual que o seu contador informar (0 se não houver). "Contar 13º e férias" só aumenta o custo mensal estimado; não lança nada.',
    'No topo escolha o mês. Os quadros mostram os salários do mês, quanto já foi pago e quanto falta.',
    'Para pagar, toque em "Pagar" na linha da pessoa: escolha o tipo (Salário, Adiantamento, Vale, Hora extra / diária, Comissão, 13º, Férias ou Outro), confira o valor e diga se saiu do caixa (dinheiro) ou fora dele (Pix, banco). O pagamento vira uma despesa na categoria Salários e entra no lucro do mês.',
    'Se a pessoa tem encargos e o tipo é Salário, a janela pergunta se deve lançar os encargos: eles ficam em Contas a pagar (vencimento no dia 20 do mês seguinte; ajuste lá se for outro dia).',
    'Em "Pagamentos do mês" toque em "Recibo" para imprimir ou salvar em PDF (com o valor por extenso e linhas de assinatura). "Cancelar" pede motivo e a senha do Administrador e cancela também a despesa lançada.',
    'Se passar do dia do pagamento e o mês ainda não estiver quitado, o sistema avisa o Administrador uma vez por dia até você registrar o pagamento.',
    'Para desligar alguém, toque em Editar e mude a situação para Desligado: o histórico fica guardado.'],
    comuns:['O aviso de pagamento pendente não some: falta registrar o pagamento no mês certo (confira o mês no topo da tela).','Os encargos e o 13º/férias mostrados são estimativas; confirme os percentuais com seu contador.']},
  { t:'Escala da equipe (quem trabalha quando)', prints:[{id:'adm-escala',alt:'Administrador, Loja e equipe, Escala da equipe',leg:'O botão Importar acessos (1) traz quem já usa o sistema; em cada dia, o + escala a pessoa e o horário abre para mudar ou remover.'}], passos:[
    'Administrador → Loja e equipe → Escala da equipe.',
    'Na primeira vez toque em "Importar acessos": todo mundo que já tem login vira funcionário e passa a ver a própria escala na tela Início. Outros funcionários você cadastra em Equipe e pagamentos (na ficha, escolha o acesso da pessoa).',
    'Use as setas para mudar de semana. "Por dia" mostra cada dia com quem trabalha (melhor no celular); "Por pessoa" mostra a grade da semana, com o total de horas de cada um (avisa acima de 44h) e quantos estão escalados por dia (vermelho = ninguém).',
    'Para escalar, toque em "+" (ou em "+ Escalar alguém"), escolha o tipo (Trabalho, Folga, Férias, Falta ou Atestado), a entrada e a saída (se a saída for depois da meia-noite, vale o dia seguinte) e, se quiser, a função. Toque em um horário já escalado para mudar ou remover. O sistema impede dois turnos que se sobrepõem e pergunta antes de escalar quem está de folga, férias ou atestado.',
    'Para não montar toda semana do zero: no botão "Padrão" da pessoa escreva o horário de cada dia (18:00-23:00; em branco é folga) e depois toque em "Aplicar padrão semanal" para preencher várias semanas. Só os dias vazios são preenchidos. "Copiar semana anterior" faz o mesmo com a semana passada.',
    'Toque em "Imprimir" para a escala em folha (ou salvar em PDF) ou em "WhatsApp" para mandar a semana em texto para o grupo da equipe.',
    'Cada pessoa vê a própria escala (próximos 7 dias) e o botão "Ver escala da equipe" no botão do relógio, no topo da tela. Falta e atestado só você vê; os demais veem "Ausente".'],
    comuns:['A pessoa não vê a própria escala: o funcionário dela precisa estar ligado ao acesso (use Importar acessos ou escolha o acesso na ficha).','Quem foi desligado some da grade das semanas novas, mas os turnos antigos ficam guardados.']},
  { t:'Margem, histórico de preços e compra sugerida', passos:['Margem baixa (Produtos): defina a margem mínima e veja os produtos abaixo dela, com o preço que leva de volta ao mínimo. Dá para dar um mínimo próprio a cada categoria (ex.: Bebidas) e ignorar um produto. O celular do dono só recebe aviso quando entra um produto novo abaixo do mínimo.','Histórico de preços (Produtos): lista cada preço que mudou, de quanto para quanto, quem mudou e quando. Dá para buscar por produto.','Compra sugerida (Estoque): lista os ingredientes no mínimo ou abaixo, com a quantidade para voltar ao dobro do mínimo, separados pelo fornecedor da última compra. O botão do WhatsApp já monta a mensagem.','Contas a pagar: o dono recebe aviso no celular na véspera do vencimento, no dia e quando já venceu.'] },
  { t:'Fechamento do mês, rendimento e contrato de evento', passos:['Relatórios → Fechamento do mês (PDF): usa o mês escolhido no DRE e gera uma folha com vendas, custos, despesas, eventos, folha paga e resultado, para guardar ou mandar ao contador.','Eventos → Rendimento por hora: mostra quanto cada evento rendeu por hora de equipe (horas do Ponto ou informadas por você) e compara com um dia normal de vendas.','Dentro do evento, Contrato (PDF) gera um contrato simples com as cláusulas que você puder editar (sinal, cancelamento, remarcação). Para valores altos, vale conferir com um advogado.'] },
  { t:'Etiquetas de validade (vigilância sanitária)', passos:['Toque no botão da etiqueta no topo da tela (Admin, Operador de caixa e Cozinha).','Escolha o item (ou escreva um nome), o tipo (Aberto, Manipulado, Descongelado ou Fechado), confira a data e a validade e a quantidade de etiquetas. Escolha 58 mm ou 80 mm e toque em Imprimir.','A validade é calculada pelos dias cadastrados e você pode trocar a data na hora. Cada impressão fica registrada (quem, quando e o quê) por 45 dias.','Só o Admin cadastra: em Itens e validades, toque em "Trazer ingredientes do estoque" e preencha os dias de cada item. Embaixo de cada item aparece uma sugestão geral só como dica; ela nunca é preenchida sozinha. Confira sempre com a regra da sua vigilância sanitária.'],comuns:['A validade veio em branco: o item não tem dias para o tipo escolhido. Informe a data à mão ou peça ao Admin para preencher.','A impressora não abre: use o mesmo aparelho e a mesma impressora dos comprovantes e escolha o tamanho certo do papel.']},
  { t:'Fotos em perdas, recebimentos e ocorrências', passos:['Depois de lançar uma perda de estoque, receber uma compra ou registrar uma ocorrência de pedido, o sistema pergunta se você quer anexar foto. É opcional: toque em Pular para seguir sem foto.','Dá para tirar até 3 fotos por lançamento. Elas ficam guardadas por 90 dias (prazo mudável em Backup e espaço) em um dos Drives e depois são apagadas sozinhas.','Para ver, procure o botão 📷 no próprio lançamento: Estoque → movimentações (perda), Compras (recebimento) e Ocorrências. Perda e recebimento só o dono vê; ocorrência o dono e o operador.','A foto só pode ser anexada logo depois do lançamento (30 minutos; 60 no recebimento) e por quem lançou.'],comuns:['A foto não foi salva: confira a internet e se a planilha tem o código novo do Apps Script (as duas planilhas, com Nova versão).']},
  { t:'Ponto: localização, rosto e foto da batida', passos:['Botão do relógio no topo da tela: o funcionário abre a janela, vê a escala dos próximos 7 dias e bate a entrada ou a saída.','Localização: em Administrador → Loja e equipe → Ponto, toque em "Definir local aqui" estando no restaurante. Depois disso o ponto só é aceito a até a distância escolhida (padrão 150 m).','Rosto: na primeira batida o funcionário aceita o termo e o sistema guarda um código numérico do rosto (não é a foto). Nas próximas, ele olha para a câmera e pisca; se o rosto conferir, a batida é registrada.','Se o rosto não conferir, ele pode tentar de novo ou mandar a selfie: a batida entra marcada como "rosto não conferiu" e você escolhe Aprovar ou Cancelar o registro em Ponto.','A foto de cada batida fica em um dos Drives por 90 dias (prazo mudável em Backup e espaço) e depois é apagada sozinha. Em Ponto você vê a foto (botão Foto), apaga o rosto de um funcionário, liga/desliga o reconhecimento e ajusta o rigor.'] },
  { t:'Escala: troca de turno, ponto e horas extras', passos:['Troca de turno: no botão do relógio (topo), o funcionário toca em "Pedir troca" no turno e escolhe com quem. O colega aceita ou recusa e, aceitando, o dono aprova em Equipe → Escala. Só depois da aprovação a escala muda.','Aviso: em Equipe → Escala o botão de avisar manda uma notificação no celular de quem trabalha (precisa ter ativado as notificações). Salvar um turno também avisa a pessoa.','Ponto: na aba Ponto o funcionário bate entrada e saída. O dono vê o relatório do mês, as horas extras e pode ajustar um registro esquecido. Sem saída batida, o sistema avisa no fim do dia.','Em Equipe há ainda a reserva mensal de 13º e férias (estimativa, não lança no financeiro) e o peso da mão de obra nas vendas dos últimos 6 meses.'] },
  { t:'Eventos: calendário, orçamento e a receber', passos:['Na lista de Eventos, toque em Calendário para ver o mês; toque no nome do evento para abrir.','Dentro do evento, Orçamento (PDF) pede o que está incluso e a forma de pagamento e abre a impressão/PDF para mandar ao contratante.','Em Contas a pagar aparece o cartão Eventos a receber (só leitura). O dinheiro só entra no financeiro quando você lança o recebimento no evento; os custos do evento ficam no próprio evento para não contar em dobro no resultado.','Se um evento já passou e ainda tem saldo, o sistema avisa o dono no celular e por e-mail.'] },
  { t:'Central de Eventos (festas e contratos)', prints:[{id:'adm-eventos',alt:'Administrador, Vendas e cardápio, Eventos',leg:'O botão + Novo evento (1) cria o evento; cada cartão mostra A receber, Recebido e Resultado.'},{id:'adm-eventos-custos',alt:'Evento aberto, aba Custos',leg:'Na aba Custos, o + Custo (1) lança o gasto; na aba Recebimentos, o + Recebimento.'}], passos:[
    'Administrador → Vendas e cardápio → Eventos.',
    'A lista separa Próximos (orçamento e confirmado), Em andamento e Concluídos e cancelados. No topo aparece o total a receber; evento que já passou e ainda tem saldo fica com aviso vermelho.',
    'Toque em "+ Novo evento", preencha nome, data, horário, local, contratante, telefone e valor contratado e toque em Salvar. Depois de salvo, as abas Custos e Recebimentos liberam.',
    'Aba Custos: "+ Custo" (o que foi, categoria, valor e data). Aba Recebimentos: "+ Recebimento" (valor, forma, data; já vem com o saldo que falta). O resultado do evento é valor contratado menos custos.',
    'Lançou errado? Toque em "Cancelar" ao lado do lançamento, informe o motivo (pede sua senha de administrador, se for o caso). Nada é apagado: o lançamento sai dos totais e fica na auditoria.',
    'Na aba Dados há atalhos: "WhatsApp do contratante" (abre a conversa com o resumo do que falta pagar), "Imprimir resumo" (contratado, recebimentos, custos e resultado), "Duplicar evento" (cria outro como Orçamento, sem custos nem recebimentos) e "Cancelar evento".'],
    comuns:['O recebimento não pode passar do valor que falta receber; se o valor contratado mudou, ajuste na aba Dados.','Evento cancelado continua na lista (Concluídos e cancelados), mas não entra nos totais a receber.']},
  { t:'Criar usuário e trocar senha', prints:[{id:'adm-usuarios',alt:'Administrador, Loja e equipe, Usuários e permissões',leg:'O botão + Novo acesso (1) cria o usuário; na lista você troca perfil, senha e desativa.'}], passos:[
    'Administrador → Loja e equipe → Usuários e permissões.',
    'Em "Criar acesso", preencha Login e Senha e escolha o perfil (Operador, Garçom, Cozinha, Entregador, Admin ou Desenvolvedor).',
    'Digite "Sua senha de administrador" e toque em "Criar acesso".',
    'Perfil Desenvolvedor: você cria como qualquer outro, mas depois de criado fica travado — só o próprio Desenvolvedor edita ou troca a senha. Nem você nem ele excluem esse acesso.',
    'Para mudar nome, telefone, perfil, situação ou redefinir a senha de alguém, na lista "Usuários cadastrados" toque na pessoa (ou no ⋯) e escolha Editar. Mudar perfil, situação, senha, ativar, desativar ou excluir pede a SUA senha de administrador (conferida de verdade). No seu próprio acesso o perfil fica travado e a senha se troca em "🔑 Senha".' ],
    comuns:['Entregador não aparece na escolha de entregas: usuário inativo ou sem o perfil Entregador.',
      'Funcionário esqueceu a senha: só você troca — não existe "esqueci minha senha".',
      'Você esqueceu a sua: rode redefinirSenhaAdminEmergencia no editor do Apps Script.'] },

  { t:'Cadastrar produtos e estoque', prints:[{id:'produtos-cadastro',alt:'Administrador, Produtos: botão Novo produto e o menu de três pontos de cada produto (Editar, Duplicar, Excluir)',leg:'1: + Novo produto. 2: o menu ⋯ de cada produto tem Editar, Duplicar (abre um novo produto já preenchido, sem salvar) e Excluir.'}], passos:[
    'Administrador → Produtos → Produtos, combos e adicionais → "+ Novo produto". Preencha nome, categoria, preço de venda e, se quiser, foto e descrição.',
    'Em "Como é feito?" escolha: 🍳 Preparado aqui (lanches, porções), 🥤 Comprado pronto (bebidas, sobremesa embalada) ou ✍️ Sem controle.',
    'Preparado aqui: digite o ingrediente (ex.: "quei"), toque nele e diga quanto vai em cada um. Ingrediente comprado por kg ou litro pede gramas ou ml. Não existe? Toque em "+ criar" ali mesmo. Para ir mais rápido, use "📋 Copiar receita de outro produto" e só ajuste. O custo aparece sozinho.',
    'Comprado pronto: informe "Paguei R$ __ por __ unidades" (ex.: 30 por 12 = R$ 2,50 por lata), quanto tem agora e o mínimo para avisar. Cada venda baixa 1 do estoque.',
    'Sem controle: digite o custo se souber.',
    'Se você fechar o "Novo produto" no meio, o rascunho fica guardado neste aparelho: ao abrir de novo o sistema pergunta se quer continuar de onde parou. Para mudar o preço de vários produtos de uma vez, toque em "% Ajustar preços" (em Produtos), informe o percentual (ex.: 8 ou -5) e a categoria; o custo não muda e fica na auditoria. Para esconder ou mostrar vários produtos no cardápio de uma vez, toque em "👁 Mostrar/esconder", marque os produtos e confirme (nada é apagado). O rascunho guarda também a receita, os adicionais e os preços por forma de pagamento. A foto pode ser tirada na hora pela câmera do celular.',
    'Embaixo do custo o sistema avisa se falta algo para o produto ficar completo (nome, preço, custo) e, quando o lucro está baixo, sugere um preço para uns 50% de lucro, com o botão "Usar". É só sugestão: você decide o preço. Para fazer um produto parecido com outro, toque no ⋯ do produto → "📄 Duplicar": abre o "Novo produto" já preenchido (com a receita) e só salva quando você tocar em Cadastrar.',
    'Em "⚙️ Mais opções" ficam o preço próprio do iFood (em branco = preço de venda), os adicionais, o destaque no cardápio e o prêmio (fidelidade/indicação).',
    'Produto novo já vem com os adicionais marcados que os outros produtos da mesma categoria têm ("Comprado pronto", como bebida, vem sem nenhum). Desmarque o que não vale para ele.',
    'Ingredientes: Produtos → Estoque → "+ Novo ingrediente": nome, como você compra (un, kg, litro) e "Paguei R$ __ por __". Para dar preço a vários de uma vez, use "💲 Preços em lote".' ],
    comuns:['O custo dos produtos e combos se atualiza sozinho quando o preço de um ingrediente muda (edição, lote ou compra recebida). O custo do combo é a soma dos produtos dele.',
      'Trocar a unidade de um ingrediente de kg para g (ou l para ml) converte as receitas sozinho. Trocar de "un" para kg não converte: o sistema avisa quais receitas revisar.',
      'O Estoque tem duas abas: Ingredientes e Bebidas e itens prontos. Bebidas não aparecem na hora de montar receita.',
      'O aviso "Cadastro incompleto" mostra quantos produtos estão sem custo e quantos ingredientes estão sem preço. Sem custo, margem e lucro dos relatórios ficam errados.',
      'Nas listas de Estoque, Produtos, Combos e Usuários, toque na linha (ou no ⋯) para ver as ações: editar, entrada, perda, inventário, excluir. No produto e no combo, tocar na linha já abre a edição.',
      'Entrada, perda e inventário abrem uma janela só, com a quantidade e o motivo juntos. Na perda, toque num motivo pronto (Estragou, Venceu…) ou escreva o seu.',
      'Cada venda baixa o estoque pela receita. Ingrediente no mínimo gera aviso em 🔔 Avisos (no Assistente), sem bloquear a venda. Ingrediente com mínimo 0 não avisa.',
      'Bebida e item comprado pronto não têm adicionais.'] },

  { t:'Prêmios: fidelidade e indicação', passos:[
    'Marque os produtos que podem ser prêmio em Produtos → Produtos, combos e adicionais → Editar → "🎁 Este produto é um prêmio".',
    'Clientes → toque no cliente. Com as 10 marcas do cartão, ou com uma indicação pendente, aparece o prêmio para escolher e o botão "🎁 Resgatar prêmio" (ou "Resgatar indicação").',
    'Confirme. O cartão zera (ou a indicação é marcada), o estoque do produto baixa e o custo entra no financeiro. O cliente não paga nada.' ],
    comuns:['O caixa precisa estar aberto: o prêmio fica registrado no turno.','"Nenhum prêmio cadastrado": nenhum produto ativo está marcado como prêmio daquele tipo.','As indicações pendentes também aparecem em 🔔 Avisos (no Assistente).'] },

  { t:'QR Code das mesas', prints:[{id:'adm-mesas-qr',alt:'Administrador, Mesas e QR Codes',leg:'Cadastre as mesas aqui (1) e use o botão QR Codes das mesas para imprimir.'}], passos:[
    'Administrador → Loja e equipe → Mesas e QR Codes → "📲 QR Codes das mesas".',
    'Escolha a mesa e toque em "🖨️ Imprimir esta mesa" (ou "Imprimir todas"). Também dá para "⬇️ Baixar PNG".',
    'Plastifique e deixe na mesa. O cliente pede pelo celular e você aceita o pedido em Pedidos.',
    'Se alguém espalhar o QR, use "🔄 Gerar novo código" e imprima o QR novo daquela mesa.' ],
    comuns:['O endereço do site (config-restaurante.js) está gravado nos QR; se mudar, é preciso imprimir de novo.'] },

  { t:'Menu de baixo (celular)', itens:[
    'No celular, o menu fica fixo na parte de baixo da tela: Início, Caixa, Pedidos e as outras telas do seu perfil. A aba aberta fica em dourado.',
    'Quando há mais telas do que cabem, aparece "Mais" com as demais. Uma bolinha vermelha avisa que há algo novo naquela aba.',
    'No computador as abas ficam no topo (veja "No computador").' ],
    comuns:['O botão do Assistente é o rosto do ' + ASSISTENTE_ + ' no canto de baixo; ele fica acima do menu, e a página tem um espaço no fim para nada ficar escondido atrás dele.'] },

  { t:'Tela Início e visitas ao cardápio', itens:[
    'Ordem do resumo: alerta numa faixa fina no topo (só aparece quando há algo; toque para ver), pedidos em andamento, caixa e vendas do turno, visitas ao cardápio e mesas (com o valor a receber das mesas).',
    '"Cardápio hoje" conta os clientes que abriram o cardápio eletrônico hoje: cada celular ou computador conta 1 vez por dia, mesmo abrindo várias vezes. Zera à meia-noite.',
    'Aparelhos da equipe não contam: depois que alguém entra no sistema interno naquele aparelho, ele nunca mais conta, mesmo depois de sair.',
    'É uma estimativa: a mesma pessoa em dois aparelhos conta duas vezes; aba anônima ou navegador limpo contam de novo.' ],
    comuns:['Administrador e Operador veem as visitas.'],
    prints:[{id:'inicio',alt:'Tela Início com o resumo e os atalhos',leg:'Início: pedidos em andamento (1) e atalhos para Caixa, Retiradas, Entregas e Mesas (2).'}] },

  { t:'No computador', itens:[
    'Notebook ou monitor (tela a partir de 900 px de largura): o topo fica numa linha só, com o logo à esquerda e o usuário e os botões à direita. As abas ficam sempre à vista no alto, mesmo rolando a página (no celular elas ficam no menu de baixo).',
    'Todas as funções do celular existem no computador: o que muda é só a organização da tela.',
    'Administrador: as telas aparecem num menu ao lado, com os 6 grupos abertos (Hoje, Dinheiro, Produtos, Vendas e cardápio, Loja e equipe, Sistema). Um clique abre a tela. O campo “Ir para…” no topo do menu acha uma tela pelo nome. Se o menu não couber na tela, role dentro dele.',
    'Pedidos: os pedidos ficam lado a lado (2 ou 3 por linha). Caixa: a escolha dos itens fica à esquerda; carrinho, total e pagamento ficam à direita.',
    'O botão do ' + ASSISTENTE_ + ' fica no canto da tela. Valores aparecem com ponto de milhar (R$ 1.475,90).' ] },

  { t:'Atalhos do teclado (computador)', itens:[
    'No computador, aperte ? (fora de um campo de digitação) ou use o botão \"Atalhos\" no topo para ver a lista completa.',
    'Alt + 1, 2, 3… vai para as abas na ordem em que aparecem no topo (a lista mostra os nomes do seu perfil).',
    'F2 abre o Caixa no passo Cliente; F4 vai direto para Pagamento e finalizar. Ctrl + Enter finaliza a venda, sempre perguntando antes.',
    '/ ou Ctrl + K busca (no Administrador, o campo \"Ir para…\"). Esc fecha a janela aberta.',
    'No Caixa, Enter na busca de cliente escolhe o primeiro resultado; no item, Enter avança de campo e, na quantidade, adiciona ao carrinho.' ] },

  { t:'Modo reserva e Saúde do sistema', prints:[{id:'adm-visao-geral',alt:'Administrador, Visão Geral',leg:'A Visão Geral (1) mostra a bolinha de saúde do sistema e o resumo do dia.'}], itens:[
    'Se o Supabase cair, aparece uma faixa laranja "Modo reserva" no topo. Ela diz o que funciona, o que fica na fila e o que espera a volta.',
    'Funciona: venda do Caixa (retirada ou entrega, sem desconto e sem cupom) e pedido do cardápio, pela contingência; consulta dos pedidos em Pedidos.',
    'Na fila (seguem sozinhos na volta): cadastro de cliente, fidelidade, feedback e ocorrência.',
    'Espera a volta (aparece "indisponível até o Supabase voltar" e nada é gravado): mudar status, estoque, compras, relatórios, avisos e Assistente. Anote à mão o que precisar.',
    'A "Saúde do sistema" fica dentro de "Conexão e servidores" (toque na bolinha colorida do topo): bolinha verde, amarela ou vermelha e cada item: cópia para a planilha, backup (diário às 04:00), cópia no Drive, conferência diária de vendas, tarefas automáticas e Assistente.',
    'Desenvolvedor: o botão "🧪 Simular queda (treino)" em "Conexão e servidores" finge a queda só neste aparelho, para treinar a equipe. "Encerrar simulação" volta ao normal.' ],
    comuns:['O Guia de operação tem o passo a passo de queda, volta e restauração.'] },

  { t:'🛵 iFood: cancelar, códigos e estado dos módulos', prints:[{id:'adm-ifood-cancelar',alt:'Cancelar lançamento de um pedido do iFood com a lista de motivos oficiais',leg:'Pedido do iFood: escolha o motivo oficial na lista com borda dourada (1).'},{id:'adm-ifood-codigo',alt:'Aviso O iFood precisa de um código, no topo de Pedidos',leg:'Digite o código que o entregador ou o cliente informar (1) e toque em Enviar.'},{id:'adm-ifood-modulos',alt:'Estado dos módulos do iFood',leg:'Cada módulo com OK ou recusado (1); 403 quer dizer que o iFood ainda não liberou.'}], itens:[
    'Cancelar um pedido do iFood: no "Cancelar lançamento" aparece uma lista com borda dourada com os motivos OFICIAIS do iFood. Escolha um (é obrigatório quando a lista aparece). Se o iFood não devolver a lista, dá para cancelar assim mesmo: o sistema usa o motivo do iFood mais parecido.',
    'Código do entregador do iFood (coleta): quando o iFood manda o entregador dele, aparece no topo de Pedidos e Entregas o aviso "🔐 O iFood precisa de um código". Peça o código ao entregador, digite e toque em Enviar ANTES de entregar o pedido.',
    'Código de entrega: quando o iFood pede o código na entrega feita pelo seu entregador, o mesmo aviso aparece. O cliente informa o código; digite e envie. A resposta do iFood chega em até 30 segundos; se recusar, aparece em vermelho para digitar de novo.',
    'Na tela do pedido e na comanda agora aparecem: o cartão (crédito/débito/vale, bandeira e se foi pago no app ou se é para levar a maquininha), quem pagou o cupom (iFood ou a loja) e o horário da retirada agendada.',
    'Integrações → iFood → "🩺 Estado dos módulos": mostra cada parte do iFood (pedidos, eventos, loja, cardápio, avaliações, financeiro) com 🟢 OK ou 🔴 recusado. "Não liberado para o app (403)" quer dizer que o iFood ainda não liberou: peça no Portal do Desenvolvedor. Também mostra se a loja configurada pertence ao app.' ],
    comuns:['Quando um módulo passa a ser recusado, chega um aviso no celular do Admin (no máximo 1 a cada 6 horas por módulo).', 'Horário que passa da meia-noite (ex.: 18h às 2h) agora vai certo para o iFood: o sistema divide em dois turnos.'] },

  { t:'🛵 iFood: avisos, cardápio, avaliações, entregador e indicadores', itens:[
    'Avisos (Integrações → iFood → Avisos): lista tudo o que o iFood mandou e pede atenção (cliente alterou o pedido, iFood recusou o cancelamento, troca de endereço, pedido devolvido, hora de começar o preparo, prazo de avaliação). Chega também como notificação. "Marcar todos como vistos" limpa a lista.',
    'Cardápio no iFood: o nome vai até 100 letras e a descrição até 500; o preço do item precisa ser maior que zero (só complemento pode ser grátis). Combo: marque "combo" e deixe como primeiro grupo o do item principal. O botão "Diagnóstico" pergunta ao iFood por que um item não aparece no app e mostra o que fazer.',
    'Avaliações: aparecem a nota, o comentário, o nome do cliente e até quando dá para responder. A resposta tem de 10 a 300 letras e pede a sua senha. Depois de enviada, a tela mostra se o iFood aceitou ou recusou (e por quê).',
    'Entregador do iFood (Sob Demanda): fica DESLIGADO. Contrate "Sob Demanda" no Portal do Parceiro, abra Entregador do iFood, informe cidade, UF e tempo de preparo e ligue (pede a senha). Em cada pedido de ENTREGA toque em "Pedir cotação (grátis)": aparece valor, tempo e distância. "Chamar entregador" cobra a corrida e pede a senha. Pedido que não veio do iFood precisa de endereço completo, CEP e latitude/longitude. A cotação vale por cerca de 24 horas.',
    'Depois de chamado: acompanhe o estado (entregador a caminho, em rota, entregue). Copie o link de rastreio para o cliente. O código de 4 dígitos é o que o cliente fala ao entregador. "Ver nível de confiança" mostra o score da entrega. Se o cliente pedir troca de endereço, responda em até 15 minutos (sem resposta o iFood nega). Cancelar pede a senha; em pedido de fora do iFood você escolhe um dos motivos que o próprio iFood devolve. O valor da corrida entra como despesa "Entregadores".',
    'Indicadores (Integrações → iFood → Indicadores até ontem): escolha o período e toque em "Buscar no iFood". Os números do iFood chegam com 1 dia de atraso, então hoje nunca aparece. Eles servem para comparar dias, canais e horários; o fechamento do dinheiro continua nas telas de Financeiro e Caixa. Precisa do Client ID e Secret do aplicativo BI (segundo aplicativo no Portal do Desenvolvedor).',
    'Roteiro de homologação: em Integrações → iFood → Estado dos módulos fica o "Roteiro por módulo", com o que fazer e mostrar ao iFood em cada módulo e o que o sistema já conferiu.' ],
    comuns:['Erro do iFood sempre aparece na tela com o motivo em português; se vier só um número, anote e fale com o suporte do iFood.','Entregador e Indicadores só funcionam depois que o iFood libera o módulo para o seu aplicativo (o Estado dos módulos mostra 403 enquanto não liberar).'] },

  { t:'🛵 iFood no dia a dia', itens:[
    'Telefone do cliente do iFood: o iFood manda um 0800 (igual para muitos clientes) e um CÓDIGO LOCALIZADOR. No pedido aparece "📞 iFood 0800… · Código: XXXXXXXX (vale até HH:MM)". Ligue no 0800 e digite o código. O código também sai na comanda e na mensagem do entregador. Depois do horário, aparece "código vencido".',
    'Clientes do iFood: cada cliente do iFood vira um cadastro em Clientes com o selo "iFood", separado pelo ID do iFood (nunca pelo 0800). Sem telefone, ele não tem cartão fidelidade nem indicação, mas tem histórico, Perfil 360 e Novo/Fiel/VIP.',
    'Som do iFood: pedido do iFood esperando aceite toca a vinheta do iFood (Admin, Operador e Cozinha), de 30 em 30 segundos, até alguém aceitar, recusar ou o iFood cancelar, por até 10 minutos. A faixa vermelha embaixo tem "Ver" (abre Pedidos) e "🔇 Silenciar" (só neste aparelho). Com o app aberto na tela, a notificação fica sem som para não tocar dois sons. Com o app fechado ou a tela apagada, toca o som padrão do celular (o navegador não deixa trocar). Teste em Alertas de pedido → "🛵 Testar som do iFood". O botão "Som: desligado" também cala a vinheta.',
    'Itens do iFood → "➕ Cadastrar no sistema": para item do iFood que ainda não existe no sistema. Confira nome, preço e categoria e toque em "Criar e ligar". O produto nasce como RASCUNHO (fora do cardápio e da contingência) e já ligado. Se já existir um parecido, o sistema pergunta se quer ligar a ele. Opção do iFood vira adicional inativo.',
    '"📝 Pré-cadastros do iFood" mostra o que falta em cada rascunho: ficha técnica, preço, foto e categoria. Complete em Cadastros → Produtos (o produto tem a marca "📝 pré-cadastro iFood") e ative: a marca some sozinha. Enquanto for rascunho, nada é enviado ao iFood.',
    '"🗑️ Excluir de vez" (pede a sua senha): só para itens de TESTE (ignorados ou sem ligação). Eles somem da lista, o alerta de "item sem ligação" cai na hora e, se voltarem num pedido, não aparecem de novo. "Excluir de vez todos os ignorados" faz todos de uma vez. Item ligado a produto não pode ser excluído (desfaça a ligação antes). Na lista "Itens excluídos de vez" dá para Restaurar.',
    '"🧪 Marcar um pedido do iFood como teste" (pede a senha): o pedido sai dos alertas e dos relatórios do iFood. A venda continua no caixa: se ela não devia existir, cancele a venda normalmente.',
    'Fechar o caixa já fecha os entregadores sozinho, com TODAS as entregas daquele caixa, inclusive as concluídas depois da meia-noite. O resultado aparece no relatório do fechamento.' ],
    comuns:['Pedido do iFood sem código localizador: alguns pedidos (retirada, teste) não trazem. Use o chat do pedido no portal do iFood.','Não ouvi a vinheta: toque uma vez na tela depois de abrir o app (o celular só libera som depois de um toque) e confira se o "Som" está ligado.'] },

  { t:'📊 Cardápio hoje (funil e mapa)', itens:[
    'No Início, toque no quadro "Cardápio hoje" (Admin e Operador): abre o pop-up CARDÁPIO HOJE.',
    'O quadro e o funil contam o TURNO: desde o fechamento do caixa anterior (assim entra quem olhou o cardápio à tarde, antes de abrir), e recomeçam do zero quando o caixa fecha. O funil mostra quantos aparelhos entraram no cardápio, abriram um item, puseram no carrinho, abriram o finalizar e enviaram o pedido, com a porcentagem e quantos pararam em cada etapa. Cada aparelho conta uma vez; aparelhos da equipe não contam.',
    'O mapa mostra de onde estão acessando (círculos dourados; o número é a quantidade de aparelhos) e os pedidos com local de entrega (pontos vermelhos). O quadrado branco é o restaurante (o mesmo local cadastrado para o ponto).',
    'A localização é APROXIMADA (cerca de 500 m), só de quem já permitiu a localização no celular, e é apagada ao fechar o caixa e sempre depois de 24 horas. Fica guardada só a contagem de acessos por região e por dia, sem identificar o aparelho. O cliente é avisado em "Privacidade" no cardápio.',
    'Dias anteriores: Administrador → Vendas e cardápio → "Cardápio: funil e mapa". Escolha o período (atalhos Hoje, 7 dias, 30 dias, Este mês, Mês passado ou as datas) e veja as visitas por dia, o funil, o que segurou o pedido no finalizar, o mapa das entregas do período (do sistema e do iFood) e de onde acessaram (contagem por região, guardada desde 01/11/2026).',
    'Parte "🧾 No finalizar": das pessoas que abriram a tela de finalizar, quantas enviaram, quantas tocaram em "Enviar pedido" e quantas saíram sem tocar. Embaixo, o que segurou quem tocou: faltou número da casa, rua, cidade, nome ou telefone; troco menor que o total; pagar pelo site pediu para entrar na conta; cardápio fechado; ou erro ao enviar (internet ou sistema). Use "Últimos 30 dias" para ver o padrão com mais movimento.',
    'Se muita gente sai sem tocar em Enviar, costuma ser a taxa de entrega, o total ou a quantidade de campos. Se o mais comum é "Faltou o número da casa", vale reforçar isso na divulgação.' ] },

  { t:'🔍 Raio-X do negócio', itens:[
    'Administrador → Vendas e cardápio → "Raio-X do negócio". Escolha o período (7, 30 ou 90 dias, Este mês, Mês passado ou as datas) e toque em "Ver período".',
    '🔥 Quando vendem mais: quadro dia × hora (cor mais forte = mais pedidos) e a média de pedidos por noite de cada dia da semana. Pedidos depois da meia-noite contam na noite anterior. Serve para decidir promoção no dia fraco e reforçar a escala no pico.',
    '🛵 iFood × seu cardápio: pedidos, vendido, valor médio, comissão do iFood (aproximada nas vendas antigas) ou taxas da maquininha, e quantos clientes voltaram a pedir. "Seu sistema" junta cardápio, balcão e mesa.',
    '⭐ Clientes fiéis do iFood: quem já pediu 2 vezes ou mais (o iFood informa as compras anteriores da loja). O telefone desses clientes é um 0800 do iFood, então o caminho é um bilhete na sacola com o QR do cardápio.',
    '⏱️ Tempos: esperando aceitar, preparo, rua e total da entrega; preparo por horário, tempo na rua por entregador e preparo por turno (vermelho = bem acima do normal). Se a cozinha ficar bem mais lenta que o normal na última hora, o Admin recebe um aviso.',
    '❌ Cancelamentos por motivo (os de teste ficam de fora), 🐢 onde os pedidos ficam parados (pelos alertas automáticos), 📈 custos de fornecedor que mudaram 5% ou mais nas compras dos últimos 90 dias e 🗑️ perdas registradas comparadas com a estimativa de perdas usada no custo.' ] },

  { t:'📣 Promoção por aviso no celular', itens:[
    'Administrador → Vendas e cardápio → Promoções e cupons → cartão "📣 Promoção por aviso no celular".',
    'Só recebe quem aceitou: no cardápio, o cliente com os avisos do pedido ligados vê uma vez "🎁 Quer receber as promoções de ' + NOME_RESTAURANTE_ + ' por aqui?". A barra mostra quantos aparelhos aceitaram.',
    'Escreva o título (até 60 letras) e o texto (até 140), confira a prévia e toque em "📣 Enviar promoção". Não dá para desfazer, e a próxima só pode sair 6 horas depois, para o cliente não desligar os avisos.',
    'Na lista "Últimas enviadas" aparece para quantos foi entregue e quantos desligaram os avisos. Ao tocar no aviso, o cliente abre o cardápio com a opção "Não quero mais".',
    'Não escreva nome, telefone ou endereço de cliente no aviso: ele aparece na tela bloqueada do celular.' ] },

  { t:'🏷️ Preço por dia, compre e ganhe e bilhete na sacola', itens:[
    'Administrador → Vendas e cardápio → Promoções e cupons. Tudo é configurado pelo dono.',
    '🏷️ Preço por dia da semana: toque em "+ Nova", escolha produto ou combo, os dias, o horário (se quiser) e se é preço fixo ou % de desconto. Marque "aceita cupom" só se quiser somar. Para parar, desligue (ou exclua, que pede a senha).',
    '🎁 Compre e ganhe: defina o valor mínimo em produtos (sem taxa de entrega), o brinde e a quantidade. O brinde entra no pedido a R$ 0, com custo e baixa no estoque.',
    '🧾 Bilhete na sacola: escreva título e texto, escolha o cupom, veja a prévia e ligue. Sai depois da comanda dos pedidos do iFood (ou de todas as entregas). Use "Testar impressão" para conferir.',
    'Os preços promocionais e o compre e ganhe valem só no cardápio online (entrega e retirada), não em mesa, balcão nem iFood. O servidor calcula o preço final, então o cliente sempre paga o valor certo.' ] },

  { t:'🗑️ Perdi um produto pronto', itens:[
    'Estoque → "🗑️ Perdi um produto pronto": para lanche que caiu, voltou ou saiu errado. Escolha o produto, a quantidade e o motivo.',
    'Todos os ingredientes da receita saem do estoque como Perda (aparecem em Movimentações) e o valor entra no Raio-X, comparado com a estimativa de perdas.',
    'Ingrediente que estragou ou venceu continua no botão "➖ Perda" da linha do ingrediente.' ] },

  { t:'🛒 Ver o cardápio sem sair', itens:[
    'No topo da área de funcionários, toque em "🛒 Cardápio": o cardápio digital aparece como o cliente vê. Você continua logado.',
    'A faixa no alto da tela diz "Você está vendo como cliente". Toque em "↩ Voltar à área de funcionários" para voltar exatamente para a tela onde estava, sem senha.',
    'Enquanto isso, a busca de pedidos, o som e a vinheta do iFood continuam funcionando. Se chegar pedido, a faixa mostra "🔔 pedido novo!".',
    'Se atualizar a página dentro do cardápio, o app volta sozinho para a área de funcionários, já logado. "Sair" continua saindo de verdade.' ] },

  { t:'🎟️ Excluir cupom', itens:[
    'Em Promoções e cupons, cada cupom tem "🗑️ Excluir". Pede confirmação e a sua senha.',
    'Cupom só para algumas formas de pagamento: no cadastro do cupom, marque em "Vale só nestas formas de pagamento" (ex.: Pix e Dinheiro). Nenhuma marcada = vale em todas. O cliente vê no cardápio onde o cupom vale e recebe uma mensagem clara se escolher outra forma.',
    'Cupom que nunca foi usado é apagado de vez. Cupom que já foi usado em pedidos é ARQUIVADO: some da lista, da conta dos clientes e do cardápio, mas os pedidos antigos continuam com o desconto certo. O código fica livre para um cupom novo.',
    'Em "🗑️ Cupons excluídos" (no fim da lista) dá para Restaurar um arquivado: ele volta desativado.',
    'Cupons automáticos (boas-vindas, aniversário, indicação) não se excluem: use Desligar.',
    'Cliente que estava com o cupom no carrinho vê "Esse cupom não está mais disponível" e o total sem o desconto.' ] },

  { t:'🧹 Limpar fotos sem uso do Google Drive', itens:[
    'Sozinho: uma vez por mês o sistema faz esta limpeza nos dois Drives (de madrugada). O resultado da última aparece no cartão "☁️ Google Drive". Se der erro, o aviso fica vermelho ali.',
    'Na mão: Administrador → Sistema → Backup e espaço → cartão "☁️ Google Drive" → "Opções" na linha do Drive que você quer → "🧹 Limpar fotos sem uso". Nada é apagado nesta etapa: só mostra a lista.',
    'Aparecem as fotos sem uso, quanto espaço libera e o motivo (sem produto/combo, duplicada, cópia que não é mais usada). Desmarque o que quiser manter e toque em "Mandar as marcadas para a lixeira do Drive" (pede a senha). O sistema confere de novo, na hora, que nenhuma está em uso.',
    'Nunca entram: fotos de produtos e combos, as do histórico de fotos, as que o Espelho da contingência ainda usa, as com menos de 7 dias, comprovantes de nota e fotos do ponto.',
    'Arrependeu? "↩ Desfazer a última limpeza" tira da lixeira. O espaço do Drive só volta de verdade quando você esvazia a lixeira no próprio Google Drive (drive.google.com → Lixeira).',
    'Não roda durante um backup (o sistema avisa e não apaga nada).' ] },

  { t:'🗓️ Quanto tempo guardar (fotos, notas e backups)', itens:[
    'Administrador → Sistema → Backup e espaço → "⚙️ Avançado" (no fim da tela) → "🗓️ Quanto tempo guardar". Mostra por quantos dias cada coisa fica no Drive antes de ser apagada sozinha.',
    'Padrão: fotos do ponto, perdas, recebimentos e ocorrências 90 dias; atestados 90 dias; notas de compra 13 meses (395 dias); backups automáticos 30 dias. Backups feitos na mão e os de antes de restaurar nunca são apagados.',
    'Para mudar, altere os dias e toque em "Salvar prazos" (pede a senha). Vale a partir da próxima limpeza diária.',
    'Dividir os dois Drives: o principal guarda fotos do cardápio, notas de compra e backups; o da contingência guarda fotos do ponto, perdas, recebimentos, ocorrências e atestados, mais uma cópia das fotos do cardápio e dos backups.' ] },

  { t:'📦 Armazenamento (banco, Storage e planilha)', prints:[{id:'adm-armazenamento',alt:'Tela Armazenamento com as barras do banco, do Storage e da planilha',leg:'Cada barra mostra o uso, quanto cresce por dia e a previsão de quando chega a 95% (1).'}], itens:[
    'Onde: Administrador → Sistema → Backup e espaço → cartão "Uso do espaço" (no topo). Mostra cinco barras: banco do Supabase, Storage (arquivos), planilha principal, Drive principal e Drive da contingência, com quanto cresce por dia e quanto tempo falta para chegar a 95%.',
    'Pedidos e caixas fechados antigos saem do banco e vão para o Storage, comprimidos. Antes de sair, o arquivo é lido de volta e a contagem tem de bater; se não bater, nada sai.',
    'Se o Storage chegar a 95%, o arquivo mais antigo vai para a planilha (um por hora) até voltar a 80%. Fica num arquivo por ano, "' + NOME_RESTAURANTE_ + ' - Arquivo AAAA", para a planilha principal não encher. Avisos no celular em 70% e 85%.',
    'Às 05:30 a compactação devolve o espaço ao Supabase. Às 06:00 o sistema mede quanto liberou; na lista "Últimas execuções" aparece o que cada arquivamento liberou, ou "não diminuiu" (com aviso no celular).',
    'Relatórios de meses antigos e o histórico do cliente juntam tudo sozinhos: banco, Storage e planilha.',
    '"🧪 Testar o caminho agora" faz uma ida e volta com dados de TESTE (nada real é mexido). Ele também roda sozinho todo dia 1º. Todo dia 1º, o resumo do mês anterior é copiado para a aba "Resumo_Mensal" da planilha.',
    'Limite do Storage: informe o do seu plano (grátis: 1024 MB). Salvar o limite, testar e mandar arquivo para a planilha pedem a senha.',
    'A compactação só refaz as tabelas que cabem no espaço livre do banco (ela precisa de espaço do tamanho da tabela enquanto roda). Se alguma não couber, ela fica de fora, aparece um aviso amarelo na parte "Compactação" e chega aviso no celular. Para resolver: arquive mais pedidos antigos ou aumente o plano do Supabase.' ],
    comuns:['"Previsão aparece depois de 5 dias de medição": o sistema precisa de alguns dias de medição para calcular o ritmo.', 'Arquivar não deixa o relatório incompleto: se uma parte não abrir, aparece um aviso vermelho em vez de números errados.'] },

  { t:'🔐 Senha nas ações sensíveis (sempre, inclusive do Admin)', itens:[
    'Cancelar, recusar, excluir, dar desconto, editar venda, estornar nota, registrar ou cancelar ajuste pós-venda: o sistema SEMPRE pede a senha antes, inclusive para o Administrador.',
    'Quem é Administrador digita a própria senha. Operador ou outro perfil digita a senha de um Administrador.',
    'Vale também para excluir produto, combo, adicional, categoria, ingrediente, mesa, perfil fiscal, item do cardápio do iFood, apagar o rosto do ponto, cancelar evento ou pedido de compra e desfazer preço enviado ao iFood.',
    'Fechou a janela da senha sem digitar: nada é feito. Senha errada: aparece em vermelho e nada é feito. Muitas tentativas erradas bloqueiam por alguns minutos.' ],
    comuns:['"Digite a sua senha para confirmar": a ação foi recusada porque veio sem senha (ex.: tela antiga aberta). Atualize o app e faça de novo.'] },

  { t:'🐞 Erros do sistema (nada falha calado)', itens:[
    'Quando algo dá errado (sem internet, servidor com problema, botão que travou, foto que não subiu), aparece um aviso vermelho dizendo o que aconteceu e o que fazer. Isso vale para a equipe e para o cliente no cardápio.',
    'Mensagens de erro ficam 15 segundos na tela; se estiverem fora da vista, a tela rola até elas. No carrinho do cardápio, o campo que falta fica vermelho com o motivo logo abaixo.',
    'Para ver tudo o que deu errado: toque na bolinha colorida do topo → "Conexão e servidores" → "🐞 Erros do sistema". Filtre por cardápio (clientes) ou equipe e pelo período (até 14 dias).',
    'Cada cartão mostra a mensagem, quantas vezes aconteceu, quantas pessoas/aparelhos, a tela e a versão do app. "Detalhes técnicos" ajuda quem for corrigir.',
    'Depois de corrigir, toque em "✓ Resolvido". Se o erro acontecer de novo, ele volta para a lista.',
    'Do cliente não é guardado nome, telefone nem IP: só a mensagem, a tela e a versão.' ],
    comuns:['Vermelho = erro de programa (algo travou). Amarelo = aviso de falha que apareceu na tela (ex.: sem conexão).'] },

  { t:'⏰ Pedidos parados (alertas)', itens:[
    'O sistema confere de minuto em minuto se algum pedido ficou parado: novo sem aceite, em preparo há muito tempo, pronto esperando retirada, saída para entrega, entrega ou serviço da mesa, entregue sem confirmação e "A receber" já concluído.',
    'Com o app aberto aparece a faixa "⏰ Pedidos parados" na parte de baixo da tela, com som, e uma bolinha vermelha na aba Pedidos. Com o app fechado chega a notificação no celular (se os avisos estiverem ligados em 🔔).',
    'Em cada pedido da faixa: "Ver pedido" abre o pedido; "Adiar 10 min" some por 10 minutos; "Silenciar este pedido" pede o motivo, some e fica registrado na Auditoria. O X esconde a faixa até aparecer um aviso novo.',
    'O aviso só mostra o que é do seu perfil e só com o caixa aberto. Quando o pedido avança, é pago, cancelado ou o caixa fecha, o aviso some sozinho. Depois de 3 avisos sem resposta o Administrador também é avisado.',
    'O alerta só avisa: nunca muda o status, o pagamento nem o pedido.',
    'Administrador: ajuste os tempos, ligue ou desligue cada regra e teste o aviso em Loja e equipe → Configurar avisos → cartão "⏰ Alertas automáticos". Os avisos de falha do sistema se repetem (padrão a cada 30 min, você muda ali) até o problema ser resolvido; o e-mail vai no máximo a cada 6 horas. Ali também se cadastra a data de vencimento do certificado, do plano da nota fiscal e de outros (aviso 30, 15, 7 e 1 dia antes).',
    'Resumo do turno: no cartão "📊 Resumo do turno" (mesma tela), ligue ou desligue o aviso que chega aos Admins ao fechar o caixa, com faturamento sem a taxa de entrega, pedidos, ticket médio, iFood, cancelados e se o caixa bateu. "Enviar teste" manda o resumo do último turno fechado.',
    'Além dos pedidos parados, o sistema avisa o Administrador (push e e-mail) quando algo do sistema pára: cópia para a planilha atrasada, tarefa automática falhando, Mercado Pago ou iFood sem resposta, caixa vencido ainda aberto, banco quase cheio, backup parado ou conferência diária com diferença.' ],
    prints:[{id:'alertas',alt:'Faixa Pedidos parados com os botões Ver pedido, Adiar 10 min e Silenciar este pedido',leg:'1: a faixa de pedidos parados, com Ver pedido, Adiar 10 min e Silenciar este pedido em cada pedido.'},{id:'alertas-config',alt:'Cartão Alertas automáticos com os tempos de cada regra',leg:'Administrador → Configurar avisos: cada regra tem liga/desliga e o tempo em minutos (1). Em 2 você escolhe de quanto em quanto tempo os avisos de falha do sistema se repetem.'}] },
  { t:'Turno do caixa (o "hoje" dos pedidos)', itens:[
    'Os pedidos "concluídos", o histórico das mesas, "Vendas do turno" no Início e o resumo do Financeiro contam do momento em que o caixa abriu até o fechamento, mesmo passando da meia-noite. Não é a data do calendário.',
    'Sem caixa aberto, mostram o último turno. Só se nunca houve caixa é que valem o dia do calendário.',
    'Para ver as vendas só do uso real (sem os testes de antes de 17/10/2026), use em Relatórios o período "Uso real (desde 17/10/2026)".' ],
    prints:[{id:'relatorios-uso-real',alt:'Relatórios com o período Uso real desde 17/10/2026',leg:'Relatórios: escolha o período "Uso real (desde 17/10/2026)" (1) para ver só o que é real.'}] },
  { t:'Avisos com o app fechado (🔔)', itens:[
    'Toque no 🔔 do topo e em "Ligar avisos com o app fechado". Permita as notificações quando o navegador pedir.',
    'Depois disso o celular avisa "Novo pedido" (do cardápio) e "Cliente no atendimento" mesmo com o app fechado ou a tela bloqueada. O aviso não mostra nome nem telefone do cliente.',
    'No iPhone: abra o endereço no Safari, toque em Compartilhar → "Adicionar à Tela de Início" e abra o app por esse ícone antes de ligar. No Android basta ligar.',
    'Para desligar, toque no mesmo botão. Ao sair do sistema, este aparelho deixa de receber os avisos de quem saiu.' ],
    comuns:['O som e a vibração do app aberto continuam como antes.'] },

  { t:'Avisos do pedido para o cliente e feedbacks', prints:[{id:'adm-feedbacks',alt:'Administrador, Hoje, Feedbacks',leg:'Opiniões dos clientes (1), com o botão de responder.'}], itens:[
    'O cliente que aceita os avisos (convite no topo do cardápio ou no cartão "Pedido enviado") recebe no celular: confirmado (quando o pedido vai para "Em preparo"), pronto (só retirada), saiu para entrega, entregue/retirado e cancelado.',
    'O aviso sai sozinho quando a equipe muda o status do pedido. O texto mostra só o número do pedido, nunca nome, telefone ou endereço.',
    '30 minutos depois de entregue (até 3 horas), quem aceitou recebe "⭐ Como foi seu pedido?". Se o cliente já deu feedback daquele pedido, não pergunta.',
    'Feedbacks (Hoje → Feedbacks) mostram de onde vieram: "🔔 veio pelo aviso do pedido", "💬 veio pelo chat" (o atendente oferece registrar quando o cliente elogia ou sugere) ou sem marca (rodapé do cardápio).',
    'Responder um feedback: em Feedbacks, toque em "💬 Responder" e escreva (até 1000 letras). Se o cliente deu o feedback com a conta dele (aparece "👤 com conta"), ele vê a sua resposta em Minha conta › Pedidos e o feedback vira "Respondido". Sem conta ("sem conta"), a resposta fica só registrada aqui; use o botão "WhatsApp" para falar com ele pelo telefone. Dá para editar a resposta depois.',
    'Feedback anônimo ou de quem não fez login continua chegando normalmente pelo botão do rodapé do cardápio.',
    'Pedidos de mesa (QR Code) não recebem avisos. No iPhone, o cliente precisa instalar o app para receber.' ]},

  { t:'Integrações e contas', prints:[{id:'adm-contas',alt:'Administrador, Sistema, Integrações e contas',leg:'Contas e senhas dos serviços (1); as abas IAs, iFood, Nota fiscal e Mercado Pago ficam logo acima.'}], itens:[
    'Administrador → Sistema → Integrações e contas: lista das contas que fazem o sistema funcionar (Supabase, GitHub, planilhas, etc.), com e-mail, link e observação.',
    '"+ Nova conta" cadastra; "Editar" muda os dados ou a senha; "Excluir" apaga a conta e a senha guardada.',
    'A senha fica no cofre criptografado do Supabase. Para ver, toque em "Ver senha" e digite a SUA senha de administrador; ela aparece por 30 segundos. Cada visualização fica na Auditoria.',
    'Chaves das IAs (Gemini, Gemini 2, Groq, Groq 2, NVIDIA e Cloudflare): ficam na mesma tela. "Ver chave" e "Trocar chave" pedem a sua senha de administrador. A chave nova vale na hora. As seis chaves participam do circuito de texto; o sistema distribui as chamadas pelo uso do dia e usa outra chave quando uma falha ou está indisponível. A Cloudflare pede também o Account ID. Para usá-las no atendimento ao cliente do cardápio, marque a opção abaixo da lista (só depois de conferir a privacidade do provedor).',
    'iFood · recursos EXTRA (todos desligados): em Ajustes do iFood, as caixas marcadas com EXTRA ligam, uma a uma: conferência dos repasses (compara o que o iFood pagou com o que o sistema esperava), aviso de avaliação nota 3, botão "Sugerir resposta" nas avaliações (só escreve um rascunho; você revisa) e etapa da entrega do iFood no pedido (alocado, a caminho da loja, pegou, chegou ao cliente; só quando a entrega é feita pelo iFood). Existe também o "Modo homologação", para marcar SÓ durante os testes de homologação do iFood.',
    'Integrações e contas tem 5 sub-menus no topo: 🔐 Contas, 🤖 IAs, 🛵 iFood, 🧾 Nota fiscal e 💳 Mercado Pago. Em iFood, Nota fiscal e Mercado Pago, o quadro do topo mostra "👉 Próximo passo" (o que falta fazer, quem faz e quantos passos já estão prontos). Abaixo: Como fazer, Chaves, Lista de conferência, Cadastro/Ajustes, Ligar ou desligar e No dia a dia.',
    'Cartão "Integrações (iFood e Nota fiscal)": guia passo a passo, chaves, checklist e interruptor Ligar/Desligar de cada uma. Nascem DESLIGADAS: desligado, o sistema funciona como sempre. Ligar e desligar pedem a sua senha de administrador.',
    'iFood ligado: os pedidos entram sozinhos como venda normal (marca "iFood #número"), com aviso no celular da equipe e baixa dos ingredientes. Em "Itens do iFood" ligue cada item do iFood a um produto do sistema (o sistema sugere pelo nome; o botão "Ligar todos os itens com nome igual" aceita todas as sugestões de uma vez e sobram só os que você precisa tratar) Em "Horário da loja" você define o horário de cada dia e envia ao iFood. Em "Cardápio no iFood" você cria categoria, item (com preço e foto), complementos e grupos, edita, pausa e muda preço em massa, tudo enviado ao iFood. Cancelar venda ou despesa sempre pede a sua senha.; item sem ligação entra com o aviso "SEM LIGAÇÃO" e dá para refazer depois em "Refazer pedidos sem ligação". Ao mudar o status do pedido (em preparo, pronta, saiu para entrega) o iFood é avisado sozinho; se ele não confirmar, aparece o alerta "Ação não confirmada no iFood". Se o iFood cancelar, a venda é cancelada e o estoque volta. Desenvolvedor: "Simular pedido do iFood (treino)" cria um pedido de mentira. Se o sistema cair (faixa laranja de modo reserva), os pedidos do iFood NÃO entram enquanto durar: acompanhe pelo tablet/portal do iFood e aceite lá (o iFood cancela sozinho o que não for confirmado em cerca de 8 minutos). Quando o sistema volta, ele varre o período, os pedidos que o iFood guardou entram em Pedidos e aparece um aviso (também no celular) com quantos chegaram e quantos já foram cancelados; toque em "Entendi" para dispensar. Produto novo: com o iFood ligado, o produto cadastrado com preço do iFood vai ao iFood pausado, com aviso para você revisar a foto e ativar em "Cardápio no iFood" (para desligar isso, peça para mudar o ajuste "produtoNovoNoIfood"). Senha sempre: recusar pedido, excluir cliente, cancelar pagamento de funcionário ou de evento, desconto no Caixa e editar venda pedem a sua senha, até para o Admin. Login: marque "Lembrar login e senha neste aparelho" para o celular oferecer salvar a senha (só nos aparelhos que são só seus).',
    'iFood — valor da venda: a venda grava o que fica para a loja: itens − desconto que a LOJA paga + taxa de entrega (só quando a loja entrega). Cupom pago pelo iFood e a taxa de serviço que o iFood cobra do cliente ficam fora. Quando o entregador é do iFood, o pedido mostra "ENTREGA PELO iFOOD", a taxa de entrega não é da loja e "Saiu para entrega" não é enviado ao iFood. Dinheiro pago ao entregador do iFood vem no repasse; só fica "a receber" na gaveta quando a loja entrega e o cliente paga na entrega.',
    'iFood — comissão: cadastre a comissão do iFood em Vendas e cardápio → Formas de pagamento, na forma "iFood" (taxa %). Ela entra nas taxas de cada pedido nos relatórios e no DRE. Quando o repasse chega, o sistema troca pela comissão real daquele pedido. Pedido do iFood cancelado não cria reembolso para a loja devolver: quem devolve ao cliente é o iFood.',
    'iFood — Preços, financeiro e avaliações: em Integrações → iFood, "Preços" compara o preço do sistema com o do iFood (importe o cardápio do iFood primeiro); "Gravar preços do iFood no sistema" atualiza o campo "Preço no iFood"; "Enviar nossos preços ao iFood" só aparece com o ajuste ligado, bloqueia variações acima do limite e tem histórico com "Desfazer". "Financeiro" mostra quanto falta receber do iFood (já sem a comissão) e os repasses. "Avaliações" traz as notas e permite responder. "Relatório por canal" compara balcão, cardápio e iFood; a margem já tira custo, taxas e comissão e o imposto estimado. Com o ajuste "Pausar no iFood o item que acabar no estoque", o item some do iFood quando um ingrediente acaba e volta quando repõe.',
    'iFood — Negociações: quando o cliente pede cancelamento ou reembolso, a equipe recebe um aviso no celular. Em Integrações → iFood → "Negociações" toque em Aceitar, Recusar ou numa alternativa antes do prazo (o iFood decide se o prazo acabar). "Loja no iFood": Pausar 30 min / 1 h, Retomar, Fechar e Abrir; com o ajuste "Abrir e fechar a loja junto com o caixa" ligado, abrir o caixa abre a loja e fechar o caixa fecha.',
    'Janelas: os botões de Nota fiscal e de iFood abrem em uma janela por cima da tela, com rolagem só dentro dela. Para voltar, toque no ✕ do topo ou em "Fechar" no fim; salvar continua no botão de salvar de cada janela.',
    'Nota fiscal — cadastro: em Integrações → Nota fiscal, "Dados fiscais da empresa" (CNPJ, inscrição estadual, endereço, código do município, número do CSC, alíquota do Simples) e "Perfis fiscais" (NCM, CFOP, CSOSN que o contador informa). Crie poucos perfis, marque um como padrão e ligue só as exceções. "Itens sem perfil" mostra o que falta e "Baixar planilha do contador" / "Enviar planilha preenchida" fazem tudo de uma vez. O CSC secreto é digitado no botão do cartão (nunca por mensagem). A alíquota dos dados fiscais é a alíquota padrão do imposto estimado (veja "Imposto sobre vendas"); o imposto aparece no resultado com ou sem a nota fiscal ligada.',
    'Nota fiscal — emissão: em Integrações → Nota fiscal escolha onde emitir (Balcão, Cardápio, iFood, Mesa) e quando (ao pagar ou na entrega). Cada venda gera a nota sozinha cerca de 1 minuto depois. "Notas fiscais" lista as notas: autorizadas, rejeitadas (com o motivo em português), pendências (ex.: item sem perfil fiscal) e contingência; toque em "Reemitir" depois de corrigir. "Abrir DANFE" mostra o cupom com QR Code e "Enviar ao cliente" abre o WhatsApp com o link. Ligue primeiro em TESTE (homologação) e peça ao contador para conferir. O Desenvolvedor tem "Nota de treino" (não fala com a Focus).',
    'Nota fiscal — fechamento: se você cancela uma venda que já tem nota, a nota é cancelada sozinha dentro de 30 minutos; depois disso fica "cancelamento para o contador orientar". "Conferência" mostra vendas sem nota (com botão Emitir), notas com problema e números pulados (botão Inutilizar, pede a sua senha). "Pacote do contador" baixa a planilha do mês e lista os XML. A tela de notas mostra quantas notas já saíram no mês (plano de 500) e a Saúde do sistema avisa a 80%.',
    'Só Administrador e Desenvolvedor veem esta tela. Nunca mande senhas por mensagem: digite direto aqui.' ]},

  { t:'Auditoria e acessos (IP)', prints:[{id:'adm-auditoria',alt:'Administrador, Sistema, Auditoria',leg:'Ações sensíveis registradas (1): quem fez, quando e de onde.'}], itens:[
    'Administrador → Sistema → Auditoria: lista as ações sensíveis (descontos, cancelamentos, preços, estoque, usuários, compras), as entradas no sistema ("Login") e as tentativas com senha errada ("Falha de login").',
    'Cada linha mostra quem fez, o perfil, o aparelho e o IP de origem. Use o período e a busca (nome, ação ou IP) para achar algo; mostra até 300 linhas.',
    'Vários "Falha de login" seguidos do mesmo IP podem ser alguém tentando adivinhar a senha: troque a senha do usuário e encerre as sessões dele.',
    'O IP é apagado depois de 45 dias (o restante do registro fica). Em Usuários → sessões abertas, cada aparelho também mostra o IP da entrada.' ],
    comuns:['Auditoria e IPs são só do Administrador e do Desenvolvedor.'] },

  { t:'Compras, fornecedores e análises avançadas', itens:[
    'Compras e fornecedores (só Administrador): Administrador → Produtos → "Compras e fornecedores". Cadastre o fornecedor e registre a compra: em "O que você comprou?" digite e toque no ingrediente ou bebida da lista (aí dá entrada no estoque). Texto que não é da lista vira só despesa e aparece um aviso laranja. Informe quantidade, unidade e o valor total pago. Bebida em fardo: preencha "Embalagens" e "Unidades em cada" (ex.: 2 × 12 = 24).',
    'Nota "Recebida" soma no estoque e o custo do ingrediente passa a ser o ÚLTIMO custo pago (o da nota mais recente, por unidade base: kg, l ou un). Nota antiga lançada depois fica só no histórico. "Pedido" só guarda o pedido; marque como recebida quando chegar.',
    'Informe o nº da nota e, se quiser, a foto ou o PDF (opcional; sem comprovante, a lista mostra o aviso). O comprovante vai para o Google Drive, como as fotos dos produtos: escolha o Drive principal, o da contingência ou os dois. Ele fica privado: só o Admin abre, em "📎 Ver comprovante". Frete e desconto da nota são repartidos nos itens. Em "Pagamento", diga de onde saiu o dinheiro (caixa, conta, cartão ou dinheiro do dono) ou "vou pagar depois" com o vencimento; dá para dividir (parte agora, parte depois). Item que não é de estoque (gás, embalagem, limpeza) vai só como despesa, na categoria que você escolher.',
    'Nota já recebida: "Editar dados da nota" muda só nº, observação e comprovante. Para mudar itens, valores ou pagamento use "Corrigir nota" (estorna e reabre para relançar) ou "Estornar nota" (desfaz estoque, custo e despesas). A despesa de uma compra não se edita nem se cancela em Contas e despesas, só pela compra. Pedido ainda não recebido pode ser cancelado.',
    'Ao marcar um pedido de compra como recebido, o app pergunta de onde saiu o dinheiro (caixa, conta, cartão, dinheiro do dono) ou se vai pagar depois (aí pede o vencimento). Se saiu do caixa, o caixa precisa estar aberto.',
    'Assistente (balão ✨): diga, por exemplo, "comprei 30kg de picanha do fornecedor X por R$ 900". A IA só monta um cartão; nada é gravado até você tocar em "Confirmar e gravar". Use "Revisar na tela" para ajustar antes. Fornecedor ou item que a IA não achar bloqueia o botão: cadastre antes.',
    'O Assistente também registra: despesa nova, pagar despesa, cancelar despesa, entrada/perda/contagem de estoque, cadastrar ou editar ingrediente, cliente, ocorrência, sangria, ajuste pós-venda, brinde e receber ou cancelar pedido de compra. Sempre com cartão e "Confirmar e gravar". Se faltar algo ou o nome for ambíguo, o cartão avisa em laranja e o botão fica travado. Cancelar despesa e ajuste pós-venda pedem a sua senha de administrador no cartão. Ele NUNCA exclui nada, nem mexe em venda, caixa, usuários, contas, preços, cardápio ou configurações: isso é pelas telas.',
    'Relatórios → "Análise avançada": margem líquida por forma de pagamento, vendas por dia da semana e comparação com o mesmo período do ano passado. Também há os períodos "Últimos 45 dias" e "Últimos 12 meses".' ],
    comuns:['Compras e a gravação pela IA são só do Administrador e do Desenvolvedor.'],
    prints:[{id:'compras',alt:'Tela de Compras e fornecedores com Pagamento e Registrar nota',leg:'Compras: em Pagamento (1) diga de onde saiu o dinheiro; depois toque em Registrar nota (2).'}] },

  { t:'Imposto sobre vendas (estimado)', itens:[
    'Administrador → Dinheiro → Relatórios e DRE → cartão "DRE e relatório mensal": escolha o mês e, em "Imposto sobre vendas deste mês", digite a alíquota que o contador informar (ex.: 6 ou 6,5) e toque em Salvar.',
    'A alíquota vale para aquele mês e para os seguintes, até você salvar outra. Mês sem alíquota própria usa a do mês anterior mais próximo; sem nenhuma, usa a dos dados fiscais da empresa. Apagar e salvar volta a usar a anterior.',
    'O imposto é calculado sobre tudo o que foi faturado no mês (vendas e eventos) e aparece no DRE ("Imposto sobre vendas (estimado)"), na Visão Geral (IMPOSTOS), nos relatórios (Resultado, Margem por forma, Ponto de equilíbrio, Projeção) e na margem mostrada no cadastro de produto, de combo e na Calculadora. Funciona com ou sem a nota fiscal ligada.',
    'O custo do produto NÃO muda: continua sendo só ingredientes ou o valor de compra. O imposto sai do resultado e da margem.',
    'DAS: lance o pagamento como despesa na categoria "Imposto das vendas (DAS)". Com alíquota cadastrada, ele não entra de novo nas despesas (o imposto já foi estimado mês a mês); o DRE mostra quanto foi pago para você comparar. Sem alíquota, o DAS entra como despesa comum. Outros impostos (IPTU, taxas) vão na categoria "Impostos" e contam como despesa normal.',
    'O DRE também mostra a linha "Taxa de entrega e acréscimos cobrados": a taxa de entrega cobrada do cliente entra na receita; o que você paga ao entregador entra nas despesas (Entregadores) quando o fechamento das entregas é pago.' ],
    comuns:['Só o Administrador vê e altera a alíquota.', 'É uma estimativa para acompanhar o lucro; o valor oficial é o do DAS que o contador calcula.'] },

  { t:'Cardápio Digital, promoções e eventos', prints:[{id:'adm-cardapio-digital',alt:'Administrador, Vendas e cardápio, Cardápio Digital',leg:'O que o cliente vê no cardápio (1).'},{id:'adm-promocoes',alt:'Administrador, Promoções e cupons',leg:'Cupons e promoções (1).'},{id:'adm-pagamentos',alt:'Administrador, Formas de pagamento',leg:'Formas de pagamento, taxas e o que aparece no cardápio (1).'}], itens:[
    'Cardápio Digital: escolha o que aparece para o cliente, destaques, ordem e frase de abertura. "Mais Pedidos" é automático.',
    'Preço sugerido: na lista de produtos e de combos, embaixo da margem, aparece "💡 Sugerido R$ X" (ou "Preço atual ok") e o preço para o iFood. No cadastro do produto aparece a explicação e o botão "Usar". A regra e as travas (custo-alvo por tipo, aumento máximo por vez e lucro mínimo) ficam em Custos gerais.',
    'Custos gerais (Administrador → Custos e precificação): o % de perdas e desperdício entra no custo de todos os produtos (menos bebidas, embalagens, gás e energia), e o custo por pedido (sacola, lacre) entra no custo de cada venda de entrega, retirada ou mesa. Ao mudar o %, o custo dos produtos é recalculado na hora.',
    'Faixa de promoção: em Cardápio Digital → Personalizar, escreva um texto curto (ex.: cupom do dia). Aparece logo abaixo do banner para todo cliente; em branco não aparece.',
    'Se o cliente pedir mais de 1 lanche com adicionais, os adicionais valem para todos — o cardápio avisa.',
    'Endereço de entrega: o cliente preenche Rua e bairro, NÚMERO e CIDADE (a localização do celular e o CEP já preenchem rua, bairro e cidade). Sem o número o pedido não é enviado. No pedido, o endereço chega como "Rua, Bairro, nº 123 — Cidade".',
    'Abrir ou fechar o cardápio: use o botão "🌐 Cardápio aberto" em Início ou no Caixa. Um toque fecha (com uma mensagem opcional para o cliente) e outro reabre, sem fechar o caixa. Pedido de mesa por QR Code continua valendo. O cardápio só recebe pedidos com o caixa aberto.',
    'Cupom progressivo: em Promoções → novo cupom, escolha o tipo "Progressivo (por faixa)" e escreva uma faixa por linha (ex.: "50 5" e "100 10" = R$ 5 de desconto a partir de R$ 50 e R$ 10 a partir de R$ 100). Vale a maior faixa que o pedido alcança, contando só os itens (sem a taxa de entrega).',
    'Combo com escolha (ex.: 3 Smash): em Combos, toque em Editar, marque "opção de escolha do cliente" nos produtos que podem ser escolhidos e digite quantos itens o cliente escolhe. Produtos sem a marca (ex.: o refrigerante) entram sempre. No cardápio o cliente escolhe os sabores (pode repetir); no Caixa o sistema pergunta os sabores ao adicionar. O preço é fixo e o estoque baixa pelo que foi escolhido.',
    'Preço promocional (sem desconto e sem cupom): em Produtos ou Combos, toque no item e marque "Preço promocional: não aceita desconto nem cupom" (a caixinha fica logo abaixo de "ativo"). Item marcado não entra em cupom do cardápio nem em desconto do Caixa: o desconto vale só sobre os outros itens do pedido. O frete grátis de um cupom continua valendo. Se o pedido só tem itens marcados, o cupom/desconto é recusado com aviso. Na lista o item aparece com "🏷️ sem desconto/cupom"; no cardápio o cliente vê "preço promocional · não aceita cupom". Para voltar a aceitar, é só desmarcar. O iFood não muda (as promoções de lá são do próprio iFood).',
    'Cupons: em Promoções, toque em "Editar" em qualquer cupom para mudar valor, prazo, limite ou texto. Cupom pode ser "só para quem tem conta", "só para um cliente" (escolha o cliente na lista) e pode aparecer em "Minha conta" do cliente para ele ver. O "texto para o cliente" aparece junto do cupom.',
    'Cupons automáticos (cartão "🤖 Cupons automáticos" em Promoções): boas-vindas (quem cria a conta), aniversário (no dia, conta com data de nascimento criada há mais de 30 dias), indique e ganhe — quem indicou e quem foi indicado (quando o indicado conclui o primeiro pedido com a conta; quem indicou pode ganhar também um produto-prêmio, veja abaixo). Todos já existem DESLIGADOS: toque em Editar, ajuste o benefício e a validade em dias, e ligue. Cada cliente usa boas-vindas e indicado só 1 vez. Pedido cancelado devolve o cupom ao cliente.',
    'Conta do cliente: o cliente pode entrar com o Google (opcional; sem conta ele pede como sempre). Com conta ele vê pedidos e repete com um toque, endereços, cupons, cartão fidelidade e link do indique e ganhe. O botão fica numa faixa logo abaixo do banner. Prêmios: marque os produtos em Editar produto › Mais opções (Prêmio de fidelidade / Prêmio de indicação). O cliente resgata o brinde na conta ou no carrinho, junto com um pedido ou sozinho; o brinde vai a R$ 0,00 (entra nos relatórios, com custo, e baixa o estoque) e a entrega é cobrada. Pedido cancelado devolve o brinde. O histórico e o cartão só se juntam à conta depois do primeiro pedido concluído (entregue ou retirado) feito logado.',
    'Privacidade (LGPD): em Usuários e permissões, o cartão "🔒 Privacidade" mostra quantas contas existem, deixa mudar o prazo para anonimizar clientes sem pedidos (padrão 3 anos) e publicar nova versão do Aviso (todos aceitam de novo). Razão social e CNPJ ficam em Cardápio Digital › Dados do restaurante (aparecem no Aviso de Privacidade quando preenchidos). Quem quiser apagar a conta ou pedir os dados fala com o restaurante.',
    'Mercado Pago: Pix e cartão pelo site só ficam disponíveis quando a integração está ligada e a forma foi marcada para pagamento online. O pedido só entra como Pago após confirmação do Mercado Pago. Se aparecer em Pagamentos online que precisam de decisão, confira o motivo; liberar envia o pedido para a cozinha. Reembolsar registra a decisão e solicita a devolução. Confira o resultado antes de repetir uma tentativa.',
    'Dados do restaurante: nome, endereço, telefone, horário e redes sociais (texto livre) aparecem no rodapé do cardápio do cliente e nas mensagens de WhatsApp e relatórios.',
    'O cliente pode escrever uma observação em cada item; ela aparece na comanda da cozinha e no pedido.',
    'Item "Esgotado": se "bloquear venda sem estoque" estiver ligado (Produtos → Estoque), o cardápio mostra "Esgotado" no que o estoque não cobre.',
    'No celular, "Mais pedidos", "Destaques" e cada categoria rolam para o lado. O cliente toca no botão vermelho "+" para adicionar e na foto para ver o item ampliado. O botão "💬" redondo abre o Atendimento.',
    'Na entrega, o endereço vem com rua e bairro preenchidos pela localização do cliente (só se ele permitir). O número da casa é sempre digitado por ele e o pedido não segue sem ele.',
    'O cardápio abre rápido porque guarda cópia no aparelho do cliente. Mudanças suas aparecem em instantes.',
    'O cardápio só recebe pedidos com o caixa aberto; fechado, aparece "Estamos fechados no momento".',
    'Promoções: cupons. Eventos: custos e recebimentos por evento. Custos e precificação: simulador de preço; "Aplicar como preço base" vale para todas as formas de pagamento.' ]},

  { t:'Caixa: abrir, vender e fechar', passos:[
    'Aba Caixa → "Abrir caixa" e informe o fundo de troco.',
    'Em "Iniciar venda": 1. Cliente → 2. Itens → 3. Pagamento e finalizar.',
    'Depois escolha 58mm, 80mm ou A4 e toque em Imprimir, Copiar ou WhatsApp.',
    'Para encerrar, feche o caixa, informe o dinheiro contado e confira a diferença.',
    'CPF na nota: quando a nota fiscal está ligada, aparece o campo "CPF na nota (só se o cliente pedir)" antes de Finalizar. Preencha só se o cliente pedir; a nota sai cerca de 1 minuto depois da venda e, depois que sai, não dá mais para incluir o CPF.',
    'Mesas: o botão "🍽️ Mesas" mostra todas as mesas e quem pediu a conta.',
    'Pedido de mesa no Caixa: "Pagar ao sair" deixa na conta; "Pagar agora" cobra na hora.',
    'Se a forma de pagamento tem acréscimo (ex.: iFood), o Caixa mostra o valor a mais e já soma no total e no comprovante. Em pagamento dividido, o acréscimo vale só para a parte paga naquela forma.',
    'Imprimir o pedido: em Pedidos, nos cartões de Retirada e de Mesa, o botão "🖨️ Imprimir pedido da retirada" (ou "da mesa") imprime o cliente, os itens, o total e se já está pago ou se é para cobrar. Todas usam o mesmo modelo de comanda (a da cozinha também); nas entregas ela traz o endereço, a referência e o valor a cobrar. O botão só aparece depois que o pedido foi aceito. O tamanho do papel dessas três impressões se escolhe em Pedidos → Entregas ("Papel da impressão").' ],
    comuns:['"Abra o caixa antes de registrar uma venda".',
      '"A soma dos pagamentos precisa bater com o total".',
      'Desconto nunca pode zerar a venda; no Caixa pede a sua senha.'],
    prints:[{id:'caixa-1-cliente',alt:'Caixa, passo 1: escolher o cliente e retirada, entrega ou mesa',leg:'Passo 1: escolha o cliente (ou venda sem cadastro) e toque em Retirada, Entrega ou Mesa.'},{id:'caixa-2-itens',alt:'Caixa, passo 2: escolher os itens',leg:'Passo 2: toque no produto (atalhos) para entrar no carrinho; confira o carrinho.'},{id:'caixa-3-pagamento',alt:'Caixa, passo 3: pagamento e finalizar',leg:'Passo 3: confira a forma de pagamento e toque em Finalizar venda.'}] },

  { t:'Caixa vencido', itens:[
    'O caixa vence no primeiro horário de corte (padrão 06:00, horário de Brasília) depois de ter pelo menos 6 horas aberto, e nunca passa de 24 horas.',
    'Vencido, o Caixa bloqueia venda nova de balcão e de mesa, sangria e resgate de prêmio. Continuam livres: preparar, despachar, entregar e receber pedidos já aceitos. Pedidos do iFood e do cardápio continuam entrando e podem ser aceitos.',
    'Fechar: Caixa → botão “Fechar caixa vencido” (Administrador e Operador). Informe o dinheiro contado e, se quiser, o motivo. A diferença fica registrada como “fechamento atrasado” em Dinheiro → Histórico → Sessões de caixa. O caixa só fecha sem mesas abertas e sem pedidos pendentes ou não recebidos.',
    'Emergência (só Administrador): “Liberar por algumas horas” (padrão 4 h, máximo 12 h), com motivo obrigatório. Fica na Auditoria, avisa os Administradores e aparece na Visão Geral. Expira sozinho.',
    'Aviso: a partir de 2 horas antes do corte aparece uma faixa no Início e no Caixa, com atalho para o Caixa.',
    'Regra: o Administrador ajusta o corte, a vida mínima e o teto em Caixa → “Regra do caixa vencido” (embaixo do botão de fechar).' ],
    comuns:['Garçom e Cozinha veem “caixa vencido, chame o responsável”.'] },

  { t:'Entregadores: taxa e fechamento', prints:[{id:'adm-entregadores',alt:'Administrador, Entregadores e taxas',leg:'Taxa de entrega e ajuda diária (1); mais abaixo o fechamento de cada entregador.'}], passos:[
    'Administrador → Loja e equipe → Entregadores e taxas.',
    'Em “Taxa e ajuda diária”, defina a taxa de entrega padrão e a ajuda diária do entregador e salve. A taxa é do cliente e vai 100% para o entregador. Mudanças valem só para pedidos e fechamentos futuros.',
    'Em “Fechamento de entregadores”, escolha o entregador e o dia e toque em Calcular. O total devido é as taxas das entregas concluídas do dia mais a ajuda diária (uma vez por dia).',
    'Informe o valor pago e a forma: Dinheiro (sai da gaveta do caixa) ou Pix (não sai da gaveta). Se o valor pago for diferente do devido, a observação é obrigatória.',
    'Toque em “Fechar período”. Os fechamentos aparecem em “Fechamentos anteriores” e não mudam mais.' ],
    comuns:['A ajuda diária conta uma vez por dia e só se houve entrega.','O valor pago ao entregador entra nas despesas (Entregadores) no DRE.','Se a conexão cair ao fechar, confira “Fechamentos anteriores” antes de tentar de novo, para não fechar duas vezes.'] },

  { t:'💠 InfinitePay (pagamento online no checkout)', prints:[{id:'adm-infinitepay',alt:'Cartão da InfinitePay em Integrações e contas',leg:'Digite a InfiniteTag, escolha quem recebe cada forma e ligue pela chave (1), que pede a senha.'}], itens:[
    'Onde: Administrador → Sistema → Integrações e contas → InfinitePay. O cartão tem o mesmo desenho do Mercado Pago: estado, lista de conferência, chaves, ajustes, guia passo a passo e teste guiado.',
    'Diferença principal: na InfinitePay o cliente SAI do cardápio para pagar no site seguro da InfinitePay (Pix ou crédito) e volta. Débito não existe na InfinitePay.',
    'Quem recebe cada forma: para Pix e Cartão de crédito escolha "Só na entrega", "Online · Mercado Pago" ou "Online · InfinitePay". Dá para usar os dois juntos (ex.: Pix pela InfinitePay e crédito pelo Mercado Pago). A mesma escolha aparece nos dois cartões.',
    'Chaves: InfiniteTag (o seu nome de usuário, sem o $) e, só se a conta mostrar, a chave do Checkout (inchk_…). O "Segredo do aviso" é gerado pelo sistema (botão Gerar, pede a senha).',
    'SIMULAÇÃO: ligue em SIMULAÇÃO e coloque o e-mail da sua conta do cardápio. No cardápio, a forma da InfinitePay mostra os botões Pagar, Recusar e Expirar (nada é cobrado). Os três funcionando marcam o passo da lista. "Pagar" simulado só funciona para os e-mails da lista e cria um pedido marcado como TESTE: cancele depois.',
    'Teste real: ligue em PRODUÇÃO com "mostrar SÓ para os e-mails acima" marcado, pague um Pix e um crédito de valor pequeno, confira no app da InfinitePay, devolva e registre o reembolso. Depois desmarque a opção para liberar a todos os clientes.',
    'Segurança: o aviso da InfinitePay não é assinado. Por isso o sistema só aprova o pedido depois de CONSULTAR a InfinitePay e conferir o valor pago. Pagou menos do que o pedido: vai para "Pagamentos que precisam de decisão".',
    'Reembolso: devolva o dinheiro no app da InfinitePay e depois toque em "Registrar reembolso" no cartão (valor, motivo e senha). A venda continua ativa: decida depois se cancela.',
    'Enquanto ninguém fizer o teste real (Pix e crédito de valor pequeno), o cartão mostra o aviso "Integração ainda não validada com conta real".' ],
    comuns:['O cliente fechou a página da InfinitePay sem voltar: o pedido continua sendo conferido. Quando ele abrir o cardápio de novo (mesmo aparelho), a tela de pagamento volta sozinha.', 'Sem a InfiniteTag em PRODUÇÃO, a forma não aparece como online no cardápio (o cardápio não quebra).'] },

  { t:'💰 iFood: vendas e repasses (financeiro do iFood)', prints:[{id:'adm-ifood-financeiro',alt:'Tela iFood: vendas e repasses com a conferência das semanas',leg:'A conferência da semana (1) compara os lançamentos com o repasse do iFood; as abas (2) mostram vendas, lançamentos, repasses, antecipações e o arquivo mensal.'}], itens:[
    'Onde: Administrador → Dinheiro → "iFood: vendas e repasses" (ou no cartão do iFood, botão "💰 Vendas e repasses"). Só mostra: não muda vendas, caixa nem o iFood.',
    'Precisa do módulo Financeiro liberado pelo iFood. Ele é homologado num chamado SEPARADO no Portal do Desenvolvedor (Suporte → Chamados → Homologação), com conta CNPJ. Antes disso a tela mostra o aviso 🔒 403 e fica vazia.',
    'O sistema busca sozinho a cada 6 horas (últimas semanas). Para outro período, escolha as datas e toque em "🔄 Buscar no iFood" (até 3 meses por vez); a barra mostra o andamento.',
    'Semana: o iFood fecha cada semana (segunda a domingo) na segunda seguinte. A conferência compara a soma dos lançamentos COM impacto no repasse com o repasse do iFood: ✅ confere, ⚠️ diferença (com aviso no celular se passar de 1%) ou ⏳ semana aberta.',
    'Vendas: cada pedido do iFood com bruto, comissão, taxas, promoções pagas pelo iFood/rede e o líquido; toque no pedido para ver os lançamentos e a forma de pagamento (quem recebe: iFood ou a loja).',
    'Lançamentos: créditos (+) e débitos (−) com a data prevista do repasse. Só os COM impacto mudam o que você recebe; os SEM impacto são informativos (ex.: vale ou dinheiro pago direto à loja, promoção da loja).',
    'Repasses: os títulos de cada semana (Repasse, Boleto quando a loja deve, Retido para banco em empréstimo com recebíveis, Renegociado), com status (previsto, pago, falhou), data e o banco (conta mascarada). Título com falha avisa no celular.',
    'Antecipações (D+1 ou D+7, se contratadas na Conta Digital iFood): valor original, taxa em R$ e %, valor recebido e quantos dias antes chegou.',
    'Arquivo mensal: o registro oficial do mês em CSV (abre no Excel). Toque em "📄 Gerar arquivo"; o iFood leva alguns minutos (até 30). Pronto, aparece o resumo (a receber com impacto, sem impacto, por tipo) e "⬇️ Baixar CSV". O mesmo mês só pode ser gerado de novo 6 horas depois.',
    'Opção EXTRA no cartão do iFood (desligada): "Usar a comissão e as taxas REAIS do iFood nas vendas do sistema" passa a comissão real de cada pedido para os relatórios e o DRE.',
    'Modo homologação (no cartão do iFood): marque só durante os testes da homologação; as buscas vão com o aviso de teste que o iFood pede.' ],
    comuns:['🔒 "Módulo Financeiro ainda não liberado (403)": normal antes da homologação do Financeiro.', '"Nada encontrado (404)" em Repasses: não houve repasse no período. Em Antecipações: a loja não tem plano de antecipação.', '⚠️ Diferença numa semana: busque de novo o período da semana; lançamentos podem cair em outra semana (cancelamento depois da venda) ou ainda estar pendentes. Se continuar, baixe o Arquivo mensal.'] },

  { t:'Mercado Pago (pagamento online)', itens:[
    'Onde: Administrador → Sistema → Integrações e contas → 💳 Mercado Pago. O quadro “👉 Próximo passo” mostra o que falta fazer.',
    'Configurar (quem faz é o dono): conta de vendedor verificada no Mercado Pago; aplicação com Checkout Transparente; chaves de TESTE (Public Key e Access Token); aviso (webhook) com o endereço do cartão e o evento “Order (Mercado Pago)”, mais a chave secreta; teste guiado com Pix e cartão; só então as chaves de PRODUÇÃO e “Ligar em PRODUÇÃO”.',
    'Formas de pagamento pelo site: para cada forma há só duas opções, “Só na entrega” ou “Também online”. Online vale para Pix, crédito e débito, e crédito e débito podem ficar online ao mesmo tempo. A forma continua valendo também na entrega, com os mesmos preços, taxas e acréscimos.',
    'Ajustes: validade do Pix (5 a 120 minutos; combinado 15), e-mails que veem o pagamento online em TESTE e e-mail do comprador de teste.',
    'No cardápio, o cliente precisa entrar com a conta para pagar pelo site. O pedido só entra como Pago depois da confirmação do Mercado Pago.',
    'Pagamentos que precisam de decisão: se o dinheiro foi aprovado mas o pedido não pôde entrar sozinho na cozinha, a lista aparece em Mercado Pago (“No dia a dia”) e numa faixa discreta no Caixa. “Liberar pedido” envia o pedido para a cozinha; “Reembolsar” registra a decisão e chama o Mercado Pago para devolver. Confira o resultado antes de repetir uma tentativa.',
    'Relatórios → “Mercado Pago — resumo do mês” mostra recebimentos e taxas do mês.' ],
    comuns:['O pedido de teste aprovado vira pedido de verdade na cozinha e no caixa: avise a equipe e cancele depois.','Desligada, a integração faz o cardápio voltar a funcionar só com pagamento na entrega. Ligar e desligar pedem a sua senha de administrador.'] },

  { t:'Modo emergência (servidor fora do ar)', itens:[
    'Só funciona no mesmo aparelho em que você já fez login normal ao menos uma vez nos últimos 30 dias. Cada login novo renova o prazo.',
    'Quando o sistema não consegue falar com o servidor (Supabase), aparece a pergunta: "Entrar em MODO EMERGÊNCIA como [seu login]?". A senha é conferida no aparelho.',
    'O que dá: registrar venda de retirada/entrega pela contingência, usando o catálogo da última sincronização. Sem mesa, sem desconto.',
    'O que NÃO dá: abrir/fechar caixa, cancelar, receber pagamento, mexer em estoque, ver financeiro.',
    'Um aviso laranja fixo no topo mostra "MODO EMERGÊNCIA". Um vigia testa o servidor a cada 30 s. Assim que ele responde, o app pede login de novo.',
    'Errar a senha 5 vezes no modo emergência bloqueia por 5 minutos.' ]},

  { t:'Contingência e modo reserva', prints:[{id:'adm-sync',alt:'Administrador, Sistema, Backup e espaço',leg:'Planilha de contingência e o botão Sincronizar espelho agora (1).'}], itens:[
    'O Supabase é o servidor principal; a planilha principal é a reserva e a planilha de contingência é o último recurso. Se o Supabase cai, o modo reserva segura o app e a contingência segura o cardápio e as vendas.',
    'No modo reserva: faixa laranja no topo e cartão "Pedidos na reserva (somente consulta)" em Pedidos. Mostra o que estava em andamento no último espelho e o que entrou na fila da contingência.',
    'Ao voltar, o Admin recebe sozinho as vendas da contingência. Falhas ficam na tela de Contingência.',
    'Tempo real (WebSocket) e modo reserva são automáticos.',
    'Administrador → Sistema → Backup e espaço → cartão Contingência: "🔄 Sincronizar espelho agora" e "⬇️ Trazer vendas pendentes da contingência". O espaço do Drive da contingência aparece no cartão "Uso do espaço", no topo.',
    'O espelho da contingência (cardápio, preços, clientes e pedidos em andamento) se atualiza sozinho a cada 10 minutos e por completo todo dia às 3h. Não há nada para ligar.',
    'Na mesma tela, "Cópia na planilha principal" mostra quantos itens faltam ir para a planilha (o cardápio, os clientes e as vendas vão a cada 2 minutos).' ]},

  { t:'Fila de envio e erros de sincronização', itens:[
    'Itens como cadastro de cliente, fidelidade, feedback e ocorrência podem ficar guardados no aparelho quando a internet cai. Aparece o botão "na fila" no topo.',
    'Toque nele para ver estado, tentativas e motivo. Você pode tentar de novo, descartar ou enviar agora.',
    'Venda, pagamento, sangria, cancelamento e estoque NUNCA ficam na fila.',
    'Se a sessão expirar com itens na fila, eles viram "com erro" e voltam só quando alguém entrar de novo e tocar em "Tentar de novo".' ]},

  { t:'Localização do entregador', itens:[
    'No cartão da entrega, se o status for "Saiu para entrega" e houver entregador atribuído, aparece "📍 Ver localização".',
    'Abre um mapa embutido (Leaflet local) e um botão "Abrir no mapa".',
    'A posição só existe se o entregador estiver com o app aberto e GPS permitido. O envio é a cada ~18 s e só enquanto houver entrega em "Saiu para entrega".',
    'O cliente vê apenas a distância aproximada.' ]},

  { t:'Balão de atendimento e assistente de IA', itens:[
    'No canto da tela tem um botão único. Para o cliente, é o atendimento. Para funcionário logado, é o assistente.',
    'A conversa com o assistente continua ao fechar e reabrir o botão ✨. Ela some ao recarregar o app, ao sair da conta ou depois de 2 horas parada. Para começar do zero, toque em "🗑️ Nova conversa".',
    'Dentro do assistente há duas abas: "✨ Conversa" (perguntas à IA e atendimento de clientes) e "🔔 Avisos" (o que antes ficava em Notificações). O botão do canto mostra "🔔 n" quando há aviso.',
    'Em Avisos aparecem só os itens que precisam de você, em grupos que se abrem ao toque: pedidos aguardando aceite, ocorrências, entregas com problema, contas vencidas, falhas do sistema, estoque baixo, cartão fidelidade quase completo, indicações pendentes, aniversariantes do mês e clientes inativos. O que está em dia fica numa linha só ("✅ Em dia: …").',
    'Quais avisos aparecem para cada perfil se escolhe em Administrador → Loja e equipe → Configurar avisos. Botões como "Tratar" abrem a tela da ocorrência por cima.',
    'Assistente (Admin e Operador, só leitura): escreva em português. Exemplos: "como faço uma venda?", "quanto tem de pão no estoque?", "tem cliente aguardando?", "qual produto vendeu mais hoje?".',
    'Período: reconhece "hoje", "ontem", "7 dias", "30 dias", "mês". Pergunta de mês anterior avisa que os dados estão arquivados (veja Relatórios).',
    'A IA é somente leitura. Não altera preço, não cancela, não muda status. Ela só responde assuntos do restaurante e nunca mostra senha nem dados de contato de clientes. O Operador recebe só o que é da função de Caixa.',
    'Para o cliente, o balão é o atendente virtual: responde cardápio, preços, promoções, formas de pagamento e andamento do pedido (pelo celular dele). Se for problema, oferece "Falar com a equipe"; aí o chamado aparece para você no balão (aba Conversa).',
    'Se a IA ficar sem cota ou fora do ar, o cliente continua vendo o botão para falar com a equipe, que não depende da IA.',
    'Quando o Supabase cai (ou a IA falha seguidas vezes), o balão avisa e o sistema segue normal.' ]},

  { t:'Baixar para o Excel (CSV)', itens:[
    'Administrador → Relatórios: escolha o período e toque em "⬇️ Baixar este relatório (CSV)" para o relatório na tela.',
    'Em "Dados completos do período" baixe Vendas, Itens vendidos ou Despesas. Meses já arquivados entram sozinhos (as despesas só se estiverem no app). O arquivo abre direto no Excel, com acentos corretos.' ]},

  { t:'Arquivamento e uso do banco', itens:[
    'Administrador → Sistema → Backup e espaço → Avançado (no fim da tela).',
    'Em "Tamanho do banco do seu plano", informe o plano do Supabase: Grátis (500 MB), Pro (8 GB) ou outro tamanho (confira no painel do Supabase). A porcentagem de uso e a proteção abaixo usam esse número. Se você pagar o Supabase, atualize aqui.',
    'Em "Arquivamento por idade" escolha: Automático (todo dia de madrugada, vendas e caixas fechados com mais de X dias vão para a planilha, abas Arquivo_*) ou Só manual (o sistema não arquiva sozinho; você manda quando quiser em "Mandar para a planilha agora"). O prazo é livre: digite quantos dias quer manter no Supabase (mínimo 30). "Simular" mostra o que sairia sem mover nada.',
    '"Proteção de espaço" (sempre ligada, não dá para desligar nem mudar): quando o banco chegar a 95% do tamanho do plano, o sistema manda para a planilha, aos poucos (até 1.000 vendas por hora), as vendas e caixas já encerrados, do mais antigo para o mais novo, e minutos depois devolve o espaço ao Supabase. O que tem menos de 1 dia, os pedidos em andamento e o caixa aberto nunca saem; só apaga o que a planilha confirmou. Aos 70% e aos 85% você recebe aviso.',
    'Relatórios e Visão Geral buscam esse arquivo automaticamente quando o período pedido é antigo.',
    'Fotos: ficam no Google Drive principal, com uma cópia no Drive da contingência. Isso é automático: não há o que escolher.' ]},

  { t:'Exemplos de pergunta ao assistente', itens:[
    '"Resumo de hoje" — faturamento, pedidos, ticket.',
    '"Como estão as vendas comparadas com ontem?"',
    '"Qual produto vendeu mais nos últimos 7 dias?"',
    '"Em que horário vendemos mais?"',
    '"Tem algo fora do normal?" — anomalias do dia.',
    '"O que precisa comprar?" — sugestão de compras pelo consumo.',
    '"Como cancelo uma venda?" / "Como fecho o caixa?" — passo a passo do manual.' ]},

  { t:'Backup e armazenamento', prints:[{id:'adm-backup',alt:'Administrador, Sistema, Backup e espaço',leg:'Backup do Supabase (1), uso do banco e arquivamento mais abaixo.'}], passos:[
    'Administrador → Sistema → Backup e espaço → "Fazer backup agora" (começa na hora, sem pergunta).',
    'Ative o backup automático e escolha o horário e a retenção (por quantos dias guardar).',
    'Para restaurar, escolha o backup no histórico e confirme com sua senha de administrador.',
    'Para apagar um backup, toque em "Excluir" no histórico e confirme com a sua senha de administrador.',
    'Se o backup ficou sem cópia no Drive, aparece o motivo e o botão "Enviar ao Drive" para tentar de novo. O backup tenta até 3 vezes sozinho.',
    'Na mesma tela, mais abaixo: "Uso do Supabase" (com o arquivamento) e "Google Drive" (espaço usado: até 70% normal, 70–90% atenção, acima de 90% crítico).' ],
    comuns:['Drive cheio: backups e fotos podem falhar.',
      'A conferência de integridade compara, todo dia às 6h10, as vendas do dia anterior no Supabase e na planilha e avisa se o número não bate.'] },

  { t:'Ocorrências', prints:[{id:'adm-ocorrencias',alt:'Administrador, Ocorrências',leg:'+ Registrar (1) abre a ocorrência; Abertas e Todas filtram a lista.'}], itens:[
    'Você trata direto pelo Assistente: aba "🔔 Avisos" → "⚠️ Ocorrências abertas" → botão "Tratar".',
    'A tela completa (com filtro Abertas/Todas) continua em Administrador → Hoje → Ocorrências.' ]},

  { t:'Ajustes pós-venda (reembolso, crédito, cortesia)', prints:[{id:'adm-ajustes',alt:'Administrador, Dinheiro, Reembolsos e ajustes',leg:'Reembolsos e ajustes de vendas (1).'}], passos:[
    'Administrador → Dinheiro → Reembolsos e ajustes.',
    'Busque a venda (nº do pedido, nome ou telefone) — só aparecem pedidos já entregues.',
    'Escolha o tipo (Reembolso em dinheiro, Crédito para próxima compra, Cortesia ou Desconto retroativo), o valor e o motivo.',
    'Em reembolso e desconto retroativo, escolha se o dinheiro sai do caixa (o caixa precisa estar aberto) ou fora dele.',
    'Toque em "Registrar ajuste". Para desfazer, use "cancelar" na lista, com o motivo.' ],
    comuns:['A venda original NÃO muda. No DRE o ajuste aparece como "Ajustes pós-venda".',
      'Crédito não reduz o resultado na hora: quando o cliente usar, aplique como desconto no Caixa.',
      'Reembolso e desconto retroativo não passam do valor da venda (somando ajustes já feitos).'] },

  { t:'Reembolsos de vendas canceladas', passos:[
    'Cancelou uma venda que já estava paga? O sistema cria sozinho um reembolso "pendente".',
    'Administrador → Dinheiro → Reembolsos e ajustes → "Reembolsos de vendas canceladas".',
    'Devolva o dinheiro ao cliente (Pix, dinheiro ou estorno no cartão).',
    'Toque em "marcar devolvido" e, se quiser, escreva como foi devolvido.' ],
    comuns:['Só o Administrador marca como devolvido; o Operador consegue ver a lista.',
      'Venda cancelada que ainda não estava paga não gera reembolso.',
      'Pedido do iFood cancelado não gera reembolso: quem devolve ao cliente é o iFood.'] },

  { t:'🛠️ Desenvolvedor (exclusivo)', soDev:true, itens:[
    'Esta seção só aparece para quem entrou com acesso de nível Desenvolvedor (e sem "Ver como"). Ninguém mais vê.',
    'Barra "Modo Desenvolvedor — vendo o sistema como:" (toque em ▸ para abrir e em ▾ para recolher; fica recolhida até você abrir). Escolha um perfil (Operador, Garçom, Cozinha, Entregador) ou uma PESSOA específica e a tela muda para a dela. Suas ações continuam com acesso total.',
    'Voltar para a visão normal: selecione "Admin (visão normal)".',
    'Auto-teste da Ajuda (também no console): testarAjuda_() — valida os 7 manuais em sequência e devolve o resultado.',
    'Painel de uso da IA (custo, erros e cota): dentro do balão (✨) → "Uso da IA". A IA de análise de código do Desenvolvedor foi retirada.',
    'Diagnóstico do sistema: Administrador → Sistema → Backup e espaço → "Conferência de integridade". Somente leitura.',
    'Ao criar/editar usuário Desenvolvedor: você cria como qualquer outro, mas depois de criado o acesso fica travado. Nem você nem ele excluem. Só o próprio Desenvolvedor edita a senha.',
    'O servidor sempre confere o nível de quem pede; não adianta forçar "Ver como" para ganhar acesso.' ]},

  { t:'ℹ️ Sobre o sistema', itens:[
    'Versão em uso neste aparelho: ' + APP_VERSAO + ' — publicada em ' + APP_ATUALIZADO_EM + '.',
    'A Ajuda é atualizada junto com o sistema. Se algum passo aqui não bater com a tela, recarregue a página (Ctrl+Shift+R no computador, ou feche e reabra o app no celular).',
    'Esta versão inclui: aviso de pedido novo em segundos, modo reserva automático (Supabase), modo emergência (servidor fora do ar), fila de envio para cadastros, confirmação de impressão da comanda + alerta "PEDIDO ALTERADO", localização do entregador, balão único com IA, arquivamento automático (por idade e por espaço), prêmios de fidelidade e indicação, atendente virtual no cardápio e backup com exclusão e reenvio ao Drive.',
    'Para dúvida ou problema: use o balão de atendimento (canto da tela) ou fale com o responsável técnico.',
    'O app registra erros de JavaScript deste aparelho e envia para o Supabase (com o login de quem estava usando). Nada de dado pessoal de cliente sai por esse caminho.' ]}
 ],
 erros:[
  { q:'A internet caiu', a:'Venda no Caixa: se você já entrou neste aparelho, o sistema oferece guardar a venda na CONTINGÊNCIA (só retirada ou entrega, sem desconto, sem mesa). Ela entra sozinha quando voltar. Não confirme se já apareceu. Caixa, cancelamento, pagamentos e estoque exigem conexão e nunca ficam guardados. Clientes, feedbacks e ocorrências ficam salvos no aparelho.' },
  { q:'Supabase fora do ar (faixa laranja)', a:'Modo reserva automático: o app para o tempo real, volta às atualizações de 3 min, abre o cartão "Pedidos na reserva" em Pedidos e libera o Caixa para registrar venda na contingência. Ao voltar, a fila é reenviada e as vendas da contingência são reconciliadas sozinhas.' },
  { q:'"Sua sessão expirou"', a:'Entre de novo. Itens que estavam na fila viram "com erro" e voltam pelo botão "na fila" no topo → "Tentar de novo".' },
  { q:'"Alguém alterou este registro"', a:'Outra pessoa editou o mesmo cadastro antes de você. O sistema recarrega os dados reais; confira e refaça a edição.' },
  { q:'Pedido duplicado', a:'Duplo toque ou internet lenta não duplicam. Se o cliente fez dois pedidos de verdade, cancele um: Caixa → "Lançamentos desde a abertura" → excluir, motivo "Pedido duplicado".' }
 ]},

Operador:{ nome:'Caixa', secoes:[
  { t:'Menu de baixo (celular)', itens:[
    'No celular, o menu fica fixo na parte de baixo da tela: Início, Caixa, Pedidos e as outras telas do seu perfil. A aba aberta fica em dourado.',
    'Quando há mais telas do que cabem, aparece "Mais" com as demais. Uma bolinha vermelha avisa que há algo novo naquela aba.',
    'No computador as abas ficam no topo (veja "No computador").' ],
    comuns:['O botão do Assistente é o rosto do ' + ASSISTENTE_ + ' no canto de baixo; ele fica acima do menu, e a página tem um espaço no fim para nada ficar escondido atrás dele.'] },

  { t:'No computador', itens:[
    'Notebook ou monitor (tela a partir de 900 px de largura): o topo fica numa linha só, com o logo à esquerda e o usuário e os botões à direita. As abas ficam sempre à vista no alto, mesmo rolando a página (no celular elas ficam no menu de baixo).',
    'Todas as funções do celular existem no computador: o que muda é só a organização da tela.',
    'Operação: as telas (Ocorrências e Feedbacks) aparecem no menu ao lado.',
    'Pedidos: os pedidos ficam lado a lado (2 ou 3 por linha). Caixa: a escolha dos itens fica à esquerda; carrinho, total e pagamento ficam à direita.',
    'O botão do ' + ASSISTENTE_ + ' fica no canto da tela. Valores aparecem com ponto de milhar (R$ 1.475,90).' ] },

  { t:'Atalhos do teclado (computador)', itens:[
    'No computador, aperte ? (fora de um campo de digitação) ou use o botão \"Atalhos\" no topo para ver a lista completa.',
    'Alt + 1, 2, 3… vai para as abas na ordem em que aparecem no topo (a lista mostra os nomes do seu perfil).',
    'F2 abre o Caixa no passo Cliente; F4 vai direto para Pagamento e finalizar. Ctrl + Enter finaliza a venda, sempre perguntando antes.',
    '/ ou Ctrl + K busca (no Administrador, o campo \"Ir para…\"). Esc fecha a janela aberta.',
    'No Caixa, Enter na busca de cliente escolhe o primeiro resultado; no item, Enter avança de campo e, na quantidade, adiciona ao carrinho.' ] },

  { t:'Modo reserva (quando o sistema cai)', itens:[
    'Uma faixa laranja "Modo reserva" no topo avisa que o servidor principal está fora.',
    'Você continua vendendo no Caixa (retirada ou entrega, sem desconto e sem cupom) e vendo os pedidos em Pedidos. Pedidos do cardápio também entram.',
    'Mudar status do pedido, estoque e compras ficam indisponíveis até voltar: anote à mão e lance depois.',
    'Cadastro de cliente, fidelidade, feedback e ocorrência vão para uma fila e seguem sozinhos na volta. Não repita a ação.' ],
    comuns:['Quando a faixa sumir, confira se os pedidos feitos na queda aparecem em Pedidos.'] },

  { t:'⏰ Pedidos parados (alertas)', itens:[
    'O sistema confere de minuto em minuto se algum pedido ficou parado: novo sem aceite, em preparo há muito tempo, pronto esperando retirada, saída para entrega, entrega ou serviço da mesa, entregue sem confirmação e "A receber" já concluído.',
    'Com o app aberto aparece a faixa "⏰ Pedidos parados" na parte de baixo da tela, com som, e uma bolinha vermelha na aba Pedidos. Com o app fechado chega a notificação no celular (se os avisos estiverem ligados em 🔔).',
    'Em cada pedido da faixa: "Ver pedido" abre o pedido; "Adiar 10 min" some por 10 minutos; "Silenciar este pedido" pede o motivo, some e fica registrado na Auditoria. O X esconde a faixa até aparecer um aviso novo.',
    'O aviso só mostra o que é do seu perfil e só com o caixa aberto. Quando o pedido avança, é pago, cancelado ou o caixa fecha, o aviso some sozinho. Depois de 3 avisos sem resposta o Administrador também é avisado.',
    'O alerta só avisa: nunca muda o status, o pagamento nem o pedido.' ],
    prints:[{id:'alertas',alt:'Faixa Pedidos parados com os botões Ver pedido, Adiar 10 min e Silenciar este pedido',leg:'1: a faixa de pedidos parados, com Ver pedido, Adiar 10 min e Silenciar este pedido em cada pedido.'}] },
  { t:'Turno do caixa (o "hoje" dos pedidos)', itens:[
    'Os pedidos "concluídos", o histórico das mesas, "Vendas do turno" no Início e o resumo do Financeiro contam do momento em que o caixa abriu até o fechamento, mesmo passando da meia-noite. Não é a data do calendário.',
    'Sem caixa aberto, mostram o último turno. Só se nunca houve caixa é que valem o dia do calendário.',
    'Para ver as vendas só do uso real (sem os testes de antes de 17/10/2026), use em Relatórios o período "Uso real (desde 17/10/2026)".' ] },
  { t:'Avisos com o app fechado (🔔)', itens:[
    'Toque no 🔔 do topo e em "Ligar avisos com o app fechado". Permita as notificações quando o navegador pedir.',
    'Depois disso o celular avisa "Novo pedido" (do cardápio) e "Cliente no atendimento" mesmo com o app fechado ou a tela bloqueada. O aviso não mostra nome nem telefone do cliente.',
    'No iPhone: abra o endereço no Safari, toque em Compartilhar → "Adicionar à Tela de Início" e abra o app por esse ícone antes de ligar. No Android basta ligar.',
    'Para desligar, toque no mesmo botão. Ao sair do sistema, este aparelho deixa de receber os avisos de quem saiu.' ],
    comuns:['O som e a vibração do app aberto continuam como antes.'] },

  _aj.entrar('Início, Caixa, Pedidos (com Retiradas, Entregas e Mesas), Clientes e Operação (Ocorrências e Feedbacks). Os avisos ficam no botão redondo do ' + ASSISTENTE_ + ' (canto de baixo), na aba 🔔 Avisos'),
  { t:'Buscar (🔍 no topo)', itens:[
    'Toque na lupa 🔍 no topo, digite pelo menos 2 letras ou números e veja clientes (nome ou telefone, sem precisar de acento), pedidos (número, nome ou telefone do cliente) e produtos/combos.',
    'No cliente, toque em "abrir" para ver o perfil. No pedido, toque em "ver pedido completo": aparece também a 🕒 Linha do tempo (feito, aceito, pronto, saiu, entregue e quanto tempo levou cada etapa).' ]},

  { t:'Abrir o caixa', prints:[{id:'caixa-abrir',alt:'Janela Abrir caixa com o campo do fundo de troco e o botão Abrir caixa',leg:'1: informe o fundo de caixa (dinheiro para troco). 2: toque em Abrir caixa.'}], passos:['Aba Caixa → "Abrir caixa".','Informe o fundo de troco e confirme.'],
    comuns:['Sem caixa aberto não há venda, despesa nem sangria, e o Cardápio Digital não recebe pedidos.',
      '"Já existe um caixa aberto": feche o anterior antes.'] },

  { t:'Fazer uma venda', passos:[
    '1. Cliente: busque por nome ou telefone, ou "Venda sem cadastro". Escolha Retirada, Entrega ou Mesa.',
    '2. Itens: toque nos produtos; adicionais abrem numa janela.',
    '3. Pagamento e finalizar: escolha a forma. Em dinheiro, informe o recebido e veja o troco. Para dividir, marque "Dividir pagamento". Confira o total, escolha 58mm, 80mm ou A4 e toque em Imprimir, Copiar ou WhatsApp.',
    'CPF na nota: quando a nota fiscal está ligada, aparece o campo "CPF na nota (só se o cliente pedir)" antes de Finalizar. Preencha só se o cliente pedir; a nota sai cerca de 1 minuto depois da venda e, depois que sai, não dá mais para incluir o CPF.',
    '"↺ Repetir última venda" recarrega o carrinho anterior.' ],
    comuns:['"Abra o caixa antes de registrar uma venda."',
      '"A soma dos pagamentos precisa bater com o total".',
      'Desconto (% ou R$) pede a senha do administrador.'],
    prints:[{id:'caixa-1-cliente',alt:'Caixa, passo 1: escolher o cliente e retirada, entrega ou mesa',leg:'Passo 1: escolha o cliente (ou venda sem cadastro) e toque em Retirada, Entrega ou Mesa.'},{id:'caixa-2-itens',alt:'Caixa, passo 2: escolher os itens',leg:'Passo 2: toque no produto (atalhos) para entrar no carrinho; confira o carrinho.'},{id:'caixa-3-pagamento',alt:'Caixa, passo 3: pagamento e finalizar',leg:'Passo 3: confira a forma de pagamento e toque em Finalizar venda.'}] },

  { t:'Cliente cancelou o pedido (Cardápio)', itens:[
    'Nos primeiros 3 minutos, e só enquanto o pedido está "aguardando aceite", o cliente cancela sozinho. O estoque volta.',
    'Depois de aceito, ou passados os 3 minutos, o cliente precisa ligar. Cancelar ou editar passa a ser com você ou o Admin.' ]},

  { t:'Pedidos e entregas', passos:[
    'Pedido do Cardápio chega como "novo — aguardando aceite": toque em "✅ Aceitar" ou "❌ Rejeitar".',
    'Quando ficar "Pronta" (retirada ou entrega) ou "Saiu para entrega", e o cliente tiver telefone, toque em "📲 Avisar cliente".',
    'Avance com "Marcar como…": Em preparo → Pronta → Retirada (Servida, se for mesa).',
    'Em Entregas, o entregador já vem preenchido quando só existe um cadastrado. Com mais de um, escolha no campo "Entregador".',
    'Para imprimir (o modelo da comanda é o mesmo em todas): nas Entregas toque em "🖨️ Imprimir para o entregador"; nas Retiradas e nas Mesas, em "🖨️ Imprimir pedido da retirada" (ou "da mesa"). O botão aparece depois que o pedido é aceito. Papel (58mm, 80mm ou A4) em Pedidos → Entregas.',
    'Venda "A Receber": quando o cliente pagar, toque em "marcar como recebido" e escolha em que forma ele pagou (Dinheiro, Pix, cartão…; dá para dividir em duas). O padrão é a forma do pedido.',
    'Cupom "Combo por preço fixo": em Promoções → novo cupom, tipo "Combo por preço fixo". Em "Valor" ponha o preço final do combo (ex.: 65) e, em "Produtos do combo", uma linha por grupo no modelo "3 x Smash Catupiry, Smash Cheddar" e "1 x Guaraná 1L" (nome igual ao do cadastro). O cupom só vale com esses produtos no carrinho e o desconto é a diferença para o preço normal deles; a entrega é somada depois. Vale um combo por pedido.',
    '"✖ Cancelar pedido" fica ao lado de "⏸ Suspender" nos pedidos já aceitos (antes do aceite, use "Rejeitar"): escolha o motivo e informe se a mercadoria foi perdida (em pedido do iFood, o cancelamento vai para o iFood sozinho). '+
    '"⏸ Suspender" pausa o pedido (toque num motivo pronto, como "Cliente não atende", ou escreva) e "▶️ Retomar" volta. Recusar pedido também tem motivos prontos.' ],
    comuns:['Só dá para editar os itens com o pedido "Em preparo".',
      'O entregador esqueceu de marcar: marque você pelo botão do pedido.',
      'Sem aviso de pedido novo: no Início, toque em "🔔 Ativar avisos" e "🔊 Testar som".'],
    prints:[{id:'pedidos-retiradas',alt:'Pedidos, aba Retiradas, com o botão Aceitar',leg:'Retiradas: toque em Aceitar para o pedido ir para a cozinha.'},{id:'pedidos-entregas',alt:'Pedidos, aba Entregas, com o botão Marcar como Saiu para entrega',leg:'Entregas: avance o pedido a cada etapa (Pronta, Saiu, Entregue).'}] },

  { t:'Cliente pedindo pela mesa (QR Code)', passos:[
    'O cliente aponta a câmera para o QR da mesa, escolhe os itens e envia.',
    'O pedido chega em Pedidos como "Recebido" (📱 Cliente). Toque em ✅ Aceitar, ou ❌ Rejeitar.',
    'Se o cliente tocar em "Chamar garçom", a mesa aparece em 🍽️ Mesas com 🔔 — toque em ✔ Atendido quando for lá.',
    'Se tocar em "Pedir a conta", a mesa vira "Pediu a conta" e você fecha como sempre.' ],
    comuns:['O cliente só cancela enquanto o pedido está "Recebido".',
      'Pedido de mesa pelo cliente nunca vai ao preparo sem o aceite.'] },

  { t:'Fechar a conta de uma mesa', passos:[
    'Quando o garçom pede a conta, a mesa fica "Aguardando fechamento".',
    'Toque em "🍽️ Mesas". Quem pediu a conta aparece primeiro, com pontinho de aviso e som.',
    'Em cada mesa: garçom, tempo, pedidos e total. "Ver pedidos" mostra o detalhe; "💳 Fechar conta" abre o pagamento.',
    'Para dividir, marque "Dividir em duas formas" e informe o valor da primeira.',
    'Se a forma escolhida tem acréscimo, ele é somado no fechamento e aparece no total a cobrar.' ],
    comuns:['"Abra o caixa antes de fechar a conta da mesa".',
      '"A soma dos pagamentos não bate com a conta".'],
    prints:[{id:'pedidos-mesas',alt:'Pedidos, aba Mesas, com o botão Liberar mesa e o histórico do turno',leg:'Mesas: mesas ocupadas em cima; o histórico do turno do caixa embaixo.'}] },

  { t:'Editar ou cancelar uma venda', prints:[{id:'caixa-editar-venda',alt:'Janela Editar venda com os itens e o novo total',leg:'Mude os itens, veja o novo total (1) e informe o motivo da edição. Se o valor subir, escolha em que forma cobrar a diferença.'}], passos:[
    'Caixa → "Lançamentos desde a abertura".',
    'Toque em "editar" ou "excluir".',
    'Cancelar pede motivo e a senha do administrador. Se o pedido já estava pronto, diga se a mercadoria foi perdida ou volta ao estoque.' ]},

  { t:'Despesa e sangria', passos:['Caixa → "+ Despesa" ou "− Sangria".','Informe valor e motivo e confirme.'],
    comuns:['Sangria é retirada de dinheiro do caixa e não conta como despesa.'] },

  { t:'Fechar o caixa', prints:[{id:'caixa-fechar',alt:'Janela do Caixa aberto com os totais por forma de pagamento e o botão Fechar caixa',leg:'Caixa aberto: totais por forma de pagamento e saldo esperado. 1: Fechar caixa (pede o dinheiro contado e a senha).'}], passos:[
    'Caixa → fechar caixa.',
    'Informe o dinheiro contado.',
    'Confira o total por forma, despesas, sangrias e a diferença.' ],
    comuns:['Ao tocar em "Sair" com o caixa aberto, o sistema pergunta se você quer mesmo sair.'] },

  { t:'Caixa vencido', itens:[
    'Quando o caixa passa do horário de corte (padrão 06:00) ou de 24 horas aberto, o Caixa bloqueia venda nova de balcão e de mesa, sangria e resgate de prêmio. Preparar, despachar, entregar e receber pedidos já aceitos continuam livres, e pedidos do iFood e do cardápio continuam entrando.',
    'Para fechar: Caixa → “Fechar caixa vencido”. Informe o dinheiro contado e, se quiser, o motivo. A diferença fica registrada como fechamento atrasado. Só fecha sem mesas abertas e sem pedidos pendentes.',
    'Quem libera o caixa por algumas horas, em emergência, é só o Administrador. Uma faixa no Início e no Caixa avisa 2 horas antes do corte.' ] },

  { t:'Modo emergência (servidor fora do ar)', itens:[
    'Só funciona no mesmo aparelho em que você já fez login normal nos últimos 30 dias.',
    'Quando o sistema não conseguir falar com o servidor (Supabase), oferece "Entrar em MODO EMERGÊNCIA como [seu login]".',
    'Dá para: registrar venda de retirada/entrega pela contingência.',
    'Não dá para: abrir/fechar caixa, cancelar, receber pagamento, mexer em estoque, ver financeiro.',
    'Quando o servidor voltar, o app avisa e pede login de novo.' ]},

  { t:'Fila de envio', itens:[
    'Cadastro de cliente, fidelidade, feedback e ocorrência podem ficar guardados no aparelho quando a internet cai. Aparece "na fila" no topo.',
    'Toque para ver estado, tentativas e motivo. Você pode tentar de novo, descartar ou enviar agora.',
    'Venda, pagamento, sangria, cancelamento e estoque NUNCA ficam na fila.' ]},

  { t:'Balão de atendimento', itens:[
    'O botão no canto é o assistente quando você está logado. Para o cliente ele é o atendente virtual (IA); quando o problema é com a equipe, o chamado chega aqui.',
    'Escreva perguntas como: "como faço uma venda?", "quanto tem de pão no estoque?", "tem cliente aguardando?".',
    'Se houver cliente esperando, o botão mostra um contador vermelho. Toque para ver a fila e assumir um atendimento.' ]},

  { t:'Localização do entregador', itens:[
    'Em Entregas, quando o pedido estiver "Saiu para entrega" e tiver entregador atribuído, aparece "📍 Ver localização".',
    'Abre um mapa com a última posição (o entregador envia a cada ~18 s, só enquanto estiver na rua).' ]},

  { t:'O que você tem em Administrador', itens:[
    'A aba aparece com o nome "Operação". A barra é reduzida: só o grupo "💬 Atendimento", com duas telas — Ocorrências e Feedbacks.',
    'Ocorrências: filtro Abertas/Todas e botão "Tratar". Você pode mudar status (Aberta → Em andamento → Resolvida), anotar responsável e descrever a solução.',
    'Feedbacks: tudo o que os clientes enviaram. Você pode marcar como Visto, escrever uma resposta ("💬 Responder": quem tem conta vê em Minha conta; sem conta, use o botão WhatsApp) ou marcar como Respondido. A marca "🔔 veio pelo aviso do pedido" ou "💬 veio pelo chat" mostra de onde veio.',
    'Atalho mais rápido no dia a dia: no Assistente, a aba "🔔 Avisos" mostra as ocorrências abertas, com botão "Tratar" direto.',
    'Você NÃO tem acesso às outras telas do Administrador (financeiro, usuários, backup, catálogo etc.).' ]},

  { t:'Clientes e fidelidade', prints:[{id:'clientes',alt:'Aba Clientes com o botão Novo cliente, filtros e a lista de clientes',leg:'1: + Novo cliente. Abaixo, os filtros (Inativos, Em risco, VIP, Fiel, Novos e iFood, que mostra só quem pediu pelo iFood) e a busca por nome ou telefone. Os telefones desta imagem são fictícios.'}], passos:['Clientes → "+ Novo cliente": só nome e telefone são obrigatórios.','Toque no cliente para ver histórico, total gasto, indicação e cartão fidelidade.','Com as 10 marcas, ou com uma indicação pendente, escolha o prêmio e toque em "🎁 Resgatar". Precisa do caixa aberto; o estoque baixa e o cliente não paga.','No histórico do cliente, use os filtros de período, entrega/retirada e pago/a receber.','No alto do perfil está o Perfil 360: segmento (Novo, Fiel, VIP ou Em risco), gasto total, ticket médio, frequência, itens favoritos e se tem conta Google. Já soma os pedidos antigos arquivados.','Na lista de clientes, os botões Em risco, VIP, Fiéis e Novos mostram só aquele grupo. Em risco = sem pedir há mais de 45 dias.'],
    comuns:['"Nenhum prêmio cadastrado": peça ao Administrador para marcar um produto como prêmio.'] },

  _aj.ocorr('Ela aparece na aba "🔔 Avisos" do Assistente e você pode tratar direto pelo botão "Tratar".')
 ],
 erros:[
  { q:'A internet caiu', a:'O botão de finalizar trava com "Sem conexão". Se você já entrou neste aparelho, o sistema oferece guardar a venda na CONTINGÊNCIA (só retirada ou entrega, sem desconto, sem mesa): ela entra sozinha quando voltar. Fechar caixa, cancelar, pagar e lançar despesa exigem conexão.' },
  { q:'Supabase fora do ar (faixa laranja)', a:'Modo reserva automático. O cartão "Pedidos na reserva" fica em Pedidos (somente consulta). Você pode continuar registrando retirada/entrega na contingência — sem desconto, sem mesa, sem cupom.' },
  { q:'O caixa está fechado', a:'Abra o caixa antes de vender, lançar despesa ou sangria. Enquanto estiver fechado, o Cardápio Digital também não recebe pedidos.' },
  { q:'Pedido duplicado', a:'Duplo toque não duplica. Se o cliente pediu duas vezes, cancele um em "Lançamentos desde a abertura" → excluir, motivo "Pedido duplicado".' },
  { q:'Errei o valor ou um item', a:'Use "editar" em "Lançamentos desde a abertura". Itens de pedido só mudam enquanto o pedido está "Em preparo".' }
 ]},

'Garçom':{ nome:'Garçom', secoes:[
  _aj.entrar('Início, Atendimento, Pedidos (com Retiradas, Entregas e Mesas) e Clientes'),
  { t:'⏰ Pedidos parados (alertas)', itens:[
    'O sistema confere de minuto em minuto se algum pedido ficou parado: novo sem aceite, em preparo há muito tempo, pronto esperando retirada, saída para entrega, entrega ou serviço da mesa, entregue sem confirmação e "A receber" já concluído.',
    'Com o app aberto aparece a faixa "⏰ Pedidos parados" na parte de baixo da tela, com som, e uma bolinha vermelha na aba Pedidos. Com o app fechado chega a notificação no celular (se os avisos estiverem ligados em 🔔).',
    'Em cada pedido da faixa: "Ver pedido" abre o pedido; "Adiar 10 min" some por 10 minutos; "Silenciar este pedido" pede o motivo, some e fica registrado na Auditoria. O X esconde a faixa até aparecer um aviso novo.',
    'O aviso só mostra o que é do seu perfil e só com o caixa aberto. Quando o pedido avança, é pago, cancelado ou o caixa fecha, o aviso some sozinho. Depois de 3 avisos sem resposta o Administrador também é avisado.',
    'O alerta só avisa: nunca muda o status, o pagamento nem o pedido.' ],
    prints:[{id:'alertas',alt:'Faixa Pedidos parados com os botões Ver pedido, Adiar 10 min e Silenciar este pedido',leg:'1: a faixa de pedidos parados, com Ver pedido, Adiar 10 min e Silenciar este pedido em cada pedido.'}] },
  { t:'Buscar (🔍 no topo)', itens:[
    'Toque na lupa 🔍 no topo e digite o nome do cliente, o número do pedido ou o nome de um produto. Você não vê valores nem telefone dos pedidos.' ]},

  { t:'Lançar pedido de uma mesa', prints:[{id:'gar-mesas',alt:'Tela Início do Garçom com o atalho Mesas',leg:'1: o atalho Mesas no Início mostra as mesas que você está atendendo.'}], passos:[
    'Aba Caixa → etapa "1. Cliente" → escolha a mesa. Se estiver Livre, toque em "Abrir mesa".',
    'Vá em "2. Itens", toque nos itens e escolha os adicionais.',
    'Toque em "Lançar na mesa (enviar à cozinha)". Repita quantas vezes o cliente pedir mais.' ],
    comuns:['"A mesa N está … — não aceita novos itens": já está aguardando fechamento.',
      '"Esta mesa está sob responsabilidade de outro garçom": a mesa é de quem a abriu; peça ao Caixa.',
      'Você lança pedido de mesa, sem desconto e sem receber pagamento.'] },

  { t:'Pedir a conta', passos:[
    'Caixa → escolha a mesa (ou toque em "🍽️ Mesas").',
    'Toque em "Pedir fechamento" e confirme.',
    'A mesa passa para "Aguardando fechamento". O Caixa recebe — ou você mesmo, com "💳 Receber conta".' ],
    comuns:['Só dá para pedir fechamento de mesa "Ocupada".'] },

  { t:'Cliente pedindo pela mesa (QR Code)', passos:[
    'O cliente pode pedir pelo celular. Quem aceita o pedido é o Caixa.',
    'Se ele tocar em "Chamar garçom", a mesa aparece em 🍽️ Mesas com 🔔 e o aparelho avisa.',
    'Depois de atender, toque em ✔ Atendido.' ],
    comuns:['Se a mesa pedir a conta, ela vira "Pediu a conta".'] },

  { t:'Receber a conta (garçom)', passos:[
    'Toque em "🍽️ Mesas" e ache a sua mesa.',
    'Toque em "💳 Receber conta", confira o total e escolha a forma.',
    'Para dividir, marque "Dividir em duas formas".',
    'Confirme. A mesa fica livre e o valor entra no caixa.' ],
    comuns:['"O caixa está fechado": peça ao caixa para abrir.',
      '"Esta mesa não está sob a sua responsabilidade": só quem abriu a mesa recebe.'] },

  { t:'Acompanhar e servir', passos:['Aba Pedidos: veja o andamento de cada pedido. Para imprimir o pedido, toque em "🖨️ Imprimir pedido da mesa" no cartão (aparece depois que o pedido é aceito).','Quando estiver "Pronta", leve à mesa e toque em "Marcar como “Servida”".'] },

  { t:'Aviso de pedido pronto', itens:[
    'Na primeira vez, toque em "🔔 Ativar avisos e som".',
    'Quando um pedido das SUAS mesas ficar "Pronta", o aparelho toca, vibra e o título da aba mostra "Pedido pronto".',
    'A checagem roda mesmo com o app em segundo plano.' ]},

  { t:'Clientes', prints:[{id:'clientes',alt:'Aba Clientes com o botão Novo cliente, filtros e a lista de clientes',leg:'1: + Novo cliente. Os telefones desta imagem são fictícios.'}], passos:['Aba Clientes → "+ Novo cliente".','Só nome e telefone são obrigatórios.'] },

  _aj.ocorr('O Administrador e o Operador são avisados e resolvem.')
 ],
 erros:[
  { q:'A internet caiu', a:'Você não tem fila de envio: se aparecer "Sem conexão — a mesa não foi aberta" (ou o fechamento não foi solicitado), nada foi gravado. Espere o 🟢, confira em Pedidos se o pedido já entrou e só então repita.' },
  { q:'O caixa está fechado', a:'Quem abre e fecha o caixa é o Caixa. Se a conta da mesa não puder ser recebida, avise o responsável.' },
  { q:'Pedido duplicado ou item errado', a:'Duplo toque não duplica. Se lançou item errado ou em dobro, peça ao Caixa para editar ou cancelar (itens só mudam com o pedido "Em preparo").' }
 ]},

Cozinha:{ nome:'Cozinha', secoes:[
  _aj.entrar('Início, Cozinha (os pedidos) e Notificações'),
  { t:'⏰ Pedidos parados (alertas)', itens:[
    'O sistema confere de minuto em minuto se algum pedido ficou parado: novo sem aceite, em preparo há muito tempo, pronto esperando retirada, saída para entrega, entrega ou serviço da mesa, entregue sem confirmação e "A receber" já concluído.',
    'Com o app aberto aparece a faixa "⏰ Pedidos parados" na parte de baixo da tela, com som, e uma bolinha vermelha na aba Pedidos. Com o app fechado chega a notificação no celular (se os avisos estiverem ligados em 🔔).',
    'Em cada pedido da faixa: "Ver pedido" abre o pedido; "Adiar 10 min" some por 10 minutos; "Silenciar este pedido" pede o motivo, some e fica registrado na Auditoria. O X esconde a faixa até aparecer um aviso novo.',
    'O aviso só mostra o que é do seu perfil e só com o caixa aberto. Quando o pedido avança, é pago, cancelado ou o caixa fecha, o aviso some sozinho. Depois de 3 avisos sem resposta o Administrador também é avisado.',
    'O alerta só avisa: nunca muda o status, o pagamento nem o pedido.' ],
    prints:[{id:'alertas',alt:'Faixa Pedidos parados com os botões Ver pedido, Adiar 10 min e Silenciar este pedido',leg:'1: a faixa de pedidos parados, com Ver pedido, Adiar 10 min e Silenciar este pedido em cada pedido.'}] },
  { t:'Buscar (🔍 no topo)', itens:[
    'Toque na lupa 🔍 no topo e digite o número do pedido, o nome do cliente ou o nome de um produto para achar um pedido rápido.' ]},

  { t:'Preparar os pedidos', passos:[
    'Aba Pedidos: três colunas (Novos, Em preparo, Prontos) com itens, adicionais e observações.',
    'Observação do cliente em um item aparece em destaque com 📝 abaixo do item.',
    'Para imprimir: "🖨️ Comanda" no pedido ou "🖨️ Imprimir novos". Marque "Imprimir sozinho quando chegar pedido" para imprimir automático (o navegador precisa estar em modo quiosque de impressão).',
    'No Início, "🔊 Testar som" confere se o celular toca e "🔔 Ativar avisos" libera notificações.',
    'Pedido novo chega com beep e piscada (o sistema confere a cada poucos segundos com o app aberto e online).',
    'Toque em "▶️ Iniciar preparo" (no pedido do Cardápio: "Aceitar e iniciar preparo").',
    'Terminou? Toque em "✅ Pronto".',
    'A comanda impressa é única: nas entregas traz o endereço, a referência, o telefone e o valor a cobrar. Grampeie no pedido e ele já segue para o entregador.',
    'No fim da tela, "📜 Concluídos neste turno" mostra o que já saiu (retirado, entregue ou servido), com o horário. A lista zera quando o caixa fecha.' ],
    comuns:['Sem beep: toque em "🔊 Testar som" no Início, aumente o volume de mídia e tire o modo silencioso.',
      'O sistema mantém a tela ligada enquanto o app está aberto. Se aparecer "⚠️ A tela NÃO está sendo mantida ligada", toque em "📱 Manter a tela ligada".'],
    prints:[{id:'cozinha',alt:'Tela da Cozinha com o botão Aceitar e iniciar preparo',leg:'Cozinha: toque em Aceitar e iniciar preparo (1); Ocorrência (2) avisa um problema.'}] },

  { t:'Confirmar impressão da comanda', itens:[
    'Depois de mandar imprimir, fica um botão discreto "🔁 Não saiu? Reimprimir" (some sozinho em 10 min). Ninguém precisa confirmar quando saiu certo.',
    '🔁 Não saiu? Reimprimir: o sistema tira o pedido de "impressos" e manda de novo.',
    '✖ Saiu, ocultar: esconde o botão.' ]},

  { t:'Pedido alterado depois de impresso', itens:[
    'O aparelho guarda uma "foto" da comanda quando você imprime ou quando o pedido aparece na tela.',
    'Se um Admin/Operador editar o pedido, a foto deixa de bater. O cartão ganha faixa vermelha "PEDIDO ALTERADO" e toca dois bipes uma vez.',
    'Para resolver: "🖨️ Reimprimir comanda atualizada" ou "👍 Ciente".' ]},

  _aj.ocorr('O Administrador e o Operador são avisados. Use para falta de ingrediente ou pedido que não pode ser produzido.'),

  { t:'Notificações', itens:['Mural de avisos. Você só vê os que o Administrador liberou para a Cozinha.'] }
 ],
 erros:[
  { q:'A internet caiu', a:'O topo mostra "⚠️ Sem conexão com o servidor — tentando de novo em 3 min." Continue os pedidos já visíveis. Se tocar em "Iniciar preparo" e aparecer "Sem conexão — o preparo não foi registrado", repita quando voltar o 🟢.' },
  { q:'Não chega nenhum pedido', a:'Confira o status no topo (🟢). Com o caixa fechado, o Cardápio Digital não recebe pedidos; avise o Caixa. Toque em "↻ Verificar agora".' },
  { q:'Pedido duplicado', a:'Se aparecerem dois iguais, faça só um e avise o Caixa para cancelar o repetido. Você também pode registrar uma Ocorrência no pedido.' },
  { q:'Não sei se a comanda saiu', a:'Sem resposta em 30 s o aviso fica vermelho. Toque em ✅ Saiu ou 🔁 Não saiu.' }
 ]},

Entregador:{ nome:'Entregador', secoes:[
  _aj.entrar('Início, Minhas entregas e Meus ganhos'),

  { t:'Fazer uma entrega', passos:[
    'Aba Minhas entregas: aparecem só as suas. Uma nova toca um aviso sonoro.',
    'O cartão mostra itens, endereço, referência, telefone, total, taxa e "📍 Ver no Maps".',
    'Quem marca o pedido como "Pronta" é a Cozinha. Quando pegar o pedido (status "Pronta"), toque em "Marcar como “Saiu para entrega”". Nesse momento o app começa a enviar sua localização.',
    'Ao entregar, toque em "✅ Já entreguei". O envio de localização para sozinho.',
    'Se o cartão diz "A receber", cobre o valor do cliente; quem registra o recebimento é o Caixa.' ],
    comuns:['Não aparece nada: ainda não atribuíram entrega a você. Avise o Caixa.',
      'Pedido "aguardando aceite": o botão só aparece depois que o Caixa aceitar.'],
    prints:[{id:'entregador',alt:'Tela de entregas do entregador',leg:'Entregador: avance a entrega com o botão do cartão (1).'}] },

  { t:'Aviso de entrega nova', itens:[
    'Na primeira vez, toque em "🔔 Ativar avisos e som" (canto da tela).',
    'Quando o Caixa atribuir uma entrega, o aparelho toca, vibra e a aba mostra "Nova entrega".',
    'A checagem roda com o app aberto, mesmo em segundo plano.' ]},

  { t:'Localização (sua privacidade)', itens:[
    'O envio só liga quando você tem entrega em "Saiu para entrega" — não fica rodando o dia inteiro.',
    'Não guarda histórico: a posição é atualizada em cima da anterior e o banco limpa ao sair do status.',
    'Precisa do GPS permitido no navegador. Se negar, a entrega continua normal; só o mapa do restaurante fica sem sua posição.',
    'Ao marcar "Já entreguei", o envio para automaticamente.' ]},

  { t:'Meu dia', itens:[
    'Em Minhas entregas, "💰 Meu dia" mostra suas entregas do turno do caixa (do abrir ao fechar, mesmo passando da meia-noite), as taxas e a ajuda diária.',
    'O total previsto é taxas + ajuda diária (uma vez por dia). O acerto oficial é feito pelo Administrador.' ]},

  _aj.ocorr('O Administrador e o Operador são avisados. Use para cliente ausente, endereço errado ou problema na entrega.')
 ],
 erros:[
  { q:'A internet caiu', a:'O celular mostra o último estado salvo. Se o toque em "Saiu para entrega" ou "Já entreguei" falhar, confira o status no cartão e toque de novo quando voltar a conexão — o sistema não duplica.' },
  { q:'O cliente não atende', a:'Avise o Caixa: ele pode usar "⏸ Suspender" no pedido (com motivo) e retomar depois. Registre uma Ocorrência para ficar anotado.' },
  { q:'Pedido duplicado', a:'Se aparecerem dois cartões iguais, entregue só um e avise o Caixa, que cancela o repetido.' },
  { q:'Esqueci de marcar "Entregue"', a:'Avise o Caixa ou o Administrador: eles marcam manualmente pelo pedido.' },
  { q:'O mapa não mostra minha posição', a:'Confira se o GPS está ligado e se o navegador tem permissão de localização para o site.' }
 ]}
};

const MANUAL_AJUDA_CLIENTE_ = {
  nome:'Cliente',
  secoes:[
    { t:'🍔 Como fazer um pedido', passos:[
      'Escolha a categoria lá em cima (Lanches, Combos, Bebidas…) ou role a tela para ver "Mais pedidos" e "Destaques".',
      'Toque em qualquer parte do cartão do item (nome, descrição ou preço) para abrir e escolher.',
      'Role para o lado em cada seção para ver mais itens. Toque na foto para ver o item ampliado. Toque em "Adicionar" no item. Se ele tiver adicionais, aparece uma janela. Você também pode escrever uma observação (ex.: "sem cebola").',
      'Ajuste a quantidade e toque em "Adicionar ao carrinho".',
      'Quando terminar, toque na barra dourada que aparece embaixo ("X itens — R$ …") para abrir o carrinho.',
      'Nome e telefone ficam guardados neste aparelho e já vêm preenchidos nos próximos pedidos; é só conferir. O endereço não é guardado: vem sempre pela localização.',
      'No carrinho, informe nome, telefone e escolha Retirar no balcão ou Entrega. Se for entrega, digite o CEP (opcional) para preencher rua e bairro, ou o app pode pedir a sua localização para preencher rua e bairro: confira e digite o número da casa (ou "s/n").',
      'Confira o total e toque em "Enviar pedido". O restaurante vai confirmar antes de preparar.' ],
      prints:[{id:'cliente-cardapio',alt:'Cardápio do cliente com as categorias no topo e o botão Entrar',leg:'1: as categorias (Todas, Combos, Lanches…). 2: "Entrar", para usar cupons e juntar carimbos (opcional).'},{id:'cliente-item',alt:'Janela do item com adicionais, observação e botão Adicionar ao carrinho',leg:'1: escreva uma observação (ex.: sem cebola). 2: "Adicionar ao carrinho".'},{id:'cliente-carrinho',alt:'Carrinho com o campo de cupom, nome, telefone e forma de retirada',leg:'1: o campo do cupom. Abaixo, nome, telefone, retirada ou entrega e o botão "Enviar pedido".'}]},

    { t:'🛒 Carrinho guardado', itens:[
      'Se você sair do cardápio no meio do pedido, o carrinho fica guardado neste aparelho por 24 horas. Ao voltar, toque em "Continuar pedido" (ou "Descartar"). Os preços são atualizados e itens esgotados ficam de fora.' ]},

    { t:'🎟️ Cupom de desconto', prints:[{id:'cliente-carrinho',alt:'Carrinho do cliente com o campo de cupom e o botão Enviar pedido',leg:'O campo do cupom (1) fica no carrinho, antes de enviar o pedido.'}], itens:[
      'No carrinho, antes de enviar, tem um campo "🎟️ Cupom".',
      'Digite o código (ex.: PROMO10) e toque em "Aplicar cupom".',
      'O desconto aparece embaixo e o total é recalculado na hora.',
      'Alguns cupons dão mais desconto quanto maior o pedido (ex.: R$ 5 a partir de R$ 50, R$ 10 a partir de R$ 100). Vale a maior faixa que o seu pedido alcança.',
      'Se o cupom não valer (fora do prazo, valor mínimo não atingido, etc.), aparece uma mensagem explicando.',
      'Alguns cupons valem só em certas formas de pagamento (ex.: só Pix ou Dinheiro). Nos botões de pagamento aparece "🎟️ cupom vale" onde ele vale. Se escolher outra forma, o desconto sai e aparece um aviso; ao voltar para uma forma que vale, o desconto volta sozinho.' ]},

    { t:'👤 Minha conta (opcional)', itens:[
      'Toque em "👤 Entrar", na faixa logo abaixo do banner do cardápio, e escolha "Continuar com o Google". Você não precisa de conta para pedir.',
      'Abriu o cardápio pelo Instagram, Facebook ou TikTok? O Google não deixa entrar pelo navegador dessas redes. Toque em "Abrir no navegador" (no iPhone: ••• → Abrir no Safari) e entre por lá. Pedir sem conta funciona ali mesmo.',
      'Com a conta você vê seus pedidos e toca em "🔁 Repetir pedido", guarda endereços, recebe cupons (boas-vindas, aniversário, indique e ganhe) e acompanha o cartão fidelidade.',
      'Para ganhar o presente de aniversário, informe a data de nascimento (opcional). Receber promoções também é opcional e você muda quando quiser em "Meus dados".',
      'O cartão fidelidade e o histórico de antes aparecem na conta depois do seu primeiro pedido concluído com ela.',
      'Indique e ganhe: em "🎁 Indique" você copia o seu link e manda para um amigo. Quando ele fizer o primeiro pedido e o pedido for concluído, ele ganha um cupom e você ganha o que o restaurante tiver ligado: um cupom, 1 brinde (produto-prêmio) à sua escolha, ou os dois.',
      'Brindes: com o cartão fidelidade completo ou com um brinde de indicação, escolha o prêmio na própria conta ("Cartão fidelidade" ou "Indique") ou no carrinho. O brinde pode ir junto com outros itens ou sozinho: ele sai por R$ 0,00 e a entrega, se for entrega, é cobrada. Se o pedido for cancelado, o brinde volta para você.',
      'Em "🔒 Meus dados" você pode ler o Aviso de Privacidade e sair da conta.' ]},

    { t:'💳 Formas de pagamento e troco', prints:[{id:'cliente-carrinho',alt:'Carrinho do cliente com o campo de cupom e o botão Enviar pedido',leg:'Na tela do carrinho você escolhe a forma de pagamento; o botão Enviar pedido (2) conclui.'},{id:'cliente-infinitepay',alt:'Tela de pagamento da InfinitePay no cardápio',leg:'Formas pagas pela InfinitePay: toque em Abrir o pagamento (1), pague e volte; a tela confere sozinha.'}], itens:[
      'Escolha a forma de pagamento no carrinho, antes de enviar.',
      'Se escolher Dinheiro, aparece a opção "Preciso de troco". Marque e informe para quanto (ex.: "troco para R$ 50").',
      'Dinheiro e cartão na máquina: o pagamento é combinado na entrega ou na retirada.',
      'Se o restaurante ligou o pagamento pelo site, aparece “Pagar agora, pelo site” com Pix e/ou cartão. Para pagar pelo site é preciso entrar com a sua conta; na entrega não precisa.',
      'Pix: aparece o QR Code (e o código para copiar) com um cronômetro. Cartão: preencha número, nome, validade, código e CPF do titular. Quando o pagamento é aprovado, aparece “Pagamento aprovado”.',
      'Se o tempo do Pix terminar, o pedido é cancelado; se você chegou a pagar, o restaurante entra em contato. Escolha uma forma de pagamento e refaça o pedido.',
      'Algumas formas são pagas no site da InfinitePay: toque em "Abrir o pagamento da InfinitePay", pague (Pix ou crédito) e volte ao cardápio. A tela confere sozinha; se demorar, toque em "Já paguei". Não pague duas vezes.' ],
      comuns:['O pedido pago pelo site só vai para a cozinha depois da confirmação do pagamento.'] },

    { t:'📦 Acompanhar seu pedido', passos:[
      'No rodapé do cardápio, toque em "📦 Acompanhe seu pedido".',
      'Se você tem só um pedido neste aparelho, o status abre direto. Se tem mais, aparece a lista para escolher.',
      'O status atualiza sozinho a cada 20 segundos: Recebido → Aceito/Em preparo → Pronto/Saiu pra entrega → Entregue/Retirado.',
      'Logo depois de enviar, o cartão “Pedido enviado” tem o botão “📦 Acompanhar agora”, que abre o status na hora.',
      'Com vários pedidos, depois de abrir um, toque em “← Todos os pedidos” para voltar à lista sem fechar a janela.',
'O status fica salvo no seu navegador. Se você limpar o histórico do navegador, perde a lista (o restaurante continua com o pedido).' ]},

    { t:'🎮 Jogar enquanto espera', prints:[{id:'cliente-jogos',alt:'Tela dos mini jogos com a barra do pedido no topo',leg:'Escolha um jogo (1). A barra de cima mostra o seu pedido o tempo todo.'},{id:'cliente-jogo-aviso',alt:'Aviso de que o pedido mudou de etapa, com o jogo pausado',leg:'Quando o pedido muda de etapa, o jogo pausa e aparece o aviso (1).'}], itens:[
      'No acompanhamento do pedido, enquanto ele não foi entregue, aparece o botão "🎮 Jogar enquanto espera".',
      '4 joguinhos rápidos: Monte o Burger, Chuva de Ingredientes, Memória Texas e Cobra Smash. Alguns usam as fotos dos lanches do cardápio.',
      'A barra de cima mostra o seu pedido o tempo todo. Quando ele muda de etapa (por exemplo, saiu para entrega), o jogo pausa e aparece o aviso. Toque em "Ver o pedido" ou "Continuar jogando".',
      'O som começa desligado (botão 🔇/🔊). O seu recorde fica guardado só neste aparelho.' ]},

    { t:'✖ Cancelar um pedido', itens:[
      'Você pode cancelar nos PRIMEIROS 3 MINUTOS, e só enquanto o pedido está "aguardando aceite".',
      'No acompanhamento do pedido, aparece um botão "✖ Cancelar pedido" com uma contagem de segundos.',
      'Depois desse prazo, ou depois que o restaurante aceitou, o cancelamento passa a ser com o restaurante — ligue para eles.' ]},

    { t:'🍽️ Pedido na mesa (QR Code)', itens:[
      'Aponte a câmera do celular para o QR Code que está na mesa.',
      'O cardápio abre já identificando a sua mesa ("Você está na Mesa X" no topo).',
      'Escolha os itens e envie. O restaurante vai CONFIRMAR antes de preparar. Você pode fazer mais de um pedido pela mesma mesa.',
      'O pagamento é feito no caixa, no final.',
      'Se precisar de ajuda, toque em "🔔 Chamar garçom". Se quiser fechar a conta, toque em "🧾 Pedir a conta".' ],
      comuns:['Se a mesa já pediu a conta, não dá para fazer novos pedidos por ali — chame o garçom.',
        'O cliente pode cancelar um pedido pelo celular enquanto o restaurante não aceitou.'] },

    { t:'💬 Balão de atendimento', itens:[
      'No canto da tela tem um botão redondo com o rosto do ' + ASSISTENTE_ + ', o atendente virtual. Toque para conversar.',
      'O atendente virtual (IA) responde dúvidas do cardápio, ingredientes, preços, combos, promoções e formas de pagamento, e sugere o que pedir.',
      'Para saber do seu pedido, ele pede o seu celular (o mesmo do pedido) e mostra o andamento. O número não fica salvo.',
      'Se for um problema (atraso, item errado ou faltando, cobrança), ou se você preferir uma pessoa, toque em "Falar com a equipe".',
      'Ele só fala da ' + NOME_RESTAURANTE_ + ' e não faz o pedido por você: monte o pedido no cardápio. Se a IA ficar indisponível, o botão da equipe continua funcionando.' ]},

    { t:'🔔 Avisos do pedido no celular', itens:[
      'Na primeira vez que você abre o cardápio, aparece no topo "🔔 Avisos do seu pedido". Toque em "Quero receber" e permita as notificações.',
      'Depois, a cada pedido você recebe no celular: confirmado (em preparo), pronto para retirar, saiu para entrega e entregue. Funciona mesmo com o site fechado.',
      'Uns 30 minutos depois da entrega chega "⭐ Como foi seu pedido?". Toque para dar uma nota.',
      'Tocou em "Agora não"? O convite aparece mais uma vez no cartão "Pedido enviado".',
      'No iPhone, os avisos só funcionam com o app instalado: Compartilhar → "Adicionar à Tela de Início", e abra o app por esse ícone.' ],
      comuns:['Se as notificações foram bloqueadas, libere nas configurações do navegador → permissões do site → Notificações.',
        'Sem os avisos, o status continua em "📦 Acompanhe seu pedido", no rodapé.'] },

    { t:'💬 Deixar um feedback', itens:[
      'No rodapé, toque em "💬 Deixar um feedback".',
      'Dê uma nota em estrelas (1 a 5) e escreva o que quiser: elogio, sugestão ou reclamação.',
      'Também dá pelo aviso "Como foi seu pedido?" ou pelo ' + ASSISTENTE_ + ', o atendente virtual: quando você elogia ou dá uma sugestão, ele oferece "⭐ Registrar como feedback".',
      'É opcional deixar nome e telefone — mas se deixar, a gente consegue te responder.',
      'Com a sua conta (👤 Entrar), cada pedido em Minha conta › Pedidos tem o botão "⭐ Feedback". O feedback fica ligado àquele pedido e, quando o restaurante responder, a resposta aparece ali mesmo, no pedido. Sem conta, o botão do rodapé continua funcionando.' ]},

    { t:'📲 Instalar o app na tela inicial', passos:[
      'No rodapé, toque em "📲 Instalar app".',
      'Android (Chrome): aparece "Instalar app". Se não aparecer, use o menu ⋮ → "Instalar app" ou "Adicionar à tela inicial".',
      'iPhone (Safari): Compartilhar (quadrado com seta) → "Adicionar à Tela de Início".',
      'Também há o convite “📲 Instalar app” no cartão “Pedido enviado”, logo depois de pedir (some se o app já estiver instalado).',
      'Depois de instalado, o app abre em tela cheia, mais rápido e com ícone próprio.' ],
      comuns:['Se o convite apareceu e você tocou em "Agora não", ele volta depois de 7 dias.',
        'No iPhone, só funciona pelo Safari.'] },

    { t:'🔳 QR Code do app', itens:[
      'No rodapé, toque em "🔳 QR Code do app".',
      'Aparece um QR Code e um link. Você pode copiar o link, compartilhar ou baixar a imagem.',
      'Mande para um amigo: ele aponta a câmera e abre o cardápio no celular dele.' ]},

    { t:'🔒 O que fazemos com seus dados', itens:[
      'Nome e telefone só são usados para preparar e entregar seu pedido.',
      'Só enviamos novidades e promoções se você marcar essa opção ao criar a conta (e pode desmarcar quando quiser). Não vendemos seus dados.',
      'Sem conta, seus pedidos ficam salvos no SEU navegador (para você poder acompanhar). Com conta, ficam também na sua conta.',
      'O Aviso de Privacidade completo está no rodapé do cardápio (🔒 Privacidade).',
      'Para apagar seus dados, fale com o restaurante pelo balão de atendimento.' ]}
  ],
  erros:[
    { q:'Meu pedido não aparece no acompanhamento', a:'O acompanhamento funciona no MESMO navegador em que você fez o pedido. Se você limpou o histórico, mudou de aparelho ou navegador, o link se perde — mas o restaurante continua com seu pedido. Ligue para eles.' },
    { q:'Fechei a página antes de enviar', a:'Se você não chegou a tocar em "Enviar pedido", o pedido NÃO foi feito. Abra o cardápio de novo e refaça.' },
    { q:'Não consigo cancelar meu pedido', a:'Só dá para cancelar nos primeiros 3 minutos e enquanto o restaurante ainda não aceitou. Passou disso, ligue para o restaurante.' },
    { q:'O cupom diz que é para quem tem conta', a:'Alguns cupons só valem para quem entrou com o Google. Toque em "👤 Entrar", entre e tente de novo. Cupons de boas-vindas, aniversário e indicação aparecem em Minha conta → Cupons.' },
    { q:'Entrei com o Google mas não vejo meu histórico', a:'O histórico e o cartão fidelidade de antes se juntam à conta depois do seu primeiro pedido concluído (entregue ou retirado) feito com ela.' },
    { q:'O cupom não funcionou', a:'Confira se o código está certo, se ainda está dentro do prazo e se o valor do pedido atinge o mínimo. A mensagem de erro diz o motivo.' },
    { q:'O WhatsApp não abriu sozinho', a:'Alguns navegadores bloqueiam a abertura automática. Toque no botão verde "📲 Enviar pedido pelo WhatsApp" na tela de confirmação. Isso NÃO afeta o pedido — ele já foi enviado.' },
    { q:'O app não instalou', a:'Android: use o Chrome. iPhone: use o Safari. Se ainda não aparecer o convite, use o menu do navegador ("Adicionar à tela inicial").' },
    { q:'Estou fechado e não consigo pedir', a:'Quando o restaurante está fechado, o cardápio mostra "Estamos fechados no momento" e não aceita pedidos.' }
  ]
};

function ajudaClienteHtml_(){
  const m = MANUAL_AJUDA_CLIENTE_;
  const li = a => a.map(x=>'<li>'+escH(x)+'</li>').join('');
  let h = '<p class="sub">Guia rápido para pedir pelo cardápio. Toque num título para abrir.</p>';
  h += novidadesHtml_('Cliente');
  m.secoes.forEach((s,i)=>{
    h += '<details class="ajuda-det"><summary>'+escH(s.t)+'</summary>';
    if(s.passos) h += '<ol>'+li(s.passos)+'</ol>';
    if(s.itens)  h += '<ul>'+li(s.itens)+'</ul>';
    if(s.comuns) h += '<div class="ajuda-comuns"><b>Detalhes</b>'+s.comuns.map(x=>'<div>• '+escH(x)+'</div>').join('')+'</div>';
    if(s.prints) h += ajudaPrintsHtml_(s.prints);
    h += '</details>';
  });
  h += '<h3 class="ajuda-erro-tit">🆘 E se der errado?</h3>';
  m.erros.forEach(e=>{ h += '<details class="ajuda-erro"><summary>'+escH(e.q)+'</summary><p>'+escH(e.a)+'</p></details>'; });
  h += ajudaRodapeVersao_();
  h += '<button class="primary mt-3" onclick="fecharAjudaCliente()">Fechar</button>';
  return h;
}
function abrirAjudaCliente(){
  let m = document.getElementById('ajudaClienteModal');
  if(!m){
    m = document.createElement('div');
    m.className = 'modal-overlay';
    m.id = 'ajudaClienteModal';
    m.setAttribute('onclick', "if(event.target===this) fecharAjudaCliente()");
    m.innerHTML = '<div class="modal-box" style="max-width:560px;">' +
      '<div class="modal-header"><h2>❓ Como pedir / Ajuda</h2><button class="close-btn" type="button" onclick="fecharAjudaCliente()" aria-label="Fechar">✕</button></div>' +
      '<div id="ajudaClienteConteudo"></div></div>';
    document.body.appendChild(m);
  }
  document.getElementById('ajudaClienteConteudo').innerHTML = ajudaClienteHtml_();
  m.classList.add('open');
}
function fecharAjudaCliente(){
  const m = document.getElementById('ajudaClienteModal');
  if(m) m.classList.remove('open');
}

/* Prints reais de "onde clicar": imagem do celular e do PC (WebP leve), carregadas só quando a seção é aberta (loading=lazy).
   Cada print traz legenda e texto alternativo; os números nas imagens são os do passo a passo. Roteiro para refazer: ajuda-prints/ROTEIRO_DE_CAPTURA.md (no pacote de auditoria). */
function ajudaPrintsHtml_(lista){
  return '';   // os prints de ajuda são de cada restaurante: este modelo ainda não traz imagens
  return '<div class="ajuda-prints">' + lista.map(p =>
    '<figure class="ajuda-print"><picture>' +
    '<source media="(min-width:900px)" srcset="ajuda-prints/' + escH(p.id) + '-pc.webp">' +
    '<img src="ajuda-prints/' + escH(p.id) + '-cel.webp" alt="' + escH(p.alt) + '" loading="lazy" decoding="async">' +
    '</picture><figcaption>' + escH(p.leg) + '</figcaption></figure>').join('') + '</div>';
}

/* Busca dentro da Ajuda: mostra só as seções (e erros) que têm o texto digitado, sem acento e sem diferenciar maiúscula; abre a primeira que casar. */
function ajudaFiltrar_(q){
  const norm = t => String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const t = norm(q).trim(), box = document.getElementById('ajudaConteudo'); if(!box) return;
  let primeira = true;
  box.querySelectorAll('details.ajuda-det, details.ajuda-erro').forEach(d=>{
    const ok = !t || norm(d.textContent).includes(t);
    d.style.display = ok ? '' : 'none';
    if(t && ok && primeira && d.classList.contains('ajuda-det')){ d.open = true; primeira = false; }
  });
  const tit = box.querySelector('.ajuda-erro-tit'); if(tit) tit.style.display = (!t || [...box.querySelectorAll('details.ajuda-erro')].some(d=>d.style.display!=='none')) ? '' : 'none';
}
window.ajudaFiltrar_ = ajudaFiltrar_;

function ajudaHtml_(p){
  const m = MANUAL_AJUDA_[p] || MANUAL_AJUDA_.Operador;
  const li = a => a.map(x=>'<li>'+escH(x)+'</li>').join('');
  const ehDev = !!(currentUser && currentUser.nivelReal === 'Desenvolvedor');
  const ehMudou = s => /^\s*🆕\s*O que mudou/i.test(String(s && s.t || ''));
  const secoes = m.secoes.filter(s => !ehMudou(s) && (!s.soDev || ehDev));

  let h = '<p class="sub">Manual do perfil <b>' + escH(m.nome) + '</b>.' +
    (ehDev ? ' <span style="opacity:.75;">(comandos de Desenvolvedor inclusos)</span>' : '') +
    ' Toque num título para abrir.</p>';
  h += '<input type="search" id="ajudaBusca" placeholder="Buscar na Ajuda (ex.: caixa, entrega, nota)" autocomplete="off" aria-label="Buscar na Ajuda" oninput="ajudaFiltrar_(this.value)" style="margin:6px 0 4px;">';
  h += novidadesHtml_(p);
  secoes.forEach((s,i)=>{
    h += '<details class="ajuda-det"><summary>'+escH(s.t)+'</summary>';
    if(s.passos) h += '<ol>'+li(s.passos)+'</ol>';
    if(s.itens)  h += '<ul>'+li(s.itens)+'</ul>';
    if(s.comuns) h += '<div class="ajuda-comuns"><b>Erros comuns</b>'+s.comuns.map(x=>'<div>• '+escH(x)+'</div>').join('')+'</div>';
    if(s.prints) h += ajudaPrintsHtml_(s.prints);
    h += '</details>';
  });
  h += '<h3 class="ajuda-erro-tit">🆘 E se der errado?</h3>';
  m.erros.forEach(e=>{ h += '<details class="ajuda-erro"><summary>'+escH(e.q)+'</summary><p>'+escH(e.a)+'</p></details>'; });
  h += ajudaRodapeVersao_();
  return h;
}

/* ===================== AUTO-TESTE DA AJUDA =====================
   Valida os 6 manuais sem abrir nada na tela: gera o HTML de cada um e confere
   que o rodapé de versão, o bloco de novidades e as seções específicas estão presentes.
   Simula o perfil via currentUser (restaura ao final). Nunca toca em dado real.
   Uso: testarAjuda_() no console, ou "testar ajuda" no balão (Desenvolvedor). */
function testarAjuda_(){
  if(!currentUser){ console.warn('testarAjuda_: entre no sistema primeiro.'); return { ok:false, resumo:'Sem usuário logado.' }; }

  const snap = { nivel: currentUser.nivel, nivelReal: currentUser.nivelReal, verComo: currentUser.verComo };
  const resultados = [];
  const restaurar = () => { currentUser.nivel = snap.nivel; currentUser.nivelReal = snap.nivelReal; currentUser.verComo = snap.verComo; };

  const rodar = (rotulo, perfilManual, ehDevFake) => {
    const problemas = [];
    let html = '';
    currentUser.nivel = perfilManual;
    currentUser.nivelReal = ehDevFake ? 'Desenvolvedor' : perfilManual;
    currentUser.verComo = '';
    try{
      html = (perfilManual === 'Cliente') ? ajudaClienteHtml_() : ajudaHtml_(perfilManual);
    }catch(e){
      problemas.push('erro ao gerar: ' + ((e && e.message) || e));
    }

    if(!html){ problemas.push('html vazio'); }
    else{
      if(!/ · (<b>)?(v-|\d)/.test(html)) problemas.push('rodapé de versão ausente');
      if(!/🆕 O que mudou/.test(html))    problemas.push('bloco de novidades ausente');
      if(perfilManual === 'Admin' && ehDevFake){
        if(!/🛠️ Desenvolvedor \(exclusivo\)/.test(html)) problemas.push('seção Desenvolvedor ausente para Dev');
      }
      if(perfilManual === 'Admin' && !ehDevFake){
        if(/🛠️ Desenvolvedor \(exclusivo\)/.test(html)) problemas.push('seção Desenvolvedor aparecendo para Admin comum');
      }
      if(perfilManual === 'Operador'){
        if(!/O que você tem em Administrador/.test(html)) problemas.push('seção "O que você tem em Administrador" ausente');
      }
      if(perfilManual === 'Cliente'){
        if(!/Como fazer um pedido/.test(html)) problemas.push('manual do cliente sem "Como fazer um pedido"');
        if(!/Acompanhar seu pedido/.test(html)) problemas.push('manual do cliente sem "Acompanhar seu pedido"');
      }
    }
    resultados.push({ rotulo: rotulo || perfilManual, ok: !problemas.length, problemas });
  };

  try{
    rodar('Admin (comum)',      'Admin',      false);
    rodar('Admin (como Dev)',   'Admin',      true);
    rodar('Operador',           'Operador',   false);
    rodar('Garçom',             'Garçom',     false);
    rodar('Cozinha',            'Cozinha',    false);
    rodar('Entregador',         'Entregador', false);
    rodar('Cliente (cardápio)', 'Cliente',    false);
  } finally { restaurar(); }

  const total  = resultados.length;
  const falhas = resultados.filter(r => !r.ok).length;
  const linhas = resultados.map(r =>
    (r.ok ? '✅' : '❌') + ' ' + r.rotulo + (r.ok ? ' — ok' : ' — ' + r.problemas.join('; '))
  ).join('\n');
  const resumo = falhas === 0
    ? '✅ Auto-teste da Ajuda: ' + total + ' manuais, tudo ok.'
    : '❌ Auto-teste da Ajuda: ' + falhas + ' de ' + total + ' com problema.';

  console.log(resumo + '\n' + linhas);
  return { ok: falhas === 0, resumo, linhas, total, falhas, resultados };
}
window.testarAjuda_ = testarAjuda_;

function abrirAjuda(){
  const nivel = (currentUser && currentUser.nivel) || 'Operador';
  const m = MANUAL_AJUDA_[nivel] || MANUAL_AJUDA_.Operador;
  document.getElementById('ajudaTitulo').textContent = 'Ajuda — '+m.nome;
  document.getElementById('ajudaConteudo').innerHTML = '<div id="ajudaAppEquipe"></div>' + ajudaHtml_(nivel);
  document.getElementById('ajudaModal').classList.add('open');
  appEquipeCartao_();
}
/* App da equipe (Android): só aparece para a equipe, no Android, e só se o arquivo downloads/texas-equipe.apk estiver publicado.
   Nenhum link disso existe no cardápio do cliente. Dentro do próprio app da equipe o cartão não aparece. */
async function appEquipeCartao_(){
  try{
    const box = document.getElementById('ajudaAppEquipe'); if(!box) return;
    if(!/android/i.test(navigator.userAgent || '')) return;
    if(String(document.referrer || '').indexOf('android-app://') === 0) return;
    const r = await fetch('downloads/texas-equipe.apk', { method:'HEAD', cache:'no-store' });
    if(!r || !r.ok) return;
    box.innerHTML = '<div class="card" style="margin:0 0 12px;"><h3 style="margin:0 0 4px;">📲 App da equipe (Android)</h3>'
      + '<p class="sub" style="margin:0 0 8px;">Instala como um app de verdade, com ícone e tela cheia. Só para a equipe.</p>'
      + '<a class="small-gold" style="display:block;text-align:center;padding:10px;text-decoration:none;" href="downloads/texas-equipe.apk" download>Baixar o app da equipe</a>'
      + '<p class="obs-line" style="margin:8px 0 0;">Depois de baixar, abra o arquivo e toque em Instalar. Se o Android pedir, permita instalar apps desta fonte.</p></div>';
  }catch(e){}
}
function fecharAjuda(){ document.getElementById('ajudaModal').classList.remove('open'); }

function abrirCalculadora(){ calcExpr=''; document.getElementById('calcDisplay').textContent='0'; document.getElementById('calcModal').classList.add('open'); }
function fecharCalculadora(){ document.getElementById('calcModal').classList.remove('open'); }
function calcInput(v){ calcExpr += v; document.getElementById('calcDisplay').textContent = calcExpr; }
function calcClear(){ calcExpr=''; document.getElementById('calcDisplay').textContent='0'; }
function calcBackspace(){ calcExpr = calcExpr.slice(0,-1); document.getElementById('calcDisplay').textContent = calcExpr || '0'; }
function calcEquals(){
  if(!/^[0-9+\-*/.\s]+$/.test(calcExpr)){ document.getElementById('calcDisplay').textContent = 'Erro'; calcExpr=''; return; }
  try{ const resultado = Function('"use strict";return ('+calcExpr+')')(); document.getElementById('calcDisplay').textContent = String(Math.round(resultado*100)/100); calcExpr = String(resultado); }
  catch(e){ document.getElementById('calcDisplay').textContent = 'Erro'; calcExpr=''; }
}

/* ============================================================
   FINANCEIRO
   ============================================================ */
/* "09/10 às 19:43" no horário de Brasília */
function fmtDiaHoraBr_(iso){
  const d = new Date(iso); if(isNaN(d)) return String(iso||'');
  const p = Object.fromEntries(new Intl.DateTimeFormat('pt-BR', { timeZone:'America/Sao_Paulo', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false }).formatToParts(d).map(x=>[x.type, x.value]));
  return p.day + '/' + p.month + ' às ' + p.hour + ':' + p.minute;
}
function formatarDataHoraISO(iso){
  if(!iso) return null;
  const d = new Date(iso);
  return Utilities_formatarDataBR(d);
}
function Utilities_formatarDataBR(d){
  const pad = n=>String(n).padStart(2,'0');
  return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()+' '+pad(d.getHours())+':'+pad(d.getMinutes());
}
