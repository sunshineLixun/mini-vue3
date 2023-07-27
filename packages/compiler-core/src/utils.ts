import { extend } from '@vue/shared';
import { Position } from './ast';

/**
 * Advances the position with mutation.
 *
 * @param {Position} pos - The current position.
 * @param {string} source - The source string.
 * @param {number} [numberOfCharacters=source.length] - The number of characters to advance.
 * @return {Position} The updated position.
 */
export function advancePositionWithMutation(
	pos: Position,
	source: string,
	numberOfCharacters: number = source.length
): Position {
	// 默认第0行
	let linesCount = 0;
	// 折行位置
	let lastNewLinePos = -1;
	// some text
	for (let i = 0; i < numberOfCharacters; i++) {
		// 换行符 \n
		// "\n".charCodeAt(0) === 10
		if (source.charCodeAt(i) === 10) {
			// 累计行数
			linesCount++;

			// 记录最后一个行数
			lastNewLinePos = i;
		}
	}

	// 偏移 += 文本长度
	pos.offset += numberOfCharacters;
	// 行 += 行数
	pos.line += linesCount;

	// 列 = 有换行，就取之前的列数+文本长度
	// 换行之后，新起的行数，就是折行后最后一列
	pos.column = lastNewLinePos === -1 ? pos.column + numberOfCharacters : numberOfCharacters - lastNewLinePos;

	return pos;
}
