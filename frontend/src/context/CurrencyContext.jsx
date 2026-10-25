
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    DEFAULT_CURRENCY,
    SUPPORTED_CURRENCIES,
    fetchExchangeRates,
    formatCurrency,
    convertCurrency,
    getCurrencyDetails,
} from "../utils/currency";

const CurrencyContext = createContext(null);
const SETTINGS_KEY = "bizpilot-settings";
const PREFERENCES_KEY = "bizpilot-preferences";

function normalizeCurrency(value) {
    const code = String(value || DEFAULT_CURRENCY).toUpperCase();

    return SUPPORTED_CURRENCIES.some((currency) => currency.code === code)
        ? code
        : DEFAULT_CURRENCY;
}

function readSavedCurrency(fallback) {
    if (typeof window === "undefined") return fallback;

    try {
        const settings = JSON.parse(
            window.localStorage.getItem(SETTINGS_KEY) || "{}"
        );
        const preferences = JSON.parse(
            window.localStorage.getItem(PREFERENCES_KEY) || "{}"
        );

        return normalizeCurrency(
            settings.currency || preferences.currency || fallback
        );
    } catch {
        return normalizeCurrency(fallback);
    }
}

export function CurrencyProvider({
    children,
    initialCurrency = DEFAULT_CURRENCY,
    onCurrencyChange,
}) {
    const [currency, setCurrencyState] = useState(() =>
        readSavedCurrency(initialCurrency)
    );
    const [exchangeRates, setExchangeRates] = useState(null);
    const [ratesLoading, setRatesLoading] = useState(false);
    const [ratesError, setRatesError] = useState("");
    const [lastRefresh, setLastRefresh] = useState(null);

    useEffect(() => {
        const nextCurrency = SUPPORTED_CURRENCIES.some(
            (item) => item.code === initialCurrency
        )
            ? initialCurrency
            : DEFAULT_CURRENCY;

        setCurrencyState((current) =>
            current === nextCurrency ? current : nextCurrency
        );
    }, [initialCurrency]);

    const setCurrency = useCallback(
        (nextCurrency) => {
            const next = normalizeCurrency(nextCurrency);

            setCurrencyState(next);

            try {
                const settings = JSON.parse(
                    window.localStorage.getItem(SETTINGS_KEY) || "{}"
                );
                const preferences = JSON.parse(
                    window.localStorage.getItem(PREFERENCES_KEY) || "{}"
                );

                const nextSettings = { ...settings, currency: next };
                const nextPreferences = { ...preferences, currency: next };

                window.localStorage.setItem(
                    SETTINGS_KEY,
                    JSON.stringify(nextSettings)
                );
                window.localStorage.setItem(
                    PREFERENCES_KEY,
                    JSON.stringify(nextPreferences)
                );
            } catch {
                // The selected currency remains active for this session.
            }

            onCurrencyChange?.(next);
        },
        [onCurrencyChange]
    );

    const refreshRates = useCallback(
        async ({ forceRefresh = false, signal } = {}) => {
            setRatesLoading(true);
            setRatesError("");

            try {
                const result = await fetchExchangeRates(currency, {
                    forceRefresh,
                    signal,
                });

                setExchangeRates(result);
                setLastRefresh(result.updatedAt || Date.now());

                if (result.stale) {
                    setRatesError(
                        "Using previously cached exchange rates. Refresh when online."
                    );
                }

                return result;
            } catch (error) {
                if (error?.name !== "AbortError") {
                    setRatesError(
                        "Exchange rates are unavailable. Amounts in another currency cannot be converted yet."
                    );
                }

                return null;
            } finally {
                setRatesLoading(false);
            }
        },
        [currency]
    );

    useEffect(() => {
        const controller = new AbortController();

        refreshRates({ signal: controller.signal });

        return () => controller.abort();
    }, [refreshRates]);

    const format = useCallback(
        (amount, options = {}) => formatCurrency(amount, currency, options),
        [currency]
    );

    const convert = useCallback(
        (amount, fromCurrency, toCurrency = currency) =>
            convertCurrency(amount, fromCurrency, toCurrency, exchangeRates),
        [currency, exchangeRates]
    );

    const formatConverted = useCallback(
        (amount, fromCurrency, options = {}) => {
            const converted = convert(amount, fromCurrency, currency);

            return converted === null
                ? "—"
                : formatCurrency(converted, currency, options);
        },
        [convert, currency]
    );

    const value = useMemo(
        () => ({
            currency,
            currencyDetails: getCurrencyDetails(currency),
            supportedCurrencies: SUPPORTED_CURRENCIES,
            exchangeRates,
            ratesLoading,
            ratesError,
            lastRefresh,
            setCurrency,
            refreshRates,
            format,
            convert,
            formatConverted,
        }),
        [
            currency,
            exchangeRates,
            ratesLoading,
            ratesError,
            lastRefresh,
            setCurrency,
            refreshRates,
            format,
            convert,
            formatConverted,
        ]
    );

    return (
        <CurrencyContext.Provider value={value}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrencyContext() {
    const context = useContext(CurrencyContext);

    if (!context) {
        throw new Error(
            "useCurrencyContext must be used inside CurrencyProvider."
        );
    }

    return context;
}
