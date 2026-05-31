import { Component } from "react";

export default class WidgetErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[WidgetErrorBoundary]", this.props.widgetName, error, info);
  }

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      const msg = err?.message || String(err);
      const stack = err?.stack ? err.stack.split("\n")[1] : "";
      return (
        <div className="rounded-2xl border-2 border-red-400 bg-red-50 p-4">
          <p className="font-bold text-red-700 mb-1">
            ⚠️ Widget {this.props.widgetName || ""} bermasalah
          </p>
          <p className="text-sm text-red-800 font-mono break-all mb-1">{msg}</p>
          {stack && <p className="text-xs text-red-600 font-mono break-all mb-3">{stack.trim()}</p>}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-sm font-semibold text-red-700 border border-red-300 px-4 py-2 rounded-xl hover:bg-red-100"
          >
            Coba Muat Ulang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}