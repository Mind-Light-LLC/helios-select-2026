import { useEffect, useState } from 'react';

function isInteractive(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest(
    'input, textarea, select, button, a, summary, [contenteditable], [role="textbox"], [role="button"]',
  ));
}

export function useHoldToTalk(): boolean {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    let pressed = false;
    const down = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || event.altKey || event.ctrlKey || event.metaKey || isInteractive(event.target)) return;
      event.preventDefault();
      if (!pressed) { pressed = true; setHeld(true); }
    };
    const up = (event: KeyboardEvent) => {
      if (event.code !== 'Space' || !pressed) return;
      event.preventDefault();
      pressed = false;
      setHeld(false);
    };
    const blur = () => { pressed = false; setHeld(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);
  return held;
}
