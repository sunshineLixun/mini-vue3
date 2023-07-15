export const enum ShapeFlags {
	ELEMENT = 1,
	FUNCTIONAL_COMPONENT = 1 << 1,
	STATEFUL_COMPONENT = 1 << 2,
	TEXT_CHILDREN = 1 << 3,
	ARRAY_CHILDREN = 1 << 4,
	SLOTS_CHILDREN = 1 << 5,
	TELEPORT = 1 << 6,
	SUSPENSE = 1 << 7,
	COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,
	COMPONENT_KEPT_ALIVE = 1 << 9,
	COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT
}

// 位运算

// 1 << 1 可以这么理解： 2的1次方 = 2
// 1 << 2: 2的2次方 = 4

// 也可以按照二进制来理解：
// 1 换算成二进制是： 00000001。
// 1 << 1 代表 1往前移动1个位置：00000010，换算成10进制 就是 2
// 1 << 2 代表 1往前移动2个位置：00000100，换算成10进制 就是 4
// 依次类推

// 类似的： 2 << 3
// 2 换算成二进制：00000010  然后 1 往前移动3位：00001000 换算成10进制 就是 8

//  |  或运算 : 如果有1 那就换成1
// eg.  1 | 2 = 3 =>  换算成二进制： 00000001 | 00000010 =  00000011

//  & 与运算 : 如果都是1 那就换成1
// eg.  1 & 2 = 0 =>  换算成二进制： 00000001 & 00000010 =  00000000

// 依次类推

// Vue这里用来判断虚拟dom的类型
