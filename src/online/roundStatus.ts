import type { Phase } from '../../shared/online';

export function roundStatus(phase: Phase, calls: number, reason?: string, winner?: string | null) {
  if (winner) return { title: `${winner} won!`, detail: 'Full house verified', tone: 'green' as const };
  if (phase === 'lobby') return { title: 'Not started', detail: 'Waiting for the captain to start this round.', tone: 'gold' as const };
  if (phase === 'live') return { title: 'Round in progress', detail: 'No winner yet.', tone: 'purple' as const };
  if (phase !== 'finished') return { title: 'Checking full house', detail: 'The result has not been decided yet.', tone: 'purple' as const };
  if (reason === 'not_enough_ready_players') return { title: 'Round cancelled', detail: 'Not enough players were ready. Entry coins returned.', tone: 'gold' as const };
  if (reason === 'host_ended') return { title: calls ? 'Ended by captain' : 'Cancelled by captain', detail: calls ? 'No winner. Entry coins returned.' : 'The round was not played. Entry coins returned.', tone: 'gold' as const };
  if (reason === 'verification_error') return { title: 'Round interrupted', detail: 'Verification could not finish. Entry coins returned.', tone: 'gold' as const };
  if (reason === 'numbers_exhausted') return { title: 'No winner', detail: 'All 90 numbers were called. No full house was verified.', tone: 'purple' as const };
  return { title: calls ? 'Round ended' : 'Round not played', detail: 'No winner was recorded.', tone: 'purple' as const };
}
