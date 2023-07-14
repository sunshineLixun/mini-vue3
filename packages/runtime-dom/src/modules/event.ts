// 事件fn的类型
type EventValue = Function | ((e: Event) => void);

// invoker.value = fn
export interface Invoker extends EventListener {
	value: EventValue;
}

// invoker 记录事件的对象，其value属性保存着对用户事件的引用，
// 当新的值过来， 只需要替换value属性即刻

export function patchEvent(
	el: Element & { _vei?: Record<string, Invoker | undefined> },
	key: string,
	nextValue: EventValue | null
) {
	// 去掉on, 事件名称转小写
	// onXxxx -> xxxx
	const name = key.slice(2).toLowerCase();

	// _vei = vue event invokers 给element元素扩展一个_vei对象，其作用就是暂存invokers
	// 每当有新的fn进来，就会先从元素上取一遍invokers，没有的话创建一个新的
	// 数据结构如下：
	// _vei = invokers = {事件名称: invoker = fn}
	// fn函数上有value属性 映射的是fn本身
	const invokers = el._vei || (el._vei = {});

	// 获取缓存的invokers
	const existingInvoker = invokers[name];

	// 存在新值 也存在老值
	if (nextValue && existingInvoker) {
		// 替换老值
		existingInvoker.value = nextValue;
	} else {
		// 有可能新值没有，也有可能老值没有

		if (nextValue) {
			// 存在新值，不存在老值
			// 设置新值的事件监听， 缓存invokers
			const invoker = (invokers[name] = createInvoker(nextValue));

			// 设置事件监听
			el.addEventListener(name, invoker);
		} else if (existingInvoker) {
			// 新值是没有的，但是存在老值，意味着这次更新，fn传入了null，就需要移除掉老值事件
			el.removeEventListener(name, existingInvoker);
			// 删除缓存的invoker
			invokers[name] = null;
		}
	}
}

/**
 *  invoker = fn
 * 	invoker.value = invoker
 *
 * 	invoker.value === invoker  true
 */
function createInvoker(initialValue: EventValue): Invoker {
	// 创建一个新的invoker函数， 当invoker执行的时候，就是执行initialValue函数
	// invoker.value === initialValue  true
	const invoker: Invoker = (e: Event) => invoker.value(e);
	// 设置新值
	invoker.value = initialValue;
	return invoker;
}
