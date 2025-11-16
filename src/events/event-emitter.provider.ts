import { EventEmitter2 } from 'eventemitter2';
import { Provider } from '@nestjs/common';

export const EventEmitterProvider: Provider = {
  provide: 'EVENT_EMITTER',
  useFactory: () =>
    new EventEmitter2({
      wildcard: true,
      delimiter: '.',
      maxListeners: 50,
    }),
};
