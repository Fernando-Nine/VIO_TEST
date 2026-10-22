# Handoffs

Um arquivo por área. É o que um chat novo lê para continuar de onde o anterior parou.
Atualize ao passar de ~60% do contexto (`/context`), ao concluir uma entrega grande ou
antes de encerrar. Commit junto com o trabalho. Sem segredos, tokens ou dados pessoais.

Máximo ~40 linhas. Reescreva, não acumule: histórico fica no Git e nas issues.

## Formato

```
# <Área> — handoff
Atualizado: AAAA-MM-DD

## Agora
Em que está trabalhando (issue #, branch, PR).

## Feito recentemente
- Itens concluídos que o próximo chat precisa saber (com #issue/PR).

## Decisões
- Decisões tomadas e o porquê, quando não óbvio.

## Pendente / bloqueios
- O que falta, o que depende de outra área ou do usuário.

## Próximo passo
Uma ação concreta.
```

## Como trocar um chat

1. Peça ao agente: "atualize seu handoff e faça commit".
2. Abra um chat novo da mesma área com: "Você é o agente <área> do VIO. Leia CLAUDE.md,
   .claude/agents/<área>.md e .claude/handoff/<área>.md e continue."
3. Arquive o chat antigo.
