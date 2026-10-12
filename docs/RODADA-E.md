# Rodada E consolidada

## Estado em 12/10/2026

**Liberação concluída:** VIO 2.7.1 em https://vio-g71x.onrender.com/,
serviço Render `vio` (`srv-db5mqljrjlhs739k2bf0`), plano Free/Virginia.
Fernando-Nine/VIO recebeu a nova base por commit normal `196ba88`, filho do
último commit antigo; nenhum force push. Deploy live, `/healthz` HTTP 200 com
versão 2.7.1, criação/saída de sala conferidas, sem erros nos logs consultados.
O vio-test recebeu a mesma base em `72974f0`. VIO_2 e canvas-preview intactos.

**Fase 2:** 2.8.0-rc.1 publicada só em VIO_TEST/main e vio-test (30128a1).
E3/E4/E5/E7/E6/E9 implementados; build e TypeScript passaram. 27 testes direcionados
(canvas, rolagem, spans, histórico, contraste) e 5 cenários de servidor passaram.
Os testes antigos de Notas foram ajustados ao cancelamento de E3. Deploy live e
/healthz 200. Duas sessões confirmaram autoria, texto escapado, histórico, abrir
chat por notificação, permissões de convidado e promoção a administrador. Canvas
está desabilitado e Notas saiu do catálogo. Grid de cinco: três + dois centralizados.
Aceite encontrou correções localizadas: manter foco ao enviar por Enter, declarar
a cor do texto no parágrafo e impedir que a animação global desloque a junção
durante o clique. Correções passam por nova conferência visual antes do fechamento.
Não publicar a Fase 2 em produção.

Chat mantém somente as últimas 100 mensagens de cada chat em memória, também
entregues a quem chega depois. Texto #F1F2FA: contraste mínimo medido 13,11:1
contra as cinco superfícies escuras existentes (mínimo exigido 4,5:1).
Papéis, edição e aprovação são verificados no servidor; pedidos só aparecem no
snapshot do autor e dos responsáveis. E12 continua sem interface.

E9: persistência v2 migra v1 e guarda spans e identidades dos espaços mesclados.
A tira conta cada posição para roda/setas/snap, com até três posições vazias por
mescla; foco excluído. O modelo de união retangular suporta 2×2 + vizinhos e
rejeita lacunas/sobreposição. A interface bidimensional depende do grid E10,
ainda não aprovado. No automático não há mesclas; última linha centralizada.

## Fase 1

- E1: setas flutuantes preservadas; fundo/borda transparentes, círculo somente no
  hover/foco, transição de 120 ms, alvo 40 px (44 px em ponteiro grosso).
- E2: Personalizado fora do catálogo nativo e criação recusada; instâncias antigas
  continuam renderizáveis. Comunidade → Widget personalizado mostra somente aviso.
- E11: indicação da barra por 1 s ao entrar em fullscreen; timer limpo na saída e
  reentrada. Foco do botão removido; depois valem zona de 4 px e foco de teclado.

## Regras de liberação (executadas para a Fase 1)

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

## Complemento de 11/10/2026 — prioridade de liberação

O usuário autorizou substituir integralmente o código antigo de Fernando-Nine/VIO
pelo novo, sem analisar o código antigo. Preservar o histórico por commit normal,
sem force push. Criar serviço VIO no Render ligado ao repositório VIO. No workspace
confirmado pelo prosseguimento da publicação, não existe serviço ligado a VIO;
existem vio-test, vio-test-canvas-preview e vio2. O usuário integrou a candidata
2.7.0 ao main do VIO_TEST pelo PR #4 (commit 6027961).

Ajustes incluídos antes da liberação: retirar indicador flutuante “convites novos”;
primeiro convite de tela no foco vazio e seguintes na tira, sem substituir conteúdo;
convite com tipografia maior; catálogo VIO/Telas/Sala/Comunidade com respiro;
Comunidade → Widget personalizado abre diálogo centralizado com X e explicação.

Dados — especificação ampliada, ainda sem implementação: campo de comandos
inspirado na sintaxe v1 do Rollem (https://rollem.rocks/docs/v1-syntax), com guia
recolhido em português para dados, modificadores, parênteses, repetições, manter/
descartar, explosões, Fate e comparações. Não usar eval nem executar código: parser
limitado, cotas de dados/repetições/explosões. Cada resultado e entrada do
mini-histórico recebe id/nome do participante autenticado, expressão e horário
atribuídos pela autoridade da sala, nunca pelo autor declarado no cliente.

E12 — acrescentar switches de convidados: compartilhar tela ligado; falar na chamada
ligado; ligar câmera desligado. Criador e administradores podem alterar essas
permissões operacionais; autoridade valida publicação e comandos de mídia.
Uma tentativa negada deve explicar em português qual permissão está desativada,
sem solicitar captura nem fingir sucesso. Exemplo: “A câmera está desativada para
convidados nesta sala. Peça autorização ao criador ou a um administrador.”
A interface E12 e o módulo Dados continuam aguardando a etapa de aprovação prevista.

## Endereço do VIO — 12/10/2026

O Render atribuiu `vio-g71x.onrender.com` ao serviço `vio`. Preferência autorizada:
`vio.onrender.com`, ou `vio-quest.onrender.com` se o primeiro estiver indisponível.
O conector atual não expõe edição do nome/subdomínio e o painel pede login.
Ainda não houve alteração nem confirmação de disponibilidade dos nomes.
Não criar serviço duplicado nem apagar o serviço estável para tentar nomes.
