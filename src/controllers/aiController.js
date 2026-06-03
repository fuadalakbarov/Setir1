const axios = require('axios');

exports.processText = async (req, res) => {
  const { text, tool, options } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Mətn daxil edilməyib.' });
  }

  const biznesTools = ['protokol','emr','qerar','mektub','arayis','xidmeti'];
  if (biznesTools.includes(tool) && req.user.plan !== 'biznes') {
    return res.status(403).json({ error: 'Bu modul yalnız Biznes Paketi istifadəçilərinə açıqdır.' });
  }

  const system = "Sən Azərbaycan dili üzrə ixtisaslaşmış süni intellekt köməkçisisən. MÜTLƏQ Azərbaycan ədəbi dilində yaz. ə,ğ,ı,ö,ü,ş,ç hərflərini düzgün işlət. Heç bir giriş ifadəsi yazma. Birbaşa nəticəni qaytar.";

  const o = options || {};
  let prompt = '';

  switch(tool) {
    case 'grammar':
      prompt = `Sən Azərbaycan dili üzrə ekspert redaktorsən. Aşağıdakı mətni çox diqqətlə, söz-söz oxu və YALNIZ həqiqi səhvləri tap.

Axtarılacaq səhv növləri:
1. Orfoqrafiya - hərflərin buraxılması, əlavə hərflər, yanlış hərflər (ə/e, ı/i, ö/o, ü/u, ğ/g, ş/s, ç/c)
2. Durğu işarəsi - vergülün, nöqtənin, sual işarəsinin buraxılması
3. Qrammatika - şəkilçilərin yanlış işlədilməsi, söz birləşmələrindəki xətalar
4. Böyük/kiçik hərf - cümlə kiçik hərflə başlayırsa, xüsusi isimlər kiçik yazılıbsa
5. Bitişik/ayrı yazılış - yanlış bitişik və ya ayrı yazılmış sözlər

QƏTI QADAĞALAR — bunlara TOXUNMA:
- "1-ci", "2-ci", "3-cü" kimi sıra sayları TAMAMILƏ DÜZGÜNDÜR, dəyişdirmə
- Rəqəmlə birləşmiş sözlər (1-ci, 2-li, 10-cu və s.) STANDART Azərbaycan yazılışıdır
- Düzgün yazılmış sözləri səhv kimi qeyd etmə
- Əgər söz düzgündürsə, onu errors siyahısına ƏLAVƏ ETMƏ
- "nümunə", "numune" hər ikisi mövcud sözdür — TOXUNMA
- Şəxs adları, yer adları, terminlər, qısaltmalar — TOXUNMA
- Şübhəli hallarda errors siyahısına ƏLAVƏ ETMƏ — yalnız 100% açıq-aşkar səhvlər
- Yanlış mənfi göstərici verməkdənsə, heç nə göstərməmək daha yaxşıdır

VACIB QAYDALAR:
- "word" sahəsinə mətndən OLDUĞU KİMİ kopyala (dəyişdirmə)
- "suggestion" sahəsinə YALNIZ düzgün formu yaz
- Yalnız həqiqi, açıq-aşkar səhvləri qeyd et

YALNIZ bu JSON formatında cavab ver, əvvəl-sonra heç nə əlavə etmə:
{"errors": [{"word": "orijinal səhv söz", "suggestion": "düzgün variant", "type": "orfoqrafiya", "description": "izahat"}]}
Səhv yoxdursa: {"errors": []}

Mətn:
${text}`;
      break;
    case 'tone':
      prompt = `Aşağıdakı mətni "${o.tone || 'Rəsmi'}" tonuna uyğunlaşdır. Yalnız yenidən yazılmış mətni qaytar:\n\n${text}`;
      break;
    case 'improve':
      prompt = `Aşağıdakı mətni Azərbaycan ədəbi dili normalarına uyğun təkmilləşdir. Mənasını qoru, ifadəni gözəlləşdir. Yalnız təkmilləşdirilmiş mətni qaytar:\n\n${text}`;
      break;
    case 'vocab':
      prompt = `Aşağıdakı mətndəki sadə, adi sözləri zəngin, ədəbi Azərbaycan sözləri ilə əvəz et. Yalnız yenilənmiş mətni qaytar:\n\n${text}`;
      break;
    case 'plagiarism':
      prompt = `Aşağıdakı mətni orijinallıq baxımından qiymətləndir. Mümkün oxşarlıqları, şüblə doğuran hissələri qeyd et:\n\n${text}`;
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
      prompt = `Verilən məlumatlar əsasında rəsmi MƏKTUB hazırla. Tam format: üst-başlıq (göndərən/alan), tarix, müraciət, mətn, hörmətlə bağlama, imza:\n\n${text}`;
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

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        max_tokens: 4000,
        temperature: 0.1,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        }
      }
    );

    const result = response.data.choices[0].message.content;
    res.json({ result });

  } catch (err) {
    console.error('Groq API Xətası:', err.response?.data || err.message);
    res.status(500).json({ error: 'AI serveri ilə əlaqə xətası.' });
  }
};
