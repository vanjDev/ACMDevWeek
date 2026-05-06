const state = {
  foods: [],
  showingBookmarks: false,
  visibleLimit: 12,
  weatherMode: "auto",
  isLoading: false,
  hasLoadedFoods: false,
  selectedStoreId: null,
  userLocation: null,
  publicStoreRatings: {},
  publicFoodRatings: {},
  ratingDraft: null,
  customComboIds: [],
};

const DEFAULT_RADIUS = 1200;
const HISTORY_KEY = "saanFoodHistory";
const FAVORITES_KEY = "saanFavoriteTypes";
const STORE_BOOKMARKS_KEY = "bookmarkedStores";
const BUDGET_KEY = "saanWeeklyBudget";
const LOCATION_KEY = "saanPreciseLocation";
const USER_STORE_RATINGS_KEY = "saanStoreRatings";
const USER_FOOD_RATINGS_KEY = "saanFoodRatings";
const COMBO_BUDGET_KEY = "saanComboBudget";
const MIN_SNACK_BUDGET = 50;
const MIN_MEAL_BUDGET = 80;
const DECISION_WEIGHTS = {
  budget: 0.25,
  distance: 0.18,
  rating: 0.15,
  nutrition: 0.16,
  time: 0.10,
  freshness: 0.08,
  preference: 0.05,
  open: 0.03,
};

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

function updateWeatherTiles(value = document.getElementById("weather")?.value || "auto") {
  document.querySelectorAll("[data-weather-choice]").forEach((button) => {
    const active = button.dataset.weatherChoice === value;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
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
  const phTime = item.phTime || "";
  return {
    ...item,
    entryId: item.entryId || item.loggedAt || `${item.id}-${phDate}-${item.phTime || "00:00"}`,
    phDate,
    phTime,
    mealPeriod: item.mealPeriod || mealPeriodForTime(phTime),
    weekKey: item.weekKey || manilaWeekKey(phDate),
    price: Number(item.price || 0),
    calories: Number(item.calories || 0),
    healthLabel: item.healthLabel || "",
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

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[char]));
}

function reviewsTemplate(summary, emptyText) {
  const reasons = summary?.reasons || [];
  const keywords = reviewKeywords(reasons);
  return `
    <div class="review-list">
      <div class="review-list-heading">
        <span>Student reviews</span>
        <strong>${summary ? `${summary.average.toFixed(1)} from ${summary.count}` : "No reviews yet"}</strong>
      </div>
      ${keywords.length ? `<div class="review-keywords">${keywords.map((keyword) => `<span>${keyword}</span>`).join("")}</div>` : ""}
      ${reasons.length
        ? reasons.map((review) => `
          <article class="review-item">
            <b><i data-lucide="star"></i> ${review.score}/5</b>
            <span class="review-author">${escapeHtml(review.reviewer_name || "Student")}${review.school_tag ? ` <small>${escapeHtml(review.school_tag)}</small>` : ""}</span>
            <p>${escapeHtml(review.reason)}</p>
          </article>
        `).join("")
        : `<p class="review-empty">${emptyText}</p>`}
    </div>
  `;
}

function reviewKeywords(reasons) {
  const vocabulary = [
    "sulit",
    "mura",
    "fast",
    "mabilis",
    "serving",
    "busog",
    "malapit",
    "taste",
    "masarap",
    "mahal",
    "wait",
    "line",
  ];
  const text = reasons.map((review) => String(review.reason || "").toLowerCase()).join(" ");
  return vocabulary.filter((word) => text.includes(word)).slice(0, 4);
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
  if (response.status === 401) throw new Error("Sign in to publish ratings.");
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
  if (response.status === 401) throw new Error("Sign in to publish ratings.");
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
  const timeMax = document.getElementById("timeAvailable")?.value || "";
  const mealMinutes = document.getElementById("mealMinutes")?.value || "";

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

function peso(amount) {
  return `₱${Number(amount || 0).toLocaleString("en-PH")}`;
}

function comboPrice(food) {
  if (!food) return 0;
  return Number(food.price_min || averagePrice(food) || 0);
}

function comboRole(food) {
  const text = `${food.name || ""} ${food.restaurant || ""} ${food.description || ""}`.toLowerCase();
  if (food.category === "coffee_drinks" && /coffee|kopi|latte|americano|espresso|cappuccino|mocha/.test(text)) return "coffee";
  if (food.category === "coffee_drinks" || /drink|tea|milk tea|juice|soda|shake|frappe|lemonade/.test(text)) return "drink";
  if (["rice_meals", "chicken", "burgers", "unli_rice"].includes(food.category) || /rice|meal|silog|pares|burger|chicken|wings/.test(text)) return "meal";
  return "snack";
}

function comboRoleLabel(role) {
  return {
    meal: "Food",
    coffee: "Coffee",
    drink: "Drink",
    snack: "Snack",
  }[role] || "Food";
}

function comboTypeFor(items) {
  const roles = items.map(comboRole);
  if (roles.includes("meal") && roles.some((role) => ["drink", "coffee"].includes(role))) return "Food + drink";
  if (roles.includes("coffee") && roles.includes("snack")) return "Coffee + snack";
  if (roles.includes("meal") && roles.includes("snack")) return "Food + snack";
  if (roles.every((role) => role === "snack")) return "Snack combo";
  return "Budget combo";
}

function comboTypeIcon(type) {
  if (type.includes("drink")) return "cup-soda";
  if (type.includes("Coffee")) return "coffee";
  if (type.includes("Snack")) return "cookie";
  return "utensils";
}

function comboItemLine(item) {
  return `${item.name} <small>${peso(comboPrice(item))}</small>`;
}

function comboScore(combo, amount) {
  const store = combo.store;
  const openStatus = openStatusFor(store);
  const leftover = amount - combo.total;
  let score = 100 - leftover;
  if (openStatus.isOpen === true) score += 45;
  if (openStatus.isOpen === false) score -= 80;
  score += Number(store.rating || 0) * 4;
  score -= Number(store.walking_minutes || 0) * 3;
  if (combo.items.some((item) => comboRole(item) === "meal")) score += 12;
  if (new Set(combo.items.map(comboRole)).size > 1) score += 16;
  return score;
}

function comboFoodPool() {
  return applyClientRanking(state.foods || [])
    .filter((food) => Number.isFinite(comboPrice(food)) && comboPrice(food) > 0)
    .sort((a, b) => comboPrice(a) - comboPrice(b) || (a.walking_minutes || 0) - (b.walking_minutes || 0));
}

function buildBudgetCombos(amount) {
  const stores = groupFoodsByStore(comboFoodPool());
  const combos = [];
  stores.forEach((store) => {
    const menu = [...store.menu].sort((a, b) => comboPrice(a) - comboPrice(b));
    for (let leftIndex = 0; leftIndex < menu.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < menu.length; rightIndex += 1) {
        const items = [menu[leftIndex], menu[rightIndex]];
        const total = items.reduce((sum, item) => sum + comboPrice(item), 0);
        if (total > amount) continue;
        const roles = items.map(comboRole);
        const hasUsefulPair =
          new Set(roles).size > 1 ||
          roles.every((role) => role === "snack") ||
          roles.every((role) => role === "coffee");
        if (!hasUsefulPair) continue;
        const type = comboTypeFor(items);
        combos.push({
          id: `${store.id}-${items.map((item) => item.id).join("-")}`,
          store,
          items,
          total,
          type,
          score: 0,
        });
      }
    }
  });
  return combos
    .map((combo) => ({ ...combo, score: comboScore(combo, amount) }))
    .sort((a, b) => b.score - a.score || a.total - b.total)
    .slice(0, 8);
}

function buildBudgetSingles(amount) {
  return comboFoodPool()
    .filter((food) => comboPrice(food) <= amount)
    .sort((a, b) => {
      const openA = openStatusFor(a).isOpen === false ? 1 : 0;
      const openB = openStatusFor(b).isOpen === false ? 1 : 0;
      return openA - openB || comboPrice(b) - comboPrice(a) || (a.walking_minutes || 0) - (b.walking_minutes || 0);
    });
}

function comboCardTemplate(combo, amount) {
  const openStatus = openStatusFor(combo.store);
  const leftover = amount - combo.total;
  return `
    <article class="combo-card-result">
      <div class="combo-card-heading">
        <span><i data-lucide="${comboTypeIcon(combo.type)}"></i> ${combo.type}</span>
        <strong>${peso(combo.total)}</strong>
      </div>
      <h3>${combo.store.name}</h3>
      <p>${combo.items.map(comboItemLine).join(" + ")}</p>
      <div class="combo-meta-row">
        <span class="${openStatus.className}">${openStatus.label}</span>
        <span>${combo.store.walking_minutes || 0} min walk</span>
        <span>${leftover ? `${peso(leftover)} left` : "Exact fit"}</span>
      </div>
      <button class="secondary-button compact-button" type="button" data-combo-store="${combo.store.id}">
        <i data-lucide="utensils"></i>
        Open menu
      </button>
    </article>
  `;
}

function singlePickTemplate(food) {
  const openStatus = openStatusFor(food);
  return `
    <button class="combo-single" type="button" data-combo-add="${food.id}">
      <span>${comboRoleLabel(comboRole(food))}</span>
      <strong>${food.name}</strong>
      <small>${food.restaurant} - ${peso(comboPrice(food))} - ${openStatus.label}</small>
      <b>Add</b>
    </button>
  `;
}

function selectedComboFoods() {
  return state.customComboIds
    .map((id) => state.foods.find((food) => food.id === id))
    .filter(Boolean);
}

function renderCustomComboBuilder(amount, singles) {
  const selected = selectedComboFoods();
  const total = selected.reduce((sum, food) => sum + comboPrice(food), 0);
  const remaining = amount - total;
  const selectedMarkup = selected.length
    ? selected.map((food) => `
        <div class="custom-combo-item">
          <div>
            <strong>${food.name}</strong>
            <span>${food.restaurant} - ${comboRoleLabel(comboRole(food))}</span>
          </div>
          <b>${peso(comboPrice(food))}</b>
          <button type="button" data-combo-remove="${food.id}" aria-label="Remove ${food.name}" title="Remove ${food.name}">
            <i data-lucide="x"></i>
          </button>
        </div>
      `).join("")
    : `<p>Add items below to build a combo from your budget.</p>`;
  const options = singles
    .filter((food) => !state.customComboIds.includes(food.id))
    .slice(0, 12);

  return `
    <section class="custom-combo-builder ${remaining < 0 ? "over" : ""}">
      <div class="combo-section-heading">
        <span>Build your own</span>
        <strong>${selected.length ? `${selected.length} item${selected.length === 1 ? "" : "s"}` : "Choose items"}</strong>
      </div>
      <div class="custom-combo-board">
        <div class="custom-combo-total">
          <span>Total</span>
          <strong>${peso(total)}</strong>
          <p>${remaining >= 0 ? `${peso(remaining)} left from ${peso(amount)}` : `${peso(Math.abs(remaining))} over ${peso(amount)}`}</p>
          ${selected.length ? `<button class="combo-clear-button" type="button" data-combo-clear>Clear combo</button>` : ""}
        </div>
        <div class="custom-combo-list">${selectedMarkup}</div>
      </div>
      <div class="combo-section-heading">
        <span>Add to combo</span>
        <strong>${options.length} options</strong>
      </div>
      <div class="combo-single-grid custom-combo-options">
        ${options.map(singlePickTemplate).join("") || `<p class="combo-empty">No more affordable items in the current filters.</p>`}
      </div>
    </section>
  `;
}

function renderComboResults(amount) {
  const results = document.getElementById("comboResults");
  if (!results) return;
  if (!amount || amount < 1) {
    results.innerHTML = `<p>Tell me what you have and I will build realistic, sulit combos from the menus showing now.</p>`;
    return;
  }
  if (!state.foods.length) {
    results.innerHTML = `<p>Menus are still loading. Try Build mine again in a moment.</p>`;
    return;
  }

  const combos = buildBudgetCombos(amount);
  const singles = buildBudgetSingles(amount);

  results.innerHTML = `
    <div class="combo-summary">
      <span>${peso(amount)} budget</span>
      <strong>${combos.length ? `${combos.length} combo${combos.length === 1 ? "" : "s"} for you` : `${singles.length} pick${singles.length === 1 ? "" : "s"} for you`}</strong>
      <p>${combos.length ? "I kept these same-store so ordering feels realistic, not random." : "No same-store combo fits yet, so I found the best single-item choices for your cash."}</p>
    </div>
    ${renderCustomComboBuilder(amount, singles)}
    ${combos.length ? `
      <section class="combo-section">
        <div class="combo-section-heading">
          <span>Ready-made options</span>
          <strong>Most sulit first</strong>
        </div>
        <div class="combo-card-grid">
          ${combos.map((combo) => comboCardTemplate(combo, amount)).join("")}
        </div>
      </section>
    ` : ""}
  `;
  if (window.lucide) window.lucide.createIcons();
}

function openComboDialog() {
  const dialog = document.getElementById("comboDialog");
  if (!dialog) return;
  const input = document.getElementById("comboBudgetAmount");
  const savedAmount = Number(getJson(COMBO_BUDGET_KEY, ""));
  if (input && savedAmount) input.value = String(savedAmount);
  renderComboResults(Number(input?.value || 0));
  dialog.showModal();
  input?.focus();
}

function closeComboDialog() {
  document.getElementById("comboDialog")?.close();
}

function setFloatingMapOpen(open) {
  if (open) setSuggestionOpen(false);
  document.body.classList.toggle("map-helper-open", open);
  const button = document.getElementById("toggleMap");
  if (button) button.setAttribute("aria-expanded", String(open));
  if (open) {
    window.setTimeout(() => {
      window.SaanLeafletMap?.invalidateSize?.();
    }, 80);
  }
}

function setSuggestionOpen(open) {
  if (open) setFloatingMapOpen(false);
  document.body.classList.toggle("suggestion-helper-open", open);
  const button = document.getElementById("toggleSuggestion");
  if (button) button.setAttribute("aria-expanded", String(open));
}

function openStoreFromCombo(storeId) {
  const stores = groupFoodsByStore(applyClientRanking(state.foods));
  const storeIndex = stores.findIndex((store) => store.id === String(storeId));
  if (storeIndex >= 0) state.visibleLimit = Math.max(state.visibleLimit, storeIndex + 1);
  state.selectedStoreId = String(storeId);
  closeComboDialog();
  renderFoods(state.foods);
  window.selectFoodOnMap?.(state.selectedStoreId, true);
  window.setTimeout(() => {
    document.querySelector(`[data-store-id="${state.selectedStoreId}"]`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 80);
}

function averageMealSpend(items = thisWeekHistory()) {
  if (!items.length) return 0;
  return Math.round(items.reduce((total, item) => total + Number(item.price || 0), 0) / items.length);
}

function budgetHealth() {
  const weekly = Number(document.getElementById("weeklyBudget")?.value || getBudgetState().weekly || 0);
  const spent = weeklySpentTotal();
  const remaining = weekly ? weekly - spent : 0;
  const percent = weekly ? spent / weekly : 0;
  return { weekly, spent, remaining, percent };
}

function mealPeriodForHour(hour) {
  if (hour < 5) return "late_night";
  if (hour < 10) return "breakfast";
  if (hour < 14) return "lunch";
  if (hour < 18) return "merienda";
  if (hour < 22) return "dinner";
  return "late_night";
}

function mealPeriodForTime(time) {
  const hour = Number(String(time || "").split(":")[0]);
  return Number.isFinite(hour) ? mealPeriodForHour(hour) : "meal";
}

function mealPeriodLabel(period = mealPeriodForTime(manilaParts().time)) {
  return {
    late_night: "late-night",
    breakfast: "breakfast",
    lunch: "lunch",
    merienda: "merienda",
    dinner: "dinner",
  }[period] || "meal";
}

function currentMealPeriod() {
  return mealPeriodForTime(manilaParts().time);
}

function currentMealPeriodInfo() {
  const parts = manilaParts();
  const period = mealPeriodForTime(parts.time);
  const label = mealPeriodLabel(period);
  const displayTime = formatStoredMealTime(parts.time);
  const advice = {
    late_night: `It is ${displayTime}. Keep it light unless you really need food.`,
    breakfast: `Good morning. Breakfast should be filling but not too heavy.`,
    lunch: "Lunch mode. Prioritize real protein, rice or fiber, and enough budget for later.",
    merienda: "Merienda mode. A lighter snack or drink is usually enough.",
    dinner: "Dinner mode. Go balanced and avoid overspending if you already ate well today.",
  }[period] || "Pick something balanced.";
  return { ...parts, period, label, displayTime, advice };
}

function currentPeriodHistory() {
  const today = manilaParts().date;
  const period = currentMealPeriod();
  return getHistory()
    .map(normalizeHistoryEntry)
    .filter((item) => item.phDate === today && item.mealPeriod === period);
}

function totalLoggedCalories(items = todayHistory()) {
  return items.reduce((total, item) => total + Number(item.calories || 0), 0);
}

function nutritionProfile(food) {
  const text = `${food.name || ""} ${food.restaurant || ""} ${food.description || ""} ${food.category || ""}`.toLowerCase();
  const baseByCategory = {
    coffee_drinks: { calories: 160, health: 66 },
    snacks: { calories: 260, health: 58 },
    street_food: { calories: 360, health: 50 },
    dimsum: { calories: 420, health: 62 },
    rice_meals: { calories: 560, health: 68 },
    chicken: { calories: 620, health: 64 },
    burgers: { calories: 720, health: 42 },
    unli_rice: { calories: 780, health: 48 },
  };
  const base = baseByCategory[food.category] || { calories: 480, health: 58 };
  let calories = base.calories;
  let health = base.health;

  [
    [/salad|gulay|vegetable|caesar/, -120, 22],
    [/grilled|inasal|teriyaki|plain rice|siomai/, -40, 10],
    [/chicken|beef|egg|tuna/, 70, 7],
    [/fried|fries|burger|liempo|porkchop|ribs|bacon|sisig/, 170, -18],
    [/carbonara|mac|cheese|cream|cordon bleu/, 150, -14],
    [/cookie|waffle|smores|oreo|chocolate|caramel|shake|frappe|soda/, 130, -16],
    [/unli|party pack|jumbo/, 220, -12],
  ].forEach(([pattern, calorieDelta, healthDelta]) => {
    if (pattern.test(text)) {
      calories += calorieDelta;
      health += healthDelta;
    }
  });

  const price = averagePrice(food);
  if (price <= 80) health += 6;
  if (price >= 150) health -= 5;
  if ((food.diet_tags || []).includes("halal_friendly")) health += 4;
  if ((food.diet_tags || []).includes("pork")) health -= 5;
  if (food.shareable) calories += 80;

  calories = Math.max(80, Math.round(calories / 20) * 20);
  health = Math.round(clampNumber(health, 15, 96));
  const label = health >= 78 ? "Healthy" : health >= 62 ? "Balanced" : health >= 45 ? "Heavy" : "Treat";
  const diet = (food.diet_tags || []).includes("pork")
    ? "contains pork"
    : (food.diet_tags || []).includes("halal_friendly")
      ? "halal-friendly"
      : "check diet fit";
  return { calories, health, label, diet };
}

function calorieScore(food) {
  const { calories } = nutritionProfile(food);
  const period = currentMealPeriod();
  const target = {
    late_night: [120, 420],
    breakfast: [280, 560],
    lunch: [450, 760],
    merienda: [150, 430],
    dinner: [420, 720],
  }[period] || [250, 700];
  if (calories >= target[0] && calories <= target[1]) return 96;
  const distance = calories < target[0] ? target[0] - calories : calories - target[1];
  return clampNumber(92 - distance / 7, 28, 92);
}

function recommendationReason(food, store = null) {
  const profileReasons = decisionProfile(food).reasons;
  const storeRating = store ? getUserStoreRating(store.id) : 0;
  const reasonLabels = profileReasons
    .filter((reason) => !(storeRating && storeRating <= 2 && reason.key === "rating"))
    .map((reason) => reason.label);

  if (storeRating && storeRating <= 2) {
    reasonLabels.unshift(`your low ${storeRating}/5 store rating`);
  } else if (storeRating && storeRating >= 4) {
    reasonLabels.unshift(`your ${storeRating}/5 store rating`);
  }

  return [...new Set(reasonLabels)].slice(0, 3).join(", ") || "matches your current filters";
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function historyInsights() {
  const week = thisWeekHistory();
  const today = todayHistory();
  const recentIds = new Set(getHistory().slice(0, 4).map((item) => Number(item.id)));
  const categories = {};
  const restaurants = {};
  week.forEach((item) => {
    const food = state.foods.find((candidate) => candidate.id === Number(item.id));
    if (food?.category) categories[food.category] = (categories[food.category] || 0) + 1;
    if (item.restaurant) restaurants[item.restaurant] = (restaurants[item.restaurant] || 0) + 1;
  });
  return { week, today, recentIds, categories, restaurants };
}

function mealPeriodScore(food) {
  const period = currentMealPeriod();
  if (period === "late_night") {
    if (food.category === "coffee_drinks" || food.category === "snacks") return 84;
    if (food.feature_tags?.includes("open_late")) return 78;
    return 38;
  }
  if (period === "breakfast") {
    if (food.category === "coffee_drinks") return 96;
    if (food.category === "snacks") return 82;
    return 62;
  }
  if (period === "lunch" || period === "dinner") {
    if (["rice_meals", "chicken", "unli_rice"].includes(food.category)) return 96;
    if (["dimsum", "street_food"].includes(food.category)) return 78;
    return 58;
  }
  if (["snacks", "coffee_drinks", "dimsum", "street_food"].includes(food.category)) return 94;
  return 70;
}

function decisionProfile(food) {
  const health = budgetHealth();
  const insights = historyInsights();
  const price = averagePrice(food);
  const nutrition = nutritionProfile(food);
  const remaining = health.weekly ? Math.max(0, health.remaining) : 0;
  const walk = Number(food.walking_minutes || 0);
  const openStatus = openStatusFor(food);
  const userFoodRating = getUserFoodRating(food.id);
  const publicRating = publicRatingForFood(food.id)?.average || food.rating;
  const favoriteTypes = getJson(FAVORITES_KEY, []);

  const budgetScore = !health.weekly
    ? clampNumber(100 - price / 3, 45, 92)
    : remaining <= 0
      ? 0
      : remaining < MIN_SNACK_BUDGET
        ? (price <= remaining ? 40 : 4)
        : remaining < MIN_MEAL_BUDGET && price > remaining
          ? 12
      : clampNumber(100 - (price / Math.max(remaining, 1)) * 70, 12, 100);
  const distanceScore = clampNumber(106 - walk * 14, 18, 100);
  const ratingValue = userFoodRating || publicRating || 4;
  const ratingScore = clampNumber((ratingValue / 5) * 100, userFoodRating ? 20 : 45, 100);
  const timeScore = mealPeriodScore(food);
  const nutritionScore = (nutrition.health * 0.68) + (calorieScore(food) * 0.32);
  const freshnessScore = insights.recentIds.has(food.id) ? 18 : 88;
  const preferenceScore = favoriteTypes.includes(food.category)
    ? 96
    : insights.categories[food.category]
      ? 84
      : 70;
  const openScore = openStatus.isOpen === false ? 20 : openStatus.isOpen === true ? 100 : 74;

  let total = (
    budgetScore * DECISION_WEIGHTS.budget
    + distanceScore * DECISION_WEIGHTS.distance
    + ratingScore * DECISION_WEIGHTS.rating
    + nutritionScore * DECISION_WEIGHTS.nutrition
    + timeScore * DECISION_WEIGHTS.time
    + freshnessScore * DECISION_WEIGHTS.freshness
    + preferenceScore * DECISION_WEIGHTS.preference
    + openScore * DECISION_WEIGHTS.open
  );

  const selectedMoods = selectedValues("mood");
  if (selectedMoods.includes("tipid")) total += price <= 100 ? 8 : -8;
  if (selectedMoods.includes("nagmamadali")) total += walk <= 3 ? 8 : -walk;
  if (antiRepeatIds().includes(food.id)) total -= 24;
  if (currentMealPeriod() === "late_night" && nutrition.calories > 550) total -= 16;
  if (openStatus.isOpen === false) total -= 18;

  const reasonPool = [
    { key: "budget", score: budgetScore, label: health.weekly ? `leaves ${peso(Math.max(0, remaining - price))}` : `${peso(price)} average` },
    { key: "health", score: nutritionScore, label: `${nutrition.label}, ~${nutrition.calories} cal` },
    { key: "diet", score: nutrition.health, label: nutrition.diet },
    { key: "walk", score: distanceScore, label: walk <= 2 ? "super near" : `${walk} min walk` },
    {
      key: "rating",
      score: ratingScore,
      label: ratingValue >= 4.4
        ? "trusted rating"
        : ratingValue >= 3.7
          ? "good rating"
          : ratingValue >= 2.8
            ? "mixed rating"
            : "low rating",
    },
    { key: "time", score: timeScore, label: `fits ${mealPeriodLabel()}` },
    { key: "fresh", score: freshnessScore, label: insights.recentIds.has(food.id) ? "recently tried" : "not recently eaten" },
    { key: "pref", score: preferenceScore, label: preferenceScore >= 84 ? "matches your pattern" : "good variety" },
  ].sort((a, b) => b.score - a.score);

  return {
    total: Math.round(clampNumber(total, 0, 100)),
    reasons: reasonPool,
    budgetScore: Math.round(budgetScore),
    distanceScore: Math.round(distanceScore),
    ratingScore: Math.round(ratingScore),
    timeScore: Math.round(timeScore),
    nutritionScore: Math.round(nutritionScore),
    nutrition,
    price,
    walk,
    openStatus,
  };
}

function breakDecisionFor(food) {
  const available = Number(document.getElementById("timeAvailable")?.value || 0);
  const mealMinutes = Number(document.getElementById("mealMinutes")?.value || 0);
  if (!available || !food) return null;
  const roundTrip = (food.walking_minutes || 0) * 2;
  const total = roundTrip + mealMinutes;
  const spare = available - total;
  const tone = spare >= 5 ? "safe" : spare >= 0 ? "tight" : "risky";
  const label = spare >= 5 ? "Safe before class" : spare >= 0 ? "Tight but doable" : "Risky for this break";
  return { available, mealMinutes, roundTrip, total, spare, tone, label };
}

function fitBreakdown(profile) {
  return [
    ["Budget", profile.budgetScore],
    ["Walk", profile.distanceScore],
    ["Rating", profile.ratingScore],
    ["Health", profile.nutritionScore],
  ].map(([label, score]) => `<span>${label} ${score}</span>`).join("");
}

function renderClassBreakBrief(stores) {
  const brief = document.getElementById("classBreakBrief");
  if (!brief) return;
  const available = Number(document.getElementById("timeAvailable")?.value || 0);
  const mealMinutes = Number(document.getElementById("mealMinutes")?.value || 20);
  if (!available) {
    brief.textContent = "Add break minutes to see safe, tight, and risky picks.";
    return;
  }
  const safe = stores.filter((store) => ((store.walking_minutes || 0) * 2 + mealMinutes) <= available).length;
  const tight = stores.filter((store) => {
    const total = (store.walking_minutes || 0) * 2 + mealMinutes;
    return total > available && total <= available + 5;
  }).length;
  brief.textContent = `${safe} safe pick${safe === 1 ? "" : "s"} for a ${available} min break${tight ? `, ${tight} tight` : ""}.`;
}

function renderDecisionCoach(stores) {
  const panel = document.getElementById("decisionCoach");
  if (!panel) return;
  if (!stores.length) {
    panel.innerHTML = "";
    return;
  }
  const health = budgetHealth();
  const periodInfo = currentMealPeriodInfo();
  const currentLogs = currentPeriodHistory();
  if (currentLogs.length) {
    const latest = currentLogs[0];
    const loggedCalories = totalLoggedCalories(currentLogs);
    const restLine = periodInfo.period === "late_night"
      ? "You already ate this late. Water and rest are probably the better call."
      : `You already logged ${mealPeriodLabel(latest.mealPeriod)}. I will stay quiet unless you browse.`;
    panel.innerHTML = `
      <article class="saan-rest-card">
        <div class="saan-rest-icon">
          <i data-lucide="check"></i>
        </div>
        <div class="saan-rest-copy">
          <span>${periodInfo.displayTime} assistant</span>
          <strong>${mealPeriodLabel(latest.mealPeriod)} handled</strong>
          <p>${restLine}</p>
          <small>Last log: ${latest.name} at ${latest.restaurant}</small>
        </div>
        <div class="saan-rest-meta">
          <span>${peso(dailySpentTotal())} today</span>
          ${loggedCalories ? `<span>~${loggedCalories} cal</span>` : ""}
        </div>
        <a class="secondary-button compact-button" href="/tracker">
          <i data-lucide="wallet"></i>
          Tracker
        </a>
        <button class="icon-button suggestion-close" type="button" data-suggestion-close aria-label="Hide suggestion" title="Hide suggestion">
          <i data-lucide="x"></i>
        </button>
      </article>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }
  const rankedStores = stores.map((store) => ({
    store,
    food: store.menu[0],
    profile: decisionProfile(store.menu[0]),
  })).sort((a, b) => b.profile.total - a.profile.total);
  const best = rankedStores[0];
  const topStore = best.store;
  const topFood = best.food;
  const profile = best.profile;
  const nutrition = profile.nutrition;
  const breakInfo = breakDecisionFor(topStore);
  const mode = health.weekly && (health.remaining <= 180 || health.percent >= 0.75) ? "tipid" : "normal";
  const canAffordTopFood = !health.weekly || (health.remaining - averagePrice(topFood)) >= 0;
  const breakLine = health.weekly && !canAffordTopFood
    ? `Budget is tight. If you still need food, start with ${topStore.name} and pick carefully.`
    : breakInfo
      ? `${breakInfo.label}: ${topStore.name} needs about ${breakInfo.total} min total.`
      : `${periodInfo.label} pick: ${recommendationReason(topFood)}.`;
  const budgetPill = health.weekly ? `${peso(Math.max(0, health.remaining))} left` : "Set budget";
  const reasonChips = [
    `${nutrition.label}, ~${nutrition.calories} cal`,
    budgetPill,
  ].map((reason) => `<span>${reason}</span>`).join("");

  panel.innerHTML = `
    <article class="saan-iq-main ${mode}">
      <div class="saan-iq-ring" style="--score-pct:${profile.total}%;">
        <strong>${profile.total}</strong>
        <span>Fit</span>
      </div>
      <div class="saan-iq-copy">
        <span>${periodInfo.displayTime} best fit</span>
        <strong>${topStore.name}</strong>
        <p>${breakLine}</p>
        <div class="saan-iq-chips">${reasonChips}</div>
      </div>
      <button class="secondary-button compact-button" type="button" data-store-toggle="${topStore.id}">
        <i data-lucide="utensils"></i>
        Menu
      </button>
      <button class="icon-button suggestion-close" type="button" data-suggestion-close aria-label="Hide suggestion" title="Hide suggestion">
        <i data-lucide="x"></i>
      </button>
    </article>
  `;
  if (window.lucide) window.lucide.createIcons();
}

function budgetNote(food) {
  const { weekly, spent } = budgetHealth();
  if (!weekly) return "";
  const remaining = Math.max(0, weekly - spent);
  const after = remaining - averagePrice(food);
  if (after < 0) return "Over weekly budget";
  if (after < 100) return `${peso(after)} left after this`;
  return `Leaves ${peso(after)}`;
}

function foodFrames(food) {
  const frames = [...(food.frames || [])];
  const nutrition = nutritionProfile(food);
  if (getBookmarks().includes(food.id)) frames.unshift("Favorite");
  if (antiRepeatIds().includes(food.id)) frames.unshift("Recent");
  frames.push(`${nutrition.label} - ~${nutrition.calories} cal`);
  if (nutrition.health >= 78) frames.push("Healthier pick");
  const note = budgetNote(food);
  if (note) frames.push(note);
  return [...new Set(frames)].slice(0, 5);
}

function storeFrames(store) {
  const frames = [...(store.frames || [])];
  const nutrition = nutritionProfile(store.menu[0] || store);
  const openStatus = openStatusFor(store);
  const breakInfo = breakDecisionFor(store);
  if (openStatus.isOpen === true) frames.unshift("Open now");
  if (openStatus.isOpen === false) frames.push("Closed now");
  if (breakInfo?.tone === "safe") frames.unshift("Class-safe");
  if (breakInfo?.tone === "tight") frames.push("Tight break");
  if (breakInfo?.tone === "risky") frames.push("Risky break");
  if (getStoreBookmarks().includes(store.id)) frames.unshift("Favorite restaurant");
  if (store.menu.some((food) => getBookmarks().includes(food.id))) frames.unshift("Has saved item");
  if (store.menu.some((food) => antiRepeatIds().includes(food.id))) frames.unshift("Recently tried");
  if (getUserStoreRating(store.id)) frames.unshift(`Your ${getUserStoreRating(store.id)}/5`);
  if (store.feature_tags?.includes("open_late")) frames.push("Open late");
  if (store.feature_tags?.includes("aircon")) frames.push("Aircon");
  if (nutrition.health >= 78) frames.push("Healthy option");
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

function detailStatPill(icon, label, value, className = "") {
  return `
    <span class="detail-stat-pill ${className}">
      <i data-lucide="${icon}"></i>
      <small>${label}</small>
      <b>${value}</b>
    </span>
  `;
}

function menuItemTemplate(food) {
  const active = getBookmarks().includes(food.id);
  const foodLog = latestFoodLog(food.id);
  const eatenToday = Boolean(foodLog && foodLog.phDate === manilaParts().date);
  const nutrition = nutritionProfile(food);
  return `
    <li class="menu-item" data-menu-food-id="${food.id}">
      <div class="menu-copy">
        <strong>${food.name}</strong>
        <p>${food.description}</p>
        <p class="nutrition-line">${nutrition.label} - about ${nutrition.calories} cal - ${nutrition.diet}</p>
      </div>
      <div class="menu-controls">
        <span>${peso(food.price_min)}-${peso(food.price_max)}</span>
        <button class="icon-button ate-button ${eatenToday ? "active" : ""}" type="button" data-ate="${food.id}" aria-label="${eatenToday ? "Edit meal log for" : "Log"} ${food.name}" aria-pressed="${eatenToday}" title="${eatenToday ? `Logged ${peso(foodLog.price)} today` : "Log eaten"}">
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
  const nutrition = nutritionProfile(food);
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
            <b>${peso(food.price_min)}-${peso(food.price_max)}</b>
          </div>
          <strong>${food.name}</strong>
          <p>${food.description}</p>
          <div class="detail-menu-pills">
            ${detailStatPill("heart-pulse", "Health", nutrition.label)}
            ${detailStatPill("flame", "Est.", `${nutrition.calories} cal`)}
            ${detailStatPill("shield-check", "Diet", nutrition.diet)}
            ${publicRating ? detailStatPill("star", "Rated", publicRating.average.toFixed(1)) : ""}
          </div>
          ${publicRating && publicReason ? `<p class="rating-reason"><i data-lucide="message-circle"></i> ${publicReason}</p>` : ""}
        </div>
        <div class="detail-menu-meta">
          <div class="rating-panel compact-rating">
            <span>${userRating ? `You rated ${userRating}/5` : "Rate"}</span>
            ${ratingStarsTemplate({ id: food.id, type: "food", value: userRating, label: `Rate ${food.name}` })}
          </div>
          <button class="icon-button ate-button ${eatenToday ? "active" : ""}" type="button" data-ate="${food.id}" aria-label="${eatenToday ? "Edit meal log for" : "Log"} ${food.name}" aria-pressed="${eatenToday}" title="${eatenToday ? `Logged ${peso(foodLog.price)} today` : "Log eaten"}">
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
  const breakInfo = breakDecisionFor(store);
  const decisionFood = store.menu[0];
  const nutrition = nutritionProfile(decisionFood);
  return `
    <article class="food-card store-card store-rail-card ${isOpen ? "open" : ""}" data-store-id="${store.id}">
      <div class="food-image store-rail-image">
        <img src="${image}" alt="">
        <span>${store.menu.length} items</span>
        <button class="store-save-dot ${storeSaved ? "active" : ""}" type="button" data-store-bookmark="${store.id}" title="${storeSaved ? "Saved restaurant" : "Save restaurant"}" aria-label="${storeSaved ? "Remove restaurant bookmark for" : "Bookmark restaurant"} ${store.name}" aria-pressed="${storeSaved}">
          <i data-lucide="heart"></i>
        </button>
      </div>
      <div class="food-body">
        <div class="store-rail-title">
          <h3>${store.name}</h3>
          <p>${formatLabel(store.area)} - ${store.menu.map((food) => categoryLabel(food.category)).slice(0, 2).join(", ")}</p>
        </div>
        <div class="food-frames">
          ${frames.map((frame) => `<span>${frame}</span>`).join("")}
        </div>
        <div class="food-meta">
          <span><small>Menu</small>${store.menu.length} items</span>
          <span><small>Walk</small>${store.walking_minutes} min</span>
          <span><small>Health</small>${nutrition.label}</span>
          <span class="rating-meta"><small>${displayRatingLabel}</small><b><i data-lucide="star"></i>${displayRating.toFixed(1)}</b></span>
        </div>
        <div class="open-status ${openStatus.className}">
          <i data-lucide="${openStatus.isOpen ? "door-open" : "door-closed"}"></i>
          <strong>${openStatus.label}</strong>
          <span>${openStatus.detail}</span>
        </div>
        <div class="why-pick ${breakInfo?.tone || ""}">
          <i data-lucide="${breakInfo ? "timer" : "sparkles"}"></i>
          <span>${breakInfo ? `${breakInfo.label} - ${breakInfo.total} min total` : `Why: ${recommendationReason(decisionFood, store)}`}</span>
        </div>
        <div class="rating-panel store-card-rating">
          <span>${userRating ? `Your rating: ${userRating}/5` : "Rate store"}</span>
          ${ratingStarsTemplate({ id: store.id, type: "store", value: userRating, label: `Rate ${store.name}` })}
          <p class="rating-reason">${ratingReasonText(userRatingEntry, publicRatingReason(store.id) || "Based on the starting dataset until real ratings are added.")}</p>
        </div>
        <div class="card-actions">
          <span class="pill price-pill">
            <small>Price</small>
            <strong>${peso(store.price_min)}-${peso(store.price_max)}</strong>
          </span>
          <button class="secondary-button compact-button" type="button" data-store-toggle="${store.id}" aria-expanded="${isOpen}" aria-label="${isOpen ? "Hide menu for" : "View menu for"} ${store.name}">
            <i data-lucide="${isOpen ? "panel-right-open" : "utensils"}"></i>
            ${isOpen ? "Viewing" : "View menu"}
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
  const breakInfo = breakDecisionFor(store);
  const nutrition = nutritionProfile(store.menu[0] || store);
  const openLabel = openStatus.isOpen ? openStatus.detail : openStatus.detail;
  return `
    <div class="menu-detail-header">
      <img src="${foodImageFor(store)}" alt="">
      <div>
        <span>${formatLabel(store.area)}</span>
        <strong>${store.name}</strong>
        <div class="menu-detail-stats">
          ${detailStatPill("utensils", "Menu", `${store.menu.length}`)}
          ${detailStatPill("footprints", "Walk", `${store.walking_minutes} min`)}
          ${detailStatPill("star", ratingSource, displayRating.toFixed(1), "rating")}
          ${detailStatPill("flame", "Best est.", `${nutrition.calories} cal`)}
          ${detailStatPill(openStatus.isOpen ? "door-open" : "door-closed", openStatus.label, openLabel, openStatus.className)}
          ${detailStatPill("wallet", "Range", `${peso(store.price_min)}-${peso(store.price_max)}`)}
        </div>
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
        <span>Quick read</span>
        <strong><i data-lucide="sparkles"></i> ${displayRating.toFixed(1)} ${ratingSource.toLowerCase()}</strong>
        <p>${ratingReasonText(userRatingEntry, publicReason || "Looks usable based on the starting store data. Rate it after trying so Saan learns your taste.")}</p>
        ${breakInfo ? `<p class="break-detail ${breakInfo.tone}">${breakInfo.label}: ${breakInfo.roundTrip} min walking + ${breakInfo.mealMinutes} min eating = ${breakInfo.total} min.</p>` : ""}
      </div>
      <div class="rating-panel">
        <span>${userRating ? `You rated ${userRating}/5` : "Rate store"}</span>
        ${ratingStarsTemplate({ id: store.id, type: "store", value: userRating, label: `Rate ${store.name}` })}
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
      let total = decisionProfile(food).total;
      total += normalizedRatingEntry(foodRatings[String(food.id)]).score * 8;
      total += normalizedRatingEntry(storeRatings[storeIdFor(food.restaurant)]).score * 5;
      const openStatus = openStatusFor(food);
      if (openStatus.isOpen === true) total += 10;
      if (openStatus.isOpen === false) total -= 18;
      if (favorites.includes(food.category)) total += 12;
      if (hotMood) total -= food.price_max / 16;
      if (treatMood) total += food.price_min >= 100 ? 8 : 0;
      if (rushMood) total -= (food.walking_minutes || 0) * 2;
      const health = budgetHealth();
      if (health.weekly && (health.remaining <= 180 || health.percent >= 0.75)) {
        total -= food.price_max / 8;
        if (food.price_max <= 100) total += 14;
      }
      const breakInfo = breakDecisionFor(food);
      if (breakInfo?.tone === "safe") total += 16;
      if (breakInfo?.tone === "tight") total += 3;
      if (breakInfo?.tone === "risky") total -= 28;
      if (historyIds.includes(food.id)) total -= 100;
      return total;
    };
    return score(b) - score(a);
  });
}

function renderFoods(foods) {
  const results = document.getElementById("results");
  const resultCount = document.getElementById("resultCount");
  const shopsPanel = document.querySelector(".shops-panel");
  const isInitialLoad = !state.hasLoadedFoods && !foods.length;
  if (state.isLoading || isInitialLoad) {
    if (resultCount) resultCount.textContent = state.showingBookmarks ? "Loading saved stores..." : "Loading stores...";
    shopsPanel?.classList.add("is-loading");
    results?.classList.remove("is-refreshing");
    document.querySelectorAll("[data-store-scroll], [data-category-scroll]").forEach((button) => {
      button.hidden = true;
    });
    if (results && (!results.children.length || isInitialLoad)) {
      results.innerHTML = Array.from({ length: 4 }, () => `<div class="food-card store-rail-card skeleton-card"></div>`).join("");
    } else {
      results?.classList.add("is-refreshing");
    }
    return;
  }
  results.classList.remove("is-refreshing");
  shopsPanel?.classList.remove("is-loading");

  const ranked = applyClientRanking(foods);
  const foodBookmarks = getBookmarks();
  const storeBookmarks = getStoreBookmarks();
  const visible = state.showingBookmarks
    ? ranked.filter((food) => foodBookmarks.includes(food.id) || storeBookmarks.includes(storeIdFor(food.restaurant)))
    : ranked;
  const stores = groupFoodsByStore(visible);
  const paged = stores;

  results.innerHTML = paged.length
    ? paged.map(storeCardTemplate).join("")
    : `<div class="pick-result"><h2>No matches yet</h2><p>Adjust the filters, time window, budget, or anti-repeat setting.</p></div>`;
  renderMenuDetail(stores);

  if (resultCount) resultCount.textContent = state.showingBookmarks
    ? `${stores.length} saved store${stores.length === 1 ? "" : "s"}`
    : `${stores.length} store${stores.length === 1 ? "" : "s"}`;
  updateRailButtons("results", "[data-store-scroll]");
  updateRailButtons("categoryRail", "[data-category-scroll]");
  updateBookmarkToggle();
  renderDecisionCoach(stores);
  renderClassBreakBrief(stores);
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
  if (after < 0) return `This meal puts you ${peso(Math.abs(after))} over your weekly budget.`;
  if (after < MIN_SNACK_BUDGET) return `After this meal, only ${peso(after)} remains. That is below a realistic food budget.`;
  if (after < MIN_MEAL_BUDGET) return `After this meal, ${peso(after)} remains. Treat it as snack or emergency money.`;
  if (after < 120) return `This leaves about ${peso(after)} for the rest of the week.`;
  return `After this meal, you still have about ${peso(after)} left this week.`;
}

function closeMealLogDialog() {
  document.getElementById("mealLogDialog")?.close();
}

function openMealLogDialog(food, entry = null) {
  const dialog = document.getElementById("mealLogDialog");
  if (!dialog || !food) return;
  if (dialog.open) dialog.close();
  const nutrition = nutritionProfile(food);
  document.getElementById("mealLogFoodId").value = String(food.id);
  document.getElementById("mealLogEntryId").value = entry?.entryId || "";
  document.getElementById("mealLogTitle").textContent = entry ? "Edit meal" : "Log meal";
  document.getElementById("mealLogFoodName").textContent = food.name;
  document.getElementById("mealLogRestaurant").textContent = food.restaurant;
  document.getElementById("mealLogSuggestion").textContent = `Suggested: ${peso(food.price_min)}-${peso(food.price_max)} - about ${nutrition.calories} cal - ${nutrition.label}`;
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
    state.hasLoadedFoods = true;
    state.isLoading = false;
    renderFoods(state.foods);
  }
}

function logFood(food, options = {}) {
  const now = new Date();
  const manila = manilaParts(now);
  const nutrition = nutritionProfile(food);
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
    mealPeriod: mealPeriodForTime(manila.time),
    calories: nutrition.calories,
    healthLabel: nutrition.label,
    weekKey: manilaWeekKey(manila.date),
    loggedAt: now.toISOString(),
  };
  upsertHistoryEntry(entry);
  renderFoods(state.foods);
  showToast(`${options.entryId ? "Updated" : "Logged"} ${food.name}: ${peso(entry.price)}, about ${entry.calories} cal.`);
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
  const lastAte = document.getElementById("lastAte");
  document.getElementById("todaySpent").textContent = peso(dailySpentTotal());
  document.getElementById("weekSpent").textContent = peso(weeklySpentTotal());
  document.getElementById("streakCount").textContent = `${streakDays()} day${streakDays() === 1 ? "" : "s"}`;
  if (lastAte) {
    lastAte.textContent = history[0] ? history[0].name : "No food yet";
    lastAte.title = history[0]
      ? `${history[0].name} at ${history[0].restaurant} - ${mealTimeLabel(history[0])}`
      : "No food logged yet";
  }
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
  if (spentLabel) spentLabel.textContent = `${peso(spent)} spent`;
  if (remainingLabel) remainingLabel.textContent = weekly ? `${peso(Math.max(0, weekly - spent))} left` : "Set a budget";
  if (bar) {
    const percent = weekly ? Math.min(100, Math.round((spent / weekly) * 100)) : 0;
    bar.style.width = `${percent}%`;
    const remaining = weekly - spent;
    bar.classList.toggle("warning", weekly > 0 && remaining >= MIN_SNACK_BUDGET && (remaining < MIN_MEAL_BUDGET || (percent >= 75 && percent < 100)));
    bar.classList.toggle("danger", weekly > 0 && (percent >= 100 || remaining < MIN_SNACK_BUDGET));
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
              <b>${peso(item.price)}</b>
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
      ? `You logged ${peso(spent)} this week. Set a weekly budget to track what is left.`
      : "Set a weekly budget to see smarter spending notes.";
    return;
  }
  const remaining = Math.max(0, weekly - spent);
  if (!food) {
    if (weekly - spent < 0) {
      insight.textContent = `You are ${peso(Math.abs(weekly - spent))} over budget this week.`;
    } else if (remaining < MIN_SNACK_BUDGET) {
      insight.textContent = `${peso(remaining)} left is below a realistic food budget.`;
    } else if (remaining < MIN_MEAL_BUDGET) {
      insight.textContent = `Only ${peso(remaining)} left. Treat this as snack or emergency money.`;
    } else {
      insight.textContent = `You have ${peso(remaining)} left this week.`;
    }
    return;
  }
  const after = remaining - averagePrice(food);
  if (after < 0) {
    insight.textContent = `${food.name} would put you over budget. Try a cheaper canteen or snack option.`;
  } else if (after < MIN_SNACK_BUDGET) {
    insight.textContent = `${food.name} leaves only ${peso(after)}, below a realistic food budget.`;
  } else if (after < MIN_MEAL_BUDGET) {
    insight.textContent = `${food.name} leaves ${peso(after)}, which is snack/emergency money.`;
  } else {
    insight.textContent = `${food.name} leaves about ${peso(after)} for the rest of the week.`;
  }
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

function updateRailButtons(railId, buttonSelector) {
  const rail = document.getElementById(railId);
  if (!rail) return;
  const buttons = [...document.querySelectorAll(buttonSelector)];
  if (!buttons.length) return;
  const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
  const canScroll = maxScroll > 2;
  const atStart = rail.scrollLeft <= 2;
  const atEnd = rail.scrollLeft >= maxScroll - 2;
  buttons.forEach((button) => {
    const direction = Number(button.dataset.categoryScroll || button.dataset.storeScroll || 1);
    button.hidden = !canScroll || (direction < 0 ? atStart : atEnd);
  });
}

function setupRailControls(railId, buttonSelector, stepRatio) {
  const rail = document.getElementById(railId);
  if (!rail) return;
  const buttons = [...document.querySelectorAll(buttonSelector)];
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const direction = Number(button.dataset.categoryScroll || button.dataset.storeScroll || 1);
      rail.scrollBy({ left: direction * Math.max(rail.clientWidth * stepRatio, 220), behavior: "smooth" });
      window.setTimeout(() => updateRailButtons(railId, buttonSelector), 220);
    });
  });
  rail.addEventListener("scroll", () => updateRailButtons(railId, buttonSelector), { passive: true });
  window.addEventListener("resize", () => updateRailButtons(railId, buttonSelector));
  window.setTimeout(() => updateRailButtons(railId, buttonSelector), 50);
}

function setupFilters() {
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

  document.querySelectorAll("[data-weather-choice]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.classList.contains("active")));
    button.addEventListener("click", () => {
      const weather = document.getElementById("weather");
      if (!weather) return;
      weather.value = button.dataset.weatherChoice || "auto";
      state.weatherMode = weather.value;
      updateWeatherTiles(weather.value);
      state.showingBookmarks = false;
      state.visibleLimit = 12;
      loadFoods();
    });
  });
  updateWeatherTiles();

  setupRailControls("categoryRail", "[data-category-scroll]", 0.72);
  setupRailControls("results", "[data-store-scroll]", 0.82);

  ["campus", "budget", "area", "sort", "weather", "antiRepeat", "timeAvailable", "mealMinutes"].forEach((id) => {
    const control = document.getElementById(id);
    if (!control) return;
    control.addEventListener("change", () => {
      state.weatherMode = document.getElementById("weather").value;
      if (id === "weather") updateWeatherTiles(state.weatherMode);
      if (id === "timeAvailable") setJson("saanTimeAvailable", document.getElementById("timeAvailable").value);
      if (id === "mealMinutes") setJson("saanMealMinutes", document.getElementById("mealMinutes").value);
      state.showingBookmarks = false;
      state.visibleLimit = 12;
      loadFoods();
    });
  });

  document.querySelectorAll("[data-break-minutes]").forEach((button) => {
    button.addEventListener("click", () => {
      const minutes = button.dataset.breakMinutes;
      const timeInput = document.getElementById("timeAvailable");
      const mealInput = document.getElementById("mealMinutes");
      if (!timeInput || !mealInput) return;
      timeInput.value = minutes;
      mealInput.value = Number(minutes) <= 10 ? "5" : "15";
      document.getElementById("sort").value = "distance";
      setJson("saanTimeAvailable", minutes);
      setJson("saanMealMinutes", mealInput.value);
      document.querySelectorAll("[data-break-minutes]").forEach((item) => item.classList.toggle("active", item === button));
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
    updateWeatherTiles("auto");
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

  document.getElementById("toggleMap")?.addEventListener("click", () => {
    setFloatingMapOpen(!document.body.classList.contains("map-helper-open"));
  });

  document.getElementById("closeFloatingMap")?.addEventListener("click", () => {
    setFloatingMapOpen(false);
  });

  document.getElementById("toggleSuggestion")?.addEventListener("click", () => {
    setSuggestionOpen(!document.body.classList.contains("suggestion-helper-open"));
  });

  document.getElementById("decisionCoach")?.addEventListener("click", (event) => {
    if (event.target.closest("[data-suggestion-close]")) {
      setSuggestionOpen(false);
      return;
    }
    const button = event.target.closest("[data-store-toggle]");
    if (!button) return;
    state.selectedStoreId = button.dataset.storeToggle;
    renderFoods(state.foods);
    window.selectFoodOnMap?.(state.selectedStoreId, true);
  });

  document.getElementById("heroPickForMe")?.addEventListener("click", () => {
    document.getElementById("pickForMe")?.click();
    document.getElementById("pickResult")?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  document.getElementById("openComboFinder")?.addEventListener("click", openComboDialog);
  document.getElementById("closeComboDialog")?.addEventListener("click", closeComboDialog);
  document.getElementById("comboDialog")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeComboDialog();
  });
  document.getElementById("comboForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const amount = Number(document.getElementById("comboBudgetAmount")?.value || 0);
    if (!amount || amount < 1) {
      showToast("Add your budget first.");
      return;
    }
    setJson(COMBO_BUDGET_KEY, amount);
    renderComboResults(amount);
  });
  document.getElementById("comboResults")?.addEventListener("click", (event) => {
    const storeButton = event.target.closest("[data-combo-store]");
    const addButton = event.target.closest("[data-combo-add]");
    const removeButton = event.target.closest("[data-combo-remove]");
    const clearButton = event.target.closest("[data-combo-clear]");
    if (storeButton) {
      openStoreFromCombo(storeButton.dataset.comboStore);
      return;
    }
    if (addButton) {
      const id = Number(addButton.dataset.comboAdd);
      if (!state.customComboIds.includes(id)) state.customComboIds.push(id);
      const amount = Number(document.getElementById("comboBudgetAmount")?.value || 0);
      renderComboResults(amount);
      return;
    }
    if (removeButton) {
      const id = Number(removeButton.dataset.comboRemove);
      state.customComboIds = state.customComboIds.filter((itemId) => itemId !== id);
      const amount = Number(document.getElementById("comboBudgetAmount")?.value || 0);
      renderComboResults(amount);
      return;
    }
    if (clearButton) {
      state.customComboIds = [];
      const amount = Number(document.getElementById("comboBudgetAmount")?.value || 0);
      renderComboResults(amount);
    }
  });
  document.querySelectorAll("[data-combo-budget]").forEach((button) => {
    button.addEventListener("click", () => {
      const amount = Number(button.dataset.comboBudget || 0);
      document.getElementById("comboBudgetAmount").value = String(amount);
      setJson(COMBO_BUDGET_KEY, amount);
      renderComboResults(amount);
    });
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
      if (!isClosing) setFloatingMapOpen(false);
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
  setFloatingMapOpen(false);
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
