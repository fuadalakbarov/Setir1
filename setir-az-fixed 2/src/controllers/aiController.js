const axios = require('axios');

exports.processText = async (req, res) => {
  const { text, tool, options } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Mətn daxil edilməyib.' });
  }

  // Biznes modulu yoxlaması
  const biznesTools = ['protokol','emr','qerar','mektub','arayis','xidmeti'];
  if (biznesTools.includes(tool) && req.user.plan !== 'biznes') {
    return res.status(403).json({ error: 'Bu modul yalnız Biznes Paketi istifadəçilərinə açıqdır.' });
  }

  const system = "Sən Azərbaycan dili və rəsmi kargüzarlıq üzrə ixtisaslaşmış süni intellekt köməkçisisən. Cavablarında heç bir giriş ifadəsi yazma (məs: 'Buyurun:', 'Əlbəttə:'). Birbaşa nəticəni qaytar. Azərbaycan ədəbi dilinə tam uyğun yaz.";

  let prompt = '';
  const o = options || {};

  switch(tool) {
    case 'grammar':
      prompt = `Aşağıdakı mətni qrammatika, imla və durğu işarəsi baxımından tam düzəlt. Düzəldilmiş mətni qaytar, sonra qısa şəkildə hansı xətaların düzəldildiyini siyahı şəklində göstər:\n\n${text}`;
      break;
    case 'tone':
      prompt = `Aşağıdakı mətni "${o.tone || 'Rəsmi'}" tonuna uyğunlaşdır. Mənası dəyişmədən yalnız üslubu dəyiş:\n\n${text}`;
      break;
    case 'improve':
      prompt = `Aşağıdakı mətni ${o.style || 'ümumi'} üslubda təkmilləşdir. Qrammatika, üslub, axıcılıq və ifadə zənginliyi baxımından yaxşılaşdır:\n\n${text}`;
      break;
    case 'vocab':
      prompt = `Aşağıdakı mətndəki təkrarlanan və sadə sözləri zəngin, dəqiq Azərbaycan sözləri ilə əvəz et. Orijinal mətni, sonra zənginləşdirilmiş versiyasını göstər:\n\n${text}`;
      break;
    case 'plagiarism':
      prompt = `Aşağıdakı mətni analiz et və orijinallıq baxımından qiymətləndir. Şablonlaşmış ifadələri, ümumi klişeləri işarələ. Mətni daha orijinal etmək üçün konkret tövsiyələr ver:\n\n${text}`;
      break;
    case 'summary':
      const lenMap = {'Qısa (2-3 cümlə)':'2-3 cümlə','Orta (1 paraqraf)':'1 paraqraf','Ətraflı (3-5 paraqraf)':'3-5 paraqraf'};
      const sumLen = lenMap[o.length] || '1 paraqraf';
      prompt = `Aşağıdakı mətni ${sumLen} həcmində xülasə et. Əsas fikirləri saxla:\n\n${text}`;
      break;
    case 'generate':
      prompt = `Aşağıdakı tapşırığa əsasən "${o.type || 'Mətn'}" janrında keyfiyyətli, Azərbaycan ədəbi dilinə uyğun mətn yarat:\n\n${text}`;
      break;
    case 'rewrite':
      const rewriteMap = {'Sadələşdir':'daha sadə və anlaşıqlı dildə','Genişləndir':'daha ətraflı və zəngin şəkildə','Rəsmiləşdir':'rəsmi üslubda','Qısalt':'daha qısa və yığcam şəkildə','Fərqli üslubda yaz':'tamamilə fərqli üslubda'};
      const rMode = rewriteMap[o.mode] || 'fərqli şəkildə';
      prompt = `Aşağıdakı mətni ${rMode} yenidən yaz. Əsas məna qalsın:\n\n${text}`;
      break;
    case 'protokol':
      prompt = `Aşağıdakı iclas məlumatlarına əsasən Azərbaycan Respublikasının kargüzarlıq standartlarına tam uyğun rəsmi İCLAS PROTOKOLU hazırla. Sənəddə: tarix, yer, sədr, katib, iştirakçılar, gündəlik, müzakirə gedişatı, qərarlar bölmələri olmalıdır:\n\n${text}`;
      break;
    case 'emr':
      prompt = `Aşağıdakı məzmuna əsasən Azərbaycan Respublikasının Əmək Məcəlləsinə uyğun rəsmi İŞƏGÖTÜRƏN ƏMRİ layihəsi hazırla. Müəssisə adı, tarix, nömrə kimi dəyişən hissələr üçün [boşluq] qoy:\n\n${text}`;
      break;
    case 'qerar':
      prompt = `Aşağıdakı məzmuna əsasən kollegial orqanın rəsmi QƏRAR sənədi hazırla. Azərbaycan kargüzarlıq standartlarına uyğun olsun:\n\n${text}`;
      break;
    case 'mektub':
      prompt = `Aşağıdakı məzmuna əsasən qurumlar arası rəsmi MƏKTUB hazırla. Giriş, əsas hissə və yekun düzgün qurulsun:\n\n${text}`;
      break;
    case 'arayis':
      prompt = `Aşağıdakı məlumatlara əsasən rəsmi ARAYIŞ sənədi hazırla. Azərbaycan kargüzarlıq standartlarına uyğun olsun:\n\n${text}`;
      break;
    case 'xidmeti':
      prompt = `Aşağıdakı məzmuna əsasən daxili XİDMƏTİ YAZI / İZAHAT sənədi hazırla:\n\n${text}`;
      break;
    default:
      prompt = text;
  }

  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system,
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.CLAUDE_API_KEY,
          'anthropic-version': '2023-06-01'
        }
      }
    );
    res.json({ result: response.data.content[0].text });
  } catch (err) {
    console.error('Claude API Xətası:', err.response?.data || err.message);
    res.status(500).json({ error: 'AI serveri ilə əlaqə xətası.' });
  }
};