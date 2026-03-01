# Data Retention & Disposal Policy — Peacefull Platform

**Document Version:** 1.0  
**Effective Date:** 2026-03-01  
**Review Date:** 2027-03-01  
**Author:** Compliance Team  
**Status:** Active

---

## 1. Purpose

This policy establishes data retention schedules and disposal procedures for the Peacefull platform in compliance with HIPAA requirements (45 CFR § 164.530(j)) and applicable state laws.

---

## 2. Scope

This policy applies to all Protected Health Information (PHI), Personally Identifiable Information (PII), and operational data processed by the Peacefull platform.

---

## 3. Retention Schedule

### 3.1 Clinical Data

| Data Type | Retention Period | Trigger | Mechanism |
|-----------|------------------|---------|-----------|
| Clinical notes | 7 years | Last update date | Database TTL |
| Mood check-ins | 7 years | Creation date | Database TTL |
| Journal entries | 7 years | Creation date | Database TTL |
| Voice memos | 7 years | Creation date | Database TTL |
| Crisis events | 7 years | Event date | Database TTL |
| Risk assessments | 7 years | Assessment date | Database TTL |
| Treatment plans | 7 years | Last update date | Database TTL |
| GAD-7/PHQ-9 scores | 7 years | Assessment date | Database TTL |

### 3.2 Communication Data

| Data Type | Retention Period | Trigger | Mechanism |
|-----------|------------------|---------|-----------|
| Secure messages | 7 years | Message date | Database TTL |
| Triage items | 7 years | Creation date | Database TTL |
| Escalation records | 7 years | Event date | Database TTL |

### 3.3 Audit & Security Data

| Data Type | Retention Period | Trigger | Mechanism |
|-----------|------------------|---------|-----------|
| Audit logs | 7 years | Log timestamp | Database TTL |
| Session/auth logs | 1 year | Log timestamp | Log retention policy |
| Security events | 7 years | Event date | Log retention policy |
| Access logs | 1 year | Log timestamp | Log retention policy |

### 3.4 Account Data

| Data Type | Retention Period | Trigger | Mechanism |
|-----------|------------------|---------|-----------|
| User profiles | Account lifetime | Account creation | Active storage |
| Consent records | 7 years post-consent | Consent date | Database TTL |
| Deleted account data | 30 days post-deletion | Deletion request | Soft delete + purge |

---

## 4. Legal Basis for Retention Periods

### 4.1 HIPAA Requirements

- Medical records must be retained for 6 years from date of creation or last effective date
- We extend to 7 years as a conservative measure

### 4.2 State Law Considerations

- California: Adult records 7 years from last treatment
- New York: Adult records 6 years from last treatment
- Texas: Adult records 7 years from last treatment

The platform defaults to the most stringent requirement (7 years).

### 4.3 Minors

Records of minor patients must be retained until the patient reaches age of majority plus the standard retention period. This is handled by setting extended TTL values on minor patient records.

---

## 5. Disposal Procedures

### 5.1 Soft Delete Process

When a user requests account deletion:

1. Account status set to `DELETED`
2. User cannot log in
3. All PHI marked with `deletedAt` timestamp
4. Data remains accessible to authorized administrators for 30 days
5. Support can reverse deletion within 30-day window

### 5.2 Permanent Purge Process

After 30-day soft delete period:

1. Scheduled job identifies records past 30-day deletion window
2. All associated PHI permanently deleted:
   - User profile anonymized (names, email, phone replaced with hashes)
   - Clinical data records hard deleted
   - Associated files removed from storage
3. Audit log entry created: `USER_DATA_PURGED` (user ID only, no PHI)
4. Confirmation notification sent to admin

### 5.3 TTL-Based Expiration

For records reaching end of retention period:

1. Database TTL attribute triggers automatic tombstone
2. Weekly cleanup job permanently removes tombstoned records
3. Audit log entry created with record type and count
4. No PHI included in deletion logs

---

## 6. Exceptions

### 6.1 Legal Hold

When litigation or investigation is anticipated:

1. Legal team issues hold notice
2. Affected records exempted from automatic deletion
3. Records retained until hold lifted
4. All hold activities logged in audit trail

### 6.2 Regulatory Requests

When regulatory agency requests records:

1. Compliance team validates request authenticity
2. Affected records preserved beyond normal retention
3. Records released per legal requirements
4. Event documented in compliance log

---

## 7. Implementation Details

### 7.1 Database TTL Configuration

```sql
-- Example: Submissions table TTL
ALTER TABLE "Submission" 
ADD COLUMN "expiresAt" TIMESTAMP;

-- Set expiry on insert
CREATE TRIGGER set_submission_expiry
BEFORE INSERT ON "Submission"
FOR EACH ROW
SET NEW.expiresAt = DATE_ADD(NOW(), INTERVAL 7 YEAR);
```

### 7.2 Purge Job Schedule

| Job | Schedule | Description |
|-----|----------|-------------|
| Soft-delete purge | Daily 2:00 AM UTC | Remove records 30+ days past deletion |
| TTL cleanup | Weekly Sunday 3:00 AM UTC | Remove expired records |
| Orphan cleanup | Monthly 1st 4:00 AM UTC | Remove orphaned file references |

### 7.3 Monitoring

- Daily report: Records pending deletion (count by type)
- Weekly report: Records purged (count by type)
- Monthly report: Storage utilization and retention compliance

---

## 8. User Rights

### 8.1 Right to Deletion

Users may request deletion of their account and associated data:

1. Request submitted via Settings > Account > Delete Account
2. Identity verification required (password re-entry)
3. 30-day waiting period begins
4. User receives confirmation email
5. User can cancel within 30 days

### 8.2 Right to Data Export

Before deletion, users may export their data:

1. Settings > Privacy > Export My Data
2. JSON format with all patient-owned records
3. Download link valid for 24 hours
4. Export event logged in audit trail

---

## 9. Compliance Verification

### 9.1 Annual Audit

- Review retention schedules against current regulations
- Verify TTL configurations are active
- Sample test data disposal process
- Document any policy updates required

### 9.2 Quarterly Review

- Check purge job execution logs
- Verify no data exceeds retention periods
- Review exception requests

---

## 10. Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-01 | Compliance Team | Initial policy |

---

## 11. Approval

☐ Privacy Officer: ___________________________ Date: ___________

☐ Legal Counsel: ___________________________ Date: ___________

☐ CTO: ___________________________ Date: ___________
