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
    case 'grammar': prompt = `Aşağıdakı mətni qrammatika, imla və durğu işarəsi baxımından tam düzəlt. Düzəldilmiş mətni qaytar, sonra hansı xətaların düzəldildiyini göstər:\n\n${text}`; break;
    case 'tone': prompt = `Aşağıdakı mətni "${o.tone || 'Rəsmi'}" tonuna uyğunlaşdır:\n\n${text}`; break;
    case 'improve': prompt = `Aşağıdakı mətni ${o.style || 'ümumi'} üslubda təkmilləşdir:\n\n${text}`; break;
    case 'vocab': prompt = `Aşağıdakı mətndəki sadə sözləri zəngin Azərbaycan sözləri ilə əvəz et:\n\n${text}`; break;
    case 'plagiarism': prompt = `Aşağıdakı mətni orijinallıq baxımından qiymətləndir:\n\n${text}`; break;
    case 'summary': prompt = `Aşağıdakı mətni xülasə et:\n\n${text}`; break;
    case 'generate': prompt = `"${o.type || 'Mətn'}" janrında mətn yarat:\n\n${text}`; break;
    case 'rewrite': prompt = `Aşağıdakı mətni yenidən yaz:\n\n${text}`; break;
    case 'protokol': prompt = `Rəsmi İCLAS PROTOKOLU hazırla:\n\n${text}`; break;
    case 'emr': prompt = `Rəsmi ƏMR layihəsi hazırla:\n\n${text}`; break;
    case 'qerar': prompt = `Rəsmi QƏRAR sənədi hazırla:\n\n${text}`; break;
    case 'mektub': prompt = `Rəsmi MƏKTUB hazırla:\n\n${text}`; break;
    case 'arayis': prompt = `Rəsmi ARAYIŞ hazırla:\n\n${text}`; break;
    case 'xidmeti': prompt = `XİDMƏTİ YAZI hazırla:\n\n${text}`; break;
    default: prompt = text;
  }

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2000,
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
    res.json({ result: response.data.choices[0].message.content });
  } catch (err) {
    console.error('Groq API Xətası:', err.response?.data || err.message);
    res.status(500).json({ error: 'AI serveri ilə əlaqə xətası.' });
  }
};
