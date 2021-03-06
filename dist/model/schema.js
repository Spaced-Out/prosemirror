"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; })();

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x2, _x3, _x4) { var _again = true; _function: while (_again) { var object = _x2, property = _x3, receiver = _x4; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x2 = parent; _x3 = property; _x4 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _node = require("./node");

var _style = require("./style");

var _utilError = require("../util/error");

var SchemaError = (function (_ProseMirrorError) {
  _inherits(SchemaError, _ProseMirrorError);

  function SchemaError() {
    _classCallCheck(this, SchemaError);

    _get(Object.getPrototypeOf(SchemaError.prototype), "constructor", this).apply(this, arguments);
  }

  return SchemaError;
})(_utilError.ProseMirrorError);

exports.SchemaError = SchemaError;

function findKinds(type, name, schema, override) {
  function set(sub, sup) {
    if (sub in schema.kinds) {
      if (schema.kinds[sub] == sup) return;
      SchemaError.raise("Inconsistent superkinds for kind " + sub + ": " + sup + " and " + schema.kinds[sub]);
    }
    if (schema.subKind(sub, sup)) SchemaError.raise("Conflicting kind hierarchy through " + sub + " and " + sup);
    schema.kinds[sub] = sup;
  }

  for (var cur = type;; cur = Object.getPrototypeOf(cur)) {
    var curKind = override != null && cur == type ? override : cur.kind;
    if (curKind != null) {
      var _$$exec = /^(.*?)(\.)?$/.exec(curKind);

      var _$$exec2 = _slicedToArray(_$$exec, 3);

      var _ = _$$exec2[0];
      var kind = _$$exec2[1];
      var end = _$$exec2[2];

      if (kind) {
        set(name, kind);
        name = kind;
      }
      if (end) {
        set(name, null);
        return;
      }
    }
  }
}

var NodeType = (function () {
  function NodeType(name, contains, attrs, schema) {
    _classCallCheck(this, NodeType);

    this.name = name;
    this.contains = contains;
    this.attrs = attrs;
    this.schema = schema;
    this.defaultAttrs = null;
  }

  _createClass(NodeType, [{
    key: "canContain",
    value: function canContain(node) {
      return this.canContainType(node.type);
    }
  }, {
    key: "canContainType",
    value: function canContainType(type) {
      return this.schema.subKind(type.name, this.contains);
    }
  }, {
    key: "canContainChildren",
    value: function canContainChildren(node, liberal) {
      if (!liberal && !this.schema.subKind(node.type.contains, this.contains)) return false;
      for (var i = 0; i < node.length; i++) {
        if (!this.canContain(node.child(i))) return false;
      }return true;
    }
  }, {
    key: "findConnection",
    value: function findConnection(other) {
      if (this.canContainType(other)) return [];

      var seen = Object.create(null);
      var active = [{ from: this, via: [] }];
      while (active.length) {
        var current = active.shift();
        for (var _name in this.schema.nodes) {
          var type = this.schema.nodeType(_name);
          if (!(type.contains in seen) && current.from.canContainType(type)) {
            var via = current.via.concat(type);
            if (type.canContainType(other)) return via;
            active.push({ from: type, via: via });
            seen[type.contains] = true;
          }
        }
      }
    }
  }, {
    key: "buildAttrs",
    value: function buildAttrs(attrs, content) {
      if (!attrs && this.defaultAttrs) return this.defaultAttrs;else return _buildAttrs(this.attrs, attrs, this, content);
    }
  }, {
    key: "create",
    value: function create(attrs, content, styles) {
      return new this.instance(this, this.buildAttrs(attrs, content), content, styles);
    }
  }, {
    key: "createAutoFill",
    value: function createAutoFill(attrs, content, styles) {
      if ((!content || content.length == 0) && !this.canBeEmpty) content = this.defaultContent();
      return this.create(attrs, content, styles);
    }
  }, {
    key: "locked",
    get: function get() {
      return false;
    }
  }, {
    key: "isTextblock",
    get: function get() {
      return false;
    }
  }, {
    key: "selectable",
    get: function get() {
      return true;
    }
  }, {
    key: "canBeEmpty",
    get: function get() {
      return true;
    }
  }], [{
    key: "compile",
    value: function compile(types, schema) {
      var result = Object.create(null);
      for (var _name2 in types) {
        var info = types[_name2];
        var type = info.type || SchemaError.raise("Missing node type for " + _name2);
        findKinds(type, _name2, schema, info.kind);
        var contains = "contains" in info ? info.contains : type.contains;
        result[_name2] = new type(_name2, contains, info.attributes || type.attributes, schema);
      }
      for (var _name3 in result) {
        var contains = result[_name3].contains;
        if (contains && !(contains in schema.kinds)) SchemaError.raise("Node type " + _name3 + " is specified to contain non-existing kind " + contains);
      }
      if (!result.doc) SchemaError.raise("Every schema needs a 'doc' type");
      if (!result.text) SchemaError.raise("Every schema needs a 'text' type");

      for (var _name4 in types) {
        types[_name4].defaultAttrs = getDefaultAttrs(types[_name4].attrs);
      }return result;
    }
  }, {
    key: "register",
    value: function register(prop, value) {
      ;(this.prototype[prop] || (this.prototype[prop] = [])).push(value);
    }
  }, {
    key: "kind",
    get: function get() {
      return ".";
    }
  }]);

  return NodeType;
})();

exports.NodeType = NodeType;

NodeType.attributes = {};

var Block = (function (_NodeType) {
  _inherits(Block, _NodeType);

  function Block() {
    _classCallCheck(this, Block);

    _get(Object.getPrototypeOf(Block.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(Block, [{
    key: "defaultContent",
    value: function defaultContent() {
      var inner = this.schema.defaultTextblockType().create();
      var conn = this.findConnection(inner.type);
      if (!conn) SchemaError.raise("Can't create default content for " + this.name);
      for (var i = conn.length - 1; i >= 0; i--) {
        inner = conn[i].create(null, [inner]);
      }return [inner];
    }
  }, {
    key: "instance",
    get: function get() {
      return _node.BlockNode;
    }
  }, {
    key: "isBlock",
    get: function get() {
      return true;
    }
  }, {
    key: "canBeEmpty",
    get: function get() {
      return this.contains == null;
    }
  }], [{
    key: "contains",
    get: function get() {
      return "block";
    }
  }, {
    key: "kind",
    get: function get() {
      return "block.";
    }
  }]);

  return Block;
})(NodeType);

exports.Block = Block;

var Textblock = (function (_Block) {
  _inherits(Textblock, _Block);

  function Textblock() {
    _classCallCheck(this, Textblock);

    _get(Object.getPrototypeOf(Textblock.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(Textblock, [{
    key: "canContain",
    value: function canContain(node) {
      var _this = this;

      return _get(Object.getPrototypeOf(Textblock.prototype), "canContain", this).call(this, node) && node.styles.every(function (s) {
        return _this.canContainStyle(s);
      });
    }
  }, {
    key: "canContainStyle",
    value: function canContainStyle(type) {
      var contains = this.containsStyles;
      if (contains === true) return true;
      if (contains) for (var i = 0; i < contains.length; i++) {
        if (contains[i] == type.name) return true;
      }return false;
    }
  }, {
    key: "instance",
    get: function get() {
      return _node.TextblockNode;
    }
  }, {
    key: "containsStyles",
    get: function get() {
      return true;
    }
  }, {
    key: "isTextblock",
    get: function get() {
      return true;
    }
  }, {
    key: "canBeEmpty",
    get: function get() {
      return true;
    }
  }], [{
    key: "contains",
    get: function get() {
      return "inline";
    }
  }]);

  return Textblock;
})(Block);

exports.Textblock = Textblock;

var Inline = (function (_NodeType2) {
  _inherits(Inline, _NodeType2);

  function Inline() {
    _classCallCheck(this, Inline);

    _get(Object.getPrototypeOf(Inline.prototype), "constructor", this).apply(this, arguments);
  }

  _createClass(Inline, [{
    key: "instance",
    get: function get() {
      return _node.InlineNode;
    }
  }], [{
    key: "contains",
    get: function get() {
      return null;
    }
  }, {
    key: "kind",
    get: function get() {
      return "inline.";
    }
  }]);

  return Inline;
})(NodeType);

exports.Inline = Inline;

var Text = (function (_Inline) {
  _inherits(Text, _Inline);

  function Text() {
    _classCallCheck(this, Text);

    _get(Object.getPrototypeOf(Text.prototype), "constructor", this).apply(this, arguments);
  }

  // Attribute descriptors

  _createClass(Text, [{
    key: "instance",
    get: function get() {
      return _node.TextNode;
    }
  }, {
    key: "selectable",
    get: function get() {
      return false;
    }
  }]);

  return Text;
})(Inline);

exports.Text = Text;

var Attribute = function Attribute() {
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  _classCallCheck(this, Attribute);

  this["default"] = options["default"];
  this.compute = options.compute;
}

// Styles

;

exports.Attribute = Attribute;

var StyleType = (function () {
  function StyleType(name, attrs, rank, schema) {
    _classCallCheck(this, StyleType);

    this.name = name;
    this.attrs = attrs;
    this.rank = rank;
    this.schema = schema;
    var defaults = getDefaultAttrs(this.attrs);
    this.instance = defaults && new _style.StyleMarker(this, defaults);
  }

  _createClass(StyleType, [{
    key: "create",
    value: function create(attrs) {
      if (!attrs && this.instance) return this.instance;
      return new _style.StyleMarker(this, _buildAttrs(this.attrs, attrs, this));
    }
  }], [{
    key: "getOrder",
    value: function getOrder(styles) {
      var sorted = [];
      for (var _name5 in styles) {
        sorted.push({ name: _name5, rank: styles[_name5].type.rank });
      }sorted.sort(function (a, b) {
        return a.rank - b.rank;
      });
      var ranks = Object.create(null);
      for (var i = 0; i < sorted.length; i++) {
        ranks[sorted[i].name] = i;
      }return ranks;
    }
  }, {
    key: "compile",
    value: function compile(styles, schema) {
      var order = this.getOrder(styles);
      var result = Object.create(null);
      for (var _name6 in styles) {
        var info = styles[_name6];
        var attrs = info.attributes || info.type.attributes;
        result[_name6] = new info.type(_name6, attrs, order[_name6], schema);
      }
      return result;
    }
  }, {
    key: "register",
    value: function register(prop, value) {
      ;(this.prototype[prop] || (this.prototype[prop] = [])).push(value);
    }
  }, {
    key: "rank",
    get: function get() {
      return 50;
    }
  }]);

  return StyleType;
})();

exports.StyleType = StyleType;

StyleType.attributes = {};

// Schema specifications are data structures that specify a schema --
// a set of node types, their names, attributes, and nesting behavior.

function copyObj(obj, f) {
  var result = Object.create(null);
  for (var prop in obj) {
    result[prop] = f ? f(obj[prop]) : obj[prop];
  }return result;
}

function ensureWrapped(obj) {
  return obj instanceof Function ? { type: obj } : obj;
}

function overlayObj(obj, overlay) {
  var copy = copyObj(obj);
  for (var _name7 in overlay) {
    var info = ensureWrapped(overlay[_name7]);
    if (info == null) {
      delete copy[_name7];
    } else if (info.type) {
      copy[_name7] = info;
    } else {
      var existing = copy[_name7] = copyObj(copy[_name7]);
      for (var prop in info) {
        existing[prop] = info[prop];
      }
    }
  }
  return copy;
}

var SchemaSpec = (function () {
  function SchemaSpec(nodes, styles) {
    _classCallCheck(this, SchemaSpec);

    this.nodes = nodes ? copyObj(nodes, ensureWrapped) : Object.create(null);
    this.styles = styles ? copyObj(styles, ensureWrapped) : Object.create(null);
  }

  // For node types where all attrs have a default value (or which don't
  // have any attributes), build up a single reusable default attribute
  // object, and use it for all nodes that don't specify specific
  // attributes.

  _createClass(SchemaSpec, [{
    key: "updateNodes",
    value: function updateNodes(nodes) {
      return new SchemaSpec(overlayObj(this.nodes, nodes), this.styles);
    }
  }, {
    key: "addAttribute",
    value: function addAttribute(filter, attrName, attrInfo) {
      var copy = copyObj(this.nodes);
      for (var _name8 in copy) {
        if (typeof filter == "string" ? filter == _name8 : typeof filter == "function" ? filter(_name8, copy[_name8]) : filter ? filter == copy[_name8] : true) {
          var info = copy[_name8] = copyObj(copy[_name8]);
          if (!info.attributes) info.attributes = copyObj(info.type.attributes);
          info.attributes[attrName] = attrInfo;
        }
      }
      return new SchemaSpec(copy, this.styles);
    }
  }, {
    key: "updateStyles",
    value: function updateStyles(styles) {
      return new SchemaSpec(this.nodes, overlayObj(this.styles, styles));
    }
  }]);

  return SchemaSpec;
})();

exports.SchemaSpec = SchemaSpec;
function getDefaultAttrs(attrs) {
  var defaults = Object.create(null);
  for (var attrName in attrs) {
    var attr = attrs[attrName];
    if (attr["default"] == null) return null;
    defaults[attrName] = attr["default"];
  }
  return defaults;
}

function _buildAttrs(attrSpec, attrs, arg1, arg2) {
  var built = Object.create(null);
  for (var _name9 in attrSpec) {
    var value = attrs && attrs[_name9];
    if (value == null) {
      var attr = attrSpec[_name9];
      if (attr["default"] != null) value = attr["default"];else if (attr.compute) value = attr.compute(arg1, arg2);else SchemaError.raise("No value supplied for attribute " + _name9);
    }
    built[_name9] = value;
  }
  return built;
}

/**
 * Document schema class.
 */

var Schema = (function () {
  function Schema(spec, styles) {
    _classCallCheck(this, Schema);

    if (!(spec instanceof SchemaSpec)) spec = new SchemaSpec(spec, styles);
    this.spec = spec;
    this.kinds = Object.create(null);
    this.nodes = NodeType.compile(spec.nodes, this);
    this.styles = StyleType.compile(spec.styles, this);
    this.cached = Object.create(null);

    this.node = this.node.bind(this);
    this.text = this.text.bind(this);
    this.nodeFromJSON = this.nodeFromJSON.bind(this);
    this.styleFromJSON = this.styleFromJSON.bind(this);
  }

  _createClass(Schema, [{
    key: "node",
    value: function node(type, attrs, content, styles) {
      if (typeof type == "string") type = this.nodeType(type);else if (!(type instanceof NodeType)) SchemaError.raise("Invalid node type: " + type);else if (type.schema != this) SchemaError.raise("Node type from different schema used (" + type.name + ")");

      return type.create(attrs, content, styles);
    }
  }, {
    key: "text",
    value: function text(_text, styles) {
      return this.nodes.text.create(null, _text, styles);
    }
  }, {
    key: "defaultTextblockType",
    value: function defaultTextblockType() {
      var cached = this.cached.defaultTextblockType;
      if (cached !== undefined) return cached;
      for (var _name10 in this.nodes) {
        if (this.nodes[_name10].defaultTextblock) return this.cached.defaultTextblockType = this.nodes[_name10];
      }
      return this.cached.defaultTextblockType = null;
    }
  }, {
    key: "style",
    value: function style(name, attrs) {
      var spec = this.styles[name] || SchemaError.raise("No style named " + name);
      return spec.create(attrs);
    }
  }, {
    key: "nodeFromJSON",
    value: function nodeFromJSON(json) {
      var type = this.nodeType(json.type);
      return type.create(json.attrs, json.text || json.content && json.content.map(this.nodeFromJSON), json.styles && json.styles.map(this.styleFromJSON));
    }
  }, {
    key: "styleFromJSON",
    value: function styleFromJSON(json) {
      if (typeof json == "string") return this.style(json);
      return this.style(json._, json);
    }
  }, {
    key: "nodeType",
    value: function nodeType(name) {
      return this.nodes[name] || SchemaError.raise("Unknown node type: " + name);
    }
  }, {
    key: "subKind",
    value: function subKind(sub, sup) {
      for (;;) {
        if (sub == sup) return true;
        sub = this.kinds[sub];
        if (!sub) return false;
      }
    }
  }]);

  return Schema;
})();

exports.Schema = Schema;