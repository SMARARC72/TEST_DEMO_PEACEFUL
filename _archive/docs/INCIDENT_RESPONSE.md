# Incident Response Plan — Peacefull.ai

> **Classification:** Internal — Confidential  
> **Version:** 1.0  
> **Last Updated:** March 4, 2026  
> **Owner:** Security & Compliance Team

---

## 1. Purpose

This document defines the incident response (IR) procedures for Peacefull.ai, a HIPAA-compliant mental health platform. All team members must be familiar with this plan. It covers detection, containment, eradication, recovery, and post-incident activities for security incidents and data breaches involving protected health information (PHI).

---

## 2. Scope

This plan covers:
- **Security incidents** — unauthorized access, malware, DDoS, credential compromise
- **Data breaches** — unauthorized disclosure of PHI (HIPAA §164.402 definition)
- **System outages** — unplanned downtime affecting clinical workflows
- **AI safety events** — AI generating harmful, incorrect, or biased clinical content

---

## 3. Definitions

| Term | Definition |
|------|-----------|
| **Incident** | Any event that compromises the confidentiality, integrity, or availability of Peacefull systems or data |
| **Breach** | An impermissible use or disclosure of PHI that compromises its security or privacy (per HIPAA) |
| **PHI** | Protected Health Information — any individually identifiable health information |
| **Severity Levels** | SEV-1 (Critical), SEV-2 (High), SEV-3 (Medium), SEV-4 (Low) |
| **RTO** | Recovery Time Objective — maximum acceptable downtime |
| **RPO** | Recovery Point Objective — maximum acceptable data loss window |

---

## 4. Incident Severity Levels

### SEV-1 — Critical
- Active PHI exfiltration or unauthorized access to patient data
- Complete platform outage affecting patient safety features (crisis line, safety plan)
- AI system generating clinically dangerous recommendations
- **Response time:** 15 minutes | **RTO:** 1 hour | **RPO:** 0

### SEV-2 — High
- Suspected unauthorized access to production systems
- Single-service outage affecting core clinical workflows
- Credential compromise (API keys, database credentials)
- **Response time:** 30 minutes | **RTO:** 4 hours | **RPO:** 1 hour

### SEV-3 — Medium
- Failed intrusion attempt detected by WAF/IDS
- Performance degradation affecting user experience
- Non-critical service disruption
- **Response time:** 2 hours | **RTO:** 8 hours | **RPO:** 4 hours

### SEV-4 — Low
- Vulnerability disclosure (no active exploitation)
- Policy violation by authorized user
- Minor configuration drift
- **Response time:** 24 hours | **RTO:** 48 hours | **RPO:** 24 hours

---

## 5. Incident Response Team

| Role | Responsibility | Contact |
|------|---------------|---------|
| **Incident Commander (IC)** | Coordinates response, makes decisions, communicates status | On-call rotation |
| **Security Lead** | Technical investigation, forensics, containment actions | security@peacefull.ai |
| **Privacy Officer** | HIPAA breach assessment, HHS notification | privacy@peacefull.ai |
| **Engineering Lead** | System remediation, patch deployment | engineering@peacefull.ai |
| **Clinical Safety Officer** | Patient impact assessment, clinician notification | clinical@peacefull.ai |
| **Communications Lead** | Stakeholder and patient notifications | comms@peacefull.ai |

---

## 6. Incident Response Phases

### Phase 1: Detection & Identification (0–15 min)
1. Alert received via monitoring, user report, or automated detection
2. On-call engineer triages and assigns severity level
3. Create incident ticket with timestamp, reporter, initial observations
4. Notify Incident Commander if SEV-1 or SEV-2
5. Begin incident log (append-only, timestamped)

**Detection Sources:**
- CloudWatch / Datadog alerts
- AWS GuardDuty findings
- WAF rule triggers
- User-reported issues (support tickets)
- Automated audit log anomaly detection
- Third-party vulnerability disclosures

### Phase 2: Containment (15 min – 2 hrs)
1. **Short-term containment:** Isolate affected systems, revoke compromised credentials
2. **Evidence preservation:** Snapshot affected resources, preserve logs
3. **Communication:** Update incident channel, notify affected teams
4. If PHI is involved, engage Privacy Officer immediately

**Containment Actions by Type:**
| Incident Type | Containment Action |
|--------------|-------------------|
| Unauthorized access | Revoke tokens, rotate credentials, disable accounts |
| Data exfiltration | Block egress, isolate database, snapshot for forensics |
| Malware | Isolate affected hosts, block C2 domains |
| DDoS | Activate WAF rules, enable CloudFront rate limiting |
| AI safety | Disable AI features, activate fallback responses |

### Phase 3: Eradication (2–24 hrs)
1. Identify root cause through forensic analysis
2. Remove threat actor access, malware, or vulnerable code
3. Patch vulnerabilities, update security controls
4. Verify eradication through security scanning

### Phase 4: Recovery (4–48 hrs)
1. Restore systems from clean backups if needed
2. Re-enable services incrementally with monitoring
3. Verify data integrity (compare checksums, run consistency checks)
4. Resume normal operations with enhanced monitoring (30-day window)

### Phase 5: Post-Incident (48 hrs – 30 days)
1. Conduct post-mortem within 72 hours
2. Document lessons learned, timeline, and remediation steps
3. Update security controls, runbooks, and monitoring
4. Assess HIPAA breach notification requirements (see Section 7)
5. Archive incident record for 6 years (HIPAA retention requirement)

---

## 7. HIPAA Breach Notification Requirements

Per HIPAA §164.404–164.408, if a breach of unsecured PHI is confirmed:

### Individual Notification (§164.404)
- **Timeline:** Within 60 days of discovery
- **Method:** Written notice to each affected individual
- **Contents:** Description of breach, types of PHI involved, steps individuals should take, what the organization is doing, contact information

### HHS Notification (§164.408)
- **≥500 individuals:** Notify HHS Secretary within 60 days
- **<500 individuals:** Notify HHS within 60 days of calendar year end
- **Portal:** https://ocrportal.hhs.gov/ocr/breach/wizard_breach.jsf

### Media Notification (§164.406)
- **≥500 individuals in a state/jurisdiction:** Notify prominent media outlets within 60 days

### Risk Assessment (§164.402(2))
Before determining notification is required, conduct a 4-factor risk assessment:
1. Nature and extent of PHI involved
2. Unauthorized person who accessed or used the PHI
3. Whether PHI was actually acquired or viewed
4. Extent to which risk to PHI has been mitigated

---

## 8. Communication Templates

### Internal — Incident Declared
```
🚨 INCIDENT DECLARED — [SEV-X]
Time: [timestamp UTC]
Summary: [brief description]
Incident Commander: [name]
War Room: [link]
Status: INVESTIGATING
Next Update: [time]
```

### External — Patient Notification (Breach)
```
Subject: Important Security Notice — Peacefull.ai

Dear [Patient Name],

We are writing to inform you of a security incident that may have involved your 
personal health information. [Description of what happened, what information was 
involved, and what we are doing about it.]

Steps you can take:
- Monitor your accounts for unusual activity
- Contact us at privacy@peacefull.ai with questions
- File a complaint with HHS if desired: https://www.hhs.gov/hipaa/filing-a-complaint

[Contact information]
```

---

## 9. AI-Specific Incident Procedures

### AI Safety Events
1. **Detection:** Clinician reports inappropriate AI output, automated content safety filter triggers
2. **Immediate action:** Disable AI feature, activate canned fallback responses
3. **Assessment:** Review AI output, identify prompt injection or model failure
4. **Remediation:** Update guardrails, add safety filters, retrain if needed
5. **Communication:** Notify affected clinicians, document in clinical safety log

### AI Output Review Triggers
- Patient reports distressing AI response
- AI suggests self-harm or dangerous behavior
- AI contradicts established treatment plan
- AI discloses PHI from another patient (cross-contamination)

---

## 10. Escalation Matrix

```
SEV-4 → On-call Engineer → Security Lead (if security-related)
SEV-3 → On-call Engineer → Security Lead → Engineering Lead
SEV-2 → On-call Engineer → Incident Commander → All IR Team leads
SEV-1 → On-call Engineer → Incident Commander → All IR Team → Executive Team → Legal
```

---

## 11. Testing & Maintenance

| Activity | Frequency | Owner |
|----------|-----------|-------|
| Tabletop exercise | Quarterly | Security Lead |
| Full simulation (fire drill) | Annually | Incident Commander |
| Plan review & update | Semi-annually | Privacy Officer |
| Contact list verification | Monthly | Security Lead |
| Backup restoration test | Monthly | Engineering Lead |
| Penetration testing | Annually | External vendor |

---

## 12. Regulatory References

- **HIPAA Security Rule** — 45 CFR §164.308(a)(6) — Security incident procedures
- **HIPAA Breach Notification Rule** — 45 CFR §§164.400–164.414
- **NIST SP 800-61** — Computer Security Incident Handling Guide
- **NIST Cybersecurity Framework** — Respond (RS) function

---

## 13. Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-04 | Security Team | Initial incident response plan |

---

*This document is reviewed semi-annually and after every SEV-1 or SEV-2 incident. All team members must acknowledge receipt annually.*
