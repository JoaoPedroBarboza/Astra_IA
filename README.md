# Astra IA

Assistente de IA por voz e visão computacional em tempo real, com memória de longo prazo
(Mem0) e streaming de áudio via LiveKit. Projeto de TCC.

## Estrutura

- `server/agent/` — worker Python (LiveKit Agents + OpenAI Realtime + Mem0).
- `client/` — frontend web em Next.js com cadastro/login (Better Auth + Postgres) que
  conecta o usuário à sala LiveKit onde o agente atua. Ver [client/README.md](client/README.md).

```
Navegador ──HTTPS──► Next.js (Vercel) ── /api/token: só com sessão válida
    │                     └─► Postgres (Neon): usuários, sessões, códigos
    └──WebRTC──► LiveKit Cloud ◄── Agente Python (LiveKit Cloud Agents)
                                      ├─► OpenAI Realtime
                                      └─► Mem0 (memória por id de usuário)
```

O token do LiveKit leva o **id do usuário no banco** como identidade; o agente usa esse id
como chave no Mem0, então cada pessoa só acessa as próprias memórias.

## Como rodar localmente (2 processos em paralelo)

Os dois processos precisam apontar para o **mesmo projeto LiveKit**. Use um projeto
LiveKit separado do de produção: se o agente local e o de produção estiverem registrados
no mesmo projeto, as salas são divididas entre os dois.

**Terminal 1 — agente Python:**

```bash
cd server/agent
pip install -r requirements.txt
python agent.py dev
```

Preencha `server/agent/.env` a partir do `.env.example` (`LIVEKIT_*`, `OPENAI_API_KEY`,
`MEM0_API_KEY`).

**Terminal 2 — frontend Next.js:**

```bash
cd client
npm install
cp .env.local.example .env.local   # preencha (ver comentários no arquivo)
npm run db:migrate                 # cria as tabelas no banco do DATABASE_URL
npm run dev
```

Sem `SMTP_HOST`, os códigos de verificação aparecem no terminal do `npm run dev`.

Acesse `http://localhost:3000`, crie uma conta, confirme o código e clique em **Conectar**.

## Deploy em produção

1. **Banco (Neon):** crie um projeto em neon.tech e copie a connection string *pooled*.
   Aplique as migrations: `DATABASE_URL=<url> npm run db:migrate` (dentro de `client/`).
2. **E-mail (SMTP):** configure um provedor (Gmail com senha de app, Brevo, Resend...).
   Sem SMTP em produção, ninguém consegue confirmar o cadastro.
3. **Google OAuth (opcional):** no Google Cloud Console, crie um OAuth Client do tipo
   "Web application" com redirect URI `https://<seu-dominio>/api/auth/callback/google`.
4. **Frontend (Vercel):** importe o repositório com *Root Directory* `client` e cadastre
   todas as variáveis do `client/.env.local.example` (com `BETTER_AUTH_URL` = domínio da
   Vercel) **antes** do primeiro build.
5. **Agente (LiveKit Cloud Agents):** ver [server/agent/README.md](server/agent/README.md#deploy).
