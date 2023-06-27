import { Dep } from './dep';

// 全局的effect
export let activeEffect: ReactiveEffect | undefined;

//  weakMap = {
// 	 		target: {
// 	 			key: Set<ReactiveEffect, ReactiveEffect, ReactiveEffect>
// 	 		}
// 	 }
const targetMap = new WeakMap<any, Map<any, Dep>>();

export class ReactiveEffect<T = any> {
	active = true;
	// 收集当前激活的activeEffect
	deps: Dep[] = [];
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
	parent: ReactiveEffect | undefined = undefined;
	constructor(public fn: () => T) {}

	run() {
		// 如果不是激活态，直接返回回调函数执行结果
		if (!this.active) {
			return this.fn();
		}

		try {
			this.parent = activeEffect;
			activeEffect = this;
			return this.fn();
		} finally {
			// e1
			activeEffect = this.parent;
			this.parent = undefined;
		}
	}
}

export function effect<T = any>(fn: () => T) {
	const _effect = new ReactiveEffect(fn);
	_effect.run();
}

/**
 * 收集依赖
 * 收集数据格式如下：
 * weakMap = {
 * 		target: {
 * 			key: Set<ReactiveEffect, ReactiveEffect, ReactiveEffect>
 * 		}
 * }
 *
 * 因为一个取值操作可以发生在多个effect中，所以Set里面会有多个ReactiveEffect
 *
 * @param target
 * @param key
 */
export function track(target: object, key: unknown) {
	if (activeEffect) {
		// 说明当前取值操作发生在effect中
		let depsMap = targetMap.get(target);
		if (!depsMap) {
			// 不存在，创建一个空map
			targetMap.set(target, (depsMap = new Map()));
		}
		let dep = depsMap.get(key);
		if (!dep) {
			depsMap.set(key, (dep = new Set<ReactiveEffect>()));
		}
		let shouldTrack = !dep.has(activeEffect);
		if (shouldTrack) {
			// 如果Set中没有当前激活的activeEffect，需要做收集
			dep.add(activeEffect);
			activeEffect.deps.push(dep);
		}
	}
}

/**
 * 触发依赖更新
 * @param target
 * @param key
 * @param newValue
 * @param oldValue
 */
export function trigger(target: object, key: unknown, newValue: unknown, oldValue: unknown) {
	const depsMap = targetMap.get(target);
	// 没有收集该对象
	if (!depsMap) {
		return;
	}

	const deps = depsMap.get(key);
	if (deps) {
		deps.forEach(effect => {
			/**
			 * effect(() => {
			 * 		state.name = 123123
			 * })
			 *
			 * 为了防止在依赖中更新响应式数据，造成死循环，这里要做判断，
			 * 如果当前正在执行的effect === 全局中activeEffect，表明此effect正在执行
			 *
			 */
			if (activeEffect !== effect) {
				// 更新依赖
				// 每次执行run都会重新收集依赖， run() 会访问响应式数据的数值，触发get方法 -> track
				effect.run();
			}
		});
	}
}
