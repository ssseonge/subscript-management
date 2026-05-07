import { randomUUID } from "node:crypto";

const OWNER_ID = "default";

function json(res, status, payload) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(status).send(JSON.stringify(payload));
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

async function supabaseRequest(path, options = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없어.");

  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: options.method || "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(payload?.message || payload?.error || `Supabase ${response.status}`);
  return payload;
}

function toClientSubscription(row) {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount) || 0,
    currency: row.currency,
    cycle: row.cycle,
    nextDate: row.next_date,
    category: row.category,
    paymentMethod: row.payment_method,
    status: row.status,
  };
}

function toDbSubscription(item) {
  return {
    id: String(item.id || randomUUID()),
    owner_id: OWNER_ID,
    name: String(item.name || "").trim(),
    amount: Number(item.amount) || 0,
    currency: item.currency || "KRW",
    cycle: item.cycle || "monthly",
    next_date: item.nextDate,
    category: String(item.category || "기타").trim(),
    payment_method: String(item.paymentMethod || "카드결제").trim(),
    status: item.status || "active",
    updated_at: new Date().toISOString(),
  };
}

function toClientSettings(row) {
  if (!row) return null;
  return {
    paymentMethods: Array.isArray(row.payment_methods) ? row.payment_methods : [],
    categories: Array.isArray(row.categories) ? row.categories : [],
    notificationsEnabled: Boolean(row.notifications_enabled),
    theme: row.theme === "dark" ? "dark" : "light",
  };
}

function toDbSettings(settings = {}) {
  return {
    owner_id: OWNER_ID,
    payment_methods: Array.isArray(settings.paymentMethods) ? settings.paymentMethods : ["카드결제", "앱스토어", "휴대폰"],
    categories: Array.isArray(settings.categories) ? settings.categories : ["AI/업무", "영상/편집", "기타"],
    notifications_enabled: Boolean(settings.notificationsEnabled),
    theme: settings.theme === "dark" ? "dark" : "light",
    updated_at: new Date().toISOString(),
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const [subscriptions, settingsRows] = await Promise.all([
        supabaseRequest(`subscription_services?owner_id=eq.${OWNER_ID}&select=*&order=created_at.asc`),
        supabaseRequest(`subscription_app_settings?owner_id=eq.${OWNER_ID}&select=*&limit=1`),
      ]);

      json(res, 200, {
        subscriptions: (subscriptions || []).map(toClientSubscription),
        settings: toClientSettings(settingsRows?.[0]),
      });
      return;
    }

    if (req.method === "PUT") {
      const body = await readBody(req);
      const subscriptions = Array.isArray(body.subscriptions) ? body.subscriptions : [];

      await supabaseRequest("subscription_app_settings", {
        method: "POST",
        prefer: "resolution=merge-duplicates,return=minimal",
        body: [toDbSettings(body.settings)],
      });

      await supabaseRequest(`subscription_services?owner_id=eq.${OWNER_ID}`, { method: "DELETE" });

      if (subscriptions.length) {
        await supabaseRequest("subscription_services", {
          method: "POST",
          prefer: "return=minimal",
          body: subscriptions.map(toDbSubscription),
        });
      }

      json(res, 200, { ok: true });
      return;
    }

    res.setHeader("Allow", "GET, PUT");
    json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    json(res, 500, { error: error.message || "DB 연결 실패" });
  }
}
