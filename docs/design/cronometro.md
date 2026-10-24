# Cronômetro — spec (escolha A · Anel)

Prancha: "Cronômetro A · Anel" no canvas (`docs/design/README.md`).

## Estrutura

- **Anel de progresso** ao redor do tempo. Trilho `#1E2030`, progresso `#2727F5`, ponta
  arredondada, começa no topo e anda no sentido horário.
  - Temporizador: o anel mostra o que **resta** do total (`de 25:00` embaixo do tempo).
  - Cronômetro: o anel dá uma volta por minuto; décimos em tamanho menor (`07:31.4`).
- **Modo**: controle segmentado `Temporizador | Cronômetro`.
- **Controles**: botão principal `Iniciar`/`Pausar` (azul) e `Reiniciar`; no cronômetro,
  `Volta` (ícone de bandeira).

## Tamanhos

- **Pequeno**: anel 150 px com o tempo dentro; à direita, modo (segmentado compacto),
  `Pausar` e ícone de reiniciar/volta. No cronômetro, a última volta aparece sob o tempo
  (`Volta 3 · 02:10`). Sem rolagem.
- **Foco**: anel 420 px, tempo 96 px. À direita: modo, atalhos `5 min · 10 min · 25 min`
  (só no temporizador), botões grandes. No cronômetro, lista de voltas no lugar dos atalhos;
  a melhor volta em `#A6A9FF`.
- **Celular**: coluna única — modo, anel 220–240 px, atalhos ou voltas, botões.

## Alarme

- Tempo zerado: anel inteiro em `#A6A9FF` pulsando (1,2 s; parado em movimento reduzido),
  `00:00`, "Tempo esgotado" e botão **Desligar** (ícone de sino cortado).
- Borda do widget em `#4446A8` enquanto toca.
- Desligar vale para a sala inteira (estado do servidor, já implementado no #67).

## Fora do escopo

Sem novos estados no protocolo: é só apresentação do que o widget já tem.
