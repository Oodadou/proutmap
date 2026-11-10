import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import type { FartKind } from './types';

// Bruitages générés pour l'appli (libres de droits)
const SOURCES: Record<FartKind, number> = {
  silencieux: require('@/assets/sounds/silencieux.wav'),
  classique: require('@/assets/sounds/classique.wav'),
  tonitruant: require('@/assets/sounds/tonitruant.wav'),
  foireux: require('@/assets/sounds/foireux.wav'),
  en_rafale: require('@/assets/sounds/en_rafale.wav'),
};

let player: AudioPlayer | null = null;
let ready = false;

export async function playFart(kind: FartKind) {
  try {
    if (!ready) {
      // Joue même si le téléphone est en mode silencieux (c'est le but !)
      await setAudioModeAsync({ playsInSilentMode: true });
      ready = true;
    }
    player?.remove();
    player = createAudioPlayer(SOURCES[kind]);
    player.play();
  } catch {
    // Le son est un bonus : on ne bloque jamais l'appli pour ça
  }
}
