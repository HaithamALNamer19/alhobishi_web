import React from 'react';
import { roleLabelsAr, type Role } from '@/core/auth/roles';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'slate'
    | 'emerald'
    | 'amber'
    | 'sky'
    | 'rose'
    | 'indigo'
    | 'success'
    | 'danger'
    | 'warning'
    | 'neutral'
    | 'outline';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className = '',
  variant = 'slate',
  size = 'md',
  children,
  ...props
}) => {
  const base = 'inline-flex items-center font-medium rounded-full select-none';

  const variants: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-700 border border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border border-amber-200',
    sky: 'bg-sky-50 text-sky-700 border border-sky-200',
    rose: 'bg-rose-50 text-rose-700 border border-rose-200',
    indigo: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
    outline: 'bg-transparent text-slate-700 border border-slate-300',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </span>
  );
};

export const RoleBadge: React.FC<{ role: Role }> = ({ role }) => {
  const map: Record<Role, { variant: BadgeProps['variant']; text: string }> = {
    customer: { variant: 'slate', text: roleLabelsAr.customer },
    wholesale: { variant: 'amber', text: 'حساب تاجر' },
    staff: { variant: 'sky', text: roleLabelsAr.staff },
    admin: { variant: 'indigo', text: roleLabelsAr.admin },
  };

  const { variant, text } = map[role] || { variant: 'slate', text: role };

  return <Badge variant={variant}>{text}</Badge>;
};

