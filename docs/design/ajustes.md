# Ajustes — spec (leva 3, #149; substitui a versão da leva 2)

Seção "Escolhidas" do canvas da leva 3
(https://claude.ai/artifact/3yJ4umERzwmY3vtWfxt8hJ#escolhidas). A janela continua a da
leva 2 (prancha "2B", https://claude.ai/artifact/819UwyvwKn6c5WCU1X5Hv8).

## Estrutura

- Janela central 820 × 560, fundo escurecido; Esc ou X fecha.
- Lista à esquerda (220 px): campo **Buscar ajuste** no topo e categorias em grupos com
  rótulo mono maiúsculo. Grupos agora:
  - **Configurações**: Áudio, Vídeo, Notificações, Aparência, Acessibilidade, Aplicativo.
  - **Esta sala**: Sala (coroa; só para criador e admins).
- A busca filtra os ajustes pelo nome e abre a categoria com o item destacado.
- Conteúdo à direita: título da categoria e grupos com rótulo mono maiúsculo. A página
  rola; a lista não.

## Conteúdo agora (só o que existe)

| Categoria      | Itens                                                                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Áudio          | **Voz**: Microfone, Sensibilidade (medidor com limiar em dB), Reduzir ruído, Cancelar eco, Ganho automático. **Saída**: Saída de áudio, Volume geral, Ajuste fino das telas (até 300%). |
| Vídeo          | Câmera, Prévias ao vivo, Qualidade da tela (Alta/Média/Baixa, resolução, fps, bitrate).                                                                                                 |
| Notificações   | Tabela Balão × Som por tipo (Alguém entrou ou saiu, Nova tela, Widgets, Erros), Sons do VIO, Volume dos efeitos. Nota: "Tudo vai para o sino, mesmo com o balão desligado."             |
| Aparência      | Minha cor.                                                                                                                                                                              |
| Acessibilidade | Reduzir movimento: Seguir o sistema / Sempre / Nunca.                                                                                                                                   |
| Aplicativo     | Versão, Novidades, Código-fonte (AGPL).                                                                                                                                                 |
| Sala           | Código e link de convite, Permissões (#71), Transferir posse (só criador).                                                                                                              |

"Aparência e sons" deixa de existir: os sons vão para Notificações.

## Desativar áudio (sai de Ajustes)

"Silenciar vozes e transmissões" sai de Ajustes e vira o botão de fone **Desativar áudio**
na doca, logo depois do microfone (decisão do usuário):

- Desliga o **seu microfone** e as **vozes** que você ouve. **O som das telas continua.**
- Ao reativar, o microfone volta ao estado de antes.
- Ativo: fundo `#3A1E2A`, contorno `#6B2F3A`, ícone `HeadphoneOff` `#FF8A96`, rótulo
  "Áudio desativado"; o microfone aparece cortado.
- Dica: "Desativar áudio" + "Desliga seu microfone e as vozes. As telas continuam."

## Depois (issues separadas ou com o copiloto)

- Itens novos aprovados como base: aperte para falar, testar microfone, entrar nas telas com
  som ou mudo, espelhar minha câmera, tamanho da interface, atalhos.
- Categorias futuras (prancha "Mais para a frente"): grupo **Conta** (Conta, Privacidade,
  Amizades, Assinaturas, Cobranças), Idiomas, Apps conectados, Desenvolvedor e Sair. Só
  aparecem quando existirem; a ordem final será definida com o copiloto.

## Celular

Tela cheia: busca no topo, lista com subtítulo curto (ex.: "Microfone, saída, voz"); tocar
abre a página da categoria com voltar. Linhas de 60 px.

## Estado

Áudio, Vídeo, Notificações, Aparência, Acessibilidade e Aplicativo são pessoais (navegador).
Sala é estado da sala, via servidor.
