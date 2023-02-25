"use strict";
/* eslint-disable no-control-regex */
/**
 * Calva Clojure Lexer
 *
 * NB: The lexer tokenizes any combination of clojure quotes, `~`, and `@` prepending a list, symbol, or a literal
 *     as one token, together with said list, symbol, or literal, even if there is whitespace between the quoting characters.
 *     All such combos won't actually be accepted by the Clojure Reader, but, hey, we're not writing a Clojure Reader here. 😀
 *     See below for the regex used for this.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scanner = exports.validPair = exports.toplevel = void 0;
// prefixing patterns - TODO: revisit these and see if we can always use the same
// opens ((?<!\p{Ll})['`~#@?^]\s*)*
// id    (['`~#^@]\s*)*
// lit   (['`~#]\s*)*
// kw    (['`~^]\s*)*
const lexer_1 = require("./lexer");
/**
 * The 'toplevel' lexical grammar. This grammar contains all normal tokens. Strings are identified as
 * "open", and trigger the lexer to switch to the 'inString' lexical grammar.
 */
exports.toplevel = new lexer_1.LexicalGrammar();
/**
 * Returns `true` if open and close are compatible parentheses
 * @param open
 * @param close
 */
function validPair(open, close) {
    const openBracket = open[open.length - 1];
    switch (close) {
        case ')':
            return openBracket === '(';
        case ']':
            return openBracket === '[';
        case '}':
            return openBracket === '{';
        case '"':
            return openBracket === '"';
    }
    return false;
}
exports.validPair = validPair;
// whitespace, excluding newlines
exports.toplevel.terminal('ws', /[\t ,]+/, (l, m) => ({ type: 'ws' }));
// newlines, we want each one as a token of its own
exports.toplevel.terminal('ws-nl', /(\r|\n|\r\n)/, (l, m) => ({ type: 'ws' }));
// lots of other things are considered whitespace
// https://github.com/sogaiu/tree-sitter-clojure/blob/f8006afc91296b0cdb09bfa04e08a6b3347e5962/grammar.js#L6-L32
exports.toplevel.terminal('ws-other', /[\f\u000B\u001C\u001D\u001E\u001F\u2028\u2029\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2008\u2009\u200a\u205f\u3000]+/, (l, m) => ({ type: 'ws' }));
// comments
exports.toplevel.terminal('comment', /;.*/, (l, m) => ({ type: 'comment' }));
// Calva repl prompt, it contains special colon symbols and a hard space
exports.toplevel.terminal('comment', 
// eslint-disable-next-line no-irregular-whitespace
/^[^()[\]{},~@`^"\s;]+꞉[^()[\]{},~@`^"\s;]+꞉> /, (l, m) => ({ type: 'prompt' }));
// current idea for prefixing data reader
// (#[^\(\)\[\]\{\}"_@~\s,]+[\s,]*)*
// open parens
exports.toplevel.terminal('open', /((?<=(^|[()[\]{}\s,]))['`~#@?^]\s*)*['`~#@?^]*[([{"]/, (l, m) => ({
    type: 'open',
}));
// close parens
exports.toplevel.terminal('close', /\)|\]|\}/, (l, m) => ({ type: 'close' }));
// ignores
exports.toplevel.terminal('ignore', /#_/, (l, m) => ({ type: 'ignore' }));
// literals
exports.toplevel.terminal('lit-quoted-ws', /\\[\n\r\t ]/, (l, m) => ({ type: 'lit' }));
exports.toplevel.terminal('lit-quoted-chars', /\\.?/, (l, m) => ({ type: 'lit' }));
exports.toplevel.terminal('lit-quoted', /\\[^()[\]{}\s;,\\][^()[\]{}\s;,\\]+/, (l, m) => ({ type: 'lit' }));
exports.toplevel.terminal('lit-quoted-brackets', /\\[()[\]{}]/, (l, m) => ({
    type: 'lit',
}));
exports.toplevel.terminal('lit-symbolic-values', /##[\s,]*(NaN|-?Inf)/, (l, m) => ({
    type: 'lit',
}));
exports.toplevel.terminal('lit-reserved', /(['`~#]\s*)*(true|false|nil)/, (l, m) => ({
    type: 'lit',
}));
exports.toplevel.terminal('lit-integer', /(['`~#]\s*)*[-+]?(0+|[1-9]+[0-9]*)([rR][0-9a-zA-Z]+|[N])*/, (l, m) => ({
    type: 'lit',
}));
exports.toplevel.terminal('lit-number-sci', /(['`~#]\s*)*([-+]?(0+[0-9]*|[1-9]+[0-9]*)(\.[0-9]+)?([eE][-+]?[0-9]+)?)M?/, (l, m) => ({ type: 'lit' }));
exports.toplevel.terminal('lit-hex-integer', /(['`~#]\s*)*[-+]?0[xX][0-9a-zA-Z]+/, (l, m) => ({
    type: 'lit',
}));
exports.toplevel.terminal('lit-octal-integer', /(['`~#]\s*)*[-+]?0[0-9]+[nN]?/, (l, m) => ({
    type: 'lit',
}));
exports.toplevel.terminal('lit-ratio', /(['`~#]\s*)*[-+]?\d+\/\d+/, (l, m) => ({
    type: 'lit',
}));
exports.toplevel.terminal('kw', /(['`~^]\s*)*(:[^()[\]{},~@`^"\s;]*)/, (l, m) => ({
    type: 'kw',
}));
// data readers
exports.toplevel.terminal('reader', /#[^()[\]{}'"_@~\s,;\\]+/, (_l, _m) => ({
    type: 'reader',
}));
// symbols, allows quite a lot, but can't start with `#_`, anything numeric, or a selection of chars
exports.toplevel.terminal('id', /(['`~#^@]\s*)*(((?<!#)_|[+-](?!\d)|[^-+\d_()[\]{}#,~@'`^"\s:;\\])[^()[\]{},~@`^"\s;\\]*)/, (l, m) => ({ type: 'id' }));
// Lexer croaks without this catch-all safe
exports.toplevel.terminal('junk', /[\u0000-\uffff]/, (l, m) => ({ type: 'junk' }));
/** This is inside-string string grammar. It spits out 'close' once it is time to switch back to the 'toplevel' grammar,
 * and 'str-inside' for the words in the string. */
const inString = new lexer_1.LexicalGrammar();
// end a string
inString.terminal('close', /"/, (l, m) => ({ type: 'close' }));
// still within a string
inString.terminal('str-inside', /(\\.|[^"\s])+/, (l, m) => ({
    type: 'str-inside',
}));
// whitespace, excluding newlines
inString.terminal('ws', /[\t ]+/, (l, m) => ({ type: 'ws' }));
// newlines, we want each one as a token of its own
inString.terminal('ws-nl', /(\r?\n)/, (l, m) => ({ type: 'ws' }));
// Lexer can croak on funny data without this catch-all safe: see https://github.com/BetterThanTomorrow/calva/issues/659
inString.terminal('junk', /[\u0000-\uffff]/, (l, m) => ({ type: 'junk' }));
/**
 * A Clojure(Script) lexical analyser.
 * Takes a line of text and a start state, and returns an array of Token, updating its internal state.
 */
class Scanner {
    constructor(maxLength) {
        this.maxLength = maxLength;
        this.state = { inString: false };
    }
    processLine(line, state = this.state) {
        const tks = [];
        this.state = state;
        let lex = (this.state.inString ? inString : exports.toplevel).lex(line, this.maxLength);
        let tk;
        do {
            tk = lex.scan();
            if (tk) {
                const oldpos = lex.position;
                if (tk.raw.match(/[~`'@#]*"$/)) {
                    switch (tk.type) {
                        case 'open': // string started, switch to inString.
                            this.state = { ...this.state, inString: true };
                            lex = inString.lex(line, this.maxLength);
                            lex.position = oldpos;
                            break;
                        case 'close':
                            // string ended, switch back to toplevel
                            this.state = { ...this.state, inString: false };
                            lex = exports.toplevel.lex(line, this.maxLength);
                            lex.position = oldpos;
                            break;
                    }
                }
                tks.push({ ...tk, state: this.state });
            }
        } while (tk);
        // insert a sentinel EOL value, this allows us to simplify TokenCaret's implementation.
        tks.push({
            type: 'eol',
            raw: '\n',
            offset: line.length,
            state: this.state,
        });
        return tks;
    }
}
exports.Scanner = Scanner;
//# sourceMappingURL=clojure-lexer.js.map