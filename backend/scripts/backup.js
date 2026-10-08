/**
 * Viva Mulher - Botão de Pânico
 * Script de Backup Automatizado do Banco de Dados e Evidências
 *
 * Executa snapshot completo de:
 * 1. Base de dados JSON (alerts.json, contacts.json, logs.jsonl)
 * 2. Gravações de áudio de evidência (uploads/)
 * 3. Geração de manifesto com hashes criptográficos SHA-256 para auditoria de integridade (LGPD)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const rootBackend = path.resolve(__dirname, '..');
const dataDir = path.join(rootBackend, 'data');
const uploadsDir = path.join(rootBackend, 'uploads');
const backupsRootDir = path.join(rootBackend, 'backups');

function computeSha256(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

function copyRecursive(src, dest, manifestFiles) {
  if (!fs.existsSync(src)) return 0;
  let count = 0;
  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      const srcPath = path.join(src, entry);
      const destPath = path.join(dest, entry);
      count += copyRecursive(srcPath, destPath, manifestFiles);
    }
  } else {
    fs.copyFileSync(src, dest);
    const hash = computeSha256(src);
    manifestFiles.push({
      file: path.relative(backupsRootDir, dest).replace(/\\/g, '/'),
      size_bytes: stats.size,
      sha256: hash
    });
    count++;
  }
  return count;
}

function runBackup() {
  console.log('====================================================');
  console.log('   VIVA MULHER - BACKUP DE BANCO DE DADOS & DADOS   ');
  console.log('====================================================\n');

  const now = new Date();
  const timestampStr = now.toISOString().replace(/[:.]/g, '-');
  const backupFolder = path.join(backupsRootDir, `backup_${timestampStr}`);

  if (!fs.existsSync(backupFolder)) {
    fs.mkdirSync(backupFolder, { recursive: true });
  }

  const manifestFiles = [];

  console.log('📦 1. Copiando base de dados JSON (data/)...');
  const dataDest = path.join(backupFolder, 'data');
  const dataCount = copyRecursive(dataDir, dataDest, manifestFiles);
  console.log(`   ✅ ${dataCount} arquivo(s) de banco de dados copiados.`);

  console.log('🎙️ 2. Copiando gravações e evidências de áudio (uploads/)...');
  const uploadsDest = path.join(backupFolder, 'uploads');
  const uploadsCount = copyRecursive(uploadsDir, uploadsDest, manifestFiles);
  console.log(`   ✅ ${uploadsCount} arquivo(s) de evidência copiados.`);

  // 3. Consolidar Snapshot Único em JSON para exportação rápida
  console.log('📑 3. Gerando Snapshot consolidado em JSON...');
  const snapshotData = {
    backup_id: `BCK-${Date.now()}`,
    timestamp: now.toISOString(),
    database: {
      alerts: fs.existsSync(path.join(dataDir, 'alerts.json'))
        ? JSON.parse(fs.readFileSync(path.join(dataDir, 'alerts.json'), 'utf8') || '[]')
        : [],
      contacts: fs.existsSync(path.join(dataDir, 'contacts.json'))
        ? JSON.parse(fs.readFileSync(path.join(dataDir, 'contacts.json'), 'utf8') || '[]')
        : [],
      logs: fs.existsSync(path.join(dataDir, 'logs.jsonl'))
        ? fs.readFileSync(path.join(dataDir, 'logs.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map(l => {
            try { return JSON.parse(l); } catch(e) { return l; }
          })
        : []
    }
  };

  const snapshotPath = path.join(backupFolder, 'snapshot_consolidated.json');
  fs.writeFileSync(snapshotPath, JSON.stringify(snapshotData, null, 2), 'utf8');

  manifestFiles.push({
    file: path.relative(backupsRootDir, snapshotPath).replace(/\\/g, '/'),
    size_bytes: fs.statSync(snapshotPath).size,
    sha256: computeSha256(snapshotPath)
  });

  // 4. Criação do Manifesto de Integridade Criptográfica (LGPD / Perícia)
  const manifest = {
    backup_id: snapshotData.backup_id,
    created_at: now.toISOString(),
    system: 'Viva Mulher - Botão de Pânico (Extensão Universitária Vassouras)',
    total_files: manifestFiles.length,
    files: manifestFiles
  };

  const manifestPath = path.join(backupFolder, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log('\n====================================================');
  console.log('   🎉 BACKUP CONCLUÍDO COM SUCESSO!');
  console.log(`   📁 Diretório: ${backupFolder}`);
  console.log(`   🆔 Backup ID: ${snapshotData.backup_id}`);
  console.log(`   🔒 Manifesto de Integridade: manifest.json (SHA-256)`);
  console.log('====================================================\n');

  return {
    success: true,
    backupFolder,
    backupId: snapshotData.backup_id,
    manifest
  };
}

if (require.main === module) {
  runBackup();
}

module.exports = { runBackup };
