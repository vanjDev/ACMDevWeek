const state = {
  foods: [],
  showingBookmarks: false,
  visibleLimit: 12,
};

const DEFAULT_RADIUS = 1200;

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

function selectedValues(filterName) {
  return [...document.querySelectorAll(`[data-filter="${filterName}"] .chip.active`)].map((chip) => chip.dataset.value);
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

function buildParams() {
  const params = new URLSearchParams();
  const budget = document.getElementById("budget").value;
  const area = document.getElementById("area").value;
  const q = document.getElementById("foodSearch").value.trim();

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

  const categories = selectedValues("category");
  const moods = selectedValues("mood");
  if (categories.length) params.set("category", categories.join(","));
  if (moods.length) params.set("mood", moods.join(","));

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

function cardTemplate(food) {
  const bookmarks = getBookmarks();
  const active = bookmarks.includes(food.id);
  const image = food.image_url || categoryImages[food.category] || categoryImages.snacks;
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
        <div class="food-meta">
          <span><small>Price</small>PHP ${food.price_min}-${food.price_max}</span>
          <span><small>Walk</small>${food.walking_minutes} min</span>
          <span><small>Rating</small>${food.rating.toFixed(1)}</span>
        </div>
        <div class="card-actions">
          <span class="pill">${Math.round(food.distance_m)}m - ${formatLabel(food.area)}</span>
          <button class="icon-button bookmark ${active ? "active" : ""}" type="button" data-bookmark="${food.id}" aria-label="Bookmark ${food.name}" title="Bookmark">
            <i data-lucide="heart"></i>
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderFoods(foods) {
  const results = document.getElementById("results");
  const visible = state.showingBookmarks
    ? foods.filter((food) => getBookmarks().includes(food.id))
    : foods;
  const paged = visible.slice(0, state.visibleLimit);

  results.innerHTML = paged.length
    ? paged.map(cardTemplate).join("")
    : `<div class="pick-result"><h2>No matches yet</h2><p>Adjust the filters or clear bookmarks.</p></div>`;

  document.getElementById("resultCount").textContent = `${Math.min(state.visibleLimit, visible.length)} of ${visible.length} spot${visible.length === 1 ? "" : "s"}`;
  const loadMore = document.getElementById("loadMore");
  loadMore.hidden = state.visibleLimit >= visible.length;
  if (window.lucide) window.lucide.createIcons();
  updateMap(paged, document.getElementById("campus").value, DEFAULT_RADIUS);
}

async function loadFoods() {
  const params = buildParams();
  const response = await fetch(`/api/foods?${params.toString()}`);
  state.foods = await response.json();
  renderFoods(state.foods);
}

function setupFilters() {
  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      chip.classList.toggle("active");
      state.showingBookmarks = false;
      state.visibleLimit = 12;
      loadFoods();
    });
  });

  ["campus", "budget", "area", "sort"].forEach((id) => {
    document.getElementById(id).addEventListener("change", () => {
      state.showingBookmarks = false;
      state.visibleLimit = 12;
      loadFoods();
    });
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
    state.showingBookmarks = false;
    state.visibleLimit = 12;
    loadFoods();
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

  document.getElementById("heroPickForMe")?.addEventListener("click", () => {
    document.getElementById("pickForMe")?.click();
    document.getElementById("pickResult")?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  document.getElementById("results").addEventListener("click", (event) => {
    const button = event.target.closest("[data-bookmark]");
    if (!button) return;
    const id = Number(button.dataset.bookmark);
    const bookmarks = getBookmarks();
    const next = bookmarks.includes(id) ? bookmarks.filter((item) => item !== id) : [...bookmarks, id];
    await setBookmarks(next);
    renderFoods(state.foods);
  });
}

window.addEventListener("saan:auth-changed", () => renderFoods(state.foods));

document.addEventListener("DOMContentLoaded", async () => {
  await window.SaanAuth?.ready;
  setupFilters();
  loadFoods();
});
