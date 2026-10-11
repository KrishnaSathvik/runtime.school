import {it,expect} from "vitest";
import initSqlJs from "sql.js";
import fs from "node:fs";
import {practiceSeed,practiceDatasets} from "@/content/question-bank";
import {parseSchemaDetailed} from "@/engine/explain";
import {lessons,groups,projects} from "@/content";
import {lessonSummaries,moduleObjectives,projectOutcomes} from "@/content/ux-summaries";
it("table previews contain real seed rows and schema without executing learner SQL",async()=>{
 const SQL=await initSqlJs();const db=new SQL.Database();db.run(practiceSeed);const schema=parseSchemaDetailed(practiceSeed);const previews:Record<string,unknown>={};
 for(const table of new Set(Object.values(practiceDatasets).flatMap(d=>d.tables))){const name='"'+table.replaceAll('"','""')+'"';const result=db.exec(`SELECT * FROM ${name} LIMIT 5`)[0];previews[table]={columns:schema[table.toLowerCase()]??[],result:result??{columns:[],values:[]},total:db.exec(`SELECT COUNT(*) FROM ${name}`)[0].values[0][0]};}
 db.close();const path='src/content/table-previews.json';if(process.env.UPDATE_PREVIEWS==='1')fs.writeFileSync(path,JSON.stringify(previews,null,2)+'\n');expect(JSON.parse(fs.readFileSync(path,'utf8'))).toEqual(previews);
});
it("presentation summaries cover canonical content without replacing it",()=>{expect(lessonSummaries).toHaveLength(lessons.length);expect(moduleObjectives).toHaveLength(groups.length);expect(projectOutcomes).toHaveLength(projects.length);expect(lessonSummaries.every(s=>s.length>20&&s.length<130)).toBe(true);});
