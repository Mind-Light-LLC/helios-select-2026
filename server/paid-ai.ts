export function paidAiEnabled(): boolean {
  return process.env.HELIOS_PAID_AI_ENABLED === 'true';
}

export function voiceEnabled(): boolean {
  return process.env.HELIOS_VOICE_ENABLED === 'true';
}
