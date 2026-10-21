export const ASSESSMENT_MINIMUM_DURATION_MS = 6000;

export function assessmentLoaderStage(elapsedMs: number) {
  return Math.min(2, Math.max(0, Math.floor(Math.max(0, elapsedMs) / 2000)));
}

export function canFinishAssessmentLoading(elapsedMs: number, ready: boolean, minimumDurationMs = ASSESSMENT_MINIMUM_DURATION_MS) {
  return ready && elapsedMs >= minimumDurationMs;
}
