import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  ChevronLeft, Loader2, BookOpen, 
  User, Calendar, FileText, AlertTriangle,
  Plus, Trash2, X, Check
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
  const [success, setSuccess] = useState('');

  // Modal and submission state
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/library', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBooks(response.data);
      setError('');
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

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Título e conteúdo são obrigatórios.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(
        'http://localhost:5000/api/library',
        {
          title: title.trim(),
          author: author.trim() || 'Autor desconhecido',
          content: content.trim()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Material indexado e vetorizado no Pinecone com sucesso!');
      setTitle('');
      setAuthor('');
      setContent('');
      setShowAddModal(false);
      await fetchBooks();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Erro ao adicionar livro à base RAG.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBook = async (e: React.MouseEvent, bookId: string) => {
    e.stopPropagation();
    if (!confirm('Deseja realmente remover este material da biblioteca RAG? Os vetores correspondentes serão apagados.')) {
      return;
    }

    setDeletingId(bookId);
    setError('');
    setSuccess('');

    try {
      await axios.delete(`http://localhost:5000/api/library/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Material removido da biblioteca.');
      setBooks(prev => prev.filter(b => b.id !== bookId));
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Erro ao excluir material.');
    } finally {
      setDeletingId(null);
    }
  };

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
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-8 border-b border-brand-border mb-8 select-none">
        <div className="flex items-center gap-3 text-left">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2.5 rounded-xl border border-brand-border text-brand-textMuted hover:bg-brand-card hover:text-brand-gold hover:border-brand-gold/30 transition-all cursor-pointer"
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

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-gold text-brand-bg font-bold text-xs uppercase tracking-wider hover:bg-brand-goldHover transition-all shadow-sm shadow-brand-gold/10 cursor-pointer"
        >
          <Plus size={14} /> Adicionar Material
        </button>
      </header>

      {/* STATUS MESSAGES */}
      {error && (
        <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/[0.04] text-red-700 text-xs leading-relaxed font-sans text-left flex items-start gap-2.5">
          <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-700 text-xs leading-relaxed font-sans text-left flex items-start gap-2.5">
          <Check size={15} className="flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* INFO CARD */}
      <div className="p-5 rounded-2xl border border-brand-border bg-brand-card/40 mb-8 text-left">
        <p className="text-xs text-brand-textMuted leading-relaxed font-sans">
          A <strong>Biblioteca RAG (Retrieval-Augmented Generation)</strong> permite que a PSAI consulte artigos científicos, livros de psicologia (como manuais de TCC/CBT) ou anotações clínicas na hora de responder ao usuário. O conteúdo enviado é fatiado em trechos, transformado em vetores matemáticos e salvo de forma segura na base de dados de conhecimento. Quando você conversa no diário, a IA busca as referências mais próximas semanticamente para fundamentar as respostas.
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
            <p className="text-xs">Sua biblioteca de apoio científico está vazia no momento. Clique no botão acima para adicionar.</p>
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
                  <div className="space-y-1 min-w-0 flex-1">
                    <h3 className="text-sm font-serif font-semibold text-brand-text group-hover:text-brand-gold transition-colors truncate">
                      {book.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-brand-textMuted font-sans">
                      <User size={12} className="text-brand-gold/80" />
                      <span className="truncate">{book.author || 'Autor desconhecido'}</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDeleteBook(e, book.id)}
                    disabled={deletingId === book.id}
                    className="p-1.5 rounded-lg text-brand-textMuted/60 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer flex-shrink-0"
                    title="Excluir material e limpar vetores"
                  >
                    {deletingId === book.id ? (
                      <Loader2 size={13} className="animate-spin text-rose-500" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                  </button>
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

      {/* Modal Adicionar Livro */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-text/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-brand-card border border-brand-border rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl relative select-none">
            <div className="flex items-center justify-between pb-4 border-b border-brand-border mb-4">
              <div>
                <span className="text-[9px] font-bold text-brand-gold uppercase tracking-wider block font-sans">Acervo Vetorial</span>
                <h3 className="text-lg font-serif font-semibold text-brand-text">Indexar Novo Material</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-brand-textMuted hover:text-brand-text rounded-lg hover:bg-brand-bg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddBook} className="space-y-4 font-sans text-left">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider block">Título do Livro / Artigo</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Terapia Cognitivo-Comportamental: Teoria e Prática"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-gold/60"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider block">Autor(a) / Referência</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Ex: Judith S. Beck"
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-gold/60"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-brand-textMuted uppercase tracking-wider block">
                  Conteúdo Textual (Será fatiado e vetorizado)
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Cole aqui o texto, capítulo, resumo técnico ou diretrizes clínicas que a PSAI deve utilizar como base de conhecimento..."
                  rows={6}
                  className="w-full bg-brand-bg border border-brand-border rounded-xl px-4 py-2.5 text-xs text-brand-text focus:outline-none focus:border-brand-gold/60 leading-relaxed resize-none"
                  required
                />
                <span className="text-[9px] text-brand-textMuted/60 block text-right">
                  {content.length} caracteres
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl border border-brand-border text-brand-textMuted text-xs font-semibold hover:bg-brand-bg hover:text-brand-text cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-brand-gold text-brand-bg hover:bg-brand-goldHover font-bold text-xs uppercase tracking-wider shadow cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Vetorizando no Pinecone...
                    </>
                  ) : (
                    'Indexar Material'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
};
