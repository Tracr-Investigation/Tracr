import { Search, Filter } from 'lucide-react';

interface FilterOption {
  value: string | number;
  label: string;
}

interface FilterConfig {
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  options: FilterOption[];
  placeholder?: string;
}

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  placeholder?: string;
  filter?: FilterConfig;
  total?: number;
  totalLabel?: string;
}

export const SearchBar = ({
  query,
  onQueryChange,
  placeholder = 'Rechercher...',
  filter,
  total,
  totalLabel = 'résultat',
}: SearchBarProps) => {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="relative flex-1 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm text-text-default placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-border-focus transition-all"
        />
      </div>

      {filter && (
        <div className="relative">
          <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <select
            value={filter.value ?? ''}
            onChange={(e) => filter.onChange(e.target.value ? (isNaN(Number(e.target.value)) ? e.target.value : Number(e.target.value)) : null)}
            className="pl-9 pr-8 py-2.5 bg-card border border-border rounded-xl text-sm text-text-default focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-border-focus transition-all appearance-none cursor-pointer"
          >
            <option value="">{filter.placeholder ?? 'Tous'}</option>
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      {total !== undefined && (
        <span className="text-text-muted text-sm ml-auto">
          {total} {totalLabel}{total > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
};
