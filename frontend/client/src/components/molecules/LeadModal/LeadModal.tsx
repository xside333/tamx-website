import React, { useState, useEffect } from 'react';
import { Button, Input } from '../../atoms';
import { cn, formatPrice } from '../../../lib/utils';
import { toast } from '@/hooks/use-toast';

interface LeadModalProps {
  open: boolean;
  onClose: () => void;
  car: {
    id: string;
    name: string;
    price: number;
    link: string; // detail page link
    statusLabel?: string | null;
  };
  title?: string; // заголовок модалки
  pageLabel?: string; // откуда отправлена заявка ("Каталог" | "Детальная" и т.п.)
  btnLabel?: string;  // с какой кнопки
  hideCarInfo?: boolean; // скрыть строку с названием авто и ценой
  className?: string;
  creditDetails?: {
    downPayment: number;
    loanAmount: number;
    termMonths: number;
    monthlyPayment: number;
  };
}

const LeadModal: React.FC<LeadModalProps> = ({ open, onClose, car, title, pageLabel, btnLabel, hideCarInfo, className, creditDetails }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && !phone) {
      setPhone('+7 ');
    }
  }, [open]);

  const isNameValid = name.trim().length > 0;
  const phoneDigits = phone.replace(/\D/g, '');
  const isPhoneValid = phoneDigits.length >= 11; // +7 и 10 цифр

  if (!open) return null;

  const formatPhoneFromDigits = (digits: string) => {
    const d0 = digits.replace(/\D/g, '');
    if (!d0) return '';
    const d = d0[0] === '8' ? '7' + d0.slice(1) : d0[0] === '7' ? d0 : '7' + d0; // normalize to 7
    const p1 = d.slice(1, 4);
    const p2 = d.slice(4, 7);
    const p3 = d.slice(7, 9);
    const p4 = d.slice(9, 11);
    let out = '+7';
    if (p1) out += ` (${p1}` + (p1.length === 3 ? ') ' : '');
    if (p2) out += p1.length === 3 ? `${p2}` : '';
    if (p3) out += p2 ? `-${p3}` : '';
    if (p4) out += p3 ? `-${p4}` : '';
    return out;
  };

  const handlePhoneChange = (v: string) => {
    const only = v.replace(/\D/g, '');
    let normalized = only;
    if (normalized.startsWith('8')) normalized = '7' + normalized.slice(1);
    if (!normalized.startsWith('7')) normalized = '7' + normalized;
    const digits = normalized.slice(1, 11); // keep up to 10 national digits
    const formatted = formatPhoneFromDigits(digits);
    setPhone(formatted || '+7 ');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Basic validation: require name and phone
    if (!isNameValid || !isPhoneValid) {
      toast({ title: 'Заполните обязательные поля', description: 'Укажите имя и корректный номер телефона.', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: name || undefined,
        phone,
        carId: car.id,
        carName: car.name,
        price: car.price,
        status: car.statusLabel || undefined,
        detailUrl: car.link,
        pageUrl: typeof window !== 'undefined' ? window.location.href : car.link,
        page: pageLabel || undefined,
        btn: btnLabel || undefined,
        // Credit details (optional)
        downPayment: creditDetails?.downPayment,
        loanAmount: creditDetails?.loanAmount,
        termMonths: creditDetails?.termMonths,
        monthlyPayment: creditDetails?.monthlyPayment,
      };

      const res = await fetch('https://api.tamx.ru/lead', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Не удалось отправить заявку');
      }

      toast({ title: 'Заявка отправлена', description: 'Наш менеджер скоро свяжется с вами.' });
      onClose();
      setName('');
      setPhone('');
    } catch (err) {
      toast({ title: 'Ошибка отправки', description: 'Попробуйте ещё раз.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[var(--z-modal)]" onClick={(e) => { e.stopPropagation(); }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={(e) => { e.stopPropagation(); onClose(); }} />

      {/* Modal */}
      <div
        className={cn(
          'absolute inset-x-0 top-1/2 -translate-y-1/2 mx-auto',
          'bg-surface border border-muted rounded-xl shadow-lg',
          'w-[min(560px,calc(100vw-32px))] p-4 md:p-6',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h3 className="text-primary text-lg font-bold leading-tight">{title || 'Заявка на покупку авто'}</h3>
          {!hideCarInfo && (
            <p className="text-secondary text-sm mt-1 leading-snug">{car.name} — {formatPrice(car.price)}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="text"
            placeholder="Ваше имя"
            value={name}
            onChange={(v) => setName(v)}
          />
          <Input
            type="tel"
            placeholder="Телефон"
            value={phone}
            onChange={handlePhoneChange}
            onFocus={() => { if (!phone) setPhone('+7 '); }}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              const target = e.currentTarget;
              const caret = target.selectionStart ?? 0;
              const key = e.key;

              const digitPositions: number[] = [];
              for (let i = 0; i < phone.length; i++) {
                if (/\d/.test(phone[i])) digitPositions.push(i);
              }

              const phoneDigits = phone.replace(/\D/g, '');
              const normalized = phoneDigits[0] === '8' ? '7' + phoneDigits.slice(1) : phoneDigits[0] === '7' ? phoneDigits : ('7' + phoneDigits);

              const removeDigitAtIndex = (digitIndex: number) => {
                if (digitIndex <= 0) return; // keep leading 7
                const before = normalized.slice(0, digitIndex);
                const after = normalized.slice(digitIndex + 1);
                const newDigits = before + after;
                const nat = newDigits.slice(1, 11);
                const formatted = formatPhoneFromDigits(nat);
                setPhone(formatted || '+7 ');
              };

              if (key === 'Backspace') {
                if (caret <= 3) { // don't delete +7
                  e.preventDefault();
                  return;
                }
                // find last digit strictly before caret
                let dIdx = -1;
                for (let i = 0; i < digitPositions.length; i++) {
                  if (digitPositions[i] < caret) dIdx = i; else break;
                }
                if (dIdx >= 0) {
                  e.preventDefault();
                  removeDigitAtIndex(dIdx);
                }
              } else if (key === 'Delete') {
                // find first digit at or after caret
                let dIdx = -1;
                for (let i = 0; i < digitPositions.length; i++) {
                  if (digitPositions[i] >= caret) { dIdx = i; break; }
                }
                if (dIdx >= 0) {
                  e.preventDefault();
                  removeDigitAtIndex(dIdx);
                } else if (caret <= 3) {
                  e.preventDefault();
                }
              } else if (!/\d|ArrowLeft|ArrowRight|Tab|Home|End/.test(key)) {
                // allow only digits and navigation keys
                // other characters blocked
                if (![' ', '(', ')', '-', '+'].includes(key)) {
                  // still allow paste etc. via onChange; so don't block default letters?
                }
              }
            }}
            inputMode="tel"

          />


          <div className="flex gap-2 pt-2">
            <Button type="submit" variant="primary" disabled={loading || !isNameValid || !isPhoneValid} className="flex-1 h-[52px]">
              {loading ? 'Отправка…' : 'Отправить'}
            </Button>
            <Button type="button" variant="secondary" onClick={(e) => { e.stopPropagation(); onClose(); }} className="flex-1 h-[52px]">
              Отмена
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeadModal;
