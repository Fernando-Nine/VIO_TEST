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

## Criar/entrar (decisões de 26 nov, parte 3)

- **Campo de código:** campo único comum, sem caixinhas por caractere (o usuário não gosta do estilo Jackbox; pesquisa: caixinhas quebram autofill, colagem e leitor de tela). Sugestões de salas recentes ao digitar: descartado. Conferir com o Backend se o alfabeto do código evita I/L/O/U (Crockford).
- **Tipo de sala ao criar:** três opções visuais (aberta, pede entrada, só convidados), ícones na família do Ponto. Já existe um indicador hoje; vale ter a escolha clara.
- **Nome da sala:** gerado quando a pessoa não escreve; botão de sortear outro. Estilos: quase todos (adjetivo + objeto, frase de filme/meme, hora/dia); o ligado ao nome da pessoa não entra. Lista própria em português.
- **Entrar como convidada:** nome e cor, mas a pessoa **procura e muda por si só** (nada de popup quase obrigatório). Com conta (espera banco), vira "entrar como X".
- **Pré-visualização antes de entrar** (espera banco, decisão do Backend/Jurídico): só nome da sala e quantidade de pessoas; nunca nomes nem a tela da transmissão.
- **Criando a sala:** o Ponto constrói a tela de carregamento durante a transição e mostra que está carregando até criar a sala. Sem coreografia fixada: o Design imagina.
- **Entram:** convite com cartão (nome, código, QR; procurado, não imposto), vibração leve ao colar código válido (celular), sala rápida (cria e já copia o link), estado vazio caprichado nas Salas recentes, mensagens de erro distintas (não existe, cheia, trancada; convite expirado com conta).
- **Teste de som/microfone:** vive em Ajustes › Áudio, não antes da sala; a pessoa entra mudo.
- **Em dúvida/detalhar:** "voltar para a última sala".
- **Saudação sem nome:** frases que funcionam sem nome (lista solta) como padrão, com um convite discreto para colocar o nome; sem "convidada". Sem apelido gerado por ora.
- **Voltar para a última sala:** fica no rascunho; o usuário tira depois se não gostar.
- **Sala rápida:** botão/lugar separado de Criar sala.
- **Criar e Entrar viram telas separadas** (decisão do usuário); abre espaço para outras: procurar sala, procurar mods (a explorar).

## Porta (sala trancada, decisões de 26 nov, parte 4)

- **Tom:** linguagem amigável, de "brother", sem formalidade.
- **Espera:** o Ponto representa o carregamento da sala. Sem sugerir animação; o Design decide. **Sem fim definido** (sem limite de tempo).
- **Passatempo na espera:** ideia de mini jogo (estilo dinossauro do Chrome) enquanto espera entrar; o usuário "qualquer coisa", a explorar.
- **Quem bate** escreve **mensagem junto com a batida** (decidido). Dono e admins veem **nome e foto** de quem bateu e abrem o **perfil** (quando existir; espera banco).
- **Dono decide:** aceitar, recusar ou **fechar a sala** (recusa pedidos automaticamente).
- **Aviso sonoro** opcional ao dono quando alguém bate.
- **Entrada sem pedir** para quem já entrou antes: **opção configurável** pelo dono (espera banco).
- **Descartado:** "deixar todos entrarem" da lista de espera (perigoso).
- **Em aberto:** a resposta "estou ocupado" e o tom exato da recusa.

## Em aberto

Saudações (regras), grade (onde pode aparecer), Comunidade (o que temas/mods podem mexer), Perfil, Amigos, Novidades, preparar sala, integrações com Discord, demais telas (Criar/entrar, Porta, Sala, erros, Landing, Download, Instalador, Abertura).
