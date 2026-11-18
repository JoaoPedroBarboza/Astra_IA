CREATE TABLE "conversa" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"titulo" text,
	"criada_em" timestamp DEFAULT now() NOT NULL,
	"atualizada_em" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mensagem" (
	"sala" text NOT NULL,
	"item_id" text NOT NULL,
	"conversa_id" text NOT NULL,
	"papel" text NOT NULL,
	"texto" text NOT NULL,
	"digitada" boolean DEFAULT false NOT NULL,
	"criada_em" timestamp NOT NULL,
	CONSTRAINT "mensagem_sala_item_id_pk" PRIMARY KEY("sala","item_id")
);
--> statement-breakpoint
ALTER TABLE "sessao_voz" ADD COLUMN "conversa_id" text;--> statement-breakpoint
ALTER TABLE "conversa" ADD CONSTRAINT "conversa_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagem" ADD CONSTRAINT "mensagem_sala_sessao_voz_sala_fk" FOREIGN KEY ("sala") REFERENCES "public"."sessao_voz"("sala") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensagem" ADD CONSTRAINT "mensagem_conversa_id_conversa_id_fk" FOREIGN KEY ("conversa_id") REFERENCES "public"."conversa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversa_user_atualizada_idx" ON "conversa" USING btree ("user_id","atualizada_em");--> statement-breakpoint
CREATE INDEX "mensagem_conversa_criada_idx" ON "mensagem" USING btree ("conversa_id","criada_em");--> statement-breakpoint
ALTER TABLE "sessao_voz" ADD CONSTRAINT "sessao_voz_conversa_id_conversa_id_fk" FOREIGN KEY ("conversa_id") REFERENCES "public"."conversa"("id") ON DELETE set null ON UPDATE no action;