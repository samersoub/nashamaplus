import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="glass-card p-8 rounded-[2.5rem] max-w-md w-full text-center space-y-6">
            <div className="bg-red-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-900">حدث خطأ ما</h2>
              <p className="text-slate-600 text-sm">
                واجهنا خطأ غير متوقع. يرجى محاولة تحديث الصفحة.
              </p>
            </div>
            {this.state.error && (
              <div className="bg-slate-100 p-4 rounded-xl text-left overflow-auto max-h-32">
                <code className="text-[10px] text-slate-500">{this.state.error.message}</code>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full btn-primary flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              تحديث الصفحة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

