// Golden Wizard Professional Salon — Frequently Asked Questions
// Answers verified against salonData.ts, menuData.ts, and known salon details.
// Answers marked "requires owner confirmation" should be reviewed before publishing.

export interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  published: boolean;
}

export const FAQ_CATEGORIES = [
  'General',
  'Haircuts & Styling',
  'Hair Treatments',
  'Hair Colour',
  'Pricing & Appointments',
  'Grooming & Beauty',
  'Bridal & Special Occasions',
  'Aftercare',
] as const;

export const DEFAULT_FAQS: FAQItem[] = [
  // ── GENERAL ──────────────────────────────────────────────────────────────
  {
    id: 'faq-gen-01',
    category: 'General',
    question: 'Where is Golden Wizard Professional Salon located?',
    answer:
      'We are at Door No. 4, Gandi Maisamma X Rd, opposite the Indian Oil Petrol Pump, Gandi Maisamma, Hyderabad, Telangana – 500043. You can get directions on Google Maps by searching "Golden Wizard Professional Salon Gandi Maisamma".',
    published: true,
  },
  {
    id: 'faq-gen-02',
    category: 'General',
    question: 'What are your salon opening hours?',
    answer:
      'We are open every day from 9:00 AM to 9:00 PM — including Sundays and public holidays. We recommend calling ahead if you plan to visit during peak hours.',
    published: true,
  },
  {
    id: 'faq-gen-03',
    category: 'General',
    question: 'Do you accept walk-in customers?',
    answer:
      'Yes, walk-in customers are welcome. We attend to whoever arrives first. During busy hours — especially evenings and weekends — waiting times can be longer, so booking in advance over WhatsApp is a good idea if you want a specific time.',
    published: true,
  },
  {
    id: 'faq-gen-04',
    category: 'General',
    question: 'How can I contact Golden Wizard Salon?',
    answer:
      'The easiest way is WhatsApp. Send a message to +91 86863 85552 and our team will respond. You can also call the same number during salon hours (9 AM – 9 PM daily).',
    published: true,
  },
  {
    id: 'faq-gen-05',
    category: 'General',
    question: 'Do you serve men, women and children?',
    answer:
      'Yes. We offer services for women, men, and children. Our menu includes women\'s hair styling, colouring, treatments, skin and beauty services, as well as haircuts for children.',
    published: true,
  },
  {
    id: 'faq-gen-06',
    category: 'General',
    question: 'How can I book an appointment?',
    answer:
      'Send us a message on WhatsApp at +91 86863 85552. Let us know your preferred date, time, and the service you want. We\'ll confirm your slot and assign a stylist.',
    published: true,
  },
  {
    id: 'faq-gen-07',
    category: 'General',
    question: 'Can I ask a stylist for advice before choosing a service?',
    answer:
      'Absolutely. Send us your question on WhatsApp and a stylist will help you choose the right service based on your hair type, goals, and budget. You can also ask in person when you arrive.',
    published: true,
  },

  // ── HAIRCUTS & STYLING ───────────────────────────────────────────────────
  {
    id: 'faq-cut-01',
    category: 'Haircuts & Styling',
    question: 'How do I choose a haircut that suits my face shape?',
    answer:
      'Different face shapes — oval, round, square, heart — suit different cuts. During your visit, our stylist will assess your face shape, hair texture, and natural fall before recommending something that works for you. You\'re welcome to bring reference photos as well.',
    published: true,
  },
  {
    id: 'faq-cut-02',
    category: 'Haircuts & Styling',
    question: 'Can I show a reference photo of the haircut I want?',
    answer:
      'Yes, please bring one. A photo gives us a clear starting point. Our stylist will tell you honestly whether the same result is achievable with your current hair type, length, and condition.',
    published: true,
  },
  {
    id: 'faq-cut-03',
    category: 'Haircuts & Styling',
    question: 'Do you provide hair styling for special occasions?',
    answer:
      'Yes. We offer event and occasion styling including blow-dry styling, updos, and look changes. For weddings and large events we recommend booking in advance. Message us on WhatsApp to discuss what you need.',
    published: true,
  },
  {
    id: 'faq-cut-04',
    category: 'Haircuts & Styling',
    question: 'Can a stylist recommend a hairstyle based on my hair type?',
    answer:
      'Yes. When you arrive, tell your stylist about your hair — whether it\'s fine, thick, wavy, curly, chemically treated, or anything else. We\'ll suggest cuts and styles that work well with your natural hair rather than against it.',
    published: true,
  },
  {
    id: 'faq-cut-05',
    category: 'Haircuts & Styling',
    question: 'Can you help if I am unsure which haircut will suit me?',
    answer:
      'That\'s exactly what we\'re here for. Come in, have a brief consultation, and let your stylist look at your face shape, hair texture, and lifestyle before recommending a cut. There\'s no pressure to decide before the conversation.',
    published: true,
  },

  // ── HAIR TREATMENTS ─────────────────────────────────────────────────────
  {
    id: 'faq-trt-01',
    category: 'Hair Treatments',
    question: 'Which hair treatment is best for dry or damaged hair?',
    answer:
      'For dry or damaged hair we typically recommend a hair spa — either a standard hair spa or a targeted option like our deep conditioner or dryness-control spa. The right choice depends on how damaged your hair is. Message us on WhatsApp and describe your hair condition; we\'ll point you in the right direction.',
    published: true,
  },
  {
    id: 'faq-trt-02',
    category: 'Hair Treatments',
    question: 'How do I know whether I need a hair spa or another treatment?',
    answer:
      'A hair spa focuses on scalp health and moisture replenishment. If you also need to address frizz or achieve smoother hair texture, a smoothing treatment might suit you better. If you\'re unsure, send us a WhatsApp message and describe what your hair feels like — we\'ll suggest the right option.',
    published: true,
  },
  {
    id: 'faq-trt-03',
    category: 'Hair Treatments',
    question: 'How long do salon hair treatments usually take?',
    answer:
      'A hair spa typically takes 45–60 minutes. Straightening and smoothing treatments can take 2–3 hours depending on hair length and thickness. We\'ll give you an accurate estimate when you book.',
    published: true,
  },
  {
    id: 'faq-trt-04',
    category: 'Hair Treatments',
    question: 'How should I maintain my hair after a treatment?',
    answer:
      'After a hair spa or conditioning treatment, avoid washing your hair for at least 48 hours to let the treatment set. Use sulphate-free shampoo and avoid excess heat styling for a few days. Your stylist will give specific advice depending on which treatment you had.',
    published: true,
  },
  {
    id: 'faq-trt-05',
    category: 'Hair Treatments',
    question: 'Can I consult a stylist before deciding on a hair treatment?',
    answer:
      'Yes. We always recommend a brief consultation before choosing a treatment — especially for chemical services like straightening, smoothing, or rebonding. Book a consultation visit or message us on WhatsApp to discuss your needs first.',
    published: true,
  },

  // ── HAIR COLOUR ──────────────────────────────────────────────────────────
  {
    id: 'faq-col-01',
    category: 'Hair Colour',
    question: 'Can I get a consultation before colouring my hair?',
    answer:
      'Yes, and we recommend it. A colour consultation lets us look at your existing hair colour, assess its condition, and discuss whether the shade you want is achievable in one session or will need multiple visits.',
    published: true,
  },
  {
    id: 'faq-col-02',
    category: 'Hair Colour',
    question: 'How do I choose a hair colour that suits my skin tone?',
    answer:
      'Warm skin tones generally look great with golden, copper, and caramel shades. Cooler skin tones suit ash, burgundy, and cool brown tones. Your stylist will assess your skin undertone during the consultation and recommend colours that complement you. You can also bring a reference photo.',
    published: true,
  },
  {
    id: 'faq-col-03',
    category: 'Hair Colour',
    question: 'Does the final hair colour depend on my existing hair colour?',
    answer:
      'Yes. The base colour of your hair significantly affects the result. Dark hair lifted to a light blonde requires bleaching across multiple sessions. Fashion colours also behave differently on dark versus light hair. We\'ll be upfront about what\'s achievable in a single visit.',
    published: true,
  },
  {
    id: 'faq-col-04',
    category: 'Hair Colour',
    question: 'How should I maintain coloured hair after my salon visit?',
    answer:
      'Use a colour-protecting, sulphate-free shampoo. Avoid washing with very hot water, as heat opens the hair cuticle and causes colour to fade faster. Conditioning regularly helps maintain shine. Your stylist will tell you how often to come in for a root touchup depending on how fast your hair grows.',
    published: true,
  },
  {
    id: 'faq-col-05',
    category: 'Hair Colour',
    question: 'Can I bring a reference photo for my desired hair colour?',
    answer:
      'Please do. A reference photo is the most accurate way to communicate the shade and finish you want. Save a few options with different lighting so your stylist can understand the range you\'re looking at.',
    published: true,
  },

  // ── PRICING & APPOINTMENTS ───────────────────────────────────────────────
  {
    id: 'faq-price-01',
    category: 'Pricing & Appointments',
    question: 'How much does a haircut cost?',
    answer:
      'Haircut prices vary by hair length, style, and stylist. For the most accurate pricing, message us on WhatsApp at +91 86863 85552 and describe what you\'re looking for. We\'ll confirm the cost before you visit.',
    published: true,
  },
  {
    id: 'faq-price-02',
    category: 'Pricing & Appointments',
    question: 'How much do hair treatments cost?',
    answer:
      'Hair spa services start from Rs. 899. Straightening starts from Rs. 3,999 and smoothing from Rs. 4,999, with prices varying by hair length. For exact pricing on your specific hair, message us on WhatsApp before booking.',
    published: true,
  },
  {
    id: 'faq-price-03',
    category: 'Pricing & Appointments',
    question: 'Does pricing depend on hair length?',
    answer:
      'Yes. For most chemical and colour services, pricing is based on hair length — short, medium, or long. Your stylist will confirm the price for your hair length before starting any service.',
    published: true,
  },
  {
    id: 'faq-price-04',
    category: 'Pricing & Appointments',
    question: 'Can I confirm the price before starting a service?',
    answer:
      'Yes, always. We quote the price before beginning any service. If you\'re unsure, ask your stylist before they start. No service begins without your agreement on the cost.',
    published: true,
  },
  {
    id: 'faq-price-05',
    category: 'Pricing & Appointments',
    question: 'Do I need to book in advance?',
    answer:
      'Walk-ins are welcome, but booking in advance over WhatsApp means you won\'t have to wait. During busy periods — evenings, weekends, and before festivals — advance booking is especially helpful.',
    published: true,
  },
  {
    id: 'faq-price-06',
    category: 'Pricing & Appointments',
    question: 'How can I reschedule or cancel an appointment?',
    answer:
      'Message us on WhatsApp at +91 86863 85552 as early as possible if you need to reschedule or cancel. We appreciate advance notice so we can adjust the stylist\'s schedule.',
    published: true,
  },

  // ── GROOMING & BEAUTY ────────────────────────────────────────────────────
  {
    id: 'faq-groom-01',
    category: 'Grooming & Beauty',
    question: 'What grooming and beauty services are available?',
    answer:
      'We offer waxing (arms, legs, full body, facial, underarms), facials (clean-up, gold, diamond, skin whitening, acne, international facials), threading, manicure, pedicure, de-tanning, ear and nose piercing, and makeup services. For the full list with prices, ask us on WhatsApp.',
    published: true,
  },
  {
    id: 'faq-groom-02',
    category: 'Grooming & Beauty',
    question: 'Can I ask about the available services before visiting?',
    answer:
      'Yes. Send us a message on WhatsApp and we\'ll answer your questions about services, timing, and prices before you visit.',
    published: true,
  },
  {
    id: 'faq-groom-03',
    category: 'Grooming & Beauty',
    question: 'How do I choose the right grooming service?',
    answer:
      'Tell us your skin concern or what you\'re trying to achieve — for example, reducing tan, brightening skin, or clearing pores — and we\'ll recommend a facial or treatment that matches. For skincare services, a brief in-person assessment helps us choose correctly.',
    published: true,
  },
  {
    id: 'faq-groom-04',
    category: 'Grooming & Beauty',
    question: 'Can I ask about the products used during my service?',
    answer:
      'Yes. If you have allergies or prefer specific product types, let your stylist know before the service begins. We\'re happy to explain what products we use for any treatment.',
    published: true,
  },

  // ── BRIDAL & SPECIAL OCCASIONS ───────────────────────────────────────────
  {
    id: 'faq-bridal-01',
    category: 'Bridal & Special Occasions',
    question: 'Do you provide services for weddings and special occasions?',
    answer:
      'Yes. We offer bridal makeup (starting from Rs. 10,000), party makeup, hair styling for events, and beauty packages. We recommend contacting us well in advance to discuss what you need for your special day.',
    published: true,
  },
  {
    id: 'faq-bridal-02',
    category: 'Bridal & Special Occasions',
    question: 'How early should I book for a bridal service?',
    answer:
      'For weddings, we recommend booking at least 2–4 weeks in advance, especially during the wedding season. This allows time for a consultation, a trial session if needed, and confirmation of your slot on the wedding day.',
    published: true,
  },
  {
    id: 'faq-bridal-03',
    category: 'Bridal & Special Occasions',
    question: 'Can I discuss my look before the wedding or event?',
    answer:
      'Yes. We recommend scheduling a consultation before your event. During the consultation, your stylist will understand your preferences, review reference photos, and suggest a look that suits you. For weddings, a trial session is a great way to finalise the look in advance.',
    published: true,
  },
  {
    id: 'faq-bridal-04',
    category: 'Bridal & Special Occasions',
    question: 'Can I share reference images for my event look?',
    answer:
      'Please do. Bring printed photos or save images on your phone. The more reference material you share, the more accurately we can recreate or adapt the look you want.',
    published: true,
  },

  // ── AFTERCARE ────────────────────────────────────────────────────────────
  {
    id: 'faq-care-01',
    category: 'Aftercare',
    question: 'How do I maintain my haircut between visits?',
    answer:
      'Trim split ends regularly — every 6–8 weeks for most haircuts. Use a conditioner suited to your hair type after every wash. Avoid excess heat from straighteners and dryers, and always apply a heat protectant spray before styling with heat tools.',
    published: true,
  },
  {
    id: 'faq-care-02',
    category: 'Aftercare',
    question: 'What products are recommended for coloured hair?',
    answer:
      'Use sulphate-free and colour-protecting shampoo and conditioner. Apply a weekly deep conditioning mask to maintain moisture. Avoid swimming in chlorinated pools without protecting your hair first, and minimise heat styling to preserve colour vibrancy.',
    published: true,
  },
  {
    id: 'faq-care-03',
    category: 'Aftercare',
    question: 'How often should I visit the salon for a trim?',
    answer:
      'For most haircuts, every 6–8 weeks keeps the shape looking fresh. If you have chemically treated, coloured, or straightened hair, you may need more frequent trims — around every 4–6 weeks — to remove dry ends and maintain the style.',
    published: true,
  },
  {
    id: 'faq-care-04',
    category: 'Aftercare',
    question: 'What should I do if my hair colour fades quickly?',
    answer:
      'Colour fading is usually caused by washing with hot water, using non-colour-safe shampoo, or exposure to sun without protection. Switch to a sulphate-free colour shampoo, wash in cool water, and use a UV protection spray or serum when outdoors. If fading is unusually fast, message us on WhatsApp and we\'ll help identify the cause.',
    published: true,
  },
];
