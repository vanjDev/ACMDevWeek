function currentStoresForWheel() {
  const foods = state.foods?.length ? applyClientRanking(state.foods) : [];
  return groupFoodsByStore(foods).slice(0, 12);
}

function wheelSegments(stores) {
  const labels = stores.length ? stores : [{ name: "Thinking..." }];
  return labels.map((store, index) => `
    <span style="--i:${index};--total:${labels.length};">${store.name}</span>
  `).join("");
}

function showWheelPanel(stores) {
  const panel = document.getElementById("pickResult");
  panel.hidden = false;
  panel.innerHTML = `
    <div class="wheel-layout">
      <div class="pick-wheel" style="--segments:${Math.max(stores.length, 1)};">
        ${wheelSegments(stores)}
        <strong>Saan?</strong>
      </div>
      <div class="wheel-copy">
        <span>Randomizer</span>
        <h2>Spinning...</h2>
        <p>Checking your current filters and nearby FEU shops.</p>
      </div>
    </div>
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
  const panel = showWheelPanel(stores);
  panel.scrollIntoView({ behavior: "smooth", block: "center" });

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
    const response = await fetch(`/api/foods/random?${buildParams().toString()}`);
    if (!response.ok) throw new Error("No match");
    const food = await response.json();
    const storeName = food.restaurant;

    setTimeout(() => {
      clearInterval(spin);
      wheel.classList.add("landed");
      heading.textContent = storeName;
      copy.textContent = `${food.name} - PHP ${food.price_min}-${food.price_max} - ${food.walking_minutes} min walk`;
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
  document.getElementById("pickForMe")?.addEventListener("click", pickForMe);
  document.getElementById("footerPickForMe")?.addEventListener("click", pickForMe);
  document.getElementById("pickResult")?.addEventListener("click", (event) => {
    const ateButton = event.target.closest("[data-picked-ate]");
    const storeButton = event.target.closest("[data-picked-store]");
    if (ateButton) {
      const food = state.foods.find((item) => item.id === Number(ateButton.dataset.pickedAte));
      if (food) logFood(food);
      return;
    }
    if (storeButton) {
      state.selectedStoreId = storeButton.dataset.pickedStore;
      renderFoods(state.foods);
      window.selectFoodOnMap?.(state.selectedStoreId, true);
    }
  });
});
