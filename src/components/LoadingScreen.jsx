export default function LoadingScreen({ label = "Loading…" }) {
  return (
    <div className="center" style={{ minHeight: "60vh" }}>
      <p className="text-soft">{label}</p>
    </div>
  );
}
