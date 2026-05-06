let adminFoods = [];
let adminStores = [];
let adminSearchTimer = null;
let adminSelectedStoreId = null;
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

async function adminUploadImage(file) {
  const formData = new FormData();
  formData.append("image", file);
  const response = await fetch("/api/admin/uploads/image", {
    method: "POST",
    body: formData,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || "Image upload failed.");
  return data;
}

function peso(amount) {
  return `₱${Number(amount || 0).toLocaleString("en-PH")}`;
}

function formatLabel(value) {
  return String(value || "").replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function selectedStore() {
  return adminStores.find((store) => String(store.id) === String(adminSelectedStoreId)) || null;
}

function foodsForSelectedStore() {
  const store = selectedStore();
  if (!store) return [];
  return adminFoods.filter((food) => String(food.store_id) === String(store.id) || food.restaurant === store.name);
}

function setImagePreview(id, url) {
  const preview = document.getElementById(id);
  if (!preview) return;
  preview.hidden = !url;
  preview.src = url || "";
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
    setAdminAccessState("login", "Sign in with an admin email to edit store branches, images, hours, and menu items.");
    return false;
  }
}

function storePayloadFromForm() {
  return {
    name: document.getElementById("adminStoreName").value.trim(),
    area: document.getElementById("adminStoreArea").value,
    rating: Number(document.getElementById("adminStoreRating").value || 4),
    latitude: Number(document.getElementById("adminStoreLatitude").value),
    longitude: Number(document.getElementById("adminStoreLongitude").value),
    image_url: document.getElementById("adminStoreImageUrl").value.trim() || null,
    opens_at: document.getElementById("adminStoreOpensAt").value || "08:00",
    closes_at: document.getElementById("adminStoreClosesAt").value || "21:00",
    is_active: document.getElementById("adminStoreIsActive").checked,
  };
}

function foodPayloadFromForm() {
  const store = selectedStore();
  if (!store) throw new Error("Choose or save a store before adding menu items.");
  return {
    store_id: store.id,
    restaurant: store.name,
    name: document.getElementById("adminName").value.trim(),
    price_min: Number(document.getElementById("adminPriceMin").value || 0),
    price_max: Number(document.getElementById("adminPriceMax").value || 0),
    category: document.getElementById("adminCategory").value,
    mood: document.getElementById("adminMood").value,
    area: store.area,
    latitude: Number(store.latitude),
    longitude: Number(store.longitude),
    image_url: document.getElementById("adminImageUrl").value.trim() || null,
    opens_at: store.opens_at || "08:00",
    closes_at: store.closes_at || "21:00",
    description: document.getElementById("adminDescription").value.trim(),
    is_active: document.getElementById("adminIsActive").checked,
  };
}

function resetStoreForm() {
  document.getElementById("adminStoreForm").reset();
  document.getElementById("adminStoreId").value = "";
  document.getElementById("adminStoreOpensAt").value = "08:00";
  document.getElementById("adminStoreClosesAt").value = "21:00";
  document.getElementById("adminStoreRating").value = "4.0";
  document.getElementById("adminStoreIsActive").checked = true;
  document.getElementById("adminStoreFormMode").textContent = "New store";
  document.getElementById("adminStoreFormTitle").textContent = "Add a branch";
  document.getElementById("adminDisableStore").hidden = true;
  document.getElementById("adminMapHint").textContent = "Click the map once. Menu items will use this store location automatically.";
  setImagePreview("adminStoreImagePreview", "");
  setMapPosition(null);
  adminSelectedStoreId = null;
  renderAdminStores();
  renderAdminMenu();
}

function fillStoreForm(store) {
  adminSelectedStoreId = store.id;
  document.getElementById("adminStoreId").value = store.id;
  document.getElementById("adminStoreName").value = store.name;
  document.getElementById("adminStoreArea").value = store.area;
  document.getElementById("adminStoreRating").value = store.rating || 4;
  document.getElementById("adminStoreLatitude").value = store.latitude;
  document.getElementById("adminStoreLongitude").value = store.longitude;
  document.getElementById("adminStoreImageUrl").value = store.image_url || "";
  document.getElementById("adminStoreOpensAt").value = store.opens_at || "08:00";
  document.getElementById("adminStoreClosesAt").value = store.closes_at || "21:00";
  document.getElementById("adminStoreIsActive").checked = store.is_active;
  document.getElementById("adminStoreFormMode").textContent = `Branch #${store.id}`;
  document.getElementById("adminStoreFormTitle").textContent = store.name;
  document.getElementById("adminDisableStore").hidden = false;
  document.getElementById("adminMapHint").textContent = `${store.name} location. Menu items inherit this pin.`;
  setImagePreview("adminStoreImagePreview", store.image_url || "");
  setMapPosition({ lat: store.latitude, lng: store.longitude });
  renderAdminStores();
  renderAdminMenu();
}

function resetFoodForm() {
  const form = document.getElementById("adminFoodForm");
  form.reset();
  document.getElementById("adminFoodId").value = "";
  document.getElementById("adminIsActive").checked = true;
  document.getElementById("adminFormMode").textContent = "New menu item";
  document.getElementById("adminFormTitle").textContent = "Add item";
  document.getElementById("adminDisableFood").hidden = true;
  document.getElementById("adminImageHint").textContent = "Leave blank to use the store photo.";
  setImagePreview("adminImagePreview", "");
}

function fillFoodForm(food) {
  document.getElementById("adminFoodId").value = food.id;
  document.getElementById("adminName").value = food.name;
  document.getElementById("adminPriceMin").value = food.price_min;
  document.getElementById("adminPriceMax").value = food.price_max;
  document.getElementById("adminCategory").value = food.category;
  document.getElementById("adminMood").value = food.mood;
  document.getElementById("adminImageUrl").value = food.image_url || "";
  document.getElementById("adminImageHint").textContent = food.image_url ? "Current image is saved with this item." : "Leave blank to use the store photo.";
  setImagePreview("adminImagePreview", food.image_url || "");
  document.getElementById("adminDescription").value = food.description;
  document.getElementById("adminIsActive").checked = food.is_active;
  document.getElementById("adminFormMode").textContent = `Editing #${food.id}`;
  document.getElementById("adminFormTitle").textContent = food.name;
  document.getElementById("adminDisableFood").hidden = false;
  document.getElementById("adminFoodForm").hidden = false;
  document.getElementById("adminFoodForm").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function setMapPosition(position) {
  if (!adminMap || !window.L) return;
  if (!position || !Number.isFinite(Number(position.lat)) || !Number.isFinite(Number(position.lng))) {
    if (adminMapMarker) {
      adminMap.removeLayer(adminMapMarker);
      adminMapMarker = null;
    }
    return;
  }
  const latLng = [Number(position.lat), Number(position.lng)];
  if (!adminMapMarker) {
    adminMapMarker = L.marker(latLng).addTo(adminMap);
  } else {
    adminMapMarker.setLatLng(latLng);
  }
  adminMap.setView(latLng, Math.max(adminMap.getZoom(), 17));
}

function setFormCoordinates(lat, lng) {
  document.getElementById("adminStoreLatitude").value = Number(lat).toFixed(6);
  document.getElementById("adminStoreLongitude").value = Number(lng).toFixed(6);
  document.getElementById("adminMapHint").textContent = `Pinned ${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)} for this store.`;
  setMapPosition({ lat, lng });
}

function setupAdminMap() {
  const mapElement = document.getElementById("adminMap");
  if (!mapElement || !window.L || adminMap) return;
  adminMap = L.map(mapElement, { scrollWheelZoom: false }).setView([14.6042, 120.9888], 17);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  }).addTo(adminMap);
  adminMap.on("click", (event) => {
    setFormCoordinates(event.latlng.lat, event.latlng.lng);
  });
  setTimeout(() => adminMap.invalidateSize(), 0);
}

function adminStoreCard(store) {
  const menuCount = adminFoods.filter((food) => String(food.store_id) === String(store.id) || food.restaurant === store.name).length;
  return `
    <button class="admin-store-card ${String(adminSelectedStoreId) === String(store.id) ? "active" : ""} ${store.is_active ? "" : "is-inactive"}" type="button" data-admin-store="${store.id}">
      <img src="${store.image_url || "/static/img/saan-logo.svg"}" alt="">
      <span>
        <strong>${store.name}</strong>
        <small>${formatLabel(store.area)} - ${store.opens_at || "08:00"}-${store.closes_at || "21:00"}</small>
      </span>
      <b>${menuCount}</b>
    </button>
  `;
}

function renderAdminStores() {
  const list = document.getElementById("adminStoreList");
  const count = document.getElementById("adminStoreCount");
  if (!list || !count) return;
  const query = document.getElementById("adminSearch")?.value.trim().toLowerCase() || "";
  const stores = query
    ? adminStores.filter((store) => `${store.name} ${store.area}`.toLowerCase().includes(query))
    : adminStores;
  count.textContent = `${stores.length} store${stores.length === 1 ? "" : "s"}`;
  list.innerHTML = stores.length ? stores.map(adminStoreCard).join("") : `<p>No stores match that search.</p>`;
  if (window.lucide) window.lucide.createIcons();
}

function adminFoodRow(food) {
  return `
    <article class="admin-food-row ${food.is_active ? "" : "is-inactive"}" data-admin-food-id="${food.id}">
      <div>
        <strong>${food.name}</strong>
        <span>${formatLabel(food.category)} - ${formatLabel(food.mood)}</span>
      </div>
      <b>${peso(food.price_min)}-${peso(food.price_max)}</b>
      <small>${food.is_active ? "Active" : "Hidden"}</small>
      <button class="icon-button" type="button" data-admin-edit="${food.id}" aria-label="Edit ${food.name}" title="Edit">
        <i data-lucide="pencil"></i>
      </button>
    </article>
  `;
}

function renderAdminMenu() {
  const store = selectedStore();
  const menuForm = document.getElementById("adminFoodForm");
  const newButton = document.getElementById("adminNewMenuItem");
  const hint = document.getElementById("adminSelectedStoreHint");
  const count = document.getElementById("adminMenuCount");
  const list = document.getElementById("adminFoodList");
  if (!list || !count || !newButton) return;

  if (!store) {
    count.textContent = "Choose a store";
    newButton.disabled = true;
    if (hint) {
      hint.innerHTML = `<i data-lucide="store"></i> Select a store on the left. Items do not need coordinates because they inherit the store branch.`;
    }
    if (menuForm) menuForm.hidden = true;
    list.innerHTML = "";
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const foods = foodsForSelectedStore();
  count.textContent = `${foods.length} item${foods.length === 1 ? "" : "s"}`;
  newButton.disabled = false;
  if (hint) {
    hint.innerHTML = `
      <i data-lucide="map-pin"></i>
      <span><strong>${store.name}</strong> uses ${formatLabel(store.area)} at ${Number(store.latitude).toFixed(5)}, ${Number(store.longitude).toFixed(5)}. Menu items inherit this.</span>
    `;
  }
  if (menuForm && menuForm.hidden) resetFoodForm();
  list.innerHTML = foods.length ? foods.map(adminFoodRow).join("") : `<p>No menu items yet. Add the first one for this store.</p>`;
  if (window.lucide) window.lucide.createIcons();
}

async function loadAdminData() {
  const [stores, foods] = await Promise.all([
    adminFetch("/api/admin/stores?include_inactive=true"),
    adminFetch("/api/admin/foods?include_inactive=true"),
  ]);
  adminStores = stores;
  adminFoods = foods;
  if (adminSelectedStoreId && !adminStores.some((store) => String(store.id) === String(adminSelectedStoreId))) {
    adminSelectedStoreId = null;
  }
  renderAdminStores();
  renderAdminMenu();
  setupAdminMap();
}

async function saveAdminStore(event) {
  event.preventDefault();
  const storeId = document.getElementById("adminStoreId").value;
  const url = storeId ? `/api/admin/stores/${storeId}` : "/api/admin/stores";
  const method = storeId ? "PUT" : "POST";
  const saved = await adminFetch(url, {
    method,
    body: JSON.stringify(storePayloadFromForm()),
  });
  showToast(`${saved.name} saved.`);
  adminSelectedStoreId = saved.id;
  await loadAdminData();
  const store = adminStores.find((item) => String(item.id) === String(saved.id));
  if (store) fillStoreForm(store);
}

async function saveAdminFood(event) {
  event.preventDefault();
  const foodId = document.getElementById("adminFoodId").value;
  const url = foodId ? `/api/admin/foods/${foodId}` : "/api/admin/foods";
  const method = foodId ? "PUT" : "POST";
  const saved = await adminFetch(url, {
    method,
    body: JSON.stringify(foodPayloadFromForm()),
  });
  showToast(`${saved.name} saved.`);
  resetFoodForm();
  await loadAdminData();
  document.getElementById("adminFoodForm").hidden = true;
}

async function disableCurrentStore() {
  const storeId = document.getElementById("adminStoreId").value;
  if (!storeId) return;
  await adminFetch(`/api/admin/stores/${storeId}`, { method: "DELETE" });
  showToast("Store hidden with its menu items.");
  resetStoreForm();
  await loadAdminData();
}

async function disableCurrentFood() {
  const foodId = document.getElementById("adminFoodId").value;
  if (!foodId) return;
  await adminFetch(`/api/admin/foods/${foodId}`, { method: "DELETE" });
  showToast("Menu item hidden.");
  resetFoodForm();
  await loadAdminData();
  document.getElementById("adminFoodForm").hidden = true;
}

function setupImageUpload({ inputId, urlId, previewId, hintId, targetLabel }) {
  document.getElementById(urlId)?.addEventListener("input", (event) => {
    setImagePreview(previewId, event.target.value.trim());
  });
  document.getElementById(inputId)?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const hint = document.getElementById(hintId);
    if (hint) hint.textContent = `Uploading ${targetLabel} image...`;
    try {
      const upload = await adminUploadImage(file);
      document.getElementById(urlId).value = upload.image_url;
      setImagePreview(previewId, upload.image_url);
      if (hint) hint.textContent = `Uploaded ${upload.filename}. Save to keep it.`;
      showToast("Image uploaded.");
    } catch (error) {
      if (hint) hint.textContent = error.message;
      showToast(error.message);
    } finally {
      event.target.value = "";
    }
  });
}

function setupAdmin() {
  document.getElementById("adminOpenLogin")?.addEventListener("click", () => {
    document.getElementById("openAuth")?.click();
  });
  document.getElementById("adminNewStore")?.addEventListener("click", resetStoreForm);
  document.getElementById("adminResetStore")?.addEventListener("click", resetStoreForm);
  document.getElementById("adminStoreForm")?.addEventListener("submit", (event) => {
    saveAdminStore(event).catch((error) => showToast(error.message));
  });
  document.getElementById("adminFoodForm")?.addEventListener("submit", (event) => {
    saveAdminFood(event).catch((error) => showToast(error.message));
  });
  document.getElementById("adminResetForm")?.addEventListener("click", () => {
    resetFoodForm();
    document.getElementById("adminFoodForm").hidden = true;
  });
  document.getElementById("adminNewMenuItem")?.addEventListener("click", () => {
    resetFoodForm();
    document.getElementById("adminFoodForm").hidden = false;
    document.getElementById("adminName").focus();
  });
  document.getElementById("adminDisableStore")?.addEventListener("click", () => {
    disableCurrentStore().catch((error) => showToast(error.message));
  });
  document.getElementById("adminDisableFood")?.addEventListener("click", () => {
    disableCurrentFood().catch((error) => showToast(error.message));
  });
  document.getElementById("adminStoreList")?.addEventListener("click", (event) => {
    const card = event.target.closest("[data-admin-store]");
    if (!card) return;
    const store = adminStores.find((item) => String(item.id) === String(card.dataset.adminStore));
    if (store) fillStoreForm(store);
  });
  document.getElementById("adminFoodList")?.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-admin-edit]");
    if (!editButton) return;
    const food = adminFoods.find((item) => String(item.id) === String(editButton.dataset.adminEdit));
    if (food) fillFoodForm(food);
  });
  document.getElementById("adminSearch")?.addEventListener("input", () => {
    window.clearTimeout(adminSearchTimer);
    adminSearchTimer = window.setTimeout(renderAdminStores, 120);
  });
  ["adminStoreLatitude", "adminStoreLongitude"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => {
      const lat = Number(document.getElementById("adminStoreLatitude").value);
      const lng = Number(document.getElementById("adminStoreLongitude").value);
      setMapPosition({ lat, lng });
    });
  });
  setupImageUpload({
    inputId: "adminStoreImageUpload",
    urlId: "adminStoreImageUrl",
    previewId: "adminStoreImagePreview",
    hintId: "adminStoreImageHint",
    targetLabel: "store",
  });
  setupImageUpload({
    inputId: "adminImageUpload",
    urlId: "adminImageUrl",
    previewId: "adminImagePreview",
    hintId: "adminImageHint",
    targetLabel: "item",
  });
}

window.addEventListener("saan:auth-changed", () => {
  ensureAdminAccess()
    .then((hasAccess) => {
      if (hasAccess) return loadAdminData();
      return null;
    })
    .catch((error) => showToast(error.message));
});

document.addEventListener("DOMContentLoaded", async () => {
  await window.SaanAuth?.ready;
  setupAdmin();
  const hasAccess = await ensureAdminAccess();
  if (hasAccess) loadAdminData().catch((error) => showToast(error.message));
});
