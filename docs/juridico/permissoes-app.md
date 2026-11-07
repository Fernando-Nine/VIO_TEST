# Permissões do aplicativo (Windows)

Orientação, não aconselhamento jurídico formal. Data: 2026-11-07.

## Parecer

O modelo cabe, com um ajuste de expectativa: o aceite na instalação **não** é o consentimento
da LGPD para tratar dados; ele autoriza o app a pedir acesso ao aparelho. O controle real
continua no uso (botão na sala, indicador, chave do Windows). Com isso o aviso do WebView2
pode sumir sem enfraquecer a proteção da pessoa.

## Permissões que o app usa (código em `src/client`)

| Recurso | Onde | Aviso no WebView2? |
|---|---|---|
| Microfone | `media/capture.ts` (`getUserMedia`) | **Sim** (`PermissionRequested`, tipo microfone) |
| Câmera | `media/capture.ts` (`getUserMedia`, `cameraDevice`) | **Sim** (tipo câmera) |
| Tela/janela e som de programa | nativo: `desktop/native-video.ts` e comandos `desktop_*` (WGC/WASAPI) | Não. Não passa pelo WebView; a escolha da fonte é do VIO |
| Tela via `getDisplayMedia` | `desktop/capture.ts` L75 (só se não houver fonte escolhida) | Sim, se esse caminho for usado; confirmar com Mídia se ainda é alcançável no app |
| Notificações do sistema | não há `new Notification`; `Notifications.tsx` é aviso interno | Não se aplica |
| Áudio automático | `Media.tsx`, `ScreenAudio.tsx` (`play()`) | Não é permissão; é política de autoplay, sem aviso |
| Área de transferência | só `writeText` (Home, Landing, RoomLock, Settings, NoteActions, App) | Não pede aviso para escrita; leitura (`clipboard-read`) não é usada e deve continuar negada |

Conferir com Mídia ao implementar: o conjunto exato de tipos que chegam ao `PermissionRequested`
(a lista acima é leitura de código, não teste no Windows).

## Checagem LGPD (Lei 13.709/2018)

- **Base legal**: voz, imagem e tela seguem de aparelho a aparelho; o servidor não grava nem
  trata esse conteúdo. O tratamento que existe (apelido na sala, sinalização) se apoia em
  execução do serviço pedido e legítimo interesse (art. 7º, V e IX), com dados mínimos
  (art. 6º, III). O termo, portanto, é **transparência** (art. 6º, VI e art. 9º), não a base legal.
- **Consentimento**: se um dia houver dado tratado por consentimento (ex.: clips, #208),
  ele precisa ser específico e destacado (art. 8º, §4º), no momento do uso. Aceite de instalação
  não serve para isso.
- **Condições para o aceite valer como informado**: (1) texto claro e curto, em
  `termo-instalador.txt`; (2) indicador visível na sala com mic, câmera ou tela em uso
  (já é regra de produto; Frontend confirma que existe e é visível para quem usa e para os outros);
  (3) saída pelo Windows (Configurações > Privacidade e segurança > Microfone/Câmera). Em app
  não empacotado o Windows lista o app depois do primeiro uso; confirmar no Windows real que a
  chave desliga o acesso do WebView2 do VIO.
- **Menores**: LGPD art. 14 exige consentimento específico de um dos pais para dados de crianças
  (menores de 12); para adolescentes o tratamento deve atender ao melhor interesse. O ECA Digital
  (Lei 15.211/2025, em vigor desde 2026 **[conferir vigência e regulamento]**) pede
  proteção por padrão, o que o VIO já cumpre (sem conta, mic e câmera desligados, nada gravado).
  Quem instala pode ser menor: o termo pede ciência do responsável, mas **não verifica idade**.
  Idade mínima e verificação são decisão do usuário (ver abaixo).
- **Cuidado**: aceite embutido não pode virar permissão aberta. Só a origem do app
  (`https://tauri.localhost`) e só os tipos listados; página externa nunca ganha permissão
  automática (já bloqueada por `on_navigation`).

## Seção "Permissões do aplicativo"

Texto para o instalador: `docs/juridico/termo-instalador.txt` (seção 2, e 3 para o controle).
Quando houver Termos de Uso e Política de Privacidade publicados, a seção 2 entra neles
sem mudança e o instalador aponta para eles. **[advogado depois]** revisar o conjunto antes de
abrir ao público amplo ou monetizar.

## Depende do usuário

1. Idade mínima do app (ex.: 13 ou 14 com ciência do responsável) e se haverá verificação.
2. Trocar o `licenseFile` (hoje `LICENSE`, a AGPL) pelo termo: a AGPL continua no instalador
   como recurso e é citada na seção 7.
