# Plano do banco e das contas do VIO

14 de novembro de 2026 · escrito pelo Claude, a pedido do copiloto · **aguardando aval do usuário**

Página de leitura com comentários (mesmo conteúdo, com o desenho do login): https://claude.ai/artifact/Gc5Nar35QgPsh3tDWhxssE

Recomendação: quando as contas chegarem, um banco Postgres grátis na Neon, ao lado do servidor, que continua no Render; login por Discord e Google, sem guardar e-mail nem senha; conta sempre opcional. Custo estimado: US$ 0 hoje, cerca de US$ 7 por mês com 100 a 1.000 pessoas e cerca de US$ 50 com 10.000, fora o TURN.

Este plano é só papel. Contas e banco continuam adiados (decisão 009) e nada aqui vira código sem o seu aval.

## O que eu preciso de você

Três escolhas. Nenhuma tem pressa: valem para o dia em que você decidir ligar as contas. Responda por comentário em cada linha ou no chat do copiloto.

| Decisão | Recomendada | Alternativas | Sua resposta |
|---|---|---|---|
| Banco | Postgres grátis na Neon, na mesma região do servidor | Postgres pago do Render (US$ 6 por mês); Supabase grátis | |
| Hospedagem | Continuar no Render; subir para o plano de US$ 7 por mês quando houver contas ou público | Fly.io (tem São Paulo, sem plano grátis); Railway (US$ 5 por mês) | |
| Login | Discord e Google, sem guardar e-mail nem senha | Os dois e mais link por e-mail; e-mail e senha próprios | |

O que não muda em nenhuma opção:

- Conta é opcional para sempre. Quem entra sem conta usa o VIO como hoje.
- O servidor continua sem transportar nem gravar áudio, vídeo ou tela.
- Nada sai do grátis antes de haver receita ou abertura ao público (decisão 017).
- A única dependência nova seria o driver do Postgres (`pg`), e ela só entra com o seu aval.

## Hospedagem: fica no Render ou troca?

Recomendação: ficar no Render. Esta seção fecha a pendência de 12 de novembro.

### Como o Render funciona

O Render aluga um computador pequeno que fica ligado rodando o VIO. Pense numa sala alugada que é só sua: o programa entra, fica lá e lembra de tudo enquanto estiver ligado.

- Cada vez que algo entra na `main`, o Render baixa o código, monta e troca a versão no ar sozinho.
- No plano grátis a sala apaga a luz depois de 15 minutos sem ninguém. A próxima visita espera cerca de 1 minuto para o servidor acordar. Com gente na sala, ele não dorme.
- O plano grátis dá 512 MB de memória e 750 horas por mês, somadas entre todos os serviços grátis da conta. Prévia e produção ligadas o mês inteiro passariam disso; hoje não passam porque dormem.
- O plano grátis não tem disco que sobreviva a um reinício e bloqueia o envio de e-mail direto (portas 25, 465 e 587).
- As regiões são Oregon, Ohio, Virgínia, Frankfurt e Singapura. Não há São Paulo. O VIO está na Virgínia.

### Por que não a Vercel

A Vercel é feita para sites que respondem e esquecem. Pense numa central de atendimento: cada chamada cai num atendente diferente, que não sabe o que o anterior ouviu.

O VIO é o contrário. Ele guarda as salas na memória de um único programa e mantém uma ligação aberta com cada pessoa durante a sessão inteira. Na Vercel:

- a ligação contínua (WebSocket) ainda está em beta e é cortada no limite de tempo da função: 300 segundos no plano grátis, 800 no pago;
- depois do corte, a reconexão pode cair em outra cópia do programa, que não conhece a sala;
- a própria documentação manda guardar o estado fora da memória.

Usar a Vercel exigiria reescrever o coração do servidor e pagar um serviço extra para guardar as salas. Não compensa.

### As três opções

| Opção | Preço | A favor | Contra |
|---|---|---|---|
| A. Render (recomendada) | US$ 0 hoje; US$ 7 por mês no plano Starter | Já funciona, deploy automático, nada a migrar | Sem região no Brasil; o grátis dorme |
| B. Fly.io | A partir de US$ 2,19 por mês (256 MB) | Tem região em São Paulo | Sem plano grátis para conta nova; configuração mais manual |
| C. Railway | US$ 5 por mês, com US$ 5 de uso incluídos | Simples, parecido com o Render | Sem região no Brasil; não há ganho que pague a mudança |

A distância até a Virgínia pesa pouco no VIO. Só a combinação inicial da chamada passa pelo servidor; voz e tela vão direto de uma pessoa para a outra.

Quando subir para o plano de US$ 7: quando houver contas ou abertura ao público. Aí o servidor para de dormir e o primeiro acesso deixa de esperar. Se um dia o atraso da sinalização incomodar, a troca natural é a opção B, levando o banco junto para São Paulo.

## Banco: qual usar e onde ele mora

Recomendação: Postgres na Neon, plano grátis, na mesma região do servidor (Virgínia).

Postgres é o banco de dados aberto mais usado. Ele serve bem para o que o VIO vai guardar (contas, amigos, salas salvas) e existe em qualquer hospedagem, então trocar de fornecedor depois é copiar os dados, sem reescrever o app.

| Opção | Preço | A favor | Contra |
|---|---|---|---|
| A. Neon grátis (recomendada) | US$ 0; depois paga só pelo uso | Grátis sem prazo; 1 GB por projeto; dorme após 5 minutos parado e acorda sozinho; Postgres padrão | Mais um fornecedor além do Render; a primeira consulta depois do sono demora um pouco |
| B. Postgres do Render, plano Basic | US$ 6 por mês (256 MB) | Mesmo painel e mesma rede do servidor; sempre ligado | Custo fixo desde o primeiro dia, contra a decisão 017 |
| C. Supabase grátis | US$ 0; plano pago a partir de US$ 25 por mês | Banco e login prontos no mesmo lugar | Pausa o projeto após 1 semana sem uso; amarra o login ao serviço; contra "código nosso antes de serviço de fora" |

O que ficou de fora e por quê:

- **Postgres grátis do Render**: expira 30 dias depois de criado e não tem backup. Não serve para guardar contas.
- **SQLite (um arquivo no próprio servidor)**: o plano grátis do Render não tem disco que sobreviva a um reinício; os dados sumiriam a cada deploy.

### Onde o banco mora

Ao lado do servidor, na Virgínia, e não em São Paulo.

- Quem conversa com o banco é o servidor, não o navegador de quem usa. Com o banco em São Paulo e o servidor na Virgínia, cada consulta atravessaria o continente (estimativa: 120 a 150 ms a mais por consulta).
- Banco no Brasil não tiraria a transferência internacional de dados: o servidor nos Estados Unidos já trata os mesmos dados.
- Se o servidor um dia for para São Paulo, o banco vai junto. A Neon tem região em São Paulo.

### Como o servidor usa o banco

- Só o servidor acessa o banco, com um endereço secreto guardado nas variáveis do Render, nunca no código.
- As salas ao vivo continuam na memória. O banco guarda só o que precisa durar.
- Se o banco cair, as salas seguem funcionando; só login e dados de conta ficam indisponíveis.
- Consultas escritas à mão com o driver `pg`, sem camada extra. Mudanças de tabela em arquivos SQL numerados, guardados no repositório.
- Cópia de segurança: a Neon guarda um histórico curto no plano grátis. Antes de abrir ao público, uma exportação semanal cifrada entra no plano.

## Custo: hoje e com 100, 1.000 e 10.000 pessoas

Valores em dólares por mês, com as opções recomendadas. "Pessoas" aqui são contas criadas. A hipótese é que 5% a 10% delas estejam online ao mesmo tempo no pico: 10 a 20, 50 a 100 e 500 a 1.000.

| Item | Hoje | 100 | 1.000 | 10.000 |
|---|---|---|---|---|
| Servidor (Render) | 0 (Free) | 7 (Starter) | 7 (Starter) | 25 (Standard) |
| Banco (Neon) | 0 | 0 | 0 | cerca de 20 |
| E-mail | 0 | 0 | 0 | 0 |
| Tráfego extra | 0 | 0 | 0 | 0 a 5 |
| **Total** | **0** | **cerca de 7** | **cerca de 7** | **45 a 50** |

Como ler:

- **Servidor**: os US$ 7 compram um servidor que não dorme. Com 10.000 contas, o plano de 2 GB de memória dá folga para as ligações abertas. A memória real por pessoa conectada não foi medida; é a conta mais incerta da tabela.
- **Banco**: os dados são pequenos, poucos KB por conta. Dez mil contas ocupam bem menos que o 1 GB grátis (estimativa: menos de 200 MB). O que passa a custar é manter o banco acordado o dia todo: cerca de 182 horas de computação por mês a US$ 0,106, perto de US$ 20.
- **E-mail**: zero porque o login recomendado não usa e-mail. Se você escolher o login com link por e-mail, os planos grátis de envio (3.000 por mês na Resend, 300 por dia na Brevo) cobrem até perto de 1.000 contas; acima disso, cerca de US$ 20 por mês.
- **Tráfego**: o servidor só troca mensagens curtas; voz e tela não passam por ele. O plano grátis do Render inclui 5 GB por mês.

Fora desta conta:

- **TURN** (o relé para quem não consegue ligação direta): é o custo que mais cresce com gente, e já tem issue própria (#135, aguardando você).
- **Verificação de idade por terceiro** (decisão 019, antes da abertura ao público): preço não pesquisado.
- **Domínio próprio**: custo anual pequeno, se você quiser um.

Pela decisão 017, os US$ 7 só entram com receita ou abertura ao público. Com contas ligadas só para você e amigos, tudo continua em US$ 0; o preço é o servidor dormir.

## Login: métodos, sessão e o token de hoje

Recomendação: entrar com Discord ou Google. O VIO não guarda e-mail nem senha.

### Os métodos

| Opção | O que o VIO guarda | A favor | Contra |
|---|---|---|---|
| A. Discord e Google (recomendada) | Só o número de identificação que o provedor devolve | Sem senha para vazar; sem e-mail; o público do VIO já tem Discord; custo zero | Quem não tem nenhum dos dois fica sem conta (mas continua usando sem conta) |
| B. A opção A e mais link por e-mail | O mesmo e o e-mail | Atende quem não usa Discord nem Google | Guarda e-mail (dado pessoal a mais); exige serviço de envio e domínio próprio |
| C. E-mail e senha próprios | E-mail e senha (em forma embaralhada) | Independe de terceiros | Maior risco e mais trabalho: vazamento de senha, recuperação, ataques de tentativa |

Detalhes da opção A:

- Pedimos o mínimo a cada provedor: no Discord, só a permissão `identify` (id, nome e avatar); no Google, só `openid` (um identificador único). O e-mail só viria com uma permissão extra, que não pedimos.
- Os tokens que o Discord e o Google entregam são usados uma vez, para ler o id, e descartados. Não vão para o banco.
- A pessoa pode ligar os dois provedores à mesma conta. É a forma de recuperação: perdeu um, entra pelo outro.
- O fluxo é escrito por nós (código de autorização com PKCE e `state`), sem biblioteca de login. As bibliotecas mais conhecidas estão descontinuadas ou em manutenção (Lucia, Auth.js), e a decisão 017 pede código nosso.
- Passkeys (entrar com a digital ou o rosto do aparelho) ficam como possibilidade futura; não foram pesquisadas.

### Como convive com o token de hoje

Hoje cada aba pede ao servidor um token curto, assinado, com um id sorteado. Ele vale 1 hora e é renovado sozinho. É esse token que entra na sala. Isso não muda.

O que entra de novo é uma segunda peça, só para quem tem conta:

1. A pessoa clica em "Entrar" e vai ao Discord ou ao Google.
2. O provedor devolve um código; o servidor troca o código pelo id da pessoa.
3. O servidor acha ou cria a conta e grava uma sessão de conta.
4. O navegador recebe um cookie com um código sorteado longo. O banco guarda só a impressão digital (hash) desse código.
5. Dali em diante, quando a aba pede o token de sala, o servidor vê o cookie e põe no token um campo a mais: o id da conta.
6. Sem cookie, o token sai igual ao de hoje, sem o campo.

O mesmo caminho, em duas trilhas (o desenho está na página):

- **Uma vez por aparelho:** a pessoa clica em Entrar → Discord ou Google confirma quem é → o servidor grava a sessão de conta → o cookie fica no navegador.
- **A cada entrada em sala:** a aba pede o token de sala → o servidor pergunta "cookie válido?" → sim: token com o id da conta; não: token igual ao de hoje → entra na sala.

A trilha de cima acontece uma vez por aparelho. A de baixo é a de hoje, com uma pergunta a mais; quem não tem conta segue pelo "não" e nada muda.

Por que assim:

- **Nada quebra.** O id por aba continua existindo. Transmissões, presença e reconexão seguem amarradas a ele, como mandam os invariantes.
- **A sala não depende do banco.** O socket confere só o token assinado. O banco é consultado no login e na renovação do token, não a cada mensagem.
- **Dá para sair de todos os aparelhos.** Apagar a sessão no banco corta a conta na próxima renovação, em até 1 hora. Para cortar na hora, o servidor também derruba as ligações abertas daquela conta.

### Regras de segurança da sessão

- Cookie `HttpOnly`, `Secure` e `SameSite=Lax`: scripts da página não o leem e outros sites não o enviam em ações.
- Código de sessão com 256 bits sorteados; no banco, só o hash SHA-256.
- Validade de 30 dias, renovada com o uso; lista de aparelhos em Ajustes, com "sair" em cada um.
- Rotas de conta conferem a origem do pedido (a mesma lista `ALLOWED_ORIGINS` de hoje) e têm limite de tentativas (`Limits`).
- Todo payload novo passa por zod `.strict()`, e o campo novo do token é opcional no `protocol.ts`.
- Toda permissão ligada à conta (dono de sala salva, amigo, bloqueio) é conferida no servidor.
- Logs continuam sem nome, sem id de provedor e sem código de sessão.
- App Windows, quando vier: o login abre no navegador do sistema e volta para o app, sem digitar senha dentro dele.

## O que guardar e o que nunca guardar

Regra: guardar só o que uma tela precisa mostrar de volta para a pessoa. Se nenhuma tela usa, não entra no banco.

### O que o banco guarda

| Grupo | O que entra | Para quê |
|---|---|---|
| Conta | Id interno sorteado, data de criação, último acesso (só o dia), nome de exibição, cor e avatar escolhidos de um conjunto pronto | Perfil |
| Idade | Faixa etária (13 a 15, 16 a 17, adulto) e a data da confirmação | Proteções para menores |
| Vínculo de login | Provedor (Discord ou Google) e o id que ele devolve | Reconhecer a pessoa na próxima entrada |
| Sessões | Hash do código, criação, validade, rótulo do aparelho ("Chrome no Windows") | Lista de aparelhos e "sair" |
| Preferências | Ajustes, layout e temas pessoais, em um bloco com tamanho limitado | Levar o VIO de um aparelho para outro |
| Amigos e bloqueios | Pares de contas e o estado (pedido, aceito, bloqueado) | Lista de amigos |
| Salas salvas | Nome, dono, admins, widgets e suas configurações | Reabrir a mesma sala |
| Temas da comunidade | Cores do tema, autor, data, denúncias | Galeria de temas |
| Termos | Versão aceita e data | Provar o aceite |

### O que o VIO nunca guarda

- Áudio, vídeo e tela. O servidor nem os recebe.
- Conversa de sala e conteúdo digitado em widgets de salas não salvas.
- Senha, em qualquer forma.
- Tokens do Discord ou do Google.
- E-mail (na opção de login recomendada).
- Documento, selfie ou qualquer prova usada na verificação de idade. Só o resultado.
- Data de nascimento completa. Só a faixa.
- Nome real, telefone, endereço, localização.
- Endereço IP no banco.
- Histórico de quem esteve com quem, em qual sala e quando.
- Dados técnicos da chamada (SDP, ICE).
- Dados de pagamento. Se houver monetização, ficam com o processador de pagamento.

Ressalva: o Marco Civil da Internet (art. 15) manda certos provedores guardarem registros de acesso por 6 meses. Hoje o VIO não se enquadra (não é empresa com fins econômicos). Na monetização isso pode mudar e obrigar a guardar IP e horário de acesso, sob sigilo. **[advogado depois]**

### Por quanto tempo

- Sessões vencidas: apagadas todo dia.
- Conta sem acesso por 24 meses: apagada, com aviso na tela na entrada anterior ao prazo.
- Pedido de exclusão: apaga na hora conta, vínculos, sessões, preferências, amizades e salas salvas. Temas publicados ficam sem autor ou saem, à escolha da pessoa.
- Cópias de segurança: giram em até 30 dias, e o que foi apagado some junto.

## LGPD e menores

Isto é orientação para decidir o produto, não aconselhamento jurídico formal. Os pontos marcados **[advogado depois]** pedem um profissional antes da abertura ao público.

### Quem é quem

- **Controlador**: o VIO (você, pela NerdQuest Studios). Decide o que se guarda e por quê.
- **Operadores**: Render (servidor) e Neon (banco). Guardam os dados a mando do VIO.
- **Discord e Google**: controladores dos próprios dados. O VIO só recebe o id.

### O que a LGPD pede e como o plano responde

| Tema (artigo) | O que pede | No plano |
|---|---|---|
| Necessidade (6º) | Só o mínimo de dados | Sem e-mail, sem senha, sem data de nascimento, sem IP no banco |
| Base legal (7º) | Um motivo válido para cada dado | Conta e amigos: execução do serviço pedido pela pessoa. Temas públicos: consentimento ao publicar |
| Transparência (9º) | Dizer com clareza o que é guardado | Política de privacidade curta, e um resumo na tela de criar conta |
| Crianças e adolescentes (14) | Melhor interesse do menor | Ver abaixo |
| Direitos da pessoa (18) | Ver, corrigir, levar e apagar os dados | Telas "Baixar meus dados" e "Apagar conta" desde o primeiro dia |
| Transferência internacional (33) | Garantias quando o dado sai do país | Servidor e banco ficam nos Estados Unidos; exige cláusulas-padrão da ANPD nos contratos **[advogado depois]** |
| Encarregado (41) | Um contato para privacidade | Agente de pequeno porte pode ser dispensado do encarregado, mas precisa de um canal de contato. Vale conferir se o VIO se enquadra **[advogado depois]** |
| Segurança (46) | Proteger os dados | Hash das sessões, acesso ao banco só pelo servidor, segredo fora do código, revisão do `seguranca` em cada fase |
| Incidente (48) | Avisar a ANPD e as pessoas se houver vazamento com risco | Roteiro de incidente em `docs/incidentes/`, com o prazo da ANPD |

### Menores

O que já está decidido (decisão 019): idade mínima de 13 anos; de 13 a 17, ciência do responsável; antes da abertura ao público, verificação de idade por terceiro, sem guardar documentos.

O que o ECA Digital (Lei 15.211/2025, em vigor desde 17 de março de 2026) acrescenta, pelas fontes consultadas:

- Só declarar a idade não basta para serviços que menores podem acessar.
- Conta de menor de 16 anos deve estar vinculada à de um responsável.

Como o plano trata:

- **13 a 15 anos**: conta só com vínculo a um responsável, que tem conta própria e vê os ajustes de privacidade do menor.
- **16 e 17 anos**: conta própria, com ciência do responsável.
- **Privacidade por padrão para todo menor**: perfil não aparece em busca, amizade só por código trocado fora do app, sem sala pública, sem tema publicado com o nome.
- **Verificação**: feita por um serviço de fora. O VIO recebe só "faixa confirmada" e a data.

Em aberto, para advogado antes da abertura ao público **[advogado depois]**:

- Se o uso sem conta pode continuar para qualquer pessoa depois da abertura, ou se o ECA Digital exige checar a idade também de quem entra sem conta.
- Como registrar a ciência do responsável de forma que valha como prova.
- O texto das cláusulas de transferência internacional.

Enquanto o VIO for só você e amigos, nada disso muda o que existe hoje. Estas regras passam a valer no dia em que houver contas.

## Migração: sem quebrar quem usa sem conta

Duas promessas valem em todas as fases:

- Conta é opcional para sempre. Criar sala, entrar por link, transmitir e falar continuam sem conta.
- Banco fora do ar não derruba sala. Só o que depende de conta fica indisponível, com aviso.

| Fase | O que entra | Quem usa sem conta percebe? |
|---|---|---|
| 0. Agora | Nada de código. O Design desenha as telas que esperam o banco | Não |
| 1. Base | Banco e login, só na prévia, atrás de uma chave desligada por padrão | Não |
| 2. Perfil | Nome, cor e ajustes sincronizados entre aparelhos. Ao criar a conta, o VIO oferece levar o que já está salvo no aparelho | Um botão "Entrar" discreto |
| 3. Amigos e salas salvas | Lista de amigos, convite direto, sala com nome e widgets guardados. A credencial de criador de hoje pode virar sala salva | Não |
| 4. Comunidade | Galeria de temas, com denúncia e moderação | Pode ver e usar temas; publicar pede conta |

Como cada fase é feita:

- O contrato muda primeiro (`protocol.ts`), só com campos novos opcionais. Cliente antigo e servidor novo continuam se entendendo.
- Cada fase é uma issue com plano, passa pelo `goldfish`, tem revisão do `seguranca` e sobe como versão MINOR.
- Cada fase passa pela prévia e pelo seu aval antes de ir para a produção, como qualquer release.
- Voltar atrás é desligar a chave. Os dados ficam no banco, e o app volta a se comportar como hoje.
- A produção só sobe com banco configurado quando a chave estiver ligada; sem ela, o servidor nem tenta conectar.

A fase 0 é a única que pode começar já, e só com pedido seu ao Design.

## Telas e opções que esperam o banco

Todas podem ser desenhadas já pelo Design (pedido de 14 nov) e passam por "ver antes de codar": rascunho, seu aval, e só então issue de frontend ou backend. Nenhuma vira código antes do banco.

| Tela ou opção | O que mostra | Fase |
|---|---|---|
| Entrar e criar conta | Botões do Discord e do Google, resumo do que é guardado, aceite dos termos | 1 |
| Idade e responsável | Faixa etária, vínculo com o responsável para 13 a 15 anos | 1 |
| Perfil | Nome de exibição, cor, avatar | 2 |
| Ajustes › Conta | Provedores ligados, aparelhos conectados com "sair", baixar meus dados, apagar conta | 2 |
| Sincronização | Levar ajustes, layout e temas pessoais do aparelho para a conta | 2 |
| Amigos | Lista, pedidos, bloqueios, convite direto para a sala | 3 |
| Salas salvas | Salas com nome, widgets e admins guardados | 3 |
| Temas da comunidade | Galeria, publicar, denunciar (decisão 003) | 4 |
| Widgets da comunidade | Só com isolamento de código (decisão 004) | Depois |
| Apoiador | Selo e vantagens, se houver monetização | Depois |

Não esperam o banco: clips gravados no próprio aparelho, que ficam no aparelho.

Em toda tela, quem não tem conta vê o VIO como hoje. O que pede conta aparece como convite, nunca como bloqueio.

## O que não foi confirmado

O plano se apoia nestes pontos, que são estimativa, memória ou fonte de terceiro. Vale conferir cada um antes de gastar dinheiro ou abrir ao público.

Estimativas minhas, sem medição:

- Memória que o servidor gasta por pessoa conectada. Sem esse número, o salto para US$ 25 com 10.000 pessoas é um chute.
- De 5% a 10% das pessoas online ao mesmo tempo no pico.
- Menos de 200 MB de banco para 10.000 contas.
- De 120 a 150 ms a mais por consulta se o banco ficasse em São Paulo e o servidor na Virgínia.

Preços e limites não conferidos na fonte oficial:

- Preço do envio de e-mail acima do grátis (cerca de US$ 20 por mês, de memória).
- Limites grátis da Resend (vistos em fontes de terceiros).
- Histórico e cópias de segurança do plano grátis da Neon.
- Fly.io: ausência de plano grátis para conta nova e a região de São Paulo não foram reconferidas nesta pesquisa.
- Mudanças de preço do Render em 2026: vistas em blog de terceiro.
- Oracle Always Free: descartada por relatos de corte de contas, que vêm de blogs.

Jurídico:

- ECA Digital: lido por resumos de escritórios e da imprensa, não pelo texto da lei.
- Artigos da LGPD e do Marco Civil: citados de memória, sem conferir o texto no Planalto.
- Prazo para avisar a ANPD de um incidente (3 dias úteis, de memória).
- Enquadramento do VIO como agente de pequeno porte.

Não pesquisado:

- Passkeys como método de login.
- Preço da verificação de idade por terceiro.
- TURN, que tem issue própria (#135).

## Fontes

Consultadas em 14 de novembro de 2026.

Hospedagem:

- Render, preços: https://render.com/pricing
- Render, plano grátis: https://render.com/docs/free
- Render, regiões: https://render.com/docs/regions
- Render, mudanças de preço em 2026 (terceiro): https://bex.co/blog/2026/09/04/render-price-changes-cost-sheet
- Vercel, WebSockets: https://vercel.com/docs/functions/websockets
- Vercel, limites das funções: https://vercel.com/docs/functions/limitations
- Fly.io, preços: https://fly.io/pricing-update/
- Railway, planos: https://docs.railway.com/pricing/plans
- Oracle Always Free: https://docs.oracle.com/iaas/Content/FreeTier/resourceref.htm

Banco:

- Neon, preços: https://neon.com/pricing
- Neon, regiões: https://neon.com/docs/introduction/regions
- Supabase, preços: https://supabase.com/pricing

Login e e-mail:

- Discord, OAuth2: https://docs.discord.com/developers/platform/oauth2-and-permissions
- Google, OpenID Connect: https://developers.google.com/identity/openid-connect/reference
- Resend, plano grátis: https://resend.com/blog/new-free-tier
- Brevo, API de e-mail: https://www.brevo.com/features/email-api/

Jurídico:

- ECA Digital (Mattos Filho): https://www.mattosfilho.com.br/unico/eca-digital-sancionada-lei/
- ECA Digital (Tecnoblog): https://tecnoblog.net/noticias/eca-digital-entra-em-vigor-para-proteger-menores-na-internet-veja-mudancas/
- Transferência internacional, regulamento da ANPD (Demarest): https://www.demarest.com.br/anpd-aprova-o-regulamento-de-transferencia-internacional-de-dados/

Do próprio VIO:

- Decisões 003, 004, 009, 017 e 019
- `docs/juridico/idade-minima.md`
- `docs/ESTADO.md`
