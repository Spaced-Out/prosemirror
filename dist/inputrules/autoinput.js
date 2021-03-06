"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _model = require("../model");

var _edit = require("../edit");

var _inputrules = require("./inputrules");

(0, _edit.defineOption)("autoInput", false, function (pm, val, old) {
  if (val && !old) (0, _inputrules.addInputRules)(pm, rules);else if (!val && old) (0, _inputrules.removeInputRules)(pm, rules);
});

var rules = [new _inputrules.Rule("-", /--$/, "—"), new _inputrules.Rule('"', /\s(")$/, "“"), new _inputrules.Rule('"', /"$/, "”"), new _inputrules.Rule("'", /\s(')$/, "‘"), new _inputrules.Rule("'", /'$/, "’"), new _inputrules.Rule(" ", /^\s*> $/, function (pm, _, pos) {
  wrapAndJoin(pm, pos, "blockquote");
}), new _inputrules.Rule(" ", /^(\d+)\. $/, function (pm, match, pos) {
  var order = +match[1];
  wrapAndJoin(pm, pos, "ordered_list", { order: order || null, tight: true }, function (node) {
    return node.length + (node.attrs.order || 1) == order;
  });
}), new _inputrules.Rule(" ", /^\s*([-+*]) $/, function (pm, match, pos) {
  var bullet = match[1];
  wrapAndJoin(pm, pos, "bullet_list", { bullet: bullet, tight: true }, function (node) {
    return node.attrs.bullet == bullet;
  });
}), new _inputrules.Rule("`", /^```$/, function (pm, _, pos) {
  setAs(pm, pos, "code_block", { params: "" });
}), new _inputrules.Rule(" ", /^(#{1,6}) $/, function (pm, match, pos) {
  setAs(pm, pos, "heading", { level: match[1].length });
})];

exports.rules = rules;
function wrapAndJoin(pm, pos, type) {
  var attrs = arguments.length <= 3 || arguments[3] === undefined ? null : arguments[3];
  var predicate = arguments.length <= 4 || arguments[4] === undefined ? null : arguments[4];

  var before = pos.shorten();
  var sibling = before.offset > 0 && pm.doc.path(before.path).child(before.offset - 1);
  var join = sibling && sibling.type.name == type && (!predicate || predicate(sibling));
  var tr = pm.tr.wrap(pos, pos, pm.schema.node(type, attrs));
  var delPos = tr.map(pos).pos;
  tr["delete"](new _model.Pos(delPos.path, 0), delPos);
  if (join) tr.join(before);
  tr.apply();
}

function setAs(pm, pos, type, attrs) {
  pm.tr.setBlockType(pos, pos, pm.schema.node(type, attrs))["delete"](new _model.Pos(pos.path, 0), pos).apply();
}