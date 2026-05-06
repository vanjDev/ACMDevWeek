const state = {
  foods: [],
  showingBookmarks: false,
  visibleLimit: 12,
  weatherMode: "auto",
  isLoading: false,
  selectedStoreId: null,
  userLocation: null,
  publicStoreRatings: {},
  publicFoodRatings: {},
  ratingDraft: null,
};

const DEFAULT_RADIUS = 1200;
const HISTORY_KEY = "saanFoodHistory";
const FAVORITES_KEY = "saanFavoriteTypes";
const STORE_BOOKMARKS_KEY = "bookmarkedStores";
const BUDGET_KEY = "saanWeeklyBudget";
const LOCATION_KEY = "saanPreciseLocation";
const USER_STORE_RATINGS_KEY = "saanStoreRatings";
const USER_FOOD_RATINGS_KEY = "saanFoodRatings";

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

const restaurantImages = {
  "Mang Tootz Food House": "https://img02.restaurantguru.com/c205-Mang-Tootz-Foodhouse-Manila-meals-1.jpg",
  "Dimsum Treats": "https://cdn.draft143.com/static/lamona/nCwMrT0N76VjwQUPJajxoYuJ2tcCR5nmAxi1.dimsum_treats-featured.webp",
  "Obscure Cafe": "https://cdn.corner.inc/place-photo/ATKogpcEz_2cOa-ml4fZSr-yfhq1kSsOgGQbQhGPLH3kyLygWueD8rbFMS3hDq1x6U0JWMx5wBO9rx4n1XZAD_HpWyGNyCNyFvSQ8uXG6Omgu-jyp7T2Y93oJgwCA-QzgTR432zg0N1bYnOhrXyU4bxDF8SsHZh2WuEI9npPXcZjxNimec1uXkOFu_R3qkdJLBSy-NyK_GV5sKIgg8HVcNTbPMsvCf4sRfrSYyoGD0c9QsFYiD1cSEAXXepJXDNL1vwkucNAQqfcaMAU-93JabOjlUjWflfsUAzndo-mCEz37izNxNUn-XHvQ4YDCUVFfFkTgPIVKNLzkvmVOdBjA1dq2bvpxZ9C-rEnfy-MZZFVM_LGQU0IlqP-bEfIMGjfxt9pjmy3-V86Ly-E6eoU-FsKaa8zqe3ivjuoOlNjDSaXa-b291ncvfjqYDpShbNDJHC9qTXUkN1DwkauRkObKD3y3qlyjPD0pKs1FbUOiA7tdUfNB7cJtHL4sOC9iFgNYOk0Xqlw_pzQPRAIQa9bsSNbwTNOH9OkIYAEomhoDyU5bgV38wVnuXK4E6vhoQ12ef6Ym8uNZCVYCkF9-ZBU9m2xf2hEGmDk0eQogy44YybUuS-UoR_ba0e6tKU7TnTEaQv--ruDvTZs.jpeg",
  "Ate Rica's Bacsilog": "https://static.wixstatic.com/media/52e0bf_07f854d8165a4936b5794c55e3e4e1f6~mv2_d_1500_1500_s_2.jpg/v1/fit/w_2500,h_1330,al_c/52e0bf_07f854d8165a4936b5794c55e3e4e1f6~mv2_d_1500_1500_s_2.jpg",
  "Potato Corner": "https://potatocorner.com/wp-content/uploads/2026/04/BBQ-Mega-copy.png",
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

function setChipActive(chip, active) {
  chip.classList.toggle("active", active);
  chip.setAttribute("aria-pressed", String(active));
}

function updateFavoriteTypesButton() {
  const button = document.getElementById("saveFavoriteTypes");
  if (!button) return;
  const favorites = getJson(FAVORITES_KEY, []);
  const count = favorites.length;
  button.classList.toggle("active", count > 0);
  button.innerHTML = count
    ? `<i data-lucide="star"></i> ${count} favorite type${count === 1 ? "" : "s"} saved`
    : `<i data-lucide="star"></i> Save selected types`;
  if (window.lucide) window.lucide.createIcons();
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

function manilaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date).reduce((memo, part) => {
    memo[part.type] = part.value;
    return memo;
  }, {});
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

function formatManilaTime(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function formatStoredMealTime(time) {
  const [hourText, minuteText] = String(time || "").split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "";
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

function mealTimeLabel(item) {
  if (item.phTime) return formatStoredMealTime(item.phTime);
  if (item.loggedAt) return formatManilaTime(item.loggedAt);
  if (item.phDate || item.date) return item.phDate || item.date;
  return "Time unavailable";
}

function manilaWeekKey(dateText = manilaParts().date) {
  const [year, month, day] = String(dateText).split("-").map(Number);
  if (!year || !month || !day) return "";
  const cursor = new Date(Date.UTC(year, month - 1, day));
  const mondayOffset = (cursor.getUTCDay() + 6) % 7;
  cursor.setUTCDate(cursor.getUTCDate() - mondayOffset);
  return cursor.toISOString().slice(0, 10);
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
  setJson(HISTORY_KEY, history.slice(0, 60));
  renderHabitStrip();
  updateBudgetInsight();
}

function getBudgetState() {
  return getJson(BUDGET_KEY, { weekly: "" });
}

function setBudgetState() {
  const budgetInput = document.getElementById("weeklyBudget");
  if (!budgetInput) return;
  setJson(BUDGET_KEY, {
    weekly: budgetInput.value,
  });
  updateBudgetInsight();
}

function normalizeHistoryEntry(item) {
  const phDate = item.phDate || item.date || "";
  return {
    ...item,
    entryId: item.entryId || item.loggedAt || `${item.id}-${phDate}-${item.phTime || "00:00"}`,
    phDate,
    phTime: item.phTime || "",
    weekKey: item.weekKey || manilaWeekKey(phDate),
    price: Number(item.price || 0),
    note: item.note || "",
  };
}

function thisWeekHistory() {
  const currentWeek = manilaWeekKey();
  return getHistory().map(normalizeHistoryEntry).filter((item) => item.weekKey === currentWeek);
}

function todayHistory() {
  const today = manilaParts().date;
  return getHistory().map(normalizeHistoryEntry).filter((item) => item.phDate === today);
}

function dailySpentTotal() {
  return todayHistory().reduce((total, item) => total + Number(item.price || 0), 0);
}

function weeklySpentTotal() {
  return thisWeekHistory().reduce((total, item) => total + Number(item.price || 0), 0);
}

function latestFoodLog(foodId) {
  return getHistory()
    .map(normalizeHistoryEntry)
    .find((item) => item.id === Number(foodId));
}

function latestTodayFoodLog(foodId) {
  const today = manilaParts().date;
  const entry = latestFoodLog(foodId);
  return entry?.phDate === today ? entry : null;
}

function foodFromHistoryEntry(entry) {
  if (!entry) return null;
  return state.foods.find((item) => item.id === Number(entry.id)) || {
    id: entry.id,
    name: entry.name,
    restaurant: entry.restaurant,
    price_min: entry.price,
    price_max: entry.price,
    category: "snacks",
    description: entry.note || "Saved from your meal history.",
  };
}

function upsertHistoryEntry(entry) {
  const normalized = normalizeHistoryEntry(entry);
  const next = [
    normalized,
    ...getHistory()
      .map(normalizeHistoryEntry)
      .filter((item) => item.entryId !== normalized.entryId),
  ];
  saveHistory(next);
}

function removeHistoryEntry(entryId) {
  saveHistory(
    getHistory()
      .map(normalizeHistoryEntry)
      .filter((item) => item.entryId !== entryId),
  );
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

function getUserRatings(key) {
  const raw = getJson(key, {});
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}

function normalizedRatingEntry(value) {
  if (typeof value === "number" || typeof value === "string") {
    const score = Number(value);
    return Number.isFinite(score) && score >= 1 && score <= 5 ? { score, reason: "" } : { score: 0, reason: "" };
  }
  if (value && typeof value === "object") {
    const score = Number(value.score || value.rating || 0);
    return {
      score: Number.isFinite(score) && score >= 1 && score <= 5 ? score : 0,
      reason: String(value.reason || "").trim(),
      updatedAt: value.updatedAt || "",
    };
  }
  return { score: 0, reason: "" };
}

function getUserRatingEntry(key, id) {
  return normalizedRatingEntry(getUserRatings(key)[String(id)]);
}

function getUserStoreRatingEntry(storeId) {
  return getUserRatingEntry(USER_STORE_RATINGS_KEY, storeId);
}

function getUserFoodRatingEntry(foodId) {
  return getUserRatingEntry(USER_FOOD_RATINGS_KEY, foodId);
}

function getUserStoreRating(storeId) {
  return getUserStoreRatingEntry(storeId).score;
}

function getUserFoodRating(foodId) {
  return getUserFoodRatingEntry(foodId).score;
}

function setUserRating(key, id, rating, reason = "") {
  const normalizedRating = Number(rating);
  if (!id || !Number.isFinite(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) return;
  const ratings = {
    ...getUserRatings(key),
    [String(id)]: {
      score: normalizedRating,
      reason: String(reason || "").trim(),
      updatedAt: new Date().toISOString(),
    },
  };
  setJson(key, ratings);
}

function ratingReasonText(entry, fallback) {
  return entry.reason || fallback;
}

function publicRatingForStore(storeId) {
  return state.publicStoreRatings[String(storeId)] || null;
}

function publicRatingReason(storeId) {
  const summary = publicRatingForStore(storeId);
  return summary?.reasons?.[0]?.reason || "";
}

function publicRatingForFood(foodId) {
  return state.publicFoodRatings[String(foodId)] || null;
}

function publicFoodRatingReason(foodId) {
  const summary = publicRatingForFood(foodId);
  return summary?.reasons?.[0]?.reason || "";
}

function reviewsTemplate(summary, emptyText) {
  const reasons = summary?.reasons || [];
  return `
    <div class="review-list">
      <div class="review-list-heading">
        <span>Student reviews</span>
        <strong>${summary ? `${summary.average.toFixed(1)} from ${summary.count}` : "No reviews yet"}</strong>
      </div>
      ${reasons.length
        ? reasons.map((review) => `
          <article class="review-item">
            <b><i data-lucide="star"></i> ${review.score}/5</b>
            <p>${review.reason}</p>
          </article>
        `).join("")
        : `<p class="review-empty">${emptyText}</p>`}
    </div>
  `;
}

async function loadPublicStoreRatings() {
  try {
    const [storeResponse, foodResponse] = await Promise.all([
      fetch("/api/store-ratings"),
      fetch("/api/food-ratings"),
    ]);
    if (!storeResponse.ok || !foodResponse.ok) throw new Error("Ratings failed to load.");
    state.publicStoreRatings = await storeResponse.json();
    state.publicFoodRatings = await foodResponse.json();
  } catch {
    state.publicStoreRatings = {};
    state.publicFoodRatings = {};
  }
}

async function submitPublicStoreRating(store, rating, reason) {
  const response = await fetch("/api/store-ratings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      store_key: store.id,
      store_name: store.name,
      score: rating,
      reason,
    }),
  });
  if (!response.ok) throw new Error("Rating failed to save.");
  state.publicStoreRatings = {
    ...state.publicStoreRatings,
    [store.id]: await response.json(),
  };
}

async function submitPublicFoodRating(food, rating, reason) {
  const response = await fetch("/api/food-ratings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      food_id: food.id,
      food_name: food.name,
      restaurant: food.restaurant,
      score: rating,
      reason,
    }),
  });
  if (!response.ok) throw new Error("Rating failed to save.");
  state.publicFoodRatings = {
    ...state.publicFoodRatings,
    [food.id]: await response.json(),
  };
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
  const dining = selectedValues("dining");
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
  if (dining.length) params.set("dining", dining.join(","));
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

function timeToMinutes(value) {
  const [hourText, minuteText] = String(value || "").split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function formatHourLabel(value) {
  const minutes = timeToMinutes(value);
  if (minutes === null) return "";
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

function openStatusFor(hours) {
  const opens = timeToMinutes(hours?.opens_at);
  const closes = timeToMinutes(hours?.closes_at);
  if (opens === null || closes === null) {
    return { isOpen: null, label: "Hours unavailable", detail: "No hours set", className: "unknown" };
  }

  const now = timeToMinutes(manilaParts().time);
  const isAllDay = opens === 0 && closes >= 1439;
  const isOvernight = closes <= opens;
  const isOpen = isAllDay || (isOvernight ? now >= opens || now < closes : now >= opens && now < closes);
  const nextTime = isOpen ? formatHourLabel(hours.closes_at) : formatHourLabel(hours.opens_at);
  return {
    isOpen,
    label: isOpen ? "Open now" : "Closed now",
    detail: isOpen ? `Closes ${nextTime}` : `Opens ${nextTime}`,
    className: isOpen ? "open" : "closed",
  };
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
        opens_at: food.opens_at,
        closes_at: food.closes_at,
      });
    }

    const store = grouped.get(id);
    store.menu.push(food);
    store.price_min = Math.min(store.price_min, food.price_min);
    store.price_max = Math.max(store.price_max, food.price_max);
    store.rating = Math.max(store.rating, food.rating);
    store.opens_at = store.opens_at || food.opens_at;
    store.closes_at = store.closes_at || food.closes_at;
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
  const spent = weeklySpentTotal();
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
  const openStatus = openStatusFor(store);
  if (openStatus.isOpen === true) frames.unshift("Open now");
  if (openStatus.isOpen === false) frames.push("Closed now");
  if (getStoreBookmarks().includes(store.id)) frames.unshift("Favorite restaurant");
  if (store.menu.some((food) => getBookmarks().includes(food.id))) frames.unshift("Has saved item");
  if (store.menu.some((food) => antiRepeatIds().includes(food.id))) frames.unshift("Recently tried");
  if (getUserStoreRating(store.id)) frames.unshift(`Your ${getUserStoreRating(store.id)}/5`);
  if (store.feature_tags?.includes("open_late")) frames.push("Open late");
  if (store.feature_tags?.includes("aircon")) frames.push("Aircon");
  return [...new Set(frames)].slice(0, 5);
}

function foodImageFor(food) {
  return food.image_url || restaurantImages[food.restaurant] || categoryImages[food.category] || categoryImages.snacks;
}

function ratingStarsTemplate({ id, type, value = 0, label }) {
  return `
    <div class="rating-stars" role="group" aria-label="${label}">
      ${[1, 2, 3, 4, 5].map((rating) => `
        <button class="rating-star ${value >= rating ? "active" : ""}" type="button" data-rate-${type}="${id}" data-rating="${rating}" aria-label="${rating} out of 5" aria-pressed="${value === rating}" title="${rating} out of 5">
          <i data-lucide="star"></i>
        </button>
      `).join("")}
    </div>
  `;
}

function menuItemTemplate(food) {
  const active = getBookmarks().includes(food.id);
  const foodLog = latestFoodLog(food.id);
  const eatenToday = Boolean(foodLog && foodLog.phDate === manilaParts().date);
  return `
    <li class="menu-item" data-menu-food-id="${food.id}">
      <div class="menu-copy">
        <strong>${food.name}</strong>
        <p>${food.description}</p>
      </div>
      <div class="menu-controls">
        <span>PHP ${food.price_min}-${food.price_max}</span>
        <button class="icon-button ate-button ${eatenToday ? "active" : ""}" type="button" data-ate="${food.id}" aria-label="${eatenToday ? "Edit meal log for" : "Log"} ${food.name}" aria-pressed="${eatenToday}" title="${eatenToday ? `Logged PHP ${foodLog.price} today` : "Log eaten"}">
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
  const foodLog = latestFoodLog(food.id);
  const eatenToday = Boolean(foodLog && foodLog.phDate === manilaParts().date);
  const userRatingEntry = getUserFoodRatingEntry(food.id);
  const userRating = userRatingEntry.score;
  const publicRating = publicRatingForFood(food.id);
  const publicReason = publicFoodRatingReason(food.id);
  return `
    <article class="detail-menu-item" data-menu-food-id="${food.id}">
      <img src="${foodImageFor(food)}" alt="">
      <div class="detail-menu-copy">
        <div>
          <div class="detail-menu-topline">
            <span>${categoryLabel(food.category)}</span>
            <b>PHP ${food.price_min}-${food.price_max}</b>
          </div>
          <strong>${food.name}</strong>
          <p>${food.description}</p>
          ${publicRating ? `<p class="rating-reason"><i data-lucide="star"></i> ${publicRating.average.toFixed(1)} from ${publicRating.count} food rating${publicRating.count === 1 ? "" : "s"} - ${publicReason}</p>` : ""}
          ${reviewsTemplate(publicRating, "No food reviews yet. Add the first useful note.")}
        </div>
        <div class="detail-menu-meta">
          <div class="rating-panel compact-rating">
            <span>${userRating ? `Your food rating: ${userRating}/5` : "Rate food"}</span>
            ${ratingStarsTemplate({ id: food.id, type: "food", value: userRating, label: `Rate ${food.name}` })}
            <p class="rating-reason">${ratingReasonText(userRatingEntry, publicReason || "Add why: taste, serving, price, or sulit factor.")}</p>
          </div>
          <button class="icon-button ate-button ${eatenToday ? "active" : ""}" type="button" data-ate="${food.id}" aria-label="${eatenToday ? "Edit meal log for" : "Log"} ${food.name}" aria-pressed="${eatenToday}" title="${eatenToday ? `Logged PHP ${foodLog.price} today` : "Log eaten"}">
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
  const userRatingEntry = getUserStoreRatingEntry(store.id);
  const userRating = userRatingEntry.score;
  const publicRating = publicRatingForStore(store.id);
  const displayRating = publicRating?.average || store.rating;
  const displayRatingLabel = publicRating ? `${publicRating.count} rating${publicRating.count === 1 ? "" : "s"}` : "Store data";
  const openStatus = openStatusFor(store);
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
          <span><small>${displayRatingLabel}</small><i data-lucide="star"></i> ${displayRating.toFixed(1)}</span>
        </div>
        <div class="open-status ${openStatus.className}">
          <i data-lucide="${openStatus.isOpen ? "door-open" : "door-closed"}"></i>
          <strong>${openStatus.label}</strong>
          <span>${openStatus.detail}</span>
        </div>
        <div class="rating-panel store-card-rating">
          <span>${userRating ? `Your rating: ${userRating}/5` : "Rate store"}</span>
          ${ratingStarsTemplate({ id: store.id, type: "store", value: userRating, label: `Rate ${store.name}` })}
          <p class="rating-reason">${ratingReasonText(userRatingEntry, publicRatingReason(store.id) || "Based on the starting dataset until real ratings are added.")}</p>
        </div>
        <div class="card-actions">
          <span class="pill price-pill">
            <small>Price</small>
            <strong>PHP ${store.price_min}-${store.price_max}</strong>
          </span>
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
  const userRatingEntry = getUserStoreRatingEntry(store.id);
  const userRating = userRatingEntry.score;
  const publicRating = publicRatingForStore(store.id);
  const displayRating = userRating || publicRating?.average || store.rating;
  const ratingSource = userRating ? "Your rating" : publicRating ? `${publicRating.count} public rating${publicRating.count === 1 ? "" : "s"}` : "Store data rating";
  const publicReason = publicRatingReason(store.id);
  const openStatus = openStatusFor(store);
  return `
    <div class="menu-detail-header">
      <img src="${foodImageFor(store)}" alt="">
      <div>
        <span>${formatLabel(store.area)}</span>
        <strong>${store.name}</strong>
        <p>${store.menu.length} menu items - ${store.walking_minutes} min walk - ${openStatus.label.toLowerCase()} - ${ratingSource.toLowerCase()} ${displayRating.toFixed(1)}/5</p>
        <b class="detail-price-range">PHP ${store.price_min}-${store.price_max}</b>
        <b class="open-status detail-open-status ${openStatus.className}"><i data-lucide="${openStatus.isOpen ? "door-open" : "door-closed"}"></i> ${openStatus.label} - ${openStatus.detail}</b>
      </div>
      <div class="menu-detail-header-actions">
        <button class="store-save-dot ${storeSaved ? "active" : ""}" type="button" data-store-bookmark="${store.id}" title="${storeSaved ? "Saved restaurant" : "Save restaurant"}" aria-label="${storeSaved ? "Remove restaurant bookmark for" : "Bookmark restaurant"} ${store.name}" aria-pressed="${storeSaved}">
          <i data-lucide="heart"></i>
        </button>
        <button class="icon-button menu-detail-close" type="button" data-close-menu aria-label="Close menu" title="Close menu">
          <i data-lucide="x"></i>
        </button>
      </div>
    </div>
    <div class="decision-rating">
      <div>
        <span>Decision signal</span>
        <strong><i data-lucide="star"></i> ${displayRating.toFixed(1)} ${ratingSource.toLowerCase()}</strong>
        <p>${ratingReasonText(userRatingEntry, publicReason || "This rating currently comes from the store dataset. Add your own score and reason to make the recommendation more useful.")}</p>
        ${reviewsTemplate(publicRating, "No store reviews yet. Rate it after trying it.")}
      </div>
      <div class="rating-panel">
        <span>${userRating ? `Your store rating: ${userRating}/5` : "Rate this store"}</span>
        ${ratingStarsTemplate({ id: store.id, type: "store", value: userRating, label: `Rate ${store.name}` })}
        <p class="rating-reason">${ratingReasonText(userRatingEntry, "Explain the score so the rating is useful, not just a number.")}</p>
      </div>
    </div>
    <div class="detail-menu-list">
      ${store.menu.map(detailMenuItemTemplate).join("")}
    </div>
  `;
}

function renderMenuDetail(stores) {
  const detail = document.getElementById("menuDetail");
  const backdrop = document.getElementById("menuDetailBackdrop");
  if (!detail) return;
  const selected = stores.find((store) => store.id === state.selectedStoreId);
  detail.hidden = !selected;
  if (backdrop) backdrop.hidden = !selected;
  document.body.classList.toggle("menu-detail-open", Boolean(selected));
  detail.innerHTML = selected ? menuDetailTemplate(selected) : "";
  if (window.lucide) window.lucide.createIcons();
}

function focusMenuDetail() {
  return;
}

function applyClientRanking(foods) {
  const favorites = getJson(FAVORITES_KEY, []);
  const selectedMoods = selectedValues("mood");
  const hotMood = selectedMoods.includes("tipid");
  const treatMood = selectedMoods.includes("treat_myself");
  const rushMood = selectedMoods.includes("nagmamadali");
  const historyIds = antiRepeatIds();
  const storeRatings = getUserRatings(USER_STORE_RATINGS_KEY);
  const foodRatings = getUserRatings(USER_FOOD_RATINGS_KEY);

  return [...foods].sort((a, b) => {
    const score = (food) => {
      let total = food.rating * 8 - (food.walking_minutes || 0);
      total += normalizedRatingEntry(foodRatings[String(food.id)]).score * 8;
      total += normalizedRatingEntry(storeRatings[storeIdFor(food.restaurant)]).score * 5;
      const openStatus = openStatusFor(food);
      if (openStatus.isOpen === true) total += 10;
      if (openStatus.isOpen === false) total -= 18;
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

function mealBudgetMessage(price, food) {
  const weekly = Number(document.getElementById("weeklyBudget")?.value || 0);
  const currentSpent = weeklySpentTotal();
  if (!weekly) return `Logging ${food.name} helps build your weekly food history.`;
  const remaining = Math.max(0, weekly - currentSpent);
  const after = remaining - Number(price || 0);
  if (after < 0) return `This meal puts you PHP ${Math.abs(after)} over your weekly budget.`;
  if (after < 120) return `This leaves about PHP ${after} for the rest of the week.`;
  return `After this meal, you still have about PHP ${after} left this week.`;
}

function closeMealLogDialog() {
  document.getElementById("mealLogDialog")?.close();
}

function openMealLogDialog(food, entry = null) {
  const dialog = document.getElementById("mealLogDialog");
  if (!dialog || !food) return;
  if (dialog.open) dialog.close();
  document.getElementById("mealLogFoodId").value = String(food.id);
  document.getElementById("mealLogEntryId").value = entry?.entryId || "";
  document.getElementById("mealLogTitle").textContent = entry ? "Edit meal" : "Log meal";
  document.getElementById("mealLogFoodName").textContent = food.name;
  document.getElementById("mealLogRestaurant").textContent = food.restaurant;
  document.getElementById("mealLogSuggestion").textContent = `Suggested: PHP ${food.price_min}-${food.price_max}`;
  document.getElementById("mealLogPrice").value = String(entry?.price || averagePrice(food));
  document.getElementById("mealLogNote").value = entry?.note || "";
  document.getElementById("mealLogBudgetHint").textContent = mealBudgetMessage(entry?.price || averagePrice(food), food);
  document.getElementById("mealLogSubmit").innerHTML = entry
    ? `<i data-lucide="save"></i> Update meal`
    : `<i data-lucide="check"></i> Log meal`;
  document.getElementById("mealLogRemove").hidden = !entry;
  document.getElementById("mealLogRemove").dataset.entryId = entry?.entryId || "";
  dialog.showModal();
  if (window.lucide) window.lucide.createIcons();
}

function closeRatingDialog() {
  document.getElementById("ratingDialog")?.close();
  state.ratingDraft = null;
}

function openRatingDialog({ type, id, rating }) {
  const dialog = document.getElementById("ratingDialog");
  if (!dialog) return;
  const isStore = type === "store";
  const target = isStore
    ? groupFoodsByStore(state.foods).find((store) => store.id === String(id))
    : state.foods.find((food) => food.id === Number(id));
  if (!target) return;

  const previous = isStore ? getUserStoreRatingEntry(id) : getUserFoodRatingEntry(id);
  state.ratingDraft = { type, id, rating: Number(rating), target };
  document.getElementById("ratingTargetType").value = type;
  document.getElementById("ratingTargetId").value = String(id);
  document.getElementById("ratingScore").value = String(rating);
  document.getElementById("ratingDialogTitle").textContent = `Rate ${isStore ? target.name : target.name}`;
  document.getElementById("ratingDialogSubtitle").textContent = isStore ? target.name : `${target.name} at ${target.restaurant}`;
  document.getElementById("ratingDialogScore").textContent = `${rating}/5`;
  document.getElementById("ratingReason").value = previous.reason || "";
  document.getElementById("ratingReasonHint").textContent = "Mention taste, serving, price, wait time, or if it felt sulit.";
  dialog.showModal();
  document.getElementById("ratingReason").focus();
  if (window.lucide) window.lucide.createIcons();
}

async function saveRatingDialog(event) {
  event.preventDefault();
  const draft = state.ratingDraft;
  if (!draft) return;
  const reason = document.getElementById("ratingReason").value.trim();
  if (!reason) {
    document.getElementById("ratingReasonHint").textContent = "Add a short reason first so the rating helps other students.";
    return;
  }

  if (draft.type === "store") {
    setUserRating(USER_STORE_RATINGS_KEY, draft.id, draft.rating, reason);
    try {
      await submitPublicStoreRating(draft.target, draft.rating, reason);
      showToast(`Rated ${draft.target.name} ${draft.rating}/5.`);
    } catch {
      showToast("Saved your rating locally. Public rating sync failed.");
    }
  } else {
    setUserRating(USER_FOOD_RATINGS_KEY, draft.id, draft.rating, reason);
    try {
      await submitPublicFoodRating(draft.target, draft.rating, reason);
      showToast(`Rated ${draft.target.name} ${draft.rating}/5.`);
    } catch {
      showToast("Saved your food rating locally. Public rating sync failed.");
    }
  }

  closeRatingDialog();
  renderFoods(state.foods);
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

function logFood(food, options = {}) {
  const now = new Date();
  const manila = manilaParts(now);
  const entry = {
    entryId: options.entryId || `${food.id}-${now.toISOString()}`,
    id: food.id,
    name: food.name,
    restaurant: food.restaurant,
    price: Number(options.price || averagePrice(food)),
    note: options.note || "",
    date: manila.date,
    phDate: manila.date,
    phTime: manila.time,
    weekKey: manilaWeekKey(manila.date),
    loggedAt: now.toISOString(),
  };
  upsertHistoryEntry(entry);
  renderFoods(state.foods);
  showToast(`${options.entryId ? "Updated" : "Logged"} ${food.name} for PHP ${entry.price}.`);
}

function streakDays() {
  const dates = [...new Set(getHistory().map((item) => item.phDate || item.date))].sort().reverse();
  let streak = 0;
  const cursorParts = manilaParts();
  const [year, month, day] = cursorParts.date.split("-").map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, day));
  for (const date of dates) {
    const expected = cursor.toISOString().slice(0, 10);
    if (date !== expected) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderHabitStrip() {
  const history = getHistory().map(normalizeHistoryEntry);
  document.getElementById("todaySpent").textContent = `PHP ${dailySpentTotal()}`;
  document.getElementById("weekSpent").textContent = `PHP ${weeklySpentTotal()}`;
  document.getElementById("streakCount").textContent = `${streakDays()} day${streakDays() === 1 ? "" : "s"}`;
  document.getElementById("lastAte").textContent = history[0]
    ? `${history[0].name} at ${history[0].restaurant} - ${mealTimeLabel(history[0])}`
    : "Nothing logged yet";
  updateSaveStatus();
}

function updateBudgetInsight(food = null) {
  const insight = document.getElementById("budgetInsight");
  const budgetInput = document.getElementById("weeklyBudget");
  const weekly = Number(budgetInput?.value || 0);
  const spent = weeklySpentTotal();
  const spentInput = document.getElementById("weeklySpent");
  const spentLabel = document.getElementById("budgetSpentLabel");
  const remainingLabel = document.getElementById("budgetRemainingLabel");
  const bar = document.getElementById("budgetBar");
  const historyPanel = document.getElementById("weeklyHistory");
  if (spentInput) spentInput.value = String(spent);
  if (spentLabel) spentLabel.textContent = `PHP ${spent} spent`;
  if (remainingLabel) remainingLabel.textContent = weekly ? `PHP ${Math.max(0, weekly - spent)} left` : "Set a budget";
  if (bar) {
    const percent = weekly ? Math.min(100, Math.round((spent / weekly) * 100)) : 0;
    bar.style.width = `${percent}%`;
    bar.classList.toggle("warning", weekly > 0 && percent >= 75 && percent < 100);
    bar.classList.toggle("danger", weekly > 0 && percent >= 100);
  }
  if (historyPanel) {
    const week = thisWeekHistory();
    historyPanel.innerHTML = week.length
      ? `
        <div class="weekly-history-header">
          <span>This week in Manila time</span>
          <b>${week.length} meal${week.length === 1 ? "" : "s"}</b>
        </div>
        ${week.slice(0, 5).map((item) => `
          <div class="weekly-history-item">
            <div>
              <strong>${item.name}</strong>
              <span>${item.restaurant} - ${mealTimeLabel(item)}${item.note ? ` - ${item.note}` : ""}</span>
            </div>
            <div class="weekly-history-actions">
              <b>PHP ${item.price}</b>
              <button class="icon-button" type="button" data-history-edit="${item.entryId}" aria-label="Edit ${item.name}" title="Edit meal">
                <i data-lucide="pencil"></i>
              </button>
              <button class="icon-button" type="button" data-history-remove="${item.entryId}" aria-label="Remove ${item.name}" title="Remove meal">
                <i data-lucide="undo-2"></i>
              </button>
            </div>
          </div>
        `).join("")}
      `
      : `<p>No meals logged this week yet. Tap the utensil button on a menu item after eating.</p>`;
    if (window.lucide) window.lucide.createIcons();
  }
  if (!insight) return;
  if (!weekly) {
    insight.textContent = spent
      ? `You logged PHP ${spent} this week. Set a weekly budget to track what is left.`
      : "Set a weekly budget to see smarter spending notes.";
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
  const weeklyBudgetInput = document.getElementById("weeklyBudget");
  const weeklySpentInput = document.getElementById("weeklySpent");
  const timeAvailableInput = document.getElementById("timeAvailable");
  const mealMinutesInput = document.getElementById("mealMinutes");
  if (weeklyBudgetInput) weeklyBudgetInput.value = budget.weekly || "";
  if (weeklySpentInput) weeklySpentInput.value = String(weeklySpentTotal());
  if (timeAvailableInput) timeAvailableInput.value = getJson("saanTimeAvailable", "");
  if (mealMinutesInput) mealMinutesInput.value = getJson("saanMealMinutes", "20");
  getJson(FAVORITES_KEY, []).forEach((category) => {
    const chip = document.querySelector(`[data-filter="category"] [data-value="${category}"]`);
    if (chip) setChipActive(chip, true);
  });
  updateFavoriteTypesButton();
}

function setupFilterToggle() {
  const panel = document.querySelector(".filter-panel");
  const button = document.getElementById("toggleFilters");
  if (!panel || !button) return;

  const compactQuery = window.matchMedia("(max-width: 860px)");
  const setCollapsed = (collapsed) => {
    panel.classList.toggle("is-collapsed", collapsed);
    button.setAttribute("aria-expanded", String(!collapsed));
    button.setAttribute("aria-label", collapsed ? "Show filters" : "Hide filters");
    button.title = collapsed ? "Show filters" : "Hide filters";
  };
  const syncForViewport = () => setCollapsed(compactQuery.matches);

  syncForViewport();
  compactQuery.addEventListener?.("change", syncForViewport);
  button.addEventListener("click", () => {
    setCollapsed(!panel.classList.contains("is-collapsed"));
    if (window.lucide) window.lucide.createIcons();
  });
}

function setupFilters() {
  setupFilterToggle();

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.setAttribute("aria-pressed", String(chip.classList.contains("active")));
    chip.addEventListener("click", () => {
      setChipActive(chip, !chip.classList.contains("active"));

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

  document.getElementById("weeklyBudget")?.addEventListener("input", setBudgetState);

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
    document.querySelectorAll(".chip").forEach((chip) => setChipActive(chip, false));
    state.weatherMode = "auto";
    state.showingBookmarks = false;
    state.visibleLimit = 12;
    loadFoods();
  });

  document.getElementById("saveFavoriteTypes").addEventListener("click", () => {
    const categories = selectedValues("category");
    setJson(FAVORITES_KEY, categories);
    updateFavoriteTypesButton();
    showToast(
      categories.length
        ? `Saved ${categories.length} favorite food type${categories.length === 1 ? "" : "s"}. These get ranked higher.`
        : "Favorite food types cleared.",
    );
    renderFoods(state.foods);
  });

  document.getElementById("loadMore").addEventListener("click", () => {
    state.visibleLimit += 12;
    renderFoods(state.foods);
  });

  document.getElementById("clearHistory")?.addEventListener("click", () => {
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

  document.getElementById("mealLogPrice")?.addEventListener("input", () => {
    const food = state.foods.find((item) => item.id === Number(document.getElementById("mealLogFoodId")?.value));
    if (!food) return;
    const price = Number(document.getElementById("mealLogPrice").value || 0);
    document.getElementById("mealLogBudgetHint").textContent = mealBudgetMessage(price, food);
  });

  document.getElementById("closeMealLog")?.addEventListener("click", closeMealLogDialog);
  document.getElementById("mealLogDialog")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeMealLogDialog();
  });

  document.getElementById("mealLogRemove")?.addEventListener("click", () => {
    const entryId = document.getElementById("mealLogRemove")?.dataset.entryId;
    if (!entryId) return;
    removeHistoryEntry(entryId);
    closeMealLogDialog();
    renderFoods(state.foods);
    showToast("Removed meal log.");
  });

  document.getElementById("mealLogForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const food = state.foods.find((item) => item.id === Number(document.getElementById("mealLogFoodId").value));
    if (!food) return;
    const price = Number(document.getElementById("mealLogPrice").value || 0);
    if (!price) {
      showToast("Add the amount you spent first.");
      return;
    }
    logFood(food, {
      entryId: document.getElementById("mealLogEntryId").value || undefined,
      price,
      note: document.getElementById("mealLogNote").value.trim(),
    });
    closeMealLogDialog();
  });

  document.getElementById("closeRatingDialog")?.addEventListener("click", closeRatingDialog);
  document.getElementById("ratingCancel")?.addEventListener("click", closeRatingDialog);
  document.getElementById("ratingDialog")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeRatingDialog();
  });
  document.getElementById("ratingForm")?.addEventListener("submit", (event) => {
    saveRatingDialog(event).catch((error) => showToast(error.message));
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
    const storeRatingButton = event.target.closest("[data-rate-store]");
    const ateButton = event.target.closest("[data-ate]");
    const toggleButton = event.target.closest("[data-store-toggle]");
    const card = event.target.closest("[data-store-id]");
    if (storeRatingButton) {
      const id = String(storeRatingButton.dataset.rateStore || "");
      const rating = Number(storeRatingButton.dataset.rating);
      if (!id || !Number.isFinite(rating)) return;
      openRatingDialog({ type: "store", id, rating });
      return;
    }
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
      const nextStoreId = toggleButton.dataset.storeToggle;
      const isClosing = state.selectedStoreId === nextStoreId;
      state.selectedStoreId = isClosing ? null : nextStoreId;
      renderFoods(state.foods);
      window.selectFoodOnMap?.(isClosing ? null : nextStoreId, false);
      if (!isClosing) focusMenuDetail();
      return;
    }
    if (ateButton) {
      const food = state.foods.find((item) => item.id === Number(ateButton.dataset.ate));
      if (food) openMealLogDialog(food, latestTodayFoodLog(food.id));
    } else if (card) {
      window.selectFoodOnMap?.(card.dataset.storeId, false);
    }
  });

  document.getElementById("menuDetail")?.addEventListener("click", async (event) => {
    const bookmarkButton = event.target.closest("[data-bookmark]");
    const storeBookmarkButton = event.target.closest("[data-store-bookmark]");
    const storeRatingButton = event.target.closest("[data-rate-store]");
    const foodRatingButton = event.target.closest("[data-rate-food]");
    const ateButton = event.target.closest("[data-ate]");
    const closeButton = event.target.closest("[data-close-menu]");
    if (closeButton) {
      state.selectedStoreId = null;
      renderFoods(state.foods);
      window.selectFoodOnMap?.(null, false);
      return;
    }
    if (storeRatingButton) {
      const id = String(storeRatingButton.dataset.rateStore || "");
      const rating = Number(storeRatingButton.dataset.rating);
      if (!id || !Number.isFinite(rating)) return;
      openRatingDialog({ type: "store", id, rating });
      return;
    }
    if (foodRatingButton) {
      const id = Number(foodRatingButton.dataset.rateFood);
      const rating = Number(foodRatingButton.dataset.rating);
      const food = state.foods.find((item) => item.id === id);
      if (!food || !Number.isFinite(rating)) return;
      openRatingDialog({ type: "food", id, rating });
      return;
    }
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
      if (food) openMealLogDialog(food, latestTodayFoodLog(food.id));
    }
  });

  document.getElementById("menuDetailBackdrop")?.addEventListener("click", () => {
    state.selectedStoreId = null;
    renderFoods(state.foods);
    window.selectFoodOnMap?.(null, false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !state.selectedStoreId) return;
    state.selectedStoreId = null;
    renderFoods(state.foods);
    window.selectFoodOnMap?.(null, false);
  });

  document.getElementById("weeklyHistory")?.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-history-edit]");
    const removeButton = event.target.closest("[data-history-remove]");
    if (editButton) {
      const entry = getHistory().map(normalizeHistoryEntry).find((item) => item.entryId === editButton.dataset.historyEdit);
      const food = foodFromHistoryEntry(entry);
      if (food && entry) openMealLogDialog(food, entry);
      return;
    }
    if (removeButton) {
      removeHistoryEntry(removeButton.dataset.historyRemove);
      renderFoods(state.foods);
      showToast("Removed meal log.");
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
  await loadPublicStoreRatings();
  await detectWeather();
  loadFoods();
});
