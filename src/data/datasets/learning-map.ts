/** One public identity per domain. These names are the Learn/Practice contract. */
export const canonicalNames = {
 retail:'Retail', flights:'U.S. Flights', saas:'Product / SaaS Analytics', mobility:'Mobility',weather:'Weather',energy:'Energy',payments:'Finance / Payments',healthcare:'Healthcare',iot:'IoT / Sensors',logistics:'Logistics',developer:'Developer Platform',sports:'Sports',
} as const;
export type CanonicalDatasetId=keyof typeof canonicalNames;
export type LearningDatasetRef={datasetId:CanonicalDatasetId;datasetVersion:string};
