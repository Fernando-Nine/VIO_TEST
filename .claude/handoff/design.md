# design — handoff

Atualizado: 2026-10-25

## Agora

Leva 2 em rascunho, aguardando escolha do usuário (ele comenta direto no canvas).
Canvas: https://claude.ai/artifact/819UwyvwKn6c5WCU1X5Hv8 ("Interface VIO — leva 2").
Leva 1 (widgets): https://claude.ai/artifact/3M2c9eiZF8Pp26bjBhMjAZ — specs em `docs/design/`.

## Feito recentemente

- Leva 2, computador (1200×750) + celular (360×740), a partir de screenshots da prévia:
  1. Pessoas: A painel lateral / B balão compacto; abas Pessoas · Permissões; menu de
     botão direito (volume, silenciar para mim, admin, permissões de edição, posse).
  2. Ajustes: A abas no topo / B janela com lista lateral; Áudio, Vídeo, Aparência e sons,
     Sala (só criador/admins).
  3. Transmissões: A etiqueta no canto / B faixa no topo / C balão preso ao sino; sino com
     contador.
  4. Chamada/Compartilhar: A barra fina que recolhe / B na barra de Layout/Widget /
     C botão flutuante / D doca no rodapé (ideia nossa).
  5. Widgets: A cadeado no cabeçalho / B selo "Admins/Todos/Só você" e menu separado em
     "Para mim" e "Para a sala"; tabela de onde cor, permissão e menu se aplicam.

## Decisões

- Vencedor/crítico em destaque discreto `#A6A9FF`; animações ≤ 800 ms, sem animação em
  movimento reduzido.
- Seletor de cor/paleta da roleta é o padrão para todo widget com cor.

## Pendente / bloqueios

- Escolha do usuário em cada peça. Sugestões ainda não aprovadas: "Silenciar para mim",
  "Quem pode controlar" no menu do widget, faixa que some em 8 s, aba Sala com convite.
- Skills `design:*` citadas no papel não estão instaladas nesta sessão.

## Próximo passo

Com as escolhas, specs em `docs/design/` e issues `frontend`.
