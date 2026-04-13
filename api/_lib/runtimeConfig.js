// api/_lib/runtimeConfig.js
// Resolves AI API node configuration from:
//   1. Request body/headers (muxing bridge)
//   2. Vercel environment variables
//   3. Legacy hardcoded fallback nodes

const LEGACY_NODES = [
  {
    name: "ice.v.ua",
    url: "https://ice.v.ua/v1/chat/completions",
    model: "gpt-5.4",
    key: "sk-007db0ad23e3ab85918eb08de4187c0654bc2acb0988f71ac40add0017e98a37",
  },
  {
    name: "sub.jlypx.de",
    url: "https://sub.jlypx.de/v1/chat/completions",
    model: "gpt-5.4",
    key: "sk-f1250bccbce10ee23f410b4f94dd326afd56db4e768769c7fc6a4fd504e37022",
  },
  {
    name: "newapi.linuxdo",
    url: "https://newapi.linuxdo.edu.rs/v1/chat/completions",
    model: "gpt-5.4",
    key: "sk-dt49ElOb8YE8FsZN0TtgUuBtyN4cehJC74l0I6keH4hKC3bX",
  },
  {
    name: "xingyungept",
    url: "https://ai.xingyungept.cn/v1/chat/completions",
    model: "gpt-5.2-Welfare",
    key: "sk-HG7YvrZXvG1SljDuTQgvzs5gjBBHgHmhUjBXDkeEMCDg79Ny",
  },
];

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
  // Already a full chat completions URL
  if (/\/v1\/chat\/completions\/?$/i.test(normalized)) return normalized.replace(/\/+$/, "");
  // Has /v1 base path, just append /chat/completions
  if (/\/v1\/?$/i.test(normalized)) return normalized.replace(/\/+$/, "") + "/chat/completions";
  // Raw base URL (e.g. https://api.example.com), append full path
  return normalized + "/v1/chat/completions";
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
        ...LEGACY_NODES,
      ],
    };
  }

  // Priority 3: Legacy fallback nodes
  return {
    source: "legacy",
    config: null,
    nodes: LEGACY_NODES.slice(),
  };
}

function setCommonHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function toSafeHeaderValue(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  // Node/Vercel response headers reject non-ASCII values such as Chinese node names.
  return /^[\x20-\x7E]+$/.test(text) ? text : "";
}

function setRouteHeaders(res, meta = {}) {
  const nodeName = toSafeHeaderValue(meta.nodeName);
  const model = toSafeHeaderValue(meta.model);
  const configSource = toSafeHeaderValue(meta.configSource);
  const apiStatus = toSafeHeaderValue(meta.apiStatus);

  if (nodeName) res.setHeader("X-Active-Node", nodeName);
  if (model) res.setHeader("X-Active-Model", model);
  if (configSource) res.setHeader("X-Config-Source", configSource);
  if (apiStatus) res.setHeader("X-Api-Status", apiStatus);
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
