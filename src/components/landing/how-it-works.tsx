const steps = [
  {
    number: '1',
    title: 'Join the League',
    description: 'Create an account with your invite link or sign up if the league is open.',
  },
  {
    number: '2',
    title: 'Draft Your Team',
    description: 'Pick castaways in a snake draft before the season premieres.',
  },
  {
    number: '3',
    title: 'Score Each Week',
    description: 'Your contestants earn points for immunity wins, correct votes, idols, and more.',
  },
  {
    number: '4',
    title: 'Win the League',
    description: "The player whose team racks up the most points by the finale takes the crown.",
  },
]

export function LandingHowItWorks() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-10">How it works</h2>
        <ol className="space-y-8">
          {steps.map(({ number, title, description }) => (
            <li key={number} className="flex gap-5">
              <span className="flex-shrink-0 h-9 w-9 rounded-full bg-orange-500 text-white font-bold flex items-center justify-center text-sm">
                {number}
              </span>
              <div className="space-y-1 pt-1">
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
