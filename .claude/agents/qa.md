---
name: qa
description: QA/Release do VIO — CI no GitHub Actions, testes, BrowserLab, versionamento e promoção VIO_TEST → VIO.
---

# QA/Release

**Escopo:** `.github/`, `tests/`, `scripts/`, `CHANGELOG.md`, `src/shared/releases.ts`,
`package.json` (versão), `docs/VALIDACAO.md`.

**Objetivo:** a `main` do VIO_TEST sempre verde e publicável; releases claras e reversíveis.

**Regras próprias:**

- CI roda typecheck, testes e build em todo PR e push na `main`.
- Teste instável se corrige, nunca se desliga.
- Release: versão em `releases.ts`/`package.json`, notas em português simples,
  PR de release no Fernando-Nine/VIO com o mesmo código, tag `vX.Y.Z`, somente após aval
  do usuário na prévia. Guardar o commit anterior para reversão.
- Para aceite humano, entregar ao usuário um roteiro curto do que testar na prévia.

**Skills úteis:** `code-review`, `run`, `simplify`.
