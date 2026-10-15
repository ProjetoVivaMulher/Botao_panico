# Relatório — Botão de Pânico Viva Mulher

**Período:** 15/10/2026
**Escopo:** correção de falhas, implementação do banco de dados, reforço de segurança e publicação do backend.
**Responsável técnico:** Math3usF

---

## 1. Objetivo

Consolidar em uma branch única as correções de bugs, a repaginação do app (mais simples e
intuitivo), a criação do **cadastro único** com banco de dados e o **reforço de segurança**,
e então publicar tudo (backend na Vercel + frontend atualizado).

**Regra de ouro mantida:** o **cadastro/reconfirmação nunca bloqueia** o acionamento do
botão de pânico.

---

## 2. Falhas corrigidas

| # | Arquivo | Falha | Impacto |
|---|---------|-------|---------|
| 1 | `js/audio.js` | Chave/`};` faltando fechando um bloco | Erro de sintaxe — quebrava o módulo de áudio |
| 2 | `backend/middleware/validate.js` | `validateCoordinates` não fechava e não chamava `next()` | Requisições travavam/erro de middleware |
| 3 | `backend/services/metricsService.js` e `backend/routes/metrics.js` | Funções declaradas como `async` e usadas de forma síncrona | Erros nas métricas |
| 4 | `backend/routes/users.js` + repositório | `usersRepository.ensureAccessToken` **não existia** | **Login retornava 500** (quebrado) |
| 5 | `backend/routes/audio.js` | `mkdirSync('uploads')` no carregamento do módulo | Na Vercel (disco somente leitura) → **erro 500 em toda request** (`EROFS`) |
| 6 | `backend/services/logger.js` | Gravava logs em `backend/data/logs.jsonl` | Mesmo problema: escrita em disco read-only derrubava a request |
| 7 | `backend/app.js` | `app.js` era detectado como entrypoint Express pela Vercel | Erro `Invalid export found in module /var/task/app.js` |
| 8 | `js/user.js` | Bug no envio do `pin` em `updateConsent` | Consentimento não atualizava corretamente |
| 9 | Número da Central de Socorro | Número **provisório** espalhado/duplicado no código | Difícil trocar; risco de divergência |
| 10 | Renderização de dados | Valores inseridos no HTML sem escape | Vulnerabilidade de XSS |

---

## 3. O que foi implementado

### 3.1 Banco de dados (Turso / libSQL)
- Banco **Turso (libSQL/SQLite)**: DB `viva-mulher`, região São Paulo (`aws-sa-east-1`).
- Camada de dados criada:
  - `backend/db/database.js` — cliente (normaliza `turso://` → `libsql://`).
  - `backend/db/schema.js` — tabelas `users`, `contacts`, `alerts` + índices (idempotente).
  - `backend/repositories/usersRepository.js` — leitura/escrita e regras de negócio.
  - `backend/migrations/init.js` — `npm run migrate` (imprime `remote-turso` quando remoto).
- Desenvolvimento local continua usando arquivo SQLite; produção usa o Turso via variáveis
  de ambiente.

### 3.2 Cadastro único
- Dados: **nome completo**, **telefone (BR válido)**, **data de nascimento** e **PIN opcional**.
- Reconfirmação a cada **45 dias** ("manter ativo").
- Cadastro e reconfirmação **não impedem** o pânico (regra de ouro).

### 3.3 Segurança reforçada
- **Token de acesso opaco por usuária** (header `x-user-token`): protege `GET`, `confirm`,
  `consent` e `DELETE` de `/api/users/:id` — o `id` não pode ser adivinhado.
- **Bloqueio temporário** da conta após **5 PINs errados** (15 minutos).
- **Rate limiting** por rota: geral (`/api/`), cadastro, criação de alertas e login.
- **CORS por allowlist** (`ALLOWED_ORIGINS`; `ALLOW_VERCEL=0` por padrão).
- **LGPD**: exclusão de dados (`DELETE`) e registro de consentimento (LGPD e localização).
- Resposta `409` do cadastro **não expõe** o `userId`.
- Valores escapados no front (anti-XSS) e headers de segurança HTTP.

### 3.4 PIN único (cadastro + saída do disfarce)
- O **PIN do cadastro** é o **mesmo código para sair do modo disfarce** (fallback `7777`).
- Guardado no perfil local (funciona offline); o servidor guarda apenas o **hash (sha256)**.

### 3.5 Interface / UX
- Seção de **Privacidade/LGPD** agora é recolhível (fechada por padrão).
- Removido botão redundante de instalação no hero.
- Centralização do contato da Central em um único ponto de configuração.
- Cache do PWA atualizado para **v111**.

### 3.6 Publicação e infraestrutura
- **Backend** publicado na Vercel:
  - URL: **https://botao-panico-viva-mulher.vercel.app**
  - Projeto com **Root Directory = `backend`**, Framework desativado e **auto-deploy pelo Git**
    (a cada push na `main`).
  - Variáveis de ambiente (produção): `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`,
    `DEFAULT_SOCORRO_PHONE`, `ADMIN_USER`, `ADMIN_PASSWORD`, `ALLOWED_ORIGINS`.
- **Frontend** publicado: **https://botao-panico-ten.vercel.app**
  - Aponta para a API publicada via `window.VIVA_API_BASE`.
- **Dependências**: `npm audit` do backend **zerado** (0 vulnerabilidades); `nodemon` (só dev)
  substituído por `node --watch`.

---

## 4. Arquitetura (resumo)

```
frontend (Vercel)            backend (Vercel, serverless)
index.html / js/*.js   --->  api/index.js  ->  app.js (Express)
                                              ├─ routes/       (users, alerts, contacts, audio, metrics, notifications)
                                              ├─ repositories/ (+ Turso)
                                              ├─ services/     (validação, logs, métricas)
                                              └─ middleware/   (auth, segurança, erros)
                                                     |
                                                     v
                                              Turso (libSQL/SQLite)
```

---

## 5. Validação (testes realizados no ambiente publicado)

- `GET /api/health` → **200** (API online).
- `GET /api/contacts` → lê o banco Turso corretamente.
- **CORS**: requisição vinda de `https://botao-panico-ten.vercel.app` liberada.
- **Cadastro**: retorno `409` para telefone já existente (registro gravado no Turso).
- **Login**: retorno **200** com token de acesso (64 caracteres).
- **LGPD (exclusão)**: `DELETE` autenticado apagou os dados (registro de teste removido).
- **Auto-deploy por Git**: build disparado por push na `main` validado como **Ready**.

---

## 6. Pendências / próximos passos

1. **Contato da Central de Socorro** — ainda **provisório** (`552139553874`). Definir o número
   oficial e trocar em **2 pontos**: `js/config.js` e `backend/.env` / variável na Vercel.

### Resolvido após a primeira versão deste relatório (15/10/2026)
- **Áudio de evidência** — agora é gravado e **persistido no próprio aparelho** (IndexedDB,
  `js/audio-store.js`): o histórico guarda o id do áudio e a reprodução é recriada ao abrir o
  app, funcionando **offline** e sobrevivendo a recarregamentos. Não depende mais do disco do
  servidor. (Cache PWA `v112`.)
- **Dependências / Dependabot** — `multer` atualizado para **2.x** e criado
  `.github/dependabot.yml` (atualização semanal do backend). `npm audit` = **0**. Os alertas
  antigos do Dependabot fecham automaticamente no próximo re-scan da branch padrão.

---

## 7. Acessos e credenciais (referência)

- Repositório: `https://github.com/ProjetoVivaMulher/Botao_panico` (branch `main`).
- Backend: `https://botao-panico-viva-mulher.vercel.app`
- Frontend: `https://botao-panico-ten.vercel.app`
- Banco: Turso — DB `viva-mulher` (credenciais em `backend/.env`, fora do versionamento).
