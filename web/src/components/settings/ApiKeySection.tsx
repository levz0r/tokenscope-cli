'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, Eye, EyeOff, RefreshCw } from 'lucide-react'

interface ApiKeySectionProps {
  apiKey: string
}

export function ApiKeySection({ apiKey }: ApiKeySectionProps) {
  const [showKey, setShowKey] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegenerate = async () => {
    if (!confirm('Are you sure you want to regenerate your API key? This will invalidate your current key.')) {
      return
    }

    setIsRegenerating(true)
    try {
      const response = await fetch('/api/auth/apikey', {
        method: 'POST',
      })

      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to regenerate API key:', error)
    } finally {
      setIsRegenerating(false)
    }
  }

  const maskedKey = apiKey
    ? apiKey.slice(0, 10) + '•'.repeat(20) + apiKey.slice(-4)
    : 'No API key found'

  return (
    <Card id="api-key" className="border-white/5 bg-white/[0.02]">
      <CardHeader>
        <CardTitle className="text-white">API Key</CardTitle>
        <CardDescription className="text-gray-400">
          Use this key to sync your local analytics with the cloud
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              value={showKey ? apiKey : maskedKey}
              readOnly
              className="bg-[#0a0a0a] border-white/5 text-gray-300 font-mono pr-20"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-white/10"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </Button>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="border-white/10 bg-white/10/50 hover:bg-white/15"
            onClick={handleCopy}
          >
            <Copy className={`h-4 w-4 ${copied ? 'text-emerald-400' : 'text-white'}`} />
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Keep this key secret. Do not share it or commit it to version control.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 bg-white/10/50 hover:bg-white/15 text-white"
            onClick={handleRegenerate}
            disabled={isRegenerating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
