import React from "react";
import { RefreshCw, AlertTriangle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("PageErrorBoundary caught:", error, info);
    this.setState({ info });
  }

  handleRefresh = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleRetryReset = () => {
    this.setState({ hasError: false, error: null });
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
              Halaman ini mengalami error. Silakan coba refresh atau hubungi admin.
            </p>
            {this.state.error && (
              <p className="text-xs text-muted-foreground/60 mt-2 font-mono bg-muted px-3 py-1.5 rounded max-w-sm mx-auto break-all">
                {this.state.error.message}
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={this.handleRetryReset} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Coba Lagi
            </Button>
            <Button onClick={this.handleRefresh} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh Halaman
            </Button>
            <Button
              variant="secondary"
              className="gap-2"
              onClick={() => window.open("https://wa.me/6281234567890?text=Halo%20Admin%2C%20saya%20mengalami%20error%20di%20Duta%20Tortoise", "_blank")}
            >
              <MessageCircle className="w-4 h-4" />
              Hubungi Admin
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default PageErrorBoundary;