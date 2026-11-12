/**
 * Single place to tune the showcase run (#269).
 */
export interface Tela {
  nome: string;
  width: number;
  height: number;
  /** Phone or tablet: touch emulation on and the 44 px target floor. */
  toque: boolean;
}

export const TELAS: Tela[] = [
  { nome: "360x640", width: 360, height: 640, toque: true },
  { nome: "390x844", width: 390, height: 844, toque: true },
  { nome: "768x1024", width: 768, height: 1024, toque: true },
  { nome: "1280x720", width: 1280, height: 720, toque: false },
  { nome: "1920x1080", width: 1920, height: 1080, toque: false },
];

/**
 * Smallest window the app promises to support. Waiting for #356 to decide it:
 * until then this is null and the run uses only TELAS. When #356 lands, put its
 * size here and the run adds it as one more screen.
 */
export const TAMANHO_MINIMO_DA_JANELA = null as {
  width: number;
  height: number;
} | null;

export const TELAS_DA_RODADA: Tela[] = TAMANHO_MINIMO_DA_JANELA
  ? [
      ...TELAS,
      {
        nome: `minimo-${TAMANHO_MINIMO_DA_JANELA.width}x${TAMANHO_MINIMO_DA_JANELA.height}`,
        ...TAMANHO_MINIMO_DA_JANELA,
        toque: false,
      },
    ]
  : TELAS;

/**
 * Smallest press target, in CSS pixels. 44 where the screen is touched
 * (issue #269); desktop windows driven by a mouse use the WCAG 2.2 AA floor
 * of 24, since 44 would flag every dense desktop control.
 */
export const ALVO_MINIMO = { toque: 44, mouse: 24 } as const;
