const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const TOKEN_KEY = "bizpilot_auth_token";
const USER_KEY = "bizpilot_auth_user";

function formatApiError(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const location = Array.isArray(item.loc)
            ? item.loc.filter((part) => part !== "body").join(".")
            : "";
          const message = item.msg || item.message || JSON.stringify(item);
          return location ? `${location}: ${message}` : message;
        }
        return String(item);
      })
      .join(" ");
  }
  if (value && typeof value === "object") {
    return value.message || value.msg || JSON.stringify(value);
  }
  return String(value);
}

/**
 * Session helpers
 */

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser() {
  try {
    const storedUser = localStorage.getItem(USER_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
}

export function saveAuthSession(data) {
  const user = data?.user ?? data?.data?.user ?? null;

  const token =
    data?.access_token ??
    data?.accessToken ??
    data?.token ??
    data?.data?.access_token ??
    data?.data?.accessToken ??
    data?.data?.token;

  if (!user || typeof user !== "object") {
    throw new Error("The server did not return a valid user profile.");
  }

  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    throw new Error("Unable to save your session in this browser.");
  }

  return user;
}

export function clearAuthSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // Storage may be unavailable in some browser environments.
  }
}

/**
 * Shared API request handler
 */

async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getAuthToken();

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error(
      "Unable to connect to BizPilot. Check your connection and try again."
    );
  }

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;

    try {
      const errorData = await response.json();
      message = formatApiError(
        errorData.detail || errorData.message || errorData.error || message
      );
    } catch {
      // Retain the default error message for non-JSON responses.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return null;
}

/**
 * Authentication
 */

export async function login(credentials) {
  const data = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    }),
  });

  return saveAuthSession(data);
}

export async function signup(details) {
  const data = await request("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name: details.name.trim(),
      email: details.email.trim().toLowerCase(),
      password: details.password,
      businessName: details.business?.trim() || null,
    }),
  });

  const user = data?.user ?? data?.data?.user;

  const token =
    data?.access_token ??
    data?.accessToken ??
    data?.token ??
    data?.data?.access_token ??
    data?.data?.accessToken ??
    data?.data?.token;

  // Save a session only when the server returns both a user and token.
  if (user && token) {
    saveAuthSession(data);
  }

  return data;
}

export async function getCurrentUser() {
  return request("/auth/me");
}

export async function simulateUssd(text) {
  return request("/ussd/simulate", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function savePhone(phone) {
  return request("/auth/phone", {
    method: "PUT",
    body: JSON.stringify({ phone }),
  });
}

export async function logout() {
  try {
    if (getAuthToken()) {
      await request("/auth/logout", { method: "POST" });
    }
  } finally {
    clearAuthSession();
  }
}

/**
 * Backend health check
 */

export async function getHealth() {
  return request("/health");
}

/**
 * Dashboard and data endpoints
 */

export const getDashboardSummary = () => request("/dashboard/summary");

export const getSalesTrend = (period = "week") =>
  request(`/dashboard/sales-trend?period=${encodeURIComponent(period)}`);

export const getProducts = () => request("/products");

export const getInventory = () => request("/inventory");

export const getAlerts = () => request("/alerts");

export const getTransactions = (limit = 5, { q = "", status = "" } = {}) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  return request(`/transactions?${params}`);
};

export async function getSales(params = "") {
  return request(`/sales${params ? `?${params}` : ""}`);
}

/**
 * AI assistant
 */

export async function askAssistant(message) {
  return request("/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

/**
 * Business data upload
 */

export async function uploadBusinessFile(file) {
  const body = new FormData();
  body.append("file", file);

  return request("/upload", {
    method: "POST",
    body,
  });
}

export async function loginWithGoogle(credential) {
  const data = await request("/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
  return saveAuthSession(data);
}

export const resendVerification = (email) =>
  request("/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) });

export const forgotPassword = (email) =>
  request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });

export const resetPassword = (token, password) =>
  request("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });

export const templateUrl = (kind = "products") => `${API_BASE_URL}/upload/template?kind=${kind}`;

export { API_BASE_URL };