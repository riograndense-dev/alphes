/**
 * Card de métrica totalizadora.
 * @param {string} title    - Rótulo (ex.: "Total Vendas")
 * @param {string} value    - Valor formatado (ex.: "R$ 38.000")
 * @param {string} [subtitle] - Texto secundário opcional
 * @param {string} [accent]   - Classe Tailwind da borda esquerda
 */
export default function StatCard({ title, value, subtitle, accent = 'border-[#1E3A5F]' }) {
    return (
        <div className={`bg-white rounded-xl shadow-sm p-4 border-l-4 ${accent}`}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide truncate">
                {title}
            </p>
            <p className="text-2xl font-bold text-gray-800 mt-1 leading-tight truncate">
                {value}
            </p>
            {subtitle && (
                <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            )}
        </div>
    );
}
