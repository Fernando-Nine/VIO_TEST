# Estado do VIO

Fonte única de estado. Atualizada pelo copiloto (ou pela área que mudar algo daqui).
Atualizado: 2026-10-27.

## Ambientes

|          | Versão      | Repositório                   | Endereço                       |
| -------- | ----------- | ----------------------------- | ------------------------------ |
| Produção | 2.9.0       | Fernando-Nine/VIO `main`      | https://vio-quest.onrender.com |
| Prévia   | 2.10.0-rc.8 | Fernando-Nine/VIO_TEST `main` | https://vio-test.onrender.com  |

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

1. 2.10.0 pronta na prévia (rc.8: #158, #189, #190, #198 feitas): aguarda aval do usuário.
2. Compartilhar e app Windows: #192 seletor próprio, #193 Windows 10, #160 + #191 — Mídia 3.
3. 2.11.0: #159 Pessoas (Frontend 10), #162 Câmeras, #194 até 3 telas por pessoa.
4. Design leva 4: #195 grade/fantasma do foco, #196 categorias do catálogo, #197 landing.

## Decisões vigentes

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
- Widget Personalizado/Comunidade: fora de escopo até haver isolamento de código.

## Referências

Roadmap `ROADMAP.md` ·
Arquitetura do canvas `CANVAS.md` · deploy `DEPLOY.md` · segurança `SEGURANCA.md` ·
TURN `TURN.md` · navegadores `NAVEGADORES.md` · validações `VALIDACAO.md` ·
histórico das rodadas C–E `arquivo/`.
