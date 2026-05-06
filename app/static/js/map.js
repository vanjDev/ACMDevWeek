const MAP_BOUNDS = {
  minLat: 14.60245,
  maxLat: 14.60525,
  minLng: 120.98735,
  maxLng: 120.99015,
};

const MAP_ANCHORS = [
  { key: "feu_tech", label: "FEU Tech", lat: 14.6042, lng: 120.9882 },
  { key: "feu_manila", label: "FEU Manila", lat: 14.6033, lng: 120.9892 },
  { key: "enb", label: "ENB", lat: 14.6047, lng: 120.9885 },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mapPoint(lat, lng) {
  const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 100;
  const y = ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100;
  return {
    x: clamp(x, 6, 94),
    y: clamp(y, 8, 92),
  };
}

function markerLabel(food) {
  return `${food.name} - PHP ${food.price_min}-${food.price_max}`;
}

function formatMapArea(value) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function initSaanMap() {
  const map = document.getElementById("map");
  if (!map) return;

  map.className = "campus-map";
  map.innerHTML = `
    <div class="campus-orbit orbit-outer"></div>
    <div class="campus-orbit orbit-inner"></div>
    <div class="map-street street-lerma"><span>Lerma</span></div>
    <div class="map-street street-campa"><span>P. Campa</span></div>
    <div class="map-street street-morayta"><span>Morayta</span></div>
    <div id="mapAnchors"></div>
    <div id="mapFoodMarkers"></div>
    <aside id="mapSelected" class="map-selected" hidden></aside>
    <div id="mapSummary" class="map-summary">Loading nearby picks...</div>
  `;

  const anchors = document.getElementById("mapAnchors");
  anchors.innerHTML = MAP_ANCHORS.map((anchor) => {
    const point = mapPoint(anchor.lat, anchor.lng);
    return `
      <button class="map-anchor ${anchor.key}" type="button" style="left:${point.x}%;top:${point.y}%;" title="${anchor.label}">
        <span>${anchor.label}</span>
      </button>
    `;
  }).join("");
}

function selectedMapMarkup(food, index) {
  return `
    <span>Selected Shop</span>
    <strong>${index + 1}. ${food.name}</strong>
    <p>${food.menu.length} menu items - PHP ${food.price_min}-${food.price_max} - ${food.walking_minutes} min walk</p>
    <button class="primary-button compact-button" type="button" data-map-view="${food.id}">
      View menu
    </button>
  `;
}

function selectFoodOnMap(foodId, shouldScroll = false) {
  const target = document.querySelector(`[data-store-id="${foodId}"]`);
  const foods = window.SaanMapFoods || [];
  const foodIndex = foods.findIndex((food) => String(food.id) === String(foodId));
  const selectedPanel = document.getElementById("mapSelected");
  if (selectedPanel && foodIndex >= 0) {
    selectedPanel.innerHTML = selectedMapMarkup(foods[foodIndex], foodIndex);
    selectedPanel.hidden = false;
  }

  document.querySelectorAll(".map-food-dot.active").forEach((pin) => pin.classList.remove("active"));
  document.querySelector(`[data-food-target="${foodId}"]`)?.classList.add("active");
  document.querySelectorAll(".store-card.map-selected-card").forEach((card) => card.classList.remove("map-selected-card"));

  if (target) {
    target.classList.add("map-selected-card");
    if (shouldScroll) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
}

function updateMap(foods, campusKey) {
  const markerLayer = document.getElementById("mapFoodMarkers");
  const summary = document.getElementById("mapSummary");
  const selectedPanel = document.getElementById("mapSelected");
  if (!markerLayer || !summary || !selectedPanel) return;

  const visibleFoods = foods.slice(0, 24);
  window.SaanMapFoods = visibleFoods;
  markerLayer.innerHTML = visibleFoods.map((food, index) => {
    const point = mapPoint(food.latitude, food.longitude);
    return `
      <button
        class="map-food-dot"
        type="button"
        style="left:${point.x}%;top:${point.y}%;--delay:${index * 16}ms;"
        data-food-target="${food.id}"
        data-food-index="${index}"
        aria-label="${markerLabel(food)}"
        title="${markerLabel(food)}"
      >
        <span>${index + 1}</span>
      </button>
    `;
  }).join("");

  summary.textContent = `${visibleFoods.length} nearby picks`;
  selectedPanel.hidden = !visibleFoods.length;
  if (visibleFoods.length) {
    selectedPanel.innerHTML = selectedMapMarkup(visibleFoods[0], 0);
    selectFoodOnMap(visibleFoods[0].id, false);
  }

  markerLayer.querySelectorAll("[data-food-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const food = visibleFoods[Number(button.dataset.foodIndex)];
      selectedPanel.innerHTML = selectedMapMarkup(food, Number(button.dataset.foodIndex));
      selectedPanel.hidden = false;
      selectFoodOnMap(button.dataset.foodTarget, true);
    });
  });

  selectedPanel.onclick = (event) => {
    const button = event.target.closest("[data-map-view]");
    if (!button) return;
    selectFoodOnMap(button.dataset.mapView, true);
    window.dispatchEvent(new CustomEvent("saan:store-open", { detail: { storeId: button.dataset.mapView } }));
  };
}

document.addEventListener("DOMContentLoaded", initSaanMap);
window.selectFoodOnMap = selectFoodOnMap;
