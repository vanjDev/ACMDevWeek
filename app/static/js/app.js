const state = {
  foods: [],
  showingBookmarks: false,
  visibleLimit: 12,
  weatherMode: "auto",
  isLoading: false,
};

const DEFAULT_RADIUS = 1200;
const HISTORY_KEY = "saanFoodHistory";
const FAVORITES_KEY = "saanFavoriteTypes";
const BUDGET_KEY = "saanWeeklyBudget";

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
  return window.SaanAuth ? window.SaanAuth.getBookmarks() : JSON.parse(localStorage.getItem("saanBookmarks") || "[]");
}

async function setBookmarks(ids) {
  if (window.SaanAuth) {
    await window.SaanAuth.setBookmarks(ids);
    return;
  }
  localStorage.setItem("saanBookmarks", JSON.stringify(ids));
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

function cardTemplate(food) {
  const bookmarks = getBookmarks();
  const active = bookmarks.includes(food.id);
  const image = food.image_url || categoryImages[food.category] || categoryImages.snacks;
  const frames = foodFrames(food);
  const dietTags = food.diet_tags || [];
  const featureTags = food.feature_tags || [];
  return `
    <article class="food-card" data-food-id="${food.id}">
      <div class="food-image">
        <img src="${image}" alt="">
        <span>${categoryLabel(food.category)}</span>
      </div>
      <div class="food-body">
        <div>
          <h3>${food.name}</h3>
          <p>${food.restaurant}</p>
        </div>
        <div class="food-frames">
          ${frames.map((frame) => `<span>${frame}</span>`).join("")}
          ${dietTags.includes("pork") ? `<span class="warning-frame">Pork</span>` : ""}
          ${dietTags.includes("halal_friendly") ? `<span class="halal-frame">Halal-friendly</span>` : ""}
          ${featureTags.includes("open_late") ? `<span>Open late</span>` : ""}
          ${featureTags.includes("aircon") ? `<span>Aircon</span>` : ""}
        </div>
        <div class="food-meta">
          <span><small>Price</small>PHP ${food.price_min}-${food.price_max}</span>
          <span><small>Walk</small>${food.walking_minutes} min</span>
          <span><small>Rating</small>${food.rating.toFixed(1)}</span>
        </div>
        <div class="card-actions">
          <span class="pill">${Math.round(food.distance_m)}m - ${formatLabel(food.area)}</span>
          <button class="icon-button ate-button" type="button" data-ate="${food.id}" aria-label="Log ${food.name}" title="Log eaten">
            <i data-lucide="utensils"></i>
          </button>
          <button class="icon-button bookmark ${active ? "active" : ""}" type="button" data-bookmark="${food.id}" aria-label="Bookmark ${food.name}" title="Bookmark">
            <i data-lucide="heart"></i>
          </button>
        </div>
      </div>
    </article>
  `;
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
      if (getBookmarks().includes(food.id)) total += 8;
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
  const visible = state.showingBookmarks
    ? ranked.filter((food) => getBookmarks().includes(food.id))
    : ranked;
  const paged = visible.slice(0, state.visibleLimit);

  results.innerHTML = paged.length
    ? paged.map(cardTemplate).join("")
    : `<div class="pick-result"><h2>No matches yet</h2><p>Adjust the filters, time window, budget, or anti-repeat setting.</p></div>`;

  document.getElementById("resultCount").textContent = `${Math.min(state.visibleLimit, visible.length)} of ${visible.length} spot${visible.length === 1 ? "" : "s"}`;
  const loadMore = document.getElementById("loadMore");
  loadMore.hidden = state.visibleLimit >= visible.length;
  if (window.lucide) window.lucide.createIcons();
  updateMap(paged, document.getElementById("campus").value, DEFAULT_RADIUS);
  updateBudgetInsight(paged[0]);
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

  document.getElementById("showBookmarks").addEventListener("click", () => {
    state.showingBookmarks = !state.showingBookmarks;
    state.visibleLimit = 12;
    renderFoods(state.foods);
  });

  document.getElementById("loadMore").addEventListener("click", () => {
    state.visibleLimit += 12;
    renderFoods(state.foods);
  });

  document.getElementById("clearHistory").addEventListener("click", () => {
    saveHistory([]);
    renderFoods(state.foods);
  });

  document.getElementById("scrollToMap").addEventListener("click", () => {
    document.getElementById("map")?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  document.getElementById("heroPickForMe")?.addEventListener("click", () => {
    document.getElementById("pickForMe")?.click();
    document.getElementById("pickResult")?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  document.getElementById("results").addEventListener("click", async (event) => {
    const bookmarkButton = event.target.closest("[data-bookmark]");
    const ateButton = event.target.closest("[data-ate]");
    const card = event.target.closest("[data-food-id]");
    if (bookmarkButton) {
      const id = Number(bookmarkButton.dataset.bookmark);
      const bookmarks = getBookmarks();
      const next = bookmarks.includes(id) ? bookmarks.filter((item) => item !== id) : [...bookmarks, id];
      await setBookmarks(next);
      showToast(next.includes(id) ? "Saved to bookmarks." : "Removed from bookmarks.");
      renderFoods(state.foods);
    }
    if (ateButton) {
      const food = state.foods.find((item) => item.id === Number(ateButton.dataset.ate));
      if (food) logFood(food);
    } else if (card) {
      window.selectFoodOnMap?.(card.dataset.foodId, false);
    }
  });
}

async function detectWeather() {
  const select = document.getElementById("weather");
  if (!select || select.value !== "auto") return;
  try {
    const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=14.6042&longitude=120.9882&current=temperature_2m,precipitation,weather_code");
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
  }
}

window.addEventListener("saan:auth-changed", () => {
  restorePreferences();
  renderHabitStrip();
  renderFoods(state.foods);
});

document.addEventListener("DOMContentLoaded", async () => {
  await window.SaanAuth?.ready;
  restorePreferences();
  renderHabitStrip();
  updateBudgetInsight();
  setupFilters();
  await detectWeather();
  loadFoods();
});
