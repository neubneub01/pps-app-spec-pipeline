/**
 * Gates v1.2 — Gate IDs and ownership
 * See pps_v_1.md §5
 */

export const GATE_IDS = [
  "GATE_1_MVP_BOUNDED",
  "GATE_2_TRACEABILITY_FLOW_SCREEN_STATE",
  "GATE_3_TRUST_AND_CLASSIFICATION",
  "GATE_4_CONTRACT_FREEZE_V0",
  "GATE_5_CONTRACT_NO_DEVIATIONS",
  "GATE_6_INTEGRATIONS_HARDENED",
  "GATE_7_STAGING_REHEARSAL_AND_SLO_ALERTS",
] as const;

export type GateId = (typeof GATE_IDS)[number];

export const GATE_OWNERSHIP: Record<GateId, string> = {
  GATE_1_MVP_BOUNDED: "APP/01_mvp-cutter",
  GATE_2_TRACEABILITY_FLOW_SCREEN_STATE: "APP/02_ux-flows",
  GATE_3_TRUST_AND_CLASSIFICATION: "APP/03_architecture",
  GATE_4_CONTRACT_FREEZE_V0: "APP/04_data-api-contract",
  GATE_5_CONTRACT_NO_DEVIATIONS: "APP/05_frontend-plan",
  GATE_6_INTEGRATIONS_HARDENED: "APP/07_integrations-async-security",
  GATE_7_STAGING_REHEARSAL_AND_SLO_ALERTS: "APP/08_release-ops",
};

export const CONTRACT_FREEZE_AUTHORITY = "APP/04_data-api-contract" as const;

export const FE_BE_PROMPTS = ["APP/05_frontend-plan", "APP/06_backend-plan"] as const;

export function getGateOwner(gateId: GateId): string {
  return GATE_OWNERSHIP[gateId];
}

export function isContractFreezeAuthority(promptId: string): boolean {
  return promptId === CONTRACT_FREEZE_AUTHORITY;
}

export function isFEorBE(promptId: string): boolean {
  return (FE_BE_PROMPTS as readonly string[]).includes(promptId);
}
