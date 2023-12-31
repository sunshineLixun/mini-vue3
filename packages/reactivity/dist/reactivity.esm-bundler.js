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
var isMap = (val) => toTypeString(val) === "[object Map]";
var isSet = (val) => toTypeString(val) === "[object Set]";
var isString = (val) => typeof val === "string";
var objectToString = Object.prototype.toString;
var toTypeString = (value) => objectToString.call(value);
var isPlainObject = (val) => toTypeString(val) === "[object Object]";
var isNoEmptyValue = (val) => val !== void 0 || val !== null;
var extend = Object.assign;
var EMPTY_OBJ = {};
var onRE = /^on[^a-z]/;
var isOn = (key) => onRE.test(key);
var isReservedProp = makeMap(",key,ref");

// packages/reactivity/src/dep.ts
var createDep = (effects) => {
  const dep = new Set(effects);
  return dep;
};

// packages/reactivity/src/effectScope.ts
var activeEffectScope;
var EffectScope = class {
  // detached 是否是独立的，默认不是独立的，受父作用域控制
  constructor(detached = false) {
    this.detached = detached;
    // 标记是否是激活状态
    this._active = true;
    if (!detached && activeEffectScope) {
      (activeEffectScope.scopes || (activeEffectScope.scopes = [])).push(this);
    }
  }
  run(fn) {
    if (this._active) {
      try {
        this.parent = activeEffectScope;
        activeEffectScope = this;
        return fn();
      } finally {
        activeEffectScope = this.parent;
        this.parent = void 0;
      }
    }
  }
  // 将收集到的effect全部stop
  stop() {
    if (this._active) {
      if (this.effects) {
        this.effects.forEach((effect2) => {
          effect2.stop();
        });
        this.effects.length = 0;
      }
      if (this.cleanups) {
        this.cleanups.forEach((fn) => fn());
      }
      if (this.scopes) {
        this.scopes.forEach((self) => {
          self.stop();
        });
      }
      this._active = false;
    }
  }
};
function effectScope(detached) {
  return new EffectScope(detached);
}
function recordEffectScope(effect2) {
  if (activeEffectScope) {
    (activeEffectScope.effects || (activeEffectScope.effects = [])).push(effect2);
  }
}
function getCurrentScope() {
  return activeEffectScope;
}
function onScopeDispose(fn) {
  if (activeEffectScope) {
    (activeEffectScope.cleanups || (activeEffectScope.cleanups = [])).push(fn);
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
function effect(fn, options) {
  const _effect = new ReactiveEffect(fn, options == null ? void 0 : options.scheduler);
  if (!options) {
    _effect.run();
  }
  const runner = _effect.run.bind(_effect);
  runner.effect = _effect;
  return runner;
}
function stop(runner) {
  runner.effect.stop();
}
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
function trigger(target, key) {
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
      effects.forEach((effect2) => {
        if (activeEffect !== effect2) {
          if (effect2.scheduler) {
            effect2.scheduler();
          } else {
            effect2.run();
          }
        }
      });
    }
  }
}
function cleanupEffect(effect2) {
  const { deps } = effect2;
  if (deps.length) {
    for (let index = 0; index < deps.length; index++) {
      deps[index].delete(effect2);
    }
    deps.length = 0;
  }
}

// packages/reactivity/src/ref.ts
function unref(ref2) {
  return isRef(ref2) ? ref2.value : ref2;
}
function isRef(ref2) {
  return !!(ref2 && ref2.__v_isRef === true);
}
function ref(value) {
  return createRef(value, false);
}
function shallowRef(value) {
  return createRef(value, true);
}
function createRef(value, shallow) {
  if (isRef(value)) {
    return value;
  }
  return new RefImpl(value, shallow);
}
var RefImpl = class {
  constructor(value, __v_isShallow) {
    this.__v_isShallow = __v_isShallow;
    this.dep = void 0;
    // 内部缓存的值,用作get方法放回的值
    this._value = void 0;
    // 内部缓存的原始值，用作新 老值变化的比较
    this._rawValue = void 0;
    this.__v_isRef = true;
    this._rawValue = __v_isShallow ? value : toRaw(value);
    this._value = __v_isShallow ? value : toReactive(value);
  }
  get value() {
    trackRefValue(this);
    return this._value;
  }
  set value(newValue) {
    newValue = this.__v_isShallow ? newValue : toRaw(newValue);
    if (hasChanged(newValue, this._rawValue)) {
      this._rawValue = newValue;
      this._value = this.__v_isShallow ? newValue : toReactive(newValue);
      triggerRefValue(this);
    }
  }
};
function trackRefValue(ref2) {
  if (activeEffect) {
    trackEffects(ref2.dep || (ref2.dep = createDep()));
  }
}
function triggerRefValue(ref2) {
  const dep = ref2.dep;
  if (dep) {
    triggerEffects(dep);
  }
}
function toRef(source, key) {
  if (isRef(source)) {
    return source;
  } else if (isObject(source)) {
    return propertyToRef(source, key);
  } else {
    return ref(source);
  }
}
function toRefs(object) {
  const res = isArray(object) ? new Array(object.length) : {};
  for (const key in object) {
    res[key] = propertyToRef(object, key);
  }
  return res;
}
function propertyToRef(source, key) {
  const value = source[key];
  return isRef(value) ? value : new ObjectRefImpl(source, key);
}
var ObjectRefImpl = class {
  constructor(_object, _key) {
    this._object = _object;
    this._key = _key;
    this.__v_isRef = true;
  }
  // ref.value
  get value() {
    return this._object[this._key];
  }
  set value(newValue) {
    this._object[this._key] = newValue;
  }
};
function proxyRefs(objectWithRef) {
  return isReactive(objectWithRef) ? objectWithRef : new Proxy(objectWithRef, {
    get(target, key, receiver) {
      return unref(Reflect.get(target, key, receiver));
    },
    set(target, key, newValue, receiver) {
      const oldValue = target[key];
      if (isRef(oldValue) && !isRef(newValue)) {
        oldValue.value = newValue;
        return true;
      }
      return Reflect.set(target, key, newValue, receiver);
    }
  });
}

// packages/reactivity/src/baseHandlers.ts
var set = createSetter();
function createSetter() {
  return function set2(target, key, value, receiver) {
    const oldValue = target[key];
    const result = Reflect.set(target, key, value, receiver);
    if (hasChanged(value, oldValue)) {
      trigger(target, key);
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
var ReactiveFlags = /* @__PURE__ */ ((ReactiveFlags2) => {
  ReactiveFlags2["SKIP"] = "__v_skip";
  ReactiveFlags2["IS_REACTIVE"] = "__v_isReactive";
  ReactiveFlags2["IS_READONLY"] = "__v_isReadonly";
  ReactiveFlags2["IS_SHALLOW"] = "__v_isShallow";
  ReactiveFlags2["RAW"] = "__v_raw";
  return ReactiveFlags2;
})(ReactiveFlags || {});
var reactiveMap = /* @__PURE__ */ new WeakMap();
var readonlyMap = /* @__PURE__ */ new WeakMap();
var shallowReactiveMap = /* @__PURE__ */ new WeakMap();
var isReadonly = (value) => {
  return !!(value && value["__v_isReadonly" /* IS_READONLY */]);
};
var isReactive = (value) => {
  if (isReadonly(value)) {
    return isReactive(value["__v_raw" /* RAW */]);
  }
  return !!(value && value["__v_isReactive" /* IS_REACTIVE */]);
};
function isProxy(value) {
  return isReadonly(value) || isReactive(value);
}
function toRaw(observed) {
  const raw = observed && observed["__v_raw" /* RAW */];
  return raw ? toRaw(raw) : observed;
}
function toReactive(value) {
  return isObject(value) ? reactive(value) : value;
}
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

// packages/reactivity/src/computed.ts
var ComputedRefImpl = class {
  constructor(getter, _setter) {
    this.getter = getter;
    this._setter = _setter;
    // 收集当前的effect， 作用：当改变计算属性的值，也要触发effect依赖更新
    this.dep = void 0;
    // 内部缓存计算过后的值
    this._value = void 0;
    // 标记当前是否被缓存过：如果是true，表明没有用过， 需要执行effect的run，false表明用过了，取_value缓存的值
    this._dirty = true;
    this.effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true;
        triggerEffects(this.dep);
      }
    });
  }
  // 对计算属性取值
  /**
   * @example
   * ```js
   * const fullName = computed(() => state.firstName + state.secoedName)
   * ```
   *
   * ```html
   * <template>{{fullName}}</template>
   * ```
   */
  get value() {
    if (activeEffect) {
      trackEffects(this.dep || (this.dep = /* @__PURE__ */ new Set()));
    }
    if (this._dirty) {
      this._dirty = false;
      this._value = this.effect.run();
    }
    return this._value;
  }
  /**
   * @example
   * ```js
   * const fullName = computed(() => state.firstName + state.secoedName)
   * fullName.value = 'mini vue3'
   * 对计算属性赋值，也会触发页面更新
   * ```
   */
  set value(newValue) {
    this._setter(newValue);
  }
};
function computed(getterOrOptions) {
  let setter;
  let getter;
  const onlyGetter = isFunction(getterOrOptions);
  if (onlyGetter) {
    getter = getterOrOptions;
    setter = NOOP;
  } else {
    setter = getterOrOptions.set || NOOP;
    getter = getterOrOptions.get;
  }
  return new ComputedRefImpl(getter, setter);
}

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

// packages/runtime-core/src/scheduler.ts
var queue = [];
var isFlushing = false;
var resolvedPromise = Promise.resolve();
function nextTick(fn) {
  const p = resolvedPromise;
  return fn ? p.then(this ? fn.bind(this) : fn) : p;
}
function queueJob(job) {
  if (!queue.length || !queue.includes(job)) {
    queue.push(job);
  }
  if (!isFlushing) {
    isFlushing = true;
    resolvedPromise.then(() => {
      try {
        queue.forEach((job2) => callWithErrorHandling(job2, null));
      } finally {
        isFlushing = false;
        queue.length = 0;
      }
    });
  }
}

// packages/runtime-core/src/componentPublicInstance.ts
function getPublicInstance(i) {
  if (i === null) {
    return null;
  }
  if (isStatefulComponent(i)) {
    return getExposeProxy(i) || i.proxy;
  }
  return getPublicInstance(i.parent);
}
var publicPropertiesMap = extend(/* @__PURE__ */ Object.create(null), {
  // 列举几个常用的的 属性
  $: (i) => i,
  $el: (i) => i.vnode.el,
  $data: (i) => i.data,
  $props: (i) => i.props,
  $attrs: (i) => i.attrs,
  $slots: (i) => i.slots,
  $refs: (i) => i.refs,
  $emit: (i) => i.emit,
  $root: (i) => getPublicInstance(i.root),
  $options: (i) => i.type,
  $forceUpdate: (i) => queueJob(i.update),
  $nextTick: (i) => nextTick.bind(i.proxy),
  // vue3不支持这个写法了
  $watch: () => NOOP
});

// packages/runtime-core/src/vnode.ts
var Fragment = Symbol.for("v-fgt");
var Text = Symbol.for("v-txt");
var Comment = Symbol.for("v-cmt");

// packages/runtime-core/src/component.ts
var currentInstance = null;
var setCurrentInstance = (instance) => currentInstance = instance;
var unsetCurrentInstance = () => currentInstance = null;
function isStatefulComponent(instance) {
  return instance.vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */;
}
function getExposeProxy(instance) {
  if (instance.exposed) {
    return (
      // expose取值，其实就是对exposeProxy
      instance.exposeProxy || (instance.exposeProxy = new Proxy(instance.exposed, {
        get(target, key) {
          if (key in target) {
            return target[key];
          } else if (key in publicPropertiesMap) {
            return publicPropertiesMap[key](instance);
          }
        }
      }))
    );
  }
}

// packages/runtime-core/src/apiLifecycle.ts
function injectHook(type, hook, target = currentInstance) {
  if (target) {
    const hooks = target[type] || (target[type] = []);
    const wrappedHook = (...args) => {
      setCurrentInstance(target);
      const res = callWithErrorHandling(hook, args);
      unsetCurrentInstance();
      return res;
    };
    hooks.push(wrappedHook);
    return wrappedHook;
  }
}
var createHook = (lifecycle) => (hook, target = currentInstance) => {
  injectHook(lifecycle, (...arrgs) => hook(...arrgs), target);
};
var onBeforeMount = createHook("bm" /* BEFORE_MOUNT */);
var onMounted = createHook("m" /* MOUNTED */);
var onBeforeUpdate = createHook("bu" /* BEFORE_UPDATE */);
var onUpdated = createHook("u" /* UPDATED */);
var onBeforeUnmount = createHook("bum" /* BEFORE_UNMOUNT */);
var onUnmounted = createHook("um" /* UNMOUNTED */);

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

// packages/reactivity/src/watch.ts
var INITIAL_WATCHER_VALUE = {};
function watchEffect(effect2, options) {
  doWatch(effect2, null, options);
}
function watch(source, cb, options) {
  return doWatch(source, cb, options);
}
function doWatch(source, cb, { immediate, deep, flush } = EMPTY_OBJ) {
  let getter;
  if (isRef(source)) {
    getter = () => source.value;
  } else if (isReactive(source)) {
    getter = () => source;
    deep = true;
  } else if (isArray(source)) {
    getter = () => source.map((s) => {
      if (isRef(s)) {
        return s.value;
      } else if (isReactive(s)) {
        return traverse(s);
      } else if (isFunction(s)) {
        return callWithErrorHandling(s);
      }
    });
  } else if (isFunction(source)) {
    if (cb) {
      getter = source;
    } else {
      getter = () => {
        if (cleanup) {
          cleanup();
        }
        return source(onCleanup);
      };
    }
  } else {
    getter = NOOP;
  }
  if (cb && deep) {
    getter = () => traverse(source);
  }
  let oldValue = INITIAL_WATCHER_VALUE;
  let cleanup;
  const onCleanup = (fn) => {
    cleanup = effect2.stop = () => {
      fn();
    };
  };
  const job = () => {
    if (!effect2.active) {
      return;
    }
    if (cb) {
      const newValue = effect2.run();
      if (cleanup) {
        cleanup();
      }
      cb(newValue, oldValue, onCleanup);
      oldValue = newValue;
    } else {
      effect2.run();
    }
  };
  let scheduler;
  if (flush === "sync") {
    scheduler = job;
  } else {
    scheduler = () => queueJob(job);
  }
  const effect2 = new ReactiveEffect(getter, scheduler);
  if (cb) {
    if (immediate) {
      job();
    } else {
      oldValue = effect2.run();
    }
  } else {
    effect2.run();
  }
  return () => effect2.stop();
}
function traverse(value, seen) {
  if (!isObject(value)) {
    return value;
  }
  seen = seen || /* @__PURE__ */ new Set();
  if (seen.has(value)) {
    return value;
  }
  seen.add(value);
  if (isRef(value)) {
    traverse(value.value, seen);
  } else if (isMap(value) || isSet(value)) {
    value.forEach((val) => {
      traverse(val, seen);
    });
  } else if (isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      traverse(value[index], seen);
    }
  } else if (isPlainObject(value)) {
    for (const key in value) {
      traverse(value[key], seen);
    }
  }
  return value;
}
export {
  ReactiveEffect,
  ReactiveFlags,
  activeEffect,
  cleanupEffect,
  computed,
  createReactiveObject,
  effect,
  effectScope,
  getCurrentScope,
  isProxy,
  isReactive,
  isReadonly,
  isRef,
  onScopeDispose,
  proxyRefs,
  reactive,
  reactiveMap,
  readonly,
  readonlyMap,
  recordEffectScope,
  ref,
  shallowReactive,
  shallowReactiveMap,
  shallowRef,
  stop,
  toRaw,
  toReactive,
  toRef,
  toRefs,
  track,
  trackEffects,
  trackRefValue,
  traverse,
  trigger,
  triggerEffects,
  triggerRefValue,
  unref,
  watch,
  watchEffect
};
//# sourceMappingURL=reactivity.esm-bundler.js.map
