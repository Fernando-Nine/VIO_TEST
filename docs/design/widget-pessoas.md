# Widget Pessoas — spec (#147, escolha C com volume sempre à vista)

Seção "Escolhidas" do canvas da leva 3
(https://claude.ai/artifact/3yJ4umERzwmY3vtWfxt8hJ#escolhidas). É o widget do canvas;
o painel lateral de Pessoas da barra superior continua em [pessoas.md](pessoas.md).

## Objetivo

Um widget só para Pessoas na sala, Pessoas na chamada e Mixer de volume.

## Estrutura

- Cabeçalho: ícone `Users`, título "Pessoas", botões conforme [cabecalho-widget.md](cabecalho-widget.md).
- Grupo **Na chamada · N** (rótulo mono maiúsculo): bolhas em grade.
  - Avatar com iniciais na cor da pessoa; anel `#4CDDC3` quando fala.
  - Selos no avatar, sempre com ícone e `aria-label`: transmitindo (`Monitor`, `#A6A9FF`,
    canto superior direito), microfone desligado (`MicOff`, `#FF8A96`, inferior direito),
    câmera ligada (`Video`, `#A6A9FF`, inferior esquerdo; clique abre a câmera, ver
    [cameras.md](cameras.md)).
  - Abaixo do avatar: nome e **volume sempre visível, mesmo em 100%**. Na sua bolha, "você".
- Grupo **Na sala · N**: quem está fora da chamada, avatar esmaecido.

## Volume (0–200%, #118)

- Controle deslizante com marca em 100%. Trecho até 100% em `#A6A9FF`; acima de 100%
  (amplificado) em `#F2D36B`, e o número também fica dourado. Número em IBM Plex Mono.
- Teclado: setas ±5%, Page Up/Down ±25%, Home 0%. Clique duplo no número volta a 100%.
- Na Tira, a roda do mouse sobre a pessoa muda ±5% (sugestão).

## Menu da pessoa

Só no **botão direito** (toque longo no celular; Shift+F10 ou tecla de menu no teclado).
Ordem: Abrir câmera (se ligada) · Voltar o volume a 100% · Silenciar para mim — separador —
Tornar/Revogar administrador · Transferir posse da sala (só para quem pode). Clique simples
na bolha não abre nada.

## Tamanhos

| Tamanho         | Avatar | Grade     | Volume                                  | Na sala                     |
| --------------- | ------ | --------- | --------------------------------------- | --------------------------- |
| Lateral 420×240 | 42 px  | 4 colunas | número ao lado do nome + trilho embaixo | uma linha: avatares + nomes |
| Tira 280×160    | 32 px  | 4 colunas | só o número                             | "+N na sala"                |
| Foco 960×640    | 84 px  | 4 colunas | trilho de 170 px + número               | bolhas de 56 px             |
| Celular 380     | 56 px  | 3 colunas | como na lateral                         | uma linha                   |

Mais pessoas do que cabem: o widget rola só no grupo "Na chamada" (sem rolagem na Tira; mostra "+N").

## Substitui

Pessoas na sala, Pessoas na chamada e Mixer de volume saem do catálogo. Numa sala que já os
tem abertos, o primeiro vira Pessoas no mesmo espaço e os outros fecham, sem aviso.

## Estado

Volume e "Silenciar para mim" são pessoais. Papéis e permissões são da sala (servidor confere).
