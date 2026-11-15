# Levantamento de preços (rascunho)

Acesso: 2026-11-15. Só web, sem ler o repositório. "NC" = não confirmado (fonte indireta, espelho, blog ou memória). Valores em USD, salvo indicação. Câmbio: ver item 10.

## 1. Hospedagem do servidor

| Serviço | Plano / preço | RAM/CPU | Banda | Fonte |
| --- | --- | --- | --- | --- |
| Render | Free $0 | 512 MB | Hobby: 5 GB; Pro $25: 25 GB; Scale $499: 1 TB; excedente $0,15/GB | render.com/pricing.md |
| Render | Starter $7 | 0,5 CPU, 512 MB | idem | render.com/pricing.md |
| Render | Standard $25 | 1 CPU, 2 GB | idem | render.com/pricing.md |
| Render | Pro $85 | 2 CPU, 4 GB | idem | render.com/pricing.md |
| Fly.io | shared-cpu-1x 256 MB $2,19; 512 MB $3,69; 1 GB $6,70 por mês | compartilhada | saída $0,02/GB (NA/UE), $0,04/GB (América do Sul/Ásia) | docs.fly.io/about/pricing |
| Fly.io | Região São Paulo (gru): NC | | | docs.fly.io/about/pricing |
| Railway | Hobby $5, Pro $20; memória ~$10/GB-mês, vCPU ~$20/mês | por uso | saída $0,05/GB | railway.com/pricing |
| Hetzner (NC, blog bitdoze, jun/2026) | CX23 €5,49 (2 vCPU, 4 GB); CX33 €8,49; CAX11 €5,99 | | 20 TB inclusos na UE; sem São Paulo | bitdoze.com |
| Hetzner Américas | Hillsboro e Ashburn, só linha CPX (CX/CAX indisponíveis em out/2026, NC) | | tráfego incluso menor, NC | bitdoze.com |
| DigitalOcean | $4 / $6 / $12 por mês | 512 MB a 2 GB | 500 / 1000 / 2000 GiB; sem São Paulo | digitalocean.com/pricing |
| Vultr São Paulo | ~$7 a $8 (1 GB), NC, fontes divergem | | | vultr.com/pricing |
| Oracle Always Free | $0 (NC, de memória: ARM até 4 OCPU/24 GB, 10 TB saída/mês); há região São Paulo (Vinhedo/SP) | | | oracle.com/cloud/free |

Com região em São Paulo: Vultr (NC), Oracle, Render não (regiões: Oregon, Ohio, Virginia, Frankfurt, Singapura, NC), Fly gru (NC).

## 2. TURN (relay)

| Serviço | Preço | Fonte |
| --- | --- | --- |
| Cloudflare Realtime TURN | $0,05/GB, 1.000 GB grátis/mês (= $50/TB) | developers.cloudflare.com/realtime/turn/faq |
| Metered | Free 20 GB; $99 com 150 GB; excedente $0,40/GB | metered.ca/stun-turn |
| Twilio Network Traversal | $0,40/GB (EUA/UE); $0,80/GB (São Paulo) | twilio.com/en-us/stun-turn/pricing |
| Xirsys | NC, página bloqueada na consulta | xirsys.com/pricing |
| coturn próprio, Hetzner | estimativa: custo da VPS (~€5,5) cobre 20 TB; ~€0,3/TB só de banda inclusa; NC | bitdoze.com |
| coturn próprio, Oracle | estimativa: $0 até ~10 TB/mês (NC) | oracle.com/cloud/free |
| coturn próprio, Vultr SP | estimativa: VPS ~$7 a $8; banda inclusa NC | vultr.com/pricing |

## 3. SFU

| Opção | Preço | Fonte |
| --- | --- | --- |
| LiveKit Cloud Build | $0 (5.000 min, 50 GB) | livekit.com/pricing |
| LiveKit Cloud Ship | $50 (150.000 min, 250 GB; excedente $0,12/GB) | livekit.com/pricing |
| LiveKit Cloud Scale | $500 | livekit.com/pricing |
| Cloudflare Realtime SFU | NC (de memória: mesmo $0,05/GB, 1.000 GB grátis) | developers.cloudflare.com/realtime/sfu |
| mediasoup/LiveKit próprio | ver ordem de grandeza abaixo | estimativa |

Ordem de grandeza (estimativa própria, não é preço de fonte): 100 espectadores x 2,5 Mbps = 250 Mbps = ~112 GB por hora de transmissão. Em LiveKit Ship ($0,12/GB excedente) isso seria ~$13/h. Em VPS com 20 TB inclusos (Hetzner UE) caberiam ~180 h/mês, mas 250 Mbps sustentados exigem 4+ vCPU dedicadas (NC).

## 4. Banco, login, e-mail

| Serviço | Grátis | Primeiro pago | Fonte |
| --- | --- | --- | --- |
| Neon | 1 GB por projeto | Launch $0,106/CU-hora (uso) | neon.com/pricing |
| Supabase | 500 MB; pausa após 1 semana sem uso | Pro $25 | supabase.com/pricing |
| Render Postgres | Free 256 MB (expira, NC) | $6; $19 (1 GB); $40 (2 GB) | render.com/pricing.md |
| Turso | 5 GB | Developer $4,99 | turso.tech/pricing |
| Cloudflare D1 | 5 GB | Workers Paid $5/mês, NC | developers.cloudflare.com/d1/platform/pricing |
| Clerk | 50.000 MRU | Pro $25 | clerk.com/pricing |
| Auth.js / Lucia | $0 (código aberto, só infraestrutura) | | authjs.dev |
| Supabase Auth | incluso no plano Supabase | | supabase.com/pricing |
| Resend | 3.000 e-mails/mês | $20 por 50.000 | resend.com/pricing |
| Amazon SES | | $0,10 por 1.000 | aws.amazon.com/ses/pricing |
| Brevo | NC, página não carregou (de memória: grátis ~300/dia) | | brevo.com/pricing |

## 5. Domínios e DNS

| Item | Preço | Fonte |
| --- | --- | --- |
| .com.br (Registro.br) | R$ 40/ano (10 anos R$ 364); sem privacidade WHOIS | teletime.com.br/14/10/2026/br-6-milhoes (cita NIC.br) |
| .com | NC, ~$10 a $12/ano (de memória; Cloudflare vende a preço de custo) | cloudflare.com/products/registrar |
| .app | NC, ~$13 a $15/ano (de memória) | cloudflare.com/products/registrar |
| .gg | NC, ~$40 a $80/ano (de memória; registro só via revendedores) | gg.gg |
| .tv | NC, ~$35 a $50/ano (de memória) | iana.org/domains/root/db/tv.html |
| Cloudflare DNS/CDN | Free $0 (NC, de memória) | cloudflare.com/plans |

## 6. App Windows e lojas

| Item | Preço | Fonte |
| --- | --- | --- |
| Artifact Signing (ex-Trusted Signing) Basic | $9,99/mês (via espelho, NC) | learn.microsoft.com/azure/artifact-signing |
| Artifact Signing Premium | $99,99/mês (NC); sem EV; exige assinatura Azure paga | idem |
| Elegibilidade: empresa | só EUA, Canadá, UE, Reino Unido, Austrália, Nova Zelândia, Japão, Coreia do Sul, Singapura, Suíça, Noruega, Israel. Brasil NÃO está na lista | learn.microsoft.com/azure/artifact-signing/quickstart |
| Elegibilidade: pessoa física | só EUA e Canadá. Brasil NÃO elegível hoje (certificado Public Trust) | idem |
| Região de serviço Brazil South existe, mas isso não muda a elegibilidade | | idem |
| Certificado OV | ~$220 a $512/ano (revendedores, NC) | revendedores |
| Certificado EV | ~$290 a $685/ano (revendedores, NC) | revendedores |
| Microsoft Store, conta pessoa física | grátis (desde 2025) | blogs.windows.com/windowsdeveloper/2025/09/10 |
| Microsoft Store, conta empresa | grátis (desde 7/5/2026); a página de inscrição ainda mostra $19/$99 (desatualizada) | blogs.windows.com/windowsdeveloper/2026/05/07 |
| Apple Developer | $99/ano (NC, blog) | windowscentral.com |
| Google Play | $25 uma vez (NC, de memória) | play.google.com/console |

## 7. Observabilidade

| Serviço | Grátis | Primeiro pago | Fonte |
| --- | --- | --- | --- |
| Sentry | Developer $0: 5k erros, 5M spans, 50 replays, 1 monitor de uptime | Team $29/mês ($26 anual): 50k erros | sentry.io/pricing |
| PostHog | NC, página não carregou (de memória: 1M eventos grátis/mês) | uso | posthog.com/pricing |
| Plausible | sem plano grátis (NC) | Starter $9/mês, 10k pageviews | plausible.io |
| Better Stack | NC | NC | betterstack.com/pricing |
| UptimeRobot | NC (de memória: grátis, 50 monitores, 5 min) | NC | uptimerobot.com/pricing |
| Grafana Cloud | NC (de memória: grátis, 10k séries, 50 GB logs) | NC | grafana.com/pricing |

## 8. Pagamentos no Brasil

| Serviço | Taxa | Fonte |
| --- | --- | --- |
| Stripe Brasil | cartão nacional 3,99% + R$ 0,39; Pix 1,19% (só por convite); boleto R$ 3,45; cartão internacional +2%; Billing 0,7% | stripe.com/br/pricing |
| Asaas | Pix R$ 0,99; boleto R$ 0,99; débito R$ 0,35 + 1,89%; crédito não apareceu | asaas.com/precos-e-taxas |
| Mercado Pago | NC, página bloqueada (403) | mercadopago.com.br/costs-section |
| Pagar.me | NC, não consultado | pagar.me/precos |
| Abacate Pay | NC, não consultado | abacatepay.com |
| Polar (MoR) | Starter 5% + $0,50; Pro $20/mês: 3,8% + $0,40; +1,5% cartão fora dos EUA; disputa $15. Aceita vendedor do Brasil e Pix: NC | polar.sh/docs/merchant-of-record/fees |
| Paddle | NC (de memória: 5% + $0,50; Pix e vendedor BR: NC) | paddle.com/pricing |
| Lemon Squeezy | NC (de memória: 5% + $0,50; Pix e vendedor BR: NC) | lemonsqueezy.com/pricing |
| Apoia.se, Catarse, Ko-fi, GitHub Sponsors, Patreon, Open Collective | NC, não consultados | sites oficiais |

## 9. Verificação de idade (ECA Digital)

| Serviço | Preço por verificação | Fonte |
| --- | --- | --- |
| Veriff | Essential $0,80 (mín. $49/mês); Plus $1,39 (mín. $99); Premium $1,89 (mín. $209) (NC, via diretório) | idenfy.com/blog/best-age-verification-software-providers |
| Yoti | não publicado, só cotação com vendas | didit.me/switch/yoti-alternative (concorrente, NC) |
| Persona | não publicado | idem |
| Estimativa de faixa | $0,30 a $1,20 por checagem biométrica (NC, sem fornecedor) | didit.me/blog |
| unico, idwall, Serpro Datavalid | NC, não consultados (cotação com vendas) | sites oficiais |

## 10. Câmbio

| Item | Valor | Fonte |
| --- | --- | --- |
| USD/BRL | R$ 5,5606 (venda, fechamento de 11/11/2026, Banco Central); 9/11: R$ 5,51 | brasil61.com (notícia de 11/11/2026) |
| Sem cotação de 12 a 15/11 | tratar como ~R$ 5,5 | |

Conversões úteis (R$ 5,56): $7 = R$ 39; $25 = R$ 139; $99 = R$ 550; $0,05/GB = R$ 0,28/GB.

## Lacunas

Não confirmados por página oficial: Hetzner, Vultr SP, Oracle, Xirsys, Brevo, PostHog, Better Stack, UptimeRobot, Grafana, Mercado Pago, Pagar.me, Abacate Pay, Paddle, Lemon Squeezy, plataformas de apoio, unico, idwall, Datavalid, OV/EV, Apple, Google Play, domínios .com/.app/.gg/.tv, Cloudflare SFU.
