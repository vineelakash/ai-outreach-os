# Contributing to AI Outreach OS

Thank you for your interest in contributing!

---

## 1. Development Principles
- **No Mock or Fake Implementations in Core Engines**: Keep backend abstractions production-ready.
- **Strict Grounding for AI Features**: Never build AI features that fabricate facts or encourage spam.
- **Credential Safety**: Never log or commit credentials, API keys, or plaintext passwords.
- **Test-Driven Changes**: Any new email adapter, AI provider, or sequence feature must include unit tests in `/tests`.

---

## 2. Conventional Commits
Please structure your commit messages following the Conventional Commits specification:

- `feat:` A new user-facing feature or adapter
- `fix:` A bug fix or deliverability correction
- `refactor:` Code refactoring without behavior change
- `docs:` Documentation updates
- `test:` Adding or updating tests
- `chore:` Dependency or build updates
- `security:` Security or encryption enhancements

---

## 3. Pull Request Checklist
1. `npm test` passes 100%.
2. `npx tsc --noEmit` passes with 0 errors.
3. No `.env` or sensitive credentials in git diff.
4. Clean, focused PR descriptions.
