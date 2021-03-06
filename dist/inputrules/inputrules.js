"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.addInputRules = addInputRules;
exports.removeInputRules = removeInputRules;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _model = require("../model");

var _edit = require("../edit");

function addInputRules(pm, rules) {
  if (!pm.mod.interpretInput) pm.mod.interpretInput = new InputRules(pm);
  pm.mod.interpretInput.addRules(rules);
}

function removeInputRules(pm, rules) {
  var ii = pm.mod.interpretInput;
  if (!ii) return;
  ii.removeRules(rules);
  if (ii.rules.length == 0) {
    ii.unregister();
    pm.mod.interpretInput = null;
  }
}

var Rule = function Rule(lastChar, match, handler) {
  _classCallCheck(this, Rule);

  this.lastChar = lastChar;
  this.match = match;
  this.handler = handler;
};

exports.Rule = Rule;

var InputRules = (function () {
  function InputRules(pm) {
    var _this = this;

    _classCallCheck(this, InputRules);

    this.pm = pm;
    this.rules = [];
    this.cancelVersion = null;

    pm.on("selectionChange", this.onSelChange = function () {
      return _this.cancelVersion = null;
    });
    pm.on("textInput", this.onTextInput = this.onTextInput.bind(this));
    pm.addKeymap(new _edit.Keymap({ Backspace: function Backspace(pm) {
        return _this.backspace(pm);
      } }, { name: "inputRules" }), 20);
  }

  _createClass(InputRules, [{
    key: "unregister",
    value: function unregister() {
      this.pm.off("selectionChange", this.onSelChange);
      this.pm.off("textInput", this.onTextInput);
      this.pm.removeKeymap("inputRules");
    }
  }, {
    key: "addRules",
    value: function addRules(rules) {
      this.rules = this.rules.concat(rules);
    }
  }, {
    key: "removeRules",
    value: function removeRules(rules) {
      for (var i = 0; i < rules.length; i++) {
        var found = this.rules.indexOf(rules[i]);
        if (found > -1) this.rules.splice(found, 1);
      }
    }
  }, {
    key: "onTextInput",
    value: function onTextInput(text) {
      var pos = this.pm.selection.head;
      if (!pos) return;

      var textBefore = undefined,
          isCode = undefined;
      var lastCh = text[text.length - 1];

      for (var i = 0; i < this.rules.length; i++) {
        var rule = this.rules[i],
            match = undefined;
        if (rule.lastChar && rule.lastChar != lastCh) continue;
        if (textBefore == null) {
          ;
          var _getContext = getContext(this.pm.doc, pos);

          textBefore = _getContext.textBefore;
          isCode = _getContext.isCode;

          if (isCode) return;
        }
        if (match = rule.match.exec(textBefore)) {
          var startVersion = this.pm.history.getVersion();
          if (typeof rule.handler == "string") {
            var offset = pos.offset - (match[1] || match[0]).length;
            var start = new _model.Pos(pos.path, offset);
            var styles = (0, _model.spanStylesAt)(this.pm.doc, pos);
            this.pm.tr["delete"](start, pos).insert(start, this.pm.schema.text(rule.handler, styles)).apply();
          } else {
            rule.handler(this.pm, match, pos);
          }
          this.cancelVersion = startVersion;
          return;
        }
      }
    }
  }, {
    key: "backspace",
    value: function backspace() {
      if (this.cancelVersion) {
        this.pm.history.backToVersion(this.cancelVersion);
        this.cancelVersion = null;
      } else {
        return false;
      }
    }
  }]);

  return InputRules;
})();

function getContext(doc, pos) {
  var parent = doc.path(pos.path);
  var isCode = parent.type.isCode;
  var textBefore = "";
  for (var offset = 0, i = 0; offset < pos.offset;) {
    var child = parent.child(i++),
        size = child.offset;
    textBefore += offset + size > pos.offset ? child.text.slice(0, pos.offset - offset) : child.text;
    if (offset + size >= pos.offset) {
      if (child.styles.some(function (st) {
        return st.type.isCode;
      })) isCode = true;
      break;
    }
    offset += size;
  }
  return { textBefore: textBefore, isCode: isCode };
}