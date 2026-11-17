const db = {};
let cidadeAtiva = 'santa-isabel';
let empresaAtiva = '';
let linhaAtiva = null;
let sentidoAtivo = '';
let diaAtivo = '';

const configCidades = {
    'santa-isabel': {
        nome: 'Santa Isabel',
        empresas: {
            'jacarei': { nome: 'Viação Jacareí', arquivo: 'data/santa-isabel/jacarei.json' },
            'suzano': { nome: 'Auto Viação Suzano', arquivo: 'data/santa-isabel/suzano.json' },
            'unileste': { nome: 'Unileste', arquivo: 'data/santa-isabel/unileste.json' },
            'internorte': { nome: 'Internorte', arquivo: 'data/santa-isabel/internorte.json' }
        }
    },
    'aruja': {
        nome: 'Arujá',
        empresas: {
            'aruja-municipal': { nome: 'Viação Arujá (Municipal)', arquivo: 'data/aruja/municipal.json' }
        }
    }
};

const el = {
    cidades: document.getElementById('tabsCidade'),
    empresa: document.getElementById('selectEmpresa'),
    linha: document.getElementById('selectLinha'),
    painel: document.getElementById('painel'),
    vazio: document.getElementById('vazio'),
    nome: document.getElementById('nomeLinha'),
    metaTarifa: document.getElementById('metaTarifa'),
    tarifa: document.getElementById('valorTarifa'),
    metaPercurso: document.getElementById('metaPercurso'),
    percurso: document.getElementById('tempoPercurso'),
    legenda: document.getElementById('legendaLinha'),
    secaoSentido: document.getElementById('sectionSentido'),
    tabsSentido: document.getElementById('tabsSentido'),
    tabsDias: document.getElementById('tabsDias'),
    lista: document.getElementById('listaHorarios')
};

/* Exibe "SÃO DOMINGOS" como "São Domingos" sem mexer na chave usada nos dados. */
const PALAVRAS_MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'x', 'via']);
const SIGLAS = new Set(['cptm', 'cdhu', 'km']);

function rotulo(texto) {
    return texto.toLowerCase().replace(/(^|[\s(/])(\p{L}+)/gu, (m, pre, palavra, pos) => {
        if (SIGLAS.has(palavra)) return pre + palavra.toUpperCase();
        if (pos > 0 && PALAVRAS_MINUSCULAS.has(palavra)) return m;
        return pre + palavra.charAt(0).toUpperCase() + palavra.slice(1);
    });
}

function mostrarPainel(visivel) {
    el.painel.classList.toggle('hidden', !visivel);
    el.vazio.classList.toggle('hidden', visivel);
}

async function carregarDadosCidade(cidade) {
    const config = configCidades[cidade];
    if (!config) return;
    Object.keys(db).forEach(key => delete db[key]);
    const promessas = Object.entries(config.empresas).map(async ([chave, info]) => {
        try {
            const resposta = await fetch(info.arquivo);
            if (!resposta.ok) throw new Error(`Erro ao carregar ${info.arquivo}`);
            const dados = await resposta.json();
            db[chave] = Array.isArray(dados) ? dados : [dados];
        } catch (erro) {
            console.error(`Falha ao carregar ${info.arquivo}:`, erro);
            db[chave] = [];
        }
    });
    await Promise.all(promessas);
}

function selecionarCidade(cidade) {
    cidadeAtiva = cidade;
    el.cidades.querySelectorAll('.cidade-btn').forEach(btn => {
        const ativo = btn.dataset.cidade === cidade;
        btn.classList.toggle('active', ativo);
        btn.setAttribute('aria-pressed', String(ativo));
    });
    mostrarPainel(false);
    empresaAtiva = '';
    el.linha.disabled = true;
    el.linha.innerHTML = '<option value="">Escolha a empresa primeiro</option>';
    carregarDadosCidade(cidade).then(popularEmpresas);
}

function popularEmpresas() {
    el.empresa.innerHTML = '<option value="">Selecione a empresa</option>';
    const config = configCidades[cidadeAtiva];
    if (config && config.empresas) {
        Object.entries(config.empresas).forEach(([chave, info]) => {
            const opt = document.createElement('option');
            opt.value = chave;
            opt.textContent = info.nome;
            el.empresa.appendChild(opt);
        });
    }
}

function atualizarLinhas() {
    const emp = el.empresa.value;
    el.linha.innerHTML = '<option value="">Escolha a linha</option>';
    mostrarPainel(false);
    empresaAtiva = emp;
    if (emp && db[emp] && db[emp].length > 0) {
        const linhasOrdenadas = [...db[emp]].sort((a, b) => a.nome.localeCompare(b.nome));
        linhasOrdenadas.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l.id;
            opt.textContent = rotulo(l.nome);
            el.linha.appendChild(opt);
        });
        el.linha.disabled = false;
    } else {
        el.linha.disabled = true;
        if (!emp) el.linha.innerHTML = '<option value="">Escolha a empresa primeiro</option>';
    }
}

function definirMeta(bloco, campo, valor) {
    if (valor) {
        campo.textContent = valor;
        bloco.hidden = false;
    } else {
        bloco.hidden = true;
    }
}

function carregarQuadroHorario() {
    const id = el.linha.value;
    if (!id || !empresaAtiva) return;
    linhaAtiva = db[empresaAtiva].find(l => l.id === id);
    if (!linhaAtiva) return;

    el.nome.textContent = rotulo(linhaAtiva.nome);
    definirMeta(el.metaTarifa, el.tarifa, linhaAtiva.tarifa);
    definirMeta(el.metaPercurso, el.percurso, linhaAtiva.percurso);

    el.legenda.innerHTML = '';
    if (linhaAtiva.legenda) {
        linhaAtiva.legenda.split('|').forEach(parte => {
            const li = document.createElement('li');
            li.textContent = parte.trim();
            el.legenda.appendChild(li);
        });
    }

    mostrarPainel(true);
    sentidoAtivo = Object.keys(linhaAtiva.trajetos)[0];
    diaAtivo = Object.keys(linhaAtiva.trajetos[sentidoAtivo])[0];
    renderizarMenus();
    renderizarHorarios();
}

function criarAba(chave, ativa, tipo) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tab-btn';
    btn.dataset.tipo = tipo;
    btn.dataset.valor = chave;
    btn.setAttribute('aria-pressed', String(ativa));
    btn.textContent = rotulo(chave);
    return btn;
}

function renderizarMenus() {
    const sentidos = Object.keys(linhaAtiva.trajetos);
    el.secaoSentido.style.display = sentidos.length > 1 ? 'block' : 'none';
    el.tabsSentido.replaceChildren(...sentidos.map(s => criarAba(s, s === sentidoAtivo, 'sentido')));
    const dias = Object.keys(linhaAtiva.trajetos[sentidoAtivo]);
    el.tabsDias.replaceChildren(...dias.map(d => criarAba(d, d === diaAtivo, 'dia')));
}

function mudarSentido(s) {
    sentidoAtivo = s;
    diaAtivo = Object.keys(linhaAtiva.trajetos[sentidoAtivo])[0];
    renderizarMenus();
    renderizarHorarios();
}

function mudarDia(d) {
    diaAtivo = d;
    renderizarMenus();
    renderizarHorarios();
}

function extrairHora(horarioString) {
    let apenasHora = horarioString.split('|')[0].trim();
    apenasHora = apenasHora.replace(':', 'h');
    if (!apenasHora.includes('h')) { apenasHora = apenasHora + 'h00'; }
    const partes = apenasHora.split('h');
    const horas = partes[0].padStart(2, '0');
    const minutos = (partes[1] || '00').padStart(2, '0');
    return horas + 'h' + minutos;
}

function renderizarHorarios() {
    const horarios = linhaAtiva.trajetos[sentidoAtivo][diaAtivo];
    const agora = new Date();
    const horaAtual = agora.getHours().toString().padStart(2, '0') + 'h' + agora.getMinutes().toString().padStart(2, '0');

    if (!horarios || horarios.length === 0 || (horarios.length === 1 && horarios[0].toLowerCase().includes('não opera'))) {
        el.lista.innerHTML = '<p class="sem-servico">Não opera neste dia.</p>';
        return;
    }

    const horariosFormatados = horarios.map(h => extrairHora(h));
    let indiceProximo = -1;
    for (let i = 0; i < horariosFormatados.length; i++) {
        if (horariosFormatados[i] > horaAtual) { indiceProximo = i; break; }
    }
    if (indiceProximo === -1) { indiceProximo = 0; }

    el.lista.replaceChildren(...horarios.map((h, index) => {
        const [texto, observacao] = h.split('|').map(p => p.trim());
        const item = document.createElement('div');
        item.className = 'hora-item' + (index === indiceProximo ? ' proximo' : '');

        const hora = document.createElement('div');
        hora.className = 'hora-text';
        hora.textContent = texto;
        item.appendChild(hora);

        if (index === indiceProximo) {
            const flag = document.createElement('span');
            flag.className = 'hora-flag';
            flag.textContent = 'Próxima saída';
            item.appendChild(flag);
        }
        if (observacao) {
            const obs = document.createElement('span');
            obs.className = 'hora-obs';
            obs.textContent = observacao;
            item.appendChild(obs);
        }
        return item;
    }));
}

el.cidades.addEventListener('click', e => {
    const btn = e.target.closest('.cidade-btn');
    if (btn) selecionarCidade(btn.dataset.cidade);
});
el.empresa.addEventListener('change', atualizarLinhas);
el.linha.addEventListener('change', carregarQuadroHorario);

function aoClicarAba(e) {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    const tipo = btn.dataset.tipo;
    if (tipo === 'sentido') mudarSentido(btn.dataset.valor);
    else mudarDia(btn.dataset.valor);
    const ativa = document.querySelector(`.tab-btn[data-tipo="${tipo}"][aria-pressed="true"]`);
    if (ativa) ativa.focus();
}
el.tabsSentido.addEventListener('click', aoClicarAba);
el.tabsDias.addEventListener('click', aoClicarAba);

window.addEventListener('DOMContentLoaded', () => {
    carregarDadosCidade('santa-isabel').then(popularEmpresas);
});
