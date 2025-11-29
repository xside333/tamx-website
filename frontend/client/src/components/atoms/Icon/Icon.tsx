import React from 'react';
import { BaseComponentProps } from '../../../types';
import { cn } from '../../../lib/utils';

interface IconProps extends BaseComponentProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
}

const Icon: React.FC<IconProps> = ({
  name,
  size = 'md',
  color = 'currentColor',
  className,
  ...props
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  const iconClasses = cn(
    'inline-block',
    'flex-shrink-0',
    sizeClasses[size],
    className
  );

  const renderIcon = () => {
    switch (name) {
      case 'location':
        return (
          <svg viewBox="0 0 21 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.4365 8.333C18.4365 14.167 10.9365 19 10.9365 19C10.9365 19 3.43652 14.167 3.43652 8.333C3.43668 6.34394 4.22696 4.4364 5.63352 3.03C7.03952 1.623 8.94652 1 10.9365 1C12.9265 1 14.8335 1.623 16.2395 3.03C17.6461 4.4364 18.4364 6.34394 18.4365 8.333Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10.9365 10.833C11.5996 10.833 12.2354 10.5696 12.7043 10.1008C13.1731 9.63193 13.4365 8.99604 13.4365 8.333C13.4365 7.66996 13.1731 7.03407 12.7043 6.56523C12.2354 6.09639 11.5996 5.833 10.9365 5.833C10.2735 5.833 9.6376 6.09639 9.16876 6.56523C8.69992 7.03407 8.43652 7.66996 8.43652 8.333C8.43652 8.99604 8.69992 9.63193 9.16876 10.1008C9.6376 10.5696 10.2735 10.833 10.9365 10.833Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );

      case 'phone':
        return (
          <svg viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clipPath="url(#clip0_1_50)">
              <path d="M19.2081 14.1125V16.6125C19.2092 16.8446 19.1617 17.0745 19.0688 17.2872C18.9758 17.5 18.8395 17.691 18.6684 17.8479C18.4973 18.0049 18.2953 18.1244 18.0753 18.1987C17.8554 18.273 17.6223 18.3005 17.3911 18.2795C14.827 18.0002 12.3641 17.1238 10.2001 15.7205C8.1866 14.441 6.47952 12.7339 5.20007 10.7205C3.79177 8.54638 2.91512 6.07127 2.64107 3.49545C2.62039 3.26501 2.64791 3.0328 2.72186 2.81357C2.79582 2.59435 2.9146 2.39292 3.07065 2.22211C3.2267 2.05129 3.4166 1.91483 3.62826 1.8214C3.83992 1.72798 4.06871 1.67964 4.30007 1.67945H6.80007C7.20414 1.67633 7.59563 1.81982 7.90198 2.08332C8.20832 2.34682 8.40874 2.71246 8.46607 3.11245C8.57207 3.91245 8.76807 4.69845 9.05007 5.45445C9.16171 5.75274 9.18572 6.07673 9.11928 6.38821C9.05284 6.69969 8.89871 6.98568 8.67507 7.21245L7.61607 8.27045C8.80224 10.3568 10.5297 12.0843 12.6161 13.2705L13.6751 12.2125C13.9018 11.9888 14.1878 11.8347 14.4993 11.7682C14.8108 11.7018 15.1348 11.7258 15.4331 11.8375C16.1891 12.1195 16.9751 12.3155 17.7751 12.4205C18.1798 12.4777 18.5495 12.6817 18.8137 12.9937C19.0779 13.3056 19.2182 13.7038 19.2081 14.1125Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </g>
            <defs>
              <clipPath id="clip0_1_50">
                <rect width="20" height="20" fill="white" transform="translate(0.873047 0.0124512)"/>
              </clipPath>
            </defs>
          </svg>
        );

      case 'youtube':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 15L15.19 12L10 9V15ZM21.56 7.17C21.69 7.64 21.78 8.27 21.84 9.07C21.91 9.87 21.94 10.56 21.94 11.16L22 12C22 14.19 21.84 15.8 21.56 16.83C21.31 17.73 20.73 18.31 19.83 18.56C19.36 18.69 18.5 18.78 17.18 18.84C15.88 18.91 14.69 18.94 13.59 18.94L12 19C7.81 19 5.2 18.84 4.17 18.56C3.27 18.31 2.69 17.73 2.44 16.83C2.31 16.36 2.22 15.73 2.16 14.93C2.09 14.13 2.06 13.44 2.06 12.84L2 12C2 9.81 2.16 8.2 2.44 7.17C2.69 6.27 3.27 5.69 4.17 5.44C4.64 5.31 5.5 5.22 6.82 5.16C8.12 5.09 9.31 5.06 10.41 5.06L12 5C16.19 5 18.8 5.16 19.83 5.44C20.73 5.69 21.31 6.27 21.56 7.17Z" fill={color}/>
          </svg>
        );

      case 'telegram':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19.891 6.58492C19.651 9.08092 18.609 15.1479 18.08 17.9449C17.855 19.1299 17.407 19.5249 16.99 19.5719C16.06 19.6519 15.355 18.9719 14.457 18.3869C13.047 17.4709 12.245 16.9019 10.882 16.0169C9.296 14.9899 10.322 14.4219 11.235 13.5049C11.475 13.2679 15.579 9.58692 15.659 9.25492C15.6703 9.20466 15.6689 9.15238 15.655 9.10279C15.641 9.05321 15.6149 9.00788 15.579 8.97092C15.483 8.89092 15.355 8.92292 15.242 8.93892C15.098 8.97092 12.854 10.4399 8.478 13.3469C7.837 13.7739 7.26 13.9949 6.747 13.9789C6.17 13.9629 5.08 13.6629 4.262 13.3949C3.252 13.0789 2.467 12.9049 2.531 12.3519C2.563 12.0669 2.964 11.7829 3.717 11.4819C8.397 9.47592 11.507 8.14892 13.063 7.51692C17.519 5.68392 18.433 5.36792 19.042 5.36792C19.17 5.36792 19.474 5.39992 19.667 5.55792C19.827 5.68392 19.875 5.85792 19.891 5.98392C19.875 6.07892 19.907 6.36492 19.891 6.58492Z" fill={color}/>
          </svg>
        );

      case 'whatsapp':
        return (
          <svg viewBox="0 0 22 21" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clipPath="url(#clip0_1_388)">
              <path fillRule="evenodd" clipRule="evenodd" d="M17.5486 14.8271C17.2955 15.5435 16.2896 16.136 15.4874 16.3093C14.9383 16.4259 14.2222 16.5182 11.8093 15.5183C9.09922 14.3955 5.33603 10.396 5.33603 7.73452C5.33603 6.37961 6.11722 4.8019 7.48327 4.8019C8.14057 4.8019 8.28548 4.81472 8.50178 5.33357C8.75483 5.94486 9.37223 7.45093 9.44573 7.60532C9.74918 8.23866 9.13702 8.60942 8.69287 9.16084C8.55112 9.32678 8.39048 9.50625 8.57003 9.81504C8.74853 10.1175 9.36592 11.1238 10.2731 11.9314C11.4449 12.9755 12.3952 13.3088 12.7354 13.4506C12.9884 13.5556 13.2908 13.5311 13.4756 13.3337C13.7098 13.0805 14.0006 12.6606 14.2967 12.2468C14.5057 11.9506 14.7713 11.9136 15.0496 12.0186C15.2375 12.0837 17.6263 13.1931 17.7271 13.3706C17.8016 13.4998 17.8016 14.1108 17.5486 14.8271ZM11.4386 0H11.4334C5.64472 0 0.936523 4.70962 0.936523 10.5C0.936523 12.796 1.67678 14.9261 2.93573 16.6539L1.62743 20.5555L5.66258 19.2661C7.32263 20.3647 9.30397 21 11.4386 21C17.2273 21 21.9365 16.2904 21.9365 10.5C21.9365 4.70962 17.2273 0 11.4386 0Z" fill={color}/>
            </g>
            <defs>
              <clipPath id="clip0_1_388">
                <rect width="21" height="21" fill="white" transform="translate(0.936523)"/>
              </clipPath>
            </defs>
          </svg>
        );

      case 'vk':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M22.72 6.188C22.887 5.658 22.72 5.274 21.982 5.274H19.527C18.908 5.274 18.622 5.611 18.455 5.971C18.455 5.971 17.192 9.046 15.429 11.04C14.857 11.616 14.595 11.808 14.285 11.808C14.118 11.808 13.904 11.616 13.904 11.088V6.163C13.904 5.538 13.714 5.25 13.189 5.25H9.329C8.947 5.25 8.709 5.538 8.709 5.827C8.709 6.427 9.59 6.571 9.685 8.253V11.906C9.685 12.699 9.545 12.844 9.232 12.844C8.399 12.844 6.373 9.744 5.158 6.214C4.922 5.514 4.682 5.25 4.062 5.25H1.584C0.869 5.25 0.75 5.586 0.75 5.947C0.75 6.595 1.584 9.862 4.634 14.186C6.66 17.139 9.543 18.726 12.14 18.726C13.713 18.726 13.904 18.366 13.904 17.766V15.53C13.904 14.81 14.047 14.69 14.547 14.69C14.904 14.69 15.548 14.881 17.002 16.299C18.669 17.98 18.955 18.749 19.885 18.749H22.339C23.054 18.749 23.388 18.389 23.197 17.692C22.983 16.995 22.172 15.987 21.124 14.786C20.552 14.113 19.694 13.369 19.432 13.008C19.075 12.528 19.17 12.336 19.432 11.903C19.408 11.903 22.411 7.627 22.72 6.185" fill={color}/>
          </svg>
        );

      case 'chevronDown':
        return (
          <svg viewBox="0 0 14 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.68904 5.18685L6.58904 10.1009C6.64145 10.1566 6.70618 10.1992 6.77804 10.2255C6.84834 10.2505 6.92253 10.2628 6.99714 10.2619C7.07141 10.2614 7.14513 10.2491 7.21554 10.2255C7.28759 10.1995 7.35256 10.1571 7.40524 10.1016L12.3199 5.18685C12.3868 5.11991 12.4393 5.04011 12.4745 4.95228C12.5096 4.86446 12.5266 4.77042 12.5243 4.67585C12.5243 4.47192 12.4513 4.29692 12.3052 4.15085C12.2396 4.08158 12.1604 4.02647 12.0727 3.98891C11.9849 3.95135 11.8904 3.93214 11.7949 3.93245C11.6993 3.93213 11.6046 3.95141 11.5168 3.98909C11.4289 4.02678 11.3496 4.08207 11.2839 4.15155L6.99714 8.43905L2.70894 4.15155C2.6433 4.08493 2.56474 4.03242 2.47806 3.99727C2.39139 3.96212 2.29845 3.94507 2.20494 3.94715C2.00614 3.94715 1.83394 4.01995 1.68834 4.16555C1.61886 4.23125 1.56357 4.31048 1.52588 4.39837C1.4882 4.48625 1.46892 4.58093 1.46924 4.67655C1.46902 4.77206 1.48834 4.8666 1.52602 4.95436C1.5637 5.04212 1.61894 5.12124 1.68834 5.18685" fill={color}/>
          </svg>
        );

      case 'heart':
        return (
          <svg viewBox="0 0 23 22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.9366 5.04224L11.4412 5.519C11.5708 5.65366 11.7497 5.72974 11.9366 5.72974C12.1235 5.72974 12.3023 5.65366 12.4319 5.519L11.9366 5.04224ZM9.57711 16.7951C8.18776 15.6998 6.66855 14.6303 5.46333 13.2731C4.28168 11.9425 3.4574 10.39 3.4574 8.37567H2.0824C2.0824 10.819 3.10036 12.6831 4.43522 14.1861C5.74653 15.6627 7.4181 16.8439 8.72587 17.8749L9.57711 16.7951ZM3.4574 8.37567C3.4574 6.40404 4.57149 4.75064 6.09223 4.0555C7.56963 3.38018 9.55475 3.55903 11.4412 5.519L12.4319 4.56548C10.1935 2.23989 7.59531 1.8566 5.52059 2.80496C3.48922 3.7335 2.0824 5.88961 2.0824 8.37567H3.4574ZM8.72587 17.8749C9.19541 18.2451 9.69948 18.6398 10.2103 18.9382C10.721 19.2366 11.3037 19.4792 11.9366 19.4792V18.1042C11.6528 18.1042 11.3188 17.9935 10.904 17.7511C10.4894 17.5088 10.0593 17.1752 9.57711 16.7951L8.72587 17.8749ZM15.1473 17.8749C16.455 16.8439 18.1266 15.6627 19.4379 14.1861C20.7728 12.6831 21.7907 10.819 21.7907 8.37567H20.4157C20.4157 10.39 19.5915 11.9425 18.4098 13.2731C17.2046 14.6303 15.6854 15.6998 14.2961 16.7951L15.1473 17.8749ZM21.7907 8.37567C21.7907 5.88961 20.3839 3.7335 18.3525 2.80496C16.2778 1.8566 13.6796 2.23989 11.4412 4.56548L12.4319 5.519C14.3183 3.55903 16.3035 3.38018 17.7809 4.0555C19.3016 4.75064 20.4157 6.40404 20.4157 8.37567H21.7907ZM14.2961 16.7951C13.8138 17.1752 13.3837 17.5088 12.9691 17.7511C12.5543 17.9935 12.2204 18.1042 11.9366 18.1042V19.4792C12.5694 19.4792 13.1522 19.2366 13.6628 18.9382C14.1737 18.6398 14.6777 18.2451 15.1473 17.8749L14.2961 16.7951Z" fill={color}/>
          </svg>
        );

      case 'menu':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 12H21M3 6H21M3 18H21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );

      case 'close':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );

      case 'camera':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="13" r="4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );

      case 'expand':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 3H5C3.89543 3 3 3.89543 3 5V8M21 8V5C21 3.89543 20.1046 3 19 3H16M16 21H19C20.1046 21 21 20.1046 21 19V16M3 16V19C3 20.1046 3.89543 21 5 21H8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );

      case 'chevron-left':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );

      case 'chevron-right':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18L15 12L9 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );

      case 'x':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );

      case 'calendar':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke={color} strokeWidth="2"/>
            <line x1="16" y1="2" x2="16" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <line x1="8" y1="2" x2="8" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <line x1="3" y1="10" x2="21" y2="10" stroke={color} strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );

      case 'message-circle':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );

      case 'clock':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2"/>
            <polyline points="12,6 12,12 16,14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );

      case 'map-pin':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z" stroke={color} strokeWidth="2"/>
            <circle cx="12" cy="10" r="3" stroke={color} strokeWidth="2"/>
          </svg>
        );

      case 'hash':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="4" y1="9" x2="20" y2="9" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <line x1="4" y1="15" x2="20" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <line x1="10" y1="3" x2="8" y2="21" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <line x1="16" y1="3" x2="14" y2="21" stroke={color} strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );

      case 'list':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="8" y1="6" x2="21" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <line x1="8" y1="12" x2="21" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <line x1="8" y1="18" x2="21" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <line x1="3" y1="6" x2="3.01" y2="6" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <line x1="3" y1="12" x2="3.01" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <line x1="3" y1="18" x2="3.01" y2="18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );

      case 'filter':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 4H21L14 12V19L10 21V12L3 4Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );

      case 'settings':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2"/>
            <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.742 9.96512 4.01131 9.77251C4.28061 9.5799 4.48571 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );

      case 'fuel':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 22V6C3 5.46957 3.21071 4.96086 3.58579 4.58579C3.96086 4.21071 4.46957 4 5 4H11C11.5304 4 12.0391 4.21071 12.4142 4.58579C12.7893 4.96086 13 5.46957 13 6V22H3Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 10H15L19 6V18H17" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="3" y1="16" x2="13" y2="16" stroke={color} strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );

      case 'navigation':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="3,11 22,2 13,21 11,13 3,11" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );

      case 'rotate-cw':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polyline points="23,4 23,10 17,10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M20.49 15C19.9828 16.8399 18.8927 18.4187 17.4015 19.4985C15.9103 20.5783 14.1204 21.0937 12.3301 20.9572C10.5398 20.8207 8.85566 20.0402 7.55268 18.7372C6.24971 17.4342 5.46918 15.6901 5.33268 13.8998C5.19618 12.1095 5.71166 10.3196 6.79144 8.82843C7.87122 7.33725 9.44996 6.24714 11.2899 5.74C13.1299 5.23285 15.0899 5.34844 16.86 6.07C18.63 6.79156 20.1026 8.08477 21 9.76" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );

      case 'gauge':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2"/>
          </svg>
        );

      case 'palette':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="13.5" cy="6.5" r=".5" fill={color}/>
            <circle cx="17.5" cy="10.5" r=".5" fill={color}/>
            <circle cx="8.5" cy="7.5" r=".5" fill={color}/>
            <circle cx="6.5" cy="12.5" r=".5" fill={color}/>
            <path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22C13.6 22 15 20.6 15 19C15 18.7 14.9 18.4 14.7 18.1C14.5 17.8 14.4 17.4 14.4 17C14.4 16.2 15 15.6 15.8 15.6H17C19.8 15.6 22 13.4 22 10.6C22 5.8 17.5 2 12 2Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );

      case 'alert-triangle':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.29 3.86L1.82 18C1.64466 18.3024 1.55097 18.6453 1.55097 18.995C1.55097 19.3447 1.64466 19.6876 1.82 19.99C1.99534 20.2924 2.24738 20.5444 2.54978 20.7198C2.85218 20.8951 3.19509 20.9877 3.54 20.99H20.46C20.8049 20.9877 21.1478 20.8951 21.4502 20.7198C21.7526 20.5444 22.0047 20.2924 22.18 19.99C22.3553 19.6876 22.449 19.3447 22.449 18.995C22.449 18.6453 22.3553 18.3024 22.18 18L13.71 3.86C13.5347 3.55746 13.2826 3.30543 12.9802 3.13006C12.6778 2.9547 12.3349 2.86101 11.985 2.86101C11.6351 2.86101 11.2922 2.9547 10.9898 3.13006C10.6874 3.30543 10.4353 3.55746 10.26 3.86H10.29Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="9" x2="12" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <line x1="12" y1="17" x2="12.01" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );

      case 'dollar-sign':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="12" y1="1" x2="12" y2="23" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <path d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );

      case 'check-circle':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4906 2.02168 11.3412C2.16356 9.19173 2.99721 7.14846 4.39828 5.5129C5.79935 3.87734 7.69279 2.73192 9.79619 2.24712C11.8996 1.76232 14.1003 1.9584 16.07 2.81" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="22,4 12,14.01 9,11.01" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );

      case 'calculator':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="2" width="16" height="20" rx="2" stroke={color} strokeWidth="2"/>
            <rect x="6" y="6" width="12" height="3" rx="1" stroke={color} strokeWidth="2"/>
            <line x1="8" y1="14" x2="8" y2="14.01" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <line x1="12" y1="14" x2="12" y2="14.01" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <line x1="16" y1="14" x2="16" y2="14.01" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <line x1="8" y1="18" x2="8" y2="18.01" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <line x1="12" y1="18" x2="12" y2="18.01" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <line x1="16" y1="18" x2="16" y2="18.01" stroke={color} strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );

      case 'credit-card':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke={color} strokeWidth="2"/>
            <line x1="1" y1="10" x2="23" y2="10" stroke={color} strokeWidth="2"/>
          </svg>
        );

      case 'zoom-in':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="8" stroke={color} strokeWidth="2"/>
            <path d="M21 21L16.65 16.65" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <line x1="11" y1="8" x2="11" y2="14" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <line x1="8" y1="11" x2="14" y2="11" stroke={color} strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );

      case 'ship':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 21C2 21 7 17 12 17S22 21 22 21" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <path d="M20 8L12 13L4 8L12 3L20 8Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );

      case 'truck':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="3" width="15" height="13" rx="2" ry="2" stroke={color} strokeWidth="2"/>
            <path d="M16 8H20L23 11V16H16V8Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="5.5" cy="18.5" r="2.5" stroke={color} strokeWidth="2"/>
            <circle cx="18.5" cy="18.5" r="2.5" stroke={color} strokeWidth="2"/>
          </svg>
        );

      case 'arrow-right':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="5" y1="12" x2="19" y2="12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            <polyline points="12,5 19,12 12,19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );

      case 'trade-in-arrow':
        return (
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M26 13C26 5.8203 20.1797 0 13 0C5.8203 0 0 5.8203 0 13C0 20.1797 5.8203 26 13 26C20.1797 26 26 20.1797 26 13Z" fill="var(--color-tradein, #FF7438)"/>
            <path d="M9.14182 14.1371C9.40554 13.8346 9.19071 13.3622 8.78936 13.3622H7.58772C7.57989 13.2434 7.57552 13.1235 7.57552 13.0027C7.57552 10.0088 10.0112 7.57306 13.0051 7.57306C14.4439 7.57306 15.7535 8.13574 16.7261 9.05237L18.4205 7.0701C16.9372 5.71321 15.0284 4.96997 13.0051 4.96997C10.8595 4.96997 8.84234 5.80554 7.32515 7.32269C5.808 8.83988 4.97243 10.8571 4.97243 13.0027C4.97243 13.123 4.97543 13.2428 4.98066 13.3622H3.96851C3.56716 13.3622 3.3523 13.8346 3.61606 14.1371L5.89933 16.7561L6.37892 17.3062L8.10081 15.3311L9.14182 14.1371Z" fill="white"/>
            <path d="M22.3933 12.6079L20.6903 10.6544L19.6304 9.43872L18.1172 11.1744L16.8676 12.6079C16.6038 12.9104 16.8187 13.3827 17.22 13.3827H18.4203C18.2239 16.1994 15.8699 18.4311 13.0042 18.4311C11.7533 18.4311 10.5999 18.0057 9.68087 17.2921L7.98633 19.2745C9.40591 20.4146 11.1573 21.0342 13.0043 21.0342C15.1499 21.0342 17.167 20.1987 18.6842 18.6815C20.1112 17.2545 20.935 15.3852 21.0279 13.3828H22.0409C22.4422 13.3827 22.657 12.9104 22.3933 12.6079Z" fill="white"/>
          </svg>
        );

      case 'search':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="8" stroke={color} strokeWidth="2"/>
            <path d="M21 21L16.65 16.65" stroke={color} strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );

      case 'bell':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );

      case 'external-link':
        return (
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="15,3 21,3 21,9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="10" y1="14" x2="21" y2="3" stroke={color} strokeWidth="2" strokeLinecap="round"/>
          </svg>
        );

      default:
        return (
          <div
            style={{ backgroundColor: color, width: '100%', height: '100%', borderRadius: '2px' }}
            title={`Icon: ${name} (placeholder)`}
          />
        );
    }
  };

  return (
    <div
      className={iconClasses}
      role="img"
      aria-label={`${name} icon`}
      {...props}
    >
      {renderIcon()}
    </div>
  );
};

export { Icon };
