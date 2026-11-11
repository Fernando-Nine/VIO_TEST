# Guia do Brandbook (fase 1a)

- **Fase:** 1a do [plano](plano.md). Corre em paralelo à 1b e **bloqueia a fase 3**.
- **Issue:** #227.
- **Prancha de perguntas:** https://claude.ai/artifact/YVskrhnhRkqmPuTQEzhR36 (responda por comentário em cada cartão).

Este guia é o mapa do Brandbook e do Brandkit completos: que capítulos existirão, o que cada um já
tem decidido e o que falta perguntar. Ele **não** é o brandbook. O [brandbook](../brandbook/)
continua só com o que foi decidido; o que está aberto fica em [escolhas](../escolhas/) e vira
pergunta aqui.

As perguntas desta fase não dependem do estilo visual. Raio, sombra, densidade, cores finais,
escala tipográfica e estilo de ilustração esperam as fases 2 e 3.

## 1. Capítulos

| Nº  | Capítulo            | Cobre                                                                      | Arquivo no brandbook                         |
| --- | ------------------- | -------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | Marca               | Logo, ícones do app, versões por fundo, respiro, tamanho mínimo, proibidos | `marca.md` (existe)                          |
| 2   | Nome e assinatura   | Escrita do nome, NerdQuest Studios, crédito ao fundador                    | `marca.md` (seção nova)                      |
| 3   | O Ponto             | Personalidade, forma, cor, ação principal, movimento                       | `ponto.md` (existe)                          |
| 4   | Cor                 | Azul da marca, tema padrão, paleta, contraste, temas futuros               | `fundamentos.md` (pode virar `cor.md` na 3)  |
| 5   | Tipografia          | Famílias, pesos, escala                                                    | `fundamentos.md`                             |
| 6   | Ícones de interface | Biblioteca, traço, tamanhos                                                | `fundamentos.md`                             |
| 7   | Voz e tom           | Personalidade, tratamento, erro, humor, emoji                              | `voz.md` (criado na primeira decisão)        |
| 8   | Imagem e ilustração | O que pode aparecer em imagem, estilo das ilustrações                      | `imagem.md` (criado na primeira decisão)     |
| 9   | Movimento           | Link para o capítulo do Ponto e para o guia de movimento                   | `ponto.md#movimento`                         |
| 10  | Aplicações          | Redes, instalador, página de download, avatar, favicon, marca d'água       | `aplicacoes.md` (criado na primeira decisão) |
| 11  | Brandkit (o pacote) | Arquivos prontos para baixar e usar                                        | `../brandkit/` (seção 3 abaixo)              |

Arquivo novo no brandbook só nasce quando houver a primeira decisão daquele capítulo.

## 2. Estado de cada capítulo

**1. Marca.** _Parcial._

- Decidido: logo "vio." N3 arredondada; ícone M4 "v. noite" como principal; M1 "v." sobre azul
  para fundos azuis. Origem: prancha "VIO · Marca", quadros "Escolhida · Logo VIO (N3
  arredondada) + ícones M4 e M1" e "Escolhidas · Ícones M4 (principal) e M1", 29 out 2026, #227
  ([marca.md](../brandbook/marca.md)).
- Decidido em 9 nov 2026: versões e logo sobre imagem (P9), respiro e tamanho mínimo (P10), usos
  proibidos (P11) e ícone de perfil (P14).
- Decidido em 11 nov 2026: cor do ponto da M1 (P8), monocromático, na cor do "v".

**2. Nome e assinatura.** _Decidido (9 nov 2026)._ "o VIO" em texto (P6); assinatura "da NerdQuest Studios" (P7), em [marca.md](../brandbook/marca.md). A troca nos rodapés do app é a fase 4.

**3. O Ponto.** _Decidido, exceto o estilo._

- Personalidade "amiguinho que guia e acompanha"; "o VIO é o ponto, e as pessoas também"; forma de
  quadrado arredondado, nunca círculo; cor azul quase sempre. Origem: guia do Ponto aprovado em 7
  nov 2026, seção 2 ([ponto.md](../brandbook/ponto.md)).
- Ação principal dividir e juntar (8 nov 2026). Movimento: decisões
  [002](../../decisoes/002-leva-5-e-movimento.md), [020](../../decisoes/020-movimento-completo.md)
  e [021](../../decisoes/021-entrega-criativa.md).
- Aberto: o estilo visual do Ponto, na fase 2 ([estilo-visual.md](../escolhas/estilo-visual.md)).

**4. Cor.** _Parcial._

- Decidido: azul da marca #2727F5 (logo e Ponto, 29 out e 7 nov 2026); Noite é o tema padrão
  ([decisão 003](../../decisoes/003-temas.md)).
- Decidido em 9 nov 2026: temas próprios (P12). Paleta, tokens e contraste esperam a fase 3
  ([cores.md](../escolhas/cores.md)).

**5. Tipografia.** _Parcial._ Bricolage Grotesque na interface e IBM Plex Mono em código, ping,
tempo e números (`CLAUDE.md`, "Convenções"). Pesos e escala na fase 3.

**6. Ícones de interface.** _Parcial._ `lucide-react` (`CLAUDE.md`). No código de hoje: traço
padrão de 2 px (exceções pontuais de 1,6 a 3) e tamanhos de 12 a 28 px, os mais comuns
16, 14 e 15. A escala fixa de traço e tamanhos sai na fase 3.

**7. Voz e tom.** _Decidido (9 nov 2026)_, em [voz.md](../brandbook/voz.md) (P1–P5). A #281 reescreveu textos de erro em 7 nov
(PR #316), antes desta escolha; se a voz decidida pedir ajuste, ele vira issue `frontend` nova.

**8. Imagem e ilustração.** _Parcial._ O que pode aparecer está decidido (P13, 9 nov 2026) em [imagem.md](../brandbook/imagem.md); o estilo das
ilustrações de estado espera as fases 2 e 3.

**9. Movimento.** _Decidido no Ponto._ O capítulo é um link para
[ponto.md#movimento](../brandbook/ponto.md#movimento) e para as cinco regras em
[movimento-ponto.md](movimento-ponto.md) (seção 1). Valores finais
na fase 5 (#261).

**10. Aplicações.** _Parcial._

| Aplicação          | Decidido                                                                                                | Aberto                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Redes              | Nada                                                                                                    | Card de link (3); ícone de perfil decidido (P14: M4)       |
| Instalador         | App Windows primeiro, instaladores em `vio-releases` ([decisão 006](../../decisoes/006-app-windows.md)) | Ícone final (4); arte do NSIS (3)                          |
| Página de download | Landing C "O ponto", escolha A, botão "Baixar para Windows" (#197, #258, [landing.md](../landing.md))   | Pendências da #197                                         |
| Avatar             | Cada pessoa é um ponto na sua cor (guia do Ponto, 7 nov 2026); cor pessoal na #299                      | Forma e raio nas fases 2 e 3 (P15 decidida: herda o Ponto) |
| Favicon            | M4 é o ícone principal (prancha Marca, 29 out 2026)                                                     | A troca em `public/` fica para a fase 4                    |
| Marca d'água       | Clipes têm marca d'água ([decisão 007](../../decisoes/007-clips.md))                                    | Desenho (P9 e fase 3)                                      |

## 3. Brandkit

O Brandkit é a pasta [`../brandkit/`](../brandkit/) com os arquivos prontos. Regra de exportação:
**um SVG mestre por peça**; todo o resto sai dele por script em `scripts/`, sem valor ajustado à mão
(exceto os ícones de 16 e 32 px, conferidos pixel a pixel). Se o script precisar de pacote novo,
pede aprovação antes.

| Item                  | Formatos                                                                    | Como sai                                                     | Estado                         |
| --------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------ |
| Logo mestre           | SVG com traço                                                               | À mão                                                        | Existe (`logo-vio.svg`, Noite) |
| Logo para terceiros   | SVG com traço convertido em contorno; PDF                                   | Conversão numa ferramenta vetorial, conferida sobre o mestre | Fase 3                         |
| Versões do logo       | Noite, Claro, Azul, mono claro, mono escuro (SVG)                           | Mestre com troca só de cor                                   | P9                             |
| Logo em PNG           | Altura 32, 64, 128, 256 px, em 1x e 2x, fundo transparente                  | Script a partir do SVG                                       | Fase 3                         |
| Ícone M4              | SVG; PNG 16, 32, 48, 64, 128, 192, 256, 512; maskable 512 (área segura 80%) | Script; 16 e 32 px conferidos à mão                          | SVG existe; PNG na fase 4      |
| Ícone M1              | SVG; PNG 128, 256, 512                                                      | Script                                                       | P8 (vira `icone-m1-azul.svg`)  |
| Ícone de perfil       | PNG 400×400 e 1024×1024, sangrado para recorte em círculo                   | Script                                                       | P14                            |
| Ícone do Windows      | `.ico` com 16, 24, 32, 48, 64, 256; bandeja clara e escura                  | PNGs juntados num `.ico`, para `src-tauri/icons/`            | Fase 4 (hoje `icon-beta.ico`)  |
| Favicon               | `favicon.svg`; PNG 32, 192, 512; maskable 512                               | Script, para `public/`                                       | Fase 4                         |
| Tokens                | JSON (formato W3C Design Tokens) e CSS custom properties                    | Um JSON gera o CSS por script; nenhum valor solto no código  | Fase 3                         |
| Fontes                | Bricolage Grotesque e IBM Plex Mono, com licença OFL                        | Referência aos pacotes `@fontsource` já aprovados; sem cópia | Decidido                       |
| Card de link (OG)     | PNG 1200×630                                                                | Script a partir de um SVG                                    | Fase 3                         |
| Arte do instalador    | BMP 24 bits: cabeçalho 150×57 e lateral 164×314 (NSIS)                      | Script a partir do SVG                                       | Fase 3                         |
| Marca d'água do clipe | SVG e PNG com transparência                                                 | Da versão escolhida na P9                                    | Fase 3                         |

## 4. Perguntas da fase 1a

15 perguntas, mais importantes primeiro. Em 9 nov 2026 o usuário respondeu 14 em 9 nov e a P8 em 11 nov: **15 respondidas**. Cada uma tem opções com exemplos reais do app e uma
recomendação. Recomendação não é decisão: sem resposta, a pergunta continua aberta.

### A. Voz e tom (fechou em `escolhas/fechadas/2026-11-09-voz.md`)

**P1. Qual é o núcleo da voz?** Exemplo: a sala sem ninguém.

- A. Amigo que organiza a sessão: "Sala vazia. Mande o convite para quem vai assistir."
- B. Anfitrião discreto: "Ninguém na sala ainda."
- C. Turma zoeira: "Só você por aqui? Chama a galera!"

Recomendação: **A**. É o mesmo papel do Ponto ("amiguinho que guia e acompanha"): ajuda, convida e
sai da frente quando a sessão começa.

> **Respondida: C, 9 nov 2026.**

**P2. Qual o registro dos textos?**

| A. Cuidado (como hoje)                                          | B. Leve                                                  | C. Impessoal                 |
| --------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------- |
| "Não foi possível aplicar sua cor. Tente novamente."            | "Não deu para aplicar sua cor. Tente de novo."           | "Falha ao aplicar a cor."    |
| "A rede parece indisponível. Vamos reconectar automaticamente." | "Caiu a rede. O VIO já está reconectando."               | "Sem conexão. Reconectando." |
| "Não foi possível copiar. Selecione o código e copie."          | "Não deu para copiar. Selecione o código e copie à mão." | "Cópia falhou."              |

A e B falam com "você"; em B o VIO fala de si em terceira pessoa ("o VIO"), nunca "nós". C não tem
pessoa. Recomendação: **B**. Soa como o amigo da P1 sem virar gíria, e "o VIO" combina com o nome
ser o produto.

> **Respondida: B, 9 nov 2026.**

**P3. Como dar um erro?** Exemplo real: "Permissão não concedida. Autorize o acesso no navegador e
tente novamente."

- A. O que houve e o que fazer, em até duas frases, sem culpar: "O navegador bloqueou o microfone.
  Libere o acesso no cadeado da barra de endereço e tente de novo."
- B. Empatia na frente: "Ops! Não conseguimos usar seu microfone. Libere o acesso no navegador."
- C. Só o fato e um botão: "Microfone bloqueado." [Como liberar]

Segundo exemplo, "Este widget pertence a outra pessoa.": A "Só quem criou este widget pode mexer
nele."; B "Opa, este widget é de outra pessoa."; C "Sem permissão."

Recomendação: **A**, sem código interno no texto (o `code` do `Fault` fica para o suporte).

> **Respondida: B (exemplo ajustado à P2), 9 nov 2026.**

**P4. Pode ter humor e gíria?**

- A. Nunca.
- B. Só fora da sala (landing, redes, página inicial), nunca em erro nem durante a sessão.
- C. Em todo lugar, de leve.

Exemplo, landing: "Sua sala, sua turma, a mesma tela." × "Pipoca pronta? Chama a turma.".
Exemplo, sala: "Ninguém assistindo ainda." (texto atual) × "Plateia vazia por enquanto."

Recomendação: **B**. Na landing e nas redes a voz pode brincar; dentro da sala, ela some.

> **Respondida: B, 9 nov 2026.**

**P5. O VIO usa emoji nos próprios textos?**

- A. Nunca. Emoji é das pessoas (chat e reações).
- B. Só na landing e nas redes.
- C. Também em sucesso e estado vazio: "Convite copiado ✨".

Recomendação: **A**. Leitor de tela lê o nome do emoji ("brilhos") e o texto do app fica limpo
para o emoji das pessoas aparecer.

> **Respondida: A, 9 nov 2026.**

### B. Nome e assinatura

**P6. Como se escreve o nome no texto?** Exemplo: "O VIO não grava nem guarda nada."

- A. "VIO" em texto, sempre com "o" (o VIO); "vio." só como desenho do logo.
- B. "Vio" em texto corrido; "VIO" só no código da sala.
- C. "vio." também em texto.

Recomendação: **A**. Já é o uso no app, no código da sala ("VIO-7K2Q") e no instalador
("VIO-x64-setup.exe"); "vio." em frase confunde com fim de frase.

> **Respondida: A, 9 nov 2026.**

**P7. Como assinar a NerdQuest Studios?** Hoje há três formas: "by NerdQuest Studios" (landing),
"by NerdQuest Studios · fundado por Nine" (rodapé do app) e "NerdQuest · v2.x" (linha de versão).

- A. "by NerdQuest Studios · fundado por Nine" em todo rodapé.
- B. "da NerdQuest Studios" (em português), sem crédito ao fundador.
- C. "by NerdQuest Studios" nos rodapés; "fundado por Nine" só na landing e em Sobre; linha de
  versão "VIO 2.x · NerdQuest Studios" (sugestão).

Em todas: menor e depois do VIO, nunca junto do símbolo. Recomendação: **C**.

> **Respondida: B, 9 nov 2026.**

### C. Logo e ícones

**P8. Qual a cor do ponto da M1 (e do logo sobre azul)?** _Respondida em 11 nov 2026: mesma cor do "v" (monocromático); o usuário imagina a M4 em quase todo uso._ Fechou
[m1-ponto.md](../escolhas/fechadas/2026-11-11-m1-ponto.md).

- A. #A6A9FF: 3,61:1 sobre o azul e 2,16:1 contra o "v" branco. O ponto continua um personagem.
- B. #F3F3FB: 7,06:1 sobre o azul, mas 1,10:1 contra o "v": vira parte da letra.

Recomendação: **A**. Passa 3:1 (elemento gráfico) e mantém o ponto separado do "v" em 16 px.

> **Respondida (11 nov 2026):** o ponto da M1 tem a mesma cor do "v" (monocromático). As opções A e B ficam como histórico.

**P9. Que versões do logo existem e qual a regra sobre imagem?** Noite já está decidida. As
cores e os contrastes de cada versão ficam para a fase 3.

- A. Noite, Claro, Azul e mono. Sobre imagem ou vídeo, só a M4 ou o logo numa chapa Noite. A
  marca d'água do clipe é a M4 no canto.
- B. As mesmas versões, e sobre imagem o logo mono direto, sem efeito, onde ele se ler bem.
- C. Só Noite e Azul por enquanto; as outras entram quando houver uso.

Recomendação: **A**. A M4 traz o próprio fundo e se lê em qualquer quadro do vídeo.

> **Respondida: A, 9 nov 2026.**

**P10. Qual o respiro e o tamanho mínimo do logo?** A unidade é o Ponto (lado do ponto, 22% da
altura do logo).

- A. Respiro de 1 Ponto; logo a partir de 20 px de altura.
- B. Respiro de 2 Pontos; logo a partir de 24 px.
- C. Respiro da altura do "v"; logo a partir de 32 px.

Abaixo do mínimo, usa-se a M4 (menor tamanho: 16 px). No cabeçalho da landing (72 px, logo de 32
px), A ocupa 46 px, B 60 px e C 96 px, que não cabe. Os px e as proporções são provisórios e se
ajustam na fase 3; aqui se escolhe a ordem de grandeza. Recomendação: **B**.

> **Respondida: B, 9 nov 2026.**

**P11. Aprova a lista de usos proibidos?** Esticar ou achatar; girar; trocar a fonte; recolorir
com cor de estado (verde ao vivo, vermelho de erro); letras azuis sobre Noite (2,50:1); sombra,
brilho, contorno ou degradê; ponto redondo; ponto separado da palavra.

- A. Aprovo a lista inteira.
- B. Aprovo com ajustes (diga quais).

Recomendação: **A**.

> **Respondida: B (com exceção: brilho só em divulgação), 9 nov 2026.**

### D. Temas, imagem e aplicações

**P12. Quais temas próprios o VIO planeja?** A [decisão 003](../../decisoes/003-temas.md) prevê
temas próprios (só cores) e da comunidade, mais tarde. Aqui se decide quais; as cores ficam para a
fase 3.

- A. Noite, Noite azul e Claro, com "Automático" (segue o sistema). O palco fica escuro em todos.
- B. Noite e Claro, com "Automático".
- C. Só Noite até existirem temas da comunidade.

Recomendação: **A**. Já estava no roteiro de 28 out (`docs/ideias/`) e mantém o vídeo sempre
sobre escuro.

> **Respondida: A, 9 nov 2026.**

**P13. O que pode aparecer em imagem da marca?**

- A. Só o Ponto e formas da interface.
- B. O Ponto e capturas reais do app; sem foto de banco de imagem e sem pessoa gerada por IA.
- C. Também fotos de pessoas.

Recomendação: **B**. Mostra o produto de verdade e não cria rosto falso.

> **Respondida: B (com ajuste: sem app, filme ou jogo de terceiros na tela compartilhada), 9 nov 2026.**

**P14. Qual ícone vai nos perfis (redes, Discord, atalhos)?** Os perfis cortam em círculo, então a
versão de perfil é sangrada, com o desenho a cerca de 84% (provisório; ajusta-se na fase 3).

- A. M4 (fundo Noite): some em perfis de fundo escuro.
- B. M1 (fundo azul): destaca em fundo claro e escuro.
- C. O logo inteiro: fica pequeno demais no círculo.

Recomendação: **B**.

> **Respondida: A, 9 nov 2026.**

**P15. O avatar das pessoas segue a ideia "pessoa = forma do Ponto"?** (Sugestão; liga com a cor
pessoal da #299.) Hoje é um círculo cheio na cor pessoal, com a inicial. Forma exata e raio ficam
para as fases 2 e 3.

- A. Sim: o avatar herda a forma do Ponto (as pessoas também são pontos).
- B. Não: o avatar mantém forma própria, e só a cor liga a pessoa ao Ponto.
- C. Decidir junto com o estilo visual, na fase 2.

Recomendação: **A**. "As pessoas também são pontos" vira forma, não só cor.

> **Respondida: A, 9 nov 2026.**

## 5. Como decidir

1. O usuário responde na prancha (botão "Responder" em cada cartão, ou comentário em cima dele) ou
   no chat do copiloto. Basta "P8: A"; ajustes são bem-vindos.
2. O Design transforma cada resposta num item do capítulo certo do brandbook, com a origem:
   "Pergunta N da prancha 1a, resposta de DD mmm AAAA", e o link da prancha.
3. A escolha correspondente sai de `escolhas/` para
   `escolhas/fechadas/AAAA-MM-DD-<escolha>.md`, com a decisão anotada: `voz.md` fecha com P1–P5;
   `m1-ponto.md` com P8, e o SVG escolhido vira `brandkit/icone-m1-azul.svg`. As outras perguntas
   entram direto no brandbook; se a resposta for "depois", nasce um arquivo novo em `escolhas/`.
4. Tudo entra numa PR `docs:` só, que atualiza a seção 2 deste guia e o
   [README do brandbook](../brandbook/README.md). Nada muda no código pela 1a: resposta que altera
   texto já em uso (P2, P3, P6, P7) vira issue `frontend`.
5. Com as 15 respondidas, a 1a fecha e a fase 3 fica liberada.
