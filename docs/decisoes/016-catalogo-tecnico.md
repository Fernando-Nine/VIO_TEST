# 016 — Catálogo técnico

Data: 2026-11-05 (#287)

## Contexto

Não havia um retrato do que o VIO usa hoje, de como isso se compara ao mercado e do que está
errado ou velho. Cada agente relia o código para descobrir, e docs antigas divergiam dele.

## Decisão

- `docs/catalogo/` tem uma ficha por tema (como funciona, números, peças, mercado, achados e
  perguntas), a lista de dependências e o `GUIA.md`, versão explicada com os porquês e o que
  ficou para depois. Formato no README de lá.
- Leitura sob demanda: só a ficha da tarefa.
- Mudou o que uma ficha descreve: a ficha muda no mesmo PR. Achado resolvido sai dela.
- Ao fechar cada MINOR, o QA revisa as fichas que a versão tocou.
- Achado vira issue só na triagem do copiloto com o usuário.

## Motivo

Saber o que usamos e o que pode melhorar sem reler o código inteiro, com pouco custo de leitura.

Não rediscutir sem o usuário.
