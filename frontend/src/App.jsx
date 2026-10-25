
import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { useTranslation } from "react-i18next";
import {
  Activity,
  ArrowUpRight,
  Bell,
  Bot,
  Boxes,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  CircleHelp,
  LayoutDashboard,
  Menu,
  Package,
  Search,
  Settings2,
  X,
} from "lucide-react";

import UploadBox from "./components/UploadBox";
import LandingPage from "./components/LandingPage";
import AuthPage from "./components/AuthPage";
import { alerts } from "./mocks/data";
import { getHealth } from "./services/api";
import i18n, {
  supportedLanguages,
  changeAppLanguage,
} from "./i18n";
import { CurrencyProvider } from "./context/CurrencyContext";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Products = lazy(() => import("./pages/Products"));
const Chat = lazy(() => import("./pages/Chat"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const HelpCentre = lazy(() => import("./pages/HelpCentre"));

const BOOT_KEY = "bizpilot_booted";
const PROFILE_KEY = "bizpilot-profile";
const SETTINGS_KEY = "bizpilot-settings";
const PREFERENCES_KEY = "bizpilot-preferences";
const LANGUAGE_KEY = "bizpilot-language";

const navigation = [
  {
    sectionKey: "Workspace",
    items: [
      { id: "dashboard", labelKey: "dashboard", icon: LayoutDashboard },
      { id: "products", labelKey: "products", icon: Package },
      {
        id: "inventory",
        labelKey: "inventory",
        icon: Boxes,
        badge: "3",
      },
      {
        id: "reports",
        labelKey: "reports & Insights",
        icon: ChartNoAxesCombined,
      },
    ],
  },
  {
    sectionKey: "Bizpilot AI",
    items: [
      {
        id: "chat",
        labelKey: "chat",
        icon: Bot,
        special: true,
      },
    ],
  },
];

const pageTitleKeys = {
  dashboard: [
    "dashboard",
    "View your business performance, key metrics, and recent activity.",
  ],
  products: [
    "products",
    "Manage your products, update product details, and maintain accurate pricing.",
  ],
  inventory: [
    "inventory",
    "Track stock levels, monitor product availability, and identify low-stock items.",
  ],
  reports: [
    "reports",
    "Analyze business performance, review trends, and make data-driven decisions.",
  ],
  chat: [
    "chat",
    "Ask your AI assistant questions and get insights to help run your business.",
  ],
  settings: [
    "settings",
    "Manage your account, customize preferences, and configure your BizPilot experience.",
  ],
  help: [
    "help",
    "Find answers, learn how to use BizPilot, and get help when you need it.",
  ],
};

const defaultProfile = {
  name: "Account Owner",
  email: "",
  avatar: "",
};

const defaultPreferences = {
  businessName: "My Business",
  ownerName: "",
  email: "",
  currency: "KES",
  language: "English",
  languageCode: "en",
  emailNotifications: true,
  businessAlerts: true,
  weeklySummary: false,
};

function readJSON(key, fallback = {}) {
  if (typeof window === "undefined") return { ...fallback };

  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};

    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? { ...fallback, ...parsed }
      : { ...fallback };
  } catch {
    return { ...fallback };
  }
}

function persistJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function readProfile() {
  return readJSON(PROFILE_KEY, defaultProfile);
}

function resolveLanguageCode(preferences = {}) {
  let storedLanguage = null;

  try {
    storedLanguage = window.localStorage.getItem(LANGUAGE_KEY);
  } catch {
    // Continue with the saved preferences.
  }

  const candidates = [
    storedLanguage,
    preferences.languageCode,
    preferences.language,
    i18n.resolvedLanguage,
    i18n.language,
    "en",
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    const match = supportedLanguages.find(
      (language) =>
        language.code.toLowerCase() === String(candidate).toLowerCase() ||
        language.name.toLowerCase() === String(candidate).toLowerCase() ||
        language.nativeName.toLowerCase() === String(candidate).toLowerCase()
    );

    if (match) return match.code;
  }

  return "en";
}

function readPreferences() {
  const settings = readJSON(SETTINGS_KEY, defaultPreferences);
  const separatePreferences = readJSON(PREFERENCES_KEY, {});

  const merged = {
    ...defaultPreferences,
    ...separatePreferences,
    ...settings,
  };

  const languageCode = resolveLanguageCode({
    ...separatePreferences,
    ...merged,
  });

  const selectedLanguage = supportedLanguages.find(
    (language) => language.code === languageCode
  );

  return {
    ...merged,
    languageCode,
    language: selectedLanguage?.name || "English",
  };
}

function alreadyBooted() {
  try {
    return sessionStorage.getItem(BOOT_KEY) === "1";
  } catch {
    return false;
  }
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
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

function PageSkeleton() {
  const { t } = useTranslation();

  return (
    <div className="page-stack page-skeleton" aria-busy="true">
      <span className="sr-only">{t("loading")}</span>
      <div className="bp-skeleton skeleton-banner" />

      <div className="kpi-grid">
        {[0, 1, 2, 3].map((item) => (
          <div className="kpi-card" key={item}>
            <div className="kpi-card-top">
              <span
                className="bp-skeleton bp-skeleton-text"
                style={{ width: "46%" }}
              />
              <span className="bp-skeleton skeleton-icon" />
            </div>
            <span className="bp-skeleton skeleton-value" />
            <span
              className="bp-skeleton bp-skeleton-text"
              style={{ width: "62%" }}
            />
          </div>
        ))}
      </div>

      <div className="content-grid">
        <div className="panel">
          <span className="bp-skeleton bp-skeleton-title" />
          <span
            className="bp-skeleton bp-skeleton-text"
            style={{ width: "34%", marginTop: 10 }}
          />
          <span className="bp-skeleton skeleton-chart" />
        </div>

        <div className="panel">
          <span className="bp-skeleton bp-skeleton-title" />
          {[0, 1, 2].map((item) => (
            <div className="skeleton-row" key={item}>
              <span className="bp-skeleton skeleton-icon" />
              <div style={{ flex: 1 }}>
                <span
                  className="bp-skeleton bp-skeleton-text"
                  style={{ width: "70%" }}
                />
                <span
                  className="bp-skeleton bp-skeleton-text"
                  style={{ width: "45%", marginTop: 8 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { t } = useTranslation();

  const [view, setView] = useState("landing");
  const [demoUser, setDemoUser] = useState(readProfile);
  const [preferences, setPreferences] = useState(readPreferences);
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [apiStatus, setApiStatus] = useState("checking");
  const [toast, setToast] = useState("");
  const [navCount, setNavCount] = useState(0);
  const [boot, setBoot] = useState(() =>
    alreadyBooted() ? "gone" : "show"
  );

  const [, startTransition] = useTransition();

  const searchRef = useRef(null);
  const pageRef = useRef(null);
  const notifRef = useRef(null);
  const toastTimer = useRef(null);

  const notify = useCallback((message) => {
    window.clearTimeout(toastTimer.current);
    setToast(message);

    toastTimer.current = window.setTimeout(() => {
      setToast("");
    }, 3200);
  }, []);

  const updateProfile = useCallback((updates) => {
    setDemoUser((current) => {
      const next = { ...current, ...updates };
      persistJSON(PROFILE_KEY, next);
      return next;
    });
  }, []);

  const updatePreferences = useCallback((updates) => {
    setPreferences((current) => {
      const next = { ...current, ...updates };

      persistJSON(SETTINGS_KEY, next);
      persistJSON(PREFERENCES_KEY, next);

      if (next.languageCode) {
        try {
          window.localStorage.setItem(LANGUAGE_KEY, next.languageCode);
        } catch {
          // The preference remains active in memory.
        }
      }

      return next;
    });
  }, []);

  const changeLanguage = useCallback(
    async (languageCode) => {
      const selected = supportedLanguages.find(
        (language) => language.code === languageCode
      );

      if (!selected) {
        notify("That language is not supported yet.");
        return;
      }

      try {
        await changeAppLanguage(selected.code);

        updatePreferences({
          language: selected.name,
          languageCode: selected.code,
        });

        notify(
          t("messages.languageChanged", {
            defaultValue: `Language changed to ${selected.nativeName}.`,
          })
        );
      } catch {
        notify("The language could not be changed. Please try again.");
      }
    },
    [notify, t, updatePreferences]
  );

  const handleSettingsChange = useCallback(
    (updates) => {
      updatePreferences(updates);
    },
    [updatePreferences]
  );

  useEffect(() => {
    const handleLanguageChanged = (languageCode) => {
      const selected = supportedLanguages.find(
        (language) => language.code === languageCode
      );

      if (!selected) return;

      document.documentElement.lang = selected.code;
      document.documentElement.dir = selected.dir;

      setPreferences((current) => {
        const next = {
          ...current,
          language: selected.name,
          languageCode: selected.code,
        };

        persistJSON(SETTINGS_KEY, next);
        persistJSON(PREFERENCES_KEY, next);

        try {
          window.localStorage.setItem(LANGUAGE_KEY, selected.code);
        } catch {
          // Storage is optional for the current session.
        }

        return next;
      });
    };

    const initialLanguage = resolveLanguageCode(preferences);

    document.documentElement.lang = initialLanguage;
    document.documentElement.dir =
      supportedLanguages.find((language) => language.code === initialLanguage)
        ?.dir || "ltr";

    i18n.on("languageChanged", handleLanguageChanged);

    if (initialLanguage !== i18n.language) {
      changeAppLanguage(initialLanguage).catch(() => {
        // Keep the currently active language if initialization fails.
      });
    }

    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
    // Initialize once; the listener handles subsequent changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Backend health is optional for rendering the frontend.
  // A failed request only updates the connection indicator.
  useEffect(() => {
    let active = true;

    getHealth()
      .then(() => {
        if (active) setApiStatus("online");
      })
      .catch(() => {
        if (active) setApiStatus("offline");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (boot !== "show") return undefined;

    const reducedMotion = prefersReducedMotion();

    const leaveTimer = window.setTimeout(
      () => setBoot("leaving"),
      reducedMotion ? 200 : 1150
    );

    const doneTimer = window.setTimeout(
      () => {
        setBoot("gone");

        try {
          sessionStorage.setItem(BOOT_KEY, "1");
        } catch {
          // Storage may be unavailable.
        }
      },
      reducedMotion ? 300 : 1600
    );

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(doneTimer);
    };
  }, [boot]);

  const pageTitleKeysForPage =
    pageTitleKeys[page] || pageTitleKeys.dashboard;

  const pageTitle = [
    t(pageTitleKeysForPage[0]),
    t(pageTitleKeysForPage[1]),
  ];

  useEffect(() => {
    document.title =
      view === "app"
        ? `${t(pageTitleKeysForPage[0])} · BizPilot`
        : "BizPilot — Business intelligence for your shop";
  }, [view, pageTitleKeysForPage, t, i18n.language]);

  useEffect(() => {
    pageRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [page]);

  useEffect(() => {
    if (view !== "app") return undefined;

    function onKey(event) {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }

      if (event.key === "Escape") {
        setNotificationsOpen(false);
        setUploadOpen(false);
        setSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view]);

  useEffect(() => {
    if (!notificationsOpen) return undefined;

    function onDown(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [notificationsOpen]);

  useEffect(
    () => () => window.clearTimeout(toastTimer.current),
    []
  );

  const navigate = useCallback(
    (id) => {
      setSidebarOpen(false);
      setSearch("");

      if (id === page) return;

      setNavCount((count) => count + 1);
      startTransition(() => setPage(id));
    },
    [page, startTransition]
  );

  const onAlert = useCallback(
    (alert) => {
      navigate(alert.type === "info" ? "reports" : "inventory");
    },
    [navigate]
  );

  const initials = getInitials(demoUser.name);
  const languageCode = i18n.resolvedLanguage || i18n.language || "en";

  let screen;

  if (view === "landing") {
    screen = (
      <div className="view-fade" key="landing">
        <LandingPage
          onLogin={() => setView("login")}
          onSignup={() => setView("signup")}
          onPreview={() => setView("app")}
        />
      </div>
    );
  } else if (view === "login" || view === "signup") {
    screen = (
      <div className="view-fade" key="auth">
        <AuthPage
          mode={view}
          onBack={() => setView("landing")}
          onModeChange={setView}
          onSuccess={(user) => {
            updateProfile({
              ...user,
              avatar: user.avatar || demoUser.avatar || "",
            });
            setView("app");
          }}
        />
      </div>
    );
  } else {
    screen = (
      <div className="view-fade" key="app">
        <div className="app-shell">
          <a className="skip-link" href="#main-content">
            {t("skipToContent")}
          </a>

          {navCount > 0 && (
            <div
              className="route-progress"
              key={navCount}
              aria-hidden="true"
            />
          )}

          {sidebarOpen && (
            <button
              type="button"
              className="mobile-scrim"
              onClick={() => setSidebarOpen(false)}
              aria-label={t("closeNavigation")}
            />
          )}

          <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
            <div className="brand-lockup">
              <div className="brand-mark">
                <Activity size={21} strokeWidth={2.5} />
              </div>

              <div className="brand-name">
                bizpilot<span>.</span>
                <small>{t("businessIntelligence")}</small>
              </div>

              <button
                type="button"
                className="icon-button sidebar-close"
                onClick={() => setSidebarOpen(false)}
                aria-label={t("closeSidebar")}
              >
                <X size={18} />
              </button>
            </div>

            <button
              type="button"
              className="workspace-switcher"
              onClick={() =>
                notify(t("messages.workspaceSwitchingUnavailable"))
              }
            >
              <span className="workspace-avatar">G</span>
              <span className="workspace-copy">
                <strong>{preferences.businessName || "My Business"}</strong>
                <small>{t("starterWorkspace")}</small>
              </span>
              <ChevronDown size={15} />
            </button>

            <div className="sidebar-scroll">
              {navigation.map((group) => (
                <div className="nav-group" key={group.sectionKey}>
                  <div className="nav-section-label">
                    {t(group.sectionKey)}
                  </div>

                  {group.items.map((item) => {
                    const Icon = item.icon;

                    return (
                      <button
                        type="button"
                        key={item.id}
                        className={`nav-item ${page === item.id ? "active" : ""
                          } ${item.special ? "nav-ai" : ""}`}
                        aria-current={
                          page === item.id ? "page" : undefined
                        }
                        onClick={() => navigate(item.id)}
                      >
                        <Icon size={18} strokeWidth={1.8} />
                        <span>{t(item.labelKey)}</span>

                        {item.badge && (
                          <span className="nav-badge">{item.badge}</span>
                        )}

                        {item.special && (
                          <span className="nav-new">AI</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}

              <div className="nav-group">
                <div className="nav-section-label">
                  {t("DataTools")}
                </div>

                <button
                  type="button"
                  className="nav-item"
                  onClick={() => {
                    setSidebarOpen(false);
                    setUploadOpen(true);
                  }}
                >
                  <ArrowUpRight size={18} />
                  <span>{t("importData")}</span>
                </button>

                <button
                  type="button"
                  className={`nav-item ${page === "help" ? "active" : ""
                    }`}
                  aria-current={page === "help" ? "page" : undefined}
                  onClick={() => navigate("help")}
                >
                  <CircleHelp size={18} />
                  <span>{t("help")}</span>
                </button>
              </div>
            </div>

            <div className="sidebar-bottom">
             
              <button
                type="button"
                className={`nav-item settings-item ${page === "settings" ? "active" : ""
                  }`}
                aria-current={
                  page === "settings" ? "page" : undefined
                }
                onClick={() => navigate("settings")}
              >
                <Settings2 size={18} />
                <span>{t("settings")}</span>
              </button>

              <div className="profile-row">
                <span className="profile-avatar">
                  {demoUser.avatar ? (
                    <img
                      src={demoUser.avatar}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "inherit",
                      }}
                    />
                  ) : (
                    initials
                  )}
                </span>

                <span className="profile-copy">
                  <strong>{demoUser.name}</strong>
                  <small>{t("businessOwner")}</small>
                </span>

                <button
                  type="button"
                  className="icon-button"
                  onClick={() => navigate("settings")}
                  aria-label={t("openProfileSettings")}
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>
          </aside>

          <main className="main-area">
            <header className="topbar">
              <div className="topbar-left">
                <button
                  type="button"
                  className="icon-button mobile-menu"
                  onClick={() => setSidebarOpen(true)}
                  aria-label={t("openNavigation")}
                >
                  <Menu size={20} />
                </button>

                <div className="breadcrumbs">
                  <span>{t("Workspace")}</span>
                  <span className="breadcrumb-slash">/</span>
                  <strong>{pageTitle[0]}</strong>
                </div>
              </div>

              <div className="topbar-actions">
                <label className="global-search">
                  <Search size={16} />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("searchAnything")}
                    aria-label={t("searchAnything")}
                  />
                  <kbd>
                    {/Mac|iPhone|iPad/.test(
                      typeof navigator !== "undefined"
                        ? navigator.userAgent
                        : ""
                    )
                      ? "⌘ K"
                      : "Ctrl K"}
                  </kbd>
                </label>

                <span
                  className={`connection-status ${apiStatus}`}
                  title={
                    apiStatus === "online"
                      ? t("backendConnected")
                      : t("demoDataStatus")
                  }
                >
                  <i />
                  {apiStatus === "online"
                    ? t("apiConnected")
                    : apiStatus === "checking"
                      ? t("connecting")
                      : t("demoMode")}
                </span>

                <div className="notification-wrap" ref={notifRef}>
                  <button
                    type="button"
                    className={`icon-button notification-button ${notificationsOpen ? "selected" : ""
                      }`}
                    onClick={() =>
                      setNotificationsOpen((open) => !open)
                    }
                    aria-label={t("notifications")}
                    aria-expanded={notificationsOpen}
                  >
                    <Bell size={19} />
                    <i />
                  </button>

                  {notificationsOpen && (
                    <div className="notification-popover">
                      <div className="popover-heading">
                        <strong>{t("notifications")}</strong>
                        <span>
                          {t("newCount", {
                            count: alerts.length,
                          })}
                        </span>
                      </div>

                      {alerts.map((alert, index) => (
                        <button
                          type="button"
                          className="notification-item"
                          key={alert.id ?? `${alert.title}-${index}`}
                          onClick={() => {
                            setNotificationsOpen(false);
                            onAlert(alert);
                          }}
                        >
                          <span
                            className={`notification-dot ${alert.type}`}
                          />
                          <span>
                            <strong>{alert.title}</strong>
                            <small>{alert.detail}</small>
                          </span>
                        </button>
                      ))}

                      <button
                        type="button"
                        className="popover-footer"
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate("inventory");
                        }}
                      >
                        {t("viewAllAlerts")}
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="topbar-avatar"
                  onClick={() => navigate("settings")}
                  aria-label={t("openAccountSettings")}
                  title={t("accountSettings")}
                  style={{ overflow: "hidden", padding: 0 }}
                >
                  {demoUser.avatar ? (
                    <img
                      src={demoUser.avatar}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    initials
                  )}
                </button>
              </div>
            </header>

            <div className="page-header">
              <div>
                <h1>{pageTitle[0]}</h1>
                <p>{pageTitle[1]}</p>
              </div>

              <div className="page-header-right">
                <span className="date-chip">
                  <span className="date-chip-dot" />
                  {new Date().toLocaleDateString(languageCode, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>

                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => setUploadOpen(true)}
                >
                  <ArrowUpRight size={16} />
                  {t("importData")}
                </button>
              </div>
            </div>

            {search.trim() && (
              <div className="search-results-strip" role="status">
                <Search size={15} />
                {t("messages.searchReady")}
                <button
                  type="button"
                  onClick={() => navigate("products")}
                >
                  {t("messages.searchProductsFor", { search })}
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setSearch("")}
                  aria-label={t("clearSearch")}
                >
                  <X size={15} />
                </button>
              </div>
            )}

            <div
              className="page-content"
              id="main-content"
              tabIndex={-1}
              ref={pageRef}
            >
              <div className="page-view" key={page}>
                <Suspense fallback={<PageSkeleton />}>
                  {page === "dashboard" && (
                    <Dashboard
                      onNavigate={navigate}
                      onAlert={onAlert}
                      profile={demoUser}
                      preferences={preferences}
                    />
                  )}

                  {page === "inventory" && (
                    <Inventory preferences={preferences} />
                  )}

                  {page === "products" && (
                    <Products preferences={preferences} />
                  )}

                  {page === "chat" && (
                    <Chat preferences={preferences} />
                  )}

                  {page === "reports" && (
                    <Reports preferences={preferences} />
                  )}

                  {page === "settings" && (
                    <Settings
                      profile={demoUser}
                      preferences={preferences}
                      supportedLanguages={supportedLanguages}
                      onProfileChange={updateProfile}
                      onPreferencesChange={handleSettingsChange}
                      onSettingsChange={handleSettingsChange}
                      onLanguageChange={changeLanguage}
                      onAlert={onAlert}
                      onLogout={() => {
                        setView("landing");
                        setPage("dashboard");
                        notify("You have been logged out.");
                      }}
                    />
                  )}

                  {page === "help" && <HelpCentre />}
                </Suspense>
              </div>
            </div>

            <footer className="app-footer">
              <span>© 2026 BizPilot</span>
              <span>
                <i className="footer-dot" />
                {t("clearerBusinessDecisions")}
              </span>
              <span className="footer-demo">
                {t("previewSampleData")}
              </span>
            </footer>
          </main>

          {uploadOpen && (
            <div
              className="modal-backdrop"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                  setUploadOpen(false);
                }
              }}
            >
              <section
                className="modal-card"
                role="dialog"
                aria-modal="true"
                aria-labelledby="upload-title"
              >
                <div className="modal-heading">
                  <div>
                    <span className="eyebrow">
                      {t("getStarted")}
                    </span>
                    <h2 id="upload-title">
                      {t("importBusinessData")}
                    </h2>
                    <p>{t("messages.importDescription")}</p>
                  </div>

                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setUploadOpen(false)}
                    aria-label={t("closeUploadDialog")}
                  >
                    <X size={19} />
                  </button>
                </div>

                <UploadBox
                  onFile={(file) =>
                    notify(
                      t("messages.fileSelected", {
                        name: file.name,
                      })
                    )
                  }
                />

                <div className="modal-hint">
                  <CircleHelp size={15} />
                  <span>
                    {t("messages.importBackendUnavailable")}
                  </span>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setUploadOpen(false)}
                  >
                    {t("close")}
                  </button>

                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => {
                      setUploadOpen(false);
                      notify(t("messages.sampleDataLoaded"));
                    }}
                  >
                    {t("continueWithSampleData")}
                  </button>
                </div>
              </section>
            </div>
          )}

          {toast && (
            <div className="toast-message" role="status">
              <span className="toast-check">
                <Check size={13} strokeWidth={3} />
              </span>
              {toast}
              <button
                type="button"
                onClick={() => setToast("")}
                aria-label={t("dismissNotification")}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <CurrencyProvider
      initialCurrency={preferences.currency || "KES"}
      onCurrencyChange={(currency) => {
        updatePreferences({ currency });
      }}
    >
      <>
        {screen}

        {boot !== "gone" && (
          <div
            className={`boot-splash ${boot === "leaving" ? "is-leaving" : ""
              }`}
            role="status"
            aria-live="polite"
          >
            <div className="boot-mark">
              <span className="boot-ring" />
              <span className="boot-ring boot-ring-2" />
              <div className="boot-icon">
                <Activity size={30} strokeWidth={2.4} />
              </div>
            </div>

            <div className="boot-word">
              bizpilot<span>.</span>
            </div>

            <div className="boot-tag">
              {t("businessIntelligenceForYourShop")}
            </div>

            <div className="boot-bar">
              <i />
            </div>
          </div>
        )}
      </>
    </CurrencyProvider>
  );
}
