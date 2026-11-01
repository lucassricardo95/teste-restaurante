/* =====================================================================
   v1.17 — Google Drive direto (sem Apps Script)
   Cartões "☁️ Google Drive" e "🗓️ Quanto tempo guardar" em Sistema → Backup e espaço (só Admin):
     • conectar o Drive principal e o Drive da contingência (cada um com a sua conta Google; senha pedida);
     • navegar pelas pastas, baixar arquivos, enviar arquivos (senha) e criar pastas;
     • o backup passa a ser copiado também por este caminho (função criar-backup).
   O Apps Script continua funcionando como antes; este é um caminho a mais.
   ===================================================================== */
(function(){
  'use strict';
  const esc = s => (typeof escH === 'function' ? escH(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])));
  const NOMES = { principal:'Drive principal', contingencia:'Drive da contingência' };
  const edge = (corpo, ms) => sb410Edge_('drive-api', corpo, ms || 60000);
  const ehAdmin = () => { try{ return !!currentUser && currentUser.nivel === 'Admin'; }catch(e){ return false; } };
  const fmtTam = n => { n = Number(n) || 0; return n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : n >= 1024 ? Math.round(n / 1024) + ' KB' : n + ' B'; };
  const fmtData = iso => iso ? new Date(iso).toLocaleDateString('pt-BR') : '';
  const erroTela = m => { try{ (window.mostrarErro_ || alert)(m, { forcar:true }); }catch(e){} };
  let estado = { contas: [], credenciais: true };

  /* ---------- volta do Google (…?drive=ok&conta=principal) ---------- */
  let retorno = null;
  try{
    const u = new URL(location.href), d = u.searchParams.get('drive');
    if(d){
      retorno = { ok: d === 'ok', conta: u.searchParams.get('conta') || '', msg: u.searchParams.get('msg') || '' };
      ['drive','conta','msg'].forEach(k => u.searchParams.delete(k));
      history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
    }
  }catch(e){}
  function tratarRetorno_(){
    if(!retorno) return;
    const r = retorno; retorno = null;
    try{ abrirAdministrador('integridade'); }catch(e){}
    setTimeout(() => {
      if(r.ok) { try{ window.avisar('✅ ' + (NOMES[r.conta] || 'Drive') + ' conectado.', 'ok', 8000); }catch(e){ alert('Drive conectado.'); } carregar_(); }
      else erroTela('⚠️ Não consegui conectar o ' + (NOMES[r.conta] || 'Drive') + '. ' + (r.msg || 'O Google não concluiu a autorização.'));
    }, 600);
  }
  if(retorno){ let tent = 0; const t = setInterval(() => { tent++; if(ehAdmin() && typeof abrirAdministrador === 'function'){ clearInterval(t); tratarRetorno_(); } else if(tent > 60) clearInterval(t); }, 500); }

  /* ---------- cartão "☁️ Google Drive" (conexão + limpar fotos sem uso + última limpeza automática) e cartão "🗓️ Quanto tempo guardar" ---------- */
  function montar_(){
    const aba = document.getElementById('tab-integridade'); if(!aba || document.getElementById('driveDiretoCard')) return !!document.getElementById('driveDiretoCard');
    const html = '<div class="card" id="driveDiretoCard"><h2>☁️ Google Drive</h2>'
      + '<div id="driveDiretoLista" class="cx-card"><div class="cx-linha"><span class="conn-bolha wait"></span><b>Verificando…</b></div></div>'
      + '<div id="driveDiretoMsg" class="obs-line" style="margin-top:8px;"></div>'
      + '<div id="driveLimpezaAuto" class="obs-line fs-xs" style="margin-top:8px;"></div>'
      + '<div id="fotosSemUsoBox" class="mt-2"></div></div>';
    const ref = document.getElementById('sb410Bk');
    if(ref) ref.insertAdjacentHTML('afterend', html); else aba.insertAdjacentHTML('beforeend', html);
    // o que quase nunca se mexe fica no Avançado
    const av = document.getElementById('bkAvancado');
    const extra = '<div id="drivePrazosCard" style="margin-top:10px;border-top:1px solid var(--line,#3a2d1d);padding-top:10px;"><b>🗓️ Quanto tempo guardar</b>'
      + '<div class="obs-line fs-xs" style="margin:4px 0 8px;">Depois deste prazo o arquivo é apagado sozinho do Drive, para não ocupar espaço à toa. Backups feitos na mão e os de antes de restaurar nunca são apagados.</div>'
      + '<div id="drivePrazosCorpo"><div class="obs-line">Carregando…</div></div></div>'
      + '<div id="driveDivisao" style="margin-top:10px;border-top:1px solid var(--line,#3a2d1d);padding-top:10px;"><b>🗂️ O que fica em cada Drive</b>'
      + '<div class="obs-line fs-xs" style="margin-top:4px;">Os dois Drives somam espaço. O principal guarda as fotos do cardápio, as notas de compra e os backups. O da contingência guarda as fotos do ponto, de perdas, recebimentos e ocorrências e os atestados, mais uma cópia das fotos do cardápio e dos backups.</div></div>';
    if(av) av.insertAdjacentHTML('beforeend', extra); else aba.insertAdjacentHTML('beforeend', '<div class="card">' + extra + '</div>');
    return true;
  }
  const CHAVE_LIMPA = { principal:'p', contingencia:'c' };
  function linha_(c){
    const cor = !c.conectado ? 'wait' : (c.ok ? 'ok' : 'bad');
    const sub = !c.conectado ? 'Não conectado' : (c.ok ? esc(c.email || 'conectado') + ' · desde ' + fmtData(c.desde) : '⚠️ ' + esc(c.erro || 'Autorização com problema'));
    const k = '\'' + c.conta + '\'';
    // problema ou não conectado: o botão para resolver fica à vista; com tudo certo, as opções ficam recolhidas
    const precisa = !c.conectado ? '<button class="small-gold" onclick="driveDiretoConectar(' + k + ')">Conectar</button>'
      : (!c.ok ? '<button class="small-gold" onclick="driveDiretoConectar(' + k + ')">Reconectar</button>' : '');
    const opcoes = c.conectado
      ? '<details style="margin:2px 0 0 20px;"><summary class="fs-xs" style="cursor:pointer;color:var(--muted);">Opções</summary><div class="btnrow" style="flex-wrap:wrap;margin-top:6px;">'
        + (c.ok ? '<button class="small-gold" onclick="driveDiretoAbrir(' + k + ')">Abrir pastas</button><button class="ghost" onclick="analisarFotosSemUso_(\'' + CHAVE_LIMPA[c.conta] + '\')">🧹 Limpar fotos sem uso</button><button class="ghost" onclick="restaurarFotosLimpeza_()">↩ Desfazer a última limpeza</button>' : '')
        + (c.ok ? '<button class="ghost" onclick="driveDiretoConectar(' + k + ')">Reconectar</button>' : '') + '<button class="ghost" onclick="driveDiretoDesconectar(' + k + ')">Desconectar</button></div></details>' : '';
    return '<div style="padding:8px 0;border-top:1px solid var(--line,#3a2d1d);"><div class="cx-linha" style="padding:0;"><span class="conn-bolha ' + cor + '"></span><b>' + esc(c.nome) + '</b></div>'
      + '<div class="fs-xs" style="color:var(--muted);margin:2px 0 6px 20px;">' + sub + '</div>' + (precisa ? '<div class="btnrow" style="margin-left:20px;">' + precisa + '</div>' : '') + opcoes + '</div>';
  }
  const ROTULOS = [['ponto','Fotos do ponto'],['evidencias','Perdas, recebimentos e ocorrências'],['atestados','Atestados'],['notas','Notas de compra'],['backups','Backups automáticos']];
  function limpezaAuto_(l){
    const box = document.getElementById('driveLimpezaAuto'); if(!box) return;
    if(!l){ box.innerHTML = '🗓️ Limpeza automática de fotos sem uso: roda sozinha uma vez por mês. Ainda não rodou.'; return; }
    const quando = l.em ? new Date(l.em).toLocaleDateString('pt-BR') : l.mes;
    if(l.erro){ box.innerHTML = '<span style="color:#ffb3ab;">⚠️ A limpeza automática de ' + esc(quando) + ' não terminou: ' + esc(l.erro) + ' Nada foi apagado além do que já foi dito aqui; ela tenta de novo no dia seguinte.</span>'; return; }
    const p = l.principal || {}, c = l.contingencia || {};
    box.innerHTML = '✅ Última limpeza automática (' + esc(quando) + '): principal ' + (p.removidas || 0) + ' foto(s), ' + esc(formatarBytes_(p.bytes)) + '; contingência ' + (c.removidas || 0) + ' foto(s), ' + esc(formatarBytes_(c.bytes)) + (l.replicadas ? '; ' + l.replicadas + ' foto(s) do cardápio copiadas para a contingência' : '') + '. Vão para a lixeira do Drive.';
  }
  function prazos_(j){
    const box = document.getElementById('drivePrazosCorpo'); if(!box) return;
    if(!j || !j.ok){ box.innerHTML = '<div class="fs-sm" style="color:#ffb3ab;">⚠️ Não consegui ler os prazos: ' + esc((j && j.message) || 'sem resposta') + '</div><div class="btnrow"><button class="ghost" onclick="driveDiretoCarregar_()">Tentar de novo</button></div>'; return; }
    const lim = j.limites || {};
    box.innerHTML = ROTULOS.map(([k, nome]) => '<div class="d-flex ai-centro gap-2" style="justify-content:space-between;margin:6px 0;"><label for="dpz_' + k + '" style="flex:1;">' + nome + '<div class="fs-xs" style="color:var(--muted);">de ' + (lim[k] || [1, 999])[0] + ' a ' + (lim[k] || [1, 999])[1] + ' dias · padrão ' + (j.padroes || {})[k] + '</div></label>'
      + '<input id="dpz_' + k + '" type="number" inputmode="numeric" min="' + (lim[k] || [1])[0] + '" max="' + (lim[k] || [1, 999])[1] + '" value="' + j.prazos[k] + '" style="width:90px;"><span class="fs-xs">dias</span></div>').join('')
      + '<div class="btnrow mt-2"><button class="small-gold" onclick="drivePrazosSalvar()">Salvar prazos</button></div><div id="drivePrazosMsg" class="obs-line" style="margin-top:6px;"></div>';
  }
  window.drivePrazosSalvar = async function(){
    const prazos = {}; for(const [k] of ROTULOS) prazos[k] = Number((document.getElementById('dpz_' + k) || {}).value);
    const senha = await pedirSenha_(); if(!senha) return;
    const msg = document.getElementById('drivePrazosMsg');
    try{
      const j = await edge({ acao:'prazosSalvar', senhaAdmin:senha, prazos }, 40000);
      if(!j || !j.ok) throw new Error((j && j.message) || 'Não salvou.');
      if(msg) msg.innerHTML = '<span style="color:#7cc46a;">✅ Prazos salvos.</span>';
      window.avisar && window.avisar('Prazos salvos.', 'ok', 5000);
    }catch(e){ if(msg) msg.innerHTML = '<span style="color:#ffb3ab;">⚠️ ' + esc(e.message) + ' Nada foi salvo.</span>'; erroTela('⚠️ Prazos: ' + e.message); }
  };
  async function carregar_(){
    if(!ehAdmin() || !montar_()) return;
    const box = document.getElementById('driveDiretoLista'); if(!box) return;
    edge({ acao:'prazos' }, 40000).then(j => { prazos_(j); limpezaAuto_(j && j.ok ? j.limpezaAuto : undefined); }).catch(e => prazos_({ ok:false, message:e.message }));
    try{
      const j = await edge({ acao:'status' }, 40000);
      if(!j || !j.ok) throw new Error((j && j.message) || 'O servidor não respondeu.');
      estado = j;
      box.innerHTML = j.contas.map(linha_).join('').replace('border-top:1px solid var(--line,#3a2d1d);', '') ;
      const msg = document.getElementById('driveDiretoMsg');
      if(msg) msg.innerHTML = j.credenciais ? '' : '<span style="color:#ffb3ab;">⚠️ As credenciais do Google não estão guardadas no Supabase (google_client_id / google_client_secret).</span>';
    }catch(e){
      box.innerHTML = '<div class="fs-sm" style="color:#ffb3ab;padding:6px 0;">⚠️ Não consegui consultar o Google Drive: ' + esc(e.message) + '</div><div class="btnrow"><button class="ghost" onclick="driveDiretoCarregar_()">Tentar de novo</button></div>';
    }
  }
  window.driveDiretoCarregar_ = carregar_;

  window.driveDiretoConectar = async function(conta){
    const senha = await pedirSenha_(); if(!senha) return;
    try{
      const j = await edge({ acao:'oauthUrl', conta, senhaAdmin:senha, retorno: location.origin + location.pathname }, 40000);
      if(!j || !j.ok || !j.url) throw new Error((j && j.message) || 'Não consegui gerar o link do Google.');
      window.avisar && window.avisar('Abrindo o Google… entre com a conta do ' + NOMES[conta] + '.', 'ok', 6000);
      location.href = j.url;
    }catch(e){ erroTela('⚠️ Conectar o ' + NOMES[conta] + ': ' + e.message); }
  };
  window.driveDiretoDesconectar = async function(conta){
    if(!(await window.confirmarTxt_('Desconectar o ' + NOMES[conta] + '? O sistema deixa de acessar esse Drive (os arquivos nele não são apagados).', 'Desconectar', true))) return;
    const senha = await pedirSenha_(); if(!senha) return;
    try{
      const j = await edge({ acao:'desconectar', conta, senhaAdmin:senha }, 40000);
      if(!j || !j.ok) throw new Error((j && j.message) || 'Falhou.');
      window.avisar && window.avisar(NOMES[conta] + ' desconectado.', 'ok', 6000); carregar_();
    }catch(e){ erroTela('⚠️ Desconectar o ' + NOMES[conta] + ': ' + e.message); }
  };

  /* ---------- navegador de pastas ---------- */
  let nav = { conta:'', pilha:[{ id:'root', nome:'Meu Drive' }] };
  function modal_(){
    let m = document.getElementById('driveNavModal');
    if(!m){
      document.body.insertAdjacentHTML('beforeend', '<div class="modal-overlay" id="driveNavModal"><div class="modal-box"><div class="modal-header"><h2 id="driveNavTit">Drive</h2><button class="close-btn" onclick="fecharFormModal(\'driveNavModal\')">✕</button></div>'
        + '<div id="driveNavCaminho" class="fs-xs" style="color:var(--muted);margin-bottom:6px;"></div><div id="driveNavLista" class="cx-card"></div><div id="driveNavMsg" class="obs-line" style="margin-top:8px;"></div>'
        + '<div class="btnrow mt-2 cx-rodape"><button class="small-gold" style="flex:1 1 45%;" onclick="driveDiretoEnviar()">⬆️ Enviar arquivo aqui</button><button class="ghost" style="flex:1 1 45%;" onclick="driveDiretoNovaPasta()">📁 Nova pasta</button></div>'
        + '<input type="file" id="driveNavArq" style="display:none;"></div></div>');
      m = document.getElementById('driveNavModal');
    }
    return m;
  }
  async function listar_(){
    const atual = nav.pilha[nav.pilha.length - 1], lista = document.getElementById('driveNavLista'), cam = document.getElementById('driveNavCaminho');
    cam.textContent = nav.pilha.map(p => p.nome).join(' › ');
    lista.innerHTML = '<div class="cx-linha"><span class="conn-bolha wait"></span><b>Carregando…</b></div>';
    try{
      const j = await edge({ acao:'listar', conta:nav.conta, pastaId:atual.id }, 40000);
      if(!j || !j.ok) throw new Error((j && j.message) || 'Falhou.');
      let h = nav.pilha.length > 1 ? '<div class="cx-linha" style="cursor:pointer;" onclick="driveDiretoVoltar()"><b>⬅️ Voltar</b></div>' : '';
      h += (j.arquivos || []).map(f => {
        const pasta = f.mimeType === 'application/vnd.google-apps.folder';
        const dir = pasta ? '' : '<span class="cx-dir">' + (f.size ? fmtTam(f.size) : 'Google') + (f.modifiedTime ? ' · ' + fmtData(f.modifiedTime) : '') + '</span>';
        const clique = pasta ? 'driveDiretoEntrar(\'' + esc(f.id) + '\',this.dataset.n)' : 'driveDiretoBaixar(\'' + esc(f.id) + '\',this.dataset.n)';
        return '<div class="cx-linha" style="cursor:pointer;" data-n="' + esc(f.name) + '" onclick="' + clique + '"><span>' + (pasta ? '📁' : '📄') + '</span><b style="word-break:break-word;">' + esc(f.name) + '</b>' + dir + (pasta ? '' : '<small>baixar</small>') + '</div>';
      }).join('');
      if(!(j.arquivos || []).length) h += '<div class="fs-sm" style="padding:10px 0;color:var(--muted);">Pasta vazia.</div>';
      if(j.proxima) h += '<div class="fs-xs" style="padding:6px 0;color:var(--muted);">Mostrando os primeiros 100 itens desta pasta.</div>';
      lista.innerHTML = h;
    }catch(e){ lista.innerHTML = '<div class="fs-sm" style="color:#ffb3ab;padding:6px 0;">⚠️ ' + esc(e.message) + '</div>'; }
  }
  window.driveDiretoAbrir = function(conta){
    nav = { conta, pilha:[{ id:'root', nome:'Meu Drive' }] };
    modal_(); document.getElementById('driveNavTit').textContent = NOMES[conta]; document.getElementById('driveNavMsg').textContent = '';
    abrirFormModal('driveNavModal'); listar_();
  };
  window.driveDiretoEntrar = (id, nome) => { nav.pilha.push({ id, nome }); listar_(); };
  window.driveDiretoVoltar = () => { if(nav.pilha.length > 1){ nav.pilha.pop(); listar_(); } };
  window.driveDiretoBaixar = async function(id, nome){
    const msg = document.getElementById('driveNavMsg'); msg.textContent = '⏳ Baixando ' + nome + '…';
    try{
      const j = await edge({ acao:'baixar', conta:nav.conta, fileId:id }, 120000);
      if(!j || !j.ok) throw new Error((j && j.message) || 'Falhou.');
      const bin = atob(j.base64), u = new Uint8Array(bin.length); for(let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u], { type: j.mime || 'application/octet-stream' })); a.download = j.nome || nome;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
      msg.textContent = '✅ ' + (j.nome || nome) + ' baixado.';
    }catch(e){ msg.textContent = ''; erroTela('⚠️ Baixar do Drive: ' + e.message); }
  };
  window.driveDiretoEnviar = function(){
    const inp = document.getElementById('driveNavArq'); inp.value = '';
    inp.onchange = async () => {
      const f = inp.files && inp.files[0]; if(!f) return;
      if(f.size > 20 * 1048576){ erroTela('⚠️ Arquivo grande demais (' + fmtTam(f.size) + '). O limite por envio é 20 MB.'); return; }
      const senha = await pedirSenha_(); if(!senha) return;
      const msg = document.getElementById('driveNavMsg'); msg.textContent = '⏳ Enviando ' + f.name + '…';
      try{
        const base64 = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => no(new Error('Não consegui ler o arquivo.')); r.readAsDataURL(f); });
        const j = await edge({ acao:'enviar', conta:nav.conta, pastaId:nav.pilha[nav.pilha.length - 1].id, nome:f.name, mime:f.type, base64, senhaAdmin:senha }, 180000);
        if(!j || !j.ok) throw new Error((j && j.message) || 'Falhou.');
        msg.textContent = '✅ ' + f.name + ' enviado.'; listar_();
      }catch(e){ msg.textContent = ''; erroTela('⚠️ Enviar ao Drive: ' + e.message); }
    };
    inp.click();
  };
  window.driveDiretoNovaPasta = async function(){
    const nome = prompt('Nome da nova pasta:'); if(!nome || !nome.trim()) return;
    try{
      const j = await edge({ acao:'criarPasta', conta:nav.conta, pastaId:nav.pilha[nav.pilha.length - 1].id, nome:nome.trim() }, 40000);
      if(!j || !j.ok) throw new Error((j && j.message) || 'Falhou.');
      listar_();
    }catch(e){ erroTela('⚠️ Criar pasta: ' + e.message); }
  };
})();
