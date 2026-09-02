/**
 * Helpers para normalizar a `role` retornada pela API (`/auth/me`).
 *
 * A API documenta `role` como string livre, então o frontend deve tolerar
 * variações de caixa e sinônimos ("admin", "ADMIN", "Administrador", ...).
 */

/**
 * Normaliza a role: minúscula, sem espaços/pontuação.
 * @param {*} role
 * @returns {string}
 */
export function normalizeRole(role) {
    return String(role ?? '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '');
}

/** Converte a role para a chave canônica: ADMIN | SUPERVISOR | USER. */
export function roleKey(role) {
    const normalized = normalizeRole(role);

    if (normalized === 'admin' || normalized === 'administrador' || normalized === 'administrator') {
        return 'ADMIN';
    }
    if (normalized === 'supervisor') {
        return 'SUPERVISOR';
    }
    if (normalized === 'user' || normalized === 'vendedor' || normalized === 'seller') {
        return 'USER';
    }
    return normalized.toUpperCase();
}

export function isAdmin(role) {
    return roleKey(role) === 'ADMIN';
}

export function isSupervisor(role) {
    return roleKey(role) === 'SUPERVISOR';
}

export function isSeller(role) {
    return roleKey(role) === 'USER';
}