import React from 'react';
import Button from '../../atoms/Button/Button';
import { Icon } from '../../atoms';
import { cn } from '../../../lib/utils';

export interface TradeInButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  fullWidth?: boolean;
}

const TradeInButton = React.forwardRef<HTMLButtonElement, TradeInButtonProps>(({
  label = 'Трейд-ин',
  fullWidth = false,
  className,
  ...props
}, ref) => {
  return (
    <Button
      ref={ref}
      variant="secondary"
      className={cn(
        'group tradein-button relative overflow-hidden px-4 lg:px-5 py-3 lg:py-4 text-sm lg:text-base',
        fullWidth ? 'w-full !flex' : 'w-auto',
        'h-[50px] lg:h-[56px] lg:flex-none lg:w-[160px]'
      , className)}
      {...props}
    >
      <span className="absolute left-0 top-0 bottom-0 flex items-center">
        <div className="relative w-[84px] lg:w-[130px] h-full">
          <span className="absolute left-[38px] top-1 tradein-arrow transition-very-slow group-hover:-rotate-180 tradein-arrow-rotate z-0">
            <Icon name="trade-in-arrow" className="w-[26px] h-[26px]" />
          </span>
          <img src="/trade-in-car.webp" alt="Trade-in car" className="absolute left-0 bottom-0 top-0 h-full w-auto object-contain select-none pointer-events-none z-10" />
        </div>
      </span>
      <span className="absolute left-[104px] right-auto lg:left-auto lg:right-5 top-1/2 -translate-y-1/2 z-20 text-left lg:text-right whitespace-nowrap">{label}</span>
    </Button>
  );
});

TradeInButton.displayName = 'TradeInButton';

export default TradeInButton;
