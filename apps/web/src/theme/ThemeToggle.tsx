import { useTheme, type ThemePreference } from "./ThemeContext";

const OPTIONS: { value: ThemePreference; icon: string; label: string }[] = [
  { value: "light", icon: "☀", label: "Light" },
  { value: "system", icon: "◐", label: "System" },
  { value: "dark", icon: "☾", label: "Dark" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-toggle" role="group" aria-label="Mavzu">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={opt.value === theme ? "active" : ""}
          onClick={() => setTheme(opt.value)}
          title={opt.label}
          aria-label={opt.label}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}
