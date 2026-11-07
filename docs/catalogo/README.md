# Catálogo técnico do VIO

O que o VIO usa hoje, tema por tema: como funciona, com que números e onde está no código; o que
o mercado faz em cada tema (pesquisa de nov 2026) e se já fazemos igual; e o que achamos de errado
ou de velho no caminho. Feito para agentes, copiloto e revisores (`goldfish`) acharem rápido o que
existe. Para a versão explicada, sem código, leia o [GUIA](GUIA.md).

> **Retrato:** commit `8bdc516` da `main` do VIO_TEST, 5 nov 2026 (prévia `2.12.0-rc.6`, produção
> `2.11.0`). Cada ficha diz de quando é.

## Fichas

| Ficha | Tema |
| --- | --- |
| [01](01-salas-identidade-presenca.md) | Salas, identidade e presença: token, cargos, porta, convite, limpeza |
| [02](02-conexao-e-reconexao.md) | Conexão e reconexão: socket, `epoch`, grace de 90 s, sair e voltar (#286) |
| [03](03-webrtc-e-sinalizacao.md) | WebRTC e sinalização: malha P2P, negociação, ICE, codecs, TURN |
| [04](04-captura-tela-e-audio.md) | Captura: microfone, portão de voz, câmera, tela e som da tela |
| [05](05-telas-e-reproducao.md) | Telas e reprodução: assinar, assistir, volume, tela cheia, PiP |
| [06](06-canvas-widgets-e-notas.md) | Canvas e widgets: layout do aparelho, widgets da sala, chat |
| [07](07-cliente-e-interface.md) | Cliente e interface: React, telas do app, estado, movimento, service worker |
| [08](08-servidor-protocolo-seguranca.md) | Servidor, protocolo e segurança: rotas, CSP, limites, logs |
| [09](09-hospedagem-deploy-release.md) | Hospedagem, deploy, build e release: Render, Docker, VIO_TEST → VIO |
| [10](10-app-windows.md) | App Windows (Tauri 2): captura nativa, WASAPI, atualização, canais |
| [11](11-testes-e-ci.md) | Testes e CI: `node --test`, BrowserLab, workflows |
| [Mapa](mapa.md) | Onde está cada pasta e arquivo, o que faz e quem chama quem |
| [Dependências](dependencias.md) | Cada pacote do `package.json` e do `Cargo.toml` e para que serve |
| [GUIA](GUIA.md) | Versão explicada: conceitos, por que é assim, o que pode vir depois |

## Como usar

- **Antes de varrer o código ou mandar um crawler, consulte o catálogo (mapa + ficha).** Crawler só
  para o que o catálogo não responde; o que ele achar de novo entra na ficha.
- Comece pelo [mapa](mapa.md) para achar o arquivo; depois leia só a ficha do tema da tarefa e as que ela aponta; não leia o catálogo inteiro.
- O código manda. A ficha é um retrato: `~L123` é dica, procure pela função.
- Caminho curto (`rooms.ts`, `media/capture.ts`, `shell.rs`) fica em `src/server/`,
  `src/client/`, `src/shared/` ou `src-tauri/src/`.
- Mudou algo que uma ficha descreve? Atualize a ficha no mesmo PR. Achado resolvido sai da tabela
  e deste README no mesmo PR (o PR cita o ID); o ID não volta a ser usado.
- Ao fechar cada versão MINOR, o QA revisa por inteiro as fichas que a versão tocou e troca o
  commit do **Retrato** delas.
- Achado não é tarefa: vira issue na triagem do copiloto.

## Formato de uma ficha

Cabeçalho com **Resumo**, **Arquivos-chave**, **Docs** e **Retrato**, depois estas seções:

1. **Como funciona hoje:** passo a passo, cada passo com onde está no código.
2. **Números:** parâmetros, limites e tempos (`Parâmetro | Valor | Onde`).
3. **Peças e técnicas:** o que cada peça faz e onde está.
4. **Mercado (pesquisa nov 2026):** `Método | Resolve | No VIO | Custo | Recomendação`, com as
   fontes no fim.
   - No VIO: `sim`, `parcial` (diz o que falta) ou `não`.
   - Custo: `código nosso`, `dependência nova` (exige aval do usuário) ou `pago` (só quando o VIO
     gerar receita ou abrir ao público, ADR 017).
   - Recomendação: `manter`, `adotar`, `depois` (com o motivo) ou `não vale`. O que podemos
     escrever nós mesmos vem antes.
5. **Achados:** `ID | Achado | Tipo | Confiança | Onde`; ID `NN.k`, do mais grave ao menos grave.
   Tipo: `bug`, `risco`, `lacuna`, `desempenho`, `código morto` ou `doc desatualizado`.
   Confiança: alta, média ou baixa.
6. **Perguntas em aberto:** o que o código não deixa claro.

Algumas fichas têm seções a mais (rotas, CSP, logs, protocolo, widgets, testes). Afirmação sem
prova leva "(não confirmado)". Doc antigo é resumido e apontado; divergência com o código vira
achado. Tema novo: ficha `12-…` no mesmo formato e uma linha na tabela acima.

## Formatação

A pasta fica fora do Prettier (`.prettierignore`): as tabelas são largas, e o alinhamento de
colunas do Prettier deixaria os arquivos ~70% maiores, e agentes os leem a cada consulta. Ao
editar:

- tabela compacta (`| --- |`), com `\|` para barra vertical dentro de código numa tabela;
- linha em branco antes e depois de título, tabela e lista;
- linha de parágrafo quebrada não começa com `+ `, `* `, `# ` ou `1. ` (vira lista ou título);
- código entre crases não quebra de linha.

## Principais achados

Do mais urgente ao menos; o detalhe está na ficha.

- **#286, "reconectando" que não some:** fechar a aba ou recarregar não avisa o servidor, e a
  pessoa fica 90–100 s como reconectando, com telas e voz listadas (02.1); o `leave` se perde
  quando o socket não está conectado (02.2); aba duplicada fica reconectando para sempre (02.3);
  publicações de quem caiu sobram como transmissões mortas (02.4); ninguém é avisado quando
  alguém cai (02.5). Ver [02](02-conexao-e-reconexao.md).
- **Consentimento no app Windows (10.1):** um script na origem do app pode capturar tela e som
  sem diálogo nativo; a recomendação é confirmar no Rust antes de capturar.
- **App Windows e anti-cheat (10.2, 10.3):** o app não injeta código no jogo, mas `PrintWindow`
  manda mensagem à janela do jogo no Windows 10, e a captura pode dar tela preta em tela cheia
  exclusiva; falta parecer e teste com jogo protegido. O loopback por processo é liberado desde o
  build 19041, e a Microsoft o documenta só a partir do 20348.
- **Toast e movimento reduzido (07.1):** com movimento reduzido pelo sistema, o toast nunca fecha
  sozinho; pelos Ajustes, fecha na hora.
- **Microfone (04.3):** `changeMicrophone` grava a preferência antes de abrir o aparelho; se a
  abertura falha, a preferência aponta para o microfone que não abriu.
- **Release (09.1):** `sw.js` fixa `vio-static-2.6.0`, e `check-deployment.mjs` falha em qualquer
  outra versão; ninguém vê porque o script não roda na CI (11.2, #21).
- **CI do Windows (10.4):** mudar `scripts/desktop-channel.mjs` não dispara o build do app.
- **Sala e convite (01.1, 01.3):** sala trancada que esvazia volta destrancada por até 300 s;
  convite revogado volta a valer depois de reinício do servidor.
- **Negociação (03.2):** `restart` que chega com o dono em `have-local-offer` se perde; só o timer
  tenta de novo, em até 30 s.
- **Código morto:** a multitela antiga e a prévia barata sem consumidor (05.1, 05.2: o ajuste
  "Prévias ao vivo" é botão morto), `src/server/notes.ts` (01.11) e a entrada `canvas` do registro
  de widgets (06.6).
- **Docs velhos:** `DESKTOP-WASAPI.md` (04.4, 10.8), `CANVAS.md` (06.1–06.5), `MULTITELAS-UX.md`
  (05.3), `DEPLOY.md` (09.5), `VALIDACAO.md` (11.6), `ARVORE.md` (07.9), `SEGURANCA.md` (01.10,
  02.13, 08.5), `WINDOWS.md` e `WINDOWS-RELEASE.md` (10.9, 10.10).
- **Testes:** nenhum teste de mídia real na CI (11.1, #22); Prettier fora da CI (11.3, #20);
  nenhum teste cobre o grace e o `clean` (02.10).
- **Decisão aberta (07.11):** o navegador ainda salva Recentes que só o app mostra; falta decidir
  se ele para de salvar.

## Mercado: o que já usamos e o que falta

Resumo das tabelas **Mercado** das fichas.

- **Já usamos (manter):** token HMAC sem banco, reentrada idempotente com `epoch`, recuo
  exponencial com variação; ofertante único com `round`, `connectionState`, teto de envio da
  malha; `setSinkId`, desbloqueio de autoplay, Document PiP, demanda por tamanho na tela; dnd-kit e
  arrasto pelo teclado; `lazy`/`Suspense` e regiões vivas; Helmet, CSP, zod e limites por chave; no
  app, WGC sem borda, loopback por processo, buffer compartilhado, capabilities do Tauri e
  atualização com minisign; Render Free.
- **Adotar agora (código nosso):**
  - saída e queda, para a #286: `pagehide` e `visibilitychange`, `sendBeacon` ou `fetch` com
    `keepalive` numa rota de saída, tolerância curta para saída explícita e longa para queda,
    `freeze`/`resume` e `pageshow`, aba duplicada pelo `BroadcastChannel` ([01](01-salas-identidade-presenca.md),
    [02](02-conexao-e-reconexao.md));
  - mídia: ICE restart só depois de falha (nunca na primeira conexão), restart pendente,
    `contentHint` e as opções novas do `getDisplayMedia` (`selfBrowserSurface`,
    `surfaceSwitching`, `restrictOwnAudio`), `getStats` com `qualityLimitationReason`, TURN
    conferido na porta 443 ([03](03-webrtc-e-sinalizacao.md), [04](04-captura-tela-e-audio.md));
  - interface: movimento reduzido sem depender de `animationend`, nome do cache do service worker
    por build, seletores com `useSyncExternalStore`, View Transitions na #261
    ([07](07-cliente-e-interface.md));
  - segurança e qualidade: consentimento nativo no app (10.1), Dependabot ou OSV-Scanner, Prettier
    na CI (#20), aviso de carga da malha a partir de 6 pessoas (01.4);
  - TURN gerenciado da Cloudflare (1.000 GB/mês grátis, #135) e uma decisão sobre as miniaturas:
    religar ou apagar (05.2).
- **Com aval do usuário:** Playwright com mídia falsa (dependência nova, #22); SignPath, assinatura
  grátis para código aberto, ao abrir ao público.
- **Depois:** codecs e qualidade (VP9 ou AV1, SVC, Opus estéreo com FEC e DTX, RED,
  `degradationPreference`, prioridade de rede), coturn próprio, supressão de ruído (RNNoise) e
  detecção de voz (Silero VAD), push-to-talk, controle da aba capturada, React Compiler, tema
  escolhido, mudança otimista com rebase, Redis ou Valkey, SBOM, VM grátis própria, GlitchTip e
  Uptime Kuma, cobertura, axe e testes de carga, codificação por hardware no app, winget ou MSIX;
  o que é pago (assinatura comercial, hospedagem paga) só quando houver receita.
- **Não vale:** _perfect negotiation_ (só o dono oferece), simulcast (sem SFU), Connection State
  Recovery do Socket.IO, presença como serviço, CRDT, Region e Element Capture, gancho no jogo
  (anti-cheat), Durable Objects (reescreveria `rooms.ts`), trocar de hospedagem agora.
