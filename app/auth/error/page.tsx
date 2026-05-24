import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Authentication Error
        </h1>
        <p className="text-muted-foreground mb-8">
          Something went wrong during the authentication process. Please try again.
        </p>
        <div className="flex flex-col gap-3">
          <Link href="/auth/login">
            <Button className="w-full">Try Again</Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
