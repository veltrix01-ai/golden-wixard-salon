/**
 * Golden Wizard Professional Salon - Unified Database Service
 * Provides local persistent storage (localStorage) with reactive event subscriptions,
 * structured tables, validation, duplicate prevention, and export utilities.
 */

export interface Customer {
  id: string; // e.g., GW-C1001
  fullName: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  registeredDate: string; // YYYY-MM-DD
  appointmentType: 'walk-in' | 'phone-booking' | 'online-enquiry' | 'referral';
  selectedService: string;
  assignedStaff?: string;
  notes?: string;
  nextVisitDate?: string;
  consentMarketing: boolean;
  totalVisits: number;
  archived?: boolean;
  archivedAt?: string;
}

export interface CustomerVisit {
  id: string; // e.g., GW-V2001
  customerId: string;
  customerName: string;
  mobile: string;
  visitDate: string; // YYYY-MM-DD
  visitTime: string; // e.g. "10:30 AM"
  serviceName: string;
  assignedStaff: string;
  status: 'New' | 'Confirmed' | 'Arrived' | 'In Progress' | 'Completed' | 'Cancelled' | 'No Show';
  paymentStatus: 'Paid' | 'Pending' | 'Partial';
  staffNotes?: string;
  amount?: number;
}

export interface Appointment {
  id: string; // e.g., GW-A3001
  customerName: string;
  mobile: string;
  service: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "11:30 AM"
  notes?: string;
  status: 'pending' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled';
  createdAt: string;
  assignedStaff?: string;
}

export interface CustomerQuestion {
  id: string; // e.g., GW-Q5001
  customerName: string;
  mobile: string;
  email?: string;
  category: string;
  question: string;
  preferredContact: 'WhatsApp' | 'Phone Call' | 'Email';
  submittedAt: string;
  status: 'pending' | 'answered' | 'archived';
  answer?: string;
  answeredAt?: string;
}

export interface Certificate {
  id: string; // e.g., GW-CERT-01
  title: string;
  salonName: string;
  issuingOrganization: string;
  description: string;
  issueDate?: string;
  category: 'Styling' | 'Colour & Chemical' | 'Bridal' | 'Hygiene & Safety' | 'Management';
  verificationUrl?: string;
  imageUrl: string;
}

export interface ServiceRecord {
  id: string;
  name: string;
  category: 'hair' | 'treatments' | 'bridal' | 'beauty';
  categoryLabel: string;
  description: string;
  image: string;
  duration?: string;
}

export interface GalleryRecord {
  id: string;
  title: string;
  category: 'haircuts' | 'colour' | 'bridal' | 'treatments' | 'salon';
  categoryLabel: string;
  image: string;
  alt: string;
}

export interface BusinessSettings {
  name: string;
  tagline: string;
  phone: string;
  whatsappNumber?: string;
  address: string;
  hours: string;
  rating: number;
  reviewCount: number;
  announcement: string;
  showAnnouncement: boolean;
}

// Clean Production Data Stores (Zero mock data or dummy names)
const INITIAL_CUSTOMERS: Customer[] = [];
const INITIAL_VISITS: CustomerVisit[] = [];
const INITIAL_APPOINTMENTS: Appointment[] = [];
const INITIAL_QUESTIONS: CustomerQuestion[] = [];

// Authentic Golden Wizard Salon & Hair Styling Photographs (zero demo/stock URLs)
const INITIAL_SERVICES: ServiceRecord[] = [
  // HAIR
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

  // COLOUR & TREATMENTS
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

  // BRIDAL & MAKEUP
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

  // BEAUTY & GROOMING
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

// Authentic Client Photographs for Golden Wizard Salon Gallery
const INITIAL_GALLERY: GalleryRecord[] = [
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

// Real Extracted Certificates from Verified Salon Accreditations
const INITIAL_CERTIFICATES: Certificate[] = [
  {
    id: 'GW-CERT-JH-2016',
    title: 'Certificate of Participation — One Day Advanced Workshop in Hair Fashion',
    salonName: 'Golden Wizard Professional Salon',
    issuingOrganization: 'Jawed Habib Academy (Mumbai)',
    description: 'Participation in the One Day Advanced Workshop in Hair Fashion by Ravi Kanth. M.',
    issueDate: '20-Sep-2016',
    category: 'Styling',
    imageUrl: '/assets/certificates/cert-page-3.jpg',
  },
  {
    id: 'GW-CERT-MSME-JH',
    title: 'Certificate of Appreciation — Workshop on Beauty & Wellness by Jawed Habib',
    salonName: 'Golden Wizard Professional Salon',
    issuingOrganization: 'ni-msme (Ministry of MSME, Govt. of India), Jawed Habib Hair & Beauty Ltd. & Indus Integrated Information Management Ltd.',
    description: 'Certificate of Appreciation awarded to M. Ravikanth for participating in the jointly initiated Beauty & Wellness workshop.',
    category: 'Hygiene & Safety',
    imageUrl: '/assets/certificates/cert-page-1.jpg',
  },
  {
    id: 'GW-CERT-2598-2010',
    title: 'Certificate of Excellence — Hair Chemical Science',
    salonName: 'Golden Wizard Professional Salon',
    issuingOrganization: 'Jawed Habib — A Professional Institute (Hyderabad)',
    description: 'Awarded to M. Ravi Kanth for successfully completing a course in Hair Chemical Science (Ref: 2598-2010).',
    issueDate: '13-08-2010',
    category: 'Colour & Chemical',
    imageUrl: '/assets/certificates/cert-page-2.jpg',
  },
  {
    id: 'GW-CERT-2597-2010',
    title: 'Certificate of Excellence — Hair Cutting and Blow Drying Systems',
    salonName: 'Golden Wizard Professional Salon',
    issuingOrganization: 'Jawed Habib — A Professional Institute (Hyderabad)',
    description: 'Awarded to M Ravi Kanth for successfully completing a course in Hair Cutting and Blow Drying Systems (Ref: 2597-2010).',
    issueDate: '13-08-2010',
    category: 'Styling',
    imageUrl: '/assets/certificates/cert-page-4.jpg',
  },
  {
    id: 'GW-CERT-2599-2010',
    title: 'Certificate of Excellence — Salon Leadership',
    salonName: 'Golden Wizard Professional Salon',
    issuingOrganization: 'Jawed Habib — A Professional Institute (Hyderabad)',
    description: 'Awarded to M. Ravi Kanth for successfully completing a course in Salon Leadership (Ref: 2599-2010).',
    issueDate: '13-08-2010',
    category: 'Management',
    imageUrl: '/assets/certificates/cert-page-5.jpg',
  },
];

const INITIAL_SETTINGS: BusinessSettings = {
  name: 'Golden Wizard Professional Salon',
  tagline: 'Where Style Meets Elegance',
  phone: '+91 86863 85552',
  whatsappNumber: '918686385552',
  address: '4, Gandi Maisamma X Rd, Opposite Indian Oil Petrol Pump, Gandi Maisamma, Hyderabad, Telangana 500043',
  hours: 'Open daily until 9:00 PM (9:00 AM - 9:00 PM)',
  rating: 4.4,
  reviewCount: 171,
  announcement: 'Welcome to Golden Wizard Professional Salon. Experience world-class hair & beauty care in Gandi Maisamma.',
  showAnnouncement: true,
};

// Generic storage helper
class SalonDatabase {
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    // One-time cleanup of obsolete mock/demo records
    const cleanedFlag = localStorage.getItem('gw_clean_production_v4');
    if (!cleanedFlag) {
      localStorage.setItem('gw_customers', JSON.stringify([]));
      localStorage.setItem('gw_visits', JSON.stringify([]));
      localStorage.setItem('gw_appointments', JSON.stringify([]));
      localStorage.setItem('gw_questions', JSON.stringify([]));
      localStorage.setItem('gw_clean_production_v4', 'true');
    }

    // One-time replacement of sample certificates with real certificate scans
    if (!localStorage.getItem('gw_real_certs_v2')) {
      localStorage.setItem('gw_certificates', JSON.stringify(INITIAL_CERTIFICATES));
      localStorage.setItem('gw_real_certs_v2', 'true');
    }

    if (!localStorage.getItem('gw_customers')) {
      localStorage.setItem('gw_customers', JSON.stringify(INITIAL_CUSTOMERS));
    }
    if (!localStorage.getItem('gw_visits')) {
      localStorage.setItem('gw_visits', JSON.stringify(INITIAL_VISITS));
    }
    if (!localStorage.getItem('gw_appointments')) {
      localStorage.setItem('gw_appointments', JSON.stringify(INITIAL_APPOINTMENTS));
    }
    if (!localStorage.getItem('gw_questions')) {
      localStorage.setItem('gw_questions', JSON.stringify(INITIAL_QUESTIONS));
    }
    if (!localStorage.getItem('gw_real_photos_v3')) {
      localStorage.setItem('gw_services', JSON.stringify(INITIAL_SERVICES));
      localStorage.setItem('gw_gallery', JSON.stringify(INITIAL_GALLERY));
      localStorage.setItem('gw_real_photos_v3', 'true');
    }
    if (!localStorage.getItem('gw_premium_services_v4')) {
      localStorage.setItem('gw_services', JSON.stringify(INITIAL_SERVICES));
      localStorage.setItem('gw_premium_services_v4', 'true');
    }
    if (!localStorage.getItem('gw_services')) {
      localStorage.setItem('gw_services', JSON.stringify(INITIAL_SERVICES));
    }
    if (!localStorage.getItem('gw_gallery')) {
      localStorage.setItem('gw_gallery', JSON.stringify(INITIAL_GALLERY));
    }
    if (!localStorage.getItem('gw_certificates')) {
      localStorage.setItem('gw_certificates', JSON.stringify(INITIAL_CERTIFICATES));
    }
    if (!localStorage.getItem('gw_settings')) {
      localStorage.setItem('gw_settings', JSON.stringify(INITIAL_SETTINGS));
    } else {
      try {
        const stored = JSON.parse(localStorage.getItem('gw_settings') || '{}');
        if ('adminPin' in stored) {
          delete stored.adminPin;
          localStorage.setItem('gw_settings', JSON.stringify(stored));
        }
      } catch {
        // ignore parse issues
      }
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in db listener', err);
      }
    });
  }

  // --- CUSTOMERS ---
  public getCustomers(includeArchived = false): Customer[] {
    try {
      const data = localStorage.getItem('gw_customers');
      const list: Customer[] = data ? JSON.parse(data) : INITIAL_CUSTOMERS;
      return includeArchived ? list : list.filter((c) => !c.archived);
    } catch {
      return INITIAL_CUSTOMERS;
    }
  }

  public getCustomerByMobile(mobile: string): Customer | undefined {
    const clean = mobile.replace(/[^0-9]/g, '');
    return this.getCustomers(false).find((c) => c.mobile.replace(/[^0-9]/g, '') === clean);
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.getCustomers().find((c) => c.id === id);
  }

  public saveCustomer(customer: Partial<Customer>): { success: boolean; customer?: Customer; error?: string } {
    const customers = this.getCustomers();
    const cleanMobile = (customer.mobile || '').replace(/[^0-9]/g, '');

    if (!customer.fullName || !cleanMobile) {
      return { success: false, error: 'Full name and mobile number are required.' };
    }

    if (customer.id) {
      // Edit existing
      const index = customers.findIndex((c) => c.id === customer.id);
      if (index === -1) return { success: false, error: 'Customer not found.' };

      // Check if phone was changed to another existing customer's phone
      const duplicate = customers.find(
        (c) => c.id !== customer.id && c.mobile.replace(/[^0-9]/g, '') === cleanMobile
      );
      if (duplicate) {
        return { success: false, error: `Mobile number is already registered to ${duplicate.fullName} (${duplicate.id}).` };
      }

      customers[index] = { ...customers[index], ...customer } as Customer;
      localStorage.setItem('gw_customers', JSON.stringify(customers));
      this.notify();
      return { success: true, customer: customers[index] };
    } else {
      // New Customer - Check duplicate
      const duplicate = this.getCustomerByMobile(cleanMobile);
      if (duplicate) {
        return {
          success: false,
          error: `A customer with mobile ${cleanMobile} already exists (${duplicate.fullName}). You can record a new visit for them instead.`,
        };
      }

      const newId = `GW-C${1001 + customers.length}`;
      const newCustomer: Customer = {
        id: newId,
        fullName: customer.fullName.trim(),
        mobile: cleanMobile,
        whatsapp: customer.whatsapp ? customer.whatsapp.replace(/[^0-9]/g, '') : cleanMobile,
        email: customer.email?.trim() || '',
        registeredDate: customer.registeredDate || new Date().toISOString().split('T')[0],
        appointmentType: customer.appointmentType || 'walk-in',
        selectedService: customer.selectedService || 'Haircut',
        assignedStaff: customer.assignedStaff || 'Unassigned',
        notes: customer.notes || '',
        nextVisitDate: customer.nextVisitDate || '',
        consentMarketing: customer.consentMarketing ?? true,
        totalVisits: 1,
      };

      customers.unshift(newCustomer);
      localStorage.setItem('gw_customers', JSON.stringify(customers));

      // Also create an initial visit record automatically
      this.recordVisit({
        customerId: newId,
        customerName: newCustomer.fullName,
        mobile: newCustomer.mobile,
        visitDate: newCustomer.registeredDate,
        visitTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        serviceName: newCustomer.selectedService,
        assignedStaff: newCustomer.assignedStaff || 'Unassigned',
        status: 'Arrived',
        paymentStatus: 'Pending',
        staffNotes: 'First registration visit.',
      });

      this.notify();
      return { success: true, customer: newCustomer };
    }
  }

  public deleteCustomer(id: string): { action: 'archived' | 'deleted'; linkedVisitsCount: number } {
    const allCustomers = this.getCustomers(true);
    const visits = this.getVisits();
    const linkedVisitsCount = visits.filter((v) => v.customerId === id).length;

    if (linkedVisitsCount > 0) {
      const updated = allCustomers.map((c) =>
        c.id === id ? { ...c, archived: true, archivedAt: new Date().toISOString() } : c
      );
      localStorage.setItem('gw_customers', JSON.stringify(updated));
      this.notify();
      return { action: 'archived', linkedVisitsCount };
    }

    const filtered = allCustomers.filter((c) => c.id !== id);
    localStorage.setItem('gw_customers', JSON.stringify(filtered));
    this.notify();
    return { action: 'deleted', linkedVisitsCount: 0 };
  }

  public deleteVisit(visitId: string): boolean {
    const visits = this.getVisits();
    const target = visits.find((v) => v.id === visitId);
    if (!target) return false;

    const remaining = visits.filter((v) => v.id !== visitId);
    localStorage.setItem('gw_visits', JSON.stringify(remaining));

    // Recalculate customer totalVisits without deleting the customer profile
    const customers = this.getCustomers(true);
    const cIdx = customers.findIndex((c) => c.id === target.customerId);
    if (cIdx !== -1) {
      customers[cIdx].totalVisits = remaining.filter((v) => v.customerId === target.customerId).length;
      localStorage.setItem('gw_customers', JSON.stringify(customers));
    }

    this.notify();
    return true;
  }

  public syncCustomersAndVisits(customers: Customer[], visits: CustomerVisit[]): void {
    localStorage.setItem('gw_customers', JSON.stringify(customers));
    localStorage.setItem('gw_visits', JSON.stringify(visits));
    this.notify();
  }

  public restoreBackupSnapshot(payload: {
    customers?: Customer[];
    visits?: CustomerVisit[];
    appointments?: Appointment[];
    questions?: CustomerQuestion[];
    services?: ServiceRecord[];
    gallery?: GalleryRecord[];
    certificates?: Certificate[];
    settings?: Partial<BusinessSettings> & Record<string, unknown>;
  }): void {
    if (Array.isArray(payload.customers)) {
      localStorage.setItem('gw_customers', JSON.stringify(payload.customers));
    }
    if (Array.isArray(payload.visits)) {
      localStorage.setItem('gw_visits', JSON.stringify(payload.visits));
    }
    if (Array.isArray(payload.appointments)) {
      localStorage.setItem('gw_appointments', JSON.stringify(payload.appointments));
    }
    if (Array.isArray(payload.questions)) {
      localStorage.setItem('gw_questions', JSON.stringify(payload.questions));
    }
    if (Array.isArray(payload.services)) {
      localStorage.setItem('gw_services', JSON.stringify(payload.services));
    }
    if (Array.isArray(payload.gallery)) {
      localStorage.setItem('gw_gallery', JSON.stringify(payload.gallery));
    }
    if (Array.isArray(payload.certificates)) {
      localStorage.setItem('gw_certificates', JSON.stringify(payload.certificates));
    }
    if (payload.settings && typeof payload.settings === 'object') {
      const sanitized = { ...payload.settings };
      delete sanitized.adminPin;
      delete sanitized.password;
      delete sanitized.passwordHash;
      delete sanitized.pinHash;
      const merged = { ...this.getSettings(), ...sanitized };
      localStorage.setItem('gw_settings', JSON.stringify(merged));
    }
    this.notify();
  }

  // --- VISITS ---
  public getVisits(): CustomerVisit[] {
    try {
      const data = localStorage.getItem('gw_visits');
      return data ? JSON.parse(data) : INITIAL_VISITS;
    } catch {
      return INITIAL_VISITS;
    }
  }

  public getVisitsByCustomer(customerId: string): CustomerVisit[] {
    return this.getVisits().filter((v) => v.customerId === customerId);
  }

  public getVisitsByDate(dateStr: string): CustomerVisit[] {
    return this.getVisits().filter((v) => v.visitDate === dateStr);
  }

  public recordVisit(visit: Omit<CustomerVisit, 'id'> & { id?: string }): CustomerVisit {
    const visits = this.getVisits();
    const newId = visit.id || `GW-V${2001 + visits.length}`;
    const newVisit: CustomerVisit = {
      ...visit,
      id: newId,
    };

    if (visit.id) {
      const idx = visits.findIndex((v) => v.id === visit.id);
      if (idx !== -1) {
        visits[idx] = newVisit;
      } else {
        visits.unshift(newVisit);
      }
    } else {
      visits.unshift(newVisit);

      // Increment customer's total visits
      const customers = this.getCustomers();
      const cIdx = customers.findIndex((c) => c.id === visit.customerId);
      if (cIdx !== -1) {
        customers[cIdx].totalVisits = (customers[cIdx].totalVisits || 0) + 1;
        customers[cIdx].selectedService = visit.serviceName;
        localStorage.setItem('gw_customers', JSON.stringify(customers));
      }
    }

    localStorage.setItem('gw_visits', JSON.stringify(visits));
    this.notify();
    return newVisit;
  }

  public updateVisitStatus(visitId: string, status: CustomerVisit['status'], paymentStatus?: CustomerVisit['paymentStatus']): boolean {
    const visits = this.getVisits();
    const idx = visits.findIndex((v) => v.id === visitId);
    if (idx !== -1) {
      visits[idx].status = status;
      if (paymentStatus) visits[idx].paymentStatus = paymentStatus;
      localStorage.setItem('gw_visits', JSON.stringify(visits));
      this.notify();
      return true;
    }
    return false;
  }

  // --- APPOINTMENTS ---
  public getAppointments(): Appointment[] {
    try {
      const data = localStorage.getItem('gw_appointments');
      return data ? JSON.parse(data) : INITIAL_APPOINTMENTS;
    } catch {
      return INITIAL_APPOINTMENTS;
    }
  }

  public createAppointment(apt: Omit<Appointment, 'id' | 'createdAt' | 'status'>): { success: boolean; appointment?: Appointment; conflict?: boolean } {
    const appointments = this.getAppointments();

    // Check conflict: is there already a confirmed appointment for the same date & timeSlot?
    const hasConflict = appointments.some(
      (a) => a.date === apt.date && a.timeSlot === apt.timeSlot && a.status === 'confirmed'
    );

    const newId = `GW-A${3001 + appointments.length}`;
    const newApt: Appointment = {
      ...apt,
      id: newId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    appointments.unshift(newApt);
    localStorage.setItem('gw_appointments', JSON.stringify(appointments));
    this.notify();
    return { success: true, appointment: newApt, conflict: hasConflict };
  }

  public updateAppointment(id: string, updates: Partial<Appointment>): boolean {
    const appointments = this.getAppointments();
    const idx = appointments.findIndex((a) => a.id === id);
    if (idx !== -1) {
      appointments[idx] = { ...appointments[idx], ...updates };
      localStorage.setItem('gw_appointments', JSON.stringify(appointments));
      this.notify();
      return true;
    }
    return false;
  }

  // --- QUESTIONS ---
  public getQuestions(): CustomerQuestion[] {
    try {
      const data = localStorage.getItem('gw_questions');
      return data ? JSON.parse(data) : INITIAL_QUESTIONS;
    } catch {
      return INITIAL_QUESTIONS;
    }
  }

  public createQuestion(q: Omit<CustomerQuestion, 'id' | 'submittedAt' | 'status'>): CustomerQuestion {
    const questions = this.getQuestions();
    const newId = `GW-Q${5001 + questions.length}`;
    const newQuestion: CustomerQuestion = {
      ...q,
      id: newId,
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };

    questions.unshift(newQuestion);
    localStorage.setItem('gw_questions', JSON.stringify(questions));
    this.notify();
    return newQuestion;
  }

  public answerQuestion(id: string, answerText: string): boolean {
    const questions = this.getQuestions();
    const idx = questions.findIndex((q) => q.id === id);
    if (idx !== -1) {
      questions[idx].answer = answerText;
      questions[idx].status = 'answered';
      questions[idx].answeredAt = new Date().toISOString();
      localStorage.setItem('gw_questions', JSON.stringify(questions));
      this.notify();
      return true;
    }
    return false;
  }

  public updateQuestionStatus(id: string, status: CustomerQuestion['status']): boolean {
    const questions = this.getQuestions();
    const idx = questions.findIndex((q) => q.id === id);
    if (idx !== -1) {
      questions[idx].status = status;
      localStorage.setItem('gw_questions', JSON.stringify(questions));
      this.notify();
      return true;
    }
    return false;
  }

  public deleteQuestion(id: string): boolean {
    const questions = this.getQuestions();
    const filtered = questions.filter((q) => q.id !== id);
    if (filtered.length === questions.length) return false;
    localStorage.setItem('gw_questions', JSON.stringify(filtered));
    this.notify();
    return true;
  }

  public getQuestionStatusForCustomer(enquiryId: string, mobile: string): CustomerQuestion | undefined {
    const cleanMobile = mobile.replace(/[^0-9]/g, '');
    const cleanId = enquiryId.trim().toUpperCase();
    return this.getQuestions().find(
      (q) => q.id.toUpperCase() === cleanId && q.mobile.replace(/[^0-9]/g, '') === cleanMobile
    );
  }

  // --- SERVICES ---
  public getServices(): ServiceRecord[] {
    try {
      const data = localStorage.getItem('gw_services');
      return data ? JSON.parse(data) : INITIAL_SERVICES;
    } catch {
      return INITIAL_SERVICES;
    }
  }

  public updateService(id: string, updates: Partial<ServiceRecord>): boolean {
    const services = this.getServices();
    const idx = services.findIndex((s) => s.id === id);
    if (idx !== -1) {
      services[idx] = { ...services[idx], ...updates };
      localStorage.setItem('gw_services', JSON.stringify(services));
      this.notify();
      return true;
    }
    return false;
  }

  // --- GALLERY ---
  public getGallery(): GalleryRecord[] {
    try {
      const data = localStorage.getItem('gw_gallery');
      return data ? JSON.parse(data) : INITIAL_GALLERY;
    } catch {
      return INITIAL_GALLERY;
    }
  }

  public saveGalleryItem(item: Partial<GalleryRecord>): boolean {
    const gallery = this.getGallery();
    if (item.id) {
      const idx = gallery.findIndex((g) => g.id === item.id);
      if (idx !== -1) {
        gallery[idx] = { ...gallery[idx], ...item } as GalleryRecord;
        localStorage.setItem('gw_gallery', JSON.stringify(gallery));
        this.notify();
        return true;
      }
    } else {
      const newId = `gal-${Date.now()}`;
      gallery.unshift({
        id: newId,
        title: item.title || 'Salon Style',
        category: item.category || 'haircuts',
        categoryLabel: item.categoryLabel || 'Haircuts',
        image: item.image || '/assets/salon/golden-wizard-branch1-interior-stations.png',
        alt: item.alt || 'Golden Wizard salon work',
      });
      localStorage.setItem('gw_gallery', JSON.stringify(gallery));
      this.notify();
      return true;
    }
    return false;
  }

  public deleteGalleryItem(id: string): boolean {
    const gallery = this.getGallery().filter((g) => g.id !== id);
    localStorage.setItem('gw_gallery', JSON.stringify(gallery));
    this.notify();
    return true;
  }

  // --- CERTIFICATES ---
  public getCertificates(): Certificate[] {
    try {
      const data = localStorage.getItem('gw_certificates');
      return data ? JSON.parse(data) : INITIAL_CERTIFICATES;
    } catch {
      return INITIAL_CERTIFICATES;
    }
  }

  public saveCertificate(cert: Partial<Certificate>): boolean {
    const certs = this.getCertificates();
    if (cert.id) {
      const idx = certs.findIndex((c) => c.id === cert.id);
      if (idx !== -1) {
        certs[idx] = { ...certs[idx], ...cert } as Certificate;
        localStorage.setItem('gw_certificates', JSON.stringify(certs));
        this.notify();
        return true;
      }
    } else {
      const newId = `GW-CERT-${String(certs.length + 1).padStart(2, '0')}`;
      certs.unshift({
        id: newId,
        title: cert.title || 'Professional Certification',
        salonName: 'Golden Wizard Professional Salon',
        issuingOrganization: cert.issuingOrganization || 'Professional Hair & Beauty Board',
        description: cert.description || 'Professional credential in salon service standards.',
        issueDate: cert.issueDate || new Date().toISOString().split('T')[0],
        category: cert.category || 'Styling',
        verificationUrl: cert.verificationUrl || '',
        imageUrl: cert.imageUrl || '/assets/certificates/cert-page-1.jpg',
      });
      localStorage.setItem('gw_certificates', JSON.stringify(certs));
      this.notify();
      return true;
    }
    return false;
  }

  public deleteCertificate(id: string): boolean {
    const certs = this.getCertificates().filter((c) => c.id !== id);
    localStorage.setItem('gw_certificates', JSON.stringify(certs));
    this.notify();
    return true;
  }

  // --- SETTINGS & AUTH ---
  public getSettings(): BusinessSettings {
    try {
      const data = localStorage.getItem('gw_settings');
      if (!data) return INITIAL_SETTINGS;
      const parsed = JSON.parse(data) as BusinessSettings & { adminPin?: unknown };
      if ('adminPin' in parsed) {
        delete parsed.adminPin;
      }
      return { ...INITIAL_SETTINGS, ...parsed };
    } catch {
      return INITIAL_SETTINGS;
    }
  }

  public updateSettings(settings: Partial<BusinessSettings>): boolean {
    const current = this.getSettings();
    const updated = { ...current, ...settings } as BusinessSettings & { adminPin?: unknown };
    delete updated.adminPin;
    localStorage.setItem('gw_settings', JSON.stringify(updated));
    this.notify();
    return true;
  }

  // --- CSV EXPORT ---
  public exportCustomersToCSV(): string {
    const customers = this.getCustomers();
    const headers = ['Customer ID', 'Full Name', 'Mobile', 'WhatsApp', 'Email', 'Registered Date', 'Appointment Type', 'Selected Service', 'Staff', 'Total Visits', 'Notes'];
    const rows = customers.map((c) => [
      c.id,
      `"${c.fullName.replace(/"/g, '""')}"`,
      `"${c.mobile}"`,
      `"${c.whatsapp || ''}"`,
      `"${c.email || ''}"`,
      c.registeredDate,
      c.appointmentType,
      `"${c.selectedService.replace(/"/g, '""')}"`,
      `"${(c.assignedStaff || '').replace(/"/g, '""')}"`,
      c.totalVisits,
      `"${(c.notes || '').replace(/"/g, '""')}"`,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  public exportVisitsToCSV(): string {
    const visits = this.getVisits();
    const headers = ['Visit ID', 'Customer ID', 'Customer Name', 'Mobile', 'Visit Date', 'Visit Time', 'Service', 'Staff', 'Status', 'Payment Status', 'Amount', 'Notes'];
    const rows = visits.map((v) => [
      v.id,
      v.customerId,
      `"${v.customerName.replace(/"/g, '""')}"`,
      `"${v.mobile}"`,
      v.visitDate,
      v.visitTime,
      `"${v.serviceName.replace(/"/g, '""')}"`,
      `"${v.assignedStaff.replace(/"/g, '""')}"`,
      v.status,
      v.paymentStatus,
      v.amount || 0,
      `"${(v.staffNotes || '').replace(/"/g, '""')}"`,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  public exportAppointmentsToCSV(): string {
    const apts = this.getAppointments();
    const headers = ['Appointment ID', 'Customer Name', 'Mobile', 'Service', 'Date', 'Time Slot', 'Status', 'Assigned Staff', 'Notes'];
    const rows = apts.map((a) => [
      a.id,
      `"${a.customerName.replace(/"/g, '""')}"`,
      `"${a.mobile}"`,
      `"${a.service.replace(/"/g, '""')}"`,
      a.date,
      a.timeSlot,
      a.status,
      `"${(a.assignedStaff || '').replace(/"/g, '""')}"`,
      `"${(a.notes || '').replace(/"/g, '""')}"`,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }
}

export const salonDb = new SalonDatabase();
