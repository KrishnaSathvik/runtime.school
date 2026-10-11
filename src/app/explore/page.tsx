import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { tools } from "@/lib/tools";

export default function ExplorePage() {
  return (
    <div className="canvas">

      <h1>Tools for exploring on your own.</h1>
      <p className="lead">
        Try your own queries, create tables, or see how SQL works behind the scenes.
        These tools do not grade your work or change your learning progress.
      </p>
      <div className="mt-10 border-t border-[var(--border)]">
        {tools.map(({ href, label, icon: Icon, purpose }) => (
          <Link key={href} href={href} className="tool-row">
            <Icon size={20} strokeWidth={1.75} className="text-[var(--accent)]" aria-hidden />
            <div>
              <div className="text-[15px] font-medium">{label}</div>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">{purpose}</p>
            </div>
            <ArrowRight size={16} aria-hidden className="text-[var(--muted)]" />
          </Link>
        ))}
      </div>
    </div>
  );
}
