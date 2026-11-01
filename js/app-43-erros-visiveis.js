/* =====================================================================
   NENHUM ERRO DISCRETO (v1.15)
   Regra do dono: quando algo dá errado, o cliente (cardápio) e a equipe
   (área de funcionários) PRECISAM ver e entender que houve um erro.

   O que este arquivo faz, sem mudar o que as telas já faziam:
   1) Erro de programa não tratado (travou um botão, uma conta, uma tela):
      mostra um aviso vermelho na hora, com o que fazer.
   2) Ação tocada pela pessoa que falhou no servidor (apiCall devolveu
      ok:false ou deu erro de rede) e a tela NÃO mostrou nada em ~2 s:
      mostra o motivo num aviso vermelho (rede de segurança).
   3) Mensagens de erro/atenção (showMsg ... 'warn') que caíram fora da
      vista ou numa parte escondida da tela: rola até elas ou repete
      num aviso. Ficam 15 s na tela (antes, 6 s).
   4) Todo aviso de falha mostrado vai para o registro de erros
      (Conexão e servidores → Erros do sistema, só Admin/Desenvolvedor).
   ===================================================================== */
(function(){
  'use strict';
  var WHATS_ = '5517988323473';
  var seq = 0;                       // conta mensagens mostradas (para saber se a tela já avisou)
  var ultimaAcao = 0;                // último toque/alteração feito pela pessoa
  var vistosErro = {};               // mesma mensagem não repete em 2 min
  var ultimoBanner = 0;

  function ehEquipe_(){ try{ return typeof currentUser !== 'undefined' && !!currentUser; }catch(e){ return false; } }
  function texto_(x){ try{ return String(x == null ? '' : (x.message || x)).slice(0, 220); }catch(e){ return ''; } }
  function ehRede_(m){ return /failed to fetch|networkerror|load failed|network request failed|tempo esgotado|demorou para responder|timeout|aborted|abort|sem conex|offline|err_internet/i.test(m || ''); }
  function registrarAviso_(msg, origem){ try{ if(window.ErrosCliente && window.ErrosCliente.aviso) window.ErrosCliente.aviso(String(msg).slice(0, 300), origem || ''); }catch(e){} }

  /* ---------- marca os toques da pessoa ---------- */
  ['click', 'change', 'submit', 'keydown'].forEach(function(ev){
    document.addEventListener(ev, function(e){
      if(ev === 'keydown' && e.key !== 'Enter') return;
      ultimaAcao = Date.now();
    }, true);
  });
  window.__acaoRecente_ = function(ms){ return Date.now() - ultimaAcao < (ms || 4000); };

  /* ---------- aviso de erro visível (usa os avisos do app) ---------- */
  function mostrarErro_(msg, opts){
    opts = opts || {};
    msg = String(msg || '').trim(); if(!msg) return;
    var agora = Date.now(), chave = msg.slice(0, 120);
    if(vistosErro[chave] && agora - vistosErro[chave] < 120000) return;
    if(!opts.forcar && agora - ultimoBanner < 4000) return;      // sem enxurrada de avisos
    vistosErro[chave] = agora; ultimoBanner = agora;
    if(opts.registrar !== false) registrarAviso_(msg, opts.origem || 'aviso-tela');
    try{
      if(typeof window.avisar === 'function'){ window.avisar(msg, 'erro', opts.ms || 12000); return; }
    }catch(e){}
    try{ alert(msg); }catch(e){}
  }
  window.mostrarErro_ = mostrarErro_;

  function msgErroPrograma_(det){
    if(ehEquipe_()) return '⚠️ Deu um erro no sistema e esta ação pode não ter terminado. Confira se ficou salvo e tente de novo. Se repetir, avise o Admin.' + (det ? ' (Detalhe: ' + det.slice(0, 120) + ')' : '');
    return '⚠️ Ops! Algo deu errado nesta tela. Tente de novo. Se continuar, fale com a gente no WhatsApp ' + WHATS_.replace(/^55(\d\d)(\d{5})(\d{4})$/, '($1) $2-$3') + '.';
  }
  function msgRede_(){
    return ehEquipe_()
      ? '📡 Sem conexão com o servidor agora: a ação não foi concluída. Confira a internet e tente de novo.'
      : '📡 Sem conexão agora: não conseguimos falar com o restaurante. Confira a internet e tente de novo.';
  }
  window.msgErroPrograma_ = msgErroPrograma_;

  /* ---------- 1) erros de programa não tratados ---------- */
  var IGNORAR_ = /ResizeObserver loop|^Script error\.?$|Non-Error promise rejection|NotAllowedError|play\(\) request|interrupted by a call to pause|The play\(\) request|AbortError|SbSessaoExpirada|Extension context|chrome-extension|moz-extension|safari-extension|webkit-masked-url|__gCrWeb|instantSearchSDKJSBridgeClearHighlight|Can't find variable: (?:gmo|_AutofillCallbackHandler)|_META\.IABInnerFrame|IABInnerFrame|FBNavigation|fbq is not defined/i;
  function tratarNaoCapturado_(det, arquivo){
    try{
      det = texto_(det);
      if(!det || IGNORAR_.test(det) || IGNORAR_.test(arquivo || '')) return;
      var arq = String(arquivo || '').split(/[?#]/)[0].replace(location.origin, '');
      if(arq && !/\/(js\/)?app-|index\.html|\/$/.test(arq)) return;   // erro de script de fora (extensão, Mercado Pago)
      if(ehRede_(det)){
        if(window.__acaoRecente_(10000) || !navigator.onLine) mostrarErro_(msgRede_(), { registrar:false });
        return;
      }
      mostrarErro_(msgErroPrograma_(det), { registrar:false });   // o registro do erro em si já é feito pelo capturaErros do index.html
    }catch(e){}
  }
  window.addEventListener('error', function(e){
    if(e.target && e.target !== window) return;              // imagem/arquivo que não carregou
    tratarNaoCapturado_(e.message || (e.error && e.error.message), e.filename || '');
  });
  window.addEventListener('unhandledrejection', function(e){
    var r = e.reason;
    if(r && r.constructor && r.constructor.name === 'SbSessaoExpirada_') return;   // a sessão expirada já tem aviso próprio
    tratarNaoCapturado_(r && r.message ? r.message : r, (r && r.stack && (String(r.stack).match(/https?:\/\/[^\s)]+/) || [''])[0]) || '');
  });

  /* ---------- contar mensagens que a tela já mostrou ---------- */
  function envolver_(nome){
    var o = window[nome]; if(typeof o !== 'function' || o.__vis) return;
    var n = function(){ seq++; return o.apply(this, arguments); }; n.__vis = true; window[nome] = n;
  }
  envolver_('avisar'); envolver_('confirmar');

  /* ---------- 3) showMsg: erro sempre à vista ---------- */
  function visivel_(el){ try{ return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)); }catch(e){ return true; } }
  function naTela_(el){ try{ var r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < (window.innerHeight || document.documentElement.clientHeight); }catch(e){ return true; } }
  (function(){
    var o = window.showMsg; if(typeof o !== 'function' || o.__vis) return;
    var n = function(id, text, type){
      seq++;
      var el = document.getElementById(id);
      if(!el){ if(text && type !== 'ok') mostrarErro_(text, { origem:'showMsg-sem-campo:' + id }); return; }
      var r = o.apply(this, arguments);
      if(type === 'warn' && text){
        try{
          el.setAttribute('role', 'alert');
          clearTimeout(el._t); el._t = setTimeout(function(){ el.className = 'msg'; }, 15000);
          if(!visivel_(el)) mostrarErro_(text, { origem:'showMsg-escondido:' + id, forcar:true });
          else if(!naTela_(el)) el.scrollIntoView({ block:'center', behavior:'smooth' });
          if(/n[aã]o foi poss[ií]vel|n[aã]o consegu|erro |falh|fora do ar|sem conex|tempo esgot|inesperad/i.test(text)) registrarAviso_(text, 'showMsg:' + id);
        }catch(e){}
      }
      return r;
    };
    n.__vis = true; window.showMsg = n;
  })();

  /* ---------- 2) rede de segurança das ações tocadas pela pessoa ---------- */
  var SILENCIO_ = /^(getVersoes|getDadosGrupo|getAll|detectarNovosPedidos|getCardapio|getStatusPedidoPublico|getMesaPublica|obterArmazenamentoContingencia|obterChaveContingencia|listarSessoes|marcarAparelhoEquipe|pushInscrever|pushCancelar|encerrarSessao|saudeSistema|visitasCardapioHoje|margemAlerta|ifoodLacunas)$/;
  (function(){
    var o = window.apiCall; if(typeof o !== 'function' || o.__vis) return;
    var n = async function(action, payload, _t, _i){
      var doUsuario = _t === undefined && window.__acaoRecente_(5000) && !SILENCIO_.test(String(action));
      var s0 = seq;
      var depois = function(msg){
        setTimeout(function(){ if(seq === s0) mostrarErro_(msg, { origem:'apiCall:' + action }); }, 2200);
      };
      try{
        var r = await o.apply(this, arguments);
        if(doUsuario && r && r.ok === false && !r.sessaoExpirada && !r.manutencao && !r.conflito && !r.duplicado && !r.negado_silencioso){
          depois('⚠️ ' + (r.message || 'Não foi possível concluir. Nada foi gravado.') );
        }
        return r;
      }catch(e){
        if(doUsuario && !(e && e.constructor && e.constructor.name === 'SbSessaoExpirada_')){
          var m = texto_(e);
          depois(ehRede_(m) || !navigator.onLine ? msgRede_() : ('⚠️ Não foi possível concluir: ' + (m || 'erro desconhecido') + '. Confira e tente de novo.'));
        }
        throw e;
      }
    };
    n.__vis = true; window.apiCall = n;
  })();
  /* toda conversa com o servidor passa por sbJson_ (pedidos, conta do cliente, chat, fotos, backup):
     sem internet ou servidor caído (5xx) logo depois de um toque, e a tela calada → avisa */
  (function(){
    var o = window.sbJson_; if(typeof o !== 'function' || o.__vis) return;
    var n = async function(url, opts, ms, rep){
      var doUsuario = window.__acaoRecente_(5000) && !/\/rpc\/(registrar_erro|api_get_versoes|api_detectar_novos)/.test(String(url));
      var s0 = seq;
      try{
        var r = await o.apply(this, arguments);
        if(doUsuario && r && r.status >= 500){
          setTimeout(function(){ if(seq === s0) mostrarErro_(ehEquipe_()
            ? '⚠️ O servidor respondeu com erro (' + r.status + '). A ação pode não ter sido concluída: confira e tente de novo.'
            : '⚠️ O sistema do restaurante está com problema agora (erro ' + r.status + '). Tente de novo em instantes ou fale com a gente no WhatsApp.', { origem:'sbJson:' + r.status }); }, 2200);
        }
        return r;
      }catch(e){
        if(doUsuario) setTimeout(function(){ if(seq === s0) mostrarErro_(msgRede_(), { registrar:false }); }, 2200);
        throw e;
      }
    };
    n.__vis = true; window.sbJson_ = n;
  })();
})();

/* ---------- Admin/Desenvolvedor: Conexão e servidores → Erros do sistema ---------- */
async function carregarErrosSistema_(){
  const box = document.getElementById('errosLista'), res = document.getElementById('errosResumo'), sec = document.getElementById('errosSistemaBox');
  if(!box) return;
  const nivel = currentUser && currentUser.nivel;
  if(nivel !== 'Admin' && nivel !== 'Desenvolvedor'){ if(sec) sec.style.display = 'none'; return; }
  if(sec) sec.style.display = '';
  box.innerHTML = '<div class="notif-empty">Carregando…</div>';
  try{
    const r = await apiCall('errosSistema', { onde:(document.getElementById('errosOnde')||{}).value || 'todos', dias:(document.getElementById('errosDias')||{}).value || 7 });
    if(!r || !r.ok){ box.innerHTML = '<div class="notif-empty" role="alert">⚠️ ' + escH((r && r.message) || 'Não foi possível carregar os erros agora.') + '</div>'; return; }
    const z = r.resumo || {};
    if(res) res.textContent = 'Cardápio: ' + (z.cardapio || 0) + ' ocorrência(s) · Equipe: ' + (z.equipe || 0) + ' ocorrência(s)';
    const it = r.itens || [];
    if(!it.length){ box.innerHTML = '<div class="notif-empty">✅ Nenhum erro em aberto neste período.</div>'; return; }
    const tipoTxt = { error:'Erro de programa', promise:'Erro de programa', aviso:'Aviso de falha mostrado' };
    const quando = d => { try{ return new Date(d).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }); }catch(e){ return String(d || ''); } };
    box.innerHTML = it.map(x => `<div class="notif-card" style="border-left:4px solid ${x.tipo==='aviso' ? '#f0a500' : '#d6336c'};">
      <b>${x.onde==='cardapio' ? '🛒 Cardápio (cliente)' : '👥 Equipe (' + escH(x.niveis || '') + ')'} · ${escH(tipoTxt[x.tipo] || x.tipo)}</b>
      <div style="margin:4px 0;">${escH(x.mensagem || '')}</div>
      <div class="obs-line">${x.ocorrencias}× · ${x.pessoas} pessoa(s)/aparelho(s) · última ${quando(x.ultima)}${x.tela ? ' · tela ' + escH(x.tela) : ''}${x.versao ? ' · v' + escH(x.versao) : ''}</div>
      ${x.origem || x.pilha ? `<details class="mt-1"><summary class="fs-xs">Detalhes técnicos</summary><pre style="white-space:pre-wrap;font-size:11px;margin:4px 0;">${escH((x.origem || '') + '\n' + (x.pilha || ''))}</pre></details>` : ''}
      <div class="btnrow mt-1"><button class="small-gold" type="button" onclick="resolverErroSistema_('${escH(x.hash)}')">✓ Resolvido</button></div>
    </div>`).join('');
  }catch(e){ box.innerHTML = '<div class="notif-empty" role="alert">📡 Sem conexão para carregar os erros agora.</div>'; }
}
async function resolverErroSistema_(hash){
  try{
    const r = await apiCall('errosSistema', { resolver:hash, onde:(document.getElementById('errosOnde')||{}).value || 'todos', dias:(document.getElementById('errosDias')||{}).value || 7 });
    if(!r || !r.ok){ mostrarErro_('⚠️ ' + ((r && r.message) || 'Não foi possível marcar como resolvido.')); return; }
    avisar('Marcado como resolvido. Se acontecer de novo, ele volta para a lista.', 'ok');
    carregarErrosSistema_();
  }catch(e){ mostrarErro_('📡 Sem conexão: não foi possível marcar como resolvido.'); }
}
(function(){
  /* carrega junto com a Saúde do sistema (abrir "Conexão e servidores") */
  const o = window.carregarSaude_; if(typeof o !== 'function' || o.__erros) return;
  const n = async function(){ const r = await o.apply(this, arguments); try{ const m = document.getElementById('conexaoModal'); if(m && m.classList.contains('open')) carregarErrosSistema_(); }catch(e){} return r; };
  n.__erros = true; window.carregarSaude_ = n;
})();

/* parte da tela que não conseguiu se desenhar (antes: catch vazio, a tela ficava velha sem ninguém saber) */
window.erroTela_ = function(e, onde){
  try{ if(window.ErrosCliente && ErrosCliente.erro) ErrosCliente.erro(e, onde || 'render'); }catch(_){}
  try{
    window.__erroTelaVisto_ = window.__erroTelaVisto_ || {};
    const k = String((e && e.message) || e).slice(0, 80), agora = Date.now();
    if(window.__erroTelaVisto_[k] && agora - window.__erroTelaVisto_[k] < 600000) return;
    window.__erroTelaVisto_[k] = agora;
    const equipe = typeof currentUser !== 'undefined' && !!currentUser;
    mostrarErro_(equipe
      ? '⚠️ Uma parte da tela não conseguiu se atualizar (erro no sistema). O que foi salvo continua salvo. Feche e abra a tela de novo; se repetir, avise o Admin. (Detalhe: ' + k + ')'
      : '⚠️ Uma parte da tela não carregou direito. Puxe a página para baixo para recarregar. Se continuar, fale com a gente no WhatsApp.', { registrar:false });
  }catch(_){}
};
