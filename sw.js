/* Service worker v39: avisos com o app fechado (push da equipe e do cliente) + notificações + abertura instantânea + casca/ícones/logo guardados.
   Precisa ficar na MESMA pasta do HTML, em endereço https.
   - Página: mostra a cópia guardada NA HORA e confere a rede em segundo plano. Se a página mudou, avisa o app ("Nova versão disponível").
   - Ícones, logo e manifest: guardados (cache primeiro).
   - Fotos do Google Drive: só são guardadas se o navegador conseguir ler a resposta (modo "cors"); senão o navegador cuida delas.
   - BACKEND: NADA de Apps Script (script.google.com) nem de Supabase (*.supabase.co) é guardado aqui.
     Dados, pedidos, login e RPCs nunca passam pelo cache do service worker — sempre vão direto para a rede.
   - O único cache de dados é o de fotos (FOTOS) e o da casca/ícones (SHELL/ASSETS). Não adicionar outros. */
const SHELL = 'shell-v1';
const ASSETS = 'assets-v1';   // trocou ícone/logo/manifest/leaflet? suba para v5
const FOTOS = 'fotos-v1';
/* Código do app dividido em arquivos (app-*.js e estilo-*.css). Cada arquivo tem ?v=<impressão digital> na página; o cache guarda
   pela endereço COMPLETO, então uma página antiga sempre acha os arquivos antigos dela e a nova acha os novos (nunca mistura versões).
   A lista abaixo é gerada pelo script de selagem (selar.py) a cada entrega. */
const CODIGO = 'codigo-v1';   // trocou o nome = todo aparelho descarta o cache de código antigo (inclusive cópia vazia)
const LISTA = [/*LISTA-INICIO*/
  'js/app-00-marca.js?v=2b414212',
  'css/estilo-base.css?v=ecf263bb',
  'js/app-01-base-e-api.js?v=f8403f78',
  'js/app-02-abas.js?v=d5e37eda',
  'js/app-03-cadastros.js?v=3c5db50a',
  'js/app-04-pedidos-entrega.js?v=a2d478eb',
  'js/app-05-avisos-push.js?v=fe880382',
  'js/app-06-caixa.js?v=1a2541c4',
  'js/app-07-impressao.js?v=791aa527',
  'js/app-08-vendas-despesas.js?v=0b8d9a34',
  'js/app-09-ajuda.js?v=b3482298',
  'js/app-10-backup-financeiro.js?v=f3d08c92',
  'js/app-11-admin-integracoes.js?v=ac6dea84',
  'js/app-12-gestao-ia.js?v=34b9cbd4',
  'js/app-13-conexao-sync.js?v=b38413c9',
  'js/app-14-relatorios.js?v=89a1208a',
  'js/app-15-cardapio-cliente.js?v=3fda68f9',
  'js/app-16-sessao-final.js?v=54ce10c2',
  'js/app-17-sessao-supabase.js?v=5a30d71b',
  'js/app-18-queda-supabase.js?v=c3cdfe49',
  'css/estilo-ia-cardapio.css?v=ffe00c8f',
  'js/app-19-ia.js?v=a1107f1f',
  'js/app-20-balao-interno.js?v=b9af974b',
  'js/app-21-localizacao.js?v=cd8592e7',
  'css/estilo-equipe.css?v=36b0117e',
  'js/app-22-navegacao-inferior.js?v=9c0835e7',
  'js/app-23-janelas-popup.js?v=6f031891',
  'js/app-24-acessibilidade.js?v=1567f2c1',
  'js/app-25-cadastro-facil.js?v=b041c52e',
  'js/app-26-visual.js?v=3c963d27',
  'css/estilo-conta-pagamento.css?v=d22e4d74',
  'js/app-28-dialogos.js?v=5e2e43b5',
  'js/app-27-conta-cliente.js?v=c3c2401c',
  'js/app-29-usabilidade.js?v=69a7af9b',
  'js/app-30-teclado-pc.js?v=f205bac9',
  'js/app-31-alertas.js?v=819a321b',
  'js/app-33-escala.js?v=ab6dd220',
  'js/app-34-eventos.js?v=6d38b1b2',
  'js/app-35-equipe-extras.js?v=650e4df1',
  'js/app-36-gestao.js?v=bc402363',
  'js/app-37-ponto-rapido.js?v=2ea0dbba',
  'js/app-38-ponto-rosto.js?v=45e597db',
  'js/app-39-fotos-registros.js?v=7786e7f0',
  'js/app-40-etiquetas.js?v=5ac4487f',
  'js/app-41-ifood-extras.js?v=e6801644',
  'js/app-42-ifood-catalogo.js?v=60701d5d',
  'js/app-43-erros-visiveis.js?v=40139366',
  'js/app-44-ifood-vinheta.js?v=de438ee2',
  'js/app-45-ver-cardapio.js?v=a75737b8',
  'js/app-46-cardapio-hoje.js?v=bca844d0',
  'js/app-47-cardapio-facil.js?v=27ecb254',
  'js/app-51-infinitepay.js?v=af7923ee',
  'js/app-52-ifood-financeiro.js?v=bf3223c9',
  'js/app-53-ifood-entregador.js?v=b0e6ddfa',
  'js/app-54-ifood-indicadores.js?v=144d8d09',
  'js/app-56-rota-entrega.js?v=f9d32f41',
  'js/app-55-ifood-roteiro.js?v=7de45218',
  'js/app-57-ponto-meus-registros.js?v=9ac01cfd',
  'js/app-50-ifood-homologacao.js?v=72eb9915',
  'js/app-49-jogos.js?v=f8ad224a',
  'js/jogo-burger.js?v=d67a1a42',
  'js/jogo-chuva.js?v=c0a88274',
  'js/jogo-memoria.js?v=5246b144',
  'js/jogo-cobra.js?v=651a89f6',
  'js/app-58-drive-direto.js?v=9e4d8a06',
  'js/app-48-armazenamento.js?v=c4160c65',
  'js/app-32-equipe.js?v=15e8d37a',
  'css/estilo-sistema.css?v=e60448b6',
  'js/app-59-layout.js?v=5aa543db',
  'js/app-61-custos-gerais.js?v=856d2e6d',
  'js/app-62-raio-x.js?v=a9a70e0e',
  'js/app-65-aparencia.js?v=00000000',
  'js/app-64-promocoes-dono.js?v=fb820c1a',
  'js/app-63-promocoes-aviso.js?v=7eb16304',
  'js/app-60-navegador-app.js?v=51ce21da',
/*LISTA-FIM*/];
const FOTOS_MAX = 150;
const PRE = ['manifest.webmanifest', 'img/icon-192.png', 'img/badge-96.png', 'img/apple-touch-icon.png', 'img/logo.png', 'sons/ifood-novo-pedido.mp3'];
const HOSTS_FOTO = ['drive.google.com', 'lh3.googleusercontent.com'];

self.addEventListener('install', e => e.waitUntil((async () => {
  const c = await caches.open(ASSETS);
  await Promise.all(PRE.map(u => c.add(u).catch(() => {})));
  try { const cc = await caches.open(CODIGO); await Promise.all(LISTA.map(async u => { try { const rs = await fetch(u, { cache: 'reload' }); if (rs && rs.ok && !(await vazia_(rs))) await cc.put(u, rs); } catch (err) {} })); } catch (err) {}
  await self.skipWaiting();
})()));

self.addEventListener('activate', e => e.waitUntil((async () => {
  let trocou = false;   // v117: se um aparelho tinha cache de versão antiga, a página abre de novo sozinha com o código novo (uma vez)
  for (const k of await caches.keys()) {
    if ((k.indexOf('shell-') === 0 && k !== SHELL) || (k.indexOf('assets-') === 0 && k !== ASSETS) || (k.indexOf('codigo-') === 0 && k !== CODIGO)) { await caches.delete(k); trocou = true; }
  }
  try {   /* limpa do cache de código o que não está na lista atual */
    const cc = await caches.open(CODIGO);
    const validos = new Set(LISTA.map(u => new URL(u, self.registration.scope).href));
    for (const rq of await cc.keys()) if (!validos.has(rq.url)) await cc.delete(rq);
  } catch (err) {}
  await self.clients.claim();
  if (trocou) { try { for (const c of await self.clients.matchAll({ type: 'window' })) { if (c.url && c.visibilityState !== 'hidden') c.navigate(c.url).catch(() => {}); } } catch (err) {} }
})()));

/* Resposta vazia (0 byte) nunca vale como cópia boa: pode vir de envio incompleto ao GitHub. Não guardar e não servir. */
async function vazia_(res) {
  try { const b = await res.clone().blob(); return b.size === 0; } catch (err) { return false; }
}

async function avisarNovaVersao_() {
  const lista = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  lista.forEach(cl => cl.postMessage({ tipo: 'nova-versao' }));
}

/* Página: cópia guardada na hora + atualização em segundo plano (stale-while-revalidate). */
function paginaRapida_(r) {
  let fim = Promise.resolve();
  const resposta = (async () => {
    const c = await caches.open(SHELL);
    const copia = await c.match('./');
    const rede = fetch(r).then(async res => {
      if (res && res.ok) {
        if (copia) {
          try { const [a, b] = await Promise.all([res.clone().text(), copia.clone().text()]); if (a !== b) avisarNovaVersao_(); } catch (err) {}
        }
        await c.put('./', res.clone());
      }
      return res;
    });
    fim = rede.catch(() => {});
    return copia || rede;
  })();
  return { resposta, fim: resposta.then(() => fim, () => {}) };
}

async function cacheDepoisRede_(r, nome) {
  const c = await caches.open(nome);
  const hit = await c.match(r);
  if (hit && !(await vazia_(hit))) return hit;
  if (hit) await c.delete(r);
  const res = await fetch(r);
  if (res && res.ok && !(await vazia_(res))) c.put(r, res.clone());
  return res;
}

/* Código do app (app-*.js, estilo-*.css): cache primeiro, pelo endereço completo (com ?v=). */
async function codigoCache_(r) {
  const c = await caches.open(CODIGO);
  const hit = await c.match(r);
  if (hit && !(await vazia_(hit))) return hit;
  if (hit) await c.delete(r);
  const res = await fetch(r);
  if (res && res.ok && !(await vazia_(res))) c.put(r, res.clone());
  return res;
}

async function aparar_(c) {
  const ks = await c.keys();
  for (let i = 0; i < ks.length - FOTOS_MAX; i++) await c.delete(ks[i]);
}
async function fotoCache_(r) {
  const c = await caches.open(FOTOS);
  const hit = await c.match(r);
  if (hit) return hit;
  const res = await fetch(r);
  if (res && res.ok && res.type !== 'opaque') { await c.put(r, res.clone()); aparar_(c); }
  return res;
}

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const url = new URL(r.url);
  if (r.mode === 'navigate' && url.origin === self.location.origin) {
    const p = paginaRapida_(r);
    e.respondWith(p.resposta); e.waitUntil(p.fim);
    return;
  }
  if (url.origin === self.location.origin) {
    if (/\/(app|estilo)-[^/]+\.(js|css)$/.test(url.pathname)) { e.respondWith(codigoCache_(r)); return; }
    if (PRE.some(p => url.pathname.endsWith('/' + p)) || /\.(png|webp|jpe?g|svg|woff2?|mp3)$/i.test(url.pathname) || url.pathname.indexOf('/vendor/leaflet/') !== -1) e.respondWith(cacheDepoisRede_(r, ASSETS));
    return;
  }
  /* foto do Drive: só intercepta quando o app pediu em modo "cors" (com crossorigin="anonymous"); no modo normal o navegador cuida */
  if (r.mode === 'cors' && HOSTS_FOTO.indexOf(url.hostname) !== -1) { e.respondWith(fotoCache_(r)); return; }
  /* tudo o mais (inclusive script.google.com) passa direto, sem cache */
});

/* Toque no aviso: abre o app. Aviso do cliente traz um endereço ./?pedido=XXXXXXXX ou ./?feedback=XXXXXXXX:
   com o app aberto, manda a mensagem "abrir-url" para a página abrir a tela certa; fechado, abre direto nesse endereço. */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const d = e.notification.data || {};
  const url = /^\.\/\?((pedido|feedback)=[0-9a-f]{8}|promo=1)$/.test(String(d.url || '')) ? d.url : './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { if (url !== './') c.postMessage({ tipo: 'abrir-url', url }); return c.focus(); } }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  }));
});

/* Push (app fechado): o servidor manda { titulo, texto, tag, tipo, url }. Sem dados pessoais do cliente. */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { titulo: 'Aviso', texto: e.data ? e.data.text() : '' }; }
  const titulo = String(d.titulo || 'Aviso').slice(0, 80);
  e.waitUntil(self.registration.showNotification(titulo, {
    body: String(d.texto || '').slice(0, 140), tag: String(d.tag || 'texas'), renotify: true,
    icon: 'img/icon-192.png', badge: 'img/badge-96.png', vibrate: [250, 120, 250, 120, 400], requireInteraction: d.tipo === 'pedido' || d.tipo === 'alerta',
    data: { url: String(d.url || './') }
  }));
});
