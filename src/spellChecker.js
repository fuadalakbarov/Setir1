/**
 * Azərbaycan Dili Orfoqrafiya Yoxlayıcısı v2
 * SymSpell alqoritmi + Morfoloji analiz
 * 
 * İstifadə: const { checkText } = require('./spellChecker');
 */

const path = require('path');
const fs   = require('fs');

// ─── LÜĞƏTİ YÜKLƏ ───────────────────────────────────────────────────────────
let DICTIONARY  = null;
let DELETE_DICT = null;

function loadDictionary() {
  if (DICTIONARY) return;

  const dictPath = path.join(__dirname, 'az_dictionary.json');
  if (!fs.existsSync(dictPath)) {
    console.warn('[SpellChecker] az_dictionary.json tapılmadı');
    DICTIONARY  = new Set();
    DELETE_DICT = new Map();
    return;
  }

  const words = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
  DICTIONARY  = new Set(words.map(w => w.toLowerCase()));

  // SymSpell sil-variantları (max edit=2)
  DELETE_DICT = new Map();
  for (const word of DICTIONARY) {
    if (word.length < 2) continue;
    for (const del of getDeletes(word, 2)) {
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
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
          dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[m][n];
}

// ─── AZƏRBAYCAN MOROFOLOGİYASI ───────────────────────────────────────────────
// Sözu suffix-lərdən ayırır, kökü tapır
const SUFFIXES_BY_LEN = [];

(function buildSuffixList() {
  // Uzunluqdan qısa sıraya görə — ən uzun əvvəl yoxlanır
  const rawSuffixes = [
    // Verb suffixes (past passive, conditional, etc.)
    'məliydiniz','məliydiniz','malıydınız',
    'məliyəm','məlisən','məliyik','məlisiniz','məlidir','məlidirlər',
    'malıyam','malısan','malıyıq','malısınız','malıdır','malıdırlar',
    'acaqlar','əcəklər','acaqsınız','əcəksiniz','acağıq','əcəyik',
    'ılmadan','ilmədən','ulmadan','ülmədən',
    'ılmaqla','ilməklə',
    'ışmaqdan','işməkdən',
    // 6-char
    'ilərin','ıların',
    'ındaki','indəki',
    'lardan','lərdon','lərden','lərdan',
    'lardaki','lərdəki',
    'larında','lərindən','larından','lərindəki',
    // 5-char
    'ların','lərin',
    'larda','lərdə',
    'larda','lərə',
    'larla','lərlə',
    'sınız','siniz','sunuz','sünüz',
    'acaq','əcək',
    'malı','məli',
    'ıbdır','ibdir','ubdur','übdür',
    'anda','əndə',
    'ınca','incə',
    // 4-char
    'lara','lərə',
    'ları','ləri',
    'ndan','ndən',
    'nda','ndə',
    'daki','dəki',
    'sına','sinə',
    'sında','sindən',
    'ıyla','iylə',
    'ında','indən',
    'ında','ındən',
    'ınız','iniz','unuz','ünüz',
    'imiz','ımız','umuz','ümüz',
    'ların','lərin',
    'mış','miş','muş','müş',
    'araq','ərək',
    'ılan','ilən',
    'ulan','ülən',
    'lıq','lik','luq','lük',
    // 3-char
    'dan','dən','tan','tən',
    'da','də','ta','tə',
    'nın','nin','nun','nün',
    'lar','lər',
    'lık','lik',
    'dır','dir','dur','dür',
    'tır','tir','tur','tür',
    'maq','mək',
    'ğın','ğin','ğun','ğün',
    'ğa','ğə',
    'ğı','ği','ğu','ğü',
    'nı','ni','nu','nü',
    'nə','na',
    'sı','si','su','sü',
    'yı','yi','yu','yü',
    'ya','yə',
    'çı','çi','çu','çü',
    'cı','ci','cu','cü',
    'lı','li','lu','lü',
    'sız','siz','suz','süz',
    'ın','in','un','ün',
    'ma','mə',
    'ib','ıb','ub','üb',
    'ir','ır','ur','ür',
    // 2-char
    'da','də',
    'la','lə',
    'ki',
    'mi','mı','mu','mü',
    'ın','in',
    'ım','im',
    'ıq','iq',
    'sa','sə',
  ];

  // Group by length
  const byLen = {};
  for (const suf of rawSuffixes) {
    const L = suf.length;
    if (!byLen[L]) byLen[L] = [];
    byLen[L].push(suf);
  }
  const lengths = Object.keys(byLen).map(Number).sort((a, b) => b - a); // longest first
  for (const L of lengths) {
    SUFFIXES_BY_LEN.push({ len: L, suffixes: byLen[L] });
  }
})();

/**
 * Morfoloji analiz: sözü suffix-lərdən strip edib köklərini yoxlayır.
 * Kökdən birini lüğətdə tapsa true qaytarır.
 */
function morphologicalCheck(word) {
  // Azərbaycan dilinin tipik minimum kök uzunluğu 2 hərf
  const MIN_ROOT = 2;

  for (const { len, suffixes } of SUFFIXES_BY_LEN) {
    if (word.length - len < MIN_ROOT) continue;
    for (const suf of suffixes) {
      if (word.endsWith(suf)) {
        const root = word.slice(0, word.length - len);
        if (root.length >= MIN_ROOT && DICTIONARY.has(root)) return true;
        // Try with connector vowel removed (e.g. "oxuması" → "oxu" + "ması")
        // Last char of root might be a connector vowel added for euphony
        if (root.length > MIN_ROOT) {
          const lastCh = root[root.length - 1];
          if ('aıouəeöüi'.includes(lastCh)) {
            const stripped = root.slice(0, -1);
            if (stripped.length >= MIN_ROOT && DICTIONARY.has(stripped)) return true;
          }
        }
      }
    }
  }
  return false;
}

// Dar saitin düşməsi: "sinif"+"in"="sinfin", "şəkil"+"i"="şəkli", "ağız"+"ı"="ağzı"
// Kökün son samiti ilə əvvəlki samit arasında bir sait əlavə edib lüğətdə yoxlayır
function vowelElisionCheck(word) {
  const MIN_ROOT = 2;
  for (const { len, suffixes } of SUFFIXES_BY_LEN) {
    if (word.length - len < MIN_ROOT) continue;
    for (const suf of suffixes) {
      if (word.endsWith(suf)) {
        const root = word.slice(0, word.length - len);
        if (root.length < MIN_ROOT + 1) continue;
        const lastTwo = root.slice(-2);
        const consonants = !/[aıouəeöüi]/.test(lastTwo);
        if (consonants) {
          const VOWELS = ['ı','i','u','ü','a','ə','o','ö'];
          const base = root.slice(0, -1);
          const lastConsonant = root.slice(-1);
          for (const v of VOWELS) {
            if (DICTIONARY.has(base + v + lastConsonant)) return true;
          }
        }
      }
    }
  }
  return false;
}

// ─── SÖZ YOXLAMA ─────────────────────────────────────────────────────────────
function isCorrect(word) {
  loadDictionary();
  if (!word || word.length < 2) return true;

  const lower = word.toLowerCase();

  // 1. Birbaşa lüğətdə
  if (DICTIONARY.has(lower)) return true;

  // 2. Rəqəm
  if (/^\d+$/.test(lower)) return true;

  // 3. Sıra sayları: 1-ci, 2-ci, 1-inci ...
  if (/^\d+[-–](ci|cı|cu|cü|inci|ıncı|uncu|üncü|li|lı|lu|lü|lik|lıq|luq|lük|dən|dan|də|da|ə|a|ı|i|u|ü)$/.test(lower)) return true;

  // 4. Defisli birləşmə
  if (lower.includes('-')) {
    const parts = lower.split('-');
    if (parts.every(p => !p || p.length < 2 || DICTIONARY.has(p) || morphologicalCheck(p))) return true;
  }

  // 5. Böyük hərf — xüsusi isim (şəxs adı, yer adı)
  if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) return true;

  // 5.5 Dar saitin düşməsi morfologiyası AZ-hərf şərtindən asılı olmayaraq keçərlidir
  // (sinif→sinfin, şəkil→şəkli, ağız→ağzı kimi sözlərdə əlavə hərf olmaya bilər)
  if (vowelElisionCheck(lower)) return true;

  // 6. Morfoloji analiz — suffixləri strip edib kök lüğətdə?
  // ŞƏRT: Əgər sözdə heç bir Azərbaycan xüsusi hərfi yoxdursa (ə,ş,ğ,ç,ı,ö,ü),
  // morfoloji analiz keçsə belə XƏTAdır — doğru yazılışda bu hərflər olmalıdır.
  const hasAZChars = /[əşğçıöü]/.test(lower);
  if (hasAZChars && morphologicalCheck(lower)) return true;

  // 7. Fonetik normallaşma + morfoloji analiz
  const normalized = phonNormalize(lower);
  if (normalized !== lower) {
    if (DICTIONARY.has(normalized)) return true;
    if (morphologicalCheck(normalized)) return true;
  }

  return false;
}

// ─── FONETİK NORMALİZASİYA (Latın → Azərbaycan) ─────────────────────────────
// Yalnız "aşkar" latın-əsaslı yazı normallaşdırması
// Məsələn: "gedecek" → "gedəcək", "mektebe" → "məktəbə"
// Amma "oz" → "öz" deyil (çünki "oz" başqa dillərdə söz ola bilər)
function phonNormalize(word) {
  // Əgər artıq Azərbaycan xüsusi hərfləri varsa, az dəyişiklik
  const hasAZ = /[əəşğçıöü]/.test(word);

  // Sadə qaydalar: tipik latın-Azərbaycan qarışığı
  let result = word
    // Çox açıq hallarda: e → ə (əgər heç ə yoxdursa)
    // Amma "e" həm Azərbaycan, həm latın alfasında var, ehtiyatlı olaq
    .replace(/sh/g, 'ş')   // sh → ş (ingilis transkripsiyası)
    .replace(/gh/g, 'ğ')   // gh → ğ
    .replace(/ch/g, 'ç');  // ch → ç

  return result;
}

// ─── TƏKLİFLƏR ───────────────────────────────────────────────────────────────
function getSuggestions(word, maxResults = 3) {
  loadDictionary();
  const lower = word.toLowerCase();
  const candidates = new Map();

  // 1. SymSpell delete-based
  for (const del of [lower, ...getDeletes(lower, 2)]) {
    if (DELETE_DICT.has(del)) {
      for (const cand of DELETE_DICT.get(del)) {
        if (!candidates.has(cand)) {
          const d = editDistance(lower, cand);
          if (d <= 2) candidates.set(cand, d);
        }
      }
    }
  }

  // 2. Fonetik variasiyalar
  const phoneticVariants = generatePhoneticVariants(lower);
  for (const variant of phoneticVariants) {
    if (DICTIONARY.has(variant) && !candidates.has(variant)) {
      candidates.set(variant, 1);
    }
    // Also check morphological roots of variants
  }

  const phoneticSet = new Set(phoneticVariants);

  return Array.from(candidates.entries())
    .sort((a, b) => {
      const scoreA = a[1] + (phoneticSet.has(a[0]) ? -0.5 : 0);
      const scoreB = b[1] + (phoneticSet.has(b[0]) ? -0.5 : 0);
      return scoreA - scoreB || Math.abs(a[0].length - lower.length) - Math.abs(b[0].length - lower.length);
    })
    .slice(0, maxResults)
    .map(([w]) => w);
}

// Bütün mümkün fonetik dəyişikliklər (kombinasiyalı)
function generatePhoneticVariants(word) {
  const variants = new Set();

  // Hər pozisiyada tək dəyişiklik
  const subs = [
    ['e', 'ə'], ['a', 'ə'], ['i', 'ı'], ['u', 'ü'], ['o', 'ö'],
    ['g', 'ğ'], ['s', 'ş'], ['c', 'ç'],
    ['ə', 'e'], ['ı', 'i'], ['ü', 'u'], ['ö', 'o'],  // reverse too
  ];

  for (const [from, to] of subs) {
    for (let i = 0; i < word.length; i++) {
      if (word[i] === from) {
        variants.add(word.slice(0, i) + to + word.slice(i + 1));
      }
    }
  }

  // Bütün e-ləri ə ilə əvəz et (ən çox görülən səhv)
  if (word.includes('e')) variants.add(word.replace(/e/g, 'ə'));
  if (word.includes('i')) variants.add(word.replace(/i/g, 'ı'));
  if (word.includes('o') && !word.includes('ö')) variants.add(word.replace(/o/g, 'ö'));
  if (word.includes('u') && !word.includes('ü')) variants.add(word.replace(/u/g, 'ü'));

  // Kombinasiyalar (e→ə VƏ i→ı birlikdə)
  const combo1 = word.replace(/e/g, 'ə').replace(/i/g, 'ı');
  const combo2 = word.replace(/e/g, 'ə').replace(/o/g, 'ö').replace(/u/g, 'ü');
  const combo3 = word.replace(/e/g, 'ə').replace(/i/g, 'ı').replace(/o/g, 'ö').replace(/u/g, 'ü');
  [combo1, combo2, combo3].forEach(c => variants.add(c));

  variants.delete(word); // özünü çıxar
  return [...variants];
}

// ─── MƏTNİ YOXLA ─────────────────────────────────────────────────────────────
function checkText(text) {
  loadDictionary();
  if (!text || !DICTIONARY.size) return { errors: [] };

  const wordRegex = /\d+[-–](?:ci|cı|cu|cü|inci|ıncı|uncu|üncü|li|lı|lu|lü|lik|lıq|luq|lük|dən|dan|də|da|ə|a|ı|i|u|ü)\b|[a-zA-ZəƏşŞğĞçÇıIüÜöÖ]+(?:[-–'][a-zA-ZəƏşŞğĞçÇıIüÜöÖ]+)*/g;
  const errors = [];
  let match;

  while ((match = wordRegex.exec(text)) !== null) {
    const word  = match[0];
    const start = match.index;
    const end   = start + word.length;

    if (word.length < 2) continue;

    // Xüsusi isim — keç
    if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) continue;

    if (!isCorrect(word)) {
      const suggestions = getSuggestions(word);
      errors.push({
        word,
        start,
        end,
        suggestion:  suggestions[0] || '',
        suggestions,
        type:        'orfoqrafiya',
        description: suggestions[0]
          ? `"${word}" → "${suggestions[0]}" ola bilər`
          : `"${word}" lüğətdə tapılmadı`
      });
    }
  }

  // Ən inandırıcı 20 səhvi qaytar
  return { errors: errors.slice(0, 20) };
}

function checkTextForAI(text) {
  return checkText(text);
}

module.exports = { checkText, checkTextForAI, isCorrect, getSuggestions, loadDictionary };
