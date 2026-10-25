import React, { useEffect, useState } from "react";
import {
    Bell,
    Building2,
    Check,
    CheckCircle2,
    ChevronRight,
    Globe,
    ImagePlus,
    RotateCcw,
    Save,
    Settings as SettingsIcon,
    ShieldCheck,
    Trash2,
    UserRound,
    Wallet,
} from "lucide-react";

const STORAGE_KEY = "bizpilot-settings";

const defaultSettings = {
    businessName: "My Business",
    ownerName: "",
    email: "",
    currency: "KES",
    language: "English",
    emailNotifications: true,
    businessAlerts: true,
    weeklySummary: false,
};

const styles = `
    @keyframes stFadeUp {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
    }

    @keyframes stFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    @keyframes stPop {
        0% { transform: scale(.85); }
        65% { transform: scale(1.1); }
        100% { transform: scale(1); }
    }

    .st-root {
        --st-green: #0e9c6b;
        --st-dark: #173d30;
        --st-muted: #78867d;
        --st-border: #e5ece6;
        width: 100%;
        max-width: 1100px;
        margin: 0 auto;
        padding: 30px;
        color: #25382c;
        font-family: inherit;
        animation: stFadeIn .4s ease both;
    }

    .st-root * { box-sizing: border-box; }

    .st-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 29px;
        animation: stFadeUp .5s ease both;
    }

    .st-header-copy { min-width: 0; }

    .st-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        margin-bottom: 13px;
        color: var(--st-green);
        font-size: 10px;
        font-weight: 850;
        letter-spacing: 1.5px;
    }

    .st-header h1 {
        margin: 0;
        color: var(--st-dark);
        font-size: clamp(29px, 4vw, 38px);
        font-weight: 850;
        letter-spacing: -1.3px;
        line-height: 1.2;
    }

    .st-header-copy > p {
        margin: 9px 0 0;
        color: var(--st-muted);
        font-size: 13px;
        line-height: 1.8;
    }

    .st-reset, .st-save, .st-photo-button, .st-remove-photo {
        display: inline-flex;
        flex-shrink: 0;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 42px;
        padding: 0 14px;
        border-radius: 12px;
        font: inherit;
        font-size: 12px;
        font-weight: 750;
        cursor: pointer;
        transition: background .2s ease, border-color .2s ease, transform .2s ease;
    }

    .st-reset {
        border: 1px solid var(--st-border);
        background: #fff;
        color: #536459;
    }

    .st-reset:hover {
        transform: translateY(-2px);
        border-color: #c6dfce;
        background: #f6fbf7;
    }

    .st-reset:hover svg { transform: rotate(-35deg); }
    .st-reset svg { transition: transform .3s ease; }

    .st-banner {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 23px;
        padding: 19px 21px;
        border: 1px solid #d5eade;
        border-radius: 17px;
        background: linear-gradient(110deg, #eff9f1, #f9fcf9);
        animation: stFadeUp .5s .05s ease both;
    }

    .st-banner-icon, .st-section-icon, .st-storage-icon {
        display: grid;
        flex-shrink: 0;
        place-items: center;
    }

    .st-banner-icon {
        width: 43px;
        height: 43px;
        border-radius: 13px;
        background: #d8f1e1;
        color: #128154;
    }

    .st-banner-copy { flex: 1; min-width: 0; }

    .st-banner-copy strong {
        display: block;
        margin-bottom: 4px;
        color: #244b35;
        font-size: 12px;
    }

    .st-banner-copy p {
        margin: 0;
        color: #748579;
        font-size: 11px;
        line-height: 1.7;
    }

    .st-local-tag {
        display: inline-flex;
        flex-shrink: 0;
        align-items: center;
        gap: 6px;
        padding: 7px 9px;
        border: 1px solid #d6e9db;
        border-radius: 999px;
        background: rgba(255,255,255,.7);
        color: #39744e;
        font-size: 10px;
        font-weight: 750;
    }

    .st-local-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #20a568;
        box-shadow: 0 0 0 3px rgba(32,165,104,.12);
    }

    .st-form { display: grid; gap: 19px; }

    .st-card {
        min-width: 0;
        padding: 25px;
        border: 1px solid var(--st-border);
        border-radius: 19px;
        background: #fff;
        box-shadow: 0 4px 18px rgba(25,55,36,.025);
        animation: stFadeUp .55s ease both;
        transition: border-color .25s ease, box-shadow .25s ease;
    }

    .st-card:nth-child(1) { animation-delay: .04s; }
    .st-card:nth-child(2) { animation-delay: .08s; }
    .st-card:nth-child(3) { animation-delay: .12s; }
    .st-card:nth-child(4) { animation-delay: .16s; }
    .st-card:nth-child(5) { animation-delay: .20s; }

    .st-card:hover {
        border-color: #d6e5da;
        box-shadow: 0 8px 28px rgba(25,55,36,.045);
    }

    .st-section-heading {
        display: flex;
        align-items: center;
        gap: 13px;
        margin-bottom: 24px;
    }

    .st-section-icon {
        width: 44px;
        height: 44px;
        border: 1px solid #dcefe1;
        border-radius: 13px;
        background: #eff8f1;
        color: var(--st-green);
        transition: transform .25s ease, background .25s ease;
    }

    .st-card:hover .st-section-icon {
        transform: translateY(-2px);
        background: #e3f5e8;
    }

    .st-section-heading h2 {
        margin: 0;
        color: #263c2e;
        font-size: 15px;
        font-weight: 800;
        letter-spacing: -.3px;
    }

    .st-section-heading p {
        margin: 5px 0 0;
        color: #849087;
        font-size: 11px;
        line-height: 1.6;
    }

    .st-fields {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 20px;
    }

    .st-field {
        display: flex;
        flex-direction: column;
        gap: 9px;
        min-width: 0;
    }

    .st-field-full { grid-column: 1 / -1; }

    .st-field > span {
        color: #526358;
        font-size: 11px;
        font-weight: 750;
    }

    .st-field input, .st-field select {
        width: 100%;
        min-height: 47px;
        padding: 0 13px;
        border: 1px solid #e1e9e2;
        border-radius: 11px;
        outline: none;
        background: #fbfcfb;
        color: #294033;
        font: inherit;
        font-size: 12px;
        transition: border-color .2s ease, background .2s ease, box-shadow .2s ease;
    }

    .st-field input::placeholder { color: #a2aca4; }

    .st-field input:focus, .st-field select:focus {
        border-color: #65bc8d;
        background: #fff;
        box-shadow: 0 0 0 4px rgba(14,156,107,.09);
    }

    .st-field select { cursor: pointer; }

    .st-note {
        display: flex;
        align-items: flex-start;
        gap: 9px;
        margin: 19px 0 0;
        padding: 13px 14px;
        border-radius: 11px;
        background: #f7f9f7;
        color: #849087;
        font-size: 10px;
        line-height: 1.8;
    }

    .st-note svg {
        flex-shrink: 0;
        margin-top: 2px;
        color: #769580;
    }

    .st-profile-editor {
        display: flex;
        align-items: center;
        gap: 22px;
    }

    .st-profile-preview {
        display: grid;
        position: relative;
        flex-shrink: 0;
        width: 96px;
        height: 96px;
        overflow: hidden;
        place-items: center;
        border: 3px solid #e0f2e5;
        border-radius: 50%;
        background: #e8f6ec;
        color: #13784f;
        font-size: 26px;
        font-weight: 850;
    }

    .st-profile-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .st-profile-actions { min-width: 0; }

    .st-profile-actions > strong {
        color: #344b3b;
        font-size: 13px;
    }

    .st-profile-actions > p {
        margin: 6px 0 12px;
        color: #849087;
        font-size: 11px;
        line-height: 1.7;
    }

    .st-profile-buttons {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 9px;
    }

    .st-photo-button {
        position: relative;
        border: 1px solid #0e9c6b;
        background: #0e9c6b;
        color: #fff;
        cursor: pointer;
    }

    .st-photo-button:hover {
        transform: translateY(-1px);
        background: #087d53;
    }

    .st-photo-button input {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip-path: inset(50%);
    }

    .st-photo-button:focus-within {
        outline: 3px solid rgba(14,156,107,.25);
        outline-offset: 3px;
    }

    .st-remove-photo {
        border: 1px solid #e5ece6;
        background: #fff;
        color: #a33c3c;
    }

    .st-remove-photo:hover { background: #fff5f5; }

    .st-photo-error {
        margin: 10px 0 0;
        color: #b54747;
        font-size: 11px;
    }

    .st-toggle-list { display: grid; }

    .st-toggle-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 17px 0;
        border-bottom: 1px solid #edf1ed;
    }

    .st-toggle-row:first-child { padding-top: 0; }
    .st-toggle-row:last-child { padding-bottom: 0; border-bottom: 0; }

    .st-toggle-copy { min-width: 0; }

    .st-toggle-copy strong {
        display: block;
        color: #344b3b;
        font-size: 12px;
        font-weight: 750;
    }

    .st-toggle-copy p {
        margin: 5px 0 0;
        color: #8a968d;
        font-size: 11px;
        line-height: 1.7;
    }

    .st-switch {
        position: relative;
        display: inline-flex;
        flex-shrink: 0;
        align-items: center;
        width: 44px;
        height: 25px;
        padding: 3px;
        border: 0;
        border-radius: 999px;
        background: #dce3dd;
        cursor: pointer;
        transition: background .22s ease, box-shadow .22s ease;
    }

    .st-switch.is-on {
        background: var(--st-green);
        box-shadow: 0 2px 8px rgba(14,156,107,.2);
    }

    .st-switch:focus-visible {
        outline: 3px solid rgba(14,156,107,.25);
        outline-offset: 3px;
    }

    .st-switch-thumb {
        display: block;
        width: 19px;
        height: 19px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 1px 4px rgba(0,0,0,.13);
        transform: translateX(0);
        transition: transform .22s cubic-bezier(.2,.8,.2,1);
    }

    .st-switch.is-on .st-switch-thumb { transform: translateX(19px); }

    .st-storage {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 17px;
        border: 1px solid #e3ede5;
        border-radius: 13px;
        background: #f8fbf8;
    }

    .st-storage-icon {
        width: 39px;
        height: 39px;
        border-radius: 11px;
        background: #e4f3e7;
        color: #278354;
    }

    .st-storage-copy { flex: 1; min-width: 0; }

    .st-storage-copy strong {
        display: block;
        color: #355440;
        font-size: 12px;
    }

    .st-storage-copy p {
        margin: 6px 0 0;
        color: #7e8d82;
        font-size: 11px;
        line-height: 1.8;
    }

    .st-footer {
        position: sticky;
        bottom: 12px;
        z-index: 5;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-top: 5px;
        padding: 15px 18px;
        border: 1px solid #e1e9e2;
        border-radius: 16px;
        background: rgba(255,255,255,.95);
        box-shadow: 0 8px 28px rgba(25,55,36,.09);
        backdrop-filter: blur(12px);
    }

    .st-status {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        color: #238454;
        font-size: 11px;
        line-height: 1.6;
    }

    .st-status svg { flex-shrink: 0; animation: stPop .3s ease both; }
    .st-status.is-error { color: #b54747; }
    .st-status.is-neutral { color: #859087; }

    .st-save {
        border: 1px solid #0e9c6b;
        background: #0e9c6b;
        color: #fff;
        box-shadow: 0 5px 13px rgba(14,156,107,.14);
    }

    .st-save:hover {
        transform: translateY(-2px);
        background: #087d53;
        box-shadow: 0 8px 20px rgba(14,156,107,.22);
    }

    .st-save:active { transform: scale(.97); }

    .st-reset:focus-visible, .st-save:focus-visible,
    .st-remove-photo:focus-visible {
        outline: 3px solid rgba(14,156,107,.25);
        outline-offset: 3px;
    }

    @media (max-width: 700px) {
        .st-root { padding: 20px; }
        .st-card { padding: 21px; }
        .st-banner { flex-wrap: wrap; }
        .st-local-tag { margin-left: 57px; }
    }

    @media (max-width: 480px) {
        .st-root { padding: 14px; }
        .st-header { align-items: flex-start; gap: 10px; }
        .st-header h1 { font-size: 29px; }
        .st-header-copy > p { font-size: 12px; }
        .st-reset { min-height: 38px; padding: 0 10px; }
        .st-banner { align-items: flex-start; padding: 15px; }
        .st-local-tag { margin-left: 0; }
        .st-card { padding: 17px; border-radius: 16px; }
        .st-section-heading { gap: 10px; margin-bottom: 20px; }
        .st-section-icon { width: 39px; height: 39px; }
        .st-fields { grid-template-columns: 1fr; gap: 16px; }
        .st-field-full { grid-column: auto; }
        .st-profile-editor { align-items: flex-start; gap: 14px; }
        .st-profile-preview { width: 68px; height: 68px; font-size: 20px; }
        .st-footer { align-items: stretch; flex-direction: column; }
        .st-save { width: 100%; }
        .st-status { min-height: 18px; }
        .st-toggle-row { gap: 12px; }
        .st-toggle-copy p { max-width: 240px; }
    }

    @media (prefers-reduced-motion: reduce) {
        .st-root *, .st-root *::before, .st-root *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
        }
    }
`;

function loadSettings() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved
            ? { ...defaultSettings, ...JSON.parse(saved) }
            : { ...defaultSettings };
    } catch {
        return { ...defaultSettings };
    }
}

function getInitialSettings(profile) {
    const stored = loadSettings();

    return {
        ...defaultSettings,
        ...stored,
        ownerName: profile?.name || stored.ownerName || "",
        email: profile?.email || stored.email || "",
    };
}

function getInitials(name) {
    return (name || "BP")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase() || "BP";
}

export default function Settings({ profile, onProfileChange }) {
    const [settings, setSettings] = useState(() => getInitialSettings(profile));
    const [saved, setSaved] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("neutral");
    const [photoError, setPhotoError] = useState("");

    // Keep the form aligned with profile updates coming from App.jsx.
    useEffect(() => {
        setSettings((current) => ({
            ...current,
            ownerName: profile?.name ?? current.ownerName,
            email: profile?.email ?? current.email,
        }));
    }, [profile?.name, profile?.email]);

    function clearStatus() {
        setSaved(false);
        setMessage("");
        setMessageType("neutral");
    }

    function updateField(event) {
        const { name, value } = event.target;

        setSettings((current) => ({
            ...current,
            [name]: value,
        }));

        // Name and email are shared with the sidebar and top bar.
        if (name === "ownerName") {
            onProfileChange?.({ name: value });
        }

        if (name === "email") {
            onProfileChange?.({ email: value });
        }

        clearStatus();
    }

    function updateToggle(name) {
        setSettings((current) => ({
            ...current,
            [name]: !current[name],
        }));

        clearStatus();
    }

    function handlePhotoChange(event) {
        const file = event.target.files?.[0];
        event.target.value = "";

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setPhotoError("Please choose a valid image file.");
            return;
        }

        if (file.size > 1024 * 1024) {
            setPhotoError("Your image must be 1 MB or smaller.");
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            if (typeof reader.result !== "string") {
                setPhotoError("We couldn't read that image. Please try another.");
                return;
            }

            onProfileChange?.({ avatar: reader.result });
            setPhotoError("");
            setMessage("Profile picture updated across your workspace.");
            setMessageType("success");
            setSaved(false);
        };

        reader.onerror = () => {
            setPhotoError("We couldn't read that image. Please try again.");
        };

        reader.readAsDataURL(file);
    }

    function removePhoto() {
        onProfileChange?.({ avatar: "" });
        setPhotoError("");
        setMessage("Profile picture removed.");
        setMessageType("success");
        setSaved(false);
    }

    function saveSettings(event) {
        event.preventDefault();

        try {
            const nextSettings = {
                ...settings,
                ownerName: settings.ownerName.trim(),
                email: settings.email.trim(),
            };

            // Keep the main application profile synchronized.
            onProfileChange?.({
                name: nextSettings.ownerName,
                email: nextSettings.email,
            });

            localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
            setSettings(nextSettings);
            setSaved(true);
            setMessage("Your settings have been saved on this device.");
            setMessageType("success");
        } catch {
            setSaved(false);
            setMessage(
                "Settings could not be saved. Check your browser storage."
            );
            setMessageType("error");
        }
    }

    function resetSettings() {
        const confirmed = window.confirm(
            "Reset your BizPilot preferences? Your profile name and email will also be reset."
        );

        if (!confirmed) return;

        setSettings({ ...defaultSettings });
        onProfileChange?.({
            name: defaultSettings.ownerName,
            email: defaultSettings.email,
        });

        setPhotoError("");
        setSaved(false);
        setMessage("Defaults restored. Select Save changes to store them.");
        setMessageType("neutral");
    }

    const enabledNotifications = [
        settings.businessAlerts,
        settings.emailNotifications,
        settings.weeklySummary,
    ].filter(Boolean).length;

    const currentName = profile?.name || settings.ownerName;
    const currentAvatar = profile?.avatar || "";

    return (
        <>
            <style>{styles}</style>

            <main className="st-root">
                <header className="st-header">
                    <div className="st-header-copy">
                        <span className="st-eyebrow">
                            <SettingsIcon size={15} />
                            PREFERENCES & CONFIGURATION
                        </span>
                        <h1>Settings</h1>
                        <p>
                            Personalise your workspace and manage your business preferences.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="st-reset"
                        onClick={resetSettings}
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
                            Customise your profile, regional display options,
                            and notification preferences in one place.
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
                                    Manage the name and photo displayed throughout BizPilot.
                                </p>
                            </div>
                        </div>

                        <div className="st-profile-editor">
                            <div className="st-profile-preview">
                                {currentAvatar ? (
                                    <img src={currentAvatar} alt="Your profile" />
                                ) : (
                                    getInitials(currentName)
                                )}
                            </div>

                            <div className="st-profile-actions">
                                <strong>Profile picture</strong>
                                <p>
                                    Choose an image up to 1 MB. Your photo appears in
                                    the sidebar and top navigation.
                                </p>

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
                                            className="st-remove-photo"
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
                            Your photo is stored in this browser for this demo.
                            It is not uploaded to a server.
                        </p>
                    </section>

                    <section className="st-card">
                        <div className="st-section-heading">
                            <span className="st-section-icon">
                                <Building2 size={19} />
                            </span>
                            <div>
                                <h2>Business profile</h2>
                                <p>Keep your business contact information up to date.</p>
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
                                <h2>Regional preferences</h2>
                                <p>Choose your preferred currency and language.</p>
                            </div>
                        </div>

                        <div className="st-fields">
                            <label className="st-field">
                                <span>Currency</span>
                                <select
                                    name="currency"
                                    value={settings.currency}
                                    onChange={updateField}
                                >
                                    <option value="KES">KES — Kenyan Shilling</option>
                                    <option value="USD">USD — US Dollar</option>
                                    <option value="EUR">EUR — Euro</option>
                                    <option value="GBP">GBP — British Pound</option>
                                </select>
                            </label>

                            <label className="st-field">
                                <span>Language</span>
                                <select
                                    name="language"
                                    value={settings.language}
                                    onChange={updateField}
                                >
                                    <option value="English">English</option>
                                </select>
                            </label>
                        </div>

                        <p className="st-note">
                            <Globe size={14} />
                            These are saved preferences. Currency conversion and
                            application-wide translation are not yet connected.
                        </p>
                    </section>

                    <section className="st-card">
                        <div className="st-section-heading">
                            <span className="st-section-icon">
                                <Bell size={19} />
                            </span>
                            <div>
                                <h2>Notifications</h2>
                                <p>Choose which types of updates you want enabled.</p>
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
                                <div className="st-toggle-row" key={item.name}>
                                    <div className="st-toggle-copy">
                                        <strong>{item.title}</strong>
                                        <p>{item.description}</p>
                                    </div>

                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={Boolean(settings[item.name])}
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
                            These switches save preferences locally. Actual email
                            delivery, live alerts, and scheduled summaries require
                            backend integration.
                        </p>
                    </section>

                    <section className="st-card">
                        <div className="st-section-heading">
                            <span className="st-section-icon">
                                <ShieldCheck size={19} />
                            </span>
                            <div>
                                <h2>Privacy and storage</h2>
                                <p>Understand how your current preferences are stored.</p>
                            </div>
                        </div>

                        <div className="st-storage">
                            <span className="st-storage-icon">
                                <Wallet size={19} />
                            </span>
                            <div className="st-storage-copy">
                                <strong>Stored in this browser</strong>
                                <p>
                                    Your profile and preferences are saved locally in
                                    this browser. They are not automatically synced to
                                    another device or account. Clearing browser data
                                    may remove them.
                                </p>
                            </div>
                        </div>

                        <p className="st-note">
                            <UserRound size={14} />
                            This demo does not yet use a secure account-management
                            service or server-side profile storage.
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
                                    {saved && <Check size={16} />}
                                    <span>{message}</span>
                                </>
                            )}
                        </div>

                        <button type="submit" className="st-save">
                            <Save size={16} />
                            Save changes
                            <ChevronRight size={15} />
                        </button>
                    </footer>
                </form>
            </main>
        </>
    );
}
