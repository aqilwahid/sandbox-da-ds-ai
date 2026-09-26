import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab, toggleComment } from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import { PostgreSQL, sql } from '@codemirror/lang-sql';
import { bracketMatching, foldGutter, indentOnInput, indentUnit, syntaxHighlighting } from '@codemirror/language';
import { Compartment, EditorState, StateEffect, StateField } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder as cmPlaceholder,
} from '@codemirror/view';
import { classHighlighter } from '@lezer/highlight';

export interface EditorHandle {
  jumpToLine: (line: number) => void;
  focus: () => void;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  language: 'python' | 'sql';
  onRun?: () => void;
  onSave?: () => void;
  errorLine?: number | null;
  sqlSchema?: Record<string, string[]>;
  readOnly?: boolean;
  ariaLabel?: string;
}

// Dekorasi baris error
const setErrorLine = StateEffect.define<number | null>();
const errorLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    if (tr.docChanged) deco = Decoration.none;
    for (const e of tr.effects) {
      if (e.is(setErrorLine)) {
        const n = e.value;
        if (!n || n < 1 || n > tr.state.doc.lines) deco = Decoration.none;
        else {
          const line = tr.state.doc.line(n);
          deco = Decoration.set([Decoration.line({ class: 'cm-error-line' }).range(line.from)]);
        }
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

const baseTheme = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'var(--cm-bg)', color: 'rgb(var(--c-fg))' },
  '.cm-content': { padding: '10px 0', caretColor: 'rgb(var(--c-accent))' },
  '.cm-line': { padding: '0 14px 0 10px' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'rgb(var(--c-accent))', borderLeftWidth: '2px' },
  '.cm-matchingBracket': { backgroundColor: 'rgb(var(--c-accent) / 0.18)', outline: '1px solid rgb(var(--c-accent) / 0.4)' },
  '.cm-foldPlaceholder': { backgroundColor: 'rgb(var(--c-panel3))', border: 'none', color: 'rgb(var(--c-fg2))' },
  '.cm-placeholder': { color: 'rgb(var(--c-fg3))' },
});

export const CodeMirrorEditor = forwardRef<EditorHandle, Props>(function CodeMirrorEditor(
  { value, onChange, language, onRun, onSave, errorLine, sqlSchema, readOnly = false, ariaLabel },
  ref,
) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const langComp = useRef(new Compartment());
  const cb = useRef({ onChange, onRun, onSave });
  cb.current = { onChange, onRun, onSave };

  useImperativeHandle(ref, () => ({
    jumpToLine(line: number) {
      const v = view.current;
      if (!v) return;
      const n = Math.max(1, Math.min(line, v.state.doc.lines));
      const l = v.state.doc.line(n);
      v.dispatch({ selection: { anchor: l.from, head: l.to }, effects: [EditorView.scrollIntoView(l.from, { y: 'center' }), setErrorLine.of(n)] });
      v.focus();
    },
    focus() {
      view.current?.focus();
    },
  }));

  const langExt = () =>
    language === 'sql'
      ? sql({ dialect: PostgreSQL, upperCaseKeywords: true, schema: sqlSchema || {} })
      : python();

  useEffect(() => {
    if (!host.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        foldGutter({ openText: '▾', closedText: '▸' }),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion({ activateOnTyping: true, icons: false }),
        indentUnit.of('    '),
        langComp.current.of(langExt()),
        syntaxHighlighting(classHighlighter),
        baseTheme,
        errorLineField,
        cmPlaceholder(language === 'sql' ? '-- Tulis kueri SQL di sini' : '# Tulis kode Python di sini'),
        keymap.of([
          { key: 'Mod-Enter', preventDefault: true, run: () => (cb.current.onRun ? (cb.current.onRun(), true) : false) },
          { key: 'Shift-Enter', preventDefault: true, run: () => (cb.current.onRun ? (cb.current.onRun(), true) : false) },
          { key: 'Mod-s', preventDefault: true, run: () => (cb.current.onSave?.(), true) },
          { key: 'Mod-/', run: toggleComment },
          ...closeBracketsKeymap,
          ...completionKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) cb.current.onChange(u.state.doc.toString());
        }),
        EditorState.readOnly.of(readOnly),
        EditorView.contentAttributes.of({ 'aria-label': ariaLabel || `Editor ${language.toUpperCase()}` }),
      ],
    });
    view.current = new EditorView({ state, parent: host.current });
    return () => {
      view.current?.destroy();
      view.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly]);

  // Ganti bahasa / skema tanpa membuat ulang editor
  useEffect(() => {
    view.current?.dispatch({ effects: langComp.current.reconfigure(langExt()) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, sqlSchema]);

  // Sinkronkan nilai dari luar (ganti latihan / reset)
  useEffect(() => {
    const v = view.current;
    if (!v) return;
    const cur = v.state.doc.toString();
    if (cur !== value) v.dispatch({ changes: { from: 0, to: cur.length, insert: value } });
  }, [value]);

  useEffect(() => {
    view.current?.dispatch({ effects: setErrorLine.of(errorLine ?? null) });
  }, [errorLine]);

  return <div ref={host} className="h-full w-full overflow-hidden" />;
});
