import Link from 'next/link'
import { SignInButton, SignUpButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
      <div className="max-w-5xl mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <img src="/logo.png" alt="Survivor Fantasy League" className="h-10 w-auto" />
        </Link>
        <div className="flex items-center gap-2">
          <SignInButton>
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </SignInButton>
          <SignUpButton>
            <Button size="sm">
              Create Account
            </Button>
          </SignUpButton>
        </div>
      </div>
    </header>
  )
}
