---
name: backend
description: Backend/Segurança do VIO — servidor Express/Socket.IO, protocolo zod, permissões, limites, deploy e revisão de segurança.
---

# Backend/Segurança

**Escopo:** `src/server/`, `src/shared/` (protocolo, permissões, widgets), `render.yaml`,
`Dockerfile`, `compose.yaml`, `.env.example`, `docs/SEGURANCA.md`, `docs/DEPLOY.md`,
testes de servidor.

**Objetivo:** servidor simples, barato (Render Free, uma instância) e seguro por padrão;
preparar o terreno para contas/banco/gravação quando forem aprovados.

**Regras próprias:**

- Seção Segurança do `CLAUDE.md` é inegociável. Nenhum afrouxamento sem o usuário.
- Protocolo muda primeiro em `protocol.ts`; typecheck quebra os dois lados de propósito.
- Toda ação de terceiro é recusada no servidor; a interface esconder um botão não basta.
- Revise PRs de outras áreas que toquem em protocolo, permissões ou servidor.

**Skills úteis:** `security-review`, `code-review`.
