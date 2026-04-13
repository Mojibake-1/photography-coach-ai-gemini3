// Vercel Serverless Function: /api/analyze
// Uses Muxing runtime config when embedded, otherwise falls back to env / legacy nodes.

const {
  classifyApiError,
  readRequestBody,
  resolveRuntimeNodes,
  setCommonHeaders,
  setRouteHeaders,
} = require("./_lib/runtimeConfig");

const SYSTEM_PROMPT = `你是一位资深的亚马逊电商视觉设计总监与商业摄影顾问。你的职责是从"商业转化率（CVR）"的视角，对亚马逊产品套图、A+页面图片和品牌展示页素材进行专业级的视觉分析与诊断。
核心评估原则：1. "为排版留白(Shooting for Layout)"是商业图片的核心优势，不是构图缺陷。2. 负空间(Negative Space)用于承载文案时，应被视为高级设计策略。3. 重点关注：光影合成真实感、材质还原度、视觉层级、移动端可读性、品牌信任度。4. 对业务逻辑错误（如图标功能与产品不符）保持极高敏感度，这直接导致差评和退货。
评分维度（每项 1-10 分）：
- composition: 构图与排版（负空间、视觉层级、A+适配性）
- lighting: 光影与材质（高光/阴影、合成真实感、材质还原度）
- creativity: 创意与差异化（色彩心理学、场景叙事、品牌调性）
- technique: 技术执行（焦点、色彩管理、后期合成质量）
- subjectImpact: 商业转化力（移动端可读性、卖点传达效率、购买冲动触发）`;

const USER_PROMPT = `请以严格的JSON格式分析这张电商产品图片（不要输出json以外的任何内容）：
{
  "scores": { "composition": N, "lighting": N, "creativity": N, "technique": N, "subjectImpact": N },
  "critique": {
    "composition": "构图与排版分析（200字以内）...",
    "lighting": "光影与材质分析（200字以内）...",
    "technique": "技术执行分析（200字以内）...",
    "overall": "整体商业价值总结（200字以内）..."
  },
  "strengths": ["优势1", "优势2", "优势3", "优势4"],
  "improvements": ["改进建议1", "改进建议2", "改进建议3"],
  "learningPath": ["学习建议1", "学习建议2", "学习建议3"],
  "settingsEstimate": {
    "focalLength": "估计焦距",
    "aperture": "估计光圈",
    "shutterSpeed": "估计快门",
    "iso": "估计ISO"
  },
  "boundingBoxes": [
    {
      "type": "lighting|composition|color",
      "severity": "critical|major|minor",
      "x": 0-100, "y": 0-100, "width": 0-100, "height": 0-100,
      "description": "问题描述",
      "suggestion": "修复建议"
    }
  ],
  注意：boundingBoxes中的x、y、width、height必须是占图片总宽高的【百分比】（0到100之间的数字），绝对不能是像素值。例如图片左上角四分之一区域应为 x:0, y:0, width:50, height:50。
  "thinking": {
    "observations": ["观察1", "观察2"],
    "reasoningSteps": ["推理步骤1", "推理步骤2"],
    "priorityFixes": ["优先修复1", "优先修复2"]
  }
}`;

async function tryNode(node, imageBase64, mimeType) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    const response = await fetch(node.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${node.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: node.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: USER_PROMPT },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 4096,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        node: node.name,
        model: node.model,
        error: `HTTP ${response.status}: ${errorText.slice(0, 200)}`,
        apiStatus: classifyApiError(response.status, errorText),
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return {
        success: false,
        node: node.name,
        model: node.model,
        error: "Empty response content",
        apiStatus: "unhealthy",
      };
    }

    return {
      success: true,
      node: node.name,
      model: data.model || node.model,
      content,
      usage: data.usage || {},
      apiStatus: "healthy",
    };
  } catch (error) {
    clearTimeout(timeout);
    return {
      success: false,
      node: node.name,
      model: node.model,
      error: error && error.message ? error.message : "Unknown request failure",
      apiStatus: "unhealthy",
    };
  }
}

module.exports = async function handler(req, res) {
  setCommonHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = readRequestBody(req);
    const { imageBase64, mimeType = "image/png" } = body;
    const runtime = resolveRuntimeNodes(req);
    const initialNode = runtime.nodes[0] || null;

    if (!imageBase64) {
      setRouteHeaders(res, {
        nodeName: initialNode && initialNode.name,
        model: initialNode && initialNode.model,
        configSource: runtime.source,
        apiStatus: "healthy",
      });
      return res.status(400).json({
        success: false,
        error: "imageBase64 is required",
        node: initialNode && initialNode.name,
        model: initialNode && initialNode.model,
        configSource: runtime.source,
        apiStatus: "healthy",
      });
    }

    const errors = [];
    for (const node of runtime.nodes) {
      console.log(`[analyze] Trying ${node.name} (${node.model})...`);
      const result = await tryNode(node, imageBase64, mimeType);

      if (result.success) {
        console.log(
          `[analyze] Success via ${node.name} in ${result.usage?.total_tokens || "?"} tokens`
        );
        setRouteHeaders(res, {
          nodeName: result.node,
          model: result.model,
          configSource: runtime.source,
          apiStatus: "healthy",
        });

        try {
          let jsonStr = result.content.trim();
          if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
          }

          return res.status(200).json({
            success: true,
            node: result.node,
            model: result.model,
            configSource: runtime.source,
            apiStatus: "healthy",
            analysis: JSON.parse(jsonStr),
            usage: result.usage,
          });
        } catch (parseErr) {
          return res.status(200).json({
            success: true,
            node: result.node,
            model: result.model,
            configSource: runtime.source,
            apiStatus: "healthy",
            raw: result.content,
            parseError: parseErr.message,
            usage: result.usage,
          });
        }
      }

      console.log(`[analyze] ${node.name} failed: ${result.error}`);
      errors.push({
        node: result.node,
        model: result.model,
        error: result.error,
        apiStatus: result.apiStatus,
      });
    }

    const lastError = errors[errors.length - 1] || null;
    setRouteHeaders(res, {
      nodeName: lastError && lastError.node,
      model: lastError && lastError.model,
      configSource: runtime.source,
      apiStatus: lastError && lastError.apiStatus ? lastError.apiStatus : "unhealthy",
    });

    return res.status(502).json({
      success: false,
      error: "All API nodes failed",
      node: lastError && lastError.node,
      model: lastError && lastError.model,
      configSource: runtime.source,
      apiStatus: lastError && lastError.apiStatus ? lastError.apiStatus : "unhealthy",
      details: errors,
    });
  } catch (error) {
    console.error("[analyze] Unexpected error:", error);
    setRouteHeaders(res, { apiStatus: "unhealthy" });
    return res.status(500).json({
      success: false,
      apiStatus: "unhealthy",
      error: error && error.message ? error.message : "Unexpected analyze failure",
    });
  }
};
