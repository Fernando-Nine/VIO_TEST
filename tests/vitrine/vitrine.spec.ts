import { appendFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { ALVO_MINIMO, TELAS_DA_RODADA } from "./config";
import { CASOS, type Caso, type Passo } from "./casos";
import { CONHECIDOS, EXCECOES } from "./conhecidos";
import { medir, type Achado } from "./medidas";

/**
 * Showcase run (#269): each case in each screen size is measured for layout
 * breaks and compared to its approved screenshot. `VITRINE_ACHADOS=<file>`
 * switches to survey mode: every finding is appended to the file as JSON
 * lines, nothing is asserted and no screenshot is taken.
 */
const levantamento = process.env.VITRINE_ACHADOS;

async function passo(page: Page, p: Passo) {
  if ("clicar" in p) {
    await page
      .getByRole(p.papel, {
        name: p.papel === "tab" ? new RegExp(`^${p.clicar}`) : p.clicar,
        exact: p.papel !== "tab",
      })
      .first()
      .click();
  } else if ("clicarDireito" in p) {
    await page.locator(p.clicarDireito).first().click({ button: "right" });
  } else if (p.esperar === "dialog") {
    await page.locator("dialog[open]").first().waitFor({ state: "visible" });
  } else {
    await page.locator('[role="menu"]').first().waitFor({ state: "visible" });
  }
}

function codigoDaSala(texto: string) {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return "UIVIT" + h.toString(36).toUpperCase().padStart(8, "0");
}

async function preparar(
  page: Page,
  caso: Caso,
  tela: string,
  tentativa: number,
) {
  const octeto = () => Math.floor(Math.random() * 254) + 1;
  await page.context().setExtraHTTPHeaders({
    "x-forwarded-for": `10.${octeto()}.${octeto()}.${octeto()}`,
  });
  // Same code on every run, so the screenshots match; unique per case and
  // screen, because parallel tests share one server.
  const sala = codigoDaSala(`${caso.id}/${tela}/${tentativa}`);
  await page.goto(`/qa-vitrine?caso=${caso.id}&sala=${sala}`);
  const sinal = page.locator("[data-vitrine-pronta], [data-vitrine-erro]");
  await sinal.first().waitFor({ state: "attached" });
  if (await page.locator("[data-vitrine-erro]").count())
    throw new Error(
      `A vitrine não montou ${caso.id}: ${await page.locator("[data-vitrine-erro]").innerText()}`,
    );
  if (caso.widget && caso.sala === "sala")
    await page.locator(".widget-host").first().waitFor({ state: "visible" });
  for (const p of caso.passos || []) await passo(page, p);
  await page.evaluate(() => document.fonts.ready);
  // Let layout settle (reduced motion is on, so only fades remain).
  await page.waitForTimeout(400);
}

const ehExcecao = (a: Achado) =>
  EXCECOES.some((e) => e.regra === a.regra && new RegExp(e.no).test(a.no));

for (const caso of CASOS)
  test(caso.id, async ({ page }, info) => {
    const tela = TELAS_DA_RODADA.find((t) => t.nome === info.project.name)!;
    await preparar(page, caso, tela.nome, info.retry);
    const todos = await medir(page, {
      alvoMinimo: tela.toque ? ALVO_MINIMO.toque : ALVO_MINIMO.mouse,
    });
    const achados = todos.filter((a) => !ehExcecao(a));
    if (levantamento) {
      appendFileSync(
        levantamento,
        JSON.stringify({ caso: caso.id, tela: tela.nome, achados }) + "\n",
      );
      return;
    }

    const conhecidos = CONHECIDOS.filter(
      (c) =>
        new RegExp(`^(?:${c.casos})$`).test(caso.id) &&
        (!c.telas || c.telas.includes(tela.nome)),
    );
    for (const c of conhecidos)
      info.annotations.push({
        type: "conhecido",
        description: `${c.issue}: ${c.nota}`,
      });
    const novos = achados.filter(
      (a) =>
        !conhecidos.some(
          (c) => c.regra === a.regra && new RegExp(c.no).test(a.no),
        ),
    );
    const texto = (lista: Achado[]) =>
      lista.map((a) => `  ${a.regra}: ${a.no}: ${a.detalhe}`).join("\n");
    expect
      .soft(
        novos,
        `Quebras de layout em ${caso.id} (${tela.nome}):\n${texto(novos)}`,
      )
      .toEqual([]);
    await expect.soft(page).toHaveScreenshot(`${caso.id}-${tela.nome}.png`, {
      mask: [
        page.locator("video"),
        page.locator("time"),
        page.locator(".room-code"),
        page.locator(".room-duration"),
        page.locator(".connection-wrap"),
      ],
    });
  });
