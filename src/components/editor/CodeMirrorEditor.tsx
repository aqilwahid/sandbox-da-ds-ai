import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, foldGutter } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';
import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';
import { autocompletion, closeBrackets } from '@codemirror/autocomplete';

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'python' | 'sql' | 'javascript';
  onRun?: () => void;
  readOnly?: boolean;
}

export const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  onChange,
  language,
  onRun,
  readOnly = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onRunRef = useRef(onRun);
  const onChangeRef = useRef(onChange);

  onRunRef.current = onRun;
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;

    const runKeymap = keymap.of([
      {
        key: 'Mod-Enter',
        run: () => {
          if (onRunRef.current) {
            onRunRef.current();
            return true;
          }
          return false;
        },
      },
    ]);

    const getLangExtension = () => {
      if (language === 'sql') return sql();
      return python();
    };

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        foldGutter(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        getLangExtension(),
        oneDark,
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        runKeymap,
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const docString = update.state.doc.toString();
            onChangeRef.current(docString);
          }
        }),
        EditorView.editable.of(!readOnly),
        EditorView.theme({
          '&': { height: '100%', fontSize: '13.5px' },
          '.cm-scroller': { overflow: 'auto', fontFamily: '"JetBrains Mono", monospace' },
          '.cm-content': { padding: '12px 0' },
          '.cm-line': { padding: '0 12px' },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [language, readOnly]);

  // Keep editor content in sync when value changes externally (e.g. on reset or exercise switch)
  useEffect(() => {
    if (viewRef.current) {
      const currentDoc = viewRef.current.state.doc.toString();
      if (currentDoc !== value) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: value },
        });
      }
    }
  }, [value]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden bg-dark-950" />;
};
