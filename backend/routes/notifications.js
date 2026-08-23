/**
 * Rota API: /api/notifications
 * Estrutura futura — NÃO existe integração externa real com 190/180/192 ou
 * qualquer outro serviço. Isso é proposital: nenhuma credencial ou serviço
 * foi definido oficialmente pelo grupo, então não inventamos uma integração.
 *
 * Hoje, o fallback operacional para esses números é manual, feito pela própria
 * usuária pelos botões de discagem rápida que já existem em index.html
 * (tel:190, tel:180, tel:192). Ver backend/docs/FALLBACK_OPERACIONAL.md.
 */

const express = require('express');
const router = express.Router();

router.get('/status', (req, res) => {
  res.json({
    success: true,
    implemented: false,
    reason: 'Nenhuma integração oficial de notificação externa (190/180/192) foi definida pelo grupo até o momento.',
    fallbackAtual: 'Discagem manual pela própria usuária (botões tel:190, tel:180, tel:192 já existentes no frontend).'
  });
});

module.exports = router;
