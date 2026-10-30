"""Conservative SQL script policy for the local teaching lab, not a public SQL gateway."""
from __future__ import annotations
import re

FUNCTIONS = set('count sum avg min max round abs ceil ceiling floor coalesce nullif if ifnull nvl nvl2 cast try_cast decimal date timestamp to_date to_timestamp date_format date_trunc trunc year month day dayofmonth hour minute second datediff date_add date_sub add_months last_day current_date current_timestamp upper lower trim ltrim rtrim length substring substr concat concat_ws split size cardinality explode posexplode array map struct named_struct element_at array_contains array_distinct array_sort sort_array transform filter aggregate exists forall row_number rank dense_rank lag lead first last first_value last_value collect_list collect_set count_if count_distinct approx_count_distinct greatest least sqrt pow power log ln exp regexp_replace regexp_extract replace startswith endswith contains isnull isnan nanvl sha2 xxhash64 hash percentile_approx broadcast repartition coalesce grouping grouping_id grouping_sets cube rollup values in over as using partitioned by partition bucket sort range rows table distinct case when not and or except intersect union with select from where having on between int integer bigint smallint tinyint string double float boolean varchar char numeric dec array struct map parquet delta json csv text'.split())
BLOCKED = set('reflect java_method java reflect_call call invoke eval evaluate assert_true raise_error input_file_name input_file_block_start input_file_block_length monotonically_increasing_id uuid rand randn random spark_partition_id aes_encrypt aes_decrypt read_files jdbc python_udf register add list dfs load import export cache uncache refresh repair analyze optimize vacuum describe set reset use function functions jar jars resource resources transform_script reduce_script script lateral'.split())
BLOCKED.discard('set')  # UPDATE ... SET is allowed; standalone SET is rejected by the command allowlist.


def statements(source: str) -> list[tuple[str, int]]:
    """Quote/comment aware splitter. Preserve newlines for useful statement locations."""
    out, buf, start, line = [], [], 1, 1
    quote = None
    block = 0
    i = 0
    while i < len(source):
        c, pair = source[i], source[i:i+2]
        if block:
            if pair == '/*': block += 1; buf.extend('  '); i += 2; continue
            if pair == '*/': block -= 1; buf.extend('  '); i += 2; continue
            buf.append('\n' if c == '\n' else ' ')
        elif quote:
            buf.append(c)
            if c == '\\' and quote != '`' and i+1 < len(source):
                buf.append(source[i+1]); i += 2; continue
            if c == quote:
                if i+1 < len(source) and source[i+1] == quote:
                    buf.append(source[i+1]); i += 2; continue
                quote = None
        elif pair == '--':
            end = source.find('\n', i)
            if end == -1: break
            buf.extend(' ' * (end-i)); i = end; continue
        elif pair == '/*': block = 1; buf.extend('  '); i += 2; continue
        elif c in "'\"`": quote = c; buf.append(c)
        elif c == ';':
            text = ''.join(buf)
            if text.strip(): out.append((text, start + text[:len(text)-len(text.lstrip())].count('\n')))
            buf = []; start = line
        else: buf.append(c)
        if c == '\n': line += 1
        i += 1
    if quote or block: raise ValueError('Unclosed SQL quote or comment.')
    text = ''.join(buf)
    if text.strip(): out.append((text, start + text[:len(text)-len(text.lstrip())].count('\n')))
    if not out: raise ValueError('Write a SQL statement first.')
    if len(out) > 12: raise ValueError('A run supports up to 12 SQL statements.')
    return out


def validate(sql: str) -> None:
    # Single/double quotes are strings; backticks are identifiers, including quoted function names.
    strings = re.findall(r"'(?:''|\\.|[^'\\])*'|\"(?:\"\"|\\.|[^\"\\])*\"", sql, re.S)
    for literal in strings:
        value = literal[1:-1]
        if ('://' in value or value.startswith('/')) and (not value.startswith('/tmp/work/') or '..' in value.split('/')):
            raise ValueError('File operations must stay under /tmp/work/.')
    text = re.sub(r"'(?:''|\\.|[^'\\])*'|\"(?:\"\"|\\.|[^\"\\])*\"", ' ', sql, flags=re.S).replace('`', '').lower()
    words = re.findall(r'[a-z_][a-z_0-9]*', text)
    if not words: raise ValueError('Write a SQL statement first.')
    if set(words) & BLOCKED: raise ValueError('That SQL command or function is not available in this lab.')
    if re.search(r'\btransform\s*\([^;]*\)\s*using\b', text, re.S):
        raise ValueError('SQL script transformations are not available in this lab.')
    first = words[0]
    if first not in {'select', 'with', 'explain', 'create', 'insert', 'drop', 'update', 'delete', 'merge', 'show'}:
        raise ValueError('Use a query or a disposable table/view statement.')
    if first == 'create' and not re.match(r'create\s+(or\s+replace\s+)?((temporary|temp)\s+)?(view|table|database)\b', text):
        raise ValueError('Only tables, temporary views and disposable databases may be created.')
    if first == 'drop' and not re.match(r'drop\s+(table|view|database)\b', text): raise ValueError('Only disposable tables, views and databases may be dropped.')
    if first == 'show' and not re.match(r'show\s+(tables|databases|partitions)\b', text): raise ValueError('Use SHOW TABLES, DATABASES or PARTITIONS.')
    for provider in re.findall(r'\busing\s+([a-z_][a-z_0-9]*)', text):
        if provider not in {'parquet', 'delta', 'json', 'csv', 'text'}: raise ValueError('Only local Parquet, Delta, JSON, CSV and text providers are available.')
    if re.search(r'\boptions\s*\(', text): raise ValueError('Provider OPTIONS are unavailable; use a /tmp/work/ file path or CTAS.')
    declarations = set(re.findall(r'\b(?:create\s+table|insert\s+into)\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z_0-9]*)\s*\(', text))
    for fn in re.findall(r'([a-z_][a-z_0-9]*)\s*\(', text):
        if fn not in FUNCTIONS and fn not in declarations: raise ValueError(f'The function {fn} is not enabled in this lab.')
    for path in re.findall(r'`([^`]*[/\\][^`]*)`', sql):
        if not path.startswith('/tmp/work/') or '..' in path.split('/'): raise ValueError('File queries must stay under /tmp/work/.')
