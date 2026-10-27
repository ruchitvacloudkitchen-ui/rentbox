import React, { useEffect, useRef, useState } from 'react';
import { Banknote, Gift, Sparkles } from 'lucide-react';

export interface ScratchCardData {
  id: string;
  userId: string;
  uploadId: string;
  rewardType: 'cash' | 'coupon';
  rewardLabel: string;
  rewardCode: string;
  isScratched: boolean;
}

interface ScratchCardItemProps {
  card: ScratchCardData;
  onScratch: (cardId: string) => Promise<void>;
}

export const ScratchCardItem: React.FC<ScratchCardItemProps> = ({ card, onScratch }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [revealing, setRevealing] = useState(false);

  useEffect(() => {
    if (card.isScratched) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#417545';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#6DA34D';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2 - 14, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 14px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCRATCH OR TAP TO REVEAL', canvas.width / 2, canvas.height / 2 + 36);
    ctx.fillStyle = '#EAF4E7';
    ctx.font = '500 11px "JetBrains Mono", monospace';
    ctx.fillText('100 HERO POINTS REWARD', canvas.width / 2, canvas.height / 2 + 56);
  }, [card.isScratched]);

  const triggerReveal = async () => {
    if (card.isScratched || revealing) return;
    setRevealing(true);
    try {
      await onScratch(card.id);
    } finally {
      setRevealing(false);
    }
  };

  const handleScratchMove = (clientX: number, clientY: number) => {
    if (card.isScratched || !isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 26, 0, Math.PI * 2);
    ctx.fill();
  };

  return (
    <div className="relative rounded-3xl border border-[#DCEAD7] bg-white p-6 flex flex-col justify-between min-h-[210px] overflow-hidden">
      <div className="flex flex-col items-center text-center my-auto py-2">
        <div className="w-12 h-12 rounded-2xl bg-[#EAF4E7] text-[#417545] flex items-center justify-center mb-3">
          {card.rewardType === 'cash' ? (
            <Banknote className="w-6 h-6" />
          ) : (
            <Gift className="w-6 h-6" />
          )}
        </div>
        <p className="text-xs font-medium text-[#5C6B5E]">
          {card.rewardType === 'cash' ? 'Cash Reward' : 'Offer Coupon'}
        </p>
        <h4 className="text-xl font-bold text-[#141A15] mt-1">{card.rewardLabel}</h4>
        <p className="text-xs font-mono tabular-nums text-[#417545] mt-2 select-all">
          Code: {card.rewardCode}
        </p>
      </div>

      {!card.isScratched && (
        <div className="absolute inset-0 z-10 flex flex-col">
          <canvas
            ref={canvasRef}
            width={320}
            height={210}
            onMouseDown={() => setIsDrawing(true)}
            onMouseUp={() => {
              setIsDrawing(false);
              triggerReveal();
            }}
            onMouseMove={(e) => handleScratchMove(e.clientX, e.clientY)}
            onTouchStart={() => setIsDrawing(true)}
            onTouchEnd={() => {
              setIsDrawing(false);
              triggerReveal();
            }}
            onTouchMove={(e) => {
              const touch = e.touches[0];
              if (touch) handleScratchMove(touch.clientX, touch.clientY);
            }}
            onClick={triggerReveal}
            className="w-full h-full cursor-pointer touch-none"
          />
          <button
            type="button"
            onClick={triggerReveal}
            disabled={revealing}
            className="absolute bottom-3 right-3 px-3.5 py-1.5 rounded-full bg-white text-[#417545] text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{revealing ? 'Revealing...' : 'Scratch Now'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
