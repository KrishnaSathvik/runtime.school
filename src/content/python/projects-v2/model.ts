import type { PyPackage } from '@/engine/python/client';
export type ProjectCheck = { id:string; label:string; function:string };
export type ProjectMilestone = { id:string; title:string; objective:string; requirements:string[]; checks:ProjectCheck[] };
export type ProjectDataset = { path:string; format:string; rows:number; schema:string; purpose:string; sample:string };
export type ProjectV2 = {
 ref:string; slug:string; revision:string; title:string; level:string; analytical:boolean;
 objective:string; scenario:string; seed:number; generation:string; packages:PyPackage[];
 files:Record<string,string>; starters:Record<string,string>; reference:Record<string,string>;
 datasets:ProjectDataset[]; milestones:ProjectMilestone[]; acceptance:ProjectCheck[];
 artifacts:string[]; interpretation:string; invariants:Record<string,unknown>;
};
