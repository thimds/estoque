# Sistema de Pedidos — Grupo

App de controle de estoque, custo e pedidos via WhatsApp para 5 restaurantes.
Hospedado na Netlify — sem servidor, sem banco de dados, funciona 100% no navegador.

## Restaurantes
| Casa | Link |
|---|---|
| Tikô | `/tiko` |
| Koya88 | `/koya` |
| Yug | `/yug` |
| Bagaceira | `/bagaceira` |
| Krozta | `/krozta` |

## Funcionalidades
- Controle de estoque com custo por unidade
- Cálculo automático de valor total do estoque
- Pedidos via WhatsApp formatados por categoria
- Exportação de inventário para CSV/Excel
- Entrada por voz (Chrome/Safari)
- Conversor de embalagem (ml→L, g→kg, etc.)
- Cadastro de novos produtos por casa

## Deploy na Netlify
1. Acesse [app.netlify.com/drop](https://app.netlify.com/drop)
2. Arraste a pasta `pedidos-app/` inteira
3. Pronto — URL gerada na hora

## Estrutura
```
index.html        → Landing page
tiko.html         → App Tikô
koya.html         → App Koya88
yug.html          → App Yug
bagaceira.html    → App Bagaceira
krozta.html       → App Krozta
app.css           → Estilos compartilhados
base.js           → Lógica compartilhada + catálogo base
logos/            → Logos dos restaurantes
```
