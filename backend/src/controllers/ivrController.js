const axios = require('axios');
const ivrVoiceService = require('../services/ivrVoiceService');

// Restrict telephony recording downloads to known trusted hosts only.
// Update this allow-list to match your carrier/provider domains.
const ALLOWED_RECORDING_HOSTS = new Set([
  'api.twilio.com',
  'media.twiliocdn.com'
]);

function isAllowedRecordingUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);

    // Enforce HTTPS only.
    if (parsed.protocol !== 'https:') {
      return false;
    }

    // Prevent custom ports (allow default HTTPS only).
    if (parsed.port && parsed.port !== '443') {
      return false;
    }

    // Hostname must be in the explicit allow-list.
    if (!ALLOWED_RECORDING_HOSTS.has(parsed.hostname)) {
      return false;
    }

    return true;
  } catch (_) {
    return false;
  }
}

/**
 * REST Endpoint for Mobile and Web Apps:
 * POST /api/ivr/voice-query
 * Accepts multipart audio file or base64 audio payload.
 */
async function handleVoiceQuery(req, res) {
  try {
    let audioBuffer = null;
    let mimeType = 'audio/wav';
    let filename = 'voice_recording.wav';

    if (req.file) {
      audioBuffer = req.file.buffer;
      mimeType = req.file.mimetype || 'audio/wav';
      filename = req.file.originalname || 'voice_recording.wav';
    } else if (req.body?.audioBase64) {
      audioBuffer = Buffer.from(req.body.audioBase64, 'base64');
      if (req.body.mimeType) mimeType = req.body.mimeType;
      if (req.body.filename) filename = req.body.filename;
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No audio provided. Upload an audio file or send audioBase64 string.'
      });
    }

    const customerId = req.user?.id || null;
    const phoneNumber = req.body?.phoneNumber || null;
    const requestKey = req.user?.id || req.ip || 'ivr:anonymous';

    const result = await ivrVoiceService.processVoiceHelplineQuery({
      audioBuffer,
      filename,
      mimeType,
      phoneNumber,
      customerId,
      requestKey
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('IVR Voice Query Controller Error:', error.message);
    const status = error.status === 429 ? 429 : (error.code === 'AI_TIMEOUT' ? 503 : 500);
    if (status === 429) {
      res.setHeader('Retry-After', '60');
    }
    return res.status(status).json({
      success: false,
      message: status === 429
        ? 'Voice assistance is temporarily rate limited. Please try again later.'
        : (status === 503 ? 'Voice assistance timed out. Please try again later.' : 'Error processing voice recording')
    });
  }
}

/**
 * Inbound Telephony Webhook:
 * POST /api/ivr/webhook
 * Triggered when a phone call arrives at the Eminence helpline number.
 */
async function handleIncomingWebhook(req, res) {
  try {
    const callerPhone = req.body?.From || req.query?.From || '';
    let greeting = 'Welcome to Eminence Smart Transport and Helpline.';

    if (callerPhone) {
      const customer = await ivrVoiceService.findCustomerByPhone(callerPhone);
      if (customer && customer.name) {
        greeting = `Welcome back to Eminence, ${customer.name}.`;
      }
    }

    const message = `${greeting} Please speak your request after the beep, such as asking where your tempo is, or which vehicle you need.`;
    const twiml = ivrVoiceService.generateTwimlResponse(message, {
      allowRecord: true,
      actionUrl: '/api/ivr/recording-callback'
    });

    res.set('Content-Type', 'text/xml');
    return res.status(200).send(twiml);
  } catch (error) {
    console.error('IVR Incoming Webhook Error:', error.message);
    const fallbackTwiml = ivrVoiceService.generateTwimlResponse(
      'Welcome to Eminence. Please hold while we connect you to customer support.',
      { hangup: true }
    );
    res.set('Content-Type', 'text/xml');
    return res.status(200).send(fallbackTwiml);
  }
}

/**
 * Telephony Recording Callback:
 * POST /api/ivr/recording-callback
 * Triggered by the telephony carrier once the caller finishes speaking.
 */
async function handleRecordingCallback(req, res) {
  try {
    const recordingUrl = req.body?.RecordingUrl || req.query?.RecordingUrl;
    const callerPhone = req.body?.From || req.query?.From || '';

    if (!recordingUrl) {
      const twiml = ivrVoiceService.generateTwimlResponse(
        'We did not receive your voice recording. Please call back or reach us at support@eminence.com.',
        { hangup: true }
      );
      res.set('Content-Type', 'text/xml');
      return res.status(200).send(twiml);
    }

    if (!isAllowedRecordingUrl(recordingUrl)) {
      console.warn('Rejected untrusted RecordingUrl');
      const twiml = ivrVoiceService.generateTwimlResponse(
        'Thank you for calling Eminence. We are processing your request and an SMS update has been dispatched.',
        { hangup: true }
      );
      res.set('Content-Type', 'text/xml');
      return res.status(200).send(twiml);
    }

    const parsedRecordingUrl = new URL(recordingUrl);
    const pathname = parsedRecordingUrl.pathname.toLowerCase();

    // Rebuild a canonical URL from validated components to avoid passing
    // attacker-controlled raw URL text into the outbound request sink.
    const canonicalUrl = new URL('https://placeholder.invalid');
    canonicalUrl.protocol = 'https:';
    canonicalUrl.hostname = parsedRecordingUrl.hostname.toLowerCase();
    canonicalUrl.port = parsedRecordingUrl.port || '';
    canonicalUrl.pathname =
      !pathname.endsWith('.wav') && !pathname.endsWith('.mp3')
        ? `${parsedRecordingUrl.pathname}.wav`
        : parsedRecordingUrl.pathname;

    // Recording media fetch does not require query or fragment; drop them.
    canonicalUrl.search = '';
    canonicalUrl.hash = '';

    const downloadUrl = canonicalUrl.toString();

    let audioBuffer;
    try {
      const response = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        timeout: 8000,
        maxRedirects: 0
      });
      audioBuffer = Buffer.from(response.data);
    } catch (fetchErr) {
      console.warn('Could not download telephony audio:', fetchErr.message);
      const twiml = ivrVoiceService.generateTwimlResponse(
        'Thank you for calling Eminence. We are processing your request and an SMS update has been dispatched.',
        { hangup: true }
      );
      res.set('Content-Type', 'text/xml');
      return res.status(200).send(twiml);
    }

    const result = await ivrVoiceService.processVoiceHelplineQuery({
      audioBuffer,
      filename: 'call_recording.wav',
      mimeType: 'audio/wav',
      phoneNumber: callerPhone,
      requestKey: req.ip || 'ivr:webhook'
    });

    const replyText = result.reply || 'Thank you for contacting Eminence Smart Transport.';
    const twiml = ivrVoiceService.generateTwimlResponse(replyText, { hangup: true });

    res.set('Content-Type', 'text/xml');
    return res.status(200).send(twiml);
  } catch (error) {
    console.error('IVR Recording Callback Error:', error.message);
    const twiml = ivrVoiceService.generateTwimlResponse(
      'Thank you for contacting Eminence logistics. Our team will review your voice query shortly.',
      { hangup: true }
    );
    res.set('Content-Type', 'text/xml');
    return res.status(200).send(twiml);
  }
}

/**
 * Diagnostics Healthcheck:
 * GET /api/ivr/health
 */
async function getHealth(_req, res) {
  const client = ivrVoiceService.getGroqClient();
  return res.status(200).json({
    success: true,
    service: 'Eminence AI Voice IVR Helpline',
    groqConfigured: !!client,
    audioModel: 'whisper-large-v3-turbo',
    supportedFormats: ['audio/wav', 'audio/webm', 'audio/mp3', 'audio/ogg', 'audio/m4a']
  });
}

module.exports = {
  handleVoiceQuery,
  handleIncomingWebhook,
  handleRecordingCallback,
  getHealth
};
