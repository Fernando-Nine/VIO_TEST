import type { Page } from "@playwright/test";

/**
 * Layout checks for the showcase (#269). Everything runs inside the page, on
 * what the browser actually laid out, so there is no guess about CSS.
 */
export type Regra =
  | "rolagem-horizontal"
  | "fora-da-janela"
  | "cortado-pelo-conteiner"
  | "texto-cortado"
  | "sobreposicao"
  | "alvo-pequeno";

export interface Achado {
  regra: Regra;
  /** Readable path to the element: tag, classes and accessible name. */
  no: string;
  detalhe: string;
}

export interface Opcoes {
  /** Smallest touch target side, in CSS pixels. */
  alvoMinimo: number;
}

export async function medir(page: Page, opcoes: Opcoes): Promise<Achado[]> {
  return page.evaluate((opts): Achado[] => {
    const achados: Achado[] = [];
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const TOL = 2;
    const modal = document.querySelector<HTMLElement>("dialog[open]:modal");
    const raiz: HTMLElement = modal || document.body;

    const nome = (el: Element) => {
      const rotulo =
        el.getAttribute("aria-label") ||
        el.getAttribute("title") ||
        (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 32);
      const classes = [...el.classList].slice(0, 2).join(".");
      const pai = el.parentElement?.classList[0];
      return `${pai ? pai + " > " : ""}${el.tagName.toLowerCase()}${classes ? "." + classes : ""}${rotulo ? ` [${rotulo}]` : ""}`;
    };
    const achar = (regra: Achado["regra"], el: Element, detalhe: string) =>
      achados.push({ regra, no: nome(el), detalhe });

    const visivel = (el: Element) => {
      const h = el as HTMLElement;
      if (
        !h.checkVisibility?.({ checkOpacity: true, checkVisibilityCSS: true })
      )
        return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const overflowDe = (el: Element) => {
      const s = getComputedStyle(el);
      return { x: s.overflowX, y: s.overflowY };
    };
    const rolavel = (v: string) => v === "auto" || v === "scroll";
    const corta = (v: string) => v === "hidden" || v === "clip";

    /** Ancestors whose overflow clips `el`, following absolute/fixed rules. */
    function ancestraisQueCortam(el: Element) {
      const lista: { el: Element; x: string; y: string }[] = [];
      let no: Element = el;
      for (;;) {
        const s = getComputedStyle(no);
        if (s.position === "fixed") break;
        let pai: Element | null = no.parentElement;
        if (s.position === "absolute")
          while (pai) {
            const ps = getComputedStyle(pai);
            if (ps.position !== "static" || ps.transform !== "none") break;
            pai = pai.parentElement;
          }
        if (!pai || pai === document.body || pai === document.documentElement)
          break;
        const o = overflowDe(pai);
        if (o.x !== "visible" || o.y !== "visible")
          lista.push({ el: pai, ...o });
        no = pai;
      }
      return lista;
    }
    /** Box the element can actually show: its rect minus clipping ancestors. */
    function caixaVisivel(el: Element) {
      const r = el.getBoundingClientRect();
      let l = r.left,
        t = r.top,
        rt = r.right,
        b = r.bottom;
      for (const a of ancestraisQueCortam(el)) {
        const c = a.el as HTMLElement;
        const ar = c.getBoundingClientRect();
        if (a.x !== "visible") {
          l = Math.max(l, ar.left + c.clientLeft);
          rt = Math.min(rt, ar.left + c.clientLeft + c.clientWidth);
        }
        if (a.y !== "visible") {
          t = Math.max(t, ar.top + c.clientTop);
          b = Math.min(b, ar.top + c.clientTop + c.clientHeight);
        }
      }
      return { l, t, r: rt, b };
    }

    const seletorControle =
      'a[href], button, input:not([type="hidden"]), select, textarea, summary, ' +
      '[role="button"], [role="tab"], [role="menuitem"], [role="menuitemradio"], ' +
      '[role="menuitemcheckbox"], [role="switch"], [role="checkbox"], [role="radio"], ' +
      '[role="slider"], [role="option"], [role="link"], [role="combobox"], [role="spinbutton"]';

    // The element a person actually presses: a wrapping label for hidden inputs.
    const alvos = new Map<Element, true>();
    for (const c of raiz.querySelectorAll<HTMLElement>(seletorControle)) {
      if (
        (c as HTMLButtonElement).disabled ||
        c.getAttribute("aria-disabled") === "true"
      )
        continue;
      const rotulo = c.closest("label");
      const alvo = rotulo && rotulo !== c ? rotulo : c;
      if (visivel(alvo)) alvos.set(alvo, true);
    }
    const lista = [...alvos.keys()];

    // 1. Horizontal page scroll.
    const de = document.documentElement;
    if (de.scrollWidth > de.clientWidth + 1)
      achar(
        "rolagem-horizontal",
        de,
        `a página tem ${de.scrollWidth}px de largura para ${de.clientWidth}px de janela`,
      );
    if (document.body.scrollWidth > de.clientWidth + 1)
      achar(
        "rolagem-horizontal",
        document.body,
        `o corpo tem ${document.body.scrollWidth}px para ${de.clientWidth}px de janela`,
      );

    const paginaRola = de.scrollHeight > de.clientHeight + 1;
    const marcados = new Set<Element>();
    const conta = (el: Element) =>
      el.matches(seletorControle) ||
      [...el.childNodes].some(
        (n) => n.nodeType === 3 && (n.textContent || "").trim() !== "",
      ) ||
      /^(img|video|canvas)$/i.test(el.tagName);

    for (const el of raiz.querySelectorAll("*")) {
      if (!conta(el) || !visivel(el) || el.closest('[aria-hidden="true"]'))
        continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const interativo = el.matches(seletorControle);

      // 2. Leaves the window.
      const dentroDeRolagem = ancestraisQueCortam(el).some(
        (a) => rolavel(a.x) || rolavel(a.y),
      );
      if (!dentroDeRolagem) {
        const foraX = r.left < -TOL || r.right > vw + TOL;
        const foraY = !paginaRola && (r.top < -TOL || r.bottom > vh + TOL);
        const totalmenteFora =
          r.right <= 0 || r.left >= vw || r.bottom <= 0 || r.top >= vh;
        if (
          (foraX || foraY) &&
          (!totalmenteFora || interativo) &&
          !(el.parentElement && marcados.has(el.parentElement))
        ) {
          marcados.add(el);
          achar(
            "fora-da-janela",
            el,
            `caixa ${Math.round(r.left)},${Math.round(r.top)} a ${Math.round(r.right)},${Math.round(r.bottom)} numa janela ${vw}x${vh}`,
          );
        }
      }

      // 3. Cut by a container that hides overflow. Once a scrollable ancestor
      // holds the element on an axis, whatever an outer box clips on that axis
      // can be reached by scrolling, so it is not a cut.
      let rolaX = false,
        rolaY = false;
      for (const a of ancestraisQueCortam(el)) {
        const c = a.el as HTMLElement;
        const ar = c.getBoundingClientRect();
        const cl = ar.left + c.clientLeft,
          ct = ar.top + c.clientTop,
          cr = cl + c.clientWidth,
          cb = ct + c.clientHeight;
        const excessoX =
          corta(a.x) && !rolaX ? Math.max(cl - r.left, r.right - cr, 0) : 0;
        const excessoY =
          corta(a.y) && !rolaY ? Math.max(ct - r.top, r.bottom - cb, 0) : 0;
        if (rolavel(a.x)) rolaX = true;
        if (rolavel(a.y)) rolaY = true;
        if (excessoX <= TOL && excessoY <= TOL) continue;
        const dentro =
          Math.min(r.right, cr) - Math.max(r.left, cl) > 0 &&
          Math.min(r.bottom, cb) - Math.max(r.top, ct) > 0;
        if (!dentro) continue; // fully put away on purpose
        achar(
          "cortado-pelo-conteiner",
          el,
          `passa ${Math.round(Math.max(excessoX, excessoY))}px do contêiner ${nome(c)}`,
        );
        break;
      }

      // 4. Text cut without an ellipsis.
      const s = getComputedStyle(el);
      const h = el as HTMLElement;
      if (
        [...el.childNodes].some(
          (n) => n.nodeType === 3 && (n.textContent || "").trim() !== "",
        ) &&
        (corta(s.overflowX) || corta(s.overflowY)) &&
        s.textOverflow !== "ellipsis" &&
        s.getPropertyValue("-webkit-line-clamp") === "none" &&
        (h.scrollWidth > h.clientWidth + 1 ||
          h.scrollHeight > h.clientHeight + 1)
      )
        achar(
          "texto-cortado",
          el,
          `conteúdo ${h.scrollWidth}x${h.scrollHeight} em caixa ${h.clientWidth}x${h.clientHeight}`,
        );
    }

    // 5. Interactive elements stacked on each other. A floating layer (panel,
    // menu, toast, dialog) over the page is layering on purpose, not a clash:
    // only two controls in the same layer are compared.
    const camada = (el: Element): Element | null => {
      const marcada = el.closest(
        'dialog, [role="menu"], [role="dialog"], [popover], .toast-stack',
      );
      if (marcada) return marcada;
      for (let n: Element | null = el; n; n = n.parentElement)
        if (getComputedStyle(n).position === "fixed") return n;
      return null;
    };
    const caixas = lista.map((el) => ({ el, c: caixaVisivel(el) }));
    for (let i = 0; i < caixas.length; i++)
      for (let j = i + 1; j < caixas.length; j++) {
        const a = caixas[i],
          b = caixas[j];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        if (camada(a.el) !== camada(b.el)) continue;
        const w = Math.min(a.c.r, b.c.r) - Math.max(a.c.l, b.c.l);
        const hh = Math.min(a.c.b, b.c.b) - Math.max(a.c.t, b.c.t);
        if (w > TOL && hh > TOL && w * hh > 20)
          achar(
            "sobreposicao",
            a.el,
            `cobre ${nome(b.el)} em ${Math.round(w)}x${Math.round(hh)}px`,
          );
      }

    // 6. Targets too small to press.
    for (const el of lista) {
      const h = el as HTMLElement;
      // WCAG 2.5.8: an inline link inside a sentence is exempt.
      if (el.tagName === "A" && getComputedStyle(el).display === "inline")
        continue;
      const r = el.getBoundingClientRect();
      if (r.width + 0.5 < opts.alvoMinimo || r.height + 0.5 < opts.alvoMinimo)
        achar(
          "alvo-pequeno",
          h,
          `${Math.round(r.width)}x${Math.round(r.height)}px, o mínimo é ${opts.alvoMinimo}px`,
        );
    }
    return achados;
  }, opcoes);
}
