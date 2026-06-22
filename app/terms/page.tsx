'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AnnouncementBar from '@/components/AnnouncementBar';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <AnnouncementBar />
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-[#0a0a0a] mb-8">Terms of Service</h1>

        <div className="prose prose-gray">
          <p className="text-[#666] leading-relaxed mb-6">
            By using MT Store, you agree to our terms of service. All products listed are subject to availability. Prices are subject to change without notice. Orders are processed within 1-2 business days. We reserve the right to cancel orders due to unavailability or pricing errors.
          </p>
          <p className="text-[#666] leading-relaxed mb-6">
            When you place an order, you confirm that all information provided is accurate and complete. You are responsible for ensuring your delivery address and contact details are correct. We are not responsible for orders delayed due to incorrect information provided by the customer.
          </p>
          <p className="text-[#666] leading-relaxed mb-6">
            All products sold by MT Store are guaranteed to be genuine and authentic. We source our products from authorized distributors and guarantee their authenticity. Any claims regarding counterfeit products will be investigated and resolved accordingly.
          </p>
          <p className="text-[#666] leading-relaxed mb-6">
            Payment must be received in full before order processing begins. For Cash on Delivery orders, payment is collected at the time of delivery. For advance payment orders, full payment must be received before we dispatch your order.
          </p>
          <p className="text-[#666] leading-relaxed">
            We reserve the right to modify these terms at any time without prior notice. Continued use of our website after any changes constitutes acceptance of the modified terms.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
