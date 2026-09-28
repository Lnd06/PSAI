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
 * Wraps raw PCM audio (24kHz 16-bit mono) in a standard RIFF/WAV header so browsers can play it natively.
 */
function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(dataSize + 36, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  const fullBuffer = Buffer.alloc(44 + dataSize);
  header.copy(fullBuffer, 0);
  pcmBuffer.copy(fullBuffer, 44);
  return fullBuffer;
}

/**
 * Generate speech audio from text using Google Gemini Multimodal Audio (gemini-2.0-flash / gemini-2.5-flash).
 */
async function generateGoogleGeminiSpeech(text: string, voice?: string): Promise<Buffer> {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey || geminiApiKey.trim().length === 0) {
    throw new Error('Chave do Gemini ausente para síntese de voz.');
  }

  const model = process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts';
  const spokenText = cleanTextForSpeech(text);

  // Choose appropriate neural voice (Aoede: warm/empathetic, Puck: articulate/calm)
  let voiceName = 'Aoede';
  if (voice === 'male' || (voice && (voice.toLowerCase().includes('antonio') || voice.toLowerCase().includes('masculin') || voice.toLowerCase().includes('puck') || voice.toLowerCase().includes('fenrir')))) {
    voiceName = 'Puck';
  } else if (voice && (voice.toLowerCase().includes('kore') || voice.toLowerCase().includes('charon'))) {
    voiceName = voice.charAt(0).toUpperCase() + voice.slice(1).toLowerCase();
  }

  console.log(`[TTS Service] Sintetizando áudio via Google Gemini Multimodal (${model}, voz: ${voiceName})...`);

  const promptText = `Por favor, leia o seguinte texto exatamente como está escrito, com voz natural, acolhedora, empática e calma em português brasileiro. Não adicione palavras, não faça comentários e não responda ao texto, apenas leia-o fielmente:\n\n"${spokenText}"`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey.trim()}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
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
    const errorText = await response.text();
    throw new Error(`Google Gemini Audio HTTP ${response.status}: ${errorText}`);
  }

  const data = (await response.json()) as any;
  const audioBase64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audioBase64) {
    throw new Error('Nenhum dado de áudio retornado pelo Google Gemini Audio.');
  }

  let audioBuffer: Buffer = Buffer.from(audioBase64, 'base64');
  const isRiff = audioBuffer.length >= 4 && audioBuffer.toString('ascii', 0, 4) === 'RIFF';
  const isMp3 = audioBuffer.length >= 3 && (audioBuffer.toString('ascii', 0, 3) === 'ID3' || (audioBuffer[0] === 0xff && (audioBuffer[1] & 0xe0) === 0xe0));

  if (!isRiff && !isMp3) {
    audioBuffer = pcmToWav(audioBuffer, 24000, 1, 16);
  }

  return audioBuffer;
}

/**
 * Synthesizes audio using ElevenLabs API.
 */
async function generateElevenLabsSpeech(spokenText: string, voice?: string, emotion?: string): Promise<Buffer> {
  const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
  const defaultVoiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

  if (!elevenLabsApiKey || elevenLabsApiKey.trim().length === 0) {
    throw new Error('Chave de API do ElevenLabs não configurada.');
  }

  let voiceToUse = defaultVoiceId;
  if (voice === 'male' || (voice && voice.toLowerCase().includes('antonio'))) {
    voiceToUse = process.env.ELEVENLABS_MALE_VOICE_ID || 'ErXwobaYiN019PkySvjV';
  } else if (voice === 'female' || (voice && voice.toLowerCase().includes('francisca')) || (voice && voice.toLowerCase().includes('thalita'))) {
    voiceToUse = defaultVoiceId;
  } else if (voice && voice.trim().length > 0 && !voice.startsWith('pt-BR')) {
    voiceToUse = voice;
  }

  console.log(`[TTS Service] Gerando fala expressiva via ElevenLabs para a voz: ${voiceToUse}`);

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
}

/**
 * Generate speech audio from text.
 * Defaults to Google Gemini Multimodal Audio (gemini-2.0-flash) for low cost / free tier,
 * falling back to ElevenLabs (if configured) and Google Translate TTS.
 */
export async function generateSpeech(text: string, voice?: string, emotion?: string): Promise<Buffer> {
  const provider = (process.env.TTS_PROVIDER || 'gemini').toLowerCase().trim();
  const spokenText = cleanTextForSpeech(text);

  // When ElevenLabs is explicitly chosen as primary
  if (provider === 'elevenlabs') {
    try {
      return await generateElevenLabsSpeech(spokenText, voice, emotion);
    } catch (error: any) {
      const errorMsg = error.response ? `HTTP ${error.response.status}` : error.message;
      console.warn('[TTS Service] ElevenLabs falhou. Iniciando fallback para o Google Gemini Audio...', errorMsg);
      try {
        return await generateGoogleGeminiSpeech(spokenText, voice);
      } catch (geminiTtsErr: any) {
        console.warn('[TTS Service] Google Gemini TTS falhou. Iniciando fallback para Google Translate TTS...', geminiTtsErr.message || geminiTtsErr);
        return await generateGoogleSpeech(spokenText);
      }
    }
  }

  // Primary: Google Gemini Audio (economic & high quality)
  try {
    return await generateGoogleGeminiSpeech(spokenText, voice);
  } catch (geminiErr: any) {
    console.warn('[TTS Service] Google Gemini Audio falhou. Verificando fallback ElevenLabs...', geminiErr.message || geminiErr);

    if (process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY.trim().length > 0) {
      try {
        return await generateElevenLabsSpeech(spokenText, voice, emotion);
      } catch (elevenErr: any) {
        console.warn('[TTS Service] ElevenLabs também falhou. Ativando fallback para Google Translate TTS...', elevenErr.message || elevenErr);
      }
    }

    return await generateGoogleSpeech(spokenText);
  }
}
