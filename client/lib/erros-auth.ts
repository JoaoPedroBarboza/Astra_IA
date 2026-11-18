export type ErroAuth = { code?: string; status: number };

// Códigos de erro do Better Auth; o que não estiver aqui cai na mensagem genérica,
// já que as mensagens originais vêm em inglês.
const MENSAGENS_DE_ERRO: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "E-mail ou senha inválidos.",
  INVALID_EMAIL: "Informe um e-mail válido.",
  INVALID_PASSWORD: "A senha atual está incorreta.",
  PASSWORD_TOO_SHORT: "A senha precisa ter pelo menos 8 caracteres.",
  PASSWORD_TOO_LONG: "A senha é longa demais.",
  INVALID_OTP: "Código inválido.",
  OTP_EXPIRED: "O código expirou. Peça um novo.",
  TOO_MANY_ATTEMPTS: "Muitas tentativas com este código. Peça um novo.",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "Sua conta entra pelo Google e não tem senha própria.",
  SESSION_EXPIRED: "Sua sessão expirou. Entre novamente.",
  SESSION_NOT_FRESH: "Por segurança, entre novamente para ver esta informação.",
};

export function traduzirErro(erro: ErroAuth) {
  if (erro.status === 429) return "Muitas tentativas. Aguarde um minuto e tente de novo.";
  return (erro.code && MENSAGENS_DE_ERRO[erro.code]) || "Não foi possível concluir. Tente novamente.";
}
