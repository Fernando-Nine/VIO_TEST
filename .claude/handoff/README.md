# Handoffs

Um arquivo por área: o **estado de agora**, para um chat novo continuar sem reler o passado.
Atualize ao fim de cada sessão (regra no `CLAUDE.md`). Commit junto com o trabalho. Sem segredos.

## Regras

- **Cerca de 40 linhas.** Pode explicar mais, mas só o estado de agora: nada já resolvido.
  Reescreva o arquivo inteiro a cada sessão; não acumule.
- Só o que o próximo chat **precisa para agir**. O que já foi entregue sai: está no Git, nas
  issues e nas notas da versão.
- Conhecimento técnico que vale por muito tempo (como algo funciona, medidas, dicas de bancada)
  vai para `docs/notas/<área>.md`, que só é lido quando a tarefa tocar naquilo.
- Decisão do usuário que vale para todos vira ADR em `docs/decisoes/`, não vai para o handoff.
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

Área: a sessão termina ao fechar o bloco de 1–2 issues.

1. No fim da sessão: "atualize seu handoff e faça commit".
2. Sessão nova da mesma área (o copiloto abre, com o modelo da tarefa): "Você é o agente <área>
   do VIO. Leia CLAUDE.md, .claude/agents/<área>.md e .claude/handoff/<área>.md e continue."

O copiloto não troca de chat: a compactação automática resume o contexto aos 200 mil tokens.
