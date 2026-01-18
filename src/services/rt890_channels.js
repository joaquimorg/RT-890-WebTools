const CHANNEL_OFFSET = 0x1000;
const CHANNEL_COUNT = 999;
const CHANNEL_SIZE = 32;

const readUint16LE = (data, offset) => data[offset] | (data[offset + 1] << 8);
const readUint32LE = (data, offset) =>
  data[offset] |
  (data[offset + 1] << 8) |
  (data[offset + 2] << 16) |
  (data[offset + 3] << 24);

const writeUint16LE = (data, offset, value) => {
  data[offset] = value & 0xff;
  data[offset + 1] = (value >> 8) & 0xff;
};

const writeUint32LE = (data, offset, value) => {
  data[offset] = value & 0xff;
  data[offset + 1] = (value >> 8) & 0xff;
  data[offset + 2] = (value >> 16) & 0xff;
  data[offset + 3] = (value >> 24) & 0xff;
};

const decodeTone = (toneval) => {
  if (toneval === 0x3000) {
    return { mode: '', value: null, polarity: null };
  }
  if (toneval & 0x1000) {
    const code = parseInt((toneval & 0x1ff).toString(8), 10);
    return { mode: 'DTCS', value: code, polarity: 'N' };
  }
  if (toneval & 0x2000) {
    const code = parseInt((toneval & 0x1ff).toString(8), 10);
    return { mode: 'DTCS', value: code, polarity: 'R' };
  }
  return { mode: 'Tone', value: toneval / 10, polarity: null };
};

const encodeTone = (tone) => {
  if (!tone || !tone.mode) {
    return 0x3000;
  }
  if (tone.mode === 'Tone') {
    return Math.round(Number(tone.value) * 10);
  }
  if (tone.mode === 'DTCS') {
    const value = Number(tone.value);
    if (!Number.isFinite(value)) {
      throw new Error('DTCS value is required');
    }
    let code = parseInt(value.toString(10), 8);
    if (tone.polarity === 'N') {
      code |= 0x1800;
    } else if (tone.polarity === 'R') {
      code |= 0x2800;
    }
    return code;
  }
  throw new Error(`Unsupported tone mode '${tone.mode}'`);
};

const decodeName = (raw) => {
  const clean = raw.filter((byte) => byte !== 0xff && byte !== 0x00);
  return String.fromCharCode(...clean).trimEnd();
};

const encodeName = (name) => {
  const trimmed = (name || '').slice(0, 10);
  const bytes = new Uint8Array(10);
  for (let i = 0; i < trimmed.length; i += 1) {
    bytes[i] = trimmed.charCodeAt(i) & 0x7f;
  }
  return bytes;
};

export const parseChannels = (eeprom) => {
  const channels = [];
  for (let i = 0; i < CHANNEL_COUNT; i += 1) {
    const offset = CHANNEL_OFFSET + i * CHANNEL_SIZE;
    const block = eeprom.slice(offset, offset + CHANNEL_SIZE);
    if (block.length !== CHANNEL_SIZE) {
      break;
    }

    const rxfreq = readUint32LE(block, 0);
    if (rxfreq === 0 || (block[0] === 0xff && block[1] === 0xff && block[2] === 0xff && block[3] === 0xff)) {
      continue;
    }

    const rxTone = readUint16LE(block, 4);
    const txTone = readUint16LE(block, 10);
    const muteCode = block[12] | (block[13] << 8) | (block[14] << 16);
    const muteType = (block[15] >> 2) & 0x03;
    const flags = block[16];
    const scno = (block[18] >> 4) & 0x0f;
    const scanlists = block[19];

    channels.push({
      number: i + 1,
      name: decodeName(block.slice(22, 32)),
      rx_freq_hz: rxfreq * 10,
      tx_freq_hz: readUint32LE(block, 6) * 10,
      rx_tone: decodeTone(rxTone),
      tx_tone: decodeTone(txTone),
      is_narrow: Boolean(flags & 0x80),
      low_power: Boolean(flags & 0x40),
      scan: Boolean(flags & 0x20),
      bcl: (flags >> 3) & 0x03,
      modulation_type: (flags >> 1) & 0x03,
      mute_type: muteType,
      mute_code: muteCode,
      scno,
      scanlist: {
        1: Boolean(scanlists & 0x01),
        2: Boolean(scanlists & 0x02),
        3: Boolean(scanlists & 0x04),
        4: Boolean(scanlists & 0x08),
        5: Boolean(scanlists & 0x10),
        6: Boolean(scanlists & 0x20),
        7: Boolean(scanlists & 0x40),
        8: Boolean(scanlists & 0x80)
      }
    });
  }
  return channels;
};

export const applyChannels = (eeprom, channels) => {
  const data = new Uint8Array(eeprom);

  channels.forEach((entry) => {
    const number = Number(entry.number);
    if (!Number.isFinite(number) || number < 1 || number > CHANNEL_COUNT) {
      throw new Error(`Invalid channel number ${entry.number}`);
    }

    const offset = CHANNEL_OFFSET + (number - 1) * CHANNEL_SIZE;
    const block = data.slice(offset, offset + CHANNEL_SIZE);

    if (entry.clear) {
      block.fill(0x00, 0, 4);
      data.set(block, offset);
      return;
    }

    const rxFreq = Math.floor(Number(entry.rx_freq_hz || 0) / 10);
    const txFreq = Math.floor(Number(entry.tx_freq_hz || 0) / 10);
    writeUint32LE(block, 0, rxFreq);
    writeUint32LE(block, 6, txFreq);

    if (entry.rx_tone) {
      writeUint16LE(block, 4, encodeTone(entry.rx_tone));
    }
    if (entry.tx_tone) {
      writeUint16LE(block, 10, encodeTone(entry.tx_tone));
    }

    if (entry.mute_code !== undefined) {
      const value = Number(entry.mute_code) || 0;
      block[12] = value & 0xff;
      block[13] = (value >> 8) & 0xff;
      block[14] = (value >> 16) & 0xff;
    }

    if (entry.mute_type !== undefined) {
      const muteType = Number(entry.mute_type) & 0x03;
      block[15] = (block[15] & 0xf3) | (muteType << 2);
    }

    let flags = block[16] & 0x01;
    if (entry.is_narrow) {
      flags |= 0x80;
    }
    if (entry.low_power) {
      flags |= 0x40;
    }
    if (entry.scan) {
      flags |= 0x20;
    }
    flags |= (Number(entry.bcl || 0) & 0x03) << 3;
    flags |= (Number(entry.modulation_type || 0) & 0x03) << 1;
    block[16] = flags;

    if (entry.scno !== undefined) {
      const scno = Number(entry.scno) & 0x0f;
      block[18] = (block[18] & 0x0f) | (scno << 4);
    }

    if (entry.scanlist) {
      let scanlists = 0;
      if (entry.scanlist[1]) scanlists |= 0x01;
      if (entry.scanlist[2]) scanlists |= 0x02;
      if (entry.scanlist[3]) scanlists |= 0x04;
      if (entry.scanlist[4]) scanlists |= 0x08;
      if (entry.scanlist[5]) scanlists |= 0x10;
      if (entry.scanlist[6]) scanlists |= 0x20;
      if (entry.scanlist[7]) scanlists |= 0x40;
      if (entry.scanlist[8]) scanlists |= 0x80;
      block[19] = scanlists;
    }

    if (entry.name !== undefined) {
      block.set(encodeName(entry.name), 22);
    }

    data.set(block, offset);
  });

  return data;
};
