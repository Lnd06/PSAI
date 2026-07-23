import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatRedirectProps {
  token: string;
}

export const ChatRedirect: React.FC<ChatRedirectProps> = ({ token }) => {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        // 1. Get user's sessions
        const response = await axios.get('http://localhost:5000/api/chat', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data && response.data.length > 0) {
          // Redirect to the most recent session
          navigate(`/chat/${response.data[0].id}`, { replace: true });
        } else {
          // Create a new session
          const defaultMode = localStorage.getItem('psai_default_mode') || 'natural';
          const createResponse = await axios.post(
            'http://localhost:5000/api/chat',
            { mode: defaultMode },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (createResponse.data && createResponse.data.id) {
            navigate(`/chat/${createResponse.data.id}`, { replace: true });
          } else {
            setError('Erro ao criar sessão inicial.');
          }
        }
      } catch (err: any) {
        console.error('Error in ChatRedirect:', err);
        setError('Falha ao conectar com o servidor. Tente novamente mais tarde.');
      }
    };

    handleRedirect();
  }, [token, navigate]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-brand-bg flex flex-col items-center justify-center text-brand-textMuted p-6"
    >
      <AnimatePresence mode="wait">
        {error ? (
          <motion.div 
            key="error"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-xl border border-red-500/20 bg-red-500/[0.04] text-red-700 text-xs font-sans max-w-sm text-center"
          >
            {error}
          </motion.div>
        ) : (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="text-brand-gold mb-3"
            >
              <Loader2 size={28} />
            </motion.div>
            <span className="text-xs font-sans">Carregando seu diário...</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
export default ChatRedirect;
