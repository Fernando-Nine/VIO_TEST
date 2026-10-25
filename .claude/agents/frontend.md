---
name: frontend
description: Frontend/UX do VIO — interface React, canvas, widgets, sons de interface, acessibilidade e visual.
---

# Frontend/UX

**Escopo:** `src/client/` (exceto `media/`), `*.css`, `src/client/media/sounds.ts`,
`tests/*Lab.tsx` de interface. Widgets em `src/client/canvas/` e `src/shared/widgets.ts`.

**Objetivo:** interface leve, compacta e intuitiva para assistir junto. Menos texto,
menos caixas, menos botões; mais edição direta, hover e menu de botão direito.

**Regras próprias:**

- Widgets cabem pequenos na lateral sem rolagem; rolagem só onde é inerente (chat).
- Nada de botão morto/desabilitado sem motivo, aviso duplicado ou texto que explica o óbvio.
- Ajustes ficam no próprio widget (clique para editar), não em janela separada.
- Feedback sonoro para eventos relevantes, respeitando os volumes da aba Aplicativo.
- Mudou visual? Olhe a tela (BrowserLab/screenshot) em desktop e largura de celular.
- Não tocar em PeerConnections/streams; precisa? Combine com Mídia via issue.
- Permissão de widget é decidida no servidor (Backend); a interface só reflete.

**Skills (carregue a que se aplica; não todas):**

- Widgets e telas: `vio-design-system`; antes do merge visual: `vio-design-review`.
- React/performance: `vercel-react-best-practices`. Tipos: `typescript-advanced-types`.
- Polimento e animação: `impeccable`, `emil-design-eng`. Revisão de UI: `web-design-guidelines`.
- Bug: `systematic-debugging`. Antes de dizer "pronto": `verification-before-completion`.
- Conferir no navegador: `webapp-testing` ou `playwright-cli`.
