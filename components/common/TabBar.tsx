"use client";

export function TabBar<K extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly {
    key: K;
    label: string;
    icon?: React.ElementType;
    count?: number;
  }[];
  active: K;
  onChange: (key: K) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {tabs.map(({ key, label, icon: Icon, count }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            active === key
              ? "bg-primary-600 text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          {Icon && <Icon className="w-3 h-3" />}
          {label}
          {count !== undefined && count > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-2xs font-semibold ${
                active === key
                  ? "bg-white/20 text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
