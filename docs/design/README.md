# Specs de design

Rascunho aprovado pelo usuário vira spec aqui, mais uma issue `frontend`. A spec diz
**o que** a tela mostra e como se comporta; a implementação é do Frontend.

Canvas da 1ª leva de widgets: https://claude.ai/artifact/3M2c9eiZF8Pp26bjBhMjAZ

Tamanhos de referência: pequeno (lateral, 420×240, sem rolagem), foco (960×640) e
celular (380 de largura). Tema escuro, azul `#2727F5`, destaque `#A6A9FF`, Bricolage
Grotesque na interface e IBM Plex Mono em tempos e números. Animações curtas (≤ 800 ms) e
desligadas em `prefers-reduced-motion`.

| Widget     | Spec                           | Escolha                     |
| ---------- | ------------------------------ | --------------------------- |
| Cronômetro | [cronometro.md](cronometro.md) | A · Anel                    |
| Votação    | [votacao.md](votacao.md)       | A, com elementos da B       |
| Dados      | [dados.md](dados.md)           | A · Ícones                  |
| Sorteador  | [sorteador.md](sorteador.md)   | A · Roleta, cores editáveis |
