"use client";

import { useState } from 'react';

interface TelegramBotLinkProps {
  userId: string;
  onSuccess?: () => void;
}

export default function TelegramBotLink({ userId, onSuccess }: TelegramBotLinkProps) {
  const [authCode, setAuthCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const generateAuthCode = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/generate-auth-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка генерации кода');
      }

      const data = await response.json();
      setAuthCode(data.auth_code);
      setSuccess(data.message);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(`/start ${authCode}`);
      setSuccess('Команда скопирована в буфер обмена!');
    } catch (error) {
      setError('Не удалось скопировать команду');
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
      <h3 className="text-xl font-semibold text-white mb-4">
        🔗 Привязка Telegram бота
      </h3>
      
      <p className="text-gray-300 mb-4">
        Синхронизируйте чат с ИИ агентом между Mini App и Telegram ботом @spor3z
      </p>

      {!authCode ? (
        <button
          onClick={generateAuthCode}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Генерирую код...' : '🎯 Сгенерировать код привязки'}
        </button>
      ) : (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-2">Отправьте эту команду боту @spor3z:</p>
            <div className="bg-gray-900 rounded p-3 font-mono text-green-400 break-all">
              /start {authCode}
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              📋 Скопировать
            </button>
            <button
              onClick={() => setAuthCode('')}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              🔄 Новый код
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
          <p className="text-green-400 text-sm">{success}</p>
        </div>
      )}

      <div className="mt-4 text-xs text-gray-400">
        <p>💡 После привязки вы сможете:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Общаться с ИИ агентом в Telegram</li>
          <li>Оформлять заказы через бота</li>
          <li>Синхронизировать историю сообщений</li>
          <li>Получать уведомления о заказах</li>
        </ul>
      </div>
    </div>
  );
}