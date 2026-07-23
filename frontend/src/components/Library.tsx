import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  ChevronLeft, Loader2, BookOpen, 
  User, Calendar, FileText, AlertTriangle 
} from 'lucide-react';
import { PSAILogo } from './PSAILogo';

interface Book {
  id: string;
  title: string;
  author: string | null;
  content: string;
  createdAt: string;
}

interface LibraryProps {
  token: string;
}

export const Library: React.FC<LibraryProps> = ({ token }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/library', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBooks(response.data);
    } catch (err: any) {
      console.error(err);
      setError('Não foi possível carregar a biblioteca RAG.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [token]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="min-h-screen pb-16 px-4 md:px-8 max-w-5xl mx-auto bg-brand-bg text-brand-text relative z-10"
    >
      {/* Background Blurs */}
      <div className="absolute top-[5%] right-[10%] w-96 h-96 bg-brand-gold rounded-full opacity-[0.015] blur-3xl pointer-events-none" />

      {/* HEADER */}
      <header className="flex items-center justify-between py-8 border-b border-brand-border mb-8 select-none">
        <div className="flex items-center gap-3 text-left">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2.5 rounded-xl border border-brand-border text-brand-textMuted hover:bg-brand-card hover:text-brand-gold hover:border-brand-gold/30 transition-all"
            title="Voltar ao Painel"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-3">
            <PSAILogo size={32} />
            <div>
              <span className="text-brand-gold font-bold text-[9px] uppercase tracking-wider font-sans block">Base de Conhecimento RAG</span>
              <h1 className="text-xl font-serif font-semibold text-brand-text">Biblioteca Científica</h1>
            </div>
          </div>
        </div>
      </header>

      {/* STATUS MESSAGE */}
      {error && (
        <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/[0.04] text-red-700 text-xs leading-relaxed font-sans text-left flex items-start gap-2.5">
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}



      {/* INFO CARD */}
      <div className="p-5 rounded-2xl border border-brand-border bg-brand-card/40 mb-8 text-left">
        <p className="text-xs text-brand-textMuted leading-relaxed font-sans">
          A **Biblioteca RAG (Retrieval-Augmented Generation)** permite que a PSAI consulte artigos científicos, livros de psicologia (como manuais de TCC/CBT) ou anotações clínicas na hora de responder ao usuário. O conteúdo enviado é fatiado em trechos, transformado em vetores matemáticos e salvo de forma segura na base de dados de conhecimento. Quando você conversa no diário, a IA busca as referências mais próximas semanticamente para fundamentar as respostas.
        </p>
      </div>

      {/* BOOKS LIST */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-brand-textMuted gap-3">
          <Loader2 className="animate-spin text-brand-gold" size={28} />
          <p className="text-xs font-sans">Carregando acervo científico...</p>
        </div>
      ) : books.length === 0 ? (
        <div className="border border-dashed border-brand-border rounded-2xl p-16 text-center text-brand-textMuted space-y-4">
          <BookOpen size={36} className="mx-auto text-neutral-600" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-brand-text">Nenhum livro indexado</p>
            <p className="text-xs">Sua biblioteca de apoio científico está vazia no momento.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {books.map((book) => (
            <motion.div
              layout
              key={book.id}
              className="p-5 rounded-2xl border border-brand-border bg-brand-card hover:border-brand-gold/25 transition-all text-left flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-serif font-semibold text-brand-text group-hover:text-brand-gold transition-colors">
                      {book.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-brand-textMuted font-sans">
                      <User size={12} className="text-brand-gold/80" />
                      <span>{book.author || 'Autor desconhecido'}</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-[11px] leading-relaxed text-brand-textMuted line-clamp-3 font-sans font-light">
                  {book.content}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-brand-border flex items-center justify-between text-[9px] text-neutral-500 font-sans">
                <div className="flex items-center gap-1">
                  <Calendar size={11} />
                  <span>Indexado em {new Date(book.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-brand-bg border border-brand-border">
                  <FileText size={10} className="text-brand-gold" />
                  <span>RAG Ativo</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
