'use client'

import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from './sidebar'
import { ChatArea } from './chat-area'
import { EmptyState } from './empty-state'
import { AddContactModal } from './add-contact-modal'
import { VoiceCallModal } from './voice-call-modal'

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

interface Conversation {
  conversation_id: string
  conversations: {
    id: string
    created_at: string
    updated_at: string
  }
}

interface ChatLayoutProps {
  user: User
  profile: Profile | null
  conversations: Conversation[]
  contacts: Contact[]
}

export function ChatLayout({ user, profile, conversations: initialConversations, contacts: initialContacts }: ChatLayoutProps) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [showAddContact, setShowAddContact] = useState(false)
  const [showVoiceCall, setShowVoiceCall] = useState(false)
  const [callReceiver, setCallReceiver] = useState<Profile | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const supabase = createClient()

  // Update user status to online
  useEffect(() => {
    const updateStatus = async () => {
      await supabase
        .from('profiles')
        .update({ status: 'online', last_seen: new Date().toISOString() })
        .eq('id', user.id)
    }
    updateStatus()

    // Set offline on page unload
    const handleUnload = () => {
      navigator.sendBeacon('/api/status/offline', JSON.stringify({ userId: user.id }))
    }
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [user.id, supabase])

  // Subscribe to contact status changes
  useEffect(() => {
    const channel = supabase
      .channel('profiles-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          setContacts((prev) =>
            prev.map((c) =>
              c.contact.id === payload.new.id
                ? { ...c, contact: { ...c.contact, ...payload.new } }
                : c
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  // Get or create conversation when selecting a contact
  const handleSelectContact = async (contact: Contact) => {
    setSelectedContact(contact)
    setSidebarOpen(false)

    // Check if conversation exists
    const { data: existingConv } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id)
      .in(
        'conversation_id',
        (
          await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', contact.contact.id)
        ).data?.map((c) => c.conversation_id) || []
      )
      .limit(1)
      .single()

    if (existingConv) {
      setConversationId(existingConv.conversation_id)
    } else {
      // Create new conversation
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single()

      if (newConv) {
        // Add both participants
        await supabase.from('conversation_participants').insert([
          { conversation_id: newConv.id, user_id: user.id },
          { conversation_id: newConv.id, user_id: contact.contact.id },
        ])
        setConversationId(newConv.id)
      }
    }
  }

  const handleStartCall = (contact: Contact) => {
    setCallReceiver(contact.contact)
    setShowVoiceCall(true)
  }

  const handleContactAdded = (newContact: Contact) => {
    setContacts((prev) => [...prev, newContact])
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        user={user}
        profile={profile}
        contacts={contacts}
        selectedContact={selectedContact}
        onSelectContact={handleSelectContact}
        onAddContact={() => setShowAddContact(true)}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {selectedContact && conversationId ? (
          <ChatArea
            user={user}
            contact={selectedContact}
            conversationId={conversationId}
            onStartCall={() => handleStartCall(selectedContact)}
            onBack={() => {
              setSelectedContact(null)
              setSidebarOpen(true)
            }}
          />
        ) : (
          <EmptyState onAddContact={() => setShowAddContact(true)} />
        )}
      </main>

      <AddContactModal
        open={showAddContact}
        onClose={() => setShowAddContact(false)}
        userId={user.id}
        onContactAdded={handleContactAdded}
      />

      {showVoiceCall && callReceiver && (
        <VoiceCallModal
          open={showVoiceCall}
          onClose={() => {
            setShowVoiceCall(false)
            setCallReceiver(null)
          }}
          caller={profile!}
          receiver={callReceiver}
        />
      )}
    </div>
  )
}
