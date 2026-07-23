import * as path from 'path';
import * as dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';
dotenv.config({ path: path.join(__dirname, '../../.env') });

const apiKey = process.env.PINECONE_API_KEY || '';

const pc = new Pinecone({ apiKey });

async function run() {
  try {
    console.log('Tentando conectar ao Pinecone...');
    const result = await pc.listIndexes();
    console.log('Conexão bem sucedida!');
    console.log('Índices existentes:', result.indexes);
  } catch (error) {
    console.error('Erro de conexão com o Pinecone:', error);
  }
}

run();
