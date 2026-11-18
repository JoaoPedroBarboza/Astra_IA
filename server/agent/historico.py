"""Histórico de conversas: grava as falas da sessão no app e carrega o contexto ao continuar.

- Cada fala que entra no histórico da sessão (voz transcrita, texto digitado ou resposta
  da Astra) vai para POST /api/historico, agrupada em lotes a cada poucos segundos. Gravar
  durante a sessão, e não só no fim, evita perder a conversa se o agente cair.
- Ao continuar uma conversa, GET /api/historico devolve o fim das sessões anteriores, que
  entra nas instruções da Astra para ela retomar o assunto.
- No fim da primeira sessão, um modelo de texto barato dá um título curto à conversa.

O agente só conhece a sala; é o app que sabe a qual conversa (e usuário) ela pertence.
"""

from __future__ import annotations

import asyncio
import logging
import os

from livekit.agents import AgentSession, ChatMessage
from livekit.agents.voice.events import ConversationItemAddedEvent
from openai import AsyncOpenAI

from cliente_app import ClienteApp

logger = logging.getLogger("astra.historico")

# Agrupa falas próximas num envio só.
INTERVALO_ENVIO_S = 2.0
# Espera depois de um envio que falhou (app fora do ar), para não insistir sem parar.
ESPERA_APOS_FALHA_S = 10.0
LOTE_MAX = 100
# Quanto da conversa anterior a Astra recebe ao continuar (~1.500 tokens de texto).
CONTEXTO_MAX_CHARS = 6000
MODELO_TITULO = os.getenv("ASTRA_MODELO_TITULO", "gpt-4o-mini")

INSTRUCAO_TITULO = (
    "Você dá títulos a conversas entre um usuário e a assistente de voz Astra. Responda só "
    "com o título: de 2 a 6 palavras, em português do Brasil, sem aspas e sem ponto final, "
    "dizendo o assunto principal. Ignore cumprimentos e despedidas."
)


class Historico:
    def __init__(self, cliente: ClienteApp, sala: str) -> None:
        self._cliente = cliente
        self._sala = sala
        self._session: AgentSession | None = None
        # Itens que já estavam no contexto inicial (ex.: a memória do Mem0): não são falas.
        self._ignorar: set[str] = set()
        self._pendentes: dict[str, dict] = {}
        # id → texto já gravado; um reenvio só acontece se o texto mudar.
        self._gravadas: dict[str, str] = {}
        self._falas: dict[str, dict] = {}
        self._tarefa: asyncio.Task[None] | None = None
        self._trava = asyncio.Lock()
        self.retomada = False

    # ---- contexto ao continuar ------------------------------------------------------

    async def carregar_contexto(self) -> str | None:
        """Fim das sessões anteriores da conversa, como texto, ou None se ela é nova."""
        resposta = await self._cliente.chamar(
            "GET", "/api/historico", params={"sala": self._sala}, tentativas=2
        )
        linhas = []
        for m in (resposta or {}).get("mensagens") or []:
            texto = " ".join(str(m.get("texto") or "").split())
            if texto:
                quem = "Usuário" if m.get("papel") == "usuario" else "Astra"
                linhas.append(f"{quem}: {texto}")
        if not linhas:
            return None

        # O fim da conversa é o que importa para retomar: corta pelo começo.
        trecho: list[str] = []
        total = 0
        for linha in reversed(linhas):
            if total + len(linha) > CONTEXTO_MAX_CHARS:
                break
            trecho.append(linha)
            total += len(linha) + 1
        if not trecho:  # uma única fala maior que o limite
            trecho = ["…" + linhas[-1][-CONTEXTO_MAX_CHARS:]]

        self.retomada = True
        logger.info("Continuando conversa: %d falas anteriores no contexto", len(trecho))
        return "\n".join(reversed(trecho))

    # ---- gravação das falas ---------------------------------------------------------

    def acompanhar(self, session: AgentSession, ignorar: set[str] | None = None) -> None:
        """Passa a gravar as falas da sessão. Chamar antes de session.start()."""
        self._session = session
        self._ignorar = set(ignorar or ())
        if not self._cliente.ativo:
            return
        session.on("conversation_item_added", self._ao_adicionar)

    def _ao_adicionar(self, ev: ConversationItemAddedEvent) -> None:
        if self._registrar(ev.item) and (self._tarefa is None or self._tarefa.done()):
            self._tarefa = asyncio.create_task(self._ciclo_envio())

    def _registrar(self, item: object) -> bool:
        if not isinstance(item, ChatMessage) or item.role not in ("user", "assistant"):
            return False
        if item.id in self._ignorar:
            return False
        texto = (item.text_content or "").strip()
        if not texto or self._gravadas.get(item.id) == texto:
            return False

        fala = {
            "id": item.id,
            "papel": "usuario" if item.role == "user" else "astra",
            "texto": texto,
            "criadaEm": item.created_at,
            # Voz transcrita sempre vem com a confiança da transcrição; o texto digitado
            # (tópico lk.chat) entra no histórico sem ela.
            "digitada": item.role == "user" and item.transcript_confidence is None,
        }
        self._pendentes[item.id] = fala
        self._falas[item.id] = fala
        return True

    async def _ciclo_envio(self) -> None:
        while self._pendentes:
            await asyncio.sleep(INTERVALO_ENVIO_S)
            if not await self._enviar():
                await asyncio.sleep(ESPERA_APOS_FALHA_S)

    async def _enviar(self, *, final: bool = False, titulo: str | None = None) -> dict | None:
        """Envia o que está pendente (em lotes). Devolve a última resposta, ou None se falhou."""
        async with self._trava:
            lote_todo = list(self._pendentes.values())
            resposta: dict | None = None
            inicio = 0
            while True:
                lote = lote_todo[inicio : inicio + LOTE_MAX]
                inicio += LOTE_MAX
                ultimo = inicio >= len(lote_todo)
                corpo: dict = {"sala": self._sala, "mensagens": lote}
                if titulo and ultimo:
                    corpo["titulo"] = titulo
                resposta = await self._cliente.chamar(
                    "POST", "/api/historico", json=corpo, tentativas=3 if final else 1
                )
                if resposta is None:
                    return None
                for fala in lote:
                    self._gravadas[fala["id"]] = fala["texto"]
                    # Só sai da fila se não mudou enquanto era enviada.
                    if self._pendentes.get(fala["id"]) is fala:
                        del self._pendentes[fala["id"]]
                if ultimo:
                    return resposta

    async def finalizar(self) -> None:
        """Grava o que faltou e, se a conversa ainda não tem título, gera um."""
        if not self._cliente.ativo:
            return
        if self._tarefa:
            self._tarefa.cancel()
        # Recolhe o que o evento não entregou (ex.: a fala interrompida pelo encerramento).
        if self._session is not None:
            for item in self._session.history.items:
                self._registrar(item)

        resposta = await self._enviar(final=True)
        if resposta is None:
            if self._pendentes:
                logger.error("%d falas não foram para o histórico", len(self._pendentes))
            return

        if resposta.get("precisaTitulo") and any(f["papel"] == "usuario" for f in self._falas.values()):
            titulo = await self._gerar_titulo()
            if titulo:
                await self._enviar(final=True, titulo=titulo)

    async def _gerar_titulo(self) -> str | None:
        falas = sorted(self._falas.values(), key=lambda f: f["criadaEm"])
        linhas = [f"{'Usuário' if f['papel'] == 'usuario' else 'Astra'}: {f['texto']}" for f in falas]
        conversa = "\n".join(linhas)[:4000]
        try:
            async with AsyncOpenAI() as openai:
                resposta = await asyncio.wait_for(
                    openai.chat.completions.create(
                        model=MODELO_TITULO,
                        messages=[
                            {"role": "system", "content": INSTRUCAO_TITULO},
                            {"role": "user", "content": conversa},
                        ],
                        max_tokens=24,
                        temperature=0.3,
                    ),
                    timeout=15,
                )
        except Exception as e:
            # Sem título a conversa aparece com o começo da primeira fala do usuário.
            logger.warning("Não foi possível gerar o título da conversa: %s", e)
            return None
        titulo = (resposta.choices[0].message.content or "").strip().strip("\"'“”").rstrip(".").strip()
        return titulo[:80] or None
