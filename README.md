# 💍 OSTENTY SEMIJOIAS — Catálogo digital

Catálogo digital responsivo para apresentar semijoias, organizar produtos por categoria e acabamento e facilitar a consulta de peças. O projeto reúne uma vitrine pública, contas de acesso, um painel administrativo e recursos para gerar catálogos em PDF.

O catálogo inicial é montado a partir das imagens do repositório. Os produtos e as alterações feitas no navegador ficam salvos localmente, permitindo personalizar a vitrine sem depender de um serviço de catálogo remoto.

## 🎯 Problema resolvido

Um catálogo de produtos precisa ser fácil de consultar e simples de atualizar. Listas dispersas de fotos dificultam a busca por categoria, acabamento e preço, enquanto atualizações manuais tornam a divulgação mais trabalhosa.

Este projeto organiza as peças em uma vitrine que permite:

- Explorar os produtos por categoria
- Pesquisar e filtrar peças
- Consultar fotos, códigos e preços
- Cadastrar, editar, importar e remover produtos pelo painel administrativo
- Gerar catálogos completos, por categoria ou por produto
- Instalar o site como aplicativo e consultar conteúdo já carregado sem conexão

## 💼 Aplicações e valor para o negócio

O catálogo pode apoiar atividades como:

- Apresentação digital de coleções de semijoias
- Consulta de produtos por clientes e equipe de vendas
- Organização de peças por categoria e acabamento
- Atualização de preços e informações do catálogo
- Criação de materiais em PDF para compartilhar
- Divulgação de produtos em dispositivos móveis

A interface centraliza a apresentação dos produtos e oferece ferramentas para manter as informações da vitrine atualizadas.

## 🚀 Recursos

### 1. 🛍️ Vitrine de produtos

A área pública apresenta as peças com imagem, nome, código, categoria, acabamento e preço quando informado. A busca e os filtros ajudam a encontrar produtos no catálogo.

**Categorias disponíveis:**

- Colares
- Brincos
- Argolas
- Anéis
- Conjuntos
- Pingentes
- Pulseiras
- Bracelete

### 2. 🔐 Contas e acesso administrativo

Usuários podem criar uma conta com nome, e-mail e senha e acessar as áreas disponíveis após o login. O painel administrativo é reservado às contas autorizadas. Para os e-mails administrativos, a confirmação é feita pelo Cloudflare Access com código de uso único.

As senhas são armazenadas com PBKDF2 e as sessões utilizam cookies HTTP-only. A autenticação de produção usa Cloudflare Pages Functions e um banco Cloudflare D1.

### 3. 🧰 Painel de gerenciamento

O painel permite cadastrar, editar, importar e remover produtos, além de atualizar informações como fotos, categoria, acabamento e preço. As alterações do catálogo são armazenadas no `localStorage` do navegador e não são sincronizadas automaticamente entre dispositivos.

Na primeira visita, os produtos iniciais são carregados a partir das fotos incluídas no repositório. Os nomes e códigos iniciais são provisórios; os preços podem ser preenchidos pelo painel.

### 4. 📄 Geração de PDFs

O painel pode gerar um catálogo completo, um documento com as categorias selecionadas ou um PDF individual de produto para download.

### 5. 📱 Aplicativo instalável

O site inclui manifesto e service worker para instalação como PWA. Fotos já abertas podem ser mantidas em cache para consulta offline; o catálogo salvo no navegador também pode ser aberto no mesmo dispositivo.

## 🏗️ Estrutura do repositório

```text
ostenty-catalogo/
├── frontend/
│   ├── assets/products/         # Fotos organizadas por categoria e acabamento
│   ├── icons/                   # Ícones do PWA
│   ├── vendor/                  # Biblioteca local para geração de PDFs
│   ├── app.js                   # Interações da vitrine e do painel
│   ├── index.html               # Interface do catálogo
│   ├── manifest.webmanifest     # Configuração do aplicativo instalável
│   ├── products-seed.js         # Produtos iniciais
│   └── styles.css               # Estilos da interface
├── functions/                   # Cloudflare Pages Functions de autenticação
├── migrations/                  # Migrações SQL do banco D1
├── index.html                   # Entrada publicada na raiz
├── service-worker.js            # Cache do PWA
└── README.md
```

## ⚙️ Stack utilizada

- HTML, CSS e JavaScript
- `localStorage` para persistência local do catálogo
- Cloudflare Pages Functions para autenticação
- Cloudflare D1 para contas e sessões
- Cloudflare Access para confirmação de e-mails administrativos
- jsPDF para geração de catálogos em PDF
- PWA, manifesto e service worker para instalação e cache
- Cloudflare Pages para hospedagem

## ▶️ Como executar

O site é estático e não possui etapa de compilação. Para servir os arquivos localmente, use um servidor HTTP simples, por exemplo:

```sh
python3 -m http.server 3000
```

Abra `http://localhost:3000` no navegador. Essa visualização permite explorar a interface e os arquivos estáticos. As rotas de autenticação precisam das Cloudflare Pages Functions e de um vínculo D1 para funcionar.

Para executar as Functions localmente, prepare o Wrangler e configure um binding D1 local chamado `DB`, usando as migrações em `migrations/`. Depois inicie o ambiente do Pages com:

```sh
npx wrangler pages dev .
```

## ☁️ Publicação no Cloudflare Pages

Importe o repositório no Cloudflare Pages e selecione a branch `main`. Como o site é estático, use o preset `None`, o comando de build `echo static` e o diretório de saída `.`. A página inicial e o service worker estão na raiz do projeto.

### Configuração da autenticação administrativa

1. Crie ou selecione o banco D1 `ostenty-admin-auth`.
2. No projeto Pages, vincule o banco como `DB` nas configurações de D1.
3. Aplique as migrações SQL em `migrations/` na ordem numérica.
4. No Cloudflare Zero Trust, crie uma aplicação Self-hosted para o domínio do catálogo e o caminho `/api/auth/admin-verify`.
5. Configure uma política Allow para os e-mails administrativos e habilite o código One-time PIN.
6. Cadastre `ACCESS_AUD` e `ACCESS_TEAM_DOMAIN` como variáveis do ambiente Production no projeto Pages.
7. Faça um novo deploy para aplicar a configuração.

As contas comuns podem criar um acesso próprio. A liberação do painel administrativo depende da validação do Cloudflare Access para os e-mails autorizados definidos no servidor.

## 📲 Instalar no celular

Abra o domínio publicado em um navegador compatível e use a opção **Instalar app**. No iPhone ou iPad, abra o site no Safari, toque em **Compartilhar** e escolha **Adicionar à Tela de Início**. As fotos entram no cache conforme são abertas; o armazenamento do catálogo permanece vinculado ao navegador e dispositivo utilizados.

## 🔄 Fluxo do catálogo

```text
Fotos e produtos iniciais
          ↓
Vitrine no navegador
          ↓
Busca e filtros por categoria
          ↓
Consulta ou gerenciamento de produtos
          ↓
Catálogo digital ou PDF
```

As fotos e informações iniciais alimentam a vitrine. O usuário pode consultar produtos e, com acesso administrativo, manter o catálogo local atualizado e gerar arquivos para compartilhar.

## 🧠 O que este repositório demonstra

- Desenvolvimento de interfaces responsivas para catálogo digital
- Organização e filtragem de produtos
- Persistência de dados no navegador
- Autenticação e controle de acesso administrativo
- Integração de Cloudflare Pages Functions com D1
- Geração de PDFs a partir de dados da aplicação
- Recursos PWA para instalação e uso offline
- Preparação de uma aplicação estática para hospedagem em nuvem

## 📈 Possibilidades de evolução

O projeto pode evoluir com sincronização entre dispositivos, gestão centralizada de produtos e imagens, integração com estoque e pedidos, compartilhamento de listas, analytics de consulta e geração de links por coleção.

## 🎯 Objetivo do repositório

O objetivo deste repositório é oferecer uma experiência prática de catálogo digital para semijoias, reunindo apresentação de produtos, ferramentas de gerenciamento e geração de materiais para compartilhamento.
