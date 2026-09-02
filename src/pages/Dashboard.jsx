import { useState, useEffect } from 'react';
import { useNavigate }         from 'react-router-dom';
import { useAuth }             from '../contexts/AuthContext';
import { useDashboard }        from '../hooks/useDashboard';
import Navbar      from '../components/Navbar';
import StatCard    from '../components/StatCard';
import SalesTable  from '../components/SalesTable';

// ─── Helpers ──────────────────────────────────────────────────────────────

const ROLE_TITLES = {
    ADMIN:      'Painel Geral — Todos os Vendedores',
    SUPERVISOR: 'Painel do Supervisor',
    USER:       'Meu Desempenho',
};

function fmtBRL(n) {
    return Number(n).toLocaleString('pt-BR', {
        style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
    });
}

function todayISO() {
    return new Date().toISOString().split('T')[0];
}

function firstDayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// ─── Estado de erro genérico ──────────────────────────────────────────────

function ErrorState({ message, onRetry }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-700">Erro ao carregar</h2>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">{message}</p>
            <button
                onClick={onRetry}
                className="mt-5 px-5 py-2 bg-[#1E3A5F] text-white text-sm font-medium rounded-lg hover:bg-[#162d4a] transition-colors"
            >
                Tentar novamente
            </button>
        </div>
    );
}

// ─── Estado 403 ───────────────────────────────────────────────────────────

function AccessDenied() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-700">Acesso Negado</h2>
            <p className="text-sm text-gray-400 mt-1">
                Você não tem permissão para visualizar estes dados.
            </p>
        </div>
    );
}

// ─── Spinner ──────────────────────────────────────────────────────────────

function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center py-20">
            <svg className="w-10 h-10 animate-spin text-[#1E3A5F]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm text-gray-400 mt-3">Carregando dados...</p>
        </div>
    );
}

// ─── Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Data padrão do dia atual (hoje/hoje)
    const [datai, setDatai] = useState(todayISO);
    const [dataf, setDataf] = useState(todayISO);
    
    // Barra de pesquisa
    const [searchTerm, setSearchTerm] = useState('');

    const { data, loading, error, apiStatus, lastUpdate, refresh } =
        useDashboard(datai, dataf);

    // 401 → sessão expirada
    useEffect(() => {
        if (apiStatus === 401) {
            logout();
            navigate('/login', { state: { sessionExpired: true }, replace: true });
        }
    }, [apiStatus, logout, navigate]);

    // ── Totais ─────────────────────────────────────────────────────────────
    const totals = data.reduce(
        (acc, item) => {
            acc.vendas += parseFloat(item.PVENDA) || 0;
            acc.meta   += parseFloat(item.META)   || 0;
            acc.qtclipos += parseInt(item.QTCLIPOS) || 0;
            return acc;
        },
        { vendas: 0, meta: 0, qtclipos: 0 }
    );
    const totalFalta = Math.max(totals.meta - totals.vendas, 0);
    const totalPct   = totals.meta > 0
        ? (totals.vendas / totals.meta) * 100
        : 0;
        
    // Média de pedidos geral
    const mediaPedidos = totals.qtclipos > 0 ? totals.vendas / totals.qtclipos : 0;

    const pctAccent =
        totalPct >= 80 ? 'border-green-500' :
        totalPct >= 50 ? 'border-amber-400' :
        'border-red-400';

    // ── Filtro de Pesquisa ───────────────────────────────────────────────────
    const filteredData = data.filter(item => 
        (item.NOME || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        String(item.CODUSUR).includes(searchTerm)
    );

    // ── Conteúdo central ───────────────────────────────────────────────────
    function renderContent() {
        if (loading && data.length === 0) return <LoadingState />;
        if (apiStatus === 403)            return <AccessDenied />;
        if (error)                        return <ErrorState message={error} onRetry={refresh} />;

        const isUser = user?.role === 'USER';

        return (
            <>
                {/* Cards de totais */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                    <StatCard title="Total Meta"     value={fmtBRL(totals.meta)}   accent="border-[#1E3A5F]" />
                    <StatCard title="Total Vendas"   value={fmtBRL(totals.vendas)} accent="border-green-500" />
                    <StatCard title="Falta"          value={fmtBRL(totalFalta)}    accent="border-red-400" />
                    <StatCard
                        title="% Geral da Meta"
                        value={`${totalPct.toFixed(1)}%`}
                        subtitle={isUser ? "Sua meta" : `${data.length} vendedor${data.length !== 1 ? 'es' : ''}`}
                        accent={pctAccent}
                    />
                    <StatCard 
                        title="Média por Pedido" 
                        value={fmtBRL(mediaPedidos)} 
                        accent="border-blue-400" 
                        subtitle={`Cli. Atendidos: ${totals.qtclipos}`}
                    />
                </div>

                {/* Indicador de refresh silencioso */}
                {loading && data.length > 0 && (
                    <p className="text-center text-xs text-gray-400 animate-pulse mb-3">
                        Atualizando dados...
                    </p>
                )}

                {/* Tela própria para vendedor vs Tabela de vendedores */}
                {isUser ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center mt-4">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-[#1E3A5F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">{user?.usuario}</h2>
                        <p className="text-gray-500 mb-6">Seu desempenho no período selecionado</p>
                        <div className="max-w-md mx-auto">
                            <ProgressBar percent={totalPct} />
                        </div>
                        <p className="mt-4 text-sm text-gray-600">
                            Continue assim! Você já atingiu <strong>{totalPct.toFixed(1)}%</strong> da sua meta.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Barra de pesquisa na tabela de vendedores */}
                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="Pesquisar vendedor (nome ou RCA)..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full md:w-96 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F] transition-all shadow-sm"
                            />
                        </div>
                        {/* Tabela / Cards */}
                        <SalesTable data={filteredData} />
                    </>
                )}
            </>
        );
    }

    return (
        <div className="min-h-screen bg-[#F1F5F9]">
            <Navbar onRefresh={refresh} lastUpdate={lastUpdate} loading={loading} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {/* Cabeçalho da página */}
                <div className="mb-5">
                    <h1 className="text-lg font-bold text-gray-800">
                        {ROLE_TITLES[user?.role] ?? 'Dashboard'}
                    </h1>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Atualização automática a cada 30 segundos
                    </p>
                </div>

                {/* Filtro de período */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                            Período
                        </p>
                        <div className="flex flex-wrap gap-3 items-end">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">De</label>
                                <input
                                    type="date"
                                    value={datai}
                                    max={dataf}
                                    onChange={e => setDatai(e.target.value)}
                                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F] transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Até</label>
                                <input
                                    type="date"
                                    value={dataf}
                                    min={datai}
                                    onChange={e => setDataf(e.target.value)}
                                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F] transition-all"
                                />
                            </div>
                            <button
                                onClick={refresh}
                                disabled={loading}
                                className="px-4 py-1.5 bg-[#1E3A5F] hover:bg-[#162d4a] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
                            >
                                Buscar
                            </button>
                        </div>
                    </div>
                </div>

                {renderContent()}
            </main>
        </div>
    );
}
