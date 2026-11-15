# Jurídico e burocracia do VIO: do zero à escala

> Orientação, **não é parecer jurídico nem contábil**. Levantado em 15/11/2026.
> "[conf.]" = a confirmar com advogado/contador. Valores de mercado sem fonte oficial vêm como estimativa.
> Quem faz: **U** usuário, **C** contador, **A** advogado, **G** agente (Jurídico/áreas).
> Fontes de lei: planalto.gov.br (o site redirecionou na consulta; conferir o texto no link antes de citar em documento final).

## 0. Quadro-resumo por momento

| Momento | Obrigatório / recomendado | Quem | Custo estimado |
| --- | --- | --- | --- |
| Hoje (amigos) | Nada formal. Manter privacidade por padrão. Aviso de privacidade curto na tela | G | R$ 0 |
| Antes de abrir ao público | Termos de Uso, Política de Privacidade, Política de direitos autorais + canal de denúncia, aviso a responsáveis, atualizar decisão 019 | G redige, A revisa | R$ 0 a R$ 2–5 mil (revisão) [conf.] |
| Antes de cobrar | CNPJ (ME no Simples), conta PJ, NFS-e, termo de apoio/assinatura, CDC (arrependimento, cancelamento fácil), marca no INPI | C, U, A | abertura R$ 0–500 + contador R$ 150–400/mês [conf.] + INPI R$ 880/classe |
| Ao crescer | Contas/banco de dados = guarda de registros (art. 15), CLA, loja Microsoft, certificado de assinatura, DPO opcional | A, G | variável |

## 1. Formalização e tributos

| Ponto | Situação | Fonte |
| --- | --- | --- |
| MEI | Teto R$ 81 mil/ano em 2026 (proposta de R$ 110 mil só em projeto, PLP 186/2026, sem vigência) | https://www.gov.br/empresas-e-negocios/pt-br/empreendedor |
| CNAE de software | 6201-5/01, 6202-3/00 e 6203-1/00 **não** são permitidos ao MEI; MEI não serve para plataforma de software [conf. CNAE exato de "tratamento de dados/hospedagem" e de streaming] | https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/quero-ser-mei/atividades-permitidas |
| ME no Simples | Caminho realista. Serviço de software cai no Anexo V (começa em 15,5%) e migra para o Anexo III (começa em 6%) se a folha incluindo pró-labore for >= 28% da receita (Fator R) | https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp123.htm |
| SLU | Empresa de um só sócio, sem capital mínimo; mesma tributação da ME. Protege o patrimônio pessoal | https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2019/lei/l13874.htm (Lei da Liberdade Econômica) |
| Pró-labore e INSS | Sócio que trabalha precisa de pró-labore (INSS 11%, mínimo = 1 salário mínimo) [conf. valor 2026]; ajuda no Fator R | C |
| NFS-e Nacional | Obrigatória para ME/EPP do Simples desde **1/11/2026** (Res. CGSN 191/2026) [conf. com o contador; fontes divergiram entre set. e nov.] | https://www.gov.br/nfse |
| Reforma tributária | 2026 é teste (CBS 0,9% + IBS 0,1%), **Simples não recolhe em 2026**; 2027 traz campos novos na nota e regime híbrido (LC 214/2025) | https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm |
| Doações como pessoa física | Recebimento recorrente de apoiadores é renda tributável (carnê-leão mensal, tabela progressiva) e não substitui nota fiscal; limites e isenções [conf. com contador] | https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda |
| Custos | Abertura de ME costuma ser gratuita nas juntas (taxas estaduais de R$ 0–400); contador R$ 150–400/mês [estimativa de mercado, conf.] | C |

Recomendação: ao primeiro real cobrado, abrir **ME/SLU no Simples** (C). Até lá, sem monetização, nada a abrir.
Doação antes do CNPJ: evitar plataforma que pague em nome da pessoa física sem orientação do C.

## 2. Marca (INPI)

| Ponto | Situação | Fonte |
| --- | --- | --- |
| O que registrar | "VIO" (nome do produto) e "NerdQuest Studios" (estúdio); depois o logotipo/ponto | https://www.gov.br/inpi/pt-br/servicos/marcas |
| Classes Nice | 9 (software baixável/app), 38 (transmissão, comunicação por voz/vídeo), 41 (entretenimento, eventos online), 42 (SaaS) | https://www.gov.br/inpi/pt-br/servicos/marcas/classificacao |
| Taxa | R$ 880 por classe (R$ 440 com desconto de pessoa física/MEI/ME) com especificação pré-aprovada; R$ 1.720 (R$ 860) com texto livre. Tabela de 20/12/2025 | https://www.gov.br/inpi/pt-br/servicos/marcas/tabela-de-retribuicao |
| Total estimado | 4 classes para "VIO" = R$ 1.760 a R$ 3.520. Priorizar 9 e 42 (R$ 880–1.760) se o orçamento for curto | cálculo sobre a tabela acima |
| Prazo | Registro costuma levar vários anos; o pedido já cria prioridade e permite usar o ® só após a concessão [conf. prazo atual] | INPI |
| Anterioridade | "VIO" é palavra curta e comum: há risco real de marcas idênticas/semelhantes nas classes 9/38/41/42. Busca ficou **sem resultado útil** na pesquisa | **Fazer busca manual** em https://busca.inpi.gov.br antes de pagar (U ou G, grátis) |
| Quem | U deposita no e-INPI (precisa de CNPJ ou CPF); A só se houver oposição | |

## 3. LGPD

Lei 13.709/2018: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm

| Tema | Hoje (sem contas) | Com contas/banco de dados |
| --- | --- | --- |
| Dado pessoal tratado | Apelido em sala, IP (inevitável em WebRTC/TURN), localStorage (preferências). Servidor não grava mídia nem logs pessoais | + e-mail, senha/OAuth, histórico, cobrança, idade |
| Base legal | Execução do serviço (art. 7º, V) e legítimo interesse mínimo (art. 7º, IX) para segurança/limite de abuso | Contrato (V); consentimento (I) para extras; obrigação legal (II) para fiscal e art. 15 |
| Direitos do titular | Fácil de cumprir: não há dado guardado. Dizer isso na política | Canal para acesso, correção, exclusão e portabilidade (art. 18), prazo em dias úteis [conf.] |
| Agente de pequeno porte | Res. CD/ANPD 2/2022: ME/startup/pessoa física tratando dado não de alto risco têm prazos dobrados, **sem encarregado obrigatório** (mas é preciso canal de contato), registro simplificado de operações | https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-aprova-regulamento-para-agentes-de-tratamento-de-pequeno-porte |
| Alto risco | Dado de **criança/adolescente** e tratamento em larga escala tiram o benefício de pequeno porte [conf. A] | Res. 2/2022, art. 3º |
| Registro de operações (ROPA) | Tabela simples (dado, finalidade, base, retenção, compartilhamento) | G faz em `docs/juridico/` |
| Cookies/localStorage | Só armazenamento estritamente necessário e preferências: dispensa banner de consentimento, mas a política deve listar [conf.]. Sem analytics/anúncio sem aviso | https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf |
| Transferência internacional | Render (EUA) hospeda o servidor: IP e metadados saem do Brasil. Res. CD/ANPD 19/2024 (cláusulas-padrão) exige base do art. 33 [conf. A]. Citar o suboperador na política | https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-publica-regulamento-de-transferencia-internacional-de-dados |
| Incidente | Comunicar ANPD e titulares em prazo razoável (Res. CD/ANPD 15/2024: 3 dias úteis) [conf.] | https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-publica-regulamento-de-comunicacao-de-incidente-de-seguranca |
| Custo | Tudo redigível por G; revisão por A é recomendada antes de cobrar | R$ 0 + [advogado depois] |

## 4. Menores: ECA Digital (Lei 15.211/2025)

- Em vigor desde **17/03/2026**, regulamentada pelo Decreto 12.880/2026. Fonte: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15211.htm (conferir artigos no texto; a consulta direta ao site falhou).
- A lei exige do provedor de serviço digital **acessível a menores** mecanismos confiáveis de verificação de idade (autodeclaração sozinha é considerada insuficiente), supervisão/controles para responsáveis, privacidade por padrão para menores, canal de denúncia e remoção de conteúdo e proibição de perfilamento comportamental para publicidade [conf. artigos exatos com A].
- **Efeito na decisão 019** (13+ por autodeclaração): precisa ser reaberta. Autodeclaração só fica defensável se o VIO se declarar **não destinado a menores** e bloquear cadastro/uso <18 sem responsável, ou se adotar verificação de terceiro. Hoje a 019 já prevê verificador antes de abrir ao público: tornar isso **bloqueante** [conf. A].
- Sala aberta por link, voz e tela compartilhada expõem menores a estranhos: o risco de enquadramento é real mesmo sem conta.
- Sanções: advertência, multa de até R$ 50 milhões ou 10% do faturamento, suspensão [conf. valores no texto da lei].
- Ação: decisão do usuário sobre posicionamento (18+ ou 13+ com verificação) antes de abrir; **aviso a pais/responsáveis**; G redige. Custo: R$ 0 (texto) + verificador de terceiro [conf. preço, não pesquisado].

## 5. Marco Civil da Internet (Lei 12.965/2014)

Fonte: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm

| Tema | Regra | Efeito no VIO |
| --- | --- | --- |
| Art. 15 | Provedor de **aplicações** constituído como pessoa jurídica, com atividade organizada e **fins econômicos**, guarda registros de acesso por **6 meses** (sigilo, ordem judicial pode pedir mais) | Hoje (pessoa física, sem fins econômicos): não se aplica. **Com CNPJ e receita, passa a valer** e conflita com "logs sem dados pessoais" do CLAUDE.md. Decisão do usuário (ver 11) |
| Art. 13 | Guarda de registros de conexão é do provedor de conexão (operadora), não do VIO | Não se aplica |
| Art. 19 (STF, Tema 987, 26/06/2025) | Parcialmente inconstitucional: provedor responde civilmente em mais casos, com **dever de agir após notificação** para conteúdo ilícito e dever ativo para casos graves | VIO precisa de **canal de denúncia, retirada/expulsão e registro mínimo** de notificações. Como o conteúdo é efêmero e P2P, o foco é moderação da sala (expulsar, encerrar), não apagar arquivo |
| Art. 21 | Divulgação de intimidade (cenas de nudez/sexo) sem consentimento: retirada após notificação do ofendido, sem ordem judicial | Mesmo canal |
| Representante no Brasil | Já em solo nacional; sem exigência adicional para o fundador | |
| Ordem judicial | Responder pedidos de dados: sem o que entregar, dizer que não há registros | Texto na política |

## 6. Direitos autorais

Lei 9.610/1998 (https://www.planalto.gov.br/ccivil_03/leis/l9610.htm), arts. 29 (exibição pública) e 102–110 (sanções); Lei 9.609/1998 (software).

- Usuários podem transmitir filme, série, jogo e futebol (a "tela compartilhada" é de quem a compartilha). Exibição a grupo fechado de amigos tem defesa de ambiente doméstico; **sala pública ou aberta a desconhecidos** se parece com exibição pública [conf. A].
- O VIO não transporta nem grava mídia (P2P), o que reduz risco, mas não zera: pode ser acusado de indução/facilitação [conf. A].
- **Concorrentes:** Discord proíbe violação de direitos autorais nos Termos e remove após notificação (https://discord.com/terms); Teleparty, Kosmi, Hyperbeam e Rave: Termos **não localizados** na pesquisa, [conf.] antes de copiar qualquer cláusula.
- **DRM:** serviços como Netflix/Disney+ exibem tela preta na captura via navegador; não contornar. Documentar no Termos e na interface que o bloqueio não é falha.
- **O que os Termos devem dizer:** o usuário é responsável por ter direito de exibir o conteúdo; proibição de pirataria; remoção/expulsão na violação; VIO não hospeda nem armazena conteúdo.
- **Notificação e retirada (notice and takedown):** política com e-mail de contato, o que a notificação precisa conter, prazo de resposta, contra-notificação. Fonte do modelo: DMCA (17 U.S.C. 512, https://www.law.cornell.edu/uscode/text/17/512) adaptado, pois não há lei brasileira equivalente completa [conf. A].
- **Marketing:** não divulgar "assista Netflix de graça", "filmes piratas", "futebol pirata". Mostrar casos lícitos (vídeos próprios, jogos, trabalho). Risco de propaganda enganosa e de responsabilidade por indução.
- Ao gravar clips (#208): vozes e telas de terceiros exigem consentimento e indicador visível; clips só no aparelho mantêm o VIO fora da posse do conteúdo [conf. A].

## 7. AGPLv3 e monetização

| Tema | Ponto | Fonte |
| --- | --- | --- |
| Monetizar código AGPL | Permitido: AGPL não proíbe cobrar. Quem hospeda e oferece o serviço em rede (seção 13) deve oferecer o código-fonte a quem usa. O repositório já publica `dist/source.tar.gz` | https://www.gnu.org/licenses/agpl-3.0.html |
| Relicenciar/dual license | Só o detentor dos direitos pode. Contribuições de terceiros sem cessão **impedem** vender licença comercial ou mudar de licença | |
| CLA vs DCO | **CLA** (cessão/licença ampla ao projeto) permite dual license e mudança de licença; **DCO** só atesta origem, **não** permite relicenciar. Se a opção "dual license/venda de licença" for relevante, adotar CLA antes de aceitar a primeira contribuição externa | https://developercertificate.org/ |
| Dependências | Conferir licenças do `package.json` (MIT/ISC/Apache são compatíveis com AGPL; GPL-2-only não é). Rodar `license-checker` [conf.] | G (grátis) |
| Fontes e ícones | Bricolage Grotesque e IBM Plex Mono são **SIL OFL** (redistribuição permitida, incluir o texto da licença); `lucide-react` é ISC | https://openfontlicense.org/ , https://github.com/lucide-icons/lucide |
| Marca vs código | AGPL licencia o código, **não a marca**: política de marca ("VIO"/NerdQuest) evita forks usando o nome | A [advogado depois] |
| Quem | G para licenças; A para CLA e política de marca | R$ 0 a R$ 2 mil [conf.] |

## 8. Consumidor (CDC e comércio eletrônico)

| Tema | Regra | Fonte |
| --- | --- | --- |
| Arrependimento | 7 dias após a contratação à distância, com devolução integral (CDC art. 49) | https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm |
| E-commerce | Decreto 7.962/2013: identificação do fornecedor (CNPJ, endereço, contato), informações claras, resumo do contrato, canal de atendimento, confirmação de compra e **resposta em 5 dias** | https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2013/decreto/d7962.htm |
| Cancelamento | Assinatura recorrente deve poder ser cancelada **pelo mesmo meio** da contratação, sem barreira. Botão visível "Cancelar assinatura" [conf. regra do Decreto 11.034/2022 sobre SAC se houver atendimento] | https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2022/decreto/d11034.htm |
| Nota fiscal | NFS-e Nacional a cada cobrança (ME no Simples) | ver item 1 |
| Meio de pagamento | Processador (Stripe, Mercado Pago, etc.) cuida de cartão e PCI. VIO não toca dado de cartão [conf. taxa e conta PJ exigida] | |
| Quem | U + C (conta PJ, NFS-e), G redige textos, A revisa Termos de assinatura | |

## 9. Lojas e app Windows

| Tema | Situação | Fonte |
| --- | --- | --- |
| Microsoft Store | Cadastro de conta individual **isento de taxa**; submissões são assinadas pela Microsoft; exige política de privacidade pública e classificação etária | https://learn.microsoft.com/windows/apps/publish/ |
| Assinatura de código | Azure Artifact Signing (antigo Trusted Signing) **não disponível no Brasil**; alternativa é certificado OV ~US$ 150–300/ano [estimativa, conf.]; EV é mais caro | https://learn.microsoft.com/azure/trusted-signing/ |
| CNPJ | Conta individual na Store e certificado OV de pessoa física são possíveis [conf. exigência por emissor]; SmartScreen exige reputação com o tempo | |
| EULA do instalador | Existe `docs/juridico/termo-instalador.txt`; precisa apontar para os Termos de Uso finais e para a política de privacidade | repo |
| Permissões do app | `docs/juridico/permissoes-app.md`: tela, microfone, câmera; exibir motivo antes do pedido | repo |

## 10. Documentos que faltam

| Documento | Prioridade | Quem | Observação |
| --- | --- | --- | --- |
| Termos de Uso | antes do público | G redige, A revisa | idade mínima, conduta, DRM, responsabilidade, rescisão, foro |
| Política de Privacidade | antes do público | G, A | dados, bases, direitos, suboperadores (Render), contato |
| Diretrizes da comunidade | antes do público | G | o que expulsa da sala, menores, assédio |
| Política de direitos autorais | antes do público | G, A | canal, prazo, contra-notificação |
| Política de cookies/armazenamento | antes do público | G | lista de itens do localStorage |
| Aviso a pais/responsáveis | antes do público | G | depende da decisão 019 |
| Termo de apoio/assinatura | antes de cobrar | G, A | CDC, 7 dias, cancelamento |
| ROPA (registro de operações) | antes do público | G | `docs/juridico/` |
| Plano de incidentes | antes do público | G | contato, prazo ANPD |
| Política de marca / CLA | ao crescer | A | ver item 7 |

## 11. Decisões que o usuário precisa tomar

1. **Idade mínima:** manter 13+ só com verificação de terceiro, ou 18+? (bloqueia a abertura)
2. **Guarda de registros (art. 15):** ao virar PJ com receita, aceitar guardar IP/horário por 6 meses (e mudar a regra de logs) ou manter pessoa física sem fins econômicos enquanto crescer? [conf. A]
3. **Verbas:** liberar uma revisão de advogado antes do público (R$ 2–5 mil, [conf.]) ou só antes de cobrar.
4. **CLA ou DCO:** manter a opção de dual license?
5. **Marca:** aceitar a busca manual de "VIO" no INPI antes de pagar R$ 880/classe.

## 12. Lacunas e incertezas

- Pesquisa sem retorno útil: conflito de marca "VIO" no INPI, Termos de Kosmi/Rave/Teleparty/Hyperbeam, números de carnê-leão 2026, preço de contador e de verificação de idade.
- Fontes secundárias divergentes: teto MEI 2027 (usar R$ 81 mil até lei) e data da NFS-e (usar 1/11/2026).
- Textos de lei citados de memória (arts. do Marco Civil, CDC, ECA Digital): conferir nos links antes de colar nos Termos.
