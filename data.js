/* Wien Bələdçi — static data (places, plan, phrases, info). */
const CAT = {
  tarix:{az:"Tarix",c:"#d9a54a"}, muzey:{az:"Muzey",c:"#a98bd6"}, kilse:{az:"Kilsə",c:"#e0c08a"},
  park:{az:"Park",c:"#6fae7d"}, yemek:{az:"Yemək/kafe",c:"#e0604a"}, bazar:{az:"Milad bazarı",c:"#f08a6a"},
  metro:{az:"Metro/nəqliyyat",c:"#6a9fd8"},
};
// [id, name, cat, lat, lng, description]
const P = [
 ["stephansdom","Stephansdom (Müqəddəs Stefan kafedralı)","kilse",48.2084,16.3735,"Vyananın simvolu. 137 m-lik cənub qülləsi və rəngli kirəmitli damı ilə məşhurdur."],
 ["hofburg","Hofburg sarayı və Sisi Muzeyi","tarix",48.2077,16.3659,"600 il Habsburqların qış iqamətgahı olub. İçində Sisi Muzeyi və İmperator mənzilləri var."],
 ["reitschule","İspan Süvari Məktəbi","tarix",48.2074,16.3667,"Dünyaca məşhur ağ Lipitsa atlarının çıxış etdiyi barokko manej."],
 ["staatsoper","Vyana Dövlət Operası","tarix",48.2034,16.3692,"1869-cu ildə açılıb. Dünyanın ən nüfuzlu opera teatrlarından biridir."],
 ["albertina","Albertina muzeyi","muzey",48.2047,16.3682,"Monedən Pikassoyadək kolleksiyası olan saray-muzey. Terrasından opera binası görünür."],
 ["rathaus","Vyana Bələdiyyəsi (Rathaus)","tarix",48.2108,16.3572,"1883-cü ildə tikilmiş neoqotik bina. Qarşısında şəhərin ən böyük Milad bazarı qurulur."],
 ["burgtheater","Burgtheater","tarix",48.2104,16.3614,"Avropanın ən qədim alman dilli teatrlarından biri. Pilləkən zalında Klimtin tavan rəsmləri var."],
 ["parlament","Avstriya Parlamenti","tarix",48.2083,16.3584,"Qədim yunan üslubunda tikilib. Qarşısında Afina heykəli olan fəvvarə var."],
 ["votiv","Votivkirche","kilse",48.2155,16.3590,"İmperator Frans İosifə edilən uğursuz sui-qəsddən sonra şükran əlaməti olaraq tikilmiş neoqotik kilsə."],
 ["uni","Vyana Universiteti","tarix",48.2131,16.3600,"1365-ci ildə yaranıb. Alman dilli dünyanın ən qədim universitetidir."],
 ["khm","Kunsthistorisches Museum","muzey",48.2038,16.3618,"Dünyanın ən zəngin sənət muzeylərindən biri: Breygel, Rafael, Vermeer. Gümbəzli kafesi də görməyə dəyər."],
 ["nhm","Naturhistorisches Museum","muzey",48.2051,16.3598,"Təbiət tarixi muzeyi. 29 min illik Villendorf Veneranı burada saxlanılır."],
 ["mq","MuseumsQuartier","muzey",48.2033,16.3584,"Keçmiş saray tövlələrində yerləşən müasir muzey məhəlləsi: Leopold Muzeyi (Şile), mumok."],
 ["karlskirche","Karlskirche","kilse",48.1982,16.3718,"1737-ci ildə taun epidemiyası bitdikdən sonra tikilmiş barokko şah əsəri. Önündə iki nəhəng sütun var."],
 ["secession","Secession binası","muzey",48.2005,16.3657,"Qızıl “kələm” gümbəzli Art Nouveau binası. İçində Klimtin Bethoven frizi var."],
 ["naschmarkt","Naschmarkt","yemek",48.1985,16.3630,"1,5 km uzunluğunda açıq bazar: ədviyyat, pendir, küçə yeməkləri. Bazar günü bağlıdır."],
 ["belvedere","Belvedere sarayı (Yuxarı)","muzey",48.1915,16.3810,"Savoylu Prins Yevgeninin yay sarayı. Klimtin “Öpüş” tablosu burada saxlanılır."],
 ["schonbrunn","Schönbrunn sarayı","tarix",48.1858,16.3128,"1441 otaqlı imperator yay sarayı, UNESCO irsi. Sisi və Frans İosifin həyatı burada keçib."],
 ["gloriette","Gloriette","tarix",48.1782,16.3088,"Schönbrunn təpəsindəki zəfər tağı. Ən gözəl Vyana panoraması buradan açılır."],
 ["zoo","Schönbrunn zooparkı","park",48.1824,16.3027,"1752-ci ildə yaranıb. Dünyanın hələ də işləyən ən qədim zooparkıdır."],
 ["riesenrad","Prater – Riesenrad","tarix",48.2167,16.3959,"1897-ci ildə qurulmuş 65 m-lik nəhəng çarx. Kabinələr qapalı və istidir."],
 ["hundertwasser","Hundertwasserhaus","tarix",48.2072,16.3943,"Rəssam Hundertvasserin rəngli, əyri xətli və damında ağaclar olan yaşayış binası. Xaricdən baxılır, pulsuzdur."],
 ["kunsthaus","Kunsthaus Wien","muzey",48.2108,16.3929,"Hundertvasserin muzeyi. Döşəməsi belə dalğalıdır."],
 ["peterskirche","Peterskirche","kilse",48.2093,16.3698,"Qrabenin yanındakı yaşıl gümbəzli kiçik barokko kilsə. Daxili qızılla bəzədilib."],
 ["graben","Graben və Taun sütunu","tarix",48.2086,16.3697,"Əsas piyada küçəsi. Ortasındakı barokko sütun 1679-cu il taun epidemiyasının xatirəsinə ucaldılıb."],
 ["kohlmarkt","Kohlmarkt","tarix",48.2087,16.3675,"Lüks mağazalar küçəsi. Sonunda Hofburgun Mixaeler darvazası görünür."],
 ["amhof","Am Hof meydanı","tarix",48.2108,16.3683,"Şəhər mərkəzinin ən böyük meydanı. Babenberqlərin ilk sarayı burada olub."],
 ["freyung","Freyung meydanı","tarix",48.2121,16.3655,"Şotland monastırının qarşısındakı tarixi meydan. Adı “sığınacaq azadlığı” mənasını verir."],
 ["ruprecht","Ruprechtskirche","kilse",48.2116,16.3746,"Vyananın ən qədim kilsəsi hesab olunur (təxminən 8–11-ci əsrlər)."],
 ["mozarthaus","Mozarthaus","muzey",48.2077,16.3755,"Motsartın Vyanada yaşadığı evlərdən yeganə qalanı. “Fiqaronun toyu”nu burada yazıb."],
 ["stadtpark","Stadtpark – Strauss heykəli","park",48.2048,16.3793,"Valslar kralı İohann Ştrausun qızılı heykəli olan park."],
 ["burggarten","Burggarten və Palmenhaus","park",48.2050,16.3660,"Motsart heykəli olan saray bağı və Art Nouveau şüşə istixanası (içində kafe var)."],
 ["volksgarten","Volksgarten","park",48.2085,16.3622,"Qızılgül bağı və İmperatriça Sisinin abidəsi olan park."],
 ["heldenplatz","Heldenplatz","tarix",48.2065,16.3632,"Hofburqun qarşısındakı nəhəng meydan. Atlı heykəllər və Yeni Saray (Neue Burg) buradadır."],
 ["ankeruhr","Ankeruhr saatı","tarix",48.2110,16.3737,"Hoher Marktdakı Art Nouveau saatı. Saat 12:00-da tarixi fiqurlar musiqi ilə keçid edir."],
 ["judenplatz","Judenplatz","tarix",48.2116,16.3693,"Holokost abidəsi (“adsız kitabxana”) və orta əsr sinaqoqunun qalıqları buradadır."],
 ["augustiner","Augustinerkirche","kilse",48.2056,16.3684,"Habsburqların saray kilsəsi. Mariya Terezanın və Sisinin toyları burada olub."],
 ["kapuziner","Kapuzinergruft","tarix",48.2056,16.3699,"Habsburq imperatorlarının dəfn olunduğu sərdabə."],
 ["hausdermusik","Haus der Musik","muzey",48.2040,16.3740,"İnteraktiv musiqi muzeyi. Burada Vyana Filarmoniyasını virtual dirijor kimi idarə etmək olar."],
 ["minoriten","Minoritenkirche","kilse",48.2099,16.3630,"İçində Leonardonun “Son şam yeməyi”nin mozaik surəti olan qotik kilsə."],
 ["donauturm","Donauturm","tarix",48.2402,16.4100,"252 m-lik qüllə. Fırlanan restoranından bütün Vyana görünür."],
 // food (Google ratings checked 15.11.2026)
 ["domschnitzel","Dom Schnitzel (Stephansdom)","yemek",48.2088,16.3714,"Stephansdomun yanında, böyük porsiyalı şnitsel və toyuq şorbası. Figlmüller-ə yaxşı alternativ."],
 ["figlmuller","Figlmüller (Wollzeile)","yemek",48.2094,16.3746,"Boşqabdan böyük şnitseli ilə məşhurdur (klassik donuz ətindəndir). Rezerv et."],
 ["reinthalerbeisl","Reinthaler's Beisl","yemek",48.2080,16.3699,"Ənənəvi Avstriya mətbəxi, ağlabatan qiymət. Növbə tez irəliləyir."],
 ["gasthausreinthaler","Gasthaus Reinthaler","yemek",48.2056,16.3691,"Operanın yanında yerlilərin getdiyi sadə Wirtshaus. Həftəsonu bağlıdır."],
 ["melker","Melker Stiftskeller","yemek",48.2124,16.3638,"600 illik şərab zirzəmisində axşam yeməyi. Yalnız axşam açılır."],
 ["plachutta","Plachutta (Wollzeile)","yemek",48.2075,16.3787,"Klassik Tafelspitz (qaynadılmış mal əti) üçün ən yaxşı ünvan. Rezerv et."],
 ["zaytouna","Al Zaytouna (Livan)","yemek",48.2085,16.3813,"Rəylərə görə halal Livan restoranı: şaurma, humus, qril. Stubenring-dədir."],
 ["shakomaako","Shako Maako (şaurma)","yemek",48.2115,16.3756,"Kiçik şaurma və falafel yeri. Tez, sərfəli və çox yüksək reytinqlidir."],
 ["kameel","Zum Schwarzen Kameel","yemek",48.2100,16.3683,"1618-ci ildən delikates. Kiçik sendviçlər (Brötchen) və nahar üçün."],
 ["central","Café Central","yemek",48.2104,16.3654,"1876-cı ildən əfsanəvi qəhvəxana. Növbəsi 20–30 dəqiqə ola bilər."],
 ["landtmann","Café Landtmann","yemek",48.2115,16.3615,"Burgtheaterin yanındakı zərif qəhvəxana. Rəylərə görə xidməti əladır. Apfelstrudel sınamağa dəyər."],
 ["demel","Demel","yemek",48.2086,16.3672,"1786-cı ildən imperator sarayının qənnadçısı. Kaiserschmarrn burada çox tərifli."],
 ["sacher","Café Sacher","yemek",48.2039,16.3698,"Orijinal Sachertorte-nin vətəni, amma Google reytinqi 3,9-dur və növbə uzundur. Demel daha yaxşı seçimdir."],
 ["neni","NENI am Naschmarkt","yemek",48.1979,16.3621,"Naschmarkt-da Yaxın Şərq mətbəxi. Səhər yeməyi də var."],
 ["papas","Papas am Naschmarkt","yemek",48.1978,16.3621,"Aralıq dənizi və türk mətbəxi. Rəylərə görə hesaba 15% bahşiş avtomatik əlavə oluna bilər."],
 ["bitzinger","Bitzinger Würstelstand","yemek",48.2041,16.3685,"Operanın yanında məşhur kolbasa köşkü (əsasən donuz əti)."],
 // christmas markets
 ["xm-rathaus","Christkindlmarkt – Rathausplatz","bazar",48.2100,16.3580,"Ən böyük Milad bazarı: 13 noyabr – 26 dekabr. Buz meydançası (Eistraum) da var."],
 ["xm-stephan","Milad bazarı – Stephansplatz","bazar",48.2082,16.3724,"Kafedralın yanında. Həftəiçi saat 14:00-dan açılır."],
 ["xm-schonbrunn","Milad bazarı – Schönbrunn","bazar",48.1862,16.3130,"Saray həyətində. 6 noyabrdan açıqdır, giriş pulsuzdur."],
 ["xm-amhof","Milad bazarı – Am Hof","bazar",48.2106,16.3680,"14 noyabrdan açıqdır. Kiçik və sakit bazardır."],
 ["xm-freyung","Milad bazarı – Freyung","bazar",48.2119,16.3652,"13 noyabrdan açıqdır. Ənənəvi əl işləri satılır."],
 // transit
 ["u-stephansplatz","U Stephansplatz (U1, U3)","metro",48.2083,16.3721,"Mərkəzin əsas metro stansiyası."],
 ["u-karlsplatz","U Karlsplatz (U1, U2, U4)","metro",48.2007,16.3700,"Opera, Karlskirche və Naschmarkt üçün qovşaq."],
 ["u-schwedenplatz","U Schwedenplatz (U1, U4)","metro",48.2116,16.3780,"Kanal sahili. Yaxınlıqda restoranlar var."],
 ["u-herrengasse","U Herrengasse (U3)","metro",48.2093,16.3654,"Hofburg və Café Central üçün ən yaxın stansiya."],
 ["u-volkstheater","U Volkstheater (U2, U3)","metro",48.2058,16.3580,"MuseumsQuartier və muzeylər üçün."],
 ["u-rathaus","U Rathaus (U2)","metro",48.2106,16.3540,"Rathaus və Milad bazarı üçün."],
 ["u-schottentor","U Schottentor (U2)","metro",48.2147,16.3622,"Universitet və Votivkirche üçün."],
 ["u-schonbrunn","U Schönbrunn (U4)","metro",48.1863,16.3195,"Schönbrunn sarayının əsas girişinə 5 dəqiqə piyada."],
 ["u-praterstern","U Praterstern (U1, U2)","metro",48.2186,16.3926,"Prater və Riesenrad üçün."],
 ["u-landstrasse","Wien Mitte / Landstraße (U3, U4) – CAT avtobusu","metro",48.2065,16.3846,"Hava limanına gedən CAT avtobusu buradan, Marxergasse 1b-dən yola düşür."],
 ["u-taubstummen","U Taubstummengasse (U1)","metro",48.1952,16.3700,"Belvedere və Karlskirche üçün."],
 ["hbf","Wien Hauptbahnhof (U1)","metro",48.1851,16.3770,"Mərkəzi vağzal. Hava limanına Railjet qatarları buradan gedir."],
];
// Extra info: g=Google rating, n=review count, pid=Google place id, pr=price, lvl=price level(1-3), h=hours (string or 7-day array Mon..Sun, null=closed), hd=date overrides, halal
const D7=(wk,we)=>[wk,wk,wk,wk,wk,we,we];
const EX = {
 stephansdom:{g:4.7,n:142115,pid:"ChIJz-w_Ip8HbUcRWTHc-vNXlxc",pr:"Kafedral pulsuz · qüllə + katakomba kombi bileti ~25 €",h:"06:00-22:00",free:1},
 hofburg:{g:4.4,n:20850,pid:"ChIJpYXZnZkHbUcRnACajEL3kTs",pr:"Sisi Muzeyi + İmperator mənzilləri ~20 €",h:"09:00-17:30",hd:{"2026-11-17":"10:00-16:30","2026-11-18":"10:00-16:30"}},
 staatsoper:{g:4.7,n:64529,pid:"ChIJ1b8dhpwHbUcRVn03JY0mWf0",pr:"Bələdçili tur ~18 € (təxmini), onlayn rezerv et"},
 albertina:{g:4.7,n:36582,pid:"ChIJwVp-8psHbUcRuN43n5iK72Y",pr:"19,90 €",h:["10:00-18:00","10:00-18:00","10:00-21:00","10:00-18:00","10:00-21:00","10:00-18:00","10:00-18:00"]},
 khm:{g:4.8,n:36592,pid:"ChIJ8XfPY5oHbUcRQbimbLVSYG8",pr:"24 €",h:["10:00-18:00","10:00-18:00","10:00-18:00","10:00-21:00","10:00-18:00","10:00-18:00","10:00-18:00"]},
 schonbrunn:{g:4.7,n:187786,pid:"ChIJv3zAHAmobUcRyYvq5F26aU4",pr:"Saray: 30 € (22 otaq, ~40 dəq) / 42 € (40 otaq, ~75 dəq) · park pulsuz",h:"08:30-17:00"},
 belvedere:{pr:"Yuxarı Belvedere 23 € (vaxt slotlu bilet)",h:"09:00-18:00"},
 riesenrad:{g:4.5,n:50513,pid:"ChIJJYWNjA8HbUcRBlfleWeh1qw",pr:"14,50 €",h:"10:00-19:45"},
 hundertwasser:{free:1}, graben:{free:1}, kohlmarkt:{free:1}, amhof:{free:1}, freyung:{free:1}, heldenplatz:{free:1}, volksgarten:{free:1}, stadtpark:{free:1}, burggarten:{free:1}, ankeruhr:{free:1}, judenplatz:{free:1}, peterskirche:{free:1}, karlskirche:{pr:"Giriş ödənişlidir (kiçik məbləğ)"}, gloriette:{free:1}, rathaus:{free:1}, parlament:{free:1}, votiv:{free:1}, naschmarkt:{free:1,h:D7("06:00-19:30","06:00-17:00")},
 domschnitzel:{g:4.8,n:11988,pid:"ChIJa4hiLSMHbUcRD_tpycqY3uY",lvl:2,h:"10:00-24:00"},
 figlmuller:{g:4.3,n:7814,pid:"ChIJyUHiB5EHbUcReYQd2GSG7kg",lvl:3,h:"11:00-22:30"},
 reinthalerbeisl:{g:4.5,n:9060,pid:"ChIJfx1lJ5kHbUcRsKCobUkQm5U",lvl:2,h:"11:00-23:00"},
 gasthausreinthaler:{g:4.5,n:3992,pid:"ChIJiwmk_ZsHbUcRqdX7IUtyFDI",lvl:2,h:["11:00-23:00","11:00-23:00","11:00-23:00","11:00-23:00","11:00-23:00",null,null]},
 melker:{g:4.6,n:2888,pid:"ChIJ78i7c70HbUcRbm8QSXNoNbo",lvl:2,h:[null,"17:00-23:30","17:00-23:30","17:00-23:30","17:00-23:30","17:00-23:30",null]},
 plachutta:{g:4.3,n:14903,pid:"ChIJ8aGpZXUHbUcR7RhDMQpSArs",lvl:3,h:"11:30-23:30"},
 zaytouna:{g:4.6,n:6841,pid:"ChIJg-HuZmwHbUcR9YetSoBlmCs",lvl:2,halal:1,h:D7("11:30-23:00","12:00-23:00")},
 shakomaako:{g:4.6,n:824,pid:"ChIJqzJehukHbUcRWQ9ICZul0Bg",lvl:2,h:["11:00-23:00","11:00-23:00","11:00-23:00","11:00-23:00","11:00-02:00","11:00-02:00","11:00-23:00"]},
 kameel:{g:4.3,n:6425,pid:"ChIJ7Wt7ZJgHbUcRhmIQOTicWhs",lvl:2,h:"08:00-24:00"},
 central:{g:4.3,n:30431,pid:"ChIJLzsM95cHbUcRSS5C-z-H-ls",lvl:2},
 landtmann:{g:4.4,n:21767,pid:"ChIJualQc5wHbUcRrzBxds3JZ7I",lvl:2,h:["07:30-24:00","07:30-24:00","07:30-24:00","07:30-24:00","07:30-24:00","07:30-24:00","07:30-22:00"]},
 demel:{g:4.2,n:22839,pid:"ChIJiY3_UpgHbUcRWCIbHu4EWXY",lvl:2,h:"10:00-19:00"},
 sacher:{g:3.9,n:20856,pid:"ChIJI85wbpwHbUcR2nlviUzwg9s",lvl:2,h:"07:00-23:00"},
 neni:{g:4.3,n:6503,pid:"ChIJTaKjjIQHbUcRr1Cvk38JjHI",lvl:2,h:["08:00-23:00","08:00-23:00","08:00-23:00","08:00-23:00","08:00-23:00","08:00-23:00","09:00-21:00"]},
 papas:{g:4.4,n:2490,pid:"ChIJ2QPvpIwHbUcRxJ-6-1tHHDs",lvl:2,h:["07:00-23:00","07:00-23:00","07:00-23:00","07:00-23:00","07:00-23:00","07:00-23:00","10:00-21:00"]},
 bitzinger:{g:4.1,n:7276,pid:"ChIJQRR7i5sHbUcRA1cK2H2VnwE",lvl:1,pr:"Kolbasa ~7 €",h:"08:00-04:00"},
 "xm-rathaus":{free:1,h:"10:00-22:00"}, "xm-schonbrunn":{free:1,h:"10:00-21:00"}, "xm-stephan":{free:1,h:D7("14:00-21:00","10:00-21:30")}, "xm-amhof":{free:1,h:D7("11:00-21:00","10:00-21:00")}, "xm-freyung":{free:1,h:"10:00-21:00"},
};
const LVL={1:"€ · ~5–15 € adambaşı",2:"€€ · ~15–35 € adambaşı",3:"€€€ · ~35–60 € adambaşı"};
const POI = P.map(a=>Object.assign({id:a[0],name:a[1],cat:a[2],lat:a[3],lng:a[4],d:a[5]},EX[a[0]]||{}));
const byId = Object.fromEntries(POI.map(p=>[p.id,p]));
const MIN_RATING=4.2;
const goodFood = p => p.cat!=="yemek" || (p.g||0)>=MIN_RATING;

const PLAN = [
 {d:"2026-11-17",t:"17 noyabr",w:"Çərşənbə axşamı",title:"Gəliş və Köhnə şəhər",items:[
  ["11:00","Vyana hava limanına eniş","Pasport nəzarəti və baqaj üçün təxminən 45–60 dəqiqə ayır.",null,1],
  ["12:00","CAT avtobusu → Wien Mitte","Avtobus terminalı Terminal 3-ün qarşısındadır. Hər 12 dəqiqədən bir gedir, yol təxminən 21 dəqiqədir, bilet adambaşı 14,90 €. Ucuz variant: Railjet qatarı ilə Hauptbahnhof-a.","u-landstrasse",1],
  ["12:40","Wien Mitte → otel (piyada ~10 dəq)","HOME1 – Lumes Boutique Hotel, Weihburggasse 18-20. Wien Mitte-dən təxminən 700 m-dir.","hotel"],
  ["13:00","Otelə çantaları qoy","Check-in 15:00-dandır, otel self check-in-dir. Çantaları saxlamağı əvvəlcədən Booking-dən yaz, giriş təlimatını Booking mesajlarında yoxla.","hotel"],
  ["13:30","Nahar: Dom Schnitzel ★4.8","Stephansdomun yanındadır. Alternativ: Figlmüller ★4.3 (rezerv lazımdır).","domschnitzel"],
  ["15:00","Stephansdom + Stephansplatz bazarı","Kafedralın içi pulsuzdur. Qüllə və katakombalar ödənişlidir. Bazar saat 14:00-da açılır.","stephansdom"],
  ["16:30","Graben → Kohlmarkt → Hofburg","Axşam işıqları altında gəzinti. Yol üstündə Demel ★4.2-də Kaiserschmarrn sına.","graben"],
  ["17:30","Café Central ★4.3","Melange qəhvəsi və Apfelstrudel. Növbə 20–30 dəqiqə ola bilər.","central"],
  ["19:00","Christkindlmarkt – Rathausplatz","Glühwein, Kartoffelpuffer və işıqlandırılmış park. Bazar saat 22:00-dək açıqdır.","xm-rathaus"],
 ]},
 {d:"2026-11-18",t:"18 noyabr",w:"Çərşənbə",title:"İmperator günü",items:[
  ["09:00","U4 xətti ilə Schönbrunn-a","U Schönbrunn stansiyasında düş.","u-schonbrunn"],
  ["09:30","Schönbrunn sarayı ★4.7","Bilet 30 € (22 otaq) və ya 42 € (40 otaq). Onlayn al.","schonbrunn",1],
  ["11:30","Saray bağları və Gloriette","Təpəyə 15–20 dəqiqəlik yoxuş var. Park pulsuzdur.","gloriette"],
  ["12:45","Schönbrunn Milad bazarı","Saray həyətindədir, 10:00–21:00 açıqdır.","xm-schonbrunn"],
  ["14:00","Naschmarkt-da nahar","NENI ★4.3 və ya Papas ★4.4. U4 ilə Kettenbrückengasse-yə get.","naschmarkt"],
  ["15:30","Secession və Karlskirche","Klimtin qızılı gümbəzi və barokko kilsəsi.","karlskirche"],
  ["16:30","Opera və Albertina ★4.7","Albertina çərşənbə günü 21:00-dək açıqdır (19,90 €).","albertina"],
  ["18:30","Şirniyyat: Demel ★4.2 və ya Landtmann ★4.4","Café Sacher ★3,9-un növbəsi uzundur. Sachertorte-ni Demel-də də sınaya bilərsən.","demel"],
  ["19:30","Axşam: opera və ya sərbəst vaxt","Tamaşa və ucuz ayaqüstü yerlər üçün wiener-staatsoper.at saytına bax.","staatsoper"],
 ]},
 {d:"2026-11-19",t:"19 noyabr",w:"Cümə axşamı",title:"Klimt, Hundertvasser, Prater",items:[
  ["09:30","Belvedere – Klimtin “Öpüş” tablosu","Bilet 23 €-dur, vaxt slotu ilə satılır. Yuxarı Belvedere-dən başla.","belvedere",1],
  ["11:45","Hundertwasserhaus və Kunsthaus","Rəngli, əyri xətli binalar. Xaricdən baxmaq pulsuzdur.","hundertwasser"],
  ["13:00","Nahar: Al Zaytouna ★4.6 (halal)","Stubenring-dədir, Hundertvasserdən yol üstündədir.","zaytouna"],
  ["14:30","Prater – Riesenrad ★4.5","14,50 €. Bu həftə 10:00–19:45 açıqdır, kabinələr isti olur.","riesenrad"],
  ["16:30","Stadtpark – Strauss heykəli","Qaranlıq düşəndə qısa gəzinti üçün uyğundur.","stadtpark"],
  ["17:30","Am Hof və Freyung bazarları","Kiçik və daha sakit bazarlardır. Ankeruhr saatı yol üstündədir.","xm-amhof"],
  ["19:30","Vida şam yeməyi: Plachutta ★4.3 və ya Melker Stiftskeller ★4.6","Hər ikisi üçün rezerv et.","plachutta"],
 ]},
 {d:"2026-11-20",t:"20 noyabr",w:"Cümə",title:"Dönüş günü",items:[
  ["07:30","Səhər yeməyi və check-out","Check-out 11:00-dək. Çamadanları axşamdan yığ, açarı/kartı təlimata görə qaytar.","hotel"],
  ["08:45","Otel → Wien Mitte (piyada ~10 dəq)","Weihburggasse-dən Wien Mitte (Marxergasse 1b) təxminən 700 m-dir. CAT avtobusunun dayanacağı buradadır. Şəhərdə baqaj təhvili hazırda işləmir.","u-landstrasse",1],
  ["09:10","CAT avtobusu ilə hava limanına","Hər 12 dəqiqədən bir gedir, yol təxminən 21–25 dəqiqədir. Tıxac ehtimalına görə bu avtobusdan gecikmə.","u-landstrasse",1],
  ["09:40","Hava limanı → Terminal 1","Avtobus Terminal 3-ün qarşısında saxlayır. Terminal 1-ə piyada 5–10 dəqiqədir.",null],
  ["10:00","Terminal 1: qeydiyyat və pasport nəzarəti","Şengendən çıxışda növbə ola bilər. Tax Free qaytarırsansa, əlavə 20 dəqiqə ayır.",null,1],
  ["12:00","Uçuş","Yaxşı yol!",null,1],
 ]},
];




const PHR=[
 ["Salam","Grüß Gott / Hallo","qrüs qott / hallo","salam hello","Ümumi"],
 ["Sabahınız xeyir","Guten Morgen","quten morgen","səhər","Ümumi"],
 ["Axşamınız xeyir","Guten Abend","quten abend","axşam","Ümumi"],
 ["Təşəkkür edirəm","Danke schön","danke şön","sağ ol təşəkkür minnətdar","Ümumi"],
 ["Zəhmət olmasa / Buyurun","Bitte","bitte","zəhmət xahiş buyur","Ümumi"],
 ["Bəli / Xeyr","Ja / Nein","ya / nayn","hə yox","Ümumi"],
 ["Bağışlayın","Entschuldigung","entşuldiqunq","üzr bağışla pardon","Ümumi"],
 ["Mən almanca bilmirəm","Ich spreche kein Deutsch","ix şprexe kayn doyç","almanca bilmirəm dil","Ümumi"],
 ["İngiliscə danışırsınız?","Sprechen Sie Englisch?","şprexen zi enqliş?","ingilis","Ümumi"],
 ["Başa düşmədim","Ich verstehe nicht","ix ferşteye nixt","anlamadım başa düşmürəm","Ümumi"],
 ["Yavaş danışın, zəhmət olmasa","Bitte langsamer","bitte lanqzamer","yavaş","Ümumi"],
 ["Sağ olun (ayrılanda)","Auf Wiedersehen","auf viderzeen","hələlik sağ ol","Ümumi"],
 ["Üç nəfər üçün masa","Ein Tisch für drei, bitte","ayn tiş für dray, bitte","masa stol yer üç nəfər rezerv","Restoran"],
 ["Rezervim var","Ich habe reserviert","ix habe rezervirt","rezerv bron","Restoran"],
 ["Menyu, zəhmət olmasa","Die Speisekarte, bitte","di şpayzekarte, bitte","menyu menu","Restoran"],
 ["Hesabı gətirin, zəhmət olmasa","Die Rechnung, bitte","di rexnunq, bitte","hesab çek ödəmək","Restoran"],
 ["Ayrı-ayrı ödəyəcəyik","Wir zahlen getrennt","vir tsalen qetrent","ayrı ayrılıqda bölmək","Restoran"],
 ["Birlikdə ödəyəcəyik","Zusammen, bitte","tsuzamen, bitte","birlikdə bir yerdə","Restoran"],
 ["Kartla ödəmək olar?","Kann ich mit Karte zahlen?","kan ix mit karte tsalen?","kart ödəmə visa","Restoran"],
 ["Donuz əti var?","Ist da Schweinefleisch drin?","ist da şvaynefleyş drin?","donuz ət","Restoran"],
 ["Donuz ətisiz, zəhmət olmasa","Ohne Schweinefleisch, bitte","one şvaynefleyş, bitte","donuz ətsiz","Restoran"],
 ["Halal yeməyiniz var?","Haben Sie Halal-Essen?","haben zi halal-essen?","halal","Restoran"],
 ["Dana ətindən şnitsel","Schnitzel vom Kalb","şnitsel fom kalb","dana şnitsel","Restoran"],
 ["Toyuq","Hähnchen","henxen","toyuq cüçə","Restoran"],
 ["Balıq","Fisch","fiş","balıq","Restoran"],
 ["Vegetarian","Vegetarisch","veqetariş","vegetarian ətsiz","Restoran"],
 ["Alkoqolsuz","Ohne Alkohol","one alkohol","alkoqol spirt içki","Restoran"],
 ["Kran suyu, zəhmət olmasa","Ein Leitungswasser, bitte","ayn laytunqsvasser, bitte","su kran","Restoran"],
 ["Qazsız su","Stilles Wasser","ştilles vasser","su qazsız","Restoran"],
 ["Qəhvə südlə","Eine Melange, bitte","ayne melanj, bitte","qəhvə kofe süd","Restoran"],
 ["Çay","Ein Tee, bitte","ayn te, bitte","çay","Restoran"],
 ["Çox dadlı idi!","Sehr lecker!","zer lekker!","dadlı ləzzətli","Restoran"],
 ["Bu nə qədərdir?","Wie viel kostet das?","vi fil kostet das?","qiymət neçədir pul","Alış-veriş"],
 ["Endirim var?","Gibt es Rabatt?","qibt es rabat?","endirim skidka","Alış-veriş"],
 ["Başqa ölçü var?","Haben Sie eine andere Größe?","haben zi ayne andere qröse?","ölçü razmer","Alış-veriş"],
 ["Geyinib baxa bilərəm?","Kann ich das anprobieren?","kan ix das anprobiren?","geyinmək sınamaq","Alış-veriş"],
 ["Tax Free forması, zəhmət olmasa","Tax-Free-Formular, bitte","teks fri formular, bitte","tax free vergi","Alış-veriş"],
 ["Sadəcə baxıram","Ich schaue nur","ix şaue nur","baxıram","Alış-veriş"],
 ["… haradadır?","Wo ist …?","vo ist …?","harada yer","Yol"],
 ["Tualet haradadır?","Wo ist die Toilette?","vo ist di toalette?","tualet wc ayaqyolu","Yol"],
 ["Metro stansiyası haradadır?","Wo ist die U-Bahn?","vo ist di u-ban?","metro u-bahn stansiya","Yol"],
 ["Bu avtobus hava limanına gedir?","Fährt dieser Bus zum Flughafen?","fert dizer bus tsum fluqhafen?","avtobus hava limanı aeroport","Yol"],
 ["Bir bilet, zəhmət olmasa","Ein Ticket, bitte","ayn tiket, bitte","bilet","Yol"],
 ["Sağa / Sola / Düz","Rechts / Links / Geradeaus","rexts / links / qeradeaus","sağ sol düz","Yol"],
 ["Uzaqdır?","Ist es weit?","ist es vayt?","uzaq yaxın","Yol"],
 ["Taksi çağırın, zəhmət olmasa","Bitte rufen Sie ein Taxi","bitte rufen zi ayn taksi","taksi","Yol"],
 ["Otelə necə gedim?","Wie komme ich zum Hotel?","vi komme ix tsum hotel?","otel necə gedim","Otel"],
 ["Çantaları saxlaya bilərsiniz?","Können Sie unser Gepäck aufbewahren?","kÖnnen zi unzer qepek aufbevaren?","çanta baqaj saxlamaq","Otel"],
 ["Check-out saat neçədədir?","Wann ist der Check-out?","van ist der çek-aut?","check out çıxış","Otel"],
 ["Wi-Fi parolu nədir?","Wie ist das WLAN-Passwort?","vi ist das velan-passvort?","wifi internet parol","Otel"],
 ["Kömək edin!","Hilfe!","hilfe!","kömək imdad","Təcili"],
 ["Polisi çağırın!","Rufen Sie die Polizei!","rufen zi di politsay!","polis","Təcili"],
 ["Həkimə ehtiyacım var","Ich brauche einen Arzt","ix brauxe aynen artst","həkim doktor xəstə","Təcili"],
 ["Aptek haradadır?","Wo ist eine Apotheke?","vo ist ayne apoteke?","aptek dərman","Təcili"],
 ["Çantamı itirmişəm","Ich habe meine Tasche verloren","ix habe mayne taşe ferloren","itirdim çanta","Təcili"],
];

const INFO_HTML=`<div class="info">
<div class="card"><h3>✈️ Hava limanı (VIE)</h3><ul>
<li><b>CAT qatarı hazırda işləmir.</b> 2027-nin oktyabrınadək onun yerinə <b>CAT avtobusu</b> gedir: Wien Mitte (Marxergasse 1b) ↔ Terminal 3-ün qarşısı.</li>
<li>Gündüz hər 12 dəqiqədən bir gedir, yol təxminən 21 dəqiqədir, bilet adambaşı 14,90 €-dur.</li>
<li>Ucuz variant: Hauptbahnhof-dan Railjet qatarı. S7 indi yalnız St. Marx-dan gedir.</li>
<li>Wien Mitte-də baqaj təhvili (City Check-in) işləmir. Dönüş günü ən gec 10:00-da Terminal 1-də ol.</li></ul></div>
<div class="card"><h3>🚇 Şəhərdə nəqliyyat (2026 qiymətləri)</h3><ul>
<li>Bir gediş: <b>3,00 €</b> (WienMobil tətbiqində) və ya 3,20 € (kağız bilet).</li>
<li><b>24 saatlıq bilet: 9,70 €</b> (tətbiqdə). <b>7 günlük: 25,20 €</b>. 3 gün üçün 7 günlük bilet adətən daha sərfəlidir.</li>
<li>2026-cı ildən 48 və 72 saatlıq biletlər <b>ləğv olunub</b>.</li>
<li>Bilet yoxlanışı olur. Kağız bileti ilk gedişdən əvvəl aktivləşdir.</li></ul></div>
<div class="card"><h3>🎟 Əsas biletlər</h3><ul>
<li><b>Schönbrunn:</b> 30 € (22 otaq) / 42 € (40 otaq). Park pulsuzdur.</li>
<li><b>Yuxarı Belvedere:</b> 23 €, vaxt slotu ilə.</li>
<li><b>Kunsthistorisches Museum:</b> 24 €. <b>Albertina:</b> 19,90 €.</li>
<li><b>Riesenrad:</b> 14,50 €. <b>Stephansdom:</b> içi pulsuz, qüllə və katakomba ödənişlidir.</li>
<li><b>Sisi Muzeyi:</b> ~20 €. 19 noyabrda yenilənmiş muzey açılır.</li></ul></div>
<div class="card"><h3>🎄 Milad bazarları</h3><ul>
<li><b>Rathausplatz:</b> hər gün 10:00–22:00</li><li><b>Schönbrunn:</b> 10:00–21:00</li>
<li><b>Stephansplatz:</b> həftəiçi 14:00-dan</li><li><b>Am Hof</b> və <b>Freyung:</b> ~10/11:00–21:00</li>
<li>Glühwein fincanı üçün depozit alınır. Fincanı qaytarsan, pul geri verilir.</li></ul></div>
<div class="card"><h3>🧾 Tax-free (ƏDV-nin geri qaytarılması)</h3><ul>
<li>Bir mağazada <b>bir çekdə 75,01 €-dan çox</b> alsan, ƏDV-nin bir hissəsini geri ala bilərsən. Komissiyadan sonra təxminən <b>12–14%</b> qayıdır.</li>
<li>Kassada <b>“Tax free, bitte”</b> de, pasportu göstər, forma ver.</li>
<li>20 noyabrda hava limanında <b>qeydiyyatdan ƏVVƏL</b> gömrükdə formaya möhür vurdur. Mallar istifadə olunmamış və yanında olsun.</li>
<li>Xərclərdə “🧾 Tax-free forması aldım” işarələ — tətbiq neçə çekin olduğunu xatırladacaq.</li></ul></div>
<div class="card"><h3>☎️ Təcili nömrələr</h3><ul><li><a href="tel:112"><b>112</b></a> — ümumi təcili yardım</li><li><a href="tel:144"><b>144</b></a> — təcili tibbi yardım</li><li><a href="tel:133"><b>133</b></a> — polis</li><li><a href="tel:122"><b>122</b></a> — yanğın</li><li><a href="tel:141"><b>141</b></a> — gecə həkimi (Ärztefunkdienst)</li></ul></div>
<div class="card"><h3>💡 Faydalı qeydlər</h3><ul>
<li>Bahşiş: məbləği 5–10% yuvarlaqlaşdır. Bəzi yerlərdə bahşiş hesaba artıq əlavə olunur, ona görə hesabı yoxla.</li>
<li>Kran suyu təmizdir. Kafedə “Leitungswasser” istə, adətən pulsuzdur.</li>
<li>Şnitsel və kolbasaların çoxu donuz ətindəndir. “Wiener Schnitzel vom Kalb” dana ətindəndir. “Almanca” bölməsində lazımi ifadələr var.</li>
<li>Tax Free: alış-verişdə çek istə və hava limanında möhürlət.</li></ul></div>
<div class="card"><h3>📱 Tətbiq necə işləyir</h3><ul>
<li><b>Yer:</b> GPS avtomatik işləyir (ilk dəfə icazə ver). Xəritədə mavi nöqtə sənsən.</li>
<li><b>Reytinqlər:</b> Google-dan götürülüb. “Google” düyməsi Google Maps-da rəyləri açır.</li>
<li><b>Xəbərlər:</b> 17–20 noyabr hər səhər nümayiş, bağlanma və hava yoxlanılıb bura əlavə olunur.</li>
<li><b>Xərclər:</b> hər üç nəfər üçün ortaqdır, balans avtomatik hesablanır.</li>
<li><b>Səs:</b> almanca dinləmək üçün Tərcümə → “Onlar deyir” → 🎤.</li></ul></div>
<div class="note" style="text-align:center">Qiymət və iş saatları dəyişə bilər. Gedəndən əvvəl rəsmi saytda yoxla.</div>
</div>`;



// Official ticket sites + short tips (shown on place cards and in Məlumat → Biletlər)
const TICKETS = {
  schonbrunn: ["https://www.schoenbrunn.at", "Saray girişi vaxt slotu ilədir — bileti onlayn əvvəlcədən al, səhər ilk saatlar ən sakitidir."],
  hofburg: ["https://www.sisimuseum-hofburg.at", "Bir bilet: Sisi Muzeyi + İmperator mənzilləri + Gümüş kolleksiyası. Onlayn al, kassa növbəsini keç."],
  belvedere: ["https://www.belvedere.at", "Klimtin “Öpüş” əsəri Yuxarı Belvederedədir. Onlayn bilet vaxt slotu ilədir."],
  khm: ["https://www.khm.at", "Böyük muzeydir — 2–3 saat ayır. Kafe zalı da görməlidir."],
  nhm: ["https://www.nhm.at", "KHM-in qarşısındadır. Willendorf Venerası buradadır."],
  albertina: ["https://www.albertina.at", "Terrasından Operanın gözəl mənzərəsi açılır."],
  stephansdom: ["https://www.stephanskirche.at", "Kafedralın girişi pulsuzdur; qüllə, katakombalar və tur ayrıca biletlədir."],
  riesenrad: ["https://www.wienerriesenrad.com", "Axşam işıqlarında daha gözəldir. Onlayn bilet növbəni qısaldır."],
  staatsoper: ["https://www.wiener-staatsoper.at", "Tamaşa olmayan saatlarda bina turu var — saatları saytda yoxla."],
  reitschule: ["https://www.srs.at", "Səhər məşqlərinə bilet tamaşadan ucuzdur — tarixləri saytda yoxla."],
  hausdermusik: ["https://www.hausdermusik.com", "İnteraktiv musiqi muzeyi — otelə çox yaxındır, yağışlı hava üçün idealdır."],
  mozarthaus: ["https://www.mozarthausvienna.at", "Motsartın yaşadığı mənzil, Stephansdomun arxasında."],
  kunsthaus: ["https://www.kunsthauswien.com", "Hundertwasser muzeyi; Hundertwasserhaus-un özü yalnız çöldən görünür."],
  zoo: ["https://www.zoovienna.at", "Dünyanın ən qədim zooparkı, Schönbrunn parkının içindədir."],
  donauturm: ["https://www.donauturm.at", "Fırlanan restoran və 150 m-dən şəhər mənzərəsi."],
  kapuziner: ["https://www.kapuzinergruft.com", "Habsburq imperatorlarının məqbərəsi, Sisi də buradadır."],
  secession: ["https://www.secession.at", "Klimtin Bethoven frizi buradadır."],
};
