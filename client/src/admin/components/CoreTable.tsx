import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

/** Responsive table shell: card + horizontal scroll container. */
export function CoreTable({ children, className, footer }: { children: ReactNode; className?: string; footer?: ReactNode }) {
  return (
    <div className={cn("card overflow-hidden", className)}>
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-sm border-collapse">{children}</table>
      </div>
      {footer && <div className="px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-800">{footer}</div>}
    </div>
  );
}

export function CoreTh({ className, children, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn("px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800", className)} {...rest}>
      {children}
    </th>
  );
}

export function CoreTd({ className, children, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-3 align-middle text-slate-700 dark:text-slate-300 font-medium", className)} {...rest}>
      {children}
    </td>
  );
}

export function CoreTr({ className, children, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors", className)} {...rest}>
      {children}
    </tr>
  );
}
