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
import * as util from './utilities';
import * as state from './state';
import status from './status';

const windows: boolean = os.platform() == 'win32';

const hyBinary: string = windows ? 'hy.exe' : 'hy';
const terminalName = 'Hy REPL';

function hyExists(): boolean {
	return process.env['PATH'].split(path.delimiter)
		.some((x) => fs.existsSync(path.resolve(x, hyBinary)));
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

export function activate(context: vscode.ExtensionContext) {

    console.log('Extension "vscode-hy" is now active!');

    if (!hyExists()) {
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
			const editor = vscode.window.activeTextEditor;
			if (editor == null) return;
			getREPL(true).then(terminal => {
				function send(terminal: vscode.Terminal) {
					sendSource(terminal, editor.document.getText(editor.selection));
					thenFocusTextEditor();
				}
				if (editor.selection.isEmpty)
					vscode.commands.executeCommand('editor.action.selectToBracket').then(() => send(terminal));
				else
					send(terminal);
			});
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