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

## PDFs

No painel, gere catálogos completos ou separados por categoria. O navegador abre a janela de impressão; escolha **Salvar como PDF**.
