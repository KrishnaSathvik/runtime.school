"use client";
import { useLayoutEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePyProgress, usePyProgressReady } from '@/lib/python-progress';
import { Shell } from '@/features/rt/Shell';
import { pythonSectionHrefs } from './section-hrefs';

export function PythonEntry({ section }: { section: 'learn' | 'practice' | 'projects' }) {
  const router = useRouter();
  const ready = usePyProgressReady();
  const opened = useRef(false);
  useLayoutEffect(() => {
    if (!ready || opened.current) return;
    opened.current = true;
    router.replace(pythonSectionHrefs(usePyProgress.getState())[section]);
  }, [ready, router, section]);
  return <Shell subject="python" section={section} path={[{label:'python'}, {label:section}]}>
    <div className="rx-page" aria-busy="true" aria-label="Opening your work" />
  </Shell>;
}
