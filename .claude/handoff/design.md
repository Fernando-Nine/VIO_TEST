# design — handoff

Atualizado: 2026-10-28 (leva 5 publicada)

## Agora

**Leva 5** publicada, aguardando escolha por comentário: canvas **VIO · Leva 5**
https://claude.ai/artifact/6wwRHH5cSppNTGfAm4rKtZ (roteiro `docs/ideias/2026-10-28-roteiro.md`, PR #241).

- #197 Landing C "O ponto": A eixo do ponto (trilha central, CTA no cabeçalho) × B ponto que salta
  (texto e janela alternados, CTA + navegação de pontos à direita); celular comum; protótipo da
  viagem do ponto e mini-sala que funciona (roleta, votação, voz) — ambos interativos.
- #197 Início do app: A tudo ao centro (Criar abre cartão com Trancada) × B Recentes na lateral
  (menu Renomear/Copiar convite/Esquecer; campo reconhece link); abertura e Criar → palco.
- #242: A cadeado no topo + aviso "bateu na porta" (Deixar entrar/Agora não) × B porta no painel
  Pessoas (Aceitar/Recusar, Convidar com validade, Revogar); telas de espera, recusa e expirado.
- Sala: A ponto discreto × B ponto protagonista (pessoas como pontos no rodapé do palco); 8 momentos;
  Tweaks troca Noite/Noite azul/Claro.
  Marca da #227 usada sem mudanças (detalhes do logo seguem em outra sessão Design).

**#227 marca/brandbook/design system** publicada, aguardando escolha por comentário:
canvas **VIO · Marca** https://claude.ai/artifact/CQ7zbg9248JmEqZFeHAAoo (logo A/B/C, paleta A/B,
tipografia, voz, uso, tokens, componentes) e Figma https://www.figma.com/design/CoylihBjLm50Z2ySHEw3Dp
(variáveis de cor A e B, medidas, estilos de texto VIO/\*, logos, Botão e Selo). Recomendado: logo A +
paleta A. Plano Figma starter: 1 modo por coleção, por isso A e B são coleções separadas.
Após o aval: spec `docs/design/marca.md` + issue `frontend` para unificar tokens
(`styles.css` × `room.css` divergem; ~40 cores soltas; 14 raios). Depois, landing #197.

Leva 4 fechada em parte (27 out). Canvas **VIO · Leva 4** https://claude.ai/artifact/7ERZLFRtHn6xXE6mXcoPUf,
com a linha "Escolhidas" no topo.

- #197 em aberto. **Landing**: o usuário recusou A e B (perdem o fundo animado). A ideia é
  manter a 1ª tela e descer com rolagem com snap: Por que instalar → Funcionalidades →
  Download. O copiloto define o conteúdo e pede a nova leva. **Início do app**: escolhida a
  C; a criação de sala fica com o roteirista ou o copiloto.

## Feito recentemente

- Leva 4: #191 A (app com suporte) + B (navegador), `compartilhar.md`. #195 A + D + E
  (borda com Shift, sem atalho novo), `grade-foco.md`, #221. #196 B + aba Comunidade,
  `adicionar-widget.md` reescrita, #222. #195 e #196 fechadas.

- Skill `vio-design-delivery` (formato da leva 3 + edição das levas 1/2) e
  `docs/design/ideias-futuras.md` (categorias futuras de Ajustes, divergências com o plano da #168).
- Escolhas do usuário (27 out) viraram specs e issues `frontend`:
  - Cabeçalho − / × + Desfazer + "N não exibidos" — `cabecalho-widget.md`, #158 (+backend).
  - Widget Pessoas C, volume sempre à vista, menu só no botão direito — `widget-pessoas.md`, #159.
  - Minha transmissão A + silenciar, trocar, seletor 1/2 — `minha-transmissao.md`, #160 (+midia).
  - Tempo da sala no site, tempo da tela na tela — `tempos.md`, #161.
  - Câmeras C + B (destaque, uma na Tira, fixar; sem amassar) — `cameras.md`, #162 (+midia).
  - Ajustes em grupos com busca + Desativar áudio na doca — `ajustes.md` (reescrita), #163.
  - Avisos B no topo com barra de tempo — `notificacoes.md`, #164.
  - Adicionar widget A + B + C — `adicionar-widget.md`, #165.
  - Layout A sem Foco único + celular — `layout.md`, #166.
  - Volume: dourado, botão direito, vertical em tela cheia — `volume.md`, #167.
  - Itens novos de Ajustes, para depois — #168.
- `widgets-padrao.md` (nomes do menu) e `transmissoes.md` (etiqueta vira aviso no topo) ajustados.
- Prévia do Render inacessível pela rede do contêiner: olhar a sala com build local.

## Decisões

- "Silenciar para mim" (#107): qualquer pessoa silencia para si; "para todos" só o dono
  (#122, implementado).

- Skills do projeto: `vio-design-system`, `vio-design-review` e `vio-design-delivery`.
- Destaque discreto `#A6A9FF`; volume acima de 100% em `#F2D36B`.
- Animações ≤ 800 ms, desligadas em movimento reduzido.

## Pendente / bloqueios

- Copiloto: milestone das issues #158–#168.

## Próximo passo

Esperar o conteúdo da landing (copiloto) e a forma de criar sala, para fechar a #197.
Copiloto decide as divergências listadas em `ideias-futuras.md` (nome do grupo App, Atalhos).
