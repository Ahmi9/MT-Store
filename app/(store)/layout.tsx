import AnnouncementBar from '@/components/AnnouncementBar';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import StoreProvider from '@/components/store/StoreProvider';
import CartDrawer from '@/components/store/CartDrawer';
import SearchOverlay from '@/components/store/SearchOverlay';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <div className="flex min-h-screen flex-col bg-blush-50">
        <AnnouncementBar />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
      <CartDrawer />
      <SearchOverlay />
    </StoreProvider>
  );
}
