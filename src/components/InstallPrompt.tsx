import React, { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const isAppStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator &&
        (window.navigator as any).standalone);
    setIsStandalone(isAppStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    if (isIOSDevice && !isAppStandalone) {
      const timer = setTimeout(() => {
        const hasSeenPrompt = localStorage.getItem("hasSeenIOSPrompt");
        if (!hasSeenPrompt) {
          setShowPrompt(true);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleClose = () => {
    setShowPrompt(false);
    if (isIOS) {
      localStorage.setItem("hasSeenIOSPrompt", "true");
    }
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-[#1A1A1A] border border-[#333] shadow-2xl rounded-2xl p-4 flex flex-col gap-3">
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 text-[#888] hover:text-white p-1"
        >
          <X size={18} />
        </button>
        <div className="flex items-center gap-4">
          <div className="bg-[#E5B869] text-black p-3 rounded-xl shrink-0">
            <Download size={24} />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm md:text-base">
              Instalar Aplicativo
            </h3>
            <p className="text-[#888] text-xs md:text-sm mt-0.5">
              Instale o Gestão Pro no seu celular para acesso rápido e versão em
              tela cheia.
            </p>
          </div>
        </div>
        {isIOS ? (
          <div className="mt-2 bg-[#222] p-3 rounded-xl border border-[#333]">
            <p className="text-[#CCC] text-xs text-center">
              No Safari, toque no ícone de{" "}
              <span className="font-bold text-white">Compartilhar</span> <br />e
              selecione{" "}
              <span className="font-bold text-white">
                "Adicionar à Tela de Início"
              </span>
            </p>
          </div>
        ) : (
          <button
            onClick={handleInstallClick}
            className="w-full bg-[#E5B869] hover:bg-[#D4A355] text-black font-bold py-3 rounded-xl transition-colors mt-2"
          >
            Adicionar à Tela Inicial
          </button>
        )}
      </div>
    </div>
  );
}
