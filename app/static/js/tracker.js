const HISTORY_KEY = "saanFoodHistory";
const BUDGET_KEY = "saanWeeklyBudget";
const MIN_SNACK_BUDGET = 50;
const MIN_MEAL_BUDGET = 80;
let currentHistorySort = "latest";

function getJson(key, fallback) {
  try {
    const synced = window.SaanAuth?.getData?.() || {};
    if (Object.prototype.hasOwnProperty.call(synced, key)) return synced[key];
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function setJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  const data = { ...(window.SaanAuth?.getData?.() || {}) };
  data[key] = value;
  if (window.SaanAuth) window.SaanAuth.data = data;
  updateSaveStatus("Saving...");
  window.SaanAuth?.setData?.(data)
    .then(() => updateSaveStatus())
    .catch(() => showToast("Could not sync saved data. Keeping it on this device."));
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.hidden = true;
  }, 2600);
}

function manilaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date).reduce((memo, part) => {
    memo[part.type] = part.value;
    return memo;
  }, {});
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

function formatManilaTime(iso) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

function formatStoredMealTime(time) {
  const [hourText, minuteText] = String(time || "").split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "";
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${period}`;
}

function mealTimeLabel(item) {
  if (item.phTime) return formatStoredMealTime(item.phTime);
  if (item.loggedAt) return formatManilaTime(item.loggedAt);
  if (item.phDate || item.date) return item.phDate || item.date;
  return "Time unavailable";
}

function manilaWeekKey(dateText = manilaParts().date) {
  const [year, month, day] = String(dateText).split("-").map(Number);
  if (!year || !month || !day) return "";
  const cursor = new Date(Date.UTC(year, month - 1, day));
  const mondayOffset = (cursor.getUTCDay() + 6) % 7;
  cursor.setUTCDate(cursor.getUTCDate() - mondayOffset);
  return cursor.toISOString().slice(0, 10);
}

function updateSaveStatus(label = null) {
  const status = document.getElementById("saveStatus");
  if (!status) return;
  status.textContent = label || (window.SaanAuth?.user ? "Syncing saves to your account" : "Guest saves stay on this device");
}

function getHistory() {
  return getJson(HISTORY_KEY, []);
}

function saveHistory(history) {
  setJson(HISTORY_KEY, history.slice(0, 60));
  renderTracker();
}

function getBudgetState() {
  return getJson(BUDGET_KEY, { weekly: "" });
}

function normalizeHistoryEntry(item) {
  const phDate = item.phDate || item.date || "";
  return {
    ...item,
    entryId: item.entryId || item.loggedAt || `${item.id}-${phDate}-${item.phTime || "00:00"}`,
    phDate,
    phTime: item.phTime || "",
    weekKey: item.weekKey || manilaWeekKey(phDate),
    price: Number(item.price || 0),
    note: item.note || "",
  };
}

function thisWeekHistory() {
  const currentWeek = manilaWeekKey();
  return getHistory().map(normalizeHistoryEntry).filter((item) => item.weekKey === currentWeek);
}

function todayHistory() {
  const today = manilaParts().date;
  return getHistory().map(normalizeHistoryEntry).filter((item) => item.phDate === today);
}

function dailySpentTotal() {
  return todayHistory().reduce((total, item) => total + Number(item.price || 0), 0);
}

function weeklySpentTotal() {
  return thisWeekHistory().reduce((total, item) => total + Number(item.price || 0), 0);
}

function thisMonthHistory() {
  const currentMonth = manilaParts().date.slice(0, 7);
  return getHistory().map(normalizeHistoryEntry).filter((item) => item.phDate.slice(0, 7) === currentMonth);
}

function totalSpent(items) {
  return items.reduce((total, item) => total + Number(item.price || 0), 0);
}

function formatPeso(amount) {
  return `₱${Math.round(Number(amount || 0)).toLocaleString("en-PH")}`;
}

function dateFromText(dateText) {
  const [year, month, day] = String(dateText).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function dateTextFromDate(date) {
  return date.toISOString().slice(0, 10);
}

function currentWeekDates() {
  const start = dateFromText(manilaWeekKey());
  if (!start) return [];
  return Array.from({ length: 7 }, (_, index) => {
    const cursor = new Date(start);
    cursor.setUTCDate(start.getUTCDate() + index);
    return dateTextFromDate(cursor);
  });
}

function groupByDate(items) {
  return items.reduce((memo, item) => {
    if (!item.phDate) return memo;
    memo[item.phDate] = memo[item.phDate] || [];
    memo[item.phDate].push(item);
    return memo;
  }, {});
}

function mealIcon(item) {
  const period = mealPeriodForEntry(item);
  if (period === "breakfast") return "sunrise";
  if (period === "lunch") return "utensils";
  if (period === "merienda") return "cookie";
  return "moon";
}

function historySortValue(item) {
  return `${item.phDate || ""} ${item.phTime || "00:00"}`;
}

function sortedHistory(items) {
  return [...items].sort((a, b) => {
    if (currentHistorySort === "price") return Number(b.price || 0) - Number(a.price || 0);
    if (currentHistorySort === "day") return String(a.phDate || "").localeCompare(String(b.phDate || ""));
    return historySortValue(b).localeCompare(historySortValue(a));
  });
}

function renderHistorySortButtons() {
  document.querySelectorAll("[data-history-sort]").forEach((button) => {
    const isActive = button.dataset.historySort === currentHistorySort;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function averageMealSpend(items) {
  if (!items.length) return 0;
  return Math.round(items.reduce((total, item) => total + Number(item.price || 0), 0) / items.length);
}

function mealPeriod() {
  const hour = Number(manilaParts().time.split(":")[0]);
  if (hour < 10) return "breakfast";
  if (hour < 14) return "lunch";
  if (hour < 18) return "merienda";
  return "dinner";
}

function mostSpentBy(items, keyFn) {
  const totals = {};
  items.forEach((item) => {
    const key = keyFn(item);
    if (!key) return;
    totals[key] = (totals[key] || 0) + Number(item.price || 0);
  });
  return Object.entries(totals).sort((a, b) => b[1] - a[1])[0] || null;
}

function mealPeriodForEntry(item) {
  const hour = Number(String(item.phTime || "12:00").split(":")[0]);
  if (hour < 10) return "breakfast";
  if (hour < 14) return "lunch";
  if (hour < 18) return "merienda";
  return "dinner";
}

function budgetCoachMessages(spent, weekly) {
  const week = thisWeekHistory();
  const today = todayHistory();
  const remaining = weekly ? weekly - spent : 0;
  const percent = weekly ? spent / weekly : 0;
  const todaySpent = dailySpentTotal();
  const average = averageMealSpend(week);
  const topStore = mostSpentBy(week, (item) => item.restaurant);
  const topPeriod = mostSpentBy(week, mealPeriodForEntry);
  const messages = [];

  if (!weekly) {
    messages.push({
      tone: "neutral",
      title: "Set a weekly target",
      body: week.length
        ? `You already logged ${formatPeso(spent)} this week. Add a budget so the app can tell you when to magtipid.`
        : "Start with a realistic weekly food budget. Even ₱500-800 is enough for useful tipid feedback.",
    });
  } else if (remaining < 0) {
    messages.push({
      tone: "danger",
      title: "Magtipid muna",
      body: `You are ${formatPeso(Math.abs(remaining))} over budget. Prioritize canteen meals, street food, or packed snacks for the rest of the week.`,
    });
  } else if (remaining < MIN_SNACK_BUDGET) {
    messages.push({
      tone: "danger",
      title: "Not enough for a meal",
      body: `${formatPeso(remaining)} left is below a realistic food budget. Pack food, choose the cheapest canteen option, or raise your weekly target.`,
    });
  } else if (remaining < MIN_MEAL_BUDGET) {
    messages.push({
      tone: "warning",
      title: "Snack-only budget",
      body: `Only ${formatPeso(remaining)} left. Treat this as emergency or snack money, not a normal meal budget.`,
    });
  } else if (percent >= 0.85) {
    messages.push({
      tone: "warning",
      title: "Tipid mode recommended",
      body: `Only ${formatPeso(remaining)} left. Keep the next meals under ${formatPeso(Math.max(MIN_SNACK_BUDGET, Math.floor(remaining / 2)))} if you still need budget buffer.`,
    });
  } else if (percent >= 0.6) {
    messages.push({
      tone: "warning",
      title: "Konting ingat na",
      body: `You have used ${Math.round(percent * 100)}% of the weekly budget. Avoid treating every break like a full meal.`,
    });
  } else {
    messages.push({
      tone: "good",
      title: "Safe pa budget",
      body: `${formatPeso(remaining)} left this week. Keep meals near ${formatPeso(Math.min(average || 100, Math.max(MIN_MEAL_BUDGET, Math.floor(remaining / 3))))} to protect the buffer.`,
    });
  }

  if (today.length >= 3) {
    messages.push({
      tone: "warning",
      title: "Three meals logged today",
      body: "Check if the next one is a real meal or just cravings. Tubig muna or split a snack if kaya.",
    });
  } else if (todaySpent >= 220) {
    messages.push({
      tone: "warning",
      title: "Today is getting expensive",
      body: `You already spent ${formatPeso(todaySpent)} today. For ${mealPeriod()}, aim for a lower-cost pick.`,
    });
  } else if (today.length === 0) {
    messages.push({
      tone: "neutral",
      title: "No meal logged today",
      body: `When you eat ${mealPeriod()}, log it here so the weekly advice stays accurate in Manila time.`,
    });
  }

  if (average >= 150) {
    messages.push({
      tone: "warning",
      title: "Average meal is high",
      body: `Your average logged meal is ${formatPeso(average)}. Try alternating one full meal with one tipid meal under ₱100.`,
    });
  } else if (average && average <= 90) {
    messages.push({
      tone: "good",
      title: "Tipid streak",
      body: `Average meal is ${formatPeso(average)}. Good budget control, just make sure the meals are still filling enough.`,
    });
  }

  if (topStore && week.length >= 3) {
    messages.push({
      tone: "neutral",
      title: "Biggest spend spot",
      body: `${topStore[0]} is your top spend this week at ${formatPeso(topStore[1])}. If budget feels tight, rotate in a lower-cost pick tomorrow.`,
    });
  }

  if (topPeriod && weekly) {
    const dayCap = Math.max(60, Math.floor(Math.max(0, remaining) / 3));
    messages.push({
      tone: topPeriod[1] > weekly * 0.35 ? "warning" : "neutral",
      title: `${topPeriod[0]} spending pattern`,
      body: `Most spending happens during ${topPeriod[0]}. Suggested next-meal cap: ${formatPeso(dayCap)}.`,
    });
  }

  return messages.slice(0, 4);
}

function streakDays() {
  const dates = [...new Set(getHistory().map((item) => item.phDate || item.date))].sort().reverse();
  let streak = 0;
  const cursorParts = manilaParts();
  const [year, month, day] = cursorParts.date.split("-").map(Number);
  const cursor = new Date(Date.UTC(year, month - 1, day));
  for (const date of dates) {
    if (date !== cursor.toISOString().slice(0, 10)) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

function removeHistoryEntry(entryId) {
  saveHistory(
    getHistory()
      .map(normalizeHistoryEntry)
      .filter((item) => item.entryId !== entryId),
  );
}

function updateBudgetState() {
  setJson(BUDGET_KEY, {
    weekly: document.getElementById("weeklyBudget")?.value || "",
  });
}

function budgetMessage(spent, weekly) {
  if (!weekly) {
    return spent
      ? `You logged ${formatPeso(spent)} this week. Set a weekly budget to track what is left.`
      : "Set a weekly budget to see smarter spending notes.";
  }
  const rawRemaining = weekly - spent;
  const remaining = Math.max(0, rawRemaining);
  if (rawRemaining < 0) return `You are ${formatPeso(Math.abs(rawRemaining))} over budget this week.`;
  if (remaining < MIN_SNACK_BUDGET) return `${formatPeso(remaining)} left is below a realistic food budget.`;
  if (remaining < MIN_MEAL_BUDGET) return `Only ${formatPeso(remaining)} left. Treat this as snack or emergency money.`;
  return `You have ${formatPeso(remaining)} left this week.`;
}

function renderBudgetCoach(spent, weekly) {
  const panel = document.getElementById("budgetCoachMessages");
  if (!panel) return;
  const messages = budgetCoachMessages(spent, weekly);
  panel.innerHTML = messages.map((message) => `
    <article class="budget-coach-message ${message.tone}">
      <strong>${message.title}</strong>
      <p>${message.body}</p>
    </article>
  `).join("");
}

function renderTrackerInsights() {
  const panel = document.getElementById("trackerInsightGrid");
  if (!panel) return;
  const today = todayHistory();
  const week = thisWeekHistory();
  const month = thisMonthHistory();
  const allHistory = getHistory().map(normalizeHistoryEntry);
  const topStore = mostSpentBy(month, (item) => item.restaurant);
  const average = averageMealSpend(month.length ? month : allHistory);
  const daysWithLogs = new Set(week.map((item) => item.phDate)).size;
  const cards = [
    {
      icon: "wallet-cards",
      label: "Today",
      value: formatPeso(totalSpent(today)),
      note: `${today.length} meal${today.length === 1 ? "" : "s"} logged`,
    },
    {
      icon: "calendar-days",
      label: "This week",
      value: formatPeso(totalSpent(week)),
      note: `${daysWithLogs}/7 days tracked`,
    },
    {
      icon: "calendar-range",
      label: "This month",
      value: formatPeso(totalSpent(month)),
      note: `${month.length} meal${month.length === 1 ? "" : "s"} total`,
    },
    {
      icon: "badge-dollar-sign",
      label: "Usual spend",
      value: average ? formatPeso(average) : "No average yet",
      note: average ? "Average per logged meal" : "Log meals to learn it",
    },
    {
      icon: "store",
      label: "Top store",
      value: topStore ? topStore[0] : "None yet",
      note: topStore ? `${formatPeso(topStore[1])} this month` : "Your repeat spot appears here",
    },
  ];
  panel.innerHTML = cards.map((card) => `
    <article class="tracker-insight-card">
      <i data-lucide="${card.icon}"></i>
      <span>${card.label}</span>
      <strong>${card.value}</strong>
      <small>${card.note}</small>
    </article>
  `).join("");
}

function renderWeekStrip() {
  const panel = document.getElementById("weekStrip");
  if (!panel) return;
  const today = manilaParts().date;
  const weekByDate = groupByDate(thisWeekHistory());
  const labels = ["M", "T", "W", "TH", "F", "SAT", "SUN"];
  panel.innerHTML = currentWeekDates().map((dateText, index) => {
    const meals = weekByDate[dateText] || [];
    const spent = totalSpent(meals);
    const classes = [
      "week-day-card",
      dateText === today ? "today" : "",
      meals.length ? "has-log" : "",
    ].filter(Boolean).join(" ");
    return `
      <article class="${classes}">
        <span>${labels[index]}</span>
        <i data-lucide="${meals.length ? "check" : "plus"}"></i>
        <strong>${spent ? formatPeso(spent) : "₱0"}</strong>
        <small>${meals.length} meal${meals.length === 1 ? "" : "s"}</small>
      </article>
    `;
  }).join("");
}

function renderHistory() {
  const historyPanel = document.getElementById("weeklyHistory");
  if (!historyPanel) return;
  const week = thisWeekHistory();
  const visibleWeek = sortedHistory(week);
  historyPanel.innerHTML = week.length
    ? `
      <div class="weekly-history-header">
        <span><i data-lucide="list-filter"></i> Recent logs</span>
        <b>${week.length} meal${week.length === 1 ? "" : "s"} - ${formatPeso(totalSpent(week))}</b>
      </div>
      <div class="history-list">
      ${visibleWeek.slice(0, 12).map((item) => `
        <div class="weekly-history-item">
          <div class="history-icon">
            <i data-lucide="${mealIcon(item)}"></i>
          </div>
          <div class="history-copy">
            <strong>${item.name}</strong>
            <span>${item.restaurant}</span>
            <small>${mealTimeLabel(item)}${item.note ? ` - ${item.note}` : ""}</small>
          </div>
          <div class="history-meta">
            <b>${formatPeso(item.price)}</b>
            <small>${mealPeriodForEntry(item)}</small>
          </div>
          <div class="weekly-history-actions">
            <button class="icon-button" type="button" data-history-edit="${item.entryId}" aria-label="Edit ${item.name}" title="Edit meal">
              <i data-lucide="pencil"></i>
            </button>
            <button class="icon-button" type="button" data-history-remove="${item.entryId}" aria-label="Remove ${item.name}" title="Remove meal">
              <i data-lucide="undo-2"></i>
            </button>
          </div>
        </div>
      `).join("")}
      </div>
    `
    : `
      <div class="tracker-empty-state">
        <i data-lucide="receipt-text"></i>
        <strong>No meals logged this week yet.</strong>
        <span>Tap “Eat something” from a menu after you buy food so this turns into your weekly spending story.</span>
      </div>
    `;
  renderHistorySortButtons();
}

function renderHabitStrip() {
  const history = getHistory().map(normalizeHistoryEntry);
  document.getElementById("todaySpent").textContent = formatPeso(dailySpentTotal());
  document.getElementById("weekSpent").textContent = formatPeso(weeklySpentTotal());
  document.getElementById("streakCount").textContent = `${streakDays()} day${streakDays() === 1 ? "" : "s"}`;
  document.getElementById("lastAte").textContent = history[0]
    ? `${history[0].name} at ${history[0].restaurant} - ${mealTimeLabel(history[0])}`
    : "Nothing logged yet";
  updateSaveStatus();
}

function updateBudgetInsight() {
  const weekly = Number(document.getElementById("weeklyBudget")?.value || 0);
  const spent = weeklySpentTotal();
  const spentInput = document.getElementById("weeklySpent");
  const spentLabel = document.getElementById("budgetSpentLabel");
  const remainingLabel = document.getElementById("budgetRemainingLabel");
  const bar = document.getElementById("budgetBar");
  const insight = document.getElementById("budgetInsight");
  if (spentInput) spentInput.value = String(spent);
  if (spentLabel) spentLabel.textContent = `${formatPeso(spent)} spent`;
  if (remainingLabel) remainingLabel.textContent = weekly ? `${formatPeso(Math.max(0, weekly - spent))} left` : "Set a budget";
  if (bar) {
    const percent = weekly ? Math.min(100, Math.round((spent / weekly) * 100)) : 0;
    bar.style.width = `${percent}%`;
    const remaining = weekly - spent;
    const isLowBudget = weekly > 0 && remaining < MIN_SNACK_BUDGET;
    bar.style.background = percent >= 100 || isLowBudget ? "#ff7d7d" : "linear-gradient(90deg, #00a664 0%, #f6f1e7 100%)";
  }
  if (insight) insight.textContent = budgetMessage(spent, weekly);
  renderBudgetCoach(spent, weekly);
}

function renderTracker() {
  renderHabitStrip();
  renderTrackerInsights();
  renderWeekStrip();
  renderHistory();
  updateBudgetInsight();
  if (window.lucide) window.lucide.createIcons();
}

function closeMealLogDialog() {
  document.getElementById("mealLogDialog")?.close();
}

function openMealLogDialog(entry) {
  const dialog = document.getElementById("mealLogDialog");
  if (!dialog || !entry) return;
  document.getElementById("mealLogEntryId").value = entry.entryId;
  document.getElementById("mealLogFoodName").textContent = entry.name;
  document.getElementById("mealLogRestaurant").textContent = entry.restaurant;
  document.getElementById("mealLogSuggestion").textContent = mealTimeLabel(entry);
  document.getElementById("mealLogPrice").value = String(entry.price || "");
  document.getElementById("mealLogNote").value = entry.note || "";
  document.getElementById("mealLogBudgetHint").textContent = "Update the amount or note for this meal log.";
  document.getElementById("mealLogRemove").hidden = false;
  document.getElementById("mealLogRemove").dataset.entryId = entry.entryId;
  dialog.showModal();
  if (window.lucide) window.lucide.createIcons();
}

function restoreTracker() {
  const budget = getBudgetState();
  document.getElementById("weeklyBudget").value = budget.weekly || "";
  document.getElementById("weeklySpent").value = String(weeklySpentTotal());
}

function setupTrackerPage() {
  document.getElementById("weeklyBudget")?.addEventListener("input", () => {
    updateBudgetState();
    updateBudgetInsight();
  });

  document.querySelectorAll("[data-history-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      currentHistorySort = button.dataset.historySort || "latest";
      renderHistory();
      if (window.lucide) window.lucide.createIcons();
    });
  });

  document.getElementById("clearHistory")?.addEventListener("click", () => {
    if (!getHistory().length) {
      showToast("No food history to clear yet.");
      return;
    }
    const confirmed = window.confirm("Clear your food history? This will reset your streak and saved spending history.");
    if (!confirmed) return;
    saveHistory([]);
    showToast("Food history cleared.");
  });

  document.getElementById("weeklyHistory")?.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-history-edit]");
    const removeButton = event.target.closest("[data-history-remove]");
    if (editButton) {
      const entry = getHistory().map(normalizeHistoryEntry).find((item) => item.entryId === editButton.dataset.historyEdit);
      if (entry) openMealLogDialog(entry);
      return;
    }
    if (removeButton) {
      removeHistoryEntry(removeButton.dataset.historyRemove);
      showToast("Removed meal log.");
    }
  });

  document.getElementById("closeMealLog")?.addEventListener("click", closeMealLogDialog);
  document.getElementById("mealLogDialog")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) closeMealLogDialog();
  });

  document.getElementById("mealLogRemove")?.addEventListener("click", () => {
    const entryId = document.getElementById("mealLogRemove")?.dataset.entryId;
    if (!entryId) return;
    removeHistoryEntry(entryId);
    closeMealLogDialog();
    showToast("Removed meal log.");
  });

  document.getElementById("mealLogForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const entryId = document.getElementById("mealLogEntryId").value;
    const price = Number(document.getElementById("mealLogPrice").value || 0);
    if (!entryId || !price) {
      showToast("Add the amount you spent first.");
      return;
    }
    const note = document.getElementById("mealLogNote").value.trim();
    const next = getHistory().map(normalizeHistoryEntry).map((item) => (
      item.entryId === entryId ? { ...item, price, note } : item
    ));
    saveHistory(next);
    closeMealLogDialog();
    showToast(`Updated meal to ${formatPeso(price)}.`);
  });
}

window.addEventListener("saan:auth-changed", () => {
  restoreTracker();
  renderTracker();
});

document.addEventListener("DOMContentLoaded", async () => {
  await window.SaanAuth?.ready;
  restoreTracker();
  renderTracker();
  setupTrackerPage();
});
