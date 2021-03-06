"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.replace = replace;

var _model = require("../model");

var _transform = require("./transform");

var _step = require("./step");

var _map = require("./map");

var _tree = require("./tree");

function findMovedChunks(oldNode, oldPath, newNode, startDepth) {
  var moved = [];
  var newPath = oldPath.path.slice(0, startDepth);

  for (var depth = startDepth;; depth++) {
    var joined = depth == oldPath.depth ? 0 : 1;
    var cut = depth == oldPath.depth ? oldPath.offset : oldPath.path[depth];
    var afterCut = oldNode.maxOffset - cut;
    var newOffset = newNode.maxOffset - afterCut;

    var from = oldPath.shorten(depth, joined);
    var to = new _model.Pos(newPath, newOffset + joined);
    if (from.cmp(to)) moved.push(new _map.MovedRange(from, afterCut - joined, to));

    if (!joined) return moved;

    oldNode = oldNode.child(cut);
    newNode = newNode.child(newOffset);
    newPath = newPath.concat(newOffset);
  }
}

function replace(node, from, to, root, repl) {
  var depth = arguments.length <= 5 || arguments[5] === undefined ? 0 : arguments[5];

  if (depth == root.length) {
    var _ret = (function () {
      var before = (0, _model.sliceBefore)(node, from, depth);
      var after = (0, _model.sliceAfter)(node, to, depth),
          result = undefined;
      if (!repl.nodes.every(function (n) {
        return before.type.canContain(n);
      })) return {
          v: null
        };
      if (repl.nodes.length) result = before.append(repl.nodes, from.depth - depth, repl.openLeft).append(after.children, repl.openRight, to.depth - depth);else result = before.append(after.children, from.depth - depth, to.depth - depth);
      if (!result.length && !result.type.canBeEmpty) result = result.copy(result.type.defaultContent());
      return {
        v: { doc: result, moved: findMovedChunks(node, to, result, depth) }
      };
    })();

    if (typeof _ret === "object") return _ret.v;
  } else {
    var pos = root[depth];
    var result = replace(node.child(pos), from, to, root, repl, depth + 1);
    if (!result) return null;
    return { doc: node.replace(pos, result.doc), moved: result.moved };
  }
}

var nullRepl = { nodes: [], openLeft: 0, openRight: 0 };

(0, _step.defineStep)("replace", {
  apply: function apply(doc, step) {
    var rootPos = step.pos,
        root = rootPos.path;
    if (step.from.depth < root.length || step.to.depth < root.length) return null;
    for (var i = 0; i < root.length; i++) {
      if (step.from.path[i] != root[i] || step.to.path[i] != root[i]) return null;
    }var result = replace(doc, step.from, step.to, rootPos.path, step.param || nullRepl);
    if (!result) return null;
    var out = result.doc;
    var moved = result.moved;

    var end = moved.length ? moved[moved.length - 1].dest : step.to;
    var replaced = new _map.ReplacedRange(step.from, step.to, step.from, end, rootPos, rootPos);
    return new _transform.TransformResult(out, new _map.PosMap(moved, [replaced]));
  },
  invert: function invert(step, oldDoc, map) {
    var depth = step.pos.depth;
    return new _step.Step("replace", step.from, map.map(step.to).pos, step.from.shorten(depth), {
      nodes: (0, _model.childrenBetween)(oldDoc.path(step.pos.path), step.from, step.to, depth),
      openLeft: step.from.depth - depth,
      openRight: step.to.depth - depth
    });
  },
  paramToJSON: function paramToJSON(param) {
    return param && { nodes: param.nodes && param.nodes.map(function (n) {
        return n.toJSON();
      }),
      openLeft: param.openLeft, openRight: param.openRight };
  },
  paramFromJSON: function paramFromJSON(schema, json) {
    return json && { nodes: json.nodes && json.nodes.map(schema.nodeFromJSON),
      openLeft: json.openLeft, openRight: json.openRight };
  }
});

function shiftFromStack(stack, depth) {
  var shifted = stack[depth] = stack[depth].splice(0, 1, []);
  for (var i = depth - 1; i >= 0; i--) {
    shifted = stack[i] = stack[i].replace(0, shifted);
  }
}

// FIXME find a not so horribly confusing way to express this
function buildInserted(nodesLeft, source, start, end) {
  var sliced = (0, _model.sliceBetween)(source, start, end, false);
  var nodesRight = [];
  for (var node = sliced, i = 0; i <= start.path.length; i++, node = node.firstChild) {
    nodesRight.push(node);
  }var same = (0, _tree.samePathDepth)(start, end);
  var searchLeft = nodesLeft.length - 1,
      searchRight = nodesRight.length - 1;
  var result = null;

  var inner = nodesRight[searchRight];
  if (inner.isTextblock && inner.length && nodesLeft[searchLeft].isTextblock) {
    result = nodesLeft[searchLeft--].copy(inner.children);
    --searchRight;
    shiftFromStack(nodesRight, searchRight);
  }

  for (;;) {
    var node = nodesRight[searchRight],
        type = node.type,
        matched = null;
    var outside = searchRight <= same;
    for (var i = searchLeft; i >= 0; i--) {
      var left = nodesLeft[i];
      if (outside ? left.type.canContainChildren(node) : left.type == type) {
        matched = i;
        break;
      }
    }
    if (matched != null) {
      if (!result) {
        result = nodesLeft[matched].copy(node.children);
        searchLeft = matched - 1;
      } else {
        while (searchLeft >= matched) {
          result = nodesLeft[searchLeft].copy(searchLeft == matched ? [result].concat(node.children) : [result]);
          searchLeft--;
        }
      }
    }
    if (matched != null || node.length == 0) {
      if (outside) break;
      if (searchRight) shiftFromStack(nodesRight, searchRight - 1);
    }
    searchRight--;
  }

  var repl = { nodes: result ? result.children : [],
    openLeft: start.depth - searchRight,
    openRight: end.depth - searchRight };
  return { repl: repl, depth: searchLeft + 1 };
}

function moveText(tr, doc, before, after) {
  var root = (0, _tree.samePathDepth)(before, after);
  var cutAt = after.shorten(null, 1);
  while (cutAt.path.length > root && doc.path(cutAt.path).length == 1) cutAt = cutAt.shorten(null, 1);
  tr.split(cutAt, cutAt.path.length - root);
  var start = after,
      end = new _model.Pos(start.path, doc.path(start.path).maxOffset);
  var parent = doc.path(start.path.slice(0, root));
  var wanted = parent.pathNodes(before.path.slice(root));
  var existing = parent.pathNodes(start.path.slice(root));
  while (wanted.length && existing.length && wanted[0].sameMarkup(existing[0])) {
    wanted.shift();
    existing.shift();
  }
  if (existing.length || wanted.length) tr.step("ancestor", start, end, null, {
    depth: existing.length,
    wrappers: wanted.map(function (n) {
      return n.copy();
    })
  });
  for (var i = root; i < before.path.length; i++) {
    tr.join(before.shorten(i, 1));
  }
}

/**
 * Delete content between two positions.
 *
 * @param  {Pos} from
 * @param  {Pos} to
 * @return this
 */
_transform.Transform.prototype["delete"] = function (from, to) {
  if (from.cmp(to)) this.replace(from, to);
  return this;
};

/**
 * Replace the content between two positions.
 */
_transform.Transform.prototype.replace = function (from, to, source, start, end) {
  var repl = undefined,
      depth = undefined,
      doc = this.doc,
      maxDepth = (0, _tree.samePathDepth)(from, to);
  if (source) {
    ;
    var _buildInserted = buildInserted(doc.pathNodes(from.path), source, start, end);

    repl = _buildInserted.repl;
    depth = _buildInserted.depth;

    while (depth > maxDepth) {
      if (repl.nodes.length) repl = { nodes: [doc.path(from.path.slice(0, depth)).copy(repl.nodes)],
        openLeft: repl.openLeft + 1, openRight: repl.openRight + 1 };
      depth--;
    }
  } else {
    repl = nullRepl;
    depth = maxDepth;
  }
  var root = from.shorten(depth),
      docAfter = doc,
      after = to;
  if (repl.nodes.length || (0, _tree.replaceHasEffect)(doc, from, to)) {
    var result = this.step("replace", from, to, root, repl);
    docAfter = result.doc;
    after = result.map.map(to).pos;
  }

  // If no text nodes before or after end of replacement, don't glue text
  if (!doc.path(to.path).isTextblock) return this;
  if (!(repl.nodes.length ? source.path(end.path).isTextblock : doc.path(from.path).isTextblock)) return this;

  var nodesAfter = doc.path(root.path).pathNodes(to.path.slice(depth)).slice(1);
  var nodesBefore = undefined;
  if (repl.nodes.length) {
    var inserted = repl.nodes;
    nodesBefore = [];
    for (var i = 0; i < repl.openRight; i++) {
      var last = inserted[inserted.length - 1];
      nodesBefore.push(last);
      inserted = last.children;
    }
  } else {
    nodesBefore = doc.path(root.path).pathNodes(from.path.slice(depth)).slice(1);
  }

  if (nodesBefore.length && (nodesAfter.length != nodesBefore.length || !nodesAfter.every(function (n, i) {
    return n.sameMarkup(nodesBefore[i]);
  }))) {
    var _after$shorten = after.shorten(root.depth);

    var path = _after$shorten.path;
    var offset = _after$shorten.offset;var before = undefined;
    for (var node = docAfter.path(path), i = 0;; i++) {
      if (i == nodesBefore.length) {
        before = new _model.Pos(path, offset);
        break;
      }
      path.push(offset - 1);
      node = node.child(offset - 1);
      offset = node.maxOffset;
    }
    moveText(this, docAfter, before, after);
  }
  return this;
};

_transform.Transform.prototype.replaceWith = function (from, to, nodes) {
  if (!Array.isArray(nodes)) nodes = [nodes];
  if (!_model.Pos.samePath(from.path, to.path)) return this;
  this.step("replace", from, to, from, { nodes: nodes, openLeft: 0, openRight: 0 });
  return this;
};

/**
 * Insert a node at a given position.
 *
 * @param  {Pos}   pos
 * @param  {mixed} nodes
 * @return {this}
 */
_transform.Transform.prototype.insert = function (pos, nodes) {
  return this.replaceWith(pos, pos, nodes);
};

_transform.Transform.prototype.insertInline = function (pos, nodes) {
  if (!Array.isArray(nodes)) nodes = [nodes];
  var styles = (0, _model.spanStylesAt)(this.doc, pos);
  nodes = nodes.map(function (n) {
    return n.styled(styles);
  });
  return this.insert(pos, nodes);
};

_transform.Transform.prototype.insertText = function (pos, text) {
  return this.insertInline(pos, this.doc.type.schema.text(text));
};