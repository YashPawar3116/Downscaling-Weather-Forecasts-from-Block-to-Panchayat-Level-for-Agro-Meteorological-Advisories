import type { BlockData, ForecastDay, GPWeather } from './types'

export type SoilMoistureScenario = 'low' | 'medium' | 'high'

export interface ScenarioInputs {
  rainfallDeltaPct: number
  temperatureDeltaC: number
  humidityDeltaPct: number
  windDeltaKmh: number
  rainfallThresholdMm: number
  soilMoisture: SoilMoistureScenario
}

export const baselineScenarioInputs: ScenarioInputs = {
  rainfallDeltaPct: 0,
  temperatureDeltaC: 0,
  humidityDeltaPct: 0,
  windDeltaKmh: 0,
  rainfallThresholdMm: 10,
  soilMoisture: 'medium',
}

const adjust = (value: number | null, delta: number, min: number, max: number) => {
  if (value === null || !Number.isFinite(value)) return value
  return Math.min(max, Math.max(min, value + delta))
}

function adjustForecast(day: ForecastDay, inputs: ScenarioInputs): ForecastDay {
  return {
    ...day,
    rainfall: day.rainfall === null || !Number.isFinite(day.rainfall)
      ? day.rainfall
      : Math.max(0, day.rainfall * (1 + inputs.rainfallDeltaPct / 100)),
    temperature: adjust(day.temperature, inputs.temperatureDeltaC, -80, 65),
    humidity: adjust(day.humidity, inputs.humidityDeltaPct, 0, 100),
    wind: adjust(day.wind, inputs.windDeltaKmh / 3.6, 0, Number.POSITIVE_INFINITY),
  }
}

// Apply independent user-selected offsets only. Derived totals and existing advisory rules
// consume these values; no uncalibrated cross-variable or soil-moisture response is inferred.
export function applyScenario(data: BlockData, inputs: ScenarioInputs): BlockData {
  return {
    ...data,
    gps: data.gps.map(gp => ({
      ...gp,
      forecast: gp.forecast.map(day => adjustForecast(day, inputs)),
    })),
  }
}

export function scenarioIsChanged(inputs: ScenarioInputs) {
  return inputs.rainfallDeltaPct !== 0 ||
    inputs.temperatureDeltaC !== 0 ||
    inputs.humidityDeltaPct !== 0 ||
    inputs.windDeltaKmh !== 0 ||
    inputs.rainfallThresholdMm !== baselineScenarioInputs.rainfallThresholdMm ||
    inputs.soilMoisture !== baselineScenarioInputs.soilMoisture
}

export function scenarioStatus(day: ForecastDay | undefined, inputs: ScenarioInputs) {
  if (!day || day.rainfall === null) return 'Rainfall status unavailable'
  return day.rainfall >= inputs.rainfallThresholdMm ? 'Rainfall threshold reached' : 'Below rainfall threshold'
}

export function scenarioInsight(gp: GPWeather, day: ForecastDay | undefined, inputs: ScenarioInputs) {
  if (!day) return 'No forecast is available for the selected date.'
  const insights: string[] = []
  if (day.rainfall !== null) {
    insights.push(day.rainfall >= inputs.rainfallThresholdMm
      ? `Scenario rainfall reaches ${day.rainfall.toFixed(1)} mm, at or above the selected ${inputs.rainfallThresholdMm} mm threshold.`
      : `Scenario rainfall is ${day.rainfall.toFixed(1)} mm, below the selected ${inputs.rainfallThresholdMm} mm threshold.`)
  }
  if (day.temperature !== null) insights.push(`Scenario temperature is ${day.temperature.toFixed(1)} °C; baseline-based advisories update with this adjustment.`)
  if (inputs.soilMoisture !== 'medium') insights.push(`Soil-moisture context is set to ${inputs.soilMoisture}; this is a user scenario assumption, not a measured soil-moisture value.`)
  if (gp.soilClay === null) insights.push('Soil texture data is unavailable for this Panchayat.')
  return insights
}
