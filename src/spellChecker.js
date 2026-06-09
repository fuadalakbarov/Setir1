// ============================================================
// AZƏRBAYCAN DİLİ ORFOQRAFİYA YOXLAYICISI
// AI-sız, tam qaydalar əsasında işləyir
// ============================================================

// ── 1. SAİTLƏR VƏ AHƏNG QANUNU ─────────────────────────────
const QALIN_SAİTLƏR = new Set(['a', 'ı', 'o', 'u']);
const İNCƏ_SAİTLƏR = new Set(['e', 'ə', 'i', 'ö', 'ü']);
const BUTUN_SAİTLƏR = new Set(['a', 'ı', 'o', 'u', 'e', 'ə', 'i', 'ö', 'ü']);

function sonSait(soz) {
  for (let i = soz.length - 1; i >= 0; i--) {
    if (BUTUN_SAİTLƏR.has(soz[i])) return soz[i];
  }
  return null;
}

function qalindirmi(soz) {
  const s = sonSait(soz);
  return s ? QALIN_SAİTLƏR.has(s) : true;
}

// ── 2. MÜNTƏZƏMLİ SƏHV PATTERNLƏRİ ─────────────────────────
// [regex, düzəliş_funksiyası, tip, açıqlama]
// Qeyd: bu patternlər yanlış yazılmış sözləri aşkar edir

const PATTERNS = [

  // ── FEL ŞƏKİLÇİLƏRİ ──

  // -malıdır / -məlidir (vaciblik)
  [/\b(\w+)malidir\b/gi, (m, k) => k + 'malıdır', 'fonetik', 'ı hərfi buraxılıb'],
  [/\b(\w+)melidir\b/gi, (m, k) => k + 'məlidir', 'fonetik', 'e→ə, ı hərfi buraxılıb'],
  [/\b(\w+)malidi\b/gi, (m, k) => k + 'malıdır', 'fonetik', 'ı hərfi buraxılıb'],
  [/\b(\w+)melidi\b/gi, (m, k) => k + 'məlidir', 'fonetik', 'e→ə düzəlişi'],

  // -malı / -məli
  [/\b(\w+)mali\b/gi, (m, k) => k + 'malı', 'fonetik', 'ı hərfi düzəlişi'],
  [/\b(\w+)meli\b/gi, (m, k) => k + 'məli', 'fonetik', 'e→ə düzəlişi'],

  // -acaq / -əcək (gələcək zaman)
  [/\b(\w+)acaq\b/gi, null, null, null], // düzgündür
  [/\b(\w+)ecek\b/gi, (m, k) => k + 'əcək', 'fonetik', 'e→ə, e→ə düzəlişi'],
  [/\b(\w+)acak\b/gi, (m, k) => k + 'acaq', 'fonetik', 'k→q düzəlişi'],
  [/\b(\w+)ecek\b/gi, (m, k) => k + 'əcək', 'fonetik', 'e→ə düzəlişi'],

  // -ır / -ir / -ur / -ür (indiki zaman)
  [/\b(\w+)iyor\b/gi, (m, k) => k + 'ir', 'fonetik', 'türk dili forması, Azərb: -ir'],

  // -mışdır / -mişdir / -muşdur / -müşdür (keçmiş zaman)
  [/\b(\w+)mishdir\b/gi, (m, k) => k + 'mişdir', 'fonetik', 'ə hərfi buraxılıb'],
  [/\b(\w+)misdir\b/gi, (m, k) => k + 'mişdir', 'fonetik', 'ş hərfi buraxılıb'],

  // -dı / -di / -du / -dü (keçmiş zaman)
  // -ıb / -ib / -ub / -üb (feli bağlama)

  // ── İSİM ŞƏKİLÇİLƏRİ ──

  // -lar / -lər (cəm)
  [/\b(\w+)ler\b/gi, (m, k) => {
    // Yalnız Azərb. sözlərə tətbiq et, xarici sözlərə yox
    if (/[wqx]/i.test(k)) return null;
    return k + 'lər';
  }, 'fonetik', 'e→ə düzəlişi (cəm şəkilçisi)'],

  // -da / -də (yerlik hal)
  [/\b(\w+[aıouəiöü])de\b/gi, (m, k) => k + 'də', 'fonetik', 'e→ə (yerlik hal)'],
  [/\b(\w+[aıouəiöü])da\b/gi, null, null, null], // düzgündür

  // -dan / -dən (çıxışlıq hal)
  [/\b(\w+)den\b/gi, (m, k) => k + 'dən', 'fonetik', 'e→ə (çıxışlıq hal)'],

  // -nın / -nin / -nun / -nün (yiyəlik hal)
  [/\b(\w+)nin\b/gi, null, null, null], // düzgün ola bilər
  [/\b(\w+)nun\b/gi, null, null, null], // düzgün ola bilər

  // ── XÜSUSİ SÖZLƏR ──

  // övlad
  [/\bovlad/gi, () => 'övlad', 'fonetik', 'o→ö düzəlişi'],
  [/\bovladı/gi, () => 'övladı', 'fonetik', 'o→ö düzəlişi'],
  [/\bovladın/gi, () => 'övladın', 'fonetik', 'o→ö düzəlişi'],
  [/\bovladınız/gi, () => 'övladınız', 'fonetik', 'o→ö düzəlişi'],

  // nümunə
  [/\bnumune\b/gi, () => 'nümunə', 'fonetik', 'u→ü, e→ə düzəlişi'],
  [/\bnümune\b/gi, () => 'nümunə', 'fonetik', 'e→ə düzəlişi'],
  [/\bnumunə\b/gi, () => 'nümunə', 'fonetik', 'u→ü düzəlişi'],

  // nəql
  [/\bnaql\b/gi, () => 'nəql', 'fonetik', 'a→ə düzəlişi'],

  // məktəb / məktəbə
  [/\bmekteb\b/gi, () => 'məktəb', 'fonetik', 'e→ə düzəlişi'],
  [/\bmektebe\b/gi, () => 'məktəbə', 'fonetik', 'e→ə düzəlişi'],
  [/\bmektəb\b/gi, () => 'məktəb', 'fonetik', 'me→mə düzəlişi'],

  // gedəcək
  [/\bgedecek\b/gi, () => 'gedəcək', 'fonetik', 'e→ə düzəlişi'],
  [/\bgedəcek\b/gi, () => 'gedəcək', 'fonetik', 'e→ə düzəlişi'],

  // oxumalı / oxumalıdır
  [/\boxumali\b/gi, () => 'oxumalı', 'fonetik', 'ı hərfi buraxılıb'],
  [/\boxumalidir\b/gi, () => 'oxumalıdır', 'fonetik', 'ı hərfi buraxılıb'],

  // verməli / verməlidir
  [/\bvermelidir\b/gi, () => 'verməlidir', 'fonetik', 'e→ə düzəlişi'],
  [/\bvermeli\b/gi, () => 'verməli', 'fonetik', 'e→ə düzəlişi'],

  // oxuması / anlaması (isim forması)
  [/\boxumasi\b/gi, () => 'oxuması', 'fonetik', 'ı hərfi buraxılıb'],
  [/\banlamasi\b/gi, () => 'anlaması', 'fonetik', 'ı hərfi buraxılıb'],
  [/\boxumasi\b/gi, () => 'oxuması', 'fonetik', 'ı hərfi buraxılıb'],

  // öz
  [/\boz\b/gi, () => 'öz', 'fonetik', 'o→ö düzəlişi'],

  // sözləri
  [/\bsozleri\b/gi, () => 'sözləri', 'fonetik', 'o→ö, e→ə düzəlişi'],
  [/\bsozler\b/gi, () => 'sözlər', 'fonetik', 'o→ö, e→ə düzəlişi'],

  // və
  [/\bve\b/gi, () => 'və', 'fonetik', 'e→ə düzəlişi'],

  // mətndə / mətndən
  [/\bmetnde\b/gi, () => 'mətndə', 'fonetik', 'e→ə düzəlişi'],
  [/\bmetni\b/gi, () => 'mətni', 'fonetik', 'e→ə düzəlişi'],
  [/\bmetn\b/gi, () => 'mətn', 'fonetik', 'e→ə düzəlişi'],

  // nədən / nəyi
  [/\bneden\b/gi, () => 'nədən', 'fonetik', 'e→ə düzəlişi'],
  [/\bnece\b/gi, () => 'necə', 'fonetik', 'e→ə düzəlişi'],

  // bəhs
  [/\bbehs\b/gi, () => 'bəhs', 'fonetik', 'e→ə düzəlişi'],

  // il mektebe → il məktəbə
  // bu yuxarıda artıq var

  // varmi → varmı
  [/\bvarmi\b/gi, () => 'varmı', 'fonetik', 'ı hərfi buraxılıb'],
  [/\byoxsa\b/gi, null, null, null], // düzgündür

  // derslik → dərslik
  [/\bderslik/gi, () => 'dərslik', 'fonetik', 'e→ə düzəlişi'],
  [/\bdersliyinden\b/gi, () => 'dərsliyindən', 'fonetik', 'e→ə düzəlişi'],
  [/\bdersliyinden\b/gi, () => 'dərsliyindən', 'fonetik', 'e→ə düzəlişi'],

  // uşaq (düzgündür), Uşaq (böyük hərf cümlə əvvəlindədirsə düzgündür)

  // haqqinda → haqqında
  [/\bhaqqinda\b/gi, () => 'haqqında', 'fonetik', 'ı hərfi buraxılıb'],

  // cavab vermelidir → cavab verməlidir (yuxarıda var)

  // sinif (düzgündür)
  // sinfin (düzgündür)
];

// ── 3. SÖZ SƏVİYYƏSİNDƏ YOXLAMA ────────────────────────────

function sozuYoxla(soz, originalSoz) {
  // Rəqəm, xüsusi işarə, çox qısa sözləri keç
  if (/^\d/.test(soz) || soz.length < 2) return null;
  // Yalnız latın/Azərb. hərflərindən ibarət sözlər
  if (!/^[a-zA-ZğışöüçəıÇƏĞIİÖŞÜ]+$/u.test(soz)) return null;

  const sozLower = soz.toLowerCase();

  for (const [pattern, fix, tip, aciqlamaSuffix] of PATTERNS) {
    if (fix === null) continue; // düzgün pattern, keç

    pattern.lastIndex = 0;
    const match = pattern.exec(sozLower);
    if (match) {
      const duzelt = fix(match[0], ...match.slice(1));
      if (!duzelt || duzelt === sozLower) continue;

      // Orijinal sözün böyük hərfini qoru
      const duzeltFinal = soz[0] === soz[0].toUpperCase()
        ? duzelt.charAt(0).toUpperCase() + duzelt.slice(1)
        : duzelt;

      if (duzeltFinal === originalSoz) continue;

      return {
        word: originalSoz,
        suggestion: duzeltFinal,
        type: tip,
        description: aciqlamaSuffix
      };
    }
  }
  return null;
}

// ── 4. ƏSAS FONKSİYA ────────────────────────────────────────

function azerbaycanOrfoqrafiyaYoxla(metn) {
  const errors = [];
  const gorulenler = new Set();

  // Sözləri parçala (durğu işarələrini saxla amma sözdən ayır)
  const tokenRegex = /[a-zA-ZğışöüçəıÇƏĞIİÖŞÜ]+/gu;
  let match;

  while ((match = tokenRegex.exec(metn)) !== null) {
    const originalSoz = match[0];
    const key = originalSoz.toLowerCase();

    if (gorulenler.has(key)) continue;
    gorulenler.add(key);

    const xeta = sozuYoxla(key, originalSoz);
    if (xeta) {
      errors.push(xeta);
    }
  }

  return { errors };
}

module.exports = { azerbaycanOrfoqrafiyaYoxla };
