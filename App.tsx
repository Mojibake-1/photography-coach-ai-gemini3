
import React, { useState, useEffect } from 'react';
import { Camera, Sparkles, Cpu, Target, Coins, ArrowRight, PlayCircle, Zap, Image as ImageIcon, Lock, ChevronRight, Github, MonitorPlay } from 'lucide-react';
import PhotoUploader from './components/PhotoUploader';
import AnalysisResults, { TabId } from './components/AnalysisResults';
import { PresentationSlides } from './components/PresentationSlides';
import { analyzeImage } from './services/geminiService';
import { PhotoAnalysis, AppState, SessionCostMetric, MentorChatState } from './types';

// Floating badge component for the header
const SessionSavingsBadge: React.FC<{ 
  sessionHistory: SessionCostMetric[]; 
  onClick: () => void;
}> = ({ sessionHistory, onClick }) => {
  if (sessionHistory.length === 0) return null;

  const totalPotentialSavings = sessionHistory.reduce((acc, curr) => acc + curr.potentialSavings, 0);
  const totalRealCost = sessionHistory.reduce((acc, curr) => acc + curr.realCost, 0);
  const savingsPercent = totalRealCost > 0 
    ? (totalPotentialSavings / totalRealCost) * 100 
    : 0;

  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-2 px-2 md:px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer animate-pulse-slow group relative"
      title="Click to view projected economics"
    >
      <Coins className="w-4 h-4" />
      <span className="text-xs font-bold tracking-wide">
        <span className="hidden md:inline">预估节省: </span>
        ${totalPotentialSavings.toFixed(5)} 
        <span className="hidden md:inline"> ({savingsPercent.toFixed(1)}%)</span>
      </span>
      {/* Tooltip for first-time users */}
      {sessionHistory.length === 1 && (
        <div className="absolute top-full right-0 mt-3 w-40 md:w-48 p-2 md:p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-xl text-[10px] md:text-xs text-slate-300 text-center animate-fadeIn z-50">
          <div className="absolute -top-1 right-4 md:right-8 w-2 h-2 bg-slate-800 border-l border-t border-slate-700 rotate-45"></div>
          💡 规模模拟器已激活，查看节省了多少！
        </div>
      )}
    </button>
  );
};

function App() {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PhotoAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSlides, setShowSlides] = useState(false);
  const [initialSlide, setInitialSlide] = useState(1);
  
  // Lifted state for results tab to allow external control from header
  const [activeResultTab, setActiveResultTab] = useState<TabId>('overview');
  
  // Session History State
  const [sessionHistory, setSessionHistory] = useState<SessionCostMetric[]>([]);

  // Lifted Mentor Chat State to persist across tab/device switches
  const [mentorChatState, setMentorChatState] = useState<MentorChatState>({ messages: [], isLoading: false });

  // NOTE: We do not check for API keys on mount or interaction to avoid forcing login redirects.
  // We rely on the service layer to use shared credentials or fail gracefully with a specific error code.

  const handleImageSelected = async (base64: string, mimeType: string) => {
    // We proceed directly to analysis. 
    // The Gemini Service will attempt to fetch a shared key from the environment.
    // If that fails, the error block below will handle the UI state.
    
    setCurrentImage(base64);
    setAppState(AppState.ANALYZING);
    setError(null);
    // Reset tabs and chat for new analysis
    setActiveResultTab('overview');
    setMentorChatState({ messages: [], isLoading: false });

    try {
      const result = await analyzeImage(base64, mimeType);
      setAnalysis(result);

      // Update session history if token usage data exists
      if (result.tokenUsage) {
        setSessionHistory(prev => {
          const newMetric: SessionCostMetric = {
            id: prev.length + 1,
            timestamp: Date.now(),
            realCost: result.tokenUsage!.realCost,
            projectedCost: result.tokenUsage!.projectedCostWithCache,
            potentialSavings: result.tokenUsage!.projectedSavings,
            // These aren't used in the main history view but good to keep
            cachedTokens: result.tokenUsage!.realCachedTokens,
            newTokens: result.tokenUsage!.realNewTokens
          };
          return [...prev, newMetric];
        });
      }

      setAppState(AppState.RESULTS);
    } catch (err: any) {
      console.error(err);
      
      const errorMessage = (err.message || err.toString()).toLowerCase();
      // Check for common permission/key errors (403 Forbidden, 404 Not Found for model)
      if (
        errorMessage.includes("permission denied") || 
        errorMessage.includes("403") || 
        errorMessage.includes("404") || 
        errorMessage.includes("requested entity was not found") ||
        errorMessage.includes("api key") ||
        errorMessage.includes("quota")
      ) {
        setError("API_KEY_ERROR"); 
      } else {
        setError("Failed to analyze image. Please try again. " + (err.message || ""));
      }
      setAppState(AppState.ERROR);
    }
  };

  const handleSampleClick = async (url: string) => {
    setAppState(AppState.ANALYZING);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        handleImageSelected(base64, blob.type);
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
                  AI 摄影教练
                </span>
                <div className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-purple-600 px-3 py-1 rounded-full shadow-lg shadow-purple-500/20 border border-white/10">
                   <Sparkles className="w-3 h-3 text-white fill-white" />
                   <span className="text-[11px] font-bold text-white tracking-wide uppercase">Gemini 3 Pro</span>
                </div>
              </div>
              <span className="text-[11px] md:text-xs text-brand-400 font-semibold tracking-wide hidden sm:block uppercase opacity-90">
                AI 摄影导师 &bull; 空间分析 &bull; 图像修复
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4 relative">
             {/* Economics Badge */}
             <SessionSavingsBadge 
               sessionHistory={sessionHistory} 
               onClick={() => {
                 if (appState === AppState.RESULTS) {
                   setActiveResultTab('economics');
                   // Smooth scroll to top of content
                   window.scrollTo({ top: 0, behavior: 'smooth' });
                 }
               }} 
             />
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
                专业摄影指导 <br />
                由 AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-400">重新定义。</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                The <span className="font-semibold text-slate-300">AI 摄影教练</span> 使用 Gemini 3 Pro 分析您的照片，可视化问题并实时生成修正建议。
              </p>

              {/* Feature Badges */}
              <div className="flex flex-wrap justify-center gap-3 md:gap-4 relative z-10 px-4">
                <div className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 shadow-xl backdrop-blur-md group hover:border-brand-500/30 transition-colors">
                  <Target className="w-4 h-4 md:w-5 md:h-5 text-rose-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs md:text-sm font-semibold text-slate-200">空间分析</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 shadow-xl backdrop-blur-md group hover:border-brand-500/30 transition-colors">
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs md:text-sm font-semibold text-slate-200">AI 图像生成</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 shadow-xl backdrop-blur-md group hover:border-brand-500/30 transition-colors">
                  <Coins className="w-4 h-4 md:w-5 md:h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs md:text-sm font-semibold text-slate-200">上下文缓存</span>
                </div>
              </div>
            </div>
            
            {/* Uploader */}
            <PhotoUploader onImageSelected={handleImageSelected} isAnalyzing={false} />

            {/* Sample Photos Section */}
            <div className="w-full max-w-4xl pt-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px bg-slate-800 flex-grow"></div>
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-widest">或试试示例照片</span>
                <div className="h-px bg-slate-800 flex-grow"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button 
                  onClick={() => handleSampleClick('https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80')}
                  className="group relative h-40 md:h-48 rounded-2xl overflow-hidden border border-slate-700 shadow-lg hover:shadow-brand-500/20 transition-all duration-300 hover:scale-[1.02]"
                >
                  <img src="https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80" alt="风景" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>
                  <div className="absolute bottom-4 left-4 text-left">
                    <span className="text-xs font-bold text-brand-400 uppercase tracking-wider mb-1 block">风景</span>
                    <h4 className="font-bold text-white flex items-center gap-2">
                      雾谷 <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </h4>
                  </div>
                </button>

                <button 
                  onClick={() => handleSampleClick('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80')}
                  className="group relative h-40 md:h-48 rounded-2xl overflow-hidden border border-slate-700 shadow-lg hover:shadow-brand-500/20 transition-all duration-300 hover:scale-[1.02]"
                >
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80" alt="人像" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                   <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>
                  <div className="absolute bottom-4 left-4 text-left">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1 block">人像</span>
                     <h4 className="font-bold text-white flex items-center gap-2">
                      都市光影 <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </h4>
                  </div>
                </button>

                 <button 
                  onClick={() => handleSampleClick('https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80')}
                  className="group relative h-40 md:h-48 rounded-2xl overflow-hidden border border-slate-700 shadow-lg hover:shadow-brand-500/20 transition-all duration-300 hover:scale-[1.02]"
                >
                  <img src="https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80" alt="City" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                   <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>
                  <div className="absolute bottom-4 left-4 text-left">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1 block">城市</span>
                     <h4 className="font-bold text-white flex items-center gap-2">
                      城市夜景 <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </h4>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {appState === AppState.ANALYZING && (
           <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 animate-pulse">
              <div className="w-full max-w-2xl mx-auto">
                 {/* Re-use uploader in 'analyzing' state for visual continuity */}
                 <PhotoUploader onImageSelected={() => {}} isAnalyzing={true} />
              </div>
           </div>
        )}

        {appState === AppState.RESULTS && analysis && currentImage && (
          <AnalysisResults 
            analysis={analysis} 
            imageSrc={currentImage} 
            onReset={handleReset} 
            sessionHistory={sessionHistory}
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
                  <h3 className="text-xl font-bold text-white mb-2">分析失败</h3>
                  <p className="text-slate-400 mb-6 text-sm">{error}</p>
                  <button 
                    onClick={handleReset}
                    className="px-8 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
                  >
                    重试
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
