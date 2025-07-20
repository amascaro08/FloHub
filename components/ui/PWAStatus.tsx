import { usePWA } from '@/utils/usePWA';

export default function PWAStatus() {
  const { isStandalone, isOnline } = usePWA();

  if (!isStandalone) return null;

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2">
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm text-gray-600">
          {isOnline ? 'Online' : 'Offline'}
        </span>
        <div className="text-xs text-gray-400">• PWA</div>
      </div>
    </div>
  );
}