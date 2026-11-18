"""Cliente HTTP das rotas do app (client/) que o agente chama: /api/uso e /api/historico.

Autentica com `Authorization: Bearer <ASTRA_AGENT_SECRET>` e reaproveita uma conexão só
para a sessão inteira. Medidor de uso e histórico usam o mesmo cliente, e quem o fecha
é o agent.py, depois que os dois terminam de enviar o que faltava.
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

import aiohttp

logger = logging.getLogger("astra.app")


class ClienteApp:
    def __init__(self) -> None:
        self._url = os.getenv("ASTRA_APP_URL", "").rstrip("/")
        self._segredo = os.getenv("ASTRA_AGENT_SECRET", "")
        self._http: aiohttp.ClientSession | None = None
        self.ativo = bool(self._url and self._segredo)
        if not self.ativo:
            # Sem isso nada chega ao app: em produção é um erro grave.
            logger.error(
                "ASTRA_APP_URL e/ou ASTRA_AGENT_SECRET ausentes: o consumo desta sessão NÃO "
                "será medido nem limitado pelo plano, e a conversa NÃO irá para o histórico."
            )

    def _sessao(self) -> aiohttp.ClientSession:
        if self._http is None or self._http.closed:
            self._http = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=10),
                headers={"Authorization": f"Bearer {self._segredo}"},
            )
        return self._http

    async def chamar(
        self,
        metodo: str,
        caminho: str,
        *,
        json: Any = None,
        params: dict[str, str] | None = None,
        tentativas: int = 1,
    ) -> dict | None:
        """Devolve o JSON da resposta 200, ou None se não deu (app fora, recusa, timeout).

        Repete só falhas de rede e erros 5xx; um 4xx é definitivo (repetir daria o mesmo).
        """
        if not self.ativo:
            return None
        for tentativa in range(1, tentativas + 1):
            try:
                async with self._sessao().request(
                    metodo, f"{self._url}{caminho}", json=json, params=params
                ) as resposta:
                    if resposta.status == 200:
                        return await resposta.json()
                    texto = await resposta.text()
                    logger.warning("%s %s recusado (%s): %s", metodo, caminho, resposta.status, texto[:200])
                    if resposta.status < 500:
                        return None
            except asyncio.CancelledError:
                raise
            except Exception as e:  # rede, timeout, app fora do ar
                logger.warning(
                    "Falha em %s %s (tentativa %d/%d): %s", metodo, caminho, tentativa, tentativas, e
                )
            if tentativa < tentativas:
                await asyncio.sleep(1.5 * tentativa)
        return None

    async def fechar(self) -> None:
        if self._http and not self._http.closed:
            await self._http.close()
