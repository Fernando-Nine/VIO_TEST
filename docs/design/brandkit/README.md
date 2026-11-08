# Brandkit do VIO

Pasta **só de consulta**: nunca é servida pelo app nem importada por `src/`. As regras estão no
[Brandbook](../brandbook/README.md).

- `logo/`, `ponto/`, `icone-app.svg`: arquivos da marca.
- `paleta.css`, `paleta.json`: tokens reais de `styles.css` e, separados, os propostos.
- `index.html`: página de consulta. Sem fontes de terceiros: carrega Bricolage e IBM Plex Mono de
  `node_modules/@fontsource*` (rode `npm ci` na raiz); sem eles, usa a fonte do sistema.
