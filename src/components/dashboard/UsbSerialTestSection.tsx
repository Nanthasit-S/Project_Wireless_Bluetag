import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useUsbSerialTest } from '../../hooks/web/useUsbSerialTest';

interface UsbSerialTestSectionProps {
  selectedWebId: string;
  boundWebIdByTagId: Record<string, string>;
  canManageTechnicianMode: boolean;
  onAssignTag: (tagId: string, webId: string) => Promise<boolean>;
  onUnassignTag: (tagId: string) => Promise<boolean>;
  onSyncBoardState: (params: {
    tagId: string;
    webId: string;
    boardWebIdHash: string | null;
    boardLockState: 'locked' | 'unbound';
  }) => Promise<boolean>;
  onTechnicianResetTag: (tagId: string) => Promise<boolean>;
}

type UsbTextVariant = 'body' | 'semibold' | 'bold' | 'eyebrow' | 'heading' | 'mono';

const textStyles = StyleSheet.create({
  body: { fontFamily: 'Sarabun_400Regular' },
  semibold: { fontFamily: 'Sarabun_600SemiBold' },
  bold: { fontFamily: 'Sarabun_700Bold' },
  eyebrow: { fontFamily: 'Sarabun_700Bold' },
  heading: { fontFamily: 'Sarabun_700Bold' },
  mono: { fontFamily: 'Sarabun_400Regular' },
});

function UsbText({
  variant = 'body',
  style,
  ...props
}: ComponentProps<typeof Text> & { variant?: UsbTextVariant }) {
  return <Text {...props} style={[textStyles[variant], style]} />;
}

export function UsbSerialTestSection(props: UsbSerialTestSectionProps) {
  const { selectedWebId, boundWebIdByTagId, canManageTechnicianMode, onAssignTag, onUnassignTag, onSyncBoardState, onTechnicianResetTag } = props;
  const usb = useUsbSerialTest();
  const [bindingBusy, setBindingBusy] = useState(false);
  const [bindingStatus, setBindingStatus] = useState('');
  const [unbindingBusy, setUnbindingBusy] = useState(false);
  const [technicianBusy, setTechnicianBusy] = useState(false);
  const [technicianMode, setTechnicianMode] = useState(false);

  const detectedTagBinding = usb.detectedTagId ? boundWebIdByTagId[usb.detectedTagId] ?? '' : '';
  const selectedWebIdHash = useMemo(() => usb.hashWebId(selectedWebId), [selectedWebId, usb]);
  const readyToBind = Boolean(usb.detectedTagId && selectedWebId);
  const boardLockedToOtherWebId = Boolean(usb.boundWebIdHash && selectedWebIdHash && usb.boundWebIdHash !== selectedWebIdHash);
  const canResetBinding = Boolean(
    usb.detectedTagId && selectedWebId && usb.boundWebIdHash && usb.boundWebIdHash === selectedWebIdHash && detectedTagBinding === selectedWebId,
  );

  useEffect(() => {
    if (!usb.detectedTagId) {
      setBindingBusy(false);
      setUnbindingBusy(false);
      setBindingStatus('');
      return;
    }

    if (detectedTagBinding && usb.boundWebIdHash === usb.hashWebId(detectedTagBinding)) {
      setBindingStatus(`แท็กนี้ถูกล็อกด้วย hash ${usb.boundWebIdHash} แล้ว`);
      return;
    }

    if (usb.boundWebIdHash && !detectedTagBinding) {
      setBindingStatus(`บอร์ดถูกล็อกไว้ด้วย hash ${usb.boundWebIdHash}`);
      return;
    }

    setBindingStatus('');
  }, [detectedTagBinding, usb]);

  async function handleBindPress() {
    if (!usb.detectedTagId || !selectedWebId || bindingBusy || unbindingBusy) return;

    if (usb.boundWebIdHash && usb.boundWebIdHash !== selectedWebIdHash) {
      setBindingStatus(`บอร์ดตัวนี้ถูกล็อกไว้ด้วย hash ${usb.boundWebIdHash} อยู่แล้ว`);
      return;
    }

    setBindingBusy(true);
    setBindingStatus(`กำลังล็อก hash ${selectedWebIdHash} และผูก ${usb.detectedTagId}...`);

    const boardLocked = await usb.persistBinding(selectedWebId);
    if (!boardLocked) {
      setBindingBusy(false);
      setBindingStatus(usb.boundWebIdHash ? `บอร์ดยังถูกล็อกไว้ด้วย hash ${usb.boundWebIdHash}` : 'เขียน hash ลงบอร์ดไม่สำเร็จ');
      return;
    }

    const bindingSaved = await onAssignTag(usb.detectedTagId, selectedWebId);
    if (!bindingSaved) {
      await usb.clearBinding(selectedWebId);
      setBindingBusy(false);
      setBindingStatus('ผูกในระบบไม่สำเร็จ เลยคืนค่าที่ล็อกในบอร์ดให้แล้ว');
      return;
    }

    const synced = await onSyncBoardState({
      tagId: usb.detectedTagId,
      webId: selectedWebId,
      boardWebIdHash: selectedWebIdHash,
      boardLockState: 'locked',
    });

    setBindingBusy(false);
    setBindingStatus(
      synced
        ? `ผูก ${usb.detectedTagId} กับ ${selectedWebId} และซิงก์ hash ${selectedWebIdHash} แล้ว`
        : `ผูก ${usb.detectedTagId} สำเร็จ แต่ซิงก์สถานะบอร์ดกับ backend ยังไม่ผ่าน`,
    );
  }

  async function handleUnbindPress() {
    if (!usb.detectedTagId || !selectedWebId || !canResetBinding || bindingBusy || unbindingBusy) return;

    setUnbindingBusy(true);
    setBindingStatus(`กำลังล้าง hash ${selectedWebIdHash} และยกเลิกการผูก ${usb.detectedTagId}...`);

    const boardUnlocked = await usb.clearBinding(selectedWebId);
    if (!boardUnlocked) {
      setUnbindingBusy(false);
      setBindingStatus(`ปลดล็อกจากบอร์ดไม่สำเร็จ บอร์ดยังล็อกด้วย hash ${usb.boundWebIdHash || selectedWebIdHash}`);
      return;
    }

    const backendUnassigned = await onUnassignTag(usb.detectedTagId);
    if (!backendUnassigned) {
      await usb.persistBinding(selectedWebId);
      setUnbindingBusy(false);
      setBindingStatus('ยกเลิกในระบบไม่สำเร็จ เลยล็อกกลับลงบอร์ดให้แล้ว');
      return;
    }

    setUnbindingBusy(false);
    setBindingStatus(`ยกเลิกการผูก ${usb.detectedTagId} จาก ${selectedWebId} แล้ว`);
  }

  async function handleSyncPress() {
    if (!usb.detectedTagId || !selectedWebId || bindingBusy || unbindingBusy || technicianBusy) return;

    const synced = await onSyncBoardState({
      tagId: usb.detectedTagId,
      webId: selectedWebId,
      boardWebIdHash: usb.boundWebIdHash || null,
      boardLockState: usb.boundWebIdHash ? 'locked' : 'unbound',
    });

    setBindingStatus(synced ? 'ซิงก์สถานะบอร์ดกับ backend แล้ว' : 'ซิงก์สถานะบอร์ดไม่สำเร็จ');
  }

  async function handleTechnicianResetPress() {
    if (!usb.detectedTagId || technicianBusy || bindingBusy || unbindingBusy) return;

    setTechnicianBusy(true);
    setBindingStatus(`กำลัง factory reset ${usb.detectedTagId}...`);

    const boardReset = await usb.technicianReset();
    if (!boardReset) {
      setTechnicianBusy(false);
      setBindingStatus('ล้าง lock ในบอร์ดไม่สำเร็จ');
      return;
    }

    const backendReset = await onTechnicianResetTag(usb.detectedTagId);
    setTechnicianBusy(false);
    setBindingStatus(backendReset ? `factory reset ${usb.detectedTagId} ทั้งบอร์ดและ backend แล้ว` : 'ล้าง lock ในบอร์ดแล้ว แต่ backend ยังไม่อัปเดต');
  }

  if (!usb.supported) {
    return (
      <View className="rounded-[28px] border border-slate-200 bg-white/95 p-5 gap-3">
        <UsbText variant="eyebrow" className="text-[12px] uppercase tracking-[1px] text-sky-700">
          USB test mode
        </UsbText>
        <UsbText variant="heading" className="text-[24px] text-slate-950">
          เบราว์เซอร์นี้ยังใช้โหมด USB ไม่ได้
        </UsbText>
        <UsbText variant="body" className="text-sm leading-6 text-slate-600">
          ถ้าจะเทสบอร์ดผ่านสาย USB บนหน้าเว็บ แนะนำให้เปิดผ่าน Chrome หรือ Edge เวอร์ชันใหม่
        </UsbText>
      </View>
    );
  }

  return (
    <View className="rounded-[28px] border border-slate-200 bg-white/95 p-5 gap-4">
      <View className="gap-1">
        <UsbText variant="eyebrow" className="text-[12px] uppercase tracking-[1px] text-sky-700">
          USB test mode
        </UsbText>
        <UsbText variant="heading" className="text-[26px] text-slate-950">
          เทสบอร์ดผ่านสาย USB ก่อน
        </UsbText>
        <UsbText variant="body" className="text-sm leading-6 text-slate-600">
          ตอนผูก ระบบจะเก็บ hash ของ Web ID ลงบอร์ดแทนค่าเต็ม เพื่อไม่ให้ค่าจริงหลุดออกจากอุปกรณ์
        </UsbText>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <View className="rounded-full bg-slate-100 px-3 py-2">
          <UsbText variant="semibold" className="text-[11px] text-slate-500">
            สถานะ
          </UsbText>
          <UsbText variant="bold" className="text-[13px] text-slate-900">
            {usb.connectionLabel}
          </UsbText>
        </View>
        <View className="rounded-full bg-sky-100 px-3 py-2">
          <UsbText variant="semibold" className="text-[11px] text-sky-700">
            Web ID
          </UsbText>
          <UsbText variant="bold" className="text-[13px] text-sky-950">
            {selectedWebId || 'ยังไม่มี Web ID'}
          </UsbText>
        </View>
        <View className="rounded-full bg-emerald-100 px-3 py-2">
          <UsbText variant="semibold" className="text-[11px] text-emerald-700">
            Tag ID
          </UsbText>
          <UsbText variant="bold" className="text-[13px] text-emerald-950">
            {usb.detectedTagId || 'ยังไม่เจอ'}
          </UsbText>
        </View>
        <View className="rounded-full bg-amber-100 px-3 py-2">
          <UsbText variant="semibold" className="text-[11px] text-amber-700">
            Hash ในบอร์ด
          </UsbText>
          <UsbText variant="bold" className="text-[13px] text-amber-950">
            {usb.boundWebIdHash || 'ยังไม่ล็อก'}
          </UsbText>
        </View>
      </View>

      <View className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 gap-3">
        <UsbText variant="semibold" className="text-sm text-slate-900">
          {usb.status}
        </UsbText>
        {selectedWebId ? (
          <UsbText variant="body" className="text-xs text-slate-500">
            hash ของ Web ID นี้คือ {selectedWebIdHash || '-'}
          </UsbText>
        ) : null}
        {boardLockedToOtherWebId ? (
          <UsbText variant="body" className="text-xs text-rose-700">
            บอร์ดตัวนี้ถูกล็อกไว้ด้วย hash อื่นอยู่แล้ว คนอื่นจะผูกทับไม่ได้
          </UsbText>
        ) : null}
        {detectedTagBinding ? (
          <UsbText variant="body" className="text-xs text-slate-600">
            ในระบบตอนนี้แท็กนี้ผูกอยู่กับ {detectedTagBinding}
          </UsbText>
        ) : null}

        <View className="rounded-2xl border border-slate-200 bg-white px-3 py-3 gap-2">
          <UsbText variant="eyebrow" className="text-xs uppercase tracking-[1px] text-slate-500">
            Web ID ของบัญชีนี้
          </UsbText>
          <UsbText variant="bold" className="text-base text-slate-950">
            {selectedWebId || 'ยังไม่มี Web ID'}
          </UsbText>
          <UsbText variant="body" className="text-xs text-slate-500">
            ใช้ Web ID นี้สำหรับ bind บอร์ดของบัญชีนี้ได้เลย ไม่ต้องสร้างเพิ่ม
          </UsbText>
        </View>

        <View className="flex-row flex-wrap gap-2">
          <Pressable className="rounded-full bg-slate-950 px-4 py-3" style={({ pressed }) => (pressed ? { opacity: 0.82 } : null)} onPress={() => void usb.connect()}>
            <UsbText variant="semibold" className="text-sm text-white">
              {usb.connected ? 'เชื่อมใหม่' : 'เชื่อมผ่าน USB'}
            </UsbText>
          </Pressable>
          <Pressable className="rounded-full bg-slate-200 px-4 py-3" style={({ pressed }) => (pressed ? { opacity: 0.82 } : null)} onPress={() => void usb.requestIdentity()}>
            <UsbText variant="semibold" className="text-sm text-slate-900">
              อ่าน tag id
            </UsbText>
          </Pressable>
          <Pressable className="rounded-full bg-amber-100 px-4 py-3" style={({ pressed }) => (pressed ? { opacity: 0.82 } : null)} onPress={() => void usb.softReset()}>
            <UsbText variant="semibold" className="text-sm text-amber-950">
              รีเซ็ตบอร์ด
            </UsbText>
          </Pressable>
          <Pressable className="rounded-full bg-slate-100 px-4 py-3" style={({ pressed }) => (pressed ? { opacity: 0.82 } : null)} onPress={() => void usb.disconnect()}>
            <UsbText variant="semibold" className="text-sm text-slate-700">
              ตัดการเชื่อมต่อ
            </UsbText>
          </Pressable>
        </View>
      </View>

      <View className="rounded-2xl bg-slate-950 px-4 py-4 gap-3">
        <UsbText variant="eyebrow" className="text-xs uppercase tracking-[1px] text-slate-400">
          ผูกจาก tag ที่อ่านได้
        </UsbText>
        <UsbText variant="body" className="text-sm text-slate-200">
          {!usb.detectedTagId
            ? 'ยังไม่มี tag id จากบอร์ด ให้กดเชื่อม USB หรืออ่าน tag id ก่อน'
            : !selectedWebId
              ? `เจอ ${usb.detectedTagId} แล้ว แต่บัญชีนี้ยังไม่มี Web ID`
              : boardLockedToOtherWebId
                ? `บอร์ดตัวนี้ล็อกด้วย hash ${usb.boundWebIdHash} อยู่แล้ว ถ้าจะเปลี่ยนต้องยกเลิกการผูกเดิมก่อน`
                : `พร้อมผูก ${usb.detectedTagId} เข้ากับ ${selectedWebId}`}
        </UsbText>
        {bindingStatus ? (
          <UsbText variant="body" className="text-xs text-slate-300">
            {bindingStatus}
          </UsbText>
        ) : null}

        <View className="flex-row flex-wrap gap-2">
          <Pressable
            className={`self-start rounded-full px-4 py-3 ${readyToBind && !bindingBusy && !unbindingBusy && !boardLockedToOtherWebId ? 'bg-white' : 'bg-slate-300'}`}
            style={({ pressed }) => (pressed && readyToBind && !bindingBusy && !unbindingBusy && !boardLockedToOtherWebId ? { opacity: 0.8 } : null)}
            onPress={() => void handleBindPress()}
          >
            <UsbText variant="semibold" className={`text-sm ${readyToBind && !bindingBusy && !unbindingBusy && !boardLockedToOtherWebId ? 'text-slate-950' : 'text-slate-500'}`}>
              {bindingBusy ? 'กำลังผูก...' : `ผูกเข้ากับ ${selectedWebId || 'Web ID'}`}
            </UsbText>
          </Pressable>

          <Pressable
            className={`self-start rounded-full px-4 py-3 ${canResetBinding && !bindingBusy && !unbindingBusy ? 'bg-rose-100' : 'bg-slate-300'}`}
            style={({ pressed }) => (pressed && canResetBinding && !bindingBusy && !unbindingBusy ? { opacity: 0.8 } : null)}
            onPress={() => void handleUnbindPress()}
          >
            <UsbText variant="semibold" className={`text-sm ${canResetBinding && !bindingBusy && !unbindingBusy ? 'text-rose-950' : 'text-slate-500'}`}>
              {unbindingBusy ? 'กำลังยกเลิก...' : 'ยกเลิกการผูกก่อนเปลี่ยน'}
            </UsbText>
          </Pressable>

          <Pressable
            className={`self-start rounded-full px-4 py-3 ${usb.detectedTagId && selectedWebId && !bindingBusy && !unbindingBusy && !technicianBusy ? 'bg-sky-100' : 'bg-slate-300'}`}
            style={({ pressed }) => (pressed && usb.detectedTagId && selectedWebId && !bindingBusy && !unbindingBusy && !technicianBusy ? { opacity: 0.8 } : null)}
            onPress={() => void handleSyncPress()}
          >
            <UsbText variant="semibold" className={`text-sm ${usb.detectedTagId && selectedWebId && !bindingBusy && !unbindingBusy && !technicianBusy ? 'text-sky-950' : 'text-slate-500'}`}>
              sync board state
            </UsbText>
          </Pressable>
        </View>
      </View>

      {canManageTechnicianMode ? (
        <View className="rounded-2xl border border-dashed border-rose-200 bg-rose-50 px-4 py-4 gap-3">
          <Pressable className="flex-row items-center justify-between" style={({ pressed }) => (pressed ? { opacity: 0.82 } : null)} onPress={() => setTechnicianMode((prev) => !prev)}>
            <UsbText variant="eyebrow" className="text-xs uppercase tracking-[1px] text-rose-700">
              Factory reset
            </UsbText>
            <UsbText variant="semibold" className="text-xs text-rose-900">
              {technicianMode ? 'ซ่อน' : 'เปิด'}
            </UsbText>
          </Pressable>
          {technicianMode ? (
            <>
              <UsbText variant="body" className="text-sm text-rose-900">
                ใช้ตอนซ่อมหรือรับบอร์ดคืนเท่านั้น ปุ่มนี้จะล้าง lock ในบอร์ดแล้วรีเซ็ตสถานะใน backend ไปพร้อมกัน
              </UsbText>
              <Pressable
                className={`self-start rounded-full px-4 py-3 ${usb.detectedTagId && !bindingBusy && !unbindingBusy && !technicianBusy ? 'bg-rose-600' : 'bg-slate-300'}`}
                style={({ pressed }) => (pressed && usb.detectedTagId && !bindingBusy && !unbindingBusy && !technicianBusy ? { opacity: 0.82 } : null)}
                onPress={() => void handleTechnicianResetPress()}
              >
                <UsbText variant="semibold" className={`text-sm ${usb.detectedTagId && !bindingBusy && !unbindingBusy && !technicianBusy ? 'text-white' : 'text-slate-500'}`}>
                  {technicianBusy ? 'กำลัง reset...' : 'factory reset'}
                </UsbText>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : null}

      <View className="rounded-2xl border border-slate-200 bg-white px-4 py-4 gap-2">
        <Pressable className="flex-row items-center justify-between" style={({ pressed }) => (pressed ? { opacity: 0.82 } : null)} onPress={() => usb.setDetailsOpen(!usb.detailsOpen)}>
          <UsbText variant="eyebrow" className="text-xs uppercase tracking-[1px] text-slate-500">
            รายละเอียดจากบอร์ด
          </UsbText>
          <UsbText variant="semibold" className="text-xs text-slate-700">
            {usb.detailsOpen ? 'ซ่อน' : 'ดูเพิ่ม'}
          </UsbText>
        </Pressable>
        {usb.detailsOpen ? (
          usb.logLines.length === 0 ? (
            <UsbText variant="body" className="text-sm text-slate-500">
              ยังไม่มี log เข้ามา ลองกดเชื่อมแล้วกดอ่าน tag id
            </UsbText>
          ) : (
            usb.logLines.map((line, index) => (
              <UsbText key={`${line}-${index}`} variant="mono" className="text-xs text-slate-700">
                {line}
              </UsbText>
            ))
          )
        ) : (
          <UsbText variant="body" className="text-sm text-slate-500">
            ซ่อน log ดิบไว้ก่อน จะได้โฟกัสเฉพาะสิ่งที่ต้องใช้จริง
          </UsbText>
        )}
      </View>
    </View>
  );
}
