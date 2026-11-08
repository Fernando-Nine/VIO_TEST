# Em aberto: o Ponto em telas, balões e pop-ups

Decisão 021: trabalho de identidade sai em **5 estilos × 5 exemplos**. Os estilos são os de
[`../ponto.md`](../ponto.md) seção 4. **Aguarda a escolha do usuário** (comentário na prancha).
O que é fixo (cores, fontes, forma e personalidade do Ponto) é igual nos cinco; muda o desenho das
superfícies e o jeito de mover.

Prancha: seção "Em aberto" de `../brandkit/index.html` (publicada, link no [README](README.md)).
Tamanho real: largura de celular, 380 px. Botão "Reduzir movimento" na prancha mostra a versão
reduzida de todos os exemplos.

| Exemplo    | O que mostra                                                               |
| ---------- | -------------------------------------------------------------------------- |
| 1 · Início | Ponto chega ao botão "Criar minha sala" (onde descansa)                    |
| 2 · Balão  | Dica "Copiar convite": o Ponto se inclina para o botão, curioso            |
| 3 · Pop-up | "Sair da sala?" (texto de exemplo, sugestão): o diálogo se divide do Ponto |
| 4 · Aviso  | "Convite copiado.": o Ponto comemora pequeno                               |
| 5 · Espera | Sala trancada, "Pedindo para entrar…": o Ponto respira, paciente           |

| Estilo                | Superfície                                 | Movimento                                   |
| --------------------- | ------------------------------------------ | ------------------------------------------- |
| A · Neo-brutalista    | Borda clara grossa, sombra dura azul       | Viagem grande, freada seca                  |
| B · Swiss editorial   | Sem caixa; linha fina, grade, tipo grande  | Quase nada; um gesto pequeno e exato        |
| C · Expressivo spring | Superfícies macias, cantos largos, pílulas | Mola com sobra, rola em 45°, quica          |
| D · Bento modular     | Blocos em grade, raio 18, linha de 1 px    | Blocos entram em sequência, precisos        |
| E · Desenhado à mão   | Contorno irregular, traço que se desenha   | Traço `stroke-dashoffset`, Ponto com atrito |

**Custo anotado:** E usa `stroke-dashoffset` (paint, uma vez ao abrir). C usa só `transform`. Nenhum
usa blur. Em Reduzir movimento, todos esmaecem em 150 ms e a respiração da espera fica parada
(Ponto cheio + texto).

**Descartado:** Glass (blur sobre vídeo pesa, já cortado no guia); Ponto com "rostinho" (vira
mascote de desenho e briga com a regra "ele comunica pelo que faz").

**Recomendação (sugestão):** misturar por contexto, como o guia sugere: C na landing e no Início,
B ou D dentro da sala com vídeo. A escolha é do usuário.

Depois do aval: spec `docs/design/marca.md` (ou atualização deste capítulo) + issue `frontend` para
unificar tokens; as animações seguem para a #261.
