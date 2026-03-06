"use strict";
// ─── @peacefull/shared ───────────────────────────────────────────────
// Barrel export for all shared types, constants, and validators.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Types
__exportStar(require("./types/patient"), exports);
__exportStar(require("./types/clinician"), exports);
__exportStar(require("./types/enterprise"), exports);
__exportStar(require("./types/ai"), exports);
__exportStar(require("./types/auth"), exports);
// Constants
__exportStar(require("./constants/index"), exports);
// Validators
__exportStar(require("./validators/index"), exports);
//# sourceMappingURL=index.js.map