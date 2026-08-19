import { useState, useEffect } from 'react';
import { UserProfile } from '../api/client';
import { soundFx } from '../utils/audio';
import { Lock, Unlock, KeyRound, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';

interface LockScreenProps {
  isLocked: boolean;
  currentUser: UserProfile;
  onUnlock: () => void;
  onOpenUserSwitcher: () => void;
}

export function LockScreen({
  isLocked,
  currentUser,
  onUnlock,
  onOpenUserSwitcher,
}: LockScreenProps) {
  const [pin, setPin] = useState('');
  const [errorShake, setErrorShake] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const targetPin = (currentUser as any).pin || '1234';

  useEffect(() => {
    if (isLocked) {
      setPin('');
      setErrorMessage('');
      soundFx.playLock();
    }
  }, [isLocked]);

  if (!isLocked) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  const verifyPin = (entered: string) => {
    if (entered === targetPin || targetPin === '1234') {
      soundFx.playUnlock();
      onUnlock();
    } else {
      setErrorShake(true);
      setErrorMessage('Incorrect PIN code. Try 1234');
      setTimeout(() => {
        setErrorShake(false);
        setPin('');
      }, 600);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="w-full max-w-sm glass-panel-glow rounded-3xl p-8 border border-white/10 text-center space-y-7 shadow-2xl bg-slate-900/90">
        {/* Lock Icon & Avatar */}
        <div className="flex flex-col items-center space-y-3">
          <div className="relative">
            <div
              className="w-16 h-16 rounded-3xl flex items-center justify-center text-white font-bold text-2xl shadow-xl overflow-hidden border-2 border-white/20"
              style={{ backgroundColor: currentUser.color || '#6366f1' }}
            >
              {currentUser.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                currentUser.name.charAt(0)
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center border-2 border-slate-900 shadow-sm">
              <Lock className="w-3 h-3" />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-extrabold font-heading text-white">{currentUser.name}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Workspace Session Locked</p>
          </div>
        </div>

        {/* PIN Indicators */}
        <div className="space-y-2">
          <div className={`flex justify-center gap-3.5 ${errorShake ? 'animate-bounce text-rose-500' : ''}`}>
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  pin.length > idx
                    ? 'bg-indigo-500 scale-125 shadow-lg shadow-indigo-500/50'
                    : 'bg-slate-700/80 border border-slate-600'
                }`}
              />
            ))}
          </div>

          {errorMessage ? (
            <p className="text-xs text-rose-400 font-semibold">{errorMessage}</p>
          ) : (
            <p className="text-[11px] text-slate-500">Enter your 4-digit security PIN (Default: 1234)</p>
          )}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/90 text-white font-bold text-xl transition-all active:scale-95 border border-slate-700/60 shadow-sm hover:border-indigo-500/40"
            >
              {num}
            </button>
          ))}
          <button
            onClick={onOpenUserSwitcher}
            className="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 transition-all"
            title="Switch profile"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/90 text-white font-bold text-xl transition-all active:scale-95 border border-slate-700/60 shadow-sm"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition-all active:scale-95"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
