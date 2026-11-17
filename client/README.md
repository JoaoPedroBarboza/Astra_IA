# Astra IA — Client

MVP de acesso web ao agente Astra. Next.js (App Router) + `@livekit/components-react`.

## O que tem nesta fase

- Tela única: orbe animado (idle → conectando → ouvindo/pensando/falando), botão de
  conectar, mute de microfone, toggle de câmera, compartilhamento de tela e desconectar.
- Câmera e compartilhamento de tela alimentam a visão computacional do agente e são
  mutuamente exclusivos: o agente mantém uma única assinatura de vídeo e troca para a
  última track recebida, então publicar as duas ao mesmo tempo tornaria imprevisível o
  que ele enxerga.
- Rota `app/api/token/route.ts` gera o token de acesso à sala LiveKit no servidor
  (usa `livekit-server-sdk`), sem expor `LIVEKIT_API_SECRET` ao navegador. Só responde
  para quem tem sessão; a identidade do token é o id do usuário no banco.
- Autenticação com [Better Auth](https://www.better-auth.com): cadastro aberto com e-mail
  e senha, confirmação do e-mail por código de 6 dígitos, recuperação de senha por código
  e login com Google (opcional). Usuários e sessões ficam no Postgres (Neon), via Drizzle.
  Tentativas de login e envio de códigos têm rate limit guardado no banco.

## Rodando

```bash
npm install
cp .env.local.example .env.local   # preencha com as credenciais reais
npm run db:migrate                 # cria as tabelas no banco do DATABASE_URL
npm run dev
```

Sem `SMTP_HOST`, os códigos de verificação são impressos no terminal do `npm run dev`.

### Banco de dados

- `lib/db/schema.ts` é gerado a partir da configuração do Better Auth
  (`npm run auth:schema`). Rode de novo ao adicionar plugins que criam tabelas.
- `npm run db:generate` cria uma migration em `drizzle/` a partir do schema;
  `npm run db:migrate` aplica as pendentes. Commite as migrations.

Abra `http://localhost:3000`. É necessário que o worker do agente
(`server/agent/agent.py`, modo `dev`) esteja rodando e configurado com o mesmo projeto
LiveKit — veja o README na raiz do repositório.

## Estrutura

- `app/page.tsx` / `app/login/page.tsx` — checam a sessão no servidor e redirecionam.
- `app/api/auth/[...all]/route.ts` — endpoints do Better Auth.
- `app/api/token/route.ts` — geração do JWT de acesso à sala (exige sessão).
- `lib/auth.ts` / `lib/auth-client.ts` — configuração do Better Auth (servidor/navegador).
- `lib/db/` — conexão e schema do Postgres (Drizzle).
- `lib/email.ts` — envio dos códigos por SMTP.
- `components/login-screen.tsx` — login, cadastro, verificação e recuperação de senha.
- `components/astra-orb.tsx` — orbe animado central (estados via CSS/SVG).
- `components/session-view.tsx` — orquestra conexão (`LiveKitRoom`), mostra o usuário
  logado e o botão de sair.
- `components/control-bar.tsx` — mute/câmera/desconectar.
- `components/status-bar.tsx` — rodapé de status da conexão.
- `hooks/use-connection-details.ts` — busca o token em `/api/token`.
