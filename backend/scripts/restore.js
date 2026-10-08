/**
 * Viva Mulher - Botão de Pânico
 * Script de Restauração de Backup com Validação Criptográfica SHA-256
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

function restoreFromFolder(targetBackupFolder) {
  console.log('====================================================');
  console.log('   VIVA MULHER - RESTAURAÇÃO DE BANCO DE DADOS     ');
  console.log('====================================================\n');

  if (!fs.existsSync(targetBackupFolder)) {
    throw new Error(`Pasta de backup não encontrada: ${targetBackupFolder}`);
  }

  const manifestPath = path.join(targetBackupFolder, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    console.log('🔍 1. Verificando integridade dos arquivos (SHA-256)...');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    for (const item of manifest.files) {
      const fullPath = path.join(backupsRootDir, item.file);
      const currentHash = computeSha256(fullPath);
      if (currentHash !== item.sha256) {
        throw new Error(`Corrupção detectada no arquivo ${item.file}! Hash esperado: ${item.sha256}, atual: ${currentHash}`);
      }
    }
    console.log('   ✅ Integridade criptográfica 100% verificada e íntegra.');
  }

  // Restaura data/
  const backupDataDir = path.join(targetBackupFolder, 'data');
  if (fs.existsSync(backupDataDir)) {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const dataFiles = fs.readdirSync(backupDataDir);
    for (const file of dataFiles) {
      fs.copyFileSync(path.join(backupDataDir, file), path.join(dataDir, file));
    }
    console.log(`   ✅ Banco de dados JSON restaurado (${dataFiles.length} arquivos).`);
  }

  // Restaura uploads/
  const backupUploadsDir = path.join(targetBackupFolder, 'uploads');
  if (fs.existsSync(backupUploadsDir)) {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const uploadFiles = fs.readdirSync(backupUploadsDir);
    for (const file of uploadFiles) {
      fs.copyFileSync(path.join(backupUploadsDir, file), path.join(uploadsDir, file));
    }
    console.log(`   ✅ Gravações de áudio restauradas (${uploadFiles.length} arquivos).`);
  }

  console.log('\n🎉 RESTAURAÇÃO CONCLUÍDA COM SUCESSO!');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  let target = args[0];
  if (!target) {
    // Pega o backup mais recente se nenhum foi passado
    if (fs.existsSync(backupsRootDir)) {
      const folders = fs.readdirSync(backupsRootDir)
        .filter(f => f.startsWith('backup_'))
        .sort()
        .reverse();
      if (folders.length > 0) {
        target = path.join(backupsRootDir, folders[0]);
      }
    }
  }

  if (!target) {
    console.error('Nenhum backup disponível para restaurar.');
    process.exit(1);
  }

  restoreFromFolder(target);
}

module.exports = { restoreFromFolder };
