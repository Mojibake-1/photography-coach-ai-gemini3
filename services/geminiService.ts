// Gemini 3 Pro integration for professional photography analysis
import { GoogleGenAI, Type } from '@google/genai';
import { PhotoAnalysis, BoundingBox, TokenUsage, MentorMessage, ThinkingProcess } from '../types';

// Pricing constants for Gemini 3 Pro (Estimated per 1M tokens)
const PRICING = {
  flash: {
    input: 0.075 / 1000000,
    output: 0.30 / 1000000,
    cachedInput: 0.01875 / 1000000 
  },
  // Pricing for Gemini 3 Pro
  pro: {
    input: 3.50 / 1000000,
    output: 10.50 / 1000000,
    cachedInput: 0.875 / 1000000
  }
};

// Core photography principles
const PHOTOGRAPHY_PRINCIPLES = `
You are an expert photography coach. Your goal is to provide constructive criticism to help the photographer improve. Please respond in Chinese (Simplified Chinese / 简体中文). You have deep knowledge of:

COMPOSITION RULES:
- Rule of Thirds: Divide frame into 9 equal parts, place subjects at intersections
- Leading Lines: Use natural lines to guide viewer's eye to subject
- Symmetry & Patterns: Create visual harmony through repetition
- Framing: Use environmental elements to frame the subject
- Negative Space: Empty areas that give subjects room to breathe
- Golden Ratio: 1.618:1 proportions for pleasing compositions

LIGHTING FUNDAMENTALS:
- Golden Hour: Warm, soft light during sunrise/sunset
- Blue Hour: Cool, diffused light before sunrise/after sunset
- Hard Light: Creates strong shadows, high contrast
- Soft Light: Diffused, flattering for portraits
- Backlighting: Subject lit from behind, creates rim light
- Fill Light: Reduces shadows in high-contrast scenes

TECHNICAL GUIDELINES:
- Shutter Speed: Fast (>1/500s) freezes motion, slow creates blur
- Aperture: Wide (f/1.4-f/2.8) for shallow depth, narrow (f/8-f/16) for sharpness
- ISO: Low (100-400) for quality, high (1600+) for low light
- Focus: Sharp on subject's eyes (portraits) or primary point of interest
- White Balance: Match light temperature for accurate colors

CREATIVE ELEMENTS:
- Storytelling: Every photo should convey emotion or narrative
- Subject Impact: Clear focal point that draws immediate attention
- Color Harmony: Complementary or analogous color schemes
- Texture & Detail: Visual interest through surface qualities
`;

// Helper to clean base64 string
const cleanBase64 = (dataUrl: string) => {
  if (dataUrl.includes('base64,')) {
    return dataUrl.split('base64,')[1];
  }
  return dataUrl;
};

// Helper to check for permission/access errors
const isPermissionError = (error: any) => {
  const msg = (error.message || error.toString()).toLowerCase();
  return (
    msg.includes("permission denied") || 
    msg.includes("403") || 
    msg.includes("404") || 
    msg.includes("not found") ||
    msg.includes("billing") ||
    error.status === 403 ||
    error.status === 404
  );
};

// Helper to get the AI Client, preferring shared key if available
const getGenAIClient = async (): Promise<GoogleGenAI> => {
  // 1. Check for shared API key (Competition / Published App Mode)
  if (typeof window !== 'undefined' && (window as any).aistudio?.getSharedApiKey) {
    try {
      const apiKey = await (window as any).aistudio.getSharedApiKey();
      if (apiKey) {
        return new GoogleGenAI({ apiKey });
      }
    } catch (e) {
      console.debug("Shared key retrieval failed, falling back to env var:", e);
    }
  }

  // 2. Fallback to process.env.API_KEY (Standard Mode)
  // Even if this is empty, passing it might be handled by the SDK if it picks up defaults.
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

// Retry logic for API calls
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Don't retry permission errors, fail fast so UI can handle it
    if (isPermissionError(error)) {
        throw error;
    }
    
    if (retries > 0 && (error.status === 500 || error.status === 503 || error.message?.includes('500') || error.code === 500)) {
      console.warn(`API Error ${error.status || '500'}. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export const analyzeImage = async (base64Image: string, mimeType: string): Promise<PhotoAnalysis> => {
  // Use the dynamic client helper
  const ai = await getGenAIClient();
  const cleanedImage = cleanBase64(base64Image);

  const generateContent = async () => {
    return await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.1-pro-preview', // COMPETITION REQUIREMENT: Gemini 3 Pro
      contents: {
        role: 'user',
        parts: [
          {
            inlineData: {
              data: cleanedImage,
              mimeType: mimeType,
            },
          },
          {
            text: `Analyze this photograph based on the following principles:\n${PHOTOGRAPHY_PRINCIPLES}\n\nProvide a detailed analysis in JSON format according to the schema.
            
            IMPORTANT INSTRUCTIONS FOR BOUNDING BOXES:
            1. Bounding boxes must ONLY identify specific flaws, errors, or distractions (e.g., "distracting trash can", "overexposed sky", "soft focus on eyes").
            2. Do NOT create bounding boxes for positive elements or strengths.
            3. 'severity' indicates the negative impact of the flaw:
               - 'critical': A major error that ruins the photo.
               - 'moderate': A noticeable distraction.
               - 'minor': A small detail to polish.
            4. Provide coordinates as percentages (0-100) of the image dimensions.
            
            THINKING PROCESS:
            Document your analysis methodology with:
            - 3-6 key observations you noticed first
            - 3-5 reasoning steps explaining your evaluation approach
            - 3-5 priority fixes ranked by impact`,
          },
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
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            improvements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            learningPath: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3-5 specific photography skills or concepts the photographer should learn next to improve."
            },
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
                  x: { type: Type.NUMBER, description: 'Percentage from left edge (0-100)' },
                  y: { type: Type.NUMBER, description: 'Percentage from top edge (0-100)' },
                  width: { type: Type.NUMBER, description: 'Percentage of image width (0-100)' },
                  height: { type: Type.NUMBER, description: 'Percentage of image height (0-100)' },
                  description: { type: Type.STRING, description: 'Description of the FLAW or ERROR' },
                  suggestion: { type: Type.STRING, description: 'How to FIX this specific issue' },
                },
                required: ['type', 'severity', 'x', 'y', 'width', 'height', 'description', 'suggestion'],
              },
            },
            thinking: {
              type: Type.OBJECT,
              description: "The AI's reasoning process",
              properties: {
                observations: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Initial visual observations" },
                reasoningSteps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Steps taken to evaluate the photo" },
                priorityFixes: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Ranked list of most important fixes" }
              },
              required: ['observations', 'reasoningSteps', 'priorityFixes']
            }
          },
          required: ['scores', 'critique', 'strengths', 'improvements', 'learningPath', 'settingsEstimate', 'thinking'],
        },
      },
    });
  };

  const response = await withRetry(() => generateContent());

  if (!response.text) {
    throw new Error('No response content from Gemini');
  }

  const result = JSON.parse(response.text) as PhotoAnalysis;

  // --- ECONOMICS CALCULATION ---
  if (response.usageMetadata) {
    const pricing = PRICING.pro; // Using Gemini 3 Pro Pricing

    const rawPromptTokens = response.usageMetadata.promptTokenCount || 0;
    const outputTokens = response.usageMetadata.candidatesTokenCount || 0;
    const totalTokens = response.usageMetadata.totalTokenCount || 0;
    
    // 1. REAL METRICS
    const realCachedTokens = response.usageMetadata.cachedContentTokenCount || 0;
    const realNewTokens = Math.max(0, rawPromptTokens - realCachedTokens);
    
    const realCost = 
      (realCachedTokens * pricing.cachedInput) +
      (realNewTokens * pricing.input) +
      (outputTokens * pricing.output);

    // 2. PROJECTED METRICS (Simulation of High Scale + Caching)
    const approximateStaticTokens = Math.floor(PHOTOGRAPHY_PRINCIPLES.length / 4);
    const projectedCachedTokens = approximateStaticTokens; 
    const projectedNewTokens = Math.max(0, rawPromptTokens - projectedCachedTokens);

    const projectedCostWithCache = 
      (projectedCachedTokens * pricing.cachedInput) +
      (projectedNewTokens * pricing.input) +
      (outputTokens * pricing.output);
    
    const projectedSavings = Math.max(0, realCost - projectedCostWithCache);

    result.tokenUsage = {
      realCachedTokens,
      realNewTokens,
      totalTokens,
      realCost,
      
      projectedCachedTokens,
      projectedCostWithCache,
      projectedSavings
    };
  }

  return result;
};

export const generateCorrectedImage = async (base64Image: string, mimeType: string, improvements: string[]): Promise<string> => {
  // Use the dynamic client helper
  const ai = await getGenAIClient();
  const cleanedImage = cleanBase64(base64Image);
  const improvementsText = improvements.join(', ');

  const generateImg = async () => {
    return await ai.models.generateContent({
      model: process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-pro-preview', // COMPETITION REQUIREMENT: Gemini 3 Pro Image
      contents: {
        role: 'user',
        parts: [
          {
            inlineData: {
              data: cleanedImage,
              mimeType: mimeType,
            },
          },
          {
            text: `Act as a professional photo retoucher. Improve this image by addressing the following specific feedback: ${improvementsText}. Enhance technical qualities like lighting, exposure, and color balance while maintaining the original subject and composition. Return a high-quality photorealistic image.`,
          },
        ],
      },
      config: {
          imageConfig: {
              imageSize: "1K", // Available in Pro
          }
      }
    });
  };

  return await extractImage(await withRetry(() => generateImg()));
};

// NEW: Mentor Chat Feature
export const askPhotographyMentor = async (
  base64Image: string,
  mimeType: string,
  userQuestion: string,
  previousAnalysis: PhotoAnalysis,
  conversationHistory?: MentorMessage[]
): Promise<{ answer: string; thinking: ThinkingProcess }> => {
  
  const ai = await getGenAIClient();
  const cleanedImage = cleanBase64(base64Image);
  
  // Build context from previous analysis
  const contextSummary = `
Photography Analysis Context:
- Composition Score: ${previousAnalysis.scores.composition}/10
- Lighting Score: ${previousAnalysis.scores.lighting}/10
- Key Issues: ${previousAnalysis.improvements.slice(0, 3).join(', ')}
- Overall Critique: ${previousAnalysis.critique.overall}
  `;
  
  // Build conversation history if exists
  const historyText = conversationHistory
    ? conversationHistory.map(m => `${m.role === 'user' ? 'User' : 'Mentor'}: ${m.content}`).join('\n')
    : '';
  
  const mentorPrompt = `You are an expert photography mentor. Please respond in Chinese (Simplified Chinese / 简体中文). A photographer has uploaded their image and you've already analyzed it.

${contextSummary}

${historyText ? `Previous conversation:\n${historyText}\n\n` : ''}

The photographer now asks: "${userQuestion}"

As their mentor, respond directly and personally. Reference the image and their specific scores/issues. Show your reasoning process.

Return response as JSON:
{ "answer": "...", "thinking": { "observations": [...], "reasoningSteps": [...], "priorityFixes": [...] } }`;

  const generateMentorResponse = async () => {
    return await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.1-pro-preview',
      contents: {
        role: 'user',
        parts: [
          { text: mentorPrompt },
          {
            inlineData: {
              data: cleanedImage,
              mimeType: mimeType,
            },
          },
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
  };

  const response = await withRetry(() => generateMentorResponse());
  
  if (!response.text) {
    throw new Error('No response content from Mentor');
  }

  const result = JSON.parse(response.text);
  return { answer: result.answer, thinking: result.thinking };
};

const extractImage = async (response: any): Promise<string> => {
  if (response.candidates && response.candidates[0].content.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
  }
  throw new Error('No image generated by Gemini');
};