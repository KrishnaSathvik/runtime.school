import {it,expect} from "vitest";
import {lessons,groups} from "@/content";
import {lessonSummaries,moduleObjectives} from "@/content/ux-summaries";
it("presentation summaries cover canonical content without replacing it",()=>{expect(lessonSummaries).toHaveLength(lessons.length);expect(moduleObjectives).toHaveLength(groups.length);expect(lessonSummaries.every(s=>s.length>20&&s.length<130)).toBe(true);});
