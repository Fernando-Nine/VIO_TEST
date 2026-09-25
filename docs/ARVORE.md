# Estrutura do projeto

Dependências instaladas, arquivos compilados e segredos locais não fazem parte do
pacote de código-fonte. O build produz `dist/client`, `dist/server/index.js` e
`dist/source.tar.gz`.

| Caminho | Responsabilidade |
|---|---|
| `.dockerignore` | Configuração, licença ou guia inicial |
| `.env.example` | Configuração, licença ou guia inicial |
| `.gitignore` | Configuração, licença ou guia inicial |
| `.nvmrc` | Configuração, licença ou guia inicial |
| `CHANGELOG.md` | Configuração, licença ou guia inicial |
| `Dockerfile` | Configuração, licença ou guia inicial |
| `ESTADO-DO-PROJETO.md` | Configuração, licença ou guia inicial |
| `LICENSE` | Configuração, licença ou guia inicial |
| `README.md` | Configuração, licença ou guia inicial |
| `compose.yaml` | Configuração, licença ou guia inicial |
| `docs/ARVORE.md` | Documentação |
| `docs/DEPLOY.md` | Documentação |
| `docs/NAVEGADORES.md` | Documentação |
| `docs/PRD.md` | Documentação |
| `docs/SEGURANCA.md` | Documentação |
| `docs/TURN.md` | Documentação |
| `docs/VALIDACAO.md` | Documentação |
| `docs/evidence/audit-production.json` | Evidência de validação |
| `docs/evidence/build.txt` | Evidência de validação |
| `docs/evidence/media-browser.json` | Evidência de validação |
| `docs/evidence/production-smoke.json` | Evidência de validação |
| `docs/evidence/render-schema.json` | Evidência de validação |
| `docs/evidence/server-tests.txt` | Evidência de validação |
| `docs/evidence/ui-observations.json` | Evidência de validação |
| `docs/evidence/vio-ajustes-mobile-final.jpg` | Evidência de validação |
| `docs/evidence/vio-entrada-final.jpg` | Evidência de validação |
| `docs/evidence/vio-entrada-mobile.jpg` | Evidência de validação |
| `docs/evidence/vio-midia-diagnostico.jpg` | Evidência de validação |
| `docs/evidence/vio-sala-desktop-final.jpg` | Evidência de validação |
| `docs/evidence/vio-sala-mobile.jpg` | Evidência de validação |
| `docs/licenses/IBM-Plex-Mono-OFL.txt` | Licença de terceiros |
| `docs/licenses/Manrope-OFL.txt` | Licença de terceiros |
| `docs/licenses/README.md` | Licença de terceiros |
| `docs/licenses/lucide-react-LICENSE.txt` | Licença de terceiros |
| `docs/licenses/react-LICENSE.txt` | Licença de terceiros |
| `docs/licenses/react-dom-LICENSE.txt` | Licença de terceiros |
| `docs/licenses/socket.io-client-LICENSE.txt` | Licença de terceiros |
| `docs/licenses/zod-LICENSE.txt` | Licença de terceiros |
| `index.html` | Configuração, licença ou guia inicial |
| `package-lock.json` | Configuração, licença ou guia inicial |
| `package.json` | Configuração, licença ou guia inicial |
| `public/favicon.svg` | Identidade pública |
| `render.yaml` | Configuração, licença ou guia inicial |
| `scripts/build.mjs` | Build e empacotamento |
| `src/client/App.tsx` | Interface, captura ou coordenação da sala |
| `src/client/components/Dialog.tsx` | Interface, captura ou coordenação da sala |
| `src/client/components/Media.tsx` | Interface, captura ou coordenação da sala |
| `src/client/components/Settings.tsx` | Interface, captura ou coordenação da sala |
| `src/client/id.ts` | Interface, captura ou coordenação da sala |
| `src/client/main.tsx` | Interface, captura ou coordenação da sala |
| `src/client/media/capture.ts` | Interface, captura ou coordenação da sala |
| `src/client/media/deadline.ts` | Interface, captura ou coordenação da sala |
| `src/client/media/peers.ts` | Interface, captura ou coordenação da sala |
| `src/client/media/sounds.ts` | Interface, captura ou coordenação da sala |
| `src/client/room/controller.ts` | Interface, captura ou coordenação da sala |
| `src/client/styles.css` | Interface, captura ou coordenação da sala |
| `src/client/webmcp.ts` | Interface, captura ou coordenação da sala |
| `src/server/app.ts` | Servidor e validação |
| `src/server/config.ts` | Servidor e validação |
| `src/server/index.ts` | Servidor e validação |
| `src/server/rooms.ts` | Servidor e validação |
| `src/server/security.ts` | Servidor e validação |
| `src/shared/protocol.ts` | Contratos e versão |
| `src/shared/releases.ts` | Contratos e versão |
| `tests/BrowserLab.tsx` | Testes e laboratório sintético |
| `tests/media-runner.ts` | Testes e laboratório sintético |
| `tests/server.test.ts` | Testes e laboratório sintético |
| `tests/synthetic.ts` | Testes e laboratório sintético |
| `tsconfig.json` | Configuração, licença ou guia inicial |
| `vite.config.ts` | Configuração, licença ou guia inicial |

Arquivos adicionados na 2.2.0: `src/client/room.css`,
`src/client/components/FloatingPeople.tsx`, `src/client/components/floating-position.ts`,
`tests/floating-position.test.ts` e `tests/LayoutLab.tsx`. A ilustração do cursor
interativo foi removida; botões usam o ponteiro convencional do navegador.

Módulos da 2.3.0: `src/client/media/video-quality.ts` calcula os parâmetros de envio;
`tests/video-quality.test.ts` cobre resolução e limites de miniaturas, e
`tests/audio-output.test.ts` cobre seleção, remoção de elementos e recuperação da saída.
`public/cursors/vio-hand.svg` acompanha o cursor azul de seta.
