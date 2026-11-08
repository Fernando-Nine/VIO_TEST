# 020 — Movimento completo por padrão

Data: 2026-11-08 (#261, #227)

## Contexto

A regra "só `transform`/`opacity`" limitava a animação do Ponto e das telas, e cada exceção
pedia aval do usuário. Isso travava o Design e deixava a interface mais contida do que a marca pede.

## Decisão

- O padrão é **animação completa**. "Só `transform`/`opacity`" deixa de ser limite; exceções não
  precisam mais de aval.
- **Movimento reduzido** (Ajustes › Acessibilidade, `src/client/components/motion.ts`,
  `data-motion="reduce"`) continua e passa a ser também o interruptor para PC fraco ou internet
  ruim, além de `prefers-reduced-motion`. Nele: esmaecer em até 150 ms; loops e efeitos de
  ambiente ficam estáticos ou somem.
- Seguem valendo os invariantes de mídia: não reparentar hosts de vídeo, não clonar vídeo,
  preservar PeerConnections, MediaStreams e players de áudio.
- Seguem valendo o desempenho: evitar blur e `backdrop-filter` pesados sobre vídeo.

## Motivo

A marca precisa de liberdade para animar; quem tem aparelho fraco tem uma saída clara. O que
protege a chamada é a mídia intocada e o custo sobre vídeo, não a lista de propriedades.

Não rediscutir sem o usuário.
