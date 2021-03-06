"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.fromMarkdown = fromMarkdown;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _markdownIt = require("markdown-it");

var _markdownIt2 = _interopRequireDefault(_markdownIt);

var _model = require("../model");

var _index = require("./index");

function fromMarkdown(schema, text) {
  var tokens = (0, _markdownIt2["default"])("commonmark").parse(text, {});
  var state = new State(schema, tokens),
      doc = undefined;
  state.parseTokens(tokens);
  do {
    doc = state.closeNode();
  } while (state.stack.length);
  return doc;
}

// FIXME create a schema for defining these without importing this file

(0, _index.defineSource)("markdown", fromMarkdown);

var State = (function () {
  function State(schema, tokens) {
    _classCallCheck(this, State);

    this.schema = schema;
    this.stack = [{ type: schema.nodes.doc, content: [] }];
    this.tokens = tokens;
    this.styles = [];
    this.tokenTypes = tokenTypeInfo(schema);
  }

  _createClass(State, [{
    key: "top",
    value: function top() {
      return this.stack[this.stack.length - 1];
    }
  }, {
    key: "push",
    value: function push(elt) {
      if (this.stack.length) this.top().content.push(elt);
    }
  }, {
    key: "addText",
    value: function addText(text) {
      var nodes = this.top().content,
          last = nodes[nodes.length - 1];
      var node = this.schema.text(text, this.styles),
          merged = undefined;
      if (last && (merged = last.maybeMerge(node))) nodes[nodes.length - 1] = merged;else nodes.push(node);
    }
  }, {
    key: "openInline",
    value: function openInline(add) {
      this.styles = add.addToSet(this.styles);
    }
  }, {
    key: "closeInline",
    value: function closeInline(rm) {
      this.styles = (0, _model.removeStyle)(this.styles, rm);
    }
  }, {
    key: "parseTokens",
    value: function parseTokens(toks) {
      for (var i = 0; i < toks.length; i++) {
        var tok = toks[i];
        this.tokenTypes[tok.type](this, tok);
      }
    }
  }, {
    key: "addInline",
    value: function addInline(type) {
      var text = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
      var attrs = arguments.length <= 2 || arguments[2] === undefined ? null : arguments[2];

      var node = type.create(attrs, text, this.styles);
      this.push(node);
      return node;
    }
  }, {
    key: "addNode",
    value: function addNode(type, attrs, content) {
      var node = type.createAutoFill(attrs, content);
      this.push(node);
      return node;
    }
  }, {
    key: "openNode",
    value: function openNode(type, attrs) {
      this.stack.push({ type: type, attrs: attrs, content: [] });
    }
  }, {
    key: "closeNode",
    value: function closeNode() {
      if (this.styles.length) this.styles = [];
      var info = this.stack.pop();
      return this.addNode(info.type, info.attrs, info.content);
    }
  }, {
    key: "getAttr",
    value: function getAttr(tok, name) {
      if (tok.attrs) for (var i = 0; i < tok.attrs.length; i++) {
        if (tok.attrs[i][0] == name) return tok.attrs[i][1];
      }
    }
  }]);

  return State;
})();

function tokenTypeInfo(schema) {
  return schema.cached.markdownTokens || (schema.cached.markdownTokens = summarizeTokens(schema));
}

function registerTokens(tokens, type, info) {
  if (info.type == "block") {
    tokens[info.token + "_open"] = function (state, tok) {
      var attrs = typeof info.attrs == "function" ? info.attrs(state, tok) : info.attrs;
      state.openNode(type, attrs);
    };
    tokens[info.token + "_close"] = function (state) {
      return state.closeNode();
    };
  } else if (info.type == "inline") {
    tokens[info.token + "_open"] = function (state, tok) {
      var attrs = info.attrs instanceof Function ? info.attrs(state, tok) : info.attrs;
      state.openInline(type.create(attrs));
    };
    tokens[info.token + "_close"] = function (state) {
      return state.closeInline(type);
    };
  } else if (info.parse) {
    tokens[info.token] = info.parse.bind(type);
  } else {
    throw new Error("Unrecognized markdown parsing spec: " + info);
  }
}

function summarizeTokens(schema) {
  var tokens = Object.create(null);
  tokens.text = function (state, tok) {
    return state.addText(tok.content);
  };
  tokens.inline = function (state, tok) {
    return state.parseTokens(tok.children);
  };
  tokens.softbreak = function (state) {
    return state.addText("\n");
  };

  function read(type) {
    var info = type.parseMarkdown;
    if (info) info.forEach(function (info) {
      return registerTokens(tokens, type, info);
    });
  }

  for (var _name in schema.nodes) {
    read(schema.nodes[_name]);
  }for (var _name2 in schema.styles) {
    read(schema.styles[_name2]);
  }return tokens;
}

_model.BlockQuote.register("parseMarkdown", { type: "block", token: "blockquote" });

_model.Paragraph.register("parseMarkdown", { type: "block", token: "paragraph" });

_model.ListItem.register("parseMarkdown", { type: "block", token: "list_item" });

_model.BulletList.register("parseMarkdown", { type: "block", token: "bullet_list" });

_model.OrderedList.register("parseMarkdown", { type: "block", token: "ordered_list", attrs: function attrs(state, tok) {
    return {
      order: Number(state.getAttr(tok, "order") || 1)
    };
  } });

_model.Heading.register("parseMarkdown", { type: "block", token: "heading", attrs: function attrs(_, tok) {
    return {
      level: tok.tag.slice(1)
    };
  } });

function trimTrailingNewline(str) {
  if (str.charAt(str.length - 1) == "\n") return str.slice(0, str.length - 1);
  return str;
}

function parseCodeBlock(state, tok) {
  state.openNode(this);
  state.addText(trimTrailingNewline(tok.content));
  state.closeNode();
}

_model.CodeBlock.register("parseMarkdown", { token: "code_block", parse: parseCodeBlock });
_model.CodeBlock.register("parseMarkdown", { token: "fence", parse: parseCodeBlock });

_model.HorizontalRule.register("parseMarkdown", { token: "hr", parse: function parse(state, tok) {
    state.addNode(this, { markup: tok.markup });
  } });

_model.Image.register("parseMarkdown", { token: "image", parse: function parse(state, tok) {
    state.addInline(this, null, { src: state.getAttr(tok, "src"),
      title: state.getAttr(tok, "title") || null,
      alt: tok.children[0] && tok.children[0].content || null });
  } });

_model.HardBreak.register("parseMarkdown", { token: "hardbreak", parse: function parse(state) {
    state.addInline(this);
  } });

// Inline styles

_model.EmStyle.register("parseMarkdown", { type: "inline", token: "em" });

_model.StrongStyle.register("parseMarkdown", { type: "inline", token: "strong" });

_model.LinkStyle.register("parseMarkdown", {
  type: "inline",
  token: "link",
  attrs: function attrs(state, tok) {
    return {
      href: state.getAttr(tok, "href"),
      title: state.getAttr(tok, "title") || null
    };
  }
});

_model.CodeStyle.register("parseMarkdown", { token: "code_inline", parse: function parse(state, tok) {
    state.openInline(this.create());
    state.addText(tok.content);
    state.closeInline(this);
  } });