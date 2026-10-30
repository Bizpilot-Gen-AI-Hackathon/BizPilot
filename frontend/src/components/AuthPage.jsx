
import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CircleAlert,
  Eye,
  EyeOff,
  Info,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";
import SmartImage, { PHOTOS } from "./SmartImage";
import { forgotPassword, resetPassword, loginWithGoogle } from "../services/api";

const GOOGLE_CLIENT_ID =
  typeof import.meta !== "undefined"
    ? import.meta.env?.VITE_GOOGLE_CLIENT_ID || ""
    : "";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getErrors(values, { signup, forgot, agree }) {
  const errors = {};

  if (signup && !values.name.trim()) {
    errors.name = "Enter your full name.";
  }

  if (!values.email.trim()) {
    errors.email = "Enter your email address.";
  } else if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (!forgot) {
    if (!values.password) {
      errors.password = "Enter your password.";
    } else if (values.password.length < 8) {
      errors.password = "Use at least 8 characters.";
    }
  }

  if (signup && !agree) {
    errors.agree = "Accept the terms to continue.";
  }

  return errors;
}

function Field({ id, label, icon, error, children }) {
  return (
    <div className="ap-field">
      <label className="ap-label" htmlFor={id}>
        {label}
      </label>

      <div className={`ap-input ${error ? "has-error" : ""}`}>
        <span className="ap-input-icon">{icon}</span>
        {children}
      </div>

      {error && (
        <p className="ap-field-error" role="alert">
          <CircleAlert size={14} />
          {error}
        </p>
      )}
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.5 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"
      />
      <path
        fill="#FBBC05"
        d="M10.5 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}

function BrandMark({ size = 40 }) {
  return (
    <span
      className="ap-brand-mark"
      style={{ width: size, height: size }}
    >
      <img
        src="/logo.jpeg"
        alt="BizPilot logo"
        width={size}
        height={size}
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    </span>
  );
}

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existing = document.getElementById("google-gsi");

    if (existing) {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }

      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Google script failed to load.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gsi";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Google script failed to load."));
    document.head.appendChild(script);
  });
}

export default function AuthPage({
  mode = "login",
  onBack,
  onSuccess,
  onModeChange,
  resetToken = "",
  resetMessage = "",
  onResetComplete,
}) {
  const reset = Boolean(resetToken);
  const signup = mode === "signup" && !reset;

  const [values, setValues] = useState({
    name: "",
    business: "",
    email: "",
    password: "",
  });

  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [agree, setAgree] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [resetConfirmation, setResetConfirmation] = useState("");

  const firstFieldRef = useRef(null);
  const requestRef = useRef(null);

  const view = reset ? "reset" : forgot ? "forgot" : mode;

  const errors = getErrors(values, {
    signup,
    forgot: forgot || reset,
    agree,
  });

  const visibleError = (field) => (touched[field] ? errors[field] : "");

  useEffect(() => {
    if (resetMessage) setNotice(resetMessage);
  }, [resetMessage]);

  useEffect(() => {
    document.title = reset
      ? "Reset password · BizPilot"
      : forgot
        ? "Reset password · BizPilot"
        : signup
          ? "Create account · BizPilot"
          : "Log in · BizPilot";

    firstFieldRef.current?.focus({ preventScroll: true });

    return () => {
      requestRef.current?.abort();
    };
  }, [view, signup, forgot, reset]);

  function update(field, value) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));

    setFormError("");
    setNotice("");
  }

  function touch(field) {
    setTouched((current) => ({
      ...current,
      [field]: true,
    }));
  }

  function changeMode(nextMode) {
    setForgot(false);
    setTouched({});
    setFormError("");
    setNotice("");
    setShowPassword(false);
    setAgree(false);

    onModeChange?.(nextMode);
  }

  async function submit(event) {
    event.preventDefault();
    setFormError("");
    setNotice("");

    if (reset) {
      if (resetPasswordValue.length < 8) {
        setFormError("Use at least 8 characters for your new password.");
        return;
      }

      if (resetPasswordValue !== resetConfirmation) {
        setFormError("Passwords do not match.");
        return;
      }

      setSubmitting(true);

      try {
        await resetPassword(resetToken, resetPasswordValue);
        window.history.replaceState({}, "", window.location.pathname);
        onResetComplete?.();
        setNotice("Password updated, please log in.");
        onModeChange?.("login");
      } catch (error) {
        setFormError(
          error?.message || "This reset link is invalid or has expired."
        );
      } finally {
        setSubmitting(false);
      }

      return;
    }

    const allTouched = {
      name: true,
      email: true,
      password: true,
      agree: true,
    };

    setTouched(allTouched);

    const currentErrors = getErrors(values, {
      signup,
      forgot,
      agree,
    });

    if (Object.keys(currentErrors).length) {
      setFormError("Check the highlighted fields and try again.");
      return;
    }

    if (forgot) {
      setSubmitting(true);

      try {
        await forgotPassword(values.email.trim().toLowerCase());
        setNotice("If that account exists, we sent a reset link.");
      } catch (error) {
        setFormError(error?.message || "We couldn't send the reset link.");
      } finally {
        setSubmitting(false);
      }

      return;
    }

    if (typeof onSuccess !== "function") {
      setFormError(
        "Authentication is not connected. Configure the authentication service before continuing."
      );
      return;
    }

    setSubmitting(true);

    try {
      const email = values.email.trim().toLowerCase();

      await onSuccess({
        name: values.name.trim() || email.split("@")[0],
        email,
        password: values.password,
        business: values.business.trim(),
        remember,
        provider: "email",
        mode: signup ? "signup" : "login",
      });
    } catch (error) {
      setFormError(error?.message || "Authentication failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function continueWithGoogleIdentity() {
    setFormError("");
    setNotice("");

    if (!GOOGLE_CLIENT_ID) {
      setFormError(
        "Google sign-in is not configured. Add VITE_GOOGLE_CLIENT_ID to frontend/.env."
      );
      return;
    }

    if (typeof onSuccess !== "function") {
      setFormError("Application authentication is not connected.");
      return;
    }

    setGoogleBusy(true);

    try {
      await loadGoogleScript();

      const credential = await new Promise((resolve, reject) => {
        let settled = false;

        const finish = (callback, value) => {
          if (settled) return;
          settled = true;
          callback(value);
        };

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (!response?.credential) {
              finish(reject, new Error("Google did not return a credential."));
              return;
            }

            finish(resolve, response.credential);
          },
        });

        window.google.accounts.id.prompt((notification) => {
          if (
            notification.isNotDisplayed() ||
            notification.isSkippedMoment()
          ) {
            finish(
              reject,
              new Error("Google sign-in was cancelled or unavailable.")
            );
          }
        });
      });

      const user = await loginWithGoogle(credential);
      await onSuccess({ ...user, provider: "google", mode });
    } catch (error) {
      setFormError(error?.message || "Google sign-in failed. Please try again.");
    } finally {
      setGoogleBusy(false);
    }
  }

  const headings = {
    login: {
      title: "Welcome back",
      text: "Log in to continue to your workspace.",
    },
    signup: {
      title: "Create your account",
      text: "Set up your business workspace.",
    },
    forgot: {
      title: "Reset your password",
      text: "Enter your email to start password recovery.",
    },
    reset: {
      title: "Choose a new password",
      text: "Set a new password for your BizPilot account.",
    },
  }[view];

  const submitLabel = reset
    ? "Update password"
    : forgot
      ? "Send reset link"
      : signup
        ? "Create account"
        : "Log in";

  return (
    <div className="ap-shell">
      <style>{authStyles}</style>

      <aside className="ap-media">
        <SmartImage
          id={PHOTOS.auth}
          alt="A small business owner at her shop counter"
          preset="panel"
          priority
          objectPosition="50% 28%"
        />

        <div className="ap-media-overlay" />
        <div className="ap-media-grid" aria-hidden="true" />

        <div className="ap-media-content">
          <button type="button" className="ap-back" onClick={onBack}>
            <ArrowLeft size={16} />
            Back to BizPilot
          </button>

          <div className="ap-brand">
            <BrandMark size={44} />
            <span>bizpilot<i>.</i></span>
          </div>

          <div className="ap-media-copy">
            <h1>
              Your business,
              <br />
              <span>understood.</span>
            </h1>

            <p>
              Make confident decisions with a clearer view of your sales,
              inventory, and business performance.
            </p>

            <ul className="ap-benefits">
              <li>
                <span className="ap-benefit-icon">
                  <BarChart3 size={18} />
                </span>
                <div>
                  <strong>Business performance</strong>
                  <span>See your key numbers in one place.</span>
                </div>
              </li>

              <li>
                <span className="ap-benefit-icon">
                  <Store size={18} />
                </span>
                <div>
                  <strong>Inventory management</strong>
                  <span>Keep track of products and stock.</span>
                </div>
              </li>

              <li>
                <span className="ap-benefit-icon">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <strong>Clearer decisions</strong>
                  <span>Use your records to plan your next move.</span>
                </div>
              </li>
            </ul>
          </div>

          <p className="ap-copyright">
            © {new Date().getFullYear()} BizPilot
          </p>
        </div>
      </aside>

      <main className="ap-panel">
        <div className="ap-mobile-header">
          <button
            type="button"
            className="ap-back ap-mobile-back"
            onClick={onBack}
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="ap-brand">
            <BrandMark size={34} />
            <span>bizpilot<i>.</i></span>
          </div>
        </div>

        <section className="ap-card">
          {!forgot && !reset && (
            <div className="ap-tabs" role="tablist" aria-label="Account">
              <button
                type="button"
                role="tab"
                aria-selected={!signup}
                className={!signup ? "active" : ""}
                onClick={() => signup && changeMode("login")}
              >
                Log in
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={signup}
                className={signup ? "active" : ""}
                onClick={() => !signup && changeMode("signup")}
              >
                Sign up
              </button>
            </div>
          )}

          <header className="ap-heading">
            <span className="ap-heading-icon ap-heading-brand">
              <BrandMark size={42} />
            </span>
            <h2>{headings.title}</h2>
            <p>{headings.text}</p>
          </header>

          {notice && (
            <div className="ap-notice" role="status">
              <Info size={17} />
              <span>{notice}</span>
            </div>
          )}

          <form className="ap-form" onSubmit={submit} noValidate>
            {reset ? (
              <>
                <Field
                  id="ap-new-password"
                  label="New password"
                  icon={<LockKeyhole size={17} />}
                >
                  <input
                    id="ap-new-password"
                    ref={firstFieldRef}
                    type="password"
                    value={resetPasswordValue}
                    onChange={(event) =>
                      setResetPasswordValue(event.target.value)
                    }
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                  />
                </Field>

                <Field
                  id="ap-confirm-password"
                  label="Confirm password"
                  icon={<LockKeyhole size={17} />}
                >
                  <input
                    id="ap-confirm-password"
                    type="password"
                    value={resetConfirmation}
                    onChange={(event) =>
                      setResetConfirmation(event.target.value)
                    }
                    autoComplete="new-password"
                    placeholder="Repeat your new password"
                    required
                  />
                </Field>
              </>
            ) : (
              <>
                {signup && (
                  <>
                    <Field
                      id="ap-name"
                      label="Full name"
                      icon={<UserRound size={17} />}
                      error={visibleError("name")}
                    >
                      <input
                        id="ap-name"
                        ref={firstFieldRef}
                        value={values.name}
                        onChange={(event) => update("name", event.target.value)}
                        onBlur={() => touch("name")}
                        autoComplete="name"
                        placeholder="Your full name"
                        aria-invalid={Boolean(visibleError("name"))}
                      />
                    </Field>

                    <Field
                      id="ap-business"
                      label="Business name (optional)"
                      icon={<Store size={17} />}
                    >
                      <input
                        id="ap-business"
                        value={values.business}
                        onChange={(event) =>
                          update("business", event.target.value)
                        }
                        autoComplete="organization"
                        placeholder="Your business name"
                      />
                    </Field>
                  </>
                )}

                <Field
                  id="ap-email"
                  label="Email address"
                  icon={<Mail size={17} />}
                  error={visibleError("email")}
                >
                  <input
                    id="ap-email"
                    ref={signup ? undefined : firstFieldRef}
                    type="email"
                    value={values.email}
                    onChange={(event) => update("email", event.target.value)}
                    onBlur={() => touch("email")}
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@company.com"
                    aria-invalid={Boolean(visibleError("email"))}
                  />
                </Field>

                {!forgot && (
                  <Field
                    id="ap-password"
                    label="Password"
                    icon={<LockKeyhole size={17} />}
                    error={visibleError("password")}
                  >
                    <input
                      id="ap-password"
                      type={showPassword ? "text" : "password"}
                      value={values.password}
                      onChange={(event) =>
                        update("password", event.target.value)
                      }
                      onBlur={() => touch("password")}
                      autoComplete={signup ? "new-password" : "current-password"}
                      placeholder={
                        signup ? "At least 8 characters" : "Your password"
                      }
                      aria-invalid={Boolean(visibleError("password"))}
                    />

                    <button
                      type="button"
                      className="ap-eye"
                      onClick={() =>
                        setShowPassword((current) => !current)
                      }
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </Field>
                )}

                {!signup && !forgot && (
                  <div className="ap-options">
                    <label className="ap-remember">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(event) =>
                          setRemember(event.target.checked)
                        }
                      />
                      <span>Remember me</span>
                    </label>

                    <button
                      type="button"
                      className="ap-link"
                      onClick={() => {
                        setForgot(true);
                        setTouched({});
                        setFormError("");
                        setNotice("");
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </>
            )}

            {signup && (
              <div className="ap-terms">
                <label>
                  <input
                    type="checkbox"
                    checked={agree}
                    onChange={(event) => {
                      setAgree(event.target.checked);
                      setFormError("");
                    }}
                    onBlur={() => touch("agree")}
                  />

                  <span>
                    I agree to the{" "}
                    <button
                      type="button"
                      className="ap-link"
                      onClick={() =>
                        setNotice(
                          "The Terms of Service page is not published yet."
                        )
                      }
                    >
                      Terms of Service
                    </button>{" "}
                    and{" "}
                    <button
                      type="button"
                      className="ap-link"
                      onClick={() =>
                        setNotice(
                          "The Privacy Policy page is not published yet."
                        )
                      }
                    >
                      Privacy Policy
                    </button>.
                  </span>
                </label>

                {visibleError("agree") && (
                  <p className="ap-field-error" role="alert">
                    <CircleAlert size={14} />
                    {visibleError("agree")}
                  </p>
                )}
              </div>
            )}

            {formError && (
              <div className="ap-error" role="alert">
                <CircleAlert size={17} />
                <span>{formError}</span>
              </div>
            )}

            <button
              type="submit"
              className="ap-submit"
              disabled={submitting || googleBusy}
            >
              {submitting ? (
                <>
                  <span className="ap-spinner" />
                  Connecting…
                </>
              ) : (
                <>
                  {submitLabel}
                  <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          {!forgot && !reset && (
            <>
              <div className="ap-divider">
                <span />
                <span>or continue with</span>
                <span />
              </div>

              <button
                type="button"
                className="ap-google"
                onClick={continueWithGoogleIdentity}
                disabled={submitting || googleBusy}
              >
                {googleBusy ? (
                  <span className="ap-spinner ap-spinner-dark" />
                ) : (
                  <GoogleLogo />
                )}
                {googleBusy
                  ? "Connecting to Google…"
                  : "Continue with Google"}
              </button>
            </>
          )}

          <p className="ap-switch">
            {forgot ? (
              <>
                Remembered your password?{" "}
                <button
                  type="button"
                  className="ap-link"
                  onClick={() => changeMode("login")}
                >
                  Back to log in
                </button>
              </>
            ) : signup ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="ap-link"
                  onClick={() => changeMode("login")}
                >
                  Log in
                </button>
              </>
            ) : (
              <>
                New to BizPilot?{" "}
                <button
                  type="button"
                  className="ap-link"
                  onClick={() => changeMode("signup")}
                >
                  Create an account
                </button>
              </>
            )}
          </p>
        </section>

        <footer className="ap-footer">
          BizPilot <span /> Your business workspace
        </footer>
      </main>
    </div>
  );
}

const authStyles = `
  @import url("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=DM+Sans:wght@400;500;600;700&display=swap");

  .ap-shell,
  .ap-shell * {
    box-sizing: border-box;
  }

  .ap-shell {
    --green: #1E6B3C;
    --green-dark: #165530;
    --green-deep: #0A2616;
    --mint: #8FD9AB;
    --ink: #14211A;
    --muted: #5F6F65;
    --line: #DCE5DB;
    --tint: #EAF2E8;
    --red: #B2432E;
    --display: "Bricolage Grotesque", "DM Sans", system-ui, sans-serif;

    min-height: 100vh;
    display: grid;
    grid-template-columns: minmax(340px, 46%) minmax(0, 54%);
    color: var(--ink);
    background: #F2F5F1;
    font-family: "DM Sans", system-ui, sans-serif;
    font-size: 14px;
    -webkit-font-smoothing: antialiased;
  }

  .ap-shell button,
  .ap-shell input {
    font: inherit;
  }

  .ap-shell button {
    cursor: pointer;
  }

  .ap-shell button:disabled {
    cursor: not-allowed;
    opacity: .65;
  }

  .ap-shell button:focus-visible,
  .ap-shell input:focus-visible {
    outline: 2px solid #78CFA7;
    outline-offset: 2px;
  }

  .ap-media {
    position: relative;
    min-height: 100vh;
    overflow: hidden;
    color: white;
    background: var(--green-deep);
  }

  .ap-media > .si {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .ap-media-overlay {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(120% 70% at 0% 100%, rgba(10,38,22,.98) 20%, transparent 70%),
      linear-gradient(180deg, rgba(10,38,22,.62), rgba(10,38,22,.9));
  }

  .ap-media-grid {
    position: absolute;
    inset: 0;
    opacity: .5;
    background-image:
      linear-gradient(rgba(143,217,171,.07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(143,217,171,.07) 1px, transparent 1px);
    background-size: 44px 44px;
    -webkit-mask-image: linear-gradient(180deg, #000, transparent 75%);
    mask-image: linear-gradient(180deg, #000, transparent 75%);
  }

  .ap-media-content {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 28px clamp(24px, 4vw, 56px);
  }

  .ap-back {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 0;
    border: 0;
    color: inherit;
    background: transparent;
    font-weight: 600;
    opacity: .85;
    transition: opacity .15s, gap .15s;
  }

  .ap-back:hover {
    opacity: 1;
    gap: 10px;
  }

  .ap-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 28px;
    color: inherit;
    font-family: var(--display);
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -.8px;
  }

  .ap-brand i {
    color: var(--mint);
    font-style: normal;
  }

  .ap-brand-mark {
    display: inline-grid;
    flex-shrink: 0;
    place-items: center;
    overflow: hidden;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 0 0 1px rgba(255,255,255,.25), 0 8px 24px rgba(0,0,0,.28);
  }

  .ap-brand-mark img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .ap-media-copy {
    max-width: 460px;
    margin: auto 0;
    padding: 48px 0;
  }

  .ap-media-copy h1 {
    margin: 0 0 18px;
    font-family: var(--display);
    font-size: clamp(40px, 4.6vw, 66px);
    font-weight: 800;
    line-height: 1;
    letter-spacing: -2.4px;
  }

  .ap-media-copy h1 span {
    font-weight: 600;
    color: rgba(255,255,255,.72);
  }

  .ap-media-copy > p {
    max-width: 400px;
    margin: 0 0 32px;
    color: #D5E6DA;
    font-size: 16px;
    line-height: 1.65;
  }

  .ap-benefits {
    display: grid;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .ap-benefits li {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 13px 15px;
    border: 1px solid rgba(255,255,255,.13);
    border-radius: 12px;
    background: rgba(255,255,255,.07);
    -webkit-backdrop-filter: blur(10px);
    backdrop-filter: blur(10px);
  }

  .ap-benefit-icon {
    display: grid !important;
    width: 38px;
    height: 38px;
    flex-shrink: 0;
    place-items: center;
    border-radius: 10px;
    color: var(--green-deep) !important;
    background: var(--mint);
  }

  .ap-benefits strong,
  .ap-benefits div > span {
    display: block;
  }

  .ap-benefits strong {
    margin-bottom: 2px;
    font-size: 14px;
  }

  .ap-benefits div > span {
    color: #C2D9CA;
    line-height: 1.45;
  }

  .ap-copyright {
    margin: 0;
    color: #B7CEBE;
    font-size: 12px;
  }

  .ap-panel {
    display: flex;
    min-width: 0;
    min-height: 100vh;
    flex-direction: column;
    justify-content: center;
    padding: 24px clamp(20px, 5vw, 72px);
    background:
      radial-gradient(60% 50% at 100% 0%, rgba(143,217,171,.22), transparent 70%),
      #F2F5F1;
  }

  .ap-card {
    width: 100%;
    max-width: 440px;
    margin: auto;
    padding: 30px 30px 26px;
    border: 1px solid var(--line);
    border-radius: 20px;
    background: #fff;
    box-shadow: 0 1px 0 #fff inset, 0 24px 60px -24px rgba(10,38,22,.28);
  }

  .ap-mobile-header {
    display: none;
  }

  .ap-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px;
    margin-bottom: 24px;
    padding: 4px;
    border-radius: 11px;
    background: var(--tint);
  }

  .ap-tabs button {
    min-height: 40px;
    border: 0;
    border-radius: 8px;
    color: var(--muted);
    background: transparent;
    font-weight: 600;
    transition: background .15s, color .15s, box-shadow .15s;
  }

  .ap-tabs button.active {
    color: var(--green-deep);
    background: #fff;
    box-shadow: 0 1px 3px rgba(10,38,22,.12);
  }

  .ap-heading {
    margin-bottom: 20px;
  }

  .ap-heading-icon {
    display: grid;
    width: 42px;
    height: 42px;
    margin-bottom: 12px;
    place-items: center;
    border-radius: 12px;
    color: #fff;
    background: linear-gradient(145deg, var(--green), var(--green-deep));
    box-shadow: 0 8px 18px -8px rgba(30,107,60,.7);
  }

  /* Actual BizPilot logo replaces the previous heading icon */
  .ap-heading-brand {
    width: 48px;
    height: 48px;
    padding: 3px;
    overflow: hidden;
    border: 1px solid #DCE5DB;
    border-radius: 14px;
    background: #FFFFFF;
    box-shadow: 0 5px 14px rgba(10,38,22,.12);
  }

  .ap-heading-brand .ap-brand-mark {
    width: 100% !important;
    height: 100% !important;
    overflow: hidden;
    border-radius: 10px;
    background: #FFFFFF;
    box-shadow: none;
  }

  .ap-heading-brand .ap-brand-mark img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .ap-heading h2 {
    margin: 0 0 6px;
    font-family: var(--display);
    font-size: 30px;
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -.9px;
  }

  .ap-heading p {
    margin: 0;
    color: var(--muted);
    line-height: 1.5;
  }

  .ap-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .ap-field {
    min-width: 0;
  }

  .ap-label {
    display: block;
    margin-bottom: 6px;
    color: #34443A;
    font-size: 13px;
    font-weight: 600;
  }

  .ap-input {
    display: flex;
    align-items: center;
    min-width: 0;
    height: 46px;
    border: 1px solid var(--line);
    border-radius: 11px;
    background: #FAFCF9;
    transition: border-color .15s, box-shadow .15s, background .15s;
  }

  .ap-input:hover {
    border-color: #C3D2C4;
  }

  .ap-input:focus-within {
    border-color: var(--green);
    background: #fff;
    box-shadow: 0 0 0 4px rgba(30,107,60,.12);
  }

  .ap-input:focus-within .ap-input-icon {
    color: var(--green);
  }

  .ap-input.has-error {
    border-color: #D99A8D;
    background: #FFFAF8;
  }

  .ap-input-icon {
    display: grid;
    width: 40px;
    flex-shrink: 0;
    place-items: center;
    color: #78877D;
    transition: color .15s;
  }

  .ap-input input {
    width: 100%;
    min-width: 0;
    height: 100%;
    padding: 0 10px 0 0;
    border: 0;
    outline: 0;
    color: var(--ink);
    background: transparent;
  }

  .ap-input input::placeholder {
    color: #9AA59D;
  }

  .ap-shell .ap-input input:focus-visible {
    outline: none;
  }

  .ap-eye {
    display: grid;
    width: 42px;
    height: 100%;
    flex-shrink: 0;
    place-items: center;
    border: 0;
    border-radius: 0 11px 11px 0;
    color: var(--muted);
    background: transparent;
  }

  .ap-eye:hover {
    color: var(--green-dark);
  }

  .ap-field-error {
    display: flex;
    align-items: flex-start;
    gap: 5px;
    margin: 6px 0 0;
    color: var(--red);
    font-size: 12px;
    line-height: 1.4;
  }

  .ap-field-error svg {
    flex-shrink: 0;
    margin-top: 1px;
  }

  .ap-options {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .ap-remember {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #34443A;
  }

  .ap-remember input,
  .ap-terms input {
    accent-color: var(--green);
  }

  .ap-link {
    padding: 0;
    border: 0;
    color: var(--green-dark);
    background: transparent;
    font-size: 12px;
    font-weight: 600;
    text-decoration: none;
  }

  .ap-link:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .ap-terms label {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    color: #526257;
    font-size: 12px;
    line-height: 1.6;
  }

  .ap-terms input {
    margin-top: 3px;
    flex-shrink: 0;
  }

  .ap-notice,
  .ap-error {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin: 0 0 14px;
    padding: 11px 13px;
    border-radius: 10px;
    font-size: 12px;
    line-height: 1.5;
  }

  .ap-notice {
    border: 1px solid #D2E4D6;
    color: #2F5A41;
    background: #F2F8F3;
  }

  .ap-error {
    border: 1px solid #F0D1CA;
    color: var(--red);
    background: #FFF5F2;
  }

  .ap-notice svg,
  .ap-error svg {
    flex-shrink: 0;
    margin-top: 1px;
  }

  .ap-submit,
  .ap-google {
    display: flex;
    width: 100%;
    min-height: 48px;
    align-items: center;
    justify-content: center;
    gap: 9px;
    border-radius: 11px;
    font-weight: 600;
    transition: background .15s, border-color .15s, transform .1s, box-shadow .15s;
  }

  .ap-submit {
    margin-top: 4px;
    border: 1px solid var(--green-dark);
    color: #fff;
    background: linear-gradient(180deg, #25804A, var(--green-dark));
    box-shadow: 0 10px 22px -10px rgba(22,85,48,.75), inset 0 1px 0 rgba(255,255,255,.18);
  }

  .ap-submit:hover:not(:disabled) {
    background: linear-gradient(180deg, #1E6B3C, var(--green-deep));
  }

  .ap-submit:active:not(:disabled),
  .ap-google:active:not(:disabled) {
    transform: translateY(1px);
  }

  .ap-google {
    border: 1px solid var(--line);
    color: var(--ink);
    background: #fff;
  }

  .ap-google:hover:not(:disabled) {
    background: #F8FAF7;
    border-color: #C3D2C4;
  }

  .ap-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 18px 0;
    color: var(--muted);
    font-size: 12px;
  }

  .ap-divider span:first-child,
  .ap-divider span:last-child {
    height: 1px;
    flex: 1;
    background: var(--line);
  }

  .ap-switch {
    margin: 20px 0 0;
    color: var(--muted);
    text-align: center;
    font-size: 13px;
  }

  .ap-switch .ap-link {
    font-size: 13px;
  }

  .ap-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 20px;
    color: #849087;
    font-size: 11px;
  }

  .ap-footer span {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: #AAB6AC;
  }

  .ap-spinner {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    border: 2px solid rgba(255,255,255,.45);
    border-top-color: #fff;
    border-radius: 50%;
    animation: ap-spin .7s linear infinite;
  }

  .ap-spinner-dark {
    border-color: #D8E3DA;
    border-top-color: var(--green);
  }

  @keyframes ap-spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 900px) {
    .ap-shell {
      grid-template-columns: minmax(300px, 40%) minmax(0, 60%);
    }

    .ap-benefits li {
      padding: 11px 12px;
    }
  }

  @media (max-width: 760px) {
    .ap-shell {
      display: flex;
      flex-direction: column;
    }

    .ap-media {
      display: none;
    }

    .ap-panel {
      min-height: 100vh;
      padding: 16px 16px 20px;
    }

    .ap-mobile-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 22px;
    }

    .ap-mobile-header .ap-brand {
      margin: 0;
      color: var(--green-deep);
      font-size: 22px;
    }

    .ap-mobile-header .ap-brand i {
      color: var(--green);
    }

    .ap-mobile-header .ap-brand-mark {
      box-shadow: 0 0 0 1px var(--line);
    }

    .ap-mobile-back {
      color: var(--ink);
    }

    .ap-card {
      max-width: 460px;
      padding: 24px 20px 22px;
    }

    .ap-footer {
      margin-top: 22px;
    }
  }

  @media (max-width: 380px) {
    .ap-panel {
      padding-right: 12px;
      padding-left: 12px;
    }

    .ap-heading h2 {
      font-size: 26px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .ap-shell *,
    .ap-shell *::before,
    .ap-shell *::after {
      animation-duration: .01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: .01ms !important;
    }
  }
`;
