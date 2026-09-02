/**
 * Barra de progresso colorida por faixa de percentual.
 * < 50%  → vermelho
 * 50-79% → âmbar
 * >= 80% → verde
 */
export default function ProgressBar({ percent }) {
    const pct = Math.min(Math.max(Number(percent) || 0, 0), 100);

    const color =
        pct >= 80 ? 'bg-green-500' :
        pct >= 50 ? 'bg-amber-400' :
        'bg-red-500';

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-500">
                    {pct.toFixed(1)}%
                </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${color}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}
