import { MedicalSensorType } from '../sensors/dto/create-sensor-reading.dto';
import { SENSOR_THRESHOLDS } from '../sensors/constants/sensor-thresholds.constants';
import {
  buildAnomalousMedicalValues,
  buildAnomalyProfile,
  resolveAnomalyProbability,
} from './simulation-anomaly';

describe('simulation-anomaly', () => {
  describe('resolveAnomalyProbability', () => {
    it('returns 0 by default', () => {
      expect(resolveAnomalyProbability(undefined)).toBe(0);
    });

    it('clamps values between 0 and 1', () => {
      expect(resolveAnomalyProbability('-1')).toBe(0);
      expect(resolveAnomalyProbability('0.25')).toBe(0.25);
      expect(resolveAnomalyProbability('2')).toBe(1);
      expect(resolveAnomalyProbability('invalid')).toBe(0);
    });
  });

  describe('buildAnomalousMedicalValues', () => {
    it('generates out-of-range temperature for thermometer', () => {
      const values = buildAnomalousMedicalValues(
        MedicalSensorType.THERMOMETER,
      );

      expect(values.temperature).toBeDefined();
      expect(
        values.temperature! < SENSOR_THRESHOLDS.COLD_CHAIN_TEMPERATURE.MIN ||
          values.temperature! > SENSOR_THRESHOLDS.COLD_CHAIN_TEMPERATURE.MAX,
      ).toBe(true);
    });

    it('generates out-of-range glucose for glucometer', () => {
      const values = buildAnomalousMedicalValues(MedicalSensorType.GLUCOMETER);

      expect(values.glucoseLevel).toBeDefined();
      expect(
        values.glucoseLevel! < SENSOR_THRESHOLDS.GLUCOSE.LOW ||
          values.glucoseLevel! > SENSOR_THRESHOLDS.GLUCOSE.HIGH,
      ).toBe(true);
    });

    it('generates high blood pressure for sphygmomanometer', () => {
      const values = buildAnomalousMedicalValues(
        MedicalSensorType.SPHYGMOMANOMETER,
      );

      expect(values.systolicPressure).toBeGreaterThan(
        SENSOR_THRESHOLDS.BLOOD_PRESSURE.SYSTOLIC_HIGH,
      );
      expect(values.diastolicPressure).toBeGreaterThan(
        SENSOR_THRESHOLDS.BLOOD_PRESSURE.DIASTOLIC_HIGH,
      );
    });
  });

  describe('buildAnomalyProfile', () => {
    it('returns a supported anomaly profile', () => {
      const profile = buildAnomalyProfile(MedicalSensorType.PULSE_OXIMETER);

      expect(['low_battery', 'sensor_offline', 'medical']).toContain(
        profile.kind,
      );
    });
  });
});
