"use client";

import { useState, useEffect } from "react";
import { Settings, Timer, Volume2, Save, CheckCircle } from "lucide-react";

const SETTINGS_KEY = "bme_settings";

type AppSettings = {
  timerDuration: number;
};

const DEFAULT_SETTINGS: AppSettings = {
  timerDuration: 30,
};

const loadSettings = (): AppSettings => {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return JSON.parse(raw) as AppSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const saveSettings = (settings: AppSettings) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

const SettingsPage = () => {
  const [timerDuration, setTimerDuration] = useState<number>(DEFAULT_SETTINGS.timerDuration);
  const [saved, setSaved] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  useEffect(() => {
    const s = loadSettings();
    setTimerDuration(s.timerDuration);
    setIsInitialized(true);
  }, []);

  const handleSave = () => {
    const duration = Math.max(5, Math.min(300, timerDuration));
    setTimerDuration(duration);
    saveSettings({ timerDuration: duration });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!isInitialized) return null;

  return (
    <div className="w-full h-full flex flex-col pt-4 md:pt-8 pr-2">
      <div className="flex flex-col mb-10 pl-4 md:pl-0">
        <h1 className="text-3xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300 font-sans tracking-tight mb-2">
          Settings
        </h1>
        <p className="text-slate-400 font-light text-base md:text-lg max-w-2xl leading-relaxed mt-2">
          Configure your competition environment and preferences.
        </p>
      </div>

      <div className="max-w-xl px-4 md:px-0 flex flex-col gap-8">
        {/* Timer Duration */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <Timer size={24} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Question Timer</h3>
              <p className="text-sm text-slate-400">Time allowed per question during competition</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <input
              type="number"
              id="timerDuration"
              value={timerDuration}
              onChange={(e) => setTimerDuration(parseInt(e.target.value, 10) || 5)}
              min={5}
              max={300}
              className="w-32 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 text-center text-xl font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
            />
            <span className="text-slate-400 font-medium">seconds</span>
          </div>

          <div className="flex gap-2 mt-4">
            {[15, 30, 45, 60, 90].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setTimerDuration(val)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                  timerDuration === val
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/50"
                    : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600"
                }`}
              >
                {val}s
              </button>
            ))}
          </div>
        </div>

        {/* Sound Info */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Volume2 size={24} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Timer Sound</h3>
              <p className="text-sm text-slate-400">A ticking sound plays during question countdown. It will speed up in the last 5 seconds.</p>
            </div>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          tabIndex={0}
          aria-label="Save settings"
          className="w-full px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg rounded-xl transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 flex items-center justify-center gap-2 shadow-lg"
        >
          {saved ? (
            <>
              <CheckCircle size={22} />
              Saved Successfully!
            </>
          ) : (
            <>
              <Save size={22} />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
