import generated from './generated/canonical.json';
import {canonicalNames,type CanonicalDatasetId,type LearningDatasetRef} from './learning-map';
export type DatasetColumn={name:string;type:string;meaning:string;nullable:boolean};
export type DatasetTable={name:string;grain:string;primaryKey:string[];columns:DatasetColumn[];foreignKeys:Array<{columns:string[];table:string;references:string[]}>};
/** First rows of a table, shipped with the page; queries always run on the full data. */
export type DatasetPreview={columns:Array<{name:string;type:string;key:string|null;references?:string}>;result:{columns:string[];values:unknown[][]};total:number};
import {databaseSeed,type DatabaseRef} from '@/engine/sql-client';

/** Built by datasets/build.mjs. One canonical SQLite database per domain, shared by Learn and Practice. */
export type LearningMetadata={
 id:CanonicalDatasetId;name:string;version:string;description:string;domain:string;kind:'real'|'synthetic'|'hybrid';
 source:{publisher:string;url:string;release:string;license:string;licenseUrl:string;commercialReuse:'permitted';attribution:string;retrieved:string;transformations:string[]};
 coverage:{start:string;end:string;grain:string};
 tables:Array<DatasetTable&{indexes:string[][]}>;edgeCases:string[];qualityNotes:string[];concepts:string[];
 reproduction:{command:string;implementation:string;seed?:number;notes:string};
 rows:Record<string,number>;totals:{rows:number;tables:number;columns:number};
};
export type LearningAsset={
 ref:LearningDatasetRef;metadata:LearningMetadata;previews:Record<string,DatasetPreview>;
 asset:DatabaseRef&{bytes:number;gzipBytes:number};
 /** Directive seed: the worker loads the database file named on its first line. */
 seed:string;
 /** Changed-data fixture applied (inside a savepoint) to catch hard-coded answers. */
 mutation:string;
};
type Built={metadata:LearningMetadata;ref:LearningDatasetRef;asset:DatabaseRef&{bytes:number;gzipBytes:number};previews:Record<string,DatasetPreview>;mutation:string};
export const learningDatasets=Object.fromEntries(Object.entries(generated as unknown as Record<CanonicalDatasetId,Built>).map(([id,d])=>[id,{
 ref:d.ref,metadata:d.metadata,previews:d.previews,asset:d.asset,seed:databaseSeed(d.asset),mutation:d.mutation,
}])) as Record<CanonicalDatasetId,LearningAsset>;
export const learningCatalog=Object.values(learningDatasets).map(d=>d.metadata);
export const learningDatasetInfo=Object.fromEntries(learningCatalog.map(d=>[d.id,{name:canonicalNames[d.id],role:`${d.domain} analyst`,description:d.description,tables:d.tables.map(t=>t.name)}]));
export const CANONICAL_VERSION='3.0.0';
export function learningDataset(ref:LearningDatasetRef):LearningAsset{
 const asset=learningDatasets[ref.datasetId];if(!asset||asset.ref.datasetVersion!==ref.datasetVersion)throw Error(`Unavailable canonical dataset ${ref.datasetId}@${ref.datasetVersion}`);return asset;
}
/** Dataset that owns a canonical database URL (used to resolve schemas for directive seeds). */
export function datasetForUrl(url:string):LearningAsset|undefined{return Object.values(learningDatasets).find(d=>d.asset.url===url);}
