import { EventType, Role } from '@prisma/client'

export const testContestants = [
  { name: 'Test Contestant 1', tribe: 'Tonga' },
  { name: 'Test Contestant 2', tribe: 'Tonga' },
  { name: 'Test Contestant 3', tribe: 'Fiji' },
  { name: 'Test Contestant 4', tribe: 'Fiji' },
]

export const testEvents = [
  {
    type: 'INDIVIDUAL_IMMUNITY_WIN' as EventType,
    week: 1,
    points: 5,
    isApproved: true,
  },
  {
    type: 'CORRECT_VOTE' as EventType,
    week: 1,
    points: 2,
    isApproved: true,
  },
  {
    type: 'ZERO_VOTES_RECEIVED' as EventType,
    week: 1,
    points: 1,
    isApproved: true,
  },
  {
    type: 'IDOL_FIND' as EventType,
    week: 2,
    points: 3,
    isApproved: false, // Pending approval
  },
]

export const testUsers = [
  {
    email: 'admin@test.com',
    name: 'Test Admin',
    role: Role.ADMIN,
    isPaid: true,
  },
  {
    email: 'moderator@test.com',
    name: 'Test Moderator',
    role: Role.MODERATOR,
    isPaid: true,
  },
  {
    email: 'user1@test.com',
    name: 'Test User 1',
    role: Role.USER,
    isPaid: true,
  },
  {
    email: 'user2@test.com',
    name: 'Test User 2',
    role: Role.USER,
    isPaid: false,
  },
]

export const eventTypePoints: Record<EventType, number> = {
  INDIVIDUAL_IMMUNITY_WIN: 5,
  REWARD_CHALLENGE_WIN: 3,
  TEAM_CHALLENGE_WIN: 1,
  CORRECT_VOTE: 2,
  IDOL_PLAY_SUCCESS: 5,
  IDOL_FIND: 3,
  FIRE_MAKING_WIN: 5,
  ZERO_VOTES_RECEIVED: 1,
  SURVIVED_WITH_VOTES: 2,
  CAUSED_BLINDSIDE: 2,
  MADE_JURY: 5,
  FINALIST: 10,
  WINNER: 20,
  VOTED_OUT_WITH_IDOL: -3,
  QUIT: -10,
}
