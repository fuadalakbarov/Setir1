/**
 * Azərbaycan Dili Orfoqrafiya Yoxlayıcısı
 * SymSpell alqoritmi əsasında — lüğət + edit distance
 * 
 * İstifadə: const { checkText } = require('./spellChecker');
 */

const path = require('path');
const fs = require('fs');

// ─── LÜĞƏTİ YÜKLƏ ───────────────────────────────────────────────────────────
let DICTIONARY = null;
let DELETE_DICT = null; // SymSpell delete variants

function loadDictionary() {
  if (DICTIONARY) return;
  const dictPath = path.join(__dirname, 'az_dictionary.json');
  if (!fs.existsSync(dictPath)) {
    console.warn('[SpellChecker] az_dictionary.json tapılmadı, yoxlayıcı deaktivdir');
    DICTIONARY = new Set();
    DELETE_DICT = new Map();
    return;
  }
  const words = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
  DICTIONARY = new Set(words.map(w => w.toLowerCase()));
  
  // Build SymSpell delete dict (max edit distance = 2)
  DELETE_DICT = new Map();
  const MAX_EDIT = 2;
  
  for (const word of DICTIONARY) {
    if (word.length < 2) continue;
    const deletes = getDeletes(word, MAX_EDIT);
    for (const del of deletes) {
      if (!DELETE_DICT.has(del)) DELETE_DICT.set(del, []);
      DELETE_DICT.get(del).push(word);
    }
  }
}

function getDeletes(word, maxDist, dist = 0, result = new Set()) {
  if (dist >= maxDist) return result;
  for (let i = 0; i < word.length; i++) {
    const del = word.slice(0, i) + word.slice(i + 1);
    if (!result.has(del)) {
      result.add(del);
      getDeletes(del, maxDist, dist + 1, result);
    }
  }
  return result;
}

// ─── EDIT DISTANCE (Damerau-Levenshtein) ─────────────────────────────────────
function editDistance(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  
  const dp = Array.from({length: m+1}, (_, i) => Array.from({length: n+1}, (_, j) => i === 0 ? j : j === 0 ? i : 0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i-1] === b[j-1]) {
        dp[i][j] = dp[i-1][j-1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
        // Transposition
        if (i > 1 && j > 1 && a[i-1] === b[j-2] && a[i-2] === b[j-1]) {
          dp[i][j] = Math.min(dp[i][j], dp[i-2][j-2] + 1);
        }
      }
    }
  }
  return dp[m][n];
}

// ─── SÖZ YOXLAMA ─────────────────────────────────────────────────────────────
function isCorrect(word) {
  loadDictionary();
  if (!word || word.length < 2) return true;
  
  const lower = word.toLowerCase();
  
  // Direct lookup
  if (DICTIONARY.has(lower)) return true;
  
  // Number check (rəqəm)
  if (/^\d+$/.test(lower)) return true;
  
  // Ordinal numbers: 1-ci, 2-ci etc
  if (/^\d+[-–](ci|cı|cu|cü|inci|ıncı|uncu|üncü|li|lı|lu|lü|lik|lıq|luq|lük|dən|dan|də|da|ə|a|ı|i|u|ü)$/.test(lower)) return true;
  
  // Hyphenated compound words
  if (lower.includes('-')) {
    const parts = lower.split('-');
    if (parts.every(p => !p || p.length < 2 || DICTIONARY.has(p))) return true;
  }
  
  // Allow proper nouns (capitalized)
  if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) return true;
  
  return false;
}

// ─── TƏKLİFLƏR TAP ───────────────────────────────────────────────────────────
function getSuggestions(word, maxResults = 3) {
  loadDictionary();
  const lower = word.toLowerCase();
  const candidates = new Map(); // word -> distance
  
  // 1. Exact and delete-based candidates
  const inputDeletes = getDeletes(lower, 2);
  
  // Check if any dictionary word has same delete as input
  for (const del of [lower, ...inputDeletes]) {
    if (DELETE_DICT.has(del)) {
      for (const cand of DELETE_DICT.get(del)) {
        if (!candidates.has(cand)) {
          const d = editDistance(lower, cand);
          if (d <= 2) candidates.set(cand, d);
        }
      }
    }
  }
  
  // 2. Common Azerbaijani phonetic corrections
  const phoneticFixes = applyPhoneticRules(lower);
  
  // 2b. Deep phonetic normalization (for heavily latinized words like ovladinizin)
  const deepFixes = deepPhoneticNormalize(lower);
  for (const deepFix of (Array.isArray(deepFixes) ? deepFixes : [deepFixes])) {
    if (deepFix !== lower && !phoneticFixes.includes(deepFix)) {
      phoneticFixes.push(deepFix);
    }
  }
  // Also try partial deep fixes
  const partialFixes = partialPhoneticFixes(lower);
  for (const fix of partialFixes) {
    if (!phoneticFixes.includes(fix)) phoneticFixes.push(fix);
  }
  
  for (const fix of phoneticFixes) {
    if (DICTIONARY.has(fix) && !candidates.has(fix)) {
      candidates.set(fix, 1);
    }
  }
  
  // Score: distance + phonetic bonus
  // Phonetic fixes (o→ö, u→ü, e→ə etc) get lower score than random edit
  const phoneticSet = new Set(phoneticFixes);
  
  return Array.from(candidates.entries())
    .sort((a, b) => {
      // Prefer phonetic fixes
      const aPhon = phoneticSet.has(a[0]) ? -0.5 : 0;
      const bPhon = phoneticSet.has(b[0]) ? -0.5 : 0;
      const scoreA = a[1] + aPhon;
      const scoreB = b[1] + bPhon;
      return scoreA - scoreB || Math.abs(a[0].length - lower.length) - Math.abs(b[0].length - lower.length);
    })
    .slice(0, maxResults)
    .map(([w]) => w);
}

// ─── DƏRİN FONETİK NORMALİZASİYA ─────────────────────────────────────────────
// Heavily latinized words: ovladinizin → övladınızın
function deepPhoneticNormalize(word) {
  // Try multiple vowel substitution patterns
  const subMaps = [
    {o:'ö', u:'ü', e:'ə', i:'ı'},       // o,u,e,i → ö,ü,ə,ı
    {o:'ö', u:'ü', e:'ə'},               // o,u,e only
    {o:'ö', u:'ü', e:'ə', a:'ə'},       // o,u,e,a
    {o:'ö', u:'ü', e:'ə', i:'ı', a:'ə'}, // all vowels
    {e:'ə', i:'ı'},                       // e,i only
    {i:'ı'},                              // i only
    {o:'ö', i:'ı'},                       // o,i (common: ovladinizin→övladınızın)
    {o:'ö'},                              // o only
    {u:'ü'},                              // u only
    {a:'ə'},                              // a only
  ];
  return subMaps.map(map => word.split('').map(c => map[c] || c).join(''));
}

// Generate partial phonetic fixes — try each character replacement
function partialPhoneticFixes(word) {
  const fixes = [];
  const subs = [['e','ə'],['a','ə'],['i','ı'],['u','ü'],['o','ö']];
  // All single substitutions
  for (const [from, to] of subs) {
    for (let i = 0; i < word.length; i++) {
      if (word[i] === from) {
        fixes.push(word.slice(0, i) + to + word.slice(i+1));
      }
    }
  }
  // All double substitutions of same type
  for (const [from, to] of subs) {
    const positions = [];
    for (let i = 0; i < word.length; i++) {
      if (word[i] === from) positions.push(i);
    }
    // Try replacing all occurrences
    if (positions.length >= 2) {
      let result = word;
      for (const pos of positions) {
        result = result.slice(0, pos) + to + result.slice(pos+1);
      }
      fixes.push(result);
    }
  }
  return fixes;
}

// ─── FONETİK QAYDALAR ─────────────────────────────────────────────────────────
// Azərbaycan dilinin tipik yazı səhvləri
function applyPhoneticRules(word) {
  const results = [];
  
  // e → ə (ən çox rast gəlinən səhv)
  if (word.includes('e')) {
    results.push(word.replace(/e/g, 'ə'));
    // Partial replacements
    for (let i = 0; i < word.length; i++) {
      if (word[i] === 'e') {
        results.push(word.slice(0, i) + 'ə' + word.slice(i+1));
      }
    }
  }
  
  // a → ə (in some positions)
  if (word.includes('a')) {
    results.push(word.replace(/a/g, 'ə'));
    for (let i = 0; i < word.length; i++) {
      if (word[i] === 'a') {
        results.push(word.slice(0, i) + 'ə' + word.slice(i+1));
      }
    }
  }
  
  // i → ı
  if (word.includes('i') && !word.includes('ı')) {
    results.push(word.replace(/i/g, 'ı'));
  }
  
  // u → ü
  if (word.includes('u') && !word.includes('ü')) {
    results.push(word.replace(/u/g, 'ü'));
  }
  
  // o → ö
  if (word.includes('o') && !word.includes('ö')) {
    results.push(word.replace(/o/g, 'ö'));
  }
  
  // g → ğ  
  if (word.includes('g')) {
    results.push(word.replace(/g/g, 'ğ'));
  }
  
  // s → ş
  if (word.includes('s')) {
    results.push(word.replace(/s/g, 'ş'));
  }
  
  // c → ç
  if (word.includes('c')) {
    results.push(word.replace(/c/g, 'ç'));
  }
  
  return results.filter(r => r !== word);
}

// ─── MƏTNİ YOXLA ─────────────────────────────────────────────────────────────
function checkText(text) {
  loadDictionary();
  if (!text || !DICTIONARY.size) return { errors: [] };
  
  // Tokenize: sözləri ayır, mövqeyi saxla
  const tokens = [];
  const wordRegex = /[a-zA-ZəƏşŞğĞçÇıIüÜöÖ]+(?:[-–'][a-zA-ZəƏşŞğĞçÇıIüÜöÖ]+)*/g;
  let match;
  
  while ((match = wordRegex.exec(text)) !== null) {
    tokens.push({
      word: match[0],
      start: match.index,
      end: match.index + match[0].length
    });
  }
  
  const errors = [];
  
  for (const token of tokens) {
    const { word, start, end } = token;
    
    // Skip short words
    if (word.length < 2) continue;
    
    // Skip proper nouns (but check ALL-CAPS only if > 4 chars)
    if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) continue;
    
    if (!isCorrect(word)) {
      const suggestions = getSuggestions(word);
      
      errors.push({
        word,
        start,
        end,
        suggestion: suggestions[0] || '',
        suggestions,
        type: 'orfoqrafiya',
        description: suggestions[0] 
          ? `"${word}" → "${suggestions[0]}" ola bilər`
          : `"${word}" lüğətdə tapılmadı`
      });
    }
  }
  
  // Limit to 20 most confident errors
  return { errors: errors.slice(0, 20) };
}

// ─── QRAMMATIKA FORMATI (aiController üçün) ──────────────────────────────────
function checkTextForAI(text) {
  const { errors } = checkText(text);
  return { errors };
}

module.exports = { checkText, checkTextForAI, isCorrect, getSuggestions, loadDictionary };
