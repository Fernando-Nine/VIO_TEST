# Roadmap do VIO

Mantido pelo copiloto. Cada linha aponta para issues no VIO_TEST; o detalhe vive nelas.
Ordem = prioridade. Estado atual e decisões: `ESTADO.md`.

## 2.9.0 — fechar a prévia e publicar

- Widgets novos, pessoas, notificações, silenciar, volume até 200% (feito, rc.13).
- Cor nos widgets #115 e reordenar na Tira #81 (PRs prontas).
- Bugs vistos na prévia: #141 Dados, #142 anel de foco, #143 Tira, #144 tela cheia,
  #145 rodapé e volume por tela.
- Aval do usuário → release no VIO + tag `v2.9.0` → app Windows estável.

## 2.10.0 — leva 3 de Design aplicada

Rascunhos primeiro (Design), depois implementação (Frontend; Mídia na câmera).

- #146 cabeçalho de widget: minimizar (−) e fechar para todos (×).
- #147 widgets combinados (Pessoas, Minha transmissão) e tempos nos cabeçalhos.
- #149 Ajustes reorganizado; "Desativar áudio" no rodapé.
- #150 notificações, adicionar widget, layout (E10: 3×4) e volume.
- #148 câmera como widget.

## Depois

- Celular: layout de 1 coluna e app.
- Qualidade de mídia: #23 orçamento de upload, #24 AudioContext, #135 TURN.
- QA: #20 Prettier na CI, #21 conferência pós-deploy, #22 BrowserLab na CI.
- Abertura ao público: Render Starter, assinatura do instalador, landing e página de
  download (Design).
- Futuro (adiado, não proibido): contas, clips no aparelho, comunidade, monetização.
