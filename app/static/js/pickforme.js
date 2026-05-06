let pickForMeMode = "smart";

const PICK_FOR_ME_MODES = [
  {
    value: "smart",
    label: "Best",
    icon: "sparkles",
    hint: "balanced",
    copy: "Best overall fit from your filters, budget, walk time, and meal history.",
  },
  {
    value: "tipid",
    label: "Tipid",
    icon: "wallet",
    hint: "low spend",
    copy: "Cheaper picks first, so it feels lighter on your weekly budget.",
  },
  {
    value: "healthy",
    label: "Healthy",
    icon: "heart-pulse",
    hint: "cleaner",
    copy: "Prioritizes lighter, balanced meals with better health signals.",
  },
  {
    value: "fast",
    label: "Fast",
    icon: "timer",
    hint: "nearby",
    copy: "Closest options first for quick breaks between classes.",
  },
  {
    value: "filling",
    label: "Busog",
    icon: "utensils",
    hint: "meal",
    copy: "More filling food first when you need a proper meal.",
  },
  {
    value: "new",
    label: "New",
    icon: "refresh-cw",
    hint: "fresh pick",
    copy: "Avoids recent meals so you do not keep landing on the same thing.",
  },
];

function activePickMode() {
  return PICK_FOR_ME_MODES.find((mode) => mode.value === pickForMeMode) || PICK_FOR_ME_MODES[0];
}

function currentStoresForWheel() {
  const foods = state.foods?.length ? applyClientRanking(state.foods) : [];
  return rankStoresForPickMode(groupFoodsByStore(foods)).slice(0, 12);
}

function storeScoreForMode(store) {
  const food = store.menu[0];
  let score = store.rating * 10 - (store.walking_minutes || 0);
  const nutrition = typeof nutritionProfile === "function" ? nutritionProfile(food) : null;
  if (pickForMeMode === "tipid") score -= store.price_max / 2;
  if (pickForMeMode === "healthy") score += (nutrition?.score || 50) / 2 - (nutrition?.calories || 250) / 35;
  if (pickForMeMode === "fast") score -= (store.walking_minutes || 0) * 6;
  if (pickForMeMode === "filling") score += food.category === "rice_meals" || food.category === "chicken" ? 18 : 0;
  if (pickForMeMode === "new") score += antiRepeatIds().includes(food.id) ? -80 : 10;
  const breakInfo = breakDecisionFor(store);
  if (breakInfo?.tone === "safe") score += 20;
  if (breakInfo?.tone === "risky") score -= 30;
  return score;
}

function rankStoresForPickMode(stores) {
  return [...stores].sort((a, b) => {
    const scoreDelta = storeScoreForMode(b) - storeScoreForMode(a);
    if (Math.abs(scoreDelta) > 0.01) return scoreDelta;
    return a.name.localeCompare(b.name);
  });
}

function smartPickedFood(stores) {
  if (!stores.length) return null;
  const ranked = rankStoresForPickMode(stores);
  const pool = ranked.slice(0, Math.min(4, ranked.length));
  const totalWeight = pool.reduce((sum, _store, index) => sum + (pool.length - index), 0);
  let roll = Math.random() * totalWeight;
  const store = pool.find((_store, index) => {
    roll -= pool.length - index;
    return roll <= 0;
  }) || pool[0];
  return store?.menu?.[0] || null;
}

function pickModeReason(food) {
  const breakInfo = breakDecisionFor(food);
  if (pickForMeMode === "tipid") return `Picked because it protects your budget: ${recommendationReason(food)}.`;
  if (pickForMeMode === "healthy") {
    const nutrition = typeof nutritionProfile === "function" ? nutritionProfile(food) : null;
    return nutrition ? `Picked for a cleaner choice: about ${nutrition.calories} cal and ${nutrition.label.toLowerCase()}.` : "Picked for a cleaner meal choice.";
  }
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

function storeModeDetail(store) {
  const food = store.menu[0];
  const nutrition = typeof nutritionProfile === "function" ? nutritionProfile(food) : null;
  if (pickForMeMode === "tipid") return `${peso(store.price_min)}-${peso(store.price_max)}`;
  if (pickForMeMode === "healthy" && nutrition) return `~${nutrition.calories} cal`;
  if (pickForMeMode === "fast") return `${store.walking_minutes || 1} min walk`;
  if (pickForMeMode === "filling") return food.category === "rice_meals" ? "rice meal" : (food.category || "meal").replace("_", " ");
  if (pickForMeMode === "new") return antiRepeatIds().includes(food.id) ? "recent" : "fresh";
  return `${store.rating.toFixed(1)} rating`;
}

function showWheelPanel(stores, mode = "ready") {
  const panel = document.getElementById("pickResult");
  const selectedMode = activePickMode();
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
        <p>${mode === "spinning" ? `Picking with ${selectedMode.label.toLowerCase()} mode.` : selectedMode.copy}</p>
        <div class="pick-mode-grid" aria-label="Pick mode">
          ${PICK_FOR_ME_MODES.map(({ value, label, icon, hint }) => `
            <button type="button" data-pick-mode="${value}" class="pick-mode-tile ${pickForMeMode === value ? "active" : ""}" aria-pressed="${pickForMeMode === value}">
              <i data-lucide="${icon}"></i>
              <span>${label}</span>
              <small>${hint}</small>
            </button>
          `).join("")}
        </div>
      </div>
      <div class="wheel-store-list" aria-label="Stores in the randomizer">
        ${stores.slice(0, 6).map((store, index) => `
          <span>
            <b>${index + 1}</b>
            <i data-lucide="${selectedMode.icon}"></i>
            <strong>${store.name}</strong>
            <small>${storeModeDetail(store)}</small>
          </span>
        `).join("")}
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
      copy.textContent = `${food.name} - ${peso(food.price_min)}-${peso(food.price_max)} - ${food.walking_minutes} min walk. ${pickModeReason(food)}`;
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
