import type {
    EqualAllocationResult,
    ParticipantId,
    Sen,
  } from "../types";
  
  export function allocateEqual(
    _totalSen: Sen,
    _participantIds: ParticipantId[],
  ): EqualAllocationResult {
    throw new Error("Not implemented");
  }