import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import LogoWall from "@/components/LogoWall";
import ProblemSection from "@/components/ProblemSection";
import Stats from "@/components/Stats";
import HowItWorks from "@/components/HowItWorks";
import TwoSides from "@/components/TwoSides";
import Features from "@/components/Features";
import TransparencyLayer from "@/components/TransparencyLayer";
import Pricing from "@/components/Pricing";
import CtaSection from "@/components/CtaSection";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <LogoWall />
        <ProblemSection />
        <Stats />
        <HowItWorks />
        <TwoSides />
        <Features />
        <TransparencyLayer />
        <Pricing />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
