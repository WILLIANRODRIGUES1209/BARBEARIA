import React, { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';

export default function NotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if notifications are supported and not already granted/denied
    if ('Notification' in window && 'serviceWorker' in navigator) {
      if (Notification.permission === 'default' && !localStorage.getItem('hideNotificationPrompt')) {
        // Show after a slight delay
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 3000);
        return () => clearTimeout(timer);
      } else if (Notification.permission === 'granted') {
        // Keep subscription up to date silently
        subscribeUser();
      }
    }
  }, []);

  const subscribeUser = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get public key from server
      const res = await fetch('/api/vapid-public-key');
      const { publicKey } = await res.json();
      
      const convertedVapidKey = urlBase64ToUint8Array(publicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
      
    } catch (err) {
      console.error('Failed to subscribe:', err);
    }
  };

  const handleEnable = async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await subscribeUser();
      setShowPrompt(false);
    } else {
      setShowPrompt(false);
      localStorage.setItem('hideNotificationPrompt', 'true');
    }
  };

  const handleClose = () => {
    setShowPrompt(false);
    localStorage.setItem('hideNotificationPrompt', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:w-96 md:right-4 z-50 animate-in slide-in-from-top-5 fade-in duration-300">
      <div className="bg-[#1A1A1A] border border-[#333] shadow-2xl rounded-2xl p-4 flex flex-col gap-3">
        <button onClick={handleClose} className="absolute top-2 right-2 text-[#888] hover:text-white p-1">
          <X size={18} />
        </button>
        
        <div className="flex items-center gap-4">
          <div className="bg-[#E5B869] text-black p-3 rounded-xl shrink-0">
            <Bell size={24} />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm md:text-base">Ativar Notificações</h3>
            <p className="text-[#888] text-xs md:text-sm mt-0.5">
              Receba lembretes de agendamentos e avisos importantes.
            </p>
          </div>
        </div>

        <button 
          onClick={handleEnable}
          className="w-full bg-[#E5B869] hover:bg-[#D4A355] text-black font-bold py-2.5 rounded-xl transition-colors mt-2"
        >
          Ativar Agora
        </button>
      </div>
    </div>
  );
}

// Utility to convert Base64 string to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
