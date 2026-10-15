/**
 * Viva Mulher - Botão de Pânico
 * Rota API: /api/users
 * Cadastro único da usuária, login/reconfirmação periódica e direitos LGPD.
 */

const express = require('express');
const router = express.Router();

const usersRepository = require('../repositories/usersRepository');
const {
  normalizePhone,
  normalizeBirthDate,
  isValidFullName,
  verifyPin
} = require('../services/validators');
const logger = require('../services/logger');
const { requireUserToken } = require('../middleware/auth');

// POST /api/users - Cadastro único (público)
router.post('/', async (req, res, next) => {
  try {
    const { fullName, phone, birthDate, pin, consentLgpd, consentLocation, selfDeclaredWoman } = req.body || {};

    if (!isValidFullName(fullName)) {
      return res.status(422).json({
        success: false,
        error: 'Informe o nome completo (nome e sobrenome).'
      });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(422).json({
        success: false,
        error: 'Telefone inválido. Informe DDD + número (ex.: 21 99999-9999).'
      });
    }

    const birth = normalizeBirthDate(birthDate);
    if (!birth.ok) {
      return res.status(422).json({ success: false, error: birth.error });
    }

    if (!consentLgpd) {
      return res.status(422).json({
        success: false,
        error: 'É necessário aceitar o termo de uso e a LGPD para concluir o cadastro.'
      });
    }

    if (!selfDeclaredWoman) {
      return res.status(422).json({
        success: false,
        error: 'Este é um espaço de apoio a mulheres. É necessário declarar que você se identifica como mulher.'
      });
    }

    if (pin != null && String(pin).length > 0 && !/^\d{4,6}$/.test(String(pin))) {
      return res.status(422).json({
        success: false,
        error: 'O PIN deve ter de 4 a 6 dígitos.'
      });
    }

    const existing = await usersRepository.findByPhone(normalizedPhone);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Já existe um cadastro com este telefone.'
      });
    }

    const { user, token } = await usersRepository.create({
      fullName,
      phone: normalizedPhone,
      birthDate: birth.iso,
      pin: pin ? String(pin) : null,
      consentLgpd: !!consentLgpd,
      consentLocation: !!consentLocation,
      selfDeclaredWoman: !!selfDeclaredWoman
    });

    logger.info('Usuária cadastrada', { userId: user.id });
    return res.status(201).json({ success: true, user, token });
  } catch (error) {
    next(error);
  }
});

// POST /api/users/login - Recupera o cadastro (ex.: novo aparelho)
// Aceita PIN (se definido) ou a data de nascimento como confirmação.
router.post('/login', async (req, res, next) => {
  try {
    const { phone, pin, birthDate } = req.body || {};
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      return res.status(422).json({ success: false, error: 'Telefone inválido.' });
    }

    const user = await usersRepository.findByPhone(normalizedPhone);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Cadastro não encontrado.' });
    }

    if (await usersRepository.isLocked(user.id)) {
      return res.status(429).json({
        success: false,
        error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
      });
    }

    const row = await usersRepository.findRowById(user.id);
    let ok = false;

    if (row.pin_hash) {
      ok = verifyPin(pin, row.pin_hash);
    } else if (birthDate) {
      const birth = normalizeBirthDate(birthDate);
      ok = birth.ok && birth.iso === user.birthDate;
    }

    if (!ok) {
      const attempt = await usersRepository.registerFailedAttempt(user.id);
      return res.status(attempt.locked ? 429 : 401).json({
        success: false,
        error: attempt.locked
          ? 'Muitas tentativas incorretas. Conta bloqueada temporariamente.'
          : (row.pin_hash ? 'PIN incorreto.' : 'Confirme com a data de nascimento.')
      });
    }

    await usersRepository.resetFailedAttempts(user.id);
    const token = await usersRepository.ensureAccessToken(user.id);

    return res.status(200).json({ success: true, user, token });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/:id - Recupera uma usuária pelo id local (exige token)
router.get('/:id', requireUserToken, async (req, res, next) => {
  try {
    const user = await usersRepository.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, error: 'Cadastro não encontrado.' });
    return res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

// POST /api/users/:id/confirm - Reconfirmação periódica (manter ativo; exige token)
router.post('/:id/confirm', requireUserToken, async (req, res, next) => {
  try {
    const user = await usersRepository.findById(req.userId);
    if (!user) return res.status(404).json({ success: false, error: 'Cadastro não encontrado.' });

    if (await usersRepository.isLocked(user.id)) {
      return res.status(429).json({
        success: false,
        error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
      });
    }

    const { pin, fullName, birthDate } = req.body || {};

    if (user.hasPin) {
      const row = await usersRepository.findRowById(user.id);
      if (!verifyPin(pin, row.pin_hash)) {
        const attempt = await usersRepository.registerFailedAttempt(user.id);
        return res.status(attempt.locked ? 429 : 401).json({
          success: false,
          error: attempt.locked
            ? 'Muitas tentativas incorretas. Conta bloqueada temporariamente.'
            : 'PIN incorreto.'
        });
      }
      await usersRepository.resetFailedAttempts(user.id);
    }

    if (fullName && !isValidFullName(fullName)) {
      return res.status(422).json({ success: false, error: 'Nome completo inválido.' });
    }

    let isoBirthDate;
    if (birthDate) {
      const birth = normalizeBirthDate(birthDate);
      if (!birth.ok) return res.status(422).json({ success: false, error: birth.error });
      isoBirthDate = birth.iso;
    }

    const updated = await usersRepository.confirm(user.id, { fullName, birthDate: isoBirthDate });
    return res.json({ success: true, user: updated });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/users/:id/consent - Atualiza consentimentos (exige token)
router.patch('/:id/consent', requireUserToken, async (req, res, next) => {
  try {
    const { consentLgpd, consentLocation } = req.body || {};
    const updated = await usersRepository.updateConsent(req.userId, {
      consentLgpd,
      consentLocation
    });
    if (!updated) return res.status(404).json({ success: false, error: 'Cadastro não encontrado.' });
    return res.json({ success: true, user: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/:id - Direito ao esquecimento (LGPD): apaga a usuária e seus dados (exige token)
router.delete('/:id', requireUserToken, async (req, res, next) => {
  try {
    const removed = await usersRepository.remove(req.userId);
    if (!removed) return res.status(404).json({ success: false, error: 'Cadastro não encontrado.' });
    logger.info('Cadastro removido (LGPD)', { userId: req.userId });
    return res.json({ success: true, message: 'Todos os dados foram apagados.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
