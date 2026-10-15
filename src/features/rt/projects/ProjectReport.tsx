import type { ReportDocument } from "./report-document";
import { completionDate } from "./report-document";

export function ProjectReport({ report }: { report: ReportDocument }) {
  return <div className="project-document">
    {report.complete && <section className="project-certificate" aria-label="Certificate of completion">
      <div className="project-document-brand">runtime<span>▮</span></div>
      <p className="project-certificate-title">Certificate</p><p className="project-certificate-label">Of project completion</p>
      <p className="project-certificate-presented">{report.learner ? "Presented to" : "Awarded for completing"}</p>
      {report.learner && <><p className="project-certificate-name">{report.learner}</p><p>for completing the SQL project</p></>}
      <h2>{report.title}</h2>
      <p>SQL investigations, interpretation, and a completed analytical report</p>
      <div className="project-certificate-footer"><div><strong>{completionDate(report.completedAt) || "Project completed"}</strong><span>Completion date</span></div><div className="project-certificate-seal">SQL</div><div><strong>Runtime SQL Projects</strong><span>{report.level} · {report.dataset}</span></div></div>
    </section>}
    <article className="project-document-body"><header><p className="project-document-label">{report.complete ? "Project analysis" : "Draft report"}</p><h2>{report.title}</h2><p>{report.role} · {report.dataset}</p></header>
      {report.sections.map(s => <section key={s.title}><h3>{s.title}</h3><p>{s.text}</p></section>)}
      <section><h3>Key findings</h3>{report.findings.length ? report.findings.map((f, i) => <section key={i}><h4>{f.title}</h4><p>{f.text}</p></section>) : <p>No findings selected yet.</p>}</section>
      {report.synthesis.map((s, i) => <section key={i}><h3>{s.title}</h3><p>{s.text}</p></section>)}
      {report.findings.length > 0 && <section><h3>SQL & saved results</h3>{report.findings.map((f, i) => <section key={i} className="project-document-code"><h4>{f.title}</h4><pre><code>{f.query}</code></pre><p>{f.result.values.length} saved rows of {f.total} result rows.</p><div className="project-records-scroll"><table className="project-records"><thead><tr>{f.result.columns.map((c, j) => <th key={j}>{c}</th>)}</tr></thead><tbody>{f.result.values.map((row, j) => <tr key={j}>{row.map((value, k) => <td key={k}>{value === null ? "NULL" : String(value)}</td>)}</tr>)}</tbody></table></div></section>)}</section>}
      <footer><h3>Data source</h3><p>{report.source}</p></footer>
    </article>
  </div>;
}
