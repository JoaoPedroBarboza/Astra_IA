"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { ConnectionDetails } from "@/app/api/token/route";

export type ConnectionDetailsState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; details: ConnectionDetails }
  | { status: "error"; message: string };

export function useConnectionDetails() {
  const router = useRouter();
  const [state, setState] = useState<ConnectionDetailsState>({ status: "idle" });

  const connect = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/token", { cache: "no-store" });
      if (res.status === 401) {
        // Sessão expirou com a página aberta: volta para o login.
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Falha ao obter token de acesso (${res.status}).`);
      }
      const details = (await res.json()) as ConnectionDetails;
      setState({ status: "ready", details });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Erro desconhecido ao conectar.",
      });
    }
  }, [router]);

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, connect, reset };
}
