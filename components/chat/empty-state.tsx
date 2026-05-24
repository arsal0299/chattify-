'use client'

import { MessageCircle, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  onAddContact: () => void
}

export function EmptyState({ onAddContact }: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center bg-background p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <MessageCircle className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Welcome to Chattify
        </h2>
        <p className="text-muted-foreground mb-8">
          Select a contact from the sidebar to start chatting, or add new friends to connect with.
        </p>
        <Button onClick={onAddContact} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Add Your First Contact
        </Button>
      </div>
    </div>
  )
}
