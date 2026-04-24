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

## Onde colocar imagens do app

A landing tem **4 spots marcados** pra você dropar screenshots. Cada spot mostra um placeholder com o nome e tamanho ideal — é só substituir por uma tag `<img>`.

| Spot | Local                                   | Tamanho ideal | O que colocar                                             |
|------|-----------------------------------------|---------------|-----------------------------------------------------------|
| 1    | Hero (logo abaixo do CTA)               | 1600×960px    | Screenshot principal do app (tela de gerar ou resultado)  |
| 2    | Mecanismo — Card 01 "Geração"           | 1200×720px    | Print do formulário (seletor de série/BNCC/nível)         |
| 3    | Mecanismo — Card 02 "Validação"         | 1200×720px    | Print da questão gerada com gabarito                      |
| 4    | Mecanismo — Card 03 "PDF"               | 1200×720px    | Print do PDF final ou preview da prova formatada          |

**Como substituir um spot:**

1. Salve a imagem em `landing/assets/` (ex: `hero-app.png`)
2. No `index.html`, procure o comentário `<!-- 📸 SPOT X: ... -->` correspondente
3. Troque a `<div class="img-placeholder">...</div>` por uma tag `<img>`:

```html
<!-- Antes -->
<div class="hero-image-slot" aria-label="...">
  <div class="img-placeholder">...</div>
</div>

<!-- Depois -->
<div class="hero-image-slot">
  <img src="assets/hero-app.png" alt="Tela do ProMat" class="hero-image" />
</div>
```

**Dicas de conteúdo pras imagens:**
- Prefira screenshots **limpos** do app (sem dados pessoais de usuários reais).
- Use zoom suficiente pra o texto ficar legível (mesmo em mobile).
- Pra o Spot 1 (hero), uma captura com **bordas arredondadas e sombra leve** fica melhor que screenshot cru do navegador.
- Se não tiver screenshot ainda, deixe o placeholder — ele já mostra o layout final.

## Outros assets

1. **Logo** — substituir `assets/logo.png` (ou reapontar para `../frontend/assets/img/logoComFundo.png`).
2. **OG image** — adicionar `assets/og-image.png` (1200×630) pra link preview.

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
