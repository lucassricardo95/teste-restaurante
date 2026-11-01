/* ---------- RESTAURAR SESSÃO SALVA ----------
   Não depende mais de parâmetro de URL — só verifica sessão de funcionário.
   O acompanhamento do pedido agora só abre pelo botão no rodapé. */
/* CORREÇÃO "desloga ao atualizar": entrarNoApp() usa funções declaradas nos scripts seguintes (ex.: garantirChaveLeitura_).
   Rodar a restauração aqui, no meio da página, dava ReferenceError, o catch engolia o erro e o cardápio público aparecia como se a
   sessão tivesse caído. Agora espera TODOS os scripts carregarem (DOMContentLoaded) e registra no console qualquer falha. */
function tentarRestaurarSessao(){
  try{
    const raw = localStorage.getItem(SESSAO_KEY);
    if(raw){ currentUser = JSON.parse(raw); if(!currentUser.nivelReal) currentUser.nivelReal = currentUser.nivel; if(currentUser.nivelReal === 'Desenvolvedor'){ currentUser.nivel = 'Admin'; currentUser.verComo = ''; } entrarNoApp(); return; }
  } catch(e){ console.error('Falha ao restaurar a sessão:', e); }
  if(window.txbSplashFim_) window.txbSplashFim_();   // sessão salva que não vale: mostra a entrada normal
  carregarCardapioPublico();
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tentarRestaurarSessao); else tentarRestaurarSessao();

/* ---------- OLHINHO DA SENHA ---------- */
(function(){
  var AUTO_OCULTAR_MS = 15000;           // volta a esconder sozinha depois de 15 s
  var JA_TEM_MOSTRAR = { spAtual:1, spNova:1, spConfirma:1 }; // já têm a opção "Mostrar senhas"
  var pares = [];

  function ocultar(inp, btn){
    inp.type = 'password';
    btn.textContent = '👁';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', 'Mostrar senha');
    btn.title = 'Mostrar senha';
    if(inp._olhoTimer){ clearTimeout(inp._olhoTimer); inp._olhoTimer = null; }
  }

  function mostrar(inp, btn){
    inp.type = 'text';
    btn.textContent = '🙈';
    btn.setAttribute('aria-pressed', 'true');
    btn.setAttribute('aria-label', 'Ocultar senha');
    btn.title = 'Ocultar senha';
    if(inp._olhoTimer) clearTimeout(inp._olhoTimer);
    inp._olhoTimer = setTimeout(function(){ ocultar(inp, btn); }, AUTO_OCULTAR_MS);
  }

  function adicionarOlho(inp){
    if(inp.getAttribute('data-olho')) return;
    if(inp.id && JA_TEM_MOSTRAR[inp.id]) return;
    inp.setAttribute('data-olho', '1');
    // com a senha visível, o teclado do celular não deve corrigir nem sugerir palavras
    inp.setAttribute('autocapitalize', 'off');
    inp.setAttribute('autocorrect', 'off');
    inp.setAttribute('spellcheck', 'false');

    var wrap = document.createElement('span');
    wrap.className = 'senha-wrap';
    inp.parentNode.insertBefore(wrap, inp);
    wrap.appendChild(inp);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'senha-olho';
    ocultar(inp, btn);
    btn.addEventListener('click', function(){
      if(inp.type === 'password') mostrar(inp, btn); else ocultar(inp, btn);
    });
    wrap.appendChild(btn);
    pares.push({ inp: inp, btn: btn });
  }

  function varrer(){
    var lista = document.querySelectorAll('input[type="password"]:not([data-olho])');
    for(var i = 0; i < lista.length; i++) adicionarOlho(lista[i]);
  }

  // segurança: ao sair do app/aba, esconde todas as senhas que estiverem visíveis
  document.addEventListener('visibilitychange', function(){
    if(document.hidden) pares.forEach(function(p){ ocultar(p.inp, p.btn); });
  });

  varrer();
  window.senhaOlhoVarrer = varrer; // se um dia criar um campo de senha novo via JavaScript, chame senhaOlhoVarrer()
})();

/* ===== AVISOS DO PEDIDO NO CELULAR DO CLIENTE (Web Push) =====
   1ª entrada no cardápio: aviso pequeno no topo "Quero receber / Agora não". A janela de permissão do celular só abre
   quando o cliente toca (o Chrome esconde e o iPhone bloqueia pedidos feitos sozinhos).
   "Agora não": não volta sozinho; aparece de novo UMA vez, no cartão "Pedido enviado".
   iPhone fora do app instalado: explica que precisa "Adicionar à Tela de Início".
   Cada pedido feito com os avisos ligados fica ligado a este aparelho (api_push_cliente_inscrever com o código).
   O toque no aviso abre ./?pedido=XXXXXXXX (acompanhamento) ou ./?feedback=XXXXXXXX ("Como foi seu pedido?"). */
(function(){
  var K_PERG = 'txAvisosPerguntado', K_PERG2 = 'txAvisosPerguntado2';
  function $(id){ return document.getElementById(id); }
  function ler(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function gravar(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
  function ehIOS(){ return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function standalone(){ try{ return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }catch(e){ return false; } }
  function equipeNoAparelho(){ try{ return !!localStorage.getItem(SESSAO_KEY); }catch(e){ return false; } }
  /* 'default' | 'granted' | 'denied' | 'ios' (precisa instalar) | 'nao' (navegador sem suporte) */
  function estado(){
    if(pushSuportado_()) return Notification.permission;
    if(ehIOS() && !standalone() && location.protocol === 'https:') return 'ios';
    return 'nao';
  }
  async function inscrever(codigo){
    var reg = await navigator.serviceWorker.ready;
    var sub = await reg.pushManager.getSubscription();
    if(!PUSH_CHAVE_PUBLICA_) throw new Error('Os avisos no celular ainda não foram configurados neste restaurante.');
    if(!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly:true, applicationServerKey: pushChaveBytes_(PUSH_CHAVE_PUBLICA_) });
    var p = sub.toJSON(); if(codigo) p.codigo = codigo;
    var r = await sbRpcPublico_('api_push_cliente_inscrever', { p: p });
    return !!(r && r.ok);
  }
  function esconder(){ var b = $('cdAvisosPedido'); if(b) b.style.display = 'none'; }
  function texto(html){ var t = $('cdAvisosTxt'); if(t) t.innerHTML = html; }

  /* chamado quando o cardápio do cliente aparece */
  window.cdAvisosIniciar_ = function(){
    try{
      if((typeof mesaQr !== 'undefined' && mesaQr) || (typeof currentUser !== 'undefined' && currentUser) || equipeNoAparelho()) return;
      var e = estado();
      if(e === 'granted'){ inscrever('').catch(function(){}); return; }   // já aceitou antes: mantém a inscrição viva, sem perguntar
      if(ler(K_PERG) || (e !== 'default' && e !== 'ios')) return;
      var b = $('cdAvisosPedido'); if(!b) return;
      if(e === 'ios'){
        texto('<b>🔔 Avisos do seu pedido</b>No iPhone, para receber os avisos, instale o app: Compartilhar → "Adicionar à Tela de Início" e abra por lá.');
        $('cdAvisosSim').textContent = 'Como instalar';
      }
      b.style.display = 'flex';
    }catch(err){}
  };
  window.cdAvisosAceitar_ = async function(){
    gravar(K_PERG, '1');
    if(estado() === 'ios'){ esconder(); if(window.instalarApp) window.instalarApp(); return; }
    var sim = $('cdAvisosSim'), nao = $('cdAvisosNao');
    if(sim) sim.disabled = true; if(nao) nao.style.display = 'none';
    try{
      var perm = await Notification.requestPermission();
      if(perm !== 'granted'){ texto('<b>Tudo bem!</b>Você pode acompanhar pelo botão "📦 Acompanhe seu pedido", no rodapé.'); }
      else { var ok = await inscrever(''); texto(ok ? '<b>✅ Pronto!</b>Você vai receber no celular os avisos dos seus pedidos.' : '<b>Não deu agora.</b>Os avisos serão ligados quando você fizer o pedido.'); }
    }catch(err){ texto('<b>Não deu agora.</b>Você pode acompanhar pelo botão "📦 Acompanhe seu pedido", no rodapé.'); }
    if(sim) sim.style.display = 'none';
    setTimeout(esconder, 4000);
  };
  window.cdAvisosRecusar_ = function(){ gravar(K_PERG, '1'); esconder(); };

  /* pedido enviado: liga o aparelho a este pedido; se ainda não aceitou, oferece UMA vez no cartão de confirmação */
  window.cdAvisosPosPedido_ = function(codigo){
    try{
      var e = estado();
      if(e === 'granted'){ inscrever(codigo).catch(function(){}); return; }
      if(e !== 'default' || ler(K_PERG2)) return;
      gravar(K_PERG2, '1'); gravar(K_PERG, '1'); esconder();
      var card = document.querySelector('#cdConfirmacaoPedido .cd-conf-card'); if(!card) return;
      var box = document.createElement('div'); box.className = 'cd-conf-avisos';
      box.innerHTML = '<b>🔔 Quer receber no celular os avisos deste pedido?</b><br>Confirmado, pronto, saiu para entrega e entregue.';
      var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'cd-conf-sec'; bt.textContent = 'Quero receber';
      bt.onclick = async function(){
        if(window.cdPararContagemWa_) cdPararContagemWa_();
        var c = card.querySelector('.cd-conf-cont'); if(c) c.style.display = 'none';
        bt.disabled = true;
        try{
          var perm = await Notification.requestPermission();
          if(perm !== 'granted'){ box.textContent = 'Tudo bem! Acompanhe pelo botão "📦 Acompanhe seu pedido", no rodapé.'; return; }
          var ok = await inscrever(codigo);
          box.textContent = ok ? '✅ Pronto! Você vai receber os avisos deste pedido.' : 'Não deu agora. Acompanhe pelo botão "📦 Acompanhe seu pedido", no rodapé.';
        }catch(err){ box.textContent = 'Não deu agora. Acompanhe pelo botão "📦 Acompanhe seu pedido", no rodapé.'; }
      };
      box.appendChild(bt);
      var dica = card.querySelector('.cd-conf-dica');
      if(dica) card.insertBefore(box, dica); else card.appendChild(box);
    }catch(err){}
  };

  /* toque no aviso: ./?pedido=XXXXXXXX ou ./?feedback=XXXXXXXX (também chega por mensagem do service worker com o app aberto) */
  function abrirPorUrl(url){
    try{
      var u = new URL(url, location.href), ped = u.searchParams.get('pedido'), fb = u.searchParams.get('feedback');
      if(!ped && !fb) return;
      if(typeof currentUser !== 'undefined' && currentUser) return;   // aparelho com a equipe logada: não abre telas do cliente
      if(ped && /^[0-9a-f]{8}$/.test(ped)){
        $('acompanhamentoConteudo').innerHTML = '<p class="sub">Carregando...</p>';
        $('acompanhamentoPedido').classList.add('open');
        abrirStatusPedido(ped);
      } else if(fb && /^[0-9a-f]{8}$/.test(fb)){
        var h = (typeof lerHistoricoPedidosCliente === 'function' ? lerHistoricoPedidosCliente() : []).find(function(x){ return x.codigo === fb; });
        cdAbrirFeedbackEspecial_({ origem:'aviso', codigo: fb, titulo: 'Como foi seu pedido' + (h && h.numero ? ' nº ' + h.numero : '') + '?' });
      }
    }catch(err){}
  }
  window.cdAvisosAbrirUrl_ = abrirPorUrl;
  function aoCarregar(){
    try{
      var q = location.search;
      if(!/[?&](pedido|feedback)=/.test(q)) return;
      try{ history.replaceState(null, '', location.pathname + location.hash); }catch(e){}
      setTimeout(function(){ abrirPorUrl('./' + q); }, 600);   // espera o cardápio montar
    }catch(err){}
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', aoCarregar); else aoCarregar();
  try{ if('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('message', function(ev){ if(ev.data && ev.data.tipo === 'abrir-url' && ev.data.url) abrirPorUrl(ev.data.url); }); }catch(err){}
})();

/* ===== ITEM 7 — INSTALAR APP (cardápio público) ===== */
(function(){
  var K_ADIA = 'txInstalarAdiado', K_OK = 'txAppInstalado';
  var evInstalar = null;
  function $(id){ return document.getElementById(id); }
  function standalone(){
    try{ return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }catch(e){ return false; }
  }
  function instalado(){
    if(standalone()) return true;
    try{ return localStorage.getItem(K_OK) === '1'; }catch(e){ return false; }
  }
  function adiado(){
    try{ var t = parseInt(localStorage.getItem(K_ADIA) || '0', 10); return !!t && (Date.now() - t) < 7*24*60*60*1000; }catch(e){ return false; }
  }
  function ehIOS(){
    return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function mostrarBanner(){
    var b = $('cdInstalarApp');
    if(b && !instalado() && !adiado()) b.style.display = 'flex';
  }
  function esconderTudo(){
    var b = $('cdInstalarApp'); if(b) b.style.display = 'none';
    var r = $('cdBtnInstalarRodape'); if(r) r.style.display = 'none';
    var s = document.querySelector('.cdInstRodapeSep'); if(s) s.style.display = 'none';
  }
  function abrirPassoAPasso(){
    if($('cdInstOverlay')) return;
    var ios = ehIOS();
    var passos = ios
      ? '<li>Toque no botão <b>Compartilhar</b> (quadrado com seta) na barra do Safari.</li><li>Role e toque em <b>Adicionar à Tela de Início</b>.</li><li>Toque em <b>Adicionar</b>.</li>'
      : '<li>Toque no menu <b>⋮</b> do navegador (canto superior direito).</li><li>Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li><li>Confirme em <b>Instalar</b>.</li>';
    var d = document.createElement('div');
    d.id = 'cdInstOverlay';
    d.className = 'modal-overlay open';
    d.innerHTML = '<div class="modal-box"><div class="modal-header"><h2>Instalar o app</h2><button class="close-btn" onclick="fecharPassoAPasso()" aria-label="Fechar">✕</button></div>' +
      '<ol class="cd-inst-ol">' + passos + '</ol>' +
      (ios ? '<p class="cd-inst-nota">No iPhone, use o Safari para instalar.</p>' : '') +
      '<button class="primary" onclick="fecharPassoAPasso()">Entendi</button></div>';
    d.addEventListener('click', function(e){ if(e.target === d) fecharPassoAPasso(); });
    document.body.appendChild(d);
  }
  window.fecharPassoAPasso = function(){
    var d = $('cdInstOverlay'); if(d) d.remove();
  };
  window.instalarApp = function(){
    if(evInstalar){
      var ev = evInstalar;
      evInstalar = null;
      try{
        ev.prompt();
        ev.userChoice.then(function(r){ if(r && r.outcome === 'accepted') esconderTudo(); }).catch(function(){});
      }catch(e){ abrirPassoAPasso(); }
    } else {
      abrirPassoAPasso();
    }
  };
  window.adiarInstalarApp = function(){
    try{ localStorage.setItem(K_ADIA, String(Date.now())); }catch(e){}
    var b = $('cdInstalarApp'); if(b) b.style.display = 'none';
  };
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    evInstalar = e;
    mostrarBanner();
  });
  window.addEventListener('appinstalled', function(){
    evInstalar = null;
    try{ localStorage.setItem(K_OK, '1'); }catch(e){}
    esconderTudo();
  });
  function iniciar(){
    if(instalado()){ esconderTudo(); return; }
    if(ehIOS()) mostrarBanner(); // iOS não dispara beforeinstallprompt
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
  else iniciar();
})();

/* ===== ITEM 8 — QR CODE DO APP (pop-up dentro da página) ===== */
(function(){
  function $(id){ return document.getElementById(id); }
  function linkApp(){
    try{ return new URL('./', location.href).href; }catch(e){ return location.href.split('#')[0].split('?')[0]; }
  }
  function msgQr(t){
    var m = $('cdQrMsg'); if(!m) return;
    m.textContent = t;
    setTimeout(function(){ if(m.textContent === t) m.textContent = ''; }, 2500);
  }
  window.fecharQrApp = function(){
    var d = $('cdQrOverlay'); if(d) d.remove();
  };
  window.copiarLinkApp = function(){
    var l = linkApp();
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(l).then(function(){ msgQr('Link copiado!'); }).catch(function(){ selecionarLinkApp_(); });
    } else { selecionarLinkApp_(); }
  };
  function selecionarLinkApp_(){
    var i = $('cdQrLink'); if(!i) return;
    i.focus(); i.select();
    try{ document.execCommand('copy'); msgQr('Link copiado!'); }catch(e){ msgQr('Toque e segure no link para copiar.'); }
  }
  window.compartilharLinkApp = function(){
    var l = linkApp();
    if(navigator.share){
      navigator.share({ title: '' + NOME_RESTAURANTE_ + '', text: 'Peça no ' + NOME_RESTAURANTE_ + ' pelo app:', url: l }).catch(function(){});
    } else { copiarLinkApp(); }
  };
  window.baixarQrApp = function(){
    var c = document.querySelector('#cdQrImg canvas');
    if(!c){ msgQr('O QR Code ainda não carregou.'); return; }
    try{
      var a = document.createElement('a');
      a.href = c.toDataURL('image/png');
      a.download = 'qrcode-texas-burger.png';
      document.body.appendChild(a); a.click(); a.remove();
    }catch(e){ msgQr('Segure o dedo sobre o QR Code para salvar.'); }
  };
  window.abrirQrApp = function(){
    if($('cdQrOverlay')) return;
    var l = linkApp();
    var d = document.createElement('div');
    d.id = 'cdQrOverlay';
    d.className = 'modal-overlay open';
    d.innerHTML =
      '<div class="modal-box cd-qr-box">' +
        '<div class="modal-header"><h2>QR Code do app</h2><button class="close-btn" onclick="fecharQrApp()" aria-label="Fechar">✕</button></div>' +
        '<div class="cd-qr-aviso">Aponte a câmera do celular para o QR Code</div>' +
        '<div class="cd-qr-img" id="cdQrImg"></div>' +
        '<input class="cd-qr-link" id="cdQrLink" readonly aria-label="Link do app">' +
        '<div class="cd-qr-acoes">' +
          '<button onclick="copiarLinkApp()">Copiar link</button>' +
          '<button onclick="compartilharLinkApp()">Compartilhar</button>' +
          '<button onclick="baixarQrApp()">Baixar imagem</button>' +
        '</div>' +
        '<div class="cd-qr-aviso" id="cdQrMsg" style="min-height:14px;"></div>' +
        '<ol class="cd-qr-passos">' +
          '<li><b>Android (Chrome):</b> abrir o link e tocar em "Instalar app" (ou menu ⋮ → Instalar app).</li>' +
          '<li><b>iPhone (Safari):</b> abrir o link e tocar em Compartilhar → "Adicionar à Tela de Início".</li>' +
        '</ol>' +
        '<button class="primary" onclick="fecharQrApp()">Fechar</button>' +
      '</div>';
    d.addEventListener('click', function(e){ if(e.target === d) fecharQrApp(); });
    document.body.appendChild(d);
    $('cdQrLink').value = l;
    var img = $('cdQrImg');
    img.textContent = 'Gerando...';
    img.style.color = '#333';
    try{
      img.textContent = '';
      var mat = QR_.encode(l), q = 2, n = mat.length + q*2, esc = Math.max(3, Math.floor(240/n)), t = n*esc;
      var cv = document.createElement('canvas'); cv.width = cv.height = t;
      var cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0,0,t,t); cx.fillStyle = '#000';
      mat.forEach(function(lin,y){ lin.forEach(function(v,x){ if(v) cx.fillRect((x+q)*esc,(y+q)*esc,esc,esc); }); });
      img.appendChild(cv);
    }catch(e){
      img.style.display = 'none';
      var av = d.querySelector('.cd-qr-aviso');
      if(av) av.textContent = 'Não foi possível gerar o QR Code. Use o link abaixo.';
    }
  };
})();

/* Vibração curta em todo toque de botão.
   Android: navigator.vibrate. iPhone (Safari/app instalado, iOS 17.4+): um interruptor invisível, que dá o "tic" do sistema ao ser tocado.
   Aparelho sem nenhum dos dois: não faz nada, sem erro. */
var _vibSwitch_ = null;
function _vibIosSwitch_(){
  if(_vibSwitch_) return _vibSwitch_;
  const l = document.createElement('label');
  l.setAttribute('data-vib','1'); l.setAttribute('aria-hidden','true');
  l.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
  const c = document.createElement('input'); c.type = 'checkbox'; c.setAttribute('switch',''); c.tabIndex = -1;
  l.appendChild(c); document.body.appendChild(l); _vibSwitch_ = l; return l;
}
function vibrarToque_(ms){
  try{ if(typeof navigator.vibrate === 'function' && navigator.vibrate(ms || 30) === true) return 'android'; }catch(_){}
  try{ _vibIosSwitch_().click(); return 'ios'; }catch(_){}
  return '';
}
(function(){
  const SEL = 'button, summary, [role="button"], [onclick], select, label, input[type="checkbox"], input[type="radio"], input[type="button"], input[type="submit"]';
  let ultimo = 0;
  document.addEventListener('click', function(e){
    const t = e.target; if(!t || !t.closest) return;
    if(t.closest('[data-vib]')) return; // o clique do próprio interruptor invisível
    if(t.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea')) return; // digitar não vibra
    const el = t.closest(SEL); if(!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    const agora = Date.now(); if(agora - ultimo < 60) return; ultimo = agora;
    vibrarToque_(30);
  }, { passive:true });
})();
function testarVibracao_(){
  const temAndroid = typeof navigator.vibrate === 'function';
  let r = '';
  if(temAndroid){ try{ r = navigator.vibrate([200,100,200]) === true ? 'android' : 'bloqueada'; }catch(e){ r = 'bloqueada'; } }
  if(r === 'android'){
    showMsg('avisosMsg','Mandei vibrar (2 pulsos). Se você não sentiu: Configurações → Sons e vibração → Intensidade da vibração, e confira se a vibração está ligada e o modo de economia de bateria desligado. Se sentiu, os toques nos botões também vibram.','ok');
  } else {
    const via = vibrarToque_();
    if(via === 'ios') showMsg('avisosMsg','Este aparelho usa o toque do sistema (iPhone). Você deve sentir um leve "tic". Funciona no iOS 17.4 ou mais novo.','ok');
    else showMsg('avisosMsg','Este navegador não permite vibração. Tente abrir no Chrome (Android) ou no Safari (iPhone com iOS 17.4 ou mais novo).','warn');
  }
}
