"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const fs = require("fs");
const os = require("os");
const path = require("path");
const vscode = require("vscode");
const schemeConfiguration_1 = require("./schemeConfiguration");
const windows = os.platform() == 'win32';
const hyBinary = windows ? 'hy.exe' : 'hy';
const terminalName = 'Hy REPL';
function hyExists() {
    return process.env['PATH'].split(path.delimiter)
        .some((x) => fs.existsSync(path.resolve(x, hyBinary)));
}
// function newREPL(): Thenable<vscode.Terminal> {
// 	const terminal = vscode.window.createTerminal(terminalName);
// 	terminal.sendText(hyBinary, true);
// 	return vscode.window.withProgress({
// 		location: vscode.ProgressLocation.Notification,
// 		title: "Running Janet REPL...",
// 		cancellable: false
// 	}, (progress, token) => {
// 		return new Promise<vscode.Terminal>(resolve => {
// 			setTimeout(() => {
// 				terminal.show();
// 				thenFocusTextEditor();
// 				resolve(terminal);
// 			}, 2000);
// 		});
// 	});
// }
function activate(ctx) {
    ctx.subscriptions.push(vscode.languages.setLanguageConfiguration('scheme', schemeConfiguration_1.configuration));
}
exports.activate = activate;
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=hyMain.js.map