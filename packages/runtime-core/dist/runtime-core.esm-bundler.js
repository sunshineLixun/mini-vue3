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
var isObject = (val) => val !== null && typeof val === "object";
var hasChanged = (value, oldValue) => !Object.is(value, oldValue);
var isFunction = (val) => typeof val === "function";
var NOOP = () => {
};
var isArray = Array.isArray;
var isString = (val) => typeof val === "string";
var isNoEmptyValue = (val) => val !== void 0 || val !== null;
var extend = Object.assign;
var EMPTY_OBJ = {};
var onRE = /^on[^a-z]/;
var isOn = (key) => onRE.test(key);
var isReservedProp = makeMap(",key,ref");
var hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);

// packages/runtime-core/src/errorHandling.ts
function callWithErrorHandling(fn, args) {
  let res;
  try {
    res = args ? fn(...args) : fn();
  } catch (err) {
    console.log(err);
  }
  return res;
}

// packages/runtime-core/src/componentPublicInstance.ts
var PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    const { accessCache, type, data } = instance;
    if (data !== EMPTY_OBJ && hasOwn(data, key)) {
      accessCache[key] = 2 /* DATA */;
      return data[key];
    }
  },
  set(target, key, newValue, receiver) {
    console.log(key);
    return true;
  }
};

// packages/reactivity/src/dep.ts
var createDep = (effects) => {
  const dep = new Set(effects);
  return dep;
};

// packages/reactivity/src/effectScope.ts
var activeEffectScope;
function recordEffectScope(effect) {
  if (activeEffectScope) {
    (activeEffectScope.effects || (activeEffectScope.effects = [])).push(effect);
  }
}

// packages/reactivity/src/effect.ts
var activeEffect;
var targetMap = /* @__PURE__ */ new WeakMap();
var ReactiveEffect = class {
  // scheduler记录着：proxy对象set了新的值，会触发scheduler回调，控制依赖更新时机
  // 这里也可以认为是 proxy对象的属性发生了变化
  constructor(fn, scheduler = null) {
    this.fn = fn;
    this.scheduler = scheduler;
    // 标记当前effect是否是激活状态，如果是激活状态，会触发依赖收集
    this.active = true;
    // 收集当前激活的activeEffect
    this.deps = [];
    // 标记当前的effect
    /**
     * effect(() => {
     * 	this.name e1
     * 	 effect(() => {
     * 			this.name  e2
     * 	 })
     * 	 this.name  这里必须是 e1
     * })
     *
     * 第一个effect执行
     * parent -> activeEffect -> this
     * 函数执行完成
     * activeEffect = this.parent
     * parent = undefined
     *
     * 第二个effect执行
     * parent -> activeEffect
     *
     * e1 -> e2 -> e1
     */
    this.parent = void 0;
    recordEffectScope(this);
  }
  run() {
    if (!this.active) {
      return this.fn();
    }
    try {
      this.parent = activeEffect;
      activeEffect = this;
      cleanupEffect(this);
      return this.fn();
    } finally {
      activeEffect = this.parent;
      this.parent = void 0;
    }
  }
  stop() {
    if (this.active) {
      cleanupEffect(this);
      this.active = false;
    }
  }
};
function track(target, key) {
  if (activeEffect) {
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
    }
    let dep = depsMap.get(key);
    if (!dep) {
      depsMap.set(key, dep = /* @__PURE__ */ new Set());
    }
    trackEffects(dep);
  }
}
function trackEffects(dep) {
  let shouldTrack = !dep.has(activeEffect);
  if (shouldTrack) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
  }
}
function trigger(target, key, newValue, oldValue) {
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    return;
  }
  let deps = [];
  if (key !== void 0) {
    deps.push(depsMap.get(key));
  }
  const effects = [];
  for (const dep of deps) {
    if (dep) {
      effects.push(...dep);
    }
  }
  triggerEffects(createDep(effects));
}
function triggerEffects(dep) {
  if (dep) {
    const effects = isArray(dep) ? dep : [...dep];
    if (effects) {
      effects.forEach((effect) => {
        if (activeEffect !== effect) {
          if (effect.scheduler) {
            effect.scheduler();
          } else {
            effect.run();
          }
        }
      });
    }
  }
}
function cleanupEffect(effect) {
  const { deps } = effect;
  if (deps.length) {
    for (let index = 0; index < deps.length; index++) {
      deps[index].delete(effect);
    }
    deps.length = 0;
  }
}

// packages/reactivity/src/ref.ts
function isRef(ref) {
  return !!(ref && ref.__v_isRef === true);
}

// packages/reactivity/src/baseHandlers.ts
var set = createSetter();
function createSetter() {
  return function set2(target, key, value, receiver) {
    const oldValue = target[key];
    const result = Reflect.set(target, key, value, receiver);
    if (hasChanged(value, oldValue)) {
      trigger(target, key, value, oldValue);
    }
    return result;
  };
}
var get = createGetter(false, false);
var readonlyGet = createGetter(true, false);
var shallowReactiveGet = createGetter(false, true);
function createGetter(isReadonly2 = false, shallow = false) {
  return function get2(target, key, receiver) {
    if (key === "__v_isReactive" /* IS_REACTIVE */) {
      return !isReadonly2;
    } else if (key === "__v_isReadonly" /* IS_READONLY */) {
      return isReadonly2;
    } else if (key === "__v_raw" /* RAW */ && receiver === (isReadonly2 ? readonlyMap : shallow ? shallowReactiveMap : reactiveMap).get(target)) {
      return target;
    }
    const res = Reflect.get(target, key, receiver);
    if (!isReadonly2) {
      track(target, key);
    }
    if (shallow) {
      return res;
    }
    if (isRef(res)) {
      return res.value;
    }
    if (isObject(res)) {
      return isReadonly2 ? readonly(res) : reactive(res);
    }
    return res;
  };
}
var mutableHandlers = {
  set,
  get
};
var shallowReactiveHandlers = {
  set,
  get: shallowReactiveGet
};
var readonlyHandlers = {
  // 只读属性不能被set
  set(target, key) {
    console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
    return true;
  },
  // 只读属性不能被删除
  deleteProperty(target, key) {
    console.warn(`Delete operation on key "${String(key)}" failed: target is readonly.`, target);
    return true;
  },
  get: readonlyGet
};

// packages/reactivity/src/reactive.ts
var reactiveMap = /* @__PURE__ */ new WeakMap();
var readonlyMap = /* @__PURE__ */ new WeakMap();
var shallowReactiveMap = /* @__PURE__ */ new WeakMap();
var isReadonly = (value) => {
  return !!(value && value["__v_isReadonly" /* IS_READONLY */]);
};
function readonly(target) {
  return createReactiveObject(target, true, readonlyHandlers, readonlyMap);
}
function reactive(target) {
  if (isReadonly(target)) {
    return target;
  }
  return createReactiveObject(target, false, mutableHandlers, reactiveMap);
}
function shallowReactive(target) {
  return createReactiveObject(target, false, shallowReactiveHandlers, shallowReactiveMap);
}
function createReactiveObject(target, isReadonly2, baseHandlers, proxyMap) {
  if (!isObject(target)) {
    return target;
  }
  const existingProxy = proxyMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }
  if (target["__v_isReactive" /* IS_REACTIVE */] && !isReadonly2) {
    return target;
  }
  const proxy = new Proxy(target, baseHandlers);
  proxyMap.set(target, proxy);
  return proxy;
}

// packages/runtime-core/src/components.ts
var uid = 0;
function createComponentInstance(vnode, parent) {
  const instance = {
    vnode,
    parent,
    root: null,
    type: vnode.type,
    uid: uid++,
    data: EMPTY_OBJ,
    props: EMPTY_OBJ,
    attrs: EMPTY_OBJ,
    slots: EMPTY_OBJ,
    refs: EMPTY_OBJ,
    setupState: EMPTY_OBJ,
    ctx: EMPTY_OBJ,
    accessCache: EMPTY_OBJ,
    emit: null,
    proxy: null,
    update: null,
    render: null,
    subTree: null,
    effect: null,
    isMounted: false
  };
  instance.ctx = { _: instance };
  instance.root = parent ? parent.root : instance;
  return instance;
}
function isStatefulComponent(instance) {
  return instance.vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */;
}
function setupComponent(instance) {
  const isStateful = isStatefulComponent(instance);
  const setupResult = isStateful ? setupStatefulComponent(instance) : null;
  return setupResult;
}
function setupStatefulComponent(instance) {
  const Component = instance.type;
  const { setup } = Component;
  instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers);
  if (setup) {
    const setupResult = callWithErrorHandling(setup);
    handleSetupResult(instance, setupResult);
  } else {
    if (Component.data && isFunction(Component.data)) {
      instance.data = shallowReactive(Component.data.call(instance.proxy));
    }
    finishComponentSetup(instance);
  }
}
function handleSetupResult(instance, setupResult) {
  if (isFunction(setupResult)) {
    instance.render = setupResult;
  } else if (isObject(setupResult)) {
  }
  finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
  const Component = instance.type;
  if (!instance.render) {
    instance.render = Component.render || NOOP;
  }
}

// packages/runtime-core/src/vnode.ts
var Fragment = Symbol.for("v-fgt");
var Text = Symbol.for("v-txt");
var Comment2 = Symbol.for("v-cmt");
function isVNode(value) {
  return value ? value.__v_isVNode === true : false;
}
var normalizeKey = ({ key }) => key != null ? key : null;
var normalizeRef = ({ ref }) => {
  if (typeof ref === "number") {
    ref = String(ref);
  }
  return ref;
};
function createVNode(type, props = null, children = null) {
  const shapeFlag = isString(type) ? 1 /* ELEMENT */ : isObject(type) ? 4 /* STATEFUL_COMPONENT */ : isFunction(type) ? 2 /* FUNCTIONAL_COMPONENT */ : 0;
  return createBaseVNode(type, props, children, shapeFlag);
}
function createBaseVNode(type, props = null, children = null, shapeFlag = type === Fragment ? 0 : 1 /* ELEMENT */) {
  const vnode = {
    __v_isVNode: true,
    type,
    props,
    key: props && normalizeKey(props),
    ref: props && normalizeRef(props),
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
function normalizeVNode(child) {
  if (child === null || typeof child === "boolean") {
    return createVNode(Comment2);
  } else if (isArray(child)) {
    return createVNode(Fragment, null, child.slice());
  } else if (typeof child === "object") {
    return CloneVNode(child);
  } else {
    return createVNode(Text, null, String(child));
  }
}
function CloneVNode(vnode) {
  return vnode;
}

// packages/runtime-core/src/componentRenderUtils.ts
function renderComponentRoot(instance) {
  const { type: Component, vnode, props, data, ctx, attrs, slots, emit, setupState, proxy, render: render2 } = instance;
  const { shapeFlag } = vnode;
  let result;
  try {
    if (shapeFlag & 4 /* STATEFUL_COMPONENT */) {
      result = normalizeVNode(render2.call(proxy, props, setupState, data, ctx));
    } else if (shapeFlag & 2 /* FUNCTIONAL_COMPONENT */) {
      let render3 = Component;
      result = normalizeVNode(render3.length > 1 ? render3(props, { attrs, slots, emit }) : render3(props, null));
    }
  } catch (error) {
    result = createVNode(Comment);
  }
  return result;
}

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
  const mountChildren = (children, el, anchor, start = 0) => {
    for (let i = start; i < children.length; i++) {
      const child = normalizeVNode(children[i]);
      patch(null, child, el, anchor);
    }
  };
  const unmountChildren = (childrens) => {
    for (let i = 0; i < childrens.length; i++) {
      unmount(childrens[i]);
    }
  };
  function patchKeyedChildren(c1, c2, container) {
    let i = 0;
    const l1 = c1.length;
    const l2 = c2.length;
    let e1 = l1 - 1;
    let e2 = l2 - 1;
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = normalizeVNode(c2[i]);
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container, null);
      } else {
        break;
      }
      i++;
    }
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = normalizeVNode(c2[e2]);
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container, null);
      } else {
        break;
      }
      e1--;
      e2--;
    }
    if (i > e1) {
      if (i <= e2) {
        const nextPos = e2 + 1;
        const anchor = nextPos < l2 ? c2[nextPos].el : null;
        while (i <= e2) {
          patch(null, normalizeVNode(c2[i]), container, anchor);
          i++;
        }
      }
    } else if (i > e2) {
      if (i <= e1) {
        while (i <= e1) {
          unmount(c1[i]);
          i++;
        }
      }
    } else {
      const s1 = i;
      const s2 = i;
      const keyToNewIndexMap = /* @__PURE__ */ new Map();
      for (i = s2; i <= e2; i++) {
        const nextChild = c2[i] = normalizeVNode(c2[i]);
        if (nextChild.key !== null) {
          keyToNewIndexMap.set(nextChild.key, i);
        }
      }
      for (i = s1; i <= e1; i++) {
        const prevChild = c1[i];
        const newIndex = keyToNewIndexMap.get(prevChild.key);
        if (newIndex === void 0) {
          unmount(prevChild);
        } else {
          patch(prevChild, c2[newIndex], container);
        }
      }
      let patched = 0;
      const toBePatched = e2 - s2 + 1;
      const newIndexToOldIndexMap = new Array(toBePatched).fill(0);
      for (i = s1; i <= e1; i++) {
        const prevChild = c1[i];
        if (patched >= toBePatched) {
          unmount(prevChild);
          continue;
        }
      }
    }
  }
  const patchChildren = (n1, n2, container, anchor) => {
    const c1 = n1.children;
    const prevShapFlags = n1 ? n1.shapeFlag : 0;
    const c2 = n2.children;
    const { shapeFlag } = n2;
    if (shapeFlag & 8 /* TEXT_CHILDREN */) {
      if (prevShapFlags & 16 /* ARRAY_CHILDREN */) {
        unmountChildren(c1);
      }
      if (c1 !== c2) {
        hostSetElementText(container, c2);
      }
    } else {
      if (prevShapFlags & 16 /* ARRAY_CHILDREN */) {
        if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
          patchKeyedChildren(c1, c2, container);
        } else {
          unmountChildren(c1);
        }
      } else {
        if (prevShapFlags & 8 /* TEXT_CHILDREN */) {
          hostSetElementText(container, "");
        }
        if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
          mountChildren(c2, container, anchor);
        }
      }
    }
  };
  const mountElement = (vnode, container, anchor) => {
    let el;
    const { type, shapeFlag, props, children } = vnode;
    el = vnode.el = hostCreateElement(type);
    if (shapeFlag & 8 /* TEXT_CHILDREN */) {
      hostSetElementText(el, children);
    } else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
      mountChildren(children, el, null);
    }
    if (props) {
      for (const key in props) {
        if (!isReservedProp(key)) {
          hostPatchProp(el, key, null, props[key]);
        }
      }
    }
    hostInsert(el, container, anchor);
  };
  const patchProps = (el, oldProps, newProps) => {
    if (oldProps !== newProps) {
      if (oldProps !== EMPTY_OBJ) {
        for (const key in oldProps) {
          if (!isReservedProp(key) && !(key in newProps)) {
            hostPatchProp(el, key, oldProps[key], null);
          }
        }
        for (const key in newProps) {
          if (isReservedProp(key))
            continue;
          const prev = oldProps[key];
          const next = newProps[key];
          if (prev !== next && key !== "value") {
            hostPatchProp(el, key, prev, next);
          }
        }
        if ("value" in newProps) {
          hostPatchProp(el, "value", oldProps.value, newProps.value);
        }
      }
    }
  };
  const patchElement = (n1, n2) => {
    const el = n2.el = n1.el;
    const oldProps = n1.props || EMPTY_OBJ;
    const newProps = n2.props || EMPTY_OBJ;
    patchChildren(n1, n2, el, null);
    patchProps(el, oldProps, newProps);
  };
  const processElement = (n1, n2, container, anchor) => {
    if (n1 == null) {
      mountElement(n2, container, anchor);
    } else {
      patchElement(n1, n2);
    }
  };
  const processText = (n1, n2, el, anchor) => {
    if (n1 === null) {
      hostInsert(n2.el = hostCreateText(n2.children), el, anchor);
    } else {
      const el2 = n2.el = n1.el;
      if (n2.children !== n1.children) {
        hostSetText(el2, n2.children);
      }
    }
  };
  const processComment = (n1, n2, container, anchor) => {
    if (n1 === null) {
      hostInsert(n2.el = hostCreateComment(n2.children || ""), container, anchor);
    } else {
      n2.el = n1.el;
    }
  };
  const processFragment = (n1, n2, container, anchor) => {
    const fragmentStartAnchor = n2.el = n1 ? n1.el : hostCreateText("");
    const fragmentEndAnchor = n2.anchor = n1 ? n1.anchor : hostCreateText("");
    if (n1 === null) {
      hostInsert(fragmentStartAnchor, container, anchor);
      hostInsert(fragmentEndAnchor, container, anchor);
      mountChildren(n2.children, container, fragmentEndAnchor);
    } else {
      patchChildren(n1, n2, container, fragmentEndAnchor);
    }
  };
  const processComponent = (n1, n2, container, anchor, parentComponent) => {
    if (n1 === null) {
      mountComponent(n2, container, anchor, parentComponent);
    } else {
      updateComponent();
    }
  };
  const setupRenderEffect = (instance, initialVNode, container, anchor) => {
    const componentUpdateFn = () => {
      if (!instance.isMounted) {
        const subTree = instance.subTree = renderComponentRoot(instance);
        patch(null, subTree, container, anchor, instance);
        initialVNode.el = subTree.el;
        instance.isMounted = true;
      } else {
        console.log("update");
      }
    };
    const effect = instance.effect = new ReactiveEffect(componentUpdateFn, () => {
      console.log(111);
    });
    const update = instance.update = () => effect.run();
    update.id = instance.uid;
    update();
  };
  const mountComponent = (initialVNode, container, anchor, parentComponent) => {
    const instance = createComponentInstance(initialVNode, parentComponent);
    setupComponent(instance);
    setupRenderEffect(instance, initialVNode, container, anchor);
  };
  const updateComponent = () => {
  };
  const patch = (n1, n2, container, anchor = null, parentComponent) => {
    if (n1 === n2) {
      return;
    }
    if (n1 && !isSameVNodeType(n1, n2)) {
      anchor = getNextHostNode(n1);
      unmount(n1);
      n1 = null;
    }
    const { type, shapeFlag } = n2;
    switch (type) {
      case Text:
        processText(n1, n2, container, anchor);
        break;
      case Comment2:
        processComment(n1, n2, container, anchor);
        break;
      case Fragment:
        processFragment(n1, n2, container, anchor);
        break;
      default:
        if (shapeFlag & 1 /* ELEMENT */) {
          processElement(n1, n2, container, anchor);
        } else if (shapeFlag & 6 /* COMPONENT */) {
          processComponent(n1, n2, container, anchor, parentComponent);
        }
        break;
    }
  };
  const unmount = (vnode) => {
    remove(vnode);
  };
  const remove = (vnode) => {
    performRemove(vnode);
  };
  const performRemove = (vnode) => {
    const { el } = vnode;
    hostRemove(el);
  };
  const getNextHostNode = (vnode) => {
    if (vnode.shapeFlag & 6 /* COMPONENT */) {
    }
    return hostNextSibling(vnode.anchor || vnode.el);
  };
  const render2 = (vnode, container) => {
    if (vnode == null) {
      if (container._vnode) {
        unmount(container._vnode);
      }
    } else {
      patch(container._vnode || null, vnode, container, null, null);
    }
    container._vnode = vnode;
  };
  return {
    render: render2
  };
}

// packages/runtime-core/src/h.ts
function h(type, propsOrChildren, children, ..._) {
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
        if (next[key] == null) {
          style[key] = "";
        }
      }
    }
    for (const key in next) {
      style[key] = next[key];
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
  CloneVNode,
  Comment2 as Comment,
  Fragment,
  Text,
  createRenderer,
  createVNode,
  h,
  isSameVNodeType,
  isVNode,
  normalizeVNode,
  render
};
//# sourceMappingURL=runtime-core.esm-bundler.js.map
