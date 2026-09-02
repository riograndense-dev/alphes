import Requests from './requests';

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Subclasse que anexa o HTTP status ao erro,
 * permitindo detectar 401/403 nos componentes.
 */
class AuthedRequests extends Requests {
    async handleResponse(response) {
        const contentType = response.headers.get('content-type') || '';
        const data = contentType.includes('application/json')
            ? await response.json()
            : null;

        if (!response.ok) {
            const err = new Error(
                data?.detail || data?.message || `Erro HTTP ${response.status}`
            );
            err.status = response.status;
            throw err;
        }

        return data;
    }
}

const api = new AuthedRequests(API_URL);

// ─── Auth ──────────────────────────────────────────────────────────────────

/**
 * Login via OAuth2 Password Flow (form-data, não JSON).
 * Salva o access_token no localStorage.
 */
export async function login(username, password) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
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
        await api.postData('/auth/logout');
    } catch {
        // ignora erros no logout
    }
}

// ─── Relatórios ───────────────────────────────────────────────────────────

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