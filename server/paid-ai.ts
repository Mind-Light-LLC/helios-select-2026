export function paidAiEnabled(): boolean {
  return process.env.HELIOS_PAID_AI_ENABLED === 'true';
}
