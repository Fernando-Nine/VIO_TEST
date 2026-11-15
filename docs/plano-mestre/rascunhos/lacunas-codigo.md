# Lacunas do código para o VIO público (levantamento de 15 nov 2026)

Legenda: esforço P/M/G; **Bloqueia** = impede abrir ao público. Evidência por arquivo:linha ou ficha do catálogo.

## 1. Escala do servidor
| Hoje | Falta | Evidência | Esf. | Bloqueia |
| --- | --- | --- | --- | --- |
| Estado todo em memória, 1 instância (`numInstances: 1`), Socket.IO sem adapter (nenhum `createAdapter`/redis em `src/server`) | Estado externo ou adapter para 2+ instâncias; hoje só escala na vertical | `render.yaml`, `src/server/rooms.ts` | G | Sim, acima de algumas centenas de pessoas |
| Deploy/restart: SIGTERM fecha e sai (25 s); salas e widgets caem, cliente reconecta e recria | Persistência ou handoff de salas; convite revogado volta a valer após reinício (01.3) | `src/server/index.ts:14-24`; catálogo 02 L176; 01.3 | M | Parcial (degradação a cada deploy) |
| Tetos: 200 salas globais, 20 sockets/IP, 60 handshakes/min/IP, sem teto de pessoas por sala (só aviso em 6) | Limite de criação de sala por IP (S-02/#376); mapas que só crescem (S-17) | `config.ts:183-185`; `rooms.ts:761`; `rooms.ts:215` | P | Sim (S-02) |
| Render Free: dorme após 15 min, ~1 min para acordar, 750 h/mês | Plano pago ou VM sempre ligada; produção também no Free | `docs/DEPLOY.md:72`; `render.yaml` | P (custo) | Sim |

## 2. Mídia
| Hoje | Falta | Evidência | Esf. | Bloqueia |
| --- | --- | --- | --- | --- |
| Malha P2P, 1 PeerConnection por (publicação, espectador, tier); teto de envio 8 Mbps dividido entre quem assiste, piso 300 kbps | SFU para salas grandes (excluída do escopo); limite prático ~6 | `media/peers.ts`; `video-quality.ts` (`splitBudget`); catálogo 03 L129 | G | Só se a meta for salas > 6 |
| Qualidade adaptativa por demanda do espectador (`setParameters`), sem simulcast/SVC | Adaptação por rede medida (BWE) e simulcast | `video-quality.ts:20-46` | M | Não |
| TURN: 3 caminhos (estático, coturn, Cloudflare); STUN do Google por padrão; conectividade real via TURN entre redes **não comprovada** (03.7); #135 aberto, credencial estática (S-08) | Provedor definido, teste real, cota/monitoramento de banda | `docs/TURN.md`; `config.ts:193`; revisão S-08 | M | **Sim** (sem TURN, 10-20% das pessoas não conectam) |
| Prévia barata inalcançável (ScreenPicker sem uso, 05.2) | Religar ou remover | catálogo 05 L207-208 | P | Não |

## 3. Observabilidade
| Hoje | Falta | Evidência | Esf. | Bloqueia |
| --- | --- | --- | --- | --- |
| Log JSON só de início/fim/erros TURN; `/healthz` devolve ok e versão | Métricas (salas, pessoas, bytes, erros), contador de conexões, painel | `index.ts:11,18`; `rooms.ts:179-198`; `app.ts:72` | M | Sim |
| Rastreio de erros do cliente, telemetria de produto, alertas: não encontrado (zero Sentry/analytics/metrics em `src`) | Coleta mínima sem dados pessoais, alerta de queda | grep em `src` | M | Sim (voo cego em produção) |
| Sem tratador de erro global do Express (S-20) | Handler + log | `app.ts` (revisão S-20) | P | Não |

## 4. Segurança e abuso
| Hoje | Falta | Evidência | Esf. | Bloqueia |
| --- | --- | --- | --- | --- |
| Revisão nov/2026: 0 P0, 2 P1, 7 P2, 11 P3, nenhum corrigido ainda | S-01 timers de enquete sem limite (derruba por memória) #375; S-02 um IP ocupa as 200 salas #376 | `docs/seguranca/revisao-2026-11.md:38-74` | P | **Sim** |
| P2: credencial de sala portadora e sem invalidação (S-03), mute só da voz (S-04), criador restaura widget moderado (S-05), `guestEdit` amplo (S-06/S-07), TURN estático (S-08), TRUST_PROXY a conferir (S-09) | Correções #377 | revisão L76-152 | M | S-03/S-09 sim |
| Moderação: sem expulsar terceiros, sem banir, sem denunciar, sem bloquear (decisão para grupos de confiança) | Expulsar/banir por sessão, denúncia, log de moderação; recusado contorna bloqueio de 1 min com nova sessão (01.5) | `docs/SEGURANCA.md:55`; catálogo 01 L243 | M-G | **Sim** (exposição a estranhos) |
| Antispam #357 aberto; limite por identidade é barato de trocar (token anônimo) | Limites por IP/dispositivo, proof-of-work ou conta | `ESTADO.md:31`; revisão "Regras quebradas" | M | Sim |
| CSP com `style-src 'unsafe-inline'`; caracteres invisíveis aceitos (S-16); convite na query string (S-13); `NODE_ENV` único define produção (S-11) | Endurecer | `app.ts:28`; `client/endpoint.ts:48`; `config.ts:49` | P | Não |
| Actions sem SHA fixo e chave de assinatura em build de PR (S-12) | Fixar SHAs, isolar segredo | `.github/workflows/windows.yml:48-86` | P | Antes de assinar de verdade |

## 5. Contas, banco, pagamentos
| Hoje | Falta | Evidência | Esf. | Bloqueia |
| --- | --- | --- | --- | --- |
| Nenhum banco, conta, login ou pagamento (só plano em `docs/planos/banco-e-contas.md`, hospedagem não decidida) | Banco, login, sessão, cobrança (ex.: provedor de pagamento), planos | planos/banco-e-contas.md; `package.json` sem dependência de banco/pagamento | G | Sim para monetizar; não para abrir |
| Identidade = token HMAC anônimo (700 chars, 2 partes), sessão 3600 s, renovada; `known`/`refused` por sessão; credencial de sala 30 dias em `localStorage`; salas por código, sem dono persistente | Vincular conta ao token sem quebrar anônimos; dono de sala persistente; reputação/ban por conta | catálogo 01 L31, L240-243; `config.ts` `sessionTtl`; cliente `vio:session`, `vio:room-credentials` | G | Não, mas toca ~tudo em `rooms.ts` (1379 linhas) |

## 6. Jurídico no produto
| Hoje | Falta | Evidência | Esf. | Bloqueia |
| --- | --- | --- | --- | --- |
| Telas de termos, privacidade e aceite de idade: **não encontrado** no cliente (grep "privacidade" em `src/client` e `index.html` vazio). Só `docs/juridico/idade-minima.md` e `termo-instalador.txt` | Termos, política (citar IP visível em P2P), aceite de 13+ e responsável, rodapé/links | `docs/juridico/`; `src/client` | M | **Sim** |
| ECA Digital: autodeclaração não basta, fiscalização intensifica em jan/2027 | Aferição de idade proporcional, decisão do Jurídico | `docs/juridico/idade-minima.md` | G | Sim (risco regulatório) |
| `localStorage`: `vio:name`, `vio:session`, `vio:room`, `vio:room-credentials`, `vio:recent-rooms`, `vio:preferences`, `vio:canvas:v1/v2`, `vio:widgets:closed`, `vio:ducking`, `vio:invite-ttl`, `vio:share`, `vio:catalog-tab`, `vio:poll-chart`, `vio:raffle-wheel` | Aviso/consentimento (hoje só necessários), "apagar meus dados" local | `grep vio:` em `src/client` | P | Não |
| Exclusão de dados no servidor: nada persiste, sala expira em 300 s vazia | Fluxo de exclusão só quando houver conta | `config.ts` `ROOM_TTL_SECONDS` | - | Não hoje |

## 7. App Windows e celular
| Hoje | Falta | Evidência | Esf. | Bloqueia |
| --- | --- | --- | --- | --- |
| Tauri (`src-tauri`, `@tauri-apps/cli`), instalador NSIS por usuário, atualização assinada com canal próprio (teste/produção), CI `windows.yml` | Assinatura de código (decisão: só ao abrir ao público; SmartScreen avisa), Microsoft Store, captura de áudio nativa documentada desatualizada (`DESKTOP-WASAPI.md`) | `docs/WINDOWS.md:20-21`; `WINDOWS-RELEASE.md:12-16,89`; catálogo 04 L16 | M (custo do certificado) | Sim para app confiável |
| Celular: PWA com `manifest.webmanifest`, ícones 192/512/maskable, `sw.js`; app nativo "a definir"; captura de tela inexistente em iOS | Teste real em aparelho pequeno, decisão de app nativo | `public/`; `ESTADO.md:89` | M-G | Não |

## 8. Testes e CI
| Hoje | Falta | Evidência | Esf. | Bloqueia |
| --- | --- | --- | --- | --- |
| 44 arquivos `*.test.ts` (~218 casos `test/it`), node:test com servidor real; CI: typecheck, test, `npm audit --audit-level=high`, build, diff do CHANGELOG | Sem cobertura (nada de coverage no `package.json`); sem teste de carga/soak do servidor | `ci.yml:25-31`; `package.json` scripts | M | Não |
| Vitrine Playwright (layout em 5 telas, workflow separado); bancada de mídia `test:media` e Labs `tests/*Lab.tsx` só manuais, fora da CI | e2e de entrar, trocar de sala e transmitir; mídia real entre redes (TURN) só humano na prévia | `vitrine.yml`; `package.json` `test:media`; catálogo 04.5 | G | Não |
| `prettier` sem passo na CI | Lint/format na CI | `dependencias.md` | P | Não |

## 9. Dívida técnica
- Maiores arquivos (linhas): `workspace.css` 3588, `RoomCanvas.tsx` 2053, `room/controller.ts` 1922, `styles.css` 1773, `server/rooms.ts` 1379, `landing.css` 1243, `App.tsx` 1140, `ModuleWidget.tsx` 1009, `Settings.tsx` 892, `canvas/model.ts` 844, `finish.css` 826, `room.css` 820, `media/peers.ts` 668, `shared/releases.ts` 664, `preferences.css` 632. Servidor total 2517 linhas. Esforço de dividir `controller.ts`/`rooms.ts`/`RoomCanvas.tsx`: G.
- TODO/FIXME em `src` e `tests`: 0 (a dívida está nos catálogos, não nos comentários).
- Código morto: `ScreenStage.tsx`, `screen-layout.ts`, `ScreenPicker.tsx`, `controller.arrangeScreens` (05.1); entrada `canvas` do registro e restos de `notes` (06.6, 06.7); `time`/`notes` somem em silêncio ao restaurar (06.8). Esf. P.
- `any` solto em `peers.ts` `stats` (03.8); regra de cargo duplicada `role()`/`roomRole()` (01.12); comentários em português em `config.ts`/`app.ts`/`rooms.ts`.
- Documentação desatualizada: `DESKTOP-WASAPI.md`, `MULTITELAS-UX.md`, `ARVORE.md`, `CANVAS.md`.
- Dependências: lista curta e atual (React 19, Express 5, Vite 8, zod 4); `@dnd-kit/react` 0.5.0 é pré-1.0 (risco de API), `lucide-react` ^1.x. Retrato de `dependencias.md` é de 5 nov; sem Dependabot encontrado.

## 10. Produto
| Item | Estado | Evidência |
| --- | --- | --- |
| i18n | Só português: `lang="pt-BR"`, `Intl` fixo em pt-BR, sem biblioteca de tradução | `index.html:2`; `header-tools.tsx:66` |
| Acessibilidade | ~458 usos de `aria-` em `.tsx`; modo de movimento reduzido existe; sem auditoria WCAG registrada | grep `aria-` em `src/client` |
| Onboarding | Tela inicial só no app (#285); nenhum tutorial de primeira sala encontrado | `changes/285-home-so-no-app.md` |
| Landing e download | `Landing.tsx` com botão de download do instalador (estável vs. "VIO Teste"); sem página de download própria | `Landing.tsx:21-26` |
| SEO | `index.html` tem `description`; `robots.txt`, `sitemap`, og: não encontrados | `index.html:11`; `public/` |
