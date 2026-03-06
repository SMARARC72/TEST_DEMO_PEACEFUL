"use strict";
// ─── Clinician-Domain Types ──────────────────────────────────────────
// Types used by the clinician dashboard, triage queue, and documentation flows.
Object.defineProperty(exports, "__esModule", { value: true });
exports.EscalationStatus = exports.EscalationTier = exports.AdherenceStatus = exports.ScoreTrend = exports.MBCInstrument = exports.PlanStatus = exports.ProposalStatus = exports.DraftStatus = exports.DraftFormat = exports.TriageStatus = exports.ClinicianRole = void 0;
/** Clinician platform role. */
var ClinicianRole;
(function (ClinicianRole) {
    ClinicianRole["CLINICIAN"] = "CLINICIAN";
    ClinicianRole["SUPERVISOR"] = "SUPERVISOR";
    ClinicianRole["ADMIN"] = "ADMIN";
})(ClinicianRole || (exports.ClinicianRole = ClinicianRole = {}));
/** Triage queue item status. */
var TriageStatus;
(function (TriageStatus) {
    TriageStatus["ACK"] = "ACK";
    TriageStatus["IN_REVIEW"] = "IN_REVIEW";
    TriageStatus["ESCALATED"] = "ESCALATED";
    TriageStatus["RESOLVED"] = "RESOLVED";
})(TriageStatus || (exports.TriageStatus = TriageStatus = {}));
/** AI-generated draft document format. */
var DraftFormat;
(function (DraftFormat) {
    DraftFormat["SOAP"] = "SOAP";
    DraftFormat["NARRATIVE"] = "NARRATIVE";
    DraftFormat["STRUCTURED"] = "STRUCTURED";
})(DraftFormat || (exports.DraftFormat = DraftFormat = {}));
/** Review lifecycle for AI drafts. */
var DraftStatus;
(function (DraftStatus) {
    DraftStatus["DRAFT"] = "DRAFT";
    DraftStatus["REVIEWED"] = "REVIEWED";
    DraftStatus["APPROVED"] = "APPROVED";
    DraftStatus["REJECTED"] = "REJECTED";
    DraftStatus["ESCALATED"] = "ESCALATED";
})(DraftStatus || (exports.DraftStatus = DraftStatus = {}));
/** Memory proposal review status. */
var ProposalStatus;
(function (ProposalStatus) {
    ProposalStatus["PROPOSED"] = "PROPOSED";
    ProposalStatus["APPROVED"] = "APPROVED";
    ProposalStatus["REJECTED"] = "REJECTED";
    ProposalStatus["CONFLICT_FLAGGED"] = "CONFLICT_FLAGGED";
})(ProposalStatus || (exports.ProposalStatus = ProposalStatus = {}));
/** Treatment plan lifecycle status. */
var PlanStatus;
(function (PlanStatus) {
    PlanStatus["DRAFT"] = "DRAFT";
    PlanStatus["REVIEWED"] = "REVIEWED";
    PlanStatus["HOLD"] = "HOLD";
    PlanStatus["ACTIVE"] = "ACTIVE";
})(PlanStatus || (exports.PlanStatus = PlanStatus = {}));
/** MBC instrument types. */
var MBCInstrument;
(function (MBCInstrument) {
    MBCInstrument["PHQ9"] = "PHQ9";
    MBCInstrument["GAD7"] = "GAD7";
})(MBCInstrument || (exports.MBCInstrument = MBCInstrument = {}));
/** Score trend direction. */
var ScoreTrend;
(function (ScoreTrend) {
    ScoreTrend["UP"] = "UP";
    ScoreTrend["DOWN"] = "DOWN";
    ScoreTrend["STABLE"] = "STABLE";
})(ScoreTrend || (exports.ScoreTrend = ScoreTrend = {}));
/** Adherence tracking status. */
var AdherenceStatus;
(function (AdherenceStatus) {
    AdherenceStatus["ON_TRACK"] = "ON_TRACK";
    AdherenceStatus["PARTIAL"] = "PARTIAL";
    AdherenceStatus["AT_RISK"] = "AT_RISK";
})(AdherenceStatus || (exports.AdherenceStatus = AdherenceStatus = {}));
/** Escalation severity tier. */
var EscalationTier;
(function (EscalationTier) {
    EscalationTier["T2"] = "T2";
    EscalationTier["T3"] = "T3";
})(EscalationTier || (exports.EscalationTier = EscalationTier = {}));
/** Escalation resolution status. */
var EscalationStatus;
(function (EscalationStatus) {
    EscalationStatus["OPEN"] = "OPEN";
    EscalationStatus["ACK"] = "ACK";
    EscalationStatus["RESOLVED"] = "RESOLVED";
})(EscalationStatus || (exports.EscalationStatus = EscalationStatus = {}));
//# sourceMappingURL=clinician.js.map