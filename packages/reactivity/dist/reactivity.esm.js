// packages/shared/src/general.ts
var isObject = (val) => val !== null && typeof val === "object";
var hasChanged = (value, oldValue) => !Object.is(value, oldValue);
var isFunction = (val) => typeof val === "function";
var NOOP = () => {
};
var isArray = Array.isArray;
var objectToString = Object.prototype.toString;
var toTypeString = (value) => objectToString.call(value);
var isPlainObject = (val) => toTypeString(val) === "[object Object]";

// packages/reactivity/src/dep.ts
var createDep = (effects) => {
  const dep = new Set(effects);
  return dep;
};

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
function cleanupEffect(effect2) {
  const { deps } = effect2;
  if (deps.length) {
    for (let index = 0; index < deps.length; index++) {
      deps[index].delete(effect2);
    }
    deps.length = 0;
  }
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
var get = createGetter(false);
var readonlyGet = createGetter(true);
function createGetter(isReadonly2 = false) {
  return function get2(target, key, receiver) {
    const weakMap = isReadonly2 ? readonlyMap : reactiveMap;
    if (key === "__v_isReactive" /* IS_REACTIVE */) {
      return !isReadonly2;
    } else if (key === "__v_isReadonly" /* IS_READONLY */) {
      return isReadonly2;
    } else if (key === "__v_raw" /* RAW */ && receiver === weakMap.get(target)) {
      return target;
    }
    if (!isReadonly2) {
      track(target, key);
    }
    const res = Reflect.get(target, key, receiver);
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
function readonly(target) {
  return createReactiveObject(target, true, readonlyHandlers, readonlyMap);
}
function reactive(target) {
  if (!isObject(target)) {
    return target;
  }
  if (isReadonly(target)) {
    return target;
  }
  return createReactiveObject(target, false, mutableHandlers, reactiveMap);
}
function createReactiveObject(target, isReadonly2, baseHandlers, proxyMap) {
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
function watchEffect(effect2, options) {
  doWatch(effect2, null, options);
}
function watch(source, cb, options) {
  doWatch(source, cb, options);
}
function doWatch(source, cb, { immediate, deep } = {}) {
  let getter;
  if (isReactive(source)) {
    getter = () => traverse(source);
    deep = true;
  } else if (isFunction(source)) {
    getter = source;
  } else {
    getter = NOOP;
  }
  let oldValue = void 0;
  const job = () => {
    if (!effect2.active) {
      return;
    }
    if (cb) {
      const newValue = effect2.run();
      cb(newValue, oldValue);
      oldValue = newValue;
    } else {
      effect2.run();
    }
  };
  const effect2 = new ReactiveEffect(getter, job);
  if (cb) {
    if (immediate) {
      job();
    } else {
      oldValue = effect2.run();
    }
  } else {
    effect2.run();
  }
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
  if (isArray(value)) {
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
  isProxy,
  isReactive,
  isReadonly,
  reactive,
  reactiveMap,
  readonly,
  readonlyMap,
  stop,
  toRaw,
  track,
  trackEffects,
  traverse,
  trigger,
  triggerEffects,
  watch,
  watchEffect
};
//# sourceMappingURL=reactivity.esm.js.map
