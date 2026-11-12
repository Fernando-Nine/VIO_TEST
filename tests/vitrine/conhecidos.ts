import type { Regra } from "./medidas";

/**
 * Real layout breaks the showcase found on the first run (#269), kept visible
 * instead of hidden. Each entry belongs to a group that must become an issue;
 * when the issue is fixed, delete its entries here (a run in survey mode,
 * VITRINE_ACHADOS=arquivo, lists what still happens).
 * A case that matches an entry still takes its screenshot comparison.
 */
export interface Conhecido {
  /** Regular expression over the case id, anchored by the matcher. */
  casos: string;
  /** Screens where it happens; omitted means every screen. */
  telas?: string[];
  regra: Regra;
  /** Regular expression over the readable element path of the finding. */
  no: string;
  /** Issue to open (number goes here once it exists). */
  issue: string;
  nota: string;
}

export const CONHECIDOS: Conhecido[] = [
  {
    regra: "alvo-pequeno",
    no: "^button\\.inline-text\\.raffle-name( \\[|$)",
    casos: "widget-random-grande|widget-random-pequeno",
    telas: ["768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^catalog > label\\.catalog-search( \\[|$)",
    casos: "dialogo-adicionar-widget",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^catalog-actions > button\\.secondary( \\[|$)",
    casos: "dialogo-adicionar-widget",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^catalog-tabs > button( \\[|$)",
    casos: "dialogo-adicionar-widget",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^chat-compose > button\\.icon-button( \\[|$)",
    casos: "balao-avisos|widget-chat-grande|widget-chat-pequeno",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^chat-compose > textarea( \\[|$)",
    casos: "balao-avisos|widget-chat-grande|widget-chat-pequeno",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^color-presets > button\\.color-swatch( \\[|$)",
    casos: "ajustes-aparencia",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^color-presets > button\\.color-swatch\\.color-custom( \\[|$)",
    casos: "ajustes-aparencia",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^context-menu > button( \\[|$)",
    casos: "balao-menu-do-widget",
    telas: ["768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^context-menu > button\\.is-separated( \\[|$)",
    casos: "balao-menu-do-widget",
    telas: ["768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^dice-pad > button( \\[|$)",
    casos: "widget-dice-grande|widget-dice-pequeno",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^dice-roll > button\\.primary( \\[|$)",
    casos: "widget-dice-grande|widget-dice-pequeno",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^dice-roll > input( \\[|$)",
    casos: "widget-dice-grande|widget-dice-pequeno",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^dock-side > button\\.dock-button\\.audio-off( \\[|$)",
    casos:
      "balao-menu-do-widget|widget-cameras-grande|widget-cameras-pequeno|widget-people-grande|widget-people-pequeno|widget-stream-grande|widget-stream-pequeno",
    telas: ["768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^dock-side > button\\.dock-button\\.dock-wide( \\[|$)",
    casos:
      "balao-avisos|balao-menu-do-widget|dialogo-pessoas|widget-cameras-grande|widget-cameras-pequeno|widget-chat-grande|widget-chat-pequeno|widget-custom-grande|widget-custom-pequeno|widget-dice-grande|widget-dice-pequeno|widget-people-grande|widget-people-pequeno|widget-poll-grande|widget-poll-pequeno|widget-random-grande|widget-random-pequeno|widget-screen-grande|widget-screen-pequeno|widget-stream-grande|widget-stream-pequeno|widget-tasks-grande|widget-tasks-pequeno|widget-timer-grande|widget-timer-pequeno",
    telas: ["768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^dock-side > button\\.dock-button\\.muted( \\[|$)",
    casos:
      "balao-menu-do-widget|widget-cameras-grande|widget-cameras-pequeno|widget-people-grande|widget-people-pequeno|widget-stream-grande|widget-stream-pequeno",
    telas: ["768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^dock-side > button\\.dock-button\\.share-more( \\[|$)",
    casos: "widget-screen-grande|widget-screen-pequeno",
    telas: ["768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^dock-side > button\\.dock-credits\\.dock-wide( \\[|$)",
    casos:
      "balao-avisos|balao-menu-do-widget|dialogo-pessoas|widget-cameras-grande|widget-cameras-pequeno|widget-chat-grande|widget-chat-pequeno|widget-custom-grande|widget-custom-pequeno|widget-dice-grande|widget-dice-pequeno|widget-people-grande|widget-people-pequeno|widget-poll-grande|widget-poll-pequeno|widget-random-grande|widget-random-pequeno|widget-screen-grande|widget-screen-pequeno|widget-stream-grande|widget-stream-pequeno|widget-tasks-grande|widget-tasks-pequeno|widget-timer-grande|widget-timer-pequeno",
    telas: ["768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^dock-side > button\\.share-button( \\[|$)",
    casos:
      "balao-avisos|balao-menu-do-widget|dialogo-pessoas|widget-cameras-grande|widget-cameras-pequeno|widget-chat-grande|widget-chat-pequeno|widget-custom-grande|widget-custom-pequeno|widget-dice-grande|widget-dice-pequeno|widget-people-grande|widget-people-pequeno|widget-poll-grande|widget-poll-pequeno|widget-random-grande|widget-random-pequeno|widget-stream-grande|widget-stream-pequeno|widget-tasks-grande|widget-tasks-pequeno|widget-timer-grande|widget-timer-pequeno",
    telas: ["768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^dock-side > button\\.share-button\\.sharing( \\[|$)",
    casos: "widget-screen-grande|widget-screen-pequeno",
    telas: ["768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^header-actions > button\\.secondary\\.invite( \\[|$)",
    casos:
      "balao-avisos|balao-menu-do-widget|dialogo-pessoas|widget-cameras-grande|widget-cameras-pequeno|widget-chat-grande|widget-chat-pequeno|widget-custom-grande|widget-custom-pequeno|widget-dice-grande|widget-dice-pequeno|widget-people-grande|widget-people-pequeno|widget-poll-grande|widget-poll-pequeno|widget-random-grande|widget-random-pequeno|widget-screen-grande|widget-screen-pequeno|widget-stream-grande|widget-stream-pequeno|widget-tasks-grande|widget-tasks-pequeno|widget-timer-grande|widget-timer-pequeno",
    telas: ["768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^header-left > button\\.brand-home( \\[|$)",
    casos:
      "balao-avisos|balao-menu-do-widget|dialogo-pessoas|inicio-landing|widget-cameras-grande|widget-cameras-pequeno|widget-chat-grande|widget-chat-pequeno|widget-custom-grande|widget-custom-pequeno|widget-dice-grande|widget-dice-pequeno|widget-people-grande|widget-people-pequeno|widget-poll-grande|widget-poll-pequeno|widget-random-grande|widget-random-pequeno|widget-screen-grande|widget-screen-pequeno|widget-stream-grande|widget-stream-pequeno|widget-tasks-grande|widget-tasks-pequeno|widget-timer-grande|widget-timer-pequeno",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^header-left > button\\.room-code\\.room-lock( \\[|$)",
    casos:
      "balao-avisos|balao-menu-do-widget|dialogo-pessoas|widget-cameras-grande|widget-cameras-pequeno|widget-chat-grande|widget-chat-pequeno|widget-custom-grande|widget-custom-pequeno|widget-dice-grande|widget-dice-pequeno|widget-people-grande|widget-people-pequeno|widget-poll-grande|widget-poll-pequeno|widget-random-grande|widget-random-pequeno|widget-screen-grande|widget-screen-pequeno|widget-stream-grande|widget-stream-pequeno|widget-tasks-grande|widget-tasks-pequeno|widget-timer-grande|widget-timer-pequeno",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^input( \\[|$)",
    casos: "ajustes-notificacoes",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^install-app > summary( \\[|$)",
    casos: "inicio-landing",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^landing-share > button\\.secondary\\.landing-copy( \\[|$)",
    casos: "inicio-landing",
    telas: ["768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^module-actions > button\\.secondary( \\[|$)",
    casos: "widget-tasks-grande|widget-tasks-pequeno",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^module-duration > button\\.text-button( \\[|$)",
    casos: "widget-poll-grande|widget-poll-pequeno",
    telas: ["768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^module-footer > button\\.primary\\.poll-start( \\[|$)",
    casos: "widget-poll-grande|widget-poll-pequeno",
    telas: ["360x640", "390x844"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^people-tabs > button( \\[|$)",
    casos: "dialogo-pessoas",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^raffle-actions > button\\.primary\\.raffle-draw( \\[|$)",
    casos: "widget-random-grande|widget-random-pequeno",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^raffle-weight > button( \\[|$)",
    casos: "widget-random-grande|widget-random-pequeno",
    telas: ["768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^room-navigation > button\\.dock-button( \\[|$)",
    casos:
      "balao-avisos|balao-menu-do-widget|dialogo-pessoas|widget-cameras-grande|widget-cameras-pequeno|widget-chat-grande|widget-chat-pequeno|widget-custom-grande|widget-custom-pequeno|widget-dice-grande|widget-dice-pequeno|widget-people-grande|widget-people-pequeno|widget-poll-grande|widget-poll-pequeno|widget-random-grande|widget-random-pequeno|widget-screen-grande|widget-screen-pequeno|widget-stream-grande|widget-stream-pequeno|widget-tasks-grande|widget-tasks-pequeno|widget-timer-grande|widget-timer-pequeno",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^room-navigation > button\\.dock-button\\.leave( \\[|$)",
    casos:
      "balao-avisos|balao-menu-do-widget|dialogo-pessoas|widget-cameras-grande|widget-cameras-pequeno|widget-chat-grande|widget-chat-pequeno|widget-custom-grande|widget-custom-pequeno|widget-dice-grande|widget-dice-pequeno|widget-people-grande|widget-people-pequeno|widget-poll-grande|widget-poll-pequeno|widget-random-grande|widget-random-pequeno|widget-screen-grande|widget-screen-pequeno|widget-stream-grande|widget-stream-pequeno|widget-tasks-grande|widget-tasks-pequeno|widget-timer-grande|widget-timer-pequeno",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^room-navigation > button\\.dock-button\\.people-toggle( \\[|$)",
    casos:
      "balao-avisos|balao-menu-do-widget|dialogo-pessoas|widget-cameras-grande|widget-cameras-pequeno|widget-chat-grande|widget-chat-pequeno|widget-custom-grande|widget-custom-pequeno|widget-dice-grande|widget-dice-pequeno|widget-people-grande|widget-people-pequeno|widget-poll-grande|widget-poll-pequeno|widget-random-grande|widget-random-pequeno|widget-screen-grande|widget-screen-pequeno|widget-stream-grande|widget-stream-pequeno|widget-tasks-grande|widget-tasks-pequeno|widget-timer-grande|widget-timer-pequeno",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^row-tools > button\\.icon-button( \\[|$)",
    casos: "widget-poll-grande|widget-poll-pequeno",
    telas: ["768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^settings-choice > label( \\[|$)",
    casos: "ajustes-acessibilidade",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^settings-group > label\\.toggle( \\[|$)",
    casos: "ajustes-aparencia|ajustes-audio|ajustes-notificacoes|ajustes-video",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^settings-nav > label\\.settings-search( \\[|$)",
    casos:
      "ajustes-acessibilidade|ajustes-aparencia|ajustes-aplicativo|ajustes-audio|ajustes-notificacoes|ajustes-sala|ajustes-video",
    telas: ["768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^slot-junctions > button\\.merge-slot( \\[|$)",
    casos:
      "balao-avisos|balao-menu-do-widget|dialogo-pessoas|widget-cameras-grande|widget-chat-grande|widget-custom-grande|widget-dice-grande|widget-people-grande|widget-poll-grande|widget-random-grande|widget-screen-grande|widget-stream-grande|widget-tasks-grande|widget-timer-grande",
    telas: ["390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^timer-actions > button\\.primary( \\[|$)",
    casos: "widget-timer-grande|widget-timer-pequeno",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^timer-presets > button\\.timer-chip( \\[|$)",
    casos: "widget-timer-grande|widget-timer-pequeno",
    telas: ["768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^timer-ring-text > button\\.timer-time\\.timer-edit( \\[|$)",
    casos: "widget-timer-grande|widget-timer-pequeno",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^timer-seg > button( \\[|$)",
    casos: "widget-timer-grande|widget-timer-pequeno",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^toast > button\\.icon-button( \\[|$)",
    casos: "balao-avisos",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^toast > button\\.primary( \\[|$)",
    casos: "balao-avisos",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^toast > button\\.text-button( \\[|$)",
    casos: "balao-avisos",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^widget-header > button\\.widget-handle( \\[|$)",
    casos: "widget-screen-grande",
    telas: ["768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^widget-score > button( \\[|$)",
    casos: "widget-custom-grande|widget-custom-pequeno",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^widget-tools > button\\.icon-button( \\[|$)",
    casos:
      "widget-dice-grande|widget-dice-pequeno|widget-random-grande|widget-random-pequeno|widget-tasks-grande|widget-tasks-pequeno",
    telas: ["360x640", "390x844", "768x1024"],
    issue: "ABRIR-A1",
    nota: "alvo de toque menor que 44 px",
  },
  {
    regra: "alvo-pequeno",
    no: "^block-heading > button\\.inline-text\\.block-label( \\[|$)",
    casos: "widget-custom-grande|widget-custom-pequeno",
    telas: ["360x640", "390x844", "768x1024", "1280x720"],
    issue: "ABRIR-A2",
    nota: "alvo menor que 24 px também no desktop (WCAG 2.5.8)",
  },
  {
    regra: "alvo-pequeno",
    no: "^button\\.inline-text\\.row-label( \\[|$)",
    casos: "widget-poll-grande|widget-poll-pequeno",
    telas: ["360x640", "390x844", "768x1024", "1280x720"],
    issue: "ABRIR-A2",
    nota: "alvo menor que 24 px também no desktop (WCAG 2.5.8)",
  },
  {
    regra: "alvo-pequeno",
    no: "^button\\.raffle-chip( \\[|$)",
    casos: "widget-random-grande|widget-random-pequeno",
    telas: ["768x1024", "1280x720", "1920x1080"],
    issue: "ABRIR-A2",
    nota: "alvo menor que 24 px também no desktop (WCAG 2.5.8)",
  },
  {
    regra: "alvo-pequeno",
    no: "^landing-footer-links > a( \\[|$)",
    casos: "inicio-landing",
    issue: "ABRIR-A2",
    nota: "alvo menor que 24 px também no desktop (WCAG 2.5.8)",
  },
  {
    regra: "alvo-pequeno",
    no: "^module-duration > button\\.inline-text\\.row-number( \\[|$)",
    casos: "widget-poll-grande|widget-poll-pequeno",
    issue: "ABRIR-A2",
    nota: "alvo menor que 24 px também no desktop (WCAG 2.5.8)",
  },
  {
    regra: "alvo-pequeno",
    no: "^module-fields > button\\.inline-text\\.module-question( \\[|$)",
    casos: "widget-poll-grande|widget-poll-pequeno",
    telas: ["360x640", "390x844", "768x1024", "1280x720"],
    issue: "ABRIR-A2",
    nota: "alvo menor que 24 px também no desktop (WCAG 2.5.8)",
  },
  {
    regra: "alvo-pequeno",
    no: "^module-tasks > label( \\[|$)",
    casos: "widget-tasks-grande|widget-tasks-pequeno",
    issue: "ABRIR-A2",
    nota: "alvo menor que 24 px também no desktop (WCAG 2.5.8)",
  },
  {
    regra: "alvo-pequeno",
    no: "^raffle-actions > label\\.raffle-switch( \\[|$)",
    casos: "widget-random-grande|widget-random-pequeno",
    telas: ["768x1024", "1280x720", "1920x1080"],
    issue: "ABRIR-A2",
    nota: "alvo menor que 24 px também no desktop (WCAG 2.5.8)",
  },
  {
    regra: "alvo-pequeno",
    no: "^row-add > button\\.text-button\\.module-add( \\[|$)",
    casos: "widget-poll-grande|widget-poll-pequeno",
    telas: ["360x640", "390x844", "768x1024", "1280x720"],
    issue: "ABRIR-A2",
    nota: "alvo menor que 24 px também no desktop (WCAG 2.5.8)",
  },
  {
    regra: "alvo-pequeno",
    no: "^volume-slider > input( \\[|$)",
    casos: "balao-menu-do-widget|widget-people-grande|widget-people-pequeno",
    issue: "ABRIR-A2",
    nota: "alvo menor que 24 px também no desktop (WCAG 2.5.8)",
  },
  {
    regra: "alvo-pequeno",
    no: "^widget-header > button\\.widget-control-badge\\.is-admins( \\[|$)",
    casos:
      "widget-custom-grande|widget-custom-pequeno|widget-dice-grande|widget-dice-pequeno|widget-poll-grande|widget-poll-pequeno|widget-random-grande|widget-random-pequeno|widget-tasks-grande|widget-tasks-pequeno|widget-timer-grande|widget-timer-pequeno",
    issue: "ABRIR-A2",
    nota: "alvo menor que 24 px também no desktop (WCAG 2.5.8)",
  },
  {
    regra: "alvo-pequeno",
    no: "^widget-header > button\\.widget-control-badge\\.is-all( \\[|$)",
    casos: "balao-avisos|widget-chat-grande|widget-chat-pequeno",
    issue: "ABRIR-A2",
    nota: "alvo menor que 24 px também no desktop (WCAG 2.5.8)",
  },
  {
    regra: "cortado-pelo-conteiner",
    no: "^header-left > button\\.room-code\\.room-lock( \\[|$)",
    casos: "widget-screen-grande|widget-screen-pequeno",
    telas: ["360x640"],
    issue: "ABRIR-C1",
    nota: "cabeçalho a 360 e 390 px: código e tempo da sala cortados",
  },
  {
    regra: "cortado-pelo-conteiner",
    no: "^room-duration > time( \\[|$)",
    casos:
      "balao-avisos|balao-menu-do-widget|dialogo-pessoas|widget-cameras-grande|widget-cameras-pequeno|widget-chat-grande|widget-chat-pequeno|widget-custom-grande|widget-custom-pequeno|widget-dice-grande|widget-dice-pequeno|widget-people-grande|widget-people-pequeno|widget-poll-grande|widget-poll-pequeno|widget-random-grande|widget-random-pequeno|widget-screen-grande|widget-screen-pequeno|widget-stream-grande|widget-stream-pequeno|widget-tasks-grande|widget-tasks-pequeno|widget-timer-grande|widget-timer-pequeno",
    telas: ["360x640", "390x844"],
    issue: "ABRIR-C1",
    nota: "cabeçalho a 360 e 390 px: código e tempo da sala cortados",
  },
  {
    regra: "cortado-pelo-conteiner",
    no: "^b\\.dock-wide( \\[|$)",
    casos:
      "balao-menu-do-widget|widget-cameras-grande|widget-cameras-pequeno|widget-people-grande|widget-people-pequeno|widget-stream-grande|widget-stream-pequeno",
    telas: ["768x1024"],
    issue: "ABRIR-C2",
    nota: "botão Compartilhar do dock passa do contêiner a 768 px",
  },
  {
    regra: "sobreposicao",
    no: "^canvas-slot > button\\.add-widget( \\[|$)",
    casos:
      "balao-avisos|balao-menu-do-widget|dialogo-pessoas|widget-cameras-grande|widget-chat-grande|widget-custom-grande|widget-dice-grande|widget-people-grande|widget-poll-grande|widget-random-grande|widget-screen-grande|widget-stream-grande|widget-tasks-grande|widget-timer-grande",
    telas: ["390x844", "768x1024"],
    issue: "ABRIR-S1",
    nota: "O botão Adicionar widget cobre o botão de mesclar espaços a 390 e 768 px",
  },
  {
    regra: "texto-cortado",
    no: "^share-actions > button\\.primary( \\[|$)",
    casos: "dialogo-compartilhar",
    telas: ["360x640", "390x844"],
    issue: "ABRIR-T1",
    nota: "texto do botão Compartilhar cortado a 360 e 390 px",
  },
];

/**
 * Deliberate exceptions, not bugs: an element that legitimately breaks a rule.
 * `no` is matched against the readable element path printed in the report.
 */
export interface Excecao {
  regra: Regra;
  no: string;
  motivo: string;
}

export const EXCECOES: Excecao[] = [];
