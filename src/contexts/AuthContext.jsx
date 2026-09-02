import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, logout as apiLogout } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    // Ao montar, verifica se já existe token e carrega o usuário
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setAuthLoading(false);
            return;
        }

        getMe()
            .then(setUser)
            .catch(() => {
                // Token inválido/expirado
                localStorage.removeItem('token');
            })
            .finally(() => setAuthLoading(false));
    }, []);

    const setLoggedIn = useCallback((userData) => {
        setUser(userData);
    }, []);

    const logout = useCallback(() => {
        apiLogout();
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, authLoading, setLoggedIn, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
    return ctx;
}
