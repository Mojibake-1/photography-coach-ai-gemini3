// Photography Coach AI - Gemini Service
// Supports both Google GenAI SDK and OpenAI-compatible proxy APIs
import { GoogleGenAI, Type } from '@google/genai';
import { PhotoAnalysis, BoundingBox, TokenUsage, MentorMessage, ThinkingProcess } from '../types';

// Config
const API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
const BASE_URL = process.env.GEMINI_BASE_URL || '';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash';

// Use OpenAI-compatible mode when a custom base URL is set
const USE_PROXY = !!BASE_URL;

// Core photography principles
const PHOTOGRAPHY_PRINCIPLES = `
You are a Top-Tier Amazon E-Commerce Visual Design Director and Commercial Photographer. Your primary goal is to evaluate Amazon Main Images, Gallery Images, and A+ Content Banners strictly for commercial conversion (CVR) and business impact. Please respond in Chinese (Simplified Chinese / 简体中文). 

CRITICAL MINDSET SHIFT: Do NOT judge these images as standalone artistic photography. Evaluate them as commercial sales assets.

COMMERCIAL COMPOSITION & LAYOUT:
- Negative Space for Copy (Shooting for Layout): Deliberately leaving clean, empty space (negative space) is a CRITICAL REQUIREMENT for text, graphics, and UI overlays. DO NOT penalize an image for "sacrificing subject integrity" if it is clearly leaving space for typography (e.g., A+ banners). This is a massive strength, not a flaw.
- Visual Hierarchy & Readability: The product and its core selling point must stand out clearly, even as a tiny mobile thumbnail. 
- UI/UX Integration: The composition must accommodate e-commerce UI elements without feeling cluttered.

COMMERCIAL LIGHTING & TEXTURE:
- Material Definition: Lighting must perfectly explain what the product feels like (matte, glossy, metallic, soft).
- High-Key & Clean Backgrounds: Main images require pure white (RGB 255,255,255). Lifestyle shots should have clean, non-distracting lighting that flatters the product.
- Contrast & Volume: Using rim lights and softboxes to create three-dimensional depth, making the product "pop" off the screen.

TECHNICAL & POST-PRODUCTION:
- Crisp Focus & Edge Clarity: Essential for zooming in on Amazon.
- Compositing & Retouching: Fake or poorly lit shadows, bad 2D cutouts, and perspective errors are critical flaws.
- Color Accuracy & Brand Trust: Colors must be accurate to prevent customer returns while matching the brand's premium tone.

CREATIVE & CONVERSION IMPACT:
- Storytelling & Pain Points: The image should instantly communicate the solution to a customer's problem or evoke a lifestyle aspiration.
- Subject Impact: Immediate focal point that arrests the scroller's attention in crowded search results.
- Emotional Resonance: Eliciting trust, premium quality, or immediate desire.
`;

// Helper to clean base64 string
const cleanBase64 = (dataUrl: string) => {
  if (dataUrl.includes('base64,')) {
    return dataUrl.split('base64,')[1];
  }
  return dataUrl;
};

// Helper to get mime type from data URL
const getMimeFromDataUrl = (dataUrl: string) => {
  if (dataUrl.includes(';base64,')) {
    return dataUrl.split(';base64,')[0].split(':')[1] || 'image/jpeg';
  }
  return 'image/jpeg';
};

// ========================================
// OpenAI-compatible proxy API client
// ========================================
async function callProxyAPI(messages: any[], model?: string): Promise<string> {
  const url = `${BASE_URL.replace(/\/$/, '')}/v1/chat/completions`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: model || MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API Error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ========================================
// Google GenAI SDK client (direct Google API)
// ========================================
const getGenAIClient = (): GoogleGenAI => {
  return new GoogleGenAI({ apiKey: API_KEY });
};

// ========================================
// Retry logic
// ========================================
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 500 || error.status === 503 || error.message?.includes('500'))) {
      console.warn(`API Error. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// ========================================
// JSON Schema for analysis (used in prompts for proxy mode)
// ========================================
const ANALYSIS_SCHEMA_PROMPT = `
You MUST respond with valid JSON only, no markdown, no code fences. Use the following JSON structure exactly:
{
  "scores": {
    "composition": <number 1-10>,
    "lighting": <number 1-10>,
    "creativity": <number 1-10>,
    "technique": <number 1-10>,
    "subjectImpact": <number 1-10>
  },
  "critique": {
    "composition": "<string>",
    "lighting": "<string>",
    "technique": "<string>",
    "overall": "<string>"
  },
  "strengths": ["<string>", ...],
  "improvements": ["<string>", ...],
  "learningPath": ["<string>", "<string>", "<string>"],
  "settingsEstimate": {
    "focalLength": "<string>",
    "aperture": "<string>",
    "shutterSpeed": "<string>",
    "iso": "<string>"
  },
  "boundingBoxes": [
    {
      "type": "<composition|lighting|focus|exposure|color>",
      "severity": "<critical|moderate|minor>",
      "x": <number 0-100 percentage>,
      "y": <number 0-100 percentage>,
      "width": <number 0-100 percentage>,
      "height": <number 0-100 percentage>,
      "description": "<description of the FLAW>",
      "suggestion": "<how to FIX this>"
    }
  ],
  "thinking": {
    "observations": ["<string>", ...],
    "reasoningSteps": ["<string>", ...],
    "priorityFixes": ["<string>", ...]
  }
}
`;

export const getAnalysisPromptTemplate = () => `Analyze this photograph based on the following principles:\n${PHOTOGRAPHY_PRINCIPLES}\n\nProvide a detailed analysis in JSON format.
  
IMPORTANT INSTRUCTIONS FOR BOUNDING BOXES:
1. Bounding boxes must ONLY identify specific flaws, errors, or distractions.
2. Do NOT create bounding boxes for positive elements or strengths.
3. 'severity' indicates the negative impact of the flaw: critical, moderate, or minor.
4. Provide coordinates as percentages (0-100) of the image dimensions.

THINKING PROCESS:
Document your analysis methodology with:
- 3-6 key observations you noticed first
- 3-5 reasoning steps explaining your evaluation approach
- 3-5 priority fixes ranked by impact

${ANALYSIS_SCHEMA_PROMPT}`;

// ========================================
// Main: Analyze Image
// ========================================
export const analyzeImage = async (base64Image: string, mimeType: string): Promise<PhotoAnalysis> => {
  const cleanedImage = cleanBase64(base64Image);
  const fullDataUrl = base64Image.includes('data:') ? base64Image : `data:${mimeType};base64,${cleanedImage}`;
  
  const analysisPrompt = getAnalysisPromptTemplate();

  let resultText: string;

  if (USE_PROXY) {
    // OpenAI-compatible proxy mode
    resultText = await withRetry(() => callProxyAPI([
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: fullDataUrl } },
          { type: 'text', text: analysisPrompt },
        ],
      },
    ]));
  } else {
    // Direct Google GenAI SDK mode
    const ai = getGenAIClient();
    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model: MODEL,
        contents: {
          role: 'user',
          parts: [
            { inlineData: { data: cleanedImage, mimeType } },
            { text: analysisPrompt },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              scores: {
                type: Type.OBJECT,
                properties: {
                  composition: { type: Type.NUMBER },
                  lighting: { type: Type.NUMBER },
                  creativity: { type: Type.NUMBER },
                  technique: { type: Type.NUMBER },
                  subjectImpact: { type: Type.NUMBER },
                },
                required: ['composition', 'lighting', 'creativity', 'technique', 'subjectImpact'],
              },
              critique: {
                type: Type.OBJECT,
                properties: {
                  composition: { type: Type.STRING },
                  lighting: { type: Type.STRING },
                  technique: { type: Type.STRING },
                  overall: { type: Type.STRING },
                },
                required: ['composition', 'lighting', 'technique', 'overall'],
              },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
              learningPath: { type: Type.ARRAY, items: { type: Type.STRING } },
              settingsEstimate: {
                type: Type.OBJECT,
                properties: {
                  focalLength: { type: Type.STRING },
                  aperture: { type: Type.STRING },
                  shutterSpeed: { type: Type.STRING },
                  iso: { type: Type.STRING },
                },
                required: ['focalLength', 'aperture', 'shutterSpeed', 'iso'],
              },
              boundingBoxes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ['composition', 'lighting', 'focus', 'exposure', 'color'] },
                    severity: { type: Type.STRING, enum: ['critical', 'moderate', 'minor'] },
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER },
                    width: { type: Type.NUMBER },
                    height: { type: Type.NUMBER },
                    description: { type: Type.STRING },
                    suggestion: { type: Type.STRING },
                  },
                  required: ['type', 'severity', 'x', 'y', 'width', 'height', 'description', 'suggestion'],
                },
              },
              thinking: {
                type: Type.OBJECT,
                properties: {
                  observations: { type: Type.ARRAY, items: { type: Type.STRING } },
                  reasoningSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
                  priorityFixes: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['observations', 'reasoningSteps', 'priorityFixes'],
              },
            },
            required: ['scores', 'critique', 'strengths', 'improvements', 'learningPath', 'settingsEstimate', 'thinking'],
          },
        },
      });
    });
    
    if (!response.text) throw new Error('No response from Gemini');
    resultText = response.text;
  }

  // Parse JSON - handle potential markdown code fences
  let jsonStr = resultText.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }
  
  const result = JSON.parse(jsonStr) as PhotoAnalysis;
  return result;
};

// ========================================
// Generate Corrected Image
// ========================================
export const generateCorrectedImage = async (base64Image: string, mimeType: string, improvements: string[]): Promise<string> => {
  if (USE_PROXY) {
    throw new Error('当前 API 不支持图像生成功能。');
  }
  
  const ai = getGenAIClient();
  const cleanedImage = cleanBase64(base64Image);
  const improvementsText = improvements.join(', ');

  const response = await withRetry(async () => {
    return await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        role: 'user',
        parts: [
          { inlineData: { data: cleanedImage, mimeType } },
          { text: `Act as a professional photo retoucher. Improve this image by addressing: ${improvementsText}. Enhance lighting, exposure, and color balance while maintaining the original subject. Return a high-quality photorealistic image.` },
        ],
      },
      config: {
        imageConfig: { imageSize: "1K" },
      },
    });
  });

  return extractImage(response);
};

// ========================================
// Mentor Chat
// ========================================
export const askPhotographyMentor = async (
  base64Image: string,
  mimeType: string,
  userQuestion: string,
  previousAnalysis: PhotoAnalysis,
  conversationHistory?: MentorMessage[]
): Promise<{ answer: string; thinking: ThinkingProcess }> => {
  
  const cleanedImage = cleanBase64(base64Image);
  const fullDataUrl = base64Image.includes('data:') ? base64Image : `data:${mimeType};base64,${cleanedImage}`;
  
  const contextSummary = `
Photography Analysis Context:
- Composition Score: ${previousAnalysis.scores.composition}/10
- Lighting Score: ${previousAnalysis.scores.lighting}/10
- Key Issues: ${previousAnalysis.improvements.slice(0, 3).join(', ')}
- Overall Critique: ${previousAnalysis.critique.overall}
  `;
  
  const historyText = conversationHistory
    ? conversationHistory.map(m => `${m.role === 'user' ? 'User' : 'Mentor'}: ${m.content}`).join('\n')
    : '';
  
  const mentorPrompt = `You are an expert photography mentor. Please respond in Chinese (Simplified Chinese / 简体中文). A photographer has uploaded their image and you've already analyzed it.

${contextSummary}

${historyText ? `Previous conversation:\n${historyText}\n\n` : ''}

The photographer now asks: "${userQuestion}"

As their mentor, respond directly and personally. Reference the image and their specific scores/issues.

You MUST respond with valid JSON only, no markdown fences:
{ "answer": "your detailed response here", "thinking": { "observations": ["..."], "reasoningSteps": ["..."], "priorityFixes": ["..."] } }`;

  let resultText: string;

  if (USE_PROXY) {
    resultText = await withRetry(() => callProxyAPI([
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: fullDataUrl } },
          { type: 'text', text: mentorPrompt },
        ],
      },
    ]));
  } else {
    const ai = getGenAIClient();
    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model: MODEL,
        contents: {
          role: 'user',
          parts: [
            { text: mentorPrompt },
            { inlineData: { data: cleanedImage, mimeType } },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              answer: { type: Type.STRING },
              thinking: {
                type: Type.OBJECT,
                properties: {
                  observations: { type: Type.ARRAY, items: { type: Type.STRING } },
                  reasoningSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
                  priorityFixes: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['observations', 'reasoningSteps', 'priorityFixes'],
              },
            },
            required: ['answer', 'thinking'],
          },
        },
      });
    });
    
    if (!response.text) throw new Error('No response from Mentor');
    resultText = response.text;
  }

  let jsonStr = resultText.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  }
  
  const result = JSON.parse(jsonStr);
  return { answer: result.answer, thinking: result.thinking };
};

// ========================================
// Helper: Extract image from Google GenAI response
// ========================================
const extractImage = async (response: any): Promise<string> => {
  if (response.candidates && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
  }
  throw new Error('No image generated');
};