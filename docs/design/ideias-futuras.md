# Ideias futuras (Design)

Lista curta do que ficou para depois. **Decisão** = já aprovada pelo usuário ou pelo
copiloto; **ideia** = proposta, ainda sem aval. Plano de referência: comentário do
copiloto na [#168](https://github.com/Fernando-Nine/VIO_TEST/issues/168).

## Ajustes: categorias futuras

Regra (**decisão**): só aparece categoria que já funciona; a lista já nasce em grupos para
cada nova entrar no lugar.

| Grupo    | Categoria                      | Status  | Quando                                                                  |
| -------- | ------------------------------ | ------- | ----------------------------------------------------------------------- |
| App      | Áudio (Voz + Saída), Vídeo     | decisão | agora (#163)                                                            |
| App      | Notificações (com os sons)     | decisão | agora (#163)                                                            |
| App      | Aparência, Acessibilidade      | decisão | agora (#163)                                                            |
| App      | Aplicativo (versão, novidades) | decisão | agora (#163); no app Windows, vira **Sistema**                          |
| App      | Idiomas                        | decisão | cedo, só precisa de i18n                                                |
| Sala     | Convite, permissões, posse     | decisão | agora                                                                   |
| Avançado | Desenvolvedor (escondido)      | decisão | cedo: versão, ping, `getStats`, copiar diagnóstico; nunca token nem SDP |
| Usuário  | Conta, Privacidade, Sair       | decisão | junto com contas (adiadas); Privacidade inclui apagar e exportar dados  |
| Usuário  | Amizades, Apps conectados      | decisão | depois de Conta                                                         |
| Cobrança | Assinaturas, Cobranças         | decisão | com a monetização                                                       |

Desenho (**decisão**, #163): lateral com rótulos de grupo; rodapé da lateral reservado para
Usuário e "Sair".

### Divergências entre o plano (#168) e a spec `ajustes.md`

- **Nome do grupo** (**decisão** do copiloto, 27 out): **Configurações**, como na spec
  aprovada; evita "App" em inglês e o choque com a categoria Aplicativo. "App" na tabela
  acima é só o rótulo interno do grupo.
- **Vídeo separado de Áudio**: os dois concordam (Vídeo é categoria própria). Áudio fica
  com os grupos internos Voz e Saída.
- **"Aparência e sons"**: o plano ainda usa esse nome; a spec já separou (sons foram para
  Notificações). Vale a spec.
- **Atalhos**: o plano lista como categoria do App; a #168 põe dentro de **Aplicativo**.
  **Decisão**: seção "Atalhos" dentro de Aplicativo; vira categoria própria só quando
  passar de ~6 atalhos.
- **Acessibilidade** e **Aplicativo**: **decisão**: entram no grupo Configurações.
- **Sair**: o plano põe em Usuário; a spec, no rodapé da lateral. Compatível: o rodapé
  é a parte de baixo do grupo Usuário.

## Ajustes: itens novos (#168)

Todos **decisão** como base; viram issue própria quando o copiloto priorizar.

- Aperte para falar, com tecla configurável (Áudio; Mídia).
- Testar microfone: grava 5 s e toca só para você (Áudio).
- Entrar nas telas com som ou mudo (Áudio).
- Espelhar minha câmera, só na exibição local (Vídeo).
- Tamanho da interface (Aparência).
- Atalhos: lista editável com Microfone, Desativar áudio, Aperte para falar e Tela cheia.

## Várias transmissões ao mesmo tempo

- **Decisão** (#160): com mais de uma transmissão sua, o cabeçalho de Minha transmissão
  ganha o seletor "‹ 1/2 ›"; ele só troca o que o widget mostra, nada muda no envio.
- **Ideia**: deixar a mesma pessoa transmitir tela + janela juntas. Depende de Mídia
  (custo P2P dobra para quem assiste) e de um limite por pessoa no servidor.
- **Ideia**: no seletor, menu do botão direito com o nome de cada fonte, além das setas.
