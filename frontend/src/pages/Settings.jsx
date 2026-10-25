
import React, { useEffect, useState } from "react";
import {
    Bell,
    Building2,
    Check,
    CheckCircle2,
    ChevronRight,
    Globe,
    ImagePlus,
    LogOut,
    RotateCcw,
    Save,
    Settings as SettingsIcon,
    ShieldCheck,
    Trash2,
    UserRound,
    Wallet,
    AlertTriangle,
    Languages,
    Power,
    CircleDollarSign,
} from "lucide-react";
import useCurrency from "../hooks/useCurrency";

const STORAGE_KEY = "bizpilot-settings";
const LANGUAGE_KEY = "bizpilot-language";
const PREFERENCES_KEY = "bizpilot-preferences";

const defaultSettings = {
    businessName: "My Business",
    ownerName: "",
    email: "",
    currency: "KES",
    language: "en",
    emailNotifications: true,
    businessAlerts: true,
    weeklySummary: false,
};

const LANGUAGES = [
    ["en", "English"], ["sw", "Swahili"], ["fr", "French"],
    ["es", "Spanish"], ["pt", "Portuguese"], ["de", "German"],
    ["it", "Italian"], ["nl", "Dutch"], ["pl", "Polish"],
    ["ru", "Russian"], ["uk", "Ukrainian"], ["ar", "Arabic"],
    ["zh", "Chinese (Simplified)"], ["zh-TW", "Chinese (Traditional)"],
    ["ja", "Japanese"], ["ko", "Korean"], ["hi", "Hindi"],
    ["bn", "Bengali"], ["ur", "Urdu"], ["tr", "Turkish"],
    ["id", "Indonesian"], ["ms", "Malay"], ["vi", "Vietnamese"],
    ["th", "Thai"], ["fil", "Filipino"], ["ha", "Hausa"],
    ["yo", "Yoruba"], ["am", "Amharic"], ["rw", "Kinyarwanda"],
    ["so", "Somali"], ["zu", "Zulu"], ["af", "Afrikaans"],
    ["sv", "Swedish"], ["no", "Norwegian"], ["da", "Danish"],
    ["fi", "Finnish"], ["el", "Greek"], ["he", "Hebrew"],
    ["fa", "Persian"], ["cs", "Czech"], ["ro", "Romanian"],
    ["hu", "Hungarian"], ["ta", "Tamil"], ["te", "Telugu"],
    ["mr", "Marathi"], ["ne", "Nepali"], ["km", "Khmer"],
    ["my", "Burmese"], ["si", "Sinhala"],
];

const CURRENCIES = [
    ["KES", "Kenyan Shilling", "en-KE"],
    ["USD", "US Dollar", "en-US"],
    ["EUR", "Euro", "de-DE"],
    ["GBP", "British Pound", "en-GB"],
    ["NGN", "Nigerian Naira", "en-NG"],
    ["ZAR", "South African Rand", "en-ZA"],
    ["UGX", "Ugandan Shilling", "en-UG"],
    ["TZS", "Tanzanian Shilling", "sw-TZ"],
    ["RWF", "Rwandan Franc", "rw-RW"],
    ["GHS", "Ghanaian Cedi", "en-GH"],
    ["EGP", "Egyptian Pound", "ar-EG"],
    ["XOF", "West African CFA Franc", "fr-SN"],
    ["XAF", "Central African CFA Franc", "fr-CM"],
    ["INR", "Indian Rupee", "en-IN"],
    ["PKR", "Pakistani Rupee", "ur-PK"],
    ["CNY", "Chinese Yuan", "zh-CN"],
    ["JPY", "Japanese Yen", "ja-JP"],
    ["KRW", "South Korean Won", "ko-KR"],
    ["SGD", "Singapore Dollar", "en-SG"],
    ["HKD", "Hong Kong Dollar", "zh-HK"],
    ["MYR", "Malaysian Ringgit", "ms-MY"],
    ["IDR", "Indonesian Rupiah", "id-ID"],
    ["PHP", "Philippine Peso", "en-PH"],
    ["THB", "Thai Baht", "th-TH"],
    ["VND", "Vietnamese Dong", "vi-VN"],
    ["AUD", "Australian Dollar", "en-AU"],
    ["NZD", "New Zealand Dollar", "en-NZ"],
    ["CAD", "Canadian Dollar", "en-CA"],
    ["MXN", "Mexican Peso", "es-MX"],
    ["BRL", "Brazilian Real", "pt-BR"],
    ["CHF", "Swiss Franc", "de-CH"],
    ["SEK", "Swedish Krona", "sv-SE"],
    ["NOK", "Norwegian Krone", "nb-NO"],
    ["DKK", "Danish Krone", "da-DK"],
    ["PLN", "Polish Zloty", "pl-PL"],
    ["TRY", "Turkish Lira", "tr-TR"],
    ["ILS", "Israeli New Shekel", "he-IL"],
    ["SAR", "Saudi Riyal", "ar-SA"],
    ["AED", "UAE Dirham", "ar-AE"],
];

const css = `
.st-root{--st-green:#0e9c6b;--st-dark:#173d30;--st-muted:#78867d;--st-border:#e5ece6;max-width:1100px;width:100%;margin:0 auto;padding:30px;color:var(--app-text,#25382c);font-family:inherit}
.st-root *{box-sizing:border-box}
.st-header{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:28px}
.st-header h1{margin:0;color:var(--app-text,var(--st-dark));font-size:clamp(29px,4vw,38px);letter-spacing:-1.2px}
.st-header-copy>p{margin:9px 0 0;color:var(--app-muted,var(--st-muted));font-size:13px;line-height:1.7}
.st-eyebrow{display:flex;align-items:center;gap:7px;margin-bottom:12px;color:var(--st-green);font-size:10px;font-weight:800;letter-spacing:1.3px}
.st-reset,.st-save,.st-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:42px;padding:0 14px;border:1px solid var(--app-border,var(--st-border));border-radius:11px;font:inherit;font-size:12px;font-weight:750;cursor:pointer}
.st-reset{background:var(--app-surface,#fff);color:var(--app-text,#536459)}
.st-banner{display:flex;align-items:center;gap:14px;margin-bottom:20px;padding:18px;border:1px solid #d5eade;border-radius:15px;background:#eff9f1}
.st-banner-icon,.st-section-icon,.st-storage-icon{display:grid;flex-shrink:0;place-items:center}
.st-banner-icon{width:42px;height:42px;border-radius:12px;background:#d8f1e1;color:#128154}
.st-banner-copy{flex:1;min-width:0}
.st-banner-copy strong{display:block;margin-bottom:4px;color:#244b35;font-size:12px}
.st-banner-copy p{margin:0;color:#748579;font-size:11px;line-height:1.7}
.st-local-tag{display:flex;align-items:center;gap:7px;padding:7px 9px;border:1px solid #d6e9db;border-radius:20px;background:#fff;color:#39744e;font-size:10px;font-weight:750}
.st-local-dot{width:6px;height:6px;border-radius:50%;background:#20a568}
.st-form{display:grid;gap:18px}
.st-card{min-width:0;padding:24px;border:1px solid var(--app-border,var(--st-border));border-radius:17px;background:var(--app-surface,#fff)}
.st-section-heading{display:flex;align-items:center;gap:12px;margin-bottom:22px}
.st-section-icon{width:42px;height:42px;border:1px solid #dcefe1;border-radius:12px;background:#eff8f1;color:var(--st-green)}
.st-section-heading h2{margin:0;color:var(--app-text,#263c2e);font-size:15px;font-weight:800}
.st-section-heading p{margin:5px 0 0;color:var(--app-muted,#849087);font-size:11px;line-height:1.6}
.st-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
.st-field{display:flex;flex-direction:column;gap:8px;min-width:0}
.st-field-full{grid-column:1/-1}
.st-field>span{display:flex;align-items:center;gap:5px;color:var(--app-text,#526358);font-size:11px;font-weight:750}
.st-field input,.st-field select{width:100%;min-height:45px;padding:0 12px;border:1px solid var(--app-border,#e1e9e2);border-radius:10px;outline:none;background:var(--app-surface,#fbfcfb);color:var(--app-text,#294033);font:inherit;font-size:12px}
.st-field input:focus,.st-field select:focus{border-color:#65bc8d;box-shadow:0 0 0 3px #0e9c6b18}
.st-note{display:flex;align-items:flex-start;gap:8px;margin:17px 0 0;padding:12px;border-radius:10px;background:var(--app-bg,#f7f9f7);color:var(--app-muted,#849087);font-size:10px;line-height:1.8}
.st-note svg{flex-shrink:0;margin-top:2px}
.st-profile-editor{display:flex;align-items:center;gap:20px}
.st-profile-preview{display:grid;flex-shrink:0;width:82px;height:82px;overflow:hidden;place-items:center;border:3px solid #e0f2e5;border-radius:50%;background:#e8f6ec;color:#13784f;font-size:23px;font-weight:800}
.st-profile-preview img{width:100%;height:100%;object-fit:cover}
.st-profile-actions{min-width:0}
.st-profile-actions strong{color:var(--app-text,#344b3b);font-size:13px}
.st-profile-actions>p{margin:6px 0 12px;color:var(--app-muted,#849087);font-size:11px;line-height:1.7}
.st-profile-buttons{display:flex;flex-wrap:wrap;gap:8px}
.st-photo-button{position:relative;display:inline-flex;align-items:center;gap:7px;padding:11px 13px;border-radius:10px;background:#0e9c6b;color:#fff;font-size:11px;font-weight:750;cursor:pointer}
.st-photo-button input{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
.st-remove-photo{background:transparent;color:#b54747}
.st-photo-error{color:#b54747;font-size:11px}
.st-toggle-list{display:grid}
.st-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 0;border-bottom:1px solid var(--app-border,#edf1ed)}
.st-toggle-row:first-child{padding-top:0}
.st-toggle-row:last-child{padding-bottom:0;border-bottom:0}
.st-toggle-copy{min-width:0}
.st-toggle-copy strong{display:block;color:var(--app-text,#344b3b);font-size:12px}
.st-toggle-copy p{margin:5px 0 0;color:var(--app-muted,#8a968d);font-size:11px;line-height:1.7}
.st-switch{display:flex;align-items:center;flex-shrink:0;width:44px;height:25px;padding:3px;border:0;border-radius:20px;background:#dce3dd;cursor:pointer}
.st-switch.is-on{background:#0e9c6b}
.st-switch-thumb{width:19px;height:19px;border-radius:50%;background:#fff;transition:transform .18s}
.st-switch.is-on .st-switch-thumb{transform:translateX(19px)}
.st-storage{display:flex;align-items:flex-start;gap:12px;padding:15px;border:1px solid var(--app-border,#e3ede5);border-radius:12px;background:var(--app-bg,#f8fbf8)}
.st-storage-icon{width:38px;height:38px;border-radius:10px;background:#e4f3e7;color:#278354}
.st-storage-copy{flex:1;min-width:0}
.st-storage-copy strong{color:var(--app-text,#355440);font-size:12px}
.st-storage-copy p{margin:6px 0 0;color:var(--app-muted,#7e8d82);font-size:11px;line-height:1.8}
.st-danger{border-color:#edcccc}
.st-danger .st-section-icon{background:#fff1f1;border-color:#f3dada;color:#b54747}
.st-danger-copy{margin:0 0 18px;color:var(--app-muted,#849087);font-size:12px;line-height:1.8}
.st-danger-actions{display:flex;flex-wrap:wrap;gap:10px}
.st-button{background:var(--app-surface,#fff);color:var(--app-text,#344b3b)}
.st-button.danger{border-color:#d95b5b;background:#b83e3e;color:white}
.st-button.logout{border-color:#d5eade;color:#13784f}
.st-footer{position:sticky;bottom:10px;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:4px;padding:14px;border:1px solid var(--app-border,#e1e9e2);border-radius:14px;background:var(--app-surface,#fff);box-shadow:0 7px 24px #19372412}
.st-status{display:flex;align-items:center;gap:8px;min-width:0;color:#238454;font-size:11px;line-height:1.6}
.st-status.is-error{color:#b54747}
.st-status.is-neutral{color:var(--app-muted,#859087)}
.st-save{border-color:#0e9c6b;background:#0e9c6b;color:#fff}
.st-save:disabled{opacity:.65;cursor:wait}
.st-reset:focus-visible,.st-save:focus-visible,.st-button:focus-visible,.st-switch:focus-visible,.st-photo-button:focus-within{outline:3px solid #0e9c6b50;outline-offset:3px}
.st-root button:disabled{opacity:.6;cursor:not-allowed}
@media(max-width:700px){.st-root{padding:20px}.st-card{padding:20px}.st-banner{flex-wrap:wrap}}
@media(max-width:480px){.st-root{padding:14px}.st-header{align-items:flex-start;gap:10px}.st-header h1{font-size:29px}.st-card{padding:16px}.st-fields{grid-template-columns:1fr;gap:15px}.st-field-full{grid-column:auto}.st-profile-editor{align-items:flex-start;gap:13px}.st-profile-preview{width:65px;height:65px;font-size:19px}.st-footer{align-items:stretch;flex-direction:column}.st-save{width:100%}.st-local-tag{margin-left:0}}
@media(prefers-reduced-motion:reduce){.st-root,.st-root *{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
`;

function safeRead(key, fallback = {}) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch {
        return fallback;
    }
}

function safeWrite(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

function readStoredSettings() {
    const stored = safeRead(STORAGE_KEY, {});
    const { theme, ...savedSettings } = stored || {};
    return { ...defaultSettings, ...savedSettings };
}

function getLanguageCode(preferences, storedLanguage, storedSettingsLanguage) {
    const candidate =
        preferences?.languageCode ||
        storedLanguage ||
        storedSettingsLanguage ||
        preferences?.language ||
        "en";

    const exact = LANGUAGES.find(([code]) => code === candidate);
    if (exact) return exact[0];

    const labelMatch = LANGUAGES.find(
        ([, label]) => label.toLowerCase() === String(candidate).toLowerCase()
    );

    return labelMatch?.[0] || "en";
}

function getInitialSettings(profile, preferences, currency) {
    const stored = readStoredSettings();
    const storedLanguage = safeRead(LANGUAGE_KEY, "");

    const initial = {
        ...defaultSettings,
        ...stored,
        ...(preferences || {}),
        currency,
    };

    initial.language = getLanguageCode(
        preferences,
        typeof storedLanguage === "string" ? storedLanguage : "",
        stored.language
    );

    initial.ownerName =
        profile?.name ?? preferences?.ownerName ?? stored.ownerName ?? "";

    initial.email =
        profile?.email ?? preferences?.email ?? stored.email ?? "";

    return initial;
}

function getInitials(name) {
    return (
        (name || "BP")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase() || "BP"
    );
}

export default function Settings({
    profile,
    preferences,
    onProfileChange,
    onPreferencesChange,
    onSettingsChange,
    onLanguageChange,
    onLogout,
    onDeactivateAccount,
    onDeleteAccount,
}) {
    const {
        currency,
        setCurrency,
        supportedCurrencies,
        exchangeRates,
        ratesLoading,
        ratesError,
        lastRefresh,
        refreshRates,
        format,
    } = useCurrency();

    const [settings, setSettings] = useState(
        () => getInitialSettings(profile, preferences, currency)
    );
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("neutral");
    const [photoError, setPhotoError] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setSettings((current) => {
            const next = {
                ...current,
                businessName:
                    preferences?.businessName ?? current.businessName,
                currency,
                language: getLanguageCode(
                    preferences,
                    preferences?.languageCode,
                    current.language
                ),
                emailNotifications:
                    preferences?.emailNotifications ??
                    current.emailNotifications,
                businessAlerts:
                    preferences?.businessAlerts ?? current.businessAlerts,
                weeklySummary:
                    preferences?.weeklySummary ?? current.weeklySummary,
                ownerName:
                    profile?.name ??
                    preferences?.ownerName ??
                    current.ownerName,
                email:
                    profile?.email ??
                    preferences?.email ??
                    current.email,
            };

            return Object.keys(next).every(
                (key) => next[key] === current[key]
            )
                ? current
                : next;
        });
    }, [
        currency,
        preferences?.businessName,
        preferences?.languageCode,
        preferences?.language,
        preferences?.emailNotifications,
        preferences?.businessAlerts,
        preferences?.weeklySummary,
        preferences?.ownerName,
        preferences?.email,
        profile?.name,
        profile?.email,
    ]);

    const currentName = profile?.name || settings.ownerName;
    const currentAvatar = profile?.avatar || "";

    const enabledNotifications = [
        settings.businessAlerts,
        settings.emailNotifications,
        settings.weeklySummary,
    ].filter(Boolean).length;

    const currencyOptions = supportedCurrencies
        .map((item) => {
            const localDetails = CURRENCIES.find(
                ([code]) => code === item.code
            );

            return {
                code: item.code,
                name: localDetails?.[1] || item.name || item.code,
            };
        })
        .sort((a, b) => a.code.localeCompare(b.code));

    // Ensure the currently selected currency remains available in the dropdown.
    if (
        currency &&
        !currencyOptions.some((item) => item.code === currency)
    ) {
        currencyOptions.unshift({
            code: currency,
            name: currency,
        });
    }

    function status(text, type = "neutral") {
        setMessage(text);
        setMessageType(type);
    }

    function persistPreferencePatch(patch) {
        const current = safeRead(PREFERENCES_KEY, {});
        const next = { ...current, ...(preferences || {}), ...patch };
        const saved = safeWrite(PREFERENCES_KEY, next);

        onPreferencesChange?.(patch);

        if (!saved) {
            status(
                "Preference updated for this session, but browser storage is unavailable.",
                "error"
            );
        }

        return saved;
    }

    function updateField(event) {
        const { name, value } = event.target;

        setSettings((current) => ({ ...current, [name]: value }));
        status("");

        if (name === "ownerName") {
            onProfileChange?.({ name: value });
        }

        if (name === "email") {
            onProfileChange?.({ email: value });
        }

        if (name === "businessName") {
            persistPreferencePatch({ businessName: value });
        }

        if (name === "currency") {
            // Updates the shared provider and persists the currency preference.
            setCurrency(value);
            persistPreferencePatch({ currency: value });
            status(`Currency changed to ${value}.`, "success");
        }

        if (name === "language") {
            const languageLabel =
                LANGUAGES.find(([code]) => code === value)?.[1] || value;

            try {
                localStorage.setItem(LANGUAGE_KEY, value);
            } catch {
                // The app-level language callback can still run.
            }

            persistPreferencePatch({
                language: languageLabel,
                languageCode: value,
            });

            onLanguageChange?.(value);
            document.documentElement.lang = value;

            window.dispatchEvent(
                new CustomEvent("bizpilot:language-change", {
                    detail: { language: value },
                })
            );

            status(`Language preference changed to ${languageLabel}.`);
        }
    }

    function updateToggle(name) {
        const value = !settings[name];

        setSettings((current) => ({ ...current, [name]: value }));
        persistPreferencePatch({ [name]: value });
        status("");
    }

    function handlePhotoChange(event) {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setPhotoError("Choose a valid image file.");
            return;
        }

        if (file.size > 1024 * 1024) {
            setPhotoError("Your image must be 1 MB or smaller.");
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            if (typeof reader.result !== "string") {
                setPhotoError("We couldn't read that image. Try another.");
                return;
            }

            onProfileChange?.({ avatar: reader.result });
            setPhotoError("");
            status("Profile picture updated.", "success");
        };

        reader.onerror = () => {
            setPhotoError("We couldn't read that image. Please try again.");
        };

        reader.readAsDataURL(file);
    }

    function removePhoto() {
        onProfileChange?.({ avatar: "" });
        setPhotoError("");
        status("Profile picture removed.", "success");
    }

    async function saveSettings(event) {
        event.preventDefault();
        if (busy) return;

        setBusy(true);

        const next = {
            ...settings,
            currency,
            businessName: settings.businessName.trim(),
            ownerName: settings.ownerName.trim(),
            email: settings.email.trim(),
        };

        const languageLabel =
            LANGUAGES.find(([code]) => code === next.language)?.[1] ||
            next.language;

        const preferencePatch = {
            businessName: next.businessName,
            ownerName: next.ownerName,
            email: next.email,
            currency,
            language: languageLabel,
            languageCode: next.language,
            emailNotifications: next.emailNotifications,
            businessAlerts: next.businessAlerts,
            weeklySummary: next.weeklySummary,
        };

        try {
            const storedPreferences = safeRead(PREFERENCES_KEY, {});

            const savedSettings = safeWrite(STORAGE_KEY, next);
            const savedPreferences = safeWrite(PREFERENCES_KEY, {
                ...storedPreferences,
                ...(preferences || {}),
                ...preferencePatch,
            });

            try {
                localStorage.setItem(LANGUAGE_KEY, next.language);
            } catch {
                // Continue with live preference callbacks.
            }

            // Keep the provider and the Settings form synchronized.
            setCurrency(currency);

            onProfileChange?.({
                name: next.ownerName,
                email: next.email,
            });

            onPreferencesChange?.(preferencePatch);
            await onSettingsChange?.(next);

            setSettings(next);

            if (!savedSettings || !savedPreferences) {
                status(
                    "Settings updated for this session, but some preferences could not be saved in browser storage.",
                    "error"
                );
            } else {
                status("Settings saved successfully.", "success");
            }
        } catch (error) {
            status(
                error?.message ||
                "Could not save settings. Please try again.",
                "error"
            );
        } finally {
            setBusy(false);
        }
    }

    function resetSettings() {
        const confirmed = window.confirm(
            "Reset your preferences to their defaults? This does not delete your account."
        );

        if (!confirmed) return;

        const next = {
            ...defaultSettings,
            ownerName: profile?.name || "",
            email: profile?.email || "",
        };

        // Reset the shared currency, not just the local dropdown.
        setCurrency("KES");
        setSettings(next);

        const patch = {
            businessName: next.businessName,
            ownerName: next.ownerName,
            email: next.email,
            currency: "KES",
            language: "English",
            languageCode: "en",
            emailNotifications: next.emailNotifications,
            businessAlerts: next.businessAlerts,
            weeklySummary: next.weeklySummary,
        };

        try {
            localStorage.setItem(LANGUAGE_KEY, "en");
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
            // Continue with the live reset.
        }

        persistPreferencePatch(patch);
        onLanguageChange?.("en");

        document.documentElement.lang = "en";

        window.dispatchEvent(
            new CustomEvent("bizpilot:language-change", {
                detail: { language: "en" },
            })
        );

        status("Default preferences restored.", "success");
    }

    async function runAccountAction(action, actionName) {
        if (typeof action !== "function") {
            status(
                `${actionName} is not connected yet. It requires an account handler from the app or authentication service.`,
                "error"
            );
            return;
        }

        if (busy) return;

        setBusy(true);

        try {
            await action();
            status(`${actionName} request completed.`, "success");
        } catch (error) {
            status(
                error?.message ||
                `${actionName} failed. Please try again.`,
                "error"
            );
        } finally {
            setBusy(false);
        }
    }

    function logout() {
        if (window.confirm("Log out of your account?")) {
            runAccountAction(onLogout, "Log out");
        }
    }

    function deactivate() {
        if (
            window.confirm(
                "Deactivate your account? You may lose access until it is reactivated. Continue?"
            )
        ) {
            runAccountAction(onDeactivateAccount, "Account deactivation");
        }
    }

    function deleteAccount() {
        const confirmation = window.prompt(
            "This action may permanently delete your account and data. Type DELETE to confirm."
        );

        if (confirmation === "DELETE") {
            runAccountAction(onDeleteAccount, "Account deletion");
        } else {
            status("Account deletion cancelled.");
        }
    }

    async function handleRefreshRates() {
        try {
            await refreshRates({ forceRefresh: true });
        } catch {
            // The currency provider manages the error state.
        }
    }

    return (
        <>
            <style>{css}</style>

            <main className="st-root">
                <header className="st-header">
                    <div className="st-header-copy">
                        <span className="st-eyebrow">
                            <SettingsIcon size={15} />
                            ACCOUNT PREFERENCES
                        </span>

                        <h1>Settings</h1>

                        <p>
                            Manage your profile, language, currency,
                            notifications, and account.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="st-reset"
                        onClick={resetSettings}
                        disabled={busy}
                    >
                        <RotateCcw size={15} />
                        Reset
                    </button>
                </header>

                <section className="st-banner">
                    <span className="st-banner-icon">
                        <CheckCircle2 size={22} />
                    </span>

                    <div className="st-banner-copy">
                        <strong>Your workspace, your preferences</strong>
                        <p>
                            Your currency selection is shared through BizPilot's
                            currency provider. Pages that use the shared currency
                            formatter can display amounts in your selected
                            currency. Historical transaction values remain
                            unchanged.
                        </p>
                    </div>

                    <span className="st-local-tag">
                        <span className="st-local-dot" />
                        {enabledNotifications} of 3 alerts enabled
                    </span>
                </section>

                <form onSubmit={saveSettings} className="st-form">
                    <section className="st-card">
                        <div className="st-section-heading">
                            <span className="st-section-icon">
                                <UserRound size={19} />
                            </span>

                            <div>
                                <h2>Your profile</h2>
                                <p>
                                    Manage the name and photo displayed
                                    throughout BizPilot.
                                </p>
                            </div>
                        </div>

                        <div className="st-profile-editor">
                            <div className="st-profile-preview">
                                {currentAvatar ? (
                                    <img
                                        src={currentAvatar}
                                        alt="Your profile"
                                    />
                                ) : (
                                    getInitials(currentName)
                                )}
                            </div>

                            <div className="st-profile-actions">
                                <strong>Profile picture</strong>
                                <p>Choose an image up to 1 MB.</p>

                                <div className="st-profile-buttons">
                                    <label className="st-photo-button">
                                        <ImagePlus size={15} />
                                        Upload photo

                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePhotoChange}
                                            aria-label="Upload profile picture"
                                        />
                                    </label>

                                    {currentAvatar && (
                                        <button
                                            type="button"
                                            className="st-button st-remove-photo"
                                            onClick={removePhoto}
                                        >
                                            <Trash2 size={14} />
                                            Remove photo
                                        </button>
                                    )}
                                </div>

                                {photoError && (
                                    <p className="st-photo-error" role="alert">
                                        {photoError}
                                    </p>
                                )}
                            </div>
                        </div>

                        <p className="st-note">
                            <ShieldCheck size={14} />
                            Profile picture updates are sent through
                            onProfileChange. Persistent profile storage depends
                            on the connected app handler.
                        </p>
                    </section>

                    <section className="st-card">
                        <div className="st-section-heading">
                            <span className="st-section-icon">
                                <Building2 size={19} />
                            </span>

                            <div>
                                <h2>Business profile</h2>
                                <p>
                                    Keep your business contact information up
                                    to date.
                                </p>
                            </div>
                        </div>

                        <div className="st-fields">
                            <label className="st-field">
                                <span>Business name</span>
                                <input
                                    name="businessName"
                                    value={settings.businessName}
                                    onChange={updateField}
                                    placeholder="Your business name"
                                    required
                                    maxLength={100}
                                />
                            </label>

                            <label className="st-field">
                                <span>Owner or contact name</span>
                                <input
                                    name="ownerName"
                                    value={settings.ownerName}
                                    onChange={updateField}
                                    placeholder="Your name"
                                    maxLength={100}
                                />
                            </label>

                            <label className="st-field st-field-full">
                                <span>Contact email</span>
                                <input
                                    type="email"
                                    name="email"
                                    value={settings.email}
                                    onChange={updateField}
                                    placeholder="you@example.com"
                                    maxLength={254}
                                />
                            </label>
                        </div>
                    </section>

                    <section className="st-card">
                        <div className="st-section-heading">
                            <span className="st-section-icon">
                                <Globe size={19} />
                            </span>

                            <div>
                                <h2>Language and regional preferences</h2>
                                <p>
                                    Choose the language and currency used
                                    throughout the app.
                                </p>
                            </div>
                        </div>

                        <div className="st-fields">
                            <label className="st-field">
                                <span>
                                    <Languages size={13} />
                                    Language
                                </span>

                                <select
                                    name="language"
                                    value={settings.language}
                                    onChange={updateField}
                                >
                                    {LANGUAGES.map(([code, label]) => (
                                        <option value={code} key={code}>
                                            {label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="st-field">
                                <span>
                                    <CircleDollarSign size={13} />
                                    Currency
                                </span>

                                <select
                                    name="currency"
                                    value={currency}
                                    onChange={updateField}
                                >
                                    {currencyOptions.map((item) => (
                                        <option
                                            value={item.code}
                                            key={item.code}
                                        >
                                            {item.code} — {item.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <div className="st-field st-field-full">
                                <span>Currency preview</span>

                                <div className="st-storage">
                                    <span className="st-storage-icon">
                                        <Wallet size={19} />
                                    </span>

                                    <div className="st-storage-copy">
                                        <strong>
                                            {currency} — {format(1234.5)}
                                        </strong>

                                        <p>
                                            Example formatting in your selected
                                            currency. This preview formats a
                                            sample amount; it does not convert
                                            an existing transaction.
                                        </p>

                                        {ratesLoading && (
                                            <p>Loading exchange rates…</p>
                                        )}

                                        {!ratesLoading && ratesError && (
                                            <p role="status">
                                                {ratesError}
                                            </p>
                                        )}

                                        {!ratesLoading &&
                                            !ratesError &&
                                            exchangeRates && (
                                                <p>
                                                    Exchange-rate data is
                                                    available for reference.
                                                    Rates can be delayed and
                                                    should not be used as a
                                                    guaranteed settlement quote.
                                                </p>
                                            )}

                                        {lastRefresh && (
                                            <p>
                                                Last rate update:{" "}
                                                {new Date(
                                                    lastRefresh
                                                ).toLocaleString()}
                                            </p>
                                        )}

                                        <button
                                            type="button"
                                            className="st-button"
                                            onClick={handleRefreshRates}
                                            disabled={ratesLoading}
                                            style={{ marginTop: 10 }}
                                        >
                                            <RotateCcw size={14} />
                                            {ratesLoading
                                                ? "Refreshing…"
                                                : "Refresh exchange rates"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <p className="st-note">
                            <Globe size={14} />
                            Currency selection updates the shared provider and
                            saved preferences. Amounts on other pages must use
                            the shared currency hook to reflect the selection.
                            Exchange rates depend on API availability and
                            supported currencies.
                        </p>
                    </section>

                    <section className="st-card">
                        <div className="st-section-heading">
                            <span className="st-section-icon">
                                <Bell size={19} />
                            </span>

                            <div>
                                <h2>Notifications</h2>
                                <p>
                                    Choose which types of updates you want
                                    enabled.
                                </p>
                            </div>
                        </div>

                        <div className="st-toggle-list">
                            {[
                                {
                                    name: "businessAlerts",
                                    title: "Business alerts",
                                    description:
                                        "Preference for important stock and business alerts.",
                                },
                                {
                                    name: "emailNotifications",
                                    title: "Email notifications",
                                    description:
                                        "Preference for email-related updates.",
                                },
                                {
                                    name: "weeklySummary",
                                    title: "Weekly summary",
                                    description:
                                        "Preference for a weekly business summary.",
                                },
                            ].map((item) => (
                                <div
                                    className="st-toggle-row"
                                    key={item.name}
                                >
                                    <div className="st-toggle-copy">
                                        <strong>{item.title}</strong>
                                        <p>{item.description}</p>
                                    </div>

                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={Boolean(
                                            settings[item.name]
                                        )}
                                        aria-label={item.title}
                                        className={`st-switch ${settings[item.name] ? "is-on" : ""
                                            }`}
                                        onClick={() => updateToggle(item.name)}
                                    >
                                        <span className="st-switch-thumb" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <p className="st-note">
                            <Bell size={14} />
                            These switches save your preferences. Sending
                            emails and scheduling alerts requires notification
                            services to be connected separately.
                        </p>
                    </section>

                    <section className="st-card">
                        <div className="st-section-heading">
                            <span className="st-section-icon">
                                <ShieldCheck size={19} />
                            </span>

                            <div>
                                <h2>Privacy and storage</h2>
                                <p>Understand where preferences are stored.</p>
                            </div>
                        </div>

                        <div className="st-storage">
                            <span className="st-storage-icon">
                                <Wallet size={19} />
                            </span>

                            <div className="st-storage-copy">
                                <strong>Local and shared preferences</strong>
                                <p>
                                    Preferences are saved in this browser and
                                    sent to App.jsx through
                                    onPreferencesChange. Cross-device
                                    synchronization requires persistent
                                    account storage.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="st-card st-danger">
                        <div className="st-section-heading">
                            <span className="st-section-icon">
                                <ShieldCheck size={19} />
                            </span>

                            <div>
                                <h2>Account management</h2>
                                <p>
                                    Manage your access or request account
                                    closure.
                                </p>
                            </div>
                        </div>

                        <p className="st-danger-copy">
                            These actions require the corresponding
                            authenticated account handlers to be supplied by
                            your app. Permanent deletion must be handled
                            securely on the server.
                        </p>

                        <div className="st-danger-actions">
                            <button
                                type="button"
                                className="st-button logout"
                                disabled={busy}
                                onClick={logout}
                            >
                                <LogOut size={15} />
                                Log out
                            </button>

                            <button
                                type="button"
                                className="st-button"
                                disabled={busy}
                                onClick={deactivate}
                            >
                                <Power size={15} />
                                Deactivate account
                            </button>

                            <button
                                type="button"
                                className="st-button danger"
                                disabled={busy}
                                onClick={deleteAccount}
                            >
                                <Trash2 size={15} />
                                Delete account
                            </button>
                        </div>

                        <p className="st-note">
                            <AlertTriangle size={14} />
                            Deactivation and deletion are different actions.
                            Permanent deletion should require server-side
                            authorization and identity verification.
                        </p>
                    </section>

                    <footer className="st-footer">
                        <div
                            className={`st-status ${messageType === "error"
                                    ? "is-error"
                                    : messageType === "neutral"
                                        ? "is-neutral"
                                        : ""
                                }`}
                            role="status"
                            aria-live="polite"
                        >
                            {message && (
                                <>
                                    {messageType === "error" ? (
                                        <AlertTriangle size={16} />
                                    ) : (
                                        <Check size={16} />
                                    )}
                                    <span>{message}</span>
                                </>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="st-save"
                            disabled={busy}
                        >
                            <Save size={16} />
                            {busy ? "Saving..." : "Save changes"}
                            <ChevronRight size={15} />
                        </button>
                    </footer>
                </form>
            </main>
        </>
    );
}
