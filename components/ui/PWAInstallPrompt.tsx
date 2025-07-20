import { usePWA } from '@/utils/usePWA';

export default function PWAInstallPrompt() {
  const { isInstallable, installApp } = usePWA();

  const handleInstallClick = async () => {
    await installApp();
  };

  const handleDismiss = () => {
    // This will be handled by the hook
  };

  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            Install FloHub
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Add FloHub to your home screen for quick access and offline use.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="mt-3 flex space-x-2">
        <button
          onClick={handleInstallClick}
          className="flex-1 bg-indigo-600 text-white text-sm font-medium py-2 px-3 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="flex-1 bg-gray-100 text-gray-700 text-sm font-medium py-2 px-3 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Not now
        </button>
      </div>
    </div>
  );
}