# VIO — pendências explicadas

Atualizado em 11/10/2026. A prévia **2.7.0-rc.5** pode ser experimentada em
https://vio-test-canvas-preview.onrender.com/. O trabalho está preservado no
[PR #3 do VIO_TEST](https://github.com/Fernando-Nine/VIO_TEST/pull/3).
O site principal continua na 2.6.0; VIO e VIO_2 não foram alterados.

## O que já está feito

O canvas, os presets, a tira linear, o arraste/encaixe, as janelas destacáveis e os
widgets individuais com compartilhamento opcional estão implementados. A tela grande
faz parte do grid. Focar troca posições; foco único esconde os demais widgets.
O código mantém os players de áudio e as assinaturas ao mudar a organização.
Somente o criador pode alterar a estrutura de um widget compartilhado.

São **74 testes automatizados aprovados**, além de TypeScript e build. A interface
publicada foi conferida por botões, arraste e teclado, com duas sessões: troca de
posições, tira, foco único, notas compartilhadas e redimensionamento de janela.
Esses ensaios não comprovam que o áudio chega corretamente a aparelhos físicos.

## Continuação da rodada C

Foram corrigidos recuperação automática, foco único com o widget principal correto,
exclusão pelo criador versus fechamento local e controles repetidos. Nesta continuação,
Salvar texto subiu para o cabeçalho da nota, o foco do teclado acompanha inclusão e
fechamento, e os avisos passam a pertencer ao canvas que entra em tela cheia. Os
popovers escapam do recorte dos cards e respeitam as bordas; clicar ou focar um
flutuante o traz à frente sem trocar sua posição.

## Rodada D

D1–D13 implementados: controles simplificados, comportamento da barra em fullscreen,
roda da tira unificada, setas sobrepostas, encaixe sincronizado, tira como padrão,
Notas com até seis caixas e envio de cópias, e painel Pessoas com detalhes.
Na prévia, duas sessões confirmaram cópias independentes e ping/coroa. Também foram
conferidos recolhimento automático, gatilho de topo e alinhamento/rolagem interna
da tira. Evidência e limites em [VALIDACAO.md](VALIDACAO.md).

Restam duas escolhas de produto:

| Decisão | Situação |
|---|---|
| D14 · Personalizado | Escolher os módulos editáveis propostos em RODADA-D.md. Nenhum módulo novo foi implementado. |
| D15 · Mesclagem | Escolher seleção de vizinhos pelo Layout ou ação Juntar ao próximo. A proposta agora inclui a tira e não usa alça de canto. |

C24 foi aprovado e implementado em D12. As propostas antigas de C25/C26 foram
substituídas por D14/D15. Detalhes e limites: [RODADA-D.md](RODADA-D.md).

## O que falta antes de substituir o site principal

| Pendência | Em linguagem simples | Como considerar concluída |
|---|---|---|
| Continuidade de áudio e vídeo | Mudar o layout não pode cortar, duplicar ou reiniciar o som. | Com duas abas e depois PC + celular, assistir a várias telas, trocar foco, esconder, restaurar e parar uma transmissão. Ouvir o resultado e confirmar que as conexões restantes são preservadas. |
| Economia de recursos | Esconder um vídeo deve reduzir seu custo sem desligar o áudio. | Medir bitrate, FPS e uso de CPU antes/depois, incluindo itens fora da tira, e verificar a retomada. O teste automático atual confirma os comandos, não a economia real. |
| Celular e acessibilidade | Tudo precisa continuar alcançável em telas pequenas e sem mouse. | Conferir toque, retrato/paisagem, zoom de 200%, teclado, leitor de tela, movimento reduzido e retorno de foco dos menus. Já houve teste de teclado no desktop; o restante ainda precisa de aceite. |
| Navegadores e dispositivos de som | Captura, saída de áudio, volume e PiP variam entre navegadores. | Repetir os fluxos em Chrome/Edge, Firefox e Safari/iPhone quando disponível. Recursos indisponíveis devem ter alternativa clara; nada pode fingir funcionar. Conferir também a passagem do mouse até o card de volume com mídia ativa. |
| Quedas e redes diferentes | A sala deve se recuperar sem misturar identidades ou transmissões antigas. | Trocar rapidamente de sala, interromper rede e reiniciar o servidor com mídia ativa. Testar em duas redes e confirmar quando o TURN realmente transporta os dados. |
| Publicação da versão estável | Depois do aceite, o código da prévia pode substituir a 2.6.0. | Integrar o PR, conferir o deploy principal, entrada em sala e mídia, mantendo o commit anterior disponível para reversão. |

O `CLAUDE.md` do próprio projeto exige duas abas, PC + celular e reinício do servidor
antes de fechar uma tarefa que altera mídia. Por isso esta entrega permanece como
**prévia**, mesmo com a suíte automatizada aprovada. Não é necessário comprar outro
serviço ou criar contas para realizar esse aceite.

## O que é necessário para esses testes

Um computador e um celular, fones para evitar realimentação e uma fonte de áudio
conhecida. Para testar o caminho alternativo de rede, usar duas redes — por exemplo,
Wi-Fi e dados móveis. O navegador remoto da bancada permite conferir a interface,
mas não comprova escuta em fones físicos nem captura nativa do Windows.

A prévia usa Render Free e pode demorar a iniciar após ficar ociosa; isso foi observado.
Tem configuração própria, sem alterar o serviço principal. O laboratório de testes
não está exposto, e os limites de sessão, origem e autorização continuam ativos.

O ExpressTURN está configurado por variáveis de ambiente, mas configuração não é
prova de uma conexão via relay. A credencial estática fornecida deve ser tratada
como solução provisória: para operação duradoura, planejar credenciais temporárias
e acompanhamento de uso. Nenhum segredo faz parte dos arquivos do projeto.

Widgets compartilhados desaparecem quando a sala esvazia ou o servidor reinicia.
Os individuais ficam neste navegador. Quem precisar conservar conteúdo compartilhado
pode criar uma cópia individual antes de sair.

## Depois: aplicativo Windows com WASAPI

Há trabalho separado no ramo nativo, ainda sem compilação e captura aprovadas. A ordem é
concluir os ajustes de build, integrar o canvas aceito e gerar um instalador de teste.
Instalar a PWA atual não dá acesso às APIs nativas do Windows.

O aceite precisa acontecer em Windows real: capturar o áudio da aplicação escolhida,
confirmar que não entram sons de outras aplicações ou da própria chamada, conferir
sincronia com o vídeo e testar parar/cancelar/fechar. Também devem ser verificados
suspensão do computador, troca de fones USB/Bluetooth, instalação e desinstalação.
Atualização automática e assinatura do instalador precisam de uma decisão antes
da distribuição estável. Não há um instalador WASAPI certificado nesta entrega.

## Ideias futuras, sem bloquear o canvas atual

| Ideia | Requisito que ainda falta |
|---|---|
| Dono da sala | O servidor deve reconhecer a primeira pessoa, autorizar cada ação e definir a sucessão quando ela sai ou perde conexão. Não basta esconder botões. |
| Expulsar e banir | Expulsar pode encerrar a sessão atual. Para um banimento duradouro, é preciso uma identidade mais difícil de trocar do que fechar o navegador; contas são uma opção futura, não uma exigência desta versão. |
| Guardar widgets para outro dia | Armazenamento durável e regras para reabrir, editar e excluir. Hoje o conteúdo compartilhado é temporário por projeto. |
| Widgets da comunidade | Isolamento do código, permissões revogáveis, verificação de autor/origem, revisão, cotas e encerramento de widgets problemáticos. O catálogo atual executa apenas widgets internos. |

Ordem recomendada: aceite de mídia/celular → publicação do canvas → instalável Windows
com testes WASAPI → administração de salas e extensões.

Os resultados técnicos e o roteiro de ensaio ficam em [VALIDACAO.md](VALIDACAO.md).
