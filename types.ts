// Core type definitions for the photography analysis app

// Represents a visual issue detected in the photo with spatial coordinates
export interface BoundingBox {
  type: 'composition' | 'lighting' | 'focus' | 'exposure' | 'color';
  severity: 'critical' | 'moderate' | 'minor'; // How urgent the issue is
  x: number; // Percentage from left edge (0-100)
  y: number; // Percentage from top edge (0-100)
  width: number; // Percentage of image width (0-100)
  height: number; // Percentage of image height (0-100)
  description: string; // What's wrong in this area
  suggestion: string; // How to fix it
}

// Tracks token usage and cost savings from context caching
export interface TokenUsage {
  // REAL METRICS (Honest reporting)
  realCachedTokens: number; // Actual tokens retrieved from cache (likely 0 for small prompts)
  realNewTokens: number; // Actual fresh tokens processed
  totalTokens: number; // Total tokens in request
  realCost: number; // The actual billable amount for this request

  // PROJECTED METRICS (Educational/Simulation)
  // We calculate these to show the user the power of Context Caching at scale (>32k tokens)
  projectedCachedTokens: number; // Tokens that COULD be cached (static context)
  projectedCostWithCache: number; // Theoretical cost if context was cached
  projectedSavings: number; // Theoretical savings
}

// Single data point for session history tracking
export interface SessionCostMetric {
  id: number; // Analysis number (1, 2, 3...)
  timestamp: number;
  realCost: number;      // What you actually paid
  projectedCost: number; // What you would pay with caching
  potentialSavings: number;
  cachedTokens?: number;
  newTokens?: number;
}

// Structured reasoning process from Gemini 3 Pro
export interface ThinkingProcess {
  observations: string[]; // Initial things noticed
  reasoningSteps: string[]; // How the AI evaluated the photo
  priorityFixes: string[]; // Ranked list of fixes
}

// Main analysis result from Gemini
export interface PhotoAnalysis {
  // Scoring metrics (0-100)
  scores: {
    composition: number;
    lighting: number;
    creativity: number;
    technique: number;
    subjectImpact: number;
  };
  
  // Detailed written feedback
  critique: {
    composition: string;
    lighting: string;
    technique: string;
    overall: string;
  };
  
  // What's working well
  strengths: string[];
  
  // Areas to improve
  improvements: string[];
  
  // Suggested learning path
  learningPath?: string[];
  
  // Best guess at camera settings used
  settingsEstimate: {
    focalLength: string;
    aperture: string;
    shutterSpeed: string;
    iso: string;
  };
  
  // NEW: Spatial analysis with visual overlays
  boundingBoxes?: BoundingBox[];
  
  // NEW: Token economics data
  tokenUsage?: TokenUsage;
  
  // NEW: AI's reasoning process (when thinking mode is enabled)
  thinking?: ThinkingProcess;
}

export enum AppState {
  IDLE = 'IDLE',           // Waiting for upload
  ANALYZING = 'ANALYZING', // Processing with Gemini
  MANUAL_MODE = 'MANUAL_MODE', // Manual input mode
  RESULTS = 'RESULTS',     // Showing analysis
  GENERATING = 'GENERATING', // Creating corrected image
  ERROR = 'ERROR'          // Something went wrong
}

// NEW: Mentor Chat Interfaces
export interface MentorMessage {
  role: 'user' | 'assistant';
  content: string;
  thinking?: ThinkingProcess;
  timestamp: number;
}

export interface MentorChatState {
  messages: MentorMessage[];
  isLoading: boolean;
  error?: string;
}