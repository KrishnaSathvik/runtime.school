import type { ReactNode } from "react";

/** Hub headings and task headers share spacing, while keeping task navigation compact. */
export function PageHeader({ title, description, context, children }: {
  title: string;
  description?: string;
  context?: ReactNode;
  children?: ReactNode;
}) {
  return <header className="page-heading">
    {context && <div className="metadata">{context}</div>}
    <h1>{title}</h1>
    {description && <p className="lead">{description}</p>}
    {children}
  </header>;
}

export function ActivityHeader({ children }: { children: ReactNode }) {
  return <header className="workspace-header">{children}</header>;
}
