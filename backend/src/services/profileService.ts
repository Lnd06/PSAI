import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Analyzes the user conversation message and AI response to extract user tastes, preferences,
 * name, and hobbies (excluding CPF), merging them into a persistent JSON profile in the database.
 */
export async function updateUserProfile(userId: string, userMessage: string, aiResponse: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profileJson: true }
    });

    if (!user) return;

    const currentProfile = user.profileJson ? JSON.parse(user.profileJson) : {};

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      console.warn('[Profile Service] Gemini API Key not configured for profile extraction.');
      return;
    }

    const systemInstruction = `Você é um extrator de perfil do PSAI. Seu papel é analisar a interação recente entre o usuário e a IA e extrair gostos, preferências, hobbies, nome, dores principais e qualquer fato relevante sobre o usuário (EXCETO CPF). Você deve mesclar essas informações no perfil JSON atual e retornar o JSON atualizado.
Retorne APENAS o objeto JSON puro atualizado. Sem formatação markdown de bloco de código (\`\`\`json). Se nenhuma nova informação foi aprendida, retorne exatamente o JSON de entrada.`;

    const contents = [
      {
        parts: [
          {
            text: `Perfil Atual do Usuário (JSON):
${JSON.stringify(currentProfile, null, 2)}

Conversa recente:
Usuário: "${userMessage}"
IA: "${aiResponse}"

Retorne o JSON atualizado contendo os fatos aprendidos:`
          }
        ]
      }
    ];

    const modelName = 'gemini-3.1-flash-lite';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1000,
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json() as any;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text && text.trim().length > 0) {
      try {
        const updatedProfile = JSON.parse(text.trim());
        
        // Safety: Ensure CPF is never stored in profile JSON
        if (updatedProfile.cpf) delete updatedProfile.cpf;
        if (updatedProfile.CPF) delete updatedProfile.CPF;

        await prisma.user.update({
          where: { id: userId },
          data: { profileJson: JSON.stringify(updatedProfile) }
        });
        console.log('[Profile Service] Perfil do usuário atualizado com sucesso!');
      } catch (jsonErr) {
        console.error('[Profile Service] Erro ao decodificar JSON gerado pelo Gemini:', text, jsonErr);
      }
    }
  } catch (err) {
    console.error('[Profile Service] Erro ao processar atualização de perfil do usuário:', err);
  }
}
