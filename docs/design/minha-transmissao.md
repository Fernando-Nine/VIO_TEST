# Minha transmissão — spec (#147, escolha A)

Seção "Escolhidas" do canvas da leva 3
(https://claude.ai/artifact/3yJ4umERzwmY3vtWfxt8hJ#escolhidas).

## Objetivo

Um widget só para Meus espectadores, Conexão e Minha tela. Só existe "Para mim".

## Estrutura

- Cabeçalho: ícone `Radio`, título "Minha transmissão" e, **só com mais de uma
  transmissão**, o seletor "‹ 1/2 ›" (pílula de 24 px, número em mono). Ele troca qual
  transmissão o widget mostra; nada muda no que é enviado. Dica: "Trocar qual transmissão
  aparece aqui".
- Prévia da sua tela com "AO VIVO" (ponto `#4CDDC3`) e a fonte no canto ("Janela · Navegador",
  "Tela inteira"). A prévia é local; não abre nova assinatura.
- Controles:
  - **Pausar** / Continuar (`Pause`).
  - **Silenciar o som da transmissão** (`VolumeX`; dica: "Quem assiste vê a tela, sem som.").
    Ativo: fundo `#303B60`. Não mexe no microfone.
  - **Trocar o que transmito** (`RefreshCw`): abre o seletor do navegador e troca a fonte
    na mesma publicação, sem derrubar quem assiste (Mídia confirma).
  - **Parar** (vermelho `#FF8A96`).
- Quem assiste: pilha de avatares + "3 assistindo"; no foco, lista com conexão de cada um
  ("Boa" `#4CDDC3` / "Instável" `#F2D36B`, ping e perda em mono).
- Números: Envio (Mbps), Quadros (fps + resolução), Ping (ms), Perda (%), em IBM Plex Mono.

## Tamanhos

- **Lateral 420×240**: prévia 200×112 à esquerda, controles como ícones de 30 px + "Parar";
  à direita, quem assiste e os quatro números em 2×2.
- **Tira 280×160**: só a prévia, com "AO VIVO" e "olho 3 · 2,4 Mbps · 30 fps" por cima.
  Controles pelo botão direito.
- **Foco 960×640**: prévia 16:9 grande, controles com texto, números grandes e gráfico de
  envio dos últimos 60 s; coluna à direita com quem assiste e Qualidade.
- **Celular 380**: prévia em cima, controles com texto, números em 4 colunas, quem assiste.

## Estados

- Sem transmitir: "Você não está transmitindo." + botão **Compartilhar** (azul).
- Pausado: prévia congelada com "Pausado" no lugar de "AO VIVO".
- Som silenciado: botão ativo e ícone `VolumeX` ao lado de "AO VIVO".

## Substitui

Meus espectadores, Conexão e Minha tela saem do catálogo; o primeiro aberto vira Minha
transmissão no mesmo espaço, os outros fecham.

## Estado

Tudo pessoal. Silenciar e trocar a fonte mudam a publicação (Mídia); a indexação continua por `publicationId`.
