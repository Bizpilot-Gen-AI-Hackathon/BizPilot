
import React, { useMemo, useState } from "react";
import {
    ArrowRight,
    BookOpen,
    CheckCircle2,
    ChevronDown,
    CircleHelp,
    FileSpreadsheet,
    LayoutDashboard,
    Mail,
    MessageCircle,
    Package,
    Search,
    ShieldCheck,
    Sparkles,
    X,
} from "lucide-react";

const categories = [
    { id: "all", label: "All topics", Icon: BookOpen, description: "Explore every help article" },
    { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard, description: "Understand your overview" },
    { id: "inventory", label: "Inventory", Icon: Package, description: "Manage your products" },
    { id: "data", label: "Data & reports", Icon: FileSpreadsheet, description: "Files, reports and insights" },
    { id: "account", label: "Account & privacy", Icon: ShieldCheck, description: "Settings and account security" },
];

const faqs = [
    {
        id: 1,
        category: "dashboard",
        question: "What can I do from the dashboard?",
        answer:
            "The dashboard gives you a quick overview of your business metrics, recent activity, and alerts. The information shown depends on the data currently available in your BizPilot demo.",
    },
    {
        id: 2,
        category: "inventory",
        question: "How do I keep track of my products?",
        answer:
            "Open Inventory or Products from the main navigation. Use the available controls to review and manage product information. Whether changes persist after refreshing depends on whether your current app is connected to a backend.",
    },
    {
        id: 3,
        category: "data",
        question: "Which files can I upload?",
        answer:
            "The current upload interface accepts CSV, XLS, and XLSX files, with a 10 MB limit. File selection and the progress animation are frontend features; a working server upload and data import require a connected backend.",
    },
    {
        id: 4,
        category: "data",
        question: "Why might my charts show sample information?",
        answer:
            "BizPilot may use demo or mock data while the backend is being developed. Check the data source used by the relevant page before relying on a chart for business decisions.",
    },
    {
        id: 5,
        category: "account",
        question: "Where are my settings saved?",
        answer:
            "The current Settings page stores preferences in localStorage in your browser. They do not automatically follow you to another browser or device, and clearing browser data may remove them.",
    },
    {
        id: 6,
        category: "account",
        question: "Are notification emails sent automatically?",
        answer:
            "Not yet. The current notification switches store your preferences locally. Sending real emails or scheduled reports requires a backend service and appropriate configuration.",
    },
    {
        id: 7,
        category: "dashboard",
        question: "What should I do if a page does not load?",
        answer:
            "Refresh the page first. If the issue continues, check the browser console and terminal for errors. If you contact support, include the page name, the action you took, and the error message. Never share passwords or secret keys.",
    },
    {
        id: 8,
        category: "data",
        question: "Can I export my reports?",
        answer:
            "Export options depend on the controls implemented in the Reports page. If an export button is not available there, report exporting has not yet been connected in the current version.",
    },
];

const styles = `
    @keyframes hpFadeUp {
        from { opacity: 0; transform: translateY(18px); }
        to { opacity: 1; transform: translateY(0); }
    }

    @keyframes hpFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes hpFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-7px); }
    }

    @keyframes hpShimmer {
        0% { background-position: 0% 50%; }
        100% { background-position: 200% 50%; }
    }

    @keyframes hpPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(14, 156, 107, .15); }
        50% { box-shadow: 0 0 0 7px rgba(14, 156, 107, 0); }
    }

    .hp-root {
        --hp-green: #0e9c6b;
        --hp-dark: #173d30;
        --hp-muted: #738078;
        --hp-border: #e6ece7;
        --hp-surface: #ffffff;
        --hp-soft: #f5f8f5;
        width: 100%;
        max-width: 1240px;
        margin: 0 auto;
        padding: 30px;
        color: #20362b;
        font-family: inherit;
        animation: hpFadeIn .45s ease both;
    }

    .hp-root * { box-sizing: border-box; }

    .hp-hero {
        position: relative;
        isolation: isolate;
        overflow: hidden;
        padding: clamp(30px, 5vw, 58px);
        border: 1px solid rgba(255,255,255,.1);
        border-radius: 28px;
        background: linear-gradient(125deg, #173d30 0%, #145b42 55%, #0e7653 100%);
        color: #fff;
        animation: hpFadeUp .6s cubic-bezier(.2,.7,.2,1) both;
    }

    .hp-hero::before {
        content: "";
        position: absolute;
        z-index: -1;
        width: 330px;
        height: 330px;
        right: -90px;
        top: -170px;
        border-radius: 50%;
        border: 1px solid rgba(255,255,255,.17);
        box-shadow: 0 0 0 35px rgba(255,255,255,.035),
                    0 0 0 75px rgba(255,255,255,.025);
        pointer-events: none;
    }

    .hp-hero::after {
        content: "";
        position: absolute;
        z-index: -1;
        width: 180px;
        height: 180px;
        right: 16%;
        bottom: -140px;
        border-radius: 50%;
        background: rgba(100, 230, 173, .13);
        filter: blur(4px);
        pointer-events: none;
    }

    .hp-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border: 1px solid rgba(255,255,255,.19);
        border-radius: 999px;
        background: rgba(255,255,255,.09);
        color: #d5f5e4;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 1.35px;
    }

    .hp-eyebrow svg { animation: hpFloat 3.5s ease-in-out infinite; }

    .hp-hero h1 {
        max-width: 720px;
        margin: 22px 0 12px;
        font-size: clamp(34px, 5vw, 53px);
        line-height: 1.08;
        letter-spacing: -1.9px;
        font-weight: 800;
    }

    .hp-hero h1 span {
        color: #8ce8ba;
        background: linear-gradient(90deg, #b6f6d3, #70dca9, #b6f6d3);
        background-size: 200% auto;
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: hpShimmer 5s linear infinite;
    }

    .hp-hero-copy {
        max-width: 560px;
        margin: 0;
        color: rgba(255,255,255,.76);
        font-size: 15px;
        line-height: 1.8;
    }

    .hp-search {
        display: flex;
        align-items: center;
        gap: 12px;
        width: min(100%, 600px);
        min-height: 58px;
        margin-top: 29px;
        padding: 0 17px;
        border: 1px solid rgba(255,255,255,.23);
        border-radius: 15px;
        background: rgba(255,255,255,.97);
        color: #75847a;
        box-shadow: 0 12px 35px rgba(0,0,0,.12);
        transition: box-shadow .2s ease, transform .2s ease;
    }

    .hp-search:focus-within {
        box-shadow: 0 0 0 4px rgba(140,232,186,.23), 0 15px 40px rgba(0,0,0,.13);
        transform: translateY(-2px);
    }

    .hp-search input {
        flex: 1;
        min-width: 0;
        padding: 17px 0;
        border: 0;
        outline: none;
        background: transparent;
        color: #20362b;
        font: inherit;
        font-size: 14px;
    }

    .hp-search input::placeholder { color: #9aa59d; }

    .hp-clear {
        border: 0;
        background: transparent;
        color: var(--hp-green);
        font-size: 12px;
        font-weight: 750;
        cursor: pointer;
    }

    .hp-search-hint {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-top: 13px;
        color: rgba(255,255,255,.67);
        font-size: 11px;
    }

    .hp-content {
        display: grid;
        grid-template-columns: minmax(220px, 275px) minmax(0, 1fr);
        align-items: start;
        gap: 30px;
        margin-top: 34px;
    }

    .hp-sidebar, .hp-main {
        min-width: 0;
        animation: hpFadeUp .55s ease both;
    }

    .hp-sidebar { animation-delay: .08s; }
    .hp-main { animation-delay: .15s; }

    .hp-section-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin: 0 0 17px;
    }

    .hp-section-heading h2 {
        margin: 0;
        color: #20362b;
        font-size: 17px;
        font-weight: 800;
        letter-spacing: -.4px;
    }

    .hp-count {
        flex-shrink: 0;
        padding: 5px 9px;
        border: 1px solid var(--hp-border);
        border-radius: 8px;
        background: #fff;
        color: #77857b;
        font-size: 11px;
        font-weight: 700;
    }

    .hp-category-list {
        display: grid;
        gap: 9px;
    }

    .hp-category {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        min-height: 63px;
        padding: 12px;
        border: 1px solid var(--hp-border);
        border-radius: 14px;
        background: var(--hp-surface);
        color: #4e6055;
        text-align: left;
        cursor: pointer;
        transition: transform .2s ease, border-color .2s ease, background .2s ease, box-shadow .2s ease;
    }

    .hp-category:hover {
        transform: translateX(3px);
        border-color: #b9dfc9;
        box-shadow: 0 6px 18px rgba(25,67,47,.05);
    }

    .hp-category.is-active {
        border-color: #b8e3ca;
        background: linear-gradient(110deg, #edf9f1, #f8fcf9);
        color: var(--hp-dark);
        box-shadow: inset 3px 0 0 var(--hp-green);
    }

    .hp-category-icon {
        display: grid;
        flex-shrink: 0;
        width: 37px;
        height: 37px;
        place-items: center;
        border-radius: 11px;
        background: #f1f5f1;
        color: #667b6c;
        transition: background .2s ease, color .2s ease, transform .2s ease;
    }

    .hp-category.is-active .hp-category-icon {
        background: #d9f2e3;
        color: #08764d;
        transform: scale(1.04);
    }

    .hp-category-label {
        flex: 1;
        min-width: 0;
        font-size: 12px;
        font-weight: 750;
    }

    .hp-category-arrow {
        flex-shrink: 0;
        color: #a6b2a9;
        transition: transform .2s ease, color .2s ease;
    }

    .hp-category:hover .hp-category-arrow,
    .hp-category.is-active .hp-category-arrow {
        transform: translateX(3px);
        color: var(--hp-green);
    }

    .hp-sidebar-note {
        display: flex;
        align-items: flex-start;
        gap: 11px;
        margin-top: 18px;
        padding: 16px;
        border: 1px solid #e4eee6;
        border-radius: 15px;
        background: #f7faf7;
    }

    .hp-sidebar-note svg {
        flex-shrink: 0;
        margin-top: 2px;
        color: var(--hp-green);
    }

    .hp-sidebar-note strong {
        display: block;
        margin-bottom: 5px;
        color: #345342;
        font-size: 12px;
    }

    .hp-sidebar-note p {
        margin: 0;
        color: #7b897f;
        font-size: 11px;
        line-height: 1.7;
    }

    .hp-faq-subtitle {
        margin: 6px 0 0;
        color: var(--hp-muted);
        font-size: 12px;
        line-height: 1.6;
    }

    .hp-heading-icon {
        display: grid;
        flex-shrink: 0;
        width: 43px;
        height: 43px;
        place-items: center;
        border: 1px solid #dcefe2;
        border-radius: 13px;
        background: #eff9f2;
        color: var(--hp-green);
        animation: hpPulse 3s ease-in-out infinite;
    }

    .hp-results {
        margin: 20px 0 12px;
        color: #8a978d;
        font-size: 11px;
    }

    .hp-faq-list {
        display: grid;
        gap: 11px;
    }

    .hp-faq {
        overflow: hidden;
        border: 1px solid var(--hp-border);
        border-radius: 15px;
        background: var(--hp-surface);
        transition: border-color .25s ease, box-shadow .25s ease, transform .25s ease;
        animation: hpFadeUp .35s ease both;
    }

    .hp-faq:hover {
        border-color: #d1e5d7;
        box-shadow: 0 7px 22px rgba(31,67,46,.045);
    }

    .hp-faq.is-open {
        border-color: #cce6d4;
        box-shadow: 0 8px 26px rgba(31,67,46,.055);
    }

    .hp-faq-question {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        width: 100%;
        padding: 20px;
        border: 0;
        background: transparent;
        color: #294234;
        text-align: left;
        font: inherit;
        font-size: 13px;
        font-weight: 750;
        line-height: 1.6;
        cursor: pointer;
    }

    .hp-faq-question > span { flex: 1; }

    .hp-faq-chevron {
        flex-shrink: 0;
        color: #829087;
        transition: transform .25s ease, color .25s ease;
    }

    .hp-faq.is-open .hp-faq-chevron {
        transform: rotate(180deg);
        color: var(--hp-green);
    }

    .hp-faq-answer {
        display: grid;
        grid-template-rows: 1fr;
        animation: hpFadeIn .25s ease both;
    }

    .hp-faq-answer-inner {
        overflow: hidden;
        padding: 0 20px 20px;
    }

    .hp-faq-answer p {
        margin: 0;
        padding-top: 14px;
        border-top: 1px solid #edf1ed;
        color: #718076;
        font-size: 12px;
        line-height: 1.9;
    }

    .hp-no-results {
        display: flex;
        align-items: center;
        flex-direction: column;
        padding: 42px 20px;
        border: 1px dashed #d5e3d8;
        border-radius: 18px;
        background: #fafcf9;
        text-align: center;
        animation: hpFadeUp .35s ease both;
    }

    .hp-no-results-icon {
        display: grid;
        width: 52px;
        height: 52px;
        margin-bottom: 15px;
        place-items: center;
        border-radius: 16px;
        background: #eaf6ee;
        color: var(--hp-green);
    }

    .hp-no-results strong { color: #294234; font-size: 14px; }
    .hp-no-results p { margin: 8px 0 17px; color: #829087; font-size: 12px; }

    .hp-reset {
        padding: 10px 15px;
        border: 1px solid #cfe5d5;
        border-radius: 10px;
        background: #fff;
        color: #187b52;
        font: inherit;
        font-size: 12px;
        font-weight: 750;
        cursor: pointer;
        transition: background .2s ease, transform .2s ease;
    }

    .hp-reset:hover { transform: translateY(-2px); background: #eff9f2; }

    .hp-contact {
        display: flex;
        align-items: center;
        gap: 19px;
        margin-top: 34px;
        padding: 25px;
        border: 1px solid #dcebe0;
        border-radius: 20px;
        background: linear-gradient(110deg, #f4faf5 0%, #ffffff 100%);
        animation: hpFadeUp .6s .2s ease both;
    }

    .hp-contact-icon {
        display: grid;
        flex-shrink: 0;
        width: 54px;
        height: 54px;
        place-items: center;
        border-radius: 16px;
        background: #dff4e6;
        color: #118154;
        transition: transform .25s ease;
    }

    .hp-contact:hover .hp-contact-icon { transform: rotate(-5deg) scale(1.04); }

    .hp-contact-copy { flex: 1; min-width: 0; }

    .hp-contact-copy h2 {
        margin: 0 0 6px;
        color: #203b2b;
        font-size: 16px;
        font-weight: 800;
    }

    .hp-contact-copy p {
        margin: 0;
        color: #77877b;
        font-size: 12px;
        line-height: 1.7;
    }

    .hp-contact-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        flex-shrink: 0;
        padding: 13px 16px;
        border: 1px solid #0e9c6b;
        border-radius: 12px;
        background: #0e9c6b;
        color: #fff;
        text-decoration: none;
        font-size: 12px;
        font-weight: 750;
        box-shadow: 0 5px 13px rgba(14,156,107,.13);
        transition: transform .2s ease, background .2s ease, box-shadow .2s ease;
    }

    .hp-contact-button:hover {
        transform: translateY(-2px);
        background: #087d53;
        box-shadow: 0 9px 20px rgba(14,156,107,.2);
    }

    .hp-disclaimer {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin: 22px 0 0;
        color: #96a198;
        font-size: 10px;
        line-height: 1.8;
    }

    .hp-disclaimer svg { flex-shrink: 0; margin-top: 2px; }

    @media (max-width: 900px) {
        .hp-root { padding: 22px; }
        .hp-content { grid-template-columns: 1fr; gap: 28px; }
        .hp-category-list {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .hp-sidebar-note { display: none; }
    }

    @media (max-width: 560px) {
        .hp-root { padding: 14px; }
        .hp-hero { padding: 27px 21px; border-radius: 21px; }
        .hp-hero h1 { font-size: 35px; letter-spacing: -1.3px; }
        .hp-hero-copy { font-size: 13px; }
        .hp-search { min-height: 53px; margin-top: 23px; padding: 0 13px; }
        .hp-search input { font-size: 13px; }
        .hp-category-list { grid-template-columns: 1fr; gap: 8px; }
        .hp-category { min-height: 55px; }
        .hp-section-heading h2 { font-size: 15px; }
        .hp-faq-question { padding: 17px 15px; font-size: 12px; }
        .hp-faq-answer-inner { padding: 0 15px 17px; }
        .hp-faq-answer p { font-size: 11px; }
        .hp-contact { align-items: flex-start; flex-wrap: wrap; padding: 19px; gap: 13px; }
        .hp-contact-icon { width: 45px; height: 45px; border-radius: 13px; }
        .hp-contact-copy { flex-basis: calc(100% - 60px); }
        .hp-contact-button { width: 100%; }
    }

    @media (prefers-reduced-motion: reduce) {
        .hp-root *, .hp-root *::before, .hp-root *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: .01ms !important;
        }
    }
`;

export default function HelpCentre() {
    const [search, setSearch] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [openFaq, setOpenFaq] = useState(1);

    const filteredFaqs = useMemo(() => {
        const term = search.trim().toLowerCase();

        return faqs.filter((faq) => {
            const matchesCategory =
                activeCategory === "all" || faq.category === activeCategory;

            const matchesSearch =
                !term ||
                faq.question.toLowerCase().includes(term) ||
                faq.answer.toLowerCase().includes(term);

            return matchesCategory && matchesSearch;
        });
    }, [search, activeCategory]);

    function selectCategory(category) {
        setActiveCategory(category);
        setOpenFaq(null);
    }

    function clearFilters() {
        setSearch("");
        setActiveCategory("all");
        setOpenFaq(1);
    }

    return (
        <>
            <style>{styles}</style>

            <main className="hp-root">
                <section className="hp-hero">
                    <span className="hp-eyebrow">
                        {/* <Sparkles size={15} /> */}
                        BIZPILOT SUPPORT
                    </span>

                    <h1>
                        How can we <span>help?</span>
                    </h1>

                    <p className="hp-hero-copy">
                        Find answers, learn how BizPilot works, and get back to
                        running your business with confidence.
                    </p>

                    <label className="hp-search">
                        <Search size={19} aria-hidden="true" />
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setOpenFaq(null);
                            }}
                            placeholder="Search for an answer..."
                            aria-label="Search help articles"
                        />

                        {search && (
                            <button
                                type="button"
                                className="hp-clear"
                                onClick={() => setSearch("")}
                                aria-label="Clear search"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </label>

                    <div className="hp-search-hint">
                        <CheckCircle2 size={13} />
                        {faqs.length} helpful answers · Search by keyword or topic
                    </div>
                </section>

                <div className="hp-content">
                    <aside className="hp-sidebar">
                        <div className="hp-section-heading">
                            <h2>Browse topics</h2>
                            <span className="hp-count">{categories.length} topics</span>
                        </div>

                        <div className="hp-category-list">
                            {categories.map(({ id, label, Icon, description }) => (
                                <button
                                    type="button"
                                    key={id}
                                    className={`hp-category ${activeCategory === id ? "is-active" : ""}`}
                                    onClick={() => selectCategory(id)}
                                    aria-pressed={activeCategory === id}
                                    title={description}
                                >
                                    <span className="hp-category-icon">
                                        <Icon size={18} />
                                    </span>
                                    <span className="hp-category-label">{label}</span>
                                    <ArrowRight size={15} className="hp-category-arrow" />
                                </button>
                            ))}
                        </div>

                        <div className="hp-sidebar-note">
                            <ShieldCheck size={19} />
                            <div>
                                <strong>Your data matters</strong>
                                <p>
                                    Never share passwords, private customer information,
                                    or secret API keys when asking for help.
                                </p>
                            </div>
                        </div>
                    </aside>

                    <section className="hp-main">
                        <div className="hp-section-heading">
                            <div>
                                <h2>Frequently asked questions</h2>
                                <p className="hp-faq-subtitle">
                                    Straightforward answers to common questions.
                                </p>
                            </div>
                            <span className="hp-heading-icon">
                                <CircleHelp size={22} />
                            </span>
                        </div>

                        <div className="hp-results" aria-live="polite">
                            Showing {filteredFaqs.length} of {faqs.length} articles
                            {activeCategory !== "all"
                                ? ` · ${categories.find((item) => item.id === activeCategory)?.label}`
                                : ""}
                            {search.trim() ? ` · Search: "${search.trim()}"` : ""}
                        </div>

                        <div className="hp-faq-list">
                            {filteredFaqs.length ? (
                                filteredFaqs.map((faq, index) => {
                                    const isOpen = openFaq === faq.id;

                                    return (
                                        <article
                                            className={`hp-faq ${isOpen ? "is-open" : ""}`}
                                            key={faq.id}
                                            style={{ animationDelay: `${index * 45}ms` }}
                                        >
                                            <button
                                                type="button"
                                                className="hp-faq-question"
                                                onClick={() =>
                                                    setOpenFaq(isOpen ? null : faq.id)
                                                }
                                                aria-expanded={isOpen}
                                            >
                                                <span>{faq.question}</span>
                                                <ChevronDown
                                                    size={18}
                                                    className="hp-faq-chevron"
                                                />
                                            </button>

                                            {isOpen && (
                                                <div className="hp-faq-answer">
                                                    <div className="hp-faq-answer-inner">
                                                        <p>{faq.answer}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </article>
                                    );
                                })
                            ) : (
                                <div className="hp-no-results">
                                    <span className="hp-no-results-icon">
                                        <Search size={23} />
                                    </span>
                                    <strong>No matching answers</strong>
                                    <p>
                                        Try another search term or choose a different topic.
                                    </p>
                                    <button
                                        type="button"
                                        className="hp-reset"
                                        onClick={clearFilters}
                                    >
                                        Clear filters
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                <section className="hp-contact">
                    <span className="hp-contact-icon">
                        <MessageCircle size={23} />
                    </span>

                    <div className="hp-contact-copy">
                        <h2>Still need a hand?</h2>
                        <p>
                            Reach out to the BizPilot team and explain what you need help with.
                        </p>
                    </div>

                    <a
                        className="hp-contact-button"
                        href="mailto:support@bizpilot.example?subject=BizPilot%20support%20request"
                    >
                        <Mail size={16} />
                        Contact support
                        <ArrowRight size={15} />
                    </a>
                </section>

                <p className="hp-disclaimer">
                    <ShieldCheck size={13} />
                    Help articles describe the current frontend experience. Some features
                    require backend integration before they can be used in production.
                </p>
            </main>
        </>
    );
}
