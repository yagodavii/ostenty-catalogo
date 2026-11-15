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

## PDFs

No painel, gere catálogos completos ou separados por categoria. O navegador abre a janela de impressão; escolha **Salvar como PDF**.
