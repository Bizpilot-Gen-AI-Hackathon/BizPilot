
const FRANKFURTER_API = "https://api.frankfurter.dev/v1";
const CACHE_KEY = "bizpilot-exchange-rates";
const CACHE_MAX_AGE = 6 * 60 * 60 * 1000;

export const DEFAULT_CURRENCY = "KES";

export const SUPPORTED_CURRENCIES = [
    { code: "KES", name: "Kenyan Shilling", symbol: "KSh", locale: "en-KE" },
    { code: "USD", name: "US Dollar", symbol: "$", locale: "en-US" },
    { code: "EUR", name: "Euro", symbol: "€", locale: "de-DE" },
    { code: "GBP", name: "British Pound", symbol: "£", locale: "en-GB" },
    { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh", locale: "sw-TZ" },
    { code: "UGX", name: "Ugandan Shilling", symbol: "USh", locale: "en-UG" },
    { code: "RWF", name: "Rwandan Franc", symbol: "FRw", locale: "rw-RW" },
    { code: "NGN", name: "Nigerian Naira", symbol: "₦", locale: "en-NG" },
    { code: "ZAR", name: "South African Rand", symbol: "R", locale: "en-ZA" },
    { code: "GHS", name: "Ghanaian Cedi", symbol: "GH₵", locale: "en-GH" },
    { code: "EGP", name: "Egyptian Pound", symbol: "E£", locale: "en-EG" },
    { code: "INR", name: "Indian Rupee", symbol: "₹", locale: "en-IN" },
    { code: "CNY", name: "Chinese Yuan", symbol: "CN¥", locale: "zh-CN" },
    { code: "JPY", name: "Japanese Yen", symbol: "¥", locale: "ja-JP" },
    { code: "AUD", name: "Australian Dollar", symbol: "A$", locale: "en-AU" },
    { code: "CAD", name: "Canadian Dollar", symbol: "CA$", locale: "en-CA" },
    { code: "CHF", name: "Swiss Franc", symbol: "CHF", locale: "de-CH" },
    { code: "AED", name: "UAE Dirham", symbol: "AED", locale: "en-AE" },
    { code: "SAR", name: "Saudi Riyal", symbol: "SAR", locale: "en-SA" },
    { code: "BRL", name: "Brazilian Real", symbol: "R$", locale: "pt-BR" },
    { code: "SGD", name: "Singapore Dollar", symbol: "S$", locale: "en-SG" },
    { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", locale: "en-NZ" },
    { code: "MXN", name: "Mexican Peso", symbol: "MX$", locale: "es-MX" },
    { code: "SEK", name: "Swedish Krona", symbol: "kr", locale: "sv-SE" },
    { code: "NOK", name: "Norwegian Krone", symbol: "kr", locale: "nb-NO" },
    { code: "DKK", name: "Danish Krone", symbol: "kr", locale: "da-DK" },
    { code: "PLN", name: "Polish Zloty", symbol: "zł", locale: "pl-PL" },
    { code: "THB", name: "Thai Baht", symbol: "฿", locale: "th-TH" },
    { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", locale: "id-ID" },
    { code: "PHP", name: "Philippine Peso", symbol: "₱", locale: "en-PH" },
    { code: "PKR", name: "Pakistani Rupee", symbol: "₨", locale: "en-PK" },
    { code: "TRY", name: "Turkish Lira", symbol: "₺", locale: "tr-TR" },
    { code: "ILS", name: "Israeli New Shekel", symbol: "₪", locale: "he-IL" },
    { code: "KRW", name: "South Korean Won", symbol: "₩", locale: "ko-KR" },
    { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", locale: "en-HK" },
    { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", locale: "ms-MY" },
    { code: "VND", name: "Vietnamese Dong", symbol: "₫", locale: "vi-VN" },
    { code: "XOF", name: "West African CFA Franc", symbol: "CFA", locale: "fr-SN" },
    { code: "XAF", name: "Central African CFA Franc", symbol: "FCFA", locale: "fr-CM" },
];

const CURRENCY_CODES = new Set(
    SUPPORTED_CURRENCIES.map((currency) => currency.code)
);

const CURRENCY_DETAILS = Object.fromEntries(
    SUPPORTED_CURRENCIES.map((currency) => [currency.code, currency])
);

function isValidAmount(amount) {
    return (
        typeof amount === "number" &&
        Number.isFinite(amount)
    );
}

function normalizeCurrency(code) {
    const normalized = String(code || DEFAULT_CURRENCY)
        .trim()
        .toUpperCase();

    return CURRENCY_CODES.has(normalized) ? normalized : DEFAULT_CURRENCY;
}

function readCache() {
    if (typeof window === "undefined") return null;

    try {
        const raw = window.localStorage.getItem(CACHE_KEY);
        if (!raw) return null;

        const cache = JSON.parse(raw);

        if (
            !cache ||
            typeof cache !== "object" ||
            !cache.rates ||
            typeof cache.rates !== "object" ||
            !cache.base ||
            !cache.updatedAt
        ) {
            return null;
        }

        return cache;
    } catch {
        return null;
    }
}

function writeCache(data) {
    if (typeof window === "undefined") return;

    try {
        window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
        // Currency conversion still works for the current session.
    }
}

export function getCurrencyDetails(code) {
    const normalized = normalizeCurrency(code);
    return CURRENCY_DETAILS[normalized];
}

export function getCurrencySymbol(code) {
    return getCurrencyDetails(code).symbol;
}

export function isSupportedCurrency(code) {
    return CURRENCY_CODES.has(String(code || "").trim().toUpperCase());
}

/**
 * Formats an amount in the requested currency.
 * Formatting does not convert the underlying amount.
 */
export function formatCurrency(
    amount,
    currency = DEFAULT_CURRENCY,
    options = {}
) {
    if (!isValidAmount(amount)) return "—";

    const code = normalizeCurrency(currency);
    const details = getCurrencyDetails(code);

    const {
        locale = details.locale,
        compact = false,
        minimumFractionDigits,
        maximumFractionDigits,
        currencyDisplay = "symbol",
    } = options;

    const fractionDigits =
        code === "JPY" ||
            code === "KRW" ||
            code === "VND" ? 0 : 2;

    try {
        return new Intl.NumberFormat(locale, {
            style: "currency",
            currency: code,
            currencyDisplay,
            notation: compact ? "compact" : "standard",
            minimumFractionDigits:
                minimumFractionDigits ?? fractionDigits,
            maximumFractionDigits:
                maximumFractionDigits ?? fractionDigits,
        }).format(amount);
    } catch {
        return `${details.symbol} ${amount.toLocaleString()}`;
    }
}

/**
 * Retrieves reference exchange rates from Frankfurter.
 * The API publishes reference rates rather than live trading quotes.
 *
 * Returned rates are expressed as:
 * 1 unit of `base` = `rates[quote]` units of the quote currency.
 */
export async function fetchExchangeRates(
    baseCurrency = DEFAULT_CURRENCY,
    options = {}
) {
    const base = normalizeCurrency(baseCurrency);
    const { forceRefresh = false, signal } = options;

    const cached = readCache();

    if (
        !forceRefresh &&
        cached &&
        cached.base === base &&
        Date.now() - cached.updatedAt < CACHE_MAX_AGE &&
        cached.rates[base] === 1
    ) {
        return {
            ...cached,
            source: "cache",
            stale: false,
        };
    }

    const url = new URL(`${FRANKFURTER_API}/latest`);
    url.searchParams.set("base", base);

    try {
        const response = await fetch(url.toString(), {
            method: "GET",
            headers: { Accept: "application/json" },
            signal,
        });

        if (!response.ok) {
            throw new Error(
                `Exchange-rate request failed (${response.status}).`
            );
        }

        const payload = await response.json();

        if (
            !payload ||
            !payload.rates ||
            typeof payload.rates !== "object" ||
            !payload.date
        ) {
            throw new Error("The exchange-rate response was invalid.");
        }

        const rates = {
            ...payload.rates,
            [base]: 1,
        };

        const data = {
            base,
            date: payload.date,
            rates,
            updatedAt: Date.now(),
            source: "Frankfurter",
        };

        writeCache(data);

        return {
            ...data,
            stale: false,
        };
    } catch (error) {
        if (error?.name === "AbortError") throw error;

        // A previous cached rate is preferable to inventing a new one.
        if (cached?.rates && cached.rates[base] === 1) {
            return {
                ...cached,
                source: "cache",
                stale: true,
                error: error.message,
            };
        }

        throw error;
    }
}

/**
 * Converts between currencies using the rates object returned by
 * fetchExchangeRates(). All rates must share the same base currency.
 *
 * Example:
 * convertCurrency(1000, "KES", "USD", rates)
 */
export function convertCurrency(
    amount,
    fromCurrency,
    toCurrency,
    rates
) {
    if (!isValidAmount(amount)) return null;

    const from = normalizeCurrency(fromCurrency);
    const to = normalizeCurrency(toCurrency);

    if (from === to) return amount;

    if (
        !rates ||
        typeof rates !== "object" ||
        !rates.rates ||
        typeof rates.rates !== "object"
    ) {
        return null;
    }

    const base = normalizeCurrency(rates.base);
    const rateTable = rates.rates;

    // Convert source amount to the common base, then to target.
    const fromRate = rateTable[from];
    const toRate = rateTable[to];
    const baseRate = rateTable[base];

    if (
        !Number.isFinite(fromRate) ||
        fromRate <= 0 ||
        !Number.isFinite(toRate) ||
        toRate <= 0 ||
        baseRate !== 1
    ) {
        return null;
    }

    const amountInBase = amount / fromRate;
    const converted = amountInBase * toRate;

    return Number.isFinite(converted) ? converted : null;
}

/**
 * Convenience helper: convert and format an amount in one call.
 * Returns null if the required exchange rates are unavailable.
 */
export function convertAndFormatCurrency(
    amount,
    fromCurrency,
    toCurrency,
    rates,
    options = {}
) {
    const converted = convertCurrency(
        amount,
        fromCurrency,
        toCurrency,
        rates
    );

    if (converted === null) return null;

    return formatCurrency(converted, toCurrency, options);
}

/**
 * Returns the date the exchange-rate provider published the rates,
 * or null when no rates are available.
 */
export function getExchangeRateDate(rates) {
    return rates?.date || null;
}

/**
 * Returns when rates were downloaded by this app.
 */
export function getExchangeRateUpdatedAt(rates) {
    return Number.isFinite(rates?.updatedAt) ? rates.updatedAt : null;
}

/**
 * True when the returned rates were loaded from cache after a failed
 * refresh. They may be older than the normal cache lifetime.
 */
export function areExchangeRatesStale(rates) {
    return rates?.stale === true;
}

export function getSupportedCurrencies() {
    return SUPPORTED_CURRENCIES.map((currency) => ({ ...currency }));
}
