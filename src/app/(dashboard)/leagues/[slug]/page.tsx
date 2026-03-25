import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function LeagueHomePage({ params }: Props) {
  const { slug } = await params
  redirect(`/leagues/${slug}/leaderboard`)
}
