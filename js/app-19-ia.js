
(function(){
  'use strict';
  if(window.IA) return;
  const IA = window.IA = {};
  const TTL = 10 * 60 * 1000;               // cache local curto (resposta igual em 10 min não chama o servidor)
  const cache = new Map(), voando = new Map();
  let falhasSeguidas = 0, pausadoAte = 0, ultimoStatus = null, ultimosAlertas = 0;

  /* ---------- IA-03: escape de tudo que vem do servidor/IA ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"'`]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c]));
  const brl = n => (typeof formatarMoeda === 'function') ? formatarMoeda(Number(n) || 0) : new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n) || 0);
  const pct = n => (Number(n) || 0).toLocaleString('pt-BR',{maximumFractionDigits:1}) + '%';
  const $ = id => document.getElementById(id);
  const podeUsar = () => !!(typeof currentUser !== 'undefined' && currentUser && (currentUser.nivel === 'Admin' || currentUser.nivel === 'Operador'));
  const ehDevReal = () => !!(typeof currentUser !== 'undefined' && currentUser && currentUser.nivelReal === 'Desenvolvedor' && !currentUser.verComo);   // o gateway confere de novo no banco
  const ehAdmin = () => !!(typeof currentUser !== 'undefined' && currentUser && currentUser.nivel === 'Admin');

  /* ---------- IA-01: infraestrutura central ---------- */
  async function token(){
    let s = sbSessaoLer_(); if(!s) throw new Error('sem_sessao');
    if(Date.now() > s.expira){ if(!(await sbRenovar_())) throw new Error('sem_sessao'); s = sbSessaoLer_(); }
    return s.access_token;
  }
  IA.chamar = function(acao, extra, opcoes){
    opcoes = opcoes || {}; extra = extra || {};
    const chave = acao + '|' + JSON.stringify(extra);
    const c = cache.get(chave);
    if(c && !opcoes.forcar && Date.now() - c.t < (opcoes.ttl || TTL)) return Promise.resolve(c.v);
    if(voando.has(chave)) return voando.get(chave);                         // clique duplo = uma chamada só
    if(navigator.onLine === false) return Promise.resolve({ ok:false, codigo:'offline' });
    if(Date.now() < pausadoAte) return Promise.resolve({ ok:false, codigo:'pausado' });
    const p = (async () => {
      try{
        const t = await token();
        const r = await sbJson_(SUPABASE_URL_ + '/functions/v1/ai-gateway', { method:'POST',
          headers:{ Authorization:'Bearer ' + t, apikey:SUPABASE_CHAVE_, 'Content-Type':'application/json' },
          body: JSON.stringify(Object.assign({ acao }, extra)) }, 45000);
        const j = await r.json().catch(() => ({ ok:false, codigo:'resposta_invalida' }));
        if(r.status >= 500 || (j && j.codigo === 'resposta_invalida')) throw new Error('servidor');
        falhasSeguidas = 0;
        if(j && j.ok && (j.texto || acao === 'status' || acao === 'alertas' || (j.dados))) cache.set(chave, { t:Date.now(), v:j });
        return j;
      }catch(e){
        /* IA-02: circuit breaker do lado do cliente — 3 falhas seguidas pausam a IA por 2 min (o sistema segue normal) */
        if(String(e && e.message) === 'sem_sessao') return { ok:false, codigo:'sessao' };
        if(++falhasSeguidas >= 3){ pausadoAte = Date.now() + 120000; falhasSeguidas = 0; }
        return { ok:false, codigo:'rede' };
      }finally{ voando.delete(chave); }
    })();
    voando.set(chave, p); return p;
  };
  const MSG = { offline:'Sem internet. A IA volta quando a conexão voltar.', pausado:'A IA está em pausa por alguns minutos por causa de falhas seguidas. O restante do sistema funciona normal.',
    sessao:'Sua sessão expirou. Entre de novo.', rede:'Não consegui falar com a IA agora. O restante do sistema funciona normal.', sem_permissao:'Seu perfil não tem acesso a este recurso.',
    limite:'Muitas consultas seguidas. Aguarde um minuto.', recurso_operador:'Este recurso de IA é liberado só para o Administrador.', pergunta_vazia:'Escreva uma pergunta.', sql:'Não consegui ler os dados agora.' };
  const msgErro = r => (r && (MSG[r.codigo] || r.message)) || 'Não foi possível concluir agora.';

  /* ---------- renderizadores (tudo escapado) ---------- */
  function htmlResposta(r){
    if(!r || !r.ok) return '<p class="ia-erro">' + esc(msgErro(r)) + '</p>';
    let h = '';
    if(r.texto) h += '<div class="ia-texto">' + esc(r.texto) + '</div>';
    if(r.destaques && r.destaques.length) h += '<ul class="ia-lista">' + r.destaques.map(d => '<li>' + esc(d) + '</li>').join('') + '</ul>';
    if(r.resumo) h += '<div class="ia-texto">' + esc(r.resumo) + '</div>';
    if(r.problemas && r.problemas.length) h += r.problemas.map(p => '<div class="ia-alerta ' + esc(p.gravidade) + '">' + (ICONE[p.gravidade] || '🔵') + ' <b>' + esc(p.titulo) + '</b>' +
      ((p.evidencia || []).length ? '<ul class="ia-lista">' + p.evidencia.map(e => '<li>' + esc(e) + '</li>').join('') + '</ul>' : '') +
      '<div class="ia-sub">Causa provável</div>' + esc(p.causa_provavel) + '<div class="ia-sub">Solução sugerida</div>' + esc(p.solucao_sugerida) + '</div>').join('');
    if(r.saudavel) h += '<p class="ia-sub">✅ Nenhum problema encontrado nos dados lidos.</p>';
    if(r.acao === 'diagnostico' && r.ia) h += '<p class="ia-rodape">🔒 Diagnóstico somente leitura: a IA não altera nada. Para corrigir, peça no chat.</p>';
    if(r.passos && r.passos.length) h += '<ol class="ia-lista">' + r.passos.map(d => '<li>' + esc(d) + '</li>').join('') + '</ol>';
    if(r.topicos && r.topicos.length) h += '<p class="ia-rodape">Baseado no manual: ' + r.topicos.map(esc).join(' · ') + '</p>';
    if(r.causas_possiveis && r.causas_possiveis.length) h += '<div class="ia-sub">Possíveis causas (não confirmadas)</div><ul class="ia-lista">' + r.causas_possiveis.map(d => '<li>' + esc(d) + '</li>').join('') + '</ul>';
    if(r.aviso) h += '<p class="ia-aviso">' + esc(r.aviso) + '</p>';
    if(r.ia) h += '<p class="ia-rodape">✨ Texto gerado por IA' + (r.cache ? ' (reaproveitado)' : '') + '. Os números vêm do sistema — confira antes de decidir.</p>';
    return h;
  }
  function htmlResumo(d){
    if(!d || !d.resumo || !d.resumo.ok) return '';
    const r = d.resumo, k = (t, v) => '<div class="ia-kpi"><b>' + esc(v) + '</b><span>' + esc(t) + '</span></div>';
    let h = '<div class="ia-kpis">' + k('Faturamento', brl(r.faturamento)) + k('Pedidos', r.pedidos) + k('Ticket médio', r.ticket_medio != null ? brl(r.ticket_medio) : '—') + k('Cancelados', r.cancelados);
    if(Number(r.custo) > 0 && r.margem_pct != null) h += k('Margem bruta', pct(r.margem_pct));
    h += '</div>';
    if(Number(r.faturamento) > 0 && !(Number(r.custo) > 0)) h += '<p class="ia-aviso">Custos dos produtos não cadastrados: margem e lucro não são exibidos.</p>';
    const c = d.comparativo;
    if(c && c.ok && c.var_faturamento_pct != null) h += '<p class="ia-sub">Faturamento vs período anterior equivalente: ' + esc((c.var_faturamento_pct > 0 ? '+' : '') + pct(c.var_faturamento_pct)) + '</p>';
    return h;
  }
  function htmlDiag(d){
    if(!d || !d.ok) return '';
    const k = (t, v) => '<div class="ia-kpi"><b>' + esc(v) + '</b><span>' + esc(t) + '</span></div>', fl = d.fila || {}, sy = d.sync || {}, bk = (d.backups || [])[0];
    return '<div class="ia-kpis">' + k('Fila pendente (principal)', fl.pendentes_principal != null ? fl.pendentes_principal : '—') + k('Fila pendente (contingência)', fl.pendentes_contingencia != null ? fl.pendentes_contingencia : '—') +
      k('Atraso da contingência (min)', sy.contingencia_atraso_min != null ? sy.contingencia_atraso_min : '—') + k('Banco (MB)', d.banco && d.banco.tamanho_mb != null ? d.banco.tamanho_mb : '—') +
      k('Último backup', bk ? bk.status : '—') + k('Erros de JavaScript (48 h)', d.erros_js_total_48h != null ? d.erros_js_total_48h : '—') + '</div>';
  }
  const ICONE = { alta:'🔴', media:'🟠', baixa:'🔵', info:'🔵' };
  function valorAlerta(a){
    const c = a.codigo, dinheiro = ['FATURAMENTO_BAIXO','FATURAMENTO_ALTO','CAIXA_DIFERENCA','CONTAS_VENCIDAS','A_RECEBER_ANTIGO'];
    return c === 'MARGEM_EM_QUEDA' ? pct(a.valor) : dinheiro.indexOf(c) !== -1 ? brl(a.valor) : String(Math.round(Number(a.valor) || 0));
  }
  function htmlAlertas(d){
    const a = d && d.anomalias; if(!a || !a.ok) return '';
    if(!(a.alertas || []).length) return '<p class="ia-sub">✅ Nada fora do normal encontrado.</p>';
    return a.alertas.map(x => '<div class="ia-alerta ' + esc(x.severidade) + '">' + (ICONE[x.severidade] || '🔵') + ' ' + esc(x.titulo) + ': <b>' + esc(valorAlerta(x)) + '</b>' +
      (Array.isArray(x.detalhe) ? '<div class="ia-sub">' + x.detalhe.map(esc).join(', ') + '</div>' : '') + '</div>').join('');
  }
  function htmlCompras(d){
    const c = d && d.compras; if(!c || !c.ok) return '';
    if(!(c.itens || []).length) return '<p class="ia-sub">✅ Nenhuma reposição necessária agora.</p>';
    return '<table class="ia-tabela"><tr><th>Item</th><th>Estoque</th><th>Dias</th><th>Sugerido</th></tr>' + c.itens.map(i =>
      '<tr><td>' + esc(i.ingrediente) + '</td><td>' + esc(i.em_estoque + ' ' + i.unidade) + '</td><td>' + (i.dias_restantes != null ? esc(i.dias_restantes) : '—') + '</td><td><b>' + esc(i.sugerido + ' ' + i.unidade) + '</b></td></tr>').join('') +
      '</table><p class="ia-sub">Custo estimado da reposição: ' + esc(brl(c.custo_total_estimado)) + ' (usa o custo unitário cadastrado no estoque).</p>';
  }
  async function executar(btn, saida, acao, extra, montar, opc){
    if(!saida) return; const rot = btn ? btn.textContent : '';
    if(btn){ btn.disabled = true; btn.textContent = 'Analisando…'; }
    saida.innerHTML = '<p class="ia-sub">⏳ Consultando os dados…</p>';
    const r = await IA.chamar(acao, extra, opc);
    saida.innerHTML = (r && r.ok ? montar(r.dados) : '') + htmlResposta(r);
    if(btn){ btn.disabled = false; btn.textContent = rot; }
    return r;
  }

  IA.carregarPainel = async function(){
    const box = $('iaPainelSaida'); if(!box || !ehAdmin()) return; box.innerHTML = '<p class="ia-sub">⏳ Lendo…</p>';
    try{
      const tk = await token();
      const r = await sbJson_(SUPABASE_URL_ + '/rest/v1/rpc/ia_painel_uso', { method:'POST', headers:{ apikey:SUPABASE_CHAVE_, Authorization:'Bearer ' + tk, 'Content-Type':'application/json' }, body:'{}' }, 15000);
      const j = await r.json(); if(!j || !j.ok) throw new Error('x');
      const k = (t, v) => '<div class="ia-kpi"><b>' + esc(v) + '</b><span>' + esc(t) + '</span></div>';
      const hoje = (j.hoje || []).map(x => k('Hoje · ' + x.provedor, x.chamadas + ' chamadas' + (x.erros ? ' (' + x.erros + ' erros)' : ''))).join('') || k('Hoje', 'nenhuma chamada');
      box.innerHTML = '<div class="ia-kpis">' + hoje + k('Últimos 7 dias', j.ultimos_7_dias + ' chamadas') + k('Erros (24 h)', j.erros_24h) + k('Reaproveitadas do cache (24 h)', j.cache_24h) + '</div>';
    }catch(e){ box.innerHTML = '<p class="ia-erro">Não foi possível ler o uso agora.</p>'; }
  };
  /* "Testar cada IA": lista só as que têm chave cadastrada; cada uma com seu botão, e um para testar todas */
  IA.montarTeste = async function(){
    const box = $('iaTesteBox'); if(!box || !ehAdmin()) return;
    let lista = [];
    try{ const r = await apiCall('listarChavesIa', {}); if(r && r.ok){ lista = ['groq','groq_2','nvidia','cloudflare','gemini','gemini_2']; } }catch(e){}
    if(!lista.length){ box.innerHTML = '<p class="ia-sub">Nenhuma chave de IA cadastrada para testar (Administrador → Sistema → Integrações e contas).</p>'; return; }
    const nomes = { groq:'Groq', groq_2:'Groq 2', nvidia:'NVIDIA', cloudflare:'Cloudflare', gemini:'Gemini (Google) · Chat', gemini_2:'Gemini 2 (Google) · Chat' };
    box.innerHTML = '<h3 style="margin:14px 0 4px;">🧪 Testar as IAs</h3><p class="ia-sub">Faz uma pergunta mínima a cada IA para ver se a chave está funcionando. Não gasta as consultas do dia.</p>' +
      lista.map(pv => '<div class="notif-card"><div><b>' + esc(nomes[pv] || pv) + '</b></div><div class="obs-line" id="testeIaM_' + pv + '">Ainda não testada nesta tela.</div><div class="btnrow mt-2"><button class="ghost" type="button" data-teste-ia="' + pv + '">' + 'Testar' + '</button></div></div>').join('') +
      '<div class="btnrow"><button class="primary" type="button" id="iaTesteTodas">Testar todas</button></div>';
    box.querySelectorAll('[data-teste-ia]').forEach(b => b.addEventListener('click', () => testarChaveIa_(b.getAttribute('data-teste-ia'), 'testeIaM_' + b.getAttribute('data-teste-ia'), b)));
    $('iaTesteTodas').addEventListener('click', e => testarTodasIas_(lista, e.currentTarget, 'testeIaM_'));
  };
  function montarBolinha(){
    let b = $('iaDot');
    if(!b){ return;   /* o status da IA fica no cabeçalho do balão */
      const ref = $('avisosBtnTopo') || $('connDot'); if(!ref) return;
      b = document.createElement('button'); b.id = 'iaDot'; b.type = 'button'; b.className = 'ia-dot desligada'; b.title = 'Status da IA'; b.setAttribute('aria-label','Status da IA');
      b.innerHTML = '<span>✨</span><i></i>'; b.addEventListener('click', IA.abrirStatus); ref.insertAdjacentElement('beforebegin', b);
    }
    b.classList.toggle('visivel', podeUsar());
  }
  function pintarBolinha(st){
    const b = $('iaDot'); if(!b) return;
    b.classList.remove('normal','reserva','indisponivel','desligada');
    b.classList.add(st && st.ok ? (st.ia_ligada ? (st.circuito === 'normal' || st.circuito === 'reserva' ? 'normal' : st.circuito) : 'desligada') : 'indisponivel');
  }
  IA.atualizarStatus = async function(){
    if(!podeUsar()) return null;
    const r = await IA.chamar('status', {}, { forcar:true, ttl:1 }); ultimoStatus = r; pintarBolinha(r); return r;
  };
  const ROT_CIRC = { normal:'Funcionando', reserva:'Usando o provedor reserva', indisponivel:'Indisponível (sistema segue normal)', desligada:'Desligada' };
  IA.abrirStatus = async function(){
    let m = $('iaStatusModal');
    if(!m){
      m = document.createElement('div'); m.className = 'modal-overlay'; m.id = 'iaStatusModal';
      m.innerHTML = '<div class="modal-box"><div class="modal-header"><h2><span class="tex-av g" role="img" aria-label="' + ASSISTENTE_H_() + '"></span> ' + ASSISTENTE_H_() + ' · Assistente de IA</h2><button class="close-btn" type="button" id="iaStatusFechar">✕</button></div><div id="iaStatusCorpo"></div></div>';
      document.body.appendChild(m); $('iaStatusFechar').addEventListener('click', () => m.classList.remove('open'));
    }
    m.classList.add('open'); const corpo = $('iaStatusCorpo'); corpo.innerHTML = '<p class="ia-sub">⏳ Verificando…</p>';
    const r = await IA.atualizarStatus();
    if(!r || !r.ok){ corpo.innerHTML = htmlResposta(r); return; }
    const c = r.cota || {};
    corpo.innerHTML = '<p>Estado: <b>' + esc(r.ia_ligada ? (ROT_CIRC[r.circuito] || r.circuito) : ROT_CIRC.desligada) + '</b></p>' +
      (c.ok ? '<p class="ia-sub">Consultas de IA restantes hoje: ' + esc(c.restante_usuario) + ' (suas) · ' + esc(c.restante_global) + ' (restaurante)</p>' : '<p class="ia-aviso">Cota diária de IA atingida.</p>') +
      '<p class="ia-sub">O restaurante opera normalmente com a IA desligada ou fora do ar.</p>' +
      (ehAdmin() ? '<div class="ia-linha"><button class="primary ia-btn" type="button" id="iaToggle">' + (r.ia_ligada ? 'Desligar IA' : 'Ligar IA') + '</button></div><div id="iaToggleMsg"></div><div id="iaPainelSaida"></div><div id="iaTesteBox"></div>' : '');
    if(ehAdmin()){ IA.carregarPainel(); IA.montarTeste(); }
    const t = $('iaToggle'); if(t) t.addEventListener('click', async () => {
      t.disabled = true;
      try{
        const tk = await token();
        const x = await sbJson_(SUPABASE_URL_ + '/rest/v1/ai_config?id=eq.true', { method:'PATCH', headers:{ apikey:SUPABASE_CHAVE_, Authorization:'Bearer ' + tk, 'Content-Type':'application/json', Prefer:'return=minimal' },
          body: JSON.stringify({ ia_ligada: !r.ia_ligada, atualizado_em: new Date().toISOString() }) }, 15000);
        if(!x.ok) throw new Error('falha');
        cache.clear(); await IA.abrirStatus();
      }catch(e){ $('iaToggleMsg').innerHTML = '<p class="ia-erro">Não foi possível alterar agora.</p>'; t.disabled = false; }
    });
  };

  /* ---------- montagem e ganchos (envolvem funções existentes sem trocar o comportamento delas) ---------- */
  IA.montar = function(){ try{ montarBolinha(); }catch(e){ console.warn('IA.montar', e); } };
  function envolver(nome, depois){
    const orig = window[nome]; if(typeof orig !== 'function' || orig.__ia) return;
    const nova = function(){ const r = orig.apply(this, arguments); try{ depois.apply(this, arguments); }catch(e){} return r; };
    nova.__ia = true; window[nome] = nova;
  }
  envolver('entrarNoApp', () => { setTimeout(() => { IA.montar(); IA.atualizarStatus(); }, 1500); });
  envolver('aplicarPermissoesNivel', () => { IA.montar(); });
  if(typeof window.sair === 'function' && !window.sair.__ia){
    const so = window.sair; window.sair = async function(){ cache.clear(); ultimoStatus = null; const b = $('iaDot'); if(b) b.classList.remove('visivel'); const c = $('iaInicioCard'); if(c) c.remove(); return so.apply(this, arguments); };
    window.sair.__ia = true;
  }
  /* A IA só é acessada pelo balão do Tex: não existe tela "Pergunte à IA" no Administrador. */
  IA.html = { resposta:htmlResposta, resumo:htmlResumo, diag:htmlDiag, alertas:htmlAlertas, compras:htmlCompras };
  IA.msgErro = msgErro; IA.podeUsar = podeUsar; IA.ehAdmin = ehAdmin;
})();

/* =====================================================================
   FASE 3 — Balão público de atendimento (cardápio)
   Aditivo: reaproveita sbRpcPublico_, sbJson_, escH, cdDados e as funções chat_* do Supabase.
   FAQ e busca de produto NÃO usam IA. A IA só recepciona (máx. 3 chamadas) e nunca depois da transferência.
   ===================================================================== */
(function(){
  'use strict';
  const KEY = 'txb_chat_publico_v1';
  const TIPOS = [['atraso','⏱️ Atraso'],['item_errado','🍔 Item errado'],['item_faltando','❌ Item faltando'],['cobranca','💳 Cobrança'],['qualidade','⭐ Qualidade'],['outro','💬 Outro']];
  const S = { conversaId:null, token:null, estado:null, tipo:null, intencao:null, temPedido:false, pendente:null, chamadasIa:0, depois:0, tela:'texto', desc:'', resp:'', pergunta:'', resumo:'', ligado:false, aberto:false, ocupado:false, timer:null, codigo:'', numero:'', faq:null, buscaT:null };
  const $ = id => document.getElementById(id);
  const corpo = () => $('chatPublicoConteudo');
  /* IA do cardápio público (só em memória: o celular digitado nunca vai para o localStorage) */
  const QA = { msgs:[], tel:'', ultima:'', enc:null, busy:false };

  /* ---------- sessão (só conversa + token; nunca telefone, endereço ou dados do pedido) ---------- */
  function salvar_(){ try{ localStorage.setItem(KEY, JSON.stringify({ conversaId:S.conversaId, token:S.token })); }catch(e){} }
  function lerSalva_(){ try{ const j = JSON.parse(localStorage.getItem(KEY) || 'null'); if(j && j.conversaId && j.token) return j; }catch(e){} return null; }
  function limparSessao_(){ S.intencao = null; S.temPedido = false; S.pendente = null; S.conversaId = null; S.token = null; S.estado = null; S.depois = 0; S.chamadasIa = 0; try{ localStorage.removeItem(KEY); }catch(e){} }

  /* ---------- botões só aparecem se o atendimento estiver ligado no banco ---------- */
  async function atualizarStatus_(){
    try{ const r = await sbRpcPublico_('chat_status', {}); S.ligado = !!(r && r.ok && r.ligado === true); }catch(e){ S.ligado = false; }
    window.chatPublicoLigado_ = S.ligado;
    if(window.balaoIaAtualizar_) window.balaoIaAtualizar_();
    return S.ligado;
  }

  /* ---------- utilidades de tela ---------- */
  function voltarBtn_(a){ return '<button type="button" class="link-btn" data-a="' + (a || 'menu') + '">← Voltar</button>'; }
  function msg_(t){ const el = $('chatPublicoMsg'); if(!el) return; el.textContent = t || ''; el.className = t ? 'msg warn' : 'msg'; }
  function ocupado_(v){ S.ocupado = v; corpo().querySelectorAll('button').forEach(b=>{ b.disabled = v; }); }
  function pintar_(html, foco){ corpo().innerHTML = html + '<div class="msg" id="chatPublicoMsg"></div>'; if(foco){ const el = corpo().querySelector(foco); if(el) setTimeout(()=>{ try{ el.focus(); }catch(e){} }, 50); } }

  /* ---------- telas ---------- */
  function render_(){
    parar_();
    let t = S.tela;
    if(t === 'ia') return renderIa_();
    if(t === 'off') return pintar_('<p class="sub">O atendimento por chat está indisponível no momento. Ligue para o restaurante.</p><button type="button" class="primary" data-a="fechar">Fechar</button>');
    if(t === 'menu' || t === 'tipo' || t === 'desc') t = 'texto';
    if(t === 'texto') return pintar_('<p class="sub">Como podemos ajudar?</p><textarea id="chatDescricao" rows="4" maxlength="300" placeholder="Escreva em poucas palavras o que você precisa"></textarea><div class="chat-cont" id="chatCont">0/300</div><button type="button" class="primary" data-a="enviarDesc">Enviar</button>', '#chatDescricao');
    if(t === 'dados') return pintar_('<p class="sub">Para a equipe localizar o seu pedido, informe seu nome e telefone.</p><input type="text" id="chatNome" maxlength="80" placeholder="Seu nome" autocomplete="name"><input type="tel" id="chatTel" inputmode="tel" maxlength="16" placeholder="Telefone com DDD" autocomplete="tel"><button type="button" class="primary" data-a="vincular">Continuar</button>', '#chatNome');
    if(t === 'pedido'){
      const comCodigo = !!S.codigo;
      return pintar_(voltarBtn_() + '<p class="sub">' + (comCodigo ? 'Confirme os 4 últimos dígitos do telefone usado no pedido' + (S.numero ? ' nº ' + escH(S.numero) : '') + '.' : 'Informe o número do pedido e os 4 últimos dígitos do telefone usado nele.') + '</p>' +
        (comCodigo ? '' : '<input type="text" id="chatPedidoNumero" inputmode="numeric" placeholder="Número do pedido" maxlength="9" autocomplete="off">') +
        '<input type="text" id="chatTelefone4" inputmode="numeric" placeholder="4 últimos dígitos do telefone" maxlength="4" autocomplete="off">' +
        '<button type="button" class="primary" data-a="abrir">Continuar</button>', comCodigo ? '#chatTelefone4' : '#chatPedidoNumero');
    }
    if(t === 'pergunta') return pintar_('<p class="sub">Só uma pergunta para ajudar a equipe:</p><div class="chat-balao ia" id="chatPergunta"></div><textarea id="chatResposta" rows="3" maxlength="300" placeholder="Sua resposta"></textarea><button type="button" class="primary" data-a="enviarResp">Enviar resposta</button><button type="button" class="link-btn" data-a="pularPergunta">Pular e falar com a equipe</button>', '#chatResposta');
    if(t === 'resumo') return pintar_('<p class="sub">Vamos enviar este resumo para a equipe:</p><div class="chat-balao ia" id="chatResumo"></div><button type="button" class="primary" data-a="transferir">➡️ Falar com a equipe</button><button type="button" class="link-btn" data-a="tipo">Corrigir</button>');
    if(t === 'fallback') return pintar_('<p class="sub">Não consegui organizar sua mensagem automaticamente.<br>Você pode continuar mesmo assim e falar com a equipe.</p><button type="button" class="primary" data-a="transferir">➡️ Falar com a equipe</button><button type="button" class="link-btn" data-a="tipo">Voltar</button>');
    if(t === 'encerrada') return pintar_('<p class="sub">✅ Este atendimento foi encerrado.</p><button type="button" class="primary" data-a="novo">Precisa de outra ajuda?</button><button type="button" class="link-btn" data-a="fechar">Fechar</button>');
    if(t === 'chat') return renderChat_();
  }
  /* ---------- conversa com a equipe ---------- */
  function renderChat_(){
    pintar_('<div class="chat-msgs" id="chatMsgs"></div>' +
      '<div class="chat-envio" id="chatEnvio"><input type="text" id="chatTexto" maxlength="300" placeholder="Escreva sua mensagem" autocomplete="off"><button type="button" class="primary" data-a="enviarChat">Enviar</button></div>');
    S.depois = 0; lerChat_(true);
  }
  function addMsg_(m){
    const box = $('chatMsgs'); if(!box) return;
    const d = document.createElement('div');
    const a = m.autor === 'cliente' ? 'eu' : (m.autor === 'sistema' ? 'sis' : (m.autor === 'ia' ? 'ia' : 'eq'));
    d.className = 'chat-balao ' + a;
    const rot = m.autor === 'cliente' ? 'Você' : (m.autor === 'atendente' ? 'Equipe' : (m.autor === 'ia' ? '' + ASSISTENTE_ + '' : ''));
    if(rot){ const r = document.createElement('small'); if(rot === '' + ASSISTENTE_ + ''){ const av = document.createElement('span'); av.className = 'tex-av'; r.appendChild(av); } r.appendChild(document.createTextNode(rot)); d.appendChild(r); }
    const t = document.createElement('span'); t.textContent = m.texto; d.appendChild(t);
    box.appendChild(d); box.scrollTop = box.scrollHeight;
  }
  async function lerChat_(primeira){
    if(!S.aberto || S.tela !== 'chat' || !S.conversaId) return;
    let atraso = 6000;
    try{
      const r = await sbRpcPublico_('chat_ler', { conversaId:S.conversaId, token:S.token, depois:S.depois });
      if(r && r.ok){
        (r.mensagens || []).forEach(m=>{ if(m.id > S.depois) S.depois = m.id; addMsg_(m); });
        S.estado = r.estado;
        if(r.estado === 'encerrada'){ limparSessao_(); S.tela = 'encerrada'; render_(); return; }
      }else if(r && r.limite){ atraso = 15000; }
      else if(r && !r.ok && !r.desligado && primeira){ limparSessao_(); S.tela = 'texto'; render_(); return; }
      else if(r && r.desligado){ S.tela = 'off'; render_(); return; }
    }catch(e){ atraso = 12000; }
    if(S.aberto && S.tela === 'chat'){ clearTimeout(S.timer); S.timer = setTimeout(()=>{ if(!document.hidden) lerChat_(false); else S.timer = setTimeout(()=>lerChat_(false), 6000); }, atraso); }
  }
  function parar_(){ clearTimeout(S.timer); S.timer = null; }
  async function enviarChat_(){
    const el = $('chatTexto'); const texto = String(el && el.value || '').trim().slice(0, 300);
    if(!texto || S.ocupado) return;
    ocupado_(true);
    const r = await chatRpcSeguro_('chat_enviar', { conversaId:S.conversaId, token:S.token, texto });
    ocupado_(false);
    if(r && r.ok){ if(el){ el.value = ''; el.focus(); } clearTimeout(S.timer); lerChat_(false); }
    else msg_((r && r.message) || 'Não foi possível enviar agora.');
  }

  /* ---------- ATENDENTE VIRTUAL (IA do cardápio): dúvidas, preços, status do pedido (pelo celular) e encaminhamento ---------- */
  const PARECE_STATUS = /pedid|status|entreg|a caminho|saiu|demor|atras|chegou|quanto tempo|previs|andamento/i;
  const BOAS_VINDAS = 'Oi! Eu sou o ' + ASSISTENTE_ + ', o atendente virtual da ' + NOME_RESTAURANTE_ + ' 🍔\nPosso tirar dúvidas do cardápio, preços, promoções e formas de pagamento, ver o andamento do seu pedido ou chamar a equipe.';
  function renderIa_(){
    pintar_('<div class="chat-msgs" id="chatMsgs"></div><div class="ia-acoes" id="iaAcoes"></div>' +
      '<div class="chat-envio" id="iaEnvio"><input type="text" id="iaTexto" maxlength="400" placeholder="Pergunte sobre cardápio, preços, pedido…" autocomplete="off"><button type="button" class="primary" data-a="iaEnviar">Enviar</button></div>' +
      '<div class="ia-rodape">' + (S.ligado ? '<button type="button" class="link-btn" data-a="equipe">👤 Falar com a equipe</button>' : '<span class="sub">Chat com a equipe indisponível no momento.</span>') + '</div>');
    addMsg_({ autor:'ia', texto:BOAS_VINDAS });
    QA.msgs.forEach(m=>addMsg_({ autor:m.autor, texto:m.texto }));
    if(!QA.msgs.length) chipsIa_();
    if(QA.enc || QA.falhou) cartaoEquipe_();
  }
  function acoesIa_(html){ const a = $('iaAcoes'); if(a) a.innerHTML = html || ''; }
  function chipsIa_(){
    acoesIa_('<div class="ia-chips">' +
      '<button type="button" class="ghost" data-a="iaChip" data-t="O que você recomenda para hoje?">🍔 O que recomenda?</button>' +
      '<button type="button" class="ghost" data-a="iaChip" data-t="Quais são as promoções?">🏷️ Promoções</button>' +
      '<button type="button" class="ghost" data-a="iaChip" data-t="Como está o meu pedido?">📦 Meu pedido</button></div>');
  }
  function cartaoEquipe_(){
    if(!S.ligado){ acoesIa_('<div class="ia-card"><p>O chat com a equipe está indisponível agora. Fale com o restaurante pelo telefone.</p></div>'); return; }
    acoesIa_('<div class="ia-card"><p>' + (QA.enc ? 'Posso chamar alguém da equipe para resolver isso.' : 'Quer falar direto com a equipe?') + '</p><button type="button" class="primary" data-a="iaEquipe">➡️ Falar com a equipe</button></div>');
  }
  function pedirTelIa_(){
    acoesIa_('<div class="ia-card"><p>Seu celular é usado só para localizar o pedido.</p><div class="chat-envio"><input type="tel" id="iaTel" inputmode="tel" maxlength="16" placeholder="Celular com DDD" autocomplete="tel"><button type="button" class="primary" data-a="iaTel">Consultar</button></div></div>');
    const e = $('iaTel'); if(e) setTimeout(()=>{ try{ e.focus(); }catch(x){} }, 50);
  }
  function digitando_(on){
    const box = $('chatMsgs'); if(!box) return;
    const ant = $('iaDig'); if(ant) ant.remove();
    if(!on) return;
    const d = document.createElement('div'); d.className = 'chat-balao ia'; d.id = 'iaDig'; d.textContent = 'Digitando…'; box.appendChild(d); box.scrollTop = box.scrollHeight;
  }
  function guardarIa_(autor, texto){ QA.msgs.push({ autor, texto }); if(QA.msgs.length > 30) QA.msgs.shift(); addMsg_({ autor, texto }); }
  async function enviarIa_(textoFixo, reenvioComTel){
    if(QA.busy) return;
    const el = $('iaTexto');
    const texto = String(textoFixo != null ? textoFixo : (el && el.value) || '').trim().slice(0, 400);
    if(texto.length < 2) return;
    QA.busy = true; QA.enc = null; QA.falhou = false; msg_('');
    const historico = QA.msgs.slice(-4).map(m=>({ quem: m.autor === 'ia' ? 'ia' : 'cliente', texto: m.texto }));
    if(!reenvioComTel){ if(el) el.value = ''; guardarIa_('cliente', texto); QA.ultima = texto; }
    acoesIa_(''); digitando_(true);
    const mandarTel = QA.tel && (reenvioComTel || PARECE_STATUS.test(texto));
    let j = null;
    try{
      const r = await sbJson_(SUPABASE_URL_ + '/functions/v1/ai-publico-atendente', { method:'POST', headers:{ apikey:SUPABASE_CHAVE_, Authorization:'Bearer ' + SUPABASE_CHAVE_, 'Content-Type':'application/json' },
        body: JSON.stringify({ texto, historico, telefone: mandarTel ? QA.tel : '' }) }, 40000);
      j = await r.json().catch(()=>null);
    }catch(e){ j = null; }
    digitando_(false); QA.busy = false;
    if(!S.aberto || S.tela !== 'ia') return;
    if(!j || !j.ok || !j.resposta){
      QA.falhou = true;
      guardarIa_('ia', j && j.codigo === 'limite_ip' ? 'Você fez muitas perguntas seguidas. Aguarde alguns minutos ou fale com a equipe.' : 'Não consegui responder automaticamente agora, mas a equipe pode te ajudar.');
      cartaoEquipe_(); return;
    }
    guardarIa_('ia', j.resposta);
    if(j.acao === 'pedir_telefone'){ QA.tel = ''; pedirTelIa_(); }
    else if(j.acao === 'encaminhar'){ QA.enc = { tipo:j.tipo || 'outro', resumo:String(j.resumo || QA.ultima || '').slice(0, 300) }; cartaoEquipe_(); }
    else if(j.acao === 'feedback'){ QA.fb = String(QA.ultima || '').slice(0, 500); acoesIa_('<div class="ia-card"><p>Quer deixar isso registrado para o restaurante? É só dar uma nota.</p><button type="button" class="primary" data-a="iaFeedback">⭐ Registrar como feedback</button></div>'); }
    else if($('iaTexto')) $('iaTexto').focus();
  }
  function consultarTelIa_(){
    const tel = String(($('iaTel') || {}).value || '').replace(/\D/g, '').slice(-11);
    if(tel.length < 10){ msg_('Informe o celular com DDD.'); return; }
    QA.tel = tel; msg_('');
    guardarIa_('sistema', '📱 Celular informado. Consultando seu pedido…');
    enviarIa_(QA.ultima || 'Como está meu pedido?', true);
  }
  /* problema/pedido de falar com a equipe: reaproveita o fluxo de triagem existente (conversa + nome/telefone + resumo + transferir) */
  async function iaParaEquipe_(){
    if(!S.ligado){ msg_('O chat com a equipe está indisponível agora.'); return; }
    const enc = QA.enc;
    S.desc = String(enc ? enc.resumo : QA.ultima || '').slice(0, 300); S.resp = ''; S.resumo = enc ? enc.resumo : ''; S.tipo = enc ? enc.tipo : null;
    ocupado_(true);
    if(!S.conversaId || S.estado !== 'recepcao'){ const ok = await triagemAbrir_(); if(!ok){ ocupado_(false); return; } }
    ocupado_(false);
    if(!enc){ S.tela = 'texto'; render_(); const t = $('chatDescricao'); if(t && S.desc){ t.value = S.desc; const c = $('chatCont'); if(c) c.textContent = S.desc.length + '/300'; } return; }
    const comPedido = ['atraso','item_errado','item_faltando','cobranca','qualidade'].includes(enc.tipo);
    S.intencao = comPedido ? 'pedido_feito' : 'antes_de_pedir';
    const j = { ok:true, acao:'resumir', intencao:S.intencao, resumo:enc.resumo, tipo:enc.tipo };
    if(comPedido && !S.temPedido){ S.pendente = j; S.tela = 'dados'; render_(); const t = $('chatTel'); if(t && QA.tel) t.value = QA.tel; return; }
    mostrarSaidaIa_(j);
  }

  /* ---------- abrir conversa (o banco valida pedido, 4 dígitos, janela, limites e token) ---------- */
  async function abrirConversa_(){
    const numero = S.codigo ? S.numero : String(($('chatPedidoNumero') || {}).value || '').replace(/\D/g, '').slice(0, 9);
    const telefone4 = String(($('chatTelefone4') || {}).value || '').replace(/\D/g, '').slice(-4);
    if((!S.codigo && !numero) || telefone4.length !== 4){ msg_('Informe o número do pedido e os 4 últimos dígitos do telefone.'); return; }
    ocupado_(true);
    const r = await chatRpcSeguro_('chat_abrir', { codigo: S.codigo || numero, numero: numero || '', telefone4 });
    ocupado_(false);
    if(!r || !r.ok){ if(r && r.desligado){ S.tela = 'off'; render_(); return; } msg_((r && r.message) || 'Não foi possível localizar o pedido.'); return; }
    S.conversaId = r.conversaId; S.token = r.token; S.estado = r.estado; S.tipo = null; S.chamadasIa = 0; S.depois = 0; S.temPedido = true; S.intencao = 'pedido_feito';
    salvar_();
    S.tela = (r.estado === 'recepcao') ? 'texto' : 'chat'; render_();
  }

  /* ---------- IA de recepção (máx. 3; nunca depois da transferência; fallback sem erro técnico) ---------- */
  function podeIa_(){ return S.estado === 'recepcao' && Number(S.chamadasIa || 0) < 3; }
  async function iaRecepcao_(texto, anterior){
    if(!S.conversaId || !S.token || !podeIa_()) return { ok:false, fallback:true };
    try{
      const r = await sbJson_(SUPABASE_URL_ + '/functions/v1/ai-publico-recepcao', { method:'POST', headers:{ apikey:SUPABASE_CHAVE_, Authorization:'Bearer ' + SUPABASE_CHAVE_, 'Content-Type':'application/json' },
        body: JSON.stringify({ conversaId:S.conversaId, token:S.token, texto, anterior: anterior || '' }) }, 20000);
      const j = await r.json().catch(()=>null);
      if(!j || !j.ok){ if(j && j.codigo === 'conversa_invalida'){ limparSessao_(); } return Object.assign({ ok:false, fallback:true }, j || {}); }
      S.chamadasIa = Number(j.ia_chamadas || (S.chamadasIa + 1));
      return j;
    }catch(e){ return { ok:false, fallback:true }; }
  }
  /* triagem sem pedido: o banco valida caixa aberto, limites por IP e devolve conversa + token */
  async function triagemAbrir_(){
    const r = await chatRpcSeguro_('chat_triagem_abrir', {});
    if(!r || !r.ok){ if(r && r.desligado){ S.tela = 'off'; render_(); } else msg_((r && r.message) || 'Não foi possível iniciar o atendimento agora.'); return false; }
    S.conversaId = r.conversaId; S.token = r.token; S.estado = r.estado; S.tipo = null; S.intencao = null; S.temPedido = false; S.pendente = null; S.chamadasIa = 0; S.depois = 0;
    salvar_(); return true;
  }
  /* a decisão vem do campo "intencao" (rótulo validado no servidor), nunca de texto escrito pela IA */
  function rotear_(j){
    if(!j || !j.ok){ S.tela = 'fallback'; render_(); return; }
    if(j.tipo) S.tipo = j.tipo;
    if(j.intencao && j.intencao !== 'indefinida') S.intencao = j.intencao;
    if(S.intencao === 'pedido_feito' && !S.temPedido){ S.pendente = j; S.tela = 'dados'; render_(); return; }
    mostrarSaidaIa_(j);
  }
  function mostrarSaidaIa_(j){
    if(j.acao === 'perguntar'){ S.pergunta = j.pergunta; S.tela = 'pergunta'; render_(); const e = $('chatPergunta'); if(e) e.textContent = S.pergunta; return; }
    if(j.acao === 'resumir'){ S.resumo = j.resumo; S.tela = 'resumo'; render_(); const e = $('chatResumo'); if(e) e.textContent = S.resumo; return; }
    S.tela = 'fallback'; render_();
  }
  async function enviarDesc_(){
    const texto = String(($('chatDescricao') || {}).value || '').trim().slice(0, 300);
    if(texto.length < 3){ msg_('Descreva rapidamente o que você precisa.'); return; }
    S.desc = texto; S.resp = ''; S.resumo = '';
    ocupado_(true);
    if(!S.conversaId || S.estado !== 'recepcao'){ const ok = await triagemAbrir_(); if(!ok){ ocupado_(false); return; } }
    const j = await iaRecepcao_(texto, ''); ocupado_(false);
    rotear_(j);
  }
  /* nome + telefone: formulário do app, NUNCA passa pela IA; o telefone decide o vínculo e a resposta é sempre a mesma */
  async function vincular_(){
    const nome = String(($('chatNome') || {}).value || '').trim().slice(0, 80);
    const telefone = String(($('chatTel') || {}).value || '').replace(/[^\d]/g, '').slice(0, 15);
    if(nome.length < 2 || telefone.length < 10){ msg_('Informe seu nome e o telefone com DDD.'); return; }
    ocupado_(true);
    const r = await chatRpcSeguro_('chat_vincular_pedido', { conversaId:S.conversaId, token:S.token, nome, telefone });
    ocupado_(false);
    if(!r || !r.ok){ if(r && r.desligado){ S.tela = 'off'; render_(); return; } msg_((r && r.message) || 'Não foi possível continuar agora.'); return; }
    S.temPedido = true; S.intencao = 'pedido_feito';
    const j = S.pendente; S.pendente = null;
    if(j) mostrarSaidaIa_(j); else { S.tela = 'fallback'; render_(); }
  }
  async function enviarResp_(){
    const texto = String(($('chatResposta') || {}).value || '').trim().slice(0, 300);
    if(texto.length < 1){ msg_('Escreva sua resposta.'); return; }
    S.resp = texto;
    ocupado_(true); const j = await iaRecepcao_(texto, S.desc); ocupado_(false);
    if(j.ok && j.tipo) S.tipo = j.tipo;
    if(j.ok && j.intencao && j.intencao !== 'indefinida') S.intencao = j.intencao;
    if(j.ok && j.acao === 'resumir'){
      if(S.intencao === 'pedido_feito' && !S.temPedido){ S.pendente = j; S.tela = 'dados'; render_(); return; }
      mostrarSaidaIa_(j); return;
    }
    S.tela = 'fallback'; render_();
  }
  async function transferir_(){
    const texto = (S.resp ? (S.desc + ' — ' + S.resp) : S.desc).slice(0, 300);
    if(texto.length < 3){ msg_('Descreva rapidamente o que você precisa.'); return; }
    ocupado_(true);
    const r = await chatRpcSeguro_('chat_transferir', { conversaId:S.conversaId, token:S.token, tipo:S.tipo || 'outro', texto, resumo:S.resumo || null });
    ocupado_(false);
    if(!r || !r.ok){ msg_((r && r.message) || 'Não foi possível transferir agora.'); return; }
    S.estado = r.estado || 'aguardando'; S.tela = 'chat'; render_();
  }

  /* ---------- abrir / fechar / retomar ---------- */
  async function abrir_(){
    S.aberto = true; $('chatPublicoModal').classList.add('open');
    corpo().innerHTML = '<p class="sub">Carregando...</p>';
    const ligado = await atualizarStatus_();
    if(!ligado && S.codigo){ S.tela = 'off'; render_(); return; }
    if(!ligado){ S.tela = 'ia'; render_(); return; }
    const salva = lerSalva_();
    if(salva && !S.conversaId){ S.conversaId = salva.conversaId; S.token = salva.token; }
    if(S.conversaId){
      const r = await chatRpcSeguro_('chat_ler', { conversaId:S.conversaId, token:S.token, depois:0 });
      if(r && r.ok){
        S.estado = r.estado;
        S.chamadasIa = (r.mensagens || []).filter(m=>m.autor === 'ia').length;
        if(r.estado === 'encerrada'){ limparSessao_(); S.tela = 'ia'; }
        else if(r.estado === 'recepcao'){ limparSessao_(); S.tela = S.codigo ? 'pedido' : 'ia'; }   // triagem abandonada: recomeça
        else S.tela = 'chat';
        render_(); return;
      }
      limparSessao_();
    }
    S.tela = S.codigo ? 'pedido' : 'ia'; render_();
  }
  function fechar_(){ S.aberto = false; parar_(); S.codigo = ''; S.numero = ''; $('chatPublicoModal').classList.remove('open'); }

  /* ---------- eventos (um único listener; nada de innerHTML com texto do cliente) ---------- */
  document.addEventListener('click', ev=>{
    const el = ev.target && ev.target.closest && ev.target.closest('#chatPublicoConteudo [data-a]'); if(!el || S.ocupado) return;
    const a = el.getAttribute('data-a');
    if(a === 'menu'){ S.tela = 'texto'; render_(); }
    else if(a === 'pedido'){ S.tela = S.conversaId && S.estado === 'recepcao' ? 'texto' : (S.conversaId ? 'chat' : 'pedido'); render_(); }
    else if(a === 'vincular') vincular_();
    else if(a === 'abrir') abrirConversa_();
    else if(a === 'enviarDesc') enviarDesc_();
    else if(a === 'enviarResp') enviarResp_();
    else if(a === 'pularPergunta'){ S.tela = 'fallback'; S.resumo = ''; transferir_(); }
    else if(a === 'transferir') transferir_();
    else if(a === 'enviarChat') enviarChat_();
    else if(a === 'novo'){ limparSessao_(); S.desc = ''; S.resp = ''; S.codigo = ''; S.numero = ''; QA.enc = null; QA.falhou = false; S.tela = 'ia'; render_(); }
    else if(a === 'iaEnviar') enviarIa_();
    else if(a === 'iaChip') enviarIa_(el.getAttribute('data-t'));
    else if(a === 'iaTel') consultarTelIa_();
    else if(a === 'iaEquipe') iaParaEquipe_();
    else if(a === 'iaFeedback'){ acoesIa_(''); if(window.cdAbrirFeedbackEspecial_) cdAbrirFeedbackEspecial_({ origem:'chat', comentario: QA.fb || QA.ultima || '', titulo:'Seu feedback' }); }
    else if(a === 'equipe'){ QA.enc = null; iaParaEquipe_(); }
    else if(a === 'fechar') fechar_();
  });
  document.addEventListener('input', ev=>{
    const t = ev.target; if(!t || !t.id) return;
    if(t.id === 'chatDescricao'){ const c = $('chatCont'); if(c) c.textContent = t.value.length + '/300'; }
  });
  document.addEventListener('keydown', ev=>{
    if(ev.key === 'Escape' && S.aberto){ fechar_(); return; }
    if(ev.key === 'Enter' && ev.target && ev.target.id){
      if(ev.target.id === 'chatTexto'){ ev.preventDefault(); enviarChat_(); }
      else if(ev.target.id === 'iaTexto'){ ev.preventDefault(); enviarIa_(); }
      else if(ev.target.id === 'iaTel'){ ev.preventDefault(); consultarTelIa_(); }
      else if(ev.target.id === 'chatTelefone4'){ ev.preventDefault(); abrirConversa_(); }
    }
  });
  document.addEventListener('visibilitychange', ()=>{ if(!document.hidden && S.aberto && S.tela === 'chat'){ clearTimeout(S.timer); lerChat_(false); } });

  /* ---------- API global (usada pelos botões do HTML) ---------- */
  window.abrirChatPublico_ = abrir_;
  window.fecharChatPublico_ = fechar_;
  window.abrirAjudaPedidoDoAcompanhamento_ = function(codigo, numero){
    S.codigo = String(codigo || '').replace(/[^0-9a-fA-F-]/g, '').slice(0, 36); S.numero = String(numero || '').replace(/\D/g, '').slice(0, 9);
    S.aberto = true; $('chatPublicoModal').classList.add('open'); corpo().innerHTML = '<p class="sub">Carregando...</p>';
    (async ()=>{
      if(!(await atualizarStatus_())){ S.tela = 'off'; render_(); return; }
      if(S.conversaId && S.estado){ S.tela = S.estado === 'recepcao' ? 'texto' : 'chat'; render_(); return; }
      /* quem toca em "Preciso de ajuda" já está dentro do pedido: o código do acompanhamento vincula, sem pedir nada */
      if(S.codigo.length >= 32){
        const r = await chatRpcSeguro_('chat_abrir', { codigo:S.codigo, numero:'', telefone4:'', acompanhamento:true });
        if(r && r.ok){
          S.conversaId = r.conversaId; S.token = r.token; S.estado = r.estado; S.tipo = null; S.chamadasIa = 0; S.depois = 0; S.temPedido = true; S.intencao = 'pedido_feito';
          salvar_(); S.tela = (r.estado === 'recepcao') ? 'texto' : 'chat'; render_(); return;
        }
        if(r && r.desligado){ S.tela = 'off'; render_(); return; }
      }
      S.tela = 'pedido'; render_();
    })();
  };
  setTimeout(atualizarStatus_, 2500);
})();

