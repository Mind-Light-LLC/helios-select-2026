type Props = { onClose: () => void; onTalk: () => void };

export function GuidePanel({ onClose, onTalk }: Props) {
  return <aside className="guide-window" aria-labelledby="guide-title">
    <div className="guide-head"><span>START HERE</span><button type="button" onClick={onClose} aria-label="Close guide">×</button></div>
    <h2 id="guide-title">How HeliOS works</h2>
    <p className="guide-intro">Tell HeliOS a cause, place, free day, or budget. For example: “I’m free Sunday in San Francisco.”</p>
    <ol className="guide-steps">
      <li><strong>Find ways to help</strong><span>Browse organizations, check their sources and schedules, then open an official next step.</span></li>
      <li><strong>Explore needs</strong><span>See sourced requests and check whether a contribution might fit.</span></li>
      <li><strong>Connect an agent</strong><span>Give another agent read-only access to the same published records.</span></li>
      <li><strong>My actions</strong><span>Revisit saved paths. You can explore before creating an account.</span></li>
    </ol>
    <p className="guide-boundary">Organizations confirm signups, gifts, and deliveries. HeliOS does not complete them for you.</p>
    <button className="guide-talk" type="button" onClick={onTalk}>Talk to HeliOS <span aria-hidden="true">↗</span></button>
  </aside>;
}
