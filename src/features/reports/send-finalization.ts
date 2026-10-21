export type ReportDeliveryResult =
  | {ok: true; providerMessageId: string}
  | {ok: false; uncertain: boolean; failureCode: string};

export class ReportSettlementError extends Error {
  readonly code: "PROVIDER_REJECTED" | "EMAIL_NOT_CONFIGURED" | "SEND_UNCERTAIN" | "ACCEPTANCE_UNRECORDED";
  constructor(code: ReportSettlementError["code"]) {
    super(code);
    this.code = code;
  }
}

/** A missing response is never treated as a definite rejection or a reason to retry. */
export async function settleReportSend<T>(delivery: ReportDeliveryResult, actions: {
  recordAccepted: (providerMessageId: string) => Promise<T>;
  recordRejected: (failureCode: string) => Promise<void>;
  recordUncertain: (failureCode: string) => Promise<void>;
  onPersistenceError: (stage: "accepted" | "rejected" | "uncertain", error: unknown) => void;
}): Promise<T> {
  if (delivery.ok) {
    try { return await actions.recordAccepted(delivery.providerMessageId); }
    catch (error) {
      actions.onPersistenceError("accepted", error);
      throw new ReportSettlementError("ACCEPTANCE_UNRECORDED");
    }
  }
  if (delivery.uncertain) {
    try { await actions.recordUncertain(delivery.failureCode); }
    catch (error) { actions.onPersistenceError("uncertain", error); }
    throw new ReportSettlementError("SEND_UNCERTAIN");
  }
  try { await actions.recordRejected(delivery.failureCode); }
  catch (error) {
    actions.onPersistenceError("rejected", error);
    throw new ReportSettlementError("SEND_UNCERTAIN");
  }
  throw new ReportSettlementError(delivery.failureCode === "EMAIL_NOT_CONFIGURED" ? "EMAIL_NOT_CONFIGURED" : "PROVIDER_REJECTED");
}
