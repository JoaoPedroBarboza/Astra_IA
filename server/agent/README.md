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

## Deploy

O deploy recomendado é no **LiveKit Cloud Agents**, que injeta `LIVEKIT_URL`,
`LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET` sozinho.

```bash
# Windows: winget install LiveKit.LiveKitCLI
cd server/agent
lk cloud auth                      # vincula a CLI ao projeto LiveKit de produção

# Secrets: só as que o LiveKit não injeta. O arquivo fica fora do git e do build.
# .env.production → OPENAI_API_KEY=...  e  MEM0_API_KEY=...
lk agent create --secrets-file=.env.production   # primeira vez (gera o livekit.toml)
lk agent deploy                                   # versões seguintes

lk agent status                    # estado e réplicas
lk agent logs                      # logs em tempo real
lk agent logs --log-type=build     # log do build
```

No plano gratuito o agente desliga sem uso e leva ~10–20 s para subir na próxima conexão.
Antes de uma apresentação, conecte uma vez para "acordá-lo".

Para rodar em container próprio (VPS, Railway), use o mesmo `Dockerfile`, passe as cinco
variáveis do `.env.example` e dê tempo para o agente salvar a memória ao parar:
`docker run -d --restart unless-stopped --stop-timeout 600 --env-file .env <imagem>`.
