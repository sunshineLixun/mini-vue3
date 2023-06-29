import { Dep } from './dep';

// 全局的effect
export let activeEffect: ReactiveEffect | undefined;

//  weakMap = {
// 	 		target: {
// 	 			key: Set<ReactiveEffect, ReactiveEffect, ReactiveEffect>
// 	 		}
// 	 }
const targetMap = new WeakMap<any, Map<any, Dep>>();

export type EffectScheduler = (...args: any[]) => any;

export interface ReactiveEffectRunner<T = any> {
	(): T;
	effect: ReactiveEffect;
}

export interface ReactiveEffectOptions {
	scheduler?: EffectScheduler;
}

export class ReactiveEffect<T = any> {
	// 标记当前effect是否是激活状态，如果是激活状态，会触发依赖收集
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
	constructor(public fn: () => T, public scheduler: EffectScheduler | null = null) {}

	run() {
		// 如果不是激活态，直接返回回调函数执行结果
		if (!this.active) {
			return this.fn();
		}

		try {
			this.parent = activeEffect;
			activeEffect = this;

			// 执行依赖回调之前，先清空收集的effects
			cleanupEffect(this);
			return this.fn();
		} finally {
			// e1
			activeEffect = this.parent;
			this.parent = undefined;
		}
	}

	stop() {
		if (this.active) {
			cleanupEffect(this);
			this.active = false;
		}
	}
}

export function effect<T = any>(fn: () => T, options?: ReactiveEffectOptions) {
	const _effect = new ReactiveEffect(fn, options.scheduler);

	if (!options) {
		_effect.run();
	}

	const runner = _effect.run.bind(_effect) as ReactiveEffectRunner;
	runner.effect = _effect;
	return runner;
}

export function stop(runner: ReactiveEffectRunner) {
	runner.effect.stop();
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

	let deps: (Dep | undefined)[] = [];
	if (key !== undefined) {
		deps.push(depsMap.get(key));
	}

	// copy一份deps，清理依赖时候，防止死循环
	const effects: ReactiveEffect[] = [];
	for (const dep of deps) {
		if (dep) {
			effects.push(...dep);
		}
	}
	if (effects) {
		effects.forEach(effect => {
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
				if (effect.scheduler) {
					effect.scheduler();
				} else {
					// 更新依赖
					effect.run();
				}
			}
		});
	}
}

/**
 * 清理依赖
 * @param effect 当前的effect
 */
export function cleanupEffect(effect: ReactiveEffect) {
	const { deps } = effect;
	if (deps.length) {
		for (let index = 0; index < deps.length; index++) {
			deps[index].delete(effect);
		}
		deps.length = 0;
	}
}
