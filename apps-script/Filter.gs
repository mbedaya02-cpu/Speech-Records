/**
 * Filter.gs — a small evaluator for the PocketBase-style filter strings the site sends, e.g.
 *   status = "سارية" && end_date <= "2026-10-30 23:59:59.999Z" && patient.status != "مُخرَّج"
 *   full_name ~ "أحمد" || file_no ~ "12"
 *   therapists.id ?= "abc"
 * Supported: && || ( )  = != < <= > >= ~ !~ ?= ?!= ?~
 * Values: "strings", 'strings', numbers, true, false, null. Fields: dotted paths through relations.
 */

var RELATIONS = {
  patients: { center: 'centers', therapists: 'users' },
  plans: { patient: 'patients', center: 'centers', therapist: 'users', previous: 'plans' },
  reports: { patient: 'patients', center: 'centers', therapist: 'users', plan: 'plans', previous: 'reports' },
  users: { centers: 'centers' },
  audit_log: { user: 'users' },
};

var Filter = (function () {
  function tokenize(s) {
    var out = [], i = 0;
    while (i < s.length) {
      var c = s.charAt(i);
      if (/\s/.test(c)) { i++; continue; }
      if (c === '(' || c === ')') { out.push({ t: c }); i++; continue; }
      if (s.substr(i, 2) === '&&' || s.substr(i, 2) === '||') { out.push({ t: s.substr(i, 2) }); i += 2; continue; }
      var m = s.slice(i).match(/^(\?!=|\?=|\?~|\?!~|!=|<=|>=|!~|=|<|>|~)/);
      if (m) { out.push({ t: 'op', v: m[1] }); i += m[1].length; continue; }
      if (c === '"' || c === "'") {
        var q = c, j = i + 1, v = '';
        while (j < s.length && s.charAt(j) !== q) { if (s.charAt(j) === '\\') { j++; } v += s.charAt(j); j++; }
        out.push({ t: 'val', v: v }); i = j + 1; continue;
      }
      m = s.slice(i).match(/^-?\d+(\.\d+)?/);
      if (m) { out.push({ t: 'val', v: Number(m[0]) }); i += m[0].length; continue; }
      m = s.slice(i).match(/^[A-Za-z_@][A-Za-z0-9_.:@]*/);
      if (m) {
        var w = m[0];
        if (w === 'true') out.push({ t: 'val', v: true });
        else if (w === 'false') out.push({ t: 'val', v: false });
        else if (w === 'null') out.push({ t: 'val', v: null });
        else out.push({ t: 'id', v: w });
        i += w.length; continue;
      }
      throw apiError(400, 'Invalid filter near: ' + s.slice(i, i + 20));
    }
    return out;
  }

  function parse(tokens) {
    var p = 0;
    function peek() { return tokens[p]; }
    function expr() {
      var left = term();
      while (peek() && peek().t === '||') { p++; var r = term(); left = { or: [left, r] }; }
      return left;
    }
    function term() {
      var left = factor();
      while (peek() && peek().t === '&&') { p++; var r = factor(); left = { and: [left, r] }; }
      return left;
    }
    function factor() {
      var t = peek();
      if (!t) throw apiError(400, 'Invalid filter.');
      if (t.t === '(') { p++; var e = expr(); if (!peek() || peek().t !== ')') throw apiError(400, 'Missing ).'); p++; return e; }
      var a = operand(); var op = tokens[p++];
      if (!op || op.t !== 'op') throw apiError(400, 'Invalid filter operator.');
      var b = operand();
      return { cmp: op.v, a: a, b: b };
    }
    function operand() {
      var t = tokens[p++];
      if (!t || (t.t !== 'id' && t.t !== 'val')) throw apiError(400, 'Invalid filter operand.');
      return t;
    }
    var tree = expr();
    if (p < tokens.length) throw apiError(400, 'Invalid filter (trailing).');
    return tree;
  }

  // Resolve a dotted path -> array of values (relations can fan out)
  function resolve(coll, rec, path) {
    var parts = path.split('.');
    var cur = [{ coll: coll, rec: rec }];
    for (var i = 0; i < parts.length; i++) {
      var key = parts[i], next = [];
      var last = i === parts.length - 1;
      cur.forEach(function (c) {
        if (!c.rec) return;
        var v = c.rec[key];
        var relColl = RELATIONS[c.coll] && RELATIONS[c.coll][key];
        if (last) {
          if (Array.isArray(v)) v.forEach(function (x) { next.push(x); });
          else next.push(v === undefined ? '' : v);
        } else if (relColl) {
          (Array.isArray(v) ? v : [v]).forEach(function (id) {
            if (id) next.push({ coll: relColl, rec: Db.get(relColl, id) });
          });
        }
      });
      cur = next;
    }
    return cur;
  }

  function norm(v) { return v === null || v === undefined ? '' : v; }
  function cmp1(op, x, y) {
    x = norm(x); y = norm(y);
    if (typeof y === 'boolean' || typeof x === 'boolean') { x = x === true || x === 'true'; y = y === true || y === 'true'; }
    var numeric = typeof x === 'number' && typeof y === 'number';
    var a = numeric ? x : String(x), b = numeric ? y : String(y);
    switch (op) {
      case '=': return a === b;
      case '!=': return a !== b;
      case '<': return a < b;
      case '<=': return a <= b;
      case '>': return a > b;
      case '>=': return a >= b;
      case '~': return String(x).toLowerCase().indexOf(String(y).toLowerCase()) >= 0;
      case '!~': return String(x).toLowerCase().indexOf(String(y).toLowerCase()) < 0;
    }
    return false;
  }

  function evaluate(node, coll, rec) {
    if (node.and) return evaluate(node.and[0], coll, rec) && evaluate(node.and[1], coll, rec);
    if (node.or) return evaluate(node.or[0], coll, rec) || evaluate(node.or[1], coll, rec);
    var xs = node.a.t === 'id' ? resolve(coll, rec, node.a.v) : [node.a.v];
    var y = node.b.t === 'id' ? resolve(coll, rec, node.b.v)[0] : node.b.v;
    var op = node.cmp;
    if (op.charAt(0) === '?') {
      var base = op.slice(1);
      return xs.some(function (x) { return cmp1(base, x, y); });
    }
    if (!xs.length) xs = [''];
    // non-"any" operators on a multi value: PocketBase requires all to match
    return xs.every(function (x) { return cmp1(op, x, y); });
  }

  return {
    compile: function (s) {
      if (!s || !String(s).trim()) return function () { return true; };
      var tree = parse(tokenize(String(s)));
      return function (coll, rec) { return evaluate(tree, coll, rec); };
    },
  };
})();
