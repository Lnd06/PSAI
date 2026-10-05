import { defaultClassifier } from './emotionClassifier';

/**
 * Classifies the emotional tone of a given text using the native TypeScript Naive Bayes classifier.
 * Returns one of: "alegria", "tristeza", "surpresa", "medo", "desgosto", "raiva", or "Neutro" (fallback).
 */
export async function classifyEmotion(text: string): Promise<string> {
  const sanitizedText = (text || '').trim().slice(0, 500).replace(/^[-]+/, '');
  if (sanitizedText.length === 0) {
    return 'Neutro';
  }

  try {
    const emotion = defaultClassifier.classify(sanitizedText);
    return emotion;
  } catch (err) {
    console.error('[Emotion Service] Error during classification:', err);
    return 'Neutro';
  }
}

export { EmotionClassifier, defaultClassifier } from './emotionClassifier';
