# Mídia — handoff
Atualizado: 2026-10-22

## Agora
Diagnóstico da área concluído. Tela e áudio validados pelo usuário na prévia.

## Feito recentemente
- PR fix/midia-orphan-pc: PC órfão quando a assinatura termina durante a renovação
  de ICE (`Peers.accept`) e `AudioContext` órfão em `startVoice` concorrente.
- Issues abertas: #23 (alta) orçamento de upload por publicação; #25 (alta) confirmar
  TURN na prévia/produção; #24 (média) AudioContext compartilhado nos indicadores de
  fala; #26 (média) prova vertical WASAPI do app Windows.

## Decisões
- `disconnected` já dispara reinício de ICE após ~2 s. Se houver reinícios demais em
  Wi‑Fi instável, esperar mais nesse estado; sem evidência ainda, não mexido.

## Pendente / bloqueios
- #25: caminho de TURN e custo dependem do usuário.
- #26: Tauri/Rust são dependências novas; precisam do aval do usuário.
- Não existe ramo nativo; `docs/DESKTOP-WASAPI.md` é só especificação.

## Próximo passo
#23: medir upload/CPU do publicador no BrowserLab com 1, 3 e 6 espectadores.
