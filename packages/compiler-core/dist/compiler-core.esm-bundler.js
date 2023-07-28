// packages/shared/src/makeMap.ts
function makeMap(str) {
  const map = /* @__PURE__ */ Object.create(null);
  const strs = str.split(",");
  for (let i = 0; i < strs.length; i++) {
    map[strs[i]] = true;
  }
  return (val) => !!map[val];
}

// packages/shared/src/general.ts
var NO = () => false;
var isArray = Array.isArray;
var extend = Object.assign;
var isReservedProp = makeMap(",key,ref");

// packages/compiler-core/src/ast.ts
var NodeTypes = /* @__PURE__ */ ((NodeTypes2) => {
  NodeTypes2[NodeTypes2["ROOT"] = 0] = "ROOT";
  NodeTypes2[NodeTypes2["ELEMENT"] = 1] = "ELEMENT";
  NodeTypes2[NodeTypes2["TEXT"] = 2] = "TEXT";
  NodeTypes2[NodeTypes2["COMMENT"] = 3] = "COMMENT";
  NodeTypes2[NodeTypes2["SIMPLE_EXPRESSION"] = 4] = "SIMPLE_EXPRESSION";
  NodeTypes2[NodeTypes2["INTERPOLATION"] = 5] = "INTERPOLATION";
  NodeTypes2[NodeTypes2["ATTRIBUTE"] = 6] = "ATTRIBUTE";
  NodeTypes2[NodeTypes2["DIRECTIVE"] = 7] = "DIRECTIVE";
  NodeTypes2[NodeTypes2["COMPOUND_EXPRESSION"] = 8] = "COMPOUND_EXPRESSION";
  NodeTypes2[NodeTypes2["IF"] = 9] = "IF";
  NodeTypes2[NodeTypes2["IF_BRANCH"] = 10] = "IF_BRANCH";
  NodeTypes2[NodeTypes2["FOR"] = 11] = "FOR";
  NodeTypes2[NodeTypes2["TEXT_CALL"] = 12] = "TEXT_CALL";
  NodeTypes2[NodeTypes2["VNODE_CALL"] = 13] = "VNODE_CALL";
  NodeTypes2[NodeTypes2["JS_CALL_EXPRESSION"] = 14] = "JS_CALL_EXPRESSION";
  NodeTypes2[NodeTypes2["JS_OBJECT_EXPRESSION"] = 15] = "JS_OBJECT_EXPRESSION";
  NodeTypes2[NodeTypes2["JS_PROPERTY"] = 16] = "JS_PROPERTY";
  NodeTypes2[NodeTypes2["JS_ARRAY_EXPRESSION"] = 17] = "JS_ARRAY_EXPRESSION";
  NodeTypes2[NodeTypes2["JS_FUNCTION_EXPRESSION"] = 18] = "JS_FUNCTION_EXPRESSION";
  NodeTypes2[NodeTypes2["JS_CONDITIONAL_EXPRESSION"] = 19] = "JS_CONDITIONAL_EXPRESSION";
  NodeTypes2[NodeTypes2["JS_CACHE_EXPRESSION"] = 20] = "JS_CACHE_EXPRESSION";
  return NodeTypes2;
})(NodeTypes || {});
var ElementTypes = /* @__PURE__ */ ((ElementTypes2) => {
  ElementTypes2[ElementTypes2["ELEMENT"] = 0] = "ELEMENT";
  ElementTypes2[ElementTypes2["COMPONENT"] = 1] = "COMPONENT";
  ElementTypes2[ElementTypes2["SLOT"] = 2] = "SLOT";
  ElementTypes2[ElementTypes2["TEMPLATE"] = 3] = "TEMPLATE";
  return ElementTypes2;
})(ElementTypes || {});
var locStub = {
  source: "",
  start: { line: 1, column: 1, offset: 0 },
  end: { line: 1, column: 1, offset: 0 }
};
function createRoot(children, loc = locStub) {
  return {
    type: 0 /* ROOT */,
    children,
    helpers: /* @__PURE__ */ new Set(),
    components: [],
    directives: [],
    hoists: [],
    imports: [],
    cached: 0,
    temps: 0,
    codegenNode: void 0,
    loc
  };
}

// packages/compiler-core/src/utils.ts
function advancePositionWithMutation(pos, source, numberOfCharacters = source.length) {
  let linesCount = 0;
  let lastNewLinePos = -1;
  for (let i = 0; i < numberOfCharacters; i++) {
    if (source.charCodeAt(i) === 10) {
      linesCount++;
      lastNewLinePos = i;
    }
  }
  pos.offset += numberOfCharacters;
  pos.line += linesCount;
  pos.column = lastNewLinePos === -1 ? pos.column + numberOfCharacters : numberOfCharacters - lastNewLinePos;
  return pos;
}

// packages/compiler-core/src/parse.ts
var TextModes = /* @__PURE__ */ ((TextModes2) => {
  TextModes2[TextModes2["DATA"] = 0] = "DATA";
  return TextModes2;
})(TextModes || {});
var defaultParserOptions = {
  // 动态插值
  delimiters: [`{{`, `}}`],
  isVoidTag: NO
};
function baseParse(content, options = {}) {
  const context = createParserContext(content, options);
  const start = getCursor(context);
  const children = parseChildren(context, 0 /* DATA */, []);
  const loc = getSelection(context, start);
  return createRoot(children, loc);
}
function parseChildren(context, mode, ancestors) {
  const nodes = [];
  while (!isEnd(context, mode, ancestors)) {
    const s = context.source;
    debugger;
    let node = void 0;
    if (startsWith(s, context.options.delimiters[0])) {
    } else if (s[0] === "<") {
      if (s.length === 1) {
        throw new SyntaxError("\u8BED\u6CD5\u9519\u8BEF");
      } else if (s[1] === "!") {
      } else if (s[1] === "/") {
        if (s.length === 2) {
          throw new SyntaxError("\u8BED\u6CD5\u9519\u8BEF");
        } else if (s[2] === ">") {
          throw new SyntaxError("\u8BED\u6CD5\u9519\u8BEF-\u7F3A\u5C11tag\u540D\u79F0");
        } else if (/[a-z]/i.test(s[2])) {
          parseTag(context, 1 /* End */);
        }
      } else if (/[a-z]/i.test(s[1])) {
        node = parseElement(context, ancestors);
      }
    }
    if (!node) {
      node = parseText(context, mode);
    }
    nodes.push(node);
  }
  return nodes;
}
function parseText(context, mode) {
  const endTokens = ["<", context.options.delimiters[0]];
  let endIndex = context.source.length;
  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i]);
    if (endIndex > index && index !== -1) {
      endIndex = index;
    }
  }
  const start = getCursor(context);
  const content = parseTextData(context, endIndex);
  return {
    type: 2 /* TEXT */,
    loc: getSelection(context, start),
    content
  };
}
function parseTextData(context, length) {
  const rawText = context.source.slice(0, length);
  advanceBy(context, length);
  return rawText;
}
function parseElement(context, ancestors) {
  const element = parseTag(context, 0 /* Start */);
  if (element.isSelfClosing || context.options.isVoidTag(element.tag)) {
    return element;
  }
  ancestors.push(element);
  const children = parseChildren(context, 0 /* DATA */, ancestors);
  ancestors.pop();
  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, 1 /* End */);
  } else {
    throw new SyntaxError("HTML\u8BED\u6CD5\u9519\u8BEF");
  }
  element.children = children;
  element.loc = getSelection(context, element.loc.start);
  return element;
}
function parseTag(context, type) {
  const start = getCursor(context);
  const match = /^<\/?([a-z][^\s />]*)/i.exec(context.source);
  const tag = match[1];
  advanceBy(context, match[0].length);
  let isSelfClosing = false;
  if (startsWith(context.source, "/>")) {
    isSelfClosing = true;
  }
  advanceBy(context, isSelfClosing ? 2 : 1);
  if (type === 1 /* End */)
    return;
  return {
    // 标识整个节点的类型
    type: 1 /* ELEMENT */,
    tag,
    isSelfClosing,
    loc: getSelection(context, start),
    children: [],
    // tag的类型
    tagType: 0 /* ELEMENT */
  };
}
function createParserContext(content, rawOptions) {
  const options = extend({}, defaultParserOptions);
  let key;
  for (key in rawOptions) {
    options[key] = rawOptions[key] === void 0 ? defaultParserOptions[key] : rawOptions[key];
  }
  return {
    options,
    // 列
    column: 1,
    // 默认第一行
    line: 1,
    // 没有偏移
    offset: 0,
    // 源数据
    originalSource: content,
    source: content
  };
}
function getCursor(context) {
  const { column, line, offset } = context;
  return { column, line, offset };
}
function getSelection(context, start, end) {
  end = end || getCursor(context);
  return {
    start,
    end,
    // 截取开始/结束区间的数据
    source: context.originalSource.slice(start.offset, end.offset)
  };
}
function startsWith(source, searchString) {
  return source.startsWith(searchString);
}
function isEnd(context, mode, ancestors) {
  const s = context.source;
  switch (mode) {
    case 0 /* DATA */:
      if (startsWith(s, "</")) {
        for (let i = ancestors.length - 1; i >= 0; --i) {
          if (startsWithEndTagOpen(s, ancestors[i].tag)) {
            return true;
          }
        }
      }
      break;
    default:
      break;
  }
  return !s;
}
function startsWithEndTagOpen(source, tag) {
  return startsWith(source, "</") && source.slice(2, tag.length + 2).toLowerCase() === tag.toLowerCase() && /[\s />]/.test(source[tag.length + 2] || ">");
}
function advanceBy(context, numberOfCharacters) {
  advancePositionWithMutation(context, context.source, numberOfCharacters);
  context.source = context.source.slice(numberOfCharacters);
}
export {
  ElementTypes,
  NodeTypes,
  TextModes,
  advancePositionWithMutation,
  baseParse,
  createRoot,
  locStub
};
//# sourceMappingURL=compiler-core.esm-bundler.js.map
