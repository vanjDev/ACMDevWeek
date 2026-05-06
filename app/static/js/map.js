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
  return `${food.name} - ${food.restaurant} - PHP ${food.price_min}-${food.price_max}`;
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

function updateMap(foods, campusKey) {
  const markerLayer = document.getElementById("mapFoodMarkers");
  const summary = document.getElementById("mapSummary");
  if (!markerLayer || !summary) return;

  const visibleFoods = foods.slice(0, 24);
  markerLayer.innerHTML = visibleFoods.map((food, index) => {
    const point = mapPoint(food.latitude, food.longitude);
    return `
      <button
        class="map-food-dot"
        type="button"
        style="left:${point.x}%;top:${point.y}%;--delay:${index * 16}ms;"
        data-food-target="${food.id}"
        aria-label="${markerLabel(food)}"
        title="${markerLabel(food)}"
      >
        <span>${index + 1}</span>
      </button>
    `;
  }).join("");

  summary.textContent = `${visibleFoods.length} nearby picks`;

  markerLayer.querySelectorAll("[data-food-target]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector(`[data-food-id="${button.dataset.foodTarget}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  });
}

document.addEventListener("DOMContentLoaded", initSaanMap);
