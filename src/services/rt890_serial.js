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

    const block = await this.readExact(128 + 4);
    if (block[0] === 0xff) {
      return null;
    }
    if (!verifyChecksum(block)) {
      throw new Error('Flash read checksum failed.');
    }
    return block.slice(3, 3 + 128);
  }

  async isBootloaderMode() {
    const data = await this.readFlash(0x0000);
    return data === null;
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
