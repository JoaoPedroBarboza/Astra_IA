# Astra IA

Assistente de IA por voz e visão computacional em tempo real, com memória de longo prazo
(Mem0) e streaming de áudio via LiveKit. Projeto de TCC.

## Estrutura

- `server/agent/` — worker Python (LiveKit Agents + Gemini Realtime + Mem0). Já existente.
- `client/` — frontend web em Next.js que conecta o usuário à sala LiveKit onde o agente
  atua. Ver [client/README.md](client/README.md) para detalhes da interface.

## Como rodar localmente (2 processos em paralelo)

Os dois processos precisam apontar para o **mesmo projeto/credenciais LiveKit**.

**Terminal 1 — agente Python:**

```bash
cd server/agent
# ambiente virtual já existe em server/agent/venv; ative-o antes:
#   Windows: venv\Scripts\activate
pip install -r requirements.txt
python agent.py dev
```

Preencha `server/agent/.env` com `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`,
`GOOGLE_API_KEY` e `MEM0_API_KEY` (não versionado).

**Terminal 2 — frontend Next.js:**

```bash
cd client
npm install
npm run dev
```

Copie `client/.env.local.example` para `client/.env.local` e preencha com as **mesmas**
credenciais LiveKit usadas pelo agente.

Acesse `http://localhost:3000`, clique em **Conectar** e permita microfone (e câmera,
opcional) no navegador. O worker Python é despachado automaticamente para a sala criada
pelo frontend.
