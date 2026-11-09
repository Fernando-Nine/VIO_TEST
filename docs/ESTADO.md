# Estado do VIO

Fonte única de estado. Atualizada pelo copiloto (ou pela área que mudar algo daqui).
Atualizado: 2026-11-09.

## Ambientes

|          | Versão      | Repositório                   | Endereço                       |
| -------- | ----------- | ----------------------------- | ------------------------------ |
| Produção | 2.11.0      | Fernando-Nine/VIO `main`      | https://vio-quest.onrender.com |
| Prévia   | 2.12.0-rc.6 | Fernando-Nine/VIO_TEST `main` | https://vio-test.onrender.com  |

Ambos: Render Free, Virginia, uma instância, deploy automático da `main`.
Produção 2.11.0 = VIO_TEST `fa75894` (rc.24), VIO PR #5, aval do usuário em 2026-11-04 (inclui a 2.10.0,
nunca publicada sozinha). Release `v2.11.0` publicada pelo usuário. `ALLOWED_APP_ORIGINS` já está nos dois Render.

## Validado pelo usuário

- Transmissão de tela e áudio funcionando (confirmado em 2026-10-22).

## Fila

Níveis P0–P3 (regra no `CLAUDE.md`). Etiquetas no GitHub; a área pega a primeira da sua.
Ordem completa do produto em `ROADMAP.md`.

- **P0**: nenhuma.
- **P1**: #266 cursor some · #268 Baixar direto · #280 Flutuante no app (mídia, em andamento).
- **P2**: #303 app com uma instância só (Mídia) · #261 transições (Opus no máximo; espera a fase 5 do plano de design) · #270 notificações · #269 responsividade (QA) ·
  #20 Prettier na CI · #25 conferir TURN · #296 · #297 barra de rolagem em Recentes.
- **P3**: #282 bandeja + ícone · #227 brandbook · #197 landing (pendências) · #208 clips ·
  #168 Ajustes · #135 TURN Cloudflare (avisar o usuário quando chegar a vez) · #21 conferência pós-deploy ·
  #22 BrowserLab na CI · Design: #293 qualidade automática · #294 Minha tela + Minha prévia ·
  #295 cards flutuantes · #298 cor da sala · #299 cor pessoal; menu inicial em #197.
- Na prévia (2.12.0-rc.6): landing A (#258), início B (#259), trancar/convite (#260; #242 fechada), tela
  inteira em 1080p (#267), nomes da Store (#271), #24 e #23 (upload com teto de 8 Mbps). Depois da
  rc.6, em `changes/`: tela inicial só no app (#285), saída rápida (#286), tela cheia ociosa (#300), outra aba (#301; ajustes da sonda em PR de
  continuação), duplicata ao reiniciar (#292, PR #312), voltar do navegador (#309, PR #311), aprendizados/mapa/etiquetas (#308).
- Fora de issue: parecer captura nativa x anti-cheat (Mídia + Pesquisador; base no achado 10.2 do catálogo) · app em segundo plano
  e ícone novo · sala detalhada (Design) · assets de marca.

## Decisões

Uma linha por decisão; o texto está em `docs/decisoes/` (formato no README de lá).

- [001](decisoes/001-permissoes-e-widgets.md) Permissões tipo cargos; widget pessoal ou da sala; fechar e rodapé.
- [002](decisoes/002-leva-5-e-movimento.md) Leva 5 de design; o ponto da marca conduz as transições.
- [003](decisoes/003-temas.md) Tema Noite; temas nossos e da comunidade depois.
- [004](decisoes/004-widgets-da-comunidade.md) Widgets da comunidade só com isolamento de código.
- [005](decisoes/005-seguranca-direto-a-producao.md) Correção de segurança vai direto à produção.
- [006](decisoes/006-app-windows.md) App Windows primeiro, WASAPI, instaladores no vio-releases.
- [007](decisoes/007-clips.md) Clips no aparelho, até 3 min, com marca d'água.
- [008](decisoes/008-desativar-audio.md) Desativar áudio desliga microfone e vozes, não as telas.
- [009](decisoes/009-contas-e-banco-adiados.md) Contas, banco e gravação no servidor adiados.
- [010](decisoes/010-participantes-e-p2p.md) Sem teto de participantes; aviso P2P a partir de 6.
- [011](decisoes/011-fluxo-de-trabalho.md) Issues, PR por tarefa, squash; produção recebe o mesmo código.
- [012](decisoes/012-prioridade-e-pronto.md) P0–P3, pronto, 1 issue por área, incidentes, regras que crescem.
- [013](decisoes/013-contexto-subagentes-modelo.md) Compactação aos 200 mil, subagentes, modelo por tarefa, auto-merge.
- [014](decisoes/014-elephant-goldfish.md) Plano na issue revisado pelo `goldfish`; agentes de apoio; entrevista e plano de ideias novas com o usuário (emenda 7 nov).
- [015](decisoes/015-notas-por-arquivo.md) Notas da versão em `changes/`; QA fecha a prévia.
- [016](decisoes/016-catalogo-tecnico.md) Catálogo técnico por tema; a ficha muda no mesmo PR que o código.
- [017](decisoes/017-custo-e-codigo-nosso.md) Pago só com receita ou ao abrir ao público; código nosso antes.
- [018](decisoes/018-ver-antes-de-codar.md) Ver antes de codar (rascunho do Design e aval); desempate dentro do nível.
- [019](decisoes/019-idade-minima.md) Idade mínima 13+ por autodeclaração no aceite enquanto o app for só de amigos; antes do público, verificação terceirizada.
- [020](decisoes/020-movimento-completo.md) Movimento completo por padrão; reduzido também para PC fraco ou internet ruim; mídia intocada.
- [021](decisoes/021-entrega-criativa.md) Entrega criativa 5 estilos × 5 exemplos em trabalho novo; 2–3 opções só em ajuste pequeno.
- Prioridade de design (8 nov): telas, balões e pop-ups redesenhados com a linguagem do Ponto vêm **antes** das animações; #261 fica em espera.
- Plano de design por fases (9 nov, #227; `design/guias/plano.md`): 0 limpeza (**feita**: revert da #328; brandbook só com o decidido, escolhas em aberto e guias separados) · 1 guias (**em andamento**: 1a brandbook e 1b revisão do existente em paralelo; 1c componentes e 1d telas depois da 1b; a 1a bloqueia a 3) · 2 exploração de estilo 5×2 em telas reais · 3 consolidação (brandbook, brandkit, tokens) · 4 produção das telas · 5 animações. Cada fase só com aval na anterior. **Exceção de 9 nov:** a pedido do usuário, a fase 2 roda logo após a 1c e a 1d, sem esperar o aval delas; ele revisa tudo junto ao voltar. #261 e as animações esperam a fase 5.

## Em aberto (aguardam o usuário)

- E10: grid personalizado — usuário prefere no máximo 3 linhas × 4 colunas no computador;
  celular a definir. Em discussão com o copiloto antes de ir ao Design.
- Design leva 2 aprovada para rascunho: Pessoas na sala, Ajustes, aviso de transmissões
  (etiqueta + sino), cards de Chamada/Compartilhar e padronização dos widgets.

## Referências

Roadmap `ROADMAP.md` ·
Arquitetura do canvas `CANVAS.md` · deploy `DEPLOY.md` · segurança `SEGURANCA.md` ·
TURN `TURN.md` · navegadores `NAVEGADORES.md` · validações `VALIDACAO.md` ·
decisões `decisoes/` · catálogo técnico `catalogo/` (fichas por tema; `GUIA.md` explicado) ·
histórico das rodadas C–E `arquivo/`.
