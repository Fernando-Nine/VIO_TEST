# Frontend — handoff

Atualizado: 2026-10-25

## Agora

#107 Pessoas pronta no branch remoto `feat/107-people-panel` (base antiga; o rebase sobre
a main está só no container que encerrou — refaça: conflito só no fim do `workspace.css`,
manter os dois blocos). Painel não modal (`Dialog modal={false}`, `sheet-people`), abas,
linhas 48 px, menu com volume (`ContextMenu` ganhou `header`), folha no celular.

Respostas do usuário (copiloto, 2026-10-25):
- #122 (da #107): "Silenciar para mim" para todos; "Silenciar para todos" só para o dono.
  Servidor é do Backend: **esperar o contrato na #122**.
- #123 (da #109): ícone "ao vivo" discreto só com as telas ativas; sino normal com
  contador que zera ao abrir e mantém o histórico.

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

## Próximo passo

Rebasear e abrir a PR da #107 (rc.10) sem o silenciar; fazer #123 (#109); #122 quando o
contrato sair; depois #115. Skills novas em `.claude/skills/` (ver o papel).
