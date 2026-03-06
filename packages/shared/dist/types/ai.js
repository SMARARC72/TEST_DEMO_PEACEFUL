"use strict";
// ─── AI / ML Pipeline Types ──────────────────────────────────────────
// Types governing AI request/response contracts, chat sessions, and agent tasks.
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentTaskStatus = exports.AgentTaskType = exports.ChatRole = exports.AIRequestType = void 0;
/** Supported AI task types. */
var AIRequestType;
(function (AIRequestType) {
    AIRequestType["SUMMARIZE"] = "SUMMARIZE";
    AIRequestType["CHAT"] = "CHAT";
    AIRequestType["RISK_ASSESS"] = "RISK_ASSESS";
    AIRequestType["SESSION_PREP"] = "SESSION_PREP";
    AIRequestType["MEMORY_EXTRACT"] = "MEMORY_EXTRACT";
    AIRequestType["SDOH_ANALYZE"] = "SDOH_ANALYZE";
})(AIRequestType || (exports.AIRequestType = AIRequestType = {}));
/** Chat message role (standard LLM roles). */
var ChatRole;
(function (ChatRole) {
    ChatRole["USER"] = "USER";
    ChatRole["ASSISTANT"] = "ASSISTANT";
    ChatRole["SYSTEM"] = "SYSTEM";
})(ChatRole || (exports.ChatRole = ChatRole = {}));
/** Autonomous agent task type. */
var AgentTaskType;
(function (AgentTaskType) {
    AgentTaskType["TRIAGE"] = "TRIAGE";
    AgentTaskType["DOCUMENTATION"] = "DOCUMENTATION";
    AgentTaskType["POPULATION_HEALTH"] = "POPULATION_HEALTH";
    AgentTaskType["COMPLIANCE"] = "COMPLIANCE";
})(AgentTaskType || (exports.AgentTaskType = AgentTaskType = {}));
/** Agent task lifecycle status. */
var AgentTaskStatus;
(function (AgentTaskStatus) {
    AgentTaskStatus["QUEUED"] = "QUEUED";
    AgentTaskStatus["RUNNING"] = "RUNNING";
    AgentTaskStatus["COMPLETED"] = "COMPLETED";
    AgentTaskStatus["FAILED"] = "FAILED";
})(AgentTaskStatus || (exports.AgentTaskStatus = AgentTaskStatus = {}));
//# sourceMappingURL=ai.js.map