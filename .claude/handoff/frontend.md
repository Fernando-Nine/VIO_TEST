# Frontend — handoff

Atualizado: 2026-10-25

## Agora

Nada em andamento. Próxima issue: #115.

## Feito recentemente

- #107 (PR #127, rc.10): Pessoas em painel lateral não modal, linhas de 48 px com estado por
  ícone, abas Pessoas/Permissões, menu com volume (`ContextMenu` `header`) e Assistir a tela.
  Ações do menu em grupos (assistir → voz → sala) com separador automático.
- #123 + #109 (PR #128, rc.11): tela nova não ocupa espaço sozinha; etiqueta `ScreenToast`
  no canto (6 s, pausa no hover) → depois fica no sino. Ícone `LiveScreens` (Radio + número)
  só com telas de outros, lista com Assistir. Sino virou histórico (mais novo primeiro,
  horário), contador só de não lidas, zera ao abrir. Telas já no ar ao entrar não viram aviso.
  Chip vermelho `live-chip` removido. Diálogo "espaços ocupados" só ao escolher Assistir.
- #122 (PR #129, rc.12): "Silenciar para mim" (volume 0 local,
  `engine.silencedVolumes` restaura) para todos; "Silenciar para todos"/"Liberar voz" só
  para o dono via `moderate`. Linha mostra "Silenciado pelo dono" (`is-blocked`) e
  "Silenciado para você". Quem é bloqueado vê o aviso e o microfone desabilitado com o motivo.

## Decisões

- Cada PR sobe um `-rc.N` e regenera o `CHANGELOG.md` com `npm run build` (a CI confere).
- `workspace.css` segue sem prettier; blocos novos vão no fim.
- Sem force push (trava): branch publicado com histórico ruim → branch novo `-v3`.
- Matar o servidor local pela porta, nunca `pkill -f` com padrão que case com o próprio shell.

## Pendente / bloqueios

- #115 cor e paleta no Cronômetro, Votação e Personalizado (precisa campo no esquema).
- #118 (Mídia) volume por pessoa até 200%; o menu de Pessoas vai até 100%.
- Mídia: conferir que o cliente bloqueado solta a captura sem republicar em loop (#122).

## Próximo passo

#115: ler `docs/design/widgets-padrao.md`, adicionar `color`/`palette` opcionais no esquema
e reaproveitar o seletor do Sorteador.
