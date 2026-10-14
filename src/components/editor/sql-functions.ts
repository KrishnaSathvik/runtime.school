/**
 * SQL functions painted as functions when they are called (`name(`).
 * Statement keywords such as REPLACE and LIKE stay keywords.
 */
export const SQL_FUNCTIONS = [
  "abs", "avg", "char", "coalesce", "concat", "concat_ws", "count",
  "date", "datetime", "dense_rank", "first_value", "format", "group_concat",
  "hex", "ifnull", "iif", "instr", "julianday", "lag", "last_insert_rowid",
  "last_value", "lead", "length", "likelihood", "likely", "lower", "ltrim",
  "max", "min", "nullif", "nth_value", "ntile", "octet_length", "percent_rank",
  "printf", "quote", "random", "randomblob", "rank", "round", "row_number",
  "rtrim", "sign", "soundex", "sqlite_version", "strftime", "substr",
  "substring", "sum", "time", "total", "trim", "typeof", "unicode",
  "unixepoch", "unlikely", "upper", "zeroblob",
  "json", "json_array", "json_array_length", "json_each", "json_extract",
  "json_group_array", "json_group_object", "json_insert", "json_object",
  "json_patch", "json_remove", "json_replace", "json_set", "json_tree",
  "json_type", "json_valid",
  "acos", "acosh", "asin", "asinh", "atan", "atan2", "atanh", "ceil",
  "ceiling", "cos", "cosh", "degrees", "exp", "floor", "ln", "log", "log10",
  "log2", "mod", "pi", "pow", "power", "radians", "sin", "sinh", "sqrt",
  "tan", "tanh", "trunc",
  "array_agg", "date_part", "date_trunc", "extract", "generate_series",
  "greatest", "least", "lpad", "now", "position", "regexp_match",
  "regexp_replace", "rpad", "split_part", "string_agg", "to_char", "to_date",
  "width_bucket",
] as const;

export const SQL_FUNCTION_SET: ReadonlySet<string> = new Set(SQL_FUNCTIONS);

/** True when `word` at `index` is a function call, not a bare keyword. */
export function isSqlFunctionCall(source: string, index: number, word: string): boolean {
  if (!SQL_FUNCTION_SET.has(word.toLowerCase())) return false;
  let i = index + word.length;
  while (i < source.length && (source[i] === " " || source[i] === "\t" || source[i] === "\n" || source[i] === "\r")) i += 1;
  return source[i] === "(";
}
