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

Importe este repositório no Cloudflare Pages e selecione a branch `main`, preset `None`, comando de build `echo static` e diretório de saída `.`. O arquivo `_redirects` encaminha a página inicial para o frontend; o service worker fica na raiz para permitir a instalação do PWA. O Cloudflare Pages não adiciona selo de marca ao site.

## PDFs

No painel, gere catálogos completos, PDFs com as categorias marcadas ou PDFs individuais diretamente para download.
