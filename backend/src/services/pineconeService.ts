import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
const pineconeApiKey = process.env.PINECONE_API_KEY || '';
const pineconeIndex = process.env.PINECONE_INDEX || 'psai';
const pineconeNamespace = process.env.PINECONE_NAMESPACE || 'psai';

const pc = new Pinecone({ apiKey: pineconeApiKey });

// Pinecone's built-in embedding model (1024 dimensions, multilingual)
const EMBEDDING_MODEL = 'multilingual-e5-large';

/**
 * Splits text into chunks of roughly `chunkSize` characters with `overlap`.
 */
export function splitTextIntoChunks(text: string, chunkSize: number = 700, overlap: number = 100): string[] {
  const chunks: string[] = [];
  let startIndex = 0;
  
  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;
    if (endIndex > text.length) {
      endIndex = text.length;
    } else {
      // Try to find a space near the boundary to avoid cutting words in half
      const nextSpace = text.indexOf(' ', endIndex - 15);
      if (nextSpace !== -1 && nextSpace < endIndex + 15) {
        endIndex = nextSpace;
      }
    }
    
    chunks.push(text.slice(startIndex, endIndex).trim());
    startIndex = endIndex - overlap;
    if (startIndex < 0) startIndex = 0;
    
    // Safety check to prevent infinite loop
    if (endIndex === text.length) break;
  }
  
  return chunks.filter(c => c.length > 10);
}

/**
 * Generates a 1024-dimension embedding.
 * Dynamically uses Google Gemini API (text-embedding-004) if a key is provided in env,
 * otherwise falls back to Pinecone's built-in Inference API.
 */
export async function generateEmbedding(text: string, inputType: 'passage' | 'query' = 'passage', retries: number = 3): Promise<number[]> {
  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey && geminiKey.trim().length > 0) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { role: 'user', parts: [{ text }] },
          outputDimensionality: 1024
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = (await response.json()) as any;
      if (data && data.embedding && data.embedding.values) {
        return data.embedding.values;
      }
    } catch (err: any) {
      const isRateLimit = err.message && (err.message.includes('429') || err.message.includes('Quota exceeded'));
      if (isRateLimit && retries > 0) {
        console.warn(`[RAG Service] Limite de taxa (429) do Gemini atingido para embedding individual. Aguardando 40 segundos antes de tentar novamente... (${retries} tentativas restantes)`);
        await new Promise(resolve => setTimeout(resolve, 40000));
        return generateEmbedding(text, inputType, retries - 1);
      }
      console.warn('[RAG Service] Falha ao gerar embedding com Gemini, tentando Pinecone Inference...', err.message || err);
    }
  }

  // Fallback to Pinecone Inference
  const result = await (pc.inference as any)._embed({
    model: EMBEDDING_MODEL,
    inputs: [text],
    parameters: { inputType }
  });

  if (result && result.data && result.data[0] && result.data[0].values) {
    return result.data[0].values;
  }
  
  throw new Error('Falha ao gerar embeddings.');
}

/**
 * Generates embeddings in batch.
 * Dynamically uses Gemini batchEmbedContents if key is available,
 * with retry logic for 429 rate limit errors, otherwise falls back to Pinecone Inference.
 */
async function generateEmbeddingsBatch(texts: string[], inputType: 'passage' | 'query' = 'passage', retries: number = 3): Promise<number[][]> {
  const geminiKey = process.env.GEMINI_API_KEY;

  if (geminiKey && geminiKey.trim().length > 0) {
    try {
      const requests = texts.map(t => ({
        model: 'models/gemini-embedding-2',
        content: { role: 'user', parts: [{ text: t }] },
        outputDimensionality: 1024
      }));

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:batchEmbedContents?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = (await response.json()) as any;
      if (data && data.embeddings) {
        return data.embeddings.map((e: any) => e.values);
      }
    } catch (err: any) {
      const isRateLimit = err.message && (err.message.includes('429') || err.message.includes('Quota exceeded'));
      if (isRateLimit && retries > 0) {
        console.warn(`[RAG Service] Limite de taxa (429) do Gemini atingido para batch embedding. Aguardando 40 segundos antes de tentar novamente... (${retries} de tentativas restantes)`);
        await new Promise(resolve => setTimeout(resolve, 40000));
        return generateEmbeddingsBatch(texts, inputType, retries - 1);
      }
      console.warn('[RAG Service] Falha ao gerar batch embeddings com Gemini, tentando Pinecone Inference...', err.message || err);
    }
  }

  // Fallback to Pinecone Inference
  const result = await (pc.inference as any)._embed({
    model: EMBEDDING_MODEL,
    inputs: texts,
    parameters: { inputType }
  });

  if (result && result.data) {
    return result.data.map((item: any) => item.values);
  }
  
  throw new Error('Falha ao gerar embeddings em batch.');
}

/**
 * Splits a book's content, embeds each chunk, and uploads to Pinecone index.
 */
export async function upsertBookChunks(
  bookId: string,
  title: string,
  author: string | null,
  content: string,
  _geminiApiKey?: string // kept for backwards compatibility but no longer used
): Promise<void> {
  const chunks = splitTextIntoChunks(content);
  if (chunks.length === 0) return;

  const index = pc.index(pineconeIndex);
  const namespace = index.namespace(pineconeNamespace);

  console.log(`[RAG Service] Preparando para processar ${chunks.length} trechos do livro "${title}"`);

  // Use batch size of 90 for Gemini to reduce API request count, or 20 for Pinecone
  const hasGemini = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0);
  const embeddingBatchSize = hasGemini ? 90 : 20;
  const vectors: any[] = [];

  for (let batchStart = 0; batchStart < chunks.length; batchStart += embeddingBatchSize) {
    const batchChunks = chunks.slice(batchStart, batchStart + embeddingBatchSize);
    const batchEmbeddings = await generateEmbeddingsBatch(batchChunks, 'passage');

    for (let j = 0; j < batchChunks.length; j++) {
      const globalIndex = batchStart + j;
      vectors.push({
        id: `book_${bookId}_chunk_${globalIndex}`,
        values: batchEmbeddings[j],
        metadata: {
          bookId,
          title,
          author: author || 'Autor desconhecido',
          chunkIndex: globalIndex,
          text: batchChunks[j]
        }
      });
    }

    console.log(`[RAG Service] Embeddings gerados: ${Math.min(batchStart + embeddingBatchSize, chunks.length)}/${chunks.length}`);
    
    // Rate limit safeguard: sleep 800ms between batch requests when using Gemini
    if (hasGemini && batchStart + embeddingBatchSize < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  }

  // Batch upsert in blocks of 50 vectors
  const upsertBatchSize = 50;
  for (let i = 0; i < vectors.length; i += upsertBatchSize) {
    const batch = vectors.slice(i, i + upsertBatchSize);
    await namespace.upsert({ records: batch });
    console.log(`[RAG Service] Upserted: ${Math.min(i + upsertBatchSize, vectors.length)}/${vectors.length} vetores`);
  }

  console.log(`[RAG Service] Concluído o envio de ${vectors.length} vetores para o Pinecone.`);
}

/**
 * Deletes all vectors associated with a book ID from Pinecone.
 */
export async function deleteBookChunks(bookId: string, content: string): Promise<void> {
  const chunks = splitTextIntoChunks(content);
  const ids = chunks.map((_, idx) => `book_${bookId}_chunk_${idx}`);
  if (ids.length === 0) return;
  
  const index = pc.index(pineconeIndex);
  const namespace = index.namespace(pineconeNamespace);
  
  console.log(`[RAG Service] Deletando ${ids.length} trechos do Pinecone para o livro ID ${bookId}`);
  
  try {
    const batchSize = 500;
    for (let i = 0; i < ids.length; i += batchSize) {
      const slice = ids.slice(i, i + batchSize);
      await namespace.deleteMany(slice);
    }
  } catch (err) {
    console.error(`[RAG Service] Erro ao deletar vetores do Pinecone:`, err);
  }
}

const RAG_CACHE = new Map<string, { result: string; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

/**
 * Queries Pinecone for relevant support text chunks with in-memory caching and strict 1200ms timeout.
 */
export async function queryLibrary(queryText: string, _geminiApiKey?: string): Promise<string> {
  const normalizedKey = queryText.trim().toLowerCase();
  const cached = RAG_CACHE.get(normalizedKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log(`[RAG Service] Cache HIT para "${normalizedKey.slice(0, 30)}..."`);
    return cached.result;
  }

  const queryExecution = async (): Promise<string> => {
    try {
      const embedding = await generateEmbedding(queryText, 'query');
      
      const index = pc.index(pineconeIndex);
      const namespace = index.namespace(pineconeNamespace);

      const queryResponse = await namespace.query({
        vector: embedding,
        topK: 3,
        includeMetadata: true
      });

      if (!queryResponse || !queryResponse.matches || queryResponse.matches.length === 0) {
        return '';
      }

      const matchesFiltered = queryResponse.matches.filter(m => m.score !== undefined && m.score > 0.45);
      if (matchesFiltered.length === 0) {
        return '';
      }

      const contextFormatted = matchesFiltered.map(match => {
        const metadata = match.metadata as any;
        return `[Trecho de "${metadata.title}" por ${metadata.author}]:\n"${metadata.text}"`;
      }).join('\n\n');

      if (contextFormatted) {
        RAG_CACHE.set(normalizedKey, { result: contextFormatted, timestamp: Date.now() });
      }

      return contextFormatted;
    } catch (error) {
      console.warn('[RAG Service] Falha não impeditiva ao consultar Pinecone:', error);
      return '';
    }
  };

  // Enforce a strict 1200ms timeout so RAG never delays conversational flow
  const timeoutPromise = new Promise<string>((resolve) => 
    setTimeout(() => {
      console.warn('[RAG Service] Limite de 1200ms atingido. Continuando fluxo para resposta instantânea.');
      resolve('');
    }, 1200)
  );

  return Promise.race([queryExecution(), timeoutPromise]);
}
