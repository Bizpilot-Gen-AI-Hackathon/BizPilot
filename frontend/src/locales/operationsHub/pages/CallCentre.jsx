import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CallQueue from "../components/CallQueue";

/* ====================================================================
   Call Centre  (original layout + calling flow kept)
   New on top of the original:
   - Real DTMF keypad tones, connect / hang-up tones, ringtone (Web Audio)
   - Contacts: edit, delete, favourites, export .vcf / .csv
   - Saved in this browser (localStorage)
   - Call history: filters, search, delete, clear, stats
   - Wrap-up after every call (outcome, notes, follow-up to queue)
   - Simulated incoming calls (answer / decline)
   - Smart dial (matches numbers and names), keyboard + paste support,
     long-press 0 for "+", long-press backspace to clear
   - Assign dialog instead of window.prompt
   Props unchanged: calls, onAddCall, onAssignCall, onUpdateCallStatus
   ==================================================================== */

const STORAGE_KEY = "oh-call-centre:v2";

const initialCallForm = {
    contactName: "",
    phone: "",
    reason: "",
    priority: "Normal",
};

const initialContactForm = {
    name: "",
    phone: "",
    email: "",
    company: "",
    notes: "",
    favorite: false,
};

const KEYS = [
    ["1", ""], ["2", "ABC"], ["3", "DEF"],
    ["4", "GHI"], ["5", "JKL"], ["6", "MNO"],
    ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"],
    ["*", ""], ["0", "+"], ["#", ""],
];

/* Standard DTMF pairs: row frequency + column frequency */
const DTMF = {
    1: [697, 1209], 2: [697, 1336], 3: [697, 1477],
    4: [770, 1209], 5: [770, 1336], 6: [770, 1477],
    7: [852, 1209], 8: [852, 1336], 9: [852, 1477],
    "*": [941, 1209], 0: [941, 1336], "#": [941, 1477],
};

const OUTCOMES = ["Answered", "No answer", "Voicemail", "Busy", "Wrong number"];
const PRIORITIES = ["Low", "Normal", "High", "Urgent"];
const MISSED = ["Missed", "Declined", "No answer"];

const styles = {
    workspace: {
        display: "grid",
        gridTemplateColumns: "minmax(240px, 0.85fr) minmax(300px, 1.15fr)",
        gap: "20px",
        alignItems: "start",
    },
    panel: {
        minWidth: 0,
        border: "1px solid var(--oh-border, #e5e7eb)",
        borderRadius: "16px",
        padding: "18px",
        background: "var(--oh-card, #ffffff)",
    },
    input: {
        width: "100%",
        boxSizing: "border-box",
        padding: "11px 12px",
        border: "1px solid var(--oh-border, #d1d5db)",
        borderRadius: "9px",
        background: "var(--oh-input-bg, #ffffff)",
        color: "inherit",
        font: "inherit",
        minWidth: 0,
    },
    primary: {
        border: 0,
        borderRadius: "10px",
        padding: "11px 15px",
        background: "#168653",
        color: "#ffffff",
        fontWeight: 650,
        cursor: "pointer",
    },
    secondary: {
        border: "1px solid var(--oh-border, #d1d5db)",
        borderRadius: "9px",
        padding: "9px 12px",
        background: "transparent",
        color: "inherit",
        fontWeight: 550,
        cursor: "pointer",
    },
    muted: {
        color: "var(--oh-muted, #6b7280)",
        fontSize: "13px",
    },
};

/* ---------------------------------------------------------------- */
/* Helpers                                                           */
/* ---------------------------------------------------------------- */

function normalizePhone(value = "") {
    return String(value).replace(/[^\d+*#]/g, "");
}

function samePhone(a, b) {
    const x = normalizePhone(a).replace(/[*#]/g, "");
    const y = normalizePhone(b).replace(/[*#]/g, "");
    if (!x || !y) return false;
    if (x === y) return true;
    return x.length >= 9 && y.length >= 9 && x.slice(-9) === y.slice(-9);
}

function formatDuration(seconds = 0) {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const r = s % 60;
    const mm = String(m).padStart(2, "0");
    const rr = String(r).padStart(2, "0");
    return h ? `${h}:${mm}:${rr}` : `${mm}:${rr}`;
}

function formatTalkTime(seconds = 0) {
    const s = Math.floor(seconds);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ${s % 60}s`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
}

const T9 = { a: 2, b: 2, c: 2, d: 3, e: 3, f: 3, g: 4, h: 4, i: 4, j: 5, k: 5, l: 5, m: 6, n: 6, o: 6, p: 7, q: 7, r: 7, s: 7, t: 8, u: 8, v: 8, w: 9, x: 9, y: 9, z: 9 };

function nameToDigits(name = "") {
    return name.toLowerCase().split("").map((ch) => (T9[ch] !== undefined ? String(T9[ch]) : "")).join("");
}

function dayLabel(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Earlier";
    const today = new Date();
    const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((startOf(today) - startOf(d)) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
}

function timeLabel(iso) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function parseVCard(text) {
    const unfolded = text.replace(/\r?\n[ \t]/g, "");
    const cards = unfolded.split(/BEGIN:VCARD/i).slice(1);

    return cards.map((card, index) => {
        const lines = card.split(/\r?\n/);
        const contact = {
            id: `import-${Date.now()}-${index}`,
            name: "",
            phone: "",
            email: "",
            company: "",
            notes: "",
            favorite: false,
        };

        for (const line of lines) {
            const separator = line.indexOf(":");
            if (separator < 0) continue;

            const key = line.slice(0, separator).split(";")[0].toUpperCase();
            const value = line
                .slice(separator + 1)
                .replace(/\\n/gi, " ")
                .replace(/\\,/g, ",")
                .replace(/\\;/g, ";")
                .replace(/\\\\/g, "\\")
                .trim();

            if (!value) continue;

            if (key === "FN" && !contact.name) contact.name = value;
            if (key === "TEL" && !contact.phone) contact.phone = value;
            if (key === "EMAIL" && !contact.email) contact.email = value;
            if (key === "ORG" && !contact.company) {
                contact.company = value.replace(/;/g, " ").trim();
            }
            if (key === "NOTE" && !contact.notes) contact.notes = value;
        }

        if (!contact.name) {
            const nameLine = lines.find((line) => /^N(?:;[^:]*)?:/i.test(line));
            if (nameLine) {
                contact.name = nameLine
                    .slice(nameLine.indexOf(":") + 1)
                    .split(";")
                    .reverse()
                    .filter(Boolean)
                    .join(" ");
            }
        }

        return contact;
    }).filter((contact) => contact.name && contact.phone);
}

function download(filename, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toVCard(contacts) {
    const esc = (v = "") => String(v).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
    return contacts.map((c) => [
        "BEGIN:VCARD", "VERSION:3.0", `FN:${esc(c.name)}`, `TEL:${c.phone}`,
        c.email ? `EMAIL:${c.email}` : "", c.company ? `ORG:${esc(c.company)}` : "",
        c.notes ? `NOTE:${esc(c.notes)}` : "", "END:VCARD",
    ].filter(Boolean).join("\r\n")).join("\r\n");
}

function toCsv(contacts) {
    const q = (v = "") => `"${String(v).replace(/"/g, '""')}"`;
    return ["Name,Phone,Email,Company,Notes,Favourite"]
        .concat(contacts.map((c) => [c.name, c.phone, c.email, c.company, c.notes, c.favorite ? "Yes" : "No"].map(q).join(",")))
        .join("\n");
}

function loadStore() {
    try {
        const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
        return {
            contacts: Array.isArray(raw.contacts) ? raw.contacts : [],
            history: Array.isArray(raw.history) ? raw.history : [],
            sound: raw.sound !== false,
        };
    } catch {
        return { contacts: [], history: [], sound: true };
    }
}

/* ---------------------------------------------------------------- */
/* Phone tones (Web Audio)                                           */
/* ---------------------------------------------------------------- */

function useTones(soundOn) {
    const ctxRef = useRef(null);
    const loopRef = useRef(null);
    const onRef = useRef(soundOn);
    onRef.current = soundOn;

    const getContext = useCallback(() => {
        const AudioCtx = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
        if (!AudioCtx) return null;
        if (!ctxRef.current) ctxRef.current = new AudioCtx();
        if (ctxRef.current.state === "suspended") ctxRef.current.resume().catch(() => { });
        return ctxRef.current;
    }, []);

    const beep = useCallback((freqs, ms, { gain = 0.1, delay = 0 } = {}) => {
        if (!onRef.current) return;
        const ctx = getContext();
        if (!ctx) return;
        const start = ctx.currentTime + delay / 1000;
        const end = start + ms / 1000;
        const master = ctx.createGain();
        master.gain.setValueAtTime(0.0001, start);
        master.gain.exponentialRampToValueAtTime(gain, start + 0.012);
        master.gain.setValueAtTime(gain, Math.max(start + 0.012, end - 0.03));
        master.gain.exponentialRampToValueAtTime(0.0001, end);
        master.connect(ctx.destination);
        freqs.forEach((f) => {
            const osc = ctx.createOscillator();
            osc.type = "sine";
            osc.frequency.value = f;
            osc.connect(master);
            osc.start(start);
            osc.stop(end + 0.02);
        });
    }, [getContext]);

    const stop = useCallback(() => {
        if (loopRef.current) {
            window.clearInterval(loopRef.current);
            loopRef.current = null;
        }
    }, []);

    const key = useCallback((k) => { if (DTMF[k]) beep(DTMF[k], 140, { gain: 0.12 }); }, [beep]);

    const ringtone = useCallback(() => {
        stop();
        const burst = () => {
            beep([659, 523], 220, { gain: 0.08 });
            beep([659, 523], 220, { gain: 0.08, delay: 300 });
            beep([784, 659], 320, { gain: 0.08, delay: 640 });
        };
        burst();
        loopRef.current = window.setInterval(burst, 2200);
    }, [beep, stop]);

    const connect = useCallback(() => {
        beep([880], 90, { gain: 0.07 });
        beep([1175], 120, { gain: 0.07, delay: 130 });
    }, [beep]);

    const hangup = useCallback(() => {
        beep([480, 620], 170, { gain: 0.07 });
        beep([480, 620], 170, { gain: 0.07, delay: 240 });
    }, [beep]);

    useEffect(() => () => {
        stop();
        if (ctxRef.current && ctxRef.current.close) ctxRef.current.close().catch(() => { });
    }, [stop]);

    return useMemo(() => ({ key, ringtone, connect, hangup, stop }), [key, ringtone, connect, hangup, stop]);
}

/* ---------------------------------------------------------------- */
/* Dialogs (use the same variables as the rest of the page)           */
/* ---------------------------------------------------------------- */

function Modal({ title, subtitle, onClose, children }) {
    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div className="oh-cc-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <section className="oh-cc-modal" role="dialog" aria-modal="true" aria-label={title}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
                    <div>
                        <h3 style={{ margin: 0 }}>{title}</h3>
                        {subtitle && <p style={{ ...styles.muted, margin: "4px 0 0" }}>{subtitle}</p>}
                    </div>
                    <button type="button" style={styles.secondary} onClick={onClose} aria-label="Close">✕</button>
                </div>
                {children}
            </section>
        </div>
    );
}

function AssignDialog({ call, suggestions, onAssign, onClose }) {
    const [name, setName] = useState(call.assignedTo || call.assignee || "");
    return (
        <Modal title="Assign call" subtitle={`Who is responsible for ${call.contactName || "this call"}?`} onClose={onClose}>
            <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onAssign(name.trim()); }}>
                <label className="oh-cc-label" htmlFor="oh-cc-assign-name">Team member</label>
                <input id="oh-cc-assign-name" className="oh-cc-field" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Type a name" />
                {suggestions.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                        <p style={styles.muted}>Recently assigned</p>
                        <div className="oh-cc-chips">
                            {suggestions.map((s) => <button key={s} type="button" className="oh-cc-chip" onClick={() => setName(s)}>{s}</button>)}
                        </div>
                    </div>
                )}
                <div className="oh-cc-modal-actions">
                    <button type="button" style={styles.secondary} onClick={onClose}>Cancel</button>
                    <button type="submit" style={{ ...styles.primary, opacity: name.trim() ? 1 : 0.5 }} disabled={!name.trim()}>Assign</button>
                </div>
            </form>
        </Modal>
    );
}

function WrapUpDialog({ wrap, onSave, onSkip }) {
    const [outcome, setOutcome] = useState(wrap.connected ? "Answered" : "No answer");
    const [notes, setNotes] = useState(wrap.notes || "");
    const [followUp, setFollowUp] = useState(true);
    const [priority, setPriority] = useState("Normal");

    return (
        <Modal
            title="Call wrap-up"
            subtitle={`${wrap.call.contactName} · ${wrap.connected ? formatDuration(wrap.seconds) : "not connected"}`}
            onClose={onSkip}
        >
            <form onSubmit={(e) => { e.preventDefault(); onSave({ outcome, notes: notes.trim(), followUp, priority }); }}>
                <span className="oh-cc-label">Outcome</span>
                <div className="oh-cc-chips" role="radiogroup" aria-label="Call outcome">
                    {OUTCOMES.map((o) => (
                        <button key={o} type="button" role="radio" aria-checked={outcome === o} className={`oh-cc-chip ${outcome === o ? "on" : ""}`} onClick={() => setOutcome(o)}>{o}</button>
                    ))}
                </div>

                <label className="oh-cc-label" htmlFor="oh-cc-wrap-notes" style={{ marginTop: 14 }}>Notes</label>
                <textarea id="oh-cc-wrap-notes" className="oh-cc-field" rows={3} autoFocus value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What was agreed? Anything to follow up?" />

                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, cursor: "pointer" }}>
                    <input type="checkbox" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} />
                    Add this call to the call queue
                </label>

                {followUp && (
                    <div style={{ marginTop: 12 }}>
                        <span className="oh-cc-label">Queue priority</span>
                        <div className="oh-cc-chips">
                            {PRIORITIES.map((p) => (
                                <button key={p} type="button" className={`oh-cc-chip ${priority === p ? "on" : ""}`} onClick={() => setPriority(p)}>{p}</button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="oh-cc-modal-actions">
                    <button type="button" style={styles.secondary} onClick={onSkip}>Skip</button>
                    <button type="submit" style={styles.primary}>Save call</button>
                </div>
            </form>
        </Modal>
    );
}

/* ---------------------------------------------------------------- */
/* Main component                                                    */
/* ---------------------------------------------------------------- */

export default function CallCentre({
    calls = [],
    onAddCall,
    onAssignCall,
    onUpdateCallStatus,
}) {
    const stored = useRef(null);
    if (stored.current === null) stored.current = loadStore();

    const [activeTab, setActiveTab] = useState("phone");
    const [contacts, setContacts] = useState(stored.current.contacts);
    const [history, setHistory] = useState(stored.current.history);
    const [soundOn, setSoundOn] = useState(stored.current.sound);

    const [search, setSearch] = useState("");
    const [favOnly, setFavOnly] = useState(false);
    const [number, setNumber] = useState("");
    const [showContactForm, setShowContactForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [contactForm, setContactForm] = useState(initialContactForm);
    const [showCallForm, setShowCallForm] = useState(false);
    const [callForm, setCallForm] = useState(initialCallForm);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [activeCall, setActiveCall] = useState(null);
    const [callSeconds, setCallSeconds] = useState(0);
    const [callNotes, setCallNotes] = useState("");
    const [muted, setMuted] = useState(false);
    const [held, setHeld] = useState(false);
    const [sentDigits, setSentDigits] = useState("");
    const [incoming, setIncoming] = useState(null);
    const [wrapUp, setWrapUp] = useState(null);
    const [assigning, setAssigning] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState("");
    const [importMessage, setImportMessage] = useState("");
    const [historyFilter, setHistoryFilter] = useState("All");
    const [historySearch, setHistorySearch] = useState("");

    const fileInputRef = useRef(null);
    const zeroTimer = useRef(null);
    const zeroLong = useRef(false);
    const backTimer = useRef(null);
    const backLong = useRef(false);

    const tones = useTones(soundOn);

    /* ---------- derived ---------- */

    const openCalls = calls.filter(
        (call) => String(call.status).toLowerCase() !== "resolved"
    );
    const resolvedCalls = calls.filter(
        (call) => String(call.status).toLowerCase() === "resolved"
    );

    const matchedContact = number ? contacts.find((c) => samePhone(c.phone, number)) : null;
    const favourites = contacts.filter((c) => c.favorite);

    const filteredContacts = contacts
        .filter((contact) => !favOnly || contact.favorite)
        .filter((contact) =>
            [contact.name, contact.phone, contact.email, contact.company]
                .join(" ")
                .toLowerCase()
                .includes(search.toLowerCase())
        );

    const smartMatches = useMemo(() => {
        const digits = number.replace(/[^\d]/g, "");
        if (digits.length < 2 || matchedContact || activeCall) return [];
        return contacts
            .filter((c) => normalizePhone(c.phone).includes(digits) || nameToDigits(c.name).includes(digits))
            .slice(0, 3);
    }, [number, contacts, matchedContact, activeCall]);

    const shownHistory = useMemo(() => {
        const q = historySearch.trim().toLowerCase();
        return history.filter((h) => {
            if (historyFilter === "Outgoing" && h.direction !== "Outgoing") return false;
            if (historyFilter === "Incoming" && h.direction !== "Incoming") return false;
            if (historyFilter === "Missed" && !MISSED.includes(h.outcome)) return false;
            if (!q) return true;
            return [h.contactName, h.phone, h.notes].join(" ").toLowerCase().includes(q);
        });
    }, [history, historyFilter, historySearch]);

    const historyGroups = useMemo(() => {
        const groups = [];
        shownHistory.forEach((h) => {
            const label = dayLabel(h.startedAt);
            const last = groups[groups.length - 1];
            if (last && last.label === label) last.items.push(h);
            else groups.push({ label, items: [h] });
        });
        return groups;
    }, [shownHistory]);

    const stats = useMemo(() => {
        const answered = history.filter((h) => h.outcome === "Answered").length;
        const talk = history.reduce((sum, h) => sum + (h.durationSeconds || 0), 0);
        const missed = history.filter((h) => MISSED.includes(h.outcome)).length;
        return { total: history.length, answered, talk, missed };
    }, [history]);

    const assignees = useMemo(
        () => [...new Set(calls.map((c) => c.assignedTo || c.assignee).filter(Boolean))].slice(0, 6),
        [calls]
    );

    /* ---------- feedback (same inline messages as before) ---------- */

    function showFeedback(message, type = "success") {
        setError(type === "error" ? message : "");
        setSuccess(type === "success" ? message : "");
    }

    /* ---------- persistence ---------- */

    useEffect(() => {
        try {
            window.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ contacts, history: history.slice(0, 200), sound: soundOn })
            );
        } catch { /* storage unavailable or full */ }
    }, [contacts, history, soundOn]);

    /* ---------- live call timer ---------- */

    useEffect(() => {
        if (!activeCall) return undefined;
        const tick = () => setCallSeconds(Math.max(0, Math.floor((Date.now() - activeCall.startedMs) / 1000)));
        tick();
        const timer = window.setInterval(tick, 500);
        return () => window.clearInterval(timer);
    }, [activeCall && activeCall.id]);

    /* ---------- ringtone for simulated incoming calls ---------- */

    useEffect(() => {
        if (!incoming) return undefined;
        tones.ringtone();
        return () => tones.stop();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [incoming && incoming.id]);

    /* ---------- contacts ---------- */

    function selectContact(contact) {
        setNumber(contact.phone || "");
        setSearch("");
        setActiveTab("phone");
        showFeedback("");
    }

    function openContactForm(contact = null) {
        if (contact && contact.id) {
            setEditingId(contact.id);
            setContactForm({ ...initialContactForm, ...contact });
        } else {
            setEditingId(null);
            setContactForm({ ...initialContactForm, ...(contact || {}) });
        }
        setShowContactForm(true);
    }

    function closeContactForm() {
        setShowContactForm(false);
        setEditingId(null);
        setContactForm(initialContactForm);
    }

    function handleAddContact(event) {
        event.preventDefault();

        const name = contactForm.name.trim();
        const phone = contactForm.phone.trim();

        if (!name || !phone) {
            showFeedback("Enter a contact name and phone number.", "error");
            return;
        }

        const duplicate = contacts.some(
            (contact) => contact.id !== editingId && samePhone(contact.phone, phone)
        );

        if (duplicate) {
            showFeedback("A contact with this phone number already exists.", "error");
            return;
        }

        const clean = {
            ...contactForm,
            name,
            phone,
            email: contactForm.email.trim(),
            company: contactForm.company.trim(),
            notes: contactForm.notes.trim(),
        };

        if (editingId) {
            setContacts((current) => current.map((c) => (c.id === editingId ? { ...c, ...clean, id: editingId } : c)));
            closeContactForm();
            showFeedback("Contact updated.");
            return;
        }

        setContacts((current) => [...current, { ...clean, id: `contact-${Date.now()}` }]);
        setNumber(phone);
        closeContactForm();
        setActiveTab("phone");
        showFeedback("Contact added successfully.");
    }

    function removeContact(id) {
        if (confirmDelete !== id) {
            setConfirmDelete(id);
            window.setTimeout(() => setConfirmDelete((c) => (c === id ? "" : c)), 3000);
            return;
        }
        setContacts((current) => current.filter((c) => c.id !== id));
        setConfirmDelete("");
        showFeedback("Contact deleted.");
    }

    function toggleFavourite(id) {
        setContacts((current) => current.map((c) => (c.id === id ? { ...c, favorite: !c.favorite } : c)));
    }

    async function handleImportContacts(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const imported = parseVCard(text);

            if (!imported.length) {
                setImportMessage(
                    "No contacts with both a name and phone number were found in this file."
                );
                return;
            }

            let added = 0;
            let skipped = 0;
            const next = [...contacts];

            for (const contact of imported) {
                if (!normalizePhone(contact.phone) || next.some((c) => samePhone(c.phone, contact.phone))) {
                    skipped += 1;
                    continue;
                }
                next.push(contact);
                added += 1;
            }

            setContacts(next);
            setImportMessage(
                `Imported ${added} contact${added === 1 ? "" : "s"}.` +
                (skipped ? ` Skipped ${skipped} duplicate or invalid contact${skipped === 1 ? "" : "s"}.` : "")
            );
        } catch {
            setImportMessage("The contact file could not be read. Please try a valid .vcf file.");
        } finally {
            event.target.value = "";
        }
    }

    function exportContacts(kind) {
        if (!contacts.length) { showFeedback("There are no contacts to export yet.", "error"); return; }
        if (kind === "vcf") download("contacts.vcf", toVCard(contacts), "text/vcard");
        else download("contacts.csv", toCsv(contacts), "text/csv");
        showFeedback(`Exported ${contacts.length} contact${contacts.length === 1 ? "" : "s"}.`);
    }

    /* ---------- dial pad ---------- */

    function pressKey(digit) {
        tones.key(digit);
        if (activeCall) {
            setSentDigits((s) => (s + digit).slice(-18));
            return;
        }
        setNumber((current) => (current.length >= 24 ? current : current + digit));
    }

    function handleDialDigit(digit) {
        if (digit === "0") {
            window.clearTimeout(zeroTimer.current);
            if (zeroLong.current) { zeroLong.current = false; return; }
        }
        pressKey(digit);
    }

    function startZeroHold() {
        zeroLong.current = false;
        window.clearTimeout(zeroTimer.current);
        zeroTimer.current = window.setTimeout(() => {
            zeroLong.current = true;
            if (!activeCall) setNumber((current) => (current.length >= 24 ? current : `${current}+`));
        }, 480);
    }

    function handleDeleteDigit() {
        if (backLong.current) { backLong.current = false; return; }
        setNumber((current) => current.slice(0, -1));
    }

    function startBackspaceHold() {
        backLong.current = false;
        window.clearTimeout(backTimer.current);
        backTimer.current = window.setTimeout(() => { backLong.current = true; setNumber(""); }, 600);
    }

    /* ---------- calling (same flow as before) ---------- */

    function handleStartCall() {
        const phone = number.trim();

        if (!phone || !normalizePhone(phone)) {
            showFeedback("Enter a valid phone number first.", "error");
            return;
        }

        if (activeCall) {
            showFeedback("End the current call before starting another.", "error");
            return;
        }

        if (incoming) {
            showFeedback("Answer or decline the incoming call first.", "error");
            return;
        }

        const contact = contacts.find((item) => samePhone(item.phone, phone));

        const startedAt = new Date().toISOString();
        const localCall = {
            id: `local-call-${Date.now()}`,
            contactName: contact?.name || phone,
            phone,
            reason: "Outgoing call",
            status: "In progress",
            direction: "Outgoing",
            startedAt,
            startedMs: Date.now(),
        };

        tones.connect();
        setActiveCall(localCall);
        setCallSeconds(0);
        setCallNotes("");
        setSentDigits("");
        setMuted(false);
        setHeld(false);
        showFeedback(
            "Demo call started. No real phone connection has been made."
        );
    }

    function handleEndCall() {
        if (!activeCall) return;

        tones.hangup();
        setWrapUp({
            call: { ...activeCall },
            seconds: callSeconds,
            connected: true,
            notes: callNotes.trim(),
        });

        setActiveCall(null);
        setHeld(false);
        setMuted(false);
        setCallSeconds(0);
        setSentDigits("");
    }

    function simulateIncoming() {
        if (activeCall || incoming) { showFeedback("Finish the current call first.", "error"); return; }
        const pool = contacts.length ? contacts : [{ name: "Unknown caller", phone: "+254712345678" }];
        const who = pool[Math.floor(Math.random() * pool.length)];
        setActiveTab("phone");
        setIncoming({
            id: `incoming-${Date.now()}`,
            contactName: who.name,
            phone: who.phone,
            startedAt: new Date().toISOString(),
        });
    }

    function answerIncoming() {
        if (!incoming) return;
        tones.stop();
        tones.connect();
        setActiveCall({
            id: `local-call-${Date.now()}`,
            contactName: incoming.contactName,
            phone: incoming.phone,
            reason: "Incoming call",
            status: "In progress",
            direction: "Incoming",
            startedAt: incoming.startedAt,
            startedMs: Date.now(),
        });
        setCallSeconds(0);
        setCallNotes("");
        setSentDigits("");
        setMuted(false);
        setHeld(false);
        setIncoming(null);
        showFeedback("Demo call answered. No real phone connection has been made.");
    }

    function declineIncoming() {
        if (!incoming) return;
        tones.stop();
        tones.hangup();
        setHistory((h) => [{
            id: `h-${Date.now()}`,
            contactName: incoming.contactName,
            phone: incoming.phone,
            direction: "Incoming",
            outcome: "Declined",
            startedAt: incoming.startedAt,
            durationSeconds: 0,
            notes: "",
        }, ...h].slice(0, 200));
        setIncoming(null);
        showFeedback("Incoming call declined.");
    }

    function finishWrapUp(result) {
        if (!wrapUp) return;
        const { call: ended, seconds } = wrapUp;

        const completedCall = {
            id: `h-${Date.now()}`,
            contactName: ended.contactName,
            phone: ended.phone,
            direction: ended.direction,
            outcome: result.outcome,
            status: "Completed (demo)",
            startedAt: ended.startedAt,
            endedAt: new Date().toISOString(),
            durationSeconds: seconds,
            notes: result.notes,
        };

        setHistory((h) => [completedCall, ...h].slice(0, 200));
        setWrapUp(null);

        if (!result.followUp) {
            showFeedback("Demo call ended and added to recent calls.");
            return;
        }

        if (typeof onAddCall !== "function") {
            showFeedback("The demo call ended, but the call queue is not connected.", "error");
            return;
        }

        const queued = onAddCall({
            contactName: completedCall.contactName,
            phone: completedCall.phone,
            reason: completedCall.notes || `${ended.direction === "Incoming" ? "Incoming" : "Outgoing"} call`,
            priority: result.priority,
            status: "Open",
        });

        if (queued === null || queued === false) {
            showFeedback(
                "The demo call ended, but the call queue record could not be saved.",
                "error"
            );
            return;
        }

        showFeedback("Demo call ended and added to recent calls.");
    }

    function skipWrapUp() {
        if (!wrapUp) return;
        finishWrapUp({ outcome: "Answered", notes: wrapUp.notes, followUp: true, priority: "Normal" });
    }

    /* ---------- keyboard + paste (phone tab only) ---------- */

    useEffect(() => {
        if (activeTab !== "phone" || showContactForm || showCallForm || assigning || wrapUp) return undefined;

        const isTyping = (el) => el && (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable);

        function onKey(event) {
            if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
            if (/^[0-9*#]$/.test(event.key)) { event.preventDefault(); pressKey(event.key); return; }
            if (event.key === "+" && !activeCall) { event.preventDefault(); setNumber((n) => `${n}+`); return; }
            if (event.key === "Backspace" && !activeCall) { event.preventDefault(); setNumber((n) => n.slice(0, -1)); return; }
            if (event.key === "Enter" && !activeCall && number) { event.preventDefault(); handleStartCall(); }
        }

        function onPaste(event) {
            if (isTyping(event.target) || activeCall) return;
            const text = event.clipboardData ? event.clipboardData.getData("text") : "";
            const cleaned = normalizePhone(text).slice(0, 24);
            if (cleaned) { event.preventDefault(); setNumber(cleaned); showFeedback("Number pasted."); }
        }

        window.addEventListener("keydown", onKey);
        window.addEventListener("paste", onPaste);
        return () => {
            window.removeEventListener("keydown", onKey);
            window.removeEventListener("paste", onPaste);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    });

    /* ---------- queue handlers ---------- */

    function handleRecordCall(event) {
        event.preventDefault();

        if (typeof onAddCall !== "function") {
            showFeedback("Call queue creation is not connected.", "error");
            return;
        }

        const result = onAddCall({
            contactName: callForm.contactName.trim(),
            phone: callForm.phone.trim(),
            reason: callForm.reason.trim(),
            priority: callForm.priority,
            status: "Open",
        });

        if (result === null || result === false) {
            showFeedback("The call could not be added to the queue.", "error");
            return;
        }

        setCallForm(initialCallForm);
        setShowCallForm(false);
        showFeedback("Call added to the queue.");
    }

    function handleAssign(call) {
        if (typeof onAssignCall !== "function") {
            showFeedback("Call assignment is not connected.", "error");
            return;
        }
        setAssigning(call);
    }

    function submitAssign(name) {
        const result = onAssignCall(assigning.id, name);

        if (result === null || result === false) {
            showFeedback("The call could not be assigned.", "error");
            return;
        }

        setAssigning(null);
        showFeedback("Call assignment updated.");
    }

    function handleStatusUpdate(call) {
        if (typeof onUpdateCallStatus !== "function") {
            showFeedback("Call status updates are not connected.", "error");
            return;
        }

        const nextStatus =
            String(call.status).toLowerCase() === "resolved"
                ? "Open"
                : "Resolved";

        const result = onUpdateCallStatus(call.id, nextStatus);

        if (result === null || result === false) {
            showFeedback("The call status could not be updated.", "error");
            return;
        }

        showFeedback(`Call marked as ${nextStatus.toLowerCase()}.`);
    }

    /* ---------- shared pieces ---------- */

    const contactFormJsx = showContactForm && (
        <form onSubmit={handleAddContact} style={{ marginTop: 16, marginBottom: 6 }}>
            <div className="oh-cc-form-grid">
                {[
                    ["name", "Full name", "text", true],
                    ["phone", "Phone number", "tel", true],
                    ["email", "Email", "email", false],
                    ["company", "Company", "text", false],
                ].map(([field, label, type, required]) => (
                    <div key={field} className="oh-cc-field-wrap">
                        <label className="oh-cc-label" htmlFor={`oh-cc-contact-${field}`}>{label}</label>
                        <input
                            id={`oh-cc-contact-${field}`}
                            className="oh-cc-field"
                            type={type}
                            value={contactForm[field] || ""}
                            onChange={(e) => setContactForm({ ...contactForm, [field]: e.target.value })}
                            required={required}
                        />
                    </div>
                ))}
                <div className="oh-cc-field-wrap oh-cc-span-2">
                    <label className="oh-cc-label" htmlFor="oh-cc-contact-notes">Notes</label>
                    <textarea id="oh-cc-contact-notes" className="oh-cc-field" rows={2} value={contactForm.notes || ""} onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })} />
                </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={Boolean(contactForm.favorite)} onChange={(e) => setContactForm({ ...contactForm, favorite: e.target.checked })} />
                Add to favourites
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button type="submit" style={styles.primary}>{editingId ? "Save changes" : "Save contact"}</button>
                {editingId && <button type="button" style={styles.secondary} onClick={closeContactForm}>Cancel</button>}
            </div>
        </form>
    );

    return (
        <div className="oh-page oh-call-centre">
            <style>{`
                .oh-cc-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}
                .oh-cc-tab{border:1px solid var(--oh-border,#e5e7eb);border-radius:9px;padding:9px 13px;background:transparent;color:inherit;cursor:pointer;font:inherit}
                .oh-cc-tab.active{background:#e6f5ec;color:#12683f;border-color:#a7dfbf;font-weight:700}
                .oh-cc-contact{display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid var(--oh-border,#e5e7eb);cursor:pointer}
                .oh-cc-contact:last-child{border-bottom:0}
                .oh-cc-avatar{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:#e6f5ec;color:#12683f;font-weight:750;flex-shrink:0}
                .oh-cc-contact-main{min-width:0;flex:1}
                .oh-cc-contact-main strong,.oh-cc-contact-main small{display:block;overflow-wrap:anywhere}
                .oh-cc-contact-main small{color:var(--oh-muted,#6b7280);margin-top:3px}
                .oh-cc-digits{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:16px 0}
                .oh-cc-digit{min-height:58px;border:1px solid var(--oh-border,#e5e7eb);border-radius:12px;background:var(--oh-key-bg,#f9fafb);color:inherit;cursor:pointer;font-size:23px;font-weight:650;user-select:none;touch-action:manipulation}
                .oh-cc-digit span{display:block;font-size:9px;letter-spacing:1px;color:var(--oh-muted,#6b7280);font-weight:500}
                .oh-cc-digit:hover{border-color:#168653;background:#e6f5ec}
                .oh-cc-digit:active{background:#168653;border-color:#168653;color:#fff}
                .oh-cc-phone-screen{border:1px solid var(--oh-border,#e5e7eb);border-radius:14px;padding:16px;background:var(--oh-phone-bg,#f9fafb)}
                .oh-cc-call-action{border:0;border-radius:12px;padding:13px 16px;background:#168653;color:#fff;font-weight:750;cursor:pointer}
                .oh-cc-end-action{border:0;border-radius:12px;padding:13px 16px;background:#c93636;color:#fff;font-weight:750;cursor:pointer}
                .oh-cc-label{display:block;font-size:13px;font-weight:650;margin-bottom:6px}
                .oh-cc-field{width:100%;box-sizing:border-box;padding:10px 11px;border:1px solid var(--oh-border,#d1d5db);border-radius:9px;background:var(--oh-input-bg,#fff);color:inherit;font:inherit}
                .oh-cc-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}
                .oh-cc-field-wrap{min-width:0}
                .oh-cc-span-2{grid-column:1/-1}
                .oh-cc-muted{font-size:12px;color:var(--oh-muted,#6b7280)}
                .oh-cc-empty{padding:22px 10px;text-align:center;color:var(--oh-muted,#6b7280);font-size:13px}
                .oh-cc-chips{display:flex;flex-wrap:wrap;gap:7px}
                .oh-cc-chip{border:1px solid var(--oh-border,#d1d5db);border-radius:999px;padding:6px 12px;background:transparent;color:inherit;cursor:pointer;font:inherit;font-size:13px;font-weight:550}
                .oh-cc-chip.on{background:#168653;border-color:#168653;color:#fff}
                .oh-cc-star{border:0;background:none;cursor:pointer;font-size:18px;color:var(--oh-muted,#9ca3af);padding:4px 6px;line-height:1}
                .oh-cc-star.on{color:#e0a100}
                .oh-cc-actions{display:flex;align-items:center;gap:6px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end}
                .oh-cc-smart{display:grid;gap:6px;margin-top:10px}
                .oh-cc-smart button{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--oh-border,#e5e7eb);border-radius:10px;background:var(--oh-card,#fff);color:inherit;cursor:pointer;font:inherit;font-size:14px;text-align:left}
                .oh-cc-smart button small{margin-left:auto;color:var(--oh-muted,#6b7280)}
                .oh-cc-smart button:hover{border-color:#168653;background:#e6f5ec}
                .oh-cc-favs{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
                .oh-cc-group-title{margin:16px 0 4px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--oh-muted,#6b7280);font-weight:700}
                .oh-cc-tag{display:inline-block;padding:1px 8px;border-radius:999px;font-size:12px;font-weight:700;background:#e6f5ec;color:#12683f}
                .oh-cc-tag.warn{background:#fde8e8;color:#b23030}
                .oh-cc-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}
                .oh-cc-stats>div{padding:10px 12px;border:1px solid var(--oh-border,#e5e7eb);border-radius:12px}
                .oh-cc-stats strong{display:block;font-size:18px;font-variant-numeric:tabular-nums}
                .oh-cc-incoming{margin-top:14px;padding:15px;border-radius:12px;border:1px solid #a7dfbf;text-align:center}
                .oh-cc-backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:18px;background:rgba(10,24,16,.55)}
                .oh-cc-modal{width:min(100%,520px);max-height:calc(100vh - 36px);overflow:auto;padding:20px;border-radius:16px;background:var(--oh-card,#fff);color:inherit;box-shadow:0 30px 80px rgba(0,0,0,.35)}
                .oh-cc-modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:16px}
                @media(max-width:760px){.oh-cc-workspace{grid-template-columns:minmax(0,1fr)!important}.oh-cc-form-grid{grid-template-columns:minmax(0,1fr)}.oh-cc-span-2{grid-column:auto}.oh-cc-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
            `}</style>

            <section className="oh-page-intro">
                <div>
                    <p className="oh-eyebrow">CUSTOMER OPERATIONS</p>
                    <h2>Call Centre</h2>
                    <p>
                        Your phone, contact directory, call queue, and follow-ups in one workspace.
                    </p>
                </div>
                <button
                    type="button"
                    className="oh-button oh-button-primary"
                    onClick={() => {
                        setShowCallForm((current) => !current);
                        showFeedback("");
                    }}
                >
                    {showCallForm ? "Cancel" : "+ Record call"}
                </button>
            </section>

            <div className="oh-cc-tabs" role="tablist" aria-label="Call Centre sections">
                {[
                    ["phone", "☎ Phone"],
                    ["contacts", `Contacts (${contacts.length})`],
                    ["history", "Call history"],
                    ["queue", `Call queue (${openCalls.length})`],
                ].map(([id, label]) => (
                    <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === id}
                        className={`oh-cc-tab ${activeTab === id ? "active" : ""}`}
                        onClick={() => {
                            setActiveTab(id);
                            showFeedback("");
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {error && <p className="oh-form-error" role="alert">{error}</p>}
            {success && <p className="oh-form-success" role="status">{success}</p>}

            {showCallForm && (
                <section className="oh-panel" style={{ marginBottom: 20 }}>
                    <div className="oh-panel-header">
                        <div>
                            <h2>Record a call</h2>
                            <p>Add a customer or supplier enquiry to the existing operations queue.</p>
                        </div>
                    </div>
                    <form className="oh-form" onSubmit={handleRecordCall}>
                        <div className="oh-form-grid">
                            <div className="oh-form-field">
                                <label htmlFor="oh-cc-record-name">Contact name</label>
                                <input id="oh-cc-record-name" value={callForm.contactName} onChange={(e) => setCallForm({ ...callForm, contactName: e.target.value })} required />
                            </div>
                            <div className="oh-form-field">
                                <label htmlFor="oh-cc-record-phone">Phone number</label>
                                <input id="oh-cc-record-phone" type="tel" value={callForm.phone} onChange={(e) => setCallForm({ ...callForm, phone: e.target.value })} required />
                            </div>
                            <div className="oh-form-field">
                                <label htmlFor="oh-cc-record-priority">Priority</label>
                                <select id="oh-cc-record-priority" value={callForm.priority} onChange={(e) => setCallForm({ ...callForm, priority: e.target.value })}>
                                    {PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
                                </select>
                            </div>
                            <div className="oh-form-field">
                                <label htmlFor="oh-cc-record-reason">Reason for call</label>
                                <textarea id="oh-cc-record-reason" rows={3} value={callForm.reason} onChange={(e) => setCallForm({ ...callForm, reason: e.target.value })} required />
                            </div>
                        </div>
                        <div className="oh-form-actions">
                            <button className="oh-button oh-button-primary" type="submit">Add to queue</button>
                        </div>
                    </form>
                </section>
            )}

            <input ref={fileInputRef} type="file" accept=".vcf,text/vcard" hidden onChange={handleImportContacts} />

            {activeTab === "phone" && (
                <div className="oh-cc-workspace" style={styles.workspace}>
                    <section className="oh-panel">
                        <div className="oh-panel-header">
                            <div>
                                <h2>Contacts</h2>
                                <p>Choose a saved contact or dial a number.</p>
                            </div>
                            <button type="button" style={styles.secondary} onClick={() => (showContactForm ? closeContactForm() : openContactForm())}>
                                {showContactForm ? "Cancel" : "+ Add"}
                            </button>
                        </div>

                        <input
                            style={styles.input}
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search name, number or company..."
                            aria-label="Search contacts"
                        />

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                            <button type="button" style={styles.secondary} onClick={() => fileInputRef.current?.click()}>
                                Import .vcf
                            </button>
                            <button type="button" className={`oh-cc-chip ${favOnly ? "on" : ""}`} onClick={() => setFavOnly((v) => !v)} aria-pressed={favOnly}>
                                ★ Favourites
                            </button>
                        </div>

                        {favourites.length > 0 && !favOnly && (
                            <div className="oh-cc-favs" aria-label="Favourites">
                                {favourites.map((c) => (
                                    <button key={c.id} type="button" className="oh-cc-chip" onClick={() => selectContact(c)} title={`Dial ${c.name}`}>
                                        ★ {c.name.split(" ")[0]}
                                    </button>
                                ))}
                            </div>
                        )}

                        {importMessage && (
                            <p role="status" style={{ ...styles.muted, marginTop: 10 }}>{importMessage}</p>
                        )}

                        {contactFormJsx}

                        <div style={{ marginTop: 14 }}>
                            {filteredContacts.length === 0 ? (
                                <div className="oh-cc-empty">
                                    {contacts.length === 0
                                        ? "No saved contacts yet. Add a contact or import a .vcf file."
                                        : "No contacts match your search."}
                                </div>
                            ) : filteredContacts.map((contact) => (
                                <div
                                    key={contact.id}
                                    className="oh-cc-contact"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => selectContact(contact)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") selectContact(contact);
                                    }}
                                >
                                    <div className="oh-cc-avatar">
                                        {contact.name.slice(0, 1).toUpperCase()}
                                    </div>
                                    <div className="oh-cc-contact-main">
                                        <strong>{contact.name}</strong>
                                        <small>{contact.phone}</small>
                                        {contact.company && <small>{contact.company}</small>}
                                    </div>
                                    <button
                                        type="button"
                                        className={`oh-cc-star ${contact.favorite ? "on" : ""}`}
                                        onClick={(e) => { e.stopPropagation(); toggleFavourite(contact.id); }}
                                        aria-pressed={Boolean(contact.favorite)}
                                        aria-label={contact.favorite ? `Remove ${contact.name} from favourites` : `Add ${contact.name} to favourites`}
                                    >
                                        {contact.favorite ? "★" : "☆"}
                                    </button>
                                    <button
                                        type="button"
                                        style={styles.secondary}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            selectContact(contact);
                                        }}
                                        aria-label={`Dial ${contact.name}`}
                                    >
                                        Dial
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="oh-panel">
                        <div className="oh-panel-header">
                            <div>
                                <h2>Phone</h2>
                                <p>Dial-pad interface · real calling not connected</p>
                            </div>
                            <button type="button" style={styles.secondary} onClick={() => setSoundOn((v) => !v)} aria-pressed={soundOn} title="Keypad and call tones">
                                {soundOn ? "🔊 Tones on" : "🔇 Tones off"}
                            </button>
                        </div>

                        <div className="oh-cc-phone-screen">
                            <label className="oh-cc-label" htmlFor="oh-cc-number">Phone number</label>
                            <div style={{ display: "flex", gap: 8 }}>
                                <input
                                    id="oh-cc-number"
                                    className="oh-cc-field"
                                    type="tel"
                                    value={number}
                                    onChange={(e) => setNumber(e.target.value)}
                                    placeholder="+254 7XX XXX XXX"
                                    autoComplete="tel"
                                />
                                <button
                                    type="button"
                                    style={styles.secondary}
                                    onClick={handleDeleteDigit}
                                    onPointerDown={startBackspaceHold}
                                    onPointerUp={() => window.clearTimeout(backTimer.current)}
                                    onPointerLeave={() => window.clearTimeout(backTimer.current)}
                                    aria-label="Delete last digit (hold to clear)"
                                    title="Hold to clear"
                                >⌫</button>
                            </div>

                            {matchedContact && (
                                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14 }}>
                                    <div className="oh-cc-avatar">{matchedContact.name.slice(0, 1).toUpperCase()}</div>
                                    <div>
                                        <strong>{matchedContact.name}</strong>
                                        <div className="oh-cc-muted">{matchedContact.company || matchedContact.email || "Saved contact"}</div>
                                    </div>
                                </div>
                            )}

                            {!matchedContact && number && normalizePhone(number) && (
                                <button
                                    type="button"
                                    onClick={() => { openContactForm({ phone: number }); }}
                                    style={{ ...styles.secondary, marginTop: 10, padding: "6px 10px", fontSize: 13 }}
                                >
                                    + Save to contacts
                                </button>
                            )}

                            {smartMatches.length > 0 && (
                                <div className="oh-cc-smart" aria-label="Matching contacts">
                                    {smartMatches.map((c) => (
                                        <button key={c.id} type="button" onClick={() => setNumber(normalizePhone(c.phone))}>
                                            <span>{c.name}</span> <small>{c.phone}</small>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="oh-cc-digits" role="group" aria-label="Dial pad">
                                {KEYS.map(([digit, letters]) => (
                                    <button
                                        key={digit}
                                        type="button"
                                        className="oh-cc-digit"
                                        onClick={() => handleDialDigit(digit)}
                                        onPointerDown={digit === "0" ? startZeroHold : undefined}
                                        onPointerUp={digit === "0" ? () => window.clearTimeout(zeroTimer.current) : undefined}
                                        onPointerLeave={digit === "0" ? () => window.clearTimeout(zeroTimer.current) : undefined}
                                    >
                                        {digit}<span>{letters || "\u00a0"}</span>
                                    </button>
                                ))}
                            </div>

                            <div style={{ display: "flex", gap: 9 }}>
                                <button type="button" style={{ ...styles.secondary, flex: 1 }} onClick={() => setNumber("")}>Clear</button>
                                {!activeCall ? (
                                    <button type="button" className="oh-cc-call-action" style={{ flex: 2 }} onClick={handleStartCall}>
                                        ☎ Start demo call
                                    </button>
                                ) : (
                                    <button type="button" className="oh-cc-end-action" style={{ flex: 2 }} onClick={handleEndCall}>
                                        ■ End demo call
                                    </button>
                                )}
                            </div>
                        </div>

                        {incoming && !activeCall && (
                            <section className="oh-cc-incoming" aria-live="polite">
                                <p className="oh-eyebrow">INCOMING DEMO CALL</p>
                                <h3 style={{ margin: "8px 0 4px" }}>{incoming.contactName}</h3>
                                <p style={styles.muted}>{incoming.phone}</p>
                                <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
                                    <button type="button" className="oh-cc-end-action" onClick={declineIncoming}>Decline</button>
                                    <button type="button" className="oh-cc-call-action" onClick={answerIncoming}>Answer</button>
                                </div>
                            </section>
                        )}

                        {activeCall && (
                            <section style={{ marginTop: 14, padding: 15, borderRadius: 12, border: "1px solid #a7dfbf" }}>
                                <p className="oh-eyebrow">DEMO CALL IN PROGRESS</p>
                                <h3 style={{ margin: "8px 0 4px" }}>{activeCall.contactName}</h3>
                                <p style={styles.muted}>{activeCall.phone}</p>
                                <p style={{ fontSize: 28, fontVariantNumeric: "tabular-nums", margin: "12px 0" }}>
                                    {formatDuration(callSeconds)}
                                </p>
                                <p className="oh-cc-muted">
                                    Timer preview only; no phone connection is active.
                                    {held ? " · On hold" : ""}{muted ? " · Muted" : ""}
                                </p>
                                {sentDigits && <p className="oh-cc-muted" style={{ letterSpacing: "0.12em" }}>Sent: {sentDigits}</p>}
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                                    <button type="button" style={styles.secondary} onClick={() => setMuted((value) => !value)}>
                                        {muted ? "Unmute" : "Mute"}
                                    </button>
                                    <button type="button" style={styles.secondary} onClick={() => setHeld((value) => !value)}>
                                        {held ? "Resume" : "Hold"}
                                    </button>
                                    {!contacts.some((c) => samePhone(c.phone, activeCall.phone)) && (
                                        <button type="button" style={styles.secondary} onClick={() => openContactForm({ phone: activeCall.phone })}>
                                            Save contact
                                        </button>
                                    )}
                                </div>
                                <label className="oh-cc-label" htmlFor="oh-cc-call-notes" style={{ marginTop: 16 }}>Call notes</label>
                                <textarea id="oh-cc-call-notes" className="oh-cc-field" rows={3} value={callNotes} onChange={(e) => setCallNotes(e.target.value)} placeholder="Add the outcome or follow-up..." />
                            </section>
                        )}

                        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <button type="button" style={{ ...styles.secondary, padding: "6px 10px", fontSize: 13 }} onClick={simulateIncoming}>
                                Simulate incoming call
                            </button>
                        </div>

                        <p className="oh-cc-muted" style={{ marginTop: 12 }}>
                            Demo calls do not connect to mobile or landline networks. Mute and hold are interface previews only. Tip: type digits on your keyboard or paste a number.
                        </p>
                    </section>
                </div>
            )}

            {activeTab === "contacts" && (
                <section className="oh-panel">
                    <div className="oh-panel-header">
                        <div>
                            <h2>Contact directory</h2>
                            <p>Manage contacts for the Call Centre.</p>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button type="button" style={styles.secondary} onClick={() => fileInputRef.current?.click()}>Import .vcf</button>
                            <button type="button" style={styles.secondary} onClick={() => exportContacts("vcf")}>Export .vcf</button>
                            <button type="button" style={styles.secondary} onClick={() => exportContacts("csv")}>Export .csv</button>
                            <button type="button" style={styles.secondary} onClick={() => (showContactForm ? closeContactForm() : openContactForm())}>
                                {showContactForm ? "Cancel" : "+ Add contact"}
                            </button>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <input style={{ ...styles.input, flex: 1, minWidth: 200 }} type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search contacts..." />
                        <button type="button" className={`oh-cc-chip ${favOnly ? "on" : ""}`} onClick={() => setFavOnly((v) => !v)} aria-pressed={favOnly}>★ Favourites</button>
                    </div>
                    {importMessage && <p role="status" style={{ ...styles.muted, marginTop: 10 }}>{importMessage}</p>}

                    {contactFormJsx}

                    {filteredContacts.length === 0 ? (
                        <div className="oh-cc-empty">No contacts found. Add a contact or import a .vcf file.</div>
                    ) : filteredContacts.map((contact) => (
                        <div key={contact.id} className="oh-cc-contact">
                            <div className="oh-cc-avatar">{contact.name.slice(0, 1).toUpperCase()}</div>
                            <div className="oh-cc-contact-main">
                                <strong>{contact.name}</strong>
                                <small>{contact.phone}</small>
                                {contact.email && <small>{contact.email}</small>}
                                {contact.company && <small>{contact.company}</small>}
                                {contact.notes && <small>{contact.notes}</small>}
                            </div>
                            <div className="oh-cc-actions">
                                <button
                                    type="button"
                                    className={`oh-cc-star ${contact.favorite ? "on" : ""}`}
                                    onClick={() => toggleFavourite(contact.id)}
                                    aria-pressed={Boolean(contact.favorite)}
                                    aria-label={contact.favorite ? `Remove ${contact.name} from favourites` : `Add ${contact.name} to favourites`}
                                >
                                    {contact.favorite ? "★" : "☆"}
                                </button>
                                <button type="button" style={styles.secondary} onClick={() => openContactForm(contact)} aria-label={`Edit ${contact.name}`}>Edit</button>
                                <button
                                    type="button"
                                    style={confirmDelete === contact.id ? { ...styles.secondary, background: "#c93636", borderColor: "#c93636", color: "#fff" } : styles.secondary}
                                    onClick={() => removeContact(contact.id)}
                                    aria-label={confirmDelete === contact.id ? `Confirm delete ${contact.name}` : `Delete ${contact.name}`}
                                >
                                    {confirmDelete === contact.id ? "Sure?" : "Delete"}
                                </button>
                                <button type="button" style={styles.secondary} onClick={() => selectContact(contact)}>Call</button>
                            </div>
                        </div>
                    ))}
                </section>
            )}

            {activeTab === "history" && (
                <section className="oh-panel">
                    <div className="oh-panel-header">
                        <div>
                            <h2>Call history</h2>
                            <p>Recent demo calls and records from the operations queue.</p>
                        </div>
                        {history.length > 0 && (
                            <button
                                type="button"
                                style={styles.secondary}
                                onClick={() => {
                                    if (window.confirm("Clear all call history on this device?")) {
                                        setHistory([]);
                                        showFeedback("Call history cleared.");
                                    }
                                }}
                            >
                                Clear history
                            </button>
                        )}
                    </div>

                    <div className="oh-cc-stats">
                        <div><strong>{stats.total}</strong><span className="oh-cc-muted">Calls</span></div>
                        <div><strong>{stats.total ? Math.round((stats.answered / stats.total) * 100) : 0}%</strong><span className="oh-cc-muted">Answered</span></div>
                        <div><strong>{stats.missed}</strong><span className="oh-cc-muted">Missed or declined</span></div>
                        <div><strong>{formatTalkTime(stats.talk)}</strong><span className="oh-cc-muted">Total talk time</span></div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <input style={{ ...styles.input, flex: 1, minWidth: 200 }} type="search" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="Search calls..." aria-label="Search call history" />
                        <div className="oh-cc-chips">
                            {["All", "Outgoing", "Incoming", "Missed"].map((f) => (
                                <button key={f} type="button" className={`oh-cc-chip ${historyFilter === f ? "on" : ""}`} onClick={() => setHistoryFilter(f)}>{f}</button>
                            ))}
                        </div>
                    </div>

                    {historyGroups.length === 0 && calls.length === 0 && (
                        <div className="oh-cc-empty">
                            {history.length ? "No calls match this filter." : "No calls recorded yet. Use the dial pad or record a call."}
                        </div>
                    )}

                    {historyGroups.map((group) => (
                        <div key={group.label}>
                            <p className="oh-cc-group-title">{group.label}</p>
                            {group.items.map((call) => {
                                const missed = MISSED.includes(call.outcome);
                                return (
                                    <div key={call.id} className="oh-cc-contact">
                                        <div className="oh-cc-avatar">{call.direction === "Incoming" ? "↙" : "↗"}</div>
                                        <div className="oh-cc-contact-main">
                                            <strong>{call.contactName || "Unknown contact"}</strong>
                                            <small>{call.phone || "No phone number"} · {call.direction || "Recorded call"} · {timeLabel(call.startedAt)}</small>
                                            <small>
                                                <span className={`oh-cc-tag ${missed ? "warn" : ""}`}>{call.outcome}</span>
                                                {call.durationSeconds > 0 ? ` · ${formatDuration(call.durationSeconds)}` : ""}
                                            </small>
                                            {call.notes && <small>Notes: {call.notes}</small>}
                                        </div>
                                        <div className="oh-cc-actions">
                                            {!contacts.some((c) => samePhone(c.phone, call.phone)) && (
                                                <button type="button" style={styles.secondary} onClick={() => { openContactForm({ name: call.contactName === call.phone ? "" : call.contactName, phone: call.phone }); setActiveTab("contacts"); }}>Save</button>
                                            )}
                                            <button type="button" style={styles.secondary} onClick={() => setHistory((cur) => cur.filter((x) => x.id !== call.id))} aria-label="Delete this entry">Delete</button>
                                            <button type="button" style={styles.secondary} onClick={() => { setNumber(call.phone || ""); setActiveTab("phone"); }}>Redial</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}

                    {calls.length > 0 && (
                        <div>
                            <p className="oh-cc-group-title">Logged enquiries</p>
                            {calls.map((call, index) => (
                                <div key={`${call.id || call.phone}-${index}`} className="oh-cc-contact">
                                    <div className="oh-cc-avatar">{call.direction === "Incoming" ? "↙" : "↗"}</div>
                                    <div className="oh-cc-contact-main">
                                        <strong>{call.contactName || "Unknown contact"}</strong>
                                        <small>{call.phone || "No phone number"} · {call.direction || "Recorded call"}</small>
                                        <small>{call.status || "Open"}{call.durationSeconds != null ? ` · ${formatDuration(call.durationSeconds)}` : ""}</small>
                                        {call.reason && <small>{call.reason}</small>}
                                        {call.notes && <small>Notes: {call.notes}</small>}
                                    </div>
                                    <button type="button" style={styles.secondary} onClick={() => { setNumber(call.phone || ""); setActiveTab("phone"); }}>Redial</button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {activeTab === "queue" && (
                <>
                    <section className="oh-stats-grid oh-call-stats">
                        <article className="oh-stat-card">
                            <div className="oh-stat-card-header"><p className="oh-stat-label">Total calls</p></div>
                            <div className="oh-stat-card-body"><h3 className="oh-stat-value">{calls.length}</h3><p className="oh-stat-detail">Recorded queue entries</p></div>
                        </article>
                        <article className="oh-stat-card">
                            <div className="oh-stat-card-header"><p className="oh-stat-label">Open calls</p></div>
                            <div className="oh-stat-card-body"><h3 className="oh-stat-value">{openCalls.length}</h3><p className="oh-stat-detail">Requiring attention</p></div>
                        </article>
                        <article className="oh-stat-card">
                            <div className="oh-stat-card-header"><p className="oh-stat-label">Resolved calls</p></div>
                            <div className="oh-stat-card-body"><h3 className="oh-stat-value">{resolvedCalls.length}</h3><p className="oh-stat-detail">Marked resolved</p></div>
                        </article>
                    </section>
                    <section className="oh-panel">
                        <div className="oh-panel-header">
                            <div><h2>Call queue</h2><p>Assign responsibility and update the status of each enquiry.</p></div>
                        </div>
                        <CallQueue calls={calls} onAssign={handleAssign} onUpdateStatus={handleStatusUpdate} />
                    </section>
                </>
            )}

            <p className="oh-page-note">
                Contacts and call history are saved in this browser (localStorage) so they survive a refresh, but they are not shared between devices. Real telephony and server-side storage are separate future integrations.
            </p>

            {wrapUp && <WrapUpDialog wrap={wrapUp} onSave={finishWrapUp} onSkip={skipWrapUp} />}
            {assigning && <AssignDialog call={assigning} suggestions={assignees} onAssign={submitAssign} onClose={() => setAssigning(null)} />}
        </div>
    );
}