import type { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren, SelectHTMLAttributes } from "react";
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "outline" | "danger";

export const Card = ({ children, className = "" }: PropsWithChildren<{ className?: string }>) => (
  <section
    className={clsx(
      "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_8px_24px_rgba(15,23,42,0.06)]",
      className,
    )}
  >
    {children}
  </section>
);

export const Button = ({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) => {
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm",
    secondary: "bg-slate-900 text-white hover:bg-slate-700 focus:ring-slate-500",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-400",
    danger: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500",
  };

  return (
    <button
      {...props}
      className={clsx(
        "inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition-all duration-200 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
    />
  );
};

export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={clsx(
      "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
      className,
    )}
  />
);

export const Select = ({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={clsx(
      "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100",
      className,
    )}
  />
);

export const Label = ({ children }: PropsWithChildren) => (
  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">{children}</label>
);

export const Badge = ({ status }: { status: string }) => {
  const classes =
    status === "disponivel"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : status === "alugado"
        ? "bg-rose-50 text-rose-700 ring-rose-200"
        : status === "aberta"
          ? "bg-blue-50 text-blue-700 ring-blue-200"
          : status === "manutencao"
            ? "bg-amber-50 text-amber-700 ring-amber-200"
            : status === "finalizada"
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : status === "cancelada"
                ? "bg-slate-100 text-slate-600 ring-slate-200"
                : "bg-slate-100 text-slate-700 ring-slate-200";

  return <span className={clsx("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset", classes)}>{status}</span>;
};

export const EmptyState = ({ message }: { message: string }) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">{message}</div>
);

export const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div>
    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
  </div>
);

export const Modal = ({ open, title, onClose, children }: PropsWithChildren<{ open: boolean; title: string; onClose: () => void }>) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
};
