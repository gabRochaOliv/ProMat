# ProMat — Assistente de Exercícios para Professores de Matemática

## Visão Geral

Aplicação web que permite professores de matemática gerarem exercícios personalizados via IA (OpenAI / Gemini), com histórico por sessão e migração para conta autenticada via Supabase.

## Estrutura do Projeto

```
system/
├── backend/          # Node.js + Express (API)
├── frontend/         # HTML/CSS/JS estático (app principal)
├── landing/          # Landing page estática
├── vercel.json       # Configuração de deploy (Vercel)
└── supabase_setup.sql
```

## Backend (`backend/`)

- **Entrada:** `server.js` — Express na porta 3001
- **Rotas:**
  - `POST /api/gerar` — gera exercícios via IA
  - `GET/DELETE /api/historico` — histórico de gerações
  - `POST /api/webhook` — webhooks externos
  - `POST /api/auth/migrar-guest` — migra histórico guest → usuário autenticado
  - `GET /api/health` — health check
  - `GET /api/config` — expõe Supabase URL/anonKey ao frontend
- **Serviços:** `aiService.js`, `moderationService.js`, `promptBuilder.js`, `supabaseService.js`
- **Rate limit:** 30 req / 15 min por IP

### Variáveis de Ambiente (`backend/.env`)

| Variável | Descrição |
|---|---|
| `OPENAI_API_KEY` | Chave OpenAI (ou Gemini) |
| `AI_PROVIDER` | `openai` ou `gemini` |
| `AI_MODEL` | Ex: `gpt-4o-mini` |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | Chave anon do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role |
| `FRONTEND_URL` | URL do frontend em produção |
| `RATE_LIMIT_WINDOW_MS` | Janela do rate limit (ms) |
| `RATE_LIMIT_MAX` | Máx. requisições por janela |

## Frontend (`frontend/`)

HTML/CSS/JS puro — sem framework. Servido como estático via Express em dev e via Vercel em produção.

## Landing (`landing/`)

Página de apresentação do produto. Estática, sem dependências de build.

## Como Rodar Localmente

```bash
cd backend
npm install
cp .env.example .env  # configurar variáveis
npm run dev           # nodemon na porta 3001
```

Frontend acessível em `http://localhost:3001`.

## Deploy

Vercel. Configurado em `vercel.json`:
- `/api/*` → `backend/server.js`
- `/landing/*` → `landing/`
- `/*` → `frontend/`

## Banco de Dados

Supabase (PostgreSQL). Schema em `supabase_setup.sql`.
