# Notas da próxima prévia

Cada PR que muda algo que quem usa percebe cria **um arquivo novo** aqui, e nenhum outro
arquivo comum: sem mexer em `releases.ts`, `package.json` ou `CHANGELOG.md`, as PRs não
entram em conflito.

- Nome: `<issue>-<slug>.md`, por exemplo `281-avisos-layout.md`.
- Conteúdo: um parágrafo em português, para quem usa, como os itens de `src/shared/releases.ts`.
- O app mostra essas notas em "Somente no vio-test" da versão atual, junto com o commit curto
  do build. O `CHANGELOG.md` não as inclui.

## Fechar a prévia (QA)

Quando o usuário vai testar, ou na release:

1. Suba `-rc.N` em `src/shared/releases.ts` (`version`), `package.json` e `package-lock.json`.
2. Mova cada nota daqui para o registro da versão em `releases.ts` (ou para as seções estáveis,
   na release) e apague os arquivos, menos este README.
3. `npm run build` (gera o `CHANGELOG.md`), `npm test`, PR `chore: fecha a prévia X.Y.Z-rc.N`.
