// ─── AI / ML Pipeline Types ──────────────────────────────────────────
// Types governing AI request/response contracts, chat sessions, and agent tasks.

import { SignalBand } from './patient';

/** Supported AI task types. */
export enum AIRequestType {
  SUMMARIZE = 'SUMMARIZE',
  CHAT = 'CHAT',
  RISK_ASSESS = 'RISK_ASSESS',
  SESSION_PREP = 'SESSION_PREP',
  MEMORY_EXTRACT = 'MEMORY_EXTRACT',
  SDOH_ANALYZE = 'SDOH_ANALYZE',
}

/** Chat message role (standard LLM roles). */
export enum ChatRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}

/** Autonomous agent task type. */
export enum AgentTaskType {
  TRIAGE = 'TRIAGE',
  DOCUMENTATION = 'DOCUMENTATION',
  POPULATION_HEALTH = 'POPULATION_HEALTH',
  COMPLIANCE = 'COMPLIANCE',
}

/** Agent task lifecycle status. */
export enum AgentTaskStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

// ─── Core Interfaces ─────────────────────────────────────────────────

/**
 * Structured request sent to the AI service layer.
 * All requests are scoped to a patient and tenant for access control.
 */
export interface AIRequest {
  type: AIRequestType;
  patientId: string;
  tenantId: string;
  input: {
    content: string;
    context?: Record<string, unknown>;
  };
  options?: {
    maxTokens?: number;
    temperature?: number;
  };
}

/**
 * Structured response from the AI service layer,
 * including token usage and latency metadata.
 */
export interface AIResponse {
  id: string;
  requestId: string;
  type: AIRequestType;
  output: {
    content: string;
    structured?: Record<string, unknown>;
    signalBand?: SignalBand;
    confidence?: number;
  };
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
  };
  metadata: {
    latency: number;
    cached: boolean;
  };
  createdAt: string;
}

/** A single message in a patient-facing chat session. */
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  memoryRef?: string;
  timestamp: string;
}

/**
 * A background agent task (triage, documentation, etc.) executed
 * asynchronously by the ML pipeline.
 */
export interface AgentTask {
  id: string;
  type: AgentTaskType;
  status: AgentTaskStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
}
