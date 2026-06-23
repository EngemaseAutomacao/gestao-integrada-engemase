# Edge Functions — Gestão Integrada Engemase

Documentação de todas as Edge Functions do projeto. Para cada função: propósito, autenticação, secrets exigidos, rate limit e payload.

> **Convenções**
> - Helpers compartilhados em `_shared/`: `auth.ts` (CORS + `requireAuth`/`requireAdmin`) e `rateLimit.ts` (throttling via tabela `rate_limits`).
> - Todas as funções respondem `OPTIONS` com `corsHeaders`.
> - JWT é validado em código via `supabase.auth.getClaims()` (signing-keys).
> - Erros voltam como `{ "error": string }` com status apropriado.

---

## Públicas (sem auth)

### `login-with-username`
**POST** `{ username, password }` → `{ session: { access_token, refresh_token } }`
Lookup de email server-side + signIn. Retorna erro genérico (`"Usuário ou senha inválidos"`) para qualquer falha — anti-enumeração.
**Rate limit:** 10/min por IP.

### `bootstrap-admin`
**POST** `{ secret, email }` → promove usuário a admin. Protegido por `BOOTSTRAP_SECRET_KEY`. Usado apenas no setup inicial.

### `reset-admin-password`
**POST** `{ secret, email, new_password }`. Protegido por `ADMIN_RESET_SECRET_KEY`.

### `generate-vapid`
**GET** → gera par VAPID novo. Apenas dev; não chamar em produção.

---

## Autenticadas (usuário logado)

### `read-odometer`
**POST** `{ imageBase64 }` → `{ km: number }`
OCR do hodômetro via Lovable AI Gateway (Gemini). Usa `LOVABLE_API_KEY`.
**Rate limit:** 10/min por usuário.

### `sync-user`
**POST** — sincroniza profile do usuário autenticado.

### `update-user-password`
**POST** `{ current_password, new_password }` — troca senha do próprio usuário (revalida senha atual).

---

## Admin-only (require `admin` role)

### `create-user`
**POST** `{ email, password, full_name, username, category, role }` → cria usuário (service-role).

### `update-user`
**POST** — atualiza profile de qualquer usuário.

### `delete-user`
**POST** `{ user_id }` — remove usuário do Auth e cascateia tabelas relacionadas.

### `send-push-notification`
**POST** `{ subscription, title, body, ... }` — envia Web Push via VAPID.
Aceita autenticação via JWT admin **ou** header `x-cron-secret` (chamadas internas do trigger `notify_push_on_insert`).
**Rate limit:** 50/min por admin.

### `migrate-storage` / `reorganize-storage`
Operações de manutenção no bucket `imagens` — só admins.

### `cleanup-data`
Aplica políticas de retenção configuradas em `data_retention_settings`. Chamada por cron + UI admin.

---

## Cron (chamadas internas)

Disparadas por `pg_cron` com header `x-cron-secret: $CRON_SECRET`.

### `check-notifications`
Roda checagens periódicas: ferramentas atrasadas, lembretes de devolução, manutenção, uso prolongado de veículo, retorno atrasado de veículo. Insere notificações.

### `sync-trello`
A cada 5 min. Lê coluna "Fazendo" do board Trello → upsert em `construction_sites`. Sync **read-only unidirecional**.
Secrets: `TRELLO_API_KEY`, `TRELLO_TOKEN`, `TRELLO_BOARD_ID`, `TRELLO_LIST_ID`.

### `sync-google-sheets`
Diário às 03:00 BRT. Sync bidirecional do catálogo de ferramentas com planilha Google.
Secrets: `GOOGLE_SHEETS_API_KEY`, `GOOGLE_SHEET_ID`.

---

## Secrets exigidos

| Secret | Usado por |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | todas |
| `LOVABLE_API_KEY` | `read-odometer` |
| `VAPID_PRIVATE_KEY`, `VAPID_PUBLIC_KEY` | `send-push-notification`, `generate-vapid` |
| `CRON_SECRET` | crons + `send-push-notification` (modo trigger) |
| `BOOTSTRAP_SECRET_KEY` | `bootstrap-admin` |
| `ADMIN_RESET_SECRET_KEY` | `reset-admin-password` |
| `SYNC_USER_SECRET_KEY` | `sync-user` |
| `TRELLO_API_KEY`, `TRELLO_TOKEN`, `TRELLO_BOARD_ID`, `TRELLO_LIST_ID` | `sync-trello` |
| `GOOGLE_SHEETS_API_KEY`, `GOOGLE_SHEET_ID` | `sync-google-sheets` |

> **Rotação:** `CRON_SECRET` deve ser rotacionado trimestralmente. Demais secrets, sob suspeita de vazamento.

---

## Rate limiting

Tabela `public.rate_limits` (`key`, `window_start`, `count`). Helper `_shared/rateLimit.ts` faz `INSERT … ON CONFLICT` por janela. Cron `cleanup_rate_limits()` remove janelas > 1h.

## Logs

Logs por função: `supabase functions logs <name>` (CLI) ou painel Backend.
Erros não recuperáveis sempre logam via `console.error` com contexto suficiente para troubleshooting.
