import React, { useEffect, useState } from 'react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { cn } from '../../../lib/utils';
import { useMobile } from '../../../hooks';

interface HintProps {
  content: React.ReactNode;
  children: React.ReactElement;
  className?: string; // extra classes for content
  groupId?: string; // to ensure only one open at a time on mobile
  delayDuration?: number;
  sideOffset?: number;
}

// Reusable tooltip/hint component complying with design tokens (colors via Tailwind theme -> CSS variables)
const Hint: React.FC<HintProps> = ({
  content,
  children,
  className,
  groupId = 'detail-hints',
  delayDuration = 200,
  sideOffset = 8,
}) => {
  const isMobile = useMobile();
  const [open, setOpen] = useState(false);

  // Close by tap outside / ESC on mobile and keep only one open
  useEffect(() => {
    if (!isMobile) return;

    const onDocClick = () => setOpen(false);
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onExternalOpen = (e: Event) => {
      const ce = e as CustomEvent<string>;
      if (ce.detail !== groupId) setOpen(false);
    };

    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onEsc);
    window.addEventListener('hint-open', onExternalOpen as EventListener);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onEsc);
      window.removeEventListener('hint-open', onExternalOpen as EventListener);
    };
  }, [isMobile, groupId]);

  const handleTriggerClick = (e: React.MouseEvent) => {
    if (!isMobile) return; // desktop uses hover/focus by Radix
    e.stopPropagation();
    const next = !open;
    setOpen(next);
    if (next) {
      const evt = new CustomEvent('hint-open', { detail: groupId });
      window.dispatchEvent(evt);
    }
  };

  return (
    <Tooltip open={isMobile ? open : undefined} delayDuration={delayDuration}>
      <TooltipTrigger asChild>
        {React.cloneElement(children, {
          onClick: (e: React.MouseEvent) => {
            children.props?.onClick?.(e);
            handleTriggerClick(e);
          },
        })}
      </TooltipTrigger>
      <TooltipContent
        sideOffset={sideOffset}
        className={cn(
          'hint-tooltip max-w-[300px] w-[min(300px,90vw)]',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
};

export { Hint };
