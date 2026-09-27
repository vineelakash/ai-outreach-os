# Email Providers Configuration Guide

AI Outreach OS supports multiple outbound and inbound email providers through an abstract adapter architecture.

---

## 1. Generic SMTP & IMAP
Supports any standard email host (Mailgun, SendGrid, Amazon SES, Postmark, Private cPanel/Postfix, Mailtrap):

- **SMTP Host**: `smtp.yourserver.com`
- **SMTP Port**: `587` (STARTTLS) or `465` (SSL/TLS)
- **SMTP Username**: Your email or SMTP username
- **SMTP Password**: Your password or app-specific password
- **IMAP Host**: `imap.yourserver.com`
- **IMAP Port**: `993` (SSL/TLS)

All credentials are encrypted using **AES-256-GCM** prior to database persistence.

---

## 2. Google Workspace / Gmail API
Uses Google OAuth 2.0 and the official Gmail REST API (`googleapis`):

1. Go to **Google Cloud Console** -> Create a Project.
2. Enable the **Gmail API**.
3. Create **OAuth 2.0 Client IDs** (Application type: Web application).
4. Add Authorized Redirect URI:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
5. Configure Scopes:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.modify`
6. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to your `.env` or UI settings.

---

## 3. Microsoft 365 / Azure Active Directory
Connects to Microsoft Graph API (`@microsoft/microsoft-graph-client`):

1. Go to **Azure Portal** -> **Microsoft Entra ID** -> **App registrations**.
2. Register an application and note the `Application (client) ID` and `Directory (tenant) ID`.
3. Under **Certificates & secrets**, create a new client secret.
4. Under **API permissions**, add Delegated permissions for Microsoft Graph:
   - `Mail.Send`
   - `Mail.ReadWrite`
   - `offline_access`
5. Configure in `.env`:
   ```env
   MICROSOFT_CLIENT_ID=your-client-id
   MICROSOFT_CLIENT_SECRET=your-client-secret
   MICROSOFT_TENANT_ID=common
   ```

---

## 4. Mock Provider (Testing & Offline Development)
When testing locally or running automated CI tests, set provider to `MOCK`. No real emails are sent; outbound messages and inbound replies are stored in an in-memory test queue.
