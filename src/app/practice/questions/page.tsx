import {Suspense} from "react";
import {QuestionBrowser} from "@/features/practice/QuestionBrowser";
export default function QuestionsPage(){return <Suspense fallback={<div className="canvas"><h1>Browse questions</h1><p role="status">Loading questions…</p></div>}><QuestionBrowser/></Suspense>;}
