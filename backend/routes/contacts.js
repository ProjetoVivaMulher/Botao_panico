/**
 * Viva Mulher - Botão de Pânico
 * Rota API: /api/contacts
 * Gestão de contatos de emergência (banco libSQL/SQLite).
 */

const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireFields } = require('../middleware/validate');
const { normalizePhone, newId } = require('../services/validators');

// Contato padrão da Central (PROVISÓRIO — ajuste em DEFAULT_SOCORRO_PHONE no .env)
const DEFAULT_SOCORRO_PHONE = process.env.DEFAULT_SOCORRO_PHONE || '552139553874';

const DEFAULT_CONTACT = {
  id: 'default-1',
  name: 'Central Viva Mulher (Socorro)',
  phone: DEFAULT_SOCORRO_PHONE,
  isDefault: true
};

function rowToContact(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    phone: row.phone,
    isDefault: !!row.is_default,
    createdAt: row.created_at
  };
}

// GET /api/contacts - Listar contatos (opcionalmente por usuária)
router.get('/', async (req, res, next) => {
  try {
    const { user_id } = req.query;
    const rows = user_id
      ? await db.all('SELECT * FROM contacts WHERE user_id = ? ORDER BY created_at ASC', [user_id])
      : await db.all('SELECT * FROM contacts ORDER BY created_at ASC');

    if (rows.length === 0) {
      return res.json([DEFAULT_CONTACT]);
    }
    return res.json(rows.map(rowToContact));
  } catch (error) {
    next(error);
  }
});

// POST /api/contacts - Cadastrar novo contato
router.post('/', requireFields(['name', 'phone']), async (req, res, next) => {
  try {
    const { name, phone, user_id } = req.body;
    const normalized = normalizePhone(phone);

    if (!normalized) {
      return res.status(422).json({ success: false, error: 'Telefone inválido.' });
    }

    const contact = {
      id: newId('contact'),
      user_id: user_id || null,
      name: String(name).trim().slice(0, 80),
      phone: normalized,
      is_default: 0,
      created_at: new Date().toISOString()
    };

    await db.run(
      `INSERT INTO contacts (id, user_id, name, phone, is_default, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [contact.id, contact.user_id, contact.name, contact.phone, contact.is_default, contact.created_at]
    );

    return res.status(201).json(rowToContact({
      id: contact.id, user_id: contact.user_id, name: contact.name,
      phone: contact.phone, is_default: contact.is_default, created_at: contact.created_at
    }));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/contacts/:id - Remover contato
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = await db.get('SELECT id FROM contacts WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Contato não encontrado.' });
    }
    await db.run('DELETE FROM contacts WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Contato removido com sucesso.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
