let adminFoods = [];
let adminSearchTimer = null;

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
  document.getElementById("adminFoodForm").scrollIntoView({ behavior: "smooth", block: "start" });
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

document.addEventListener("DOMContentLoaded", () => {
  setupAdmin();
  loadAdminFoods().catch((error) => showToast(error.message));
});
