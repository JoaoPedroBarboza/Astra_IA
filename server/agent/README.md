## Estado do Projeto

### Etapa 1 - Concluída

**Implementações realizadas:**

- Criação do agente **Astra IA**.
- Configuração das API Keys necessárias para o funcionamento da aplicação.
- Atualização das instruções e do comportamento do agente.
- Implementação do botão **M** para alternar entre os modos **Mute** e **Unmute**.
- Integração do **Mem0** como banco de memória para armazenar informações relevantes dos usuários, permitindo que o agente mantenha contexto e personalize as interações ao longo do tempo.
### Etapa 2 - Preparação para produção

- Memória no Mem0 separada por usuário: a chave é o id do usuário no banco do frontend,
  que chega ao agente como identidade do participante na sala.
- Removido o atalho **M** de mute: o `pynput` precisa de um display e quebra o agente em
  servidor. O mute continua disponível pelo botão do frontend.
- Dependências com versões fixas e `Dockerfile` para deploy.

## Modelo de voz, data e pesquisa na internet

- **Modelo:** `gpt-realtime-2.1-mini` (conhecimento até set/2024), com raciocínio em `low`.
  Substitui o `gpt-realtime-mini` (até out/2023), que a OpenAI desliga em 20/01/2027; o
  preço por token é o mesmo. `ASTRA_MODELO_VOZ` troca o modelo sem mudar código.
- **Data:** a data e a hora de Brasília entram nas instruções no início de cada sessão;
  sem isso o modelo não sabe que dia é hoje.
- **Pesquisa (`busca.py`):** a ferramenta `buscar_na_web` deixa a Astra consultar a
  internet para assuntos atuais. A API Realtime não tem a busca da OpenAI embutida, então a
  ferramenta chama a Responses API com `web_search` no `gpt-5.4-mini` (`ASTRA_MODELO_BUSCA`),
  que devolve um resumo curto com o nome das fontes. Leva ~4–8 s; o prompt manda a Astra
  avisar que vai pesquisar.
- **Custo da pesquisa:** US$ 10 por 1.000 buscas mais os tokens do modelo de texto, em
  torno de US$ 0,02–0,03 por pergunta (o modelo pode fazer mais de uma busca). O agente
  envia o consumo no relatório de uso e o app soma aos créditos (`BUSCA_WEB` em
  `client/lib/planos.ts`).

## Consumo e limites de plano

`uso.py` lê os tokens acumulados da sessão (`session.usage`) e o consumo das pesquisas e
os envia ao app em `POST {ASTRA_APP_URL}/api/uso` a cada 15 s e no encerramento,
autenticado por `ASTRA_AGENT_SECRET`. A saída de texto é contada como "saída total menos
áudio", para incluir o raciocínio do modelo. O app converte em créditos, aplica o plano do usuário e responde
se a sessão deve terminar; nesse caso a Astra se despede e o agente apaga a sala.

**Sem `ASTRA_APP_URL` e `ASTRA_AGENT_SECRET` o consumo não é medido nem limitado** — o
agente registra um erro no log a cada sessão.

## Histórico de conversas

`historico.py` grava as falas da sessão (voz transcrita, texto digitado e respostas da
Astra) em `POST {ASTRA_APP_URL}/api/historico`, em lotes a cada ~2 s e no encerramento. O
agente só informa a sala; o app sabe a qual conversa e usuário ela pertence.

- **Continuar uma conversa:** quando a sala continua uma conversa do histórico,
  `GET /api/historico` devolve o fim das sessões anteriores (até ~6 mil caracteres), que
  entra nas **instruções** da Astra. Não entra como mensagens no `chat_ctx` porque, segundo
  a documentação do plugin OpenAI da LiveKit, histórico carregado pode fazer o Realtime
  responder em texto em vez de voz.
- **Título:** no fim da primeira sessão, `gpt-5.4-mini` (ou `ASTRA_MODELO_TITULO`) gera um
  título curto. Custa uma fração de centavo de dólar por conversa e não entra nos créditos.
- `cliente_app.py` é o cliente HTTP compartilhado por `uso.py` e `historico.py`.

## Deploy

O deploy recomendado é no **LiveKit Cloud Agents**, que injeta `LIVEKIT_URL`,
`LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET` sozinho.

```bash
# Windows: winget install LiveKit.LiveKitCLI
cd server/agent
lk cloud auth                      # vincula a CLI ao projeto LiveKit de produção

# Secrets: só as que o LiveKit não injeta. O arquivo fica fora do git e do build.
# .env.production → OPENAI_API_KEY, MEM0_API_KEY, ASTRA_APP_URL (domínio da Vercel)
#                   e ASTRA_AGENT_SECRET (o mesmo valor configurado na Vercel).
# LIVEKIT_URL/API_KEY/API_SECRET NÃO entram: o LiveKit Cloud injeta e não aceita como secret.
lk agent create --secrets-file=.env.production   # primeira vez (gera o livekit.toml)
#   com ASTRA_APP_URL ainda vazia, acrescente --ignore-empty-secrets
lk agent deploy                                   # versões seguintes (código novo)
lk agent update-secrets --secrets-file=.env.production   # trocar secrets (reinicia o agente)

lk agent status                    # estado, região e réplicas
lk agent logs                      # logs em tempo real
lk agent logs --log-type=build     # log do build
```

O build roda na nuvem da LiveKit a partir do `Dockerfile` (não precisa de Docker local) e
usa a região mais próxima, se `--region` não for informado.

**Agente local e da nuvem no mesmo projeto LiveKit:** os dois ficam disponíveis para as
mesmas salas, e cada sessão pode cair em qualquer um. Depois do deploy, não rode o
`python agent.py dev` contra o projeto de produção; para desenvolver, use outro projeto
LiveKit no `.env` local.

No plano gratuito o agente desliga sem uso e leva ~10–20 s para subir na próxima conexão.
Antes de uma apresentação, conecte uma vez para "acordá-lo".

Para rodar em container próprio (VPS, Railway), use o mesmo `Dockerfile`, passe as cinco
variáveis do `.env.example` e dê tempo para o agente salvar a memória ao parar:
`docker run -d --restart unless-stopped --stop-timeout 600 --env-file .env <imagem>`.
