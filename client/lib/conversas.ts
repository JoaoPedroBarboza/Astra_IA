/** Tipos e utilitários do histórico de conversas usados no navegador e no servidor. */

export type Papel = "usuario" | "astra";

export type ConversaResumo = {
  id: string;
  /** Título salvo ou, sem ele, o começo da primeira fala do usuário. */
  titulo: string;
  /** ISO 8601 (UTC). */
  atualizadaEm: string;
  mensagens: number;
};

export type MensagemSalva = {
  /** `${sala}:${itemId}` — único entre as sessões da conversa. */
  id: string;
  sala: string;
  papel: Papel;
  texto: string;
  digitada: boolean;
  /** ISO 8601 (UTC). */
  criadaEm: string;
};

export type ConversaDetalhe = {
  id: string;
  titulo: string;
  criadaEm: string;
  atualizadaEm: string;
  mensagens: MensagemSalva[];
};

export const TITULO_MAX = 80;
export const TITULO_PADRAO = "Conversa sem título";

/** Título exibido: o salvo, senão a primeira fala do usuário encurtada. */
export function tituloExibido(titulo: string | null, primeiraFala: string | null) {
  if (titulo?.trim()) return titulo.trim();
  const fala = primeiraFala?.replace(/\s+/g, " ").trim();
  if (!fala) return TITULO_PADRAO;
  return fala.length > 60 ? `${fala.slice(0, 57).trimEnd()}…` : fala;
}

const FUSO = "America/Sao_Paulo";
const chaveDoDia = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" });

/** Dias inteiros entre duas datas no calendário de Brasília (0 = mesmo dia). */
function diasEntre(a: Date, b: Date) {
  const dia = (d: Date) => Date.parse(`${chaveDoDia.format(d)}T00:00:00Z`);
  return Math.round((dia(b) - dia(a)) / 86_400_000);
}

/** Agrupa a lista (já ordenada da mais recente) como os assistentes de IA fazem. */
export function agruparPorData(lista: ConversaResumo[], agora = new Date()) {
  const grupos: { rotulo: string; itens: ConversaResumo[] }[] = [];
  for (const c of lista) {
    const dias = diasEntre(new Date(c.atualizadaEm), agora);
    const rotulo =
      dias <= 0 ? "Hoje" : dias === 1 ? "Ontem" : dias < 7 ? "Últimos 7 dias" : dias < 30 ? "Últimos 30 dias" : "Mais antigas";
    const ultimo = grupos.at(-1);
    if (ultimo?.rotulo === rotulo) ultimo.itens.push(c);
    else grupos.push({ rotulo, itens: [c] });
  }
  return grupos;
}

const formatoDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: FUSO,
});

export function formatarDataHora(iso: string) {
  return formatoDataHora.format(new Date(iso));
}
