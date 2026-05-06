async function pickForMe() {
  const button = document.getElementById("pickForMe");
  const panel = document.getElementById("pickResult");
  button.disabled = true;
  panel.hidden = false;

  const names = state.foods.length ? state.foods.map((food) => food.name) : ["Thinking..."];
  let index = 0;
  const spin = setInterval(() => {
    panel.innerHTML = `<h2>${names[index % names.length]}</h2><p>Where? On me. Picking from your current matches...</p>`;
    index += 1;
  }, 80);

  try {
    const response = await fetch(`/api/foods/random?${buildParams().toString()}`);
    if (!response.ok) throw new Error("No match");
    const food = await response.json();
    setTimeout(() => {
      clearInterval(spin);
      const frames = (food.frames || []).map((frame) => `<span>${frame}</span>`).join("");
      panel.innerHTML = `
        <h2>${food.name}</h2>
        <p>${food.restaurant} - PHP ${food.price_min}-${food.price_max} - ${food.walking_minutes} min walk</p>
        <div class="food-frames pick-frames">${frames}</div>
        <p>${food.description}</p>
        <button class="primary-button compact-button" type="button" data-picked-ate="${food.id}">
          <i data-lucide="utensils"></i>
          I ate this
        </button>
      `;
      if (window.lucide) window.lucide.createIcons();
      const burst = document.createElement("div");
      burst.className = "confetti";
      document.body.appendChild(burst);
      setTimeout(() => burst.remove(), 900);
      button.disabled = false;
    }, 850);
  } catch {
    clearInterval(spin);
    panel.innerHTML = "<h2>No pick found</h2><p>Loosen the filters or turn off anti-repeat and try again.</p>";
    button.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("pickForMe")?.addEventListener("click", pickForMe);
  document.getElementById("pickResult")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-picked-ate]");
    if (!button) return;
    const food = state.foods.find((item) => item.id === Number(button.dataset.pickedAte));
    if (food) logFood(food);
  });
});
