import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthenticatedRequest } from './auth';
import { upsertBookChunks, deleteBookChunks } from '../services/pineconeService';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/library
 * List all library books in the database
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const books = await prisma.book.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.json(books);
  } catch (error) {
    console.error('[Library Route] Error listing books:', error);
    return res.status(500).json({ message: 'Erro ao carregar livros da biblioteca.' });
  }
});

/**
 * POST /api/library
 * Create a book in MySQL, split text, embed, and upload chunks to Pinecone
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, author, content } = req.body;
    
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ message: 'O título do livro é obrigatório.' });
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ message: 'O conteúdo do livro é obrigatório.' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    // 1. Save metadata and full text to MySQL
    const book = await prisma.book.create({
      data: {
        title: title.trim(),
        author: author ? author.trim() : 'Autor desconhecido',
        content: content.trim()
      }
    });

    // 2. Split, embed (using Pinecone's built-in model), and upload chunks to Pinecone
    try {
      await upsertBookChunks(book.id, book.title, book.author, book.content);
    } catch (pineconeErr: any) {
      console.error('[Library Route] Pinecone upload failed, rolling back MySQL book:', pineconeErr);
      
      // Rollback DB creation if Pinecone fails
      await prisma.book.delete({
        where: { id: book.id }
      });
      
      return res.status(500).json({ 
        message: `Falha ao processar RAG no Pinecone: ${pineconeErr.message || 'Erro desconhecido'}` 
      });
    }

    return res.status(201).json(book);
  } catch (error) {
    console.error('[Library Route] Error adding book:', error);
    return res.status(500).json({ message: 'Erro interno ao adicionar livro à biblioteca.' });
  }
});

/**
 * DELETE /api/library/:id
 * Delete a book from MySQL and clear corresponding vectors in Pinecone
 */
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Find book to get content for ID matching
    const book = await prisma.book.findUnique({
      where: { id }
    });

    if (!book) {
      return res.status(404).json({ message: 'Livro não encontrado.' });
    }

    // 1. Delete chunks from Pinecone
    await deleteBookChunks(book.id, book.content);

    // 2. Delete book metadata from MySQL
    await prisma.book.delete({
      where: { id }
    });

    return res.json({ message: 'Livro removido da biblioteca com sucesso.' });
  } catch (error) {
    console.error('[Library Route] Error deleting book:', error);
    return res.status(500).json({ message: 'Erro ao remover livro da biblioteca.' });
  }
});

export default router;
