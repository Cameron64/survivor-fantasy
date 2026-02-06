import { redirect } from 'next/navigation'
import { SignUp } from '@clerk/nextjs'
import { db } from '@/lib/db'

interface InvitePageProps {
  params: Promise<{ code: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params

  // Validate invite code exists
  const inviter = await db.user.findUnique({
    where: { inviteCode: code },
  })

  if (!inviter) {
    redirect('/sign-up?error=invalid_invite')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-amber-50 to-orange-100">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          You&apos;ve been invited by {inviter.name}!
        </h1>
        <p className="mt-2 text-gray-600">
          Join the Survivor 50 Fantasy League
        </p>
      </div>
      <SignUp
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'shadow-xl',
          },
        }}
        unsafeMetadata={{
          inviteCode: code,
          invitedById: inviter.id,
        }}
      />
    </div>
  )
}
