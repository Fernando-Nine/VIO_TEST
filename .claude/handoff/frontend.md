# Frontend — handoff

Atualizado: 2026-10-26

## Agora

PRs #138 (#115) e #139 (#81) com `check` verde, presas no `installer` (secret de
assinatura, ver bloqueios). Ambas sobem para rc.14: a segunda a entrar junta a `main`,
sobe para rc.15 e regenera o `CHANGELOG.md`.

## Feito recentemente

- #115 (PR #138): `color` opcional no conteúdo (só Cronômetro e Personalizado: anel e
  botões do contador) e `color` por opção + `palette` na Votação. `moduleResets` ignora
  cores da votação. Seletor comum `canvas/ColorFields.tsx` (`ColorFields`,
  `PaletteChoice`); `optionColors`/`withPalette`/`pollColored`/`accentChoices` em
  `shared/palettes.ts`. Votação sem paleta mantém os tons por posição.
- #81 (PR #139): na tira, arrastar um widget da tira dentro dela reordena (`stripDrop` no
  `RoomCanvas`, destaque `is-reorder-target`); fora da tira, flutua. Shift/teclado iguais.
- #107, #123/#109, #122: painel Pessoas, aviso de telas/sino, silenciar (rc.10–rc.12).

## Decisões

- Cada PR sobe um `-rc.N` e regenera o `CHANGELOG.md` com `npm run build` (a CI confere).
- `workspace.css` segue sem prettier; blocos novos vão no fim.
- Sem force push (trava): branch publicado com histórico ruim → branch novo `-v3`.
- Matar o servidor local pela porta, nunca `pkill -f` com padrão que case com o próprio shell.
- Widget Personalizado não está no catálogo; o menu "Cor" já aparece se ele existir.

## Pendente / bloqueios

- `installer` falha: `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` vazio para a chave atual
  (comentário na #138). Só o dono corrige o secret; depois, squash das duas PRs.

## Próximo passo

Secret corrigido → squash da #138, merge da `main` na #139 (rc.15), squash.
