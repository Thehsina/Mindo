import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-50 p-6 text-center dark:bg-[#121214]">
          <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-[#18181b]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 text-2xl font-black">
              !
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Something went wrong</h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              An unexpected display issue occurred. Don't worry, your data is safe.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-6 w-full rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700 active:scale-95"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
