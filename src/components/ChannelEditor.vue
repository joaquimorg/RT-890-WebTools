<template>
  <section class="channel-editor">
    <div class="channel-toolbar">
      <div class="toolbar-group">
        <button class="button primary" @click="loadFromRadio" :disabled="!isConnected || isBusy">
          <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="4" width="12" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
            <rect x="8.5" y="6.5" width="7" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/>
            <path d="M12 10v6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            <path d="M9.5 13.5l2.5 2.5 2.5-2.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Read from radio
        </button>
        <button
          class="button ghost"
          @click="writeToRadio"
          :disabled="!isConnected || !channels.length || isBusy"
        >
          <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="4" width="12" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/>
            <rect x="8.5" y="6.5" width="7" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/>
            <path d="M12 18v-6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            <path d="M9.5 12.5l2.5-2.5 2.5 2.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Write to radio
        </button>
        <button class="button ghost" @click="exportJson" :disabled="!channels.length">
          <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4v10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            <path d="M8 10l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M5 20h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
          Export JSON
        </button>
        <button class="button ghost" type="button" @click="triggerImport">
          <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20V10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            <path d="M8 14l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M5 4h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
          Import JSON
        </button>
        <span class="file-name">{{ importFileName || 'No file chosen' }}</span>
      </div>
      <div class="toolbar-group search-group">
        <div class="search-pill">
          <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/>
            <path d="M16 16l4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
          </svg>
          <input v-model="search" class="input search-input" placeholder="Search name or number" />
          <button class="icon-button subtle" type="button" @click="clearSearch" :disabled="!search">
            ×
          </button>
        </div>
        <div v-if="searchCountVisible" class="search-count">{{ filteredChannels.length }} found</div>
      </div>
      <div class="toolbar-group file-picker">
        <input
          id="channels-import"
          ref="importInput"
          type="file"
          accept=".json"
          @change="onImportFile"
        />
      </div>
    </div>

    <div class="channel-meta">
      <div>Channels loaded: {{ channels.length }}</div>
      <div v-if="isBusy">Working...</div>
      <div v-else-if="!isConnected">Connect to enable read/write.</div>
    </div>

    <div class="channel-table">
      <div class="channel-row channel-head">
        <span>#</span>
        <span>Name</span>
        <span>RX Freq (MHz)</span>
        <span>Duplex</span>
        <span>Offset/TX</span>
        <span>Power</span>
        <span>Mode</span>
        <span>RX Tone Mode</span>
        <span>RX Tone</span>
        <span>RX Pol</span>
        <span>TX Tone Mode</span>
        <span>TX Tone</span>
        <span>TX Pol</span>
        <span>Scan</span>
        <span>BCL</span>
        <span>Mute Type</span>
        <span>Mute Code</span>
        <span>SC No</span>
        <span>List 1</span>
        <span>List 2</span>
        <span>List 3</span>
        <span>List 4</span>
        <span>List 5</span>
        <span>List 6</span>
        <span>List 7</span>
        <span>List 8</span>
        <span>Actions</span>
      </div>
      <div v-for="channel in filteredChannels" :key="channel.number" class="channel-row">
        <span>{{ channel.number }}</span>
        <input v-model="channel.name" class="input" />
        <input
          :value="formatFreq(channel.rx_freq_hz)"
          class="input"
          type="text"
          inputmode="decimal"
          @change="onRxInput(channel, $event)"
        />
        <select class="select" v-model="channel.ui_duplex" @change="onDuplexChange(channel)">
          <option v-for="mode in duplexOptions" :key="mode" :value="mode">
            {{ mode || 'Simplex' }}
          </option>
        </select>
        <input
          :value="formatOffset(channel)"
          class="input"
          type="text"
          inputmode="decimal"
          min="0"
          @change="onOffsetInput(channel, $event)"
        />
        <select class="select" v-model="channel.low_power">
          <option :value="false">High</option>
          <option :value="true">Low</option>
        </select>
        <select class="select" :value="getMode(channel)" @change="onModeChange(channel, $event)">
          <option v-for="mode in modeOptions" :key="mode" :value="mode">{{ mode }}</option>
        </select>
        <select class="select" v-model="channel.rx_tone.mode">
          <option v-for="mode in toneModes" :key="mode" :value="mode">{{ mode || 'None' }}</option>
        </select>
        <input v-model.number="channel.rx_tone.value" class="input" type="number" />
        <select class="select" v-model="channel.rx_tone.polarity">
          <option value="N">N</option>
          <option value="R">R</option>
        </select>
        <select class="select" v-model="channel.tx_tone.mode">
          <option v-for="mode in toneModes" :key="mode" :value="mode">{{ mode || 'None' }}</option>
        </select>
        <input v-model.number="channel.tx_tone.value" class="input" type="number" />
        <select class="select" v-model="channel.tx_tone.polarity">
          <option value="N">N</option>
          <option value="R">R</option>
        </select>
        <input v-model="channel.scan" type="checkbox" />
        <select class="select" v-model.number="channel.bcl">
          <option v-for="(label, index) in bclOptions" :key="label" :value="index">{{ label }}</option>
        </select>
        <select class="select" v-model.number="channel.mute_type">
          <option v-for="(label, index) in muteTypeOptions" :key="label" :value="index">{{ label }}</option>
        </select>
        <input v-model.number="channel.mute_code" class="input" type="number" min="0" />
        <select class="select" v-model.number="channel.scno">
          <option v-for="value in scOptions" :key="value" :value="value">{{ value }}</option>
        </select>
        <input v-model="channel.scanlist[1]" type="checkbox" />
        <input v-model="channel.scanlist[2]" type="checkbox" />
        <input v-model="channel.scanlist[3]" type="checkbox" />
        <input v-model="channel.scanlist[4]" type="checkbox" />
        <input v-model="channel.scanlist[5]" type="checkbox" />
        <input v-model="channel.scanlist[6]" type="checkbox" />
        <input v-model="channel.scanlist[7]" type="checkbox" />
        <input v-model="channel.scanlist[8]" type="checkbox" />
        <div class="channel-actions-cell">
          <button class="icon-button" type="button" @click="insertBlank(channel)">
            +
          </button>
          <button class="icon-button danger" type="button" @click="removeChannel(channel)">
            ×
          </button>
        </div>
      </div>
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

    <div v-if="confirmVisible" class="modal-backdrop">
      <div class="modal">
        <div class="modal-title">Import channels</div>
        <div class="modal-text">
          Import {{ pendingChannels.length }} channels. Replace all or append to the end?
        </div>
        <div class="modal-actions">
          <button class="button primary" @click="confirmReplace">Replace all</button>
          <button class="button ghost" @click="confirmAppend">Append</button>
          <button class="button ghost" @click="cancelImport">Cancel</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import { applyChannels, parseChannels } from '../services/rt890_channels';
import { downloadBlob } from '../services/rt890_serial';

const props = defineProps({
  serial: {
    type: Object,
    default: null
  },
  isConnected: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['back', 'log']);

const channels = ref([]);
const importFileName = ref('');
const importInput = ref(null);
const pendingChannels = ref([]);
const isBusy = ref(false);
const search = ref('');
const progressVisible = ref(false);
const progressValue = ref(0);
const progressLabel = ref('');
const confirmVisible = ref(false);
const modeOptions = ['FM', 'NFM', 'AM', 'LSB', 'USB'];
const toneModes = ['', 'Tone', 'DTCS'];
const duplexOptions = ['', '+', '-', 'split'];
const bclOptions = ['Off', 'Carrier', 'CTC/DCS'];
const muteTypeOptions = ['Off', '-', '23b', '24b'];
const scOptions = Array.from({ length: 9 }, (_, index) => index);

const log = (message) => emit('log', message);

const triggerImport = () => {
  if (importInput.value) {
    importInput.value.click();
  }
};

const filteredChannels = computed(() => {
  if (!search.value || search.value.length < 3) {
    return channels.value;
  }
  const term = search.value.toLowerCase();
  return channels.value.filter((channel) => {
    const name = (channel.name || '').toLowerCase();
    return name.includes(term) || String(channel.number).includes(term);
  });
});

const searchCountVisible = computed(() => search.value && search.value.length >= 3);

const clearSearch = () => {
  search.value = '';
};

const normalizeChannel = (channel) => {
  const rxTone = channel.rx_tone || { mode: '', value: null, polarity: 'N' };
  const txTone = channel.tx_tone || { mode: '', value: null, polarity: 'N' };
  const scanlist = channel.scanlist || {};
  const normalized = {
    ...channel,
    rx_tone: { mode: rxTone.mode || '', value: rxTone.value ?? null, polarity: rxTone.polarity || 'N' },
    tx_tone: { mode: txTone.mode || '', value: txTone.value ?? null, polarity: txTone.polarity || 'N' },
    mute_type: Number.isFinite(Number(channel.mute_type)) ? Number(channel.mute_type) : 0,
    mute_code: Number(channel.mute_code) || 0,
    scno: Number.isFinite(Number(channel.scno)) ? Number(channel.scno) : 0,
    bcl: Number.isFinite(Number(channel.bcl)) ? Number(channel.bcl) : 0,
    scanlist: {
      1: Boolean(scanlist[1]),
      2: Boolean(scanlist[2]),
      3: Boolean(scanlist[3]),
      4: Boolean(scanlist[4]),
      5: Boolean(scanlist[5]),
      6: Boolean(scanlist[6]),
      7: Boolean(scanlist[7]),
      8: Boolean(scanlist[8])
    }
  };
  normalized.ui_duplex = getDuplex(normalized);
  normalized.ui_offset = getOffset(normalized, normalized.ui_duplex);
  return normalized;
};

const getDuplex = (channel) => {
  if (!channel.tx_freq_hz || channel.tx_freq_hz === channel.rx_freq_hz) {
    return '';
  }
  return channel.tx_freq_hz > channel.rx_freq_hz ? '+' : '-';
};

const getOffset = (channel, duplex) => {
  if (duplex === 'split') {
    return channel.tx_freq_hz || 0;
  }
  if (!channel.tx_freq_hz || !channel.rx_freq_hz) {
    return 0;
  }
  return Math.abs(channel.tx_freq_hz - channel.rx_freq_hz);
};

const applyOffset = (channel) => {
  const offset = Number(channel.ui_offset) || 0;
  if (channel.ui_duplex === '+') {
    channel.tx_freq_hz = Number(channel.rx_freq_hz || 0) + offset;
  } else if (channel.ui_duplex === '-') {
    channel.tx_freq_hz = Number(channel.rx_freq_hz || 0) - offset;
  } else if (channel.ui_duplex === 'split') {
    channel.tx_freq_hz = offset;
  } else {
    channel.tx_freq_hz = Number(channel.rx_freq_hz || 0);
  }
};

const onDuplexChange = (channel) => {
  applyOffset(channel);
};

const formatFreq = (value) => {
  const hz = Number(value) || 0;
  const mhz = hz / 1000000;
  return mhz ? mhz.toFixed(6) : '';
};

const parseFreq = (text) => {
  const clean = String(text || '').replace(',', '.').trim();
  if (!clean) {
    return 0;
  }
  const mhz = Number(clean);
  if (!Number.isFinite(mhz)) {
    return 0;
  }
  return Math.round(mhz * 1000000);
};

const onRxInput = (channel, event) => {
  channel.rx_freq_hz = parseFreq(event.target.value);
  applyOffset(channel);
};

const formatOffset = (channel) => {
  if (!channel.ui_offset) {
    return '';
  }
  if (channel.ui_duplex === 'split') {
    return formatFreq(channel.ui_offset);
  }
  return formatFreq(channel.ui_offset);
};

const onOffsetInput = (channel, event) => {
  const value = event.target.value;
  if (!value) {
    channel.ui_offset = 0;
  } else {
    channel.ui_offset = parseFreq(value);
  }
  applyOffset(channel);
};

const getMode = (channel) => {
  if (channel.is_narrow) {
    return 'NFM';
  }
  if (channel.modulation_type === 0) {
    return 'FM';
  }
  if (channel.modulation_type === 1) {
    return 'AM';
  }
  if (channel.modulation_type === 2) {
    return 'LSB';
  }
  if (channel.modulation_type === 3) {
    return 'USB';
  }
  return 'FM';
};

const onModeChange = (channel, event) => {
  const mode = event.target.value;
  if (mode === 'NFM') {
    channel.modulation_type = 0;
    channel.is_narrow = true;
  } else if (mode === 'FM') {
    channel.modulation_type = 0;
    channel.is_narrow = false;
  } else if (mode === 'AM') {
    channel.modulation_type = 1;
    channel.is_narrow = false;
  } else if (mode === 'LSB') {
    channel.modulation_type = 2;
    channel.is_narrow = false;
  } else if (mode === 'USB') {
    channel.modulation_type = 3;
    channel.is_narrow = false;
  }
};

const createBlankChannel = (number) => ({
  number,
  name: '',
  rx_freq_hz: 0,
  tx_freq_hz: 0,
  rx_tone: { mode: '', value: null, polarity: 'N' },
  tx_tone: { mode: '', value: null, polarity: 'N' },
  is_narrow: false,
  low_power: false,
  scan: false,
  bcl: 0,
  modulation_type: 0,
  mute_type: 0,
  mute_code: 0,
  scno: 0,
  scanlist: { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false, 8: false },
  ui_duplex: '',
  ui_offset: 0
});

const insertBlank = (channel) => {
  if (channels.value.length >= 999) {
    log('Maximum of 999 channels reached.');
    return;
  }
  const index = channels.value.findIndex((item) => item.number === channel.number);
  if (index === -1) {
    return;
  }
  const blank = normalizeChannel(createBlankChannel(channel.number + 1));
  const updated = [
    ...channels.value.slice(0, index + 1),
    blank,
    ...channels.value.slice(index + 1)
  ];
  channels.value = updated
    .map((item, idx) => normalizeChannel({ ...item, number: idx + 1 }))
    .slice(0, 999);
};

const removeChannel = (channel) => {
  const index = channels.value.findIndex((item) => item.number === channel.number);
  if (index === -1) {
    return;
  }
  const updated = channels.value.filter((_, idx) => idx !== index);
  channels.value = updated
    .map((item, idx) => normalizeChannel({ ...item, number: idx + 1 }))
    .slice(0, 999);
};

const loadFromRadio = async () => {
  if (!props.serial) {
    log('Connect to the radio before reading channels.');
    return;
  }
  isBusy.value = true;
  progressLabel.value = 'Reading channels';
  progressValue.value = 0;
  progressVisible.value = true;
  log('Reading channels from radio.');
  try {
    const eeprom = await props.serial.downloadEeprom((percent) => {
      progressValue.value = percent;
    });
    channels.value = parseChannels(eeprom)
      .sort((a, b) => a.number - b.number)
      .map((channel) => normalizeChannel(channel));
    log(`Channels loaded: ${channels.value.length}.`);
  } catch (error) {
    log(`Channel read failed: ${error.message}`);
  } finally {
    isBusy.value = false;
    progressVisible.value = false;
  }
};

const writeToRadio = async () => {
  if (!props.serial) {
    log('Connect to the radio before writing channels.');
    return;
  }
  if (!channels.value.length) {
    log('No channels to write.');
    return;
  }
  isBusy.value = true;
  progressLabel.value = 'Writing channels';
  progressValue.value = 0;
  progressVisible.value = true;
  log('Writing channels to radio.');
  try {
    const eeprom = await props.serial.downloadEeprom((percent) => {
      progressValue.value = Math.min(50, Math.round(percent / 2));
    });
    const updated = applyChannels(eeprom, channels.value);
    await props.serial.uploadEeprom(updated, (percent) => {
      progressValue.value = 50 + Math.round(percent / 2);
    });
    log('Channel write completed.');
  } catch (error) {
    log(`Channel write failed: ${error.message}`);
  } finally {
    isBusy.value = false;
    progressVisible.value = false;
  }
};

const exportJson = () => {
  if (!channels.value.length) {
    log('No channels loaded to export.');
    return;
  }
  const payload = JSON.stringify({ channels: channels.value }, null, 2);
  downloadBlob(new Blob([payload], { type: 'application/json' }), 'rt890_channels.json');
  log('Channel export ready.');
};

const onImportFile = async (event) => {
  const file = event.target.files[0];
  importFileName.value = file ? file.name : '';
  if (!file) {
    return;
  }
  try {
    const payload = await file.text();
    const parsed = JSON.parse(payload);
    if (!parsed.channels || !Array.isArray(parsed.channels)) {
      throw new Error('Channels JSON must include a channels array.');
    }
    pendingChannels.value = parsed.channels.slice();
    confirmVisible.value = true;
  } catch (error) {
    log(`Channel import failed: ${error.message}`);
  }
};

const confirmReplace = () => {
  const pendingCount = pendingChannels.value.length;
  const imported = pendingChannels.value.slice(0, 999);
  channels.value = imported
    .sort((a, b) => a.number - b.number)
    .map((channel) => normalizeChannel(channel));
  confirmVisible.value = false;
  pendingChannels.value = [];
  if (imported.length < pendingCount) {
    log('Import truncated to 999 channels.');
  }
  log(`Channels replaced: ${channels.value.length}.`);
};

const confirmAppend = () => {
  const baseCount = channels.value.length;
  const maxNumber = channels.value.reduce((max, channel) => {
    const num = Number(channel.number) || 0;
    return Math.max(max, num);
  }, 0);
  const appendList = pendingChannels.value.map((channel, index) => ({
    ...channel,
    number: maxNumber + index + 1
  }));
  const merged = [...channels.value, ...appendList].slice(0, 999);
  channels.value = merged.map((channel) => normalizeChannel(channel));
  confirmVisible.value = false;
  pendingChannels.value = [];
  if (merged.length < baseCount + appendList.length) {
    log('Append truncated to 999 channels.');
  }
  log(`Channels appended. Total: ${channels.value.length}.`);
};

const cancelImport = () => {
  confirmVisible.value = false;
  pendingChannels.value = [];
  if (importInput.value) {
    importInput.value.value = '';
  }
  log('Import canceled.');
};
</script>
