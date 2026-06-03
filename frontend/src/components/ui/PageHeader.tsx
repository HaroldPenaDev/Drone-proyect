import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6 animate-fade-in">
      <div>
        {eyebrow && (
          <div className="eyebrow-accent mb-1.5">{eyebrow}</div>
        )}
        <h1 className="font-display text-2xl font-semibold text-white tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-ink-500 mt-1 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
