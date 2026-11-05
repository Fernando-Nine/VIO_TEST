# Frontend — handoff

Atualizado: 2026-11-05

## Agora

#285 (Home só no app) em PR. Bloco 2.12 (#254, #258, #259, #260) entregue na prévia.

## Pendente / bloqueios

- Tamanho do instalador na landing: espera endpoint ou CSP (Backend).
- Link Privacidade na landing: espera a página do Jurídico.
- #162: o selo de câmera do Pessoas deve abrir o widget Câmeras já fixado (conferir).
- #261 transições: só no Opus com raciocínio no máximo (avisar o usuário).

## Decisões da área

- Início (`Home`) só no app (`desktop`); navegador sempre na landing, com nome salvo pré-preenchido. Salas recentes seguem gravadas, mas só o app as mostra.

- `data-ponto` marca cada "ponto que fica" (landing, inicio, ao-vivo, download, baixar,
  pessoa, logo, espera) para a #261 medir origem e destino.
- Download: produção baixa `VIO-x64-setup.exe` direto; prévia abre a release `beta`.
- Trabalha em lote, só com tudo decidido (bugs são exceção).

## Próximo passo

Primeira issue `frontend` da Fila (hoje P1: #281, #266, #268). Mapa do bloco 2.12: `docs/notas/frontend.md`.
