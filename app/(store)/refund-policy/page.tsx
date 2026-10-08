import PolicyPage from '@/components/store/PolicyPage';

export const metadata = { title: 'Refund & Return Policy' };

export default function RefundPolicyPage() {
  return (
    <PolicyPage
      title="Refunds & Returns"
      subtitle="Not in love with it? Here’s how to send it back."
      current="/refund-policy"
      sections={[
        {
          heading: '7-day returns',
          body: (
            <p>
              We offer a 7-day return policy from the date of delivery. Products must be unused and in original packaging. To initiate a return, please contact us on WhatsApp with
              your order number. Refunds will be processed within 3-5 business days after the returned item is received and inspected.
            </p>
          ),
        },
        {
          heading: 'Eligibility',
          body: (
            <p>
              To be eligible for a return, your item must be unused, unworn, and in the same condition that you received it. It must also be in the original packaging with all tags
              and accessories included. Products that show signs of use, damage, or missing parts cannot be accepted for return.
            </p>
          ),
        },
        {
          heading: 'Refunds',
          body: (
            <p>
              Once we receive and inspect your returned item, we will notify you of the approval or rejection of your refund. If approved, the refund will be processed to your
              original payment method. For Cash on Delivery orders, refunds will be provided via bank transfer or JazzCash/EasyPaisa.
            </p>
          ),
        },
        {
          heading: 'Return shipping',
          body: (
            <p>
              Shipping costs are non-refundable. If you are returning an item, you are responsible for paying the shipping costs for returning your item. We recommend using a
              trackable shipping service or purchasing shipping insurance for your return.
            </p>
          ),
        },
        {
          heading: 'How to start a return',
          body: (
            <p>
              Message us on WhatsApp with your order number and reason for return. Our team will guide you through the return process and provide you with return shipping
              details.
            </p>
          ),
        },
      ]}
    />
  );
}
