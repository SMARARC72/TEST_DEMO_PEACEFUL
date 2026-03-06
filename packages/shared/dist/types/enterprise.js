"use strict";
// ─── Enterprise / Multi-Tenant Types ─────────────────────────────────
// Types for tenant management, RBAC, compliance posture, and audit logging.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigStatus = exports.TenantPlan = void 0;
/** Tenant subscription plan tier. */
var TenantPlan;
(function (TenantPlan) {
    TenantPlan["PILOT"] = "PILOT";
    TenantPlan["GROWTH"] = "GROWTH";
    TenantPlan["ENTERPRISE"] = "ENTERPRISE";
})(TenantPlan || (exports.TenantPlan = TenantPlan = {}));
/** Enterprise configuration review status. */
var ConfigStatus;
(function (ConfigStatus) {
    ConfigStatus["APPROVED"] = "APPROVED";
    ConfigStatus["CONDITIONAL"] = "CONDITIONAL";
    ConfigStatus["REVIEW_REQUIRED"] = "REVIEW_REQUIRED";
})(ConfigStatus || (exports.ConfigStatus = ConfigStatus = {}));
//# sourceMappingURL=enterprise.js.map