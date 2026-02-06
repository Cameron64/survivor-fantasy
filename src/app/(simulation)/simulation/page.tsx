import Link from 'next/link'
import { Eye, Play, BarChart3, GitCompare } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'

const tools = [
  {
    href: '/simulation/preview',
    icon: Eye,
    title: 'Preview',
    description: 'View castaway point values for a season before running simulations.',
  },
  {
    href: '/simulation/run',
    icon: Play,
    title: 'Single Run',
    description: 'Run one simulated draft and see team scores, draft board, and rankings.',
  },
  {
    href: '/simulation/batch',
    icon: BarChart3,
    title: 'Batch Analysis',
    description: 'Run thousands of Monte Carlo simulations and analyze scoring balance.',
  },
  {
    href: '/simulation/compare',
    icon: GitCompare,
    title: 'Compare',
    description: 'Compare two scoring schemes side-by-side with statistical analysis.',
  },
]

export default function SimulationOverview() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Simulation Lab</h1>
        <p className="text-muted-foreground mt-1">
          Monte Carlo simulation tools for testing scoring balance across historical Survivor seasons.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href}>
            <Card className="h-full hover:border-teal-300 dark:hover:border-teal-700 transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                    <tool.icon className="h-5 w-5 text-teal-600" />
                  </div>
                  <CardTitle className="text-lg">{tool.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{tool.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
