export interface ServiceItem {
  id: string;
  name: string;
  category: 'hair' | 'treatments' | 'bridal' | 'beauty';
  categoryLabel: string;
  description: string;
  image: string;
  duration?: string;
  idealFor?: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: 'haircuts' | 'colour' | 'bridal' | 'treatments' | 'salon';
  categoryLabel: string;
  image: string;
  alt: string;
}

export const SALON_INFO = {
  name: 'Golden Wizard Professional Salon',
  shortName: 'Golden Wizard',
  category: 'Professional Hair & Beauty Salon',
  rating: 4.4,
  reviewCount: 171,
  phoneDisplay: '+91 86863 85552',
  phoneRaw: '+918686385552',
  whatsappNumber: '918686385552',
  address: {
    line1: '4, Gandi Maisamma X Rd',
    landmark: 'Opposite Indian Oil Petrol Pump',
    area: 'Gandi Maisamma',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500043',
    full: '4, Gandi Maisamma X Rd, Opposite Indian Oil Petrol Pump, Gandi Maisamma, Hyderabad, Telangana 500043',
  },
  hours: 'Open daily until 9:00 PM (9:00 AM - 9:00 PM)',
  googleMapsDirectionsUrl:
    'https://www.google.com/maps/dir/?api=1&destination=Golden+Wizard+Professional+Salon+Gandi+Maisamma+Hyderabad+500043',
  googleMapsSearchUrl:
    'https://www.google.com/maps/search/?api=1&query=Golden+Wizard+Professional+Salon+Gandi+Maisamma+Hyderabad',
  googleReviewsUrl:
    'https://www.google.com/maps/search/?api=1&query=Golden+Wizard+Professional+Salon+Gandi+Maisamma+Hyderabad',
};

export const DEFAULT_WHATSAPP_BOOKING_MESSAGE =
  'Hello Golden Wizard Salon! I would like to book an appointment. Could you please share the available timings and details?';

export const DEFAULT_WHATSAPP_ENQUIRY_MESSAGE =
  'Hello Golden Wizard Salon! I would like to enquire about your salon services and pricing. Could you please share more details?';

export function getWhatsAppUrl(
  message: string = DEFAULT_WHATSAPP_BOOKING_MESSAGE,
  customNumber?: string
): string {
  const digits = (customNumber || SALON_INFO.whatsappNumber || '918686385552').replace(/[^0-9]/g, '');
  const normalized = digits.length === 10 ? `91${digits}` : digits || '918686385552';
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export type BranchId = 'branch-1' | 'branch-2';

export interface SalonBranch {
  id: BranchId;
  branchNumber: string;
  branchLabel: string;
  name: string;
  shortArea: string;
  addressLines: string[];
  fullAddress: string;
  landmark: string;
  phoneDisplay: string | null;
  phoneRaw: string | null;
  phoneNote: string | null;
  hours: string | null;
  rating: number | null;
  reviewCount: number | null;
  googleMapsSearchUrl: string;
  googleMapsDirectionsUrl: string;
  googleMapsEmbedUrl: string;
  mapReferenceNote: string;
  isVerifiedLocation: boolean;
  whatsappBookingMessage: string;
  whatsappEnquiryMessage: string;
}

export const BRANCH_2_SUPPLIED_MAPS_URL =
  'https://www.google.com/maps/search/Pista%20House-%20Gandimaisamma/@17.5791953,78.421096,17z?hl=en';

const BRANCH_2_DIRECTIONS_URL =
  'https://www.google.com/maps/dir/?api=1&destination=' +
  encodeURIComponent(
    'Pista House- Gandimaisamma, Dommara Pochampally Road, D.P. Pally, Dundigal, Hyderabad, Telangana, India'
  );

export const SALON_BRANCHES: SalonBranch[] = [
  {
    id: 'branch-1',
    branchNumber: 'Branch 01',
    branchLabel: 'BRANCH 01 — GANDI MAISAMMA',
    name: 'Golden Wizard Professional Hair & Beauty Salon',
    shortArea: 'Gandi Maisamma, Hyderabad',
    addressLines: [
      'Door No. 4,',
      'M Kotilingareddy,',
      'Survey No. 217/A,',
      '4, Gandi Maisamma X Rd,',
      'Hyderabad, Telangana,',
      'India - 500043.',
    ],
    fullAddress:
      'Door No. 4, M Kotilingareddy, Survey No. 217/A, 4, Gandi Maisamma X Rd, Opposite Indian Oil Petrol Pump, Hyderabad, Telangana, India - 500043.',
    landmark: 'Opposite Indian Oil Petrol Pump, Gandi Maisamma X Rd',
    phoneDisplay: SALON_INFO.phoneDisplay,
    phoneRaw: SALON_INFO.phoneRaw,
    phoneNote: null,
    hours: SALON_INFO.hours,
    rating: SALON_INFO.rating,
    reviewCount: SALON_INFO.reviewCount,
    googleMapsSearchUrl: SALON_INFO.googleMapsSearchUrl,
    googleMapsDirectionsUrl: SALON_INFO.googleMapsDirectionsUrl,
    googleMapsEmbedUrl:
      'https://maps.google.com/maps?q=4,+Gandi+Maisamma+X+Rd,+Opposite+Indian+Oil+Petrol+Pump,+Gandi+Maisamma,+Hyderabad,+Telangana+500043&t=&z=16&ie=UTF8&iwloc=&output=embed',
    mapReferenceNote: 'Verified Branch 01 Google Maps Location',
    isVerifiedLocation: true,
    whatsappBookingMessage:
      'Hello Golden Wizard Professional Salon! I would like to book an appointment at Branch 1 — Gandi Maisamma, Hyderabad.',
    whatsappEnquiryMessage:
      'Hello Golden Wizard Professional Salon! I would like to enquire about your salon services and pricing at Branch 1 — Gandi Maisamma, Hyderabad.',
  },
  {
    id: 'branch-2',
    branchNumber: 'Branch 02',
    branchLabel: 'BRANCH 02 — DOMMARA POCHAMPALLY',
    name: 'Golden Wizard Professional Hair & Beauty Salon',
    shortArea: 'Dommara Pochampally, D.P. Pally, Dundigal',
    addressLines: [
      'Plot No. 72, 73,',
      'Golden Wizard Professional Hair & Beauty Salon,',
      'Dommara Pochampally Road,',
      'D.P. Pally, Dundigal,',
      'Hyderabad, Telangana, India.',
    ],
    fullAddress:
      'Plot No. 72, 73, Golden Wizard Professional Hair & Beauty Salon, Dommara Pochampally Road, D.P. Pally, Dundigal, Hyderabad, Telangana, India.',
    landmark: 'Opposite Pista House, backside of Pista House.',
    phoneDisplay: SALON_INFO.phoneDisplay,
    phoneRaw: SALON_INFO.phoneRaw,
    phoneNote: null,
    hours: null,
    rating: null,
    reviewCount: null,
    googleMapsSearchUrl: BRANCH_2_SUPPLIED_MAPS_URL,
    googleMapsDirectionsUrl: BRANCH_2_DIRECTIONS_URL,
    googleMapsEmbedUrl:
      'https://maps.google.com/maps?q=Pista+House+Gandimaisamma+Dommara+Pochampally+Hyderabad&t=&z=16&ie=UTF8&iwloc=&output=embed',
    mapReferenceNote: 'Reference area near Pista House (Dommara Pochampally Rd)',
    isVerifiedLocation: false,
    whatsappBookingMessage:
      'Hello Golden Wizard Professional Salon! I would like to book an appointment at Branch 2 — Dommara Pochampally, near Pista House, Dundigal.',
    whatsappEnquiryMessage:
      'Hello Golden Wizard Professional Salon! I would like to enquire about your salon services and timings at Branch 2 — Dommara Pochampally, near Pista House, Dundigal.',
  },
];

export function getBranchById(branchId: BranchId): SalonBranch {
  return SALON_BRANCHES.find((b) => b.id === branchId) || SALON_BRANCHES[0];
}

export function getBranchWhatsAppBookingUrl(
  branchId: BranchId,
  customNumber?: string
): string {
  const branch = getBranchById(branchId);
  return getWhatsAppUrl(branch.whatsappBookingMessage, customNumber);
}

export function getBranchWhatsAppEnquiryUrl(
  branchId: BranchId,
  customNumber?: string
): string {
  const branch = getBranchById(branchId);
  return getWhatsAppUrl(branch.whatsappEnquiryMessage, customNumber);
}

export const SERVICES: ServiceItem[] = [
  // CATEGORY 1: HAIR SERVICES
  {
    id: 'haircut',
    name: 'Haircut',
    category: 'hair',
    categoryLabel: 'Hair Services',
    description: 'Precision cutting tailored to your face shape, hair texture, and individual lifestyle.',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-21_at_6.27.29_AM_4de0e9f0.jpeg',
    duration: '30-45 mins',
  },
  {
    id: 'hairstyling',
    name: 'Hairstyling',
    category: 'hair',
    categoryLabel: 'Hair Services',
    description: 'Expert event and everyday styling that sculpts volume, definition, and sophisticated finish.',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-21_at_6.27.29_AM__1__15aa2e66.jpeg',
    duration: '40-60 mins',
  },
  {
    id: 'blow-dry',
    name: 'Blow Dry',
    category: 'hair',
    categoryLabel: 'Hair Services',
    description: 'Smooth, salon-fresh blow-outs giving luminous shine, bounce, and effortless movement.',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-21_at_6.27.30_AM__1__3920537a.jpeg',
    duration: '30 mins',
  },
  {
    id: 'hair-straightening',
    name: 'Hair Straightening',
    category: 'hair',
    categoryLabel: 'Hair Services',
    description: 'Long-lasting sleek, silky, and frizz-free straightening using professional salon care formulas.',
    image: '/assets/salon/golden-wizard-hair-straightening-service.png',
    duration: '2-3 hours',
  },
  {
    id: 'curly-hair-styling',
    name: 'Curly Hair Styling',
    category: 'hair',
    categoryLabel: 'Hair Services',
    description: 'Specialized curl hydration, definition, and shaping techniques that celebrate natural waves and coils.',
    image: '/assets/salon/golden-wizard-curly-layered-hairstyling.png',
    duration: '45-60 mins',
  },
  {
    id: 'braiding',
    name: 'Braiding',
    category: 'hair',
    categoryLabel: 'Hair Services',
    description: 'Intricate and traditional hair braiding styles designed with clean sectioning and lasting hold.',
    image: '/assets/salon/golden-wizard-branch1-team-styling.png',
    duration: '45-90 mins',
  },
  {
    id: 'childrens-cuts',
    name: "Children's Haircuts",
    category: 'hair',
    categoryLabel: 'Hair Services',
    description: 'Patient, gentle, and trendy haircuts designed in a friendly, comfortable setting for kids.',
    image: '/assets/salon/golden-wizard-branch1-interior-stations.png',
    duration: '20-30 mins',
  },
  {
    id: 'shampoo-conditioning',
    name: 'Shampoo and Conditioning',
    category: 'hair',
    categoryLabel: 'Hair Services',
    description: 'Invigorating scalp cleansing and deep moisture conditioning bath for soft, healthy hair.',
    image: '/assets/salon/golden-wizard-branch1-interior-stations.png',
    duration: '20-30 mins',
  },
  {
    id: 'perms',
    name: 'Perms',
    category: 'hair',
    categoryLabel: 'Hair Services',
    description: 'Modern texturizing and perming to add enduring bounce, curls, or beachy volume.',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-21_at_6.27.32_AM__1__a4d77c52.jpeg',
    duration: '2-3 hours',
  },

  // CATEGORY 2: HAIR COLOURING & TREATMENTS
  {
    id: 'hair-colouring',
    name: 'Hair Colouring',
    category: 'treatments',
    categoryLabel: 'Colour & Treatments',
    description: 'Full-coverage, gloss-infused global colour customized to enhance your skin tone and personality.',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-21_at_6.27.32_AM_94fce330.jpeg',
    duration: '90-120 mins',
  },
  {
    id: 'hair-highlighting',
    name: 'Hair Highlighting',
    category: 'treatments',
    categoryLabel: 'Colour & Treatments',
    description: 'Dimensional foil highlights and babylights adding sun-kissed depth and radiant contrast.',
    image: '/assets/salon/golden-wizard-crimson-highlights-hair-colour.png',
    duration: '2-3 hours',
  },
  {
    id: 'balayage',
    name: 'Balayage',
    category: 'treatments',
    categoryLabel: 'Colour & Treatments',
    description: 'Hand-painted seamless colour transition delivering an effortlessly blended, low-maintenance glow.',
    image: '/assets/salon/golden-wizard-layered-cut-burgundy-highlights.png',
    duration: '2.5-3.5 hours',
  },
  {
    id: 'keratin-treatments',
    name: 'Keratin Treatments',
    category: 'treatments',
    categoryLabel: 'Colour & Treatments',
    description: 'Intense protein therapy that restores damaged cuticles, banishes frizz, and locks in mirror shine.',
    image: '/assets/salon/golden-wizard-hair-straightening-service.png',
    duration: '2-3 hours',
  },
  {
    id: 'hair-treatments',
    name: 'Hair Treatments',
    category: 'treatments',
    categoryLabel: 'Colour & Treatments',
    description: 'Customized deep repair masks, hair spa, and moisture infusions targeting dryness and breakage.',
    image: '/assets/salon/golden-wizard-branch1-interior-stations.png',
    duration: '45-60 mins',
  },
  {
    id: 'hair-regrowth-services',
    name: 'Hair Regrowth Services',
    category: 'treatments',
    categoryLabel: 'Colour & Treatments',
    description: 'Targeted scalp stimulation and revitalizing nourishing sessions aimed at strengthening hair roots.',
    image: '/assets/salon/golden-wizard-branch1-team-styling.png',
    duration: '60 mins',
  },

  // CATEGORY 3: BRIDAL & MAKEUP
  {
    id: 'bridal-hair',
    name: 'Bridal Hair',
    category: 'bridal',
    categoryLabel: 'Bridal & Makeup',
    description: 'Exquisite bridal updos, romantic cascades, and floral styling crafted for your special day.',
    image: '/assets/salon/golden-wizard-curly-layered-hairstyling.png',
    duration: '60-90 mins',
  },
  {
    id: 'bridal-services',
    name: 'Bridal Services',
    category: 'bridal',
    categoryLabel: 'Bridal & Makeup',
    description: 'Comprehensive pre-wedding and wedding-day grooming, skin prep, and bespoke beauty packages.',
    image: '/assets/salon/golden-wizard-layered-cut-burgundy-highlights.png',
    duration: 'Consultation based',
  },
  {
    id: 'makeup-services',
    name: 'Makeup Services',
    category: 'bridal',
    categoryLabel: 'Bridal & Makeup',
    description: 'Flawless makeup for weddings, receptions, parties, and celebrations highlighting your best features.',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-21_at_6.27.31_AM__1__ed28adab.jpeg',
    duration: '60-75 mins',
  },

  // CATEGORY 4: BEAUTY & GROOMING
  {
    id: 'shaving',
    name: 'Shaving & Beard Grooming',
    category: 'beauty',
    categoryLabel: 'Beauty & Grooming',
    description: 'Classic wet shave with warm towel finish, sharp line-ups, and luxury beard conditioning.',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-21_at_6.27.29_AM__2__4e819700.jpeg',
    duration: '25-35 mins',
  },
  {
    id: 'detan-facial',
    name: 'De-tan and Facial',
    category: 'beauty',
    categoryLabel: 'Beauty & Grooming',
    description: 'Skin rejuvenating de-tanning and glow facials to clear pollutants, restore radiance, and revitalize skin.',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-21_at_6.27.31_AM_4f051629.jpeg',
    duration: '45-60 mins',
  },
  {
    id: 'manicure-pedicure',
    name: 'Manicure and Pedicure',
    category: 'beauty',
    categoryLabel: 'Beauty & Grooming',
    description: 'Pampering hand and foot spa rituals, cuticle care, gentle exfoliation, and nail shaping.',
    image: '/assets/aistudio/WhatsApp_Image_2026-11-21_at_6.27.30_AM_abfaefe6.jpeg',
    duration: '45-75 mins',
  },
];

export const GOOGLE_REVIEWS = [
  {
    id: 'rev-1',
    author: 'Verified Google Reviewer',
    rating: 5,
    quote: 'Hygienic place with good service.',
    badge: 'Verified Customer',
    date: 'Recent Google Review',
  },
  {
    id: 'rev-2',
    author: 'Verified Google Reviewer',
    rating: 5,
    quote: 'Highly recommend this salon for top-notch grooming and styling services!',
    badge: 'Local Guide',
    date: 'Recent Google Review',
  },
  {
    id: 'rev-3',
    author: 'Verified Google Reviewer',
    rating: 5,
    quote: 'Work and behaviour both are equally good.',
    badge: 'Verified Customer',
    date: 'Recent Google Review',
  },
];

export const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'gal-1',
    title: 'Golden Wizard Storefront — Branch 01',
    category: 'salon',
    categoryLabel: 'Salon Exterior',
    image: '/assets/salon/golden-wizard-branch1-storefront.png',
    alt: 'Golden Wizard Hair and Beauty Salon Branch 01 storefront exterior in Gandi Maisamma, Hyderabad',
  },
  {
    id: 'gal-2',
    title: 'Styling Stations, Mirrors & Wash Bay',
    category: 'salon',
    categoryLabel: 'Salon Interior',
    image: '/assets/salon/golden-wizard-branch1-interior-stations.png',
    alt: 'Golden Wizard Branch 01 interior with wooden-framed mirrors, styling chairs, wash station, and hooded steamer',
  },
  {
    id: 'gal-3',
    title: 'Stylists at Work & Client Lounge',
    category: 'salon',
    categoryLabel: 'Team & Interior',
    image: '/assets/salon/golden-wizard-branch1-team-styling.png',
    alt: 'Golden Wizard salon stylists serving clients while guests relax in the waiting area',
  },
  {
    id: 'gal-4',
    title: 'Reception Desk & Entrance Lounge',
    category: 'salon',
    categoryLabel: 'Salon Interior',
    image: '/assets/salon/golden-wizard-branch1-reception-entrance.png',
    alt: 'Golden Wizard Branch 01 reception desk, waiting sofa, and glass entrance door',
  },
  {
    id: 'gal-5',
    title: 'Precision Hair Straightening Service',
    category: 'treatments',
    categoryLabel: 'Hair Services',
    image: '/assets/salon/golden-wizard-hair-straightening-service.png',
    alt: 'Golden Wizard stylists performing professional hair straightening treatment',
  },
  {
    id: 'gal-6',
    title: 'Glossy Layered Curls & Wave Styling',
    category: 'haircuts',
    categoryLabel: 'Hair Styling',
    image: '/assets/salon/golden-wizard-curly-layered-hairstyling.png',
    alt: 'Client hair styled in voluminous dark layered curls inside Golden Wizard salon',
  },
  {
    id: 'gal-7',
    title: 'Layered Haircut with Burgundy Sheen',
    category: 'haircuts',
    categoryLabel: 'Hair Styling & Cut',
    image: '/assets/salon/golden-wizard-layered-cut-burgundy-highlights.png',
    alt: 'Client admiring layered haircut with subtle burgundy highlights in Golden Wizard vanity mirror',
  },
  {
    id: 'gal-8',
    title: 'Crimson Highlights & Colour Craft',
    category: 'colour',
    categoryLabel: 'Hair Colouring',
    image: '/assets/salon/golden-wizard-crimson-highlights-hair-colour.png',
    alt: 'Bold crimson and red lower highlights hair colour result photographed at Golden Wizard salon chair',
  },
];

export const WHY_CHOOSE_US = [
  {
    title: 'Professional Hair & Beauty Services',
    description:
      'From classic scissor cuts to advanced keratin therapy, every service is performed with precision technique and premium salon-grade products.',
    icon: 'Sparkles',
  },
  {
    title: 'Multiple Styling & Treatment Options',
    description:
      'A comprehensive suite of 20+ specialized services including balayage, perms, curly hair care, bridal makeovers, and grooming under one roof.',
    icon: 'Layers',
  },
  {
    title: 'Welcoming Salon Experience',
    description:
      'A hygienic, comfortable, and courteous environment where our team listens attentively to your preferences and ensures a relaxing visit.',
    icon: 'HeartHandshake',
  },
  {
    title: 'Convenient Gandi Maisamma Location',
    description:
      'Centrally located on Gandi Maisamma X Road right opposite the Indian Oil Petrol Pump, with accessible parking and easy transit connections.',
    icon: 'MapPin',
  },
];
