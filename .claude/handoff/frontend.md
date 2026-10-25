# Frontend — handoff

Atualizado: 2026-10-25

## Agora

#107 Pessoas pronta no branch `feat/107-people-panel` (sem PR): painel lateral não modal
(`Dialog modal={false}`, classe `sheet-people`), abas Pessoas · N / Permissões, linhas de
48 px, menu com volume (`ContextMenu` ganhou `header`), folha no celular. Falta só o
"Silenciar para mim" (usuário vai confirmar via copiloto). #109 Transmissões não começou:
o comportamento da etiqueta também espera resposta.

## Feito recentemente

- #104 + #111 (PR #114): sem compartilhar; "Para mim / Para a sala" no catálogo só para
  quem pode (`adminCreate`/`guestCreate`). Selo `ControlBadge` no `WidgetFrame`
  (Todos/Admins/Só você), "Quem pode controlar" via `widget-permission allGuests`, menu
  em ordem única com `separated`, X só remove do layout. Sorteador: "Cor e paleta".
- #108 (PR #116): Ajustes em lista lateral (`sheet-settings`), Sala só para gestores,
  medidor de sensibilidade (`capture.inputDb`, aviso à Mídia na PR).
- #110 (PR #117): doca de 56 px no rodapé, abas no celular (Microfone, Áudio, Tela, Mais),
  pílula em tela cheia. `underDock`/`dockLift` só em tela cheia. Rodapé antigo some na sala.
- Prévia: 2.9.0-rc.9.

## Decisões

- Cada PR sobe um `-rc.N` e regenera o `CHANGELOG.md` com `npm run build` (a CI confere).
- `workspace.css` segue sem prettier; blocos novos vão no fim.

## Pendente / bloqueios

- #115 cor e paleta no Cronômetro, Votação e Personalizado (precisa campo no esquema).
- #118 (Mídia) volume por pessoa até 200%; o menu de Pessoas vai até 100%.
- Resposta do usuário: "Silenciar para mim" (#107) e etiqueta de transmissões (#109).

## Próximo passo

Com a resposta, terminar #107 (rebase, rc.10, PR) e fazer #109; depois #115.
