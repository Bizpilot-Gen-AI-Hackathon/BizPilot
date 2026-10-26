import { useEffect, useMemo, useState } from "react";
import MessageComposer from "../components/MessageComposer";
import {
    formatDateTime,
    formatStatus,
    getStatusClass,
} from "../utils/formatters";

/* ====================================================================
   Messages
   Connections are unchanged:
   - props: messages, recipients, onPrepareMessage, onMarkMessageSent
   - <MessageComposer recipients onSend={handlePrepareMessage} />
   - onPrepareMessage(messageData)
   - onMarkMessageSent(message.id)  (still asks for confirmation first)
   - formatters: formatDateTime, formatStatus, getStatusClass
   New (all derived from the messages prop, nothing persisted):
   - Channel + status chips with live counts, sort, day grouping, paging
   - Channel mix bar, delivery summary, relative times
   - Message drawer with full text, character / SMS-part counter
   - "Open in WhatsApp / SMS / Email" helper links (they do NOT change
     the recorded status; "Mark as sent" is still the only way to do that)
   - Copy message, export CSV, Esc to close, dismissible banners
   ==================================================================== */

const CHANNELS = [
    ["All", "All channels"],
    ["sms", "SMS"],
    ["whatsapp", "WhatsApp"],
    ["email", "Email"],
];

const STATUSES = ["All", "Draft", "Pending", "Sent", "Failed"];

const SORTS = [
    ["newest", "Newest first"],
    ["oldest", "Oldest first"],
    ["recipient", "Recipient A–Z"],
];

const PAGE_SIZE = 12;

const AVATAR_COLORS = [
    ["#e3f4ea", "#12683f"], ["#e5eefb", "#2c5a9e"], ["#fdeede", "#a35a14"],
    ["#f0e9fb", "#6a46a8"], ["#fde8ea", "#b23a48"], ["#e1f4f4", "#17727a"],
];

function avatarColors(name = "") {
    let hash = 0;
    for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function initials(name = "") {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "#";
    return (
        (parts[0][0] || "") +
        (parts.length > 1 ? parts[parts.length - 1][0] : "")
    ).toUpperCase();
}

function Avatar({ name, size = 42 }) {
    const [bg, fg] = avatarColors(name);
    return (
        <span
            className="msg-avatar"
            style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.38 }}
            aria-hidden="true"
        >
            {initials(name)}
        </span>
    );
}

function channelKey(message) {
    return String(message?.channel ?? "").toLowerCase();
}

function statusKey(message) {
    return String(message?.status ?? "").toLowerCase();
}

function channelBadge(channel) {
    const key = String(channel ?? "").toLowerCase();
    if (key === "whatsapp") return { short: "WA", cls: "wa" };
    if (key === "email") return { short: "@", cls: "em" };
    if (key === "sms") return { short: "SMS", cls: "sm" };
    return { short: "•", cls: "" };
}

function getTime(message) {
    const raw = message?.createdAt ?? message?.timestamp;
    const t = raw ? new Date(raw).getTime() : 0;
    return Number.isFinite(t) ? t : 0;
}

function dayLabel(ts) {
    if (!ts) return "Undated";
    const d = new Date(ts);
    const today = new Date();
    const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((startOf(today) - startOf(d)) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short", year: "numeric" });
}

function relativeTime(ts) {
    if (!ts) return "";
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return "Just now";
    if (min < 60) return `${min} min ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hr ago`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
    return "";
}

/* SMS parts: 160 chars for one part, 153 per part when joined (GSM-7 estimate) */
function smsParts(text = "") {
    const len = text.length;
    if (len === 0) return 0;
    return len <= 160 ? 1 : Math.ceil(len / 153);
}

export default function Messages({
    messages = [],
    recipients = [],
    onPrepareMessage,
    onMarkMessageSent,
}) {
    const [search, setSearch] = useState("");
    const [channelFilter, setChannelFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [sortBy, setSortBy] = useState("newest");
    const [visible, setVisible] = useState(PAGE_SIZE);
    const [showComposer, setShowComposer] = useState(false);
    const [selected, setSelected] = useState(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const safeMessages = Array.isArray(messages) ? messages : [];

    /* ================================================================
       Derived data
       ================================================================ */

    const filteredMessages = useMemo(() => {
        const query = search.trim().toLowerCase();

        const list = safeMessages.filter((message) => {
            const searchableText = [
                message.recipient,
                message.subject,
                message.message,
                message.channel,
                message.status,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch = searchableText.includes(query);
            const matchesChannel =
                channelFilter === "All" ||
                String(message.channel ?? "").toLowerCase() ===
                channelFilter.toLowerCase();
            const matchesStatus =
                statusFilter === "All" ||
                String(message.status ?? "").toLowerCase() ===
                statusFilter.toLowerCase();

            return matchesSearch && matchesChannel && matchesStatus;
        });

        return [...list].sort((a, b) => {
            if (sortBy === "oldest") return getTime(a) - getTime(b);
            if (sortBy === "recipient") return String(a.recipient ?? "").localeCompare(String(b.recipient ?? ""));
            return getTime(b) - getTime(a);
        });
    }, [safeMessages, search, channelFilter, statusFilter, sortBy]);

    const draftCount = safeMessages.filter((m) => statusKey(m) === "draft").length;
    const sentCount = safeMessages.filter((m) => statusKey(m) === "sent").length;
    const failedCount = safeMessages.filter((m) => statusKey(m) === "failed").length;
    const pendingCount = safeMessages.filter((m) => statusKey(m) === "pending").length;

    const channelCount = (channel) =>
        safeMessages.filter((m) => channelKey(m) === channel).length;

    const channelCounts = {
        All: safeMessages.length,
        sms: channelCount("sms"),
        whatsapp: channelCount("whatsapp"),
        email: channelCount("email"),
    };

    const statusCounts = {
        All: safeMessages.length,
        Draft: draftCount,
        Pending: pendingCount,
        Sent: sentCount,
        Failed: failedCount,
    };

    const sentRate = safeMessages.length
        ? Math.round((sentCount / safeMessages.length) * 100)
        : 0;

    const shown = filteredMessages.slice(0, visible);

    const groups = useMemo(() => {
        const out = [];
        if (sortBy === "recipient") {
            out.push({ label: "A–Z", items: shown });
            return out;
        }
        shown.forEach((m) => {
            const label = dayLabel(getTime(m));
            const last = out[out.length - 1];
            if (last && last.label === label) last.items.push(m);
            else out.push({ label, items: [m] });
        });
        return out;
    }, [shown, sortBy]);

    /* ================================================================
       Handlers (same contracts)
       ================================================================ */

    function handlePrepareMessage(messageData) {
        setError("");
        setSuccess("");

        if (typeof onPrepareMessage !== "function") {
            setError("Message preparation is not connected to the workspace.");
            return false;
        }

        const result = onPrepareMessage(messageData);

        if (result === null || result === false) {
            setError("The message could not be saved. Please check the details.");
            return false;
        }

        setShowComposer(false);
        setSuccess("Message saved to the workspace.");
        return result;
    }

    function handleMarkSent(message) {
        setError("");
        setSuccess("");

        if (typeof onMarkMessageSent !== "function") {
            setError("Message status updates are not connected.");
            return;
        }

        const confirmed = window.confirm(
            "Mark this message as sent? This only updates its recorded status and does not send the message."
        );

        if (!confirmed) return;

        const result = onMarkMessageSent(message.id);

        if (result === false || result === null) {
            setError("The message status could not be updated.");
            return;
        }

        setSelected(null);
        setSuccess(
            "The message record was updated. No message was sent by this action."
        );
    }

    /* ---------- new helpers: copy, export, open-in-channel ---------- */

    async function copyMessage(message) {
        const text = [message.subject, message.message].filter(Boolean).join("\n\n");
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const area = document.createElement("textarea");
                area.value = text;
                area.style.position = "fixed";
                area.style.opacity = "0";
                document.body.appendChild(area);
                area.select();
                document.execCommand("copy");
                area.remove();
            }
            setError("");
            setSuccess("Message text copied to clipboard.");
        } catch {
            setError("Could not copy the message. Please select and copy it manually.");
        }
    }

    function exportCsv() {
        if (!filteredMessages.length) {
            setError("There are no messages to export for the current filters.");
            return;
        }

        const cell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
        const lines = [
            ["Recipient", "Channel", "Status", "Subject", "Message", "Created"],
            ...filteredMessages.map((m) => [
                m.recipient || "",
                m.channel || "",
                m.status || "",
                m.subject || "",
                m.message || "",
                m.createdAt ?? m.timestamp ?? "",
            ]),
        ];

        const csv = `\uFEFF${lines.map((l) => l.map(cell).join(",")).join("\r\n")}`;
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `Messages-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        setError("");
        setSuccess(`Exported ${filteredMessages.length} message${filteredMessages.length === 1 ? "" : "s"} to CSV.`);
    }

    /* Find contact details for a message recipient (defensive: unknown shapes) */
    function resolveContact(message) {
        const raw = String(message?.recipient ?? "").trim();
        const list = Array.isArray(recipients) ? recipients : [];

        const match = list.find((r) => {
            if (typeof r === "string") return r.toLowerCase() === raw.toLowerCase();
            return [r?.name, r?.label, r?.phone, r?.email, r?.contactName]
                .filter(Boolean)
                .some((v) => String(v).toLowerCase() === raw.toLowerCase());
        });

        const obj = match && typeof match === "object" ? match : {};
        const phone = obj.phone || obj.phoneNumber || (/^[\d+\s()-]{7,}$/.test(raw) ? raw : "");
        const email = obj.email || (raw.includes("@") ? raw : "");
        return { phone: String(phone || ""), email: String(email || "") };
    }

    function phoneDigits(phone) {
        return String(phone).replace(/[^\d]/g, "").replace(/^0/, "254");
    }

    function openInChannel(message) {
        const key = channelKey(message);
        const { phone, email } = resolveContact(message);
        const body = message.message || "";
        setError("");

        if (key === "whatsapp") {
            const digits = phoneDigits(phone);
            const base = digits ? `https://wa.me/${digits}` : "https://wa.me/";
            window.open(`${base}?text=${encodeURIComponent(body)}`, "_blank", "noopener,noreferrer");
            setSuccess("WhatsApp opened with this message. Sending it there does not update the record; use “Mark as sent” afterwards.");
            return;
        }

        if (key === "sms") {
            window.location.href = `sms:${phone}?&body=${encodeURIComponent(body)}`;
            setSuccess("Your messaging app was opened. Use “Mark as sent” afterwards to update the record.");
            return;
        }

        if (key === "email") {
            window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(message.subject || "")}&body=${encodeURIComponent(body)}`;
            setSuccess("Your mail app was opened. Use “Mark as sent” afterwards to update the record.");
            return;
        }

        setError("This message has no recognised channel to open.");
    }

    function openLabel(message) {
        const key = channelKey(message);
        if (key === "whatsapp") return "Open in WhatsApp";
        if (key === "sms") return "Open in SMS app";
        if (key === "email") return "Open in email";
        return null;
    }

    useEffect(() => {
        function onKey(event) {
            if (event.key === "Escape") setSelected(null);
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    /* ================================================================
       Render
       ================================================================ */

    const mixTotal = Math.max(1, channelCounts.sms + channelCounts.whatsapp + channelCounts.email);
    const hasFilters = search || channelFilter !== "All" || statusFilter !== "All";

    function MessageStatus({ message }) {
        return (
            <span className={`oh-status oh-status-${getStatusClass(message.status)} msg-pill`}>
                {formatStatus(message.status)}
            </span>
        );
    }

    return (
        <div className="oh-page oh-messages msg">
            <style>{msgStyles}</style>

            {/* ---------------- header ---------------- */}
            <section className="oh-page-intro">
                <div>
                    <p className="oh-eyebrow">CUSTOMER COMMUNICATIONS</p>
                    <h2>Messages</h2>
                    <p>
                        Prepare customer and supplier communications, organize
                        message records, and review their recorded statuses.
                    </p>
                </div>

                <button
                    type="button"
                    className="oh-button oh-button-primary"
                    onClick={() => {
                        setShowComposer((current) => !current);
                        setError("");
                        setSuccess("");
                    }}
                >
                    {showComposer ? "Close composer" : "+ Compose message"}
                </button>
            </section>

            {/* ---------------- KPIs ---------------- */}
            <section className="msg-kpis" aria-label="Messaging overview">
                <article className="msg-kpi">
                    <span className="msg-kpi-icon">✉</span>
                    <div>
                        <small>Total messages</small>
                        <strong>{safeMessages.length}</strong>
                        <em>Recorded message entries</em>
                    </div>
                </article>
                <article className="msg-kpi warn">
                    <span className="msg-kpi-icon">✎</span>
                    <div>
                        <small>Drafts</small>
                        <strong>{draftCount}</strong>
                        <em>{pendingCount ? `${pendingCount} pending · ` : ""}Saved as drafts</em>
                    </div>
                </article>
                <article className="msg-kpi ok">
                    <span className="msg-kpi-icon">✓</span>
                    <div>
                        <small>Marked as sent</small>
                        <strong>{sentCount}</strong>
                        <span className="msg-bar" role="img" aria-label={`${sentRate}% marked sent`}><i style={{ width: `${sentRate}%` }} /></span>
                        <em>{sentRate}% of all records{failedCount ? ` · ${failedCount} failed` : ""}</em>
                    </div>
                </article>
                <article className="msg-kpi wa">
                    <span className="msg-kpi-icon">WA</span>
                    <div>
                        <small>WhatsApp messages</small>
                        <strong>{channelCounts.whatsapp}</strong>
                        <em>WhatsApp channel records</em>
                    </div>
                </article>
            </section>

            {error && (
                <p className="msg-banner bad" role="alert">
                    <span>{error}</span>
                    <button type="button" onClick={() => setError("")} aria-label="Dismiss">✕</button>
                </p>
            )}

            {success && (
                <p className="msg-banner ok" role="status">
                    <span>{success}</span>
                    <button type="button" onClick={() => setSuccess("")} aria-label="Dismiss">✕</button>
                </p>
            )}

            {showComposer && (
                <div className="msg-composer">
                    <MessageComposer
                        recipients={recipients}
                        onSend={handlePrepareMessage}
                    />
                </div>
            )}

            {/* ---------------- register ---------------- */}
            <section className="msg-card">
                <header className="msg-card-head">
                    <div>
                        <h3>Message register</h3>
                        <p>Search communications and review channel and status details.</p>
                    </div>
                    <button type="button" className="oh-button oh-button-secondary" onClick={exportCsv}>
                        ⭳ Export CSV
                    </button>
                </header>

                {safeMessages.length > 0 && (
                    <div className="msg-mix" aria-label="Channel mix">
                        <div className="msg-mix-bar" role="img" aria-label="Share of messages by channel">
                            <i className="wa" style={{ flexGrow: channelCounts.whatsapp }} />
                            <i className="sm" style={{ flexGrow: channelCounts.sms }} />
                            <i className="em" style={{ flexGrow: channelCounts.email }} />
                        </div>
                        <ul>
                            <li><b className="wa" /> WhatsApp <em>{Math.round((channelCounts.whatsapp / mixTotal) * 100)}%</em></li>
                            <li><b className="sm" /> SMS <em>{Math.round((channelCounts.sms / mixTotal) * 100)}%</em></li>
                            <li><b className="em" /> Email <em>{Math.round((channelCounts.email / mixTotal) * 100)}%</em></li>
                        </ul>
                    </div>
                )}

                <div className="msg-toolbar">
                    <label className="msg-search">
                        <span aria-hidden="true">⌕</span>
                        <input
                            id="oh-message-search"
                            type="search"
                            value={search}
                            onChange={(event) => { setSearch(event.target.value); setVisible(PAGE_SIZE); }}
                            placeholder="Search recipients or message content"
                            aria-label="Search messages"
                        />
                    </label>
                    <label className="msg-sort">
                        <span>Sort</span>
                        <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} aria-label="Sort messages">
                            {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                    </label>
                </div>

                <div className="msg-filters">
                    <div className="msg-chips" role="group" aria-label="Filter by channel">
                        {CHANNELS.map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                className={`msg-chip ${channelFilter === value ? "on" : ""}`}
                                aria-pressed={channelFilter === value}
                                onClick={() => { setChannelFilter(value); setVisible(PAGE_SIZE); }}
                            >
                                {label}<em>{channelCounts[value]}</em>
                            </button>
                        ))}
                    </div>
                    <div className="msg-chips" role="group" aria-label="Filter by status">
                        {STATUSES.map((value) => (
                            <button
                                key={value}
                                type="button"
                                className={`msg-chip ${statusFilter === value ? "on" : ""}`}
                                aria-pressed={statusFilter === value}
                                onClick={() => { setStatusFilter(value); setVisible(PAGE_SIZE); }}
                            >
                                {value === "All" ? "All statuses" : value}<em>{statusCounts[value]}</em>
                            </button>
                        ))}
                    </div>
                </div>

                {filteredMessages.length === 0 ? (
                    <div className="msg-empty">
                        <span className="msg-empty-icon">✉</span>
                        <strong>No messages found</strong>
                        <p>Compose a message or adjust the current filters.</p>
                        {hasFilters && (
                            <button
                                type="button"
                                className="oh-button oh-button-secondary"
                                onClick={() => { setSearch(""); setChannelFilter("All"); setStatusFilter("All"); }}
                            >
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        {groups.map((group) => (
                            <div key={group.label} className="msg-group">
                                <h4>{group.label}</h4>
                                <div className="msg-list">
                                    {group.items.map((message, index) => {
                                        const badge = channelBadge(message.channel);
                                        const ts = getTime(message);
                                        const rel = relativeTime(ts);
                                        const isSent = statusKey(message) === "sent";
                                        const recipient = message.recipient || "Not specified";
                                        return (
                                            <article
                                                className={`msg-item ${isSent ? "sent" : ""}`}
                                                key={message.id ?? `${recipient}-${index}`}
                                            >
                                                <div className="msg-side">
                                                    <Avatar name={message.recipient || "?"} />
                                                    <span className={`msg-ch ${badge.cls}`} title={formatStatus(message.channel)}>{badge.short}</span>
                                                </div>

                                                <div className="msg-main" onClick={() => setSelected(message)} role="button" tabIndex={0}
                                                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(message); } }}
                                                    aria-label={`Open message to ${recipient}`}>
                                                    <div className="msg-heading">
                                                        <div>
                                                            <h3>
                                                                {message.subject ||
                                                                    `Message to ${message.recipient || "recipient"}`}
                                                            </h3>
                                                            <p className="msg-to">To: {recipient}</p>
                                                        </div>
                                                        <MessageStatus message={message} />
                                                    </div>

                                                    <p className="msg-preview">
                                                        {message.message || "No message content recorded."}
                                                    </p>

                                                    <div className="msg-meta">
                                                        <span>Channel: {formatStatus(message.channel)}</span>
                                                        <span>Created: {formatDateTime(message.createdAt ?? message.timestamp)}</span>
                                                        {rel && <span className="rel">{rel}</span>}
                                                    </div>
                                                </div>

                                                <div className="msg-actions">
                                                    {!isSent && (
                                                        <button
                                                            type="button"
                                                            className="oh-button oh-button-secondary"
                                                            onClick={() => handleMarkSent(message)}
                                                        >
                                                            Mark as sent
                                                        </button>
                                                    )}
                                                    <button type="button" className="oh-button oh-button-secondary msg-sm" onClick={() => setSelected(message)}>View</button>
                                                    <button type="button" className="oh-button oh-button-secondary msg-sm" onClick={() => copyMessage(message)} aria-label="Copy message text">Copy</button>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}

                        <footer className="msg-pager">
                            <span>Showing {Math.min(visible, filteredMessages.length)} of {filteredMessages.length}</span>
                            {filteredMessages.length > visible && (
                                <button type="button" className="oh-button oh-button-secondary" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                                    Show {Math.min(PAGE_SIZE, filteredMessages.length - visible)} more
                                </button>
                            )}
                        </footer>
                    </>
                )}
            </section>

            <p className="oh-page-note">
                Messages created here are workspace records. SMS delivery,
                WhatsApp messaging, and email delivery require their respective
                provider integrations and backend configuration.
            </p>

            {/* ---------------- detail drawer ---------------- */}
            {selected && (
                <div className="msg-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
                    <aside className="msg-drawer" role="dialog" aria-modal="true" aria-label="Message details">
                        <header className="msg-drawer-head">
                            <div>
                                <p className="oh-eyebrow">MESSAGE DETAILS</p>
                                <h3>{selected.subject || `Message to ${selected.recipient || "recipient"}`}</h3>
                                <MessageStatus message={selected} />
                            </div>
                            <button type="button" className="msg-x" onClick={() => setSelected(null)} aria-label="Close details">✕</button>
                        </header>

                        <div className="msg-drawer-body">
                            <div className="msg-person">
                                <Avatar name={selected.recipient || "?"} size={48} />
                                <div>
                                    <strong>{selected.recipient || "Not specified"}</strong>
                                    {(() => {
                                        const c = resolveContact(selected);
                                        return (
                                            <>
                                                {c.phone && <small>{c.phone}</small>}
                                                {c.email && <small>{c.email}</small>}
                                                {!c.phone && !c.email && <small>No contact details found for this recipient</small>}
                                            </>
                                        );
                                    })()}
                                </div>
                                <span className={`msg-ch big ${channelBadge(selected.channel).cls}`}>{formatStatus(selected.channel)}</span>
                            </div>

                            <h4>Message</h4>
                            <div className={`msg-bubble ${channelBadge(selected.channel).cls}`}>
                                {selected.message || "No message content recorded."}
                            </div>

                            <dl className="msg-facts">
                                <div><dt>Created</dt><dd>{formatDateTime(selected.createdAt ?? selected.timestamp)}</dd></div>
                                <div><dt>Characters</dt><dd>{(selected.message || "").length}</dd></div>
                                {channelKey(selected) === "sms" && (
                                    <div><dt>SMS parts (est.)</dt><dd>{smsParts(selected.message || "")}</dd></div>
                                )}
                                <div><dt>Words</dt><dd>{(selected.message || "").trim() ? (selected.message || "").trim().split(/\s+/).length : 0}</dd></div>
                            </dl>

                            <p className="msg-hint">
                                Opening a message in WhatsApp, your SMS app or your mail app does not change its recorded status. After sending it there, use “Mark as sent”.
                            </p>
                        </div>

                        <footer className="msg-drawer-foot">
                            {statusKey(selected) !== "sent" && (
                                <button type="button" className="oh-button oh-button-primary" onClick={() => handleMarkSent(selected)}>
                                    Mark as sent
                                </button>
                            )}
                            {openLabel(selected) && (
                                <button type="button" className="oh-button oh-button-secondary" onClick={() => openInChannel(selected)}>
                                    {openLabel(selected)}
                                </button>
                            )}
                            <button type="button" className="oh-button oh-button-secondary" onClick={() => copyMessage(selected)}>
                                Copy text
                            </button>
                        </footer>
                    </aside>
                </div>
            )}
        </div>
    );
}

/* ====================================================================
   Styles (scoped to .msg, reuses your --oh-* variables when present)
   ==================================================================== */

const msgStyles = `
.msg{--g:#168653;--red:#d03a3a;--amber:#b7791f;--wa:#25a05b;--sm:#2c5a9e;--em:#8a5cc7;
  --card:var(--oh-card,#fff);--bd:var(--oh-border,#e5e7eb);--mut:var(--oh-muted,#6b7280);
  --inp:var(--oh-input-bg,#fff);--soft:rgba(22,134,83,.1);--ease:cubic-bezier(.2,.7,.2,1)}
.msg *{box-sizing:border-box}
.msg button{font:inherit}
.msg :is(button,input,select,[role=button]):focus-visible{outline:3px solid rgba(22,134,83,.4);outline-offset:2px}
@keyframes msgRise{from{opacity:0;transform:translateY(8px)}}
@keyframes msgFade{from{opacity:0}}
@keyframes msgSlide{from{transform:translateX(30px);opacity:0}}

/* KPIs */
.msg-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
.msg-kpi{display:flex;gap:13px;align-items:flex-start;padding:16px;border:1px solid var(--bd);border-radius:16px;background:var(--card);animation:msgRise .4s var(--ease) both;min-width:0}
.msg-kpi-icon{display:grid;place-items:center;flex-shrink:0;width:40px;height:40px;border-radius:12px;background:var(--soft);color:var(--g);font-weight:800;font-size:16px}
.msg-kpi.warn .msg-kpi-icon{background:rgba(183,121,31,.14);color:var(--amber)}
.msg-kpi.wa .msg-kpi-icon{background:rgba(37,160,91,.14);color:var(--wa);font-size:13px}
.msg-kpi small{display:block;color:var(--mut);font-size:13px;font-weight:600}
.msg-kpi strong{display:block;margin:3px 0 4px;font-size:24px;line-height:1.1;font-variant-numeric:tabular-nums}
.msg-kpi em{display:block;font-style:normal;color:var(--mut);font-size:12.5px}
.msg-bar{display:block;width:100%;height:7px;margin:2px 0 5px;border-radius:999px;background:rgba(127,127,127,.18);overflow:hidden}
.msg-bar i{display:block;height:100%;border-radius:inherit;background:var(--g);transition:width .5s var(--ease)}

/* banners */
.msg-banner{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 14px;padding:11px 14px;border-radius:12px;font-weight:600;font-size:14px;animation:msgRise .25s var(--ease) both}
.msg-banner.ok{background:rgba(22,134,83,.1);color:#12683f}
.msg-banner.bad{background:rgba(208,58,58,.1);color:#b23030}
.msg-banner button{border:0;background:none;color:inherit;cursor:pointer;opacity:.7}
.msg-banner button:hover{opacity:1}
.msg-composer{margin-bottom:16px;animation:msgRise .3s var(--ease) both}

/* card */
.msg-card{min-width:0;margin-bottom:16px;padding:20px;border:1px solid var(--bd);border-radius:18px;background:var(--card);animation:msgRise .4s var(--ease) both}
.msg-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.msg-card-head h3{margin:0;font-size:18px;letter-spacing:-.01em}
.msg-card-head p{margin:3px 0 0;color:var(--mut);font-size:13.5px}

/* channel mix */
.msg-mix{display:flex;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:14px}
.msg-mix-bar{display:flex;flex:1;min-width:200px;height:10px;border-radius:999px;overflow:hidden;background:rgba(127,127,127,.18)}
.msg-mix-bar i{display:block;min-width:0;flex-basis:0}
.msg-mix-bar i.wa,.msg-mix li b.wa{background:var(--wa)}
.msg-mix-bar i.sm,.msg-mix li b.sm{background:var(--sm)}
.msg-mix-bar i.em,.msg-mix li b.em{background:var(--em)}
.msg-mix ul{display:flex;gap:14px;flex-wrap:wrap;margin:0;padding:0;list-style:none;font-size:13px;color:var(--mut)}
.msg-mix li{display:inline-flex;align-items:center;gap:6px}
.msg-mix li b{width:9px;height:9px;border-radius:50%}
.msg-mix li em{font-style:normal;font-weight:700;color:inherit}

/* toolbar */
.msg-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
.msg-search{display:flex;align-items:center;gap:9px;flex:1;min-width:220px;height:42px;padding:0 12px;border:1px solid var(--bd);border-radius:11px;background:var(--inp);color:var(--mut);transition:border-color .2s,box-shadow .2s}
.msg-search:focus-within{border-color:var(--g);box-shadow:0 0 0 4px rgba(22,134,83,.14)}
.msg-search input{flex:1;min-width:0;border:0;outline:0;background:none;color:inherit;font:inherit}
.msg-sort{display:flex;align-items:center;gap:8px;color:var(--mut);font-size:13px;font-weight:600}
.msg-sort select{height:42px;padding:0 11px;border:1px solid var(--bd);border-radius:11px;background:var(--inp);color:inherit;font:inherit}
.msg-filters{display:grid;gap:8px;margin-bottom:6px}
.msg-chips{display:flex;flex-wrap:wrap;gap:7px}
.msg-chip{display:inline-flex;align-items:center;gap:7px;padding:6px 12px;border:1px solid var(--bd);border-radius:999px;background:transparent;color:inherit;font-size:13.5px;font-weight:600;cursor:pointer;transition:background .2s,border-color .2s,color .2s}
.msg-chip:hover{border-color:var(--g)}
.msg-chip em{font-style:normal;font-size:12px;font-weight:700;padding:0 6px;border-radius:999px;background:rgba(127,127,127,.15)}
.msg-chip.on{background:var(--g);border-color:var(--g);color:#fff}
.msg-chip.on em{background:rgba(255,255,255,.25)}

/* list */
.msg-group{margin-top:16px}
.msg-group h4{margin:0 0 8px;font-size:12.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--mut)}
.msg-list{display:grid;gap:10px}
.msg-item{display:flex;align-items:flex-start;gap:14px;padding:14px;border:1px solid var(--bd);border-radius:16px;background:var(--card);transition:border-color .2s,box-shadow .2s,transform .2s var(--ease);animation:msgRise .35s var(--ease) both}
.msg-item:hover{border-color:rgba(22,134,83,.5);box-shadow:0 8px 24px rgba(0,0,0,.06)}
.msg-item.sent{opacity:.92}
.msg-side{position:relative;flex-shrink:0}
.msg-avatar{display:inline-grid;place-items:center;flex-shrink:0;border-radius:50%;font-weight:750;letter-spacing:.02em;user-select:none}
.msg-ch{position:absolute;right:-6px;bottom:-4px;min-width:22px;padding:1px 5px;border-radius:999px;border:2px solid var(--card);background:var(--mut);color:#fff;font-size:9.5px;font-weight:800;text-align:center;line-height:1.5}
.msg-ch.wa{background:var(--wa)}.msg-ch.sm{background:var(--sm)}.msg-ch.em{background:var(--em)}
.msg-ch.big{position:static;margin-left:auto;padding:3px 10px;border:0;font-size:12px}
.msg-main{flex:1;min-width:0;cursor:pointer;border-radius:10px}
.msg-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
.msg-heading h3{margin:0;font-size:15.5px;line-height:1.3;overflow-wrap:anywhere}
.msg-to{margin:3px 0 0;color:var(--mut);font-size:13px}
.msg-pill{white-space:nowrap;flex-shrink:0}
.msg-preview{margin:8px 0 0;color:inherit;opacity:.85;font-size:14px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
.msg-meta{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:9px;color:var(--mut);font-size:12.5px}
.msg-meta .rel{color:var(--g);font-weight:700}
.msg-actions{display:flex;flex-direction:column;align-items:stretch;gap:6px;flex-shrink:0}
.msg .msg-sm{padding:6px 11px;font-size:13px;min-height:0;white-space:nowrap}
.msg-pager{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:16px;color:var(--mut);font-size:13.5px}

/* empty */
.msg-empty{display:grid;justify-items:center;gap:6px;padding:44px 16px;text-align:center}
.msg-empty-icon{display:grid;place-items:center;width:56px;height:56px;margin-bottom:6px;border-radius:50%;background:var(--soft);color:var(--g);font-size:22px}
.msg-empty strong{font-size:16px}.msg-empty p{margin:0 0 8px;color:var(--mut);font-size:14px;max-width:360px}

/* drawer */
.msg-backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:stretch end;background:rgba(10,24,16,.55);backdrop-filter:blur(3px);animation:msgFade .2s ease both}
.msg-drawer{display:flex;flex-direction:column;width:min(100%,520px);height:100%;background:var(--card);color:inherit;box-shadow:-20px 0 60px rgba(0,0,0,.3);animation:msgSlide .3s var(--ease) both}
.msg-drawer-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:20px 22px 14px;border-bottom:1px solid var(--bd)}
.msg-drawer-head h3{margin:0 0 8px;font-size:20px;letter-spacing:-.01em;overflow-wrap:anywhere}
.msg-x{display:grid;place-items:center;width:36px;height:36px;border:0;border-radius:10px;background:none;color:var(--mut);cursor:pointer;flex-shrink:0}
.msg-x:hover{background:rgba(127,127,127,.12);color:inherit}
.msg-drawer-body{flex:1;overflow:auto;padding:18px 22px}
.msg-drawer-body h4{margin:20px 0 8px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--mut)}
.msg-person{display:flex;align-items:center;gap:12px}
.msg-person strong{display:block}.msg-person small{display:block;color:var(--mut);font-size:13px}
.msg-bubble{padding:14px 16px;border-radius:16px 16px 16px 4px;background:var(--soft);border:1px solid rgba(22,134,83,.2);white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.6;font-size:14.5px}
.msg-bubble.sm{background:rgba(44,90,158,.09);border-color:rgba(44,90,158,.22)}
.msg-bubble.em{background:rgba(138,92,199,.09);border-color:rgba(138,92,199,.22)}
.msg-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:16px 0 0}
.msg-facts>div{padding:11px 13px;border:1px solid var(--bd);border-radius:12px}
.msg-facts dt{color:var(--mut);font-size:12.5px;font-weight:600}.msg-facts dd{margin:3px 0 0;font-weight:700;font-variant-numeric:tabular-nums}
.msg-hint{margin:16px 0 0;color:var(--mut);font-size:12.5px;line-height:1.55}
.msg-drawer-foot{display:flex;flex-wrap:wrap;gap:8px;padding:14px 22px 18px;border-top:1px solid var(--bd)}

@media(max-width:1000px){.msg-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:640px){
  .msg-kpis{grid-template-columns:minmax(0,1fr)}
  .msg-item{flex-wrap:wrap}
  .msg-actions{width:100%;flex-direction:row;flex-wrap:wrap}
  .msg-drawer{width:100%}
}
@media(prefers-reduced-motion:reduce){.msg *,.msg *::before,.msg *::after{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;