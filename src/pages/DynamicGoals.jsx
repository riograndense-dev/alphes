import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import {
    getConfiguracaoMetasDinamicas,
    salvarConfiguracaoMetasDinamicas,
} from '../utils/api';
import { canManageDynamicGoals } from '../utils/roles';

const WEEK_DAYS = [
    { short: 'Seg', full: 'Segunda-feira' },
    { short: 'Ter', full: 'Terça-feira' },
    { short: 'Qua', full: 'Quarta-feira' },
    { short: 'Qui', full: 'Quinta-feira' },
    { short: 'Sex', full: 'Sexta-feira' },
    { short: 'Sáb', full: 'Sábado' },
    { short: 'Dom', full: 'Domingo' },
];

function currentMonthKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function buildCalendarWeeks(year, month) {
    const firstDay = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const weekCount = Math.ceil((mondayOffset + daysInMonth) / 7);

    return Array.from({ length: weekCount }, (_, weekIndex) =>
        Array.from({ length: 7 }, (_, dayIndex) => {
            const day = weekIndex * 7 + dayIndex - mondayOffset + 1;
            return day >= 1 && day <= daysInMonth ? day : null;
        })
    );
}

function evenDistribution(length) {
    const base = Math.floor((100 / length) * 100) / 100;
    const values = Array(length).fill(base);
    values[length - 1] = Number((100 - base * (length - 1)).toFixed(2));
    return values;
}

function defaultDailyDistribution() {
    return [20, 20, 20, 20, 20, 0, 0];
}

function editableValues(values) {
    return values.map(value => String(Number(value)));
}

function editableWeeklyValues(values, length) {
    const defaults = evenDistribution(length);
    return Array.from(
        { length },
        (_, index) => String(Number(values?.[index] ?? defaults[index]))
    );
}

function parsedValues(values) {
    if (values.some(value => String(value).trim() === '')) return null;
    const parsed = values.map(value => Number(String(value).replace(',', '.')));
    return parsed.every(value => Number.isFinite(value) && value >= 0 && value <= 100)
        ? parsed
        : null;
}

function total(values) {
    return values.reduce((sum, value) => sum + (Number(String(value).replace(',', '.')) || 0), 0);
}

function percentageClass(value, valid) {
    if (!valid) return 'text-red-600 bg-red-50 border-red-200';
    if (Math.abs(value - 100) <= 0.01) return 'text-green-700 bg-green-50 border-green-200';
    return 'text-amber-700 bg-amber-50 border-amber-200';
}

function formatUpdatedAt(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? null
        : date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function PercentageInput({ value, onChange, label, autoFilled = false, compact = false, disabled = false }) {
    return (
        <div className="min-w-0">
            <div className="relative">
                <input
                    aria-label={label}
                    autoComplete="off"
                    inputMode="decimal"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={value}
                    disabled={disabled}
                    onChange={onChange}
                    className={`w-full rounded-xl border bg-white text-right font-semibold text-[#1E3A5F] shadow-sm outline-none transition-all hover:border-blue-300 focus:border-[#1E3A5F] focus:ring-4 focus:ring-blue-100 ${
                        compact ? 'h-10 pl-2 pr-8 text-sm' : 'h-11 pl-3 pr-9 text-base'
                    } ${autoFilled ? 'border-emerald-300 bg-emerald-50/70' : 'border-slate-200'} disabled:cursor-not-allowed disabled:opacity-60`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    %
                </span>
            </div>
            <div className="h-4 pt-1 text-center">
                {autoFilled && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Autoajustado
                    </span>
                )}
            </div>
        </div>
    );
}

export default function DynamicGoals() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const canManage = canManageDynamicGoals(user?.role);
    const [monthKey, setMonthKey] = useState(currentMonthKey);
    const [weekly, setWeekly] = useState([]);
    const [daily, setDaily] = useState(editableValues(defaultDailyDistribution()));
    const [updatedAt, setUpdatedAt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [autoCompleted, setAutoCompleted] = useState({ group: null, index: null });
    const [autoAdjustEnabled, setAutoAdjustEnabled] = useState(true);

    const [year, month] = monthKey.split('-').map(Number);
    const weeks = useMemo(() => buildCalendarWeeks(year, month), [year, month]);

    const handleSessionExpired = useCallback(() => {
        logout();
        navigate('/login', { state: { sessionExpired: true }, replace: true });
    }, [logout, navigate]);

    const loadConfiguration = useCallback(async (signal) => {
        if (!canManage) return;

        setLoading(true);
        setError('');
        setNotice('');

        try {
            const configuration = await getConfiguracaoMetasDinamicas(year, month, signal);
            setWeekly(editableWeeklyValues(configuration.percentuais_semanais, weeks.length));
            setDaily(editableValues(configuration.percentuais_diarios));
            setUpdatedAt(configuration.atualizado_em);
            setAutoCompleted({ group: null, index: null });
        } catch (err) {
            if (err.name === 'AbortError') return;
            if (err.status === 401) {
                handleSessionExpired();
                return;
            }

            setWeekly(editableWeeklyValues(null, weeks.length));
            setDaily(editableValues(defaultDailyDistribution()));
            setUpdatedAt(null);
            setAutoCompleted({ group: null, index: null });

            if (err.status === 404) {
                setNotice('Este mês ainda não possui configuração. Revise os percentuais e salve para criá-la.');
            } else {
                setError(err.message || 'Não foi possível carregar a configuração das metas.');
            }
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [canManage, handleSessionExpired, month, weeks.length, year]);

    useEffect(() => {
        const controller = new AbortController();
        queueMicrotask(() => {
            if (!controller.signal.aborted) loadConfiguration(controller.signal);
        });
        return () => controller.abort();
    }, [loadConfiguration]);

    const weeklyParsed = parsedValues(weekly);
    const dailyParsed = parsedValues(daily);
    const weeklyTotal = total(weekly);
    const dailyTotal = total(daily);
    const totalsAreValid = Math.abs(weeklyTotal - 100) <= 0.01
        && Math.abs(dailyTotal - 100) <= 0.01;
    const formIsValid = weeklyParsed?.length === weeks.length
        && dailyParsed?.length === 7
        && totalsAreValid;

    const calendarCoverage = weeks.reduce((coverage, days, weekIndex) =>
        coverage + days.reduce((weekCoverage, day, dayIndex) => {
            if (day == null) return weekCoverage;
            const weekPercentage = weeklyParsed?.[weekIndex] || 0;
            const dayPercentage = dailyParsed?.[dayIndex] || 0;
            return weekCoverage + (weekPercentage * dayPercentage) / 100;
        }, 0), 0);

    function updateValue(group, index, value) {
        const current = group === 'weekly' ? weekly : daily;
        const setter = group === 'weekly' ? setWeekly : setDaily;
        const next = [...current];
        next[index] = value;

        const numericValue = Number(String(value).replace(',', '.'));
        if (autoAdjustEnabled && String(value).trim() !== '' && Number.isFinite(numericValue)) {
            const balanceIndex = index === next.length - 1 ? next.length - 2 : next.length - 1;
            const used = next.reduce((sum, item, itemIndex) => {
                if (itemIndex === balanceIndex) return sum;
                return sum + (Number(String(item).replace(',', '.')) || 0);
            }, 0);
            const remaining = Number(Math.max(0, 100 - used).toFixed(2));
            next[balanceIndex] = String(remaining);
            setAutoCompleted({ group, index: balanceIndex });
        } else {
            setAutoCompleted({ group: null, index: null });
        }

        setter(next);
        setError('');
        setNotice('');
    }

    function applyWeeklyPreset() {
        setWeekly(editableValues(evenDistribution(weeks.length)));
        setAutoCompleted({ group: null, index: null });
        setError('');
        setNotice('Distribuição semanal equilibrada automaticamente.');
    }

    function applyBusinessDaysPreset() {
        setDaily(editableValues(defaultDailyDistribution()));
        setAutoCompleted({ group: null, index: null });
        setError('');
        setNotice('Distribuição aplicada aos dias úteis; sábado e domingo ficaram com 0%.');
    }

    async function handleSave(event) {
        event.preventDefault();
        if (!formIsValid) {
            setError('Os percentuais semanais e diários devem ser válidos e totalizar 100% em cada grupo.');
            return;
        }

        setSaving(true);
        setError('');
        setNotice('');

        try {
            const configuration = await salvarConfiguracaoMetasDinamicas(year, month, {
                percentuais_semanais: weeklyParsed,
                percentuais_diarios: dailyParsed,
            });
            setWeekly(editableWeeklyValues(configuration.percentuais_semanais, weeks.length));
            setDaily(editableValues(configuration.percentuais_diarios));
            setUpdatedAt(configuration.atualizado_em);
            setAutoCompleted({ group: null, index: null });
            setNotice('Configuração salva. As metas diárias já usam os novos percentuais.');
        } catch (err) {
            if (err.status === 401) {
                handleSessionExpired();
                return;
            }
            setError(err.message || 'Não foi possível salvar a configuração das metas.');
        } finally {
            setSaving(false);
        }
    }

    if (!canManage) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="min-h-screen bg-[#F1F5F9]">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
                    <div>
                        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">
                            Configuração administrativa
                        </p>
                        <h1 className="text-2xl font-bold text-gray-800">Metas dinâmicas</h1>
                        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
                            Distribua a meta mensal entre as semanas e, dentro de cada semana,
                            entre os dias. A prévia mostra o percentual mensal de cada data.
                        </p>
                    </div>

                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Mês de referência
                        <input
                            type="month"
                            min="2000-01"
                            max="2100-12"
                            value={monthKey}
                            disabled={loading || saving}
                            onChange={event => {
                                if (event.target.value) setMonthKey(event.target.value);
                            }}
                            className="block mt-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-normal text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F] disabled:opacity-60"
                        />
                    </label>
                </div>

                <form onSubmit={handleSave} autoComplete="off">
                    <div className="grid sm:grid-cols-3 gap-3 mb-5">
                        <div className={`rounded-2xl border p-4 shadow-sm ${percentageClass(weeklyTotal, Boolean(weeklyParsed))}`}>
                            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Total semanal</p>
                            <p className="text-2xl font-bold mt-1">{weeklyTotal.toFixed(2)}%</p>
                            <p className="text-xs mt-1 opacity-70">Deve totalizar 100%</p>
                        </div>
                        <div className={`rounded-2xl border p-4 shadow-sm ${percentageClass(dailyTotal, Boolean(dailyParsed))}`}>
                            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Total diário</p>
                            <p className="text-2xl font-bold mt-1">{dailyTotal.toFixed(2)}%</p>
                            <p className="text-xs mt-1 opacity-70">Deve totalizar 100%</p>
                        </div>
                        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white text-blue-800 p-4 shadow-sm">
                            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Cobertura no calendário</p>
                            <p className="text-2xl font-bold mt-1">{calendarCoverage.toFixed(2)}%</p>
                            <p className="text-xs mt-1 opacity-70">Soma das datas visíveis no mês</p>
                        </div>
                    </div>

                    <div className={`mb-5 flex flex-col gap-3 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${
                        autoAdjustEnabled
                            ? 'border-blue-200 bg-blue-50 text-blue-900'
                            : 'border-slate-300 bg-slate-100 text-slate-700'
                    }`}>
                        <div className="flex items-start gap-3">
                            <div className={`mt-0.5 flex h-7 w-7 flex-none items-center justify-center rounded-full text-base ${
                                autoAdjustEnabled ? 'bg-blue-200' : 'bg-slate-200'
                            }`}>✦</div>
                            <div>
                                <p className="font-semibold">
                                    Autoajuste {autoAdjustEnabled ? 'ligado' : 'desligado'}
                                </p>
                                <p className="mt-0.5 text-xs leading-relaxed opacity-75">
                                    {autoAdjustEnabled
                                        ? 'Ao alterar um percentual, outro campo do grupo é recalculado para completar 100%.'
                                        : 'Os campos são independentes. Ajuste manualmente os totais para conseguir salvar.'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={autoAdjustEnabled}
                            disabled={saving}
                            onClick={() => {
                                setAutoAdjustEnabled(enabled => !enabled);
                                setAutoCompleted({ group: null, index: null });
                            }}
                            className={`relative h-7 w-12 flex-none rounded-full transition-colors focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 ${
                                autoAdjustEnabled ? 'bg-[#1E3A5F]' : 'bg-slate-400'
                            }`}
                            title={autoAdjustEnabled ? 'Desligar autoajuste' : 'Ligar autoajuste'}
                        >
                            <span className={`absolute left-0 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                                autoAdjustEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                            <span className="sr-only">Alternar autoajuste</span>
                        </button>
                    </div>

                    {(error || notice) && (
                        <div className={`mb-5 px-4 py-3 rounded-lg border text-sm ${
                            error
                                ? 'bg-red-50 border-red-200 text-red-700'
                                : 'bg-green-50 border-green-200 text-green-700'
                        }`}>
                            {error || notice}
                        </div>
                    )}

                    <div className="bg-white rounded-2xl border border-slate-300 shadow-lg shadow-slate-300/40 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-300 flex flex-wrap gap-3 items-center justify-between bg-gradient-to-r from-white to-slate-100">
                            <div>
                                <h2 className="font-semibold text-gray-800">Calendário de distribuição</h2>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    % da data = percentual da semana × percentual do dia
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={applyWeeklyPreset}
                                    disabled={loading || saving}
                                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-[#1E3A5F] disabled:opacity-50"
                                >
                                    Semanas iguais
                                </button>
                                <button
                                    type="button"
                                    onClick={applyBusinessDaysPreset}
                                    disabled={loading || saving}
                                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-[#1E3A5F] disabled:opacity-50"
                                >
                                    20% nos dias úteis
                                </button>
                                {formatUpdatedAt(updatedAt) && (
                                    <p className="w-full text-right text-[11px] text-gray-400">
                                        Atualizado em {formatUpdatedAt(updatedAt)}
                                    </p>
                                )}
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center gap-3 py-20 text-sm text-gray-400">
                                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Carregando configuração...
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[840px] border-separate border-spacing-0">
                                    <thead>
                                        <tr className="bg-[#1E3A5F] text-white">
                                            <th className="w-32 border-b border-blue-950 px-3 py-3 text-left align-top">
                                                <span className="block text-[11px] font-bold uppercase tracking-wider">Semana</span>
                                                <span className="mt-0.5 block text-[9px] font-normal normal-case text-blue-200">% da meta mensal</span>
                                            </th>
                                            {WEEK_DAYS.map((day, index) => (
                                                <th
                                                    key={day.short}
                                                    className={`border-b border-l border-blue-900 px-2 py-3 text-center align-top ${index >= 5 ? 'bg-[#294f79]' : ''}`}
                                                >
                                                    <span className="block text-[11px] font-bold uppercase tracking-wider">
                                                        {day.short}
                                                    </span>
                                                    <span className="mb-1.5 mt-0.5 block text-[9px] font-normal text-blue-200">da meta semanal</span>
                                                    <PercentageInput
                                                        compact
                                                        disabled={saving}
                                                        label={`Percentual de ${day.full}`}
                                                        value={daily[index] ?? ''}
                                                        autoFilled={autoCompleted.group === 'daily' && autoCompleted.index === index}
                                                        onChange={event => updateValue('daily', index, event.target.value)}
                                                    />
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {weeks.map((days, weekIndex) => (
                                            <tr key={weekIndex} className="group">
                                                <th className="border-b border-slate-300 bg-slate-100 px-3 py-3 text-left align-top group-hover:bg-blue-100/70">
                                                    <span className="mb-0.5 block text-xs font-bold text-[#1E3A5F]">
                                                        Semana {weekIndex + 1}
                                                    </span>
                                                    <span className="mb-2 block text-[10px] font-normal text-slate-400">da meta mensal</span>
                                                    <PercentageInput
                                                        compact
                                                        disabled={saving}
                                                        label={`Percentual da semana ${weekIndex + 1}`}
                                                        value={weekly[weekIndex] ?? ''}
                                                        autoFilled={autoCompleted.group === 'weekly' && autoCompleted.index === weekIndex}
                                                        onChange={event => updateValue('weekly', weekIndex, event.target.value)}
                                                    />
                                                </th>
                                                {days.map((day, dayIndex) => {
                                                    const datePercentage = day == null
                                                        ? 0
                                                        : ((weeklyParsed?.[weekIndex] || 0) * (dailyParsed?.[dayIndex] || 0)) / 100;

                                                    return (
                                                        <td
                                                            key={dayIndex}
                                                            className={`h-24 border-b border-l border-slate-300 p-2 align-top transition-colors ${day == null ? 'bg-slate-100/80' : 'bg-white group-hover:bg-blue-50'}`}
                                                        >
                                                            {day != null && (
                                                                <div className="h-full flex flex-col justify-between">
                                                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-700">
                                                                        {day}
                                                                    </span>
                                                                    <div>
                                                                        <p className="inline-flex rounded-md bg-[#E7EFF8] px-1.5 py-0.5 text-sm font-bold text-[#17324f] ring-1 ring-blue-200">
                                                                            {datePercentage.toFixed(2)}%
                                                                        </p>
                                                                        <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">meta mensal</p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="mt-5 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
                        <p className="text-xs text-gray-400 max-w-2xl">
                            Dias fora do mês não recebem meta. A cobertura pode ficar abaixo de 100%
                            quando a primeira ou a última semana é parcial.
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => loadConfiguration()}
                                disabled={loading || saving}
                                className="px-4 py-2 bg-white border border-gray-200 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                                Recarregar
                            </button>
                            <button
                                type="submit"
                                disabled={!formIsValid || loading || saving}
                                className="px-5 py-2 bg-[#F59E0B] hover:bg-amber-400 text-[#1E3A5F] text-sm font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Salvando...' : 'Salvar configuração'}
                            </button>
                        </div>
                    </div>
                </form>
            </main>
        </div>
    );
}
