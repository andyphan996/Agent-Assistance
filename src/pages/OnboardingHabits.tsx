import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Slider from '@radix-ui/react-slider';

export default function OnboardingHabits() {
  const navigate = useNavigate();
  const [range, setRange] = useState([20, 23]); // [startHour, endHour]

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const handlePreset = (preset: [number, number]) => {
    setRange(preset);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 font-sans bg-bg-dark text-on-background">
      <div className="w-full max-w-[520px] bg-surface border border-border-hard rounded-lg flex flex-col overflow-hidden shadow-none">
        <div className="p-8 border-b border-border-hard">
          <div className="flex items-center justify-between mb-8">
            <span className="font-mono text-[11px] font-semibold text-outline tracking-[0.1em] uppercase">Step 2 of 3</span>
            <div className="flex gap-2">
              <div className="w-8 h-1 bg-success-green rounded-full"></div>
              <div className="w-8 h-1 bg-electric-blue rounded-full"></div>
              <div className="w-8 h-1 bg-surface-container-highest rounded-full"></div>
            </div>
          </div>
          <h1 className="font-mono text-2xl font-semibold text-on-surface mb-1 tracking-tight">Thói quen làm việc</h1>
          <p className="font-sans text-sm text-on-surface-variant">Bạn thường học sâu/làm việc tập trung khung giờ nào? Kéo thả thanh trượt hoặc chọn mẫu bên dưới.</p>
        </div>

        <div className="p-8 flex flex-col gap-8">
          
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex justify-between items-center mb-1">
              <span className="font-mono text-[9px] font-semibold tracking-[0.15em] text-outline uppercase">Custom Range (Drag to edit)</span>
              <span className="font-mono text-[13px] text-electric-blue bg-electric-blue/10 px-2 py-0.5 rounded border border-electric-blue/30">
                {formatHour(range[0])} — {formatHour(range[1])}
              </span>
            </div>
            
            <div className="w-full my-4">
              <Slider.Root
                className="relative flex w-full items-center select-none touch-none h-5"
                value={range}
                max={24}
                step={1}
                minStepsBetweenThumbs={1}
                onValueChange={setRange}
              >
                <Slider.Track className="relative h-2 grow rounded-full bg-border-hard shrink-0">
                  <Slider.Range className="absolute h-full rounded-full bg-electric-blue" />
                </Slider.Track>
                <Slider.Thumb
                  className="block w-5 h-5 rounded-full bg-on-surface border-2 border-electric-blue shadow-[0_0_0_4px_rgba(59,130,246,0.1)] focus:outline-none focus:ring-2 focus:ring-electric-blue/50 focus:scale-110 transition-transform cursor-ew-resize"
                  aria-label="Start time"
                />
                <Slider.Thumb
                  className="block w-5 h-5 rounded-full bg-on-surface border-2 border-electric-blue shadow-[0_0_0_4px_rgba(59,130,246,0.1)] focus:outline-none focus:ring-2 focus:ring-electric-blue/50 focus:scale-110 transition-transform cursor-ew-resize"
                  aria-label="End time"
                />
              </Slider.Root>
            </div>
            
            <div className="flex justify-between w-full font-mono text-[9px] font-semibold tracking-[0.15em] text-outline uppercase mt-1">
              <span>0h</span>
              <span>6h</span>
              <span>12h</span>
              <span>18h</span>
              <span>24h</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => handlePreset([6, 9])}
              className={`px-3 py-1.5 border rounded transition-colors duration-100 flex items-center gap-2 group ${range[0] === 6 && range[1] === 9 ? 'bg-electric-blue/10 border-electric-blue text-electric-blue' : 'bg-surface-container border-border-hard text-on-surface hover:bg-surface-bright'}`}
            >
              <span className={`material-symbols-outlined text-[16px] ${range[0] === 6 && range[1] === 9 ? 'text-electric-blue' : 'text-outline group-hover:text-primary'}`}>wb_sunny</span>
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em]">Sáng (6–9)</span>
            </button>
            <button 
              onClick={() => handlePreset([14, 17])}
              className={`px-3 py-1.5 border rounded transition-colors duration-100 flex items-center gap-2 group ${range[0] === 14 && range[1] === 17 ? 'bg-electric-blue/10 border-electric-blue text-electric-blue' : 'bg-surface-container border-border-hard text-on-surface hover:bg-surface-bright'}`}
            >
              <span className={`material-symbols-outlined text-[16px] ${range[0] === 14 && range[1] === 17 ? 'text-electric-blue' : 'text-outline group-hover:text-primary'}`}>light_mode</span>
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em]">Chiều (14–17)</span>
            </button>
            <button 
              onClick={() => handlePreset([20, 23])}
              className={`px-3 py-1.5 border rounded transition-colors duration-100 flex items-center gap-2 group ${range[0] === 20 && range[1] === 23 ? 'bg-electric-blue/10 border-electric-blue text-electric-blue' : 'bg-surface-container border-border-hard text-on-surface hover:bg-surface-bright'}`}
            >
              <span className={`material-symbols-outlined text-[16px] ${range[0] === 20 && range[1] === 23 ? 'text-electric-blue' : 'text-outline group-hover:text-primary'}`}>dark_mode</span>
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em]">Tối (20–23)</span>
            </button>
          </div>

        </div>

        <div className="p-8 pt-0">
          <button 
            onClick={() => navigate('/onboarding/3')}
            className="w-full bg-electric-blue hover:bg-blue-400 text-bg-dark font-mono text-[11px] font-semibold tracking-[0.1em] uppercase py-3 rounded transition-colors duration-100 flex items-center justify-center gap-2"
          >
            Tiếp tục
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
