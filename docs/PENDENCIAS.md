# O que falta para esta atualização

A prévia 2.7.0-rc.1 está no ramo `feat/canvas-widgets` do **VIO_TEST**. O site publicado
continua na 2.6.0. O trabalho do aplicativo Windows foi mantido separado.

## Para publicar o novo layout

| Pendência | O que precisa acontecer | Por quê |
|---|---|---|
| Conferir a interface | Abrir a prévia em um navegador de teste acessível e conferir desktop/celular | Os testes automáticos não enxergam botões cortados, rolagem ou alvos de toque ruins. O navegador desta bancada bloqueou o endereço local. |
| Conferir o áudio contínuo | Assistir a várias telas, trocar posições, esconder, usar foco único e voltar | Precisamos ouvir e medir que o áudio continua e que o vídeo volta, sem abrir outra conexão. |
| Testar aparelhos reais | Usar duas abas, depois PC + celular; testar Chrome/Edge e Firefox, além de Safari quando disponível | Cada navegador trata captura, reprodução, pausa de vídeo e PiP de maneira diferente. |
| Testar quedas | Derrubar a conexão e reiniciar o servidor durante uma sessão de teste | Confirma retorno da identidade, reconexão de mídia e descarte correto dos widgets temporários. |
| Publicar e acompanhar | Aprovar o aceite, integrar o ramo e verificar o deploy no Render | Hoje não há prévias automáticas habilitadas no serviço. A versão está preservada para revisão antes da troca do site. |

Nenhuma nova hospedagem foi criada, e as configurações/credenciais do Render não
foram alteradas nesta etapa. Os limites de segurança da sessão e das salas continuam.

## Para etapas futuras

| Ideia | Requisito principal |
|---|---|
| Dono da sala | O servidor deverá reconhecer a primeira pessoa como dona e verificar cada ação administrativa. Também precisamos definir o que acontece quando ela sai ou perde conexão. |
| Expulsar e banir | Expulsar a sessão atual pode usar as identidades existentes. Um banimento duradouro precisa de uma identidade mais difícil de trocar do que fechar o navegador e entrar novamente; contas são uma opção a decidir. |
| Salvar widgets compartilhados para outro dia | Adicionar armazenamento durável e definir quem pode reabrir/editar. Por enquanto, eles somem quando a sala esvazia ou o servidor reinicia. Widgets individuais já ficam no navegador. |
| Widgets da comunidade | Criar isolamento, permissões revogáveis, verificação de origem/autor, revisão e meios de encerrar código problemático antes de aceitar plugins. O catálogo desta versão não executa terceiros. |
| Aplicativo Windows com WASAPI | Retomar o ramo nativo, concluir compilação e testar captura de áudio em Windows real. Este trabalho de layout não confirma que o instalador ou o WASAPI estejam prontos. |

Essas etapas futuras não são necessárias para experimentar o canvas com widgets
nativos. Para publicar a atualização atual, a prioridade é concluir os testes visuais
e de mídia indicados acima.
