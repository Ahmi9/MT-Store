import PolicyPage from '@/components/store/PolicyPage';
import { BRAND } from '@/lib/brand';

export const metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <PolicyPage
      title="Terms of Service"
      subtitle="The simple rules that keep shopping smooth for everyone."
      current="/terms"
      sections={[
        {
          heading: 'Orders & pricing',
          body: (
            <p>
              By using {BRAND.name}, you agree to our terms of service. All products listed are subject to availability. Prices are subject to change without notice. Orders are
              processed within 1-2 business days. We reserve the right to cancel orders due to unavailability or pricing errors.
            </p>
          ),
        },
        {
          heading: 'Your information',
          body: (
            <p>
              When you place an order, you confirm that all information provided is accurate and complete. You are responsible for ensuring your delivery address and contact
              details are correct. We are not responsible for orders delayed due to incorrect information provided by the customer.
            </p>
          ),
        },
        {
          heading: 'Genuine products',
          body: (
            <p>
              All products sold by {BRAND.name} are guaranteed to be genuine and authentic. We source our products from authorized distributors and guarantee their authenticity.
              Any claims regarding counterfeit products will be investigated and resolved accordingly.
            </p>
          ),
        },
        {
          heading: 'Payment',
          body: (
            <p>
              Payment must be received in full before order processing begins. For Cash on Delivery orders, payment is collected at the time of delivery. For advance payment
              orders, full payment must be received before we dispatch your order.
            </p>
          ),
        },
        {
          heading: 'Changes to these terms',
          body: (
            <p>
              We reserve the right to modify these terms at any time without prior notice. Continued use of our website after any changes constitutes acceptance of the modified
              terms.
            </p>
          ),
        },
      ]}
    />
  );
}
