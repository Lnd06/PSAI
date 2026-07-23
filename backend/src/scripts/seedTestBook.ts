import { PrismaClient } from '@prisma/client';
import { upsertBookChunks } from '../services/pineconeService';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });
const prisma = new PrismaClient();

async function main() {
  console.log('====================================================');
  console.log('   SEMEANDO LIVRO DE TESTE EM PARALELO (NEON + PC)  ');
  console.log('====================================================\n');

  const title = "Manual de Terapia Cognitivo-Comportamental e Empatia";
  const author = "Antigravity AI / Dr. Beck";
  const content = `A Terapia Cognitivo-Comportamental (TCC) é uma abordagem estruturada, focada no presente e direcionada para a resolução de problemas atuais e a modificação de pensamentos e comportamentos disfuncionais.
O princípio fundamental da TCC é que os pensamentos influenciam diretamente as emoções e os comportamentos de um indivíduo. Portanto, ao reestruturar pensamentos automáticos negativos, o paciente pode alcançar uma melhora emocional significativa.
A empatia terapêutica é o pilar da aliança de trabalho em TCC. O terapeuta deve demonstrar empatia genuína, calor humano e consideração positiva incondicional para criar um ambiente seguro onde o paciente se sinta acolhido e compreendido.
Durante crises de ansiedade, técnicas de respiração diafragmática e o questionamento socrático ajudam o paciente a identificar distorções cognitivas como catastrofização e pensamento do tipo tudo ou nada.
Para suporte em crises graves com risco de autoagressão, o acolhimento imediato e o encaminhamento a serviços profissionais como o CVV (ligação para 188) ou atendimento de emergência médica são fundamentais.`;

  try {
    // 1. Save metadata to Neon
    let book = await prisma.book.findFirst({
      where: { title: title }
    });

    if (!book) {
      book = await prisma.book.create({
        data: {
          title: title,
          author: author,
          content: content
        }
      });
      console.log('✅ Sucesso: Livro cadastrado no Neon!');
    } else {
      console.log('ℹ️  Info: O livro já existe no banco Neon.');
    }

    // 2. Upload vectors to Pinecone
    console.log('-> Gerando embeddings e inserindo no Pinecone...');
    await upsertBookChunks(book.id, book.title, book.author, content);
    console.log('✅ Sucesso: Embeddings indexados no Pinecone!');

  } catch (err: any) {
    console.error('❌ Erro no processo de semeadura:', err.message || err);
  } finally {
    await prisma.$disconnect();
    console.log('\n====================================================');
    console.log('               SEMEADURA FINALIZADA!                ');
    console.log('====================================================');
  }
}

main();
