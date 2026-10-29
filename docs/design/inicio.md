# Início do app — spec (#197, escolha B)

Canvas da leva 5, linha "Escolhidas" (https://claude.ai/artifact/6wwRHH5cSppNTGfAm4rKtZ):
prancha "Escolhida · Início B" (interativa) e "197C · Abertura e passagem Criar → sala".

## Objetivo

O que o app Windows mostra ao abrir (e o navegador depois de "Chega mais", quando já houver
nome salvo): criar ou entrar numa sala em um clique, com as salas recentes à mão.

## Abertura (≤ 600 ms, nunca bloqueia)

- Tela Noite; o ponto acende no centro (0 ms), "vio" se escreve à esquerda (300 ms) e a
  logo completa some sozinha (600 ms). Clique ou tecla pula. Movimento reduzido: só a logo
  completa, 200 ms de opacidade.

## Tela (1280×800 de referência)

- **Lateral** de 320 px (`#10111A`, borda direita `--line`):
  - Topo: avatar 48 px (botão "Trocar avatar") + nome editável no lugar (salva ao sair do
    campo, Esc cancela).
  - "SALAS RECENTES" (12 px, `--muted`) e a lista: linha de 56 px com quadrado da cor da
    sala (12 px, raio 3), nome ou código e "Última vez há 2 dias". Clique entra.
  - Botão direito no item: **Renomear (só para você)** · **Copiar convite** · separador ·
    **Esquecer** (`--danger`). Ordem do padrão de menus.
  - Rodapé: "Guardadas só neste aparelho."
  - Sem presença (quem está online): exigiria consultar o servidor e expõe quem está onde.
- **Centro**: "O que vamos ver hoje?" (36 px) e, numa coluna de 440 px:
  - **Criar sala** (72 px, `.primary`, com o ponto branco de 14 px) e **Entrar com código**
    (72 px, secundário).
  - Clicar abre o cartão **no lugar do botão** (borda 2 px `--focus`); só um aberto por vez;
    Cancelar ou Esc fecha.
  - Cartão **Criar**: código sorteado editável (mono, 4–24 letras e números, como hoje) +
    "Código sorteado. Pode trocar." + chave **Trancada** (`role="switch"`, desligada por
    padrão) + Cancelar + **Criar**.
  - Cartão **Entrar**: campo único que aceita código ou link colado; ao reconhecer um link,
    mostra o selo "Link reconhecido · K7Q2MX" e preenche o código; **Entrar**.
- Sala trancada ou convite vencido ao entrar: telas de [sala-trancada.md](sala-trancada.md).

## Salas recentes (dados)

- Só no aparelho (`localStorage`): código, nome pessoal opcional, cor, última entrada. Até
  12, mais recente primeiro. Nunca enviado ao servidor. "Esquecer" apaga o item.

## Celular (380)

- Lateral vira seção abaixo dos dois botões, com a mesma lista; o nome fica no topo.

## Transições

- Criar → sala: o ponto do botão Criar cresce e vira o palco da sala (420 ms), padrão de
  [transicoes.md](transicoes.md). Sair da sala faz o caminho de volta e a sala aparece em
  Recentes.
