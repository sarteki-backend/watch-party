'use client';

import React, { useEffect, useRef, useState } from 'react';
import ReactPlayer from 'react-player';
import { io, Socket } from 'socket.io-client';

interface User {
  id: string;
  username: string;
}

interface Message {
  id: string;
  username: string;
  text: string;
  time: string;
}

export default function WatchRoom({ roomId, username }: { roomId: string; username: string }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [inputUrl, setInputUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const playerRef = useRef<ReactPlayer>(null);
  const isRemoteUpdate = useRef<boolean>(false);

  useEffect(() => {
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.emit('join_room', { roomId, username });

    newSocket.on('sync_state', (state) => {
      isRemoteUpdate.current = true;
      setVideoUrl(state.videoUrl);
      setIsPlaying(state.isPlaying);
      setTimeout(() => {
        playerRef.current?.seekTo(state.timestamp, 'seconds');
        isRemoteUpdate.current = false;
      }, 500);
    });

    newSocket.on('player_sync', ({ action, timestamp, videoUrl: newUrl }) => {
      isRemoteUpdate.current = true;

      if (action === 'PLAY') {
        setIsPlaying(true);
        const currentTime = playerRef.current?.getCurrentTime() || 0;
        if (Math.abs(currentTime - timestamp) > 1.5) {
          playerRef.current?.seekTo(timestamp, 'seconds');
        }
      } else if (action === 'PAUSE') {
        setIsPlaying(false);
        playerRef.current?.seekTo(timestamp, 'seconds');
      } else if (action === 'SEEK') {
        playerRef.current?.seekTo(timestamp, 'seconds');
      } else if (action === 'CHANGE_URL') {
        setVideoUrl(newUrl);
        setIsPlaying(false);
      }

      setTimeout(() => {
        isRemoteUpdate.current = false;
      }, 300);
    });

    newSocket.on('users_update', (updatedUsers: User[]) => {
      setUsers(updatedUsers);
    });

    newSocket.on('receive_message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomId, username]);

  const handlePlay = () => {
    if (isRemoteUpdate.current) return;
    setIsPlaying(true);
    const currentTime = playerRef.current?.getCurrentTime() || 0;
    socket?.emit('player_action', { roomId, action: 'PLAY', timestamp: currentTime });
  };

  const handlePause = () => {
    if (isRemoteUpdate.current) return;
    setIsPlaying(false);
    const currentTime = playerRef.current?.getCurrentTime() || 0;
    socket?.emit('player_action', { roomId, action: 'PAUSE', timestamp: currentTime });
  };

  const handleSeek = (seconds: number) => {
    if (isRemoteUpdate.current) return;
    socket?.emit('player_action', { roomId, action: 'SEEK', timestamp: seconds });
  };

  const handleUrlChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    setVideoUrl(inputUrl);
    setIsPlaying(false);
    socket?.emit('player_action', { roomId, action: 'CHANGE_URL', videoUrl: inputUrl });
    setInputUrl('');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket?.emit('send_message', { roomId, username, text: chatInput });
    setChatInput('');
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-900 text-white">
      <div className="flex-1 flex flex-col p-4">
        <form onSubmit={handleUrlChange} className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Вставьте ссылку на YouTube или MP4..."
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="flex-1 px-4 py-2 rounded bg-gray-800 border border-gray-700 focus:outline-none"
          />
          <button type="submit" className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500">
            Загрузить
          </button>
        </form>

        <div className="relative flex-1 bg-black rounded-lg overflow-hidden">
          {videoUrl && (
            <ReactPlayer
              ref={playerRef}
              url={videoUrl}
              playing={isPlaying}
              controls
              width="100%"
              height="100%"
              onPlay={handlePlay}
              onPause={handlePause}
              onSeek={handleSeek}
            />
          )}
        </div>
      </div>

      <div className="w-full lg:w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={copyInviteLink}
            className="w-full mb-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded text-xs font-semibold transition"
          >
            {copied ? 'Ссылка скопирована!' : 'Скопировать ссылку-приглашение'}
          </button>

          <h3 className="font-bold text-sm text-gray-400 uppercase mb-2">
            В комнате ({users.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {users.map((u) => (
              <span key={u.id} className="px-2 py-1 text-xs bg-gray-700 rounded-full">
                {u.username}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {messages.map((m) => (
            <div key={m.id} className="bg-gray-700/50 p-2 rounded">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span className="font-semibold text-blue-400">{m.username}</span>
                <span>{m.time}</span>
              </div>
              <p className="text-sm break-words">{m.text}</p>
            </div>
          ))}
        </div>

        <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-700 flex gap-2">
          <input
            type="text"
            placeholder="Написать в чат..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded bg-gray-900 border border-gray-700 focus:outline-none"
          />
          <button type="submit" className="px-3 py-2 bg-blue-600 rounded text-sm hover:bg-blue-500">
            Отпр
          </button>
        </form>
      </div>
    </div>
  );
}
