# Viva Mulher — Botão de Pânico Comunitário

> **Práticas Extensionistas Integradoras III (PE III) — Engenharia de Software 2026.2**  
> **Universidade de Vassouras (FUSVE) — Campus Saquarema**  
> **Docente Orientadora:** Profª. Laís Cristine Bordallo Pinheiro ([@LaisBordallo](https://github.com/LaisBordallo))

🌐 **Aplicação Online (PWA):** [https://viva-mulher-navy.vercel.app/](https://viva-mulher-navy.vercel.app/)

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

* **Pânico em um toque:** o acionamento é imediato — sem cadastro obrigatório, sem login e sem etapa de confirmação, porque em situação de risco cada segundo conta.
* **Pedido de socorro com localização:** mensagem padronizada com identificação do evento, data, horário e link de mapa, pronta para envio pelo WhatsApp.
* **Rede de apoio acionada junto:** pessoas de confiança cadastradas recebem o mesmo pedido de socorro, e a Central Viva Mulher mantém o registro do chamado para acompanhamento.
* **Avisar agora:** envio imediato do alerta para uma pessoa específica da rede de apoio, com a localização do momento — útil para avisar depois do ocorrido ou reforçar o pedido.
* **Áudio de evidência:** captura curta do som ambiente no acionamento, preservada como prova.
* **Documentos e provas:** fotos, vídeos, áudios e arquivos organizados dentro do próprio aplicativo, com prévia, compartilhamento e exclusão.
* **Modo Camuflado (Calculadora de Proteção):** interface disfarçada de calculadora funcional, permitindo retornar ao modo Viva Mulher por um código secreto instruído presencialmente na capacitação/oficina.
* **Canais Diretos de Emergência Pública:** atalhos nativos de discagem rápida para **190** (Polícia Militar), **180** (Central da Mulher) e **192** (SAMU).
* **Acessibilidade:** suporte a leitor de tela, retorno por vibração, aviso luminoso para usuárias surdas e tradução em Libras.
* **PWA Instalável e Offline:** instalação na tela inicial (Android/iOS) e funcionamento do essencial mesmo sem conexão.

---

## ⚖️ Segurança, Privacidade & LGPD

* **Consentimento Prévio:** termo explícito sobre o uso da localização e do áudio, com base legal de proteção da vida, apresentado antes do primeiro uso.
* **O socorro nunca depende de cadastro:** o acionamento funciona mesmo sem dados preenchidos, sem conta e sem confirmação.
* **Dados no aparelho da usuária:** histórico, provas e rede de apoio ficam armazenados localmente; as provas **não** são enviadas para servidor.
* **Exclusão a qualquer momento:** botão de limpeza total dos dados guardados no dispositivo.
* **Proteção do código de acesso:** o código do modo camuflado não é armazenado em texto legível.
* **Proteção contra injeção de código (XSS):** todo texto exibido é sanitizado antes de aparecer na tela.
* **Comunicação protegida:** tráfego cifrado e políticas de segurança de conteúdo e de permissões aplicadas na hospedagem.
* **Registros com anonimização:** dados sensíveis e números de telefone são mascarados nos registros do backend, conforme as diretrizes da LGPD.

---

## 🛠️ Arquitetura & Stack Tecnológica

* **Frontend:** aplicação web progressiva (PWA) construída em HTML5, CSS3 moderno e JavaScript modular, sem dependência de frameworks — leve o suficiente para rodar em aparelhos modestos e com conexão instável.
* **Backend:** API REST em Node.js com Express, responsável pelo registro dos chamados, pela rede de apoio e pelo acompanhamento da Central.
* **Banco de dados:** base SQL gerenciada na nuvem, com o mesmo dialeto usado no ambiente de desenvolvimento local.
* **Hospedagem:** Vercel, com o aplicativo e a API publicados como projetos independentes e deploy automático a partir da branch `main`.
* **Integrações:** WhatsApp por link oficial (`wa.me`), mapas para a localização e VLibras para acessibilidade.

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
| **Leandro Bravo** | [@LeoBravoDev](https://github.com/LeoBravoDev) | Correções Finais & Integração (Backend + Frontend) |
| **Profª. Laís Bordallo** | [@LaisBordallo](https://github.com/LaisBordallo) | Docente Orientadora (PE III) |
