export const isObject = (val: unknown): val is Record<any, any> => val !== null && typeof val === 'object';

export const hasChanged = (value: any, oldValue: any): boolean => !Object.is(value, oldValue);

export const isFunction = (val: unknown): val is Function => typeof val === 'function';

export const NOOP = () => {};

export const isArray = Array.isArray;

export const objectToString = Object.prototype.toString;
export const toTypeString = (value: unknown): string => objectToString.call(value);

export const isPlainObject = (val: unknown): val is object => toTypeString(val) === '[object Object]';
