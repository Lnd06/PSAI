import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { classifyEmotion } from '../services/emotionService';
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
  console.log('    INICIANDO TESTES DE INTEGRAÇÃO DE EMOÇÃO       ');
  console.log('====================================================\n');

  try {
    // Test 1: Emotion classification
    console.log('Testando classificação de sentimentos (Naive Bayes)...');
    
    const emoJoy = await classifyEmotion('Estou extremamente feliz e contente com essa vitória maravilhosa!');
    console.log(`Texto alegre classificado como: "${emoJoy}"`);
    assert(emoJoy === 'alegria', 'Texto com palavras alegres deve ser classificado como "alegria".');

    const emoSad = await classifyEmotion('Sinto um vazio enorme e uma tristeza profunda no peito.');
    console.log(`Texto triste classificado como: "${emoSad}"`);
    assert(emoSad === 'tristeza', 'Texto com palavras tristes deve ser classificado como "tristeza".');

    const emoNeutral = await classifyEmotion('Esta é uma frase de teste simples com termos comuns.');
    console.log(`Texto comum classificado como: "${emoNeutral}"`);
    assert(emoNeutral !== null && emoNeutral !== undefined, 'Classificador deve retornar um valor para texto neutro.');

    // Test 2: Dynamic Expressive TTS Synthesis
    console.log('\nTestando síntese de voz expressiva (edge-tts)...');
    
    console.log('Synthesizing Joyful Voice...');
    const bufferJoy = await generateSpeech('Que dia maravilhoso e alegre!', undefined, 'alegria');
    assert(bufferJoy && bufferJoy.length > 1000, 'Síntese de voz com alegria deve produzir um buffer de áudio válido.');

    console.log('Synthesizing Sad Voice...');
    const bufferSad = await generateSpeech('A melancolia toma conta de mim nesta tarde fria.', undefined, 'tristeza');
    assert(bufferSad && bufferSad.length > 1000, 'Síntese de voz com tristeza deve produzir um buffer de áudio válido.');

    console.log('\n====================================================');
    console.log('   TODOS OS TESTES DE INTEGRAÇÃO DE EMOÇÃO PASSARAM ');
    console.log('====================================================');
  } catch (error) {
    console.error('❌ OCORREU UM ERRO NOS TESTES:', error);
    process.exit(1);
  }
}

runTests();
