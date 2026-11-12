# 022 — Decisões da fase 1 (revisão de interface)

Data: 2026-11-12 (plano da issue #286; fase 1b de `design/guias/plano.md`)

## Contexto

A revisão do que existe (fase 1b) gerou 25 perguntas numa página de decisões. O usuário respondeu
todas. Abaixo, a escolha e a observação dele, resumida sem mudar o sentido.

## Decisão

Decididas (escolha; observação do usuário entre parênteses quando muda o trabalho):

- **q01** Sair da sala: confirmar só quando atrapalha os outros. Deve haver "não mostrar novamente".
- **q02** Depois de sair no navegador: voltar ao bloco de entrada, já preenchido.
- **q03** Sala sozinho: um convite só, no meio. Ver como fica nos estilos (fase 2); talvez a sala já ser sempre o que se vê seja o ideal.
- **q04** Topo no celular: Convidar sempre visível, o resto em "Mais". Algum estilo pode mostrar melhor (ícones simples); sem isso, vale o "Mais".
- **q05** Qualidade da conexão: palavras, com o número ao lado. Conexão com o servidor é diferente da conexão P2P com a sala; não misturar.
- **q06** Aviso de sala cheia (6+): um aviso só, no topo, junto de Pessoas. Vira notificação ao passar de 6, mais um indicador discreto em Pessoas que só se explora ao abrir a lista. É aviso de consumo alto, nunca limitador; some quando o VIO sustentar mais gente.
- **q07** Avisos com botão ficam enquanto o pedido valer.
- **q08** Textos novos da porta e das falhas: aprovados.
- **q09** Nome dos botões de ícone: balão do VIO.
- **q10** Pouca animação: trocar o movimento por esmaecimento curto. Pesquisar as opções recomendadas e talvez oferecer modo avançado (escolher o que tirar) ou níveis de movimento.
- **q11** Controles da sala somem em 3 s (mouse) e 4 s (toque). Na primeira vez na sala ou numa tela nova demoram a sumir; depois somem rápido (ao menos em tela cheia).
- **q12** Formulário de entrada: mensagem do VIO sob o campo.
- **q13** Página inicial no celular: uma maquete por seção.
- **q14** Download do app: "Não começou? Baixar de novo" e endereço próprio.
- **q15** Abertura do app Windows ao atualizar: mostrar a abertura com "Atualizando o VIO…".
- **q16** Espera ao entrar: depois de 1 s, tela com o Ponto.
- **q17** Selo "Todos / Admins": "Quem controla: Todos" no menu do widget. Se der, misturar com os selos.
- **q18** Menu de uma pessoa: separar o que não tem volta. Pedir confirmação ao transferir a posse da sala.
- **q20** Cor, "Quem pode controlar" e "Guia de dados": janelinha junto ao cabeçalho do widget.
- **q23** Revogar convites: janela de confirmação.
- **q24** Avisos ficam sempre por cima do painel Pessoas.
- **q25** Segundo pacote de ajustes pequenos: aprovado inteiro.
- **q22** Pacote de ajustes pequenos: aprovado, menos os itens abaixo. Aprovados com condição: "Tela nova gera um aviso só" (se corrige aviso repetido ou piscando); "Janela de widget leva o nome" (se ainda não tiver); "Arrastar a folha para baixo fecha" (se for padrão comum e não conflitar com recarregar a página). Os demais itens do pacote estão aprovados.

**Em aberto, aguardando explicação ao usuário (não decididos):**

- **q19** "Todos os espaços estão ocupados": o usuário questiona se o caso existe, já que Tira e Grade crescem sozinhas. Levantou o risco de spam de widgets compartilhados (bot criando widgets) e sugeriu que widget novo compartilhado chegue como notificação, e cada um coloca só se quiser. Se a pergunta não for isso, vale a opção recomendada.
- **q21** "Foco único": a premissa da pergunta estava **errada**. O layout é individual; dono e admins nunca mudam o layout de ninguém. No código (`src/client/canvas/RoomCanvas.tsx` ~L1330) o botão fica desabilitado só quando não há widget em foco ("Abra um widget para usar o Foco único."). Princípio do usuário: cada pessoa monta o próprio layout; dono e admins só moderam e adicionam widgets, que cada um escolhe ver ou não. Falta reformular a pergunta.
- **q22, itens em aberto:** "Pular para o conteúdo" (prefere opção em Ajustes; botão tipo cutscene fica esquisito, pois as transições serão rápidas e dão charme ao VIO); notificações (vão mudar com os estilos); "Linhas de botões" (depende do contexto e da linha; quer entender melhor); "Dica e menu abrem sem a viagem do Ponto" (quer entender melhor a proposta).

## Motivo

Registro fiel do que o usuário respondeu, para a fase 1c/1d e a fase 2 partirem dele. As notas de
trabalho futuro (q01, q03/q04 dependem dos estilos da fase 2, q05, q06, q10, q11, q17, q18) entram na
issue de cada item.

Não rediscutir sem o usuário.
