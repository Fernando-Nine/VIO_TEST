# Plano de design por fases

Ordem do trabalho de identidade, telas e animações do VIO (#227). Pedido do usuário, 9 nov 2026.

## Regras

- **Cada etapa só começa com o aval do usuário na anterior.** O copiloto confere o aval antes de
  abrir a sessão da área.
- Produzir só com pedido explícito ([`CLAUDE.md`, Autonomia](../../../CLAUDE.md#autonomia)).
- As áreas usam as skills de design (`vio-design-system`, `vio-design-review`,
  `vio-design-delivery` e as do papel em `.claude/agents/design.md`) e, em movimento, as de
  movimento (`emil-design-eng`, `impeccable`, `motion-object-design`, `motion-scene-design`).
- O [brandbook](../brandbook/README.md) só recebe o que foi decidido; o que está em aberto fica em
  [`../escolhas/`](../escolhas/README.md).

## Fases

| Fase | O quê                                                                                                                           | Depende de |
| ---- | ------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 0    | **Limpeza.** Reverter a #328, separar brandbook (decidido), escolhas (aberto) e guias (como produzir).                          | —          |
| 1a   | **Guia do Brandbook**, com perguntas só do que não depende do estilo. Corre em paralelo à 1b.                                   | 0          |
| 1b   | **Revisão do que existe**: telas, componentes e tokens atuais. Corre em paralelo à 1a.                                          | 0          |
| 1c   | **Guia de componentes** (pop-ups, modais, balões, toasts, menus), sem estilo.                                                   | 1b         |
| 1d   | **Guia de telas**, sem estilo.                                                                                                  | 1b         |
| 2    | **Exploração de estilo**: 5 estilos × 2 amostras em telas reais (estilos em [movimento-ponto.md](movimento-ponto.md), seção 4). | 0, 1c, 1d  |
| 3    | **Consolidação.** Brandbook mais o que depende do estilo (raio, sombra, densidade, contraste); depois o Brandkit e os tokens.   | 1a, 2      |
| 4    | **Produção das telas.** Primeiro tokens unificados e favicon M4, depois componentes, depois telas.                              | 3          |
| 5    | **Animações** sobre as telas finais (#261 e demais).                                                                            | 4          |

## Exceção de 9 nov 2026

A pedido do usuário, a **fase 2 roda logo após a 1c e a 1d, sem esperar o aval delas**; ele revisa
tudo junto ao voltar. A 1a continua bloqueando a fase 3.

## Notas

- A #261 (transições) e qualquer animação nova esperam a fase 5.
- Escolhas em aberto ligadas às fases: [`../escolhas/README.md`](../escolhas/README.md).
