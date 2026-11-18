import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { exigirAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { ehPlanoId, inicioDoCiclo, PLANO_PADRAO, usdParaCreditos, type PlanoId } from "@/lib/planos";
import { ehAdminPorEmail } from "@/lib/planos-servidor";

export type UsuarioAdmin = {
  id: string;
  nome: string;
  email: string;
  criadoEm: string;
  plano: PlanoId;
  /** Admin definido por ADMIN_EMAILS: o plano não pode ser trocado pela interface. */
  adminFixo: boolean;
  creditosNoMes: number;
  custoNoMesUsd: number;
  sessoesNoMes: number;
  ultimaSessao: string | null;
};

export type PainelAdmin = {
  usuarios: UsuarioAdmin[];
  totais: { usuarios: number; sessoesNoMes: number; custoNoMesUsd: number; duracaoNoMesS: number };
};

type Linha = {
  id: string;
  name: string;
  email: string;
  criado: string;
  plano: string | null;
  custo: number | string | null;
  sessoes: number | string | null;
  duracao: number | string | null;
  ultima: string | null;
};

// As colunas são "timestamp" sem fuso, gravadas em UTC. Na consulta manual as datas
// saem já em ISO com "Z" e o início do ciclo entra como ISO: sem isso, o driver usaria
// o fuso da máquina e tudo ficaria 3 h deslocado rodando no Brasil.
const ISO = `'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'`;

/** Usuários, plano de cada um e consumo no mês corrente. */
export async function GET() {
  const acesso = await exigirAdmin();
  if ("erro" in acesso) return acesso.erro;

  const inicio = inicioDoCiclo().toISOString();
  const { rows } = await db.execute<Linha>(sql`
    select u.id, u.name, u.email, to_char(u.created_at, ${sql.raw(ISO)}) as criado, p.plano,
           s.custo, s.sessoes, s.duracao, to_char(s.ultima, ${sql.raw(ISO)}) as ultima
    from "user" u
    left join plano_usuario p on p.user_id = u.id
    left join (
      select user_id,
             sum(custo_usd) as custo,
             count(*) filter (where duracao_s > 0)::int as sessoes,
             sum(duracao_s)::int as duracao,
             max(iniciada_em) as ultima
      from sessao_voz
      where iniciada_em >= ${inicio}::timestamp
      group by user_id
    ) s on s.user_id = u.id
    order by u.created_at desc
    limit 500
  `);

  const usuarios: UsuarioAdmin[] = rows.map((r) => {
    const adminFixo = ehAdminPorEmail(r.email);
    const custo = Number(r.custo ?? 0);
    return {
      id: r.id,
      nome: r.name,
      email: r.email,
      criadoEm: r.criado,
      plano: adminFixo ? "nucleo" : ehPlanoId(r.plano) ? r.plano : PLANO_PADRAO,
      adminFixo,
      creditosNoMes: usdParaCreditos(custo),
      custoNoMesUsd: custo,
      sessoesNoMes: Number(r.sessoes ?? 0),
      ultimaSessao: r.ultima,
    };
  });

  const painel: PainelAdmin = {
    usuarios,
    totais: {
      usuarios: usuarios.length,
      sessoesNoMes: usuarios.reduce((n, u) => n + u.sessoesNoMes, 0),
      custoNoMesUsd: usuarios.reduce((n, u) => n + u.custoNoMesUsd, 0),
      duracaoNoMesS: rows.reduce((n, r) => n + Number(r.duracao ?? 0), 0),
    },
  };

  return NextResponse.json(painel, { headers: { "Cache-Control": "no-store" } });
}
