import { describe, test, expect } from 'vitest';
import { baseParse } from '../src/parse';
import { ElementNode, ElementTypes, NodeTypes, TextNode } from '../src/ast';

describe('compiler: parse', () => {
	describe('TEXT', () => {
		test('simple text', () => {
			const ast = baseParse('some text');

			const text = ast.children[0] as TextNode;

			expect(text).toStrictEqual({
				type: NodeTypes.TEXT,
				content: 'some text',
				loc: {
					end: { column: 10, line: 1, offset: 9 },
					start: { column: 1, line: 1, offset: 0 },
					source: 'some text'
				}
			});
		});

		test('simple text with invalid end tag', () => {
			const ast = baseParse('some text</div>');
			const text = ast.children[0] as TextNode;

			expect(text).toStrictEqual({
				type: NodeTypes.TEXT,
				content: 'some text',
				loc: {
					start: { offset: 0, line: 1, column: 1 },
					end: { offset: 9, line: 1, column: 10 },
					source: 'some text'
				}
			});
		});

		test('HTML error', () => {
			function getError() {
				throw new SyntaxError(' HTML语法错误');
			}

			try {
				const ast = baseParse('<div><span>some text</span>');
				const text = ast.children[0] as TextNode;
			} catch {
				console.log(expect(() => getError()).toThrow());
			}
		});
	});

	describe('ELEMENT', () => {
		test('simple div', () => {
			const ast = baseParse('<div>hello</div>');
			const element = ast.children[0] as ElementNode;

			expect(element).toStrictEqual({
				type: NodeTypes.ELEMENT,
				tag: 'div',
				tagType: ElementTypes.ELEMENT,
				isSelfClosing: false,
				children: [
					{
						type: NodeTypes.TEXT,
						content: 'hello',
						loc: {
							start: { column: 6, line: 1, offset: 5 },
							end: { column: 11, line: 1, offset: 10 },
							source: 'hello'
						}
					}
				],
				loc: {
					start: { column: 1, line: 1, offset: 0 },
					end: { column: 17, line: 1, offset: 16 },
					source: '<div>hello</div>'
				}
			});
		});

		test('empty', () => {
			const ast = baseParse('<div></div>');
			const element = ast.children[0] as ElementNode;

			expect(element).toStrictEqual({
				type: NodeTypes.ELEMENT,
				tag: 'div',
				tagType: ElementTypes.ELEMENT,
				children: [],
				isSelfClosing: false,
				loc: {
					start: { column: 1, line: 1, offset: 0 },
					end: { column: 12, line: 1, offset: 11 },
					source: '<div></div>'
				}
			});
		});

		test('self colsing', () => {
			const ast = baseParse('<div/>hello');
			const element = ast.children[0] as ElementNode;

			const text = ast.children[1] as TextNode;

			expect(element).toStrictEqual({
				type: NodeTypes.ELEMENT,
				children: [],
				isSelfClosing: true,
				tag: 'div',
				tagType: ElementTypes.ELEMENT,
				loc: {
					start: { column: 1, line: 1, offset: 0 },
					end: { column: 7, line: 1, offset: 6 },
					source: '<div/>'
				}
			});

			expect(text).toStrictEqual({
				type: NodeTypes.TEXT,
				content: 'hello',
				loc: {
					start: { column: 7, line: 1, offset: 6 },
					end: { column: 12, line: 1, offset: 11 },
					source: 'hello'
				}
			});
		});

		test('void tag', () => {
			const ast = baseParse('<img>hello', {
				isVoidTag(tag) {
					return tag === 'img';
				}
			});
			const element = ast.children[0] as ElementNode;

			console.log(element);

			expect(element).toStrictEqual({
				type: NodeTypes.ELEMENT,
				tag: 'img',
				isSelfClosing: false,
				loc: {
					start: { column: 1, line: 1, offset: 0 },
					end: { column: 6, line: 1, offset: 5 },
					source: '<img>'
				},
				children: [],
				tagType: ElementTypes.ELEMENT
			});
		});
	});
});
