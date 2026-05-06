let pickForMeMode = "smart";

function currentStoresForWheel() {
  const foods = state.foods?.length ? applyClientRanking(state.foods) : [];
  return groupFoodsByStore(foods).slice(0, 12);
}

function storeScoreForMode(store) {
  const food = store.menu[0];
  let score = store.rating * 10 - (store.walking_minutes || 0);
  if (pickForMeMode === "tipid") score -= store.price_max / 5;
  if (pickForMeMode === "fast") score -= (store.walking_minutes || 0) * 6;
  if (pickForMeMode === "filling") score += food.category === "rice_meals" || food.category === "chicken" ? 18 : 0;
  if (pickForMeMode === "new") score += antiRepeatIds().includes(food.id) ? -80 : 10;
  const breakInfo = breakDecisionFor(store);
  if (breakInfo?.tone === "safe") score += 20;
  if (breakInfo?.tone === "risky") score -= 30;
  return score;
}

function smartPickedFood(stores) {
  if (!stores.length) return null;
  const ranked = [...stores].sort((a, b) => storeScoreForMode(b) - storeScoreForMode(a));
  const pool = ranked.slice(0, Math.min(5, ranked.length));
  const store = pool[Math.floor(Math.random() * pool.length)];
  return store?.menu?.[0] || null;
}

function pickModeReason(food) {
  const breakInfo = breakDecisionFor(food);
  if (pickForMeMode === "tipid") return `Picked because it protects your budget: ${recommendationReason(food)}.`;
  if (pickForMeMode === "fast") return breakInfo
    ? `Picked for speed: ${breakInfo.total} min total for your class break.`
    : `Picked for speed: about ${food.walking_minutes} min away.`;
  if (pickForMeMode === "filling") return `Picked because it is more likely to be filling for ${food.price_min <= 120 ? "student budget" : "a proper meal"}.`;
  if (pickForMeMode === "new") return "Picked to avoid your recent meal history.";
  return `Picked because ${recommendationReason(food)}.`;
}

function wheelSegments(stores) {
  const labels = stores.length ? stores.slice(0, 8) : [{ name: "Ready?" }];
  return labels.map((store, index) => `
    <span style="--i:${index};--total:${labels.length};"><em>${index + 1}</em></span>
  `).join("");
}

function showWheelPanel(stores, mode = "ready") {
  const panel = document.getElementById("pickResult");
  panel.hidden = false;
  panel.innerHTML = `
    <div class="wheel-layout">
      <div class="pick-wheel ${mode === "spinning" ? "spinning" : ""}" style="--segments:${Math.max(stores.length, 1)};">
        ${wheelSegments(stores)}
        <strong>Saan?</strong>
      </div>
      <div class="wheel-copy">
        <span>${mode === "spinning" ? "Randomizer" : "Undecided?"}</span>
        <h2>${mode === "spinning" ? "Spinning..." : "Ready to pick?"}</h2>
        <p>${mode === "spinning" ? "Checking your current filters and nearby FEU stores." : "Your filters are set. Press start when you want Saan? to choose."}</p>
        <div class="pick-mode-row" aria-label="Pick mode">
          ${[
            ["smart", "Best"],
            ["tipid", "Tipid"],
            ["fast", "Fast"],
            ["filling", "Busog"],
            ["new", "New"],
          ].map(([value, label]) => `
            <button type="button" data-pick-mode="${value}" class="${pickForMeMode === value ? "active" : ""}">${label}</button>
          `).join("")}
        </div>
      </div>
      <div class="wheel-store-list" aria-label="Stores in the randomizer">
        ${stores.slice(0, 6).map((store, index) => `<span>${index + 1}. ${store.name}</span>`).join("")}
      </div>
    </div>
    ${mode === "ready" ? `
      <div class="wheel-actions">
        <button id="startPickForMe" class="primary-button compact-button" type="button">
          <i data-lucide="play"></i>
          Start picking
        </button>
      </div>
    ` : ""}
  `;
  if (window.lucide) window.lucide.createIcons();
  return panel;
}

function openPickedStore(food) {
  const storeId = storeIdFor(food.restaurant);
  const stores = groupFoodsByStore(applyClientRanking(state.foods));
  const storeIndex = stores.findIndex((store) => store.id === storeId);
  if (storeIndex >= 0) {
    state.visibleLimit = Math.max(state.visibleLimit, storeIndex + 1);
  }
  state.selectedStoreId = storeId;
  renderFoods(state.foods);
  window.selectFoodOnMap?.(storeId, false);
  setTimeout(() => {
    document.querySelector(`[data-store-id="${storeId}"]`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, 80);
}

async function pickForMe() {
  const buttons = [document.getElementById("pickForMe"), document.getElementById("footerPickForMe")].filter(Boolean);
  buttons.forEach((button) => {
    button.disabled = true;
  });

  const stores = currentStoresForWheel();
  const panel = showWheelPanel(stores, "spinning");

  const wheel = panel.querySelector(".pick-wheel");
  const heading = panel.querySelector(".wheel-copy h2");
  const copy = panel.querySelector(".wheel-copy p");
  const names = stores.length ? stores.map((store) => store.name) : ["Thinking..."];
  let index = 0;
  const spin = setInterval(() => {
    heading.textContent = names[index % names.length];
    index += 1;
  }, 95);

  try {
    const food = smartPickedFood(stores);
    if (!food) throw new Error("No match");
    const storeName = food.restaurant;

    setTimeout(() => {
      clearInterval(spin);
      wheel.classList.add("landed");
      heading.textContent = storeName;
      copy.textContent = `${food.name} - PHP ${food.price_min}-${food.price_max} - ${food.walking_minutes} min walk. ${pickModeReason(food)}`;
      panel.insertAdjacentHTML("beforeend", `
        <div class="wheel-actions">
          <button class="primary-button compact-button" type="button" data-picked-store="${storeIdFor(storeName)}">
            <i data-lucide="utensils"></i>
            Open menu
          </button>
          <button class="secondary-button compact-button" type="button" data-picked-ate="${food.id}">
            <i data-lucide="check"></i>
            I ate this
          </button>
        </div>
      `);
      openPickedStore(food);
      if (window.lucide) window.lucide.createIcons();
      const burst = document.createElement("div");
      burst.className = "confetti";
      document.body.appendChild(burst);
      setTimeout(() => burst.remove(), 900);
      buttons.forEach((button) => {
        button.disabled = false;
      });
    }, 1300);
  } catch {
    clearInterval(spin);
    panel.innerHTML = "<h2>No pick found</h2><p>Loosen the filters or turn off anti-repeat and try again.</p>";
    buttons.forEach((button) => {
      button.disabled = false;
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const openPicker = () => {
    const panel = showWheelPanel(currentStoresForWheel(), "ready");
    panel.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  document.getElementById("pickForMe")?.addEventListener("click", openPicker);
  document.getElementById("footerPickForMe")?.addEventListener("click", openPicker);
  document.getElementById("pickResult")?.addEventListener("click", (event) => {
    const modeButton = event.target.closest("[data-pick-mode]");
    if (modeButton) {
      pickForMeMode = modeButton.dataset.pickMode || "smart";
      showWheelPanel(currentStoresForWheel(), "ready");
      return;
    }
    if (event.target.closest("#startPickForMe")) {
      pickForMe();
      return;
    }
    const ateButton = event.target.closest("[data-picked-ate]");
    const storeButton = event.target.closest("[data-picked-store]");
    if (ateButton) {
      const food = state.foods.find((item) => item.id === Number(ateButton.dataset.pickedAte));
      if (food) openMealLogDialog(food, latestTodayFoodLog(food.id));
      return;
    }
    if (storeButton) {
      state.selectedStoreId = storeButton.dataset.pickedStore;
      renderFoods(state.foods);
      window.selectFoodOnMap?.(state.selectedStoreId, true);
    }
  });
});
