<template>
  <div class="page">
    <div class="container">
      <header class="header">
        <div class="hero">
          <div class="brand-pill">RT-890 TOOLSET (PCB 2.0)</div>
          <h1>{{ heroTitle }}</h1>
          <p>{{ heroText }}</p>
          <div class="hero-actions">
            <button v-if="activeView !== 'home'" class="tag-button" @click="activeView = 'home'">
              Home
            </button>
            <button v-if="activeView !== 'channels'" class="tag-button" @click="activeView = 'channels'">
              Channel editor
            </button>            
            <button v-if="activeView !== 'settings'" class="tag-button" @click="activeView = 'settings'">
              Settings
            </button>
          </div>
        </div>
        <div class="connection">
          <div class="connection-top">
            <div :class="['status', isConnected ? 'connected' : '']">
              <span class="status-dot"></span>
              {{ isConnected ? 'Connected' : 'Disconnected' }}
            </div>
            <div>Firmware: {{ firmwareVersion || '-' }}</div>
          </div>
          <div class="connection-meta">
            {{ isConnected ? `${selectedPortLabel} @ ${selectedBaud}` : 'Click Connect to pick a port.' }}
          </div>
          <div class="field-row">
            <select v-model="selectedBaud" class="select" :disabled="isConnected">
              <option v-for="baud in baudRates" :key="baud" :value="baud">{{ baud }}</option>
            </select>
            <button class="button primary" @click="connect" :disabled="isConnected">
              <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 9v6M16 9v6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                <rect x="6" y="5" width="12" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
                <path d="M12 13v6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              </svg>
              Connect
            </button>
            <button class="button primary" @click="disconnect" :disabled="!isConnected">
              <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              </svg>
              Disconnect
            </button>
          </div>
        </div>
      </header>

      <section v-if="activeView === 'home'" class="grid">
        <div class="card">
          <h3>EEPROM backup</h3>
          <p>Save the radio's current configuration.</p>
          <button class="button primary" @click="startBackup" :disabled="!isConnected">
            <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 4v10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              <path d="M8 10l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M5 18h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
            Backup EEPROM
          </button>
          <div class="hint">The file will download as .bin</div>
        </div>

        <div class="card">
          <h3>Restore EEPROM</h3>
          <p>Restore a backup file to the radio.</p>
          <div class="file-picker">
            <label class="file-label" for="restore-file">Choose file</label>
            <input id="restore-file" type="file" @change="onRestoreFile" :disabled="!isConnected" />
            <span class="file-name">{{ restoreFileName || 'No file chosen' }}</span>
          </div>
          <button class="button primary" @click="startRestore" :disabled="!restoreFileName || !isConnected">
            <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 20V10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              <path d="M8 14l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M5 6h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
            Restore EEPROM
          </button>
        </div>

        <div class="card card-success">
          <h3>Firmware</h3>
          <p>Flash packed firmware to the radio.</p>
          <p>Note: Radio must be in Boot mode (turn on pressing the two side buttons).</p>
          <div class="file-picker">
            <label class="file-label" for="firmware-file">Choose file</label>
            <input id="firmware-file" type="file" @change="onFirmwareFile" />
            <span class="file-name">{{ firmwareFileName || 'No file chosen' }}</span>
          </div>
          <button class="button primary" @click="startFlash" :disabled="!firmwareFileName">
            <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M13 3L6 14h5l-1 7 8-12h-5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
            </svg>
            Program firmware
          </button>
        </div>

        <div class="card">
          <h3>SPI backup</h3>
          <p>Read the full SPI flash contents (normal mode).</p>
          <p>This is slow and can take several minutes.</p>
          <button class="button primary" @click="startSpiBackup" :disabled="!isConnected">
            <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 4v10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              <path d="M8 10l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M5 18h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
            Backup SPI
          </button>
          <div class="hint">Expect a large file (4 MB).</div>
        </div>

        <div class="card">
          <h3>SPI restore</h3>
          <p>Write a SPI backup file back to the radio (normal mode).</p>
          <p>This process is slow and can take several minutes.</p>
          <div class="file-picker">
            <label class="file-label" for="spi-restore-file">Choose file</label>
            <input id="spi-restore-file" type="file" @change="onSpiRestoreFile" :disabled="!isConnected" />
            <span class="file-name">{{ spiRestoreFileName || 'No file chosen' }}</span>
          </div>
          <button class="button primary" @click="startSpiRestore" :disabled="!spiRestoreFileName || !isConnected">
            <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 20V10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
              <path d="M8 14l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M5 6h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
            Restore SPI
          </button>
        </div>

      </section>

      <section v-if="activeView === 'home'" class="log">
        <div class="log-header">
          <h3>Operations log</h3>
          <button class="button ghost" @click="clearLog">
            <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 7h12M9 7V5h6v2M8 7l1 12h6l1-12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Clear
          </button>
        </div>
        <div class="log-list">
          <div v-for="entry in logs" :key="entry.id">{{ entry.message }}</div>
        </div>
      </section>

      <section v-if="activeView === 'home'" class="grid">
        <div class="card card-accent">
          <h3>Warning</h3>
          <p>Use these tools at your own risk. I am not responsible for any damage, loss, or failures caused to radios.</p>
        </div>
      </section>

      <ChannelEditor
        v-if="activeView === 'channels'"
        :serial="serial"
        :isConnected="isConnected"
        @back="activeView = 'home'"
        @log="addLog"
      />

      <BasicSettings
        v-if="activeView === 'settings'"
        :serial="serial"
        :isConnected="isConnected"
        @log="addLog"
      />

      <footer class="footer">
        Copyright 2026 <a href="https://www.joaquim.org" target="_blank" rel="noreferrer">joaquim.org</a>
      </footer>
    </div>

    <div v-if="progressVisible" class="modal-backdrop">
      <div class="modal">
        <div class="modal-title">{{ progressLabel }}</div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: `${progressValue}%` }"></div>
        </div>
        <div class="progress-value">{{ progressValue }}%</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import ChannelEditor from './components/ChannelEditor.vue';
import BasicSettings from './components/BasicSettings.vue';
import {
  RT890Serial,
  downloadBlob,
  formatPortLabel,
  listPorts,
  requestPort
} from './services/rt890_serial';

const isConnected = ref(false);
const firmwareVersion = ref('');
const restoreFileName = ref('');
const restoreFile = ref(null);
const spiRestoreFileName = ref('');
const spiRestoreFile = ref(null);
const firmwareFileName = ref('');
const firmwareFile = ref(null);

const ports = ref([]);
const baudRates = ref([115200, 57600, 38400]);
const selectedPort = ref(null);
const selectedBaud = ref(115200);
const serial = ref(null);
const FLASH_BAUD = 115200;
const activeView = ref('home');
const heroTitle = computed(() => {
  if (activeView.value === 'channels') {
    return 'Channel editor';
  }
  if (activeView.value === 'settings') {
    return 'Settings';
  }
  return 'Tools for RT-890.';
});
const heroText = computed(() => {
  if (activeView.value === 'channels') {
    return 'Edit channel memory, import/export JSON, and write back to the radio.';
  }
  if (activeView.value === 'settings') {
    return 'Edit radio settings, startup text, DTMF, and TX allow lists.';
  }
  return 'Connect the radio to backup and restore the EEPROM, flash firmware, and edit channel memory.';
});
const progressVisible = ref(false);
const progressValue = ref(0);
const progressLabel = ref('');

const logs = ref([
  { id: 1, message: 'Ready for RT-890 session.' }
]);
let logId = 2;

const addLog = (message) => {
  logs.value.unshift({ id: logId++, message });
};

const refreshPorts = async () => {
  try {
    const portList = await listPorts();
    ports.value = portList.map((port, index) => ({
      port,
      label: formatPortLabel(port, index)
    }));
  } catch (error) {
    addLog(`Port scan failed: ${error.message}`);
  }
};

const pickPort = async () => {
  try {
    const port = await requestPort();
    await refreshPorts();
    selectedPort.value = port;
    addLog('Port selected.');
    return port;
  } catch (error) {
    addLog(`Port selection cancelled: ${error.message}`);
    return null;
  }
};

const selectedPortLabel = computed(() => {
  if (!selectedPort.value) {
    return 'No port';
  }
  const entry = ports.value.find((item) => item.port === selectedPort.value);
  return entry ? entry.label : 'Selected port';
});

const connect = async () => {
  let port = selectedPort.value;
  if (!port) {
    port = await pickPort();
  }
  if (!port) {
    addLog('No serial port selected.');
    return;
  }
  try {
    if (serial.value && serial.value.port !== port) {
      await serial.value.close();
    }
    serial.value = new RT890Serial(port);
    await serial.value.open(selectedBaud.value);
    let mode = 'unknown';
    try {
      const isBoot = await serial.value.isBootloaderMode();
      mode = isBoot ? 'bootloader' : 'normal';
    } catch {
      mode = 'unknown';
    }
    isConnected.value = true;
    firmwareVersion.value = mode === 'bootloader' ? 'Bootloader' : mode === 'normal' ? 'PCB 2.0' : 'Unknown';
    addLog(`Connected at ${selectedBaud.value} (${mode}).`);
  } catch (error) {
    addLog(`Connect failed: ${error.message}`);
  }
};

const closeActiveSession = async (message) => {
  if (serial.value) {
    try {
      await serial.value.close();
    } catch {
      // Ignore close errors.
    }
  }
  serial.value = null;
  isConnected.value = false;
  firmwareVersion.value = '';
  if (message) {
    addLog(message);
  }
};

const disconnect = async () => {
  await closeActiveSession();
  selectedPort.value = null;
  addLog('Disconnected from radio.');
};

const startBackup = async () => {
  if (!serial.value) {
    addLog('Connect to the radio before backup.');
    return;
  }
  addLog('EEPROM backup started.');
  progressLabel.value = 'Reading EEPROM';
  progressValue.value = 0;
  progressVisible.value = true;
  try {
    const data = await serial.value.downloadEeprom((percent) => {
      progressValue.value = percent;
    });
    downloadBlob(data, 'rt890_eeprom.bin');
    addLog('EEPROM backup completed.');
  } catch (error) {
    addLog(`EEPROM backup failed: ${error.message}`);
  } finally {
    progressVisible.value = false;
  }
};

const startSpiBackup = async () => {
  if (!serial.value) {
    addLog('Connect to the radio before SPI backup.');
    return;
  }
  addLog('SPI backup started.');
  progressLabel.value = 'Reading SPI flash';
  progressValue.value = 0;
  progressVisible.value = true;
  try {
    const isBoot = await serial.value.isBootloaderMode();
    if (isBoot) {
      addLog('Radio is in bootloader mode. Use normal mode for SPI backup.');
      return;
    }
    const data = await serial.value.backupSpiFlash((percent) => {
      progressValue.value = percent;
    });
    downloadBlob(data, 'rt890_spi_backup.bin');
    addLog('SPI backup completed.');
  } catch (error) {
    addLog(`SPI backup failed: ${error.message}`);
  } finally {
    progressVisible.value = false;
  }
};

const onSpiRestoreFile = (event) => {
  const file = event.target.files[0];
  spiRestoreFileName.value = file ? file.name : '';
  spiRestoreFile.value = file || null;
};

const startSpiRestore = async () => {
  if (!spiRestoreFile.value) {
    addLog('Select a SPI backup file before restore.');
    return;
  }
  if (!serial.value) {
    addLog('Connect to the radio before SPI restore.');
    return;
  }
  addLog(`SPI restore started from ${spiRestoreFileName.value}.`);
  progressLabel.value = 'Writing SPI flash';
  progressValue.value = 0;
  progressVisible.value = true;
  try {
    const isBoot = await serial.value.isBootloaderMode();
    if (isBoot) {
      addLog('Radio is in bootloader mode. Use normal mode for SPI restore.');
      return;
    }
    const buffer = await spiRestoreFile.value.arrayBuffer();
    const data = new Uint8Array(buffer);
    await serial.value.restoreSpiFlash(data, (percent) => {
      progressValue.value = percent;
    });
    addLog('SPI restore completed.');
  } catch (error) {
    addLog(`SPI restore failed: ${error.message}`);
  } finally {
    progressVisible.value = false;
  }
};

const onRestoreFile = (event) => {
  const file = event.target.files[0];
  restoreFileName.value = file ? file.name : '';
  restoreFile.value = file || null;
};

const startRestore = async () => {
  if (!restoreFile.value) {
    addLog('Select a backup file before restore.');
    return;
  }
  if (!serial.value) {
    addLog('Connect to the radio before restore.');
    return;
  }
  addLog(`EEPROM restore started from ${restoreFileName.value}.`);
  progressLabel.value = 'Writing EEPROM';
  progressValue.value = 0;
  progressVisible.value = true;
  try {
    const buffer = await restoreFile.value.arrayBuffer();
    await serial.value.uploadEeprom(new Uint8Array(buffer), (percent) => {
      progressValue.value = percent;
    });
    addLog('EEPROM restore completed.');
  } catch (error) {
    addLog(`EEPROM restore failed: ${error.message}`);
  } finally {
    progressVisible.value = false;
  }
};

const onFirmwareFile = (event) => {
  const file = event.target.files[0];
  firmwareFileName.value = file ? file.name : '';
  firmwareFile.value = file || null;
};

const startFlash = async () => {
  if (!firmwareFile.value) {
    addLog('Select a firmware file before flashing.');
    return;
  }
  if (serial.value) {
    await closeActiveSession('Disconnected active session for firmware flash.');
  }
  let port = selectedPort.value;
  if (!port) {
    port = await pickPort();
  }
  if (!port) {
    addLog('No serial port selected.');
    return;
  }
  addLog('Firmware flash started.');
  progressLabel.value = 'Flashing firmware';
  progressValue.value = 0;
  progressVisible.value = true;
  let flashSerial = null;
  try {
    flashSerial = new RT890Serial(port);
    await flashSerial.open(FLASH_BAUD);
    const buffer = await firmwareFile.value.arrayBuffer();
    const firmware = new Uint8Array(buffer);
    const isBoot = await flashSerial.isBootloaderMode();
    if (!isBoot) {
      addLog('Radio is not in bootloader mode.');
      return;
    }
    await flashSerial.eraseFlash();
    await flashSerial.flashFirmware(firmware, (percent) => {
      progressValue.value = percent;
    });
    addLog('Firmware flash completed.');
  } catch (error) {
    addLog(`Firmware flash failed: ${error.message}`);
  } finally {
    if (flashSerial) {
      try {
        await flashSerial.close();
      } catch {
        // Ignore close errors.
      }
    }
    progressVisible.value = false;
  }
};

const clearLog = () => {
  logs.value = [];
  addLog('Log cleared.');
};

onMounted(() => {
  refreshPorts();
  const saved = localStorage.getItem('rt890_profile');
  if (saved) {
    try {
      const profile = JSON.parse(saved);
      selectedBaud.value = profile.baud || selectedBaud.value;
      addLog('Loaded saved profile.');
    } catch {
      addLog('Failed to load saved profile.');
    }
  }
});
</script>
