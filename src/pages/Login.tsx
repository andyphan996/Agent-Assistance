import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem('gmailAccessToken', credential.accessToken);
      }
      onLogin();
      navigate('/onboarding/1');
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/popup-blocked' || e.message?.includes('popup-blocked')) {
        setError("Trình duyệt đã chặn cửa sổ đăng nhập. Vui lòng cho phép popup hiển thị hoặc thử lại.");
      } else {
        setError(e.message);
      }
    }
  };

  return (
    <div className="bg-technical-bg min-h-screen flex items-center justify-center relative overflow-hidden font-sans text-on-surface">
      <div className="absolute inset-0 grid-pattern pointer-events-none"></div>
      
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary-container/5 blur-[120px] rounded-full"></div>
      </div>

      <main className="relative z-10 w-full max-w-[400px] px-4 md:px-0">
        <div className="bg-technical-surface border border-technical-border rounded-[20px] p-[40px] md:p-[48px_40px] shadow-[0_0_40px_rgba(0,0,0,0.5)] transition-all duration-300">
          
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 bg-primary-container/20 border border-primary/30 rounded-lg flex items-center justify-center mb-1">
              <span className="material-symbols-outlined text-primary text-[28px]">smart_toy</span>
            </div>
            <h1 className="font-mono text-2xl font-semibold text-technical-white tracking-tight">
              Agent Assistance
            </h1>
            <p className="font-sans text-technical-text-muted leading-relaxed">
              AI Study Ecosystem — Quản lý học tập thông minh hơn
            </p>
          </div>

          <div className="my-8 border-t border-technical-border"></div>

          <div className="space-y-8">
            {error && <div className="text-red-500 text-sm text-center">{error}</div>}
            <button 
              onClick={handleLogin}
              className="w-full h-[48px] bg-white rounded-full flex items-center justify-center space-x-3 transition-all duration-200 hover-glow group"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
              </svg>
              <span className="text-technical-surface font-semibold font-sans">Continue with Google</span>
            </button>

            <div className="flex flex-col items-center space-y-1">
              <div className="flex items-center space-x-2 text-technical-text-muted">
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                <span className="text-[12px] font-mono font-semibold uppercase tracking-wider">Secure Access</span>
              </div>
              <p className="text-[12px] text-technical-text-muted text-center font-sans">
                Bảo mật với OAuth 2.0 · Không lưu mật khẩu
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-between items-center px-2">
          <span className="text-[10px] font-mono font-semibold text-technical-text-muted opacity-50 uppercase">v2.0.0-STABLE</span>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
            <span className="text-[10px] font-mono font-semibold text-technical-text-muted opacity-50 uppercase tracking-tighter">System Active</span>
          </div>
        </div>
      </main>
    </div>
  );
}
