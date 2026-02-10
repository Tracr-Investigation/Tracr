interface StatusBadgeProps {
  name: string;
  color: string | null;
}

export const StatusBadge = ({ name, color }: StatusBadgeProps) => {
  const bgColor = color ? `${color}20` : '#6b728020';
  const textColor = color || '#6b7280';

  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: bgColor, color: textColor }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full mr-1.5"
        style={{ backgroundColor: textColor }}
      />
      {name}
    </span>
  );
};
