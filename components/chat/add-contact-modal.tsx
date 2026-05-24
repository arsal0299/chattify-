'use client'

import { useState } from 'react'
import { Search, UserPlus, Loader2, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Profile {
  id: string
  username: string
  email: string
  avatar_url?: string
  status?: string
  last_seen?: string
}

interface Contact {
  id: string
  user_id: string
  contact_id: string
  status: string
  contact: Profile
}

interface AddContactModalProps {
  open: boolean
  onClose: () => void
  userId: string
  onContactAdded: (contact: Contact) => void
}

export function AddContactModal({ open, onClose, userId, onContactAdded }: AddContactModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<Profile[]>([])
  const [adding, setAdding] = useState<string | null>(null)
  const supabase = createClient()

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    setResults([])

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${searchQuery}%`)
        .neq('id', userId)
        .limit(10)

      if (error) throw error

      // Filter out existing contacts
      const { data: existingContacts } = await supabase
        .from('contacts')
        .select('contact_id')
        .eq('user_id', userId)

      const existingIds = existingContacts?.map((c) => c.contact_id) || []
      const filtered = data?.filter((p) => !existingIds.includes(p.id)) || []

      setResults(filtered)

      if (filtered.length === 0) {
        toast.info('No users found with that username')
      }
    } catch {
      toast.error('Failed to search users')
    } finally {
      setSearching(false)
    }
  }

  const handleAddContact = async (profile: Profile) => {
    setAdding(profile.id)

    try {
      // Add contact (you add them)
      const { data: contact, error } = await supabase
        .from('contacts')
        .insert({
          user_id: userId,
          contact_id: profile.id,
          status: 'accepted',
        })
        .select(`
          *,
          contact:profiles!contacts_contact_id_fkey (
            id,
            username,
            email,
            avatar_url,
            status,
            last_seen
          )
        `)
        .single()

      if (error) throw error

      // Add reverse contact (they add you)
      await supabase.from('contacts').insert({
        user_id: profile.id,
        contact_id: userId,
        status: 'accepted',
      })

      toast.success(`Added ${profile.username} as a contact!`)
      onContactAdded(contact)
      setResults((prev) => prev.filter((p) => p.id !== profile.id))
    } catch {
      toast.error('Failed to add contact')
    } finally {
      setAdding(null)
    }
  }

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase()
  }

  const handleClose = () => {
    setSearchQuery('')
    setResults([])
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Add New Contact
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSearch()
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" disabled={searching || !searchQuery.trim()}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </Button>
          </form>

          {results.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {results.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/20 text-primary font-medium">
                      {getInitials(profile.username)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {profile.username}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {profile.email}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleAddContact(profile)}
                    disabled={adding === profile.id}
                  >
                    {adding === profile.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Add
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {results.length === 0 && !searching && searchQuery && (
            <p className="text-center text-muted-foreground py-4">
              No users found. Try a different username.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
