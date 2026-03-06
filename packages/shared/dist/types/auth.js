"use strict";
// ─── Authentication & Authorization Types ────────────────────────────
// Types for user identity, sessions, RBAC permissions, and JWT payloads.
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionAction = exports.MFAMethod = exports.UserStatus = exports.UserRole = void 0;
/** Platform-wide user role. */
var UserRole;
(function (UserRole) {
    UserRole["PATIENT"] = "PATIENT";
    UserRole["CLINICIAN"] = "CLINICIAN";
    UserRole["SUPERVISOR"] = "SUPERVISOR";
    UserRole["ADMIN"] = "ADMIN";
    UserRole["COMPLIANCE_OFFICER"] = "COMPLIANCE_OFFICER";
})(UserRole || (exports.UserRole = UserRole = {}));
/** Account lifecycle status. */
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "ACTIVE";
    UserStatus["SUSPENDED"] = "SUSPENDED";
    UserStatus["DEACTIVATED"] = "DEACTIVATED";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
/** Supported MFA methods. */
var MFAMethod;
(function (MFAMethod) {
    MFAMethod["TOTP"] = "TOTP";
    MFAMethod["SMS"] = "SMS";
    MFAMethod["FIDO2"] = "FIDO2";
})(MFAMethod || (exports.MFAMethod = MFAMethod = {}));
/** Permission action verbs. */
var PermissionAction;
(function (PermissionAction) {
    PermissionAction["READ"] = "READ";
    PermissionAction["WRITE"] = "WRITE";
    PermissionAction["DELETE"] = "DELETE";
    PermissionAction["EXPORT"] = "EXPORT";
    PermissionAction["ADMIN"] = "ADMIN";
})(PermissionAction || (exports.PermissionAction = PermissionAction = {}));
//# sourceMappingURL=auth.js.map