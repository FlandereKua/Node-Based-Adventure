interface Props {
  label: string;
  tone?: 'info' | 'success' | 'warning' | 'danger';
}

const toneMap: Record<NonNullable<Props['tone']>, string> = {
  info: 'border-sky-400 bg-sky-500/10 text-sky-100',
  success: 'border-emerald-400 bg-emerald-500/10 text-emerald-100',
  warning: 'border-amber-400 bg-amber-500/10 text-amber-100',
  danger: 'border-rose-400 bg-rose-500/10 text-rose-100'
};

const TagPill = ({ label, tone = 'info' }: Props) => (
  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${toneMap[tone]}`}>
    {label}
  </span>
);

export default TagPill;
