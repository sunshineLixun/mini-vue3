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
var hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);
var capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};
var invokeArrayFns = (fns, arg) => {
  fns.forEach((fn) => fn(arg));
};

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
var PublicInstanceProxyHandlers = {
  get(instance, key) {
    const { accessCache, data, props, setupState } = instance;
    if (key[0] !== "$") {
      if (data !== EMPTY_OBJ && hasOwn(data, key)) {
        accessCache[key] = 2 /* DATA */;
        return data[key];
      } else if (props !== EMPTY_OBJ && hasOwn(props, key)) {
        return props[key];
      } else if (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) {
        return setupState[key];
      }
    }
    const publicGetter = publicPropertiesMap[key];
    if (publicGetter) {
      if (key === "$attrs") {
        track(instance, key);
      }
      return publicGetter(instance);
    }
  },
  set(instance, key, newValue) {
    const { data, props, setupState } = instance;
    if (data !== EMPTY_OBJ && hasOwn(data, key)) {
      data[key] = newValue;
      return true;
    } else if (hasOwn(props, key)) {
      console.warn("props is readonly");
      return false;
    } else if (hasOwn(setupState, key)) {
      setupState[key] = newValue;
      return true;
    }
  }
};

// packages/runtime-core/src/componentProps.ts
function initProps(instance, rawProps, isStateful) {
  const props = {};
  const attrs = {};
  setFullProps(instance, rawProps, props, attrs);
  if (isStateful) {
    instance.props = shallowReactive(props);
  } else {
    if (!instance.type.props) {
      instance.props = attrs;
    } else {
      instance.props = props;
    }
  }
  instance.attrs = attrs;
}
function setFullProps(instance, rawProps, props, attrs) {
  const options = instance.propsOptions;
  if (rawProps) {
    for (let key in rawProps) {
      if (isReservedProp(key))
        continue;
      const value = rawProps[key];
      if (hasOwn(options, key)) {
        props[key] = value;
      } else {
        attrs[key] = value;
      }
    }
  }
}
function updateProps(instance, rawProps, rawPrevProps) {
  const { props, attrs } = instance;
  setFullProps(instance, rawProps, props, attrs);
  for (const key in rawProps) {
    rawPrevProps[key] = rawProps[key];
  }
  for (const key in rawPrevProps) {
    if (!hasOwn(rawProps, key)) {
      delete rawPrevProps[key];
    }
  }
}

// packages/runtime-core/src/componentEmits.ts
function emit(instance, event, ...args) {
  const props = instance.vnode.props || EMPTY_OBJ;
  let handlerName = `on${capitalize(event)}`;
  let handler = props[handlerName];
  if (handler) {
    callWithErrorHandling(handler, args);
  }
  const onceHandler = props[handlerName + "Once"];
  if (onceHandler) {
    if (!instance.emitted) {
      instance.emitted = {};
    } else if (instance.emitted[handlerName]) {
      return;
    }
    instance.emitted[handlerName] = true;
    callWithErrorHandling(onceHandler, args);
  }
}

// packages/runtime-core/src/components/Teleport.ts
var isTeleport = (type) => type.__isTeleport;
var isTeleportDisabled = (props) => props && props.disabled;
var TeleportImpl = {
  __isTeleport: true,
  process(n1, n2, container, anchor, parentComponent, internals) {
    const {
      mc: mountComponent,
      pc: patchChildren,
      o: { quertSelector, insert, createText }
    } = internals;
    const { shapeFlag, children } = n2;
    const disabled = isTeleportDisabled(n2.props);
    if (n1 == null) {
      const placeholder = n2.el = createText("");
      const mainAnchor = n2.anchor = createText("");
      insert(placeholder, container, anchor);
      insert(mainAnchor, container, anchor);
      const target = n2.target = resolveTarget(n2.props, quertSelector);
      const targetAnchor = n2.targetAnchor = createText("");
      if (target) {
        insert(targetAnchor, target);
      }
      const mount = (container2, anchor2) => {
        if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
          mountComponent(children, container2, anchor2, parentComponent);
        }
      };
      if (disabled) {
        mount(container, mainAnchor);
      } else {
        mount(target, targetAnchor);
      }
    } else {
      n2.el = n1.el;
      const target = n2.target = n1.target;
      const mainAnchor = n2.anchor = n1.anchor;
      const targetAnchor = n2.targetAnchor = n1.targetAnchor;
      const wasDisabled = isTeleportDisabled(n1.props);
      const currentTarget = wasDisabled ? container : target;
      const currentAnchor = wasDisabled ? mainAnchor : targetAnchor;
      patchChildren(n1, n2, currentTarget, currentAnchor, parentComponent);
      if (disabled) {
      } else {
        if ((n2.props && n2.props.to) !== (n1.props && n1.props.to)) {
          const newTarget = resolveTarget(n2.props, quertSelector);
          if (newTarget) {
            moveTeleport(n2, newTarget, null, internals, 0 /* TARGET_CHANGE */);
          }
        }
      }
    }
  },
  remove(vnode, { um: unmount, o: { remove: hostRemove } }) {
    const { shapeFlag, target, targetAnchor, props, anchor, children } = vnode;
    if (target) {
      hostRemove(targetAnchor);
    }
    if (!isTeleportDisabled(props)) {
      hostRemove(anchor);
      if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
        for (let i = 0; i < children.length; i++) {
          unmount(children[i]);
        }
      }
    }
  },
  move: moveTeleport
};
function moveTeleport(vnode, container, parentAnchor, { o: { insert }, m: move }, moveType = 2 /* REORDER */) {
  if (moveType === 0 /* TARGET_CHANGE */) {
    insert(vnode.targetAnchor, container, parentAnchor);
  }
  const { shapeFlag, children, el, props } = vnode;
  const isReorder = moveType === 2 /* REORDER */;
  if (isReorder) {
    insert(el, container, parentAnchor);
  }
  if (!isReorder || isTeleportDisabled(props)) {
    if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
      children.forEach((child) => move(child, container, parentAnchor));
    }
  }
}
var Teleport = TeleportImpl;
function resolveTarget(props, select) {
  const targetSelector = props && props.to;
  if (isString(targetSelector)) {
    if (!select) {
      return null;
    }
    return select(targetSelector);
  } else {
    return targetSelector;
  }
}

// packages/runtime-core/src/vnode.ts
var Fragment = Symbol.for("v-fgt");
var Text = Symbol.for("v-txt");
var Comment = Symbol.for("v-cmt");
function isVNode(value) {
  return value ? value.__v_isVNode === true : false;
}
var normalizeKey = ({ key }) => key != null ? key : null;
var normalizeRef = ({ ref: ref2 }) => {
  if (typeof ref2 === "number") {
    ref2 = String(ref2);
  }
  return ref2;
};
function createVNode(type, props = null, children = null) {
  const shapeFlag = isString(type) ? 1 /* ELEMENT */ : isTeleport(type) ? 64 /* TELEPORT */ : isObject(type) ? 4 /* STATEFUL_COMPONENT */ : isFunction(type) ? 2 /* FUNCTIONAL_COMPONENT */ : 0;
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
    target: null,
    targetAnchor: null,
    component: null,
    shapeFlag
  };
  normalizeChildren(vnode, children);
  return vnode;
}
function isSameVNodeType(n1, n2) {
  return n1.type === n2.type && n1.key === n2.key;
}
function normalizeVNode(child) {
  if (child === null || typeof child === "boolean") {
    return createVNode(Comment);
  } else if (isArray(child)) {
    return createVNode(Fragment, null, child.slice());
  } else if (typeof child === "object") {
    return cloneVNode(child);
  } else {
    return createVNode(Text, null, String(child));
  }
}
function cloneVNode(vnode) {
  return vnode;
}
function normalizeChildren(vnode, children) {
  let type = 0;
  if (!children) {
    children = null;
  } else if (isArray(children)) {
    type = 16 /* ARRAY_CHILDREN */;
  } else if (isObject(children)) {
    if (vnode.shapeFlag & 1 /* ELEMENT */) {
      const slot = children.default;
      if (isFunction(slot)) {
        normalizeChildren(vnode, slot());
      }
      return;
    } else {
      type = 32 /* SLOTS_CHILDREN */;
    }
  } else if (isFunction(children)) {
    children = { default: children };
    type = 32 /* SLOTS_CHILDREN */;
  } else {
    children = String(children);
    type = 8 /* TEXT_CHILDREN */;
  }
  vnode.children = children;
  vnode.shapeFlag |= type;
}

// packages/runtime-core/src/componentSlots.ts
var normalizeSlotValue = (value) => (
  // children必须是一个数组 跟h函数是一个道理
  isArray(value) ? value.map(normalizeVNode) : [normalizeVNode(value)]
);
var normalizeObjectSlots = (children, slots) => {
  for (const key in children) {
    const value = children[key];
    if (isFunction(value)) {
      const result = value();
      slots[key] = () => normalizeSlotValue(result);
    } else if (value !== null) {
      slots[key] = () => normalizeSlotValue(value);
    }
  }
};
var normalizeVNodeSlots = (instance, children) => {
  const normalized = normalizeSlotValue(children);
  instance.slots.default = () => normalized;
};
function initSlots(instance, children) {
  if (instance.vnode.shapeFlag & 32 /* SLOTS_CHILDREN */) {
    normalizeObjectSlots(children, instance.slots);
  } else {
    instance.slots = {};
    if (children) {
      normalizeVNodeSlots(instance, children);
    }
  }
}
function updateSlots(instance, children) {
  if (instance.vnode.shapeFlag & 32 /* SLOTS_CHILDREN */) {
    normalizeObjectSlots(children, instance.slots);
  } else if (children) {
    normalizeVNodeSlots(instance, children);
  }
}

// packages/runtime-core/src/component.ts
var currentInstance = null;
var getCurrentInstance = () => currentInstance;
var setCurrentInstance = (instance) => currentInstance = instance;
var unsetCurrentInstance = () => currentInstance = null;
var uid = 0;
function createComponentInstance(vnode, parent) {
  const { type } = vnode;
  const instance = {
    vnode,
    parent,
    root: null,
    type,
    uid: uid++,
    data: EMPTY_OBJ,
    props: EMPTY_OBJ,
    attrs: EMPTY_OBJ,
    slots: EMPTY_OBJ,
    refs: EMPTY_OBJ,
    setupState: EMPTY_OBJ,
    // ctx: EMPTY_OBJ,
    accessCache: EMPTY_OBJ,
    // 传给组件的props
    propsOptions: type.props || EMPTY_OBJ,
    emit: null,
    emitted: null,
    proxy: null,
    update: null,
    render: null,
    subTree: null,
    next: null,
    effect: null,
    isMounted: false,
    exposed: null,
    attrsProxy: null,
    exposeProxy: null,
    setupContext: null,
    // 沿着父级查找
    provides: parent ? parent.provides : /* @__PURE__ */ Object.create(null),
    // lifecycle
    bc: null,
    c: null,
    bm: null,
    m: null,
    bu: null,
    u: null,
    um: null,
    bum: null,
    da: null,
    a: null
  };
  instance.root = parent ? parent.root : instance;
  instance.emit = emit.bind(null, instance);
  return instance;
}
function createSetupContext(instance) {
  return {
    slots: instance.slots,
    emit: instance.emit,
    get attrs() {
      return getAttrsProxy(instance);
    },
    expose: (exposed) => {
      instance.exposed = exposed || {};
    }
  };
}
function isStatefulComponent(instance) {
  return instance.vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */;
}
function setupComponent(instance) {
  const isStateful = isStatefulComponent(instance);
  initProps(instance, instance.vnode.props, isStateful);
  initSlots(instance, instance.vnode.children);
  const setupResult = isStateful ? setupStatefulComponent(instance) : null;
  return setupResult;
}
function setupStatefulComponent(instance) {
  const Component = instance.type;
  const { setup } = Component;
  instance.proxy = new Proxy(instance, PublicInstanceProxyHandlers);
  if (setup) {
    const setupContext = instance.setupContext = setup.length > 1 ? createSetupContext(instance) : null;
    setCurrentInstance(instance);
    const setupResult = callWithErrorHandling(setup, [instance.props, setupContext]);
    unsetCurrentInstance();
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
    instance.setupState = proxyRefs(setupResult);
  }
  finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
  if (!instance.render) {
    const Component = instance.type;
    instance.render = Component.render || NOOP;
  }
}
function getAttrsProxy(instance) {
  return instance.attrsProxy || (instance.attrsProxy = new Proxy(instance.attrs, {
    get: (target, key) => {
      track(instance, "$attrs");
      return target[key];
    }
  }));
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

// packages/runtime-core/src/componentRenderUtils.ts
function renderComponentRoot(instance) {
  const { type: Component, vnode, props, data, attrs, slots, setupState, emit: emit2, proxy, render: render2 } = instance;
  const { shapeFlag } = vnode;
  let result;
  try {
    if (shapeFlag & 4 /* STATEFUL_COMPONENT */) {
      result = normalizeVNode(render2.call(proxy, proxy, props, setupState, data));
    } else if (shapeFlag & 2 /* FUNCTIONAL_COMPONENT */) {
      let render3 = Component;
      result = normalizeVNode(render3.length > 1 ? render3(props, { attrs, slots, emit: emit2 }) : render3(props, null));
    }
  } catch (error) {
    console.log(error);
    result = createVNode(Comment);
  }
  return result;
}
function shouldUpdateComponent(prevVNode, nextVNode) {
  const { props: prevProps, children: prevChild } = prevVNode;
  const { props: nextProps, children: nextChild } = nextVNode;
  if (prevChild || nextChild) {
    if (!nextChild || !nextChild.$stable) {
      return true;
    }
  }
  if (prevProps === nextProps) {
    return false;
  }
  if (!prevProps) {
    return !!nextProps;
  }
  if (!nextProps) {
    return true;
  }
  return hasPropsChanged(prevProps, nextProps);
}
function hasPropsChanged(prevProps, nextProps) {
  const newKeys = Object.keys(nextProps);
  const oldKeys = Object.keys(prevProps);
  if (newKeys.length !== oldKeys.length) {
    return true;
  }
  for (let i = 0; i < newKeys.length; i++) {
    const key = newKeys[i];
    if (prevProps[key] !== nextProps[key]) {
      return true;
    }
  }
  return false;
}

// packages/runtime-core/src/rendererTemplateRef.ts
function setRef(rawRef, oldRawRef, vnode) {
  if (isArray(rawRef)) {
    rawRef.forEach((r, i) => setRef(r, oldRawRef && (isArray(oldRawRef) ? oldRawRef[i] : oldRawRef), vnode));
    return;
  }
  const value = vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */ ? getExposeProxy(vnode.component) || vnode.component.proxy : vnode.el;
  const _isRef = isRef(rawRef);
  const doSet = () => {
    if (_isRef) {
      rawRef.value = value;
    }
  };
  if (value) {
    queueJob(doSet);
  }
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
  const mountChildren = (children, el, anchor, parentComponent, start = 0) => {
    for (let i = start; i < children.length; i++) {
      const child = normalizeVNode(children[i]);
      patch(null, child, el, anchor, parentComponent);
    }
  };
  const unmountChildren = (childrens) => {
    for (let i = 0; i < childrens.length; i++) {
      unmount(childrens[i]);
    }
  };
  function patchKeyedChildren(c1, c2, container, parentComponent) {
    let i = 0;
    const l1 = c1.length;
    const l2 = c2.length;
    let e1 = l1 - 1;
    let e2 = l2 - 1;
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = normalizeVNode(c2[i]);
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container, null, parentComponent);
      } else {
        break;
      }
      i++;
    }
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = normalizeVNode(c2[e2]);
      if (isSameVNodeType(n1, n2)) {
        patch(n1, n2, container, null, parentComponent);
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
          patch(null, normalizeVNode(c2[i]), container, anchor, parentComponent);
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
          patch(prevChild, c2[newIndex], container, parentComponent);
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
  const patchChildren = (n1, n2, container, anchor, parentComponent) => {
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
          patchKeyedChildren(c1, c2, container, parentComponent);
        } else {
          unmountChildren(c1);
        }
      } else {
        if (prevShapFlags & 8 /* TEXT_CHILDREN */) {
          hostSetElementText(container, "");
        }
        if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
          mountChildren(c2, container, anchor, parentComponent);
        }
      }
    }
  };
  const mountElement = (vnode, container, anchor, parentComponent) => {
    let el;
    const { type, shapeFlag, props, children } = vnode;
    el = vnode.el = hostCreateElement(type);
    if (shapeFlag & 8 /* TEXT_CHILDREN */) {
      hostSetElementText(el, children);
    } else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
      mountChildren(children, el, parentComponent, null);
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
  const patchElement = (n1, n2, parentComponent) => {
    const el = n2.el = n1.el;
    const oldProps = n1.props || EMPTY_OBJ;
    const newProps = n2.props || EMPTY_OBJ;
    patchChildren(n1, n2, el, null, parentComponent);
    patchProps(el, oldProps, newProps);
  };
  const processElement = (n1, n2, container, anchor, parentComponent) => {
    if (n1 == null) {
      mountElement(n2, container, anchor, parentComponent);
    } else {
      patchElement(n1, n2, parentComponent);
    }
  };
  const processText = (n1, n2, el, anchor) => {
    if (n1 === null) {
      hostInsert(n2.el = hostCreateText(n2.children || ""), el, anchor);
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
  const processFragment = (n1, n2, container, anchor, parentComponent) => {
    const fragmentStartAnchor = n2.el = n1 ? n1.el : hostCreateText("");
    const fragmentEndAnchor = n2.anchor = n1 ? n1.anchor : hostCreateText("");
    if (n1 === null) {
      hostInsert(fragmentStartAnchor, container, anchor);
      hostInsert(fragmentEndAnchor, container, anchor);
      mountChildren(n2.children, container, fragmentEndAnchor, parentComponent);
    } else {
      patchChildren(n1, n2, container, fragmentEndAnchor, parentComponent);
    }
  };
  const processComponent = (n1, n2, container, anchor, parentComponent) => {
    if (n1 === null) {
      mountComponent(n2, container, anchor, parentComponent);
    } else {
      updateComponent(n1, n2);
    }
  };
  const updateComponentPreRender = (instance, nextVNode) => {
    nextVNode.component = instance;
    const prevProps = instance.vnode.props;
    instance.vnode = nextVNode;
    instance.next = null;
    updateProps(instance, nextVNode.props, prevProps);
    updateSlots(instance, nextVNode.children);
  };
  const setupRenderEffect = (instance, initialVNode, container, anchor) => {
    const componentUpdateFn = () => {
      if (!instance.isMounted) {
        const { bm, m } = instance;
        if (bm) {
          invokeArrayFns(bm);
        }
        const subTree = instance.subTree = renderComponentRoot(instance);
        patch(null, subTree, container, anchor, instance);
        initialVNode.el = subTree.el;
        if (m) {
          invokeArrayFns(m);
        }
        instance.isMounted = true;
      } else {
        let { next, vnode, bu, u } = instance;
        if (next) {
          next.el = vnode.el;
          updateComponentPreRender(instance, next);
        } else {
          next = vnode;
        }
        if (bu) {
          invokeArrayFns(bu);
        }
        const nextTree = renderComponentRoot(instance);
        const prevTree = instance.subTree;
        instance.subTree = nextTree;
        patch(prevTree, nextTree, hostParentNode(prevTree.el), getNextHostNode(prevTree), instance);
        next.el = nextTree.el;
        if (u) {
          invokeArrayFns(u);
        }
      }
    };
    const effect2 = instance.effect = new ReactiveEffect(componentUpdateFn, () => queueJob(update));
    const update = instance.update = () => effect2.run();
    update.id = instance.uid;
    update();
  };
  const mountComponent = (initialVNode, container, anchor, parentComponent) => {
    const instance = initialVNode.component = createComponentInstance(initialVNode, parentComponent);
    setupComponent(instance);
    setupRenderEffect(instance, initialVNode, container, anchor);
  };
  const updateComponent = (n1, n2) => {
    const instance = n2.component = n1.component;
    if (shouldUpdateComponent(n1, n2)) {
      instance.next = n2;
      instance.update();
    } else {
      n2.el = n1.el;
      instance.vnode = n2;
    }
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
    const { type, ref: ref2, shapeFlag } = n2;
    switch (type) {
      case Text:
        processText(n1, n2, container, anchor);
        break;
      case Comment:
        processComment(n1, n2, container, anchor);
        break;
      case Fragment:
        processFragment(n1, n2, container, anchor, parentComponent);
        break;
      default:
        if (shapeFlag & 1 /* ELEMENT */) {
          processElement(n1, n2, container, anchor, parentComponent);
        } else if (shapeFlag & 6 /* COMPONENT */) {
          processComponent(n1, n2, container, anchor, parentComponent);
        } else if (shapeFlag & 64 /* TELEPORT */) {
          type.process(
            n1,
            n2,
            container,
            anchor,
            parentComponent,
            internals
          );
        }
        break;
    }
    if (ref2 != null && parentComponent) {
      setRef(ref2, n1 && n1.ref, n2 || n1);
    }
  };
  const unmountComponent = (instance) => {
    const { update, bum, um, subTree } = instance;
    if (bum) {
      invokeArrayFns(bum);
    }
    if (update) {
      update.active = false;
      unmount(subTree);
    }
    if (um) {
      invokeArrayFns(um);
    }
  };
  const unmount = (vnode) => {
    const { shapeFlag, type } = vnode;
    if (shapeFlag & 6 /* COMPONENT */) {
      unmountComponent(vnode.component);
    } else if (shapeFlag & 64 /* TELEPORT */) {
      type.remove(vnode, internals);
    } else {
      remove(vnode);
    }
  };
  const remove = (vnode) => {
    const { type, el, anchor } = vnode;
    const performRemove = () => {
      hostRemove(el);
    };
    if (type === Fragment) {
      removeFragment(el, anchor);
    } else {
      performRemove();
    }
  };
  const removeFragment = (current, end) => {
    let next;
    while (current !== end) {
      next = hostNextSibling(current);
      hostRemove(current);
      current = next;
    }
    hostRemove(end);
  };
  const getNextHostNode = (vnode) => {
    if (vnode.shapeFlag & 6 /* COMPONENT */) {
      return getNextHostNode(vnode.component.subTree);
    }
    return hostNextSibling(vnode.anchor || vnode.el);
  };
  const move = (vnode, container, anchor) => {
    const { type, shapeFlag, el, children } = vnode;
    if (shapeFlag & 6 /* COMPONENT */) {
      move(vnode.component.subTree, container, anchor);
      return;
    }
    if (type === Fragment) {
      hostInsert(el, container, anchor);
      children.forEach((child) => move(child, container, anchor));
      hostInsert(vnode.anchor, container, anchor);
      return;
    }
    if (shapeFlag & 64 /* TELEPORT */) {
      type.move(vnode, container, anchor, internals);
      return;
    } else {
      hostInsert(el, container, anchor);
    }
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
  const internals = {
    p: patch,
    um: unmount,
    m: move,
    r: remove,
    mt: mountComponent,
    mc: mountChildren,
    pc: patchChildren,
    n: getNextHostNode,
    o: options
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

// packages/runtime-core/src/apiLifecycle.ts
var LifecycleHooks = /* @__PURE__ */ ((LifecycleHooks2) => {
  LifecycleHooks2["BEFORE_CREATE"] = "bc";
  LifecycleHooks2["CREATED"] = "c";
  LifecycleHooks2["BEFORE_MOUNT"] = "bm";
  LifecycleHooks2["MOUNTED"] = "m";
  LifecycleHooks2["BEFORE_UPDATE"] = "bu";
  LifecycleHooks2["UPDATED"] = "u";
  LifecycleHooks2["BEFORE_UNMOUNT"] = "bum";
  LifecycleHooks2["UNMOUNTED"] = "um";
  LifecycleHooks2["DEACTIVATED"] = "da";
  LifecycleHooks2["ACTIVATED"] = "a";
  return LifecycleHooks2;
})(LifecycleHooks || {});
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
var createHook = (lifecycle) => (hook, target = currentInstance) => injectHook(lifecycle, (...arrgs) => hook(...arrgs), target);
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
var renderer;
function ensureRenderer() {
  return renderer || (renderer = createRenderer(rendererOptions));
}
var render = (...args) => {
  ensureRenderer().render(...args);
};

// packages/runtime-core/src/apiInject.ts
function provide(key, value) {
  if (!currentInstance) {
    console.warn(`inject() can only be used inside setup() or functional components.`);
    return;
  }
  let provides = currentInstance.provides;
  const parentProvides = currentInstance.parent && currentInstance.parent.provides;
  if (provides === parentProvides) {
    provides = currentInstance.provides = Object.create(parentProvides);
  }
  provides[key] = value;
}
function inject(key, defaultValue, treatDefaultAsFactory = false) {
  var _a;
  if (!currentInstance) {
    console.warn(`inject() can only be used inside setup() or functional components.`);
    return;
  }
  const provides = (_a = currentInstance.parent) == null ? void 0 : _a.provides;
  if (provides && key in provides) {
    return provides[key];
  }
  if (treatDefaultAsFactory && isFunction(defaultValue)) {
    return defaultValue.call(currentInstance && currentInstance.proxy);
  }
  return defaultValue;
}
export {
  Comment,
  Fragment,
  LifecycleHooks,
  ReactiveEffect,
  ReactiveFlags,
  Teleport,
  Text,
  activeEffect,
  cleanupEffect,
  cloneVNode,
  computed,
  createHook,
  createReactiveObject,
  createRenderer,
  createVNode,
  effect,
  effectScope,
  getCurrentInstance,
  getCurrentScope,
  h,
  inject,
  isProxy,
  isReactive,
  isReadonly,
  isRef,
  isSameVNodeType,
  isVNode,
  nextTick,
  normalizeChildren,
  normalizeVNode,
  onBeforeMount,
  onBeforeUnmount,
  onBeforeUpdate,
  onMounted,
  onScopeDispose,
  onUnmounted,
  onUpdated,
  provide,
  proxyRefs,
  queueJob,
  reactive,
  reactiveMap,
  readonly,
  readonlyMap,
  recordEffectScope,
  ref,
  render,
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
//# sourceMappingURL=runtime-core.esm-bundler.js.map
