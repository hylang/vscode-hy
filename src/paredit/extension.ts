'use strict';
import { StatusBar } from './statusbar';
import * as vscode from 'vscode';
import {
  commands,
  window,
  Event,
  EventEmitter,
  ExtensionContext,
  workspace,
  ConfigurationChangeEvent,
} from 'vscode';
import * as paredit from '../cursor-doc/paredit';
import * as docMirror from '../doc-mirror/index';
import { EditableDocument } from '../cursor-doc/model';
// import { assertIsDefined } from '../utilities';

const onPareditKeyMapChangedEmitter = new EventEmitter<string>();

const languages = new Set(['clojure', 'lisp', 'scheme', 'hy']);
const enabled = true;

/**
 * Copies the text represented by the range from doc to the clipboard.
 * @param doc
 * @param range
 */
async function copyRangeToClipboard(doc: EditableDocument, [start, end]) {
  const text = doc.model.getText(start, end);
  await vscode.env.clipboard.writeText(text);
}

/**
 * Answers true when `calva.paredit.killAlsoCutsToClipboard` is enabled.
 * @returns boolean
 */
function shouldKillAlsoCutToClipboard() {
  return workspace.getConfiguration().get('hy.paredit.killAlsoCutsToClipboard');
}

function assertIsDefined<T>(
    value: T | undefined | null,
    message: string | (() => string)
  ): asserts value is T {
    if (value === null || value === undefined) {
      throw new Error(typeof message === 'string' ? message : message());
    }
  }

type PareditCommand = {
  command: string;
  handler: (doc: EditableDocument) => void | Promise<any>;
};
const pareditCommands: PareditCommand[] = [
  // NAVIGATING
  {
    command: 'hy.paredit.forwardSexp',
    handler: (doc: EditableDocument) => {
      paredit.moveToRangeRight(doc, paredit.forwardSexpRange(doc));
    },
  },
  {
    command: 'hy.paredit.backwardSexp',
    handler: (doc: EditableDocument) => {
      paredit.moveToRangeLeft(doc, paredit.backwardSexpRange(doc));
    },
  },
  {
    command: 'hy.paredit.forwardDownSexp',
    handler: (doc: EditableDocument) => {
      paredit.moveToRangeRight(doc, paredit.rangeToForwardDownList(doc));
    },
  },
  {
    command: 'hy.paredit.backwardDownSexp',
    handler: (doc: EditableDocument) => {
      paredit.moveToRangeLeft(doc, paredit.rangeToBackwardDownList(doc));
    },
  },
  {
    command: 'hy.paredit.forwardUpSexp',
    handler: (doc: EditableDocument) => {
      paredit.moveToRangeRight(doc, paredit.rangeToForwardUpList(doc));
    },
  },
  {
    command: 'hy.paredit.backwardUpSexp',
    handler: (doc: EditableDocument) => {
      paredit.moveToRangeLeft(doc, paredit.rangeToBackwardUpList(doc));
    },
  },
  {
    command: 'hy.paredit.forwardSexpOrUp',
    handler: (doc: EditableDocument) => {
      paredit.moveToRangeRight(doc, paredit.forwardSexpOrUpRange(doc));
    },
  },
  {
    command: 'hy.paredit.backwardSexpOrUp',
    handler: (doc: EditableDocument) => {
      paredit.moveToRangeLeft(doc, paredit.backwardSexpOrUpRange(doc));
    },
  },
  {
    command: 'hy.paredit.closeList',
    handler: (doc: EditableDocument) => {
      paredit.moveToRangeRight(doc, paredit.rangeToForwardList(doc));
    },
  },
  {
    command: 'hy.paredit.openList',
    handler: (doc: EditableDocument) => {
      paredit.moveToRangeLeft(doc, paredit.rangeToBackwardList(doc));
    },
  },

  // SELECTING
  {
    command: 'hy.paredit.rangeForDefun',
    handler: (doc: EditableDocument) => {
      paredit.selectRange(doc, paredit.rangeForDefun(doc));
    },
  },
  {
    command: 'hy.paredit.sexpRangeExpansion',
    handler: paredit.growSelection,
  }, // TODO: Inside string should first select contents
  {
    command: 'hy.paredit.sexpRangeContraction',
    handler: paredit.shrinkSelection,
  },

  {
    command: 'hy.paredit.selectForwardSexp',
    handler: paredit.selectForwardSexp,
  },
  {
    command: 'hy.paredit.selectRight',
    handler: paredit.selectRight,
  },
  {
    command: 'hy.paredit.selectBackwardSexp',
    handler: paredit.selectBackwardSexp,
  },
  {
    command: 'hy.paredit.selectForwardDownSexp',
    handler: paredit.selectForwardDownSexp,
  },
  {
    command: 'hy.paredit.selectBackwardDownSexp',
    handler: paredit.selectBackwardDownSexp,
  },
  {
    command: 'hy.paredit.selectForwardUpSexp',
    handler: paredit.selectForwardUpSexp,
  },
  {
    command: 'hy.paredit.selectForwardSexpOrUp',
    handler: paredit.selectForwardSexpOrUp,
  },
  {
    command: 'hy.paredit.selectBackwardSexpOrUp',
    handler: paredit.selectBackwardSexpOrUp,
  },
  {
    command: 'hy.paredit.selectBackwardUpSexp',
    handler: paredit.selectBackwardUpSexp,
  },
  {
    command: 'hy.paredit.selectCloseList',
    handler: paredit.selectCloseList,
  },
  {
    command: 'hy.paredit.selectOpenList',
    handler: paredit.selectOpenList,
  },

  // EDITING
  {
    command: 'hy.paredit.slurpSexpForward',
    handler: paredit.forwardSlurpSexp,
  },
  {
    command: 'hy.paredit.barfSexpForward',
    handler: paredit.forwardBarfSexp,
  },
  {
    command: 'hy.paredit.slurpSexpBackward',
    handler: paredit.backwardSlurpSexp,
  },
  {
    command: 'hy.paredit.barfSexpBackward',
    handler: paredit.backwardBarfSexp,
  },
  {
    command: 'hy.paredit.splitSexp',
    handler: paredit.splitSexp,
  },
  {
    command: 'hy.paredit.joinSexp',
    handler: paredit.joinSexp,
  },
  {
    command: 'hy.paredit.spliceSexp',
    handler: paredit.spliceSexp,
  },
  // ['paredit.transpose', ], // TODO: Not yet implemented
  {
    command: 'hy.paredit.raiseSexp',
    handler: paredit.raiseSexp,
  },
  {
    command: 'hy.paredit.transpose',
    handler: paredit.transpose,
  },
  {
    command: 'hy.paredit.dragSexprBackward',
    handler: paredit.dragSexprBackward,
  },
  {
    command: 'hy.paredit.dragSexprForward',
    handler: paredit.dragSexprForward,
  },
  {
    command: 'hy.paredit.dragSexprBackwardUp',
    handler: paredit.dragSexprBackwardUp,
  },
  {
    command: 'hy.paredit.dragSexprForwardDown',
    handler: paredit.dragSexprForwardDown,
  },
  {
    command: 'hy.paredit.dragSexprForwardUp',
    handler: paredit.dragSexprForwardUp,
  },
  {
    command: 'hy.paredit.dragSexprBackwardDown',
    handler: paredit.dragSexprBackwardDown,
  },
  {
    command: 'hy.paredit.convolute',
    handler: paredit.convolute,
  },
  {
    command: 'hy.paredit.killRight',
    handler: async (doc: EditableDocument) => {
      const range = paredit.forwardHybridSexpRange(doc);
      if (shouldKillAlsoCutToClipboard()) {
        await copyRangeToClipboard(doc, range);
      }
      return paredit.killRange(doc, range);
    },
  },
  {
    command: 'hy.paredit.killSexpForward',
    handler: async (doc: EditableDocument) => {
      const range = paredit.forwardSexpRange(doc);
      if (shouldKillAlsoCutToClipboard()) {
        await copyRangeToClipboard(doc, range);
      }
      return paredit.killRange(doc, range);
    },
  },
  {
    command: 'hy.paredit.killSexpBackward',
    handler: async (doc: EditableDocument) => {
      const range = paredit.backwardSexpRange(doc);
      if (shouldKillAlsoCutToClipboard()) {
        await copyRangeToClipboard(doc, range);
      }
      return paredit.killRange(doc, range);
    },
  },
  {
    command: 'hy.paredit.killListForward',
    handler: async (doc: EditableDocument) => {
      const range = paredit.forwardListRange(doc);
      if (shouldKillAlsoCutToClipboard()) {
        await copyRangeToClipboard(doc, range);
      }
      return await paredit.killForwardList(doc, range);
    },
  }, // TODO: Implement with killRange
  {
    command: 'hy.paredit.killListBackward',
    handler: async (doc: EditableDocument) => {
      const range = paredit.backwardListRange(doc);
      if (shouldKillAlsoCutToClipboard()) {
        await copyRangeToClipboard(doc, range);
      }
      return await paredit.killBackwardList(doc, range);
    },
  }, // TODO: Implement with killRange
  {
    command: 'hy.paredit.spliceSexpKillForward',
    handler: async (doc: EditableDocument) => {
      const range = paredit.forwardListRange(doc);
      if (shouldKillAlsoCutToClipboard()) {
        await copyRangeToClipboard(doc, range);
      }
      await paredit.killForwardList(doc, range).then((isFulfilled) => {
        return paredit.spliceSexp(doc, doc.selection.active, false);
      });
    },
  },
  {
    command: 'hy.paredit.spliceSexpKillBackward',
    handler: async (doc: EditableDocument) => {
      const range = paredit.backwardListRange(doc);
      if (shouldKillAlsoCutToClipboard()) {
        await copyRangeToClipboard(doc, range);
      }
      await paredit.killBackwardList(doc, range).then((isFulfilled) => {
        return paredit.spliceSexp(doc, doc.selection.active, false);
      });
    },
  },
  {
    command: 'hy.paredit.wrapAroundParens',
    handler: (doc: EditableDocument) => {
      return paredit.wrapSexpr(doc, '(', ')');
    },
  },
  {
    command: 'hy.paredit.wrapAroundSquare',
    handler: (doc: EditableDocument) => {
      return paredit.wrapSexpr(doc, '[', ']');
    },
  },
  {
    command: 'hy.paredit.wrapAroundCurly',
    handler: (doc: EditableDocument) => {
      return paredit.wrapSexpr(doc, '{', '}');
    },
  },
  {
    command: 'hy.paredit.wrapAroundQuote',
    handler: (doc: EditableDocument) => {
      return paredit.wrapSexpr(doc, '"', '"');
    },
  },
  {
    command: 'hy.paredit.rewrapParens',
    handler: (doc: EditableDocument) => {
      return paredit.rewrapSexpr(doc, '(', ')');
    },
  },
  {
    command: 'hy.paredit.rewrapSquare',
    handler: (doc: EditableDocument) => {
      return paredit.rewrapSexpr(doc, '[', ']');
    },
  },
  {
    command: 'hy.paredit.rewrapCurly',
    handler: (doc: EditableDocument) => {
      return paredit.rewrapSexpr(doc, '{', '}');
    },
  },
  {
    command: 'hy.paredit.rewrapQuote',
    handler: (doc: EditableDocument) => {
      return paredit.rewrapSexpr(doc, '"', '"');
    },
  },
  {
    command: 'hy.paredit.deleteForward',
    handler: async (doc: EditableDocument) => {
      await paredit.deleteForward(doc);
    },
  },
  {
    command: 'hy.paredit.deleteBackward',
    handler: async (doc: EditableDocument) => {
      await paredit.backspace(doc);
    },
  },
  {
    command: 'hy.paredit.forceDeleteForward',
    handler: () => {
      return vscode.commands.executeCommand('deleteRight');
    },
  },
  {
    command: 'hy.paredit.forceDeleteBackward',
    handler: () => {
      return vscode.commands.executeCommand('deleteLeft');
    },
  },
  {
    command: 'hy.paredit.addRichComment',
    handler: async (doc: EditableDocument) => {
      await paredit.addRichComment(doc);
    },
  },
];

function wrapPareditCommand(command: PareditCommand) {
  return async () => {
    try {
      const textEditor = window.activeTextEditor;

      assertIsDefined(textEditor, 'Expected window to have an activeTextEditor!');

      const mDoc: EditableDocument = docMirror.getDocument(textEditor.document);
      if (!enabled || !languages.has(textEditor.document.languageId)) {
        return;
      }
      return command.handler(mDoc);
    } catch (e) {
      console.error(e.message);
    }
  };
}

export function getKeyMapConf(): string {
  const keyMap = workspace.getConfiguration().get('hy.paredit.defaultKeyMap');
  return String(keyMap);
}

function setKeyMapConf() {
  const keyMap = workspace.getConfiguration().get('hy.paredit.defaultKeyMap');
  void commands.executeCommand('setContext', 'paredit:keyMap', keyMap);
  onPareditKeyMapChangedEmitter.fire(String(keyMap));
}
setKeyMapConf();

export function activate(context: ExtensionContext) {
  const statusBar = new StatusBar(getKeyMapConf());

  context.subscriptions.push(
    statusBar,
    commands.registerCommand('paredit.togglemode', () => {
      let keyMap = workspace.getConfiguration().get('hy.paredit.defaultKeyMap');
      keyMap = String(keyMap).trim().toLowerCase();
      if (keyMap == 'original') {
        void workspace
          .getConfiguration()
          .update('hy.paredit.defaultKeyMap', 'strict', vscode.ConfigurationTarget.Global);
      } else if (keyMap == 'strict') {
        void workspace
          .getConfiguration()
          .update('hy.paredit.defaultKeyMap', 'original', vscode.ConfigurationTarget.Global);
      }
    }),
    window.onDidChangeActiveTextEditor(
      (e) => e && e.document && languages.has(e.document.languageId)
    ),
    workspace.onDidChangeConfiguration((e: ConfigurationChangeEvent) => {
      if (e.affectsConfiguration('hy.paredit.defaultKeyMap')) {
        setKeyMapConf();
      }
    }),
    ...pareditCommands.map((command) =>
      commands.registerCommand(command.command, wrapPareditCommand(command))
    )
  );
}

export function deactivate() {
  // do nothing
}

export const onPareditKeyMapChanged: Event<string> = onPareditKeyMapChangedEmitter.event;
