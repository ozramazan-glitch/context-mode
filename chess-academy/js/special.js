/*
 * Özel Hamleler Atölyesi: öğrenme yolundan ayrı ikinci arayüzün içeriği.
 * Konular: piyonun çift adımı, rok, geçerken alma, terfi + rok laboratuvarı.
 * Alıştırmalar curriculum.js ile aynı biçimdedir ve aynı testlerle doğrulanır.
 */
(function (root) {
  'use strict';

  var topics = [
    {
      id: 'cift', title: 'Piyonun Çift Adımı', glyph: 'p', short: 'İlk hamlede iki kare',
      rules: [
        'Piyon yalnızca <b>kendi ilk hamlesinde</b> iki kare ilerleyebilir.',
        'Geçeceği kare de varacağı kare de <b>boş</b> olmalıdır; piyon taşların üzerinden atlayamaz.',
        'Çift adımla alma yapılmaz; piyon taşı her zaman bir kare çapraz alır.',
        'Rakip piyonun yanına çift adımla gelen piyon <b>geçerken alınabilir</b> (bkz. Geçerken Alma).'
      ],
      cards: [
        { text: 'Henüz hiç oynamamış bir piyon, ilk hamlesinde bir ya da iki kare ilerlemeyi seçebilir. e2 piyonu e3’e veya e4’e gidebilir.', fen: '4k3/8/8/8/8/8/4P3/4K3 w - - 0 1', showMoves: 'e2' },
        { text: 'Önündeki kare doluysa piyon iki kare de ilerleyemez: çift adımda da üzerinden atlamak yoktur.', fen: '4k3/8/8/8/8/4n3/4P3/4K3 w - - 0 1', showMoves: 'e2' },
        { text: 'Bir kez oynamış piyon (burada e3’teki) artık yalnızca birer kare ilerler.', fen: '4k3/8/8/8/8/4P3/8/4K3 w - - 0 1', showMoves: 'e3' }
      ],
      exercises: [
        { id: 'ox1', type: 'stars', title: 'Tek hamlede iki kare', category: 'ozel', prompt: 'Piyonu tek hamlede yıldıza ulaştır.', fen: '8/8/8/8/8/8/4P3/8 w - - 0 1', piece: 'e2', stars: ['e4'] },
        { id: 'ox2', type: 'quiz', title: 'İkinci hamle', category: 'ozel', prompt: 'e2–e3 oynamış bir piyon, bir sonraki hamlesinde e3’ten e5’e gidebilir mi?', options: ['Evet, hâlâ ilk iki karesindedir', 'Hayır, çift adım yalnızca ilk hamlede yapılır'], answer: 1, explain: 'Çift adım hakkı, piyon ilk kez oynayınca biter.' }
      ]
    },
    {
      id: 'rok', title: 'Rok', glyph: 'k', short: 'Şah ve kale birlikte',
      rules: [
        'Rok, <b>şah ve kalenin aynı hamlede</b> oynandığı tek hamledir: şah kaleye doğru <b>iki kare</b> gider, kale şahın üzerinden atlayıp hemen yanına geçer.',
        '<b>Kısa rok (O-O):</b> şah g1’e, kale f1’e. <b>Uzun rok (O-O-O):</b> şah c1’e, kale d1’e (siyah için 8. sırada).',
        'Şah ve o kale <b>daha önce hiç oynamamış</b> olmalıdır.',
        'Şah ile kale arasındaki kareler <b>boş</b> olmalıdır.',
        'Şah o anda <b>şah altında olmamalıdır</b>.',
        'Şahın <b>geçtiği kare ve varacağı kare</b> rakip tarafından tehdit edilmemelidir. Uzun rokta kalenin geçtiği b1 karesinin tehdit altında olması rokta engel değildir.'
      ],
      cards: [
        { text: 'Rok, şahı güvenli bir köşeye alır ve kaleyi oyuna sokar. Önce <b>kısa rok</b>: şah e1’den g1’e iki kare gider, h1’deki kale f1’e geçer.', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', demo: ['e1g1'] },
        { text: '<b>Uzun rok</b>: şah e1’den c1’e iki kare gider, a1’deki kale d1’e geçer. Uzun rokta şah ile kale arasında üç kare (b1, c1, d1) boş olmalıdır.', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', demo: ['e1c1'] },
        { text: 'Burada beyaz kısa rok <b>yapamaz</b>: c4’teki siyah fil f1’i tehdit ediyor ve şah tehdit altındaki bir kareden geçemez. Uzun rok ise serbesttir.', fen: '4k3/8/8/8/2b5/8/PPPP1PPP/R3K2R w KQ - 0 1', arrows: [['c4', 'f1']] },
        { text: 'Bu tahtada uygulamada rok yapmak için şahı seçip iki kare yana (g1 veya c1) götür ya da şahı seçip kendi kalesine tıkla.', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', showMoves: 'e1' }
      ],
      exercises: [
        { id: 'or1', type: 'puzzle', title: 'Kısa rok', category: 'ozel', prompt: 'Kısa rok yap.', task: true, fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', line: ['e1g1'], wrong: { e1c1: 'Bu uzun rok. Kısa rok için şah g1’e gider.' }, wrongDefault: 'Şahını seç ve iki kare sağa, g1’e götür.', explain: 'O-O: şah g1’de, kale f1’de.' },
        { id: 'or2', type: 'puzzle', title: 'Uzun rok', category: 'ozel', prompt: 'Uzun rok yap.', task: true, fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', line: ['e1c1'], wrong: { e1g1: 'Bu kısa rok. Uzun rok için şah c1’e gider.' }, wrongDefault: 'Şahını seç ve iki kare sola, c1’e götür.', explain: 'O-O-O: şah c1’de, kale d1’de.' },
        { id: 'or3', type: 'quiz', title: 'Kısa rok mümkün mü?', category: 'ozel', prompt: 'Beyaz burada kısa rok yapabilir mi?', fen: '4k3/8/8/8/2b5/8/PPPP1PPP/R3K2R w KQ - 0 1', options: ['Evet', 'Hayır: şah şu an şah altında', 'Hayır: şahın geçeceği kare tehdit altında', 'Hayır: arada taş var'], answer: 2, verify: { move: 'e1g1', legal: false, squareAttacked: 'f1' }, explain: 'c4’teki fil f1’i tehdit ediyor. Şah tehdit altındaki bir kareden geçemez.' },
        { id: 'or4', type: 'quiz', title: 'Uzun rok mümkün mü?', category: 'ozel', prompt: 'e4’teki siyah fil b1’i tehdit ediyor. Beyaz uzun rok yapabilir mi?', fen: '4k3/8/8/8/4b3/8/PP1PPPPP/R3K2R w KQ - 0 1', options: ['Evet: kural yalnızca şahın geçtiği ve vardığı kareler için', 'Hayır: kalenin geçtiği kare tehdit altında'], answer: 0, verify: { move: 'e1c1', legal: true, squareAttacked: 'b1' }, explain: 'Şah e1–d1–c1 yolunu kullanır; bu karelerin hiçbiri tehdit altında değil. b1’den yalnızca kale geçer, bu serbesttir.' },
        { id: 'or5', type: 'quiz', title: 'Şah altındayken', category: 'ozel', prompt: 'e8’deki siyah kale beyaz şaha şah çekiyor. Beyaz rok yaparak kurtulabilir mi?', fen: 'k3r3/8/8/8/8/8/PPPP1PPP/R3K2R w KQ - 0 1', options: ['Evet, kısa rokla', 'Evet, uzun rokla', 'Hayır, şah altındayken rok yapılmaz'], answer: 2, verify: { move: 'e1g1', legal: false, inCheck: true }, explain: 'Rok şahtan kurtulmanın bir yolu değildir.' },
        { id: 'or6', type: 'quiz', title: 'Arada taş', category: 'ozel', prompt: 'Beyaz burada kısa rok yapabilir mi?', fen: '4k3/8/8/8/8/8/PPPPPPPP/R3K1NR w KQ - 0 1', options: ['Evet', 'Hayır: g1’de at var'], answer: 1, verify: { move: 'e1g1', legal: false }, explain: 'Şah ile kale arasındaki kareler boş olmalı.' },
        { id: 'or7', type: 'quiz', title: 'Oynamış şah', category: 'ozel', prompt: 'Beyaz şah oyunun başında e1’den f1’e gitti, sonra tekrar e1’e döndü. Kaleler hiç oynamadı. Beyaz rok yapabilir mi?', options: ['Evet, şah yine başlangıç karesinde', 'Hayır, şah bir kez oynadığı için rok hakkı kalmadı'], answer: 1, explain: 'Rok hakkı şahın veya ilgili kalenin ilk hamlesiyle birlikte kalıcı olarak kaybolur.' }
      ]
    },
    {
      id: 'gecerken', title: 'Geçerken Alma', glyph: 'p', short: 'En passant',
      rules: [
        'Rakip piyon başlangıç karesinden <b>iki kare</b> ilerleyip senin piyonunun <b>hemen yanına</b> gelirse, piyonunla onu <b>bir kare ilerlemiş gibi</b> alabilirsin.',
        'Senin piyonun 5. sırada olmalıdır (siyah için 4. sırada).',
        'Alan piyon, rakip piyonun geçtiği kareye (arkasına) gider; alınan piyon tahtadan kalkar.',
        'Bu hak <b>yalnızca hemen sonraki hamlede</b> kullanılabilir; beklersen kaybolur.',
        'Uluslararası adı <b>en passant</b> (Fransızca “geçerken”) olup notasyonda bazen “e.p.” diye yazılır.'
      ],
      cards: [
        { text: 'Beyaz piyon e5’te. Siyah d7–d5 oynayıp piyonunu iki kare ilerletirse beyaz piyonun hemen yanına gelir.', fen: '4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1', demo: ['d7d5'] },
        { text: 'Beyaz şimdi e5xd6 ile piyonu <b>geçerken alabilir</b>: sanki siyah piyon yalnızca d6’ya gelmiş gibi. Beyaz piyon d6’ya gider, d5’teki siyah piyon tahtadan kalkar.', fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2', demo: ['e5d6'] },
        { text: 'Beyaz bu fırsatı kullanmayıp başka bir hamle yaparsa geçerken alma hakkı <b>kaybolur</b>.', fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2', arrows: [['e5', 'd6']] }
      ],
      exercises: [
        { id: 'og1', type: 'puzzle', title: 'Şimdi ya da hiç', category: 'ozel', prompt: 'Siyah d7–d5 oynayacak. Ardından piyonu geçerken al!', fen: '7k/3p4/8/4P3/8/8/8/4K3 b - - 0 1', task: true, pre: ['d7d5'], line: ['e5d6'], wrongDefault: 'Geçerken alma hakkı yalnızca bu hamlede geçerli. e5 piyonunu d6’ya oyna.', hint: 'e5 piyonunu seç: d6 karesi parlıyor olmalı.', explain: 'exd6 e.p.: piyon d6’ya gitti, d5’teki siyah piyon alındı.' },
        { id: 'og2', type: 'puzzle', title: 'İki seçenek', category: 'ozel', prompt: 'Siyah f7–f5 oynayacak. İki piyonundan biriyle geçerken al.', fen: 'k7/5p2/8/4P1P1/8/8/8/4K3 b - - 0 1', task: true, pre: ['f7f5'], line: ['e5f6'], accept: { 0: ['e5f6', 'g5f6'] }, wrongDefault: 'f6 karesine bak: iki piyonun da oraya geçerken alarak gidebilir.', explain: 'Hem e5 hem g5 piyonu f5’teki piyonu geçerken alabilirdi.' },
        { id: 'og3', type: 'quiz', title: 'Beklersem?', category: 'ozel', prompt: 'Rakip piyon iki kare ilerleyip piyonunun yanına geldi. Önce başka bir hamle yapıp bir sonraki hamlende geçerken alabilir misin?', options: ['Evet, piyon orada durduğu sürece', 'Hayır, yalnızca hemen sonraki hamlede'], answer: 1, explain: 'Geçerken alma ya hemen yapılır ya da hiç yapılmaz.' },
        { id: 'og4', type: 'quiz', title: 'Hangi sıra?', category: 'ozel', prompt: 'Beyaz bir piyonun geçerken alabilmesi için hangi sırada olması gerekir?', options: ['4. sıra', '5. sıra', '6. sıra'], answer: 1, explain: 'Siyah piyon 7. sıradan 5. sıraya iki kare gelir; yanındaki beyaz piyon da 5. sıradadır.' }
      ]
    },
    {
      id: 'terfi', title: 'Piyon Terfisi', glyph: 'q', short: 'Son sıraya ulaşan piyon',
      rules: [
        'Son sıraya (beyaz için 8., siyah için 1. sıra) ulaşan piyon <b>aynı hamlede</b> vezir, kale, fil veya ata dönüştürülür. Buna <b>terfi</b> denir.',
        'Piyon şaha dönüşemez ve piyon olarak da kalamaz.',
        'Tahtada zaten vezirin olsa bile ikinci bir vezir alabilirsin.',
        'Çoğu zaman vezir seçilir. Vezir dışındaki bir taşı seçmeye <b>az terfi</b> denir; örneğin ata terfi edip şah çekerek çatal yapmak veya pattan kaçınmak için.'
      ],
      cards: [
        { text: 'e7 piyonu e8’e ilerleyince bir taşa dönüşür. Uygulamada terfi karesine oynadığında hangi taşı istediğin sorulur.', fen: '8/4P3/8/8/8/k7/8/4K3 w - - 0 1', demo: ['e7e8q'] },
        { text: 'Terfi aynı zamanda şah veya mat da olabilir: f8’e terfi eden vezir siyah şaha mat eder.', fen: '7k/5P2/6K1/8/8/8/8/8 w - - 0 1', demo: ['f7f8q'] },
        { text: '<b>Az terfi</b> örneği: f8’e at olarak terfi eden piyon hem h7’deki şaha şah çeker hem de d7’deki vezire saldırır.', fen: '8/3q1P1k/8/8/8/8/1P6/K7 w - - 0 1', demo: ['f7f8n'] }
      ],
      exercises: [
        { id: 'ot1', type: 'puzzle', title: 'Vezir al', category: 'ozel', prompt: 'Piyonunu ilerlet ve vezire terfi ettir.', task: true, fen: '8/4P3/8/8/8/k7/8/4K3 w - - 0 1', line: ['e7e8q'], wrong: { e7e8r: 'Kale de iyi ama burada en güçlü seçim vezir.', e7e8b: 'Burada en güçlü seçim vezir.', e7e8n: 'Burada en güçlü seçim vezir.' }, explain: 'e8=V: tahtada yeni bir vezir.' },
        { id: 'ot2', type: 'mate', n: 1, title: 'Terfiyle mat', category: 'ozel', prompt: 'Terfi ederek tek hamlede mat et.', fen: '7k/5P2/6K1/8/8/8/8/8 w - - 0 1', hint: 'f8’e terfi eden taş 8. sırayı tutar; g7 ve h7’yi şahın tutuyor.', explain: 'f8=V# (f8=K# da mat eder).' },
        { id: 'ot3', type: 'puzzle', title: 'Ata terfi', category: 'ozel', prompt: 'Terfi et ve siyah veziri kazan. Hangi taşı seçmelisin?', fen: '8/3q1P1k/8/8/8/8/1P6/K7 w - - 0 1', line: ['f7f8n', 'h7g8', 'f8d7'], wrong: { f7f8q: 'Vezir şah çekmiyor; siyah vezir oyunda kalır. Şah çekerek vezire saldıran taşı düşün.', f7f8r: 'Kale şah çekmiyor. Hem şaha hem vezire saldıracak taşı seç.', f7f8b: 'Fil şah çekmiyor. f8’den h7 ve d7’ye birlikte kim saldırabilir?' }, hint: 'f8’den hem h7’ye hem d7’ye saldırabilen taş hangisi?', explain: 'f8=A+ çatalı: şah kaçtı, at d7’deki veziri aldı.' },
        { id: 'ot4', type: 'quiz', title: 'Olmaz!', category: 'ozel', prompt: 'Terfi eden piyon hangisine dönüşemez?', options: ['Vezir', 'At', 'Şah', 'Fil'], answer: 2, explain: 'Her oyuncunun tek bir şahı olur; piyon şaha dönüşemez.' }
      ]
    }
  ];

  root.SPECIAL = { topics: topics };
})(typeof window !== 'undefined' ? window : globalThis);
