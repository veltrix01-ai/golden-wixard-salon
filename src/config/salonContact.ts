// Central contact configuration — update this file to change the WhatsApp number site-wide
// Verified from salonData.ts: SALON_INFO.whatsappNumber = '918686385552'
export const SALON_WHATSAPP_NUMBER = '918686385552'; // international format, digits only

export const SALON_WHATSAPP_BASE_URL = `https://wa.me/${SALON_WHATSAPP_NUMBER}`;

export function buildWhatsAppUrl(message: string): string {
  return `${SALON_WHATSAPP_BASE_URL}?text=${encodeURIComponent(message)}`;
}

export function buildQuestionWhatsAppUrl(customerName: string, question: string): string {
  const name = customerName.trim() || 'Anonymous Customer';
  const message = `Hello Golden Wizard Salon,\n\nI have a question for your stylists.\n\nCustomer Name: ${name}\n\nQuestion: ${question}\n\nThank you!`;
  return buildWhatsAppUrl(message);
}
