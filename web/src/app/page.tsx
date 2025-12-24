import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  BarChart3,
  Cloud,
  Code,
  GitBranch,
  LineChart,
  Users,
  ArrowRight,
} from 'lucide-react'
import { DashboardCarousel } from '@/components/landing/DashboardCarousel'

const features = [
  {
    icon: BarChart3,
    title: 'Track Tool Usage',
    description: 'Monitor Read, Write, Edit, Bash and other tool invocations in real-time.',
  },
  {
    icon: Code,
    title: 'Code Metrics',
    description: 'See lines added, removed, and files modified across all your sessions.',
  },
  {
    icon: GitBranch,
    title: 'Git Analytics',
    description: 'Track commits, pushes, PRs, and other git operations automatically.',
  },
  {
    icon: LineChart,
    title: 'Time Analytics',
    description: 'Visualize your coding patterns with hourly and daily activity heatmaps.',
  },
  {
    icon: Cloud,
    title: 'Cloud Sync',
    description: 'Sync your analytics across devices and access them from anywhere.',
  },
  {
    icon: Users,
    title: 'Team Dashboards',
    description: 'Aggregate analytics for your team. Great for engineering managers.',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-emerald-900/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-800/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-950/30 rounded-full blur-[200px]" />
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
              <Button variant="ghost" className="text-gray-400 hover:text-white hover:bg-white/5">
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
          href="https://github.com/levz0r/claude-code-analytics"
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
          <br className="hidden md:block" />
          Built for Claude Code developers.
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
            href="https://github.com/levz0r/claude-code-analytics"
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

      {/* Features */}
      <section className="relative z-10 container mx-auto px-6 py-24">
        <h2 className="font-serif text-4xl md:text-5xl font-light text-center mb-4">
          <span className="text-gray-400">Everything</span>{' '}
          <span className="text-white">You Need</span>
        </h2>
        <p className="text-gray-500 text-center mb-16 max-w-xl mx-auto">
          Comprehensive analytics to understand your AI-assisted development workflow.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-emerald-500/20 transition-all duration-300"
            >
              <feature.icon className="h-10 w-10 text-emerald-500/70 mb-4 group-hover:text-emerald-400 transition-colors" />
              <h3 className="text-lg font-medium text-white mb-2">{feature.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 container mx-auto px-6 py-24">
        <div className="relative rounded-3xl bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 p-12 md:p-16 text-center overflow-hidden">
          {/* CTA background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-emerald-500/10 rounded-full blur-[100px]" />

          <h2 className="relative font-serif text-3xl md:text-4xl font-light mb-4">
            <span className="text-gray-400">Ready to</span>{' '}
            <span className="text-white">Get Started?</span>
          </h2>
          <p className="relative text-gray-500 mb-8 max-w-lg mx-auto">
            Install with one command. Free forever for personal use.
          </p>

          <div className="relative rounded-xl bg-black/50 border border-white/10 p-4 font-mono text-sm text-left mb-8 max-w-2xl mx-auto backdrop-blur-sm">
            <p className="text-gray-500 mb-1"># Install with one command</p>
            <p className="text-emerald-400 break-all">
              curl -sSL https://raw.githubusercontent.com/levz0r/claude-code-analytics/main/install.sh | bash
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
              href="https://github.com/levz0r/claude-code-analytics"
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
  )
}
