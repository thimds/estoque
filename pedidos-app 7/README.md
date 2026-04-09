# Sistema de Pedidos — Grupo

App de controle de estoque e geração de pedidos via WhatsApp para 5 restaurantes.

## Arquivos

```
index.html        → Landing page (seleção de restaurante)
tiko.html         → App do Tikô
koya.html         → App do Koya88
yug.html          → App do Yug
bagaceira.html    → App da Bagaceira
krozta.html       → App do Krozta
app.css           → Estilo compartilhado
base.js           → Lógica compartilhada + catálogo base
```

## Deploy na Vercel (5 minutos, gratuito)

1. Acesse https://vercel.com e crie uma conta gratuita (pode usar Google)
2. No dashboard, clique em **"Add New → Project"**
3. Selecione **"Upload"** e arraste a pasta inteira `pedidos-app/`
4. Clique em **Deploy**
5. Pronto! Você receberá uma URL como `pedidos-grupo.vercel.app`

## Links de cada restaurante

Após o deploy, compartilhe com os responsáveis:

- Landing:    `seusite.vercel.app/`
- Tikô:       `seusite.vercel.app/tiko`
- Koya88:     `seusite.vercel.app/koya`
- Yug:        `seusite.vercel.app/yug`
- Bagaceira:  `seusite.vercel.app/bagaceira`
- Krozta:     `seusite.vercel.app/krozta`

## Como usar

1. Chef abre o link do seu restaurante
2. Preenche a coluna **"Em estoque"** com a contagem atual
3. Preenche **"Pedir"** com a quantidade a comprar
4. Clica em **"Exportar para WhatsApp"**
5. A mensagem é copiada — só colar no zap do fornecedor

Os dados ficam salvos no navegador (localStorage) — ao reabrir, os estoques aparecem preenchidos.

## Adicionar produtos

Cada restaurante pode adicionar seus próprios produtos pela aba **"+ Produto"** dentro do app.

## Personalizar listas por restaurante

Edite o arquivo `base.js` ou os extras dentro de cada `.html` para ajustar produtos específicos.
