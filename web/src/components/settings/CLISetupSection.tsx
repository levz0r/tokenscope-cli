'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Clock } from 'lucide-react'

const tools = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    logo: '/logos/claude.svg',
    status: 'available',
    installCommand: 'curl -sSL https://raw.githubusercontent.com/levz0r/tokenscope/main/install.sh | bash',
    loginCommand: (apiKey: string) => `cc-analytics login ${apiKey ? apiKey.slice(0, 10) + '...' : 'YOUR_API_KEY'}`,
    description: 'Track your Claude Code sessions, tool usage, and code changes.',
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    logo: '/logos/copilot.svg',
    status: 'coming-soon',
    description: 'Analytics for GitHub Copilot completions and suggestions.',
  },
  {
    id: 'codex',
    name: 'OpenAI Codex',
    logo: '/logos/openai.svg',
    status: 'coming-soon',
    description: 'Track ChatGPT and Codex usage in your development workflow.',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    logo: '/logos/gemini.svg',
    status: 'coming-soon',
    description: 'Monitor Gemini Code Assist activity and metrics.',
  },
]

interface CLISetupSectionProps {
  apiKey: string
}

export function CLISetupSection({ apiKey }: CLISetupSectionProps) {
  const [selectedTool, setSelectedTool] = useState('claude-code')
  const currentTool = tools.find(t => t.id === selectedTool)!

  return (
    <Card className="border-white/5 bg-white/[0.02]">
      <CardHeader>
        <CardTitle className="text-white">CLI Setup</CardTitle>
        <CardDescription className="text-gray-400">
          Connect your AI coding tools to this dashboard
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tool Tabs */}
        <div className="flex gap-2 flex-wrap">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                selectedTool === tool.id
                  ? tool.status === 'available'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-white'
                    : 'bg-white/5 border-white/10 text-white'
                  : 'bg-transparent border-white/5 text-gray-400 hover:border-white/10 hover:text-gray-300'
              }`}
            >
              <Image
                src={tool.logo}
                alt={tool.name}
                width={20}
                height={20}
                className="opacity-80"
              />
              <span className="text-sm font-medium">{tool.name}</span>
              {tool.status === 'available' ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Clock className="h-3 w-3 text-gray-500" />
              )}
            </button>
          ))}
        </div>

        {/* Tool Content */}
        <div className="rounded-lg bg-[#0a0a0a] p-4">
          {currentTool.status === 'available' ? (
            <div className="font-mono text-sm space-y-4">
              <p className="text-gray-400 font-sans text-sm mb-4">{currentTool.description}</p>
              <div>
                <p className="text-gray-400"># Install TokenScope CLI</p>
                <p className="text-emerald-400 break-all">{currentTool.installCommand}</p>
              </div>
              <div>
                <p className="text-gray-400"># Login with your API key</p>
                <p className="text-emerald-400">{currentTool.loginCommand?.(apiKey)}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                <Image
                  src={currentTool.logo}
                  alt={currentTool.name}
                  width={32}
                  height={32}
                  className="opacity-50"
                />
              </div>
              <h3 className="text-white font-medium mb-2">{currentTool.name} Support Coming Soon</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto">
                {currentTool.description}
              </p>
              <p className="text-gray-600 text-xs mt-4">
                We&apos;re working on adding support for {currentTool.name}. Stay tuned!
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
