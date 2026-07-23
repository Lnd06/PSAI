import axios from 'axios';

/**
 * Split text into small chunks under a character limit, preserving word boundaries.
 */
function splitTextIntoChunks(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  const words = text.split(' ');

  for (const word of words) {
    if ((currentChunk + ' ' + word).length > maxLength) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = word;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + word;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Generate speech audio from text using Google TTS (unofficial Translate API).
 */
async function generateGoogleSpeech(text: string): Promise<Buffer> {
  try {
    console.log('[TTS Service] Sintetizando áudio via Google TTS (Fallback)...');
    const chunks = splitTextIntoChunks(text, 200);
    const buffers: Buffer[] = [];

    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=pt-BR&client=tw-ob&q=${encodeURIComponent(chunk.trim())}`;
      
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36'
        }
      });
      
      buffers.push(Buffer.from(response.data));
    }

    return Buffer.concat(buffers);
  } catch (err: any) {
    console.error('[TTS Service] Falha crítica no Google TTS:', err.message || err);
    throw new Error(`Erro na síntese de voz Google TTS: ${err.message}`);
  }
}

/**
 * Generate speech audio from text using ElevenLabs API, falling back to Google TTS if it fails.
 */
export async function generateSpeech(text: string, voice?: string, emotion?: string): Promise<Buffer> {
  const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
  const defaultVoiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

  try {
    if (!elevenLabsApiKey || elevenLabsApiKey.trim().length === 0) {
      throw new Error('Chave de API do ElevenLabs não configurada.');
    }

    let voiceToUse = defaultVoiceId;
    if (voice === 'male' || (voice && voice.toLowerCase().includes('antonio'))) {
      voiceToUse = process.env.ELEVENLABS_MALE_VOICE_ID || 'ErXwobaYiN019PkySvjV'; // Antoni (Pre-made Multilingual Male Voice)
    } else if (voice === 'female' || (voice && voice.toLowerCase().includes('francisca')) || (voice && voice.toLowerCase().includes('thalita'))) {
      voiceToUse = defaultVoiceId; // Francisca (Default Female Voice)
    } else if (voice && voice.trim().length > 0 && !voice.startsWith('pt-BR')) {
      voiceToUse = voice; // Direct ElevenLabs ID
    }

    console.log(`[TTS Service] Gerando fala via ElevenLabs para a voz: ${voiceToUse}`);
    
    let stability = 0.5;
    let similarityBoost = 0.75;
    
    if (emotion) {
      const emo = emotion.toLowerCase();
      if (emo === 'alegria') {
        stability = 0.4;
      } else if (emo === 'tristeza') {
        stability = 0.65;
      } else if (emo === 'raiva') {
        stability = 0.3;
      } else if (emo === 'medo') {
        stability = 0.45;
      }
    }

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceToUse}`,
      {
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style: 0.0,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          'xi-api-key': elevenLabsApiKey,
          'Content-Type': 'application/json',
          'accept': 'audio/mpeg'
        },
        responseType: 'arraybuffer'
      }
    );

    return Buffer.from(response.data);
  } catch (error: any) {
    let errorMsg = error.message || error;
    if (error.response) {
      try {
        const decoded = Buffer.from(error.response.data).toString('utf8');
        errorMsg = `HTTP ${error.response.status}: ${decoded}`;
      } catch (e) {
        errorMsg = `HTTP ${error.response.status}`;
      }
    }
    console.warn('[TTS Service] ElevenLabs falhou. Iniciando fallback para o Google TTS. Erro original:', errorMsg);
    
    // Execute fallback
    return await generateGoogleSpeech(text);
  }
}
