import { describe, expect, it } from 'vitest';
import { enlaceSpotify } from './spotify';

describe('enlaceSpotify', () => {
  it('convierte links compartidos a enlace de app', () => {
    expect(enlaceSpotify('https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP?si=abc123')).toEqual({
      app: 'spotify:playlist:37i9dQZF1DX76Wlfdnj7AP', web: 'https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP',
    });
    expect(enlaceSpotify('https://open.spotify.com/intl-es/album/1A2GTWGtFfWp7KSQTwWOyo')?.app).toBe('spotify:album:1A2GTWGtFfWp7KSQTwWOyo');
    expect(enlaceSpotify('spotify:playlist:37i9dQZF1DX76Wlfdnj7AP')?.web).toBe('https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP');
  });
  it('ignora textos que no son de Spotify', () => {
    expect(enlaceSpotify('')).toBeNull();
    expect(enlaceSpotify('https://youtube.com/playlist?list=x')).toBeNull();
    expect(enlaceSpotify('mi playlist')).toBeNull();
  });
});
