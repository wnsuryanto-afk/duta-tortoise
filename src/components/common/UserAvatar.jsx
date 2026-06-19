const SIZE_MAP = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-7 h-7 text-[11px]",
  md: "w-10 h-10 text-sm",
  lg: "w-16 h-16 text-xl",
  xl: "w-20 h-20 text-2xl",
};

export default function UserAvatar({ name, photoUrl, size = "sm", className = "" }) {
  const initial = (name || "?")[0].toUpperCase();
  const sz = SIZE_MAP[size] || SIZE_MAP.sm;

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name || "User"}
        className={`${sz} rounded-full object-cover border border-primary/25 ${className}`}
      />
    );
  }

  return (
    <div className={`${sz} rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center font-bold text-primary ${className}`}>
      {initial}
    </div>
  );
}