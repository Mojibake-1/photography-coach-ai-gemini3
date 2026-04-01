const fs = require('fs');

// ==========================================
// 1. Fix geminiService.ts - API endpoint + model
// ==========================================
let svc = fs.readFileSync('./services/geminiService.ts', 'utf8');

// Replace getGenAIClient to use custom API endpoint
svc = svc.replace(
  `// Helper to get the AI Client, preferring shared key if available
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
};`,
  `// Helper to get the AI Client using custom API endpoint
const getGenAIClient = async (): Promise<GoogleGenAI> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || '';
  const baseUrl = process.env.GEMINI_BASE_URL || '';
  
  const opts: any = { apiKey };
  if (baseUrl) {
    opts.httpOptions = { baseUrl };
  }
  return new GoogleGenAI(opts);
};`
);

// Replace model names
svc = svc.replace(/model: 'gemini-3-pro-preview'/g, "model: process.env.GEMINI_MODEL || 'gemini-3.1-pro-preview'");
svc = svc.replace(/model: 'gemini-3-pro-image-preview'/g, "model: process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-pro-preview'");

// Make prompts bilingual/Chinese-friendly - add Chinese instruction
svc = svc.replace(
  'You are an expert photography coach. Your goal is to provide constructive criticism to help the photographer improve.',
  'You are an expert photography coach. Your goal is to provide constructive criticism to help the photographer improve. Please respond in Chinese (Simplified Chinese / 简体中文).'
);

svc = svc.replace(
  'You are an expert photography mentor.',
  'You are an expert photography mentor. Please respond in Chinese (Simplified Chinese / 简体中文).'
);

fs.writeFileSync('./services/geminiService.ts', svc, 'utf8');
console.log('Fixed: services/geminiService.ts');

// ==========================================
// 2. Fix vite.config.ts - add new env vars
// ==========================================
let vite = fs.readFileSync('./vite.config.ts', 'utf8');
vite = vite.replace(
  `define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },`,
  `define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_BASE_URL': JSON.stringify(env.GEMINI_BASE_URL || ''),
        'process.env.GEMINI_MODEL': JSON.stringify(env.GEMINI_MODEL || ''),
        'process.env.GEMINI_IMAGE_MODEL': JSON.stringify(env.GEMINI_IMAGE_MODEL || '')
      },`
);
fs.writeFileSync('./vite.config.ts', vite, 'utf8');
console.log('Fixed: vite.config.ts');

// ==========================================
// 3. Chinese-ify index.html
// ==========================================
let html = fs.readFileSync('./index.html', 'utf8');
html = html.replace('<title>AI Photography Coach | Gemini 3 Pro</title>', '<title>AI 摄影教练 | Gemini 3 Pro</title>');
html = html.replace('lang="en"', 'lang="zh-CN"');
fs.writeFileSync('./index.html', html, 'utf8');
console.log('Fixed: index.html');

// ==========================================
// 4. Chinese-ify App.tsx
// ==========================================
let app = fs.readFileSync('./App.tsx', 'utf8');
const appReplacements = [
  ['Projected Savings: ', '预估节省: '],
  ['Scale Simulator active. See how much you\'d save!', '规模模拟器已激活，查看节省了多少！'],
  ['AI Photography Coach', 'AI 摄影教练'],
  ['AI Photography Mentor &bull; Spatial Critique &bull; Restoration', 'AI 摄影导师 &bull; 空间分析 &bull; 图像修复'],
  ['Professional Photography <br />', '专业摄影指导 <br />'],
  ['Coaching, <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-400">Reimagined.</span>', '由 AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-400">重新定义。</span>'],
  ['uses Gemini 3 Pro to analyze your photos, visualize mistakes, and generate corrections in real-time.', '使用 Gemini 3 Pro 分析您的照片，可视化问题并实时生成修正建议。'],
  ['Spatial Critique', '空间分析'],
  ['AI Image Generation', 'AI 图像生成'],
  ['Context Caching', '上下文缓存'],
  ['Or try a sample photo', '或试试示例照片'],
  ['Landscape', '风景'],
  ['Misty Valley', '雾谷'],
  ['Portrait', '人像'],
  ['Urban Light', '都市光影'],
  ['Urban', '城市'],
  ['Night City', '城市夜景'],
  ['Access Required', '需要授权'],
  ['To use the premium Gemini 3 Pro features, please connect a Google Cloud Project with billing enabled.', '请配置 API Key 以使用 Gemini 3 Pro 功能。'],
  ['Connect Project', '连接项目'],
  ['Cancel', '取消'],
  ['Analysis Failed', '分析失败'],
  ['Try Again', '重试'],
  ['Built with Google Gemini 3 Pro.', '基于 Google Gemini 3 Pro 构建。'],
  ['View Source on GitHub', '查看源码'],
  ['Presentation Mode', '演示模式'],
];

for (const [from, to] of appReplacements) {
  app = app.split(from).join(to);
}
fs.writeFileSync('./App.tsx', app, 'utf8');
console.log('Fixed: App.tsx');

// ==========================================
// 5. Chinese-ify PhotoUploader.tsx
// ==========================================
let uploader = fs.readFileSync('./components/PhotoUploader.tsx', 'utf8');
const uploaderReplacements = [
  ['Examining composition and framing...', '正在分析构图和取景...'],
  ['Analyzing lighting conditions...', '正在分析光线条件...'],
  ['Identifying technical issues...', '正在识别技术问题...'],
  ['Evaluating subject impact...', '正在评估主体表现...'],
  ['Generating recommendations...', '正在生成建议...'],
  ['Gemini 3 Pro is thinking...', 'Gemini 3 Pro 思考中...'],
  ['Please upload an image file', '请上传图片文件'],
  ['Upload a photo to get', '上传照片即可获得'],
  ['expert feedback in seconds', '秒级专业反馈'],
  ['Drag and drop your image here, or click to browse.', '拖放图片到这里，或点击浏览选择。'],
  ['Supports JPG, PNG, WEBP (Max 10MB)', '支持 JPG、PNG、WEBP（最大 10MB）'],
  ['Start Analysis', '开始分析'],
];

for (const [from, to] of uploaderReplacements) {
  uploader = uploader.split(from).join(to);
}
fs.writeFileSync('./components/PhotoUploader.tsx', uploader, 'utf8');
console.log('Fixed: components/PhotoUploader.tsx');

// ==========================================
// 6. Chinese-ify AnalysisResults.tsx
// ==========================================
let results = fs.readFileSync('./components/AnalysisResults.tsx', 'utf8');
const resultsReplacements = [
  ['Ask Your Photography Mentor', '向摄影导师提问'],
  ['Chat with Gemini 3 Pro about your photo', '与 Gemini 3 Pro 聊聊你的照片'],
  ['turns', '轮'],
  ['Ask about your composition, settings, or get creative ideas!', '询问构图、设置或获取创意灵感！'],
  ['Hide Thinking', '隐藏思考过程'],
  ['Show Thinking', '显示思考过程'],
  ['Observations:', '观察:'],
  ['Reasoning:', '推理:'],
  ['Thinking...', '思考中...'],
  ['Mentor is temporarily unavailable. Please try again.', '导师暂时不可用，请重试。'],
  ['Session limit reached.', '本次会话已达上限。'],
  ['Ask about composition, lighting, technique...', '问问构图、光线、技术方面的问题...'],
  ["Coach's Verdict", '教练评价'],
  ['Photographer', '级摄影师'],
  ['Beginner', '初级'],
  ['Intermediate', '中级'],
  ['Advanced', '高级'],
  ['Next Skills to Master', '下一步需要掌握的技能'],
  ['Composition', '构图'],
  ['Lighting', '光线'],
  ['Subject Impact', '主体表现'],
  ['Technique', '技术'],
  ['Creativity', '创意'],
  ['What Works', '亮点'],
  ['How to Improve', '改进建议'],
  ['Key Insights for Learning', '核心学习要点'],
  ['Gemini 3 Pro Thinking Process', 'Gemini 3 Pro 思考过程'],
  ['Deep reasoning analysis', '深度推理分析'],
  ['Key Observations', '关键观察'],
  ['Reasoning Steps', '推理步骤'],
  ['Priority Fixes', '优先修复项'],
  ['Technical Deep Dive', '技术深度分析'],
  ['Composition Analysis', '构图分析'],
  ['Lighting Analysis', '光线分析'],
  ['Technical Execution', '技术执行'],
  ['Detected Spatial Issues', '检测到的空间问题'],
  ['Gemini has mapped specific feedback directly onto your photo.', 'Gemini 已将具体反馈标注在您的照片上。'],
  ['Hover over the colored boxes on the left', '将鼠标悬停在左侧的彩色框上'],
  ['to read detailed tooltips about each issue.', '查看每个问题的详细提示。'],
  ['Suggestion:', '建议:'],
  ['Overview', '概览'],
  ['Detailed Analysis', '详细分析'],
  ['Mentor Chat', '导师对话'],
  ['AI Enhancement', 'AI 增强'],
  ['Economics (Sim)', '成本模拟'],
  ['AI Restoration Studio', 'AI 修复工作室'],
  ['Use Gemini 3 Pro to visualize your photo with the suggested improvements applied.', '使用 Gemini 3 Pro 将建议的改进效果可视化。'],
  ['Generate Ideal Version', '生成理想版本'],
  ['Generating...', '生成中...'],
  ['Download Corrected Image', '下载修正后的图片'],
  ['Original', '原图'],
  ['AI-Corrected', 'AI 修正'],
  ['Analyze Another Photo', '分析另一张照片'],
  ['Hide Analysis', '隐藏分析'],
  ['Show Analysis', '显示分析'],
  ['Click to view projected economics', '点击查看经济性分析'],
];

for (const [from, to] of resultsReplacements) {
  results = results.split(from).join(to);
}
fs.writeFileSync('./components/AnalysisResults.tsx', results, 'utf8');
console.log('Fixed: components/AnalysisResults.tsx');

console.log('\nAll files updated successfully!');
