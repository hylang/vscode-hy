# Hy Language Support for Visual Studio Code


## Introduction

This extension adds [Hy language](https://www.github.com/hylang/hy) support to VS Code. Features (presently) include basic syntax highlighting and the ability to evaluate expressions by sending them to a Hy REPL.

![](https://raw.githubusercontent.com/hylang/vscode-hy/master/images/syntax_hy.PNG)

Features:
- [x] Basic syntax highlighting
- [x] Basic Hy code snippets
- [x] Code evaluation shortcuts
- [x] Improved syntax highlighting
- [x] [Paredit](https://www.emacswiki.org/emacs/ParEdit)-style structural editing based on S-expressions (slurping, barfing, dragging, killing, rewrapping, splicing, raising, navigation, auto-balancing for parens and other wrappers `[({""})]`)
- [x] Auto-formatting on edit (esp. auto-indentation)

Planned features:
- [ ] Intellisense code completion for built-in Hy functions and macros

## How to Install

### VS Code Extension Marketplace

1. Navigate to the VS Code Extension marketplace within VS Code.
2. Search for "vscode-hy (hylang official)" and install as usual.

### Local Install

1. Navigate to your local .vscode (or .vscodium) extension directory (e.g. `$ cd ~/.vscode/extensions`)
2. Clone this repo within that directory (e.g. `git clone https://www.github.com/hylang/vscode-hy`)
3. Reload or relaunch any open VS Code/VS Codium windows

## Contribution

Issues and pull requests welcome.

## Credits

This extension is a fork and reedit of Allen Huang's [xuqinghan/vscode-hy](https://github.com/xuqinghan/vscode-hy) extension: Copyright (c) 2016 Allen Huang

**Enjoy!**
