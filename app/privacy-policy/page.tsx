'use client';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AnnouncementBar from '@/components/AnnouncementBar';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <AnnouncementBar />
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-[#0a0a0a] mb-8">Privacy Policy</h1>

        <div className="prose prose-gray">
          <p className="text-[#666] leading-relaxed mb-6">
            This privacy policy explains how MT Store collects, uses and protects your personal information when you use our website. We collect information such as your name, phone number, address and order details solely to process and deliver your orders. We do not share your information with third parties except for delivery purposes.
          </p>
          <p className="text-[#666] leading-relaxed mb-6">
            When you place an order with us, we collect your customer name, phone number, email address, delivery address, and city to ensure your order is processed and delivered correctly. Your payment information is handled securely and we do not store your complete payment details on our servers.
          </p>
          <p className="text-[#666] leading-relaxed mb-6">
            We use your information solely for order processing, delivery coordination, and customer support. We may send you order-related notifications via WhatsApp or SMS to keep you updated on your order status.
          </p>
          <p className="text-[#666] leading-relaxed">
            By using our website, you consent to the collection and use of your information as described in this privacy policy. If you have any questions about how we handle your data, please contact us through WhatsApp.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
