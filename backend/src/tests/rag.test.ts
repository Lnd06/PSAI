import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { splitTextIntoChunks, generateEmbedding, queryLibrary } from '../services/pineconeService';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    process.exit(1);
  }
  console.log(`\x1b[32m✅ PASSOU:\x1b[0m ${message}`);
}

async function runTests() {
  console.log('====================================================');
  console.log('    INICIANDO TESTES DE INTEGRAÇÃO DO PINECONE RAG    ');
  console.log('====================================================\n');

  try {
    // Test 1: Text splitting
    console.log('Testando particionamento de texto...');
    const longText = 'Esta é uma frase de teste longa. '.repeat(50); // ~1650 chars
    const chunks = splitTextIntoChunks(longText, 600, 100);
    console.log(`Texto dividido em ${chunks.length} trechos.`);
    assert(chunks.length > 1, 'Texto longo deve ser dividido em múltiplos chunks.');
    assert(chunks.every(c => c.length <= 700), 'Nenhum chunk deve ultrapassar o limite com folga.');

    // Test 2: Pinecone configuration loading
    console.log('\nTestando carregamento de variáveis do Pinecone...');
    assert(process.env.PINECONE_API_KEY !== undefined, 'PINECONE_API_KEY deve estar configurada.');
    assert(process.env.PINECONE_INDEX === 'psai', 'PINECONE_INDEX deve ser "psai".');
    assert(process.env.PINECONE_NAMESPACE === 'psai', 'PINECONE_NAMESPACE deve ser "psai".');

    // Test 3: Pinecone Embeddings connection
    console.log('\nTestando geração de embeddings e consulta RAG (Inference API do Pinecone)...');
    try {
      const embedding = await generateEmbedding('Ansiedade e distorções cognitivas', 'passage');
      assert(embedding !== null && embedding.length === 1024, 'Embedding gerado deve possuir 1024 dimensões.');
      console.log('Embedding gerado com sucesso (1024 dimensões).');

      console.log('Testando consulta à biblioteca do Pinecone...');
      const context = await queryLibrary('ansiedade');
      console.log('Retorno da consulta no Pinecone:', context !== '' ? '(Encontrado)' : '(Vazio/Nenhum match acima de 0.45)');
      assert(context !== null && typeof context === 'string', 'Consulta RAG deve retornar uma string.');
    } catch (err: any) {
      console.error('Falha ao testar embeddings do Pinecone:', err.message || err);
      process.exit(1);
    }

    console.log('\n====================================================');
    console.log('      TODOS OS TESTES DO PINECONE RAG PASSARAM      ');
    console.log('====================================================');
  } catch (error) {
    console.error('❌ OCORREU UM ERRO NOS TESTES:', error);
    process.exit(1);
  }
}

runTests();
