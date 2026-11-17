/* Bus Hub: funciona offline depois do primeiro acesso.
   Trocar CACHE_VERSION quando mudar a lista de arquivos ou a estrutura do site. */
const CACHE_VERSION = 'bushub-v1';

const ARQUIVOS = [
    './',
    'index.html',
    'css/style.css',
    'js/app.js',
    'manifest.webmanifest',
    'fonts/barlow-400.woff2',
    'fonts/barlow-500.woff2',
    'fonts/barlow-600.woff2',
    'fonts/barlow-condensed-600.woff2',
    'fonts/barlow-condensed-700.woff2',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'data/aruja/municipal.json',
    'data/santa-isabel/internorte.json',
    'data/santa-isabel/jacarei.json',
    'data/santa-isabel/suzano.json',
    'data/santa-isabel/unileste.json'
];

self.addEventListener('install', evento => {
    evento.waitUntil(
        caches.open(CACHE_VERSION)
            .then(cache => cache.addAll(ARQUIVOS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', evento => {
    evento.waitUntil(
        caches.keys()
            .then(chaves => Promise.all(chaves.filter(c => c !== CACHE_VERSION).map(c => caches.delete(c))))
            .then(() => self.clients.claim())
    );
});

/* Horários (data/): rede primeiro, para pegar commit novo; sem rede, usa o salvo. */
async function redePrimeiro(requisicao) {
    const cache = await caches.open(CACHE_VERSION);
    try {
        const resposta = await fetch(requisicao, { cache: 'no-cache' });
        if (resposta.ok) cache.put(requisicao, resposta.clone());
        return resposta;
    } catch (erro) {
        const salvo = await cache.match(requisicao);
        if (salvo) return salvo;
        throw erro;
    }
}

/* Resto: mostra o salvo na hora e atualiza em segundo plano (vale na próxima abertura). */
async function salvoEAtualiza(requisicao) {
    const cache = await caches.open(CACHE_VERSION);
    const salvo = await cache.match(requisicao, { ignoreSearch: true });
    const atualizacao = fetch(requisicao, { cache: 'no-cache' })
        .then(resposta => {
            if (resposta.ok) cache.put(requisicao, resposta.clone());
            return resposta;
        })
        .catch(() => null);
    if (salvo) return salvo;
    const resposta = await atualizacao;
    return resposta || Response.error();
}

self.addEventListener('fetch', evento => {
    const requisicao = evento.request;
    if (requisicao.method !== 'GET') return;
    const url = new URL(requisicao.url);
    if (url.origin !== self.location.origin) return;

    if (url.pathname.includes('/data/')) {
        evento.respondWith(redePrimeiro(requisicao));
    } else if (requisicao.mode === 'navigate') {
        evento.respondWith(salvoEAtualiza(new Request('index.html')));
    } else {
        evento.respondWith(salvoEAtualiza(requisicao));
    }
});
