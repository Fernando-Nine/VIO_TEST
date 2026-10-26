# Publicar o app Windows

Existem dois aplicativos, feitos do mesmo código:

|                        | **VIO** (estável)                                             | **VIO Teste** (beta)                             |
| ---------------------- | ------------------------------------------------------------- | ------------------------------------------------ |
| Servidor               | https://vio-quest.onrender.com                                | https://vio-test.onrender.com                    |
| Sai de                 | repositório **VIO**, ao criar a tag `vX.Y.Z`                  | repositório **VIO_TEST**, a cada merge na `main` |
| Versão                 | `2.9.0`                                                       | `2.9.0-rc.11.<nº da execução>`                   |
| Onde fica              | `vio-releases` → release `vX.Y.Z` (marcado como mais recente) | `vio-releases` → release fixo `beta`             |
| Arquivo de atualização | `latest.json`                                                 | `beta.json`                                      |
| Chave de assinatura    | chave de **produção** (só no VIO)                             | chave de **teste** (só no VIO_TEST)              |
| Ícone                  | normal                                                        | com selo laranja                                 |

Os dois podem ficar instalados ao mesmo tempo. Cada um só procura atualização no seu
próprio canal e só aceita instaladores assinados com a sua chave: o VIO Teste nunca
instala o VIO, e vice-versa.

As definições de cada canal ficam em `scripts/desktop-channel.mjs`; o workflow
`.github/workflows/windows.yml` escolhe o canal pelo repositório.

## O que você precisa fazer (uma vez só)

### 1. Repositório `vio-releases`

Em github.com/Fernando-Nine/vio-releases: se ele estiver vazio, crie um arquivo
`README.md` qualquer (botão **Add file → Create new file**). Um release precisa de pelo
menos um commit. Deixe o repositório **público**, senão o app não consegue baixar a
atualização.

### 2. Token `VIO_RELEASES_TOKEN`

1. GitHub → foto do perfil → **Settings** → **Developer settings** →
   **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Nome: `VIO releases`. Validade: 1 ano (anote para renovar).
3. **Repository access** → **Only select repositories** → escolha só `vio-releases`.
4. **Permissions** → **Repository permissions** → **Contents** → **Read and write**.
   Nada mais.
5. **Generate token** e copie o valor (começa com `github_pat_`).

Cadastre o **mesmo** token nos dois repositórios (VIO e VIO_TEST):
**Settings → Secrets and variables → Actions → New repository secret**,
nome `VIO_RELEASES_TOKEN`.

### 3. Chaves de assinatura

Cada repositório tem os secrets `TAURI_SIGNING_PRIVATE_KEY` (o conteúdo inteiro da
chave privada) e `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (a senha dela), com chaves
**diferentes**:

- **VIO** (produção): a chave que você recebeu na etapa 1 do app Windows (ID
  `7D499EB91F0CA1FE`). Se ela estava cadastrada no VIO_TEST, cadastre-a no
  VIO e **substitua** no VIO_TEST pela chave de teste.
- **VIO_TEST** (teste): a chave nova de teste (ID `3123E38BB793CE0D`), entregue no chat.

Guarde as duas chaves e senhas num gerenciador de senhas. Perder a chave de produção
obriga todos a reinstalar o VIO manualmente.

### 4. `ALLOWED_APP_ORIGINS` nos dois Renders

Os dois apps abrem a interface em `https://tauri.localhost` e precisam ter essa origem
liberada no servidor. No painel do Render, em **cada** serviço (`vio-test` e
`vio-quest`): **Environment → Add Environment Variable**:

```
ALLOWED_APP_ORIGINS=https://tauri.localhost
```

Salve; o Render reinicia o serviço sozinho.

## No dia a dia

- **VIO Teste:** nada a fazer. Cada merge na `main` do VIO_TEST que toca o app ou a
  interface publica uma versão nova no release `beta`. Quem tem o VIO Teste recebe ao
  abrir o app. Download manual: o instalador `VIO-Teste-<versão>-x64-setup.exe` no
  release `beta`.
- **VIO:** a release de produção (QA/copiloto) termina com a tag `vX.Y.Z` no VIO. A tag
  precisa ser criada por uma pessoa ou pelo token do agente, não pelo `GITHUB_TOKEN` de
  outro workflow (esse não dispara workflows). A tag tem de bater com a versão do
  `package.json`, senão o build para. Link fixo para a página de download:
  `https://github.com/Fernando-Nine/vio-releases/releases/latest/download/VIO-x64-setup.exe`.
- Sem os secrets, o workflow só gera o instalador como artefato e avisa que não publicou.

## Se algo der errado

- **Release não apareceu:** Actions → **VIO Windows** → a execução → passo
  **Publish to vio-releases**. Aviso "nada publicado" = falta secret.
- **App não atualiza:** confira se `latest.json`/`beta.json` existem no release e se a
  versão dentro é a nova. Sem rede ou com assinatura errada, o app abre a versão que já
  tem, sem erro.
- **App abre mas não conecta:** falta `ALLOWED_APP_ORIGINS` no Render daquele canal.
