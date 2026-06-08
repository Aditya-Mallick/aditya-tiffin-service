export const WA_NUMBER = '919818487872'
export const WA_ALT    = '919599569194'
export const waLink = (msg = '') =>
  `https://wa.me/${WA_NUMBER}${msg ? `?text=${encodeURIComponent(msg)}` : ''}`

// ─── DAILY MENU ITEMS ───────────────────────────────────────────────────────
export const dailyItems = [
  {
    id: 'dal',
    accent: '#FF6B2B',
    name:   { en: 'Dal (Arhar / Masoor)', hi: 'दाल (अरहर / मसूर)' },
    desc:   { en: 'Tempered lentil soup — the soul of every tiffin', hi: 'तड़के वाली दाल — हर टिफिन की आत्मा' },
    badge:  { en: 'Included in all plans', hi: 'सभी योजनाओं में शामिल' },
  },
  {
    id: 'roti',
    accent: '#F5A623',
    name:   { en: 'Phulka Roti', hi: 'फुल्का रोटी' },
    desc:   { en: 'Soft whole-wheat rotis made fresh for every meal', hi: 'हर भोजन के लिए ताज़ी बनी नरम रोटियां' },
    badge:  { en: 'Also order separately @ ₹6/pc', hi: 'अलग से @ ₹6/नग' },
  },
  {
    id: 'rice',
    accent: '#42A5F5',
    name:   { en: 'Steamed / Jeera Rice', hi: 'चावल / जीरा राइस' },
    desc:   { en: 'Fluffy plain rice or cumin-tempered jeera rice', hi: 'सादा या जीरे वाला मुलायम चावल' },
    badge:  { en: 'Included in all plans', hi: 'सभी योजनाओं में शामिल' },
  },
  {
    id: 'sabzi-dry',
    accent: '#4CAF50',
    name:   { en: 'Seasonal Sabzi (Dry)', hi: 'मौसमी सब्ज़ी (सूखी)' },
    desc:   { en: 'Aloo gobhi, bhindi, parwal, baingan — fresh, whatever is in season', hi: 'आलू गोभी, भिंडी, परवल, बैंगन — मौसम की ताज़ी सब्ज़ी' },
    badge:  { en: 'Rotates daily', hi: 'रोज़ बदलती है' },
  },
  {
    id: 'sabzi-gravy',
    accent: '#FF7043',
    name:   { en: 'Gravy Sabzi', hi: 'ग्रेवी सब्ज़ी' },
    desc:   { en: 'Paneer, matar mushroom, rajma, chana masala — rich rotating curries', hi: 'पनीर, मटर मशरूम, राजमा, चना मसाला — बदलती ग्रेवी' },
    badge:  { en: 'Special & Full plans', hi: 'स्पेशल और फुल प्लान में' },
  },
  {
    id: 'bhujiya',
    accent: '#AB47BC',
    name:   { en: 'Bhujiya, Papad & Achaar', hi: 'भुजिया, पापड़ और अचार' },
    desc:   { en: 'Crispy sev bhujiya, roasted papad, homemade pickle — always included', hi: 'भुजिया, पापड़, घर का अचार — हमेशा शामिल' },
    badge:  { en: 'Every tiffin', hi: 'हर टिफिन में' },
  },
  {
    id: 'salad',
    accent: '#26A69A',
    name:   { en: 'Salad & Curd / Raita', hi: 'सलाद और दही / रायता' },
    desc:   { en: 'Fresh cut salad, homemade curd or boondi raita', hi: 'ताज़ा सलाद, घर का दही या बूंदी रायता' },
    badge:  { en: 'Full plans', hi: 'फुल प्लान में' },
  },
  {
    id: 'sweet',
    accent: '#F5A623',
    name:   { en: 'Sweet — Kheer / Halwa / Sevai', hi: 'मिठाई — खीर / हलवा / सेवई' },
    desc:   { en: 'Rotating desserts on special days and in the Special Tiffin', hi: 'स्पेशल टिफिन और खास दिनों पर बदलती मिठाईयां' },
    badge:  { en: 'Special plans', hi: 'स्पेशल प्लान में' },
  },
]

// ─── PRICING ─────────────────────────────────────────────────────────────────
export const pricingItems = [
  {
    id: 'regular',
    featured: true,
    color: '#FF6B2B',
    name:  { en: 'Regular Tiffin',  hi: 'रेगुलर टिफिन' },
    desc:  { en: 'Dal, Chawal, Roti, Sabzi, Bhujiya, Salad, Papad, Aachar', hi: 'दाल, चावल, रोटी, सब्ज़ी, भुजिया, सलाद, पापड़, अचार' },
    price: '₹80',
    unit:  { en: '/meal', hi: '/भोजन' },
    waMsg: 'Hello, I want to order a Regular Tiffin. Please confirm.',
  },
  {
    id: 'special',
    featured: true,
    color: '#7B2D8B',
    name:  { en: 'Special Tiffin',  hi: 'स्पेशल टिफिन' },
    desc:  { en: 'Paneer/Rajma/Chana Sabzi, Butter Roti, Bhujiya, Salad, Papad, Aachar, Sweet', hi: 'पनीर/राजमा/चना सब्ज़ी, बटर रोटी, भुजिया, सलाद, पापड़, अचार, मिठाई' },
    price: '₹120',
    unit:  { en: '/meal', hi: '/भोजन' },
    waMsg: 'Hello, I want to order a Special Tiffin. Please confirm.',
  },
  {
    id: 'veg-thali',
    color: '#2D7A1F',
    name:  { en: 'Veg Special Thali', hi: 'वेज स्पेशल थाली' },
    desc:  { en: 'Dal Makhni, Jeera Rice, Paneer Butter Masala, Sabzi, Butter Roti, Sweet, Salad, Papad, Aachar', hi: 'दाल मखनी, जीरा राइस, पनीर बटर मसाला, सब्ज़ी, बटर रोटी, मिठाई, सलाद, पापड़, अचार' },
    price: '₹150',
    packing: '+ ₹20 packing',
    waMsg: 'Hello, I want to order a Veg Special Thali. Please confirm.',
  },
  {
    id: 'chicken-thali',
    color: '#E05520',
    name:  { en: 'Chicken Special Thali', hi: 'चिकन स्पेशल थाली' },
    desc:  { en: 'Butter Chicken Masala, Dal Makhni, Jeera Rice, Butter Roti, Sweet, Salad, Papad, Aachar', hi: 'बटर चिकन मसाला, दाल मखनी, जीरा राइस, बटर रोटी, मिठाई, सलाद, पापड़, अचार' },
    price: '₹180',
    packing: '+ ₹20 packing',
    waMsg: 'Hello, I want to order a Chicken Special Thali. Please confirm.',
  },
  {
    id: 'mutton',
    color: '#5D4037',
    name:  { en: 'Mutton Thali', hi: 'मटन थाली' },
    desc:  { en: 'Mutton Curry, Roti / Chawal, Salad', hi: 'मटन करी, रोटी / चावल, सलाद' },
    price: '₹280',
    unit:  { en: 'full · 4pc', hi: 'फुल · 4 नग' },
    half:  { en: '₹170 half plate (2pc) · ₹70/pc', hi: '₹170 आधी थाली (2 नग) · ₹70/नग' },
    waMsg: 'Hello, I want to order a Mutton Thali. Please share availability.',
  },
  {
    id: 'chicken-curry',
    color: '#C62828',
    name:  { en: 'Chicken Thali', hi: 'चिकन थाली' },
    desc:  { en: 'Chicken Curry, Roti / Chawal, Salad', hi: 'चिकन करी, रोटी / चावल, सलाद' },
    price: '₹180',
    unit:  { en: 'full · 4pc', hi: 'फुल · 4 नग' },
    half:  { en: '₹120 half plate (2pc) · ₹40/pc', hi: '₹120 आधी थाली (2 नग) · ₹40/नग' },
    waMsg: 'Hello, I want to order a Chicken Thali. Please share availability.',
  },
  {
    id: 'fish',
    color: '#0D47A1',
    name:  { en: 'Fish Thali', hi: 'मछली थाली' },
    desc:  { en: 'Fish Curry, Roti / Chawal, Salad', hi: 'मछली करी, रोटी / चावल, सलाद' },
    price: '₹180',
    unit:  { en: 'full · 4pc', hi: 'फुल · 4 नग' },
    half:  { en: '₹120 half plate (2pc) · ₹40/pc', hi: '₹120 आधी थाली (2 नग) · ₹40/नग' },
    waMsg: 'Hello, I want to order a Fish Thali. Please share availability.',
  },
  {
    id: 'egg',
    color: '#E65100',
    name:  { en: 'Egg Thali', hi: 'अंडा थाली' },
    desc:  { en: 'Egg Curry, Roti / Chawal, Salad', hi: 'अंडा करी, रोटी / चावल, सलाद' },
    price: '₹140',
    unit:  { en: 'full · 4pc', hi: 'फुल · 4 नग' },
    half:  { en: '₹90 half plate (2pc) · ₹30/pc', hi: '₹90 आधी थाली (2 नग) · ₹30/नग' },
    waMsg: 'Hello, I want to order an Egg Thali. Please share availability.',
  },
]

// ─── WEEKLY SCHEDULE ─────────────────────────────────────────────────────────
export const weeklyMenu = [
  { day: { en: 'Monday',    hi: 'सोमवार'  }, lunch: 'Kathal + Bhujiya + Dal + Roti/Chawal + Salad',                                          dinner: 'Parval Aloo + Bhujiya + Roti + Salad' },
  { day: { en: 'Tuesday',   hi: 'मंगलवार' }, lunch: 'Aloo Baigan + Chokha + Dal + Roti/Chawal + Salad + Papad',                              dinner: 'Chola/Kala Chana + Halwa + Paratha + Salad + Chutney' },
  { day: { en: 'Wednesday', hi: 'बुधवार'  }, lunch: 'Aloo Parval + Tarua/Pakodi + Dal + Roti/Chawal + Salad',                                dinner: 'Bhindi + Dal Tadka + Roti + Salad' },
  { day: { en: 'Thursday',  hi: 'गुरुवार' }, lunch: 'Besan ki Sabzi/Kadhi + Jeera Rice + Bhujiya + Papad + Dal + Roti/Chawal + Salad',       dinner: 'Kheer/Sevai + Aloo Paneer + Salad + Poori/Paratha' },
  { day: { en: 'Friday',    hi: 'शुक्रवार'}, lunch: 'Aloo Bora + Jeera Aloo + Dal + Roti/Chawal + Salad',                                    dinner: 'Kaddu Chana + Bhujiya + Kaali Dal + Roti + Salad' },
  { day: { en: 'Saturday',  hi: 'शनिवार' }, lunch: 'Chola/Rajma + Fried Rice + Bhujiya + Dal + Roti + Salad',                                dinner: 'Jhinga + Bhujiya + Dal Tadka + Roti + Salad' },
  { day: { en: 'Sunday',    hi: 'रविवार'  }, lunch: 'Kofta + Pakodi/Tarua + Papad + Dal + Roti/Chawal + Salad',                              dinner: 'Aloo Parval + Bhindi Bhujiya + Salad + Roti/Paratha + Chutney' },
]

// ─── PLANS ───────────────────────────────────────────────────────────────────
export const plans = [
  {
    id: 'regular',
    gradient: 'from-saffron-dark to-saffron',
    name:  { en: 'Regular Plan', hi: 'रेगुलर प्लान' },
    sub:   { en: 'Lunch or Dinner · Monthly', hi: 'दोपहर या रात · मासिक' },
    features: [
      { en: 'Dal + Rice',                  hi: 'दाल + चावल' },
      { en: 'Phulka Roti (4 pcs)',         hi: 'फुल्का रोटी (4 नग)' },
      { en: 'Seasonal Sabzi',              hi: 'मौसमी सब्ज़ी' },
      { en: 'Bhujiya, Salad, Papad, Achaar', hi: 'भुजिया, सलाद, पापड़, अचार' },
      { en: 'Free Home Delivery',          hi: 'मुफ्त होम डिलीवरी' },
    ],
    waMsg: 'Hello, I am interested in the Regular Tiffin subscription. Please share pricing.',
  },
  {
    id: 'special',
    popular: true,
    gradient: 'from-amber-500 to-saffron',
    name:  { en: 'Special Plan', hi: 'स्पेशल प्लान' },
    sub:   { en: 'Lunch + Dinner · Monthly', hi: 'दोपहर + रात · मासिक' },
    features: [
      { en: 'Paneer/Rajma/Chana Sabzi',   hi: 'पनीर/राजमा/चना सब्ज़ी' },
      { en: 'Butter Roti + Dal + Rice',    hi: 'बटर रोटी + दाल + चावल' },
      { en: 'Bhujiya, Salad, Papad, Achaar', hi: 'भुजिया, सलाद, पापड़, अचार' },
      { en: 'Kheer / Sevai / Halwa',       hi: 'खीर / सेवई / हलवा' },
      { en: 'Free Home Delivery',          hi: 'मुफ्त होम डिलीवरी' },
    ],
    waMsg: 'Hello, I am interested in the Special Tiffin subscription. Please share pricing.',
  },
  {
    id: 'custom',
    gradient: 'from-tgreen-dark to-tgreen',
    name:  { en: 'Custom Plan', hi: 'कस्टम योजना' },
    sub:   { en: 'Tailored to your needs', hi: 'आपकी ज़रूरत के अनुसार' },
    features: [
      { en: 'Choose your meals',           hi: 'अपना खाना चुनें' },
      { en: 'Weekly or monthly billing',   hi: 'साप्ताहिक या मासिक' },
      { en: 'Dietary preferences honored', hi: 'आहार प्राथमिकताएं' },
      { en: 'Office / group orders',       hi: 'ऑफिस / ग्रुप ऑर्डर' },
      { en: 'Free Home Delivery',          hi: 'मुफ्त होम डिलीवरी' },
    ],
    waMsg: 'Hello, I need a custom tiffin plan. Can we discuss?',
  },
]

// ─── GALLERY PHOTOS ──────────────────────────────────────────────────────────
export const galleryPhotos = [
  { src: '/images/chicken-curry.jpg',          label: { en: 'Chicken Curry & Rice',   hi: 'चिकन करी और चावल' },  bg: '#B71C1C' },
  { src: '/images/paneer-butter-masala.jpg',   label: { en: 'Paneer Butter Masala',   hi: 'पनीर बटर मसाला' },    bg: '#E65100' },
  { src: '/images/special-thali.jpg',          label: { en: 'Special Thali',          hi: 'स्पेशल थाली' },       bg: '#1B5E20' },
]

// ─── TESTIMONIALS ────────────────────────────────────────────────────────────
export const testimonials = [
  {
    name: 'Rahul Kumar',
    role: { en: 'Office worker, Supaul', hi: 'कार्यालय कर्मचारी, सुपौल' },
    text: {
      en: '"Been subscribing for 2 years now. The food tastes exactly like home — fresh roti, hot dal, everything perfect. Never disappoints!"',
      hi: '"2 साल से सदस्यता ले रहा हूं। खाना बिल्कुल घर जैसा — ताज़ी रोटी, गर्म दाल, सब परफेक्ट।"',
    },
    initials: 'R',
    color: '#FF6B2B',
  },
  {
    name: 'Priya Sharma',
    role: { en: 'Student, Supaul', hi: 'छात्रा, सुपौल' },
    text: {
      en: '"As a student staying away from home, this tiffin service has been a lifesaver. Affordable, tasty, and always on time!"',
      hi: '"घर से दूर रहने वाली छात्रा के रूप में, यह सेवा वरदान है। किफायती, स्वादिष्ट, समय पर!"',
    },
    initials: 'P',
    color: '#2D7A1F',
  },
  {
    name: 'Suresh Yadav',
    role: { en: 'Local businessman, Supaul', hi: 'स्थानीय व्यापारी, सुपौल' },
    text: {
      en: '"Fresh vegetables, no oil overdose, proper spices. You can taste the care in every meal. Consistent quality for years."',
      hi: '"ताज़ी सब्ज़ियां, सही मसाले, तेल की अधिकता नहीं। सालों से एक जैसी गुणवत्ता।"',
    },
    initials: 'S',
    color: '#F5A623',
  },
]
