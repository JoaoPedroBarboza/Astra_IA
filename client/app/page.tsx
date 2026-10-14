"use client";

import { useState } from "react";
import { LoginScreen } from "@/components/login-screen";
import { SessionView } from "@/components/session-view";

export default function Home() {
  const [autenticado, setAutenticado] = useState(false);

  if (!autenticado) {
    return <LoginScreen onEntrar={() => setAutenticado(true)} />;
  }

  return <SessionView />;
}
