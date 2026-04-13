import React, { useCallback, useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Loader2, ScanLine, Aperture, ArrowUp, Brain, Zap, Target, Eye, Sparkles, AlertTriangle, X } from 'lucide-react';

interface PhotoUploaderProps {
  onImageSelected: (base64: string, mimeType: string) => void;
  isAnalyzing: boolean;
}

// ── Image validation constants ──────────────────────────────────────
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MAX_PIXEL_DIM = 7680; // 8K resolution upper bound
const MIN_PIXEL_DIM = 50;   // reject trivially small images
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
];
const ALLOWED_EXTENSIONS_LABEL = 'JPG、PNG、WEBP、GIF、BMP';

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const THINKING_STEPS = [
  { text: "正在分析构图和取景...", icon: Brain },
  { text: "正在分析光线条件...", icon: Zap },
  { text: "正在识别技术问题...", icon: Target },
  { text: "正在评估主体表现...", icon: Eye },
  { text: "正在生成建议...", icon: Sparkles },
];

const PhotoUploader: React.FC<PhotoUploaderProps> = ({ onImageSelected, isAnalyzing }) => {
  const [dragActive, setDragActive] = useState(false);
  const [currentThinkingStep, setCurrentThinkingStep] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Auto-dismiss validation error after 8 seconds
  useEffect(() => {
    if (validationError) {
      const timer = setTimeout(() => setValidationError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [validationError]);

  // Simulated thinking process timer
  useEffect(() => {
    if (isAnalyzing) {
      setCurrentThinkingStep(0);
      const interval = setInterval(() => {
        setCurrentThinkingStep(prev => {
          if (prev < THINKING_STEPS.length - 1) {
            return prev + 1;
          }
          return prev;
        });
      }, 2000); // Advance step every 2 seconds
      return () => clearInterval(interval);
    }
  }, [isAnalyzing]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // ── Validation & processing pipeline ─────────────────────────────
  const processFile = (file: File) => {
    setValidationError(null);

    // 1) MIME type check
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setValidationError(
        `不支持的图片格式「${file.type || '未知'}」。仅支持 ${ALLOWED_EXTENSIONS_LABEL} 格式。`
      );
      return;
    }

    // 2) File size check
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setValidationError(
        `图片体积过大（${formatFileSize(file.size)}），请上传不超过 ${MAX_FILE_SIZE_MB}MB 的图片。`
      );
      return;
    }

    // 3) Zero-byte guard
    if (file.size === 0) {
      setValidationError('图片文件为空（0 字节），请重新选择。');
      return;
    }

    // 4) Read file & validate pixel dimensions via Image element
    const reader = new FileReader();
    reader.onerror = () => {
      setValidationError('图片读取失败，请检查文件是否损坏后重试。');
    };
    reader.onloadend = () => {
      const result = reader.result as string;

      // Create an off-screen Image to inspect dimensions
      const img = new window.Image();
      img.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = img;

        if (w < MIN_PIXEL_DIM || h < MIN_PIXEL_DIM) {
          setValidationError(
            `图片分辨率过低（${w}×${h}px）。宽和高均不得小于 ${MIN_PIXEL_DIM}px。`
          );
          return;
        }

        if (w > MAX_PIXEL_DIM || h > MAX_PIXEL_DIM) {
          setValidationError(
            `图片分辨率过高（${w}×${h}px）。宽和高均不得超过 ${MAX_PIXEL_DIM}px，请缩小后重试。`
          );
          return;
        }

        // All checks passed ✅
        onImageSelected(result, file.type);
      };

      img.onerror = () => {
        setValidationError('无法解析图片内容，文件可能已损坏，请重新选择。');
      };

      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full max-w-4xl mx-auto z-10 relative">

      {/* ── Validation Error Banner ─────────────────────────────── */}
      {validationError && (
        <div
          className="mb-4 flex items-start gap-3 px-5 py-4 rounded-2xl border border-rose-500/30 bg-rose-950/60 backdrop-blur-md shadow-xl shadow-rose-500/10 animate-fadeIn"
          role="alert"
        >
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-rose-200 leading-relaxed flex-1">{validationError}</p>
          <button
            onClick={() => setValidationError(null)}
            className="text-rose-400/60 hover:text-rose-300 transition-colors flex-shrink-0"
            aria-label="关闭提示"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div
        className={`relative group flex flex-col items-center justify-center w-full min-h-[320px] md:min-h-[400px] rounded-[2rem] md:rounded-[2.5rem] border-2 border-dashed transition-all duration-500 ease-out cursor-pointer overflow-hidden
          ${dragActive 
            ? 'border-brand-400 bg-brand-500/10 scale-[1.02] shadow-2xl shadow-brand-500/20' 
            : 'border-slate-700/50 bg-slate-800/30 hover:bg-slate-800/50 hover:border-brand-500/50 hover:shadow-2xl hover:shadow-brand-500/10'
          }
          ${isAnalyzing ? 'border-brand-500/20 bg-slate-900/80 cursor-default' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className={`absolute inset-0 w-full h-full opacity-0 z-20 ${isAnalyzing ? 'pointer-events-none' : 'cursor-pointer'}`}
          onChange={handleChange}
          accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
          disabled={isAnalyzing}
        />
        
        {/* Decorative background elements */}
        <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700">
           <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-500/5 via-transparent to-transparent animate-pulse-slow"></div>
        </div>

        <div className="flex flex-col items-center justify-center p-6 md:p-8 text-center relative z-10 w-full max-w-lg">
          {isAnalyzing ? (
            <div className="w-full animate-fadeIn flex flex-col items-center">
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-brand-500/20 blur-xl rounded-full animate-pulse"></div>
                <Loader2 className="w-16 h-16 text-brand-400 animate-spin relative z-10" />
              </div>
              
              <h3 className="text-xl md:text-2xl font-bold text-white mb-2">🧠 AI Vision 分析中...</h3>
              
              {/* Simulated Thinking Console */}
              <div className="w-full mt-6 bg-slate-950/80 rounded-xl border border-slate-800 p-4 font-mono text-sm text-left shadow-inner">
                <div className="space-y-3">
                  {THINKING_STEPS.map((step, index) => {
                    const isActive = index === currentThinkingStep;
                    const isPast = index < currentThinkingStep;
                    const isFuture = index > currentThinkingStep;

                    return (
                      <div 
                        key={index}
                        className={`flex items-center gap-3 transition-all duration-500 ${
                          isFuture ? 'opacity-0 translate-y-2 hidden' : 'opacity-100 translate-y-0'
                        }`}
                      >
                        <div className={`
                          p-1.5 rounded-md transition-colors duration-300
                          ${isActive ? 'bg-brand-500/20 text-brand-400' : 'bg-slate-800 text-slate-500'}
                          ${isPast ? 'text-emerald-500' : ''}
                        `}>
                          <step.icon className={`w-3.5 h-3.5 ${isActive ? 'animate-pulse' : ''}`} />
                        </div>
                        <span className={`
                          ${isActive ? 'text-brand-200' : 'text-slate-400'}
                          ${isPast ? 'text-slate-500 line-through decoration-slate-700' : ''}
                        `}>
                          {step.text}
                        </span>
                        {isActive && (
                          <span className="flex h-2 w-2 relative ml-auto">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
            </div>
          ) : (
            <>
              <div className="mb-6 md:mb-8 relative group-hover:scale-110 transition-transform duration-500">
                <div className="absolute inset-0 bg-brand-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="w-20 h-20 md:w-24 md:h-24 bg-slate-900/80 rounded-full border border-slate-700 flex items-center justify-center shadow-xl backdrop-blur-sm group-hover:border-brand-500/50 transition-colors duration-300">
                   <Upload className="w-8 h-8 md:w-10 md:h-10 text-slate-300 group-hover:text-brand-400 transition-colors duration-300" />
                </div>
                {/* Floating icons */}
                <Aperture className="absolute -top-2 -right-2 w-6 h-6 md:w-8 md:h-8 text-slate-600 group-hover:text-brand-300/50 transition-colors duration-500 animate-bounce-slow delay-100" />
                <ImageIcon className="absolute -bottom-2 -left-2 w-6 h-6 md:w-8 md:h-8 text-slate-600 group-hover:text-indigo-300/50 transition-colors duration-500 animate-bounce-slow delay-300" />
              </div>

              <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">
                上传照片即可获得 <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-emerald-300">秒级专业反馈</span>
              </h3>
              <p className="text-base md:text-lg text-slate-400 max-w-md mb-8 leading-relaxed">
                拖放图片到这里，或点击浏览选择。
                <br />
                <span className="text-sm text-slate-500 mt-2 block">支持 {ALLOWED_EXTENSIONS_LABEL}（最大 {MAX_FILE_SIZE_MB}MB，分辨率 {MIN_PIXEL_DIM}–{MAX_PIXEL_DIM}px）</span>
              </p>
              
              <div className="px-6 py-3 md:px-8 md:py-3.5 bg-slate-700/50 rounded-full text-slate-200 text-sm font-semibold border border-slate-600 group-hover:bg-brand-600 group-hover:text-white group-hover:border-brand-500 transition-all duration-300 shadow-lg flex items-center gap-2">
                <ArrowUp className="w-4 h-4" />
                开始分析
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhotoUploader;