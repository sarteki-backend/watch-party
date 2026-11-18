'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import WatchRoom from '@/components/WatchRoom';

export default function RoomPage() {
  const params = useParams();
  const roomId = params?.id as string;

  const [username, setUsername] = useState<string>('');
  const [inputName, setInputName] = useState<string>('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('watchparty_username');
    if (savedName) {
      setUsername(savedName);
      setIsReady(true);
    }
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim()) return;
    localStorage.setItem('watchparty_username', inputName);
    setUsername(inputName);
    setIsReady(true);
  };

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <form onSubmit={handleJoin} className="bg-gray-800 p-8 rounded-lg w-96 space-y-4">
          <h2 className="text-xl font-bold text-center">Вход в комнату</h2>
          <input
            type="text"
            placeholder="Ваше имя для чата..."
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            className="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 focus:outline-none"
            required
          />
          <button type="submit" className="w-full py-2 bg-blue-600 rounded hover:bg-blue-500">
            Присоединиться
          </button>
        </form>
      </div>
    );
  }

  return <WatchRoom roomId={roomId} username={username} />;
}
