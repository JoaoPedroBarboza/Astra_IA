import nodemailer from "nodemailer";

// SMTP genérico para não amarrar o projeto a um provedor: funciona com Gmail
// (senha de app), Brevo, Resend, SES etc. — só mudam as variáveis de ambiente.
const transporte = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

const ASSUNTOS: Record<string, string> = {
  "email-verification": "Seu código de verificação da Astra IA",
  "forget-password": "Código para redefinir sua senha da Astra IA",
};

export async function enviarCodigo(email: string, codigo: string, tipo: string) {
  const assunto = ASSUNTOS[tipo] ?? "Seu código da Astra IA";

  if (!transporte) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP não configurado: defina SMTP_HOST, SMTP_USER, SMTP_PASS e EMAIL_FROM.");
    }
    // Em desenvolvimento, sem SMTP, o código aparece no terminal do `npm run dev`.
    console.info(`[email] ${assunto} → ${email}: ${codigo}`);
    return;
  }

  await transporte.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: assunto,
    text: `Seu código é ${codigo}. Ele expira em 5 minutos.\n\nSe você não pediu este código, ignore este e-mail.`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#0f172a">
        <h2 style="margin:0 0 12px;font-size:18px">Astra IA</h2>
        <p style="margin:0 0 20px">Use o código abaixo para continuar. Ele expira em 5 minutos.</p>
        <p style="margin:0 0 20px;font-size:32px;font-weight:600;letter-spacing:8px">${codigo}</p>
        <p style="margin:0;font-size:13px;color:#64748b">Se você não pediu este código, ignore este e-mail.</p>
      </div>`,
  });
}
