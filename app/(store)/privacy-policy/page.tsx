import PolicyPage from '@/components/store/PolicyPage';
import { BRAND } from '@/lib/brand';

export const metadata = { title: 'Privacy Policy' };

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      title="Privacy Policy"
      subtitle="What we collect, why we collect it, and how we keep it safe."
      current="/privacy-policy"
      sections={[
        {
          heading: 'What we collect',
          body: (
            <p>
              This privacy policy explains how {BRAND.name} collects, uses and protects your personal information when you use our website. When you place an order we collect your
              name, phone number, email address, delivery address and city so your order is processed and delivered correctly.
            </p>
          ),
        },
        {
          heading: 'Payments',
          body: <p>Your payment information is handled securely and we do not store your complete payment details on our servers.</p>,
        },
        {
          heading: 'How we use it',
          body: (
            <p>
              We use your information solely for order processing, delivery coordination and customer support. We may send you order-related notifications via WhatsApp or SMS to
              keep you updated on your order status. We do not share your information with third parties except for delivery purposes.
            </p>
          ),
        },
        {
          heading: 'Your consent',
          body: (
            <p>
              By using our website, you consent to the collection and use of your information as described in this privacy policy. If you have any questions about how we handle
              your data, please contact us through WhatsApp.
            </p>
          ),
        },
      ]}
    />
  );
}
