# Incident Response & Breach Notification Runbook — Peacefull Platform

**Document Version:** 1.0  
**Effective Date:** 2026-03-01  
**Review Date:** 2026-06-01 (quarterly)  
**Author:** Security Team  
**Status:** Active

---

## 1. Purpose

This runbook defines procedures for identifying, containing, investigating, and recovering from security incidents, including HIPAA breach notification requirements.

---

## 2. Incident Severity Classification

### 2.1 Severity Levels

| Severity | Code | Description | Response Time | Example |
|----------|------|-------------|---------------|---------|
| **Critical** | SEV-1 | Active PHI breach or system compromise | Immediate (< 15 min) | Unauthorized PHI access confirmed |
| **High** | SEV-2 | Potential PHI exposure or major service impact | < 1 hour | Suspicious access patterns, major outage |
| **Medium** | SEV-3 | Limited impact, no confirmed PHI exposure | < 4 hours | Failed attack attempt, minor vulnerability |
| **Low** | SEV-4 | Informational, no immediate threat | < 24 hours | Policy violation, routine security event |

### 2.2 PHI Breach Determination

A breach is presumed if PHI was accessed, acquired, used, or disclosed without authorization UNLESS:

1. PHI was encrypted and encryption key was not compromised
2. PHI was accessed by authorized workforce member acting appropriately
3. Unintentional acquisition by workforce member made in good faith
4. Inadvertent disclosure between authorized persons

---

## 3. Contact List

### 3.1 Internal Contacts

| Role | Name | Phone | Email | On-Call |
|------|------|-------|-------|---------|
| Incident Commander | TBD | TBD | security@peacefull.app | 24/7 |
| Security Lead | TBD | TBD | security@peacefull.app | 24/7 |
| Privacy Officer | TBD | TBD | privacy@peacefull.app | Business hours |
| Legal Counsel | TBD | TBD | legal@peacefull.app | Business hours |
| Executive Sponsor | TBD | TBD | exec@peacefull.app | SEV-1 only |
| Engineering Lead | TBD | TBD | eng@peacefull.app | 24/7 |

### 3.2 External Contacts

| Organization | Purpose | Contact |
|--------------|---------|---------|
| HHS OCR | HIPAA breach reporting | https://ocrportal.hhs.gov/ocr/breach/wizard_breach.jsf |
| State AG | State breach notification | Varies by state (see Appendix A) |
| Database Provider (Neon) | Infrastructure incidents | support@neon.tech |
| Hosting Provider | CDN/hosting incidents | Support portal |
| Cyber Insurance | Claims notification | Policy hotline |

---

## 4. Detection Methods

### 4.1 Automated Detection

| Source | What It Detects | Alert Target |
|--------|-----------------|--------------|
| API error rate spike | Application compromise | Ops email |
| Authentication failures | Credential attacks | Security log |
| Audit log anomalies | Unauthorized access | Security log |
| Database query patterns | Data exfiltration | Ops email |

### 4.2 Manual Detection

- User reports of unauthorized access
- Clinician reports of patient data irregularities
- Routine log review findings
- Third-party vulnerability disclosures

---

## 5. Incident Response Procedures

### 5.1 Phase 1: Detection & Triage (SEV-1: 15 min, SEV-2: 1 hr)

**Objective:** Confirm incident and assign severity

1. **Receive alert** — Via monitoring, user report, or external notification
2. **Initial assessment:**
   - What systems are affected?
   - Is PHI potentially exposed?
   - Is the incident ongoing?
3. **Assign severity** — Use classification matrix (Section 2)
4. **Notify incident commander** — Per severity level
5. **Open incident channel** — Create dedicated communication channel
6. **Log incident start time** — Record: `INCIDENT_OPENED` in audit log

### 5.2 Phase 2: Containment (SEV-1: 30 min, SEV-2: 2 hr)

**Objective:** Stop the bleeding

**Immediate containment options:**

| Action | When to Use | Command/Procedure |
|--------|-------------|-------------------|
| Revoke user session | Compromised account | Force logout via admin panel |
| Block IP range | Active attack source | Update firewall rules |
| Disable endpoint | Vulnerable endpoint | Deploy emergency patch |
| Database read-only | Data exfiltration | Enable read-only mode |
| Full service isolation | Critical compromise | Route traffic to maintenance page |

**Containment checklist:**

- [ ] Attack vector identified
- [ ] Malicious access terminated
- [ ] Affected accounts secured
- [ ] Additional exposure prevented
- [ ] Evidence preserved before changes

### 5.3 Phase 3: Investigation (SEV-1: 24 hr, SEV-2: 72 hr)

**Objective:** Understand scope and impact

**Investigation steps:**

1. **Timeline reconstruction:**
   - When did the incident begin?
   - What was the attack vector?
   - What systems were accessed?
   - What data was potentially exposed?

2. **Scope determination:**
   - How many records affected?
   - Which users impacted?
   - What PHI types involved?

3. **Evidence collection:**
   - Preserve audit logs (forensic copy)
   - Capture application logs
   - Screenshot relevant dashboards
   - Document interview findings

4. **Root cause analysis:**
   - What vulnerability was exploited?
   - How did it bypass controls?
   - Why wasn't it detected sooner?

### 5.4 Phase 4: Eradication (Concurrent with Investigation)

**Objective:** Remove threat completely

- [ ] Patch exploited vulnerability
- [ ] Remove malicious code/access
- [ ] Reset compromised credentials
- [ ] Update security configurations
- [ ] Verify threat eliminated via testing

### 5.5 Phase 5: Recovery (After Eradication)

**Objective:** Restore normal operations

1. **Staged restoration:**
   - Restore from known-good backup if needed
   - Re-enable services incrementally
   - Monitor closely for recurrence

2. **Verification:**
   - Confirm all systems functional
   - Verify data integrity
   - Test authentication flows
   - Check monitoring alerts functioning

3. **User communication:**
   - Notify affected users (see Section 6)
   - Update status page
   - Prepare FAQ for support team

### 5.6 Phase 6: Post-Incident Review (Within 7 days)

**Objective:** Learn and improve

**Post-incident report template:**

```markdown
# Incident Post-Mortem: [INC-XXXX]

## Summary
- Incident: [Brief description]
- Severity: [SEV-1/2/3/4]
- Duration: [Start time] to [End time]
- Impact: [Number] users, [Number] records

## Timeline
- [Time]: Event
- [Time]: Detection
- [Time]: Containment
- [Time]: Resolution

## Root Cause
[Description of underlying cause]

## What Went Well
- [Item]

## What Needs Improvement
- [Item]

## Action Items
| Item | Owner | Due Date | Status |
|------|-------|----------|--------|
| [Action] | [Name] | [Date] | [Status] |
```

---

## 6. HIPAA Breach Notification Requirements

### 6.1 Individual Notification

**Timeline:** Without unreasonable delay, no later than 60 days after discovery

**Required content:**
- Description of breach (what happened)
- Types of PHI involved
- Steps individuals should take
- What we're doing to investigate and mitigate
- Contact information for questions

**Methods:**
- Written notification by first-class mail
- Email if individual previously agreed
- Substitute notice if contact info insufficient (website + media)

### 6.2 HHS Notification

| Breach Size | Timeline | Method |
|-------------|----------|--------|
| 500+ individuals | Within 60 days | HHS breach portal (immediate) |
| < 500 individuals | Annual log | HHS breach portal (within 60 days of year end) |

**HHS Breach Portal:** https://ocrportal.hhs.gov/ocr/breach/wizard_breach.jsf

### 6.3 Media Notification

**When required:** If breach affects 500+ residents of a single state

**Timeline:** Without unreasonable delay, no later than 60 days

**Method:** Prominent media outlets in affected state(s)

### 6.4 Business Associate Notification

If breach occurs at BA, we must be notified within 60 days so we can fulfill our notification obligations.

---

## 7. Evidence Preservation

### 7.1 What to Preserve

- [ ] Complete audit logs for affected time period
- [ ] Application server logs
- [ ] Database query logs
- [ ] Network access logs
- [ ] Authentication attempt logs
- [ ] Any modified files (before and after)
- [ ] Screenshots of dashboards showing anomalies

### 7.2 Chain of Custody

1. Create forensic copy (read-only)
2. Calculate hash (SHA-256)
3. Store in secure location
4. Document who accessed and when
5. Retain for minimum 7 years

---

## 8. Communication Templates

### 8.1 Internal Escalation

```
SUBJECT: [SEV-X] Security Incident Detected - [Brief Description]

Severity: SEV-[1/2/3/4]
Time Detected: [YYYY-MM-DD HH:MM UTC]
Systems Affected: [List]
PHI Exposure: [Confirmed/Suspected/Unlikely]
Current Status: [Investigating/Contained/Resolved]

Incident Commander: [Name]
Communication Channel: [Link]

Next Update: [Time]
```

### 8.2 Patient Notification Letter

```
Dear [Name],

We are writing to inform you of a security incident that may have 
affected your personal health information.

WHAT HAPPENED
[Description of incident]

WHAT INFORMATION WAS INVOLVED
[List of PHI types]

WHAT WE ARE DOING
[Description of response and remediation]

WHAT YOU CAN DO
[Recommended actions]

FOR MORE INFORMATION
[Contact information]

We sincerely apologize for this incident and any concern it may cause.

Sincerely,
[Privacy Officer Name]
Peacefull Privacy Office
```

---

## 9. Training & Drills

### 9.1 Required Training

| Audience | Frequency | Topics |
|----------|-----------|--------|
| All staff | Annual | Incident recognition, reporting |
| Security team | Quarterly | Runbook review, tool proficiency |
| Leadership | Annual | Decision making, communication |

### 9.2 Tabletop Exercises

- **Frequency:** Semi-annually
- **Scenarios:** Rotate through breach types
- **Output:** Lessons learned, runbook updates

---

## 10. Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-01 | Security Team | Initial runbook |

---

## Appendix A: State AG Notification Contacts

| State | Agency | Notification Trigger |
|-------|--------|---------------------|
| California | CA AG | 500+ residents |
| New York | NY AG | Any breach of NY residents |
| Texas | TX AG | 250+ residents |
| Florida | FL AG | 500+ residents |

*Full state-by-state list maintained in secure compliance repository.*

---

## 11. Approval

☐ Security Officer: ___________________________ Date: ___________

☐ Privacy Officer: ___________________________ Date: ___________

☐ Legal Counsel: ___________________________ Date: ___________

☐ Executive Sponsor: _________________________ Date: ___________
