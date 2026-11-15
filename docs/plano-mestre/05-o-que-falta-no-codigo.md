# 5. O que falta no código

Lista fechada, por bloco, do que o código precisa ganhar em cada fase de
[02](02-fases-e-ordem.md). Detalhe e evidência (arquivo e linha) em
[`rascunhos/lacunas-codigo.md`](rascunhos/lacunas-codigo.md). Tamanho: **P** até 2 dias de uma área,
**M** até 2 semanas, **G** mais de 2 semanas ou mais de uma área. Itens sem issue ganham issue
quando a fase começar, não antes.

## A. Para o alpha fechado (fase 1)

Nada aqui custa dinheiro. Tudo é pré-requisito para convidar gente de fora do grupo de amigos.

| #   | O que                                                                 | Área     | Tam. | Issue        |
| --- | --------------------------------------------------------------------- | -------- | ---- | ------------ |
| A1  | Fechar os 4 bugs P1 (cursor, Baixar, Flutuante, áudio da tela)        | Mídia/FE | M    | #266 #268 #280 #344 |
| A2  | TURN por um caminho só, comprovado com `forceRelay` na prévia         | Mídia    | M    | #25 #135     |
| A3  | Teto de salas por IP (S-02)                                           | Backend  | P    | #376         |
| A4  | Fechar os P2 de segurança (S-03 a S-09)                               | Backend  | M    | #377         |
| A5  | **Medição mínima sem dado pessoal**: contadores no servidor (salas abertas, pessoas por sala, duração, falhas de conexão, uso de relay) expostos em rota protegida | Backend  | M    | nova         |
| A6  | **Captura de erro do cliente** para o próprio servidor (código do `Fault`, versão, sem nome nem sala) | FE/BE    | P    | nova         |
| A7  | Medir memória e CPU por pessoa conectada (teste de carga simples)     | QA       | M    | nova         |
| A8  | Botão "contar um problema" dentro da sala (texto livre + versão)      | Frontend | P    | nova         |
| A9  | Aviso curto de alpha na entrada (o que é, que pode cair, 18+)         | FE/Jur.  | P    | nova         |
| A10 | Prettier na CI e vitrine de telas rodando em PR                       | QA       | P    | #20 #269     |

A5–A7 são o que transforma as estimativas de [03](03-custos.md) e [04](04-financas.md) em números.
Sem elas, o alpha não ensina nada.

## B. Para abrir ao público (fase 2): os 9 bloqueios vistos do código

Cada bloqueio de [02](02-fases-e-ordem.md#os-9-bloqueios-da-abertura) e o que ele pede em código.

| Bloqueio            | O que falta no código                                                                                           | Área    | Tam. |
| ------------------- | --------------------------------------------------------------------------------------------------------------- | ------- | ---- |
| 1 Conexão           | A2 em produção; credencial TURN de curta duração (S-08); indicador de "conectado por relay" na medição          | Mídia   | M    |
| 2 Moderação         | Expulsar de forma durável (por identidade HMAC, não por socket), banir da sala, bloquear pessoa (local), silenciar que cubra tela e widgets (S-04) | BE/FE   | G    |
| 3 Denúncia          | Botão de denúncia na sala e na landing → canal que o fundador lê; encerrar sala por ordem do operador; registro mínimo da denúncia | BE/FE   | M    |
| 4 Antiabuso         | #357 (antispam e limites), teto por sala configurável, limite de criação por IP e por identidade, desafio leve (prova de trabalho ou captcha próprio) só sob ataque | Backend | M    |
| 5 Idade             | Tela de entrada 18+ com bloqueio (ou chamada ao verificador, conforme a decisão D1)                             | FE/Jur. | P–M  |
| 6 Documentos        | Rotas `/termos`, `/privacidade`, `/diretrizes`, `/direitos-autorais`; aceite gravado no aparelho com versão do texto; link no rodapé e no app Windows | FE      | M    |
| 7 Servidor acordado | Sair do Free; deploy que avisa a sala antes de cair e reconecta sozinho (hoje o deploy derruba tudo); `/healthz` monitorado de fora | BE/QA   | M    |
| 8 Medição           | A5–A6 em produção + painel simples + alerta (queda, erro em pico, memória)                                      | BE/QA   | P    |
| 9 Porta de entrada  | Landing pública (#197), página de download própria, `robots.txt`, sitemap, og:, primeira experiência guiada (onboarding de 3 passos) | Design/FE | M  |

Fora dos 9, mas no mesmo pacote: fixar SHA das Actions e tirar a chave de assinatura de build de
PR (S-12) **antes** de divulgar o instalador; convite fora da query string (S-13).

## C. Para contas, apoio e receita (fase 3)

Só começa com os avais de [banco e contas](../planos/banco-e-contas.md) (D3–D5).

| #   | O que                                                                        | Área    | Tam. |
| --- | ---------------------------------------------------------------------------- | ------- | ---- |
| C1  | Banco (Postgres) + migrações + cópia de segurança testada                    | Backend | M    |
| C2  | Login por Discord e Google, conta opcional, vínculo com a identidade HMAC    | BE/FE   | G    |
| C3  | Exportar e apagar a própria conta (LGPD) na tela de Ajustes                  | BE/FE   | M    |
| C4  | Apoio: webhook do provedor de pagamento → marca "apoia" na conta; sem guardar cartão | Backend | M    |
| C5  | Benefícios de quem apoia (cosméticos, temas, selo, salas com nome fixo)      | FE/Design | M  |
| C6  | Banimento por conta (além de por sala) e histórico de denúncias              | Backend | M    |
| C7  | Guarda de registros de acesso, **se** a decisão D7 mandar                    | Backend | P    |

Benefício pago **nunca** é função básica (tela, voz, widgets, tamanho da sala): ver
[04](04-financas.md#o-que-se-vende).

## D. Para escalar (fase 4, puxado por medição)

Nenhum item daqui começa por calendário; cada um tem gatilho medido.

| #   | O que                                                        | Gatilho                                              | Tam. |
| --- | ------------------------------------------------------------ | ---------------------------------------------------- | ---- |
| D1  | Estado de sala fora da memória (Redis) + adapter do Socket.IO + 2ª instância | Memória > 70% de uma instância, ou deploy virando queixa | G    |
| D2  | Região São Paulo para sinalização                             | Latência de sinalização medida > 250 ms na mediana   | M    |
| D3  | Simulcast ou SVC para o dono da tela                          | Queixa medida de qualidade em salas de 5+            | G    |
| D4  | SFU **opcional** para salas grandes (reabre "Sem SFU")        | Demanda paga comprovada por salas de 10+             | G    |
| D5  | Tradução (estrutura de i18n; inglês e espanhol)               | > 15% das visitas de fora do Brasil                  | G    |
| D6  | App de celular                                                | Depois do Windows estável; iOS não captura tela, então é app de **assistir e falar** | G |
| D7  | Clips no aparelho (#208, decisão 007)                         | Depois da fase 2; é função de divulgação             | M    |

## E. Dívida (contínua, 1 item por bloco de trabalho)

Regra: **cada bloco de função nova paga um item de dívida da mesma área.** Ordem sugerida:

1. Apagar o código morto (`ScreenStage.tsx`, `screen-layout.ts`, `ScreenPicker.tsx`,
   `controller.arrangeScreens`) e arquivar os 5 documentos desatualizados. P.
2. Dependabot (ou equivalente) e SHA fixo nas Actions. P.
3. Quebrar `rooms.ts` (1379) por domínio antes da moderação (bloqueio 2 mexe nele). M.
4. Quebrar `controller.ts` (1922) antes de contas. M.
5. Quebrar `workspace.css` (3588) junto com a consolidação da fase 3 de design. M.
6. Quebrar `RoomCanvas.tsx` (2053) antes do onboarding. M.
7. Cobertura de teste medida (sem meta rígida; meta é não cair). P.
8. Auditoria WCAG AA das telas principais (#369). M.
9. Tirar `style-src 'unsafe-inline'` da CSP. M.
10. Decidir `@dnd-kit/react` (pré-1.0): fixar versão e ter plano de troca. P.

## O que **não** entra

- Gravação no servidor, salas públicas listadas, mensagens diretas, feed, perfis públicos: mudam a
  natureza jurídica e o custo de moderação do produto. Fora do plano até a fase 4 reabrir.
- Reescrever em outra pilha. O núcleo está validado.
- SFU por padrão. Só o D4, opcional e pago.
