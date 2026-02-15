import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import {
  ArrowRight, BarChart3, MessageSquare, Sparkles, Upload,
  Download, Layers, BrainCircuit, TrendingUp, Zap, Shield, Globe,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import logoWithText from "@assets/ChatGPT_Image_Feb_15,_2026,_11_16_42_AM_1771134475217.png";
import heroVideo from "@assets/SaaS_Product_Demo_Video_Generation_1771140201051.mp4";

function FloatingOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-[15%] left-[10%] w-72 h-72 rounded-full bg-gradient-to-br from-pink-400/20 to-purple-500/20 blur-3xl animate-float-slow" />
      <div className="absolute top-[40%] right-[8%] w-96 h-96 rounded-full bg-gradient-to-br from-purple-400/15 to-pink-500/15 blur-3xl animate-float-medium" />
      <div className="absolute bottom-[20%] left-[25%] w-80 h-80 rounded-full bg-gradient-to-br from-fuchsia-400/10 to-violet-500/10 blur-3xl animate-float-fast" />
      <div className="absolute top-[60%] right-[30%] w-56 h-56 rounded-full bg-gradient-to-br from-rose-400/15 to-purple-400/15 blur-3xl animate-float-slow" style={{ animationDelay: "-3s" }} />
      <div className="absolute top-[10%] right-[25%] w-40 h-40 rounded-full bg-gradient-to-br from-violet-400/20 to-fuchsia-500/20 blur-2xl animate-float-medium" style={{ animationDelay: "-5s" }} />

      <div className="absolute top-[20%] left-[30%] w-4 h-4 rounded-full bg-primary/30 animate-particle-1" />
      <div className="absolute top-[50%] right-[20%] w-3 h-3 rounded-full bg-purple-400/40 animate-particle-2" />
      <div className="absolute bottom-[30%] left-[15%] w-5 h-5 rounded-full bg-pink-400/25 animate-particle-3" />
      <div className="absolute top-[35%] left-[60%] w-3 h-3 rounded-full bg-fuchsia-400/30 animate-particle-1" style={{ animationDelay: "-4s" }} />
      <div className="absolute bottom-[40%] right-[40%] w-4 h-4 rounded-full bg-violet-400/35 animate-particle-2" style={{ animationDelay: "-2s" }} />

      <div className="absolute top-[25%] left-[45%] w-20 h-20 border border-primary/10 rounded-md animate-geo-rotate" />
      <div className="absolute bottom-[25%] right-[15%] w-16 h-16 border border-purple-400/10 rotate-45 animate-geo-float" />
      <div className="absolute top-[55%] left-[8%] w-12 h-12 border border-fuchsia-400/10 rounded-full animate-geo-pulse" />
    </div>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const features = [
  {
    icon: <Sparkles className="w-5 h-5" />,
    title: "AI-Powered Dashboards",
    description: "Upload your CSV and watch as AI generates beautiful, insightful dashboards automatically.",
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: "Conversational Analytics",
    description: "Ask questions in plain English and get visual answers with deep analysis.",
  },
  {
    icon: <BrainCircuit className="w-5 h-5" />,
    title: "Smart Hypotheses",
    description: "Click any data point and AI generates hypotheses about why it stands out.",
  },
  {
    icon: <Layers className="w-5 h-5" />,
    title: "Manual + AI Mode",
    description: "Build dashboards your way or let AI do it. AI features work in both modes.",
  },
  {
    icon: <Download className="w-5 h-5" />,
    title: "Export & Reports",
    description: "Generate PDF reports and export dashboards for corporate presentations.",
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: "Real-Time Insights",
    description: "Get instant trend analysis, pattern detection, and actionable recommendations.",
  },
];

const steps = [
  {
    number: "01",
    icon: <Upload className="w-6 h-6" />,
    title: "Upload Your Data",
    description: "Drop any CSV file and we handle the rest. Schema detection, data profiling, and preparation happen automatically.",
  },
  {
    number: "02",
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Get Your Dashboard",
    description: "Choose AI-generated or manual mode. Either way, get interactive charts, KPI metrics, and visualizations instantly.",
  },
  {
    number: "03",
    icon: <MessageSquare className="w-6 h-6" />,
    title: "Explore with AI",
    description: "Ask questions, drill into data points, generate reports. Your AI analyst is always ready beside your dashboard.",
  },
];

export default function LandingPage() {
  const [, navigate] = useLocation();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 0.3], [0, -60]);
  const opacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <img src={logoWithText} alt="FloralMind" className="h-7 object-contain" />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button onClick={() => navigate("/upload")} data-testid="button-header-get-started">
              Get Started
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
          src={heroVideo}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80 z-[1]" />

        <FloatingOrbs />

        <motion.div
          style={{ y, opacity }}
          className="relative z-[2] text-center max-w-4xl mx-auto px-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/10 border border-white/20 backdrop-blur-sm mb-6"
            >
              <Zap className="w-3.5 h-3.5 text-white" />
              <span className="text-xs font-medium text-white">AI-Native Analytics Platform</span>
            </motion.div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-2 text-white uppercase">
              FloralMind
            </h1>
            <p className="text-xl sm:text-2xl text-white/90 font-medium italic mb-6">
              Dashboards that think
            </p>
            <p className="text-lg sm:text-xl text-white/70 font-medium mb-6">
              Turn raw data into living, intelligent visualizations
            </p>

            <p className="text-base sm:text-lg text-white/60 max-w-2xl mx-auto mb-8 leading-relaxed">
              Upload a CSV or connect your Supabase database, and let AI generate interactive dashboards,
              uncover hidden patterns, and answer your questions through natural conversation.
            </p>

            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Button
                size="lg"
                onClick={() => navigate("/upload")}
                data-testid="button-hero-get-started"
              >
                <Upload className="w-4 h-4 mr-2" />
                Start Analyzing
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white/30 text-white bg-white/10 backdrop-blur-sm"
                onClick={() => {
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }}
                data-testid="button-hero-learn-more"
              >
                Learn More
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        </motion.div>

      </section>

      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
            className="text-center mb-16"
          >
            <motion.div variants={itemVariants}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20 mb-4">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">Platform Features</span>
              </div>
            </motion.div>
            <motion.h2 variants={itemVariants} className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Everything you need for
              <span className="text-primary"> data intelligence</span>
            </motion.h2>
            <motion.p variants={itemVariants} className="text-muted-foreground max-w-2xl mx-auto">
              From automated dashboard generation to conversational AI analytics, FloralMind
              gives you the tools to understand your data deeply.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={containerVariants}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {features.map((feature, i) => (
              <motion.div key={i} variants={itemVariants}>
                <Card className="p-5 h-full hover-elevate">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                    <span className="text-primary">{feature.icon}</span>
                  </div>
                  <h3 className="text-sm font-semibold mb-2">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-24 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
            className="text-center mb-16"
          >
            <motion.div variants={itemVariants}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20 mb-4">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">How It Works</span>
              </div>
            </motion.div>
            <motion.h2 variants={itemVariants} className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Three steps to
              <span className="text-primary"> data mastery</span>
            </motion.h2>
            <motion.p variants={itemVariants} className="text-muted-foreground max-w-xl mx-auto">
              Go from raw CSV to actionable insights in minutes, not hours.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={containerVariants}
            className="space-y-6"
          >
            {steps.map((step, i) => (
              <motion.div key={i} variants={itemVariants}>
                <Card className="p-6 hover-elevate">
                  <div className="flex items-start gap-5 flex-wrap">
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="text-3xl font-bold text-primary/20">{step.number}</span>
                      <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
                        <span className="text-primary">{step.icon}</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold mb-1">{step.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={containerVariants}
          >
            <motion.div variants={itemVariants}>
              <Card className="p-8 sm:p-12 text-center relative overflow-visible">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-[hsl(280,55%,50%)]/5 rounded-md" />
                <div className="relative">
                  <div className="w-14 h-14 rounded-md bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <BarChart3 className="w-7 h-7 text-primary" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
                    Ready to transform your data?
                  </h2>
                  <p className="text-muted-foreground max-w-lg mx-auto mb-6">
                    Upload your first dataset and experience the power of AI-driven analytics.
                    No setup, no coding, no waiting.
                  </p>
                  <Button
                    size="lg"
                    onClick={() => navigate("/upload")}
                    data-testid="button-cta-get-started"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Get Started Free
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <img src={logoWithText} alt="FloralMind" className="h-6 object-contain" />
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-xs text-muted-foreground italic">Dashboards that think</span>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Secure & Private</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">AI-Powered</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
