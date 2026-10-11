import type { BankQuestion } from './types';
const context={version:1,datasetId:'market',mode:'query' as const,ordered:true,prerequisites:[33,56],tables:['market_raw_import']};
const codes = `WITH normalized AS (SELECT id,UPPER(TRIM(raw_code)) AS code FROM market_raw_import)
SELECT id AS import_id,CAST(SUBSTR(code,4,4) AS INTEGER) AS item_number,SUBSTR(code,9,2) AS region
FROM normalized WHERE LENGTH(code)=10 AND SUBSTR(code,1,3)='HM-' AND SUBSTR(code,8,1)='-'
AND SUBSTR(code,4,4) NOT GLOB '*[^0-9]*' AND CAST(SUBSTR(code,4,4) AS INTEGER)>0
AND SUBSTR(code,9,2) NOT GLOB '*[^A-Z]*' ORDER BY import_id`;
const emails = `WITH normalized AS (
SELECT id,LOWER(TRIM(raw_email,char(9)||char(10)||char(13)||' ')) AS email FROM market_raw_import
), split AS (SELECT *,SUBSTR(email,INSTR(email,'@')+1) AS domain FROM normalized), valid AS (
SELECT * FROM split WHERE LENGTH(email)-LENGTH(REPLACE(email,'@',''))=1 AND INSTR(email,'@')>1
AND INSTR(domain,'.')>1 AND SUBSTR(domain,-1)<>'.' AND INSTR(domain,'..')=0
AND INSTR(email,' ')=0 AND INSTR(email,char(9))=0 AND INSTR(email,char(10))=0 AND INSTR(email,char(13))=0)
SELECT email AS normalized_email,COUNT(*) AS source_rows,MIN(id) AS first_id FROM valid
GROUP BY email HAVING COUNT(*)>1 ORDER BY normalized_email`;
const money = `WITH stripped AS (SELECT id,TRIM(raw_amount) AS raw FROM market_raw_import),
unsigned AS (SELECT *,CASE WHEN SUBSTR(raw,1,1) IN ('+','-') THEN SUBSTR(raw,2) ELSE raw END AS body,
CASE WHEN SUBSTR(raw,1,1)='-' THEN -1 ELSE 1 END AS sign FROM stripped),
parts AS (SELECT *,CASE WHEN INSTR(body,'.')=0 THEN body ELSE SUBSTR(body,1,INSTR(body,'.')-1) END AS whole,
CASE WHEN INSTR(body,'.')=0 THEN '' ELSE SUBSTR(body,INSTR(body,'.')+1) END AS fraction FROM unsigned),
checked AS (SELECT *,CASE WHEN LENGTH(whole) BETWEEN 1 AND 6 AND whole NOT GLOB '*[^0-9]*'
AND (INSTR(body,'.')=0 OR (LENGTH(fraction) BETWEEN 1 AND 2 AND fraction NOT GLOB '*[^0-9]*')) THEN 1 ELSE 0 END AS valid FROM parts)
SELECT id AS import_id,CASE WHEN valid=1 THEN sign*(CAST(whole AS INTEGER)*100+CAST(SUBSTR(fraction||'00',1,2) AS INTEGER)) END AS cents,
CASE WHEN valid=1 THEN 'valid' ELSE 'invalid' END AS status FROM checked ORDER BY import_id`;
export const textQuestions: BankQuestion[]=[{
 ...context,id:'qb-0064',slug:'parse-import-product-codes',title:'Parse malformed product codes',difficulty:'medium',primaryTopic:'cleaning.strings',topicTags:['cleaning.validation'],
 difficultyWhy:'Validate the entire token before extracting typed fields; CAST alone accepts malformed numeric prefixes.',objective:'Normalize and validate a fixed-format identifier before parsing it.',
 task:'Normalize raw_code by trimming ASCII spaces and uppercasing it. Keep only codes of the exact form HM-DDDD-AA, where DDDD is four ASCII digits representing 1–9999 and AA is two ASCII letters. Return import_id, integer item_number and uppercase region.',
 columns:['import_id','item_number','region'],rules:['Reject NULL, 0000, extra characters, internal spaces and malformed delimiters. Order by import_id.', 'Region is any pair of ASCII letters, not a lookup against a country list.'],
 hints:['Check exact length and delimiter positions before casting.', 'NOT GLOB with a negated character class rejects a non-digit anywhere in a substring.'],solution:codes,
 explanation:'SQLite CAST can turn 12x4 into 12, so successful conversion is not evidence of a valid identifier. Whole-token structural and character checks protect the parsed fields; normalization handles harmless case and outer-space differences.',
 wrong:[{sql:codes.replace("AND SUBSTR(code,4,4) NOT GLOB '*[^0-9]*'",''),mistake:'Accepts malformed digits because CAST returns a numeric prefix.'},{sql:codes.replace('UPPER(TRIM(raw_code))','TRIM(raw_code)'),mistake:'Rejects valid lowercase import codes instead of normalizing them.'}],
},{
 ...context,id:'qb-0065',slug:'normalize-contact-imports',title:'Normalize contact import collisions',difficulty:'medium',primaryTopic:'cleaning.strings',topicTags:['cleaning.dedupe','cleaning.validation'],
 difficultyWhy:'Apply an explicit normalization and validity contract before grouping, without collapsing meaningful aliases.',objective:'Find normalized duplicate contacts while excluding malformed identifiers.',
 task:'Find duplicate valid emails after lowercasing and trimming outer ASCII spaces, tabs, carriage returns and line feeds. Return normalized_email, source_rows and the smallest source id as first_id.',
 columns:['normalized_email','source_rows','first_id'],rules:['For this exercise only: exactly one @; a nonempty local part; domain has a dot that is neither its first nor last character; no consecutive domain dots; no ASCII space, tab, CR or LF anywhere after trimming.', 'This is a deliberately limited import rule, not full email-standard validation. Keep plus aliases distinct; do not remove dots or plus suffixes.', 'Return only groups with more than one valid source row, ordered by normalized_email.'],
 hints:['TRIM can take an explicit character set built with char(9), char(10), char(13) and space.', 'Count @ characters using the length difference before and after REPLACE.'],solution:emails,
 explanation:'Normalize only differences the contract declares harmless. Validity checks run before aggregation, so repeated malformed emails do not create misleading collision groups and plus aliases keep their meaning.',
 wrong:[{sql:emails.replace("TRIM(raw_email,char(9)||char(10)||char(13)||' ')",'TRIM(raw_email)'),mistake:'Leaves tabs and line breaks around otherwise matching addresses.'},{sql:emails.replace("LENGTH(email)-LENGTH(REPLACE(email,'@',''))=1", "INSTR(email,'@')>0"),mistake:'Allows multiple @ symbols and groups malformed addresses.'}],
},{
 ...context,id:'qb-0066',slug:'parse-exact-money-cents',title:'Parse money into exact integer cents',difficulty:'hard',primaryTopic:'cleaning.validation',topicTags:['cleaning.strings','cleaning.case'],
 difficultyWhy:'Validate sign, decimal grammar and digit limits, then compute cents without permissive casts or floating-point rounding.',objective:'Turn validated decimal text into exact integer minor units.',
 task:'For every import row, parse raw_amount into cents or NULL and label status valid or invalid. Trim outer ASCII spaces. Accept an optional leading + or -, one to six ASCII whole-number digits, and optionally a decimal point followed by one or two ASCII digits.',
 columns:['import_id','cents','status'],rules:['Leading zeros count toward the six-digit limit. Signed zero is valid. Missing whole digits, a trailing dot, exponents, separators, currency symbols and NULL are invalid.', 'Use integer cents: 19.99 is 1999 and -0.29 is -29. No floating-point tolerance is intended. Return every row ordered by import_id.'],
 hints:['Remove one optional sign, then split the unsigned body at its first dot.', 'Validate both digit substrings before casting. Pad the fraction to two places, then combine whole*100 + fraction.'],solution:money,
 explanation:'Permissive numeric casts accept invalid prefixes and REAL arithmetic can lose a cent through binary rounding. Splitting validated text into integer components avoids both problems and preserves explicit invalid rows.',
 wrong:[{sql:"SELECT id AS import_id,CAST(CAST(raw_amount AS REAL)*100 AS INTEGER) AS cents,'valid' AS status FROM market_raw_import ORDER BY import_id",mistake:'Treats permissive casts as validation and uses floating-point money.'},{sql:money.replace('LENGTH(whole) BETWEEN 1 AND 6','LENGTH(whole) BETWEEN 1 AND 7'),mistake:'Accepts a whole-number part beyond the stated digit limit.'}],
}];
