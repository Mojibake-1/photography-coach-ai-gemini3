export type MuxingApiConfig = {
  nodeId?: string;
  nodeName?: string;
  baseUrl: string;
  apiKey: string;
  model: string;
};

type MuxingApiConfigMessage = {
  source?: string;
  type?: string;
  tool?: string | null;
  configured?: boolean;
  config?: Partial<MuxingApiConfig> | null;
};

type ThemeMessage = {
  source?: string;
  type?: string;
  theme?: string;
};

type RouteApiStatus = 'checking' | 'healthy' | 'unhealthy';

const REQUEST_LIMIT_PATTERNS = [
  /max_tokens/i,
  /model output limit/i,
  /context length/i,
  /too many tokens/i,
  /could not finish the message because max_tokens or model output limit was reached/i,
];

const getSearchParams = () =>
  typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search);

const normalizeBaseUrl = (value: unknown) => String(value || '').trim().replace(/\/+$/, '');

const normalizeConfig = (raw: unknown): MuxingApiConfig | null => {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const baseUrl = normalizeBaseUrl(source.baseUrl || source.url);
  const apiKey = String(source.apiKey || source.key || '').trim();
  const model = String(source.model || source.primaryModel || '').trim();

  if (!baseUrl || !apiKey || !model) {
    return null;
  }

  return {
    nodeId: String(source.nodeId || '').trim() || undefined,
    nodeName: String(source.nodeName || source.name || '').trim() || undefined,
    baseUrl,
    apiKey,
    model,
  };
};

const getMuxingHost = () => String(getSearchParams().get('muxing-host') || '').trim();

const getMuxingTool = () => String(getSearchParams().get('muxing-tool') || 'photography-coach-ai').trim();

const storageKeyForTool = (tool: string) => `muxing-photo-coach-config:v1:${tool}`;

const TRUSTED_ORIGINS = [
  'https://muxing.001027.xyz',
  'https://001027.xyz',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

const isTrustedOrigin = (origin: string) => {
  if (TRUSTED_ORIGINS.includes(origin)) return true;

  const muxingHost = getMuxingHost();
  if (!muxingHost) return false;

  try {
    return new URL(muxingHost).origin === origin;
  } catch {
    return false;
  }
};

const saveConfigToSession = (config: MuxingApiConfig | null) => {
  if (typeof window === 'undefined') return;
  const tool = getMuxingTool();

  try {
    if (!config) {
      window.sessionStorage.removeItem(storageKeyForTool(tool));
      return;
    }

    window.sessionStorage.setItem(storageKeyForTool(tool), JSON.stringify(config));
  } catch {
    // Ignore storage failures; runtime state still works without cache.
  }
};

export const getStoredMuxingApiConfig = (): MuxingApiConfig | null => {
  if (typeof window === 'undefined') return null;
  const tool = getMuxingTool();

  try {
    const raw = window.sessionStorage.getItem(storageKeyForTool(tool));
    if (!raw) return null;
    return normalizeConfig(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const buildRuntimeConfigPayload = (config: MuxingApiConfig | null) => {
  if (!config) return null;
  return {
    nodeId: config.nodeId || '',
    nodeName: config.nodeName || '',
    baseUrl: config.baseUrl,
    apiKey: config.apiKey,
    model: config.model,
  };
};

export const normalizeRouteSource = (source?: string | null): 'bridge' | 'fallback' => {
  return source === 'bridge' || source === 'request' ? 'bridge' : 'fallback';
};

export const isRouteRequestLimitIssue = (message: unknown) => {
  const text = String(message || '').trim();
  return REQUEST_LIMIT_PATTERNS.some((pattern) => pattern.test(text));
};

export const requestMuxingContext = () => {
  if (typeof window === 'undefined' || window.parent === window) return;
  const params = getSearchParams();
  if (params.get('muxing-protocol') !== '1') return;

  const tool = getMuxingTool();
  window.parent.postMessage(
    { source: 'muxing-tool', type: 'muxing:request-theme', tool },
    '*'
  );
  window.parent.postMessage(
    { source: 'muxing-tool', type: 'muxing:request-api-config', tool },
    '*'
  );
};

export const subscribeToMuxingContext = (
  onConfig: (config: MuxingApiConfig | null, meta: { configured: boolean }) => void,
  onTheme?: (theme: string) => void
) => {
  if (typeof window === 'undefined') return () => {};
  const tool = getMuxingTool();

  const handleMessage = (event: MessageEvent<MuxingApiConfigMessage | ThemeMessage>) => {
    if (!isTrustedOrigin(event.origin)) return;

    const data = event.data;
    if (!data || typeof data !== 'object' || data.source !== 'muxing-workbench') return;

    if (data.type === 'muxing:set-theme' && typeof (data as ThemeMessage).theme === 'string') {
      onTheme?.((data as ThemeMessage).theme as string);
      return;
    }

    if (data.type !== 'muxing:set-api-config') return;

    const payload = data as MuxingApiConfigMessage;
    if (payload.tool && payload.tool !== tool) return;

    const nextConfig = payload.configured === false ? null : normalizeConfig(payload.config);
    saveConfigToSession(nextConfig);
    onConfig(nextConfig, { configured: Boolean(nextConfig) });
  };

  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
};

export const reportMuxingRouteStatus = (payload: {
  configured: boolean;
  nodeName?: string;
  model?: string;
  source?: string | null;
  apiStatus?: RouteApiStatus;
}) => {
  if (typeof window === 'undefined' || window.parent === window) return;
  const params = getSearchParams();
  if (params.get('muxing-protocol') !== '1') return;

  window.parent.postMessage(
    {
      source: 'muxing-tool',
      type: 'muxing:route-status',
      tool: getMuxingTool(),
      payload: {
        configured: payload.configured,
        nodeName: payload.nodeName || '',
        model: payload.model || '',
        source: normalizeRouteSource(payload.source),
        apiStatus: payload.apiStatus || (payload.configured ? 'checking' : 'unhealthy'),
      },
    },
    '*'
  );
};

export const readRouteStatusMeta = (response: Pick<Response, 'headers'>) => {
  const nodeName = String(response.headers.get('X-Active-Node') || '').trim();
  const model = String(response.headers.get('X-Active-Model') || '').trim();
  const source = String(response.headers.get('X-Config-Source') || '').trim();
  const apiStatus = String(response.headers.get('X-Api-Status') || '').trim();

  return {
    nodeName,
    model,
    source,
    apiStatus,
    configured: Boolean(nodeName || model),
  };
};
