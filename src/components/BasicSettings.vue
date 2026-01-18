<template>
  <section class="settings-panel">
    <aside class="settings-nav">
      <button
        v-for="item in items"
        :key="item.key"
        class="settings-tab"
        :class="{ active: activeKey === item.key }"
        @click="activeKey = item.key"
      >
        {{ item.label }}
      </button>
    </aside>
    <div class="settings-content">
      <div class="settings-toolbar">
        <button class="button primary" @click="readSettings" :disabled="!isConnected">
          <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4v10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            <path d="M8 10l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Read settings
        </button>
        <button class="button ghost" @click="writeSettings" :disabled="!isConnected || !hasSettings">
          <svg class="btn-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20V10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            <path d="M8 14l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Write settings
        </button>
      </div>

      <div v-if="activeKey === 'basic'" class="settings-groups" :class="{ disabled: !hasSettings }">
        <div v-for="group in basicGroups" :key="group.title" class="settings-group">
          <div class="settings-group-title">{{ group.title }}</div>
          <div class="settings-grid">
            <div v-for="item in group.items" :key="item.key" class="settings-cell">
              <div v-if="item.type !== 'checkbox'" class="settings-label">{{ item.label }}</div>
              <template v-if="item.type === 'select'">
                <select class="select" v-model="item.value" :disabled="!hasSettings">
                  <option value="" disabled>Select</option>
                  <option v-for="option in item.options" :key="option" :value="option">
                    {{ option }}
                  </option>
                </select>
              </template>
              <template v-else-if="item.type === 'checkbox'">
                <label class="settings-check">
                  <input type="checkbox" v-model="item.value" :disabled="!hasSettings" />
                  <span>{{ item.label }}</span>
                </label>
              </template>
              <template v-else>
                <input class="input" :type="item.type" v-model="item.value" :disabled="!hasSettings" />
              </template>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeKey === 'dtmf'" class="settings-groups" :class="{ disabled: !hasSettings }">
        <div v-for="group in dtmfGroups" :key="group.title" class="settings-group">
          <div class="settings-group-title">{{ group.title }}</div>
          <div class="settings-grid">
            <div v-for="item in group.items" :key="item.key" class="settings-cell">
              <div v-if="item.type !== 'checkbox'" class="settings-label">{{ item.label }}</div>
              <template v-if="item.type === 'select'">
                <select class="select" v-model="item.value" :disabled="!hasSettings">
                  <option value="" disabled>Select</option>
                  <option v-for="option in item.options" :key="option" :value="option">
                    {{ option }}
                  </option>
                </select>
              </template>
              <template v-else-if="item.type === 'checkbox'">
                <label class="settings-check">
                  <input type="checkbox" v-model="item.value" :disabled="!hasSettings" />
                  <span>{{ item.label }}</span>
                </label>
              </template>
              <template v-else>
                <input class="input" :type="item.type" v-model="item.value" :disabled="!hasSettings" />
              </template>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activeKey === 'startup'" class="settings-groups" :class="{ disabled: !hasSettings }">
        <div v-for="group in startupGroups" :key="group.title" class="settings-group">
          <div class="settings-group-title">{{ group.title }}</div>
          <div class="settings-grid">
            <div v-for="item in group.items" :key="item.key" class="settings-cell">
              <div v-if="item.type !== 'checkbox'" class="settings-label">{{ item.label }}</div>
              <template v-if="item.type === 'select'">
                <select class="select" v-model="item.value" :disabled="!hasSettings">
                  <option value="" disabled>Select</option>
                  <option v-for="option in item.options" :key="option" :value="option">
                    {{ option }}
                  </option>
                </select>
              </template>
              <template v-else-if="item.type === 'checkbox'">
                <label class="settings-check">
                  <input type="checkbox" v-model="item.value" :disabled="!hasSettings" />
                  <span>{{ item.label }}</span>
                </label>
              </template>
              <template v-else>
                <input class="input" :type="item.type" v-model="item.value" :disabled="!hasSettings" />
              </template>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="settings-groups" :class="{ disabled: !hasSettings }">
        <div v-for="group in txAllowGroups" :key="group.title" class="settings-group">
          <div class="settings-group-title">{{ group.title }}</div>
          <div class="settings-grid">
            <div v-for="item in group.items" :key="item.key" class="settings-cell">
              <div v-if="item.type !== 'checkbox'" class="settings-label">{{ item.label }}</div>
              <template v-if="item.type === 'select'">
                <select class="select" v-model="item.value" :disabled="!hasSettings">
                  <option value="" disabled>Select</option>
                  <option v-for="option in item.options" :key="option" :value="option">
                    {{ option }}
                  </option>
                </select>
              </template>
              <template v-else-if="item.type === 'checkbox'">
                <label class="settings-check">
                  <input type="checkbox" v-model="item.value" :disabled="!hasSettings" />
                  <span>{{ item.label }}</span>
                </label>
              </template>
              <template v-else>
                <input class="input" :type="item.type" v-model="item.value" :disabled="!hasSettings" />
              </template>
            </div>
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
    </div>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { applySettings, parseSettings } from '../services/rt890_settings';

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

const emit = defineEmits(['log']);

const items = [
  { key: 'basic', label: 'Basic Settings' },
  { key: 'dtmf', label: 'DTMF Settings' },
  { key: 'startup', label: 'Startup Settings' },
  { key: 'tx', label: 'TX Allow Settings' }
];

const activeKey = ref('basic');

const basicItems = reactive([
  { key: 'personalid', label: 'Personal ID', type: 'text', value: '' },
  { key: 'workmode', label: 'Work Mode', type: 'select', value: '', options: ['Channel', 'Frequency'] },
  { key: 'voiceprompt', label: 'Voice Prompt', type: 'checkbox', value: false },
  { key: 'keybeep', label: 'Key Beep', type: 'checkbox', value: false },
  { key: 'rogerbeep', label: 'Roger Beep', type: 'select', value: '', options: ['Off', 'Roger 1', 'Roger 2', 'Send ID'] },
  { key: 'txpriority', label: 'TX Priority', type: 'select', value: '', options: ['Edit', 'Busy'] },
  { key: 'savemode', label: 'Save Mode', type: 'checkbox', value: false },
  { key: 'frequencystep', label: 'Frequency Step', type: 'select', value: '', options: ['0.01', '0.25K', '1.25K', '2.5K', '5K', '6.25K', '8.33K', '10K', '12.5K', '20K', '25K', '50K', '100K', '500K', '1M', '5M'] },
  { key: 'squelch', label: 'Squelch Level (0-9)', type: 'number', value: '' },
  { key: 'displaytimer', label: 'Display Timer', type: 'select', value: '', options: ['Off', '5 seconds', '10 seconds', '15 seconds', '30 seconds', '60 seconds', '120 seconds'] },
  { key: 'locktimer', label: 'Lock Timer', type: 'select', value: '', options: ['Off', '5 seconds', '10 seconds', '15 seconds', '30 seconds', '60 seconds'] },
  { key: 'timeouttimer', label: 'Timeout Timer', type: 'select', value: '', options: ['Off', '5 seconds', '10 seconds', '15 seconds', '30 seconds', '60 seconds', '120 seconds', '180 seconds'] },
  { key: 'vox', label: 'VOX', type: 'checkbox', value: false },
  { key: 'voxlevel', label: 'VOX Level (0-9)', type: 'number', value: '' },
  { key: 'voxdelay', label: 'VOX Delay (0-9)', type: 'number', value: '' },
  { key: 'noaaalarm', label: 'NOAA Alarm', type: 'checkbox', value: false },
  { key: 'fmstandby', label: 'FM Standby', type: 'checkbox', value: false },
  { key: 'fmfrequency', label: 'Broadcast FM Freq (MHz)', type: 'text', value: '' },
  { key: 'tailtone', label: 'Tail Tone', type: 'checkbox', value: false },
  { key: 'scandirection', label: 'Scan Direction', type: 'select', value: '', options: ['Up', 'Down'] },
  { key: 'dualdisplay', label: 'Dual Display', type: 'checkbox', value: false },
  { key: 'talkaround', label: 'Talkaround', type: 'select', value: '', options: ['Off', 'Talkaround', 'Frequency Reversal'] },
  { key: 'key1short', label: 'Key 1 Short', type: 'select', value: '', options: ['None', 'Monitor', 'Frequency Detect', 'Talkaround', 'Quick CH', 'Local Alarm', 'Remote Alarm', 'Weather CH', 'Send Tone', 'Roger Beep'] },
  { key: 'key1long', label: 'Key 1 Long', type: 'select', value: '', options: ['None', 'Monitor', 'Frequency Detect', 'Talkaround', 'Quick CH', 'Local Alarm', 'Remote Alarm', 'Weather CH', 'Send Tone', 'Roger Beep'] },
  { key: 'key2short', label: 'Key 2 Short', type: 'select', value: '', options: ['None', 'Monitor', 'Frequency Detect', 'Talkaround', 'Quick CH', 'Local Alarm', 'Remote Alarm', 'Weather CH', 'Send Tone', 'Roger Beep'] },
  { key: 'key2long', label: 'Key 2 Long', type: 'select', value: '', options: ['None', 'Monitor', 'Frequency Detect', 'Talkaround', 'Quick CH', 'Local Alarm', 'Remote Alarm', 'Weather CH', 'Send Tone', 'Roger Beep'] },
  { key: 'tonefrequency', label: 'Tone Frequency (0-2000)', type: 'number', value: '' },
  { key: 'dualstandby', label: 'Dual Standby', type: 'checkbox', value: false },
  { key: 'standbyarea', label: 'Standby Area', type: 'select', value: '', options: ['A', 'B'] },
  { key: 'areaach', label: 'Area A CH (1-999)', type: 'number', value: '' },
  { key: 'areabch', label: 'Area B CH (1-999)', type: 'number', value: '' },
  { key: 'quickch1', label: 'Quick CH 1 (1-999)', type: 'number', value: '' },
  { key: 'quickch2', label: 'Quick CH 2 (1-999)', type: 'number', value: '' },
  { key: 'quickch3', label: 'Quick CH 3 (1-999)', type: 'number', value: '' },
  { key: 'quickch4', label: 'Quick CH 4 (1-999)', type: 'number', value: '' },
  { key: 'bordercolor', label: 'Border Color (0-65535)', type: 'number', value: '' }
]);

const dtmfItems = reactive([
  { key: 'senddelay', label: 'Send Delay', type: 'select', value: '', options: ['0 ms', '100 ms', '200 ms', '300 ms', '400 ms', '500 ms', '600 ms', '700 ms', '800 ms', '900 ms', '1000 ms'] },
  { key: 'sendinterval', label: 'Send Interval', type: 'select', value: '', options: ['30 ms', '40 ms', '50 ms', '60 ms', '70 ms', '80 ms', '90 ms', '100 ms', '110 ms', '120 ms', '130 ms', '140 ms', '150 ms', '160 ms', '170 ms', '180 ms', '190 ms', '200 ms'] },
  { key: 'sendmode', label: 'Send Mode', type: 'select', value: '', options: ['Off', 'TX Start', 'TX End', 'Start and End'] },
  { key: 'sendselect', label: 'Send Select', type: 'select', value: '', options: ['DTMF 1', 'DTMF 2', 'DTMF 3', 'DTMF 4', 'DTMF 5', 'DTMF 6', 'DTMF 7', 'DTMF 8', 'DTMF 9', 'DTMF 10', 'DTMF 11', 'DTMF 12', 'DTMF 13', 'DTMF 14', 'DTMF 15', 'DTMF 16'] },
  { key: 'recvdisplay', label: 'Receive Display', type: 'checkbox', value: false },
  { key: 'encodegain', label: 'Encode Gain (0-127)', type: 'number', value: '' },
  { key: 'decodeth', label: 'Decode TH (0-63)', type: 'number', value: '' },
  ...Array.from({ length: 16 }, (_, index) => ({
    key: `code${index + 1}`,
    label: `Code ${index + 1}`,
    type: 'text',
    value: ''
  })),
  { key: 'kill', label: 'Remotely Kill', type: 'text', value: '' },
  { key: 'stun', label: 'Remotely Stun', type: 'text', value: '' },
  { key: 'wakeup', label: 'Wake Up', type: 'text', value: '' }
]);

const startupItems = reactive([
  { key: 'startuplabel', label: 'Startup Label', type: 'text', value: '' },
  { key: 'displaylabel', label: 'Display Startup Label', type: 'checkbox', value: false },
  { key: 'displayvoltage', label: 'Display Voltage', type: 'checkbox', value: false },
  { key: 'displaylogo', label: 'Display Startup Logo', type: 'checkbox', value: false },
  { key: 'startupringtone', label: 'Startup Ringtone', type: 'checkbox', value: false },
  { key: 'xposition', label: 'X Position (0-159)', type: 'number', value: '' },
  { key: 'yposition', label: 'Y Position (16-110)', type: 'number', value: '' }
]);

const txAllowItems = reactive([
  { key: 'range174_240', label: '174-240 MHz', value: '', options: ['RX Only', 'TX/RX'] },
  { key: 'range240_320', label: '240-320 MHz', value: '', options: ['RX Only', 'TX/RX'] },
  { key: 'range320_400', label: '320-400 MHz', value: '', options: ['RX Only', 'TX/RX'] },
  { key: 'range480_560', label: '480-560 MHz', value: '', options: ['RX Only', 'TX/RX'] }
]);

const basicGroups = [
  { title: 'Core', items: basicItems.slice(0, 7) },
  { title: 'Timers', items: basicItems.slice(7, 12) },
  { title: 'VOX', items: basicItems.slice(12, 15) },
  { title: 'Audio & Scan', items: basicItems.slice(15, 22) },
  { title: 'Keys', items: basicItems.slice(22, 26) },
  { title: 'Channels', items: basicItems.slice(26, 33) },
  { title: 'Visual', items: basicItems.slice(33) }
];

const dtmfGroups = [
  { title: 'DTMF Timing', items: dtmfItems.slice(0, 7) },
  { title: 'DTMF Codes', items: dtmfItems.slice(7, 23) },
  { title: 'Remote Control', items: dtmfItems.slice(23) }
];

const startupGroups = [
  { title: 'Startup Display', items: startupItems.slice(0, 5) },
  { title: 'Positions', items: startupItems.slice(5) }
];

const txAllowGroups = [
  { title: 'TX Allow Settings', items: txAllowItems }
];

const readSettings = () => {
  if (!props.isConnected) {
    emit('log', 'Connect to the radio before reading settings.');
    return;
  }
  emit('log', 'Reading settings from radio.');
  readSettingsFromRadio();
};

const writeSettings = () => {
  if (!props.isConnected) {
    emit('log', 'Connect to the radio before writing settings.');
    return;
  }
  emit('log', 'Writing settings to radio.');
  writeSettingsToRadio();
};

const progressVisible = ref(false);
const progressLabel = ref('');
const progressValue = ref(0);
const hasSettings = ref(false);

const applyValues = (settings) => {
  const map = {
    personalid: settings.personalid,
    workmode: settings.workmode,
    voiceprompt: settings.voiceprompt,
    keybeep: settings.keybeep,
    rogerbeep: settings.rogerbeep,
    txpriority: settings.txpriority,
    savemode: settings.savemode,
    frequencystep: settings.frequencystep,
    squelch: settings.squelch,
    displaytimer: settings.displaytimer,
    locktimer: settings.locktimer,
    timeouttimer: settings.timeouttimer,
    vox: settings.vox,
    voxlevel: settings.voxlevel,
    voxdelay: settings.voxdelay,
    noaaalarm: settings.noaaalarm,
    fmstandby: settings.fmstandby,
    fmfrequency: settings.fmfrequency,
    tailtone: settings.tailtone,
    scandirection: settings.scandirection,
    dualdisplay: settings.dualdisplay,
    talkaround: settings.talkaround,
    key1short: settings.key1short,
    key1long: settings.key1long,
    key2short: settings.key2short,
    key2long: settings.key2long,
    tonefrequency: settings.tonefrequency,
    dualstandby: settings.dualstandby,
    standbyarea: settings.standbyarea,
    areaach: settings.areaach,
    areabch: settings.areabch,
    quickch1: settings.quickch1,
    quickch2: settings.quickch2,
    quickch3: settings.quickch3,
    quickch4: settings.quickch4,
    bordercolor: settings.bordercolor,
    senddelay: settings.senddelay,
    sendinterval: settings.sendinterval,
    sendmode: settings.sendmode,
    sendselect: settings.sendselect,
    recvdisplay: settings.recvdisplay,
    encodegain: settings.encodegain,
    decodeth: settings.decodeth,
    startuplabel: settings.startuplabel,
    displaylabel: settings.displaylabel,
    displayvoltage: settings.displayvoltage,
    displaylogo: settings.displaylogo,
    startupringtone: settings.startupringtone,
    xposition: settings.xposition,
    yposition: settings.yposition,
    range174_240: settings.range174_240,
    range240_320: settings.range240_320,
    range320_400: settings.range320_400,
    range480_560: settings.range480_560,
    kill: settings.kill,
    stun: settings.stun,
    wakeup: settings.wakeup
  };

  basicItems.forEach((item) => { item.value = map[item.key]; });
  startupItems.forEach((item) => { item.value = map[item.key]; });
  txAllowItems.forEach((item) => { item.value = map[item.key]; });
  dtmfItems.forEach((item) => {
    if (item.key.startsWith('code')) {
      const index = Number(item.key.replace('code', '')) - 1;
      item.value = settings.dtmfCodes?.[index] ?? '';
      return;
    }
    item.value = map[item.key];
  });
};

const collectValues = () => {
  const settings = {};
  basicItems.forEach((item) => { settings[item.key] = item.value; });
  startupItems.forEach((item) => { settings[item.key] = item.value; });
  txAllowItems.forEach((item) => { settings[item.key] = item.value; });
  const dtmfCodes = [];
  dtmfItems.forEach((item) => {
    if (item.key.startsWith('code')) {
      const index = Number(item.key.replace('code', '')) - 1;
      dtmfCodes[index] = item.value;
      return;
    }
    settings[item.key] = item.value;
  });
  settings.dtmfCodes = dtmfCodes;
  return settings;
};

const readSettingsFromRadio = async () => {
  if (!props.serial) {
    emit('log', 'Serial port not ready.');
    return;
  }
  progressLabel.value = 'Reading settings';
  progressValue.value = 0;
  progressVisible.value = true;
  try {
    const eeprom = await props.serial.downloadEeprom((percent) => {
      progressValue.value = percent;
    });
    const settings = parseSettings(eeprom);
    applyValues(settings);
    hasSettings.value = true;
    emit('log', 'Settings loaded.');
  } catch (error) {
    emit('log', `Settings read failed: ${error.message}`);
  } finally {
    progressVisible.value = false;
  }
};

const writeSettingsToRadio = async () => {
  if (!props.serial) {
    emit('log', 'Serial port not ready.');
    return;
  }
  progressLabel.value = 'Writing settings';
  progressValue.value = 0;
  progressVisible.value = true;
  try {
    const eeprom = await props.serial.downloadEeprom((percent) => {
      progressValue.value = Math.min(50, Math.round(percent / 2));
    });
    const settings = collectValues();
    const updated = applySettings(eeprom, settings);
    await props.serial.uploadEeprom(updated, (percent) => {
      progressValue.value = 50 + Math.round(percent / 2);
    });
    emit('log', 'Settings written.');
  } catch (error) {
    emit('log', `Settings write failed: ${error.message}`);
  } finally {
    progressVisible.value = false;
  }
};
</script>
