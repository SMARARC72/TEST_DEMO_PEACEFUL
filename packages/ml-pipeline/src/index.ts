/**
 * @peacefull/ml-pipeline
 *
 * Core AI/LLM integration package for Peacefull.ai.
 * Uses Claude (Anthropic) as the primary LLM for all clinical decision
 * support features.
 *
 * All AI outputs are DRAFTS requiring clinician review (CSP-002).
 * AI never diagnoses, prescribes, or acts autonomously (CSP-001).
 */

// ── Agents ──────────────────────────────────────────────────────────────────

export {
  triageSubmission,
  type TriageInput,
  type TriageResult,
  type SignalBand,
} from './agents/triage.js';

export {
  summarizeSubmission,
  type SummarizationInput,
  type SummarizationResult,
} from './agents/summarizer.js';

export {
  chatCompanionTurn,
  chatCompanionStream,
  type ChatInput,
  type ChatResult,
  type ChatMessage,
  type PatientMemoryItem,
} from './agents/chat.js';

export {
  extractMemories,
  type MemoryExtractionInput,
  type MemoryExtractionResult,
  type MemoryProposal,
  type MemoryCategory,
} from './agents/memory-extractor.js';

export {
  generateSessionPrep,
  type SessionPrepInput,
  type SessionPrepResult,
  type GoalProgress,
  type GoalStatus,
} from './agents/session-prep.js';

export {
  analyzeSDOH,
  type SDOHAnalysisInput,
  type SDOHAnalysisResult,
  type SDOHDomains,
  type SDOHDomainAssessment,
  type OverallRisk,
} from './agents/sdoh-analyzer.js';

export {
  generateSOAPNote,
  type DocumentationInput,
  type DocumentationResult,
  type SOAPNote,
} from './agents/documentation.js';

// ── Processors ──────────────────────────────────────────────────────────────

export {
  processVoiceMemo,
  validateAudioFormat,
  estimateProcessingTime,
  type VoiceProcessingInput,
  type VoiceProcessingResult,
  type AudioFormat,
} from './processors/voice.js';

export {
  filterOutput,
  type SafetyFilterResult,
  type SafetyViolation,
  type SafetyWarning,
  type OutputSurface,
  type FilterOptions,
} from './processors/safety-filter.js';

// ── Prompts ─────────────────────────────────────────────────────────────────

export {
  SAFETY_PREAMBLE,
  SUMMARIZATION_PROMPT,
  CHAT_COMPANION_PROMPT,
  RISK_ASSESSMENT_PROMPT,
  MEMORY_EXTRACTION_PROMPT,
  SESSION_PREP_PROMPT,
  SDOH_ANALYSIS_PROMPT,
  SOAP_NOTE_PROMPT,
} from './prompts/system.js';
