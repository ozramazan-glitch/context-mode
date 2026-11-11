/*
 * Öğrenme yolu: 8 bölüm, en basitten en deneyimli oyuncu profiline doğru.
 *
 * Alıştırma türleri:
 *  coord   : verilen koordinatlara sırayla tıkla
 *  pick    : doğru kareyi seç (tek tıklama)
 *  squares : birden fazla kareyi işaretle, sonra kontrol et
 *  stars   : tek taşla tüm yıldızları topla (siyah taşlar hareket etmez)
 *  quiz    : çoktan seçmeli soru (isteğe bağlı tahta)
 *  puzzle  : sabit çözüm dizisi (beyaz hamlesi, siyah cevabı, ...)
 *  mate    : n hamlede mat (mat eden her doğru çözüm kabul edilir)
 *  endgame : bilgisayara karşı oyunsonu, hamle sınırı içinde mat et
 *  kpk     : Şah+Piyon–Şah; bilgisayar kusursuz savunur, piyonu terfi ettir
 *  game    : bilgisayara karşı tam oyun
 *
 * Tüm konumlar ve çözümler tests/content.test.mjs ile motorla doğrulanır.
 */
(function (root) {
  'use strict';

  var EMPTY = '8/8/8/8/8/8/8/8 w - - 0 1';
  var START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

  var CATEGORIES = {
    tahta: 'Tahta ve Kurallar',
    hareket: 'Taş Hareketi',
    taktik: 'Taktik',
    mat: 'Mat Kalıpları',
    oyunsonu: 'Oyunsonu',
    strateji: 'Strateji',
    ozel: 'Özel Hamleler'
  };

  var sections = [
    // ------------------------------------------------------------------
    {
      id: 's1', no: 1, title: 'Tahtayı Tanı', profile: 'Sıfırdan Başlayan', rating: 400,
      summary: 'Tahta, kareler, koordinatlar ve taşların başlangıç dizilişi.',
      lessons: [
        {
          id: 's1l1', title: 'Satranç tahtası', cards: [
            { text: 'Satranç, <b>8 × 8 = 64</b> kareli bir tahtada iki kişiyle oynanır. Kareler sırayla açık ve koyu renklidir. Bir oyuncu açık renkli (<b>beyaz</b>), diğeri koyu renkli (<b>siyah</b>) taşlarla oynar.', fen: EMPTY },
            { text: 'Tahta doğru yerleştirildiğinde her oyuncunun <b>sağ alt köşesinde açık renkli bir kare</b> bulunur. Beyaz için bu kare h1, siyah için a8’dir.', fen: EMPTY, marks: ['h1', 'a8'] },
            { text: 'Tahtadaki dikey hatlara <b>sütun</b> denir ve soldan sağa <b>a’dan h’ye</b> harflerle adlandırılır. Yatay hatlara <b>sıra</b> denir ve <b>1’den 8’e</b> numaralanır. İşaretli olanlar e sütunu ve 4. sıradır.', fen: EMPTY, marks: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'a4', 'b4', 'c4', 'd4', 'f4', 'g4', 'h4'] },
            { text: 'Aynı renkteki karelerin köşe köşe birleştiği eğik hatlara <b>çapraz</b> denir. İşaretli olan, a1’den h8’e uzanan uzun çaprazdır.', fen: EMPTY, marks: ['a1', 'b2', 'c3', 'd4', 'e5', 'f6', 'g7', 'h8'] }
          ]
        },
        {
          id: 's1l2', title: 'Koordinatlar ve notasyon', cards: [
            { text: 'Her karenin bir adı (<b>koordinatı</b>) vardır: önce sütun harfi, sonra sıra rakamı yazılır. İşaretli kare <b>e4</b>’tür: e sütunu ile 4. sıranın kesiştiği yer.', fen: EMPTY, marks: ['e4'] },
            { text: 'Oynanan hamlelerin bu adlarla yazılmasına <b>notasyon</b> denir. Taşlar Türkçe baş harfleriyle gösterilir: <b>Ş</b> şah, <b>V</b> vezir, <b>K</b> kale, <b>F</b> fil, <b>A</b> at. Piyon için harf yazılmaz. Örneğin <b>Af3</b>, “at f3 karesine gitti” demektir.', fen: START, demo: ['e2e4', 'e7e5', 'g1f3'] },
            { text: 'Notasyondaki işaretler: <b>x</b> taş alındı, <b>+</b> şah çekildi, <b>#</b> mat oldu, <b>O-O</b> kısa rok, <b>O-O-O</b> uzun rok. Bu kavramların her biri ileriki derslerde ayrıca anlatılır.', fen: START }
          ]
        },
        {
          id: 's1l3', title: 'Taşlar ve başlangıç dizilişi', cards: [
            { text: 'Her oyuncunun 16 taşı vardır: <b>1 şah, 1 vezir, 2 kale, 2 fil, 2 at ve 8 piyon</b>. Oyunun amacı rakibin şahını <b>mat</b> etmektir (şaha kaçamayacağı bir saldırı yapmak; 3. bölümde ayrıntılı).', fen: START },
            { text: 'Kaleler köşelere, atlar kalelerin yanına, filler de atların yanına dizilir.', fen: START, marks: ['a1', 'h1', 'b1', 'g1', 'c1', 'f1', 'a8', 'h8', 'b8', 'g8', 'c8', 'f8'] },
            { text: 'Vezir <b>kendi rengindeki kareye</b> konur: beyaz vezir açık renkli d1’e, siyah vezir koyu renkli d8’e. Şah yanındaki kalan kareye (e1 ve e8) yerleşir.', fen: START, marks: ['d1', 'd8', 'e1', 'e8'] },
            { text: 'Piyonlar en öne dizilir: beyazlar 2. sırada, siyahlar 7. sırada. Oyuna her zaman <b>beyaz başlar</b>; sonra oyuncular sırayla birer hamle yapar. Bir hamlede yalnızca bir taş oynanır (rok dışında).', fen: START, marks: ['a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2'] }
          ]
        }
      ],
      exercises: [
        { id: 's1e1', type: 'coord', title: 'Kareyi bul', category: 'tahta', prompt: 'İstenen kareye tıkla. Önce sütun harfini (alt kenar), sonra sıra rakamını (sol kenar) bul.', targets: ['e4', 'a1', 'h8', 'd5', 'c7', 'g2'] },
        { id: 's1e2', type: 'quiz', title: 'Kare sayısı', category: 'tahta', prompt: 'Satranç tahtasında kaç kare vardır?', options: ['32', '48', '64', '81'], answer: 2, explain: '8 sütun × 8 sıra = 64 kare.' },
        { id: 's1e3', type: 'quiz', title: 'Doğru yerleştirme', category: 'tahta', prompt: 'Tahta doğru yerleştirildiğinde her oyuncunun sağ alt köşesindeki kare hangi renktir?', options: ['Açık renk', 'Koyu renk', 'Fark etmez'], answer: 0, explain: 'Akılda kalıcı kural: “Sağ alt köşe açık renk.” Beyaz için h1, siyah için a8.' },
        { id: 's1e4', type: 'pick', title: 'Beyaz vezir nerede?', category: 'tahta', prompt: 'Beyaz vezirin başlangıç karesine tıkla.', fen: START, answer: ['d1'], explain: 'Beyaz vezir kendi rengindeki açık kare olan d1’de başlar.' },
        { id: 's1e5', type: 'pick', title: 'Siyah şah nerede?', category: 'tahta', prompt: 'Siyah şahın başlangıç karesine tıkla.', fen: START, answer: ['e8'], explain: 'Siyah vezir d8’de (koyu kare), şah hemen yanında e8’dedir.' },
        { id: 's1e6', type: 'squares', title: 'Atların yeri', category: 'tahta', prompt: 'Dört atın başlangıç karelerini işaretle, sonra “Kontrol et”e bas.', fen: START, answer: ['b1', 'g1', 'b8', 'g8'], explain: 'Atlar kalelerin hemen yanında başlar: b1, g1, b8 ve g8.' },
        { id: 's1e7', type: 'quiz', title: 'İlk hamle', category: 'tahta', prompt: 'Oyuna hangi renk başlar?', options: ['Beyaz', 'Siyah', 'Oyuncular anlaşır'], answer: 0, explain: 'Kuralı basit: ilk hamleyi her zaman beyaz yapar.' }
      ]
    },
    // ------------------------------------------------------------------
    {
      id: 's2', no: 2, title: 'Taşlar Nasıl Hareket Eder', profile: 'Kuralları Öğrenen', rating: 550,
      summary: 'Kale, fil, vezir, şah, at ve piyonun hareketleri.',
      lessons: [
        {
          id: 's2l1', title: 'Kale', cards: [
            { text: '<b>Kale</b> yatay ve dikey hatlarda istediği kadar ilerler. İşaretli kareler d4’teki kalenin gidebileceği yerlerdir.', fen: '8/8/8/8/3R4/8/8/8 w - - 0 1', showMoves: 'd4' },
            { text: 'Kale başka bir taşın üzerinden atlayamaz. Kendi taşının bulunduğu kareye gidemez; rakip taşı ise alabilir ama arkasına geçemez.', fen: '8/8/3P4/8/3R1n2/8/8/8 w - - 0 1', showMoves: 'd4' }
          ]
        },
        {
          id: 's2l2', title: 'Fil', cards: [
            { text: '<b>Fil</b> çaprazlarda istediği kadar ilerler.', fen: '8/8/8/8/3B4/8/8/8 w - - 0 1', showMoves: 'd4' },
            { text: 'Fil hep çapraz gittiği için oyun boyunca <b>aynı renk karelerde</b> kalır. Bu yüzden her oyuncunun bir açık kare fili, bir de koyu kare fili vardır.', fen: '8/8/8/8/8/8/8/2B2B2 w - - 0 1', marks: ['c1', 'f1'] }
          ]
        },
        {
          id: 's2l3', title: 'Vezir', cards: [
            { text: '<b>Vezir</b> kale ile filin hareketlerini birleştirir: yatay, dikey ve çapraz istediği kadar gider. En güçlü taştır.', fen: '8/8/8/8/3Q4/8/8/8 w - - 0 1', showMoves: 'd4' }
          ]
        },
        {
          id: 's2l4', title: 'Şah', cards: [
            { text: '<b>Şah</b> her yöne yalnızca <b>bir kare</b> gider.', fen: '8/8/8/8/3K4/8/8/8 w - - 0 1', showMoves: 'd4' },
            { text: 'Bir taş bir sonraki hamlesinde bir kareye gidip orada taş alabiliyorsa o kareyi <b>tehdit ediyor</b> (o kareye saldırıyor) demektir. Şah, rakibin tehdit ettiği karelere <b>giremez</b>. Burada siyah kale e sütununu tehdit ettiği için beyaz şah e3, e4 ve e5’e gidemez.', fen: '4r3/8/8/8/3K4/8/8/8 w - - 0 1', showMoves: 'd4' }
          ]
        },
        {
          id: 's2l5', title: 'At', cards: [
            { text: '<b>At</b> “L” harfi biçiminde gider: bir yöne iki kare, sonra yana bir kare.', fen: '8/8/8/8/3N4/8/8/8 w - - 0 1', showMoves: 'd4' },
            { text: 'At, diğer taşların <b>üzerinden atlayabilen</b> tek taştır. Ayrıca her hamlede kare rengi değiştirir: açık kareden koyu kareye, koyudan açığa.', fen: START, demo: ['g1f3', 'b8c6'] }
          ]
        },
        {
          id: 's2l6', title: 'Piyon', cards: [
            { text: '<b>Piyon</b> yalnızca <b>ileri</b> ve bir kare gider; geri gidemez. İlk hamlesinde isterse iki kare ilerleyebilir.', fen: '8/8/8/8/8/8/4P3/8 w - - 0 1', showMoves: 'e2' },
            { text: 'Piyon <b>taş alırken çapraz</b> ilerler: bir kare çapraz önündeki rakip taşı alır. Önü bir taşla kapalıysa ilerleyemez. Burada e4 piyonu önü kapalı olduğu için yalnızca d5’teki atı alabilir.', fen: '8/8/8/3np3/4P3/8/8/8 w - - 0 1', showMoves: 'e4' },
            { text: 'Piyonun üç özel kuralı vardır: ilk hamlede iki kare ilerleme, <b>geçerken alma</b> ve <b>terfi</b> (son sıraya ulaşan piyonun başka bir taşa dönüşmesi). Bunlar <b>Özel Hamleler Atölyesi</b>’nde ayrıntılı anlatılır.', fen: '8/4P3/8/8/8/8/8/8 w - - 0 1' }
          ]
        }
      ],
      exercises: [
        { id: 's2e1', type: 'stars', title: 'Kaleyle yıldızlar', category: 'hareket', prompt: 'Kaleyle tüm yıldızları topla. Ne kadar az hamle, o kadar çok yıldız puanı!', fen: '8/8/8/8/8/8/8/R7 w - - 0 1', piece: 'a1', stars: ['a6', 'f6', 'f2'] },
        { id: 's2e2', type: 'squares', title: 'Kalenin kareleri', category: 'hareket', prompt: 'd4’teki kalenin gidebileceği tüm kareleri işaretle. Kendi piyonunun üzerine gidemez; rakip atı alabilir ama arkasına geçemez.', fen: '8/8/3P4/8/3R1n2/8/8/8 w - - 0 1', from: 'd4' },
        { id: 's2e3', type: 'stars', title: 'Filin yolu', category: 'hareket', prompt: 'Fille dört yıldızı topla. Yıldızların hepsi koyu karelerde: fil kare rengini değiştiremez.', fen: '8/8/8/8/8/8/8/2B5 w - - 0 1', piece: 'c1', stars: ['e3', 'g5', 'd8', 'a5'] },
        { id: 's2e4', type: 'quiz', title: 'Fil ve renkler', category: 'hareket', prompt: 'Koyu karede başlayan bir fil açık renkli bir kareye hiç gidebilir mi?', options: ['Evet, iki hamlede', 'Hayır, hep aynı renk karelerde kalır', 'Yalnızca taş alırken'], answer: 1, explain: 'Fil yalnızca çapraz gider; çapraz hatlar tek renktir.' },
        { id: 's2e5', type: 'stars', title: 'Vezirin gücü', category: 'hareket', prompt: 'Vezirle yıldızları en az hamlede topla.', fen: '8/8/8/8/8/8/8/3Q4 w - - 0 1', piece: 'd1', stars: ['g4', 'g8', 'b3'] },
        { id: 's2e6', type: 'stars', title: 'Dikkatli şah', category: 'hareket', prompt: 'Şahla yıldızları topla. Siyah taşlar hareket etmez ama tehdit ettikleri karelere şah giremez.', fen: '8/8/8/3p4/4n3/8/8/4K3 w - - 0 1', piece: 'e1', stars: ['d3', 'f3', 'f4'] },
        { id: 's2e7', type: 'stars', title: 'Atın sıçrayışı', category: 'hareket', prompt: 'Atla “L” biçiminde sıçrayarak dört yıldızı topla.', fen: '8/8/8/8/8/8/8/1N6 w - - 0 1', piece: 'b1', stars: ['c3', 'e4', 'g5', 'h7'] },
        { id: 's2e8', type: 'squares', title: 'Atın kareleri', category: 'hareket', prompt: 'd4’teki atın gidebileceği tüm kareleri işaretle.', fen: '8/8/8/8/3N4/8/8/8 w - - 0 1', from: 'd4' },
        { id: 's2e9', type: 'stars', title: 'Piyonun yürüyüşü', category: 'hareket', prompt: 'Piyonla üç yıldızı topla. İpucu: ilk hamlede iki kare gidebilirsin; d5’teki siyah piyonu çapraz alabilirsin.', fen: '8/8/8/3p4/8/8/4P3/8 w - - 0 1', piece: 'e2', stars: ['e4', 'd5', 'd6'] },
        { id: 's2e10', type: 'quiz', title: 'Piyonla alma', category: 'hareket', prompt: 'Piyon taş alırken nasıl hareket eder?', options: ['Bir kare düz ileri', 'Bir kare çapraz ileri', 'Bir kare çapraz geri'], answer: 1, explain: 'Piyon düz ilerler ama çapraz alır.' }
      ]
    },
    // ------------------------------------------------------------------
    {
      id: 's3', no: 3, title: 'Alma, Şah, Mat ve Pat', profile: 'İlk Oyunlarını Oynayan', rating: 700,
      summary: 'Taş almak, şah çekmek, şahtan kurtulmak; mat ile patın farkı.',
      lessons: [
        {
          id: 's3l1', title: 'Taş alma', cards: [
            { text: 'Bir taş, rakip taşın bulunduğu kareye giderek onu <b>alır</b>; alınan taş tahtadan çıkar. Kendi taşını alamazsın. Burada beyaz kale d5’teki atı alabilir.', fen: '6k1/5pp1/7p/3n4/8/8/5PPP/3R2K1 w - - 0 1', arrows: [['d1', 'd5']] },
            { text: '<b>Şah asla alınmaz.</b> Şaha saldırıldığında buna “şah çekmek” denir ve saldırıya uğrayan taraf hemen kurtulmak zorundadır.', fen: '6k1/5pp1/7p/3n4/8/8/5PPP/3R2K1 w - - 0 1', demo: ['d1d5'] }
          ]
        },
        {
          id: 's3l2', title: 'Şah çekmek', cards: [
            { text: 'Rakip şaha saldıran hamleye <b>şah çekmek</b> denir. Burada siyah kale e sütunu boyunca beyaz şaha şah çekiyor.', fen: '7k/6pp/8/8/4r3/2N5/PP3PPP/4KB2 w - - 0 1', arrows: [['e4', 'e1']] },
            { text: 'Şahı şah altında olan oyuncu, sıradaki hamlesinde bu tehdidi <b>mutlaka</b> ortadan kaldırmalıdır. Kendi şahını tehdit altına sokan bir hamle de yapılamaz: böyle hamleler <b>kural dışıdır</b>.', fen: '7k/6pp/8/8/4r3/2N5/PP3PPP/4KB2 w - - 0 1' }
          ]
        },
        {
          id: 's3l3', title: 'Şahtan kurtulmanın üç yolu', cards: [
            { text: '1) <b>Kaçmak:</b> Şahı tehdit altında olmayan bir kareye götürmek.', fen: '7k/6pp/8/8/4r3/2N5/PP3PPP/4KB2 w - - 0 1', arrows: [['e1', 'd2']] },
            { text: '2) <b>Araya taş koymak:</b> Şah çeken taş ile şahın arasına bir taş koymak. Bu yalnızca uzaktan şah çeken kale, fil ve vezire karşı işe yarar; at ve piyon şahlarında araya taş konamaz.', fen: '7k/6pp/8/8/4r3/2N5/PP3PPP/4KB2 w - - 0 1', arrows: [['f1', 'e2']] },
            { text: '3) <b>Almak:</b> Şah çeken taşı almak. Burada c3’teki at e4’teki kaleyi alabilir.', fen: '7k/6pp/8/8/4r3/2N5/PP3PPP/4KB2 w - - 0 1', arrows: [['c3', 'e4']] }
          ]
        },
        {
          id: 's3l4', title: 'Mat', cards: [
            { text: 'Şah tehdit altındaysa ve üç kurtuluş yolundan hiçbiri yoksa buna <b>mat</b> denir. Mat olan oyunu kaybeder. Burada beyaz Ka8 oynayarak mat eder: siyah şahın önünü kendi piyonları kapatmıştır.', fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', demo: ['a1a8'] }
          ]
        },
        {
          id: 's3l5', title: 'Pat', cards: [
            { text: 'Sıra sendeyken şahın tehdit altında <b>değilse</b> ama yapabileceğin hiçbir kurallara uygun hamle yoksa buna <b>pat</b> denir. <b>Pat beraberliktir!</b> Burada sıra siyahta: siyah şah şah altında değil ama gidebileceği her kare tehdit ediliyor.', fen: '7k/5K2/6Q1/8/8/8/8/8 b - - 0 1', marks: ['g8', 'h7', 'g7'] },
            { text: 'Önde olan taraf pat yaptırmamaya dikkat etmelidir. Aynı konumda vezir g7’ye gitseydi (ve şahı tarafından korunsaydı) bu kez şah çekilmiş ve <b>mat</b> olmuş olurdu.', fen: '7k/5KQ1/8/8/8/8/8/8 b - - 0 1' }
          ]
        }
      ],
      exercises: [
        { id: 's3e1', type: 'puzzle', title: 'Korunmayan taşı al', category: 'tahta', prompt: 'Siyahın taşlarından biri korunmuyor. Onu al!', fen: '6k1/5pp1/7p/3n4/8/8/5PPP/3R2K1 w - - 0 1', line: ['d1d5'], hint: 'd sütununa bak.', explain: 'Kale d5’teki atı karşılıksız aldı: 3 puanlık kazanç.' },
        { id: 's3e2', type: 'puzzle', title: 'Alarak kurtul', category: 'tahta', prompt: 'Şah çekildi! Şah çeken taşı alarak kurtul.', fen: '7k/6pp/8/8/4r3/2N5/PP3PPP/4KB2 w - - 0 1', line: ['c3e4'], wrongDefault: 'Bu hamle de şahı kurtarır ama görev şah çeken taşı almaktı.', hint: 'c3’teki at hangi karelere sıçrayabilir?', explain: 'At kaleyi aldı: hem şahtan kurtuldun hem de bir kale kazandın.' },
        { id: 's3e3', type: 'puzzle', title: 'Araya gir', category: 'tahta', prompt: 'Siyah kale 1. sırada şah çekiyor. Araya bir taş koyarak kurtul.', fen: '7k/6pp/8/8/2B5/7P/3N1PP1/4r1K1 w - - 0 1', task: true, line: ['d2f1'], accept: { 0: ['d2f1', 'c4f1'] }, wrongDefault: 'Bu hamle de kurtarır ama görev araya taş koymaktı.', hint: 'Kale ile şah arasında tek bir boş kare var: f1.', explain: 'f1’e giren taş şahın önünü kapattı.' },
        { id: 's3e4', type: 'mate', n: 1, title: 'İlk matın', category: 'mat', prompt: 'Tek hamlede mat et.', fen: '6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1', hint: 'Siyah şahın önü kendi piyonlarıyla kapalı. Son sıraya bak.', explain: 'Ka8#: siyah şahın kaçacak karesi yok, araya giren de alan da yok.' },
        { id: 's3e5', type: 'mate', n: 1, title: 'Vezir ve şah', category: 'mat', prompt: 'Tek hamlede mat et. Vezirini şahın korusun.', fen: '6k1/3Q4/5K2/8/8/8/8/8 w - - 0 1', hint: 'Vezir siyah şahın hemen yanına gidebilir mi? Kim korur?', explain: 'Vg7#: vezir şahın yanına girdi; beyaz şah onu koruduğu için alınamıyor.' },
        { id: 's3e6', type: 'mate', n: 1, title: 'Kaleyle kenar matı', category: 'mat', prompt: 'Tek hamlede mat et.', fen: '7k/8/6K1/8/8/8/8/R7 w - - 0 1', hint: 'Beyaz şah g7 ve h7’yi tutuyor. Kalenin işi 8. sıra.', explain: 'Ka8#: kale 8. sırayı, şah 7. sıradaki kaçış karelerini kapatıyor.' },
        { id: 's3e7', type: 'quiz', title: 'Bu ne?', category: 'tahta', prompt: 'Sıra siyahta. Bu konumun adı nedir?', fen: '7k/5K2/6Q1/8/8/8/8/8 b - - 0 1', options: ['Mat', 'Pat', 'Şah', 'Hiçbiri, oyun sürüyor'], answer: 1, verify: { status: 'stalemate' }, explain: 'Siyah şah tehdit altında değil ama gidebileceği bir kare yok: pat, yani beraberlik.' },
        { id: 's3e8', type: 'quiz', title: 'Peki bu?', category: 'tahta', prompt: 'Sıra siyahta. Bu konumun adı nedir?', fen: '7k/5KQ1/8/8/8/8/8/8 b - - 0 1', options: ['Mat', 'Pat', 'Şah', 'Hiçbiri, oyun sürüyor'], answer: 0, verify: { status: 'checkmate' }, explain: 'Vezir şah çekiyor, beyaz şah veziri koruyor ve kaçış karesi yok: mat.' }
      ]
    },
    // ------------------------------------------------------------------
    {
      id: 's4', no: 4, title: 'Taş Değerleri ve Temel Strateji', profile: 'Hobi Oyuncusu', rating: 850,
      summary: 'Taşların puanları, iyi ve kötü değişimler, açılışın ilkeleri.',
      lessons: [
        {
          id: 's4l1', title: 'Taşların değeri', cards: [
            { text: 'Taşları karşılaştırmak için yaklaşık puanlar kullanılır: <b>Piyon 1, At 3, Fil 3, Kale 5, Vezir 9</b>. Şahın puanı yoktur, çünkü şah kaybedilemez.', fen: '8/8/8/8/8/8/8/8 w - - 0 1' },
            { text: 'Bu puanlar kesin kural değil, karar vermeyi kolaylaştıran bir ölçüdür. Konuma göre aktif bir at, hareketsiz bir kaleden daha faydalı olabilir.', fen: '8/8/8/3N4/8/8/8/R7 w - - 0 1' }
          ]
        },
        {
          id: 's4l2', title: 'Değişim, korunan ve asılı taşlar', cards: [
            { text: 'Bir kareye kendi tarafından başka bir taş da saldırıyorsa oradaki taş <b>korunuyor</b> demektir. Korunmayan, alınmaya açık taşa <b>asılı taş</b> denir.', fen: '6k1/5ppp/4p3/3nb3/8/5N2/5PPP/3R2K1 w - - 0 1', marks: ['d5', 'e5'] },
            { text: 'Taş alıp karşılığında kendi taşını kaybetmeye <b>değişim</b> denir. İyi değişim, verdiğinden daha değerlisini almaktır. Burada d5’teki at e6 piyonuyla korunuyor: Kxd5 exd5 olursa 5 puanlık kale 3 puanlık ata verilmiş olur.', fen: '6k1/5ppp/4p3/3nb3/8/5N2/5PPP/3R2K1 w - - 0 1', arrows: [['d1', 'd5'], ['e6', 'd5']] }
          ]
        },
        {
          id: 's4l3', title: 'Açılışın üç ilkesi', cards: [
            { text: '1) <b>Merkezi kontrol et.</b> d4, e4, d5 ve e5 kareleri tahtanın merkezidir; buradaki taşlar her yöne kolayca ulaşır.', fen: START, marks: ['d4', 'e4', 'd5', 'e5'] },
            { text: '2) <b>Taşlarını geliştir.</b> Atları ve filleri erkenden başlangıç karelerinden çıkarıp oyuna sokmaya <b>gelişim</b> denir. 3) <b>Şahını güvenceye al:</b> genellikle rok yaparak (Özel Hamleler Atölyesi’ne bak).', fen: START, demo: ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'e1g1'] },
            { text: 'Açılışta kaçınılacaklar: aynı taşı boş yere iki kez oynamak, veziri çok erken çıkarmak (rakip taşlar ona saldırarak gelişir) ve kenar piyonlarıyla zaman kaybetmek.', fen: 'rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2' }
          ]
        },
        {
          id: 's4l4', title: 'Her hamleden önce', cards: [
            { text: 'Basit bir kontrol listesi: <b>1)</b> Rakibimin son hamlesi neyi tehdit ediyor? <b>2)</b> Asılı taşım var mı? <b>3)</b> Şah çeken, taş alan ya da tehdit yaratan bir hamlem var mı? <b>4)</b> En kötü durumdaki taşımı nasıl iyileştiririm?', fen: START }
          ]
        }
      ],
      exercises: [
        { id: 's4e1', type: 'quiz', title: 'Hangisi değerli?', category: 'strateji', prompt: 'Puan hesabına göre hangisi daha değerlidir?', options: ['Bir vezir (9)', 'Bir kale ve bir fil (5 + 3 = 8)', 'Eşittirler'], answer: 0, explain: '9 puan, 8 puandan fazladır. Yine de bu yalnızca kaba bir ölçüdür.' },
        { id: 's4e2', type: 'quiz', title: 'İyi değişim mi?', category: 'strateji', prompt: 'Atını verip karşılığında rakibin kalesini almak puan hesabına göre nasıl bir değişimdir?', options: ['Kârlı: 3 verip 5 alırsın', 'Zararlı: 5 verip 3 alırsın', 'Eşit'], answer: 0, explain: 'At 3, kale 5 puandır; 2 puan kârdasın.' },
        { id: 's4e3', type: 'puzzle', title: 'Doğru almayı seç', category: 'strateji', prompt: 'İki siyah taşı alabilirsin. Hangisi gerçekten kazandırır?', fen: '6k1/5ppp/4p3/3nb3/8/5N2/5PPP/3R2K1 w - - 0 1', line: ['f3e5'], wrong: { d1d5: 'd5’teki at e6 piyonuyla korunuyor: Kxd5 exd5 ile 5 puanlık kaleni 3 puanlık ata vermiş olursun.' }, hint: 'Hangi siyah taş korunmuyor?', explain: 'e5’teki fil korunmuyordu: Axe5 ile karşılıksız 3 puan.' },
        { id: 's4e4', type: 'squares', title: 'Merkez kareler', category: 'strateji', prompt: 'Tahtanın merkezindeki dört kareyi işaretle.', fen: EMPTY, answer: ['d4', 'e4', 'd5', 'e5'], explain: 'd4, e4, d5, e5: açılışta bu kareleri kontrol etmek taşlarına hareket alanı sağlar.' },
        { id: 's4e5', type: 'quiz', title: 'Açılış seçimi', category: 'strateji', prompt: '1.e4 e5 oynandı. Açılış ilkelerine en uygun hamle hangisi?', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', options: ['Af3', 'h4', 'Şe2', 'Vh5'], answer: 0, explain: 'Af3 bir taşı geliştirir, merkezdeki e5 piyonuna saldırır ve kısa roka hazırlar. Vh5 veziri erken çıkarır, Şe2 rok hakkını kaybettirir, h4 zaman kaybıdır.' },
        { id: 's4e6', type: 'quiz', title: 'Rokun amacı', category: 'strateji', prompt: 'Açılışta rok yapmanın temel amacı nedir?', options: ['Şahı güvenli bir köşeye almak ve kaleyi oyuna sokmak', 'Bir piyon kazanmak', 'Rakibe şah çekmek'], answer: 0, explain: 'Rok tek hamlede iki iş yapar: şahı merkezden uzaklaştırır, kaleyi merkeze yaklaştırır.' }
      ]
    },
    // ------------------------------------------------------------------
    {
      id: 's5', no: 5, title: 'Taktikler', profile: 'Gelişen Kulüp Oyuncusu', rating: 1100,
      summary: 'Çatal, açmaz, şiş ve açarak saldırı.',
      lessons: [
        {
          id: 's5l1', title: 'Taktik nedir?', cards: [
            { text: '<b>Taktik</b>, birkaç hamlelik zorlayıcı bir hamle dizisiyle taş ya da mat kazanmaktır. Taktik ararken önce <b>zorlayıcı hamlelere</b> bak: şah çeken hamleler, taş alan hamleler ve yeni bir tehdit yaratan hamleler. Bunlar rakibin seçeneklerini daraltır.', fen: '2q3k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1' }
          ]
        },
        {
          id: 's5l2', title: 'Çatal', cards: [
            { text: 'Bir taşın aynı anda iki ya da daha fazla rakip taşa saldırmasına <b>çatal</b> denir. Rakip tek hamlede hepsini kurtaramaz. Burada at e7’ye giderek hem şaha hem de c8’deki vezire saldırır.', fen: '2q3k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1', demo: ['d5e7'], arrows: [['e7', 'g8'], ['e7', 'c8']] },
            { text: 'Piyonlar da çatal yapabilir. d5 piyonu aynı anda c6 ve e6’ya saldırır.', fen: '6k1/5ppp/2n1n3/8/3P4/8/5PPP/6K1 w - - 0 1', demo: ['d4d5'] }
          ]
        },
        {
          id: 's5l3', title: 'Açmaz', cards: [
            { text: 'Bir taş, kaçarsa arkasındaki daha değerli taş alınacağı için hareket edemiyorsa ona <b>açmazdaki taş</b> denir. Arkadaki taş şahsa buna <b>mutlak açmaz</b> denir: o taş kurallara göre hiç oynayamaz, çünkü kendi şahını tehdit altına sokmak yasaktır.', fen: '4k3/5ppp/3p4/4n3/8/8/5PPP/4R1K1 w - - 0 1', arrows: [['e1', 'e8']] },
            { text: 'Açmazdaki taşa bir kez daha saldırmak çoğu zaman onu kazandırır. f4 ile piyon ata saldırır; at kaçamaz.', fen: '4k3/5ppp/3p4/4n3/8/8/5PPP/4R1K1 w - - 0 1', demo: ['f2f4'] }
          ]
        },
        {
          id: 's5l4', title: 'Şiş', cards: [
            { text: '<b>Şiş</b>, açmazın tersidir: değerli taş öndedir; o kaçmak zorunda kalınca arkasındaki taş alınır. Genellikle kale, fil veya vezirle şah çekerek yapılır.', fen: '8/3k3q/5pp1/8/8/8/5PPP/R5K1 w - - 0 1', demo: ['a1a7', 'd7e6', 'a7h7'] }
          ]
        },
        {
          id: 's5l5', title: 'Açarak saldırı', cards: [
            { text: 'Bir taş çekilince arkasındaki taşın saldırı hattı açılır. Buna <b>açarak saldırı</b> denir. Çekilen taş da bir tehdit yaparsa rakip iki saldırıya birden cevap veremez.', fen: '3qk3/pp4p1/6N1/8/8/3B4/PP3PPP/3R2K1 w - - 0 1', arrows: [['d1', 'd8'], ['d3', 'b5']] },
            { text: 'Çekilen taş şah çekiyorsa rakip önce şahını kurtarmak zorundadır; bu sırada açılan hattaki taş alınır. Açılan saldırının kendisi şahsa buna <b>açarak şah</b>, hem çekilen hem de arkadaki taş aynı anda şah çekiyorsa <b>çifte şah</b> denir. Çifte şahtan yalnızca şahı oynatarak kurtulunur.', fen: '3qk3/pp4p1/6N1/8/8/3B4/PP3PPP/3R2K1 w - - 0 1', demo: ['d3b5'] }
          ]
        }
      ],
      exercises: [
        { id: 's5e1', type: 'puzzle', title: 'At çatalı', category: 'taktik', prompt: 'Siyah Vc1 ile mat tehdit ediyor! Önce davran: veziri kazan.', fen: '2q3k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1', line: ['d5e7', 'g8h8', 'e7c8'], hint: 'Bir at hamlesi hem şaha hem vezire saldırabilir.', explain: 'Ae7+ çatalı: siyah önce şahını kurtarmak zorunda, sonra Axc8 ile vezir alınır.' },
        { id: 's5e2', type: 'puzzle', title: 'Piyon çatalı', category: 'taktik', prompt: 'Bir piyon hamlesiyle iki ata birden saldır ve birini kazan.', fen: '6k1/5ppp/2n1n3/8/3P4/8/5PPP/6K1 w - - 0 1', line: ['d4d5', 'e6f4', 'd5c6'], hint: 'Piyon çapraz saldırır. Atların ortasındaki kareye bak.', explain: 'd5 piyonu c6 ve e6’ya aynı anda saldırdı; siyah ancak birini kurtarabildi.' },
        { id: 's5e3', type: 'puzzle', title: 'Açmazı kullan', category: 'taktik', prompt: 'e5’teki at şahının önünde açmazda. Ona bir kez daha saldır.', fen: '4k3/5ppp/3p4/4n3/8/8/5PPP/4R1K1 w - - 0 1', line: ['f2f4', 'e8d7', 'f4e5'], hint: 'Hangi piyonun ata saldırabilir?', explain: 'At kaçamadığı için f4 piyonu onu aldı. dxe5 ile siyah bir piyon geri alsa da sen 2 puan öndesin.' },
        { id: 's5e4', type: 'puzzle', title: 'Şiş', category: 'taktik', prompt: 'Şah çek ve arkadaki veziri kazan.', fen: '8/3k3q/5pp1/8/8/8/5PPP/R5K1 w - - 0 1', line: ['a1a7', 'd7e6', 'a7h7'], hint: '7. sırada siyah şah ile vezir aynı hatta.', explain: 'Ka7+ şiş: şah 7. sıradan çekilince kale h7’deki veziri aldı.' },
        { id: 's5e5', type: 'puzzle', title: 'Açarak saldırı', category: 'taktik', prompt: 'Filini şah çekerek oynat; d1’deki kalen veziri yakalasın.', fen: '3qk3/pp4p1/6N1/8/8/3B4/PP3PPP/3R2K1 w - - 0 1', line: ['d3b5', 'e8f7', 'd1d8'], alsoGood: { 2: ['b5c4', 'g6e5'] }, hint: 'Fil hangi karede siyah şaha şah çeker?', explain: 'Fb5+ ile d sütunu açıldı. Siyah şahını kurtarmak zorunda kaldı ve Kxd8 ile vezir alındı. Vd7 ile araya girseydi de vezir Kxd7 ile giderdi.' },
        { id: 's5e6', type: 'puzzle', title: 'Şahlı çatal', category: 'taktik', prompt: 'Atla aynı anda şaha ve kaleye saldır.', fen: 'r3k3/pp3ppp/8/1N6/8/8/5PPP/6K1 w - - 0 1', line: ['b5c7', 'e8d7', 'c7a8'], hint: 'c7 karesi hem e8’i hem a8’i görür.', explain: 'Ac7+ çatalı kaleyi kazandırdı.' },
        { id: 's5e7', type: 'quiz', title: 'Çifte şah', category: 'taktik', prompt: 'Çifte şahtan nasıl kurtulunur?', options: ['Yalnızca şahı oynatarak (şah bir taşı alarak da kaçabilir)', 'Araya taş koyarak', 'Şah çeken taşlardan birini başka bir taşla alarak'], answer: 0, explain: 'İki taş aynı anda şah çektiği için tek hamlede ikisini birden engellemenin tek yolu şahı kaçırmaktır.' }
      ]
    },
    // ------------------------------------------------------------------
    {
      id: 's6', no: 6, title: 'Mat Kalıpları', profile: 'Turnuva Adayı', rating: 1300,
      summary: 'Koridor, boğmaca, merdiven ve Arap matları; iki hamlede mat.',
      lessons: [
        {
          id: 's6l1', title: 'Koridor matı', cards: [
            { text: 'Rok yapmış şahın önündeki piyonlar kaçış karelerini kapatır. Bir kale ya da vezir son sıraya girip şah çekerse ve araya giren olmazsa mat olur. Buna <b>koridor matı</b> denir.', fen: '3r2k1/5ppp/8/8/8/8/5PPP/3RR1K1 w - - 0 1', demo: ['d1d8'] },
            { text: 'Korunmak için zamanı gelince şaha “hava” açmak (ör. h3 veya g3 ile kaçış karesi yaratmak) gerekir.', fen: '6k1/5pp1/7p/8/8/7P/5PP1/6K1 w - - 0 1', marks: ['h7', 'h2'] }
          ]
        },
        {
          id: 's6l2', title: 'Boğmaca matı', cards: [
            { text: 'Şah kendi taşlarıyla çevrili olduğu için kaçamaz ve at şah çekerek mat eder. Atın şahına araya taş konamaz. Buna <b>boğmaca matı</b> denir.', fen: '6rk/6pp/8/6N1/8/8/5PPP/6K1 w - - 0 1', demo: ['g5f7'] }
          ]
        },
        {
          id: 's6l3', title: 'İki kaleyle merdiven matı', cards: [
            { text: 'İki kale sırayla şah çekerek rakip şahı kenara iter: bir kale bir sırayı kapatırken diğeri bir sonraki sırada şah çeker. Merdiven basamakları gibi.', fen: '3k4/R7/8/8/8/8/8/1R4K1 w - - 0 1', demo: ['b1b8'] }
          ]
        },
        {
          id: 's6l4', title: 'Arap matı', cards: [
            { text: 'At ve kale birlikte çalışır: at hem kaleyi korur hem de şahın kaçış karesini tutar. Köşedeki şah mat olur. Bu kalıba <b>Arap matı</b> denir.', fen: '7k/R7/5N2/8/8/8/5PPP/6K1 w - - 0 1', demo: ['a7h7'] }
          ]
        },
        {
          id: 's6l5', title: 'İki hamlede mat', cards: [
            { text: 'İki hamlelik matlarda önce zorlayıcı hamleleri dene. Bir şah çekme hamlesi rakibin cevabını tek seçeneğe indirebilir. Daha büyük bir kazanç için bilerek taş vermeye <b>feda</b> denir.', fen: '3qr1k1/5ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 1', demo: ['e2e8', 'd8e8', 'e1e8'] }
          ]
        }
      ],
      exercises: [
        { id: 's6e1', type: 'mate', n: 1, title: 'Koridor matı', category: 'mat', prompt: 'Tek hamlede mat et.', fen: '3r2k1/5ppp/8/8/8/8/5PPP/3RR1K1 w - - 0 1', hint: 'Siyah kale 8. sırayı tek başına savunuyor.', explain: 'Kxd8#: siyah şahın önü kendi piyonlarıyla kapalı.' },
        { id: 's6e2', type: 'mate', n: 1, title: 'Boğmaca matı', category: 'mat', prompt: 'Tek hamlede mat et.', fen: '6rk/6pp/8/6N1/8/8/5PPP/6K1 w - - 0 1', hint: 'Şahın etrafındaki kareleri kendi taşları doldurmuş.', explain: 'Af7#: at şah çekiyor ve şah hiçbir yere kaçamıyor.' },
        { id: 's6e3', type: 'mate', n: 1, title: 'Merdiven', category: 'mat', prompt: 'Tek hamlede mat et.', fen: '3k4/R7/8/8/8/8/8/1R4K1 w - - 0 1', hint: 'a7’deki kale 7. sırayı kapatıyor.', explain: 'Kb8#: biri 7. sırayı, diğeri 8. sırayı tutuyor.' },
        { id: 's6e4', type: 'mate', n: 1, title: 'Arap matı', category: 'mat', prompt: 'Tek hamlede mat et.', fen: '7k/R7/5N2/8/8/8/5PPP/6K1 w - - 0 1', hint: 'Kale h7’ye girerse onu kim korur?', explain: 'Kh7#: f6’daki at hem kaleyi hem de g8’i koruyor.' },
        { id: 's6e5', type: 'mate', n: 2, title: 'Feda ve koridor', category: 'mat', prompt: 'İki hamlede mat et.', fen: '3qr1k1/5ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 1', hint: 'e sütunundaki gücün siyahınkinden fazla.', explain: 'Vxe8+ Vxe8 Kxe8#: vezir fedası savunanı uzaklaştırdı.' },
        { id: 's6e6', type: 'mate', n: 2, title: 'Vezir fedalı boğmaca', category: 'mat', prompt: 'İki hamlede mat et.', fen: 'r6k/6pp/7N/8/2Q5/8/5PPP/6K1 w - - 0 1', hint: 'Vezirini g8’e feda et; at g8’i koruyor.', explain: 'Vg8+ Kxg8 Af7#: kale kendi şahının son kaçış karesini kapattı.' }
      ]
    },
    // ------------------------------------------------------------------
    {
      id: 's7', no: 7, title: 'Oyunsonu', profile: 'Deneyimli Oyuncu', rating: 1500,
      summary: 'Vezir ve kaleyle mat tekniği, karşı karşıya durma, kare kuralı.',
      lessons: [
        {
          id: 's7l1', title: 'Oyunsonu nedir?', cards: [
            { text: 'Taşların çoğu değiştirildikten sonraki aşamaya <b>oyunsonu</b> denir. Burada şah saklanmak yerine savaşa katılan güçlü bir taş olur. Ana hedef çoğu zaman bir piyonu <b>terfi</b> ettirmektir (son sıraya ulaştırıp vezire çevirmek).', fen: '8/8/4k3/8/8/4K3/4P3/8 w - - 0 1' }
          ]
        },
        {
          id: 's7l2', title: 'Vezir ve şahla mat', cards: [
            { text: 'Veziri rakip şahtan bir at hamlesi uzaklıkta tutarak şahın alanını adım adım daralt (<b>kutu daraltma</b>). Şah kenara gelince kendi şahını yaklaştır ve mat et.', fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1', demo: ['d1d3', 'e5e6', 'e1e2', 'e6e5', 'e2e3'] },
            { text: '<b>Dikkat:</b> Rakip şahın hiç hamlesi kalmazsa ama şah altında değilse <b>pat</b> olur ve kazanılmış oyun beraberliğe döner. Mattan hemen önce rakip şahın en az bir karesi açık kalmalı.', fen: '7k/5K2/6Q1/8/8/8/8/8 b - - 0 1' }
          ]
        },
        {
          id: 's7l3', title: 'Kale ve şahla mat', cards: [
            { text: 'Kale bir “kutu” çizer: rakip şah bu kutunun dışına çıkamaz. Kendi şahını yaklaştır, kutuyu her fırsatta küçült. Kalen saldırı altına girerse onu hattan ayrılmadan uzağa çek.', fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', demo: ['a1a4', 'e5d5', 'e1e2'] }
          ]
        },
        {
          id: 's7l4', title: 'Karşı karşıya durma (opozisyon)', cards: [
            { text: 'İki şah aynı sütunda, aralarında tek kare kalacak şekilde karşı karşıya durduğunda, <b>hamle sırası kendisinde olmayan</b> taraf <b>opozisyonu</b> elinde tutar: diğer şah ya geri çekilmek ya da yana kaymak zorunda kalır.', fen: '8/8/8/3k4/8/3K4/3P4/8 b - - 0 1', marks: ['d3', 'd5'] },
            { text: 'Şah+piyon–şah oyunsonunda bu üstünlük çoğu zaman kazanmakla berabere kalmak arasındaki farktır. Bu konumda beyaz için kazandıran tek hamle Şd3’tür: opozisyonu alır.', fen: '8/8/8/3k4/8/8/3PK3/8 w - - 0 1', arrows: [['e2', 'd3']] }
          ]
        },
        {
          id: 's7l5', title: 'Kilit kareler', cards: [
            { text: 'Kale piyonu (a veya h sütunu) dışındaki bir piyonun iki sıra önündeki üç kareye <b>kilit kareler</b> denir. e4 piyonu için bunlar d6, e6 ve f6’dır. Beyaz şah piyonu tehlikeye atmadan bu karelerden birine ulaşırsa, sıra kimde olursa olsun kazanır.', fen: '8/8/8/8/4P3/8/8/8 w - - 0 1', marks: ['d6', 'e6', 'f6'] }
          ]
        },
        {
          id: 's7l6', title: 'Kare kuralı', cards: [
            { text: 'Rakip şah, kaçan piyonu yakalayabilir mi? Piyondan terfi karesine kadar olan uzaklığı kenar alarak bir kare çiz. Rakip şah (kendi hamle sırası gelince) bu karenin içine adım atabiliyorsa piyonu yakalar. Burada b4 piyonunun karesi b4–b8–f8–f4’tür.', fen: '8/8/8/8/1P6/8/8/8 w - - 0 1', marks: ['b4', 'c4', 'd4', 'e4', 'f4', 'b5', 'c5', 'd5', 'e5', 'f5', 'b6', 'c6', 'd6', 'e6', 'f6', 'b7', 'c7', 'd7', 'e7', 'f7', 'b8', 'c8', 'd8', 'e8', 'f8'] },
            { text: 'Sıra beyazdaysa piyon önce bir kare ilerler ve kare küçülür (b5–b8–e8–e5). Bu yüzden kareyi hep <b>sıra rakipteyken</b> düşün.', fen: '8/8/8/8/1P6/8/8/8 w - - 0 1', demo: ['b4b5'] }
          ]
        }
      ],
      exercises: [
        { id: 's7e1', type: 'endgame', title: 'Vezirle mat', category: 'oyunsonu', prompt: 'Bilgisayar siyah şahla savunuyor. 20 hamle içinde mat et ve pat yaptırma!', fen: '8/8/8/4k3/8/8/8/3QK3 w - - 0 1', maxMoves: 20, hint: 'Veziri siyah şahtan bir at hamlesi uzağa koy ve onu kenara it.' },
        { id: 's7e2', type: 'endgame', title: 'Kaleyle mat', category: 'oyunsonu', prompt: 'Bilgisayar savunuyor. 30 hamle içinde kale ve şahla mat et.', fen: '8/8/8/4k3/8/8/8/R3K3 w - - 0 1', maxMoves: 30, hint: 'Kaleyle bir kutu çiz, şahını yaklaştır, kutuyu küçült.' },
        { id: 's7e3', type: 'puzzle', title: 'Opozisyonu al', category: 'oyunsonu', prompt: 'Beyaz oynar ve kazanır. Kazandıran tek hamleyi bul.', fen: '8/8/8/3k4/8/8/3PK3/8 w - - 0 1', line: ['e2d3'], verify: { kpkOnly: true }, wrongDefault: 'Bu hamleden sonra siyah opozisyonu alıp beraberliği zorlar.', hint: 'Şahını siyah şahın tam karşısına getir.', explain: 'Şd3 ile şahlar karşı karşıya geldi ve hamle sırası siyahta: siyah şah yol vermek zorunda.' },
        { id: 's7e4', type: 'kpk', title: 'Piyonu terfi ettir', category: 'oyunsonu', prompt: 'Bilgisayar kusursuz savunuyor. Piyonunu terfi ettir. Beraberliğe izin veren her hamlede uyarılırsın.', fen: '8/8/4k3/8/8/4K3/4P3/8 w - - 0 1', hint: 'Önce şahınla ilerle; piyon arkadan gelsin.' },
        { id: 's7e5', type: 'quiz', title: 'Kare kuralı', category: 'oyunsonu', prompt: 'Sıra siyahta. Siyah şah b4 piyonunu yakalayabilir mi? (Beyaz şah çok uzakta.)', fen: '8/8/8/6k1/1P6/8/8/7K b - - 0 1', options: ['Evet', 'Hayır'], answer: 0, verify: { kpkWin: false }, explain: 'Piyonun karesi b4–b8–f8–f4. Siyah şah g5’ten f5’e (veya f6’ya) adım atarak kareye girer ve piyonu yakalar.' },
        { id: 's7e6', type: 'quiz', title: 'Kare kuralı (2)', category: 'oyunsonu', prompt: 'Aynı konum ama sıra beyazda. Siyah şah yine yetişebilir mi?', fen: '8/8/8/6k1/1P6/8/8/7K w - - 0 1', options: ['Evet', 'Hayır'], answer: 1, verify: { kpkWin: true }, explain: 'b5 sonrası kare b5–b8–e8–e5’e küçülür. g5’teki şah bir hamlede bu kareye giremez; piyon terfi eder.' },
        { id: 's7e7', type: 'quiz', title: 'En büyük tehlike', category: 'oyunsonu', prompt: 'Vezir ve şahla yalnız şaha karşı oynarken en sık yapılan hata nedir?', options: ['Pat yaptırmak', 'Şaha şah çekmemek', 'Piyon kaybetmek'], answer: 0, explain: 'Rakip şahın tüm karelerini kapatıp şah çekmezsen pat olur ve oyun berabere biter.' }
      ]
    },
    // ------------------------------------------------------------------
    {
      id: 's8', no: 8, title: 'Usta Sınavı', profile: 'Usta Adayı', rating: 1700,
      summary: 'Kombinasyonlar, hesaplama ve bilgisayara karşı tam oyun.',
      lessons: [
        {
          id: 's8l1', title: 'Kombinasyon', cards: [
            { text: 'Birden fazla taktiğin birleştiği, çoğu zaman bir <b>feda</b>yla başlayan zorlayıcı hamle dizisine <b>kombinasyon</b> denir. Örnek: kale fedası şahı çatal karesine çeker, ardından at çatalı veziri kazanır.', fen: '3q2k1/pp3pp1/8/6N1/8/8/5PP1/6KR w - - 0 1', demo: ['h1h8', 'g8h8', 'g5f7', 'h8g8', 'f7d8'] }
          ]
        },
        {
          id: 's8l2', title: 'Aday hamleler ve hesap', cards: [
            { text: 'Karmaşık konumlarda önce 3–4 <b>aday hamle</b> (ciddi biçimde düşünmeye değer hamleler) belirle. Her biri için rakibin <b>en iyi</b> cevabını düşün, en kötüsünü değil. Sırayla bak: şah çeken hamleler, taş alan hamleler, tehditler.', fen: 'rq5k/4N1pp/8/7Q/8/5R2/5PPP/6K1 w - - 0 1' }
          ]
        },
        {
          id: 's8l3', title: 'Konumsal değerlendirme', cards: [
            { text: 'Taktik yoksa konumu değerlendir: <b>taş aktivitesi</b> (en kötü taşını iyileştir), <b>şah güvenliği</b> ve <b>açık hatlar</b> (üzerinde piyon olmayan, kalelerin sevdiği sütunlar).', fen: START },
            { text: '<b>Piyon yapısı:</b> Aynı sütunda iki piyona <b>çift piyon</b>, komşu sütunlarında kendi piyonu olmayan piyona <b>izole piyon</b>, komşu piyonların gerisinde kalıp korunamayan piyona <b>geri kalmış piyon</b> denir. Bunlar genellikle zayıflıktır.', fen: '8/p4p1p/2p1p3/3p4/8/2P2P2/P1P2P1P/8 w - - 0 1' }
          ]
        }
      ],
      exercises: [
        { id: 's8e1', type: 'mate', n: 2, title: 'Anastasia’ya selam', category: 'mat', prompt: 'İki hamlede mat et.', fen: 'rq5k/4N1pp/8/7Q/8/5R2/5PPP/6K1 w - - 0 1', hint: 'e7’deki at g8 ve g6’yı tutuyor. h7 piyonu tek savunucu.', explain: 'Vxh7+ Şxh7 Kh3#: vezir fedası h sütununu açtı.' },
        { id: 's8e2', type: 'puzzle', title: 'Çekme ve çatal', category: 'taktik', prompt: 'Siyah g5’teki atına saldırıyor. Bir fedayla veziri kazan.', fen: '3q2k1/pp3pp1/8/6N1/8/8/5PP1/6KR w - - 0 1', line: ['h1h8', 'g8h8', 'g5f7', 'h8g8', 'f7d8'], hint: 'Siyah şahı h8’e çekersen hangi çatal mümkün olur?', explain: 'Kh8+ Şxh8 Axf7+ ve Axd8: kale fedası şahı çatal karesine çekti.' },
        { id: 's8e3', type: 'kpk', title: 'Opozisyon ve kilit kareler', category: 'oyunsonu', prompt: 'Bilgisayar kusursuz savunuyor. İlk hamlede opozisyonu al ve piyonu terfi ettir.', fen: '8/8/8/3k4/8/8/3PK3/8 w - - 0 1', hint: 'İlk hamle Şd3. Sonra şahınla kilit karelere ulaşmaya çalış.' },
        { id: 's8e4', type: 'game', title: 'Final: bilgisayarı yen', category: 'strateji', prompt: 'Orta seviyedeki bilgisayara karşı beyazla oyna ve kazan. Öğrendiğin her şeyi kullan.', level: 'orta' }
      ]
    }
  ];

  root.CURRICULUM = { sections: sections, categories: CATEGORIES, EMPTY: EMPTY, START: START };
})(typeof window !== 'undefined' ? window : globalThis);
