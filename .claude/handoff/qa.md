# QA/Release — handoff

Atualizado: 2026-10-23

## Agora

Sem tarefa em andamento. Milestones: 2.8.0 (#19, #20, #30, #52–#55), 2.9.0
(#21–#25), App Windows (#26).

## Feito recentemente

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

- #19 proxy-addr crítico (com backend) → depois incluir `audit:production` na CI.
- #20 Prettier: 39 arquivos fora do padrão → PR só de formatação + `format:check` na CI.
- #21 conferência automática da prévia após deploy (`scripts/check-deployment.mjs`).
- #22 BrowserLab headless na CI (com mídia).
- `docs/VALIDACAO.md` ainda descreve a rodada D (2.7.0-rc.5); atualizar na próxima release.
- O VIO (produção) não tem CI; levar o mesmo workflow na próxima PR de release.

## Próximo passo

#20 (formatação), combinando com o copiloto o momento para não conflitar com PRs abertas.
