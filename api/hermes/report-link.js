const { readRequestBody, setCommonHeaders } = require("../_lib/runtimeConfig");
const {
  encodeReportPayload,
  isAuthorizedRequest,
  normalizeReportPayload,
  resolvePublicBaseUrl,
} = require("../_lib/hermesReport");

module.exports = async function handler(req, res) {
  setCommonHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const body = readRequestBody(req);

    if (!isAuthorizedRequest(req, body)) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized Hermes request",
      });
    }

    const report = normalizeReportPayload(body);
    const encoded = encodeReportPayload(report);
    const baseUrl = resolvePublicBaseUrl(req);
    const reportUrl = `${baseUrl}/api/hermes/report?payload=${encodeURIComponent(encoded.token)}`;

    return res.status(200).json({
      success: true,
      reportId: report.reportId,
      reportUrl,
      stats: {
        jsonBytes: encoded.jsonBytes,
        gzipBytes: encoded.gzipBytes,
        tokenLength: encoded.tokenLength,
      },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error && error.message ? error.message : "Unable to create report link",
    });
  }
};
