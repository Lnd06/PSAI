import * as fs from 'fs';
import * as path from 'path';
const { PDFParse } = require('pdf-parse');
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables from backend or root
dotenv.config();

const prisma = new PrismaClient();
const LIVROS_DIR = path.join(__dirname, '../../../livros');

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
  console.log('   INGESTÃO SOMENTE NO BANCO DE DADOS (SEM PINECONE) ');
  console.log('====================================================\n');

  if (!fs.existsSync(LIVROS_DIR)) {
    console.error(`Erro: A pasta de livros no caminho "${LIVROS_DIR}" não existe.`);
    process.exit(1);
  }

  const files = fs.readdirSync(LIVROS_DIR).filter(f => f.toLowerCase().endsWith('.pdf'));
  console.log(`Encontrados ${files.length} PDFs para processamento.`);

  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const filePath = path.join(LIVROS_DIR, fileName);
    const title = path.basename(fileName, '.pdf').replace(/_/g, ' ');
    console.log(`\n[${i + 1}/${files.length}] Processando: "${title}"`);

    // Check if the book is already in MySQL
    const existingBook = await prisma.book.findFirst({
      where: { title: title }
    });

    if (existingBook) {
      console.log(`-> Livro "${title}" já está cadastrado no MySQL. Pulando...`);
      continue;
    }

    try {
      console.log(`-> Extraindo texto do PDF...`);
      const rawText = await extractTextFromPdf(filePath);
      
      const textCleaned = rawText
        .replace(/\r\n/g, '\n')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();

      if (textCleaned.length < 100) {
        console.warn(`⚠️  Aviso: Texto extraído muito curto. Pulando...`);
        continue;
      }

      console.log(`-> Salvando metadados no banco MySQL (${textCleaned.length} caracteres)...`);
      const mysqlContent = textCleaned.substring(0, 300000);
      
      await prisma.book.create({
        data: {
          title: title,
          author: 'USP Open Books / Vários',
          content: mysqlContent
        }
      });
      console.log(`✅ Sucesso: Metadados de "${title}" inseridos no banco de dados!`);
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
