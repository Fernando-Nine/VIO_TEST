# Rodada E consolidada

## Estado em 11/10/2026

Fase 1 preparada como candidata 2.7.0, ainda não publicada nos serviços.
E1/E2/E11 implementados. Os três testes existentes da roda passaram; verificação
direcionada de criação recusou Personalizado e preservou Notas/Cronômetro e o
renderer de widgets antigos. TypeScript e build concluídos, sem suíte completa.
O aceite visual da nova versão ainda não foi executado. Antes da publicação,
conferir setas nos dois eixos, aviso da comunidade sem criação e introdução de
fullscreen por 1 s seguida do comportamento D6. Se qualquer aceite falhar,
parar e reportar antes de publicar, conforme pedido.

Bloqueio externo: o conector Render responde “no workspace selected” e exige
confirmação do usuário antes de selecionar. A listagem retornou somente
“My Workspace”, id `tea-da4g8bs9v7es7383udfg`. Nenhum workspace foi selecionado.
Nenhuma atualização foi feita no VIO principal, vio-test ou canvas-preview.

## Fase 1

- E1: setas flutuantes preservadas; fundo/borda transparentes, círculo somente no
  hover/foco, transição de 120 ms, alvo 40 px (44 px em ponteiro grosso).
- E2: Personalizado fora do catálogo nativo e criação recusada; instâncias antigas
  continuam renderizáveis. Comunidade → Widget personalizado mostra somente aviso.
- E11: indicação da barra por 1 s ao entrar em fullscreen; timer limpo na saída e
  reentrada. Foco do botão removido; depois valem zona de 4 px e foco de teclado.

## Liberação autorizada, pendente de execução

Depois do aceite direcionado: publicar a mesma versão no Render do VIO principal,
no GitHub Fernando-Nine/VIO (sem force push) e no vio-test. Inspecionar primeiro
os repositórios/branches e comandos efetivamente usados pelos serviços.
Preservar histórico e preparar reversão. Não atualizar feat/canvas-widgets nem
vio-test-canvas-preview; este deixa de receber novidades. A Fase 2 só começa após
esta liberação e só vai ao vio-test. Produção só recebe Fase 2 com novo aval.

## Fase 2 autorizada após a liberação

Ordem: E3 → E4 → E5 → E7 → E6 → E9 → E10.
E3 remove Notas e notas recebidas, substituídas por Chat, Canvas e notificações.
E4: chat público da sala, mensagens agrupadas por autor, avatar opcional por URL
sem upload, inicial com contraste AA e aro na cor pessoal. Texto comum a todos,
contraste medido >=4,5:1, escapado, limitado, com anti-flood, Enter e aria-live polite.
Sugestão de histórico: quem entra recebe as últimas 100 mensagens de cada chat,
somente em memória até a sala esvaziar/reiniciar.
E5: Canvas no catálogo, selo Em breve, desabilitado; sem funcionalidade.
E7: autoridade no servidor para criador, administrador e convidado; promoção,
revogação e transferência pelo criador. Na saída, suceder pelo administrador mais
antigo; sem administradores, convidado mais antigo; avisar a sala. Widgets públicos
adicionados e editados por criador/admin; convidado edita só mediante permissão por
pessoa ou geral. Individuais são editáveis pelo próprio usuário. Compartilhamento
de convidado exige aprovação padrão; público pode ser encerrado por quem compartilhou,
criador ou administrador; demais só fecham localmente. Catálogo Sala mantém os públicos.
E6: sino e contador na barra, lista por hover/clique/foco, toque/teclado, aria-live polite;
telas, widgets, mensagens agrupadas por chat, pedidos/resultados de aprovação.
Aceitar/abrir/aprovar/negar/excluir, preservando descoberta pelo catálogo e Pessoas.
Remover aviso flutuante de convites; manter Assistir? no slot. Eventos novos nunca
revelam automaticamente a barra recolhida em fullscreen.
E9: somente slots vazios, juntar/dividir; ícone na junção no hover/foco e teclado.
Retângulos válidos com extensão correspondente de vizinhos; nenhum limite de 3 no
grid. Na tira, foco excluído e até três posições contíguas. Automático não mescla:
última linha centralizada (cinco = três + dois).
E10: implementação aguarda aprovação dos limites abaixo.

Não implementar nesta rodada: módulos E8, Canvas funcional, navegador da comunidade,
interface E12, upload, banco ou contas. Novos widgets precisam de modo compacto na tira.
Testar somente alterações; não executar suíte completa.

## E8 — especificação para aprovação (nenhum módulo implementado)

Regra comum: públicos são adicionados/editados por criador e administradores;
convidados alteram só com permissão E7. Individuais são criados/editados pelo próprio usuário.

- Votação: pergunta, opções e duração modulares/editáveis; sala compartilha votos e resultado; também individual para consulta pessoal. Compacto: pergunta, opções e tempo restante.
- Dados: quantidade, faces e modificador editáveis; sala compartilha resultados e mini-histórico com autor; também individual. Compacto: rolar, resultado e últimas três rolagens.
- Sorteador: opções, pesos e retirada de sorteados editáveis; sala compartilha lista e resultados; também individual. Compacto: sortear, resultado e restantes.
- Tarefas + agenda: itens, ordem, responsáveis, duração e conclusão editáveis; sala compartilha progresso e etapa atual; também individual. Compacto: etapa atual e próximas duas tarefas.

## E9 — modelo de dados (antes da implementação)

O modelo v1 só armazena uma lista de slots; adicionar coordenadas/spans e migrar a persistência exige mudança estrutural localizada.
A tira deve contar posições ocupadas pelo span e recalcular paradas/alinhamento; juntar/dividir preservará ids e só aceitará regiões vazias retangulares.

## E10 — proposta para aprovação

Grid personalizado de 1×1 até 6×6 (36 células), com dimensões ajustáveis e junções retangulares.
Em telas estreitas, preservar a configuração e oferecer visualização adaptada, sem alterar os spans salvos.
Nova transmissão oferece o primeiro slot vazio, da esquerda para a direita e de cima para baixo; entra somente após Aceitar.
Se estiver cheio, permanece nas notificações e em Pessoas → Assistir; não expande nem substitui conteúdo automaticamente.

## E12 — proposta para aprovação (sem interface)

- Convidados podem compartilhar widgets — desligado; ligado dispensa pedidos de aprovação; somente criador altera.
- Administradores podem adicionar widgets coletivos — ligado; desligado reserva criação ao criador; somente criador altera.
- Convidados podem editar widgets públicos — desligado; ligado libera edição geral sem autorização individual; criador e administradores alteram.
- Convidados podem pedir para compartilhar — ligado; desligado impede novos pedidos, preservando widgets já aprovados; criador e administradores alteram.
- Convidados podem enviar mensagens — ligado; desligado torna os chats somente leitura para convidados; criador e administradores alteram.
- Administradores podem encerrar widgets de outros — ligado; desligado limita encerramento ao criador e a quem compartilhou; somente criador altera.
