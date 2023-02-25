"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.continueCommentCommand = void 0;
const vscode = require("vscode");
const util = require("./utilities");
const docMirror = require("./doc-mirror/index");
// Relies on that `when` claus guards this from being called
// when the cursor is before the comment marker
function continueCommentCommand() {
    var _a;
    const document = util.tryToGetDocument({});
    if (document && document.languageId === 'janet') {
        const editor = util.getActiveTextEditor();
        const position = editor.selection.active;
        const cursor = docMirror.getDocument(document).getTokenCursor();
        if (cursor.getToken().type !== 'comment') {
            if (cursor.getPrevToken().type === 'comment') {
                cursor.previous();
            }
            else {
                return;
            }
        }
        const commentOffset = cursor.rowCol[1];
        const commentText = cursor.getToken().raw;
        const [_1, startText, bullet, num] = (_a = commentText.match(/^([#\s]+)([*-] +|(\d+)\. +)?/)) !== null && _a !== void 0 ? _a : [];
        const newNum = num ? parseInt(num) + 1 : undefined;
        const bulletText = newNum ? bullet.replace(/\d+/, '' + newNum) : bullet;
        const pad = ' '.repeat(commentOffset);
        const newText = `${pad}${startText}${bullet ? bulletText : ''}`;
        void editor
            .edit((edits) => edits.insert(position, `\n${newText}`), {
            undoStopAfter: false,
            undoStopBefore: true,
        })
            .then((fulfilled) => {
            if (fulfilled) {
                const newPosition = position.with(position.line + 1, newText.length);
                editor.selection = new vscode.Selection(newPosition, newPosition);
            }
        });
    }
}
exports.continueCommentCommand = continueCommentCommand;
//# sourceMappingURL=edit.js.map