import { PASSWORD_RULES, passwordChecks } from "@/lib/password";
import { cn } from "@/lib/cn";

export function PasswordRules({ password }: { password: string }) {
  const checks = passwordChecks(password);
  return (
    <ul className="space-y-1 text-xs">
      {PASSWORD_RULES.map((rule) => {
        const ok = checks[rule.id];
        const idle = password.length === 0;
        return (
          <li
            key={rule.id}
            className={cn(
              "flex items-center gap-2",
              idle ? "text-muted" : ok ? "text-primary" : "text-accent",
            )}
          >
            <span
              className={cn(
                "grid size-4 place-items-center rounded-full text-[10px] font-semibold",
                idle ? "bg-primary/10 text-muted" : ok ? "bg-primary text-primary-fg" : "bg-accent/15 text-accent",
              )}
            >
              {idle ? "\u00b7" : ok ? "\u2713" : "!"}
            </span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
