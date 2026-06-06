import { LanguageProvider } from './context/LanguageContext'
import DeliveryBanner from './components/DeliveryBanner'
import Navbar        from './components/Navbar'
import Hero          from './components/Hero'
import MenuSection   from './components/MenuSection'
import RotiCallout        from './components/RotiCallout'
import OfficeTiffinCallout from './components/OfficeTiffinCallout'
import Gallery       from './components/Gallery'
import PlansSection  from './components/PlansSection'
import Testimonials  from './components/Testimonials'
import WhatsAppCTA   from './components/WhatsAppCTA'
import ContactSection from './components/ContactSection'
import Footer        from './components/Footer'
import StickyOrderBar from './components/StickyOrderBar'

export default function App() {
  return (
    <LanguageProvider>
      <DeliveryBanner />
      <Navbar />
      <Hero />
      <MenuSection />
      <OfficeTiffinCallout />
      <RotiCallout />
      <Gallery />
      <PlansSection />
      <Testimonials />
      <WhatsAppCTA />
      <ContactSection />
      <Footer />
      <StickyOrderBar />
    </LanguageProvider>
  )
}
