import { Component, type ReactNode } from "react";

interface State {
  error: Error | null;
}

/** Keeps the app usable if a view crashes: shows the error and lets the user go back. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card danger" style={{ margin: 24 }}>
          <h2>Something went wrong / Si è verificato un errore</h2>
          <p className="muted mt-8">{this.state.error.message}</p>
          <p className="small faint mt-8">Your game is saved automatically. Try another page or reload the app. / La partita è salvata automaticamente. Prova un'altra pagina o ricarica l'app.</p>
          <button className="btn mt-16" onClick={() => this.setState({ error: null })}>
            Retry / Riprova
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
