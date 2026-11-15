# OSTENTY SEMIJOIAS — Catálogo digital

Catálogo digital responsivo com painel administrativo aberto e armazenamento local no navegador (`localStorage`). Não requer banco de dados nem credenciais de administrador.

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

O painel usa Cloudflare Pages Functions e D1 para restringir a autenticação aos três e-mails autorizados no código. Para ativar o login:

1. Em **Workers & Pages → D1 SQL Database**, crie um banco chamado `ostenty-admin-auth`.
2. No projeto Pages, abra **Settings → Functions → D1 database bindings**, adicione o banco criado com o nome de variável `DB` e salve.
3. No console do D1, execute o conteúdo de `migrations/0001_admin_auth.sql` e, se já havia criado as tabelas, execute também `migrations/0002_admin_user_name.sql`.
4. Em **Settings → Environment variables**, crie `ADMIN_TEMP_PASSWORD` como secret com a senha temporária que será compartilhada apenas com os três administradores.
5. Aguarde um novo deploy do Pages. No primeiro acesso, cada administrador entra ou cria o acesso usando o e-mail autorizado e a senha temporária; o sistema exige a troca por uma senha própria.

As contas permitidas são `yagodavi012@hotmail.com`, `juliamendesperes@gmail.com` e `ostentysemijoiasbr@gmail.com`. O servidor valida esses endereços, armazena senhas com PBKDF2 e mantém sessões em cookie HTTP-only. O catálogo público continua acessível sem login.

## PDFs

No painel, gere catálogos completos, PDFs com as categorias marcadas ou PDFs individuais diretamente para download.
