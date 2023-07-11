import { ReactiveEffect } from './effect';

let activeEffectScope: EffectScope | undefined;

interface EffectScope {
	run<T>(fn: () => T): T | undefined; // 如果作用域不活跃就为 undefined
	stop(): void;
}

class EffectScope {
	// 标记是否是激活状态
	private _active = true;

	effects: ReactiveEffect[];

	parent: EffectScope;

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

	stop() {
		if (this._active) {
			this.effects.forEach(effect => {
				effect.stop();
			});
			this.effects.length = 0;
		}
	}
}

export function effectScope(): EffectScope {
	return new EffectScope();
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
