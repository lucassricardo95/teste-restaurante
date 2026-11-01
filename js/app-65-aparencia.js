/* =====================================================================
   APARÊNCIA (v1.27) — Administrador → Sistema → Aparência
   O dono escolhe nome, slogan, nome do assistente, cores (tema pronto ou seletor de cor) e logos, vê a prévia e salva.
   A marca fica no banco do restaurante (api_marca_publica / api_marca_salvar) e é guardada no aparelho para o app abrir já com ela.
   ===================================================================== */
(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const e_ = s => (typeof escH === 'function' ? escH(s) : String(s == null ? '' : s));
  const TEMAS = [
    { id:'classico', nome:'Clássico', destaque:'#d9a21b', botao:'#8c1c13', fundo:'#14100c' },
    { id:'creme', nome:'Creme (claro)', destaque:'#9a5b00', botao:'#b3261e', fundo:'#faf6ef' },
    { id:'branco', nome:'Branco (claro)', destaque:'#1f5fbf', botao:'#1f5fbf', fundo:'#ffffff' },
    { id:'brasa', nome:'Brasa', destaque:'#e0b53a', botao:'#d20807', fundo:'#0b0705' },
    { id:'verde', nome:'Verde', destaque:'#7ed957', botao:'#1f8f4e', fundo:'#07120b' },
    { id:'azul', nome:'Azul', destaque:'#5aa9ff', botao:'#1f5fbf', fundo:'#07101c' },
    { id:'roxo', nome:'Roxo', destaque:'#c58bff', botao:'#7b3fe4', fundo:'#10081c' },
    { id:'rosa', nome:'Rosa', destaque:'#ff8fb8', botao:'#d6336c', fundo:'#1a0a11' },
    { id:'laranja', nome:'Laranja', destaque:'#ffb347', botao:'#e8590c', fundo:'#160d05' },
    { id:'pb', nome:'Preto e branco', destaque:'#f2f2f2', botao:'#555555', fundo:'#0a0a0a' }
  ];
  const LOGOS = [
    ['cardapio', 'Logo principal', 'Aparece no cardápio, no login e no topo. Fundo transparente fica melhor.'],
    ['impressao', 'Logo de impressão', 'Sai na comanda, no recibo e na placa da mesa. Sem ela, sai só o nome.'],
    ['icone', 'Ícone do app', 'Quadrado. É o desenho do app na tela inicial do celular (só muda ao reinstalar o app).']
  ];
  let F = null;   // formulário em edição

  function atual_(){ const m = window.MARCA || {}; return { nome:m.nome || '', slogan:m.slogan || '', assistente:m.assistente || 'Assistente', tema:m.tema || '', cores:Object.assign({}, m.cores), logos:Object.assign({}, m.logos) }; }
  function lum_(h){ const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4)); return .2126 * r + .7152 * g + .0722 * b; }
  const contraste_ = (a, b) => { const x = lum_(a), y = lum_(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };

  window.carregarAparencia_ = function(){
    const c = $('apCorpo'); if(!c) return;
    F = atual_();
    c.innerHTML =
      '<div class="row2"><div><label for="apNome">Nome do restaurante</label><input id="apNome" maxlength="60" value="' + e_(F.nome) + '" oninput="apLer_()"></div>'
      + '<div><label for="apAssist">Nome do assistente virtual</label><input id="apAssist" maxlength="24" value="' + e_(F.assistente) + '" oninput="apLer_()"></div></div>'
      + '<label for="apSlogan">Slogan (aparece no topo do cardápio)</label><input id="apSlogan" maxlength="80" value="' + e_(F.slogan) + '" placeholder="Ex.: Sabor que conquista" oninput="apLer_()">'
      + '<div class="vs-rot" style="margin-top:12px;">Tema pronto</div><div class="ap-temas">' + TEMAS.map(t =>
          '<button type="button" class="ap-tema' + (F.tema === t.id ? ' on' : '') + '" data-tema="' + t.id + '" onclick="apTema_(\'' + t.id + '\')" style="background:' + t.fundo + ';"><i style="background:' + t.destaque + '"></i><i style="background:' + t.botao + '"></i><span>' + t.nome + '</span></button>').join('') + '</div>'
      + '<div class="vs-rot" style="margin-top:12px;">Ou escolha cada cor (toque no quadrado)</div><div class="ap-cores">'
      + [['destaque', 'Destaque'], ['botao', 'Botão principal'], ['fundo', 'Fundo']].map(k => '<label class="ap-cor"><input type="color" id="apC_' + k[0] + '" value="' + e_(F.cores[k[0]]) + '" oninput="apCor_(\'' + k[0] + '\',this.value)"><span>' + k[1] + '</span></label>').join('') + '</div>'
      + '<div id="apAviso"></div><div class="ap-previa" id="apPrevia"></div>'
      + '<div class="vs-rot" style="margin-top:12px;">Logos</div>' + LOGOS.map(l =>
          '<div class="ap-logo"><div class="ap-logo-img" id="apImg_' + l[0] + '"></div><div style="flex:1;min-width:0;"><b>' + l[1] + '</b><div class="sub" style="margin:2px 0 6px;">' + l[2] + '</div>'
          + '<input type="file" accept="image/*" onchange="apLogo_(\'' + l[0] + '\',this)"></div></div>').join('')
      + '<div id="apMsg" class="msg" role="alert"></div>'
      + '<div class="d-flex" style="gap:8px;flex-wrap:wrap;margin-top:10px;"><button type="button" id="apSalvar" onclick="apSalvar_()" style="width:auto;margin:0;">Salvar aparência</button>'
      + '<button type="button" class="ghost" onclick="apPadrao_()" style="width:auto;margin:0;">Voltar ao padrão</button></div>';
    ap_pintar_();
  };
  window.apLer_ = function(){ if(!F) return; F.nome = $('apNome').value; F.assistente = $('apAssist').value; F.slogan = $('apSlogan').value; ap_pintar_(); };
  window.apTema_ = function(id){ const t = TEMAS.find(x => x.id === id); if(!t) return; F.tema = id; F.cores = { destaque:t.destaque, botao:t.botao, fundo:t.fundo }; ['destaque', 'botao', 'fundo'].forEach(k => { $('apC_' + k).value = F.cores[k]; });
    document.querySelectorAll('.ap-tema').forEach(b => b.classList.toggle('on', b.dataset.tema === id)); ap_pintar_(); };
  window.apCor_ = function(k, v){ F.cores[k] = v; F.tema = ''; document.querySelectorAll('.ap-tema').forEach(b => b.classList.remove('on')); ap_pintar_(); };
  function ap_pintar_(){
    const p = $('apPrevia'); if(!p || !F) return;
    const v = typeof marcaPaleta_ === 'function' ? marcaPaleta_(F.cores) : {};
    Object.keys(v).forEach(k => p.style.setProperty(k, v[k]));
    p.style.background = F.cores.fundo;
    const logo = F.logos.cardapio ? '<img src="' + e_(F.logos.cardapio) + '" alt="" style="height:54px;max-width:120px;object-fit:contain;">' : '';
    p.innerHTML = '<div style="display:flex;gap:12px;align-items:center;">' + logo + '<div><b style="color:' + F.cores.destaque + ';font-size:18px;">' + e_(F.nome || 'Seu restaurante') + '</b><div style="color:' + v['--muted'] + ';font-size:13px;">' + e_(F.slogan || 'Seu slogan aparece aqui') + '</div></div></div>'
      + '<div style="margin-top:10px;"><span class="ap-bt" style="background:' + F.cores.botao + ';">Fazer pedido</span> <span class="ap-bt2" style="border-color:' + F.cores.destaque + ';color:' + F.cores.destaque + ';">Ver cardápio</span></div>';
    LOGOS.forEach(l => { const b = $('apImg_' + l[0]); if(b) b.innerHTML = F.logos[l[0]] ? '<img src="' + e_(F.logos[l[0]]) + '" alt="">' : '<small>sem imagem</small>'; });
    const av = [];
    if(contraste_(F.cores.destaque, F.cores.fundo) < 3) av.push('O <b>destaque</b> está parecido com o fundo: títulos e preços ficam difíceis de ler.');
    if(contraste_('#ffffff', F.cores.botao) < 3) av.push('O texto branco do <b>botão principal</b> fica difícil de ler nessa cor. Escolha uma cor mais escura.');
    if(contraste_(F.cores.fundo, lum_(F.cores.fundo) > .4 ? '#000000' : '#ffffff') < 7) av.push('O <b>fundo</b> está num tom médio: as letras podem ficar difíceis de ler. Prefira um fundo bem claro ou bem escuro.');
    $('apAviso').innerHTML = av.length ? '<div class="msg warn" style="display:block;margin-top:8px;">⚠️ ' + av.join('<br>⚠️ ') + '</div>' : '';
  }
  function reduzir_(arq, max){
    return new Promise((ok, no) => { const im = new Image(), u = URL.createObjectURL(arq);
      im.onload = () => { const e = Math.min(1, max / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(im.width * e)); cv.height = Math.max(1, Math.round(im.height * e)); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(u); cv.toBlob(b => b ? ok(b) : no(new Error('Imagem inválida.')), 'image/png'); };
      im.onerror = () => no(new Error('Não consegui ler essa imagem. Use PNG, JPG ou WebP.')); im.src = u; });
  }
  window.apLogo_ = async function(tipo, inp){
    const f = inp.files && inp.files[0]; if(!f) return;
    try{
      if(f.size > 12 * 1024 * 1024) throw new Error('A imagem é muito grande (máximo 12 MB).');
      const s = typeof sbSessaoLer_ === 'function' ? sbSessaoLer_() : null; if(!s) throw new Error('Entre no sistema de novo para enviar imagens.');
      const b = await reduzir_(f, tipo === 'icone' ? 512 : 1024), cam = tipo + '-' + Date.now() + '.png';
      const r = await fetch(SUPABASE_URL_ + '/storage/v1/object/marca/' + cam, { method:'POST', headers:{ apikey:SUPABASE_CHAVE_, Authorization:'Bearer ' + s.access_token, 'Content-Type':'image/png' }, body:b });
      if(!r.ok){ const j = await r.json().catch(() => ({})); throw new Error('Não foi possível enviar a imagem (' + (j.message || j.error || r.status) + ').'); }
      F.logos[tipo] = SUPABASE_URL_ + '/storage/v1/object/public/marca/' + cam; ap_pintar_();
      showMsg('apMsg', 'Imagem enviada. Toque em "Salvar aparência" para valer.', 'ok');
    }catch(e){ showMsg('apMsg', '⚠️ ' + (e.message || 'Falha ao enviar a imagem.'), 'warn'); }
  };
  async function enviar_(corpo, okMsg){
    const senha = typeof pedirSenha_ === 'function' ? await pedirSenha_() : null; if(!senha) return;
    const bt = $('apSalvar'); if(bt) bt.disabled = true;
    try{
      const r = await sbRpc_('api_marca_salvar', { p:Object.assign({ senha }, corpo) });
      if(bt) bt.disabled = false;
      if(!r || r.ok !== true){ showMsg('apMsg', '⚠️ ' + ((r && r.message) || 'Não foi possível salvar. Nada foi gravado.'), 'warn'); return false; }
      showMsg('apMsg', '✅ ' + (r.message || okMsg), 'ok'); return true;
    }catch(e){ if(bt) bt.disabled = false; showMsg('apMsg', '📡 Sem conexão. Nada foi gravado; tente de novo.', 'warn'); return false; }
  }
  window.apSalvar_ = async function(){
    apLer_();
    if(!F.nome.trim()) return showMsg('apMsg', '⚠️ Escreva o nome do restaurante.', 'warn');
    const m = { nome:F.nome.trim(), slogan:F.slogan.trim(), assistente:F.assistente.trim() || 'Assistente', tema:F.tema || '', cores:F.cores, logos:F.logos };
    if(await enviar_({ marca:m }, 'Aparência salva.')){ marcaGuardar_(m); window.carregarAparencia_(); showMsg('apMsg', '✅ Aparência salva. Os clientes veem a mudança na próxima vez que abrirem o app.', 'ok'); }
  };
  window.apPadrao_ = async function(){
    if(typeof confirmarTxt_ === 'function' && !await confirmarTxt_('Voltar ao visual original deste restaurante? Nome, cores e logos escolhidos aqui serão descartados.', 'Voltar ao padrão', true)) return;
    if(await enviar_({ padrao:true }, 'Aparência original restaurada.')){ marcaLimpar_(); window.carregarAparencia_(); showMsg('apMsg', '✅ Aparência original restaurada.', 'ok'); }
  };

  /* O cardápio e a equipe já abrem com a marca guardada no aparelho; aqui ela é conferida no banco e atualizada se mudou. */
  let ultima = 0;
  async function conferirMarca_(){
    if(Date.now() - ultima < 10 * 60 * 1000 || typeof sbRpcPublico_ !== 'function' || !apiConfigurada()) return; ultima = Date.now();
    try{ const r = await sbRpcPublico_('api_marca_publica', { p:{} });
      if(r && r.ok === true && r.marca){ if(Object.keys(r.marca).length) marcaGuardar_(r.marca); else marcaLimpar_(); } }catch(e){}
  }
  window.conferirMarca_ = conferirMarca_;
  setTimeout(conferirMarca_, 1500);
  document.addEventListener('visibilitychange', () => { if(!document.hidden) conferirMarca_(); });
})();
