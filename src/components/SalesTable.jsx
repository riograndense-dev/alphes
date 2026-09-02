import { useState } from 'react';
import ProgressBar from './ProgressBar';

// ─── Helpers ──────────────────────────────────────────────────────────────

function fmtBRL(n) {
    return Number(n).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
    });
}

function calcRow(item) {
    const vendas     = parseFloat(item.PVENDA) || 0;
    const meta       = parseFloat(item.META)   || 0;
    const falta      = Math.max(meta - vendas, 0);
    const percentual = meta > 0 ? (vendas / meta) * 100 : 0;
    return { vendas, meta, falta, percentual };
}

function TheadRow() {
    return (
        <tr className="bg-[#1E3A5F] text-white">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Vendedor</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Meta</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Vendas</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">Falta</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide w-44">% Meta</th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Clientes</th>
        </tr>
    );
}

function PctBadge({ pct }) {
    const cls =
        pct >= 80 ? 'bg-green-100 text-green-700' :
        pct >= 50 ? 'bg-amber-100 text-amber-700' :
        'bg-red-100  text-red-700';
    return (
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cls}`}>
            {pct.toFixed(1)}%
        </span>
    );
}

// ─── Mobile Card ──────────────────────────────────────────────────────────

function RowCard({ item, onClick }) {
    const { vendas, meta, falta, percentual } = calcRow(item);

    return (
        <div 
            onClick={onClick}
            className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 cursor-pointer active:scale-[0.99] transition-transform"
        >
            {/* Cabeçalho do card */}
            <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 pr-2">
                    <p className="font-semibold text-gray-800 text-sm truncate">{item.NOME}</p>
                    <p className="text-xs text-gray-400 mt-0.5">RCA #{item.CODUSUR}</p>
                </div>
                <PctBadge pct={percentual} />
            </div>

            {/* Barra de progresso */}
            <ProgressBar percent={percentual} />

            {/* Grid de métricas */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-3 text-sm">
                <div>
                    <p className="text-xs text-gray-400">Meta</p>
                    <p className="font-semibold text-gray-700">{fmtBRL(meta)}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-400">Vendas</p>
                    <p className="font-semibold text-gray-700">{fmtBRL(vendas)}</p>
                </div>
            </div>
        </div>
    );
}

// ─── Desktop Row ──────────────────────────────────────────────────────────

function TableRow({ item, isOdd, onClick }) {
    const { vendas, meta, falta, percentual } = calcRow(item);

    return (
        <tr 
            onClick={onClick}
            className={`hover:bg-blue-50/40 cursor-pointer transition-colors ${isOdd ? 'bg-gray-50/50' : 'bg-white'}`}
        >
            <td className="px-4 py-3">
                <p className="font-medium text-gray-800 text-sm">{item.NOME}</p>
                <p className="text-xs text-gray-400">RCA #{item.CODUSUR}</p>
            </td>
            <td className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                {fmtBRL(meta)}
            </td>
            <td className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                {fmtBRL(vendas)}
            </td>
            <td className={`px-4 py-3 text-right text-sm font-medium ${falta > 0 ? 'text-red-500' : 'text-green-600'}`}>
                {falta > 0 ? fmtBRL(falta) : '✓ Atingida'}
            </td>
            <td className="px-4 py-3 w-44">
                <ProgressBar percent={percentual} />
            </td>
            <td className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                {item.QTCLIPOS}
            </td>
        </tr>
    );
}

// ─── Modal ──────────────────────────────────────────────────────────

function SellerModal({ item, onClose }) {
    if (!item) return null;
    const { vendas, meta, falta, percentual } = calcRow(item);
    
    // Calcula ticket médio
    const qt = parseFloat(item.QT) || 0;
    const ticketMedio = item.QTCLIPOS > 0 ? vendas / item.QTCLIPOS : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div 
                className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-[#1E3A5F] px-5 py-4 text-white flex items-start justify-between">
                    <div>
                        <h3 className="font-bold text-lg">{item.NOME}</h3>
                        <p className="text-blue-200 text-sm">RCA #{item.CODUSUR}</p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-5">
                    <div className="mb-5">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-sm font-medium text-gray-600">Progresso da Meta</span>
                            <PctBadge pct={percentual} />
                        </div>
                        <ProgressBar percent={percentual} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Meta</p>
                            <p className="text-base font-bold text-gray-800">{fmtBRL(meta)}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Vendas</p>
                            <p className="text-base font-bold text-green-600">{fmtBRL(vendas)}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Falta</p>
                            <p className={`text-base font-bold ${falta > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                {falta > 0 ? fmtBRL(falta) : 'Meta Atingida!'}
                            </p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Ticket Médio</p>
                            <p className="text-base font-bold text-gray-800">{fmtBRL(ticketMedio)}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Clientes Atendidos</p>
                            <p className="text-base font-bold text-gray-800">{item.QTCLIPOS}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <p className="text-xs text-gray-500 uppercase font-semibold">Qtd Itens</p>
                            <p className="text-base font-bold text-gray-800">{qt.toFixed(0)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────

export default function SalesTable({ data, exportRef, exportInfo = null }) {
    const [selectedItem, setSelectedItem] = useState(null);

    if (!data || data.length === 0) {
        return (
            <div className="text-center py-16 text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-base font-medium">Nenhum dado encontrado</p>
                <p className="text-sm mt-1">Tente ajustar o período de busca</p>
            </div>
        );
    }

    return (
        <>
            {/* Modal de Detalhes */}
            {selectedItem && (
                <SellerModal item={selectedItem} onClose={() => setSelectedItem(null)} />
            )}

            {/* ── Snapshot invisível para exportação como imagem ── */}
            {exportRef && (
                <div ref={exportRef} className="export-snapshot">
                    {exportInfo && (
                        <div className="mb-4">
                            <p className="text-lg font-bold text-[#1E3A5F]">
                                {exportInfo.title ?? 'Vendas por Vendedor'}
                            </p>
                            {exportInfo.subtitle && (
                                <p className="text-sm text-gray-500 mt-0.5">{exportInfo.subtitle}</p>
                            )}
                        </div>
                    )}
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <TheadRow />
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.map((item, idx) => (
                                <TableRow key={item.CODUSUR} item={item} isOdd={idx % 2 !== 0} />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Mobile: Cards (< md) ── */}
            <div className="md:hidden space-y-3">
                {data.map(item => (
                    <RowCard key={item.CODUSUR} item={item} onClick={() => setSelectedItem(item)} />
                ))}
            </div>

            {/* ── Desktop: Table (≥ md) ── */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <TheadRow />
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.map((item, idx) => (
                            <TableRow key={item.CODUSUR} item={item} isOdd={idx % 2 !== 0} onClick={() => setSelectedItem(item)} />
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
