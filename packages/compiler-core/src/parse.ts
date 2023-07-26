import { ElementNode, NodeTypes, Position, SourceLocation, TemplateChildNode, createRoot } from './ast';

//TODO:
export interface ParserOptions {}

export const enum TextModes {
	//          | Elements | Entities | End sign              | Inside of
	DATA, //    | ✔        | ✔        | End tags of ancestors |
	RCDATA, //  | ✘        | ✔        | End tag of the parent | <textarea>
	RAWTEXT, // | ✘        | ✘        | End tag of the parent | <style>,<script>
	CDATA,
	ATTRIBUTE_VALUE
}

export interface ParserContext {
	options: ParserOptions;
	readonly originalSource: string;
	source: string;
	offset: number;
	line: number;
	column: number;
}

export function baseParase(content: string, options: ParserOptions) {
	const context = createParserContext(content, options);
	const start = getCursor(context);
	const children = parseChildren(context, TextModes.DATA, []);
	const loc = getSelection(context, start);
	return createRoot(children, loc);
}

function parseChildren(context: ParserContext, mode: TextModes, ancestors: ElementNode[]) {
	const nodes: TemplateChildNode[] = [];

	// 直到找到标签结束为止
	while (!isEnd(context, mode, ancestors)) {
		const s = context.source;
		let node: TemplateChildNode | TemplateChildNode[] | undefined = undefined;
	}

	return nodes;
}

function createParserContext(content: string, options: ParserOptions): ParserContext {
	return {
		options,
		// 列
		column: 1,
		// 默认第一行
		line: 1,
		// 没有偏移
		offset: 0,
		// 源数据
		originalSource: content,
		source: content
	};
}

function getCursor(context: ParserContext): Position {
	const { column, line, offset } = context;
	return { column, line, offset };
}

function getSelection(context: ParserContext, start: Position, end?: Position): SourceLocation {
	end = end || getCursor(context);
	return {
		start,
		end,
		// 截取开始/结束区间的数据
		source: context.originalSource.slice(start.offset, end.offset)
	};
}

function startsWith(source: string, searchString: string) {
	return source.startsWith(searchString);
}

function isEnd(context: ParserContext, mode: TextModes, ancestors: ElementNode[]) {
	const s = context.source;
	switch (mode) {
		case TextModes.DATA:
			// </div> 标签结束
			if (startsWith(s, '</')) {
				for (let i = ancestors.length - 1; i >= 0; --i) {
					if (startsWithEndTagOpen(s, ancestors[i].tag)) {
						return true;
					}
				}
			}
			break;

		default:
			break;
	}
	return !s;
}

function startsWithEndTagOpen(source: string, tag: string) {
	// tag: div span  br  ul

	// </div>
	// source.slice(2, tag.length + 2) = div
	// 匹配最后一个 闭合标签  >
	return (
		startsWith(source, '</') &&
		source.slice(2, tag.length + 2).toLowerCase() === tag.toLowerCase() &&
		/[\s />]/.test(source[tag.length + 2] || '>')
	);
}
