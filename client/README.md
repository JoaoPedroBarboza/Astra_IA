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
- `app/ajuda/page.tsx` — central de ajuda pública (guia de uso e acessibilidade, sem termos
  técnicos). Os planos vêm de `lib/planos.ts`; ao mudar algo visível na interface, revise o
  texto do guia. Links: menu lateral, tela inicial e rodapé do login.
- `app/api/auth/[...all]/route.ts` — endpoints do Better Auth.
- `app/api/token/route.ts` — geração do JWT de acesso à sala (exige sessão).
- `lib/auth.ts` / `lib/auth-client.ts` — configuração do Better Auth (servidor/navegador).
- `lib/db/` — conexão e schema do Postgres (Drizzle).
- `lib/email.ts` — envio dos códigos por SMTP.
- `app/globals.css` — tokens de cor do tema (Tailwind `@theme`), utilitários da marca
  (`panel`, `btn-primary`, `ai-gradient-text`, `bg-grid`...) e animações.
- `components/login-screen.tsx` — login, cadastro, verificação (código em 6 caixas) e
  recuperação de senha, com a vitrine da marca ao lado.
- `components/session-view.tsx` — casca do console: orquestra a conexão (`LiveKitRoom`),
  topo com status e o palco (estado inicial ou sessão ao vivo).
- `components/app-sidebar.tsx` — nova conversa, navegação, histórico, capacidades
  (voz/visão/memória), plano e usuário.
- `components/account-panel.tsx` — "Minha conta": perfil (editar nome), segurança (trocar
  senha, sessões ativas) e catálogo de sistemas corporativos (conectores ainda "em breve").
- `components/astra-orb.tsx` / `astra-orb-scene.tsx` — átomo 3D (three.js, shaders próprios)
  com a estrela do logo no núcleo; muda por estado do agente e reage ao volume da voz.
- `components/voice-visualizer.tsx` — barras reativas ao áudio real da Astra e do microfone.
- `components/control-bar.tsx` — dock de microfone, câmera, tela, dispositivos e encerrar.
- `components/transcript-panel.tsx` — conversa (falas transcritas + mensagens digitadas). O
  texto vai pelo tópico `lk.chat`, que o agente já escuta por padrão, e a resposta volta por
  voz e transcrição. Também mostra as falas salvas de uma conversa do histórico, separadas
  por sessão.
- `components/video-preview.tsx` — o que a Astra está vendo (câmera ou tela).
- `lib/erros-auth.ts` — tradução dos códigos de erro do Better Auth.

### Planos e créditos

- `lib/planos.ts` — planos (Órbita · Gratuito, Nova · Pro, Galáxia · Empresarial e Núcleo ·
  Administrador), preços da OpenAI e cálculo de custo. **1 crédito = US$ 0,01** de uso da
  IA; o limite é por custo real (tokens), não por número de conversas.
- `lib/planos-servidor.ts` — plano do usuário e consumo do mês (ciclo vira à meia-noite de
  Brasília do dia 1º). Sem linha em `plano_usuario`, vale o Órbita.
- `app/api/token` recusa a sessão se o saldo acabou e registra a sala em `sessao_voz`.
- `app/api/uso` recebe do agente os tokens acumulados de cada sala (autenticado por
  `ASTRA_AGENT_SECRET`) e responde se a sessão deve ser encerrada (créditos ou duração).
- `app/api/admin/usuarios` — painel de administração (só plano Núcleo): consumo por usuário
  e troca de plano. Enquanto não há pagamento online, upgrade é feito por aqui.
- Administradores vêm de `ADMIN_EMAILS` no ambiente, não do banco.
- Tabelas em `lib/db/schema-app.ts` (separadas de `schema.ts`, que o Better Auth gera).
### Histórico de conversas

- Cada sessão pertence a uma **conversa** (`conversa`); as falas ficam em `mensagem`, gravadas
  pelo agente em `app/api/historico` (autenticado por `ASTRA_AGENT_SECRET`). Uma conversa
  pode ter várias sessões: "Continuar conversa" abre uma sala nova ligada a ela, e a Astra
  recebe o fim da conversa como contexto.
- `app/api/token?conversa=<id>` continua uma conversa (checando o dono); sem o parâmetro,
  cria uma nova.
- `app/api/conversas` (lista) e `app/api/conversas/[id]` (falas, renomear, apagar) — só do
  usuário logado. Apagar remove as falas, mas **não** o consumo: `sessao_voz.conversa_id`
  vira null e os créditos gastos continuam contando.
- A lista mostra só conversas em que o usuário falou; o título vem do agente (gerado no fim
  da primeira sessão) ou, enquanto não existe, da primeira fala do usuário.
- `lib/conversas.ts` (tipos e agrupamento por data), `lib/conversas-servidor.ts` (consultas),
  `hooks/use-conversas.ts` e `components/history-list.tsx` (menu lateral e gaveta no mobile).
- Durante a sessão ao vivo o histórico fica travado na conversa atual e a transcrição em
  tempo real vem do LiveKit; as falas salvas são relidas quando a sessão termina.

- `components/connection-status.tsx` — pílula de status com duração da sessão.
- `components/brand.tsx` / `icons.tsx` — logo, avatar e ícones compartilhados.
- `hooks/use-connection-details.ts` — busca o token em `/api/token`.
