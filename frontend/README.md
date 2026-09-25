# Viva Mulher — Botão de Pânico Comunitário

> **Práticas Extensionistas Integradoras III (PE III) — Engenharia de Software 2026.2**  
> **Universidade de Vassouras (FUSVE) — Campus Saquarema**  
> **Docente Orientadora:** Profª. Laís Cristine Bordallo Pinheiro ([@LaisBordallo](https://github.com/LaisBordallo))

🌐 **Aplicação Online (PWA):** [https://botao-panico-ten.vercel.app/](https://botao-panico-ten.vercel.app/)

---

## 📌 Sumário
1. [Visão Geral & Território](#-visão-geral--território)
2. [Funcionalidades do Aplicativo](#-funcionalidades-do-aplicativo)
3. [Segurança, Privacidade & LGPD](#-segurança-privacidade--lgpd)
4. [Arquitetura & Stack Tecnológica](#-arquitetura--stack-tecnológica)
5. [Documentos do Projeto & Extensão (P1)](#-documentos-do-projeto--extensão-p1)
6. [Equipe de Desenvolvimento](#-equipe-de-desenvolvimento)

---

## 📍 Visão Geral & Território

O **Botão de Pânico Viva Mulher** é um módulo de apoio comunitário e segurança digital voltado a mulheres em situação de vulnerabilidade no município de **Saquarema - RJ**, articulado em parceria com a rede local de proteção (CRAM - Centro de Referência e Atendimento à Mulher / Secretaria Municipal da Mulher).

> ⚠️ **Aviso de Responsabilidade e Simulação Acadêmica:**  
> Este aplicativo é um recurso de apoio comunitário e **não substitui os canais oficiais de emergência**. Em caso de risco iminente à vida, deve-se priorizar o contato telefônico direto com a **Polícia Militar (190)** ou a **Central de Atendimento à Mulher (180)**.

---

## 📱 Funcionalidades do Aplicativo

* **Botão de Pânico com Contagem Regressiva:** Disparo em 3 segundos com cancelamento rápido para evitar acionamentos acidentais.
* **Captura de Geolocalização (GPS):** Coleta automática de alta precisão com geração de link no Google Maps e fallback seguro caso o sinal esteja indisponível.
* **Mensagem Padronizada:** Formatação de mensagem de socorro com ID único (`EVT-AAAA-MMDD-XXXX`), data, horário e localização para envio via WhatsApp (`wa.me`).
* **Gravação de Áudio de Evidência:** Gravação de até 15 segundos de som ambiente disparada no acionamento ou manualmente, com player de reprodução integrado no histórico.
* **Modo Camuflado (Calculadora de Proteção):** Interface disfarçada de calculadora funcional, permitindo retornar ao modo Viva Mulher digitando o PIN secreto `7777`.
* **Canais Diretos de Emergência Pública:** Atalhos nativos de discagem rápida para **190** (Polícia Militar), **180** (Central da Mulher) e **192** (SAMU).
* **PWA Instalável e Offline:** Suporte a instalação na tela inicial (Android/iOS) e cache offline via Service Worker (`sw.js`).

---

## ⚖️ Segurança, Privacidade & LGPD

* **Consentimento Prévio:** Exibição de termo de consentimento explícito (finalidade de localização e áudio) antes do primeiro acionamento.
* **Armazenamento Local e Descarte:** Histórico e contatos salvos no próprio aparelho (`localStorage`), com botão de limpeza total a qualquer momento.
* **Proteção contra Injeção (XSS):** Sanitização rigorosa via `escapeHtml()` em todos os campos de texto.
* **Logs com Anonimização:** Mascaramento de números de telefone e dados sensíveis no backend conforme diretrizes da LGPD.

---

## 🛠️ Arquitetura & Stack Tecnológica

* **Frontend:** HTML5, CSS3 Moderno (CSS Variables, Flexbox/Grid), JavaScript Vanilla modular (`geolocation.js`, `emergency-message.js`, `contacts.js`, `camouflage.js`, `audio.js`, `app.js`, `pwa-install.js`).
* **Backend:** Node.js + Express 4, Multer (upload seguro de áudio com filtro MIME), CORS restrito e repositório JSON local com zero dependências externas.
* **Hospedagem:** Vercel (Frontend PWA).

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
