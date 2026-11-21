/**
 * Canonical Menu & Certificate Seed Data for Golden Wizard Professional Salon
 * Derived strictly from verified client PDFs:
 * - Menu: client_pdf_2.pdf (Pages 1-6; Page 7 is Director/Brand poster)
 * - Certificates: client_document.pdf (Pages 2-6; Page 1/4 duplicate consolidated to Page 4 scan)
 */

export interface MenuService {
  id: string;
  categoryId: string;
  name: string;
  price: number | null; // null = Pricing on Consultation
  priceDisplay: string; // e.g., "Rs. 249" or "Consultation"
  note?: string;
  pdfPage?: number;
  displayOrder: number;
  active: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  group: 'hair' | 'skin' | 'nails-bridal';
  description?: string;
  image: string;
  pdfPage?: number;
  displayOrder: number;
  visible: boolean;
}

export interface MenuSnapshot {
  categories: MenuCategory[];
  services: MenuService[];
  pdfUrl: string;
  pdfFilename: string;
}

export interface MenuVersion {
  id: string;
  versionNumber: number;
  publishedAt: string;
  publishedBy: string;
  changeSummary: string;
  snapshot: MenuSnapshot;
}

export interface CertificateItem {
  id: string;
  title: string;
  recipient?: string;
  issuingOrganization: string;
  centre?: string;
  issueDate?: string;
  certificateRef?: string;
  category: string;
  description?: string;
  fileUrl: string;
  fileType: 'image' | 'pdf';
  displayOrder: number;
  published: boolean;
  createdAt: string;
}

export function formatRsPrice(price: number | null | undefined): string {
  if (price === null || price === undefined || Number.isNaN(price)) {
    return 'Consultation';
  }
  return `Rs. ${price}`;
}

// Genuine Golden Wizard salon imagery mapped to categories (zero demo/stock URLs)
export const INITIAL_MENU_CATEGORIES: MenuCategory[] = [
  {
    id: 'cat-waxing',
    name: 'Waxing',
    group: 'skin',
    description: 'Gentle and hygienic waxing services for arms, legs, face, and full body.',
    image: '/assets/salon/golden-wizard-branch1-interior-stations.png',
    pdfPage: 1,
    displayOrder: 0,
    visible: true,
  },
  {
    id: 'cat-facial',
    name: 'Facial',
    group: 'skin',
    description: 'Clean ups and specialized skin care facials tailored to your skin type.',
    image: '/assets/salon/golden-wizard-branch1-interior-stations.png',
    pdfPage: 2,
    displayOrder: 1,
    visible: true,
  },
  {
    id: 'cat-international-facial',
    name: 'International Facial',
    group: 'skin',
    description: 'Signature international facial treatments.',
    image: '/assets/salon/golden-wizard-branch1-reception-entrance.png',
    pdfPage: 2,
    displayOrder: 2,
    visible: true,
  },
  {
    id: 'cat-pedicure',
    name: 'Pedicure',
    group: 'nails-bridal',
    description: 'Relaxing foot care, exfoliation, and spa pedicure rituals.',
    image: '/assets/salon/golden-wizard-branch1-interior-stations.png',
    pdfPage: 3,
    displayOrder: 3,
    visible: true,
  },
  {
    id: 'cat-manicure',
    name: 'Manicure',
    group: 'nails-bridal',
    description: 'Hand grooming, nail shaping, cuticle care, and spa manicure options.',
    image: '/assets/salon/golden-wizard-branch1-reception-entrance.png',
    pdfPage: 3,
    displayOrder: 4,
    visible: true,
  },
  {
    id: 'cat-threading',
    name: 'Threading',
    group: 'skin',
    description: 'Precision brow shaping and gentle facial threading.',
    image: '/assets/salon/golden-wizard-branch1-team-styling.png',
    pdfPage: 3,
    displayOrder: 5,
    visible: true,
  },
  {
    id: 'cat-makeup',
    name: 'Makeup',
    group: 'nails-bridal',
    description: 'Party, light occasion, and full bridal makeup styling.',
    image: '/assets/salon/golden-wizard-layered-cut-burgundy-highlights.png',
    pdfPage: 4,
    displayOrder: 6,
    visible: true,
  },
  {
    id: 'cat-piercing',
    name: 'Ear and Nose Piercing',
    group: 'nails-bridal',
    description: 'Hygienic ear and nose piercing services.',
    image: '/assets/salon/golden-wizard-branch1-reception-entrance.png',
    pdfPage: 4,
    displayOrder: 7,
    visible: true,
  },
  {
    id: 'cat-tattoo-nail-art',
    name: "Tatoo's Nail Art",
    group: 'nails-bridal',
    description: 'Custom nail art and tattoo styling — pricing shared upon consultation.',
    image: '/assets/salon/golden-wizard-branch1-storefront.png',
    pdfPage: 4,
    displayOrder: 8,
    visible: true,
  },
  {
    id: 'cat-women-hair-style',
    name: 'Women Hair Style',
    group: 'hair',
    description: 'Hair styling, blow dry, look change, wash, and relaxing head massage.',
    image: '/assets/salon/golden-wizard-curly-layered-hairstyling.png',
    pdfPage: 5,
    displayOrder: 9,
    visible: true,
  },
  {
    id: 'cat-colors',
    name: 'Colors',
    group: 'hair',
    description: 'Root touchup, global color, fashion shades, streaking, and henna.',
    image: '/assets/salon/golden-wizard-crimson-highlights-hair-colour.png',
    pdfPage: 5,
    displayOrder: 10,
    visible: true,
  },
  {
    id: 'cat-straightening-rebounding',
    name: 'Straightening & Rebounding',
    group: 'hair',
    description: 'Texture transformation including straightening, smoothing, rebounding, and perming.',
    image: '/assets/salon/golden-wizard-hair-straightening-service.png',
    pdfPage: 6,
    displayOrder: 11,
    visible: true,
  },
  {
    id: 'cat-hair-spa',
    name: 'Hair Spa',
    group: 'hair',
    description: 'Targeted hair spa and conditioning therapies for scalp and strand health.',
    image: '/assets/salon/golden-wizard-branch1-team-styling.png',
    pdfPage: 6,
    displayOrder: 12,
    visible: true,
  },
  {
    id: 'cat-detan',
    name: 'De-Tan',
    group: 'skin',
    description: 'De-tan skin treatments for face, arms, legs, back, and body.',
    image: '/assets/salon/golden-wizard-branch1-interior-stations.png',
    pdfPage: 6,
    displayOrder: 13,
    visible: true,
  },
];

function svc(
  id: string,
  categoryId: string,
  name: string,
  price: number | null,
  displayOrder: number,
  pdfPage: number,
  note?: string
): MenuService {
  return {
    id,
    categoryId,
    name,
    price,
    priceDisplay: formatRsPrice(price),
    note,
    pdfPage,
    displayOrder,
    active: true,
  };
}

export const INITIAL_MENU_SERVICES: MenuService[] = [
  // PAGE 1: WAXING (16)
  svc('wax-full-arms', 'cat-waxing', 'Full Arms', 249, 0, 1),
  svc('wax-half-arms', 'cat-waxing', 'Half Arms', 149, 1, 1),
  svc('wax-3-4-arms', 'cat-waxing', '3/4 Arms', 199, 2, 1),
  svc('wax-under-arms', 'cat-waxing', 'Under Arms', 149, 3, 1),
  svc('wax-half-legs', 'cat-waxing', 'Half Legs', 249, 4, 1),
  svc('wax-3-4-legs', 'cat-waxing', '3/4 Legs', 299, 5, 1),
  svc('wax-full-legs', 'cat-waxing', 'Full Legs', 399, 6, 1),
  svc('wax-full-back', 'cat-waxing', 'Full Back', 399, 7, 1),
  svc('wax-half-back', 'cat-waxing', 'Half Back', 149, 8, 1),
  svc('wax-stomach', 'cat-waxing', 'Stomach', 149, 9, 1),
  svc('wax-face-wax', 'cat-waxing', 'Face Wax', 299, 10, 1),
  svc('wax-cheeks', 'cat-waxing', 'Cheeks', 99, 11, 1),
  svc('wax-upper-lip', 'cat-waxing', 'Upper Lip', 39, 12, 1),
  svc('wax-chin-wax', 'cat-waxing', 'Chin Wax', 49, 13, 1),
  svc('wax-full-body', 'cat-waxing', 'Full Body Wax', 2499, 14, 1),
  svc('wax-foot-wax', 'cat-waxing', 'Foot Wax', 99, 15, 1),

  // PAGE 2: FACIAL (10)
  svc('fac-clean-up', 'cat-facial', 'Clean Up', 249, 0, 2),
  svc('fac-aroma', 'cat-facial', 'Aroma Facial', 499, 1, 2),
  svc('fac-fruit', 'cat-facial', 'Fruit Facial', 399, 2, 2),
  svc('fac-silver', 'cat-facial', 'Silver Facial', 699, 3, 2),
  svc('fac-acne', 'cat-facial', 'Acne Facial', 699, 4, 2),
  svc('fac-pigmentation', 'cat-facial', 'Pigmentation Facial', 899, 5, 2),
  svc('fac-pearl', 'cat-facial', 'Pearl Facial', 649, 6, 2),
  svc('fac-gold', 'cat-facial', 'Gold Facial', 799, 7, 2),
  svc('fac-diamond', 'cat-facial', 'Diamond Facial', 999, 8, 2),
  svc('fac-skin-whitening', 'cat-facial', 'Skin Whitening Facial', 1499, 9, 2),

  // PAGE 2: INTERNATIONAL FACIAL (2)
  svc('intfac-white-secreat', 'cat-international-facial', 'White Secreat', 2500, 0, 2, 'PDF spelling: White Secreat'),
  svc('intfac-pure-secreat', 'cat-international-facial', 'Pure Secreat', 2500, 1, 2, 'PDF spelling: Pure Secreat'),

  // PAGE 3: PEDICURE (5)
  svc('ped-regular', 'cat-pedicure', 'Regular Pedicure', 299, 0, 3),
  svc('ped-aroma', 'cat-pedicure', 'Aroma Pedicure', 399, 1, 3),
  svc('ped-french', 'cat-pedicure', 'French Pedicure', 499, 2, 3),
  svc('ped-spa', 'cat-pedicure', 'Spa Pedicure', 599, 3, 3),
  svc('ped-crystal', 'cat-pedicure', 'Crystal Pedicure', 699, 4, 3),

  // PAGE 3: MANICURE (5)
  svc('man-regular', 'cat-manicure', 'Regular Manicure', 249, 0, 3),
  svc('man-aroma', 'cat-manicure', 'Aroma Manicure', 199, 1, 3, 'Exact PDF price Rs. 199'),
  svc('man-french', 'cat-manicure', 'French Manicure', 349, 2, 3),
  svc('man-spa', 'cat-manicure', 'Spa Manicure', 399, 3, 3),
  svc('man-crystal', 'cat-manicure', 'Crystal Manicure', 499, 4, 3),

  // PAGE 3: THREADING (8)
  svc('thr-eyebrows', 'cat-threading', 'Eyebrows', 39, 0, 3),
  svc('thr-upper-lip', 'cat-threading', 'Upper Lip', 19, 1, 3),
  svc('thr-chin', 'cat-threading', 'Chin', 19, 2, 3),
  svc('thr-forehead', 'cat-threading', 'Forehead', 19, 3, 3),
  svc('thr-side-lock', 'cat-threading', 'Side Lock', 49, 4, 3),
  svc('thr-face', 'cat-threading', 'Face Threading', 199, 5, 3),
  svc('thr-lower-lip', 'cat-threading', 'Lower Lip', 19, 6, 3),
  svc('thr-nose', 'cat-threading', 'Nose Threading', 19, 7, 3),

  // PAGE 4: MAKEUP (3)
  svc('mkp-party-ware', 'cat-makeup', 'Party ware Makeup', 5000, 0, 4, 'PDF spelling: Party ware Makeup'),
  svc('mkp-light', 'cat-makeup', 'Light Makeup', 3000, 1, 4),
  svc('mkp-bridal', 'cat-makeup', 'Bridal Makeup', 10000, 2, 4),

  // PAGE 4: EAR AND NOSE PIERCING (2)
  svc('prc-ear', 'cat-piercing', 'Ear Pearsing', 200, 0, 4, 'PDF spelling: Ear Pearsing'),
  svc('prc-nose', 'cat-piercing', 'Nose Pearsing', 200, 1, 4, 'PDF spelling: Nose Pearsing'),

  // PAGE 4: TATOO'S NAIL ART (0 items priced in PDF — handled cleanly without fabricated prices)

  // PAGE 5: WOMEN HAIR STYLE (8)
  svc('whs-hair-styling', 'cat-women-hair-style', 'Hair Styling', 549, 0, 5),
  svc('whs-baby-hair-styling', 'cat-women-hair-style', 'baby Hair Styling', 199, 1, 5),
  svc('whs-blow-dry', 'cat-women-hair-style', 'Blow Dry', 249, 2, 5),
  svc('whs-shampoo-natural-dry', 'cat-women-hair-style', 'Shampoo & Natural Dry', 149, 3, 5),
  svc('whs-spl-head-massage', 'cat-women-hair-style', 'Spl Head Massage', 349, 4, 5),
  svc('whs-head-massage', 'cat-women-hair-style', 'Head Massage', 299, 5, 5),
  svc('whs-look-change', 'cat-women-hair-style', 'Look Change', 899, 6, 5),
  svc('whs-shampoo-conditioner', 'cat-women-hair-style', 'Shampoo & Conditioner', 149, 7, 5),

  // PAGE 5: COLORS (5)
  svc('col-root-touchup', 'cat-colors', 'Root Touchup', 499, 0, 5),
  svc('col-global', 'cat-colors', 'Global Color', 999, 1, 5),
  svc('col-fashion', 'cat-colors', 'Fashion Color', 1999, 2, 5),
  svc('col-streaking', 'cat-colors', 'Color Streaking', 1499, 3, 5),
  svc('col-henna', 'cat-colors', 'Henna', 299, 4, 5),

  // PAGE 6: STRAIGHTENING & REBOUNDING (5)
  svc('str-straightining', 'cat-straightening-rebounding', 'Straightining', 3999, 0, 6, 'PDF spelling: Straightining'),
  svc('str-smoothing', 'cat-straightening-rebounding', 'Smoothing', 4999, 1, 6),
  svc('str-reboundning', 'cat-straightening-rebounding', 'Reboundning', 6999, 2, 6, 'PDF spelling: Reboundning'),
  svc('str-pumming', 'cat-straightening-rebounding', 'Pumming', 3999, 3, 6, 'PDF spelling: Pumming'),
  svc('str-cimping-ironing', 'cat-straightening-rebounding', 'Cimping & Ironing', 599, 4, 6, 'PDF spelling: Cimping & Ironing'),

  // PAGE 6: HAIR SPA (6)
  svc('spa-hair-spa', 'cat-hair-spa', 'Hair Spa', 899, 0, 6),
  svc('spa-antidandruff', 'cat-hair-spa', 'Antidandruff Spa', 899, 1, 6),
  svc('spa-smothing', 'cat-hair-spa', 'Smothing Spa', 899, 2, 6, 'PDF spelling: Smothing Spa'),
  svc('spa-deep-conditioner', 'cat-hair-spa', 'Deep Conditioner', 599, 3, 6),
  svc('spa-anti-hair-fall', 'cat-hair-spa', 'Anti hair fall', 899, 4, 6),
  svc('spa-dryness-control', 'cat-hair-spa', 'Dry ness control', 899, 5, 6),

  // PAGE 6: DE-TAN (12)
  svc('det-face', 'cat-detan', 'FACE', 199, 0, 6),
  svc('det-face-neck', 'cat-detan', 'Face & Neck', 249, 1, 6),
  svc('det-full-arms', 'cat-detan', 'Full Arms', 299, 2, 6),
  svc('det-half-arms', 'cat-detan', 'Half Arms', 199, 3, 6),
  svc('det-under-arms', 'cat-detan', 'Under Arms', 149, 4, 6),
  svc('det-full-legs', 'cat-detan', 'Full Legs', 499, 5, 6),
  svc('det-half-legs', 'cat-detan', 'Half Legs', 399, 6, 6),
  svc('det-half-back', 'cat-detan', 'Half Back', 299, 7, 6),
  svc('det-half-front', 'cat-detan', 'Half Front', 199, 8, 6),
  svc('det-3-4-hands', 'cat-detan', '3/4 Hands', 249, 9, 6),
  svc('det-3-4-legs', 'cat-detan', '3/4 Legs', 249, 10, 6),
  svc('det-full-body', 'cat-detan', 'Full Body', 249, 11, 6, 'PDF prints Rs. 249 — verify price in Owner Dashboard'),
];

export const INITIAL_MENU_SNAPSHOT: MenuSnapshot = {
  categories: INITIAL_MENU_CATEGORIES,
  services: INITIAL_MENU_SERVICES,
  pdfUrl: '/assets/golden-wizard-menu.pdf',
  pdfFilename: 'Golden-Wizard-Salon-Menu.pdf',
};

// Real Extracted Certificates from client_document.pdf (Pages 2-6)
export const INITIAL_REAL_CERTIFICATES: CertificateItem[] = [
  {
    id: 'GW-CERT-JH-2016',
    title: 'Certificate of Participation — One Day Advanced Workshop in Hair Fashion',
    recipient: 'Ravi Kanth. M',
    issuingOrganization: 'Jawed Habib Academy (Mumbai)',
    issueDate: '20-Sep-2016',
    category: 'Hair Fashion Workshop',
    description: 'Participation in the One Day Advanced Workshop in Hair Fashion conducted by Jawed Habib Academy.',
    fileUrl: '/assets/certificates/cert-page-3.jpg',
    fileType: 'image',
    displayOrder: 0,
    published: true,
    createdAt: '2016-09-20T00:00:00.000Z',
  },
  {
    id: 'GW-CERT-MSME-JH',
    title: 'Certificate of Appreciation — Workshop on Beauty & Wellness by Jawed Habib',
    recipient: 'M. Ravikanth',
    issuingOrganization: 'ni-msme (Ministry of MSME, Govt. of India), Jawed Habib Hair & Beauty Ltd. & Indus Integrated Information Management Ltd.',
    category: 'Beauty & Wellness',
    description: 'Jointly initiated workshop by National Institute for Micro, Small and Medium Enterprises, Jawed Habib Hair & Beauty Ltd., and Indus Integrated Information Management Ltd.',
    fileUrl: '/assets/certificates/cert-page-1.jpg',
    fileType: 'image',
    displayOrder: 1,
    published: true,
    createdAt: '2012-01-01T00:00:00.000Z',
  },
  {
    id: 'GW-CERT-2598-2010',
    title: 'Certificate of Excellence — Hair Chemical Science',
    recipient: 'M. RAVI KANTH',
    issuingOrganization: 'Jawed Habib — A Professional Institute',
    centre: 'HYDERABAD',
    issueDate: '13-08-2010',
    certificateRef: '2598-2010',
    category: 'Hair Chemical Science',
    description: 'Successfully completed course in Hair Chemical Science at Jawed Habib — A Professional Institute, Hyderabad Centre.',
    fileUrl: '/assets/certificates/cert-page-2.jpg',
    fileType: 'image',
    displayOrder: 2,
    published: true,
    createdAt: '2010-08-13T00:00:00.000Z',
  },
  {
    id: 'GW-CERT-2597-2010',
    title: 'Certificate of Excellence — Hair Cutting and Blow Drying Systems',
    recipient: 'M RAVI KANTH',
    issuingOrganization: 'Jawed Habib — A Professional Institute',
    centre: 'HYDERABAD',
    issueDate: '13-08-2010',
    certificateRef: '2597-2010',
    category: 'Cutting & Blow Drying',
    description: 'Successfully completed course in Hair Cutting and Blow Drying Systems at Jawed Habib — A Professional Institute, Hyderabad Centre.',
    fileUrl: '/assets/certificates/cert-page-4.jpg',
    fileType: 'image',
    displayOrder: 3,
    published: true,
    createdAt: '2010-08-13T00:00:00.000Z',
  },
  {
    id: 'GW-CERT-2599-2010',
    title: 'Certificate of Excellence — Salon Leadership',
    recipient: 'M. RAVI KANTH',
    issuingOrganization: 'Jawed Habib — A Professional Institute',
    centre: 'HYDERABAD',
    issueDate: '13-08-2010',
    certificateRef: '2599-2010',
    category: 'Salon Leadership',
    description: 'Successfully completed course in Salon Leadership at Jawed Habib — A Professional Institute, Hyderabad Centre.',
    fileUrl: '/assets/certificates/cert-page-5.jpg',
    fileType: 'image',
    displayOrder: 4,
    published: true,
    createdAt: '2010-08-13T00:00:00.000Z',
  },
];

// Ambiguous entries detected in original Menu PDF requiring owner verification
export const PDF_VERIFICATION_NOTES = [
  {
    category: 'De-Tan',
    item: 'Full Body',
    pdfValue: 'Rs. 249',
    reason: 'Listed at Rs. 249 on PDF page 6, which is lower than Half Legs (Rs. 399) and Full Legs (Rs. 499) — possibly missing a digit (e.g. Rs. 2499). Kept exact PDF price until verified.',
  },
  {
    category: 'Manicure',
    item: 'Aroma Manicure',
    pdfValue: 'Rs. 199',
    reason: 'Listed at Rs. 199 on PDF page 3, which is lower than Regular Manicure (Rs. 249). Kept exact PDF price until verified.',
  },
  {
    category: 'Ear and Nose Piercing',
    item: 'Category Heading in PDF',
    pdfValue: '"Manicure" heading above Ear Pearsing & Nose Pearsing',
    reason: 'Page 4 of the PDF repeats the heading "Manicure" above Ear Pearsing / Nose Pearsing. Corrected category title to "Ear and Nose Piercing".',
  },
  {
    category: "Tatoo's Nail Art",
    item: 'No prices listed on PDF page 4',
    pdfValue: 'Empty sub-list',
    reason: 'Page 4 contains the heading "Tatoo\'s Nail Art" with no sub-items or prices. Displayed as "Pricing shared upon consultation" — add prices in Menu Manager anytime.',
  },
  {
    category: 'Spelling Variations from PDF',
    item: 'White Secreat, Pure Secreat, Party ware Makeup, Ear/Nose Pearsing, Straightining, Reboundning, Pumming, Cimping & Ironing, Smothing Spa, Dry ness control',
    pdfValue: 'Original PDF spelling preserved',
    reason: 'Preserved verbatim from the original PDF so nothing is misnamed without confirmation. You can edit any spelling directly in Menu Manager.',
  },
];
