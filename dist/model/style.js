"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.removeStyle = removeStyle;
exports.sameStyles = sameStyles;
exports.containsStyle = containsStyle;
exports.spanStylesAt = spanStylesAt;
exports.rangeHasStyle = rangeHasStyle;

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var StyleMarker = (function () {
  function StyleMarker(type, attrs) {
    _classCallCheck(this, StyleMarker);

    this.type = type;
    this.attrs = attrs;
  }

  _createClass(StyleMarker, [{
    key: "toJSON",
    value: function toJSON() {
      if (this.type.instance) return this.type.name;
      var obj = { _: this.type.name };
      for (var attr in this.attrs) {
        obj[attr] = this.attrs[attr];
      }return obj;
    }
  }, {
    key: "addToSet",
    value: function addToSet(set) {
      for (var i = 0; i < set.length; i++) {
        var other = set[i];
        if (other.type == this.type) {
          if (this.eq(other)) return set;else return [].concat(_toConsumableArray(set.slice(0, i)), [this], _toConsumableArray(set.slice(i + 1)));
        }
        if (other.type.rank > this.type.rank) return [].concat(_toConsumableArray(set.slice(0, i)), [this], _toConsumableArray(set.slice(i)));
      }
      return set.concat(this);
    }
  }, {
    key: "removeFromSet",
    value: function removeFromSet(set) {
      for (var i = 0; i < set.length; i++) if (this.eq(set[i])) return [].concat(_toConsumableArray(set.slice(0, i)), _toConsumableArray(set.slice(i + 1)));
      return set;
    }
  }, {
    key: "isInSet",
    value: function isInSet(set) {
      for (var i = 0; i < set.length; i++) {
        if (this.eq(set[i])) return true;
      }return false;
    }
  }, {
    key: "eq",
    value: function eq(other) {
      if (this.type != other.type) return false;
      for (var attr in this.attrs) {
        if (other.attrs[attr] != this.attrs[attr]) return false;
      }return true;
    }
  }]);

  return StyleMarker;
})();

exports.StyleMarker = StyleMarker;

function removeStyle(set, type) {
  for (var i = 0; i < set.length; i++) if (set[i].type == type) return [].concat(_toConsumableArray(set.slice(0, i)), _toConsumableArray(set.slice(i + 1)));
  return set;
}

function sameStyles(a, b) {
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (!a[i].eq(b[i])) return false;
  }return true;
}

function containsStyle(set, type) {
  for (var i = 0; i < set.length; i++) {
    if (set[i].type == type) return set[i];
  }return false;
}

var empty = [];

function spanStylesAt(doc, pos) {
  var parent = doc.path(pos.path);
  if (!parent.isTextblock) return empty;
  var node = parent.childBefore(pos.offset).node || parent.firstChild;
  return node ? node.styles : empty;
}

function rangeHasStyle(doc, from, to, type) {
  var found = false;
  doc.inlineNodesBetween(from, to, function (node) {
    if (containsStyle(node.styles, type)) found = true;
  });
  return found;
}