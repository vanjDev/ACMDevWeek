const SaanAuth = {
  user: null,
  bookmarks: null,
  ready: null,
};

function readGuestBookmarks() {
  return JSON.parse(localStorage.getItem("saanBookmarks") || "[]");
}

function writeGuestBookmarks(ids) {
  localStorage.setItem("saanBookmarks", JSON.stringify([...new Set(ids)]));
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

async function refreshAuth({ mergeGuest = false } = {}) {
  try {
    const session = await authFetch("/api/auth/me");
    SaanAuth.user = session.user;
    const saved = await authFetch("/api/me/bookmarks");
    const merged = mergeGuest ? [...saved.food_ids, ...readGuestBookmarks()] : saved.food_ids;
    SaanAuth.bookmarks = [...new Set(merged)];
    if (mergeGuest) await saveAccountBookmarks(SaanAuth.bookmarks);
  } catch {
    SaanAuth.user = null;
    SaanAuth.bookmarks = null;
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
  document.getElementById("authSubmit").lastChild.textContent = isRegister ? " Sign up and save" : " Login and save";
  document.getElementById("authPassword").autocomplete = isRegister ? "new-password" : "current-password";
  document.getElementById("authForm").dataset.mode = mode;
}

function setupAuthControls() {
  const dialog = document.getElementById("authDialog");
  const form = document.getElementById("authForm");
  const message = document.getElementById("authMessage");

  document.getElementById("openAuth")?.addEventListener("click", () => {
    message.textContent = "Continue as guest anytime. Login only if you want bookmarks saved across devices.";
    dialog.showModal();
  });

  document.getElementById("logoutAuth")?.addEventListener("click", async () => {
    await authFetch("/api/auth/logout", { method: "POST", body: "{}" });
    SaanAuth.user = null;
    SaanAuth.bookmarks = null;
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
}

SaanAuth.getBookmarks = () => (SaanAuth.user ? SaanAuth.bookmarks || [] : readGuestBookmarks());
SaanAuth.setBookmarks = saveAccountBookmarks;
SaanAuth.ready = refreshAuth();
window.SaanAuth = SaanAuth;

document.addEventListener("DOMContentLoaded", setupAuthControls);
