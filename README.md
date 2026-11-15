# OSTENTY SEMIJOIAS — Catálogo digital

Catálogo digital responsivo com contas de acesso, painel administrativo e armazenamento local no navegador (`localStorage`).

## Estrutura

- `frontend/`: catálogo público e painel administrativo
- `backend/` e `api/`: handlers originalmente preparados para Vercel

## Desenvolvimento

```sh
npm install
node /workspace/.ostenty-tools/dev.cjs
```

Abra o site servido na porta 3000. Acesse **Administração** para cadastrar, editar, importar e remover produtos. Os dados permanecem no navegador e não são sincronizados entre dispositivos. Limpar os dados do navegador também apaga o catálogo salvo nele.

As fotos iniciais estão em `frontend/assets/products/`, separadas por categoria e acabamento. Na primeira visita, o navegador importa os produtos da lista inicial para o catálogo local. Os nomes e códigos são provisórios, derivados dos nomes das fotos; preços ficam como “Preço sob consulta” até serem preenchidos no painel.

## Instalar no celular

O site é um PWA instalável. Abra o domínio Netlify em um navegador compatível e toque em **Instalar app**. No iPhone/iPad, abra no Safari, toque em **Compartilhar** e escolha **Adicionar à Tela de Início**. O app mantém o catálogo local disponível offline e guarda em cache até 120 fotos que já foram abertas.

## Hospedar no Cloudflare Pages

Importe este repositório no Cloudflare Pages e selecione a branch `main`, preset `None`, comando de build `echo static` e diretório de saída `.`. A página inicial fica na raiz e o service worker também, para permitir a instalação do PWA. O Cloudflare Pages não adiciona selo de marca ao site.

## Configurar acesso administrativo no Cloudflare

O login usa Pages Functions e D1. As contas recebem uma senha pessoal; o Cloudflare Access verifica por código os e-mails ADM antes de liberar o painel.

1. Em **Workers & Pages → D1 SQL Database**, crie o banco `ostenty-admin-auth` se ainda não existir.
2. No projeto Pages, abra **Settings → Functions → D1 database bindings** e vincule o banco como `DB`.
3. No console do D1, execute `migrations/0001_admin_auth.sql`, `migrations/0002_admin_user_name.sql` e `migrations/0003_admin_access.sql` conforme necessário.
4. Em **Zero Trust → Access → Applications**, crie uma aplicação Self-hosted para `ostenty-catalogo.pages.dev` e o caminho `/api/auth/admin-verify`. Configure uma política Allow para os três e-mails ADM e habilite **One-time PIN**.
5. Copie o **AUD tag** dessa aplicação e o domínio da equipe (`<equipe>.cloudflareaccess.com`). No projeto Pages, em **Settings → Variables and secrets**, cadastre `ACCESS_AUD` e `ACCESS_TEAM_DOMAIN` para Production.
6. Remova o secret antigo `ADMIN_TEMP_PASSWORD`, que não é mais usado, e faça um novo deploy.

Qualquer pessoa pode criar uma conta com nome, e-mail e senha própria. Depois do login, contas comuns acessam Início e Catálogo. O servidor libera o painel somente após validar a confirmação do Cloudflare Access para os e-mails ADM, mantidos apenas no código do servidor. Senhas são armazenadas com PBKDF2 e as sessões usam cookie HTTP-only.

## PDFs

No painel, gere catálogos completos, PDFs com as categorias marcadas ou PDFs individuais diretamente para download.
