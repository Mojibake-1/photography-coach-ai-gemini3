// api/_lib/runtimeConfig.js
// Resolves AI API node configuration from:
//   1. Request body/headers (muxing bridge)
//   2. Vercel environment variables
// NOTE: Legacy hardcoded nodes have been REMOVED for security.

const REQUEST_LIMIT_PATTERNS = [
  /max_tokens/i,
  /model output limit/i,
  /context length/i,
  /too many tokens/i,
  /could not finish the message because max_tokens or model output limit was reached/i,
];

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function normalizeChatUrl(value) {
  const normalized = normalizeBaseUrl(value);
  if (!normalized) return "";
  return normalized.includes("/v1/chat/completions")
    ? normalized
    : `${normalized}/v1/chat/completions`;
}

function parseJsonMaybe(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function sanitizeRuntimeConfig(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const baseUrl = normalizeBaseUrl(source.baseUrl || source.url);
  const apiKey = String(source.apiKey || source.key || "").trim();
  const model = String(source.model || source.primaryModel || "").trim();

  if (!baseUrl || !apiKey || !model) {
    return null;
  }

  return {
    nodeId: String(source.nodeId || "").trim() || undefined,
    nodeName: String(source.nodeName || source.name || "").trim() || undefined,
    baseUrl,
    apiKey,
    model,
  };
}

function readRequestBody(req) {
  const body = parseJsonMaybe(req.body);
  return body && typeof body === "object" ? body : {};
}

function readRequestRuntimeConfig(req) {
  const body = readRequestBody(req);
  const fromBody =
    sanitizeRuntimeConfig(body.runtimeConfig) ||
    sanitizeRuntimeConfig(body.muxingConfig) ||
    sanitizeRuntimeConfig(body.apiConfig);

  if (fromBody) {
    return fromBody;
  }

  return sanitizeRuntimeConfig({
    nodeId: req.headers["x-muxing-node-id"],
    nodeName: req.headers["x-muxing-node-name"],
    baseUrl: req.headers["x-muxing-base-url"],
    apiKey: req.headers["x-muxing-api-key"],
    model: req.headers["x-muxing-model"],
  });
}

function buildNodeFromConfig(config, defaultName) {
  return {
    name: config.nodeName || defaultName || "bridge-node",
    url: normalizeChatUrl(config.baseUrl),
    model: config.model,
    key: config.apiKey,
  };
}

function resolveRuntimeNodes(req) {
  // Priority 1: muxing bridge config from request body/headers
  const requestConfig = readRequestRuntimeConfig(req);
  if (requestConfig) {
    return {
      source: "request",
      config: requestConfig,
      nodes: [buildNodeFromConfig(requestConfig, "bridge-node")],
    };
  }

  // Priority 2: Vercel environment variables
  const envUrl = normalizeChatUrl(
    process.env.AI_URL ||
      process.env.AI_API_URL ||
      process.env.AI_BASE_URL ||
      process.env.OPENAI_BASE_URL ||
      process.env.GEMINI_BASE_URL
  );
  const envKey =
    process.env.AI_KEY ||
    process.env.AI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    "";
  const envModel =
    process.env.AI_MODEL ||
    process.env.OPENAI_MODEL ||
    process.env.GEMINI_MODEL ||
    "";

  if (envUrl && envKey && envModel) {
    return {
      source: "env",
      config: null,
      nodes: [
        {
          name: "env-primary",
          url: envUrl,
          model: envModel,
          key: envKey,
        },
      ],
    };
  }

  // No configuration available — return empty nodes
  return {
    source: "none",
    config: null,
    nodes: [],
  };
}

function setCommonHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function setRouteHeaders(res, meta = {}) {
  if (meta.nodeName) res.setHeader("X-Active-Node", meta.nodeName);
  if (meta.model) res.setHeader("X-Active-Model", meta.model);
  if (meta.configSource) res.setHeader("X-Config-Source", meta.configSource);
  if (meta.apiStatus) res.setHeader("X-Api-Status", meta.apiStatus);
}

function isRequestLimitError(message) {
  const text = String(message || "").trim();
  return REQUEST_LIMIT_PATTERNS.some((pattern) => pattern.test(text));
}

function classifyApiError(status, message) {
  const text = String(message || "").trim();
  if (isRequestLimitError(text)) return "healthy";
  if (status === 400 || status === 422) return "healthy";
  if (status === 401 || status === 403 || status === 404 || status === 429) return "unhealthy";
  if (status >= 500) return "unhealthy";
  if (/timeout|timed out|abort|network/i.test(text)) return "unhealthy";
  return text ? "unhealthy" : "healthy";
}

module.exports = {
  classifyApiError,
  isRequestLimitError,
  normalizeChatUrl,
  readRequestBody,
  resolveRuntimeNodes,
  setCommonHeaders,
  setRouteHeaders,
};
