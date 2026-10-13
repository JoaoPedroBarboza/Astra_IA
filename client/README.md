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
  (usa `livekit-server-sdk`), sem expor `LIVEKIT_API_SECRET` ao navegador.
- Sem transcript de texto, sem autenticação de usuários, sem múltiplas salas — escopo
  mínimo intencional para esta fase.

## Rodando

```bash
npm install
cp .env.local.example .env.local   # preencha com as credenciais reais
npm run dev
```

Abra `http://localhost:3000`. É necessário que o worker do agente
(`server/agent/agent.py`, modo `dev`) esteja rodando e configurado com o mesmo projeto
LiveKit — veja o README na raiz do repositório.

## Estrutura

- `app/api/token/route.ts` — geração do JWT de acesso à sala.
- `components/astra-orb.tsx` — orbe animado central (estados via CSS/SVG).
- `components/session-view.tsx` — orquestra conexão (`LiveKitRoom`) e alterna entre a
  tela de acesso e a sessão ativa.
- `components/control-bar.tsx` — mute/câmera/desconectar.
- `components/status-bar.tsx` — rodapé de status da conexão.
- `hooks/use-connection-details.ts` — busca o token em `/api/token`.
