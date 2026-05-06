let saanMap;
let markerLayer;
let radiusCircle;

const campusIcon = L.divIcon({
  className: "campus-pin",
  html: "<strong>FEU</strong>",
  iconSize: [34, 34],
});

function campusCoords(key) {
  const campuses = window.SAAN_CAMPUSES || {};
  const campus = campuses[key] || campuses.feu_tech;
  return [campus.latitude, campus.longitude];
}

function initSaanMap() {
  saanMap = L.map("map", { scrollWheelZoom: false }).setView(campusCoords("feu_tech"), 16);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(saanMap);

  markerLayer = L.layerGroup().addTo(saanMap);

  Object.values(window.SAAN_CAMPUSES || {}).forEach((campus) => {
    L.marker([campus.latitude, campus.longitude], { icon: campusIcon })
      .addTo(saanMap)
      .bindPopup(campus.name);
  });
}

function updateMap(foods, campusKey, radius) {
  if (!saanMap) return;
  const center = campusCoords(campusKey);
  markerLayer.clearLayers();

  if (radiusCircle) radiusCircle.remove();
  radiusCircle = L.circle(center, {
    radius: Number(radius || 1200),
    color: "#f6a524",
    weight: 2,
    fillColor: "#f6a524",
    fillOpacity: 0.08,
  }).addTo(saanMap);

  foods.forEach((food) => {
    const marker = L.marker([food.latitude, food.longitude])
      .bindPopup(`<strong>${food.name}</strong><br>${food.restaurant}<br>PHP ${food.price_min}-${food.price_max}`);
    marker.on("click", () => document.querySelector(`[data-food-id="${food.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
    markerLayer.addLayer(marker);
  });

  const bounds = L.latLngBounds([center]);
  foods.slice(0, 30).forEach((food) => bounds.extend([food.latitude, food.longitude]));
  radiusCircle && bounds.extend(radiusCircle.getBounds());
  saanMap.fitBounds(bounds, { padding: [28, 28], maxZoom: 17 });
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("map")) initSaanMap();
});
