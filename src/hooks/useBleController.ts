import { useBleScanner } from './ble/useBleScanner';
import { useRingControl } from './ble/useRingControl';

export function useBleController() {
  const scanner = useBleScanner();
  const ringControl = useRingControl({
    managerRef: scanner.managerRef,
    bleReady: scanner.bleReady,
    isScanning: scanner.isScanning,
    setIsScanning: scanner.setIsScanning,
    targetSeen: scanner.targetSeen,
    tags: scanner.tags,
    readBatteryFromConnectedDevice: scanner.readBatteryFromConnectedDevice,
    setMessage: scanner.setMessage,
  });

  function resetBleSession() {
    ringControl.resetRingControl();
    scanner.resetScannerState();
  }

  return {
    bleReady: scanner.bleReady,
    bleState: scanner.bleState,
    isScanning: scanner.isScanning,
    autoRingEnabled: ringControl.autoRingEnabled,
    tags: scanner.tags,
    tagList: scanner.tagList,
    tagNicknames: scanner.tagNicknames,
    targetTag: scanner.targetTag,
    targetSeen: scanner.targetSeen,
    localTagLocations: scanner.localTagLocations,
    phoneLocation: scanner.phoneLocation,
    message: scanner.message,
    setMessage: scanner.setMessage,
    setTagNickname: scanner.setTagNickname,
    setTargetTag: scanner.setTargetTag,
    startScan: scanner.startScan,
    stopScan: scanner.stopScan,
    handleToggleAutoRing: ringControl.handleToggleAutoRing,
    handleManualOff: ringControl.handleManualOff,
    handleManualRing: ringControl.handleManualRing,
    resetBleSession,
  };
}
