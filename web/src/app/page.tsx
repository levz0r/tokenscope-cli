import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  Cloud,
  Code,
  GitBranch,
  LineChart,
  Users,
  ArrowRight,
  Check,
  Clock,
  TrendingUp,
  Lightbulb,
  Zap,
} from "lucide-react";
import { DashboardCarousel } from "@/components/landing/DashboardCarousel";
import Squares from "@/components/backgrounds/Squares";
import CardSwap, { Card } from "@/components/landing/CardSwap";

const integrations = [
  {
    name: "Claude Code",
    logo: "/logos/claude.svg",
    status: "available",
    description: "Full support for Anthropic Claude Code",
  },
  {
    name: "GitHub Copilot",
    logo: "/logos/copilot.svg",
    status: "coming-soon",
    description: "GitHub Copilot analytics",
  },
  {
    name: "OpenAI Codex",
    logo: "/logos/openai.svg",
    status: "coming-soon",
    description: "ChatGPT & Codex tracking",
  },
  {
    name: "Google Gemini",
    logo: "/logos/gemini.svg",
    status: "coming-soon",
    description: "Gemini Code Assist metrics",
  },
];

const features = [
  {
    icon: BarChart3,
    title: "Track Tool Usage",
    description:
      "Monitor Read, Write, Edit, Bash and other tool invocations in real-time.",
  },
  {
    icon: Code,
    title: "Code Metrics",
    description:
      "See lines added, removed, and files modified across all your sessions.",
  },
  {
    icon: GitBranch,
    title: "Git Analytics",
    description:
      "Track commits, pushes, PRs, and other git operations automatically.",
  },
  {
    icon: LineChart,
    title: "Time Analytics",
    description:
      "Visualize your coding patterns with hourly and daily activity heatmaps.",
  },
  {
    icon: Cloud,
    title: "Cloud Sync",
    description:
      "Sync your analytics across devices and access them from anywhere.",
  },
  {
    icon: Users,
    title: "Team Dashboards",
    description:
      "Aggregate analytics for your team. Great for engineering managers.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* Animated squares background */}
      <div className="absolute inset-0 z-0">
        <Squares
          direction="diagonal"
          speed={0.3}
          squareSize={50}
          borderColor="rgba(16, 185, 129, 0.1)"
          hoverFillColor="rgba(16, 185, 129, 0.15)"
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-emerald-500/20">
              TS
            </div>
            <span className="font-medium text-white text-lg">TokenScope</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="ghost"
                className="text-gray-400 hover:text-white hover:bg-white/5"
              >
                Sign In
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-white/10 hover:bg-white/15 text-white border border-white/10 backdrop-blur-sm">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 container mx-auto px-6 pt-24 pb-16 text-center">
        <Link
          href="https://github.com/levz0r/tokenscope"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-8 hover:bg-emerald-500/15 transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Open Source Analytics
          <ArrowRight className="h-4 w-4" />
        </Link>

        <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-light tracking-tight mb-6">
          <span className="text-gray-400">Analytics for</span>
          <br />
          <span className="text-white">AI-Assisted Coding</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Track tool usage, file changes, git operations, and coding patterns.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          <Link href="/login">
            <Button
              size="lg"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-lg px-8 h-12 shadow-lg shadow-emerald-500/25"
            >
              Start Free
            </Button>
          </Link>
          <Link
            href="https://github.com/levz0r/tokenscope"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              size="lg"
              variant="outline"
              className="border-white/10 bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white text-lg px-8 h-12 backdrop-blur-sm"
            >
              View on GitHub
            </Button>
          </Link>
        </div>

        {/* Dashboard Preview */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent z-10 pointer-events-none h-32 bottom-0 top-auto" />
          <DashboardCarousel />
        </div>
      </section>

      {/* Integrations */}
      <section className="relative z-10 container mx-auto px-6 py-16">
        <h2 className="text-center text-sm font-medium text-gray-500 uppercase tracking-wider mb-8">
          Works with your favorite AI coding tools
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className={`relative p-6 rounded-2xl border text-center transition-all ${
                integration.status === "available"
                  ? "bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40"
                  : "bg-white/[0.02] border-white/5 hover:border-white/10"
              }`}
            >
              {integration.status === "available" ? (
                <span className="absolute top-3 right-3 flex items-center gap-1 text-xs text-emerald-400">
                  <Check className="h-3 w-3" />
                </span>
              ) : (
                <span className="absolute top-3 right-3 flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                </span>
              )}
              <div className="h-10 w-10 mx-auto mb-3 flex items-center justify-center">
                <Image
                  src={integration.logo}
                  alt={integration.name}
                  width={40}
                  height={40}
                  className="opacity-80"
                />
              </div>
              <h3
                className={`font-medium text-sm ${
                  integration.status === "available"
                    ? "text-white"
                    : "text-gray-400"
                }`}
              >
                {integration.name}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {integration.status === "available"
                  ? "Available now"
                  : "Coming soon"}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Value Proposition */}
      <section className="relative z-10 container mx-auto px-6 py-24 border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl md:text-5xl font-light mb-4">
            <span className="text-gray-400">Why</span>{" "}
            <span className="text-white">TokenScope?</span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Transform how your organization measures and optimizes AI-assisted
            development.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 transition-all">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
              <TrendingUp className="h-7 w-7 text-emerald-400" />
            </div>
            <h3 className="text-xl font-medium text-white mb-3">
              Measure AI ROI
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Quantify the impact of AI coding tools on your development
              workflow. Make data-driven decisions about your AI investments.
            </p>
          </div>

          <div className="text-center p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 transition-all">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
              <Lightbulb className="h-7 w-7 text-emerald-400" />
            </div>
            <h3 className="text-xl font-medium text-white mb-3">
              Enable Innovation
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Empower your development teams to experiment with AI tools. Track
              adoption patterns and identify best practices across your org.
            </p>
          </div>

          <div className="text-center p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-emerald-500/20 transition-all">
            <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
              <Zap className="h-7 w-7 text-emerald-400" />
            </div>
            <h3 className="text-xl font-medium text-white mb-3">
              Drive Velocity
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Boost team productivity with actionable insights. Identify
              bottlenecks and optimize your AI-assisted development pipeline.
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 container mx-auto px-6 py-24">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          {/* Left side - Text content */}
          <div className="flex-1 text-center lg:text-left">
            <h2 className="font-serif text-4xl md:text-5xl font-light mb-4">
              <span className="text-gray-400">Everything</span>{" "}
              <span className="text-white">You Need</span>
            </h2>
            <p className="text-gray-500 mb-8 max-w-lg">
              Comprehensive analytics to understand your AI-assisted development
              workflow.
            </p>
            <ul className="space-y-4 text-left inline-block">
              {features.slice(0, 4).map((feature) => (
                <li
                  key={feature.title}
                  className="flex items-center gap-3 text-gray-400"
                >
                  <feature.icon className="h-5 w-5 text-emerald-500" />
                  <span>{feature.title}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right side - CardSwap */}
          <div className="flex-1 h-[500px] relative hidden lg:block">
            <CardSwap
              width={380}
              height={280}
              cardDistance={50}
              verticalDistance={60}
              delay={4000}
              pauseOnHover={true}
              easing="elastic"
            >
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  className="p-8 backdrop-blur-sm bg-gradient-to-br from-white/[0.04] to-white/[0.01] border-emerald-500/10"
                >
                  <feature.icon className="h-12 w-12 text-emerald-400 mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              ))}
            </CardSwap>
          </div>

          {/* Mobile fallback - Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:hidden w-full">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-emerald-500/20 transition-all duration-300"
              >
                <feature.icon className="h-10 w-10 text-emerald-500/70 mb-4 group-hover:text-emerald-400 transition-colors" />
                <h3 className="text-lg font-medium text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 container mx-auto px-6 py-24">
        <div className="relative rounded-3xl bg-white/[0.02] border border-white/5 p-12 md:p-16 text-center overflow-hidden backdrop-blur-sm">
          <h2 className="relative font-serif text-3xl md:text-4xl font-light mb-4">
            <span className="text-gray-400">Ready to</span>{" "}
            <span className="text-white">Get Started?</span>
          </h2>
          <p className="relative text-gray-500 mb-8 max-w-lg mx-auto">
            Install with one command. Free forever for personal use.
          </p>

          <div className="relative rounded-xl bg-black/50 border border-white/10 p-4 font-mono text-sm text-left mb-8 max-w-2xl mx-auto backdrop-blur-sm">
            <p className="text-gray-500 mb-1"># Install with one command</p>
            <p className="text-emerald-400 break-all">
              curl -sSL
              https://raw.githubusercontent.com/levz0r/tokenscope/main/install.sh
              | bash
            </p>
          </div>

          <Link href="/login">
            <Button
              size="lg"
              className="relative bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
            >
              Create Free Account
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-xs">
              TS
            </div>
            <span className="text-sm text-gray-500">TokenScope</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link
              href="https://github.com/levz0r/tokenscope"
              className="hover:text-white transition-colors"
            >
              GitHub
            </Link>
            <Link href="/login" className="hover:text-white transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
