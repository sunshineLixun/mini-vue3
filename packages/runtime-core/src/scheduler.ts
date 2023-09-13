import { callWithErrorHandling } from './errorHandling';

export interface SchedulerJob extends Function {
	id?: number;
	active?: boolean;
}

const queue: SchedulerJob[] = [];
let isFlushing = false;
const resolvedPromise = Promise.resolve() as Promise<any>;

// vue3 的 nextTick 没有像vue2那样 一直降级处理，不考虑兼容问题 直接promise
// vue2: promise -> MutationObserver -> setTimeout ->
export function nextTick<T = void, R = void>(this: T, fn?: (this: T) => R) {
	const p = resolvedPromise;
	return fn ? p.then(this ? fn.bind(this) : fn) : p;
}

export function queueJob(job: SchedulerJob) {
	if (!queue.length || !queue.includes(job)) {
		queue.push(job);
	}

	// 异步执行队列中所有的回调
	if (!isFlushing) {
		isFlushing = true;
		resolvedPromise.then(() => {
			try {
				queue.forEach(job => callWithErrorHandling(job, null));
			} finally {
				// 同一批任务执行完成之后，清空队列，重置状态
				isFlushing = false;
				queue.length = 0;
			}
		});
	}
}
