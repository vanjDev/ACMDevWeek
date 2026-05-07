function buildCampusAnchor(key, fallback) {
  const campus = window.SAAN_CAMPUSES?.[key];
  if (!campus) return fallback;
  return {
    key,
    label: campus.name,
    lat: Number(campus.latitude),
    lng: Number(campus.longitude),
  };
}

const MAP_ANCHORS = [
  buildCampusAnchor("feu_tech", { key: "feu_tech", label: "FEU Tech", lat: 14.6042, lng: 120.9882 }),
  buildCampusAnchor("feu_manila", { key: "feu_manila", label: "FEU Manila", lat: 14.60356, lng: 120.98648 }),
  { key: "enb", label: "ENB", lat: 14.60417, lng: 120.98722 },
];

const ROUTE_API = "https://router.project-osrm.org/route/v1/foot";
const DEFAULT_CENTER = [14.6042, 120.9888];
const routeCache = new Map();

const WALK_ROUTE_COLOR = "#ef233c";

let saanLeafletMap = null;
let foodLayer = null;
let campusLayer = null;
let routeLayer = null;
let userLayer = null;
let activeMarkerId = null;
const foodMarkers = new Map();

function markerLabel(food) {
  return `${food.name} - ₱${food.price_min}-${food.price_max}`;
}

function formatMapArea(value) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function campusLabel(campusKey) {
  return MAP_ANCHORS.find((anchor) => anchor.key === campusKey)?.label || "FEU";
}

function currentStartCoordinates() {
  const campus = MAP_ANCHORS.find((anchor) => anchor.key === window.SaanMapCampus) || MAP_ANCHORS[0];
  return window.SaanUserLocation
    ? { lat: window.SaanUserLocation.lat, lng: window.SaanUserLocation.lng }
    : { lat: campus.lat, lng: campus.lng };
}

function mapIconForFood(food) {
  const name = `${food.name || ""} ${food.restaurant || ""}`.toLowerCase();
  if (food.category === "coffee_drinks" || name.includes("coffee") || name.includes("kopi") || name.includes("milk tea")) return "coffee";
  if (food.category === "snacks" || name.includes("potato") || name.includes("fries")) return "shopping-bag";
  return food.category ? "utensils" : "store";
}

function selectedMapMarkup(food, index) {
  return `
    <span>Selected Shop</span>
    <strong>${index + 1}. ${food.name}</strong>
    <button class="map-close-button" type="button" data-map-clear aria-label="Clear selected shop" title="Clear selected shop">
      <i data-lucide="x"></i>
    </button>
    <p>${formatMapArea(food.area)} - ${food.menu.length} menu items - ₱${food.price_min}-${food.price_max}</p>
    <div class="map-selected-meta">
      <span>${food.walking_minutes} min walk</span>
      <span>${Math.round(food.distance_m)} m</span>
    </div>
    <button class="primary-button compact-button" type="button" data-map-view="${food.id}" aria-label="View menu for ${food.name}">
      Open menu
    </button>
  `;
}

function foodDivIcon(food) {
  return L.divIcon({
    className: "leaflet-food-pin-wrap",
    html: `
      <button class="leaflet-food-pin" type="button" aria-label="${markerLabel(food)}" title="${markerLabel(food)}">
        <i data-lucide="${mapIconForFood(food)}"></i>
        <small>${food.walking_minutes}m</small>
      </button>
    `,
    iconAnchor: [22, 22],
    iconSize: [44, 52],
  });
}

function campusDivIcon(anchor, isActive) {
  return L.divIcon({
    className: "leaflet-campus-pin-wrap",
    html: `
      <span class="leaflet-campus-pin ${isActive ? "active-campus" : ""}">
        <i data-lucide="${anchor.key === "enb" ? "building-2" : "school"}"></i>
        ${anchor.label}
      </span>
    `,
    iconAnchor: [44, 18],
    iconSize: [88, 36],
  });
}

function userDivIcon() {
  return L.divIcon({
    className: "leaflet-user-pin-wrap",
    html: `<span class="leaflet-user-pin"><i data-lucide="navigation"></i>You</span>`,
    iconAnchor: [27, 27],
    iconSize: [54, 54],
  });
}

function ensureMap() {
  if (saanLeafletMap || !window.L) return saanLeafletMap;

  const mapElement = document.getElementById("map");
  if (!mapElement) return null;
  mapElement.className = "leaflet-campus-map";

  saanLeafletMap = L.map(mapElement, {
    zoomControl: true,
    scrollWheelZoom: false,
    attributionControl: true,
  }).setView(DEFAULT_CENTER, 17);
  window.SaanLeafletMap = saanLeafletMap;

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  }).addTo(saanLeafletMap);

  campusLayer = L.layerGroup().addTo(saanLeafletMap);
  foodLayer = L.layerGroup().addTo(saanLeafletMap);
  userLayer = L.layerGroup().addTo(saanLeafletMap);

  if (!document.getElementById("mapSelected")) {
    mapElement.insertAdjacentHTML("afterend", `<aside id="mapSelected" class="map-selected" hidden></aside>`);
  }

  setTimeout(() => saanLeafletMap.invalidateSize(), 0);
  return saanLeafletMap;
}

function renderCampusMarkers(campusKey) {
  campusLayer.clearLayers();
  MAP_ANCHORS.forEach((anchor) => {
    L.marker([anchor.lat, anchor.lng], {
      icon: campusDivIcon(anchor, anchor.key === campusKey),
      keyboard: false,
      interactive: false,
    }).addTo(campusLayer);
  });
}

function renderUserMarker() {
  userLayer.clearLayers();
  if (!window.SaanUserLocation) return;
  L.marker([window.SaanUserLocation.lat, window.SaanUserLocation.lng], {
    icon: userDivIcon(),
    keyboard: false,
    interactive: false,
  }).addTo(userLayer);
}

async function fetchWalkingRoute(food) {
  const start = currentStartCoordinates();
  const cacheKey = `${start.lat.toFixed(6)},${start.lng.toFixed(6)}:${food.latitude.toFixed(6)},${food.longitude.toFixed(6)}`;
  if (routeCache.has(cacheKey)) return routeCache.get(cacheKey);

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 3500);
  try {
    const endpoint = `${ROUTE_API}/${start.lng},${start.lat};${food.longitude},${food.latitude}?overview=full&geometries=geojson&steps=false`;
    const response = await fetch(endpoint, { signal: controller.signal });
    if (!response.ok) throw new Error("Route API failed.");
    const data = await response.json();
    const coordinates = data.routes?.[0]?.geometry?.coordinates || [];
    if (coordinates.length < 2) throw new Error("Route API returned no path.");
    const latLngs = coordinates.map(([lng, lat]) => [lat, lng]);
    routeCache.set(cacheKey, latLngs);
    return latLngs;
  } finally {
    window.clearTimeout(timeout);
  }
}

function clearRoute() {
  if (routeLayer && saanLeafletMap) {
    saanLeafletMap.removeLayer(routeLayer);
    routeLayer = null;
  }
}

async function renderWalkingRoute(food = null) {
  clearRoute();
  if (!food || !saanLeafletMap) return;

  const start = currentStartCoordinates();
  const fallback = [[start.lat, start.lng], [food.latitude, food.longitude]];
  routeLayer = L.polyline(fallback, {
    color: WALK_ROUTE_COLOR,
    dashArray: "5 8",
    opacity: 0.72,
    weight: 4,
  }).addTo(saanLeafletMap);

  try {
    const latLngs = await fetchWalkingRoute(food);
    clearRoute();
    routeLayer = L.polyline(latLngs, {
      color: WALK_ROUTE_COLOR,
      opacity: 0.95,
      weight: 4,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(saanLeafletMap);
  } catch {
    // Keep the dashed fallback visible when the routing service is unavailable.
  }
}

function clearMapSelection() {
  const selectedPanel = document.getElementById("mapSelected");
  activeMarkerId = null;
  document.querySelectorAll(".leaflet-food-pin.active").forEach((pin) => pin.classList.remove("active"));
  document.querySelectorAll(".store-card.map-selected-card").forEach((card) => card.classList.remove("map-selected-card"));
  if (selectedPanel) {
    selectedPanel.hidden = true;
    selectedPanel.innerHTML = "";
  }
  clearRoute();
}

function selectFoodOnMap(foodId, shouldScroll = false) {
  const target = document.querySelector(`[data-store-id="${foodId}"]`);
  const foods = window.SaanMapFoods || [];
  const foodIndex = foods.findIndex((food) => String(food.id) === String(foodId));
  const selectedPanel = document.getElementById("mapSelected");
  document.querySelectorAll(".leaflet-food-pin.active").forEach((pin) => pin.classList.remove("active"));
  document.querySelectorAll(".store-card.map-selected-card").forEach((card) => card.classList.remove("map-selected-card"));

  if (!foodId || foodIndex < 0) {
    clearMapSelection();
    return;
  }

  const food = foods[foodIndex];
  activeMarkerId = String(foodId);
  selectedPanel.innerHTML = selectedMapMarkup(food, foodIndex);
  selectedPanel.hidden = false;
  foodMarkers.get(String(foodId))?.getElement()?.querySelector(".leaflet-food-pin")?.classList.add("active");
  renderWalkingRoute(food);
  if (window.lucide) window.lucide.createIcons();

  if (target) {
    target.classList.add("map-selected-card");
    if (shouldScroll) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
}

function updateMap(foods, campusKey) {
  const map = ensureMap();
  const selectedPanel = document.getElementById("mapSelected");
  if (!map || !foodLayer || !selectedPanel) return;

  const visibleFoods = foods.slice(0, 24);
  window.SaanMapCampus = campusKey;
  window.SaanMapFoods = visibleFoods;
  activeMarkerId = null;
  foodMarkers.clear();
  foodLayer.clearLayers();
  clearRoute();
  renderCampusMarkers(campusKey);
  renderUserMarker();

  visibleFoods.forEach((food, index) => {
    const marker = L.marker([food.latitude, food.longitude], {
      icon: foodDivIcon(food),
      title: markerLabel(food),
    }).addTo(foodLayer);

    marker.on("click", () => {
      if (activeMarkerId === String(food.id)) {
        clearMapSelection();
        return;
      }
      selectFoodOnMap(food.id, false);
    });

    foodMarkers.set(String(food.id), marker);
    marker.foodIndex = index;
  });

  const campus = MAP_ANCHORS.find((anchor) => anchor.key === campusKey) || MAP_ANCHORS[0];
  const boundsItems = [[campus.lat, campus.lng], ...visibleFoods.map((food) => [food.latitude, food.longitude])];
  if (window.SaanUserLocation) boundsItems.push([window.SaanUserLocation.lat, window.SaanUserLocation.lng]);
  if (boundsItems.length > 1) {
    map.fitBounds(boundsItems, { padding: [34, 34], maxZoom: 17 });
  } else {
    map.setView([campus.lat, campus.lng], 17);
  }

  selectedPanel.hidden = true;
  selectedPanel.innerHTML = "";
  const summary = document.getElementById("mapSummary");
  if (summary) {
    summary.textContent = window.SaanUserLocation
      ? `${visibleFoods.length} stores from your location`
      : `${visibleFoods.length} stores near ${campusLabel(campusKey)}`;
  }
  if (window.lucide) window.lucide.createIcons();
}

document.addEventListener("DOMContentLoaded", () => {
  const map = document.getElementById("map");
  if (!map) return;
  map.innerHTML = `<div id="mapSummary" class="map-summary">Loading nearby stores...</div>`;
  ensureMap();

  const selectedPanel = document.getElementById("mapSelected");
  if (selectedPanel) {
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
});

window.selectFoodOnMap = selectFoodOnMap;
window.clearFoodOnMap = clearMapSelection;
