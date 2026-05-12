const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const SOURCE_URL = "https://api.frankfurter.dev/v2/rate";
const CURRENCIES = ["USD", "JPY", "EUR"];

let cache = null;

function json(res, status, payload) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
  res.status(status).send(JSON.stringify(payload));
}

async function fetchRate(currency) {
  const response = await fetch(`${SOURCE_URL}/${currency}/KRW`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) throw new Error(`Exchange rate failed: ${currency}`);

  const payload = await response.json();
  const rate = Number(payload.rate);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error(`Invalid exchange rate: ${currency}`);

  return {
    currency,
    date: payload.date,
    rate,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const now = Date.now();
    if (cache && now - cache.cachedAt < CACHE_TTL_MS) {
      json(res, 200, cache.payload);
      return;
    }

    const rows = await Promise.all(CURRENCIES.map(fetchRate));
    const payload = {
      base: "KRW",
      rates: rows.reduce((rates, row) => {
        rates[row.currency] = row.rate;
        return rates;
      }, { KRW: 1 }),
      date: rows[0]?.date || new Date().toISOString().slice(0, 10),
      source: "Frankfurter ECB",
      cachedAt: new Date(now).toISOString(),
    };

    cache = { cachedAt: now, payload };
    json(res, 200, payload);
  } catch (error) {
    if (cache) {
      json(res, 200, { ...cache.payload, stale: true });
      return;
    }

    json(res, 502, { error: error.message || "환율 조회 실패" });
  }
}
