/**
 * Tabelas do próprio app. Ficam separadas de schema.ts porque aquele arquivo é gerado
 * pelo Better Auth (`npm run auth:schema`) e seria sobrescrito.
 */
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./schema";

/** Plano atribuído ao usuário. Sem linha aqui, vale o plano padrão (Órbita). */
export const planoUsuario = pgTable("plano_usuario", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  plano: text("plano").notNull(),
  atualizadoEm: timestamp("atualizado_em").defaultNow().notNull(),
  /** Id do administrador que fez a última troca. */
  atualizadoPor: text("atualizado_por"),
});

/**
 * Uma linha por sala de voz. Criada quando o token é emitido e atualizada pelo agente
 * com os totais ACUMULADOS da sessão — reenviar o mesmo relatório não soma de novo.
 */
export const sessaoVoz = pgTable(
  "sessao_voz",
  {
    sala: text("sala").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Plano no momento em que a sessão começou (histórico). */
    plano: text("plano").notNull(),
    /**
     * Conversa à qual a sessão pertence. Apagar a conversa só desliga o vínculo: a linha
     * de consumo continua, senão apagar o histórico devolveria os créditos gastos.
     */
    conversaId: text("conversa_id").references(() => conversa.id, { onDelete: "set null" }),
    iniciadaEm: timestamp("iniciada_em").defaultNow().notNull(),
    atualizadaEm: timestamp("atualizada_em").defaultNow().notNull(),
    encerradaEm: timestamp("encerrada_em"),
    motivoEncerramento: text("motivo_encerramento"),
    duracaoS: integer("duracao_s").default(0).notNull(),
    tokensEntradaTexto: integer("tokens_entrada_texto").default(0).notNull(),
    tokensEntradaTextoCache: integer("tokens_entrada_texto_cache").default(0).notNull(),
    tokensEntradaAudio: integer("tokens_entrada_audio").default(0).notNull(),
    tokensEntradaAudioCache: integer("tokens_entrada_audio_cache").default(0).notNull(),
    tokensEntradaImagem: integer("tokens_entrada_imagem").default(0).notNull(),
    tokensEntradaImagemCache: integer("tokens_entrada_imagem_cache").default(0).notNull(),
    tokensSaidaTexto: integer("tokens_saida_texto").default(0).notNull(),
    tokensSaidaAudio: integer("tokens_saida_audio").default(0).notNull(),
    /** Pesquisas na internet feitas pela Astra na sessão e o custo delas (já incluso em custoUsd). */
    buscasWeb: integer("buscas_web").default(0).notNull(),
    custoBuscaUsd: doublePrecision("custo_busca_usd").default(0).notNull(),
    /** Custo total da sessão: voz, transcrição e pesquisas. É o que consome os créditos. */
    custoUsd: doublePrecision("custo_usd").default(0).notNull(),
  },
  (t) => [index("sessao_voz_user_iniciada_idx").on(t.userId, t.iniciadaEm)],
);

/**
 * Uma conversa do histórico. Pode atravessar várias sessões de voz: "continuar" uma
 * conversa abre uma sala nova ligada à mesma conversa.
 */
export const conversa = pgTable(
  "conversa",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Gerado pelo agente ao fim da primeira sessão ou definido pelo usuário. */
    titulo: text("titulo"),
    criadaEm: timestamp("criada_em").defaultNow().notNull(),
    /** Última mensagem gravada; ordena a lista do histórico. */
    atualizadaEm: timestamp("atualizada_em").defaultNow().notNull(),
  },
  (t) => [index("conversa_user_atualizada_idx").on(t.userId, t.atualizadaEm)],
);

/**
 * Falas da conversa (transcrição da voz e mensagens digitadas), gravadas pelo agente.
 * A chave é (sala, item_id): o id do item no histórico da sessão do agente, então
 * reenviar a mesma fala atualiza a linha em vez de duplicar.
 */
export const mensagem = pgTable(
  "mensagem",
  {
    sala: text("sala")
      .notNull()
      .references(() => sessaoVoz.sala, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    conversaId: text("conversa_id")
      .notNull()
      .references(() => conversa.id, { onDelete: "cascade" }),
    /** "usuario" | "astra" */
    papel: text("papel").notNull(),
    texto: text("texto").notNull(),
    /** Enviada pela caixa de texto (e não falada). */
    digitada: boolean("digitada").default(false).notNull(),
    criadaEm: timestamp("criada_em").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.sala, t.itemId] }),
    index("mensagem_conversa_criada_idx").on(t.conversaId, t.criadaEm),
  ],
);
