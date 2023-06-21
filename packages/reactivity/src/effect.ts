// 全局的effect
export let activeEffect: ReactiveEffect | undefined;

export class ReactiveEffect<T = any> {
	active = true;

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
