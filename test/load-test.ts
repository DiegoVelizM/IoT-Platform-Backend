import axios from 'axios';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TOTAL_REQUESTS = 1000;

async function run() {
  let successCount = 0;
  let errorCount = 0;

  const promises = Array.from({ length: TOTAL_REQUESTS }, (_, index) => {
    const payload = {
      sensor_id: `LOAD-SENSOR-${String(index + 1).padStart(4, '0')}`,
      asset_id: `PATIENT-LOAD-${String(Math.floor(index / 4) + 1).padStart(3, '0')}`,
      sensor_type: 'temperature',
      temperature: 36 + Math.random() * 2,
      battery: 90,
      signal_strength: 95,
    };

    return axios
      .post(`${BASE_URL}/telemetry`, payload)
      .then(() => {
        successCount += 1;
      })
      .catch(() => {
        errorCount += 1;
      });
  });

  await Promise.all(promises);

  console.log(
    `Load test completed: ${successCount} successes, ${errorCount} errors`,
  );
}

run().catch((err) => {
  console.error('Load test failed', err);
  process.exit(1);
});
