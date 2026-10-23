import { useAuth } from '../contexts/AuthContext';
import { canManageDynamicGoals, roleKey } from '../utils/roles';
import { useLocation, useNavigate } from 'react-router-dom';

const ROLE_LABELS = {
    ADMIN:      'Administrador',
    SUPERVISOR: 'Supervisor',
    USER:       'Vendedor',
};

/**
 * Barra de navegação superior do ALPHES.
 * @param {Function} onRefresh  - Callback de atualização manual
 * @param {Date|null} lastUpdate - Timestamp da última atualização
 * @param {boolean}  loading    - Indica se dados estão carregando
 */
export default function Navbar({ onRefresh, lastUpdate, loading }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    function handleLogout() {
        logout();
        navigate('/login', { replace: true });
    }

    const roleLabel = ROLE_LABELS[roleKey(user?.role)] ?? user?.role ?? '';
    const updateStr = lastUpdate
        ? lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : null;
    const isGoalsPage = location.pathname === '/metas-dinamicas';

    return (
        <nav className="bg-[#1E3A5F] text-white shadow-lg sticky top-0 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-14">

                    {/* Logo */}
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-[#F59E0B] rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="font-black text-[#1E3A5F] text-sm leading-none">A</span>
                        </div>
                        <span className="font-bold text-base tracking-wide">ALPHES</span>
                    </div>

                    {/* Centro: última atualização (só sm+) */}
                    {updateStr && (
                        <span className="hidden sm:block text-xs text-blue-300">
                            Atualizado às {updateStr}
                        </span>
                    )}

                    {/* Direita */}
                    <div className="flex items-center gap-2">
                        {/* Usuário (só sm+) */}
                        <div className="hidden sm:block text-right mr-1">
                            <p className="text-xs font-semibold leading-tight">{user?.usuario}</p>
                            <p className="text-xs text-blue-300 leading-tight">{roleLabel}</p>
                        </div>

                        {canManageDynamicGoals(user?.role) && (
                            <button
                                onClick={() => navigate(isGoalsPage ? '/dashboard' : '/metas-dinamicas')}
                                className="px-3 py-1.5 border border-white/20 hover:bg-white/10 text-xs font-semibold rounded-lg transition-colors"
                            >
                                {isGoalsPage ? 'Dashboard' : 'Metas'}
                            </button>
                        )}

                        {/* Botão Atualizar */}
                        {onRefresh && (
                            <button
                                onClick={onRefresh}
                                disabled={loading}
                                title="Atualizar dados"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F59E0B] hover:bg-amber-400 active:bg-amber-500 text-[#1E3A5F] text-xs font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed select-none"
                            >
                                <svg
                                    className={`w-3.5 h-3.5 flex-shrink-0 ${loading ? 'animate-spin' : ''}`}
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span className="hidden sm:inline">Atualizar</span>
                            </button>
                        )}

                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            title="Sair"
                            className="p-1.5 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Última atualização no mobile */}
                {updateStr && (
                    <div className="sm:hidden pb-1.5 text-center text-xs text-blue-300">
                        Atualizado às {updateStr}
                    </div>
                )}
            </div>
        </nav>
    );
}
