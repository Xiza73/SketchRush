import type { RoomStatus } from '@/shared/contract';

/*
 * Neutral segments on purpose. WordRush shipped `/sala`, `/juego` and
 * `/resultados` in a product whose interface is bilingual, so half its players
 * read a URL in a language they did not pick. A new game is the cheap moment to
 * not do that.
 */
export const PATHS = {
  home: '/',
  lobby: '/room/:code',
  game: '/game/:code',
  results: '/results/:code',
} as const;

export const lobbyPath = (code: string) => `/room/${code}`;
export const gamePath = (code: string) => `/game/${code}`;
export const resultsPath = (code: string) => `/results/${code}`;
export const homeWithCode = (code: string) => `/?code=${encodeURIComponent(code)}`;

/** Which screen a room status maps to; used after rejoin and on pushed transitions. */
export const pathForStatus = (status: RoomStatus, code: string) => {
  switch (status) {
    case 'lobby':
      return lobbyPath(code);
    // Choosing a word is part of the turn: the drawer picks it on the game
    // screen while everybody else already watches an empty canvas.
    case 'choosing':
    case 'drawing':
      return gamePath(code);
    case 'between-turns':
    case 'finished':
      return resultsPath(code);
  }
};
