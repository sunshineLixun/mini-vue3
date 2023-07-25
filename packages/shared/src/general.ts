import { makeMap } from './makeMap';

export const isObject = (val: unknown): val is Record<any, any> => val !== null && typeof val === 'object';

export const hasChanged = (value: any, oldValue: any): boolean => !Object.is(value, oldValue);

export const isFunction = (val: unknown): val is Function => typeof val === 'function';

export const NOOP = () => {};

export const isArray = Array.isArray;
export const isMap = (val: unknown): val is Map<any, any> => toTypeString(val) === '[object Map]';
export const isSet = (val: unknown): val is Set<any> => toTypeString(val) === '[object Set]';
export const isString = (val: unknown): val is String => typeof val === 'string';

export const objectToString = Object.prototype.toString;
export const toTypeString = (value: unknown): string => objectToString.call(value);

export const isPlainObject = (val: unknown): val is object => toTypeString(val) === '[object Object]';

export const isNoEmptyValue = (val: unknown) => val !== undefined || val !== null;

export const extend = Object.assign;

export const EMPTY_OBJ: { readonly [key: string]: any } = {};

// 事件 onXxxx 或者也可以这么写： /^on[A-Z]/
export const onRE = /^on[^a-z]/;

export const isOn = (key: string) => onRE.test(key);

// 下面这些key是vue内部保留的关键字，元素自定义属性props一般不允许用下面的key, 空字符串也算
// ["", "key", "ref"]
export const isReservedProp = makeMap(',key,ref');
