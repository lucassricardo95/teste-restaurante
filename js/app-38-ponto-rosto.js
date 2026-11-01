/* ============================================================
   PONTO COM RECONHECIMENTO FACIAL E FOTO DA BATIDA (18/10/2026)
   • Primeira batida: aceite (LGPD) + cadastro do rosto (um código de 128 números, não é foto). A comparação é feita no banco.
   • Cada batida: olhar para a câmera e piscar (ou virar o rosto um pouco) → rosto conferido → batida registrada.
   • Rosto não conferiu: tentar de novo ou mandar a selfie; a batida fica "pendente" para o dono aprovar ou cancelar.
   • A foto de cada batida vai para o Drive principal e o da contingência (pasta privada) e é apagada após o prazo definido (90 dias por padrão).
   • Biblioteca face-api.js (MIT) e modelos ficam na própria pasta do site (nada vem de fora).
   ============================================================ */
var prFace_ = { pronto:false, carregando:null, falhou:false };
var prCtx_ = null;

function prCarregarModelos_(){
  if(prFace_.pronto) return Promise.resolve(true);
  if(prFace_.carregando) return prFace_.carregando;
  prFace_.carregando = (async () => {
    try{
      if(!window.faceapi){
        await new Promise((ok, falha) => { const s = document.createElement('script'); s.src = 'js/face-api.min.js?v=1'; s.onload = ok; s.onerror = () => falha(new Error('biblioteca')); document.head.appendChild(s); });
      }
      await Promise.all([ faceapi.nets.tinyFaceDetector.loadFromUri('modelos'), faceapi.nets.faceLandmark68TinyNet.loadFromUri('modelos'), faceapi.nets.faceRecognitionNet.loadFromUri('modelos') ]);
      prFace_.pronto = true; return true;
    }catch(e){ prFace_.falhou = true; prFace_.carregando = null; return false; }
  })();
  return prFace_.carregando;
}

/* ---------- contas dos pontos do rosto (funções puras, testáveis) ---------- */
function prEar_(pts){
  const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const ear = i => (d(pts[i + 1], pts[i + 5]) + d(pts[i + 2], pts[i + 4])) / (2 * d(pts[i], pts[i + 3]) || 1);
  return (ear(36) + ear(42)) / 2;
}
function prYaw_(pts){
  const meio = (pts[0].x + pts[16].x) / 2, larg = Math.abs(pts[16].x - pts[0].x) || 1;
  return (pts[30].x - meio) / larg;   // 0 = de frente; negativo/positivo = virou para um lado
}

/* ---------- janela ---------- */
function prJanela_(){
  let m = document.getElementById('prFaceModal');
  if(!m){
    m = document.createElement('div'); m.className = 'modal-overlay'; m.id = 'prFaceModal';
    m.innerHTML = '<div class="modal-box" style="max-width:460px;"><div class="modal-header"><h2 id="prFaceTitulo">Bater o ponto</h2><button class="close-btn" onclick="prFechar_()" aria-label="Fechar">✕</button></div>' +
      '<div id="prFaceVideoBox" style="position:relative;display:none;background:#000;border-radius:12px;overflow:hidden;"><video id="prFaceVideo" playsinline muted autoplay style="width:100%;max-height:52vh;display:block;transform:scaleX(-1);object-fit:cover;"></video>' +
      '<div id="prFaceOval" style="position:absolute;inset:8% 22%;border:3px dashed rgba(255,255,255,.55);border-radius:50%;pointer-events:none;"></div></div>' +
      '<div id="prFaceMsg" style="margin:10px 0;font-weight:600;text-align:center;"></div>' +
      '<div id="prFaceCorpo"></div><div class="btn-row" id="prFaceBotoes" style="justify-content:center;margin-top:8px;"></div></div>';
    document.body.appendChild(m);
  }
  return m;
}
function prMsg_(t, tipo){ const e = document.getElementById('prFaceMsg'); if(e){ e.textContent = t; e.style.color = tipo === 'erro' ? 'var(--red-hi)' : tipo === 'ok' ? 'var(--ok)' : ''; } }
function prBotoes_(lista){
  const b = document.getElementById('prFaceBotoes'); if(!b) return; b.innerHTML = '';
  lista.forEach(x => { const bt = document.createElement('button'); bt.type = 'button'; bt.className = x.cls || 'ghost'; bt.textContent = x.t; bt.onclick = x.f; b.appendChild(bt); });
}
function prParar_(){
  if(prCtx_){ prCtx_.parar = true; try{ (prCtx_.stream ? prCtx_.stream.getTracks() : []).forEach(t => t.stop()); }catch(e){} }
  const v = document.getElementById('prFaceVideo'); if(v){ try{ v.srcObject = null; }catch(e){} }
}
function prFechar_(){ prParar_(); prCtx_ = null; fecharFormModal('prFaceModal'); }

/* ---------- fluxo principal (substitui o botão "Bater entrada/saída") ---------- */
var pontoBaterSemRosto_ = (typeof pontoBater === 'function') ? pontoBater : null;
pontoBater = async function(){
  let est = null;
  try{ est = await apiCall('pontoEstado', {}); }catch(e){}
  if(!est || !est.ok || !est.rostoLigado){ if(pontoBaterSemRosto_) return pontoBaterSemRosto_(); return; }
  const m = prJanela_(); abrirFormModal('prFaceModal');
  document.getElementById('prFaceCorpo').innerHTML = ''; document.getElementById('prFaceVideoBox').style.display = 'none';
  document.getElementById('prFaceTitulo').textContent = est.aberto ? 'Bater a saída' : 'Bater a entrada';
  prCtx_ = { est, consentimento: !!est.temRosto, tentativas: 0, parar: false, posicao: null, pos: null };
  if(!est.temRosto) return prConsentimento_();
  prIniciar_();
};
function prConsentimento_(){
  prMsg_('');
  document.getElementById('prFaceTitulo').textContent = 'Cadastro do seu rosto';
  document.getElementById('prFaceCorpo').innerHTML = '<div class="obs-line" style="text-align:left;line-height:1.5;">Para confirmar que é você quem bate o ponto, o sistema vai guardar um <b>código numérico do seu rosto</b> (não é a foto). ' +
    'A <b>foto</b> de cada batida fica salva por <b>90 dias</b> (o administrador pode mudar) e depois é apagada sozinha. Esses dados são usados somente para o controle de ponto do ' + NOME_H_() + '. ' +
    'Você pode pedir ao dono para apagar o seu rosto a qualquer momento.</div>';
  prBotoes_([
    { t:'Aceito e continuar', cls:'small-gold', f:() => { prCtx_.consentimento = true; prIniciar_(); } },
    { t:'Bater só com selfie', f:() => { prCtx_.soSelfie = true; prIniciar_(); } },
    { t:'Cancelar', f:prFechar_ }
  ]);
}
async function prIniciar_(){
  const c = prCtx_; if(!c) return;
  c.parar = false; c.tentativas++; c.liv = null;
  document.getElementById('prFaceCorpo').innerHTML = ''; prBotoes_([{ t:'Cancelar', f:prFechar_ }]);
  prMsg_('Abrindo a câmera…');
  c.posicao = pontoPosicao_();   // pega a localização enquanto a câmera abre
  try{
    c.stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'user', width:{ ideal:640 }, height:{ ideal:480 } }, audio:false });
  }catch(e){
    prMsg_('Não consegui abrir a câmera. Permita o acesso à câmera no navegador e tente de novo.', 'erro');
    prBotoes_([{ t:'Tentar de novo', cls:'small-gold', f:prIniciar_ }, { t:'Fechar', f:prFechar_ }]); return;
  }
  const v = document.getElementById('prFaceVideo'); v.srcObject = c.stream;
  document.getElementById('prFaceVideoBox').style.display = '';
  try{ await v.play(); }catch(e){}
  prMsg_('Preparando o reconhecimento…');
  const ok = c.soSelfie ? false : await prCarregarModelos_();
  if(c.parar) return;
  if(!ok){ return prSelfieSimples_(c.soSelfie ? '' : 'O reconhecimento não carregou agora. '); }
  try{ await faceapi.detectSingleFace(v, new faceapi.TinyFaceDetectorOptions({ inputSize:224, scoreThreshold:0.5 })).withFaceLandmarks(true); }catch(e){}   // aquecimento (a primeira conta é a mais lenta)
  if(c.parar) return;
  prVigiar_();
}

/* ---------- vigia o rosto: achar → piscar ou virar → foto estável ---------- */
async function prVigiar_(){
  const c = prCtx_, v = document.getElementById('prFaceVideo');
  const opt = new faceapi.TinyFaceDetectorOptions({ inputSize:224, scoreThreshold:0.5 });
  const t0 = Date.now(); let fase = 'achar', estavel = 0, abertoRef = 0, yaw0 = 0, fechou = false, giro = false, tFase = Date.now(), melhor = null;
  prMsg_('Olhe para a câmera, com o rosto dentro do contorno.');
  while(!c.parar){
    let det = null;
    try{ det = await faceapi.detectSingleFace(v, opt).withFaceLandmarks(true); }catch(e){}
    if(c.parar) return;
    if(!det){ estavel = 0; if(fase !== 'achar'){ fase = 'achar'; prMsg_('Olhe para a câmera, com o rosto dentro do contorno.'); } }
    else {
      const pts = det.landmarks.positions, larg = det.detection.box.width / (v.videoWidth || 640), ear = prEar_(pts), yaw = prYaw_(pts);
      if(fase === 'achar'){
        if(larg > 0.28 && Math.abs(yaw) < 0.2){ estavel++; if(estavel >= 3){ fase = 'vida'; tFase = Date.now(); abertoRef = ear; yaw0 = yaw; prMsg_('Agora pisque os olhos (ou vire o rosto um pouco para o lado e volte).'); } } else estavel = 0;
      } else if(fase === 'vida'){
        abertoRef = Math.max(abertoRef * 0.98, ear);
        if(ear < Math.min(0.21, abertoRef * 0.72)) fechou = true;
        if(Math.abs(yaw - yaw0) > 0.13) giro = true;
        if((fechou && ear > abertoRef * 0.85) || (giro && Math.abs(yaw - yaw0) < 0.07)){ fase = 'foto'; tFase = Date.now(); prMsg_('Isso! Fique parado olhando para a câmera…'); }
        else if(Date.now() - tFase > 12000){ return prFalhaVida_(); }
      } else if(fase === 'foto'){
        if(Math.abs(yaw - yaw0) < 0.08 && ear > abertoRef * 0.85 && det.detection.score > 0.6){ melhor = true; break; }
        if(Date.now() - tFase > 4000){ melhor = true; break; }
      }
    }
    await new Promise(r => setTimeout(r, 40));
    if(Date.now() - t0 > 45000){ prMsg_('Tempo esgotado. Tente de novo.', 'erro'); prBotoes_([{ t:'Tentar de novo', cls:'small-gold', f:() => { prParar_(); prIniciar_(); } }, { t:'Fechar', f:prFechar_ }]); return; }
  }
  if(c.parar || !melhor) return;
  prMsg_('Conferindo…');
  let r = null; try{ r = await faceapi.detectSingleFace(v, opt).withFaceLandmarks(true).withFaceDescriptor(); }catch(e){}
  c.foto = prFoto_(v); c.descritor = r ? Array.from(r.descriptor).map(x => Math.round(x * 1e6) / 1e6) : null;
  prParar_();
  prEnviar_(false);
}
function prFalhaVida_(){
  prMsg_('Não percebi o movimento. Pisque bem devagar, com boa luz, ou vire o rosto um pouco para o lado.', 'erro');
  prBotoes_([{ t:'Tentar de novo', cls:'small-gold', f:() => { prParar_(); prIniciar_(); } }, { t:'Mandar selfie para o dono conferir', f:() => prSelfieAgora_() }, { t:'Fechar', f:prFechar_ }]);
}
function prFoto_(v){
  const cv = document.createElement('canvas'), w = Math.min(480, v.videoWidth || 480), h = Math.round(w * (v.videoHeight || 360) / (v.videoWidth || 480));
  cv.width = w; cv.height = h; cv.getContext('2d').drawImage(v, 0, 0, w, h);
  return cv.toDataURL('image/jpeg', 0.72).split(',').pop();
}
/* sem reconhecimento (modelo não carregou ou a pessoa preferiu): selfie com contagem; batida fica pendente */
function prSelfieSimples_(aviso){
  const c = prCtx_; let n = 3;
  prBotoes_([{ t:'Cancelar', f:prFechar_ }]);
  const tick = () => { if(c.parar) return; if(n > 0){ prMsg_((aviso || '') + 'Olhe para a câmera: foto em ' + n + '…'); n--; setTimeout(tick, 1000); } else prSelfieAgora_(); };
  tick();
}
function prSelfieAgora_(){
  const c = prCtx_, v = document.getElementById('prFaceVideo');
  if(!c.stream || !v || !v.videoWidth){ prMsg_('A câmera não está ativa. Tente de novo.', 'erro'); prBotoes_([{ t:'Tentar de novo', cls:'small-gold', f:prIniciar_ }, { t:'Fechar', f:prFechar_ }]); return; }
  c.foto = prFoto_(v); prParar_();
  prEnviar_(true);
}

/* ---------- registra a batida e guarda a foto ---------- */
async function prEnviar_(pendente){
  const c = prCtx_; if(!c) return;
  document.getElementById('prFaceVideoBox').style.display = 'none';
  prMsg_('Registrando…'); prBotoes_([]);
  let pos = null; try{ pos = await c.posicao; }catch(e){}
  const corpo = Object.assign({}, pos || {}, { descritor: c.descritor || null, consentimento: !!c.consentimento, pendente: !!pendente });
  let r = null;
  try{ r = await apiCall('pontoBater', corpo); }catch(e){ r = { ok:false, message:'Não foi possível registrar agora. Tente de novo.' }; }
  if(r && r.ok){
    prMsg_((r.message || 'Registrado.'), r.rosto === 'pendente' ? '' : 'ok');
    prBotoes_([{ t:'Fechar', cls:'small-gold', f:prFechar_ }]);
    try{ minhaExtrasCarregar_(); }catch(e){}
    if(r.registroId && c.foto) prSubirFoto_(r.registroId, r.lado, c.foto);
    return;
  }
  if(r && (r.rosto === 'nao_reconhecido' || r.rosto === 'sem_rosto')){
    prMsg_(r.message, 'erro');
    prBotoes_([{ t:'Tentar de novo', cls:'small-gold', f:() => prIniciar_() }].concat(c.tentativas >= 2 || r.rosto === 'sem_rosto' ? [{ t:'Mandar selfie para o dono conferir', f:() => prEnviar_(true) }] : []).concat([{ t:'Fechar', f:prFechar_ }]));
    return;
  }
  if(r && r.rosto === 'consentimento'){ c.consentimento = false; return prConsentimento_(); }
  prMsg_((r && r.message) || 'Não foi possível registrar.', 'erro');
  prBotoes_([{ t:'Fechar', f:prFechar_ }]);
}
async function prSubirFoto_(registroId, lado, base64Data){
  for(let i = 0; i < 2; i++){
    try{ const j = await sb410Edge_('ponto-foto', { acao:'enviar', registroId, lado, base64Data }, 60000); if(j && j.ok) return true; if(j && /prazo|já foi enviada/i.test(j.message || '')) return false; }catch(e){}
    await new Promise(r => setTimeout(r, 1500));
  }
  try{ avisar('A batida foi registrada, mas a foto não foi salva agora.'); }catch(e){}
  return false;
}

/* ---------- Administrador → Ponto: rosto, fotos e aprovação ---------- */
function pontoRostoTag_(x){
  const t = { ok:'✅ rosto conferido', cadastro:'🆕 rosto cadastrado', pendente:'⚠ rosto não conferiu', aprovado:'✔ aprovado pelo dono' };
  const parte = (s) => s ? '<span style="color:' + (s === 'pendente' ? 'var(--red-hi)' : 'inherit') + ';">' + t[s] + '</span>' : '';
  const e = parte(x.rostoEntrada), s = parte(x.rostoSaida);
  if(!e && !s) return '';
  return ' <span class="obs-line">' + (e === s ? e : [e && 'entrada: ' + e, s && 'saída: ' + s].filter(Boolean).join(' · ')) + '</span>';
}
function pontoRostoBotoes_(x){
  let h = '';
  if(x.fotoEntrada || x.fotoSaida) h += '<button type="button" class="ghost small" onclick="pontoFotoVer(\'' + x.id + '\')">📷 Foto</button> ';
  if(x.rostoEntrada === 'pendente' || x.rostoSaida === 'pendente') h += '<button type="button" class="small-gold" onclick="pontoAprovar(\'' + x.id + '\')">Aprovar</button> ';
  return h;
}
function pontoRostoCard_(){
  const r = (pontoDados_ && pontoDados_.rosto) || { ligado:true, limite:0.55 };
  return '<div class="notif-card"><b>🙂 Reconhecimento facial</b><div class="obs-line" style="margin-top:4px;">' + (r.ligado ? 'Ligado: o funcionário cadastra o rosto na primeira batida e confirma nas seguintes. ' : 'Desligado: o ponto é batido sem câmera. ') +
    'As fotos das batidas ficam salvas por 90 dias (um dos Drives) e são apagadas sozinhas.</div><div class="btn-row" style="margin-top:6px;">' +
    '<button type="button" class="' + (r.ligado ? 'ghost small' : 'small-gold') + '" onclick="pontoRostoLigar(' + (r.ligado ? 'false' : 'true') + ')">' + (r.ligado ? 'Desligar' : 'Ligar') + '</button>' +
    (r.ligado ? '<button type="button" class="ghost small" onclick="pontoRostoRigor()">Rigor: ' + Number(r.limite).toFixed(2).replace('.', ',') + '</button>' : '') + '</div></div>';
}
async function pontoRostoLigar(ligado){
  if(!ligado && !await confirmarTxt_('Desligar o reconhecimento facial? O ponto volta a ser batido sem câmera e sem foto.', 'Desligar', true, 'Desligar')) return;
  try{ const r = await apiCall('pontoRostoConfig', { ligado }); showMsg('pontoMsg', r && r.ok ? (ligado ? 'Reconhecimento facial ligado.' : 'Reconhecimento facial desligado.') : ((r && r.message) || 'Não foi possível.'), r && r.ok ? 'ok' : 'warn'); carregarPonto_(); }
  catch(e){ showMsg('pontoMsg', 'Não foi possível agora.', 'warn'); }
}
async function pontoRostoRigor(){
  const atual = ((pontoDados_ && pontoDados_.rosto) || {}).limite || 0.55;
  const f = await vsForm({ titulo:'Rigor do reconhecimento', texto:'Número menor = mais rígido (pode recusar o próprio funcionário em pouca luz). Número maior = mais aceita. O comum é 0,55. Faixa: 0,40 a 0,70.', ok:'Salvar', campos:[{ id:'lim', rotulo:'Rigor', tipo:'texto', valor:String(atual).replace('.', ','), sugestoes:['0,45','0,50','0,55','0,60'] }] });
  if(!f) return;
  const n = parseFloat(String(f.lim).replace(',', '.')); if(!(n >= 0.4 && n <= 0.7)) return avisar('Use um número entre 0,40 e 0,70.');
  try{ const r = await apiCall('pontoRostoConfig', { limite:n }); showMsg('pontoMsg', r && r.ok ? 'Rigor salvo.' : ((r && r.message) || 'Não foi possível.'), r && r.ok ? 'ok' : 'warn'); carregarPonto_(); }
  catch(e){ showMsg('pontoMsg', 'Não foi possível agora.', 'warn'); }
}
async function pontoAprovar(id){
  try{ const r = await apiCall('pontoAprovar', { id }); showMsg('pontoMsg', (r && r.message) || 'Não foi possível.', r && r.ok ? 'ok' : 'warn'); if(r && r.ok) carregarPonto_(); }
  catch(e){ showMsg('pontoMsg', 'Não foi possível agora.', 'warn'); }
}
async function pontoRostoApagar(fid){
  const p = ((pontoDados_ && pontoDados_.pessoas) || []).find(x => x.funcionarioId === fid);
  if(!await confirmarTxt_('Apagar o rosto de ' + (p ? p.nome : 'este funcionário') + '? Na próxima batida ele cadastra de novo (vale também se o cadastro foi feito por outra pessoa).', 'Apagar rosto', true, 'Apagar')) return;
  const senhaAdminConfirmacao = await pedirSenha_(); if(!senhaAdminConfirmacao) return;
  try{ const r = await apiCall('pontoRostoApagar', { funcionarioId: fid, senhaAdminConfirmacao }); showMsg('pontoMsg', (r && r.message) || 'Não foi possível.', r && r.ok ? 'ok' : 'warn'); if(r && r.ok) carregarPonto_(); }
  catch(e){ showMsg('pontoMsg', 'Não foi possível agora.', 'warn'); }
}
async function pontoFotoVer(id, lado){
  let p = null, x = null;
  ((pontoDados_ && pontoDados_.pessoas) || []).forEach(q => (q.registros || []).forEach(r => { if(r.id === id){ p = q; x = r; } }));
  if(!x) return;
  lado = lado || (x.fotoEntrada ? 'entrada' : 'saida');
  let m = document.getElementById('prFotoModal');
  if(!m){ m = document.createElement('div'); m.className = 'modal-overlay'; m.id = 'prFotoModal';
    m.innerHTML = '<div class="modal-box" style="max-width:520px;"><div class="modal-header"><h2 id="prFotoTitulo">Foto da batida</h2><button class="close-btn" onclick="fecharFormModal(\'prFotoModal\')" aria-label="Fechar">✕</button></div><div id="prFotoCorpo"></div></div>'; document.body.appendChild(m); }
  abrirFormModal('prFotoModal');
  const corpo = document.getElementById('prFotoCorpo');
  document.getElementById('prFotoTitulo').textContent = (p ? p.nome : '') + ' · ' + escDM_(x.dia) + ' · ' + (lado === 'saida' ? 'saída ' + (x.saida || '') : 'entrada ' + (x.entrada || ''));
  const troca = (x.fotoEntrada && x.fotoSaida) ? '<div class="btn-row" style="margin-bottom:8px;"><button type="button" class="' + (lado === 'entrada' ? 'small-gold' : 'ghost small') + '" onclick="pontoFotoVer(\'' + id + '\',\'entrada\')">Entrada</button><button type="button" class="' + (lado === 'saida' ? 'small-gold' : 'ghost small') + '" onclick="pontoFotoVer(\'' + id + '\',\'saida\')">Saída</button></div>' : '';
  corpo.innerHTML = troca + '<p class="sub">Abrindo a foto…</p>';
  try{
    const j = await sb410Edge_('ponto-foto', { acao:'ver', registroId: id, lado }, 60000);
    if(!j || !j.ok || !j.base64) throw new Error((j && j.message) || 'Não consegui abrir a foto.');
    corpo.innerHTML = troca + '<img alt="Foto da batida" style="width:100%;border-radius:10px;" src="data:' + (j.tipo || 'image/jpeg') + ';base64,' + j.base64 + '">' +
      '<div class="obs-line" style="margin-top:6px;">' + (x.rostoEntrada || x.rostoSaida ? 'Foto guardada por 90 dias.' : '') + '</div>';
  }catch(e){ corpo.innerHTML = troca + '<p class="sub">' + escH(e.message || 'Não consegui abrir a foto.') + '</p>'; }
}
