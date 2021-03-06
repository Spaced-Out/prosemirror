"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.showSelectMenu = showSelectMenu;
exports.readParams = readParams;
exports.commandGroups = commandGroups;
exports.forceFontLoad = forceFontLoad;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _tooltip = require("./tooltip");

var _dom = require("../dom");

var _edit = require("../edit");

var _utilSortedinsert = require("../util/sortedinsert");

var _utilSortedinsert2 = _interopRequireDefault(_utilSortedinsert);

var Menu = (function () {
  function Menu(pm, display) {
    _classCallCheck(this, Menu);

    this.display = display;
    this.stack = [];
    this.pm = pm;
  }

  _createClass(Menu, [{
    key: "show",
    value: function show(content, displayInfo) {
      this.stack.length = 0;
      this.enter(content, displayInfo);
    }
  }, {
    key: "reset",
    value: function reset() {
      this.stack.length = 0;
      this.display.reset();
    }
  }, {
    key: "enter",
    value: function enter(content, displayInfo) {
      var _this = this;

      var pieces = [],
          explore = function explore(value) {
        if (Array.isArray(value)) {
          for (var i = 0; i < value.length; i++) {
            explore(value[i]);
          }pieces.push(separator);
        } else if (!value.select || value.select(_this.pm)) {
          pieces.push(value);
        }
      };
      explore(content);
      // Remove superfluous separators
      for (var i = 0; i < pieces.length; i++) {
        if (pieces[i] == separator && (i == 0 || i == pieces.length - 1 || pieces[i + 1] == separator)) pieces.splice(i--, 1);
      }if (!pieces.length) return this.display.clear();

      this.stack.push(pieces);
      this.draw(displayInfo);
    }
  }, {
    key: "draw",
    value: function draw(displayInfo) {
      var _this2 = this;

      var cur = this.stack[this.stack.length - 1];
      var rendered = (0, _dom.elt)("div", { "class": "ProseMirror-menu" }, cur.map(function (item) {
        return renderItem(item, _this2);
      }));
      if (this.stack.length > 1) this.display.enter(rendered, function () {
        return _this2.leave();
      }, displayInfo);else this.display.show(rendered, displayInfo);
    }
  }, {
    key: "leave",
    value: function leave() {
      this.stack.pop();
      if (this.stack.length) this.draw();else this.display.reset();
    }
  }, {
    key: "active",
    get: function get() {
      return this.stack.length > 1;
    }
  }]);

  return Menu;
})();

exports.Menu = Menu;

var TooltipDisplay = (function () {
  function TooltipDisplay(tooltip, resetFunc) {
    _classCallCheck(this, TooltipDisplay);

    this.tooltip = tooltip;
    this.resetFunc = resetFunc;
  }

  _createClass(TooltipDisplay, [{
    key: "clear",
    value: function clear() {
      this.tooltip.close();
    }
  }, {
    key: "reset",
    value: function reset() {
      if (this.resetFunc) this.resetFunc();else this.clear();
    }
  }, {
    key: "show",
    value: function show(dom, info) {
      this.tooltip.open(dom, info);
    }
  }, {
    key: "enter",
    value: function enter(dom, back, info) {
      var button = (0, _dom.elt)("div", { "class": "ProseMirror-tooltip-back", title: "Back" });
      button.addEventListener("mousedown", function (e) {
        e.preventDefault();e.stopPropagation();
        back();
      });
      this.show((0, _dom.elt)("div", { "class": "ProseMirror-tooltip-back-wrapper" }, dom, button), info);
    }
  }]);

  return TooltipDisplay;
})();

exports.TooltipDisplay = TooltipDisplay;

function title(pm, command) {
  var key = pm.keyForCommand(command.name);
  return key ? command.label + " (" + key + ")" : command.label;
}

function renderIcon(command, menu) {
  var iconClass = "ProseMirror-menuicon";
  if (command.active(menu.pm)) iconClass += " ProseMirror-menuicon-active";

  var dom = (0, _dom.elt)("div", { "class": iconClass, title: title(menu.pm, command) }, (0, _dom.elt)("span", { "class": "ProseMirror-menuicon ProseMirror-icon-" + command.name }));
  dom.addEventListener("mousedown", function (e) {
    e.preventDefault();e.stopPropagation();
    if (!command.params.length) {
      command.exec(menu.pm);
      menu.reset();
    } else if (command.params.length == 1 && command.params[0].type == "select") {
      showSelectMenu(menu.pm, command, dom);
    } else {
      menu.enter(readParams(command));
    }
  });
  return dom;
}

function renderSelect(item, menu) {
  var param = item.params[0];
  var value = !param["default"] ? null : param["default"].call ? param["default"](menu.pm) : param["default"];

  var dom = (0, _dom.elt)("div", { "class": "ProseMirror-select ProseMirror-select-command-" + item.name, title: item.label }, !value ? param.defaultLabel || "Select..." : value.display ? value.display(value) : value.label);
  dom.addEventListener("mousedown", function (e) {
    e.preventDefault();e.stopPropagation();
    showSelectMenu(menu.pm, item, dom);
  });
  return dom;
}

function showSelectMenu(pm, item, dom) {
  var param = item.params[0];
  var options = param.options.call ? param.options(pm) : param.options;
  var menu = (0, _dom.elt)("div", { "class": "ProseMirror-select-menu" }, options.map(function (o) {
    var dom = (0, _dom.elt)("div", null, o.display ? o.display(o) : o.label);
    dom.addEventListener("mousedown", function (e) {
      e.preventDefault();
      item.exec(pm, [o.value]);
      finish();
    });
    return dom;
  }));
  var pos = dom.getBoundingClientRect(),
      box = pm.wrapper.getBoundingClientRect();
  menu.style.left = pos.left - box.left - 2 + "px";
  menu.style.top = pos.top - box.top - 2 + "px";

  var done = false;
  function finish() {
    if (done) return;
    done = true;
    document.body.removeEventListener("mousedown", finish);
    document.body.removeEventListener("keydown", finish);
    pm.wrapper.removeChild(menu);
  }
  document.body.addEventListener("mousedown", finish);
  document.body.addEventListener("keydown", finish);
  pm.wrapper.appendChild(menu);
}

function renderItem(item, menu) {
  if (item.display == "icon") return renderIcon(item, menu);else if (item.display == "select") return renderSelect(item, menu);else if (!item.display) throw new Error("Command " + item.name + " can not be shown in a menu");else return item.display(menu);
}

function buildParamForm(pm, command) {
  var prefill = command.info.prefillParams && command.info.prefillParams(pm);
  var fields = command.params.map(function (param, i) {
    var field = undefined,
        name = "field_" + i;
    var val = prefill ? prefill[i] : param["default"] || "";
    if (param.type == "text") field = (0, _dom.elt)("input", { name: name, type: "text",
      placeholder: param.name,
      value: val,
      autocomplete: "off" });else if (param.type == "select") field = (0, _dom.elt)("select", { name: name }, (param.options.call ? param.options(pm) : param.options).map(function (o) {
      return (0, _dom.elt)("option", { value: o.value, selected: o == val }, o.label);
    }));else // FIXME more types
      throw new Error("Unsupported parameter type: " + param.type);
    return (0, _dom.elt)("div", null, field);
  });
  return (0, _dom.elt)("form", null, fields);
}

function gatherParams(pm, command, form) {
  var bad = false;
  var params = command.params.map(function (param, i) {
    var val = form.elements["field_" + i].value;
    if (val) return val;
    if (param["default"] == null) bad = true;else return param["default"].call ? param["default"](pm) : param["default"];
  });
  return bad ? null : params;
}

function paramForm(pm, command, callback) {
  var form = buildParamForm(pm, command),
      done = false;

  var finish = function finish(result) {
    if (!done) {
      done = true;
      callback(result);
    }
  };

  var submit = function submit() {
    // FIXME error messages
    finish(gatherParams(pm, command, form));
  };
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    submit();
  });
  form.addEventListener("keydown", function (e) {
    if (e.keyCode == 27) {
      finish(null);
    } else if (e.keyCode == 13 && !(e.ctrlKey || e.metaKey || e.shiftKey)) {
      e.preventDefault();
      submit();
    }
  });
  // FIXME too hacky?
  setTimeout(function () {
    var input = form.querySelector("input, textarea");
    if (input) input.focus();
  }, 20);

  return form;
}

function readParams(command) {
  return { display: function display(menu) {
      return paramForm(menu.pm, command, function (params) {
        menu.pm.focus();
        if (params) {
          command.exec(menu.pm, params);
          menu.reset();
        } else {
          menu.leave();
        }
      });
    } };
}

var separator = {
  display: function display() {
    return (0, _dom.elt)("div", { "class": "ProseMirror-menuseparator" });
  }
};

function commandGroups(pm) {
  for (var _len = arguments.length, names = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    names[_key - 1] = arguments[_key];
  }

  return names.map(function (group) {
    var found = [];
    for (var _name in pm.commands) {
      var cmd = pm.commands[_name];
      if (cmd.info.menuGroup && cmd.info.menuGroup == group) (0, _utilSortedinsert2["default"])(found, cmd, function (a, b) {
        return (a.info.menuRank || 50) - (b.info.menuRank || 50);
      });
    }
    return found;
  });
}

// Awkward hack to force Chrome to initialize the font and not return
// incorrect size information the first time it is used.

var forced = false;

function forceFontLoad(pm) {
  if (forced) return;
  forced = true;

  var node = pm.wrapper.appendChild((0, _dom.elt)("div", { "class": "ProseMirror-menuicon ProseMirror-icon-strong",
    style: "visibility: hidden; position: absolute" }));
  window.setTimeout(function () {
    return pm.wrapper.removeChild(node);
  }, 20);
}

function tooltipParamHandler(pm, command, callback) {
  var tooltip = new _tooltip.Tooltip(pm, "center");
  tooltip.open(paramForm(pm, command, function (params) {
    pm.focus();
    tooltip.close();
    callback(params);
  }));
}

(0, _edit.defineParamHandler)("default", tooltipParamHandler);
(0, _edit.defineParamHandler)("tooltip", tooltipParamHandler);

// FIXME check for obsolete styles
(0, _dom.insertCSS)("\n\n.ProseMirror-menu {\n  margin: 0 -4px;\n  line-height: 1;\n  white-space: pre;\n}\n.ProseMirror-tooltip .ProseMirror-menu {\n  width: -webkit-fit-content;\n  width: fit-content;\n}\n\n.ProseMirror-tooltip-back-wrapper {\n  padding-left: 12px;\n}\n.ProseMirror-tooltip-back {\n  position: absolute;\n  top: 5px; left: 5px;\n  cursor: pointer;\n}\n.ProseMirror-tooltip-back:after {\n  content: \"«\";\n}\n\n.ProseMirror-menuicon {\n  display: inline-block;\n  padding: 1px 4px;\n  margin: 0 2px;\n  cursor: pointer;\n  text-rendering: auto;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  text-align: center;\n  vertical-align: middle;\n}\n\n.ProseMirror-menuicon-active {\n  background: #666;\n  border-radius: 4px;\n}\n\n.ProseMirror-menuseparator {\n  display: inline-block;\n}\n.ProseMirror-menuseparator:after {\n  content: \"︙\";\n  opacity: 0.5;\n  padding: 0 4px;\n  vertical-align: middle;\n}\n\n.ProseMirror-select, .ProseMirror-select-menu {\n  border: 1px solid #777;\n  border-radius: 3px;\n  font-size: 90%;\n}\n\n.ProseMirror-select {\n  padding: 1px 12px 1px 4px;\n  display: inline-block;\n  vertical-align: middle;\n  position: relative;\n  cursor: pointer;\n  margin: 0 4px;\n}\n\n.ProseMirror-select-command-textblockType {\n  min-width: 3.2em;\n}\n\n.ProseMirror-select:after {\n  content: \"▿\";\n  color: #777;\n  position: absolute;\n  right: 4px;\n}\n\n.ProseMirror-select-menu {\n  position: absolute;\n  background: #444;\n  color: white;\n  padding: 2px 2px;\n  z-index: 15;\n}\n.ProseMirror-select-menu div {\n  cursor: pointer;\n  padding: 0 1em 0 2px;\n}\n.ProseMirror-select-menu div:hover {\n  background: #777;\n}\n\n");