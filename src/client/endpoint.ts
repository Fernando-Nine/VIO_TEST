// Onde este cliente fala, e para onde ele aponta as pessoas.
//
// Na web as duas ficam vazias e tudo segue relativo, exatamente como antes: o
// mesmo processo Node serve a página, /api/config, /api/session e o socket.
//
// Uma casca nativa (Tauri, e depois um invólucro de celular) carrega a página do
// esquema dela, onde "/api/session" resolve contra a própria casca e nunca chega
// ao servidor. Por isso a build da casca preenche estas duas:
//
//   VITE_API_BASE  https://vio-test.onrender.com   onde o servidor mora
//   VITE_WEB_URL   https://vio-test.onrender.com   o que um convidado abre
//
// São separadas de propósito. A base da API é para onde este cliente conecta; a
// URL web é o que entra no convite — e convite precisa abrir em navegador,
// porque ninguém consegue seguir um link tauri://.
const limpar = (valor: unknown) =>
  typeof valor === "string" ? valor.trim().replace(/\/+$/, "") : "";

export const apiBase = limpar(import.meta.env?.VITE_API_BASE);
export const webBase = limpar(import.meta.env?.VITE_WEB_URL);

/** Verdadeiro quando a página não é servida pelo próprio servidor do VIO. */
export const embedded = apiBase !== "";

/** URL absoluta de uma rota do servidor, ou o caminho relativo quando na web. */
export function api(path: string) {
  return apiBase + path;
}

/** Para onde o socket conecta quando o servidor não indicou uma URL própria. */
export function socketOrigin() {
  return apiBase || location.origin;
}

/**
 * O link que coloca outra pessoa nesta sala. Dentro de uma casca, location.href
 * é o esquema da própria casca e não serve para ninguém — aí a URL pública
 * assume.
 */
/** Room link; with a signed invite (#242) it enters even a locked room. */
export function invite(code: string, token?: string) {
  const url = new URL(webBase || location.href);
  if (webBase) {
    url.pathname = "/";
    url.hash = "";
  }
  url.searchParams.set("sala", code);
  if (token) url.searchParams.set("convite", token);
  else url.searchParams.delete("convite");
  return url;
}
