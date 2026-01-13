
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filesToDelete = [
  'index-1.tsx',
  'metadata-1.json',
  'index-1.html',
  'firebaseConfig-1.ts',
  'constants-1.ts',
  'App-1.tsx',
  'types-1.ts',
  'type-errors.txt'
];

console.log('🧹 Inizio pulizia file obsoleti...');

filesToDelete.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`✅ Eliminato: ${file}`);
    } catch (err) {
      console.error(`❌ Errore eliminazione ${file}:`, err);
    }
  } else {
    // File già eliminato o non esistente, ignoriamo silenziosamente
  }
});

console.log('✨ Pulizia completata.');
