/**
 * ══════════════════════════════════════════════════════════════
 * SANDIGAN — Global SWR Fetcher
 *
 * A shared axios-based fetcher for SWR hooks.
 * Automatically attaches auth headers and credentials.
 *
 * Usage:
 *   import useSWR from 'swr';
 *   import { swrFetcher, SWR_CONFIG } from '../../../api/swrFetcher';
 *
 *   const { data, isLoading } = useSWR('/api/employees', swrFetcher, SWR_CONFIG);
 * ══════════════════════════════════════════════════════════════
 */

import axios from 'axios';
import { API_BASE, authHeaders } from './config';

/**
 * The core fetcher function passed to useSWR.
 * Prepends API_BASE to relative paths automatically.
 * @param {string} url - relative path e.g. '/employees' or '/finance/summary?period=month'
 */
export const swrFetcher = (url) =>
    axios
        .get(`${API_BASE}${url}`, { headers: authHeaders(), withCredentials: true })
        .then((res) => res.data);

/**
 * Default SWR config for admin ERP dashboard.
 *
 * revalidateOnFocus: false
 *   → Prevents re-fetching when the admin switches browser tabs or
 *     clicks back to the ERP window. Eliminates skeleton flash on tab switch.
 *
 * dedupingInterval: 300_000 (5 minutes)
 *   → If the same key is requested multiple times within 5 minutes,
 *     SWR only makes ONE network call and shares the cached result.
 *
 * revalidateOnReconnect: true
 *   → Re-fetches automatically when internet reconnects (safe behavior).
 *
 * shouldRetryOnError: false
 *   → Don't retry failed requests automatically (we handle errors manually).
 */
export const SWR_CONFIG = {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60 * 1000, // 5 minutes
    revalidateOnReconnect: true,
    shouldRetryOnError: false,
};

/**
 * A stricter config for data that truly should NEVER auto-refresh
 * (pricing, holidays, categories, settings).
 * User manually refreshes by invalidating the backend cache via mutations.
 */
export const SWR_CONFIG_STATIC = {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60 * 60 * 1000, // 1 hour
    shouldRetryOnError: false,
};
