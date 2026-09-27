# Self-Hosted Deployment Guide

This guide covers local development, Docker Compose, and production deployment for **AI Outreach OS**.

---

## 1. Prerequisites
- **Node.js**: v20+ or v24+
- **Docker & Docker Compose**: v24+
- **PostgreSQL**: v15 or v16
- **Redis**: v7+

---

## 2. Quickstart with Docker Compose

1. Clone repository:
   ```bash
   git clone https://github.com/vineelakash/ai-outreach-os.git
   cd ai-outreach-os
   ```

2. Copy environment template:
   ```bash
   cp .env.example .env
   ```

3. Generate a 32-byte encryption key:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Add this to `.env` as `ENCRYPTION_KEY=...`

4. Launch services:
   ```bash
   docker compose up -d --build
   ```

5. Run database migrations and seed demo data:
   ```bash
   docker compose exec app npx prisma db push
   docker compose exec app npm run db:seed
   ```

6. Access the dashboard:
   - Web App: [http://localhost:3000](http://localhost:3000)
   - Default Login: `demo@outreach-os.local`
   - Default Password: `password123`

---

## 3. Local Development (Without Docker)

1. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

2. Start PostgreSQL and Redis locally:
   ```bash
   # Or using brew / system service
   docker run -d --name local-pg -p 5432:5432 -e POSTGRES_PASSWORD=outreach_secret_pass -e POSTGRES_USER=outreach_user -e POSTGRES_DB=ai_outreach_db postgres:16-alpine
   docker run -d --name local-redis -p 6379:6379 redis:7-alpine
   ```

3. Push Prisma schema:
   ```bash
   npx prisma db push
   npm run db:seed
   ```

4. Run Next.js and Worker concurrently:
   - Terminal 1: `npm run dev`
   - Terminal 2: `npm run worker`

---

## 4. Production Hardening Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Change `NEXTAUTH_SECRET` to a cryptographically random 32+ character string
- [ ] Secure `ENCRYPTION_KEY` and store backup in password vault
- [ ] Configure HTTPS via reverse proxy (Caddy, NGINX, Cloudflare Tunnel)
- [ ] Set up daily PostgreSQL automated database backups
- [ ] Monitor Redis memory limits and queue backlogs
- [ ] Configure `NEXT_PUBLIC_GA_ID` for first-party/GA4 analytics
