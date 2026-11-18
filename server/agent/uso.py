"""Medição de consumo da sessão e limites de plano.

O agente só MEDE: lê os tokens acumulados da sessão (session.usage) e os envia ao app
(POST /api/uso) a cada INTERVALO_S segundos e no encerramento. Quem conhece plano,
preços e saldo é o app, e a resposta dele diz se a sessão deve ser encerrada — assim
mudar preços ou limites não exige redeploy do agente.

Os totais enviados são acumulados da sessão inteira; o app grava com greatest(), então
um relatório repetido (por nova tentativa) nunca cobra duas vezes.
"""

from __future__ import annotations

import asyncio
import logging
import time
from collections.abc import Awaitable, Callable

from livekit.agents import AgentSession
from livekit.agents.metrics import LLMModelUsage

from cliente_app import ClienteApp

logger = logging.getLogger("astra.uso")

INTERVALO_S = 15

CAMPOS = (
    "entradaTexto",
    "entradaTextoCache",
    "entradaAudio",
    "entradaAudioCache",
    "entradaImagem",
    "entradaImagemCache",
    "saidaTexto",
    "saidaAudio",
)


class MedidorDeUso:
    def __init__(self, session: AgentSession, sala: str, cliente: ClienteApp) -> None:
        self._session = session
        self._sala = sala
        self._cliente = cliente
        self._inicio = time.monotonic()
        self._tarefa: asyncio.Task[None] | None = None
        self._encerrando = False

    def _tokens(self) -> dict[str, int]:
        t = dict.fromkeys(CAMPOS, 0)
        # O modelo de voz (Realtime) aparece como LLMModelUsage; os totais de entrada já
        # incluem a parte servida do cache, que o app separa ao calcular o custo.
        for u in self._session.usage.model_usage:
            if isinstance(u, LLMModelUsage):
                t["entradaTexto"] += u.input_text_tokens
                t["entradaTextoCache"] += u.input_cached_text_tokens
                t["entradaAudio"] += u.input_audio_tokens
                t["entradaAudioCache"] += u.input_cached_audio_tokens
                t["entradaImagem"] += u.input_image_tokens
                t["entradaImagemCache"] += u.input_cached_image_tokens
                t["saidaTexto"] += u.output_text_tokens
                t["saidaAudio"] += u.output_audio_tokens
        return t

    async def reportar(self, final: bool = False) -> dict | None:
        corpo = {
            "sala": self._sala,
            "duracaoS": int(time.monotonic() - self._inicio),
            "tokens": self._tokens(),
            "final": final,
        }
        # O relatório final é o que fecha a conta da sessão: vale insistir um pouco.
        return await self._cliente.chamar("POST", "/api/uso", json=corpo, tentativas=3 if final else 1)

    def iniciar(self, ao_encerrar: Callable[[str], Awaitable[None]]) -> None:
        """Reporta periodicamente e chama ao_encerrar(motivo) quando o app mandar parar."""
        if not self._cliente.ativo:
            return

        async def ciclo() -> None:
            while True:
                await asyncio.sleep(INTERVALO_S)
                resposta = await self.reportar()
                if resposta and resposta.get("encerrar"):
                    self._encerrando = True
                    await ao_encerrar(resposta.get("motivo") or "creditos")
                    return

        self._tarefa = asyncio.create_task(ciclo())

    async def finalizar(self) -> None:
        # Durante o encerramento por limite a tarefa está apagando a sala; cancelá-la
        # no meio poderia interromper essa chamada.
        if self._tarefa and not self._encerrando:
            self._tarefa.cancel()
        await self.reportar(final=True)
