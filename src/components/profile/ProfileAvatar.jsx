function getInitials(name = "User") {
  return String(name || "User")
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProfileAvatar({
  name,
  photoURL,
  size = "md",
  className = "",
}) {
  const sizes = {
    sm: "h-9 w-9 rounded-xl text-xs",
    md: "h-10 w-10 rounded-2xl text-sm",
    lg: "h-16 w-16 rounded-3xl text-lg",
    xl: "h-24 w-24 rounded-[2rem] text-2xl",
  };

  const sizeClass = sizes[size] || sizes.md;

  return (
    <div
      className={`${sizeClass} theme-accent-bg relative flex flex-shrink-0 items-center justify-center overflow-hidden font-black text-white shadow-lg shadow-[color-mix(in_srgb,var(--accent)_24%,transparent)] ${className}`}
    >
      {photoURL ? (
        <img
          src={photoURL}
          alt={name || "Profile"}
          className="h-full w-full object-cover"
        />
      ) : (
        getInitials(name)
      )}
    </div>
  );
}
