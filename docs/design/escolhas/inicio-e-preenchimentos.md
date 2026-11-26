# Início e preenchimentos (#367) — rascunho da definição

Estado: **conversa em andamento** com o usuário (14–26 nov 2026). Marcação "espera banco" = desenhar já, com o estado vazio de hoje.

## Decisões até aqui

- Planejar já telas e opções que esperam banco/contas (marcadas "espera banco").
- Telas desta rodada (14): Landing, Download, Instalador*, Abertura e atualização*, Início, Criar/entrar, Conectando, Porta, Sala, Perfil (espera banco), Comunidade (espera banco), Ajustes, Saída/reconectando/erros. (*novas; instalador espera decisão técnica da Mídia.) Perfil e Comunidade são telas próprias.
- Ordem: Início → Criar/entrar → Porta → Sala → Perfil, Comunidade, Ajustes, erros → Landing, Download, Instalador, Abertura.

## Início

- **Centro**: como hoje (Criar sala, Entrar com código). A pergunta central varia e fala com a pessoa: saudações com o nome ("Olá, X!", "Qual a boa, X?") e frases que valem sozinhas ("O de sempre?").
- **Salas**: uma lista, abas Recentes | Favoritas; fixadas sempre no topo. Cada sala: nome, cor, ícone (forma da família do Ponto), até 4 pontos de quem está dentro com "+N", "Chamar de novo". Favoritar e fixar são coisas diferentes. Quem está na sala exige consulta leve ao servidor.
- **Disposição (ideia do usuário, a validar no Design)**: principal no centro; ao abrir as salas, elas entram pela esquerda e **empurram** o principal para a direita, sem cobrir.
- **Perfil**: cartão pequeno com Ponto, nome e cor; abre a tela Perfil; nome editável ali. Foto de perfil em quadrado arredondado, com prévia ao escolher. Versão de teste só no aparelho (não vai para outras pessoas); a foto compartilhada espera conta e moderação (Jurídico antes).
- **Amigos, Novidades, Comunidade**: três atalhos pequenos com aviso discreto. Amigos e Comunidade espera banco (vazio e "Em breve").
- **Novidades**: só funções novas, bem explicadas; mudança pequena (cor de botão) não entra.
- **Preparar a sala antes de criar**: só o que os widgets não fazem na hora; lista de opções a definir.

## Vida e preenchimento do Início (decisões de 26 nov)

- **Saudações**: lista fechada escrita por nós, com partes por regra (hora, nome, hábito; ex.: "O de sempre?" só após 3 entradas na mesma sala), sorteio fixo por dia. **Frases soltas** (memes, estilo splash do Minecraft) em lista separada, planejadas já; da comunidade só no futuro, com revisão humana, nunca ao vivo.
- **Visual de entrada**: um padrão fixo, que troca em datas festivas por tabela de datas no cliente (sem servidor). Ilustração: Design, com o amigo ilustrador do usuário se precisar.
- **Descartado**: Ponto que segue o cursor; salas favoritas "vivas" com quem fala (custo alto). Na lista de salas, só pontos e "+N"; "Ao vivo" quando há transmissão.
- **Fundo do Início**: pode ser pesado (só vale na tela inicial; na sala troca ou some), com opção de desligar para PC fraco, pausa ao transmitir e com Reduzir movimento. Quer ver amostras: gradientes com grão, curvas de nível, campo de fluxo, mancha de óleo/aurora, mais tipos populares. Pesquisa do `pesquisador` com pouca fonte; custos são estimativas.
- **Textura por tela**: token por tela/tema/claridade; o usuário quer ver no site antes de decidir.
- **Ajustes**: atalho (engrenagem) no Início. Hoje Ajustes mistura ajustes da sala; precisa separar pessoais, da sala e de conta (espera banco). Idiomas já planejados (ROADMAP, #168).

## O Ponto, fundos e Ajustes no Início (decisões de 26 nov, parte 2)

- **Fundos que o Design mostra** (amostras, sem escolha ainda): curvas de nível, campo de fluxo (o usuário quer ver também), cáustica (shader, custo opcional), 8 (padrão geométrico da marca: quadrado arredondado repetido, girando devagar; o "Ponto de verdade" D aparece nessa amostra), 7 (partículas flutuando), 6 (ondas em camadas). Óleo/aurora, mesh e grão não são amostras; texturas o usuário avalia no site.
- **Onde o Ponto mora no Início:** é o **ponto final das frases** e é bem vivo. Não há tela (palco) no Início, então não há disputa de atenção.
- **Gestos do Ponto com o corpo e o texto** (substituem anel/halo/órbita, descartados: o segundo ponto orbitando estranha): circular o texto e parar no fim; saltinhos e "bater a cabeça" na haste reta do "!" de "Olá, X!". Cada frase leva uma etiqueta de gesto; o Design inventa o vocabulário. Regra: o Ponto nunca deixa de ser um quadrado arredondado.
- **Olhar** (testar A e B): A, uma marca interna ("pupila") desliza para o mouse, e fecha/volta à forma original quando ele se move; B (testar também), inclinação 3D leve. Inclinar como cartão 3D fica guardado para outros momentos. Esticar em direção ao mouse e seguir cursor: descartados (parece querer alcançar).
- **Cenas** (aprovadas como direção): acordar (nasce no centro, salta até o fim da saudação, vira o ponto final), dormir (~2 min parado: respira devagar, afunda ~2 px, marca interna fecha; acorda ao toque), comemorar copiar (sem som, pulinho de ~200 ms + "Copiado").
- **Saíram:** atalho de teclado, colar link, "quem está online" nas salas (Amigos já mostra), resumo de sessão (quem anota é uma pessoa).
- **Badges** (espera banco): beta tester, horas transmitidas, amigos etc.; gamificação leve aceita. Sem exemplo de mercado achado: seria original.
- **Discord:** o modo compacto da sala (tela pequena + mudo) já é a issue do flutuante, e não é do Início. **Integrações com o Discord:** entrar com Discord vem com a conta (espera banco); convidar = copiar link, sem integração; 'assistindo no VIO' no status é arriscado (desconhecidos entram na sala), só se for opt-in; bot só vale com mais funções; importar amigos é bom (espera banco, com consentimento); nada mais útil por ora.
- **Ajustes:** barra de busca no topo; seção avançada em Acessibilidade para escolher quais animações manter ou tirar, com indicador de peso (extensão do #369).
- **Método:** nada de amostra do Design até listarmos todas as telas e necessidades; o Design faz tudo de uma vez e o usuário escolhe vendo.

## Em aberto

Saudações (regras), grade (onde pode aparecer), Comunidade (o que temas/mods podem mexer), Perfil, Amigos, Novidades, preparar sala, integrações com Discord, demais telas (Criar/entrar, Porta, Sala, erros, Landing, Download, Instalador, Abertura).
