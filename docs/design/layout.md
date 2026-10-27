# Layout — spec (#150, escolha A sem Foco único; celular em uma coluna)

Seção "Escolhidas" do canvas da leva 3
(https://claude.ai/artifact/3yJ4umERzwmY3vtWfxt8hJ#escolhidas).

## Computador — painel "Layout"

- Dois modos em cartões: **Grade** ("Todos do mesmo tamanho.") e **Foco + tira** ("Um
  grande e uma fileira."). "Foco único" sai: é a grade 1×1.
- **Grade**: seletor de tamanho em matriz de 3 linhas × 4 colunas (células 44×30, raio 5).
  No hover, acende do canto até a célula (fundo `#3A3FA8`, borda `#A6A9FF`) e o rótulo
  mostra "2 × 3" em mono; clique aplica. Teclado: setas movem, Enter aplica.
  Texto: "De 1×1 (um widget só) até 3 linhas por 4 colunas."
- **Foco + tira**: posição do foco (Esquerda, Direita, Em cima, Embaixo) e tamanho do foco
  (controle deslizante em %), como hoje.
- Diminuir a grade não fecha widgets: os que sobram vão para "Não exibidos".

## Celular — uma coluna

- O widget em foco fica **fixo no topo** em 16:9; os outros vêm embaixo, na largura toda,
  e rolam.
- Sem matriz no celular: o painel mostra só "Foco no topo" ligado/desligado (sugestão).
- A doca vira barra de abas de 68 px (Microfone, Áudio, Tela, Mais), como em
  [chamada.md](chamada.md).

## Estado

Layout é pessoal (navegador), por sala.
