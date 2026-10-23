import { useState, useEffect, useCallback, useRef } from 'react';
import { getMetasDinamicasPeriodo, getVendas } from '../utils/api';

const REFRESH_INTERVAL = 30_000; // 30 segundos

/**
 * Hook que busca os dados de vendas, atualiza automaticamente
 * a cada 30 segundos e expõe um método de refresh manual.
 *
 * @param {string} datai  - Data inicial no formato YYYY-MM-DD
 * @param {string} dataf  - Data final no formato YYYY-MM-DD
 */
export function useDashboard(datai, dataf) {
    const [data, setData]           = useState([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);
    const [apiStatus, setApiStatus] = useState(null); // 401 | 403 | null
    const [lastUpdate, setLastUpdate] = useState(null);
    const metasCache = useRef({ key: null, value: null });

    const fetchData = useCallback(async (signal, forceGoals = false) => {
        setLoading(true);
        setError(null);

        try {
            const goalsKey = `${datai}:${dataf}`;
            const goalsPromise = !forceGoals && metasCache.current.key === goalsKey
                ? Promise.resolve(metasCache.current.value)
                : getMetasDinamicasPeriodo(datai, dataf, signal);
            const [result, metasPorVendedor] = await Promise.all([
                getVendas(datai, dataf, signal),
                goalsPromise,
            ]);
            metasCache.current = { key: goalsKey, value: metasPorVendedor };
            const dataComMetasDinamicas = result.map(item => ({
                ...item,
                META: metasPorVendedor.get(Number(item.CODUSUR)) || 0,
            }));

            setData(dataComMetasDinamicas);
            setApiStatus(null);
            setLastUpdate(new Date());
        } catch (err) {
            if (err.name === 'AbortError') return;

            if (err.status === 401) {
                setApiStatus(401);
            } else if (err.status === 403) {
                setApiStatus(403);
            } else {
                setError(err.message || 'Erro ao carregar dados');
            }
        } finally {
            setLoading(false);
        }
    }, [datai, dataf]);

    // Fetch inicial + intervalo de 30s; cancela ao desmontar ou mudar datas
    useEffect(() => {
        const controller = new AbortController();

        fetchData(controller.signal);

        const interval = setInterval(
            () => fetchData(controller.signal),
            REFRESH_INTERVAL
        );

        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, [fetchData]);

    // Refresh manual (sem signal — componente deve estar montado)
    const refresh = useCallback(() => fetchData(undefined, true), [fetchData]);

    return { data, loading, error, apiStatus, lastUpdate, refresh };
}
