/**
 * Viva Mulher - Botão de Pânico
 * Middleware de autenticação básica para o painel interno (uso acadêmico/demonstração)
 *
 * IMPORTANTE: isto é autenticação simples (HTTP Basic Auth) usando variáveis de
 * ambiente, adequada para demonstração acadêmica. NÃO usar como está em produção
 * real com dados de vítimas. Se o grupo decidir por autenticação mais robusta
 * (login com token, JWT, etc.), isso é uma DECISÃO NECESSÁRIA separada.
 *
 * Protege apenas rotas do painel interno (ex.: listagem de chamados).
 * NUNCA aplicar este middleware na rota pública de criação de alerta
 * (POST /api/alerts) — a vítima não pode ser obrigada a fazer login para
 * pedir ajuda.
 */

function requireBasicAuth(req, res, next) {
  const expectedUser = process.env.ADMIN_USER;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUser || !expectedPassword) {
    console.warn('[auth] ADMIN_USER/ADMIN_PASSWORD não configurados no .env — bloqueando rota protegida por segurança.');
    return res.status(500).json({
      success: false,
      error: 'Autenticação do painel interno não configurada no servidor.'
    });
  }

  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');

  if (scheme !== 'Basic' || !encoded) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Painel Interno Viva Mulher"');
    return res.status(401).json({ success: false, error: 'Autenticação necessária.' });
  }

  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const separatorIndex = decoded.indexOf(':');
  const user = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);

  if (user === expectedUser && password === expectedPassword) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Painel Interno Viva Mulher"');
  return res.status(401).json({ success: false, error: 'Credenciais inválidas.' });
}

module.exports = { requireBasicAuth };
