const db = {};
let cidadeAtiva = 'santa-isabel';
let empresaAtiva = '';
let linhaAtiva = null;
let sentidoAtivo = "";
let diaAtivo = "";

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
            console.log(`✅ Dados carregados: ${info.nome} (${db[chave].length} linhas)`);
        } catch (erro) {
            console.error(`❌ Falha ao carregar ${info.arquivo}:`, erro);
            db[chave] = [];
        }
    });
    await Promise.all(promessas);
    console.log(`🚌 Dados de ${config.nome} carregados!`);
}

function selecionarCidade(cidade) {
    cidadeAtiva = cidade;
    document.querySelectorAll('.cidade-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('painel').classList.add('hidden');
    document.getElementById('selectLinha').disabled = true;
    document.getElementById('selectLinha').innerHTML = '<option value="">Aguardando seleção...</option>';
    carregarDadosCidade(cidade).then(() => { popularEmpresas(); });
}

function popularEmpresas() {
    const selectEmpresa = document.getElementById('selectEmpresa');
    selectEmpresa.innerHTML = '<option value="">Selecione a empresa...</option>';
    const config = configCidades[cidadeAtiva];
    if (config && config.empresas) {
        Object.entries(config.empresas).forEach(([chave, info]) => {
            const opt = document.createElement('option');
            opt.value = chave;
            opt.textContent = info.nome;
            selectEmpresa.appendChild(opt);
        });
    }
}

function atualizarLinhas() {
    const emp = document.getElementById('selectEmpresa').value;
    const selectLinha = document.getElementById('selectLinha');
    selectLinha.innerHTML = '<option value="">Escolha a linha...</option>';
    document.getElementById('painel').classList.add('hidden');
    empresaAtiva = emp;
    if (emp && db[emp] && db[emp].length > 0) {
        const linhasOrdenadas = [...db[emp]].sort((a, b) => a.nome.localeCompare(b.nome));
        linhasOrdenadas.forEach(l => {
            let opt = document.createElement('option');
            opt.value = l.id;
            opt.textContent = l.nome;
            selectLinha.appendChild(opt);
        });
        selectLinha.disabled = false;
    } else {
        selectLinha.disabled = true;
    }
}

function carregarQuadroHorario() {
    const id = document.getElementById('selectLinha').value;
    if (!id || !empresaAtiva) return;
    linhaAtiva = db[empresaAtiva].find(l => l.id === id);
    if (!linhaAtiva) return;
    
    document.getElementById('nomeLinha').innerText = linhaAtiva.nome;
    
    const tarifaEl = document.getElementById('valorTarifa');
    if (linhaAtiva.tarifa) {
        tarifaEl.innerText = "TARIFA: " + linhaAtiva.tarifa;
        tarifaEl.style.display = 'inline-block';
    } else {
        tarifaEl.style.display = 'none';
    }

    const percursoEl = document.getElementById('tempoPercurso');
    if (linhaAtiva.percurso) {
        percursoEl.innerText = "Tempo de Percurso: " + linhaAtiva.percurso;
        percursoEl.style.display = "block";
    } else {
        percursoEl.style.display = "none";
    }

    // EXIBE A LEGENDA SE EXISTIR
    const trechoLegenda = document.getElementById('legendaLinha');
    if (linhaAtiva.legenda) {
        trechoLegenda.innerText = linhaAtiva.legenda;
        trechoLegenda.style.display = "block";
    } else {
        trechoLegenda.style.display = "none";
    }

    document.getElementById('painel').classList.remove('hidden');
    sentidoAtivo = Object.keys(linhaAtiva.trajetos)[0];
    diaAtivo = Object.keys(linhaAtiva.trajetos[sentidoAtivo])[0];
    renderizarMenus();
    renderizarHorarios();
}

function renderizarMenus() {
    const boxSentido = document.getElementById('tabsSentido');
    const boxDias = document.getElementById('tabsDias');
    const sentidos = Object.keys(linhaAtiva.trajetos);
    document.getElementById('sectionSentido').style.display = sentidos.length > 1 ? 'block' : 'none';
    boxSentido.innerHTML = sentidos.map(s => `<button class="tab-btn ${s === sentidoAtivo ? 'active' : ''}" onclick="mudarSentido('${s}')">${s}</button>`).join('');
    const dias = Object.keys(linhaAtiva.trajetos[sentidoAtivo]);
    boxDias.innerHTML = dias.map(d => `<button class="tab-btn ${d === diaAtivo ? 'active' : ''}" onclick="mudarDia('${d}')">${d}</button>`).join('');
}

function mudarSentido(s) { sentidoAtivo = s; diaAtivo = Object.keys(linhaAtiva.trajetos[sentidoAtivo])[0]; renderizarMenus(); renderizarHorarios(); }
function mudarDia(d) { diaAtivo = d; renderizarMenus(); renderizarHorarios(); }

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
    const lista = document.getElementById('listaHorarios');
    const horarios = linhaAtiva.trajetos[sentidoAtivo][diaAtivo];
    const agora = new Date();
    const horaAtual = agora.getHours().toString().padStart(2, '0') + 'h' + agora.getMinutes().toString().padStart(2, '0');
    if (!horarios || horarios.length === 0 || (horarios.length === 1 && horarios[0].toLowerCase().includes("não opera"))) {
        lista.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-dim); padding: 20px;">Não opera neste dia.</p>';
        return;
    }
    const horariosFormatados = horarios.map(h => extrairHora(h));
    let indiceProximo = -1;
    for (let i = 0; i < horariosFormatados.length; i++) {
        if (horariosFormatados[i] > horaAtual) { indiceProximo = i; break; }
    }
    if (indiceProximo === -1 && horarios.length > 0) { indiceProximo = 0; }
    lista.innerHTML = horarios.map((h, index) => {
        let textoExibicao = h;
        let observacao = "";
        if (h.includes('|')) {
            const partes = h.split('|');
            textoExibicao = partes[0].trim();
            observacao = partes[1].trim();
        }
        const classeProximo = (index === indiceProximo) ? "proximo" : "";
        return `<div class="hora-item ${classeProximo}"><div class="hora-text">${textoExibicao}</div>${observacao ? `<span class="observacao">${observacao}</span>` : ''}<div class="hora-info">Partida</div></div>`;
    }).join('');
}

window.addEventListener('DOMContentLoaded', () => {
    carregarDadosCidade('santa-isabel').then(() => { popularEmpresas(); });
});