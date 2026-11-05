# 005 — Correções de segurança vão direto para a produção

Data: 2026-10-24

## Contexto

Toda mudança espera o aval do usuário na prévia antes da produção, o que atrasa uma correção de
segurança.

## Decisão

Correção de segurança vai direto para a produção, como hotfix PATCH sobre a versão de produção,
sem esperar aval.

## Motivo

Uma falha conhecida exposta custa mais que o risco de um hotfix pequeno.

Não rediscutir sem o usuário.
