import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Ban,
    BatteryFull,
    ChevronDown,
    Clock,
    Delete,
    ExternalLink,
    Link2,
    ListChecks,
    MessageSquare,
    Music,
    Square,
    Star,
    Upload,
    CircleHelp,
    Grid3x3,
    Mic,
    MicOff,
    Pause,
    Phone,
    PhoneIncoming,
    PhoneOff,
    Play,
    Settings,
    ShieldAlert,
    ShieldCheck,
    Signal,
    StickyNote,
    UserPlus,
    UserRound,
    Users,
    Volume2,
    VolumeX,
    Wifi,
} from "lucide-react";
import CallQueue from "../components/CallQueue";

/* ====================================================================
   Call Centre  (phone-style interface + business call queue)

   Phone side (frontend prototype, simulated calling):
   - Dialer: big number display, keypad with letters, country code
     selector, smart contact suggestions, backspace / clear, paste,
     keyboard input, long-press 0 for "+", long-press ⌫ to clear
   - Recents: incoming / outgoing / missed, tap a record to call again
   - Incoming call: full-screen ringing screen with caller ID and
     spam warning (accept / decline / block)
   - Active call: full-screen with live timer, mute, speaker, hold,
     in-call keypad, add another caller, notes, minimise, end
   - Contacts: favourites, profile pages, verified business labels,
     edit / delete, import .vcf, export .vcf / .csv
   - Caller ID: identify numbers, report spam, block / unblock
   - Real DTMF keypad tones, connect / hang-up tones, ringtone

   Business side (unchanged):
   - Call queue, assignment, priority, open / resolved, statistics
   Props unchanged: calls, onAddCall, onAssignCall, onUpdateCallStatus
   Saved in this browser (localStorage). Real SIM / VoIP calling and
   system-level caller ID need native integration later.
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
    verified: false,
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

const COUNTRIES = [
    { code: "KE", dial: "+254", name: "Kenya" },
    { code: "UG", dial: "+256", name: "Uganda" },
    { code: "TZ", dial: "+255", name: "Tanzania" },
    { code: "RW", dial: "+250", name: "Rwanda" },
    { code: "NG", dial: "+234", name: "Nigeria" },
    { code: "ZA", dial: "+27", name: "South Africa" },
    { code: "GB", dial: "+44", name: "United Kingdom" },
    { code: "US", dial: "+1", name: "United States" },
    { code: "IN", dial: "+91", name: "India" },
];

/* Demo callers used by "Simulate incoming call" (fictional numbers) */
const DEMO_CALLERS = [
    { name: "Unknown number", phone: "+254 700 000 111" },
    { name: "Nairobi Wholesale Co.", phone: "+254 20 555 0142" },
    { name: "Unknown number", phone: "+254 722 555 019" },
];
const SEED_SPAM = ["+254700000111"];
const SEED_VERIFIED = { "+254205550142": "Nairobi Wholesale Co." };

const OUTCOMES = ["Answered", "No answer", "Voicemail", "Busy", "Wrong number"];
const PRIORITIES = ["Low", "Normal", "High", "Urgent"];
const MISSED = ["Missed", "Declined", "No answer", "Blocked"];

/* Ringtones: generated in the browser, so they work offline */
const BUILTIN_TONES = [
    { id: "classic", label: "Classic ring", desc: "Familiar two-tone phone ring" },
    { id: "neon", label: "Neon", desc: "Glowing synth arpeggio" },
    { id: "marimba", label: "Marimba", desc: "Warm, bouncy wooden notes" },
    { id: "groove", label: "Groove", desc: "Deep kick with bright sparkles" },
    { id: "retro", label: "Retro arcade", desc: "Chunky 8-bit beeps" },
    { id: "chime", label: "Rising chime", desc: "Clean ascending notes" },
    { id: "bells", label: "Soft bells", desc: "Calm, glassy bells" },
    { id: "digital", label: "Digital pulse", desc: "Sharp triple beep" },
];
const DEFAULT_TONE = { kind: "builtin", id: "classic", label: "Classic ring", src: "" };
const MAX_TONE_BYTES = 15 * 1024 * 1024;
const AUDIO_EXTENSIONS = /\.(mp3|wav|ogg|oga|m4a|aac|opus|flac|webm|weba|mp4)$/i;
/* Built-in tones are synthesised quietly, so they are boosted before the
   master volume is applied. */
const GAIN_BOOST = 2.6;

/* Free sound libraries. Each site has its own licence, so check it before
   using a tone commercially. */
const TONE_SOURCES = [
    { name: "Mixkit phone ringtones", url: "https://mixkit.co/free-sound-effects/phone-ring/", note: "Free, no sign-up (Mixkit licence)" },
    { name: "Pixabay sound effects", url: "https://pixabay.com/sound-effects/search/ringtone/", note: "Free, attribution optional" },
    { name: "BigSoundBank", url: "https://bigsoundbank.com/", note: "CC0 public-domain sounds" },
];

const QUICK_REPLIES = [
    "Can't talk right now. I'll call you back.",
    "I'm in a meeting. Please send a message.",
    "Call me later, please.",
];

function regionFor(phone = "") {
    const n = normalizePhone(phone);
    if (!n.startsWith("+")) return "";
    const hit = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((c) => n.startsWith(c.dial));
    return hit ? hit.name : "";
}

function typeLabel(info) {
    if (!info) return "";
    if (info.kind === "verified") return "Business";
    if (info.kind === "contact") return "Personal contact";
    if (info.kind === "spam") return "Spam";
    if (info.kind === "blocked") return "Blocked";
    return "Unknown caller";
}

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

/* Adds the selected country code to local numbers that start with 0 */
function applyCountry(value = "", dial = "+254") {
    const raw = String(value).trim();
    if (!raw) return "";
    if (raw.startsWith("+")) return raw;
    const digits = normalizePhone(raw);
    if (!digits) return raw;
    if (digits.startsWith("00")) return `+${digits.slice(2)}`;
    if (/^[*#]/.test(digits)) return digits;
    if (digits.startsWith("0")) return `${dial}${digits.slice(1)}`;
    return raw;
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
            verified: false,
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
            blocked: Array.isArray(raw.blocked) ? raw.blocked : [],
            spam: Array.isArray(raw.spam) ? raw.spam : [],
            country: COUNTRIES.some((c) => c.code === raw.country) ? raw.country : "KE",
            ringtone: raw.ringtone && typeof raw.ringtone === "object" && raw.ringtone.kind ? raw.ringtone : DEFAULT_TONE,
            volume: typeof raw.volume === "number" ? Math.min(1, Math.max(0, raw.volume)) : 0.8,
            sound: raw.sound !== false,
        };
    } catch {
        return { contacts: [], history: [], blocked: [], spam: [], country: "KE", ringtone: DEFAULT_TONE, volume: 0.8, sound: true };
    }
}

/* Uploaded ringtones are stored as a file in IndexedDB (localStorage is far
   too small for audio). */
const TONE_DB = "oh-call-centre-audio";
const TONE_STORE = "tones";

function openToneDb() {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === "undefined") { reject(new Error("IndexedDB unavailable")); return; }
        const request = indexedDB.open(TONE_DB, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(TONE_STORE);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveToneBlob(blob) {
    const db = await openToneDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(TONE_STORE, "readwrite");
        tx.objectStore(TONE_STORE).put(blob, "ringtone");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function loadToneBlob() {
    const db = await openToneDb();
    return new Promise((resolve, reject) => {
        const request = db.transaction(TONE_STORE, "readonly").objectStore(TONE_STORE).get("ringtone");
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

async function clearToneBlob() {
    try {
        const db = await openToneDb();
        db.transaction(TONE_STORE, "readwrite").objectStore(TONE_STORE).delete("ringtone");
    } catch { /* nothing stored */ }
}

/* ---------------------------------------------------------------- */
/* Phone tones (Web Audio)                                           */
/* ---------------------------------------------------------------- */

function useTones(soundOn, volume = 0.8) {
    const ctxRef = useRef(null);
    const masterRef = useRef(null);
    const loopRef = useRef(null);
    const audioRef = useRef(null);
    const previewTimer = useRef(null);
    const onRef = useRef(soundOn);
    onRef.current = soundOn;
    const volRef = useRef(volume);
    volRef.current = volume;

    /* Creates (or re-creates, if it was closed by a hot reload) the audio
       context with a compressor and master volume, and resumes it if the
       browser left it suspended. */
    const getContext = useCallback(() => {
        const AudioCtx = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
        if (!AudioCtx) return null;
        if (!ctxRef.current || ctxRef.current.state === "closed") {
            const ctx = new AudioCtx();
            const compressor = ctx.createDynamicsCompressor();
            const gain = ctx.createGain();
            gain.gain.value = volRef.current;
            compressor.connect(gain);
            gain.connect(ctx.destination);
            ctxRef.current = ctx;
            masterRef.current = { input: compressor, gain };
        }
        if (ctxRef.current.state === "suspended") ctxRef.current.resume().catch(() => { });
        return ctxRef.current;
    }, []);

    useEffect(() => {
        if (masterRef.current) masterRef.current.gain.gain.value = volume;
    }, [volume]);

    /* Browsers only allow audio after a click or key press, so unlock the
       audio context on the first interaction. */
    useEffect(() => {
        const unlock = () => { getContext(); };
        window.addEventListener("pointerdown", unlock);
        window.addEventListener("keydown", unlock);
        return () => {
            window.removeEventListener("pointerdown", unlock);
            window.removeEventListener("keydown", unlock);
        };
    }, [getContext]);

    /* type: oscillator waveform. perc: plucked envelope (quick attack, then
       decay) instead of a held tone. */
    const beep = useCallback((freqs, ms, { gain = 0.1, delay = 0, type = "sine", perc = false } = {}) => {
        if (!onRef.current) return;
        const ctx = getContext();
        if (!ctx || !masterRef.current) return;
        const peak = Math.min(0.9, gain * GAIN_BOOST);
        const start = ctx.currentTime + delay / 1000;
        const end = start + ms / 1000;
        const master = ctx.createGain();
        master.gain.setValueAtTime(0.0001, start);
        if (perc) {
            master.gain.exponentialRampToValueAtTime(peak, start + 0.008);
            master.gain.exponentialRampToValueAtTime(0.0001, end);
        } else {
            master.gain.exponentialRampToValueAtTime(peak, start + 0.012);
            master.gain.setValueAtTime(peak, Math.max(start + 0.012, end - 0.03));
            master.gain.exponentialRampToValueAtTime(0.0001, end);
        }
        master.connect(masterRef.current.input);
        freqs.forEach((f) => {
            const osc = ctx.createOscillator();
            osc.type = type;
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
        if (previewTimer.current) {
            window.clearTimeout(previewTimer.current);
            previewTimer.current = null;
        }
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
    }, []);

    const key = useCallback((k) => { if (DTMF[k]) beep(DTMF[k], 140, { gain: 0.12 }); }, [beep]);

    const patternRing = useCallback((id) => {
        const patterns = {
            classic: [() => {
                beep([659, 523], 220, { gain: 0.08 });
                beep([659, 523], 220, { gain: 0.08, delay: 300 });
                beep([784, 659], 320, { gain: 0.08, delay: 640 });
            }, 2200],
            chime: [() => {
                [523, 659, 784, 1047].forEach((f, i) => beep([f], 200, { gain: 0.08, delay: i * 190 }));
            }, 2400],
            digital: [() => {
                [0, 150, 300].forEach((d) => beep([880], 90, { gain: 0.08, delay: d }));
            }, 1600],
            bells: [() => {
                beep([1319, 1568], 420, { gain: 0.06 });
                beep([1175, 1397], 420, { gain: 0.06, delay: 480 });
            }, 2600],
            neon: [() => {
                [523, 659, 784, 988, 784, 659].forEach((f, i) =>
                    beep([f, f * 2], 170, { gain: 0.05, delay: i * 120, type: "triangle", perc: true }));
            }, 1900],
            marimba: [() => {
                [659, 784, 988, 784, 1175, 988, 784, 659].forEach((f, i) =>
                    beep([f], 280, { gain: 0.14, delay: i * 140, perc: true }));
            }, 2500],
            groove: [() => {
                [0, 400].forEach((d) => beep([95], 220, { gain: 0.22, delay: d, perc: true }));
                [200, 600, 700].forEach((d, i) => beep([i === 2 ? 988 : 784], 160, { gain: 0.07, delay: d, type: "triangle", perc: true }));
            }, 1500],
            retro: [() => {
                [880, 988, 1175, 988, 1319].forEach((f, i) =>
                    beep([f], 110, { gain: 0.035, delay: i * 130, type: "square" }));
            }, 1900],
        };
        const [burst, every] = patterns[id] || patterns.classic;
        burst();
        loopRef.current = window.setInterval(burst, every);
    }, [beep]);

    /* Plays the chosen ringtone on a loop. File and link tones use an audio
       element. If one cannot play, onFail runs and (unless strict) the
       classic ring plays instead. Previews are strict so a broken file never
       sounds like a working one. */
    const ringtone = useCallback((tone, onFail, strict = false) => {
        stop();
        const chosen = tone || DEFAULT_TONE;

        if (chosen.kind === "file" || chosen.kind === "url") {
            if (!onRef.current) return;
            const fail = () => {
                if (onFail) onFail();
                if (!strict) patternRing("classic");
            };
            if (!chosen.src) { fail(); return; }

            const audio = new Audio(chosen.src);
            audio.loop = true;
            audio.volume = Math.max(0.05, Math.min(1, volRef.current));
            audioRef.current = audio;
            const fallback = () => {
                if (audioRef.current !== audio) return;
                audioRef.current = null;
                fail();
            };
            audio.onerror = fallback;
            const started = audio.play();
            if (started && started.catch) started.catch(fallback);
            return;
        }

        patternRing(chosen.id);
    }, [stop, patternRing]);

    const preview = useCallback((tone, onFail) => {
        ringtone(tone, onFail, true);
        previewTimer.current = window.setTimeout(stop, 8000);
    }, [ringtone, stop]);

    const connect = useCallback(() => {
        beep([880], 90, { gain: 0.07 });
        beep([1175], 120, { gain: 0.07, delay: 130 });
    }, [beep]);

    const hangup = useCallback(() => {
        beep([480, 620], 170, { gain: 0.07 });
        beep([480, 620], 170, { gain: 0.07, delay: 240 });
    }, [beep]);

    /* Plays a short two-note beep and reports the audio state so problems
       (blocked by the browser, no output) can be shown to the person. */
    const test = useCallback(async () => {
        const ctx = getContext();
        if (!ctx) return "unsupported";
        try { await ctx.resume(); } catch { /* handled below */ }
        if (!onRef.current) return "off";
        if (ctx.state === "running") {
            beep([880], 260, { gain: 0.14, perc: true });
            beep([1175], 320, { gain: 0.14, delay: 280, perc: true });
        }
        return ctx.state;
    }, [getContext, beep]);

    useEffect(() => () => {
        stop();
        const ctx = ctxRef.current;
        ctxRef.current = null;
        masterRef.current = null;
        if (ctx && ctx.close) ctx.close().catch(() => { });
    }, [stop]);

    return useMemo(() => ({ key, ringtone, preview, connect, hangup, stop, test }), [key, ringtone, preview, connect, hangup, stop, test]);
}

/* ---------------------------------------------------------------- */
/* Small shared pieces                                               */
/* ---------------------------------------------------------------- */

function Avatar({ name = "", size = 40 }) {
    const label = String(name).trim();
    const isNumber = !label || /^[+\d*#\s()-]+$/.test(label);
    let hash = 0;
    for (let i = 0; i < label.length; i += 1) hash = (hash * 31 + label.charCodeAt(i)) % 360;

    return (
        <span
            className="oh-cc-avatar"
            style={{
                width: size,
                height: size,
                fontSize: Math.round(size * 0.4),
                background: isNumber ? "#e5e7eb" : `hsl(${hash} 45% 90%)`,
                color: isNumber ? "#4b5563" : `hsl(${hash} 55% 26%)`,
            }}
            aria-hidden="true"
        >
            {isNumber ? <UserRound size={Math.round(size * 0.5)} /> : label.slice(0, 1).toUpperCase()}
        </span>
    );
}

function CallerBadge({ info }) {
    if (!info) return null;
    const icons = {
        verified: <ShieldCheck size={13} />,
        contact: <UserRound size={13} />,
        spam: <ShieldAlert size={13} />,
        blocked: <Ban size={13} />,
        unknown: <CircleHelp size={13} />,
    };
    return (
        <span className={`oh-cc-badge ${info.kind}`}>
            {icons[info.kind]}
            {info.label}
        </span>
    );
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

function WrapUpDialog({ wrap, info, onSave, onSkip, onSaveContact, onBlock, onReportSpam }) {
    const [outcome, setOutcome] = useState(wrap.connected ? "Answered" : "No answer");
    const [notes, setNotes] = useState(wrap.notes || "");
    const [followUp, setFollowUp] = useState(true);
    const [priority, setPriority] = useState("Normal");
    const [saveName, setSaveName] = useState("");

    const unsaved = info.kind === "unknown" || info.kind === "spam";
    const region = regionFor(wrap.call.phone);

    return (
        <Modal
            title="After call"
            subtitle={`${wrap.connected ? formatDuration(wrap.seconds) : "Not connected"} · ${wrap.call.direction || "Call"}`}
            onClose={onSkip}
        >
            <div className="oh-cc-after-head">
                <Avatar name={info.name || wrap.call.contactName} size={52} />
                <div>
                    <strong>{info.name || wrap.call.contactName}</strong>
                    <div className="oh-cc-muted">{wrap.call.phone}{region ? ` · ${region}` : ""}</div>
                </div>
                <CallerBadge info={info} />
            </div>

            <div className="oh-cc-after-actions">
                {unsaved && (
                    <form
                        onSubmit={(e) => { e.preventDefault(); if (saveName.trim()) { onSaveContact(saveName.trim()); setSaveName(""); } }}
                        style={{ display: "flex", gap: 6, flex: "1 1 220px" }}
                    >
                        <input className="oh-cc-field" value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Save as name" aria-label="Save caller as" />
                        <button type="submit" style={styles.secondary} disabled={!saveName.trim()}>Save</button>
                    </form>
                )}
                {info.kind !== "blocked" && (
                    <button type="button" style={styles.secondary} onClick={onBlock}>Block</button>
                )}
                {info.kind === "unknown" && (
                    <button type="button" style={styles.secondary} onClick={onReportSpam}>Report spam</button>
                )}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); onSave({ outcome, notes: notes.trim(), followUp, priority }); }}>
                <span className="oh-cc-label" style={{ marginTop: 14 }}>Outcome</span>
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

/* Drag the knob right to answer or left to decline (arrow keys and the
   end buttons also work). */
function SwipeAnswer({ onAnswer, onDecline }) {
    const trackRef = useRef(null);
    const startX = useRef(0);
    const maxRef = useRef(1);
    const dragging = useRef(false);
    const [x, setX] = useState(0);

    function down(e) {
        const track = trackRef.current;
        if (!track) return;
        dragging.current = true;
        startX.current = e.clientX;
        maxRef.current = Math.max(1, (track.clientWidth - 64) / 2);
        e.currentTarget.setPointerCapture(e.pointerId);
    }

    function move(e) {
        if (!dragging.current) return;
        const next = (e.clientX - startX.current) / maxRef.current;
        setX(Math.max(-1, Math.min(1, next)));
    }

    function up() {
        if (!dragging.current) return;
        dragging.current = false;
        if (x >= 0.85) { setX(1); onAnswer(); return; }
        if (x <= -0.85) { setX(-1); onDecline(); return; }
        setX(0);
    }

    const tint = x > 0.15 ? `rgba(31,165,95,${0.25 + x * 0.5})` : x < -0.15 ? `rgba(209,59,59,${0.25 + -x * 0.5})` : "rgba(255,255,255,.12)";

    return (
        <div className="oh-cc-swipe" ref={trackRef} style={{ background: tint }}>
            <button type="button" className="oh-cc-swipe-end decline" onClick={onDecline} aria-label="Decline call">
                <PhoneOff size={22} />
            </button>
            <span className="oh-cc-swipe-hint">Swipe to answer or decline</span>
            <button type="button" className="oh-cc-swipe-end answer" onClick={onAnswer} aria-label="Answer call">
                <Phone size={22} />
            </button>
            <div
                className="oh-cc-swipe-knob"
                role="slider"
                tabIndex={0}
                aria-label="Swipe right to answer, left to decline"
                aria-valuemin={-1}
                aria-valuemax={1}
                aria-valuenow={Math.round(x * 100) / 100}
                style={{ transform: `translateX(${x * maxRef.current}px)`, transition: dragging.current ? "none" : "transform .18s" }}
                onPointerDown={down}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={up}
                onKeyDown={(e) => {
                    if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); onAnswer(); }
                    if (e.key === "ArrowLeft" || e.key === "Escape") { e.preventDefault(); onDecline(); }
                }}
            >
                <Phone size={24} />
            </div>
        </div>
    );
}

/* Phone-shaped window: calls appear inside a floating phone instead of
   taking over the whole page. */
function StatusBar() {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 15000);
        return () => window.clearInterval(timer);
    }, []);
    return (
        <div className="oh-cc-statusbar" aria-hidden="true">
            <span>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            <span className="oh-cc-notch" />
            <span className="icons"><Signal size={13} /><Wifi size={13} /><BatteryFull size={16} /></span>
        </div>
    );
}

function PhoneFrame({ children }) {
    return (
        <div className="oh-cc-phone">
            <div className="oh-cc-phone-bezel">
                <div className="oh-cc-phone-display">
                    <StatusBar />
                    {children}
                    <div className="oh-cc-home-bar" aria-hidden="true" />
                </div>
            </div>
        </div>
    );
}

/* Caller-ID incoming call (caller type, location, spam warning,
   quick reply, swipe to answer). Colour changes with the caller type. */
function IncomingScreen({ incoming, info, onAnswer, onDecline }) {
    const [replying, setReplying] = useState(false);
    const name = info.name || incoming.contactName;
    const region = regionFor(incoming.phone);
    const risky = info.kind === "spam" || info.kind === "unknown";

    return (
        <div className={`oh-cc-screen oh-cc-in-${info.kind}`} role="alertdialog" aria-modal="false" aria-label="Incoming call">
            <div className="oh-cc-screen-top">
                <span className="oh-cc-brandline"><ShieldCheck size={16} /> BizPilot Caller ID</span>
                <span>Demo call · not a real call</span>
            </div>

            <div className="oh-cc-screen-body">
                <div className="oh-cc-ring">
                    <i /><i /><i />
                    <Avatar name={name} size={112} />
                </div>
                <h2>{name}</h2>
                <p className="oh-cc-in-number">{incoming.phone}</p>
                {region && <p className="oh-cc-in-region">{region}</p>}

                <div className="oh-cc-in-tags">
                    <span className="oh-cc-in-type">{typeLabel(info)}</span>
                    <CallerBadge info={info} />
                </div>

                {info.kind === "spam" && (
                    <div className="oh-cc-spam-warn" role="alert">
                        <ShieldAlert size={20} />
                        <span><b>Suspected spam.</b> Do not share PINs, one-time codes or payment details.</span>
                    </div>
                )}
                {info.kind === "unknown" && (
                    <p className="oh-cc-in-note">Not in your contacts. Be careful before sharing personal details.</p>
                )}
            </div>

            {replying ? (
                <div className="oh-cc-reply-sheet" role="group" aria-label="Quick replies">
                    <p>Decline and send a message</p>
                    {QUICK_REPLIES.map((r) => (
                        <button key={r} type="button" onClick={() => onDecline(false, r)}>{r}</button>
                    ))}
                    <button type="button" className="cancel" onClick={() => setReplying(false)}>Back</button>
                </div>
            ) : (
                <>
                    <div className="oh-cc-in-actions">
                        <button type="button" onClick={() => setReplying(true)}>
                            <b><MessageSquare size={20} /></b>Message
                        </button>
                        {info.kind !== "contact" && info.kind !== "verified" && (
                            <button type="button" onClick={() => onDecline(true)}>
                                <b><Ban size={20} /></b>Block
                            </button>
                        )}
                        {risky && (
                            <button type="button" onClick={() => onDecline(true, "", true)}>
                                <b><ShieldAlert size={20} /></b>Report spam
                            </button>
                        )}
                    </div>
                    <SwipeAnswer onAnswer={onAnswer} onDecline={() => onDecline(false)} />
                </>
            )}
        </div>
    );
}

function ProfileDialog({ contact, info, recent, onClose, onCall, onEdit, onFavourite, onBlock }) {
    const blocked = info.kind === "blocked";
    return (
        <Modal title="Contact profile" onClose={onClose}>
            <div className="oh-cc-profile-head">
                <Avatar name={contact.name} size={72} />
                <h3>{contact.name}</h3>
                <p style={styles.muted}>{contact.phone}</p>
                <CallerBadge info={info} />
            </div>

            <div className="oh-cc-profile-actions">
                <button type="button" className="oh-cc-call-action" onClick={onCall} disabled={blocked} style={{ opacity: blocked ? 0.5 : 1 }}>
                    <Phone size={16} /> Call
                </button>
                <button type="button" style={styles.secondary} onClick={onEdit}>Edit</button>
                <button type="button" style={styles.secondary} onClick={onFavourite}>
                    {contact.favorite ? "★ Favourite" : "☆ Favourite"}
                </button>
                <button type="button" style={styles.secondary} onClick={onBlock}>
                    {blocked ? "Unblock" : "Block"}
                </button>
            </div>

            <dl className="oh-cc-profile-list">
                {contact.company && (<><dt>Company</dt><dd>{contact.company}</dd></>)}
                {contact.email && (<><dt>Email</dt><dd>{contact.email}</dd></>)}
                {contact.notes && (<><dt>Notes</dt><dd>{contact.notes}</dd></>)}
            </dl>

            <p className="oh-cc-group-title" style={{ marginTop: 14 }}>Recent calls</p>
            {recent.length === 0 ? (
                <p className="oh-cc-muted">No calls with this contact yet.</p>
            ) : recent.map((h) => (
                <div key={h.id} className="oh-cc-mini-row">
                    <span>{h.direction} · {h.outcome}</span>
                    <span className="oh-cc-muted">{dayLabel(h.startedAt)} {timeLabel(h.startedAt)}{h.durationSeconds > 0 ? ` · ${formatDuration(h.durationSeconds)}` : ""}</span>
                </div>
            ))}
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
    const [blocked, setBlocked] = useState(stored.current.blocked);
    const [spam, setSpam] = useState(stored.current.spam);
    const [country, setCountry] = useState(stored.current.country);
    const [soundOn, setSoundOn] = useState(stored.current.sound);
    const [volume, setVolume] = useState(stored.current.volume);
    const [ringtone, setRingtone] = useState(stored.current.ringtone);
    const [toneUrl, setToneUrl] = useState("");
    const [playingId, setPlayingId] = useState("");
    const [pendingTone, setPendingTone] = useState(null);
    const [toneMsg, setToneMsg] = useState(null);
    const toneTimer = useRef(null);
    const simTimer = useRef(null);
    const latest = useRef({});
    const [simType, setSimType] = useState("unknown");
    const [simContactId, setSimContactId] = useState("");
    const [simName, setSimName] = useState("");
    const [simPhone, setSimPhone] = useState("");
    const [simDelay, setSimDelay] = useState(5);
    const [simCountdown, setSimCountdown] = useState(null);
    const toneFileRef = useRef(null);

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
    const [speaker, setSpeaker] = useState(false);
    const [sentDigits, setSentDigits] = useState("");
    const [callMinimized, setCallMinimized] = useState(false);
    const [showInCallKeypad, setShowInCallKeypad] = useState(false);
    const [showCallNotes, setShowCallNotes] = useState(false);
    const [addingCaller, setAddingCaller] = useState(false);
    const [addNumber, setAddNumber] = useState("");
    const [participants, setParticipants] = useState([]);
    const [incoming, setIncoming] = useState(null);
    const [wrapUp, setWrapUp] = useState(null);
    const [assigning, setAssigning] = useState(null);
    const [profileId, setProfileId] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState("");
    const [importMessage, setImportMessage] = useState("");
    const [historyFilter, setHistoryFilter] = useState("All");
    const [historySearch, setHistorySearch] = useState("");
    const [idLookup, setIdLookup] = useState("");

    const fileInputRef = useRef(null);
    const zeroTimer = useRef(null);
    const zeroLong = useRef(false);
    const backTimer = useRef(null);
    const backLong = useRef(false);

    const tones = useTones(soundOn, volume);

    /* ---------- derived ---------- */

    const dial = (COUNTRIES.find((c) => c.code === country) || COUNTRIES[0]).dial;
    const dialTarget = applyCountry(number, dial);

    const openCalls = calls.filter(
        (call) => String(call.status).toLowerCase() !== "resolved"
    );
    const resolvedCalls = calls.filter(
        (call) => String(call.status).toLowerCase() === "resolved"
    );

    const matchedContact = number ? contacts.find((c) => samePhone(c.phone, dialTarget)) : null;
    const favourites = contacts.filter((c) => c.favorite);
    const profileContact = profileId ? contacts.find((c) => c.id === profileId) : null;

    /* Caller identification: saved contact, verified business,
       reported spam, blocked or unknown */
    function getCallerId(phone) {
        const n = normalizePhone(phone);
        if (!n) return { kind: "unknown", label: "Unknown caller", name: "" };

        if (blocked.some((b) => samePhone(b, phone))) {
            return { kind: "blocked", label: "Blocked", name: "" };
        }

        const contact = contacts.find((c) => samePhone(c.phone, phone));
        if (contact) {
            return contact.verified
                ? { kind: "verified", label: "Verified business", name: contact.name }
                : { kind: "contact", label: "Saved contact", name: contact.name };
        }

        const seeded = Object.keys(SEED_VERIFIED).find((k) => samePhone(k, phone));
        if (seeded) return { kind: "verified", label: "Verified business", name: SEED_VERIFIED[seeded] };

        if (spam.some((s) => samePhone(s, phone)) || SEED_SPAM.some((s) => samePhone(s, phone))) {
            return { kind: "spam", label: "Suspected spam", name: "" };
        }

        return { kind: "unknown", label: "Unknown caller", name: "" };
    }

    const dialInfo = number && normalizePhone(dialTarget).length >= 4 ? getCallerId(dialTarget) : null;

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

    const lookupInfo = normalizePhone(idLookup).length >= 3 ? getCallerId(idLookup) : null;

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
                JSON.stringify({
                    contacts,
                    history: history.slice(0, 200),
                    blocked,
                    spam,
                    country,
                    ringtone: ringtone.kind === "file" ? { ...ringtone, src: "" } : ringtone,
                    volume,
                    sound: soundOn,
                })
            );
        } catch { /* storage unavailable or full */ }
    }, [contacts, history, blocked, spam, country, ringtone, volume, soundOn]);

    /* ---------- restore an uploaded ringtone from IndexedDB ---------- */

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (ringtone.kind !== "file") return;
            try {
                if (ringtone.src && ringtone.src.startsWith("data:")) {
                    /* older versions kept the audio inside localStorage */
                    const blob = await (await fetch(ringtone.src)).blob();
                    await saveToneBlob(blob);
                    if (!cancelled) setRingtone((r) => ({ ...r, src: URL.createObjectURL(blob) }));
                } else if (!ringtone.src) {
                    const blob = await loadToneBlob();
                    if (blob && !cancelled) setRingtone((r) => ({ ...r, src: URL.createObjectURL(blob) }));
                }
            } catch { /* the saved file is unavailable; the classic ring is used */ }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
        tones.ringtone(ringtone, toneFailed);
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
            email: (contactForm.email || "").trim(),
            company: (contactForm.company || "").trim(),
            notes: (contactForm.notes || "").trim(),
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

    /* ---------- caller ID: block / spam ---------- */

    function toggleBlock(phone) {
        const clean = normalizePhone(phone);
        if (!clean) return;
        if (blocked.some((b) => samePhone(b, clean))) {
            setBlocked((cur) => cur.filter((b) => !samePhone(b, clean)));
            showFeedback("Number unblocked.");
        } else {
            setBlocked((cur) => [...cur, clean]);
            showFeedback("Number blocked. Calls from it will be stopped.");
        }
    }

    function reportSpam(phone) {
        const clean = normalizePhone(phone);
        if (!clean || spam.some((s) => samePhone(s, clean))) return;
        setSpam((cur) => [...cur, clean]);
        showFeedback("Number reported as suspected spam.");
    }

    function markSafe(phone) {
        setSpam((cur) => cur.filter((s) => !samePhone(s, phone)));
        showFeedback("Number marked as safe.");
    }

    function nameFor(phone) {
        const c = contacts.find((x) => samePhone(x.phone, phone));
        if (c) return c.name;
        const h = history.find((x) => samePhone(x.phone, phone) && x.contactName && x.contactName !== x.phone);
        return h ? h.contactName : "";
    }

    /* ---------- ringtone ---------- */

    /* Messages shown next to the ringtone controls (and at the top of the page) */
    function toneNote(text, type = "success") {
        setToneMsg({ text, type });
        showFeedback(text, type);
    }

    function toneFailed() {
        showFeedback("That ringtone could not be played, so the classic ring is used instead.", "error");
    }

    function stopTone() {
        tones.stop();
        window.clearTimeout(toneTimer.current);
        setPlayingId("");
    }

    /* Listen to a tone without selecting it. Pressing the same button again stops it. */
    function previewTone(tone, id) {
        if (playingId === id) { stopTone(); return; }
        if (!soundOn) { toneNote("Turn tones on to hear ringtones.", "error"); return; }
        setToneMsg(null);
        tones.preview(tone, () => {
            setPlayingId("");
            window.clearTimeout(toneTimer.current);
            toneNote(
                tone.kind === "file"
                    ? "Your browser could not play this file. Try an MP3, WAV, OGG or M4A file."
                    : "That link could not be played. The site may block other websites from using it, or it is not a direct audio file. Download it and upload it instead.",
                "error"
            );
        });
        setPlayingId(id);
        window.clearTimeout(toneTimer.current);
        toneTimer.current = window.setTimeout(() => setPlayingId(""), 8000);
    }

    function chooseBuiltin(tone) {
        stopTone();
        if (ringtone.kind === "file") clearToneBlob();
        setRingtone({ kind: "builtin", id: tone.id, label: tone.label, src: "" });
        toneNote(`Ringtone set to ${tone.label}.`);
    }

    function handleToneFile(event) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        const looksLikeAudio = file.type.startsWith("audio/") || file.type === "video/mp4" || file.type === "video/webm" || AUDIO_EXTENSIONS.test(file.name);
        if (!looksLikeAudio) { toneNote(`"${file.name}" is not an audio file. Choose an MP3, WAV, OGG or M4A file.`, "error"); return; }
        if (file.size > MAX_TONE_BYTES) { toneNote(`That file is ${(file.size / 1048576).toFixed(1)} MB. Choose one under ${MAX_TONE_BYTES / 1048576} MB, such as a short clip of the song.`, "error"); return; }

        stopTone();
        if (pendingTone && pendingTone.src) URL.revokeObjectURL(pendingTone.src);
        setPendingTone({ kind: "file", id: "file", label: file.name, src: URL.createObjectURL(file), blob: file, size: file.size });
        toneNote("File loaded. Press play to listen, then choose Use as ringtone.");
    }

    async function usePendingTone() {
        if (!pendingTone) return;
        stopTone();
        const chosen = pendingTone;
        if (ringtone.kind === "file" && ringtone.src && ringtone.src !== chosen.src) URL.revokeObjectURL(ringtone.src);
        setRingtone({ kind: "file", id: "file", label: chosen.label, src: chosen.src });
        setPendingTone(null);
        try {
            await saveToneBlob(chosen.blob);
            toneNote(`Ringtone set to ${chosen.label}.`);
        } catch {
            toneNote(`Ringtone set to ${chosen.label} for this session, but your browser would not save it for next time.`, "error");
        }
    }

    function discardPendingTone() {
        stopTone();
        if (pendingTone && pendingTone.src) URL.revokeObjectURL(pendingTone.src);
        setPendingTone(null);
        setToneMsg(null);
    }

    function validToneUrl() {
        try {
            const url = new URL(toneUrl.trim());
            if (url.protocol !== "https:") throw new Error("https only");
            return url;
        } catch {
            toneNote("Paste a direct https:// link to an audio file (for example ending in .mp3).", "error");
            return null;
        }
    }

    function previewToneUrl() {
        const url = validToneUrl();
        if (!url) return;
        previewTone({ kind: "url", id: "url", label: url.pathname.split("/").pop() || url.hostname, src: url.href }, "url");
    }

    function useToneUrl() {
        const url = validToneUrl();
        if (!url) return;
        stopTone();
        if (ringtone.kind === "file") clearToneBlob();
        setRingtone({ kind: "url", id: "url", label: decodeURIComponent(url.pathname.split("/").pop() || url.hostname), src: url.href });
        toneNote("Online ringtone saved. If the site blocks playback, the classic ring is used instead.");
    }

    function resetTone() {
        stopTone();
        if (ringtone.kind === "file") { clearToneBlob(); if (ringtone.src) URL.revokeObjectURL(ringtone.src); }
        setRingtone(DEFAULT_TONE);
        toneNote("Ringtone reset to Classic ring.");
    }

    async function testSound() {
        const state = await tones.test();
        if (state === "off") showFeedback("Tones are turned off. Turn them on first.", "error");
        else if (state === "unsupported") showFeedback("This browser does not support the Web Audio API, so tones cannot play.", "error");
        else if (state !== "running") showFeedback("The browser is blocking audio. Click anywhere on the page, then try again.", "error");
        else showFeedback("Playing a test beep. If you hear nothing, raise the volume slider, check your system volume and make sure the right output device (for example speakers or a connected Bluetooth device) is selected.");
    }

    /* ---------- after-call quick actions ---------- */

    function quickSaveContact(name, phone) {
        if (contacts.some((c) => samePhone(c.phone, phone))) return;
        setContacts((cur) => [...cur, { ...initialContactForm, id: `contact-${Date.now()}`, name, phone }]);
        showFeedback(`${name} saved to contacts.`);
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

    /* ---------- calling (simulated) ---------- */

    function resetCallUi() {
        setCallSeconds(0);
        setCallNotes("");
        setSentDigits("");
        setMuted(false);
        setHeld(false);
        setSpeaker(false);
        setCallMinimized(false);
        setShowInCallKeypad(false);
        setShowCallNotes(false);
        setAddingCaller(false);
        setAddNumber("");
        setParticipants([]);
    }

    function beginCall(rawPhone) {
        const phone = String(rawPhone || "").trim();

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

        if (blocked.some((b) => samePhone(b, phone))) {
            showFeedback("This number is blocked. Unblock it in Caller ID to call it.", "error");
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
        resetCallUi();
        setActiveCall(localCall);
        showFeedback(
            "Demo call started. No real phone connection has been made."
        );
    }

    function handleStartCall() {
        beginCall(dialTarget);
    }

    function handleEndCall() {
        if (!activeCall) return;

        tones.hangup();
        setWrapUp({
            call: { ...activeCall, participants },
            seconds: callSeconds,
            connected: true,
            notes: callNotes.trim(),
        });

        setActiveCall(null);
        resetCallUi();
    }

    function addCaller(name, phone) {
        const clean = String(phone || "").trim();
        if (!normalizePhone(clean)) {
            showFeedback("Enter a valid number to add to the call.", "error");
            return;
        }
        if (blocked.some((b) => samePhone(b, clean))) {
            showFeedback("That number is blocked.", "error");
            return;
        }
        if (participants.some((p) => samePhone(p.phone, clean)) || samePhone(activeCall.phone, clean)) {
            showFeedback("That person is already on the call.", "error");
            return;
        }
        tones.connect();
        setParticipants((cur) => [...cur, { name: name || clean, phone: clean }]);
        setAddNumber("");
        setAddingCaller(false);
        showFeedback(`${name || clean} added to the demo call.`);
    }

    function simulateIncoming(chosen = null) {
        if (activeCall || incoming) { showFeedback("Finish the current call first.", "error"); return; }
        const pool = [
            ...contacts.map((c) => ({ name: c.name, phone: c.phone })),
            ...DEMO_CALLERS,
        ];
        const who = chosen || pool[Math.floor(Math.random() * pool.length)];
        const startedAt = new Date().toISOString();

        if (blocked.some((b) => samePhone(b, who.phone))) {
            setHistory((h) => [{
                id: `h-${Date.now()}`,
                contactName: who.name,
                phone: who.phone,
                direction: "Incoming",
                outcome: "Blocked",
                startedAt,
                durationSeconds: 0,
                notes: "",
            }, ...h].slice(0, 200));
            showFeedback(`Blocked a call from ${who.name || who.phone}.`);
            return;
        }

        setIncoming({
            id: `incoming-${Date.now()}`,
            contactName: who.name,
            phone: who.phone,
            startedAt,
        });
    }

    latest.current.simulateIncoming = simulateIncoming;

    function cancelSimulation() {
        window.clearInterval(simTimer.current);
        simTimer.current = null;
        setSimCountdown(null);
    }

    function startSimulation() {
        if (activeCall || incoming) { showFeedback("Finish the current call first.", "error"); return; }

        let who;
        if (simType === "contact") {
            const c = contacts.find((x) => x.id === simContactId) || contacts[0];
            if (!c) { showFeedback("Add a contact first, or pick another caller type.", "error"); return; }
            who = { name: c.name, phone: c.phone };
        } else if (simType === "verified") who = DEMO_CALLERS[1];
        else if (simType === "spam") who = DEMO_CALLERS[0];
        else if (simType === "unknown") who = DEMO_CALLERS[2];
        else {
            const phone = applyCountry(simPhone, dial);
            if (!normalizePhone(phone)) { showFeedback("Enter a phone number for the custom caller.", "error"); return; }
            who = { name: simName.trim() || phone, phone };
        }

        cancelSimulation();
        if (!simDelay) { simulateIncoming(who); return; }

        let left = simDelay;
        setSimCountdown(left);
        simTimer.current = window.setInterval(() => {
            left -= 1;
            if (left <= 0) {
                cancelSimulation();
                latest.current.simulateIncoming(who);
            } else {
                setSimCountdown(left);
            }
        }, 1000);
    }

    useEffect(() => () => {
        window.clearInterval(simTimer.current);
        window.clearTimeout(toneTimer.current);
    }, []);

    function answerIncoming() {
        if (!incoming) return;
        tones.stop();
        tones.connect();
        resetCallUi();
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
        setIncoming(null);
        showFeedback("Demo call answered. No real phone connection has been made.");
    }

    function declineIncoming(alsoBlock = false, note = "", reportAsSpam = false) {
        if (!incoming) return;
        tones.stop();
        tones.hangup();
        setHistory((h) => [{
            id: `h-${Date.now()}`,
            contactName: incoming.contactName,
            phone: incoming.phone,
            direction: "Incoming",
            outcome: alsoBlock ? "Blocked" : "Declined",
            startedAt: incoming.startedAt,
            durationSeconds: 0,
            notes: note ? `Quick reply (demo, no SMS sent): ${note}` : "",
        }, ...h].slice(0, 200));
        if (alsoBlock) {
            const clean = normalizePhone(incoming.phone);
            setBlocked((cur) => (cur.some((b) => samePhone(b, clean)) ? cur : [...cur, clean]));
            if (reportAsSpam) setSpam((cur) => (cur.some((x) => samePhone(x, clean)) ? cur : [...cur, clean]));
            showFeedback(reportAsSpam ? "Caller reported as spam, blocked and declined." : "Caller blocked and call declined.");
        } else if (note) {
            showFeedback("Call declined with a quick reply (demo: no SMS was sent).");
        } else {
            showFeedback("Incoming call declined.");
        }
        setIncoming(null);
    }

    function finishWrapUp(result) {
        if (!wrapUp) return;
        const { call: ended, seconds } = wrapUp;
        const people = (ended.participants || []).map((p) => p.name).join(", ");
        const notes = [result.notes, people ? `Also on the call: ${people}` : ""].filter(Boolean).join(" · ");

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
            notes,
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

    /* ---------- keyboard + paste ---------- */

    const callScreenOpen = Boolean(activeCall && !callMinimized);

    useEffect(() => {
        if ((activeTab !== "phone" && !callScreenOpen) || showContactForm || showCallForm || assigning || wrapUp || profileId) return undefined;

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

    /* ---------- queue handlers (unchanged) ---------- */

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

    const incomingInfo = incoming ? getCallerId(incoming.phone) : null;
    const activeInfo = activeCall ? getCallerId(activeCall.phone) : null;

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
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={Boolean(contactForm.favorite)} onChange={(e) => setContactForm({ ...contactForm, favorite: e.target.checked })} />
                    Add to favourites
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" checked={Boolean(contactForm.verified)} onChange={(e) => setContactForm({ ...contactForm, verified: e.target.checked })} />
                    Verified business
                </label>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button type="submit" style={styles.primary}>{editingId ? "Save changes" : "Save contact"}</button>
                {editingId && <button type="button" style={styles.secondary} onClick={closeContactForm}>Cancel</button>}
            </div>
        </form>
    );

    const ctl = (on, label, icon, onClick, extra = {}) => (
        <button
            type="button"
            className={`oh-cc-ctl ${on ? "on" : ""}`}
            onClick={onClick}
            aria-pressed={on}
            {...extra}
        >
            <span className="oh-cc-ctl-icon">{icon}</span>
            <span>{label}</span>
        </button>
    );

    return (
        <div className="oh-page oh-call-centre">
            <style>{`
                .oh-cc-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}
                .oh-cc-tab{border:1px solid var(--oh-border,#e5e7eb);border-radius:9px;padding:9px 13px;background:transparent;color:inherit;cursor:pointer;font:inherit}
                .oh-cc-tab.active{background:#e6f5ec;color:#12683f;border-color:#a7dfbf;font-weight:700}
                .oh-cc-contact{display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid var(--oh-border,#e5e7eb);cursor:pointer}
                .oh-cc-contact:last-child{border-bottom:0}
                .oh-cc-avatar{border-radius:50%;display:inline-grid;place-items:center;font-weight:750;flex-shrink:0}
                .oh-cc-contact-main{min-width:0;flex:1}
                .oh-cc-contact-main strong,.oh-cc-contact-main small{display:block;overflow-wrap:anywhere}
                .oh-cc-contact-main small{color:var(--oh-muted,#6b7280);margin-top:3px}
                .oh-cc-digits{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin:16px 0}
                .oh-cc-digit{min-height:60px;border:1px solid var(--oh-border,#e5e7eb);border-radius:14px;background:var(--oh-key-bg,#f9fafb);color:inherit;cursor:pointer;font-size:24px;font-weight:650;user-select:none;touch-action:manipulation;transition:background .12s,border-color .12s,transform .08s}
                .oh-cc-digit span{display:block;font-size:9px;letter-spacing:1px;color:var(--oh-muted,#6b7280);font-weight:500}
                .oh-cc-digit:hover{border-color:#168653;background:#e6f5ec}
                .oh-cc-digit:active{background:#168653;border-color:#168653;color:#fff;transform:scale(.97)}
                .oh-cc-digit:active span{color:#fff}
                .oh-cc-phone-screen{border:1px solid var(--oh-border,#e5e7eb);border-radius:18px;padding:16px;background:var(--oh-phone-bg,#f9fafb)}
                .oh-cc-display{width:100%;box-sizing:border-box;border:0;background:transparent;color:inherit;font:inherit;font-size:clamp(24px,3.4vw,34px);font-weight:650;letter-spacing:.02em;text-align:center;font-variant-numeric:tabular-nums;padding:8px 4px;min-width:0}
                .oh-cc-display:focus{outline:none}
                .oh-cc-display::placeholder{color:var(--oh-muted,#9ca3af);font-weight:500}
                .oh-cc-dial-row{display:flex;align-items:center;gap:8px}
                .oh-cc-country{border:1px solid var(--oh-border,#d1d5db);border-radius:9px;padding:8px 9px;background:var(--oh-input-bg,#fff);color:inherit;font:inherit;font-size:13px;max-width:140px}
                .oh-cc-call-action{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:14px;padding:14px 16px;background:#168653;color:#fff;font-weight:750;cursor:pointer}
                .oh-cc-end-action{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:14px;padding:14px 16px;background:#c93636;color:#fff;font-weight:750;cursor:pointer}
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
                .oh-cc-badge{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:700;background:#eef0f2;color:#4b5563}
                .oh-cc-badge.verified{background:#e0f3e8;color:#12683f}
                .oh-cc-badge.contact{background:#e8eefb;color:#2c4a8a}
                .oh-cc-badge.spam{background:#fff1d6;color:#8a5a00}
                .oh-cc-badge.blocked{background:#fde8e8;color:#b23030}
                .oh-cc-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}
                .oh-cc-stats>div{padding:10px 12px;border:1px solid var(--oh-border,#e5e7eb);border-radius:12px}
                .oh-cc-stats strong{display:block;font-size:18px;font-variant-numeric:tabular-nums}
                .oh-cc-backdrop{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:18px;background:rgba(10,24,16,.55)}
                .oh-cc-modal{width:min(100%,520px);max-height:calc(100vh - 36px);overflow:auto;padding:20px;border-radius:16px;background:var(--oh-card,#fff);color:inherit;box-shadow:0 30px 80px rgba(0,0,0,.35)}
                .oh-cc-modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:16px}
                .oh-cc-profile-head{display:grid;justify-items:center;gap:6px;text-align:center;margin-bottom:14px}
                .oh-cc-profile-head h3{margin:6px 0 0}
                .oh-cc-profile-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
                .oh-cc-profile-list{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:16px 0 0;font-size:14px}
                .oh-cc-profile-list dt{color:var(--oh-muted,#6b7280)}
                .oh-cc-profile-list dd{margin:0;overflow-wrap:anywhere}
                .oh-cc-mini-row{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--oh-border,#e5e7eb);font-size:13px;flex-wrap:wrap}
                .oh-cc-id-result{margin-top:14px;padding:16px;border:1px solid var(--oh-border,#e5e7eb);border-radius:14px;display:grid;gap:10px;justify-items:start}

                /* Full-screen call screens */
                .oh-cc-screen{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;color:#fff;background:radial-gradient(120% 80% at 50% 0%,#14513a 0%,#0a2616 55%,#06150d 100%);padding:46px 16px 26px}
                .oh-cc-screen-top{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px;color:rgba(255,255,255,.72)}
                .oh-cc-screen-body{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;min-height:0;overflow:auto;padding:12px 0}
                .oh-cc-screen-body h2{margin:14px 0 0;font-size:clamp(26px,5vw,36px);letter-spacing:-.5px}
                .oh-cc-screen-body p{margin:0;color:rgba(255,255,255,.72)}
                .oh-cc-screen .oh-cc-badge{background:rgba(255,255,255,.14);color:#fff}
                .oh-cc-screen .oh-cc-badge.spam{background:#ffd37a;color:#5a3a00}
                .oh-cc-screen .oh-cc-badge.verified{background:#8fd9ab;color:#0a2616}
                .oh-cc-screen-foot{display:flex;justify-content:center;align-items:flex-end;gap:44px;padding-top:10px}
                .oh-cc-round{display:grid;justify-items:center;gap:8px;border:0;background:none;color:#fff;cursor:pointer;font:inherit;font-size:13px}
                .oh-cc-round b{display:grid;place-items:center;width:68px;height:68px;border-radius:50%;box-shadow:0 12px 28px rgba(0,0,0,.35)}
                .oh-cc-round.accept b{background:#1fa55f}
                .oh-cc-round.decline b{background:#d13b3b}
                .oh-cc-round.small b{background:rgba(255,255,255,.14);box-shadow:none;width:56px;height:56px}
                .oh-cc-spam-warn{display:flex;align-items:center;gap:8px;margin-top:10px;padding:9px 13px;border-radius:12px;background:rgba(255,211,122,.16);border:1px solid rgba(255,211,122,.5);color:#ffe3a6;font-size:13px;max-width:340px;text-align:left}
                .oh-cc-ring{position:relative;display:grid;place-items:center;width:104px;height:104px}
                .oh-cc-ring i{position:absolute;inset:0;border-radius:50%;border:2px solid rgba(143,217,171,.55);animation:oh-cc-ring 2.1s ease-out infinite;opacity:0}
                .oh-cc-ring i:nth-child(2){animation-delay:.7s}
                .oh-cc-ring i:nth-child(3){animation-delay:1.4s}
                @keyframes oh-cc-ring{0%{transform:scale(1);opacity:.8}100%{transform:scale(2.3);opacity:0}}
                .oh-cc-timer{font-size:clamp(34px,7vw,48px);font-weight:300;font-variant-numeric:tabular-nums;letter-spacing:1px;margin-top:6px}
                .oh-cc-ctls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px 10px;max-width:340px;width:100%;margin:6px auto 18px}
                .oh-cc-ctl{display:grid;justify-items:center;gap:7px;border:0;background:none;color:#fff;cursor:pointer;font:inherit;font-size:12px}
                .oh-cc-ctl-icon{display:grid;place-items:center;width:62px;height:62px;border-radius:50%;background:rgba(255,255,255,.12);transition:background .15s,color .15s}
                .oh-cc-ctl:hover .oh-cc-ctl-icon{background:rgba(255,255,255,.2)}
                .oh-cc-ctl.on .oh-cc-ctl-icon{background:#fff;color:#0a2616}
                .oh-cc-screen-pad{max-width:300px;width:100%;margin:0 auto}
                .oh-cc-screen-pad .oh-cc-digits{margin:8px 0}
                .oh-cc-screen-pad .oh-cc-digit{min-height:50px;background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.16);color:#fff;font-size:21px}
                .oh-cc-screen-pad .oh-cc-digit span{color:rgba(255,255,255,.6)}
                .oh-cc-screen-pad .oh-cc-digit:hover{background:rgba(255,255,255,.2)}
                .oh-cc-sent{min-height:26px;letter-spacing:.14em;font-size:18px;color:#fff}
                .oh-cc-screen-panel{width:100%;max-width:340px;margin:8px auto 0;padding:12px;border-radius:14px;background:rgba(255,255,255,.1);text-align:left}
                .oh-cc-screen-panel .oh-cc-field{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.2);color:#fff}
                .oh-cc-screen-panel .oh-cc-field::placeholder{color:rgba(255,255,255,.55)}
                .oh-cc-screen-panel button.row{display:flex;align-items:center;gap:10px;width:100%;padding:8px;border:0;border-radius:10px;background:transparent;color:#fff;cursor:pointer;font:inherit;text-align:left}
                .oh-cc-screen-panel button.row:hover{background:rgba(255,255,255,.12)}
                .oh-cc-people{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-top:6px}
                .oh-cc-people span{padding:3px 10px;border-radius:999px;background:rgba(255,255,255,.14);font-size:12px}
                .oh-cc-pill{position:fixed;right:16px;bottom:16px;z-index:1050;display:flex;align-items:center;gap:6px;padding:6px 6px 6px 14px;border-radius:999px;background:#0a2616;color:#fff;box-shadow:0 14px 34px rgba(0,0,0,.35)}
                .oh-cc-pill button{border:0;background:none;color:inherit;cursor:pointer;font:inherit;font-size:13px}
                .oh-cc-pill .end{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:#d13b3b}
                @media(max-width:760px){.oh-cc-workspace{grid-template-columns:minmax(0,1fr)!important}.oh-cc-form-grid{grid-template-columns:minmax(0,1fr)}.oh-cc-span-2{grid-column:auto}.oh-cc-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
                @media(prefers-reduced-motion:reduce){.oh-cc-ring i{animation:none;opacity:.35}}

                /* Caller-ID incoming screen: colour follows caller type */
                .oh-cc-in-unknown{background:radial-gradient(120% 80% at 50% 0%,#1d3a7a 0%,#0f1d3d 55%,#080f22 100%)}
                .oh-cc-in-contact{background:radial-gradient(120% 80% at 50% 0%,#14513a 0%,#0a2616 55%,#06150d 100%)}
                .oh-cc-in-verified{background:radial-gradient(120% 80% at 50% 0%,#0f5c63 0%,#0a2f35 55%,#061a1e 100%)}
                .oh-cc-in-spam{background:radial-gradient(120% 80% at 50% 0%,#a3262d 0%,#4a0f14 55%,#240709 100%)}
                .oh-cc-in-spam .oh-cc-ring i{border-color:rgba(255,140,140,.6)}
                .oh-cc-in-unknown .oh-cc-ring i{border-color:rgba(150,180,255,.55)}
                .oh-cc-brandline{display:inline-flex;align-items:center;gap:6px;font-weight:650;color:#fff}
                .oh-cc-in-number{font-size:18px;letter-spacing:.04em}
                .oh-cc-in-region{font-size:14px}
                .oh-cc-in-tags{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;align-items:center;margin-top:8px}
                .oh-cc-in-type{padding:2px 11px;border-radius:999px;border:1px solid rgba(255,255,255,.35);font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
                .oh-cc-in-note{max-width:320px;font-size:13px;margin-top:8px!important}
                .oh-cc-in-actions{display:flex;justify-content:center;gap:26px;margin:6px 0 18px}
                .oh-cc-in-actions button{display:grid;justify-items:center;gap:6px;border:0;background:none;color:#fff;cursor:pointer;font:inherit;font-size:12px}
                .oh-cc-in-actions b{display:grid;place-items:center;width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.14)}
                .oh-cc-swipe{position:relative;display:flex;align-items:center;justify-content:space-between;width:min(100%,360px);height:72px;margin:0 auto;padding:0 8px;border-radius:999px;transition:background .15s;touch-action:none}
                .oh-cc-swipe-hint{position:absolute;inset:0;display:grid;place-items:center;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.55);pointer-events:none;padding-top:44px}
                .oh-cc-swipe-end{display:grid;place-items:center;width:52px;height:52px;border:0;border-radius:50%;color:#fff;cursor:pointer;opacity:.9}
                .oh-cc-swipe-end.decline{background:#d13b3b}
                .oh-cc-swipe-end.answer{background:#1fa55f}
                .oh-cc-swipe-knob{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;display:grid;place-items:center;border-radius:50%;background:#fff;color:#0a2616;cursor:grab;box-shadow:0 8px 22px rgba(0,0,0,.4);animation:oh-cc-nudge 2.2s ease-in-out infinite;touch-action:none}
                .oh-cc-swipe-knob:active{cursor:grabbing;animation:none}
                @keyframes oh-cc-nudge{0%,100%{box-shadow:0 8px 22px rgba(0,0,0,.4),0 0 0 0 rgba(255,255,255,.35)}50%{box-shadow:0 8px 22px rgba(0,0,0,.4),0 0 0 12px rgba(255,255,255,0)}}
                .oh-cc-reply-sheet{display:grid;gap:8px;width:min(100%,380px);margin:0 auto 4px}
                .oh-cc-reply-sheet p{margin:0 0 4px;text-align:center;font-size:13px;color:rgba(255,255,255,.7)}
                .oh-cc-reply-sheet button{padding:12px 14px;border:1px solid rgba(255,255,255,.2);border-radius:12px;background:rgba(255,255,255,.1);color:#fff;cursor:pointer;font:inherit;text-align:left}
                .oh-cc-reply-sheet button:hover{background:rgba(255,255,255,.18)}
                .oh-cc-reply-sheet button.cancel{text-align:center;background:transparent}

                /* After-call card */
                .oh-cc-after-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}
                .oh-cc-after-head>div{flex:1;min-width:140px}
                .oh-cc-after-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}

                /* Ringtone panel */
                .oh-cc-tone-panel{margin-top:14px;padding:14px;border:1px solid var(--oh-border,#e5e7eb);border-radius:14px}
                .oh-cc-sources{display:grid;gap:6px}
                .oh-cc-sources a{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 10px;border:1px solid var(--oh-border,#e5e7eb);border-radius:10px;color:inherit;text-decoration:none;font-size:14px;font-weight:600}
                .oh-cc-sources a small{margin-left:auto;font-weight:400;color:var(--oh-muted,#6b7280)}
                .oh-cc-sources a:hover{border-color:#168653;background:#e6f5ec}
                @media(prefers-reduced-motion:reduce){.oh-cc-swipe-knob{animation:none}}

                /* ===== App layout: side rail, phone card, panels ===== */
                .oh-cc-mode{display:inline-flex;align-items:center;gap:7px;margin-top:6px;padding:3px 11px;border-radius:999px;background:#fff1d6;color:#8a5a00;font-size:12px;font-weight:700}
                .oh-cc-mode i{width:8px;height:8px;border-radius:50%;background:#e0a100}
                .oh-cc-app{display:grid;grid-template-columns:210px minmax(0,1fr);gap:20px;align-items:start}
                .oh-cc-main{min-width:0}
                .oh-cc-rail{position:sticky;top:12px;display:grid;gap:4px;padding:10px;border:1px solid var(--oh-border,#e5e7eb);border-radius:20px;background:var(--oh-card,#fff)}
                .oh-cc-rail button{display:flex;align-items:center;gap:11px;padding:12px 13px;border:0;border-radius:13px;background:transparent;color:inherit;cursor:pointer;font:inherit;font-weight:600;text-align:left;transition:background .15s,color .15s}
                .oh-cc-rail button:hover{background:#e6f5ec}
                .oh-cc-rail button.active{background:linear-gradient(135deg,#1a8a57,#0f6b43);color:#fff;box-shadow:0 8px 18px -8px rgba(15,107,67,.8)}
                .oh-cc-rail .count{margin-left:auto;min-width:20px;padding:1px 7px;border-radius:999px;background:rgba(0,0,0,.08);font-size:11px;text-align:center}
                .oh-cc-rail button.active .count{background:rgba(255,255,255,.25)}
                .oh-cc-phone-grid{display:grid;grid-template-columns:minmax(300px,380px) minmax(0,1fr);gap:20px;align-items:start}
                .oh-cc-side{display:grid;gap:16px;min-width:0}
                .oh-cc-card{min-width:0;padding:16px;border:1px solid var(--oh-border,#e5e7eb);border-radius:20px;background:var(--oh-card,#fff)}
                .oh-cc-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap}
                .oh-cc-card-head h3{margin:0;font-size:16px}
                .oh-cc-link-btn{border:0;background:none;color:#12683f;cursor:pointer;font:inherit;font-size:13px;font-weight:700;padding:4px 6px}
                .oh-cc-link-btn:disabled{opacity:.4;cursor:default}
                .oh-cc-device{position:sticky;top:12px;overflow:hidden;padding:0 18px 16px;border:1px solid var(--oh-border,#e5e7eb);border-radius:30px;background:var(--oh-card,#fff);box-shadow:0 24px 50px -28px rgba(10,38,22,.45)}
                .oh-cc-device-top{margin:0 -18px 8px;padding:16px 18px 14px;background:radial-gradient(120% 140% at 50% 0%,#17855a 0%,#0c3b27 70%);color:#fff}
                .oh-cc-device-top .oh-cc-dial-row{justify-content:space-between}
                .oh-cc-device-top .oh-cc-country{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.25);color:#fff}
                .oh-cc-device-top .oh-cc-country option{color:#14211a}
                .oh-cc-icon-btn{display:grid;place-items:center;width:38px;height:38px;border:0;border-radius:50%;background:rgba(255,255,255,.14);color:#fff;cursor:pointer}
                .oh-cc-icon-btn.dark{width:46px;height:46px;background:var(--oh-key-bg,#f3f4f6);color:inherit}
                .oh-cc-device .oh-cc-display{margin-top:8px;color:#fff;font-size:clamp(28px,5vw,38px);font-weight:600}
                .oh-cc-device .oh-cc-display::placeholder{color:rgba(255,255,255,.55)}
                .oh-cc-hint{margin:0;text-align:center;font-size:12px;color:rgba(255,255,255,.75)}
                .oh-cc-match{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:10px;text-align:left}
                .oh-cc-match strong{display:block;font-size:14px}
                .oh-cc-match span:not(.oh-cc-badge){display:block;font-size:12px;color:rgba(255,255,255,.75)}
                .oh-cc-match .oh-cc-link-btn{color:#bff0d3}
                .oh-cc-device-top .oh-cc-badge{background:rgba(255,255,255,.16);color:#fff}
                .oh-cc-device-top .oh-cc-badge.spam{background:#ffd37a;color:#5a3a00}
                .oh-cc-device-top .oh-cc-badge.verified{background:#8fd9ab;color:#0a2616}
                .oh-cc-device .oh-cc-digits{gap:10px 0;margin:14px auto 8px;max-width:300px;justify-items:center}
                .oh-cc-device .oh-cc-digit{width:78px;height:78px;min-height:0;border-radius:50%;font-size:27px}
                .oh-cc-dial-actions{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;max-width:300px;margin:6px auto 0}
                .oh-cc-dial-actions>:last-child{justify-self:end}
                .oh-cc-callbtn{display:grid;place-items:center;width:76px;height:76px;border:0;border-radius:50%;background:linear-gradient(145deg,#22a96a,#12683f);color:#fff;cursor:pointer;box-shadow:0 14px 28px -10px rgba(18,104,63,.9);transition:transform .12s}
                .oh-cc-callbtn:hover{transform:scale(1.05)}
                .oh-cc-callbtn:active{transform:scale(.96)}
                .oh-cc-callbtn.end{background:linear-gradient(145deg,#e04848,#b32626);box-shadow:0 14px 28px -10px rgba(179,38,38,.9)}
                .oh-cc-live{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:14px;padding:12px 14px;border:1px solid #a7dfbf;border-radius:16px;background:#f0faf4}
                .oh-cc-live strong,.oh-cc-live span{display:block}
                .oh-cc-live span{font-size:12px;color:var(--oh-muted,#6b7280)}
                .oh-cc-live b{font-size:20px;font-variant-numeric:tabular-nums}
                .oh-cc-fineprint{margin:12px 0 0;text-align:center;font-size:11.5px;line-height:1.5;color:var(--oh-muted,#6b7280)}
                .oh-cc-fav-row{display:flex;gap:14px;overflow-x:auto;padding-bottom:4px}
                .oh-cc-fav{display:grid;justify-items:center;gap:6px;width:64px;flex-shrink:0;border:0;background:none;color:inherit;cursor:pointer;font:inherit;font-size:12px}
                .oh-cc-fav span{max-width:64px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
                .oh-cc-fav:hover .oh-cc-avatar{box-shadow:0 0 0 3px #a7dfbf}
                .oh-cc-fav-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
                .oh-cc-fav-card{display:grid;justify-items:center;gap:6px;padding:20px 14px;border:1px solid var(--oh-border,#e5e7eb);border-radius:20px;text-align:center}
                .oh-cc-settings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
                .oh-cc-span-all{grid-column:1/-1}
                .oh-cc-checklist{margin:0;padding-left:18px;display:grid;gap:6px;font-size:13.5px;line-height:1.5}
                .oh-cc-switch{display:flex;align-items:center;gap:10px;cursor:pointer}
                .oh-cc-tones{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
                .oh-cc-tone{display:grid;gap:4px;padding:12px;border:1px solid var(--oh-border,#d1d5db);border-radius:16px;background:transparent;color:inherit;cursor:pointer;font:inherit;text-align:left;transition:border-color .15s,background .15s,transform .1s}
                .oh-cc-tone:hover{border-color:#168653;transform:translateY(-1px)}
                .oh-cc-tone.on{border-color:#168653;background:#e6f5ec}
                .oh-cc-tone-top{display:flex;align-items:center;justify-content:space-between;color:#12683f;min-height:20px}
                .oh-cc-tone small{color:var(--oh-muted,#6b7280);font-size:12px}
                .oh-cc-tone-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:6px}
                @media(max-width:1000px){.oh-cc-phone-grid{grid-template-columns:minmax(0,1fr)}.oh-cc-device{position:static;max-width:420px;width:100%;margin:0 auto}}
                @media(max-width:760px){
                    .oh-cc-app{grid-template-columns:minmax(0,1fr)}
                    .oh-cc-main{padding-bottom:88px}
                    .oh-cc-rail{position:fixed;left:0;right:0;bottom:0;top:auto;z-index:60;display:flex;gap:2px;overflow-x:auto;padding:6px 8px max(6px,env(safe-area-inset-bottom));border-radius:0;border-width:1px 0 0;box-shadow:0 -10px 30px rgba(0,0,0,.12)}
                    .oh-cc-rail button{flex:1 0 66px;flex-direction:column;gap:3px;padding:8px 6px;font-size:11px;text-align:center;position:relative}
                    .oh-cc-rail .count{position:absolute;top:2px;right:8px;margin:0;min-width:16px;font-size:10px;padding:0 5px}
                    .oh-cc-settings,.oh-cc-tone-grid{grid-template-columns:minmax(0,1fr)}
                }

                /* ===== Floating phone window for calls ===== */
                .oh-cc-phone{position:fixed;right:20px;bottom:20px;z-index:1100;width:min(344px,calc(100vw - 24px));height:min(700px,calc(100dvh - 40px));animation:oh-cc-pop .28s ease both}
                .oh-cc-phone-bezel{position:relative;height:100%;padding:9px;border-radius:46px;background:linear-gradient(145deg,#2d3135,#0c0e0f);box-shadow:0 0 0 2px #4b5056 inset,0 32px 70px rgba(0,0,0,.5),0 0 0 1px rgba(0,0,0,.5)}
                .oh-cc-phone-bezel::after{content:"";position:absolute;right:-3px;top:128px;width:3px;height:64px;border-radius:0 3px 3px 0;background:#1b1d1f}
                .oh-cc-phone-display{position:relative;height:100%;overflow:hidden;border-radius:38px;background:#06150d}
                .oh-cc-statusbar{position:absolute;top:0;left:0;right:0;z-index:5;display:flex;align-items:center;justify-content:space-between;padding:12px 24px 0;font-size:12px;font-weight:700;color:#fff;pointer-events:none}
                .oh-cc-statusbar .icons{display:flex;align-items:center;gap:5px}
                .oh-cc-notch{position:absolute;left:50%;top:9px;width:88px;height:22px;margin-left:-44px;border-radius:14px;background:#000}
                .oh-cc-home-bar{position:absolute;bottom:7px;left:50%;z-index:5;width:112px;height:4px;margin-left:-56px;border-radius:3px;background:rgba(255,255,255,.55);pointer-events:none}
                @keyframes oh-cc-pop{from{opacity:0;transform:translateY(24px) scale(.96)}to{opacity:1;transform:none}}
                .oh-cc-phone .oh-cc-screen-top{font-size:11px;flex-wrap:wrap}
                .oh-cc-phone .oh-cc-screen-body h2{font-size:24px;margin-top:10px}
                .oh-cc-phone .oh-cc-timer{font-size:34px}
                .oh-cc-phone .oh-cc-ctls{gap:10px 6px;margin:4px auto 8px}
                .oh-cc-phone .oh-cc-ctl-icon{width:54px;height:54px}
                .oh-cc-phone .oh-cc-round b{width:60px;height:60px}
                .oh-cc-phone .oh-cc-screen-foot{padding-top:4px}
                .oh-cc-phone .oh-cc-in-actions{gap:18px;margin:2px 0 10px}
                .oh-cc-phone .oh-cc-swipe{height:64px}
                .oh-cc-phone .oh-cc-swipe-end{width:46px;height:46px}
                .oh-cc-phone .oh-cc-swipe-knob{width:52px;height:52px;margin:-26px 0 0 -26px}
                .oh-cc-phone .oh-cc-spam-warn{max-width:100%;font-size:12px}

                /* ===== Ringtone tiles, equaliser and simulator ===== */
                .oh-cc-tile{display:grid;gap:10px;padding:12px;border:1px solid var(--oh-border,#d1d5db);border-radius:16px;transition:border-color .15s,background .15s}
                .oh-cc-tile.on{border-color:#168653;background:#e6f5ec}
                .oh-cc-tile-head{display:flex;align-items:center;gap:10px}
                .oh-cc-tile-name{min-width:0;flex:1}
                .oh-cc-tile-name strong,.oh-cc-tile-name small{display:block}
                .oh-cc-tile-name small{color:var(--oh-muted,#6b7280);font-size:12px}
                .oh-cc-tile-foot{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:30px}
                .oh-cc-play{display:grid;place-items:center;width:42px;height:42px;flex-shrink:0;border:0;border-radius:50%;background:#168653;color:#fff;cursor:pointer;transition:transform .12s,background .15s}
                .oh-cc-play:hover{transform:scale(1.07)}
                .oh-cc-play.playing{background:#c93636}
                .oh-cc-eq{display:inline-flex;align-items:flex-end;gap:2px;height:16px}
                .oh-cc-eq i{width:3px;height:100%;border-radius:2px;background:#168653;transform-origin:bottom;animation:oh-cc-eq .8s ease-in-out infinite}
                .oh-cc-eq i:nth-child(2){animation-delay:.15s}
                .oh-cc-eq i:nth-child(3){animation-delay:.3s}
                .oh-cc-eq i:nth-child(4){animation-delay:.45s}
                @keyframes oh-cc-eq{0%,100%{transform:scaleY(.25)}50%{transform:scaleY(1)}}
                .oh-cc-sim-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
                @media(prefers-reduced-motion:reduce){.oh-cc-eq i{animation:none;transform:scaleY(.6)}.oh-cc-phone{animation:none}}
                @media(max-width:760px){.oh-cc-phone{right:12px;bottom:12px;height:min(700px,calc(100dvh - 24px))}}
                .oh-cc-inline-msg{margin:0 0 12px;padding:9px 12px;border-radius:10px;font-size:13px;line-height:1.45;background:#e6f5ec;color:#12683f}
                .oh-cc-inline-msg.error{background:#fde8e8;color:#b23030}
            `}</style>

            <section className="oh-page-intro">
                <div>
                    <p className="oh-eyebrow">CUSTOMER OPERATIONS</p>
                    <h2>Call Centre</h2>
                    <span className="oh-cc-mode"><i /> Demo mode · no phone provider connected</span>
                    <p>
                        A phone-style dialer, recents, contacts and caller ID, plus your business call queue. Calling is simulated for now.
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

            <div className="oh-cc-app">
                <nav className="oh-cc-rail" role="tablist" aria-label="Call Centre sections">
                    {[
                        ["phone", "Phone", <Phone size={18} key="i" />, 0],
                        ["history", "Recents", <Clock size={18} key="i" />, stats.missed],
                        ["contacts", "Contacts", <Users size={18} key="i" />, contacts.length],
                        ["favourites", "Favourites", <Star size={18} key="i" />, favourites.length],
                        ["queue", "Call Queue", <ListChecks size={18} key="i" />, openCalls.length],
                        ["callerid", "Spam Protection", <ShieldAlert size={18} key="i" />, blocked.length + spam.length],
                        ["settings", "Settings", <Settings size={18} key="i" />, 0],
                    ].map(([id, label, icon, count]) => (
                        <button
                            key={id}
                            type="button"
                            role="tab"
                            aria-selected={activeTab === id}
                            className={activeTab === id ? "active" : ""}
                            onClick={() => {
                                setActiveTab(id);
                                showFeedback("");
                            }}
                        >
                            {icon}
                            <span className="label">{label}</span>
                            {count > 0 && <span className="count">{count}</span>}
                        </button>
                    ))}
                </nav>

                <div className="oh-cc-main">

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
                        <div className="oh-cc-phone-grid">
                            <section className="oh-cc-device" aria-label="Phone">
                                <div className="oh-cc-device-top">
                                    <div className="oh-cc-dial-row">
                                        <select
                                            className="oh-cc-country"
                                            value={country}
                                            onChange={(e) => setCountry(e.target.value)}
                                            aria-label="Country code"
                                        >
                                            {COUNTRIES.map((c) => (
                                                <option key={c.code} value={c.code}>{c.code} {c.dial}</option>
                                            ))}
                                        </select>
                                        <button
                                            type="button"
                                            className="oh-cc-icon-btn"
                                            onClick={() => setSoundOn((v) => !v)}
                                            aria-pressed={soundOn}
                                            aria-label={soundOn ? "Turn tones off" : "Turn tones on"}
                                            title="Keypad and call tones"
                                        >
                                            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
                                        </button>
                                    </div>

                                    <input
                                        id="oh-cc-number"
                                        className="oh-cc-display"
                                        type="tel"
                                        value={number}
                                        onChange={(e) => setNumber(e.target.value)}
                                        placeholder="Enter number"
                                        autoComplete="tel"
                                        aria-label="Phone number"
                                    />

                                    {number && dialTarget !== number.trim() && (
                                        <p className="oh-cc-hint">Will dial {dialTarget}</p>
                                    )}

                                    {matchedContact ? (
                                        <div className="oh-cc-match">
                                            <Avatar name={matchedContact.name} size={34} />
                                            <div>
                                                <strong>{matchedContact.name}</strong>
                                                <span>{matchedContact.company || matchedContact.email || "Saved contact"}</span>
                                            </div>
                                            <CallerBadge info={dialInfo} />
                                        </div>
                                    ) : dialInfo && (
                                        <div className="oh-cc-match">
                                            <CallerBadge info={dialInfo} />
                                            {normalizePhone(dialTarget) && (
                                                <button type="button" className="oh-cc-link-btn" onClick={() => { openContactForm({ phone: dialTarget }); }}>
                                                    + Save to contacts
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {smartMatches.length > 0 && (
                                    <div className="oh-cc-smart" aria-label="Matching contacts">
                                        {smartMatches.map((c) => (
                                            <button key={c.id} type="button" onClick={() => setNumber(normalizePhone(c.phone))}>
                                                <Avatar name={c.name} size={26} /> <span>{c.name}</span> <small>{c.phone}</small>
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

                                <div className="oh-cc-dial-actions">
                                    <button type="button" className="oh-cc-link-btn" onClick={() => setNumber("")} disabled={!number}>Clear</button>
                                    {!activeCall ? (
                                        <button type="button" className="oh-cc-callbtn" onClick={handleStartCall} aria-label="Call">
                                            <Phone size={28} />
                                        </button>
                                    ) : (
                                        <button type="button" className="oh-cc-callbtn end" onClick={handleEndCall} aria-label="End call">
                                            <PhoneOff size={28} />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="oh-cc-icon-btn dark"
                                        onClick={handleDeleteDigit}
                                        onPointerDown={startBackspaceHold}
                                        onPointerUp={() => window.clearTimeout(backTimer.current)}
                                        onPointerLeave={() => window.clearTimeout(backTimer.current)}
                                        aria-label="Delete last digit (hold to clear)"
                                        title="Hold to clear"
                                    >
                                        <Delete size={22} />
                                    </button>
                                </div>

                                {activeCall && (
                                    <div className="oh-cc-live">
                                        <div>
                                            <strong>{activeCall.contactName}</strong>
                                            <span>{activeCall.phone}</span>
                                        </div>
                                        <b>{formatDuration(callSeconds)}</b>
                                        {callMinimized && (
                                            <button type="button" className="oh-cc-link-btn" onClick={() => setCallMinimized(false)}>Open call screen</button>
                                        )}
                                    </div>
                                )}

                                <p className="oh-cc-fineprint">
                                    Demo only: no real phone call is placed. Tip: type digits on your keyboard or paste a number. Hold 0 for +, hold ⌫ to clear.
                                </p>
                            </section>

                            <div className="oh-cc-side">
                                {contactFormJsx && <section className="oh-cc-card">{contactFormJsx}</section>}

                                <section className="oh-cc-card">
                                    <div className="oh-cc-card-head">
                                        <h3>Favourites</h3>
                                        <button type="button" className="oh-cc-link-btn" onClick={() => setActiveTab("favourites")}>See all</button>
                                    </div>
                                    {favourites.length === 0 ? (
                                        <p className="oh-cc-muted">Star a contact to keep them one tap away.</p>
                                    ) : (
                                        <div className="oh-cc-fav-row">
                                            {favourites.map((c) => (
                                                <button key={c.id} type="button" className="oh-cc-fav" onClick={() => selectContact(c)} title={`Dial ${c.name}`}>
                                                    <Avatar name={c.name} size={52} />
                                                    <span>{c.name.split(" ")[0]}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </section>

                                <section className="oh-cc-card">
                                    <div className="oh-cc-card-head">
                                        <h3>Find a contact</h3>
                                        <button type="button" className="oh-cc-link-btn" onClick={() => (showContactForm ? closeContactForm() : openContactForm())}>
                                            {showContactForm ? "Cancel" : "+ New"}
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
                                    {search.trim() ? (
                                        filteredContacts.length === 0 ? (
                                            <div className="oh-cc-empty">No contacts match your search.</div>
                                        ) : filteredContacts.slice(0, 6).map((contact) => (
                                            <div key={contact.id} className="oh-cc-contact" role="button" tabIndex={0} onClick={() => selectContact(contact)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") selectContact(contact); }}>
                                                <Avatar name={contact.name} />
                                                <div className="oh-cc-contact-main">
                                                    <strong>{contact.name}</strong>
                                                    <small>{contact.phone}</small>
                                                </div>
                                                {contact.verified && <ShieldCheck size={16} color="#168653" aria-label="Verified business" />}
                                                <button type="button" style={styles.secondary} onClick={(e) => { e.stopPropagation(); setProfileId(contact.id); }}>Profile</button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="oh-cc-muted" style={{ marginTop: 10 }}>
                                            {contacts.length === 0 ? "No saved contacts yet." : `${contacts.length} saved contact${contacts.length === 1 ? "" : "s"}. Type to search.`}
                                        </p>
                                    )}
                                </section>

                                <section className="oh-cc-card">
                                    <div className="oh-cc-card-head">
                                        <h3>Recent calls</h3>
                                        <button type="button" className="oh-cc-link-btn" onClick={() => setActiveTab("history")}>See all</button>
                                    </div>
                                    {history.length === 0 ? (
                                        <p className="oh-cc-muted">No calls yet. Your demo calls will appear here.</p>
                                    ) : history.slice(0, 5).map((call) => {
                                        const missed = MISSED.includes(call.outcome);
                                        return (
                                            <div key={call.id} className="oh-cc-contact" role="button" tabIndex={0} title="Tap to call again" onClick={() => beginCall(call.phone)} onKeyDown={(e) => { if (e.key === "Enter") beginCall(call.phone); }}>
                                                <Avatar name={call.contactName} />
                                                <div className="oh-cc-contact-main">
                                                    <strong style={missed ? { color: "#b23030" } : undefined}>{call.contactName || call.phone}</strong>
                                                    <small>{call.direction === "Incoming" ? "↙" : "↗"} {call.outcome} · {dayLabel(call.startedAt)} {timeLabel(call.startedAt)}</small>
                                                </div>
                                                <Phone size={16} color="#168653" aria-hidden="true" />
                                            </div>
                                        );
                                    })}
                                </section>

                                <button type="button" className="oh-cc-link-btn" style={{ justifySelf: "start", display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => simulateIncoming()}>
                                    <PhoneIncoming size={15} /> Preview the incoming-call screen (demo)
                                </button>
                            </div>
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
                                    <Avatar name={contact.name} />
                                    <div className="oh-cc-contact-main">
                                        <strong>{contact.name}</strong>
                                        <small>{contact.phone}</small>
                                        {contact.email && <small>{contact.email}</small>}
                                        {contact.company && <small>{contact.company}</small>}
                                        {contact.notes && <small>{contact.notes}</small>}
                                        <small><CallerBadge info={getCallerId(contact.phone)} /></small>
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
                                        <button type="button" style={styles.secondary} onClick={() => setProfileId(contact.id)} aria-label={`Open profile for ${contact.name}`}>Profile</button>
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
                                    <h2>Recents</h2>
                                    <p>Tap a call to call again. Includes records from the operations queue.</p>
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
                                        const isBlocked = blocked.some((b) => samePhone(b, call.phone));
                                        return (
                                            <div
                                                key={call.id}
                                                className="oh-cc-contact"
                                                role="button"
                                                tabIndex={0}
                                                title="Tap to call again"
                                                onClick={() => beginCall(call.phone)}
                                                onKeyDown={(e) => { if (e.key === "Enter") beginCall(call.phone); }}
                                            >
                                                <Avatar name={call.contactName} />
                                                <div className="oh-cc-contact-main">
                                                    <strong style={missed ? { color: "#b23030" } : undefined}>{call.contactName || "Unknown contact"}</strong>
                                                    <small>{call.direction === "Incoming" ? "↙" : "↗"} {call.phone || "No phone number"} · {call.direction || "Recorded call"} · {timeLabel(call.startedAt)}</small>
                                                    <small>
                                                        <span className={`oh-cc-tag ${missed ? "warn" : ""}`}>{call.outcome}</span>
                                                        {call.durationSeconds > 0 ? ` · ${formatDuration(call.durationSeconds)}` : ""}
                                                    </small>
                                                    {call.notes && <small>Notes: {call.notes}</small>}
                                                </div>
                                                <div className="oh-cc-actions">
                                                    {!contacts.some((c) => samePhone(c.phone, call.phone)) && (
                                                        <button type="button" style={styles.secondary} onClick={(e) => { e.stopPropagation(); openContactForm({ name: call.contactName === call.phone ? "" : call.contactName, phone: call.phone }); setActiveTab("contacts"); }}>Save</button>
                                                    )}
                                                    <button type="button" style={styles.secondary} onClick={(e) => { e.stopPropagation(); toggleBlock(call.phone); }}>{isBlocked ? "Unblock" : "Block"}</button>
                                                    <button type="button" style={styles.secondary} onClick={(e) => { e.stopPropagation(); setHistory((cur) => cur.filter((x) => x.id !== call.id)); }} aria-label="Delete this entry">Delete</button>
                                                    <button type="button" style={styles.secondary} onClick={(e) => { e.stopPropagation(); beginCall(call.phone); }}>Call</button>
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
                                            <Avatar name={call.contactName} />
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

                    {activeTab === "callerid" && (
                        <section className="oh-panel">
                            <div className="oh-panel-header">
                                <div>
                                    <h2>Spam protection</h2>
                                    <p>Identify a number, report spam, and block or unblock callers.</p>
                                </div>
                            </div>

                            <label className="oh-cc-label" htmlFor="oh-cc-lookup">Check a phone number</label>
                            <input
                                id="oh-cc-lookup"
                                className="oh-cc-field"
                                type="tel"
                                value={idLookup}
                                onChange={(e) => setIdLookup(e.target.value)}
                                placeholder="+254 7XX XXX XXX"
                            />

                            {lookupInfo && (
                                <div className="oh-cc-id-result" role="status">
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <Avatar name={lookupInfo.name || idLookup} size={44} />
                                        <div>
                                            <strong>{lookupInfo.name || idLookup}</strong>
                                            <div className="oh-cc-muted">{idLookup}</div>
                                        </div>
                                    </div>
                                    <CallerBadge info={lookupInfo} />
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        <button type="button" style={styles.secondary} onClick={() => beginCall(applyCountry(idLookup, dial))} disabled={lookupInfo.kind === "blocked"}>Call</button>
                                        <button type="button" style={styles.secondary} onClick={() => toggleBlock(idLookup)}>
                                            {lookupInfo.kind === "blocked" ? "Unblock" : "Block"}
                                        </button>
                                        {lookupInfo.kind === "spam" ? (
                                            <button type="button" style={styles.secondary} onClick={() => markSafe(idLookup)}>Mark as safe</button>
                                        ) : lookupInfo.kind === "unknown" && (
                                            <button type="button" style={styles.secondary} onClick={() => reportSpam(idLookup)}>Report spam</button>
                                        )}
                                        {(lookupInfo.kind === "unknown" || lookupInfo.kind === "spam") && (
                                            <button type="button" style={styles.secondary} onClick={() => { openContactForm({ phone: idLookup }); setActiveTab("contacts"); }}>Save contact</button>
                                        )}
                                    </div>
                                </div>
                            )}

                            <p className="oh-cc-group-title">Blocked numbers ({blocked.length})</p>
                            {blocked.length === 0 ? (
                                <p className="oh-cc-empty">No blocked numbers.</p>
                            ) : blocked.map((b) => (
                                <div key={b} className="oh-cc-contact" style={{ cursor: "default" }}>
                                    <Avatar name={nameFor(b) || b} />
                                    <div className="oh-cc-contact-main">
                                        <strong>{nameFor(b) || b}</strong>
                                        <small>{b}</small>
                                    </div>
                                    <button type="button" style={styles.secondary} onClick={() => toggleBlock(b)}>Unblock</button>
                                </div>
                            ))}

                            <p className="oh-cc-group-title">Reported as spam ({spam.length})</p>
                            {spam.length === 0 ? (
                                <p className="oh-cc-empty">No reported numbers.</p>
                            ) : spam.map((s) => (
                                <div key={s} className="oh-cc-contact" style={{ cursor: "default" }}>
                                    <Avatar name={nameFor(s) || s} />
                                    <div className="oh-cc-contact-main">
                                        <strong>{nameFor(s) || s}</strong>
                                        <small>{s}</small>
                                    </div>
                                    <button type="button" style={styles.secondary} onClick={() => toggleBlock(s)}>Block</button>
                                    <button type="button" style={styles.secondary} onClick={() => markSafe(s)}>Mark safe</button>
                                </div>
                            ))}

                            <p className="oh-cc-muted" style={{ marginTop: 14 }}>
                                Caller ID here uses your saved contacts, verified business labels and the numbers you report or block in this browser. System-level caller ID and spam databases need native app integration.
                            </p>
                        </section>
                    )}

                    {activeTab === "favourites" && (
                        <section className="oh-panel">
                            <div className="oh-panel-header">
                                <div>
                                    <h2>Favourites</h2>
                                    <p>People and businesses you call most. Tap a card to dial.</p>
                                </div>
                            </div>
                            {favourites.length === 0 ? (
                                <div className="oh-cc-empty">No favourites yet. Open Contacts and tap the star next to a contact.</div>
                            ) : (
                                <div className="oh-cc-fav-grid">
                                    {favourites.map((c) => (
                                        <article key={c.id} className="oh-cc-fav-card">
                                            <Avatar name={c.name} size={64} />
                                            <strong>{c.name}</strong>
                                            <span className="oh-cc-muted">{c.phone}</span>
                                            <CallerBadge info={getCallerId(c.phone)} />
                                            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                                                <button type="button" className="oh-cc-call-action" style={{ padding: "9px 14px" }} onClick={() => beginCall(c.phone)}>
                                                    <Phone size={15} /> Call
                                                </button>
                                                <button type="button" style={styles.secondary} onClick={() => setProfileId(c.id)}>Profile</button>
                                                <button type="button" className="oh-cc-star on" onClick={() => toggleFavourite(c.id)} aria-label={`Remove ${c.name} from favourites`}>★</button>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {activeTab === "settings" && (
                        <div className="oh-cc-settings">
                            <section className="oh-cc-card">
                                <div className="oh-cc-card-head">
                                    <h3>Telephony connection</h3>
                                    <span className="oh-cc-mode"><i /> Not connected</span>
                                </div>
                                <p className="oh-cc-muted" style={{ fontSize: 14, lineHeight: 1.55 }}>
                                    No telephony provider is connected, so this screen cannot place or receive real calls. Everything you see in the dialer, incoming-call and in-call screens is a working interface demo.
                                </p>
                                <p className="oh-cc-group-title">Needed for real calling</p>
                                <ul className="oh-cc-checklist">
                                    <li>A telephony provider account that supports browser (WebRTC) calling and the numbers you need, including Kenyan numbers</li>
                                    <li>Backend endpoints that issue call tokens and receive provider webhooks, with credentials kept on the server</li>
                                    <li>A database for calls, contacts and blocklists instead of this browser's storage</li>
                                    <li>Any approvals the provider or local regulation requires</li>
                                </ul>
                            </section>

                            <section className="oh-cc-card">
                                <div className="oh-cc-card-head"><h3>Sound and dialling</h3></div>
                                <label className="oh-cc-switch">
                                    <input type="checkbox" checked={soundOn} onChange={(e) => setSoundOn(e.target.checked)} />
                                    <span>Keypad, ring and call tones</span>
                                </label>
                                <label className="oh-cc-label" htmlFor="oh-cc-volume" style={{ marginTop: 14 }}>Volume: {Math.round(volume * 100)}%</label>
                                <input
                                    id="oh-cc-volume"
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={Math.round(volume * 100)}
                                    onChange={(e) => setVolume(Number(e.target.value) / 100)}
                                    style={{ width: "100%", accentColor: "#168653" }}
                                />
                                <button type="button" style={{ ...styles.secondary, marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6 }} onClick={testSound}>
                                    <Volume2 size={15} /> Test sound
                                </button>
                                <label className="oh-cc-label" htmlFor="oh-cc-default-country" style={{ marginTop: 14 }}>Default country code</label>
                                <select id="oh-cc-default-country" className="oh-cc-field" value={country} onChange={(e) => setCountry(e.target.value)}>
                                    {COUNTRIES.map((c) => (
                                        <option key={c.code} value={c.code}>{c.name} ({c.dial})</option>
                                    ))}
                                </select>
                            </section>

                            <section className="oh-cc-card oh-cc-span-all">
                                <div className="oh-cc-card-head">
                                    <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><PhoneIncoming size={18} /> Simulate an incoming call</h3>
                                    <span className="oh-cc-muted">Rings with your ringtone inside the phone window</span>
                                </div>
                                <div className="oh-cc-sim-grid">
                                    <div>
                                        <label className="oh-cc-label" htmlFor="oh-cc-sim-type">Caller type</label>
                                        <select id="oh-cc-sim-type" className="oh-cc-field" value={simType} onChange={(e) => setSimType(e.target.value)}>
                                            <option value="contact">Saved contact</option>
                                            <option value="verified">Verified business (demo)</option>
                                            <option value="unknown">Unknown number (demo)</option>
                                            <option value="spam">Suspected spam (demo)</option>
                                            <option value="custom">Custom number</option>
                                        </select>
                                    </div>

                                    {simType === "contact" && (
                                        <div>
                                            <label className="oh-cc-label" htmlFor="oh-cc-sim-contact">Contact</label>
                                            <select id="oh-cc-sim-contact" className="oh-cc-field" value={simContactId} onChange={(e) => setSimContactId(e.target.value)}>
                                                {contacts.length === 0 && <option value="">No contacts yet</option>}
                                                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    {simType === "custom" && (
                                        <>
                                            <div>
                                                <label className="oh-cc-label" htmlFor="oh-cc-sim-name">Caller name (optional)</label>
                                                <input id="oh-cc-sim-name" className="oh-cc-field" value={simName} onChange={(e) => setSimName(e.target.value)} placeholder="e.g. Delivery rider" />
                                            </div>
                                            <div>
                                                <label className="oh-cc-label" htmlFor="oh-cc-sim-phone">Phone number</label>
                                                <input id="oh-cc-sim-phone" className="oh-cc-field" type="tel" value={simPhone} onChange={(e) => setSimPhone(e.target.value)} placeholder="0712 345 678" />
                                            </div>
                                        </>
                                    )}

                                    <div>
                                        <label className="oh-cc-label" htmlFor="oh-cc-sim-delay">Ring after</label>
                                        <select id="oh-cc-sim-delay" className="oh-cc-field" value={simDelay} onChange={(e) => setSimDelay(Number(e.target.value))}>
                                            <option value={0}>Right now</option>
                                            <option value={5}>5 seconds</option>
                                            <option value={10}>10 seconds</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                                    {simCountdown === null ? (
                                        <button type="button" style={{ ...styles.primary, display: "inline-flex", alignItems: "center", gap: 6 }} onClick={startSimulation}>
                                            <PhoneIncoming size={15} /> Start simulated call
                                        </button>
                                    ) : (
                                        <>
                                            <span role="status" style={{ fontWeight: 650 }}>Ringing in {simCountdown}s…</span>
                                            <button type="button" style={styles.secondary} onClick={cancelSimulation}>Cancel</button>
                                        </>
                                    )}
                                </div>
                                <p className="oh-cc-muted" style={{ marginTop: 10 }}>
                                    Demo only: no real call is received. Make sure tones are on and the volume is up. You can answer, decline, block or reply from the phone window.
                                </p>
                            </section>

                            <section className="oh-cc-card oh-cc-span-all">
                                <div className="oh-cc-card-head">
                                    <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Music size={18} /> Ringtone</h3>
                                    <span className="oh-cc-muted">Current: {ringtone.label}</span>
                                </div>
                                <p className="oh-cc-muted" style={{ marginBottom: 12 }}>Press play to listen to a tone. Choose "Use this" when you like it.</p>
                                {toneMsg && (
                                    <p className={`oh-cc-inline-msg ${toneMsg.type}`} role={toneMsg.type === "error" ? "alert" : "status"}>{toneMsg.text}</p>
                                )}

                                <div className="oh-cc-tones">
                                    {BUILTIN_TONES.map((t) => {
                                        const selected = ringtone.kind === "builtin" && ringtone.id === t.id;
                                        const playing = playingId === t.id;
                                        return (
                                            <div key={t.id} className={`oh-cc-tile ${selected ? "on" : ""}`}>
                                                <div className="oh-cc-tile-head">
                                                    <button
                                                        type="button"
                                                        className={`oh-cc-play ${playing ? "playing" : ""}`}
                                                        onClick={() => previewTone({ kind: "builtin", id: t.id, label: t.label, src: "" }, t.id)}
                                                        aria-label={playing ? `Stop ${t.label}` : `Play ${t.label}`}
                                                    >
                                                        {playing ? <Square size={14} /> : <Play size={16} />}
                                                    </button>
                                                    <div className="oh-cc-tile-name">
                                                        <strong>{t.label}</strong>
                                                        <small>{t.desc}</small>
                                                    </div>
                                                </div>
                                                <div className="oh-cc-tile-foot">
                                                    {playing ? <span className="oh-cc-eq" aria-hidden="true"><i /><i /><i /><i /></span> : <span />}
                                                    <button type="button" className={`oh-cc-chip ${selected ? "on" : ""}`} onClick={() => chooseBuiltin(t)} disabled={selected}>
                                                        {selected ? "In use" : "Use this"}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {ringtone.kind !== "builtin" && (
                                    <div className="oh-cc-tile on" style={{ marginTop: 12 }}>
                                        <div className="oh-cc-tile-head">
                                            <button type="button" className={`oh-cc-play ${playingId === "current" ? "playing" : ""}`} onClick={() => previewTone(ringtone, "current")} aria-label={playingId === "current" ? "Stop your ringtone" : "Play your ringtone"}>
                                                {playingId === "current" ? <Square size={14} /> : <Play size={16} />}
                                            </button>
                                            <div className="oh-cc-tile-name">
                                                <strong>{ringtone.label}</strong>
                                                <small>{ringtone.kind === "file" ? "Your uploaded file" : "Online link"} · in use</small>
                                            </div>
                                            <button type="button" style={styles.secondary} onClick={resetTone}>Remove</button>
                                        </div>
                                    </div>
                                )}

                                <div className="oh-cc-tone-grid">
                                    <div>
                                        <p className="oh-cc-group-title">From your device</p>
                                        <input ref={toneFileRef} type="file" accept="audio/*" hidden onChange={handleToneFile} />
                                        <button type="button" style={{ ...styles.secondary, display: "inline-flex", alignItems: "center", gap: 6 }} onClick={() => toneFileRef.current?.click()}>
                                            <Upload size={15} /> Choose audio file (up to 15 MB)
                                        </button>

                                        {pendingTone && (
                                            <div className="oh-cc-tile" style={{ marginTop: 10 }}>
                                                <div className="oh-cc-tile-head">
                                                    <button type="button" className={`oh-cc-play ${playingId === "pending" ? "playing" : ""}`} onClick={() => previewTone(pendingTone, "pending")} aria-label={playingId === "pending" ? "Stop preview" : "Play preview"}>
                                                        {playingId === "pending" ? <Square size={14} /> : <Play size={16} />}
                                                    </button>
                                                    <div className="oh-cc-tile-name">
                                                        <strong>{pendingTone.label}</strong>
                                                        <small>{(pendingTone.size / 1048576).toFixed(1)} MB · listen first, then choose</small>
                                                    </div>
                                                </div>
                                                <div className="oh-cc-tile-foot">
                                                    <button type="button" style={styles.secondary} onClick={discardPendingTone}>Discard</button>
                                                    <button type="button" style={styles.primary} onClick={usePendingTone}>Use as ringtone</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <p className="oh-cc-group-title">From the internet</p>
                                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                            <input
                                                className="oh-cc-field"
                                                style={{ flex: "1 1 200px" }}
                                                type="url"
                                                value={toneUrl}
                                                onChange={(e) => setToneUrl(e.target.value)}
                                                placeholder="https://…/ringtone.mp3"
                                                aria-label="Ringtone link"
                                            />
                                            <button type="button" style={{ ...styles.secondary, display: "inline-flex", alignItems: "center", gap: 6 }} onClick={previewToneUrl}>
                                                {playingId === "url" ? <><Square size={13} /> Stop</> : <><Play size={13} /> Preview</>}
                                            </button>
                                            <button type="button" style={{ ...styles.primary, display: "inline-flex", alignItems: "center", gap: 6 }} onClick={useToneUrl}>
                                                <Link2 size={15} /> Use link
                                            </button>
                                        </div>
                                        <p className="oh-cc-muted" style={{ marginTop: 8 }}>
                                            Find free tones here, copy the direct audio link, then paste it above:
                                        </p>
                                        <div className="oh-cc-sources">
                                            {TONE_SOURCES.map((src) => (
                                                <a key={src.url} href={src.url} target="_blank" rel="noopener noreferrer">
                                                    <ExternalLink size={14} /> {src.name}<small>{src.note}</small>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <p className="oh-cc-muted" style={{ marginTop: 12 }}>
                                    Some sites block playback from other websites. If a link will not play, download the file and upload it instead. Check each site's licence before commercial use. Your choice is saved in this browser.
                                </p>
                            </section>
                        </div>
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

                </div>
            </div>

            <p className="oh-page-note">
                Contacts, call history, blocked numbers and caller ID reports are saved in this browser (localStorage) so they survive a refresh, but they are not shared between devices. Real SIM or internet calling, microphone access and system-level caller ID are separate future integrations.
            </p>

            {/* ---------- Incoming call: full screen caller ID ---------- */}
            {incoming && !activeCall && incomingInfo && (
                <PhoneFrame>
                    <IncomingScreen
                        incoming={incoming}
                        info={incomingInfo}
                        onAnswer={answerIncoming}
                        onDecline={declineIncoming}
                    />
                </PhoneFrame>
            )}

            {/* ---------- Active call: full screen ---------- */}
            {callScreenOpen && activeInfo && (
                <PhoneFrame>
                    <div className="oh-cc-screen" role="region" aria-label="Active call">
                        <div className="oh-cc-screen-top">
                            <button type="button" className="oh-cc-round small" onClick={() => setCallMinimized(true)} aria-label="Minimise call screen" style={{ gridTemplateColumns: "auto" }}>
                                <b style={{ width: 40, height: 40 }}><ChevronDown size={20} /></b>
                            </button>
                            <span>Demo call · not connected to a network</span>
                        </div>

                        <div className="oh-cc-screen-body">
                            <Avatar name={activeInfo.name || activeCall.contactName} size={96} />
                            <h2>{activeInfo.name || activeCall.contactName}</h2>
                            <p>{activeCall.phone}</p>
                            <CallerBadge info={activeInfo} />
                            <div className="oh-cc-timer" aria-live="off">{formatDuration(callSeconds)}</div>
                            <p>
                                {held ? "On hold" : "Connected (demo)"}
                                {muted ? " · Muted" : ""}{speaker ? " · Speaker" : ""}
                            </p>

                            {participants.length > 0 && (
                                <div className="oh-cc-people" aria-label="Also on the call">
                                    {participants.map((p) => <span key={p.phone}>{p.name}</span>)}
                                </div>
                            )}

                            {showInCallKeypad && (
                                <div className="oh-cc-screen-pad">
                                    <div className="oh-cc-sent" aria-live="polite">{sentDigits}</div>
                                    <div className="oh-cc-digits" role="group" aria-label="In-call keypad">
                                        {KEYS.map(([digit, letters]) => (
                                            <button key={digit} type="button" className="oh-cc-digit" onClick={() => pressKey(digit)}>
                                                {digit}<span>{letters || "\u00a0"}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {showCallNotes && (
                                <div className="oh-cc-screen-panel">
                                    <label className="oh-cc-label" htmlFor="oh-cc-screen-notes">Call notes</label>
                                    <textarea id="oh-cc-screen-notes" className="oh-cc-field" rows={3} value={callNotes} onChange={(e) => setCallNotes(e.target.value)} placeholder="Add the outcome or follow-up..." />
                                </div>
                            )}

                            {addingCaller && (
                                <div className="oh-cc-screen-panel">
                                    <label className="oh-cc-label" htmlFor="oh-cc-add-number">Add another caller</label>
                                    <form
                                        onSubmit={(e) => { e.preventDefault(); addCaller(nameFor(applyCountry(addNumber, dial)), applyCountry(addNumber, dial)); }}
                                        style={{ display: "flex", gap: 8 }}
                                    >
                                        <input id="oh-cc-add-number" className="oh-cc-field" type="tel" value={addNumber} onChange={(e) => setAddNumber(e.target.value)} placeholder="Number" />
                                        <button type="submit" className="oh-cc-call-action" style={{ padding: "10px 14px" }}>Add</button>
                                    </form>
                                    {contacts.slice(0, 5).map((c) => (
                                        <button key={c.id} type="button" className="row" onClick={() => addCaller(c.name, c.phone)}>
                                            <Avatar name={c.name} size={30} />
                                            <span>{c.name}<br /><small style={{ opacity: 0.7 }}>{c.phone}</small></span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="oh-cc-ctls">
                            {ctl(muted, muted ? "Unmute" : "Mute", muted ? <MicOff size={24} /> : <Mic size={24} />, () => setMuted((v) => !v))}
                            {ctl(showInCallKeypad, "Keypad", <Grid3x3 size={24} />, () => setShowInCallKeypad((v) => !v))}
                            {ctl(speaker, "Speaker", speaker ? <Volume2 size={24} /> : <VolumeX size={24} />, () => setSpeaker((v) => !v))}
                            {ctl(held, held ? "Resume" : "Hold", held ? <Play size={24} /> : <Pause size={24} />, () => setHeld((v) => !v))}
                            {ctl(addingCaller, "Add call", <UserPlus size={24} />, () => setAddingCaller((v) => !v))}
                            {ctl(showCallNotes, "Notes", <StickyNote size={24} />, () => setShowCallNotes((v) => !v))}
                        </div>

                        <div className="oh-cc-screen-foot">
                            <button type="button" className="oh-cc-round decline" onClick={handleEndCall}>
                                <b><PhoneOff size={26} /></b>End call
                            </button>
                        </div>
                    </div>
                </PhoneFrame>
            )}

            {/* ---------- Minimised call bar ---------- */}
            {activeCall && callMinimized && (
                <div className="oh-cc-pill" role="status">
                    <button type="button" onClick={() => setCallMinimized(false)}>
                        In call · {activeCall.contactName} · {formatDuration(callSeconds)}
                    </button>
                    <button type="button" className="end" onClick={handleEndCall} aria-label="End call">
                        <PhoneOff size={16} />
                    </button>
                </div>
            )}

            {profileContact && (
                <ProfileDialog
                    contact={profileContact}
                    info={getCallerId(profileContact.phone)}
                    recent={history.filter((h) => samePhone(h.phone, profileContact.phone)).slice(0, 4)}
                    onClose={() => setProfileId(null)}
                    onCall={() => { const phone = profileContact.phone; setProfileId(null); beginCall(phone); }}
                    onEdit={() => { const c = profileContact; setProfileId(null); setActiveTab("contacts"); openContactForm(c); }}
                    onFavourite={() => toggleFavourite(profileContact.id)}
                    onBlock={() => toggleBlock(profileContact.phone)}
                />
            )}

            {wrapUp && (
                <WrapUpDialog
                    wrap={wrapUp}
                    info={getCallerId(wrapUp.call.phone)}
                    onSave={finishWrapUp}
                    onSkip={skipWrapUp}
                    onSaveContact={(name) => quickSaveContact(name, wrapUp.call.phone)}
                    onBlock={() => toggleBlock(wrapUp.call.phone)}
                    onReportSpam={() => reportSpam(wrapUp.call.phone)}
                />
            )}
            {assigning && <AssignDialog call={assigning} suggestions={assignees} onAssign={submitAssign} onClose={() => setAssigning(null)} />}
        </div>
    );
}