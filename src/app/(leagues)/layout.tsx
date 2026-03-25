import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'

export default async function LeaguesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  return <>{children}</>
}
