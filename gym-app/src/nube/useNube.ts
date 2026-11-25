import { useSyncExternalStore } from 'react';
import { leerEstado, suscribir } from './servicio';

export function useNube() {
  return useSyncExternalStore(suscribir, leerEstado, leerEstado);
}
