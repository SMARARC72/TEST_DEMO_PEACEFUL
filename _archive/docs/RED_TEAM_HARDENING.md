# Red Team Hardening Pass
## Behavioral Health AI Companion Prototype

---

## Identified Risks and Mitigations

### Risk 1: Patient Route Data Leak

**Threat Level:** HIGH  
**Description:** Clinician-only content (suppression reason codes, internal confidence values, restricted notes) could accidentally be included in patient route data or components.

**Attack Vector:**
- Shared data fixtures between patient and clinician routes
- Accidental import of clinician components in patient screens
- Console logging of full data objects

**Evidence of Mitigation:**
- ✅ Separate data filtering in syntheticData.ts
- ✅ Patient routes only import patient-safe data
- ✅ No console.log of sensitive data in production
- ✅ Role-based route guards in App.tsx

**Patch Applied:**
```javascript
// Patient routes filtered - no clinician-only artifacts
const patientSafeData = {
  patients: syntheticData.patients.map(p => ({
    patient_id: p.patient_id,
    display_name: p.display_name,
    // NO: assigned_clinician_id, segment, etc.
  }))
};
```

---

### Risk 2: Suppression Not Visible

**Threat Level:** HIGH  
**Description:** Suppressed recommendations could appear as "missing" rather than explicitly "suppressed," leading clinicians to think the system failed rather than intentionally withheld output.

**Attack Vector:**
- UI doesn't explicitly show suppression state
- Reason codes hidden behind expand/collapse
- Suppression banner styled too subtly

**Evidence of Mitigation:**
- ✅ SuppressionBanner component always visible for SUPPRESSED status
- ✅ Red color scheme with warning icon
- ✅ Reason codes displayed by default (not collapsed)
- ✅ Remediation steps clearly listed

**Patch Applied:**
```javascript
function SuppressionBanner({ status, reasonCodes, remediation }) {
  if (status !== 'SUPPRESSED') return null;
  return (
    <div className="bg-status-suppressed/10 border-l-4 border-status-suppressed p-4">
      <span className="font-semibold text-status-suppressed">
        Suppressed for safety
      </span>
      {/* Reason codes always visible */}
      <ul className="list-disc list-inside">
        {reasonCodes.map(code => <li key={code}>{code}</li>)}
      </ul>
    </div>
  );
}
```

---

### Risk 3: Draft Label Hidden

**Threat Level:** HIGH  
**Description:** Draft banner could be hidden by scrolling, CSS issues, or user dismissal, leading to unreviewed content being treated as approved.

**Attack Vector:**
- Banner positioned at top of scrollable content
- Dismissible banner with X button
- Banner color too subtle

**Evidence of Mitigation:**
- ✅ DraftBanner is non-dismissible (no X button)
- ✅ Positioned above scrollable content
- ✅ Amber color with warning icon
- ✅ Text explicitly states "clinician review required"

**Patch Applied:**
```javascript
function DraftBanner({ status }) {
  if (status !== 'DRAFT') return null;
  return (
    <div className="bg-status-draft/10 border-l-4 border-status-draft p-4 mb-4">
      {/* NO dismiss button */}
      <span className="font-semibold text-status-draft">
        Draft — clinician review required
      </span>
    </div>
  );
}
```

---

### Risk 4: Export Policy Bypass

**Threat Level:** MEDIUM  
**Description:** Export could be generated without proper confirmation, especially for segmented exports requiring special handling.

**Attack Vector:**
- Client-side only validation
- Missing 428 PRECONDITION_REQUIRED enforcement
- Restricted notes accidentally included

**Evidence of Mitigation:**
- ✅ BLOCKED_POLICY state explicitly shown
- ✅ 428 error message displayed
- ✅ Manifest shows restricted_notes_included: false
- ✅ UI shows confirmation requirement

**Patch Applied:**
```javascript
{exp.status === 'BLOCKED_POLICY' && (
  <div className="bg-red-50 rounded p-2">
    <p className="text-sm text-red-700">
      {exp.blocked_reason}
    </p>
  </div>
)}
```

---

### Risk 5: Demo Mode Confusion

**Threat Level:** LOW  
**Description:** Demo toggles could be mistaken for real functionality by investors or users.

**Attack Vector:**
- Demo panel looks like production UI
- Toggle states persist and confuse
- No clear "DEMO MODE" labeling

**Evidence of Mitigation:**
- ✅ Demo panel has distinct purple styling
- ✅ "Demo Mode Controls" header clearly visible
- ✅ Panel can be minimized to floating button
- ✅ Toggle states reset on page refresh

**Patch Applied:**
```javascript
<div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-xl border border-purple-200">
  <div className="bg-purple-600 text-white px-4 py-2 rounded-t-lg">
    <span className="font-semibold text-sm">Demo Mode Controls</span>
  </div>
  {/* ... */}
</div>
```

---

### Risk 6: PHI Accidental Inclusion

**Threat Level:** CRITICAL  
**Description:** Real patient data could accidentally be added to the synthetic dataset.

**Attack Vector:**
- Developer copy-pastes real data for testing
- Synthetic names look too realistic
- Real credentials in mock data

**Evidence of Mitigation:**
- ✅ All patient names explicitly marked "(Synthetic)"
- ✅ All clinician names explicitly marked "(Synthetic)"
- ✅ Tenant name includes "(Synthetic)"
- ✅ No real credentials or identifiers
- ✅ IDs use synthetic prefixes (pt_, usr_, ten_demo_)

**Patch Applied:**
```javascript
const syntheticData = {
  tenant: {
    name: "Sunrise Therapy Group (Synthetic)",
    // ...
  },
  patients: [
    { display_name: "Patient Alpha (Synthetic)", ... },
    // ...
  ]
};
```

---

### Risk 7: Clinical Claims Misrepresentation

**Threat Level:** MEDIUM  
**Description:** Demo could be presented as having clinical efficacy or diagnostic capability.

**Attack Vector:**
- Presenter says "diagnoses" or "treats"
- UI implies diagnostic output
- Claims of accuracy or effectiveness

**Evidence of Mitigation:**
- ✅ Welcome screen: "Not emergency replacement"
- ✅ Consent screen: "Not diagnosis or emergency replacement"
- ✅ Demo script includes guardrails
- ✅ All summaries marked "Draft — clinician review required"

**Patch Applied:**
- Demo script explicitly prohibits "diagnoses," "treats," "AI therapist" language
- UI consistently shows "clinician review required" for all AI output

---

### Risk 8: Accessibility Violations

**Threat Level:** LOW  
**Description:** Color-only indicators could fail for color-blind users.

**Attack Vector:**
- Tier badges use color only
- Status indicators color-dependent
- No alternative text

**Evidence of Mitigation:**
- ✅ TierBadge includes icons (● ▲ ◆ ■) not just color
- ✅ All badges include text labels
- ✅ Icons accompany color indicators

**Patch Applied:**
```javascript
function TierBadge({ tier }) {
  const icons = { T0: '●', T1: '▲', T2: '◆', T3: '■' };
  return (
    <span className={`... ${colors[tier]}`}>
      <span className="mr-1">{icons[tier]}</span>
      {tier}
    </span>
  );
}
```

---

## Hardening Checklist

| Risk | Status | Mitigation Verified |
|------|--------|---------------------|
| Data leak to patient routes | ✅ PATCHED | Role-based filtering |
| Suppression not visible | ✅ PATCHED | Explicit banner always shown |
| Draft banner hidden | ✅ PATCHED | Non-dismissible, prominent |
| Export policy bypass | ✅ PATCHED | 428 error displayed |
| Demo mode confusion | ✅ PATCHED | Distinct styling, labeled |
| PHI inclusion | ✅ PATCHED | All data marked synthetic |
| Clinical claims | ✅ PATCHED | Guardrails in script |
| Accessibility | ✅ PATCHED | Icons + color |

---

## Post-Hardening Verification

Run these checks before every demo:

1. **Patient Route Check:** Navigate all patient screens, verify no suppression codes, no internal confidence, no restricted notes visible
2. **Draft Banner Check:** Open Draft summary, verify banner cannot be dismissed, text is clear
3. **Suppression Check:** Toggle to SUPPRESSED, verify reason codes visible, remediation listed
4. **Export Block Check:** Toggle to BLOCKED_POLICY, verify 428 message displayed
5. **Synthetic Data Check:** Verify all names include "(Synthetic)"
6. **Demo Mode Check:** Verify panel is clearly labeled, can be minimized

---

## Emergency Response

If a policy violation is discovered during demo:

1. **Immediately stop** the relevant demonstration
2. **Acknowledge** the issue transparently
3. **Explain** the intended behavior per Packet spec
4. **Document** the issue for post-demo fix
5. **Continue** with other demonstrations

**Never:**
- Pretend the violation is intentional
- Claim the prototype is "just a demo" to excuse violations
- Continue demonstrating the violated feature
