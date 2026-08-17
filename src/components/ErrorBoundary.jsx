import React from "react";

// Catches JS errors anywhere below it in the tree and shows a fallback
// message instead of an unhandled error leaving the organizer with a blank
// screen mid-tournament. React error boundaries have to be class
// components — there's no hook equivalent for this.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Match Day crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-main center" style={{ minHeight: "60vh" }}>
          <div className="card stack" style={{ maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontSize: 20, margin: 0 }}>Something went wrong</h1>
            <p className="text-soft" style={{ margin: 0 }}>
              Match Day hit an unexpected error. Anything already saved is safe in Firestore — reloading should get
              you back to normal.
            </p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
