const { setCommonHeaders } = require("../_lib/runtimeConfig");
const {
  decodeReportPayload,
  renderErrorHtml,
  renderReportHtml,
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

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self' data: https:; img-src 'self' data: https:; style-src 'unsafe-inline' 'self'; script-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'"
    );
    return res.status(200).send(renderReportHtml(report));
  } catch (error) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    return res
      .status(400)
      .send(renderErrorHtml(error && error.message ? error.message : "Invalid report payload"));
  }
};
