
import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
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
  Sparkles,
  X,
} from "lucide-react";

import UploadBox from "./components/UploadBox";
import LandingPage from "./components/LandingPage";
import AuthPage from "./components/AuthPage";
import { alerts } from "./mocks/data";
import { getHealth } from "./services/api";

/* Lazy-loaded application pages */
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Products = lazy(() => import("./pages/Products"));
const Chat = lazy(() => import("./pages/Chat"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const HelpCentre = lazy(() => import("./pages/HelpCentre"));

const navigation = [
  {
    section: "Workspace",
    items: [
      { id: "dashboard", label: "Overview", icon: LayoutDashboard },
      { id: "products", label: "Products", icon: Package },
      { id: "inventory", label: "Inventory", icon: Boxes, badge: "3" },
      {
        id: "reports",
        label: "Reports & insights",
        icon: ChartNoAxesCombined,
      },
    ],
  },
  {
    section: "Intelligence",
    items: [
      { id: "chat", label: "AI assistant", icon: Bot, special: true },
    ],
  },
];

const pageTitles = {
  dashboard: ["Overview", "Your business at a glance."],
  products: ["Products", "Manage your catalogue and pricing."],
  inventory: ["Inventory", "Stay ahead of stock and supply."],
  reports: ["Reports & insights", "Understand your business performance."],
  chat: ["AI assistant", "Your business questions, answered."],
  settings: ["Settings", "Manage your business preferences."],
  help: ["Help centre", "Find answers and get help with BizPilot."],
};

const BOOT_KEY = "bizpilot_booted";

const PROFILE_KEY = "bizpilot-profile";

function loadProfile() {
  const fallback = {
    name: "Kipkirui John",
    email: "",
    avatar: "",
  };

  try {
    const saved = localStorage.getItem(PROFILE_KEY);
    return saved ? { ...fallback, ...JSON.parse(saved) } : fallback;
  } catch {
    return fallback;
  }
}

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");

const shortcutLabel = isMac ? "⌘ K" : "Ctrl K";

function getInitials(name) {
  return (name || "BP")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
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
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/* Loading placeholder shown while lazy-loaded pages are imported */
function PageSkeleton() {
  return (
    <div className="page-stack page-skeleton" aria-busy="true">
      <span className="sr-only">Loading page…</span>

      <div className="bp-skeleton skeleton-banner" />

      <div className="kpi-grid">
        {[0, 1, 2, 3].map((i) => (
          <div className="kpi-card" key={i}>
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

          {[0, 1, 2].map((i) => (
            <div className="skeleton-row" key={i}>
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
  const [view, setView] = useState("landing");
  const [demoUser, setDemoUser] = useState(loadProfile);

  const updateProfile = useCallback((updates) => {
    setDemoUser((current) => {
      const next = { ...current, ...updates };

      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      } catch {
        // The profile remains available in React state for this session.
      }

      return next;
    });
  }, []);
  const [page, setPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [apiStatus, setApiStatus] = useState("checking");
  const [toast, setToast] = useState("");
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [navCount, setNavCount] = useState(0);
  const [boot, setBoot] = useState(() =>
    alreadyBooted() ? "gone" : "show"
  );

  const [, startTransition] = useTransition();

  const searchRef = useRef(null);
  const pageRef = useRef(null);
  const notifRef = useRef(null);
  const toastTimer = useRef(null);

  /* Backend health check */
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

  /* Boot splash: runs once per browser session */
  useEffect(() => {
    if (boot !== "show") return undefined;

    const quick = prefersReducedMotion();

    const leave = window.setTimeout(
      () => setBoot("leaving"),
      quick ? 200 : 1150
    );

    const gone = window.setTimeout(() => {
      setBoot("gone");

      try {
        sessionStorage.setItem(BOOT_KEY, "1");
      } catch {
        /* Storage unavailable */
      }
    }, quick ? 300 : 1600);

    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(gone);
    };
  }, [boot]);

  /* Browser tab title */
  useEffect(() => {
    document.title =
      view === "app"
        ? `${(pageTitles[page] || pageTitles.dashboard)[0]} · BizPilot`
        : "BizPilot — Business intelligence for your shop";
  }, [view, page]);

  /* Scroll to the top after changing pages */
  useEffect(() => {
    if (pageRef.current) {
      pageRef.current.scrollTo({ top: 0 });
    }
  }, [page]);

  /* Keyboard shortcuts */
  useEffect(() => {
    if (view !== "app") return undefined;

    function onKey(event) {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "Escape") {
        setNotificationsOpen(false);
        setUploadOpen(false);
        setSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [view]);

  /* Close notifications when clicking outside */
  useEffect(() => {
    if (!notificationsOpen) return undefined;

    function onDown(event) {
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", onDown);

    return () => document.removeEventListener("mousedown", onDown);
  }, [notificationsOpen]);

  /* Clear toast timer when the component unmounts */
  useEffect(() => {
    return () => window.clearTimeout(toastTimer.current);
  }, []);

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

  function notify(message) {
    window.clearTimeout(toastTimer.current);
    setToast(message);

    toastTimer.current = window.setTimeout(() => {
      setToast("");
    }, 3200);
  }

  function onAlert(alert) {
    setSelectedAlert(alert);

    if (alert.type === "info") {
      navigate("reports");
    } else {
      navigate("inventory");
    }
  }

  const pageTitle = pageTitles[page] || pageTitles.dashboard;
  const initials = getInitials(demoUser.name);

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
            setDemoUser(user);
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
            Skip to content
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
              aria-label="Close navigation"
            />
          )}

          <aside
            className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}
          >
            <div className="brand-lockup">
              <div className="brand-mark">
                <Activity size={21} strokeWidth={2.5} />
              </div>

              <div className="brand-name">
                bizpilot<span>.</span>
                <small>Business intelligence</small>
              </div>

              <button
                type="button"
                className="icon-button sidebar-close"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <X size={18} />
              </button>
            </div>

            <button
              type="button"
              className="workspace-switcher"
              onClick={() =>
                notify(
                  "Workspace switching will be available when accounts are connected."
                )
              }
            >
              <span className="workspace-avatar">G</span>
              <span className="workspace-copy">
                <strong>Green Basket Store</strong>
                <small>Starter workspace</small>
              </span>
              <ChevronDown size={15} />
            </button>

            <div className="sidebar-scroll">
              {navigation.map((group) => (
                <div className="nav-group" key={group.section}>
                  <div className="nav-section-label">
                    {group.section}
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
                        <span>{item.label}</span>

                        {item.badge && (
                          <span className="nav-badge">
                            {item.badge}
                          </span>
                        )}

                        {item.special && (
                          <span className="nav-new">
                            <Sparkles size={11} /> AI
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}

              <div className="nav-group">
                <div className="nav-section-label">Data &amp; tools</div>

                <button
                  type="button"
                  className="nav-item"
                  onClick={() => {
                    setSidebarOpen(false);
                    setUploadOpen(true);
                  }}
                >
                  <ArrowUpRight size={18} />
                  <span>Import data</span>
                </button>

                <button
                  type="button"
                  className={`nav-item ${page === "help" ? "active" : ""
                    }`}
                  aria-current={page === "help" ? "page" : undefined}
                  onClick={() => navigate("help")}
                >
                  <CircleHelp size={18} />
                  <span>Help centre</span>
                </button>
              </div>
            </div>

            <div className="sidebar-bottom">
              <div className="plan-card">
                <div className="plan-card-top">
                  {/* <span className="plan-spark">
                    <Sparkles size={14} />
                  </span> */}
                  <span>Your business, better</span>
                </div>

                <strong>Make data your advantage.</strong>
                <p>Let every decision start with clarity.</p>

                <button
                  type="button"
                  onClick={() => navigate("chat")}
                >
                  Explore AI assistant <ArrowUpRight size={14} />
                </button>
              </div>

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
                <span>Settings</span>
              </button>

              <div className="profile-row">
                <span className="profile-avatar">{initials}</span>

                <span className="profile-copy">
                  <strong>{demoUser.name}</strong>
                  <small>Business owner</small>
                </span>

                <button
                  type="button"
                  className="icon-button"
                  onClick={() =>
                    navigate("settings")
                  }
                  aria-label="Open profile and settings"
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
                  aria-label="Open navigation"
                >
                  <Menu size={20} />
                </button>

                <div className="breadcrumbs">
                  <span>Workspace</span>
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
                    placeholder="Search anything..."
                    aria-label="Search anything"
                  />

                  <kbd>{shortcutLabel}</kbd>
                </label>

                <span
                  className={`connection-status ${apiStatus}`}
                  title={
                    apiStatus === "online"
                      ? "Backend connected"
                      : "Backend not connected; using demo data"
                  }
                >
                  <i />
                  {apiStatus === "online"
                    ? "API connected"
                    : apiStatus === "checking"
                      ? "Connecting…"
                      : "Demo mode"}
                </span>

                <div className="notification-wrap" ref={notifRef}>
                  <button
                    type="button"
                    className={`icon-button notification-button ${notificationsOpen ? "selected" : ""
                      }`}
                    onClick={() =>
                      setNotificationsOpen((open) => !open)
                    }
                    aria-label="Notifications"
                    aria-expanded={notificationsOpen}
                  >
                    <Bell size={19} />
                    <i />
                  </button>

                  {notificationsOpen && (
                    <div className="notification-popover">
                      <div className="popover-heading">
                        <strong>Notifications</strong>
                        <span>{alerts.length} new</span>
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
                        View all alerts <ArrowUpRight size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="topbar-avatar"
                  onClick={() => navigate("settings")}
                  aria-label="Open account settings"
                  title="Account settings"
                >
                  {initials}
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
                  {new Date().toLocaleDateString("en-KE", {
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
                  Import data
                </button>
              </div>
            </div>

            {search.trim() && (
              <div className="search-results-strip" role="status">
                <Search size={15} />
                Search is ready for product and inventory views.

                <button
                  type="button"
                  onClick={() => navigate("products")}
                >
                  Search products for “{search}”
                </button>

                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
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
                    />
                  )}

                  {page === "inventory" && <Inventory />}
                  {page === "products" && <Products />}
                  {page === "chat" && <Chat />}
                  {page === "reports" && <Reports />}
                  {page === "settings" && <Settings />}
                  {page === "help" && <HelpCentre />}
                </Suspense>
              </div>
            </div>

            <footer className="app-footer">
              <span>© 2026 BizPilot</span>
              <span>
                <i className="footer-dot" />
                Built for clearer business decisions
              </span>
              <span className="footer-demo">
                Preview · Sample business data
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
                    <span className="eyebrow">Get started</span>
                    <h2 id="upload-title">
                      Import your business data
                    </h2>
                    <p>
                      Bring your sales or inventory records into BizPilot.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setUploadOpen(false)}
                    aria-label="Close upload dialog"
                  >
                    <X size={19} />
                  </button>
                </div>

                <UploadBox
                  onFile={(file) =>
                    notify(
                      `${file.name} selected — upload API is not connected yet.`
                    )
                  }
                />

                <div className="modal-hint">
                  <CircleHelp size={15} />
                  <span>
                    CSV and Excel import will be connected once the backend
                    upload route is implemented.
                  </span>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => setUploadOpen(false)}
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => {
                      setUploadOpen(false);
                      notify(
                        "Sample data is already loaded for your preview."
                      );
                    }}
                  >
                    Continue with sample data
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
                aria-label="Dismiss notification"
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
            Business intelligence for your shop
          </div>

          <div className="boot-bar">
            <i />
          </div>
        </div>
      )}
    </>
  );
}

