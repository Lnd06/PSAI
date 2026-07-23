import * as fs from 'fs';
import * as path from 'path';
const { PDFParse } = require('pdf-parse');
import { Pinecone } from '@pinecone-database/pinecone';
import { PrismaClient } from '@prisma/client';
import { upsertBookChunks } from '../services/pineconeService';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const prisma = new PrismaClient();
const LIVROS_DIR = path.join(__dirname, '../../../livros');

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || '' });
const pineconeIndex = process.env.PINECONE_INDEX || 'psai';
const pineconeNamespace = process.env.PINECONE_NAMESPACE || 'psai';

async function extractTextFromPdf(filePath: string): Promise<string> {
  const dataBuffer = fs.readFileSync(filePath);
  try {
    const parser = new PDFParse({ data: dataBuffer });
    const data = await parser.getText();
    return data.text || '';
  } catch (error: any) {
    console.error(`Erro ao analisar PDF ${path.basename(filePath)}:`, error.message);
    return '';
  }
}

async function ingestAll() {
  console.log('====================================================');
  console.log('       INICIANDO INGESTÃO EM MASSA DE LIVROS        ');
  console.log('====================================================\n');

  if (!fs.existsSync(LIVROS_DIR)) {
    console.error(`Erro: A pasta de livros no caminho "${LIVROS_DIR}" não existe.`);
    process.exit(1);
  }

  // Fallback to database user key if not defined in .env
  let geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey || geminiKey.trim().length === 0) {
    console.log('-> Buscando chave do Gemini API nos perfis do banco de dados...');
    const userWithKey = await prisma.user.findFirst({
      where: {
        geminiApiKey: {
          not: null
        }
      }
    });
    if (userWithKey && userWithKey.geminiApiKey) {
      geminiKey = userWithKey.geminiApiKey;
      process.env.GEMINI_API_KEY = geminiKey;
      console.log(`-> Chave encontrada! Usando chave configurada no perfil do usuário "${userWithKey.name}".`);
    } else {
      console.warn('⚠️  Aviso: Nenhuma chave Gemini API configurada no .env ou no banco de dados.');
      console.warn('Para finalizar a indexação dos livros pendentes sem estourar o limite da cota do Pinecone,');
      console.warn('insira sua chave Gemini no .env ou acesse a página de Perfil no painel da aplicação.');
    }
  }

  let files = fs.readdirSync(LIVROS_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
  // Para testes rápidos, selecionamos apenas 3 livros pequenos (< 4MB)
  files = files.filter(f => {
    const stats = fs.statSync(path.join(LIVROS_DIR, f));
    return stats.size < 4 * 1024 * 1024;
  }).slice(0, 3);
  console.log(`Encontrados ${files.length} PDFs para processamento.`);

  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const filePath = path.join(LIVROS_DIR, fileName);
    
    // Clean filename to extract a title (remove extension, replace dashes)
    const title = path.basename(fileName, '.pdf').replace(/_/g, ' ');
    console.log(`\n[${i + 1}/${files.length}] Processando: "${title}"`);

    // Check if the book is already in MySQL
    const existingBook = await prisma.book.findFirst({
      where: { title: title }
    });

    if (existingBook) {
      try {
        const index = pc.index(pineconeIndex);
        const namespace = index.namespace(pineconeNamespace);
        const queryResponse = await namespace.query({
          vector: new Array(1024).fill(0),
          filter: { bookId: { '$eq': existingBook.id } },
          topK: 1
        });

        if (queryResponse.matches && queryResponse.matches.length > 0) {
          console.log(`-> Livro "${title}" já está cadastrado no banco e no Pinecone. Pulando...`);
          continue;
        } else {
          console.log(`-> Livro "${title}" está no MySQL mas falta no Pinecone. Reiniciando indexação...`);
          await upsertBookChunks(existingBook.id, existingBook.title, existingBook.author, existingBook.content);
          console.log(`\x1b[32m✅ Sucesso total:\x1b[0m "${title}" indexado com sucesso no Pinecone!`);
          continue;
        }
      } catch (err: any) {
        console.error(`-> Erro ao verificar Pinecone para "${title}":`, err.message || err);
        console.log(`-> Tentando reindexar no Pinecone por garantia...`);
        try {
          await upsertBookChunks(existingBook.id, existingBook.title, existingBook.author, existingBook.content);
        } catch (innerErr: any) {
          console.error(`❌ Falha na reindexação preventiva de "${title}":`, innerErr.message || innerErr);
        }
        continue;
      }
    }

    try {
      console.log(`-> Extraindo texto do PDF...`);
      const rawText = await extractTextFromPdf(filePath);
      
      const textCleaned = rawText
        .replace(/\r\n/g, '\n')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();

      if (textCleaned.length < 100) {
        console.warn(`⚠️  Aviso: Texto extraído muito curto (${textCleaned.length} caracteres). Pode ser um PDF escaneado sem OCR.`);
        continue;
      }

      console.log(`-> Texto extraído com sucesso (${textCleaned.length} caracteres).`);

      // 1. Save metadata to MySQL (truncated content to 300,000 characters to avoid MySQL packet size limits)
      console.log(`-> Salvando metadados no banco MySQL...`);
      const mysqlContent = textCleaned.substring(0, 300000);
      const book = await prisma.book.create({
        data: {
          title: title,
          author: 'USP Open Books / Vários',
          content: mysqlContent
        }
      });

      // 2. Split, embed, and upload chunks to Pinecone (using full text from memory)
      console.log(`-> Gerando embeddings e inserindo no Pinecone...`);
      await upsertBookChunks(book.id, book.title, book.author, textCleaned);
      console.log(`\x1b[32m✅ Sucesso total:\x1b[0m "${title}" indexado com sucesso no Pinecone!`);

    } catch (err: any) {
      console.error(`❌ Erro no processamento do livro "${title}":`, err.message || err);
    }
  }

  console.log('\n====================================================');
  console.log('    PROCESSO DE INGESTÃO CONCLUÍDO COM SUCESSO!     ');
  console.log('====================================================');
  
  await prisma.$disconnect();
}

ingestAll();
