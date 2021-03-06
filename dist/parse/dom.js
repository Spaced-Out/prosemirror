"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.fromDOM = fromDOM;
exports.fromHTML = fromHTML;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _model = require("../model");

var _index = require("./index");

function fromDOM(schema, dom, options) {
  if (!options) options = {};
  var context = new Context(schema, options.topNode || schema.node("doc"));
  var start = options.from ? dom.childNodes[options.from] : dom.firstChild;
  var end = options.to != null && dom.childNodes[options.to] || null;
  context.addAll(start, end, true);
  var doc = undefined;
  while (context.stack.length) doc = context.leave();
  return doc;
}

(0, _index.defineSource)("dom", fromDOM);

function fromHTML(schema, html, options) {
  var wrap = (options && options.document || window.document).createElement("div");
  wrap.innerHTML = html;
  return fromDOM(schema, wrap, options);
}

(0, _index.defineSource)("html", fromHTML);

var blockElements = {
  address: true, article: true, aside: true, blockquote: true, canvas: true,
  dd: true, div: true, dl: true, fieldset: true, figcaption: true, figure: true,
  footer: true, form: true, h1: true, h2: true, h3: true, h4: true, h5: true,
  h6: true, header: true, hgroup: true, hr: true, li: true, noscript: true, ol: true,
  output: true, p: true, pre: true, section: true, table: true, tfoot: true, ul: true
};

var Context = (function () {
  function Context(schema, topNode) {
    _classCallCheck(this, Context);

    this.schema = schema;
    this.stack = [];
    this.styles = [];
    this.closing = false;
    this.enter(topNode.type, topNode.attrs);
    this.nodeInfo = nodeInfo(schema);
  }

  _createClass(Context, [{
    key: "addDOM",
    value: function addDOM(dom) {
      if (dom.nodeType == 3) {
        // FIXME define a coherent strategy for dealing with trailing, leading, and multiple spaces (this isn't one)
        var value = dom.nodeValue;
        var _top = this.top,
            last = undefined;
        if (/\S/.test(value) || _top.type.isTextblock) {
          value = value.replace(/\s+/g, " ");
          if (/^\s/.test(value) && (last = _top.content[_top.content.length - 1]) && last.type.name == "text" && /\s$/.test(last.text)) value = value.slice(1);
          if (value) this.insert(this.schema.text(value, this.styles));
        }
      } else if (dom.nodeType != 1) {
        // Ignore non-text non-element nodes
      } else if (!this.parseNodeType(dom)) {
          this.addAll(dom.firstChild, null);
          var _name = dom.nodeName.toLowerCase();
          if (blockElements.hasOwnProperty(_name) && this.top.type == this.schema.defaultTextblockType()) this.closing = true;
        }
    }
  }, {
    key: "tryParsers",
    value: function tryParsers(parsers, dom) {
      if (parsers) for (var i = 0; i < parsers.length; i++) {
        var parser = parsers[i];
        if (parser.parse(dom, this, parser.type) !== false) return true;
      }
    }
  }, {
    key: "parseNodeType",
    value: function parseNodeType(dom) {
      return this.tryParsers(this.nodeInfo[dom.nodeName.toLowerCase()], dom) || this.tryParsers(this.nodeInfo._, dom);
    }
  }, {
    key: "addAll",
    value: function addAll(from, to, sync) {
      var stack = sync && this.stack.slice();
      for (var dom = from; dom != to; dom = dom.nextSibling) {
        this.addDOM(dom);
        if (sync && blockElements.hasOwnProperty(dom.nodeName.toLowerCase())) this.sync(stack);
      }
    }
  }, {
    key: "doClose",
    value: function doClose() {
      if (!this.closing || this.stack.length < 2) return;
      var left = this.leave();
      this.enter(left.type, left.attrs);
      this.closing = false;
    }
  }, {
    key: "insert",
    value: function insert(node) {
      if (this.top.type.canContain(node)) {
        this.doClose();
      } else {
        for (var i = this.stack.length - 1; i >= 0; i--) {
          var route = this.stack[i].type.findConnection(node.type);
          if (!route) continue;
          if (i == this.stack.length - 1) {
            this.doClose();
          } else {
            while (this.stack.length > i + 1) this.leave();
          }
          for (var j = 0; j < route.length; j++) {
            this.enter(route[j]);
          }if (this.styles.length) this.styles = [];
          break;
        }
      }
      this.top.content.push(node);
      return node;
    }
  }, {
    key: "insertFrom",
    value: function insertFrom(dom, type, attrs, content, styles) {
      return this.insert(type.createAutoFill(this.parseAttrs(dom, type, attrs), content, styles));
    }
  }, {
    key: "enter",
    value: function enter(type, attrs) {
      if (this.styles.length) this.styles = [];
      this.stack.push({ type: type, attrs: attrs, content: [] });
    }
  }, {
    key: "leave",
    value: function leave() {
      var top = this.stack.pop();
      var node = top.type.createAutoFill(top.attrs, top.content);
      if (this.stack.length) this.insert(node);
      return node;
    }
  }, {
    key: "sync",
    value: function sync(stack) {
      while (this.stack.length > stack.length) this.leave();
      for (;;) {
        var n = this.stack.length - 1,
            one = this.stack[n],
            two = stack[n];
        if ((0, _model.compareMarkup)(one.type, two.type, one.attrs, two.attrs)) break;
        this.leave();
      }
      while (stack.length > this.stack.length) {
        var add = stack[this.stack.length];
        this.enter(add.type, add.attrs);
      }
      if (this.styles.length) this.styles = [];
      this.closing = false;
    }
  }, {
    key: "top",
    get: function get() {
      return this.stack[this.stack.length - 1];
    }
  }]);

  return Context;
})();

function nodeInfo(schema) {
  return schema.cached.parseDOMNodes || (schema.cached.parseDOMNodes = summarizeNodeInfo(schema));
}

function summarizeNodeInfo(schema) {
  var tags = Object.create(null);
  tags._ = [];
  function read(value) {
    var info = value.parseDOM;
    if (!info) return;
    info.forEach(function (info) {
      var tag = info.tag || "_";(tags[tag] || (tags[tag] = [])).push({
        type: value,
        rank: info.rank == null ? 50 : info.rank,
        parse: info.parse
      });
    });
  }

  for (var _name2 in schema.nodes) {
    read(schema.nodes[_name2]);
  }for (var _name3 in schema.styles) {
    read(schema.styles[_name3]);
  }for (var tag in tags) {
    tags[tag].sort(function (a, b) {
      return a.rank - b.rank;
    });
  }return tags;
}

function wrap(dom, context, type, attrs) {
  context.enter(type, attrs);
  context.addAll(dom.firstChild, null, true);
  context.leave();
}

_model.Paragraph.register("parseDOM", { tag: "p", parse: wrap });

_model.BlockQuote.register("parseDOM", { tag: "blockquote", parse: wrap });

var _loop = function (i) {
  _model.Heading.register("parseDOM", {
    tag: "h" + i,
    parse: function parse(dom, context, type) {
      return wrap(dom, context, type, { level: i });
    }
  });
};

for (var i = 1; i <= 6; i++) {
  _loop(i);
}_model.HorizontalRule.register("parseDOM", { tag: "hr", parse: wrap });

_model.CodeBlock.register("parseDOM", { tag: "pre", parse: function parse(dom, context, type) {
    var params = dom.firstChild && /^code$/i.test(dom.firstChild.nodeName) && dom.firstChild.getAttribute("class");
    if (params && /fence/.test(params)) {
      var found = [],
          re = /(?:^|\s)lang-(\S+)/g,
          m = undefined;
      while (m = re.test(params)) found.push(m[1]);
      params = found.join(" ");
    } else {
      params = null;
    }
    var content = dom.textContent;
    context.insert(type.create({ params: params }, content ? [context.schema.text(content)] : []));
  } });

_model.BulletList.register("parseDOM", { tag: "ul", parse: wrap });

_model.OrderedList.register("parseDOM", { tag: "ol", parse: function parse(dom, context, type) {
    var attrs = { order: dom.getAttribute("start") || 1 };
    wrap(dom, context, type, attrs);
  } });

_model.ListItem.register("parseDOM", { tag: "li", parse: wrap });

_model.HardBreak.register("parseDOM", { tag: "br", parse: function parse(dom, context, type) {
    if (!dom.hasAttribute("pm-force-br")) context.insert(type.create(null, null, context.styles));
  } });

_model.Image.register("parseDOM", { tag: "img", parse: function parse(dom, context, type) {
    context.insert(type.create({
      src: dom.getAttribute("src"),
      title: dom.getAttribute("title") || null,
      alt: dom.getAttribute("alt") || null
    }));
  } });

// Inline style tokens

function inline(dom, context, style) {
  var old = context.styles;
  context.styles = (style.instance || style).addToSet(old);
  context.addAll(dom.firstChild, null);
  context.styles = old;
}

_model.LinkStyle.register("parseDOM", { tag: "a", parse: function parse(dom, context, style) {
    var href = dom.getAttribute("href");
    if (!href) return false;
    inline(dom, context, style.create({ href: href, title: dom.getAttribute("title") }));
  } });

_model.EmStyle.register("parseDOM", { tag: "i", parse: inline });
_model.EmStyle.register("parseDOM", { tag: "em", parse: inline });

_model.StrongStyle.register("parseDOM", { tag: "b", parse: inline });
_model.StrongStyle.register("parseDOM", { tag: "strong", parse: inline });

_model.CodeStyle.register("parseDOM", { tag: "code", parse: inline });