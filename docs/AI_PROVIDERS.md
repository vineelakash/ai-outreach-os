# Multi-Model AI Engine Guide

AI Outreach OS features an abstracted, multi-model AI inference engine supporting **OpenAI**, **Google Gemini**, and **Anthropic Claude**.

---

## 1. Capabilities & Tasks
The AI engine provides 4 specialized capabilities:

| Capability | Purpose | Typical Models |
|---|---|---|
| **Multi-Step Copywriter** | Generates full 3-step outbound campaigns with delays, subject lines, and body copy | GPT-4o, Claude 3.5 Haiku, Gemini 1.5 Pro |
| **Fact-Grounded Personalization** | Injects 1-2 personalized opening sentences grounded strictly in verified lead fields | GPT-4o-mini, Gemini 1.5 Flash |
| **Reply Intent Classifier** | Evaluates inbound emails and classifies intent into 10 structured categories | GPT-4o-mini, Gemini 1.5 Flash |
| **Autonomous Reply Drafter** | Generates contextual, thread-aware responses for human review or automated sending | GPT-4o, Claude 3.5 Haiku |

---

## 2. Supported AI Providers & Setup

### A. OpenAI
- **Supported Models**: `gpt-4o`, `gpt-4o-mini`, `o3-mini`
- **Environment Variable**: `OPENAI_API_KEY=sk-proj-...`
- **Features**: Native JSON mode with strict schema enforcement.

### B. Google Gemini
- **Supported Models**: `gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-2.5-flash`
- **Environment Variable**: `GEMINI_API_KEY=AIzaSy...`
- **Features**: Structured response MIME types (`application/json`) and cost-effective bulk personalization.

### C. Anthropic Claude
- **Supported Models**: `claude-3-5-haiku-20241022`, `claude-3-7-sonnet-20250219`
- **Environment Variable**: `ANTHROPIC_API_KEY=sk-ant-api03-...`
- **Features**: Superior nuanced copywriting, adherence to negative constraints (no hallucinating achievements or awards).

### D. Deterministic Mock Provider
- Selected with `AI_PROVIDER=mock`.
- Returns deterministic, Zod-schema-compliant test outputs for local development and CI pipelines without requiring paid API keys.

---

## 3. Strict Non-Hallucination Guardrails
To prevent reputation damage and deliverability issues caused by fake claims:
1. Prompts explicitly prohibit inventing awards, company funding amounts, past conversations, or client names.
2. Only verified company name, job title, industry, city, and supplied custom fields may be referenced.
3. If specific company context is absent, the AI gracefully defaults to clean, neutral B2B language.
