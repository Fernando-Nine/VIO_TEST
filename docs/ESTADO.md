# Estado do VIO

Fonte única de estado. Atualizada pelo copiloto (ou pela área que mudar algo daqui).
Atualizado: 2026-10-24.

## Ambientes

|          | Versão | Repositório                   | Endereço                       |
| -------- | ------ | ----------------------------- | ------------------------------ |
| Produção | 2.8.0  | Fernando-Nine/VIO `main`      | https://vio-quest.onrender.com |
| Prévia   | 2.8.0  | Fernando-Nine/VIO_TEST `main` | https://vio-test.onrender.com  |

Ambos: Render Free, Virginia, uma instância, deploy automático da `main`.
Produção e prévia têm o mesmo código desde a 2.8.0 (VIO PR #2, árvore de b435774).
Tags `v2.7.2` (c249a34) e `v2.8.0` (8993afb) no VIO ainda pendentes.

## Validado pelo usuário

- Transmissão de tela e áudio funcionando (confirmado em 2026-10-22).

## Prioridades atuais

1. Estrutura da equipe, CI e diagnóstico de cada área.
2. Interface enxuta: widgets compactos e editáveis no lugar, menos texto, hover e menu
   de botão direito, feedback sonoro (issues `frontend`).
3. Promover a prévia para produção quando o usuário aprovar.

## Decisões vigentes

- Instaladores do app Windows ficam no repositório público Fernando-Nine/vio-releases (criado em 2026-10-24)
  (GitHub Releases), também usado pelo atualizador automático. Assinatura só ao abrir ao público.
- Permissões da sala no estilo cargos do Discord (#71, antiga E12): criador e admins
  controlam widgets da sala; convidados conforme switches da sala.
- Widgets compartilhados: um só estado para a sala (regra no `CLAUDE.md`).
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

- E10: grid personalizado (até 6×6) — proposta em `docs/arquivo/RODADA-E.md`.
- Widget Personalizado/Comunidade: fora de escopo até haver isolamento de código.

## Referências

Arquitetura do canvas `CANVAS.md` · deploy `DEPLOY.md` · segurança `SEGURANCA.md` ·
TURN `TURN.md` · navegadores `NAVEGADORES.md` · validações `VALIDACAO.md` ·
histórico das rodadas C–E `arquivo/`.
