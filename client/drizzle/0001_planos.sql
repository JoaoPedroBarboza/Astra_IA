CREATE TABLE "plano_usuario" (
	"user_id" text PRIMARY KEY NOT NULL,
	"plano" text NOT NULL,
	"atualizado_em" timestamp DEFAULT now() NOT NULL,
	"atualizado_por" text
);
--> statement-breakpoint
CREATE TABLE "sessao_voz" (
	"sala" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"plano" text NOT NULL,
	"iniciada_em" timestamp DEFAULT now() NOT NULL,
	"atualizada_em" timestamp DEFAULT now() NOT NULL,
	"encerrada_em" timestamp,
	"motivo_encerramento" text,
	"duracao_s" integer DEFAULT 0 NOT NULL,
	"tokens_entrada_texto" integer DEFAULT 0 NOT NULL,
	"tokens_entrada_texto_cache" integer DEFAULT 0 NOT NULL,
	"tokens_entrada_audio" integer DEFAULT 0 NOT NULL,
	"tokens_entrada_audio_cache" integer DEFAULT 0 NOT NULL,
	"tokens_entrada_imagem" integer DEFAULT 0 NOT NULL,
	"tokens_entrada_imagem_cache" integer DEFAULT 0 NOT NULL,
	"tokens_saida_texto" integer DEFAULT 0 NOT NULL,
	"tokens_saida_audio" integer DEFAULT 0 NOT NULL,
	"custo_usd" double precision DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plano_usuario" ADD CONSTRAINT "plano_usuario_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessao_voz" ADD CONSTRAINT "sessao_voz_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessao_voz_user_iniciada_idx" ON "sessao_voz" USING btree ("user_id","iniciada_em");