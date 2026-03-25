import { Card, CardContent } from '@/components/ui/card'
import { Trophy, Users, Calendar, Star } from 'lucide-react'

const features = [
  {
    icon: Users,
    title: 'Snake Draft',
    description: 'Pick your team before the season starts. Everyone gets a fair shot at the best castaways.',
  },
  {
    icon: Star,
    title: 'Real-Time Scoring',
    description: 'Points for immunity wins, correct votes, idol finds, and more — updated after every episode.',
  },
  {
    icon: Trophy,
    title: 'Live Leaderboard',
    description: 'See exactly where you stand week by week. Climb the ranks as your players make moves.',
  },
  {
    icon: Calendar,
    title: 'Full Season',
    description: 'From the first tribal council through the finale — every episode, every vote counts.',
  },
]

export function LandingFeatures() {
  return (
    <section className="py-16 px-4 bg-muted/40">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-10">Everything you need to compete</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardContent className="pt-6 space-y-3">
                <Icon className="h-6 w-6 text-orange-500" />
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
