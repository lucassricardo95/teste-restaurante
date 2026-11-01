
(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => escH(s);
  const logado = () => !!(typeof currentUser !== 'undefined' && currentUser && currentUser.login);
  const equipe_ = () => logado() && (currentUser.nivel === 'Admin' || currentUser.nivel === 'Operador');
  /* Quem vê o balão do assistente: Desenvolvedor, Admin e Operador (e o cliente público, sem login). Garçom, Cozinha e Entregador usam o botão Ajuda. */
  const perfilBalaoPermitido_ = () => logado() && ['Desenvolvedor', 'Admin', 'Operador'].indexOf(currentUser.nivel) !== -1;
  const verComo_ = () => (logado() && currentUser.nivelReal === 'Desenvolvedor' && currentUser.verComo) ? currentUser.nivel : '';
  const IN = { aberto:false, conv:null, depois:0, timer:null, fila:[], aguard:0, ocupado:false, pedindoSol:false, ultAguard:0, ultNL:0 };

  /* ---------- acesso ao banco com a sessão do usuário ---------- */
  async function tokenSb_(){
    let s = sbSessaoLer_(); if(!s) throw new Error('sem_sessao');
    if(Date.now() > s.expira){ if(!(await sbRenovar_())) throw new Error('sem_sessao'); s = sbSessaoLer_(); }
    return s.access_token;
  }
  async function lerMsgs_(id, depois){
    const t = await tokenSb_();
    const r = await sbJson_(SUPABASE_URL_ + '/rest/v1/chat_mensagens?conversa_id=eq.' + encodeURIComponent(id) + '&id=gt.' + Number(depois || 0) + '&order=id.asc&select=id,autor,texto,criado_em&limit=200',
      { method:'GET', headers:{ apikey:SUPABASE_CHAVE_, Authorization:'Bearer ' + t } }, 15000);
    const j = await r.json().catch(() => null);
    return Array.isArray(j) ? j : null;
  }

  /* ---------- bolhas (texto puro; só HTML já escapado entra como "rico") ---------- */
  function bolha_(cls, rot, conteudo, rico){
    const box = $('biMsgs'); if(!box) return null;
    const d = document.createElement('div'); d.className = 'chat-balao ' + cls + (rico ? ' rico' : '');
    if(rot){ const r = document.createElement('small'); if(rot === 'Assistente'){ const av = document.createElement('span'); av.className = 'tex-av'; r.appendChild(av); r.appendChild(document.createTextNode('' + ASSISTENTE_ + '')); } else r.textContent = rot; d.appendChild(r); }
    const s = document.createElement('span'); if(rico) s.innerHTML = conteudo; else s.textContent = conteudo; d.appendChild(s);
    box.appendChild(d); box.scrollTop = box.scrollHeight; return d;
  }
  const rm_ = el => { try{ if(el) el.remove(); }catch(e){} };

  /* ---------- contador, aviso, som e vibração ---------- */
  function aviso_(){
    const n = IN.aguard, el = $('biAviso');
    if(el){
      if(IN.conv || !equipe_() || !n) el.hidden = true;
      else { el.hidden = false; el.textContent = n + (n === 1 ? ' cliente aguardando' : ' clientes aguardando') + ' — toque para ver'; }
    }
    const ct = $('balaoIaContador'); if(ct){ ct.hidden = !(n && equipe_()); ct.textContent = String(n); }
  }
  /* som alto (usa o áudio já liberado pelo app) — dois tons repetidos */
  function tomChat_(){
    try{
      const ctx = (typeof audioCtx_ === 'function') ? audioCtx_() : null; if(!ctx) return false;
      if(ctx.state === 'suspended') ctx.resume();
      [[0, 988], [0.3, 1318], [0.6, 988], [0.9, 1318]].forEach(([t, f]) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
        const ini = ctx.currentTime + t;
        g.gain.setValueAtTime(0.0001, ini); g.gain.exponentialRampToValueAtTime(0.4, ini + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ini + 0.26);
        o.start(ini); o.stop(ini + 0.3);
      });
      return true;
    }catch(e){ return false; }
  }
  /* aviso do chat: vibra, toca som com o app aberto e mostra notificação do celular (tag própria, não mistura com pedidos) */
  function notificarChat_(titulo, corpo){
    const agora = Date.now(); if(agora - (IN.ultNotif || 0) < 8000) return; IN.ultNotif = agora;
    try{ if(navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]); }catch(e){}
    let permitido = false; try{ permitido = ('Notification' in window) && Notification.permission === 'granted'; }catch(e){}
    if(!document.hidden || !permitido) tomChat_();
    if(!permitido) return;
    try{
      const opts = { body: corpo, tag: 'texas-chat', renotify: true, vibrate: [200, 100, 200, 100, 200], requireInteraction: true };
      const direto = () => { try{ const n = new Notification(titulo, opts); n.onclick = () => { try{ window.focus(); n.close(); if(window.balaoIaAbrir_) window.balaoIaAbrir_(); }catch(e){} }; }catch(e){} };
      if(navigator.serviceWorker && navigator.serviceWorker.getRegistration){
        navigator.serviceWorker.getRegistration().then(reg => { if(reg && reg.showNotification) reg.showNotification(titulo, opts); else direto(); }).catch(direto);
      } else direto();
    }catch(e){}
  }
  async function carregarFila_(){
    if(!equipe_()){ IN.aguard = 0; aviso_(); return null; }
    try{
      const r = await sbRpc_('chat_ler_fila', {});
      if(r && r.ok){
        IN.fila = r.conversas || [];
        const ag = IN.fila.filter(x => x.estado === 'aguardando').length;
        const nl = IN.fila.reduce((a, x) => a + (Number(x.naoLidas) || 0), 0);
        const vistos = IN.vistos || (IN.vistos = {}), nlMap = IN.nlMap || (IN.nlMap = {}), ids = {};
        let novoCliente = null, novaMsg = null;
        IN.fila.forEach(x => {
          const id = String(x.id); ids[id] = 1;
          const nomeX = x.nome || 'Cliente';
          const primeiraVez = x.estado === 'aguardando' && !vistos[id];
          if(x.estado === 'aguardando') vistos[id] = 1;
          const antes = nlMap[id] || 0, agora = Number(x.naoLidas) || 0; nlMap[id] = agora;
          const olhando = IN.aberto && IN.conv && String(IN.conv.id) === id && !document.hidden;
          if(primeiraVez) novoCliente = novoCliente || nomeX;
          else if(agora > antes && !olhando) novaMsg = novaMsg || nomeX;
        });
        Object.keys(vistos).forEach(k => { if(!ids[k]) delete vistos[k]; });
        Object.keys(nlMap).forEach(k => { if(!ids[k]) delete nlMap[k]; });
        if(novoCliente) notificarChat_('💬 Cliente aguardando', novoCliente + ' chamou no atendimento.');
        else if(novaMsg) notificarChat_('💬 Nova mensagem', 'Mensagem de ' + novaMsg + ' no atendimento.');
        IN.ultAguard = ag; IN.ultNL = nl; IN.aguard = ag; aviso_();
        return IN.fila;
      }
    }catch(e){}
    return null;
  }
  function mostrarFila_(){
    const f = IN.fila;
    if(!f.length){ bolha_('ia', 'Clientes', 'Nenhum cliente aguardando ou em atendimento agora.'); return; }
    const h = f.map(x => {
      const ped = x.pedidoNaoLocalizado ? 'Pedido não localizado' : (x.antesDePedir ? 'Antes de pedir' : (x.vendaId ? 'Pedido vinculado' : '—'));
      return '<div class="bi-item" data-bi="abrir" data-id="' + esc(x.id) + '"><b>' + esc(x.nome || 'Cliente') + '</b>' + (x.telefone ? ' · ' + esc(x.telefone) : '') +
        '<br><span class="bi-sub">' + esc(x.estado === 'aguardando' ? '⏳ Aguardando' : '💬 Em atendimento') + ' · ' + esc(ped) + (Number(x.outrosPedidos) > 0 ? ' · há ' + esc(x.outrosPedidos) + ' outros pedidos recentes' : '') + '</span>' +
        (x.resumo ? '<br>' + esc(x.resumo) : '') + '</div>';
    }).join('');
    bolha_('ia', 'Clientes', h, true);
  }

  /* ---------- conversa com cliente ---------- */
  function ph_(){ const t = $('biTexto'); if(t) t.placeholder = IN.conv ? (IN.pedindoSol ? 'Escreva a solução para encerrar…' : 'Mensagem para o cliente…') : 'Escreva o que precisa…'; }
  function ctrl_(){
    const c = $('biCtrl'); if(!c) return;
    if(!IN.conv){
      if(IN.log && IN.log.length){ c.hidden = false; c.innerHTML = '<button type="button" class="ghost" data-bi="novaia">🗑️ Nova conversa</button>'; }
      else { c.hidden = true; c.innerHTML = ''; }
      ph_(); return;
    }
    c.hidden = false;
    c.innerHTML = (IN.conv.estado === 'aguardando' ? '<button type="button" class="primary" data-bi="assumir">Assumir</button>' : '') +
      (IN.conv.estado === 'em_atendimento' ? '<button type="button" class="ghost" data-bi="encerrar">Encerrar</button>' : '') +
      '<button type="button" class="ghost" data-bi="sair">← Sair da conversa</button>';
    ph_();
  }
  async function atualizarMsgs_(){
    if(!IN.conv) return;
    let ms = null; try{ ms = await lerMsgs_(IN.conv.id, IN.depois); }catch(e){}
    if(!ms || !IN.conv) return;
    ms.forEach(m => {
      if(m.id > IN.depois) IN.depois = m.id;
      const cls = m.autor === 'cliente' ? 'eq' : (m.autor === 'atendente' ? 'eu' : (m.autor === 'sistema' ? 'sis' : 'ia'));
      const rot = m.autor === 'cliente' ? (IN.conv.nome || 'Cliente') : (m.autor === 'atendente' ? 'Equipe' : (m.autor === 'ia' ? 'Recepção IA' : ''));
      bolha_(cls, rot, m.texto);
    });
  }
  function agendar_(){
    clearTimeout(IN.timer); if(!IN.aberto || !IN.conv) return;
    IN.timer = setTimeout(async () => { if(!document.hidden) await atualizarMsgs_(); agendar_(); }, 5000);
  }
  async function abrirConv_(id){
    const x = IN.fila.find(y => String(y.id) === String(id)); if(!x) return;
    IN.conv = x; IN.depois = 0; IN.pedindoSol = false;
    const box = $('biMsgs'); if(box) box.innerHTML = '';
    ctrl_(); aviso_();
    bolha_('sis', '', 'Cliente: ' + (x.nome || '—') + (x.telefone ? ' · ' + x.telefone : '') + ' · ' + (x.pedidoNaoLocalizado ? 'Pedido não localizado' : (x.antesDePedir ? 'Antes de pedir' : 'Pedido vinculado')));
    if(x.resumo) bolha_('ia', 'Resumo da IA', x.resumo);
    await atualizarMsgs_(); agendar_();
  }
  async function assumir_(){
    if(!IN.conv || IN.ocupado) return; IN.ocupado = true;
    try{
      const r = await sbRpc_('chat_assumir', { p:{ conversaId:IN.conv.id } });
      if(r && r.ok){ IN.conv.estado = 'em_atendimento'; ctrl_(); await atualizarMsgs_(); }
      else bolha_('sis', '', (r && r.message) || 'Não foi possível assumir.');
    }catch(e){ bolha_('sis', '', 'Sem conexão. Tente de novo.'); }
    finally{ IN.ocupado = false; }
  }
  function pedirSolucao_(){
    if(!IN.conv) return;
    if(IN.conv.estado !== 'em_atendimento'){ bolha_('sis', '', 'Assuma o atendimento antes de encerrar.'); return; }
    IN.pedindoSol = true; ph_(); bolha_('sis', '', 'Escreva a solução do atendimento e envie para encerrar.');
    const t = $('biTexto'); if(t) t.focus();
  }
  function sairConv_(){
    IN.conv = null; IN.pedindoSol = false; clearTimeout(IN.timer);
    const box = $('biMsgs'); if(box) box.innerHTML = '';
    if(IN.log && IN.log.length) IN.log.forEach(m => bolha_(m.cls, m.rot, m.cont, m.rico));
    ctrl_(); bolha_('ia', 'Assistente', 'Voltei para o assistente. O cliente continua na fila.');
    carregarFila_();
  }
  async function enviarConv_(t){
    IN.ocupado = true;
    try{
      if(IN.pedindoSol){
        const r = await sbRpc_('chat_encerrar', { p:{ conversaId:IN.conv.id, solucao:t } });
        if(r && r.ok){
          IN.conv = null; IN.pedindoSol = false; clearTimeout(IN.timer);
          const box = $('biMsgs'); if(box) box.innerHTML = '';
          ctrl_(); bolha_('ia', 'Assistente', 'Atendimento encerrado e registrado. Pode me pedir outra coisa.'); carregarFila_();
        }else{ bolha_('sis', '', (r && r.message) || 'Não foi possível encerrar.'); }
        return;
      }
      const r = await sbRpc_('chat_responder', { p:{ conversaId:IN.conv.id, texto:t } });
      if(r && r.ok){ await atualizarMsgs_(); }
      else{ bolha_('sis', '', (r && r.message) || 'Não foi possível enviar.'); const el = $('biTexto'); if(el) el.value = t; }
    }catch(e){ bolha_('sis', '', 'Sem conexão. Tente de novo.'); const el = $('biTexto'); if(el) el.value = t; }
    finally{ IN.ocupado = false; }
  }

  /* ---------- IA por texto: o servidor roteia (regras) e só devolve o que o perfil pode ver ---------- */
  function periodo_(t){
    const s = t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if(/ontem/.test(s)) return 'ontem'; if(/(7|sete) dias|semana/.test(s)) return '7d'; if(/(30|trinta) dias/.test(s)) return '30d'; if(/\bmes\b/.test(s)) return 'mes'; return 'hoje';
  }
  function extra_(acao, t, vc, ro){
    const e = { verComo:vc };
    /* ro = o que o roteador entendeu (pergunta com erros corrigidos, período e palavras de busca com sinônimos) */
    const perg = (ro && typeof ro.pergunta === 'string' && ro.pergunta.trim().length >= 3) ? ro.pergunta.trim().slice(0, 300) : t;
    if(acao === 'ajuda' || acao === 'pergunte' || acao === 'operacional_estoque' || acao === 'operacional_entregas') e.pergunta = perg;
    if(acao === 'ajuda' && ro && Array.isArray(ro.busca)) e.busca = ro.busca.slice(0, 12).map(x => String(x).slice(0, 30));
    if(acao === 'pergunte' || acao === 'resumo_dia' || acao === 'anomalias' || acao === 'alertas'){
      const pe = ro && ['hoje','ontem','7d','30d','mes'].indexOf(ro.periodo) !== -1 ? ro.periodo : null;
      e.periodo = pe || periodo_(t);
    }
    return e;
  }
  /* Assistente (Admin, Operador e demais perfis): conversa livre pelo ai-assistente. A IA raciocina sobre os dados do sistema e pede consultas extras sozinha. */
  IN.hist = IN.hist || [];
  /* Memória da conversa com o assistente: fica só em memória (some ao recarregar) e limpa sozinha após 2 h parada ou em "Nova conversa". */
  IN.log = IN.log || []; IN.logTs = IN.logTs || 0;
  function logIa_(cls, rot, cont, rico){ IN.log.push({ cls, rot, cont, rico:!!rico }); IN.log = IN.log.slice(-30); IN.logTs = Date.now(); }
  function novaConversaIa_(){ IN.log = []; IN.hist = []; IN.logTs = 0; const b = $('biMsgs'); if(b) b.innerHTML = ''; mostrarModoChat_(''); bolha_('ia', 'Assistente', 'Conversa nova. Fala, chefe, o que precisa?'); ctrl_(); }
  /* mensagem de status enquanto a IA trabalha (plano de velocidade, item 11): diz o que está sendo buscado, pela própria pergunta; sem IA, sem custo */
  const STATUS_IA_ = [[/venda|vendi|fatur|receita|ticket|lucro|pix|cart[aã]o|dinheiro|pagamento/i, 'buscando as vendas'], [/estoque|insumo|ingrediente|acabando|repor|compra/i, 'conferindo o estoque'], [/caixa|sangria|fechamento|abertura/i, 'olhando o caixa'], [/entrega|entregador|motoboy|mesa|preparo|andamento|fila|atras|pedido/i, 'vendo os pedidos e entregas'], [/despesa|gasto|conta|vencid|custo|financeiro/i, 'somando as despesas'], [/cliente|fidelidade|aniversar/i, 'consultando os clientes'], [/card[aá]pio|produto|lanche|combo|pre[cç]o|promo/i, 'abrindo o cardápio'], [/feedback|avalia|reclama|ocorr[eê]ncia/i, 'lendo feedbacks e ocorrências'], [/como (fa[cç]o|faz|eu|se|posso)|onde (fica|vejo)|passo a passo|ajuda|configur|imprim/i, 'procurando no manual']];
  function statusIa_(t){ for(const [re, msg] of STATUS_IA_) if(re.test(t)) return '⏳ ' + msg.charAt(0).toUpperCase() + msg.slice(1) + '…'; return '⏳ Pensando…'; }
  async function perguntarIa_(t){
    if(IN.logTs && Date.now() - IN.logTs > 7200000){ IN.log = []; IN.hist = []; }
    IN.ocupado = true; bolha_('eu', 'Você', t); logIa_('eu', 'Você', t, false); ctrl_();
    let esp = bolha_('ia', 'Assistente', statusIa_(t));
    let streamou = false;   /* streaming (plano de velocidade, item 10): depois que o texto começa a aparecer, os avisos de espera param */
    const tmrIa = [setTimeout(() => { if(!streamou && esp && esp.lastChild) esp.lastChild.textContent = '⏳ Ainda consultando os dados…'; }, 6000), setTimeout(() => { if(!streamou && esp && esp.lastChild) esp.lastChild.textContent = '⏳ Está demorando mais que o normal… só mais um instante.'; }, 20000)];
    try{
      const tk = await tokenSb_();
      const resp = await sbJson_(SUPABASE_URL_ + '/functions/v1/ai-assistente', { method:'POST',
        headers:{ Authorization:'Bearer ' + tk, apikey:SUPABASE_CHAVE_, 'Content-Type':'application/json' },
        body: JSON.stringify({ acao:'conversar', texto:t, historico:IN.hist.slice(-4), stream:true }) }, 70000);
      let r;
      if(/text\/event-stream/i.test(resp.headers.get('content-type') || '') && resp.body && resp.body.getReader){
        /* SSE do ai-assistente V3.2: status (o que está buscando) · delta (texto até agora) · reset (recomeça) · final (a mesma resposta JSON de sempre) */
        r = { ok:false, codigo:'rede_ou_timeout' };
        const rd = resp.body.getReader(), dec = new TextDecoder(); let buf = '';
        const tmrLeitura = setTimeout(() => { try{ rd.cancel(); }catch(e){} }, 80000);   /* trava de segurança: stream parado não deixa o chat preso */
        const trata = (ev, d) => {
          const span = esp && esp.lastChild;
          if(ev === 'status' && !streamou && span && d && d.msg){ if(/^Buscando/i.test(d.msg)) span.textContent = '⏳ ' + d.msg; }   /* o "Consultando a IA…" genérico do servidor não troca o status específico do app */
          else if(ev === 'delta' && span && d && typeof d.t === 'string'){ streamou = true; span.textContent = d.t; const bx = $('biMsgs'); if(bx) bx.scrollTop = bx.scrollHeight; }
          else if(ev === 'reset' && span){ streamou = false; span.textContent = statusIa_(t); }
          else if(ev === 'final' && d && d.body) r = d.body;
        };
        try{
          while(true){
            const { done, value } = await rd.read(); if(done) break;
            buf += dec.decode(value, { stream:true });
            let k; while((k = buf.indexOf('\n\n')) >= 0){
              const bloco = buf.slice(0, k); buf = buf.slice(k + 2);
              let ev = 'message', dado = '';
              bloco.split('\n').forEach(l => { if(l.indexOf('event:') === 0) ev = l.slice(6).trim(); else if(l.indexOf('data:') === 0) dado += l.slice(5).trim(); });
              let d = null; try{ d = JSON.parse(dado); }catch(e){}
              trata(ev, d);
            }
          }
        }catch(e){ /* conexão caiu no meio: vale o que já chegou em r */ }
        finally{ clearTimeout(tmrLeitura); }
      } else {
        r = await resp.json().catch(() => ({ ok:false, codigo:'resposta_invalida' }));   /* função antiga ou sem streaming: JSON normal */
      }
      rm_(esp); esp = null;
      if(!r || !r.ok){
        const m = { sem_permissao:'Seu perfil não tem acesso ao assistente.', sessao_invalida:'Sua sessão expirou. Entre de novo.', sem_login:'Sua sessão expirou. Entre de novo.', pergunta_vazia:'Escreva uma pergunta.', interno:'O assistente teve um problema agora. Tente de novo em instantes.', corpo_grande:'Pergunta grande demais. Escreva algo mais curto.' };
        { const tx = (r && (m[r.codigo] || r.message)) || 'Não consegui falar com o assistente agora. O restante do sistema funciona normal.'; bolha_('ia', 'Assistente', tx); logIa_('ia', 'Assistente', tx, false); } return;
      }
      const MODO_RESERVA_ = ['desligada', 'recurso_desligado', 'cota_global', 'cota_usuario', 'cota', 'indisponivel', 'limite', 'falha', 'sem_chave', 'rede_ou_timeout'];
      const modoReserva = r.ia === false && MODO_RESERVA_.indexOf(String(r.codigo || '')) !== -1;
      mostrarModoChat_(modoReserva ? (r.aviso || 'Assistente em modo reserva: só os números do sistema.') : '');
      let h = '';
      if(r.aviso && !modoReserva) h += '<p class="sub">⚠️ ' + escH(r.aviso) + '</p>';
      if(r.texto) h += '<div>' + escH(r.texto).replace(/\n/g, '<br>') + '</div>';
      if(r.proposta && typeof iaPropPreparar_==='function'){ try{ h += iaPropHtml_(await iaPropPreparar_(r.proposta)); }catch(e){} }
      if(r.ia) h += '<p class="sub">✨ Texto gerado por IA. Fatos vêm dos dados do sistema; sugestões e estimativas são opinião da IA — confira antes de decidir.</p>';
      if(!h) h = '<div>Não consegui responder agora.</div>';
      bolha_('ia', 'Assistente', h, true); logIa_('ia', 'Assistente', h, true);
      if(r.texto && r.ia){ IN.hist.push({ quem:'eu', texto:t }, { quem:'ia', texto:r.texto }); IN.hist = IN.hist.slice(-6); }
      if(r.abrir_fila && equipe_()){ await carregarFila_(); mostrarFila_(); }
    }catch(e){ rm_(esp); bolha_('ia', 'Assistente', 'Não consegui concluir agora. O restante do sistema funciona normal.'); logIa_('ia', 'Assistente', 'Não consegui concluir agora. O restante do sistema funciona normal.', false); }
    finally{ tmrIa.forEach(clearTimeout); IN.ocupado = false; }
  }
  function enviar_(){
    const el = $('biTexto'); const t = String((el && el.value) || '').trim().slice(0, IN.conv ? 600 : 300);
    if(!t || IN.ocupado) return;
    el.value = '';
    return IN.conv ? enviarConv_(t) : perguntarIa_(t);
  }

  /* ---------- abrir / fechar ---------- */
  /* faixa fixa no topo do balão quando a IA está desligada, sem cota ou fora do ar: o balão continua respondendo com os números do sistema */
  function mostrarModoChat_(msg){
    const el = $('iaModoChatAviso'); if(!el) return;
    if(!msg){ el.hidden = true; el.textContent = ''; return; }
    el.textContent = '⚠️ ' + msg; el.hidden = false;
  }
  function montar_(){
    const c = $('chatPublicoConteudo');
    c.innerHTML = '<div class="bi-seg" id="biSeg"><button type="button" data-bi="vista" data-v="conversa" class="on">✨ Conversa</button><button type="button" data-bi="vista" data-v="avisos">🔔 Avisos<i id="biSegN" hidden>0</i></button></div><div class="bi-avisos" id="biAvisos" hidden></div><div class="bi-aviso" id="biAviso" data-bi="fila" hidden></div><div class="bi-modo" id="iaModoChatAviso" role="status" hidden></div><div class="bi-ctrl" id="biCtrl" hidden></div><div class="chat-msgs bi-msgs" id="biMsgs"></div>' +
      '<div class="chat-envio"><input type="text" id="biTexto" maxlength="600" autocomplete="off" placeholder="Escreva o que precisa…"><button type="button" class="primary" data-bi="enviar">Enviar</button></div>';
    const tt = $('balaoIaTitulo'); if(tt) tt.innerHTML = '<span class="tex-av g" role="img" aria-label="' + ASSISTENTE_H_() + '"></span> ' + ASSISTENTE_H_() + '';
    const ex = $('balaoIaHdrExtra');
    if(ex){
      ex.innerHTML = '';
      if(window.IA && IA.podeUsar && IA.podeUsar()){
        const b = document.createElement('button'); b.id = 'iaDot'; b.type = 'button'; b.className = 'ia-dot visivel normal'; b.title = 'Status da IA'; b.setAttribute('aria-label', 'Status da IA');
        b.innerHTML = '<span>✨</span><i></i>'; b.addEventListener('click', () => IA.abrirStatus()); ex.appendChild(b);
      }
    }
  }
  /* ---------- AVISOS (antiga aba Notificações): vive dentro do assistente ---------- */
  const AV_ORDEM_ = [['pedido','🧾','Pedidos aguardando aceite',1],['ocorrencia','⚠️','Ocorrências abertas',1],['entrega','🛵','Entregas',1],['financeiro','💰','Contas vencidas',1],['sistema','🛠️','Sistema',1],['estoque','📦','Estoque baixo',0],['fidelidade','🎯','Cartão fidelidade quase completo',0],['indicacao','🎁','Indicações pendentes de resgate',0],['aniversario','🎂','Aniversariantes do mês',0],['inativos','💤','Clientes inativos',0]];
  IN.vista = 'conversa'; IN.avAberto = {}; IN.avMais = {}; IN.avAssin = ''; IN.avTotal = 0;
  function desenharAvisos_(forcar){
    const box = $('biAvisos'); if(!box || typeof NOTIF_CARDS_ === 'undefined' || typeof notifAtivoParaMim_ !== 'function') return;
    const com = [], sem = [];
    AV_ORDEM_.forEach(([ev, ic, tit, urg]) => {
      if(!notifAtivoParaMim_(ev)) return;
      const src = document.getElementById(NOTIF_CARDS_[ev]); if(!src) return;
      const tmp = document.createElement('div'); tmp.innerHTML = src.innerHTML;
      const cards = tmp.querySelectorAll(':scope > .notif-card');
      if(!cards.length){ sem.push(tit); return; }
      const LIM = 6; let mais = '';
      if(cards.length > LIM){
        cards.forEach((c, i) => { if(i >= LIM) c.classList.add('av-extra'); });
        mais = '<button type="button" class="ghost av-mais" data-bi="avmais" data-ev="' + ev + '">Ver todos (' + cards.length + ')</button>';
      }
      com.push({ ev, ic, tit, urg, n:cards.length, html: tmp.innerHTML + mais });
    });
    const assin = com.map(x => x.ev + x.n + x.html.length).join('|') + '#' + sem.join(',');
    if(!forcar && assin === IN.avAssin) return;
    IN.avAssin = assin;
    const unica = com.length <= 2;
    let h = com.map(x => '<details class="av-sec" data-ev="' + x.ev + '"' + ((IN.avAberto[x.ev] !== undefined ? IN.avAberto[x.ev] : false) ? ' open' : '') + '><summary><span class="av-ic">' + x.ic + '</span><span class="av-tt">' + esc(x.tit) + '</span><b class="av-n' + (x.urg ? ' urg' : '') + '">' + x.n + '</b><span class="av-seta">›</span></summary><div class="av-corpo' + (IN.avMais[x.ev] ? ' mais' : '') + '">' + x.html + '</div></details>').join('');
    if(!com.length) h = '<div class="av-vazio"><b>✅</b>Tudo em ordem.<br>Nenhum aviso no momento.</div>';
    else if(sem.length) h += '<div class="av-ok">✅ Em dia: ' + sem.map(esc).join(' · ') + '</div>';
    box.innerHTML = h;
  }
  /* chamada no fim de renderNotificacoes(): atualiza o selo do botão e, se estiver aberto, o painel */
  window.balaoAvisosRender_ = function(total){
    IN.avTotal = total || 0;
    const b = $('balaoIaAvisos'); const interno = logado() && perfilBalaoPermitido_();
    if(b){ b.hidden = !(interno && IN.avTotal > 0); b.textContent = '🔔 ' + IN.avTotal; }
    const sn = $('biSegN'); if(sn){ sn.hidden = !IN.avTotal; sn.textContent = String(IN.avTotal); }
    if(IN.aberto && IN.vista === 'avisos') desenharAvisos_(false);
  };
  function vista_(v){
    IN.vista = (v === 'avisos') ? 'avisos' : 'conversa';
    window.__avisosAberto_ = IN.aberto && IN.vista === 'avisos';
    const c = $('chatPublicoConteudo'); if(!c) return;
    c.classList.toggle('mostrando-avisos', IN.vista === 'avisos');
    const av = $('biAvisos'); if(av) av.hidden = IN.vista !== 'avisos';
    c.querySelectorAll('#biSeg button').forEach(b => b.classList.toggle('on', b.getAttribute('data-v') === IN.vista));
    const sn = $('biSegN'); if(sn){ sn.hidden = !IN.avTotal; sn.textContent = String(IN.avTotal); }
    if(IN.vista === 'avisos'){ try{ renderNotificacoes(); }catch(e){ if(window.erroTela_) erroTela_(e); } desenharAvisos_(true); }
    else setTimeout(() => { const t = $('biTexto'); if(t) t.focus(); }, 60);
  }
  document.addEventListener('toggle', ev => {
    const d = ev.target; if(!d || !d.classList || !d.classList.contains('av-sec')) return;
    IN.avAberto[d.getAttribute('data-ev')] = d.open;
  }, true);
  /* tocar num botão de um aviso (Tratar, Ver cliente…) abre outra janela: fecha o assistente para ela aparecer por cima */
  document.addEventListener('click', ev => {
    const bt = ev.target && ev.target.closest && ev.target.closest('#biAvisos .av-corpo button:not(.av-mais)');
    if(bt && IN.aberto) setTimeout(fechar_, 0);
  });
  function abrir_(){
    IN.aberto = true; IN.vista = 'conversa'; window.__avisosAberto_ = false;
    /* conversa em andamento continua ao reabrir o pop-up (só "Sair da conversa" ou "Encerrar" limpam) */
    if(IN.conv){
      const conv = IN.conv; IN.depois = 0;
      $('chatPublicoModal').classList.add('open'); montar_();
      ctrl_(); aviso_();
      bolha_('sis', '', 'Cliente: ' + (conv.nome || '—') + (conv.telefone ? ' · ' + conv.telefone : '') + ' · conversa retomada');
      if(conv.resumo) bolha_('ia', 'Resumo da IA', conv.resumo);
      atualizarMsgs_().then(agendar_);
      carregarFila_().then(f => { if(IN.conv && f && !f.some(y => String(y.id) === String(IN.conv.id))) bolha_('sis', '', 'Esta conversa não está mais na fila (foi encerrada ou assumida por outra pessoa).'); });
      if(window.IA && IA.atualizarStatus) IA.atualizarStatus();
      setTimeout(() => { const t = $('biTexto'); if(t) t.focus(); }, 60);
      return;
    }
    IN.conv = null; IN.pedindoSol = false;
    $('chatPublicoModal').classList.add('open'); montar_();
    if(IN.log && IN.log.length && Date.now() - IN.logTs > 7200000){ IN.log = []; IN.hist = []; }
    if(IN.log && IN.log.length){
      IN.log.forEach(m => bolha_(m.cls, m.rot, m.cont, m.rico)); ctrl_();
      carregarFila_(); if(window.IA && IA.atualizarStatus) IA.atualizarStatus();
      setTimeout(() => { const t = $('biTexto'); if(t) t.focus(); }, 60);
      return;
    }
    bolha_('ia', 'Assistente', '<div class="tex-hello"><div class="tex-corpo" role="img" aria-label="' + ASSISTENTE_H_() + ', o mascote"></div><div>Fala, chefe! Eu sou o ' + ASSISTENTE_H_() + '. Escreva o que precisa. Exemplos: "como faço uma venda?"' + (equipe_() ? ', "quanto tem de pão no estoque?", "tem cliente aguardando?"' : '') + '.</div></div>', true);
    carregarFila_(); if(window.IA && IA.atualizarStatus) IA.atualizarStatus();
    setTimeout(() => { const t = $('biTexto'); if(t) t.focus(); }, 60);
  }
  function fechar_(){
    /* fechar o pop-up NÃO encerra nem abandona a conversa: IN.conv e IN.pedindoSol são mantidos */
    IN.aberto = false; window.__avisosAberto_ = false; clearTimeout(IN.timer); IN.notifId = IN.depois;
    $('chatPublicoModal').classList.remove('open');
    const tt = $('balaoIaTitulo'); if(tt) tt.innerHTML = '<span class="tex-av g" role="img" aria-label="' + ASSISTENTE_H_() + '"></span> ' + ASSISTENTE_H_() + ' · Atendimento';
    const ex = $('balaoIaHdrExtra'); if(ex) ex.innerHTML = '';
  }
  function atualizarFab_(){
    const fab = $('balaoIa'); if(!fab) return;
    const interno = logado(), ligado = window.chatPublicoLigado_ === true;
    const mostrar = interno ? perfilBalaoPermitido_() : true;   // logado: só os perfis permitidos; sem login: o atendimento público, se estiver ligado
    if(interno && !mostrar && IN.aberto) fechar_();
    fab.style.display = mostrar ? 'block' : 'none';
    fab.hidden = !mostrar;
    fab.style.visibility = mostrar ? 'visible' : 'hidden';
    fab.style.opacity = mostrar ? '1' : '0';
    fab.style.pointerEvents = mostrar ? 'auto' : 'none';
    const rot = $('balaoIaRot'); if(rot) rot.textContent = interno ? 'Assistente' : 'Atendimento';
    const balao = $('balaoIa'); if(balao) balao.classList.toggle('so-icone', !interno);
    const bav = $('balaoIaAvisos'); if(bav){ bav.hidden = !(interno && mostrar && IN.avTotal > 0); }
    const ic = $('balaoIaIcone'); if(ic){ if(!ic.querySelector('.tex-av')) ic.innerHTML = '<span class="tex-av g" role="img" aria-label="' + ASSISTENTE_H_() + '"></span>'; }
    aviso_();
  }
  window.balaoIaAtualizar_ = atualizarFab_;
  window.balaoIaPode_ = () => perfilBalaoPermitido_();
  window.balaoIaAbrir_ = function(vista){
    if(logado()){ if(!perfilBalaoPermitido_()) return; abrir_(); if(vista === 'avisos') vista_('avisos'); return; }
    const ex = $('balaoIaHdrExtra'); if(ex) ex.innerHTML = '';
    const tt = $('balaoIaTitulo'); if(tt) tt.innerHTML = '<span class="tex-av g" role="img" aria-label="' + ASSISTENTE_H_() + '"></span> ' + ASSISTENTE_H_() + ' · Atendimento';
    if(window.abrirChatPublico_) window.abrirChatPublico_();
  };
  const fecharPublico = window.fecharChatPublico_;
  window.fecharChatPublico_ = function(){ if(IN.aberto) fechar_(); else if(fecharPublico) fecharPublico(); };

  /* ---------- eventos ---------- */
  document.addEventListener('click', ev => {
    const el = ev.target && ev.target.closest && ev.target.closest('#chatPublicoConteudo [data-bi]'); if(!el || !IN.aberto) return;
    const a = el.getAttribute('data-bi');
    if(a === 'enviar') enviar_();
    else if(a === 'fila'){ carregarFila_().then(mostrarFila_); }
    else if(a === 'vista') vista_(el.getAttribute('data-v'));
    else if(a === 'avmais'){ const ev2 = el.getAttribute('data-ev'); IN.avMais[ev2] = true; const cp = el.parentElement; if(cp) cp.classList.add('mais'); }
    else if(a === 'abrir') abrirConv_(el.getAttribute('data-id'));
    else if(a === 'assumir') assumir_();
    else if(a === 'encerrar') pedirSolucao_();
    else if(a === 'novaia') novaConversaIa_();
    else if(a === 'sair') sairConv_();
  });
  document.addEventListener('keydown', ev => {
    if(!IN.aberto) return;
    if(ev.key === 'Escape'){ fechar_(); return; }
    if(ev.key === 'Enter' && ev.target && ev.target.id === 'biTexto'){ ev.preventDefault(); enviar_(); }
  });
  document.addEventListener('visibilitychange', () => { if(!document.hidden && IN.aberto && IN.conv) atualizarMsgs_(); });

  /* ---------- ganchos (envolvem funções existentes sem trocar o comportamento delas) ---------- */
  function envolver(nome, depois){
    const orig = window[nome]; if(typeof orig !== 'function' || orig.__bi) return;
    const nova = function(){ const r = orig.apply(this, arguments); try{ depois.apply(this, arguments); }catch(e){} return r; };
    nova.__bi = true; window[nome] = nova;
  }
  envolver('entrarNoApp', () => { setTimeout(() => { atualizarFab_(); carregarFila_(); }, 1500); });
  envolver('aplicarPermissoesNivel', () => { atualizarFab_(); });
  if(typeof window.sair === 'function' && !window.sair.__bi){
    const so = window.sair;
    window.sair = async function(){ fechar_(); IN.log = []; IN.hist = []; IN.logTs = 0; IN.conv = null; IN.pedindoSol = false; IN.aguard = 0; IN.fila = []; IN.ultAguard = 0; IN.ultNL = 0; IN.vistos = {}; IN.nlMap = {}; IN.notifId = 0; const r = await so.apply(this, arguments); setTimeout(atualizarFab_, 300); return r; };
    window.sair.__bi = true;
  }
  /* fila a cada 10 s (antes 30 s) e, com o pop-up fechado, vigia a conversa em andamento para avisar mensagem nova do cliente */
  async function vigiarConvFechada_(){
    if(IN.aberto || !IN.conv || !equipe_() || navigator.onLine === false) return;
    let ms = null; try{ ms = await lerMsgs_(IN.conv.id, IN.depois); }catch(e){}
    if(!ms || !IN.conv || IN.aberto) return;
    const novas = ms.filter(m => m.autor === 'cliente' && m.id > (IN.notifId || 0));
    if(novas.length){ IN.notifId = Math.max.apply(null, novas.map(m => m.id)); notificarChat_('💬 Nova mensagem', 'Mensagem de ' + (IN.conv.nome || 'cliente') + ' na conversa em andamento.'); }
  }
  setInterval(() => { if(!document.hidden && equipe_() && navigator.onLine !== false){ carregarFila_(); vigiarConvFechada_(); } }, 10000);
  document.addEventListener('visibilitychange', () => { if(!document.hidden && equipe_() && navigator.onLine !== false){ carregarFila_(); vigiarConvFechada_(); } });
  setTimeout(atualizarFab_, 3000);
})();
