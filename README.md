# OSTENTY SEMIJOIAS — Catálogo digital

Implementação local da landing page, catálogo público e painel administrativo da OSTENTY SEMIJOIAS.

## Como executar

Abra `index.html` no navegador ou sirva a pasta com qualquer servidor estático:

```powershell
python -m http.server 4173
```

O projeto não inclui produtos fictícios. O catálogo começa vazio e passa a exibir os produtos cadastrados/importados no navegador.

## Funcionalidades incluídas

- Landing page responsiva seguindo a paleta OSTENTY.
- Catálogo público com busca, sete categorias, detalhes e seleção para WhatsApp.
- Painel administrativo com acesso local, métricas, cadastro, edição, ativação/desativação e exclusão.
- Importação CSV com prévia, validação de campos, categoria e códigos duplicados.
- Relacionamento opcional de imagens por nome de arquivo igual ao código do produto.
- Geração de catálogo para impressão, com seleção de categorias e opção “Salvar como PDF”.
- Persistência local no navegador via `localStorage`.

## Formato CSV

A primeira linha deve conter os títulos. Os campos suportados são:

```text
codigo,nome,descricao,preco,categoria,status,imagem
```

Categorias aceitas: `Colares`, `Brincos`, `Argolas`, `Anéis`, `Conjuntos`, `Pingentes` e `Pulseiras`.

## Observação de produção

Esta entrega é uma versão front-end funcional para validação e operação local. Para uso multiusuário em produção, o `localStorage` deve ser substituído por uma API com banco de dados, autenticação real e storage de imagens (por exemplo, S3/R2). A camada visual e os fluxos administrativos já estão preparados para essa integração.
