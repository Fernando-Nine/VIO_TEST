# Specs de design

Rascunho aprovado pelo usuário vira spec aqui, mais uma issue `frontend`. A spec diz
**o que** a tela mostra e como se comporta; a implementação é do Frontend.

Canvas da 1ª leva (widgets): https://claude.ai/artifact/3M2c9eiZF8Pp26bjBhMjAZ
Canvas da 2ª leva (interface): https://claude.ai/artifact/819UwyvwKn6c5WCU1X5Hv8

Tamanhos de referência: pequeno (lateral, 420×240, sem rolagem), foco (960×640) e
celular (380 de largura). Tema escuro, azul `#2727F5`, destaque `#A6A9FF`, Bricolage
Grotesque na interface e IBM Plex Mono em tempos e números. Animações curtas (≤ 800 ms) e
desligadas em `prefers-reduced-motion`.

| Widget                 | Spec                                   | Escolha                     |
| ---------------------- | -------------------------------------- | --------------------------- |
| Cronômetro             | [cronometro.md](cronometro.md)         | A · Anel                    |
| Votação                | [votacao.md](votacao.md)               | A, com elementos da B       |
| Dados                  | [dados.md](dados.md)                   | A · Ícones                  |
| Sorteador              | [sorteador.md](sorteador.md)           | A · Roleta, cores editáveis |
| Pessoas na sala        | [pessoas.md](pessoas.md)               | A · painel lateral          |
| Ajustes                | [ajustes.md](ajustes.md)               | B · lista lateral           |
| Novas transmissões     | [transmissoes.md](transmissoes.md)     | A + C                       |
| Chamada e Compartilhar | [chamada.md](chamada.md)               | D; tela cheia A             |
| Padrão dos widgets     | [widgets-padrao.md](widgets-padrao.md) | A + selo da B               |
