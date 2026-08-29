/**
 * @title       FILO · DINE — 외식업 통합 운영 플랫폼
 * @copyright   Copyright (c) 2024-2025 유한회사 엠비티아이 (MBTI Co., Ltd.)
 * @author      김형우 (kimdh4790@gmail.com)
 * @license     All Rights Reserved. 무단 복제·배포·수정 금지.
 * @module      filo-menu-templates.js
 * @description 업종별 기본 메뉴 템플릿 데이터 + 자동 등록 함수
 */
// 의존성: filo-common.js, filo-menu-image.js (_filoFetchMenuImage, _filoFillTemplateImages)
// 업종 키는 filo-common.js 의 _FILO_THEMES 와 동일.
// q  = Pexels 검색어 (worker /api/menu-image 로 전달)
// tr = EN/中/日 번역 (등록 즉시 다국어 주문 페이지 노출)
var _FILO_MENU_TEMPLATES = {
 /* ────────────────── 카페 (30 items) ────────────────── */
 cafe: [
  {name:'에스프레소',price:3000,category:'에스프레소',q:'espresso shot cup',tr:{en:'Espresso',zh:'浓缩咖啡',ja:'エスプレッソ'}},
  {name:'아메리카노(ICE)',price:4000,category:'아메리카노',q:'iced americano coffee glass',tr:{en:'Iced Americano',zh:'冰美式',ja:'アイスアメリカーノ'}},
  {name:'아메리카노(HOT)',price:4000,category:'아메리카노',q:'hot americano coffee cup',tr:{en:'Hot Americano',zh:'热美式',ja:'ホットアメリカーノ'}},
  {name:'드립커피',price:5000,category:'아메리카노',q:'pour over drip coffee cup',tr:{en:'Drip Coffee',zh:'手冲咖啡',ja:'ドリップコーヒー'}},
  {name:'카페라떼(ICE)',price:5000,category:'라떼',q:'iced cafe latte glass',tr:{en:'Iced Cafe Latte',zh:'冰拿铁',ja:'アイスラテ'}},
  {name:'카페라떼(HOT)',price:5000,category:'라떼',q:'hot cafe latte art cup',tr:{en:'Hot Cafe Latte',zh:'热拿铁',ja:'ホットラテ'}},
  {name:'카푸치노',price:5000,category:'라떼',q:'cappuccino foam art cup',tr:{en:'Cappuccino',zh:'卡布奇诺',ja:'カプチーノ'}},
  {name:'바닐라라떼',price:5500,category:'라떼',q:'vanilla latte coffee cup',tr:{en:'Vanilla Latte',zh:'香草拿铁',ja:'バニララテ'}},
  {name:'카라멜마키아토',price:5500,category:'라떼',q:'caramel macchiato coffee drink',tr:{en:'Caramel Macchiato',zh:'焦糖玛奇朵',ja:'キャラメルマキアート'}},
  {name:'플랫화이트',price:5500,category:'라떼',q:'flat white coffee small cup',tr:{en:'Flat White',zh:'白咖啡',ja:'フラットホワイト'}},
  {name:'말차라떼(ICE)',price:5500,category:'논커피',q:'iced matcha green tea latte',tr:{en:'Iced Matcha Latte',zh:'冰抹茶拿铁',ja:'アイス抹茶ラテ'}},
  {name:'말차라떼(HOT)',price:5500,category:'논커피',q:'hot matcha green tea latte cup',tr:{en:'Hot Matcha Latte',zh:'热抹茶拿铁',ja:'ホット抹茶ラテ'}},
  {name:'초코라떼',price:5000,category:'논커피',q:'hot chocolate cocoa latte cup',tr:{en:'Chocolate Latte',zh:'巧克力拿铁',ja:'チョコレートラテ'}},
  {name:'얼그레이라떼',price:5000,category:'논커피',q:'earl grey tea latte cup',tr:{en:'Earl Grey Latte',zh:'伯爵奶茶',ja:'アールグレイラテ'}},
  {name:'히비스커스티',price:4500,category:'논커피',q:'hibiscus herbal tea red cup',tr:{en:'Hibiscus Tea',zh:'玫瑰花茶',ja:'ハイビスカスティー'}},
  {name:'자몽에이드',price:5500,category:'에이드',q:'grapefruit ade sparkling soda glass',tr:{en:'Grapefruit Ade',zh:'西柚气泡饮',ja:'グレープフルーツエード'}},
  {name:'레몬에이드',price:5500,category:'에이드',q:'lemon ade sparkling drink glass',tr:{en:'Lemon Ade',zh:'柠檬气泡饮',ja:'レモンエード'}},
  {name:'청포도에이드',price:5500,category:'에이드',q:'green grape ade soda drink',tr:{en:'Green Grape Ade',zh:'青葡萄气泡饮',ja:'グリーングレープエード'}},
  {name:'딸기에이드',price:5500,category:'에이드',q:'strawberry ade pink soda drink',tr:{en:'Strawberry Ade',zh:'草莓气泡饮',ja:'ストロベリーエード'}},
  {name:'복숭아아이스티',price:5000,category:'에이드',q:'peach iced tea glass summer',tr:{en:'Peach Iced Tea',zh:'桃子冰茶',ja:'ピーチアイスティー'}},
  {name:'크로와상',price:3500,category:'베이커리',q:'golden croissant bakery close up',tr:{en:'Croissant',zh:'可颂',ja:'クロワッサン'}},
  {name:'소금빵',price:2500,category:'베이커리',q:'salt bread roll butter baked',tr:{en:'Salt Bread',zh:'盐面包',ja:'塩パン'}},
  {name:'크림치즈베이글',price:4500,category:'베이커리',q:'cream cheese bagel sandwich',tr:{en:'Cream Cheese Bagel',zh:'奶油芝士贝果',ja:'クリームチーズベーグル'}},
  {name:'버터스콘',price:3500,category:'베이커리',q:'butter scone bakery plate',tr:{en:'Butter Scone',zh:'黄油司康',ja:'バタースコーン'}},
  {name:'마들렌(2pc)',price:3000,category:'베이커리',q:'madeleine french cake close up',tr:{en:'Madeleine (2pc)',zh:'玛德莲蛋糕(2个)',ja:'マドレーヌ(2個)'}},
  {name:'에그타르트',price:3000,category:'베이커리',q:'egg tart custard pastry',tr:{en:'Egg Tart',zh:'蛋挞',ja:'エッグタルト'}},
  {name:'뉴욕치즈케이크',price:6500,category:'디저트',q:'new york cheesecake slice plate',tr:{en:'NY Cheesecake',zh:'纽约芝士蛋糕',ja:'NYチーズケーキ'}},
  {name:'티라미수',price:6000,category:'디저트',q:'tiramisu dessert cup plate',tr:{en:'Tiramisu',zh:'提拉米苏',ja:'ティラミス'}},
  {name:'초코브라우니',price:4500,category:'디저트',q:'chocolate brownie cake fudge',tr:{en:'Chocolate Brownie',zh:'巧克力布朗尼',ja:'チョコブラウニー'}},
  {name:'딸기케이크(슬라이스)',price:7000,category:'디저트',q:'strawberry cream cake slice',tr:{en:'Strawberry Cake Slice',zh:'草莓蛋糕(片)',ja:'いちごケーキ(スライス)'}}
 ],
 /* ────────────────── 한식당 (28 items) ────────────────── */
 korean: [
  {name:'된장찌개',price:8000,category:'찌개/국',q:'korean doenjang jjigae soybean stew',tr:{en:'Soybean Paste Stew',zh:'大酱汤',ja:'テンジャンチゲ'}},
  {name:'김치찌개',price:8000,category:'찌개/국',q:'kimchi jjigae stew korean pork',tr:{en:'Kimchi Stew',zh:'泡菜汤',ja:'キムチチゲ'}},
  {name:'순두부찌개',price:8000,category:'찌개/국',q:'sundubu jjigae soft tofu stew spicy',tr:{en:'Soft Tofu Stew',zh:'嫩豆腐汤',ja:'スンドゥブチゲ'}},
  {name:'부대찌개(2인)',price:20000,category:'찌개/국',q:'budae jjigae army stew korean',tr:{en:'Army Stew (2 ppl)',zh:'部队火锅(2人)',ja:'ブデチゲ(2人前)'}},
  {name:'갈비탕',price:13000,category:'찌개/국',q:'korean galbitang short rib soup',tr:{en:'Short Rib Soup',zh:'排骨汤',ja:'カルビタン'}},
  {name:'설렁탕',price:11000,category:'찌개/국',q:'seolleongtang ox bone broth soup korean',tr:{en:'Ox Bone Soup',zh:'雪浓汤',ja:'ソルロンタン'}},
  {name:'비빔밥',price:9000,category:'밥류',q:'bibimbap korean colorful rice bowl',tr:{en:'Bibimbap',zh:'拌饭',ja:'ビビンバ'}},
  {name:'돌솥비빔밥',price:10000,category:'밥류',q:'dolsot bibimbap stone pot korean',tr:{en:'Stone Pot Bibimbap',zh:'石锅拌饭',ja:'石焼ビビンバ'}},
  {name:'제육볶음',price:10000,category:'밥류',q:'jeyuk bokkeum spicy pork stir fry',tr:{en:'Spicy Stir-fried Pork',zh:'辣炒猪肉',ja:'チェユクボックム'}},
  {name:'오징어볶음',price:10000,category:'밥류',q:'ojingeo bokkeum spicy squid stir fry',tr:{en:'Spicy Stir-fried Squid',zh:'辣炒鱿鱼',ja:'イカ炒め'}},
  {name:'닭갈비',price:11000,category:'밥류',q:'dak galbi spicy chicken stir fry korean',tr:{en:'Spicy Chicken Stir-fry',zh:'辣炒鸡肉',ja:'タッカルビ'}},
  {name:'불고기덮밥',price:11000,category:'밥류',q:'bulgogi rice bowl korean beef',tr:{en:'Bulgogi Rice Bowl',zh:'烤牛肉饭',ja:'プルコギ丼'}},
  {name:'공기밥',price:1000,category:'사이드',q:'steamed white rice bowl korean',tr:{en:'Steamed Rice',zh:'米饭',ja:'ライス'}},
  {name:'삼겹살(200g)',price:15000,category:'구이',q:'samgyeopsal pork belly grill korean',tr:{en:'Pork Belly (200g)',zh:'五花肉(200g)',ja:'サムギョプサル(200g)'}},
  {name:'목살(200g)',price:14000,category:'구이',q:'moksal pork neck grill korean',tr:{en:'Pork Neck (200g)',zh:'梅花肉(200g)',ja:'豚首肉(200g)'}},
  {name:'불고기(200g)',price:16000,category:'구이',q:'bulgogi korean marinated beef grill',tr:{en:'Bulgogi (200g)',zh:'烤牛肉(200g)',ja:'プルコギ(200g)'}},
  {name:'물냉면',price:10000,category:'면류',q:'mul naengmyeon cold buckwheat noodle soup',tr:{en:'Cold Noodle Soup',zh:'水冷面',ja:'水冷麺'}},
  {name:'비빔냉면',price:10000,category:'면류',q:'bibim naengmyeon spicy mixed cold noodles',tr:{en:'Spicy Mixed Cold Noodles',zh:'拌冷面',ja:'ビビン冷麺'}},
  {name:'칼국수',price:9000,category:'면류',q:'kalguksu knife cut noodle soup korean',tr:{en:'Knife-cut Noodle Soup',zh:'刀切面',ja:'カルグクス'}},
  {name:'잔치국수',price:8000,category:'면류',q:'janchi guksu vermicelli noodle soup',tr:{en:'Vermicelli Noodle Soup',zh:'宴会面条',ja:'ジャンチグクス'}},
  {name:'파전',price:10000,category:'전',q:'pajeon korean green onion pancake',tr:{en:'Green Onion Pancake',zh:'葱饼',ja:'パジョン'}},
  {name:'김치전',price:10000,category:'전',q:'kimchi jeon korean pancake',tr:{en:'Kimchi Pancake',zh:'泡菜煎饼',ja:'キムチチヂミ'}},
  {name:'해물파전',price:14000,category:'전',q:'haemul pajeon seafood pancake korean',tr:{en:'Seafood Green Onion Pancake',zh:'海鲜葱饼',ja:'海鮮パジョン'}},
  {name:'계란찜',price:4000,category:'사이드',q:'gyeran jjim steamed egg korean',tr:{en:'Steamed Egg',zh:'鸡蛋羹',ja:'ケランチム'}},
  {name:'두부김치',price:11000,category:'사이드',q:'dubu kimchi tofu kimchi korean',tr:{en:'Tofu & Kimchi',zh:'豆腐泡菜',ja:'豆腐キムチ'}},
  {name:'막걸리',price:5000,category:'음료',q:'makgeolli korean rice wine bowl',tr:{en:'Makgeolli',zh:'马格利',ja:'マッコリ'}},
  {name:'소주',price:4000,category:'음료',q:'soju korean spirit bottle glass',tr:{en:'Soju',zh:'烧酒',ja:'焼酎'}},
  {name:'생맥주(500ml)',price:5000,category:'음료',q:'draft beer cold glass pint',tr:{en:'Draft Beer (500ml)',zh:'生啤(500ml)',ja:'生ビール(500ml)'}}
 ],
 /* ────────────────── 일식/횟집 (30 items) ────────────────── */
 japanese: [
  {name:'연어초밥(2pc)',price:5000,category:'초밥',q:'salmon nigiri sushi pair',tr:{en:'Salmon Sushi (2pc)',zh:'三文鱼寿司(2贯)',ja:'サーモン寿司(2貫)'}},
  {name:'참치초밥(2pc)',price:5000,category:'초밥',q:'tuna nigiri sushi dark red',tr:{en:'Tuna Sushi (2pc)',zh:'金枪鱼寿司(2贯)',ja:'マグロ寿司(2貫)'}},
  {name:'광어초밥(2pc)',price:5000,category:'초밥',q:'halibut flounder sushi nigiri',tr:{en:'Flounder Sushi (2pc)',zh:'比目鱼寿司(2贯)',ja:'ヒラメ寿司(2貫)'}},
  {name:'새우초밥(2pc)',price:4000,category:'초밥',q:'prawn shrimp nigiri sushi',tr:{en:'Shrimp Sushi (2pc)',zh:'虾寿司(2贯)',ja:'エビ寿司(2貫)'}},
  {name:'우니(성게)초밥(1pc)',price:6000,category:'초밥',q:'uni sea urchin sushi nigiri',tr:{en:'Sea Urchin Sushi (1pc)',zh:'海胆寿司(1贯)',ja:'ウニ寿司(1貫)'}},
  {name:'초밥 10pc 세트',price:22000,category:'세트',q:'sushi set platter 10 pieces',tr:{en:'Sushi Set (10pc)',zh:'寿司套餐(10贯)',ja:'寿司セット(10貫)'}},
  {name:'초밥 20pc 세트',price:42000,category:'세트',q:'large sushi platter assorted 20 pieces',tr:{en:'Sushi Set (20pc)',zh:'寿司套餐(20贯)',ja:'寿司セット(20貫)'}},
  {name:'스파이시참치롤(8pc)',price:14000,category:'롤',q:'spicy tuna roll maki sushi',tr:{en:'Spicy Tuna Roll (8pc)',zh:'辣金枪鱼卷(8件)',ja:'スパイシーツナロール(8pc)'}},
  {name:'새우튀김롤(8pc)',price:13000,category:'롤',q:'shrimp tempura roll maki',tr:{en:'Shrimp Tempura Roll (8pc)',zh:'炸虾卷(8件)',ja:'エビ天巻き(8pc)'}},
  {name:'아보카도연어롤(8pc)',price:15000,category:'롤',q:'avocado salmon roll maki sushi',tr:{en:'Avocado Salmon Roll (8pc)',zh:'牛油果三文鱼卷(8件)',ja:'アボカドサーモンロール(8pc)'}},
  {name:'크런치롤(8pc)',price:14000,category:'롤',q:'crunchy roll tempura maki sushi',tr:{en:'Crunchy Roll (8pc)',zh:'脆皮卷(8件)',ja:'クランチーロール(8pc)'}},
  {name:'광어회(소)',price:38000,category:'회',q:'flounder halibut sashimi platter',tr:{en:'Flounder Sashimi (S)',zh:'比目鱼刺身(小)',ja:'ヒラメ刺身(小)'}},
  {name:'연어회(소)',price:35000,category:'회',q:'salmon sashimi plate orange slices',tr:{en:'Salmon Sashimi (S)',zh:'三文鱼刺身(小)',ja:'サーモン刺身(小)'}},
  {name:'모둠회(중)',price:55000,category:'회',q:'assorted sashimi platter premium',tr:{en:'Assorted Sashimi (M)',zh:'什锦刺身(中)',ja:'刺身盛り合わせ(中)'}},
  {name:'참치회(소)',price:42000,category:'회',q:'tuna sashimi slices plate',tr:{en:'Tuna Sashimi (S)',zh:'金枪鱼刺身(小)',ja:'マグロ刺身(小)'}},
  {name:'우동(미소/간장)',price:9000,category:'면류',q:'japanese udon noodle soup bowl',tr:{en:'Udon Noodle Soup',zh:'乌冬面',ja:'うどん'}},
  {name:'소바(냉)',price:10000,category:'면류',q:'cold soba buckwheat noodle japanese',tr:{en:'Cold Soba',zh:'冷荞麦面',ja:'冷たいそば'}},
  {name:'라멘(돈코츠)',price:12000,category:'면류',q:'tonkotsu ramen pork broth japanese',tr:{en:'Tonkotsu Ramen',zh:'猪骨拉面',ja:'豚骨ラーメン'}},
  {name:'카레우동',price:11000,category:'면류',q:'curry udon japanese noodle soup',tr:{en:'Curry Udon',zh:'咖喱乌冬',ja:'カレーうどん'}},
  {name:'새우튀김(5pc)',price:13000,category:'튀김',q:'ebi tempura shrimp fried japanese',tr:{en:'Shrimp Tempura (5pc)',zh:'炸虾(5个)',ja:'エビ天ぷら(5本)'}},
  {name:'모둠튀김',price:16000,category:'튀김',q:'assorted tempura platter japanese',tr:{en:'Assorted Tempura',zh:'什锦天妇罗',ja:'天ぷら盛り合わせ'}},
  {name:'가라아게(닭튀김)',price:10000,category:'튀김',q:'karaage japanese fried chicken',tr:{en:'Karaage',zh:'炸鸡(唐揚)',ja:'唐揚げ'}},
  {name:'닭꼬치(2개)',price:5000,category:'구이',q:'yakitori chicken skewer grill japanese',tr:{en:'Yakitori (2pc)',zh:'烤鸡串(2串)',ja:'焼き鳥(2本)'}},
  {name:'연어구이',price:16000,category:'구이',q:'grilled salmon teriyaki japanese',tr:{en:'Grilled Salmon',zh:'烤三文鱼',ja:'鮭の塩焼き'}},
  {name:'미소시루',price:2000,category:'사이드',q:'miso soup japanese bowl',tr:{en:'Miso Soup',zh:'味噌汤',ja:'みそ汁'}},
  {name:'차완무시',price:4000,category:'사이드',q:'chawanmushi steamed egg custard japanese',tr:{en:'Steamed Egg Custard',zh:'茶碗蒸',ja:'茶碗蒸し'}},
  {name:'사케(1홉)',price:9000,category:'주류',q:'sake japanese rice wine glass bottle',tr:{en:'Sake (1 go)',zh:'清酒(1合)',ja:'日本酒(1合)'}},
  {name:'하이볼',price:7000,category:'주류',q:'highball whisky soda ice glass',tr:{en:'Highball',zh:'高球酒',ja:'ハイボール'}},
  {name:'아사히 생맥주',price:6000,category:'주류',q:'asahi draft beer glass cold',tr:{en:'Asahi Draft Beer',zh:'朝日生啤',ja:'アサヒ生ビール'}},
  {name:'소주',price:4000,category:'주류',q:'soju korean spirit bottle glass',tr:{en:'Soju',zh:'烧酒',ja:'焼酎'}}
 ],
 /* ────────────────── 중식당 (22 items) ────────────────── */
 chinese: [
  {name:'짜장면',price:8000,category:'면류',q:'jajangmyeon black bean sauce noodles',tr:{en:'Jajangmyeon',zh:'炸酱面',ja:'ジャージャー麺'}},
  {name:'짬뽕',price:9000,category:'면류',q:'jjamppong spicy red seafood noodle soup',tr:{en:'Jjamppong',zh:'炒码面',ja:'チャンポン'}},
  {name:'삼선짬뽕',price:12000,category:'면류',q:'seafood noodle soup premium chinese',tr:{en:'Seafood Jjamppong',zh:'三鲜炒码面',ja:'三鮮チャンポン'}},
  {name:'울면',price:9000,category:'면류',q:'ul myeon starchy gravy noodle soup',tr:{en:'Ul-myeon',zh:'糊汤面',ja:'ウルミョン'}},
  {name:'볶음면',price:9000,category:'면류',q:'stir fried noodles chinese wok',tr:{en:'Stir-fried Noodles',zh:'炒面',ja:'焼きそば'}},
  {name:'볶음밥',price:9000,category:'밥류',q:'chinese fried rice wok',tr:{en:'Fried Rice',zh:'炒饭',ja:'チャーハン'}},
  {name:'새우볶음밥',price:11000,category:'밥류',q:'shrimp fried rice chinese',tr:{en:'Shrimp Fried Rice',zh:'虾仁炒饭',ja:'エビチャーハン'}},
  {name:'짜장밥',price:8000,category:'밥류',q:'black bean sauce rice bowl',tr:{en:'Black Bean Sauce Rice',zh:'炸酱饭',ja:'ジャージャー飯'}},
  {name:'탕수육(소)',price:20000,category:'요리',q:'tangsuyuk sweet sour pork korean chinese',tr:{en:'Sweet & Sour Pork (S)',zh:'糖醋肉(小)',ja:'酢豚(小)'}},
  {name:'탕수육(대)',price:32000,category:'요리',q:'large sweet sour pork tangsuyuk',tr:{en:'Sweet & Sour Pork (L)',zh:'糖醋肉(大)',ja:'酢豚(大)'}},
  {name:'깐풍기',price:22000,category:'요리',q:'kkanpunggi spicy crispy fried chicken chinese',tr:{en:'Kkanpunggi',zh:'干烹鸡',ja:'カンプンギ'}},
  {name:'마파두부',price:11000,category:'요리',q:'mapo tofu spicy chinese dish',tr:{en:'Mapo Tofu',zh:'麻婆豆腐',ja:'麻婆豆腐'}},
  {name:'유린기',price:19000,category:'요리',q:'yu lin chi chinese chicken garlic sauce',tr:{en:'Yuringi',zh:'油淋鸡',ja:'油淋鶏'}},
  {name:'고추잡채',price:19000,category:'요리',q:'chili pepper stir fry pork chinese',tr:{en:'Gochujabchae',zh:'青椒肉丝',ja:'チンジャオロース'}},
  {name:'군만두(6개)',price:7000,category:'만두',q:'pan fried dumplings gyoza chinese',tr:{en:'Pan-fried Dumplings (6pc)',zh:'煎饺(6个)',ja:'焼き餃子(6個)'}},
  {name:'물만두(6개)',price:7000,category:'만두',q:'boiled dumplings water chinese',tr:{en:'Boiled Dumplings (6pc)',zh:'水饺(6个)',ja:'水餃子(6個)'}},
  {name:'짜사이',price:2000,category:'사이드',q:'zha cai pickled mustard chinese side',tr:{en:'Pickled Mustard',zh:'榨菜',ja:'ザーサイ'}},
  {name:'공기밥',price:1000,category:'사이드',q:'steamed white rice bowl',tr:{en:'Steamed Rice',zh:'米饭',ja:'ライス'}},
  {name:'탕수육 소스(부먹/찍먹)',price:0,category:'사이드',q:'sweet sour sauce chinese',tr:{en:'Sweet & Sour Sauce',zh:'糖醋汁',ja:'甘酢ソース'}},
  {name:'오렌지주스',price:4000,category:'음료',q:'fresh orange juice glass',tr:{en:'Orange Juice',zh:'橙汁',ja:'オレンジジュース'}},
  {name:'콜라',price:3000,category:'음료',q:'cola soft drink can glass ice',tr:{en:'Cola',zh:'可乐',ja:'コーラ'}},
  {name:'생맥주(500ml)',price:5000,category:'음료',q:'draft beer glass cold pint',tr:{en:'Draft Beer (500ml)',zh:'生啤(500ml)',ja:'生ビール(500ml)'}}
 ],
 /* ────────────────── 분식 (26 items) ────────────────── */
 fastfood: [
  {name:'떡볶이(小)',price:4000,category:'떡볶이',q:'tteokbokki small spicy rice cake red',tr:{en:'Tteokbokki (S)',zh:'炒年糕(小)',ja:'トッポッキ(小)'}},
  {name:'떡볶이(中)',price:6000,category:'떡볶이',q:'tteokbokki medium spicy rice cake korean',tr:{en:'Tteokbokki (M)',zh:'炒年糕(中)',ja:'トッポッキ(中)'}},
  {name:'로제떡볶이',price:7000,category:'떡볶이',q:'rose tteokbokki creamy pink sauce korean',tr:{en:'Rose Tteokbokki',zh:'玫瑰炒年糕',ja:'ロゼトッポッキ'}},
  {name:'크림떡볶이',price:7000,category:'떡볶이',q:'cream white sauce tteokbokki',tr:{en:'Cream Tteokbokki',zh:'奶油炒年糕',ja:'クリームトッポッキ'}},
  {name:'라볶이',price:6500,category:'떡볶이',q:'rabokki ramen tteokbokki mixed',tr:{en:'Rabokki',zh:'拉面炒年糕',ja:'ラポッキ'}},
  {name:'순대(소)',price:4000,category:'순대/튀김',q:'sundae korean blood sausage',tr:{en:'Sundae (S)',zh:'韩国血肠(小)',ja:'スンデ(小)'}},
  {name:'순대(대)',price:7000,category:'순대/튀김',q:'sundae large portion korean sausage',tr:{en:'Sundae (L)',zh:'韩国血肠(大)',ja:'スンデ(大)'}},
  {name:'튀김(5개)',price:3000,category:'순대/튀김',q:'korean fried snacks assorted 5 pieces',tr:{en:'Fritters (5pc)',zh:'炸物(5个)',ja:'揚げ物(5個)'}},
  {name:'튀김(10개)',price:5500,category:'순대/튀김',q:'assorted fried snacks 10 pieces korean',tr:{en:'Fritters (10pc)',zh:'炸物(10个)',ja:'揚げ物(10個)'}},
  {name:'오징어튀김',price:4500,category:'순대/튀김',q:'fried squid calamari korean street food',tr:{en:'Fried Squid',zh:'炸鱿鱼',ja:'イカの天ぷら'}},
  {name:'고구마튀김(3개)',price:3000,category:'순대/튀김',q:'sweet potato tempura fried korean',tr:{en:'Sweet Potato Fritters (3pc)',zh:'炸红薯(3个)',ja:'さつまいも天ぷら(3個)'}},
  {name:'기본김밥',price:3500,category:'김밥',q:'basic gimbap seaweed rice roll',tr:{en:'Basic Gimbap',zh:'基本紫菜包饭',ja:'基本キンパ'}},
  {name:'참치김밥',price:4500,category:'김밥',q:'tuna gimbap seaweed roll korean',tr:{en:'Tuna Gimbap',zh:'金枪鱼紫菜包饭',ja:'ツナキンパ'}},
  {name:'치즈김밥',price:4000,category:'김밥',q:'cheese gimbap melted korean roll',tr:{en:'Cheese Gimbap',zh:'芝士紫菜包饭',ja:'チーズキンパ'}},
  {name:'불고기김밥',price:5000,category:'김밥',q:'bulgogi beef gimbap korean roll',tr:{en:'Bulgogi Gimbap',zh:'烤肉紫菜包饭',ja:'プルコギキンパ'}},
  {name:'명란김밥',price:5000,category:'김밥',q:'pollock roe mentaiko gimbap roll',tr:{en:'Pollock Roe Gimbap',zh:'明太子紫菜包饭',ja:'明太子キンパ'}},
  {name:'삼각김밥',price:1500,category:'김밥',q:'triangle kimbap onigiri korean',tr:{en:'Triangle Gimbap',zh:'三角紫菜包饭',ja:'三角キンパ'}},
  {name:'라면',price:4000,category:'라면/면류',q:'korean instant ramen noodle soup',tr:{en:'Ramen',zh:'泡面',ja:'ラーメン'}},
  {name:'치즈라면',price:4500,category:'라면/면류',q:'cheese ramen noodle soup melted',tr:{en:'Cheese Ramen',zh:'芝士泡面',ja:'チーズラーメン'}},
  {name:'짜파게티',price:4500,category:'라면/면류',q:'chapaghetti black bean noodle korean',tr:{en:'Chapaghetti',zh:'炸酱意面',ja:'チャパゲティ'}},
  {name:'쫄면',price:5500,category:'라면/면류',q:'jjolmyeon chewy noodle spicy cold korean',tr:{en:'Chewy Noodles',zh:'劲道凉面',ja:'ジョルミョン'}},
  {name:'비빔국수',price:5000,category:'라면/면류',q:'bibim guksu spicy mixed noodles korean',tr:{en:'Spicy Mixed Noodles',zh:'拌面',ja:'ビビン국수'}},
  {name:'오뎅(4개)',price:2500,category:'사이드',q:'odeng fish cake skewer korean',tr:{en:'Fish Cake (4pc)',zh:'鱼饼(4串)',ja:'おでん(4本)'}},
  {name:'오뎅국물(컵)',price:500,category:'사이드',q:'fish cake broth soup cup korean',tr:{en:'Fish Cake Broth',zh:'鱼饼汤',ja:'おでん汁(カップ)'}},
  {name:'만두(4개)',price:3000,category:'사이드',q:'dumpling mandu korean steamed',tr:{en:'Dumplings (4pc)',zh:'饺子(4个)',ja:'マンドゥ(4個)'}},
  {name:'콜라/사이다',price:2000,category:'음료',q:'cola soda can cold drink',tr:{en:'Cola / Cider',zh:'可乐/雪碧',ja:'コーラ/サイダー'}}
 ],
 /* ────────────────── 이자카야/술집 (26 items) ────────────────── */
 izakaya: [
  {name:'생맥주(500ml)',price:5000,category:'생맥주',q:'draft beer pint glass cold',tr:{en:'Draft Beer (500ml)',zh:'生啤(500ml)',ja:'生ビール(500ml)'}},
  {name:'생맥주(1L)',price:9000,category:'생맥주',q:'large draft beer pitcher glass',tr:{en:'Draft Beer (1L)',zh:'生啤(1L)',ja:'生ビール(1L)'}},
  {name:'수제맥주(병)',price:8000,category:'생맥주',q:'craft beer bottle artisan',tr:{en:'Craft Beer (bottle)',zh:'精酿啤酒(瓶)',ja:'クラフトビール(瓶)'}},
  {name:'소주',price:4000,category:'소주/위스키',q:'soju korean spirit bottle shot',tr:{en:'Soju',zh:'烧酒',ja:'焼酎'}},
  {name:'하이볼',price:7000,category:'소주/위스키',q:'highball whisky soda ice glass',tr:{en:'Highball',zh:'高球酒',ja:'ハイボール'}},
  {name:'소맥(맥주+소주)',price:5000,category:'소주/위스키',q:'beer soju mix drink korean',tr:{en:'Beer & Soju Mix',zh:'啤酒烧酒混合',ja:'ソメク'}},
  {name:'막걸리(750ml)',price:5000,category:'막걸리',q:'makgeolli rice wine bottle glass',tr:{en:'Makgeolli (750ml)',zh:'马格利(750ml)',ja:'マッコリ(750ml)'}},
  {name:'삼겹살구이(200g)',price:15000,category:'고기구이',q:'samgyeopsal pork belly grill table',tr:{en:'Pork Belly (200g)',zh:'烤五花肉(200g)',ja:'サムギョプサル(200g)'}},
  {name:'항정살(200g)',price:16000,category:'고기구이',q:'pork jowl collar neck grill korean',tr:{en:'Pork Jowl (200g)',zh:'梅花肉(200g)',ja:'ハンジョンサル(200g)'}},
  {name:'닭목살(200g)',price:10000,category:'고기구이',q:'chicken neck skin grill korean',tr:{en:'Chicken Neck (200g)',zh:'鸡脖子(200g)',ja:'鶏首肉(200g)'}},
  {name:'닭꼬치(2개)',price:6000,category:'고기구이',q:'yakitori chicken skewer charcoal',tr:{en:'Chicken Skewer (2pc)',zh:'鸡肉串(2串)',ja:'焼き鳥(2本)'}},
  {name:'오징어구이',price:13000,category:'해산물안주',q:'grilled squid whole charcoal',tr:{en:'Grilled Squid',zh:'烤鱿鱼',ja:'イカ焼き'}},
  {name:'낙지볶음',price:14000,category:'해산물안주',q:'nakji bokkeum spicy stir fried octopus',tr:{en:'Spicy Stir-fried Octopus',zh:'辣炒章鱼',ja:'タコ辛炒め'}},
  {name:'골뱅이무침',price:14000,category:'해산물안주',q:'golbaengi muchim spicy snail noodle',tr:{en:'Spicy Snail Salad',zh:'辣拌海螺',ja:'コンクサラダ'}},
  {name:'계란말이',price:9000,category:'안주',q:'tamagoyaki rolled egg omelette',tr:{en:'Rolled Egg Omelette',zh:'鸡蛋卷',ja:'卵焼き'}},
  {name:'감자전',price:10000,category:'안주',q:'gamjajeon potato pancake korean',tr:{en:'Potato Pancake',zh:'土豆煎饼',ja:'ジャガイモチヂミ'}},
  {name:'파전',price:11000,category:'안주',q:'pajeon scallion pancake korean',tr:{en:'Green Onion Pancake',zh:'葱饼',ja:'パジョン'}},
  {name:'두부김치',price:11000,category:'안주',q:'dubu kimchi tofu stir fry korean',tr:{en:'Tofu & Kimchi',zh:'豆腐泡菜',ja:'豆腐キムチ'}},
  {name:'불닭발',price:14000,category:'안주',q:'buldak bal spicy chicken feet korean',tr:{en:'Spicy Chicken Feet',zh:'辣鸡脚',ja:'ブルダクパル'}},
  {name:'순한닭발',price:12000,category:'안주',q:'mild chicken feet braised korean',tr:{en:'Mild Chicken Feet',zh:'酱鸡脚',ja:'甘口ダクパル'}},
  {name:'쭈꾸미볶음',price:13000,category:'안주',q:'spicy stir fried baby octopus korean',tr:{en:'Spicy Baby Octopus',zh:'辣炒章鱼崽',ja:'テナガダコ辛炒め'}},
  {name:'치즈볶음밥(마무리)',price:5000,category:'마무리',q:'cheese fried rice korean finish',tr:{en:'Cheese Fried Rice',zh:'芝士炒饭',ja:'チーズチャーハン'}},
  {name:'라면(마무리)',price:4000,category:'마무리',q:'instant ramen soup bowl korean',tr:{en:'Ramen Finish',zh:'泡面(收尾)',ja:'ラーメン(シメ)'}},
  {name:'콜라',price:3000,category:'음료',q:'cola soda can cold ice',tr:{en:'Cola',zh:'可乐',ja:'コーラ'}},
  {name:'사이다',price:3000,category:'음료',q:'lemon soda clear sparkling drink',tr:{en:'Cider',zh:'雪碧',ja:'サイダー'}},
  {name:'탄산수',price:3000,category:'음료',q:'sparkling mineral water glass bottle',tr:{en:'Sparkling Water',zh:'气泡水',ja:'炭酸水'}}
 ],
 /* ────────────────── 양식당 (31 items) ────────────────── */
 western: [
  {name:'까르보나라',price:16000,category:'파스타',q:'carbonara pasta creamy egg italian',tr:{en:'Carbonara',zh:'卡邦尼意面',ja:'カルボナーラ'}},
  {name:'알리오올리오',price:14000,category:'파스타',q:'aglio olio pasta garlic olive oil',tr:{en:'Aglio e Olio',zh:'蒜香橄榄油意面',ja:'アーリオオーリオ'}},
  {name:'아라비아타',price:14000,category:'파스타',q:'arrabbiata tomato spicy pasta italian',tr:{en:'Arrabbiata',zh:'辣番茄意面',ja:'アラビアータ'}},
  {name:'봉골레',price:15000,category:'파스타',q:'vongole clam pasta white wine',tr:{en:'Vongole',zh:'白蛤意面',ja:'ボンゴレ'}},
  {name:'로제파스타',price:16000,category:'파스타',q:'rose sauce creamy tomato pasta',tr:{en:'Rosé Pasta',zh:'玫瑰酱意面',ja:'ロゼパスタ'}},
  {name:'먹물파스타',price:17000,category:'파스타',q:'squid ink pasta black seafood',tr:{en:'Squid Ink Pasta',zh:'墨鱼汁意面',ja:'イカ墨パスタ'}},
  {name:'트뤼플크림파스타',price:19000,category:'파스타',q:'truffle cream pasta luxurious',tr:{en:'Truffle Cream Pasta',zh:'松露奶油意面',ja:'トリュフクリームパスタ'}},
  {name:'마르게리타(8인치)',price:17000,category:'피자',q:'margherita pizza tomato mozzarella basil',tr:{en:'Margherita (8")',zh:'玛格丽特披萨(8寸)',ja:'マルゲリータ(8インチ)'}},
  {name:'페퍼로니(8인치)',price:18000,category:'피자',q:'pepperoni pizza red sauce',tr:{en:'Pepperoni (8")',zh:'意大利辣肠披萨(8寸)',ja:'ペパロニ(8インチ)'}},
  {name:'포테이토(8인치)',price:17000,category:'피자',q:'potato bacon cream pizza',tr:{en:'Potato (8")',zh:'土豆培根披萨(8寸)',ja:'ポテト(8インチ)'}},
  {name:'BBQ치킨(10인치)',price:23000,category:'피자',q:'bbq chicken pizza large',tr:{en:'BBQ Chicken (10")',zh:'BBQ鸡肉披萨(10寸)',ja:'BBQチキン(10インチ)'}},
  {name:'고르곤졸라(8인치)',price:20000,category:'피자',q:'gorgonzola cheese pizza honey',tr:{en:'Gorgonzola (8")',zh:'戈尔根朱勒奶酪披萨(8寸)',ja:'ゴルゴンゾーラ(8インチ)'}},
  {name:'립아이스테이크(200g)',price:48000,category:'메인',q:'ribeye steak grilled medium rare',tr:{en:'Ribeye Steak (200g)',zh:'肋眼牛排(200g)',ja:'リブアイステーキ(200g)'}},
  {name:'안심스테이크(200g)',price:42000,category:'메인',q:'tenderloin sirloin steak plate fine dining',tr:{en:'Tenderloin Steak (200g)',zh:'菲力牛排(200g)',ja:'ヒレステーキ(200g)'}},
  {name:'치킨스테이크',price:22000,category:'메인',q:'grilled chicken breast steak sauce',tr:{en:'Chicken Steak',zh:'鸡胸肉扒',ja:'チキンステーキ'}},
  {name:'연어스테이크',price:29000,category:'메인',q:'pan seared salmon steak lemon herb',tr:{en:'Salmon Steak',zh:'三文鱼扒',ja:'サーモンステーキ'}},
  {name:'등심돈가스',price:18000,category:'메인',q:'tonkatsu pork cutlet breaded fried',tr:{en:'Pork Cutlet',zh:'猪排',ja:'ロースカツ'}},
  {name:'시저샐러드',price:13000,category:'샐러드/수프',q:'caesar salad romaine croutons parmesan',tr:{en:'Caesar Salad',zh:'凯撒沙拉',ja:'シーザーサラダ'}},
  {name:'그릭샐러드',price:13000,category:'샐러드/수프',q:'greek salad olives feta cucumber',tr:{en:'Greek Salad',zh:'希腊沙拉',ja:'グリークサラダ'}},
  {name:'어니언수프',price:9000,category:'샐러드/수프',q:'french onion soup gratin bread cheese',tr:{en:'French Onion Soup',zh:'法式洋葱汤',ja:'オニオングラタンスープ'}},
  {name:'미네스트로네',price:9000,category:'샐러드/수프',q:'minestrone vegetable soup italian',tr:{en:'Minestrone',zh:'意式蔬菜汤',ja:'ミネストローネ'}},
  {name:'감자튀김',price:6000,category:'사이드',q:'french fries crispy golden',tr:{en:'French Fries',zh:'炸薯条',ja:'フライドポテト'}},
  {name:'마늘빵',price:5000,category:'사이드',q:'garlic bread butter toast baguette',tr:{en:'Garlic Bread',zh:'蒜蓉面包',ja:'ガーリックトースト'}},
  {name:'브레드바스켓',price:4000,category:'사이드',q:'bread basket dinner rolls butter',tr:{en:'Bread Basket',zh:'面包篮',ja:'ブレッドバスケット'}},
  {name:'티라미수',price:7000,category:'디저트',q:'tiramisu dessert coffee cocoa plate',tr:{en:'Tiramisu',zh:'提拉米苏',ja:'ティラミス'}},
  {name:'판나코타',price:6500,category:'디저트',q:'panna cotta italian cream dessert',tr:{en:'Panna Cotta',zh:'意式奶冻',ja:'パンナコッタ'}},
  {name:'아포가토',price:7000,category:'디저트',q:'affogato espresso vanilla ice cream',tr:{en:'Affogato',zh:'阿芙佳朵',ja:'アフォガート'}},
  {name:'와인(하우스/글라스)',price:12000,category:'음료',q:'wine glass red white restaurant',tr:{en:'House Wine (glass)',zh:'店内葡萄酒(杯)',ja:'ハウスワイン(グラス)'}},
  {name:'상그리아(글라스)',price:10000,category:'음료',q:'sangria wine fruit glass',tr:{en:'Sangria (glass)',zh:'桑格利亚(杯)',ja:'サングリア(グラス)'}},
  {name:'아이스티',price:4000,category:'음료',q:'iced tea lemon glass',tr:{en:'Iced Tea',zh:'冰茶',ja:'アイスティー'}},
  {name:'탄산수',price:3000,category:'음료',q:'sparkling mineral water glass bottle',tr:{en:'Sparkling Water',zh:'气泡水',ja:'炭酸水'}}
 ],
 /* ────────────────── 베이커리 특화 (33 items) ────────────────── */
 bakery: [
  {name:'통밀식빵(1/2)',price:5000,category:'식빵',q:'whole wheat bread loaf half sliced',tr:{en:'Whole Wheat Bread (½)',zh:'全麦吐司(半条)',ja:'全粒粉食パン(½本)'}},
  {name:'우유식빵(1/2)',price:4500,category:'식빵',q:'milk bread soft white loaf half',tr:{en:'Milk Bread (½)',zh:'牛奶吐司(半条)',ja:'ミルク食パン(½本)'}},
  {name:'소금빵',price:2500,category:'식빵',q:'salted butter roll bread baked',tr:{en:'Salt Bread',zh:'盐面包',ja:'塩パン'}},
  {name:'BLT샌드위치',price:8500,category:'샌드위치',q:'blt sandwich bacon lettuce tomato',tr:{en:'BLT Sandwich',zh:'培根生菜番茄三明治',ja:'BLTサンドイッチ'}},
  {name:'에그마요샌드위치',price:7500,category:'샌드위치',q:'egg mayo sandwich classic',tr:{en:'Egg Mayo Sandwich',zh:'鸡蛋沙拉三明治',ja:'たまごサンドイッチ'}},
  {name:'클럽샌드위치',price:9500,category:'샌드위치',q:'club sandwich triple layer premium',tr:{en:'Club Sandwich',zh:'总汇三明治',ja:'クラブサンドイッチ'}},
  {name:'아보카도토스트',price:9000,category:'샌드위치',q:'avocado toast sourdough egg brunch',tr:{en:'Avocado Toast',zh:'牛油果吐司',ja:'アボカドトースト'}},
  {name:'플레인크루아상',price:3500,category:'크루아상',q:'plain butter croissant golden flaky',tr:{en:'Plain Croissant',zh:'原味可颂',ja:'プレーンクロワッサン'}},
  {name:'아몬드크루아상',price:4500,category:'크루아상',q:'almond croissant frangipane pastry',tr:{en:'Almond Croissant',zh:'杏仁可颂',ja:'アーモンドクロワッサン'}},
  {name:'크로플',price:5500,category:'크루아상',q:'croffle waffle croissant crispy',tr:{en:'Croffle',zh:'可颂华夫饼',ja:'クロッフル'}},
  {name:'팡도르(슈크림)',price:3500,category:'크루아상',q:'cream puff choux pastry profiterole',tr:{en:'Cream Puff',zh:'泡芙',ja:'シュークリーム'}},
  {name:'에그타르트',price:3000,category:'크루아상',q:'portuguese egg tart custard pastry',tr:{en:'Egg Tart',zh:'蛋挞',ja:'エッグタルト'}},
  {name:'베르리너(커스터드)',price:3500,category:'크루아상',q:'berliner filled doughnut custard',tr:{en:'Berliner (custard)',zh:'柏林甜甜圈(卡仕达)',ja:'ベルリーナー(カスタード)'}},
  {name:'생딸기케이크(슬라이스)',price:7500,category:'케이크',q:'fresh strawberry cream cake slice',tr:{en:'Strawberry Cake Slice',zh:'新鲜草莓蛋糕(片)',ja:'生いちごケーキ(スライス)'}},
  {name:'뉴욕치즈케이크(슬라이스)',price:7000,category:'케이크',q:'new york cheesecake rich cream slice',tr:{en:'NY Cheesecake Slice',zh:'纽约芝士蛋糕(片)',ja:'NYチーズケーキ(スライス)'}},
  {name:'초코가나슈케이크',price:7000,category:'케이크',q:'chocolate ganache cake slice rich',tr:{en:'Choco Ganache Cake',zh:'巧克力甘纳许蛋糕',ja:'チョコガナッシュケーキ'}},
  {name:'레드벨벳케이크',price:7000,category:'케이크',q:'red velvet cake cream cheese frosting',tr:{en:'Red Velvet Cake',zh:'红丝绒蛋糕',ja:'レッドベルベットケーキ'}},
  {name:'말차케이크(슬라이스)',price:7000,category:'케이크',q:'matcha green tea cake layered slice',tr:{en:'Matcha Cake Slice',zh:'抹茶蛋糕(片)',ja:'抹茶ケーキ(スライス)'}},
  {name:'얼그레이케이크',price:7000,category:'케이크',q:'earl grey tea cake lavender cream',tr:{en:'Earl Grey Cake',zh:'伯爵茶蛋糕',ja:'アールグレイケーキ'}},
  {name:'생일케이크(홀)',price:48000,category:'케이크',q:'whole birthday cake celebration',tr:{en:'Birthday Cake (whole)',zh:'生日蛋糕(整个)',ja:'バースデーケーキ(ホール)'}},
  {name:'버터쿠키(3개)',price:4500,category:'쿠키/마카롱',q:'butter cookies danish classic three',tr:{en:'Butter Cookies (3pc)',zh:'黄油饼干(3个)',ja:'バタークッキー(3個)'}},
  {name:'초코칩쿠키',price:2500,category:'쿠키/마카롱',q:'chocolate chip cookie warm baked',tr:{en:'Choco Chip Cookie',zh:'巧克力曲奇',ja:'チョコチップクッキー'}},
  {name:'브라우니',price:3500,category:'쿠키/마카롱',q:'fudgy chocolate brownie square',tr:{en:'Brownie',zh:'布朗尼',ja:'ブラウニー'}},
  {name:'마카롱(1개)',price:2500,category:'쿠키/마카롱',q:'french macaron colorful pastel',tr:{en:'Macaron (1pc)',zh:'马卡龙(1个)',ja:'マカロン(1個)'}},
  {name:'피낭시에(2개)',price:3500,category:'쿠키/마카롱',q:'financier french almond butter cake',tr:{en:'Financier (2pc)',zh:'费南雪(2个)',ja:'フィナンシェ(2個)'}},
  {name:'아메리카노(ICE)',price:4000,category:'음료',q:'iced americano coffee glass ice',tr:{en:'Iced Americano',zh:'冰美式',ja:'アイスアメリカーノ'}},
  {name:'아메리카노(HOT)',price:4000,category:'음료',q:'hot americano black coffee cup',tr:{en:'Hot Americano',zh:'热美式',ja:'ホットアメリカーノ'}},
  {name:'카페라떼',price:5000,category:'음료',q:'cafe latte art milk foam cup',tr:{en:'Cafe Latte',zh:'拿铁',ja:'カフェラテ'}},
  {name:'바닐라라떼',price:5500,category:'음료',q:'vanilla latte flavored milk coffee',tr:{en:'Vanilla Latte',zh:'香草拿铁',ja:'バニララテ'}},
  {name:'핫초코',price:5000,category:'음료',q:'hot chocolate cocoa drink mug',tr:{en:'Hot Chocolate',zh:'热巧克力',ja:'ホットチョコレート'}},
  {name:'오렌지주스(착즙)',price:6000,category:'음료',q:'fresh squeezed orange juice glass',tr:{en:'Fresh OJ',zh:'鲜榨橙汁',ja:'フレッシュオレンジジュース'}},
  {name:'딸기라떼',price:6000,category:'음료',q:'strawberry milk latte pink drink',tr:{en:'Strawberry Latte',zh:'草莓拿铁',ja:'ストロベリーラテ'}},
  {name:'레몬에이드',price:5500,category:'음료',q:'lemon ade fresh sparkling soda glass',tr:{en:'Lemon Ade',zh:'柠檬气泡饮',ja:'レモンエード'}}
 ],
 other: []
};

function _filoSeedDefaultMenus(did, themeKey){
 did = did || (window._CU && (_CU.dealerId||_CU.uid));
 var items=_FILO_MENU_TEMPLATES[String(themeKey||'').trim()];
 if(!did || !items || !items.length) return Promise.resolve(0);

 return _db.collection('filo_menus').where('dealerId','==',did).limit(1).get()
 .then(function(snap){
  if(!snap.empty) return 0;
  var now=(typeof _nowISO==='function')?_nowISO():new Date().toISOString();
  var batch=_db.batch();
  var refs=[];
  items.forEach(function(it){
   var ref=_db.collection('filo_menus').doc();
   refs.push({ref:ref, q:it.q});
   batch.set(ref,{
    dealerId:did, name:it.name, price:it.price,
    category:it.category, emoji:it.emoji, forSale:true,
    imageUrl:'', stock:null, minStock:null, description:'',
    nameTranslations:it.tr,
    isTemplate:true, createdAt:now, updatedAt:now
   });
  });
  return batch.commit().then(function(){
   _filoFillTemplateImages(refs);
   return items.length;
  });
 });
}

function _filoFillTemplateImages(refs){
 var i=0;
 function next(){
  if(i>=refs.length) return;
  var cur=refs[i++];
  _filoFetchMenuImage(cur.q).then(function(url){
   if(url) return cur.ref.update({imageUrl:url});
  }).catch(function(){}).then(function(){
   setTimeout(next, 700);
  });
 }
 next();
}

function _filoSeedDefaultMenusManual(){
 var did=_CU.dealerId||_CU.uid;
 var key=(window._cachedCompanyDoc&&_cachedCompanyDoc.theme)||(window._filoTheme&&_filoTheme.theme)||'other';
 var t=_FILO_MENU_TEMPLATES[key];
 if(!t||!t.length){_filoToast('이 업종은 기본 메뉴 템플릿이 없습니다');return;}
 _filoSeedDefaultMenus(did,key).then(function(n){
  if(n>0) _filoToast('기본 메뉴 '+n+'개 등록 완료');
  else _filoToast('이미 메뉴가 있어 건너뛰었습니다');
 }).catch(function(e){_filoToast(e.message);});
}
