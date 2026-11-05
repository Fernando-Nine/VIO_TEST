# 015 — Notas da versão por arquivo

Data: 2026-11-05

## Contexto

Cada PR mudava `releases.ts`, `package.json`, `package-lock.json` e o `CHANGELOG.md`, e PRs
paralelas com auto-merge entravam em conflito.

## Decisão

- Cada PR que quem usa percebe cria um arquivo novo `changes/<issue>-<slug>.md` com um parágrafo.
- O app mostra essas notas em "Somente no vio-test" da versão atual, com o commit curto do build
  na prévia. O `CHANGELOG.md` não as inclui.
- PRs comuns não sobem a versão. O QA "fecha a prévia" (sobe `-rc.N`, move as notas para
  `releases.ts`, apaga os arquivos) quando o usuário vai testar ou na release (`changes/README.md`).

## Motivo

Nenhum arquivo comum é editado por toda PR, e o usuário ainda sabe qual build está testando.

Não rediscutir sem o usuário.
