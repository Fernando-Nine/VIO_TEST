# 020 — Movimento completo por padrão

Data: 2026-11-08 (#261, #227)

## Contexto

A regra "só `transform`/`opacity`" limitava a animação do Ponto e das telas, e cada efeito fora dela
pedia aval do usuário. Isso travava o Design e deixava a interface mais contida do que a marca pede.

## Decisão

- O padrão é **animação completa**. "Só `transform`/`opacity`" deixa de ser limite; efeitos fora dela não
  precisam mais de aval.
- **Reduzir movimento** (Ajustes › Acessibilidade, `src/client/components/motion.ts`,
  `data-motion="reduce"`) continua e passa a ser também o interruptor para PC fraco ou internet
  ruim, além de `prefers-reduced-motion`. Nele: esmaecer em até 150 ms; loops e efeitos de
  ambiente ficam estáticos ou somem.
- Seguem valendo os invariantes de mídia: não reparentar hosts de vídeo, não clonar vídeo,
  preservar PeerConnections, MediaStreams e players de áudio.
- Desempenho: evite blur/`backdrop-filter` e efeito de ambiente sobre vídeo (custo alto); se usar, o modo reduzido desliga. Sem exigir aval.

## Pendência

O achado 07.1 do catálogo (`docs/catalogo/07-cliente-e-interface.md`, L132): com movimento reduzido o
toast não fecha sozinho. Corrigir (prazo em JS, não no fim da animação) antes de contar com o modo
reduzido como interruptor de desempenho.

## Motivo

A marca precisa de liberdade para animar; quem tem aparelho fraco tem uma saída clara. O que
protege a chamada é a mídia intocada e o custo sobre vídeo, não a lista de propriedades.

Não rediscutir sem o usuário.
