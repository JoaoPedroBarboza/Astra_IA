ALTER TABLE "sessao_voz" ADD COLUMN "buscas_web" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sessao_voz" ADD COLUMN "custo_busca_usd" double precision DEFAULT 0 NOT NULL;