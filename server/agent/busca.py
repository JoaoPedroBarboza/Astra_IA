"""Pesquisa na internet para a Astra (ferramenta buscar_na_web).

O modelo de voz (Realtime) não tem a busca da OpenAI embutida. Por isso a ferramenta
chama a Responses API com a ferramenta `web_search` num modelo de texto, que pesquisa e
devolve um resumo curto com o nome das fontes; a Astra responde em voz a partir dele.

Custo: cada busca feita pelo modelo (item `web_search_call`) é cobrada à parte pela
OpenAI, além dos tokens do modelo de texto. O consumo fica acumulado em `uso` e o
medidor (uso.py) o envia ao app, que converte em créditos com os preços de
client/lib/planos.ts (BUSCA_WEB).
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
import time

from openai import AsyncOpenAI

logger = logging.getLogger("astra.busca")

# Os preços em client/lib/planos.ts (BUSCA_WEB) são os deste modelo: ao trocar, ajuste lá.
MODELO_BUSCA = os.getenv("ASTRA_MODELO_BUSCA", "gpt-5.4-mini")
# Em voz, esperar mais que isso já parece que a Astra travou.
TEMPO_MAX_S = 20
RESPOSTA_MAX_CHARS = 1500

INSTRUCAO = (
    "Você pesquisa na internet para uma assistente de voz que vai falar a resposta. Hoje é "
    "{hoje}. Responda em português do Brasil, em no máximo 5 frases curtas, só com os fatos "
    "que respondem ao pedido: números, datas e lugares exatos. Diga de onde veio a "
    "informação pelo nome do site ou do veículo, sem links. Se não encontrar, se as fontes "
    "divergirem ou se o dado for antigo, diga isso claramente. Nunca invente."
)

# "([g1.globo.com](https://...))" → "(g1.globo.com)": links não servem para quem ouve.
_LINK_MD = re.compile(r"\[([^\]]+)\]\((?:https?://)[^)]*\)")


def _para_fala(texto: str) -> str:
    texto = _LINK_MD.sub(r"\1", texto)
    texto = texto.replace("**", "").replace("__", "")
    texto = " ".join(texto.split())
    if len(texto) > RESPOSTA_MAX_CHARS:
        texto = texto[:RESPOSTA_MAX_CHARS].rsplit(" ", 1)[0] + "…"
    return texto


class BuscaWeb:
    """Faz as pesquisas de uma sessão e acumula o consumo para o medidor de uso."""

    def __init__(self, hoje: str) -> None:
        self._hoje = hoje
        self._openai: AsyncOpenAI | None = None
        # Totais da sessão, no formato que POST /api/uso espera em "busca".
        self.uso = {"buscas": 0, "entrada": 0, "entradaCache": 0, "saida": 0}

    async def pesquisar(self, consulta: str) -> str:
        consulta = " ".join(consulta.split())[:500]
        if not consulta:
            return "Nenhuma pesquisa feita: a consulta veio vazia."

        if self._openai is None:
            self._openai = AsyncOpenAI()
        inicio = time.monotonic()
        try:
            resposta = await asyncio.wait_for(
                self._openai.responses.create(
                    model=MODELO_BUSCA,
                    instructions=INSTRUCAO.format(hoje=self._hoje),
                    input=consulta,
                    tools=[{
                        "type": "web_search",
                        # "low" basta para perguntas pontuais e deixa a busca mais rápida.
                        "search_context_size": "low",
                        "user_location": {
                            "type": "approximate",
                            "country": "BR",
                            "timezone": "America/Sao_Paulo",
                        },
                    }],
                    reasoning={"effort": "low"},
                ),
                timeout=TEMPO_MAX_S,
            )
        except asyncio.TimeoutError:
            logger.warning("Busca sem resposta em %ss: %r", TEMPO_MAX_S, consulta)
            return (
                "A pesquisa demorou demais e não trouxe resultado. Avise o usuário e pergunte se "
                "ele quer tentar de novo."
            )
        except Exception as e:
            logger.error("Falha na busca %r: %s", consulta, e)
            return (
                "A pesquisa na internet falhou agora. Avise o usuário e não responda com "
                "informações atuais que você não pesquisou."
            )

        self._contabilizar(resposta)
        texto = _para_fala(resposta.output_text or "")
        logger.info(
            "Busca em %.1fs (%d chamadas): %r", time.monotonic() - inicio, self._buscas(resposta), consulta
        )
        return texto or "A pesquisa não encontrou nada sobre isso."

    @staticmethod
    def _buscas(resposta) -> int:
        return sum(1 for item in resposta.output if item.type == "web_search_call")

    def _contabilizar(self, resposta) -> None:
        self.uso["buscas"] += self._buscas(resposta)
        u = resposta.usage
        if u is None:
            return
        detalhes = getattr(u, "input_tokens_details", None)
        self.uso["entrada"] += u.input_tokens or 0
        self.uso["entradaCache"] += getattr(detalhes, "cached_tokens", 0) or 0
        # Inclui os tokens de raciocínio, cobrados como saída.
        self.uso["saida"] += u.output_tokens or 0

    async def fechar(self) -> None:
        if self._openai is not None:
            await self._openai.close()
            self._openai = None
