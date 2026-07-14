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

export interface WeightedAllocationInput {
  participantId: ParticipantId;
  weight: number;
}

export interface WeightedAllocation {
  participantId: ParticipantId;
  weight: number;
  baseAmountSen: Sen;
  remainderAmountSen: 0 | 1;
  amountSen: Sen;
}

export interface WeightedAllocationResult {
  totalSen: Sen;
  totalWeight: number;
  allocatedTotalSen: Sen;
  allocations: WeightedAllocation[];
  remainderParticipantIds: ParticipantId[];
}