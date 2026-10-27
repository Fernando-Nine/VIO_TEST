# Compartilhar tela — spec (#191, escolha A + B)

Canvas da leva 4, linha "Escolhidas" (https://claude.ai/artifact/7ERZLFRtHn6xXE6mXcoPUf):
prancha 191A (app, com miniaturas) e 191B (navegador). As duas são interativas.

## Quando usar cada uma

- **A · app com suporte**: app Windows com a captura nativa da #192 (lista e miniaturas
  feitas pelo VIO). Um clique em Compartilhar começa, sem o seletor do WebView2.
- **B · navegador ou sem suporte**: navegador, ou app sem a #192 (ou Windows sem suporte).
  Mesmo modal sem miniaturas; Compartilhar abre o seletor do navegador/WebView2.
- A janela antiga ("Áudio de um aplicativo" primeiro, no canto) sai.

## Modal (comum)

- Centralizado, 720 px de largura, altura pelo conteúdo; fundo da sala escurecido
  (`rgba(5,6,10,.78)`). Painel `--panel`, borda `--line`, raio `--radius`, `--shadow`.
- De cima para baixo:
  1. Título "Compartilhar tela" + botão × (44×44, "Fechar").
  2. Abas (segmentado, `role="tablist"`): **Tela inteira** (`Monitor`) ·
     **Janela do aplicativo** (`AppWindow`). Altura 44.
  3. Área da fonte (A: miniaturas; B: aviso do seletor).
  4. Duas faixas lado a lado (`radiogroup`, números em IBM Plex Mono):
     **Qualidade** 480p · 720p · 1080p · Fonte; **Taxa de quadros** 15 FPS · 30 FPS · 60 FPS.
     Padrão sugerido: 720p · 30 FPS (lembrar a última escolha por pessoa).
  5. Linha final (borda superior `--line`): rótulo de som + segmentado **Com som**
     (`Volume2`) / **Sem som** (`VolumeX`); à direita **Cancelar** (`.secondary`) e
     **Compartilhar** (`.primary`).
- Rótulo do som muda com a aba: "Som do computador" (Tela inteira), "Som da janela"
  (Janela), "Som da aba" (Aba do navegador, B).
- Esc e × fecham sem compartilhar. Foco preso no modal; ao abrir, foco na aba ativa.
- Trocar fonte (#160) usa o mesmo modal, com o botão "Trocar".

## A · miniaturas (app)

- Grade de 3 colunas, miniaturas 16:9 (raio 10), nome embaixo (14 px, reticências; nome
  inteiro no `title`) e linha mono 12 px (resolução da tela ou o executável).
- Área com altura fixa de 304 px e rolagem, para o modal não pular ao trocar de aba.
- Escolhida: contorno 2 px `#A6A9FF` com 3 px de afastamento + marca redonda com ✓.
  Botões com `aria-pressed`.
- Tela inteira já vem com a tela principal escolhida (um clique). Janela começa **sem**
  escolha e Compartilhar fica desativado (opacidade .45) até escolher, para não
  compartilhar a janela errada.
- Lista sem janelas ocultas, sem título ou sem tamanho (#192). Miniaturas se atualizam
  ao abrir e a cada troca de aba; carregando: blocos `--raised` sem texto.
- Vazio na aba Janela: "Abra o aplicativo que deseja compartilhar." + botão Atualizar.
- Erro de captura: `Fault` com mensagem em português, no lugar da grade.

### API nativa (já na `main`, Mídia)

`src/client/desktop/share.ts`:

- `listVideoSources()` → `VideoSource[]` (`kind` `screen`/`window`, `title`, `width`,
  `height`, `primary`, `minimized`). Abre as abas Tela inteira e Janela do aplicativo;
  a tela com `primary` vem escolhida.
- `videoThumbnail(source)` → miniatura de cada cartão (carregar sob demanda, por aba).
- `startNativeShare(engine, { source, quality, audio, replace })` → Compartilhar.
  `audio`: Sem som = `"none"`; Com som = `"app"` na aba Janela e `"system"` (o PC
  inteiro, sem o VIO) na aba Tela inteira. `quality` vem das faixas Qualidade e Taxa;
  `replace` = Trocar (#160).
- Erro lançado vira `Fault` com a mensagem dele no modal.

## B · navegador

- No lugar da grade, faixa tracejada com `ArrowUpRight` e uma linha:
  "Ao clicar em Compartilhar, o navegador pede para escolher a tela." (ou "a janela",
  "a aba", conforme a aba). Compartilhar leva `ArrowUpRight` à direita do texto.
- A aba vira dica para o navegador (`displaySurface`: `monitor`, `window`, `browser`).
- **Aba do navegador** (sugestão aprovada junto da B): terceira aba, só em Chrome/Edge.
- Som desligado onde o navegador não capta: Janela (nenhum navegador capta som de uma
  janela) e Firefox/Safari (nenhum som). "Com som" fica desativado com dica no hover:
  - "O navegador não capta o som de uma janela. Use Tela inteira, Aba do navegador ou o app."
  - "Este navegador não compartilha som. Use o Chrome, o Edge ou o app."
- Qualidade e taxa viram restrições do `getDisplayMedia`/encoder; "Fonte" = sem limite
  de resolução.

## Tamanhos

- Computador: 720 px. Janela estreita (< 760 px): modal ocupa a largura com 16 px de
  margem; miniaturas em 2 colunas; faixas Qualidade e Taxa empilham.
- Celular: navegadores de celular não compartilham tela; o botão Compartilhar da doca
  segue as regras atuais.

## Estado

Escolhas de qualidade, taxa e som são **pessoais** (lembradas no navegador/app).
O servidor não muda; a publicação continua indexada por `publicationId`.

## Animação

Entrada do modal: opacidade + escala .98→1 em 160 ms (`--ease`); sem animação em
movimento reduzido.
