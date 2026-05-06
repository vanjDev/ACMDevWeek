async function pickForMe() {
  const button = document.getElementById("pickForMe");
  const panel = document.getElementById("pickResult");
  button.disabled = true;
  panel.hidden = false;

  const names = state.foods.length ? state.foods.map((food) => food.name) : ["Thinking..."];
  let index = 0;
  const spin = setInterval(() => {
    panel.innerHTML = `<h2>${names[index % names.length]}</h2><p>Picking from your current matches...</p>`;
    index += 1;
  }, 80);

  try {
    const response = await fetch(`/api/foods/random?${buildParams().toString()}`);
    if (!response.ok) throw new Error("No match");
    const food = await response.json();
    setTimeout(() => {
      clearInterval(spin);
      panel.innerHTML = `<h2>${food.name}</h2><p>${food.restaurant} · PHP ${food.price_min}-${food.price_max} · ${food.walking_minutes} min walk</p><p>${food.description}</p>`;
      const burst = document.createElement("div");
      burst.className = "confetti";
      document.body.appendChild(burst);
      setTimeout(() => burst.remove(), 900);
      button.disabled = false;
    }, 850);
  } catch {
    clearInterval(spin);
    panel.innerHTML = "<h2>No pick found</h2><p>Loosen the filters and try again.</p>";
    button.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("pickForMe")?.addEventListener("click", pickForMe);
});
