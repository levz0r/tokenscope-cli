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
    <Card id="api-key" className="border-slate-700 bg-slate-800/50">
      <CardHeader>
        <CardTitle className="text-white">API Key</CardTitle>
        <CardDescription className="text-slate-400">
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
              className="bg-slate-900 border-slate-700 text-slate-300 font-mono pr-20"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-slate-700"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? (
                <EyeOff className="h-4 w-4 text-slate-400" />
              ) : (
                <Eye className="h-4 w-4 text-slate-400" />
              )}
            </Button>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="border-slate-600 bg-slate-700/50 hover:bg-slate-600"
            onClick={handleCopy}
          >
            <Copy className={`h-4 w-4 ${copied ? 'text-green-400' : 'text-white'}`} />
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Keep this key secret. Do not share it or commit it to version control.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-600 bg-slate-700/50 hover:bg-slate-600 text-white"
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
