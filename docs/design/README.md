# Specs de design

Rascunho aprovado pelo usuário vira spec aqui, mais uma issue `frontend`. A spec diz
**o que** a tela mostra e como se comporta; a implementação é do Frontend.

Canvas da 1ª leva (widgets): https://claude.ai/artifact/3M2c9eiZF8Pp26bjBhMjAZ
Canvas da 2ª leva (interface): https://claude.ai/artifact/819UwyvwKn6c5WCU1X5Hv8
Canvas da 3ª leva: https://claude.ai/artifact/3yJ4umERzwmY3vtWfxt8hJ (seção "Escolhidas")
Canvas da 4ª leva: https://claude.ai/artifact/7ERZLFRtHn6xXE6mXcoPUf (linha "Escolhidas")

Formato de cada leva: skill `vio-design-delivery`. O que ficou para depois:
[ideias-futuras.md](ideias-futuras.md).

Tamanhos de referência: pequeno (lateral, 420×240, sem rolagem), foco (960×640) e
celular (380 de largura). Tema escuro, azul `#2727F5`, destaque `#A6A9FF`, Bricolage
Grotesque na interface e IBM Plex Mono em tempos e números. Animações curtas (≤ 800 ms) e
desligadas em `prefers-reduced-motion`.

| Widget                 | Spec                                         | Escolha                     |
| ---------------------- | -------------------------------------------- | --------------------------- |
| Cronômetro             | [cronometro.md](cronometro.md)               | A · Anel                    |
| Votação                | [votacao.md](votacao.md)                     | A, com elementos da B       |
| Dados                  | [dados.md](dados.md)                         | A · Ícones                  |
| Sorteador              | [sorteador.md](sorteador.md)                 | A · Roleta, cores editáveis |
| Pessoas na sala        | [pessoas.md](pessoas.md)                     | A · painel lateral          |
| Ajustes                | [ajustes.md](ajustes.md)                     | B · lista lateral; leva 3   |
| Novas transmissões     | [transmissoes.md](transmissoes.md)           | A + C                       |
| Chamada e Compartilhar | [chamada.md](chamada.md)                     | D; tela cheia A             |
| Padrão dos widgets     | [widgets-padrao.md](widgets-padrao.md)       | A + selo da B               |
| Cabeçalho − / ×        | [cabecalho-widget.md](cabecalho-widget.md)   | A + Desfazer + não exibidos |
| Widget Pessoas         | [widget-pessoas.md](widget-pessoas.md)       | C, volume sempre à vista    |
| Minha transmissão      | [minha-transmissao.md](minha-transmissao.md) | A + silenciar, trocar, 1/2  |
| Tempos                 | [tempos.md](tempos.md)                       | 1 · site e própria tela     |
| Câmeras                | [cameras.md](cameras.md)                     | C + B                       |
| Avisos e sino          | [notificacoes.md](notificacoes.md)           | B + barra de tempo          |
| Adicionar widget       | [adicionar-widget.md](adicionar-widget.md)   | Leva 4: B + aba Comunidade  |
| Layout                 | [layout.md](layout.md)                       | A sem Foco único; celular   |
| Volume                 | [volume.md](volume.md)                       | A + botão direito; vertical |
| Compartilhar tela      | [compartilhar.md](compartilhar.md)           | A no app, B no navegador    |
| Juntar espaços e foco  | [grade-foco.md](grade-foco.md)               | A + D + E (Shift)           |
