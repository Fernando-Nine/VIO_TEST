# Frontend — handoff

Atualizado: 2026-10-29 (Frontend 14)

## Agora

Bloco 2.12.0 entregue em PRs encadeadas: #254 (PR #263, rc.24), #258 (PR #264, rc.25),
#259 (PR #265, 2.12.0-rc.1), #260 (PR #266?, 2.12.0-rc.2). #261 (transições) é de outra sessão.

## Feito recentemente

- #254: catálogo no espaço vazio em `auto-fill`; ≤ 339 px Mim/Sala viram ícones. Placar →
  Para a sala: `canvas/room-content.ts` (`roomContentKind`). Aba Comunidade = texto inline.
- #258: `components/Landing.tsx` (4 telas, `LandingAction` no cabeçalho), `MiniRoom.tsx`,
  `Logo.tsx` (N3 da #227, usada em todo o app; `.brand-logo`, ponto `.brand-logo-dot`).
  Computador ≥ 960×560: `.landing-page` é o contêiner de rolagem com snap proximity.
  Celular (< 680): sem snap/trilha, termina no rodapé. `.app-footer` some na landing.
- #259: `components/Home.tsx` (+ `Splash`), `home.css`, `room/recent-rooms.ts`. Início =
  app sempre; navegador quando `vio:name` existe (salvo ao abrir uma sala). `chooseColor`
  no controller. `.switch-track` (home.css) é o switch padrão novo.
- #260: `components/RoomLock.tsx` (`RoomCode`: cadeado + painel para quem gerencia),
  `Door.tsx` (espera/recusado/expirado), `door.css`, `room/invite-text.ts`. Controller:
  `view.turnedAway`, `inviteExpired`, cue `knock`, ENTRY_REFUSED/WAITING_FULL sem loop.
  Toast ganhou `dismiss` (segundo botão). `?convite=` vai ao `enter` (App `inviteFor`).

## Decisões

- `data-ponto` marca cada "ponto que fica" (landing, inicio, ao-vivo, download, baixar,
  pessoa, logo, espera) para a #261 medir origem/destino.
- Download: produção baixa `VIO-x64-setup.exe` direto; prévia abre a release `beta`.
- Convite revogado ainda só "bate" (servidor não distingue); vencido é lido do token.
- Regra do usuário (30 out): Frontend trabalha em lote, só com tudo planejado (bugs são exceção).
- Linha agora é 2.12.0-rc.N (copiloto); a 2.11.0 de produção sai do commit da rc.24.

## Pendente / bloqueios

- Tamanho do instalador na landing: precisa de endpoint ou CSP (Backend).
- Link Privacidade na landing: espera página do Jurídico. Áudio de 3 s (opcional) não feito.
- #162: selo de câmera do Pessoas deve abrir o widget Câmeras fixado.

## Próximo passo

Conferir as PRs mescladas e ver `docs/ESTADO.md` com o copiloto.
