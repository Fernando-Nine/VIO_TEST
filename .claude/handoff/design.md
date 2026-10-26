# design — handoff

Atualizado: 2026-10-26

## Agora

Leva 3 entregue para escolha (#146–#150), aguardando o aval do usuário.
Canvas leva 3: https://claude.ai/artifact/3yJ4umERzwmY3vtWfxt8hJ (seções `#cabecalho`,
`#combinados`, `#camera`, `#ajustes`, `#telas`). Resumo comentado em cada issue.
Leva 2: https://claude.ai/artifact/819UwyvwKn6c5WCU1X5Hv8 · leva 1:
https://claude.ai/artifact/3M2c9eiZF8Pp26bjBhMjAZ. Specs em `docs/design/`.

## Feito recentemente

- Leva 3, um só sistema visual tirado da sala rc.13 (cabeçalho 38 px, raio 10):
  - #146 cabeçalho: A dois botões (rec.), B × que pergunta, C só − e fechar no menu;
    Desfazer 8 s (rec.) ou confirmar; botão "Escondidos" para reabrir.
  - #147 Pessoas A/B/C, Minha transmissão A/B (+ vazio), tempo da sala no cabeçalho do
    site, tempo da tela 1 (na tela, rec.) ou 2 (no site); tabela de migração dos antigos.
  - #148 Câmeras A grade (rec.), B uma pessoa, C destaque; nota para Mídia.
  - #149 mapa do menu + Voz (lista A) e Notificações (lista B); fone no rodapé.
  - #150 balões e sino; adicionar widget A/B/C; layout A/B + celular; volume A/B.
- Volume: trilho com marca em 100% e trecho amplificado dourado (sugestão).
- Prévia do Render inacessível pela rede do contêiner: olhar a sala com build local
  (`npm run dev` + Playwright).

## Decisões

- Skills do projeto: `vio-design-system` e `vio-design-review` (`.claude/skills/`).
- Destaque discreto `#A6A9FF`; animações ≤ 800 ms, desligadas em movimento reduzido.

## Pendente / bloqueios

- Usuário: ícone do convidado em #146 (× ou −; recomendei −) e uma alternativa por peça.
- Confirmar com o copiloto: "Silenciar para mim" (#107) e a leitura de A + C (#109).

## Próximo passo

Após o aval: specs em `docs/design/` (cabecalho, pessoas v2, transmissao, cameras,
ajustes v2, notificacoes, adicionar-widget, layout, volume) + issues `frontend`; itens
novos de Ajustes viram issues separadas.
