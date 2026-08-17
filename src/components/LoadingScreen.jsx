// Skeleton placeholders instead of a bare "Loading…" — shaped roughly like
// the tournament shell (a title, a couple of cards) so the screen doesn't
// visually "pop" once real content arrives.
export default function LoadingScreen({ label = "Loading…" }) {
  return (
    <div className="stack" aria-busy="true" aria-label={label}>
      <div className="skeleton" style={{ height: 24, width: "60%" }} />
      <div className="skeleton" style={{ height: 90, width: "100%" }} />
      <div className="skeleton" style={{ height: 90, width: "100%" }} />
      <div className="skeleton" style={{ height: 90, width: "70%" }} />
    </div>
  );
}
