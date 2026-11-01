/* =====================================================================
   RAIO-X DO NEGÓCIO (v1.25) — Administrador → Vendas e cardápio → "Raio-X do negócio"
   Tudo vem de dados que o sistema já guardava (api_raio_x, só Admin):
   • Quando vendem mais: calor dia × hora e média de pedidos por noite (depois da meia-noite conta na noite anterior)
   • iFood × seu cardápio: pedidos, valor médio, quem voltou e comissão/taxas
   • Clientes fiéis do iFood (o iFood informa quantas vezes cada cliente já comprou da loja)
   • Tempos de cada etapa: geral, por horário, por entregador e por turno
   • Cancelamentos (testes ficam de fora), pedidos que ficaram parados, custos de fornecedor que mudaram, perdas reais × estimadas
   Também aqui: "🗑️ Perdi um produto pronto" (Estoque), que baixa a receita inteira como Perda (api_registrar_perda_produto).
   ===================================================================== */
(function(){
  'use strict';
  const DIAS_ = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const DIAS_LONGO_ = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const ORDEM_DIAS_ = [1, 2, 3, 4, 5, 6, 0];
  const PARADOS_ = { recebido:'Esperando aceitar', preparo:'Demorando no preparo', pronta_entrega:'Pronto esperando o entregador', saiu:'Demorando na rua', pronta_retirada:'Pronto esperando o cliente buscar', a_receber:'Entregue e ainda não recebido' };
  let dados = null;
  const $ = id => document.getElementById(id);
  const e_ = s => (typeof escH === 'function' ? escH(s) : String(s == null ? '' : s));
  const R$ = v => (typeof formatarMoeda === 'function' ? formatarMoeda(v) : 'R$ ' + (Number(v) || 0).toFixed(2)).replace(/ /g, ' ');
  const iso_ = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const dataBR_ = s => { try{ return new Date(String(s).length <= 10 ? s + 'T12:00:00' : s).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' }); }catch(e){ return ''; } };
  const hora_ = h => String(h).padStart(2, '0') + 'h';
  const erroHtml_ = m => '<div class="msg warn" role="alert" style="display:block;">⚠️ ' + e_(m) + '</div>';

  /* barra no estilo "Uso do espaço": título, "X de Y · %" e a barra */
  function barra_(rotulo, n, total, txt, cor){
    const pct = total > 0 ? Math.round(n / total * 100) : 0;
    return '<div class="rx-barra"><div class="rx-barra-t"><span>' + rotulo + '</span><b>' + (txt != null ? txt : (n + ' de ' + total + ' <span class="txt-muted" style="font-weight:400;">· ' + pct + '%</span>')) + '</b></div>'
      + '<div class="rx-trilho"><div style="width:' + Math.max(0, Math.min(100, pct)) + '%;' + (cor ? 'background:' + cor + ';' : '') + '"></div></div></div>';
  }
  function secao_(titulo, corpo, sub){ return '<div class="rx-secao"><h3>' + titulo + '</h3>' + (sub ? '<p class="sub fs-xs" style="margin:0 0 6px;">' + sub + '</p>' : '') + corpo + '</div>'; }

  /* ---------- 1) quando vendem mais ---------- */
  function calorHtml_(r){
    const c = r.calor || [], ds = r.diasSemana || {};
    if(!c.length) return secao_('🔥 Quando vendem mais', '<div class="obs-line">Nenhuma venda no período.</div>');
    const mapa = {}, porDia = {}, porHora = {};
    let mx = 1;
    c.forEach(x => { mapa[x.d + '_' + x.h] = x.n; porDia[x.d] = (porDia[x.d] || 0) + x.n; porHora[x.h] = (porHora[x.h] || 0) + x.n; mx = Math.max(mx, x.n); });
    const horas = Object.keys(porHora).map(Number).sort((a, b) => ((a + 18) % 24) - ((b + 18) % 24));
    let g = '<div class="rx-calor-wrap"><table class="rx-calor" role="grid" aria-label="Pedidos por dia da semana e hora"><thead><tr><th></th>' + horas.map(h => '<th>' + String(h).padStart(2, '0') + '</th>').join('') + '</tr></thead><tbody>';
    ORDEM_DIAS_.forEach(d => {
      g += '<tr><th>' + DIAS_[d] + '</th>' + horas.map(h => { const n = mapa[d + '_' + h] || 0, a = n ? (0.18 + 0.82 * n / mx) : 0;
        return '<td title="' + DIAS_LONGO_[d] + ' ' + hora_(h) + ': ' + n + ' pedido(s)" style="' + (n ? 'background:rgba(217,162,27,' + a.toFixed(2) + ');' : '') + '">' + (n || '') + '</td>'; }).join('') + '</tr>';
    });
    g += '</tbody></table></div><p class="sub fs-xs" style="margin:4px 0 10px;">Quanto mais forte a cor, mais pedidos. Pedidos depois da meia-noite contam na noite do dia anterior.</p>';
    /* média por noite de cada dia da semana */
    const medias = ORDEM_DIAS_.map(d => ({ d, m: (porDia[d] || 0) / Math.max(1, Number(ds[d]) || 0), n: porDia[d] || 0 }));
    const mm = Math.max(0.01, ...medias.map(x => x.m));
    g += '<div class="sub" style="margin:4px 0 2px;"><b>Média de pedidos por noite</b></div>'
      + medias.map(x => barra_(DIAS_LONGO_[x.d], x.m, mm, x.m.toFixed(1).replace('.', ',') + ' <span class="txt-muted" style="font-weight:400;">· ' + x.n + ' no período</span>')).join('');
    const comVenda = medias.filter(x => Number(ds[x.d]) > 0), fraco = comVenda.slice().sort((a, b) => a.m - b.m)[0], forte = comVenda.slice().sort((a, b) => b.m - a.m)[0];
    const top = Object.keys(porHora).map(Number).sort((a, b) => porHora[b] - porHora[a]).slice(0, 3).sort((a, b) => ((a + 18) % 24) - ((b + 18) % 24));
    if(fraco && forte && forte.m > 0){
      g += '<div class="rx-dica">💡 <b>' + DIAS_LONGO_[forte.d] + '</b> é o dia mais forte e <b>' + DIAS_LONGO_[fraco.d] + '</b> o mais fraco (' + fraco.m.toFixed(1).replace('.', ',') + ' pedido(s) por noite). '
        + 'Os horários de mais movimento são ' + top.map(hora_).join(', ') + '. Uma promoção só no dia fraco ajuda a encher a semana; a escala pode reforçar os horários de pico.</div>';
    }
    return secao_('🔥 Quando vendem mais', g);
  }

  /* ---------- 2) iFood × seu cardápio ---------- */
  function canaisHtml_(r){
    const c = r.canais || {}, i = c.ifood || {}, p = c.proprio || {};
    if(!i.pedidos && !p.pedidos) return '';
    const col = (tit, x, ehIfood) => {
      if(!x.pedidos) return '<div class="rx-col"><h4>' + tit + '</h4><div class="obs-line">Sem pedidos no período.</div></div>';
      return '<div class="rx-col"><h4>' + tit + '</h4>'
        + '<div class="rx-num"><span>Pedidos</span><b>' + x.pedidos + '</b></div>'
        + '<div class="rx-num"><span>Vendido</span><b>' + R$(x.total) + '</b></div>'
        + '<div class="rx-num"><span>Valor médio</span><b>' + R$(x.ticket) + '</b></div>'
        + '<div class="rx-num"><span>' + (ehIfood ? 'Comissão do iFood (aprox.)' : 'Taxas da maquininha') + '</span><b>' + R$(x.taxas) + '</b></div>'
        + barra_('Clientes que voltaram', x.voltaram || 0, x.clientes || 0) + '</div>';
    };
    let h = '<div class="rx-cols">' + col('🛵 iFood', i, true) + col('🍔 Seu sistema', p, false) + '</div>';
    const vi = i.clientes ? i.voltaram / i.clientes : 0, vp = p.clientes ? p.voltaram / p.clientes : 0;
    if(i.pedidos && p.pedidos){
      h += '<div class="rx-dica">💡 ' + (vp > vi ? 'Quem pede pelo seu sistema volta mais (' + Math.round(vp * 100) + '% contra ' + Math.round(vi * 100) + '% no iFood). ' : '')
        + (Number(i.taxas) > 0 ? 'No período, cerca de <b>' + R$(i.taxas) + '</b> ficaram com o iFood. Cada cliente que passa a pedir direto pelo seu cardápio economiza essa comissão.' : '') + '</div>';
    }
    return secao_('🛵 iFood × seu cardápio', h, '"Seu sistema" junta cardápio próprio, balcão e mesa. "Voltaram" = clientes do período que já fizeram mais de um pedido. A comissão do iFood usa o valor real quando existe e, nas vendas antigas, a taxa cadastrada em Formas de pagamento.');
  }

  /* ---------- 3) clientes fiéis do iFood ---------- */
  function fieisHtml_(r){
    const f = r.fieisIfood || [];
    if(!Number(r.ifoodClientesTotal)) return '';
    let h = f.length ? f.map(x => '<div class="rx-linha"><div><b>' + e_(x.nome || 'Cliente do iFood') + '</b>' + (x.sumido ? ' <span class="rx-tag">sumiu há +30 dias</span>' : '')
        + '<small>' + e_(x.bairro || 'bairro não informado') + ' · último pedido ' + dataBR_(x.ultimo) + '</small></div><b class="rx-dir">' + x.vezes + ' pedidos</b></div>').join('')
      : '<div class="obs-line">Ainda nenhum cliente do iFood pediu mais de uma vez.</div>';
    h += '<div class="rx-dica">💡 O telefone do cliente do iFood é um 0800 do próprio iFood, então não dá para chamar direto. O jeito mais comum de trazer esses clientes para o seu cardápio é um bilhete na sacola com o QR Code do cardápio e um cupom.</div>';
    return secao_('⭐ Clientes fiéis do iFood', h, f.length + ' cliente(s) com 2 pedidos ou mais, de ' + r.ifoodClientesTotal + ' clientes do iFood no total (todo o histórico). O iFood informa quantas vezes cada um já comprou da loja, inclusive antes do sistema.');
  }

  /* ---------- 4) tempos ---------- */
  function temposHtml_(r){
    const t = r.tempos || {};
    if(!t.nPreparo && !t.nTotal) return secao_('⏱️ Tempos de cada etapa', '<div class="obs-line">Sem pedidos com os horários marcados no período.</div>');
    const ref = Math.max(1, Number(t.total) || 0, (Number(t.aceitar) || 0) + (Number(t.preparo) || 0) + (Number(t.rota) || 0));
    let h = '';
    [['Esperando aceitar', t.aceitar], ['Preparo', t.preparo], ['Na rua (entrega)', t.rota], ['Total da entrega (do pedido até entregar)', t.total]].forEach(x => {
      if(x[1] != null) h += barra_(x[0], Number(x[1]), ref, x[1] + ' min');
    });
    const ph = t.porHora || [];
    if(ph.length > 1){
      const mx = Math.max(1, ...ph.map(x => Number(x.preparo) || 0));
      h += '<div class="sub" style="margin:10px 0 2px;"><b>Preparo médio por horário do pedido</b></div>'
        + '<div class="rx-colunas" role="img" aria-label="Preparo médio por horário">' + ph.map(x => '<div title="' + hora_(x.h) + ': ' + x.preparo + ' min em média (' + x.n + ' pedido(s))"><div class="rx-col-v">' + x.preparo + '</div><div class="rx-col-b" style="height:' + Math.max(2, Math.round((Number(x.preparo) || 0) / mx * 64)) + 'px;"></div><div class="rx-col-l">' + String(x.h).padStart(2, '0') + '</div></div>').join('') + '</div>'
        + '<p class="sub fs-xs" style="margin:2px 0 0;">Minutos de preparo por hora em que o pedido chegou. Toque e segure numa coluna para ver quantos pedidos.</p>';
    }
    const pe = t.porEntregador || [];
    if(pe.length){
      const mx = Math.max(1, ...pe.map(x => Number(x.rota) || 0));
      h += '<div class="sub" style="margin:10px 0 2px;"><b>Tempo na rua por entregador</b></div>' + pe.map(x => barra_(e_(x.nome) + ' <span class="txt-muted">(' + x.n + ' entrega(s))</span>', Number(x.rota) || 0, mx, x.rota + ' min')).join('');
    }
    const pt = t.porTurno || [];
    if(pt.length){
      const mx = Math.max(1, ...pt.map(x => Number(x.preparo) || 0)), med = Number(t.preparo) || 0;
      h += '<div class="sub" style="margin:10px 0 2px;"><b>Preparo médio por turno</b> <span class="txt-muted fs-xs">(vermelho = bem acima do normal)</span></div>'
        + pt.map(x => { const lento = med && Number(x.preparo) > Math.max(med * 1.3, med + 6);
            return barra_('Turno de ' + dataBR_(x.abertura) + ' <span class="txt-muted">(' + x.n + ' pedido(s))</span>', Number(x.preparo) || 0, mx, x.preparo == null ? '—' : x.preparo + ' min', lento ? '#e5534b' : null); }).join('');
    }
    h += '<div class="rx-dica">🔔 Novo alerta automático: se na última hora a cozinha ficar bem mais lenta que o normal (com 3 pedidos ou mais), o Admin recebe um aviso no celular.</div>';
    return secao_('⏱️ Tempos de cada etapa', h, 'Médias do período, em minutos. Ficam de fora tempos acima de 3 horas (status esquecido).');
  }

  /* ---------- 5) cancelamentos ---------- */
  function cancelHtml_(r){
    const c = r.cancel || [], tot = c.reduce((s, x) => s + x.n, 0), ped = Number(r.pedidosTotal) || 0;
    let h = barra_('Pedidos cancelados', tot, ped, null, tot / Math.max(1, ped) > 0.1 ? '#e5534b' : null);
    if(c.length) h += '<div class="sub" style="margin:8px 0 2px;"><b>Por motivo</b></div>' + c.map(x => barra_(e_(x.motivo), x.n, tot)).join('');
    else h += '<div class="obs-line">Nenhum cancelamento no período. 🎉</div>';
    return secao_('❌ Cancelamentos', h, Number(r.cancelTestes) ? r.cancelTestes + ' cancelamento(s) com "teste" no motivo ficaram de fora.' : '');
  }

  /* ---------- 6) pedidos parados ---------- */
  function paradosHtml_(r){
    const p = r.parados || {}, ks = Object.keys(p).sort((a, b) => p[b] - p[a]), tot = ks.reduce((s, k) => s + p[k], 0);
    if(!tot) return secao_('🐢 Pedidos que ficaram parados', '<div class="obs-line">Nenhum alerta de pedido parado no período. 🎉</div>');
    let h = ks.map(k => barra_(e_(PARADOS_[k] || k), p[k], tot)).join('');
    const ph = r.paradosHora || [];
    if(ph.length > 1){
      const mx = Math.max(1, ...ph.map(x => x.n));
      h += '<div class="sub" style="margin:10px 0 2px;"><b>Em que horário mais acontece</b></div><div class="rx-colunas" role="img" aria-label="Alertas de pedido parado por horário">'
        + ph.map(x => '<div title="' + hora_(x.h) + ': ' + x.n + ' alerta(s)"><div class="rx-col-v">' + x.n + '</div><div class="rx-col-b" style="height:' + Math.max(2, Math.round(x.n / mx * 64)) + 'px;background:#e5a13b;"></div><div class="rx-col-l">' + String(x.h).padStart(2, '0') + '</div></div>').join('') + '</div>';
    }
    const k0 = ks[0];
    if(k0) h += '<div class="rx-dica">💡 O gargalo mais comum é <b>' + e_((PARADOS_[k0] || k0).toLowerCase()) + '</b> (' + Math.round(p[k0] / tot * 100) + '% dos alertas).' + (k0 === 'recebido' ? ' Deixar alguém responsável por aceitar os pedidos assim que chegam resolve boa parte.' : '') + '</div>';
    return secao_('🐢 Pedidos que ficaram parados', h, tot + ' alerta(s) automático(s) de pedido parado no período, por etapa.');
  }

  /* ---------- 7) custos de fornecedor ---------- */
  function custosHtml_(r){
    const c = r.custos || [];
    let h = c.length ? c.map(x => { const sobe = Number(x.pct) > 0;
        return '<div class="rx-linha"><div><b>' + e_(x.ingrediente) + '</b> <span class="rx-pct ' + (sobe ? 'sobe' : 'desce') + '">' + (sobe ? '▲ +' : '▼ ') + String(x.pct).replace('.', ',') + '%</span>'
          + '<small>' + R$(x.antes) + ' → ' + R$(x.agora) + ' por ' + e_(x.unidade || 'un') + (x.nProdutos ? ' · está em ' + x.nProdutos + ' produto(s): ' + e_((x.produtos || []).join(', ')) + (x.nProdutos > (x.produtos || []).length ? '…' : '') : '') + '</small></div></div>'; }).join('')
      : '<div class="obs-line">Nenhum ingrediente mudou 5% ou mais de preço nas compras dos últimos 90 dias.</div>';
    if(c.some(x => Number(x.pct) > 0)) h += '<button type="button" class="ghost" style="margin-top:8px;" onclick="abrirAdministrador(\'produtos\')">Ver os produtos com o preço sugerido</button>';
    return secao_('📈 Custos de fornecedor que mudaram', h, 'Compras lançadas nos 90 dias até o fim do período, com variação de 5% ou mais. O custo e o preço sugerido dos produtos já se ajustam sozinhos quando a compra entra.');
  }

  /* ---------- 8) perdas ---------- */
  function perdasHtml_(r){
    const p = r.perdas || {}, real = Number(p.real) || 0, est = Number(p.estimado) || 0, pct = Number(r.perdaPct) || 0;
    let h = barra_('Perdas registradas × estimativa usada no custo (' + String(pct).replace('.', ',') + '%)', real, Math.max(est, real), R$(real) + ' <span class="txt-muted" style="font-weight:400;">de ' + R$(est) + '</span>', real > est ? '#e5534b' : null);
    if(!Number(p.registros)) h += '<div class="rx-dica">💡 Nenhuma perda foi registrada no período, então o custo usa só a estimativa. Para saber a perda real, registre no Estoque: "🗑️ Perdi um produto pronto" (lanche que caiu, voltou ou saiu errado) ou "➖ Perda" num ingrediente (estragou, venceu).</div>';
    else {
      if((p.itens || []).length){ const mx = Math.max(1, ...(p.itens.map(x => Number(x.valor) || 0))); h += '<div class="sub" style="margin:8px 0 2px;"><b>O que mais se perdeu</b></div>' + p.itens.map(x => barra_(e_(x.nome), Number(x.valor) || 0, mx, R$(x.valor))).join(''); }
      h += '<div class="rx-dica">💡 ' + (real > est ? 'A perda real passou da estimativa. Se continuar assim, aumente o "% de perdas" em Custos e precificação → Custos gerais.' : 'A perda real está dentro da estimativa usada no custo.') + '</div>';
    }
    h += '<button type="button" class="ghost" style="margin-top:8px;" onclick="abrirAdministrador(\'estoque\')">Ir para o Estoque</button>';
    return secao_('🗑️ Perdas', h, 'Valor dos ingredientes registrados como perda no período, comparado com a estimativa que entra no custo de cada produto.');
  }

  function desenhar_(){
    const c = $('rxCorpo'); if(!c || !dados) return;
    const r = dados;
    c.innerHTML = '<p class="sub fs-xs" style="margin:0 0 8px;">De <b>' + new Date(r.de + 'T12:00:00').toLocaleDateString('pt-BR') + '</b> a <b>' + new Date(r.ate + 'T12:00:00').toLocaleDateString('pt-BR') + '</b>.</p>'
      + calorHtml_(r) + canaisHtml_(r) + fieisHtml_(r) + temposHtml_(r) + cancelHtml_(r) + paradosHtml_(r) + custosHtml_(r) + perdasHtml_(r);
  }

  window.raioXAtalho_ = function(k){
    const hoje = new Date(); let de = new Date(hoje), ate = new Date(hoje);
    if(k === 'mes') de = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    else if(k === 'mesant'){ de = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1); ate = new Date(hoje.getFullYear(), hoje.getMonth(), 0); }
    else de.setDate(de.getDate() - (k - 1));
    $('rxDe').value = iso_(de); $('rxAte').value = iso_(ate);
    window.carregarRaioX_();
  };
  window.abrirRaioX_ = function(){
    const de = $('rxDe'); if(!de) return;
    if(!de.value) return window.raioXAtalho_(30);
    if(!dados) window.carregarRaioX_();
  };
  window.carregarRaioX_ = async function(){
    const c = $('rxCorpo'); if(!c) return;
    const de = $('rxDe').value, ate = $('rxAte').value;
    if(!de || !ate){ c.innerHTML = erroHtml_('Escolha as duas datas do período.'); return; }
    c.innerHTML = '<div class="obs-line">⏳ Carregando…</div>';
    try{
      const r = await sbRpc_('api_raio_x', { p:{ de, ate } });
      if(!r || r.ok !== true){ c.innerHTML = erroHtml_((r && r.message) || 'Não foi possível carregar o Raio-X.'); return; }
      dados = r; desenhar_();
    }catch(e){
      if(typeof SbSessaoExpirada_ !== 'undefined' && e instanceof SbSessaoExpirada_){ c.innerHTML = erroHtml_('Sua sessão expirou. Entre de novo para ver o Raio-X.'); return; }
      c.innerHTML = '<div class="msg warn" role="alert" style="display:block;">📡 Sem conexão para carregar o Raio-X. Confira a internet e toque em "Ver período" de novo.</div>';
    }
  };

  /* =================== 🗑️ PERDI UM PRODUTO PRONTO (Estoque) =================== */
  let ppSel = null;
  function ppLista_(){
    const q = (typeof adminNorm_ === 'function' ? adminNorm_ : (t => String(t || '').toLowerCase()))(($('ppBusca') || {}).value || '');
    const lista = (typeof produtos !== 'undefined' && Array.isArray(produtos) ? produtos : []).filter(p => p && p.ativo !== false && p.nome)
      .filter(p => !q || (typeof adminNorm_ === 'function' ? adminNorm_(p.nome) : p.nome.toLowerCase()).indexOf(q) !== -1)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).slice(0, 40);
    const box = $('ppLista'); if(!box) return;
    box.innerHTML = lista.length ? lista.map(p => '<button type="button" class="vs-op" aria-pressed="' + (ppSel === p.id ? 'true' : 'false') + '" onclick="perdaProdutoEscolher_(\'' + e_(p.id) + '\')">' + e_(p.nome) + '</button>').join('')
      : '<div class="obs-line">Nenhum produto com esse nome.</div>';
  }
  window.perdaProdutoEscolher_ = function(id){ ppSel = id; ppLista_(); const p = (produtos || []).find(x => x.id === id); const s = $('ppEscolhido'); if(s) s.textContent = p ? 'Escolhido: ' + p.nome : ''; };
  window.perdaProdutoBuscar_ = ppLista_;
  window.abrirPerdaProduto_ = function(){
    ppSel = null;
    let m = $('ppModal');
    if(!m){ m = document.createElement('div'); m.className = 'modal-overlay'; m.id = 'ppModal'; document.body.appendChild(m); }
    m.innerHTML = '<div class="modal-box vs-form" role="dialog" aria-modal="true" aria-labelledby="ppTit" style="max-width:480px;"><div class="modal-header"><h2 id="ppTit">🗑️ Perdi um produto pronto</h2><button class="close-btn" type="button" aria-label="Fechar" onclick="fecharFormModal(\'ppModal\')">✕</button></div>'
      + '<p class="sub vs-form-texto">Lanche que caiu, voltou ou saiu errado. Todos os ingredientes da receita saem do estoque como perda, e o valor entra no Raio-X.</p>'
      + '<label for="ppBusca">Produto</label><input type="text" id="ppBusca" placeholder="Digite parte do nome" autocomplete="off" oninput="perdaProdutoBuscar_()">'
      + '<div class="vs-escolha" id="ppLista" style="max-height:220px;overflow:auto;margin:6px 0;"></div><div class="sub fs-xs" id="ppEscolhido" aria-live="polite"></div>'
      + '<label for="ppQtd">Quantidade</label><input type="text" inputmode="numeric" id="ppQtd" value="1">'
      + '<label for="ppMotivo">Motivo</label><input type="text" id="ppMotivo" maxlength="120">'
      + '<div class="vs-chips">' + ['Caiu / derramou', 'Saiu errado', 'Cliente devolveu', 'Passou do ponto'].map(s => '<button type="button" class="vs-chip" onclick="document.getElementById(\'ppMotivo\').value=this.textContent">' + s + '</button>').join('') + '</div>'
      + '<div class="msg" id="ppMsg"></div><div class="vs-form-botoes"><button type="button" class="primary vs-perigo" id="ppOk" onclick="salvarPerdaProduto_()">Registrar perda</button><button type="button" class="ghost" onclick="fecharFormModal(\'ppModal\')">Voltar</button></div></div>';
    ppLista_();
    try{ abrirFormModal('ppModal'); }catch(e){ m.classList.add('open'); }
    setTimeout(() => { try{ $('ppBusca').focus(); }catch(e){} }, 60);
  };
  window.salvarPerdaProduto_ = async function(){
    const qtd = Number(String(($('ppQtd') || {}).value || '').replace(',', '.')), motivo = String(($('ppMotivo') || {}).value || '').trim();
    if(!ppSel) return showMsg('ppMsg', 'Escolha o produto na lista.', 'warn');
    if(!(qtd > 0) || qtd > 100) return showMsg('ppMsg', 'Informe uma quantidade entre 1 e 100.', 'warn');
    if(!motivo) return showMsg('ppMsg', 'Informe o motivo (toque numa das sugestões ou escreva).', 'warn');
    const bt = $('ppOk'); if(bt) bt.disabled = true;
    try{
      const r = await apiCall('registrarPerdaProduto', { produtoId: ppSel, quantidade: qtd, motivo });
      if(!r || r.ok !== true){ showMsg('ppMsg', (r && r.message) || 'Não foi possível registrar a perda. Nada foi gravado.', 'warn'); if(bt) bt.disabled = false; return; }
      if(r.estoque) estoque = r.estoque; if(r.movimentacoesEstoque) movimentacoesEstoque = r.movimentacoesEstoque;
      try{ salvarCache(); renderEstoque(); renderMovimentacoesEstoque(); }catch(e){}
      fecharFormModal('ppModal');
      showMsg('eMsgLista', '✅ ' + r.message, 'ok');
    }catch(e){ showMsg('ppMsg', '📡 Sem conexão. Nada foi gravado; tente de novo.', 'warn'); if(bt) bt.disabled = false; }
  };
})();
