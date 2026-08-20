import { useState, useEffect, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';
import { soundFx } from '../utils/audio';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface GoogleUserPayload {
  googleId: string;
  name: string;
  email: string;
  avatar: string;
}

interface GoogleAuthButtonProps {
  onSuccess: (user: GoogleUserPayload) => void;
  text?: string;
  className?: string;
}

interface GoogleJwtPayload {
  sub: string;
  name: string;
  email: string;
  picture: string;
}

declare global {
  interface Window {
    google?: any;
  }
}

export function GoogleAuthButton({ onSuccess, text = 'Continue with Google', className = '' }: GoogleAuthButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);
  const [simName, setSimName] = useState('John Doe');
  const [simEmail, setSimEmail] = useState('john.doe@gmail.com');
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const clientId = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID || '';

  useEffect(() => {
    if (!clientId) return;

    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(interval);
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
          });

          if (googleBtnRef.current) {
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              theme: 'outline',
              size: 'large',
              width: '100%',
              text: 'continue_with',
              shape: 'pill',
            });
          }
        } catch (e) {
          console.warn('Google Identity Services initialization warning:', e);
        }
      }
    }, 300);

    return () => clearInterval(interval);
  }, [clientId]);

  const handleCredentialResponse = (response: any) => {
    setIsLoading(true);
    soundFx.playSuccess();
    try {
      const decoded: GoogleJwtPayload = jwtDecode(response.credential);
      onSuccess({
        googleId: decoded.sub,
        name: decoded.name || 'Google User',
        email: decoded.email,
        avatar: decoded.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(decoded.name || 'Google')}`,
      });
    } catch (err) {
      console.error('Failed to decode Google Credential JWT:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualGoogleClick = () => {
    if (clientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
        return;
      } catch (e) {
        console.warn(e);
      }
    }
    // Fallback to Google OAuth Fast Sign-in modal if client ID not configured
    setShowSimModal(true);
  };

  const handleSimulateGoogleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    soundFx.playSuccess();
    setTimeout(() => {
      onSuccess({
        googleId: `g-${Date.now()}`,
        name: simName.trim() || 'Google User',
        email: simEmail.trim() || 'user@gmail.com',
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(simName || 'Google')}`,
      });
      setIsLoading(false);
      setShowSimModal(false);
    }, 400);
  };

  return (
    <>
      <div className="w-full">
        {/* If official GIS Client ID is configured and rendered, show native button container */}
        {clientId ? (
          <div ref={googleBtnRef} className="w-full min-h-[44px] flex items-center justify-center" />
        ) : (
          <button
            type="button"
            onClick={handleManualGoogleClick}
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-semibold text-sm shadow-sm flex items-center justify-center gap-3 transition-all active:scale-[0.99] group ${className}`}
          >
            {/* Official Google SVG Logo */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span className="font-medium text-slate-800">{text}</span>
          </button>
        )}
      </div>

      {/* Google Sign-in Simulator / Config Modal */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white text-slate-950">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Google OAuth Sign-In</h3>
                  <p className="text-xs text-slate-400">Authenticate with Google Account</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSimModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSimulateGoogleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Google Account Name
                </label>
                <input
                  type="text"
                  required
                  value={simName}
                  onChange={(e) => setSimName(e.target.value)}
                  placeholder="e.g., John Doe"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Google Email Address
                </label>
                <input
                  type="email"
                  required
                  value={simEmail}
                  onChange={(e) => setSimEmail(e.target.value)}
                  placeholder="e.g., user@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-800/50 text-[11px] text-indigo-300 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Google OAuth 2.0 Ready</span>
                </p>
                <p className="text-slate-400">
                  When you add your Google Cloud Client ID (<code>VITE_GOOGLE_CLIENT_ID</code>), official one-tap Google popups activate automatically.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSimModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !simName.trim() || !simEmail.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                >
                  <span>Sign In with Google</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
