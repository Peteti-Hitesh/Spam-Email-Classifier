import { STOPWORDS, Intent } from './data';

// Standard tokenization: cleaning punctuation, lowercase, split, filter stopwords
export function tokenize(text: string, useStopwords: boolean): string[] {
  const cleaned = text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, ' ') // replace punctuation with spaces
    .trim();

  if (!cleaned) return [];

  const tokens = cleaned.split(/\s+/);
  if (useStopwords) {
    return tokens.filter(t => t.length > 0 && !STOPWORDS.has(t));
  }
  return tokens.filter(t => t.length > 0);
}

// Compute Levenshtein distance between two strings
export function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    const char1 = s1[i - 1];
    for (let j = 1; j <= n; j++) {
      const char2 = s2[j - 1];
      if (char1 === char2) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j], // deletion
          dp[i][j - 1], // insertion
          dp[i - 1][j - 1] // substitution
        );
      }
    }
  }
  return dp[m][n];
}

// Calculate similarity score based on Levenshtein (fuzzy typo tolerance)
export function calculateFuzzySimilarity(s1: string, s2: string): number {
  const val1 = s1.toLowerCase().trim();
  const val2 = s2.toLowerCase().trim();
  if (!val1 && !val2) return 1.0;
  if (!val1 || !val2) return 0.0;

  const dist = levenshteinDistance(val1, val2);
  const maxLength = Math.max(val1.length, val2.length);
  return 1 - dist / maxLength;
}

// Full TF-IDF Vector Space Model & Cosine Similarity Matcher
export interface IDFTable {
  [term: string]: number;
}

export interface TermFrequency {
  [term: string]: number;
}

export interface NLPResult {
  tokens: string[]; // Tokenized and preprocessed query
  intentScores: Array<{
    intentId: string;
    intentName: string;
    score: number;
    methodApplied: 'tfidf' | 'keyword' | 'fuzzy';
  }>;
  winningIntentId: string;
  confidence: number;
  matchedBy: 'tfidf' | 'keyword' | 'fuzzy' | 'fallback';
  // Detailed step info for visual explaining
  preprocessingSteps: {
    raw: string;
    lowercased: string;
    tokenized: string[];
    stopwordsRemoved: string[];
  };
  metricsBreakdown: {
    idfScores: { [term: string]: number };
    queryVector: { [term: string]: number };
    intentVector: { [term: string]: number };
    matchingTerms: string[];
  };
}

// Compute IDF for all vocab terms across the corpus
export function computeIDF(intents: Intent[], useStopwords: boolean): IDFTable {
  const idf: IDFTable = {};
  const totalDocs = intents.length;

  // Track document count containing each term
  const docCounts: { [term: string]: number } = {};
  const vocab = new Set<string>();

  intents.forEach(intent => {
    const combinedText = [intent.name, ...intent.phrases].join(' ');
    const tokens = new Set(tokenize(combinedText, useStopwords));
    tokens.forEach(t => {
      docCounts[t] = (docCounts[t] || 0) + 1;
      vocab.add(t);
    });
  });

  // Calculate IDF using Laplace-smoothed logarithmic ratio
  vocab.forEach(t => {
    const docsWithTerm = docCounts[t] || 1;
    idf[t] = Math.log(1 + (totalDocs / docsWithTerm)) + 1.0;
  });

  return idf;
}

// Simple TF-IDF Matcher Math Engine
export function analyzeCustomerQuery(
  query: string,
  intents: Intent[],
  algorithm: 'tfidf' | 'keyword' | 'fuzzy',
  activationThreshold: number,
  useStopwords: boolean
): NLPResult {
  const rawTokens = tokenize(query, false);
  const cleanTokens = tokenize(query, useStopwords);

  const preprocessingSteps = {
    raw: query,
    lowercased: query.toLowerCase(),
    tokenized: rawTokens,
    stopwordsRemoved: cleanTokens
  };

  const idfTable = computeIDF(intents, useStopwords);
  const intentScores: Array<{
    intentId: string;
    intentName: string;
    score: number;
    methodApplied: 'tfidf' | 'keyword' | 'fuzzy';
  }> = [];

  // Helper structures for keeping track of the winning intent's math details
  let topIntentMath: NLPResult['metricsBreakdown'] = {
    idfScores: {},
    queryVector: {},
    intentVector: {},
    matchingTerms: []
  };

  let maxScore = -1;
  let maxIntentId = 'fallback';

  // 1. Compute query vector
  const queryTfs: TermFrequency = {};
  cleanTokens.forEach(t => {
    queryTfs[t] = (queryTfs[t] || 0) + 1;
  });

  const queryVector: { [term: string]: number } = {};
  cleanTokens.forEach(t => {
    const idf = idfTable[t] || 1.0;
    queryVector[t] = (queryTfs[t] || 0) * idf;
  });

  // Normalize query vector magnitude
  let queryMagnitudeSq = 0;
  Object.values(queryVector).forEach(v => { queryMagnitudeSq += v * v; });
  const queryMagnitude = Math.sqrt(queryMagnitudeSq);

  // 2. Score each Intent
  intents.forEach(intent => {
    let score = 0;

    // Build the "Document" representation of the Intent (all phrases joined)
    const intentDoc = [intent.name, ...intent.phrases].join(' ');
    const intentTokens = tokenize(intentDoc, useStopwords);
    const intentTfs: TermFrequency = {};
    intentTokens.forEach(t => {
      intentTfs[t] = (intentTfs[t] || 0) + 1;
    });

    if (algorithm === 'tfidf') {
      // Create Intent vector active on the query vocabulary
      const intentVectorLocal: { [term: string]: number } = {};
      const idfScoresLocal: { [term: string]: number } = {};

      let intentMagnitudeSq = 0;
      // Find magnitude over all keywords in intent standard vocabulary
      const allIntentVocab = new Set(intentTokens);
      allIntentVocab.forEach(t => {
        const idf = idfTable[t] || 1.0;
        const tf = intentTfs[t] || 0;
        const val = tf * idf;
        intentMagnitudeSq += val * val;
        if (queryVector[t] !== undefined) {
          intentVectorLocal[t] = val;
          idfScoresLocal[t] = idf;
        }
      });
      const intentMagnitude = Math.sqrt(intentMagnitudeSq);

      // Compute Dot Product
      let dotProduct = 0;
      const matchingLocal: string[] = [];
      Object.keys(queryVector).forEach(t => {
        if (intentTfs[t] > 0) {
          const tfQuery = queryTfs[t] || 0;
          const tfIntent = intentTfs[t] || 0;
          const idf = idfTable[t] || 1.0;

          const termQueryWeight = tfQuery * idf;
          const termIntentWeight = tfIntent * idf;

          dotProduct += termQueryWeight * termIntentWeight;
          matchingLocal.push(t);
        }
      });

      // Cosine Similarity
      const cosineSim = (queryMagnitude > 0 && intentMagnitude > 0) 
        ? dotProduct / (queryMagnitude * intentMagnitude)
        : 0.0;

      score = parseFloat(cosineSim.toFixed(4));

      intentScores.push({
        intentId: intent.id,
        intentName: intent.name,
        score,
        methodApplied: 'tfidf'
      });

      if (score > maxScore) {
        maxScore = score;
        maxIntentId = intent.id;
        topIntentMath = {
          idfScores: idfScoresLocal,
          queryVector,
          intentVector: intentVectorLocal,
          matchingTerms: matchingLocal
        };
      }
    } 
    else if (algorithm === 'keyword') {
      // Word overlap keyword trigger check
      // Calculate ratio of matched words
      let overlapCount = 0;
      const matchedKeys: string[] = [];
      const queryWords = new Set(cleanTokens);
      
      const phrasesTokensList = intent.phrases.map(p => tokenize(p, useStopwords));
      // Look for full-phrase substring matches or individual trigger overlays
      let directSubstringMatch = false;
      const lowerQuery = query.toLowerCase();
      intent.phrases.forEach(phrase => {
        if (lowerQuery.includes(phrase.toLowerCase())) {
          directSubstringMatch = true;
        }
      });

      // Score based on word matches
      queryWords.forEach(qWord => {
        phrasesTokensList.forEach(phrT => {
          if (phrT.includes(qWord)) {
            overlapCount++;
            matchedKeys.push(qWord);
          }
        });
      });

      const matchedUnique = Array.from(new Set(matchedKeys));
      let overlapScore = directSubstringMatch ? 1.0 : 0.0;
      if (!directSubstringMatch && cleanTokens.length > 0) {
        overlapScore = Math.min(0.9, matchedUnique.length / Math.max(1, cleanTokens.length));
      }

      score = parseFloat(overlapScore.toFixed(4));
      intentScores.push({
        intentId: intent.id,
        intentName: intent.name,
        score,
        methodApplied: 'keyword'
      });

      if (score > maxScore) {
        maxScore = score;
        maxIntentId = intent.id;
        topIntentMath = {
          idfScores: {},
          queryVector: {},
          intentVector: {},
          matchingTerms: matchedUnique
        };
      }
    } 
    else if (algorithm === 'fuzzy') {
      // Calculate maximum Levenshtein distance match against individual training phrases
      let bestFuzzyWordSim = 0.0;
      let matchedWordRef = '';

      // Test each word in query against each word in intent's phrases vocabulary
      cleanTokens.forEach(qWord => {
        intentTokens.forEach(iWord => {
          const sim = calculateFuzzySimilarity(qWord, iWord);
          if (sim > bestFuzzyWordSim) {
            bestFuzzyWordSim = sim;
            matchedWordRef = `${qWord} ~ ${iWord}`;
          }
        });
      });

      // Sentence-level fuzzy check
      let sentenceSim = 0.0;
      intent.phrases.forEach(phrase => {
        const sim = calculateFuzzySimilarity(query, phrase);
        if (sim > sentenceSim) {
          sentenceSim = sim;
        }
      });

      // Composite fuzzy similarity score
      const combinedFuzzyScore = Math.max(sentenceSim, bestFuzzyWordSim * 0.85);
      score = parseFloat(combinedFuzzyScore.toFixed(4));

      intentScores.push({
        intentId: intent.id,
        intentName: intent.name,
        score,
        methodApplied: 'fuzzy'
      });

      if (score > maxScore) {
        maxScore = score;
        maxIntentId = intent.id;
        topIntentMath = {
          idfScores: {},
          queryVector: {},
          intentVector: {},
          matchingTerms: matchedWordRef ? [matchedWordRef] : []
        };
      }
    }
  });

  // Determine final intent trigger based on sliding activation threshold
  const matchedBy = maxScore >= activationThreshold ? algorithm : 'fallback';
  const finalWinIntentId = matchedBy === 'fallback' ? 'fallback' : maxIntentId;

  // Let's sort the scores descending for easier visual graphing
  const sortedScores = [...intentScores].sort((a, b) => b.score - a.score);

  return {
    tokens: cleanTokens,
    intentScores: sortedScores,
    winningIntentId: finalWinIntentId,
    confidence: maxScore >= 0 ? maxScore : 0.0,
    matchedBy,
    preprocessingSteps,
    metricsBreakdown: topIntentMath
  };
}
