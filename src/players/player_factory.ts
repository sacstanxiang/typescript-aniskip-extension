import { getDomainName } from '../utils/string';
import { Doodstream } from './doodstream';
import { FourAnime, Videojs } from './videojs';
import { Jw } from './jw';
import { Plyr } from './plyr';
import { Twistmoe } from './twistmoe';
import { Crunchyroll } from './crunchyroll';
import { Player } from './base_player.types';

export class PlayerFactory {
  /**
   * Obtains the player object from the domain.
   *
   * @param hostname Player's host.
   */
  static getPlayer(hostname: string): Player {
    const domainName = getDomainName(hostname);
    switch (domainName) {
      case 'animixplay':
      case 'aniwatch':
      case 'github':
      case 'googleapis':
      case 'jzscuqezoqkcpvy':
      case 'kwik':
      case 'streamtape':
        return new Plyr(document);
      case 'crunchyroll':
        return new Crunchyroll(document);
      case 'cloud9':
      case 'fcdn':
      case 'gogo-play':
      case 'kimanime':
      case 'mcloud':
      case 'mcloud2':
      case 'sbembed':
      case 'sbplay':
      case 'sbvideo':
      case 'streamani':
      case 'streamhd':
      case 'streamsb':
      case 'vidstream':
      case 'vidstreamz':
        return new Jw(document);
      case 'dood':
        return new Doodstream(document);
      case 'mixdrop':
      case 'mp4':
      case 'mp4upload':
        return new Videojs(document);
      case '4anime':
        return new FourAnime(document);
      case 'twist':
        return new Twistmoe(document);
      default:
        throw new Error(`Player ${hostname} not supported`);
    }
  }
}