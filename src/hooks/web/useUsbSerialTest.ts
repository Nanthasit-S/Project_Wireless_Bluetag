import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

const TAG_ID_PATTERN = /BTAG-[A-Z0-9]{8}/i;

type PendingUsbCommand =
  | {
      kind: 'bind';
      resolve: (result: boolean) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  | {
      kind: 'unbind';
      resolve: (result: boolean) => void;
      timeout: ReturnType<typeof setTimeout>;
    };

function normalizeLogLine(line: string) {
  return line.replace(/\u0000/g, '').trim();
}

function normalizeWebId(value: string) {
  return value.trim().toUpperCase();
}

function hashWebId(webId: string) {
  const normalized = normalizeWebId(webId);
  if (!normalized) return '';

  let hash = 2166136261;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
}

export function useUsbSerialTest() {
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const writerRef = useRef<WritableStreamDefaultWriter<Uint8Array> | null>(null);
  const readBufferRef = useRef('');
  const pendingCommandRef = useRef<PendingUsbCommand | null>(null);

  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [detectedTagId, setDetectedTagId] = useState('');
  const [boundWebIdHash, setBoundWebIdHash] = useState('');
  const [status, setStatus] = useState('ยังไม่ได้เชื่อมบอร์ดผ่าน USB');
  const [logLines, setLogLines] = useState<string[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const supported = Platform.OS === 'web' && typeof navigator !== 'undefined' && !!navigator.serial;

  const finishPendingCommand = useCallback((result: boolean) => {
    if (!pendingCommandRef.current) return;
    clearTimeout(pendingCommandRef.current.timeout);
    pendingCommandRef.current.resolve(result);
    pendingCommandRef.current = null;
  }, []);

  const appendLog = useCallback(
    (line: string) => {
      const normalized = normalizeLogLine(line);
      if (!normalized) return;

      const matchedTagId = normalized.match(TAG_ID_PATTERN)?.[0]?.toUpperCase() ?? '';
      if (matchedTagId) {
        setDetectedTagId(matchedTagId);
        setStatus(`เจอ BlueTag แล้ว: ${matchedTagId}`);
      }

      if (normalized.startsWith('BOUND_WEB_ID_HASH=')) {
        setBoundWebIdHash(normalized.slice('BOUND_WEB_ID_HASH='.length).trim().toUpperCase());
      } else if (normalized === 'LOCK_STATE=UNBOUND') {
        setBoundWebIdHash('');
      } else if (normalized.startsWith('BIND_OK=')) {
        const nextHash = normalized.slice('BIND_OK='.length).trim().toUpperCase();
        setBoundWebIdHash(nextHash);
        setStatus(`บอร์ดล็อก hash ${nextHash} แล้ว`);
        finishPendingCommand(true);
      } else if (normalized.startsWith('BIND_DENIED=')) {
        const currentHash = normalized.slice('BIND_DENIED='.length).trim().toUpperCase();
        setBoundWebIdHash(currentHash);
        setStatus(`บอร์ดถูกล็อกไว้ด้วย hash ${currentHash} อยู่แล้ว`);
        finishPendingCommand(false);
      } else if (normalized === 'BIND_ERROR=WEB_ID_REQUIRED') {
        setStatus('ยังไม่ได้ส่ง Web ID ไปที่บอร์ด');
        finishPendingCommand(false);
      } else if (normalized.startsWith('UNBIND_OK=')) {
        setBoundWebIdHash('');
        setStatus('ล้างการผูกในบอร์ดแล้ว');
        finishPendingCommand(true);
      } else if (normalized.startsWith('TECH_RESET_OK=')) {
        setBoundWebIdHash('');
        setStatus('ล้าง lock ในบอร์ดแบบ technician แล้ว');
        finishPendingCommand(true);
      } else if (normalized.startsWith('UNBIND_DENIED=')) {
        const currentHash = normalized.slice('UNBIND_DENIED='.length).trim().toUpperCase();
        setBoundWebIdHash(currentHash);
        setStatus(`บอร์ดยังล็อกอยู่ด้วย hash ${currentHash}`);
        finishPendingCommand(false);
      }

      setLogLines((current) => [normalized, ...current].slice(0, 12));
    },
    [finishPendingCommand],
  );

  const disconnect = useCallback(async () => {
    setConnected(false);
    setConnecting(false);

    if (pendingCommandRef.current) {
      clearTimeout(pendingCommandRef.current.timeout);
      pendingCommandRef.current.resolve(false);
      pendingCommandRef.current = null;
    }

    try {
      await readerRef.current?.cancel();
    } catch {}

    try {
      readerRef.current?.releaseLock();
    } catch {}
    readerRef.current = null;

    try {
      writerRef.current?.releaseLock();
    } catch {}
    writerRef.current = null;

    try {
      await portRef.current?.close();
    } catch {}
    portRef.current = null;
  }, []);

  const writeCommand = useCallback(async (command: string) => {
    if (!writerRef.current) {
      setStatus('ยังไม่มีพอร์ต USB ที่เปิดอยู่');
      return false;
    }

    try {
      await writerRef.current.write(new TextEncoder().encode(command));
      return true;
    } catch {
      setStatus('ส่งคำสั่งไปที่บอร์ดไม่สำเร็จ');
      return false;
    }
  }, []);

  const sendCommandAndWait = useCallback(
    async (kind: PendingUsbCommand['kind'], command: string, pendingStatus: string) => {
      const ok = await writeCommand(command);
      if (!ok) return false;

      setStatus(pendingStatus);

      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          if (!pendingCommandRef.current || pendingCommandRef.current.kind !== kind) return;
          pendingCommandRef.current = null;
          setStatus('บอร์ดยังไม่ตอบกลับ ลองกดใหม่อีกครั้ง');
          resolve(false);
        }, 2500);

        pendingCommandRef.current = { kind, resolve, timeout };
      });
    },
    [writeCommand],
  );

  const requestIdentity = useCallback(async () => {
    const ok = await writeCommand('ID\n');
    if (ok) {
      setStatus('กำลังขอ tag id จากบอร์ด...');
    }
  }, [writeCommand]);

  const persistBinding = useCallback(
    async (webId: string) => {
      const normalizedWebId = normalizeWebId(webId);
      const nextHash = hashWebId(normalizedWebId);

      if (!normalizedWebId || !nextHash) {
        setStatus('ยังไม่ได้เลือก Web ID');
        return false;
      }

      if (boundWebIdHash && boundWebIdHash !== nextHash) {
        setStatus(`บอร์ดถูกล็อกไว้ด้วย hash ${boundWebIdHash} อยู่แล้ว`);
        return false;
      }

      return sendCommandAndWait('bind', `BIND ${normalizedWebId}\n`, `กำลังล็อกบอร์ดด้วย hash ${nextHash}...`);
    },
    [boundWebIdHash, sendCommandAndWait],
  );

  const clearBinding = useCallback(
    async (webId: string) => {
      const normalizedWebId = normalizeWebId(webId);
      if (!normalizedWebId) {
        setStatus('ยังไม่ได้เลือก Web ID ที่จะยกเลิก');
        return false;
      }

      return sendCommandAndWait('unbind', `UNBIND ${normalizedWebId}\n`, `กำลังล้าง hash ของ ${normalizedWebId} จากบอร์ด...`);
    },
    [sendCommandAndWait],
  );

  const technicianReset = useCallback(async () => {
    return sendCommandAndWait('unbind', 'TECH_RESET\n', 'กำลังล้าง lock ในบอร์ดแบบ technician...');
  }, [sendCommandAndWait]);

  const softReset = useCallback(async () => {
    if (!portRef.current?.setSignals) {
      setStatus('พอร์ตนี้ยังรีเซ็ตผ่านเว็บไม่ได้ ลองกดปุ่มรีเซ็ตบนบอร์ดแทน');
      return;
    }

    try {
      await portRef.current.setSignals({ dataTerminalReady: false, requestToSend: true });
      await new Promise((resolve) => setTimeout(resolve, 120));
      await portRef.current.setSignals({ dataTerminalReady: true, requestToSend: false });
      setStatus('รีเซ็ตบอร์ดแล้ว รอ log กลับมาสักครู่');
    } catch {
      setStatus('รีเซ็ตบอร์ดผ่านเว็บไม่สำเร็จ');
    }
  }, []);

  const connect = useCallback(async () => {
    if (!supported || !navigator.serial) {
      setStatus('เบราว์เซอร์นี้ยังไม่รองรับ Web Serial');
      return;
    }

    setConnecting(true);
    setStatus('กำลังขอสิทธิ์เชื่อมต่อพอร์ต USB...');
    setDetectedTagId('');
    setBoundWebIdHash('');
    setLogLines([]);
    readBufferRef.current = '';

    try {
      const port = await navigator.serial.requestPort({
        filters: [{ usbVendorId: 0x303a }],
      });

      await port.open({
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
      });

      portRef.current = port;
      writerRef.current = port.writable?.getWriter() ?? null;
      readerRef.current = port.readable?.getReader() ?? null;
      setConnected(true);
      setStatus('เชื่อมต่อบอร์ดแล้ว กำลังอ่านข้อมูล...');

      if (readerRef.current) {
        void (async () => {
          try {
            while (true) {
              const result = await readerRef.current!.read();
              if (result.done) break;
              if (!result.value) continue;

              readBufferRef.current += new TextDecoder().decode(result.value, { stream: true });
              const lines = readBufferRef.current.split(/\r?\n/);
              readBufferRef.current = lines.pop() ?? '';

              for (const line of lines) {
                appendLog(line);
              }
            }
          } catch {
            setStatus('การอ่านข้อมูลจากบอร์ดถูกตัดไป');
          } finally {
            setConnected(false);
          }
        })();
      }

      await requestIdentity();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown';
      setStatus(`เชื่อมต่อ USB ไม่สำเร็จ: ${message}`);
      await disconnect();
    } finally {
      setConnecting(false);
    }
  }, [appendLog, disconnect, requestIdentity, supported]);

  useEffect(() => {
    return () => {
      void disconnect();
    };
  }, [disconnect]);

  const connectionLabel = useMemo(() => {
    if (!supported) return 'เบราว์เซอร์นี้ยังไม่รองรับ';
    if (connecting) return 'กำลังเชื่อมต่อ...';
    if (connected) return 'เชื่อมต่อแล้ว';
    return 'ยังไม่เชื่อมต่อ';
  }, [connected, connecting, supported]);

  return {
    supported,
    connecting,
    connected,
    detectedTagId,
    boundWebIdHash,
    status,
    logLines,
    detailsOpen,
    connectionLabel,
    connect,
    disconnect,
    requestIdentity,
    persistBinding,
    clearBinding,
    technicianReset,
    softReset,
    setDetailsOpen,
    hashWebId,
  };
}
