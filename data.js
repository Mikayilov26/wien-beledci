/* Wien Bələdçi — static data (places, plan, phrases, info). */
const CAT = {
  tarix:{az:"Tarix",c:"#d9a54a"}, muzey:{az:"Muzey",c:"#a98bd6"}, kilse:{az:"Kilsə",c:"#e0c08a"},
  park:{az:"Park",c:"#6fae7d"}, yemek:{az:"Yemək/kafe",c:"#e0604a"}, bazar:{az:"Milad bazarı",c:"#f08a6a"},
  metro:{az:"Metro/nəqliyyat",c:"#6a9fd8"}, shop:{az:"Alış-veriş",c:"#8a5cf6"},
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
 ["xm-karlsplatz","Art Advent – Karlsplatz","bazar",48.1992,16.3713,"Sənət və əl işləri bazarı Karlskirche-nin qarşısında. 13.11–23.12, hər gün 12:00–20:00."],
 ["xm-spittelberg","Milad bazarı – Spittelberg","bazar",48.2032,16.3551,"Dar köhnə küçələrdə ən romantik bazar: əl işləri, ekoloji məhsullar. 13.11–23.12."],
 // shopping
 ["shop-kaerntner","Kärntner Straße və Graben","shop",48.2052,16.3712,"Mərkəzin əsas alış-veriş küçəsi: Zara, H&M, Mango, Swarovski, Steffl univermağı. Otelə 3 dəqiqə."],
 ["shop-goldenes","Goldenes Quartier və Kohlmarkt","shop",48.2101,16.3679,"Lüks markalar küçəsi: Louis Vuitton, Prada, Saint Laurent, Miu Miu, Chanel və s."],
 ["shop-wienmitte","The Mall – Wien Mitte","shop",48.2063,16.3845,"Otelə ən yaxın ticarət mərkəzi (~10 dəq piyada). Yağışlı gün üçün rahatdır."],
 ["shop-mahue","Mariahilfer Straße","shop",48.1988,16.3527,"Vyananın ən uzun alış-veriş küçəsi: Zara, Massimo Dutti, Nike, Peek & Cloppenburg, Gerngross. U3 Neubaugasse."],
 ["shop-donauzentrum","Westfield Donau Zentrum","shop",48.2425,16.4337,"Avstriyanın ən böyük ticarət mərkəzlərindən biri, bütün kütləvi markalar bir damın altında. U1 Kagran."],
 ["shop-parndorf","Designer Outlet Parndorf","shop",47.9803,16.8585,"160-dan çox premium marka, 30–70% endirim (Burberry, Gucci, Michael Kors, Furla…). Vyanadan ~40 dəq; Operadan shuttle var."],
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
 "xm-rathaus":{free:1,h:"10:00-22:00"}, "xm-karlsplatz":{free:1,h:"12:00-21:00"}, "xm-spittelberg":{free:1,h:D7("14:00-21:30","11:00-21:30")},
 "shop-parndorf":{h:["09:00-21:00","09:00-21:00","09:00-21:00","09:00-21:00","09:00-21:00","09:00-18:00",null]}, "xm-schonbrunn":{free:1,h:"10:00-21:00"}, "xm-stephan":{free:1,h:D7("14:00-21:00","10:00-21:30")}, "xm-amhof":{free:1,h:D7("11:00-21:00","10:00-21:00")}, "xm-freyung":{free:1,h:"10:00-21:00"},
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

// Pre-written guide stories (no AI needed). s = story, f = facts, t = tip
const STORIES = {
  stephansdom: { s: "Stephansdom Vyananın simvolu və ürəyidir. Bu yerdə ilk kilsə XII əsrdə tikilib, bugünkü qotik binanın böyük hissəsi isə XIV–XV əsrlərdə, hersoq IV Rudolfun dövründə ucaldılıb. Damı rəngli, şirli kirəmitlərlə örtülüb və üzərində Habsburqların ikibaşlı qartalı görünür. 1945-ci ildə müharibənin son günlərində kafedral yanğından ağır zərər görüb, sonra bütün Avstriyanın köməyi ilə bərpa olunub. Motsart burada evlənib, onun dəfn mərasimi də bu kafedralda keçirilib.", f: ["Cənub qülləsi 136 m-dir — ora təxminən 343 pillə ilə qalxmaq olur", "Damda 230 mindən çox şirli kirəmit var", "Pummerin — Avstriyanın ən böyük zəngi şimal qülləsindədir"], t: "Daxilə giriş pulsuzdur. Mənzərə üçün cənub qülləsinə pillə ilə, liftlə isə şimal qülləsinə qalxmaq olar." },
  hofburg: { s: "Hofburq 600 ildən çox Habsburq imperatorlarının qış iqamətgahı olub — XIII əsrdən 1918-ci ilə qədər. Kompleks əsrlər boyu genişlənib və bu gün təxminən 2600 otaqdan ibarət bütöv bir şəhər kimidir. İçində İmperator mənzilləri, imperatriça Elizabetin — hamının “Sisi” kimi tanıdığı gözəl, amma bədbəxt taleli imperatriçanın muzeyi və saray gümüş kolleksiyası var. Bu gün binanın bir hissəsində Avstriya prezidentinin ofisi yerləşir.", f: ["Sisi 1854-cü ildə 16 yaşında Frans İosiflə evlənib", "Sisi 1898-ci ildə Cenevrədə sui-qəsd nəticəsində öldürülüb", "İspan Süvari Məktəbi və Milli Kitabxana da Hofburqun içindədir"], t: "Bir bilet üç hissəni əhatə edir: Sisi Muzeyi, İmperator mənzilləri və Gümüş kolleksiyası." },
  reitschule: { s: "İspan Süvari Məktəbi dünyanın klassik atçılıq ənənəsini qoruyan ən qədim məktəblərindən biridir — ilk dəfə 1565-ci ildə qeyd olunub. Adı İspaniyadan gələn at cinsindən götürülüb. Burada ancaq ağ Lipitsan atları çıxış edir; onlar doğulanda qara və ya boz olur, yalnız bir neçə ildən sonra ağarırlar. Çıxışlar barokko üslublu Qış manejində keçirilir — bu zal XVIII əsrin əvvəllərində tikilib.", f: ["Lipitsan atları doğulanda tünd rəngdə olur", "Qış manejini Fişer fon Erlax (oğul) layihələndirib", "Ənənə UNESCO-nun qeyri-maddi irs siyahısındadır"], t: "Səhər məşqlərinə bilet tamaşadan ucuzdur — tarixləri rəsmi saytda yoxla." },
  staatsoper: { s: "Vyana Dövlət Operası 1869-cu ildə Motsartın “Don Juan” operası ilə açılıb. Bina əvvəlcə vyanalılara xoş gəlməyib, tənqid memarlara çox ağır təsir edib. 1945-ci ildə bombardmanda bina demək olar ki, tam yanıb, 1955-ci ildə Bethovenin “Fidelio” operası ilə yenidən açılıb. Bu gün dünyanın ən çox tamaşa göstərən opera teatrlarından biridir və hər il burada məşhur Opera Balı keçirilir.", f: ["Açılış: 25 may 1869, Motsartın “Don Juan”ı", "Yenidən açılış: 1955, Bethovenin “Fidelio”su", "Orkestrin musiqiçiləri həm də Vyana Filarmoniyasında çalır"], t: "Tamaşaya bilet tapmasan, gündüz bina turu var. Ucuz ayaqüstü biletlər də satılır." },
  albertina: { s: "Albertina Habsburq saray binasında yerləşir və adını Saksoniya-Teşen hersoqu Albertdən alıb — kolleksiyanın əsasını o qoyub. Muzey dünyanın ən böyük qrafika (rəsm və qravüra) kolleksiyalarından birini saxlayır. Ən məşhur əsəri Albrecht Dürerin 1502-ci ildə çəkdiyi “Dovşan”dır; orijinal çox həssas olduğu üçün nadir hallarda nümayiş olunur. Daimi sərgidə Monedən Pikassoya qədər məşhur rəssamların əsərləri var.", f: ["Dürerin “Dovşan”ı 1502-ci ildə çəkilib", "Daimi sərgi: Mone, Degas, Pikasso, Şagal və b.", "Bina Hofburqun bir hissəsidir"], t: "Muzeyin terrasından Opera binasının gözəl mənzərəsi açılır — giriş pulsuzdur." },
  rathaus: { s: "Vyana Bələdiyyəsi (Rathaus) 1872–1883-cü illərdə memar Fridrix fon Şmidt tərəfindən neoqotik üslubda tikilib. Mərkəzi qüllənin zirvəsində “Rathausmann” — dəmir cəngavər fiquru durur və şəhərin simvollarından biridir. Binanın qarşısındakı meydanda qışda Vyananın ən məşhur Milad bazarı və konki meydançası qurulur, yayda isə film festivalı keçirilir.", f: ["Tikinti 1872–1883", "Memar: Fridrix fon Şmidt", "Qüllədə “Rathausmann” cəngavər fiquru var"], t: "Axşam işıqlarında daha gözəldir — Milad bazarı ilə birlikdə gəz." },
  parlament: { s: "Avstriya Parlamenti 1874–1883-cü illərdə Danimarkalı memar Teofil Hansen tərəfindən qədim Yunan üslubunda tikilib — demokratiyanın beşiyi olan Yunanıstana işarə kimi. Qarşısında müdriklik ilahəsi Pallas Afinanın böyük fəvvarəsi durur. Bina uzun təmirdən sonra 2023-cü ildə yenidən açılıb.", f: ["Memar: Teofil Hansen", "Qarşıda Pallas Afina fəvvarəsi var", "2023-cü ildə təmirdən sonra açılıb"], t: "Ziyarətçi mərkəzi və pulsuz turlar ola bilər — saytda yoxla." },
  votiv: { s: "Votivkirche 1853-cü ildə imperator Frans İosifə edilən uğursuz sui-qəsddən sonra şükür əlaməti olaraq tikilib. Memar Haynrix fon Ferstel neoqotik üslubda iki hündür qülləli bu kilsəni layihələndirib, kilsə 1879-cu ildə təqdis olunub. Vyananın ən gözəl neoqotik binalarından biri sayılır.", f: ["1853-cü il sui-qəsdindən sonra tikilib", "Memar: Haynrix fon Ferstel", "1879-cu ildə təqdis olunub"], t: "Qarşısındakı Sigmund Freud parkından ən yaxşı foto bucağı alınır." },
  khm: { s: "Kunsthistorisches Museum — Sənət Tarixi Muzeyi 1891-ci ildə imperator Frans İosif tərəfindən açılıb və Habsburqların əsrlər boyu topladığı sənət xəzinələrini nümayiş etdirir. Burada dünyada Pieter Brueqelin ən böyük rəsm kolleksiyası, Vermeer, Rafael, Titsian və Rembrandtın əsərləri var. Binanın özü də sənət əsəridir: mərmər pilləkən zalı və günbəz altındakı kafe Vyananın ən gözəl interyerlərindəndir.", f: ["1891-ci ildə açılıb", "Brueqelin dünyada ən böyük kolleksiyası buradadır", "Qarşısında əkiz binası — Təbiət Tarixi Muzeyi durur"], t: "2–3 saat ayır, günbəz altındakı kafedə qəhvə iç." },
  nhm: { s: "Təbiət Tarixi Muzeyi 1889-cu ildə açılıb və Sənət Tarixi Muzeyinin əkiz binasıdır. Ən məşhur eksponatı təxminən 30 min il yaşı olan kiçik “Villendorf Venerası” heykəlciyidir. Dinozavr zalı, meteoritlər və qiymətli daşlar kolleksiyası da çox populyardır.", f: ["1889-cu ildə açılıb", "Villendorf Venerası ~30 min il yaşındadır", "Dinozavr skeletləri və meteorit kolleksiyası var"], t: "KHM-lə eyni meydandadır — ikisini bir günə sığışdırma, yorucudur." },
  karlskirche: { s: "Karlskirche 1713-cü il taun epidemiyasından sonra imperator VI Karlın andı ilə tikilib və Müqəddəs Karl Borromeyə həsr olunub. Memar İohann Bernhard Fişer fon Erlax olub, işi oğlu tamamlayıb. Fasadın iki tərəfindəki nəhəng sütunlar Romadakı Trayan sütunundan ilhamlanıb. Vyananın ən gözəl barokko kilsəsi sayılır.", f: ["Tikinti: 1716–1737", "İki sütun Romadakı Trayan sütununa bənzədilib", "Günbəzdə Rotmayrın freskaları var"], t: "Qarşısındakı hovuzda kilsənin əksi gözəl foto verir; qışda burada kiçik Milad bazarı olur." },
  belvedere: { s: "Belvedere sarayı türklərə qarşı döyüşlərdə məşhurlaşmış Savoyalı Şahzadə Eugen üçün memar Lukas fon Hildebrandt tərəfindən tikilib; Yuxarı Belvedere 1723-cü ildə tamamlanıb. Bu gün burada Qustav Klimtin dünyada ən böyük rəsm kolleksiyası saxlanır — o cümlədən məşhur “Öpüş” (1908–1909). Saraylar arasındakı barokko bağdan şəhərin gözəl mənzərəsi görünür.", f: ["Şahzadə Eugen üçün tikilib", "Klimtin “Öpüş” əsəri buradadır", "Yuxarı Belvedere 1723-də tamamlanıb"], t: "“Öpüş” Yuxarı Belvederedədir — bileti ora al." },
  schonbrunn: { s: "Schönbrunn Habsburqların yay iqamətgahı olub və 1441 otağı var. İmperatriça Mariya Tereza sarayı bugünkü görünüşünə gətirib. 1762-ci ildə altı yaşlı Motsart burada imperator ailəsi üçün çalıb. İmperator Frans İosif bu sarayda doğulub (1830) və burada vəfat edib (1916). Saray və bağları 1996-cı ildən UNESCO Dünya İrsi siyahısındadır.", f: ["1441 otaq", "Altı yaşlı Motsart 1762-də burada çıxış edib", "1996-dan UNESCO irsidir"], t: "Bilet vaxt slotu ilədir — onlayn al. Sonra təpədəki Gloriette-ə qalx." },
  gloriette: { s: "Gloriette 1775-ci ildə Schönbrunn parkının ən yüksək nöqtəsində zəfər tağı kimi tikilib. Buradan sarayın, parkın və bütün Vyananın panoraması açılır. İçində kafe var — imperator ailəsi bir vaxtlar burada səhər yeməyi yeyirdi.", f: ["1775-ci ildə tikilib", "Schönbrunn parkının ən hündür nöqtəsindədir", "İçində kafe işləyir"], t: "Gün batımında gəl — şəhər mənzərəsi ən gözəl o vaxtdır." },
  riesenrad: { s: "Prater-dəki Riesenrad 1897-ci ildə imperator Frans İosifin taxta çıxmasının 50 illiyi münasibətilə ingilis mühəndis Valter Basset tərəfindən tikilib. 1945-ci ildə yanğından sonra bərpa olunub. 1949-cu ildə çəkilmiş məşhur “Üçüncü adam” filmində görünəndən sonra dünyaca tanınıb. Təxminən 65 metr hündürlükdən şəhər mənzərəsi açılır.", f: ["1897-ci ildə tikilib", "Hündürlüyü təxminən 65 m", "“Üçüncü adam” filmində çəkilib"], t: "Axşam, şəhər işıqlarında min — onlayn bilet növbəni qısaldır." },
  hundertwasser: { s: "Hundertwasserhaus rəssam Fridensrayx Hundertvasserin ideyası ilə 1983–1985-ci illərdə tikilmiş yaşayış binasıdır. Burada düz xətt demək olar ki, yoxdur: döşəmələr dalğalı, pəncərələr müxtəlif ölçülü, damda və balkonlarda ağaclar bitir. Rəssam “düz xətt allahsızdır” deyirdi. Binada insanlar yaşadığı üçün içəri girmək olmur.", f: ["1983–1985-də tikilib", "İçəri giriş yoxdur — insanlar yaşayır", "Qarşıdakı Hundertwasser Village-də suvenir dükanları var"], t: "Yaxınlıqdakı KunstHausWien muzeyində rəssamın əsərlərini görmək olar." },
  kunsthaus: { s: "KunstHausWien 1991-ci ildə açılıb və Hundertvasserin özünün dizayn etdiyi muzeydir. Burada onun rəsmləri, qrafikası və ekoloji memarlıq ideyaları nümayiş olunur. Bina da Hundertwasserhaus kimi rəngli və əyri xətlidir.", f: ["1991-ci ildə açılıb", "Hundertvasserin əsərlərinin daimi sərgisi", "Rəngli, əyri xətli fasad"], t: "Hundertwasserhaus-dan 5 dəqiqəlik məsafədədir — ikisini birlikdə gəz." },
  peterskirche: { s: "Peterskirche Graben küçəsinin yanında, gizlənmiş kimi duran barokko kilsəsidir. Bugünkü bina XVIII əsrin əvvəllərində tikilib və Romadakı Müqəddəs Pyotr bazilikasından ilham alıb. İçəridə qızılı bəzəkli, oval planlı interyer və günbəz freskası diqqəti çəkir.", f: ["Barokko üslubu", "Oval plan, böyük günbəz", "Romadakı Müqəddəs Pyotrdan ilham alıb"], t: "Tez-tez pulsuz orqan konsertləri olur — girişdəki elana bax." },
  graben: { s: "Graben Vyananın ən məşhur piyada küçəsidir; adı Roma dövründəki xəndəkdən gəlir. Ortadakı Taun sütunu (Pestsäule) 1679-cu il taun epidemiyasından sonra imperator I Leopoldun əmri ilə ucaldılıb. Küçə lüks mağazalar və kafelərlə doludur, Milad dövründə işıqlandırma xüsusilə gözəldir.", f: ["Adı “xəndək” deməkdir", "Taun sütunu 1679-cu il epidemiyasının xatirəsidir", "Kohlmarkt ilə Hofburqa çıxır"], t: "Axşam işıqlarında gəz, Kohlmarkt üzərindən Hofburqa get." },
  ankeruhr: { s: "Ankeruhr Hoher Markt meydanında iki binanı birləşdirən körpünün üzərindəki art nuvo saatıdır. 1911–1914-cü illərdə rəssam Frans Mətş tərəfindən yaradılıb. Saatın üzərində Vyana tarixinin 12 məşhur şəxsiyyətinin fiqurları gün ərzində bir-bir keçir.", f: ["1911–1914-də yaradılıb", "12 tarixi fiqur var", "Saat 12:00-da bütün fiqurlar musiqi ilə keçir"], t: "Günorta 12:00-da gəl — bütün fiqurlar musiqi ilə parad keçir." },
  kapuziner: { s: "Kapuzinergruft — İmperator məqbərəsi 1633-cü ildən Habsburq ailəsinin dəfn yeridir. Burada 150-yə yaxın Habsburq, o cümlədən Mariya Tereza (əri ilə birlikdə böyük barokko sarkofaqda), imperator Frans İosif, Sisi və oğulları Rudolf uyuyur.", f: ["1633-cü ildən istifadə olunur", "Mariya Terezanın ikili sarkofaqı buradadır", "Sisi və Frans İosif də buradadır"], t: "Qısa ziyarətdir (30–40 dəq) — Neuer Markt meydanındadır." },
  hausdermusik: { s: "Haus der Musik interaktiv səs və musiqi muzeyidir. Bina vaxtilə Vyana Filarmoniyasının qurucusu Otto Nikolainin yaşadığı evdir. Burada virtual olaraq Vyana Filarmoniyasını idarə edə, səslərlə oynaya və Vyana bəstəkarlarını — Motsart, Bethoven, Ştraus və başqalarını tanıya bilərsən.", f: ["Filarmoniyanı virtual dirijor kimi idarə etmək olar", "Bina Otto Nikolainin evi olub", "Uşaqlar və böyüklər üçün interaktivdir"], t: "Otelə çox yaxındır — yağışlı və ya soyuq axşam üçün əla seçimdir." },
  mozarthaus: { s: "Mozarthaus — Motsartın Vyanada yaşadığı mənzillərdən bu günə qalan yeganəsidir. Bəstəkar burada 1784–1787-ci illərdə yaşayıb və məşhur “Fiqaronun toyu” operasını bu evdə yazıb. Muzey onun Vyana həyatını, dostlarını və musiqisini göstərir.", f: ["Motsart burada 1784–1787-də yaşayıb", "“Fiqaronun toyu” burada yazılıb", "Stephansdomun arxasındadır"], t: "Stephansdomdan 2 dəqiqəlik yoldur." },
  stadtpark: { s: "Stadtpark 1862-ci ildə açılıb və Vyananın ilk ictimai parkıdır. Ən məşhur yeri “vals kralı” İohann Ştrausun qızılı heykəlidir — Vyananın ən çox fotosu çəkilən abidələrindən biri. Park otelinizə çox yaxındır.", f: ["1862-ci ildə açılıb", "İohann Ştrausun qızılı heykəli buradadır", "Wien Mitte-yə yaxındır"], t: "Qızılı Ştraus heykəli ilə foto çəkdir — otelə 5–7 dəqiqədir." },
  secession: { s: "Secession binası 1897–1898-ci illərdə memar Yozef Mariya Olbrix tərəfindən Vyana Secession rəssamlar birliyi üçün tikilib. Damdakı qızılı “kələm” — əslində dəfnə yarpaqlarından günbəzdir. Girişdə “Hər dövrə öz sənəti, sənətə öz azadlığı” şüarı yazılıb. Zirzəmidə Klimtin məşhur “Bethoven frizi” saxlanır.", f: ["1897–1898-də tikilib", "Qızılı günbəz dəfnə yarpaqlarındandır", "Klimtin “Bethoven frizi” buradadır"], t: "Naschmarkt-ın başlanğıcındadır — ikisini birlikdə gəz." },
  heldenplatz: { s: "Heldenplatz — Qəhrəmanlar meydanı Hofburqun qarşısındakı geniş meydandır. Meydanda Savoyalı Şahzadə Eugen və Arxihersoq Karlın atlı heykəlləri durur. Yeni Hofburqun balkonu tarixdə ağır bir hadisə ilə yadda qalıb: 1938-ci ildə Avstriyanın Almaniyaya birləşdirilməsi burada elan edilib.", f: ["İki atlı heykəl: Eugen və Karl", "Yeni Hofburqun yarımdairəvi fasadı", "Volksgarten və Burggarten yanındadır"], t: "Hofburqdan Parlamentə gedərkən meydandan keç." },
  burggarten: { s: "Burggarten vaxtilə imperator ailəsinin şəxsi bağı olub. Burada art nuvo üslubunda şüşə Palmenhaus (1901–1905) və skripka açarı formasında gül yatağı olan Motsart abidəsi var. Palmenhaus-da kafe-restoran işləyir.", f: ["İmperatorun şəxsi bağı olub", "Palmenhaus art nuvo istixanasıdır", "Motsart abidəsi önündə skripka açarı var"], t: "Motsart abidəsi ilə foto çəkdir — Albertinadan 2 dəqiqədir." },
  donauturm: { s: "Donauturm 1964-cü ildə tikilib və Avstriyanın ən hündür tikilisidir — təxminən 252 metr. Təxminən 170 metr hündürlükdə fırlanan restoran və kafe var, buradan bütün Vyana və Dunay görünür.", f: ["1964-cü ildə tikilib", "Hündürlüyü ~252 m", "Fırlanan restoran var"], t: "Mərkəzdən uzaqdır — taksi ilə get, aydın havada çıx." },
  judenplatz: { s: "Judenplatz orta əsrlərdə Vyananın yəhudi məhəlləsinin mərkəzi olub. Meydandakı Holokost xatirə abidəsi (2000) ingilis heykəltaraş Reyçel Uaytrid tərəfindən “içəri çevrilmiş kitabxana” şəklində yaradılıb. Altında orta əsr sinaqoqunun qalıqları tapılıb.", f: ["Holokost abidəsi 2000-ci ildə açılıb", "Abidə “adsız kitabxana” adlanır", "Orta əsr sinaqoqunun qalıqları var"], t: "Sakit meydandır — Am Hof-a 2 dəqiqəlik yoldur." },
  ruprecht: { s: "Ruprechtskirche Vyananın ən qədim kilsəsi hesab olunur. Sadə roman üslublu bu kiçik kilsə şəhərin ən qədim hissəsində, Dunay kanalının yaxınlığında durur.", f: ["Vyananın ən qədim kilsəsi sayılır", "Roman üslubu", "Köhnə şəhərin şimal kənarında"], t: "Yaxınlıqdakı Bermudadreieck küçələrində kafe və barlar var." },
  minoriten: { s: "Minoritenkirche qotik üslubda XIV əsrdə tikilib. İçəridə Leonardo da Vinçinin “Son şam yeməyi” əsərinin böyük mozaika surəti var — onu Napoleon sifariş edib.", f: ["XIV əsr qotik kilsəsi", "“Son şam yeməyi”nin mozaika surəti", "Hofburqa çox yaxındır"], t: "Hofburqdan çıxanda 2 dəqiqəlik baxış üçün gir." },
  augustiner: { s: "Augustinerkirche Habsburq sarayının kilsəsi olub. Burada Mariya Tereza (1736) və Frans İosif ilə Sisi (1854) evləniblər. Kilsədəki “Ürəklər məqbərəsi”ndə Habsburqların ürəkləri gümüş qablarda saxlanır.", f: ["Sisi ilə Frans İosifin toyu burada olub", "Habsburqların ürəkləri burada saxlanır", "Hofburqun bir hissəsidir"], t: "Albertinanın yanındadır — kilsə pulsuzdur." },
};


// ---------- guides (static, verified Nov 2026) ----------
const MARKETS = [
  { id: "xm-rathaus", when: "13.11–26.12", hrs: "hər gün 10:00–22:00", why: "Ən böyük və ən məşhur bazar; işıqlandırılmış park, Rathaus fonu.", eat: "Kartoffelpuffer (kartof blini), Maroni (qızardılmış şabalıd), Langos" },
  { id: "xm-schonbrunn", when: "6.11–6.1", hrs: "hər gün 10:00–21:00", why: "Saray həyətində, ən “imperator” atmosferli bazar.", eat: "Kaiserschmarrn, isti Punsch, şokoladlı meyvə" },
  { id: "xm-stephan", when: "noyabr–dekabr", hrs: "həftəiçi 14:00-dan", why: "Kafedralın düz yanında — gəzinti zamanı bir fincan Punsch üçün.", eat: "Glühwein / Kinderpunsch, Lebkuchen" },
  { id: "xm-karlsplatz", when: "13.11–23.12", hrs: "hər gün 12:00–20:00 (yemək 21:00-dək)", why: "Kütləvi suvenir yox — həqiqi sənətkar işləri, gözəl hədiyyələr.", eat: "Ekoloji Punsch, pendirli çörək" },
  { id: "xm-spittelberg", when: "13.11–23.12", hrs: "həftəiçi ~14:00-dan, axşam ~21:30-dək", why: "Dar, daş döşənmiş küçələrdə ən romantik bazar.", eat: "Əl işi hədiyyələr, isti içkilər" },
  { id: "xm-amhof", when: "13.11–23.12", hrs: "~10/11:00–21:00", why: "Sakit, kiçik bazar — antikvar və əl işləri.", eat: "Bratwurst (🐷 donuz əti ola bilər — soruş)" },
  { id: "xm-freyung", when: "13.11–23.12", hrs: "~10/11:00–21:00", why: "Ənənəvi Avstriya əl işləri, şam bəzəkləri.", eat: "Bal, şam, ağac oyuncaqlar" },
];
const MARKET_TIPS = [
  "🍷 Glühwein və Punsch alkoqolludur. Alkoqolsuz istəsən: <b>“Kinderpunsch, bitte”</b>.",
  "☕ Fincan üçün depozit (Häferlpfand) alınır — fincanı geri versən pul qaytarılır, saxlasan suvenir olur.",
  "🐷 Bratwurst, Käsekrainer, Leberkäse adətən donuz ətidir. Təhlükəsiz seçimlər: Langos, Maroni, Kartoffelpuffer, Kaiserschmarrn, şokoladlı meyvə.",
  "💳 Kiçik daxmaların çoxu yalnız nağd qəbul edir — 20–30 € nağd saxla.",
  "🕔 Ən gözəl vaxt: qaranlıq düşəndən sonra (16:30-dan) — işıqlar yanır.",
];
const SHOP_TIPS = [
  "🕘 Mağazalar adətən 10:00–19:00/20:00 açıqdır, şənbə 18:00-dək, <b>bazar günü bağlıdır</b>. Səfər çərşənbə axşamı–cümədir — hamısı açıq olacaq.",
  "🧾 Bir mağazada bir çekdə <b>75,01 €-dan çox</b> alsan “Tax free, bitte” de — ~12–14% geri alırsan. Parndorf-da bütün markalar tax-free-dir.",
  "🛍 Almadan əvvəl “🛍 Qiymət” ilə Bakı və Türkiyə qiymətini yoxla.",
  "🌧 Yağışlı gündə: The Mall Wien Mitte (otelə yaxın) və ya Donau Zentrum.",
];
const PARNDORF = { url: "https://www.mcarthurglen.com/en/outlets/at/designer-outlet-parndorf/plan-your-visit/", hrs: "B.e.–Cümə 9:00–21:00, Şənbə 9:00–18:00", shuttle: "Operanın qarşısından shuttle avtobus (onlayn bilet). Həftəiçi Vyanadan təxminən 9:30, 10:30, 11:30, 13:30; geri 16:00–20:00 arası. Dəqiq cədvəli saytda yoxla.", tip: "Yarım günlük plan lazımdır. 18 və ya 19 noyabr uyğundur." };

// Best photo spots: [where to stand, best time]
const PHOTO = {
  stephansdom: ["Stephansplatz-ın Graben tərəfindəki küncündən — bütün fasad və cənub qülləsi kadra sığır. Rəngli dam üçün şimal qülləsinə liftlə qalx.", "Mavi saat: gün batandan 20–30 dəq sonra (~16:45)"],
  karlskirche: ["Resselpark tərəfdə, hovuzun lap kənarından aşağı bucaqla — kilsə suda əks olunur.", "Axşam, işıqlar yananda"],
  belvedere: ["Aşağı bağdan Yuxarı Belvederəyə doğru, hovuzu önə alaraq.", "Gündüz, günəşli saatlarda"],
  schonbrunn: ["Gloriette təpəsindən saray və bütün şəhər bir kadrda. Həyətdə Milad bazarı ilə saray fasadı.", "Gün batımı (~16:15)"],
  gloriette: ["Gloriette-nin qarşısındakı hovuzun kənarından — tağlar suda əks olunur.", "Gün batımı"],
  hofburg: ["Michaelerplatz-dakı günbəzli girişin qarşısından; Heldenplatz-dan Yeni Hofburqun yarımdairəvi fasadı.", "Səhər, adam az olanda"],
  heldenplatz: ["Atlı heykəli önə alıb Yeni Hofburq fonunda.", "Gündüz"],
  rathaus: ["Burgtheater tərəfindən, Rathausplatz-ın ortasından — fasad və bazar işıqları birlikdə.", "Axşam, 17:00-dan sonra"],
  staatsoper: ["Opernring-in qarşı tərəfindən, Kärntner Straße küncündən.", "Axşam, işıqlandırılmış"],
  albertina: ["Albertina terrasından — Opera binası və Burggarten mənzərəsi.", "Gün batımı"],
  hundertwasser: ["Kegelgasse ilə Löwengasse küncündən — rəngli fasadın tamamı.", "Gündüz, rənglər parlaq olanda"],
  riesenrad: ["Prater girişindən aşağıdan yuxarı; kabinədən şəhər panoraması.", "Axşam işıqlarında"],
  graben: ["Taun sütununun önündən Stephansdoma doğru, Milad işıqları ilə.", "Axşam"],
  parlament: ["Ringstraße-nin qarşı tərəfindən, Pallas Afina fəvvarəsini önə alaraq.", "Gündüz və ya axşam"],
  votiv: ["Sigmund-Freud-Park-dan — iki qüllə tam görünür.", "Gün batımı"],
  secession: ["Friedrichstraße tərəfindən qızılı günbəzə yaxın plan.", "Günəşli gündüz"],
  stadtpark: ["Qızılı Ştraus heykəlinin düz qarşısından.", "Gündüz"],
  burggarten: ["Motsart heykəli və önündəki skripka açarı gül yatağı.", "Gündüz"],
  ankeruhr: ["Hoher Markt meydanından körpü-saata baxan bucaq.", "Saat 12:00 — fiqurların paradı"],
  "xm-rathaus": ["Girişdəki işıqlı tağın altından Rathausa doğru.", "Qaranlıq düşəndən sonra"],
};

// In-app user guide
const HELP = [
  ["🚀 İlk dəfə (2 dəqiqə)", `<ol><li>Kənanın göndərdiyi <b>şəxsi linki</b> Safari-də aç.</li><li>Aşağıda <b>Paylaş ⬆︎</b> → <b>“Ana ekrana əlavə et”</b>. Bundan sonra tətbiqi ana ekrandakı <b>W</b> ikonundan aç.</li><li>Yer icazəsi soruşanda <b>“İstifadə zamanı icazə ver”</b> seç.</li><li><b>📅 Rezervlər</b> → <b>🔔 Bildirişləri aç</b> → icazə ver. Səhər brifinqi və xatırlatmalar gələcək.</li></ol>`],
  ["🏠 Ana səhifə", `<ul><li><b>€ → ₼ konvertor</b>: məbləği yaz, manat və lirəni dərhal görürsən.</li><li><b>📷 Yeri tanı</b>: bina və ya abidənin şəklini çək, tarixini danışır və 🔊 ilə səsləndirir.</li><li><b>🛍 Qiymət</b>: məhsulun və ya etiketin şəklini çək, Bakı və Türkiyə qiymətini tapır. Tax-free nəzərə alınır.</li><li><b>🍽 Menyu</b>: menyunun şəklini çək, tərcümə edir və donuz ətini 🐷 ilə göstərir.</li><li><b>✨ İndi hara gedək?</b>: yaxınlıqda açıq və yüksək reytinqli yerlər.</li></ul>`],
  ["🔘 8 düymə", `<ul><li><b>🚕 Taksi</b>: otelə və ya sıradakı yerə Uber, Taxi 40100-ə zəng, sürücüyə göstərmək üçün iri ünvan.</li><li><b>📅 Rezervlər</b>: aldığınız bilet və masa sifarişləri; bilet QR-ı, “📅 Təqvimə” xatırlatması.</li><li><b>🛍 Alış-veriş</b>: Parndorf Outlet, lüks markalar, ticarət mərkəzləri.</li><li><b>🎄 Bazarlar</b>: Milad bazarları, saatları, nə yemək lazımdır.</li><li><b>📸 Foto</b>: ən gözəl foto bucaqları və vaxtları.</li><li><b>🎁 Hədiyyələr</b> 🔒: kimə nə alacağını yaz, alanda ✓ bas.</li><li><b>📔 Xatirələr</b> 🔒: gün-gün qeydlər, şəkillər; sonda PDF.</li><li><b>🆘 İtmişəm</b>: yerini qızlara göndərir, otelə taksi, 112.</li></ul>`],
  ["🗺 Xəritə", `<ul><li>Rəngli nöqtəyə toxun → məlumat, reytinq, bilet, foto məsləhəti.</li><li><b>🧭 Get</b> → yol, vaxt, yol boyu yerlər, <b>🚕 Taksi</b> qiyməti.</li><li><b>👭</b> düyməsi: yerini qızlarla paylaş, onları xəritədə gör (istədiyin vaxt söndür).</li><li><b>🏨</b>: otelə qayıt. <b>◎</b>: mən haradayam.</li></ul>`],
  ["🗣 Tərcümə", `<ul><li><b>Mən deyirəm</b>: azərbaycanca yaz (səhv yazsan da tapır) → almanca + oxunuşu. <b>🔊</b> səsləndirir, <b>⛶</b> ekranı satıcıya göstər.</li><li><b>Onlar deyir</b>: <b>🎤</b> bas, telefonu danışan adama tut — azərbaycanca və ya türkcə tərcümə çıxır.</li></ul>`],
  ["💶 Xərclər", `<ul><li><b>👭 Ortaq</b>: məbləğ → kim ödədi → kimlər üçün → Əlavə et. Hamı eyni siyahını görür, kim kimə borcludur avtomatik hesablanır. Borc qaytarılanda <b>✓ Ödəndi</b> bas.</li><li><b>👤 Mənim xərclərim</b> 🔒: paltar, kosmetika kimi şəxsi xərclər; yalnız sən görürsən.</li><li><b>🎯 Büdcə</b>: öz büdcəni yaz, nə qədər qaldığını görürsən.</li><li>Səhv yazsan <b>✎</b> ilə düzəlt. İnternet olmasa da yaz — sonra özü göndərir.</li><li>75 €-dan çox alanda kassada <b>“Tax free, bitte”</b> de və <b>🧾 Tax-free</b> işarələ.</li></ul>`],
  ["🗓 Plan bölməsi", `<ul><li><b>Plan</b>: hər günün proqramı, rezervlər də burada görünür; axşam günün xülasəsi.</li><li><b>Otel</b>: ünvan, zəng, check-in/check-out, taksi kartı.</li><li><b>Albom</b>: hamının şəkilləri. <b>Hazırlıq</b>: çanta siyahısı.</li><li><b>Məlumat</b>: bilet saytları, internetsiz iş, təcili nömrələr, tax-free, hava limanı.</li></ul>`],
  ["⚠️ Vacib", `<ul><li><b>20 noyabr</b>: 08:45-də oteldən çıxın → Wien Mitte → CAT avtobusu. Uçuş 12:00, <b>Terminal 1</b>.</li><li><b>Tax-free</b> çekləri: hava limanında <b>qeydiyyatdan ƏVVƏL</b> gömrükdə möhürlət.</li><li>Təcili yardım: <b>112</b>. Otel: Weihburggasse 18-20.</li><li>Kartla ödəyəndə terminal soruşsa, <b>avro (EUR)</b> seç.</li></ul>`],
  ["🔧 Problem olsa", `<ul><li>Tətbiqi tam bağla və yenidən aç — yeni versiya özü yüklənir.</li><li>“Link işləmir” yazsa: Kənanın göndərdiyi şəxsi linki yenidən aç.</li><li>Yer görünmürsə: Ayarlar → Məxfilik → Məkan xidmətləri → Safari → “İstifadə zamanı”.</li></ul>`],
];
