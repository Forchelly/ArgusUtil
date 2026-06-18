import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 全局错误边界，防止未捕获的 React 错误导致白屏
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <AlertTriangle size={48} className="text-red-500 mb-4" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
            应用遇到了意外错误
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md">
            {this.state.error?.message ?? "未知错误"}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            重新加载
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
