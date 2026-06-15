import React from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("PageErrorBoundary caught:", error, info);
  }

  handleRefresh = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Terjadi Kesalahan</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Halaman ini mengalami error. Silakan coba refresh.
            </p>
            {this.state.error && (
              <p className="text-xs text-muted-foreground/60 mt-2 font-mono bg-muted px-3 py-1.5 rounded max-w-sm mx-auto break-all">
                {this.state.error.message}
              </p>
            )}
          </div>
          <Button onClick={this.handleRefresh} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh Halaman
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default PageErrorBoundary;