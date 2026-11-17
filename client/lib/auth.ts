import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins";
import { after } from "next/server";
import { db } from "./db";
import * as schema from "./db/schema";
import { enviarCodigo } from "./email";

// O login com Google só é ativado quando as credenciais existem, para o projeto
// continuar subindo (só com e-mail e senha) em ambientes sem OAuth configurado.
const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
    : undefined;

export const googleHabilitado = Boolean(google);

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    // Sem e-mail confirmado não há sessão — e sem sessão o /api/token não entrega
    // acesso ao agente, que é o que consome créditos da OpenAI.
    requireEmailVerification: true,
    minPasswordLength: 8,
  },
  emailVerification: {
    autoSignInAfterVerification: true,
  },
  socialProviders: google ? { google } : {},
  session: {
    // Guarda a sessão num cookie assinado por 5 min para não consultar o banco
    // a cada request.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  // Em serverless cada instância tem sua própria memória, então o contador de
  // tentativas precisa ficar no banco para valer entre instâncias.
  rateLimit: { storage: "database" },
  advanced: {
    // O e-mail é enviado depois da resposta: a requisição não espera o SMTP e o
    // tempo de resposta não denuncia se um e-mail está cadastrado.
    backgroundTasks: { handler: (tarefa) => after(tarefa) },
  },
  plugins: [
    emailOTP({
      // Verificação por código de 6 dígitos no lugar do link padrão.
      overrideDefaultEmailVerification: true,
      async sendVerificationOTP({ email, otp, type }) {
        await enviarCodigo(email, otp, type);
      },
    }),
    nextCookies(),
  ],
});
