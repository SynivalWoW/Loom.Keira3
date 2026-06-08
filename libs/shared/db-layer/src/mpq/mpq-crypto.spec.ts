import { decryptBlock, encryptBlock, hashString, MpqHashType } from './mpq-crypto';

describe('mpq-crypto', () => {
  it('reproduces the well-known StormLib table keys', () => {
    // These constants are baked into every MPQ; matching them proves the hash matches StormLib exactly.
    expect(hashString('(hash table)', MpqHashType.FileKey) >>> 0).toBe(0xc3af3770);
    expect(hashString('(block table)', MpqHashType.FileKey) >>> 0).toBe(0xec83b3a3);
  });

  it('is case-insensitive and treats / and \\ as the same separator', () => {
    expect(hashString('DBFilesClient\\CreatureModelData.dbc', MpqHashType.NameA)).toBe(
      hashString('dbfilesclient/creaturemodeldata.dbc', MpqHashType.NameA),
    );
  });

  it('produces distinct hashes for the different hash types', () => {
    const name = 'DBFilesClient\\CreatureDisplayInfo.dbc';
    const offset = hashString(name, MpqHashType.TableOffset);
    const nameA = hashString(name, MpqHashType.NameA);
    const nameB = hashString(name, MpqHashType.NameB);
    expect(new Set([offset, nameA, nameB]).size).toBe(3);
  });

  it('round-trips a block through encrypt + decrypt and actually transforms the data', () => {
    const original = Uint32Array.from([0x11223344, 0xdeadbeef, 0x00000000, 0xffffffff, 0x0badf00d]);
    const work = original.slice();

    encryptBlock(work, 0xabcdef01);
    expect([...work]).not.toEqual([...original]); // encryption changed the bytes

    decryptBlock(work, 0xabcdef01);
    expect([...work]).toEqual([...original]); // and decryption restored them
  });
});
