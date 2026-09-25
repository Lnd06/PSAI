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
 * Cleans text for speech synthesis, stripping markdown symbols and adding natural cadence.
 */
function cleanTextForSpeech(text: string): string {
  return text
    .replace(/[*#_~`>]/g, '') // remove markdown formatting
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // strip links
    .replace(/—/g, ', ') // convert em-dashes to natural pauses
    .replace(/\n+/g, ' ') // convert newlines to smooth conversational flow
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Generate speech audio from text using Google Gemini Neural TTS (gemini-3.8-flash-tts).
 */
async function generateGoogleGeminiSpeech(text: string, voice?: string): Promise<Buffer> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey || geminiApiKey.trim().length === 0) {
    throw new Error('Chave do Gemini ausente para síntese de voz.');
  }

  const spokenText = cleanTextForSpeech(text);

  // Choose appropriate neural voice
  let voiceName = 'Aoede'; // Natural, soothing, empathetic female voice
  if (voice === 'male' || (voice && (voice.toLowerCase().includes('antonio') || voice.toLowerCase().includes('masculin') || voice.toLowerCase().includes('puck') || voice.toLowerCase().includes('fenrir')))) {
    voiceName = 'Puck'; // Warm, articulate male voice
  } else if (voice && (voice.toLowerCase().includes('kore') || voice.toLowerCase().includes('charon'))) {
    voiceName = voice.charAt(0).toUpperCase() + voice.slice(1).toLowerCase();
  }

  console.log(`[TTS Service] Sintetizando áudio via Google Gemini Neural TTS (${voiceName})...`);

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash-tts:generateContent?key=${geminiApiKey.trim()}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: spokenText }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName
            }
          }
        }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Google Gemini TTS HTTP ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as any;
  const audioBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audioBase64) {
    throw new Error('Nenhum dado de áudio retornado pelo Google Gemini TTS.');
  }

  return Buffer.from(audioBase64, 'base64');
}

/**
 * Generate speech audio from text using ElevenLabs API, falling back to Google Gemini TTS and Google TTS.
 */
export async function generateSpeech(text: string, voice?: string, emotion?: string): Promise<Buffer> {
  const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
  const defaultVoiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
  const spokenText = cleanTextForSpeech(text);

  try {
    if (!elevenLabsApiKey || elevenLabsApiKey.trim().length === 0) {
      throw new Error('Chave de API do ElevenLabs não configurada.');
    }

    let voiceToUse = defaultVoiceId;
    if (voice === 'male' || (voice && voice.toLowerCase().includes('antonio'))) {
      voiceToUse = process.env.ELEVENLABS_MALE_VOICE_ID || 'ErXwobaYiN019PkySvjV'; // Antoni
    } else if (voice === 'female' || (voice && voice.toLowerCase().includes('francisca')) || (voice && voice.toLowerCase().includes('thalita'))) {
      voiceToUse = defaultVoiceId; // Francisca
    } else if (voice && voice.trim().length > 0 && !voice.startsWith('pt-BR')) {
      voiceToUse = voice;
    }

    console.log(`[TTS Service] Gerando fala expressiva via ElevenLabs para a voz: ${voiceToUse}`);
    
    // Rich expressive emotional tuning: lower stability + higher style = human warmth, breath and inflection
    let stability = 0.38;
    let similarityBoost = 0.82;
    let style = 0.40;
    
    if (emotion) {
      const emo = emotion.toLowerCase();
      if (emo.includes('alegria') || emo.includes('happy')) {
        stability = 0.34;
        style = 0.48;
      } else if (emo.includes('tristeza') || emo.includes('depressive')) {
        stability = 0.44;
        style = 0.40;
      } else if (emo.includes('raiva') || emo.includes('stressed')) {
        stability = 0.35;
        style = 0.42;
      } else if (emo.includes('medo') || emo.includes('anxiolytic')) {
        stability = 0.40;
        style = 0.36;
      }
    }

    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceToUse}`,
      {
        text: spokenText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          style,
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
    console.warn('[TTS Service] ElevenLabs falhou. Iniciando fallback para o Google Gemini Neural TTS...', errorMsg);
    
    // Fallback 1: Google Gemini Neural TTS
    try {
      return await generateGoogleGeminiSpeech(text, voice);
    } catch (geminiTtsErr: any) {
      console.warn('[TTS Service] Google Gemini TTS falhou. Iniciando fallback leve para Google Translate TTS...', geminiTtsErr.message || geminiTtsErr);
      
      // Fallback 2: Google Translate TTS
      return await generateGoogleSpeech(text);
    }
  }
}
