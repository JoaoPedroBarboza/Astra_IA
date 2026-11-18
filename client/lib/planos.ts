/**
 * Planos e cálculo de consumo. Compartilhado entre servidor e navegador: aqui só há
 * definições e contas puras — nada que acesse o banco.
 *
 * O limite é por CUSTO (tokens convertidos em créditos), não por número de conversas:
 * uma conversa pode durar 30 segundos ou 40 minutos, e o áudio de saída custa o dobro
 * do de entrada. Medir o custo real é o que protege o saldo da API.
 */

export type PlanoId = "orbita" | "nova" | "galaxia" | "nucleo";

export type Plano = {
  id: PlanoId;
  nome: string;
  categoria: string;
  /** null = não está à venda (plano interno). */
  precoMensalBRL: number | null;
  /** null = ilimitado. */
  creditosMensais: number | null;
  /** Duração máxima de cada sessão, em minutos. null = sem limite. */
  duracaoMaxMin: number | null;
  resumo: string;
  extras: string[];
  destaque?: boolean;
  /** Só o administrador atribui; não aparece na vitrine de planos. */
  interno?: boolean;
};

export const PLANOS: Record<PlanoId, Plano> = {
  orbita: {
    id: "orbita",
    nome: "Órbita",
    categoria: "Gratuito",
    precoMensalBRL: 0,
    creditosMensais: 100,
    duracaoMaxMin: 10,
    resumo: "Para conhecer a Astra.",
    extras: ["Voz, texto, câmera e tela", "Memória entre conversas"],
  },
  nova: {
    id: "nova",
    nome: "Nova",
    categoria: "Pro",
    precoMensalBRL: 49.9,
    creditosMensais: 400,
    duracaoMaxMin: 30,
    resumo: "Para o dia a dia de trabalho.",
    extras: ["Tudo do Órbita"],
    destaque: true,
  },
  galaxia: {
    id: "galaxia",
    nome: "Galáxia",
    categoria: "Empresarial",
    precoMensalBRL: 199.9,
    creditosMensais: 1500,
    duracaoMaxMin: 60,
    resumo: "Para uso intenso e equipes.",
    extras: ["Tudo do Nova", "Sistemas corporativos, quando liberados"],
  },
  nucleo: {
    id: "nucleo",
    nome: "Núcleo",
    categoria: "Administrador",
    precoMensalBRL: null,
    creditosMensais: null,
    duracaoMaxMin: null,
    resumo: "Acesso total para a administração do sistema.",
    extras: ["Gestão de usuários e planos", "Painel de consumo da API"],
    interno: true,
  },
};

export const PLANO_PADRAO: PlanoId = "orbita";
export const PLANOS_A_VENDA = (Object.values(PLANOS) as Plano[]).filter((p) => !p.interno);

export function ehPlanoId(valor: unknown): valor is PlanoId {
  return typeof valor === "string" && valor in PLANOS;
}

// ── Custo ──────────────────────────────────────────────────────────────────

/** 1 crédito = US$ 0,01 de custo de IA. O gratuito (US$ 1/mês) vira 100 créditos. */
export const USD_POR_CREDITO = 0.01;

/**
 * Modelo de voz (gpt-realtime-2.1-mini), US$ por 1 milhão de tokens. Conferido em
 * 18/11/2026 em https://developers.openai.com/api/docs/pricing — iguais aos do
 * gpt-realtime-mini, o modelo anterior. Atualize aqui se a OpenAI mudar.
 */
export const PRECO_USD_POR_MILHAO = {
  entradaTexto: 0.6,
  entradaTextoCache: 0.06,
  entradaAudio: 10,
  entradaAudioCache: 0.3,
  entradaImagem: 0.8,
  entradaImagemCache: 0.08,
  saidaTexto: 2.4,
  saidaAudio: 20,
} as const;

/**
 * Transcrição da fala do usuário (gpt-4o-mini-transcribe), cobrada à parte pela
 * OpenAI e não reportada nos tokens do modelo de voz. Estimada pela duração da sessão
 * inteira — conservador, já que o usuário não fala o tempo todo.
 */
export const TRANSCRICAO_USD_POR_MINUTO = 0.003;

/**
 * Pesquisa na internet (server/agent/busca.py): a ferramenta web_search da OpenAI rodando
 * no gpt-5.4-mini. Cada busca custa a taxa fixa mais os tokens do modelo de texto (o
 * conteúdo das páginas lidas entra como tokens de entrada). Conferido em 18/11/2026; se
 * ASTRA_MODELO_BUSCA mudar no agente, ajuste os preços por token.
 */
export const BUSCA_WEB = {
  usdPorBusca: 0.01, // US$ 10 por 1.000 buscas
  entradaUsdPorMilhao: 0.75,
  entradaCacheUsdPorMilhao: 0.075,
  saidaUsdPorMilhao: 4.5,
} as const;

/** Consumo das pesquisas de uma sessão, acumulado pelo agente. Entrada inclui o cache. */
export type UsoBusca = { buscas: number; entrada: number; entradaCache: number; saida: number };

export const CAMPOS_BUSCA: (keyof UsoBusca)[] = ["buscas", "entrada", "entradaCache", "saida"];

export function custoBuscaUsd(b: UsoBusca) {
  const p = BUSCA_WEB;
  const semCache = Math.max(0, b.entrada - b.entradaCache);
  return (
    b.buscas * p.usdPorBusca +
    (semCache * p.entradaUsdPorMilhao + b.entradaCache * p.entradaCacheUsdPorMilhao + b.saida * p.saidaUsdPorMilhao) /
      1_000_000
  );
}

/**
 * Custo médio de 1 minuto de conversa, só para mostrar estimativas ("≈ 30 min").
 * Ajuste com o consumo real que o painel de administração mostrar.
 */
export const CUSTO_MEDIO_MINUTO_USD = 0.03;

export type Tokens = {
  entradaTexto: number;
  entradaTextoCache: number;
  entradaAudio: number;
  entradaAudioCache: number;
  entradaImagem: number;
  entradaImagemCache: number;
  saidaTexto: number;
  saidaAudio: number;
};

export const CAMPOS_TOKENS = Object.keys(PRECO_USD_POR_MILHAO) as (keyof Tokens)[];

/**
 * Os totais de entrada da OpenAI já incluem a parte servida do cache; por isso o cache
 * é subtraído do total antes de aplicar o preço cheio.
 */
export function custoUsd(t: Tokens, duracaoS: number) {
  const p = PRECO_USD_POR_MILHAO;
  const semCache = (total: number, cache: number) => Math.max(0, total - cache);
  const porMilhao =
    semCache(t.entradaTexto, t.entradaTextoCache) * p.entradaTexto +
    t.entradaTextoCache * p.entradaTextoCache +
    semCache(t.entradaAudio, t.entradaAudioCache) * p.entradaAudio +
    t.entradaAudioCache * p.entradaAudioCache +
    semCache(t.entradaImagem, t.entradaImagemCache) * p.entradaImagem +
    t.entradaImagemCache * p.entradaImagemCache +
    t.saidaTexto * p.saidaTexto +
    t.saidaAudio * p.saidaAudio;
  return porMilhao / 1_000_000 + (duracaoS / 60) * TRANSCRICAO_USD_POR_MINUTO;
}

export function usdParaCreditos(usd: number) {
  return usd / USD_POR_CREDITO;
}

/** "≈ 30 min", "≈ 2 h" — estimativa de conversa que cabe numa quantidade de créditos. */
export function tempoEstimado(creditos: number) {
  const minutos = (creditos * USD_POR_CREDITO) / CUSTO_MEDIO_MINUTO_USD;
  // Espaços inseparáveis: "≈ 35 min" nunca quebra no meio da linha.
  const s = " ";
  if (minutos < 1) return `menos de 1${s}min`;
  if (minutos < 10) return `≈${s}${Math.round(minutos)}${s}min`;
  if (minutos < 90) return `≈${s}${Math.round(minutos / 5) * 5}${s}min`;
  return `≈${s}${Math.round(minutos / 60)}${s}h`;
}

// ── Ciclo mensal ─────────────────────────────────────────────────────────

// O ciclo vira à meia-noite de Brasília. O Brasil não tem horário de verão desde 2019,
// então o deslocamento fixo de -3h é exato.
const BRT_MS = 3 * 60 * 60 * 1000;

export function inicioDoCiclo(agora = new Date()) {
  const brt = new Date(agora.getTime() - BRT_MS);
  return new Date(Date.UTC(brt.getUTCFullYear(), brt.getUTCMonth(), 1) + BRT_MS);
}

export function fimDoCiclo(agora = new Date()) {
  const inicio = new Date(inicioDoCiclo(agora).getTime() - BRT_MS);
  return new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 1) + BRT_MS);
}

// ── Resumo exibido no app ────────────────────────────────────────────────

export type ResumoPlano = {
  plano: PlanoId;
  /** null = ilimitado. */
  limiteCreditos: number | null;
  usadosCreditos: number;
  /** null = ilimitado. */
  restantesCreditos: number | null;
  /** ISO 8601. */
  renovaEm: string;
  admin: boolean;
};

export function formatarCreditos(creditos: number) {
  return Math.round(creditos).toLocaleString("pt-BR");
}

export function formatarPreco(brl: number) {
  return brl.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
