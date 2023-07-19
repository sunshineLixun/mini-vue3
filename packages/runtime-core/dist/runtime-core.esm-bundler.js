// packages/shared/src/general.ts
var isObject = (val) => val !== null && typeof val === "object";
var isArray = Array.isArray;
var isString = (val) => typeof val === "string";
var isNoEmptyValue = (val) => val !== void 0 || val !== null;
var extend = Object.assign;
var onRE = /^on[^a-z]/;
var isOn = (key) => onRE.test(key);

// packages/runtime-core/src/renderer.ts
function createRenderer(options) {
  return baseCreateRenderer(options);
}
function baseCreateRenderer(options) {
  const {
    insert: hostInsert,
    remove: hostRemove,
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    createText: hostCreateText,
    createComment: hostCreateComment,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling
  } = options;
  const patch = (n1, n2, container, anchor) => {
    if (n1 === n2) {
      return;
    }
    if (n1 && !isSameVNodeType(n1, n2)) {
      anchor = getNextHostNode(n1);
      unmount();
      n1 = null;
    }
    const { type, shapeFlag } = n2;
    console.log(type, Text, shapeFlag);
    switch (type) {
      case Text:
        processText(n1, n2, container, anchor);
        break;
      default:
        break;
    }
  };
  const processText = (n1, n2, container, anchor) => {
    if (n1 == null) {
      n2.el = hostCreateText(n2.children);
      hostInsert(n2.el, container, anchor);
    } else {
      const el = n2.el = n1.el;
      if (n2.children !== n1.children) {
        hostSetText(el, n2.children);
      }
    }
  };
  const unmount = () => {
  };
  const getNextHostNode = (vnode) => {
    if (vnode.shapeFlag & 6 /* COMPONENT */) {
    }
    return hostNextSibling(vnode.anchor || vnode.el);
  };
  const render2 = (vnode, container) => {
    if (vnode == null) {
      if (container._vnode) {
        unmount();
      }
    } else {
      patch(container._vnode || null, vnode, container, null);
    }
    container._vnode = vnode;
  };
  return {
    render: render2
  };
}

// packages/runtime-core/src/vnode.ts
var Fragment = Symbol.for("v-fgt");
var Text = Symbol.for("v-txt");
var Comment = Symbol.for("v-cmt");
var Static = Symbol.for("v-stc");
function isVNode(value) {
  return value ? value.__v_isVNode === true : false;
}
var normalizeKey = ({ key }) => key != null ? key : null;
function createVNode(type, props = null, children = null) {
  const shapeFlag = isString(type) ? 1 /* ELEMENT */ : 0;
  return createBaseVNode(type, props, children, shapeFlag);
}
function createBaseVNode(type, props = null, children = null, shapeFlag = type === Fragment ? 0 : 1 /* ELEMENT */) {
  const vnode = {
    __v_isVNode: true,
    type,
    props,
    key: normalizeKey(props),
    children,
    el: null,
    // 真实节点 初始化为null
    anchor: null,
    shapeFlag
  };
  if (children) {
    vnode.shapeFlag |= isString(children) ? 8 /* TEXT_CHILDREN */ : 16 /* ARRAY_CHILDREN */;
  }
  return vnode;
}
function isSameVNodeType(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key;
}

// packages/runtime-core/src/h.ts
function h(type, propsOrChildren, children) {
  const l = arguments.length;
  if (l === 2) {
    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      if (isVNode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren]);
      }
      return createVNode(type, propsOrChildren);
    } else {
      return createVNode(type, null, propsOrChildren);
    }
  } else {
    if (l > 3) {
      children = Array.prototype.slice.call(arguments, 2);
    } else if (l === 3 && isVNode(children)) {
      children = [children];
    }
    return createVNode(type, propsOrChildren, children);
  }
}

// packages/runtime-dom/src/nodeOps.ts
var nodeOps = {
  // 增加、插入
  insert(child, parent, anchor) {
    parent.insertBefore(child, anchor || null);
  },
  // 删除
  remove(child) {
    const parent = child.parentNode;
    if (parent) {
      parent.removeChild(child);
    }
  },
  createElement(tagName) {
    return document.createElement(tagName);
  },
  createText(text) {
    return document.createTextNode(text);
  },
  createComment(data) {
    return document.createComment(data);
  },
  setText(el, text) {
    el.nodeValue = text;
  },
  setElementText(el, text) {
    el.textContent = text;
  },
  parentNode(node) {
    return node.parentNode;
  },
  nextSibling(node) {
    return node.nextSibling;
  },
  quertSelector(selector) {
    return document.querySelector(selector);
  }
};

// packages/runtime-dom/src/modules/class.ts
function patchClass(el, value) {
  if (isNoEmptyValue(value)) {
    el.className = value;
  } else {
    el.removeAttribute("class");
  }
}

// packages/runtime-dom/src/modules/style.ts
function patchStyle(el, prev, next) {
  const style = el.style;
  const isCssString = isString(next);
  const isPrevCssString = isString(prev);
  if (next && !isCssString) {
    if (prev && !isPrevCssString) {
      for (const key in prev) {
        if (!isNoEmptyValue(next[key])) {
          style[key] = "";
        }
      }
      for (const key in next) {
        style[key] = next[key];
      }
    }
  } else {
    if (isCssString) {
      if (prev != next) {
        style.cssText = next;
      }
    } else if (prev) {
      el.removeAttribute("style");
    }
  }
}

// packages/runtime-dom/src/modules/events.ts
function patchEvent(el, key, nextValue) {
  const name = key.slice(2).toLowerCase();
  const invokers = el._vei || (el._vei = {});
  const existingInvoker = invokers[name];
  if (nextValue && existingInvoker) {
    existingInvoker.value = nextValue;
  } else {
    if (nextValue) {
      const invoker = invokers[name] = createInvoker(nextValue);
      el.addEventListener(name, invoker);
    } else if (existingInvoker) {
      el.removeEventListener(name, existingInvoker);
      invokers[name] = null;
    }
  }
}
function createInvoker(initialValue) {
  const invoker = (e) => invoker.value(e);
  invoker.value = initialValue;
  return invoker;
}

// packages/runtime-dom/src/modules/attrs.ts
function patchAttrs(el, key, nextValue) {
  if (isNoEmptyValue(nextValue)) {
    el.setAttribute(key, nextValue);
  } else {
    el.removeAttribute(key);
  }
}

// packages/runtime-dom/src/patchProp.ts
var patchProp = (el, key, preValue, nextValue) => {
  if (key === "class") {
    patchClass(el, nextValue);
  } else if (key === "style") {
    patchStyle(el, preValue, nextValue);
  } else if (isOn(key)) {
    patchEvent(el, key, nextValue);
  } else {
    patchAttrs(el, key, nextValue);
  }
};

// packages/runtime-dom/src/index.ts
var rendererOptions = extend(nodeOps, { patchProp });
var renderer;
function ensureRenderer() {
  return renderer || (renderer = createRenderer(rendererOptions));
}
var render = (...args) => {
  ensureRenderer().render(...args);
};
export {
  Comment,
  Fragment,
  Static,
  Text,
  createRenderer,
  createVNode,
  h,
  isSameVNodeType,
  isVNode,
  render
};
//# sourceMappingURL=runtime-core.esm-bundler.js.map
