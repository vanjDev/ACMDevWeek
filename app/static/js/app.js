const state = {
  foods: [],
  showingBookmarks: false,
  visibleLimit: 12,
  weatherMode: "auto",
  isLoading: false,
  selectedStoreId: null,
  userLocation: null,
};

const DEFAULT_RADIUS = 1200;
const HISTORY_KEY = "saanFoodHistory";
const FAVORITES_KEY = "saanFavoriteTypes";
const STORE_BOOKMARKS_KEY = "bookmarkedStores";
const BUDGET_KEY = "saanWeeklyBudget";
const LOCATION_KEY = "saanPreciseLocation";

const categoryImages = {
  chicken: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=900&q=80",
  rice_meals: "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=80",
  street_food: "https://images.unsplash.com/photo-1577106263724-2c8e03bfe9cf?auto=format&fit=crop&w=900&q=80",
  dimsum: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=900&q=80",
  coffee_drinks: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80",
  burgers: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80",
  unli_rice: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=80",
  snacks: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&w=900&q=80",
};

const moodAliases = {
  tipid: { budget: "0-100", moods: ["quick_lunch"], sort: "price" },
  treat_myself: { budget: "100-500", moods: ["chill_hangout", "group_meal", "study_fuel"], sort: "rating" },
  nagmamadali: { moods: ["quick_lunch"], sort: "distance" },
  tambay_vibes: { moods: ["chill_hangout", "group_meal"] },
};

function selectedValues(filterName) {
  return [...document.querySelectorAll(`[data-filter="${filterName}"] .chip.active`)].map((chip) => chip.dataset.value);
}

function getJson(key, fallback) {
  try {
    const synced = window.SaanAuth?.getData?.() || {};
    if (Object.prototype.hasOwnProperty.call(synced, key)) return synced[key];
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function setJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  const data = { ...(window.SaanAuth?.getData?.() || {}) };
  data[key] = value;
  if (window.SaanAuth) SaanAuth.data = data;
  updateSaveStatus("Saving...");
  window.SaanAuth?.setData?.(data)
    .then(() => updateSaveStatus())
    .catch(() => showToast("Could not sync saved data. Keeping it on this device."));
}

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

function updateSaveStatus(label = null) {
  const status = document.getElementById("saveStatus");
  if (!status) return;
  status.textContent = label || (window.SaanAuth?.user ? "Syncing saves to your account" : "Guest saves stay on this device");
}

function getSavedLocation() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(LOCATION_KEY) || "null");
    if (!saved || !Number.isFinite(saved.lat) || !Number.isFinite(saved.lng)) return null;
    return saved;
  } catch {
    return null;
  }
}

function setUserLocation(location) {
  state.userLocation = location;
  window.SaanUserLocation = location;
  const status = document.getElementById("locationStatus");
  const button = document.getElementById("usePreciseLocation");
  if (location) {
    sessionStorage.setItem(LOCATION_KEY, JSON.stringify(location));
    if (status) status.textContent = `Using your live position within about ${Math.round(location.accuracy || 0)}m.`;
    if (button) {
      button.classList.add("active");
      button.innerHTML = `<i data-lucide="locate-fixed"></i> Using my location`;
    }
  } else {
    sessionStorage.removeItem(LOCATION_KEY);
    if (status) status.textContent = "Distances start from selected campus.";
    if (button) {
      button.classList.remove("active");
      button.innerHTML = `<i data-lucide="locate-fixed"></i> Use my location`;
    }
  }
  if (window.lucide) window.lucide.createIcons();
}

function updateBookmarkToggle() {
  const button = document.getElementById("showBookmarks");
  if (!button) return;
  button.classList.toggle("active", state.showingBookmarks);
  button.setAttribute("aria-pressed", String(state.showingBookmarks));
  button.innerHTML = state.showingBookmarks
    ? `<i data-lucide="list"></i> All Stores`
    : `<i data-lucide="heart"></i> Bookmarks`;
}

function toggleBookmarksView() {
  state.showingBookmarks = !state.showingBookmarks;
  state.visibleLimit = 12;
  updateBookmarkToggle();
  renderFoods(state.foods);
}

document.addEventListener("pointerdown", (event) => {
  const button = event.target.closest("#showBookmarks");
  if (!button) return;
  event.preventDefault();
  toggleBookmarksView();
});

document.addEventListener("keydown", (event) => {
  if (!event.target.closest("#showBookmarks") || !["Enter", " "].includes(event.key)) return;
  event.preventDefault();
  toggleBookmarksView();
});

function getHistory() {
  return getJson(HISTORY_KEY, []);
}

function saveHistory(history) {
  setJson(HISTORY_KEY, history.slice(0, 30));
  renderHabitStrip();
}

function getBudgetState() {
  return getJson(BUDGET_KEY, { weekly: "", spent: "" });
}

function setBudgetState() {
  setJson(BUDGET_KEY, {
    weekly: document.getElementById("weeklyBudget").value,
    spent: document.getElementById("weeklySpent").value,
  });
  updateBudgetInsight();
}

function getBookmarks() {
  const raw = window.SaanAuth ? window.SaanAuth.getBookmarks() : JSON.parse(localStorage.getItem("saanBookmarks") || "[]");
  return [...new Set((raw || []).map((id) => Number(id)).filter(Number.isFinite))];
}

async function setBookmarks(ids) {
  const normalized = [...new Set((ids || []).map((id) => Number(id)).filter(Number.isFinite))];
  if (window.SaanAuth) {
    await window.SaanAuth.setBookmarks(normalized);
    return;
  }
  localStorage.setItem("saanBookmarks", JSON.stringify(normalized));
}

function getStoreBookmarks() {
  const data = window.SaanAuth ? window.SaanAuth.getData() : getJson("saanUserData", {});
  return [...new Set((data?.[STORE_BOOKMARKS_KEY] || []).map((id) => String(id)).filter(Boolean))];
}

async function setStoreBookmarks(ids) {
  const normalized = [...new Set((ids || []).map((id) => String(id)).filter(Boolean))];
  const data = window.SaanAuth ? window.SaanAuth.getData() : getJson("saanUserData", {});
  const next = { ...(data || {}), [STORE_BOOKMARKS_KEY]: normalized };
  if (window.SaanAuth) {
    await window.SaanAuth.setData(next);
    return;
  }
  setJson("saanUserData", next);
}

function antiRepeatIds() {
  if (!document.getElementById("antiRepeat")?.checked) return [];
  return getHistory().slice(0, 4).map((item) => item.id);
}

function effectiveMoodValues() {
  const selected = selectedValues("mood");
  const mapped = selected.flatMap((value) => moodAliases[value]?.moods || [value]);
  return [...new Set(mapped)];
}

function buildParams() {
  const params = new URLSearchParams();
  const budget = document.getElementById("budget").value;
  const area = document.getElementById("area").value;
  const q = document.getElementById("foodSearch").value.trim();
  const dining = selectedValues("dining")[0];
  const features = selectedValues("feature");
  const weather = state.weatherMode || document.getElementById("weather").value;
  const antiRepeat = antiRepeatIds();
  const timeMax = document.getElementById("timeAvailable").value;
  const mealMinutes = document.getElementById("mealMinutes").value;

  params.set("campus", document.getElementById("campus").value);
  params.set("radius", String(DEFAULT_RADIUS));
  params.set("sort", document.getElementById("sort").value);
  params.set("limit", "250");
  if (state.userLocation) {
    params.set("user_lat", state.userLocation.lat.toFixed(7));
    params.set("user_lng", state.userLocation.lng.toFixed(7));
  }

  if (q) params.set("q", q);
  if (budget) {
    const [min, max] = budget.split("-");
    params.set("budget_min", min);
    params.set("budget_max", max);
  }
  if (area && area !== "all") params.set("area", area);
  if (dining) params.set("dining", dining);
  if (features.length) params.set("feature", features.join(","));
  if (weather && weather !== "any") params.set("weather", weather);
  if (antiRepeat.length) params.set("avoid_ids", antiRepeat.join(","));
  if (timeMax) params.set("time_max", timeMax);
  if (mealMinutes) params.set("meal_minutes", mealMinutes);

  const categories = selectedValues("category");
  const moods = effectiveMoodValues();
  const dishes = selectedValues("dish");
  if (categories.length) params.set("category", categories.join(","));
  if (moods.length) params.set("mood", moods.join(","));
  if (dishes.length) params.set("dish", dishes.join(","));

  return params;
}

function formatLabel(value) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function categoryLabel(value) {
  const labels = {
    chicken: "Chicken",
    rice_meals: "Rice Meal",
    street_food: "Street Food",
    dimsum: "Dimsum",
    coffee_drinks: "Drinks",
    burgers: "Burger",
    unli_rice: "Unli Rice",
    snacks: "Snack",
  };
  return labels[value] || formatLabel(value);
}

function storeIdFor(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function groupFoodsByStore(foods) {
  const grouped = new Map();
  foods.forEach((food) => {
    const id = storeIdFor(food.restaurant);
    if (!grouped.has(id)) {
      grouped.set(id, {
        id,
        name: food.restaurant,
        restaurant: food.restaurant,
        menu: [],
        latitude: food.latitude,
        longitude: food.longitude,
        area: food.area,
        distance_m: food.distance_m,
        walking_minutes: food.walking_minutes,
        price_min: food.price_min,
        price_max: food.price_max,
        rating: food.rating,
        category: food.category,
        mood: food.mood,
        frames: [],
        feature_tags: [],
        diet_tags: [],
        weather_tags: [],
        shareable: false,
        image_url: food.image_url,
      });
    }

    const store = grouped.get(id);
    store.menu.push(food);
    store.price_min = Math.min(store.price_min, food.price_min);
    store.price_max = Math.max(store.price_max, food.price_max);
    store.rating = Math.max(store.rating, food.rating);
    if ((food.distance_m || 0) < (store.distance_m || Infinity)) {
      store.latitude = food.latitude;
      store.longitude = food.longitude;
      store.area = food.area;
      store.distance_m = food.distance_m;
      store.walking_minutes = food.walking_minutes;
    }
    store.frames = [...new Set([...store.frames, ...(food.frames || [])])].slice(0, 5);
    store.feature_tags = [...new Set([...store.feature_tags, ...(food.feature_tags || [])])];
    store.diet_tags = [...new Set([...store.diet_tags, ...(food.diet_tags || [])])];
    store.weather_tags = [...new Set([...store.weather_tags, ...(food.weather_tags || [])])];
    store.shareable = store.shareable || food.shareable;
  });

  return [...grouped.values()].map((store) => {
    store.menu.sort((a, b) => a.price_min - b.price_min || b.rating - a.rating);
    return store;
  });
}

function averagePrice(food) {
  return Math.round((food.price_min + food.price_max) / 2);
}

function budgetNote(food) {
  const weekly = Number(document.getElementById("weeklyBudget")?.value || 0);
  const spent = Number(document.getElementById("weeklySpent")?.value || 0);
  if (!weekly) return "";
  const remaining = Math.max(0, weekly - spent);
  const after = remaining - averagePrice(food);
  if (after < 0) return "Over weekly budget";
  if (after < 100) return `PHP ${after} left after this`;
  return `Leaves PHP ${after}`;
}

function foodFrames(food) {
  const frames = [...(food.frames || [])];
  if (getBookmarks().includes(food.id)) frames.unshift("Favorite");
  if (antiRepeatIds().includes(food.id)) frames.unshift("Recent");
  const note = budgetNote(food);
  if (note) frames.push(note);
  return [...new Set(frames)].slice(0, 5);
}

function storeFrames(store) {
  const frames = [...(store.frames || [])];
  if (getStoreBookmarks().includes(store.id)) frames.unshift("Favorite restaurant");
  if (store.menu.some((food) => getBookmarks().includes(food.id))) frames.unshift("Has saved item");
  if (store.menu.some((food) => antiRepeatIds().includes(food.id))) frames.unshift("Recently tried");
  if (store.feature_tags?.includes("open_late")) frames.push("Open late");
  if (store.feature_tags?.includes("aircon")) frames.push("Aircon");
  return [...new Set(frames)].slice(0, 5);
}

function foodImageFor(food) {
  return food.image_url || categoryImages[food.category] || categoryImages.snacks;
}

function menuItemTemplate(food) {
  const active = getBookmarks().includes(food.id);
  const eatenToday = getHistory().some((item) => item.id === food.id && item.date === new Date().toISOString().slice(0, 10));
  return `
    <li class="menu-item" data-menu-food-id="${food.id}">
      <div class="menu-copy">
        <strong>${food.name}</strong>
        <p>${food.description}</p>
      </div>
      <div class="menu-controls">
        <span>PHP ${food.price_min}-${food.price_max}</span>
        <button class="icon-button ate-button ${eatenToday ? "active" : ""}" type="button" data-ate="${food.id}" aria-label="${eatenToday ? "Logged" : "Log"} ${food.name}" aria-pressed="${eatenToday}" title="${eatenToday ? "Logged today" : "Log eaten"}">
          <i data-lucide="utensils"></i>
        </button>
        <button class="icon-button bookmark ${active ? "active" : ""}" type="button" data-bookmark="${food.id}" aria-label="${active ? "Remove bookmark for" : "Bookmark"} ${food.name}" aria-pressed="${active}" title="${active ? "Saved" : "Bookmark"}">
          <i data-lucide="heart"></i>
        </button>
      </div>
    </li>
  `;
}

function detailMenuItemTemplate(food) {
  const active = getBookmarks().includes(food.id);
  const eatenToday = getHistory().some((item) => item.id === food.id && item.date === new Date().toISOString().slice(0, 10));
  return `
    <article class="detail-menu-item" data-menu-food-id="${food.id}">
      <img src="${foodImageFor(food)}" alt="">
      <div class="detail-menu-copy">
        <div>
          <span>${categoryLabel(food.category)}</span>
          <strong>${food.name}</strong>
          <p>${food.description}</p>
        </div>
        <div class="detail-menu-meta">
          <span>PHP ${food.price_min}-${food.price_max}</span>
          <button class="icon-button ate-button ${eatenToday ? "active" : ""}" type="button" data-ate="${food.id}" aria-label="${eatenToday ? "Logged" : "Log"} ${food.name}" aria-pressed="${eatenToday}" title="${eatenToday ? "Logged today" : "Log eaten"}">
            <i data-lucide="utensils"></i>
          </button>
          <button class="icon-button bookmark ${active ? "active" : ""}" type="button" data-bookmark="${food.id}" aria-label="${active ? "Remove bookmark for" : "Bookmark"} ${food.name}" aria-pressed="${active}" title="${active ? "Saved" : "Bookmark"}">
            <i data-lucide="heart"></i>
          </button>
        </div>
      </div>
    </article>
  `;
}

function storeCardTemplate(store) {
  const bookmarks = getBookmarks();
  const hasSavedFood = store.menu.some((food) => bookmarks.includes(food.id));
  const storeSaved = getStoreBookmarks().includes(store.id);
  const image = foodImageFor(store);
  const frames = storeFrames(store);
  const isOpen = state.selectedStoreId === store.id;
  return `
    <article class="food-card store-card ${isOpen ? "open" : ""}" data-store-id="${store.id}">
      <div class="food-image">
        <img src="${image}" alt="">
        <span>${store.menu.length} items</span>
      </div>
      <div class="food-body">
        <div>
          <h3>${store.name}</h3>
          <p>${formatLabel(store.area)} - ${store.menu.map((food) => categoryLabel(food.category)).slice(0, 2).join(", ")}</p>
        </div>
        <div class="food-frames">
          ${frames.map((frame) => `<span>${frame}</span>`).join("")}
        </div>
        <div class="food-meta">
          <span><small>Menu</small>${store.menu.length} items</span>
          <span><small>Walk</small>${store.walking_minutes} min</span>
          <span><small>Rating</small>${store.rating.toFixed(1)}</span>
        </div>
        <div class="card-actions">
          <span class="pill">PHP ${store.price_min}-${store.price_max}</span>
          <button class="secondary-button compact-button" type="button" data-store-toggle="${store.id}" aria-expanded="${isOpen}" aria-label="${isOpen ? "Hide menu for" : "View menu for"} ${store.name}">
            <i data-lucide="${isOpen ? "panel-right-open" : "utensils"}"></i>
            ${isOpen ? "Viewing" : "View menu"}
          </button>
          <button class="store-save-dot ${storeSaved ? "active" : ""}" type="button" data-store-bookmark="${store.id}" title="${storeSaved ? "Saved restaurant" : "Save restaurant"}" aria-label="${storeSaved ? "Remove restaurant bookmark for" : "Bookmark restaurant"} ${store.name}" aria-pressed="${storeSaved}">
            <i data-lucide="heart"></i>
          </button>
        </div>
        ${hasSavedFood ? `<p class="store-saved-note">Has saved food item</p>` : ""}
      </div>
    </article>
  `;
}

function menuDetailTemplate(store) {
  if (!store) return "";

  const storeSaved = getStoreBookmarks().includes(store.id);
  return `
    <div class="menu-detail-header">
      <img src="${foodImageFor(store)}" alt="">
      <div>
        <span>${formatLabel(store.area)}</span>
        <strong>${store.name}</strong>
        <p>${store.menu.length} menu items - PHP ${store.price_min}-${store.price_max} - ${store.walking_minutes} min walk</p>
      </div>
      <button class="store-save-dot ${storeSaved ? "active" : ""}" type="button" data-store-bookmark="${store.id}" title="${storeSaved ? "Saved restaurant" : "Save restaurant"}" aria-label="${storeSaved ? "Remove restaurant bookmark for" : "Bookmark restaurant"} ${store.name}" aria-pressed="${storeSaved}">
        <i data-lucide="heart"></i>
      </button>
    </div>
    <div class="detail-menu-list">
      ${store.menu.map(detailMenuItemTemplate).join("")}
    </div>
  `;
}

function renderMenuDetail(stores) {
  const detail = document.getElementById("menuDetail");
  if (!detail) return;
  const selected = stores.find((store) => store.id === state.selectedStoreId);
  detail.hidden = !selected;
  detail.innerHTML = menuDetailTemplate(selected);
}

function focusMenuDetail() {
  if (window.innerWidth > 1100) return;
  document.getElementById("menuDetail")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function applyClientRanking(foods) {
  const favorites = getJson(FAVORITES_KEY, []);
  const selectedMoods = selectedValues("mood");
  const hotMood = selectedMoods.includes("tipid");
  const treatMood = selectedMoods.includes("treat_myself");
  const rushMood = selectedMoods.includes("nagmamadali");
  const historyIds = antiRepeatIds();

  return [...foods].sort((a, b) => {
    const score = (food) => {
      let total = food.rating * 8 - (food.walking_minutes || 0);
      if (favorites.includes(food.category)) total += 12;
      if (hotMood) total -= food.price_max / 16;
      if (treatMood) total += food.price_min >= 100 ? 8 : 0;
      if (rushMood) total -= (food.walking_minutes || 0) * 2;
      if (historyIds.includes(food.id)) total -= 100;
      return total;
    };
    return score(b) - score(a);
  });
}

function renderFoods(foods) {
  const results = document.getElementById("results");
  if (state.isLoading) {
    results.innerHTML = Array.from({ length: 6 }, () => `<div class="food-card skeleton-card"></div>`).join("");
    document.getElementById("resultCount").textContent = "Loading...";
    return;
  }

  const ranked = applyClientRanking(foods);
  const foodBookmarks = getBookmarks();
  const storeBookmarks = getStoreBookmarks();
  const visible = state.showingBookmarks
    ? ranked.filter((food) => foodBookmarks.includes(food.id) || storeBookmarks.includes(storeIdFor(food.restaurant)))
    : ranked;
  const stores = groupFoodsByStore(visible);
  const paged = stores.slice(0, state.visibleLimit);

  results.innerHTML = paged.length
    ? paged.map(storeCardTemplate).join("")
    : `<div class="pick-result"><h2>No matches yet</h2><p>Adjust the filters, time window, budget, or anti-repeat setting.</p></div>`;
  renderMenuDetail(stores);

  document.getElementById("resultCount").textContent = state.showingBookmarks
    ? `${Math.min(state.visibleLimit, stores.length)} of ${stores.length} saved store${stores.length === 1 ? "" : "s"}`
    : `${Math.min(state.visibleLimit, stores.length)} of ${stores.length} store${stores.length === 1 ? "" : "s"}`;
  updateBookmarkToggle();
  const loadMore = document.getElementById("loadMore");
  loadMore.hidden = state.visibleLimit >= stores.length;
  if (window.lucide) window.lucide.createIcons();
  updateMap(paged, document.getElementById("campus").value, DEFAULT_RADIUS);
  if (state.selectedStoreId) window.selectFoodOnMap?.(state.selectedStoreId, false);
  updateBudgetInsight(paged[0]?.menu?.[0]);
}

async function loadFoods() {
  const params = buildParams();
  state.isLoading = true;
  renderFoods(state.foods);
  try {
    const response = await fetch(`/api/foods?${params.toString()}`);
    if (!response.ok) throw new Error("Food list failed to load.");
    state.foods = await response.json();
  } catch {
    showToast("Could not load food spots. Check the server and try again.");
  } finally {
    state.isLoading = false;
    renderFoods(state.foods);
  }
}

function logFood(food) {
  const today = new Date().toISOString().slice(0, 10);
  const entry = {
    id: food.id,
    name: food.name,
    restaurant: food.restaurant,
    price: averagePrice(food),
    date: today,
  };
  const history = [entry, ...getHistory().filter((item) => item.id !== food.id || item.date !== today)];
  saveHistory(history);

  const spentInput = document.getElementById("weeklySpent");
  if (spentInput) {
    spentInput.value = String(Number(spentInput.value || 0) + entry.price);
    setBudgetState();
  }
  renderFoods(state.foods);
}

function streakDays() {
  const dates = [...new Set(getHistory().map((item) => item.date))].sort().reverse();
  let streak = 0;
  const cursor = new Date();
  for (const date of dates) {
    const expected = cursor.toISOString().slice(0, 10);
    if (date !== expected) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderHabitStrip() {
  const history = getHistory();
  document.getElementById("streakCount").textContent = `${streakDays()} day${streakDays() === 1 ? "" : "s"}`;
  document.getElementById("lastAte").textContent = history[0] ? `${history[0].name} at ${history[0].restaurant}` : "Nothing logged yet";
  updateSaveStatus();
}

function updateBudgetInsight(food = null) {
  const insight = document.getElementById("budgetInsight");
  if (!insight) return;
  const weekly = Number(document.getElementById("weeklyBudget").value || 0);
  const spent = Number(document.getElementById("weeklySpent").value || 0);
  if (!weekly) {
    insight.textContent = "Set a weekly budget to see smarter spending notes.";
    return;
  }
  const remaining = Math.max(0, weekly - spent);
  if (!food) {
    insight.textContent = `You have PHP ${remaining} left this week.`;
    return;
  }
  const after = remaining - averagePrice(food);
  insight.textContent = after < 0
    ? `${food.name} would put you over budget. Try Tipid or under PHP 100.`
    : `${food.name} leaves about PHP ${after} for the rest of the week.`;
}

function restorePreferences() {
  const budget = getBudgetState();
  document.getElementById("weeklyBudget").value = budget.weekly || "";
  document.getElementById("weeklySpent").value = budget.spent || "";
  document.getElementById("timeAvailable").value = getJson("saanTimeAvailable", "");
  document.getElementById("mealMinutes").value = getJson("saanMealMinutes", "20");
  getJson(FAVORITES_KEY, []).forEach((category) => {
    document.querySelector(`[data-filter="category"] [data-value="${category}"]`)?.classList.add("active");
  });
}

function setupFilters() {
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const group = chip.closest("[data-filter]");
      if (group?.dataset.filter === "dining") {
        group.querySelectorAll(".chip.active").forEach((item) => item.classList.remove("active"));
      }
      chip.classList.toggle("active");

      const alias = moodAliases[chip.dataset.value];
      if (alias?.budget) document.getElementById("budget").value = alias.budget;
      if (alias?.sort) document.getElementById("sort").value = alias.sort;

      state.showingBookmarks = false;
      state.visibleLimit = 12;
      loadFoods();
    });
  });

  ["campus", "budget", "area", "sort", "weather", "antiRepeat", "timeAvailable", "mealMinutes"].forEach((id) => {
    document.getElementById(id).addEventListener("change", () => {
      state.weatherMode = document.getElementById("weather").value;
      if (id === "timeAvailable") setJson("saanTimeAvailable", document.getElementById("timeAvailable").value);
      if (id === "mealMinutes") setJson("saanMealMinutes", document.getElementById("mealMinutes").value);
      state.showingBookmarks = false;
      state.visibleLimit = 12;
      loadFoods();
    });
  });

  ["weeklyBudget", "weeklySpent"].forEach((id) => {
    document.getElementById(id).addEventListener("input", setBudgetState);
  });

  let searchTimer;
  document.getElementById("foodSearch").addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      state.showingBookmarks = false;
      state.visibleLimit = 12;
      loadFoods();
    }, 220);
  });

  document.getElementById("resetFilters").addEventListener("click", () => {
    document.getElementById("filters").reset();
    document.querySelectorAll(".chip.active").forEach((chip) => chip.classList.remove("active"));
    state.weatherMode = "auto";
    state.showingBookmarks = false;
    state.visibleLimit = 12;
    loadFoods();
  });

  document.getElementById("saveFavoriteTypes").addEventListener("click", () => {
    setJson(FAVORITES_KEY, selectedValues("category"));
    renderFoods(state.foods);
  });

  document.getElementById("loadMore").addEventListener("click", () => {
    state.visibleLimit += 12;
    renderFoods(state.foods);
  });

  document.getElementById("clearHistory").addEventListener("click", () => {
    const hasHistory = getHistory().length > 0;
    if (!hasHistory) {
      showToast("No food history to clear yet.");
      return;
    }
    const confirmed = window.confirm("Clear your food history? This will reset your streak and last eaten record.");
    if (!confirmed) return;
    saveHistory([]);
    renderFoods(state.foods);
    showToast("Food history cleared.");
  });

  document.getElementById("scrollToMap").addEventListener("click", () => {
    document.getElementById("map")?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  document.getElementById("heroPickForMe")?.addEventListener("click", () => {
    document.getElementById("pickForMe")?.click();
    document.getElementById("pickResult")?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  document.getElementById("usePreciseLocation")?.addEventListener("click", () => {
    if (state.userLocation) {
      setUserLocation(null);
      showToast("Using selected campus for distances.");
      loadFoods();
      return;
    }
    if (!navigator.geolocation) {
      showToast("Precise location is not available in this browser.");
      return;
    }
    const button = document.getElementById("usePreciseLocation");
    const status = document.getElementById("locationStatus");
    if (button) button.innerHTML = `<i data-lucide="loader-circle"></i> Locating...`;
    if (status) status.textContent = "Asking your browser for precise location...";
    if (window.lucide) window.lucide.createIcons();
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        state.visibleLimit = 12;
        showToast("Using your precise location for walk times.");
        loadFoods();
      },
      () => {
        setUserLocation(null);
        showToast("Location was not allowed. Using selected campus instead.");
        loadFoods();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });

  document.getElementById("results").addEventListener("click", async (event) => {
    const bookmarkButton = event.target.closest("[data-bookmark]");
    const storeBookmarkButton = event.target.closest("[data-store-bookmark]");
    const ateButton = event.target.closest("[data-ate]");
    const toggleButton = event.target.closest("[data-store-toggle]");
    const card = event.target.closest("[data-store-id]");
    if (bookmarkButton) {
      const id = Number(bookmarkButton.dataset.bookmark);
      if (!Number.isFinite(id)) return;
      const bookmarks = getBookmarks();
      const next = bookmarks.includes(id) ? bookmarks.filter((item) => item !== id) : [...bookmarks, id];
      await setBookmarks(next);
      showToast(next.includes(id) ? "Saved to bookmarks." : "Removed from bookmarks.");
      renderFoods(state.foods);
      return;
    }
    if (storeBookmarkButton) {
      const id = String(storeBookmarkButton.dataset.storeBookmark || "");
      if (!id) return;
      const bookmarks = getStoreBookmarks();
      const next = bookmarks.includes(id) ? bookmarks.filter((item) => item !== id) : [...bookmarks, id];
      await setStoreBookmarks(next);
      showToast(next.includes(id) ? "Saved restaurant." : "Removed restaurant.");
      renderFoods(state.foods);
      return;
    }
    if (toggleButton) {
      state.selectedStoreId = toggleButton.dataset.storeToggle;
      renderFoods(state.foods);
      window.selectFoodOnMap?.(toggleButton.dataset.storeToggle, false);
      focusMenuDetail();
      return;
    }
    if (ateButton) {
      const food = state.foods.find((item) => item.id === Number(ateButton.dataset.ate));
      if (food) logFood(food);
    } else if (card) {
      window.selectFoodOnMap?.(card.dataset.storeId, false);
    }
  });

  document.getElementById("menuDetail")?.addEventListener("click", async (event) => {
    const bookmarkButton = event.target.closest("[data-bookmark]");
    const storeBookmarkButton = event.target.closest("[data-store-bookmark]");
    const ateButton = event.target.closest("[data-ate]");
    if (bookmarkButton) {
      const id = Number(bookmarkButton.dataset.bookmark);
      if (!Number.isFinite(id)) return;
      const bookmarks = getBookmarks();
      const next = bookmarks.includes(id) ? bookmarks.filter((item) => item !== id) : [...bookmarks, id];
      await setBookmarks(next);
      showToast(next.includes(id) ? "Saved food." : "Removed food.");
      renderFoods(state.foods);
      return;
    }
    if (storeBookmarkButton) {
      const id = String(storeBookmarkButton.dataset.storeBookmark || "");
      if (!id) return;
      const bookmarks = getStoreBookmarks();
      const next = bookmarks.includes(id) ? bookmarks.filter((item) => item !== id) : [...bookmarks, id];
      await setStoreBookmarks(next);
      showToast(next.includes(id) ? "Saved restaurant." : "Removed restaurant.");
      renderFoods(state.foods);
      return;
    }
    if (ateButton) {
      const food = state.foods.find((item) => item.id === Number(ateButton.dataset.ate));
      if (food) logFood(food);
    }
  });
}

async function detectWeather() {
  const select = document.getElementById("weather");
  if (!select || select.value !== "auto") return;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=14.6042&longitude=120.9882&current=temperature_2m,precipitation,weather_code", {
      signal: controller.signal,
    });
    const data = await response.json();
    const current = data.current || {};
    if (Number(current.precipitation || 0) > 0 || Number(current.weather_code || 0) >= 51) {
      state.weatherMode = "rainy";
    } else if (Number(current.temperature_2m || 0) >= 30) {
      state.weatherMode = "hot";
    } else {
      state.weatherMode = "cool";
    }
  } catch {
    state.weatherMode = "any";
  } finally {
    window.clearTimeout(timeout);
  }
}

window.addEventListener("saan:auth-changed", () => {
  restorePreferences();
  renderHabitStrip();
  renderFoods(state.foods);
});

window.addEventListener("saan:store-open", (event) => {
  state.selectedStoreId = event.detail?.storeId || null;
  renderFoods(state.foods);
  window.selectFoodOnMap?.(state.selectedStoreId, true);
});

document.addEventListener("DOMContentLoaded", async () => {
  await window.SaanAuth?.ready;
  setUserLocation(getSavedLocation());
  restorePreferences();
  renderHabitStrip();
  updateBudgetInsight();
  setupFilters();
  await detectWeather();
  loadFoods();
});
