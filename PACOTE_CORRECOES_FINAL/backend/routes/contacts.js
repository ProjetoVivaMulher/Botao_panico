/**
 * Viva Mulher - Botão de Pânico
 * Rota API: /api/contacts
 * Gestão de contatos de emergência do usuário
 */

const express = require('express');
const router = express.Router();
const { createJsonStore } = require('../db/jsonStore');
const { requireFields } = require('../middleware/validate');

const store = createJsonStore('contacts.json');

// GET /api/contacts - Listar contatos
router.get('/', (req, res) => {
  const contacts = store.readAll();
  if (contacts.length === 0) {
    // Retorna contato padrão inicial
    const defaultContact = [{ id: 'default-1', name: 'Central Viva Mulher', phone: '552139553874', isDefault: true }];
    return res.json(defaultContact);
  }
  res.json(contacts);
});

// POST /api/contacts - Cadastrar novo contato
router.post('/', requireFields(['name', 'phone']), (req, res) => {
  const { name, phone } = req.body;
  const contacts = store.readAll();

  const newContact = {
    id: 'contact-' + Date.now(),
    name: name.trim(),
    phone: String(phone).replace(/\D/g, ''),
    isDefault: false,
    created_at: new Date().toISOString()
  };

  contacts.push(newContact);
  store.writeAll(contacts);

  res.status(201).json(newContact);
});

// DELETE /api/contacts/:id - Remover contato
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  let contacts = store.readAll();
  const initialLength = contacts.length;
  contacts = contacts.filter(c => c.id !== id);

  if (contacts.length === initialLength) {
    return res.status(404).json({ error: 'Contato não encontrado' });
  }

  store.writeAll(contacts);
  res.json({ success: true, message: 'Contato removido com sucesso' });
});

module.exports = router;
