import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, OAuthProvider, linkWithPopup, signInWithCredential } from 'firebase/auth';

export default function OnboardingConnect() {
  const navigate = useNavigate();
  const [connected, setConnected] = useState({ 
    gmail: false, 
    outlook: false, 
    linkedin: false 
  });

  const connectGmail = async () => {
    if (connected.gmail) return;
    window.open("https://accounts.google.com", "_blank", "width=500,height=600");
    setTimeout(() => {
      setConnected(prev => ({ ...prev, gmail: true }));
      alert("Đã kết nối Gmail thành công (Mô phỏng)!");
    }, 1500);
  };

  const connectOutlook = async () => {
    if (connected.outlook) return;
    try {
      const microsoftProvider = new OAuthProvider('microsoft.com');
      // Add scopes for reading mail
      microsoftProvider.addScope('mail.read');
      microsoftProvider.addScope('calendars.read');
      
      let result;
      try {
        if (auth.currentUser) {
           result = await linkWithPopup(auth.currentUser, microsoftProvider);
        } else {
           result = await signInWithPopup(auth, microsoftProvider);
        }
      } catch (linkError: any) {
        if (linkError.code === 'auth/credential-already-in-use') {
           alert("Tài khoản Outlook này đã được liên kết hoặc đang được sử dụng. Cấp quyền truy cập thành công (nếu đã cấp trước đó).");
           setConnected(prev => ({ ...prev, outlook: true }));
           return;
        } else {
           throw linkError;
        }
      }
      
      const credential = OAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
         localStorage.setItem('outlookAccessToken', credential.accessToken);
      }
      
      setConnected(prev => ({ ...prev, outlook: true }));
      alert("Đã kết nối Outlook thành công!");
    } catch (e: any) {
      console.error(e);
      if (e.code === 'auth/operation-not-allowed' || e.message?.includes('operation-not-allowed')) {
         alert("Lỗi: Phương thức đăng nhập Microsoft chưa được bật. Vào Firebase Console -> Build -> Authentication -> Sign-in method -> Bật Microsoft.");
      } else if (e.code === 'auth/popup-blocked' || e.message?.includes('popup-blocked')) {
         alert("Trình duyệt đã chặn cửa sổ đăng nhập. Vui lòng cho phép popup hiển thị hoặc thử lại.");
      } else if (e.code === 'auth/credential-already-in-use' || e.message?.includes('credential-already-in-use')) {
         setConnected(prev => ({ ...prev, outlook: true }));
      } else if (e.code === 'auth/account-exists-with-different-credential' || e.message?.includes('account-exists-with-different-credential')) {
         alert("Email này đã được đăng ký bằng phương thức khác (VD: Google). Vui lòng đăng nhập bằng Google trước, sau đó vào đây liên kết Outlook.");
      } else {
         alert("Lỗi kết nối Outlook: " + e.message);
      }
    }
  };

  const connectLinkedin = () => {
    // Firebase doesn't have a built-in LinkedIn provider out-of-the-box in the same way,
    // usually requires OpenID connect or custom auth. We mock it for the demo.
    setConnected(prev => ({ ...prev, linkedin: true }));
    alert("Đã thiết lập kết nối LinkedIn (Mock). Để hoạt động thực tế, bạn cần cấu hình OpenID Connect (OIDC) với LinkedIn trong Firebase.");
  };

  return (
    <div className="bg-[#0A0C10] text-on-background min-h-screen flex items-center justify-center p-4 md:p-6 font-sans">
      <main className="w-full max-w-[520px]">
        <div className="bg-[#111318] border border-[#1E2330] rounded-md p-8 shadow-none">
          
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-1">
              <div className="h-1 w-8 bg-[#10B981]"></div>
              <div className="h-1 w-8 bg-[#10B981]"></div>
              <div className="h-1 w-8 bg-[#3B82F6]"></div>
            </div>
            <span className="font-mono text-[13px] text-on-surface-variant">Step 3/3</span>
          </div>
          
          <div className="mb-8">
            <h1 className="font-mono text-2xl font-semibold text-on-surface mb-1 tracking-tight">Kết nối ứng dụng để nhận thông báo thông minh</h1>
            <p className="font-sans text-sm text-on-surface-variant">Tuỳ chọn — có thể kết nối sau trong Settings.</p>
          </div>
          
          <div className="flex flex-col gap-2 mb-8">
            {/* Gmail */}
            <div className="flex items-center justify-between p-2 border border-[#1E2330] rounded-md bg-[#0A0C10] hover:bg-[#111318] transition-colors duration-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center bg-surface-container rounded-md border border-[#1E2330]">
                  <span className="material-symbols-outlined text-on-surface">mail</span>
                </div>
                <div>
                  <p className="font-mono text-[11px] font-semibold text-on-surface uppercase tracking-[0.1em]">Gmail</p>
                  <p className="font-mono text-[11px] text-on-surface-variant">Email &amp; Calendar</p>
                </div>
              </div>
              <button onClick={connectGmail} className="px-3 py-1 border border-[#1E2330] text-on-surface font-mono text-[11px] font-semibold uppercase tracking-[0.1em] hover:bg-surface-bright transition-colors duration-100 rounded-md">
                {connected.gmail ? 'Đã kết nối' : 'Kết nối'}
              </button>
            </div>
            
            {/* Outlook */}
            <div className="flex items-center justify-between p-2 border border-[#1E2330] rounded-md bg-[#0A0C10] hover:bg-[#111318] transition-colors duration-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center bg-surface-container rounded-md border border-[#1E2330]">
                  <span className="material-symbols-outlined text-on-surface">calendar_month</span>
                </div>
                <div>
                  <p className="font-mono text-[11px] font-semibold text-on-surface uppercase tracking-[0.1em]">Outlook</p>
                  <p className="font-mono text-[11px] text-on-surface-variant">Exchange Services</p>
                </div>
              </div>
              <button onClick={connectOutlook} className="px-3 py-1 border border-[#1E2330] text-on-surface font-mono text-[11px] font-semibold uppercase tracking-[0.1em] hover:bg-surface-bright transition-colors duration-100 rounded-md">
                {connected.outlook ? 'Đã kết nối' : 'Kết nối'}
              </button>
            </div>

            {/* LinkedIn */}
            <div className="flex items-center justify-between p-2 border border-[#1E2330] rounded-md bg-[#0A0C10] hover:bg-[#111318] transition-colors duration-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center bg-surface-container rounded-md border border-[#1E2330]">
                  <span className="material-symbols-outlined text-on-surface">work</span>
                </div>
                <div>
                  <p className="font-mono text-[11px] font-semibold text-on-surface uppercase tracking-[0.1em]">LinkedIn</p>
                  <p className="font-mono text-[11px] text-on-surface-variant">Professional Network</p>
                </div>
              </div>
              <button onClick={connectLinkedin} className="px-3 py-1 border border-[#1E2330] text-on-surface font-mono text-[11px] font-semibold uppercase tracking-[0.1em] hover:bg-surface-bright transition-colors duration-100 rounded-md">
                {connected.linkedin ? 'Đã kết nối' : 'Kết nối'}
              </button>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-4">
            <button 
              onClick={() => navigate('/workspace?demo=true')}
              className="w-full py-3 bg-[#10B981] hover:bg-[#059669] text-[#0A0C10] font-mono text-[11px] font-semibold uppercase tracking-[0.1em] transition-colors duration-100 rounded-md flex justify-center items-center gap-2"
            >
              <span>Hoàn thành Setup</span>
              <span className="material-symbols-outlined text-[16px]">check</span>
            </button>
            <button 
              onClick={() => navigate('/workspace')}
              className="font-mono text-[13px] text-on-surface-variant hover:text-on-surface underline transition-colors duration-100"
            >
              Bỏ qua, kết nối sau
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
