/* =====================================================================
   CONFIGURAÇÃO DESTE RESTAURANTE — é o ÚNICO arquivo que muda de um restaurante para outro.
   Quem gera este arquivo é o Painel de Revenda (aba "Ligações" → "Gerar arquivo de configuração").
   Só entram endereços e chaves PÚBLICAS: senha e chaves secretas nunca ficam aqui.
   A marca (nome, cores, logos) pode ser ajustada depois pelo dono em Administrador → Sistema → Aparência.
   ===================================================================== */
window.RESTAURANTE = {
  motor: 'https://lucassricardo95.github.io/motor/estavel/',   // sistema que este restaurante usa: estavel (acompanha as atualizações) ou uma versão fixa, ex.: .../motor/v1.27/
  slug: 'teste-restaurante',
  nome: 'Restaurante Teste',
  siteUrl: 'https://lucassricardo95.github.io/teste-restaurante/',                       // endereço completo do site, com barra no fim (ex.: https://usuario.github.io/repositorio/)
  supabaseUrl: 'https://yrbhumiybemnophsggmw.supabase.co',                   // Project URL do Supabase deste restaurante
  supabaseChave: 'sb_publishable_SzXqXit3EsWjeuvwKQy-rA_pgmQuRqf',                 // chave pública (publishable) do Supabase
  apiUrl: '',                        // planilha principal (Apps Script, termina em /exec) — opcional
  contingenciaUrl: '',               // planilha de contingência (Apps Script) — opcional
  pushChave: '',                     // chave pública dos avisos no celular — opcional
  marca: {
    slogan: '',
    assistente: 'Assistente',
    tema: 'classico',
    cores: { destaque: '#d9a21b', botao: '#8c1c13', fundo: '#14100c' },
    logos: { cardapio: 'img/logo.png', impressao: '', icone: 'img/icon-512.png' }
  },
  modulos: { ifood: false, nfce: false, mercadopago: false, infinitepay: false, mesas: true, ponto: true, eventos: true, planilhas: false, ia: true }
};
