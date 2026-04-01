
import React, { useState, useEffect } from 'react';
import { Camera, Brain, Zap, Box, Lock, ScanEye, Code, Server, Database, ChevronRight, ChevronLeft, Sparkles, Coins, Atom, PlayCircle, MessageCircle, Wand2, ArrowRight, Target, Layout } from 'lucide-react';

interface PresentationSlidesProps {
  onExit: () => void;
  initialSlide?: number;
}

export const PresentationSlides = ({ onExit, initialSlide = 1 }: PresentationSlidesProps) => {
  const [currentSlide, setCurrentSlide] = useState(initialSlide);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Space') setCurrentSlide(prev => Math.min(prev + 1, 3));
      if (e.key === 'ArrowLeft') setCurrentSlide(prev => Math.max(prev - 1, 1));
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 text-white font-sans overflow-hidden">
      
      {/* Slide 1: The Hero (Vibe Coding) */}
      {currentSlide === 1 && (
        <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden animate-fadeIn">
          {/* Background FX */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse-slow"></div>
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[100px]"></div>
          
          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center space-y-10 w-full max-w-6xl px-4">
            
            <div className="space-y-4">
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-slate-500">
                AI Photography Coach
              </h1>
              <p className="text-xl text-slate-400 font-light tracking-wide">
                Beyond filters. <span className="text-emerald-400 font-semibold">Intelligent mentorship</span> for every shot.
              </p>
            </div>

            {/* UI Mockup Container - The "Context" Visual */}
            <div className="relative w-full max-w-4xl h-[400px] md:h-[450px] perspective-[2000px] group">
               {/* The Floating Glass Interface */}
               <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] transform rotate-x-12 transition-transform duration-700 ease-out group-hover:rotate-x-0 group-hover:scale-[1.02] flex flex-col overflow-hidden ring-1 ring-white/10">
                  
                  {/* Mock Window Header */}
                  <div className="h-10 border-b border-slate-700/50 bg-slate-900/50 flex items-center px-4 gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500/20 border border-rose-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/50"></div>
                    <div className="ml-4 h-4 w-64 bg-slate-800 rounded-full flex items-center px-2">
                       <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse mr-2"></div>
                       <span className="text-[8px] text-slate-400 font-mono">gemini-3-pro-vision-analysis...</span>
                    </div>
                  </div>

                  {/* Mock Content Body */}
                  <div className="flex-1 flex p-4 gap-4">
                     {/* Left: Image with Spatial Overlays */}
                     <div className="w-2/3 h-full bg-black rounded-xl relative overflow-hidden border border-slate-800 group-hover:border-emerald-500/30 transition-colors">
                        <img 
                          src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity duration-700"
                          alt="Camera View" 
                        />
                        
                        {/* Spatial Bounding Box 1 */}
                        <div className="absolute top-[20%] left-[25%] w-[30%] h-[40%] border-2 border-emerald-400/70 rounded-lg shadow-[0_0_15px_rgba(52,211,153,0.3)] animate-pulse-slow">
                           <div className="absolute -top-6 left-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                             <ScanEye className="w-3 h-3" /> Focus Point
                           </div>
                        </div>

                        {/* Spatial Bounding Box 2 */}
                        <div className="absolute bottom-[10%] right-[10%] w-[25%] h-[25%] border-2 border-amber-400/70 border-dashed rounded-lg">
                           <div className="absolute -top-6 right-0 bg-amber-500 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                             <Zap className="w-3 h-3" /> Lighting
                           </div>
                        </div>

                        {/* Grid Overlay (Subtle) */}
                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                           <div className="border-r border-slate-500/50"></div>
                           <div className="border-r border-slate-500/50"></div>
                           <div className=""></div>
                           <div className="border-r border-t border-slate-500/50"></div>
                           <div className="border-r border-t border-slate-500/50"></div>
                           <div className="border-t border-slate-500/50"></div>
                           <div className="border-r border-t border-slate-500/50"></div>
                           <div className="border-r border-t border-slate-500/50"></div>
                           <div className="border-t border-slate-500/50"></div>
                        </div>
                     </div>

                     {/* Right: Analysis Panel */}
                     <div className="w-1/3 flex flex-col gap-3">
                        {/* Score Card */}
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                           <div className="flex justify-between items-center mb-2">
                              <span className="text-xs text-slate-400 font-bold uppercase">Composition</span>
                              <span className="text-sm text-emerald-400 font-bold">8.5/10</span>
                           </div>
                           <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                              <div className="h-full w-[85%] bg-emerald-500"></div>
                           </div>
                        </div>

                        {/* Thinking Process */}
                        <div className="flex-1 bg-slate-800/30 p-3 rounded-xl border border-slate-700/50 relative overflow-hidden">
                           <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
                             <Brain className="w-3 h-3 text-purple-400" />
                             <span className="text-[10px] font-mono text-purple-300">Thinking Process</span>
                           </div>
                           <div className="space-y-2">
                              <div className="flex gap-2">
                                <div className="w-1 h-1 bg-purple-500 rounded-full mt-1.5"></div>
                                <div className="h-2 w-3/4 bg-slate-700/50 rounded animate-pulse"></div>
                              </div>
                              <div className="flex gap-2">
                                <div className="w-1 h-1 bg-purple-500 rounded-full mt-1.5"></div>
                                <div className="h-2 w-1/2 bg-slate-700/50 rounded animate-pulse delay-75"></div>
                              </div>
                              <div className="flex gap-2">
                                <div className="w-1 h-1 bg-purple-500 rounded-full mt-1.5"></div>
                                <div className="h-2 w-5/6 bg-slate-700/50 rounded animate-pulse delay-150"></div>
                              </div>
                           </div>
                           
                           {/* Chat Bubble Overlay */}
                           <div className="absolute bottom-3 right-3 bg-indigo-500 text-white text-[10px] p-2 rounded-lg rounded-br-none shadow-lg animate-bounce-slow">
                              Try increasing ISO...
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
            
            {/* Tech Badges */}
            <div className="flex items-center gap-6 bg-slate-900/60 backdrop-blur-md px-6 py-3 rounded-full border border-slate-700/50 shadow-xl mt-8">
               <div className="flex items-center gap-2">
                 <Sparkles className="w-4 h-4 text-purple-400" />
                 <span className="text-sm font-bold text-slate-200">Gemini 3 Pro</span>
               </div>
               <div className="w-px h-4 bg-slate-700"></div>
               <div className="flex items-center gap-2">
                 <Code className="w-4 h-4 text-blue-400" />
                 <span className="text-sm font-bold text-slate-200">Vibe Coded</span>
               </div>
            </div>

          </div>
        </div>
      )}

      {/* Slide 2: Black Box vs Glass Box */}
      {currentSlide === 2 && (
        <div className="w-full h-full flex relative animate-fadeIn">
          {/* Left: Black Box (Old Way) */}
          <div className="w-1/2 h-full bg-slate-950 flex flex-col items-center justify-center border-r border-slate-800 relative overflow-hidden group">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/noise.png')] opacity-20 mix-blend-overlay"></div>
            <div className="relative z-10 opacity-50 grayscale group-hover:grayscale-0 transition-all duration-700">
               <div className="w-48 h-48 bg-slate-900 rounded-3xl border border-slate-800 flex items-center justify-center mb-8 mx-auto shadow-inner">
                  <Box className="w-24 h-24 text-slate-600" />
                  <Lock className="w-10 h-10 text-slate-700 absolute" />
               </div>
               <h2 className="text-5xl font-bold text-slate-500 mb-4 text-center">Generic AI</h2>
               <p className="text-2xl text-slate-600 text-center font-mono">"Black Box"</p>
               <ul className="mt-8 space-y-4 text-xl text-slate-600">
                 <li className="flex items-center gap-3"><span className="text-rose-900">✕</span> Opaque Feedback</li>
                 <li className="flex items-center gap-3"><span className="text-rose-900">✕</span> No Reasoning</li>
                 <li className="flex items-center gap-3"><span className="text-rose-900">✕</span> Guesswork</li>
               </ul>
            </div>
          </div>

          {/* Right: Glass Box (Our Way) */}
          <div className="w-1/2 h-full bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden">
             {/* Tech Grid Background */}
             <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.03) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
             <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[100px]"></div>

             <div className="relative z-10 transform scale-100 transition-transform duration-700 flex flex-col items-center">
               <div className="w-40 h-40 bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-emerald-500/50 flex items-center justify-center mb-6 mx-auto shadow-[0_0_50px_rgba(16,185,129,0.2)] relative">
                  <ScanEye className="w-20 h-20 text-emerald-400" />
                  {/* Floating Code Bits */}
                  <div className="absolute -right-12 top-0 bg-slate-800 p-2 rounded border border-slate-700 text-xs font-mono text-emerald-400 opacity-80">
                    {"{ thinking }"}
                  </div>
                  <div className="absolute -left-12 bottom-0 bg-slate-800 p-2 rounded border border-slate-700 text-xs font-mono text-indigo-400 opacity-80">
                    {"[ spatial ]"}
                  </div>
               </div>
               <h2 className="text-4xl font-bold text-white mb-2 text-center">Gemini 3 Pro</h2>
               <p className="text-xl text-emerald-400 text-center font-mono font-bold mb-8">"Glass Box" Mentorship</p>
               
               <div className="grid grid-cols-2 gap-x-8 gap-y-6 text-lg text-slate-300">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-emerald-500/10 rounded-lg"><Zap className="w-5 h-5 text-emerald-500" /></div>
                   Spatial Critique
                 </div>
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-purple-500/10 rounded-lg"><Brain className="w-5 h-5 text-purple-500" /></div>
                   Transparent Logic
                 </div>
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-blue-500/10 rounded-lg"><MessageCircle className="w-5 h-5 text-blue-500" /></div>
                   Mentor Chat
                 </div>
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-amber-500/10 rounded-lg"><Wand2 className="w-5 h-5 text-amber-500" /></div>
                   AI Restoration
                 </div>
               </div>

               {/* Launch Demo Button - DEMO TRANSITION 1 */}
               <button 
                 onClick={onExit}
                 className="mt-12 group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-500 to-indigo-600 text-white rounded-full font-bold text-xl shadow-2xl hover:scale-105 hover:shadow-brand-500/50 transition-all duration-300"
               >
                 <PlayCircle className="w-6 h-6 fill-white text-emerald-600" />
                 Launch Live Demo
                 <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Slide 3: Cloud Architecture & Economics */}
      {currentSlide === 3 && (
        <div className="w-full h-full flex flex-col items-center justify-center relative bg-slate-950 animate-fadeIn">
          {/* Blueprint Grid */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-16 relative z-10 flex items-center gap-4">
            <Server className="w-12 h-12 text-blue-400" />
            Architecture & ROI
          </h2>

          <div className="flex items-center justify-center gap-6 md:gap-12 w-full max-w-7xl relative z-10 px-4">
            
            {/* Node 1: Client */}
            <div className="flex flex-col items-center gap-6 group">
               <div className="w-36 h-36 rounded-2xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden group-hover:border-blue-500/50 transition-colors">
                 <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <Atom className="w-14 h-14 text-blue-400 mb-2 animate-spin-slow" style={{ animationDuration: '10s' }} />
                 <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">Client</span>
               </div>
               <div className="text-center">
                 <span className="text-xl font-bold text-white block">React 19</span>
                 <span className="text-sm text-slate-400">Vite / TypeScript</span>
               </div>
            </div>

            {/* Connection: REST API */}
            <div className="flex flex-col items-center gap-2">
              <div className="h-px w-16 md:w-24 bg-gradient-to-r from-slate-700 via-blue-500 to-slate-700 relative">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6] animate-pulse"></div>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase">REST API</span>
            </div>

            {/* Node 2: Gemini */}
            <div className="flex flex-col items-center gap-6">
               <div className="w-44 h-44 rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-indigo-500/50 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.15)] relative z-10">
                 <div className="absolute inset-0 bg-indigo-500/10 rounded-[2.5rem] animate-pulse-slow"></div>
                 <Brain className="w-16 h-16 text-indigo-400 mb-3" />
                 <span className="text-xs font-mono text-indigo-300 uppercase tracking-widest">Model</span>
               </div>
               <div className="text-center">
                 <span className="text-2xl font-bold text-white block">Gemini 3 Pro</span>
                 <span className="text-sm text-indigo-300">Multimodal Vision</span>
               </div>
            </div>

             {/* Connection: Caching */}
            <div className="flex flex-col items-center gap-2">
              <div className="h-px w-16 md:w-24 bg-gradient-to-r from-slate-700 via-emerald-500 to-slate-700 relative">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981] animate-pulse delay-75"></div>
              </div>
              <span className="text-[10px] font-mono text-slate-500 uppercase">Cache Hit</span>
            </div>

            {/* Node 3: Cache */}
            <div className="flex flex-col items-center gap-6 group">
               <div className="w-36 h-36 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden group-hover:bg-emerald-900/40 transition-colors">
                 <Database className="w-12 h-12 text-emerald-400 mb-2" />
                 <span className="text-xs font-mono text-emerald-600 uppercase tracking-widest">Context</span>
               </div>
               <div className="text-center">
                 <span className="text-xl font-bold text-emerald-400 block">Smart Cache</span>
                 <span className="text-sm text-emerald-600/80">System Prompts</span>
               </div>
            </div>
          </div>

          {/* Economics Stats */}
          <div className="mt-12 flex flex-col items-center space-y-4">
            <div className="bg-slate-900/90 border border-slate-700 p-8 rounded-3xl flex items-center gap-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-3 bg-slate-800 rounded-bl-2xl border-l border-b border-slate-700">
                  <span className="text-[10px] font-mono text-slate-400">SCALE SIMULATOR</span>
               </div>
               
               <div className="p-5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                 <Coins className="w-12 h-12 text-emerald-400" />
               </div>
               <div className="text-left">
                 <h3 className="text-5xl font-bold text-white mb-2 tracking-tight">~95% Savings</h3>
                 <p className="text-slate-400 text-lg max-w-md leading-relaxed">
                   Projected efficiency for high-volume enterprise workloads utilizing <span className="text-emerald-400 font-semibold">Context Caching</span> (&gt;32k tokens).
                 </p>
               </div>
            </div>
          </div>
          
          {/* Roadmap / CTA Footer */}
          <div className="mt-12 w-full max-w-4xl flex justify-between items-center gap-6 relative z-10 px-4 animate-fadeIn">
             <div className="text-left">
                <h4 className="text-slate-500 font-mono uppercase text-[10px] tracking-widest mb-3">Roadmap & Future</h4>
                <div className="flex gap-4">
                   <span className="px-3 py-1.5 bg-slate-900 rounded-lg text-slate-300 text-xs border border-slate-700 flex items-center gap-2">
                     <PlayCircle className="w-3 h-3 text-brand-400" />
                     Live Video Analysis
                   </span>
                   <span className="px-3 py-1.5 bg-slate-900 rounded-lg text-slate-300 text-xs border border-slate-700 flex items-center gap-2">
                     <ScanEye className="w-3 h-3 text-purple-400" />
                     AR Guidelines
                   </span>
                </div>
             </div>
             
             <div className="h-px flex-1 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800"></div>
             
             <button 
                onClick={onExit}
                className="flex items-center gap-3 px-6 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-full hover:bg-emerald-500/20 transition-all group"
             >
                <span className="text-emerald-400 font-bold">Try the Live Demo</span>
                <ArrowRight className="w-5 h-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
             </button>
          </div>
          
           <div className="absolute bottom-6 text-slate-600 font-mono text-xs">
            Press ESC to exit presentation
          </div>
        </div>
      )}

      {/* Navigation Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-20">
        {[1, 2, 3].map(i => (
          <button 
            key={i}
            onClick={() => setCurrentSlide(i)}
            className={`w-3 h-3 rounded-full transition-all ${currentSlide === i ? 'bg-white w-8' : 'bg-slate-700'}`}
          />
        ))}
      </div>
      
      {/* Corner Controls */}
      <div className="absolute bottom-8 right-8 flex gap-2 z-20">
         <button onClick={() => setCurrentSlide(Math.max(1, currentSlide - 1))} className="p-2 hover:bg-slate-800 rounded-full text-slate-400"><ChevronLeft /></button>
         <button onClick={() => setCurrentSlide(Math.min(3, currentSlide + 1))} className="p-2 hover:bg-slate-800 rounded-full text-slate-400"><ChevronRight /></button>
      </div>
    </div>
  );
};
