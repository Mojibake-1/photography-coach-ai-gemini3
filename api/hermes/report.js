const { setCommonHeaders } = require("../_lib/runtimeConfig");
const {
  buildHermesAppUrl,
  decodeReportPayload,
  renderErrorHtml,
  resolvePublicBaseUrl,
} = require("../_lib/hermesReport");

function readQueryParam(req, key) {
  const raw = req.query && req.query[key];
  if (Array.isArray(raw)) return raw[0] || "";
  return typeof raw === "string" ? raw : "";
}

module.exports = async function handler(req, res) {
  setCommonHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).send(renderErrorHtml("Method not allowed"));
  }

  try {
    const payload = readQueryParam(req, "payload");
    const report = decodeReportPayload(payload);
    const format = readQueryParam(req, "format");

    if (format === "json") {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      return res.status(200).send(JSON.stringify(report, null, 2));
    }

    const baseUrl = resolvePublicBaseUrl(req);
    res.setHeader("Location", buildHermesAppUrl(baseUrl, payload));
    return res.status(307).end();
  } catch (error) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    return res
      .status(400)
      .send(renderErrorHtml(error && error.message ? error.message : "Invalid report payload"));
  }
};
