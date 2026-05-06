function recommendationTemplate(item) {
  const food = item.food;
  return `
    <article class="timer-item">
      <h3>${food.name}</h3>
      <p>${food.restaurant} · PHP ${food.price_min}-${food.price_max} · ${food.walking_minutes} min one-way</p>
      <p>${item.total_needed_minutes} min total with ${item.round_trip_minutes} min walking.</p>
    </article>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("timerForm");
  const result = document.getElementById("timerResult");

  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000);
  form.departure_time.value = now.toTimeString().slice(0, 5);
  form.arrival_time.value = later.toTimeString().slice(0, 5);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    data.meal_minutes = Number(data.meal_minutes || 20);
    if (data.budget_max) data.budget_max = Number(data.budget_max);
    else delete data.budget_max;

    result.innerHTML = "<p>Checking your window...</p>";
    const response = await fetch("/api/timer/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      result.innerHTML = "<p>That time range needs another look.</p>";
      return;
    }

    const payload = await response.json();
    result.innerHTML = `
      <div class="timer-status ${payload.status}">
        <strong>${payload.message}</strong>
        <span>${payload.available_minutes} min available near ${payload.campus}</span>
      </div>
      <div class="timer-list">
        ${
          payload.recommendations.length
            ? payload.recommendations.map(recommendationTemplate).join("")
            : "<p>No spots fit this window yet.</p>"
        }
      </div>
    `;
  });
});
