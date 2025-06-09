// clock-pv-forecast-card int. Version# 0.020 – now with configurable max bar reference value
import { LitElement, html, css } from 'https://unpkg.com/lit@2.8.0/index.js?module';

console.info("📦 clock-pv-forecast-card loaded");

class ClockPvForecastCard extends LitElement {
  static properties = {
    hass: {},
    config: {},
  };

  static get type() {
    return 'clock-pv-forecast-card';
  }

  static async getConfigElement() {
    return document.createElement('clock-pv-forecast-card-editor');
  }

  static getStubConfig() {
    return {
      entity_today: '',
      entity_tomorrow: '',
      entity_day3: '',
      entity_day4: '',
      entity_day5: ''
    };
  }

  setConfig(config) {
    this.config = {
      animation_duration: config.animation_duration || '1s',
      bar_color_start: config.bar_color_start || '#3498db',
      bar_color_end: config.bar_color_end || '#2ecc71',
      remaining_color_start: config.remaining_color_start || '#999999',
      remaining_color_end: config.remaining_color_end || '#cccccc',
      remaining_threshold: config.remaining_threshold ?? null,
      remaining_low_color_start: config.remaining_low_color_start || '#e74c3c',
      remaining_low_color_end: config.remaining_low_color_end || '#e67e22',
      max_value: config.max_value ?? 100,
      weekday_format: config.weekday_format || 'short',
      day_column_width: {
        narrow: '1.5em',
        short: '2.5em',
        long: '5em',
      }[config.weekday_format || 'short'],
      entity_remaining: config.entity_remaining || null,
      ...config,
    };
  }

  render() {
    if (!this.config.entity_today || !this.config.entity_tomorrow || !this.config.entity_day3 || !this.config.entity_day4 || !this.config.entity_day5) {
      return html`<ha-card><div class="warning">Bitte alle Pflicht-Entities konfigurieren.</div></ha-card>`;
    }
    const forecast = [
      { offset: 0, entity: this.config.entity_today },
      { offset: 1, entity: this.config.entity_tomorrow },
      { offset: 2, entity: this.config.entity_day3 },
      { offset: 3, entity: this.config.entity_day4 },
      { offset: 4, entity: this.config.entity_day5 },
    ];

    return html`
      <ha-card>
        <div class="forecast-rows">
          ${forecast.map((item) => {
            const raw = this.hass.states[item.entity]?.state;
            const value = !isNaN(parseFloat(raw)) ? parseFloat(raw) : 0;
            const dayLabel = this._getWeekdayName(item.offset);
            const barStyle = `--bar-width: ${this._barWidth(value)}%; --bar-gradient: linear-gradient(to right, ${this.config.bar_color_start}, ${this.config.bar_color_end}); --animation-time: ${this.config.animation_duration}`;
            return html`
              <div class="forecast-row">
                <div class="day" style="width: ${this.config.day_column_width}">${dayLabel}</div>
                <div class="bar-container">
                  <div class="bar" style="${barStyle}" title="${value.toFixed(2)} kWh"></div>
                </div>
                <div class="value">${value.toFixed(1)} kWh</div>
              </div>`;
          })}

          ${this.config.entity_remaining ? this._renderRemainingBar() : ''}
        </div>
      </ha-card>
    `;
  }

  _renderRemainingBar() {
    const remaining = parseFloat(this.hass.states[this.config.entity_remaining]?.state ?? '0');
    const belowThreshold = this.config.remaining_threshold !== null && remaining <= this.config.remaining_threshold;
    const start = belowThreshold ? this.config.remaining_low_color_start : this.config.remaining_color_start;
    const end = belowThreshold ? this.config.remaining_low_color_end : this.config.remaining_color_end;
    const barStyle = `--bar-width: ${this._barWidth(remaining)}%; --bar-gradient: linear-gradient(to left, ${start}, ${end}); --animation-time: ${this.config.animation_duration}`;
    return html`
      <div class="forecast-row">
        <div class="day" style="width: ${this.config.day_column_width}">Rest</div>
        <div class="bar-container rtl">
          <div class="bar" style="${barStyle}"></div>
        </div>
        <div class="value">${remaining.toFixed(1)} kWh</div>
      </div>`;
  }

  _getWeekdayName(offset) {
    const locale = this.hass.locale?.language || navigator.language || 'en';
    const date = new Date();
    date.setDate(date.getDate() + offset);
    return date.toLocaleDateString(locale, { weekday: this.config.weekday_format });
  }

  _barWidth(value) {
    const forecastValues = [
      this.config.entity_today,
      this.config.entity_tomorrow,
      this.config.entity_day3,
      this.config.entity_day4,
      this.config.entity_day5
    ].map(entityId => {
      const raw = this.hass.states[entityId]?.state;
      return !isNaN(parseFloat(raw)) ? parseFloat(raw) : 0;
    });

    const dynamicMax = Math.max(...forecastValues, 1); // fallback 1 für sichere Division
    return Math.min((value / dynamicMax) * 100, 100);
  }

  static styles = css`
    .forecast-rows {
      display: flex;
      flex-direction: column;
      gap: 0.4em;
      padding: 1em 1em 1em 1em;
    }
    .forecast-row {
      display: flex;
      align-items: center;
      gap: 0.8em;
    }
    .day {
      text-align: right;
      font-weight: bold;
    }
    .bar-container {
      flex-grow: 1;
      height: 14px;
      background: #eee;
      border-radius: 7px;
      overflow: hidden;
    }
    .bar-container.rtl {
      direction: rtl;
    }
    .bar {
      height: 100%;
      border-radius: 7px;
      width: 0%;
      background: var(--bar-gradient);
      animation: fill-bar var(--animation-time) ease-out forwards;
    }
    .value {
      width: 4.5em;
      text-align: right;
      font-size: 0.85em;
      font-weight: bold;
    }

    @keyframes fill-bar {
      to {
        width: var(--bar-width);
      }
    }
  `;
}

if (!customElements.get('clock-pv-forecast-card')) {
  customElements.define('clock-pv-forecast-card', ClockPvForecastCard);
}

// Visual Editor for Home Assistant UI
class ClockPvForecastCardEditor extends LitElement {
  static properties = {
    hass: {},
    config: {},
  };

  static get styles() {
    return css`
      .editor-section {
        padding: 1em;
        background: var(--card-background-color, #f7f7f7);
        border-radius: 8px;
        box-shadow: var(--ha-card-box-shadow, 0 2px 4px rgba(0, 0, 0, 0.1));
        margin-bottom: 1em;
      }
      .section-title {
        font-size: 1.1em;
        font-weight: bold;
        margin-bottom: 0.6em;
        border-bottom: 1px solid var(--divider-color, #ddd);
        padding-bottom: 0.2em;
        color: var(--primary-text-color);
      }
      .editor-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 1.2em;
        align-items: center;
      }
      label {
        font-weight: 500;
        display: block;
        margin-bottom: 0.25em;
        color: var(--primary-text-color);
      }
      .tooltip-label {
        display: flex;
        align-items: center;
        gap: 0.3em;
      }
      .tooltip-icon {
        cursor: help;
        color: var(--secondary-text-color, #888);
        font-size: 1em;
        user-select: none;
      }
      select,
      input[type="number"],
      input[type="text"],
      input[type="color"] {
        width: 100%;
        padding: 0.4em;
        font-size: 0.9em;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-sizing: border-box;
      }
    `;
  }

  setConfig(config) {
    this.config = {
      entity_today: '',
      entity_tomorrow: '',
      entity_day3: '',
      entity_day4: '',
      entity_day5: '',
      ...config,
    };
  }

  _updateConfig(e) {
    const target = e.target;
    if (!this.config || !target) return;
    this.config = { ...this.config, [target.name]: target.value };
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config } }));
  }

  render() {
    if (!this.hass) return html``;
    const sensors = Object.keys(this.hass.states).filter(e => e.startsWith('sensor.'));

    const renderSelect = (name, value) => html`
      <select name="${name}" @change=${this._updateConfig}>
        ${sensors.map(entityId => html`
          <option value="${entityId}" ?selected=${value === entityId}>${entityId}</option>
        `)}
      </select>
    `;

    return html`
      <div class="editor-section">
        <div class="section-title">🗓 Tagesdaten</div>
        <div class="editor-grid">
          <label>Heute:${renderSelect('entity_today', this.config.entity_today)}</label>
          <label>Morgen:${renderSelect('entity_tomorrow', this.config.entity_tomorrow)}</label>
          <label>Tag 3:${renderSelect('entity_day3', this.config.entity_day3)}</label>
          <label>Tag 4:${renderSelect('entity_day4', this.config.entity_day4)}</label>
          <label>Tag 5:${renderSelect('entity_day5', this.config.entity_day5)}</label>
        </div>
      </div>

      <div class="editor-section">
        <div class="section-title">➕ Restdaten</div>
        <div class="editor-grid">
          <label>Rest (optional):${renderSelect('entity_remaining', this.config.entity_remaining)}</label>
          <label class="tooltip-label">Threshold „Rest“ (kWh):
            <span class="tooltip-icon" title="Grenzwert, ab dem Rest-Balken farblich hervorgehoben wird.">🛈</span>
            <input type="number" name="remaining_threshold" .value=${this.config.remaining_threshold ?? ''} @input=${this._updateConfig} />
          </label>
        </div>
      </div>

      <div class="editor-section">
        <div class="section-title">🎨 Darstellung</div>
        <div class="editor-grid">
          <label class="tooltip-label">Max-Wert (kWh):
            <span class="tooltip-icon" title="Wert, auf den sich die Balkenbreite prozentual bezieht.">🛈</span>
            <input type="number" name="max_value" .value=${this.config.max_value || 100} @input=${this._updateConfig} />
          </label>
          <label class="tooltip-label">Animation:
            <span class="tooltip-icon" title="Dauer der Balken-Animation, z. B. '1s' oder '500ms'.">🛈</span>
            <input type="text" name="animation_duration" .value=${this.config.animation_duration || '1s'} @input=${this._updateConfig} />
          </label>
          <label>Farbe Start Balken:
            <input type="color" name="bar_color_start" .value=${this.config.bar_color_start || '#3498db'} @input=${this._updateConfig} />
          </label>
          <label>Farbe Ende Balken:
            <input type="color" name="bar_color_end" .value=${this.config.bar_color_end || '#2ecc71'} @input=${this._updateConfig} />
          </label>
        </div>
      </div>
    `;
  }
}

customElements.define('clock-pv-forecast-card-editor', ClockPvForecastCardEditor);


// Register card for Home Assistant visual editor
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'clock-pv-forecast-card',
  name: 'Clock PV Forecast Card',
  description: 'Visualisiert die PV-Prognose der nächsten Tage als Balkendiagramm',
  preview: false,
});
