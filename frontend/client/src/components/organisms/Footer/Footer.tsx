import { BaseComponentProps } from '../../../types';
import { cn } from '../../../lib/utils';

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterProps extends BaseComponentProps {
  copyright?: string;
  legalText?: string;
  legalLinks?: FooterLink[];
}

const Footer: React.FC<FooterProps> = ({
  copyright = '© 2025 Тарасов AUTO',
  legalText = 'Материалы данного сайта являются публичной офертой только на услугу сопровождения Агентом приобретения транспортного средства Клиентом. Во всех остальных случаях сайт носит исключительно информационный характер. Тарасов AUTO © 2025.',
  legalLinks = [
    { label: 'Политика конфиденциальности', href: 'https://tarasov-auto.ru/privacy_policy/', external: true },
    { label: 'Пользовательское соглашение', href: 'https://tarasov-auto.ru/terms_of_service/', external: true },
  ],
  className,
  ...props
}) => {
  return (
    <footer className={cn('w-full bg-[#252525] text-white', className)} {...props}>
      {/* Единственный нижний блок футера (без верхней части и без разделительной линии) */}
      <div className="px-4 lg:px-16 py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 lg:gap-6">
          <div className="text-white text-sm leading-[21px] order-2 lg:order-1">
            {copyright}
          </div>

          <div className="flex-1 max-w-md lg:max-w-lg text-center order-3 lg:order-2">
            <p className="text-[#999494] text-xs leading-[13px]">
              {legalText}
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-2 md:gap-6 order-1 lg:order-3 w-full md:w-auto">
            {legalLinks.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className="text-white text-sm leading-[21px] hover:text-white/80 transition-colors text-center md:whitespace-nowrap"
                {...(link.external && { target: '_blank', rel: 'noopener noreferrer' })}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
