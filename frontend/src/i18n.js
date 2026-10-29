import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const LANGUAGE_STORAGE_KEY = "bizpilot-language";
const PREFERENCES_STORAGE_KEY = "bizpilot-preferences";
const LANGUAGE_CHANGE_EVENT = "bizpilot:language-change";

/*
 * Translation keys use direct names:
 * dashboard, products, inventory, chat, settings, etc.
 *
 * Do not use the old common.dashboard/common.products format.
 */


const english = {
    importing: "Importing data...",
    emailConfirmed: "Email confirmed.",
    passwordUpdated: "Password updated, please log in.",
    resetLinkNeutral: "If that account exists, we sent a reset link.",
    dashboard: "Dashboard",
    overview: "Overview",

    products: "Products",
    productsDescription: "Manage your products",

    inventory: "Inventory",
    inventoryDescription: "Track your stock",

    reports: "Reports",
    reportsDescription: "Review your business performance",

    chat: "AI Assistant",
    chatPlaceholder: "Ask your business assistant a question",

    settings: "Settings",
    settingsDescription: "Manage your preferences",

    help: "Help Centre",
    helpDescription: "Find answers and get support",
    goToHome: "Go to home",
};


const swahili = {
    ...english,
    dashboard: "Dashibodi",
    products: "Bidhaa",
    inventory: "Hesabu ya bidhaa",
    chat: "Mazungumzo",
    reports: "Ripoti na uchambuzi",
    settings: "Mipangilio",
    helpCentre: "Kituo cha msaada",
    help: "Msaada",
    search: "Tafuta",
    notifications: "Arifa",
    profile: "Wasifu",
    logout: "Ondoka",
    login: "Ingia",
    signup: "Jisajili",
    welcome: "Karibu",
    save: "Hifadhi",
    cancel: "Ghairi",
    delete: "Futa",
    edit: "Hariri",
    update: "Sasisha",
    create: "Unda",
    add: "Ongeza",
    remove: "Ondoa",
    close: "Funga",
    loading: "Inapakia...",
    success: "Imefanikiwa",
    language: "Lugha",
    currency: "Sarafu",
    preferences: "Mapendeleo",
    account: "Akaunti",
    appearance: "Mwonekano",
    general: "Jumla",
    status: "Hali",
    online: "Mtandaoni",
    offline: "Nje ya mtandao",
    retry: "Jaribu tena",
    back: "Rudi",
    next: "Endelea",
    submit: "Wasilisha",
    refresh: "Onyesha upya",
    viewAll: "Tazama yote",
    noData: "Hakuna data",
    confirm: "Thibitisha",
    actions: "Vitendo",
    name: "Jina",
    email: "Barua pepe",
    password: "Nenosiri",
    description: "Maelezo",
    price: "Bei",
    quantity: "Idadi",
    total: "Jumla",
    date: "Tarehe",
    today: "Leo",
    welcomeBack: "Karibu tena",
    navigation: "Urambazaji",
};

const french = {
    ...english,
    dashboard: "Tableau de bord",
    products: "Produits",
    inventory: "Inventaire",
    chat: "Discussion",
    reports: "Rapports et analyses",
    settings: "Paramètres",
    helpCentre: "Centre d'aide",
    help: "Aide",
    search: "Rechercher",
    notifications: "Notifications",
    profile: "Profil",
    logout: "Se déconnecter",
    login: "Se connecter",
    signup: "S'inscrire",
    welcome: "Bienvenue",
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    edit: "Modifier",
    update: "Mettre à jour",
    create: "Créer",
    add: "Ajouter",
    remove: "Retirer",
    close: "Fermer",
    loading: "Chargement...",
    success: "Réussite",
    language: "Langue",
    currency: "Devise",
    preferences: "Préférences",
    account: "Compte",
    appearance: "Apparence",
    general: "Général",
    status: "Statut",
    online: "En ligne",
    offline: "Hors ligne",
    retry: "Réessayer",
    back: "Retour",
    next: "Suivant",
    submit: "Soumettre",
    refresh: "Actualiser",
    viewAll: "Tout afficher",
    noData: "Aucune donnée disponible",
    confirm: "Confirmer",
    actions: "Actions",
    name: "Nom",
    email: "E-mail",
    password: "Mot de passe",
    description: "Description",
    price: "Prix",
    quantity: "Quantité",
    total: "Total",
    date: "Date",
    today: "Aujourd'hui",
    welcomeBack: "Bon retour",
    navigation: "Navigation",
};

const spanish = {
    ...english,
    dashboard: "Panel",
    products: "Productos",
    inventory: "Inventario",
    chat: "Chat",
    reports: "Informes y análisis",
    settings: "Configuración",
    helpCentre: "Centro de ayuda",
    help: "Ayuda",
    search: "Buscar",
    notifications: "Notificaciones",
    profile: "Perfil",
    logout: "Cerrar sesión",
    login: "Iniciar sesión",
    signup: "Registrarse",
    welcome: "Bienvenido",
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    edit: "Editar",
    update: "Actualizar",
    create: "Crear",
    add: "Añadir",
    remove: "Quitar",
    close: "Cerrar",
    loading: "Cargando...",
    success: "Éxito",
    language: "Idioma",
    currency: "Moneda",
    preferences: "Preferencias",
    account: "Cuenta",
    appearance: "Apariencia",
    general: "General",
    status: "Estado",
    online: "En línea",
    offline: "Desconectado",
    retry: "Reintentar",
    back: "Atrás",
    next: "Siguiente",
    submit: "Enviar",
    refresh: "Actualizar",
    viewAll: "Ver todo",
    noData: "No hay datos disponibles",
    confirm: "Confirmar",
    actions: "Acciones",
    name: "Nombre",
    email: "Correo electrónico",
    password: "Contraseña",
    description: "Descripción",
    price: "Precio",
    quantity: "Cantidad",
    total: "Total",
    date: "Fecha",
    today: "Hoy",
    welcomeBack: "Bienvenido de nuevo",
    navigation: "Navegación",
};

export const supportedLanguages = [
    { code: "en", name: "English", nativeName: "English", dir: "ltr" },
    { code: "sw", name: "Swahili", nativeName: "Kiswahili", dir: "ltr" },
    { code: "fr", name: "French", nativeName: "Français", dir: "ltr" },
    { code: "es", name: "Spanish", nativeName: "Español", dir: "ltr" },
    { code: "de", name: "German", nativeName: "Deutsch", dir: "ltr" },
    { code: "pt", name: "Portuguese", nativeName: "Português", dir: "ltr" },
    { code: "ar", name: "Arabic", nativeName: "العربية", dir: "rtl" },
    { code: "zh", name: "Chinese (Simplified)", nativeName: "简体中文", dir: "ltr" },
    { code: "hi", name: "Hindi", nativeName: "हिन्दी", dir: "ltr" },
    { code: "ja", name: "Japanese", nativeName: "日本語", dir: "ltr" },
    { code: "ko", name: "Korean", nativeName: "한국어", dir: "ltr" },
    { code: "it", name: "Italian", nativeName: "Italiano", dir: "ltr" },
    { code: "nl", name: "Dutch", nativeName: "Nederlands", dir: "ltr" },
    { code: "tr", name: "Turkish", nativeName: "Türkçe", dir: "ltr" },
    { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", dir: "ltr" },
    { code: "bn", name: "Bengali", nativeName: "বাংলা", dir: "ltr" },
    { code: "ur", name: "Urdu", nativeName: "اردو", dir: "rtl" },
    { code: "ru", name: "Russian", nativeName: "Русский", dir: "ltr" },
    { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", dir: "ltr" },
    { code: "th", name: "Thai", nativeName: "ไทย", dir: "ltr" },
    { code: "am", name: "Amharic", nativeName: "አማርኛ", dir: "ltr" },
    { code: "yo", name: "Yoruba", nativeName: "Yorùbá", dir: "ltr" },
];

const resources = {
    en: { translation: english },
    sw: { translation: swahili },
    fr: { translation: french },
    es: { translation: spanish },
};

for (const language of supportedLanguages) {
    if (!resources[language.code]) {
        resources[language.code] = { translation: english };
    }
}

function isSupportedLanguage(code) {
    return supportedLanguages.some((language) => language.code === code);
}

function readSavedLanguage() {
    if (typeof window === "undefined") {
        return "en";
    }

    try {
        const savedLanguage = window.localStorage.getItem(
            LANGUAGE_STORAGE_KEY
        );

        if (isSupportedLanguage(savedLanguage)) {
            return savedLanguage;
        }

        const storedPreferences = window.localStorage.getItem(
            PREFERENCES_STORAGE_KEY
        );

        if (storedPreferences) {
            const preferences = JSON.parse(storedPreferences);

            if (isSupportedLanguage(preferences?.language)) {
                return preferences.language;
            }
        }
    } catch {
        // Fall back to English if storage is unavailable.
    }

    return "en";
}

function applyDocumentLanguage(languageCode) {
    if (typeof document === "undefined") return;

    const language = supportedLanguages.find(
        (item) => item.code === languageCode
    );

    document.documentElement.lang = language?.code || "en";
    document.documentElement.dir = language?.dir || "ltr";
}

if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
        resources,
        lng: readSavedLanguage(),
        fallbackLng: "en",
        supportedLngs: supportedLanguages.map((language) => language.code),
        nonExplicitSupportedLngs: false,
        load: "currentOnly",
        defaultNS: "translation",
        interpolation: {
            escapeValue: false,
        },
        returnNull: false,
        returnEmptyString: false,
        react: {
            useSuspense: false,
        },
    });
}

applyDocumentLanguage(i18n.resolvedLanguage || i18n.language || "en");

i18n.on("languageChanged", (languageCode) => {
    const supportedCode = isSupportedLanguage(languageCode)
        ? languageCode
        : "en";

    applyDocumentLanguage(supportedCode);
});

export async function changeAppLanguage(languageCode) {
    if (!isSupportedLanguage(languageCode)) {
        throw new Error(`Unsupported language: ${languageCode}`);
    }

    await i18n.changeLanguage(languageCode);
    applyDocumentLanguage(languageCode);

    if (typeof window !== "undefined") {
        try {
            window.localStorage.setItem(
                LANGUAGE_STORAGE_KEY,
                languageCode
            );

            let preferences = {};

            try {
                const stored = window.localStorage.getItem(
                    PREFERENCES_STORAGE_KEY
                );
                preferences = stored ? JSON.parse(stored) : {};
            } catch {
                preferences = {};
            }

            window.localStorage.setItem(
                PREFERENCES_STORAGE_KEY,
                JSON.stringify({
                    ...preferences,
                    language: languageCode,
                })
            );

            window.dispatchEvent(
                new CustomEvent(LANGUAGE_CHANGE_EVENT, {
                    detail: { language: languageCode },
                })
            );
        } catch {
            // Language changes remain active for the current session.
        }
    }

    return languageCode;
}

export function getCurrentAppLanguage() {
    const currentLanguage = i18n.resolvedLanguage || i18n.language || "en";

    return isSupportedLanguage(currentLanguage)
        ? currentLanguage
        : "en";
}

export function getLanguageDirection(
    languageCode = getCurrentAppLanguage()
) {
    return (
        supportedLanguages.find((language) => language.code === languageCode)
            ?.dir || "ltr"
    );
}

export default i18n;
