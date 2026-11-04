# Notas técnicas — Frontend

Mapa do que entrou no bloco 2.12 (movido do handoff em 2026-11-04). Ler sob demanda.

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
