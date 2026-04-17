# 📐 ProMat — Assistente de Exercícios para Professores de Matemática

Sistema web para geração de exercícios, provas e atividades de Matemática prontos para impressão, com integração com IA.

---

## 🚀 Início Rápido

### 1. Configurar o Backend

```bash
cd backend
npm install
```

Copie o arquivo de ambiente:

```bash
copy .env.example .env
```

Edite o `.env` e adicione sua chave de API:

```
OPENAI_API_KEY=sk-...
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
```

### 2. Iniciar o servidor

```bash
npm run dev
```

O backend estará disponível em: `http://localhost:3001`

### 3. Abrir o Frontend

Abra o arquivo `frontend/index.html` diretamente no navegador, ou use uma extensão como "Live Server" no VS Code.

---

## 📂 Estrutura do Projeto

```
matematica-professor/
├── backend/
│   ├── routes/
│   │   └── gerar.js          # Rotas da API
│   ├── services/
│   │   ├── aiService.js       # Abstração do provedor de IA
│   │   └── promptBuilder.js   # Construtor de prompts
│   ├── .env.example           # Template de variáveis de ambiente
│   ├── .gitignore
│   ├── package.json
│   └── server.js              # Servidor principal
└── frontend/
    ├── css/
    │   └── styles.css         # Design system completo
    ├── js/
    │   ├── api.js             # Cliente HTTP para o backend
    │   ├── app.js             # Lógica principal da aplicação
    │   └── printer.js         # Módulo de impressão
    └── index.html             # Interface principal
```

---

## 🧩 Funcionalidades

| Funcionalidade           | Descrição |
|--------------------------|-----------|
| ✅ Gerar lista de exercícios | Por série, tema, nível e quantidade |
| ✅ Gerar prova completa | Com estrutura formal de avaliação |
| ✅ Gabarito automático | Separado da lista principal |
| ✅ Versão para impressão | Layout limpo e otimizado |
| ✅ Gerar outra lista | Nova variação do mesmo tema |
| ✅ Atividade extra / Desafio | Conteúdo diferenciado |
| ✅ Explicação do tema | Com exemplos do cotidiano |

---

## 🔌 API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/api/gerar/exercicios` | Gera lista de exercícios |
| `POST` | `/api/gerar/prova` | Gera prova completa |
| `POST` | `/api/gerar/atividade-extra` | Gera atividade/desafio |
| `POST` | `/api/gerar/explicacao` | Gera explicação do tema |
| `GET`  | `/api/health` | Status do servidor |

### Exemplo de requisição

```json
POST /api/gerar/exercicios
{
  "serie": "7ano",
  "tema": "equação do 1º grau",
  "nivel": "medio",
  "quantidade": 10
}
```

---

## 💰 Controle de Custos

- Modelo padrão: `gpt-4o-mini` (mais econômico)
- Máximo de 20 exercícios por geração
- Máximo de 2000 tokens por resposta
- Rate limiting: 30 req / 15 min por IP
- Máximo de 10 regenerações consecutivas por sessão

---

## 🔄 Troca de Provedor de IA

Para trocar de OpenAI para outro provedor, edite o `.env`:

```
AI_PROVIDER=gemini
GEMINI_API_KEY=AIza...
```

E implemente o adaptador correspondente em `backend/services/aiService.js`.

---

## 📄 Licença

Uso interno — Projeto educacional.
