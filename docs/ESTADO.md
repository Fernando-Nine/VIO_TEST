# Estado do VIO

Fonte única de estado. Atualizada pelo copiloto (ou pela área que mudar algo daqui).
Atualizado: 2026-10-30.

## Ambientes

|          | Versão      | Repositório                   | Endereço                       |
| -------- | ----------- | ----------------------------- | ------------------------------ |
| Produção | 2.9.0       | Fernando-Nine/VIO `main`      | https://vio-quest.onrender.com |
| Prévia   | 2.12.0-rc.6 | Fernando-Nine/VIO_TEST `main` | https://vio-test.onrender.com  |

Ambos: Render Free, Virginia, uma instância, deploy automático da `main`.
Produção 2.9.0 = VIO_TEST `bbb5c23` (rc.20), VIO PR #4, aprovada em 2026-10-27. A prévia 2.10.0-rc.1
tem grade 3×4 (#166), avisos no topo (#164) e catálogo novo (#165). Tag `v2.9.0` criada pelo usuário; as
anteriores não serão criadas (decisão antiga). `ALLOWED_APP_ORIGINS` já está nos dois Render.

## Validado pelo usuário

- Transmissão de tela e áudio funcionando (confirmado em 2026-10-22).

## Prioridades atuais

Ordem completa em `ROADMAP.md`.

Ordem do usuário (27 out): 1) entregar o já pedido, 2) bugs, 3) novos agentes e
planejamento, 4) brandbook/identidade/design system, 5) features novas. Sem pressa; qualidade.

1. **2.11.0 = commit `fa75894` (rc.24)**, pronta para produção. Crash do som corrigido (#246) e
   confirmado pelo usuário; borda amarela sumiu. Falta o aval final do usuário para publicar.
2. **2.12.0 na prévia (rc.6)**: landing A (#258), início B (#259), trancar/convite (#260, #242),
   tela inteira em 1080p (#267), nomes da Store (#271), #24 e #23 (upload com teto de 8 Mbps).
3. Lote do Frontend, só com tudo decidido: transições #261 (Opus no máximo), cursor #266,
   Baixar direto #268, notificações #270. Teste de responsividade #269 (QA).
4. Aguardando proposta aprovada: Elephant-Goldfish + entrevista do copiloto + agente crawler.
5. Depois: TURN Cloudflare (#135, usuário passa as variáveis), app em segundo plano + ícone novo,
   sala detalhada (Design), assets de marca, clips (#208), Ajustes (#168).

Feito na 2.11 (até rc.24): #158, #189, #190, #198, #159, #160, #162, #193, #207, #209, #192,
#194, #191, #221, #228, #222, #229, #226, #236, #246, #247, #248, #254, #255.

## Decisões vigentes

- Leva 5 (28 out): landing A (corrigir espaço vazio no celular), início do app B, trancar e
  convite A, sala A (rever em detalhe numa sessão de Design futura), transição A como padrão.
- Transições: o ponto conduz tudo (regra no `CLAUDE.md`); o usuário vê antes de fixar cada uma.
- Temas: padrão **Noite**, escolhido em Ajustes. Futuro: mais temas nossos (só cores) e temas da
  comunidade, que podem mudar também o arranjo da sala e as animações. Não agora.
- Widgets da comunidade (futuro): widgets criados pela comunidade, na aparência e na função, usando
  APIs de outros serviços (Spotify, tela do YouTube, estatísticas de partida, chat com IA…). Exigem
  isolamento de código antes de existir.
- Copiloto conversa com o usuário antes de pedir ideias visuais novas a uma área.
- Correções de segurança vão direto para a produção, sem aval prévio (usuário, 2026-10-24).
- App Windows: o usuário testa já com a captura de áudio WASAPI.

- Instaladores do app Windows ficam no repositório público Fernando-Nine/vio-releases (criado em 2026-10-24)
  (GitHub Releases), também usado pelo atualizador automático. Assinatura só ao abrir ao público.
- Permissões da sala no estilo cargos do Discord (#71, antiga E12): criador e admins
  controlam widgets da sala; convidados conforme switches da sala.
- Widgets compartilhados: um só estado para a sala (regra no `CLAUDE.md`).
- Rodapé: Entrar na chamada, Compartilhar e Flutuante juntos à esquerda, nessa ordem;
  volume fica em cada tela, não no rodapé (#145).
- Fechar widget (#146): widget da sala tem − (minimizar, só para você) e × (fechar para
  todos) para dono da sala, admins e criador; os demais só −. Widget pessoal só ×.
- Agentes novos (27 out): Jurídico e Privacidade (sem verba para advogado agora) e Roteirista.
- Clips (#208): no aparelho, até 3 min, vozes de todos, edição rápida em ms, marca d'água.
- Desativar áudio (#149): como no Discord, desliga microfone e vozes, mas não as telas.
- Widgets são **pessoais** (só quem criou vê) ou **da sala** (criador/admins; convidados se
  a sala permitir). Escolha na criação; não existe compartilhar widget pessoal (#104).
- Visual novo dos widgets passa por rascunhos da área Design antes do código.

- Contas, banco de dados e gravação no servidor: **adiados**, não proibidos.
  Clips gravados no aparelho são objetivo futuro.
- Sem teto de participantes por enquanto; aviso de carga P2P a partir de 6.
  Um teto (ex.: 50) pode vir depois, sem prioridade.
- App Windows é a próxima plataforma; celular depois. Base em `docs/DESKTOP-WASAPI.md`.
- Comunidade e monetização são objetivos futuros, preservando a originalidade.
- Fluxo: Issues + PR por tarefa + CI + squash merge pelo agente. Produção recebe o mesmo
  código da prévia, por PR de release no VIO e tag, após aval do usuário.

## Em aberto (aguardam o usuário)

- E10: grid personalizado — usuário prefere no máximo 3 linhas × 4 colunas no computador;
  celular a definir. Em discussão com o copiloto antes de ir ao Design.
- Design leva 2 aprovada para rascunho: Pessoas na sala, Ajustes, aviso de transmissões
  (etiqueta + sino), cards de Chamada/Compartilhar e padronização dos widgets.

## Referências

Roadmap `ROADMAP.md` ·
Arquitetura do canvas `CANVAS.md` · deploy `DEPLOY.md` · segurança `SEGURANCA.md` ·
TURN `TURN.md` · navegadores `NAVEGADORES.md` · validações `VALIDACAO.md` ·
histórico das rodadas C–E `arquivo/`.
