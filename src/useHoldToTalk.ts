import { useEffect, useState } from 'react';

function isTextEntry(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && Boolean(target.closest(
    'input, textarea, select, [contenteditable], [role="textbox"]',
  ));
}

type HoldKey = Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'isComposing'>;

export function shouldActivateHold(event: HoldKey, textEntry: boolean): boolean {
  return (event.code === 'AltLeft' || event.code === 'AltRight')
    && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.isComposing && !textEntry;
}

export function useHoldToTalk(): boolean {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    let pressed = false;
    const down = (event: KeyboardEvent) => {
      if (!shouldActivateHold(event, isTextEntry(event.target))) return;
      event.preventDefault();
      if (!pressed) { pressed = true; setHeld(true); }
    };
    const up = (event: KeyboardEvent) => {
      if ((event.code !== 'AltLeft' && event.code !== 'AltRight') || !pressed) return;
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
