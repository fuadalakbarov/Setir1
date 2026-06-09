const axios = require('axios');
const { checkTextForAI } = require('./spellChecker');

// ─── KEY ROTATION SİSTEMİ ──────────────────────────────────────────────────
function getGroqKeys() {
  const keys = [];
  if (process.env.GROQ_API_KEY) keys.push(process.env.GROQ_API_KEY);
  let i = 1;
  while (process.env[`GROQ_API_KEY_${i}`]) {
    const k = process.env[`GROQ_API_KEY_${i}`];
    if (!keys.includes(k)) keys.push(k);
    i++;
  }
  return keys;
}

const keyStatus = {};

function getAvailableKey(keys) {
  const now = Date.now();
  const COOLDOWN_MS = 60 * 1000;
  for (const key of keys) {
    const st = keyStatus[key];
    if (!st || !st.failedAt || (now - st.failedAt) > COOLDOWN_MS) return key;
  }
  let oldest = keys[0];
  for (const key of keys) {
    const st = keyStatus[key];
    const otherSt = keyStatus[oldest];
    if (!st || !st.failedAt) return key;
    if (!otherSt || !otherSt.failedAt || st.failedAt < otherSt.failedAt) oldest = key;
  }
  return oldest;
}

function markKeyFailed(key) {
  keyStatus[key] = { failedAt: Date.now() };
  console.warn(`Groq key məhdudlaşdırıldı, növbəti keye keçilir...`);
}

function markKeySuccess(key) {
  if (keyStatus[key]) keyStatus[key].failedAt = null;
}

// ─── GROQ API ÇAĞIRIŞI ─────────────────────────────────────────────────────
async function callGroq(messages, maxRetries) {
  const keys = getGroqKeys();
  if (keys.length === 0) throw new Error('Heç bir Groq API key tapılmadı');
  const tried = new Set();

  for (let attempt = 0; attempt < Math.max(keys.length, maxRetries || 1); attempt++) {
    const availableKeys = keys.filter(k => !tried.has(k));
    const key = getAvailableKey(availableKeys.length > 0 ? availableKeys : keys);
    tried.add(key);

    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        { model: 'llama-3.3-70b-versatile', max_tokens: 4000, temperature: 0.1, messages },
        {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          timeout: 30000
        }
      );
      markKeySuccess(key);
      return response.data.choices[0].message.content;
    } catch (err) {
      const status = err.response?.status;
      const isRateLimit = status === 429 || status === 503 ||
        err.response?.data?.error?.type === 'tokens' ||
        err.response?.data?.error?.code === 'rate_limit_exceeded';
      if (isRateLimit) {
        markKeyFailed(key);
        if (tried.size >= keys.length) throw new Error('GROQ_ALL_KEYS_LIMITED');
        continue;
      }
      throw err;
    }
  }
  throw new Error('GROQ_ALL_KEYS_LIMITED');
}

// ─── ANTHROPIC FALLBACK ────────────────────────────────────────────────────
async function callAnthropic(systemPrompt, userPrompt) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Anthropic API key yoxdur');
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      timeout: 30000
    }
  );
  return response.data.content[0].text;
}

// ─── ANA CONTROLLER ────────────────────────────────────────────────────────
exports.processText = async (req, res) => {
  const { text, tool, options } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Mətn daxil edilməyib.' });
  }

  const biznesTools = ['protokol','emr','qerar','mektub','arayis','xidmeti'];
  if (biznesTools.includes(tool) && req.user.plan !== 'biznes') {
    return res.status(403).json({ error: 'Bu modul yalnız Biznes Paketi istifadəçilərinə açıqdır.' });
  }

  // ─── QRAMMATİKA: öz lüğətimizlə (AI-sız, limitsiz) ───────────────────────
  if (tool === 'grammar') {
    try {
      const { errors } = checkTextForAI(text);
      return res.json({ result: JSON.stringify({ errors }) });
    } catch (e) {
      console.error('SpellChecker xəta:', e.message);
      // Xəta olarsa AI-a fallback
    }
  }

  const system = "Sən Azərbaycan dili üzrə ixtisaslaşmış süni intellekt köməkçisisən. MÜTLƏQ Azərbaycan ədəbi dilində yaz. ə,ğ,ı,ö,ü,ş,ç hərflərini düzgün işlət. Heç bir giriş ifadəsi yazma. Birbaşa nəticəni qaytar.";

  const o = options || {};
  let prompt = '';

  switch(tool) {
    case 'grammar':
      prompt = `Sən Azərbaycan dili üzrə ekspert redaktorsən. Aşağıdakı mətni çox diqqətlə oxu və YALNIZ həqiqi, açıq-aşkar səhvləri tap.\n\nTapılacaq səhv növləri:\n1. Durğu işarəsi - vergülün, nöqtənin buraxılması\n2. Qrammatika - şəkilçilərin yanlış işlədilməsi\n3. Böyük/kiçik hərf - cümlə kiçik hərflə başlayırsa\n4. Ahəng qanunu pozuntusu\n\nQƏTİ QADAĞALAR:\n- "1-ci", "2-ci", "3-cü" kimi sıra sayları DÜZGÜNDÜR\n- Düzgün yazılmış sözlərə TOXUNMA\n- Şübhəli hallarda ƏLAVƏ ETMƏ\n\nYALNIZ bu JSON formatında cavab ver:\n{"errors": [{"word": "səhv söz", "suggestion": "düzgün variant", "type": "qrammatika", "description": "izahat"}]}\nSəhv yoxdursa: {"errors": []}\n\nMətn:\n${text}`;
      break;
    case 'tone':
      prompt = `Aşağıdakı mətni "${o.tone || 'Rəsmi'}" tonuna uyğunlaşdır. Yalnız yenidən yazılmış mətni qaytar:\n\n${text}`;
      break;
    case 'improve':
      prompt = `Aşağıdakı mətni Azərbaycan ədəbi dili normalarına uyğun təkmilləşdir. Mənasını qoru, ifadəni gözəlləşdir. Yalnız təkmilləşdirilmiş mətni qaytar:\n\n${text}`;
      break;
    case 'vocab':
      prompt = `Aşağıdakı mətndəki sadə sözləri zəngin, ədəbi Azərbaycan sözləri ilə əvəz et. Yalnız yenilənmiş mətni qaytar:\n\n${text}`;
      break;
    case 'plagiarism':
      prompt = `Aşağıdakı mətni orijinallıq baxımından qiymətləndir:\n\n${text}`;
      break;
    case 'summary':
      prompt = `Aşağıdakı mətni qısa və aydın şəkildə xülasə et:\n\n${text}`;
      break;
    case 'rewrite':
      prompt = `Aşağıdakı mətni tamamilə yenidən yaz — eyni mənanı fərqli ifadə ilə çatdır. Yalnız yenidən yazılmış mətni qaytar:\n\n${text}`;
      break;
    case 'protokol':
      prompt = `Verilən məlumatlar əsasında rəsmi İCLAS PROTOKOLU hazırla. Tam format: başlıq, tarix/yer, iştirakçılar, müzakirə olunan məsələlər, qəbul edilən qərarlar, imzalar üçün yer:\n\n${text}`;
      break;
    case 'emr':
      prompt = `Verilən məlumatlar əsasında rəsmi ƏMR layihəsi hazırla. Tam format: üst-başlıq, nömrə/tarix, əmrin mövzusu, əsas mətn, icraçılar, müddət, imza yeri:\n\n${text}`;
      break;
    case 'qerar':
      prompt = `Verilən məlumatlar əsasında rəsmi QƏRAR sənədi hazırla. Tam format: üst-başlıq, nömrə/tarix, mövzu, qərarda yazılan əsaslar, qərar hissəsi, imza yeri:\n\n${text}`;
      break;
    case 'mektub':
      prompt = `Verilən məlumatlar əsasında rəsmi MƏKTUB hazırla. Tam format: üst-başlıq, tarix, müraciət, mətn, hörmətlə bağlama, imza:\n\n${text}`;
      break;
    case 'arayis':
      prompt = `Verilən məlumatlar əsasında rəsmi ARAYIŞ hazırla. Tam format: başlıq, verilmə tarixi, məzmun, təsdiq edən şəxs/qurum, möhür/imza yeri:\n\n${text}`;
      break;
    case 'xidmeti':
      prompt = `Verilən məlumatlar əsasında XİDMƏTİ YAZI hazırla. Tam format: üst-başlıq, kimə/kimdən, tarix/nömrə, mövzu, mətn, imza:\n\n${text}`;
      break;
    default:
      prompt = text;
  }

  const messages = [
    { role: 'system', content: system },
    { role: 'user', content: prompt }
  ];

  try {
    const result = await callGroq(messages, getGroqKeys().length);
    return res.json({ result });
  } catch (err) {
    if (err.message === 'GROQ_ALL_KEYS_LIMITED') {
      try {
        console.log('Groq limitə çatdı, Anthropic API-yə keçilir...');
        const result = await callAnthropic(system, prompt);
        return res.json({ result });
      } catch (anthropicErr) {
        console.error('Anthropic xətası:', anthropicErr.response?.data || anthropicErr.message);
        return res.status(429).json({
          error: 'AI serveri müvəqqəti olaraq həddindən artıq yüklənib. Bir neçə dəqiqə sonra yenidən cəhd edin.'
        });
      }
    }
    console.error('AI Xəta:', err.response?.data || err.message);
    res.status(500).json({ error: 'AI serveri ilə əlaqə xətası.' });
  }
};
