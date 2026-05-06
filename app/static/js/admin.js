let adminFoods = [];
let adminSearchTimer = null;
let adminMap = null;
let adminMapMarker = null;

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.hidden = true;
  }, 2600);
}

async function adminFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "Admin request failed.");
  return data;
}

function setAdminAccessState(state, message = "") {
  const accessPanel = document.getElementById("adminAccessPanel");
  const workspace = document.getElementById("adminWorkspace");
  if (state === "ready") {
    if (accessPanel) accessPanel.hidden = true;
    if (workspace) workspace.hidden = false;
    return;
  }

  if (accessPanel) {
    accessPanel.hidden = false;
    const copy = accessPanel.querySelector("span");
    if (copy && message) copy.textContent = message;
  }
  if (workspace) workspace.hidden = true;
}

async function ensureAdminAccess() {
  try {
    const session = await adminFetch("/api/auth/me");
    if (!session.user?.is_admin) {
      setAdminAccessState("blocked", "You are signed in, but this account is not listed in ADMIN_EMAILS.");
      return false;
    }
    setAdminAccessState("ready");
    return true;
  } catch {
    setAdminAccessState("login", "Sign in with an admin email to edit stores, prices, map locations, and menu items.");
    return false;
  }
}

function formatLabel(value) {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function foodPayloadFromForm() {
  return {
    restaurant: document.getElementById("adminRestaurant").value.trim(),
    name: document.getElementById("adminName").value.trim(),
    price_min: Number(document.getElementById("adminPriceMin").value || 0),
    price_max: Number(document.getElementById("adminPriceMax").value || 0),
    category: document.getElementById("adminCategory").value,
    mood: document.getElementById("adminMood").value,
    area: document.getElementById("adminArea").value,
    rating: Number(document.getElementById("adminRating").value || 0),
    latitude: Number(document.getElementById("adminLatitude").value),
    longitude: Number(document.getElementById("adminLongitude").value),
    image_url: document.getElementById("adminImageUrl").value.trim() || null,
    description: document.getElementById("adminDescription").value.trim(),
    is_active: document.getElementById("adminIsActive").checked,
  };
}

function resetAdminForm() {
  document.getElementById("adminFoodForm").reset();
  document.getElementById("adminFoodId").value = "";
  document.getElementById("adminRating").value = "4.0";
  document.getElementById("adminIsActive").checked = true;
  document.getElementById("adminFormMode").textContent = "New item";
  document.getElementById("adminFormTitle").textContent = "Add food spot";
  document.getElementById("adminDisableFood").hidden = true;
  setMapPosition(null);
}

function fillAdminForm(food) {
  document.getElementById("adminFoodId").value = food.id;
  document.getElementById("adminRestaurant").value = food.restaurant;
  document.getElementById("adminName").value = food.name;
  document.getElementById("adminPriceMin").value = food.price_min;
  document.getElementById("adminPriceMax").value = food.price_max;
  document.getElementById("adminCategory").value = food.category;
  document.getElementById("adminMood").value = food.mood;
  document.getElementById("adminArea").value = food.area;
  document.getElementById("adminRating").value = food.rating;
  document.getElementById("adminLatitude").value = food.latitude;
  document.getElementById("adminLongitude").value = food.longitude;
  document.getElementById("adminImageUrl").value = food.image_url || "";
  document.getElementById("adminDescription").value = food.description;
  document.getElementById("adminIsActive").checked = food.is_active;
  document.getElementById("adminFormMode").textContent = `Editing #${food.id}`;
  document.getElementById("adminFormTitle").textContent = food.name;
  document.getElementById("adminDisableFood").hidden = false;
  setMapPosition({ lat: food.latitude, lng: food.longitude });
  document.getElementById("adminFoodForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

function setMapPosition(position) {
  if (!adminMap || !window.L) return;
  if (!position) {
    if (adminMapMarker) {
      adminMap.removeLayer(adminMapMarker);
      adminMapMarker = null;
    }
    return;
  }
  const latLng = [position.lat, position.lng];
  if (!adminMapMarker) {
    adminMapMarker = L.marker(latLng).addTo(adminMap);
  } else {
    adminMapMarker.setLatLng(latLng);
  }
  adminMap.setView(latLng, Math.max(adminMap.getZoom(), 17));
}

function setFormCoordinates(lat, lng) {
  document.getElementById("adminLatitude").value = Number(lat).toFixed(6);
  document.getElementById("adminLongitude").value = Number(lng).toFixed(6);
  document.getElementById("adminMapHint").textContent = `Pinned ${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`;
  setMapPosition({ lat, lng });
}

function setupAdminMap() {
  const mapElement = document.getElementById("adminMap");
  if (!mapElement || !window.L || adminMap) return;
  adminMap = L.map(mapElement, {
    scrollWheelZoom: false,
  }).setView([14.6042, 120.9888], 17);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  }).addTo(adminMap);
  adminMap.on("click", (event) => {
    setFormCoordinates(event.latlng.lat, event.latlng.lng);
  });
  setTimeout(() => adminMap.invalidateSize(), 0);
}

function adminFoodRow(food) {
  return `
    <article class="admin-food-row ${food.is_active ? "" : "is-inactive"}" data-admin-food-id="${food.id}">
      <div>
        <strong>${food.name}</strong>
        <span>${food.restaurant} - ${formatLabel(food.area)} - ${formatLabel(food.category)}</span>
      </div>
      <b>PHP ${food.price_min}-${food.price_max}</b>
      <small>${food.is_active ? "Active" : "Hidden"}</small>
      <button class="icon-button" type="button" data-admin-edit="${food.id}" aria-label="Edit ${food.name}" title="Edit">
        <i data-lucide="pencil"></i>
      </button>
    </article>
  `;
}

function renderAdminFoods() {
  const list = document.getElementById("adminFoodList");
  const count = document.getElementById("adminFoodCount");
  if (!list || !count) return;
  count.textContent = `${adminFoods.length} item${adminFoods.length === 1 ? "" : "s"}`;
  list.innerHTML = adminFoods.length
    ? adminFoods.map(adminFoodRow).join("")
    : `<p>No food spots found.</p>`;
  if (window.lucide) window.lucide.createIcons();
}

async function loadAdminFoods() {
  const search = document.getElementById("adminSearch")?.value.trim();
  const params = new URLSearchParams({ include_inactive: "true" });
  if (search) params.set("q", search);
  adminFoods = await adminFetch(`/api/admin/foods?${params.toString()}`);
  renderAdminFoods();
  setupAdminMap();
}

async function saveAdminFood(event) {
  event.preventDefault();
  const payload = foodPayloadFromForm();
  const foodId = document.getElementById("adminFoodId").value;
  const url = foodId ? `/api/admin/foods/${foodId}` : "/api/admin/foods";
  const method = foodId ? "PUT" : "POST";
  const saved = await adminFetch(url, {
    method,
    body: JSON.stringify(payload),
  });
  showToast(`${saved.name} saved.`);
  resetAdminForm();
  await loadAdminFoods();
}

async function disableCurrentFood() {
  const foodId = document.getElementById("adminFoodId").value;
  if (!foodId) return;
  await adminFetch(`/api/admin/foods/${foodId}`, { method: "DELETE" });
  showToast("Food spot hidden.");
  resetAdminForm();
  await loadAdminFoods();
}

function setupAdmin() {
  document.getElementById("adminOpenLogin")?.addEventListener("click", () => {
    document.getElementById("openAuth")?.click();
  });
  document.getElementById("adminFoodForm")?.addEventListener("submit", (event) => {
    saveAdminFood(event).catch((error) => showToast(error.message));
  });
  document.getElementById("adminResetForm")?.addEventListener("click", resetAdminForm);
  document.getElementById("adminDisableFood")?.addEventListener("click", () => {
    disableCurrentFood().catch((error) => showToast(error.message));
  });
  document.getElementById("adminFoodList")?.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-admin-edit]");
    if (!editButton) return;
    const food = adminFoods.find((item) => String(item.id) === String(editButton.dataset.adminEdit));
    if (food) fillAdminForm(food);
  });
  document.getElementById("adminSearch")?.addEventListener("input", () => {
    window.clearTimeout(adminSearchTimer);
    adminSearchTimer = window.setTimeout(() => {
      loadAdminFoods().catch((error) => showToast(error.message));
    }, 180);
  });
}

window.addEventListener("saan:auth-changed", () => {
  ensureAdminAccess()
    .then((hasAccess) => {
      if (hasAccess) return loadAdminFoods();
      return null;
    })
    .catch((error) => showToast(error.message));
});

document.addEventListener("DOMContentLoaded", async () => {
  await window.SaanAuth?.ready;
  setupAdmin();
  const hasAccess = await ensureAdminAccess();
  if (hasAccess) loadAdminFoods().catch((error) => showToast(error.message));
});
