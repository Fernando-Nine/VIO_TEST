# Handoffs

Um arquivo por área: o **estado de agora**, para um chat novo continuar sem reler o passado.
Atualize ao trocar de chat (regra no `CLAUDE.md`). Commit junto com o trabalho. Sem segredos.

## Regras

- **Máximo 25 linhas.** Reescreva o arquivo inteiro a cada troca; não acumule.
- Só o que o próximo chat **precisa para agir**. O que já foi entregue sai: está no Git, nas
  issues e nas notas da versão.
- Conhecimento técnico que vale por muito tempo (como algo funciona, medidas, dicas de bancada)
  vai para `docs/notas/<área>.md`, que só é lido quando a tarefa tocar naquilo.
- Decisão do usuário que vale para todos vai para o `ESTADO.md`, não para o handoff.
- A fila de cada área é a seção Fila do `ESTADO.md`; o handoff não repete a lista.

## Formato

```
# <Área> — handoff
Atualizado: AAAA-MM-DD

## Agora
Issue/PR em andamento, ou "nada".

## Pendente / bloqueios
- O que falta e de quem depende (usuário, outra área).

## Decisões da área
- Só as que ainda valem e não estão no ESTADO.

## Próximo passo
Uma ação concreta.
```

## Como trocar um chat

1. No chat antigo: "atualize seu handoff e faça commit".
2. Chat novo da mesma área: "Você é o agente <área> do VIO. Leia CLAUDE.md,
   .claude/agents/<área>.md e .claude/handoff/<área>.md e continue."
3. Arquive o chat antigo.
