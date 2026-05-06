const MAP_BOUNDS = {
  minLat: 14.60245,
  maxLat: 14.60525,
  minLng: 120.98735,
  maxLng: 120.99015,
};

const MAP_ANCHORS = [
  { key: "feu_tech", label: "FEU Tech", lat: 14.6042, lng: 120.9882, x: 18, y: 73 },
  { key: "feu_manila", label: "FEU Manila", lat: 14.6033, lng: 120.9892, x: 44, y: 42 },
  { key: "enb", label: "Engineering", lat: 14.6047, lng: 120.9885, x: 57, y: 38 },
];

const MAP_ROADS = [
  { className: "road-quezon-west", label: "Quezon Blvd." },
  { className: "road-quezon-east", label: "Quezon Blvd." },
  { className: "road-recto", label: "Claro M. Recto" },
  { className: "road-nicanor", label: "Nicanor Reyes St." },
  { className: "road-lerma", label: "Lerma" },
  { className: "road-paredes", label: "P. Paredes St." },
  { className: "road-papa", label: "R. Papa St." },
];

const ROUTE_API = "https://router.project-osrm.org/route/v1/foot";
const routeCache = new Map();
let routeRequestId = 0;

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

function mapAnchorPoint(anchor) {
  return {
    x: anchor.x ?? mapPoint(anchor.lat, anchor.lng).x,
    y: anchor.y ?? mapPoint(anchor.lat, anchor.lng).y,
  };
}

function markerLabel(food) {
  return `${food.name} - PHP ${food.price_min}-${food.price_max}`;
}

function formatMapArea(value) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function campusLabel(campusKey) {
  return MAP_ANCHORS.find((anchor) => anchor.key === campusKey)?.label || "FEU";
}

function areaClass(value = "") {
  return `area-${value.replaceAll("_", "-") || "nearby"}`;
}

function mapIconForFood(food) {
  const name = `${food.name || ""} ${food.restaurant || ""}`.toLowerCase();
  if (food.category === "coffee_drinks" || name.includes("coffee") || name.includes("kopi") || name.includes("milk tea")) return "coffee";
  if (food.category === "snacks" || name.includes("potato") || name.includes("fries")) return "shopping-bag";
  return food.category ? "utensils" : "store";
}

function currentCampusPoint() {
  const campus = MAP_ANCHORS.find((anchor) => anchor.key === window.SaanMapCampus) || MAP_ANCHORS[0];
  return mapAnchorPoint(campus);
}

function currentStartPoint() {
  return window.SaanUserLocation
    ? mapPoint(window.SaanUserLocation.lat, window.SaanUserLocation.lng)
    : currentCampusPoint();
}

function currentStartCoordinates() {
  const campus = MAP_ANCHORS.find((anchor) => anchor.key === window.SaanMapCampus) || MAP_ANCHORS[0];
  return window.SaanUserLocation
    ? { lat: window.SaanUserLocation.lat, lng: window.SaanUserLocation.lng }
    : { lat: campus.lat, lng: campus.lng };
}

function fallbackRoutePoints(food) {
  const start = currentStartPoint();
  const end = mapPoint(food.latitude, food.longitude);
  const horizontalRoadY = food.area === "p_campa" ? 57 : food.area === "lerma" ? 62 : 47;
  const verticalRoadX = food.area === "near_feu_manila" ? 56 : 38;
  return [
    start,
    { x: start.x, y: horizontalRoadY },
    { x: verticalRoadX, y: horizontalRoadY },
    { x: verticalRoadX, y: end.y },
    end,
  ];
}

async function fetchWalkingRoutePoints(food) {
  const start = currentStartCoordinates();
  const cacheKey = `${start.lat.toFixed(6)},${start.lng.toFixed(6)}:${food.latitude.toFixed(6)},${food.longitude.toFixed(6)}`;
  if (routeCache.has(cacheKey)) return routeCache.get(cacheKey);

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 2800);
  try {
    const endpoint = `${ROUTE_API}/${start.lng},${start.lat};${food.longitude},${food.latitude}?overview=full&geometries=geojson&steps=false`;
    const response = await fetch(endpoint, { signal: controller.signal });
    if (!response.ok) throw new Error("Route API failed.");
    const data = await response.json();
    const coordinates = data.routes?.[0]?.geometry?.coordinates || [];
    if (coordinates.length < 2) throw new Error("Route API returned no path.");
    const points = coordinates.map(([lng, lat]) => mapPoint(lat, lng));
    routeCache.set(cacheKey, points);
    return points;
  } finally {
    window.clearTimeout(timeout);
  }
}

function drawRoutePoints(points) {
  const route = document.getElementById("mapRoute");
  const routeLine = document.getElementById("mapRouteLine");
  if (!route || !routeLine) return;

  routeLine.setAttribute("points", points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" "));
  route.hidden = false;
  route.removeAttribute("hidden");
}

async function renderWalkingRoute(food = null) {
  const route = document.getElementById("mapRoute");
  const routeLine = document.getElementById("mapRouteLine");
  if (!route) return;

  if (!food) {
    routeRequestId += 1;
    route.hidden = true;
    routeLine?.removeAttribute("points");
    return;
  }

  const requestId = routeRequestId + 1;
  routeRequestId = requestId;
  drawRoutePoints(fallbackRoutePoints(food));

  try {
    const points = await fetchWalkingRoutePoints(food);
    if (requestId === routeRequestId) drawRoutePoints(points);
  } catch {
    if (requestId === routeRequestId) drawRoutePoints(fallbackRoutePoints(food));
  }
}

function initSaanMap() {
  const map = document.getElementById("map");
  if (!map) return;

  map.className = "campus-map";
  map.innerHTML = `
    <div class="map-skyline" aria-hidden="true"></div>
    <div class="map-compass" aria-hidden="true">N</div>
    <div class="walk-ring walk-ring-near"><span>3-5 min</span></div>
    <div class="walk-ring walk-ring-far"><span>8-12 min</span></div>
    <div class="reference-landmarks" aria-hidden="true">
      <div class="landmark landmark-isetan"><span>Isetann<br>Recto</span></div>
      <div class="landmark landmark-ever"><span>Ever Gotesco<br>Manila</span></div>
      <div class="landmark landmark-gym"><span>FEU Gym</span></div>
    </div>
    <div class="campus-block feu-main-block" aria-hidden="true"><span>FEU Manila</span></div>
    <div class="map-roads" aria-hidden="true">
      ${MAP_ROADS.map((road) => `
        <div class="map-road ${road.className}">
          <strong>${road.label}</strong>
        </div>
      `).join("")}
    </div>
    <svg class="map-route" id="mapRoute" viewBox="0 0 100 100" preserveAspectRatio="none" hidden>
      <polyline id="mapRouteLine" points=""></polyline>
    </svg>
    <div id="mapAnchors"></div>
    <div id="mapUserMarker" class="map-user-marker" hidden>
      <i data-lucide="navigation"></i>
      <span>You</span>
    </div>
    <div id="mapFoodMarkers"></div>
    <div class="map-legend" aria-hidden="true">
      <span><i class="legend-campus"></i>Campus</span>
      <span><i class="legend-pin"></i>Food spot</span>
      <span><i class="legend-route"></i>Walk route</span>
    </div>
    <div id="mapSummary" class="map-summary">Loading nearby stores...</div>
  `;
  map.insertAdjacentHTML("afterend", `<aside id="mapSelected" class="map-selected" hidden></aside>`);

  const anchors = document.getElementById("mapAnchors");
  anchors.innerHTML = MAP_ANCHORS.map((anchor) => {
    const point = mapAnchorPoint(anchor);
    return `
      <button class="map-anchor ${anchor.key}" type="button" style="left:${point.x}%;top:${point.y}%;" title="${anchor.label}">
        <i data-lucide="${anchor.key === "enb" ? "building-2" : "school"}"></i>
        <span>${anchor.label}</span>
      </button>
    `;
  }).join("");
  if (window.lucide) window.lucide.createIcons();
}

function selectedMapMarkup(food, index) {
  return `
    <span>Selected Shop</span>
    <strong>${index + 1}. ${food.name}</strong>
    <button class="map-close-button" type="button" data-map-clear aria-label="Clear selected shop" title="Clear selected shop">
      <i data-lucide="x"></i>
    </button>
    <p>${formatMapArea(food.area)} - ${food.menu.length} menu items - PHP ${food.price_min}-${food.price_max}</p>
    <div class="map-selected-meta">
      <span>${food.walking_minutes} min walk</span>
      <span>${Math.round(food.distance_m)} m</span>
    </div>
    <button class="primary-button compact-button" type="button" data-map-view="${food.id}" aria-label="View menu for ${food.name}">
      Open menu
    </button>
  `;
}

function clearMapSelection() {
  const selectedPanel = document.getElementById("mapSelected");
  document.querySelectorAll(".map-food-dot.active").forEach((pin) => pin.classList.remove("active"));
  document.querySelectorAll(".store-card.map-selected-card").forEach((card) => card.classList.remove("map-selected-card"));
  if (selectedPanel) {
    selectedPanel.hidden = true;
    selectedPanel.innerHTML = "";
  }
  renderWalkingRoute(null);
}

function selectFoodOnMap(foodId, shouldScroll = false) {
  const target = document.querySelector(`[data-store-id="${foodId}"]`);
  const foods = window.SaanMapFoods || [];
  const foodIndex = foods.findIndex((food) => String(food.id) === String(foodId));
  const selectedPanel = document.getElementById("mapSelected");
  document.querySelectorAll(".map-food-dot.active").forEach((pin) => pin.classList.remove("active"));
  document.querySelectorAll(".store-card.map-selected-card").forEach((card) => card.classList.remove("map-selected-card"));
  if (!foodId || foodIndex < 0) {
    clearMapSelection();
    return;
  }

  if (selectedPanel && foodIndex >= 0) {
    selectedPanel.innerHTML = selectedMapMarkup(foods[foodIndex], foodIndex);
    selectedPanel.hidden = false;
  }

  document.querySelector(`[data-food-target="${foodId}"]`)?.classList.add("active");
  renderWalkingRoute(foods[foodIndex]);

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
  const userMarker = document.getElementById("mapUserMarker");
  if (!markerLayer || !summary || !selectedPanel) return;

  const visibleFoods = foods.slice(0, 24);
  window.SaanMapCampus = campusKey;
  window.SaanMapFoods = visibleFoods;
  document.getElementById("map")?.setAttribute("data-campus", campusKey);
  document.querySelectorAll(".map-anchor").forEach((anchor) => anchor.classList.remove("active-campus"));
  document.querySelector(`.map-anchor.${campusKey}`)?.classList.add("active-campus");
  if (userMarker) {
    if (window.SaanUserLocation) {
      const point = mapPoint(window.SaanUserLocation.lat, window.SaanUserLocation.lng);
      userMarker.hidden = false;
      userMarker.style.left = `${point.x}%`;
      userMarker.style.top = `${point.y}%`;
    } else {
      userMarker.hidden = true;
      userMarker.removeAttribute("style");
    }
  }

  markerLayer.innerHTML = visibleFoods.map((food, index) => {
    const point = mapPoint(food.latitude, food.longitude);
    const icon = mapIconForFood(food);
    return `
      <button
        class="map-food-dot ${areaClass(food.area)}"
        type="button"
        style="left:${point.x}%;top:${point.y}%;--delay:${index * 16}ms;"
        data-food-target="${food.id}"
        data-food-index="${index}"
        aria-label="${markerLabel(food)}"
        title="${markerLabel(food)}"
      >
        <i data-lucide="${icon}"></i>
        <small>${food.walking_minutes}m</small>
      </button>
    `;
  }).join("");
  if (window.lucide) window.lucide.createIcons();

  summary.textContent = window.SaanUserLocation
    ? `${visibleFoods.length} stores from your location`
    : `${visibleFoods.length} stores near ${campusLabel(campusKey)}`;
  selectedPanel.hidden = true;
  selectedPanel.innerHTML = "";
  selectFoodOnMap(null, false);

  markerLayer.querySelectorAll("[data-food-target]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.classList.contains("active")) {
        clearMapSelection();
        return;
      }
      const food = visibleFoods[Number(button.dataset.foodIndex)];
      selectedPanel.innerHTML = selectedMapMarkup(food, Number(button.dataset.foodIndex));
      selectedPanel.hidden = false;
      selectFoodOnMap(button.dataset.foodTarget, false);
      if (window.lucide) window.lucide.createIcons();
    });
  });

  selectedPanel.onclick = (event) => {
    if (event.target.closest("[data-map-clear]")) {
      clearMapSelection();
      return;
    }
    const button = event.target.closest("[data-map-view]");
    if (!button) return;
    selectFoodOnMap(button.dataset.mapView, true);
    window.dispatchEvent(new CustomEvent("saan:store-open", { detail: { storeId: button.dataset.mapView } }));
  };
}

document.addEventListener("DOMContentLoaded", initSaanMap);
window.selectFoodOnMap = selectFoodOnMap;
window.clearFoodOnMap = clearMapSelection;
