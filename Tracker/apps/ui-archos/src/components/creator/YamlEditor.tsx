import type { ChangeEvent } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const YamlEditor = ({ value, onChange }: Props) => {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value);

  return (
    <textarea
      value={value}
      onChange={handleChange}
      spellCheck={false}
      className="h-64 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 font-mono text-sm text-slate-100"
    />
  );
};

export default YamlEditor;
