"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";

const SplashScreen = () => {
  const router = useRouter();
  const [countdown, setCountdown] = useState<number>(10);

  useEffect(() => {
    const redirectTimer = setTimeout(() => {
      router.push("/home");
    }, 10000);

    const intervalTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev > 0) return prev - 1;
        return 0;
      });
    }, 1000);

    return () => {
      clearTimeout(redirectTimer);
      clearInterval(intervalTimer);
    };
  }, [router]);

  const handleSkipClick = () => {
    router.push("/home");
  };

  const handleSkipKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      router.push("/home");
    }
  };

  const progressWidth = ((10 - countdown) / 10) * 100;

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-900 via-slate-900 to-blue-900 flex flex-col items-center justify-center p-4">
      <div className="animate-pulse duration-1000 flex flex-col items-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-30 rounded-full animate-bounce"></div>
          <Trophy size={100} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] relative z-10" />
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-blue-300 to-cyan-300 mb-4 text-center tracking-tight">
          BME Question Champion
        </h1>
        
        <p className="text-xl md:text-2xl text-slate-300 mb-12 text-center max-w-2xl font-light">
          Prepare for the ultimate challenge, setup your teams, and start the competition now!
        </p>

        <div className="flex flex-col items-center gap-4">
          <div className="w-64 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-linear-to-r from-blue-500 to-cyan-400 transition-all duration-1000 ease-linear"
              style={{ width: `${progressWidth}%` }}
            ></div>
          </div>
          <p className="text-sm text-slate-400 font-mono">
            Preparing... {countdown} seconds
          </p>
        </div>

        <button 
          onClick={handleSkipClick}
          onKeyDown={handleSkipKeyDown}
          tabIndex={0}
          aria-label="Skip splash screen"
          className="mt-12 px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm border border-white/20 transition-all font-medium focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
        >
          Skip and Start Now
        </button>
      </div>
    </div>
  );
};

export default SplashScreen;
