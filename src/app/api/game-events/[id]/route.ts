import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModerator } from '@/lib/auth'
import { notifyGameEventApproved } from '@/lib/slack'
import { TribalCouncilData, QuitMedevacData, TribeMergeData, TribeSwapData, GameEventData } from '@/lib/event-derivation'
import { checkChronologicalApproval, checkDownstreamDependencies } from '@/lib/approval-guards'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PATCH /api/game-events/[id] - Approve/reject a game event (moderator only)
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireModerator()
    const { id } = await params
    const body = await req.json()

    const { isApproved } = body

    if (typeof isApproved !== 'boolean') {
      return NextResponse.json({ error: 'isApproved must be a boolean' }, { status: 400 })
    }

    const existingGameEvent = await db.gameEvent.findUnique({
      where: { id },
      include: {
        events: {
          include: { contestant: true },
        },
      },
    })

    if (!existingGameEvent) {
      return NextResponse.json({ error: 'Game event not found' }, { status: 404 })
    }

    // --- Approval guards ---
    if (isApproved) {
      const chronoCheck = await checkChronologicalApproval(existingGameEvent.week)
      if (chronoCheck.blocked) {
        return NextResponse.json({
          error: `Cannot approve: ${chronoCheck.blockingEvents!.length} unapproved event(s) exist in earlier weeks. Approve them first.`,
          blockingEvents: chronoCheck.blockingEvents,
        }, { status: 400 })
      }
    }

    // --- Unapproval guards for structural events ---
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

    // Update GameEvent + all derived events in a transaction
    const gameEvent = await db.$transaction(async (tx) => {
      // Update the game event
      const ge = await tx.gameEvent.update({
        where: { id },
        data: {
          isApproved,
          approvedById: isApproved ? user.id : null,
        },
      })

      // Update all derived events
      await tx.event.updateMany({
        where: { gameEventId: id },
        data: {
          isApproved,
          approvedById: isApproved ? user.id : null,
        },
      })

      const data = ge.data as unknown as GameEventData

      if (isApproved) {
        // --- Approval side effects ---

        // Auto-eliminate contestants from tribal council
        if (ge.type === 'TRIBAL_COUNCIL') {
          const tribalData = data as TribalCouncilData
          await tx.contestant.update({
            where: { id: tribalData.eliminated },
            data: {
              isEliminated: true,
              eliminatedWeek: ge.week,
            },
          })
        }

        // Auto-eliminate from quit/medevac
        if (ge.type === 'QUIT_MEDEVAC') {
          const quitData = data as QuitMedevacData
          await tx.contestant.update({
            where: { id: quitData.contestant },
            data: {
              isEliminated: true,
              eliminatedWeek: ge.week,
            },
          })
        }

        // Tribe merge side effects
        if (ge.type === 'TRIBE_MERGE') {
          const mergeData = data as TribeMergeData

          // Validate merge tribe exists and is marked as merge
          const mergeTribe = await tx.tribe.findUnique({
            where: { id: mergeData.mergeTribeId },
          })
          if (!mergeTribe || !mergeTribe.isMerge) {
            throw new Error('Merge tribe not found or not marked as merge tribe')
          }

          // Close all active tribe memberships
          await tx.tribeMembership.updateMany({
            where: { toWeek: null },
            data: {
              toWeek: mergeData.mergeWeek - 1,
              gameEventId: ge.id,
            },
          })

          // Create new memberships on merge tribe
          for (const contestantId of mergeData.remainingContestants) {
            await tx.tribeMembership.create({
              data: {
                contestantId,
                tribeId: mergeData.mergeTribeId,
                fromWeek: mergeData.mergeWeek,
                gameEventId: ge.id,
              },
            })
          }

          // Set league merge week
          const league = await tx.league.findFirst({ where: { isActive: true } })
          if (league) {
            await tx.league.update({
              where: { id: league.id },
              data: {
                mergeWeek: mergeData.mergeWeek,
                ...(mergeData.juryStartsThisWeek && { juryStartWeek: mergeData.mergeWeek }),
              },
            })

            // Update episode phases (only INFERRED or AUTO, not MANUAL)
            await tx.episode.updateMany({
              where: {
                leagueId: league.id,
                number: { gte: mergeData.mergeWeek },
                phaseSource: { in: ['INFERRED', 'AUTO'] },
              },
              data: {
                gamePhase: 'MERGED',
                phaseSource: 'AUTO',
              },
            })
          }
        }

        // Tribe swap side effects
        if (ge.type === 'TRIBE_SWAP') {
          const swapData = data as TribeSwapData

          // Validate each move
          for (const move of swapData.moves) {
            const activeMembership = await tx.tribeMembership.findFirst({
              where: {
                contestantId: move.contestantId,
                tribeId: move.fromTribeId,
                toWeek: null,
              },
            })
            if (!activeMembership) {
              throw new Error(`Contestant ${move.contestantId} is not currently on tribe ${move.fromTribeId}`)
            }

            // Close old membership
            await tx.tribeMembership.update({
              where: { id: activeMembership.id },
              data: {
                toWeek: swapData.swapWeek - 1,
                gameEventId: ge.id,
              },
            })

            // Create new membership
            await tx.tribeMembership.create({
              data: {
                contestantId: move.contestantId,
                tribeId: move.toTribeId,
                fromWeek: swapData.swapWeek,
                gameEventId: ge.id,
              },
            })
          }

          // Dissolve tribe if specified
          if (swapData.dissolvedTribeId) {
            await tx.tribe.update({
              where: { id: swapData.dissolvedTribeId },
              data: {
                dissolvedAtWeek: swapData.swapWeek,
                dissolvedByEventId: ge.id,
              },
            })
          }
        }
      } else {
        // --- Unapproval side effects ---

        // Reverse elimination from tribal council
        if (ge.type === 'TRIBAL_COUNCIL') {
          const tribalData = data as TribalCouncilData
          await tx.contestant.update({
            where: { id: tribalData.eliminated },
            data: {
              isEliminated: false,
              eliminatedWeek: null,
            },
          })
        }

        // Reverse elimination from quit/medevac
        if (ge.type === 'QUIT_MEDEVAC') {
          const quitData = data as QuitMedevacData
          await tx.contestant.update({
            where: { id: quitData.contestant },
            data: {
              isEliminated: false,
              eliminatedWeek: null,
            },
          })
        }

        // Reverse tribe merge
        if (ge.type === 'TRIBE_MERGE') {
          const mergeData = data as TribeMergeData

          // Delete new memberships on the merge tribe (created by this event)
          await tx.tribeMembership.deleteMany({
            where: { gameEventId: ge.id, tribeId: mergeData.mergeTribeId },
          })

          // Reopen old memberships that were closed by this event
          await tx.tribeMembership.updateMany({
            where: { gameEventId: ge.id },
            data: { toWeek: null, gameEventId: null },
          })

          // Clear league merge/jury week
          const league = await tx.league.findFirst({ where: { isActive: true } })
          if (league) {
            await tx.league.update({
              where: { id: league.id },
              data: {
                mergeWeek: null,
                ...(mergeData.juryStartsThisWeek && { juryStartWeek: null }),
              },
            })

            // Reset episode phases back to INFERRED
            await tx.episode.updateMany({
              where: {
                leagueId: league.id,
                phaseSource: 'AUTO',
              },
              data: {
                gamePhase: 'PRE_MERGE',
                phaseSource: 'INFERRED',
              },
            })
          }
        }

        // Reverse tribe swap
        if (ge.type === 'TRIBE_SWAP') {
          const swapData = data as TribeSwapData

          // Delete memberships created by this event
          await tx.tribeMembership.deleteMany({
            where: { gameEventId: ge.id, fromWeek: { gte: 1 } },
          })

          // Reopen memberships closed by this event
          await tx.tribeMembership.updateMany({
            where: { gameEventId: ge.id },
            data: { toWeek: null, gameEventId: null },
          })

          // Undissolve tribe if applicable
          if (swapData.dissolvedTribeId) {
            await tx.tribe.update({
              where: { id: swapData.dissolvedTribeId },
              data: {
                dissolvedAtWeek: null,
                dissolvedByEventId: null,
              },
            })
          }
        }
      }

      return tx.gameEvent.findUnique({
        where: { id: ge.id },
        include: {
          events: {
            include: { contestant: true },
          },
          submittedBy: {
            select: { id: true, name: true },
          },
          approvedBy: {
            select: { id: true, name: true },
          },
        },
      })
    })

    // Send Slack notification for approved game events
    if (isApproved && gameEvent) {
      const contestants = await db.contestant.findMany({
        where: {
          id: { in: existingGameEvent.events.map((e) => e.contestantId) },
        },
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

// DELETE /api/game-events/[id] - Delete a game event and its derived events (moderator only)
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await requireModerator()
    const { id } = await params

    const existingGameEvent = await db.gameEvent.findUnique({
      where: { id },
    })

    if (!existingGameEvent) {
      return NextResponse.json({ error: 'Game event not found' }, { status: 404 })
    }

    await db.$transaction(async (tx) => {
      // Reverse elimination if this approved event caused one
      if (existingGameEvent.isApproved) {
        const data = existingGameEvent.data as unknown as GameEventData

        if (existingGameEvent.type === 'TRIBAL_COUNCIL') {
          const tribalData = data as TribalCouncilData
          await tx.contestant.update({
            where: { id: tribalData.eliminated },
            data: {
              isEliminated: false,
              eliminatedWeek: null,
            },
          })
        }

        if (existingGameEvent.type === 'QUIT_MEDEVAC') {
          const quitData = data as QuitMedevacData
          await tx.contestant.update({
            where: { id: quitData.contestant },
            data: {
              isEliminated: false,
              eliminatedWeek: null,
            },
          })
        }

        // Reverse merge effects
        if (existingGameEvent.type === 'TRIBE_MERGE') {
          const mergeData = data as TribeMergeData
          // Delete new memberships on the merge tribe
          await tx.tribeMembership.deleteMany({
            where: { gameEventId: id, tribeId: mergeData.mergeTribeId },
          })
          // Reopen old memberships closed by this event
          await tx.tribeMembership.updateMany({
            where: { gameEventId: id },
            data: { toWeek: null, gameEventId: null },
          })
          const league = await tx.league.findFirst({ where: { isActive: true } })
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

        // Reverse swap effects
        if (existingGameEvent.type === 'TRIBE_SWAP') {
          const swapData = data as TribeSwapData
          await tx.tribeMembership.deleteMany({
            where: { gameEventId: id, fromWeek: { gte: 1 } },
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

      // Cascade delete handles derived events (onDelete: Cascade in schema)
      await tx.gameEvent.delete({
        where: { id },
      })
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
