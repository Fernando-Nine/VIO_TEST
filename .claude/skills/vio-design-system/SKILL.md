---
name: vio-design-system
description: Sistema de design do VIO — tokens, padrão comum dos widgets (cores/paletas, permissões, menus), modelo pessoal vs. sala e formato de spec para o Frontend. Use ao desenhar ou implementar qualquer widget ou tela, e ao padronizar elementos entre widgets.
---

# Sistema de design do VIO

Fonte de verdade visual: o código em `src/client/*.css` e as specs aprovadas em
`docs/design/`. Se algo aqui divergir delas, as specs aprovadas vencem — e atualize esta skill.

## Tokens

- Tema escuro único. Azul da marca `#2727F5`. Destaque discreto (vencedor, crítico) `#A6A9FF`.
- Fontes: Bricolage Grotesque (interface), IBM Plex Mono (números, código da sala, ping).
- Ícones `lucide-react`, traço 1.5–2 px, 16/20/24 px.
- Raios, espaçamentos e sombras: reutilize as variáveis CSS existentes; não crie valor solto.

## Modelo de widget

- **Pessoal**: criado por qualquer pessoa, só ela vê e mexe. Não é compartilhável.
- **Da sala**: criado por criador/administradores (ou convidados, se a sala permitir).
  Um só estado para todos, via servidor. Controle/edição seguem as permissões da sala.
- A escolha é feita **na criação** ("Para mim" / "Para a sala"); não existe fluxo de
  compartilhar um widget pessoal.

## Padrão comum (aplique só onde fizer sentido para o widget)

| Elemento           | Padrão                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------- |
| Cabeçalho          | Ícone + título editável no lugar + selo pessoal/sala; ações no botão direito              |
| Cor e paletas      | Seletor da roleta (cor por item + paletas harmônicas) em todo widget com itens coloríveis |
| Permissão          | Quem não pode controlar vê o estado, sem botões mortos; dica curta no hover               |
| Menu botão direito | Mesma ordem: ações do widget → aparência → permissões → remover                           |
| Edição             | No lugar; salva ao sair do campo; Esc cancela                                             |
| Sons               | Respeitam volume de efeitos e liga/desliga da aba Aplicativo                              |

## Tamanhos

Três estados obrigatórios: pequeno (lateral, sem rolagem), foco (ocupa o espaço) e celular.
Use container queries e unidades relativas ao contêiner.

## Spec para o Frontend (handoff)

Ao aprovar, escreva `docs/design/<peça>.md` com: objetivo, estados (vazio, ativo, fim,
sem permissão, erro), medidas e tokens usados, comportamento nos três tamanhos,
interações (mouse, teclado, toque), textos exatos, sons e animações (duração, reduced
motion), e o que é estado da sala vs. pessoal. Abra a issue `frontend` linkando a spec.
