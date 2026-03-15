import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';

const AUTH_TOKEN_KEY = 'bluetag.auth.token';
const SUBMIT_COOLDOWN_MS = 1200;
const SPAM_WINDOW_MS = 10000;
const MAX_ATTEMPTS_PER_WINDOW = 5;

interface UseAuthSessionParams {
  backendBase: string;
  resetBleSession: () => void;
  setMessage: (message: string) => void;
}

function mapAuthErrorMessage(message?: string) {
  const normalized = String(message || '').trim().toLowerCase();

  switch (normalized) {
    case 'email and password are required':
      return 'กรุณากรอกอีเมลและรหัสผ่าน';
    case 'email, password and name are required':
      return 'กรุณากรอกอีเมล รหัสผ่าน และชื่อ';
    case 'name is required for register':
      return 'กรุณากรอกชื่อที่ใช้แสดง';
    case 'password must be at least 8 characters':
      return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
    case 'email already in use':
      return 'อีเมลนี้ถูกใช้งานแล้ว';
    case 'invalid credentials':
      return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
    case 'authentication failed':
      return 'เข้าสู่ระบบไม่สำเร็จ';
    case 'cannot connect to auth server':
      return 'ตอนนี้เชื่อมต่อเซิร์ฟเวอร์ไม่ได้';
    case 'missing bearer token':
      return 'กรุณาเข้าสู่ระบบใหม่อีกครั้ง';
    case 'invalid or expired token':
      return 'เซสชันหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่';
    default:
      return message?.trim() || 'เกิดข้อผิดพลาดบางอย่าง';
  }
}

export function useAuthSession({ backendBase, resetBleSession, setMessage }: UseAuthSessionParams) {
  const [authReady, setAuthReady] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');
  const lastSubmitAtRef = useRef(0);
  const recentAttemptTimestampsRef = useRef<number[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (storedToken) {
          setAuthToken(storedToken);
        }
      } finally {
        setAuthReady(true);
      }
    })();
  }, []);

  async function persistAuthToken(token: string) {
    setAuthToken(token);
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  async function clearSession(message?: string) {
    setAuthToken('');
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    if (message) {
      setAuthError(message);
    }
  }

  async function handleAuthSubmit() {
    const now = Date.now();
    recentAttemptTimestampsRef.current = recentAttemptTimestampsRef.current.filter((timestamp) => now - timestamp < SPAM_WINDOW_MS);

    if (authBusy) {
      return;
    }

    if (now - lastSubmitAtRef.current < SUBMIT_COOLDOWN_MS) {
      setAuthError('กดเร็วเกินไป ลองใหม่อีกครั้งในอีกสักครู่');
      return;
    }

    if (recentAttemptTimestampsRef.current.length >= MAX_ATTEMPTS_PER_WINDOW) {
      setAuthError('ลองหลายครั้งเกินไปแล้ว รอสักครู่แล้วค่อยใหม่');
      return;
    }

    lastSubmitAtRef.current = now;
    recentAttemptTimestampsRef.current.push(now);

    const email = authEmail.trim().toLowerCase();
    const password = authPassword.trim();
    const name = authName.trim();

    if (!email || !password) {
      setAuthError('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    if (authMode === 'register' && !name) {
      setAuthError('กรุณากรอกชื่อที่ใช้แสดง');
      return;
    }

    setAuthBusy(true);
    setAuthError('');
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = authMode === 'login' ? { email, password } : { email, password, name };

      const res = await fetch(`${backendBase.trim()}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { token?: string; message?: string };
      if (!res.ok || !data.token) {
        setAuthError(mapAuthErrorMessage(data.message ?? 'Authentication failed'));
        return;
      }

      await persistAuthToken(data.token);
      setAuthPassword('');
      setMessage('เข้าสู่ระบบสำเร็จ');
    } catch {
      setAuthError(mapAuthErrorMessage('Cannot connect to auth server'));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    setAuthToken('');
    setAuthPassword('');
    resetBleSession();
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    setMessage('ออกจากระบบแล้ว');
  }

  return {
    authReady,
    authToken,
    authMode,
    authEmail,
    authPassword,
    authName,
    authBusy,
    authError,
    setAuthToken,
    setAuthMode,
    setAuthEmail,
    setAuthPassword,
    setAuthName,
    setAuthError,
    clearSession,
    handleAuthSubmit,
    handleLogout,
  };
}
