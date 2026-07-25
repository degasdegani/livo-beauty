import { ContactForm } from "@/components/landing/contact-form"
import { Footer } from "@/components/landing/footer"
import { Header } from "@/components/landing/header"
import { Hero } from "@/components/landing/hero"
import { Modules } from "@/components/landing/modules"
import { Pricing } from "@/components/landing/pricing"
import { Reveal } from "@/components/landing/reveal"
import { SocialProof } from "@/components/landing/social-proof"

export function LandingPage() {
  return (
    <div className="flex min-h-full flex-col bg-background">
      <Header />
      <Hero />
      <Reveal>
        <SocialProof />
      </Reveal>
      <Reveal>
        <Modules />
      </Reveal>
      <Reveal>
        <Pricing />
      </Reveal>
      <Reveal>
        <ContactForm />
      </Reveal>
      <Footer />
    </div>
  )
}
