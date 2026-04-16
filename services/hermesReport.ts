import { PhotoAnalysis, BoundingBox } from '../types';

type RawHermesReport = {
  reportId?: unknown;
  title?: unknown;
  createdAt?: unknown;
  previewUrl?: unknown;
  analysis?: unknown;
};

const SCORE_MAX = 10;
const SCORE_MIN = 0;

const PLACEHOLDER_BG = '#0b1020';
const PLACEHOLDER_PANEL = '#121a30';
const PLACEHOLDER_TEXT = '#e5eefc';
const PLACEHOLDER_MUTED = '#9fb0cf';

const toObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const toText = (value: unknown): string => {
  return typeof value === 'string' ? value.trim() : '';
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => toText(item))
    .filter(Boolean);
};

const clampScore = (value: unknown): number => {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(SCORE_MIN, Math.min(SCORE_MAX, score));
};

const normalizeBoundingBoxType = (value: unknown): BoundingBox['type'] => {
  const type = toText(value).toLowerCase();
  if (type === 'lighting' || type === 'focus' || type === 'exposure' || type === 'color') {
    return type;
  }
  return 'composition';
};

const normalizeBoundingBoxSeverity = (value: unknown): BoundingBox['severity'] => {
  const severity = toText(value).toLowerCase();
  if (severity === 'critical' || severity === 'minor') return severity;
  if (severity === 'major' || severity === 'moderate') return 'moderate';
  return 'minor';
};

const normalizePercent = (value: unknown): number => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, num));
};

const normalizeBoundingBoxes = (value: unknown): BoundingBox[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const source = toObject(item);
      if (!source) return null;

      return {
        type: normalizeBoundingBoxType(source.type),
        severity: normalizeBoundingBoxSeverity(source.severity),
        x: normalizePercent(source.x),
        y: normalizePercent(source.y),
        width: normalizePercent(source.width),
        height: normalizePercent(source.height),
        description: toText(source.description) || 'Issue detected in this area.',
        suggestion: toText(source.suggestion) || 'Review this area and refine the execution.',
      } satisfies BoundingBox;
    })
    .filter((item): item is BoundingBox => Boolean(item));
};

const ensureMinimumList = (items: string[], fallback: string[]): string[] => {
  return items.length ? items : fallback;
};

const buildPlaceholderImage = (title: string) => {
  const safeTitle = title.replace(/[<>&'"]/g, '');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
      <rect width="1200" height="900" fill="${PLACEHOLDER_BG}" />
      <rect x="110" y="120" width="980" height="660" rx="36" fill="${PLACEHOLDER_PANEL}" stroke="#24304d" />
      <text x="150" y="260" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="700" fill="${PLACEHOLDER_TEXT}">
        Hermes shared report
      </text>
      <text x="150" y="330" font-family="Inter, Arial, sans-serif" font-size="60" font-weight="800" fill="${PLACEHOLDER_TEXT}">
        ${safeTitle || 'No preview provided'}
      </text>
      <text x="150" y="410" font-family="Inter, Arial, sans-serif" font-size="28" fill="${PLACEHOLDER_MUTED}">
        This report did not include a preview image URL.
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const decodeBase64Url = (value: string): Uint8Array => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  const binary = window.atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
};

const gunzipText = async (bytes: Uint8Array): Promise<string> => {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Current browser does not support gzip report decoding');
  }

  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const buffer = await new Response(stream).arrayBuffer();
  return new TextDecoder().decode(buffer);
};

export const isHermesSharedReportRequest = () => {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.has('hr') || params.has('hermes-report') || params.has('p') || params.has('payload');
};

export const clearHermesSharedReportParams = () => {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  params.delete('hr');
  params.delete('hermes-report');
  params.delete('p');
  params.delete('payload');

  const nextQuery = params.toString();
  const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ''}${window.location.hash || ''}`;
  window.history.replaceState({}, '', nextUrl);
};

export const decodeHermesReportPayload = async (token: string): Promise<RawHermesReport> => {
  const trimmed = token.trim();
  if (!trimmed) {
    throw new Error('Report payload is missing');
  }

  let json = '';

  if (trimmed.startsWith('gz1.')) {
    json = await gunzipText(decodeBase64Url(trimmed.slice(4)));
  } else if (trimmed.startsWith('b64.')) {
    json = new TextDecoder().decode(decodeBase64Url(trimmed.slice(4)));
  } else {
    throw new Error('Unsupported Hermes report format');
  }

  return JSON.parse(json) as RawHermesReport;
};

export const loadHermesReportFromLocation = async (): Promise<{
  reportId: string;
  title: string;
  createdAt: string;
  imageSrc: string;
  analysis: PhotoAnalysis;
}> => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('p') || params.get('payload') || '';
  const report = await decodeHermesReportPayload(token);
  const analysisSource = toObject(report.analysis) || {};
  const scores = toObject(analysisSource.scores) || {};
  const critique = toObject(analysisSource.critique) || {};
  const settingsEstimate = toObject(analysisSource.settingsEstimate) || {};
  const thinking = toObject(analysisSource.thinking) || {};

  const overall = toText(critique.overall || analysisSource.summary || analysisSource.verdict);

  const normalizedAnalysis: PhotoAnalysis = {
    scores: {
      composition: clampScore(scores.composition),
      lighting: clampScore(scores.lighting),
      creativity: clampScore(scores.creativity),
      technique: clampScore(scores.technique),
      subjectImpact: clampScore(scores.subjectImpact),
    },
    critique: {
      composition: toText(critique.composition) || overall || 'No composition notes provided.',
      lighting: toText(critique.lighting) || overall || 'No lighting notes provided.',
      technique: toText(critique.technique) || overall || 'No technique notes provided.',
      overall: overall || 'Hermes delivered a structured report without a summary.',
    },
    strengths: ensureMinimumList(toStringArray(analysisSource.strengths), ['No explicit strengths provided.']),
    improvements: ensureMinimumList(toStringArray(analysisSource.improvements), ['No explicit improvements provided.']),
    learningPath: ensureMinimumList(
      toStringArray(analysisSource.learningPath || analysisSource.nextSteps),
      ['Review the critique and improvements for next actions.']
    ),
    settingsEstimate: {
      focalLength: toText(settingsEstimate.focalLength) || 'N/A',
      aperture: toText(settingsEstimate.aperture) || 'N/A',
      shutterSpeed: toText(settingsEstimate.shutterSpeed) || 'N/A',
      iso: toText(settingsEstimate.iso) || 'N/A',
    },
    boundingBoxes: normalizeBoundingBoxes(analysisSource.boundingBoxes),
    tokenUsage: {
      realCachedTokens: 0,
      realNewTokens: 0,
      totalTokens: 0,
      realCost: 0,
      projectedCachedTokens: 0,
      projectedCostWithCache: 0,
      projectedSavings: 0,
    },
    thinking: {
      observations: toStringArray(thinking.observations),
      reasoningSteps: toStringArray(thinking.reasoningSteps),
      priorityFixes: toStringArray(thinking.priorityFixes),
    },
  };

  const title = toText(report.title) || 'Hermes shared report';
  const imageSrc = toText(report.previewUrl) || buildPlaceholderImage(title);

  return {
    reportId: toText(report.reportId),
    title,
    createdAt: toText(report.createdAt),
    imageSrc,
    analysis: normalizedAnalysis,
  };
};
