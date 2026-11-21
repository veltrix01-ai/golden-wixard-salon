import React, { useId } from 'react';
import { ShieldCheck, Check } from 'lucide-react';

interface HumanVerificationProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  isLight?: boolean;
}

export const HumanVerification: React.FC<HumanVerificationProps> = ({
  checked,
  onChange,
  disabled = false,
  isLight = false,
}) => {
  const checkboxId = useId();

  return (
    <div
      className={`p-3.5 rounded-sm border transition-all ${
        checked
          ? isLight
            ? 'bg-[#F9F7F2] border-[#A9823D]'
            : 'bg-[#141414] border-[#C9A45C]/70'
          : isLight
          ? 'bg-[#F9F7F2] border-black/10'
          : 'bg-[#141414] border-[#C6A15B]/30'
      }`}
    >
      <label
        htmlFor={checkboxId}
        className={`flex items-center justify-between gap-3 min-h-[44px] select-none ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-6 h-6 shrink-0">
            <input
              id={checkboxId}
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={(e) => onChange(e.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className={`w-5 h-5 rounded border flex items-center justify-center transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#C9A45C] peer-focus-visible:ring-offset-1 ${
                checked
                  ? 'bg-[#C9A45C] border-[#C9A45C] text-[#0D0D0D]'
                  : isLight
                  ? 'bg-white border-[#D6CEC0] text-transparent'
                  : 'bg-[#111111] border-white/25 text-transparent'
              }`}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </span>
          </div>

          <span
            className={`text-sm font-semibold tracking-wide ${
              isLight ? 'text-[#24211C]' : 'text-[#F5F1E8]'
            }`}
          >
            I'm human
          </span>
        </div>

        <div className="w-8 h-8 rounded-full bg-[#1F1F1F] border border-[#C6A15B]/50 flex items-center justify-center text-[#C6A15B] shrink-0">
          <ShieldCheck className="w-4 h-4 text-[#C6A15B]" />
        </div>
      </label>
    </div>
  );
};
