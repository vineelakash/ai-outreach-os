# Security & Privacy Architecture

AI Outreach OS is built from the ground up to protect mailbox credentials, API keys, and contact data.

---

## 1. Credentials Encryption at Rest (AES-256-GCM)
All sensitive secrets persisted to PostgreSQL are encrypted using **AES-256-GCM** authenticated encryption:
- Mailbox SMTP passwords
- Mailbox IMAP passwords
- Google Workspace OAuth refresh tokens
- Microsoft Azure AD OAuth tokens
- OpenAI, Gemini, and Claude API keys

### Serialization Format:
```
iv (16 bytes hex) : authTag (16 bytes hex) : ciphertext (hex)
```
Any tampering with ciphertext or authentication tag results in an immediate authentication failure rather than silent corruption.

---

## 2. Zero Client-Side Secret Leakage
- API keys and passwords are decrypted exclusively server-side within the Next.js API routes or the background worker process.
- The UI settings endpoints return masked keys (e.g. `sk-p••••••••cdef`).
- Client components only ever receive sanitized mailbox metadata.

---

## 3. Idempotency & Duplicate Prevention
To prevent sending the same cold email twice during worker retries or concurrency races:
1. Every send operation computes a unique deterministic key:
   ```
   send_{campaignLeadId}_step_{stepNumber}
   ```
2. The database enforces a `UNIQUE` constraint on `EmailMessage.idempotencyKey`.
3. If a retry occurs, the worker detects the existing key and halts gracefully without double-sending.

---

## 4. Privacy-Respecting Analytics (Google Analytics 4)
- Google Analytics 4 tracks high-level operational events (`campaign_created`, `reply_received`, `mailbox_connected`).
- **PII Filter**: Under no circumstances are lead email addresses, contact names, email subjects, or message contents transmitted to Google Analytics.
- All event payloads are sanitized by `lib/analytics/ga.ts` before dispatch.
