import Requests from './requests';

const API_URL = import.meta.env.VITE_API_URL;

/** Cliente autenticado com renovação automática e uma única repetição por 401. */
class AuthedRequests extends Requests {
    constructor(apiUrl) {
        super(apiUrl);
        this.refreshPromise = null;
    }

    async refreshAccessToken() {
        if (!this.refreshPromise) {
            this.refreshPromise = this.send(`${this.apiUrl}/auth/refresh`, {
                method: 'POST',
                body: JSON.stringify({}),
                skipAuthRefresh: true,
            })
                .then(response => this.handleResponse(response))
                .then(data => {
                    if (!data?.access_token) {
                        throw new Error('A API não retornou um access token válido.');
                    }

                    localStorage.setItem('token', data.access_token);
                    return data.access_token;
                })
                .finally(() => {
                    this.refreshPromise = null;
                });
        }

        return this.refreshPromise;
    }

    async request(url, options = {}) {
        const { skipAuthRefresh = false, ...requestOptions } = options;
        const tokenUsed = localStorage.getItem('token');
        let response = await this.send(url, requestOptions);

        if (response.status !== 401 || skipAuthRefresh) {
            return this.handleResponse(response);
        }

        // Outra chamada pode ter renovado o token enquanto esta estava em voo.
        if (localStorage.getItem('token') === tokenUsed) {
            try {
                await this.refreshAccessToken();
            } catch {
                localStorage.removeItem('token');
                return this.handleResponse(response);
            }
        }

        // Erros de rede e aborts da repetição devem chegar intactos ao chamador.
        response = await this.send(url, requestOptions);
        return this.handleResponse(response);
    }
}

const api = new AuthedRequests(API_URL);

// ─── Auth ───────────────────────────────────────────────────────────────────

/**
 * Login via OAuth2 Password Flow (form-data, não JSON).
 * Salva o access_token no localStorage; o refresh token fica no cookie HttpOnly.
 */
export async function login(username, password) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
        credentials: 'include',
    });

    if (!response.ok) {
        const data = await response.json().catch(() => null);
        const err = new Error(data?.detail || `Credenciais inválidas (${response.status})`);
        err.status = response.status;
        throw err;
    }

    const data = await response.json();
    localStorage.setItem('token', data.access_token);
    return data;
}

/** Retorna dados do usuário autenticado { id, usuario, role, codusur, codsupervisor } */
export async function getMe() {
    return api.getData('/auth/me');
}

export async function logout() {
    localStorage.removeItem('token');
    try {
        await api.postData('/auth/logout', {}, { skipAuthRefresh: true });
    } catch {
        // Ignora erros no logout local.
    }
}

// ─── Relatórios ─────────────────────────────────────────────────────────────

/**
 * Relatório de vendas por vendedor no período informado.
 * Retorna VendaPorVendedorResponse[]:
 *   { CODUSUR, NOME, QTCLIPOS, PVENDA, QT, TOTPESO, META }
 *   PVENDA, META, QT, TOTPESO chegam como strings numéricas — use parseFloat().
 */
export async function getVendas(datai, dataf, signal) {
    return api.getData(
        '/relatorios/vendas-por-vendedor',
        { datai, dataf, codfilial: 1 },
        signal ? { signal } : {}
    );
}

// ─── Supervisores e Vendedores ──────────────────────────────────────────────

/**
 * Lista de supervisores.
 * Retorna SupervisorResponse[]: { CODSUPERVISOR: number, NOME: string|null }
 */
export async function getSupervisores(signal) {
    return api.getData('/manager/', {}, signal ? { signal } : {});
}

/**
 * Lista de vendedores (Winthor).
 * Retorna UsuarioResponse[]: { CODUSUR: number, NOME: string|null }
 * Aceita filtros opcionais { codusur, codsupervisor }.
 */
export async function getUsuarios({ codusur, codsupervisor } = {}, signal) {
    return api.getData(
        '/user/',
        { codusur, codsupervisor },
        signal ? { signal } : {}
    );
}

// ─── Metas dinâmicas ────────────────────────────────────────────────────────

/** Retorna as metas calculadas para uma data ISO (AAAA-MM-DD). */
export async function getMetasDinamicasDiarias(dataReferencia, signal) {
    return api.getData(
        '/metas-dinamicas/diaria',
        { data_referencia: dataReferencia },
        signal ? { signal } : {}
    );
}

/** Recupera a distribuição semanal e diária configurada para um mês. */
export async function getConfiguracaoMetasDinamicas(ano, mes, signal) {
    return api.getData(
        `/metas-dinamicas/configuracoes/${ano}/${mes}`,
        {},
        signal ? { signal } : {}
    );
}

/** Cria ou substitui a distribuição semanal e diária de um mês. */
export async function salvarConfiguracaoMetasDinamicas(ano, mes, configuracao, signal) {
    return api.putData(
        `/metas-dinamicas/configuracoes/${ano}/${mes}`,
        configuracao,
        signal ? { signal } : {}
    );
}

const MAX_DIAS_META_DINAMICA = 366;
const CONCORRENCIA_METAS = 6;

function datasDoPeriodo(dataInicial, dataFinal) {
    const inicio = new Date(`${dataInicial}T00:00:00Z`);
    const fim = new Date(`${dataFinal}T00:00:00Z`);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || fim < inicio) {
        throw new Error('Período inválido para calcular as metas dinâmicas.');
    }

    const quantidade = Math.floor((fim - inicio) / 86_400_000) + 1;
    if (quantidade > MAX_DIAS_META_DINAMICA) {
        throw new Error(`Selecione um período de até ${MAX_DIAS_META_DINAMICA} dias.`);
    }

    return Array.from({ length: quantidade }, (_, indice) => {
        const data = new Date(inicio);
        data.setUTCDate(data.getUTCDate() + indice);
        return data.toISOString().slice(0, 10);
    });
}

/**
 * Soma as metas diárias por vendedor dentro do período. O limite de
 * concorrência evita disparar dezenas de chamadas simultâneas para a API.
 */
export async function getMetasDinamicasPeriodo(dataInicial, dataFinal, signal) {
    const datas = datasDoPeriodo(dataInicial, dataFinal);
    const respostas = new Array(datas.length);
    let proximoIndice = 0;

    async function buscarProximaData() {
        while (proximoIndice < datas.length) {
            const indice = proximoIndice++;
            respostas[indice] = await getMetasDinamicasDiarias(datas[indice], signal);
        }
    }

    const trabalhadores = Math.min(CONCORRENCIA_METAS, datas.length);
    await Promise.all(Array.from({ length: trabalhadores }, buscarProximaData));

    const metasPorVendedor = new Map();
    respostas.forEach(resposta => {
        (resposta?.vendedores || []).forEach(vendedor => {
            const codigo = Number(vendedor.codusur);
            const acumulada = metasPorVendedor.get(codigo) || 0;
            metasPorVendedor.set(codigo, acumulada + (Number(vendedor.meta_diaria) || 0));
        });
    });

    return metasPorVendedor;
}
