const {
  classifyApiError,
  fetchRuntimeNode,
  resolveRuntimeNodes,
  setCommonHeaders,
  setRouteHeaders,
} = require("../_lib/runtimeConfig");

async function probeNode(node) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const { response, transport } = await fetchRuntimeNode(node, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${node.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: node.model,
        stream: false,
        temperature: 0,
        max_tokens: 24,
        messages: [{ role: "user", content: "Reply with OK only." }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      const apiStatus = classifyApiError(response.status, errorText);
      return {
        success: apiStatus === "healthy",
        apiStatus,
        nodeName: node.name,
        model: node.model,
        error: errorText,
        transport,
      };
    }

    let returnedModel = node.model;
    try {
      const payload = await response.json();
      if (payload && payload.model) {
        returnedModel = String(payload.model);
      }
    } catch {
      // A successful probe without JSON is still enough to mark the route healthy.
    }

    return {
      success: true,
      apiStatus: "healthy",
      nodeName: node.name,
      model: returnedModel,
      transport,
    };
  } catch (error) {
    clearTimeout(timeout);
    return {
      success: false,
      apiStatus: "unhealthy",
      nodeName: node.name,
      model: node.model,
      error: error && error.message ? error.message : "Probe failed",
      transport: "direct",
    };
  }
}

module.exports = async function handler(req, res) {
  setCommonHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const runtime = resolveRuntimeNodes(req);
  if (!runtime.nodes.length) {
    setRouteHeaders(res, { configSource: runtime.source, apiStatus: "unhealthy" });
    return res.status(503).json({
      success: false,
      configured: false,
      configSource: runtime.source,
      apiStatus: "unhealthy",
      error: "No API nodes available",
    });
  }

  const attempts = [];
  for (const node of runtime.nodes) {
    const result = await probeNode(node);
    attempts.push(result);

    if (result.success) {
      setRouteHeaders(res, {
        nodeName: result.nodeName,
        model: result.model,
        configSource: runtime.source,
        apiStatus: "healthy",
      });
      return res.status(200).json({
        success: true,
        configured: true,
        node: result.nodeName,
        model: result.model,
        transport: result.transport,
        configSource: runtime.source,
        apiStatus: "healthy",
        probe: result.error ? "request-limited" : "ok",
        message: result.error || "Route reachable",
      });
    }
  }

  const lastAttempt = attempts[attempts.length - 1];
  setRouteHeaders(res, {
    nodeName: lastAttempt && lastAttempt.nodeName,
    model: lastAttempt && lastAttempt.model,
    configSource: runtime.source,
    apiStatus: lastAttempt && lastAttempt.apiStatus ? lastAttempt.apiStatus : "unhealthy",
  });

  return res.status(400).json({
    success: false,
    configured: true,
    node: lastAttempt && lastAttempt.nodeName,
    model: lastAttempt && lastAttempt.model,
    transport: lastAttempt && lastAttempt.transport,
    configSource: runtime.source,
    apiStatus: lastAttempt && lastAttempt.apiStatus ? lastAttempt.apiStatus : "unhealthy",
    error: lastAttempt && lastAttempt.error ? lastAttempt.error : "All API nodes failed",
    details: attempts,
  });
};
