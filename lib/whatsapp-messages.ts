// Pre-filled WhatsApp messages for every button on the site, written for
// the purpose of the place the button sits in.
import { BRAND } from '@/lib/brand';

const rs = (n: number) => `Rs. ${Math.round(n).toLocaleString('en-PK')}`;

export const waMessages = {
  // ── storefront → store ──
  footer: () => `Hi ${BRAND.name}! 👋 I have a question about your products.`,

  contact: () => `Hi ${BRAND.name}! 👋 I need some help. My question is: `,

  /** Order confirmation page. */
  orderPlaced: (orderNumber: string, total: number, advance: boolean) =>
    advance
      ? `Hi ${BRAND.name}! I just placed order #${orderNumber} (${rs(total)}) with advance payment. Here is my payment screenshot 👇`
      : `Hi ${BRAND.name}! I just placed order #${orderNumber} (${rs(total)}, cash on delivery). Please confirm my order. Thank you! 💕`,

  /** Track order page. */
  trackOrder: (orderNumber?: string, status?: string) =>
    orderNumber
      ? `Hi ${BRAND.name}! Can you share an update on my order #${orderNumber}?${status ? ` It currently shows “${status}”.` : ''}`
      : `Hi ${BRAND.name}! I need help tracking my order. My order number is: `,

  /** Policy pages. */
  policy: (page: string) => {
    if (page.includes('refund')) return `Hi ${BRAND.name}! I’d like to return / exchange an item. My order number is: `;
    if (page.includes('privacy')) return `Hi ${BRAND.name}! I have a question about how my personal information is used.`;
    return `Hi ${BRAND.name}! I have a question about your terms of service.`;
  },

  // ── admin → customer ──
  /** Admin order page: message depends on the order's current status. */
  adminOrder: (o: {
    customer_name: string;
    order_number: string;
    status: string;
    total: number;
    payment_type: 'cod' | 'advance';
    tracking?: string | null;
  }) => {
    const name = o.customer_name.trim().split(' ')[0];
    const hi = `Hi ${name}! 👋 This is ${BRAND.name}.`;
    switch (o.status) {
      case 'pending':
        return o.payment_type === 'advance'
          ? `${hi} Thank you for your order #${o.order_number} (${rs(o.total)}). Please send your advance payment screenshot here so we can confirm and pack it 💕`
          : `${hi} Thank you for your order #${o.order_number} (${rs(o.total)}, cash on delivery). Can you please confirm your order and delivery address? 💕`;
      case 'confirmed':
        return `${hi} Your order #${o.order_number} is confirmed ✅ We’re packing it now and will share tracking as soon as it ships.`;
      case 'shipped':
        return `${hi} Your order #${o.order_number} is on its way 🚚${o.tracking ? ` Tracking number: ${o.tracking}.` : ''}${o.payment_type === 'cod' ? ` Please keep ${rs(o.total)} ready for the rider.` : ''}`;
      case 'delivered':
        return `${hi} Your order #${o.order_number} has been delivered 🎉 We hope you love it! We’d be so happy if you left a review on our website 💕`;
      case 'cancelled':
        return `${hi} Your order #${o.order_number} has been cancelled. If this wasn’t expected or you’d like to order again, just reply here.`;
      default:
        return `${hi} About your order #${o.order_number}: `;
    }
  },
};
