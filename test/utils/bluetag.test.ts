import { describe, expect, it } from 'vitest';
import { deriveStableTagId, inferTagIdFromDevice, parseBlueTagManufacturerData } from '../../src/utils/bluetag';

describe('bluetag utils', () => {
  it('derives a stable pseudo tag id for legacy devices', () => {
    expect(deriveStableTagId('AA:BB:CC:DD:EE:FF')).toBe('BTAG-7561D12F');
    expect(deriveStableTagId('aa:bb:cc:dd:ee:ff')).toBe('BTAG-7561D12F');
  });

  it('infers BTAG ids from explicit names and legacy BLUETAG names', () => {
    expect(inferTagIdFromDevice({ id: 'device-1', name: 'BTAG-59ADE300' })).toBe('BTAG-59ADE300');
    expect(inferTagIdFromDevice({ id: 'AA:BB:CC:DD:EE:FF', name: 'BLUETAG' })).toBe('BTAG-7561D12F');
  });

  it('parses manufacturer data emitted by the compatible firmware', () => {
    const bytes = Buffer.from([
      0x34,
      0x12,
      0x42,
      0x54,
      0x41,
      0x47,
      0x01,
      0x64,
      0x00,
      0x00,
      0x00,
      0x02,
      0x59,
      0xad,
      0xe3,
      0x00,
    ]);

    expect(parseBlueTagManufacturerData(bytes.toString('base64'))).toEqual({
      tagId: 'BTAG-59ADE300',
      battery: 100,
      counter: 2,
    });
  });
});
