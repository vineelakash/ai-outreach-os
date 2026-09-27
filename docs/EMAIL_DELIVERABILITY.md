# Email Deliverability & Compliance Guide

Deliverability is the foundation of high-converting outbound sales. AI Outreach OS enforces technical standards and compliance safeguards to keep your domains healthy.

---

## 1. The Core Deliverability Triad: SPF, DKIM, and DMARC

### A. Sender Policy Framework (SPF)
- **What it does**: Authorizes specific IP addresses or providers to send mail on behalf of your domain.
- **Record**: TXT at `@`
- **Example**:
  ```
  v=spf1 include:_spf.google.com ~all
  ```
- **Rule**: Never have more than one SPF TXT record on a single domain. Combine inclusions if using multiple providers.

### B. DomainKeys Identified Mail (DKIM)
- **What it does**: Cryptographically signs outbound emails using public/private key pairs to verify the message was not modified in transit.
- **Record**: TXT at `selector._domainkey.yourdomain.com`
- **Example**:
  ```
  v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3...
  ```

### C. Domain-based Message Authentication, Reporting & Conformance (DMARC)
- **What it does**: Instructs receiving mail servers (Gmail, Yahoo, Outlook) what to do when SPF or DKIM fails.
- **Record**: TXT at `_dmarc.yourdomain.com`
- **Recommended Progression**:
  1. *Monitoring*: `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com`
  2. *Quarantine*: `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc@yourdomain.com`
  3. *Strict Rejection*: `v=DMARC1; p=reject; pct=100; rua=mailto:dmarc@yourdomain.com`

---

## 2. 2024+ Yahoo & Google Sender Requirements
1. **Sub-0.3% Spam Rate**: Maintaining a spam complaint rate below 0.1% (and never exceeding 0.3%).
2. **One-Click Unsubscribe (RFC 8058)**:
   All outbound outreach emails sent by AI Outreach OS automatically include:
   ```
   List-Unsubscribe: <https://yourdomain.com/api/unsubscribe/{leadId}>
   List-Unsubscribe-Post: List-Unsubscribe=One-Click
   ```
3. **Valid Forward and Reverse DNS (rDNS)**:
   Ensures sending mail servers have matching PTR records.

---

## 3. Warm-Up & Sending Velocity Safeguards
- **Daily Mailbox Limits**: New domains should start at 15–20 emails/day and scale gradually to 40–50 emails/day.
- **Randomized Jitter Delays**: Sends are dispersed with 120s to 300s of randomized jitter between messages to avoid robotic burst patterns.
- **Timezone Windows**: Campaigns strictly send during working hours in the recipient's timezone.
- **Automatic Sequence Halting**: If a prospect replies, bounces, or unsubscribes, all future sequence steps are halted immediately.
