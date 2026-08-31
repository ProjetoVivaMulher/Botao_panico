/**
 * Viva Mulher - Botão de Pânico
 * Rota API: /api/audio
 * Upload e gestão de gravações de áudio de evidência
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração de armazenamento com Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `evidence-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 } // Limite de 15MB
});

// POST /api/audio/upload - Recebe gravação de áudio
router.post('/upload', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo de áudio enviado.' });
  }

  const audioUrl = `/uploads/${req.file.filename}`;
  res.status(201).json({
    success: true,
    message: 'Áudio de evidência salvo com sucesso.',
    filename: req.file.filename,
    audioUrl: audioUrl,
    size: req.file.size,
    uploaded_at: new Date().toISOString()
  });
});

module.exports = router;
