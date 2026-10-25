# Mídia — handoff
Atualizado: 2026-10-25

## Agora
Canais do app Windows (#131), voz bloqueada no cliente (#132) e volume por pessoa até
200% (#133) entregues. Usuário precisa cadastrar secrets/token/Renders
(`docs/WINDOWS-RELEASE.md`) para a primeira publicação.

## Feito recentemente
- #131: `scripts/desktop-channel.mjs` (tabela dos canais + `tauri.channel.json` +
  feed). **VIO** = estável, CI do VIO na tag `vX.Y.Z`, `vio-releases/vX.Y.Z` com
  `VIO-x64-setup.exe` + `latest.json`, chave de produção (ID 7D499EB91F0CA1FE).
  **VIO Teste** = beta, CI do VIO_TEST a cada merge, versão `<versão>.<run>`, release
  fixo `beta` + `beta.json`, chave de teste (ID 3123E38BB793CE0D, entregue ao usuário).
  Beta aceita qualquer versão diferente do feed (`version_comparator`). Ícone beta com
  selo laranja (provisório, Design pode refinar). Sem secrets o workflow só avisa.
- #132 (#122): `Controller.voiceBlocked`; bloqueio solta a captura, `syncCapture` não
  publica, `VOICE_BLOCKED` no `publish` é tratado em silêncio. Teste `voice-block.test.ts`.
- #133 (#118): `AudioBoost` compartilhado (tela e voz); `RemoteVoice` amplifica acima de
  100% mantendo o `<audio>` original tocando mudo; `setPersonVolume`; menu da pessoa até
  200%. `ScreenAudioLab` cobre 150%.

## Decisões
- Dependências aprovadas: `@tauri-apps/cli`, `tauri`, `tauri-plugin-updater`, `windows`
  (+ `windows-core`, `serde`, `serde_json`).
- Voz liberada pelo dono não religa o microfone sozinha: a pessoa liga de novo.
- Matar servidor local pela porta (`fuser -k PORTA/tcp`), nunca `pkill -f`.

## Pendente / bloqueios
- Usuário: secrets e token (`docs/WINDOWS-RELEASE.md`); depois validar 1ª publicação beta.
- Issues da área: #23 (upload N×), #24 (AudioContext compartilhado), #25 (TURN).
- Links externos não abrem no app; janela flutuante (PiP) do ramo antigo não portada.
- Cartão e widget de pessoas seguem com volume até 100% (Frontend decide).

## Próximo passo
Conferir a primeira publicação beta quando o usuário cadastrar os secrets; depois #24.
