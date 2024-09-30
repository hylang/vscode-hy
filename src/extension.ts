import {spawnSync} from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {configuration} from './schemeConfiguration';
import * as paredit from './paredit/extension';
import * as fmt from './calva-fmt/src/extension';
import * as model from './cursor-doc/model';
import * as config from './config';
import * as whenContexts from './when-contexts';
import * as edit from './edit';
import annotations from './providers/annotations';
// import * as util from './utilities';
import * as evaluate from './evaluate';
import { SelectionAndText } from './util/get-text';

import * as state from './state';
import status from './status';

const windows: boolean = os.platform() == 'win32';

const hyBinary: string = windows ? 'hy.exe' : 'hy';
const terminalName = 'Hy REPL';

function hy_test(hy_path: string): boolean {
	const cp = spawnSync(hy_path, ['-c', '(print (+ 1 2))']);
	if (cp.error) {
		vscode.window.showErrorMessage(`hy error: ${cp.error}`);
		return false;
	} else if (cp.stdout) {
		return parseInt(cp.stdout.toString()) == 3;
	} else {
		return false;
	}
}

async function hyExists(): Promise<boolean> {
	// original test
	if (process.env['PATH'].split(path.delimiter).some((x) => fs.existsSync(path.resolve(x, hyBinary)))) {
		return true;
	}

	// venv test
	const py_ext = vscode.extensions.getExtension('ms-python.python');
	await py_ext.activate();
	if (!py_ext.exports || !py_ext.exports.environments || !py_ext.exports.environments.known) {
		vscode.window.showErrorMessage(`exports: ${JSON.stringify(py_ext)}`);
	}
	const venv = py_ext.exports.environments.known.find(o => o.internal
		&& (o.internal.environment && o.internal.environment.type == 'VirtualEnvironment')
		&& (o.internal.environment.folderUri && o.internal.environment.folderUri.path)
		&& (o.internal.tools && o.internal.tools[0] == 'Venv')
	);
	if (venv) {
		const hy_path = path.resolve(venv.internal.environment.folderUri.path, 'bin', hyBinary);
		return fs.existsSync(hy_path) && hy_test(hy_path);
	} else {
		vscode.window.showWarningMessage(`no venv: ${JSON.stringify(py_ext.exports.environments.known)}`);
		return false;
	}
}

function newREPL(): Thenable<vscode.Terminal> {
	const terminal = vscode.window.createTerminal(terminalName);
	terminal.sendText(hyBinary, true);
	return vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: "Running Hy REPL...",
		cancellable: false
	}, (progress, token) => {
		return new Promise<vscode.Terminal>(resolve => {
			setTimeout(() => {
				terminal.show();
				thenFocusTextEditor();
				resolve(terminal);
			}, 2000);
		});
	});
}

function getREPL(show: boolean): Thenable<vscode.Terminal> {
	const terminal: vscode.Terminal = vscode.window.terminals.find(x => x.name === terminalName);
	const terminalP = (terminal) ? Promise.resolve(terminal) : newREPL();
	return terminalP.then(t => {
		if (show) {
			t.show();
		}
		return t;
	});
}

function sendSource(terminal: vscode.Terminal, text: string) {
	terminal.sendText(text, true);
}

function thenFocusTextEditor() {
	setTimeout(() => vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup'), 250);
}

async function onDidSave(testController: vscode.TestController, document: vscode.TextDocument) {
	const { evaluate, test } = config.getConfig();
  
	if (document.languageId !== 'hy') {
	  return;
	}
  
	// 	if (test && util.getConnectedState()) {
	// 	//   void testRunner.runNamespaceTests(testController, document);
	// 	  state.analytics().logEvent('Calva', 'OnSaveTest').send();
	// 	} else if (evaluate) {
	// 	  if (!outputWindow.isResultsDoc(document)) {
	// 		await eval.loadFile(document, config.getConfig().prettyPrintingOptions);
	// 		outputWindow.appendPrompt();
	// 		state.analytics().logEvent('Calva', 'OnSaveLoad').send();
	// 	  }
	// 	}
}  

function onDidOpen(document) {
	if (document.languageId !== 'hy') {
	  return;
	}
}

function onDidChangeEditorOrSelection(editor: vscode.TextEditor) {
	// replHistory.setReplHistoryCommandsActiveContext(editor);
	whenContexts.setCursorContextIfChanged(editor);
}
  
function setKeybindingsEnabledContext() {
	const keybindingsEnabled = vscode.workspace
	  .getConfiguration()
	  .get(config.KEYBINDINGS_ENABLED_CONFIG_KEY);
	void vscode.commands.executeCommand(
	  'setContext',
	  config.KEYBINDINGS_ENABLED_CONTEXT_KEY,
	  keybindingsEnabled
	);
}

function sendToREPL(
	f: (editor: vscode.TextEditor) => SelectionAndText,
	ignoreSelection: boolean
){
    const editor = vscode.window.activeTextEditor;
	if (editor == null) return;
	const terminal: vscode.Terminal = vscode.window.terminals.find(x => x.name === terminalName);
	const newTerminal = (terminal) ? false : true;
	getREPL(true).then(terminal => {
		function send(terminal: vscode.Terminal, text: string) {
			sendSource(terminal, text);
			if (!newTerminal) {
				thenFocusTextEditor();
			}
		}
		
		if ((editor.selection.isEmpty) || ignoreSelection) {
            const lineText = editor.document.lineAt(editor.selection.active.line).text;
			const cursorPosition = editor.selection.active;
			const cursorCharIndex = cursorPosition.character;
			const textBeforeCursor = lineText.substring(0, cursorCharIndex);
			const textAfterCursor = lineText.substring(cursorCharIndex);
			const moveCursorBack = 
				cursorCharIndex > 0 // Cursor not at far left margin
				&& textAfterCursor.trim() === '' // After cursor is only spaces or nothing
				&& /.*\)/.test(textBeforeCursor.trim()); // Character before cursor is a closed paren allowing whitespace
			const moveCursorForward =
				textAfterCursor.substring(0, 1) === '('
				&& !moveCursorBack;
			if (moveCursorBack) {
				const newPosition = cursorPosition.with(cursorPosition.line, lineText.lastIndexOf(")"));
				editor.selection = new vscode.Selection(newPosition, newPosition);
			}
			if (moveCursorForward) {
				const newPosition = cursorPosition.with(cursorPosition.line, cursorPosition.character + 1);
				editor.selection = new vscode.Selection(newPosition, newPosition);
			}
			
			const selectionAndText = f(editor);
			send(terminal, selectionAndText[1]);
			annotations.decorateSelection(
				selectionAndText[1],
				selectionAndText[0],
				editor,
				editor.selection.active,
				undefined,
				annotations.AnnotationStatus.SUCCESS);

			if (moveCursorBack || moveCursorForward) {
				editor.selection = new vscode.Selection(cursorPosition, cursorPosition);
			}
		}
			// vscode.commands.executeCommand('editor.action.selectToBracket').then(() => send(terminal));
		else
			send(terminal, editor.document.getText(editor.selection));
	});
}

export async function activate(context: vscode.ExtensionContext) {

    console.log('Extension "vscode-hy" is now active!');

    if (!await hyExists()) {
		vscode.window.showErrorMessage('Can\'t find Hy language on your computer! Check your PATH variable.');
		return;
	}

    context.subscriptions.push(vscode.commands.registerCommand(
		'hy.startREPL',
		() => {
			getREPL(true);
		}
	));

    context.subscriptions.push(vscode.commands.registerCommand(
		'hy.eval',
		() => {
			sendToREPL(evaluate._currentEnclosingFormText, false);
		}
	));

    context.subscriptions.push(vscode.commands.registerCommand(
		'hy.evalTopLevel',
		() => {
			sendToREPL(evaluate._currentTopLevelFormText, true);
		}
	));

    context.subscriptions.push(vscode.commands.registerCommand(
		'hy.evalFile',
		() => {
			const editor = vscode.window.activeTextEditor;
			if (editor == null) return;
			getREPL(true).then(terminal => {
				sendSource(terminal, editor.document.getText());
				thenFocusTextEditor();
			});
		}
	));

	// Inspired by Calva

	context.subscriptions.push(
		vscode.commands.registerCommand('hy.continueComment', edit.continueCommentCommand)
	);

	//EVENTS
	context.subscriptions.push(
		vscode.workspace.onDidOpenTextDocument((document) => {
			onDidOpen(document);
		})
	);
	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument((document) => {
			// void onDidSave(controller, document);
		})
	);
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor((editor) => {
			status.update();
			onDidChangeEditorOrSelection(editor);
		})
	);
	context.subscriptions.push(
		vscode.window.onDidChangeTextEditorSelection((editor) => {
			status.update();
			onDidChangeEditorOrSelection(editor.textEditor);
		})
	);
	context.subscriptions.push(
		vscode.workspace.onDidChangeTextDocument(annotations.onDidChangeTextDocument)
	);
	

	model.initScanner(vscode.workspace.getConfiguration('editor').get('maxTokenizationLineLength'));

	// Initial set of the provided contexts
	setKeybindingsEnabledContext();

	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
		  if (e.affectsConfiguration(config.KEYBINDINGS_ENABLED_CONFIG_KEY)) {
			setKeybindingsEnabledContext();
		  }
		})
	);

	try {
		void fmt.activate(context);
	} catch (e) {
		console.error('Failed activating Formatter: ' + e.message);
	}

	try {
		paredit.activate(context);
	} catch (e) {
		console.error('Failed activating Paredit: ' + e.message);
	}
	
}

export function deactivate() {
	state.analytics().logEvent('LifeCycle', 'Deactivated').send();
	// jackIn.calvaJackout();
	return paredit.deactivate();
	// return lsp.deactivate();
}