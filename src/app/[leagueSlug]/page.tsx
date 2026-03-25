import { redirect } from 'next/navigation'

export default async function LeagueRootPage({
  params,
}: {
  params: Promise<{ leagueSlug: string }>
}) {
  const { leagueSlug } = await params
  redirect(`/${leagueSlug}/leaderboard`)
}
