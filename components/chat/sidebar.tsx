'use client'

import type { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { MessageCircle, UserPlus, LogOut, Menu, X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useState } from 'react'
import { cn } from '@/lib/utils'

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

interface SidebarProps {
  user: User
  profile: Profile | null
  contacts: Contact[]
  selectedContact: Contact | null
  onSelectContact: (contact: Contact) => void
  onAddContact: () => void
  isOpen: boolean
  onToggle: () => void
}

export function Sidebar({
  profile,
  contacts,
  selectedContact,
  onSelectContact,
  onAddContact,
  isOpen,
  onToggle,
}: SidebarProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Logged out successfully')
    router.push('/')
    router.refresh()
  }

  const filteredContacts = contacts.filter((contact) =>
    contact.contact.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase()
  }

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return ''
    const date = new Date(lastSeen)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Mobile Toggle Button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 bg-card rounded-lg border border-border shadow-sm"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:relative inset-y-0 left-0 z-40 w-80 bg-card border-r border-border flex flex-col transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-foreground">Chattify</h1>
                <p className="text-xs text-muted-foreground">
                  @{profile?.username || 'user'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
        </div>

        {/* Add Contact Button */}
        <div className="px-4 pb-4">
          <Button
            onClick={onAddContact}
            variant="outline"
            className="w-full justify-start gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add New Contact
          </Button>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredContacts.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <p className="text-sm">No contacts yet</p>
              <p className="text-xs mt-1">Add friends to start chatting</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => onSelectContact(contact)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left',
                    selectedContact?.id === contact.id
                      ? 'bg-primary/10 text-foreground'
                      : 'hover:bg-secondary text-foreground'
                  )}
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarFallback className="bg-primary/20 text-primary font-medium">
                        {getInitials(contact.contact.username)}
                      </AvatarFallback>
                    </Avatar>
                    {contact.contact.status === 'online' && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-[var(--online-status)] rounded-full border-2 border-card" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {contact.contact.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {contact.contact.status === 'online'
                        ? 'Online'
                        : formatLastSeen(contact.contact.last_seen)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                {getInitials(profile?.username || 'U')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{profile?.username}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
            </div>
            <span className="w-2 h-2 bg-[var(--online-status)] rounded-full" />
          </div>
        </div>
      </aside>
    </>
  )
}
