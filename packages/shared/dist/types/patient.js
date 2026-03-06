"use strict";
// ─── Patient-Domain Types ────────────────────────────────────────────
// Shared across API, web, and ML pipeline for all patient-facing data.
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStatus = exports.SubmissionStatus = exports.SubmissionSource = exports.SignalBand = void 0;
/** Signal severity band used in clinician reports and triage. */
var SignalBand;
(function (SignalBand) {
    SignalBand["LOW"] = "LOW";
    SignalBand["GUARDED"] = "GUARDED";
    SignalBand["MODERATE"] = "MODERATE";
    SignalBand["ELEVATED"] = "ELEVATED";
})(SignalBand || (exports.SignalBand = SignalBand = {}));
/** Source channel for a patient submission. */
var SubmissionSource;
(function (SubmissionSource) {
    SubmissionSource["JOURNAL"] = "JOURNAL";
    SubmissionSource["CHECKIN"] = "CHECKIN";
    SubmissionSource["VOICE_MEMO"] = "VOICE_MEMO";
})(SubmissionSource || (exports.SubmissionSource = SubmissionSource = {}));
/** Processing lifecycle status for a submission. */
var SubmissionStatus;
(function (SubmissionStatus) {
    SubmissionStatus["PENDING"] = "PENDING";
    SubmissionStatus["PROCESSING"] = "PROCESSING";
    SubmissionStatus["READY"] = "READY";
    SubmissionStatus["REVIEWED"] = "REVIEWED";
})(SubmissionStatus || (exports.SubmissionStatus = SubmissionStatus = {}));
/** Approval lifecycle for patient memory items. */
var MemoryStatus;
(function (MemoryStatus) {
    MemoryStatus["PROPOSED"] = "PROPOSED";
    MemoryStatus["APPROVED"] = "APPROVED";
    MemoryStatus["REJECTED"] = "REJECTED";
    MemoryStatus["CONFLICT_FLAGGED"] = "CONFLICT_FLAGGED";
})(MemoryStatus || (exports.MemoryStatus = MemoryStatus = {}));
//# sourceMappingURL=patient.js.map