import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModerator } from '@/lib/auth'
import { notifyGameEventApproved } from '@/lib/slack'
import { normalizeTribalData, QuitMedevacData, TribeMergeData, TribeSwapData, GameEventData } from '@/lib/event-derivation'
import { checkChronologicalApproval, checkDownstreamDependencies } from '@/lib/approval-guards'

interface RouteParams {
  params: Promise<{ leagueSlug: string; id: string }>
}

// PATCH /api/[leagueSlug]/game-events/[id]
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireModerator()
    const { leagueSlug, id } = await params
    const body = await req.json()

    const { isApproved } = body

    if (typeof isApproved !== 'boolean') {
      return NextResponse.json({ error: 'isApproved must be a boolean' }, { status: 400 })
    }

    const existingGameEvent = await db.gameEvent.findUnique({
      where: { id },
      include: {
        events: { include: { contestant: true } },
      },
    })

    if (!existingGameEvent) {
      return NextResponse.json({ error: 'Game event not found' }, { status: 404 })
    }

    if (isApproved) {
      const chronoCheck = await checkChronologicalApproval(existingGameEvent.week)
      if (chronoCheck.blocked) {
        return NextResponse.json({
          error: `Cannot approve: ${chronoCheck.blockingEvents!.length} unapproved event(s) exist in earlier weeks. Approve them first.`,
          blockingEvents: chronoCheck.blockingEvents,
        }, { status: 400 })
      }
    }

    if (!isApproved && existingGameEvent.isApproved) {
      if (existingGameEvent.type === 'TRIBE_MERGE' || existingGameEvent.type === 'TRIBE_SWAP') {
        const data = existingGameEvent.data as unknown as GameEventData
        let affectedIds: string[] = []
        if (existingGameEvent.type === 'TRIBE_MERGE') {
          affectedIds = (data as TribeMergeData).remainingContestants
        } else {
          affectedIds = (data as TribeSwapData).moves.map((m) => m.contestantId)
        }
        const downstreamCheck = await checkDownstreamDependencies(id, existingGameEvent.week, affectedIds)
        if (downstreamCheck.blocked) {
          return NextResponse.json({
            error: `Cannot unapprove: ${downstreamCheck.blockingEvents!.length} later approved event(s) depend on this. Unapprove them first.`,
            blockingEvents: downstreamCheck.blockingEvents,
          }, { status: 400 })
        }
      }
    }

    const gameEvent = await db.$transaction(async (tx) => {
      const ge = await tx.gameEvent.update({
        where: { id },
        data: {
          isApproved,
          approvedById: isApproved ? user.id : null,
        },
      })

      await tx.event.updateMany({
        where: { gameEventId: id },
        data: {
          isApproved,
          approvedById: isApproved ? user.id : null,
        },
      })

      const data = ge.data as unknown as GameEventData

      if (isApproved) {
        if (ge.type === 'TRIBAL_COUNCIL') {
          const tribalData = normalizeTribalData(data as unknown as Record<string, unknown>)
          if (!tribalData.eliminated) throw new Error('normalized tribal data missing eliminated field')
          await tx.contestant.update({
            where: { id: tribalData.eliminated },
            data: { isEliminated: true, eliminatedWeek: ge.week },
          })
        }

        if (ge.type === 'QUIT_MEDEVAC') {
          const quitData = data as QuitMedevacData
          await tx.contestant.update({
            where: { id: quitData.contestant },
            data: { isEliminated: true, eliminatedWeek: ge.week },
          })
        }

        if (ge.type === 'TRIBE_MERGE') {
          const mergeData = data as TribeMergeData

          const mergeTribe = await tx.tribe.findUnique({ where: { id: mergeData.mergeTribeId } })
          if (!mergeTribe || !mergeTribe.isMerge) {
            throw new Error('Merge tribe not found or not marked as merge tribe')
          }

          await tx.tribeMembership.updateMany({
            where: { toWeek: null },
            data: { toWeek: mergeData.mergeWeek - 1, gameEventId: ge.id },
          })

          for (const contestantId of mergeData.remainingContestants) {
            await tx.tribeMembership.create({
              data: { contestantId, tribeId: mergeData.mergeTribeId, fromWeek: mergeData.mergeWeek, gameEventId: ge.id },
            })
          }

          const league = await tx.league.findUnique({ where: { slug: leagueSlug } })
          if (league) {
            await tx.league.update({
              where: { id: league.id },
              data: {
                mergeWeek: mergeData.mergeWeek,
                ...(mergeData.juryStartsThisWeek && { juryStartWeek: mergeData.mergeWeek }),
              },
            })

            await tx.episode.updateMany({
              where: {
                leagueId: league.id,
                number: { gte: mergeData.mergeWeek },
                phaseSource: { in: ['INFERRED', 'AUTO'] },
              },
              data: { gamePhase: 'MERGED', phaseSource: 'AUTO' },
            })
          }
        }

        if (ge.type === 'TRIBE_SWAP') {
          const swapData = data as TribeSwapData

          for (const move of swapData.moves) {
            const activeMembership = await tx.tribeMembership.findFirst({
              where: { contestantId: move.contestantId, tribeId: move.fromTribeId, toWeek: null },
            })
            if (!activeMembership) {
              throw new Error(`Contestant ${move.contestantId} is not currently on tribe ${move.fromTribeId}`)
            }

            await tx.tribeMembership.update({
              where: { id: activeMembership.id },
              data: { toWeek: swapData.swapWeek - 1, gameEventId: ge.id },
            })

            await tx.tribeMembership.create({
              data: { contestantId: move.contestantId, tribeId: move.toTribeId, fromWeek: swapData.swapWeek, gameEventId: ge.id },
            })
          }

          if (swapData.dissolvedTribeId) {
            await tx.tribe.update({
              where: { id: swapData.dissolvedTribeId },
              data: { dissolvedAtWeek: swapData.swapWeek, dissolvedByEventId: ge.id },
            })
          }
        }
      } else {
        if (ge.type === 'TRIBAL_COUNCIL') {
          const tribalData = normalizeTribalData(data as unknown as Record<string, unknown>)
          if (!tribalData.eliminated) throw new Error('normalized tribal data missing eliminated field')

          const otherElimination = await tx.gameEvent.findFirst({
            where: {
              id: { not: ge.id },
              isApproved: true,
              type: { in: ['TRIBAL_COUNCIL', 'QUIT_MEDEVAC'] },
            },
          })
          const hasOverlap = otherElimination && (
            (otherElimination.type === 'TRIBAL_COUNCIL' &&
              (otherElimination.data as Record<string, unknown>)?.eliminated === tribalData.eliminated) ||
            (otherElimination.type === 'QUIT_MEDEVAC' &&
              (otherElimination.data as Record<string, unknown>)?.contestant === tribalData.eliminated)
          )
          if (!hasOverlap) {
            await tx.contestant.update({
              where: { id: tribalData.eliminated },
              data: { isEliminated: false, eliminatedWeek: null },
            })
          }
        }

        if (ge.type === 'QUIT_MEDEVAC') {
          const quitData = data as QuitMedevacData
          await tx.contestant.update({
            where: { id: quitData.contestant },
            data: { isEliminated: false, eliminatedWeek: null },
          })
        }

        if (ge.type === 'TRIBE_MERGE') {
          const mergeData = data as TribeMergeData

          await tx.tribeMembership.deleteMany({
            where: { gameEventId: ge.id, tribeId: mergeData.mergeTribeId },
          })

          await tx.tribeMembership.updateMany({
            where: { gameEventId: ge.id },
            data: { toWeek: null, gameEventId: null },
          })

          const league = await tx.league.findUnique({ where: { slug: leagueSlug } })
          if (league) {
            await tx.league.update({
              where: { id: league.id },
              data: {
                mergeWeek: null,
                ...(mergeData.juryStartsThisWeek && { juryStartWeek: null }),
              },
            })

            await tx.episode.updateMany({
              where: { leagueId: league.id, phaseSource: 'AUTO' },
              data: { gamePhase: 'PRE_MERGE', phaseSource: 'INFERRED' },
            })
          }
        }

        if (ge.type === 'TRIBE_SWAP') {
          const swapData = data as TribeSwapData

          await tx.tribeMembership.deleteMany({
            where: { gameEventId: ge.id, fromWeek: swapData.swapWeek },
          })

          await tx.tribeMembership.updateMany({
            where: { gameEventId: ge.id },
            data: { toWeek: null, gameEventId: null },
          })

          if (swapData.dissolvedTribeId) {
            await tx.tribe.update({
              where: { id: swapData.dissolvedTribeId },
              data: { dissolvedAtWeek: null, dissolvedByEventId: null },
            })
          }
        }
      }

      return tx.gameEvent.findUnique({
        where: { id: ge.id },
        include: {
          events: { include: { contestant: true } },
          submittedBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
        },
      })
    })

    if (isApproved && gameEvent) {
      const contestants = await db.contestant.findMany({
        where: { id: { in: existingGameEvent.events.map((e) => e.contestantId) } },
        select: { id: true, name: true },
      })
      const contestantNameMap = Object.fromEntries(contestants.map((c) => [c.id, c.name]))

      await notifyGameEventApproved({
        type: existingGameEvent.type,
        week: existingGameEvent.week,
        data: existingGameEvent.data as unknown as GameEventData,
        contestantNames: contestantNameMap,
        approvedBy: user.name,
        eventCount: existingGameEvent.events.length,
      })
    }

    return NextResponse.json(gameEvent)
  } catch (error) {
    console.error('Error updating game event:', error)
    if (error instanceof Error && error.message === 'Forbidden: Moderator access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to update game event' }, { status: 500 })
  }
}

// DELETE /api/[leagueSlug]/game-events/[id]
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await requireModerator()
    const { leagueSlug, id } = await params

    const existingGameEvent = await db.gameEvent.findUnique({ where: { id } })

    if (!existingGameEvent) {
      return NextResponse.json({ error: 'Game event not found' }, { status: 404 })
    }

    await db.$transaction(async (tx) => {
      if (existingGameEvent.isApproved) {
        const data = existingGameEvent.data as unknown as GameEventData

        if (existingGameEvent.type === 'TRIBAL_COUNCIL') {
          const tribalData = normalizeTribalData(data as unknown as Record<string, unknown>)
          if (!tribalData.eliminated) throw new Error('normalized tribal data missing eliminated field')
          await tx.contestant.update({
            where: { id: tribalData.eliminated },
            data: { isEliminated: false, eliminatedWeek: null },
          })
        }

        if (existingGameEvent.type === 'QUIT_MEDEVAC') {
          const quitData = data as QuitMedevacData
          await tx.contestant.update({
            where: { id: quitData.contestant },
            data: { isEliminated: false, eliminatedWeek: null },
          })
        }

        if (existingGameEvent.type === 'TRIBE_MERGE') {
          const mergeData = data as TribeMergeData
          await tx.tribeMembership.deleteMany({
            where: { gameEventId: id, tribeId: mergeData.mergeTribeId },
          })
          await tx.tribeMembership.updateMany({
            where: { gameEventId: id },
            data: { toWeek: null, gameEventId: null },
          })
          const league = await tx.league.findUnique({ where: { slug: leagueSlug } })
          if (league) {
            await tx.league.update({
              where: { id: league.id },
              data: {
                mergeWeek: null,
                ...(mergeData.juryStartsThisWeek && { juryStartWeek: null }),
              },
            })
          }
        }

        if (existingGameEvent.type === 'TRIBE_SWAP') {
          const swapData = data as TribeSwapData
          await tx.tribeMembership.deleteMany({
            where: { gameEventId: id, fromWeek: swapData.swapWeek },
          })
          await tx.tribeMembership.updateMany({
            where: { gameEventId: id },
            data: { toWeek: null, gameEventId: null },
          })
          if (swapData.dissolvedTribeId) {
            await tx.tribe.update({
              where: { id: swapData.dissolvedTribeId },
              data: { dissolvedAtWeek: null, dissolvedByEventId: null },
            })
          }
        }
      }

      await tx.gameEvent.delete({ where: { id } })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting game event:', error)
    if (error instanceof Error && error.message === 'Forbidden: Moderator access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({ error: 'Failed to delete game event' }, { status: 500 })
  }
}
