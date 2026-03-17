import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import DashboardPreview from "@/components/landing/DashboardPreview";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";

const Index = () => {
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  useEffect(() => {
    if (!loading && user && role) {
      const dashboardMap: Record<string, string> = {
        principal: "/dashboard/principal",
        hod: "/dashboard/hod",
        admin_staff: "/dashboard/admin",
        general_staff: "/dashboard/staff",
      };
      navigate(dashboardMap[role] || "/login");
    }
  }, [user, role, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <main>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <DashboardPreview />
      <CTASection />
      <Footer />
    </main>
  );
};

export default Index;
