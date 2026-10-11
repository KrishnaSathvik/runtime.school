import type { ReactNode } from "react";
export function PageHeader({title, description, children}: {title:string; description?:string; children?:ReactNode}) {
  return <header className="page-heading"><h1>{title}</h1>{description && <p className="lead">{description}</p>}{children}</header>;
}
