export function Spinner({ label = "Loading..." }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}