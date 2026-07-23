import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables before importing ttsService
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { generateSpeech } from '../services/ttsService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    process.exit(1);
  }
  console.log(`\x1b[32m✅ PASSOU:\x1b[0m ${message}`);
}

async function runTests() {
  console.log('====================================================');
  console.log('      INICIANDO TESTES DO SERVIÇO TTS (PSAI)        ');
  console.log('====================================================\n');

  try {
    console.log('Testando síntese com texto curto em português...');
    const buffer = await generateSpeech('Olá, como você está se sentindo hoje?');

    assert(buffer !== undefined && buffer !== null, 'O buffer de áudio retornado não deve ser nulo.');
    assert(buffer.length > 1000, `O buffer de áudio deve ser maior do que 1KB. Tamanho obtido: ${buffer.length} bytes`);
    
    console.log('\n====================================================');
    console.log('     TODOS OS TESTES DO SERVIÇO TTS PASSARAM        ');
    console.log('====================================================');
  } catch (error) {
    console.error('❌ OCORREU UM ERRO NOS TESTES:', error);
    process.exit(1);
  }
}

runTests();
