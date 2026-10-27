# Roadmap do VIO

Mantido pelo copiloto. Cada linha aponta para issues no VIO_TEST; o detalhe vive nelas.
Ordem = prioridade. Estado atual e decisões: `ESTADO.md`.

## 2.9.0 — fechar a prévia e publicar

- Pronta na prévia (rc.20): widgets novos, pessoas, notificações, silenciar, volume até
  200%, cores (#115), reordenar na Tira (#81) e bugs #141–#145.
- Aval do usuário → release no VIO + tag `v2.9.0` → app Windows estável.

## 2.10.0 — leva 3: casca da interface

Specs em `docs/design/` (PR #169). Backend faz a parte de servidor da #158.

- #166 layout (grade até 3×4, celular em 1 coluna) · #164 avisos no topo ·
  #165 adicionar widget · #161 tempos nos cabeçalhos · #167 volume da tela ·
  #163 Ajustes + Desativar áudio · #158 cabeçalho −/×/Desfazer.

## 2.11.0 — leva 3: widgets combinados e câmera

- #159 Pessoas (sala + chamada + mixer) · #160 Minha transmissão (Mídia) ·
  #162 Câmeras (Mídia).

## Depois

- Ajustes, depois (#168): Desenvolvedor e Idiomas antes de contas; Conta, Privacidade,
  Amizades, Apps conectados e Sair junto com contas; Assinaturas/Cobranças com
  monetização. Plano na #168.
- Celular: app.
- Qualidade de mídia: #23 orçamento de upload, #24 AudioContext, #135 TURN.
- QA: #20 Prettier na CI, #21 conferência pós-deploy, #22 BrowserLab na CI.
- Abertura ao público: Render Starter, assinatura do instalador, landing e página de
  download (Design).
- Futuro (adiado, não proibido): contas, clips no aparelho, comunidade, monetização.
