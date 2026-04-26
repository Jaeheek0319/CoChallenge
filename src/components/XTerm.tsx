import React, { useEffect, useRef } from 'react';
import { Terminal as XTerminal } from 'xterm';
import { FitAddon } from '@xterm/addon-fit';
import 'xterm/css/xterm.css';

interface XTermProps {
  socket?: any;
  onInput?: (data: string) => void;
  outputStream?: string;
  className?: string;
}

export function XTerm({ socket, onInput, outputStream, className }: XTermProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<XTerminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    term.current = new XTerminal({
      cursorBlink: true,
      theme: {
        background: '#000000',
        foreground: '#e2e8f0',
        cursor: '#3b82f6',
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
    });

    fitAddon.current = new FitAddon();
    term.current.loadAddon(fitAddon.current);

    term.current.open(terminalRef.current);
    
    // Fit immediately, and then fit again after a tiny delay to ensure layout is complete
    fitAddon.current.fit();
    setTimeout(() => fitAddon.current?.fit(), 100);

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.current?.fit();
    });
    resizeObserver.observe(terminalRef.current);

    // Handle user input
    term.current.onData((data) => {
      if (socket) {
        socket.emit('terminal_input', { char: data });
      } else if (onInput) {
        onInput(data);
      }
    });

    return () => {
      resizeObserver.disconnect();
      term.current?.dispose();
    };
  }, []);

  // Handle incoming output from Pyodide (non-socket)
  useEffect(() => {
    if (outputStream && term.current) {
      term.current.write(outputStream);
    }
  }, [outputStream]);

  // Handle incoming output from Socket
  useEffect(() => {
    if (!socket || !term.current) return;

    const handleOutput = (payload: { data: string }) => {
      term.current?.write(payload.data);
    };

    socket.on('terminal_output', handleOutput);

    return () => {
      socket.off('terminal_output', handleOutput);
    };
  }, [socket]);

  // Expose a global hook for Pyodide to write directly to Xterm if needed
  useEffect(() => {
    if (term.current) {
      (window as any).writeToTerminal = (text: string) => {
        term.current?.write(text.replace(/\n/g, '\r\n'));
      };
      (window as any).clearTerminal = () => {
        term.current?.clear();
      };
    }
    return () => {
      delete (window as any).writeToTerminal;
      delete (window as any).clearTerminal;
    }
  }, []);

  return <div ref={terminalRef} className={`w-full h-full overflow-hidden ${className || ''}`} />;
}
