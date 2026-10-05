import * as fs from 'fs';
import * as path from 'path';

const STOPWORDS = new Set([
  'a', 'ao', 'aos', 'aquela', 'aquelas', 'aquele', 'aqueles', 'aquilo', 'as', 'até',
  'com', 'como', 'da', 'das', 'de', 'dela', 'delas', 'dele', 'deles', 'depois',
  'do', 'dos', 'e', 'ela', 'elas', 'ele', 'eles', 'em', 'entre', 'era',
  'eram', 'éramos', 'essa', 'essas', 'esse', 'esses', 'esta', 'estamos', 'estas',
  'estava', 'estavam', 'estávamos', 'este', 'estes', 'estive', 'estivemos', 'estiveram',
  'estivéssemos', 'estou', 'está', 'estão', 'eu', 'foi', 'fomos', 'for', 'fora',
  'foram', 'forem', 'formos', 'fosse', 'fossem', 'fôssemos', 'fui', 'há', 'haja',
  'hajam', 'hajamos', 'havemos', 'hei', 'houve', 'houvemos', 'houver', 'houvera',
  'houveram', 'houvéramos', 'houverem', 'houveria', 'houveriam', 'houveríamos', 'houvesse',
  'houvessem', 'houvéssemos', 'isso', 'isto', 'já', 'lhe', 'lhes', 'mais', 'mas',
  'me', 'mesmo', 'meu', 'meus', 'minha', 'minhas', 'muito', 'na', 'nas', 'nem',
  'no', 'nos', 'nossa', 'nossas', 'nosso', 'nossos', 'num', 'numa', 'não', 'nós',
  'o', 'os', 'ou', 'para', 'pela', 'pelas', 'pelo', 'pelos', 'por', 'qual',
  'quando', 'que', 'quem', 'se', 'seja', 'sejam', 'sejamos', 'sem', 'ser',
  'será', 'serão', 'seremos', 'seria', 'seriam', 'seríamos', 'seu', 'seus',
  'sua', 'suas', 'só', 'também', 'te', 'tem', 'temos', 'tenha', 'tenham',
  'tenhamos', 'tenho', 'ter', 'terá', 'terão', 'teremos', 'teria', 'teriam',
  'teríamos', 'teu', 'teus', 'tinha', 'tinham', 'tive', 'tivemos', 'tiver',
  'tivera', 'tiveram', 'tiverem', 'tivermos', 'tivesse', 'tivessem', 'tivéssemos',
  'tu', 'tua', 'tuas', 'tém', 'tínhamos', 'um', 'uma', 'você', 'vocês', 'vos',
  'é', 'éramos'
]);

export interface ClassifierModelData {
  classDocCounts: Record<string, number>;
  classWordCounts: Record<string, Record<string, number>>;
  classTotalWords: Record<string, number>;
  totalDocs: number;
  vocabulary: string[];
}

export class EmotionClassifier {
  private classDocCounts: Record<string, number> = {};
  private classWordCounts: Record<string, Record<string, number>> = {};
  private classTotalWords: Record<string, number> = {};
  private totalDocs = 0;
  private vocabularySet = new Set<string>();
  private emotions: string[] = [];
  private isLoaded = false;

  constructor() {
    this.initDefault();
  }

  private initDefault(): void {
    const backendDir = path.resolve(__dirname, '../..');
    const modelJsonPath = path.join(backendDir, 'data/model.json');
    const csvPath = path.join(backendDir, 'data/comments.csv');

    if (fs.existsSync(modelJsonPath)) {
      try {
        this.load(modelJsonPath);
        return;
      } catch (err) {
        console.warn('[EmotionClassifier] Failed to load model.json, rebuilding from comments.csv:', err);
      }
    }

    if (fs.existsSync(csvPath)) {
      try {
        this.train(csvPath, modelJsonPath);
        return;
      } catch (err) {
        console.error('[EmotionClassifier] Failed to train from comments.csv:', err);
      }
    }
  }

  public normalizeWord(word: string): string {
    return word
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  public lightStem(word: string): string {
    let w = this.normalizeWord(word);
    if (w.length <= 3) return w;
    // Plurals
    if (w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
    // Common Portuguese verbal and adjectival suffixes
    const suffixes = [
      'mente', 'zinho', 'zinha', 'issimo', 'issima',
      'ando', 'endo', 'indo',
      'aram', 'eram', 'iram', 'avam',
      'acao', 'acoes', 'dade', 'dades',
      'oso', 'osa', 'osos', 'osas'
    ];
    for (const suf of suffixes) {
      if (w.endsWith(suf) && w.length - suf.length >= 3) {
        w = w.slice(0, -suf.length);
        break;
      }
    }
    return w;
  }

  public tokenize(text: string): string[] {
    const matches = (text || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
    const tokens: string[] = [];
    for (const m of matches) {
      if (STOPWORDS.has(m) || m.length < 2) continue;
      tokens.push(this.lightStem(m));
    }
    return tokens;
  }

  public train(csvPath: string, savePath?: string): void {
    if (!fs.existsSync(csvPath)) {
      throw new Error(`Dataset comments.csv not found at ${csvPath}`);
    }

    const rawContent = fs.readFileSync(csvPath, 'utf8');
    const lines = rawContent.split(/\r?\n/);

    this.classDocCounts = {};
    this.classWordCounts = {};
    this.classTotalWords = {};
    this.vocabularySet = new Set<string>();
    this.totalDocs = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const commaIdx = line.lastIndexOf(',');
      if (commaIdx === -1) continue;

      let text = line.slice(0, commaIdx).trim();
      let emotion = line.slice(commaIdx + 1).trim();

      // Clean surrounding quotes
      if (text.startsWith('"') && text.endsWith('"')) {
        text = text.slice(1, -1).replace(/""/g, '"');
      }
      emotion = emotion.replace(/^["']|["']$/g, '').trim();

      if (!text || !emotion) continue;

      this.totalDocs++;
      this.classDocCounts[emotion] = (this.classDocCounts[emotion] || 0) + 1;

      if (!this.classWordCounts[emotion]) {
        this.classWordCounts[emotion] = {};
        this.classTotalWords[emotion] = 0;
      }

      const tokens = this.tokenize(text);
      for (const t of tokens) {
        this.vocabularySet.add(t);
        this.classWordCounts[emotion][t] = (this.classWordCounts[emotion][t] || 0) + 1;
        this.classTotalWords[emotion]++;
      }
    }

    this.emotions = Object.keys(this.classDocCounts);
    this.isLoaded = true;

    if (savePath) {
      try {
        const data: ClassifierModelData = {
          classDocCounts: this.classDocCounts,
          classWordCounts: this.classWordCounts,
          classTotalWords: this.classTotalWords,
          totalDocs: this.totalDocs,
          vocabulary: Array.from(this.vocabularySet)
        };
        fs.writeFileSync(savePath, JSON.stringify(data), 'utf8');
      } catch (err) {
        console.warn(`[EmotionClassifier] Could not save model to ${savePath}:`, err);
      }
    }
  }

  public load(modelPath: string): void {
    if (!fs.existsSync(modelPath)) {
      throw new Error(`Model file not found at ${modelPath}`);
    }

    const raw = fs.readFileSync(modelPath, 'utf8');
    const data: ClassifierModelData = JSON.parse(raw);

    this.classDocCounts = data.classDocCounts;
    this.classWordCounts = data.classWordCounts;
    this.classTotalWords = data.classTotalWords;
    this.totalDocs = data.totalDocs;
    this.vocabularySet = new Set(data.vocabulary);
    this.emotions = Object.keys(this.classDocCounts);
    this.isLoaded = true;
  }

  public classify(text: string): string {
    if (!this.isLoaded || this.totalDocs === 0) {
      return 'Neutro';
    }

    const sanitized = (text || '').trim().slice(0, 500);
    if (!sanitized) {
      return 'Neutro';
    }

    const tokens = this.tokenize(sanitized);
    if (tokens.length === 0) {
      return 'Neutro';
    }

    // Check how many tokens are in vocabulary
    let knownTokens = 0;
    for (const t of tokens) {
      if (this.vocabularySet.has(t)) knownTokens++;
    }

    // If text contains no recognized affective tokens from vocabulary, return Neutro
    if (knownTokens === 0) {
      return 'Neutro';
    }

    const V = this.vocabularySet.size;
    const scores: Record<string, number> = {};

    for (const c of this.emotions) {
      const logPrior = Math.log(this.classDocCounts[c] / this.totalDocs);
      let logLikelihood = 0;
      const wordCounts = this.classWordCounts[c] || {};
      const totalWords = this.classTotalWords[c] || 0;

      for (const t of tokens) {
        const count = wordCounts[t] || 0;
        // Laplace smoothing (alpha = 1)
        logLikelihood += Math.log((count + 1) / (totalWords + V));
      }
      scores[c] = logPrior + logLikelihood;
    }

    let bestEmotion = this.emotions[0];
    let maxScore = scores[bestEmotion];
    for (const c of this.emotions) {
      if (scores[c] > maxScore) {
        maxScore = scores[c];
        bestEmotion = c;
      }
    }

    return bestEmotion;
  }
}

// Singleton instance for in-memory re-use across backend requests
export const defaultClassifier = new EmotionClassifier();
