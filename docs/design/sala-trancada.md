# Sala trancada, espera e convites — spec da interface (#242, escolha A)

Canvas da leva 5, linha "Escolhidas" (https://claude.ai/artifact/6wwRHH5cSppNTGfAm4rKtZ):
prancha "Escolhida · #242 A" e "242 · Quem chega: espera, recusa, expirado". O servidor e o
protocolo são da #242 (Backend); aqui só a interface.

## Quem vê o quê

- **Criador e admins**: cadeado clicável, painel de entrada e o aviso "bateu na porta".
- **Demais**: cadeado só como indicador (`role="img"`, "Trancada"), sem menu. Sem botão morto.

## Cadeado no topo

- No cabeçalho da sala, o código vira botão de 40 px (mono): ícone `Lock` (trancada) ou
  `LockOpen` (aberta) + código. Trancada: borda `--accent`.
- Clique abre o **painel de entrada** (popover de 360 px, `--raised`, `--shadow`, preso ao
  botão; Esc fecha; foco volta ao botão):
  1. Chave **Sala trancada** (`role="switch"`) + "Quem já esteve aqui entra direto. Quem é
     novo espera você deixar."
  2. **Convite**: segmentado de validade **1 hora · 1 dia · 7 dias** (padrão 1 dia, lembra a
     última escolha) + caixa **Entra direto, mesmo trancada** (marcada por padrão) +
     **Copiar convite** (`.primary`, ícone `Link`). Depois de copiar: aviso "Convite copiado.
     Vale até amanhã, 21:40." (data/hora local).
  3. **Revogar convites** (`--danger`) + "Os convites já enviados param de valer." Pede
     confirmação no próprio botão (segundo clique em 3 s: "Revogar mesmo?").
- Para quem não é admin, Copiar convite continua no cabeçalho como hoje (link simples, sem
  validade).

## "Bateu na porta"

- Aviso no topo, padrão dos avisos B (#164, [notificacoes.md](notificacoes.md)), 560 px:
  avatar da pessoa + "**Lia** bateu na porta." + selo "+N esperando" quando houver mais +
  **Agora não** (texto) + **Deixar entrar** (`.primary`). Barra de tempo do aviso.
- Some ao responder, ou quando outro admin responder (vale para todos os admins).
- Se o aviso expirar sem resposta, a pessoa continua esperando; o selo "N na porta" fica no
  painel Pessoas (seção "Na porta", com os mesmos dois botões) até a espera expirar.
- Som curto de "bateu" (respeita o volume de efeitos).

## Quem chega (sala trancada)

- Cartão central (computador) ou tela cheia (celular 380), com o ponto num quadrado de 120 px:
  - **Pedindo para entrar…** — "A sala K7Q2MX está trancada. Quem cuida dela já foi
    avisado." + **Cancelar**. O ponto pisca (1,2 s); parado com movimento reduzido.
  - Recusado ou espera expirada: **Não deu para entrar agora.** — "Tente de novo mais tarde
    ou fale com quem chamou você." + **Voltar ao início**.
  - Convite vencido ou revogado: **Esse convite expirou.** — "Peça um novo para quem chamou
    você." + **Voltar ao início**.
- Aprovado: segue a transição normal de entrada (o ponto vira o palco).
- Erros visíveis são `Fault` com `code` e estas mensagens; nada de código técnico na tela.

## Acessibilidade

- Aviso com `role="status"`; painel com foco preso enquanto aberto; botões ≥ 44 px no
  celular (36 px no aviso do computador, como os avisos atuais).
