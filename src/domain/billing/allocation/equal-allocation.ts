import type {
  EqualAllocationResult,
  ParticipantId,
  Sen,
} from "../types";
import { allocateByWeight } from "./weighted-allocation";

export function allocateEqual(
  totalSen: Sen,
  participantIds: ParticipantId[],
): EqualAllocationResult {
  const weightedResult = allocateByWeight(
    totalSen,
    participantIds.map((participantId) => ({
      participantId,
      weight: 1,
    })),
  );

  return {
    totalSen: weightedResult.totalSen,
    participantCount: weightedResult.allocations.length,
    allocatedTotalSen: weightedResult.allocatedTotalSen,
    allocations: weightedResult.allocations.map(
      ({
        participantId,
        baseAmountSen,
        remainderAmountSen,
        amountSen,
      }) => ({
        participantId,
        baseAmountSen,
        remainderAmountSen,
        amountSen,
      }),
    ),
    remainderParticipantIds:
      weightedResult.remainderParticipantIds,
  };
}