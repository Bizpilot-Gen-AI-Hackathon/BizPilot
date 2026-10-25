
import React, { useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";

export default function AuthPage({
  mode = "login",
  onBack,
  onSuccess,
  onModeChange,
}) {
  const isSignup = mode === "signup";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function submit(event) {
    event.preventDefault();
    setError("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (isSignup && !cleanName) {
      setError("Enter your full name to continue.");
      return;
    }

    if (!cleanEmail || !password) {
      setError("Enter your email address and password.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (typeof onSuccess !== "function") {
      setError("Authentication is not connected yet.");
      return;
    }

    setSubmitting(true);

    try {
      // Keep the existing App.jsx integration.
      // Never pass the password into application user state.
      onSuccess({
        name: cleanName || cleanEmail.split("@")[0],
        email: cleanEmail,
        remember,
        demo: true,
      });
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  function changeMode(nextMode) {
    setError("");
    setPassword("");

    if (typeof onModeChange === "function") {
      onModeChange(nextMode);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-left">
        <button
          type="button"
          className="auth-back"
          onClick={onBack}
        >
          <ArrowLeft size={16} />
          Back to BizPilot
        </button>

        <div className="auth-brand">
          <span className="marketing-brand-icon">
            <Activity size={21} />
          </span>
          <span>
            bizpilot<span className="brand-period">.</span>
          </span>
        </div>

        <div className="auth-message">
          <h1>
            Your business,
            <br />
            <span>understood.</span>
          </h1>

          <p>
            Make confident decisions with a clearer view of your
            sales, inventory, and business performance.
          </p>
        </div>

        <div className="auth-left-footer">
          © {new Date().getFullYear()} BizPilot
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap">
          <div className="auth-mobile-brand">
            <span className="marketing-brand-icon">
              <Activity size={19} />
            </span>
            <span>
              bizpilot<span className="brand-period">.</span>
            </span>
          </div>

          <div className="auth-heading">
            <span className="auth-mini-icon">
              {isSignup ? (
                <UserRound size={17} />
              ) : (
                <LockKeyhole size={17} />
              )}
            </span>

            <h2>
              {isSignup ? "Create your account" : "Welcome back"}
            </h2>

            <p>
              {isSignup
                ? "Create your account to get started."
                : "Sign in to continue to your workspace."}
            </p>
          </div>

          <form
            className="auth-form"
            onSubmit={submit}
            noValidate
          >
            {isSignup && (
              <label>
                Full name

                <div className="auth-input-wrap">
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                    required
                  />

                  <span>
                    <UserRound size={16} />
                  </span>
                </div>
              </label>
            )}

            <label>
              Email address

              <div className="auth-input-wrap">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />

                <span>
                  <Mail size={16} />
                </span>
              </div>
            </label>

            <label>
              Password

              <div className="auth-input-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={
                    isSignup
                      ? "At least 8 characters"
                      : "Enter your password"
                  }
                  autoComplete={
                    isSignup ? "new-password" : "current-password"
                  }
                  minLength={8}
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </label>

            {!isSignup && (
              <div className="auth-extra-row">
                <label className="remember-check">
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
                  className="text-link"
                  onClick={() =>
                    setError(
                      "Password recovery is not connected yet."
                    )
                  }
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}

            <button
              className="auth-submit"
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? "Please wait..."
                : isSignup
                  ? "Create account"
                  : "Sign in"}

              {!submitting && <ArrowRight size={16} />}
            </button>
          </form>

          <p className="auth-switch">
            {isSignup
              ? "Already have an account?"
              : "New to BizPilot?"}{" "}

            <button
              type="button"
              onClick={() =>
                changeMode(isSignup ? "login" : "signup")
              }
            >
              {isSignup ? "Log in" : "Create an account"}
            </button>
          </p>
        </div>

        <div className="auth-right-footer">
          <span>BizPilot</span>
          <span />
          <span>Your business workspace</span>
        </div>
      </div>
    </div>
  );
}
