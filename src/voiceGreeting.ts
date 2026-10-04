export function sendOpeningGreeting(channel: { send: (data: string) => void }, mode: 'continuous' | 'hold'): 'sent' | 'skipped' | 'failed' {
  if (mode === 'hold') return 'skipped';
  try {
    channel.send(JSON.stringify({
      type: 'response.create',
      response: {
        input: [],
        output_modalities: ['audio'],
        tool_choice: 'none',
        instructions: 'You are HeliOS. Give one short, warm spoken greeting, then ask what place or cause the person wants to help. Do not name an opportunity or imply that a spot is open.',
      },
    }));
    return 'sent';
  } catch {
    return 'failed';
  }
}
