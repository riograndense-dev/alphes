import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { login, getMe } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

function IconRefresh({ className }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState('');

    const { user, setLoggedIn } = useAuth();
    const navigate  = useNavigate();
    const location  = useLocation();

    const sessionExpired = location.state?.sessionExpired === true;

    // Já logado → vai para dashboard
    if (user) return <Navigate to="/dashboard" replace />;

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login(username.trim(), password);
            const me = await getMe();
            setLoggedIn(me);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(err.message || 'Credenciais inválidas. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] via-[#265073] to-[#1a4a7a] flex items-center justify-center p-4">
            <div className="w-full max-w-sm">

                {/* Marca */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-[#F59E0B] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-black/30">
                        <span className="text-[#1E3A5F] font-black text-3xl leading-none">A</span>
                    </div>
                    <h1 className="text-white text-2xl font-bold tracking-wide">ALPHES</h1>
                    <p className="text-blue-300 text-sm mt-1">Sistema de Gestão de Vendas</p>
                </div>

                {/* Card de login */}
                <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 p-6">

                    {sessionExpired && (
                        <div className="mb-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Sessão expirada. Faça login novamente.</span>
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                                Usuário
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                required
                                autoFocus
                                autoComplete="username"
                                placeholder="seu.usuario"
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F] transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                                Senha
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                placeholder="••••••••"
                                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F] transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-[#1E3A5F] hover:bg-[#162d4a] active:bg-[#112237] text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? (
                                <>
                                    <IconRefresh className="w-4 h-4 animate-spin" />
                                    Entrando...
                                </>
                            ) : 'Entrar'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-blue-400/50 text-xs mt-6">
                    © {new Date().getFullYear()} Rio Grandense · ALPHES v0.1
                </p>
            </div>
        </div>
    );
}
