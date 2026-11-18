'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [username, setUsername] = useState('');
  const router = useRouter();

  const createRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    const roomId = Math.random().toString(36).substring(2, 9);
    localStorage.setItem('watchparty_username', username);
    router.push(`/room/${roomId}`);
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
      <form onSubmit={createRoom} className="bg-gray-800 p-8 rounded-lg shadow-lg w-96 space-y-4">
        <h1 className="text-2xl font-bold text-center">Watch Party</h1>
        <input
          type="text"
          placeholder="Введите ваше имя..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-4 py-2 rounded bg-gray-700 border border-gray-600 focus:outline-none"
          required
        />
        <button
          type="submit"
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded font-semibold transition"
        >
          Создать комнату
        </button>
      </form>
    </div>
  );
}
