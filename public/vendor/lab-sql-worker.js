// Python Database Lab: SQL on the learner's own SQLite file (bytes kept by the page, never a canonical dataset).
// One message in, one reply out. The page terminates this worker if a statement runs too long.
// `labRun` is plain so tests can call it with sql.js in Node (tests/python-lab.test.ts).
/* eslint-disable */
var MAX_ROWS = 500;

function labOpen(SQL, bytes) {
  return bytes && bytes.byteLength ? new SQL.Database(new Uint8Array(bytes)) : new SQL.Database();
}

function labQuote(name) {
  return '"' + String(name).replace(/"/g, '""') + '"';
}

function labRows(db, sql) {
  var res = db.exec(sql);
  return res.length ? res[0].values : [];
}

function labCell(v) {
  if (v instanceof Uint8Array) return "<blob " + v.length + " bytes>";
  return v;
}

function labMessage(e) {
  return String(e && e.message ? e.message : e);
}

/** Tables, views and indexes, with columns, keys and row counts. */
function labSchema(db) {
  var objects = labRows(db, "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type DESC, name");
  var tables = [];
  var views = [];
  var indexes = [];
  for (var i = 0; i < objects.length; i++) {
    var o = objects[i];
    if (o[0] === "table") {
      var cols = labRows(db, "PRAGMA table_info(" + labQuote(o[1]) + ")").map(function (c) {
        return { name: c[1], type: c[2], notnull: !!c[3], default: c[4], pk: c[5] };
      });
      var fks = labRows(db, "PRAGMA foreign_key_list(" + labQuote(o[1]) + ")").map(function (f) {
        return { column: f[3], table: f[2], to: f[4] };
      });
      var count = null;
      try { count = labRows(db, "SELECT COUNT(*) FROM " + labQuote(o[1]))[0][0]; } catch (e) { /* virtual or broken table */ }
      tables.push({ name: o[1], sql: o[3], columns: cols, foreignKeys: fks, rows: count });
    } else if (o[0] === "view") views.push({ name: o[1], sql: o[3] });
    else if (o[0] === "index") indexes.push({ name: o[1], table: o[2], sql: o[3] });
  }
  return { tables: tables, views: views, indexes: indexes };
}

/** Run every statement in order. Statements before an error stay applied, as with sqlite3's executescript. */
function labScript(db, sql) {
  var results = [];
  var error = null;
  var it = db.iterateStatements(sql);
  var index = 0;
  for (;;) {
    var stmt = null;
    try {
      var next = it.next();
      if (next.done) break;
      stmt = next.value;
      var columns = stmt.getColumnNames();
      var rows = [];
      var more = false;
      while (stmt.step()) {
        if (rows.length >= MAX_ROWS) { more = true; break; }
        rows.push(stmt.get().map(labCell));
      }
      var text = stmt.getSQL().trim();
      // sqlite3_changes() keeps the last write's count, so only report it for a statement that writes rows.
      var writes = !columns.length && /^(?:WITH\b[\s\S]*?\b)?(INSERT|UPDATE|DELETE|REPLACE)\b/i.test(text);
      results.push({ index: index, sql: text, columns: columns, rows: rows, more: more, changes: writes ? db.getRowsModified() : null });
      stmt.free();
      stmt = null;
      index++;
    } catch (e) {
      if (stmt) try { stmt.free(); } catch (x) { /* already freed */ }
      error = { index: index, message: labMessage(e) };
      break;
    }
  }
  // A transaction still open at the end is rolled back (as when a Python program ends without commit()).
  var rolledBack = false;
  try { db.run("ROLLBACK"); rolledBack = true; } catch (e) { /* no transaction was open */ }
  return { results: results, error: error, rolledBack: rolledBack };
}

/** EXPLAIN QUERY PLAN rows: { id, parent, detail }. */
function labPlan(db, sql) {
  return labRows(db, "EXPLAIN QUERY PLAN " + sql).map(function (r) { return { id: r[0], parent: r[1], detail: String(r[3]) }; });
}

function labRun(SQL, msg) {
  var db;
  try {
    db = labOpen(SQL, msg.bytes);
    db.exec("SELECT COUNT(*) FROM sqlite_master");
  } catch (e) {
    return { error: { index: 0, message: "This file is not a SQLite database: " + labMessage(e) } };
  }
  try {
    if (msg.op === "script") {
      var out = labScript(db, String(msg.sql || ""));
      var bytes = db.export();
      out.bytes = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
      out.schema = labSchema(db);
      return out;
    }
    if (msg.op === "plan") {
      try { return { plan: labPlan(db, String(msg.sql || "").trim().replace(/;\s*$/, "")) }; }
      catch (e) { return { error: { index: 0, message: labMessage(e) } }; }
    }
    if (msg.op === "browse") {
      var q = "SELECT * FROM " + labQuote(msg.table) + " LIMIT " + MAX_ROWS;
      var res = db.exec(q);
      return { results: [{ index: 0, sql: q, columns: res.length ? res[0].columns : [], rows: res.length ? res[0].values.map(function (r) { return r.map(labCell); }) : [], more: false, changes: null }] };
    }
    return { schema: labSchema(db) };
  } catch (e) {
    return { error: { index: 0, message: labMessage(e) } };
  } finally {
    db.close();
  }
}

if (typeof importScripts === "function") {
  importScripts("sql-wasm.js");
  var ready = initSqlJs({ locateFile: function (f) { return f; } });
  onmessage = function (e) {
    var msg = e.data || {};
    ready.then(function (SQL) {
      var reply = labRun(SQL, msg);
      reply.id = msg.id;
      postMessage(reply, reply.bytes ? [reply.bytes] : []);
    }, function () {
      postMessage({ id: msg.id, error: { index: 0, message: "The SQL engine could not load. Refresh and try again." } });
    });
  };
}
