import speech from '@google-cloud/speech';

const client = new speech.SpeechClient();

async function quickTest() {
  const [response] = await client.recognize({
    audio: { uri: 'gs://cloud-samples-data/speech/brooklyn_bridge.raw' },
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'en-US',
    },
  });
  console.log('Transcription:', response.results[0].alternatives[0].transcript);
}

quickTest().catch(console.error);
