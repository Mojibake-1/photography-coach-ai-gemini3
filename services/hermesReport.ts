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
const DEFAULT_TITLE = 'Hermes 共享分析';
const DEFAULT_SUMMARY = 'Hermes 已返回结构化分析，但摘要内容不可用。';
const DEFAULT_STRENGTHS = ['未提供可展示的优点摘要。'];
const DEFAULT_IMPROVEMENTS = ['未提供明确的改进建议。'];
const DEFAULT_LEARNING_PATH = ['请结合上方评语与改进建议继续迭代。'];
const DEFAULT_SETTING_VALUE = '未提供';

const PLACEHOLDER_BG = '#0b1020';
const PLACEHOLDER_PANEL = '#121a30';
const PLACEHOLDER_TEXT = '#e5eefc';
const PLACEHOLDER_MUTED = '#9fb0cf';
const CJK_TEXT_PATTERN = /[\u3400-\u9fff]/;
const LATIN_WORD_PATTERN = /[A-Za-z]{2,}/;

const toObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const cleanPossiblyBrokenText = (input: string): string => {
  const normalized = input.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';

  const stripped = normalized
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\uFFFD+/g, ' ')
    .replace(/\?{4,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!stripped) return '';

  const dense = stripped.replace(/[“”"'‘’.,;:!?，。！？、()[\]{}<>《》【】/\\|\-_\s]/g, '');
  if (!dense) return '';

  const placeholderCount = (stripped.match(/[\?\uFFFD]/g) || []).length;
  const denseLength = dense.length;
  const placeholderRatio = denseLength ? placeholderCount / denseLength : 0;

  if (!CJK_TEXT_PATTERN.test(dense) && !LATIN_WORD_PATTERN.test(dense) && placeholderRatio >= 0.35) {
    return '';
  }

  return stripped;
};

const toText = (value: unknown): string => {
  return typeof value === 'string' ? cleanPossiblyBrokenText(value) : '';
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
        description: toText(source.description) || '该区域存在需要复核的问题。',
        suggestion: toText(source.suggestion) || '建议复核此区域并重新处理。',
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

  const response = await fetch(`/api/hermes/report?format=json&payload=${encodeURIComponent(trimmed)}`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const message = await response.text().catch(() => '');
    throw new Error(message || `Failed to load shared report (${response.status})`);
  }

  return (await response.json()) as RawHermesReport;
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
  const source = toObject((report as RawHermesReport & { source?: unknown }).source) || {};

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
      composition: toText(critique.composition) || overall || '未提供构图评语。',
      lighting: toText(critique.lighting) || overall || '未提供光线评语。',
      technique: toText(critique.technique) || overall || '未提供技术评语。',
      overall: overall || DEFAULT_SUMMARY,
    },
    strengths: ensureMinimumList(toStringArray(analysisSource.strengths), DEFAULT_STRENGTHS),
    improvements: ensureMinimumList(toStringArray(analysisSource.improvements), DEFAULT_IMPROVEMENTS),
    learningPath: ensureMinimumList(
      toStringArray(analysisSource.learningPath || analysisSource.nextSteps),
      DEFAULT_LEARNING_PATH
    ),
    settingsEstimate: {
      focalLength: toText(settingsEstimate.focalLength) || DEFAULT_SETTING_VALUE,
      aperture: toText(settingsEstimate.aperture) || DEFAULT_SETTING_VALUE,
      shutterSpeed: toText(settingsEstimate.shutterSpeed) || DEFAULT_SETTING_VALUE,
      iso: toText(settingsEstimate.iso) || DEFAULT_SETTING_VALUE,
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

  const title = toText(report.title) || toText(source.fileName) || DEFAULT_TITLE;
  const imageSrc = toText(report.previewUrl) || buildPlaceholderImage(title);

  return {
    reportId: toText(report.reportId),
    title,
    createdAt: toText(report.createdAt),
    imageSrc,
    analysis: normalizedAnalysis,
  };
};
