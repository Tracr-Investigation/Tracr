const CATEGORY_STYLES: Record<string, string> = {
  auth: 'bg-blue-500/20 text-blue-400',
  admin: 'bg-red-500/20 text-red-400',
  action: 'bg-green-500/20 text-green-400',
  consultation: 'bg-gray-500/20 text-gray-400',
  investigation: 'bg-purple-500/20 text-purple-400',
  collaboration: 'bg-cyan-500/20 text-cyan-400',
  category: 'bg-amber-500/20 text-amber-400',
};

const DEFAULT_STYLE = 'bg-secondary/20 text-secondary';

export const LogCategoryBadge = ({ category }: { category: string }) => {
  const style = CATEGORY_STYLES[category] || DEFAULT_STYLE;

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${style}`}>
      {category}
    </span>
  );
};
