import { Search } from "lucide-react";

interface SearchBarProps {
  placeholder?: string;
}

export function SearchBar({ placeholder = "Search" }: SearchBarProps) {
  return (
    <label className="flex items-center gap-3 rounded-full border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-400 shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <Search className="size-4 text-slate-500" />
      <input className="w-full bg-transparent outline-none placeholder:text-slate-500" placeholder={placeholder} />
    </label>
  );
}
