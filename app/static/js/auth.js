const SaanAuth = {
  user: null,
  bookmarks: null,
  data: null,
  ready: null,
};

function readGuestBookmarks() {
  return JSON.parse(localStorage.getItem("saanBookmarks") || "[]")
    .map((id) => Number(id))
    .filter(Number.isFinite);
}

function writeGuestBookmarks(ids) {
  localStorage.setItem("saanBookmarks", JSON.stringify([...new Set((ids || []).map((id) => Number(id)).filter(Number.isFinite))]));
}

function readGuestData() {
  try {
    return JSON.parse(localStorage.getItem("saanUserData") || "{}");
  } catch {
    return {};
  }
}

function writeGuestData(data) {
  localStorage.setItem("saanUserData", JSON.stringify(data || {}));
}

async function authFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "Something went wrong.");
  return data;
}

async function saveAccountBookmarks(ids) {
  if (!SaanAuth.user) {
    writeGuestBookmarks(ids);
    return ids;
  }

  const data = await authFetch("/api/me/bookmarks", {
    method: "PUT",
    body: JSON.stringify({ food_ids: [...new Set(ids)] }),
  });
  SaanAuth.bookmarks = data.food_ids;
  writeGuestBookmarks(data.food_ids);
  return data.food_ids;
}

async function saveAccountData(data) {
  const next = { ...(data || {}) };
  writeGuestData(next);
  if (!SaanAuth.user) {
    SaanAuth.data = next;
    return next;
  }

  const response = await authFetch("/api/me/data", {
    method: "PUT",
    body: JSON.stringify({ data: next }),
  });
  SaanAuth.data = response.data;
  writeGuestData(response.data);
  return response.data;
}

async function handleGoogleCredential(response) {
  const message = document.getElementById("authMessage");
  const dialog = document.getElementById("authDialog");
  try {
    message.textContent = "Signing in with Google...";
    await authFetch("/api/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential: response.credential }),
    });
    await refreshAuth({ mergeGuest: true });
    dialog.close();
  } catch (error) {
    message.textContent = error.message;
  }
}

async function loadGoogleClientId() {
  if (window.SAAN_GOOGLE_CLIENT_ID) return window.SAAN_GOOGLE_CLIENT_ID;

  try {
    const config = await authFetch("/api/config");
    window.SAAN_GOOGLE_CLIENT_ID = config.google_client_id || "";
  } catch {
    window.SAAN_GOOGLE_CLIENT_ID = "";
  }

  return window.SAAN_GOOGLE_CLIENT_ID;
}

function updateAuthUi() {
  const status = document.getElementById("authStatus");
  const openButton = document.getElementById("openAuth");
  const logoutButton = document.getElementById("logoutAuth");
  if (!status || !openButton || !logoutButton) return;

  if (SaanAuth.user) {
    status.textContent = SaanAuth.user.name;
    openButton.hidden = true;
    logoutButton.hidden = false;
  } else {
    status.textContent = "Guest mode";
    openButton.hidden = false;
    logoutButton.hidden = true;
  }

  if (window.lucide) window.lucide.createIcons();
}

async function renderGoogleButton() {
  const button = document.getElementById("googleSignInButton");
  const hint = document.getElementById("googleAuthHint");
  if (!button || !hint) return;

  hint.textContent = "Loading Google sign in...";
  const clientId = await loadGoogleClientId();
  if (!clientId) {
    button.hidden = true;
    hint.textContent = "Google sign in is unavailable right now.";
    hint.hidden = false;
    return;
  }

  hint.hidden = true;
  button.hidden = false;
  if (!window.google?.accounts?.id || button.dataset.rendered === "true") return;

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: handleGoogleCredential,
  });
  window.google.accounts.id.renderButton(button, {
    theme: "outline",
    size: "large",
    type: "standard",
    shape: "pill",
    text: "signin_with",
    locale: "en",
    width: Math.min(380, button.clientWidth || 380),
  });
  button.dataset.rendered = "true";
}

async function refreshAuth({ mergeGuest = false } = {}) {
  try {
    const session = await authFetch("/api/auth/me");
    SaanAuth.user = session.user;
    const saved = await authFetch("/api/me/bookmarks");
    const accountData = await authFetch("/api/me/data");
    const merged = mergeGuest ? [...saved.food_ids, ...readGuestBookmarks()] : saved.food_ids;
    SaanAuth.bookmarks = [...new Set(merged)];
    SaanAuth.data = mergeGuest ? { ...accountData.data, ...readGuestData() } : accountData.data;
    if (mergeGuest) await saveAccountBookmarks(SaanAuth.bookmarks);
    if (mergeGuest) await saveAccountData(SaanAuth.data);
  } catch {
    SaanAuth.user = null;
    SaanAuth.bookmarks = null;
    SaanAuth.data = readGuestData();
  }

  updateAuthUi();
  window.dispatchEvent(new CustomEvent("saan:auth-changed"));
}

function setAuthMode(mode) {
  const isRegister = mode === "register";
  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.authMode === mode);
  });
  document.getElementById("authNameField").hidden = !isRegister;
  document.getElementById("authSubmit").lastChild.textContent = isRegister ? " Sign up and save" : " Sign in and save";
  document.getElementById("authPassword").autocomplete = isRegister ? "new-password" : "current-password";
  document.getElementById("authForm").dataset.mode = mode;
}

function setupAuthControls() {
  const dialog = document.getElementById("authDialog");
  const form = document.getElementById("authForm");
  const message = document.getElementById("authMessage");

  document.getElementById("openAuth")?.addEventListener("click", () => {
    message.textContent = "Continue as guest anytime. Sign in only if you want bookmarks saved across devices.";
    dialog.showModal();
    void renderGoogleButton();
  });

  document.getElementById("closeAuth")?.addEventListener("click", () => dialog.close());

  document.getElementById("logoutAuth")?.addEventListener("click", async () => {
    await authFetch("/api/auth/logout", { method: "POST", body: "{}" });
    SaanAuth.user = null;
    SaanAuth.bookmarks = null;
    SaanAuth.data = readGuestData();
    updateAuthUi();
    window.dispatchEvent(new CustomEvent("saan:auth-changed"));
  });

  document.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.addEventListener("click", () => setAuthMode(button.dataset.authMode));
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const mode = form.dataset.mode || "login";
    const payload = {
      email: document.getElementById("authEmail").value,
      password: document.getElementById("authPassword").value,
    };
    if (mode === "register") payload.name = document.getElementById("authName").value;

    try {
      message.textContent = "Saving...";
      await authFetch(`/api/auth/${mode}`, { method: "POST", body: JSON.stringify(payload) });
      await refreshAuth({ mergeGuest: true });
      dialog.close();
    } catch (error) {
      message.textContent = error.message;
    }
  });

  setAuthMode("login");
  updateAuthUi();
  void renderGoogleButton();
}

SaanAuth.getBookmarks = () => (SaanAuth.user ? SaanAuth.bookmarks || [] : readGuestBookmarks());
SaanAuth.setBookmarks = saveAccountBookmarks;
SaanAuth.getData = () => SaanAuth.data || readGuestData();
SaanAuth.setData = saveAccountData;
SaanAuth.ready = refreshAuth();
window.SaanAuth = SaanAuth;

document.addEventListener("DOMContentLoaded", setupAuthControls);
window.addEventListener("load", () => void renderGoogleButton());
