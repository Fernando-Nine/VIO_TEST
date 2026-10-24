# QA/Release — handoff

Atualizado: 2026-10-24

## Agora

Sem tarefa em andamento. Próximo: CI do instalador Windows com a Mídia (#26).

## Feito recentemente

- Release 2.8.0: VIO_TEST PR #82 (b435774, inclui entrada 2.7.2 no histórico); produção
  publicada pelo copiloto (VIO PR #2, 8993afb). Esta sessão não tem acesso ao VIO.
- CI roda `npm audit --omit=dev --audit-level=critical`.
- Prévia 2.8.0-rc.3 (PRs #27–#51: interface enxuta, sons, correções de mídia/memória).
- CI no GitHub Actions (#6, PR #18): `.github/workflows/ci.yml` em PR e push na `main`,
  Node 24 + cache npm → `npm ci`, typecheck, test, build e `CHANGELOG.md` sem diff.
- Diagnóstico: 90/90 testes passam, 6 execuções seguidas sem instabilidade (~6 s).
  Build ok; `package.json` e `releases.ts` em sincronia (o build já recusa divergência).

## Decisões

- Formatação (Prettier) e `npm audit` ficam fora da CI até #20 e #19 resolverem;
  entram como passos depois, para não deixar a `main` vermelha.
- Bancada de mídia segue manual até #22; aceite de mídia continua humano na prévia.
- Sem proteção de branch: no plano Free, repo privado não aplica regras. Vale a regra
  dos agentes (merge só com CI verde) + hook contra push na `main`. Rever se o repo
  ficar público ou mudar de plano.

## Pendente / bloqueios

- Tags no VIO: `v2.7.2` → c249a34 e `v2.8.0` → 8993afb (push de tag recusado na rede
  do copiloto; esta sessão sem acesso ao VIO). Usuário pode criar em Releases no GitHub.
- #83 body-parser e zod (altas, Backend) → depois subir a CI para `--audit-level=high`.
- #20 Prettier: 39 arquivos fora do padrão → PR só de formatação + `format:check` na CI.
- #21 conferência automática da prévia após deploy (`scripts/check-deployment.mjs`).
- #22 BrowserLab headless na CI (com mídia).
- `docs/VALIDACAO.md` ainda descreve a rodada D (2.7.0-rc.5); atualizar na próxima release.
- O VIO (produção) não tem CI; levar o mesmo workflow na próxima PR de release.

## Próximo passo

#20 (formatação), combinando com o copiloto o momento para não conflitar com PRs abertas.
