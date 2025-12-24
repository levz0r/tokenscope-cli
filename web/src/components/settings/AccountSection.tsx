'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { Check, Loader2 } from 'lucide-react'

interface AccountSectionProps {
  user: User
  name: string | null
}

export function AccountSection({ user, name: initialName }: AccountSectionProps) {
  const [name, setName] = useState(initialName || '')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const initials = (name || user.email?.split('@')[0] || 'U')
    .slice(0, 2)
    .toUpperCase()

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      if (response.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="border-white/5 bg-white/[0.02]">
      <CardHeader>
        <CardTitle className="text-white">Account</CardTitle>
        <CardDescription className="text-gray-400">
          Your account information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-white/15 text-white text-xl">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-lg font-medium text-white">{name || user.email?.split('@')[0]}</p>
            <p className="text-sm text-gray-400">{user.email}</p>
            <p className="text-xs text-gray-500">
              Member since {format(new Date(user.created_at), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name" className="text-gray-300">Display Name</Label>
          <div className="flex gap-2">
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="bg-[#0a0a0a] border-white/5 text-white placeholder:text-gray-500"
            />
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={isSaving || name === initialName}
              className="border-white/10 bg-white/10/50 hover:bg-white/15 text-white"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4" />
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
