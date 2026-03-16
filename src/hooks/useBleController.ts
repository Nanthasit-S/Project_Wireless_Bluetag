import { useBleScanner } from './ble/useBleScanner';
import { useRingControl } from './ble/useRingControl';

export function useBleController() {
  const scanner = useBleScanner();
  const ringControl = useRingControl({
    managerRef: scanner.managerRef,
    bleReady: scanner.bleReady,
    isScanning: scanner.isScanning,
    setIsScanning: scanner.setIsScanning,
    targetTag: scanner.targetTag,
    connectedTagId: scanner.connectedTagId,
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
    activeTagIds: scanner.activeTagIds,
    tagNicknames: scanner.tagNicknames,
    targetTag: scanner.targetTag,
    targetSeen: scanner.targetSeen,
    connectedTagId: scanner.connectedTagId,
    connectedSeen: scanner.connectedSeen,
    localTagLocations: scanner.localTagLocations,
    phoneLocation: scanner.phoneLocation,
    message: scanner.message,
    setMessage: scanner.setMessage,
    setTagNickname: scanner.setTagNickname,
    setTargetTag: scanner.setTargetTag,
    connectToTag: scanner.connectToTag,
    disconnectFromTag: scanner.disconnectFromTag,
    startScan: scanner.startScan,
    refreshScan: scanner.refreshScan,
    stopScan: scanner.stopScan,
    handleToggleAutoRing: ringControl.handleToggleAutoRing,
    handleManualOff: ringControl.handleManualOff,
    handleManualRing: ringControl.handleManualRing,
    handleFactoryReset: ringControl.handleFactoryReset,
    resetBleSession,
  };
}
