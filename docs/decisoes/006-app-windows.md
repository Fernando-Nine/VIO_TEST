# 006 — App Windows e vio-releases

Data: 2026-10-24

## Contexto

O navegador limita a captura de áudio e a experiência fora da aba.

## Decisão

- O app Windows é a próxima plataforma; celular depois. Base em `docs/DESKTOP-WASAPI.md`.
- O usuário testa já com a captura de áudio WASAPI.
- Instaladores ficam no repositório público Fernando-Nine/vio-releases (GitHub Releases), também
  usado pelo atualizador automático. Assinatura de código só ao abrir ao público.

## Motivo

Áudio por programa e transmissão sem borda só são possíveis fora do navegador; um repositório
público separa os binários do código.

Não rediscutir sem o usuário.
