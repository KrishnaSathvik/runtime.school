import catalog from './catalog.json';
import type {ProjectV2} from './model';
export const projectsV2=catalog as unknown as ProjectV2[];
export const projectV2=(slug:string)=>projectsV2.find(p=>p.slug===slug);
