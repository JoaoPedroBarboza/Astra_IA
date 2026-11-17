import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/login-screen";
import { auth, googleHabilitado } from "@/lib/auth";

// Códigos que o Better Auth anexa em ?error= quando o login com Google falha.
const ERROS_OAUTH: Record<string, string> = {
  account_not_linked:
    "Já existe uma conta com este e-mail ainda não confirmada. Entre com e-mail e senha para confirmá-la.",
  access_denied: "O acesso pelo Google foi cancelado.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/");

  const { error } = await searchParams;
  const erroInicial =
    typeof error === "string"
      ? (ERROS_OAUTH[error] ?? "Não foi possível entrar com o Google. Tente novamente.")
      : null;

  return <LoginScreen googleHabilitado={googleHabilitado} erroInicial={erroInicial} />;
}
