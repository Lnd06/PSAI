import { spawn } from 'child_process';
import * as path from 'path';

const pythonPath = process.env.PYTHON_PATH || 'python';
const classifierScript = path.join(__dirname, 'classify_emotion.py');

/**
 * Classifies the emotional tone of a given text using the Python Naive Bayes classifier.
 * Returns one of: "alegria", "tristeza", "surpresa", "medo", "desgosto", "raiva", or "Neutro" (fallback).
 */
export async function classifyEmotion(text: string): Promise<string> {
  if (!text || text.trim().length === 0) {
    return 'Neutro';
  }

  return new Promise((resolve) => {
    // Spawn the python classify script
    const pyProcess = spawn(pythonPath, [
      classifierScript,
      '--classify',
      text
    ]);

    let stdoutData = '';
    let stderrData = '';

    pyProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    pyProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    pyProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`[Emotion Service] Classifier exited with code ${code}. Stderr: ${stderrData}`);
        return resolve('Neutro');
      }

      try {
        const parsed = JSON.parse(stdoutData.trim());
        if (parsed && parsed.emotion) {
          return resolve(parsed.emotion);
        } else if (parsed && parsed.error) {
          console.error(`[Emotion Service] Classifier returned error: ${parsed.error}`);
        }
      } catch (parseErr) {
        console.error(`[Emotion Service] Failed to parse classifier JSON: "${stdoutData}"`, parseErr);
      }
      resolve('Neutro');
    });

    pyProcess.on('error', (err) => {
      console.error('[Emotion Service] Failed to spawn classifier process:', err);
      resolve('Neutro');
    });
  });
}
