import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TIMEZONES = [
  { value: 'Pacific/Midway', label: '(GMT-11:00) Midway Island, Samoa' },
  { value: 'America/Los_Angeles', label: '(GMT-08:00) Pacific Time (US & Canada)' },
  { value: 'America/New_York', label: '(GMT-05:00) Eastern Time (US & Canada)' },
  { value: 'Europe/London', label: '(GMT+00:00) London, Dublin, Lisbon' },
  { value: 'Asia/Ho_Chi_Minh', label: '(GMT+07:00) Ho Chi Minh City, Bangkok, Hanoi' },
  { value: 'Asia/Tokyo', label: '(GMT+09:00) Tokyo, Seoul, Osaka' },
  { value: 'Australia/Sydney', label: '(GMT+10:00) Sydney, Melbourne, Brisbane' },
];

export default function OnboardingTimezone() {
  const navigate = useNavigate();
  const [selectedTz, setSelectedTz] = useState('Asia/Ho_Chi_Minh');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    // Auto-detect timezone on mount
    try {
      const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (TIMEZONES.some(tz => tz.value === userTz)) {
        setSelectedTz(userTz);
      }
    } catch (e) {
      console.error("Could not detect timezone", e);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      try {
        const timeString = new Date().toLocaleTimeString('vi-VN', { timeZone: selectedTz, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setCurrentTime(timeString);
      } catch (e) {
        setCurrentTime('--:--:--');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedTz]);

  return (
    <div className="bg-surface-container-lowest text-on-surface min-h-screen flex items-center justify-center p-4 md:p-6 antialiased">
      <main className="w-full max-w-[520px]">
        <div className="bg-surface border border-outline-variant rounded-md shadow-none flex flex-col">
          <div className="p-8 border-b border-outline-variant flex flex-col gap-4">
            <div className="flex flex-col gap-1 w-full mb-2">
              <div className="flex justify-between items-center w-full">
                <span className="font-mono text-[9px] font-semibold tracking-[0.15em] text-on-surface-variant uppercase">Step 1 of 3</span>
                <span className="font-mono text-[9px] font-semibold tracking-[0.15em] text-primary uppercase">Timezone</span>
              </div>
              <div className="w-full h-1 bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full bg-primary w-1/3"></div>
              </div>
            </div>
            
            <div className="flex flex-col gap-1">
              <h1 className="font-mono text-2xl font-semibold text-on-surface m-0 tracking-tight">
                Bạn đang ở múi giờ nào?
              </h1>
              <p className="font-sans text-sm text-on-surface-variant m-0">
                Chúng tôi dùng thông tin này để tạo lịch chính xác theo giờ địa phương.
              </p>
            </div>
          </div>
          
          <div className="p-8 flex flex-col gap-8">
            <div className="flex gap-4 items-center">
               <div className="flex-1 flex flex-col gap-1">
                 <label htmlFor="timezone" className="font-mono text-[9px] font-semibold tracking-[0.15em] text-on-surface-variant uppercase">
                   Timezone Selection
                 </label>
                 <div className="relative">
                   <select 
                     id="timezone" 
                     value={selectedTz}
                     onChange={e => setSelectedTz(e.target.value)}
                     className="w-full bg-background border border-outline-variant text-on-surface font-sans text-sm rounded-md px-4 py-[10px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors duration-75 appearance-none"
                   >
                     {TIMEZONES.map(tz => (
                       <option key={tz.value} value={tz.value}>{tz.label}</option>
                     ))}
                   </select>
                   <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-on-surface-variant">
                     <span className="material-symbols-outlined text-[16px]">expand_more</span>
                   </div>
                 </div>
               </div>

               <div className="flex flex-col gap-1 min-w-[100px] text-right items-end">
                  <span className="font-mono text-[9px] font-semibold tracking-[0.15em] text-on-surface-variant uppercase">Local Time</span>
                  <div className="bg-surface-container border border-outline-variant text-on-surface font-mono text-sm font-semibold rounded-md px-3 py-[10px] flex items-center justify-center">
                    {currentTime || '--:--:--'}
                  </div>
               </div>
            </div>
            
            <button 
              onClick={() => navigate('/onboarding/2')}
              type="button" 
              className="w-full bg-primary text-on-primary font-mono text-[11px] font-semibold uppercase tracking-[0.1em] border border-primary rounded-md py-4 px-4 flex items-center justify-center gap-2 hover:bg-surface-tint hover:border-surface-tint transition-colors duration-75 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface"
            >
              <span>Tiếp tục</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
