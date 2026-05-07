const STORAGE_KEY = "insung-subscription-ledger-v1";
const AUDIT_KEY = "insung-subscription-audit-v1";
const SETTINGS_KEY = "insung-subscription-settings-v1";
const NOTIFIED_KEY = "insung-subscription-notified-v1";

const cycleLabels = {
  weekly: "매주",
  monthly: "매월",
  quarterly: "분기",
  yearly: "매년",
};

const cycleMonths = {
  weekly: 52 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

const currencyOrder = ["KRW", "JPY", "USD", "EUR"];
const defaultPaymentMethods = ["카드결제", "앱스토어", "휴대폰"];
const defaultCategories = ["AI/업무", "영상/편집", "영상/음악", "디자인", "쇼핑", "서버/도메인", "생활", "기타"];
const statusLabels = {
  active: "활성",
  paused: "보류",
  canceled: "구독해지",
};

const auditSources = [
  {
    id: "app-store",
    title: "Apple App Store",
    detail: "iPhone 설정 > Apple ID > 구독",
    query: "Apple App Store 구독",
  },
  {
    id: "google-play",
    title: "Google Play",
    detail: "Play 스토어 > 프로필 > 결제 및 정기 결제",
    query: "Google Play 정기 결제",
  },
  {
    id: "card-history",
    title: "카드 승인내역",
    detail: "최근 3개월 승인내역에서 매월 반복되는 금액 확인",
    query: "정기결제 구독 승인",
  },
  {
    id: "bank-auto",
    title: "계좌 자동이체",
    detail: "은행 앱 자동이체/예약이체/출금 예정 내역",
    query: "자동이체 정기결제",
  },
  {
    id: "easy-pay",
    title: "간편결제",
    detail: "카카오페이, 네이버페이, 토스, 페이팔 정기결제",
    query: "정기결제 자동결제",
  },
  {
    id: "email",
    title: "이메일 영수증",
    detail: "영수증, receipt, invoice, subscription, renewal 검색",
    query: "영수증 receipt invoice subscription renewal",
  },
  {
    id: "sms",
    title: "문자/알림",
    detail: "카드 승인 문자와 앱 푸시에서 반복 결제명 확인",
    query: "승인 정기결제 자동결제",
  },
  {
    id: "work-tools",
    title: "업무 계정",
    detail: "OpenAI, Canva, Adobe, Vercel, 도메인, 서버, 디자인 툴",
    query: "OpenAI Canva Adobe Vercel 도메인 서버 구독",
  },
];

const demoSubscriptions = [
  {
    id: "demo-chatgpt",
    name: "ChatGPT",
    amount: 20,
    currency: "USD",
    cycle: "monthly",
    nextDate: "2026-05-20",
    category: "AI/업무",
    paymentMethod: "카드결제",
    status: "active",
  },
  {
    id: "demo-capcut",
    name: "CapCut",
    amount: 11000,
    currency: "KRW",
    cycle: "monthly",
    nextDate: "2026-05-15",
    category: "영상/편집",
    paymentMethod: "카드결제",
    status: "active",
  },
  {
    id: "demo-vrew",
    name: "Vrew",
    amount: 14900,
    currency: "KRW",
    cycle: "monthly",
    nextDate: "2026-05-27",
    category: "영상/편집",
    paymentMethod: "카드결제",
    status: "active",
  },
];

let settings = loadSettings();
let subscriptions = loadSubscriptions();
let auditState = loadAuditState();
let notifiedState = loadNotifiedState();
let notificationTimers = [];

const els = {
  form: document.querySelector("#subscriptionForm"),
  editingId: document.querySelector("#editingId"),
  formTitle: document.querySelector("#formTitle"),
  saveButton: document.querySelector("#saveButton"),
  serviceName: document.querySelector("#serviceName"),
  amount: document.querySelector("#amount"),
  currency: document.querySelector("#currency"),
  cycle: document.querySelector("#cycle"),
  nextDate: document.querySelector("#nextDate"),
  category: document.querySelector("#category"),
  paymentMethod: document.querySelector("#paymentMethod"),
  status: document.querySelector("#status"),
  clearForm: document.querySelector("#clearForm"),
  openForm: document.querySelector("#openForm"),
  closeForm: document.querySelector("#closeForm"),
  openSettings: document.querySelector("#openSettings"),
  closeSettings: document.querySelector("#closeSettings"),
  formDialog: document.querySelector("#formDialog"),
  settingsDialog: document.querySelector("#settingsDialog"),
  subscriptionList: document.querySelector("#subscriptionList"),
  emptyState: document.querySelector("#emptyState"),
  monthlyTotal: document.querySelector("#monthlyTotal"),
  yearlyTotal: document.querySelector("#yearlyTotal"),
  dueSoonCount: document.querySelector("#dueSoonCount"),
  activeCount: document.querySelector("#activeCount"),
  upcomingList: document.querySelector("#upcomingList"),
  upcomingCount: document.querySelector("#upcomingCount"),
  auditList: document.querySelector("#auditList"),
  auditProgress: document.querySelector("#auditProgress"),
  notificationToggle: document.querySelector("#notificationToggle"),
  notificationStatus: document.querySelector("#notificationStatus"),
  paymentMethodForm: document.querySelector("#paymentMethodForm"),
  paymentMethodInput: document.querySelector("#paymentMethodInput"),
  paymentMethodList: document.querySelector("#paymentMethodList"),
  categoryForm: document.querySelector("#categoryForm"),
  categoryInput: document.querySelector("#categoryInput"),
  categoryList: document.querySelector("#categoryList"),
  toast: document.querySelector("#toast"),
};

init();

function init() {
  applyTheme(settings.theme);

  if (!localStorage.getItem(STORAGE_KEY)) {
    subscriptions = demoSubscriptions.map((item) => ({ ...item }));
    saveSubscriptions();
  }

  els.nextDate.value = toISODate(new Date());
  bindEvents();
  renderSettings();
  render();
  updateNotificationStatus();
  schedulePaymentNotifications();
}

function bindEvents() {
  els.form.addEventListener("submit", handleSubmit);
  bindFoldAnimations();
  els.openForm.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openSubscriptionForm();
  });
  els.closeForm.addEventListener("click", closeSubscriptionForm);
  els.clearForm.addEventListener("click", closeSubscriptionForm);
  els.openSettings.addEventListener("click", openSettingsDialog);
  els.closeSettings.addEventListener("click", closeSettingsDialog);
  els.formDialog.addEventListener("click", (event) => {
    if (event.target === els.formDialog) closeSubscriptionForm();
  });
  els.settingsDialog.addEventListener("click", (event) => {
    if (event.target === els.settingsDialog) closeSettingsDialog();
  });
  els.formDialog.addEventListener("cancel", () => resetForm());
  els.settingsDialog.addEventListener("cancel", closeSettingsDialog);
  els.notificationToggle.addEventListener("change", handleNotificationToggle);
  els.paymentMethodForm.addEventListener("submit", (event) => handleSettingAdd(event, "paymentMethods"));
  els.categoryForm.addEventListener("submit", (event) => handleSettingAdd(event, "categories"));
  els.paymentMethodList.addEventListener("click", (event) => handleSettingDelete(event, "paymentMethods"));
  els.categoryList.addEventListener("click", (event) => handleSettingDelete(event, "categories"));
  document.querySelectorAll("[data-theme-value]").forEach((button) => {
    button.addEventListener("click", () => updateTheme(button.dataset.themeValue));
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) schedulePaymentNotifications();
  });
  els.auditList.addEventListener("click", handleAuditClick);

  els.subscriptionList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const { id, action } = button.dataset;
    if (action === "edit") editSubscription(id);
    if (action === "advance") advanceSubscription(id);
    if (action === "delete") deleteSubscription(id);
  });
}

function bindFoldAnimations() {
  const panels = document.querySelectorAll("details.fold-panel, details.audit-panel");
  panels.forEach((panel) => {
    const summary = panel.querySelector("summary");
    if (!summary) return;

    summary.addEventListener("click", (event) => {
      event.preventDefault();
      toggleFoldPanel(panel);
    });
  });
}

function toggleFoldPanel(panel) {
  if (panel.dataset.animating === "true") return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    panel.open = !panel.open;
    return;
  }

  if (typeof panel.animate !== "function") {
    panel.open = !panel.open;
    return;
  }

  if (panel.open) {
    collapseFoldPanel(panel);
  } else {
    expandFoldPanel(panel);
  }
}

function expandFoldPanel(panel) {
  panel.dataset.animating = "true";
  const startHeight = `${panel.offsetHeight}px`;
  panel.open = true;
  const endHeight = `${panel.scrollHeight}px`;

  panel.style.height = startHeight;
  panel.style.overflow = "hidden";

  requestAnimationFrame(() => {
    const animation = panel.animate({ height: [startHeight, endHeight] }, foldTiming());
    animation.onfinish = () => cleanupFoldPanel(panel);
    animation.oncancel = () => cleanupFoldPanel(panel);
  });
}

function collapseFoldPanel(panel) {
  panel.dataset.animating = "true";
  const summary = panel.querySelector("summary");
  const startHeight = `${panel.offsetHeight}px`;
  const endHeight = `${summary ? summary.offsetHeight : 0}px`;

  panel.style.height = startHeight;
  panel.style.overflow = "hidden";

  requestAnimationFrame(() => {
    const animation = panel.animate({ height: [startHeight, endHeight] }, foldTiming());
    animation.onfinish = () => {
      panel.open = false;
      cleanupFoldPanel(panel);
    };
    animation.oncancel = () => cleanupFoldPanel(panel);
  });
}

function cleanupFoldPanel(panel) {
  panel.style.height = "";
  panel.style.overflow = "";
  panel.dataset.animating = "false";
}

function foldTiming() {
  return {
    duration: 210,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  };
}

function handleSubmit(event) {
  event.preventDefault();

  const data = {
    id: els.editingId.value || createId(),
    name: els.serviceName.value.trim(),
    amount: Number(els.amount.value),
    currency: els.currency.value,
    cycle: els.cycle.value,
    nextDate: els.nextDate.value,
    category: normalizeCategory(els.category.value),
    paymentMethod: normalizePaymentMethod(els.paymentMethod.value),
    status: els.status.value,
  };

  if (!data.name || !Number.isFinite(data.amount) || data.amount < 0 || !data.nextDate) {
    showToast("입력값을 확인해줘");
    return;
  }

  const index = subscriptions.findIndex((item) => item.id === data.id);
  if (index >= 0) {
    subscriptions[index] = data;
    showToast("구독을 수정했어");
  } else {
    subscriptions.unshift(data);
    showToast("구독을 추가했어");
  }

  saveSubscriptions();
  closeSubscriptionForm();
  render();
}

function openSubscriptionForm() {
  resetForm();
  openDialog();
}

function closeSubscriptionForm() {
  if (els.formDialog.open) els.formDialog.close();
  els.formDialog.classList.remove("open");
  resetForm();
}

function openSettingsDialog() {
  renderSettings();
  openDialog(els.settingsDialog);
}

function closeSettingsDialog() {
  if (els.settingsDialog.open) els.settingsDialog.close();
  els.settingsDialog.classList.remove("open");
}

function openDialog(dialog = els.formDialog) {
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
    dialog.classList.add("open");
  }

  if (dialog === els.formDialog) {
    window.setTimeout(() => els.serviceName.focus(), 40);
  }
}

function editSubscription(id) {
  const item = subscriptions.find((subscription) => subscription.id === id);
  if (!item) return;

  els.editingId.value = item.id;
  els.serviceName.value = item.name;
  els.amount.value = item.amount;
  els.currency.value = item.currency;
  els.cycle.value = item.cycle;
  els.nextDate.value = item.nextDate;
  renderFormOptions(item.category, item.paymentMethod);
  els.category.value = item.category;
  els.paymentMethod.value = item.paymentMethod;
  els.status.value = item.status;
  els.formTitle.textContent = "구독 수정";
  els.saveButton.textContent = "수정";
  openDialog();
}

function advanceSubscription(id) {
  const item = subscriptions.find((subscription) => subscription.id === id);
  if (!item) return;

  const nextDue = getNextDueDate(item);
  item.nextDate = toISODate(addCycle(nextDue, item.cycle));
  saveSubscriptions();
  render();
  showToast("다음 결제일로 넘겼어");
}

function deleteSubscription(id) {
  const item = subscriptions.find((subscription) => subscription.id === id);
  if (!item) return;

  const ok = window.confirm(`${item.name} 구독을 삭제할까?`);
  if (!ok) return;

  subscriptions = subscriptions.filter((subscription) => subscription.id !== id);
  saveSubscriptions();
  render();
  showToast("구독을 삭제했어");
}

function resetForm() {
  els.form.reset();
  els.editingId.value = "";
  els.nextDate.value = toISODate(new Date());
  renderFormOptions();
  els.formTitle.textContent = "구독 등록";
  els.saveButton.textContent = "저장";
}

function render() {
  renderFormOptions(els.category.value, els.paymentMethod.value);
  renderSummary();
  renderSubscriptionCards();
  renderUpcoming();
  renderAuditChecklist();
  schedulePaymentNotifications();
}

function renderSummary() {
  const active = subscriptions.filter((item) => item.status === "active");
  const monthlyTotals = sumByCurrency(active, (item) => monthlyAmount(item));
  const yearlyTotals = sumByCurrency(active, (item) => monthlyAmount(item) * 12);
  const dueSoon = active.filter((item) => {
    const days = daysUntil(getNextDueDate(item));
    return days >= 0 && days <= 7;
  });

  els.monthlyTotal.innerHTML = totalsMarkup(monthlyTotals);
  els.yearlyTotal.innerHTML = totalsMarkup(yearlyTotals);
  els.dueSoonCount.textContent = `${dueSoon.length}건`;
  els.activeCount.textContent = `${active.length}개`;
}

function renderSubscriptionCards() {
  const rows = sortedSubscriptions();
  els.subscriptionList.innerHTML = "";
  els.emptyState.hidden = rows.length > 0;

  const fragment = document.createDocumentFragment();

  rows.forEach((item) => {
    const nextDue = getNextDueDate(item);
    const dday = daysUntil(nextDue);
    const row = document.createElement("article");
    row.className = "subscription-card";
    row.innerHTML = `
      <div class="subscription-card-top">
        <span class="category-chip" title="${escapeHtml(item.category)}">${escapeHtml(item.category || "기타")}</span>
        <span class="card-badges">
          <span class="status-badge ${item.status}">${statusLabels[item.status] || "활성"}</span>
          ${item.status === "active" ? `<span class="${dDayClass(dday)}">${dDayLabel(dday)}</span>` : ""}
        </span>
      </div>
      <div class="subscription-card-main">
        <div class="service-cell">
          <span class="service-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
          <span class="service-meta">${escapeHtml(compactMeta(item))}</span>
        </div>
        <div class="subscription-amount">
          <span class="amount-main">${formatMoney(item.amount, item.currency)}</span>
          <span class="amount-sub">월 ${formatMoney(monthlyAmount(item), item.currency)}</span>
        </div>
      </div>
      <dl class="subscription-details">
        <div>
          <dt>주기</dt>
          <dd>${cycleLabels[item.cycle] || item.cycle}</dd>
        </div>
        <div>
          <dt>다음 결제</dt>
          <dd><span>${formatDisplayDate(nextDue)}</span></dd>
        </div>
      </dl>
      <div class="row-actions">
        <button type="button" data-action="advance" data-id="${item.id}" title="다음 결제일로 넘기기" aria-label="다음 결제일로 넘기기">
          ${icon("check")}
        </button>
        <button type="button" data-action="edit" data-id="${item.id}" title="수정" aria-label="수정">
          ${icon("edit")}
        </button>
        <button class="danger" type="button" data-action="delete" data-id="${item.id}" title="삭제" aria-label="삭제">
          ${icon("trash")}
        </button>
      </div>
    `;
    fragment.append(row);
  });

  els.subscriptionList.append(fragment);
}

function renderUpcoming() {
  const upcoming = subscriptions
    .filter((item) => item.status === "active")
    .map((item) => ({ item, nextDue: getNextDueDate(item) }))
    .filter(({ nextDue }) => {
      const days = daysUntil(nextDue);
      return days >= 0 && days <= 7;
    })
    .sort((a, b) => a.nextDue - b.nextDue);

  els.upcomingList.innerHTML = "";
  els.upcomingCount.textContent = `${upcoming.length}건`;

  if (!upcoming.length) {
    const empty = document.createElement("li");
    empty.innerHTML = `
      <div class="timeline-date">없음</div>
      <div class="timeline-service"><strong>7일 내 결제 없음</strong><span>활성 구독 기준</span></div>
      <div class="timeline-amount">-</div>
    `;
    els.upcomingList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();
  upcoming.forEach(({ item, nextDue }) => {
    const row = document.createElement("li");
    row.innerHTML = `
      <div class="timeline-date">${dDayLabel(daysUntil(nextDue))}</div>
      <div class="timeline-service">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${formatDisplayDate(nextDue)} · ${escapeHtml(item.paymentMethod || "결제수단 미지정")}</span>
      </div>
      <div class="timeline-amount">${formatMoney(item.amount, item.currency)}</div>
    `;
    fragment.append(row);
  });

  els.upcomingList.append(fragment);
}

function renderAuditChecklist() {
  const completed = auditSources.filter((source) => auditState[source.id]).length;
  els.auditProgress.textContent = `${completed}/${auditSources.length}`;
  els.auditList.innerHTML = "";

  const fragment = document.createDocumentFragment();
  auditSources.forEach((source) => {
    const item = document.createElement("article");
    item.className = "audit-item";
    item.innerHTML = `
      <label class="audit-check">
        <input type="checkbox" data-audit-id="${source.id}" ${auditState[source.id] ? "checked" : ""} />
        <span>
          <strong>${escapeHtml(source.title)}</strong>
          <small>${escapeHtml(source.detail)}</small>
        </span>
      </label>
      <button class="icon-button mini" type="button" data-copy-query="${escapeHtml(source.query)}" title="검색어 복사" aria-label="검색어 복사">
        ${icon("copy")}
      </button>
    `;
    fragment.append(item);
  });

  els.auditList.append(fragment);
}

function renderFormOptions(selectedCategory = "", selectedPaymentMethod = "") {
  renderSelectOptions(els.category, settings.categories, normalizeCategory(selectedCategory));
  renderSelectOptions(els.paymentMethod, settings.paymentMethods, normalizePaymentMethod(selectedPaymentMethod));
}

function renderSelectOptions(select, values, selectedValue) {
  select.innerHTML = "";
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
  select.value = values.includes(selectedValue) ? selectedValue : values[0] || "";
}

function renderSettings() {
  renderFormOptions(els.category.value, els.paymentMethod.value);
  renderSettingList(els.paymentMethodList, settings.paymentMethods, "paymentMethods");
  renderSettingList(els.categoryList, settings.categories, "categories");
  els.notificationToggle.checked = settings.notificationsEnabled;
  updateNotificationStatus();

  document.querySelectorAll("[data-theme-value]").forEach((button) => {
    button.classList.toggle("active", button.dataset.themeValue === settings.theme);
  });
}

function renderSettingList(container, values, type) {
  container.innerHTML = "";
  values.forEach((value) => {
    const row = document.createElement("article");
    row.className = "settings-row";
    row.innerHTML = `
      <span>${escapeHtml(value)}</span>
      <button class="icon-button mini" type="button" data-setting-type="${type}" data-setting-value="${escapeHtml(value)}" title="삭제" aria-label="삭제">
        ${icon("trash")}
      </button>
    `;
    container.append(row);
  });
}

function handleSettingAdd(event, type) {
  event.preventDefault();
  const input = type === "paymentMethods" ? els.paymentMethodInput : els.categoryInput;
  const value = input.value.trim();
  if (!value) return;

  if (settings[type].includes(value)) {
    showToast("이미 등록되어 있어");
    return;
  }

  settings[type].push(value);
  input.value = "";
  saveSettings();
  renderSettings();
  showToast("설정에 추가했어");
}

function handleSettingDelete(event, type) {
  const button = event.target.closest("button[data-setting-value]");
  if (!button || button.dataset.settingType !== type) return;

  if (settings[type].length <= 1) {
    showToast("하나는 남겨둬야 해");
    return;
  }

  const value = button.dataset.settingValue;
  const ok = window.confirm(`${value} 항목을 삭제할까?`);
  if (!ok) return;

  settings[type] = settings[type].filter((item) => item !== value);
  saveSettings();
  normalizeSavedSubscriptions();
  renderSettings();
  render();
  showToast("설정에서 삭제했어");
}

async function handleNotificationToggle() {
  if (!els.notificationToggle.checked) {
    settings.notificationsEnabled = false;
    saveSettings();
    clearNotificationTimers();
    updateNotificationStatus();
    showToast("푸시알림을 껐어");
    return;
  }

  if (!("Notification" in window)) {
    els.notificationToggle.checked = false;
    settings.notificationsEnabled = false;
    saveSettings();
    updateNotificationStatus("이 브라우저는 알림을 지원하지 않아");
    return;
  }

  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  settings.notificationsEnabled = permission === "granted";
  els.notificationToggle.checked = settings.notificationsEnabled;
  saveSettings();
  updateNotificationStatus();

  if (settings.notificationsEnabled) {
    schedulePaymentNotifications();
    showToast("결제 하루 전 알림을 켰어");
  } else {
    showToast("알림 권한이 허용되지 않았어");
  }
}

function updateTheme(theme) {
  settings.theme = theme === "dark" ? "dark" : "light";
  saveSettings();
  applyTheme(settings.theme);
  renderSettings();
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
}

function updateNotificationStatus(message = "") {
  if (!els.notificationStatus) return;
  if (!("Notification" in window)) {
    els.notificationStatus.textContent = message || "지원 안 됨";
    return;
  }

  const status = {
    granted: "허용됨",
    denied: "차단됨",
    default: "권한 필요",
  };
  els.notificationStatus.textContent = message || status[Notification.permission] || "권한 필요";
}

function schedulePaymentNotifications() {
  clearNotificationTimers();
  if (!settings.notificationsEnabled || !("Notification" in window) || Notification.permission !== "granted") return;

  const now = new Date();
  subscriptions
    .filter((item) => item.status === "active")
    .forEach((item) => {
      const nextDue = getNextDueDate(item);
      const notifyAt = getNotificationDate(nextDue);
      const delay = notifyAt - now;

      if (delay <= 0 && daysUntil(nextDue) === 1) {
        showPaymentNotification(item, nextDue);
        return;
      }

      if (delay > 0 && delay <= 2147483647) {
        notificationTimers.push(window.setTimeout(() => showPaymentNotification(item, nextDue), delay));
      }
    });
}

function clearNotificationTimers() {
  notificationTimers.forEach((timer) => window.clearTimeout(timer));
  notificationTimers = [];
}

function getNotificationDate(nextDue) {
  const notificationDate = addDays(startOfDay(nextDue), -1);
  notificationDate.setHours(9, 0, 0, 0);
  return notificationDate;
}

async function showPaymentNotification(item, nextDue) {
  const notificationKey = `${item.id}:${toISODate(nextDue)}`;
  if (notifiedState[notificationKey]) return;

  const title = `${item.name} 내일 결제`;
  const body = `${formatMoney(item.amount, item.currency)} · ${formatDisplayDate(nextDue)}`;

  try {
    const registration = await navigator.serviceWorker?.getRegistration?.();
    if (registration?.showNotification) {
      await registration.showNotification(title, {
        body,
        icon: "/icon.svg",
        badge: "/icon.svg",
        tag: notificationKey,
      });
    } else {
      new Notification(title, { body, icon: "/icon.svg", tag: notificationKey });
    }
    notifiedState[notificationKey] = true;
    saveNotifiedState();
  } catch {
    showToast("알림을 보내지 못했어");
  }
}

function handleAuditClick(event) {
  const checkbox = event.target.closest("input[data-audit-id]");
  if (checkbox) {
    auditState[checkbox.dataset.auditId] = checkbox.checked;
    saveAuditState();
    renderAuditChecklist();
    return;
  }

  const copyButton = event.target.closest("button[data-copy-query]");
  if (!copyButton) return;
  copyText(copyButton.dataset.copyQuery);
}

function sortedSubscriptions() {
  const statusOrder = { active: 0, paused: 1, canceled: 2 };
  return [...subscriptions].sort((a, b) => {
    const statusDiff = (statusOrder[a.status] ?? 0) - (statusOrder[b.status] ?? 0);
    if (statusDiff) return statusDiff;
    return getNextDueDate(a) - getNextDueDate(b);
  });
}

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    const paymentMethods = cleanList(stored.paymentMethods, defaultPaymentMethods);
    const categories = cleanList(stored.categories, defaultCategories);
    return {
      paymentMethods,
      categories,
      notificationsEnabled: Boolean(stored.notificationsEnabled),
      theme: stored.theme === "dark" ? "dark" : "light",
    };
  } catch {
    return {
      paymentMethods: [...defaultPaymentMethods],
      categories: [...defaultCategories],
      notificationsEnabled: false,
      theme: "light",
    };
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function cleanList(values, fallback) {
  const rows = Array.isArray(values) ? values : fallback;
  const cleaned = rows.map((value) => String(value || "").trim()).filter(Boolean);
  return [...new Set(cleaned.length ? cleaned : fallback)];
}

function loadSubscriptions() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(stored)) return [];
    return stored.map(normalizeSubscription).filter(Boolean);
  } catch {
    return [];
  }
}

function saveSubscriptions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
}

function loadAuditState() {
  try {
    const stored = JSON.parse(localStorage.getItem(AUDIT_KEY) || "{}");
    return stored && typeof stored === "object" ? stored : {};
  } catch {
    return {};
  }
}

function saveAuditState() {
  localStorage.setItem(AUDIT_KEY, JSON.stringify(auditState));
}

function loadNotifiedState() {
  try {
    const stored = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "{}");
    return stored && typeof stored === "object" ? stored : {};
  } catch {
    return {};
  }
}

function saveNotifiedState() {
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(notifiedState));
}

function normalizeSavedSubscriptions() {
  subscriptions = subscriptions.map(normalizeSubscription).filter(Boolean);
  saveSubscriptions();
}

function normalizeSubscription(item) {
  if (!item || !item.name) return null;
  return {
    id: String(item.id || createId()),
    name: String(item.name || "").trim(),
    amount: Number(item.amount) || 0,
    currency: currencyOrder.includes(item.currency) ? item.currency : "KRW",
    cycle: cycleLabels[item.cycle] ? item.cycle : "monthly",
    nextDate: isISODate(item.nextDate) ? item.nextDate : toISODate(new Date()),
    category: normalizeCategory(item.category),
    paymentMethod: normalizePaymentMethod(item.paymentMethod),
    status: statusLabels[item.status] ? item.status : "active",
  };
}

function normalizePaymentMethod(value) {
  const method = String(value || "").trim();
  const methods = settings?.paymentMethods?.length ? settings.paymentMethods : defaultPaymentMethods;
  if (methods.includes(method)) return method;
  if (method.includes("앱스토어") || method.includes("App Store")) return "앱스토어";
  if (method.includes("휴대폰") || method.includes("통신")) return "휴대폰";
  return methods[0] || "카드결제";
}

function normalizeCategory(value) {
  const category = String(value || "").trim();
  const categories = settings?.categories?.length ? settings.categories : defaultCategories;
  if (categories.includes(category)) return category;
  return categories[0] || "기타";
}

function exportData() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    subscriptions,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `subscription-ledger-${toISODate(new Date())}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  showToast("JSON 파일을 만들었어");
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const imported = Array.isArray(parsed) ? parsed : parsed.subscriptions;
      if (!Array.isArray(imported)) throw new Error("Invalid shape");

      const normalized = imported.map(normalizeSubscription).filter(Boolean);
      if (!normalized.length) throw new Error("No rows");

      const ok = window.confirm(`${normalized.length}개 구독으로 교체할까?`);
      if (!ok) return;

      subscriptions = normalized;
      saveSubscriptions();
      resetForm();
      render();
      showToast("JSON 데이터를 가져왔어");
    } catch {
      showToast("JSON 파일을 읽지 못했어");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    showToast("검색어를 복사했어");
  } catch {
    showToast("복사하지 못했어");
  }
}

function sumByCurrency(items, amountFn) {
  return items.reduce((totals, item) => {
    totals[item.currency] = (totals[item.currency] || 0) + amountFn(item);
    return totals;
  }, {});
}

function totalsMarkup(totals) {
  const currencies = Object.keys(totals).sort((a, b) => currencyOrder.indexOf(a) - currencyOrder.indexOf(b));
  if (!currencies.length) return "0원";

  return currencies
    .map((currency, index) => {
      const value = formatMoney(totals[currency], currency);
      return index === 0 ? value : `<small>${value}</small>`;
    })
    .join("");
}

function monthlyAmount(item) {
  const multiplier = cycleMonths[item.cycle] || 1;
  return item.amount * multiplier;
}

function getNextDueDate(item) {
  let due = parseLocalDate(item.nextDate);
  const today = startOfDay(new Date());
  let guard = 0;

  while (due < today && guard < 800) {
    due = addCycle(due, item.cycle);
    guard += 1;
  }

  return due;
}

function addCycle(date, cycle) {
  if (cycle === "weekly") return addDays(date, 7);
  if (cycle === "quarterly") return addMonths(date, 3);
  if (cycle === "yearly") return addMonths(date, 12);
  return addMonths(date, 1);
}

function addMonths(date, months) {
  const day = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return target;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return startOfDay(new Date(year, month - 1, day));
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysUntil(date) {
  const diff = startOfDay(date) - startOfDay(new Date());
  return Math.round(diff / 86400000);
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isISODate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parseLocalDate(value).getTime());
}

function formatDisplayDate(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function formatMoney(amount, currency) {
  const zeroDecimal = currency === "KRW" || currency === "JPY";
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
    maximumFractionDigits: zeroDecimal ? 0 : 2,
  }).format(amount);
}

function dDayLabel(days) {
  if (days < 0) return `${Math.abs(days)}일 지남`;
  if (days === 0) return "오늘";
  if (days === 1) return "내일";
  return `D-${days}`;
}

function dDayClass(days) {
  const classes = ["d-day"];
  if (days < 0) classes.push("overdue");
  if (days >= 0 && days <= 3) classes.push("due");
  return classes.join(" ");
}

function compactMeta(item) {
  return item.paymentMethod || "결제수단 미지정";
}

function createId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `sub-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message) {
  window.clearTimeout(showToast.timer);
  els.toast.textContent = message;
  els.toast.classList.add("show");
  showToast.timer = window.setTimeout(() => {
    els.toast.classList.remove("show");
  }, 2200);
}

function icon(name) {
  const paths = {
    check: `<path d="M20 6 9 17l-5-5" />`,
    copy: `<rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />`,
    edit: `<path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />`,
    trash: `<path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v5" /><path d="M14 11v5" />`,
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || ""}</svg>`;
}

if ("serviceWorker" in navigator && location.protocol !== "file:" && location.port !== "5173") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  });
}
