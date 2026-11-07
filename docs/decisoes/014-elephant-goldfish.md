# 014 — Plano na issue (Elephant-Goldfish enxuto) e agentes de apoio

Data: 2026-11-05

## Contexto

Áreas caras gastavam o chat descobrindo o problema e refazendo. O modelo Elephant-Goldfish (ensaio
de Dave Rensin; plugin `google/elephant-goldfish-model`, Apache-2.0) propõe que uma sessão com
contexto escreva o plano e revisores sem memória testem se ele se sustenta sozinho. Não há números
publicados de ganho e a revisão custa tokens a mais.

## Decisão

- Issue P3, de protocolo ou segurança, ou que cruze áreas traz o plano no corpo (objetivo, fora
  do escopo, arquivos prováveis, invariantes tocados, aceite; modelo `feature.yml`) e passa pelo
  subagente `goldfish` antes de a área começar. O mesmo tipo de issue tem o diff revisado sem
  memória (`code-review` ou `goldfish` em modo diff) antes do merge. Bugs P0–P2 pequenos, não.
- Agentes de apoio, só leitura, sem handoff: `goldfish`, `crawler` (varredura de bug ou área e
  antes de release) e `pesquisador` (web, com fontes). Ficam em `.claude/agents/`.
- Sem skills novas nem dependência: o plano mora na issue.
- Emenda (7 nov): em brainstorming, feature nova e mudança de visão, a entrevista (Elephant), as
  perguntas e as revisões do plano são feitas com o usuário; o `goldfish` subagente serve para o
  copiloto e as áreas se situarem e para revisar diff e plano técnico.

## Motivo

A área recebe um plano fechado; a revisão roda num modelo mais barato e com contexto pequeno.

Não rediscutir sem o usuário.
