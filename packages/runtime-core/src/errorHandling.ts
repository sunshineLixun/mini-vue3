// 框架统一error处理

export function callWithErrorHandling(fn: Function, args?: unknown[]) {
	let res;
	try {
		res = args ? fn(...args) : fn();
	} catch (err) {
		// 可以统一错误信息
		console.log(err);
	}
	return res;
}
