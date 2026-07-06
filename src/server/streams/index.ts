/**
 * Stream utilities — HTTP range relay architecture.
 *
 * The host browser reads file chunks via File.slice() and sends them
 * over Socket.IO. The server relays chunks to guest HTTP range requests
 * without ever storing the complete file.
 *
 * @see StreamRelayService in services/stream-relay.service.ts
 * @see streamVideo in controllers/stream.controller.ts
 */
export { streamRelayService } from '../services/stream-relay.service.js';
