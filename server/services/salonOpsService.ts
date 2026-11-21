import fs from 'fs';
import path from 'path';

export interface CustomerOpsRecord {
  id: string;
  fullName: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  registeredDate: string;
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

export interface VisitOpsRecord {
  id: string;
  customerId: string;
  customerName: string;
  mobile: string;
  visitDate: string;
  visitTime: string;
  serviceName: string;
  assignedStaff: string;
  status: 'New' | 'Confirmed' | 'Arrived' | 'In Progress' | 'Completed' | 'Cancelled' | 'No Show';
  paymentStatus: 'Paid' | 'Pending' | 'Partial';
  staffNotes?: string;
  amount?: number;
}

interface SalonOpsStore {
  customers: CustomerOpsRecord[];
  visits: VisitOpsRecord[];
}

const SALON_OPS_FILE_PATH = path.resolve(process.cwd(), '.data-salon-ops.json');

function loadSalonOpsStore(): SalonOpsStore {
  try {
    if (fs.existsSync(SALON_OPS_FILE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(SALON_OPS_FILE_PATH, 'utf-8')) as Partial<SalonOpsStore>;
      return {
        customers: Array.isArray(parsed.customers) ? parsed.customers : [],
        visits: Array.isArray(parsed.visits) ? parsed.visits : [],
      };
    }
  } catch (err) {
    console.error('Error loading salon ops store:', err);
  }
  return { customers: [], visits: [] };
}

let store: SalonOpsStore = loadSalonOpsStore();

function saveSalonOpsStore(): void {
  fs.writeFileSync(SALON_OPS_FILE_PATH, JSON.stringify(store, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });
}

function nextCustomerId(): string {
  const maxNum = store.customers.reduce((max, c) => {
    const match = /^GW-C(\d+)$/.exec(c.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 1000);
  return `GW-C${maxNum + 1}`;
}

function nextVisitId(): string {
  const maxNum = store.visits.reduce((max, v) => {
    const match = /^GW-V(\d+)$/.exec(v.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 2000);
  return `GW-V${maxNum + 1}`;
}

function recalculateCustomerVisitCount(customerId: string): void {
  const cIdx = store.customers.findIndex((c) => c.id === customerId);
  if (cIdx === -1) return;
  const count = store.visits.filter((v) => v.customerId === customerId).length;
  store.customers[cIdx].totalVisits = count;
}

export function getSalonOpsSnapshot(includeArchived = false): SalonOpsStore {
  const customers = includeArchived
    ? [...store.customers]
    : store.customers.filter((c) => !c.archived);
  return {
    customers,
    visits: [...store.visits],
  };
}

export function syncClientSalonOpsIfServerEmpty(
  clientCustomers: CustomerOpsRecord[],
  clientVisits: VisitOpsRecord[]
): SalonOpsStore {
  if (store.customers.length === 0 && store.visits.length === 0) {
    if (clientCustomers.length > 0 || clientVisits.length > 0) {
      store = {
        customers: clientCustomers.map((c) => ({ ...c })),
        visits: clientVisits.map((v) => ({ ...v })),
      };
      saveSalonOpsStore();
    }
  }
  return getSalonOpsSnapshot(false);
}

export function createCustomerAndInitialVisit(input: {
  fullName: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  registeredDate?: string;
  appointmentType?: CustomerOpsRecord['appointmentType'];
  selectedService?: string;
  assignedStaff?: string;
  notes?: string;
  consentMarketing?: boolean;
  visitTime?: string;
}): { success: boolean; customer?: CustomerOpsRecord; visit?: VisitOpsRecord; error?: string } {
  const cleanMobile = input.mobile.replace(/[^0-9]/g, '');
  if (!input.fullName.trim() || !cleanMobile) {
    return { success: false, error: 'Full name and valid mobile number are required.' };
  }

  const duplicate = store.customers.find(
    (c) => !c.archived && c.mobile.replace(/[^0-9]/g, '') === cleanMobile
  );
  if (duplicate) {
    return {
      success: false,
      error: `A customer with mobile ${cleanMobile} already exists (${duplicate.fullName}). You can record a new visit for them instead.`,
    };
  }

  const today = input.registeredDate || new Date().toISOString().split('T')[0];
  const newCustomer: CustomerOpsRecord = {
    id: nextCustomerId(),
    fullName: input.fullName.trim(),
    mobile: cleanMobile,
    whatsapp: input.whatsapp ? input.whatsapp.replace(/[^0-9]/g, '') : cleanMobile,
    email: input.email?.trim() || '',
    registeredDate: today,
    appointmentType: input.appointmentType || 'walk-in',
    selectedService: input.selectedService || 'Haircut',
    assignedStaff: input.assignedStaff?.trim() || 'Unassigned',
    notes: input.notes?.trim() || '',
    nextVisitDate: '',
    consentMarketing: input.consentMarketing ?? true,
    totalVisits: 1,
    archived: false,
  };

  const initialVisit: VisitOpsRecord = {
    id: nextVisitId(),
    customerId: newCustomer.id,
    customerName: newCustomer.fullName,
    mobile: newCustomer.mobile,
    visitDate: today,
    visitTime: input.visitTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    serviceName: newCustomer.selectedService,
    assignedStaff: newCustomer.assignedStaff || 'Unassigned',
    status: 'Arrived',
    paymentStatus: 'Pending',
    staffNotes: 'First registration visit.',
  };

  store.customers.unshift(newCustomer);
  store.visits.unshift(initialVisit);
  saveSalonOpsStore();

  return { success: true, customer: newCustomer, visit: initialVisit };
}

export function createVisitEntry(input: {
  customerId: string;
  customerName: string;
  mobile: string;
  visitDate: string;
  visitTime: string;
  serviceName: string;
  assignedStaff: string;
  status?: VisitOpsRecord['status'];
  paymentStatus?: VisitOpsRecord['paymentStatus'];
  staffNotes?: string;
  amount?: number;
}): VisitOpsRecord {
  const visit: VisitOpsRecord = {
    id: nextVisitId(),
    customerId: input.customerId,
    customerName: input.customerName.trim(),
    mobile: input.mobile.replace(/[^0-9]/g, ''),
    visitDate: input.visitDate,
    visitTime: input.visitTime,
    serviceName: input.serviceName,
    assignedStaff: input.assignedStaff || 'Floor Stylist',
    status: input.status || 'In Progress',
    paymentStatus: input.paymentStatus || 'Pending',
    staffNotes: input.staffNotes || '',
    amount: input.amount,
  };

  store.visits.unshift(visit);
  const cIdx = store.customers.findIndex((c) => c.id === visit.customerId);
  if (cIdx !== -1) {
    recalculateCustomerVisitCount(visit.customerId);
    store.customers[cIdx].selectedService = visit.serviceName;
  }
  saveSalonOpsStore();
  return visit;
}

export function updateVisitEntry(
  visitId: string,
  updates: { status?: VisitOpsRecord['status']; paymentStatus?: VisitOpsRecord['paymentStatus'] }
): VisitOpsRecord | null {
  const idx = store.visits.findIndex((v) => v.id === visitId);
  if (idx === -1) return null;
  if (updates.status) store.visits[idx].status = updates.status;
  if (updates.paymentStatus) store.visits[idx].paymentStatus = updates.paymentStatus;
  saveSalonOpsStore();
  return store.visits[idx];
}

export function deleteVisitEntry(visitId: string): { deletedVisit?: VisitOpsRecord; updatedCustomer?: CustomerOpsRecord } | null {
  const idx = store.visits.findIndex((v) => v.id === visitId);
  if (idx === -1) return null;

  const [deletedVisit] = store.visits.splice(idx, 1);
  recalculateCustomerVisitCount(deletedVisit.customerId);
  const updatedCustomer = store.customers.find((c) => c.id === deletedVisit.customerId);
  saveSalonOpsStore();

  return { deletedVisit, updatedCustomer };
}

export function deleteOrArchiveCustomerRecord(
  customerId: string
): {
  action: 'archived' | 'deleted';
  id: string;
  linkedVisitsCount: number;
  customer?: CustomerOpsRecord;
} | null {
  const idx = store.customers.findIndex((c) => c.id === customerId && !c.archived);
  if (idx === -1) return null;

  const linkedVisitsCount = store.visits.filter((v) => v.customerId === customerId).length;
  if (linkedVisitsCount > 0) {
    const archivedCustomer: CustomerOpsRecord = {
      ...store.customers[idx],
      archived: true,
      archivedAt: new Date().toISOString(),
    };
    store.customers[idx] = archivedCustomer;
    saveSalonOpsStore();
    return {
      action: 'archived',
      id: customerId,
      linkedVisitsCount,
      customer: archivedCustomer,
    };
  }

  store.customers.splice(idx, 1);
  saveSalonOpsStore();
  return {
    action: 'deleted',
    id: customerId,
    linkedVisitsCount: 0,
  };
}

export function restoreSalonOpsBackup(
  customers: CustomerOpsRecord[],
  visits: VisitOpsRecord[]
): SalonOpsStore {
  store = {
    customers: customers.map((c) => ({ ...c })),
    visits: visits.map((v) => ({ ...v })),
  };
  saveSalonOpsStore();
  return getSalonOpsSnapshot(false);
}
