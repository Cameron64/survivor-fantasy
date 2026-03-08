'use client'

import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Check } from 'lucide-react'
import { SplitTribalForm } from '@/components/events/split-tribal-form'
import { useSubmitContext } from '../_lib/submit-context'

export default function SplitTribalPage() {
  const router = useRouter()
  const { contestants, splitTribal, setSplitTribal, resetTribalState, updateTribalState, isLoading } = useSubmitContext()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // If split tribal groups are already defined, show the checklist
  if (splitTribal) {
    const startGroup = (group: 'A' | 'B') => {
      resetTribalState()
      const attendees = group === 'A' ? splitTribal.groupA : splitTribal.groupB
      updateTribalState({ selectedAttendees: new Set(attendees) })
      router.push('/events/submit/tribal-council/votes')
    }

    const bothComplete = splitTribal.groupAComplete && splitTribal.groupBComplete

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold">Split Tribal Council</h3>
          <p className="text-sm text-muted-foreground">
            Submit each group&apos;s tribal council separately.
          </p>
        </div>

        <div className="space-y-3">
          <Card className={`border-l-4 ${splitTribal.groupAComplete ? 'border-l-green-500' : 'border-l-blue-500'}`}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {splitTribal.groupAComplete ? (
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-500/10">
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-500/10">
                    <span className="text-sm font-bold text-blue-500">A</span>
                  </div>
                )}
                <div>
                  <p className="font-medium">Group A</p>
                  <p className="text-sm text-muted-foreground">
                    {splitTribal.groupA.length} contestants
                  </p>
                </div>
              </div>
              {splitTribal.groupAComplete ? (
                <Badge variant="secondary">Submitted</Badge>
              ) : (
                <Button size="sm" onClick={() => startGroup('A')}>
                  Start
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className={`border-l-4 ${splitTribal.groupBComplete ? 'border-l-green-500' : 'border-l-orange-500'}`}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {splitTribal.groupBComplete ? (
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-500/10">
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-500/10">
                    <span className="text-sm font-bold text-orange-500">B</span>
                  </div>
                )}
                <div>
                  <p className="font-medium">Group B</p>
                  <p className="text-sm text-muted-foreground">
                    {splitTribal.groupB.length} contestants
                  </p>
                </div>
              </div>
              {splitTribal.groupBComplete ? (
                <Badge variant="secondary">Submitted</Badge>
              ) : (
                <Button size="sm" onClick={() => startGroup('B')}>
                  Start
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {bothComplete && (
          <div className="text-center space-y-2">
            <p className="text-sm text-green-600 font-medium">Both tribal councils submitted!</p>
            <Button onClick={() => {
              setSplitTribal(null)
              router.push('/events')
            }}>
              Done
            </Button>
          </div>
        )}

        {!bothComplete && (
          <Button
            variant="outline"
            onClick={() => {
              setSplitTribal(null)
              router.push('/events/submit')
            }}
            className="w-full"
          >
            Cancel Split Tribal
          </Button>
        )}
      </div>
    )
  }

  // Initial setup — assign contestants to groups
  return (
    <SplitTribalForm
      contestants={contestants}
      onSubmit={({ groupA, groupB }) => {
        setSplitTribal({
          groupA,
          groupB,
          groupAComplete: false,
          groupBComplete: false,
        })
      }}
      onBack={() => router.push('/events/submit')}
    />
  )
}
