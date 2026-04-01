
import React, { useState, useEffect } from 'react';
import { Camera, Sparkles, Cpu, Target, Coins, ArrowRight, PlayCircle, Zap, Image as ImageIcon, Lock, ChevronRight, Github, MonitorPlay } from 'lucide-react';
import PhotoUploader from './components/PhotoUploader';
import AnalysisResults, { TabId } from './components/AnalysisResults';
import { PresentationSlides } from './components/PresentationSlides';
import { analyzeImage, getAnalysisPromptTemplate } from './services/geminiService';
import { PhotoAnalysis, AppState, SessionCostMetric, MentorChatState } from './types';
import { sampleAnalyses } from './data/sampleAnalyses';


function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PhotoAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualJson, setManualJson] = useState("");
  const [showSlides, setShowSlides] = useState(false);
  const [initialSlide, setInitialSlide] = useState(1);
  
  // Lifted state for results tab to allow external control from header
  const [activeResultTab, setActiveResultTab] = useState<TabId>('overview');
  
  // Mentor Chat State (disabled for now)
  const [mentorChatState, setMentorChatState] = useState<MentorChatState>({ messages: [], isLoading: false });

  // NOTE: We do not check for API keys on mount or interaction to avoid forcing login redirects.
  // We rely on the service layer to use shared credentials or fail gracefully with a specific error code.

  const [analyzeStatus, setAnalyzeStatus] = useState<string>("");

  const handleImageSelected = async (base64: string, mimeType: string) => {
    setCurrentImage(base64);
    setAppState(AppState.ANALYZING);
    setAnalyzeStatus("正在连接 AI 视觉引擎...");

    try {
      // Extract raw base64 data (remove data:xxx;base64, prefix)
      const rawBase64 = base64.includes(',') ? base64.split(',')[1] : base64;

      setAnalyzeStatus("正在上传图片并分析（约 30-60 秒）...");

      const resp = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: rawBase64, mimeType }),
      });

      if (!resp.ok) {
        throw new Error(`API returned ${resp.status}`);
      }

      const data = await resp.json();

      if (data.success && data.analysis) {
        const parsed = data.analysis;
        parsed.tokenUsage = {
          realCachedTokens: 0,
          realNewTokens: data.usage?.completion_tokens || 1500,
          totalTokens: data.usage?.total_tokens || 2500,
          realCost: 0,
          projectedCachedTokens: Math.floor(Math.random() * 5000),
          projectedCostWithCache: 0,
          projectedSavings: 0
        };
        setAnalysis(parsed);
        setAppState(AppState.RESULTS);
        setActiveResultTab('overview');
        return;
      } else if (data.success && data.raw) {
        // Got response but couldn't parse JSON, let user see it in manual mode
        setManualJson(data.raw);
        setAppState(AppState.MANUAL_MODE);
        return;
      }

      throw new Error(data.error || 'Unknown API error');
    } catch (err: any) {
      console.warn('Auto-analyze failed, switching to manual mode:', err.message);
      setAnalyzeStatus("");
      setAppState(AppState.MANUAL_MODE);
    }
  };

  const sampleUrls = {
    sample1: '/sample1_v2.jpg',
    sample2: '/sample2_new.jpg',
    sample3: '/sample3_new.jpg',
    sample4: '/sample4.jpg',
    sample5: '/sample5.jpg'
  };

  const handleSampleClick = async (sampleKey: keyof typeof sampleAnalyses) => {
    setAppState(AppState.ANALYZING);
    try {
      const url = sampleUrls[sampleKey as keyof typeof sampleUrls];
      const response = await fetch(url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setCurrentImage(base64);
        
        // Mock token usage for UI continuity
        const analysis = { ...sampleAnalyses[sampleKey] };
        analysis.tokenUsage = {
          realCachedTokens: 0,
          realNewTokens: 2500,
          totalTokens: 3000,
          realCost: 0,
          projectedCachedTokens: Math.floor(Math.random() * 5000),
          projectedCostWithCache: 0,
          projectedSavings: 0
        };

        setAnalysis(analysis);
        setAppState(AppState.RESULTS);
        setActiveResultTab('overview');
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error(e);
      setError("Failed to load sample image.");
      setAppState(AppState.IDLE);
    }
  };

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setCurrentImage(null);
    setAnalysis(null);
    setError(null);
    setMentorChatState({ messages: [], isLoading: false });
  };
  
  // Handler to start presentation from beginning
  const startPresentation = () => {
    setInitialSlide(1);
    setShowSlides(true);
  };

  // Handler to show architecture slide (Slide 3) directly from app
  const showArchitectureSlide = () => {
    setInitialSlide(3);
    setShowSlides(true);
  };

  if (showSlides) {
    return <PresentationSlides onExit={() => setShowSlides(false)} initialSlide={initialSlide} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-brand-500/30">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={handleReset}>
            <div className="bg-gradient-to-br from-brand-400 to-brand-600 p-2 md:p-2.5 rounded-xl shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-shadow duration-300">
              <Camera className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-3">
                <span className="text-xl md:text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300 tracking-tight">
                  E-Commerce Vision AI
                </span>
                <div className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-purple-600 px-3 py-1 rounded-full shadow-lg shadow-purple-500/20 border border-white/10">
                   <Sparkles className="w-3 h-3 text-white fill-white" />
                   <span className="text-[11px] font-bold text-white tracking-wide uppercase">GPT-5.4 Vision</span>
                </div>
              </div>
              <span className="text-[11px] md:text-xs text-brand-400 font-semibold tracking-wide hidden sm:block uppercase opacity-90">
                视觉销售心理学 &bull; 商业级后期 &bull; 场景差异化
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 relative">
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-12">
        
        {appState === AppState.IDLE && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8 md:space-y-12 animate-fadeIn pb-20">
            
            {/* Hero Section */}
            <div className="text-center space-y-6 md:space-y-8 max-w-4xl mx-auto relative">
              {/* Background Glows */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-brand-500/10 rounded-full blur-[100px] pointer-events-none"></div>
              
              <h1 className="text-3xl md:text-5xl lg:text-7xl font-extrabold text-white tracking-tight leading-tight relative z-10 drop-shadow-sm px-4">
                别让潜在的爆款， <br />
                折损在一张 <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-400">瑕疵图</span>上。
              </h1>
              <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                跨越传统的摄影与后期边界。借助最新多模态大模型的推理能力，精准解构商品主图、A+与展示页的营销逻辑，帮助品牌构建真正能够打动核心消费者的 <span className="font-semibold text-slate-300">视觉体系。</span>
              </p>

              {/* Feature Badges */}
              <div className="flex flex-wrap justify-center gap-3 md:gap-4 relative z-10 px-4">
                <div className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 shadow-xl backdrop-blur-md group hover:border-brand-500/30 transition-colors">
                  <Target className="w-4 h-4 md:w-5 md:h-5 text-rose-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs md:text-sm font-semibold text-slate-200">排版与负空间诊断</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 shadow-xl backdrop-blur-md group hover:border-brand-500/30 transition-colors">
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs md:text-sm font-semibold text-slate-200">光影合成雷达</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 shadow-xl backdrop-blur-md group hover:border-brand-500/30 transition-colors">
                  <Coins className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs md:text-sm font-semibold text-slate-200">上下文缓存提升效率</span>
                </div>
              </div>
            </div>
            
            {/* Uploader */}
            <PhotoUploader onImageSelected={handleImageSelected} isAnalyzing={false} />

            {/* Sample Photos Section */}
            <div className="w-full max-w-[90rem] px-4 pt-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px bg-slate-800 flex-grow"></div>
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-widest">或试试示例照片</span>
                <div className="h-px bg-slate-800 flex-grow"></div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                <button 
                  onClick={() => handleSampleClick('sample1')}
                  className="group relative h-40 md:h-48 rounded-2xl overflow-hidden border border-slate-700 shadow-lg hover:shadow-brand-500/20 transition-all duration-300 hover:scale-[1.02]"
                >
                  <img src="/sample1_v2_thumb.jpg" alt="多场景合成诊断" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>
                  <div className="absolute bottom-4 left-4 text-left">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1 block">多场景合成诊断</span>
                    <h4 className="font-bold text-white flex items-center gap-2">
                      光影断层与悬浮感 <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </h4>
                  </div>
                </button>

                <button 
                  onClick={() => handleSampleClick('sample2')}
                  className="group relative h-40 md:h-48 rounded-2xl overflow-hidden border border-slate-700 shadow-lg hover:shadow-brand-500/20 transition-all duration-300 hover:scale-[1.02]"
                >
                  <img src="/sample2_new_thumb.jpg" alt="灾难合成诊断" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                   <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>
                  <div className="absolute bottom-4 left-4 text-left">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1 block">灾难级合成诊断</span>
                     <h4 className="font-bold text-white flex items-center gap-2">
                      逻辑错误与光影 <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </h4>
                  </div>
                </button>

                 <button 
                  onClick={() => handleSampleClick('sample3')}
                  className="group relative h-40 md:h-48 rounded-2xl overflow-hidden border border-slate-700 shadow-lg hover:shadow-brand-500/20 transition-all duration-300 hover:scale-[1.02]"
                >
                  <img src="/sample3_new_thumb.jpg" alt="为排版留白范例" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                   <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>
                  <div className="absolute bottom-4 left-4 text-left">
                    <span className="text-xs font-bold text-brand-400 uppercase tracking-wider mb-1 block">为排版留白范例</span>
                     <h4 className="font-bold text-white flex items-center gap-2">
                       商业海报负空间 <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </h4>
                  </div>
                </button>

                <button 
                  onClick={() => handleSampleClick('sample4')}
                  className="group relative h-40 md:h-48 rounded-2xl overflow-hidden border border-slate-700 shadow-lg hover:shadow-brand-500/20 transition-all duration-300 hover:scale-[1.02]"
                >
                  <img src="/sample4_thumb.jpg" alt="高转化视觉层级" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                   <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>
                  <div className="absolute bottom-4 left-4 text-left">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1 block">A+副图场景解析</span>
                     <h4 className="font-bold text-white flex items-center gap-2">
                       高转化视觉层级 <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </h4>
                  </div>
                </button>

                 <button 
                  onClick={() => handleSampleClick('sample5')}
                  className="group relative h-40 md:h-48 rounded-2xl overflow-hidden border border-slate-700 shadow-lg hover:shadow-brand-500/20 transition-all duration-300 hover:scale-[1.02]"
                >
                  <img src="/sample5_thumb.jpg" alt="微距质感与女性向营销" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
                   <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>
                  <div className="absolute bottom-4 left-4 text-left">
                    <span className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-1 block">微距质感展示</span>
                     <h4 className="font-bold text-white flex items-center gap-2 text-sm">
                       女性向冷调感官 <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </h4>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {appState === AppState.MANUAL_MODE && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6 max-w-2xl mx-auto animate-fadeIn px-4">
             <div className="w-20 h-20 bg-brand-500/20 rounded-full flex items-center justify-center mb-4">
                <Target className="w-10 h-10 text-brand-400" />
             </div>
             
             <h2 className="text-2xl md:text-3xl font-bold text-white text-center">手动获取分析结果</h2>
             <div className="text-slate-400 text-center mb-4 space-y-2 text-sm md:text-base bg-slate-800/50 p-6 rounded-xl border border-slate-700">
               <p>由于 API 限制，请暂时使用以下流程获取分析：</p>
               <ol className="text-left list-decimal list-inside space-y-2 mt-4 text-slate-300">
                 <li>点击下方按钮 <b>复制 Prompt（提示词）</b>。</li>
                 <li>前往 <a href="https://gemini.google.com/" target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline font-bold">Gemini 官方网页版</a>，并<b>确保切换至 Gemini Advanced (Pro 模型)</b> 以获得最佳的视觉商业洞察。</li>
                 <li>上传您刚刚选择的图片，粘贴并发送已复制的 Prompt。</li>
                 <li>将模型返回的 <b>完整的 JSON 代码</b> 复制下来。</li>
                 <li>粘贴到下方的文本框中。</li>
               </ol>
             </div>

             <button 
               onClick={async () => {
                 const prompt = getAnalysisPromptTemplate();
                 await navigator.clipboard.writeText(prompt);
                 alert("Prompt 已成功复制！请前往网页版粘贴。");
               }}
               className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center justify-center gap-2 border border-slate-700 shadow-xl transition-all font-semibold"
             >
               <kbd className="font-mono text-xs bg-slate-900 border border-slate-700 px-2 py-1 rounded">点击复制 Prompt</kbd>
             </button>

             <div className="w-full mt-8 bg-slate-900 rounded-xl p-4 border border-slate-800 shadow-inner">
                <label className="text-sm font-semibold text-brand-400 mb-2 block">在这里粘贴返回的 JSON 数据：</label>
                <textarea 
                  className="w-full h-40 bg-slate-950 border border-slate-700 rounded-md p-3 text-xs font-mono text-slate-300 resize-y focus:outline-none focus:border-brand-500"
                  placeholder='{ "scores": { "composition": 8, ... } }'
                  value={manualJson}
                  onChange={(e) => setManualJson(e.target.value)}
                />
                
                <div className="flex gap-4 mt-4">
                  <button 
                    onClick={() => {
                      try {
                        let jsonStr = manualJson.trim();
                        if (jsonStr.startsWith('\`\`\`')) {
                          jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
                        }
                        const parsed = JSON.parse(jsonStr);
                        // Add mock token usage for the UI to be happy
                        parsed.tokenUsage = {
                          realCachedTokens: 0,
                          realNewTokens: 2500,
                          totalTokens: 3000,
                          realCost: 0,
                          projectedCachedTokens: Math.floor(Math.random() * 5000),
                          projectedCostWithCache: 0,
                          projectedSavings: 0
                        };
                        setAnalysis(parsed);
                        setAppState(AppState.RESULTS);
                        setActiveResultTab('overview');
                      } catch (e: any) {
                        alert("解析失败，JSON 格式错误，请检查！\n" + e.message);
                      }
                    }}
                    className="flex-1 px-4 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-md transition-colors text-sm font-bold shadow-lg"
                  >
                    生成分析视图
                  </button>
                  <button 
                    onClick={handleReset}
                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md transition-colors text-sm font-medium"
                  >
                    取消
                  </button>
                </div>
             </div>
          </div>
        )}

        {appState === AppState.ANALYZING && (
           <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
              <div className="w-full max-w-2xl mx-auto">
                 <PhotoUploader onImageSelected={() => {}} isAnalyzing={true} />
              </div>
              <div className="text-center space-y-3 animate-fadeIn">
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-300 font-medium">{analyzeStatus || "分析中..."}</p>
                </div>
                <button 
                  onClick={() => setAppState(AppState.MANUAL_MODE)}
                  className="text-xs text-slate-500 hover:text-brand-400 transition-colors underline underline-offset-4"
                >
                  等不及？切换至手动模式 →
                </button>
              </div>
           </div>
        )}

        {appState === AppState.RESULTS && analysis && currentImage && (
          <AnalysisResults 
            analysis={analysis} 
            imageSrc={currentImage} 
            onReset={handleReset} 
            sessionHistory={[]}
            activeTab={activeResultTab}
            onTabChange={setActiveResultTab}
            mentorChatState={mentorChatState}
            setMentorChatState={setMentorChatState}
            onShowArchitecture={showArchitectureSlide}
          />
        )}

        {appState === AppState.ERROR && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
            <div className="bg-slate-800/50 border border-slate-700 p-8 rounded-2xl text-center max-w-md shadow-2xl backdrop-blur-sm">
              {error === "API_KEY_ERROR" ? (
                <>
                   <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-8 h-8 text-amber-500" />
                   </div>
                   <h3 className="text-xl font-bold text-white mb-2">需要授权</h3>
                   <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                     请配置 API Key 以使用 Gemini 3 Pro 功能。
                   </p>
                   <div className="space-y-3">
                     <button 
                      onClick={async () => {
                        if ((window as any).aistudio) {
                          try {
                            await (window as any).aistudio.openSelectKey();
                            handleReset(); // Reset to let them try uploading again with the new key
                          } catch (e) {
                            console.error(e);
                          }
                        }
                      }}
                      className="w-full px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                      <Coins className="w-4 h-4" />
                      连接项目
                    </button>
                    <button 
                      onClick={handleReset}
                      className="w-full px-6 py-3 bg-transparent hover:bg-slate-700/50 text-slate-400 hover:text-white rounded-lg transition-colors text-sm"
                    >
                      取消
                    </button>
                   </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Target className="w-8 h-8 text-rose-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">分析失败 (API 错误)</h3>
                  <p className="text-slate-400 mb-6 text-sm break-all max-h-32 overflow-y-auto">{error}</p>
                  
                  <div className="w-full text-left bg-slate-900 rounded-lg p-3 mb-6 shadow-inner">
                    <label className="text-xs text-brand-400 font-bold mb-2 block flex items-center gap-2">
                       <Zap className="w-3 h-3" /> 手动恢复模式
                    </label>
                    <textarea 
                      className="w-full h-32 bg-slate-950 border border-slate-700 rounded-md p-2 text-xs font-mono text-slate-300 resize-y focus:outline-none focus:border-brand-500"
                      placeholder="如果你在其他浏览器获得了 JSON 结果，可以在这里粘贴..."
                      value={manualJson}
                      onChange={(e) => setManualJson(e.target.value)}
                    />
                    <button 
                      onClick={() => {
                        try {
                          let jsonStr = manualJson.trim();
                          if (jsonStr.startsWith('\`\`\`')) {
                            jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
                          }
                          const parsed = JSON.parse(jsonStr);
                          setAnalysis(parsed);
                          setAppState(AppState.RESULTS);
                        } catch (e: any) {
                          alert("JSON 格式错误，请检查内容是否完整！\n" + e.message);
                        }
                      }}
                      className="w-full mt-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-md transition-colors text-sm font-bold shadow-lg"
                    >
                      使用此 JSON 渲染结果
                    </button>
                  </div>

                  <button 
                    onClick={handleReset}
                    className="w-full px-8 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg transition-colors font-medium"
                  >
                    返回上传页重试
                  </button>
                </>
              )}
            </div>
          </div>
        )}

      </main>

      <footer className="border-t border-slate-800 mt-12 py-8 flex flex-col items-center gap-4 text-slate-600 text-sm">
        <p>&copy; {new Date().getFullYear()} AI 摄影教练. 基于 Google Gemini 3 Pro 构建。</p>
        <div className="flex gap-4">
          <a 
            href="https://github.com/prasadt1/photography-coach-ai-gemini3" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-slate-400 transition-colors"
          >
            <Github className="w-4 h-4" />
            <span>查看源码</span>
          </a>
          <button 
            onClick={startPresentation}
            className="flex items-center gap-2 hover:text-emerald-400 transition-colors"
          >
            <MonitorPlay className="w-4 h-4" />
            <span>演示模式</span>
          </button>
        </div>
      </footer>
    </div>
  );
}

export default App;
