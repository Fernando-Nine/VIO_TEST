# Avisos (toasts) e sino — spec (#150, escolha B com barra de tempo)

Seção "Escolhidas" do canvas da leva 3
(https://claude.ai/artifact/3yJ4umERzwmY3vtWfxt8hJ#escolhidas).

## Posição e fila

- Centralizados no topo do canvas, logo abaixo da barra da sala. **Um aviso por vez**; os
  outros esperam na fila, com a pílula "+N" ao lado (mono, `#A6A9FF`).
- **Erro ou aviso importante** (Desfazer, nova tela) entra **por cima** e empurra o atual
  para baixo; no máximo dois na tela. O de baixo continua correndo.
- Substitui a etiqueta no canto do canvas de [transmissoes.md](transmissoes.md): o aviso
  de nova tela passa a usar este padrão.

## Aviso

- Largura 340 px (máx. 100%), altura mínima 44 px, raio 12, fundo `#14152A` translúcido,
  borda `#33355A`; erro com fundo `#241520` e borda `#6B2F3A`.
- Conteúdo: avatar ou ícone · texto · ação opcional (Assistir, Desfazer, Tentar de novo) ·
  **× sempre**.
- **Barra de tempo**: 3 px na base, `#A6A9FF`, cresce da esquerda até o fim; ao chegar,
  o aviso sai e entra o próximo. Passar o mouse ou focar pausa a barra.

| Tipo      | Texto                                             | Tempo                   |
| --------- | ------------------------------------------------- | ----------------------- |
| Entrou    | "**Bia** entrou na sala."                         | 4 s                     |
| Saiu      | "**Rafa** saiu."                                  | 4 s                     |
| Nova tela | "**Lia** começou a transmitir." + Assistir        | 6 s                     |
| Desfazer  | "Você fechou o Cronômetro para todos." + Desfazer | 8 s                     |
| Erro      | mensagem do `Fault` + ação, se houver             | sem barra; fica até o × |

## Sino (histórico)

Como hoje (#123), com os mesmos tipos: grupos "Agora" (última hora) e "Antes"; não lidas
com ponto `#A6A9FF`; "Limpar". Todo aviso vai para o sino, mesmo se o balão estiver
desligado em Ajustes › Notificações.

## Movimento e acessibilidade

- Entra descendo 8 px em 200 ms; o empurrado desce em 180 ms. Sem animação (e sem barra
  animada; ela fica cheia) em `prefers-reduced-motion`.
- `role="status"` (polite); erro com `role="alert"`. × com `aria-label="Fechar aviso"`.
- Som curto ao chegar, conforme Ajustes › Notificações e o volume dos efeitos.

## Celular

Mesmo comportamento, largura total menos 16 px de margem, logo abaixo da barra superior.
