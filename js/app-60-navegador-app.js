/* =====================================================================
   NAVEGADOR DENTRO DO INSTAGRAM / FACEBOOK / TIKTOK (v1.24)
   Quem abre o link do cardápio por uma rede social cai no navegador interno dela.
   Ali o Google costuma BLOQUEAR o "Continuar com o Google" (erro 403: disallowed_useragent)
   e às vezes o pagamento pelo site e a localização também falham.
   • Faixa discreta no topo do cardápio: "Abrir no navegador" (Android abre direto no Chrome;
     iPhone mostra como fazer) + "Copiar link". Dá para fechar; volta só numa nova visita.
   • Ao tocar em "Continuar com o Google" dentro desse navegador: avisa ANTES e oferece abrir fora.
   Pedir sem conta continua funcionando normalmente aqui dentro.
   ===================================================================== */
(function(){
  'use strict';
  var UA = navigator.userAgent || '';
  var app = /Instagram/i.test(UA) ? 'Instagram' : /FBAN|FBAV|FB_IAB|FBIOS|FB4A|Messenger/i.test(UA) ? 'Facebook' : /musical_ly|TikTok|BytedanceWebview/i.test(UA) ? 'TikTok' : /\bLine\//i.test(UA) ? 'Line' : '';
  window.navegadorDeApp_ = function(){ return app; };
  if(!app) return;
  var android = /Android/i.test(UA), ios = /iPhone|iPad|iPod/i.test(UA);
  var CHAVE = 'txNavAppFechado';

  function linkAtual_(){ return location.href.split('#')[0]; }
  window.abrirForaDoApp_ = function(){
    var url = linkAtual_();
    if(android){
      /* intent: abre o mesmo endereço no navegador padrão (Chrome) fora do Instagram/Facebook */
      location.href = 'intent://' + url.replace(/^https?:\/\//, '') + '#Intent;scheme=https;action=android.intent.action.VIEW;S.browser_fallback_url=' + encodeURIComponent(url) + ';end';
      setTimeout(mostrarComoFazer_, 1500);
      return;
    }
    mostrarComoFazer_();
  };
  window.copiarLinkCardapio_ = function(){
    var url = linkAtual_(), ok = function(){ try{ avisar('Link copiado. Cole no Safari ou no Chrome.'); }catch(e){} };
    try{ navigator.clipboard.writeText(url).then(ok, function(){ prompt('Copie o link:', url); }); }
    catch(e){ try{ prompt('Copie o link:', url); }catch(e2){} }
  };
  function mostrarComoFazer_(){
    var passos = ios
      ? 'Toque em <b>•••</b> (ou no ícone de compartilhar) no canto da tela e escolha <b>"Abrir no navegador"</b> / <b>"Abrir no Safari"</b>.'
      : 'Toque em <b>⋮</b> no canto de cima da tela e escolha <b>"Abrir no navegador"</b> / <b>"Abrir no Chrome"</b>.';
    var m = document.getElementById('navAppModal');
    if(!m){ m = document.createElement('div'); m.className = 'modal-overlay'; m.id = 'navAppModal'; document.body.appendChild(m); }
    m.innerHTML = '<div class="modal-box" style="max-width:420px;"><div class="modal-header"><h2>Abrir no navegador</h2><button class="close-btn" type="button" aria-label="Fechar" onclick="fecharFormModal(\'navAppModal\')">✕</button></div>'
      + '<p>Você está no navegador do <b>' + app + '</b>. ' + passos + '</p>'
      + '<p class="sub">Se não achar a opção, copie o link e cole no ' + (ios ? 'Safari' : 'Chrome') + '. Seu carrinho fica guardado neste aparelho.</p>'
      + '<div class="btnrow" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;"><button type="button" class="small-gold" onclick="copiarLinkCardapio_()">Copiar link</button><button type="button" class="ghost" onclick="fecharFormModal(\'navAppModal\')">Continuar aqui</button></div></div>';
    try{ abrirFormModal('navAppModal'); }catch(e){ m.classList.add('open'); }
  }

  /* faixa no topo do cardápio */
  function faixa_(){
    try{
      if(sessionStorage.getItem(CHAVE) === '1') return;
      var cd = document.getElementById('cardapioPublico');
      if(!cd || document.getElementById('navAppFaixa')) return;
      var d = document.createElement('div'); d.id = 'navAppFaixa'; d.setAttribute('role', 'note');
      d.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 12px;padding:8px 10px;border-radius:12px;background:#2b1d0e;border:1px solid var(--gold,#d9a21b);color:var(--cream,#fff);font-size:13px;line-height:1.35;';
      d.innerHTML = '<span style="flex:1 1 200px;">Abriu pelo ' + app + '? Para <b>entrar com o Google</b> e <b>pagar pelo site</b>, abra no navegador. Pedir sem conta funciona aqui mesmo.</span>'
        + '<button type="button" class="small-gold" style="margin:0;" onclick="abrirForaDoApp_()">Abrir no navegador</button>'
        + '<button type="button" class="ghost" style="margin:0;padding:4px 8px;" aria-label="Fechar aviso" onclick="fecharFaixaNavApp_()">✕</button>';
      cd.insertBefore(d, cd.firstChild);
    }catch(e){}
  }
  window.fecharFaixaNavApp_ = function(){ try{ sessionStorage.setItem(CHAVE, '1'); }catch(e){} var d = document.getElementById('navAppFaixa'); if(d) d.remove(); };

  /* aviso antes do login com Google */
  function envolverGoogle_(){
    var g = window.contaGoogle_;
    if(typeof g !== 'function' || g.__navApp) return false;
    var n = function(abrir){
      var self = this, args = arguments;
      if(typeof vsForm !== 'function') return g.apply(self, args);
      vsForm({ titulo:'O Google pode bloquear aqui', texto:'No navegador do ' + app + ' o Google costuma recusar o login (aparece "erro 403"). Abra no navegador do celular para entrar com a sua conta. Se preferir, peça sem conta: funciona normalmente.', ok:'Continuar',
        campos:[{ id:'acao', tipo:'escolha', valor:'fora', opcoes:[{ v:'fora', t:'Abrir no navegador' }, { v:'tentar', t:'Tentar entrar aqui mesmo' }] }] })
        .then(function(r){ if(!r) return; if(r.acao === 'tentar') g.apply(self, args); else window.abrirForaDoApp_(); });
    };
    n.__navApp = true; window.contaGoogle_ = n; return true;
  }
  function iniciar_(){ faixa_(); if(!envolverGoogle_()) setTimeout(envolverGoogle_, 1500); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar_); else iniciar_();
})();
