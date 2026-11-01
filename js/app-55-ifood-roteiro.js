/* ============================================================================================================
   iFood · ROTEIRO DE HOMOLOGAÇÃO POR MÓDULO — Integrações › iFood › "📋 Roteiro de homologação"
   Para cada módulo: o que fazer no sistema, o que mostrar/anotar para o iFood e se o módulo já respondeu OK (vindo do "Estado dos módulos").
   As caixinhas marcadas ficam só neste aparelho (conveniência); o que vale é o estado real dos módulos.
   Não envia nada ao iFood: é só um guia para quem está fazendo a homologação.
   ============================================================================================================ */
(function(){
  'use strict';
  const ROTEIRO = [
    { mod:'authentication', nome:'Acesso (token)', quem:'Dono', passos:[
      'Digite Client ID, Client Secret e Merchant ID em Integrações › iFood e toque em "Testar conexão".',
      'Aplicativo CENTRALIZADO (categoria Food), de servidor. O token é renovado só ao vencer.' ],
      mostrar:['Conexão testada com sucesso (mensagem verde).'] },
    { mod:'events', nome:'Eventos (polling)', quem:'Dono', passos:[
      'Com a integração ligada, o sistema consulta os eventos a cada 30 segundos e confirma (ack) os que processou.',
      'Gere um pedido de teste no Portal do Parceiro (Testes › Gerar pedido de teste) e veja ele chegar em Pedidos.',
      'Dica: um pedido alterado, um cancelamento do cliente e uma devolução geram avisos em Integrações › iFood › Avisos.' ],
      mostrar:['Pedido de teste chegando sozinho em até 30 s.','Tela Avisos com os eventos recebidos.'] },
    { mod:'order', nome:'Pedidos', quem:'Operador/Admin', passos:[
      'Confirmar o pedido (automático ou pelo botão) em até ~8 minutos, iniciar preparo, marcar pronto e despachar.',
      'Cancelar um pedido de teste escolhendo um MOTIVO OFICIAL do iFood (lista com borda dourada).',
      'Mostrar o código localizador do cliente (telefone 0800), o cartão/forma de pagamento, descontos e quem pagou o cupom.',
      'Código do entregador (coleta) e código de entrega: digitar quando o aviso "🔐 O iFood precisa de um código" aparecer.',
      'Pedido agendado e pedido para retirar: conferir o horário no pedido e na comanda.' ],
      mostrar:['Pedido completo com itens, valores e pagamento.','Cancelamento com motivo oficial.','Código de entrega aceito.'] },
    { mod:'merchant', nome:'Loja (aberta/fechada, horário)', quem:'Admin', passos:[
      'Em "Loja no iFood": ver se a loja está aberta, pausar e retomar por um tempo, e fechar/abrir.',
      'Em "Horário da loja": ler o horário do iFood, ajustar e enviar. Horário que passa da meia-noite (18h às 2h) é aceito.',
      'Interrupção programada: pausar com data e hora de volta.' ],
      mostrar:['Estado da loja trocando de aberta para pausada e de volta.','Horário enviado e relido.'] },
    { mod:'catalog', nome:'Cardápio no iFood', quem:'Admin', passos:[
      'Importar o cardápio do iFood, ligar cada item a um produto do sistema.',
      'Criar categoria, item (preço maior que zero), grupo de complementos (tipo certo) e complementos; enviar e conferir "enviado".',
      'Alterar preço de um item e pausar/retomar item e complemento (também em lote).',
      'Criar um combo (primeiro grupo = item principal).',
      'Botão Diagnóstico: itens que o iFood não mostra no app, com o motivo e o que fazer.' ],
      mostrar:['Item criado e visível no app de teste.','Preço alterado.','Diagnóstico sem erros ou com a explicação.'] },
    { mod:'review', nome:'Avaliações', quem:'Admin', passos:[
      'Em Avaliações: ver nota, comentário e prazo; responder uma avaliação (10 a 300 letras, pede a senha).',
      'Conferir que a resposta aparece como aceita pelo iFood.' ],
      mostrar:['Lista de avaliações.','Resposta enviada e aceita.'] },
    { mod:'financial', nome:'Financeiro', quem:'Admin', passos:[
      'Em Dinheiro › "iFood: vendas e repasses": vendas com comissão e taxas, lançamentos, repasses e antecipação.',
      'Conferir a semana: lançamentos × repasse.' ],
      mostrar:['Tela de vendas e repasses com dados do período.'] },
    { mod:'shipping', nome:'Entrega sob demanda (Shipping)', quem:'Admin', passos:[
      'Contrate o serviço Sob Demanda no Portal do Parceiro e ligue em Integrações › iFood › Entregador do iFood.',
      'Pedido do iFood com entrega própria: pedir cotação, chamar o entregador (pede a senha), acompanhar e cancelar.',
      'Pedido de fora do iFood: endereço completo + CEP + latitude/longitude, cotação, criar pedido, link de rastreio, código de 4 dígitos, nível de confiança.',
      'Pedido PAGO não leva forma de pagamento; pedido a pagar na entrega leva dinheiro (com troco) ou cartão.',
      'Troca de endereço pedida pelo cliente: aceitar ou negar em até 15 minutos.' ],
      mostrar:['Cotação com valor e tempo.','Entregador alocado e rastreio.','Cancelamento com motivo do iFood.'] },
    { mod:'analytics', nome:'Indicadores (Analytics)', quem:'Dono', passos:[
      'Crie um SEGUNDO aplicativo no Portal do Desenvolvedor, categoria BI, e digite o Client ID e o Secret em Integrações › iFood.',
      'Marque "Indicadores em modo teste de homologação" (ajuste) para usar a loja de teste e buscar números de exemplo.',
      'Em Indicadores: buscar o período, ler faturamento, pedidos concluídos e cancelados (GMV = produtos + entrega; sem entrega = só produtos).',
      'No assistente do iFood, guarde o retorno para informar: totalItems, totalPages, quantidade de registros, GMV e contagem de concluídos/cancelados.',
      'Desmarque o modo teste depois da aprovação. O iFood permite uma homologação por aplicativo a cada 4 horas.' ],
      mostrar:['Tela com o aviso "dados até ontem (D-1)".','Seletor de período funcionando.','Erros claros quando o iFood recusa.'] }
  ];
  const chave = m => 'txbRoteiro_' + m;
  const lerMarcas = m => { try{ return JSON.parse(localStorage.getItem(chave(m)) || '[]'); }catch(e){ return []; } };
  const gravarMarcas = (m, a) => { try{ localStorage.setItem(chave(m), JSON.stringify(a)); }catch(e){} };

  window.carregarIfoodRoteiro_ = async function(){
    const box = document.getElementById('ifoodRoteiro'); if(!box) return;
    box.innerHTML = '<div class="obs-line">⏳ Carregando…</div>';
    let estado = {}, erro = '';
    try{
      const r = await apiCall('ifoodModulos', {});
      if(r && r.ok) (r.modulos||[]).forEach(m=>{ estado[m.modulo] = m; });
      else erro = (r && r.message) || 'Não foi possível ler o estado dos módulos (o roteiro continua valendo).';
    }catch(e){ erro = 'Sem conexão para ler o estado dos módulos (o roteiro continua valendo).'; }
    const sit = m => { const e = estado[m]; if(!e) return '⚪ sem registro ainda'; const st = Number(e.status)||0; return st === 200 ? '🟢 respondeu OK' : st === 403 ? '🔴 não liberado para o app (403)' : st === 401 ? '🔴 credenciais recusadas (401)' : '🟠 erro' + (st ? ' ('+st+')' : ''); };
    box.innerHTML = '<div class="notif-card"><b>📋 Roteiro de homologação por módulo</b>'
      + '<p class="sub fs-xs" style="margin:4px 0 8px;">Siga na ordem. Cada módulo mostra o que fazer, o que mostrar ao iFood e se já respondeu OK. As caixinhas ficam só neste aparelho.</p>'
      + (erro ? '<div class="msg warn" role="alert" style="display:block;">⚠️ ' + escH(erro) + '</div>' : '')
      + ROTEIRO.map(R=>{
          const marcas = lerMarcas(R.mod);
          return '<details style="margin:6px 0;"><summary><b>' + escH(R.nome) + '</b> · ' + sit(R.mod) + ' · quem faz: ' + escH(R.quem) + '</summary>'
            + '<div class="obs-line"><b>O que fazer</b></div>'
            + R.passos.map((p,i)=>'<label class="obs-line" style="display:block;"><input type="checkbox" ' + (marcas.includes(i)?'checked':'') + ' onchange="roteiroMarcar_(\'' + R.mod + '\',' + i + ',this.checked)"> ' + escH(p) + '</label>').join('')
            + '<div class="obs-line"><b>O que mostrar/anotar para o iFood</b></div>'
            + R.mostrar.map(p=>'<div class="obs-line">📸 ' + escH(p) + '</div>').join('')
            + '</details>';
        }).join('')
      + '<div class="btnrow mt-2"><button class="ghost" type="button" onclick="carregarIfoodRoteiro_()">🔄 Atualizar</button></div></div>';
  };
  window.roteiroMarcar_ = function(mod, i, on){
    const a = lerMarcas(mod).filter(x=>x!==i); if(on) a.push(i); gravarMarcas(mod, a);
  };

  const extraOrig = window.ifoodExtraHtml_;
  if(typeof extraOrig === 'function' && !extraOrig.__rot){
    const novo = function(it, parte){
      let h = extraOrig.apply(this, arguments);
      if(parte !== 'setup' && typeof h === 'string' && h.indexOf('id="ifoodRoteiro"') === -1){
        h = h.replace('<div class="btnrow">', '<div class="btnrow"><button class="ghost" onclick="carregarIfoodRoteiro_()">📋 Roteiro de homologação</button>');
        h = h.replace('<div id="ifoodLoja"></div>', '<div id="ifoodRoteiro"></div><div id="ifoodLoja"></div>');
      }
      return h;
    };
    novo.__rot = true; window.ifoodExtraHtml_ = novo;
  }
})();
