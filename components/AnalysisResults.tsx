
import React, { useState, useEffect, useRef } from 'react';
import { PhotoAnalysis, SessionCostMetric, MentorChatState, MentorMessage } from '../types';
import SpatialOverlay from './SpatialOverlay';
import { generateCorrectedImage, askPhotographyMentor } from '../services/geminiService';
import { 
  ResponsiveContainer, 
  RadarChart, 
  Radar, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Tooltip as RechartsTooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Line
} from 'recharts';
import { 
  Camera, Zap, Layout, Eye, Star, ChevronRight, Aperture, Clock, Gauge, Target,
  ScanEye, Wand2, Loader2, Download, MoveHorizontal, Coins, Info, TrendingDown,
  LayoutDashboard, Map, PiggyBank, History, Brain, ChevronDown, ChevronUp, ListChecks, ArrowUpRight,
  MessageCircle, Send, User, Bot, Server, MousePointerClick
} from 'lucide-react';

export type TabId = 'overview' | 'details' | 'mentor' | 'enhance' | 'economics';

interface AnalysisResultsProps {
  analysis: PhotoAnalysis;
  imageSrc: string;
  onReset: () => void;
  sessionHistory: SessionCostMetric[];
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  mentorChatState: MentorChatState;
  setMentorChatState: React.Dispatch<React.SetStateAction<MentorChatState>>;
  onShowArchitecture: () => void;
}

const ScoreCard: React.FC<{ label: string; score: number; icon: React.ReactNode }> = ({ label, score, icon }) => {
  const getColor = (s: number) => {
    if (s >= 8) return "text-emerald-400";
    if (s >= 5) return "text-amber-400";
    return "text-rose-400";
  };

  return (
    <div className="bg-slate-800/50 p-3 md:p-4 rounded-xl border border-slate-700 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-700 rounded-lg text-slate-300">
          {icon}
        </div>
        <span className="font-medium text-slate-200 text-sm md:text-base">{label}</span>
      </div>
      <div className={`text-lg md:text-xl font-bold ${getColor(score)}`}>
        {score}/10
      </div>
    </div>
  );
};

const InfoTooltip = ({ content }: { content: string }) => (
  <div className="group/tooltip relative inline-flex items-center ml-2">
    <Info className="w-3.5 h-3.5 text-slate-500 hover:text-brand-400 cursor-help transition-colors" />
    <div className="absolute top-full right-0 md:left-1/2 md:-translate-x-1/2 mt-2 w-60 md:w-72 p-3 bg-slate-900 border border-slate-700 text-xs text-slate-300 rounded-lg shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50 leading-relaxed text-center">
      {content}
      {/* Arrow pointing up */}
      <div className="absolute -top-1 right-2 md:left-1/2 md:-translate-x-1/2 w-2 h-2 bg-slate-900 border-l border-t border-slate-700 rotate-45"></div>
    </div>
  </div>
);

// --- MENTOR CHAT SUB-COMPONENT ---
interface MentorChatWidgetProps {
  imageSrc: string; 
  analysis: PhotoAnalysis;
  chatState: MentorChatState;
  onStateChange: React.Dispatch<React.SetStateAction<MentorChatState>>;
}

const MentorChatWidget: React.FC<MentorChatWidgetProps> = ({ imageSrc, analysis, chatState, onStateChange }) => {
  const [input, setInput] = useState('');
  const [expandedThinkingId, setExpandedThinkingId] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const turnCount = Math.floor(chatState.messages.length / 2);
  const isLimitReached = turnCount >= 5;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatState.messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || chatState.isLoading || isLimitReached) return;

    const userMsg: MentorMessage = {
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    onStateChange(prev => ({ ...prev, messages: [...prev.messages, userMsg], isLoading: true, error: undefined }));
    setInput('');

    try {
      const mimeType = imageSrc.split(';')[0].split(':')[1] || 'image/jpeg';
      const response = await askPhotographyMentor(
        imageSrc, 
        mimeType, 
        userMsg.content, 
        analysis, 
        chatState.messages
      );

      const assistantMsg: MentorMessage = {
        role: 'assistant',
        content: response.answer,
        thinking: response.thinking,
        timestamp: Date.now()
      };

      onStateChange(prev => ({ ...prev, messages: [...prev.messages, assistantMsg], isLoading: false }));
    } catch (e: any) {
      console.error(e);
      onStateChange(prev => ({ ...prev, isLoading: false, error: "Mentor is temporarily unavailable. Please try again." }));
    }
  };

  return (
    <div className="mb-8 rounded-2xl bg-slate-900 border border-slate-700 shadow-xl overflow-hidden animate-fadeIn">
      {/* Header */}
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg text-white">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm md:text-base">🤝 Ask Your Photography Mentor</h3>
            <p className="text-xs text-slate-400">Chat with Gemini 3 Pro about your photo</p>
          </div>
        </div>
        <div className="text-xs font-mono text-slate-500">
          {turnCount}/5 turns
        </div>
      </div>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="h-[400px] overflow-y-auto p-4 space-y-6 bg-slate-900/50 custom-scrollbar"
      >
        {chatState.messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
            <Bot className="w-10 h-10 opacity-20" />
            <p className="text-sm">Ask about your composition, settings, or get creative ideas!</p>
          </div>
        )}

        {chatState.messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fadeIn`}>
             <div className={`flex items-start gap-3 max-w-[90%] md:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
               <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                 msg.role === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
               }`}>
                 {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
               </div>
               
               <div className={`p-3 md:p-4 rounded-2xl text-sm leading-relaxed ${
                 msg.role === 'user' 
                   ? 'bg-blue-500/20 text-blue-100 rounded-tr-none border border-blue-500/20' 
                   : 'bg-emerald-500/5 text-slate-200 rounded-tl-none border border-emerald-500/10'
               }`}>
                 {msg.content}
               </div>
             </div>

             {/* Thinking Toggle for Assistant */}
             {msg.role === 'assistant' && msg.thinking && (
               <div className="mt-2 ml-11 max-w-[80%]">
                 <button 
                   onClick={() => setExpandedThinkingId(expandedThinkingId === idx ? null : idx)}
                   className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-emerald-400 transition-colors uppercase font-bold tracking-wider mb-2"
                 >
                   <Brain className="w-3 h-3" />
                   {expandedThinkingId === idx ? 'Hide Thinking' : 'Show Thinking'}
                 </button>
                 
                 {expandedThinkingId === idx && (
                   <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400 animate-fadeIn">
                     <p className="text-emerald-500/70 mb-1 font-bold">&gt; Observations:</p>
                     <ul className="list-disc list-inside mb-2 pl-1 space-y-0.5">
                       {msg.thinking.observations.map((o, i) => <li key={i}>{o}</li>)}
                     </ul>
                     <p className="text-purple-500/70 mb-1 font-bold">&gt; Reasoning:</p>
                     <ul className="list-decimal list-inside mb-2 pl-1 space-y-0.5">
                       {msg.thinking.reasoningSteps.map((s, i) => <li key={i}>{s}</li>)}
                     </ul>
                   </div>
                 )}
               </div>
             )}
          </div>
        ))}

        {chatState.isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3 rounded-2xl rounded-tl-none bg-emerald-500/5 border border-emerald-500/10 text-sm text-slate-400 italic">
              Thinking...
            </div>
          </div>
        )}

        {chatState.error && (
          <div className="text-center p-2 text-xs text-rose-400 bg-rose-500/10 rounded-lg mx-auto w-fit">
            {chatState.error}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-800/50 border-t border-slate-700">
        <div className="flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={isLimitReached ? "Session limit reached." : "Ask about composition, lighting, technique..."}
            disabled={chatState.isLoading || isLimitReached}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button 
            onClick={handleSendMessage}
            disabled={!input.trim() || chatState.isLoading || isLimitReached}
            className="p-2 bg-brand-600 text-white rounded-xl hover:bg-brand-500 disabled:opacity-50 disabled:hover:bg-brand-600 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};


const AnalysisResults: React.FC<AnalysisResultsProps> = ({ 
  analysis, 
  imageSrc, 
  onReset, 
  sessionHistory,
  activeTab,
  onTabChange,
  mentorChatState,
  setMentorChatState,
  onShowArchitecture
}) => {
  const [showOverlays, setShowOverlays] = useState(false);
  
  // State for AI Correction
  const [isGenerating, setIsGenerating] = useState(false);
  const [correctedImage, setCorrectedImage] = useState<string | null>(null);
  const [sliderValue, setSliderValue] = useState(50);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // State for Thinking Process - Expanded by default on load
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true);

  // NOTE: Local state for Mentor Chat has been removed. 
  // We now rely on 'mentorChatState' and 'setMentorChatState' props from the parent App component.

  const hasBoundingBoxes = analysis.boundingBoxes && analysis.boundingBoxes.length > 0;
  
  // Auto-show overlays when switching to Detailed Analysis tab
  useEffect(() => {
    if (activeTab === 'details' && hasBoundingBoxes) {
      setShowOverlays(true);
    }
  }, [activeTab, hasBoundingBoxes]);

  // Skill Level Logic
  const averageScore = (
    analysis.scores.composition + 
    analysis.scores.lighting + 
    analysis.scores.creativity + 
    analysis.scores.technique + 
    analysis.scores.subjectImpact
  ) / 5;

  let skillLevel = "Beginner";
  let badgeClass = "bg-rose-500/20 text-rose-400 border-rose-500/30";
  // Fallback if API doesn't return learning path (e.g. old response format)
  let nextSkills = analysis.learningPath || ["Master composition basics", "Learn exposure compensation", "Practice aperture priority mode"];

  if (averageScore >= 7.5) {
    skillLevel = "Advanced";
    badgeClass = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  } else if (averageScore >= 5.5) {
    skillLevel = "Intermediate";
    badgeClass = "bg-amber-500/20 text-amber-400 border-amber-500/30";
  }

  const chartData = [
    { subject: 'Composition', A: analysis.scores.composition, fullMark: 10 },
    { subject: 'Lighting', A: analysis.scores.lighting, fullMark: 10 },
    { subject: 'Creativity', A: analysis.scores.creativity, fullMark: 10 },
    { subject: 'Technique', A: analysis.scores.technique, fullMark: 10 },
    { subject: 'Subject', A: analysis.scores.subjectImpact, fullMark: 10 },
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      // NOTE: Removed preemptive openSelectKey call here.
      // We rely on the service to use shared credentials or fail gracefully with a specific error code.

      const mimeType = imageSrc.split(';')[0].split(':')[1] || 'image/jpeg';
      const resultBase64 = await generateCorrectedImage(imageSrc, mimeType, analysis.improvements);
      setCorrectedImage(`data:image/png;base64,${resultBase64}`);
    } catch (err: any) {
      console.error(err);
      const errorMessage = (err.message || err.toString()).toLowerCase();
      
      // Handle Permission Denied (403), Not Found (404), or Billing issues
      if (
        errorMessage.includes("permission denied") || 
        errorMessage.includes("403") ||
        errorMessage.includes("requested entity was not found") || 
        errorMessage.includes("404") ||
        errorMessage.includes("billing")
      ) {
          if ((window as any).aistudio) {
             setGenerationError("Updating project...");
             try {
               await (window as any).aistudio.openSelectKey();
               // After dialog closes (promise resolves)
               setGenerationError("Project updated. Click 'Generate Ideal Version' again.");
             } catch (e) {
               console.error("Failed to open key selector", e);
               setGenerationError("Failed to open project selector. Please reload.");
             }
             return; 
          }
      }
      setGenerationError("Failed to generate image. " + (err.message || "Please try again."));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!correctedImage) return;
    const link = document.createElement('a');
    link.href = correctedImage;
    link.download = 'lenscraft-ideal-version.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'details', label: 'Detailed Analysis', icon: ScanEye },
    { id: 'mentor', label: 'Mentor Chat', icon: MessageCircle },
    { id: 'enhance', label: 'AI Enhancement', icon: Wand2 },
    { id: 'economics', label: 'Economics (Sim)', icon: Coins },
  ];

  const totalPotentialSavings = sessionHistory.reduce((acc, curr) => acc + curr.potentialSavings, 0);

  // Projection Calculations
  const averageCostWithCache = sessionHistory.length > 0 
    ? sessionHistory.reduce((acc, curr) => acc + curr.projectedCost, 0) / sessionHistory.length
    : 0;
  const averageRealCost = sessionHistory.length > 0
    ? sessionHistory.reduce((acc, curr) => acc + curr.realCost, 0) / sessionHistory.length
    : 0;
    
  const projectedAt1000 = averageCostWithCache * 1000;
  const realAt1000 = averageRealCost * 1000;
  const savingsAt1000 = realAt1000 - projectedAt1000;
  const savingsPercent = realAt1000 > 0 ? (savingsAt1000 / realAt1000) * 100 : 0;

  return (
    <div className="w-full max-w-7xl mx-auto animate-fadeIn">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Image & Quick Stats (Sticky on Desktop, Top on Mobile) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="lg:sticky lg:top-24 space-y-6">
            
            {/* Image Container */}
            <div className="relative group rounded-2xl bg-black shadow-2xl border border-slate-700 flex justify-center items-center min-h-[250px] md:min-h-[300px]">
               <div className="relative inline-block w-auto h-auto max-w-full m-2 md:m-4"> 
                  <img 
                    src={imageSrc} 
                    alt="Analyzed" 
                    className="block w-auto h-auto max-w-full max-h-[50vh] md:max-h-[60vh] rounded-lg shadow-lg" 
                  />
                  
                  <SpatialOverlay 
                    boundingBoxes={analysis.boundingBoxes || []} 
                    show={showOverlays} 
                  />
               </div>

               {/* Toggle Overlay Button */}
               {hasBoundingBoxes && (
                 <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 z-50">
                   <button 
                     onClick={() => setShowOverlays(!showOverlays)}
                     className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border transition-all duration-200 shadow-lg hover:scale-105 ${
                       showOverlays 
                         ? 'bg-brand-500 text-white border-brand-400' 
                         : 'bg-slate-900/80 text-slate-300 border-slate-600'
                     }`}
                   >
                     <ScanEye className="w-4 h-4" />
                     {showOverlays ? 'Hide Analysis' : 'Show Analysis'}
                   </button>
                 </div>
               )}
            </div>

            {/* Estimated Settings */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-slate-800 p-2 md:p-3 rounded-xl border border-slate-700 flex flex-col items-center text-center">
                <Target className="w-4 h-4 text-brand-400 mb-1" />
                <span className="text-[9px] md:text-[10px] text-slate-400 uppercase tracking-wider">Focal</span>
                <span className="text-xs font-semibold text-slate-200">{analysis.settingsEstimate.focalLength}</span>
              </div>
              <div className="bg-slate-800 p-2 md:p-3 rounded-xl border border-slate-700 flex flex-col items-center text-center">
                <Aperture className="w-4 h-4 text-brand-400 mb-1" />
                <span className="text-[9px] md:text-[10px] text-slate-400 uppercase tracking-wider">Ap.</span>
                <span className="text-xs font-semibold text-slate-200">{analysis.settingsEstimate.aperture}</span>
              </div>
              <div className="bg-slate-800 p-2 md:p-3 rounded-xl border border-slate-700 flex flex-col items-center text-center">
                <Clock className="w-4 h-4 text-brand-400 mb-1" />
                <span className="text-[9px] md:text-[10px] text-slate-400 uppercase tracking-wider">Shutter</span>
                <span className="text-xs font-semibold text-slate-200">{analysis.settingsEstimate.shutterSpeed}</span>
              </div>
              <div className="bg-slate-800 p-2 md:p-3 rounded-xl border border-slate-700 flex flex-col items-center text-center">
                <Gauge className="w-4 h-4 text-brand-400 mb-1" />
                <span className="text-[9px] md:text-[10px] text-slate-400 uppercase tracking-wider">ISO</span>
                <span className="text-xs font-semibold text-slate-200">{analysis.settingsEstimate.iso}</span>
              </div>
            </div>

            <button 
              onClick={onReset}
              className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-medium transition-colors border border-slate-600 min-h-[44px]"
            >
              Analyze Another Photo
            </button>
          </div>
        </div>

        {/* Right Column: Tabbed Content */}
        <div className="lg:col-span-7 pb-20">
          
          {/* Tabs Navigation */}
          <div className="flex p-1 bg-slate-800/50 rounded-xl border border-slate-700 mb-6 sticky top-24 z-40 backdrop-blur-md overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id as TabId)}
                className={`flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center min-w-[100px] relative ${
                  activeTab === tab.id
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {/* Visual cue for new feature in Details tab */}
                {tab.id === 'details' && analysis.thinking && (
                   <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-6 animate-fadeIn">
            
            {/* --- OVERVIEW TAB --- */}
            {activeTab === 'overview' && (
              <>
                <div className="bg-slate-800/40 rounded-3xl p-4 md:p-8 border border-slate-700 backdrop-blur-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                      <Star className="text-brand-500 fill-brand-500 w-6 h-6" /> 
                      Coach's Verdict
                    </h2>
                    {/* Skill Badge */}
                    <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${badgeClass} self-start md:self-auto`}>
                      {skillLevel} Photographer
                    </div>
                  </div>

                  <p className="text-base md:text-lg text-slate-300 leading-relaxed italic border-l-4 border-brand-500 pl-4 mb-8">
                    "{analysis.critique.overall}"
                  </p>

                  {/* Next Skills Card */}
                  <div className="bg-slate-900/50 rounded-xl p-5 border-l-4 border-emerald-500/50 border-y border-r border-slate-700/50">
                    <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <span className="text-lg">📈</span> Next Skills to Master
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {nextSkills.map((skill, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/60 px-3 py-2.5 rounded-lg border border-slate-700/50">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
                          {skill}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-800/40 rounded-3xl p-4 md:p-6 border border-slate-700 flex items-center justify-center min-h-[250px] md:min-h-[300px]">
                    <div className="w-full h-[220px] md:h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={chartData}>
                          <PolarGrid stroke="#475569" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 10]} tick={false} axisLine={false} />
                          <Radar
                            name="Score"
                            dataKey="A"
                            stroke="#22c55e"
                            strokeWidth={3}
                            fill="#22c55e"
                            fillOpacity={0.3}
                          />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} 
                            itemStyle={{ color: '#4ade80' }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <ScoreCard label="Composition" score={analysis.scores.composition} icon={<Layout className="w-5 h-5"/>} />
                    <ScoreCard label="Lighting" score={analysis.scores.lighting} icon={<Zap className="w-5 h-5"/>} />
                    <ScoreCard label="Subject Impact" score={analysis.scores.subjectImpact} icon={<Eye className="w-5 h-5"/>} />
                    <ScoreCard label="Technique" score={analysis.scores.technique} icon={<Camera className="w-5 h-5"/>} />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-emerald-900/10 border border-emerald-900/50 rounded-2xl p-4 md:p-6">
                    <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
                      <span className="bg-emerald-500/10 p-1 rounded">👍</span> What Works
                    </h3>
                    <ul className="space-y-3">
                      {analysis.strengths.map((str, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-slate-300 text-sm">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                          {str}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-indigo-900/10 border border-indigo-900/50 rounded-2xl p-4 md:p-6">
                    <h3 className="text-indigo-400 font-bold mb-4 flex items-center gap-2">
                      <span className="bg-indigo-500/10 p-1 rounded">🚀</span> How to Improve
                    </h3>
                     <ul className="space-y-3">
                      {analysis.improvements.map((imp, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-slate-300 text-sm">
                          <ChevronRight className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                          {imp}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Key Insights for Learning Card */}
                {analysis.improvements && analysis.improvements.length >= 2 && (
                  <div className="mt-6 bg-slate-800/40 border-l-4 border-emerald-500 rounded-r-2xl p-6 backdrop-blur-sm shadow-lg animate-fadeIn">
                    <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                      <span className="bg-emerald-500/10 p-1.5 rounded-lg text-lg">🎯</span> 
                      Key Insights for Learning
                    </h3>
                    <div className="space-y-4">
                      {analysis.improvements.slice(0, 5).map((insight, idx) => (
                        <div key={idx} className="flex items-start gap-4 p-3 rounded-xl bg-slate-900/30 border border-slate-700/30 hover:bg-slate-900/50 transition-colors">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm border border-emerald-500/30">
                            {idx + 1}
                          </div>
                          <p className="text-slate-300 text-sm md:text-base leading-relaxed mt-1">
                            {insight}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* --- DETAILED ANALYSIS TAB --- */}
            {activeTab === 'details' && (
              <>
                {/* Thinking Process Section - Showcasing Gemini 3 Pro capabilities */}
                {analysis.thinking && (
                   <div className="mb-8 rounded-2xl p-[1px] bg-gradient-to-r from-emerald-500 to-purple-600 shadow-xl shadow-brand-500/5 animate-fadeIn">
                     <div className="bg-slate-950/50 rounded-2xl overflow-hidden backdrop-blur-md">
                       <button 
                         onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
                         className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-slate-900/50 transition-colors"
                       >
                         <div className="flex items-center gap-3">
                           <div className="p-2 bg-gradient-to-br from-emerald-500 to-purple-600 rounded-lg text-white shadow-lg">
                             <Brain className="w-5 h-5" />
                           </div>
                           <div className="text-left">
                             <h3 className="text-white font-bold text-sm md:text-base">🧠 Gemini 3 Pro Thinking Process</h3>
                             <div className="flex items-center gap-2">
                               <p className="text-xs text-slate-400 font-mono mt-0.5">Deep reasoning analysis</p>
                               <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 rounded font-mono">thinking_level: high</span>
                             </div>
                           </div>
                         </div>
                         {isThinkingExpanded ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                       </button>

                       {isThinkingExpanded && (
                         <div className="p-5 md:p-6 border-t border-slate-800 bg-slate-950/80 font-mono text-sm space-y-6 animate-fadeIn">
                           {/* Observations */}
                           <div>
                             <h4 className="flex items-center gap-2 text-emerald-400 font-bold mb-3 uppercase text-xs tracking-wider">
                               <Eye className="w-4 h-4" /> Key Observations
                             </h4>
                             <ul className="space-y-2 pl-2 border-l border-emerald-500/20">
                               {analysis.thinking.observations.map((obs, i) => (
                                 <li key={i} className="text-slate-300 pl-4 relative before:content-['>'] before:absolute before:left-0 before:text-emerald-500/50">{obs}</li>
                               ))}
                             </ul>
                           </div>

                           {/* Reasoning Steps */}
                           <div>
                             <h4 className="flex items-center gap-2 text-purple-400 font-bold mb-3 uppercase text-xs tracking-wider">
                               <Brain className="w-4 h-4" /> Reasoning Steps
                             </h4>
                             <ol className="space-y-3">
                               {analysis.thinking.reasoningSteps.map((step, i) => (
                                 <li key={i} className="flex gap-3 text-slate-300">
                                   <span className="text-purple-500/70 font-bold">{i + 1}.</span>
                                   <span>{step}</span>
                                 </li>
                               ))}
                             </ol>
                           </div>

                           {/* Priority Fixes */}
                           <div>
                             <h4 className="flex items-center gap-2 text-amber-400 font-bold mb-3 uppercase text-xs tracking-wider">
                               <Target className="w-4 h-4" /> Priority Fixes
                             </h4>
                             <div className="space-y-2">
                               {analysis.thinking.priorityFixes.map((fix, i) => (
                                 <div key={i} className="flex items-center gap-3 p-2 rounded bg-slate-900 border border-slate-800">
                                   <div className="w-4 h-4 rounded border border-amber-500/50 flex items-center justify-center">
                                     <div className="w-2 h-2 bg-amber-500 rounded-sm"></div>
                                   </div>
                                   <span className="text-slate-300">{fix}</span>
                                 </div>
                               ))}
                             </div>
                           </div>
                         </div>
                       )}
                     </div>
                   </div>
                )}
                
                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-slate-100 pb-2">Technical Deep Dive</h3>
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-4 md:p-6">
                      <div className="flex items-center gap-3 text-brand-400 font-medium mb-3">
                        <div className="p-2 bg-brand-500/10 rounded-lg"><Layout className="w-5 h-5" /></div>
                        <h4 className="text-lg text-white">Composition Analysis</h4>
                      </div>
                      <p className="text-slate-300 leading-relaxed text-sm md:text-base">
                        {analysis.critique.composition}
                      </p>
                    </div>

                    <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-4 md:p-6">
                      <div className="flex items-center gap-3 text-amber-400 font-medium mb-3">
                         <div className="p-2 bg-amber-500/10 rounded-lg"><Zap className="w-5 h-5" /></div>
                        <h4 className="text-lg text-white">Lighting Analysis</h4>
                      </div>
                      <p className="text-slate-300 leading-relaxed text-sm md:text-base">
                        {analysis.critique.lighting}
                      </p>
                    </div>

                    <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-4 md:p-6">
                      <div className="flex items-center gap-3 text-blue-400 font-medium mb-3">
                         <div className="p-2 bg-blue-500/10 rounded-lg"><Camera className="w-5 h-5" /></div>
                        <h4 className="text-lg text-white">Technical Execution</h4>
                      </div>
                      <p className="text-slate-300 leading-relaxed text-sm md:text-base">
                        {analysis.critique.technique}
                      </p>
                    </div>
                  </div>

                  {hasBoundingBoxes && (
                    <div className="pt-6">
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-slate-100 mb-2 flex items-center gap-2">
                          <Map className="w-5 h-5 text-slate-400" />
                          Detected Spatial Issues
                        </h3>
                        <div className="flex items-start gap-2 text-sm text-slate-400 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                           <MousePointerClick className="w-4 h-4 text-brand-400 mt-0.5 flex-shrink-0" />
                           <p>
                             Gemini has mapped specific feedback directly onto your photo. 
                             <strong className="text-brand-400 ml-1">Hover over the colored boxes on the left</strong> to read detailed tooltips about each issue.
                           </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {analysis.boundingBoxes!.map((box, i) => (
                           <div key={i} className={`p-4 rounded-xl border ${
                             box.severity === 'critical' ? 'border-rose-500/30 bg-rose-500/5' :
                             box.severity === 'moderate' ? 'border-amber-500/30 bg-amber-500/5' :
                             'border-sky-500/30 bg-sky-500/5'
                           }`}>
                             <div className="flex justify-between items-start mb-2">
                               <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                                 box.severity === 'critical' ? 'bg-rose-500/20 text-rose-400' :
                                 box.severity === 'moderate' ? 'bg-amber-500/20 text-amber-400' :
                                 'bg-sky-500/20 text-sky-400'
                               }`}>
                                 {box.type}
                               </span>
                             </div>
                             <p className="text-sm font-medium text-slate-200 mb-1">{box.description}</p>
                             <p className="text-xs text-slate-400 italic">Suggestion: {box.suggestion}</p>
                           </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* --- MENTOR CHAT TAB --- */}
            {activeTab === 'mentor' && (
              <div className="animate-fadeIn">
                 <MentorChatWidget 
                    imageSrc={imageSrc} 
                    analysis={analysis} 
                    chatState={mentorChatState} 
                    onStateChange={setMentorChatState}
                 />
              </div>
            )}

            {/* --- AI ENHANCEMENT TAB --- */}
            {activeTab === 'enhance' && (
              <div className="bg-slate-800 rounded-3xl p-1 border border-slate-700 overflow-hidden">
                <div className="bg-gradient-to-r from-brand-900/40 to-indigo-900/40 p-6 md:p-8 rounded-t-[22px]">
                  <div className="flex items-center gap-3 mb-2">
                    <Wand2 className="w-6 h-6 text-brand-400" />
                    <h3 className="text-xl font-bold text-white">AI Restoration Studio</h3>
                  </div>
                  <p className="text-slate-400 text-sm">
                    Use Gemini 3 Pro to visualize your photo with the suggested improvements applied.
                  </p>
                </div>

                <div className="p-4 md:p-8 space-y-6">
                  {!correctedImage && !isGenerating && (
                    <div className="flex flex-col items-center py-6">
                       <button 
                        onClick={handleGenerate}
                        className="group relative inline-flex items-center justify-center px-8 py-3 font-semibold text-white transition-all duration-200 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full hover:from-indigo-500 hover:to-purple-500 hover:shadow-lg hover:shadow-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 focus:ring-offset-slate-800"
                       >
                         <Wand2 className="w-5 h-5 mr-2 animate-pulse" />
                         ✨ Generate Ideal Version
                       </button>
                       {generationError && (
                         <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 max-w-md mx-auto text-center">
                           <p className="text-rose-400 text-sm font-medium mb-1">{generationError}</p>
                           <p className="text-slate-500 text-xs">This feature uses Gemini 3 Pro Image Generation which is a paid service.</p>
                         </div>
                       )}
                    </div>
                  )}

                  {isGenerating && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
                      <p className="text-slate-300 font-medium">Generating your improved photo with Gemini 3 Pro Image...</p>
                      <p className="text-slate-500 text-sm">Applying {analysis.improvements.length} enhancements</p>
                    </div>
                  )}

                  {correctedImage && (
                    <div className="space-y-6 animate-fadeIn">
                      {/* Comparison Container - Opacity Blend Mode */}
                      <div className="relative w-full aspect-[4/3] max-h-[500px] bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-700 select-none group">
                        {/* Background: Original */}
                        <img 
                          src={imageSrc} 
                          alt="Original" 
                          className="absolute inset-0 w-full h-full object-contain" 
                        />
                        
                        {/* Foreground: Corrected (Opacity Controlled) */}
                        <img 
                          src={correctedImage} 
                          alt="AI Corrected" 
                          className="absolute inset-0 w-full h-full object-contain transition-opacity duration-100 ease-linear"
                          style={{ opacity: sliderValue / 100 }}
                        />

                        {/* Labels */}
                        <div className={`absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white z-10 border border-white/20 transition-opacity duration-300 ${sliderValue > 90 ? 'opacity-0' : 'opacity-100'}`}>
                          Original
                        </div>
                        <div className={`absolute top-4 right-4 bg-indigo-600/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white z-10 border border-white/20 shadow-lg shadow-indigo-500/20 transition-opacity duration-300 ${sliderValue < 10 ? 'opacity-0' : 'opacity-100'}`}>
                          AI-Corrected
                        </div>

                        {/* Slider UI at Bottom */}
                        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-slate-950/90 to-transparent z-20 pointer-events-none transition-opacity duration-300 group-hover:opacity-100">
                           <div className="flex items-center justify-between mb-2">
                               <span className={`text-xs font-bold transition-colors ${sliderValue === 0 ? 'text-white' : 'text-slate-400'}`}>0%</span>
                               <span className="text-xs font-bold text-white flex items-center gap-2">
                                   <MoveHorizontal className="w-3 h-3 text-brand-400" />
                                   Blend Amount: {sliderValue}%
                               </span>
                               <span className={`text-xs font-bold transition-colors ${sliderValue === 100 ? 'text-white' : 'text-slate-400'}`}>100%</span>
                           </div>
                           
                           {/* Custom Track */}
                           <div className="h-1.5 bg-slate-700/50 rounded-full w-full overflow-hidden backdrop-blur-sm">
                               <div 
                                   className="h-full bg-gradient-to-r from-brand-500 to-indigo-500"
                                   style={{ width: `${sliderValue}%` }}
                               />
                           </div>
                        </div>

                        {/* Interaction Input */}
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={sliderValue}
                          onChange={(e) => setSliderValue(Number(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 z-30 cursor-ew-resize"
                          title="Drag horizontally to blend images"
                        />
                      </div>

                      <div className="flex justify-center">
                        <button 
                          onClick={handleDownload}
                          className="flex items-center gap-2 px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium min-h-[44px]"
                        >
                          <Download className="w-4 h-4" />
                          Download Corrected Image
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* --- ECONOMICS TAB (SCALE SIMULATOR) --- */}
            {activeTab === 'economics' && analysis.tokenUsage && (
              <div className="space-y-6">
                
                {/* Honesty Badge / Explanation */}
                <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-blue-400 font-bold text-sm">Context Caching Simulation Mode</h4>
                    <p className="text-slate-300 text-xs mt-1">
                      Gemini Context Caching requires a minimum of 32,768 tokens to activate. 
                      Since this request is smaller, we are calculating the <strong>real cost</strong> (what you paid) 
                      and the <strong>projected cost</strong> (what you <em>would</em> pay if this app were running at enterprise scale with cached principles).
                    </p>
                  </div>
                </div>
                
                {/* Visual Session Tracking */}
                {sessionHistory.length > 0 && (
                  <div className="bg-slate-900/50 border border-emerald-500/20 rounded-3xl p-4 md:p-6 backdrop-blur-sm overflow-hidden relative">
                    <div className="flex items-center gap-3 mb-6">
                      <History className="w-6 h-6 text-emerald-400" />
                      <h3 className="text-xl font-bold text-white">Projected Scale Performance</h3>
                    </div>
                    
                    <div className="h-[200px] md:h-[250px] w-full mb-8">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sessionHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorWithCache" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                          <XAxis 
                            dataKey="id" 
                            stroke="#94a3b8" 
                            tickFormatter={(value) => `#${value}`}
                          />
                          <YAxis 
                            stroke="#94a3b8" 
                            tickFormatter={(value) => `$${value.toFixed(4)}`}
                            width={70}
                          />
                          <RechartsTooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f1f5f9' }}
                            formatter={(value: number) => [`$${value.toFixed(5)}`, '']}
                            labelFormatter={(value) => `Analysis #${value}`}
                          />
                          
                          <Area 
                            type="monotone" 
                            dataKey="projectedCost" 
                            stroke="#10b981" 
                            strokeWidth={3} 
                            fillOpacity={1} 
                            fill="url(#colorWithCache)" 
                            name="Projected Cost (With Cache)"
                            animationDuration={1500}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="realCost" 
                            stroke="#f59e0b" 
                            strokeWidth={2} 
                            dot={false}
                            strokeDasharray="5 5"
                            name="Actual Cost (No Cache)"
                            animationDuration={1500}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex items-center justify-between">
                         <div>
                           <p className="text-sm text-slate-400">Projected Total Savings</p>
                           <p className="text-2xl font-bold text-emerald-400">
                             ${totalPotentialSavings.toFixed(5)}
                           </p>
                         </div>
                         <div className="p-3 bg-emerald-500/10 rounded-full">
                           <PiggyBank className="w-6 h-6 text-emerald-400" />
                         </div>
                      </div>
                      
                      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex items-center justify-between">
                         <div>
                           <p className="text-sm text-slate-400">Est. Cache Efficiency</p>
                           <p className="text-2xl font-bold text-white">
                             75%
                           </p>
                         </div>
                         <div className="p-3 bg-blue-500/10 rounded-full">
                           <Zap className="w-6 h-6 text-blue-400" />
                         </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Projected Impact Callout - Scale Simulator */}
                {sessionHistory.length >= 2 && (
                   <div className="bg-emerald-900/10 border border-emerald-500/30 rounded-2xl p-4 md:p-6 animate-fadeIn">
                     <div className="flex items-start md:items-center gap-4 flex-col md:flex-row">
                        <div className="p-3 bg-emerald-500/20 rounded-full text-emerald-400">
                          <TrendingDown className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                           <h4 className="text-lg font-bold text-emerald-100 flex items-center gap-2 mb-1">
                             📊 Scale Simulator: 1,000 Analyses
                           </h4>
                           <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                             At scale, Gemini Context Caching would reduce your costs from
                             <span className="text-amber-400/80 font-mono line-through decoration-rose-500/50 mx-1">${realAt1000.toFixed(2)}</span> 
                             to
                             <span className="text-emerald-300 font-mono font-bold mx-1">${projectedAt1000.toFixed(2)}</span> 
                             for every 1,000 photos processed.
                           </p>
                        </div>
                        <div className="text-right flex-shrink-0 self-end md:self-center">
                          <p className="text-xs text-emerald-500 font-bold uppercase tracking-wider mb-0.5">Scale Savings</p>
                          <p className="text-2xl md:text-3xl font-bold text-emerald-400">${savingsAt1000.toFixed(2)}</p>
                          <p className="text-sm text-emerald-600 font-bold">(-{savingsPercent.toFixed(1)}%)</p>
                        </div>
                     </div>
                   </div>
                )}
                
                {/* DEMO TRANSITION 2: View Architecture */}
                <div className="flex justify-center pt-4">
                   <button 
                     onClick={onShowArchitecture}
                     className="group flex items-center gap-2 px-6 py-3 bg-slate-800 border border-slate-700 text-slate-300 rounded-full hover:bg-slate-700 hover:text-white hover:border-blue-500/50 transition-all duration-300"
                   >
                     <Server className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                     View Architecture & ROI
                     <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                   </button>
                </div>

                {/* Current Analysis Details Card */}
                <div className="bg-slate-900/50 rounded-3xl border border-slate-700/50 backdrop-blur-sm relative group">
                   <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
                       <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                   </div>

                   <div className="relative p-4 md:p-6 z-10">
                     <div className="flex items-center justify-between mb-6">
                       <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                         Current Request Breakdown
                         <InfoTooltip content="This shows the actual token usage for this specific request. The 'Projected' bar below demonstrates how the distribution would look with an active context cache." />
                       </h3>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {/* Usage Stats */}
                       <div className="space-y-4">
                         <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                           <span className="text-sm text-slate-400 flex items-center">
                              Actual Cached Tokens
                              <InfoTooltip content="This will be 0 because the cache content is below the 32k token threshold." />
                           </span>
                           <span className="font-mono font-medium text-slate-500">{analysis.tokenUsage.realCachedTokens.toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                           <span className="text-sm text-slate-400 flex items-center">
                              Total Tokens
                              <InfoTooltip content="The total volume of text/image data sent to Gemini." />
                           </span>
                           <span className="font-mono font-medium text-white">{analysis.tokenUsage.totalTokens.toLocaleString()}</span>
                         </div>
                         
                         {/* Visual Token Breakdown Bar (Simulation) */}
                         <div className="mt-2">
                           <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Scale Simulation: Cache Distribution</p>
                           <div className="flex w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                             <div 
                               style={{ width: `${(analysis.tokenUsage.projectedCachedTokens / analysis.tokenUsage.totalTokens) * 100}%` }} 
                               className="bg-emerald-500 transition-all duration-700 ease-out opacity-80" 
                             />
                             <div 
                               style={{ width: `${100 - ((analysis.tokenUsage.projectedCachedTokens / analysis.tokenUsage.totalTokens) * 100)}%` }} 
                               className="bg-amber-500 transition-all duration-700 ease-out opacity-80" 
                             />
                           </div>
                           <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 font-mono px-0.5">
                             <span className="flex items-center gap-1.5">
                               <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                               {analysis.tokenUsage.projectedCachedTokens.toLocaleString()} projected cached
                             </span>
                             <span className="flex items-center gap-1.5">
                               <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                               Remainder (New)
                             </span>
                           </div>
                         </div>
                       </div>

                       {/* Cost Stats */}
                       <div className="space-y-4">
                         <div className="flex justify-between items-center">
                           <span className="text-sm text-slate-500 flex items-center">
                             Actual Session Cost
                             <InfoTooltip content="What you actually paid for this specific analysis." />
                           </span>
                           <span className="font-mono text-white font-bold">${analysis.tokenUsage.realCost.toFixed(5)}</span>
                         </div>
                         <div className="flex justify-between items-center">
                           <span className="text-sm text-emerald-300 flex items-center">
                             Projected Cache Cost
                             <InfoTooltip content="What you WOULD pay if this was running at scale with active caching." />
                           </span>
                           <span className="font-mono text-emerald-400 font-bold">${analysis.tokenUsage.projectedCostWithCache.toFixed(5)}</span>
                         </div>
                         
                         {analysis.tokenUsage.projectedSavings > 0 && (
                           <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                             <div className="p-1.5 bg-emerald-500/20 rounded-full">
                               <TrendingDown className="w-4 h-4 text-emerald-400" />
                             </div>
                             <div>
                               <p className="text-xs text-emerald-300 uppercase font-bold tracking-wider">Potential Savings</p>
                               <p className="text-lg font-bold text-emerald-400">
                                 ${analysis.tokenUsage.projectedSavings.toFixed(5)} 
                                 <span className="text-sm font-normal text-emerald-500/80 ml-1">
                                   ({((analysis.tokenUsage.projectedSavings / analysis.tokenUsage.realCost) * 100).toFixed(1)}%)
                                 </span>
                               </p>
                             </div>
                           </div>
                         )}
                       </div>
                     </div>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResults;
