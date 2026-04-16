const crypto = require("crypto");
const zlib = require("zlib");

const MAX_REPORT_JSON_BYTES = Number(process.env.HERMES_REPORT_MAX_JSON_BYTES || 24 * 1024);
const MAX_REPORT_TOKEN_LENGTH = Number(process.env.HERMES_REPORT_MAX_TOKEN_LENGTH || 6000);
const CJK_TEXT_PATTERN = /[\u3400-\u9fff]/;
const LATIN_WORD_PATTERN = /[A-Za-z]{2,}/;

class HermesValidationError extends Error {
  constructor(message, statusCode = 422) {
    super(message);
    this.name = "HermesValidationError";
    this.statusCode = statusCode;
  }
}

function toPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function toTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanPossiblyBrokenText(value) {
  const normalized = toTrimmedString(value).replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const stripped = normalized
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\uFFFD+/g, " ")
    .replace(/\?{4,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!stripped) return "";

  const dense = stripped.replace(/["'‘’“”.,;:!?，。！？、()[\]{}<>《》【】/\\|_\-\s]/g, "");
  if (!dense) return "";

  const placeholderCount = (stripped.match(/[\?\uFFFD]/g) || []).length;
  const placeholderRatio = dense.length ? placeholderCount / dense.length : 0;

  if (!CJK_TEXT_PATTERN.test(dense) && !LATIN_WORD_PATTERN.test(dense) && placeholderRatio >= 0.35) {
    return "";
  }

  return stripped;
}

function toNonEmptyArray(value) {
  return Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined && item !== "") : [];
}

function parseMaybeJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeBaseUrl(value) {
  return toTrimmedString(value).replace(/\/+$/, "");
}

function normalizeTimestamp(value) {
  const raw = toTrimmedString(value);
  if (!raw) return new Date().toISOString();

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function buildReportId(seed) {
  return crypto.createHash("sha256").update(seed).digest("hex").slice(0, 16);
}

function sanitizeMetadata(value) {
  const source = toPlainObject(value);
  if (!source) return {};

  const allowed = [
    "requestId",
    "workspace",
    "site",
    "skill",
    "skillVersion",
    "promptVersion",
    "schemaVersion",
    "sourceMessageId",
    "sourceFileId",
    "sourceFileSha",
  ];

  return allowed.reduce((result, key) => {
    const normalized = toTrimmedString(source[key]);
    if (normalized) {
      result[key] = normalized;
    }
    return result;
  }, {});
}

function normalizeSource(source, body) {
  const sourceObject = toPlainObject(source) || {};
  return {
    agent: toTrimmedString(sourceObject.agent || body.agent) || "Hermes",
    channel: toTrimmedString(sourceObject.channel || body.channel),
    sender: toTrimmedString(sourceObject.sender || sourceObject.user || body.sender || body.user),
    fileName: toTrimmedString(sourceObject.fileName || body.fileName || body.filename),
    threadId: toTrimmedString(sourceObject.threadId || body.threadId),
    promptName: toTrimmedString(sourceObject.promptName || body.promptName),
    promptVersion: toTrimmedString(sourceObject.promptVersion || body.promptVersion),
    workflow: toTrimmedString(sourceObject.workflow || body.workflow),
  };
}

function collectMeaningfulAnalysisTexts(analysis) {
  const source = toPlainObject(analysis) || {};
  const critique = toPlainObject(source.critique) || {};
  const thinking = toPlainObject(source.thinking) || {};

  const scalarCandidates = [
    source.summary,
    source.verdict,
    critique.overall,
    critique.composition,
    critique.lighting,
    critique.technique,
  ];

  const listCandidates = [
    ...toNonEmptyArray(source.strengths),
    ...toNonEmptyArray(source.improvements),
    ...toNonEmptyArray(source.learningPath),
    ...toNonEmptyArray(source.nextSteps),
    ...toNonEmptyArray(thinking.observations),
    ...toNonEmptyArray(thinking.reasoningSteps),
    ...toNonEmptyArray(thinking.priorityFixes),
  ];

  return [...scalarCandidates, ...listCandidates]
    .map((item) => cleanPossiblyBrokenText(item))
    .filter(Boolean);
}

function validateReportPayload(report) {
  const source = toPlainObject(report) || {};
  const title = cleanPossiblyBrokenText(source.title);
  const analysis = toPlainObject(source.analysis) || {};
  const meaningfulTexts = collectMeaningfulAnalysisTexts(analysis);

  if (!meaningfulTexts.length) {
    throw new HermesValidationError(
      "Analysis text is missing or corrupted. Do not create a share link for this payload."
    );
  }

  if (!title && !cleanPossiblyBrokenText(toPlainObject(source.source)?.fileName)) {
    throw new HermesValidationError("Report title is missing or corrupted.");
  }

  return report;
}

function normalizeReportPayload(body) {
  const source = normalizeSource(body.source, body);
  const analysis =
    parseMaybeJson(body.analysis) ||
    parseMaybeJson(body.report) ||
    parseMaybeJson(body.payload) ||
    parseMaybeJson(body.analysisJson);

  if (!toPlainObject(analysis)) {
    throw new Error("analysis object is required");
  }

  const createdAt = normalizeTimestamp(body.createdAt || body.timestamp);
  const title =
    toTrimmedString(body.title) ||
    source.fileName ||
    toTrimmedString(body.subject) ||
    "Hermes Photo Report";

  const metadata = sanitizeMetadata({
    ...(toPlainObject(body.metadata) || {}),
    ...(toPlainObject(body.extra) || {}),
  });

  const reportSeed = JSON.stringify({
    title,
    createdAt,
    source,
    analysis,
    metadata,
  });

  return validateReportPayload({
    version: 1,
    reportId: toTrimmedString(body.reportId) || buildReportId(reportSeed),
    title,
    createdAt,
    previewUrl:
      toTrimmedString(body.previewUrl) ||
      toTrimmedString(body.imageUrl) ||
      toTrimmedString(body.thumbnailUrl),
    source,
    metadata,
    analysis,
  });
}

function encodeReportPayload(report) {
  const json = JSON.stringify(report);
  const jsonBytes = Buffer.byteLength(json, "utf8");

  if (jsonBytes > MAX_REPORT_JSON_BYTES) {
    throw new Error(`Report JSON is too large (${jsonBytes} bytes)`);
  }

  const gzipped = zlib.gzipSync(Buffer.from(json, "utf8"), { level: 9 });
  const token = `gz1.${gzipped.toString("base64url")}`;

  if (token.length > MAX_REPORT_TOKEN_LENGTH) {
    throw new Error(`Report link payload is too large (${token.length} chars)`);
  }

  return {
    token,
    jsonBytes,
    gzipBytes: gzipped.length,
    tokenLength: token.length,
  };
}

function decodeReportPayload(token) {
  const normalized = toTrimmedString(token);
  if (!normalized) {
    throw new Error("payload is required");
  }

  if (normalized.startsWith("gz1.")) {
    const buffer = Buffer.from(normalized.slice(4), "base64url");
    const json = zlib.gunzipSync(buffer).toString("utf8");
    return JSON.parse(json);
  }

  if (normalized.startsWith("b64.")) {
    const json = Buffer.from(normalized.slice(4), "base64url").toString("utf8");
    return JSON.parse(json);
  }

  throw new Error("Unsupported payload format");
}

function safeCompare(secret, candidate) {
  const left = Buffer.from(String(secret || ""), "utf8");
  const right = Buffer.from(String(candidate || ""), "utf8");
  if (!left.length || left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function readBearerToken(req) {
  const header = toTrimmedString(req.headers.authorization);
  if (!header) return "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

function isAuthorizedRequest(req, body) {
  const secret =
    toTrimmedString(process.env.HERMES_REPORT_SECRET) ||
    toTrimmedString(process.env.HERMES_SHARED_SECRET) ||
    toTrimmedString(process.env.HERMES_API_KEY);

  if (!secret) {
    return true;
  }

  const candidates = [
    readBearerToken(req),
    toTrimmedString(req.headers["x-hermes-secret"]),
    toTrimmedString(body && body.secret),
  ].filter(Boolean);

  return candidates.some((candidate) => safeCompare(secret, candidate));
}

function resolvePublicBaseUrl(req) {
  const envBase =
    normalizeBaseUrl(process.env.HERMES_REPORT_PUBLIC_BASE_URL) ||
    normalizeBaseUrl(process.env.PUBLIC_BASE_URL) ||
    normalizeBaseUrl(process.env.APP_BASE_URL);

  if (envBase) {
    return envBase;
  }

  const proto = toTrimmedString(req.headers["x-forwarded-proto"]) || "https";
  const host = toTrimmedString(req.headers["x-forwarded-host"] || req.headers.host);

  if (!host) {
    throw new Error("Unable to resolve public host");
  }

  return `${proto}://${host}`;
}

function buildHermesAppUrl(baseUrl, token) {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  if (!normalizedBase) {
    throw new Error("Unable to resolve Hermes app URL");
  }

  return `${normalizedBase}/?hr=1&p=${encodeURIComponent(token)}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTimestamp(value) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      dateStyle: "medium",
      timeStyle: "short",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return String(value || "");
  }
}

function renderList(items) {
  if (!items.length) return "";
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function renderKeyValueGrid(entries) {
  const rows = entries
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(
      ([label, value]) =>
        `<div class="kv-row"><span class="kv-label">${escapeHtml(label)}</span><span class="kv-value">${escapeHtml(
          value
        )}</span></div>`
    )
    .join("");

  return rows ? `<div class="kv-grid">${rows}</div>` : "";
}

function renderScoreCards(scores) {
  const scoreEntries = [
    ["Composition", scores.composition],
    ["Lighting", scores.lighting],
    ["Creativity", scores.creativity],
    ["Technique", scores.technique],
    ["Subject Impact", scores.subjectImpact],
  ].filter(([, value]) => Number.isFinite(value));

  if (!scoreEntries.length) return "";

  return `
    <section class="section">
      <h2>Scores</h2>
      <div class="score-grid">
        ${scoreEntries
          .map(
            ([label, value]) => `
              <div class="score-card">
                <span class="score-label">${escapeHtml(label)}</span>
                <strong class="score-value">${escapeHtml(Number(value).toFixed(Number.isInteger(value) ? 0 : 1))}/10</strong>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderCritique(critique) {
  const sections = [
    ["Composition", critique.composition],
    ["Lighting", critique.lighting],
    ["Technique", critique.technique],
    ["Overall", critique.overall || critique.summary || critique.verdict],
  ].filter(([, value]) => toTrimmedString(value));

  if (!sections.length) return "";

  return `
    <section class="section">
      <h2>Critique</h2>
      <div class="stack">
        ${sections
          .map(
            ([label, value]) => `
              <article class="note-card">
                <h3>${escapeHtml(label)}</h3>
                <p>${escapeHtml(value)}</p>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderBoundingBoxes(items) {
  if (!items.length) return "";

  return `
    <section class="section">
      <h2>Annotated Issues</h2>
      <div class="stack">
        ${items
          .map((item, index) => {
            const entry = toPlainObject(item) || {};
            const title = `${entry.type || "issue"} / ${entry.severity || "unknown"}`;
            const location = [entry.x, entry.y, entry.width, entry.height]
              .map((value) => (Number.isFinite(value) ? Number(value).toFixed(1) : "-"))
              .join(", ");
            return `
              <article class="note-card">
                <h3>#${index + 1} ${escapeHtml(title)}</h3>
                <p>${escapeHtml(entry.description || "")}</p>
                ${entry.suggestion ? `<p><strong>Suggestion:</strong> ${escapeHtml(entry.suggestion)}</p>` : ""}
                <p class="muted">Box (%): ${escapeHtml(location)}</p>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderThinking(thinking) {
  const source = toPlainObject(thinking) || {};
  const observations = toNonEmptyArray(source.observations);
  const reasoningSteps = toNonEmptyArray(source.reasoningSteps);
  const priorityFixes = toNonEmptyArray(source.priorityFixes);

  if (!observations.length && !reasoningSteps.length && !priorityFixes.length) {
    return "";
  }

  return `
    <section class="section">
      <h2>Thinking Trace</h2>
      <div class="three-up">
        ${
          observations.length
            ? `<article class="note-card"><h3>Observations</h3>${renderList(observations)}</article>`
            : ""
        }
        ${
          reasoningSteps.length
            ? `<article class="note-card"><h3>Reasoning Steps</h3>${renderList(reasoningSteps)}</article>`
            : ""
        }
        ${
          priorityFixes.length
            ? `<article class="note-card"><h3>Priority Fixes</h3>${renderList(priorityFixes)}</article>`
            : ""
        }
      </div>
    </section>
  `;
}

function renderGenericSection(title, items) {
  if (!items.length) return "";
  return `
    <section class="section">
      <h2>${escapeHtml(title)}</h2>
      <article class="note-card">${renderList(items)}</article>
    </section>
  `;
}

function renderReportHtml(report) {
  const payload = toPlainObject(report) || {};
  const analysis = toPlainObject(payload.analysis) || {};
  const scores = toPlainObject(analysis.scores) || {};
  const critique = toPlainObject(analysis.critique) || {};
  const strengths = toNonEmptyArray(analysis.strengths);
  const improvements = toNonEmptyArray(analysis.improvements);
  const learningPath = toNonEmptyArray(analysis.learningPath || analysis.nextSteps);
  const boundingBoxes = toNonEmptyArray(analysis.boundingBoxes);
  const settingsEstimate = toPlainObject(analysis.settingsEstimate) || {};
  const source = toPlainObject(payload.source) || {};
  const metadata = toPlainObject(payload.metadata) || {};
  const summary =
    toTrimmedString(critique.overall) ||
    toTrimmedString(analysis.summary) ||
    toTrimmedString(analysis.verdict) ||
    "Structured report generated from Hermes analysis payload.";
  const previewUrl = toTrimmedString(payload.previewUrl);
  const rawJson = escapeHtml(JSON.stringify(analysis, null, 2));

  return `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,nofollow" />
    <title>${escapeHtml(payload.title || "Hermes Photo Report")}</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #0b1020;
        --panel: rgba(15, 23, 42, 0.78);
        --panel-border: rgba(148, 163, 184, 0.18);
        --text: #e5eefc;
        --muted: #9fb0cf;
        --accent: #5eead4;
        --accent-strong: #38bdf8;
        --chip: rgba(56, 189, 248, 0.12);
        --shadow: 0 22px 80px rgba(2, 6, 23, 0.38);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top, rgba(56, 189, 248, 0.14), transparent 28%),
          linear-gradient(180deg, #08101f 0%, #0b1020 48%, #09111d 100%);
        color: var(--text);
      }
      .page {
        max-width: 1180px;
        margin: 0 auto;
        padding: 32px 20px 64px;
      }
      .hero,
      .section,
      .side-card,
      .note-card,
      .json-card {
        background: var(--panel);
        border: 1px solid var(--panel-border);
        box-shadow: var(--shadow);
        backdrop-filter: blur(16px);
      }
      .hero {
        border-radius: 28px;
        padding: 28px;
        display: grid;
        gap: 22px;
      }
      .hero-header {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        flex-wrap: wrap;
      }
      .eyebrow {
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.18em;
        font-size: 12px;
        font-weight: 700;
      }
      h1 {
        margin: 8px 0 10px;
        font-size: clamp(28px, 4vw, 46px);
        line-height: 1.05;
      }
      .summary {
        margin: 0;
        max-width: 760px;
        color: var(--muted);
        font-size: 16px;
        line-height: 1.65;
      }
      .chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .chip {
        padding: 9px 12px;
        border-radius: 999px;
        background: var(--chip);
        border: 1px solid rgba(94, 234, 212, 0.16);
        font-size: 13px;
        color: #d9fbff;
      }
      .preview {
        width: 100%;
        max-height: 420px;
        object-fit: contain;
        border-radius: 20px;
        background: rgba(2, 6, 23, 0.8);
        border: 1px solid rgba(148, 163, 184, 0.12);
      }
      .layout {
        display: grid;
        grid-template-columns: minmax(0, 2.1fr) minmax(280px, 0.9fr);
        gap: 20px;
        margin-top: 20px;
      }
      .main {
        display: grid;
        gap: 20px;
      }
      .side {
        display: grid;
        gap: 20px;
        align-content: start;
      }
      .section,
      .side-card,
      .json-card {
        border-radius: 24px;
        padding: 22px;
      }
      .section h2,
      .side-card h2,
      .json-card h2 {
        margin: 0 0 16px;
        font-size: 18px;
      }
      .score-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 14px;
      }
      .score-card {
        padding: 18px;
        border-radius: 18px;
        background: rgba(8, 15, 32, 0.72);
        border: 1px solid rgba(94, 234, 212, 0.14);
      }
      .score-label {
        display: block;
        color: var(--muted);
        font-size: 13px;
        margin-bottom: 10px;
      }
      .score-value {
        font-size: 26px;
        color: #ffffff;
      }
      .stack {
        display: grid;
        gap: 14px;
      }
      .three-up {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 14px;
      }
      .note-card {
        border-radius: 18px;
        padding: 18px;
        background: rgba(7, 12, 24, 0.86);
      }
      .note-card h3 {
        margin: 0 0 10px;
        font-size: 15px;
      }
      .note-card p,
      .note-card li {
        color: var(--muted);
        line-height: 1.65;
      }
      .note-card ul {
        margin: 0;
        padding-left: 18px;
      }
      .kv-grid {
        display: grid;
        gap: 12px;
      }
      .kv-row {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 0;
        border-bottom: 1px solid rgba(148, 163, 184, 0.12);
      }
      .kv-row:last-child {
        border-bottom: 0;
        padding-bottom: 0;
      }
      .kv-label {
        color: var(--muted);
      }
      .kv-value {
        text-align: right;
      }
      .muted {
        color: var(--muted);
      }
      details {
        cursor: pointer;
      }
      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
        color: #d6e4ff;
        font-size: 13px;
        line-height: 1.65;
      }
      .footer {
        margin-top: 18px;
        color: var(--muted);
        font-size: 12px;
        text-align: center;
      }
      a {
        color: var(--accent-strong);
      }
      @media (max-width: 920px) {
        .layout {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <div class="hero-header">
          <div>
            <div class="eyebrow">Hermes Delivery</div>
            <h1>${escapeHtml(payload.title || "Hermes Photo Report")}</h1>
            <p class="summary">${escapeHtml(summary)}</p>
          </div>
          <div class="chip-row">
            <span class="chip">Report ID: ${escapeHtml(payload.reportId || "")}</span>
            <span class="chip">Created: ${escapeHtml(formatTimestamp(payload.createdAt))}</span>
            <span class="chip">Agent: ${escapeHtml(source.agent || "Hermes")}</span>
          </div>
        </div>
        ${previewUrl ? `<img class="preview" src="${escapeHtml(previewUrl)}" alt="Submitted preview" />` : ""}
      </section>

      <div class="layout">
        <section class="main">
          ${renderScoreCards(scores)}
          ${renderCritique(critique)}
          ${renderGenericSection("Strengths", strengths)}
          ${renderGenericSection("Improvements", improvements)}
          ${renderGenericSection("Learning Path", learningPath)}
          ${renderBoundingBoxes(boundingBoxes)}
          ${renderThinking(analysis.thinking)}
          <section class="json-card">
            <h2>Raw JSON</h2>
            <details>
              <summary class="muted">Expand source payload</summary>
              <pre>${rawJson}</pre>
            </details>
          </section>
        </section>

        <aside class="side">
          <section class="side-card">
            <h2>Source</h2>
            ${renderKeyValueGrid([
              ["Channel", source.channel],
              ["Sender", source.sender],
              ["File", source.fileName],
              ["Thread", source.threadId],
              ["Prompt", source.promptName],
              ["Prompt Version", source.promptVersion],
              ["Workflow", source.workflow],
            ]) || `<p class="muted">No source metadata attached.</p>`}
          </section>
          <section class="side-card">
            <h2>Settings Estimate</h2>
            ${renderKeyValueGrid([
              ["Focal Length", settingsEstimate.focalLength],
              ["Aperture", settingsEstimate.aperture],
              ["Shutter", settingsEstimate.shutterSpeed],
              ["ISO", settingsEstimate.iso],
            ]) || `<p class="muted">No camera estimate attached.</p>`}
          </section>
          <section class="side-card">
            <h2>Metadata</h2>
            ${renderKeyValueGrid(Object.entries(metadata)) || `<p class="muted">No extra metadata attached.</p>`}
          </section>
        </aside>
      </div>

      <p class="footer">Generated by Hermes and served by Photography Coach AI backend.</p>
    </main>
  </body>
</html>`;
}

function renderErrorHtml(message) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hermes report error</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        background: #08101f;
        color: #e2e8f0;
      }
      article {
        max-width: 560px;
        padding: 28px;
        border-radius: 24px;
        background: rgba(15, 23, 42, 0.88);
        border: 1px solid rgba(148, 163, 184, 0.16);
      }
      p { color: #94a3b8; line-height: 1.65; }
    </style>
  </head>
  <body>
    <article>
      <h1>Hermes report unavailable</h1>
      <p>${escapeHtml(message)}</p>
    </article>
  </body>
</html>`;
}

module.exports = {
  buildHermesAppUrl,
  decodeReportPayload,
  encodeReportPayload,
  escapeHtml,
  HermesValidationError,
  isAuthorizedRequest,
  normalizeReportPayload,
  renderErrorHtml,
  renderReportHtml,
  resolvePublicBaseUrl,
};
