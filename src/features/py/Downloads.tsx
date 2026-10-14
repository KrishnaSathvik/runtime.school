"use client";

export function downloadText(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = name.split('/').at(-1) || 'download.txt';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function Download({ name, text, label }: { name: string; text: string; label?: string }) {
  return <button type="button" className="rx-btn" onClick={() => downloadText(name, text)}>{label ?? `Download ${name}`}</button>;
}
