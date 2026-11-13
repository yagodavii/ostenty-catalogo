# OSTENTY SEMIJOIAS — Catálogo digital

Catálogo digital responsivo com frontend estático, API serverless na Vercel e persistência em MongoDB Atlas.

## Estrutura

```text
frontend/                 landing, catálogo e painel administrativo
  index.html
  styles.css
  app.js
backend/                  regras de negócio e acesso ao banco
  api/                    handlers de autenticação, produtos e importação
  lib/                    MongoDB, sessão e utilitários
api/                      entradas serverless reconhecidas pela Vercel
vercel.json               rewrite da página pública para frontend/
.env.example              variáveis necessárias em desenvolvimento/Vercel
```

## Banco e autenticação

O backend usa MongoDB Atlas. Configure no Vercel (Project → Settings → Environment Variables) ou em um arquivo local `.env.local`:

```text
MONGODB_URI=mongodb+srv://...
MONGODB_DB=ostenty
ADMIN_EMAIL=admin@ostenty.com.br
ADMIN_PASSWORD=uma-senha-forte
SESSION_SECRET=uma-chave-longa-e-aleatoria
```

Nunca envie `.env.local` ou valores reais para o GitHub. O arquivo `.env.example` contém apenas o formato.

## API disponível

- `GET /api/health`
- `GET /api/categories`
- `GET /api/products` — produtos ativos para o catálogo público
- `GET /api/products?includeInactive=1` — inventário completo para sessão autenticada
- `POST /api/auth` — login
- `POST /api/auth?action=logout` — logout
- `POST /api/products` — cadastrar produto autenticado
- `PUT /api/products?id=...` — editar produto autenticado
- `DELETE /api/products?id=...` — excluir produto autenticado
- `POST /api/import` — importação em massa autenticada
- `GET /api/stats` — métricas autenticadas

## Desenvolvimento

```powershell
npm install
vercel dev
```

Sem as variáveis MongoDB, o frontend continua funcionando em modo local para testes, usando `localStorage`. Em produção, configure o MongoDB antes de cadastrar produtos para que os dados sejam compartilhados entre dispositivos.

## Deploy

O projeto está preparado para Vercel. Depois de conectar o repositório GitHub ao projeto Vercel, cada push na branch `main` gera um novo deploy automaticamente.
