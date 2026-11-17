import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SessionView } from "@/components/session-view";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return <SessionView usuario={{ nome: session.user.name, email: session.user.email }} />;
}
