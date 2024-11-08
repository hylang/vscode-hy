# Change Log

## 0.0.10 (Nov 3, 2024)
  - Tweak to bracket autoclose rules
  - Fixed formatter bugs (no longer confused by tuple syntax and comments)
  - Fixed some syntax highlighting glitches

## 0.0.9 (Oct 4, 2024)
  - Upgraded inline evaluation feature
    - New "Evaluate top level expression" command (bound by default to `alt+shift+e`) 
    - No longer loses cursor position when evaluating expressions
    - Evaluated expressions are highlighted green; reen highlight remains until edits are made (even if cursor navigates away)
  - Overhauled syntax highlighting
    - Now distinguish visually between builtins and macros

## 0.0.8 (Sep 12, 2023)
  - Fixed broken f-string reformatting

## 0.0.7 (Sep 10, 2023)
  - f-strings now syntax highlight interpolated sections as regular Hy code
  - Added missing keywords and function names from syntax highlighting

## 0.0.6 (Sep 4, 2023)
  - Improved command and shortcut availability (more commands hidden when not relevant)
  - Updated command namespacing to avoid conflicts with similar extensions

## 0.0.5 (Sep 2, 2023)
  - Introduced webpack

## 0.0.4 (Jul 31, 2023)
  - Bugfixes with autoformatting (indentation, comma handling, auto comment continuation)

## 0.0.3 (Dec 20, 2022)
  - Added ParEdit-style structural editing
  - Added format-on-type (incl. auto-indentation)
  - Bug fixes

## 0.0.2 (Nov 24, 2022)
  - Improved syntax highlighting.

## 0.0.1 (Nov 23, 2022)
  - Initial release.