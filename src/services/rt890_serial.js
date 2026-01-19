const DEFAULT_TIMEOUT_MS = 2000;
const USB_DEVICE_MAP = {
  '067b:2303': 'Prolific PL2303 USB-Serial',
  '1a86:7523': 'QinHeng CH340 USB-Serial',
  '10c4:ea60': 'Silicon Labs CP210x USB-Serial',
  '0403:6001': 'FTDI FT232 USB-Serial',
  '0403:6015': 'FTDI FT230X USB-Serial',
  '2341:0043': 'Arduino Uno (ATmega16U2)',
  '2a03:0043': 'Arduino Uno (ATmega16U2)',
  '1d50:60c7': 'USB-Serial Adapter'
};

const ensureWebSerial = () => {
  if (!('serial' in navigator)) {
    throw new Error('Web Serial API not supported in this browser.');
  }
};

export const listPorts = async () => {
  ensureWebSerial();
  return navigator.serial.getPorts();
};

export const requestPort = async () => {
  ensureWebSerial();
  return navigator.serial.requestPort();
};

export const formatPortLabel = (port, index) => {
  const info = port.getInfo();
  if (info && info.usbVendorId) {
    const vendor = info.usbVendorId.toString(16).padStart(4, '0');
    const product = (info.usbProductId || 0).toString(16).padStart(4, '0');
    const key = `${vendor}:${product}`.toLowerCase();
    const label = USB_DEVICE_MAP[key] ? ` - ${USB_DEVICE_MAP[key]}` : '';
    return `USB ${vendor}:${product}${label}`;
  }
  return `Port ${index + 1}`;
};

const checksum = (bytes) => {
  let sum = 0;
  for (let i = 0; i < bytes.length - 1; i += 1) {
    sum = (sum + bytes[i]) & 0xff;
  }
  bytes[bytes.length - 1] = sum;
};

const verifyChecksum = (bytes) => {
  let sum = 0;
  for (let i = 0; i < bytes.length - 1; i += 1) {
    sum = (sum + bytes[i]) & 0xff;
  }
  return sum === bytes[bytes.length - 1];
};

const SPI_RANGES = [
  { cmd: 0x40, offset: 0x000000, size: 0x2d0000 },
  { cmd: 0x41, offset: 0x2d0000, size: 0x028000 },
  { cmd: 0x42, offset: 0x2f8000, size: 0x022000 },
  { cmd: 0x43, offset: 0x31a000, size: 0x002000 },
  { cmd: 0x47, offset: 0x3b4a00, size: 0x00a000 },
  { cmd: 0x48, offset: 0x3bf000, size: 0x001000 },
  { cmd: 0x49, offset: 0x3c1000, size: 0x00a000 },
  { cmd: 0x4b, offset: 0x3d8000, size: 0x00a000 },
  { cmd: 0x4c, offset: 0x31c000, size: 0x099000 }
];

export class RT890Serial {
  constructor(port, timeoutMs = DEFAULT_TIMEOUT_MS) {
    this.port = port;
    this.timeoutMs = timeoutMs;
    this.readBuffer = new Uint8Array(0);
  }

  async open(baudRate) {
    if (!this.port) {
      throw new Error('No serial port selected.');
    }
    if (this.port.readable) {
      return;
    }
    await this.port.open({
      baudRate,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      flowControl: 'none'
    });
  }

  async close() {
    if (this.port && this.port.readable) {
      await this.port.close();
    }
  }

  async write(bytes) {
    const writer = this.port.writable.getWriter();
    try {
      await writer.write(bytes);
    } finally {
      writer.releaseLock();
    }
  }

  async readExact(size) {
    const output = new Uint8Array(size);
    let offset = 0;

    if (this.readBuffer.length) {
      const take = Math.min(this.readBuffer.length, size);
      output.set(this.readBuffer.slice(0, take), 0);
      offset += take;
      this.readBuffer = this.readBuffer.slice(take);
    }

    const reader = this.port.readable.getReader();
    let timeoutId;

    try {
      while (offset < size) {
        const readPromise = reader.read();
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`Timeout while reading ${size} bytes`));
          }, this.timeoutMs);
        });
        const { value, done } = await Promise.race([readPromise, timeoutPromise]);
        clearTimeout(timeoutId);
        if (done || !value) {
          break;
        }

        const remaining = size - offset;
        if (value.length <= remaining) {
          output.set(value, offset);
          offset += value.length;
        } else {
          output.set(value.slice(0, remaining), offset);
          this.readBuffer = value.slice(remaining);
          offset += remaining;
        }
      }
    } catch (error) {
      try {
        await reader.cancel();
      } catch {
        // Ignore cancel errors.
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      reader.releaseLock();
    }

    if (offset < size) {
      throw new Error(`Timeout while reading ${size} bytes`);
    }
    return output;
  }

  async drainInput(maxCycles = 8) {
    this.readBuffer = new Uint8Array(0);
    if (!this.port || !this.port.readable) {
      return;
    }
    const reader = this.port.readable.getReader();
    try {
      for (let i = 0; i < maxCycles; i += 1) {
        let timeoutId;
        try {
          const readPromise = reader.read();
          const timeoutPromise = new Promise((resolve) => {
            timeoutId = setTimeout(() => resolve({ value: null, done: true }), 30);
          });
          const { value, done } = await Promise.race([readPromise, timeoutPromise]);
          clearTimeout(timeoutId);
          if (done || !value || value.length === 0) {
            break;
          }
        } finally {
          clearTimeout(timeoutId);
        }
      }
    } catch {
      // Ignore drain errors.
    } finally {
      reader.releaseLock();
    }
  }

  async enterProgrammingMode() {
    const magic = new Uint8Array([0x35, 0x38, 0x05, 0x10, 0x82]);
    for (let i = 0; i < 5; i += 1) {
      await this.write(magic);
      try {
        const ack = await this.readExact(1);
        if (ack[0] === 0x06) {
          return;
        }
      } catch {
        // Retry.
      }
    }
    throw new Error('Radio did not enter programming mode.');
  }

  async exitProgrammingMode() {
    const exit = new Uint8Array([0x35, 0x38, 0x05, 0xee, 0x60]);
    await this.write(exit);
  }

  async readEepromBlock(blockAddr) {
    const addr = blockAddr + 0x7820;
    const cmd = new Uint8Array(4);
    cmd[0] = 0x52;
    cmd[1] = (addr >> 8) & 0xff;
    cmd[2] = addr & 0xff;
    cmd[3] = (cmd[0] + cmd[1] + cmd[2]) & 0xff;
    await this.write(cmd);

    const response = await this.readExact(3 + 0x80 + 1);
    if (response[0] !== 0x52 || response[1] !== cmd[1] || response[2] !== cmd[2]) {
      throw new Error(`Unexpected response at block ${blockAddr.toString(16)}`);
    }
    if (!verifyChecksum(response)) {
      throw new Error(`EEPROM checksum failed at block ${blockAddr.toString(16)}`);
    }
    return response.slice(3, 3 + 0x80);
  }

  async writeEepromBlock(blockAddr, data) {
    if (data.length !== 0x80) {
      throw new Error('Invalid EEPROM block size.');
    }
    const cmd = new Uint8Array(3 + 0x80 + 1);
    cmd[0] = 0x49;
    cmd[1] = (blockAddr >> 8) & 0xff;
    cmd[2] = blockAddr & 0xff;
    cmd.set(data, 3);
    checksum(cmd);
    await this.write(cmd);
    const ack = await this.readExact(1);
    if (ack[0] !== 0x06) {
      throw new Error(`No ACK writing EEPROM block ${blockAddr.toString(16)}`);
    }
  }

  async downloadEeprom(onProgress) {
    await this.enterProgrammingMode();
    const data = new Uint8Array(0xA000);
    let offset = 0;
    const totalBlocks = 0x0140;
    try {
      for (let addr = 0x0000; addr < 0x0140; addr += 1) {
        const block = await this.readEepromBlock(addr);
        data.set(block, offset);
        offset += block.length;
        if (onProgress) {
          const percent = Math.round(((addr + 1) / totalBlocks) * 100);
          onProgress(percent);
        }
      }
    } finally {
      await this.exitProgrammingMode();
    }
    return data;
  }

  async uploadEeprom(data, onProgress) {
    if (data.length !== 0xA000) {
      throw new Error('EEPROM data must be 40960 bytes.');
    }
    const totalBlocks = 0x0140;
    await this.enterProgrammingMode();
    try {
      await this.readEepromBlock(0x0000);
      for (let addr = 0x0000; addr < 0x0140; addr += 1) {
        const start = addr * 0x80;
        const block = data.slice(start, start + 0x80);
        await this.writeEepromBlock(addr, block);
        if (onProgress) {
          const percent = Math.round(((addr + 1) / totalBlocks) * 100);
          onProgress(percent);
        }
      }
    } finally {
      await this.exitProgrammingMode();
    }
  }

  async eraseFlash() {
    const cmd = new Uint8Array(5);
    cmd[0] = 0x39;
    cmd[3] = 0x55;
    checksum(cmd);
    await this.write(cmd);
    const ack = await this.readExact(1);
    if (ack[0] !== 0x06) {
      throw new Error('Flash erase failed.');
    }
  }

  async writeFlash(offset, firmware) {
    const cmd = new Uint8Array(128 + 4);
    cmd[0] = 0x57;
    cmd[1] = (offset >> 8) & 0xff;
    cmd[2] = offset & 0xff;
    const chunk = firmware.slice(offset, offset + 128);
    cmd.set(chunk, 3);
    checksum(cmd);
    await this.write(cmd);
    const ack = await this.readExact(1);
    if (ack[0] !== 0x06) {
      throw new Error(`Failed to write flash at 0x${offset.toString(16)}`);
    }
  }

  async readFlash(offset) {
    const cmd = new Uint8Array(4);
    cmd[0] = 0x52;
    cmd[1] = (offset >> 8) & 0xff;
    cmd[2] = offset & 0xff;
    checksum(cmd);
    await this.write(cmd);

    const header = await this.readExact(1);
    if (header[0] === 0xff) {
      return null;
    }
    const remainder = await this.readExact(128 + 3);
    const block = new Uint8Array(128 + 4);
    block[0] = header[0];
    block.set(remainder, 1);
    if (!verifyChecksum(block)) {
      throw new Error('Flash read checksum failed.');
    }
    return block.slice(3, 3 + 128);
  }

  async writeSpiFlash(offset, data) {
    let range = null;
    for (const entry of SPI_RANGES) {
      const rangeEnd = entry.offset + entry.size;
      if (offset >= entry.offset && offset < rangeEnd) {
        range = entry;
        break;
      }
    }
    if (!range) {
      return true;
    }
    const rangeEnd = range.offset + range.size;
    const blockIndex = Math.floor((offset - range.offset) / 128);
    const remaining = Math.max(0, Math.min(128, rangeEnd - offset, data.length - offset));

    const cmd = new Uint8Array(128 + 4);
    cmd[0] = range.cmd;
    cmd[1] = (blockIndex >> 8) & 0xff;
    cmd[2] = blockIndex & 0xff;
    if (remaining > 0) {
      cmd.set(data.slice(offset, offset + remaining), 3);
    }
    checksum(cmd);
    await this.write(cmd);
    const ack = await this.readExact(1);
    if (ack[0] !== 0x06) {
      throw new Error(`Failed to write SPI flash at 0x${offset.toString(16)}`);
    }
    return true;
  }

  async isBootloaderMode() {
    const data = await this.readFlash(0x0000);
    if (data === null) {
      await this.drainInput();
    }
    return data === null;
  }

  async backupSpiFlash(onProgress) {
    const blocks = 0x8000;
    const blockSize = 128;
    const totalSize = blocks * blockSize;
    const output = new Uint8Array(totalSize);
    for (let block = 0; block < blocks; block += 1) {
      const data = await this.readFlash(block);
      if (!data) {
        throw new Error('Failed to read SPI flash.');
      }
      output.set(data, block * blockSize);
      if (onProgress) {
        const percent = Math.round(((block + 1) / blocks) * 100);
        onProgress(percent);
      }
    }
    return output;
  }

  async restoreSpiFlash(data, onProgress) {
    const totalBlocks = Math.ceil(data.length / 128);
    for (let block = 0; block < totalBlocks; block += 1) {
      const offset = block * 128;
      await this.writeSpiFlash(offset, data);
      if (onProgress) {
        const percent = Math.round(((block + 1) / totalBlocks) * 100);
        onProgress(percent);
      }
    }
  }

  async flashFirmware(firmware, onProgress) {
    const total = firmware.length;
    for (let offset = 0; offset < firmware.length; offset += 128) {
      await this.writeFlash(offset, firmware);
      if (onProgress) {
        const percent = Math.round(((offset + 128) / total) * 100);
        onProgress(Math.min(100, percent));
      }
    }
  }
}

export const downloadBlob = (data, filename) => {
  const blob = data instanceof Blob ? data : new Blob([data]);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
