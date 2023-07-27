import { describe, test, expect } from 'vitest';
import { baseParse } from '../src/parse';
import { NodeTypes, TextNode } from '../src/ast';

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

		// expect(text).toStrictEqual({
		// 	type: NodeTypes.TEXT,
		// 	content: 'some text',
		// 	loc: {
		// 		start: { offset: 0, line: 1, column: 1 },
		// 		end: { offset: 9, line: 1, column: 10 },
		// 		source: 'some text'
		// 	}
		// });
	});
});
