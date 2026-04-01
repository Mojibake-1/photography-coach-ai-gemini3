const fs = require('fs');

let svc = fs.readFileSync('./services/geminiService.ts', 'utf8');

// Replace the old getGenAIClient function
const oldClient = `// Helper to get the AI Client, preferring shared key if available
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
};`;

const newClient = `// Helper to get the AI Client using custom API endpoint
const getGenAIClient = async (): Promise<GoogleGenAI> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
  const baseUrl = process.env.GEMINI_BASE_URL || '';
  
  const opts: any = { apiKey };
  if (baseUrl) {
    opts.httpOptions = { baseUrl };
  }
  return new GoogleGenAI(opts);
};`;

// Normalize line endings for matching
const normalizedSvc = svc.replace(/\r\n/g, '\n');
const normalizedOld = oldClient.replace(/\r\n/g, '\n');

if (normalizedSvc.includes(normalizedOld)) {
  svc = svc.replace(/\r\n/g, '\n').replace(normalizedOld, newClient).replace(/\n/g, '\r\n');
  console.log('Replaced getGenAIClient');
} else {
  console.log('getGenAIClient pattern not found - may already be replaced');
}

// Replace model names
const count1 = (svc.match(/model: 'gemini-3-pro-preview'/g) || []).length;
svc = svc.replace(/model: 'gemini-3-pro-preview'/g, "model: process.env.GEMINI_MODEL || 'gemini-3.1-pro-preview'");
console.log(`Replaced ${count1} occurrences of gemini-3-pro-preview`);

const count2 = (svc.match(/model: 'gemini-3-pro-image-preview'/g) || []).length;
svc = svc.replace(/model: 'gemini-3-pro-image-preview'/g, "model: process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-pro-preview'");
console.log(`Replaced ${count2} occurrences of gemini-3-pro-image-preview`);

fs.writeFileSync('./services/geminiService.ts', svc, 'utf8');
console.log('Done');
