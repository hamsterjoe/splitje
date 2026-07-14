export type Sen = number;

export type ParticipantId = string;

export interface EqualAllocation {
  participantId: ParticipantId;
  baseAmountSen: Sen;
  remainderAmountSen: Sen;
  amountSen: Sen;
}

export interface EqualAllocationResult {
  totalSen: Sen;
  participantCount: number;
  allocatedTotalSen: Sen;
  allocations: EqualAllocation[];
  remainderParticipantIds: ParticipantId[];
}