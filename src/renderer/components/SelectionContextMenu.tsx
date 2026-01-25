/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';

type MenuState = {
  visible: boolean;
  x: number;
  y: number;
  text: string;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const getInputSelectionText = (target: EventTarget | null): string => {
  if (!(target instanceof HTMLElement)) return '';
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    if (start !== end) {
      return target.value.slice(start, end);
    }
  }
  return '';
};

const isRightClickOnSelection = (selection: Selection, x: number, y: number): boolean => {
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return false;
  try {
    const range = selection.getRangeAt(0);
    // Use the selection's client rects so we only intercept when the user
    // actually right-clicks on the highlighted area (not just the same container).
    const rects = Array.from(range.getClientRects());
    if (rects.length === 0) return false;
    return rects.some((rect) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom);
  } catch {
    // If the browser throws (rare edge cases), fall back to allowing.
    return true;
  }
};

const copyWithExecCommandFallback = (text: string): boolean => {
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    el.style.top = '0';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
};

const SelectionContextMenu: React.FC = () => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<MenuState>({ visible: false, x: 0, y: 0, text: '' });

  const close = () => {
    setState((prev) => (prev.visible ? { ...prev, visible: false } : prev));
  };

  const menuStyle = useMemo<React.CSSProperties>(() => {
    // Keep the menu inside viewport.
    const padding = 8;
    const menuWidth = 160;
    const menuHeight = 44;
    const x = clamp(state.x, padding, window.innerWidth - padding - menuWidth);
    const y = clamp(state.y, padding, window.innerHeight - padding - menuHeight);
    return {
      position: 'fixed',
      left: x,
      top: y,
      zIndex: 99999,
    };
  }, [state.x, state.y]);

  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      const selection = window.getSelection();

      // Prefer DOM selection.
      let selectedText = selection?.toString() || '';
      let shouldIntercept = Boolean(selection && selectedText.trim() && isRightClickOnSelection(selection, e.clientX, e.clientY));

      // Fallback: selection inside input/textarea.
      if (!shouldIntercept) {
        selectedText = getInputSelectionText(e.target);
        shouldIntercept = Boolean(selectedText.trim());
      }

      selectedText = selectedText.trim();
      if (!shouldIntercept || !selectedText) {
        close();
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      setState({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        text: selectedText,
      });
    };

    const onMouseDown = (e: MouseEvent) => {
      if (!state.visible) return;
      const el = menuRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        close();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!state.visible) return;
      if (e.key === 'Escape') close();
    };

    const onScroll = () => {
      if (state.visible) close();
    };

    document.addEventListener('contextmenu', onContextMenu, true);
    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);

    return () => {
      document.removeEventListener('contextmenu', onContextMenu, true);
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [state.visible]);

  const onCopy = async () => {
    const text = state.text;
    close();
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // fallback below
    }

    copyWithExecCommandFallback(text);
  };

  if (!state.visible) return null;

  return (
    <div ref={menuRef} style={menuStyle} className='bg-bg-1 border border-border rounded-lg shadow-lg p-4px min-w-160px select-none'>
      <button type='button' onClick={onCopy} className='w-full text-left px-10px py-8px rd-6px hover:bg-fill-2 text-t-primary text-13px'>
        Copy
      </button>
    </div>
  );
};

export default SelectionContextMenu;
