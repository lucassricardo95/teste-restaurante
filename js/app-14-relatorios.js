/* ---------- FASE 12 — VISÃO GERAL E RELATÓRIOS (ITENS 83 a 87) ----------
   Tudo é calculado no aparelho a partir dos mesmos dados oficiais que o getAll já entrega (Sheets = fonte única).
   Mesmas fórmulas do DRE da Fase 8C (receita líquida, taxas, CMV, perdas, despesas pagas), só que por período. */
function relIntervalo(cod){
  const h = new Date(); h.setHours(0,0,0,0);
  let ini = new Date(h), fim = new Date(h); fim.setDate(fim.getDate()+1); let rot = 'Hoje';
  if(cod==='7'){ ini.setDate(ini.getDate()-6); rot = 'Últimos 7 dias'; }
  else if(cod==='30'){ ini.setDate(ini.getDate()-29); rot = 'Últimos 30 dias'; }
  else if(cod==='mes'){ ini = new Date(h.getFullYear(), h.getMonth(), 1); rot = 'Mês atual'; }
  else if(cod==='mesAnt'){ ini = new Date(h.getFullYear(), h.getMonth()-1, 1); fim = new Date(h.getFullYear(), h.getMonth(), 1); rot = 'Mês anterior'; }
  else if(cod==='90'){ ini.setDate(ini.getDate()-89); rot = 'Últimos 90 dias'; }
  else if(cod==='365'){ ini.setDate(ini.getDate()-364); rot = 'Últimos 12 meses'; }
  else if(cod==='real'){ ini = new Date(2026, 9, 17); rot = 'Uso real (desde 17/10/2026)'; } /* Fase 10: vendas até 16/10/2026 são de teste; o uso real começa em 17/10/2026 */
  return { ini: ini.getTime(), fim: fim.getTime(), rot, dias: Math.max(1, Math.round((fim-ini)/86400000)) };
}
const PERIODOS_REL = '<option value="hoje">Hoje</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="mes">Mês atual</option><option value="mesAnt">Mês anterior</option><option value="90">Últimos 90 dias</option><option value="365">Últimos 12 meses</option><option value="real">Uso real (desde 17/10/2026)</option>';
const escR = s => escH(s);
const somaR = (a, f) => arred2c(a.reduce((s,x)=>s+(Number(f(x))||0),0));
function grp(arr, fn){ const m = {}; arr.forEach(x=>{ const k = fn(x); (m[k] = m[k] || []).push(x); }); return m; }
function nomeLogin(l){ if(!l) return '(sem registro)'; const u = usuarios.find(x=>x.login===l); return (u && u.nome) || l; }
function fmtDiaISO(iso){ const [y,m,d] = iso.split('-'); return d+'/'+m+'/'+y; }
function resumoPeriodo(p){
  const vs = vendas.filter(v=>v.status==='Confirmada' && v.timestamp>=p.ini && v.timestamp<p.fim);
  const ids = new Set(vs.map(v=>v.id));
  const its = itensVenda.filter(i=>ids.has(i.vendaId)), pgs = pagamentosVenda.filter(x=>ids.has(x.vendaId));
  const liq = somaR(vs, v=>v.valorTotal), taxas = somaR(pgs, x=>x.taxa), cmv = somaR(vs, v=>v.custoTotal);
  const custoNome = {}; estoque.forEach(e=>{ custoNome[e.nome] = Number(e.custo)||0; });
  const perdasL = movimentacoesEstoque.filter(m=>{ const t = new Date(m.data).getTime(); return m.tipo==='Perda' && t>=p.ini && t<p.fim; });
  const perdas = arred2c(perdasL.reduce((s,m)=>s+Math.abs(Number(m.quantidade)||0)*(custoNome[m.ingredienteNome]||0),0));
  const dsp = despesas.filter(d=>despesaEfetiva(d) && d.timestamp>=p.ini && d.timestamp<p.fim);
  const evs = (eventos||[]).filter(e=>{ const t=new Date(e.data).getTime(); return !isNaN(t) && t>=p.ini && t<p.fim && e.status!=='Orçamento' && e.status!=='Cancelado'; });
  const receitaEventos = somaR(evs,e=>e.valorContratado), custosEventos = somaR(evs,e=>e.custoTotal);
  /* Ajustes pós-venda (reembolso, desconto, cortesia) contam pela lista de ajustes — mesma regra do DRE mensal; a despesa espelho 'Ajuste pós-venda' não entra de novo. Crédito para a próxima compra não é custo agora. */
  const ajustesTotal = arred2c((ajustesPosVenda||[]).filter(a=>a.status==='Ativo' && a.timestamp>=p.ini && a.timestamp<p.fim && a.tipo!=='Crédito para próxima compra').reduce((s,a)=>s+(Number(a.valor)||0),0));
  /* Imposto estimado: cada venda/evento pela alíquota do seu mês (com ou sem nota fiscal). O DAS já coberto pela estimativa não entra de novo como despesa. */
  const impostos = arred2c(impostoDoPeriodo_(vs, v=>v.timestamp, v=>v.valorTotal) + impostoDoPeriodo_(evs, e=>new Date(e.data).getTime(), e=>e.valorContratado));
  const dasPago = somaR(dsp.filter(dasJaEstimado_), d=>d.valor), dspConta = dsp.filter(d=>!dasJaEstimado_(d));
  const despTot = arred2c(somaR(dspConta.filter(d=>d.categoria!=='Ajuste pós-venda'), d=>d.valor) + ajustesTotal), lucroBruto = arred2c(liq + receitaEventos - taxas - cmv - custosEventos), resultado = arred2c(lucroBruto - impostos - perdas - despTot);
  const bruta = somaR(vs, v=>v.valorOriginal||v.valorTotal), desc = somaR(vs, v=>v.valorDesconto);
  return { vs, its, pgs, evs, perdasL, dsp, dspConta, dasPago, impostos, ajustesTotal, liq, receitaEventos, custosEventos, taxas, cmv, perdas, despTot, lucroBruto, resultado,
    bruta, desc, entregaAcresc: arred2c(liq - bruta + desc),
    margem: pctDe(resultado, liq+receitaEventos), ticket: vs.length ? liq/vs.length : 0, faturamentoTotal: arred2c(liq+receitaEventos),
    aReceber: somaR(vs.filter(v=>v.statusPagamento==='A Receber'), v=>v.valorTotal) + somaR(evs,e=>e.valorAReceber) };
}
function linhasItens(r, filtro){
  const g = grp(r.its.filter(filtro), i=>i.descricao||'(sem nome)');
  return Object.keys(g).map(k=>{ const a = g[k];
    const q = a.reduce((s,i)=>s+(Number(i.quantidade)||0),0), fat = somaR(a, i=>i.valorTotalItem), cst = somaR(a, i=>(Number(i.quantidade)||0)*(Number(i.custoUnitario)||0));
    return { nome:k, q, fat, cst, luc: arred2c(fat-cst) }; });
}
function tabelaItens(linhas, ordem, max){
  const rows = linhas.sort((a,b)=>b[ordem]-a[ordem]).slice(0, max||30);
  return { cols:['Item','Qtd','Faturamento','Custo','Lucro','Margem'], rows: rows.map(x=>[x.nome, x.q, formatarMoeda(x.fat), formatarMoeda(x.cst), formatarMoeda(x.luc), fmtPct(pctDe(x.luc, x.fat))]),
    total:['Total', rows.reduce((s,x)=>s+x.q,0), formatarMoeda(somaR(rows,x=>x.fat)), formatarMoeda(somaR(rows,x=>x.cst)), formatarMoeda(somaR(rows,x=>x.luc)), ''] };
}
function relPorFuncionario(r, origem, vazio){
  const g = grp(r.vs.filter(v=>(v.origem||'Balcão')===origem), v=>v.registradoPor||'');
  const rows = Object.keys(g).map(k=>[nomeLogin(k), g[k].length, formatarMoeda(somaR(g[k],v=>v.valorTotal)), formatarMoeda(somaR(g[k],v=>v.valorTotal)/g[k].length)]).sort((a,b)=>b[1]-a[1]);
  return { cols:['Funcionário','Pedidos','Faturamento','Ticket médio'], rows, nota: rows.some(x=>x[0]==='(sem registro)') ? 'Vendas antigas podem aparecer como "(sem registro)" quando não houver responsável gravado no registro.' : (rows.length ? '' : vazio) };
}
/* vendas e tempos por garçom. Tempos = MEDIANA em minutos (um pedido esquecido aberto por horas não distorce o resultado).
   "Até ficar pronto" depende da cozinha; "Pronto → servido" é o tempo do garçom levar à mesa; "Até o pagamento" vai do pedido ao recebimento. */
function medianaMin_(ms){
  const a = ms.filter(x=>x!=null && x>=0).map(x=>Math.round(x/60000)).sort((x,y)=>x-y);
  if(!a.length) return null;
  const m = Math.floor(a.length/2); return a.length%2 ? a[m] : Math.round((a[m-1]+a[m])/2);
}
function fmtMinR_(m){ if(m==null) return '—'; if(m<60) return m+' min'; return Math.floor(m/60)+'h'+(m%60 ? String(m%60).padStart(2,'0')+'min' : ''); }
function temposGarcom_(vs){
  const d = (a,b)=> (a && b) ? (b-a) : null;
  return [
    fmtMinR_(medianaMin_(vs.map(v=>d(v.timestamp, v.timestampPronta)))),
    fmtMinR_(medianaMin_(vs.map(v=>d(v.timestampPronta, v.timestampConcluida)))),
    fmtMinR_(medianaMin_(vs.filter(v=>v.statusPagamento==='Pago').map(v=>d(v.timestamp, v.timestampRecebimento))))
  ];
}
function relGarcons_(r){
  const vs = r.vs.filter(v=>(v.origem||'Balcão')==='Garçom');
  const g = grp(vs, v=>v.registradoPor||'');
  const linha = (nome, a)=>[nome, a.length, formatarMoeda(somaR(a,v=>v.valorTotal)), formatarMoeda(somaR(a,v=>v.valorTotal)/a.length)].concat(temposGarcom_(a));
  const rows = Object.keys(g).map(k=>({ k, n:g[k].length, l:linha(nomeLogin(k), g[k]) })).sort((a,b)=>b.n-a.n).map(x=>x.l);
  const nota = ['Tempos = mediana por pedido; pedidos sem o horário gravado ficam de fora. “Até ficar pronto” depende da cozinha; “Pronto → servido” é o tempo do garçom até a mesa.'];
  if(rows.some(x=>x[0]==='(sem registro)')) nota.push('Vendas antigas podem aparecer como "(sem registro)" quando não houver responsável gravado.');
  if(!rows.length) nota.unshift('Nenhum pedido de garçom no período.');
  return { cols:['Garçom','Pedidos','Faturamento','Ticket médio','Até ficar pronto','Pronto → servido','Até o pagamento'], rows,
    total: rows.length>1 ? linha('Total', vs) : undefined, nota: nota.join(' ') };
}
const REL = {
  vendasDia:{ g:'Vendas e pedidos', t:'Vendas por dia (turno do caixa)', f:(p,r)=>{ const g = grp(r.vs, v=>diaDoTurno_(v.timestamp));
    const rows = Object.keys(g).sort().map(k=>[fmtDiaISO(k), g[k].length, formatarMoeda(somaR(g[k],v=>v.valorTotal)), formatarMoeda(somaR(g[k],v=>v.valorTotal)/g[k].length)]);
    return { cols:['Dia','Pedidos','Faturamento','Ticket médio'], rows, total:['Total', r.vs.length, formatarMoeda(r.faturamentoTotal||r.liq), formatarMoeda(r.ticket)] }; } },
  pedidos:{ g:'Vendas e pedidos', t:'Pedidos por origem (Balcão, Cardápio, Garçom)', f:(p,r)=>{ const g = grp(r.vs, v=>v.origem||'Balcão');
    const rows = Object.keys(g).map(k=>[k, g[k].length, formatarMoeda(somaR(g[k],v=>v.valorTotal)), formatarMoeda(somaR(g[k],v=>v.valorTotal)/g[k].length), fmtPct(pctDe(g[k].length, r.vs.length))]);
    const tp = grp(r.vs, v=>v.tipoEntrega||'Retirada'); const canc = vendas.filter(v=>v.status==='Cancelada' && v.timestamp>=p.ini && v.timestamp<p.fim).length;
    return { cols:['Origem','Pedidos','Faturamento','Ticket médio','% dos pedidos'], rows, total:['Total', r.vs.length, formatarMoeda(r.liq), formatarMoeda(r.ticket), '100,0%'],
      nota: Object.keys(tp).map(k=>k+': '+tp[k].length).join(' · ') + ' — cancelados no período: ' + canc }; } },
  produtos:{ g:'Produtos e cardápio', t:'Produtos mais vendidos', f:(p,r)=>tabelaItens(linhasItens(r, i=>i.produtoId && !i.comboId && !/bebida/i.test(((produtos.find(x=>x.id===i.produtoId)||{}).categoria)||'')), 'q') },
  combos:{ g:'Produtos e cardápio', t:'Combos', f:(p,r)=>tabelaItens(linhasItens(r, i=>!!i.comboId), 'q') },
  bebidas:{ g:'Produtos e cardápio', t:'Bebidas', f:(p,r)=>tabelaItens(linhasItens(r, i=>i.produtoId && /bebida/i.test(((produtos.find(x=>x.id===i.produtoId)||{}).categoria)||'')), 'q'), },
  adicionais:{ g:'Produtos e cardápio', t:'Adicionais', f:(p,r)=>{ const m = {};
    r.its.forEach(i=>(i.adicionaisIds||[]).forEach(id=>{ const a = adicionais.find(x=>x.id===id); const k = a ? a.nome : '(adicional removido)'; const o = m[k] = m[k] || { q:0, v:0 }; o.q += Number(i.quantidade)||1; o.v += (Number(i.quantidade)||1)*(a?a.preco:0); }));
    const rows = Object.keys(m).sort((a,b)=>m[b].q-m[a].q).map(k=>[k, m[k].q, formatarMoeda(m[k].v)]);
    return { cols:['Adicional','Qtd vendida','Valor (preço cadastrado)'], rows, total:['Total', rows.reduce((s,x)=>s+x[1],0), formatarMoeda(Object.keys(m).reduce((s,k)=>s+m[k].v,0))] }; } },
  rentabilidade:{ g:'Análise avançada', t:'Rentabilidade (produtos e combos por lucro)', f:(p,r)=>tabelaItens(linhasItens(r, i=>true), 'luc', 20) },
  estoque:{ g:'Estoque', t:'Estoque atual e valor parado', f:()=>{ const l = estoque.filter(e=>e.ativo);
    const sit = e => (Number(e.quantidade)<=0 ? 'Zerado' : (Number(e.minimo)>0 && Number(e.quantidade)<=Number(e.minimo) ? 'Baixo' : 'OK')), pes = {Zerado:0,Baixo:1,OK:2};
    const rows = l.slice().sort((a,b)=>pes[sit(a)]-pes[sit(b)] || a.nome.localeCompare(b.nome)).map(e=>[e.nome, e.quantidade+' '+e.unidade, e.minimo+' '+e.unidade, formatarMoeda(e.custo), formatarMoeda(e.quantidade*e.custo), sit(e)]);
    return { cols:['Ingrediente','Quantidade','Mínimo','Custo unit.','Valor em estoque','Situação'], rows, total:['Total','','','', formatarMoeda(somaR(l,e=>e.quantidade*e.custo)), ''], nota:'Posição de hoje — não depende do período escolhido.' }; } },
  perdas:{ g:'Estoque', t:'Perdas de estoque', f:(p,r)=>{ const custoNome = {}; estoque.forEach(e=>{ custoNome[e.nome] = Number(e.custo)||0; });
    const rows = r.perdasL.slice(0,60).map(m=>[dataLocalISO(new Date(m.data)).split('-').reverse().join('/'), m.ingredienteNome, Math.abs(m.quantidade), formatarMoeda(Math.abs(m.quantidade)*(custoNome[m.ingredienteNome]||0)), m.motivo||'—']);
    return { cols:['Data','Ingrediente','Qtd','Custo','Motivo'], rows, total:['Total','','', formatarMoeda(r.perdas), ''], nota:'Perdas = '+fmtPct(pctDe(r.perdas, r.liq))+' da receita líquida do período.' }; } },
  financeiro:{ g:'Financeiro', t:'Resultado do período (DRE)', f:(p,r)=>{ const P = v => fmtPct(pctDe(v, r.liq));
    return { cols:['Linha','Valor','% da receita'], rows:[['Vendas (antes do desconto)', formatarMoeda(r.bruta), ''],['(−) Descontos', formatarMoeda(r.desc), P(r.desc)],...(Math.abs(r.entregaAcresc)>0.009?[['(+) Taxa de entrega e acréscimos cobrados', formatarMoeda(r.entregaAcresc), P(r.entregaAcresc)]]:[]),['Receita líquida', formatarMoeda(r.liq), '100,0%'],['Faturamento de eventos', formatarMoeda(r.receitaEventos||0), P(r.receitaEventos||0)],['Custos de eventos', formatarMoeda(r.custosEventos||0), P(r.custosEventos||0)],['Faturamento total', formatarMoeda(r.faturamentoTotal||r.liq), P(r.faturamentoTotal||r.liq)],['(−) Taxas de pagamento e comissões', formatarMoeda(r.taxas), P(r.taxas)],['(−) Custo dos produtos', formatarMoeda(r.cmv), P(r.cmv)],['Lucro bruto', formatarMoeda(r.lucroBruto), P(r.lucroBruto)],...(r.impostos>0?[['(−) Impostos sobre vendas (estimado)', formatarMoeda(r.impostos), P(r.impostos)]]:[]),['(−) Perdas de estoque', formatarMoeda(r.perdas), P(r.perdas)],['(−) Despesas pagas', formatarMoeda(r.despTot), P(r.despTot)],['Resultado', formatarMoeda(r.resultado), P(r.resultado)]],
      nota:'Ticket médio '+formatarMoeda(r.ticket)+' · a receber (ainda não pago): '+formatarMoeda(r.aReceber)+(r.dasPago>0?' · DAS pago no período ('+formatarMoeda(r.dasPago)+') fica fora das despesas: o imposto já está estimado pela alíquota.':'')+(r.impostos>0?'':' · Sem alíquota de imposto cadastrada (Dinheiro → Relatórios e DRE, cartão DRE): o imposto não é estimado.') }; } },
  despesas:{ g:'Financeiro', t:'Despesas por categoria', f:(p,r)=>{ const g = grp(r.dspConta, d=>d.categoria||'Outros');
    const rows = Object.keys(g).sort((a,b)=>somaR(g[b],d=>d.valor)-somaR(g[a],d=>d.valor)).map(k=>[k, g[k].length, formatarMoeda(somaR(g[k],d=>d.valor)), fmtPct(pctDe(somaR(g[k],d=>d.valor), r.despTot))]);
    return { cols:['Categoria','Lançamentos','Valor','% das despesas'], rows, total:['Total', r.dspConta.length, formatarMoeda(r.despTot), '100,0%'], nota:'Despesas = '+fmtPct(pctDe(r.despTot, r.liq))+' da receita líquida.'+(r.dasPago>0?' O DAS pago ('+formatarMoeda(r.dasPago)+') não aparece aqui: o imposto já é estimado pela alíquota do mês.':'') }; } },
  pagamentos:{ g:'Financeiro', t:'Pagamentos por forma (com taxas)', f:(p,r)=>{ const g = grp(r.pgs, x=>x.forma||'—');
    const rows = Object.keys(g).sort((a,b)=>somaR(g[b],x=>x.valor)-somaR(g[a],x=>x.valor)).map(k=>{ const v = somaR(g[k],x=>x.valor), t = somaR(g[k],x=>x.taxa); return [k, g[k].length, formatarMoeda(v), formatarMoeda(t), fmtPct(pctDe(t,v)), formatarMoeda(v-t)]; });
    return { cols:['Forma','Pagamentos','Valor','Taxas','% taxa','Líquido'], rows, total:['Total', r.pgs.length, formatarMoeda(somaR(r.pgs,x=>x.valor)), formatarMoeda(r.taxas), fmtPct(pctDe(r.taxas, somaR(r.pgs,x=>x.valor))), formatarMoeda(somaR(r.pgs,x=>x.valor)-r.taxas)] }; } },
  margemforma:{ g:'Análise avançada', t:'Margem líquida por forma de pagamento', f:(p,r)=>{
    const vPorId = {}; r.vs.forEach(v=>{ vPorId[v.id] = v; });
    const g = grp(r.pgs, x=>x.forma||'—');
    const rows = Object.keys(g).map(k=>{
      const val = somaR(g[k],x=>x.valor), taxa = somaR(g[k],x=>x.taxa);
      const custo = somaR(g[k], x=>{ const v = vPorId[x.vendaId]; return v && Number(v.valorTotal) > 0 ? (Number(v.custoTotal)||0) * (Number(x.valor)||0) / Number(v.valorTotal) : 0; });
      const imp = impostoDoPeriodo_(g[k], x=>{ const v = vPorId[x.vendaId]; return v ? v.timestamp : 0; }, x=>x.valor);
      const liq = arred2c(val - taxa - custo - imp);
      return { k, n:g[k].length, val, taxa, custo, imp, liq };
    }).sort((a,b)=>b.liq-a.liq);
    const T = rows.reduce((t,x)=>({ val:t.val+x.val, taxa:t.taxa+x.taxa, custo:t.custo+x.custo, imp:t.imp+x.imp, liq:t.liq+x.liq, n:t.n+x.n }), { val:0, taxa:0, custo:0, imp:0, liq:0, n:0 });
    const comImp = T.imp > 0.009;
    return { cols:['Forma','Pagam.','Recebido','Taxa','Custo'].concat(comImp?['Imposto']:[]).concat(['Margem líquida','% margem']),
      rows: rows.map(x=>[x.k, x.n, formatarMoeda(x.val), formatarMoeda(x.taxa), formatarMoeda(x.custo)].concat(comImp?[formatarMoeda(x.imp)]:[]).concat([formatarMoeda(x.liq), fmtPct(pctDe(x.liq, x.val))])),
      total:['Total', T.n, formatarMoeda(T.val), formatarMoeda(T.taxa), formatarMoeda(T.custo)].concat(comImp?[formatarMoeda(T.imp)]:[]).concat([formatarMoeda(T.liq), fmtPct(pctDe(T.liq, T.val))]),
      nota:'Margem líquida = recebido − taxa da forma (no iFood, a comissão) − custo dos produtos (dividido pelo peso de cada pagamento na venda)' + (comImp ? ' − imposto estimado' : '') + '. Não desconta despesas fixas nem perdas. Valores recebidos incluem o acréscimo da forma, quando houver.' + (comImp ? '' : ' Sem alíquota de imposto cadastrada (Dinheiro → Relatórios e DRE, cartão DRE).') }; } },
  diasemana:{ g:'Análise avançada', t:'Vendas por dia da semana', f:(p,r)=>{
    const nomes = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'], acc = nomes.map(()=>({ n:0, v:0 })), ocor = nomes.map(()=>0);
    r.vs.forEach(v=>{ const d = new Date(v.timestamp).getDay(); acc[d].n++; acc[d].v += Number(v.valorTotal)||0; });
    const fimDia = Math.min(p.fim, Date.now()); for(let t = p.ini; t < fimDia; t += 86400000) ocor[new Date(t + 43200000).getDay()]++;
    const ord = [1,2,3,4,5,6,0];
    const rows = ord.map(d=>[nomes[d], acc[d].n, formatarMoeda(acc[d].v), formatarMoeda(acc[d].n ? acc[d].v/acc[d].n : 0), formatarMoeda(ocor[d] ? acc[d].v/ocor[d] : 0), ocor[d]]);
    const melhor = ord.slice().sort((a,b)=>(ocor[b]?acc[b].v/ocor[b]:0)-(ocor[a]?acc[a].v/ocor[a]:0))[0];
    return { cols:['Dia','Pedidos','Faturamento','Ticket médio','Média por dia','Dias no período'], rows,
      total:['Total', r.vs.length, formatarMoeda(somaR(r.vs,v=>v.valorTotal)), '', '', ''],
      nota: r.vs.length ? 'Melhor dia (média por dia): ' + nomes[melhor] + '. Para ver o ano todo, escolha "Últimos 12 meses" (meses antigos são buscados no arquivo e demoram um pouco).' : 'Sem vendas no período.' }; } },
  anoanterior:{ g:'Análise avançada', t:'Comparação com o ano passado', f:(p,r)=>{
    const pa = relPeriodoAnoAnt_(p), ra = resumoPeriodo(pa);
    const lin = (nome, a, b, moeda) => [nome, moeda ? formatarMoeda(a) : a, moeda ? formatarMoeda(b) : b, b > 0 ? fmtPct(pctDe(a-b, b)) : '—'];
    return { cols:['Indicador','Este período','Ano passado','Variação'], rows:[
      lin('Faturamento', r.liq, ra.liq, true), lin('Pedidos', r.vs.length, ra.vs.length, false), lin('Ticket médio', r.ticket, ra.ticket, true),
      lin('Custo dos produtos', r.cmv, ra.cmv, true), lin('Taxas', r.taxas, ra.taxas, true), lin('Lucro bruto', r.lucroBruto, ra.lucroBruto, true), lin('Despesas pagas', r.despTot, ra.despTot, true), lin('Resultado', r.resultado, ra.resultado, true)],
      nota: ra.vs.length ? 'Compara com ' + new Date(pa.ini).toLocaleDateString('pt-BR') + ' a ' + new Date(pa.fim-86400000).toLocaleDateString('pt-BR') + '. Despesas só aparecem se ainda estiverem no app.' : 'Não há vendas no mesmo período do ano passado (o sistema pode não existir ainda ou o arquivo daquele mês não foi encontrado).' }; } },
  equilibrio:{ g:'Análise avançada', t:'Ponto de equilíbrio', f:(p,r)=>{ const fat = r.faturamentoTotal||r.liq, mc = pctDe(r.lucroBruto - r.impostos, fat), pe = mc>0 ? r.despTot/(mc/100) : 0, falta = arred2c(pe - fat);
    return { cols:['Indicador','Valor'], rows:[['Margem de contribuição (receita − taxas − custo' + (r.impostos>0 ? ' − imposto' : '') + ')', fmtPct(mc)],['Despesas pagas no período', formatarMoeda(r.despTot)],['Faturamento de equilíbrio', mc>0 ? formatarMoeda(pe) : '—'],['Faturamento atual', formatarMoeda(r.faturamentoTotal||r.liq)],[falta>0?'Falta para empatar':'Acima do equilíbrio', mc>0 ? formatarMoeda(Math.abs(falta)) : '—']],
      nota: mc>0 ? 'Equilíbrio = despesas ÷ margem de contribuição. Use "Mês atual" ou "Mês anterior" para comparar com as despesas do mês inteiro.' : 'Sem vendas no período: não dá para calcular.' }; } },
  projecao:{ g:'Análise avançada', t:'Projeção de caixa (próximos 30 dias)', f:()=>{ const r = resumoPeriodo(relIntervalo('30')), aPagar = somaR(despesas.filter(d=>d.status==='Confirmada' && d.situacao==='A pagar'), d=>d.valor), ref = Math.max(aPagar, r.despTot), proj = arred2c(r.lucroBruto - r.impostos - ref);
    return { cols:['Estimativa','Valor'], rows:[['Faturamento médio por dia (últimos 30 dias)', formatarMoeda(r.liq/30)],['Faturamento projetado (30 dias)', formatarMoeda(r.liq)],['Lucro bruto projetado (30 dias)', formatarMoeda(r.lucroBruto)],...(r.impostos>0?[['Imposto estimado (30 dias)', formatarMoeda(r.impostos)]]:[]),['Despesas já lançadas a pagar', formatarMoeda(aPagar)],['Despesas pagas nos últimos 30 dias (referência)', formatarMoeda(r.despTot)],['Resultado projetado', formatarMoeda(proj)]],
      nota:'Estimativa simples: repete o ritmo dos últimos 30 dias e desconta o maior valor entre o que está a pagar e o que foi pago no período. Não considera sazonalidade.' }; } },
  clientes:{ g:'Clientes', t:'Melhores clientes do período', f:(p,r)=>{ const com = r.vs.filter(v=>chaveVendaCliente_(v)), g = grp(com, v=>chaveVendaCliente_(v));
    const rows = Object.keys(g).sort((a,b)=>somaR(g[b],v=>v.valorTotal)-somaR(g[a],v=>v.valorTotal)).slice(0,20).map(k=>{ const a = g[k], cli = clientes.find(c=>chaveCliente_(c)===k); return [((cli&&cli.nome)||String(a[0].clienteNome||k).replace(/ \(iFood\)$/,'')) + (/^ifood:/.test(k) ? ' 🛵 iFood' : ''), a.length, formatarMoeda(somaR(a,v=>v.valorTotal)), formatarMoeda(somaR(a,v=>v.valorTotal)/a.length), a.map(v=>v.data).sort().pop().slice(0,10)]; });
    return { cols:['Cliente','Pedidos','Total','Ticket médio','Último'], rows, nota:'Vendas sem cliente identificado: '+(r.vs.length-com.length)+' de '+r.vs.length+'.' }; } },
  fidelidade:{ g:'Clientes', t:'Fidelidade (carimbos e prêmios)', f:()=>{ const rows = fidelidadeClientes.slice().sort((a,b)=>(Number(b.carimbos)||0)-(Number(a.carimbos)||0)).slice(0,30).map(f=>[f.nome, f.carimbos||0, f.premios||0]);
    return { cols:['Cliente','Carimbos','Prêmios resgatados'], rows, nota:'Posição de hoje — não depende do período escolhido.' }; } },
  garcons:{ g:'Equipe e mesas', t:'Vendas e tempos por garçom', f:(p,r)=>relGarcons_(r) },
  operadores:{ g:'Equipe e mesas', t:'Vendas por operador de caixa', f:(p,r)=>relPorFuncionario(r, 'Balcão', 'Nenhuma venda de balcão no período.') },
  mesas:{ g:'Equipe e mesas', t:'Mesas', f:(p,r)=>{ const g = grp(r.vs.filter(v=>v.tipoEntrega==='Mesa'), v=>{ const m = mesas.find(x=>x.id===v.mesaId); return m ? 'Mesa '+m.numero : '(mesa removida)'; });
    const rows = Object.keys(g).sort((a,b)=>g[b].length-g[a].length).map(k=>[k, g[k].length, formatarMoeda(somaR(g[k],v=>v.valorTotal)), formatarMoeda(somaR(g[k],v=>v.valorTotal)/g[k].length)]);
    return { cols:['Mesa','Pedidos','Faturamento','Ticket médio'], rows }; } }
};
let ultimoRelTexto = '';
function montarSelectRelatorios(){
  const sel = document.getElementById('relTipo'); if(!sel || sel.options.length) return;
  const grupos = {}; Object.keys(REL).forEach(k=>{ (grupos[REL[k].g] = grupos[REL[k].g] || []).push(k); });
  sel.innerHTML = Object.keys(grupos).map(g=>`<optgroup label="${g}">${grupos[g].map(k=>`<option value="${k}">${REL[k].t}</option>`).join('')}</optgroup>`).join('');
  document.getElementById('relPeriodo').innerHTML = PERIODOS_REL + '<option value="arq">Outro mês (arquivo)…</option>'; document.getElementById('relPeriodo').value = '30';
}
function renderRelatorio(){
  const box = document.getElementById('relResultado'); if(!box) return; montarSelectRelatorios();
  const cod = document.getElementById('relPeriodo').value, bx = document.getElementById('relMesArqBox'); if(bx) bx.style.display = cod === 'arq' ? '' : 'none';
  if(cod === 'arq') return relCarregarArquivo_();
  return relRenderPeriodo_(relIntervalo(cod), cod);
}
/* Mês arquivado: busca as vendas na planilha (abas Arquivo_*), junta às que ainda estão no app (sem repetir) só durante o desenho do relatório. */
const _relArqCache_ = {};
/* Lista vinda do arquivo: a planilha guarda como texto JSON ('["a","b"]'); aceita lista pronta ou texto. */
function relLista_(v){
  if(Array.isArray(v)) return v;
  if(typeof v === 'string' && v){ try{ const o = JSON.parse(v.replace(/^'/,'')); return Array.isArray(o) ? o : []; }catch(e){} }
  return [];
}
function relMapArq_(c){
  const lg = c.logins || {}, t = x => x ? (Date.parse(x) || null) : null;
  return {
    vendas: (c.vendas||[]).map(v=>({ id:v.id, data:sbDataBr_(v.data_hora), timestamp:Date.parse(v.data_hora)||0, clienteNome:v.cliente_nome||'', clienteTelefone:v.telefone_cliente||'', formaPagamento:v.forma_pagamento||'',
      valorTotal:Number(v.valor_total)||0, custoTotal:Number(v.custo_total)||0, status:v.status, motivoCancelamento:v.motivo_cancelamento||'', tipoEntrega:v.tipo||'Retirada', statusPedido:v.status_pedido||'',
      endereco:v.endereco||'', complemento:v.complemento||'', referencia:v.referencia||'', observacoesEntrega:v.observacoes_entrega||'', timestampPronta:t(v.pronta_em), timestampConcluida:t(v.concluida_em),
      statusPagamento:v.status_pagamento||'Pago', timestampRecebimento:t(v.recebido_em), valorOriginal:Number(v.valor_original)||Number(v.valor_total)||0, valorDesconto:Number(v.valor_desconto)||0,
      descontoDetalhe:v.desconto_detalhe||'', entregador:lg[v.entregador_id]||'', timestampSaiu:t(v.saiu_em), origem:v.origem||'Balcão', mesaId:v.mesa_id||'', taxaEntrega:Number(v.taxa_entrega)||0,
      fechamentoEntregaId:v.fechamento_entrega_id||'', registradoPor:lg[v.registrado_por]||'', numero:Number(v.numero_pedido)||0, timestampInicioPreparo:t(v.inicio_preparo_em), clienteId:v.cliente_id||'', acrescimoForma:Number(v.acrescimo_forma)||0, cpfNota:v.cpf_nota||'', canal:v.canal||'', preferenciasCliente:v.preferencias_cliente||'', caixaId:v.caixa_id||'' })),
    itens: (c.itens||[]).map(i=>({ id:i.id, vendaId:i.venda_id, produtoId:i.produto_id||'', comboId:i.combo_id||'', descricao:i.descricao||'', quantidade:Number(i.quantidade), valorUnitario:Number(i.valor_unitario),
      custoUnitario:Number(i.custo_unitario)||0, valorTotalItem:Number(i.valor_total_item), adicionaisIds:relLista_(i.adicionais_ids) })),
    pagamentos: (c.pagamentos||[]).map(x=>({ id:x.id, vendaId:x.venda_id, forma:x.forma_pagamento, valor:Number(x.valor), taxa:Number(x.taxa_aplicada)||0, acrescimo:Number(x.acrescimo)||0 }))
  };
}
/* D17 — período que começa antes do corte (30 dias = mínimo do arquivamento) busca os meses arquivados na planilha.
   Nunca desenha total parcial: se a busca falhar, mostra aviso e botão "Tentar de novo". */
/* Mesmo período, um ano antes (para a comparação ano a ano). */
function relPeriodoAnoAnt_(p){
  const a = new Date(p.ini), b = new Date(p.fim); a.setFullYear(a.getFullYear()-1); b.setFullYear(b.getFullYear()-1);
  return { ini: a.getTime(), fim: b.getTime(), rot: 'Mesmo período do ano passado', dias: p.dias };
}
function relMesesArq_(p){
  const corte = Date.now() - 30*86400000, fimBusca = Math.min(p.fim, corte);
  if(p.ini >= corte) return [];
  const out = [], d = new Date(p.ini); d.setDate(1); d.setHours(0,0,0,0);
  while(d.getTime() <= fimBusca){ out.push(d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0')); d.setMonth(d.getMonth()+1); }
  return out;
}
async function relBuscarMes_(ym){
  if(_relArqCache_[ym]) return _relArqCache_[ym];
  const j = await sb410Edge_('planilha-admin', { acao:'arquivoVendas', mes: ym }, 120000);
  if(!j || !j.ok) throw new Error('arquivo');
  return (_relArqCache_[ym] = relMapArq_(j));
}
function relMesclarEDesenhar_(p, cs){
  const bk = [vendas, itensVenda, pagamentosVenda], vi = new Set(vendas.map(x=>x.id)), ii = new Set(itensVenda.map(x=>x.id)), pi = new Set(pagamentosVenda.map(x=>x.id));
  try{
    cs.forEach(c=>{ vendas = vendas.concat(c.vendas.filter(x=>!vi.has(x.id) && vi.add(x.id))); itensVenda = itensVenda.concat(c.itens.filter(x=>!ii.has(x.id) && ii.add(x.id))); pagamentosVenda = pagamentosVenda.concat(c.pagamentos.filter(x=>!pi.has(x.id) && pi.add(x.id))); });
    renderRelatorioP_(p);
  } finally { vendas = bk[0]; itensVenda = bk[1]; pagamentosVenda = bk[2]; }
}
async function relRenderPeriodo_(p, cod){
  const box = document.getElementById('relResultado'); if(!box) return;
  let meses = relMesesArq_(p);
  if((document.getElementById('relTipo')||{}).value === 'anoanterior') meses = Array.from(new Set(meses.concat(relMesesArq_(relPeriodoAnoAnt_(p)))));
  if(!meses.length) return renderRelatorioP_(p);
  const cs = [];
  try{
    /* O primeiro mês que ainda não está na memória vai sozinho: é ele que prepara o índice do arquivo na planilha; os outros já o encontram pronto
       (três ao mesmo tempo). Mês que já foi buscado antes não vai de novo. */
    const faltam = meses.filter(m=>!_relArqCache_[m]);
    if(faltam.length > 1){
      box.innerHTML = '<div class="notif-empty">Buscando dados antigos… preparando ' + meses.length + ' meses</div>';
      await relBuscarMes_(faltam[0]);
      if(document.getElementById('relPeriodo').value !== cod) return;   // mudou de ideia durante a busca
    }
    for(let i=0; i<meses.length; i+=3){
      box.innerHTML = '<div class="notif-empty">Buscando dados antigos… ' + Math.min(i+3, meses.length) + ' de ' + meses.length + ' meses</div>';
      cs.push(...await Promise.all(meses.slice(i, i+3).map(relBuscarMes_)));
      if(document.getElementById('relPeriodo').value !== cod) return;   // mudou de ideia durante a busca
    }
  }catch(e){
    box.innerHTML = '<div class="notif-empty">Parte deste período está arquivada e não foi carregada. Os totais podem estar incompletos.<br><button type="button" class="ghost" onclick="renderRelatorio()">Tentar de novo</button></div>';
    return;
  }
  relMesclarEDesenhar_(p, cs);
}
async function relCarregarArquivo_(){
  const box = document.getElementById('relResultado'); if(!box) return;
  const ym = (document.getElementById('relMesArq') || {}).value;
  if(!ym){ box.innerHTML = '<div class="notif-empty">Escolha o mês para ver o relatório.</div>'; return; }
  let c = _relArqCache_[ym];
  if(!c){
    box.innerHTML = '<div class="notif-empty">Buscando o mês no arquivo da planilha…</div>';
    try{
      const j = await sb410Edge_('planilha-admin', { acao:'arquivoVendas', mes: ym }, 120000);
      if(!j || !j.ok){ box.innerHTML = '<div class="notif-empty">' + escR((j && j.message) || 'Não foi possível ler o arquivo agora.') + '</div>'; return; }
      c = _relArqCache_[ym] = relMapArq_(j);
    }catch(e){ box.innerHTML = '<div class="notif-empty">Sem conexão para buscar o arquivo. Tente de novo.</div>'; return; }
  }
  if(document.getElementById('relPeriodo').value !== 'arq' || (document.getElementById('relMesArq') || {}).value !== ym) return;   // mudou de ideia durante a busca
  const a = ym.split('-').map(Number), ini = new Date(a[0], a[1]-1, 1), fim = new Date(a[0], a[1], 1);
  const p = { ini: ini.getTime(), fim: fim.getTime(), rot: 'Mês ' + String(a[1]).padStart(2,'0') + '/' + a[0] + ' (inclui o arquivo)', dias: Math.round((fim - ini) / 86400000) };
  const bk = [vendas, itensVenda, pagamentosVenda], vi = new Set(vendas.map(x=>x.id)), ii = new Set(itensVenda.map(x=>x.id)), pi = new Set(pagamentosVenda.map(x=>x.id));
  try{
    vendas = vendas.concat(c.vendas.filter(x=>!vi.has(x.id))); itensVenda = itensVenda.concat(c.itens.filter(x=>!ii.has(x.id))); pagamentosVenda = pagamentosVenda.concat(c.pagamentos.filter(x=>!pi.has(x.id)));
    renderRelatorioP_(p);
  } finally { vendas = bk[0]; itensVenda = bk[1]; pagamentosVenda = bk[2]; }
}
function renderRelatorioP_(p){
  const box = document.getElementById('relResultado'); if(!box) return;
  const def = REL[document.getElementById('relTipo').value]; if(!def) return;
  const res = def.f(p, resumoPeriodo(p)); ultimoRel = { def, p, res }; const aviso = '<div class="notif-empty">Nada para mostrar neste período.</div>';
  const td = (c,i) => `<td${i? ' class="txt-dir"':''}>${escR(c)}</td>`;
  box.innerHTML = `<h3 style="margin:14px 0 2px;">${def.t}</h3><div class="obs-line mb-2">${p.rot}</div>` +
    (res.rows.length ? `<div style="overflow-x:auto;"><table style="width:100%;font-size:12.5px;"><thead><tr>${res.cols.map((c,i)=>`<th ${i?'align="right"':'align="left"'}>${c}</th>`).join('')}</tr></thead><tbody>${res.rows.map(l=>`<tr>${l.map(td).join('')}</tr>`).join('')}${res.total?`<tr class="fw-7">${res.total.map(td).join('')}</tr>`:''}</tbody></table></div>` : aviso) +
    (res.nota ? `<div class="info-line">• ${escR(res.nota)}</div>` : '');
  ultimoRelTexto = def.t.toUpperCase() + ' — ' + p.rot + '\n' + res.rows.concat(res.total?[res.total]:[]).map(l=>l.join(' | ')).join('\n') + (res.nota?'\n\n'+res.nota:'');
}
/* ---------- EXPORTAR CSV (abre no Excel brasileiro: separador ";", vírgula decimal, acentos corretos) ---------- */
function csvCelula_(v){
  let t = (v===undefined||v===null) ? '' : String(v);
  if(/^[=+@]/.test(t) || /^-(?!\d)/.test(t)) t = "'" + t;   // texto que o Excel poderia tratar como fórmula
  if(/[;"\n\r]/.test(t)) t = '"' + t.replace(/"/g,'""') + '"';
  return t;
}
function csvNum_(n){ return (Number(n)||0).toFixed(2).replace('.',','); }
function baixarCsv_(nome, cab, linhas){
  const txt = '\ufeff' + [cab].concat(linhas).map(l=>l.map(csvCelula_).join(';')).join('\r\n');
  const blob = new Blob([txt], { type:'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ try{ URL.revokeObjectURL(a.href); a.remove(); }catch(e){} }, 1500);
}
function nomeArquivoCsv_(base, p){ const d = x => dataLocalISO(new Date(x)); return base + '-' + d(p.ini) + '_a_' + d(p.fim - 86400000) + '.csv'; }
function periodoExport_(){
  const cod = document.getElementById('relPeriodo').value;
  if(cod === 'arq'){
    const ym = (document.getElementById('relMesArq').value || '').split('-');
    if(ym.length !== 2) return null;
    const ini = new Date(Number(ym[0]), Number(ym[1])-1, 1), fim = new Date(Number(ym[0]), Number(ym[1]), 1);
    return { ini: ini.getTime(), fim: fim.getTime(), rot: 'Mês ' + ym[1] + '/' + ym[0] };
  }
  return relIntervalo(cod);
}
/* Vendas do período, juntando os meses arquivados na planilha (sem repetir) — sem mexer nas listas do app. */
async function dadosPeriodoExport_(p){
  let vs = vendas, is = itensVenda, ps = pagamentosVenda;
  const meses = relMesesArq_(p);
  if(meses.length){
    const cs = [];
    for(let i=0; i<meses.length; i+=2) cs.push(...await Promise.all(meses.slice(i, i+2).map(relBuscarMes_)));
    const vi = new Set(vs.map(x=>x.id)), ii = new Set(is.map(x=>x.id)), pi = new Set(ps.map(x=>x.id));
    cs.forEach(c=>{ vs = vs.concat(c.vendas.filter(x=>!vi.has(x.id) && vi.add(x.id))); is = is.concat(c.itens.filter(x=>!ii.has(x.id) && ii.add(x.id))); ps = ps.concat(c.pagamentos.filter(x=>!pi.has(x.id) && pi.add(x.id))); });
  }
  return { vendas: vs.filter(v=>v.timestamp>=p.ini && v.timestamp<p.fim).sort((a,b)=>a.timestamp-b.timestamp), itens: is, pagamentos: ps };
}
async function exportarComAviso_(fn){
  if(!iniciarOperacaoUnica('exportCsv')) return;
  try{ showMsg('relMsg','Preparando o arquivo…','ok'); await fn(); }
  catch(e){ showMsg('relMsg','Não foi possível montar o arquivo agora. Tente de novo.','warn'); }
  finally { finalizarOperacaoUnica('exportCsv'); }
}
function baixarRelatorioCsv(){
  if(!ultimoRel || !ultimoRel.res) return showMsg('relMsg','Escolha um relatório primeiro.','warn');
  const r = ultimoRel.res, p = ultimoRel.p;
  baixarCsv_(nomeArquivoCsv_('relatorio-' + String(ultimoRel.def.t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''), p), r.cols, r.rows.concat(r.total ? [r.total] : []));
  showMsg('relMsg','Arquivo baixado.','ok');
}
function exportarVendasCsv(){ return exportarComAviso_(async ()=>{
  const p = periodoExport_(); if(!p) return showMsg('relMsg','Escolha o mês.','warn');
  const d = await dadosPeriodoExport_(p);
  const itensPor = {}; d.itens.forEach(i=>{ (itensPor[i.vendaId] = itensPor[i.vendaId] || []).push(i.quantidade + 'x ' + i.descricao); });
  const pagPor = {}; d.pagamentos.forEach(x=>{ (pagPor[x.vendaId] = pagPor[x.vendaId] || []).push(x.forma + ': ' + csvNum_(x.valor)); });
  const linhas = d.vendas.map(v=>[ v.numero||'', v.data, v.clienteNome||'', v.clienteTelefone||'', v.tipoEntrega, v.origem, v.status, v.statusPagamento, (pagPor[v.id]||[v.formaPagamento||'']).join(' + '),
    (itensPor[v.id]||[]).join(' | '), csvNum_(v.valorOriginal), csvNum_(v.valorDesconto), csvNum_(v.taxaEntrega), csvNum_(v.acrescimoForma), csvNum_(v.valorTotal), csvNum_(v.custoTotal), v.entregador||'', v.motivoCancelamento||'' ]);
  baixarCsv_(nomeArquivoCsv_('vendas', p), ['Pedido','Data e hora','Cliente','Telefone','Tipo','Origem','Situação','Pagamento','Forma(s) de pagamento','Itens','Subtotal','Desconto','Taxa de entrega','Acréscimo da forma','Total','Custo','Entregador','Motivo do cancelamento'], linhas);
  showMsg('relMsg', linhas.length + ' venda(s) no arquivo.', 'ok');
}); }
function exportarItensCsv(){ return exportarComAviso_(async ()=>{
  const p = periodoExport_(); if(!p) return showMsg('relMsg','Escolha o mês.','warn');
  const d = await dadosPeriodoExport_(p);
  const vPor = {}; d.vendas.forEach(v=>{ vPor[v.id] = v; });
  const linhas = d.itens.filter(i=>vPor[i.vendaId]).map(i=>{ const v = vPor[i.vendaId]; return [ v.numero||'', v.data, i.descricao, i.quantidade, csvNum_(i.valorUnitario), csvNum_(i.valorTotalItem), v.tipoEntrega, v.status ]; });
  baixarCsv_(nomeArquivoCsv_('itens-vendidos', p), ['Pedido','Data e hora','Item','Quantidade','Valor unitário','Total do item','Tipo','Situação'], linhas);
  showMsg('relMsg', linhas.length + ' item(ns) no arquivo.', 'ok');
}); }
function exportarDespesasCsv(){ return exportarComAviso_(async ()=>{
  const p = periodoExport_(); if(!p) return showMsg('relMsg','Escolha o mês.','warn');
  const linhas = despesas.filter(x=>x.timestamp>=p.ini && x.timestamp<p.fim).sort((a,b)=>a.timestamp-b.timestamp).map(x=>[ x.data, x.descricao, x.categoria, csvNum_(x.valor), x.situacao, String(x.vencimento||'').slice(0,10), x.competencia||'', x.saiuDoCaixa?'Sim':'Não', x.status, x.observacao||'', x.motivoCancelamento||'' ]);
  baixarCsv_(nomeArquivoCsv_('despesas', p), ['Data','Descrição','Categoria','Valor','Situação','Vencimento','Competência','Saiu do caixa','Status','Observação','Motivo do cancelamento'], linhas);
  showMsg('relMsg', linhas.length + ' despesa(s) no arquivo.', 'ok');
}); }
function copiarRel(){ copiarTextoComFallback(ultimoRelTexto, 'relMsg'); }
function whatsappRel(){ window.open('https://wa.me/?text=' + encodeURIComponent(ultimoRelTexto), '_blank'); }

/* D17 — Visão geral com período antigo: busca os meses arquivados (mesmo mecanismo dos Relatórios) antes de desenhar. */
async function renderVisaoGeral(){
  const sel0 = document.getElementById('vgPeriodo'), box0 = document.getElementById('vgConteudo');
  if(sel0 && box0 && sel0.options.length){
    const meses = relMesesArq_(relIntervalo(sel0.value));
    if(meses.length){
      const cod = sel0.value, cs = [];
      try{
        for(let i=0; i<meses.length; i+=2){
          box0.innerHTML = '<div class="notif-empty">Buscando dados antigos… ' + Math.min(i+2, meses.length) + ' de ' + meses.length + ' meses</div>';
          cs.push(...await Promise.all(meses.slice(i, i+2).map(relBuscarMes_)));
          if(sel0.value !== cod) return;
        }
      }catch(e){
        box0.innerHTML = '<div class="notif-empty">Parte deste período está arquivada e não foi carregada. Os totais podem estar incompletos.<br><button type="button" class="ghost" onclick="renderVisaoGeral()">Tentar de novo</button></div>';
        return;
      }
      const bk = [vendas, itensVenda, pagamentosVenda], vi = new Set(vendas.map(x=>x.id)), ii = new Set(itensVenda.map(x=>x.id)), pi = new Set(pagamentosVenda.map(x=>x.id));
      try{
        cs.forEach(c=>{ vendas = vendas.concat(c.vendas.filter(x=>!vi.has(x.id) && vi.add(x.id))); itensVenda = itensVenda.concat(c.itens.filter(x=>!ii.has(x.id) && ii.add(x.id))); pagamentosVenda = pagamentosVenda.concat(c.pagamentos.filter(x=>!pi.has(x.id) && pi.add(x.id))); });
        renderVisaoGeralBase_();
      } finally { vendas = bk[0]; itensVenda = bk[1]; pagamentosVenda = bk[2]; }
      return;
    }
  }
  return renderVisaoGeralBase_();
}
function renderVisaoGeralBase_(){
  const box = document.getElementById('vgConteudo'); if(!box) return;
  const sel = document.getElementById('vgPeriodo'); if(!sel.options.length){ sel.innerHTML = PERIODOS_REL; sel.value = 'mes'; }
  const p = relIntervalo(sel.value), r = resumoPeriodo(p), S = (rot, val, cls) => `<div class="stat-box ${cls||''}"><b>${val}</b><span>${rot}</span></div>`;
  const andamento = vendas.filter(v=>v.status==='Confirmada' && ['Recebido','Em preparo','Pronta','Saiu para entrega'].includes(v.statusPedido));
  const baixos = estoque.filter(e=>e.ativo && Number(e.minimo)>0 && Number(e.quantidade)<=Number(e.minimo));
  const hojeISO = dataLocalISO(new Date());
  const vencidas = despesas.filter(d=>d.status==='Confirmada' && d.situacao==='A pagar' && /^\d{4}-\d{2}-\d{2}/.test(d.vencimento||'') && d.vencimento.slice(0,10) < hojeISO);
  const receber = vendas.filter(v=>v.status==='Confirmada' && v.statusPagamento==='A Receber');
  const alertas = [];
  { const ce = caixaEstado_(); if(ce && ce.liberado) alertas.push(`🔓 Caixa vencido liberado por ${escR(sessaoCaixa.liberadoPor||'Admin')} até ${caixaHora_(sessaoCaixa.liberadoAte)}${sessaoCaixa.liberadoMotivo?' — motivo: '+escR(sessaoCaixa.liberadoMotivo):''}`); else if(ce && ce.passou) alertas.push('⛔ Caixa vencido: venda nova de balcão e de mesa está bloqueada. Feche o caixa em Caixa.'); }
  if(baixos.length) alertas.push(`📦 ${baixos.length} ingrediente(s) no mínimo ou abaixo: ${escR(baixos.slice(0,5).map(e=>e.nome).join(', '))}${baixos.length>5?'…':''}`);
  if(vencidas.length) alertas.push(`💸 ${vencidas.length} despesa(s) vencida(s), total ${formatarMoeda(somaR(vencidas,d=>d.valor))}`);
  if(receber.length) alertas.push(`🧾 ${receber.length} pedido(s) a receber, total ${formatarMoeda(somaR(receber,v=>v.valorTotal))}`);
  const rua = andamento.filter(v=>v.statusPedido==='Saiu para entrega').length; if(rua) alertas.push(`🛵 ${rua} entrega(s) na rua agora`);
  const cont = grp(andamento, v=>v.statusPedido);
  const rank = tabelaItens(linhasItens(r, i=>true), 'q', 5).rows;
  const dias = {}; r.vs.forEach(v=>{ const k = diaDoTurno_(v.timestamp); dias[k] = (dias[k]||0) + (Number(v.valorTotal)||0); });
  const serie = []; if(p.dias>1 && p.dias<=31) for(let t=p.ini; t<p.fim; t+=86400000){ const k = dataLocalISO(new Date(t)); serie.push([k, dias[k]||0]); }
  const maxD = Math.max(1, ...serie.map(x=>x[1]));
  const metaMes = metas.mensal>0 ? (()=>{ const m = new Date(); const fat = calcularDRE(m.getFullYear(), m.getMonth()+1).receitaLiquida; return `<div class="info-line">• Meta do mês: ${formatarMoeda(fat)} de ${formatarMoeda(metas.mensal)} (${fmtPct(pctDe(fat, metas.mensal))})</div>`; })() : '';
  box.innerHTML = `<div class="vg-stats" style="--vg-cols:${r.impostos>0 ? 5 : 4};"><div class="stat-row mt-3">${S('FATURAMENTO', formatarMoeda(r.liq), 'lucro')}${S('PEDIDOS', r.vs.length)}${S('TICKET MÉDIO', formatarMoeda(r.ticket))}</div>
    <div class="stat-row mt-2">${S('CUSTOS', formatarMoeda(r.cmv), 'saida')}${S('TAXAS', formatarMoeda(r.taxas), 'saida')}${S('DESPESAS', formatarMoeda(r.despTot), 'saida')}</div>
    <div class="stat-row mt-2">${r.impostos>0 ? S('IMPOSTOS (ESTIMADO)', formatarMoeda(r.impostos), 'saida') : ''}${S('LUCRO (RESULTADO)', formatarMoeda(r.resultado), r.resultado>=0?'entrada':'saida')}${S('MARGEM', fmtPct(r.margem), r.resultado>=0?'entrada':'saida')}</div></div>${(r.liq > 0 && typeof cfProdutosSemCusto_ === 'function' && cfProdutosSemCusto_().length) ? `<div class="cf-aviso mt-3">⚠️ ${cfProdutosSemCusto_().length} produto(s) sem custo cadastrado: os custos estão menores e o lucro e a margem, maiores do que a realidade. Complete em Produtos → Produtos, combos e adicionais.</div>` : ''}${metaMes}
    ${serie.length ? `<div class="mt-3"><div class="obs-line">Faturamento por dia</div><div style="display:flex;align-items:flex-end;gap:2px;height:70px;margin-top:6px;">${serie.map(([k,v])=>`<div title="${fmtDiaISO(k)}: ${formatarMoeda(v)}" style="flex:1;background:var(--gold);border-radius:2px 2px 0 0;height:${Math.max(3, v/maxD*100)}%;opacity:${v?1:.25};"></div>`).join('')}</div><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);"><span>${fmtDiaISO(serie[0][0]).slice(0,5)}</span><span>${fmtDiaISO(serie[serie.length-1][0]).slice(0,5)}</span></div></div>` : ''}
    <div class="modal-section"><h3>Agora</h3>
      <div class="info-line">• Caixa: ${sessaoCaixa ? 'aberto desde '+escR(sessaoCaixa.abertura)+' (fundo '+formatarMoeda(sessaoCaixa.fundoCaixa)+')' : 'fechado'}</div>
      <div class="info-line">• Pedidos em andamento: ${andamento.length ? Object.keys(cont).map(k=>k+': '+cont[k].length).join(' · ') : 'nenhum'}</div></div>
    <div class="modal-section"><h3>Alertas</h3>${alertas.length ? alertas.map(a=>`<div class="info-line">• ${a}</div>`).join('') : '<div class="notif-empty">Tudo em ordem.</div>'}</div>
    <div class="modal-section"><h3>Mais vendidos no período</h3>${rank.length ? `<table><tbody>${rank.map((x,i)=>`<tr><td>${i+1}º ${escR(x[0])}</td><td class="txt-dir">${x[1]}</td></tr>`).join('')}</tbody></table>` : '<div class="notif-empty">Sem vendas no período.</div>'}</div>`;
}

/* Cada tela é desenhada separadamente: se uma falhar (dado inesperado), as demais continuam — antes, um erro no meio da cadeia
   impedia que as telas seguintes (como a da Cozinha) fossem desenhadas. */
function _desenhar(fn){ try{ fn(); }catch(e){ console.warn('Falha ao desenhar uma tela:', e); } }
function renderizarTudo(){
  setTimeout(()=>{ try{ cdChipAtualizar_(); }catch(e){} }, 0);
  _desenhar(()=>renderInicio());
  _desenhar(()=>renderMesasPopup_()); _desenhar(()=>atualizarAlertaMesas_());
  const _secAtiva = (document.querySelector('section.tab.active')||{}).id || '';
  if(_secAtiva==='tab-visaogeral') _desenhar(()=>renderVisaoGeral());
  if(_secAtiva==='tab-relatorios') _desenhar(()=>renderRelatorio());
  _desenhar(()=>renderDesempenhoEntregas());
  if(!formaPrecoAtual && formasPagamento.length) formaPrecoAtual = (formasPagamento.find(f=>f.ativa) || formasPagamento[0]).id;
  _desenhar(()=>renderFormasPagamento()); _desenhar(()=>popularSelectFormaPreco()); _desenhar(()=>renderFormaCuradoria());
  _desenhar(()=>renderCategorias()); _desenhar(()=>popularCategoriaSelects()); _desenhar(()=>renderAdicionais()); _desenhar(()=>popularSelectAdicionalIngrediente()); _desenhar(()=>renderAdicionaisChecklist('pAdicionaisLista', []));
  _desenhar(()=>renderPrecosExcecoes('p')); _desenhar(()=>renderPrecosExcecoes('ko'));
  _desenhar(()=>renderClientes()); _desenhar(()=>renderProdutos()); _desenhar(()=>popularSelectProdutos()); _desenhar(()=>renderProdutoCuradoria()); _desenhar(()=>renderCombos()); _desenhar(()=>popularSelectCombos()); _desenhar(()=>renderComboCuradoria()); _desenhar(()=>renderEstoque()); _desenhar(()=>renderMovimentacoesEstoque());
  _desenhar(()=>popularSelectIngredientes('pIngredienteSelect')); _desenhar(()=>popularSelectIngredientes('ppIngredienteSelect'));
  _desenhar(()=>popularSelectProdutosParaCombo('koProdutoSelect')); _desenhar(()=>popularSelectProdutosParaCombo('kkProdutoSelect'));
  _desenhar(()=>renderVendas()); _desenhar(()=>renderDespesas()); _desenhar(()=>renderAjustes()); _desenhar(()=>renderContasPagar()); _desenhar(()=>renderDespesasRecorrentes()); _desenhar(()=>renderResumoPrevisto()); _desenhar(()=>renderFluxoPrevisto()); _desenhar(()=>atualizarMargemPreview()); _desenhar(()=>atualizarMargemPreviewCombo());
  _desenhar(()=>atualizarMetaUI()); _desenhar(()=>atualizarResumoHoje()); if(_secAtiva==='tab-relatorios') _desenhar(()=>gerarRelatorio()); _desenhar(()=>renderNotificacoes()); _desenhar(()=>renderPedidos()); _desenhar(()=>renderEntregas()); _desenhar(()=>renderMeusGanhos());
  _desenhar(()=>renderStatusCaixa()); _desenhar(()=>renderHistoricoCaixa()); _desenhar(()=>renderUsuarios()); _desenhar(()=>devPopularVisoes_()); _desenhar(()=>renderLog()); _desenhar(()=>renderFeedbacks()); _desenhar(()=>renderConfigCardapio());
  _desenhar(()=>renderMesas()); _desenhar(()=>renderMesasPickerCaixa());
}

/* ============================================================
   CARDÁPIO DIGITAL PÚBLICO (ITEM 3, 13-20, 34)
   ============================================================ */
let cdDados = null;
let cdCategoriaAtiva = 'todas';
let cdCarrinho = []; // {tipo:'produto'|'combo', id, nome, precoBase, qtd, adicionais:[{id,nome,preco}]}
let cdItemAtual = null; // item sendo configurado no modal

function abrirAreaFuncionarios(){
  document.getElementById('cardapioPublico').classList.add('hidden');
  document.getElementById('cdFabCarrinho').classList.remove('show');
  document.getElementById('lockScreen').classList.remove('hidden');
  document.getElementById('loginUsuario').focus();
}
function fecharAreaFuncionarios(){
  document.getElementById('lockScreen').classList.add('hidden');
  document.getElementById('cardapioPublico').classList.remove('hidden');
}

