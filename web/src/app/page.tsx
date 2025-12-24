import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart3,
  Cloud,
  Code,
  GitBranch,
  LineChart,
  Terminal,
  Users,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              TS
            </div>
            <span className="font-semibold text-white">TokenScope</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-300 hover:text-white">
                Sign In
              </Button>
            </Link>
            <Link href="/login">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm mb-6">
          <Terminal className="h-4 w-4" />
          Open Source
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
          Track Your AI-Assisted
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Coding Activity
          </span>
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
          Analytics for AI-assisted coding. Track tool usage, file changes, git operations,
          and coding patterns. Works with Claude Code.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/login">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8">
              Start Free
            </Button>
          </Link>
          <Link
            href="https://github.com/levz0r/claude-code-analytics"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 text-lg px-8">
              View on GitHub
            </Button>
          </Link>
        </div>

        {/* Dashboard Preview */}
        <div className="mt-16 px-8">
          <DashboardCarousel />
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Everything You Need
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="border-slate-700 bg-slate-800/50">
              <CardHeader>
                <feature.icon className="h-8 w-8 text-blue-400 mb-2" />
                <CardTitle className="text-white">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-slate-400">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Card className="border-slate-700 bg-slate-800/50 max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl text-white">
              Ready to track your Claude Code usage?
            </CardTitle>
            <CardDescription className="text-slate-400">
              Get started in under 2 minutes. Free forever for personal use.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-slate-900 p-4 font-mono text-sm text-left mb-6">
              <p className="text-slate-400"># Install with one command</p>
              <p className="text-green-400">
                curl -sSL https://raw.githubusercontent.com/levz0r/claude-code-analytics/main/install.sh | bash
              </p>
            </div>
            <Link href="/login">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                Create Free Account
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">
              TS
            </div>
            <span className="text-sm text-slate-400">TokenScope</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-400">
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
