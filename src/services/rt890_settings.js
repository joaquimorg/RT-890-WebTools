const LIST_WORKMODE = ['Frequency', 'Channel'];
const LIST_ROGER = ['Off', 'Roger 1', 'Roger 2', 'Send ID'];
const LIST_TXPRI = ['Edit', 'Busy'];
const LIST_FREQSTEP = ['0.01', '0.25K', '1.25K', '2.5K', '5K', '6.25K', '8.33K', '10K', '12.5K', '20K', '25K', '50K', '100K', '500K', '1M', '5M'];
const LIST_TIMER = ['Off', '5 seconds', '10 seconds', ...Array.from({ length: 40 }, (_, i) => `${(i + 3) * 15} seconds`)];
const LIST_DIRECTION = ['Up', 'Down'];
const LIST_REPEATER = ['Off', 'Talkaround', 'Frequency Reversal'];
const LIST_SKEY = ['None', 'Monitor', 'Frequency Detect', 'Talkaround', 'Quick CH', 'Local Alarm', 'Remote Alarm', 'Weather CH', 'Send Tone', 'Roger Beep'];
const LIST_DELAY = Array.from({ length: 21 }, (_, i) => `${i * 100} ms`);
const LIST_INTERVAL = Array.from({ length: 18 }, (_, i) => `${(i + 3) * 10} ms`);
const LIST_SENDM = ['Off', 'TX Start', 'TX End', 'Start and End'];
const LIST_SENDS = Array.from({ length: 16 }, (_, i) => `DTMF ${i + 1}`);
const TXALLOW_CHOICES = ['RX Only', 'TX/RX'];

const readString = (data, offset, length) => {
  const slice = data.slice(offset, offset + length);
  const clean = slice.filter((byte) => byte !== 0x00 && byte !== 0xff);
  return String.fromCharCode(...clean).trimEnd();
};

const writeString = (data, offset, length, value) => {
  const bytes = new Uint8Array(length);
  const text = String(value || '').slice(0, length).trim();
  for (let i = 0; i < text.length; i += 1) {
    bytes[i] = text.charCodeAt(i) & 0x7f;
  }
  data.set(bytes, offset);
};

const listValue = (list, index) => list[index] ?? list[0];
const listIndex = (list, value) => Math.max(0, list.indexOf(value));

const getBits = (byte, mask, shift) => (byte & mask) >> shift;
const setBits = (byte, mask, shift, value) => (byte & ~mask) | ((value << shift) & mask);

export const parseSettings = (eeprom) => {
  const data = new Uint8Array(eeprom);
  const view = new DataView(data.buffer);

  const flags0 = data[0x0030];
  const flags1 = data[0x0031];
  const flags2 = data[0x0032];
  const flags3 = data[0x0036];
  const flags4 = data[0x003b];
  const flags5 = data[0x0044];

  const settings = {
    personalid: readString(data, 0x0020, 16),
    workmode: listValue(LIST_WORKMODE, getBits(flags4, 0x40, 6)),
    voiceprompt: Boolean(flags0 & 0x20),
    keybeep: Boolean(flags0 & 0x40),
    rogerbeep: listValue(LIST_ROGER, getBits(flags1, 0x06, 1)),
    txpriority: listValue(LIST_TXPRI, getBits(flags1, 0x01, 0)),
    savemode: Boolean(flags1 & 0x08),
    frequencystep: listValue(LIST_FREQSTEP, getBits(flags1, 0xf0, 4)),
    squelch: getBits(flags2, 0x0f, 0),
    displaytimer: listValue(LIST_TIMER, data[0x0033]),
    locktimer: listValue(LIST_TIMER, data[0x0034]),
    timeouttimer: listValue(LIST_TIMER, data[0x0035]),
    vox: Boolean(flags5 & 0x10),
    voxlevel: getBits(flags3, 0x0f, 0),
    voxdelay: getBits(flags3, 0xf0, 4),
    noaaalarm: Boolean(flags2 & 0x40),
    fmstandby: Boolean(flags4 & 0x01),
    fmfrequency: (view.getUint16(0x0039, true) / 10).toFixed(1),
    tailtone: Boolean(flags0 & 0x08),
    scandirection: listValue(LIST_DIRECTION, getBits(flags4, 0x08, 3)),
    dualdisplay: Boolean(flags2 & 0x80),
    talkaround: listValue(LIST_REPEATER, getBits(flags2, 0x30, 4)),
    key1short: listValue(LIST_SKEY, getBits(data[0x0041], 0xf0, 4)),
    key1long: listValue(LIST_SKEY, getBits(data[0x0040], 0xf0, 4)),
    key2short: listValue(LIST_SKEY, getBits(data[0x0043], 0xf0, 4)),
    key2long: listValue(LIST_SKEY, getBits(data[0x0042], 0xf0, 4)),
    tonefrequency: view.getUint16(0x0037, true),
    dualstandby: Boolean(flags4 & 0x02),
    standbyarea: listValue(['A', 'B'], getBits(flags4, 0x04, 2)),
    areaach: view.getUint16(0x003c, true) + 1,
    areabch: view.getUint16(0x003e, true) + 1,
    quickch1: view.getUint16(0x0072, true) + 1,
    quickch2: view.getUint16(0x0070, true) + 1,
    quickch3: view.getUint16(0x0076, true) + 1,
    quickch4: view.getUint16(0x0074, true) + 1,
    bordercolor: view.getUint16(0x0047, true),
    startuplabel: readString(data, 0x0000, 32),
    displaylabel: Boolean(flags0 & 0x04),
    displayvoltage: Boolean(flags0 & 0x02),
    displaylogo: Boolean(flags0 & 0x01),
    startupringtone: Boolean(flags0 & 0x10),
    xposition: data[0x0045],
    yposition: data[0x0046],
    senddelay: listValue(LIST_DELAY, data[0x8d20]),
    sendinterval: listValue(LIST_INTERVAL, data[0x8d21]),
    sendmode: listValue(LIST_SENDM, getBits(data[0x8d22], 0xc0, 6)),
    sendselect: listValue(LIST_SENDS, getBits(data[0x8d23], 0xf0, 4)),
    recvdisplay: Boolean(data[0x8d24] & 0x80),
    encodegain: data[0x8d25],
    decodeth: data[0x8d26],
    range174_240: data[0x0054] === 0xff ? 'RX Only' : 'TX/RX',
    range240_320: data[0x0055] === 0xff ? 'RX Only' : 'TX/RX',
    range320_400: data[0x0056] === 0xff ? 'RX Only' : 'TX/RX',
    range480_560: data[0x0057] === 0xff ? 'RX Only' : 'TX/RX'
  };

  const dtmfCodes = [];
  for (let i = 0; i < 16; i += 1) {
    const base = 0x8d30 + i * 16;
    const len = data[base + 15];
    const raw = data.slice(base, base + 14);
    const code = len > 0 && len <= 14 ? String.fromCharCode(...raw.slice(0, len)) : readString(data, base, 14);
    dtmfCodes.push(code);
  }
  settings.dtmfCodes = dtmfCodes;

  settings.kill = readString(data, 0x8e30, 14);
  settings.stun = readString(data, 0x8e40, 14);
  settings.wakeup = readString(data, 0x8e50, 14);

  return settings;
};

export const applySettings = (eeprom, settings) => {
  const data = new Uint8Array(eeprom);
  const view = new DataView(data.buffer);

  writeString(data, 0x0020, 16, settings.personalid);
  writeString(data, 0x0000, 32, settings.startuplabel);

  let flags0 = data[0x0030];
  flags0 = setBits(flags0, 0x01, 0, settings.displaylogo ? 1 : 0);
  flags0 = setBits(flags0, 0x02, 1, settings.displayvoltage ? 1 : 0);
  flags0 = setBits(flags0, 0x04, 2, settings.displaylabel ? 1 : 0);
  flags0 = setBits(flags0, 0x08, 3, settings.tailtone ? 1 : 0);
  flags0 = setBits(flags0, 0x10, 4, settings.startupringtone ? 1 : 0);
  flags0 = setBits(flags0, 0x20, 5, settings.voiceprompt ? 1 : 0);
  flags0 = setBits(flags0, 0x40, 6, settings.keybeep ? 1 : 0);
  data[0x0030] = flags0;

  let flags1 = data[0x0031];
  flags1 = setBits(flags1, 0x01, 0, listIndex(LIST_TXPRI, settings.txpriority));
  flags1 = setBits(flags1, 0x06, 1, listIndex(LIST_ROGER, settings.rogerbeep));
  flags1 = setBits(flags1, 0x08, 3, settings.savemode ? 1 : 0);
  flags1 = setBits(flags1, 0xf0, 4, listIndex(LIST_FREQSTEP, settings.frequencystep));
  data[0x0031] = flags1;

  let flags2 = data[0x0032];
  flags2 = setBits(flags2, 0x0f, 0, Number(settings.squelch) || 0);
  flags2 = setBits(flags2, 0x30, 4, listIndex(LIST_REPEATER, settings.talkaround));
  flags2 = setBits(flags2, 0x40, 6, settings.noaaalarm ? 1 : 0);
  flags2 = setBits(flags2, 0x80, 7, settings.dualdisplay ? 1 : 0);
  data[0x0032] = flags2;

  data[0x0033] = listIndex(LIST_TIMER, settings.displaytimer);
  data[0x0034] = listIndex(LIST_TIMER, settings.locktimer);
  data[0x0035] = listIndex(LIST_TIMER, settings.timeouttimer);

  let flags3 = data[0x0036];
  flags3 = setBits(flags3, 0x0f, 0, Number(settings.voxlevel) || 0);
  flags3 = setBits(flags3, 0xf0, 4, Number(settings.voxdelay) || 0);
  data[0x0036] = flags3;

  view.setUint16(0x0037, Number(settings.tonefrequency) || 0, true);
  view.setUint16(0x0039, Math.round(Number(settings.fmfrequency || 0) * 10), true);

  let flags4 = data[0x003b];
  flags4 = setBits(flags4, 0x01, 0, settings.fmstandby ? 1 : 0);
  flags4 = setBits(flags4, 0x02, 1, settings.dualstandby ? 1 : 0);
  flags4 = setBits(flags4, 0x04, 2, listIndex(['A', 'B'], settings.standbyarea));
  flags4 = setBits(flags4, 0x08, 3, listIndex(LIST_DIRECTION, settings.scandirection));
  flags4 = setBits(flags4, 0x40, 6, listIndex(LIST_WORKMODE, settings.workmode));
  data[0x003b] = flags4;

  let flags5 = data[0x0044];
  flags5 = setBits(flags5, 0x10, 4, settings.vox ? 1 : 0);
  data[0x0044] = flags5;

  data[0x0040] = setBits(data[0x0040], 0xf0, 4, listIndex(LIST_SKEY, settings.key1long));
  data[0x0041] = setBits(data[0x0041], 0xf0, 4, listIndex(LIST_SKEY, settings.key1short));
  data[0x0042] = setBits(data[0x0042], 0xf0, 4, listIndex(LIST_SKEY, settings.key2long));
  data[0x0043] = setBits(data[0x0043], 0xf0, 4, listIndex(LIST_SKEY, settings.key2short));

  data[0x0045] = Number(settings.xposition) || 0;
  data[0x0046] = Number(settings.yposition) || 0;
  view.setUint16(0x0047, Number(settings.bordercolor) || 0, true);

  view.setUint16(0x003c, Math.max(0, Number(settings.areaach) - 1), true);
  view.setUint16(0x003e, Math.max(0, Number(settings.areabch) - 1), true);
  view.setUint16(0x0072, Math.max(0, Number(settings.quickch1) - 1), true);
  view.setUint16(0x0070, Math.max(0, Number(settings.quickch2) - 1), true);
  view.setUint16(0x0076, Math.max(0, Number(settings.quickch3) - 1), true);
  view.setUint16(0x0074, Math.max(0, Number(settings.quickch4) - 1), true);

  data[0x8d20] = listIndex(LIST_DELAY, settings.senddelay);
  data[0x8d21] = listIndex(LIST_INTERVAL, settings.sendinterval);
  data[0x8d22] = setBits(data[0x8d22], 0xc0, 6, listIndex(LIST_SENDM, settings.sendmode));
  data[0x8d23] = setBits(data[0x8d23], 0xf0, 4, listIndex(LIST_SENDS, settings.sendselect));
  data[0x8d24] = setBits(data[0x8d24], 0x80, 7, settings.recvdisplay ? 1 : 0);
  data[0x8d25] = Number(settings.encodegain) || 0;
  data[0x8d26] = Number(settings.decodeth) || 0;

  const dtmfCodes = settings.dtmfCodes || [];
  for (let i = 0; i < 16; i += 1) {
    const base = 0x8d30 + i * 16;
    writeString(data, base, 14, dtmfCodes[i] || '');
    data[base + 14] = 0xff;
    data[base + 15] = Math.min(14, String(dtmfCodes[i] || '').length);
  }

  writeString(data, 0x8e30, 14, settings.kill);
  writeString(data, 0x8e40, 14, settings.stun);
  writeString(data, 0x8e50, 14, settings.wakeup);

  data[0x0054] = settings.range174_240 === 'RX Only' ? 0xff : 0x00;
  data[0x0055] = settings.range240_320 === 'RX Only' ? 0xff : 0x00;
  data[0x0056] = settings.range320_400 === 'RX Only' ? 0xff : 0x00;
  data[0x0057] = settings.range480_560 === 'RX Only' ? 0xff : 0x00;

  return data;
};
