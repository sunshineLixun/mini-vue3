import { ReactiveEffect } from './effect';

let activeEffectScope: EffectScope | undefined;

interface EffectScope {
	run<T>(fn: () => T): T | undefined; // 如果作用域不活跃就为 undefined
	stop(): void;
}

// EffectScope 实现方式跟effect一样的道理，scope内部的effect收集当前正在执行effectScope作用域

/**
 * @example
 * ```js
 			const scope = effectScope();
			scope.run(() => {
				const state = reactive({ name: 'xxx' });

				// 内部收集了effect， 当调用scope.stop时，其内部会把收集到effect全部stop
				effect(() => {
					console.log(state.name);
				});

				setTimeout(() => {
					state.name = 'kkkk';
				}, 1000);

				const scope2 = effectScope();
				scope2.run(() => {
					const state = reactive({ age: 10 });

					effect(() => console.log(state.age));

					setTimeout(() => {
						state.age++;
					}, 1000);
				});
			});

			scope.stop();
 * ```
 */

class EffectScope {
	// 标记是否是激活状态
	private _active = true;

	// 记录收集到的effect
	effects: ReactiveEffect[];

	parent: EffectScope;

	cleanups: (() => void)[];

	// 记录内部的所有作用域
	scopes: EffectScope[] | undefined;

	// detached 是否是独立的，默认不是独立的，受父作用域控制
	constructor(public detached: boolean = false) {
		// 不是独立的就会收集起来，父作用域stop，子作用域也会stop
		// 如果是独立的，则不会，子作用域scope内部的代码不受影响
		if (!detached && activeEffectScope) {
			// 收集作用域
			(activeEffectScope.scopes || (activeEffectScope.scopes = [])).push(this);
		}
	}

	run<T>(fn: () => T): T | undefined {
		if (this._active) {
			try {
				this.parent = activeEffectScope;
				activeEffectScope = this;
				return fn();
			} finally {
				activeEffectScope = this.parent;
				this.parent = undefined;
			}
		}
	}

	// 将收集到的effect全部stop
	stop() {
		if (this._active) {
			if (this.effects) {
				this.effects.forEach(effect => {
					effect.stop();
				});
				this.effects.length = 0;
			}

			if (this.cleanups) {
				this.cleanups.forEach(fn => fn());
			}

			// 如果有子作用域，表明子作用域不是独立的，执行子作用域的stop
			if (this.scopes) {
				this.scopes.forEach(self => {
					self.stop();
				});
			}

			this._active = false;
		}
	}
}

export function effectScope(detached?: boolean): EffectScope {
	return new EffectScope(detached);
}

export function recordEffectScope(effect: ReactiveEffect) {
	if (activeEffectScope) {
		// 收集effect
		(activeEffectScope.effects || (activeEffectScope.effects = [])).push(effect);
	}
}

export function getCurrentScope(): EffectScope | undefined {
	return activeEffectScope;
}

export function onScopeDispose(fn: () => void) {
	if (activeEffectScope) {
		(activeEffectScope.cleanups || (activeEffectScope.cleanups = [])).push(fn);
	}
}
