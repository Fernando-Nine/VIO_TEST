# Checklist de release (VIO_TEST → VIO)

Só com o aval do usuário na prévia (exceção: hotfix de segurança). Siga na ordem.

1. Anote o commit aprovado do VIO_TEST (`<sha>`, versão `X.Y.Z-rc.N`).
2. **VIO_TEST**: em `src/shared/releases.ts`, o registro `X.Y.Z` ganha data e notas estáveis
   (curtas, por seção, para quem usa). Rode `npm run build` para gerar o `CHANGELOG.md` (a CI
   falha se ele ficar desatualizado). PR, CI verde, squash.
3. **VIO**: branch novo a partir da `main`; `git rm -rq . && git checkout <sha> -- .`; confira
   `git write-tree` = `git rev-parse <sha>^{tree}`.
4. No VIO, mude só: `version` e `currentRelease` em `releases.ts` (mesmas notas do passo 2),
   `package.json`, `package-lock.json` (as duas linhas da versão) e `npm run build` para o
   `CHANGELOG.md`. `git diff --cached --stat <sha>` deve mostrar só esses 4 arquivos.
5. `npm run typecheck` e `npm test`. Commit `release: X.Y.Z from VIO_TEST <sha>`, PR no VIO.
6. CI verde (`check` e `installer`, ~12 min) → squash.
7. Avise o usuário para criar a tag `vX.Y.Z` em Releases.
8. Feche as issues que saíram na versão; atualize a tabela de Ambientes do `ESTADO.md` e o
   handoff do copiloto.
