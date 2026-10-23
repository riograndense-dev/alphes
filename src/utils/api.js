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
