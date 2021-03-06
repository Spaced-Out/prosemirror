"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.posFromDOM = posFromDOM;
exports.rangeFromDOMLoose = rangeFromDOMLoose;
exports.findByPath = findByPath;
exports.resolvePath = resolvePath;
exports.hasFocus = hasFocus;
exports.posAtCoords = posAtCoords;
exports.coordsAtPos = coordsAtPos;
exports.scrollIntoView = scrollIntoView;
exports.findSelectionFrom = findSelectionFrom;
exports.findSelectionNear = findSelectionNear;
exports.findSelectionAtStart = findSelectionAtStart;
exports.findSelectionAtEnd = findSelectionAtEnd;
exports.selectableNodeAbove = selectableNodeAbove;
exports.verticalMotionLeavesTextblock = verticalMotionLeavesTextblock;
exports.setDOMSelectionToPos = setDOMSelectionToPos;

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _model = require("../model");

var _dom = require("../dom");

var SelectionState = (function () {
  function SelectionState(pm) {
    var _this = this;

    _classCallCheck(this, SelectionState);

    this.pm = pm;

    this.range = findSelectionAtStart(pm.doc);
    this.lastNonNodePos = null;

    this.pollState = null;
    this.pollTimeout = null;
    this.lastAnchorNode = this.lastHeadNode = this.lastAnchorOffset = this.lastHeadOffset = null;
    this.lastNode = null;

    pm.content.addEventListener("focus", function () {
      return _this.receivedFocus();
    });
  }

  _createClass(SelectionState, [{
    key: "setAndSignal",
    value: function setAndSignal(range, clearLast) {
      this.set(range, clearLast);
      this.pm.signal("selectionChange");
    }
  }, {
    key: "set",
    value: function set(range, clearLast) {
      this.range = range;
      if (!range.node) this.lastNonNodePos = null;
      if (clearLast !== false) this.lastAnchorNode = null;
    }
  }, {
    key: "setNodeAndSignal",
    value: function setNodeAndSignal(pos) {
      this.setNode(pos);
      this.pm.signal("selectionChange");
    }
  }, {
    key: "pollForUpdate",
    value: function pollForUpdate() {
      var _this2 = this;

      if (this.pm.input.composing) return;
      clearTimeout(this.pollTimeout);
      this.pollState = "update";
      var n = 0,
          check = function check() {
        if (_this2.pm.input.composing) {
          // Abort
        } else if (_this2.pm.operation) {
            _this2.pollTimeout = setTimeout(check, 20);
          } else if (!_this2.readUpdate() && ++n == 1) {
            _this2.pollTimeout = setTimeout(check, 50);
          } else {
            _this2.pollState = null;
            _this2.pollToSync();
          }
      };
      this.pollTimeout = setTimeout(check, 20);
    }
  }, {
    key: "domChanged",
    value: function domChanged() {
      var sel = getSelection();
      return sel.anchorNode != this.lastAnchorNode || sel.anchorOffset != this.lastAnchorOffset || sel.focusNode != this.lastHeadNode || sel.focusOffset != this.lastHeadOffset;
    }
  }, {
    key: "storeDOMState",
    value: function storeDOMState() {
      var sel = getSelection();
      this.lastAnchorNode = sel.anchorNode;this.lastAnchorOffset = sel.anchorOffset;
      this.lastHeadNode = sel.focusNode;this.lastHeadOffset = sel.focusOffset;
    }
  }, {
    key: "readUpdate",
    value: function readUpdate() {
      if (this.pm.input.composing || !hasFocus(this.pm) || !this.domChanged()) return false;

      var sel = getSelection(),
          doc = this.pm.doc;
      var anchor = posFromDOMInner(this.pm, sel.anchorNode, sel.anchorOffset);
      var head = posFromDOMInner(this.pm, sel.focusNode, sel.focusOffset);
      var newSel = findSelectionNear(doc, head, this.range.head && this.range.head.cmp(head) < 0 ? -1 : 1);
      if (newSel instanceof TextSelection && doc.path(anchor.path).isTextblock) newSel = new TextSelection(anchor, newSel.head);
      this.setAndSignal(newSel);
      if (newSel instanceof NodeSelection || newSel.head.cmp(head) || newSel.anchor.cmp(anchor)) {
        this.toDOM();
      } else {
        this.clearNode();
        this.storeDOMState();
      }
      return true;
    }
  }, {
    key: "pollToSync",
    value: function pollToSync() {
      var _this3 = this;

      if (this.pollState) return;
      this.pollState = "sync";
      var sync = function sync() {
        if (document.activeElement != _this3.pm.content) {
          _this3.pollState = null;
        } else {
          if (!_this3.pm.operation && !_this3.pm.input.composing) _this3.syncDOM();
          _this3.pollTimeout = setTimeout(sync, 200);
        }
      };
      this.pollTimeout = setTimeout(sync, 200);
    }
  }, {
    key: "syncDOM",
    value: function syncDOM() {
      if (!this.pm.input.composing && hasFocus(this.pm) && this.domChanged()) this.toDOM();
    }
  }, {
    key: "toDOM",
    value: function toDOM(takeFocus) {
      if (this.range instanceof NodeSelection) this.nodeToDOM(takeFocus);else this.rangeToDOM(takeFocus);
    }
  }, {
    key: "nodeToDOM",
    value: function nodeToDOM(takeFocus) {
      window.getSelection().removeAllRanges();
      if (takeFocus) this.pm.content.focus();
      var pos = this.range.from,
          node = this.range.node,
          dom = undefined;
      if (node.isInline) dom = findByOffset(resolvePath(this.pm.content, pos.path), pos.offset, true).node;else dom = resolvePath(this.pm.content, pos.toPath());
      if (dom == this.lastNode) return;
      this.clearNode();
      addNodeSelection(node, dom);
      this.lastNode = dom;
    }
  }, {
    key: "clearNode",
    value: function clearNode() {
      if (this.lastNode) {
        clearNodeSelection(this.lastNode);
        this.lastNode = null;
        return true;
      }
    }
  }, {
    key: "rangeToDOM",
    value: function rangeToDOM(takeFocus) {
      var sel = window.getSelection();
      if (!this.clearNode() && !hasFocus(this.pm)) {
        if (!takeFocus) return;
        // See https://bugzilla.mozilla.org/show_bug.cgi?id=921444
        else if (_dom.browser.gecko) this.pm.content.focus();
      }
      if (!this.domChanged()) return;

      var range = document.createRange();
      var content = this.pm.content;
      var anchor = DOMFromPos(content, this.range.anchor);
      var head = DOMFromPos(content, this.range.head);

      if (sel.extend) {
        range.setEnd(anchor.node, anchor.offset);
        range.collapse(false);
      } else {
        if (this.range.anchor.cmp(this.range.head) > 0) {
          var tmp = anchor;anchor = head;head = tmp;
        }
        range.setEnd(head.node, head.offset);
        range.setStart(anchor.node, anchor.offset);
      }
      sel.removeAllRanges();
      sel.addRange(range);
      if (sel.extend) sel.extend(head.node, head.offset);
      this.storeDOMState();
    }
  }, {
    key: "receivedFocus",
    value: function receivedFocus() {
      if (!this.pollState) this.pollToSync();
    }
  }, {
    key: "beforeStartOp",
    value: function beforeStartOp() {
      if (this.pollState == "update" && this.readUpdate()) {
        clearTimeout(this.pollTimeout);
        this.pollState = null;
        this.pollToSync();
      } else {
        this.syncDOM();
      }
    }
  }]);

  return SelectionState;
})();

exports.SelectionState = SelectionState;

function clearNodeSelection(dom) {
  dom.classList.remove("ProseMirror-selectednode");
}

function addNodeSelection(_node, dom) {
  dom.classList.add("ProseMirror-selectednode");
}

function windowRect() {
  return { left: 0, right: window.innerWidth,
    top: 0, bottom: window.innerHeight };
}

var Selection = function Selection() {
  _classCallCheck(this, Selection);
};

exports.Selection = Selection;

var NodeSelection = (function (_Selection) {
  _inherits(NodeSelection, _Selection);

  function NodeSelection(from, to, node) {
    _classCallCheck(this, NodeSelection);

    _get(Object.getPrototypeOf(NodeSelection.prototype), "constructor", this).call(this);
    this.from = from;
    this.to = to;
    this.node = node;
  }

  /**
   * Text selection range class.
   *
   * A range consists of a head (the active location of the cursor)
   * and an anchor (the start location of the selection).
   */

  _createClass(NodeSelection, [{
    key: "eq",
    value: function eq(other) {
      return other instanceof NodeSelection && !this.from.cmp(other.from);
    }
  }, {
    key: "map",
    value: function map(doc, mapping) {
      var from = mapping.map(this.from, 1).pos;
      var to = mapping.map(this.to, -1).pos;
      if (_model.Pos.samePath(from.path, to.path) && from.offset == to.offset - 1) {
        var _parent = doc.path(from.path);
        var node = _parent.isTextblock ? _parent.childAfter(from.offset).node : _parent.child(from.offset);
        if (node.type.selectable) return new NodeSelection(from, to, node);
      }
      return findSelectionNear(doc, from);
    }
  }, {
    key: "empty",
    get: function get() {
      return false;
    }
  }]);

  return NodeSelection;
})(Selection);

exports.NodeSelection = NodeSelection;

var TextSelection = (function (_Selection2) {
  _inherits(TextSelection, _Selection2);

  function TextSelection(anchor, head) {
    _classCallCheck(this, TextSelection);

    _get(Object.getPrototypeOf(TextSelection.prototype), "constructor", this).call(this);
    this.anchor = anchor;
    this.head = head || anchor;
  }

  _createClass(TextSelection, [{
    key: "eq",
    value: function eq(other) {
      return other instanceof TextSelection && !other.head.cmp(this.head) && !other.anchor.cmp(this.anchor);
    }
  }, {
    key: "map",
    value: function map(doc, mapping) {
      var head = mapping.map(this.head).pos;
      if (!doc.path(head.path).isTextblock) return findSelectionNear(doc, head);
      var anchor = mapping.map(this.anchor).pos;
      return new TextSelection(doc.path(anchor.path).isTextblock ? anchor : head, head);
    }
  }, {
    key: "inverted",
    get: function get() {
      return this.anchor.cmp(this.head) > 0;
    }
  }, {
    key: "from",
    get: function get() {
      return this.inverted ? this.head : this.anchor;
    }
  }, {
    key: "to",
    get: function get() {
      return this.inverted ? this.anchor : this.head;
    }
  }, {
    key: "empty",
    get: function get() {
      return this.anchor.cmp(this.head) == 0;
    }
  }]);

  return TextSelection;
})(Selection);

exports.TextSelection = TextSelection;

function pathFromNode(node) {
  var path = [];
  for (;;) {
    var attr = node.getAttribute("pm-path");
    if (!attr) return path;
    path.unshift(+attr);
    node = node.parentNode;
  }
}

function posFromDOMInner(pm, node, domOffset, loose) {
  if (!loose && pm.operation && pm.doc != pm.operation.doc) throw new Error("Fetching a position from an outdated DOM structure");

  var extraOffset = 0,
      tag = undefined;
  for (;;) {
    if (node.nodeType == 3) extraOffset += domOffset;else if (node.hasAttribute("pm-path") || node == pm.content) break;else if (tag = node.getAttribute("pm-span-offset")) extraOffset += +tag;

    var _parent2 = node.parentNode;
    domOffset = Array.prototype.indexOf.call(_parent2.childNodes, node) + (node.nodeType != 3 && domOffset == node.childNodes.length ? 1 : 0);
    node = _parent2;
  }

  var offset = 0;
  for (var i = domOffset - 1; i >= 0; i--) {
    var child = node.childNodes[i];
    if (child.nodeType == 3) {
      if (loose) extraOffset += child.nodeValue.length;
    } else if (tag = child.getAttribute("pm-span")) {
      offset = parseSpan(tag).to;
      break;
    } else if (tag = child.getAttribute("pm-path")) {
      offset = +tag + 1;
      extraOffset = 0;
      break;
    } else if (loose) {
      extraOffset += child.textContent.length;
    }
  }
  return new _model.Pos(pathFromNode(node), offset + extraOffset);
}

function posFromDOM(pm, node, offset) {
  if (offset == null) {
    offset = Array.prototype.indexOf.call(node.parentNode.childNodes, node);
    node = node.parentNode;
  }
  return posFromDOMInner(pm, node, offset);
}

function rangeFromDOMLoose(pm) {
  if (!hasFocus(pm)) return null;
  var sel = getSelection();
  return new TextSelection(posFromDOMInner(pm, sel.anchorNode, sel.anchorOffset, true), posFromDOMInner(pm, sel.focusNode, sel.focusOffset, true));
}

function findByPath(node, n, fromEnd) {
  for (var ch = fromEnd ? node.lastChild : node.firstChild; ch; ch = fromEnd ? ch.previousSibling : ch.nextSibling) {
    if (ch.nodeType != 1) continue;
    var path = ch.getAttribute("pm-path");
    if (!path) {
      var found = findByPath(ch, n);
      if (found) return found;
    } else if (+path == n) {
      return ch;
    }
  }
}

function resolvePath(parent, path) {
  var node = parent;
  for (var i = 0; i < path.length; i++) {
    node = findByPath(node, path[i]);
    if (!node) throw new Error("Failed to resolve path " + path.join("/"));
  }
  return node;
}

function parseSpan(span) {
  var _dD$$exec = /^(\d+)-(\d+)$/.exec(span);

  var _dD$$exec2 = _slicedToArray(_dD$$exec, 3);

  var _ = _dD$$exec2[0];
  var from = _dD$$exec2[1];
  var to = _dD$$exec2[2];

  return { from: +from, to: +to };
}

function findByOffset(node, offset, after) {
  function search(node) {
    for (var ch = node.firstChild, i = 0, attr = undefined; ch; ch = ch.nextSibling, i++) {
      if (ch.nodeType != 1) continue;
      if (attr = ch.getAttribute("pm-span")) {
        var _parseSpan = parseSpan(attr);

        var from = _parseSpan.from;
        var to = _parseSpan.to;

        if (after ? from == offset : to >= offset) return { node: ch, offset: i, innerOffset: offset - from };
      } else if (attr = ch.getAttribute("pm-path")) {
        var diff = offset - +attr;
        if (diff == 0 || after && diff == 1) return { node: ch, offset: i, innerOffset: diff };
      } else {
        var result = search(ch);
        if (result) return result;
      }
    }
  }
  return search(node);
}

function leafAt(node, offset) {
  for (;;) {
    var child = node.firstChild;
    if (!child) return { node: node, offset: offset };
    if (child.nodeType != 1) return { node: child, offset: offset };
    if (child.hasAttribute("pm-span-offset")) {
      var nodeOffset = 0;
      for (;;) {
        var nextSib = child.nextSibling,
            nextOffset = undefined;
        if (!nextSib || (nextOffset = +nextSib.getAttribute("pm-span-offset")) >= offset) break;
        child = nextSib;
        nodeOffset = nextOffset;
      }
      offset -= nodeOffset;
    }
    node = child;
  }
}

/**
 * Get a DOM element at a given position in the document.
 *
 * @param {Node} parent The parent DOM node.
 * @param {Pos} pos     The position in the document.
 * @return {Object}     The DOM node and character offset inside the node.
 */
function DOMFromPos(parent, pos) {
  var node = resolvePath(parent, pos.path);
  var found = findByOffset(node, pos.offset),
      inner = undefined;
  if (!found) return { node: node, offset: 0 };
  if (found.node.hasAttribute("pm-span-atom") || !(inner = leafAt(found.node, found.innerOffset))) return { node: found.node.parentNode, offset: found.offset + (found.innerOffset ? 1 : 0) };else return inner;
}

function hasFocus(pm) {
  var sel = window.getSelection();
  return sel.rangeCount && (0, _dom.contains)(pm.content, sel.anchorNode);
}

/**
 * Given an x,y position on the editor, get the position in the document.
 *
 * @param  {ProseMirror} pm     Editor instance.
 * @param  {Object}      coords The x, y coordinates.
 * @return {Pos}
 */
// FIXME fails on the space between lines
// FIXME reformulate as selectionAtCoords? So that it can't return null

function posAtCoords(pm, coords) {
  var element = document.elementFromPoint(coords.left, coords.top + 1);
  if (!(0, _dom.contains)(pm.content, element)) return null;

  var offset = undefined;
  if (element.childNodes.length == 1 && element.firstChild.nodeType == 3) {
    element = element.firstChild;
    offset = offsetInTextNode(element, coords);
  } else {
    offset = offsetInElement(element, coords);
  }

  return posFromDOM(pm, element, offset);
}

function textRect(node, from, to) {
  var range = document.createRange();
  range.setEnd(node, to);
  range.setStart(node, from);
  return range.getBoundingClientRect();
}

/**
 * Given a position in the document model, get a bounding box of the character at
 * that position, relative to the window.
 *
 * @param  {ProseMirror} pm The editor instance.
 * @param  {Pos}         pos
 * @return {Object} The bounding box.
 */

function coordsAtPos(pm, pos) {
  var _DOMFromPos = DOMFromPos(pm.content, pos);

  var node = _DOMFromPos.node;
  var offset = _DOMFromPos.offset;

  var side = undefined,
      rect = undefined;
  if (node.nodeType == 3) {
    if (offset < node.nodeValue.length) {
      rect = textRect(node, offset, offset + 1);
      side = "left";
    }
    if ((!rect || rect.left == rect.right) && offset) {
      rect = textRect(node, offset - 1, offset);
      side = "right";
    }
  } else if (node.firstChild) {
    if (offset < node.childNodes.length) {
      var child = node.childNodes[offset];
      rect = child.nodeType == 3 ? textRect(child, 0, child.nodeValue.length) : child.getBoundingClientRect();
      side = "left";
    }
    if ((!rect || rect.left == rect.right) && offset) {
      var child = node.childNodes[offset - 1];
      rect = child.nodeType == 3 ? textRect(child, 0, child.nodeValue.length) : child.getBoundingClientRect();
      side = "right";
    }
  } else {
    rect = node.getBoundingClientRect();
    side = "left";
  }
  var x = rect[side];
  return { top: rect.top, bottom: rect.bottom, left: x, right: x };
}

var scrollMargin = 5;

function scrollIntoView(pm, pos) {
  if (!pos) pos = pm.sel.range.head || pm.sel.range.from;
  var coords = coordsAtPos(pm, pos);
  for (var _parent3 = pm.content;; _parent3 = _parent3.parentNode) {
    var atBody = _parent3 == document.body;
    var rect = atBody ? windowRect() : _parent3.getBoundingClientRect();
    if (coords.top < rect.top) _parent3.scrollTop -= rect.top - coords.top + scrollMargin;else if (coords.bottom > rect.bottom) _parent3.scrollTop += coords.bottom - rect.bottom + scrollMargin;
    if (coords.left < rect.left) _parent3.scrollLeft -= rect.left - coords.left + scrollMargin;else if (coords.right > rect.right) _parent3.scrollLeft += coords.right - rect.right + scrollMargin;
    if (atBody) break;
  }
}

function offsetInRects(coords, rects, strict) {
  var y = coords.top;
  var x = coords.left;

  var minY = 1e8,
      minX = 1e8,
      offset = 0;
  for (var i = 0; i < rects.length; i++) {
    var rect = rects[i];
    if (!rect || rect.top == rect.bottom) continue;
    var dX = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
    if (dX > minX) continue;
    if (dX < minX) {
      minX = dX;minY = 1e8;
    }
    var dY = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
    if (dY < minY) {
      minY = dY;
      offset = x < (rect.left + rect.right) / 2 ? i : i + 1;
    }
  }
  if (strict && (minX || minY)) return null;
  return offset;
}

function offsetInTextNode(text, coords, strict) {
  var len = text.nodeValue.length;
  var range = document.createRange();
  var rects = [];
  for (var i = 0; i < len; i++) {
    range.setEnd(text, i + 1);
    range.setStart(text, i);
    rects.push(range.getBoundingClientRect());
  }
  return offsetInRects(coords, rects, strict);
}

function offsetInElement(element, coords) {
  var rects = [];
  for (var child = element.firstChild; child; child = child.nextSibling) {
    if (child.getBoundingClientRect) rects.push(child.getBoundingClientRect());else rects.push(null);
  }
  return offsetInRects(coords, rects);
}

function findSelectionIn(doc, path, offset, dir, text) {
  var node = doc.path(path);
  if (node.isTextblock) return new TextSelection(new _model.Pos(path, offset));

  for (var i = offset + (dir > 0 ? 0 : -1); dir > 0 ? i < node.maxOffset : i >= 0; i += dir) {
    var child = node.child(i);
    if (!text && child.type.contains == null && child.type.selectable) return new NodeSelection(new _model.Pos(path, i), new _model.Pos(path, i + 1), child);
    path.push(i);
    var inside = findSelectionIn(doc, path, dir < 0 ? child.maxOffset : 0, dir, text);
    if (inside) return inside;
    path.pop();
  }
}

// FIXME we'll need some awareness of bidi motion when determining block start and end

function findSelectionFrom(doc, pos, dir, text) {
  for (var path = pos.path.slice(), offset = pos.offset;;) {
    var found = findSelectionIn(doc, path, offset, dir, text);
    if (found) return found;
    if (!path.length) break;
    offset = path.pop() + (dir > 0 ? 1 : 0);
  }
}

function findSelectionNear(doc, pos, bias, text) {
  if (bias === undefined) bias = 1;

  var result = findSelectionFrom(doc, pos, bias, text) || findSelectionFrom(doc, pos, -bias, text);
  if (!result) throw new Error("Searching for selection in invalid document " + doc);
  return result;
}

function findSelectionAtStart(node, path, text) {
  if (path === undefined) path = [];

  return findSelectionIn(node, path.slice(), 0, 1, text);
}

function findSelectionAtEnd(node, path, text) {
  if (path === undefined) path = [];

  return findSelectionIn(node, path.slice(), node.maxOffset, -1, text);
}

function selectableNodeAbove(pm, dom, coords, liberal) {
  for (; dom && dom != pm.content; dom = dom.parentNode) {
    if (dom.hasAttribute("pm-path")) {
      var path = pathFromNode(dom);
      var node = pm.doc.path(path);
      // Leaf nodes are implicitly clickable
      if (node.type.clicked) {
        var result = node.type.clicked(node, path, dom, coords);
        if (result) return result;
      }
      if ((liberal || node.type.contains == null) && node.type.selectable) return _model.Pos.from(path);
      return null;
    } else if (dom.hasAttribute("pm-span-atom")) {
      var path = pathFromNode(dom.parentNode);
      var _parent4 = pm.doc.path(path),
          span = parseSpan(dom.getAttribute("pm-span"));
      var node = _parent4.childAfter(span.from).node;
      return node.type.selectable ? new _model.Pos(path, span.from) : null;
    }
  }
}

function verticalMotionLeavesTextblock(pm, pos, dir) {
  var dom = resolvePath(pm.content, pos.path);
  var coords = coordsAtPos(pm, pos);
  for (var child = dom.firstChild; child; child = child.nextSibling) {
    var boxes = child.getClientRects();
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      if (dir < 0 ? box.bottom < coords.top : box.top > coords.bottom) return false;
    }
  }
  return true;
}

function setDOMSelectionToPos(pm, pos) {
  var _DOMFromPos2 = DOMFromPos(pm.content, pos);

  var node = _DOMFromPos2.node;
  var offset = _DOMFromPos2.offset;

  var range = document.createRange();
  range.setEnd(node, offset);
  range.setStart(node, offset);
  var sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}