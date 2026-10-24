# Viva Mulher — Botão de Pânico Comunitário

> **Práticas Extensionistas Integradoras III (PE III) — Engenharia de Software 2026.2**  
> **Universidade de Vassouras (FUSVE) — Campus Saquarema**  
> **Docente Orientadora:** Profª. Laís Cristine Bordallo Pinheiro ([@LaisBordallo](https://github.com/LaisBordallo))

🌐 **Aplicação Online (PWA):** [https://viva-mulher-navy.vercel.app/](https://viva-mulher-navy.vercel.app/)  
🔌 **API / Backend publicado:** [https://botao-panico-viva-mulher.vercel.app](https://botao-panico-viva-mulher.vercel.app) ([health check](https://botao-panico-viva-mulher.vercel.app/api/health))

---

## 📌 Sumário
1. [Visão Geral & Território](#-visão-geral--território)
2. [Funcionalidades do Aplicativo](#-funcionalidades-do-aplicativo)
3. [Segurança, Privacidade & LGPD](#-segurança-privacidade--lgpd)
4. [Arquitetura & Stack Tecnológica](#-arquitetura--stack-tecnológica)
5. [Deploy & Links](#-deploy--links)
6. [Documentos do Projeto & Extensão (P1)](#-documentos-do-projeto--extensão-p1)
7. [Equipe de Desenvolvimento](#-equipe-de-desenvolvimento)

---

## 📍 Visão Geral & Território

O **Botão de Pânico Viva Mulher** é um módulo de apoio comunitário e segurança digital voltado a mulheres em situação de vulnerabilidade no município de **Saquarema - RJ**, articulado em parceria com a rede local de proteção (CRAM - Centro de Referência e Atendimento à Mulher / Secretaria Municipal da Mulher).

> ⚠️ **Aviso de Responsabilidade e Simulação Acadêmica:**  
> Este aplicativo é um recurso de apoio comunitário e **não substitui os canais oficiais de emergência**. Em caso de risco iminente à vida, deve-se priorizar o contato telefônico direto com a **Polícia Militar (190)** ou a **Central de Atendimento à Mulher (180)**.

---

## 📱 Funcionalidades do Aplicativo

* **Disparo em um toque (sem cadastro obrigatório):** o pânico funciona sem login e sem confirmação — um toque aciona o socorro, grava o áudio e abre o WhatsApp. Uma trava de 4 s evita disparo duplo por toque acidental.
* **Três abas:** **Início** (botão de pânico de 184 px), **Provas** e **Pessoas**. O SOS continua sempre acessível nas abas internas por um botão flutuante.
* **Envio para pessoa de confiança + Central:** o alerta é registrado no painel da Central (`POST /api/alerts`, funciona até anonimamente) e o WhatsApp abre preenchido para a primeira pessoa de confiança e para a Central.
* **“Avisar agora” por pessoa:** na aba Pessoas, cada contato tem um botão que monta o alerta real com a localização atual e abre o WhatsApp daquela pessoa.
* **Documentos e provas (100% local):** fotos, vídeos, arquivos e áudios ficam em IndexedDB no próprio aparelho, com prévia, download, compartilhamento e exclusão. Nada é enviado a servidor.
* **Áudio de evidência de 15 s:** gravado automaticamente no acionamento (vira prova) ou manualmente na aba Provas.
* **Captura de Geolocalização (GPS):** permissão pedida por gesto (compatível com iOS), leitura em cache para resposta imediata, link do Google Maps e fallback quando o sinal não está disponível.
* **Mensagem Padronizada:** identificador único do evento (`EVT-AAAA-MM-DD-NNNN`), data, horário e localização para envio via WhatsApp (`wa.me`).
* **Modo Camuflado (Calculadora de Proteção):** interface disfarçada de calculadora funcional, com retorno pelo PIN secreto.
* **Canais Diretos de Emergência Pública:** atalhos nativos de discagem rápida para **190** (Polícia Militar), **180** (Central da Mulher) e **192** (SAMU).
* **Acessibilidade:** leitor de tela, vibração, sinal luminoso no disparo (para usuárias surdas) e VLibras.
* **PWA Instalável e Offline:** instalação na tela inicial (Android/iOS), cache via Service Worker (`sw.js`) e registro local que nunca depende de internet.

---

## ⚖️ Segurança, Privacidade & LGPD

* **Consentimento Prévio:** termo explícito (LGPD) para localização e áudio, com base legal de proteção da vida (art. 7º, VII e art. 11, II, “f”), persistido mesmo sem cadastro.
* **Cadastro nunca bloqueia o socorro:** o pânico funciona sem cadastro, sem login e sem confirmação.
* **PIN protegido:** o código do modo camuflado é guardado apenas como hash SHA-256 (`pinHash` + `pinLength`), com migração automática de versões antigas.
* **Armazenamento Local e Descarte:** histórico, provas e pessoas de confiança ficam no próprio aparelho (`localStorage` + IndexedDB), com botão de limpeza total a qualquer momento.
* **Provas não saem do aparelho:** fotos, vídeos e áudios de evidência não são enviados ao servidor.
* **Proteção contra Injeção (XSS):** sanitização rigorosa via `escapeHtml()` em todos os campos de texto.
* **Cabeçalhos de segurança:** CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy` definidos em `vercel.json`.
* **Logs com Anonimização:** mascaramento de números de telefone e dados sensíveis no backend conforme diretrizes da LGPD.

---

## 🛠️ Arquitetura & Stack Tecnológica

* **Frontend:** HTML5, CSS3 moderno (CSS Variables, Flexbox/Grid) e JavaScript Vanilla modular — `app.js`, `contacts.js`, `geolocation.js`, `emergency-message.js`, `evidence.js` / `evidence-store.js` (IndexedDB), `audio.js` / `audio-store.js`, `camouflage.js`, `accessibility.js`, `pwa-install.js`.
* **Backend:** Node.js + Express 4, com **libSQL/Turso** (`@libsql/client`) — mesmo dialeto SQLite em produção e em desenvolvimento (`backend/data/viva_mulher.db`). Rotas para chamados, pessoas/contatos, usuárias, áudio e métricas; CORS por allowlist, rate limit e validação de entrada.
* **Banco de dados:** Turso (região São Paulo), com tabelas `alerts`, `contacts` e `users`; credenciais só nas variáveis de ambiente (`TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`).
* **Hospedagem:** Vercel — PWA em [viva-mulher-navy.vercel.app](https://viva-mulher-navy.vercel.app/) e API em [botao-panico-viva-mulher.vercel.app](https://botao-panico-viva-mulher.vercel.app) (deploy automático a partir da branch `main`).

---

## 🚀 Deploy & Links

| O que | Link | Projeto Vercel | Root Directory |
| :--- | :--- | :--- | :--- |
| **PWA (app)** | https://viva-mulher-navy.vercel.app/ | `viva-mulher` | raiz do repositório |
| **API (backend)** | https://botao-panico-viva-mulher.vercel.app | `botao-panico-viva-mulher` | `backend` |

* **PWA:** `vercel deploy --prod` na raiz (só o app vai no upload — `backend/`, `docs/` e arquivos `.md` são ignorados por `.vercelignore`). O projeto também está conectado ao GitHub e publica a cada push na `main`.
* **API:** deploy automático a partir da `main`. As variáveis `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `DEFAULT_SOCORRO_PHONE`, `ALLOWED_ORIGINS`, `ADMIN_USER` e `ADMIN_PASSWORD` ficam na Vercel (nunca no repositório).
* **O front aponta para a API** via `window.VIVA_API_BASE` no `<head>` do `index.html`.
* ⚠️ O endereço antigo `botao-panico-ten.vercel.app` pertence a outra conta Vercel e **não recebe mais as atualizações** — use o link acima.

---

## 📚 Documentos do Projeto & Extensão (P1)

* 📄 [Plano de Ação Extensionista P1](docs/plano-de-acao-p1.md)
* 📄 [Roteiro da Oficina de Extensão Comunitária](docs/roteiro-oficina-extensao.md)
* 📄 [Divisão de Tarefas da Equipe (7 Pessoas)](FUNCOES_7_PESSOAS.md)
* 📄 [Fallback Operacional de Emergência](backend/docs/FALLBACK_OPERACIONAL.md)

---

## 👥 Equipe de Desenvolvimento

| Integrante | GitHub | Frente Principal |
| :--- | :--- | :--- |
| **Fernando Mello** | [@fernandomellodev](https://github.com/fernandomellodev) | Coordenação Geral & PWA / Cache |
| **Marília Caetano** | [@MariliaCaetano](https://github.com/MariliaCaetano) | Frontend & Dinâmica de Disparo |
| **Raphael Cavalcanti** | [@raphaelcavalcanty](https://github.com/raphaelcavalcanty) | Backend API & Configuração Base |
| **Renan Pollig** | [@RPollig](https://github.com/RPollig) | Geolocalização & Formatação de Mensagens |
| **Matheus Fernando** | [@Math3usF](https://github.com/Math3usF) | Persistência & Modelagem de Chamados |
| **Gabriel Suede** | [@gabbsuede-ship-it](https://github.com/gabbsuede-ship-it) | Rotas de Chamados & Transições de Status |
| **Everaldo Serafim** | [@EveraldoSerafim](https://github.com/EveraldoSerafim) | Monitoramento, Métricas & Logs |
| **Profª. Laís Bordallo** | [@LaisBordallo](https://github.com/LaisBordallo) | Docente Orientadora (PE III) |
