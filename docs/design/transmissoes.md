# Novas transmissões — spec (escolha A + C)

Pranchas "3A · Etiqueta no canto do canvas" e "3C · Etiqueta presa ao sino" (https://claude.ai/artifact/819UwyvwKn6c5WCU1X5Hv8).

## Comportamento

- Quando alguém começa a transmitir:
  1. **Etiqueta (A)** no canto inferior esquerdo do canvas: avatar, "**Lia** começou a
     transmitir", botão **Assistir** e X. Some sozinha depois de alguns segundos ou ao
     dispensar.
  2. Ao sumir, a notificação **vai para o sino (C)**: contador azul no sino e, ao abrir,
     balão preso ao sino listando quem começou, cada um com **Assistir**.
- Se várias pessoas começam juntas, a etiqueta do canto mostra só a mais recente; o balão
  do sino agrupa todas.
- Som curto de interface ao chegar, respeitando Sons do VIO e o volume dos efeitos.
- **Interpretação a confirmar com o copiloto**: A no canto + C no sino como histórico.

## Medidas e movimento

- Etiqueta: pílula de 40 px, fundo `#14152A` translúcido, borda `#33355A`;
  entra subindo 8 px em 260 ms; sem animação em movimento reduzido.
- `role="status"` (aria-live polite). Assistir = ação principal azul.

## Celular

Etiqueta logo acima dos controles da chamada, largura total; sino na barra superior com
o mesmo balão.
