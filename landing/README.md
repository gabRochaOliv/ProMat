# ProMat — Landing de tráfego pago

Landing isolada do app principal. Vanilla HTML/CSS/JS, zero dependências de build.

## Como rodar

Basta abrir `index.html` em qualquer navegador, ou servir com um static server:

```bash
# Opção 1: abrir direto
start index.html

# Opção 2: servidor estático (qualquer um serve)
npx serve .
# ou
python -m http.server 8080
```

## Estrutura

```
landing/
├── index.html      # Marcação + copy (não editar copy sem aprovação — é estratégica)
├── styles.css      # Design tokens herdados do app + layout
├── script.js       # Nav sticky, scroll-spy do mecanismo, roteamento de CTA
├── assets/
│   └── logo.png    # Logo reaproveitada de frontend/assets/img/logoComFundo.png
└── README.md
```

## Tokens herdados do app

Cores extraídas de `frontend/css/styles.css` (não invente paleta):

| Token       | Hex       | Uso                                 |
|-------------|-----------|-------------------------------------|
| brand-500   | `#14b8a6` | Accents, glows, highlights em texto |
| brand-600   | `#0d9488` | CTAs (bg padrão)                    |
| brand-700   | `#0f766e` | Hover de elementos brand            |
| brand-50    | `#f0fdfa` | Backgrounds suaves (chips, ícones)  |
| brand-200   | `#99f6e4` | Bordas de chip / hover              |

Tipografia:
- **Inter** — body e UI (mesma do app)
- **Plus Jakarta Sans** — display / CTAs (mesma do app)
- **Lora** — headlines serif emocionais (adicionada pra landing)

## Como trocar assets

1. **Logo** — substituir `assets/logo.png` (ou reapontar para `../frontend/assets/img/logoComFundo.png`).
2. **Preview do hero** — editar `.preview-placeholder` em `index.html` → substituir por `<img>` ou `<video>` com screenshot real do app.
3. **Demo (seção 8)** — trocar `.demo-placeholder` por `<video>` ou `<iframe>` (aspect 16:9 já reservado).
4. **OG image** — adicionar `assets/og-image.png` (1200×630) pra link preview.

## CTA → Signup

Todos os CTAs vão para `SIGNUP_URL` em `script.js`. Ajuste essa constante no deploy:

```js
// script.js
const SIGNUP_URL = 'https://seuapp.promat.app/?ref=lp&action=signup';
```

O `data-cta` de cada botão é propagado como query param `?cta=hero|nav|final|demo|ps` pra identificar qual seção converteu.

## Isolamento do app

- **Não importa** nada do `frontend/` do app (exceto a imagem da logo copiada).
- **Não toca** em código do backend ou do app principal.
- Pode ser deployada separadamente (Vercel static, Cloudflare Pages, Netlify, etc.)
  apontando apenas para `landing/`.
