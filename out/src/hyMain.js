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
function newREPL() {
    const terminal = vscode.window.createTerminal(terminalName);
    terminal.sendText(hyBinary, true);
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Running Janet REPL...",
        cancellable: false
    }, (progress, token) => {
        return new Promise(resolve => {
            setTimeout(() => {
                terminal.show();
                thenFocusTextEditor();
                resolve(terminal);
            }, 2000);
        });
    });
}
function getREPL(show) {
    const terminal = vscode.window.terminals.find(x => x.name === terminalName);
    const terminalP = (terminal) ? Promise.resolve(terminal) : newREPL();
    return terminalP.then(t => {
        if (show) {
            t.show();
        }
        return t;
    });
}
function sendSource(terminal, text) {
    terminal.sendText(text, true);
}
function thenFocusTextEditor() {
    setTimeout(() => vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup'), 250);
}
function activate(context) {
    console.log('Extension "vscode-hy" is now active!');
    if (!hyExists()) {
        vscode.window.showErrorMessage('Can\'t find Hy language on your computer! Check your PATH variable.');
        return;
    }
    context.subscriptions.push(vscode.commands.registerCommand('hy.startREPL', () => {
        getREPL(true);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('hy.eval', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor == null)
            return;
        getREPL(true).then(terminal => {
            function send(terminal) {
                sendSource(terminal, editor.document.getText(editor.selection));
                thenFocusTextEditor();
            }
            if (editor.selection.isEmpty)
                vscode.commands.executeCommand('editor.action.selectToBracket').then(() => send(terminal));
            else
                send(terminal);
        });
    }));
    context.subscriptions.push(vscode.commands.registerCommand('hy.evalFile', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor == null)
            return;
        getREPL(true).then(terminal => {
            sendSource(terminal, editor.document.getText());
            thenFocusTextEditor();
        });
    }));
    context.subscriptions.push(vscode.languages.setLanguageConfiguration('scheme', schemeConfiguration_1.configuration));
}
exports.activate = activate;
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=hyMain.js.map