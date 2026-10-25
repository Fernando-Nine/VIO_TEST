# Pessoas na sala — spec (escolha A · painel lateral)

Prancha "1A · Pessoas em painel lateral" no canvas da leva 2 (https://claude.ai/artifact/819UwyvwKn6c5WCU1X5Hv8).

## Objetivo

Ver quem está na sala e o estado de cada pessoa, e agir sobre ela, sem cobrir o vídeo
principal mais do que o necessário.

## Estrutura

- Painel fixo à direita (380 px), aberto pelo ícone de pessoas da barra superior (badge com
  o total). Fecha com X, Esc ou clicando de novo no ícone. Não escurece a sala.
- Abas **Pessoas · N** e **Permissões** (a segunda só para criador e admins).
- Linha (48 px): avatar 32 px com iniciais na cor da pessoa; nome (+ "você"); papel por
  ícone — coroa `#F2D36B` para criador, escudo `#C8CEFF` para admin; à direita, estado:
  - falando: ícone de som `#4CDDC3` + anel no avatar;
  - transmitindo: ícone de tela `#A6A9FF`;
  - microfone desligado: microfone cortado `#FF8A96`;
  - fora da chamada: fone cortado, cinza.
    Estado nunca só por cor: sempre com ícone e `aria-label`.
- Botão direito (ou "..." no foco do teclado) abre o menu da pessoa:
  1. Volume (controle deslizante 0–200%, número em mono) — pessoal.
  2. Assistir a tela (se transmitindo).
  3. Silenciar para mim — **sugestão, confirmar com o copiloto**.
  4. Tornar/Revogar administrador · Permissões de edição · Transferir posse da sala
     (só para quem pode, conforme `canSetPermission`).
- Aba Permissões: os interruptores atuais de `permissionText`, em dois grupos
  ("Convidados podem", "Administradores podem" — este com coroa: só o criador altera).

## Celular

Folha inferior (~470 px) com as mesmas abas e linhas de 52 px; toque longo na pessoa
abre o menu como folha. Alvos ≥ 44 px.

## Estado

Volume e "silenciar para mim" são preferência pessoal. Papéis e permissões são da sala
(servidor confere).
