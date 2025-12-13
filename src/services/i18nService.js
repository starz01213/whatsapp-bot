/**
 * Internationalization (i18n) Service
 * Multi-language support for WhatsApp bot messages
 */

class I18nService {
  constructor() {
    this.languages = {
      en: {
        name: 'English',
        flag: '🇬🇧',
      },
      es: {
        name: 'Spanish',
        flag: '🇪🇸',
      },
      fr: {
        name: 'French',
        flag: '🇫🇷',
      },
      de: {
        name: 'German',
        flag: '🇩🇪',
      },
      pt: {
        name: 'Portuguese',
        flag: '🇵🇹',
      },
      it: {
        name: 'Italian',
        flag: '🇮🇹',
      },
      ja: {
        name: 'Japanese',
        flag: '🇯🇵',
      },
      zh: {
        name: 'Chinese',
        flag: '🇨🇳',
      },
      ar: {
        name: 'Arabic',
        flag: '🇸🇦',
      },
      yo: {
        name: 'Yoruba',
        flag: '🇳🇬',
      },
      ig: {
        name: 'Igbo',
        flag: '🇳🇬',
      },
      ha: {
        name: 'Hausa',
        flag: '🇳🇬',
      },
    };

    this.translations = {
      // Welcome messages
      welcome: {
        en: 'Welcome to our WhatsApp Bot! 👋 How can I help you today?',
        es: '¡Bienvenido a nuestro Bot de WhatsApp! 👋 ¿Cómo puedo ayudarte hoy?',
        fr: 'Bienvenue sur notre Bot WhatsApp! 👋 Comment puis-je vous aider aujourd\'hui?',
        de: 'Willkommen bei unserem WhatsApp-Bot! 👋 Wie kann ich dir heute helfen?',
        pt: 'Bem-vindo ao nosso Bot WhatsApp! 👋 Como posso ajudá-lo hoje?',
        it: 'Benvenuto al nostro Bot WhatsApp! 👋 Come posso aiutarti oggi?',
        ja: 'WhatsAppボットへようこそ！👋 今日はどのようにお手伝いできますか？',
        zh: '欢迎来到我们的WhatsApp机器人！👋 我今天能为你做什么？',
        ar: 'أهلا بك في بوت WhatsApp الخاص بنا! 👋 كيف يمكنني مساعدتك اليوم؟',
        yo: 'Pẹlẹ o wa si WhatsApp Bot wa! 👋 Bawo ni mo tun le ṣe iranlọwọ ọ loni?',
        ig: 'Nnọọ na WhatsApp Bot anyị! 👋 Kedu ihe m nwere ike ime maka gị taa?',
        ha: 'Sannu da zuwa WhatsApp Bot ɗin! 👋 Ta yaya zan iya taimakon ka jiya?',
      },

      // Menu options
      menu: {
        en: 'Please choose an option:\n1️⃣ View Products\n2️⃣ Check Subscription\n3️⃣ Buy Subscription\n4️⃣ Support',
        es: 'Por favor elige una opción:\n1️⃣ Ver Productos\n2️⃣ Ver Suscripción\n3️⃣ Comprar Suscripción\n4️⃣ Soporte',
        fr: 'Veuillez choisir une option:\n1️⃣ Voir les produits\n2️⃣ Vérifier l\'abonnement\n3️⃣ Acheter un abonnement\n4️⃣ Support',
        de: 'Bitte wählen Sie eine Option:\n1️⃣ Produkte anzeigen\n2️⃣ Abonnement überprüfen\n3️⃣ Abonnement kaufen\n4️⃣ Unterstützung',
        pt: 'Por favor escolha uma opção:\n1️⃣ Ver Produtos\n2️⃣ Verificar Assinatura\n3️⃣ Comprar Assinatura\n4️⃣ Suporte',
        it: 'Per favore scegli un\'opzione:\n1️⃣ Visualizza Prodotti\n2️⃣ Controlla Abbonamento\n3️⃣ Acquista Abbonamento\n4️⃣ Supporto',
        ja: 'オプションを選択してください:\n1️⃣ 製品を表示\n2️⃣ サブスクリプションを確認\n3️⃣ サブスクリプションを購入\n4️⃣ サポート',
        zh: '请选择一个选项:\n1️⃣ 查看产品\n2️⃣ 检查订阅\n3️⃣ 购买订阅\n4️⃣ 支持',
        ar: 'يرجى اختيار خيار:\n1️⃣ عرض المنتجات\n2️⃣ التحقق من الاشتراك\n3️⃣ شراء الاشتراك\n4️⃣ الدعم',
        yo: 'Jọwọ yan ayanfa:\n1️⃣ Wo Awọn Ọja\n2️⃣ Yẹ Ilé Aṣọ\n3️⃣ Ra Ilé Aṣọ\n4️⃣ Iranlọwọ',
        ig: 'Jiri hanya kesịa:\n1️⃣ Gosi Ngwongwo\n2️⃣ Njuo Ndenye\n3️⃣ Zụtakwa Ndenye\n4️⃣ Enyemaka',
        ha: 'Da fatan zaɓi zaɓi:\n1️⃣ Nuna Kaya\n2️⃣ Bincika Jiyya\n3️⃣ Sayi Jiyya\n4️⃣ Goyon Baya',
      },

      // Trial activation
      trial_activated: {
        en: '✅ Trial activated! You have 1 day of free access. Enjoy!',
        es: '✅ ¡Prueba activada! Tienes 1 día de acceso gratuito. ¡Disfruta!',
        fr: '✅ Essai activé! Vous avez 1 jour d\'accès gratuit. Profitez-en!',
        de: '✅ Testversion aktiviert! Sie haben 1 Tag kostenlose Nutzung. Viel Spaß!',
        pt: '✅ Teste ativado! Você tem 1 dia de acesso gratuito. Aproveite!',
        it: '✅ Prova attivata! Hai 1 giorno di accesso gratuito. Goditi!',
        ja: '✅ トライアルが有効になりました！1日間の無料アクセスがあります。楽しんでください！',
        zh: '✅ 试用已激活！您有1天的免费访问权限。享受吧！',
        ar: '✅ تم تنشيط المحاولة! لديك يوم واحد من الوصول المجاني. استمتع!',
        yo: '✅ Igbiyanju ti kudaradara! Ọ ni ọjọ kan ti wiwọlẹ ní ọfẹ. Yọ!',
        ig: '✅ Nwalee kaakaa! Ị nwere ụbọchị otu nke ikekwesị pụta eze. Ụfọdụ!',
        ha: '✅ An haifar da gwajin! Kana da ranar ɗaya na aikace aika kyauta. Gamu!',
      },

      // Payment initiated
      payment_initiated: {
        en: '💳 Payment initiated! Send ₦{amount} to account: {account}. Reference: {ref}',
        es: '💳 ¡Pago iniciado! Envía ₦{amount} a la cuenta: {account}. Referencia: {ref}',
        fr: '💳 Paiement lancé! Envoyez ₦{amount} au compte: {account}. Référence: {ref}',
        de: '💳 Zahlung eingeleitet! Senden Sie ₦{amount} an Konto: {account}. Referenz: {ref}',
        pt: '💳 Pagamento iniciado! Envie ₦{amount} para a conta: {account}. Referência: {ref}',
        it: '💳 Pagamento avviato! Invia ₦{amount} al conto: {account}. Riferimento: {ref}',
        ja: '💳 支払いが開始されました！₦{amount}をアカウント{account}に送信します。参考: {ref}',
        zh: '💳 付款已启动！将₦{amount}发送到帐户：{account}。参考：{ref}',
        ar: '💳 تم بدء الدفع! أرسل ₦{amount} إلى الحساب: {account}. المرجع: {ref}',
        yo: '💳 Ipese ti bẹrẹ! Fi ₦{amount} ranṣẹ si akawunti: {account}. Itọka: {ref}',
        ig: '💳 Akwụ maka ihe malitere! Zipụ ₦{amount} na akaụntụ: {account}. Ndebanye: {ref}',
        ha: '💳 An fara da jingina! Aika ₦{amount} zuwa akauni: {account}. Lasafta: {ref}',
      },

      // Payment confirmed
      payment_confirmed: {
        en: '✅ Payment confirmed! Your subscription is now active.',
        es: '✅ ¡Pago confirmado! Tu suscripción ahora está activa.',
        fr: '✅ Paiement confirmé! Votre abonnement est maintenant actif.',
        de: '✅ Zahlung bestätigt! Ihr Abonnement ist jetzt aktiv.',
        pt: '✅ Pagamento confirmado! Sua assinatura agora está ativa.',
        it: '✅ Pagamento confermato! Il tuo abbonamento è ora attivo.',
        ja: '✅ 支払いが確認されました！サブスクリプションがアクティブになりました。',
        zh: '✅ 付款已确认！您的订阅现已激活。',
        ar: '✅ تم تأكيد الدفع! اشتراكك الآن نشط.',
        yo: '✅ Ipese ti jẹ rira! Aṣẹ rẹ bayi le gbe..',
        ig: '✅ Akwụ kaakaa! Ndenye gị na-emezi ugbu a.',
        ha: '✅ An tabbatar da jingina! Jiyya ku yanzu ta kasance mai aiki.',
      },

      // Error messages
      error_invalid_input: {
        en: '❌ Invalid input. Please try again.',
        es: '❌ Entrada no válida. Por favor intenta de nuevo.',
        fr: '❌ Entrée invalide. Veuillez réessayer.',
        de: '❌ Ungültige Eingabe. Bitte versuchen Sie es erneut.',
        pt: '❌ Entrada inválida. Por favor tente novamente.',
        it: '❌ Input non valido. Riprova.',
        ja: '❌ 無効な入力です。もう一度試してください。',
        zh: '❌ 输入无效。请重试。',
        ar: '❌ إدخال غير صالح. حاول مرة أخرى.',
        yo: '❌ Iṣaaju ti ko tọ. Jọwọ gbiyanju lẹẹkansi.',
        ig: '❌ Ntinye ejọ. Biko gbalị ọzọ.',
        ha: '❌ Sautin da ba daidai ba. Da fatan sake gwaji.',
      },

      error_service_unavailable: {
        en: '⚠️ Service temporarily unavailable. Please try again later.',
        es: '⚠️ Servicio temporalmente no disponible. Intenta más tarde.',
        fr: '⚠️ Service temporairement indisponible. Réessayez plus tard.',
        de: '⚠️ Service vorübergehend nicht verfügbar. Bitte später versuchen.',
        pt: '⚠️ Serviço temporariamente indisponível. Tente novamente mais tarde.',
        it: '⚠️ Servizio temporaneamente non disponibile. Riprova più tardi.',
        ja: '⚠️ サービスは一時的に利用できません。後でもう一度お試しください。',
        zh: '⚠️ 服务暂时不可用。请稍后重试。',
        ar: '⚠️ الخدمة غير متاحة مؤقتا. يرجى المحاولة لاحقا.',
        yo: '⚠️ Iṣẹ ti ko ni bẹ lokọ. Jọwọ gbiyanju nigbamii.',
        ig: '⚠️ Ọrụ na-adịghị mma ugbu a. Biko gbalị ọzọ kemgbe.',
        ha: '⚠️ Sabis ba a ba sa shi don lokaci. Da fatan sake gwaji gida.',
      },

      // Help messages
      help_products: {
        en: 'To view products, type: PRODUCTS or ITEMS',
        es: 'Para ver productos, escribe: PRODUCTOS O ELEMENTOS',
        fr: 'Pour afficher les produits, tapez: PRODUITS OU ARTICLES',
        de: 'Um Produkte anzuzeigen, geben Sie ein: PRODUKTE ODER ARTIKEL',
        pt: 'Para visualizar produtos, digite: PRODUTOS OU ITENS',
        it: 'Per visualizzare i prodotti, digita: PRODOTTI O ARTICOLI',
        ja: '製品を表示するには、以下を入力してください：PRODUCTS または ITEMS',
        zh: '要查看产品，请输入：PRODUCTS或ITEMS',
        ar: 'لعرض المنتجات، اكتب: المنتجات أو العناصر',
        yo: 'Lati wo awọn ọja, kọ: AWỌN ỌJA TABI AWỌN IKO',
        ig: 'Iji gosi ngwongwo, deere: NGWONGWO MAA KA IHEAKA',
        ha: 'Don nuna kaya, rubuta: KAYA TABBAS KAICIYE',
      },
    };
  }

  /**
   * Get available languages
   * @returns {object}
   */
  getAvailableLanguages() {
    return this.languages;
  }

  /**
   * Translate message
   * @param {string} key - Translation key
   * @param {string} language - Language code (default: 'en')
   * @param {object} placeholders - Values to replace in message
   * @returns {string}
   */
  translate(key, language = 'en', placeholders = {}) {
    if (!this.translations[key]) {
      console.warn(`Translation key not found: ${key}`);
      return key;
    }

    let message = this.translations[key][language] || this.translations[key]['en'];

    // Replace placeholders
    Object.keys(placeholders).forEach((placeholder) => {
      message = message.replace(`{${placeholder}}`, placeholders[placeholder]);
    });

    return message;
  }

  /**
   * Get language menu
   * @returns {string}
   */
  getLanguageMenu() {
    let menu = '🌍 Choose your language / Choisissez votre langue / Elige tu idioma:\n\n';

    Object.entries(this.languages).forEach(([code, lang]) => {
      menu += `${lang.flag} ${code.toUpperCase()} - ${lang.name}\n`;
    });

    return menu;
  }

  /**
   * Detect language from user input
   * @param {string} userInput - User's message
   * @returns {string|null}
   */
  detectLanguage(userInput) {
    const input = userInput.toLowerCase().trim();

    // Check if input matches any language code
    for (const code of Object.keys(this.languages)) {
      if (input.includes(code)) {
        return code;
      }
    }

    return null;
  }

  /**
   * Get greeting based on time and language
   * @param {string} language - Language code
   * @returns {string}
   */
  getGreeting(language = 'en') {
    const hour = new Date().getHours();
    let greeting;

    if (hour < 12) {
      greeting = language === 'en' ? 'Good morning' : this.getLocalisedGreeting('morning', language);
    } else if (hour < 18) {
      greeting = language === 'en' ? 'Good afternoon' : this.getLocalisedGreeting('afternoon', language);
    } else {
      greeting = language === 'en' ? 'Good evening' : this.getLocalisedGreeting('evening', language);
    }

    return greeting;
  }

  /**
   * Get localised greeting
   * @private
   */
  getLocalisedGreeting(timeOfDay, language) {
    const greetings = {
      morning: {
        es: 'Buenos días',
        fr: 'Bonjour',
        de: 'Guten Morgen',
        pt: 'Bom dia',
        it: 'Buongiorno',
        ja: 'おはようございます',
        zh: '早上好',
        ar: 'صباح الخير',
        yo: 'E karo ni iróyin',
        ig: 'Kedu ka ụtụtụ',
        ha: 'Sannu da safiya',
      },
      afternoon: {
        es: 'Buenas tardes',
        fr: 'Bon après-midi',
        de: 'Guten Nachmittag',
        pt: 'Boa tarde',
        it: 'Buon pomeriggio',
        ja: 'こんにちは',
        zh: '下午好',
        ar: 'بعد الظهر الخير',
        yo: 'E karo ni ipari',
        ig: 'Kedu ka ehihie',
        ha: 'Sannu da jiya',
      },
      evening: {
        es: 'Buenas noches',
        fr: 'Bonsoir',
        de: 'Guten Abend',
        pt: 'Boa noite',
        it: 'Buonasera',
        ja: 'こんばんは',
        zh: '晚上好',
        ar: 'مساء الخير',
        yo: 'E karo ni alẹ',
        ig: 'Kedu ka chi',
        ha: 'Sannu da jiya',
      },
    };

    return greetings[timeOfDay][language] || 'Hello';
  }

  /**
   * Format currency based on language
   * @param {number} amount - Amount to format
   * @param {string} language - Language code
   * @returns {string}
   */
  formatCurrency(amount, language = 'en') {
    const currencyFormats = {
      en: `₦${amount.toLocaleString('en-NG')}`,
      es: `₦${amount.toLocaleString('es-ES')}`,
      fr: `₦${amount.toLocaleString('fr-FR')}`,
      de: `₦${amount.toLocaleString('de-DE')}`,
      pt: `₦${amount.toLocaleString('pt-BR')}`,
      it: `₦${amount.toLocaleString('it-IT')}`,
      ja: `₦${amount.toLocaleString('ja-JP')}`,
      zh: `₦${amount.toLocaleString('zh-CN')}`,
      ar: `₦${amount.toLocaleString('ar-SA')}`,
      yo: `₦${amount.toLocaleString('en-NG')}`,
      ig: `₦${amount.toLocaleString('en-NG')}`,
      ha: `₦${amount.toLocaleString('en-NG')}`,
    };

    return currencyFormats[language] || `₦${amount}`;
  }
}

module.exports = new I18nService();
