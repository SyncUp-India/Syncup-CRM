'use client';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { LEAD_STAGES, LEAD_STAGE_LABELS } from '@syncup/shared';
import type { LeadStage } from '@syncup/shared';
import { StageBadge } from '@/components/ui/Badge';

interface Props {
  stage: LeadStage;
  onChange: (stage: LeadStage) => void;
  disabled?: boolean;
}

export default function StageDropdown({ stage, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className="flex items-center gap-1.5 disabled:cursor-not-allowed"
      >
        <StageBadge stage={stage} />
        {!disabled && <ChevronDown size={12} className="text-zinc-400" />}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 w-52 card shadow-lg py-1">
          {LEAD_STAGES.map((s) => (
            <button
              key={s}
              onClick={() => { onChange(s); setOpen(false); }}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 flex items-center gap-2 ${s === stage ? 'font-medium' : ''}`}
            >
              <StageBadge stage={s} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
